//created by mondora, edited by streemo
export default class Queue {
    constructor (fn) {
        this.fn = fn;
        this.args = [];
    }
    push (arg) {
        this.args.push(arg);
        this.process();
    }
    process () {
        if (this.args.length !== 0) {
            const ack = this.fn(this.args[0]);
            if (ack) {
                this.args.shift();
                this.process();
            }
        }
    }
    empty () {
        this.args = [];
    }
}
