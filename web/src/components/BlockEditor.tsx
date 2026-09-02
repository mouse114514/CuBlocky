import { useEffect, useRef, useCallback } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { defineBlocks, setMessages, csharpGenerator } from '../blocklySetup';
import { useI18n } from '../i18n';
import './BlockEditor.css';

interface Props {
  onCodeChange: (code: string) => void;
  onBlocksChange?: (xml: string) => void;
  onWorkspaceReady?: (ws: Blockly.WorkspaceSvg) => void;
}

const CAT_ICONS: Record<string, string> = {
  CAT_EVENT: '/media/cat-icons/event.png',
  CAT_REGISTER: '/media/cat-icons/register.png',
  CAT_BODY: '/media/cat-icons/body.png',
  CAT_ITEM: '/media/cat-icons/item.png',
  CAT_SOUND: '/media/cat-icons/sound.png',
  CAT_WORLD: '/media/cat-icons/world.png',
  CAT_FLOW: '/media/cat-icons/flow.png',
  CAT_VALUE: '/media/cat-icons/value.png',
  CAT_BOOLEAN: '/media/cat-icons/boolean.png',
  CAT_VAR: '/media/cat-icons/var.png',
  CAT_BUILDING: '/media/cat-icons/building.png',
  CAT_TILE: '/media/cat-icons/tile.png',
  CAT_LOCALE: '',
};

const TOOLBOX = `
<xml id="toolbox" style="display: none">
  <category name="%{BKY_CAT_EVENT}" colour="#ff8c1a" icon="⚡">
    <block type="cu_when_awake"></block>
    <block type="cu_when_update"></block>
    <block type="cu_when_hurt"></block>
    <block type="cu_when_die"></block>
    <sep></sep>
    <block type="cu_when_pickup"></block>
    <block type="cu_when_drop"></block>
    <block type="cu_when_wear"></block>
    <sep></sep>
    <block type="cu_when_heal"></block>
    <block type="cu_when_laststand"></block>
    <block type="cu_when_enter_world"></block>
    <block type="cu_define_item_use">
      <value name="ITEM"><shadow type="cu_item_custom"><field name="ID">myItem</field></shadow></value>
    </block>
    <block type="cu_define_item_limb_use">
      <value name="ITEM"><shadow type="cu_item_custom"><field name="ID">myItem</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_REGISTER}" colour="#e91e63" icon="📦">
    <block type="cu_register_item">
      <value name="ID"><shadow type="cu_item_custom"><field name="ID">myItem</field></shadow></value>
    </block>
    <block type="cu_register_recipe">
      <value name="INPUTS"><shadow type="lists_create_with"></shadow></value>
      <value name="OUTPUT"><shadow type="cu_item_vanilla"><field name="ID">bandage</field></shadow></value>
      <value name="AMOUNT"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
      <value name="RESULT_CONDITION"><shadow type="cu_number"><field name="NUM">-1</field></shadow></value>
      <value name="IS_REPAIR"><shadow type="cu_false"></shadow></value>
    </block>
    <block type="cu_register_building"></block>
    <block type="cu_register_tile"></block>
    <block type="cu_register_locale"></block>
  </category>
  <category name="%{BKY_CAT_BODY}" colour="#4caf50" icon="🧍">
    <block type="cu_eat">
      <value name="HUNGER"><shadow type="cu_number"><field name="NUM">12</field></shadow></value>
      <value name="WEIGHT_GAIN"><shadow type="cu_number"><field name="NUM">0.5</field></shadow></value>
    </block>
    <block type="cu_drink">
      <value name="AMOUNT"><shadow type="cu_number"><field name="NUM">4</field></shadow></value>
    </block>
    <block type="cu_set_happiness">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_set_temperature">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_talk">
      <value name="TEXT"><shadow type="cu_text"><field name="TEXT">你好!</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_set_pain">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_stress">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_heart_rate">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">80</field></shadow></value>
    </block>
    <block type="cu_set_blood_pressure">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_immunity">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_sleep"></block>
    <block type="cu_wake"></block>
    <sep></sep>
    <block type="cu_player_health"></block>
    <block type="cu_player_max_health"></block>
    <block type="cu_player_stamina"></block>
    <block type="cu_player_oxygen"></block>
    <block type="cu_player_sleep_quality"></block>
    <block type="cu_player_pain"></block>
    <block type="cu_player_stress"></block>
    <block type="cu_player_heart_rate"></block>
    <block type="cu_player_blood_pressure"></block>
    <block type="cu_player_immunity"></block>
    <block type="cu_player_thirst"></block>
    <sep></sep>
    <block type="cu_set_energy">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="cu_set_brain_health">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="cu_set_shock">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_blood_volume">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="cu_set_sickness">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_wetness">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_radiation">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_player_energy"></block>
    <block type="cu_player_brain_health"></block>
    <block type="cu_player_shock"></block>
    <block type="cu_player_blood_volume"></block>
    <block type="cu_player_respiratory_rate"></block>
    <block type="cu_player_sickness"></block>
    <block type="cu_player_adrenaline"></block>
    <block type="cu_player_radiation"></block>
    <block type="cu_player_wetness"></block>
    <block type="cu_player_clothing_temp"></block>
    <block type="cu_player_encumbrance"></block>
    <block type="cu_player_bleed_speed"></block>
    <sep></sep>
    <block type="cu_player_conscious"></block>
    <block type="cu_player_standing"></block>
    <block type="cu_player_grounded"></block>
    <block type="cu_player_in_water"></block>
    <block type="cu_player_breathing"></block>
    <block type="cu_player_crouching"></block>
    <sep></sep>
    <block type="cu_ragdoll"></block>
    <block type="cu_jump"></block>
    <block type="cu_switch_hands"></block>
    <block type="cu_throw_item"></block>
    <sep></sep>
    <block type="cu_limb_index"></block>
    <block type="cu_limb_skin_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_muscle_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_pain">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_bleed">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_infection">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_broken">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dislocated">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_infected_bool">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dismembered">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_set_limb_skin_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="cu_set_limb_muscle_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <block type="cu_set_limb_pain">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_set_limb_bleed">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_limb_break">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_mend">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dislocate_action">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_undislocate">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dismember_action">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_ITEM}" colour="#2196f3" icon="🎒">
    <block type="cu_item_use"></block>
    <block type="cu_item_consume">
      <value name="AMOUNT"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_item_set_condition">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">10</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_item_set_weight">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_item_set_value">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="cu_item_set_decay">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">60</field></shadow></value>
    </block>
    <block type="cu_item_set_slot_rotation">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_item_set_property">
      <value name="TARGET_ITEM"><shadow type="cu_item_custom"><field name="ID">myItem</field></shadow></value>
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_item_condition"></block>
    <block type="cu_item_max_condition"></block>
    <block type="cu_item_weight"></block>
    <block type="cu_item_value"></block>
    <block type="cu_item_name"></block>
    <block type="cu_item_id"></block>
    <block type="cu_item_category"></block>
  </category>
  <category name="%{BKY_CAT_SOUND}" colour="#9c27b0" icon="🔊">
    <block type="cu_play_sound"></block>
    <block type="cu_play_sound_at">
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="VOLUME"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_WORLD}" colour="#00bcd4" icon="🌍">
    <block type="cu_world_set_tile">
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="TILE"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_world_spawn_item">
      <value name="ITEM"><shadow type="cu_item_custom"><field name="ID">scrapmetal</field></shadow></value>
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_world_destroy_block">
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_world_replace_block">
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="OLD_TILE"><shadow type="cu_number"><field name="NUM">2</field></shadow></value>
      <value name="NEW_TILE"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_give_item">
      <value name="ITEM"><shadow type="cu_item_vanilla"><field name="ID">bandage</field></shadow></value>
      <value name="COUNT"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_give_item_slot">
      <value name="ITEM"><shadow type="cu_item_vanilla"><field name="ID">bandage</field></shadow></value>
      <value name="SLOT"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="COUNT"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_world_time"></block>
    <block type="cu_world_block_at">
      <value name="X"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="Y"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_world_depth"></block>
  </category>
  <category name="%{BKY_CAT_FLOW}" colour="#ff5722" icon="🔀">
    <block type="cu_if"></block>
    <block type="cu_if_else"></block>
    <block type="cu_repeat">
      <value name="TIMES"><shadow type="cu_number"><field name="NUM">3</field></shadow></value>
    </block>
    <block type="cu_while"></block>
    <block type="cu_for_loop">
      <value name="FROM"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="TO"><shadow type="cu_number"><field name="NUM">10</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_VALUE}" colour="#59c059" icon="🔢">
    <block type="cu_number"></block>
    <block type="cu_text"></block>
    <block type="cu_item_custom"></block>
    <block type="cu_item_vanilla"></block>
    <block type="cu_var_get"></block>
    <sep></sep>
    <block type="cu_happiness"></block>
    <block type="cu_temperature"></block>
    <block type="cu_hunger"></block>
    <block type="cu_weight"></block>
    <block type="cu_position_x"></block>
    <block type="cu_position_y"></block>
    <sep></sep>
    <block type="cu_item_condition"></block>
    <block type="cu_item_name"></block>
    <sep></sep>
    <block type="cu_world_time"></block>
    <block type="cu_world_block_at"></block>
    <block type="cu_world_depth"></block>
    <sep></sep>
    <block type="cu_player_energy"></block>
    <block type="cu_player_brain_health"></block>
    <block type="cu_player_shock"></block>
    <block type="cu_player_blood_volume"></block>
    <block type="cu_player_respiratory_rate"></block>
    <block type="cu_player_sickness"></block>
    <block type="cu_player_adrenaline"></block>
    <block type="cu_player_radiation"></block>
    <block type="cu_player_wetness"></block>
    <block type="cu_player_clothing_temp"></block>
    <block type="cu_player_encumbrance"></block>
    <block type="cu_player_bleed_speed"></block>
    <sep></sep>
    <block type="cu_limb_index"></block>
    <block type="cu_limb_skin_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_muscle_health">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_pain">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_bleed">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_infection">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_item_id"></block>
    <block type="cu_item_category"></block>
    <sep></sep>
    <block type="cu_math_op">
      <value name="A"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
      <value name="B"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
    <block type="cu_math_func"></block>
    <block type="cu_math_random">
      <value name="FROM"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
      <value name="TO"><shadow type="cu_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="cu_math_clamp">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">50</field></shadow></value>
      <value name="MIN"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="MAX"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_string_op"></block>
    <sep></sep>
    <block type="lists_create_with"></block>
    <block type="cu_list_get">
      <value name="INDEX"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_list_length"></block>
    <block type="cu_list_add"></block>
  </category>
  <category name="%{BKY_CAT_BOOLEAN}" colour="#7b1fa2" icon="✅">
    <block type="cu_true"></block>
    <block type="cu_false"></block>
    <block type="cu_is_alive"></block>
    <block type="cu_item_is_equipped"></block>
    <block type="cu_item_is_in_inventory"></block>
    <sep></sep>
    <block type="cu_player_conscious"></block>
    <block type="cu_player_standing"></block>
    <block type="cu_player_grounded"></block>
    <block type="cu_player_in_water"></block>
    <block type="cu_player_breathing"></block>
    <block type="cu_player_crouching"></block>
    <sep></sep>
    <block type="cu_limb_broken">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dislocated">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_infected_bool">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <block type="cu_limb_dismembered">
      <value name="LIMB"><shadow type="cu_limb_index"><field name="LIMB">1</field></shadow></value>
    </block>
    <sep></sep>
    <block type="cu_number_compare">
      <value name="A"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
      <value name="B"><shadow type="cu_number"><field name="NUM">10</field></shadow></value>
    </block>
    <block type="cu_logic_compare"></block>
    <block type="cu_not"></block>
    <block type="cu_string_contains"></block>
  </category>
  <category name="%{BKY_CAT_VAR}" colour="#ff7043" icon="📝">
    <block type="cu_var_get"></block>
    <block type="cu_var_set">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">0</field></shadow></value>
    </block>
    <block type="cu_var_change">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">1</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_BUILDING}" colour="#00897b" icon="🏗">
    <block type="cu_building_set_property">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">250</field></shadow></value>
    </block>
  </category>
  <category name="%{BKY_CAT_TILE}" colour="#8d6e63" icon="🔲">
    <block type="cu_tile_set_property">
      <value name="VALUE"><shadow type="cu_number"><field name="NUM">100</field></shadow></value>
    </block>
  </category>
</xml>
`;

const CAT_MSG_ZH: Record<string, string> = {
  CAT_EVENT: '事件', CAT_REGISTER: '注册', CAT_BODY: '身体', CAT_ITEM: '物品',
  CAT_SOUND: '音效', CAT_WORLD: '世界', CAT_FLOW: '流程', CAT_VALUE: '取值',
  CAT_BOOLEAN: '布尔', CAT_VAR: '变量',
  CAT_BUILDING: '建筑', CAT_TILE: '地块', CAT_LOCALE: '本地化',
};
const CAT_MSG_EN: Record<string, string> = {
  CAT_EVENT: 'Events', CAT_REGISTER: 'Register', CAT_BODY: 'Body', CAT_ITEM: 'Item',
  CAT_SOUND: 'Sound', CAT_WORLD: 'World', CAT_FLOW: 'Flow', CAT_VALUE: 'Value',
  CAT_BOOLEAN: 'Boolean', CAT_VAR: 'Variable',
  CAT_BUILDING: 'Building', CAT_TILE: 'Tile', CAT_LOCALE: 'Locale',
};

export function BlockEditor({ onCodeChange, onBlocksChange, onWorkspaceReady }: Props) {
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const skipUpdate = useRef(false);

  const updateCode = useCallback(() => {
    if (skipUpdate.current) { skipUpdate.current = false; return; }
    const ws = wsRef.current;
    if (!ws) return;
    try {
      const code = csharpGenerator.workspaceToCode(ws);
      onCodeChange(code);
      if (onBlocksChange) {
        const xml = Blockly.Xml.workspaceToDom(ws);
        onBlocksChange(Blockly.Xml.domToText(xml));
      }
    } catch (e) {
      console.warn('Code generation error:', e);
    }
  }, [onCodeChange, onBlocksChange]);

  useEffect(() => {
    if (!containerRef.current || wsRef.current) return;

    setMessages(lang);
    const catMsgs = lang === 'zh' ? CAT_MSG_ZH : CAT_MSG_EN;
    for (const [key, val] of Object.entries(catMsgs)) {
      (Blockly.Msg as Record<string, string>)[key] = val;
    }

    defineBlocks();

    const parser = new DOMParser();
    const toolboxDoc = parser.parseFromString(TOOLBOX, 'text/html');
    const toolboxEl = toolboxDoc.getElementById('toolbox');

    const ws = Blockly.inject(containerRef.current, {
      toolbox: toolboxEl as unknown as Blockly.utils.toolbox.ToolboxDefinition,
      renderer: 'zelos',
      grid: { spacing: 40, length: 2, colour: '#ccc', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      media: '/media/',
    } as any);

    // Inject toolbox icon CSS
    const style = document.createElement('style');
    style.textContent = `
      .blocklyToolboxCategory {
        position: relative;
      }
      .cu-cat-icon {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        pointer-events: none;
        transition: opacity .15s;
        image-rendering: pixelated;
      }
      .blocklyToolboxSelected .cu-cat-icon {
        opacity: 0;
      }
      .blocklyToolboxCategoryLabel {
        transition: opacity .15s;
      }
      .blocklyToolboxSelected .blocklyToolboxCategoryLabel {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);

    // Inject emoji icons into toolbox categories via DOM query
    requestAnimationFrame(() => {
      const catEls = containerRef.current!.querySelectorAll('.blocklyToolboxCategory');
      catEls.forEach((el) => {
        const label = el.querySelector('.blocklyToolboxCategoryLabel');
        const name = label?.textContent?.trim() ?? '';
        // Find matching icon by category name
        let iconSrc = '';
        for (const [k, v] of Object.entries(CAT_MSG_ZH)) {
          if (v === name) { iconSrc = CAT_ICONS[k] ?? ''; break; }
        }
        if (!iconSrc) {
          for (const [k, v] of Object.entries(CAT_MSG_EN)) {
            if (v === name) { iconSrc = CAT_ICONS[k] ?? ''; break; }
          }
        }
        if (!iconSrc) return;
        // Hide label, inject image icon
        (label as HTMLElement).style.opacity = '0';
        const img = document.createElement('img');
        img.className = 'cu-cat-icon';
        img.src = iconSrc;
        img.alt = name;
        (el as HTMLElement).style.position = 'relative';
        el.appendChild(img);
      });
    });

    wsRef.current = ws;
    ws.addChangeListener(updateCode);
    if (onWorkspaceReady) onWorkspaceReady(ws);

    // Force lists_create_with blocks to horizontal on every change
    const forceHorizontal = () => {
      ws.getAllBlocks().forEach((b: any) => {
        if (b.type === 'lists_create_with' && !b.inputsInline) {
          b.inputsInline = true;
          b.render();
        }
      });
    };
    ws.addChangeListener((e: any) => {
      if (e.type === 'block_create' || e.type === 'block_change' || e.type === 'finished_mutator') {
        forceHorizontal();
      }
    });

    const ro = new ResizeObserver(() => Blockly.svgResize(ws));
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); ws.dispose(); wsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wsRef.current) return;
    setMessages(lang);
    const catMsgs = lang === 'zh' ? CAT_MSG_ZH : CAT_MSG_EN;
    for (const [key, val] of Object.entries(catMsgs)) {
      (Blockly.Msg as Record<string, string>)[key] = val;
    }
    skipUpdate.current = true;
    wsRef.current!.updateToolbox(TOOLBOX);
  }, [lang]);

  return <div ref={containerRef} className="be BlocklyWorkspace" />;
}
