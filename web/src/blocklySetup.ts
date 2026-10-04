import * as Blockly from 'blockly/core';
import { fieldRegistry } from 'blockly/core';
import type { FunctionDef, ParamDef } from './types';

// ── Global sprite picker callback (React ↔ Blockly bridge) ──────
export type SpritePickCallback = (assetName: string) => void;
let _spritePickCb: SpritePickCallback | null = null;
let _propTypeCheckRegistered = false;
export function setSpritePickCallback(cb: SpritePickCallback | null) { _spritePickCb = cb; }
export function pickSprite(assetName: string) { _spritePickCb?.(assetName); _spritePickCb = null; }

// ── Custom sprite picker field ──────────────────────────────────────
// @ts-ignore — Blockly v12 FieldConfig incompatible with custom field constructor
class FieldSpritePicker extends Blockly.Field {
  private spriteId_ = '';
  private buttonEl_: HTMLButtonElement | null = null;
  private previewEl_: HTMLSpanElement | null = null;

  constructor(value?: string) {
    super(value || '');
    this.value_ = value || '';
    this.spriteId_ = value || '';
    this.getValue = this.getValue.bind(this);
    this.setValue = this.setValue.bind(this);
  }

  static fromJson<T extends Blockly.Field>(this: new (...args: any[]) => T, options: { sprite?: string }): T {
    return new FieldSpritePicker(options.sprite) as unknown as T;
  }

  protected initView_(): void {
    if (!this.fieldGroup_) return;
    this.previewEl_ = document.createElement('span');
    this.previewEl_.style.cssText = 'display:inline-block;width:24px;height:24px;border:1px solid #666;border-radius:3px;vertical-align:middle;margin-right:4px;background:#222;text-align:center;line-height:22px;font-size:10px;color:#999;';
    this.previewEl_.textContent = this.spriteId_ ? '✓' : '?';
    this.fieldGroup_.appendChild(this.previewEl_);
    this.buttonEl_ = document.createElement('button');
    this.buttonEl_.textContent = '🖼';
    this.buttonEl_.title = '选择精灵图 / Pick sprite';
    this.buttonEl_.style.cssText = 'border:1px solid #555;border-radius:3px;background:#444;color:#fff;cursor:pointer;padding:2px 6px;font-size:13px;vertical-align:middle;';
    this.buttonEl_.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openPicker_();
    });
    this.fieldGroup_.appendChild(this.buttonEl_);
  }

  private openPicker_(): void {
    const self = this;
    _spritePickCb = (assetName: string) => {
      self.spriteId_ = assetName;
      self.setValue(assetName);
      if (self.previewEl_) {
        self.previewEl_.textContent = '✓';
        self.previewEl_.title = assetName;
      }
      _spritePickCb = null;
    };
    // Dispatch event for React to open AssetManager
    window.dispatchEvent(new CustomEvent('cublocky:open-sprite-picker'));
  }

  getValue(): string {
    return this.spriteId_;
  }

  protected doValueUpdate_(newValue: any): void {
    this.spriteId_ = newValue || '';
    if (this.previewEl_) {
      this.previewEl_.textContent = this.spriteId_ ? '✓' : '?';
    }
  }

  protected doValueInvalid_(newValue: any): void {}
  protected render_(): void {}
  protected updateEditable_(): void {}
  getEditorShowArrow_: () => false = () => false as false;
}

fieldRegistry.register('field_sprite_picker', FieldSpritePicker as any);

// ── Searchable dropdown field ──────────────────────────────────────
type SearchableOption = [string, string, string, string]; // [zhLabel, enLabel, ruLabel, value]

class FieldSearchableDropdown extends Blockly.FieldDropdown {
  private allOptions_: SearchableOption[] = [];
  private currentLang_ = 'zh';

  constructor(value?: string, options?: SearchableOption[], lang?: string) {
    const ddOpts = (options || []).map(([zh, en, ru, val]) => [lang === 'zh' ? zh : lang === 'ru' ? ru : en, val]);
    super(ddOpts as any);
    this.allOptions_ = options || [];
    this.currentLang_ = lang || 'zh';
  }

  static fromJson<T extends Blockly.Field>(
    this: new (...args: any[]) => T,
    options: any
  ): T {
    return new FieldSearchableDropdown(options.value, options.options, options.lang) as unknown as T;
  }

  setLang(lang: string): void {
    this.currentLang_ = lang;
    const ddOpts = this.allOptions_.map(([zh, en, ru, val]) => [lang === 'zh' ? zh : lang === 'ru' ? ru : en, val]);
    this.menu_?.dispose();
    this.menu_ = null;
    (this as any).options_ = ddOpts;
    this.setValue(this.getValue()); // re-render
  }

  /** Override showEditor_ to inject search input into Blockly's dropdown div */
  showEditor_(e?: MouseEvent): void {
    // Call parent to open standard Blockly dropdown
    super.showEditor_(e);

    // Wait for Blockly to render the dropdown
    requestAnimationFrame(() => {
      const dropDiv = Blockly.DropDownDiv as any;
      const content = dropDiv?.getContentDiv?.();
      if (!content) return;

      // Find the scrollable menu container (Blockly wraps options in a div)
      const menuEl = content.querySelector('.blocklyMenu, .blockly-dropdown-menu');
      const scrollContainer = menuEl?.parentElement || content;

      // Create search input
      const searchWrap = document.createElement('div');
      searchWrap.style.cssText = 'padding:6px 8px;border-bottom:1px solid #aaa;background:inherit;';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cublocky-search-input';
      input.placeholder = this.currentLang_ === 'zh' ? '搜索...' : 'Search...';
      input.style.cssText = 'width:100%;box-sizing:border-box;padding:5px 8px;border-radius:10px;font-size:13px;outline:none;font-family:sans-serif;';

      // Prevent Blockly key handlers from eating our input
      input.addEventListener('keydown', (ev) => ev.stopPropagation());
      input.addEventListener('mousedown', (ev) => ev.stopPropagation());

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        // Filter Blockly menu items
        if (menuEl) {
          const items = menuEl.querySelectorAll('.blocklyMenuItem, .blockly-option');
          items.forEach((item: Element) => {
            const text = item.textContent?.toLowerCase() || '';
            (item as HTMLElement).style.display = text.includes(query) ? '' : 'none';
          });
        }
      });

      searchWrap.appendChild(input);

      // Insert search at the top of the dropdown content
      if (scrollContainer.firstChild) {
        scrollContainer.insertBefore(searchWrap, scrollContainer.firstChild);
      } else {
        scrollContainer.appendChild(searchWrap);
      }

      // Focus after dropdown is positioned
      setTimeout(() => input.focus(), 20);
    });
  }
}

fieldRegistry.register('field_searchable_dropdown', FieldSearchableDropdown as any);

// ── Color palette ──
const C = {
  EVENT:    '#ff8c1a',
  REGISTER: '#e91e63',
  BODY:     '#4caf50',
  ITEM:     '#2196f3',
  SOUND:    '#9c27b0',
  WORLD:    '#00bcd4',
  FLOW:     '#ff5722',
  VALUE:    '#59c059',
  BOOL:     '#7b1fa2',
  VAR:      '#ff7043',
  LIST:     '#b39ddb',
  BUILDING: '#00897b',
  TILE:     '#8d6e63',
  LOCALE:   '#5c6bc0',
  UI:       '#00acc1',
  CREATURE: '#ff6f00',
  CONFIG:   '#3f51b5',
  ASSET:    '#607d8b',
};

type DdOption = [string, string, string, string]; // [zhLabel, enLabel, ruLabel, value]

const VANILLA_ITEMS: DdOption[] = [
  ['绷带', 'Bandage', 'Bandage', 'bandage'], ['医用绷带', 'Medical Gauze', 'Medical Gauze', 'analgesicgauze'],
  ['消毒绷带', 'Sterilized Bandage', 'Sterilized Bandage', 'sterilizedbandage'],
  ['塑料绷带', 'Plastic Bandage', 'Plastic Bandage', 'plasticbandage'],
  ['创可贴', 'Adhesive Bandage', 'Adhesive Bandage', 'adhesivebandage'],
  ['藻酸盐绷带', 'Alginate Bandage', 'Alginate Bandage', 'alginate'],
  ['止痛药瓶', 'Painkillers', 'Painkillers', 'painkillers'],
  ['镇痛膏瓶', 'Pain Cream', 'Pain Cream', 'paincream'],
  ['吗啡注射器', 'Morphine', 'Morphine', 'morphine'],
  ['抗生素药瓶', 'Antibiotics', 'Antibiotics', 'antibiotics'],
  ['抗血清注射器', 'Antiserum', 'Antiserum', 'antiserum'],
  ['抗辐射剂药瓶', 'Antirad', 'Antirad', 'antirad'],
  ['纳洛酮注射器', 'Naloxone', 'Naloxone', 'naloxone'],
  ['芬太尼注射器', 'Fentanyl', 'Fentanyl', 'fentanyl'],
  ['海洛因注射器', 'Heroin', 'Heroin', 'heroin'],
  ['鸦片注射器', 'Opium', 'Opium', 'opium'],
  ['自动体外除颤仪', 'AED', 'AED', 'aed'],
  ['手动除颤仪', 'Manual Defibrillator', 'Manual Defibrillator', 'manualdefibrillator'],
  ['局部复苏装置', 'LRD', 'LRD', 'lrd'],
  ['简易局部复苏装置', 'Makeshift LRD', 'Makeshift LRD', 'makeshiftlrd'],
  ['自动泵', 'Auto Pump', 'Auto Pump', 'autopump'],
  ['医疗包', 'Medkit', 'Medkit', 'medkit'], ['夹板', 'Splint', 'Splint', 'splint'],
  ['血袋', 'Blood Bag', 'Blood Bag', 'bloodbag'],
  ['消毒液瓶', 'Disinfectant', 'Disinfectant', 'disinfectant'],
  ['注射器', 'Syringe', 'Syringe', 'syringe'], ['止血带', 'Tourniquet', 'Tourniquet', 'tourniquet'],
  ['手枪', 'Pistol', 'Pistol', 'pistol'], ['步枪', 'Rifle', 'Rifle', 'rifle'],
  ['霰弹枪', 'Shotgun', 'Shotgun', 'shotgun'],
  ['9mm子弹', '9mm Round', '9mm Round', '9mmround'],
  ['5.56子弹', '5.56 Round', '5.56 Round', '556round'],
  ['12号霰弹', '12 Gauge', '12 Gauge', '12gauge'],
  ['简易步枪', 'Makeshift Rifle', 'Makeshift Rifle', 'makeshiftrifle'],
  ['砍刀', 'Machete', 'Machete', 'machete'], ['十字镐', 'Pickaxe', 'Pickaxe', 'pickaxe'],
  ['大锤', 'Sledgehammer', 'Sledgehammer', 'sledgehammer'], ['爪子', 'Claws', 'Claws', 'claws'],
  ['炸药', 'Dynamite', 'Dynamite', 'dynamite'], ['铲子', 'Shovel', 'Shovel', 'shovel'],
  ['木铲', 'Wood Shovel', 'Wood Shovel', 'woodshovel'], ['干草叉', 'Pitchfork', 'Pitchfork', 'pitchfork'],
  ['微型激光钻', 'Mini Laser Drill', 'Mini Laser Drill', 'minilaserdrill'],
  ['重型钻', 'Heavy Drill', 'Heavy Drill', 'heavydrill'],
  ['钛合金多功能工具', 'Titanium Multitool', 'Titanium Multitool', 'titaniummultitool'],
  ['扳手', 'Wrench', 'Wrench', 'wrench'], ['简易扳手', 'Makeshift Wrench', 'Makeshift Wrench', 'makeshiftwrench'],
  ['攀爬绳', 'Climbing Rope', 'Climbing Rope', 'climbingrope'],
  ['攀爬爪', 'Climbing Claws', 'Climbing Claws', 'climbingclaws'],
  ['抓钩', 'Grappling Hook', 'Grappling Hook', 'grapplinghook'],
  ['手摇发电机', 'Hand Crank', 'Hand Crank', 'handcrank'],
  ['打火机', 'Lighter', 'Lighter', 'lighter'], ['火把', 'Torch', 'Torch', 'torch'],
  ['营地篝火', 'Campfire', 'Campfire', 'campfire'],
  ['地形扫描仪', 'Terrain Scanner', 'Terrain Scanner', 'terrainscanner'],
  ['盖革计数器', 'Geiger Counter', 'Geiger Counter', 'geigercounter'],
  ['开锁工具包', 'Lockpicking Kit', 'Lockpicking Kit', 'lockpickingkit'],
  ['废金属', 'Scrap Metal', 'Scrap Metal', 'scrapmetal'],
  ['废料块', 'Scrap Cube', 'Scrap Cube', 'scrapcube'],
  ['废料板', 'Scrap Panel', 'Scrap Panel', 'scrappanel'],
  ['废料管', 'Scrap Tube', 'Scrap Tube', 'scraptube'],
  ['木材碎片', 'Wood Scraps', 'Wood Scraps', 'woodscraps'],
  ['木块', 'Wood Cube', 'Wood Cube', 'woodcube'], ['木板', 'Wood Panel', 'Wood Panel', 'woodpanel'],
  ['绳子', 'Rope', 'Rope', 'rope'], ['细绳', 'String', 'String', 'string'],
  ['木棍', 'Stick', 'Stick', 'stick'], ['钉子', 'Nails', 'Nails', 'nails'],
  ['布料', 'Canvas', 'Canvas', 'canvas'], ['铜矿石', 'Raw Copper', 'Raw Copper', 'rawcopper'],
  ['加工铜', 'Processed Copper', 'Processed Copper', 'processedcopper'],
  ['钛板', 'Titanium Slab', 'Titanium Slab', 'titaniumslab'],
  ['钛棒', 'Titanium Rod', 'Titanium Rod', 'titaniumrod'],
  ['钛片', 'Titanium Sheet', 'Titanium Sheet', 'titaniumsheet'],
  ['塑料块', 'Plastic Chunk', 'Plastic Chunk', 'plasticchunk'],
  ['柔性玻璃', 'Flexiglass', 'Flexiglass', 'flexiglass'],
  ['电路板', 'Circuit Board', 'Circuit Board', 'circuitboard'],
  ['一捆电线', 'Bundle of Wires', 'Bundle of Wires', 'bundleofwires'],
  ['煤炭', 'Charcoal', 'Charcoal', 'charcoal'],
  ['易燃粉末', 'Flammable Powder', 'Flammable Powder', 'flammablepowder'],
  ['水瓶', 'Water Bottle', 'Water Bottle', 'waterbottle'], ['牛奶', 'Milk', 'Milk', 'milk'],
  ['巧克力牛奶', 'Chocolate Milk', 'Chocolate Milk', 'chocolatemilk'],
  ['汤', 'Soup', 'Soup', 'soup'], ['能量饮料', 'Energy Drink', 'Energy Drink', 'energydrink'],
  ['咖啡', 'Coffee', 'Coffee', 'coffee'], ['苹果汁', 'Apple Juice', 'Apple Juice', 'applejuice'],
  ['柠檬水', 'Lemonade', 'Lemonade', 'lemonade'], ['冰茶', 'Ice Tea', 'Ice Tea', 'icetea'],
  ['苏打水', 'Soda Bottle', 'Soda Bottle', 'sodabottle'], ['苏打罐', 'Soda Can', 'Soda Can', 'sodacan'],
  ['酒精', 'Alcohol', 'Alcohol', 'alcohol'], ['汉堡', 'Burger', 'Burger', 'burger'],
  ['牛排', 'Steak', 'Steak', 'steak'], ['披萨片', 'Pizza Slice', 'Pizza Slice', 'pizzaslice'],
  ['饼干', 'Cookies', 'Cookies', 'cookies'], ['薯片', 'Chips', 'Chips', 'chips'],
  ['面包', 'Bread', 'Bread', 'bread'], ['蛋糕', 'Cake', 'Cake', 'cake'],
  ['肉干', 'Pemmican', 'Pemmican', 'pemmican'],
  ['营养棒', 'Nutrient Bar', 'Nutrient Bar', 'nutrientbar'],
  ['塑料袋', 'Plastic Bag', 'Plastic Bag', 'plasticbag'],
  ['垃圾袋', 'Trash Bag', 'Trash Bag', 'trashbag'],
  ['植物纤维袋', 'Foliage Bag', 'Foliage Bag', 'foliagebag'],
  ['植物纤维挎包', 'Sling Bag', 'Sling Bag', 'slingbag'],
  ['重力袋', 'Grav Bag', 'Grav Bag', 'gravbag'], ['腿包', 'Leg Pouch', 'Leg Pouch', 'legpouch'],
  ['随身水包', 'Liquid Pouch', 'Liquid Pouch', 'liquidpouch'],
  ['材料包', 'Material Pouch', 'Material Pouch', 'materialpouch'],
  ['小背包', 'Small Pack', 'Small Pack', 'smallpack'],
  ['双肩大背包', 'Big Pack', 'Big Pack', 'bigpack'],
  ['工具箱', 'Toolbox', 'Toolbox', 'toolbox'], ['纸箱', 'Box', 'Box', 'box'],
  ['小桶', 'Mini Barrel', 'Mini Barrel', 'minibarrel'], ['水壶', 'Canteen', 'Canteen', 'canteen'],
  ['水罐', 'Water Jug', 'Water Jug', 'waterjug'],
  ['自行车头盔', 'Bike Helmet', 'Bike Helmet', 'bikehelmet'],
  ['防毒面具', 'Dust Mask', 'Dust Mask', 'dustmask'], ['围巾', 'Scarf', 'Scarf', 'scarf'],
  ['头灯', 'Headlamp', 'Headlamp', 'headlamp'],
  ['安全眼镜', 'Safety Glasses', 'Safety Glasses', 'safetyglasses'],
  ['巴拉克拉法帽', 'Balaclava', 'Balaclava', 'balaclava'],
  ['手套', 'Latex Gloves', 'Latex Gloves', 'latexgloves'],
  ['战术手套', 'Tactical Gloves', 'Tactical Gloves', 'tacticalgloves'],
  ['腰带', 'Belt', 'Belt', 'belt'], ['防弹衣', 'Belly Armor', 'Belly Armor', 'bellyarmor'],
  ['弹药带', 'Bandolier', 'Bandolier', 'bandolier'], ['腰包', 'Fanny Pack', 'Fanny Pack', 'fannypack'],
  ['运动鞋', 'Sneakers', 'Sneakers', 'sneakers'],
  ['战术靴', 'Tactical Boots', 'Tactical Boots', 'tacticalboots'],
  ['护膝', 'Kneepads', 'Kneepads', 'kneepads'],
  ['小型电池', 'Small Battery', 'Small Battery', 'smallbattery'],
  ['中型电池', 'Medium Battery', 'Medium Battery', 'mediumbattery'],
  ['大型电池', 'Large Battery', 'Large Battery', 'largebattery'],
  ['手电筒', 'Flashlight', 'Flashlight', 'flashlight'],
  ['应急手电', 'Emergency Light', 'Emergency Light', 'emergencylight'],
  ['提灯', 'Lantern', 'Lantern', 'lantern'], ['灯泡', 'Light Bulb', 'Light Bulb', 'lightbulb'],
  ['MP3播放器', 'MP3 Player', 'MP3 Player', 'mp3player'], ['手表', 'Watch', 'Watch', 'watch'],
  ['喷气背包', 'Jetpack', 'Jetpack', 'jetpack'],
  ['等离子切割器', 'Plasma Cutter', 'Plasma Cutter', 'plasmacutter'],
];

// Generic player property setter options: every public field on Body
const PLAYER_PROP_OPTIONS: DdOption[] = [
  ['体力值(stamina)', 'Stamina (stamina)', 'Выносливость (stamina)', 'stamina'],
  ['饥饿度(hunger)', 'Hunger (hunger)', 'Голод (hunger)', 'hunger'],
  ['口渴度(thirst)', 'Thirst (thirst)', 'Жажда (thirst)', 'thirst'],
  ['精力(energy)', 'Energy (energy)', 'Энергия (energy)', 'energy'],
  ['脑组织完整度(brainHealth)', 'Brain integrity (brainHealth)', 'Целостность мозга (brainHealth)', 'brainHealth'],
  ['意识清醒度(consciousness)', 'Consciousness (consciousness)', 'Сознание (consciousness)', 'consciousness'],
  ['血容量(bloodVolume)', 'Blood volume (bloodVolume)', 'Объём крови (bloodVolume)', 'bloodVolume'],
  ['血氧饱和度(bloodOxygen)', 'SpO2 (bloodOxygen)', 'Кислород в крови (bloodOxygen)', 'bloodOxygen'],
  ['心率(heartRate)', 'Heart rate (heartRate)', 'Частота пульса (heartRate)', 'heartRate'],
  ['血压(bloodPressure)', 'Blood pressure (bloodPressure)', 'Давление (bloodPressure)', 'bloodPressure'],
  ['呼吸频率(respiratoryRate)', 'Respiratory rate (respiratoryRate)', 'Частота дыхания (respiratoryRate)', 'respiratoryRate'],
  ['休克(shock)', 'Shock (shock)', 'Шок (shock)', 'shock'],
  ['核心体温(temperature)', 'Core temperature (temperature)', 'Температура тела (temperature)', 'temperature'],
  ['衣物温度(clothingTemperature)', 'Clothing temperature (clothingTemperature)', 'Темп. одежды (clothingTemperature)', 'clothingTemperature'],
  ['总疼痛度(averagePain)', 'Total pain (averagePain)', 'Общая боль (averagePain)', 'averagePain'],
  ['情绪值(happiness)', 'Mood (happiness)', 'Настроение (happiness)', 'happiness'],
  ['反胃程度(sicknessAmount)', 'Sickness (sicknessAmount)', 'Тошнота (sicknessAmount)', 'sicknessAmount'],
  ['免疫值(immunity)', 'Immunity (immunity)', 'Иммунитет (immunity)', 'immunity'],
  ['抗生素免疫时间(antibioticImmunityTime)', 'Antibiotic immunity (antibioticImmunityTime)', 'Защита от антибиотика (antibioticImmunityTime)', 'antibioticImmunityTime'],
  ['辐射值(radiationSickness)', 'Radiation sickness (radiationSickness)', 'Радиация (radiationSickness)', 'radiationSickness'],
  ['潮湿度(wetness)', 'Wetness (wetness)', 'Влажность (wetness)', 'wetness'],
  ['肾上腺素(adrenaline)', 'Adrenaline (adrenaline)', 'Адреналин (adrenaline)', 'adrenaline'],
  ['创伤值(traumaAmount)', 'Trauma (traumaAmount)', 'Травма (traumaAmount)', 'traumaAmount'],
  ['听力受损(hearingLoss)', 'Hearing loss (hearingLoss)', 'Потеря слуха (hearingLoss)', 'hearingLoss'],
  ['内出血(internalBleeding)', 'Internal bleeding (internalBleeding)', 'Внутреннее кровотечение (internalBleeding)', 'internalBleeding'],
  ['血胸(hemothorax)', 'Hemothorax (hemothorax)', 'Гемоторакс (hemothorax)', 'hemothorax'],
  ['心律失常(fibrillationProgress)', 'Fibrillation (fibrillationProgress)', 'Аритмия (fibrillationProgress)', 'fibrillationProgress'],
  ['血液黏度(bloodViscosity)', 'Blood viscosity (bloodViscosity)', 'Вязкость крови (bloodViscosity)', 'bloodViscosity'],
  ['感染性休克(septicShock)', 'Septic shock (septicShock)', 'Септический шок (septicShock)', 'septicShock'],
  ['体重(weightOffset)', 'Body mass (weightOffset)', 'Масса тела (weightOffset)', 'weightOffset'],
  ['睡眠不良值(badSleepAmount)', 'Bad sleep (badSleepAmount)', 'Плохой сон (badSleepAmount)', 'badSleepAmount'],
  ['积雪(snowAmount)', 'Snow (snowAmount)', 'Снег (snowAmount)', 'snowAmount'],
  ['咖啡因(caffeinated)', 'Caffeine (caffeinated)', 'Кофеин (caffeinated)', 'caffeinated'],
  ['阿片类物质含量(opiateHappiness)', 'Opiate amount (opiateHappiness)', 'Уровень опиатов (opiateHappiness)', 'opiateHappiness'],
  ['抗抑郁药(antidepressantHappiness)', 'Antidepressants (antidepressantHappiness)', 'Антидепрессанты (antidepressantHappiness)', 'antidepressantHappiness'],
  ['最大速度(maxSpeed)', 'Max speed (maxSpeed)', 'Макс. скорость (maxSpeed)', 'maxSpeed'],
  ['跳跃速度(jumpSpeed)', 'Jump speed (jumpSpeed)', 'Скорость прыжка (jumpSpeed)', 'jumpSpeed'],
  ['兴奋剂倍率(stimulantMultiplier)', 'Stimulant multiplier (stimulantMultiplier)', 'Мн. стимулятора (stimulantMultiplier)', 'stimulantMultiplier'],
  ['移动减速(temporarySlowdown)', 'Movement slowdown (temporarySlowdown)', 'Замедление (temporarySlowdown)', 'temporarySlowdown'],
  ['下蹲程度(crouchAmount)', 'Crouch (crouchAmount)', 'Склон (crouchAmount)', 'crouchAmount'],
  ['主手槽位(handSlot)', 'Main hand slot (handSlot)', 'Слот руки (handSlot)', 'handSlot'],
];

const PLAYER_BOOL_OPTIONS: DdOption[] = [
  ['站立(standing)', 'Standing (standing)', 'Стоя (standing)', 'standing'],
  ['蹲下(crouching)', 'Crouch (crouching)', 'Присел (crouching)', 'crouching'],
  ['呼吸中(breathing)', 'Breathing (breathing)', 'Дышит (breathing)', 'breathing'],
  ['在水中(inWater)', 'In water (inWater)', 'В воде (inWater)', 'inWater'],
  ['沉睡(sleeping)', 'Sleeping (sleeping)', 'Спит (sleeping)', 'sleeping'],
  ['强制行走(forceWalk)', 'Force walk (forceWalk)', 'Принуд. ходьба (forceWalk)', 'forceWalk'],
  ['强制心律失常(fibrillationForced)', 'Forced fibrillation (fibrillationForced)', 'Принуд. аритмия (fibrillationForced)', 'fibrillationForced'],
  ['反向操控(reversedControls)', 'Reversed controls (reversedControls)', 'Инверсия управления (reversedControls)', 'reversedControls'],
  ['面部缺损(disfigured)', 'Disfigured (disfigured)', 'Уродство (disfigured)', 'disfigured'],
  ['单眼失明(eyeGone)', 'Half-blind (eyeGone)', 'Одноглаз (eyeGone)', 'eyeGone'],
  ['双目失明(bothEyesGone)', 'Blind (bothEyesGone)', 'Слёп (bothEyesGone)', 'bothEyesGone'],
];

const LIMB_PROP_OPTIONS: DdOption[] = [
  ['皮肤健康值(skinHealth)', 'Skin health (skinHealth)', 'Кожа (skinHealth)', 'skinHealth'],
  ['肌肉健康值(muscleHealth)', 'Muscle health (muscleHealth)', 'Мышцы (muscleHealth)', 'muscleHealth'],
  ['肢体疼痛值(pain)', 'Limb pain (pain)', 'Боль (pain)', 'pain'],
  ['肢体失血速度(bleedAmount)', 'Limb bleeding (bleedAmount)', 'Кровотечение (bleedAmount)', 'bleedAmount'],
  ['肢体感染值(infectionAmount)', 'Limb infection (infectionAmount)', 'Инфекция (infectionAmount)', 'infectionAmount'],
  ['基础质量(baseMass)', 'Base mass (baseMass)', 'Масса (baseMass)', 'baseMass'],
  ['骨折疼痛倍率(brokenPainMultiplier)', 'Fracture pain rate (brokenPainMultiplier)', 'Мн. боли при переломе (brokenPainMultiplier)', 'brokenPainMultiplier'],
  ['感染速率(infectionSpeedMult)', 'Infection speed (infectionSpeedMult)', 'Скор. инфекции (infectionSpeedMult)', 'infectionSpeedMult'],
  ['饥饿损伤倍率(starvationHealthLossMult)', 'Starvation loss multiplier (starvationHealthLossMult)', 'Мн. голода (starvationHealthLossMult)', 'starvationHealthLossMult'],
  ['破片数(shrapnel)', 'Shrapnel (shrapnel)', 'Осколки (shrapnel)', 'shrapnel'],
  ['消毒时间(disinfectionTime)', 'Antiseptic time (disinfectionTime)', 'Обработка (disinfectionTime)', 'disinfectionTime'],
  ['绷带速度倍率(bandageMinigameSpeedMult)', 'Bandage speed multiplier (bandageMinigameSpeedMult)', 'Скор. перевязки (bandageMinigameSpeedMult)', 'bandageMinigameSpeedMult'],
  ['绷带迟缓值(bandageSlowAmount)', 'Bandage slow amount (bandageSlowAmount)', 'Замедл. повязки (bandageSlowAmount)', 'bandageSlowAmount'],
  ['皮肤愈合量(skinHealAmount)', 'Skin heal amount (skinHealAmount)', 'Растущая кожа (skinHealAmount)', 'skinHealAmount'],
  ['毛发积血(furBloodAmount)', 'Fur blood (furBloodAmount)', 'Кровь в шерсти (furBloodAmount)', 'furBloodAmount'],
  ['脱臼计时(dislocationTimer)', 'Dislocation timer (dislocationTimer)', 'Таймер вывиха (dislocationTimer)', 'dislocationTimer'],
  ['骨折愈合计时(boneHealTimer)', 'Bone heal timer (boneHealTimer)', 'Таймер сращивания (boneHealTimer)', 'boneHealTimer'],
  ['额外旋转(bonusRot)', 'Bonus rotation (bonusRot)', 'Поворот (bonusRot)', 'bonusRot'],
  ['重量视觉缩放(weightVisualScaleMult)', 'Weight visual scale (weightVisualScaleMult)', 'Масштаб веса (weightVisualScaleMult)', 'weightVisualScaleMult'],
];

const LIMB_BOOL_OPTIONS: DdOption[] = [
  ['骨折(broken)', 'Fractured (broken)', 'Сломана (broken)', 'broken'],
  ['脱臼(dislocated)', 'Dislocated (dislocated)', 'Вывихнута (dislocated)', 'dislocated'],
  ['夹板(splinted)', 'Splinted (splinted)', 'Шина (splinted)', 'splinted'],
  ['感染(infected)', 'Infected (infected)', 'Заражена (infected)', 'infected'],
  ['已止血(blockedBleeding)', 'Bleeding blocked (blockedBleeding)', 'Кровь остановлена (blockedBleeding)', 'blockedBleeding'],
  ['离断(dismembered)', 'Dismembered (dismembered)', 'Отрезана (dismembered)', 'dismembered'],
  ['产热(generateHeat)', 'Generates heat (generateHeat)', 'Выделяет тепло (generateHeat)', 'generateHeat'],
  ['中风影响(strokeAffected)', 'Stroke (strokeAffected)', 'Инсульт (strokeAffected)', 'strokeAffected'],
];

const SKILL_OPTIONS: DdOption[] = [
  ['力量(STR)', 'Strength (STR)', 'Сила (STR)', 'STR'],
  ['韧性(RES)', 'Resilience (RES)', 'Твёрдость (RES)', 'RES'],
  ['智力(INT)', 'Intellect (INT)', 'Интеллект (INT)', 'INT'],
];

const TRUE_FALSE_OPTIONS: DdOption[] = [
  ['真(true)', 'True (true)', 'Истина (true)', 'true'],
  ['假(false)', 'False (false)', 'Ложь (false)', 'false'],
];

const CFG_TYPE_OPTIONS: DdOption[] = [
  ['数值(float)', 'Float (float)', 'Число (float)', 'float'],
  ['布尔(bool)', 'Boolean (bool)', 'Булево (bool)', 'bool'],
  ['文本(string)', 'String (string)', 'Текст (string)', 'string'],
];

const MOD_OPTION_KIND_OPTIONS: DdOption[] = [
  ['滑块(float)', 'Slider (float)', 'Ползунок (float)', 'float'],
  ['整数(int)', 'Integer (int)', 'Целое (int)', 'int'],
  ['开关(bool)', 'Toggle (bool)', 'Переключатель (bool)', 'bool'],
  ['下拉(dropdown)', 'Dropdown (dropdown)', 'Выпадающий (dropdown)', 'dropdown'],
  ['按键(keybind)', 'Keybind (keybind)', 'Клавиша (keybind)', 'keybind'],
];

const KEYCODE_OPTIONS: DdOption[] = [
  ['空格(Space)', 'Space', 'Пробел', 'Space'], ['W', 'W', 'W', 'W'], ['A', 'A', 'A', 'A'], ['S', 'S', 'S', 'S'], ['D', 'D', 'D', 'D'],
  ['Q', 'Q', 'Q', 'Q'], ['E', 'E', 'E', 'E'], ['R', 'R', 'R', 'R'], ['F', 'F', 'F', 'F'], ['G', 'G', 'G', 'G'],
  ['T', 'T', 'T', 'T'], ['Y', 'Y', 'Y', 'Y'], ['U', 'U', 'U', 'U'], ['I', 'I', 'I', 'I'], ['O', 'O', 'O', 'O'],
  ['P', 'P', 'P', 'P'], ['1', '1', '1', 'Alpha1'], ['2', '2', '2', 'Alpha2'], ['3', '3', '3', 'Alpha3'], ['4', '4', '4', 'Alpha4'],
  ['5', '5', '5', 'Alpha5'], ['6', '6', '6', 'Alpha6'], ['7', '7', '7', 'Alpha7'], ['8', '8', '8', 'Alpha8'], ['9', '9', '9', 'Alpha9'],
  ['0', '0', '0', 'Alpha0'], ['左Shift(LeftShift)', 'Left Shift', 'Левый Shift', 'LeftShift'], ['右Shift(RightShift)', 'Right Shift', 'Правый Shift', 'RightShift'],
  ['左Ctrl(LeftControl)', 'Left Control', 'Левый Ctrl', 'LeftControl'], ['右Ctrl(RightControl)', 'Right Control', 'Правый Ctrl', 'RightControl'],
  ['左Alt(LeftAlt)', 'Left Alt', 'Левый Alt', 'LeftAlt'], ['右Alt(RightAlt)', 'Right Alt', 'Правый Alt', 'RightAlt'],
  ['回车(Return)', 'Return', 'Enter', 'Return'], ['Tab', 'Tab', 'Tab', 'Tab'], ['退格(Backspace)', 'Backspace', 'Backspace', 'Backspace'],
  ['删除(Delete)', 'Delete', 'Delete', 'Delete'], ['鼠标1(Mouse0)', 'Mouse 1', 'Мышь 1', 'Mouse0'], ['鼠标2(Mouse1)', 'Mouse 2', 'Мышь 2', 'Mouse1'],
  ['鼠标3(Mouse2)', 'Mouse 3', 'Мышь 3', 'Mouse2'], ['左箭头(UpArrow)', 'Up Arrow', 'Стрелка вверх', 'UpArrow'], ['右箭头(RightArrow)', 'Right Arrow', 'Стрелка вправо', 'RightArrow'],
  ['下箭头(DownArrow)', 'Down Arrow', 'Стрелка вниз', 'DownArrow'], ['左箭头(LeftArrow)', 'Left Arrow', 'Стрелка влево', 'LeftArrow'],
  ['H', 'H', 'H', 'H'], ['J', 'J', 'J', 'J'], ['K', 'K', 'K', 'K'], ['L', 'L', 'L', 'L'], ['Z', 'Z', 'Z', 'Z'], ['X', 'X', 'X', 'X'],
  ['C', 'C', 'C', 'C'], ['V', 'V', 'V', 'V'], ['B', 'B', 'B', 'B'], ['N', 'N', 'N', 'N'], ['M', 'M', 'M', 'M'],
  ['无(None)', 'None', 'Нет', 'None'],
];

const FILTER_MODE_OPTIONS: DdOption[] = [
  ['点阵(Point)', 'Point', 'Точечная', 'Point'],
  ['双线性(Bilinear)', 'Bilinear', 'Билинейная', 'Bilinear'],
  ['三线性(Trilinear)', 'Trilinear', 'Трилинейная', 'Trilinear'],
];

const TEXTURE_WRAP_OPTIONS: DdOption[] = [
  ['重复(Repeat)', 'Repeat', 'Повтор', 'Repeat'],
  ['镜像(Mirror)', 'Mirror', 'Зеркало', 'Mirror'],
  ['钳制(Clamp)', 'Clamp', 'Ограничение', 'Clamp'],
  ['边界(Border)', 'Border', 'Граница', 'Border'],
  ['不可寻址(MirroredRepeat)', 'Mirrored Repeat', 'Зеркальное повтор', 'MirroredRepeat'],
];

const LIQUID_VISUAL_MODE_OPTIONS: DdOption[] = [
  ['液体加染色(ExistingLiquidPlusTint)', 'Existing liquid + tint', 'Жидкость + тонировка', 'ExistingLiquidPlusTint'],
  ['纯色(SolidColor)', 'Solid color', 'Твёрдый цвет', 'SolidColor'],
  ['材质(Material)', 'Material', 'Материал', 'Material'],
  ['精灵(Sprite)', 'Sprite', 'Спрайт', 'Sprite'],
  ['高分辨率图片(HighResImage)', 'High-res image', 'Высокое разрешение', 'HighResImage'],
];

const BLOCK_JSON: any[] = [
  // ═══ Events (orange) ═════════════════════════════════════════
  { type: 'cu_when_awake', message0: '%{BKY_CU_WHEN_AWAKE}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_update', message0: '%{BKY_CU_WHEN_UPDATE}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_hurt', message0: '%{BKY_CU_WHEN_HURT}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_die', message0: '%{BKY_CU_WHEN_DIE}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_pickup', message0: '%{BKY_CU_WHEN_PICKUP}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_drop', message0: '%{BKY_CU_WHEN_DROP}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_wear', message0: '%{BKY_CU_WHEN_WEAR}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_heal', message0: '%{BKY_CU_WHEN_HEAL}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_laststand', message0: '%{BKY_CU_WHEN_LASTSTAND}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  { type: 'cu_when_enter_world', message0: '%{BKY_CU_WHEN_ENTER_WORLD}', colour: C.EVENT, hat: 'cap', nextStatement: null },
  {
    type: 'cu_when_button_pressed',
    message0: '%{BKY_CU_WHEN_BUTTON_PRESSED}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myButton' },
    ],
    colour: C.EVENT,
    hat: 'cap',
    nextStatement: null,
  },

  // ═══ Registration (pink) ═════════════════════════════════════
  // Item registration: id (item value block), fullName, description, category
  {
    type: 'cu_register_item',
    message0: '%{BKY_CU_REGISTER_ITEM}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item', align: 'RIGHT' },
      { type: 'field_input', name: 'FULL_NAME', text: 'My Item', align: 'RIGHT' },
      { type: 'field_input', name: 'DESC', text: 'A description', align: 'RIGHT' },
      { type: 'input_value', name: 'SPRITE_REF', check: 'Sprite', align: 'RIGHT' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // Sprite reference value block
  {
    type: 'cu_sprite_ref',
    message0: '%{BKY_CU_SPRITE_REF}',
    args0: [
      { type: 'field_input', name: 'ASSET', text: 'sprite.png' },
    ],
    output: 'Sprite',
    colour: C.UI,
  },

  // Status reference value block
  {
    type: 'cu_status_ref',
    message0: '%{BKY_CU_STATUS_REF}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myStatus' },
    ],
    output: 'Status',
    colour: C.VALUE,
  },

  // Status effect registration: id, name, type (buff/debuff), description, sprite
  {
    type: 'cu_register_status',
    message0: '%{BKY_CU_REGISTER_STATUS}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Status', align: 'RIGHT' },
      { type: 'field_input', name: 'NAME', text: 'My Status', align: 'RIGHT' },
      { type: 'field_dropdown', name: 'TYPE', options: [['正面效果','buff'],['负面效果','debuff']], align: 'RIGHT' },
      { type: 'field_input', name: 'DESC', text: 'A status effect', align: 'RIGHT' },
      { type: 'input_value', name: 'SPRITE_REF', check: 'Sprite', align: 'RIGHT' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // Status value reader: level or remaining duration of a body status
  {
    type: 'cu_status_get',
    message0: '%{BKY_CU_STATUS_GET}',
    args0: [
      { type: 'input_value', name: 'STATUS', check: 'Status', align: 'RIGHT' },
      { type: 'field_dropdown', name: 'FIELD', options: [['等级','level'],['剩余时长','remaining']], align: 'RIGHT' },
    ],
    output: 'Number',
    colour: C.VALUE, inputsInline: true,
  },

  // Apply / set a status effect on the player body: level + remaining seconds
  {
    type: 'cu_status_set',
    message0: '%{BKY_CU_STATUS_SET}',
    args0: [
      { type: 'input_value', name: 'STATUS', check: 'Status', align: 'RIGHT' },
      { type: 'input_value', name: 'LEVEL', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'REMAINING', check: 'Number', align: 'RIGHT' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.BODY, inputsInline: true,
  },

  // Item use behavior container (event-style hat)
  {
    type: 'cu_define_item_use',
    message0: '%{BKY_CU_DEFINE_ITEM_USE}',
    args0: [
      { type: 'input_value', name: 'ITEM', check: 'Item' },
    ],
    colour: C.EVENT, hat: 'cap', nextStatement: null,
  },

  // Item limb use behavior container (event-style hat)
  {
    type: 'cu_define_item_limb_use',
    message0: '%{BKY_CU_DEFINE_ITEM_LIMB_USE}',
    args0: [
      { type: 'input_value', name: 'ITEM', check: 'Item' },
    ],
    colour: C.EVENT, hat: 'cap', nextStatement: null,
  },

  // Set item property: a dropdown for which property to set + value slot
  {
    type: 'cu_item_set_property',
    message0: '%{BKY_CU_ITEM_SET_PROPERTY}',
    args0: [
      { type: 'input_value', name: 'TARGET_ITEM', check: 'Item' },
      { type: 'field_dropdown', name: 'PROP', options: [
        ['耐久(condition)','condition'],['重量(weight)','weight'],
        ['价值(value)','value'],
        ['可使用(usable)','usable'],['可穿戴(wearable)','wearable'],
        ['左手使用(useLimbAction)','useLimbAction'],
        ['零耐久销毁(destroyAtZeroCondition)','destroyAtZeroCondition'],
        ['可放置(placeable)','placeable'],
      ]},
      { type: 'input_value', name: 'VALUE', check: ['Number','String','Boolean','Item'], align: 'RIGHT' },
    ],
    extensions: ['prop_type_check'],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  // Set item tag: dedicated block with tag dropdown
  {
    type: 'cu_item_set_tag',
    message0: '%{BKY_CU_ITEM_SET_TAG}',
    args0: [
      { type: 'input_value', name: 'TARGET_ITEM', check: 'Item' },
      { type: 'field_dropdown', name: 'TAG', options: [
        ['可放置(placeable)','placeable'],
        ['可食用(edible)','edible'],
        ['可饮用(drinkable)','drinkable'],
        ['可穿戴(wearable)','wearable'],
        ['可堆叠(stackable)','stackable'],
      ]},
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  // Set item start condition: sets initial durability at spawn
  {
    type: 'cu_item_set_start_condition',
    message0: '%{BKY_CU_ITEM_SET_START_CONDITION}',
    args0: [
      { type: 'input_value', name: 'TARGET_ITEM', check: 'Item' },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  // Recipe registration: inputs (list), output, amount, resultCondition, isRepair
  {
    type: 'cu_register_recipe',
    message0: '%{BKY_CU_REGISTER_RECIPE}',
    args0: [
      { type: 'input_value', name: 'INPUTS', check: 'Array' },
      { type: 'input_value', name: 'OUTPUT', check: 'Item' },
      { type: 'input_value', name: 'AMOUNT', check: 'Number' },
      { type: 'input_value', name: 'RESULT_CONDITION', check: 'Number' },
      { type: 'input_value', name: 'INGREDIENT_CONDITION', check: 'Number' },
      { type: 'input_value', name: 'IS_REPAIR', check: 'Boolean' },
      { type: 'input_value', name: 'INT', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // ═══ Body (green) ════════════════════════════════════════════
  {
    type: 'cu_eat',
    message0: '%{BKY_CU_EAT}',
    args0: [
      { type: 'input_value', name: 'HUNGER', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'WEIGHT_GAIN', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_drink',
    message0: '%{BKY_CU_DRINK}',
    args0: [{ type: 'input_value', name: 'AMOUNT', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_talk',
    message0: '%{BKY_CU_TALK}',
    args0: [{ type: 'input_value', name: 'TEXT', check: 'String', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_run_command',
    message0: '%{BKY_CU_RUN_COMMAND}',
    args0: [{ type: 'input_value', name: 'COMMAND', check: 'String', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_sleep',
    message0: '%{BKY_CU_SLEEP}',
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_wake',
    message0: '%{BKY_CU_WAKE}',
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },

  // ═══ Item actions (blue) ═════════════════════════════════════
  {
    type: 'cu_item_use',
    message0: '%{BKY_CU_ITEM_USE}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'field_dropdown', name: 'ACTION', options: [['使用','use'],['丢弃','drop'],['装备','equip']] },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_consume',
    message0: '%{BKY_CU_ITEM_CONSUME}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'input_value', name: 'AMOUNT', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_set_condition',
    message0: '%{BKY_CU_ITEM_SET_CONDITION}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'field_dropdown', name: 'OP', options: [['设为','='],['增加','+'],['减少','-']] },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_set_weight',
    message0: '%{BKY_CU_ITEM_SET_WEIGHT}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_set_value',
    message0: '%{BKY_CU_ITEM_SET_VALUE}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_set_decay',
    message0: '%{BKY_CU_ITEM_SET_DECAY}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_item_set_slot_rotation',
    message0: '%{BKY_CU_ITEM_SET_SLOT_ROTATION}',
    args0: [
      { type: 'field_dropdown', name: 'TARGET', options: [['当前物品','this'],['左手','left'],['右手','right']] },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.ITEM, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Sound (purple) ══════════════════════════════════════════
  {
    type: 'cu_play_sound',
    message0: '%{BKY_CU_PLAY_SOUND}',
    args0: [
      { type: 'field_dropdown', name: 'SOUND', options: [
        ['useItem','useItem'],['eatCrunch','eatCrunch'],['eatFlesh','eatFlesh'],
        ['drink','drink'],['combine','combine'],['hit','hit'],
      ]},
    ],
    colour: C.SOUND, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_play_sound_at',
    message0: '%{BKY_CU_PLAY_SOUND_AT}',
    args0: [
      { type: 'field_dropdown', name: 'SOUND', options: [
        ['useItem','useItem'],['eatCrunch','eatCrunch'],['eatFlesh','eatFlesh'],
        ['drink','drink'],['combine','combine'],['hit','hit'],
      ]},
      { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'VOLUME', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.SOUND, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Flow (deep orange) ══════════════════════════════════════
  {
    type: 'cu_if',
    message0: '%{BKY_CU_IF}',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1', args1: [{ type: 'input_statement', name: 'THEN' }],
    colour: C.FLOW, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_if_else',
    message0: '%{BKY_CU_IF}',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1', args1: [{ type: 'input_statement', name: 'THEN' }],
    message2: '%{BKY_CU_ELSE}', args2: [],
    message3: '%1', args3: [{ type: 'input_statement', name: 'ELSE' }],
    colour: C.FLOW, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_repeat',
    message0: '%{BKY_CU_REPEAT}',
    args0: [{ type: 'input_value', name: 'TIMES', check: 'Number', align: 'RIGHT' }],
    message1: '%1', args1: [{ type: 'input_statement', name: 'SUBSTACK' }],
    colour: C.FLOW, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_while',
    message0: '%{BKY_CU_WHILE}',
    args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
    message1: '%1', args1: [{ type: 'input_statement', name: 'SUBSTACK' }],
    colour: C.FLOW, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_for_loop',
    message0: '%{BKY_CU_FOR_LOOP}',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'i' },
      { type: 'input_value', name: 'FROM', check: 'Number' },
      { type: 'input_value', name: 'TO', check: 'Number' },
    ],
    message1: '%1', args1: [{ type: 'input_statement', name: 'SUBSTACK' }],
    colour: C.FLOW, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Value reporters (lime green) ════════════════════════════
  { type: 'cu_number', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0, precision: 0.1 }], output: 'Number', colour: C.VALUE },
  { type: 'cu_text', message0: '%1', args0: [{ type: 'field_input', name: 'TEXT', text: '' }], output: 'String', colour: C.VALUE },
  { type: 'cu_var_get', message0: '%1', args0: [{ type: 'field_input', name: 'NAME', text: 'myVar' }], output: null, colour: C.VALUE },
  {
    type: 'cu_item_custom',
    message0: '%{BKY_CU_ITEM_CUSTOM} %1',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myItem' },
    ],
    output: 'Item', colour: C.VALUE,
  },
  {
    type: 'cu_item_vanilla',
    message0: '%{BKY_CU_ITEM_VANILLA} %1',
    args0: [
      { type: 'field_searchable_dropdown', name: 'ID', options: VANILLA_ITEMS, lang: 'zh' },
    ],
    output: 'Item', colour: C.VALUE,
  },
  { type: 'cu_happiness', message0: '%{BKY_CU_HAPPINESS}', output: 'Number', colour: C.VALUE },
  { type: 'cu_temperature', message0: '%{BKY_CU_TEMPERATURE}', output: 'Number', colour: C.VALUE },
  { type: 'cu_hunger', message0: '%{BKY_CU_HUNGER}', output: 'Number', colour: C.VALUE },
  { type: 'cu_weight', message0: '%{BKY_CU_WEIGHT}', output: 'Number', colour: C.VALUE },
  { type: 'cu_player_position', message0: '%{BKY_CU_PLAYER_POSITION}', output: 'Array', colour: C.VALUE },
  { type: 'cu_item_condition', message0: '%{BKY_CU_ITEM_CONDITION}', output: 'Number', colour: C.VALUE },
  { type: 'cu_item_name', message0: '%{BKY_CU_ITEM_NAME}', output: 'String', colour: C.VALUE },
  { type: 'cu_world_time', message0: '%{BKY_CU_WORLD_TIME}', output: 'Number', colour: C.WORLD },
  {
    type: 'cu_world_block_at',
    message0: '%{BKY_CU_WORLD_BLOCK_AT} X %1 Y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
    ],
    output: 'Number', colour: C.WORLD, inputsInline: true,
  },

  // ═══ Math operator (lime green) ════════════════════════════
  {
    type: 'cu_math_clamp',
    message0: '%{BKY_CU_MATH_CLAMP}',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'MIN', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'MAX', check: 'Number', align: 'RIGHT' },
    ],
    output: 'Number', colour: C.VALUE, inputsInline: true,
  },
  {
    type: 'cu_math_op',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'field_dropdown', name: 'OP', options: [
        ['+', 'ADD'], ['−', 'SUB'], ['×', 'MUL'], ['÷', 'DIV'],
        ['%', 'MOD'], ['幂', 'POW'],
      ]},
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number', colour: C.VALUE, inputsInline: true,
  },
  {
    type: 'cu_math_func',
    message0: '%1 %2',
    args0: [
      { type: 'field_dropdown', name: 'FUNC', options: [
        ['四舍五入', 'ROUND'], ['绝对值', 'ABS'],
        ['平方根', 'SQRT'], ['取反', 'NEG'],
      ]},
      { type: 'input_value', name: 'NUM', check: 'Number' },
    ],
    output: 'Number', colour: C.VALUE,
  },
  {
    type: 'cu_math_random',
    message0: '%{BKY_CU_MATH_RANDOM} %1 %{BKY_CU_MATH_TO} %2',
    args0: [
      { type: 'input_value', name: 'FROM', check: 'Number' },
      { type: 'input_value', name: 'TO', check: 'Number' },
    ],
    output: 'Number', colour: C.VALUE, inputsInline: true,
  },

  // ═══ String ops (lime green) ═════════════════════════════════
  {
    type: 'cu_string_op',
    message0: '%1 %2',
    args0: [
      { type: 'field_dropdown', name: 'OP', options: [['字符串长度', 'LEN'], ['拼接', 'JOIN']] },
      { type: 'input_value', name: 'A', check: 'String' },
    ],
    output: 'String', colour: C.VALUE,
  },
  {
    type: 'cu_string_contains',
    message0: '%1 %{BKY_CU_STRING_CONTAINS} %2',
    args0: [
      { type: 'input_value', name: 'STR', check: 'String' },
      { type: 'input_value', name: 'SUB', check: 'String' },
    ],
    output: 'Boolean', colour: C.BOOL, inputsInline: true,
  },

  // ═══ Boolean (dark purple) ═══════════════════════════════════
  { type: 'cu_true', message0: '%{BKY_CU_TRUE}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_false', message0: '%{BKY_CU_FALSE}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_is_alive', message0: '%{BKY_CU_IS_ALIVE}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_item_is_equipped', message0: '%{BKY_CU_ITEM_IS_EQUIPPED}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_item_is_in_inventory', message0: '%{BKY_CU_ITEM_IS_IN_INVENTORY}', output: 'Boolean', colour: C.BOOL },
  {
    type: 'cu_number_compare',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'field_dropdown', name: 'OP', options: [['>', '>'],['<', '<'],['=', '='],['≥', '>='],['≤', '<=']] },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Boolean', colour: C.BOOL, inputsInline: true,
  },
  {
    type: 'cu_logic_compare',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Boolean' },
      { type: 'field_dropdown', name: 'OP', options: [['且', 'AND'], ['或', 'OR']] },
      { type: 'input_value', name: 'B', check: 'Boolean' },
    ],
    output: 'Boolean', colour: C.BOOL, inputsInline: true,
  },
  { type: 'cu_not', message0: '%{BKY_CU_NOT} %1', args0: [{ type: 'input_value', name: 'BOOL', check: 'Boolean' }], output: 'Boolean', colour: C.BOOL },

  // ═══ Variables (coral) ═══════════════════════════════════════
  {
    type: 'cu_var_set',
    message0: '%{BKY_CU_VAR_SET} %1 %{BKY_CU_VAR_TO} %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'myVar' },
      { type: 'input_value', name: 'VALUE', align: 'RIGHT' },
    ],
    colour: C.VAR, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_var_change',
    message0: '%{BKY_CU_VAR_CHANGE} %1 %{BKY_CU_VAR_BY} %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'myVar' },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.VAR, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Lists (purple) ══════════════════════════════════════════
  {
    type: 'cu_list_get',
    message0: '%{BKY_CU_LIST_GET}',
    args0: [
      { type: 'input_value', name: 'LIST', check: 'Array' },
      { type: 'input_value', name: 'INDEX', check: 'Number' },
    ],
    output: null,
    colour: C.VALUE,
    inputsInline: true,
  },
  {
    type: 'cu_list_length',
    message0: '%{BKY_CU_LIST_LENGTH}',
    args0: [{ type: 'input_value', name: 'LIST', check: 'Array' }],
    output: 'Number',
    colour: C.VALUE,
  },
  {
    type: 'cu_list_add',
    message0: '%{BKY_CU_LIST_ADD}',
    args0: [
      { type: 'input_value', name: 'LIST', check: 'Array' },
      { type: 'input_value', name: 'ITEM' },
    ],
    colour: C.VALUE,
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
  },

  // ═══ Building (teal) ═════════════════════════════════════════
  {
    type: 'cu_register_building',
    message0: '%{BKY_CU_REGISTER_BUILDING}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myBuilding' },
      { type: 'field_input', name: 'NAME', text: 'My Building' },
      { type: 'field_input', name: 'DESC', text: 'A building' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_building_set_property',
    message0: '%{BKY_CU_BUILDING_SET_PROPERTY}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myBuilding' },
      { type: 'field_dropdown', name: 'PROP', options: [
        ['血量(health)','health'],['名称(name)','name'],
        ['描述(description)','description'],['地面放置(requireGround)','requireGround'],
        ['金属(metallic)','metallic'],['动物(animal)','animal'],
        ['掉落倍率(dropChanceMultiplier)','dropChanceMultiplier'],
        ['生成最小数(spawnMinPerChunk)','spawnMinPerChunk'],
        ['生成最大数(spawnMaxPerChunk)','spawnMaxPerChunk'],
      ]},
      { type: 'input_value', name: 'VALUE', check: ['Number','String','Boolean'], align: 'RIGHT' },
    ],
    colour: C.BUILDING, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Tile (brown) ════════════════════════════════════════════
  {
    type: 'cu_register_tile',
    message0: '%{BKY_CU_REGISTER_TILE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myTile' },
      { type: 'field_input', name: 'NAME', text: 'My Tile' },
      { type: 'field_input', name: 'DESC', text: 'A tile' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_tile_set_property',
    message0: '%{BKY_CU_TILE_SET_PROPERTY}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myTile' },
      { type: 'field_dropdown', name: 'PROP', options: [
        ['血量(health)','health'],['名称(name)','name'],
        ['描述(description)','description'],['金属(metallic)','metallic'],
        ['毒性(toxicity)','toxicity'],['滑(slippery)','slippery'],
        ['睡眠质量(sleepQuality)','sleepQuality'],
        ['生成量(spawnAmount)','spawnAmount'],
        ['碰撞体(collider)','collider'],['生成风格(genStyle)','genStyle'],
      ]},
      { type: 'input_value', name: 'VALUE', check: ['Number','String','Boolean'], align: 'RIGHT' },
    ],
    colour: C.TILE, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Locale (indigo) ═════════════════════════════════════════
  {
    type: 'cu_register_locale',
    message0: '%{BKY_CU_REGISTER_LOCALE}',
    args0: [
      { type: 'field_dropdown', name: 'TYPE', options: [
        ['物品(item)','item'],['建筑(building)','building'],['标题(title)','title'],
      ]},
      { type: 'field_input', name: 'ID', text: 'myItem' },
      { type: 'field_input', name: 'ZH', text: '中文名' },
      { type: 'field_input', name: 'EN', text: 'English Name' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // ═══ Creature registration (register red) ═══════════════════
  {
    type: 'cu_register_creature',
    message0: '%{BKY_CU_REGISTER_CREATURE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myCreature' },
      { type: 'field_input', name: 'NAME', text: 'My Creature' },
      { type: 'field_input', name: 'DESC', text: 'A creature' },
      { type: 'input_value', name: 'SPRITE', check: 'Sprite', align: 'RIGHT' },
      { type: 'field_number', name: 'HEALTH', value: 100, min: 0, precision: 1 },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // ═══ Animation registration (register red) ═══════════════════
  {
    type: 'cu_register_animation',
    message0: '%{BKY_CU_REGISTER_ANIMATION}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myAnim' },
      { type: 'input_value', name: 'SPRITE', check: 'Sprite', align: 'RIGHT' },
      { type: 'field_number', name: 'FRAME_W', value: 16, min: 1, precision: 1 },
      { type: 'field_number', name: 'FRAME_H', value: 16, min: 1, precision: 1 },
      { type: 'field_number', name: 'FPS', value: 12, min: 0.1, precision: 0.1 },
      { type: 'field_dropdown', name: 'LOOP', options: [['循环','TRUE'], ['单次','FALSE']] },
    ],
    colour: C.REGISTER, inputsInline: true,
  },

  // ═══ Creature control (orange) ═══════════════════════════════
  {
    type: 'cu_spawn_creature',
    message0: '%{BKY_CU_SPAWN_CREATURE}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
      { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.CREATURE, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_creature_pos',
    message0: '%{BKY_CU_SET_CREATURE_POS}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
      { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.CREATURE, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_move_creature_to',
    message0: '%{BKY_CU_MOVE_CREATURE_TO}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
      { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'SPEED', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.CREATURE, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_destroy_creature',
    message0: '%{BKY_CU_DESTROY_CREATURE}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
    ],
    colour: C.CREATURE, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_play_creature_animation',
    message0: '%{BKY_CU_PLAY_CREATURE_ANIMATION}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
      { type: 'field_input', name: 'ANIM_ID', text: 'myAnim' },
    ],
    colour: C.CREATURE, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_creature_position',
    message0: '%{BKY_CU_CREATURE_POSITION}',
    args0: [
      { type: 'field_input', name: 'CREATURE_ID', text: 'myCreature' },
    ],
    output: 'Array', colour: C.CREATURE,
  },

  // ═══ Player state getters (green-ish) ════════════════════════
  { type: 'cu_player_health', message0: '%{BKY_CU_PLAYER_HEALTH}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_max_health', message0: '%{BKY_CU_PLAYER_MAX_HEALTH}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_stamina', message0: '%{BKY_CU_PLAYER_STAMINA}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_oxygen', message0: '%{BKY_CU_PLAYER_OXYGEN}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_sleep_quality', message0: '%{BKY_CU_PLAYER_SLEEP_QUALITY}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_pain', message0: '%{BKY_CU_PLAYER_PAIN}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_stress', message0: '%{BKY_CU_PLAYER_STRESS}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_heart_rate', message0: '%{BKY_CU_PLAYER_HEART_RATE}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_blood_pressure', message0: '%{BKY_CU_PLAYER_BLOOD_PRESSURE}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_immunity', message0: '%{BKY_CU_PLAYER_IMMUNITY}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_thirst', message0: '%{BKY_CU_PLAYER_THIRST}', output: 'Number', colour: C.BODY },

  // ═══ Player skills ═══════════════════════════════════════════
  { type: 'cu_player_str', message0: '%{BKY_CU_PLAYER_STR}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_res', message0: '%{BKY_CU_PLAYER_RES}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_int_skill', message0: '%{BKY_CU_PLAYER_INT_SKILL}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_exp_str', message0: '%{BKY_CU_PLAYER_EXP_STR}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_exp_res', message0: '%{BKY_CU_PLAYER_EXP_RES}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_exp_int', message0: '%{BKY_CU_PLAYER_EXP_INT}', output: 'Number', colour: C.BODY },

  // ═══ Item getters (blue) ═════════════════════════════════════
  { type: 'cu_item_max_condition', message0: '%{BKY_CU_ITEM_MAX_CONDITION}', output: 'Number', colour: C.ITEM },
  { type: 'cu_item_weight', message0: '%{BKY_CU_ITEM_WEIGHT}', output: 'Number', colour: C.ITEM },
  { type: 'cu_item_value', message0: '%{BKY_CU_ITEM_VALUE}', output: 'Number', colour: C.ITEM },

  // ═══ World actions (cyan) ════════════════════════════════════
  {
    type: 'cu_world_set_tile',
    message0: '%{BKY_CU_WORLD_SET_TILE}',
    args0: [
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
      { type: 'input_value', name: 'TILE', check: 'Number' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_world_spawn_item',
    message0: '%{BKY_CU_WORLD_SPAWN_ITEM}',
    args0: [
      { type: 'input_value', name: 'ITEM', check: 'Item' },
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_world_destroy_block',
    message0: '%{BKY_CU_WORLD_DESTROY_BLOCK}',
    args0: [
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_world_replace_block',
    message0: '%{BKY_CU_WORLD_REPLACE_BLOCK}',
    args0: [
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
      { type: 'input_value', name: 'OLD_TILE', check: 'Number' },
      { type: 'input_value', name: 'NEW_TILE', check: 'Number' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_give_item',
    message0: '%{BKY_CU_GIVE_ITEM}',
    args0: [
      { type: 'input_value', name: 'ITEM', check: 'Item' },
      { type: 'input_value', name: 'COUNT', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_give_item_slot',
    message0: '%{BKY_CU_GIVE_ITEM_SLOT}',
    args0: [
      { type: 'input_value', name: 'ITEM', check: 'Item' },
      { type: 'input_value', name: 'SLOT', check: 'Number', align: 'RIGHT' },
      { type: 'input_value', name: 'COUNT', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.WORLD, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Extended Body getters (green) ═══════════════════════════
  { type: 'cu_player_energy', message0: '%{BKY_CU_PLAYER_ENERGY}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_brain_health', message0: '%{BKY_CU_PLAYER_BRAIN_HEALTH}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_shock', message0: '%{BKY_CU_PLAYER_SHOCK}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_blood_volume', message0: '%{BKY_CU_PLAYER_BLOOD_VOLUME}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_respiratory_rate', message0: '%{BKY_CU_PLAYER_RESPIRATORY_RATE}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_sickness', message0: '%{BKY_CU_PLAYER_SICKNESS}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_adrenaline', message0: '%{BKY_CU_PLAYER_ADRENALINE}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_radiation', message0: '%{BKY_CU_PLAYER_RADIATION}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_wetness', message0: '%{BKY_CU_PLAYER_WETNESS}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_clothing_temp', message0: '%{BKY_CU_PLAYER_CLOTHING_TEMP}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_encumbrance', message0: '%{BKY_CU_PLAYER_ENCUMBRANCE}', output: 'Number', colour: C.BODY },
  { type: 'cu_player_bleed_speed', message0: '%{BKY_CU_PLAYER_BLEED_SPEED}', output: 'Number', colour: C.BODY },

  // ═══ Extended Body booleans (dark purple) ════════════════════
  { type: 'cu_player_conscious', message0: '%{BKY_CU_PLAYER_CONSCIOUS}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_player_standing', message0: '%{BKY_CU_PLAYER_STANDING}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_player_grounded', message0: '%{BKY_CU_PLAYER_GROUNDED}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_player_in_water', message0: '%{BKY_CU_PLAYER_IN_WATER}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_player_breathing', message0: '%{BKY_CU_PLAYER_BREATHING}', output: 'Boolean', colour: C.BOOL },
  { type: 'cu_player_crouching', message0: '%{BKY_CU_PLAYER_CROUCHING}', output: 'Boolean', colour: C.BOOL },

  // ═══ Extended Body setters (green) ═══════════════════════════

  // ═══ Generic player property setters (green) ═══════════════════
  {
    type: 'cu_set_player_property', message0: '%{BKY_CU_SET_PLAYER_PROPERTY}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'PROP', options: PLAYER_PROP_OPTIONS, lang: 'zh' },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_player_flag', message0: '%{BKY_CU_SET_PLAYER_FLAG}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'PROP', options: PLAYER_BOOL_OPTIONS, lang: 'zh' },
      { type: 'input_value', name: 'VALUE', check: 'Boolean', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Skills (green) ══════════════════════════════════════════
  {
    type: 'cu_set_skill', message0: '%{BKY_CU_SET_SKILL}',
    args0: [
      { type: 'field_dropdown', name: 'STAT', options: [
        ['力量(STR)', 'STR'], ['耐力(RES)', 'RES'], ['智力(INT)', 'INT'],
      ]},
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_skill_range', message0: '%{BKY_CU_SET_SKILL_RANGE}',
    args0: [
      { type: 'field_dropdown', name: 'STAT', options: [
        ['力量(STR)', 'STR'], ['耐力(RES)', 'RES'], ['智力(INT)', 'INT'],
      ]},
      { type: 'input_value', name: 'MIN', check: 'Number' },
      { type: 'input_value', name: 'MAX', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Extended Body actions (green) ═══════════════════════════
  { type: 'cu_ragdoll', message0: '%{BKY_CU_RAGDOLL}', colour: C.BODY, previousStatement: null, nextStatement: null },
  { type: 'cu_jump', message0: '%{BKY_CU_JUMP}', colour: C.BODY, previousStatement: null, nextStatement: null },
  { type: 'cu_switch_hands', message0: '%{BKY_CU_SWITCH_HANDS}', colour: C.BODY, previousStatement: null, nextStatement: null },
  { type: 'cu_throw_item', message0: '%{BKY_CU_THROW_ITEM}', colour: C.BODY, previousStatement: null, nextStatement: null },

  // ═══ Limb getters (teal) ════════════════════════════════════
  {
    type: 'cu_limb_index', message0: '%{BKY_CU_LIMB_INDEX} %1',
    args0: [{ type: 'field_dropdown', name: 'LIMB', options: [['头部','0'],['躯干','1'],['左臂','2'],['右臂','3'],['左腿','4'],['右腿','5']], SERIALIZABLE: true }],
    output: 'Number', colour: C.BODY,
  },
  {
    type: 'cu_limb_skin_health', message0: '%{BKY_CU_LIMB_SKIN_HEALTH} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Number', colour: C.BODY,
  },
  {
    type: 'cu_limb_muscle_health', message0: '%{BKY_CU_LIMB_MUSCLE_HEALTH} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Number', colour: C.BODY,
  },
  {
    type: 'cu_limb_pain', message0: '%{BKY_CU_LIMB_PAIN} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Number', colour: C.BODY,
  },
  {
    type: 'cu_limb_bleed', message0: '%{BKY_CU_LIMB_BLEED} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Number', colour: C.BODY,
  },
  {
    type: 'cu_limb_infection', message0: '%{BKY_CU_LIMB_INFECTION} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Number', colour: C.BODY,
  },

  // ═══ Limb booleans (dark purple) ════════════════════════════
  {
    type: 'cu_limb_broken', message0: '%{BKY_CU_LIMB_BROKEN} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Boolean', colour: C.BOOL,
  },
  {
    type: 'cu_limb_dislocated', message0: '%{BKY_CU_LIMB_DISLOCATED} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Boolean', colour: C.BOOL,
  },
  {
    type: 'cu_limb_infected_bool', message0: '%{BKY_CU_LIMB_INFECTED} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Boolean', colour: C.BOOL,
  },
  {
    type: 'cu_limb_dismembered', message0: '%{BKY_CU_LIMB_DISMEMBERED} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    output: 'Boolean', colour: C.BOOL,
  },

  // ═══ Limb setters (teal) ════════════════════════════════════
  // Generic limb property setter: a dropdown for which field to set + limb + value
  {
    type: 'cu_set_limb_property', message0: '%{BKY_CU_SET_LIMB_PROPERTY}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'PROP', options: LIMB_PROP_OPTIONS, lang: 'zh' },
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_limb_flag', message0: '%{BKY_CU_SET_LIMB_FLAG}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'PROP', options: LIMB_BOOL_OPTIONS, lang: 'zh' },
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Boolean', align: 'RIGHT' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },

  // ═══ Limb actions (teal) ════════════════════════════════════
  {
    type: 'cu_limb_break', message0: '%{BKY_CU_LIMB_BREAK} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_limb_mend', message0: '%{BKY_CU_LIMB_MEND} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_limb_dislocate_action', message0: '%{BKY_CU_LIMB_DISLOCATE} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_limb_undislocate', message0: '%{BKY_CU_LIMB_UNDISLOCATE} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_limb_dismember_action', message0: '%{BKY_CU_LIMB_DISMEMBER} %1',
    args0: [{ type: 'input_value', name: 'LIMB', check: 'Number' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },

  // ═══ Extended Item getters (blue) ════════════════════════════
  { type: 'cu_item_id', message0: '%{BKY_CU_ITEM_ID}', output: 'String', colour: C.ITEM },
  { type: 'cu_item_category', message0: '%{BKY_CU_ITEM_CATEGORY}', output: 'String', colour: C.ITEM },

  // ═══ Extended World getters (cyan) ═══════════════════════════
  { type: 'cu_world_depth', message0: '%{BKY_CU_WORLD_DEPTH}', output: 'Number', colour: C.WORLD },

  // ═══ Item Property blocks (pink) ═══════════════════════════
  {
    type: 'cu_item_container',
    message0: '%{BKY_CU_ITEM_CONTAINER}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'CAPACITY', check: 'Number' },
      { type: 'input_value', name: 'MAX_WEIGHT', check: 'Number' },
      { type: 'input_value', name: 'ENCUMBRANCE', check: 'Number' },
      { type: 'field_dropdown', name: 'VISIBLE', options: [['true','true'],['false','false']] },
      { type: 'field_input', name: 'TAG_RESTRICTION', text: '' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_tool',
    message0: '%{BKY_CU_ITEM_TOOL}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'DAMAGE', check: 'Number' },
      { type: 'input_value', name: 'STRUCTURAL_DAMAGE', check: 'Number' },
      { type: 'input_value', name: 'DISTANCE', check: 'Number' },
      { type: 'input_value', name: 'KNOCKBACK', check: 'Number' },
      { type: 'input_value', name: 'COOLDOWN', check: 'Number' },
      { type: 'input_value', name: 'STAMINA', check: 'Number' },
      { type: 'field_dropdown', name: 'PIERCING', options: [['true','true'],['false','false']] },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_wearable',
    message0: '%{BKY_CU_ITEM_WEARABLE}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'field_dropdown', name: 'WEAR_LIMB', options: [
        ['头部','Head'],['躯干上','UpTorso'],['躯干下','DownTorso'],
        ['左臂','HandA'],['右臂','HandB'],['左腿','LegA'],['右腿','LegB'],
      ]},
      { type: 'field_input', name: 'SLOT_ID', text: 'back' },
      { type: 'input_value', name: 'ARMOR', check: 'Number' },
      { type: 'input_value', name: 'ISOLATION', check: 'Number' },
      { type: 'input_value', name: 'DURABILITY_LOSS', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_register_liquid',
    message0: '%{BKY_CU_REGISTER_LIQUID}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquid' },
      { type: 'field_input', name: 'NAME', text: 'My Liquid' },
      { type: 'field_input', name: 'DESC', text: 'A custom liquid' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_liquid_color',
    message0: '%{BKY_CU_LIQUID_COLOR}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquid' },
      { type: 'input_value', name: 'COLOR_R', check: 'Number' },
      { type: 'input_value', name: 'COLOR_G', check: 'Number' },
      { type: 'input_value', name: 'COLOR_B', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_liquid_value',
    message0: '%{BKY_CU_LIQUID_VALUE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquid' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_liquid_flags',
    message0: '%{BKY_CU_LIQUID_FLAGS}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquid' },
      { type: 'field_dropdown', name: 'DRINKABLE', options: [['true','true'],['false','false']] },
      { type: 'field_dropdown', name: 'HEALTH_USABLE', options: [['true','true'],['false','false']] },
      { type: 'field_dropdown', name: 'INJECTABLE', options: [['true','true'],['false','false']] },
      { type: 'input_value', name: 'INJECTION_SICKNESS', check: 'Number' },
      { type: 'field_dropdown', name: 'UNOBTAINABLE', options: [['false','false'],['true','true']] },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_liquid_container',
    message0: '%{BKY_CU_ITEM_LIQUID_CONTAINER}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'CAPACITY', check: 'Number' },
      { type: 'field_dropdown', name: 'AUTO_FILL', options: [['false','false'],['true','true']] },
      { type: 'field_input', name: 'LIQUID_ID', text: 'water' },
      { type: 'input_value', name: 'LIQUID_AMOUNT', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_battery',
    message0: '%{BKY_CU_ITEM_BATTERY}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'field_dropdown', name: 'PRESET', options: [['Small','Small'],['Medium','Medium'],['Large','Large']] },
      { type: 'input_value', name: 'START_CHARGE', check: 'Number' },
      { type: 'field_dropdown', name: 'SPAWN_WITH_BATTERY', options: [['true','true'],['false','false']] },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_light',
    message0: '%{BKY_CU_ITEM_LIGHT}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'INTENSITY', check: 'Number' },
      { type: 'input_value', name: 'RADIUS', check: 'Number' },
      { type: 'input_value', name: 'COLOR_R', check: 'Number' },
      { type: 'input_value', name: 'COLOR_G', check: 'Number' },
      { type: 'input_value', name: 'COLOR_B', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_bandage',
    message0: '%{BKY_CU_ITEM_BANDAGE}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'EFFECTIVENESS', check: 'Number' },
      { type: 'input_value', name: 'SKIN_HEAL', check: 'Number' },
      { type: 'input_value', name: 'BANDAGE_SLOW', check: 'Number' },
      { type: 'input_value', name: 'PAIN_REDUCTION', check: 'Number' },
      { type: 'input_value', name: 'BONE_HEAL', check: 'Number' },
      { type: 'input_value', name: 'DISLOCATION', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_syringe',
    message0: '%{BKY_CU_ITEM_SYRINGE}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'CAPACITY', check: 'Number' },
      { type: 'input_value', name: 'AMOUNT_PER_USE', check: 'Number' },
      { type: 'field_dropdown', name: 'AUTO_FILL', options: [['false','false'],['true','true']] },
      { type: 'field_input', name: 'LIQUID_ID', text: 'morphine' },
      { type: 'input_value', name: 'LIQUID_AMOUNT', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_gun',
    message0: '%{BKY_CU_ITEM_GUN}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'field_dropdown', name: 'AMMO_TYPE', options: [['手枪','Pistol'],['步枪','Rifle'],['霰弹','Shotgun']] },
      { type: 'field_dropdown', name: 'FIRING_MODE', options: [['泵动','Pump'],['半自动','SemiAuto'],['全自动','Auto']] },
      { type: 'field_dropdown', name: 'FEED_TYPE', options: [['弹匣供弹','Mag'],['直推供弹','Direct']] },
      { type: 'input_value', name: 'MAG_CAPACITY', check: 'Number' },
      { type: 'input_value', name: 'ANIMAL_DAMAGE', check: 'Number' },
      { type: 'input_value', name: 'STRUCTURAL_DAMAGE', check: 'Number' },
      { type: 'input_value', name: 'KNOCKBACK', check: 'Number' },
      { type: 'input_value', name: 'CONDITION_LOSS', check: 'Number' },
      { type: 'input_value', name: 'LOUDNESS', check: 'Number' },
      { type: 'input_value', name: 'GAS_TIME', check: 'Number' },
      { type: 'input_value', name: 'SHOTS_PER_FIRE', check: 'Number' },
      { type: 'input_value', name: 'VERTICAL_SPREAD', check: 'Number' },
      { type: 'input_value', name: 'SPRITE_RACKED', check: 'Sprite' },
      { type: 'input_value', name: 'SPRITE_NORMAL_NOMAG', check: 'Sprite' },
      { type: 'input_value', name: 'SPRITE_RACKED_NOMAG', check: 'Sprite' },
      { type: 'input_value', name: 'SOUND_FIRE', check: 'String' },
      { type: 'input_value', name: 'SOUND_RACK', check: 'String' },
      { type: 'input_value', name: 'SOUND_UNRACK', check: 'String' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },
  {
    type: 'cu_item_magazine',
    message0: '%{BKY_CU_ITEM_MAGAZINE}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'field_dropdown', name: 'AMMO_TYPE', options: [['手枪','Pistol'],['步枪','Rifle'],['霰弹','Shotgun']] },
      { type: 'input_value', name: 'MAX_ROUNDS', check: 'Number' },
      { type: 'input_value', name: 'START_ROUNDS', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_set_item_category',
    message0: '%{BKY_CU_SET_ITEM_CATEGORY}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'field_dropdown', name: 'CATEGORY', options: [
        ['nospawn','nospawn'],['weapon','weapon'],['tool','tool'],
        ['medical','medical'],['food','food'],['material','material'],
        ['armor','armor'],['container','container'],['misc','misc'],
      ]},
    ],
    colour: C.REGISTER, inputsInline: true,
  },
  {
    type: 'cu_set_item_base_stats',
    message0: '%{BKY_CU_SET_ITEM_BASE_STATS}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item' },
      { type: 'input_value', name: 'WEIGHT', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
      { type: 'field_dropdown', name: 'DECAY_ENABLED', options: [['真','TRUE'],['假','FALSE']] },
      { type: 'input_value', name: 'DECAY_MINUTES', check: 'Number' },
      { type: 'input_value', name: 'RECOGNITION', check: 'Number' },
      { type: 'input_value', name: 'SPAWN_FREQ', check: 'Number' },
    ],
    colour: C.REGISTER, inputsInline: false,
  },

  // ═══ Function (indigo) ════════════════════════════════════════
  {
    type: 'cu_define_function',
    message0: '%{BKY_CU_DEFINE_FUNCTION}',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'myFunc' },
      { type: 'field_dropdown', name: 'RETURN_TYPE', options: [['无','void'],['整数','int'],['浮点数','float'],['字符串','string'],['布尔','bool']] },
    ],
    colour: '#5c6bc0', inputsInline: true,
    mutator: 'cu_define_function_mutator',
  },
  {
    type: 'cu_get_param',
    message0: '%{BKY_CU_GET_PARAM}',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'x' },
    ],
    output: null,
    colour: '#5c6bc0',
  },
  {
    type: 'cu_define_function_container',
    message0: '%{BKY_CU_PARAMS}',
    args0: [],
    message1: '%1',
    args1: [
      { type: 'input_statement', name: 'STACK' },
    ],
    colour: '#5c6bc0',
  },
  {
    type: 'cu_define_function_item',
    message0: '%{BKY_CU_PARAMS}',
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: '#5c6bc0',
  },
  {
    type: 'cu_return',
    message0: '%{BKY_CU_RETURN}',
    args0: [
      { type: 'input_value', name: 'VALUE' },
    ],
    previousStatement: null,
    colour: '#5c6bc0',
  },
  {
    type: 'cu_call_function',
    message0: '%{BKY_CU_CALL_FUNCTION}',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'myFunc' },
    ],
    previousStatement: null, nextStatement: null,
    colour: '#5c6bc0', inputsInline: true,
    mutator: 'cu_call_function_mutator',
  },
  {
    type: 'cu_call_function_value',
    message0: '%{BKY_CU_CALL_FUNCTION_VALUE}',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'myFunc' },
    ],
    output: null,
    colour: '#5c6bc0', inputsInline: true,
    mutator: 'cu_call_function_mutator',
  },
  {
    type: 'cu_call_function_container',
    message0: '%{BKY_CU_PARAMS}',
    args0: [],
    message1: '%1',
    args1: [
      { type: 'input_statement', name: 'STACK' },
    ],
    colour: '#5c6bc0',
  },
  {
    type: 'cu_call_function_item',
    message0: '%{BKY_CU_PARAMS}',
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: '#5c6bc0',
  },
  // ── UI blocks ──
  {
    type: 'cu_show_control',
    message0: '%{BKY_CU_SHOW_CONTROL}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myButton' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.UI,
  },
  {
    type: 'cu_hide_control',
    message0: '%{BKY_CU_HIDE_CONTROL}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myButton' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.UI,
  },
  {
    type: 'cu_set_control_property',
    message0: '%{BKY_CU_SET_CONTROL_PROPERTY}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myButton' },
      { type: 'field_dropdown', name: 'PROP', options: [
        ['text', 'text'], ['visible', 'visible'], ['x', 'x'], ['y', 'y'],
        ['width', 'width'], ['height', 'height'], ['fontSize', 'fontSize'],
        ['textColor', 'textColor'], ['backgroundColor', 'backgroundColor'],
        ['strokeColor', 'strokeColor'], ['strokeWidth', 'strokeWidth'],
        ['cornerRadius', 'cornerRadius'], ['opacity', 'opacity'],
        ['value', 'value'], ['min', 'min'], ['max', 'max'],
        ['fillColor', 'fillColor'], ['sprite', 'sprite'], ['options', 'options'],
        ['selected', 'selected'], ['alignH', 'alignH'], ['alignV', 'alignV'],
      ]},
      { type: 'input_value', name: 'VALUE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.UI,
    inputsInline: true,
  },
  {
    type: 'cu_get_textfield_content',
    message0: '%{BKY_CU_GET_TEXTFIELD_CONTENT}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myTextField' },
    ],
    output: 'String',
    colour: C.UI,
  },
  {
    type: 'cu_get_control_value',
    message0: '%{BKY_CU_GET_CONTROL_VALUE}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'mySlider' },
    ],
    output: 'Number',
    colour: C.UI,
  },
  {
    type: 'cu_get_toggle_state',
    message0: '%{BKY_CU_GET_TOGGLE_STATE}',
    args0: [
      { type: 'field_input', name: 'CONTROL_ID', text: 'myToggle' },
    ],
    output: 'Boolean',
    colour: C.UI,
  },

  // ═══ Settings / options (CUCoreLib settings menu + persistent config) ═══
  {
    type: 'cu_register_mod_option',
    message0: '%{BKY_CU_REGISTER_MOD_OPTION}',
    args0: [
      { type: 'field_dropdown', name: 'KIND', options: [
        ['滑块(float)','Slider (float)','Ползунок (float)','float'],
      ]},
      { type: 'field_input', name: 'ID', text: 'myOption' },
      { type: 'field_input', name: 'LABEL', text: 'My option' },
      { type: 'field_input', name: 'DESC', text: 'What this does' },
      { type: 'field_input', name: 'CATEGORY', text: 'MyMod' },
      { type: 'field_input', name: 'DEFAULT', text: '1' },
      { type: 'field_input', name: 'MIN', text: '0' },
      { type: 'field_input', name: 'MAX', text: '10' },
      { type: 'field_input', name: 'KEYCODE', text: 'Space' },
      { type: 'field_input', name: 'CHOICES', text: 'fast|Fast,slow|Slow' },
      { type: 'input_statement', name: 'ACTION' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_cfg_get',
    message0: '%{BKY_CU_CFG_GET}',
    args0: [
      { type: 'field_dropdown', name: 'TYPE', options: [
        ['数值(float)','Float (float)','Число (float)','float'],
      ]},
      { type: 'field_input', name: 'KEY', text: 'myKey' },
      { type: 'input_value', name: 'DEFAULT' },
    ],
    colour: C.CONFIG,
  },
  {
    type: 'cu_cfg_set',
    message0: '%{BKY_CU_CFG_SET}',
    args0: [
      { type: 'field_dropdown', name: 'TYPE', options: [
        ['数值(float)','Float (float)','Число (float)','float'],
      ]},
      { type: 'field_input', name: 'KEY', text: 'myKey' },
      { type: 'input_value', name: 'VALUE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_register_keybind',
    message0: '%{BKY_CU_REGISTER_KEYBIND}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myAction' },
      { type: 'field_input', name: 'DESC', text: 'Triggers my action' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_key_code',
    message0: '%{BKY_CU_KEY_CODE}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'KEY', options: KEYCODE_OPTIONS, lang: 'zh' },
    ],
    output: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_key_sprite',
    message0: '%{BKY_CU_KEY_SPRITE}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'KEY', options: KEYCODE_OPTIONS, lang: 'zh' },
    ],
    output: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_friendly_key_name',
    message0: '%{BKY_CU_FRIENDLY_KEY_NAME}',
    args0: [
      { type: 'field_searchable_dropdown', name: 'KEY', options: KEYCODE_OPTIONS, lang: 'zh' },
    ],
    output: 'String',
    colour: C.CONFIG,
  },
  {
    type: 'cu_keybind_code',
    message0: '%{BKY_CU_KEYBIND_CODE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myAction' },
    ],
    output: null,
    colour: C.CONFIG,
  },

  // ═══ Assets (sprites, bundles, textures, materials) ═══
  {
    type: 'cu_load_embedded_sprite',
    message0: '%{BKY_CU_LOAD_EMBEDDED_SPRITE}',
    args0: [
      { type: 'field_input', name: 'PATH', text: 'Assets/icon.png' },
      { type: 'input_value', name: 'PPU' },
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_split_sprite_sheet',
    message0: '%{BKY_CU_SPLIT_SPRITE_SHEET}',
    args0: [
      { type: 'input_value', name: 'SHEET' },
      { type: 'input_value', name: 'COLS' },
      { type: 'input_value', name: 'ROWS' },
      { type: 'input_value', name: 'INDEX' },
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_cache_sprite',
    message0: '%{BKY_CU_CACHE_SPRITE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'mySprite' },
      { type: 'input_value', name: 'SPRITE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_get_cached_sprite',
    message0: '%{BKY_CU_GET_CACHED_SPRITE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'mySprite' },
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_register_bundle',
    message0: '%{BKY_CU_REGISTER_BUNDLE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myBundle' },
      { type: 'field_input', name: 'PATH', text: 'Assets/bundle.bundle' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_bundle_asset',
    message0: '%{BKY_CU_BUNDLE_ASSET}',
    args0: [
      { type: 'field_input', name: 'BUNDLE', text: 'myBundle' },
      { type: 'field_input', name: 'NAME', text: 'asset' },
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_frame_animation',
    message0: '%{BKY_CU_FRAME_ANIMATION}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myAnim' },
      { type: 'field_input', name: 'FRAMES', text: 'a.png, b.png, c.png' },
      { type: 'field_input', name: 'PPU', text: '8' },
      { type: 'field_input', name: 'FPS', text: '12' },
      { type: 'input_value', name: 'LOOP', check: 'Boolean' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_load_texture_file',
    message0: '%{BKY_CU_LOAD_TEXTURE_FILE}',
    args0: [
      { type: 'field_input', name: 'PATH', text: 'Assets/texture.png' },
      { type: 'field_dropdown', name: 'FILTER', options: [
        ['点阵(Point)','Point','Точечная','Point'],
      ]},
      { type: 'field_dropdown', name: 'WRAP', options: [
        ['重复(Repeat)','Repeat','Повтор','Repeat'],
      ]},
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_liquid_material',
    message0: '%{BKY_CU_LIQUID_MATERIAL}',
    args0: [
      { type: 'input_value', name: 'TEXTURE' },
      { type: 'field_input', name: 'SHADER', text: '' },
    ],
    output: null,
    colour: C.ASSET,
  },
  {
    type: 'cu_liquid_tile_material',
    message0: '%{BKY_CU_LIQUID_TILE_MATERIAL}',
    args0: [
      { type: 'field_input', name: 'PATH', text: 'Assets/water.png' },
      { type: 'field_input', name: 'SHADER', text: '' },
    ],
    output: null,
    colour: C.ASSET,
  },

  // ═══ Scheduling / feedback ═══
  {
    type: 'cu_alert',
    message0: '%{BKY_CU_ALERT}',
    args0: [
      { type: 'input_value', name: 'TEXT' },
      { type: 'input_value', name: 'IMPORTANT', check: 'Boolean' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },
  {
    type: 'cu_delay',
    message0: '%{BKY_CU_DELAY}',
    args0: [
      { type: 'input_value', name: 'SECONDS' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },
  {
    type: 'cu_call_when',
    message0: '%{BKY_CU_CALL_WHEN}',
    args0: [
      { type: 'input_value', name: 'COND', check: 'Boolean' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },
  {
    type: 'cu_console_log',
    message0: '%{BKY_CU_CONSOLE_LOG}',
    args0: [
      { type: 'input_value', name: 'TEXT' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },
  {
    type: 'cu_talk_electronic',
    message0: '%{BKY_CU_TALK_ELECTRONIC}',
    args0: [
      { type: 'input_value', name: 'TEXT' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },
  {
    type: 'cu_end_minigame',
    message0: '%{BKY_CU_END_MINIGAME}',
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: C.FLOW,
  },

  // ═══ Status effects: moodle icons ═══
  {
    type: 'cu_moodle',
    message0: '%{BKY_CU_MOODLE}',
    args0: [
      { type: 'input_value', name: 'INTENSITY', check: 'Number' },
      { type: 'input_value', name: 'ICON' },
      { type: 'input_value', name: 'NAME', check: 'String' },
      { type: 'input_value', name: 'DESC', check: 'String' },
      { type: 'input_value', name: 'CRITICAL', check: 'Boolean' },
      { type: 'input_value', name: 'IMPORTANT', check: 'Boolean' },
      { type: 'field_input', name: 'KEY', text: '' },
      { type: 'input_value', name: 'HOLD', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.BODY,
  },
  {
    type: 'cu_moodle_animated',
    message0: '%{BKY_CU_MOODLE_ANIMATED}',
    args0: [
      { type: 'input_value', name: 'INTENSITY', check: 'Number' },
      { type: 'input_value', name: 'ANIM_ID' },
      { type: 'input_value', name: 'NAME', check: 'String' },
      { type: 'input_value', name: 'DESC', check: 'String' },
      { type: 'input_value', name: 'CRITICAL', check: 'Boolean' },
      { type: 'input_value', name: 'IMPORTANT', check: 'Boolean' },
      { type: 'field_input', name: 'KEY', text: '' },
      { type: 'input_value', name: 'HOLD', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.BODY,
  },

  // ═══ Input / player queries ═══
  {
    type: 'cu_mouse_pos',
    message0: '%{BKY_CU_MOUSE_POS}',
    args0: [],
    output: null,
    colour: C.VALUE,
  },
  {
    type: 'cu_get_held_item',
    message0: '%{BKY_CU_GET_HELD_ITEM}',
    args0: [],
    output: null,
    colour: C.VALUE,
  },
  {
    type: 'cu_get_hovered_item',
    message0: '%{BKY_CU_GET_HOVERED_ITEM}',
    args0: [],
    output: null,
    colour: C.VALUE,
  },
  {
    type: 'cu_is_in_world',
    message0: '%{BKY_CU_IS_IN_WORLD}',
    args0: [],
    output: 'Boolean',
    colour: C.BOOL,
  },
  {
    type: 'cu_has_equipped',
    message0: '%{BKY_CU_HAS_EQUIPPED}',
    args0: [
      { type: 'input_value', name: 'ITEM' },
    ],
    output: 'Boolean',
    colour: C.BOOL,
  },
  {
    type: 'cu_is_modded_item',
    message0: '%{BKY_CU_IS_MODDED_ITEM}',
    args0: [
      { type: 'input_value', name: 'ITEM' },
    ],
    output: 'Boolean',
    colour: C.BOOL,
  },
  {
    type: 'cu_is_minigame_busy',
    message0: '%{BKY_CU_IS_MINIGAME_BUSY}',
    args0: [],
    output: 'Boolean',
    colour: C.BOOL,
  },

  // ═══ Item runtime overrides ═══
  {
    type: 'cu_set_worn_sprite',
    message0: '%{BKY_CU_SET_WORN_SPRITE}',
    args0: [
      { type: 'input_value', name: 'ITEM' },
      { type: 'input_value', name: 'SPRITE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ITEM,
  },
  {
    type: 'cu_set_multi_worn_sprite',
    message0: '%{BKY_CU_SET_MULTI_WORN_SPRITE}',
    args0: [
      { type: 'input_value', name: 'ITEM' },
      { type: 'field_input', name: 'LIMB', text: 'HandA' },
      { type: 'input_value', name: 'SPRITE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ITEM,
  },
  {
    type: 'cu_edit_vanilla_item',
    message0: '%{BKY_CU_EDIT_VANILLA_ITEM}',
    args0: [
      { type: 'input_value', name: 'ITEM' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.ITEM,
  },

  // ═══ World: liquid tiles and structures ═══
  {
    type: 'cu_register_liquid_tile',
    message0: '%{BKY_CU_REGISTER_LIQUID_TILE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquidTile' },
      { type: 'field_input', name: 'LIQUID_ID', text: 'water' },
      { type: 'input_value', name: 'BUOYANCY' },
      { type: 'input_value', name: 'DRAG' },
      { type: 'input_value', name: 'WETNESS' },
      { type: 'input_value', name: 'TEMPERATURE' },
      { type: 'input_value', name: 'SICKNESS' },
      { type: 'input_value', name: 'SLIP' },
      { type: 'input_value', name: 'SPAWN_AMOUNT' },
      { type: 'input_value', name: 'MAX_FILL' },
      { type: 'input_value', name: 'R' },
      { type: 'input_value', name: 'G' },
      { type: 'input_value', name: 'B' },
      { type: 'field_dropdown', name: 'VISUAL_MODE', options: [
        ['液体加染色','Existing liquid + tint','Жидкость + тонировка','ExistingLiquidPlusTint'],
      ]},
      { type: 'input_value', name: 'CONSUME_DRINK', check: 'Boolean' },
      { type: 'input_value', name: 'CONSUME_FILL', check: 'Boolean' },
      { type: 'field_input', name: 'FILL_LIQUID', text: 'water' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },
  {
    type: 'cu_place_liquid_tile',
    message0: '%{BKY_CU_PLACE_LIQUID_TILE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquidTile' },
      { type: 'input_value', name: 'X' },
      { type: 'input_value', name: 'Y' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },
  {
    type: 'cu_flood_liquid_tile',
    message0: '%{BKY_CU_FLOOD_LIQUID_TILE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myLiquidTile' },
      { type: 'input_value', name: 'X' },
      { type: 'input_value', name: 'Y' },
      { type: 'input_value', name: 'MAX' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },
  {
    type: 'cu_register_structure_file',
    message0: '%{BKY_CU_REGISTER_STRUCTURE_FILE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myStructure' },
      { type: 'field_input', name: 'PATH', text: 'Structures/house.json' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },
  {
    type: 'cu_place_structure',
    message0: '%{BKY_CU_PLACE_STRUCTURE}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myStructure' },
      { type: 'input_value', name: 'X' },
      { type: 'input_value', name: 'Y' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },
  {
    type: 'cu_structure_spawn_counts',
    message0: '%{BKY_CU_STRUCTURE_SPAWN_COUNTS}',
    args0: [
      { type: 'field_input', name: 'ID', text: 'myStructure' },
      { type: 'field_input', name: 'COUNTS', text: '1, 2, 3' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.WORLD,
  },

  // ═══ Body animation packs ═══
  {
    type: 'cu_play_body_animation',
    message0: '%{BKY_CU_PLAY_BODY_ANIMATION}',
    args0: [
      { type: 'input_value', name: 'BODY' },
      { type: 'field_input', name: 'BUNDLE', text: 'myBundle' },
      { type: 'field_input', name: 'ANIM', text: 'walk' },
      { type: 'input_value', name: 'LOOP', check: 'Boolean' },
      { type: 'input_value', name: 'SPEED', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.BODY,
  },
  {
    type: 'cu_stop_body_animation',
    message0: '%{BKY_CU_STOP_BODY_ANIMATION}',
    args0: [
      { type: 'input_value', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.BODY,
  },

  // ═══ Console commands ═══
  {
    type: 'cu_register_console_command',
    message0: '%{BKY_CU_REGISTER_CONSOLE_COMMAND}',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mycommand' },
      { type: 'field_input', name: 'DESC', text: 'What the command does' },
      { type: 'field_input', name: 'ARG_DESC', text: '' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: C.CONFIG,
  },
  {
    type: 'cu_console_arg',
    message0: '%{BKY_CU_CONSOLE_ARG}',
    args0: [
      { type: 'field_input', name: 'INDEX', text: '0' },
    ],
    output: 'String',
    colour: C.CONFIG,
  },
];

// ── Messages ──
const MSG_ZH: Record<string, string> = {
  CU_WHEN_AWAKE: '当 mod 启动',
  CU_WHEN_UPDATE: '每帧更新',
  CU_WHEN_HURT: '当受到伤害',
  CU_WHEN_DIE: '当死亡',
  CU_WHEN_PICKUP: '当拾起物品',
  CU_WHEN_DROP: '当丢弃物品',
  CU_WHEN_WEAR: '当穿戴装备',
  CU_WHEN_HEAL: '当被治疗',
  CU_WHEN_LASTSTAND: '当濒死战起',
  CU_WHEN_ENTER_WORLD: '当进入世界',
  CU_WHEN_BUTTON_PRESSED: '当按钮 %1 被按下',
  CU_REGISTER_ITEM: '注册物品 id %1 名称 %2 描述 %3 精灵图 %4',
  CU_SPRITE_REF: '精灵图 %1',
  CU_REGISTER_STATUS: '注册状态效果 id %1 名称 %2 类型 %3 描述 %4 精灵图 %5',
  CU_STATUS_REF: '状态 %1',
  CU_STATUS_GET: '状态 %1 的 %2',
  CU_STATUS_SET: '设置状态 %1 等级 %2 持续 %3',
  CU_DEFINE_ITEM_USE: '物品 %1 使用时',
  CU_DEFINE_ITEM_LIMB_USE: '物品 %1 肢体使用时',
  CU_ITEM_SET_PROPERTY: '设置物品 %1 属性 %2 为 %3',
  CU_ITEM_SET_TAG: '设置物品 %1 标签为 %2',
  CU_ITEM_SET_START_CONDITION: '设置物品 %1 初始耐久为 %2',
  CU_REGISTER_RECIPE: '配方 %1 → %2 ×%3 耐久%4 材料耐久%5 修理%6 智力%7',
  CU_EAT: '吃 饥饿 %1 体重增益 %2',
  CU_DRINK: '喝水 量 %1',
  CU_TALK: '说话 %1',
  CU_RUN_COMMAND: '执行命令 %1',
  CU_SLEEP: '睡觉',
  CU_WAKE: '醒来',
  CU_ITEM_USE: '物品 %1 %2',
  CU_ITEM_CONSUME: '消耗 %1 物品 数量 %2',
  CU_ITEM_SET_CONDITION: '设置 %1 物品耐久 %2 %3',
  CU_ITEM_SET_WEIGHT: '设置 %1 物品重量 %2',
  CU_ITEM_SET_VALUE: '设置 %1 物品价值 %2',
  CU_ITEM_SET_DECAY: '设置 %1 腐烂时间 %2',
  CU_ITEM_SET_SLOT_ROTATION: '设置 %1 插槽旋转 %2',
  CU_PLAY_SOUND: '播放音效 %1',
  CU_PLAY_SOUND_AT: '播放音效 %1 位置(%2,%3) 音量%4',
  CU_IF: '如果 %1 那么',
  CU_ELSE: '否则',
  CU_REPEAT: '重复 %1 次',
  CU_WHILE: '当 %1 循环',
  CU_FOR_LOOP: '从 %1 = %2 到 %3 循环',
  CU_HAPPINESS: '心情值',
  CU_TEMPERATURE: '体温',
  CU_HUNGER: '饥饿值',
  CU_WEIGHT: '体重',
  CU_PLAYER_POSITION: '玩家位置列表',
  CU_ITEM_CONDITION: '物品耐久',
  CU_ITEM_NAME: '物品名称',
  CU_WORLD_TIME: '世界时间',
  CU_WORLD_BLOCK_AT: '方块',
  CU_MATH_RANDOM: '随机整数',
  CU_MATH_TO: '到',
  CU_STRING_CONTAINS: '包含',
  CU_TRUE: '真',
  CU_FALSE: '假',
  CU_IS_ALIVE: '是否存活',
  CU_NOT: '非',
  CU_VAR_SET: '将',
  CU_VAR_CHANGE: '将',
  CU_VAR_TO: '设为',
  CU_VAR_BY: '增加',
  CU_LIST_CREATE: '创建列表',
  CU_LIST_GET: '列表 %1 第 %2 项',
  CU_LIST_LENGTH: '列表 %1 长度',
  CU_LIST_ADD: '向列表 %1 添加 %2',
  CU_REGISTER_BUILDING: '注册建筑 id %1 名称 %2 描述 %3',
  CU_BUILDING_SET_PROPERTY: '建筑 %1 设置 %2 为 %3',
  CU_REGISTER_TILE: '注册地块 id %1 名称 %2 描述 %3',
  CU_TILE_SET_PROPERTY: '地块 %1 设置 %2 为 %3',
  CU_REGISTER_LOCALE: '本地化 %1 id %2 中文 %3 英文 %4',
  CU_REGISTER_CREATURE: '注册生物 id %1 名称 %2 描述 %3 精灵图 %4 血量 %5',
  CU_REGISTER_ANIMATION: '注册动画 id %1 精灵图表 %2 帧宽 %3 帧高 %4 帧率 %5 %6',
  CU_SPAWN_CREATURE: '生成生物 %1 于 X %2 Y %3',
  CU_SET_CREATURE_POS: '设置生物 %1 位置 X %2 Y %3',
  CU_MOVE_CREATURE_TO: '移动生物 %1 到 X %2 Y %3 速度 %4',
  CU_DESTROY_CREATURE: '销毁生物 %1',
  CU_PLAY_CREATURE_ANIMATION: '播放生物 %1 动画 %2',
  CU_CREATURE_POSITION: '生物 %1 的位置列表',
  CU_PLAYER_HEALTH: '躯干皮肤健康值',
  CU_PLAYER_MAX_HEALTH: '皮肤健康上限',
  CU_PLAYER_STAMINA: '体力值',
  CU_PLAYER_OXYGEN: '血氧饱和度',
  CU_PLAYER_SLEEP_QUALITY: '意识清醒度',
  CU_PLAYER_PAIN: '头部疼痛值',
  CU_PLAYER_STRESS: '总疼痛度',
  CU_PLAYER_HEART_RATE: '心率',
  CU_PLAYER_BLOOD_PRESSURE: '血压',
  CU_PLAYER_IMMUNITY: '免疫值',
  CU_PLAYER_THIRST: '口渴度',
  CU_PLAYER_STR: '力量(STR)',
  CU_PLAYER_RES: '韧性(RES)',
  CU_PLAYER_INT_SKILL: '智力(INT)',
  CU_PLAYER_EXP_STR: '力量经验值',
  CU_PLAYER_EXP_RES: '韧性经验值',
  CU_PLAYER_EXP_INT: '智力经验值',
  CU_ITEM_MAX_CONDITION: '物品最大耐久',
  CU_ITEM_WEIGHT: '物品重量',
  CU_ITEM_VALUE: '物品价值',
  CU_WORLD_SET_TILE: '设置方块 X %1 Y %2 为 %3',
  CU_WORLD_SPAWN_ITEM: '在 X %1 Y %2 生成 %3',
  CU_WORLD_DESTROY_BLOCK: '破坏方块 X %1 Y %2',
  CU_WORLD_REPLACE_BLOCK: '替换方块 X %1 Y %2 从 %3 为 %4',
  CU_GIVE_ITEM: '给玩家物品 %1 ×%2',
  CU_GIVE_ITEM_SLOT: '给玩家物品 %1 到槽位 %2 ×%3',
  CU_MATH_CLAMP: '限制 %1 在 %2 到 %3 之间',
  CU_ITEM_IS_EQUIPPED: '物品是否装备中',
  CU_ITEM_IS_IN_INVENTORY: '物品是否在背包中',
  CU_ITEM_CUSTOM: '自定义物品',
  CU_ITEM_VANILLA: '物品',
  CU_LIMB_INDEX: '肢体',
  // Extended Body getters
  CU_PLAYER_ENERGY: '精力',
  CU_PLAYER_BRAIN_HEALTH: '脑组织完整度',
  CU_PLAYER_SHOCK: '休克',
  CU_PLAYER_BLOOD_VOLUME: '血容量',
  CU_PLAYER_RESPIRATORY_RATE: '呼吸频率',
  CU_PLAYER_SICKNESS: '反胃程度',
  CU_PLAYER_ADRENALINE: '肾上腺素',
  CU_PLAYER_RADIATION: '辐射值',
  CU_PLAYER_WETNESS: '潮湿度',
  CU_PLAYER_CLOTHING_TEMP: '衣物温度',
  CU_PLAYER_ENCUMBRANCE: '负重',
  CU_PLAYER_BLEED_SPEED: '总失血速度',
  // Extended Body booleans
  CU_PLAYER_CONSCIOUS: '是否清醒',
  CU_PLAYER_STANDING: '是否站立',
  CU_PLAYER_GROUNDED: '是否着地',
  CU_PLAYER_IN_WATER: '是否在水中',
  CU_PLAYER_BREATHING: '是否呼吸中',
  CU_PLAYER_CROUCHING: '是否蹲下',
  // Extended Body setters
  CU_SET_PLAYER_PROPERTY: '设置玩家属性 %1 为 %2',
  CU_SET_PLAYER_FLAG: '设置玩家状态 %1 为 %2',
  CU_SET_SKILL: '设置技能 %1 为 %2',
  CU_SET_SKILL_RANGE: '设置技能 %1 经验范围 %2 到 %3',
  CU_SET_LIMB_PROPERTY: '肢体 %2 的 %1 = %3',
  CU_SET_LIMB_FLAG: '肢体 %2 的 %1 = %3',
  // Extended Body actions
  CU_RAGDOLL: '触发布娃娃',
  CU_JUMP: '跳跃',
  CU_SWITCH_HANDS: '切换双手',
  CU_THROW_ITEM: '投掷物品',
  // Limb
  CU_LIMB_SKIN_HEALTH: '皮肤健康值',
  CU_LIMB_MUSCLE_HEALTH: '肌肉健康值',
  CU_LIMB_PAIN: '肢体疼痛值',
  CU_LIMB_BLEED: '肢体失血速度',
  CU_LIMB_INFECTION: '肢体感染值',
  CU_LIMB_BROKEN: '是否骨折',
  CU_LIMB_DISLOCATED: '是否脱臼',
  CU_LIMB_INFECTED: '是否感染',
  CU_LIMB_DISMEMBERED: '是否离断',
  CU_LIMB_BREAK: '使肢体骨折',
  CU_LIMB_MEND: '接骨',
  CU_LIMB_DISLOCATE: '使肢体脱臼',
  CU_LIMB_UNDISLOCATE: '复位脱臼',
  CU_LIMB_DISMEMBER: '离断肢体',
  // Item getters
  CU_ITEM_ID: '物品ID',
  CU_ITEM_CATEGORY: '物品分类',
  // World
  CU_WORLD_DEPTH: '玩家深度(米)',
  // Item properties
  CU_SET_ITEM_CATEGORY: '设置物品分类 id %1 分类 %2',
  CU_SET_ITEM_BASE_STATS: '设置物品基础属性 id %1 重量 %2 价值 %3 腐烂 %4 分钟 %5 识别 %6 生成频率 %7',
  CU_ITEM_CONTAINER: '设置容器属性\nid %1\n容量 %2\n单物品最大重量 %3\n减重 %4\n物品可见 %5\n标签限制 %6',
  CU_ITEM_TOOL: '设置武器/工具属性\nid %1\n伤害 %2\n结构伤害 %3\n距离 %4\n击退 %5\n冷却 %6\n体力消耗 %7\n穿透 %8',
  CU_ITEM_WEARABLE: '设置可穿戴属性\nid %1\n部位 %2\n插槽 %3\n护甲 %4\n隔离 %5\n耐久损失倍率 %6',
  CU_REGISTER_LIQUID: '注册液体 id %1 名称 %2 描述 %3',
  CU_LIQUID_COLOR: '设置液体颜色 id %1 R %2 G %3 B %4',
  CU_LIQUID_VALUE: '设置液体价值 id %1 每升价值 %2',
  CU_LIQUID_FLAGS: '液体标志\nid %1\n可饮用 %2\n可外用 %3\n可注射 %4\n注射不适 %5\n不可获得 %6',
  CU_ITEM_LIQUID_CONTAINER: '设置液体容器\nid %1\n容量 %2\n自动填充 %3\n液体ID %4\n液体量 %5',
  CU_ITEM_BATTERY: '设置电池属性\nid %1\n预设 %2\n初始电量 %3\n随机带电池 %4',
  CU_ITEM_LIGHT: '设置光源属性 id %1 强度 %2 外半径 %3 R %4 G %5 B %6',
  CU_ITEM_BANDAGE: '设置绷带属性 id %1 效力 %2 皮肤治疗 %3 止血 %4 止痛 %5 骨恢复 %6 脱臼恢复 %7',
  CU_ITEM_SYRINGE: '设置注射器属性\nid %1\n容量 %2\n每次注射 %3\n自动填充 %4\n液体ID %5\n液体量 %6',
  CU_ITEM_GUN: '设置枪械属性\nid %1\n弹药类型 %2\n射击模式 %3\n供弹方式 %4\n弹匣容量 %5\n动物伤害 %6\n结构伤害 %7\n击退 %8\n耐久消耗 %9\n响度 %10\n气体循环 %11\n每次射弹数 %12\n垂直散布 %13\n上膛精灵 %14\n无弹匣正常 %15\n无弹匣上膛 %16\n开火音效 %17\n上膛音效 %18\n退膛音效 %19',
  CU_ITEM_MAGAZINE: '设置弹匣属性\nid %1\n弹药类型 %2\n最大容量 %3\n初始弹药 %4',
  // Function
  CU_PARAM: '参数 %1 类型 %2',
  CU_DEFINE_FUNCTION: '定义函数 %1 返回 %2',
  CU_DEFINE_FUNCTION_CONTAINER: '参数',
  CU_DEFINE_FUNCTION_ITEM: '参数',
  CU_RETURN: '返回 %1',
  CU_GET_PARAM: '参数 %1',
  CU_CALL_FUNCTION: '调用 %1',
  CU_CALL_FUNCTION_VALUE: '调用 %1',
  CU_CALL_FUNCTION_CONTAINER: '参数',
  CU_CALL_FUNCTION_ITEM: '参数',
  // UI
  CU_SHOW_CONTROL: '显示控件 %1',
  CU_HIDE_CONTROL: '隐藏控件 %1',
  CU_SET_CONTROL_PROPERTY: '设置控件 %1 属性 %2 为 %3',
  CU_GET_TEXTFIELD_CONTENT: '文本框 %1 的内容',
  CU_GET_CONTROL_VALUE: '控件 %1 的值',
  CU_GET_TOGGLE_STATE: '开关 %1 的状态',
  CU_REGISTER_MOD_OPTION: '设置菜单 %2 = %1',
  CU_CFG_GET: '%1 配置 %2',
  CU_CFG_SET: '设置 %1 配置 %2 = %3',
  CU_REGISTER_KEYBIND: '注册按键 %1：%2',
  CU_KEY_CODE: '按键 %1',
  CU_KEY_SPRITE: '按键图标 %1',
  CU_FRIENDLY_KEY_NAME: '按键名称 %1',
  CU_KEYBIND_CODE: '按键代码 %1',
  CU_LOAD_EMBEDDED_SPRITE: '内置精灵 %1 @%2',
  CU_SPLIT_SPRITE_SHEET: '精灵表 %2×%3 第 %4 帧',
  CU_CACHE_SPRITE: '缓存精灵 %1',
  CU_GET_CACHED_SPRITE: '读取缓存精灵 %1',
  CU_REGISTER_BUNDLE: '注册资源包 %1：%2',
  CU_BUNDLE_ASSET: '资源包 %1 中的 %2',
  CU_FRAME_ANIMATION: '帧动画 %1（%2 帧/秒）',
  CU_LOAD_TEXTURE_FILE: '纹理 %1（%2/%3）',
  CU_LIQUID_MATERIAL: '液体材质 %1',
  CU_LIQUID_TILE_MATERIAL: '液体材质文件 %1',
  CU_ALERT: '提示 %1',
  CU_DELAY: '等待 %1 秒后',
  CU_CALL_WHEN: '当 %1 为真时',
  CU_CONSOLE_LOG: '控制台输出 %1',
  CU_TALK_ELECTRONIC: '电子设备说话 %1',
  CU_END_MINIGAME: '结束小游戏',
  CU_MOODLE: '情绪图标 强度 %1 名称 %2',
  CU_MOODLE_ANIMATED: '动画情绪图标 强度 %1 名称 %2',
  CU_MOUSE_POS: '鼠标位置',
  CU_GET_HELD_ITEM: '手持物品',
  CU_GET_HOVERED_ITEM: '悬停物品',
  CU_IS_IN_WORLD: '是否在世界中',
  CU_HAS_EQUIPPED: '是否装备了 %1',
  CU_IS_MODDED_ITEM: '%1 是否为模组物品',
  CU_IS_MINIGAME_BUSY: '小游戏是否进行中',
  CU_SET_WORN_SPRITE: '设置 %1 的佩戴精灵 = %2',
  CU_SET_MULTI_WORN_SPRITE: '设置 %1 部位 %2 的佩戴精灵 = %3',
  CU_EDIT_VANILLA_ITEM: '修改原生物品 %1',
  CU_REGISTER_LIQUID_TILE: '注册液体方块 %1（%2）',
  CU_PLACE_LIQUID_TILE: '放置液体方块 %1 到 (%2, %3)',
  CU_FLOOD_LIQUID_TILE: '扩散液体方块 %1 到 (%2, %3) 上限 %4',
  CU_REGISTER_STRUCTURE_FILE: '注册结构 %1：%2',
  CU_PLACE_STRUCTURE: '放置结构 %1 到 (%2, %3)',
  CU_STRUCTURE_SPAWN_COUNTS: '结构 %1 生成次数 %2',
  CU_PLAY_BODY_ANIMATION: '播放身体动画 %1：%2',
  CU_STOP_BODY_ANIMATION: '停止身体动画',
  CU_REGISTER_CONSOLE_COMMAND: '注册控制台命令 %1：%2',
  CU_CONSOLE_ARG: '命令参数 %1',
};

const MSG_EN: Record<string, string> = {
  CU_WHEN_AWAKE: 'when mod awakes',
  CU_WHEN_UPDATE: 'on every frame',
  CU_WHEN_HURT: 'when hurt',
  CU_WHEN_DIE: 'when die',
  CU_WHEN_PICKUP: 'when pick up item',
  CU_WHEN_DROP: 'when drop item',
  CU_WHEN_WEAR: 'when wear equipment',
  CU_WHEN_HEAL: 'when healed',
  CU_WHEN_LASTSTAND: 'when last stand',
  CU_WHEN_ENTER_WORLD: 'when enter world',
  CU_WHEN_BUTTON_PRESSED: 'when button %1 pressed',
  CU_REGISTER_ITEM: 'register item id %1 name %2 desc %3 sprite %4',
  CU_SPRITE_REF: 'sprite %1',
  CU_REGISTER_STATUS: 'register status effect id %1 name %2 type %3 desc %4 sprite %5',
  CU_STATUS_REF: 'status %1',
  CU_STATUS_GET: '%2 of status %1',
  CU_STATUS_SET: 'set status %1 level %2 for %3',
  CU_DEFINE_ITEM_USE: 'when %1 item used',
  CU_DEFINE_ITEM_LIMB_USE: 'when %1 item limb used',
  CU_ITEM_SET_PROPERTY: 'set item %1 property %2 to %3',
  CU_ITEM_SET_TAG: 'set item %1 tag to %2',
  CU_ITEM_SET_START_CONDITION: 'set item %1 start condition to %2',
  CU_REGISTER_RECIPE: 'recipe %1 → %2 ×%3 cond%4 ing cond%5 repair%6 int%7',
  CU_EAT: 'eat hunger %1 weight gain %2',
  CU_DRINK: 'drink amount %1',
  CU_TALK: 'talk %1',
  CU_RUN_COMMAND: 'run command %1',
  CU_SLEEP: 'sleep',
  CU_WAKE: 'wake',
  CU_ITEM_USE: 'item %1 %2',
  CU_ITEM_CONSUME: 'consume %1 item amount %2',
  CU_ITEM_SET_CONDITION: 'set %1 item condition %2 %3',
  CU_ITEM_SET_WEIGHT: 'set %1 item weight %2',
  CU_ITEM_SET_VALUE: 'set %1 item value %2',
  CU_ITEM_SET_DECAY: 'set %1 decay minutes %2',
  CU_ITEM_SET_SLOT_ROTATION: 'set %1 slot rotation %2',
  CU_PLAY_SOUND: 'play sound %1',
  CU_PLAY_SOUND_AT: 'play sound %1 at(%2,%3) vol%4',
  CU_IF: 'if %1 then',
  CU_ELSE: 'else',
  CU_REPEAT: 'repeat %1 times',
  CU_WHILE: 'while %1 loop',
  CU_FOR_LOOP: 'for %1 = %2 to %3 loop',
  CU_HAPPINESS: 'happiness',
  CU_TEMPERATURE: 'temperature',
  CU_HUNGER: 'hunger',
  CU_WEIGHT: 'weight',
  CU_PLAYER_POSITION: 'player position list',
  CU_ITEM_CONDITION: 'item condition',
  CU_ITEM_NAME: 'item name',
  CU_WORLD_TIME: 'world time',
  CU_WORLD_BLOCK_AT: 'block at',
  CU_MATH_RANDOM: 'random integer',
  CU_MATH_TO: 'to',
  CU_STRING_CONTAINS: 'contains',
  CU_TRUE: 'true',
  CU_FALSE: 'false',
  CU_IS_ALIVE: 'is alive',
  CU_NOT: 'not',
  CU_VAR_SET: 'set',
  CU_VAR_CHANGE: 'change',
  CU_VAR_TO: 'to',
  CU_VAR_BY: 'by',
  CU_LIST_CREATE: 'create list',
  CU_LIST_GET: 'list %1 item %2',
  CU_LIST_LENGTH: 'list %1 length',
  CU_LIST_ADD: 'add %2 to list %1',
  CU_REGISTER_BUILDING: 'register building id %1 name %2 desc %3',
  CU_BUILDING_SET_PROPERTY: 'building %1 set %2 to %3',
  CU_REGISTER_TILE: 'register tile id %1 name %2 desc %3',
  CU_TILE_SET_PROPERTY: 'tile %1 set %2 to %3',
  CU_REGISTER_LOCALE: 'locale %1 id %2 zh %3 en %4',
  CU_REGISTER_CREATURE: 'register creature id %1 name %2 desc %3 sprite %4 health %5',
  CU_REGISTER_ANIMATION: 'register animation id %1 sheet %2 frame w %3 frame h %4 fps %5 loop %6',
  CU_SPAWN_CREATURE: 'spawn creature %1 at X %2 Y %3',
  CU_SET_CREATURE_POS: 'set creature %1 position X %2 Y %3',
  CU_MOVE_CREATURE_TO: 'move creature %1 to X %2 Y %3 speed %4',
  CU_DESTROY_CREATURE: 'destroy creature %1',
  CU_PLAY_CREATURE_ANIMATION: 'play creature %1 animation %2',
  CU_CREATURE_POSITION: 'position list of creature %1',
  CU_PLAYER_HEALTH: 'torso skin health',
  CU_PLAYER_MAX_HEALTH: 'max skin health',
  CU_PLAYER_STAMINA: 'stamina',
  CU_PLAYER_OXYGEN: 'SpO2',
  CU_PLAYER_SLEEP_QUALITY: 'consciousness',
  CU_PLAYER_PAIN: 'head pain',
  CU_PLAYER_STRESS: 'total pain',
  CU_PLAYER_HEART_RATE: 'heart rate',
  CU_PLAYER_BLOOD_PRESSURE: 'blood pressure',
  CU_PLAYER_IMMUNITY: 'immunity',
  CU_PLAYER_THIRST: 'thirst',
  CU_PLAYER_STR: 'player STR',
  CU_PLAYER_RES: 'player RES',
  CU_PLAYER_INT_SKILL: 'player INT',
  CU_PLAYER_EXP_STR: 'STR experience',
  CU_PLAYER_EXP_RES: 'RES experience',
  CU_PLAYER_EXP_INT: 'INT experience',
  CU_ITEM_MAX_CONDITION: 'item max condition',
  CU_ITEM_WEIGHT: 'item weight',
  CU_ITEM_VALUE: 'item value',
  CU_WORLD_SET_TILE: 'set tile X %1 Y %2 to %3',
  CU_WORLD_SPAWN_ITEM: 'spawn %3 at X %1 Y %2',
  CU_WORLD_DESTROY_BLOCK: 'destroy block X %1 Y %2',
  CU_WORLD_REPLACE_BLOCK: 'replace block X %1 Y %2 from %3 to %4',
  CU_GIVE_ITEM: 'give player item %1 ×%2',
  CU_GIVE_ITEM_SLOT: 'give player item %1 to slot %2 ×%3',
  CU_MATH_CLAMP: 'clamp %1 between %2 and %3',
  CU_ITEM_IS_EQUIPPED: 'is item equipped',
  CU_ITEM_IS_IN_INVENTORY: 'is item in inventory',
  CU_ITEM_CUSTOM: 'custom item',
  CU_ITEM_VANILLA: 'item',
  CU_LIMB_INDEX: 'limb',
  // Extended Body getters
  CU_PLAYER_ENERGY: 'energy',
  CU_PLAYER_BRAIN_HEALTH: 'brain integrity',
  CU_PLAYER_SHOCK: 'shock',
  CU_PLAYER_BLOOD_VOLUME: 'blood volume',
  CU_PLAYER_RESPIRATORY_RATE: 'respiratory rate',
  CU_PLAYER_SICKNESS: 'sickness',
  CU_PLAYER_ADRENALINE: 'adrenaline',
  CU_PLAYER_RADIATION: 'radiation sickness',
  CU_PLAYER_WETNESS: 'wetness',
  CU_PLAYER_CLOTHING_TEMP: 'clothing temperature',
  CU_PLAYER_ENCUMBRANCE: 'encumbrance',
  CU_PLAYER_BLEED_SPEED: 'total bleeding speed',
  // Extended Body booleans
  CU_PLAYER_CONSCIOUS: 'is conscious',
  CU_PLAYER_STANDING: 'is standing',
  CU_PLAYER_GROUNDED: 'is grounded',
  CU_PLAYER_IN_WATER: 'is in water',
  CU_PLAYER_BREATHING: 'is breathing',
  CU_PLAYER_CROUCHING: 'is crouching',
  // Extended Body setters
  CU_SET_PLAYER_PROPERTY: 'set player %1 to %2',
  CU_SET_PLAYER_FLAG: 'set player %1 to %2',
  CU_SET_SKILL: 'set skill %1 to %2',
  CU_SET_SKILL_RANGE: 'set skill %1 experience range %2 to %3',
  CU_SET_LIMB_PROPERTY: 'limb %2 %1 = %3',
  CU_SET_LIMB_FLAG: 'limb %2 %1 = %3',
  // Extended Body actions
  CU_RAGDOLL: 'ragdoll',
  CU_JUMP: 'jump',
  CU_SWITCH_HANDS: 'switch hands',
  CU_THROW_ITEM: 'throw item',
  // Limb
  CU_LIMB_SKIN_HEALTH: 'skin health',
  CU_LIMB_MUSCLE_HEALTH: 'muscle health',
  CU_LIMB_PAIN: 'limb pain',
  CU_LIMB_BLEED: 'limb bleeding',
  CU_LIMB_INFECTION: 'limb infection',
  CU_LIMB_BROKEN: 'is fractured',
  CU_LIMB_DISLOCATED: 'is dislocated',
  CU_LIMB_INFECTED: 'is infected',
  CU_LIMB_DISMEMBERED: 'is dismembered',
  CU_LIMB_BREAK: 'break limb',
  CU_LIMB_MEND: 'mend limb',
  CU_LIMB_DISLOCATE: 'dislocate limb',
  CU_LIMB_UNDISLOCATE: 'undislocate limb',
  CU_LIMB_DISMEMBER: 'dismember',
  // Item getters
  CU_ITEM_ID: 'item id',
  CU_ITEM_CATEGORY: 'item category',
  // World
  CU_WORLD_DEPTH: 'player depth (meters)',
  // Item properties
  CU_SET_ITEM_CATEGORY: 'set item category id %1 category %2',
  CU_SET_ITEM_BASE_STATS: 'set item base stats id %1 weight %2 value %3 decay %4 minutes %5 recognition %6 spawn freq %7',
  CU_ITEM_CONTAINER: 'set container properties\nid %1\ncapacity %2\nmax weight %3\nencumbrance %4\nvisible %5\ntag restriction %6',
  CU_ITEM_TOOL: 'set weapon/tool properties\nid %1\ndamage %2\nstructural %3\ndistance %4\nknockback %5\ncooldown %6\nstamina %7\npiercing %8',
  CU_ITEM_WEARABLE: 'set wearable properties\nid %1\nlimb %2\nslot %3\narmor %4\nisolation %5\ndurability loss %6',
  CU_REGISTER_LIQUID: 'register liquid id %1 name %2 desc %3',
  CU_LIQUID_COLOR: 'set liquid color id %1 R %2 G %3 B %4',
  CU_LIQUID_VALUE: 'set liquid value id %1 value per liter %2',
  CU_LIQUID_FLAGS: 'liquid flags\nid %1\ndrinkable %2\nmedical %3\ninjectable %4\ninjection sickness %5\nunobtainable %6',
  CU_ITEM_LIQUID_CONTAINER: 'set liquid container\nid %1\ncapacity %2\nauto fill %3\nliquid id %4\namount %5',
  CU_ITEM_BATTERY: 'set battery properties\nid %1\npreset %2\ninitial charge %3\nspawn with battery %4',
  CU_ITEM_LIGHT: 'set light properties id %1 intensity %2 radius %3 R %4 G %5 B %6',
  CU_ITEM_BANDAGE: 'set bandage properties id %1 effectiveness %2 skin heal %3 bandage slow %4 pain %5 bone %6 dislocation %7',
  CU_ITEM_SYRINGE: 'set syringe properties\nid %1\ncapacity %2\nper use %3\nauto fill %4\nliquid id %5\namount %6',
  CU_ITEM_GUN: 'set gun properties\nid %1\nammo type %2\nfiring mode %3\nfeed type %4\nmag capacity %5\nanimal dmg %6\nstruct dmg %7\nknockback %8\ncondition loss %9\nloudness %10\ngas time %11\nshots per fire %12\nvertical spread %13\nracked sprite %14\nnormal no-mag %15\nracked no-mag %16\nfire sound %17\nrack sound %18\nunrack sound %19',
  CU_ITEM_MAGAZINE: 'set magazine properties\nid %1\nammo type %2\nmax rounds %3\nstart rounds %4',
  // Function
  CU_PARAM: 'param %1 type %2',
  CU_DEFINE_FUNCTION: 'define function %1 return %2',
  CU_DEFINE_FUNCTION_CONTAINER: 'params',
  CU_DEFINE_FUNCTION_ITEM: 'param',
  CU_RETURN: 'return %1',
  CU_GET_PARAM: 'param %1',
  CU_CALL_FUNCTION: 'call %1',
  CU_CALL_FUNCTION_VALUE: 'call %1',
  CU_CALL_FUNCTION_CONTAINER: 'args',
  CU_CALL_FUNCTION_ITEM: 'arg',
  // UI
  CU_SHOW_CONTROL: 'show control %1',
  CU_HIDE_CONTROL: 'hide control %1',
  CU_SET_CONTROL_PROPERTY: 'set control %1 property %2 to %3',
  CU_GET_TEXTFIELD_CONTENT: 'content of textfield %1',
  CU_GET_CONTROL_VALUE: 'value of control %1',
  CU_GET_TOGGLE_STATE: 'state of toggle %1',
  CU_REGISTER_MOD_OPTION: 'setting %2 = %1',
  CU_CFG_GET: '%1 config %2',
  CU_CFG_SET: 'set %1 config %2 = %3',
  CU_REGISTER_KEYBIND: 'register keybind %1: %2',
  CU_KEY_CODE: 'key %1',
  CU_KEY_SPRITE: 'key icon %1',
  CU_FRIENDLY_KEY_NAME: 'key name %1',
  CU_KEYBIND_CODE: 'keybind code %1',
  CU_LOAD_EMBEDDED_SPRITE: 'embedded sprite %1 @%2',
  CU_SPLIT_SPRITE_SHEET: 'sheet %2x%3 frame %4',
  CU_CACHE_SPRITE: 'cache sprite %1',
  CU_GET_CACHED_SPRITE: 'cached sprite %1',
  CU_REGISTER_BUNDLE: 'register bundle %1: %2',
  CU_BUNDLE_ASSET: 'bundle asset %1: %2',
  CU_FRAME_ANIMATION: 'frame animation %1 (%2 fps)',
  CU_LOAD_TEXTURE_FILE: 'texture %1 (%2/%3)',
  CU_LIQUID_MATERIAL: 'liquid material %1',
  CU_LIQUID_TILE_MATERIAL: 'liquid texture file %1',
  CU_ALERT: 'alert %1',
  CU_DELAY: 'after %1 seconds',
  CU_CALL_WHEN: 'when %1 is true',
  CU_CONSOLE_LOG: 'console log %1',
  CU_TALK_ELECTRONIC: 'electronic talk %1',
  CU_END_MINIGAME: 'end minigame',
  CU_MOODLE: 'moodle intensity %1 name %2',
  CU_MOODLE_ANIMATED: 'animated moodle intensity %1 name %2',
  CU_MOUSE_POS: 'mouse position',
  CU_GET_HELD_ITEM: 'held item',
  CU_GET_HOVERED_ITEM: 'hovered item',
  CU_IS_IN_WORLD: 'in world',
  CU_HAS_EQUIPPED: 'equipped %1',
  CU_IS_MODDED_ITEM: '%1 is modded item',
  CU_IS_MINIGAME_BUSY: 'minigame in progress',
  CU_SET_WORN_SPRITE: 'worn sprite of %1 = %2',
  CU_SET_MULTI_WORN_SPRITE: 'worn sprite of %1 limb %2 = %3',
  CU_EDIT_VANILLA_ITEM: 'edit vanilla item %1',
  CU_REGISTER_LIQUID_TILE: 'register liquid tile %1 (%2)',
  CU_PLACE_LIQUID_TILE: 'place liquid tile %1 at (%2, %3)',
  CU_FLOOD_LIQUID_TILE: 'flood fill liquid tile %1 at (%2, %3) max %4',
  CU_REGISTER_STRUCTURE_FILE: 'register structure %1: %2',
  CU_PLACE_STRUCTURE: 'place structure %1 at (%2, %3)',
  CU_STRUCTURE_SPAWN_COUNTS: 'structure %1 spawn counts %2',
  CU_PLAY_BODY_ANIMATION: 'play body animation %1: %2',
  CU_STOP_BODY_ANIMATION: 'stop body animation',
  CU_REGISTER_CONSOLE_COMMAND: 'register console command %1: %2',
  CU_CONSOLE_ARG: 'command arg %1',
};

const MSG_RU: Record<string, string> = {
  CU_WHEN_AWAKE: 'при запуске мода',
  CU_WHEN_UPDATE: 'каждый кадр',
  CU_WHEN_HURT: 'при получении урона',
  CU_WHEN_DIE: 'при смерти',
  CU_WHEN_PICKUP: 'при поднятии предмета',
  CU_WHEN_DROP: 'при выбрасывании предмета',
  CU_WHEN_WEAR: 'при экипировке',
  CU_WHEN_HEAL: 'при лечении',
  CU_WHEN_LASTSTAND: 'при последнем шансе',
  CU_WHEN_ENTER_WORLD: 'при входе в мир',
  CU_WHEN_BUTTON_PRESSED: 'при нажатии кнопки %1',
  CU_REGISTER_ITEM: 'зарегистрировать предмет id %1 название %2 описание %3 спрайт %4',
  CU_SPRITE_REF: 'спрайт %1',
  CU_REGISTER_STATUS: 'зарегистрировать эффект id %1 название %2 тип %3 описание %4 спрайт %5',
  CU_STATUS_REF: 'эффект %1',
  CU_STATUS_GET: '%2 эффекта %1',
  CU_STATUS_SET: 'установить %1 уровень %2 на %3',
  CU_DEFINE_ITEM_USE: 'при использовании %1',
  CU_DEFINE_ITEM_LIMB_USE: 'при использовании конечностью %1',
  CU_ITEM_SET_PROPERTY: 'установить предмету %1 свойство %2 = %3',
  CU_ITEM_SET_TAG: 'установить предмету %1 тег %2',
  CU_ITEM_SET_START_CONDITION: 'установить начальное состояние %1 = %2',
  CU_REGISTER_RECIPE: 'рецепт %1 → %2 ×%3 прочн%4 прочн materials%5 ремонт%6 инт%7',
  CU_EAT: 'есть голод %1 прибавка веса %2',
  CU_DRINK: 'пить количество %1',
  CU_TALK: 'сказать %1',
  CU_RUN_COMMAND: 'выполнить команду %1',
  CU_SLEEP: 'спать',
  CU_WAKE: 'проснуться',
  CU_ITEM_USE: 'предмет %1 %2',
  CU_ITEM_CONSUME: 'потребить %1 предмет кол-во %2',
  CU_ITEM_SET_CONDITION: 'установить %1 прочность %2 %3',
  CU_ITEM_SET_WEIGHT: 'установить %1 вес %2',
  CU_ITEM_SET_VALUE: 'установить %1 стоимость %2',
  CU_ITEM_SET_DECAY: 'установить %1 гниение минут %2',
  CU_ITEM_SET_SLOT_ROTATION: 'установить %1 поворот слота %2',
  CU_PLAY_SOUND: 'воспроизвести звук %1',
  CU_PLAY_SOUND_AT: 'воспроизвести звук %1 поз(%2,%3) громк%4',
  CU_IF: 'если %1 то',
  CU_ELSE: 'иначе',
  CU_REPEAT: 'повторить %1 раз',
  CU_WHILE: 'пока %1',
  CU_FOR_LOOP: 'от %1 = %2 до %3',
  CU_HAPPINESS: 'счастье',
  CU_TEMPERATURE: 'температура',
  CU_HUNGER: 'голод',
  CU_WEIGHT: 'вес',
  CU_PLAYER_POSITION: 'список позиций игрока',
  CU_ITEM_CONDITION: 'прочность предмета',
  CU_ITEM_NAME: 'название предмета',
  CU_WORLD_TIME: 'время мира',
  CU_WORLD_BLOCK_AT: 'блок',
  CU_MATH_RANDOM: 'случайное целое',
  CU_MATH_TO: 'до',
  CU_STRING_CONTAINS: 'содержит',
  CU_TRUE: 'истина',
  CU_FALSE: 'ложь',
  CU_IS_ALIVE: 'жив ли',
  CU_NOT: 'не',
  CU_VAR_SET: 'установить',
  CU_VAR_CHANGE: 'изменить',
  CU_VAR_TO: 'на',
  CU_VAR_BY: 'на',
  CU_LIST_CREATE: 'создать список',
  CU_LIST_GET: 'список %1 элемент %2',
  CU_LIST_LENGTH: 'список %1 длина',
  CU_LIST_ADD: 'добавить %2 в список %1',
  CU_REGISTER_BUILDING: 'зарегистрировать здание id %1 название %2 описание %3',
  CU_BUILDING_SET_PROPERTY: 'здание %1 установить %2 = %3',
  CU_REGISTER_TILE: 'зарегистрировать тайл id %1 название %2 описание %3',
  CU_TILE_SET_PROPERTY: 'тайл %1 установить %2 = %3',
  CU_REGISTER_LOCALE: 'локализация %1 id %2 кит %3 анг %4',
  CU_REGISTER_CREATURE: 'зарегистрировать существо id %1 название %2 описание %3 спрайт %4 здоровье %5',
  CU_REGISTER_ANIMATION: 'зарегистрировать анимацию id %1 лист %2 ширина кадра %3 высота кадра %4 кадр/с %5 %6',
  CU_SPAWN_CREATURE: 'создать существо %1 на X %2 Y %3',
  CU_SET_CREATURE_POS: 'установить существу %1 позицию X %2 Y %3',
  CU_MOVE_CREATURE_TO: 'переместить существо %1 к X %2 Y %3 скорость %4',
  CU_DESTROY_CREATURE: 'уничтожить существо %1',
  CU_PLAY_CREATURE_ANIMATION: 'проиграть существу %1 анимацию %2',
  CU_CREATURE_POSITION: 'список позиций существа %1',
  CU_PLAYER_HEALTH: 'здоровье кожи туловища',
  CU_PLAYER_MAX_HEALTH: 'макс. здоровье кожи',
  CU_PLAYER_STAMINA: 'выносливость',
  CU_PLAYER_OXYGEN: 'кислород в крови',
  CU_PLAYER_SLEEP_QUALITY: 'сознание',
  CU_PLAYER_PAIN: 'боль головы',
  CU_PLAYER_STRESS: 'общая боль',
  CU_PLAYER_HEART_RATE: 'пульс',
  CU_PLAYER_BLOOD_PRESSURE: 'давление',
  CU_PLAYER_IMMUNITY: 'иммунитет',
  CU_PLAYER_THIRST: 'жажда',
  CU_PLAYER_STR: 'СИЛ',
  CU_PLAYER_RES: 'ВЫН',
  CU_PLAYER_INT_SKILL: 'ИНТ',
  CU_PLAYER_EXP_STR: 'опыт СИЛ',
  CU_PLAYER_EXP_RES: 'опыт ВЫН',
  CU_PLAYER_EXP_INT: 'опыт ИНТ',
  CU_ITEM_MAX_CONDITION: 'макс. прочность',
  CU_ITEM_WEIGHT: 'вес предмета',
  CU_ITEM_VALUE: 'стоимость предмета',
  CU_WORLD_SET_TILE: 'установить тайл X %1 Y %2 = %3',
  CU_WORLD_SPAWN_ITEM: 'создать %3 на X %1 Y %2',
  CU_WORLD_DESTROY_BLOCK: 'уничтожить блок X %1 Y %2',
  CU_WORLD_REPLACE_BLOCK: 'заменить блок X %1 Y %2 с %3 на %4',
  CU_GIVE_ITEM: 'выдать предмет %1 ×%2',
  CU_GIVE_ITEM_SLOT: 'выдать предмет %1 в слот %2 ×%3',
  CU_MATH_CLAMP: 'ограничить %1 от %2 до %3',
  CU_ITEM_IS_EQUIPPED: 'предмет экипирован',
  CU_ITEM_IS_IN_INVENTORY: 'предмет в инвентаре',
  CU_ITEM_CUSTOM: 'свой предмет',
  CU_ITEM_VANILLA: 'предмет',
  CU_LIMB_INDEX: 'конечность',
  CU_PLAYER_ENERGY: 'энергия',
  CU_PLAYER_BRAIN_HEALTH: 'целостность мозга',
  CU_PLAYER_SHOCK: 'шок',
  CU_PLAYER_BLOOD_VOLUME: 'объём крови',
  CU_PLAYER_RESPIRATORY_RATE: 'частота дыхания',
  CU_PLAYER_SICKNESS: 'тошнота',
  CU_PLAYER_ADRENALINE: 'адреналин',
  CU_PLAYER_RADIATION: 'радиация',
  CU_PLAYER_WETNESS: 'влажность',
  CU_PLAYER_CLOTHING_TEMP: 'температура одежды',
  CU_PLAYER_ENCUMBRANCE: 'нагрузка',
  CU_PLAYER_BLEED_SPEED: 'общая скорость кровотечения',
  CU_PLAYER_CONSCIOUS: 'в сознании',
  CU_PLAYER_STANDING: 'стоит',
  CU_PLAYER_GROUNDED: 'на земле',
  CU_PLAYER_IN_WATER: 'в воде',
  CU_PLAYER_BREATHING: 'дышит',
  CU_PLAYER_CROUCHING: 'присел',
  CU_SET_PLAYER_PROPERTY: 'у игрока %1 = %2',
  CU_SET_PLAYER_FLAG: 'у игрока %1 = %2',
  CU_SET_SKILL: 'навык %1 = %2',
  CU_SET_SKILL_RANGE: 'диапазон опыта навыка %1 от %2 до %3',
  CU_SET_LIMB_PROPERTY: 'у конечности %2 %1 = %3',
  CU_SET_LIMB_FLAG: 'у конечности %2 %1 = %3',
  CU_RAGDOLL: ' ragdoll',
  CU_JUMP: 'прыжок',
  CU_SWITCH_HANDS: 'поменять руки',
  CU_THROW_ITEM: 'бросить предмет',
  CU_LIMB_SKIN_HEALTH: 'здоровье кожи',
  CU_LIMB_MUSCLE_HEALTH: 'здоровье мышц',
  CU_LIMB_PAIN: 'боль конечности',
  CU_LIMB_BLEED: 'кровотечение конечности',
  CU_LIMB_INFECTION: 'инфекция конечности',
  CU_LIMB_BROKEN: 'конечность сломана',
  CU_LIMB_DISLOCATED: 'конечность вывихнута',
  CU_LIMB_INFECTED: 'конечность инфицирована',
  CU_LIMB_DISMEMBERED: 'конечность ампутирована',
  CU_LIMB_BREAK: 'сломать конечность',
  CU_LIMB_MEND: 'вылечить конечность',
  CU_LIMB_DISLOCATE: 'вывихнуть конечность',
  CU_LIMB_UNDISLOCATE: 'вправить конечность',
  CU_LIMB_DISMEMBER: 'ампутировать',
  CU_ITEM_ID: 'id предмета',
  CU_ITEM_CATEGORY: 'категория предмета',
  CU_WORLD_DEPTH: 'глубина (метры)',
  CU_SET_ITEM_CATEGORY: 'установить категорию id %1 категория %2',
  CU_SET_ITEM_BASE_STATS: 'установить базовые id %1 вес %2 стоимость %3 гниение %4 мин %5 распознавание %6 спавн %7',
  CU_ITEM_CONTAINER: 'свойства контейнера\nid %1\nвместимость %2\nмакс вес %3\nнагрузка %4\nвидимый %5\nтеги %6',
  CU_ITEM_TOOL: 'свойства оружия/инструмента\nid %1\nурон %2\nструктура %3\nдистанция %4\nотбрасывание %5\nзадержка %6\nвыносливость %7\nпробитие %8',
  CU_ITEM_WEARABLE: 'свойства экипировки\nid %1\nконечность %2\nслот %3\nброня %4\nизоляция %5\nпотеря прочности %6',
  CU_REGISTER_LIQUID: 'зарегистрировать жидкость id %1 название %2 описание %3',
  CU_LIQUID_COLOR: 'установить цвет жидкости id %1 R %2 G %3 B %4',
  CU_LIQUID_VALUE: 'установить стоимость жидкости id %1 стоимость за литр %2',
  CU_LIQUID_FLAGS: 'флаги жидкости\nid %1\nпитьевая %2\nмедицинская %3\nинъекция %4\nтошнота от инъекции %5\nнедоступна %6',
  CU_ITEM_LIQUID_CONTAINER: 'контейнер для жидкости\nid %1\nвместимость %2\nавтозаполнение %3\nid жидкости %4\nколичество %5',
  CU_ITEM_BATTERY: 'свойства батареи\nid %1\npreset %2\nначальный заряд %3\nсо спавном %4',
  CU_ITEM_LIGHT: 'свойства света id %1 интенсивность %2 радиус %3 R %4 G %5 B %6',
  CU_ITEM_BANDAGE: 'свойства бинта id %1 эффективность %2 лечение кожи %3 замедление %4 боль %5 кость %6 вывих %7',
  CU_ITEM_SYRINGE: 'свойства шприца\nid %1\nвместимость %2\nза использование %3\nавтозаполнение %4\nid жидкости %5\nколичество %6',
  CU_ITEM_GUN: 'свойства оружия\nid %1\nтип патронов %2\nрежим огня %3\nподача %4\nемкость магазина %5\nурон животным %6\nурон структуре %7\nотбрасывание %8\nпотеря прочности %9\nгромкость %10\nвремя газа %11\nвыстрелов за раз %12\nвертикаль разброс %13\nспрайт заряда %14\nбез магазина норм %15\nбез магазина заряд %16\nзвук выстрела %17\nзвук заряда %18\nзвук разряда %19',
  CU_ITEM_MAGAZINE: 'свойства магазина\nid %1\nтип патронов %2\nмакс снарядов %3\nначальные снаряды %4',
  CU_PARAM: 'параметр %1 тип %2',
  CU_DEFINE_FUNCTION: 'функция %1 возврат %2',
  CU_DEFINE_FUNCTION_CONTAINER: 'параметры',
  CU_DEFINE_FUNCTION_ITEM: 'параметр',
  CU_RETURN: 'вернуть %1',
  CU_GET_PARAM: 'параметр %1',
  CU_CALL_FUNCTION: 'вызов %1',
  CU_CALL_FUNCTION_VALUE: 'вызов %1',
  CU_CALL_FUNCTION_CONTAINER: 'аргументы',
  CU_CALL_FUNCTION_ITEM: 'аргум.',
  // UI
  CU_SHOW_CONTROL: 'показать элемент %1',
  CU_HIDE_CONTROL: 'скрыть элемент %1',
  CU_SET_CONTROL_PROPERTY: 'установить элемент %1 свойство %2 значение %3',
  CU_GET_TEXTFIELD_CONTENT: 'содержимое текстового поля %1',
  CU_GET_CONTROL_VALUE: 'значение элемента %1',
  CU_GET_TOGGLE_STATE: 'состояние переключателя %1',
  CU_REGISTER_MOD_OPTION: 'настройка %2 = %1',
  CU_CFG_GET: '%1 настройка %2',
  CU_CFG_SET: 'установить %1 настройку %2 = %3',
  CU_REGISTER_KEYBIND: 'зарегистрировать клавишу %1: %2',
  CU_KEY_CODE: 'клавиша %1',
  CU_KEY_SPRITE: 'иконка клавиши %1',
  CU_FRIENDLY_KEY_NAME: 'имя клавиши %1',
  CU_KEYBIND_CODE: 'код клавиши %1',
  CU_LOAD_EMBEDDED_SPRITE: 'встроенный спрайт %1 @%2',
  CU_SPLIT_SPRITE_SHEET: 'сетка %2x%3 кадр %4',
  CU_CACHE_SPRITE: 'записать спрайт %1',
  CU_GET_CACHED_SPRITE: 'спрайт из кэша %1',
  CU_REGISTER_BUNDLE: 'зарегистрировать бандл %1: %2',
  CU_BUNDLE_ASSET: 'ресурс бандла %1: %2',
  CU_FRAME_ANIMATION: 'кадровая анимация %1 (%2 к/с)',
  CU_LOAD_TEXTURE_FILE: 'текстура %1 (%2/%3)',
  CU_LIQUID_MATERIAL: 'материал жидкости %1',
  CU_LIQUID_TILE_MATERIAL: 'файл текстуры жидкости %1',
  CU_ALERT: 'всплывашка %1',
  CU_DELAY: 'после %1 секунд',
  CU_CALL_WHEN: 'когда %1 истинно',
  CU_CONSOLE_LOG: 'лог в консоль %1',
  CU_TALK_ELECTRONIC: 'электро-реплика %1',
  CU_END_MINIGAME: 'завершить мини-игру',
  CU_MOODLE: 'мудл сила %1 имя %2',
  CU_MOODLE_ANIMATED: 'аним. мудл сила %1 имя %2',
  CU_MOUSE_POS: 'позиция курсора',
  CU_GET_HELD_ITEM: 'предмет в руке',
  CU_GET_HOVERED_ITEM: 'предмет под курсором',
  CU_IS_IN_WORLD: 'в мире',
  CU_HAS_EQUIPPED: 'снаряжено %1',
  CU_IS_MODDED_ITEM: '%1 предмет мода',
  CU_IS_MINIGAME_BUSY: 'мини-игра идёт',
  CU_SET_WORN_SPRITE: 'снаряжённый спрайт %1 = %2',
  CU_SET_MULTI_WORN_SPRITE: 'снаряжённый спрайт %1 конечность %2 = %3',
  CU_EDIT_VANILLA_ITEM: 'изменить стандартный предмет %1',
  CU_REGISTER_LIQUID_TILE: 'зарегистрировать жидкий тайл %1 (%2)',
  CU_PLACE_LIQUID_TILE: 'поставить жидкий тайл %1 в (%2, %3)',
  CU_FLOOD_LIQUID_TILE: 'заливка жидкого тайла %1 в (%2, %3) макс %4',
  CU_REGISTER_STRUCTURE_FILE: 'зарегистрировать структуру %1: %2',
  CU_PLACE_STRUCTURE: 'поставить структуру %1 в (%2, %3)',
  CU_STRUCTURE_SPAWN_COUNTS: 'структура %1 счётчики спавна %2',
  CU_PLAY_BODY_ANIMATION: 'воспроизвести анимацию тела %1: %2',
  CU_STOP_BODY_ANIMATION: 'остановить анимацию тела',
  CU_REGISTER_CONSOLE_COMMAND: 'зарегистрирать команду %1: %2',
  CU_CONSOLE_ARG: 'аргумент команды %1',
};

export function setMessages(lang: string) {
  const msgs = lang === 'zh' ? MSG_ZH : lang === 'ru' ? MSG_RU : MSG_EN;
  for (const [key, val] of Object.entries(msgs)) {
    (Blockly.Msg as Record<string, string>)[key] = val;
  }
}

// ── Define blocks ──
let _cuFuncMutatorRegistered = false;
export function defineBlocks(lang: string = 'zh') {
  _blocksLang = lang;
  const defs = applyLang(lang);
  Blockly.defineBlocksWithJsonArray(defs);

  // Force lists_create_with to horizontal
  const blocks = (Blockly as any).Blocks;
  if (blocks && blocks.lists_create_with) {
    blocks.lists_create_with.inputsInline = true;
  }
  // Force function blocks to horizontal
  for (const t of ['cu_define_function', 'cu_call_function', 'cu_call_function_value']) {
    if (blocks && blocks[t]) blocks[t].inputsInline = true;
  }

  // Extension: dynamically change VALUE input type based on PROP dropdown
  if (!_propTypeCheckRegistered) {
    _propTypeCheckRegistered = true;
    Blockly.Extensions.register('prop_type_check', function(this: Blockly.Block) {
      const PROP_CHECK: Record<string, string[]> = {
        condition: ['Number'], weight: ['Number'], value: ['Number'],
        usable: ['Boolean'], wearable: ['Boolean'],
        useLimbAction: ['Boolean'], destroyAtZeroCondition: ['Boolean'],
        placeable: [],
      };
      const updateCheck = () => {
        const prop = this.getFieldValue('PROP') as string;
        const input = this.getInput('VALUE');
        if (input) input.setCheck(PROP_CHECK[prop] || ['Number','String','Boolean','Item']);
      };
      updateCheck();
      this.onchange = function(e: Blockly.Events.Abstract) {
        if (e.type === Blockly.Events.BLOCK_CHANGE && (e as any).name === 'PROP') {
          updateCheck();
        }
      };
    });
  }

  // ═══ Function mutators ════════════════════════════════════════
  if (!_cuFuncMutatorRegistered) {
    _cuFuncMutatorRegistered = true;

    // --- cu_define_function mutator ---
    Blockly.Extensions.registerMutator('cu_define_function_mutator',
      {
        paramCount_: 0,
        mutationToDom(this: any) {
          const mutation = Blockly.utils.xml.createElement('mutation');
          mutation.setAttribute('paramCount', String(this.paramCount_));
          return mutation;
        },
        domToMutation(this: any, xmlElement: Element) {
          this.paramCount_ = parseInt(xmlElement.getAttribute('paramCount') || '0', 10);
          this.updateShape_();
        },
        saveExtraState(this: any) {
          return { paramCount: this.paramCount_ };
        },
        loadExtraState(this: any, state: any) {
          this.paramCount_ = state['paramCount'] || 0;
          this.updateShape_();
        },
        decompose(this: any, workspace: Blockly.WorkspaceSvg) {
          const topBlock = workspace.newBlock('cu_define_function_container');
          topBlock.initSvg();
          let conn = topBlock.getInput('STACK')!.connection;
          for (let i = 0; i < this.paramCount_; i++) {
            const item = workspace.newBlock('cu_define_function_item');
            item.initSvg();
            conn!.connect(item.previousConnection!);
            conn = item.nextConnection;
          }
          return topBlock;
        },
        compose(this: any, topBlock: Blockly.Block) {
          // Save current field values
          const fieldValues: { name: string; type: string }[] = [];
          for (let i = 0; i < this.paramCount_; i++) {
            fieldValues.push({
              name: this.getFieldValue('PARAM_NAME_' + i) || ('p' + i),
              type: this.getFieldValue('PARAM_TYPE_' + i) || 'int',
            });
          }
          let itemBlock = topBlock.getInputTargetBlock('STACK');
          const connections: (Blockly.Connection | null)[] = [];
          while (itemBlock && !itemBlock.isInsertionMarker()) {
            connections.push((itemBlock as any).valueConnection_);
            itemBlock = itemBlock.getNextBlock();
          }
          // Save BODY connection
          const bodyConn = this.getInput('BODY')?.connection?.targetConnection || null;
          this.paramCount_ = connections.length;
          this.updateShape_();
          // Reconnect params and restore field values
          const defaultNames = ['x', 'y', 'z', 'a', 'b', 'c', 'd', 'e'];
          for (let i = 0; i < this.paramCount_; i++) {
            if (connections[i]) connections[i]!.reconnect(this, 'PARAM' + i);
            if (fieldValues[i]) {
              this.setFieldValue(fieldValues[i].name, 'PARAM_NAME_' + i);
              this.setFieldValue(fieldValues[i].type, 'PARAM_TYPE_' + i);
            } else {
              this.setFieldValue(defaultNames[i] || ('p' + i), 'PARAM_NAME_' + i);
            }
          }
          // Reconnect BODY
          if (bodyConn) bodyConn.reconnect(this, 'BODY');
        },
        saveConnections(this: any, topBlock: Blockly.Block) {
          let itemBlock = topBlock.getInputTargetBlock('STACK');
          let i = 0;
          while (itemBlock && !itemBlock.isInsertionMarker()) {
            const input = this.getInput('PARAM' + i);
            (itemBlock as any).valueConnection_ = input && input.connection?.targetConnection || null;
            i++;
            itemBlock = itemBlock.getNextBlock();
          }
        },
        updateShape_(this: any) {
          const PARAM_TYPE_OPTIONS: [string, string][] = [
            ['整数','int'],['浮点数','float'],['字符串','string'],
            ['布尔','bool'],['物品','Item'],['状态效果','StatusEffect'],
          ];
          const TYPE_CHECK: Record<string, string[]> = {
            int: ['Number'], float: ['Number'], string: ['String'],
            bool: ['Boolean'], Item: ['Item'], StatusEffect: ['StatusEffect'],
          };
          // Remove excess PARAM inputs (keep only what we need)
          const existingParams: string[] = [];
          for (const inp of this.inputList) {
            if (inp.name.startsWith('PARAM')) existingParams.push(inp.name);
          }
          for (const name of existingParams) {
            const idx = parseInt(name.substring(5), 10);
            if (idx >= this.paramCount_) this.removeInput(name);
          }
          // Add missing PARAM inputs
          for (let i = 0; i < this.paramCount_; i++) {
            if (this.getInput('PARAM' + i)) continue;
            const inp = this.appendValueInput('PARAM' + i);
            if (i === 0) inp.appendField('参数');
            inp.appendField(new Blockly.FieldTextInput('x'), 'PARAM_NAME_' + i);
            const dd = new Blockly.FieldDropdown(PARAM_TYPE_OPTIONS, (val: string) => {
              inp.setCheck(TYPE_CHECK[val] || null);
              this.workspace?.resizeContents();
              return val;
            });
            inp.appendField(dd, 'PARAM_TYPE_' + i);
            const initType = dd.getValue() || 'int';
            inp.setCheck(TYPE_CHECK[initType] || null);
          }
          // Add BODY only if it doesn't exist yet
          if (!this.getInput('BODY')) {
            this.appendStatementInput('BODY');
          }
          this.setInputsInline(true);
        },
      },
      undefined,
      ['cu_define_function_item']
    );

    // --- cu_call_function / cu_call_function_value mutator ---
    Blockly.Extensions.registerMutator('cu_call_function_mutator',
      {
        argCount_: 0,
        mutationToDom(this: any) {
          const mutation = Blockly.utils.xml.createElement('mutation');
          mutation.setAttribute('argCount', String(this.argCount_));
          return mutation;
        },
        domToMutation(this: any, xmlElement: Element) {
          this.argCount_ = parseInt(xmlElement.getAttribute('argCount') || '0', 10);
          this.updateShape_();
        },
        saveExtraState(this: any) {
          return { argCount: this.argCount_ };
        },
        loadExtraState(this: any, state: any) {
          this.argCount_ = state['argCount'] || 0;
          this.updateShape_();
        },
        decompose(this: any, workspace: Blockly.WorkspaceSvg) {
          const topBlock = workspace.newBlock('cu_call_function_container');
          topBlock.initSvg();
          let conn = topBlock.getInput('STACK')!.connection;
          for (let i = 0; i < this.argCount_; i++) {
            const item = workspace.newBlock('cu_call_function_item');
            item.initSvg();
            conn!.connect(item.previousConnection!);
            conn = item.nextConnection;
          }
          return topBlock;
        },
        compose(this: any, topBlock: Blockly.Block) {
          let itemBlock = topBlock.getInputTargetBlock('STACK');
          const connections: (Blockly.Connection | null)[] = [];
          while (itemBlock && !itemBlock.isInsertionMarker()) {
            connections.push((itemBlock as any).valueConnection_);
            itemBlock = itemBlock.getNextBlock();
          }
          for (let i = 0; i < this.argCount_; i++) {
            const conn = this.getInput('ARG' + i)?.connection?.targetConnection;
            if (conn && connections.indexOf(conn) === -1) {
              conn.disconnect();
            }
          }
          this.argCount_ = connections.length;
          this.updateShape_();
          for (let i = 0; i < this.argCount_; i++) {
            if (connections[i]) {
              connections[i]!.reconnect(this, 'ARG' + i);
            }
          }
        },
        saveConnections(this: any, topBlock: Blockly.Block) {
          let itemBlock = topBlock.getInputTargetBlock('STACK');
          let i = 0;
          while (itemBlock && !itemBlock.isInsertionMarker()) {
            const input = this.getInput('ARG' + i);
            (itemBlock as any).valueConnection_ = input && input.connection?.targetConnection || null;
            i++;
            itemBlock = itemBlock.getNextBlock();
          }
        },
        updateShape_(this: any) {
          const toRemove: string[] = [];
          for (const inp of this.inputList) {
            if (inp.name.startsWith('ARG')) toRemove.push(inp.name);
          }
          for (const name of toRemove) {
            this.removeInput(name);
          }
          for (let i = 0; i < this.argCount_; i++) {
            const inp = this.appendValueInput('ARG' + i);
            if (i === 0) inp.appendField('参数');
          }
          this.setInputsInline(true);
        },
      },
      undefined,
      ['cu_call_function_item']
    );
  }
}

// ── Create sprite block in workspace ──────────────────────────────
export function createSpriteBlock(assetName: string, ws: Blockly.WorkspaceSvg) {
  try {
    const block = ws.newBlock('cu_sprite_ref') as any;
    block.setFieldValue(assetName, 'ASSET');
    block.initSvg();
    block.render();
    const metrics = ws.getMetrics();
    block.moveBy(metrics.viewLeft + metrics.viewWidth / 2 - 60, metrics.viewTop + metrics.viewHeight / 2 - 20);
  } catch (e) {
    console.error('Failed to create sprite block:', e);
  }
}

// ── C# Code Generator ──
export const csharpGenerator = new Blockly.Generator('CSharp');

const EVENT_TYPES = new Set(['cu_when_awake', 'cu_when_update', 'cu_when_hurt', 'cu_when_die', 'cu_when_pickup', 'cu_when_drop', 'cu_when_wear', 'cu_when_heal', 'cu_when_laststand', 'cu_when_enter_world', 'cu_when_button_pressed']);
const origBlockToCode = csharpGenerator.blockToCode.bind(csharpGenerator);
csharpGenerator.blockToCode = (block: Blockly.Block, opt_thisOnly?: boolean) => {
  if (block && EVENT_TYPES.has(block.type) && !opt_thisOnly) {
    const opening = origBlockToCode(block, true);
    const rest = (origBlockToCode(block.getNextBlock()) as string) || '';
    return opening + rest + '//ENDPATCH\n';
  }
  return origBlockToCode(block, opt_thisOnly);
};
const ORDER_ATOMIC = 0;

function floatSuffix(code: string): string {
  const trimmed = code.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}f`;
  if (trimmed.endsWith('f')) return trimmed;
  return `(float)(${trimmed})`;
}

csharpGenerator.scrub_ = function (block, code, thisOnly) {
  if (thisOnly) return code;
  const next = block.getNextBlock();
  if (next) return code + csharpGenerator.blockToCode(next);
  return code;
};

// Events – markers for post-processing in workspaceToCode override
csharpGenerator.forBlock['cu_when_awake'] = () => '//PATCH:Awake\n';
csharpGenerator.forBlock['cu_when_update'] = () => '//PATCH:Update\n';
csharpGenerator.forBlock['cu_when_hurt'] = () => '//PATCH:OnHurt\n';
csharpGenerator.forBlock['cu_when_die'] = () => '//PATCH:OnDie\n';
csharpGenerator.forBlock['cu_when_pickup'] = () => '//PATCH:PickUpItem\n';
csharpGenerator.forBlock['cu_when_drop'] = () => '//PATCH:DropItem\n';
csharpGenerator.forBlock['cu_when_wear'] = () => '//PATCH:WearWearable\n';
csharpGenerator.forBlock['cu_when_heal'] = () => '//EVENT:OnHeal\n';
csharpGenerator.forBlock['cu_when_laststand'] = () => '//EVENT:OnLastStand\n';
csharpGenerator.forBlock['cu_when_enter_world'] = () => '//PATCH:Start\n';
csharpGenerator.forBlock['cu_when_button_pressed'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myButton';
  return `//EVENT:OnButtonPressed:${id}\n`;
};

// Registration
csharpGenerator.forBlock['cu_register_item'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const name = block.getFieldValue('FULL_NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const spriteCode = gen.valueToCode(block, 'SPRITE_REF', ORDER_ATOMIC) || '';
  const spriteId = spriteCode.replace(/^"|"$/g, '') || null;
  const json = JSON.stringify({Id: id.replace(/^"|"$/g, ''), FullName: name, Description: desc, SpriteAssetId: spriteId});
  return `//REGISTER_ITEM:${json}\n`;
};
csharpGenerator.forBlock['cu_sprite_ref'] = (block, gen) => {
  const asset = block.getFieldValue('ASSET') || '';
  return [`"${asset}"`, ORDER_ATOMIC];
};
// safe ident: matches backend CodeEmitter.SafeIdent (alnum kept, others -> '_', M-prefix if empty/leading digit)
const statusClassName = (id: string) => {
  let s = id.replace(/[^a-zA-Z0-9]/g, '_');
  if (!s || /^[0-9]/.test(s)) s = 'M' + s;
  return 'Status_' + s;
};
csharpGenerator.forBlock['cu_status_ref'] = (block, gen) => {
  const id = block.getFieldValue('ID') || 'myStatus';
  return [`"${id}"`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_register_status'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myStatus"';
  const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
  const type = block.getFieldValue('TYPE');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const spriteCode = gen.valueToCode(block, 'SPRITE_REF', ORDER_ATOMIC) || '';
  const spriteId = spriteCode.replace(/^"|"$/g, '') || null;
  const json = JSON.stringify({Id: id.replace(/^"|"$/g, ''), FullName: name, Type: type, Description: desc, SpriteAssetId: spriteId});
  return `//REGISTER_STATUS:${json}\n`;
};
csharpGenerator.forBlock['cu_status_get'] = (block, gen) => {
  const statusCode = gen.valueToCode(block, 'STATUS', ORDER_ATOMIC) || '"myStatus"';
  const statusId = statusCode.replace(/^"|"$/g, '');
  const field = block.getFieldValue('FIELD');
  const prop = field === 'remaining' ? 'RemainingSeconds' : 'Level';
  return [`body.GetStatus<${statusClassName(statusId)}>().${prop}`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_status_set'] = (block, gen) => {
  const statusCode = gen.valueToCode(block, 'STATUS', ORDER_ATOMIC) || '"myStatus"';
  const statusId = statusCode.replace(/^"|"$/g, '');
  const level = gen.valueToCode(block, 'LEVEL', ORDER_ATOMIC) || '1';
  const remaining = gen.valueToCode(block, 'REMAINING', ORDER_ATOMIC) || '5';
  return `body.GetStatus<${statusClassName(statusId)}>().Level = ${float(level)}; body.GetStatus<${statusClassName(statusId)}>().RemainingSeconds = ${float(remaining)};\n`;
};
csharpGenerator.forBlock['cu_define_item_use'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"myItem"';
  const itemId = item.replace(/^"|"$/g, '');
  const inner = gen.blockToCode(block.getNextBlock()) as string || '';
  return `//ITEM_USE_ACTION:${itemId}\n${inner}//END_ITEM_USE_ACTION\n`;
};
csharpGenerator.forBlock['cu_define_item_limb_use'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"myItem"';
  const itemId = item.replace(/^"|"$/g, '');
  const inner = gen.blockToCode(block.getNextBlock()) as string || '';
  return `//ITEM_LIMB_USE_ACTION:${itemId}\n${inner}//END_ITEM_LIMB_USE_ACTION\n`;
};
csharpGenerator.forBlock['cu_item_set_property'] = (block, gen) => {
  const prop = block.getFieldValue('PROP');
  const target = gen.valueToCode(block, 'TARGET_ITEM', ORDER_ATOMIC) || '"myItem"';
  if (prop === 'placeable') {
    return `${target}.tags = "placeable";\n${target}.Stats.usable = true;\n${target}.Stats.usableWithLMB = true;\n`;
  }
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const itemProps = ['condition'];
  const numStatsProps = ['weight','slotRotation','rotSpeed','jumpHeightMultChange','wearableVisualOffset','spriteScale','scaleConditionToward'];
  const boolStatsProps = ['usable','wearable','useLimbAction','destroyAtZeroCondition','wearableArmor','wearableIsolation','wearableHitDurabilityLossMultiplier'];
  if (itemProps.includes(prop)) return `${target}.${prop} = ${float(v)};\n`;
  if (numStatsProps.includes(prop)) return `${target}.Stats.${prop} = ${float(v)};\n`;
  if (boolStatsProps.includes(prop)) return `${target}.Stats.${prop} = ${bool(v)};\n`;
  return `${target}.${prop} = ${v};\n`;
};
csharpGenerator.forBlock['cu_item_set_tag'] = (block, gen) => {
  const tag = block.getFieldValue('TAG') || 'placeable';
  const target = gen.valueToCode(block, 'TARGET_ITEM', ORDER_ATOMIC) || '"myItem"';
  return `${target}.Stats.tags = "${tag}";\n`;
};
csharpGenerator.forBlock['cu_item_set_start_condition'] = (block, gen) => {
  const target = gen.valueToCode(block, 'TARGET_ITEM', ORDER_ATOMIC) || '"myItem"';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '1';
  const id = target.replace(/^"|"$/g, '');
  return `//ITEM_START_CONDITION:{"Id":"${id.replace(/"/g, '\\"')}","Condition":${float(v)}}\n`;
};
// Helper: walk a lists_create_with block and extract item ID strings from each slot
function extractListItemIds(listBlock: Blockly.Block | null): string[] {
  const ids: string[] = [];
  if (!listBlock) return ids;
  let i = 0;
  while (listBlock.getInput('ADD' + i)) {
    const itemBlock = listBlock.getInputTargetBlock('ADD' + i);
    if (itemBlock) {
      const id = extractSingleItemId(itemBlock);
      if (id) ids.push(id);
    }
    i++;
  }
  return ids;
}

function extractSingleItemId(block: Blockly.Block): string | null {
  if (block.type === 'cu_item_custom' || block.type === 'cu_item_vanilla') {
    return (block.getFieldValue('ID') as string) || null;
  }
  if (block.type === 'cu_var_get') {
    return (block.getFieldValue('VAR') as string) || null;
  }
  return null;
}

csharpGenerator.forBlock['cu_register_recipe'] = (block, gen) => {
  const out = gen.valueToCode(block, 'OUTPUT', ORDER_ATOMIC) || '"ironBar"';
  const amt = gen.valueToCode(block, 'AMOUNT', ORDER_ATOMIC) || '1';
  const cond = gen.valueToCode(block, 'RESULT_CONDITION', ORDER_ATOMIC) || '-1';
  const ingCond = gen.valueToCode(block, 'INGREDIENT_CONDITION', ORDER_ATOMIC) || '0.9';
  const repair = gen.valueToCode(block, 'IS_REPAIR', ORDER_ATOMIC) || 'false';
  const intReq = gen.valueToCode(block, 'INT', ORDER_ATOMIC) || '2';

  // Walk the connected INPUTS list to extract real ingredient data
  const listBlock = block.getInputTargetBlock('INPUTS');
  const itemIds = extractListItemIds(listBlock);

  // Build List<RecipeItem> code from extracted IDs
  const recipeItems = itemIds.map(id =>
    `new RecipeItem(${floatSuffix(ingCond)}) { specificId = "${id}" }`
  ).join(', ');
  const inputsCode = `new List<RecipeItem> { ${recipeItems} }`;

  // Build code
  let code = `RecipeRegistry.Register(new Recipe {\n  INT = ${intReq},\n  result = new RecipeResult { id = ${out}, amount = ${amt}`;
  if (cond !== '-1') code += `, resultCondition = ${cond}`;
  code += ` },\n  items = ${inputsCode},\n  isRepair = ${repair}\n});\n`;

  // Build JSON with real ingredients
  const ingredients = itemIds.map(id => ({
    Mode: 'specific',
    Id: id,
    Amount: 1,
    IsLiquid: false,
    DestroyItem: true,
    MinimumCondition: parseFloat(ingCond) || 0.9,
  }));
  const json = JSON.stringify({
    ResultId: out.replace(/^"|"$/g, ''),
    Category: 'Tools',
    IntRequirement: parseInt(intReq) || 2,
    ResultAmount: parseInt(amt),
    ResultCondition: cond === '-1' ? 1 : parseFloat(cond),
    IsLiquidResult: false,
    Ingredients: ingredients,
  });

  return `//REGISTER_RECIPE:${json}\n`;
};

// Body
csharpGenerator.forBlock['cu_eat'] = (block, gen) => {
  const h = gen.valueToCode(block, 'HUNGER', ORDER_ATOMIC) || '12';
  const w = gen.valueToCode(block, 'WEIGHT_GAIN', ORDER_ATOMIC) || '0.5';
  return `body.Eat(${floatSuffix(h)}, ${floatSuffix(w)});\n`;
};
csharpGenerator.forBlock['cu_drink'] = (block, gen) => {
  const a = gen.valueToCode(block, 'AMOUNT', ORDER_ATOMIC) || '4';
  return `body.Drink(${floatSuffix(a)});\n`;
};
csharpGenerator.forBlock['cu_talk'] = (block, gen) => {
  const t = gen.valueToCode(block, 'TEXT', ORDER_ATOMIC) || '"Hello"';
  return `body.talker.Talk(${t});\n`;
};
csharpGenerator.forBlock['cu_run_command'] = (block, gen) => {
  const cmd = gen.valueToCode(block, 'COMMAND', ORDER_ATOMIC) || '"help"';
  return `ConsoleScript.instance.ExecuteCommand(${cmd});\n`;
};
csharpGenerator.forBlock['cu_sleep'] = () => 'body.sleeping = true;\n';
csharpGenerator.forBlock['cu_wake'] = () => 'body.WakeUp();\n';

// Item actions
csharpGenerator.forBlock['cu_item_use'] = (block) => {
  const target = block.getFieldValue('TARGET');
  const action = block.getFieldValue('ACTION');
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  if (action === 'use') return `${targetExpr}.Stats.useAction?.Invoke(body, ${targetExpr});\n`;
  if (action === 'drop') return `body.DropItem(${targetExpr});\n`;
  return `body.WearWearable(${targetExpr});\n`;
};
csharpGenerator.forBlock['cu_item_consume'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const amt = gen.valueToCode(block, 'AMOUNT', ORDER_ATOMIC) || '1';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  return `${targetExpr}.condition -= ${floatSuffix(amt)};\n`;
};
csharpGenerator.forBlock['cu_item_set_condition'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const op = block.getFieldValue('OP');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  if (op === '=') return `${targetExpr}.condition = ${float(v)};\n`;
  if (op === '+') return `${targetExpr}.condition += ${float(v)};\n`;
  return `${targetExpr}.condition -= ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_item_set_weight'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  return `${targetExpr}.Stats.weight = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_item_set_value'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  return `/* ${targetExpr}.value is registration-time only (ItemInfo.value), cannot be set at runtime */\n`;
};
csharpGenerator.forBlock['cu_item_set_decay'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  return `/* ${targetExpr}.decayMinutes is registration-time only (ItemInfo.decayMinutes), cannot be set at runtime */\n`;
};
csharpGenerator.forBlock['cu_item_set_slot_rotation'] = (block, gen) => {
  const target = block.getFieldValue('TARGET');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const targetExpr = target === 'this' ? 'item' : target === 'left' ? 'body.limbs[0].handItem' : 'body.limbs[1].handItem';
  return `${targetExpr}.Stats.slotRotation = ${float(v)};\n`;
};

// Sound
csharpGenerator.forBlock['cu_play_sound'] = (block) => {
  const s = block.getFieldValue('SOUND');
  return `Sound.Play("${s}", body.transform.position);\n`;
};
csharpGenerator.forBlock['cu_play_sound_at'] = (block, gen) => {
  const s = block.getFieldValue('SOUND');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const vol = gen.valueToCode(block, 'VOLUME', ORDER_ATOMIC) || '1';
  return `Sound.Play("${s}", new Vector3(${floatSuffix(x)}, ${floatSuffix(y)}, 0f), twoDimensional: false, pitchShift: false, null, ${floatSuffix(float(vol))});\n`;
};

// Flow
csharpGenerator.forBlock['cu_if'] = (block, gen) => {
  const c = gen.valueToCode(block, 'CONDITION', ORDER_ATOMIC) || 'false';
  const t = gen.statementToCode(block, 'THEN');
  return `if (${c}) {\n${t}}\n`;
};
csharpGenerator.forBlock['cu_if_else'] = (block, gen) => {
  const c = gen.valueToCode(block, 'CONDITION', ORDER_ATOMIC) || 'false';
  const t = gen.statementToCode(block, 'THEN');
  const e = gen.statementToCode(block, 'ELSE');
  return `if (${c}) {\n${t}} else {\n${e}}\n`;
};
csharpGenerator.forBlock['cu_repeat'] = (block, gen) => {
  const t = gen.valueToCode(block, 'TIMES', ORDER_ATOMIC) || '1';
  const s = gen.statementToCode(block, 'SUBSTACK');
  return `for (int _i = 0; _i < ${t}; _i++) {\n${s}}\n`;
};
csharpGenerator.forBlock['cu_while'] = (block, gen) => {
  const c = gen.valueToCode(block, 'CONDITION', ORDER_ATOMIC) || 'false';
  const s = gen.statementToCode(block, 'SUBSTACK');
  return `while (${c}) {\n${s}}\n`;
};
csharpGenerator.forBlock['cu_for_loop'] = (block, gen) => {
  const v = safeVar(block.getFieldValue('VAR') || 'i');
  const from = gen.valueToCode(block, 'FROM', ORDER_ATOMIC) || '0';
  const to = gen.valueToCode(block, 'TO', ORDER_ATOMIC) || '10';
  const s = gen.statementToCode(block, 'SUBSTACK');
  return `for (int ${v} = ${from}; ${v} <= ${to}; ${v}++) {\n${s}}\n`;
};

// Helper: add 'f' suffix only for simple number literals, not for expressions
function float(v: string): string {
  if (/^-?\d+(\.\d+)?$/.test(v.trim())) return v + 'f';
  return v;
}
function bool(v: string): string {
  if (v === 'true' || v === 'false') return v;
  return v + ' == true';
}
// Escape a user-typed string for use inside a C# "..." literal
function csStr(v: string): string {
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
// Turn a user-typed variable name into a valid C# local variable name
function safeVar(n: string): string {
  const s = String(n || '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^\d/, '_');
  return '_' + (s || 'var');
}

// Value
csharpGenerator.forBlock['cu_number'] = (block) => [`${block.getFieldValue('NUM')}`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_text'] = (block) => {
  const v = block.getFieldValue('TEXT');
  return [`"${csStr(v)}"`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_var_get'] = (block) => [safeVar(block.getFieldValue('NAME')), ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_custom'] = (block) => [`"${block.getFieldValue('ID')}"`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_vanilla'] = (block) => [`"${block.getFieldValue('ID')}"`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_happiness'] = () => ['body.happiness', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_temperature'] = () => ['body.temperature', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_hunger'] = () => ['body.hunger', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_weight'] = () => ['body.weightOffset', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_position'] = () => ['new List<float> { body.transform.position.x, body.transform.position.y }', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_condition'] = () => ['item.condition', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_name'] = () => ['item.fullName', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_world_time'] = () => ['WorldGeneration.TotalRunTime()', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_world_block_at'] = (block, gen) => {
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return [`WorldGeneration.world.GetBlock(new Vector2Int(${x}, ${y}))`, ORDER_ATOMIC];
};

// Math
csharpGenerator.forBlock['cu_math_op'] = (block, gen) => {
  const op = block.getFieldValue('OP');
  const a = gen.valueToCode(block, 'A', ORDER_ATOMIC) || '0';
  const b = gen.valueToCode(block, 'B', ORDER_ATOMIC) || '0';
  const sym: Record<string, string> = { ADD: '+', SUB: '-', MUL: '*', DIV: '/', MOD: '%', POW: '**' };
  return [`(${a} ${sym[op] ?? op} ${b})`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_math_func'] = (block, gen) => {
  const fn = block.getFieldValue('FUNC');
  const n = gen.valueToCode(block, 'NUM', ORDER_ATOMIC) || '0';
  if (fn === 'ROUND') return [`(int)System.Math.Round(${n})`, ORDER_ATOMIC];
  if (fn === 'ABS') return [`System.Math.Abs(${n})`, ORDER_ATOMIC];
  if (fn === 'SQRT') return [`System.Math.Sqrt(${n})`, ORDER_ATOMIC];
  if (fn === 'NEG') return [`(-${n})`, ORDER_ATOMIC];
  return [`${n}`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_math_random'] = (block, gen) => {
  const f = gen.valueToCode(block, 'FROM', ORDER_ATOMIC) || '1';
  const t = gen.valueToCode(block, 'TO', ORDER_ATOMIC) || '10';
  return [`UnityEngine.Random.Range(${f}, ${t} + 1)`, ORDER_ATOMIC];
};

// String
csharpGenerator.forBlock['cu_string_op'] = (block, gen) => {
  const op = block.getFieldValue('OP');
  const a = gen.valueToCode(block, 'A', ORDER_ATOMIC) || '""';
  if (op === 'LEN') return [`${a}.Length`, ORDER_ATOMIC];
  return [`(string)${a}`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_string_contains'] = (block, gen) => {
  const s = gen.valueToCode(block, 'STR', ORDER_ATOMIC) || '""';
  const sub = gen.valueToCode(block, 'SUB', ORDER_ATOMIC) || '""';
  return [`${s}.Contains(${sub})`, ORDER_ATOMIC];
};

// Boolean
csharpGenerator.forBlock['cu_true'] = () => ['true', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_false'] = () => ['false', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_is_alive'] = () => ['!body.isDying', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_number_compare'] = (block, gen) => {
  const op = block.getFieldValue('OP');
  const a = gen.valueToCode(block, 'A', ORDER_ATOMIC) || '0f';
  const b = gen.valueToCode(block, 'B', ORDER_ATOMIC) || '0f';
  return [`${a} ${op === '=' ? '==' : op} ${b}`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_logic_compare'] = (block, gen) => {
  const op = block.getFieldValue('OP');
  const a = gen.valueToCode(block, 'A', ORDER_ATOMIC) || 'false';
  const b = gen.valueToCode(block, 'B', ORDER_ATOMIC) || 'false';
  return [`${a} ${op === 'AND' ? '&&' : '||'} ${b}`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_not'] = (block, gen) => {
  const v = gen.valueToCode(block, 'BOOL', ORDER_ATOMIC) || 'false';
  return [`!${v}`, ORDER_ATOMIC];
};

// Variables
csharpGenerator.forBlock['cu_var_set'] = (block, gen) => {
  const n = block.getFieldValue('NAME');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `${safeVar(n)} = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_var_change'] = (block, gen) => {
  const n = block.getFieldValue('NAME');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '1';
  return `${safeVar(n)} += ${float(v)};\n`;
};

// Lists
csharpGenerator.forBlock['cu_list_create'] = (block, gen) => {
  const items: string[] = [];
  for (const name of ['A', 'B', 'C', 'D', 'E']) {
    const val = gen.valueToCode(block, name, ORDER_ATOMIC);
    if (val) items.push(val);
  }
  return [`new List<string> { ${items.join(', ')} }`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['lists_create_with'] = (block, gen) => {
  const items: string[] = [];
  let i = 0;
  while (block.getInput('ADD' + i)) {
    const val = gen.valueToCode(block, 'ADD' + i, ORDER_ATOMIC);
    if (val) items.push(val);
    i++;
  }
  return [`new List<string> { ${items.join(', ')} }`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_list_get'] = (block, gen) => {
  const list = gen.valueToCode(block, 'LIST', ORDER_ATOMIC) || 'new List<string>()';
  const idx = gen.valueToCode(block, 'INDEX', ORDER_ATOMIC) || '0';
  return [`${list}[${idx}]`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_list_length'] = (block, gen) => {
  const list = gen.valueToCode(block, 'LIST', ORDER_ATOMIC) || 'new List<string>()';
  return [`${list}.Count`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_list_add'] = (block, gen) => {
  const list = gen.valueToCode(block, 'LIST', ORDER_ATOMIC) || 'new List<string>()';
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || 'null';
  return `${list}.Add(${item});\n`;
};

// Fallbacks
csharpGenerator.forBlock['math_number'] = (block) => [`${block.getFieldValue('NUM')}f`, ORDER_ATOMIC];
csharpGenerator.forBlock['text'] = (block) => [`"${block.getFieldValue('TEXT')}"`, ORDER_ATOMIC];
csharpGenerator.forBlock['logic_boolean'] = (block) => [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ORDER_ATOMIC];

// Building
csharpGenerator.forBlock['cu_register_building'] = (block) => {
  const id = block.getFieldValue('ID');
  const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const json = JSON.stringify({Id: id, Name: name, Desc: desc});
  return `//REGISTER_BUILDING:${json}\n`;
};
csharpGenerator.forBlock['cu_building_set_property'] = (block, gen) => {
  const id = block.getFieldValue('ID');
  const prop = block.getFieldValue('PROP');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `BuildingEntityRegistry.GetDefinition("${id}").${prop} = ${v};\n`;
};

// Tile
csharpGenerator.forBlock['cu_register_tile'] = (block) => {
  const id = block.getFieldValue('ID');
  const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const json = JSON.stringify({Id: id, Name: name, Desc: desc});
  return `//REGISTER_TILE:${json}\n`;
};
csharpGenerator.forBlock['cu_tile_set_property'] = (block, gen) => {
  const id = block.getFieldValue('ID');
  const prop = block.getFieldValue('PROP');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `TileRegistry.GetDefinition("${id}").${prop} = ${v};\n`;
};

// Locale
csharpGenerator.forBlock['cu_register_locale'] = (block) => {
  const type = block.getFieldValue('TYPE');
  const id = block.getFieldValue('ID');
  const zh = block.getFieldValue('ZH').replace(/"/g, '\\"');
  const en = block.getFieldValue('EN').replace(/"/g, '\\"');
  const json = JSON.stringify({Type: type, Id: id, Zh: zh, En: en});
  return `//REGISTER_LOCALE:${json}\n`;
};

// Creature
csharpGenerator.forBlock['cu_register_creature'] = (block, gen) => {
  const id = block.getFieldValue('ID').replace(/"/g, '\\"');
  const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const spriteCode = gen.valueToCode(block, 'SPRITE', ORDER_ATOMIC) || '';
  const spriteId = spriteCode.replace(/^"|"$/g, '') || null;
  const health = Number(block.getFieldValue('HEALTH')) || 100;
  const json = JSON.stringify({Id: id, Name: name, Desc: desc, SpriteAssetId: spriteId, Health: health});
  return `//REGISTER_CREATURE:${json}\n`;
};
csharpGenerator.forBlock['cu_register_animation'] = (block, gen) => {
  const id = block.getFieldValue('ID').replace(/"/g, '\\"');
  const sheetCode = gen.valueToCode(block, 'SPRITE', ORDER_ATOMIC) || '';
  const sheetId = sheetCode.replace(/^"|"$/g, '') || null;
  const fw = Math.max(1, Number(block.getFieldValue('FRAME_W')) || 16);
  const fh = Math.max(1, Number(block.getFieldValue('FRAME_H')) || 16);
  const fps = Math.max(0.1, Number(block.getFieldValue('FPS')) || 12);
  const loop = block.getFieldValue('LOOP') === 'TRUE';
  const json = JSON.stringify({Id: id, SheetAssetId: sheetId, FrameWidth: fw, FrameHeight: fh, Fps: fps, Loop: loop});
  return `//REGISTER_ANIMATION:${json}\n`;
};
csharpGenerator.forBlock['cu_play_creature_animation'] = (block) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  const anim = (block.getFieldValue('ANIM_ID') || 'myAnim').replace(/"/g, '\\"');
  return `CuCreatureManager.PlayAnimation("${id}", "${anim}");\n`;
};
csharpGenerator.forBlock['cu_spawn_creature'] = (block, gen) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `CuCreatureManager.Spawn("${id}", new Vector3(${x}, ${y}, 0f));\n`;
};
csharpGenerator.forBlock['cu_set_creature_pos'] = (block, gen) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `CuCreatureManager.SetPosition("${id}", new Vector3(${x}, ${y}, 0f));\n`;
};
csharpGenerator.forBlock['cu_move_creature_to'] = (block, gen) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const speed = gen.valueToCode(block, 'SPEED', ORDER_ATOMIC) || '1';
  return `CuCreatureManager.MoveTo("${id}", new Vector3(${x}, ${y}, 0f), ${speed});\n`;
};
csharpGenerator.forBlock['cu_destroy_creature'] = (block) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  return `CuCreatureManager.Destroy("${id}");\n`;
};
csharpGenerator.forBlock['cu_creature_position'] = (block) => {
  const id = (block.getFieldValue('CREATURE_ID') || 'myCreature').replace(/"/g, '\\"');
  return [`CuCreatureManager.GetPositionList("${id}")`, ORDER_ATOMIC];
};

// Player state getters
csharpGenerator.forBlock['cu_player_health'] = () => ['body.limbs[1].skinHealth', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_max_health'] = () => ['100f', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_stamina'] = () => ['body.stamina', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_oxygen'] = () => ['body.bloodOxygen', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_sleep_quality'] = () => ['body.consciousness', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_pain'] = () => ['body.limbs[0].pain', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_stress'] = () => ['body.averagePain', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_heart_rate'] = () => ['body.heartRate', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_blood_pressure'] = () => ['body.bloodPressure', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_immunity'] = () => ['body.immunity', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_thirst'] = () => ['body.thirst', ORDER_ATOMIC];

// Player skills
csharpGenerator.forBlock['cu_player_str'] = () => ['body.skills.STR', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_res'] = () => ['body.skills.RES', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_int_skill'] = () => ['body.skills.INT', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_exp_str'] = () => ['body.skills.expSTR', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_exp_res'] = () => ['body.skills.expRES', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_exp_int'] = () => ['body.skills.expINT', ORDER_ATOMIC];

// Item getters
csharpGenerator.forBlock['cu_item_max_condition'] = () => ['1f', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_weight'] = () => ['item.totalWeight', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_value'] = () => ['0 /* ItemInfo.value is registration-time only */', ORDER_ATOMIC];

// World actions
csharpGenerator.forBlock['cu_world_set_tile'] = (block, gen) => {
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const tile = gen.valueToCode(block, 'TILE', ORDER_ATOMIC) || '0';
  return `WorldGeneration.world.SetBlock(new Vector2Int(${x}, ${y}), ${tile});\n`;
};
csharpGenerator.forBlock['cu_world_spawn_item'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"scrapmetal"';
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `CustomInstantiate.InstantiateReturn(${item}, new Vector3(${x}, ${y}, 0), Quaternion.identity, null);\n`;
};
csharpGenerator.forBlock['cu_world_destroy_block'] = (block, gen) => {
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `WorldGeneration.world.SetBlock(new Vector2Int(${x}, ${y}), 0);\n`;
};
csharpGenerator.forBlock['cu_world_replace_block'] = (block, gen) => {
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const oldTile = gen.valueToCode(block, 'OLD_TILE', ORDER_ATOMIC) || '0';
  const newTile = gen.valueToCode(block, 'NEW_TILE', ORDER_ATOMIC) || '1';
  return `if (WorldGeneration.world.GetBlock(new Vector2Int(${x}, ${y})) == ${oldTile}) WorldGeneration.world.SetBlock(new Vector2Int(${x}, ${y}), ${newTile});\n`;
};
csharpGenerator.forBlock['cu_give_item'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"bandage"';
  return `var _go = CustomInstantiate.InstantiateReturn(${item}, PlayerCamera.main.body.transform.position, Quaternion.identity, 1f);\nif(_go != null) { var _it = _go.GetComponent<Item>(); if(_it != null) PlayerCamera.main.body.PickUpItem(_it, 0, true); }\n`;
};
csharpGenerator.forBlock['cu_give_item_slot'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"bandage"';
  const slot = gen.valueToCode(block, 'SLOT', ORDER_ATOMIC) || '0';
  return `var _go = CustomInstantiate.InstantiateReturn(${item}, PlayerCamera.main.body.transform.position, Quaternion.identity, 1f);\nif(_go != null) { var _it = _go.GetComponent<Item>(); if(_it != null) PlayerCamera.main.body.PickUpItem(_it, ${slot}, true); }\n`;
};

// Boolean getters
csharpGenerator.forBlock['cu_item_is_equipped'] = () => ['PlayerCamera.main.body.HasWearable(item.id)', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_is_in_inventory'] = () => ['(bool)item.ParentContainer()', ORDER_ATOMIC];

// Math clamp
csharpGenerator.forBlock['cu_math_clamp'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const min = gen.valueToCode(block, 'MIN', ORDER_ATOMIC) || '0';
  const max = gen.valueToCode(block, 'MAX', ORDER_ATOMIC) || '100';
  return [`Mathf.Clamp(${v}, ${min}, ${max})`, ORDER_ATOMIC];
};

// ═══ Extended Body getters ═══════════════════════════════════
csharpGenerator.forBlock['cu_player_energy'] = () => ['body.energy', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_brain_health'] = () => ['body.brainHealth', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_shock'] = () => ['body.shock', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_blood_volume'] = () => ['body.bloodVolume', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_respiratory_rate'] = () => ['body.respiratoryRate', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_sickness'] = () => ['body.sicknessAmount', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_adrenaline'] = () => ['body.curAdrenaline', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_radiation'] = () => ['body.radiationSickness', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_wetness'] = () => ['body.wetness', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_clothing_temp'] = () => ['body.clothingTemperature', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_encumbrance'] = () => ['body.totalEncumberance', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_bleed_speed'] = () => ['body.totalBleedSpeed', ORDER_ATOMIC];

// ═══ Extended Body booleans ══════════════════════════════════
csharpGenerator.forBlock['cu_player_conscious'] = () => ['body.conscious', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_standing'] = () => ['body.standing', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_grounded'] = () => ['body.grounded', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_in_water'] = () => ['body.inWater', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_breathing'] = () => ['body.breathing', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_player_crouching'] = () => ['body.crouching', ORDER_ATOMIC];

// ═══ Extended Body setters ═══════════════════════════════════

// ═══ Generic player property setters ═══════════════════════════
const PLAYER_INT_FIELDS = new Set(['handSlot']);
const LIMB_INT_FIELDS = new Set(['shrapnel']);

csharpGenerator.forBlock['cu_set_player_property'] = (block, gen) => {
  const f = block.getFieldValue('PROP');
  const v = floatSuffix(gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0');
  if (f === 'adrenaline') return `body.adrenaline = ${v}; body.curAdrenaline = ${v};\n`;
  const rhs = PLAYER_INT_FIELDS.has(f) ? `(int)${v}` : v;
  return `body.${f} = ${rhs};\n`;
};
csharpGenerator.forBlock['cu_set_player_flag'] = (block, gen) => {
  const f = block.getFieldValue('PROP');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || 'false';
  return `body.${f} = ${v};\n`;
};

// ═══ Skill setters ═══════════════════════════════════════════
csharpGenerator.forBlock['cu_set_skill'] = (block, gen) => {
  const s = block.getFieldValue('STAT');
  const v = floatSuffix(gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '10');
  return `body.skills.${s} = (int)${v}; body.skills.UpdateExpBoundaries();\n`;
};
csharpGenerator.forBlock['cu_set_skill_range'] = (block, gen) => {
  const s = block.getFieldValue('STAT');
  const mn = floatSuffix(gen.valueToCode(block, 'MIN', ORDER_ATOMIC) || '1');
  const mx = floatSuffix(gen.valueToCode(block, 'MAX', ORDER_ATOMIC) || '20');
  return `body.skills.min${s} = (int)${mn}; body.skills.max${s} = (int)${mx};\n`;
};

// ═══ Extended Body actions ═══════════════════════════════════
csharpGenerator.forBlock['cu_ragdoll'] = () => 'body.Ragdoll();\n';
csharpGenerator.forBlock['cu_jump'] = () => 'body.Jump();\n';
csharpGenerator.forBlock['cu_switch_hands'] = () => 'body.SwitchHands();\n';
csharpGenerator.forBlock['cu_throw_item'] = () => 'body.ThrowItem();\n';

// ═══ Limb getters ═══════════════════════════════════════════
csharpGenerator.forBlock['cu_limb_index'] = (block) => {
  const idx = block.getFieldValue('LIMB') || '0';
  return [`body.limbs[${idx}]`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_skin_health'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.skinHealth`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_muscle_health'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.muscleHealth`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_pain'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.pain`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_bleed'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.bleedAmount`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_infection'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.infectionAmount`, ORDER_ATOMIC];
};

// ═══ Limb booleans ══════════════════════════════════════════
csharpGenerator.forBlock['cu_limb_broken'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.broken`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_dislocated'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.dislocated`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_infected_bool'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.infected`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_limb_dismembered'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return [`${limb}.dismembered`, ORDER_ATOMIC];
};

// ═══ Limb setters ═══════════════════════════════════════════
csharpGenerator.forBlock['cu_set_limb_property'] = (block, gen) => {
  const f = block.getFieldValue('PROP');
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = floatSuffix(gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0');
  const rhs = LIMB_INT_FIELDS.has(f) ? `(int)${v}` : v;
  return `${limb}.${f} = ${rhs};\n`;
};
csharpGenerator.forBlock['cu_set_limb_flag'] = (block, gen) => {
  const f = block.getFieldValue('PROP');
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || 'false';
  return `${limb}.${f} = ${v};\n`;
};

// ═══ Limb actions ═══════════════════════════════════════════
csharpGenerator.forBlock['cu_limb_break'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return `${limb}.BreakBone();\n`;
};
csharpGenerator.forBlock['cu_limb_mend'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return `${limb}.MendBone();\n`;
};
csharpGenerator.forBlock['cu_limb_dislocate_action'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return `${limb}.Dislocate();\n`;
};
csharpGenerator.forBlock['cu_limb_undislocate'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return `${limb}.UnDislocate();\n`;
};
csharpGenerator.forBlock['cu_limb_dismember_action'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  return `${limb}.Dismember();\n`;
};

// ═══ Extended Item getters ═══════════════════════════════════
csharpGenerator.forBlock['cu_item_id'] = () => ['item.id', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_category'] = () => ['item.Stats.category', ORDER_ATOMIC];

// ═══ Extended World getters ══════════════════════════════════
csharpGenerator.forBlock['cu_world_depth'] = () => ['WorldGeneration.world.PlayerTotalDepthMeters()', ORDER_ATOMIC];

// ═══ Item Property generators ═══════════════════════════════
csharpGenerator.forBlock['cu_set_item_category'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const cat = block.getFieldValue('CATEGORY');
  const json = JSON.stringify({Id: itemId, Category: cat});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_set_item_base_stats'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const weight = gen.valueToCode(block, 'WEIGHT', ORDER_ATOMIC) || '0.4';
  const value = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '1';
  const decayEnabled = block.getFieldValue('DECAY_ENABLED');
  const decayMinutes = gen.valueToCode(block, 'DECAY_MINUTES', ORDER_ATOMIC) || '180';
  const decay = decayEnabled === 'TRUE' ? decayMinutes : '0';
  const rec = gen.valueToCode(block, 'RECOGNITION', ORDER_ATOMIC) || '2';
  const spawn = gen.valueToCode(block, 'SPAWN_FREQ', ORDER_ATOMIC) || '1';
  const json = JSON.stringify({Id: itemId, Weight: weight, Value: value, DecayMinutes: decay, Recognition: rec, SpawnFrequency: spawn});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_container'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const cap = gen.valueToCode(block, 'CAPACITY', ORDER_ATOMIC) || '5';
  const maxW = gen.valueToCode(block, 'MAX_WEIGHT', ORDER_ATOMIC) || '2';
  const enc = gen.valueToCode(block, 'ENCUMBRANCE', ORDER_ATOMIC) || '1';
  const vis = block.getFieldValue('VISIBLE') === 'true';
  const tags = block.getFieldValue('TAG_RESTRICTION') || '';
  const json = JSON.stringify({Id: itemId, Container: {Capacity: cap, MaxWeightPerItem: maxW, EncumbranceReduction: enc, ItemsVisible: vis, TagRestriction: tags}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_tool'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const dmg = gen.valueToCode(block, 'DAMAGE', ORDER_ATOMIC) || '10';
  const struct = gen.valueToCode(block, 'STRUCTURAL_DAMAGE', ORDER_ATOMIC) || '5';
  const dist = gen.valueToCode(block, 'DISTANCE', ORDER_ATOMIC) || '4';
  const kb = gen.valueToCode(block, 'KNOCKBACK', ORDER_ATOMIC) || '50';
  const cd = gen.valueToCode(block, 'COOLDOWN', ORDER_ATOMIC) || '0.3';
  const stam = gen.valueToCode(block, 'STAMINA', ORDER_ATOMIC) || '0.3';
  const pierce = block.getFieldValue('PIERCING') === 'true';
  const json = JSON.stringify({Id: itemId, Tool: {Damage: dmg, StructuralDamage: struct, Distance: dist, KnockBack: kb, Cooldown: cd, StaminaUse: stam, Piercing: pierce}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_wearable'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const limb = block.getFieldValue('WEAR_LIMB');
  const slot = block.getFieldValue('SLOT_ID') || 'back';
  const armor = gen.valueToCode(block, 'ARMOR', ORDER_ATOMIC) || '0';
  const iso = gen.valueToCode(block, 'ISOLATION', ORDER_ATOMIC) || '0';
  const durLoss = gen.valueToCode(block, 'DURABILITY_LOSS', ORDER_ATOMIC) || '1';
  const json = JSON.stringify({Id: itemId, Wearable: {DesiredWearLimb: limb, WearSlotId: slot, WearableArmor: armor, WearableIsolation: iso, WearableHitDurabilityLossMultiplier: durLoss}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_register_liquid'] = (block, gen) => {
  const id = block.getFieldValue('ID') || 'myLiquid';
  const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const json = JSON.stringify({Id: id, Name: name, Description: desc});
  return `//REGISTER_LIQUID:${json}\n`;
};
csharpGenerator.forBlock['cu_liquid_color'] = (block, gen) => {
  const id = block.getFieldValue('ID') || 'myLiquid';
  const r = gen.valueToCode(block, 'COLOR_R', ORDER_ATOMIC) || '1';
  const g = gen.valueToCode(block, 'COLOR_G', ORDER_ATOMIC) || '1';
  const b = gen.valueToCode(block, 'COLOR_B', ORDER_ATOMIC) || '1';
  const json = JSON.stringify({Id: id, ColorR: r, ColorG: g, ColorB: b});
  return `//LIQUID_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_liquid_value'] = (block, gen) => {
  const id = block.getFieldValue('ID') || 'myLiquid';
  const val = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '10';
  const json = JSON.stringify({Id: id, ValuePerLiter: val});
  return `//LIQUID_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_liquid_flags'] = (block, gen) => {
  const id = block.getFieldValue('ID') || 'myLiquid';
  const drinkable = block.getFieldValue('DRINKABLE') === 'true';
  const healthUsable = block.getFieldValue('HEALTH_USABLE') === 'true';
  const injectable = block.getFieldValue('INJECTABLE') === 'true';
  const sickness = gen.valueToCode(block, 'INJECTION_SICKNESS', ORDER_ATOMIC) || '1';
  const unobtainable = block.getFieldValue('UNOBTAINABLE') === 'true';
  const json = JSON.stringify({Id: id, Drinkable: drinkable, HealthUsable: healthUsable, Injectable: injectable, InjectionSickness: sickness, Unobtainable: unobtainable});
  return `//LIQUID_FLAGS:${json}\n`;
};
csharpGenerator.forBlock['cu_item_liquid_container'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const cap = gen.valueToCode(block, 'CAPACITY', ORDER_ATOMIC) || '100';
  const autoFill = block.getFieldValue('AUTO_FILL') === 'true';
  const liquidId = block.getFieldValue('LIQUID_ID') || 'water';
  const liquidAmt = gen.valueToCode(block, 'LIQUID_AMOUNT', ORDER_ATOMIC) || '100';
  const json = JSON.stringify({Id: itemId, LiquidContainer: {Capacity: cap, AutoFill: autoFill, LiquidId: liquidId, LiquidAmount: liquidAmt}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_battery'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const preset = block.getFieldValue('PRESET');
  const charge = gen.valueToCode(block, 'START_CHARGE', ORDER_ATOMIC) || '0';
  const spawnWith = block.getFieldValue('SPAWN_WITH_BATTERY') === 'true';
  const json = JSON.stringify({Id: itemId, Battery: {Preset: preset, StartCharge: charge, SpawnWithBattery: spawnWith}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_light'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const intensity = gen.valueToCode(block, 'INTENSITY', ORDER_ATOMIC) || '0.5';
  const radius = gen.valueToCode(block, 'RADIUS', ORDER_ATOMIC) || '5';
  const r = gen.valueToCode(block, 'COLOR_R', ORDER_ATOMIC) || '1';
  const g = gen.valueToCode(block, 'COLOR_G', ORDER_ATOMIC) || '1';
  const b = gen.valueToCode(block, 'COLOR_B', ORDER_ATOMIC) || '1';
  const json = JSON.stringify({Id: itemId, Light: {Intensity: intensity, Radius: radius, ColorR: r, ColorG: g, ColorB: b}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_bandage'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const eff = gen.valueToCode(block, 'EFFECTIVENESS', ORDER_ATOMIC) || '8';
  const skin = gen.valueToCode(block, 'SKIN_HEAL', ORDER_ATOMIC) || '8';
  const slow = gen.valueToCode(block, 'BANDAGE_SLOW', ORDER_ATOMIC) || '18';
  const pain = gen.valueToCode(block, 'PAIN_REDUCTION', ORDER_ATOMIC) || '40';
  const bone = gen.valueToCode(block, 'BONE_HEAL', ORDER_ATOMIC) || '5';
  const dislo = gen.valueToCode(block, 'DISLOCATION', ORDER_ATOMIC) || '5';
  const json = JSON.stringify({Id: itemId, Bandage: {Effectiveness: eff, SkinHealAmount: skin, BandageSlowAmount: slow, PainReduction: pain, BoneHealTimerReduction: bone, DislocationTimerReduction: dislo}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_syringe'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const cap = gen.valueToCode(block, 'CAPACITY', ORDER_ATOMIC) || '100';
  const perUse = gen.valueToCode(block, 'AMOUNT_PER_USE', ORDER_ATOMIC) || '100';
  const autoFill = block.getFieldValue('AUTO_FILL') === 'true';
  const liquidId = block.getFieldValue('LIQUID_ID') || 'morphine';
  const liquidAmt = gen.valueToCode(block, 'LIQUID_AMOUNT', ORDER_ATOMIC) || '100';
  const json = JSON.stringify({Id: itemId, Syringe: {Capacity: cap, AmountPerFullUse: perUse, AutoFill: autoFill, LiquidId: liquidId, LiquidAmount: liquidAmt}});
  return `//ITEM_PROP:${json}\n`;
};
csharpGenerator.forBlock['cu_item_gun'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const itemId = id.replace(/^"|"$/g, '');
  const ammoType = block.getFieldValue('AMMO_TYPE');
  const firingMode = block.getFieldValue('FIRING_MODE');
  const feedType = block.getFieldValue('FEED_TYPE');
  const magCap = gen.valueToCode(block, 'MAG_CAPACITY', ORDER_ATOMIC) || '12';
  const animalDmg = gen.valueToCode(block, 'ANIMAL_DAMAGE', ORDER_ATOMIC) || '25';
  const structDmg = gen.valueToCode(block, 'STRUCTURAL_DAMAGE', ORDER_ATOMIC) || '10';
  const kb = gen.valueToCode(block, 'KNOCKBACK', ORDER_ATOMIC) || '100';
  const condLoss = gen.valueToCode(block, 'CONDITION_LOSS', ORDER_ATOMIC) || '0.01';
  const loudness = gen.valueToCode(block, 'LOUDNESS', ORDER_ATOMIC) || '5';
  const gasTime = gen.valueToCode(block, 'GAS_TIME', ORDER_ATOMIC) || '0';
  const shots = gen.valueToCode(block, 'SHOTS_PER_FIRE', ORDER_ATOMIC) || '1';
  const spread = gen.valueToCode(block, 'VERTICAL_SPREAD', ORDER_ATOMIC) || '0';
  const spriteRacked = gen.valueToCode(block, 'SPRITE_RACKED', ORDER_ATOMIC) || '';
  const spriteNormalNoMag = gen.valueToCode(block, 'SPRITE_NORMAL_NOMAG', ORDER_ATOMIC) || '';
  const spriteRackedNoMag = gen.valueToCode(block, 'SPRITE_RACKED_NOMAG', ORDER_ATOMIC) || '';
  const soundFire = gen.valueToCode(block, 'SOUND_FIRE', ORDER_ATOMIC) || '';
  const soundRack = gen.valueToCode(block, 'SOUND_RACK', ORDER_ATOMIC) || '';
  const soundUnrack = gen.valueToCode(block, 'SOUND_UNRACK', ORDER_ATOMIC) || '';
  const gun: Record<string, unknown> = {AmmoType: ammoType, FiringMode: firingMode, FeedType: feedType, MagCapacity: magCap, KnockBack: kb, StructureDamage: structDmg, AnimalDamage: animalDmg, Loudness: loudness, DesiredGasTime: gasTime, ShotsPerFire: shots, VerticalSpread: spread, ConditionLossPerShot: condLoss};
  if (spriteRacked) gun.RackedSprite = spriteRacked;
  if (spriteNormalNoMag) gun.NormalSpriteNoMag = spriteNormalNoMag;
  if (spriteRackedNoMag) gun.RackedSpriteNoMag = spriteRackedNoMag;
  if (soundFire) gun.FireSound = soundFire;
  if (soundRack) gun.CustomRack = soundRack;
  if (soundUnrack) gun.CustomUnrack = soundUnrack;
  const json = JSON.stringify({Id: itemId, Gun: gun});
  return `//ITEM_PROP:${json}\n`;
};

csharpGenerator.forBlock['cu_item_magazine'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myMagazine"';
  const itemId = id.replace(/^"|"$/g, '');
  const ammoType = block.getFieldValue('AMMO_TYPE');
  const maxRounds = gen.valueToCode(block, 'MAX_ROUNDS', ORDER_ATOMIC) || '12';
  const startRounds = gen.valueToCode(block, 'START_ROUNDS', ORDER_ATOMIC) || '0';
  const json = JSON.stringify({Id: itemId, Magazine: {AmmoType: ammoType, MaxRounds: maxRounds, StartRounds: startRounds}});
  return `//ITEM_PROP:${json}\n`;
};

// ═══ Function generators ════════════════════════════════════════
csharpGenerator.forBlock['cu_define_function'] = (block, gen) => {
  const name = block.getFieldValue('NAME') || 'myFunc';
  const returnType = block.getFieldValue('RETURN_TYPE') || 'void';
  // Collect params from fields
  const params: { type: string; name: string }[] = [];
  let i = 0;
  while (block.getInput('PARAM' + i)) {
    const pName = block.getFieldValue('PARAM_NAME_' + i) || ('p' + i);
    const pType = block.getFieldValue('PARAM_TYPE_' + i) || 'var';
    params.push({ type: pType, name: pName });
    i++;
  }
  const body = gen.blockToCode(block.getInputTargetBlock('BODY')) as string || '';
  const json = JSON.stringify({ name, returnType, params });
  return `//DEFINE_FUNCTION:${json}\n${body}//END_FUNCTION\n`;
};
csharpGenerator.forBlock['cu_return'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `return ${v};\n`;
};
csharpGenerator.forBlock['cu_get_param'] = (block) => [safeVar(block.getFieldValue('NAME')), ORDER_ATOMIC];
csharpGenerator.forBlock['cu_call_function'] = (block, gen) => {
  const name = block.getFieldValue('NAME') || 'myFunc';
  const args: string[] = [];
  let i = 0;
  while (block.getInput('ARG' + i)) {
    const code = gen.valueToCode(block, 'ARG' + i, ORDER_ATOMIC);
    if (code) args.push(code);
    i++;
  }
  return `EventHandlers.${name}(${args.join(', ')});\n`;
};
csharpGenerator.forBlock['cu_call_function_value'] = (block, gen) => {
  const name = block.getFieldValue('NAME') || 'myFunc';
  const args: string[] = [];
  let i = 0;
  while (block.getInput('ARG' + i)) {
    const code = gen.valueToCode(block, 'ARG' + i, ORDER_ATOMIC);
    if (code) args.push(code);
    i++;
  }
  return [`EventHandlers.${name}(${args.join(', ')})`, ORDER_ATOMIC];
};

// ═══ UI block generators ════════════════════════════════════════
csharpGenerator.forBlock['cu_show_control'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myControl';
  return `CuUI.Show("${id}");\n`;
};
csharpGenerator.forBlock['cu_hide_control'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myControl';
  return `CuUI.Hide("${id}");\n`;
};
csharpGenerator.forBlock['cu_set_control_property'] = (block, gen) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myControl';
  const prop = block.getFieldValue('PROP');
  const val = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `CuUI.SetProperty("${id}", "${prop}", ${val});\n`;
};
csharpGenerator.forBlock['cu_get_textfield_content'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myTextField';
  return [`CuUI.GetText("${id}")`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_get_control_value'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'mySlider';
  return [`CuUI.GetValue("${id}")`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_get_toggle_state'] = (block) => {
  const id = block.getFieldValue('CONTROL_ID') || 'myToggle';
  return [`CuUI.GetToggle("${id}")`, ORDER_ATOMIC];
};

// ═══ CUCoreLib: settings, assets, scheduling, moodles, liquid tiles, structures ═══
let _tmpSeq = 0;
function tmp(name: string): string { return name + (++_tmpSeq); }
function q(s: string): string { return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function listPaths(s: string): string[] {
  return (s || '').split(',').map(t => t.trim()).filter(t => t.length > 0);
}
function toInt(v: string): string { return /^\d+$/.test((v || '').trim()) ? v.trim() : `(int)(${v})`; }

// ── Settings menu option (ModOptionsRegistry) ──
csharpGenerator.forBlock['cu_register_mod_option'] = (block, gen) => {
  const kind = block.getFieldValue('KIND') || 'float';
  const id = q(block.getFieldValue('ID') || 'myOption');
  const label = q(block.getFieldValue('LABEL') || 'My option');
  const desc = q(block.getFieldValue('DESC') || '');
  const cat = q(block.getFieldValue('CATEGORY') || 'MyMod');
  const body = gen.statementToCode(block, 'ACTION') || '';
  const lambda = body ? ` (${kind === 'keybind' ? 'KeyCode' : kind === 'bool' ? 'bool' : kind === 'float' ? 'float' : 'int'}) optVal => { ${body} }` : '';
  let def: string;
  if (kind === 'int') {
    def = `Int("${id}", "${label}", "${desc}", "${cat}", ${block.getFieldValue('MIN') || 0}, ${block.getFieldValue('MAX') || 99}, ${block.getFieldValue('DEFAULT') || 0}`;
  } else if (kind === 'bool') {
    def = `Bool("${id}", "${label}", "${desc}", "${cat}", ${(block.getFieldValue('DEFAULT') || 'false').toLowerCase()}`;
  } else if (kind === 'keybind') {
    def = `Keybind("${id}", "${label}", "${desc}", "${cat}", KeyCode.${block.getFieldValue('KEYCODE') || 'None'}`;
  } else if (kind === 'dropdown') {
    const choices = listPaths(block.getFieldValue('CHOICES') || '')
      .map(p => { const [k, ...rest] = p.split('|'); return `new ModDropdownChoice("${q((k || '').trim())}", "${q(rest.join('|').trim())}")`; })
      .join(', ');
    def = `Dropdown("${id}", "${label}", "${desc}", "${cat}", ${block.getFieldValue('DEFAULT') || 0}, new ModDropdownChoice[] { ${choices} }`;
  } else {
    def = `Float("${id}", "${label}", "${desc}", "${cat}", ${float(block.getFieldValue('MIN') || '0')}, ${float(block.getFieldValue('MAX') || '10')}, ${float(block.getFieldValue('DEFAULT') || '1')}`;
  }
  return `ModOptionsRegistry.Register(ModOptionDefinition.${def}${lambda}));\n`;
};

// ── Persistent key/value config (CUCoreUtils.Get*/Set*) ──
csharpGenerator.forBlock['cu_cfg_get'] = (block, gen) => {
  const type = block.getFieldValue('TYPE') || 'float';
  const key = q(block.getFieldValue('KEY') || 'myKey');
  const dv = gen.valueToCode(block, 'DEFAULT', ORDER_ATOMIC) || (type === 'string' ? '""' : type === 'bool' ? 'false' : '0f');
  if (type === 'string') return [`CUCoreUtils.GetString("${key}", ${dv})`, ORDER_ATOMIC];
  if (type === 'bool') return [`CUCoreUtils.GetBool("${key}", ${dv})`, ORDER_ATOMIC];
  return [`CUCoreUtils.GetFloat("${key}", ${dv})`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_cfg_set'] = (block, gen) => {
  const type = block.getFieldValue('TYPE') || 'float';
  const key = q(block.getFieldValue('KEY') || 'myKey');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || (type === 'string' ? '""' : type === 'bool' ? 'false' : '0f');
  if (type === 'string') return `CUCoreUtils.SetString("${key}", ${v});\n`;
  if (type === 'bool') return `CUCoreUtils.SetBool("${key}", ${bool(v)});\n`;
  return `CUCoreUtils.SetFloat("${key}", ${float(v)});\n`;
};
csharpGenerator.forBlock['cu_register_keybind'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myAction');
  const desc = q(block.getFieldValue('DESC') || '');
  return `CUCoreUtils.AllowKeybindRebind("${id}", "${desc}");\n`;
};
csharpGenerator.forBlock['cu_key_code'] = (block) => [`KeyCode.${block.getFieldValue('KEY') || 'None'}`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_key_sprite'] = (block) => [`CUCoreUtils.GetKeySprite(KeyCode.${block.getFieldValue('KEY') || 'None'})`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_friendly_key_name'] = (block) => [`CUCoreUtils.GetFriendlyKeyName(KeyCode.${block.getFieldValue('KEY') || 'None'})`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_keybind_code'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myAction');
  return [`(KeyCode)CUCoreUtils.GetFriendlyKeyBind("${id}")`, ORDER_ATOMIC];
};

// ── Assets ──
csharpGenerator.forBlock['cu_load_embedded_sprite'] = (block, gen) => {
  const path = q(block.getFieldValue('PATH') || 'Assets/icon.png');
  const ppu = gen.valueToCode(block, 'PPU', ORDER_ATOMIC) || '8';
  return [`CUCoreUtils.LoadEmbeddedSprite("${path}", ${float(ppu)}, typeof(Plugin).Assembly)`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_split_sprite_sheet'] = (block, gen) => {
  const sheet = gen.valueToCode(block, 'SHEET', ORDER_ATOMIC) || 'null';
  const cols = gen.valueToCode(block, 'COLS', ORDER_ATOMIC) || '1';
  const rows = gen.valueToCode(block, 'ROWS', ORDER_ATOMIC) || '1';
  const idx = gen.valueToCode(block, 'INDEX', ORDER_ATOMIC) || '0';
  return [`CUCoreUtils.SplitSpriteSheet(${sheet}, ${toInt(cols)}, ${toInt(rows)})[${toInt(idx)}]`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_cache_sprite'] = (block, gen) => {
  const id = q(block.getFieldValue('ID') || 'mySprite');
  const sprite = gen.valueToCode(block, 'SPRITE', ORDER_ATOMIC) || 'null';
  return `AssetLoader.CacheSprite("${id}", ${sprite});\n`;
};
csharpGenerator.forBlock['cu_get_cached_sprite'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'mySprite');
  return [`AssetLoader.GetCachedSprite("${id}")`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_register_bundle'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myBundle');
  const path = q(block.getFieldValue('PATH') || 'Assets/bundle.bundle');
  return `AssetLoader.RegisterBundleFromPluginFolder(Plugin.Instance, "${id}", "${path}");\n`;
};
csharpGenerator.forBlock['cu_bundle_asset'] = (block) => {
  const bundle = q(block.getFieldValue('BUNDLE') || 'myBundle');
  const name = q(block.getFieldValue('NAME') || 'asset');
  const n = tmp('cuAsset');
  return [`AssetLoader.TryLoadBundleAsset<Sprite>("${bundle}", "${name}", out var ${n}) ? ${n} : null`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_frame_animation'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myAnim');
  const ppu = float(block.getFieldValue('PPU') || '8');
  const fps = float(block.getFieldValue('FPS') || '12');
  const loop = (block.getFieldValue('LOOP') || 'FALSE') === 'FALSE' ? 'true' : 'false';
  const frames = listPaths(block.getFieldValue('FRAMES') || '').map(p => `"${q(p)}"`).join(', ');
  return `AssetLoader.LoadFrameAnimationFromFiles("${id}", new[] { ${frames} }, ${ppu}, ${fps}, ${loop});\n`;
};
csharpGenerator.forBlock['cu_load_texture_file'] = (block) => {
  const path = q(block.getFieldValue('PATH') || 'Assets/texture.png');
  const filter = block.getFieldValue('FILTER') || 'Point';
  const wrap = block.getFieldValue('WRAP') || 'Repeat';
  return [`LiquidVisualHelper.LoadTextureFromFile("${path}", FilterMode.${filter}, TextureWrapMode.${wrap})`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_liquid_material'] = (block, gen) => {
  const tex = gen.valueToCode(block, 'TEXTURE', ORDER_ATOMIC) || 'null';
  const shader = (block.getFieldValue('SHADER') || '').trim();
  return [shader ? `LiquidVisualHelper.CreateLiquidMaterial(${tex}, null, "${q(shader)}")` : `LiquidVisualHelper.CreateLiquidMaterial(${tex})`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_liquid_tile_material'] = (block) => {
  const path = q(block.getFieldValue('PATH') || 'Assets/water.png');
  const shader = (block.getFieldValue('SHADER') || '').trim();
  return [shader ? `LiquidVisualHelper.CreateLiquidMaterialFromFile("${path}", null, "${q(shader)}")` : `LiquidVisualHelper.CreateLiquidMaterialFromFile("${path}")`, ORDER_ATOMIC];
};

// ── Scheduling / feedback ──
csharpGenerator.forBlock['cu_alert'] = (block, gen) => {
  const text = gen.valueToCode(block, 'TEXT', ORDER_ATOMIC) || '""';
  const imp = gen.valueToCode(block, 'IMPORTANT', ORDER_ATOMIC) || 'false';
  return `CUCoreUtils.ShowAlert(${text}, ${imp});\n`;
};
csharpGenerator.forBlock['cu_delay'] = (block, gen) => {
  const secs = gen.valueToCode(block, 'SECONDS', ORDER_ATOMIC) || '1';
  const body = gen.statementToCode(block, 'BODY') || '{ }';
  return `CUCoreUtils.DelayCall(${float(secs)}, () => { ${body} });\n`;
};
csharpGenerator.forBlock['cu_call_when'] = (block, gen) => {
  const cond = gen.valueToCode(block, 'COND', ORDER_ATOMIC) || 'true';
  const body = gen.statementToCode(block, 'BODY') || '{ }';
  return `CUCoreUtils.CallWhen(() => ${cond}, () => { ${body} });\n`;
};
csharpGenerator.forBlock['cu_console_log'] = (block, gen) => {
  const text = gen.valueToCode(block, 'TEXT', ORDER_ATOMIC) || '""';
  return `Log.LogInfo($"[CuBlocky] {text}");\n`;
};
csharpGenerator.forBlock['cu_talk_electronic'] = (block, gen) => {
  const text = gen.valueToCode(block, 'TEXT', ORDER_ATOMIC) || '""';
  return `CUCoreUtils.TalkElectronic(${text});\n`;
};
csharpGenerator.forBlock['cu_end_minigame'] = () => `CUCoreMinigames.EndActiveMinigame();\n`;

// ── Moodles ──
function moodleCommon(block: any, gen: any) {
  return {
    intensity: toInt(gen.valueToCode(block, 'INTENSITY', ORDER_ATOMIC) || '3'),
    name: q(gen.valueToCode(block, 'NAME', ORDER_ATOMIC).replace(/^"|"$/g, '') || ''),
    desc: q(gen.valueToCode(block, 'DESC', ORDER_ATOMIC).replace(/^"|"$/g, '') || ''),
    critical: gen.valueToCode(block, 'CRITICAL', ORDER_ATOMIC) || 'false',
    important: gen.valueToCode(block, 'IMPORTANT', ORDER_ATOMIC) || 'true',
    key: q(block.getFieldValue('KEY') || ''),
    hold: float(gen.valueToCode(block, 'HOLD', ORDER_ATOMIC) || '0.75'),
  };
}
csharpGenerator.forBlock['cu_moodle'] = (block, gen) => {
  const m = moodleCommon(block, gen);
  const icon = gen.valueToCode(block, 'ICON', ORDER_ATOMIC) || '""';
  return `MoodleRegistry.AddMoodle(${m.intensity}, ${icon}, "${m.name}", "${m.desc}", ${m.critical}, false, ${m.important}, "${m.key}", ${m.hold});\n`;
};
csharpGenerator.forBlock['cu_moodle_animated'] = (block, gen) => {
  const m = moodleCommon(block, gen);
  const anim = gen.valueToCode(block, 'ANIM_ID', ORDER_ATOMIC) || '""';
  return `MoodleRegistry.AddAnimatedMoodle(${m.intensity}, ${anim}, "${m.name}", "${m.desc}", ${m.critical}, false, ${m.important}, "${m.key}", ${m.hold});\n`;
};

// ── Input / player queries ──
csharpGenerator.forBlock['cu_mouse_pos'] = () => ['CUCoreUtils.GetMousePosition()', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_get_held_item'] = () => {
  const n = tmp('cuHeld');
  return [`CUCoreUtils.TryGetHeldItem(out Item ${n}) ? ${n} : null`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_get_hovered_item'] = () => {
  const n = tmp('cuHover');
  return [`CUCoreUtils.TryGetHoveredItem(out Item ${n}) ? ${n} : null`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_is_in_world'] = () => ['CUCoreUtils.IsInWorld()', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_has_equipped'] = (block, gen) => [`CUCoreUtils.HasEquipped(${gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '""'})`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_is_modded_item'] = (block, gen) => [`CUCoreUtils.IsModdedItem(${gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '""'})`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_is_minigame_busy'] = () => ['CUCoreMinigames.IsBusy()', ORDER_ATOMIC];

// ── Item runtime overrides ──
csharpGenerator.forBlock['cu_set_worn_sprite'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '""';
  const sprite = gen.valueToCode(block, 'SPRITE', ORDER_ATOMIC) || 'null';
  return `CUCoreUtils.SetWornSprite(${item}, ${sprite});\n`;
};
csharpGenerator.forBlock['cu_set_multi_worn_sprite'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '""';
  const limb = q(block.getFieldValue('LIMB') || 'HandA');
  const sprite = gen.valueToCode(block, 'SPRITE', ORDER_ATOMIC) || 'null';
  return `CUCoreUtils.SetMultiWornSprite(${item}, "${limb}", ${sprite});\n`;
};
csharpGenerator.forBlock['cu_edit_vanilla_item'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '""';
  const body = gen.statementToCode(block, 'BODY') || '{ }';
  return `CUCoreUtils.EditVanillaItem(${item}, item => { ${body} });\n`;
};

// ── World: liquid tiles & structures ──
csharpGenerator.forBlock['cu_register_liquid_tile'] = (block, gen) => {
  const id = q(block.getFieldValue('ID') || 'myLiquidTile');
  const g = (name: string, fb: string) => gen.valueToCode(block, name, ORDER_ATOMIC) || fb;
  const vm = block.getFieldValue('VISUAL_MODE') || 'ExistingLiquidPlusTint';
  return `LiquidTileRegistry.Register("${id}", new CustomLiquidTileInfo {\n` +
    `  LiquidId = "${q(block.getFieldValue('LIQUID_ID') || 'water')}",\n` +
    `  Buoyancy = ${float(g('BUOYANCY', '0.6'))},\n` +
    `  Drag = ${float(g('DRAG', '0.915'))},\n` +
    `  WetnessPerSecond = ${float(g('WETNESS', '20'))},\n` +
    `  TemperaturePerSecond = ${float(g('TEMPERATURE', '0'))},\n` +
    `  SicknessPerSecond = ${float(g('SICKNESS', '0'))},\n` +
    `  SlipPerSecond = ${float(g('SLIP', '0'))},\n` +
    `  SpawnAmount = ${float(g('SPAWN_AMOUNT', '0'))},\n` +
    `  MaxFloodFill = ${toInt(g('MAX_FILL', '128'))},\n` +
    `  Tint = new Color(${float(g('R', '1'))}, ${float(g('G', '1'))}, ${float(g('B', '1'))}),\n` +
    `  VisualMode = LiquidTileVisualMode.${vm},\n` +
    `  ConsumeOnDrink = ${g('CONSUME_DRINK', 'true')},\n` +
    `  ConsumeOnFill = ${g('CONSUME_FILL', 'true')},\n` +
    `  FillLiquidId = "${q(block.getFieldValue('FILL_LIQUID') || 'water')}"\n` +
    `});\n`;
};
csharpGenerator.forBlock['cu_place_liquid_tile'] = (block, gen) => {
  const id = q(block.getFieldValue('ID') || 'myLiquidTile');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `LiquidTileRegistry.Place("${id}", new Vector2(${float(x)}, ${float(y)}));\n`;
};
csharpGenerator.forBlock['cu_flood_liquid_tile'] = (block, gen) => {
  const id = q(block.getFieldValue('ID') || 'myLiquidTile');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const max = gen.valueToCode(block, 'MAX', ORDER_ATOMIC) || '-1';
  return `LiquidTileRegistry.FloodFill("${id}", new Vector2Int(${toInt(x)}, ${toInt(y)}), ${toInt(max)});\n`;
};
csharpGenerator.forBlock['cu_register_structure_file'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myStructure');
  const path = q(block.getFieldValue('PATH') || 'Structures/house.json');
  return `StructureRegistry.RegisterFromFile("${id}", "${path}");\n`;
};
csharpGenerator.forBlock['cu_place_structure'] = (block, gen) => {
  const id = q(block.getFieldValue('ID') || 'myStructure');
  const x = gen.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = gen.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  return `StructureRegistry.Place("${id}", new Vector2(${float(x)}, ${float(y)}));\n`;
};
csharpGenerator.forBlock['cu_structure_spawn_counts'] = (block) => {
  const id = q(block.getFieldValue('ID') || 'myStructure');
  const counts = listPaths(block.getFieldValue('COUNTS') || '1').map(c => `${toInt(c)}`).join(', ');
  return `StructureRegistry.TrySetSpawnCounts("${id}", ${counts});\n`;
};

// ── Body animation packs ──
csharpGenerator.forBlock['cu_play_body_animation'] = (block, gen) => {
  const body = gen.valueToCode(block, 'BODY', ORDER_ATOMIC) || 'body';
  const bundle = q(block.getFieldValue('BUNDLE') || 'myBundle');
  const anim = q(block.getFieldValue('ANIM') || 'walk');
  const loop = gen.valueToCode(block, 'LOOP', ORDER_ATOMIC) || 'true';
  const speed = float(gen.valueToCode(block, 'SPEED', ORDER_ATOMIC) || '1');
  return `BodyAnimationPlayer.PlayBundled(${body}, "${bundle}", "${anim}", ${loop}, ${speed});\n`;
};
csharpGenerator.forBlock['cu_stop_body_animation'] = (block, gen) => {
  const body = gen.valueToCode(block, 'BODY', ORDER_ATOMIC) || 'body';
  return `BodyAnimationPlayer.Stop(${body});\n`;
};

// ── Console commands ──
csharpGenerator.forBlock['cu_register_console_command'] = (block, gen) => {
  const name = q(block.getFieldValue('NAME') || 'mycommand');
  const desc = q(block.getFieldValue('DESC') || '');
  const argDesc = (block.getFieldValue('ARG_DESC') || '').trim();
  const body = gen.statementToCode(block, 'BODY') || '{ }';
  if (argDesc) {
    const parts = listPaths(argDesc).map(p => { const [s, ...r] = p.split('|'); return `("${q((s || '').trim())}", "${q(r.join('|').trim())}")`; }).join(', ');
    return `ConsoleCommandRegistry.Register("${name}", "${desc}", (string[] args) => { ${body} }, null, new (string, string)[] { ${parts} });\n`;
  }
  return `ConsoleCommandRegistry.Register("${name}", "${desc}", (string[] args) => { ${body} });\n`;
};
csharpGenerator.forBlock['cu_console_arg'] = (block) => {
  const i = toInt(block.getFieldValue('INDEX') || '0');
  return [`args[${i}]`, ORDER_ATOMIC];
};

// ═══ Extract structured function data from workspace ═════════════
export function extractFunctions(ws: Blockly.Workspace): FunctionDef[] {
  const result: FunctionDef[] = [];
  for (const block of ws.getAllBlocks(false)) {
    if (block.type !== 'cu_define_function') continue;
    const name = (block.getFieldValue('NAME') as string) || 'myFunc';
    const returnType = (block.getFieldValue('RETURN_TYPE') as string) || 'void';
    const params: ParamDef[] = [];
    let i = 0;
    while (block.getInput('PARAM' + i)) {
      params.push({
        name: (block.getFieldValue('PARAM_NAME_' + i) as string) || ('p' + i),
        type: (block.getFieldValue('PARAM_TYPE_' + i) as string) || 'var',
      });
      i++;
    }
    const body = (csharpGenerator.blockToCode(block.getInputTargetBlock('BODY')) as string || '').trim();
    result.push({ name, returnType, params, body });
  }
  return result;
}

// ═══ Dropdown i18n ═══════════════════════════════════════════
let _blocksLang = 'zh';

const PROP_OPTIONS: DdOption[] = [
  ['耐久', 'Durability', 'Прочность', 'condition'], ['重量', 'Weight', 'Вес', 'weight'],
  ['价值', 'Value', 'Стоимость', 'value'],
  ['可使用', 'Usable', 'Используемый', 'usable'], ['可穿戴', 'Wearable', 'Экипируемый', 'wearable'],
  ['左手使用', 'UseLimbAction', 'Действие конечности', 'useLimbAction'],
  ['零耐久销毁', 'DestroyAtZero', 'Уничтожить при 0', 'destroyAtZeroCondition'],
  ['可放置', 'Placeable', 'Размещаемый', 'placeable'],
];

const TARGET_OPTIONS: DdOption[] = [
  ['当前物品', 'This item', 'Этот предмет', 'this'],
  ['左手', 'Left hand', 'Левая рука', 'left'],
  ['右手', 'Right hand', 'Правая рука', 'right'],
];

const ACTION_OPTIONS: DdOption[] = [
  ['使用', 'Use', 'Использовать', 'use'],
  ['丢弃', 'Drop', 'Выбросить', 'drop'],
  ['装备', 'Equip', 'Экипировать', 'equip'],
];

const COND_OP_OPTIONS: DdOption[] = [
  ['设为', 'Set', 'Установить', '='],
  ['增加', 'Add', 'Прибавить', '+'],
  ['减少', 'Subtract', 'Вычесть', '-'],
];

const MATH_FUNC_OPTIONS: DdOption[] = [
  ['四舍五入', 'Round', 'Округлить', 'ROUND'],
  ['绝对值', 'Absolute', 'Модуль', 'ABS'],
  ['平方根', 'Square root', 'Квадратный корень', 'SQRT'],
  ['取反', 'Negate', 'Отрицание', 'NEG'],
];

const MATH_OP_OPTIONS: DdOption[] = [
  ['+', '+', '+', 'ADD'], ['−', '−', '−', 'SUB'], ['×', '×', '×', 'MUL'],
  ['÷', '÷', '÷', 'DIV'], ['%', '%', '%', 'MOD'], ['幂', 'Pow', 'Степень', 'POW'],
];

const STRING_OP_OPTIONS: DdOption[] = [
  ['字符串长度', 'Length', 'Длина', 'LEN'],
  ['拼接', 'Join', 'Объединить', 'JOIN'],
];

const LOGIC_OP_OPTIONS: DdOption[] = [
  ['且', 'And', 'И', 'AND'],
  ['或', 'Or', 'Или', 'OR'],
];

const CATEGORY_OPTIONS: DdOption[] = [
  ['无生成', 'nospawn', 'нет спавна', 'nospawn'], ['武器', 'weapon', 'оружие', 'weapon'], ['工具', 'tool', 'инструмент', 'tool'],
  ['医疗', 'medical', 'медицина', 'medical'], ['食物', 'food', 'еда', 'food'], ['材料', 'material', 'материал', 'material'],
  ['护甲', 'armor', 'броня', 'armor'], ['容器', 'container', 'контейнер', 'container'], ['其他', 'misc', 'прочее', 'misc'],
];

const PLACEMENT_OPTIONS: DdOption[] = [
  ['地面', 'Floor', 'Пол', 'Floor'],
  ['墙壁', 'Wall', 'Стена', 'Wall'],
  ['天花板', 'Ceiling', 'Потолок', 'Ceiling'],
];

const BUILDING_PROP_OPTIONS: DdOption[] = [
  ['血量', 'Health', 'Здоровье', 'health'], ['名称', 'Name', 'Имя', 'name'],
  ['描述', 'Description', 'Описание', 'description'], ['地面放置', 'RequireGround', 'На пол', 'requireGround'],
  ['金属', 'Metallic', 'Металл', 'metallic'], ['动物', 'Animal', 'Животное', 'animal'],
  ['掉落倍率', 'DropChance', 'Шанс дропа', 'dropChanceMultiplier'],
  ['生成最小数', 'SpawnMin', 'Мин. спавн', 'spawnMinPerChunk'],
  ['生成最大数', 'SpawnMax', 'Макс. спавн', 'spawnMaxPerChunk'],
];

const COLLIDER_OPTIONS: DdOption[] = [
  ['网格', 'Grid', 'Сетка', 'Grid'],
  ['精灵', 'Sprite', 'Спрайт', 'Sprite'],
  ['无', 'None', 'Нет', 'None'],
];

const GEN_STYLE_OPTIONS: DdOption[] = [
  ['矿脉', 'Vein', 'Жила', 'Vein'],
  ['重矿脉', 'HeavyVeins', 'Тяжёлые жилы', 'HeavyVeins'],
  ['单独', 'Singular', 'Одиночная', 'Singular'],
  ['条纹', 'Stripe', 'Полоса', 'Stripe'],
  ['内部', 'Inner', 'Внутренняя', 'Inner'],
  ['外围', 'Outskirt', 'Окраина', 'Outskirt'],
];

const TILE_PROP_OPTIONS: DdOption[] = [
  ['血量', 'Health', 'Здоровье', 'health'], ['名称', 'Name', 'Имя', 'name'],
  ['描述', 'Description', 'Описание', 'description'], ['金属', 'Metallic', 'Металл', 'metallic'],
  ['毒性', 'Toxicity', 'Токсичность', 'toxicity'], ['滑', 'Slippery', 'Скользкий', 'slippery'],
  ['睡眠质量', 'SleepQuality', 'Качество сна', 'sleepQuality'],
  ['生成量', 'SpawnAmount', 'Кол-во спавна', 'spawnAmount'],
  ['碰撞体', 'Collider', 'Коллайдер', 'collider'], ['生成风格', 'GenStyle', 'Стиль генерации', 'genStyle'],
];

const LOCALE_TYPE_OPTIONS: DdOption[] = [
  ['物品', 'Item', 'Предмет', 'item'],
  ['建筑', 'Building', 'Здание', 'building'],
  ['标题', 'Title', 'Заголовок', 'title'],
];

const LIMB_OPTIONS: DdOption[] = [
  ['头部', 'Head', 'Голова', '0'],
  ['躯干', 'Torso', 'Торс', '1'],
  ['左臂', 'Left arm', 'Левая рука', '2'],
  ['右臂', 'Right arm', 'Правая рука', '3'],
  ['左腿', 'Left leg', 'Левая нога', '4'],
  ['右腿', 'Right leg', 'Правая нога', '5'],
];

const WEAR_LIMB_OPTIONS: DdOption[] = [
  ['头部', 'Head', 'Голова', 'Head'],
  ['躯干上', 'Upper Torso', 'Верх торса', 'UpTorso'],
  ['躯干下', 'Lower Torso', 'Низ торса', 'DownTorso'],
  ['左臂', 'Left Arm', 'Левая рука', 'HandA'],
  ['右臂', 'Right Arm', 'Правая рука', 'HandB'],
  ['左腿', 'Left Leg', 'Левая нога', 'LegA'],
  ['右腿', 'Right Leg', 'Правая нога', 'LegB'],
];

const AMMO_TYPE_OPTIONS: DdOption[] = [
  ['手枪', 'Pistol', 'Пистолет', 'Pistol'], ['步枪', 'Rifle', 'Винтовка', 'Rifle'], ['霰弹', 'Shotgun', 'Дробовик', 'Shotgun'],
];
const FIRING_MODE_OPTIONS: DdOption[] = [
  ['泵动', 'Pump', 'Помповый', 'Pump'], ['半自动', 'SemiAuto', 'Полуавтомат', 'SemiAuto'], ['全自动', 'Auto', 'Автомат', 'Auto'],
];
const FEED_TYPE_OPTIONS: DdOption[] = [
  ['弹匣供弹', 'Mag', 'Магазин', 'Mag'], ['直推供弹', 'Direct', 'Прямая подача', 'Direct'],
];

const STATUS_TYPE_OPTIONS: DdOption[] = [
  ['正面效果', 'Buff', 'Бафф', 'buff'], ['负面效果', 'Debuff', 'Дебафф', 'debuff'],
];

const STATUS_FIELD_OPTIONS: DdOption[] = [
  ['等级', 'Level', 'Уровень', 'level'], ['剩余时长', 'Remaining time', 'Оставшееся время', 'remaining'],
];

const DECAY_BOOL_OPTIONS: DdOption[] = [
  ['真', 'True', 'Истина', 'TRUE'],
  ['假', 'False', 'Ложь', 'FALSE'],
];

const RETURN_TYPE_OPTIONS: DdOption[] = [
  ['无', 'Void', 'Нет', 'void'],
  ['整数', 'Integer', 'Целое', 'int'],
  ['浮点数', 'Float', 'Дробное', 'float'],
  ['字符串', 'String', 'Строка', 'string'],
  ['布尔', 'Boolean', 'Логический', 'bool'],
];

const TAG_OPTIONS: DdOption[] = [
  ['可放置(placeable)', 'Placeable', 'Размещаемый', 'placeable'],
  ['可食用(edible)', 'Edible', 'Съедобный', 'edible'],
  ['可饮用(drinkable)', 'Drinkable', 'Питьевой', 'drinkable'],
  ['可穿戴(wearable)', 'Wearable', 'Носимый', 'wearable'],
  ['可堆叠(stackable)', 'Stackable', 'Стакающийся', 'stackable'],
];

const NUMBER_CMP_OPTIONS: DdOption[] = [
  ['>', '>', '>', '>'],
  ['<', '<', '<', '<'],
  ['=', '=', '=', '='],
  ['≥', '≥', '≥', '>='],
  ['≤', '≤', '≤', '<='],
];

const DROPDOWN_I18N: Record<string, Record<string, DdOption[]>> = {
  cu_set_item_category: { CATEGORY: CATEGORY_OPTIONS },
  cu_item_gun: { AMMO_TYPE: AMMO_TYPE_OPTIONS, FIRING_MODE: FIRING_MODE_OPTIONS, FEED_TYPE: FEED_TYPE_OPTIONS },
  cu_item_set_property: { PROP: PROP_OPTIONS },
  cu_item_set_tag: { TAG: TAG_OPTIONS },
  cu_item_use: { TARGET: TARGET_OPTIONS, ACTION: ACTION_OPTIONS },
  cu_item_consume: { TARGET: TARGET_OPTIONS },
  cu_item_set_condition: { TARGET: TARGET_OPTIONS, OP: COND_OP_OPTIONS },
  cu_item_set_weight: { TARGET: TARGET_OPTIONS },
  cu_item_set_value: { TARGET: TARGET_OPTIONS },
  cu_item_set_decay: { TARGET: TARGET_OPTIONS },
  cu_item_set_slot_rotation: { TARGET: TARGET_OPTIONS },
  cu_math_func: { FUNC: MATH_FUNC_OPTIONS },
  cu_math_op: { OP: MATH_OP_OPTIONS },
  cu_string_op: { OP: STRING_OP_OPTIONS },
  cu_logic_compare: { OP: LOGIC_OP_OPTIONS },
  cu_building_set_property: { PROP: BUILDING_PROP_OPTIONS },
  cu_tile_set_property: { PROP: TILE_PROP_OPTIONS },
  cu_register_locale: { TYPE: LOCALE_TYPE_OPTIONS },
  cu_limb_index: { LIMB: LIMB_OPTIONS },
  cu_item_wearable: { WEAR_LIMB: WEAR_LIMB_OPTIONS },
  cu_item_vanilla: { ID: VANILLA_ITEMS },
  cu_register_status: { TYPE: STATUS_TYPE_OPTIONS },
  cu_status_get: { FIELD: STATUS_FIELD_OPTIONS },
  cu_define_function: { RETURN_TYPE: RETURN_TYPE_OPTIONS },
  cu_item_magazine: { AMMO_TYPE: AMMO_TYPE_OPTIONS },
  cu_set_item_base_stats: { DECAY_ENABLED: DECAY_BOOL_OPTIONS },
  cu_number_compare: { OP: NUMBER_CMP_OPTIONS },
  cu_set_player_property: { PROP: PLAYER_PROP_OPTIONS },
  cu_set_player_flag: { PROP: PLAYER_BOOL_OPTIONS },
  cu_set_limb_property: { PROP: LIMB_PROP_OPTIONS },
  cu_set_limb_flag: { PROP: LIMB_BOOL_OPTIONS },
  cu_set_skill: { STAT: SKILL_OPTIONS },
  cu_set_skill_range: { STAT: SKILL_OPTIONS },
  cu_register_mod_option: { KIND: MOD_OPTION_KIND_OPTIONS },
  cu_cfg_get: { TYPE: CFG_TYPE_OPTIONS },
  cu_cfg_set: { TYPE: CFG_TYPE_OPTIONS },
  cu_load_texture_file: { FILTER: FILTER_MODE_OPTIONS, WRAP: TEXTURE_WRAP_OPTIONS },
  cu_register_liquid_tile: { VISUAL_MODE: LIQUID_VISUAL_MODE_OPTIONS },
};

function dd(lang: string, opts: DdOption[]): [string, string][] {
  return opts.map(([zh, en, ru, val]) => [lang === 'zh' ? zh : lang === 'ru' ? ru : en, val]);
}

/** Deep-clone BLOCK_JSON and replace every field_dropdown options array with lang-correct labels. */
function applyLang(lang: string) {
  const defs: any[] = JSON.parse(JSON.stringify(BLOCK_JSON));
  for (const def of defs) {
    const fields = DROPDOWN_I18N[def.type];
    if (!def.args0) continue;
    for (const arg of def.args0) {
      if (arg.type === 'field_dropdown' && fields) {
        const opts = fields[arg.name];
        if (opts) arg.options = dd(lang, opts);
      }
      // Update searchable dropdown language
      if (arg.type === 'field_searchable_dropdown') {
        arg.lang = lang;
      }
    }
  }
  return defs;
}

export { Blockly };
