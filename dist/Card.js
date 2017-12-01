'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sister = require('sister');

var _sister2 = _interopRequireDefault(_sister);

var _rebound = require('rebound');

var _rebound2 = _interopRequireDefault(_rebound);

var _Direction = require('./Direction');

var _Direction2 = _interopRequireDefault(_Direction);

var _utilities = require('./utilities');

var _swipe = require('./swipe');

var _swipe2 = _interopRequireDefault(_swipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {number} fromX
 * @param {number} fromY
 * @param {Direction[]} allowedDirections
 * @returns {Direction[]} computed direction
 */
var computeDirection = function computeDirection(fromX, fromY, allowedDirections) {
  var isHorizontal = Math.abs(fromX) > Math.abs(fromY);

  var isLeftDirection = fromX < 0 ? _Direction2.default.LEFT : _Direction2.default.RIGHT;
  var isUpDirection = fromY < 0 ? _Direction2.default.UP : _Direction2.default.DOWN;

  var direction = isHorizontal ? isLeftDirection : isUpDirection;

  if (allowedDirections.indexOf(direction) === -1) {
    return _Direction2.default.INVALID;
  }

  return direction;
};

/**
 * @param {Stack} stack
 * @param {HTMLElement} targetElement
 * @returns {Object} An instance of Card.
 */
var Card = function Card(stack, targetElement) {
  var card = void 0;
  var config = void 0;
  var currentX = void 0;
  var currentY = void 0;
  var doMove = void 0;
  var eventEmitter = void 0;
  var isDragging = void 0;
  var isPanning = void 0;
  var isThrowing = void 0;
  var lastThrow = void 0;
  var lastTranslate = void 0;
  var lastX = void 0;
  var lastY = void 0;
  var _onSpringUpdate = void 0;
  var springSystem = void 0;
  var springThrowIn = void 0;
  var springThrowOut = void 0;
  var throwDirectionToEventName = void 0;
  var throwOutDistance = void 0;
  var throwWhere = void 0;
  var startCoords = void 0;
  var supportPassive = void 0;

  var construct = function construct() {
    card = {};
    config = Card.makeConfig(stack.getConfig());
    eventEmitter = (0, _sister2.default)();
    springSystem = stack.getSpringSystem();
    springThrowIn = springSystem.createSpring(75, 10);
    springThrowOut = springSystem.createSpring(75, 20);
    lastThrow = {};
    lastTranslate = {
      coordinateX: 0,
      coordinateY: 0
    };
    var isThrowing = false;

    /* Test for passive event listener support, to make scrolling more efficient */
    supportPassive = false;
    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function get() {
          supportPassive = true;
        }
      });

      window.addEventListener('test', null, opts);
    } catch (e) {}
    /* End test for passive event listener support */

    /* Mapping directions to event names */
    throwDirectionToEventName = {};
    throwDirectionToEventName[_Direction2.default.LEFT] = 'throwoutleft';
    throwDirectionToEventName[_Direction2.default.RIGHT] = 'throwoutright';
    throwDirectionToEventName[_Direction2.default.UP] = 'throwoutup';
    throwDirectionToEventName[_Direction2.default.DOWN] = 'throwoutdown';

    springThrowIn.setRestSpeedThreshold(0.05);
    springThrowIn.setRestDisplacementThreshold(0.05);

    springThrowOut.setRestSpeedThreshold(0.05);
    springThrowOut.setRestDisplacementThreshold(0.05);

    throwOutDistance = config.throwOutDistance(config.minThrowOutDistance, config.maxThrowOutDistance);

    // If swiping is enabled, setup click/touch listeners
    if (config.enableSwiping) {
      (0, _swipe2.default)(targetElement, {
        'start': function start(coords) {
          startCoords = coords;
          isPanning = true;
        },
        'move': function move(coords) {
          var deltaCoords = {
            x: coords.x - startCoords.x,
            y: coords.y - startCoords.y
          };
          eventEmitter.trigger('panmove', deltaCoords);
        },
        'end': function end(coords) {
          isPanning = false;
          var deltaCoords = {
            x: coords.x - startCoords.x,
            y: coords.y - startCoords.y
          };
          eventEmitter.trigger('panend', deltaCoords);
        }
      });

      Card.appendToParent(targetElement);

      eventEmitter.on('panstart', function () {
        Card.appendToParent(targetElement);
        eventEmitter.trigger('dragstart', {
          target: targetElement
        });

        currentX = 0;
        currentY = 0;

        isDragging = true;

        (function animation() {
          if (isDragging) {
            doMove();

            window.requestAnimationFrame(animation);
          }
        })();
      });

      eventEmitter.on('panmove', function (coords) {
        currentX = coords.x;
        currentY = coords.y;
      });

      eventEmitter.on('panend', function (coords) {
        isDragging = false;

        var coordinateX = lastTranslate.coordinateX + coords.x;
        var coordinateY = lastTranslate.coordinateY + coords.y;

        var isThrowOut = config.isThrowOut(coordinateX, coordinateY, targetElement, config.throwOutConfidence(coordinateX, coordinateY, targetElement));

        // Not really sure about computing direction here and filtering on directions here.
        // It adds more logic. Any suggestion will be appreciated.
        var direction = computeDirection(coordinateX, coordinateY, config.allowedDirections);

        if (isThrowOut && direction !== _Direction2.default.INVALID) {
          card.throwOut(coordinateX, coordinateY, direction);
        } else {
          card.throwIn(coordinateX, coordinateY, direction);
        }

        eventEmitter.trigger('dragend', {
          target: targetElement
        });
      });

      // "mousedown" event fires late on touch enabled devices, thus listening
      // to the touchstart event for touch enabled devices and mousedown otherwise.
      if ((0, _utilities.isTouchDevice)()) {
        targetElement.addEventListener('touchstart', function () {
          eventEmitter.trigger('panstart');
        });

        targetElement.addEventListener('touchend', function () {
          if (isDragging && !isPanning) {
            eventEmitter.trigger('dragend', {
              target: targetElement
            });
          }
        });

        // Disable scrolling while dragging the element on the touch enabled devices.
        // @see http://stackoverflow.com/a/12090055/368691
        (function () {
          var dragging = void 0;

          targetElement.addEventListener('touchstart', function (event) {
            dragging = true;
          });

          targetElement.addEventListener('touchend', function () {
            dragging = false;
          });

          global.addEventListener('touchmove', function (event) {
            if (dragging) {
              event.preventDefault();
            }
          }, supportPassive ? { passive: false } : false);
        })();
      } else {
        targetElement.addEventListener('mousedown', function () {
          eventEmitter.trigger('panstart');
        });

        targetElement.addEventListener('mouseup', function () {
          if (isDragging && !isPanning) {
            eventEmitter.trigger('dragend', {
              target: targetElement
            });
          }
        });
      }
    }

    springThrowIn.addListener({
      onSpringAtRest: function onSpringAtRest() {
        eventEmitter.trigger('throwinend', {
          target: targetElement
        });
      },
      onSpringUpdate: function onSpringUpdate(spring) {
        var value = spring.getCurrentValue();
        var coordinateX = _rebound2.default.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromX, 0);
        var coordinateY = _rebound2.default.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromY, 0);

        _onSpringUpdate(coordinateX, coordinateY);
      }
    });

    springThrowOut.addListener({
      onSpringAtRest: function onSpringAtRest() {
        eventEmitter.trigger('throwoutend', {
          target: targetElement
        });
      },
      onSpringUpdate: function onSpringUpdate(spring) {
        var value = spring.getCurrentValue();

        var coordinateX = void 0;
        var coordinateY = void 0;
        var directionFactor = void 0;

        if (lastThrow.direction === _Direction2.default.RIGHT || lastThrow.direction === _Direction2.default.LEFT) {
          directionFactor = lastThrow.direction === _Direction2.default.RIGHT ? 1 : -1;
          coordinateX = _rebound2.default.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromX, throwOutDistance * directionFactor);
          coordinateY = lastThrow.fromY;
        } else if (lastThrow.direction === _Direction2.default.UP || lastThrow.direction === _Direction2.default.DOWN) {
          directionFactor = lastThrow.direction === _Direction2.default.DOWN ? 1 : -1;
          coordinateX = lastThrow.fromX;
          coordinateY = _rebound2.default.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromY, throwOutDistance * directionFactor);
        }

        _onSpringUpdate(coordinateX, coordinateY);
      }
    });

    /**
     * Transforms card position based on the current environment variables.
     *
     * @returns {undefined}
     */
    doMove = function doMove() {
      if (currentX === lastX && currentY === lastY) {
        return;
      }

      lastX = currentX;
      lastY = currentY;

      var coordinateX = lastTranslate.coordinateX + currentX || 0;
      var coordinateY = lastTranslate.coordinateY + currentY || 0;
      var rotation = config.rotation(coordinateX, coordinateY, targetElement, config.maxRotation);

      config.transform(targetElement, coordinateX, coordinateY, rotation);

      eventEmitter.trigger('dragmove', {
        offset: coordinateX,
        target: targetElement,
        throwDirection: computeDirection(coordinateX, coordinateY, config.allowedDirections),
        throwOutConfidence: config.throwOutConfidence(coordinateX, coordinateY, targetElement)
      });
    };

    /**
     * Invoked every time the physics solver updates the Spring's value.
     *
     * @param {number} coordinateX
     * @param {number} coordinateY
     * @returns {undefined}
     */
    _onSpringUpdate = function _onSpringUpdate(coordinateX, coordinateY) {
      var rotation = config.rotation(coordinateX, coordinateY, targetElement, config.maxRotation);

      lastTranslate.coordinateX = coordinateX || 0;
      lastTranslate.coordinateY = coordinateY || 0;

      Card.transform(targetElement, coordinateX, coordinateY, rotation);
    };

    /**
     * @param {Card.THROW_IN|Card.THROW_OUT} where
     * @param {number} fromX
     * @param {number} fromY
     * @param {Direction} [direction]
     * @returns {undefined}
     */
    throwWhere = function throwWhere(where, fromX, fromY, direction) {
      lastThrow.fromX = fromX;
      lastThrow.fromY = fromY;

      // If direction argument is not set, compute it from coordinates.
      lastThrow.direction = direction || computeDirection(fromX, fromY, config.allowedDirections);

      if (where === Card.THROW_IN) {
        springThrowIn.setCurrentValue(0).setAtRest().setEndValue(1);

        eventEmitter.trigger('throwin', {
          target: targetElement,
          throwDirection: lastThrow.direction
        });
      } else if (where === Card.THROW_OUT) {
        springThrowOut.setCurrentValue(0).setAtRest().setVelocity(1).setEndValue(1);

        eventEmitter.trigger('throwout', {
          target: targetElement,
          throwDirection: lastThrow.direction
        });

        /* Emits more accurate events about specific directions */
        eventEmitter.trigger(throwDirectionToEventName[lastThrow.direction], {
          target: targetElement,
          throwDirection: lastThrow.direction
        });
      } else {
        throw new Error('Invalid throw event.');
      }
    };
  };

  construct();

  /**
   * Alias
   */
  card.on = eventEmitter.on;
  card.trigger = eventEmitter.trigger;

  /**
   * Throws a card into the stack from an arbitrary position.
   *
   * @param {number} coordinateX
   * @param {number} coordinateY
   * @param {Direction} [direction]
   * @returns {undefined}
   */
  card.throwIn = function (coordinateX, coordinateY, direction) {
    throwWhere(Card.THROW_IN, coordinateX, coordinateY, direction);
  };

  /**
   * Throws a card out of the stack in the direction away from the original offset.
   *
   * @param {number} coordinateX
   * @param {number} coordinateY
   * @param {Direction} [direction]
   * @returns {undefined}
   */
  card.throwOut = function (coordinateX, coordinateY, direction) {
    isThrowing = true;
    throwWhere(Card.THROW_OUT, coordinateX, coordinateY, direction);
  };

  /**
   * Unbinds all Hammer.Manager events.
   * Removes the listeners from the physics simulation.
   *
   * @returns {undefined}
   */
  card.destroy = function () {
    mc.destroy();
    springThrowIn.destroy();
    springThrowOut.destroy();

    stack.destroyCard(card);
  };

  var drag = function drag(duration, distance, direction) {
    var startTime = new Date().getTime();

    return new Promise(function (resolve, reject) {
      var finalX = distance * direction;

      var step = function step(_) {
        var progress = (new Date().getTime() - startTime) / duration;
        var delta = Math.pow(progress, 2);

        if (isDragging || isThrowing) return reject('Stopping due to user interaction');
        if (progress >= 1) {
          card.throwIn(currentX, 0);
          eventEmitter.trigger('dragend', { target: targetElement });
          return resolve();
        }
        currentX = finalX * delta;
        window.requestAnimationFrame(step);
        doMove();
      };
      step();
    });
  };

  /**
   * Wiggles the card right, back to center, and then to the left 
   *
   * @param {number} duration
   * @param {number} distance
   * @returns {undefined}
   */
  card.wiggle = function (duration, distance) {
    drag(duration, distance, 1).then(function (_) {
      return setTimeout(function (_) {
        return drag(duration, distance, -1);
      }, duration);
    }).catch(function (e) {
      return e;
    });
  };

  return card;
};

/**
 * Creates a configuration object.
 *
 * @param {Object} config
 * @returns {Object}
 */
Card.makeConfig = function () {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var defaultConfig = {
    allowedDirections: [_Direction2.default.RIGHT, _Direction2.default.LEFT],
    isThrowOut: Card.isThrowOut,
    maxRotation: 20,
    maxThrowOutDistance: 500,
    minThrowOutDistance: 400,
    rotation: Card.rotation,
    throwOutConfidence: Card.throwOutConfidence,
    throwOutDistance: Card.throwOutDistance,
    transform: Card.transform,
    enableSwiping: true
  };

  return (0, _utilities.assign)({}, defaultConfig, config);
};

/**
 * Uses CSS transform to translate element position and rotation.
 *
 * Invoked in the event of `dragmove` and every time the physics solver is triggered.
 *
 * @param {HTMLElement} element
 * @param {number} coordinateX Horizontal offset from the startDrag.
 * @param {number} coordinateY Vertical offset from the startDrag.
 * @param {number} rotation
 * @returns {undefined}
 */
Card.transform = function (element, coordinateX, coordinateY, rotation) {
  element.style.transform = 'translate3d(0, 0, 0) translate(' + coordinateX + 'px, ' + coordinateY + 'px) rotate(' + rotation + 'deg)';
};

/**
 * Append element to the parentNode.
 *
 * This makes the element first among the siblings. The reason for using
 * this as opposed to zIndex is to allow CSS selector :nth-child.
 *
 * Invoked in the event of mousedown.
 * Invoked when card is added to the stack.
 *
 * @param {HTMLElement} element The target element.
 * @returns {undefined}
 */
Card.appendToParent = function (element) {
  var parentNode = element.parentNode;
  var siblings = (0, _utilities.elementChildren)(parentNode);
  var targetIndex = siblings.indexOf(element);

  if (targetIndex + 1 !== siblings.length) {
    parentNode.removeChild(element);
    parentNode.appendChild(element);
  }
};

/**
 * Returns a value between 0 and 1 indicating the completeness of the throw out condition.
 *
 * Ration of the absolute distance from the original card position and element width.
 *
 * @param {number} xOffset Distance from the dragStart.
 * @param {number} yOffset Distance from the dragStart.
 * @param {HTMLElement} element Element.
 * @returns {number}
 */
Card.throwOutConfidence = function (xOffset, yOffset, element) {
  var xConfidence = Math.min(Math.abs(xOffset) / element.offsetWidth, 1);
  var yConfidence = Math.min(Math.abs(yOffset) / element.offsetHeight, 1);

  return Math.max(xConfidence, yConfidence);
};

/**
 * Determines if element is being thrown out of the stack.
 *
 * Element is considered to be thrown out when throwOutConfidence is equal to 1.
 *
 * @param {number} xOffset Distance from the dragStart.
 * @param {number} yOffset Distance from the dragStart.
 * @param {HTMLElement} element Element.
 * @param {number} throwOutConfidence config.throwOutConfidence
 * @returns {boolean}
 */
Card.isThrowOut = function (xOffset, yOffset, element, throwOutConfidence) {
  return throwOutConfidence === 1;
};

/**
 * Calculates a distances at which the card is thrown out of the stack.
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
Card.throwOutDistance = function (min, max) {
  return Math.random() * (max - min) + min;
};

/**
 * Calculates rotation based on the element x and y offset, element width and maxRotation variables.
 *
 * @param {number} coordinateX Horizontal offset from the startDrag.
 * @param {number} coordinateY Vertical offset from the startDrag.
 * @param {HTMLElement} element Element.
 * @param {number} maxRotation
 * @returns {number} Rotation angle expressed in degrees.
 */
Card.rotation = function (coordinateX, coordinateY, element, maxRotation) {
  var horizontalOffset = Math.min(Math.max(coordinateX / element.offsetWidth, -1), 1);
  var verticalOffset = (coordinateY > 0 ? 1 : -1) * Math.min(Math.abs(coordinateY) / 100, 1);
  var rotation = horizontalOffset * verticalOffset * maxRotation;

  return rotation;
};

Card.THROW_IN = 'in';
Card.THROW_OUT = 'out';

exports.default = Card;
module.exports = exports['default'];