// Import TypeScript modules
import { registerSettings } from './settings.js';
import { addDaily, log } from './utils.js';
import { MODULENAME } from './const.js';
import { AnimistActor } from './AnimistActor.js';
import { ApparitionParser } from './Parser.js';
import { CharacterPF2e } from '@actor/index.js';
import { ApparitionManager } from './ApparitionManager.js';

let managerUi: ApparitionManager;

// Initialize module
Hooks.once('init', async () => {
  log('Initializing ' + MODULENAME);

  // Register custom module settings
  registerSettings();
});

Hooks.once('setup', async () => {
  // @ts-expect-error setup module api
  game.modules.get(MODULENAME).api = {
    ApparitionParser,
    renderManager,
  };
});

Hooks.once('ready', async () => {
  addDaily('modules/' + MODULENAME + '/daily/apparition.js', 'apparition');
});

Hooks.on('renderCharacterSheetPF2e', async function renderCharacterSheetHook(sheet: any, html: any): Promise<void> {
  const actor = new AnimistActor(sheet.actor);
  if (!actor.isAnimist()) return;

  //edit the character sheet
  actor.removeCastButton(html);
  actor.hideLores(html);
  actor.addManagerButton(html);

  //add event listener on the manager button
  html.on('click', '[data-action="open-apparition-manager"]', sheet, (event: any) => {
    renderManager(event.data.actor);
  });
});

Hooks.on('preCreateChatMessage', async function (message: any) {
  //test if the manager is open for the actor
  if (!managerUi?.rendered) return;
  if (!(managerUi.animistActor.actor.id === message.actor.id)) return;

  //test if the actor is an animist
  const actor = new AnimistActor(message.actor);
  if (!actor.isAnimist()) return;

  //rerender if the daily concerns apparitions
  const regex = new RegExp(`<strong>Gained the temporary apparitions</strong>`);
  const match = message.content.match(regex);

  if (!match) return;

  renderManager(message.actor);
});

Hooks.on('preCreateItem', async function (feat: any) {
  if (feat.name === 'Apparition Attunement' && feat.isFeature) {
    feat.updateSource({
      'flags.core.sourceId':
        'Compendium.pf2e-playtest-data.war-of-immortals-playtest-class-features.Item.513BswuSPSPQdX1v',
      'system.rules': [],
    });
  }
});

export async function renderManager(actor: CharacterPF2e) {
  //test if there is already a manager UI stored
  if (managerUi) {
    //test if the correct manager is stored
    if (managerUi.animistActor.actor.id === actor.id) {
      managerUi.render();
      return;
    }
    //close the old one if not
    await managerUi.close();
  }
  //render and store a new manager instance
  managerUi = new ApparitionManager(actor).render(true, { actor: actor });
}
