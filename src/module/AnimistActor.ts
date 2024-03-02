import { CharacterPF2e } from '@actor/index.js';
import { MODULENAME } from './const.js';
import { SpellCollection } from '@item/spellcasting-entry/collection.js';
import { stringArray } from './utils.js';
import { SpellPF2e } from '@item/index.js';
import { ApparitionParser } from './Parser.js';

export class AnimistActor {
  actor: CharacterPF2e;

  constructor(actor: CharacterPF2e) {
    this.actor = actor;
  }

  isAnimist(): boolean {
    return this.actor.class?.name == 'Animist';
  }

  async addApparitionSpell(apparition: string) {
    const highestRank = this.getCollectionsEntry()?.highestRank;
    if (!highestRank) return;

    const apparitionUuid = this.getApparitionList()?.find((e) => e.feat?.slug == apparition)?.feat?.uuid;
    if (!apparitionUuid) return;

    const spellList = await ApparitionParser.spell(apparitionUuid, highestRank);
    if (!spellList) return;

    const cloneSpellList = [];

    for (const spell of spellList) {
      //test if the spell is already present from another apparition
      const duplicate = this.checkDuplicateSpell(spell.spell);
      if (duplicate) {
        //add the apparition to the source of the spell
        const sources = stringArray(duplicate.getFlag('pf2e-animist-spell', 'source'));
        if (!sources) return;
        if (sources.find((e) => e == apparition)) {
          continue;
        }
        sources.push(apparition);
        duplicate.setFlag('pf2e-animist-spell', 'source', sources);
        continue;
      }

      // @ts-expect-error Homebrew traits
      spell.spell.system.traits.value.push('Apparition');
      //set all the data
      const data = {
        'system.location.value': this.getCollectionsEntry()?.id,
        'flags.pf2e-animist-spell.source': [apparition],
        'flags.pf2e-dailies.temporary': true,
        'system.traits.value': spell.spell.system.traits.value,
      };

      let dataSloted = {};
      if (!spell.spell.system.traits.value.find((e) => e == 'cantrip')) {
        //set data for the sloted spells
        dataSloted = {
          'system.location.signature': true,
          'system.location.heightenedLevel': spell.rank,
        };
      }
      const updateData = foundry.utils.mergeObject(data, dataSloted);

      cloneSpellList.push(spell.spell.clone(updateData));
    }
    await this.actor.createEmbeddedDocuments('Item', cloneSpellList);
  }

  removeSpell(apparition: string): void {
    const spellsId = this.getApparitionSpellIdToRemove(apparition);
    if (!spellsId) return;
    this.actor.deleteEmbeddedDocuments('Item', spellsId);
  }

  async changePrimary(apparition: string): Promise<void> {
    const apparitionList = this.getApparitionList();
    if (!apparitionList) return;
    for (const app of apparitionList) {
      const bool = app.feat?.slug == apparition ? true : false;
      await app.feat?.setFlag(MODULENAME, 'primary', bool);
    }
  }

  checkDuplicateSpell(spell: SpellPF2e): SpellPF2e | undefined {
    const collectionEntry = this.getCollectionsEntry();
    if (!collectionEntry) return;
    return collectionEntry.find((e) => e.slug == spell.slug);
  }

  checkDuplicateLore(lore: string): boolean | undefined {
    const apparitionList = this.getApparitionList();
    if (!apparitionList) return;

    //get all apparitions that are not dispersed
    const apparitions = apparitionList.filter((e) => !e?.feat?.getFlag('pf2e-animist-spell', 'dispersed'));
    for (const apparition of apparitions) {
      const loreFlag = stringArray(apparition.feat?.getFlag('pf2e-animist-spell', 'lores'));
      if (!loreFlag) return;

      if (loreFlag.find((e) => e == lore)) {
        return true;
      }
    }
    return false;
  }

  getApparitionSpellIdToRemove(apparition: string): string[] | undefined {
    const spellsId: string[] = [];
    const collectionEntry = this.getCollectionsEntry();
    if (!collectionEntry) return;
    //get the spells corresponding to the apparition
    const spells = collectionEntry.filter(
      (e) => stringArray(e.flags[MODULENAME]?.source)?.find((e: string) => e == apparition) != undefined,
    );
    //get the id of the spell coming only from the apparition given
    for (const spell of spells) {
      const spellSource: string[] | undefined = stringArray(spell.flags[MODULENAME]?.source);
      if (!spellSource) return;
      //exclude spells with multiple source
      if (spellSource.length > 1) {
        spell.setFlag(
          MODULENAME,
          'source',
          spellSource.filter((e) => e != apparition),
        );
        continue;
      }
      spellsId.push(spell.id);
    }
    return spellsId;
  }

  getCollectionsEntry(): SpellCollection<CharacterPF2e> | undefined {
    //get the spell collection corresponding to the apparitions spell
    return this.actor.spellcasting.collections.find((e) => e.id == this.actor.getFlag(MODULENAME, 'spellEntry'));
  }

  getCollectionsEntryFocus(): SpellCollection<CharacterPF2e> | undefined {
    //get the vessel spell collection
    return this.actor.spellcasting.collections.find((e) => e.id == this.actor.getFlag(MODULENAME, 'spellFocusEntry'));
  }

  getApparitionList() {
    //get the list of apparitions feats as FeatSlot {feat: FeatPf2e, label: string, Children: FeatSlot[]}
    return this.actor.feats?.contents[1]?.feats?.find((e) => e?.feat?.name == 'Apparition Attunement')?.children;
  }

  getApparitionFromActor(slug: string) {
    //get the apparition corresponding to the slug as FeatSlot {feat: FeatPf2e, label: string, Children: FeatSlot[]}
    const apparitionList = this.getApparitionList();
    if (!apparitionList) return;
    return apparitionList.find((e) => e.feat?.slug == slug);
  }

  async getPrimaryFocusSpell(): Promise<SpellPF2e | undefined> {
    const apparitionList = this.getApparitionList();
    if (!apparitionList) return;

    const apparition = apparitionList.find((e) => e?.feat?.flags['pf2e-animist-spell']?.primary);
    if (!apparition) return;
    if (typeof apparition?.feat?.uuid !== 'string') return;

    const focusSpell = await ApparitionParser.vesselSpell(apparition.feat.uuid);
    if (!focusSpell) return;

    //filter by name for now, waiting war of immortal release to switch to slug (slug not present in playtest data module)
    return this.getCollectionsEntryFocus()?.contents.find((e) => e.name == focusSpell.name);
  }

  async addManagerButton(html: JQuery): Promise<void> {
    const collectionId = this.getCollectionsEntry()?.id;
    const spellAbilityData = html.find(
      '[data-container-id=' + collectionId + ']>.spell-ability-data>.statistic-values',
    );
    spellAbilityData.after(
      '<button type="button" class="prepare-spells blue" data-action="open-apparition-manager">Manage Apparitions</button>',
    );
  }

  async removeCastButton(html: JQuery): Promise<void> {
    const primarySpell = await this.getPrimaryFocusSpell();
    html
      .find('[data-entry-id=' + this.getCollectionsEntryFocus()?.id + ']:not([data-item-id=' + primarySpell?.id + '])')
      .find('.cast-spell')
      .prop('disabled', true);
  }

  async hideLores(html: JQuery): Promise<void> {
    const apparitionList = this.getApparitionList();
    if (!apparitionList) return;

    for (const apparition of apparitionList) {
      //test if apparition is not dispersed
      if (!apparition?.feat?.getFlag('pf2e-animist-spell', 'dispersed')) {
        continue;
      }
      const loreList = stringArray(apparition.feat.getFlag('pf2e-animist-spell', 'lores'));
      if (!loreList) return;
      for (const lore of loreList) {
        //test if the lore come from multiple apparitions
        if (this.checkDuplicateLore(lore)) {
          continue;
        }

        html
          .find('[value="' + lore + '"]')
          .parent()
          .hide();
      }
    }
  }
}
