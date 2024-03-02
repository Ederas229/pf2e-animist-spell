import { ItemPF2e, SpellPF2e } from '@item/index.js';
import { apparitionSpell } from './interface.js';
import { coerceToSpellGroupId } from './utils.js';

export class ApparitionParser {
  static async spell(uuid: string, highestRank: number): Promise<apparitionSpell[] | undefined> {
    const spells: apparitionSpell[] = [];

    //get the apparition feat
    const apparitionItem: ItemPF2e | null = fromUuidSync(uuid);

    if (!apparitionItem) return;

    //extract the list of spells
    const regex = new RegExp(`Cantrips?.*@(UUID|Compendium).*\n`);
    const match = apparitionItem.description.match(regex);
    if (!match) return;

    const strs = match[0].match(/(@UUID\[Compendium\.|@Compendium\[)(.*?)]({.*?})?/g);
    if (!strs) return;

    //get each spell item with it's rank
    let i = 0;
    for (const str of strs) {
      const spellUuid = str.split('[')[1].split(']')[0].replace('Compendium.', '');
      const spell: SpellPF2e | null = await fromUuid('Compendium.' + spellUuid);
      let groupId;
      if (!spell) continue;
      if (i > highestRank) break;
      if (i == 0) {
        groupId = 'cantrips';
      } else {
        groupId = i;
      }
      if (!groupId) return;
      spells.push({ spell: spell, rank: coerceToSpellGroupId(groupId) });
      i++;
    }
    return spells;
  }

  static async vesselSpell(uuid: string): Promise<SpellPF2e | undefined> {
    //get the apparition feat
    const apparitionItem: ItemPF2e | null = fromUuidSync(uuid);
    if (!apparitionItem) return;

    const regex = new RegExp(`Vessel Spell.*\n.*@(UUID|Compendium).*\n`);
    const match = apparitionItem.description.match(regex);
    if (!match) return;

    //extract the vessel spell
    const strs = match[0].match(/(@UUID\[Compendium\.|@Compendium\[)(.*?)]({.*?})?/g);
    if (!strs) return;

    //get the vessel spell item
    const spellUuid = strs[0].split('[')[1].split(']')[0].replace('Compendium.', '');

    const spell: SpellPF2e | null = await fromUuid('Compendium.' + spellUuid);
    if (!spell) return;

    return spell;
  }

  static lores(uuid: string) {
    //get the apparition feat
    const apparitionItem: ItemPF2e | null = fromUuidSync(uuid);
    if (!apparitionItem) return;

    //extract lores
    const regex = new RegExp(`[a-zA-Z]*\\sLore.*[a-zA-Z]*\\sLore`);
    const match = apparitionItem.description.match(regex);

    if (!match) return;

    const lores = match[0].split(',').map((item) => item.trim());

    return lores;
  }
}
