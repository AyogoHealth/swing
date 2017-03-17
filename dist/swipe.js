'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utilities = require('./utilities');

var MOVE_BUFFER_RADIUS = 10;

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
  var totalX, totalY;
  // Coordinates of the start position.
  var startCoords;
  // Last event's position.
  var lastPos;
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

    // Android will send a touchcancel if it thinks we're starting to scroll.
    // So when the total distance (+ or - or both) exceeds 10px in either direction,
    // we either:
    // - On totalX > totalY, we send preventDefault() and treat this as a swipe.
    // - On totalY > totalX, we let the browser handle it as a scroll.

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