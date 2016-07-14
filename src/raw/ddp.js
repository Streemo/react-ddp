//created by mondora, edited by streemo
import EventEmitter from "wolfy87-eventemitter";
import Queue from "./queue";
import Socket from "./socket";
import { contains, uniqueId } from "./utils";
import ReactiveVar from "reactive-var";

const DDP_VERSION = "1";
const PUBLIC_EVENTS = [
    "ready", "nosub", "added", "changed", "removed",
    "result", "updated",
    "error"
];
const DEFAULT_RECONNECT_INTERVAL = 10000;
export default class RawDDP extends EventEmitter {
    emit () {
        setTimeout(super.emit.bind(this, ...arguments), 0);
    }
    constructor (options) {
        super();
        this.connectionStatus = "disconnected";
        this.autoConnect = (options.autoConnect !== false);
        this.autoReconnect = (options.autoReconnect !== false);
        this._loggingIn = new ReactiveVar(false);
        this.reconnectInterval = options.reconnectInterval || DEFAULT_RECONNECT_INTERVAL;
        this.messageQueue = new Queue(message => {
            if (this.connectionStatus === "connected") {
                this.socket.send(message);
                return true;
            } else {
                return false;
            }
        });
        this.readyQueue = new Queue(message => {
            if (!this._loggingIn.v) {
                this.emit(message.msg,message);
                return true;
            } else {
                return false;
            }
        });
        this.socket = new Socket(options.SocketConstructor, options.endpoint, options.debug);
        this.socket.on("open", () => {
            let connect = {
                msg: "connect",
                version: DDP_VERSION,
                support: [DDP_VERSION]
            }
            this.socket.send(connect);
        });
        this.socket.on("close", () => {
            this.connectionStatus = "disconnected";
            this.messageQueue.empty();
            this.emit("disconnected");
            if (this.autoReconnect) {
                setTimeout(
                    this.socket.open.bind(this.socket),
                    this.reconnectInterval
                );
            }
        });
        this.socket.on("message:in", message => {
            if (message.msg === "connected") {
                this.connectionStatus = "connected";
                this.messageQueue.process();
                this.emit("connected");
            } else if (message.msg === "ping") {
                this.socket.send({msg: "pong", id: message.id});
            } else if (contains(PUBLIC_EVENTS, message.msg)) {
                if (message.msg === "ready"){
                    this.readyQueue.push(message);
                } else {
                    this.emit(message.msg, message);
                }
            } 
        });
        if (this.autoConnect) {
            this.connect();
        }
    }
    connect () {
        this.socket.open();
    }
    disconnect () {
        this.autoReconnect = false;
        this.socket.close();
    }
    method (name, params) {
        const id = uniqueId();
        this.messageQueue.push({
            msg: "method",
            id: id,
            method: name,
            params: params
        });
        return id;
    }
    sub (name, params) {
        const id = uniqueId();
        this.messageQueue.push({
            msg: "sub",
            id: id,
            name: name,
            params: params
        });
        return id;
    }
    unsub (id) {
        this.messageQueue.push({
            msg: "unsub",
            id: id
        });
        return id;
    }
}