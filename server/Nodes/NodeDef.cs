using System.Text.Json.Serialization;

namespace CuBlocky.Server.Nodes;

// Pin type system. `exec` = control-flow pin; rest are data pins.
public enum PinType
{
    Exec,
    Float,
    Int,
    String,
    Bool,
    Body,
    Item,
    Limb,
}

public record class PinDef
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public PinType Type { get; set; }
    // Optional default literal value (for data input pins)
    public string? Default { get; set; }
    // For data pins: if true, the value comes from a literal/control on the node
    // (frontend renders an inline editor); otherwise it must be wired.
    public bool HasInlineEditor { get; set; }
}

public enum NodeKind
{
    Event,      // root node, no exec-in; built-in emitter
    Flow,       // control flow (branch/forLoop/sequence); built-in emitter
    Statement,  // void call with exec in/out; EmitTemplate emits a statement
    Expression,  // pure data out; EmitTemplate emits an inline expression (no ';')
    Literal,    // data out; value stored in Data["value"], typed by output pin
}

public class NodeDef
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public NodeKind Kind { get; set; } = NodeKind.Statement;
    public List<PinDef> Inputs { get; set; } = new();
    public List<PinDef> Outputs { get; set; } = new();
    // For Statement/Expression nodes: C# emit template with {pinId} placeholders.
    // null = built-in emitter in compiler (event/flow-control).
    public string? EmitTemplate { get; set; }
    // Event root flag (Kind==Event): which event type (mod.awave/item.onUse/...).
    public string? EventType { get; set; }
}

public class CatalogExport
{
    public List<NodeDef> Nodes { get; set; } = new();
    public List<string> PinTypes { get; set; } = new() { "exec", "float", "int", "string", "bool", "body", "item", "limb" };
}
