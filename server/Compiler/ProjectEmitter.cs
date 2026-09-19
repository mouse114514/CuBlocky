using System.Linq;
using System.Text;
using System.Text.Json;
using CuBlocky.Server.Models;

namespace CuBlocky.Server.Compiler;

// Emits the complete generated mod project as a path→content map.
// M1: Plugin.cs + RegisterContent.cs + .csproj + README. M5: zip download.
public static class ProjectEmitter
{
    private const string DefaultGamePath = @"C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo";

    public static Dictionary<string, string> EmitProject(Blueprint bp, string? gamePath = null)
    {
        var ns = SafeIdent(bp.Mod.RootNamespace);
        var asmName = SafeIdent(bp.Mod.RootNamespace);
        var guid = bp.Mod.Guid;
        var name = bp.Mod.Name.Replace("\"", "\\\"");
        var ver = bp.Mod.Version;
        var desc = bp.Mod.Description.Replace("\"", "\\\"");
        var hasEvents = !string.IsNullOrWhiteSpace(bp.EventHandlers);
        var hasUI = bp.UiControls != null && bp.UiControls.Count > 0;

        // Extract register markers from event code
        var (eventCode, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales, registerLiquids, statuses, functions) = ExtractRegisterMarkers(bp.EventHandlers!);
        var hasStatuses = statuses.Count > 0;

        var gPath = gamePath ?? DefaultGamePath;

        var files = new Dictionary<string, string>
        {
            ["Plugin.cs"] = EmitPlugin(ns, guid, name, ver, desc, hasEvents, hasStatuses, hasUI),
            ["RegisterContent.cs"] = CodeEmitter.EmitRegisterContent(bp, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales, registerLiquids),
            [asmName + ".csproj"] = EmitCsproj(asmName, ns, gPath),
            ["README.md"] = EmitReadme(name, ver),
        };

        if (hasEvents)
            files["EventHandlers.cs"] = EmitEventHandlers(ns, eventCode, functions);

        if (hasStatuses)
            files["Statuses.cs"] = CodeEmitter.EmitStatuses(bp, statuses);

        if (hasUI)
            files["CuUI.cs"] = EmitCuUI(ns, bp.UiControls!);

        return files;
    }

    private static (string eventCode, List<ItemEntry> items, List<RecipeEntry> recipes, List<BuildingEntry> buildings, List<TileEntry> tiles, List<LocaleEntry> locales, List<LiquidEntry> liquids, List<StatusEntry> statuses, List<FunctionDef> functions) ExtractRegisterMarkers(string eventCode)
    {
        var items = new List<ItemEntry>();
        var recipes = new List<RecipeEntry>();
        var buildings = new List<BuildingEntry>();
        var tiles = new List<TileEntry>();
        var locales = new List<LocaleEntry>();
        var liquids = new List<LiquidEntry>();
        var statuses = new List<StatusEntry>();
        var functions = new List<FunctionDef>();
        var itemProps = new List<(string id, JsonElement json)>();
        var liquidFlags = new Dictionary<string, JsonElement>();
        var itemUseActions = new Dictionary<string, string>();
        var itemLimbUseActions = new Dictionary<string, string>();
        var remainingLines = new List<string>();

        var lines = eventCode.Split('\n');
        string capturingItemUse = null;
        var itemUseBody = new System.Text.StringBuilder();
        FunctionDef capturingFunction = null;
        var functionBody = new System.Text.StringBuilder();

        foreach (var raw in lines)
        {
            var line = raw.TrimEnd('\r');

            if (line.StartsWith("//ITEM_USE_ACTION:"))
            {
                capturingItemUse = "use";
                itemUseBody.Clear();
                capturingItemUse = line.Substring(18).Trim();
                itemUseBody.Clear();
            }
            else if (line.StartsWith("//ITEM_LIMB_USE_ACTION:"))
            {
                capturingItemUse = "limb";
                itemUseBody.Clear();
                capturingItemUse = line.Substring(23).Trim();
                itemUseBody.Clear();
            }
            else if (capturingItemUse != null && line == "//END_ITEM_USE_ACTION")
            {
                itemUseActions[capturingItemUse] = itemUseBody.ToString().Trim();
                capturingItemUse = null;
            }
            else if (capturingItemUse != null && line == "//END_ITEM_LIMB_USE_ACTION")
            {
                itemLimbUseActions[capturingItemUse] = itemUseBody.ToString().Trim();
                capturingItemUse = null;
            }
            else if (capturingItemUse != null)
            {
                itemUseBody.AppendLine(line);
            }
            else if (line.StartsWith("//REGISTER_ITEM:"))
            {
                var json = line.Substring(16).Trim();
                try { var item = JsonSerializer.Deserialize<ItemEntry>(json); if (item != null) items.Add(item); } catch { }
            }
            else if (line.StartsWith("//REGISTER_RECIPE:"))
            {
                var json = line.Substring(18).Trim();
                try { var recipe = JsonSerializer.Deserialize<RecipeEntry>(json); if (recipe != null) recipes.Add(recipe); } catch { }
            }
            else if (line.StartsWith("//REGISTER_BUILDING:"))
            {
                var json = line.Substring(20).Trim();
                try { var building = JsonSerializer.Deserialize<BuildingEntry>(json); if (building != null) buildings.Add(building); } catch { }
            }
            else if (line.StartsWith("//REGISTER_TILE:"))
            {
                var json = line.Substring(16).Trim();
                try { var tile = JsonSerializer.Deserialize<TileEntry>(json); if (tile != null) tiles.Add(tile); } catch { }
            }
            else if (line.StartsWith("//REGISTER_LOCALE:"))
            {
                var json = line.Substring(18).Trim();
                try { var locale = JsonSerializer.Deserialize<LocaleEntry>(json); if (locale != null) locales.Add(locale); } catch { }
            }
            else if (line.StartsWith("//REGISTER_LIQUID:"))
            {
                var json = line.Substring(18).Trim();
                try { var liq = JsonSerializer.Deserialize<LiquidEntry>(json); if (liq != null) liquids.Add(liq); } catch { }
            }
            else if (line.StartsWith("//REGISTER_STATUS:"))
            {
                var json = line.Substring(18).Trim();
                try { var st = JsonSerializer.Deserialize<StatusEntry>(json); if (st != null) statuses.Add(st); } catch { }
            }
            else if (line.StartsWith("//LIQUID_FLAGS:"))
            {
                var json = line.Substring(15).Trim();
                try
                {
                    var doc = JsonDocument.Parse(json);
                    var liqId = doc.RootElement.TryGetProperty("Id", out var idEl) ? idEl.GetString() : null;
                    var target = !string.IsNullOrEmpty(liqId) ? liquids.FirstOrDefault(l => l.Id == liqId) : (liquids.Count > 0 ? liquids[^1] : null);
                    if (target != null)
                    {
                        if (doc.RootElement.TryGetProperty("Drinkable", out var d)) target.Drinkable = d.GetBoolean();
                        if (doc.RootElement.TryGetProperty("HealthUsable", out var h)) target.HealthUsable = h.GetBoolean();
                        if (doc.RootElement.TryGetProperty("Injectable", out var i)) target.Injectable = i.GetBoolean();
                        if (doc.RootElement.TryGetProperty("InjectionSickness", out var s)) target.InjectionSickness = Raw(s);
                        if (doc.RootElement.TryGetProperty("Unobtainable", out var u)) target.Unobtainable = u.GetBoolean();
                    }
                } catch { }
            }
            else if (line.StartsWith("//LIQUID_PROP:"))
            {
                var json = line.Substring(14).Trim();
                try
                {
                    var doc = JsonDocument.Parse(json);
                    var liqId = doc.RootElement.TryGetProperty("Id", out var idEl) ? idEl.GetString() : null;
                    var target = !string.IsNullOrEmpty(liqId) ? liquids.FirstOrDefault(l => l.Id == liqId) : (liquids.Count > 0 ? liquids[^1] : null);
                    if (target != null)
                    {
                        if (doc.RootElement.TryGetProperty("ColorR", out var cr)) target.ColorR = Raw(cr);
                        if (doc.RootElement.TryGetProperty("ColorG", out var cg)) target.ColorG = Raw(cg);
                        if (doc.RootElement.TryGetProperty("ColorB", out var cb)) target.ColorB = Raw(cb);
                        if (doc.RootElement.TryGetProperty("ValuePerLiter", out var vp)) target.ValuePerLiter = Raw(vp);
                    }
                } catch { }
            }
            else if (line.StartsWith("//ITEM_PROP:"))
            {
                var json = line.Substring(12).Trim();
                try
                {
                    var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("Id", out var idEl))
                    {
                        var itemId = idEl.GetString();
                        itemProps.Add((itemId!, doc.RootElement.Clone()));
                    }
                } catch { }
            }
            else if (line.StartsWith("//ITEM_START_CONDITION:"))
            {
                var json = line.Substring(23).Trim();
                try
                {
                    var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("Id", out var idEl) && doc.RootElement.TryGetProperty("Condition", out var condEl))
                    {
                        var itemId = idEl.GetString();
                        var cond = (float)condEl.GetDouble();
                        var item = items.FirstOrDefault(i => i.Id == itemId);
                        if (item != null) item.StartCondition = cond;
                    }
                } catch { }
            }
            else if (line.StartsWith("//DEFINE_FUNCTION:"))
            {
                var json = line.Substring(18).Trim();
                FunctionDef fn = null;
                try
                {
                    var doc = JsonDocument.Parse(json);
                    fn = new FunctionDef();
                    if (doc.RootElement.TryGetProperty("name", out var n)) fn.Name = n.GetString() ?? "unknown";
                    if (doc.RootElement.TryGetProperty("returnType", out var rt)) fn.ReturnType = rt.GetString() ?? "void";
                    if (doc.RootElement.TryGetProperty("params", out var pArr))
                    {
                        foreach (var p in pArr.EnumerateArray())
                        {
                            var pd = new ParamDef();
                            if (p.TryGetProperty("name", out var pn)) pd.Name = pn.GetString() ?? "p";
                            if (p.TryGetProperty("type", out var pt)) pd.Type = pt.GetString() ?? "var";
                            fn.Params.Add(pd);
                        }
                    }
                    functions.Add(fn);
                } catch { }
                capturingFunction = fn;
                functionBody.Clear();
            }
            else if (line == "//END_FUNCTION")
            {
                if (capturingFunction != null)
                {
                    capturingFunction.Body = functionBody.ToString().Trim();
                    capturingFunction = null;
                }
            }
            else if (capturingFunction != null)
            {
                functionBody.AppendLine(line);
            }
            else
            {
                remainingLines.Add(raw);
            }
        }

        // Merge useAction from blocks into registered items
        foreach (var item in items)
        {
            if (itemUseActions.TryGetValue(item.Id, out var useAction))
            {
                item.UseAction = useAction;
            }
            if (itemLimbUseActions.TryGetValue(item.Id, out var limbUseAction))
            {
                item.UseLimbAction = limbUseAction;
            }
        }

        // Merge ITEM_PROP markers into items
        foreach (var (propId, json) in itemProps)
        {
            var item = items.FirstOrDefault(i => i.Id == propId);
            if (item == null) continue;
            if (json.TryGetProperty("Container", out var c))
            {
                item.Container = new ContainerProps();
                if (c.TryGetProperty("Capacity", out var v)) item.Container.Capacity = Raw(v);
                if (c.TryGetProperty("MaxWeightPerItem", out var v2)) item.Container.MaxWeightPerItem = Raw(v2);
                if (c.TryGetProperty("EncumbranceReduction", out var v3)) item.Container.EncumbranceReduction = Raw(v3);
                if (c.TryGetProperty("ItemsVisible", out var v4)) item.Container.ItemsVisible = v4.GetBoolean();
                if (c.TryGetProperty("TagRestriction", out var v5)) item.Container.TagRestriction = v5.GetString() ?? "";
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Tool", out var t))
            {
                item.Tool = new ToolProps();
                if (t.TryGetProperty("Damage", out var v)) item.Tool.Damage = Raw(v);
                if (t.TryGetProperty("StructuralDamage", out var v2)) item.Tool.StructuralDamage = Raw(v2);
                if (t.TryGetProperty("Distance", out var v3)) item.Tool.Distance = Raw(v3);
                if (t.TryGetProperty("KnockBack", out var v4)) item.Tool.KnockBack = Raw(v4);
                if (t.TryGetProperty("Cooldown", out var v5)) item.Tool.Cooldown = Raw(v5);
                if (t.TryGetProperty("StaminaUse", out var v6)) item.Tool.StaminaUse = Raw(v6);
                if (t.TryGetProperty("Piercing", out var v7)) item.Tool.Piercing = v7.GetBoolean();
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Wearable", out var w))
            {
                item.Wearable = new WearableProps();
                if (w.TryGetProperty("DesiredWearLimb", out var v)) item.Wearable.DesiredWearLimb = v.GetString() ?? "UpTorso";
                if (w.TryGetProperty("WearSlotId", out var v2)) item.Wearable.WearSlotId = v2.GetString() ?? "back";
                if (w.TryGetProperty("WearableArmor", out var v3)) item.Wearable.WearableArmor = Raw(v3);
                if (w.TryGetProperty("WearableIsolation", out var v4)) item.Wearable.WearableIsolation = Raw(v4);
                if (w.TryGetProperty("WearableHitDurabilityLossMultiplier", out var v5)) item.Wearable.WearableHitDurabilityLossMultiplier = Raw(v5);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("LiquidContainer", out var lc))
            {
                item.LiquidContainer = new LiquidContainerProps();
                if (lc.TryGetProperty("Capacity", out var v)) item.LiquidContainer.Capacity = Raw(v);
                if (lc.TryGetProperty("AutoFill", out var v2)) item.LiquidContainer.AutoFill = v2.GetBoolean();
                if (lc.TryGetProperty("LiquidId", out var v3)) item.LiquidContainer.LiquidId = v3.GetString() ?? "water";
                if (lc.TryGetProperty("LiquidAmount", out var v4)) item.LiquidContainer.LiquidAmount = Raw(v4);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Battery", out var bat))
            {
                item.Battery = new BatteryProps();
                if (bat.TryGetProperty("Preset", out var v)) item.Battery.Preset = v.GetString() ?? "Medium";
                if (bat.TryGetProperty("StartCharge", out var v2)) item.Battery.StartCharge = Raw(v2);
                if (bat.TryGetProperty("SpawnWithBattery", out var v3)) item.Battery.SpawnWithBattery = v3.GetBoolean();
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Light", out var lt))
            {
                item.Light = new LightProps();
                if (lt.TryGetProperty("Intensity", out var v)) item.Light.Intensity = Raw(v);
                if (lt.TryGetProperty("Radius", out var v2)) item.Light.Radius = Raw(v2);
                if (lt.TryGetProperty("ColorR", out var v3)) item.Light.ColorR = Raw(v3);
                if (lt.TryGetProperty("ColorG", out var v4)) item.Light.ColorG = Raw(v4);
                if (lt.TryGetProperty("ColorB", out var v5)) item.Light.ColorB = Raw(v5);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Bandage", out var bd))
            {
                item.Bandage = new BandageProps();
                if (bd.TryGetProperty("Effectiveness", out var v)) item.Bandage.Effectiveness = Raw(v);
                if (bd.TryGetProperty("SkinHealAmount", out var v2)) item.Bandage.SkinHealAmount = Raw(v2);
                if (bd.TryGetProperty("BandageSlowAmount", out var v3)) item.Bandage.BandageSlowAmount = Raw(v3);
                if (bd.TryGetProperty("PainReduction", out var v4)) item.Bandage.PainReduction = Raw(v4);
                if (bd.TryGetProperty("BoneHealTimerReduction", out var v5)) item.Bandage.BoneHealTimerReduction = Raw(v5);
                if (bd.TryGetProperty("DislocationTimerReduction", out var v6)) item.Bandage.DislocationTimerReduction = Raw(v6);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Syringe", out var sy))
            {
                item.Syringe = new SyringeProps();
                if (sy.TryGetProperty("Capacity", out var v)) item.Syringe.Capacity = Raw(v);
                if (sy.TryGetProperty("AmountPerFullUse", out var v2)) item.Syringe.AmountPerFullUse = Raw(v2);
                if (sy.TryGetProperty("AutoFill", out var v3)) item.Syringe.AutoFill = v3.GetBoolean();
                if (sy.TryGetProperty("LiquidId", out var v4)) item.Syringe.LiquidId = v4.GetString() ?? "morphine";
                if (sy.TryGetProperty("LiquidAmount", out var v5)) item.Syringe.LiquidAmount = Raw(v5);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Gun", out var gu))
            {
                item.Gun = new GunProps();
                if (gu.TryGetProperty("AmmoType", out var v)) item.Gun.AmmoType = v.GetString() ?? "Pistol";
                if (gu.TryGetProperty("FiringMode", out var v2)) item.Gun.FiringMode = v2.GetString() ?? "SemiAuto";
                if (gu.TryGetProperty("FeedType", out var v3)) item.Gun.FeedType = v3.GetString() ?? "Mag";
                if (gu.TryGetProperty("MagCapacity", out var v4)) item.Gun.MagCapacity = Raw(v4);
                if (gu.TryGetProperty("KnockBack", out var v5)) item.Gun.KnockBack = Raw(v5);
                if (gu.TryGetProperty("StructureDamage", out var v6)) item.Gun.StructureDamage = Raw(v6);
                if (gu.TryGetProperty("AnimalDamage", out var v7)) item.Gun.AnimalDamage = Raw(v7);
                if (gu.TryGetProperty("Loudness", out var v8)) item.Gun.Loudness = Raw(v8);
                if (gu.TryGetProperty("DesiredGasTime", out var v9)) item.Gun.DesiredGasTime = Raw(v9);
                if (gu.TryGetProperty("ShotsPerFire", out var v10)) item.Gun.ShotsPerFire = Raw(v10);
                if (gu.TryGetProperty("VerticalSpread", out var v11)) item.Gun.VerticalSpread = Raw(v11);
                if (gu.TryGetProperty("ConditionLossPerShot", out var v12)) item.Gun.ConditionLossPerShot = Raw(v12);
                if (gu.TryGetProperty("NormalSprite", out var v13)) item.Gun.NormalSprite = v13.GetString() ?? "";
                if (gu.TryGetProperty("RackedSprite", out var v14)) item.Gun.RackedSprite = v14.GetString() ?? "";
                if (gu.TryGetProperty("NormalSpriteNoMag", out var v15)) item.Gun.NormalSpriteNoMag = v15.GetString() ?? "";
                if (gu.TryGetProperty("RackedSpriteNoMag", out var v16)) item.Gun.RackedSpriteNoMag = v16.GetString() ?? "";
                if (gu.TryGetProperty("FireSound", out var v17)) item.Gun.FireSound = v17.GetString() ?? "";
                if (gu.TryGetProperty("CustomRack", out var v18)) item.Gun.CustomRack = v18.GetString() ?? "";
                if (gu.TryGetProperty("CustomUnrack", out var v19)) item.Gun.CustomUnrack = v19.GetString() ?? "";
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Magazine", out var mag))
            {
                item.Magazine = new MagazineProps();
                if (mag.TryGetProperty("AmmoType", out var mt)) item.Magazine.AmmoType = mt.GetString() ?? "Pistol";
                if (mag.TryGetProperty("MaxRounds", out var mr)) item.Magazine.MaxRounds = Raw(mr);
                if (mag.TryGetProperty("StartRounds", out var sr)) item.Magazine.StartRounds = Raw(sr);
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Category", out var catEl))
            {
                item.Category = catEl.GetString() ?? "food";
                item.IsAdvanced = true;
            }
            if (json.TryGetProperty("Weight", out var wEl)) { item.Weight = float.TryParse(Raw(wEl), out var wVal) ? wVal : 0.4f; item.IsAdvanced = true; }
            if (json.TryGetProperty("Value", out var vEl)) { item.Value = int.TryParse(Raw(vEl), out var vVal) ? vVal : 1; item.IsAdvanced = true; }
            if (json.TryGetProperty("DecayMinutes", out var dEl)) { item.DecayMinutes = float.TryParse(Raw(dEl), out var dVal) ? dVal : 180f; item.IsAdvanced = true; }
            if (json.TryGetProperty("Recognition", out var rEl)) { item.Recognition = int.TryParse(Raw(rEl), out var rVal) ? rVal : 2; item.IsAdvanced = true; }
            if (json.TryGetProperty("SpawnFrequency", out var sEl)) { item.SpawnFrequency = int.TryParse(Raw(sEl), out var sVal) ? sVal : 1; item.IsAdvanced = true; }
        }

        return (string.Join('\n', remainingLines), items, recipes, buildings, tiles, locales, liquids, statuses, functions);
    }

    // Strip quotes from JSON string values; pass through numbers/booleans as-is.
    static string Raw(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.String)
            return el.GetString() ?? "";
        return el.GetRawText();
    }

    private static string EmitPlugin(string ns, string guid, string name, string ver, string desc, bool hasEvents, bool hasStatuses, bool hasUI)
    {
        var patchLine = hasEvents ? "            EventHandlers.Init(Logger);\n            Harmony.CreateAndPatchAll(typeof(EventHandlers), ModGUID);\n" : "";
        if (hasStatuses)
            patchLine += "            Harmony.CreateAndPatchAll(typeof(StatusEffectsPatches), ModGUID);\n";
        patchLine += "            Harmony.CreateAndPatchAll(typeof(RegisterContent), ModGUID);\n";
    return $@"// AUTO-GENERATED by CuBlocky. Do not edit by hand.
using BepInEx;
using BepInEx.Logging;
using HarmonyLib;
using System.Reflection;
using System.Linq;
using {ns};

namespace {ns}
{{
    [BepInPlugin(""{guid}"", ""{name}"", ""{ver}"")]
    [BepInDependency(""net.cucorelib"", BepInDependency.DependencyFlags.HardDependency)]
    public class Plugin : BaseUnityPlugin
    {{
        public const string ModGUID = ""{guid}"";
        public const string ModName = ""{name}"";
        public const string ModVersion = ""{ver}"";

        internal static new ManualLogSource Logger;
        private readonly Harmony _harmony = new(ModGUID);

        private void Awake()
        {{
            Logger = base.Logger;
            Logger.LogInfo(""[CuBlocky] Awake started"");
            try
            {{
                // Debug: list all embedded resources
                var asm = typeof(Plugin).Assembly;
                var resources = asm.GetManifestResourceNames();
                Logger.LogInfo($""[CuBlocky] Embedded resources: {{resources.Length}} items"");
                foreach (var r in resources)
                    Logger.LogInfo($""[CuBlocky]   Resource: {{r}}"");

                RegisterContent.RegisterAll();
                Logger.LogInfo(""[CuBlocky] RegisterAll done"");
{patchLine}                Logger.LogInfo(""[CuBlocky] Harmony patches applied"");
            }}
            catch (System.Exception ex)
            {{
                Logger.LogError($""[CuBlocky] EXCEPTION: {{ex.GetType().Name}}: {{ex.Message}}"");
                Logger.LogError($""[CuBlocky] StackTrace: {{ex.StackTrace}}"");
                if (ex.InnerException != null)
                    Logger.LogError($""[CuBlocky] Inner: {{ex.InnerException.GetType().Name}}: {{ex.InnerException.Message}}"");
                return;
            }}
            Logger.LogInfo($""{name} v{ver} loaded."");
        }}
{(hasUI ? "        private void OnGUI()\n        {\n            CuUI.Render();\n        }\n" : "")}    }}
}}
";
    }

    private static string EmitCsproj(string asmName, string ns, string gamePath)
    {
        // net4.7.2 to match BepInEx 5 / Unity / Mono. CUCoreLib.dll resolved from
        // the game's BepInEx/plugins folder (CCL setup docs convention).
        var g = gamePath.Replace("\\", "\\\\");
        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
<Project Sdk=""Microsoft.NET.Sdk"">
  <PropertyGroup>
    <TargetFramework>net472</TargetFramework>
    <LangVersion>10.0</LangVersion>
    <Nullable>disable</Nullable>
    <AssemblyName>{asmName}</AssemblyName>
    <RootNamespace>{ns}</RootNamespace>
    <Version>1.0.0</Version>
    <AppendTargetFrameworkToOutputPath>false</AppendTargetFrameworkToOutputPath>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include=""BepInEx"">
      <HintPath>{g}\BepInEx\core\BepInEx.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""0Harmony"">
      <HintPath>{g}\BepInEx\core\0Harmony.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""CUCoreLib"">
      <HintPath>{g}\BepInEx\plugins\CUCoreLib.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""Assembly-CSharp"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\Assembly-CSharp.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\UnityEngine.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.CoreModule"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\UnityEngine.CoreModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.AudioModule"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\UnityEngine.AudioModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.IMGUIModule"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\UnityEngine.IMGUIModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.TextRenderingModule"">
      <HintPath>{g}\CasualtiesUnknown_Data\Managed\UnityEngine.TextRenderingModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
</Project>
";
    }

    private static string EmitReadme(string name, string ver)
    {
        return $@"# {name} v{ver}

Auto-generated by **CuBlocky**.

## Prereqs
- CUCoreLib.dll in `BepInEx/plugins/` (https://github.com/jimmyking9999999/CUCoreLib)

## Build
```
dotnet build -c Release
```

## Install
Copy the built DLL from `bin/Release/` into
`Casualties Unknown Demo/BepInEx/plugins/`.
";
    }

    private static string EmitEventHandlers(string ns, string eventCode, List<FunctionDef> functions)
    {
        var sb = new StringBuilder();
        sb.AppendLine("// AUTO-GENERATED by CuBlocky. Event handlers.");
        sb.AppendLine("using BepInEx.Logging;");
        sb.AppendLine("using HarmonyLib;");
        sb.AppendLine("using UnityEngine;");
        sb.AppendLine("using CUCoreLib.Data;");
        sb.AppendLine("using CUCoreLib.Helpers;");
        sb.AppendLine("using CUCoreLib.Registries;");
        sb.AppendLine();
        sb.AppendLine($"namespace {ns}");
        sb.AppendLine("{");
        sb.AppendLine("    public static class EventHandlers");
        sb.AppendLine("    {");
        sb.AppendLine("        internal static ManualLogSource Log;");
        sb.AppendLine();
        sb.AppendLine("        public static void Init(ManualLogSource logger)");
        sb.AppendLine("        {");
        sb.AppendLine("            Log = logger;");
        sb.AppendLine("            Log.LogInfo(\"EventHandlers.Init called\");");

        var lines = eventCode.Split('\n');
        var patchIdx = 0;
        var eventIdx = 0;
        var currentMethod = "";
        var currentBody = new StringBuilder();
        var hasCclEvents = false;

        // First pass: collect CCL event subscriptions
        foreach (var raw in lines)
        {
            var line = raw.TrimEnd('\r');
            if (line.StartsWith("//EVENT:"))
            {
                var eventName = line.Substring(8).Split(':')[0].Trim();
                hasCclEvents = true;
            }
        }

        // Emit CCL event subscriptions in Init()
        if (hasCclEvents)
        {
            foreach (var raw in lines)
            {
                var line = raw.TrimEnd('\r');
                if (line.StartsWith("//EVENT:"))
                {
                    var eventName = line.Substring(8).Split(':')[0].Trim();
                    sb.AppendLine($"            CUCoreUtils.{eventName} += Handle{eventName};");
                }
            }
        }

        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        private static Body GetPlayer() => PlayerCamera.main.body;");
        sb.AppendLine();

        // Emit user-defined functions
        foreach (var fn in functions)
        {
            if (string.IsNullOrEmpty(fn.Name)) continue;
            var csharpReturn = MapParamType(fn.ReturnType);
            var paramList = string.Join(", ", fn.Params.Select(p => $"{MapParamType(p.Type)} _{SanitizeIdent(p.Name)}"));
            sb.AppendLine($"        public static {csharpReturn} {SanitizeIdent(fn.Name)}({paramList})");
            sb.AppendLine("        {");
            if (!string.IsNullOrEmpty(fn.Body))
            {
                var bodyCode = fn.Body.Replace("body.", "GetPlayer().");
                foreach (var bline in bodyCode.Split('\n'))
                {
                    var btrim = bline.TrimEnd('\r');
                    if (!string.IsNullOrWhiteSpace(btrim))
                        sb.AppendLine("            " + btrim);
                }
            }
            sb.AppendLine("        }");
            sb.AppendLine();
        }

        // Second pass: emit patch and event handler methods
        foreach (var raw in lines)
        {
            var line = raw.TrimEnd('\r');

            if (line.StartsWith("//PATCH:"))
            {
                var method = line.Substring(8).Split(':')[0].Trim();
                currentMethod = method;
                currentBody.Clear();
            }
            else if (line.StartsWith("//EVENT:"))
            {
                var eventName = line.Substring(8).Split(':')[0].Trim();
                currentMethod = $"CCL_{eventName}";
                currentBody.Clear();
            }
            else if (line == "//ENDPATCH")
            {
                if (!string.IsNullOrEmpty(currentMethod) && currentBody.Length > 0)
                {
                    var bodyCode = currentBody.ToString();

                    if (currentMethod.StartsWith("CCL_"))
                    {
                        // CCL event handler
                        var eventName = currentMethod.Substring(4);
                        var handlerName = $"Handle{eventName}";
                        sb.AppendLine($"        private static void {handlerName}()");
                        sb.AppendLine("        {");
                        sb.AppendLine($"            Log.LogInfo($\"[CuBlocky] {handlerName} fired\");");
                        foreach (var bline in bodyCode.Split('\n'))
                        {
                            var btrim = bline.TrimEnd('\r');
                            if (!string.IsNullOrWhiteSpace(btrim))
                                sb.AppendLine("            " + btrim);
                        }
                        sb.AppendLine("        }");
                        sb.AppendLine();
                    }
                    else
                    {
                        // Harmony patch
                        var patchName = $"Patch{patchIdx}";
                        var methodName = currentMethod;
                        bodyCode = bodyCode.Replace("body.", "__instance.");

                        if (methodName == "Start")
                        {
                            // Body.Start fires before PlayerCamera.main is ready.
                            // Use Body.Update with a one-shot HashSet so we run once
                            // as soon as the player body is available.
                            sb.AppendLine("        private static readonly System.Collections.Generic.HashSet<int> _patchedBodies = new System.Collections.Generic.HashSet<int>();");
                            sb.AppendLine();
                            sb.AppendLine($"        [HarmonyPatch(typeof(Body), \"Update\")]");
                            sb.AppendLine("        [HarmonyPostfix]");
                            sb.AppendLine($"        public static void {patchName}(Body __instance)");
                            sb.AppendLine("        {");
                            sb.AppendLine("            if (__instance == null) return;");
                            sb.AppendLine("            if (_patchedBodies.Contains(__instance.GetInstanceID())) return;");
                            sb.AppendLine("            var cam = PlayerCamera.main;");
                            sb.AppendLine("            if (cam == null) return;");
                            sb.AppendLine("            if (__instance != cam.body) return;");
                            sb.AppendLine("            _patchedBodies.Add(__instance.GetInstanceID());");
                            sb.AppendLine($"            Log.LogInfo($\"[CuBlocky] {patchName} body.pos={{__instance.transform.position}} cam.pos={{PlayerCamera.main?.transform.position}}\");");
                            sb.AppendLine("            try {");
                            foreach (var bline in bodyCode.Split('\n'))
                            {
                                var btrim = bline.TrimEnd('\r');
                                if (string.IsNullOrWhiteSpace(btrim)) continue;
                                if (btrim.Contains("InstantiateReturn"))
                                {
                                    var trimmed = btrim.TrimStart();
                                    var indent = btrim.Substring(0, btrim.Length - trimmed.Length);
                                    if (trimmed.StartsWith("for ") || trimmed.StartsWith("for("))
                                    {
                                        var callStart = trimmed.IndexOf("CustomInstantiate.");
                                        if (callStart >= 0)
                                        {
                                            var call = trimmed.Substring(callStart).TrimEnd(';');
                                            sb.AppendLine(indent + "var _go = " + call + ";");
                                        }
                                        else
                                            sb.AppendLine("                " + btrim);
                                    }
                                    else
                                    {
                                        var code = trimmed.TrimEnd(';');
                                        if (code.StartsWith("var _go = ") || code.StartsWith("var _go="))
                                            sb.AppendLine(indent + code + ";");
                                        else
                                            sb.AppendLine(indent + "var _go = " + code + ";");
                                    }
                                    sb.AppendLine($"                Log.LogInfo($\"[CuBlocky] {patchName} InstantiateReturn => {{(_go != null ? _go.name + \" at \" + _go.transform.position.ToString() : \"NULL\")}}\");");
                                    sb.AppendLine($"                if (_go != null) {{ var _sr = _go.GetComponent<UnityEngine.SpriteRenderer>(); var _sr2 = _go.GetComponentInChildren<UnityEngine.SpriteRenderer>(); Log.LogInfo($\"[CuBlocky] {patchName} go.layer={{_go.layer}} active={{_go.activeSelf}} sr.enabled={{(_sr != null ? _sr.enabled.ToString() : \"no\")}} sr.sortLayer={{(_sr != null ? _sr.sortingLayerName : \"\")}} sr.sortOrder={{(_sr != null ? _sr.sortingOrder.ToString() : \"\")}} sr.sprite={{(_sr != null && _sr.sprite != null ? _sr.sprite.name + \" \" + _sr.sprite.rect.width + \"x\" + _sr.sprite.rect.height : \"null\")}} localScale={{_go.transform.localScale}} pos={{_go.transform.position}}\"); }}");
                                }
                                else
                                    sb.AppendLine("                " + btrim);
                            }
                            sb.AppendLine($"                Log.LogInfo($\"[CuBlocky] {patchName} body executed OK\");");
                            sb.AppendLine("            } catch (System.Exception _ex) {");
                            sb.AppendLine($"                Log.LogError($\"[CuBlocky] {patchName} FAILED: {{_ex.Message}}\");");
                            sb.AppendLine("            }");
                            sb.AppendLine("        }");
                            sb.AppendLine();
                        }
                        else
                        {
                            sb.AppendLine($"        [HarmonyPatch(typeof(Body), \"{methodName}\")]");
                            sb.AppendLine("        [HarmonyPostfix]");
                            sb.AppendLine($"        public static void {patchName}(Body __instance)");
                            sb.AppendLine("        {");
                            sb.AppendLine("            if (__instance == null) return;");
                            sb.AppendLine("            if (__instance.talker == null) return;");
                            foreach (var bline in bodyCode.Split('\n'))
                            {
                                var btrim = bline.TrimEnd('\r');
                                if (!string.IsNullOrWhiteSpace(btrim))
                                    sb.AppendLine("            " + btrim);
                            }
                            sb.AppendLine("        }");
                            sb.AppendLine();
                        }
                        patchIdx++;
                    }
                }
                currentMethod = "";
                currentBody.Clear();
            }
            else if (!string.IsNullOrEmpty(currentMethod))
            {
                currentBody.AppendLine(line);
            }
        }

        sb.AppendLine("    }");
        sb.AppendLine("}");
        return sb.ToString();
    }

    private static string SafeIdent(string s)
    {
        var sb = new StringBuilder();
        foreach (var c in s)
            if (char.IsLetterOrDigit(c)) sb.Append(c); else sb.Append('_');
        if (sb.Length == 0 || char.IsDigit(sb[0])) sb.Insert(0, "M");
        return sb.ToString();
    }

    private static string SanitizeIdent(string s)
    {
        var sb = new StringBuilder();
        foreach (var c in s)
            if (char.IsLetterOrDigit(c)) sb.Append(c); else sb.Append('_');
        if (sb.Length == 0 || char.IsDigit(sb[0])) sb.Insert(0, "_");
        return sb.ToString();
    }

    private static string MapParamType(string type)
    {
        return type?.ToLowerInvariant() switch
        {
            "number" or "float" or "int" => "float",
            "string" or "text" => "string",
            "bool" or "boolean" => "bool",
            "void" => "void",
            "var" or "any" or null => "var",
            _ => type
        };
    }

    private static string HexToColor(string hex)
    {
        if (hex.StartsWith("#")) hex = hex.Substring(1);
        if (hex.Length == 6)
        {
            int r = Convert.ToInt32(hex.Substring(0, 2), 16);
            int g = Convert.ToInt32(hex.Substring(2, 2), 16);
            int b = Convert.ToInt32(hex.Substring(4, 2), 16);
            return $"new Color({(r / 255.0):F3}f, {(g / 255.0):F3}f, {(b / 255.0):F3}f, 1f)";
        }
        if (hex.Length == 8)
        {
            int r = Convert.ToInt32(hex.Substring(0, 2), 16);
            int g = Convert.ToInt32(hex.Substring(2, 2), 16);
            int b = Convert.ToInt32(hex.Substring(4, 2), 16);
            int a = Convert.ToInt32(hex.Substring(6, 2), 16);
            return $"new Color({(r / 255.0):F3}f, {(g / 255.0):F3}f, {(b / 255.0):F3}f, {(a / 255.0):F3}f)";
        }
        return "Color.white";
    }

    private static string EmitCuUI(string ns, List<UIControlEntry> controls)
    {
        var sb = new StringBuilder();
        sb.AppendLine("// AUTO-GENERATED by CuBlocky. UI control manager.");
        sb.AppendLine("using UnityEngine;");
        sb.AppendLine("using System.Collections.Generic;");
        sb.AppendLine();
        sb.AppendLine($"namespace {ns}");
        sb.AppendLine("{");
        sb.AppendLine("    public static class CuUI");
        sb.AppendLine("    {");
        sb.AppendLine("        public class Ctrl");
        sb.AppendLine("        {");
        sb.AppendLine("            public string Id;");
        sb.AppendLine("            public string Type;");
        sb.AppendLine("            public float X, Y, Width, Height;");
        sb.AppendLine("            public string Text = \"\";");
        sb.AppendLine("            public int FontSize = 14;");
        sb.AppendLine("            public Color TextColor = Color.white;");
        sb.AppendLine("            public Color BgColor = Color.black;");
        sb.AppendLine("            public Color StrokeColor = Color.white;");
        sb.AppendLine("            public float StrokeWidth = 0;");
        sb.AppendLine("            public float CornerRadius = 0;");
        sb.AppendLine("            public float Opacity = 1f;");
        sb.AppendLine("            public bool Visible = false;");
        sb.AppendLine("            public bool ToggleState = false;");
        sb.AppendLine("            public string TextFieldText = \"\";");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        private static Dictionary<string, Ctrl> _controls = new();");
        sb.AppendLine("        private static Dictionary<string, bool> _pressed = new();");
        sb.AppendLine("        private static bool _dataInit = false;");
        sb.AppendLine("        private static Dictionary<Color, Texture2D> _texCache = new();");
        sb.AppendLine("        private static Texture2D _nineSliceTex;");
        sb.AppendLine("        private static GUIStyle _labelStyle;");
        sb.AppendLine("        private static GUIStyle _bgStyle;");
        sb.AppendLine();
        sb.AppendLine("        static void InitData()");
        sb.AppendLine("        {");
        sb.AppendLine("            if (_dataInit) return;");
        sb.AppendLine("            _dataInit = true;");

        foreach (var c in controls)
        {
            var id = c.Id.Replace("\"", "\\\"");
            var text = (c.Text ?? "").Replace("\"", "\\\"");
            var tc = HexToColor(c.TextColor);
            var bg = HexToColor(c.BackgroundColor);
            var sc = HexToColor(c.StrokeColor);
            sb.AppendLine($"            _controls[\"{id}\"] = new Ctrl {{ Id = \"{id}\", Type = \"{c.Type}\", X = {c.X}f, Y = {c.Y}f, Width = {c.Width}f, Height = {c.Height}f, Text = \"{text}\", FontSize = {c.FontSize}, TextColor = {tc}, BgColor = {bg}, StrokeColor = {sc}, StrokeWidth = {c.StrokeWidth}f, CornerRadius = {c.CornerRadius}f, Opacity = {c.Opacity}f, Visible = {c.Visible.ToString().ToLower()}, TextFieldText = \"{text}\" }};");
        }

        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static void Show(string id)");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            if (_controls.TryGetValue(id, out var c)) c.Visible = true;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static void Hide(string id)");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            if (_controls.TryGetValue(id, out var c)) c.Visible = false;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static void SetProperty(string id, string prop, object val)");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            if (!_controls.TryGetValue(id, out var c)) return;");
        sb.AppendLine("            string s = val as string ?? val?.ToString() ?? \"\";");
        sb.AppendLine("            switch (prop)");
        sb.AppendLine("            {");
        sb.AppendLine("                case \"text\": c.Text = s; break;");
        sb.AppendLine("                case \"visible\": c.Visible = val is bool b ? b : bool.TryParse(s, out var bv) && bv; break;");
        sb.AppendLine("                case \"x\": c.X = ParseFloat(val); break;");
        sb.AppendLine("                case \"y\": c.Y = ParseFloat(val); break;");
        sb.AppendLine("                case \"width\": c.Width = ParseFloat(val); break;");
        sb.AppendLine("                case \"height\": c.Height = ParseFloat(val); break;");
        sb.AppendLine("                case \"fontSize\": c.FontSize = (int)ParseFloat(val); break;");
        sb.AppendLine("                case \"opacity\": c.Opacity = ParseFloat(val); break;");
        sb.AppendLine("                case \"textColor\": c.TextColor = ParseColor(s); break;");
        sb.AppendLine("                case \"backgroundColor\": c.BgColor = ParseColor(s); break;");
        sb.AppendLine("                case \"strokeColor\": c.StrokeColor = ParseColor(s); break;");
        sb.AppendLine("                case \"strokeWidth\": c.StrokeWidth = ParseFloat(val); break;");
        sb.AppendLine("                case \"cornerRadius\": c.CornerRadius = ParseFloat(val); break;");
        sb.AppendLine("            }");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static string GetText(string id)");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            return _controls.TryGetValue(id, out var c) ? c.TextFieldText : \"\";");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static bool IsPressed(string id)");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            return _pressed.TryGetValue(id, out var p) && p;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        public static void Render()");
        sb.AppendLine("        {");
        sb.AppendLine("            InitData();");
        sb.AppendLine("            if (_labelStyle == null)");
        sb.AppendLine("            {");
        sb.AppendLine("                _labelStyle = new GUIStyle(GUI.skin.label);");
        sb.AppendLine("                _labelStyle.alignment = TextAnchor.MiddleCenter;");
        sb.AppendLine("            }");
        sb.AppendLine("            if (_bgStyle == null)");
        sb.AppendLine("            {");
        sb.AppendLine("                _bgStyle = new GUIStyle(GUI.skin.box);");
        sb.AppendLine("                _bgStyle.alignment = TextAnchor.MiddleCenter;");
        sb.AppendLine("            }");
        sb.AppendLine("            float sc = Mathf.Max(0.8f, (float)Screen.height / 1080f);");
        sb.AppendLine("            foreach (var c in _controls.Values)");
        sb.AppendLine("            {");
        sb.AppendLine("                if (!c.Visible) continue;");
        sb.AppendLine("                var rect = new Rect(c.X * Screen.width, c.Y * Screen.height, c.Width * Screen.width, c.Height * Screen.height);");
        sb.AppendLine("                var oldColor = GUI.color;");
        sb.AppendLine("                GUI.color = new Color(1f, 1f, 1f, c.Opacity);");
        sb.AppendLine();
        sb.AppendLine("                // Draw fill background (9-slice for rounded corners)");
        sb.AppendLine("                if (c.CornerRadius > 0)");
        sb.AppendLine("                {");
        sb.AppendLine("                    int r = Mathf.RoundToInt(c.CornerRadius * sc);");
        sb.AppendLine("                    var nineTex = GetNineSliceTex(c.CornerRadius * sc);");
        sb.AppendLine("                    _bgStyle.border = new RectOffset(r, r, r, r);");
        sb.AppendLine("                    _bgStyle.normal.background = nineTex;");
        sb.AppendLine("                    GUI.backgroundColor = c.BgColor;");
        sb.AppendLine("                    GUI.Box(rect, \"\", _bgStyle);");
        sb.AppendLine("                }");
        sb.AppendLine("                else");
        sb.AppendLine("                {");
        sb.AppendLine("                    var fillTex = GetTex(c.BgColor);");
        sb.AppendLine("                    GUI.DrawTexture(rect, fillTex);");
        sb.AppendLine("                }");
        sb.AppendLine();
        sb.AppendLine("                // Draw stroke border");
        sb.AppendLine("                if (c.StrokeWidth > 0)");
        sb.AppendLine("                {");
        sb.AppendLine("                    var strokeTex = GetTex(c.StrokeColor);");
        sb.AppendLine("                    float t = c.StrokeWidth * sc;");
        sb.AppendLine("                    GUI.DrawTexture(new Rect(rect.x, rect.y, rect.width, t), strokeTex);");
        sb.AppendLine("                    GUI.DrawTexture(new Rect(rect.x, rect.yMax - t, rect.width, t), strokeTex);");
        sb.AppendLine("                    GUI.DrawTexture(new Rect(rect.x, rect.y, t, rect.height), strokeTex);");
        sb.AppendLine("                    GUI.DrawTexture(new Rect(rect.xMax - t, rect.y, t, rect.height), strokeTex);");
        sb.AppendLine("                }");
        sb.AppendLine();
        sb.AppendLine("                // Setup style");
        sb.AppendLine("                _labelStyle.fontSize = Mathf.RoundToInt(c.FontSize * sc);");
        sb.AppendLine("                _labelStyle.normal.textColor = c.TextColor;");
        sb.AppendLine();
        sb.AppendLine("                if (c.Type == \"button\")");
        sb.AppendLine("                    _pressed[c.Id] = GUI.Button(rect, c.Text, _labelStyle);");
        sb.AppendLine("                else if (c.Type == \"textfield\")");
        sb.AppendLine("                    c.TextFieldText = GUI.TextField(rect, c.TextFieldText, _labelStyle);");
        sb.AppendLine("                else if (c.Type == \"toggle\")");
        sb.AppendLine("                    c.ToggleState = GUI.Toggle(rect, c.ToggleState, c.Text, _labelStyle);");
        sb.AppendLine();
        sb.AppendLine("                GUI.color = oldColor;");
        sb.AppendLine("            }");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        static Texture2D GetNineSliceTex(float radius)");
        sb.AppendLine("        {");
        sb.AppendLine("            int r = Mathf.RoundToInt(radius);");
        sb.AppendLine("            int size = r * 2 + 4; // 9-slice: corners r×r, edges variable, center 4×4");
        sb.AppendLine("            string key = $\"nine_{size}_r{r}\";");
        sb.AppendLine("            if (_nineSliceTex != null && _nineSliceTex.width == size) return _nineSliceTex;");
        sb.AppendLine("            var tex = new Texture2D(size, size, (TextureFormat)4, false);");
        sb.AppendLine("            tex.hideFlags = (HideFlags)61;");
        sb.AppendLine("            tex.filterMode = (FilterMode)0;");
        sb.AppendLine("            var px = new Color32[size * size];");
        sb.AppendLine("            var white = (Color32)Color.white;");
        sb.AppendLine("            var transparent = new Color32(0, 0, 0, 0);");
        sb.AppendLine("            for (int y = 0; y < size; y++)");
        sb.AppendLine("            {");
        sb.AppendLine("                for (int x = 0; x < size; x++)");
        sb.AppendLine("                {");
        sb.AppendLine("                    bool inCorner = false;");
        sb.AppendLine("                    // TL");
        sb.AppendLine("                    if (x < r && y < r) { float dx = r - 1 - x, dy = r - 1 - y; inCorner = dx*dx + dy*dy <= r*r; }");
        sb.AppendLine("                    // TR");
        sb.AppendLine("                    if (x >= size - r && y < r) { float dx = x - (size - r), dy = r - 1 - y; inCorner = dx*dx + dy*dy <= r*r; }");
        sb.AppendLine("                    // BL");
        sb.AppendLine("                    if (x < r && y >= size - r) { float dx = r - 1 - x, dy = y - (size - r); inCorner = dx*dx + dy*dy <= r*r; }");
        sb.AppendLine("                    // BR");
        sb.AppendLine("                    if (x >= size - r && y >= size - r) { float dx = x - (size - r), dy = y - (size - r); inCorner = dx*dx + dy*dy <= r*r; }");
        sb.AppendLine("                    // Edges (between corners)");
        sb.AppendLine("                    bool onEdge = (x >= r && x < size - r && (y < r || y >= size - r)) || (y >= r && y < size - r && (x < r || x >= size - r));");
        sb.AppendLine("                    // Center (transparent)");
        sb.AppendLine("                    if (inCorner || onEdge)");
        sb.AppendLine("                        px[y * size + x] = white;");
        sb.AppendLine("                    else");
        sb.AppendLine("                        px[y * size + x] = transparent;");
        sb.AppendLine("                }");
        sb.AppendLine("            }");
        sb.AppendLine("            tex.SetPixels32(px);");
        sb.AppendLine("            tex.Apply();");
        sb.AppendLine("            _nineSliceTex = tex;");
        sb.AppendLine("            return tex;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        static Texture2D GetTex(Color c)");
        sb.AppendLine("        {");
        sb.AppendLine("            if (_texCache.TryGetValue(c, out var tex)) return tex;");
        sb.AppendLine("            tex = new Texture2D(2, 2, (TextureFormat)4, false);");
        sb.AppendLine("            tex.hideFlags = (HideFlags)61;");
        sb.AppendLine("            tex.filterMode = (FilterMode)0;");
        sb.AppendLine("            var c32 = (Color32)c;");
        sb.AppendLine("            var px = new Color32[] { c32, c32, c32, c32 };");
        sb.AppendLine("            tex.SetPixels32(px);");
        sb.AppendLine("            tex.Apply();");
        sb.AppendLine("            _texCache[c] = tex;");
        sb.AppendLine("            return tex;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        private static float ParseFloat(object val)");
        sb.AppendLine("        {");
        sb.AppendLine("            if (val is float f) return f;");
        sb.AppendLine("            if (val is int i) return i;");
        sb.AppendLine("            if (val is double d) return (float)d;");
        sb.AppendLine("            float.TryParse(val?.ToString() ?? \"0\", out var r); return r;");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        private static Color ParseColor(string s)");
        sb.AppendLine("        {");
        sb.AppendLine("            if (s.StartsWith(\"#\")) s = s.Substring(1);");
        sb.AppendLine("            if (s.Length == 6)");
        sb.AppendLine("            {");
        sb.AppendLine("                int r = int.Parse(s.Substring(0,2), System.Globalization.NumberStyles.HexNumber);");
        sb.AppendLine("                int g = int.Parse(s.Substring(2,2), System.Globalization.NumberStyles.HexNumber);");
        sb.AppendLine("                int b = int.Parse(s.Substring(4,2), System.Globalization.NumberStyles.HexNumber);");
        sb.AppendLine("                return new Color(r/255f, g/255f, b/255f, 1f);");
        sb.AppendLine("            }");
        sb.AppendLine("            return Color.white;");
        sb.AppendLine("        }");
        sb.AppendLine("    }");
        sb.AppendLine("}");
        return sb.ToString();
    }
}
