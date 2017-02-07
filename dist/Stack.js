'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sister = require('sister');

var _sister2 = _interopRequireDefault(_sister);

var _rebound = require('rebound');

var _rebound2 = _interopRequireDefault(_rebound);

var _Card = require('./Card');

var _Card2 = _interopRequireDefault(_Card);

var _angular = require('angular');

var angular = _interopRequireWildcard(_angular);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modName = 'stack';
angular.module(modName, ['card']).factory(modName, ['card', function (Card) {
  /**
  * @param {Object} config Stack configuration.
  * @returns {Object} An instance of Stack object.
  */
  var Stack = function Stack(config) {
    var eventEmitter = void 0;
    var index = void 0;
    var springSystem = void 0;
    var stack = void 0;

    var construct = function construct() {
      stack = {};
      springSystem = new _rebound2.default.SpringSystem();
      eventEmitter = (0, _sister2.default)();
      index = [];
    };

    construct();

    /**
     * Get the configuration object.
     *
     * @returns {Object}
     */
    stack.getConfig = function () {
      return config;
    };

    /**
     * Get a singleton instance of the SpringSystem physics engine.
     *
     * @returns {Sister}
     */
    stack.getSpringSystem = function () {
      return springSystem;
    };

    /**
     * Proxy to the instance of the event emitter.
     *
     * @param {string} eventName
     * @param {string} listener
     * @returns {undefined}
     */
    stack.on = function (eventName, listener) {
      eventEmitter.on(eventName, listener);
    };

    /**
     * Creates an instance of Card and associates it with an element.
     *
     * @param {HTMLElement} element
     * @returns {Card}
     */
    stack.createCard = function (element) {

      var card = Card(stack, element);
      var events = ['throwout', 'throwoutend', 'throwoutleft', 'throwoutright', 'throwoutup', 'throwoutdown', 'throwin', 'throwinend', 'dragstart', 'dragmove', 'dragend'];

      // Proxy Card events to the Stack.
      events.forEach(function (eventName) {
        card.on(eventName, function (data) {
          eventEmitter.trigger(eventName, data);
        });
      });

      index.push({
        card: card,
        element: element
      });

      return card;
    };

    /**
     * Returns an instance of Card associated with an element.
     *
     * @param {HTMLElement} element
     * @returns {Card|null}
     */
    stack.getCard = function (element) {
      var group = _.find(index, {
        element: element
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
    stack.destroyCard = function (card) {
      while (index.findIndex(function (elem) {
        return card.id === elem.id;
      }) > -1) {
        index.splice(index.findIndex(function (elem) {
          return card.id === elem.id;
        }), 1);
      }
      return index;
    };

    return stack;
  };

  return Stack;
}]);

exports.default = modName;
module.exports = exports['default'];