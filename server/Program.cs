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

// Temp directory for uploaded sprite assets
var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadDir);

// Fixed directory for saved projects
var projectsDir = Path.Combine(Directory.GetCurrentDirectory(), "projects");
Directory.CreateDirectory(projectsDir);

// ── Upload sprite file ──────────────────────────────────────────────
app.MapPost("/api/upload", async (HttpRequest req) =>
{
    if (!req.HasFormContentType) return Results.BadRequest("expected multipart form");
    var form = await req.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file == null || file.Length == 0) return Results.BadRequest("no file");

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (ext is not (".png" or ".jpg" or ".jpeg" or ".bmp"))
        return Results.BadRequest("only PNG/JPG/BMP images are accepted");

    // Use original filename (sanitized) so it can be resolved by name during build
    var safeName = Path.GetFileName(file.FileName).Replace(' ', '_');
    var savedPath = Path.Combine(uploadDir, safeName);
    using (var fs = new FileStream(savedPath, FileMode.Create))
    {
        await file.CopyToAsync(fs);
    }

    // Return the filename as both assetId and name - used as the sprite reference
    return Results.Json(new { assetId = safeName, name = safeName, originalName = file.FileName });
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
    var files = ProjectEmitter.EmitProject(bp);
    return Results.Json(new { files }, jsonOpts);
});

// ── Build: generate project → dotnet build → return DLL ──
app.MapPost("/api/build", async (HttpRequest req) =>
{
    var bp = await JsonSerializer.DeserializeAsync<Blueprint>(req.Body, jsonOpts);
    if (bp == null) return Results.BadRequest("invalid blueprint");

    var files = ProjectEmitter.EmitProject(bp);
    var asmName = Path.GetFileNameWithoutExtension(files.Keys.First(k => k.EndsWith(".csproj")));
    var buildDir = Path.Combine(Directory.GetCurrentDirectory(), "builds", asmName);

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

        // Copy uploaded sprites into project and embed as resources
        var spriteFiles = new List<string>();
        foreach (var asset in bp.Assets)
        {
            var src = Path.Combine(uploadDir, asset.Name);
            if (File.Exists(src))
            {
                var destDir = Path.Combine(buildDir, "Sprites");
                Directory.CreateDirectory(destDir);
                var dest = Path.Combine(destDir, asset.Name);
                File.Copy(src, dest, true);
                spriteFiles.Add(asset.Name);
            }
        }

        // Also scan RegisterContent.cs for AssetLoader.LoadEmbeddedSprite calls
        // and ensure referenced sprites exist in the Sprites folder
        var rcPath = Path.Combine(buildDir, "RegisterContent.cs");
        if (File.Exists(rcPath))
        {
            var rcContent = await File.ReadAllTextAsync(rcPath);
            var marker = "AssetLoader.LoadEmbeddedSprite(\"";
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
                        // Check if file exists in upload dir
                        var src = Path.Combine(uploadDir, spriteName);
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

app.MapDelete("/api/projects/{name}", (string name) =>
{
    var dir = Path.Combine(projectsDir, name);
    if (!Directory.Exists(dir)) return Results.NotFound("project not found");
    Directory.Delete(dir, true);
    return Results.Ok();
});

app.Run();
