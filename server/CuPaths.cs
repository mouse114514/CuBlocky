using System.Text;

namespace CuBlocky.Server;

/// <summary>
/// Persistent data location for CuBlocky.
/// User projects, generated builds and config live in %LOCALAPPDATA%\CuBlocky
/// (or $CUBLOCKY_DATA_DIR when set) instead of next to the executable, so
/// replacing the release folder on update never deletes the user's work.
/// </summary>
public static class CuPaths
{
    public static string DataDir { get; } = ResolveDataDir();

    public static string ProjectsDir => Path.Combine(DataDir, "projects");
    public static string BuildsDir => Path.Combine(DataDir, "builds");
    public static string ConfigPath => Path.Combine(DataDir, "config.json");

    private static string ResolveDataDir()
    {
        var custom = Environment.GetEnvironmentVariable("CUBLOCKY_DATA_DIR");
        var dir = !string.IsNullOrWhiteSpace(custom)
            ? custom!
            : Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CuBlocky");
        Directory.CreateDirectory(dir);
        Directory.CreateDirectory(Path.Combine(dir, "projects"));
        Directory.CreateDirectory(Path.Combine(dir, "builds"));
        return dir;
    }

    /// <summary>
    /// Older builds stored config.json and projects/ next to the executable.
    /// Copy them into the persistent folder once, without overwriting anything
    /// the user already has there.
    /// </summary>
    public static void MigrateFromExecutableFolder()
    {
        foreach (var legacyRoot in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
        {
            if (string.IsNullOrWhiteSpace(legacyRoot)) continue;
            var legacyRootFull = Path.GetFullPath(legacyRoot);

            var legacyConfig = Path.Combine(legacyRootFull, "config.json");
            if (File.Exists(legacyConfig) && !File.Exists(ConfigPath))
            {
                try { File.Copy(legacyConfig, ConfigPath); } catch { }
            }

            var legacyProjects = Path.Combine(legacyRootFull, "projects");
            if (Directory.Exists(legacyProjects) &&
                !Directory.EnumerateFileSystemEntries(ProjectsDir).Any())
            {
                try { CopyDirectory(legacyProjects, ProjectsDir); } catch { }
            }
        }
    }

    private static void CopyDirectory(string from, string to)
    {
        foreach (var dir in Directory.GetDirectories(from, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(from, dir);
            Directory.CreateDirectory(Path.Combine(to, rel));
        }
        foreach (var file in Directory.GetFiles(from, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(from, file);
            var dest = Path.Combine(to, rel);
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Copy(file, dest, overwrite: false);
        }
    }
}
