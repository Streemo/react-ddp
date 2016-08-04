//created by streemo
import RawDDP from "./raw/ddp.js";
import { AsyncStorage } from "react-native";
import ReactiveVar from "reactive-var";
import { equals, clone } from "ejson";
import hash from "hash.js";
import { contains } from "./raw/utils.js";

export default class DDP extends RawDDP {
  constructor(opts){
    super(opts);
    const appId = opts.appId || "app";
    this._userKey = appId + "_UserId";
    this._tokenKey = appId + "_LoginToken";
    this._subsCache = {};
    this._status = new ReactiveVar('connecting');
    this._userId = new ReactiveVar(null);
    this.on('connected', ()=>{
      this.login({})
      this._status.set('connected')
    })
    this.on('disconnected', ()=>{
      this._userId.set(null);
      const subs = this._subsCache;
      for (let sub in subs){
        subs[sub].stop();
      }
      this._status.set(this.autoReconnect ? 'reconnecting' : "disconnected");
    })
  }
  _encrypt(str){
    return {
      digest: hash.sha256().update(str).digest('hex'),
      algorithm: "sha-256"
    }
  }
  _callLogin(opts, cb){
    this.call(opts, (err,res)=>{
      if (err){
        this._clearAuth();
        return cb && cb(err);
      }
      this._userId.set(res.id);
      this._setAuth(res);
      cb && cb(null,res);
    })
  }
  _setAuth(auth, cb){
    let id = [this._userKey, auth.id.toString()];
    let token = [this._tokenKey, auth.token.toString()]
    AsyncStorage.multiSet([id,token], (err) =>{
      if (err){
        return cb && cb(err);
      }
      cb && cb(null);
    });
  }
  _clearAuth(cb){
    AsyncStorage.multiRemove([this._userKey, this._tokenKey], (err)=>{
      if (err){
        return cb && cb(err);
      }
      cb && cb(null);
    })
  }
  _getAuth(cb){
    AsyncStorage.multiGet([this._userKey,this._tokenKey], (err,zip)=>{
      if (err){
        return cb && cb(err);
      }
      let id = zip[0] && zip[0][1];
      let token = zip[1] && zip[1][1];
      if (!token || !id){
        return cb && cb(new Error('no-cache'))
      }
      cb(null, {id: id, token:token});
    })
  }
  _registerSub(id, opts){
    this._subsCache[id] = {
      id: id,
      name: opts.name,
      data: clone(opts.data || null),
      cached: opts.cache || false,
      stop: () => {
        this.unsub(id);
        delete this._subsCache[id];
      }
    }
  }
  _findExactSub(opts){
    let subs = this._subsCache;
    let sub;
    if (!opts.id && !opts.name){
      return null;
    } else if (opts.id){
      sub = subs[opts.id]
    }
    if (!sub && opts.name){
      for (let id in subs){
        let s = subs[id];
        if (s.name === opts.name){
          if (equals(opts.data || null,s.data)){
            sub = s;
            break;
          }
        }
      }
    }
    return sub || null;
  }
  _findSubsWithName(name){
    let subs = [];
    if (!name){
      return subs;
    }
    for (let id in this._subsCache){
      let s = this._subsCache[id];
      if (s.name === name){
        subs.push(s);
      }
    }
    return subs;
  }
  userId(){
    return this._userId.get();
  }
  loggingIn(){
    return this._loggingIn.get();
  }
  status(){
    return this._status.get();
  }
  subscribe(opts, cb){
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
      if (!opts.name){
        cb && cb(new Error('sub-name'));
      }
      opts.check && opts.check(opts.data, this._userId.v);
    } catch (err){
      return cb && cb(err);
    }
    let existingExactSub = this._findExactSub(opts);
    if (existingExactSub){
      return cb && cb(null, {id: existingExactSub.id});
    }
    let sId = this.sub(opts.name, opts.data ? [opts.data] : []);
    let existingSimilarSubs = this._findSubsWithName(opts.name);
    existingSimilarSubs.forEach((sub)=>{
      !sub.cached && sub.stop();
    })
    let ready = (res) => {
      if (contains(res.subs, sId)){
        this._registerSub(sId, opts)
        cb && cb(null, {id: sId});
        this.removeListener('ready',ready);
        this.removeListener('nosub',nosub);
      }
    }
    let nosub = (res) =>{
      if (res.id === sId){
        cb && cb(res.error || new Error('no-sub'));
        this.removeListener('nosub',nosub);
        this.removeListener('ready',ready);
      }
    }
    this.on('ready', ready);
    this.on('nosub', nosub);

  }
  unsubscribe(opts, cb){
    /*
      opts = {
        id: string
        name: string,
        data: payload (params)
      }
    */
    let existingSub = this._findExactSub(opts);
    if (!existingSub){
      return cb && cb(new Error('not-exist'));
    }
    let id = existingSub.id;
    existingSub.stop();
    if (!cb){return;};
    let nosub = (res) =>{
      if (res.id === id){
        res.error ? cb && cb(res.error) : cb && cb(null, {id: id});
        this.removeListener('nosub',nosub);
      }
    }
    this.on('nosub', nosub)
  }
  call(opts, cb){
    /*
      opts = {
        name: string,
        check: validationFunc,
        data: payload (params)
      }
    */
    let d = clone(opts.data);
    try {
      if (!opts.name){
        cb && cb(new Error('method-name'));
      }
      opts.check && opts.check(d, this._userId.v);
    } catch (err){
      return cb && cb(err);
    }
    if (d){
      d.password && (d.password = this._encrypt(d.password));
    }
    let mId = this.method(opts.name, d ? [d] : []);
    if (!cb){return;};
    let listener = (res) => {
      if (res.id === mId){
        res.error ? cb && cb(res.error) : cb && cb(null,res.result)
        if (opts.name === "login"){
          this.readyQueue.process();
        }
        this.removeListener('result',listener)
      }
    }
    this.on('result',listener)
  }
  logout(cb){
    this._clearAuth((err)=>{
      if (err){
        return cb && cb(err);
      }
      this.call({name:'logout'},(err,res)=>{
        this._userId.set(null);
        cb && cb(null);
      });
    })
  }
  login(opts, cb){
    /*
      opts = {
        name: string,
        check: validationFunc,
        data: payload (params)
      }
    */
    this._loggingIn.set(true);
    const end = (...a) => {
      this._loggingIn.set(false);
      cb && cb(...a);
    }
    let params = {
      name: "login",
      check: opts.check || null,
      data: opts.data || null
    };
    if (params.data){
      return this._callLogin(params, end);
    }
    this._getAuth((err, auth)=>{
      if (err){
        return end(err);
      }
      params.data = {resume: auth.token};
      this._callLogin(params, end);
    });
  }
  changePassword(opts,cb){
    /*
      opts = {
        check: validationFunc,
        data: {
          oldPassword: ...,
          newPassword: ...
        }
      }
    */
    let d = clone(opts.data);
    try {
      if (!d){
        throw new Error('no-params')
      } else if (!d.oldPassword){
        throw new Error('no-old-password')
      } else if (!d.newPassword){
        throw new Error('no-new-password')
      }
      opts.check && opts.check(d, this._userId.v);
    } catch (err){
      return cb && cb(err);
    }
    d.oldPassword = this._encrypt(d.oldPassword);
    d.newPassword = this._encrypt(d.newPassword);
    let mId = this.method("changePassword", [d.oldPassword,d.newPassword]);
    if (!cb){return;};
    let listener = (res) => {
      if (res.id === mId){
        res.error ? cb && cb(new Error('fail-change-password')) : cb && cb(null,res.result)
        this.removeListener('result',listener)
      }
    }
    this.on('result',listener)
  }
}