'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utilities = require('./utilities');

var MOVE_BUFFER_RADIUS = 10; // Derived from Angular's $swipe, modified to allow for vertical swiping
// Ref: https://github.com/angular/angular.js/blob/master/src/ngTouch/swipe.js#L23

var POINTER_EVENTS = {
  'mouse': {
    start: 'mousedown',
    move: 'mousemove',
    end: 'mouseup'
  },
  'touch': {
    start: 'touchstart',
    move: 'touchmove',
    end: 'touchend',
    cancel: 'touchcancel'
  },
  'pointer': {
    start: 'pointerdown',
    move: 'pointermove',
    end: 'pointerup',
    cancel: 'pointercancel'
  }
};

function getCoordinates(event) {
  var originalEvent = event.originalEvent || event;
  var touches = originalEvent.touches && originalEvent.touches.length ? originalEvent.touches : [originalEvent];
  var e = originalEvent.changedTouches && originalEvent.changedTouches[0] || touches[0];

  return {
    x: e.clientX,
    y: e.clientY
  };
}

function getEvents(pointerTypes, eventType) {
  var res = [];
  pointerTypes.forEach(function (pointerType) {
    var eventName = POINTER_EVENTS[pointerType][eventType];
    if (eventName) {
      res.push(eventName);
    }
  });
  return res.join(' ');
}

function bindSwipe(element, eventHandlers, pointerTypes) {
  // Absolute total movement, used to control swipe vs. scroll.
  var totalX = void 0,
      totalY = void 0;
  // Coordinates of the start position.
  var startCoords = void 0;
  // Last event's position.
  var lastPos = void 0;
  // Whether a swipe is active.
  var active = false;

  pointerTypes = pointerTypes || ['mouse', 'touch', 'pointer'];
  (0, _utilities.addListenerMulti)(element, getEvents(pointerTypes, 'start'), function (event) {
    startCoords = getCoordinates(event);
    active = true;
    totalX = 0;
    totalY = 0;
    lastPos = startCoords;
    if (eventHandlers['start']) {
      eventHandlers['start'](startCoords, event);
    }
  });
  var events = getEvents(pointerTypes, 'cancel');
  if (events) {
    (0, _utilities.addListenerMulti)(element, events, function (event) {
      active = false;
      if (eventHandlers['cancel']) {
        eventHandlers['cancel'](event);
      }
    });
  }

  (0, _utilities.addListenerMulti)(element, getEvents(pointerTypes, 'move'), function (event) {
    if (!active) return;

    if (!startCoords) return;
    var coords = getCoordinates(event);

    totalX += Math.abs(coords.x - lastPos.x);
    totalY += Math.abs(coords.y - lastPos.y);

    lastPos = coords;

    if (totalX < MOVE_BUFFER_RADIUS && totalY < MOVE_BUFFER_RADIUS) {
      return;
    }

    // Prevent the browser from scrolling.
    event.preventDefault();
    if (eventHandlers['move']) {
      eventHandlers['move'](coords, event);
    }
  });

  (0, _utilities.addListenerMulti)(element, getEvents(pointerTypes, 'end'), function (event) {
    if (!active) return;
    active = false;
    if (eventHandlers['end']) {
      eventHandlers['end'](getCoordinates(event), event);
    }
  });
};
exports.default = bindSwipe;
module.exports = exports['default'];