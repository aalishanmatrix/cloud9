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
    
    this.command = function(user, message, client, phonegap_callback, phonegap_self) {
//        console.log('android_wizard' + JSON.stringify(message));
        if (message.command !== "android_wizard")
            return false;
            
        /**
         * android project creation example 
         * android create project --target 4 --name test1 --path ~/android-command-line/test1dir 
         * --activity myactivity --package com.mds.test1
         * 
         * See http://developer.android.com/guide/developing/projects/projects-cmdline.html for android create
         * project spec
         */
            
        var args = [];
        args[0] = "create";
        args[1] = "project";
        args[2] = "--target";
        args[3] = phonegap_self ? 'android-15' : message.options.target;
        args[4] = "--path";
        args[5] = message.cwd + '/' + message.options.projectName;
        args[6] = "--activity";
        args[7] = message.options.activity;
        args[8] = "--package";
        args[9] = message.options.packageName;
        if (message.options.appName) {
            args[10] = "--name";
            args[11] = message.options.appName;
        }
        
        /* TODO manage minSDK */
            
        var _self = this;
        this.spawnCommand("android", args, message.cwd, null, null, function(code, err, out) {
            if (code === 0 && phonegap_callback) {  // If success and making PhoneGap project
                phonegap_callback(code, err, out, phonegap_self);
            } else {
                _self.ide.broadcast(JSON.stringify({"type": "android_wizard_complete"}), this.name);
                _self.sendResult(0, message.command, {
                    code: code,
                    argv: message.argv,
                    err: err,
                    out: out
                });
            }
        });
    };
}).call(AndroidWizardPlugin.prototype);
