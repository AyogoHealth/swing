import {addListenerMulti} from './utilities';

let MOVE_BUFFER_RADIUS = 10;

let POINTER_EVENTS = {
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
  let originalEvent = event.originalEvent || event;
  let touches = originalEvent.touches && originalEvent.touches.length ? originalEvent.touches : [originalEvent];
  let e = (originalEvent.changedTouches && originalEvent.changedTouches[0]) || touches[0];

  return {
    x: e.clientX,
    y: e.clientY
  };
}

function getEvents(pointerTypes, eventType) {
  let res = [];
  pointerTypes.forEach(function(pointerType) {
    let eventName = POINTER_EVENTS[pointerType][eventType];
    if (eventName) {
      res.push(eventName);
    }
  });
  return res.join(' ');
}

function bindSwipe(element, eventHandlers, pointerTypes) {
  // Absolute total movement, used to control swipe vs. scroll.
  let totalX, totalY;
  // Coordinates of the start position.
  let startCoords;
  // Last event's position.
  let lastPos;
  // Whether a swipe is active.
  let active = false;

  pointerTypes = pointerTypes || ['mouse', 'touch', 'pointer'];
  addListenerMulti(element, getEvents(pointerTypes, 'start'), function(event) {
    startCoords = getCoordinates(event);
    active = true;
    totalX = 0;
    totalY = 0;
    lastPos = startCoords;
    if (eventHandlers['start']) {
      eventHandlers['start'](startCoords, event);
    }
  });
  let events = getEvents(pointerTypes, 'cancel');
  if (events) {
    addListenerMulti(element, events, function(event) {
      active = false;
      if (eventHandlers['cancel']) {
        eventHandlers['cancel'](event);
      }
    });
  }

  addListenerMulti(element, getEvents(pointerTypes, 'move'), function(event) {
    if (!active) return;

    if (!startCoords) return;
    let coords = getCoordinates(event);

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

  addListenerMulti(element, getEvents(pointerTypes, 'end'), function(event) {
    if (!active) return;
    active = false;
    if (eventHandlers['end']) {
      eventHandlers['end'](getCoordinates(event), event);
    }
  });
};
export default bindSwipe;