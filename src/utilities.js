
/**
 * Return direct children elements.
 *
 * @see http://stackoverflow.com/a/27102446/368691
 * @param {HTMLElement} element
 * @returns {Array}
 */
const elementChildren = (element) => {
  return Array.from(element.childNodes).filter(elem => elem.nodeType === 1);
};

/**
 * Chrome supports touch events so we're just checking screen size here
 * @returns {boolean}
 */
const isTouchDevice = () => {
  return window.outerWidth < 769;
};

export {
  elementChildren,
  isTouchDevice
};
