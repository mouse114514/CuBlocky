import * as Blockly from 'blockly/core';
import { fieldRegistry } from 'blockly/core';

// ── Global sprite picker callback (React ↔ Blockly bridge) ──────
export type SpritePickCallback = (assetName: string) => void;
let _spritePickCb: SpritePickCallback | null = null;
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
};

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

  // ═══ Registration (pink) ═════════════════════════════════════
  // Item registration: id (item value block), fullName, description, category
  {
    type: 'cu_register_item',
    message0: '%{BKY_CU_REGISTER_ITEM}',
    args0: [
      { type: 'input_value', name: 'ID', check: 'Item', align: 'RIGHT' },
      { type: 'field_input', name: 'FULL_NAME', text: 'My Item', align: 'RIGHT' },
      { type: 'field_input', name: 'DESC', text: 'A description', align: 'RIGHT' },
      { type: 'field_dropdown', name: 'CATEGORY', options: [
        ['nospawn','nospawn'],['weapon','weapon'],['tool','tool'],
        ['medical','medical'],['food','food'],['material','material'],
        ['armor','armor'],['container','container'],['misc','misc'],
      ]},
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
    colour: C.REGISTER,
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
        ['价值(value)','value'],['标签(tags)','tags'],
        ['可使用(usable)','usable'],['可穿戴(wearable)','wearable'],
        ['左手使用(useLimbAction)','useLimbAction'],
        ['零耐久销毁(destroyAtZeroCondition)','destroyAtZeroCondition'],
      ]},
      { type: 'input_value', name: 'VALUE', check: ['Number','String','Boolean','Item'], align: 'RIGHT' },
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
      { type: 'input_value', name: 'IS_REPAIR', check: 'Boolean' },
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
    type: 'cu_set_happiness',
    message0: '%{BKY_CU_SET_HAPPINESS}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_temperature',
    message0: '%{BKY_CU_SET_TEMPERATURE}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_talk',
    message0: '%{BKY_CU_TALK}',
    args0: [{ type: 'input_value', name: 'TEXT', check: 'String', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_pain',
    message0: '%{BKY_CU_SET_PAIN}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_stress',
    message0: '%{BKY_CU_SET_STRESS}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_heart_rate',
    message0: '%{BKY_CU_SET_HEART_RATE}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_blood_pressure',
    message0: '%{BKY_CU_SET_BLOOD_PRESSURE}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_immunity',
    message0: '%{BKY_CU_SET_IMMUNITY}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
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
  { type: 'cu_var_get', message0: '%1', args0: [{ type: 'field_input', name: 'NAME', text: 'myVar' }], output: 'Number', colour: C.VALUE },
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
      { type: 'field_dropdown', name: 'ID', options: [
        ['绷带', 'bandage'], ['医用绷带', 'analgesicgauze'], ['消毒绷带', 'sterilizedbandage'],
        ['塑料绷带', 'plasticbandage'], ['创可贴', 'adhesivebandage'], ['藻酸盐绷带', 'alginate'],
        ['止痛药瓶', 'painkillers'], ['镇痛膏瓶', 'paincream'], ['吗啡注射器', 'morphine'],
        ['抗生素药瓶', 'antibiotics'], ['抗血清注射器', 'antiserum'], ['抗辐射剂药瓶', 'antirad'],
        ['纳洛酮注射器', 'naloxone'], ['芬太尼注射器', 'fentanyl'], ['海洛因注射器', 'heroin'],
        ['鸦片注射器', 'opium'], ['自动体外除颤仪', 'aed'], ['手动除颤仪', 'manualdefibrillator'],
        ['局部复苏装置', 'lrd'], ['简易局部复苏装置', 'makeshiftlrd'], ['自动泵', 'autopump'],
        ['医疗包', 'medkit'], ['夹板', 'splint'], ['血袋', 'bloodbag'],
        ['消毒液瓶', 'disinfectant'], ['注射器', 'syringe'], ['止血带', 'tourniquet'],
        ['手枪', 'pistol'], ['步枪', 'rifle'], ['霰弹枪', 'shotgun'],
        ['9mm子弹', '9mmround'], ['5.56子弹', '556round'], ['12号霰弹', '12gauge'],
        ['简易步枪', 'makeshiftrifle'], ['砍刀', 'machete'], ['十字镐', 'pickaxe'],
        ['大锤', 'sledgehammer'], ['爪子', 'claws'], ['炸药', 'dynamite'],
        ['铲子', 'shovel'], ['木铲', 'woodshovel'], ['干草叉', 'pitchfork'],
        ['微型激光钻', 'minilaserdrill'], ['重型钻', 'heavydrill'], ['钛合金多功能工具', 'titaniummultitool'],
        ['扳手', 'wrench'], ['简易扳手', 'makeshiftwrench'], ['攀爬绳', 'climbingrope'],
        ['攀爬爪', 'climbingclaws'], ['抓钩', 'grapplinghook'], ['手摇发电机', 'handcrank'],
        ['打火机', 'lighter'], ['火把', 'torch'], ['营地篝火', 'campfire'],
        ['地形扫描仪', 'terrainscanner'], ['盖革计数器', 'geigercounter'], ['开锁工具包', 'lockpickingkit'],
        ['废金属', 'scrapmetal'], ['废料块', 'scrapcube'], ['废料板', 'scrappanel'], ['废料管', 'scraptube'],
        ['木材碎片', 'woodscraps'], ['木块', 'woodcube'], ['木板', 'woodpanel'],
        ['绳子', 'rope'], ['细绳', 'string'], ['木棍', 'stick'], ['钉子', 'nails'],
        ['布料', 'canvas'], ['铜矿石', 'rawcopper'], ['加工铜', 'processedcopper'],
        ['钛板', 'titaniumslab'], ['钛棒', 'titaniumrod'], ['钛片', 'titaniumsheet'],
        ['塑料块', 'plasticchunk'], ['柔性玻璃', 'flexiglass'], ['电路板', 'circuitboard'],
        ['一捆电线', 'bundleofwires'], ['煤炭', 'charcoal'], ['易燃粉末', 'flammablepowder'],
        ['水瓶', 'waterbottle'], ['牛奶', 'milk'], ['巧克力牛奶', 'chocolatemilk'],
        ['汤', 'soup'], ['能量饮料', 'energydrink'], ['咖啡', 'coffee'],
        ['苹果汁', 'applejuice'], ['柠檬水', 'lemonade'], ['冰茶', 'icetea'],
        ['苏打水', 'sodabottle'], ['苏打罐', 'sodacan'], ['酒精', 'alcohol'],
        ['汉堡', 'burger'], ['牛排', 'steak'], ['披萨片', 'pizzaslice'],
        ['饼干', 'cookies'], ['薯片', 'chips'], ['面包', 'bread'],
        ['蛋糕', 'cake'], ['肉干', 'pemmican'], ['营养棒', 'nutrientbar'],
        ['塑料袋', 'plasticbag'], ['垃圾袋', 'trashbag'], ['植物纤维袋', 'foliagebag'],
        ['植物纤维挎包', 'slingbag'], ['重力袋', 'gravbag'], ['腿包', 'legpouch'],
        ['随身水包', 'liquidpouch'], ['材料包', 'materialpouch'], ['小背包', 'smallpack'],
        ['双肩大背包', 'bigpack'], ['工具箱', 'toolbox'], ['纸箱', 'box'],
        ['小桶', 'minibarrel'], ['水壶', 'canteen'], ['水罐', 'waterjug'],
        ['自行车头盔', 'bikehelmet'], ['防毒面具', 'dustmask'], ['围巾', 'scarf'],
        ['头灯', 'headlamp'], ['安全眼镜', 'safetyglasses'], ['巴拉克拉法帽', 'balaclava'],
        ['手套', 'latexgloves'], ['战术手套', 'tacticalgloves'], ['腰带', 'belt'],
        ['防弹衣', 'bellyarmor'], ['弹药带', 'bandolier'], ['腰包', 'fannypack'],
        ['运动鞋', 'sneakers'], ['战术靴', 'tacticalboots'], ['护膝', 'kneepads'],
        ['小型电池', 'smallbattery'], ['中型电池', 'mediumbattery'], ['大型电池', 'largebattery'],
        ['手电筒', 'flashlight'], ['应急手电', 'emergencylight'], ['提灯', 'lantern'],
        ['灯泡', 'lightbulb'], ['MP3播放器', 'mp3player'], ['手表', 'watch'],
        ['喷气背包', 'jetpack'], ['等离子切割器', 'plasmacutter'],
      ]},
    ],
    output: 'Item', colour: C.VALUE,
  },
  { type: 'cu_happiness', message0: '%{BKY_CU_HAPPINESS}', output: 'Number', colour: C.VALUE },
  { type: 'cu_temperature', message0: '%{BKY_CU_TEMPERATURE}', output: 'Number', colour: C.VALUE },
  { type: 'cu_hunger', message0: '%{BKY_CU_HUNGER}', output: 'Number', colour: C.VALUE },
  { type: 'cu_weight', message0: '%{BKY_CU_WEIGHT}', output: 'Number', colour: C.VALUE },
  { type: 'cu_position_x', message0: '%{BKY_CU_POSITION_X}', output: 'Number', colour: C.VALUE },
  { type: 'cu_position_y', message0: '%{BKY_CU_POSITION_Y}', output: 'Number', colour: C.VALUE },
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
      { type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' },
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
      { type: 'field_number', name: 'HEALTH', value: 250, min: 0, precision: 1 },
      { type: 'field_dropdown', name: 'PLACEMENT', options: [
        ['地面','Floor'],['墙壁','Wall'],['天花板','Ceiling'],
      ]},
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
      { type: 'field_number', name: 'HEALTH', value: 100, min: 0, precision: 1 },
      { type: 'field_dropdown', name: 'COLLIDER', options: [
        ['网格(Grid)','Grid'],['精灵(Sprite)','Sprite'],['无(None)','None'],
      ]},
      { type: 'field_dropdown', name: 'GEN_STYLE', options: [
        ['矿脉(Vein)','Vein'],['重矿脉(HeavyVeins)','HeavyVeins'],
        ['单独(Singular)','Singular'],['条纹(Stripe)','Stripe'],
        ['内部(Inner)','Inner'],['外围(Outskirt)','Outskirt'],
      ]},
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
  {
    type: 'cu_set_energy', message0: '%{BKY_CU_SET_ENERGY}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_brain_health', message0: '%{BKY_CU_SET_BRAIN_HEALTH}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_shock', message0: '%{BKY_CU_SET_SHOCK}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_blood_volume', message0: '%{BKY_CU_SET_BLOOD_VOLUME}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_sickness', message0: '%{BKY_CU_SET_SICKNESS}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_wetness', message0: '%{BKY_CU_SET_WETNESS}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
  },
  {
    type: 'cu_set_radiation', message0: '%{BKY_CU_SET_RADIATION}',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'Number', align: 'RIGHT' }],
    colour: C.BODY, previousStatement: null, nextStatement: null,
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
  {
    type: 'cu_set_limb_skin_health', message0: '%{BKY_CU_SET_LIMB_SKIN_HEALTH} %1 %2',
    args0: [
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_limb_muscle_health', message0: '%{BKY_CU_SET_LIMB_MUSCLE_HEALTH} %1 %2',
    args0: [
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_limb_pain', message0: '%{BKY_CU_SET_LIMB_PAIN} %1 %2',
    args0: [
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    colour: C.BODY, previousStatement: null, nextStatement: null, inputsInline: true,
  },
  {
    type: 'cu_set_limb_bleed', message0: '%{BKY_CU_SET_LIMB_BLEED} %1 %2',
    args0: [
      { type: 'input_value', name: 'LIMB', check: 'Number' },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
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
  CU_REGISTER_ITEM: '注册物品 id %1 名称 %2 描述 %3 分类 %4 精灵图 %5',
  CU_SPRITE_REF: '精灵图 %1',
  CU_DEFINE_ITEM_USE: '物品 %1 使用时',
  CU_DEFINE_ITEM_LIMB_USE: '物品 %1 肢体使用时',
  CU_ITEM_SET_PROPERTY: '设置物品 %1 属性 %2 为 %3',
  CU_REGISTER_RECIPE: '配方 %1 → %2 ×%3 耐久%4 修理%5',
  CU_EAT: '吃 饥饿 %1 体重增益 %2',
  CU_DRINK: '喝水 量 %1',
  CU_SET_HAPPINESS: '设置快乐度 %1',
  CU_SET_TEMPERATURE: '设置体温 %1',
  CU_TALK: '说话 %1',
  CU_SET_PAIN: '设置疼痛 %1',
  CU_SET_STRESS: '设置压力 %1',
  CU_SET_HEART_RATE: '设置心率 %1',
  CU_SET_BLOOD_PRESSURE: '设置血压 %1',
  CU_SET_IMMUNITY: '设置免疫力 %1',
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
  CU_POSITION_X: 'X坐标',
  CU_POSITION_Y: 'Y坐标',
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
  CU_REGISTER_BUILDING: '注册建筑 id %1 名称 %2 描述 %3 血量 %4 放置 %5',
  CU_BUILDING_SET_PROPERTY: '建筑 %1 设置 %2 为 %3',
  CU_REGISTER_TILE: '注册地块 id %1 名称 %2 血量 %3 碰撞 %4 生成 %5',
  CU_TILE_SET_PROPERTY: '地块 %1 设置 %2 为 %3',
  CU_REGISTER_LOCALE: '本地化 %1 id %2 中文 %3 英文 %4',
  CU_PLAYER_HEALTH: '玩家血量',
  CU_PLAYER_MAX_HEALTH: '玩家最大血量',
  CU_PLAYER_STAMINA: '玩家体力',
  CU_PLAYER_OXYGEN: '玩家氧气',
  CU_PLAYER_SLEEP_QUALITY: '玩家睡眠质量',
  CU_PLAYER_PAIN: '玩家疼痛',
  CU_PLAYER_STRESS: '玩家压力',
  CU_PLAYER_HEART_RATE: '玩家心率',
  CU_PLAYER_BLOOD_PRESSURE: '玩家血压',
  CU_PLAYER_IMMUNITY: '玩家免疫力',
  CU_PLAYER_THIRST: '玩家口渴',
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
  CU_PLAYER_ENERGY: '玩家体力值',
  CU_PLAYER_BRAIN_HEALTH: '玩家脑部健康',
  CU_PLAYER_SHOCK: '玩家休克值',
  CU_PLAYER_BLOOD_VOLUME: '玩家血量',
  CU_PLAYER_RESPIRATORY_RATE: '玩家呼吸频率',
  CU_PLAYER_SICKNESS: '玩家生病值',
  CU_PLAYER_ADRENALINE: '玩家肾上腺素',
  CU_PLAYER_RADIATION: '玩家辐射值',
  CU_PLAYER_WETNESS: '玩家湿度',
  CU_PLAYER_CLOTHING_TEMP: '玩家衣物温度',
  CU_PLAYER_ENCUMBRANCE: '玩家负重',
  CU_PLAYER_BLEED_SPEED: '玩家出血速度',
  // Extended Body booleans
  CU_PLAYER_CONSCIOUS: '玩家是否清醒',
  CU_PLAYER_STANDING: '玩家是否站立',
  CU_PLAYER_GROUNDED: '玩家是否着地',
  CU_PLAYER_IN_WATER: '玩家是否在水中',
  CU_PLAYER_BREATHING: '玩家是否在呼吸',
  CU_PLAYER_CROUCHING: '玩家是否蹲下',
  // Extended Body setters
  CU_SET_ENERGY: '设置体力值 %1',
  CU_SET_BRAIN_HEALTH: '设置脑部健康 %1',
  CU_SET_SHOCK: '设置休克值 %1',
  CU_SET_BLOOD_VOLUME: '设置血量 %1',
  CU_SET_SICKNESS: '设置生病值 %1',
  CU_SET_WETNESS: '设置湿度 %1',
  CU_SET_RADIATION: '设置辐射值 %1',
  // Extended Body actions
  CU_RAGDOLL: '触发布娃娃',
  CU_JUMP: '跳跃',
  CU_SWITCH_HANDS: '切换双手',
  CU_THROW_ITEM: '投掷物品',
  // Limb
  CU_LIMB_SKIN_HEALTH: '肢体皮肤健康',
  CU_LIMB_MUSCLE_HEALTH: '肢体肌肉健康',
  CU_LIMB_PAIN: '肢体疼痛',
  CU_LIMB_BLEED: '肢体出血量',
  CU_LIMB_INFECTION: '肢体感染量',
  CU_LIMB_BROKEN: '肢体是否骨折',
  CU_LIMB_DISLOCATED: '肢体是否脱臼',
  CU_LIMB_INFECTED: '肢体是否感染',
  CU_LIMB_DISMEMBERED: '肢体是否截肢',
  CU_SET_LIMB_SKIN_HEALTH: '设置肢体皮肤健康',
  CU_SET_LIMB_MUSCLE_HEALTH: '设置肢体肌肉健康',
  CU_SET_LIMB_PAIN: '设置肢体疼痛',
  CU_SET_LIMB_BLEED: '设置肢体出血',
  CU_LIMB_BREAK: '骨折肢体',
  CU_LIMB_MEND: '修复肢体',
  CU_LIMB_DISLOCATE: '脱臼肢体',
  CU_LIMB_UNDISLOCATE: '复位肢体',
  CU_LIMB_DISMEMBER: '截肢',
  // Item getters
  CU_ITEM_ID: '物品ID',
  CU_ITEM_CATEGORY: '物品分类',
  // World
  CU_WORLD_DEPTH: '玩家深度(米)',
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
  CU_REGISTER_ITEM: 'register item id %1 name %2 desc %3 category %4 sprite %5',
  CU_SPRITE_REF: 'sprite %1',
  CU_DEFINE_ITEM_USE: 'when %1 item used',
  CU_DEFINE_ITEM_LIMB_USE: 'when %1 item limb used',
  CU_ITEM_SET_PROPERTY: 'set item %1 property %2 to %3',
  CU_REGISTER_RECIPE: 'recipe %1 → %2 ×%3 cond%4 repair%5',
  CU_EAT: 'eat hunger %1 weight gain %2',
  CU_DRINK: 'drink amount %1',
  CU_SET_HAPPINESS: 'set happiness %1',
  CU_SET_TEMPERATURE: 'set temperature %1',
  CU_TALK: 'talk %1',
  CU_SET_PAIN: 'set pain %1',
  CU_SET_STRESS: 'set stress %1',
  CU_SET_HEART_RATE: 'set heart rate %1',
  CU_SET_BLOOD_PRESSURE: 'set blood pressure %1',
  CU_SET_IMMUNITY: 'set immunity %1',
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
  CU_POSITION_X: 'x position',
  CU_POSITION_Y: 'y position',
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
  CU_REGISTER_BUILDING: 'register building id %1 name %2 desc %3 health %4 placement %5',
  CU_BUILDING_SET_PROPERTY: 'building %1 set %2 to %3',
  CU_REGISTER_TILE: 'register tile id %1 name %2 health %3 collider %4 gen %5',
  CU_TILE_SET_PROPERTY: 'tile %1 set %2 to %3',
  CU_REGISTER_LOCALE: 'locale %1 id %2 zh %3 en %4',
  CU_PLAYER_HEALTH: 'player health',
  CU_PLAYER_MAX_HEALTH: 'player max health',
  CU_PLAYER_STAMINA: 'player stamina',
  CU_PLAYER_OXYGEN: 'player oxygen',
  CU_PLAYER_SLEEP_QUALITY: 'player sleep quality',
  CU_PLAYER_PAIN: 'player pain',
  CU_PLAYER_STRESS: 'player stress',
  CU_PLAYER_HEART_RATE: 'player heart rate',
  CU_PLAYER_BLOOD_PRESSURE: 'player blood pressure',
  CU_PLAYER_IMMUNITY: 'player immunity',
  CU_PLAYER_THIRST: 'player thirst',
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
  CU_PLAYER_ENERGY: 'player energy',
  CU_PLAYER_BRAIN_HEALTH: 'player brain health',
  CU_PLAYER_SHOCK: 'player shock',
  CU_PLAYER_BLOOD_VOLUME: 'player blood volume',
  CU_PLAYER_RESPIRATORY_RATE: 'player respiratory rate',
  CU_PLAYER_SICKNESS: 'player sickness',
  CU_PLAYER_ADRENALINE: 'player adrenaline',
  CU_PLAYER_RADIATION: 'player radiation',
  CU_PLAYER_WETNESS: 'player wetness',
  CU_PLAYER_CLOTHING_TEMP: 'player clothing temp',
  CU_PLAYER_ENCUMBRANCE: 'player encumbrance',
  CU_PLAYER_BLEED_SPEED: 'player bleed speed',
  // Extended Body booleans
  CU_PLAYER_CONSCIOUS: 'player is conscious',
  CU_PLAYER_STANDING: 'player is standing',
  CU_PLAYER_GROUNDED: 'player is grounded',
  CU_PLAYER_IN_WATER: 'player is in water',
  CU_PLAYER_BREATHING: 'player is breathing',
  CU_PLAYER_CROUCHING: 'player is crouching',
  // Extended Body setters
  CU_SET_ENERGY: 'set energy %1',
  CU_SET_BRAIN_HEALTH: 'set brain health %1',
  CU_SET_SHOCK: 'set shock %1',
  CU_SET_BLOOD_VOLUME: 'set blood volume %1',
  CU_SET_SICKNESS: 'set sickness %1',
  CU_SET_WETNESS: 'set wetness %1',
  CU_SET_RADIATION: 'set radiation %1',
  // Extended Body actions
  CU_RAGDOLL: 'ragdoll',
  CU_JUMP: 'jump',
  CU_SWITCH_HANDS: 'switch hands',
  CU_THROW_ITEM: 'throw item',
  // Limb
  CU_LIMB_SKIN_HEALTH: 'limb skin health',
  CU_LIMB_MUSCLE_HEALTH: 'limb muscle health',
  CU_LIMB_PAIN: 'limb pain',
  CU_LIMB_BLEED: 'limb bleed amount',
  CU_LIMB_INFECTION: 'limb infection amount',
  CU_LIMB_BROKEN: 'limb is broken',
  CU_LIMB_DISLOCATED: 'limb is dislocated',
  CU_LIMB_INFECTED: 'limb is infected',
  CU_LIMB_DISMEMBERED: 'limb is dismembered',
  CU_SET_LIMB_SKIN_HEALTH: 'set limb skin health',
  CU_SET_LIMB_MUSCLE_HEALTH: 'set limb muscle health',
  CU_SET_LIMB_PAIN: 'set limb pain',
  CU_SET_LIMB_BLEED: 'set limb bleed',
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
};

export function setMessages(lang: string) {
  const msgs = lang === 'zh' ? MSG_ZH : MSG_EN;
  for (const [key, val] of Object.entries(msgs)) {
    (Blockly.Msg as Record<string, string>)[key] = val;
  }
}

// ── Define blocks ──
export function defineBlocks(lang: string = 'zh') {
  _blocksLang = lang;
  const defs = applyLang(lang);
  Blockly.defineBlocksWithJsonArray(defs);

  // Force lists_create_with to horizontal
  const blocks = (Blockly as any).Blocks;
  if (blocks && blocks.lists_create_with) {
    blocks.lists_create_with.inputsInline = true;
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

const EVENT_TYPES = new Set(['cu_when_awake', 'cu_when_update', 'cu_when_hurt', 'cu_when_die', 'cu_when_pickup', 'cu_when_drop', 'cu_when_wear', 'cu_when_heal', 'cu_when_laststand', 'cu_when_enter_world']);
const origBlockToCode = csharpGenerator.blockToCode.bind(csharpGenerator);
csharpGenerator.blockToCode = (block: Blockly.Block, opt_thisOnly?: boolean) => {
  if (block && EVENT_TYPES.has(block.type) && !opt_thisOnly) {
    const opening = origBlockToCode(block, true);
    let rest = '';
    let cur = block.getNextBlock();
    while (cur) {
      rest += origBlockToCode(cur);
      cur = cur.getNextBlock();
    }
    return opening + rest + '//ENDPATCH\n';
  }
  return origBlockToCode(block, opt_thisOnly);
};
const ORDER_ATOMIC = 0;

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

// Registration
csharpGenerator.forBlock['cu_register_item'] = (block, gen) => {
  const id = gen.valueToCode(block, 'ID', ORDER_ATOMIC) || '"myItem"';
  const name = block.getFieldValue('FULL_NAME').replace(/"/g, '\\"');
  const desc = block.getFieldValue('DESC').replace(/"/g, '\\"');
  const cat = block.getFieldValue('CATEGORY');
  const spriteCode = gen.valueToCode(block, 'SPRITE_REF', ORDER_ATOMIC) || '';
  const spriteId = spriteCode.replace(/^"|"$/g, '') || null;
  const json = JSON.stringify({Id: id.replace(/^"|"$/g, ''), FullName: name, Description: desc, Category: cat, Weight: 0.4, Value: 1, DecayMinutes: 180, Recognition: 2, SpawnFrequency: 1, SpriteAssetId: spriteId});
  return `//REGISTER_ITEM:${json}\n`;
};
csharpGenerator.forBlock['cu_sprite_ref'] = (block, gen) => {
  const asset = block.getFieldValue('ASSET') || '';
  return [`"${asset}"`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_define_item_use'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"myItem"';
  const itemId = item.replace(/^"|"$/g, '');
  let inner = '';
  let child = block.getNextBlock();
  while (child) {
    inner += gen.blockToCode(child);
    child = child.getNextBlock();
  }
  return `//ITEM_USE_ACTION:${itemId}\n${inner}//END_ITEM_USE_ACTION\n`;
};
csharpGenerator.forBlock['cu_define_item_limb_use'] = (block, gen) => {
  const item = gen.valueToCode(block, 'ITEM', ORDER_ATOMIC) || '"myItem"';
  const itemId = item.replace(/^"|"$/g, '');
  let inner = '';
  let child = block.getNextBlock();
  while (child) {
    inner += gen.blockToCode(child);
    child = child.getNextBlock();
  }
  return `//ITEM_LIMB_USE_ACTION:${itemId}\n${inner}//END_ITEM_LIMB_USE_ACTION\n`;
};
csharpGenerator.forBlock['cu_item_set_property'] = (block, gen) => {
  const prop = block.getFieldValue('PROP');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  const target = gen.valueToCode(block, 'TARGET_ITEM', ORDER_ATOMIC) || '"myItem"';
  const itemProps = ['condition'];
  const statsProps = ['weight','slotRotation','rotSpeed','usable','wearable','useLimbAction','destroyAtZeroCondition','jumpHeightMultChange','wearableArmor','wearableIsolation','wearableHitDurabilityLossMultiplier','wearableVisualOffset','spriteScale','scaleConditionToward','tags'];
  if (itemProps.includes(prop)) return `${target}.${prop} = ${float(v)};\n`;
  if (statsProps.includes(prop)) return `${target}.Stats.${prop} = ${float(v)};\n`;
  return `${target}.${prop} = ${v};\n`;
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
  const repair = gen.valueToCode(block, 'IS_REPAIR', ORDER_ATOMIC) || 'false';

  // Walk the connected INPUTS list to extract real ingredient data
  const listBlock = block.getInputTargetBlock('INPUTS');
  const itemIds = extractListItemIds(listBlock);

  // Build List<RecipeItem> code from extracted IDs
  const recipeItems = itemIds.map(id =>
    `new RecipeItem(0.9f) { specificId = "${id}" }`
  ).join(', ');
  const inputsCode = `new List<RecipeItem> { ${recipeItems} }`;

  // Build code
  let code = `RecipeRegistry.Register(new Recipe {\n  result = new RecipeResult { id = ${out}, amount = ${amt}`;
  if (cond !== '-1') code += `, resultCondition = ${cond}`;
  code += ` },\n  items = ${inputsCode},\n  isRepair = ${repair}\n});\n`;

  // Build JSON with real ingredients
  const ingredients = itemIds.map(id => ({
    Mode: 'specific',
    Id: id,
    Amount: 1,
    IsLiquid: false,
    DestroyItem: true,
  }));
  const json = JSON.stringify({
    ResultId: out.replace(/^"|"$/g, ''),
    Category: 'Tools',
    IntRequirement: 2,
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
  return `body.Eat(${h}f, ${w}f);\n`;
};
csharpGenerator.forBlock['cu_drink'] = (block, gen) => {
  const a = gen.valueToCode(block, 'AMOUNT', ORDER_ATOMIC) || '4';
  return `body.Drink(${a}f);\n`;
};
csharpGenerator.forBlock['cu_set_happiness'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '1';
  return `body.happiness = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_temperature'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.temperature = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_talk'] = (block, gen) => {
  const t = gen.valueToCode(block, 'TEXT', ORDER_ATOMIC) || '"Hello"';
  return `body.talker.Talk(${t});\n`;
};
csharpGenerator.forBlock['cu_set_pain'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.limbs[0].pain = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_stress'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `/* body.stress does not exist; use averagePain or another field */\n`;
};
csharpGenerator.forBlock['cu_set_heart_rate'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.heartRate = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_blood_pressure'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.bloodPressure = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_immunity'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.immunity = ${float(v)};\n`;
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
  return `${targetExpr}.condition -= ${amt}f;\n`;
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
  return `Sound.Play("${s}", new Vector3(${x}f, ${y}f, 0f), twoDimensional: false, pitchShift: false, null, ${float(vol)}f);\n`;
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
  const v = block.getFieldValue('VAR') || 'i';
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

// Value
csharpGenerator.forBlock['cu_number'] = (block) => [`${block.getFieldValue('NUM')}`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_text'] = (block) => {
  const v = block.getFieldValue('TEXT');
  return [`"${v}"`, ORDER_ATOMIC];
};
csharpGenerator.forBlock['cu_var_get'] = (block) => [`_{block.getFieldValue('NAME')}`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_custom'] = (block) => [`"${block.getFieldValue('ID')}"`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_item_vanilla'] = (block) => [`"${block.getFieldValue('ID')}"`, ORDER_ATOMIC];
csharpGenerator.forBlock['cu_happiness'] = () => ['body.happiness', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_temperature'] = () => ['body.temperature', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_hunger'] = () => ['body.hunger', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_weight'] = () => ['body.weightOffset', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_position_x'] = () => ['body.transform.position.x', ORDER_ATOMIC];
csharpGenerator.forBlock['cu_position_y'] = () => ['body.transform.position.y', ORDER_ATOMIC];
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
  return `_${n} = ${v};\n`;
};
csharpGenerator.forBlock['cu_var_change'] = (block, gen) => {
  const n = block.getFieldValue('NAME');
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '1';
  return `_${n} += ${v};\n`;
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
  const health = block.getFieldValue('HEALTH');
  const placement = block.getFieldValue('PLACEMENT');
  const json = JSON.stringify({Id: id, Name: name, Desc: desc, Health: parseFloat(health), Placement: placement});
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
  const health = block.getFieldValue('HEALTH');
  const collider = block.getFieldValue('COLLIDER');
  const genStyle = block.getFieldValue('GEN_STYLE');
  const json = JSON.stringify({Id: id, Name: name, Health: parseFloat(health), Collider: collider, GenStyle: genStyle});
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
csharpGenerator.forBlock['cu_set_energy'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.energy = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_brain_health'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.brainHealth = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_shock'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.shock = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_blood_volume'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.bloodVolume = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_sickness'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.sicknessAmount = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_wetness'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.wetness = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_radiation'] = (block, gen) => {
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `body.radiationSickness = ${float(v)};\n`;
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
csharpGenerator.forBlock['cu_set_limb_skin_health'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `${limb}.skinHealth = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_limb_muscle_health'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `${limb}.muscleHealth = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_limb_pain'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `${limb}.pain = ${float(v)};\n`;
};
csharpGenerator.forBlock['cu_set_limb_bleed'] = (block, gen) => {
  const limb = gen.valueToCode(block, 'LIMB', ORDER_ATOMIC) || 'body.limbs[0]';
  const v = gen.valueToCode(block, 'VALUE', ORDER_ATOMIC) || '0';
  return `${limb}.bleedAmount = ${float(v)};\n`;
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

// ═══ Dropdown i18n ═══════════════════════════════════════════
type DdOption = [string, string, string]; // [zhLabel, enLabel, value]
let _blocksLang = 'zh';

const PROP_OPTIONS: DdOption[] = [
  ['耐久', 'Durability', 'condition'], ['重量', 'Weight', 'weight'],
  ['价值', 'Value', 'value'], ['标签', 'Tags', 'tags'],
  ['可使用', 'Usable', 'usable'], ['可穿戴', 'Wearable', 'wearable'],
  ['左手使用', 'UseLimbAction', 'useLimbAction'],
  ['零耐久销毁', 'DestroyAtZero', 'destroyAtZeroCondition'],
];

const TARGET_OPTIONS: DdOption[] = [
  ['当前物品', 'This item', 'this'],
  ['左手', 'Left hand', 'left'],
  ['右手', 'Right hand', 'right'],
];

const ACTION_OPTIONS: DdOption[] = [
  ['使用', 'Use', 'use'],
  ['丢弃', 'Drop', 'drop'],
  ['装备', 'Equip', 'equip'],
];

const COND_OP_OPTIONS: DdOption[] = [
  ['设为', 'Set', '='],
  ['增加', 'Add', '+'],
  ['减少', 'Subtract', '-'],
];

const MATH_FUNC_OPTIONS: DdOption[] = [
  ['四舍五入', 'Round', 'ROUND'],
  ['绝对值', 'Absolute', 'ABS'],
  ['平方根', 'Square root', 'SQRT'],
  ['取反', 'Negate', 'NEG'],
];

const MATH_OP_OPTIONS: DdOption[] = [
  ['+', '+', 'ADD'], ['−', '−', 'SUB'], ['×', '×', 'MUL'],
  ['÷', '÷', 'DIV'], ['%', '%', 'MOD'], ['幂', 'Pow', 'POW'],
];

const STRING_OP_OPTIONS: DdOption[] = [
  ['字符串长度', 'Length', 'LEN'],
  ['拼接', 'Join', 'JOIN'],
];

const LOGIC_OP_OPTIONS: DdOption[] = [
  ['且', 'And', 'AND'],
  ['或', 'Or', 'OR'],
];

const PLACEMENT_OPTIONS: DdOption[] = [
  ['地面', 'Floor', 'Floor'],
  ['墙壁', 'Wall', 'Wall'],
  ['天花板', 'Ceiling', 'Ceiling'],
];

const BUILDING_PROP_OPTIONS: DdOption[] = [
  ['血量', 'Health', 'health'], ['名称', 'Name', 'name'],
  ['描述', 'Description', 'description'], ['地面放置', 'RequireGround', 'requireGround'],
  ['金属', 'Metallic', 'metallic'], ['动物', 'Animal', 'animal'],
  ['掉落倍率', 'DropChance', 'dropChanceMultiplier'],
  ['生成最小数', 'SpawnMin', 'spawnMinPerChunk'],
  ['生成最大数', 'SpawnMax', 'spawnMaxPerChunk'],
];

const COLLIDER_OPTIONS: DdOption[] = [
  ['网格', 'Grid', 'Grid'],
  ['精灵', 'Sprite', 'Sprite'],
  ['无', 'None', 'None'],
];

const GEN_STYLE_OPTIONS: DdOption[] = [
  ['矿脉', 'Vein', 'Vein'],
  ['重矿脉', 'HeavyVeins', 'HeavyVeins'],
  ['单独', 'Singular', 'Singular'],
  ['条纹', 'Stripe', 'Stripe'],
  ['内部', 'Inner', 'Inner'],
  ['外围', 'Outskirt', 'Outskirt'],
];

const TILE_PROP_OPTIONS: DdOption[] = [
  ['血量', 'Health', 'health'], ['名称', 'Name', 'name'],
  ['描述', 'Description', 'description'], ['金属', 'Metallic', 'metallic'],
  ['毒性', 'Toxicity', 'toxicity'], ['滑', 'Slippery', 'slippery'],
  ['睡眠质量', 'SleepQuality', 'sleepQuality'],
  ['生成量', 'SpawnAmount', 'spawnAmount'],
];

const LOCALE_TYPE_OPTIONS: DdOption[] = [
  ['物品', 'Item', 'item'],
  ['建筑', 'Building', 'building'],
  ['标题', 'Title', 'title'],
];

const LIMB_OPTIONS: DdOption[] = [
  ['头部', 'Head', '0'],
  ['躯干', 'Torso', '1'],
  ['左臂', 'Left arm', '2'],
  ['右臂', 'Right arm', '3'],
  ['左腿', 'Left leg', '4'],
  ['右腿', 'Right leg', '5'],
];

const VANILLA_ITEMS: DdOption[] = [
  ['绷带', 'Bandage', 'bandage'], ['医用绷带', 'Medical Gauze', 'analgesicgauze'],
  ['消毒绷带', 'Sterilized Bandage', 'sterilizedbandage'],
  ['塑料绷带', 'Plastic Bandage', 'plasticbandage'],
  ['创可贴', 'Adhesive Bandage', 'adhesivebandage'],
  ['藻酸盐绷带', 'Alginate Bandage', 'alginate'],
  ['止痛药瓶', 'Painkillers', 'painkillers'],
  ['镇痛膏瓶', 'Pain Cream', 'paincream'],
  ['吗啡注射器', 'Morphine', 'morphine'],
  ['抗生素药瓶', 'Antibiotics', 'antibiotics'],
  ['抗血清注射器', 'Antiserum', 'antiserum'],
  ['抗辐射剂药瓶', 'Antirad', 'antirad'],
  ['纳洛酮注射器', 'Naloxone', 'naloxone'],
  ['芬太尼注射器', 'Fentanyl', 'fentanyl'],
  ['海洛因注射器', 'Heroin', 'heroin'],
  ['鸦片注射器', 'Opium', 'opium'],
  ['自动体外除颤仪', 'AED', 'aed'],
  ['手动除颤仪', 'Manual Defibrillator', 'manualdefibrillator'],
  ['局部复苏装置', 'LRD', 'lrd'],
  ['简易局部复苏装置', 'Makeshift LRD', 'makeshiftlrd'],
  ['自动泵', 'Auto Pump', 'autopump'],
  ['医疗包', 'Medkit', 'medkit'], ['夹板', 'Splint', 'splint'],
  ['血袋', 'Blood Bag', 'bloodbag'],
  ['消毒液瓶', 'Disinfectant', 'disinfectant'],
  ['注射器', 'Syringe', 'syringe'], ['止血带', 'Tourniquet', 'tourniquet'],
  ['手枪', 'Pistol', 'pistol'], ['步枪', 'Rifle', 'rifle'],
  ['霰弹枪', 'Shotgun', 'shotgun'],
  ['9mm子弹', '9mm Round', '9mmround'],
  ['5.56子弹', '5.56 Round', '556round'],
  ['12号霰弹', '12 Gauge', '12gauge'],
  ['简易步枪', 'Makeshift Rifle', 'makeshiftrifle'],
  ['砍刀', 'Machete', 'machete'], ['十字镐', 'Pickaxe', 'pickaxe'],
  ['大锤', 'Sledgehammer', 'sledgehammer'], ['爪子', 'Claws', 'claws'],
  ['炸药', 'Dynamite', 'dynamite'], ['铲子', 'Shovel', 'shovel'],
  ['木铲', 'Wood Shovel', 'woodshovel'], ['干草叉', 'Pitchfork', 'pitchfork'],
  ['微型激光钻', 'Mini Laser Drill', 'minilaserdrill'],
  ['重型钻', 'Heavy Drill', 'heavydrill'],
  ['钛合金多功能工具', 'Titanium Multitool', 'titaniummultitool'],
  ['扳手', 'Wrench', 'wrench'], ['简易扳手', 'Makeshift Wrench', 'makeshiftwrench'],
  ['攀爬绳', 'Climbing Rope', 'climbingrope'],
  ['攀爬爪', 'Climbing Claws', 'climbingclaws'],
  ['抓钩', 'Grappling Hook', 'grapplinghook'],
  ['手摇发电机', 'Hand Crank', 'handcrank'],
  ['打火机', 'Lighter', 'lighter'], ['火把', 'Torch', 'torch'],
  ['营地篝火', 'Campfire', 'campfire'],
  ['地形扫描仪', 'Terrain Scanner', 'terrainscanner'],
  ['盖革计数器', 'Geiger Counter', 'geigercounter'],
  ['开锁工具包', 'Lockpicking Kit', 'lockpickingkit'],
  ['废金属', 'Scrap Metal', 'scrapmetal'],
  ['废料块', 'Scrap Cube', 'scrapcube'],
  ['废料板', 'Scrap Panel', 'scrappanel'],
  ['废料管', 'Scrap Tube', 'scraptube'],
  ['木材碎片', 'Wood Scraps', 'woodscraps'],
  ['木块', 'Wood Cube', 'woodcube'], ['木板', 'Wood Panel', 'woodpanel'],
  ['绳子', 'Rope', 'rope'], ['细绳', 'String', 'string'],
  ['木棍', 'Stick', 'stick'], ['钉子', 'Nails', 'nails'],
  ['布料', 'Canvas', 'canvas'], ['铜矿石', 'Raw Copper', 'rawcopper'],
  ['加工铜', 'Processed Copper', 'processedcopper'],
  ['钛板', 'Titanium Slab', 'titaniumslab'],
  ['钛棒', 'Titanium Rod', 'titaniumrod'],
  ['钛片', 'Titanium Sheet', 'titaniumsheet'],
  ['塑料块', 'Plastic Chunk', 'plasticchunk'],
  ['柔性玻璃', 'Flexiglass', 'flexiglass'],
  ['电路板', 'Circuit Board', 'circuitboard'],
  ['一捆电线', 'Bundle of Wires', 'bundleofwires'],
  ['煤炭', 'Charcoal', 'charcoal'],
  ['易燃粉末', 'Flammable Powder', 'flammablepowder'],
  ['水瓶', 'Water Bottle', 'waterbottle'], ['牛奶', 'Milk', 'milk'],
  ['巧克力牛奶', 'Chocolate Milk', 'chocolatemilk'],
  ['汤', 'Soup', 'soup'], ['能量饮料', 'Energy Drink', 'energydrink'],
  ['咖啡', 'Coffee', 'coffee'], ['苹果汁', 'Apple Juice', 'applejuice'],
  ['柠檬水', 'Lemonade', 'lemonade'], ['冰茶', 'Ice Tea', 'icetea'],
  ['苏打水', 'Soda Bottle', 'sodabottle'], ['苏打罐', 'Soda Can', 'sodacan'],
  ['酒精', 'Alcohol', 'alcohol'], ['汉堡', 'Burger', 'burger'],
  ['牛排', 'Steak', 'steak'], ['披萨片', 'Pizza Slice', 'pizzaslice'],
  ['饼干', 'Cookies', 'cookies'], ['薯片', 'Chips', 'chips'],
  ['面包', 'Bread', 'bread'], ['蛋糕', 'Cake', 'cake'],
  ['肉干', 'Pemmican', 'pemmican'],
  ['营养棒', 'Nutrient Bar', 'nutrientbar'],
  ['塑料袋', 'Plastic Bag', 'plasticbag'],
  ['垃圾袋', 'Trash Bag', 'trashbag'],
  ['植物纤维袋', 'Foliage Bag', 'foliagebag'],
  ['植物纤维挎包', 'Sling Bag', 'slingbag'],
  ['重力袋', 'Grav Bag', 'gravbag'], ['腿包', 'Leg Pouch', 'legpouch'],
  ['随身水包', 'Liquid Pouch', 'liquidpouch'],
  ['材料包', 'Material Pouch', 'materialpouch'],
  ['小背包', 'Small Pack', 'smallpack'],
  ['双肩大背包', 'Big Pack', 'bigpack'],
  ['工具箱', 'Toolbox', 'toolbox'], ['纸箱', 'Box', 'box'],
  ['小桶', 'Mini Barrel', 'minibarrel'], ['水壶', 'Canteen', 'canteen'],
  ['水罐', 'Water Jug', 'waterjug'],
  ['自行车头盔', 'Bike Helmet', 'bikehelmet'],
  ['防毒面具', 'Dust Mask', 'dustmask'], ['围巾', 'Scarf', 'scarf'],
  ['头灯', 'Headlamp', 'headlamp'],
  ['安全眼镜', 'Safety Glasses', 'safetyglasses'],
  ['巴拉克拉法帽', 'Balaclava', 'balaclava'],
  ['手套', 'Latex Gloves', 'latexgloves'],
  ['战术手套', 'Tactical Gloves', 'tacticalgloves'],
  ['腰带', 'Belt', 'belt'], ['防弹衣', 'Belly Armor', 'bellyarmor'],
  ['弹药带', 'Bandolier', 'bandolier'], ['腰包', 'Fanny Pack', 'fannypack'],
  ['运动鞋', 'Sneakers', 'sneakers'],
  ['战术靴', 'Tactical Boots', 'tacticalboots'],
  ['护膝', 'Kneepads', 'kneepads'],
  ['小型电池', 'Small Battery', 'smallbattery'],
  ['中型电池', 'Medium Battery', 'mediumbattery'],
  ['大型电池', 'Large Battery', 'largebattery'],
  ['手电筒', 'Flashlight', 'flashlight'],
  ['应急手电', 'Emergency Light', 'emergencylight'],
  ['提灯', 'Lantern', 'lantern'], ['灯泡', 'Light Bulb', 'lightbulb'],
  ['MP3播放器', 'MP3 Player', 'mp3player'], ['手表', 'Watch', 'watch'],
  ['喷气背包', 'Jetpack', 'jetpack'],
  ['等离子切割器', 'Plasma Cutter', 'plasmacutter'],
];

const DROPDOWN_I18N: Record<string, Record<string, DdOption[]>> = {
  cu_item_set_property: { PROP: PROP_OPTIONS },
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
  cu_register_building: { PLACEMENT: PLACEMENT_OPTIONS },
  cu_building_set_property: { PROP: BUILDING_PROP_OPTIONS },
  cu_register_tile: { COLLIDER: COLLIDER_OPTIONS, GEN_STYLE: GEN_STYLE_OPTIONS },
  cu_tile_set_property: { PROP: TILE_PROP_OPTIONS },
  cu_register_locale: { TYPE: LOCALE_TYPE_OPTIONS },
  cu_limb_index: { LIMB: LIMB_OPTIONS },
  cu_item_vanilla: { ID: VANILLA_ITEMS },
};

function dd(lang: string, opts: DdOption[]): [string, string][] {
  return opts.map(([zh, en, val]) => [lang === 'zh' ? zh : en, val]);
}

/** Deep-clone BLOCK_JSON and replace every field_dropdown options array with lang-correct labels. */
function applyLang(lang: string) {
  const defs: any[] = JSON.parse(JSON.stringify(BLOCK_JSON));
  for (const def of defs) {
    const fields = DROPDOWN_I18N[def.type];
    if (!fields || !def.args0) continue;
    for (const arg of def.args0) {
      if (arg.type !== 'field_dropdown') continue;
      const opts = fields[arg.name];
      if (opts) arg.options = dd(lang, opts);
    }
  }
  return defs;
}

export { Blockly };
