"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ddp = require("./raw/ddp.js");

var _ddp2 = _interopRequireDefault(_ddp);

var _reactNative = require("react-native");

var _reactiveVar = require("reactive-var");

var _reactiveVar2 = _interopRequireDefault(_reactiveVar);

var _ejson = require("ejson");

var _hash = require("hash.js");

var _hash2 = _interopRequireDefault(_hash);

var _utils = require("./raw/utils.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //created by streemo


var DDP = function (_RawDDP) {
  _inherits(DDP, _RawDDP);

  function DDP(opts) {
    _classCallCheck(this, DDP);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DDP).call(this, opts));

    var appId = opts.appId || "app";
    _this._userKey = appId + "_UserId";
    _this._tokenKey = appId + "_LoginToken";
    _this._subsCache = {};
    _this._status = new _reactiveVar2.default('connecting');
    _this._userId = new _reactiveVar2.default(null);
    _this.on('connected', function () {
      _this.login({});
      _this._status.set('connected');
    });
    _this.on('disconnected', function () {
      _this.autoReconnect && _this.login({});
      _this._status.set(_this.autoReconnect ? 'reconnecting' : "disconnected");
    });
    return _this;
  }

  _createClass(DDP, [{
    key: "_encrypt",
    value: function _encrypt(str) {
      return {
        digest: _hash2.default.sha256().update(str).digest('hex'),
        algorithm: "sha-256"
      };
    }
  }, {
    key: "_callLogin",
    value: function _callLogin(opts, cb) {
      var _this2 = this;

      this.call(opts, function (err, res) {
        if (err) {
          _this2._clearAuth();
          return cb && cb(err);
        }
        _this2._userId.set(res.id);
        _this2._setAuth(res);
        cb && cb(null, res);
      });
    }
  }, {
    key: "_setAuth",
    value: function _setAuth(auth, cb) {
      var id = [this._userKey, auth.id.toString()];
      var token = [this._tokenKey, auth.token.toString()];
      _reactNative.AsyncStorage.multiSet([id, token], function (err) {
        if (err) {
          return cb && cb(err);
        }
        cb && cb(null);
      });
    }
  }, {
    key: "_clearAuth",
    value: function _clearAuth(cb) {
      _reactNative.AsyncStorage.multiRemove([this._userKey, this._tokenKey], function (err) {
        if (err) {
          return cb && cb(err);
        }
        cb && cb(null);
      });
    }
  }, {
    key: "_getAuth",
    value: function _getAuth(cb) {
      _reactNative.AsyncStorage.multiGet([this._userKey, this._tokenKey], function (err, zip) {
        if (err) {
          return cb && cb(err);
        }
        var id = zip[0] && zip[0][1];
        var token = zip[1] && zip[1][1];
        if (!token || !id) {
          return cb && cb(new Error('no-cache'));
        }
        cb(null, { id: id, token: token });
      });
    }
  }, {
    key: "_registerSub",
    value: function _registerSub(id, opts) {
      var _this3 = this;

      this._subsCache[id] = {
        id: id,
        name: opts.name,
        data: (0, _ejson.clone)(opts.data),
        cached: opts.cache || false,
        stop: function stop() {
          _this3.unsub(id);
          delete _this3._subsCache[id];
        }
      };
    }
  }, {
    key: "_findExactSub",
    value: function _findExactSub(opts) {
      var subs = this._subsCache;
      var sub = void 0;
      if (!opts.id && !opts.name) {
        return null;
      } else if (opts.id) {
        sub = subs[opts.id];
      }
      if (!sub && opts.name) {
        for (var id in subs) {
          var s = subs[id];
          if (s.name === opts.name) {
            if ((0, _ejson.equals)(opts.data || [], s.data)) {
              sub = s;
              break;
            }
          }
        }
      }
      return sub || null;
    }
  }, {
    key: "_findSubsWithName",
    value: function _findSubsWithName(name) {
      var subs = [];
      if (!name) {
        return subs;
      }
      for (var id in this._subsCache) {
        var s = this._subsCache[id];
        if (s.name === name) {
          subs.push(s);
        }
      }
      return subs;
    }
  }, {
    key: "userId",
    value: function userId() {
      return this._userId.get();
    }
  }, {
    key: "loggingIn",
    value: function loggingIn() {
      return this._loggingIn.get();
    }
  }, {
    key: "status",
    value: function status() {
      return this._status.get();
    }
  }, {
    key: "subscribe",
    value: function subscribe(opts, cb) {
      var _this4 = this;

      /*
        opts = {
          cache: boolean; if true, any subs to this name will not replace this sub.
                if false, any sub to this name will override this sub.
                you must manage the disposal of your subs if you cache them.
          name: string,
          check: validationFunc,
          data: payload (params)
        }
      */
      try {
        if (!opts.name) {
          cb && cb(new Error('sub-name'));
        }
        opts.check && opts.check(opts.data, this._userId.v);
      } catch (err) {
        return cb && cb(err);
      }
      var existingExactSub = this._findExactSub(opts);
      if (existingExactSub) {
        return cb && cb(null, { id: existingSub.id });
      }
      var sId = this.sub(opts.name, opts.data ? [opts.data] : []);
      var existingSimilarSubs = this._findSubsWithName(opts.name);
      existingSimilarSubs.forEach(function (sub) {
        !sub.cached && sub.stop();
      });
      var ready = function ready(res) {
        if ((0, _utils.contains)(res.subs, sId)) {
          _this4._registerSub(sId, opts);
          cb && cb(null, { id: sId });
          _this4.removeListener('ready', ready);
          _this4.removeListener('nosub', nosub);
        }
      };
      var nosub = function nosub(res) {
        if (res.id === sId) {
          cb && cb(res.error || new Error('no-sub'));
          _this4.removeListener('nosub', nosub);
          _this4.removeListener('ready', ready);
        }
      };
      this.on('ready', ready);
      this.on('nosub', nosub);
    }
  }, {
    key: "unsubscribe",
    value: function unsubscribe(opts, cb) {
      var _this5 = this;

      /*
        opts = {
          id: string
          name: string,
          data: payload (params)
        }
      */
      var existingSub = this._findExactSub(opts);
      if (!existingSub) {
        return cb && cb(new Error('not-exist'));
      }
      var id = existingSub.id;
      existingSub.stop();
      if (!cb) {
        return;
      };
      var nosub = function nosub(res) {
        if (res.id === id) {
          res.error ? cb && cb(res.error) : cb && cb(null, { id: id });
          _this5.removeListener('nosub', nosub);
        }
      };
      this.on('nosub', nosub);
    }
  }, {
    key: "call",
    value: function call(opts, cb) {
      var _this6 = this;

      /*
        opts = {
          name: string,
          check: validationFunc,
          data: payload (params)
        }
      */
      var d = (0, _ejson.clone)(opts.data);
      try {
        if (!opts.name) {
          cb && cb(new Error('method-name'));
        }
        opts.check && opts.check(d, this._userId.v);
      } catch (err) {
        return cb && cb(err);
      }
      if (d) {
        d.password && (d.password = this._encrypt(d.password));
      }
      var mId = this.method(opts.name, d ? [d] : []);
      if (!cb) {
        return;
      };
      var listener = function listener(res) {
        if (res.id === mId) {
          res.error ? cb && cb(res.error) : cb && cb(null, res.result);
          if (opts.name === "login") {
            _this6.readyQueue.process();
          }
          _this6.removeListener('result', listener);
        }
      };
      this.on('result', listener);
    }
  }, {
    key: "logout",
    value: function logout(cb) {
      var _this7 = this;

      this._clearAuth(function (err) {
        if (err) {
          return cb && cb(err);
        }
        _this7.call({ name: 'logout' }, function (err, res) {
          _this7._userId.set(null);
          cb && cb(null);
        });
      });
    }
  }, {
    key: "login",
    value: function login(opts, cb) {
      var _this8 = this;

      /*
        opts = {
          name: string,
          check: validationFunc,
          data: payload (params)
        }
      */
      this._loggingIn.set(true);
      var end = function end() {
        _this8._loggingIn.set(false);
        cb && cb.apply(undefined, arguments);
      };
      var params = {
        name: "login",
        check: opts.check || null,
        data: opts.data || null
      };
      this._getAuth(function (err, auth) {
        if (err) {
          return end(err);
        }
        params.data = { resume: auth.token };
        _this8._callLogin(params, end);
      });
    }
  }, {
    key: "changePassword",
    value: function changePassword(opts, cb) {
      var _this9 = this;

      /*
        opts = {
          check: validationFunc,
          data: {
            oldPassword: ...,
            newPassword: ...
          }
        }
      */
      var d = (0, _ejson.clone)(opts.data);
      try {
        if (!d) {
          throw new Error('no-params');
        } else if (!d.oldPassword) {
          throw new Error('no-old-password');
        } else if (!d.newPassword) {
          throw new Error('no-new-password');
        }
        opts.check && opts.check(d, this._userId.v);
      } catch (err) {
        return cb && cb(err);
      }
      d.oldPassword = this._encrypt(d.oldPassword);
      d.newPassword = this._encrypt(d.newPassword);
      var mId = this.method("changePassword", [d.oldPassword, d.newPassword]);
      if (!cb) {
        return;
      };
      var listener = function listener(res) {
        if (res.id === mId) {
          res.error ? cb && cb(new Error('fail-change-password')) : cb && cb(null, res.result);
          _this9.removeListener('result', listener);
        }
      };
      this.on('result', listener);
    }
  }]);

  return DDP;
}(_ddp2.default);

exports.default = DDP;