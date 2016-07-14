//created by mondora, edited by streemo
import EventEmitter from "wolfy87-eventemitter";
import { parse, stringify } from "ejson"

export default class Socket extends EventEmitter {
    constructor (SocketConstructor, endpoint, debug) {
        super();
        this.SocketConstructor = SocketConstructor;
        this.endpoint = endpoint;
        this.rawSocket = null;
        this.debug = !! debug;
    }
    send (object) {
        const message = stringify(object);
        this.debug && console.log(object);
        this.rawSocket.send(message);
        this.emit("message:out", parse(message));
    }
    open () {
        if (this.rawSocket) {
            return;
        }
        this.rawSocket = new this.SocketConstructor(this.endpoint);
        this.rawSocket.onopen = () => {
            this.debug && console.log("socket open.")
            this.emit("open")
        }
        this.rawSocket.onclose = () => {
            this.rawSocket = null;
            this.debug && console.log("socket close.")
            this.emit("close");
        };
        this.rawSocket.onerror = (err) => {
            delete this.rawSocket.onclose;
            this.rawSocket.close();
            this.rawSocket = null;
            this.debug && console.log(err)
            this.emit("close");
        };
        this.rawSocket.onmessage = message => {
            var object;
            try {
                object = parse(message.data);
            } catch (ignore) {
                return;
            }
            this.debug && console.log(object);
            this.emit("message:in", object);
        };

    }
    close () {
        if (this.rawSocket) {
            this.rawSocket.close();
        }
    }

}
