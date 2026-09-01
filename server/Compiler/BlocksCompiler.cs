using System.Text;
using CuBlocky.Server.Models;

namespace CuBlocky.Server.Compiler;

// Compiles Scratch-style block trees into C# code.
// Each block type maps to a C# statement or control-flow construct.
public static class BlocksCompiler
{
    // Block type → C# emit templates.
    // {param} placeholders are replaced by block.Params values.
    // Context variables (body/item/limb) are replaced by the caller.
    private static readonly Dictionary<string, string> Templates = new()
    {
        // Body API
        ["eat"]             = "BODY.Eat({hunger}f, {weightGain}f);",
        ["drink"]           = "BODY.Drink({amt}f);",
        ["setHappiness"]    = "BODY.happiness = {val}f;",
        ["setTemperature"]  = "BODY.temperature = {val}f;",
        ["talk"]            = "BODY.talker.Talk({line});",
        // Item API
        ["setCondition"]    = "ITEM.condition = {val}f;",
        // Sound API
        ["soundPlayBody"]   = "Sound.Play({sound}, BODY.transform.position);",
        ["soundPlayItem"]   = "Sound.Play({sound}, ITEM.transform.position);",
    };

    public static string Compile(List<BlockNode> blocks, string indent = "                    ",
        string bodyVar = "body", string itemVar = "item")
    {
        var sb = new StringBuilder();
        EmitBlocks(blocks, sb, indent, bodyVar, itemVar);
        return sb.ToString();
    }

    private static void EmitBlocks(List<BlockNode> blocks, StringBuilder sb, string indent,
        string bodyVar, string itemVar)
    {
        foreach (var b in blocks)
            EmitBlock(b, sb, indent, bodyVar, itemVar);
    }

    private static void EmitBlock(BlockNode b, StringBuilder sb, string indent,
        string bodyVar, string itemVar)
    {
        switch (b.Type)
        {
            case "branch":
                EmitBranch(b, sb, indent, bodyVar, itemVar);
                break;
            case "forLoop":
                EmitForLoop(b, sb, indent, bodyVar, itemVar);
                break;
            default:
                EmitStatement(b, sb, indent, bodyVar, itemVar);
                break;
        }
    }

    private static void EmitStatement(BlockNode b, StringBuilder sb, string indent,
        string bodyVar, string itemVar)
    {
        if (!Templates.TryGetValue(b.Type, out var tpl))
        {
            sb.AppendLine(indent + $"// [unknown block: {b.Type}]");
            return;
        }

        var line = tpl;
        // Replace context variables first
        line = line.Replace("BODY", bodyVar);
        line = line.Replace("ITEM", itemVar);
        // Replace block params
        foreach (var kv in b.Params)
        {
            var val = kv.Value;
            if (IsStringParam(b.Type, kv.Key))
                val = Quote(val);
            line = line.Replace("{" + kv.Key + "}", val);
        }

        sb.AppendLine(indent + line);
    }

    private static void EmitBranch(BlockNode b, StringBuilder sb, string indent,
        string bodyVar, string itemVar)
    {
        var cond = b.Params.GetValueOrDefault("cond", "true");
        sb.AppendLine(indent + $"if ({cond})");
        sb.AppendLine(indent + "{");
        EmitBlocks(b.Children, sb, indent + "    ", bodyVar, itemVar);
        sb.AppendLine(indent + "}");
    }

    private static void EmitForLoop(BlockNode b, StringBuilder sb, string indent,
        string bodyVar, string itemVar)
    {
        var count = b.Params.GetValueOrDefault("count", "1");
        sb.AppendLine(indent + $"for (int __i = 0; __i < {count}; __i++)");
        sb.AppendLine(indent + "{");
        EmitBlocks(b.Children, sb, indent + "    ", bodyVar, itemVar);
        sb.AppendLine(indent + "}");
    }

    private static bool IsStringParam(string blockType, string paramId)
    {
        return (blockType == "talk" && paramId == "line")
            || (blockType == "soundPlayBody" && paramId == "sound")
            || (blockType == "soundPlayItem" && paramId == "sound");
    }

    private static string Quote(string s) => $"\"{s.Replace("\\", "\\\\").Replace("\"", "\\\"")}\"";
}
