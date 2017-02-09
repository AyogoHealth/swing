
/**
 * Return direct children elements.
 *
 * @see http://stackoverflow.com/a/27102446/368691
 * @param {HTMLElement} element
 * @returns {Array}
 */
const elementChildren = (element) => {
  return Array.prototype.filter.call(element.childNodes, elem => elem.nodeType === 1);
};

/**
 * Chrome supports touch events so we're just checking screen size here
 * @returns {boolean}
 */
const isTouchDevice = () => {
  return window.outerWidth < 769;
};

const assign = function(dst) {
  // Polyfill impl taken roughly from MDN
  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];
    for (let key in nextSource) {
      if (Object.prototype.hasOwnProperty.call(nextSource, key)) {
        dst[key] = nextSource[key];
      }
    }
  }
  return dst;
}

export {
  elementChildren,
  isTouchDevice,
  assign
};