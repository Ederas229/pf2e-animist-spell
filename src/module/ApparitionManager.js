import { AnimistActor } from './AnimistActor.js';
import { MODULENAME } from './const.js';

export class ApparitionManager extends Application {
  animistActor;

  savePosition;

  constructor(actor) {
    super();

    this.savePosition = foundry.utils.debounce(() => {
      game.settings.set(MODULENAME, 'managerPosition', this.position);
    }, 100);
    this.animistActor = new AnimistActor(actor);
  }

  static get defaultOptions() {
    const defaults = super.defaultOptions;

    const overrides = {
      height: 'auto',
      width: '500',
      id: 'apparition-manager',
      template: `./modules/${MODULENAME}/templates/apparitionmanager.hbs`,
      title: 'Apparitions Manager',
      actor: '',
    };

    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

    return mergedOptions;
  }

  render(force = true, options) {
    if (!options) {
      super.render(force);
      return this;
    }
    const position = game.settings.get(MODULENAME, 'managerPosition');
    const mergedOptions = foundry.utils.mergeObject(options, position);
    super.render(force, mergedOptions);

    return this;
  }

  setPosition({ left, top, width }) {
    super.setPosition({ left, top, width });
    this.savePosition();
    return { left, top, width };
  }

  getData() {
    return { attunement: this.animistActor.getApparitionList() };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on('click', '[data-action]', { manager: this }, this._handleButtonClick);
  }

  async _handleButtonClick(event) {
    //eslint-disable-next-line no-undef
    const clickedElement = $(event.currentTarget);
    const action = clickedElement.data().action;
    const apparition = clickedElement.parent()[0].id; //slug
    const manager = event.data.manager;
    const apparitionFeat = manager.animistActor.getApparitionFromActor(apparition)?.feat;

    if (!apparitionFeat) return;

    switch (action) {
      case 'primary': {
        await manager.animistActor.changePrimary(apparition);

        break;
      }
      case 'disperse': {
        await apparitionFeat.setFlag(MODULENAME, 'dispersed', true);
        manager.animistActor.removeSpell(apparition);
        break;
      }
      case 'attune': {
        await apparitionFeat.setFlag(MODULENAME, 'dispersed', false);
        manager.animistActor.addApparitionSpell(apparition);
        break;
      }
    }

    manager.render();
  }
}
