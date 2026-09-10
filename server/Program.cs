using System.Diagnostics;
using System.Text.Json;
using CuBlocky.Server.Models;
using CuBlocky.Server.Nodes;
using CuBlocky.Server.Compiler;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.UseStaticFiles();

var jsonOpts = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
};

var projectsDir = Path.Combine(Directory.GetCurrentDirectory(), "projects");
Directory.CreateDirectory(projectsDir);

var config = ServerConfig.Load();

// ── Config API ──────────────────────────────────────────────────────
app.MapGet("/api/config", () => Results.Json(config));

app.MapPut("/api/config", async (HttpRequest req) =>
{
    var body = await JsonSerializer.DeserializeAsync<ServerConfig>(req.Body, jsonOpts);
    if (body == null) return Results.BadRequest("invalid config");
    config.GamePath = body.GamePath;
    config.Save();
    return Results.Ok(config);
});

// Helper: get project asset directory
static string GetProjectAssetsDir(string projectName)
{
    var dir = Path.Combine(Directory.GetCurrentDirectory(), "projects", projectName, "assets");
    Directory.CreateDirectory(dir);
    return dir;
}

// ── Project-scoped asset management ────────────────────────────────
app.MapGet("/api/projects/{name}/assets", (string name) =>
{
    var assetsDir = GetProjectAssetsDir(name);
    if (!Directory.Exists(assetsDir)) return Results.Json(Array.Empty<object>());
    var files = Directory.GetFiles(assetsDir)
        .Where(f => Path.GetExtension(f).ToLowerInvariant() is ".png" or ".jpg" or ".jpeg" or ".bmp")
        .Select(f =>
        {
            var info = new FileInfo(f);
            return new { name = info.Name, size = info.Length, uploaded = info.LastWriteTimeUtc };
        })
        .OrderBy(a => a.name)
        .ToList();
    return Results.Json(files, jsonOpts);
});

app.MapPost("/api/projects/{name}/assets/upload", async (string name, HttpRequest req) =>
{
    var assetsDir = GetProjectAssetsDir(name);
    if (!req.HasFormContentType) return Results.BadRequest("expected multipart form");
    var form = await req.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file == null || file.Length == 0) return Results.BadRequest("no file");

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (ext is not (".png" or ".jpg" or ".jpeg" or ".bmp"))
        return Results.BadRequest("only PNG/JPG/BMP images are accepted");

    var safeName = Path.GetFileName(file.FileName).Replace(' ', '_');
    var savedPath = Path.Combine(assetsDir, safeName);
    using (var fs = new FileStream(savedPath, FileMode.Create))
    {
        await file.CopyToAsync(fs);
    }
    return Results.Json(new { assetId = safeName, name = safeName, originalName = file.FileName });
});

app.MapDelete("/api/projects/{name}/assets/{assetName}", (string name, string assetName) =>
{
    var assetsDir = GetProjectAssetsDir(name);
    var safe = Path.GetFileName(assetName);
    var path = Path.Combine(assetsDir, safe);
    if (!File.Exists(path)) return Results.NotFound("asset not found");
    File.Delete(path);
    return Results.Ok();
});

app.MapGet("/api/projects/{name}/assets/raw/{assetName}", (string name, string assetName) =>
{
    var assetsDir = GetProjectAssetsDir(name);
    var safe = Path.GetFileName(assetName);
    var path = Path.Combine(assetsDir, safe);
    if (!File.Exists(path)) return Results.NotFound();
    var ext = Path.GetExtension(safe).ToLowerInvariant();
    var ct = ext switch
    {
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".bmp" => "image/bmp",
        _ => "application/octet-stream"
    };
    return Results.File(path, ct);
});

// Legacy upload endpoint (redirects to project-scoped)
app.MapPost("/api/upload", async (HttpRequest req) =>
{
    return Results.BadRequest("use /api/projects/{name}/assets/upload instead");
});

// ── Node catalog (frontend palette) ───────────────────────────────
app.MapGet("/api/catalog", () =>
{
    var export = new CatalogExport
    {
        Nodes = NodeCatalog.All,
    };
    return Results.Json(export, jsonOpts);
});

// ── Compile blueprint → RegisterContent.cs ───────────────────────
app.MapPost("/api/compile/register", async (HttpRequest req) =>
{
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null) return Results.BadRequest("invalid blueprint");
    var code = CodeEmitter.EmitRegisterContent(bp);
    return Results.Json(new { registerContent = code }, jsonOpts);
});

// ── Full project export (M5: zip). M1: return file map preview. ──
app.MapPost("/api/compile/project", async (HttpRequest req) =>
{
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null) return Results.BadRequest("invalid blueprint");
    var files = ProjectEmitter.EmitProject(bp, config.GamePath);
    return Results.Json(new { files }, jsonOpts);
});

// ── Build: generate project → dotnet build → return DLL ──
app.MapPost("/api/build", async (HttpRequest req) =>
{
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null) return Results.BadRequest("invalid blueprint");

    var files = ProjectEmitter.EmitProject(bp, config.GamePath);
    var asmName = Path.GetFileNameWithoutExtension(files.Keys.First(k => k.EndsWith(".csproj")));
    var buildDir = Path.Combine(Directory.GetCurrentDirectory(), "builds", asmName);

    // Determine project name from mod name for asset lookup
    var projectName = bp.Mod?.Name?.Replace(' ', '_') ?? "";

    try
    {
        if (Directory.Exists(buildDir)) Directory.Delete(buildDir, true);
        Directory.CreateDirectory(buildDir);
        foreach (var kv in files)
        {
            var fp = Path.Combine(buildDir, kv.Key);
            Directory.CreateDirectory(Path.GetDirectoryName(fp)!);
            await File.WriteAllTextAsync(fp, kv.Value);
        }

        // Copy project assets into build and embed as resources
        var spriteFiles = new List<string>();
        var projectAssetsDir = Path.Combine(projectsDir, projectName, "assets");

        // Copy assets referenced by Blueprint.Assets
        foreach (var asset in bp.Assets)
        {
            var src = Path.Combine(projectAssetsDir, asset.Name);
            if (File.Exists(src))
            {
                var destDir = Path.Combine(buildDir, "Sprites");
                Directory.CreateDirectory(destDir);
                var dest = Path.Combine(destDir, asset.Name);
                File.Copy(src, dest, true);
                spriteFiles.Add(asset.Name);
            }
        }

        // Also scan RegisterContent.cs and Statuses.cs for AssetLoader.LoadEmbeddedSprite calls
        var scanFiles = new[] { "RegisterContent.cs", "Statuses.cs" };
        var marker = "AssetLoader.LoadEmbeddedSprite(\"";
        foreach (var scanFile in scanFiles)
        {
            var rcPath = Path.Combine(buildDir, scanFile);
            if (!File.Exists(rcPath)) continue;
            var rcContent = await File.ReadAllTextAsync(rcPath);
            var idx = 0;
            while ((idx = rcContent.IndexOf(marker, idx)) >= 0)
            {
                var start = idx + marker.Length;
                var end = rcContent.IndexOf('"', start);
                if (end > start)
                {
                    var spriteName = rcContent[start..end];
                    if (!spriteFiles.Contains(spriteName))
                    {
                        var src = Path.Combine(projectAssetsDir, spriteName);
                        if (File.Exists(src))
                        {
                            var destDir = Path.Combine(buildDir, "Sprites");
                            Directory.CreateDirectory(destDir);
                            var dest = Path.Combine(destDir, spriteName);
                            File.Copy(src, dest, true);
                            spriteFiles.Add(spriteName);
                        }
                    }
                }
                idx = end;
            }
        }

        // Patch .csproj to embed sprite resources
        if (spriteFiles.Count > 0)
        {
            var csprojPath = Path.Combine(buildDir, asmName + ".csproj");
            if (File.Exists(csprojPath))
            {
                var csprojContent = await File.ReadAllTextAsync(csprojPath);
                var resourceItems = string.Join("\n", spriteFiles.Select(s =>
                    $"    <EmbeddedResource Include=\"Sprites\\{s}\" />"));
                csprojContent = csprojContent.Replace(
                    "</Project>",
                    $"  <ItemGroup>\n{resourceItems}\n  </ItemGroup>\n</Project>");
                await File.WriteAllTextAsync(csprojPath, csprojContent);
            }
        }

        var psi = new ProcessStartInfo("dotnet", $"build \"{buildDir}\" -c Release --nologo -v q")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        using var proc = Process.Start(psi)!;
        var stdout = await proc.StandardOutput.ReadToEndAsync();
        var stderr = await proc.StandardError.ReadToEndAsync();
        await proc.WaitForExitAsync();

        var dllPath = Path.Combine(buildDir, "bin", "Release", asmName + ".dll");
        var success = proc.ExitCode == 0 && File.Exists(dllPath);
        var msg = success ? $"Build succeeded!" : $"Build failed (exit {proc.ExitCode}):\n{stdout}\n{stderr}";

        return Results.Json(new { success, message = msg, dllPath, buildDir }, jsonOpts);
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, message = ex.Message }, jsonOpts);
    }
});

// ── Deploy: kill game process + copy DLL to plugins ──
app.MapPost("/api/deploy", async (HttpRequest req) =>
{
    var body = await JsonSerializer.DeserializeAsync<Dictionary<string, string>>(req.Body, jsonOpts);
    if (body == null || !body.TryGetValue("dllPath", out var dllPath) || !File.Exists(dllPath))
        return Results.BadRequest("dllPath missing or file not found");

    var gamePath = config.GamePath;
    var pluginsDir = Path.Combine(gamePath, "BepInEx", "plugins");
    var dllName = Path.GetFileName(dllPath);
    var dest = Path.Combine(pluginsDir, dllName);

    // Kill game process if running
    var killed = false;
    try
    {
        var procs = Process.GetProcessesByName("CasualtiesUnknown");
        foreach (var p in procs)
        {
            try { p.Kill(); p.WaitForExit(5000); killed = true; } catch { }
        }
    }
    catch { }

    // Copy DLL to plugins
    try
    {
        Directory.CreateDirectory(pluginsDir);
        File.Copy(dllPath, dest, true);
        return Results.Json(new { success = true, message = killed ? "Game killed, DLL deployed." : "DLL deployed (game not running).", dest });
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, message = ex.Message });
    }
});

// SPA fallback: non-/api routes serve index.html
app.MapFallback(async ctx =>
{
    if (ctx.Request.Path.StartsWithSegments("/api")) return;
    var root = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    var file = Path.Combine(root, ctx.Request.Path.Value!.TrimStart('/'));
    if (File.Exists(file))
    {
        await ctx.Response.SendFileAsync(file);
        return;
    }
    var idx = Path.Combine(root, "index.html");
    if (File.Exists(idx)) await ctx.Response.SendFileAsync(idx);
});

// ── Project management ──────────────────────────────────────────
app.MapGet("/api/projects", () =>
{
    var dirs = Directory.GetDirectories(projectsDir);
    var projects = dirs.Select(d =>
    {
        var name = Path.GetFileName(d);
        var cbpFiles = Directory.GetFiles(d, "*.cbp");
        return new { name, cbpFile = cbpFiles.FirstOrDefault() };
    }).OrderBy(p => p.name).ToList();
    return Results.Json(projects, jsonOpts);
});

app.MapGet("/api/projects/{name}", (string name) =>
{
    var dir = Path.Combine(projectsDir, name);
    if (!Directory.Exists(dir)) return Results.NotFound("project not found");
    var cbpFiles = Directory.GetFiles(dir, "*.cbp");
    if (cbpFiles.Length == 0) return Results.NotFound("no .cbp file");
    var content = File.ReadAllText(cbpFiles[0]);
    var bp = JsonSerializer.Deserialize<Blueprint>(content, jsonOpts);
    return Results.Json(bp, jsonOpts);
});

app.MapPost("/api/projects", async (HttpRequest req) =>
{
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null || string.IsNullOrWhiteSpace(bp.Mod?.Name))
        return Results.BadRequest("invalid blueprint");
    var safeName = bp.Mod.Name.Replace(' ', '_');
    var dir = Path.Combine(projectsDir, safeName);
    Directory.CreateDirectory(dir);
    var cbpPath = Path.Combine(dir, safeName + ".cbp");
    var json = JsonSerializer.Serialize(bp, jsonOpts);
    await File.WriteAllTextAsync(cbpPath, json);
    return Results.Ok(new { name = safeName });
});

app.MapPut("/api/projects/{name}", async (string name, HttpRequest req) =>
{
    var dir = Path.Combine(projectsDir, name);
    if (!Directory.Exists(dir)) return Results.NotFound("project not found");
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null) return Results.BadRequest("invalid blueprint");
    var cbpFiles = Directory.GetFiles(dir, "*.cbp");
    var cbpPath = cbpFiles.Length > 0 ? cbpFiles[0] : Path.Combine(dir, name + ".cbp");
    var json = JsonSerializer.Serialize(bp, jsonOpts);
    await File.WriteAllTextAsync(cbpPath, json);
    return Results.Ok();
});

app.MapDelete("/api/projects/{name}", (string name) =>
{
    var dir = Path.Combine(projectsDir, name);
    if (!Directory.Exists(dir)) return Results.NotFound("project not found");
    Directory.Delete(dir, true);
    return Results.Ok();
});

// ── Auto-open browser ──────────────────────────────────────────
app.Lifetime.ApplicationStarted.Register(() =>
{
    var url = app.Urls.FirstOrDefault() ?? "http://localhost:5000";
    try
    {
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }
    catch { }
});

app.Run();
