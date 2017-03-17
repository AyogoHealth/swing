'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

/**
 * Return direct children elements.
 *
 * @see http://stackoverflow.com/a/27102446/368691
 * @param {HTMLElement} element
 * @returns {Array}
 */
var elementChildren = function elementChildren(element) {
  return Array.prototype.filter.call(element.childNodes, function (elem) {
    return elem.nodeType === 1;
  });
};

/**
 * Chrome supports touch events so we're just checking screen size here
 * @returns {boolean}
 */
var isTouchDevice = function isTouchDevice() {
  return window.outerWidth < 769;
};

var assign = function assign(dst) {
  // Polyfill impl taken roughly from MDN
  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];
    for (var key in nextSource) {
      if (Object.prototype.hasOwnProperty.call(nextSource, key)) {
        dst[key] = nextSource[key];
      }
    }
  }
  return dst;
};

// Replaces element.on from angular and Jquery | http://stackoverflow.com/a/8797106
var addListenerMulti = function addListenerMulti(el, s, fn) {
  return s.split(' ').forEach(function (e) {
    return el.addEventListener(e, fn, false);
  });
};

exports.elementChildren = elementChildren;
exports.isTouchDevice = isTouchDevice;
exports.assign = assign;
exports.addListenerMulti = addListenerMulti;