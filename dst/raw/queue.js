"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//created by mondora, edited by streemo

var Queue = function () {
    function Queue(fn) {
        _classCallCheck(this, Queue);

        this.fn = fn;
        this.args = [];
    }

    _createClass(Queue, [{
        key: "push",
        value: function push(arg) {
            this.args.push(arg);
            this.process();
        }
    }, {
        key: "process",
        value: function process() {
            if (this.args.length !== 0) {
                var ack = this.fn(this.args[0]);
                if (ack) {
                    this.args.shift();
                    this.process();
                }
            }
        }
    }, {
        key: "empty",
        value: function empty() {
            this.args = [];
        }
    }]);

    return Queue;
}();

exports.default = Queue;