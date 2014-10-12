/*
 * grunt-yuitest
 * https://github.com/pablo/grunt-modl-builder
 *
 * Copyright (c) 2014 Pablo Cabrera
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
    'use strict';

    var Delayed = require("../lib/Delayed");
    var YUITest = require("yuitest");
    var path = require("path");
    var cwd = process.cwd();

    YUITest.TestRunner.subscribe(YUITest.TestRunner.TEST_PASS_EVENT, function (event) {
        var msg = "[" + "PASS".green + "] " + event.testCase.name + " :: " + event.testName;
        console.log(msg.bold);
    });

    YUITest.TestRunner.subscribe(YUITest.TestRunner.TEST_FAIL_EVENT, function (event) {
        var msg = "[" + "FAIL".red + "] " + event.testCase.name + " :: " + event.testName;
        console.log(msg.bold);

        console.log(event.error.toString().red.bold);
        var stack = event.error.stack;
        if (stack) {
            console.log(stack.red.bold);
        }
    });

    var loadTestFiles = Delayed.delivery(function (d, files) {
        console.log("loadTestFiles");

        var delayedCount = 0;
        var tests = [];

        var checkFinished = function () {
            if (delayedCount === 0) {
                d.deliver(tests);
            }
        };

        files.forEach(function (f) {
            f.src.forEach(function (s) {
                var e = require(path.join(cwd, s));
                if (e instanceof Delayed) {
                    delayedCount += 1;
                    e.then(function (t) {
                        tests.push(t);
                        delayedCount -= 1;
                        checkFinished();
                    });
                } else {
                    tests.push(e);
                }
            });
        });

        checkFinished();
    });

    var runTests = Delayed.delivery(function (d, tests) {
        var f = function (event) {
            YUITest.TestRunner.unsubscribe(YUITest.TestRunner.COMPLETE_EVENT, f);
            console.log(event.results);
            d.deliver(event.results.failed === 0 && event.results.errors === 0);
        };

        YUITest.TestRunner.subscribe(YUITest.TestRunner.COMPLETE_EVENT, f);

        tests.forEach(function (t) {
            console.log("test!: ", t instanceof YUITest.TestCase);
            YUITest.TestRunner.add(t);
        });

        console.log("run!");
        YUITest.TestRunner.run();
    });

    grunt.registerMultiTask('yuitest', 'YUITest runner task', function() {
        var done = this.async();

        loadTestFiles(this.files).
        then(runTests).
        then(function (ok) {
        console.log("done:", ok);
        done(ok); });
    });

};