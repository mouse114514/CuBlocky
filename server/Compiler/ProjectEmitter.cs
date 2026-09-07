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

        // Extract register markers from event code
        var (eventCode, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales, registerLiquids) = ExtractRegisterMarkers(bp.EventHandlers!);

        var gPath = gamePath ?? DefaultGamePath;

        var files = new Dictionary<string, string>
        {
            ["Plugin.cs"] = EmitPlugin(ns, guid, name, ver, desc, hasEvents),
            ["RegisterContent.cs"] = CodeEmitter.EmitRegisterContent(bp, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales, registerLiquids),
            [asmName + ".csproj"] = EmitCsproj(asmName, ns, gPath),
            ["README.md"] = EmitReadme(name, ver),
        };

        if (hasEvents)
            files["EventHandlers.cs"] = EmitEventHandlers(ns, eventCode);

        return files;
    }

    private static (string eventCode, List<ItemEntry> items, List<RecipeEntry> recipes, List<BuildingEntry> buildings, List<TileEntry> tiles, List<LocaleEntry> locales, List<LiquidEntry> liquids) ExtractRegisterMarkers(string eventCode)
    {
        var items = new List<ItemEntry>();
        var recipes = new List<RecipeEntry>();
        var buildings = new List<BuildingEntry>();
        var tiles = new List<TileEntry>();
        var locales = new List<LocaleEntry>();
        var liquids = new List<LiquidEntry>();
        var itemProps = new List<(string id, JsonElement json)>();
        var liquidFlags = new Dictionary<string, JsonElement>();
        var itemUseActions = new Dictionary<string, string>();
        var itemLimbUseActions = new Dictionary<string, string>();
        var remainingLines = new List<string>();

        var lines = eventCode.Split('\n');
        string capturingItemUse = null;
        var itemUseBody = new System.Text.StringBuilder();

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

        return (string.Join('\n', remainingLines), items, recipes, buildings, tiles, locales, liquids);
    }

    // Strip quotes from JSON string values; pass through numbers/booleans as-is.
    static string Raw(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.String)
            return el.GetString() ?? "";
        return el.GetRawText();
    }

    private static string EmitPlugin(string ns, string guid, string name, string ver, string desc, bool hasEvents)
    {
        var patchLine = hasEvents ? "            EventHandlers.Init(Logger);\n            Harmony.CreateAndPatchAll(typeof(EventHandlers), ModGUID);\n" : "";
    return $@"// AUTO-GENERATED by CuBlocky. Do not edit by hand.
using BepInEx;
using BepInEx.Logging;
using HarmonyLib;
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
            RegisterContent.RegisterAll();
{patchLine}            Logger.LogInfo($""{name} v{ver} loaded."");
        }}
    }}
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

    private static string EmitEventHandlers(string ns, string eventCode)
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
                            sb.AppendLine("        private static readonly System.Collections.Generic.HashSet<int> _patchedBodies = new();");
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
                                        sb.AppendLine(indent + "var _go = " + trimmed.TrimEnd(';') + ";");
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
}
