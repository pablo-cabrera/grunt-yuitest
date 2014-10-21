module.exports = (function () {

    /**
     * A delayed is an object that can deliver delayed things
     *
     * @class Delayed
     * @constructor
     */
    var Delayed = function () {
        this._then = undefined;
        this._delivered = false;
        this._next = undefined;
    };

    /**
	 * Utility to create functions that uses a Delayed object.
	 *
	 * The passed function receives the delayed object as first arguments,
	 * passing the rest of the arguments subsequently.
	 *
	 * The returned method already returns the delayed object to be used, so
	 * there is no need to explicitly return it within the passed function.
	 *
	 *
	 * @method delivery
	 * @for Delayed
	 * @static
	 *
	 * @param {function} f
	 * @return {function}
	 */
    Delayed.delivery = function (f) {
        return function () {
            var d = new Delayed();
            var args = slice(arguments);
            args.unshift(d);
            f.apply(this, args);
            return d;
        };
    };

    /**
	 * Utility that creates a scope, passing the delayed object for the function
	 * as first argument and executes it. Subsequent arguments are passed to the function as well.
     *
     * @method delivering
     * @for Delayed
     * @static
     *
     * @param {function} f
     * @return {Delayed}
	 */
    Delayed.delivering = function (f) {
        return Delayed.delivery(f).apply(this, slice(arguments, 1));
    };

    /**
     * The then method is used by the grunt-yuitest runner task to receive
     * the tests in a delayed fashion
     *
     * @method then
     * @for Delayed
     *
     * @param {function} f The function that will receive the test as a first parameter
     */
    Delayed.prototype.then = function (f) {
        this._next = new Delayed();
        this._then = f;
        return this._next;
    };

    /**
     * When the value is ready, this method should be called passing the value to it
     *
     * @method deliver
     * @for Delayed
     *
     * @param {mixed} v
     */
    Delayed.prototype.deliver = function (v) {
        var that = this;

        if (this._delivered) {
            throw new Error("Already delivered");
        }

        this._delivered = true;

        setImmediate(function () {
            var r = that._then.call(null, v);
            if (r instanceof Delayed) {
                r.then(function (v) { that._next.deliver(v); });
            }
        });
    };

    Delayed.prototype.chain = function (d) {
        return this.then(function (v) { d.deliver(v); });
    };

    var slice = function (a) {
        var args = Array.prototype.slice.call(arguments, 1);
        return Array.prototype.slice.apply(a, args);
    };

    return Delayed;
}());