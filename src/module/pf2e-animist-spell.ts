// Import TypeScript modules
import { registerSettings } from './settings.js';
import { log } from './utils.js';
import { DAILY, MODULENAME } from './const.js';
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
  //get all the customs dailies
  const customs: any = game.settings.get('pf2e-dailies', 'customDailies');
  if (!customs) return;
  const dailyApparitionIndex = customs.findIndex((e: any) => e.key == 'apparition');
  //if there is already a custom daily for the apparition edit it
  if (dailyApparitionIndex !== -1) {
    customs.splice(dailyApparitionIndex, 1, { key: 'apparition', code: DAILY });
  } else {
    //else create it
    customs.push({ key: 'apparition', code: DAILY });
  }
  game.settings.set('pf2e-dailies', 'customDailies', customs);
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
  const regex = new RegExp(`<p><strong>Apparitions attuned<\/strong><\/p>`);
  const match = message.content.match(regex);

  if (!match) return;

  renderManager(message.actor);
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
