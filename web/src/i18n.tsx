import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en' | 'ru';

export const LANG_LABELS: Record<Lang, string> = { zh: '中文', en: 'English', ru: 'Русский' };

const dict = {
  // ── App chrome ──
  'app.title':         { zh: 'CuBlocky', en: 'CuBlocky', ru: 'CuBlocky' },
  'app.open':          { zh: '打开 .cbp', en: 'Open .cbp', ru: 'Открыть .cbp' },
  'app.save':          { zh: '保存(本地)', en: 'Save (local)', ru: 'Сохранить (локально)' },
  'app.saveAs':        { zh: '另存为 .cbp', en: 'Save As .cbp', ru: 'Сохранить как .cbp' },
  'app.build':         { zh: '构建 DLL', en: 'Build DLL', ru: 'Собрать DLL' },
  'app.building':      { zh: '构建中...', en: 'Building...', ru: 'Сборка...' },
  'app.buildOk':       { zh: '构建成功', en: 'Build Succeeded', ru: 'Сборка успешна' },
  'app.buildFail':     { zh: '构建失败', en: 'Build Failed', ru: 'Сборка не удалась' },
  'app.dllPath':       { zh: 'DLL 路径', en: 'DLL Path', ru: 'Путь к DLL' },
  'app.buildDir':      { zh: '工程目录', en: 'Build Directory', ru: 'Каталог сборки' },
  'app.close':         { zh: '关闭', en: 'Close', ru: 'Закрыть' },
  'app.create':        { zh: '创建', en: 'Create', ru: 'Создать' },
  'app.noProjects':    { zh: '暂无项目', en: 'No projects yet', ru: 'Проектов пока нет' },
  'app.placeholder.name': { zh: '请在此处输入项目名称', en: 'Enter project name here', ru: 'Введите имя проекта' },
  'app.placeholder.guid': { zh: '例如 com.author.modname', en: 'e.g. com.author.modname', ru: 'например com.author.modname' },
  'app.placeholder.desc': { zh: '可选，简要说明插件功能', en: 'Optional, brief description', ru: 'Необязательно, краткое описание' },
  'app.lang':          { zh: 'Language', en: 'Language', ru: 'Язык' },
  'app.newProject':    { zh: '新建项目', en: 'New Project', ru: 'Новый проект' },
  'app.openProject':   { zh: '打开项目', en: 'Open Project', ru: 'Открыть проект' },
  'app.subtitle':      { zh: 'Casualties Unknown 模组编辑器', en: 'Casualties Unknown Mod Editor', ru: 'Редактор модов Casualties Unknown' },
  'app.settings':      { zh: '设置', en: 'Settings', ru: 'Настройки' },
  'app.settingsTitle': { zh: '服务器设置', en: 'Server Settings', ru: 'Настройки сервера' },
  'app.gamePath':      { zh: '游戏路径', en: 'Game Path', ru: 'Путь к игре' },
  'app.gamePathDesc':  { zh: 'Casualties Unknown Demo 的安装目录', en: 'Installation directory of Casualties Unknown Demo', ru: 'Каталог установки Casualties Unknown Demo' },
  'app.saveSettings':  { zh: '保存设置', en: 'Save Settings', ru: 'Сохранить настройки' },
  'app.deploy':        { zh: '部署', en: 'Deploy', ru: 'Развернуть' },
  'app.deleteProject': { zh: '删除项目', en: 'Delete Project', ru: 'Удалить проект' },
  'app.deleteConfirm': { zh: '确定删除 {count} 个项目？此操作不可撤销。', en: 'Delete {count} project(s)? This cannot be undone.', ru: 'Удалить {count} проект(ов)? Это нельзя отменить.' },
  'app.selected':      { zh: '已选 {count} 项', en: '{count} selected', ru: '{count} выбрано' },
  'app.splash':        { zh: '闪烁标语', en: 'Splash Text', ru: 'Текст-вспышка' },
  'app.splashDesc':    { zh: '在欢迎页显示随机闪烁标语', en: 'Show random splash text on welcome page', ru: 'Показывать случайный текст-вспышку на главной' },
  'app.importProject': { zh: '导入项目', en: 'Import Project', ru: 'Импортировать проект' },
  'app.importHint':    { zh: '选择 .cbp 文件导入为本地项目', en: 'Choose .cbp files to import as local projects', ru: 'Выберите файлы .cbp для импорта' },
  'app.importing':     { zh: '导入中...', en: 'Importing...', ru: 'Импорт...' },
  'app.importDone':    { zh: '已导入 {count} 个项目', en: 'Imported {count} project(s)', ru: 'Импортировано {count} проект(ов)' },
  'app.importRenamed': { zh: '名称无效,已改为 {name}', en: 'Invalid name, renamed to {name}', ru: 'Недопустимое имя, переименовано в {name}' },
  'app.importBad':     { zh: '无法导入: {names}', en: 'Could not import: {names}', ru: 'Не удалось импортировать: {names}' },

  // ── Sidebar ──
  'side.mod':          { zh: '模组', en: 'Mod', ru: 'Мод' },
  'side.items':        { zh: '物品', en: 'Items', ru: 'Предметы' },
  'side.recipes':      { zh: '配方', en: 'Recipes', ru: 'Рецепты' },
  'side.blocks':       { zh: '积木行为', en: 'Block Behavior', ru: 'Поведение блоков' },

  // ── Mod form ──
  'mod.guid':          { zh: '模组 GUID', en: 'Mod GUID', ru: 'GUID мода' },
  'mod.name':          { zh: '模组名称', en: 'Mod Name', ru: 'Название мода' },
  'mod.version':       { zh: '版本', en: 'Version', ru: 'Версия' },
  'mod.author':        { zh: '作者', en: 'Author', ru: 'Автор' },
  'mod.desc':          { zh: '描述', en: 'Description', ru: 'Описание' },
  'mod.nameHint':      { zh: '项目名用作文件夹名和 DLL 文件名,C# 命名空间自动派生;不可包含 < > : " / \\ | ? * 和控制字符', en: 'Used as the folder name and DLL name; the C# namespace is derived from it. Cannot contain < > : " / \\ | ? * or control characters.', ru: 'Используется как имя папки и имя DLL; пространство имен C# выводится из него. Недопустимы символы < > : " / \\ | ? * и управляющие символы.' },
  'mod.nameInvalid':   { zh: '项目名无效:不可包含 < > : " / \\ | ? * 和控制字符,不可为 . 或 ..,不能以空格或点结尾,最长 60 字符', en: 'Invalid project name: cannot contain < > : " / \\ | ? * or control characters, cannot be . or .., no trailing space or dot, max 60 chars.', ru: 'Недопустимое имя проекта: запрещены < > : " / \\ | ? * и управляющие символы, нельзя . или .., без пробела или точки в конце, макс. 60 символов.' },
  'mod.guidHint':      { zh: '反向域名格式,如 com.yourName.modName', en: 'Reverse-domain format, e.g. com.yourName.modName', ru: 'Формат обратного домена, например com.yourName.modName' },

  // ── Item form ──
  'item.id':           { zh: '物品 ID', en: 'Item ID', ru: 'ID предмета' },
  'item.fullName':     { zh: '显示名称', en: 'Display Name', ru: 'Отображаемое имя' },
  'item.desc':         { zh: '描述', en: 'Description', ru: 'Описание' },
  'item.category':     { zh: '分类', en: 'Category', ru: 'Категория' },
  'item.weight':       { zh: '重量', en: 'Weight', ru: 'Вес' },
  'item.value':        { zh: '价值', en: 'Value', ru: 'Стоимость' },
  'item.decay':        { zh: '腐烂时间(分钟)', en: 'Decay Minutes', ru: 'Время гниения (мин)' },
  'item.recognition':  { zh: '识别值', en: 'Recognition', ru: 'Распознавание' },
  'item.spawnFreq':    { zh: '生成频率', en: 'Spawn Frequency', ru: 'Частота появления' },
  'item.tags':         { zh: '标签(逗号分隔)', en: 'Tags (comma-separated)', ru: 'Теги (через запятую)' },
  'item.usable':       { zh: '可使用', en: 'Usable', ru: 'Используемый' },
  'item.usableLimb':   { zh: '可对肢体使用', en: 'Usable on Limb', ru: 'Используемый на конечности' },
  'item.onUseHint':    { zh: '切换到"使用行为"积木画布编辑效果', en: 'Switch to "On Use" blocks canvas to edit behavior', ru: 'Перейти к блокам "При использовании"' },
  'item.onUseLimbHint':{ zh: '切换到"肢体使用行为"积木画布编辑效果', en: 'Switch to "On Use Limb" blocks canvas to edit behavior', ru: 'Перейти к блокам "На конечности"' },
  'item.delete':       { zh: '删除物品', en: 'Delete Item', ru: 'Удалить предмет' },
  'item.spriteHint':   { zh: '贴图名称: 自动生成为 {id}.png', en: 'Sprite name: auto-generated as {id}.png', ru: 'Имя спрайта: автогенерация {id}.png' },

  // ── Recipe form ──
  'recipe.result':     { zh: '产出物品 ID', en: 'Result Item ID', ru: 'ID результата' },
  'recipe.category':   { zh: '分类', en: 'Category', ru: 'Категория' },
  'recipe.int':        { zh: '智力需求', en: 'INT Requirement', ru: 'Требование ИНТ' },
  'recipe.amount':     { zh: '数量', en: 'Amount', ru: 'Количество' },
  'recipe.condition':  { zh: '耐久', en: 'Condition', ru: 'Состояние' },
  'recipe.liquid':     { zh: '液体产出', en: 'Liquid Result', ru: 'Результат жидкости' },
  'recipe.ingredients':{ zh: '材料', en: 'Ingredients', ru: 'Ингредиенты' },
  'recipe.mode':       { zh: '模式', en: 'Mode', ru: 'Режим' },
  'recipe.specific':   { zh: '指定 ID', en: 'Specific ID', ru: 'Указанный ID' },
  'recipe.quality':    { zh: '工艺品质', en: 'Crafting Quality', ru: 'Качество изготовления' },
  'recipe.id':         { zh: 'ID', en: 'ID', ru: 'ID' },
  'recipe.amount2':    { zh: '数量/最低耐久', en: 'Amount / Min Condition', ru: 'Кол-во / мин. состояние' },
  'recipe.isLiquid':   { zh: '液体', en: 'Liquid', ru: 'Жидкость' },
  'recipe.consume':    { zh: '消耗', en: 'Consume', ru: 'Расход' },
  'recipe.add':        { zh: '+ 添加材料', en: '+ Add Ingredient', ru: '+ Добавить ингредиент' },
  'recipe.delete':     { zh: '删除配方', en: 'Delete Recipe', ru: 'Удалить рецепт' },

  // ── Block editor ──
  'block.canvas':      { zh: '积木画布', en: 'Blocks Canvas', ru: 'Холст блоков' },
  'block.palette':     { zh: '积木库', en: 'Block Palette', ru: 'Палитра блоков' },
  'block.add':         { zh: '添加', en: 'Add', ru: 'Добавить' },
  'block.delete':      { zh: '删除', en: 'Delete', ru: 'Удалить' },
  'block.moveUp':      { zh: '上移', en: 'Move Up', ru: 'Вверх' },
  'block.moveDown':    { zh: '下移', en: 'Move Down', ru: 'Вниз' },
  'block.indent':      { zh: '缩进', en: 'Indent', ru: 'Отступ' },
  'block.outdent':     { zh: '取消缩进', en: 'Outdent', ru: 'Убрать отступ' },
  'block.empty':       { zh: '暂无积木，从左侧积木库拖入', en: 'No blocks yet. Click a block in the palette to add.', ru: 'Блоков нет. Нажмите на блок в палитре.' },

  // ── Tabs ──
  'tab.props':         { zh: '属性', en: 'Properties', ru: 'Свойства' },
  'tab.onUse':         { zh: '使用行为', en: 'On Use', ru: 'При использовании' },
  'tab.onUseLimb':     { zh: '肢体使用行为', en: 'On Use Limb', ru: 'На конечности' },

  // ── Block categories ──
  'cat.body':          { zh: '身体', en: 'Body', ru: 'Тело' },
  'cat.item':          { zh: '物品', en: 'Item', ru: 'Предмет' },
  'cat.sound':         { zh: '音效', en: 'Sound', ru: 'Звук' },
  'cat.flow':          { zh: '流程控制', en: 'Flow Control', ru: 'Управление потоком' },
  'cat.values':        { zh: '值', en: 'Values', ru: 'Значения' },

  // ── Block names ──
  'block.eat':              { zh: '吃 (饥饿, 体重增益)', en: 'Eat (hunger, weightGain)', ru: 'Еда (голод, вес)' },
  'block.drink':            { zh: '喝水 (量)', en: 'Drink (amount)', ru: 'Питьё (количество)' },
  'block.setHappiness':     { zh: '设置 快乐度', en: 'Set Happiness', ru: 'Установить счастье' },
  'block.setTemperature':   { zh: '设置 体温', en: 'Set Temperature', ru: 'Установить температуру' },
  'block.talk':             { zh: '说话 (文本)', en: 'Talk (text)', ru: 'Говорить (текст)' },
  'block.setCondition':     { zh: '设置 物品耐久', en: 'Set Item Condition', ru: 'Установить состояние' },
  'block.soundPlayBody':    { zh: '播放音效 (身体位置)', en: 'Play Sound (body pos)', ru: 'Воспроизвести звук (тело)' },
  'block.soundPlayItem':    { zh: '播放音效 (物品位置)', en: 'Play Sound (item pos)', ru: 'Воспроизвести звук (предмет)' },
  'block.branch':           { zh: '如果...否则...', en: 'If...Else...', ru: 'Если...Иначе...' },
  'block.forLoop':          { zh: '重复 N 次', en: 'Repeat N Times', ru: 'Повторить N раз' },
  'block.sequence':         { zh: '顺序执行', en: 'Sequence', ru: 'Последовательность' },
  'block.valFloat':         { zh: '数字', en: 'Number', ru: 'Число' },
  'block.valString':        { zh: '文本', en: 'Text', ru: 'Текст' },
  'block.valBool':          { zh: '布尔值', en: 'Boolean', ru: 'Логическое' },
  'block.spriteRef':       { zh: '精灵图 %1', en: 'Sprite %1', ru: 'Спрайт %1' },

  // ── Code preview ──
  'code.register':     { zh: 'RegisterContent.cs', en: 'RegisterContent.cs', ru: 'RegisterContent.cs' },
  'code.project':      { zh: '完整工程', en: 'Project Files', ru: 'Файлы проекта' },
  'code.exportCs':     { zh: '导出 .cs', en: 'Export .cs', ru: 'Экспорт .cs' },
  'code.exportAll':    { zh: '导出全部', en: 'Export All', ru: 'Экспорт всего' },
  'code.compiling':    { zh: '编译中...', en: 'compiling...', ru: 'компиляция...' },
  'code.empty':        { zh: '添加物品或配方后预览', en: 'Add items or recipes to preview', ru: 'Добавьте предметы или рецепты для предпросмотра' },
  'code.toggle':       { zh: '查看代码', en: 'View Code', ru: 'Просмотр кода' },

  // ── Asset manager ──
  'asset.manageTitle': { zh: '资源管理', en: 'Asset Manager', ru: 'Управление ресурсами' },
  'asset.pickTitle':   { zh: '选择精灵图', en: 'Pick Sprite', ru: 'Выбрать спрайт' },
  'asset.upload':      { zh: '上传', en: 'Upload', ru: 'Загрузить' },
  'asset.uploading':   { zh: '上传中...', en: 'Uploading...', ru: 'Загрузка...' },
  'asset.files':       { zh: '个文件', en: 'files', ru: 'файлов' },
  'asset.loading':     { zh: '加载中...', en: 'Loading...', ru: 'Загрузка...' },
  'asset.empty':       { zh: '暂无资源，请上传', en: 'No assets. Upload one.', ru: 'Нет ресурсов. Загрузите.' },
  'asset.delete':      { zh: '删除', en: 'Delete', ru: 'Удалить' },
  'asset.generate':    { zh: '生成积木', en: 'Generate Block', ru: 'Создать блок' },
  'asset.selectAll':   { zh: '全选', en: 'Select All', ru: 'Выделить всё' },
  'asset.clearSel':    { zh: '清空选择', en: 'Clear', ru: 'Снять выделение' },
  'asset.selected':    { zh: '已选', en: 'selected', ru: 'выбрано' },
  'asset.merge':       { zh: '合并图表', en: 'Merge Sheet', ru: 'Склеить лист' },
  'asset.merging':     { zh: '合并中...', en: 'Merging...', ru: 'Склейка...' },
  'asset.mergeFailed': { zh: '合并失败', en: 'Merge failed', ru: 'Ошибка склейки' },
  'asset.mergeName':   { zh: '文件名', en: 'File name', ru: 'Имя файла' },
  'asset.mergeHint':   { zh: '点击顺序即为帧顺序（左→右）', en: 'Click order = frame order (left → right)', ru: 'Порядок кликов = порядок кадров (слева направо)' },
  'asset.frameW':      { zh: '帧宽', en: 'Frame W', ru: 'Ширина кадра' },
  'asset.frameH':      { zh: '帧高', en: 'Frame H', ru: 'Высота кадра' },

  // ── Language modal ──
  'lang.title':        { zh: '选择语言', en: 'Select Language', ru: 'Выбрать язык' },
  'lang.firstTitle':   { zh: '请选择语言', en: 'Please Select a Language', ru: 'Пожалуйста, выберите язык' },
  'lang.firstDesc':    { zh: '请选择你要使用的语言。选择完成后，此窗口将不再显示。', en: 'Select the language you want to use. This window will not appear again after selection.', ru: 'Выберите язык, которым вы хотите пользоваться. После выбора это окно не будет появляться вновь.' },
  'lang.firstHint':    { zh: '如需切换语言，请单击右上角的 Language 按钮', en: 'To change the language later, click the Language button in the top-right corner', ru: 'Чтобы позже сменить язык, нажмите кнопку Language в правом верхнем углу' },

  // ── Toolbar guide (spotlight tour) ──
  'guide.help':        { zh: '查看导航栏引导', en: 'Show the toolbar guide', ru: 'Показать справку по панели' },
  'guide.open':        { zh: '打开本地已有的 .cbp 工程文件', en: 'Open a local .cbp project file', ru: 'Открыть локальный проект .cbp' },
  'guide.save':        { zh: '保存至浏览器本地存储与服务器', en: 'Save to local browser storage and the server', ru: 'Сохранить в локальном хранилище браузера и на сервере' },
  'guide.saveAs':      { zh: '将当前工程导出为 .cbp 文件', en: 'Export the current project as a .cbp file', ru: 'Экспортировать текущий проект в файл .cbp' },
  'guide.build':       { zh: '编译为 DLL，并可部署至游戏', en: 'Compile to DLL, and deploy to the game if needed', ru: 'Собрать DLL и при необходимости развернуть его в игру' },
  'guide.search':      { zh: '搜索积木', en: 'Search blocks', ru: 'Поиск блоков' },
  'guide.searchDesc':  { zh: '在左侧控件面板中检索积木', en: 'Search for blocks in the palette on the left', ru: 'Поиск блоков в панели слева' },
  'guide.assets':      { zh: '上传并管理贴图与音频资源', en: 'Upload and manage sprite and audio assets', ru: 'Загрузка и управление спрайтами и звуками' },
  'guide.ui':          { zh: '打开游戏界面编辑器', en: 'Open the UI editor for in-game interface editing', ru: 'Открыть редактор UI для интерфейса игры' },
  'guide.code':        { zh: '查看当前生成的 C# 代码', en: 'View the currently generated C# code', ru: 'Просмотреть сгенерированный код C#' },
  'guide.next':        { zh: '下一步', en: 'Next', ru: 'Далее' },
  'guide.done':        { zh: '完成', en: 'Done', ru: 'Готово' },
  'guide.skip':        { zh: '跳过引导', en: 'Skip the tour', ru: 'Пропустить' },

  // ── UI Editor ──
  'app.uiEditor':      { zh: '界面编辑器', en: 'UI Editor', ru: 'Редактор UI' },
  'app.backToBlocks': { zh: '返回积木', en: 'Back to Blocks', ru: 'К блокам' },
  'ui.palette':        { zh: '控件库', en: 'Controls', ru: 'Элементы' },
  'ui.canvas':         { zh: '画布', en: 'Canvas', ru: 'Холст' },
  'ui.properties':     { zh: '属性', en: 'Properties', ru: 'Свойства' },
  'ui.button':         { zh: '按钮', en: 'Button', ru: 'Кнопка' },
  'ui.textfield':      { zh: '文本框', en: 'Text Field', ru: 'Текстовое поле' },
  'ui.toggle':         { zh: '开关', en: 'Toggle', ru: 'Переключатель' },
  'ui.label':          { zh: '文本标签', en: 'Label', ru: 'Надпись' },
  'ui.box':            { zh: '面板', en: 'Panel', ru: 'Панель' },
  'ui.image':          { zh: '图片', en: 'Image', ru: 'Изображение' },
  'ui.slider':         { zh: '滑条', en: 'Slider', ru: 'Ползунок' },
  'ui.progressbar':    { zh: '进度条', en: 'Progress Bar', ru: 'Индикатор' },
  'ui.dropdown':       { zh: '下拉框', en: 'Dropdown', ru: 'Выпадающий список' },
  'ui.sprite':         { zh: '精灵图', en: 'Sprite', ru: 'Спрайт' },
  'ui.options':        { zh: '选项 (用|分隔)', en: 'Options (sep by |)', ru: 'Опции (через |)' },
  'ui.value':          { zh: '当前值', en: 'Value', ru: 'Значение' },
  'ui.min':            { zh: '最小值', en: 'Min', ru: 'Мин.' },
  'ui.max':            { zh: '最大值', en: 'Max', ru: 'Макс.' },
  'ui.fillColor':      { zh: '填充色', en: 'Fill Color', ru: 'Цвет заливки' },
  'ui.id':             { zh: 'ID', en: 'ID', ru: 'ID' },
  'ui.text':           { zh: '文本', en: 'Text', ru: 'Текст' },
  'ui.position':       { zh: '位置', en: 'Position', ru: 'Позиция' },
  'ui.size':           { zh: '尺寸', en: 'Size', ru: 'Размер' },
  'ui.x':              { zh: 'X', en: 'X', ru: 'X' },
  'ui.y':              { zh: 'Y', en: 'Y', ru: 'Y' },
  'ui.width':          { zh: '宽度', en: 'Width', ru: 'Ширина' },
  'ui.height':         { zh: '高度', en: 'Height', ru: 'Высота' },
  'ui.fontSize':       { zh: '字号', en: 'Font Size', ru: 'Размер шрифта' },
  'ui.textColor':      { zh: '文字颜色', en: 'Text Color', ru: 'Цвет текста' },
  'ui.bgColor':        { zh: '背景色', en: 'Background', ru: 'Фон' },
  'ui.strokeColor':    { zh: '描边色', en: 'Stroke Color', ru: 'Цвет обводки' },
  'ui.strokeWidth':    { zh: '描边宽度', en: 'Stroke Width', ru: 'Толщина обводки' },
  'ui.cornerRadius':  { zh: '圆角', en: 'Corner Radius', ru: 'Радиус угла' },
  'ui.opacity':        { zh: '透明度', en: 'Opacity', ru: 'Прозрачность' },
  'ui.visible':        { zh: '可见', en: 'Visible', ru: 'Видимый' },
  'ui.alignH':         { zh: '水平对齐', en: 'H-Align', ru: 'Гориз.' },
  'ui.alignV':         { zh: '垂直对齐', en: 'V-Align', ru: 'Верт.' },
  'ui.alignLeft':      { zh: '左对齐', en: 'Align Left', ru: 'По левому' },
  'ui.alignCenterH':   { zh: '水平居中', en: 'Center H', ru: 'По центру H' },
  'ui.alignRight':     { zh: '右对齐', en: 'Align Right', ru: 'По правому' },
  'ui.alignTop':       { zh: '顶部对齐', en: 'Align Top', ru: 'По верху' },
  'ui.alignCenterV':   { zh: '垂直居中', en: 'Center V', ru: 'По центру V' },
  'ui.alignBottom':    { zh: '底部对齐', en: 'Align Bottom', ru: 'По низу' },
  'ui.delete':         { zh: '删除控件', en: 'Delete Control', ru: 'Удалить элемент' },
  'ui.duplicate':      { zh: '复制控件', en: 'Duplicate', ru: 'Дублировать' },
  'ui.empty':          { zh: '从左侧拖放控件到画布', en: 'Drag controls from the left to the canvas', ru: 'Перетащите элементы слева на холст' },
  'ui.noSelection':    { zh: '点击控件查看属性', en: 'Click a control to edit its properties', ru: 'Нажмите на элемент для редактирования' },

  // ── Marketplace ──
  'market.title':        { zh: '工程市场', en: 'Marketplace', ru: 'Маркетплейс' },
  'market.sub':          { zh: '浏览和安装社区分享的项目。提交的项目需要人工审核。', en: 'Browse and install community projects. Submissions are reviewed manually.', ru: 'Просмотр и установка проектов сообщества. Отправки проверяются вручную.' },
  'market.search':       { zh: '搜索项目名或作者', en: 'Search by name or author', ru: 'Поиск по имени или автору' },
  'market.staleCache':   { zh: '连不上项目市场，下面显示的是上次保存的列表。', en: 'Marketplace unreachable; showing the last saved list.', ru: 'Не удалось подключиться к магазину; показывается последний сохранённый список.' },
  'market.install':      { zh: '安装', en: 'Install', ru: 'Установить' },
  'market.installing':   { zh: '安装中…', en: 'Installing…', ru: 'Установка…' },
  'market.installed':    { zh: '已安装到 {name} ({count} 个资源)', en: 'Installed to {name} ({count} assets)', ru: 'Установлено в {name} ({count} ресурсов)' },
  'market.submit':       { zh: '提交项目', en: 'Submit project', ru: 'Отправить проект' },
  'market.submitTitle':  { zh: '提交工程', en: 'Submit a project', ru: 'Отправка проекта' },
  'market.submitDesc':   { zh: '选一个服务器上的项目，.cbp、资源和 manifest 更新会一起进 PR。审核的人点合并即发布，无需收尾。', en: 'Pick a project on your server; its .cbp, assets and the manifest update all land in one pull request. A reviewer just clicks merge to publish.', ru: 'Выберите проект на серверe: .cbp, ресурсы и обновление manifest попадают в один pull request. Рецензент просто жмёт Merge.' },
  'market.token':        { zh: 'GitHub token', en: 'GitHub token', ru: 'Токен GitHub' },
  'market.tokenPlaceholder': { zh: 'ghp_… 经典 token', en: 'ghp_… classic token', ru: 'ghp_… классический токен' },
  'market.tokenRequired':  { zh: '需要 token 才能提交。', en: 'A token is required to submit.', ru: 'Для отправки нужен токен.' },
  'market.tokenHint':    { zh: '未提供 token 时仅可浏览与下载。', en: 'Without a token you can browse and download. Uploads use your token; browsing and downloading use no quota.', ru: 'Без токена доступен только просмотр и загрузка. Загрузка файлов использует ваш токен; просмотр не расходует квоту.' },
  'market.tokenLink':    { zh: '打开 GitHub 生成', en: 'Open GitHub to generate', ru: 'Открыть GitHub для генерации' },
  'market.tokenScope':   { zh: '链接已预填 repo 权限，仅需具备向 mouse114514/cublocky-market 提交 PR 的权限。', en: 'The link pre-fills repo scope; it only needs to open PRs against mouse114514/cublocky-market.', ru: 'Ссылка уже задаёт область repo; достаточно прав для PR в mouse114514/cublocky-market.' },
  'market.rememberToken': { zh: '记住 token', en: 'Remember token', ru: 'Запомнить токен' },
  'market.forgetToken':  { zh: '清除', en: 'Clear', ru: 'Очистить' },
  'market.pickServer':   { zh: '选择服务器上的项目', en: 'Choose a project on your server', ru: 'Выберите проект на сервере' },
  'market.noProjects':   { zh: '没有项目。先在主界面新建一个。', en: 'No projects. Create one on the welcome screen first.', ru: 'Нет проектов. Сначала создайте его на главном экране.' },
  'market.summary':      { zh: '.cbp {cbp} · {count} 个资源 · {assets}', en: '.cbp {cbp} · {count} assets · {assets}', ru: '.cbp {cbp} · {count} ресурсов · {assets}' },
  'market.save':         { zh: '保存', en: 'Save', ru: 'Сохранить' },
  'market.name':         { zh: '名称', en: 'Name', ru: 'Имя' },
  'market.author':       { zh: '作者', en: 'Author', ru: 'Автор' },
  'market.version':      { zh: '版本', en: 'Version', ru: 'Версия' },
  'market.description':  { zh: '描述', en: 'Description', ru: 'Описание' },
  'market.license':      { zh: '许可', en: 'License', ru: 'Лицензия' },
  'market.licenseDefault': { zh: '默认 MIT', en: 'Defaults to MIT', ru: 'По умолчанию MIT' },
  'market.icon':         { zh: '图标 (可选)', en: 'Icon (optional)', ru: 'Иконка (опционально)' },
  'market.iconHint':     { zh: '会显示为项目头像。仅图片。', en: 'Shown as the project avatar. Images only.', ru: 'Отображается как аватар. Только изображения.' },
  'market.submitting':   { zh: '提交中…', en: 'Submitting…', ru: 'Отправка…' },
  'market.submitted':    { zh: '已提交为 PR #{num}。审核的人点合并即发布。', en: 'Submitted as PR #{num}. A reviewer clicks merge to publish.', ru: 'Отправлено как PR #{num}. Рецензент жмёт Merge для публикации.' },
  'market.openPr':       { zh: '打开 PR', en: 'Open PR', ru: 'Открыть PR' },
  'market.empty':        { zh: '还没有项目。提交第一个。', en: 'No projects yet. Submit the first one.', ru: 'Пока нет проектов. Отправьте первый.' },
  'market.loading':      { zh: '加载中…', en: 'Loading…', ru: 'Загрузка…' },
  'market.error':        { zh: '出错了：{msg}', en: 'Error: {msg}', ru: 'Ошибка: {msg}' },
  'market.back':         { zh: '返回', en: 'Back', ru: 'Назад' },
  // ── Submit: GitHub token ──
  'market.tokenSafe': { zh: '本地工具，token 完全安全。', en: 'A local tool; the token is safe.', ru: 'Локальный инструмент; токен безопасен.' },
  'market.tokenTip': { zh: '链接已预填 repo 权限，仅需具备向 mouse114514/cublocky-market 提交 PR 的权限。未提供 token 时仅可浏览与下载；token 只发往 api.github.com，不经过本服务，也不消耗任何配额。', en: 'The link pre-fills the repo scope; only permission to open pull requests against mouse114514/cublocky-market is needed. Without a token, browsing and downloading remain available. The token goes to api.github.com only, never through this service, and uses no quota.', ru: 'Ссылка задаёт область repo; достаточно прав для создания pull request в mouse114514/cublocky-market. Без токена доступны просмотр и загрузка. Токен передаётся только в api.github.com и не расходует квоту.' },
} as const;

type DictKey = keyof typeof dict;

interface I18nCtx {
  lang: Lang;
  t: (key: string, params?: Record<string, string>) => string;
  setLang: (lang: Lang) => void;
}

const Ctx = createContext<I18nCtx>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('cublocky-lang') as Lang) || 'zh';
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('cublocky-lang', l);
  };
  const t = (key: string, params?: Record<string, string>) => {
    const entry = dict[key as DictKey];
    let s: string = entry?.[lang] ?? entry?.['en'] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
    }
    return s;
  };
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }
