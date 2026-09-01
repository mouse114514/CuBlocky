// ── Mod metadata ──
export interface ModMeta {
  guid: string;
  name: string;
  version: string;
  author: string;
  description: string;
  rootNamespace: string;
}

// ── Item ──
export interface ItemEntry {
  id: string;
  fullName: string;
  description: string;
  category: string;
  weight: number;
  value: number;
  tags: string;
  decayMinutes: number;
  recognition: number;
  usable: boolean;
  usableOnLimb: boolean;
  spawnFrequency: number;
  spriteAssetId?: string | null;
  useAction?: string;       // generated C# for onUse
  useActionXml?: string;    // Blockly XML for persistence
  useLimbAction?: string;   // generated C# for onUseLimb
  useLimbActionXml?: string; // Blockly XML for persistence
}

// ── Recipe ──
export interface RecipeIngredient {
  mode: 'specific' | 'quality';
  id: string;
  amount: number;
  isLiquid: boolean;
  destroyItem: boolean;
}

export interface RecipeEntry {
  resultId: string;
  category: string;
  intRequirement: number;
  resultAmount: number;
  resultCondition: number;
  isLiquidResult: boolean;
  ingredients: RecipeIngredient[];
}

// ── Asset ──
export interface AssetRef {
  id: string;
  name: string;
  sourcePath: string;
}

// ── Block (Scratch-style) ──
export interface Block {
  id: string;
  type: string;
  params: Record<string, string>;
  children?: Block[];  // for control-flow blocks (branch, forLoop, sequence)
}

// ── Blueprint root ──
export interface Blueprint {
  mod: ModMeta;
  items: ItemEntry[];
  recipes: RecipeEntry[];
  assets: AssetRef[];
  eventHandlers?: string;
  eventHandlersXml?: string;
}

// ── Defaults ──
export function defaultBlueprint(): Blueprint {
  return {
    mod: {
      guid: 'com.example.mymod',
      name: '我的模组',
      version: '1.0.0',
      author: '',
      description: '',
      rootNamespace: 'MyMod',
    },
    items: [],
    recipes: [],
    assets: [],
  };
}

export function defaultItem(): ItemEntry {
  return {
    id: 'newitem',
    fullName: '新物品',
    description: '',
    category: 'food',
    weight: 0.4,
    value: 1,
    tags: '',
    decayMinutes: 180,
    recognition: 2,
    usable: false,
    usableOnLimb: false,
    spawnFrequency: 1,
    spriteAssetId: null,
    useAction: '',
    useActionXml: '',
    useLimbAction: '',
    useLimbActionXml: '',
  };
}

export function defaultRecipe(): RecipeEntry {
  return {
    resultId: 'stick',
    category: 'Tools',
    intRequirement: 2,
    resultAmount: 1,
    resultCondition: 1,
    isLiquidResult: false,
    ingredients: [
      { mode: 'specific', id: 'glass', amount: 1, isLiquid: false, destroyItem: true },
    ],
  };
}
