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
    // Advanced CCL properties (from //ITEM_PROP: markers)
    public bool IsAdvanced { get; set; } = false;
    public ContainerProps? Container { get; set; }
    public ToolProps? Tool { get; set; }
    public WearableProps? Wearable { get; set; }
    public LiquidContainerProps? LiquidContainer { get; set; }
    public BatteryProps? Battery { get; set; }
    public LightProps? Light { get; set; }
    public BandageProps? Bandage { get; set; }
    public SyringeProps? Syringe { get; set; }
    public GunProps? Gun { get; set; }
}

public class ContainerProps
{
    public string Capacity { get; set; } = "5";
    public string MaxWeightPerItem { get; set; } = "2";
    public string EncumbranceReduction { get; set; } = "1";
    public bool ItemsVisible { get; set; } = true;
    public string TagRestriction { get; set; } = "";
}

public class ToolProps
{
    public string Damage { get; set; } = "10";
    public string StructuralDamage { get; set; } = "5";
    public string Distance { get; set; } = "4";
    public string KnockBack { get; set; } = "50";
    public string Cooldown { get; set; } = "0.3";
    public string StaminaUse { get; set; } = "0.3";
    public bool Piercing { get; set; } = false;
}

public class WearableProps
{
    public string DesiredWearLimb { get; set; } = "UpTorso";
    public string WearSlotId { get; set; } = "back";
    public string WearableArmor { get; set; } = "0";
    public string WearableIsolation { get; set; } = "0";
    public string WearableHitDurabilityLossMultiplier { get; set; } = "1";
}

public class LiquidContainerProps
{
    public string Capacity { get; set; } = "100";
    public bool AutoFill { get; set; } = false;
    public string LiquidId { get; set; } = "water";
    public string LiquidAmount { get; set; } = "100";
}

public class BatteryProps
{
    public string Preset { get; set; } = "Medium";
    public string StartCharge { get; set; } = "0";
    public bool SpawnWithBattery { get; set; } = true;
}

public class LightProps
{
    public string Intensity { get; set; } = "0.5";
    public string Radius { get; set; } = "5";
    public string ColorR { get; set; } = "1";
    public string ColorG { get; set; } = "1";
    public string ColorB { get; set; } = "1";
}

public class BandageProps
{
    public string Effectiveness { get; set; } = "8";
    public string SkinHealAmount { get; set; } = "8";
    public string BandageSlowAmount { get; set; } = "18";
    public string PainReduction { get; set; } = "40";
    public string BoneHealTimerReduction { get; set; } = "5";
    public string DislocationTimerReduction { get; set; } = "5";
}

public class SyringeProps
{
    public string Capacity { get; set; } = "100";
    public string AmountPerFullUse { get; set; } = "100";
    public bool AutoFill { get; set; } = false;
    public string LiquidId { get; set; } = "morphine";
    public string LiquidAmount { get; set; } = "100";
}

public class GunProps
{
    public string AmmoType { get; set; } = "Pistol";
    public string FiringMode { get; set; } = "SemiAuto";
    public string FeedType { get; set; } = "Mag";
    public string MagCapacity { get; set; } = "12";
    public string KnockBack { get; set; } = "100";
    public string StructureDamage { get; set; } = "10";
    public string AnimalDamage { get; set; } = "25";
    public string Loudness { get; set; } = "5";
    public string DesiredGasTime { get; set; } = "0";
    public string ShotsPerFire { get; set; } = "1";
    public string VerticalSpread { get; set; } = "0";
    public string ConditionLossPerShot { get; set; } = "0.01";
}

public class LiquidEntry
{
    public string Id { get; set; } = "myliquid";
    public string Name { get; set; } = "My Liquid";
    public string Description { get; set; } = "";
    public string ColorR { get; set; } = "1";
    public string ColorG { get; set; } = "1";
    public string ColorB { get; set; } = "1";
    public string ValuePerLiter { get; set; } = "10";
    public bool Drinkable { get; set; } = false;
    public bool HealthUsable { get; set; } = false;
    public bool Injectable { get; set; } = false;
    public string InjectionSickness { get; set; } = "1";
    public bool Unobtainable { get; set; } = false;
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
