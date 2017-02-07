import Sister from 'sister';
import rebound from 'rebound';
import Card from './Card';
import * as angular from 'angular';

const modName = 'stack';
angular.module(modName, ['card'])
.factory(modName, ['card', function(Card) {
    /**
   * @param {Object} config Stack configuration.
   * @returns {Object} An instance of Stack object.
   */
  const Stack = (config) => {
    let eventEmitter;
    let index;
    let springSystem;
    let stack;

    const construct = () => {
      stack = {};
      springSystem = new rebound.SpringSystem();
      eventEmitter = Sister();
      index = [];
    };

    construct();

    /**
     * Get the configuration object.
     *
     * @returns {Object}
     */
    stack.getConfig = () => {
      return config;
    };

    /**
     * Get a singleton instance of the SpringSystem physics engine.
     *
     * @returns {Sister}
     */
    stack.getSpringSystem = () => {
      return springSystem;
    };

    /**
     * Proxy to the instance of the event emitter.
     *
     * @param {string} eventName
     * @param {string} listener
     * @returns {undefined}
     */
    stack.on = (eventName, listener) => {
      eventEmitter.on(eventName, listener);
    };

    /**
     * Creates an instance of Card and associates it with an element.
     *
     * @param {HTMLElement} element
     * @returns {Card}
     */
    stack.createCard = (element) => {

      const card = Card.card(stack, element);
      const events = [
        'throwout',
        'throwoutend',
        'throwoutleft',
        'throwoutright',
        'throwoutup',
        'throwoutdown',
        'throwin',
        'throwinend',
        'dragstart',
        'dragmove',
        'dragend'
      ];

      // Proxy Card events to the Stack.
      events.forEach((eventName) => {
        card.on(eventName, (data) => {
          eventEmitter.trigger(eventName, data);
        });
      });

      index.push({
        card,
        element
      });

      return card;
    };

    /**
     * Returns an instance of Card associated with an element.
     *
     * @param {HTMLElement} element
     * @returns {Card|null}
     */
    stack.getCard = (element) => {
      const group = _.find(index, {
        element
      });

      if (group) {
        return group.card;
      }

      return null;
    };

    /**
     * Remove an instance of Card from the stack index.
     *
     * @param {Card} card
     * @returns {null}
     */
    stack.destroyCard = (card) => {
      while(index.findIndex(elem => card.id === elem.id) > -1) {
        index.splice(index.findIndex(elem => card.id === elem.id), 1);
      }
      return index;
    };

    return stack;
  };

  return {
    stack: Stack
  };
}]);

export default modName;