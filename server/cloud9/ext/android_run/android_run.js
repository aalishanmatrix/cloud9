/**
 * Android Build, Deploy and Run Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
var Plugin = require("cloud9/plugin");
var sys = require("sys");
var fs = require("fs");

var AndroidRunPlugin = module.exports = function(ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "android_run";
};

sys.inherits(AndroidRunPlugin, Plugin);

(function() {
    this.command = function(user, message, client) {
        if (message.command !== "android_run") {
            return false;
        }
        this.validate(message);
    };
    
    this.validate = function(message) {
        var _self = this;
        
        fs.readFile(message.cwd + "/AndroidManifest.xml",'utf8', function(e, data) {
            var packageName, activity;
            var fail = false;
            if (e) {
                fail = true;
            } else {
                packageName = _self.getFromAndroidXml(data, 'manifest', 'package');
                if (!packageName) { 
                    fail = true;
                } else {
                    activity = _self.getFromAndroidXml(data, 'activity', 'android:name');
                    if (!activity) {
                        fail = true;
                    }
                }
            }
            if (fail) {
                _self.sendResult(0, "android_validate", {
                    out: "Invalid Android project: Failed to get activity name from " + message.cwd + '/AndroidManifest.xml' + e
                });                
            } else {
                _self.activityString = packageName + '/' + packageName + '.' + activity;
                console.log("Activity is ", _self.activityString);
                _self.build(_self, message);
            }
        });
    };
    
    this.getFromAndroidXml = function(contents, key, attr) {
        var index = contents.indexOf(key);
        if (index === -1) return null;
        index = contents.indexOf(attr, index);
        if (index === -1) return null;
        index += attr.length + 2;  // skip past key and ="
        var endIndex = contents.indexOf('"', index);
        if (endIndex === -1) return null;
        return contents.substring(index, endIndex);
    };
         
    this.build = function(_self, message) {
        this.spawnCommand('ant', ["debug"], message.cwd, null, null, function(code, err, out) {
            var index = out.indexOf('BUILD SUCCESSFUL');
            if (index === -1) { 
                /* Build failed, so send log back to console */
                _self.sendResult(0, "android_build", {
                    err: err,
                    out: out,
                    code: 1
                });
            } else {
                _self.deploy(_self, message.cwd, index, out);
            }
        });
    };
    
    this.deploy = function(_self, cwd, index, buildLog) {      
        var packageIndex = buildLog.indexOf("Debug Package:") + "Debug Package:".length + 1;
        var fileName = buildLog.substr(packageIndex, index - packageIndex - 2);
        console.log("installing file ", fileName);
        _self.spawnCommand("adb", ["install", "-r", fileName], cwd, null, null, function(code, err, out) {                    
            if (out.indexOf('Success') === -1) {
                /* Deploy failed */                    
                _self.sendResult(0, "android_deploy", {
                    err: err,
                    out: out,
                    code: 1
                });
            } else {
                _self.run(_self, cwd);
            }
        });
    };
    
    this.run = function(_self, cwd) {
        _self.spawnCommand("adb", ["shell", "am", "start", "-n", _self.activityString], cwd, null, null, function(code, err, out) {                                      
            _self.sendResult(0, "android_run", {
                err: err,
                out: out,
                code: 1
            });
        });
    };
    
}).call(AndroidRunPlugin.prototype);
