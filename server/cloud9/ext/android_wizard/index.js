/**
 * Android Wizard Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
var Plugin = require("cloud9/plugin");
var sys = require("sys");

var AndroidWizardPlugin = module.exports = function(ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "android_wizard";
};

sys.inherits(AndroidWizardPlugin, Plugin);

(function() {
    
    this.command = function(user, message, client) {
        if (message.command != "android_wizard")
            return false;
            
        /**
         * android project creation example 
         * android create project --target 4 --name test1 --path ~/android-command-line/test1dir 
         * --activity myactivity --package com.mds.test1
         */
            
        var cmd = "android";
        var args = [];
        var i = 0;
        args[0] = "create";
        args[1] = "project";
        args[2] = "--target";
        args[3] = "4"; /*TODO GET Target from wizard */
        args[4] = "--name";
        args[5] = message.options.appName;
        args[6] = "--path";
        args[7] = message.cwd;
        args[8] = "--activity";
        args[9] = message.options.activity;
        args[10] = "--package";
        args[11] = message.options.packageName;
        
        /* TODO manage minSDK */
            
        var _self = this;
        this.spawnCommand("android", args, message.cwd, null, null, function(code, err, out) {
            _self.sendResult(0, message.command, {
                code: code,
                argv: message.argv,
                err: err,
                out: out
            });
        });
    };
}).call(AndroidWizardPlugin.prototype);
