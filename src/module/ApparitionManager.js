import { AnimistActor } from './AnimistActor.js';
import { MODULENAME } from './const.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ApparitionManager extends HandlebarsApplicationMixin(ApplicationV2) {
  animistActor;

  savePosition;

  constructor(actor) {
    super();

    this.savePosition = foundry.utils.debounce(() => {
      game.settings.set(MODULENAME, 'managerPosition', this.position);
    }, 100);
    this.animistActor = new AnimistActor(actor);
  }

  static DEFAULT_OPTIONS = {
    id: 'apparition-manager',
    position: {
      width: 'auto',
      height: 'auto',
    },
    actor: '',
    actions: {
      primary: ApparitionManager.primary,
      disperse: ApparitionManager.disperse,
      attune: ApparitionManager.attune,
    },
  };

  static PARTS = {
    manager: {
      template: `./modules/${MODULENAME}/templates/apparitionmanager.hbs`,
    },
  };

  get title() {
    return 'Apparitions Manager';
  }

  render(options) {
    const position = { position: game.settings.get(MODULENAME, 'managerPosition') };
    const mergedOptions = foundry.utils.mergeObject(options, position);
    super.render(mergedOptions);

    return this;
  }

  setPosition({ left, top }) {
    super.setPosition({ left, top });
    this.savePosition();
    return { left, top };
  }

  _prepareContext() {
    return { attunement: this.animistActor.getApparitionList() };
  }

  static async primary(event, target) {
    this.animistActor.changePrimary(target.parentElement.id);
  }

  static async disperse(event, target) {
    const apparitionFeat = this.animistActor.getApparitionFromActor(target.parentElement.id)?.feat;
    await apparitionFeat.setFlag(MODULENAME, 'dispersed', true);
    this.animistActor.removeSpell(target.parentElement.id);
    this.render({ force: true });
  }

  static async attune(event, target) {
    const apparitionFeat = this.animistActor.getApparitionFromActor(target.parentElement.id)?.feat;
    await apparitionFeat.setFlag(MODULENAME, 'dispersed', false);
    this.animistActor.addApparitionSpell(target.parentElement.id);
    this.render({ force: true });
  }
}
