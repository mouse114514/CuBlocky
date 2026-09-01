using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CuBlocky.Server.Models;

// ── Root .cbp file model ──────────────────────────────────────────
public class Blueprint
{
    public ModMeta Mod { get; set; } = new();
    public List<ItemEntry> Items { get; set; } = new();
    public List<RecipeEntry> Recipes { get; set; } = new();
    public List<AssetRef> Assets { get; set; } = new();
    public string EventHandlers { get; set; } = "";
    public string EventHandlersXml { get; set; } = "";
}

public class ModMeta
{
    public string Guid { get; set; } = "com.example.mymod";
    public string Name { get; set; } = "My Mod";
    public string Version { get; set; } = "1.0.0";
    public string Author { get; set; } = "";
    public string Description { get; set; } = "";
    public string RootNamespace { get; set; } = "MyMod";
}

// ── Items (form + block behavior) ─────────────────────────────────
public class ItemEntry
{
    public string Id { get; set; } = "newitem";
    public string FullName { get; set; } = "New Item";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "food";
    public float Weight { get; set; } = 0.4f;
    public int Value { get; set; } = 1;
    public string Tags { get; set; } = "";
    public float DecayMinutes { get; set; } = 180f;
    public int Recognition { get; set; } = 2;
    public bool Usable { get; set; } = false;
    public bool UsableOnLimb { get; set; } = false;
    public int SpawnFrequency { get; set; } = 1;
    public string? SpriteAssetId { get; set; }
    // Generated C# code from Blockly workspace
    public string UseAction { get; set; } = "";
    public string UseActionXml { get; set; } = "";
    public string UseLimbAction { get; set; } = "";
    public string UseLimbActionXml { get; set; } = "";
}

// ── Block (Scratch-style, recursive tree) ──────────────────────────
public class BlockNode
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public Dictionary<string, string> Params { get; set; } = new();
    public List<BlockNode> Children { get; set; } = new();
}

// ── Recipes ────────────────────────────────────────────────────────
public class RecipeEntry
{
    public string ResultId { get; set; } = "stick";
    public string Category { get; set; } = "Tools";
    public int IntRequirement { get; set; } = 2;
    public int ResultAmount { get; set; } = 1;
    public float ResultCondition { get; set; } = 1f;
    public bool IsLiquidResult { get; set; } = false;
    public List<RecipeIngredient> Ingredients { get; set; } = new();
}

public class RecipeIngredient
{
    public string Mode { get; set; } = "specific";
    public string Id { get; set; } = "glass";
    public float Amount { get; set; } = 1f;
    public bool IsLiquid { get; set; } = false;
    public bool DestroyItem { get; set; } = true;
}

// ── Assets ─────────────────────────────────────────────────────────
public class AssetRef
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "sprite.png";
    public string SourcePath { get; set; } = "";
}

// ── Buildings ──────────────────────────────────────────────────────
public class BuildingEntry
{
    public string Id { get; set; } = "newbuilding";
    public string Name { get; set; } = "New Building";
    public string Desc { get; set; } = "";
    public float Health { get; set; } = 250f;
    public string Placement { get; set; } = "Floor";
}

// ── Tiles ──────────────────────────────────────────────────────────
public class TileEntry
{
    public string Id { get; set; } = "newtile";
    public string Name { get; set; } = "New Tile";
    public float Health { get; set; } = 100f;
    public string Collider { get; set; } = "Grid";
    public string GenStyle { get; set; } = "Vein";
}

// ── Locales ────────────────────────────────────────────────────────
public class LocaleEntry
{
    public string Type { get; set; } = "item";
    public string Id { get; set; } = "myItem";
    public string Zh { get; set; } = "中文名";
    public string En { get; set; } = "English Name";
}
