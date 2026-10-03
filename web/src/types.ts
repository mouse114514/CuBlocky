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

// ── Function definitions ──
export interface ParamDef {
  name: string;
  type: string;
}

export interface FunctionDef {
  name: string;
  returnType: string;
  params: ParamDef[];
  body: string;
}

// ── UI Control ──
export type UIControlType =
  | 'button' | 'textfield' | 'toggle'
  | 'label' | 'box' | 'image'
  | 'slider' | 'progressbar' | 'dropdown';

export interface UIControl {
  id: string;
  type: UIControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
  opacity: number;
  visible: boolean;
  /** image: embedded sprite name */
  sprite?: string;
  /** slider/progressbar: current value */
  value?: number;
  min?: number;
  max?: number;
  /** progressbar: fill color */
  fillColor?: string;
  /** dropdown: '|' separated options */
  options?: string;
  /** text alignment */
  alignH?: 'left' | 'center' | 'right';
  alignV?: 'top' | 'center' | 'bottom';
}

// ── Creature (registered via blocks) ──
export interface CreatureEntry {
  id: string;
  name: string;
  desc: string;
  spriteAssetId?: string | null;
  health: number;
}

// ── Animation registration (sprite sheet -> frames) ──
export interface AnimationEntry {
  id: string;
  sheetAssetId?: string | null;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
}

// ── Blueprint root ──
export interface Blueprint {
  mod: ModMeta;
  items: ItemEntry[];
  recipes: RecipeEntry[];
  assets: AssetRef[];
  functions?: FunctionDef[];
  eventHandlers?: string;
  eventHandlersXml?: string;
  uiControls?: UIControl[];
}

// ── Project naming ──
// Rule (shared with the server): anything Windows allows in a file name is
// allowed here. Only the characters the filesystem rejects are blocked:
// control chars (U+0000–U+001F, U+007F) and < > : " / \ | ? *
// Chinese and other non-ASCII names are fine.
// The name is reused verbatim for the project folder and the DLL name; the
// C# namespace is a C#-identifier-safe rendering of the same name.
export const PROJECT_NAME_MAX = 60;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
const ILLEGAL_RE = /[<>:"/\\|?*]/;
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

export function isValidProjectName(s: string): boolean {
  if (!s || s.length > PROJECT_NAME_MAX) return false;
  if (s === '.' || s === '..') return false;
  // Windows silently strips trailing spaces and dots, which would rename the folder.
  if (s.trim() !== s || s.endsWith('.')) return false;
  if (CONTROL_RE.test(s) || ILLEGAL_RE.test(s)) return false;
  return !RESERVED_NAMES.includes(s.toUpperCase());
}

// Coerce any string (legacy or hand-edited project) into a valid project name.
export function sanitizeProjectName(s: string): string {
  let t = String(s || '')
    .replace(ILLEGAL_RE, '_')
    .replace(CONTROL_RE, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .trim()
    .replace(/\.+$/, '');
  if (!t || t === '.' || t === '..') t = 'MyMod';
  if (t.length > PROJECT_NAME_MAX) t = t.slice(0, PROJECT_NAME_MAX).trim().replace(/\.+$/, '');
  if (RESERVED_NAMES.includes(t.toUpperCase())) t = 'M' + t;
  return t;
}

// ── Defaults ──
export function defaultBlueprint(): Blueprint {
  return {
    mod: {
      guid: 'com.example.mymod',
      name: 'MyMod',
      version: '1.0.0',
      author: '',
      description: '',
      rootNamespace: 'MyMod',
    },
    items: [],
    recipes: [],
    assets: [],
    functions: [],
    uiControls: [],
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
