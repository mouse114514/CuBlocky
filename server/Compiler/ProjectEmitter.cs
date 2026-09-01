using System.Text;
using System.Text.Json;
using CuBlocky.Server.Models;

namespace CuBlocky.Server.Compiler;

// Emits the complete generated mod project as a path→content map.
// M1: Plugin.cs + RegisterContent.cs + .csproj + README. M5: zip download.
public static class ProjectEmitter
{
    public static Dictionary<string, string> EmitProject(Blueprint bp)
    {
        var ns = SafeIdent(bp.Mod.RootNamespace);
        var asmName = SafeIdent(bp.Mod.RootNamespace);
        var guid = bp.Mod.Guid;
        var name = bp.Mod.Name.Replace("\"", "\\\"");
        var ver = bp.Mod.Version;
        var desc = bp.Mod.Description.Replace("\"", "\\\"");
        var hasEvents = !string.IsNullOrWhiteSpace(bp.EventHandlers);

        // Extract register markers from event code
        var (eventCode, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales) = ExtractRegisterMarkers(bp.EventHandlers!);

        var files = new Dictionary<string, string>
        {
            ["Plugin.cs"] = EmitPlugin(ns, guid, name, ver, desc, hasEvents),
            ["RegisterContent.cs"] = CodeEmitter.EmitRegisterContent(bp, registerItems, registerRecipes, registerBuildings, registerTiles, registerLocales),
            [asmName + ".csproj"] = EmitCsproj(asmName, ns),
            ["README.md"] = EmitReadme(name, ver),
        };

        if (hasEvents)
            files["EventHandlers.cs"] = EmitEventHandlers(ns, eventCode);

        return files;
    }

    private static (string eventCode, List<ItemEntry> items, List<RecipeEntry> recipes, List<BuildingEntry> buildings, List<TileEntry> tiles, List<LocaleEntry> locales) ExtractRegisterMarkers(string eventCode)
    {
        var items = new List<ItemEntry>();
        var recipes = new List<RecipeEntry>();
        var buildings = new List<BuildingEntry>();
        var tiles = new List<TileEntry>();
        var locales = new List<LocaleEntry>();
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

        return (string.Join('\n', remainingLines), items, recipes, buildings, tiles, locales);
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

    private static string EmitCsproj(string asmName, string ns)
    {
        // net4.7.2 to match BepInEx 5 / Unity / Mono. CUCoreLib.dll resolved from
        // the game's BepInEx/plugins folder (CCL setup docs convention).
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
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\BepInEx\core\BepInEx.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""0Harmony"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\BepInEx\core\0Harmony.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""CUCoreLib"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\BepInEx\plugins\CUCoreLib.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""Assembly-CSharp"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\CasualtiesUnknown_Data\Managed\Assembly-CSharp.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\CasualtiesUnknown_Data\Managed\UnityEngine.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.CoreModule"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\CasualtiesUnknown_Data\Managed\UnityEngine.CoreModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include=""UnityEngine.AudioModule"">
      <HintPath>C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\CasualtiesUnknown_Data\Managed\UnityEngine.AudioModule.dll</HintPath>
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
