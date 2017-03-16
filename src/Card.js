import Sister from 'sister';
import * as angular from 'angular';
import * as ngTouch from 'angular-touch';
import rebound from 'rebound';
import Direction from './Direction';
import {
  elementChildren,
  isTouchDevice,
  assign
} from './utilities';

const modName = 'card';
angular.module(modName, ['ngTouch'])
.factory(modName, ['$swipe', '$q', function($swipe, $q) {
  /**
 * @param {number} fromX
 * @param {number} fromY
 * @param {Direction[]} allowedDirections
 * @returns {Direction[]} computed direction
 */
const computeDirection = (fromX, fromY, allowedDirections) => {
  const isHorizontal = Math.abs(fromX) > Math.abs(fromY);

  const isLeftDirection = fromX < 0 ? Direction.LEFT : Direction.RIGHT;
  const isUpDirection = fromY < 0 ? Direction.UP : Direction.DOWN;

  const direction = isHorizontal ? isLeftDirection : isUpDirection;

  if (allowedDirections.indexOf(direction) === -1) {
    return Direction.INVALID;
  }

  return direction;
};

/**
 * @param {Stack} stack
 * @param {HTMLElement} targetElement
 * @returns {Object} An instance of Card.
 */
const Card = (stack, targetElement) => {
  let card;
  let config;
  let currentX;
  let currentY;
  let doMove;
  let eventEmitter;
  let isDragging;
  let isPanning;
  let isThrowing;
  let lastThrow;
  let lastTranslate;
  let lastX;
  let lastY;
  let onSpringUpdate;
  let springSystem;
  let springThrowIn;
  let springThrowOut;
  let throwDirectionToEventName;
  let throwOutDistance;
  let throwWhere;
  let startCoords;
  let supportPassive;
  
  const construct = () => {
    card = {};
    config = Card.makeConfig(stack.getConfig());
    eventEmitter = Sister();
    springSystem = stack.getSpringSystem();
    springThrowIn = springSystem.createSpring(75, 10);
    springThrowOut = springSystem.createSpring(75, 20);
    lastThrow = {};
    lastTranslate = {
      coordinateX: 0,
      coordinateY: 0
    };
    let isThrowing = false;

    /* Test for passive event listener support, to make scrolling more efficient */
    supportPassive = false;
    try {
      let opts = Object.defineProperty({}, 'passive', {
        get: function() { supportPassive = true; }
      });

      window.addEventListener('test', null, opts);
    } catch(e) { }
    /* End test for passive event listener support */

        /* Mapping directions to event names */
    throwDirectionToEventName = {};
    throwDirectionToEventName[Direction.LEFT] = 'throwoutleft';
    throwDirectionToEventName[Direction.RIGHT] = 'throwoutright';
    throwDirectionToEventName[Direction.UP] = 'throwoutup';
    throwDirectionToEventName[Direction.DOWN] = 'throwoutdown';

    springThrowIn.setRestSpeedThreshold(0.05);
    springThrowIn.setRestDisplacementThreshold(0.05);

    springThrowOut.setRestSpeedThreshold(0.05);
    springThrowOut.setRestDisplacementThreshold(0.05);

    throwOutDistance = config.throwOutDistance(config.minThrowOutDistance, config.maxThrowOutDistance);

    // If swiping is enabled, setup click/touch listeners
    if(config.enableSwiping) {
      $swipe.bind(angular.element(targetElement), {
        'start': coords => {
          startCoords = coords;
          isPanning = true;
        },
        'move': coords => {
          let deltaCoords = {
            x: coords.x - startCoords.x,
            y: coords.y - startCoords.y
          }
          eventEmitter.trigger('panmove', deltaCoords);
        },
        'end': coords => {
          isPanning = false;
          let deltaCoords = {
            x: coords.x - startCoords.x,
            y: coords.y - startCoords.y
          }
          eventEmitter.trigger('panend', deltaCoords);
        }
      });

      Card.appendToParent(targetElement);

      eventEmitter.on('panstart', () => {
        Card.appendToParent(targetElement);
        eventEmitter.trigger('dragstart', {
          target: targetElement
        });

        currentX = 0;
        currentY = 0;

        isDragging = true;

        (function animation () {
          if (isDragging) {
            doMove();

            window.requestAnimationFrame(animation);
          }
        })();
      });

      eventEmitter.on('panmove', (coords) => {
        currentX = coords.x;
        currentY = coords.y;
      });

      eventEmitter.on('panend', (coords) => {
        isDragging = false;

        const coordinateX = lastTranslate.coordinateX + coords.x;
        const coordinateY = lastTranslate.coordinateY + coords.y;

        const isThrowOut = config.isThrowOut(
          coordinateX,
          coordinateY,
          targetElement,
          config.throwOutConfidence(coordinateX, coordinateY, targetElement)
        );

        // Not really sure about computing direction here and filtering on directions here.
        // It adds more logic. Any suggestion will be appreciated.
        const direction = computeDirection(coordinateX, coordinateY, config.allowedDirections);

        if (isThrowOut && direction !== Direction.INVALID) {
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
      if (isTouchDevice()) {
        targetElement.addEventListener('touchstart', () => {
          eventEmitter.trigger('panstart');
        });

        targetElement.addEventListener('touchend', () => {
          if (isDragging && !isPanning) {
            eventEmitter.trigger('dragend', {
              target: targetElement
            });
          }
        });

        // Disable scrolling while dragging the element on the touch enabled devices.
        // @see http://stackoverflow.com/a/12090055/368691
        (() => {
          let dragging;

          targetElement.addEventListener('touchstart', (event) => {
            dragging = true;
          });

          targetElement.addEventListener('touchend', () => {
            dragging = false;
          });

          global.addEventListener('touchmove', event => {
            if (dragging) {
              event.preventDefault();
            }
          }, supportPassive ? { passive: false } : false);
        })();
      } else {
        targetElement.addEventListener('mousedown', () => {
          eventEmitter.trigger('panstart');
        });

        targetElement.addEventListener('mouseup', () => {
          if (isDragging && !isPanning) {
            eventEmitter.trigger('dragend', {
              target: targetElement
            });
          }
        });
      }
    }

    springThrowIn.addListener({
      onSpringAtRest: () => {
        eventEmitter.trigger('throwinend', {
          target: targetElement
        });
      },
      onSpringUpdate: (spring) => {
        const value = spring.getCurrentValue();
        const coordinateX = rebound.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromX, 0);
        const coordinateY = rebound.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromY, 0);

        onSpringUpdate(coordinateX, coordinateY);
      }
    });

    springThrowOut.addListener({
      onSpringAtRest: () => {
        eventEmitter.trigger('throwoutend', {
          target: targetElement
        });
      },
      onSpringUpdate: (spring) => {
        const value = spring.getCurrentValue();

        let coordinateX;
        let coordinateY;
        let directionFactor;

        if (lastThrow.direction === Direction.RIGHT || lastThrow.direction === Direction.LEFT) {
          directionFactor = lastThrow.direction === Direction.RIGHT ? 1 : -1;
          coordinateX = rebound.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromX, throwOutDistance * directionFactor);
          coordinateY = lastThrow.fromY;
        } else if (lastThrow.direction === Direction.UP || lastThrow.direction === Direction.DOWN) {
          directionFactor = lastThrow.direction === Direction.DOWN ? 1 : -1;
          coordinateX = lastThrow.fromX;
          coordinateY = rebound.MathUtil.mapValueInRange(value, 0, 1, lastThrow.fromY, throwOutDistance * directionFactor);
        }

        onSpringUpdate(coordinateX, coordinateY);
      }
    });

    /**
     * Transforms card position based on the current environment variables.
     *
     * @returns {undefined}
     */
    doMove = () => {
      if (currentX === lastX && currentY === lastY) {
        return;
      }

      lastX = currentX;
      lastY = currentY;

      const coordinateX = (lastTranslate.coordinateX + currentX) || 0;
      const coordinateY = (lastTranslate.coordinateY + currentY) || 0;
      const rotation = config.rotation(coordinateX, coordinateY, targetElement, config.maxRotation);

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
    onSpringUpdate = (coordinateX, coordinateY) => {
      const rotation = config.rotation(coordinateX, coordinateY, targetElement, config.maxRotation);

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
    throwWhere = (where, fromX, fromY, direction) => {
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
  card.throwIn = (coordinateX, coordinateY, direction) => {
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
  card.throwOut = (coordinateX, coordinateY, direction) => {
    isThrowing = true;
    throwWhere(Card.THROW_OUT, coordinateX, coordinateY, direction);
  };

  /**
   * Unbinds all Hammer.Manager events.
   * Removes the listeners from the physics simulation.
   *
   * @returns {undefined}
   */
  card.destroy = () => {
    mc.destroy();
    springThrowIn.destroy();
    springThrowOut.destroy();

    stack.destroyCard(card);
  };

  const drag = (duration, distance, direction) => {
    const startTime = new Date().getTime();

    return $q((resolve, reject) => {
      let finalX = distance * direction;
      
      let step = _ => {
        let progress = (new Date().getTime() - startTime)/duration;
        let delta = Math.pow(progress, 2);
        
        if(isDragging || isThrowing) return reject('Stopping due to user interaction');
        if(progress >= 1) {
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
  }

  /**
   * Wiggles the card right, back to center, and then to the left 
   *
   * @param {number} duration
   * @param {number} distance
   * @returns {undefined}
   */
  card.wiggle = (duration, distance) => {
    drag(duration, distance, 1)
    .then(_ => setTimeout(_ => drag(duration, distance, -1), duration))
    .catch(e => e);
  }

  return card;
};

/**
 * Creates a configuration object.
 *
 * @param {Object} config
 * @returns {Object}
 */
Card.makeConfig = (config = {}) => {
  const defaultConfig = {
    allowedDirections: [
      Direction.RIGHT,
      Direction.LEFT,
      Direction.UP
    ],
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

  return assign({}, defaultConfig, config);
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
Card.transform = (element, coordinateX, coordinateY, rotation) => {
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
Card.appendToParent = (element) => {
  const parentNode = element.parentNode;
  const siblings = elementChildren(parentNode);
  const targetIndex = siblings.indexOf(element);

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
Card.throwOutConfidence = (xOffset, yOffset, element) => {
  const xConfidence = Math.min(Math.abs(xOffset) / element.offsetWidth, 1);
  const yConfidence = Math.min(Math.abs(yOffset) / element.offsetHeight, 1);

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
Card.isThrowOut = (xOffset, yOffset, element, throwOutConfidence) => {
  return throwOutConfidence === 1;
};

/**
 * Calculates a distances at which the card is thrown out of the stack.
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
Card.throwOutDistance = (min, max) => {
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
Card.rotation = (coordinateX, coordinateY, element, maxRotation) => {
  const horizontalOffset = Math.min(Math.max(coordinateX / element.offsetWidth, -1), 1);
  const verticalOffset = (coordinateY > 0 ? 1 : -1) * Math.min(Math.abs(coordinateY) / 100, 1);
  const rotation = horizontalOffset * verticalOffset * maxRotation;

  return rotation;
};

Card.THROW_IN = 'in';
Card.THROW_OUT = 'out';

return Card;
}]);



export default modName;
