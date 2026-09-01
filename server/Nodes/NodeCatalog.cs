using CuBlocky.Server.Models;

namespace CuBlocky.Server.Nodes;

// v1 minimal-viable-logic node catalog.
// Add a new game-API call node here (with an EmitTemplate) and it shows up
// in the frontend palette and the compiler handles it generically.
public static class NodeCatalog
{
    private static readonly PinDef EIn = new() { Id = "exec_in", Label = "", Type = PinType.Exec };
    private static readonly PinDef EOut = new() { Id = "exec_out", Label = "", Type = PinType.Exec };

    public static List<NodeDef> All { get; } =
    [
        // ── Events (graph roots) ───────────────────────────────────
        new()
        {
            Id = "event.mod.awake",
            Title = "Mod Awake",
            Category = "Events",
            Kind = NodeKind.Event,
            EventType = "mod.awake",
            Outputs = [EOut with { Id = "exec_out" }],
        },
        new()
        {
            Id = "event.item.onUse",
            Title = "On Item Used",
            Category = "Events",
            Kind = NodeKind.Event,
            EventType = "item.onUse",
            Outputs =
            [
                EOut with { Id = "exec_out" },
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "item", Label = "Item", Type = PinType.Item },
            ],
        },
        new()
        {
            Id = "event.item.onUseLimb",
            Title = "On Item Used (Limb)",
            Category = "Events",
            Kind = NodeKind.Event,
            EventType = "item.onUseLimb",
            Outputs =
            [
                EOut with { Id = "exec_out" },
                new() { Id = "limb", Label = "Limb", Type = PinType.Limb },
                new() { Id = "item", Label = "Item", Type = PinType.Item },
            ],
        },

        // ── Flow control (built-in emitters) ─────────────────────
        new()
        {
            Id = "flow.branch",
            Title = "Branch (if/else)",
            Category = "Flow",
            Kind = NodeKind.Flow,
            Inputs =
            [
                EIn,
                new() { Id = "cond", Label = "Condition", Type = PinType.Bool, HasInlineEditor = false },
            ],
            Outputs =
            [
                new() { Id = "then", Label = "Then", Type = PinType.Exec },
                new() { Id = "else", Label = "Else", Type = PinType.Exec },
            ],
        },
        new()
        {
            Id = "flow.forLoop",
            Title = "For Loop",
            Category = "Flow",
            Kind = NodeKind.Flow,
            Inputs =
            [
                EIn,
                new() { Id = "count", Label = "Count", Type = PinType.Int, HasInlineEditor = true, Default = "1" },
            ],
            Outputs =
            [
                new() { Id = "body", Label = "Body", Type = PinType.Exec },
                new() { Id = "index", Label = "Index", Type = PinType.Int },
            ],
        },
        new()
        {
            Id = "flow.sequence",
            Title = "Sequence",
            Category = "Flow",
            Kind = NodeKind.Flow,
            Inputs = [EIn],
            Outputs =
            [
                new() { Id = "a", Label = "A", Type = PinType.Exec },
                new() { Id = "b", Label = "B", Type = PinType.Exec },
            ],
        },

        // ── Body API (statement nodes) ────────────────────────────
        // Body.Eat(float hungerAmount, float weightGain) — verified signature
        new()
        {
            Id = "body.eat",
            Title = "Body: Eat",
            Category = "Game/Body",
            Kind = NodeKind.Statement,
            EmitTemplate = "{body}.Eat({hunger}f, {weightGain}f);",
            Inputs =
            [
                EIn,
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "hunger", Label = "Hunger", Type = PinType.Float, HasInlineEditor = true, Default = "12" },
                new() { Id = "weightGain", Label = "Weight Gain", Type = PinType.Float, HasInlineEditor = true, Default = "0.5" },
            ],
            Outputs = [EOut],
        },
        // Body.Drink(float amt) — verified
        new()
        {
            Id = "body.drink",
            Title = "Body: Drink",
            Category = "Game/Body",
            Kind = NodeKind.Statement,
            EmitTemplate = "{body}.Drink({amt}f);",
            Inputs =
            [
                EIn,
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "amt", Label = "Amount", Type = PinType.Float, HasInlineEditor = true, Default = "4" },
            ],
            Outputs = [EOut],
        },
        // body.happiness = val
        new()
        {
            Id = "body.setHappiness",
            Title = "Body: Set Happiness",
            Category = "Game/Body",
            Kind = NodeKind.Statement,
            EmitTemplate = "{body}.happiness = {val}f;",
            Inputs =
            [
                EIn,
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "val", Label = "Value", Type = PinType.Float, HasInlineEditor = true, Default = "1" },
            ],
            Outputs = [EOut],
        },
        // body.temperature = val
        new()
        {
            Id = "body.setTemperature",
            Title = "Body: Set Temperature",
            Category = "Game/Body",
            Kind = NodeKind.Statement,
            EmitTemplate = "{body}.temperature = {val}f;",
            Inputs =
            [
                EIn,
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "val", Label = "Value", Type = PinType.Float, HasInlineEditor = true, Default = "0" },
            ],
            Outputs = [EOut],
        },
        // body.talker.Talk(line) — verified
        new()
        {
            Id = "body.talk",
            Title = "Talker: Talk",
            Category = "Game/Body",
            Kind = NodeKind.Statement,
            EmitTemplate = "{body}.talker.Talk({line});",
            Inputs =
            [
                EIn,
                new() { Id = "body", Label = "Body", Type = PinType.Body },
                new() { Id = "line", Label = "Line", Type = PinType.String, HasInlineEditor = true, Default = "Hello" },
            ],
            Outputs = [EOut],
        },

        // ── Item API (statement nodes) ────────────────────────────
        // item.condition = val
        new()
        {
            Id = "item.setCondition",
            Title = "Item: Set Condition",
            Category = "Game/Item",
            Kind = NodeKind.Statement,
            EmitTemplate = "{item}.condition = {val}f;",
            Inputs =
            [
                EIn,
                new() { Id = "item", Label = "Item", Type = PinType.Item },
                new() { Id = "val", Label = "Value", Type = PinType.Float, HasInlineEditor = true, Default = "1" },
            ],
            Outputs = [EOut],
        },

        // ── Sound (statement nodes) ────────────────────────────────
        // Sound.Play(name, body.transform.position)
        new()
        {
            Id = "sound.playBody",
            Title = "Sound: Play (Body pos)",
            Category = "Game/Sound",
            Kind = NodeKind.Statement,
            EmitTemplate = "Sound.Play({sound}, {body}.transform.position);",
            Inputs =
            [
                EIn,
                new() { Id = "sound", Label = "Sound", Type = PinType.String, HasInlineEditor = true, Default = "useItem" },
                new() { Id = "body", Label = "Body", Type = PinType.Body },
            ],
            Outputs = [EOut],
        },
        new()
        {
            Id = "sound.playItem",
            Title = "Sound: Play (Item pos)",
            Category = "Game/Sound",
            Kind = NodeKind.Statement,
            EmitTemplate = "Sound.Play({sound}, {item}.transform.position);",
            Inputs =
            [
                EIn,
                new() { Id = "sound", Label = "Sound", Type = PinType.String, HasInlineEditor = true, Default = "useItem" },
                new() { Id = "item", Label = "Item", Type = PinType.Item },
            ],
            Outputs = [EOut],
        },

        // ── Expression nodes (inline data, no ';') ─────────────────
        new()
        {
            Id = "body.getHappiness",
            Title = "Body: Happiness",
            Category = "Game/Body",
            Kind = NodeKind.Expression,
            EmitTemplate = "{body}.happiness",
            Inputs =
            [
                new() { Id = "body", Label = "Body", Type = PinType.Body },
            ],
            Outputs =
            [
                new() { Id = "val", Label = "Happiness", Type = PinType.Float },
            ],
        },
        new()
        {
            Id = "body.getTemperature",
            Title = "Body: Temperature",
            Category = "Game/Body",
            Kind = NodeKind.Expression,
            EmitTemplate = "{body}.temperature",
            Inputs =
            [
                new() { Id = "body", Label = "Body", Type = PinType.Body },
            ],
            Outputs =
            [
                new() { Id = "val", Label = "Temp", Type = PinType.Float },
            ],
        },
        new()
        {
            Id = "item.getCondition",
            Title = "Item: Condition",
            Category = "Game/Item",
            Kind = NodeKind.Expression,
            EmitTemplate = "{item}.condition",
            Inputs =
            [
                new() { Id = "item", Label = "Item", Type = PinType.Item },
            ],
            Outputs =
            [
                new() { Id = "val", Label = "Cond", Type = PinType.Float },
            ],
        },

        // ── Literals (value stored in Data["value"]) ───────────────
        new()
        {
            Id = "lit.float",
            Title = "Float",
            Category = "Values",
            Kind = NodeKind.Literal,
            Outputs = [new() { Id = "val", Label = "", Type = PinType.Float }],
        },
        new()
        {
            Id = "lit.int",
            Title = "Int",
            Category = "Values",
            Kind = NodeKind.Literal,
            Outputs = [new() { Id = "val", Label = "", Type = PinType.Int }],
        },
        new()
        {
            Id = "lit.string",
            Title = "String",
            Category = "Values",
            Kind = NodeKind.Literal,
            Outputs = [new() { Id = "val", Label = "", Type = PinType.String }],
        },
        new()
        {
            Id = "lit.bool",
            Title = "Bool",
            Category = "Values",
            Kind = NodeKind.Literal,
            Outputs = [new() { Id = "val", Label = "", Type = PinType.Bool }],
        },
    ];

    public static NodeDef? Find(string id) => All.FirstOrDefault(n => n.Id == id);
}
