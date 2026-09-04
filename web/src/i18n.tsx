import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const dict = {
  // ── App chrome ──
  'app.title':         { zh: 'CuBlocky', en: 'CuBlocky' },
  'app.open':          { zh: '打开 .cbp', en: 'Open .cbp' },
  'app.save':          { zh: '保存(本地)', en: 'Save (local)' },
  'app.saveAs':        { zh: '另存为 .cbp', en: 'Save As .cbp' },
  'app.build':         { zh: '构建 DLL', en: 'Build DLL' },
  'app.building':      { zh: '构建中...', en: 'Building...' },
  'app.buildOk':       { zh: '构建成功', en: 'Build Succeeded' },
  'app.buildFail':     { zh: '构建失败', en: 'Build Failed' },
  'app.dllPath':       { zh: 'DLL 路径', en: 'DLL Path' },
  'app.buildDir':      { zh: '工程目录', en: 'Build Directory' },
  'app.close':         { zh: '关闭', en: 'Close' },
  'app.lang':          { zh: 'English', en: '中文' },
  'app.newProject':    { zh: '新建项目', en: 'New Project' },
  'app.openProject':   { zh: '打开项目', en: 'Open Project' },
  'app.subtitle':      { zh: 'Casualties Unknown 模组编辑器', en: 'Casualties Unknown Mod Editor' },

  // ── Sidebar ──
  'side.mod':          { zh: '模组', en: 'Mod' },
  'side.items':        { zh: '物品', en: 'Items' },
  'side.recipes':      { zh: '配方', en: 'Recipes' },
  'side.blocks':       { zh: '积木行为', en: 'Block Behavior' },

  // ── Mod form ──
  'mod.guid':          { zh: '模组 GUID', en: 'Mod GUID' },
  'mod.name':          { zh: '模组名称', en: 'Mod Name' },
  'mod.version':       { zh: '版本', en: 'Version' },
  'mod.author':        { zh: '作者', en: 'Author' },
  'mod.desc':          { zh: '描述', en: 'Description' },
  'mod.namespace':     { zh: 'C# 命名空间', en: 'C# Root Namespace' },
  'mod.guidHint':      { zh: '反向域名格式,如 com.yourName.modName', en: 'Reverse-domain format, e.g. com.yourName.modName' },

  // ── Item form ──
  'item.id':           { zh: '物品 ID', en: 'Item ID' },
  'item.fullName':     { zh: '显示名称', en: 'Display Name' },
  'item.desc':         { zh: '描述', en: 'Description' },
  'item.category':     { zh: '分类', en: 'Category' },
  'item.weight':       { zh: '重量', en: 'Weight' },
  'item.value':        { zh: '价值', en: 'Value' },
  'item.decay':        { zh: '腐烂时间(分钟)', en: 'Decay Minutes' },
  'item.recognition':  { zh: '识别值', en: 'Recognition' },
  'item.spawnFreq':    { zh: '生成频率', en: 'Spawn Frequency' },
  'item.tags':         { zh: '标签(逗号分隔)', en: 'Tags (comma-separated)' },
  'item.usable':       { zh: '可使用', en: 'Usable' },
  'item.usableLimb':   { zh: '可对肢体使用', en: 'Usable on Limb' },
  'item.onUseHint':    { zh: '切换到"使用行为"积木画布编辑效果', en: 'Switch to "On Use" blocks canvas to edit behavior' },
  'item.onUseLimbHint':{ zh: '切换到"肢体使用行为"积木画布编辑效果', en: 'Switch to "On Use Limb" blocks canvas to edit behavior' },
  'item.delete':       { zh: '删除物品', en: 'Delete Item' },
  'item.spriteHint':   { zh: '贴图名称: 自动生成为 {id}.png', en: 'Sprite name: auto-generated as {id}.png' },

  // ── Recipe form ──
  'recipe.result':     { zh: '产出物品 ID', en: 'Result Item ID' },
  'recipe.category':   { zh: '分类', en: 'Category' },
  'recipe.int':        { zh: '智力需求', en: 'INT Requirement' },
  'recipe.amount':     { zh: '数量', en: 'Amount' },
  'recipe.condition':  { zh: '耐久', en: 'Condition' },
  'recipe.liquid':     { zh: '液体产出', en: 'Liquid Result' },
  'recipe.ingredients':{ zh: '材料', en: 'Ingredients' },
  'recipe.mode':       { zh: '模式', en: 'Mode' },
  'recipe.specific':   { zh: '指定 ID', en: 'Specific ID' },
  'recipe.quality':    { zh: '工艺品质', en: 'Crafting Quality' },
  'recipe.id':         { zh: 'ID', en: 'ID' },
  'recipe.amount2':    { zh: '数量/最低耐久', en: 'Amount / Min Condition' },
  'recipe.isLiquid':   { zh: '液体', en: 'Liquid' },
  'recipe.consume':    { zh: '消耗', en: 'Consume' },
  'recipe.add':        { zh: '+ 添加材料', en: '+ Add Ingredient' },
  'recipe.delete':     { zh: '删除配方', en: 'Delete Recipe' },

  // ── Block editor ──
  'block.canvas':      { zh: '积木画布', en: 'Blocks Canvas' },
  'block.palette':     { zh: '积木库', en: 'Block Palette' },
  'block.add':         { zh: '添加', en: 'Add' },
  'block.delete':      { zh: '删除', en: 'Delete' },
  'block.moveUp':      { zh: '上移', en: 'Move Up' },
  'block.moveDown':    { zh: '下移', en: 'Move Down' },
  'block.indent':      { zh: '缩进', en: 'Indent' },
  'block.outdent':     { zh: '取消缩进', en: 'Outdent' },
  'block.empty':       { zh: '暂无积木，从左侧积木库拖入', en: 'No blocks yet. Click a block in the palette to add.' },

  // ── Tabs ──
  'tab.props':         { zh: '属性', en: 'Properties' },
  'tab.onUse':         { zh: '使用行为', en: 'On Use' },
  'tab.onUseLimb':     { zh: '肢体使用行为', en: 'On Use Limb' },

  // ── Block categories ──
  'cat.body':          { zh: '身体', en: 'Body' },
  'cat.item':          { zh: '物品', en: 'Item' },
  'cat.sound':         { zh: '音效', en: 'Sound' },
  'cat.flow':          { zh: '流程控制', en: 'Flow Control' },
  'cat.values':        { zh: '值', en: 'Values' },

  // ── Block names ──
  'block.eat':              { zh: '吃 (饥饿, 体重增益)', en: 'Eat (hunger, weightGain)' },
  'block.drink':            { zh: '喝水 (量)', en: 'Drink (amount)' },
  'block.setHappiness':     { zh: '设置 快乐度', en: 'Set Happiness' },
  'block.setTemperature':   { zh: '设置 体温', en: 'Set Temperature' },
  'block.talk':             { zh: '说话 (文本)', en: 'Talk (text)' },
  'block.setCondition':     { zh: '设置 物品耐久', en: 'Set Item Condition' },
  'block.soundPlayBody':    { zh: '播放音效 (身体位置)', en: 'Play Sound (body pos)' },
  'block.soundPlayItem':    { zh: '播放音效 (物品位置)', en: 'Play Sound (item pos)' },
  'block.branch':           { zh: '如果...否则...', en: 'If...Else...' },
  'block.forLoop':          { zh: '重复 N 次', en: 'Repeat N Times' },
  'block.sequence':         { zh: '顺序执行', en: 'Sequence' },
  'block.valFloat':         { zh: '数字', en: 'Number' },
  'block.valString':        { zh: '文本', en: 'Text' },
  'block.valBool':          { zh: '布尔值', en: 'Boolean' },

  // ── Code preview ──
  'code.register':     { zh: 'RegisterContent.cs', en: 'RegisterContent.cs' },
  'code.project':      { zh: '完整工程', en: 'Project Files' },
  'code.exportCs':     { zh: '导出 .cs', en: 'Export .cs' },
  'code.exportAll':    { zh: '导出全部', en: 'Export All' },
  'code.compiling':    { zh: '编译中...', en: 'compiling...' },
  'code.empty':        { zh: '添加物品或配方后预览', en: 'Add items or recipes to preview' },
  'code.toggle':       { zh: '查看代码', en: 'View Code' },
} as const;

type DictKey = keyof typeof dict;

interface I18nCtx {
  lang: Lang;
  t: (key: string, params?: Record<string, string>) => string;
  toggle: () => void;
}

const Ctx = createContext<I18nCtx>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('cublocky-lang') as Lang) || 'zh';
  });
  const toggle = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('cublocky-lang', next);
  };
  const t = (key: string, params?: Record<string, string>) => {
    const entry = dict[key as DictKey];
    let s: string = entry?.[lang] ?? entry?.['en'] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
    }
    return s;
  };
  return <Ctx.Provider value={{ lang, t, toggle }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }
