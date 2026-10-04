export type SplashEntry = [string, string, string]; // [zh, en, ru]

const SPLASH_TEXTS: SplashEntry[] = [
  // Architecture
  ['全部在本机运行，无云服务', 'Runs entirely on your machine', 'Полностью локально, без облака'],
  ['数据与工程不出你的机器', 'Projects never leave your machine', 'Проекты не покидают ваш компьютер'],
  ['服务默认只监听 localhost', 'Binds to localhost by default', 'Слушает только localhost по умолчанию'],
  ['浏览器与本地服务同域通信', 'Same-origin browser to local service', 'Браузер и сервис на одном источнике'],
  ['跨域请求已被拒绝', 'Cross-origin requests are rejected', 'Межсайтовые запросы отклоняются'],

  // Security
  ['GitHub token 仅发往 api.github.com', 'Token goes only to api.github.com', 'Токен уходит только в api.github.com'],
  ['浏览市场不需要 token', 'Browsing needs no token', 'Просмотр рынка не требует токена'],
  ['GitHub 不经过本服务', 'GitHub traffic never touches the server', 'Трафик GitHub не проходит через сервис'],
  ['部署范围限定在服务器目录', 'Deploy is confined to the server directory', 'Развёртывание ограничено каталогом сервиса'],
  ['设置与存档保存在本机', 'Settings and saves stay on disk', 'Настройки и сохранения — локально'],

  // Format and compiler
  ['工程是纯文本 JSON', 'Projects are plain-text JSON', 'Проекты — обычный JSON'],
  ['拖拽积木，生成 C#', 'Drag blocks, get C#', 'Перетаскивайте блоки — получите C#'],
  ['无需手写代码', 'No hand-written code required', 'Не нужно писать код вручную'],
  ['生成的 C# 可预览可导出', 'Generated C# is previewable and exportable', 'C# можно просмотреть и экспортировать'],
  ['编译在本机服务完成', 'Compilation runs on the local service', 'Компиляция выполняется локально'],
  ['贴图与音频内嵌为程序集资源', 'Assets embed as assembly resources', 'Ресурсы встраиваются в сборку'],
  ['基于 BepInEx 与 0Harmony', 'Built on BepInEx and 0Harmony', 'На BepInEx и 0Harmony'],
  ['事件通过 Harmony patch 挂载', 'Events attach via Harmony patches', 'События подключаются через Harmony'],

  // Editor
  ['Ctrl+S 保存，Ctrl+B 编译', 'Ctrl+S save, Ctrl+B build', 'Ctrl+S сохранить, Ctrl+B собрать'],
  ['Ctrl+R 撤销，F1 查看引导', 'Ctrl+R undo, F1 show the guide', 'Ctrl+R отменить, F1 справка'],
  ['界面编辑器支持多种控件', 'The UI editor supports many controls', 'Редактор UI поддерживает множество элементов'],
  ['资源管理器支持批量操作', 'Asset manager supports batch operations', 'Управление ресурсами поддерживает пакетные операции'],
  ['工程导入支持多个 .cbp', 'Import accepts multiple .cbp files', 'Импорт принимает несколько .cbp'],
  ['项目名支持非 ASCII 字符', 'Non-ASCII project names supported', 'Имена проектов без ASCII поддерживаются'],

  // Marketplace
  ['提交生成 PR，合并即发布', 'Submit opens a PR, merge publishes', 'Отправка создаёт PR, слияние публикует'],
  ['市场条目由维护者审核后发布', 'Entries publish on maintainer approval', 'Записи публикуются после проверки'],
  ['夜间构建可能不稳定', 'Night builds may be unstable', 'Ночные сборки могут быть нестабильны'],
  ['编译通过即可部署', 'A clean build is deployable', 'Успешная сборка готова к развёртыванию'],

  // Credits
  ['感谢 BepInEx 团队', 'Thanks to the BepInEx team', 'Спасибо команде BepInEx'],
  ['感谢 0Harmony', 'Thanks to 0Harmony', 'Спасибо 0Harmony'],
  ['感谢 Orsoniks 与 Casualties Unknown', 'Thanks to Orsoniks and Casualties Unknown', 'Спасибо Orsoniks и Casualties Unknown'],
  ['支持中、英、俄三语', 'Chinese, English and Russian', 'Китайский, английский, русский'],
  ['由 mouse114514 开发', 'Developed by mouse114514', 'Разработано mouse114514'],
];

export default SPLASH_TEXTS;
