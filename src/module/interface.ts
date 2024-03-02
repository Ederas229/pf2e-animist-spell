import { SpellPF2e } from '@item/index.js';
import { SpellSlotGroupId } from '@item/spellcasting-entry/collection.js';

export interface apparitionSpell {
  spell: SpellPF2e;
  rank: SpellSlotGroupId | null;
}
