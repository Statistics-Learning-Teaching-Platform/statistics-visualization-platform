import "@testing-library/jest-dom";

// CodeMirror measures text ranges while drawing selections. jsdom deliberately
// omits layout APIs, so provide stable empty geometry for component tests.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
