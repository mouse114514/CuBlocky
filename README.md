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

You need to install two things before CuBlocky will work. **Don't skip any step.**

### 1. Install .NET 9 SDK

CuBlocky needs the .NET SDK to compile your mod into a DLL. This is a **build tool** — it runs on your computer, not in the game.

**Step-by-step:**

1. Go to https://dotnet.microsoft.com/download/dotnet/9.0
2. Under **"Run apps"**, find the section for **Windows** (if you're on Windows)
3. Click the **"x64"** download link under **SDK** — this downloads a file like `dotnet-sdk-9.0.xxx-win-x64.exe`
4. Run the downloaded `.exe` file, click **Install**, and wait for it to finish
5. **Close and reopen** your terminal (Command Prompt or PowerShell) so the `dotnet` command becomes available
6. Verify it worked: open a new terminal and type `dotnet --version`. You should see something like `9.0.xxx`. If you see `"dotnet is not recognized"`, the install didn't work or you didn't restart the terminal.

> **Why .NET SDK?** CuBlocky generates C# code from your blocks, then uses `dotnet build` to compile it into a DLL that BepInEx can load. Without the SDK, the "Build" button won't work.

### 2. Install Node.js 18+

Node.js is needed to build the CuBlocky web interface.

**Step-by-step:**

1. Go to https://nodejs.org/
2. Download the **LTS** (Long Term Support) version — the big green button
3. Run the installer, click **Next** through everything (default settings are fine)
4. **Close and reopen** your terminal
5. Verify: type `node --version`. You should see `v18.x.x` or higher.

### 3. Install BepInEx 5 in Casualties Unknown

BepInEx is a mod loader that lets mods run in the game.

1. Go to https://github.com/BepInEx/BepInEx/releases
2. Download `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.xxx.zip` (the latest stable release for Windows)
3. Extract the zip into your game folder: `C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\`
4. Launch the game once, then close it. BepInEx will generate its folders automatically.
5. Verify: you should see a `BepInEx/plugins/` folder in your game directory.

### 4. Install CUCoreLib

CUCoreLib is a shared library that CuBlocky-generated mods depend on.

1. Go to https://github.com/jimmyking9999999/CUCoreLib/releases
2. Download the latest `CUCoreLib.dll`
3. Copy it into `C:\Program Files (x86)\Steam\steamapps\common\Casualties Unknown Demo\BepInEx\plugins\`

## Build & Run (Windows)

### Step 1: Get the source code

Download or clone the CuBlocky source code to any folder on your computer.

```bash
git clone https://github.com/mouse114514/CuBlocky.git
cd CuBlocky
```

Or download the ZIP from GitHub and extract it.

### Step 2: Build the web interface

Open a terminal (Command Prompt or PowerShell) in the CuBlocky folder:

```bash
cd web
npm install        # downloads dependencies (first time only, takes ~1 minute)
npm run build      # builds the frontend
cd ..
```

You should see a green "built in X.XXs" message. If you see red errors, check that Node.js is installed correctly.

### Step 3: Build the server

```bash
dotnet build server/server.csproj -c Release
```

You should see `Build succeeded` with 0 errors. If you see `"dotnet is not recognized"`, you didn't install .NET SDK or didn't restart your terminal.

### Step 4: Run CuBlocky

```bash
dotnet run --project server/server.csproj -c Release --urls http://localhost:5099
```

Open your browser and go to `http://localhost:5099`. You should see the CuBlocky editor.

### Step 5: Build your mod

In the CuBlocky editor, design your mod using blocks, then click the **Build** button. If everything is set up correctly, it will compile your mod into a DLL.

**If you see "Build Failed" with "The system cannot find the file specified":**
- This means `dotnet` is not installed or not in your PATH
- Close your terminal, reopen it, and type `dotnet --version` to verify
- If it still doesn't work, reinstall .NET SDK from step 1 above and make sure to restart your terminal

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
├── LICENSE                 # MIT
└── README.md
```

## License

[MIT License](LICENSE)
