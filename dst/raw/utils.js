"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.uniqueId = uniqueId;
exports.contains = contains;
//created by mondora
var i = 0;
function uniqueId() {
    return (i++).toString();
}
function contains(array, element) {
    return array.indexOf(element) !== -1;
}