const key = 'apparition';
const uuid = 'Compendium.pf2e-playtest-data.war-of-immortals-playtest-class-features.Item.513BswuSPSPQdX1v';
const label = 'Apparition';

function hasFeat(actor, slug) {
  return actor.feats.contents[1].feats.find((e) => e.feat.slug == slug) != undefined;
}
function getEntriesSpontaneous(actor) {
  return actor.spellcasting.filter((entry) => entry.isSpontaneous);
}
function getEntriesFocus(actor) {
  return actor.spellcasting.filter((entry) => entry.isFocusPool);
}

const apparitionDaily = {
  key: 'apparition',
  label: 'Apparition',
  item: {
    uuid: 'Compendium.pf2e-playtest-data.war-of-immortals-playtest-class-features.Item.513BswuSPSPQdX1v',
    condition: ({ actor }) => getEntriesSpontaneous(actor).length >= 1 && getEntriesFocus(actor).length >= 1,
  },
  rows: [
    {
      type: 'select',
      slug: 'entryFocus',
      label: 'Spellcasting Vessel Entry',
      options: ({ actor }) => getEntriesFocus(actor).map((entry) => ({ label: entry.name, value: entry.id })),
      condition: ({ actor }) => getEntriesFocus(actor).length > 1,
    },
    {
      type: 'select',
      slug: 'entrySpontaneous',
      label: 'Spellcasting Apparition Entry',
      options: ({ actor }) => getEntriesSpontaneous(actor).map((entry) => ({ label: entry.name, value: entry.id })),
      condition: ({ actor }) => getEntriesSpontaneous(actor).length > 1,
    },
    {
      type: 'drop',
      slug: 'first',
      label: 'First Apparition',
      filter: {
        type: 'feat',
        search: {},
      },
    },
    {
      type: 'drop',
      slug: 'second',
      label: 'Second Apparition',
      filter: {
        type: 'feat',
        search: {},
      },
    },
    {
      type: 'drop',
      slug: 'third',
      label: 'Third Apparition',
      filter: {
        type: 'feat',
        search: {},
      },
      condition: ({ actor }) => hasFeat(actor, 'third-apparition'),
    },
    {
      type: 'drop',
      slug: 'fourth',
      label: 'Fourth Apparition',
      filter: {
        type: 'feat',
        search: {},
      },
      condition: ({ actor }) => hasFeat(actor, 'fourth-apparition'),
    },
  ],
  process: async ({ utils, fields, addFeat, addItem, messages, actor }) => {
    const entryApparitionId = fields.entrySpontaneous?.value ?? getEntriesSpontaneous(actor)[0].id;
    const entryVesselId = fields.entryFocus?.value ?? getEntriesFocus(actor)[0].id;
    const highestRank = actor.spellcasting.collections.get(entryApparitionId).highestRank;
    const arraySpellSource = [];

    actor.setFlag('pf2e-animist-spell', 'spellEntry', entryApparitionId);
    actor.setFlag('pf2e-animist-spell', 'spellFocusEntry', entryVesselId);
    messages.addGroup('apparitions', undefined, 'Apparitions attuned');
    for (const field in fields) {
      if (field == 'entryFocus' || field == 'entrySpontaneous') {
        continue;
      }
      const uuid = fields[field].uuid;
      const source = await utils.createFeatSource(uuid);
      const flagDisperse = { 'pf2e-animist-spell': { dispersed: false } };
      const flagPrimary = { 'pf2e-animist-spell': { primary: field == 'first' ? true : false } };
      source.flags = foundry.utils.mergeObject(flagDisperse, flagPrimary, { recursive: true });

      const lores = await game.modules
        .get('pf2e-animist-spell')
        .api.ApparitionParser.lores(uuid)
        .map((e) => 'Apparition : ' + e);
      const flagLore = { 'pf2e-animist-spell': { lores: lores } };
      source.flags = foundry.utils.mergeObject(source.flags, flagLore, { recursive: true });

      addFeat(source);

      let loreProf;

      if (actor.level >= 16) {
        loreProf = 3;
      } else if (actor.level >= 8) {
        loreProf = 2;
      } else {
        loreProf = 1;
      }

      for (const i in lores) {
        const loreSource = utils.createLoreSource({ name: lores[i], rank: loreProf });
        addItem(loreSource);
      }

      const spells = await game.modules.get('pf2e-animist-spell').api.ApparitionParser.spell(uuid, highestRank);

      for (const spell of spells) {
        const index = arraySpellSource.findIndex((e) => e.system.slug == spell.spell.system.slug);
        if (index >= 0) {
          arraySpellSource[index].flags['pf2e-animist-spell'].source.push(source.system.slug);
          continue;
        }

        const spellSource = await utils.createSpellSource(spell.spell.uuid);

        spellSource.system.location.value = entryApparitionId;
        spellSource.system.traits.value.push('Apparition');
        if (!spellSource.system.traits.value.find((e) => e == 'cantrip')) {
          spellSource.system.location.signature = true;
          spellSource.system.location.heightenedLevel = spell.rank;
        }
        spellSource.flags = {
          'pf2e-animist-spell': {
            source: [source.system.slug],
          },
        };

        arraySpellSource.push(spellSource);
      }

      const vesselSpell = await game.modules.get('pf2e-animist-spell').api.ApparitionParser.vesselSpell(uuid);
      const vesselSpellSource = await utils.createSpellSource(vesselSpell.uuid);
      vesselSpellSource.system.location.value = entryVesselId;
      vesselSpellSource.system.traits.value.push('Vessel');
      addItem(vesselSpellSource);

      messages.add('apparitions', { uuid, label: source.name });
    }

    for (const spellSOurce of arraySpellSource) {
      addItem(spellSOurce);
    }
  },
};

return apparitionDaily;
