import {addApparitionSpell, removeSpell, getApparitionList, getApparitionFromActor, changePrimary} from './module.js';

export class ApparitionManager extends FormApplication {

    constructor (object, options){
        super(object, options);

        this.savePosition = foundry.utils.debounce(() => {
            game.settings.set('pf2e-animist-spell', 'managerPosition', this.position);
        }, 100);
    }
    
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        

        const overrides = {
            height: 'auto',
            width: '500',
            id: 'apparition-manager',
            template: "./modules/pf2e-animist-spell/templates/apparitionmanager.hbs",
            title: 'Apparition Manager',
            actor: '',
        };
        
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    render(force, options){
        if (!options) {
            super.render(force);
            return this;
        }
        const mergedOptions = foundry.utils.mergeObject(options, game.settings.get('pf2e-animist-spell', 'managerPosition'));
        super.render(force, mergedOptions);

        return this;
    }

    setPosition({left, top, width, height, scale}={}) {
        super.setPosition({left, top, width, height, scale});
        this.savePosition();
    }

    getData(options) {

        return {attunement: getApparitionList(options.actor)};
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", {manager: this},this._handleButtonClick);
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const apparition = clickedElement.parent()[0].id; //slug
        const manager = event.data.manager;

        switch (action){
            case 'primary': {
                await changePrimary(manager.options.actor, apparition);
                
                break;
            }
            case 'disperse': {
                await getApparitionFromActor(manager.options.actor, apparition).feat.setFlag('pf2e-animist-spell', 'dispersed', true);
                removeSpell(manager.options.actor, apparition);
                break;
            }
            case 'attune': {
                await getApparitionFromActor(manager.options.actor, apparition).feat.setFlag('pf2e-animist-spell', 'dispersed', false);
                addApparitionSpell(manager.options.actor, apparition);
                break;
            }
        }

        manager.render();
        
    }

}