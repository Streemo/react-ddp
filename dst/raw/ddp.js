"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } }; //created by mondora, edited by streemo


var _wolfy87Eventemitter = require("wolfy87-eventemitter");

var _wolfy87Eventemitter2 = _interopRequireDefault(_wolfy87Eventemitter);

var _queue = require("./queue");

var _queue2 = _interopRequireDefault(_queue);

var _socket = require("./socket");

var _socket2 = _interopRequireDefault(_socket);

var _utils = require("./utils");

var _reactiveVar = require("reactive-var");

var _reactiveVar2 = _interopRequireDefault(_reactiveVar);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DDP_VERSION = "1";
var PUBLIC_EVENTS = ["ready", "nosub", "added", "changed", "removed", "result", "updated", "error"];
var DEFAULT_RECONNECT_INTERVAL = 10000;

var RawDDP = function (_EventEmitter) {
    _inherits(RawDDP, _EventEmitter);

    _createClass(RawDDP, [{
        key: "emit",
        value: function emit() {
            var _get2;

            setTimeout((_get2 = _get(Object.getPrototypeOf(RawDDP.prototype), "emit", this)).bind.apply(_get2, [this].concat(Array.prototype.slice.call(arguments))), 0);
        }
    }]);

    function RawDDP(options) {
        _classCallCheck(this, RawDDP);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RawDDP).call(this));

        _this.connectionStatus = "disconnected";
        _this.autoConnect = options.autoConnect !== false;
        _this.autoReconnect = options.autoReconnect !== false;
        _this._loggingIn = new _reactiveVar2.default(false);
        _this.reconnectInterval = options.reconnectInterval || DEFAULT_RECONNECT_INTERVAL;
        _this.messageQueue = new _queue2.default(function (message) {
            if (_this.connectionStatus === "connected") {
                _this.socket.send(message);
                return true;
            } else {
                return false;
            }
        });
        _this.readyQueue = new _queue2.default(function (message) {
            if (!_this._loggingIn.v) {
                _this.emit(message.msg, message);
                return true;
            } else {
                return false;
            }
        });
        _this.socket = new _socket2.default(options.SocketConstructor, options.endpoint, options.debug);
        _this.socket.on("open", function () {
            var connect = {
                msg: "connect",
                version: DDP_VERSION,
                support: [DDP_VERSION]
            };
            _this.socket.send(connect);
        });
        _this.socket.on("close", function () {
            _this.connectionStatus = "disconnected";
            _this.messageQueue.empty();
            _this.emit("disconnected");
            if (_this.autoReconnect) {
                setTimeout(_this.socket.open.bind(_this.socket), _this.reconnectInterval);
            }
        });
        _this.socket.on("message:in", function (message) {
            if (message.msg === "connected") {
                _this.connectionStatus = "connected";
                _this.messageQueue.process();
                _this.emit("connected");
            } else if (message.msg === "ping") {
                _this.socket.send({ msg: "pong", id: message.id });
            } else if ((0, _utils.contains)(PUBLIC_EVENTS, message.msg)) {
                if (message.msg === "ready") {
                    _this.readyQueue.push(message);
                } else {
                    _this.emit(message.msg, message);
                }
            }
        });
        if (_this.autoConnect) {
            _this.connect();
        }
        return _this;
    }

    _createClass(RawDDP, [{
        key: "connect",
        value: function connect() {
            this.socket.open();
        }
    }, {
        key: "disconnect",
        value: function disconnect() {
            this.autoReconnect = false;
            this.socket.close();
        }
    }, {
        key: "method",
        value: function method(name, params) {
            var id = (0, _utils.uniqueId)();
            this.messageQueue.push({
                msg: "method",
                id: id,
                method: name,
                params: params
            });
            return id;
        }
    }, {
        key: "sub",
        value: function sub(name, params) {
            var id = (0, _utils.uniqueId)();
            this.messageQueue.push({
                msg: "sub",
                id: id,
                name: name,
                params: params
            });
            return id;
        }
    }, {
        key: "unsub",
        value: function unsub(id) {
            this.messageQueue.push({
                msg: "unsub",
                id: id
            });
            return id;
        }
    }]);

    return RawDDP;
}(_wolfy87Eventemitter2.default);

exports.default = RawDDP;