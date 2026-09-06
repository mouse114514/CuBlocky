using System.Text.Json;

namespace CuBlocky.Server.Models;

public class ServerConfig
{
    public string GamePath { get; set; } = @"C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo";

    private static string ConfigPath => Path.Combine(AppContext.BaseDirectory, "config.json");

    private static ServerConfig? _instance;

    public static ServerConfig Load()
    {
        if (_instance != null) return _instance;
        if (File.Exists(ConfigPath))
        {
            var json = File.ReadAllText(ConfigPath);
            _instance = JsonSerializer.Deserialize<ServerConfig>(json) ?? new ServerConfig();
        }
        else
        {
            _instance = new ServerConfig();
            _instance.Save();
        }
        return _instance;
    }

    public void Save()
    {
        var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(ConfigPath, json);
    }
}
