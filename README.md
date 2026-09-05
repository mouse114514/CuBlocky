# CuBlocky

A Scratch-style visual block editor for creating [Casualties Unknown](https://store.steampowered.com/app/3185410/Casualties_Unknown/) mods. Design item behavior, recipes, and event handlers using drag-and-drop blocks, then compile directly into a BepInEx plugin DLL.

## Features

- **Visual Block Editor** — Scratch-inspired block programming with 100+ blocks across 12 categories
- **Item Definition** — Register custom items with properties, sprites, and use behavior
- **Recipe System** — Define crafting recipes with ingredients and conditions
- **Event Handlers** — Hook into game events (awake, update, hurt, die, pick up, etc.)
- **Item Use Behavior** — Define what happens when items are used via `cu_define_item_use` and `cu_define_item_limb_use` blocks
- **One-Click Build** — Compiles to a deployable DLL with all assets embedded
- **Blueprint System** — Save/load entire mod designs as `.cbp` files
- **Auto-Save** — Workspace state persisted to localStorage

## Requirements

- .NET 9 SDK — https://dotnet.microsoft.com/download/dotnet/9.0
- Node.js 18+ — https://nodejs.org/
- [BepInEx 5](https://github.com/BepInEx/BepInEx) installed in Casualties Unknown
- [CUCoreLib](https://github.com/jimmyking9999999/CUCoreLib) (`net.cucorelib`) installed as a BepInEx plugin

## Build & Run (Windows)

```bash
# 1. Clone or extract the source code
git clone https://github.com/mouse114514/CuBlocky.git
cd CuBlocky

# 2. Install frontend dependencies and build
cd web
npm install
npm run build
cd ..

# 3. Build the server
dotnet build server/server.csproj -c Release

# 4. Run the server
dotnet run --project server/server.csproj -c Release --urls http://localhost:5099
```

Open your browser and go to `http://localhost:5099`.

## Usage

1. Define mod metadata (name, GUID, version)
2. Register items using `cu_register_item` block
3. Define item use behavior using `cu_define_item_use` block (drag `cu_eat`, `cu_drink`, etc. inside)
4. Add recipes with `cu_register_recipe`
5. Optionally add event handlers in the Events category
6. Click **Build** to compile
7. Copy the DLL from `builds/<ModName>/bin/Release/net4.7.2/<ModName>.dll` to `BepInEx/plugins/`

## Block Categories

| Category | Description |
|----------|-------------|
| Events | Hook into game lifecycle (awake, update, hurt, die, item used) |
| Register | Define items, recipes, buildings, tiles, locale strings |
| Body | Player body actions (eat, drink, set stats, talk) |
| Item | Modify item properties (condition, weight, value) |
| World | Spawn items, get/set tiles, search blocks |
| Control | If/else, loops, comparisons |
| Math | Arithmetic, random, trigonometry |
| Variables | Set/get custom variables |
| String | Text manipulation |
| List | Array operations |

## Item Use Behavior

The `cu_define_item_use` and `cu_define_item_limb_use` blocks are event-style hat blocks that define what happens when an item is used. Drag body action blocks (`cu_eat`, `cu_drink`, `cu_set_happiness`, etc.) inside to create the use effect.

```
cu_define_item_use [myItem]
  ├── cu_eat (12, 0.5)
  ├── cu_set_happiness (10)
  └── cu_talk ("Thanks!")
```

This generates a `useAction` delegate in the item's registration code.

## Project Structure

```
CuBlocky/
├── server/                 # .NET 9 backend
│   ├── Compiler/
│   │   ├── CodeEmitter.cs      # C# code generation
│   │   ├── ProjectEmitter.cs   # Project file generation
│   │   └── BlocksCompiler.cs   # Build orchestration
│   ├── Models/
│   │   └── Blueprint.cs        # Data models
│   └── Program.cs              # Kestrel server + API
├── web/                    # Vite + React frontend
│   └── src/
│       ├── blocklySetup.ts     # Block definitions + generators
│       ├── components/
│       │   ├── BlockEditor.tsx  # Blockly workspace
│       │   ├── ItemForm.tsx     # Item editor with tabs
│       │   └── RecipeForm.tsx   # Recipe editor
│       └── types.ts            # TypeScript interfaces
├── LICENSE                 # MPL 2.0
└── README.md
```

## License

[Mozilla Public License 2.0](LICENSE)
