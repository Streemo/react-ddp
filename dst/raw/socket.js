"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _wolfy87Eventemitter = require("wolfy87-eventemitter");

var _wolfy87Eventemitter2 = _interopRequireDefault(_wolfy87Eventemitter);

var _ejson = require("ejson");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //created by mondora, edited by streemo


var Socket = function (_EventEmitter) {
    _inherits(Socket, _EventEmitter);

    function Socket(SocketConstructor, endpoint, debug) {
        _classCallCheck(this, Socket);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Socket).call(this));

        _this.SocketConstructor = SocketConstructor;
        _this.endpoint = endpoint;
        _this.rawSocket = null;
        _this.debug = !!debug;
        return _this;
    }

    _createClass(Socket, [{
        key: "send",
        value: function send(object) {
            var message = (0, _ejson.stringify)(object);
            this.debug && console.log(object);
            this.rawSocket.send(message);
            this.emit("message:out", (0, _ejson.parse)(message));
        }
    }, {
        key: "open",
        value: function open() {
            var _this2 = this;

            if (this.rawSocket) {
                return;
            }
            this.rawSocket = new this.SocketConstructor(this.endpoint);
            this.rawSocket.onopen = function () {
                _this2.debug && console.log("socket open.");
                _this2.emit("open");
            };
            this.rawSocket.onclose = function () {
                _this2.rawSocket = null;
                _this2.debug && console.log("socket close.");
                _this2.emit("close");
            };
            this.rawSocket.onerror = function (err) {
                delete _this2.rawSocket.onclose;
                _this2.rawSocket.close();
                _this2.rawSocket = null;
                _this2.debug && console.log(err);
                _this2.emit("close");
            };
            this.rawSocket.onmessage = function (message) {
                var object;
                try {
                    object = (0, _ejson.parse)(message.data);
                } catch (ignore) {
                    return;
                }
                _this2.debug && console.log(object);
                _this2.emit("message:in", object);
            };
        }
    }, {
        key: "close",
        value: function close() {
            if (this.rawSocket) {
                this.rawSocket.close();
            }
        }
    }]);

    return Socket;
}(_wolfy87Eventemitter2.default);

exports.default = Socket;