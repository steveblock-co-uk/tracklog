// Helpers used by both the app and tests

function removeIndex(array, index) {
  if (index < 0 || index >= array.length) {
    throw new Error('Can not remove index ' + index);
  }
  for (var i = index; i < array.length - 1; i++) {
    array[i] = array[i + 1];
  }
  delete array[array.length - 1];
  array.length--;
}

function createTextElement(type, value) {
  var element = document.createElementNS(null, type);
  element.textContent = value;
  return element;
}

function toNumber(element) {
  return Number(element.textContent).valueOf();
}
