"use strict";

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
  return Array.from(element.childNodes).filter(function (elem) {
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

exports.elementChildren = elementChildren;
exports.isTouchDevice = isTouchDevice;