import {ApparitionManager} from './ApparitionManager.js';


Hooks.once("setup", () => {
    game.modules.get('pf2e-animist-spell').api = {
        parseApparition,
        parseApparitionVessel,
        parseLore,
        renderManager
    }
});

Hooks.once('init', async function() {
    game.settings.register('pf2e-animist-spell', 'managerPosition', {
        name: 'manager position',
        scope: 'client',
        config: false,
        type: Object,
        default: {}
    });
});

Hooks.on('renderCharacterSheetPF2e', async function(sheet, html){
    if (!isAnimist(sheet.actor)) { return; }
    await removeCastButton(sheet.actor, html);
    await hideLores(sheet.actor, html);

});

Hooks.on('preCreateChatMessage', async function(message){

    if (!isAnimist(message.actor)) { return; }
    
    const regex = new RegExp(`<p><strong>Apparitions attuned<\/strong><\/p>`);
    const match = message.content.match(regex);

    if (!match) { return; }
    
    renderManager(message.actor)

});

async function parseApparition (uuid, highestRank){
    const spells = [];
    const description = fromUuidSync(uuid).description;

    const regex = new RegExp(`Cantrips?.*@(UUID|Compendium).*\n`);
    const match = description.match(regex);

    const strs = match[0].match(/(@UUID\[Compendium\.|@Compendium\[)(.*?)]({.*?})?/g);
    let i = 0;
    for (const str of strs) {
        const UUID = str.split('[')[1].split(']')[0].replace('Compendium.', '');
        const spell = await fromUuid("Compendium." + UUID);
        if (i > highestRank) { break; };
 
        spells.push({ object: spell, rank: i });
        i++;
    }
    return spells;
}

async function parseApparitionVessel (uuid){
    const description = fromUuidSync(uuid).description;

    const regex = new RegExp(`Vessel Spell.*\n.*@(UUID|Compendium).*\n`);
    const match = description.match(regex);

    const strs = match[0].match(/(@UUID\[Compendium\.|@Compendium\[)(.*?)]({.*?})?/g);
    const UUID = strs[0].split('[')[1].split(']')[0].replace('Compendium.', '');
    
    const spell = await fromUuid("Compendium." + UUID);

    return spell;
}

function parseLore (uuid) {
    const description = fromUuidSync(uuid).description;
    const regex = new RegExp(`[a-zA-Z]*\\sLore.*[a-zA-Z]*\\sLore`);

    const match = description.match(regex);
    const str = match[0];
    const lores = str.split(',').map(item => item.trim());;
    
    return lores;
}

function getApparitionSpellId(actor, apparition){
    const spellsId = [];
    for (const spell of getCollectionsEntry(actor).filter((e) => e.flags['pf2e-animist-spell'].source.find((e) => e == apparition))) {
        const spellSource = spell.getFlag('pf2e-animist-spell', 'source');
        if (spellSource.length > 1) {
            spell.setFlag('pf2e-animist-spell', 'source', spellSource.filter((e) => e != apparition));
            continue;
        }
        spellsId.push(spell.id);
    }
    return spellsId;
}


export function removeSpell(actor, apparition){
    return actor.deleteEmbeddedDocuments('Item', getApparitionSpellId(actor, apparition));
}

export async function addApparitionSpell(actor, apparition){
    let spellList = await parseApparition(getApparitionList(actor).find((e) => e.feat.slug == apparition).feat.uuid, getCollectionsEntry(actor).highestRank);
    const cloneSpellList = [];
    
    for (const spell of spellList){
        
        const duplicate = checkDuplicateSpell(actor, spell.object);
        if (duplicate){
            const sources = duplicate.getFlag('pf2e-animist-spell', 'source');
            if(sources.find((e) => e == apparition)) { continue; }
            sources.push(apparition);
            duplicate.setFlag('pf2e-animist-spell', 'source', sources);
            continue;
        }
        getCollectionsEntry(actor).addspell
        cloneSpellList.push(spell.object.clone());
    }
    const spells = await actor.createEmbeddedDocuments('Item', cloneSpellList);
    for (const spell of spells){
        spell.system.traits.value.push('Apparition');
        let data = {
            system: {
                location: {
                    value: getCollectionsEntry(actor).id
                },
                traits: {
                    value: spell.system.traits.value
                }  
            },
            flags: {
                'pf2e-animist-spell': {
                    source: [apparition]
                },
                'pf2e-dailies': {
                    temporary: true
                }
            }
        }
        let dataSloted = {};
        if (!spell.system.traits.value.find((e) => e == 'cantrip')){
            dataSloted = {
                system: {
                    location: {
                        signature: true,
                        heightenedLevel: spellList.find((e) => e.object.slug == spell.slug).rank,
                    }
                }
            }
        }
        const updateData = foundry.utils.mergeObject(data, dataSloted, {recursive: true});
        spell.update(updateData); 
    }
}


function checkDuplicateSpell(actor, spell){
    return duplicate = getCollectionsEntry(actor).find((e) => e.slug == spell.slug);
}

function checkDuplicateLore(actor, lore){
    const apparitions = getApparitionList(actor).filter((e) => !e.feat.getFlag('pf2e-animist-spell', 'dispersed'));

    for (const apparition of apparitions){
        if (apparition.feat.getFlag('pf2e-animist-spell', 'lores').find((e) => e == lore)){
            return true;
        }
    }
    return false;
}

function getCollectionsEntry (actor){
    return actor.spellcasting.collections.find((e) => e.id == actor.getFlag('pf2e-animist-spell', 'spellEntry'));
}

function getCollectionsEntryFocus (actor){
    return actor.spellcasting.collections.find((e) => e.id == actor.getFlag('pf2e-animist-spell', 'spellFocusEntry'));
}

export function getApparitionList(actor){
    return actor.feats.contents[1].feats.find((e) => e.feat.name == "Apparition Attunement").children;
}

export function getApparitionFromActor(actor, slug){
    return getApparitionList(actor).find((e) => e.feat.slug == slug);
}

export async function changePrimary(actor, apparition){
    for (const app of getApparitionList(actor)){
        const bool = app.feat.slug == apparition ? true : false
        await app.feat.setFlag('pf2e-animist-spell', 'primary', bool)
    }
}

function isAnimist(actor){
    return actor?.class?.name == 'Animist';
}

async function getPrimaryFocusSpell (actor){
    
    const apparition = getApparitionList(actor).find((e) => e.feat.flags['pf2e-animist-spell'].primary);
    if (!apparition) { return; }

    const focusSpell = await parseApparitionVessel(apparition.feat.uuid);

    return getCollectionsEntryFocus(actor).contents.find((e) => e.name == focusSpell.name);
}

async function removeCastButton(actor, html){

    const primarySpell = await getPrimaryFocusSpell(actor);
    html.find('[data-entry-id='+ getCollectionsEntryFocus(actor).id +']:not([data-item-id='+ primarySpell?.id +'])').find('.cast-spell').prop('disabled', true);

}

async function hideLores(actor, html){
    const apparitionList = getApparitionList(actor);

    for (const apparition of apparitionList){
        if (!apparition.feat.getFlag('pf2e-animist-spell', 'dispersed')) { continue; }    
        for (const lore of apparition.feat.getFlag('pf2e-animist-spell', 'lores')){
            if (checkDuplicateLore(actor, lore)) { continue; }
            html.find('[value="'+lore+'"]').parent().hide();
        }
    }
}

function renderManager(actor){
    new ApparitionManager().render(true, {actor: actor});
}
