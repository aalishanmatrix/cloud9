/**
 * Android Build Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
var Plugin = require("cloud9/plugin");
var Path = require("path");
var fs = require("fs");
var sys = require("sys");
var Async  = require("async");

var AndroidRunPlugin = module.exports = function(ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "android_run";

};

sys.inherits(AndroidRunPlugin, Plugin);

(function() {
    
    this.command = function(user, message, client) {
        if (message.command != "android_build")
            return false;
            
        var _self = this;
        this.spawnCommand(message.invoke, message.args, message.cwd, null, null, function(code, err, out) {
            _self.sendResult(0, message.command, {
                code: code,
                argv: message.argv,
                err: err,
                out: out
            });
        });
    };
}).call(AndroidRunPlugin.prototype);
