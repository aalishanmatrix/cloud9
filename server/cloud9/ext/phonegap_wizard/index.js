/**
 * Phonegap Wizard Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
var Plugin = require("cloud9/plugin");
var sys = require("sys");
var async = require("asyncjs");
var fs = require("fs");

var PhonegapWizardPlugin = module.exports = function(ide) {
    this.ide = ide;
    this.hooks = ["command"];
    this.name = "phonegap_wizard";
};

sys.inherits(PhonegapWizardPlugin, Plugin);

(function() {
    
    this.command = function(user, message, client) {
        if (message.command !== "phonegap_wizard")
            return false;

        this.projectDir = message.cwd + '/' + message.options.projectName;
        var _self = this;
        var android_message = message;
        android_message.command = "android_wizard";
        this.ide.exts.android_wizard.command(user, android_message, client, this.afterAndroid, _self);
    };
    
    this.afterAndroid = function(code, err, out, _self) {
        console.log("Got here" + code + 'err: ' + err + 'out: ' + out + 'cwd: ' + _self.projectDir);
        
        // First, find and update the Java Main file
        _self.successCount = 0; // Needs to be incremented to 8 for a successful project creation
        _self.findJavaFile(_self, _self.projectDir);
        _self.getPhonegapJar(_self);
        _self.getWWWSources(_self);
        _self.phonegapizeAndroidManifest(_self);
        _self.getResFiles(_self);
    };
    
    // Recursively search for java file. Assuming there is only one in the new
    // Android project
    
    this.findJavaFile = function(_self, dir) {
        fs.readdir(dir, function (err, filenames) {
            if (err) {
                console.log("findJavaFile: Error opening directory: " + dir + ". Error: " + err);
                return;
            }
            filenames.forEach(function (filename) {
                var fullname = dir + '/' + filename;
                fs.stat(fullname, function (err, stat) {
                    if (err) {
                        console.log("findJavaFile: Error opening file: " + fullname + ". Error: " + err);
                        return;
                    }
                    if (stat.isDirectory()) {
                        _self.findJavaFile(_self, fullname);
                    } else if (/\.java$/.test(filename)) {
                        _self.updateJavaMain(_self,fullname);
                    }
                });
            });          
        });
    };
    
    this.updateJavaMain = function(_self, filename) {
        fs.readFile(filename,'utf8', function(err, data) {
            if (err) {
                console.log("updateJavaMain: Error reading file: " + filename + ". Error: " + err);
                return;
            }
            
            // Import com.phonegap instead of Activity
            data = data.replace("import android.app.Activity;", "import com.phonegap.*;");
    
            // Change superclass to DroidGap instead of Activity
            data = data.replace("extends Activity", "extends DroidGap");
    
            // Change to start with index.html
            data = data.replace("setContentView(R.layout.main);",
                    "super.loadUrl(\"file:///android_asset/www/index.html\");");

            fs.writeFile(filename, data, encoding='utf8', function(err) {
                if (err) {
                    console.log("updateJavaMain: Error writing file: " + filename + ". Error: " + err);
                    return;
                }
                _self.register(_self); // #1 success
            });
        });
    };

    this.getPhonegapJar = function(_self) {
        // Get phonegap.jar and the classpath
        async.copyfile(__dirname + "/Resources/phonegap/jar/phonegap.jar", _self.projectDir + '/libs/phonegap.jar', true, function (err) {
            if (err) {
                console.log("getPhonegapJar: Error copying phonegap.jar to " + _self.projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #2 success
            }
        }); 
        async.copyfile(__dirname + "/Resources/phonegap/jar/dot_classpath", _self.projectDir + '/.classpath', true, function (err) {
            if (err) {
                console.log("getPhonegapJar: Error copying .classpath to " + _self.projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #3 success
            }
        }); 
    };
    
    this.getWWWSources = function(_self) {
        _self.mkdirs([_self.projectDir + "/assets", _self.projectDir + "/assets/www/"], 0755, function(err) {
            if (err) {
                console.log("getWWWSources: Error creating assets/www directory: " + err);
            } else {
                async.copytree(__dirname + "/Resources/phonegap/js/", _self.projectDir + "/assets/www/", function (err) {
                    if (err) {
                        console.log("getWWWSources: Error copying phonegap.js to " + _self.projectDir + " for PhoneGap project. " + err);
                    } else {
                        _self.register(_self); // #4 success
                    }
                }); 
                async.copytree(__dirname + "/Resources/phonegap/Sample/", _self.projectDir + "/assets/www/", function (err) {
                    if (err) {
                        console.log("getWWWSources: Error populating www for PhoneGap project. " + err);
                    } else {
                        _self.register(_self); // #5 success
                    }
                });
            }   
        });
    };
    
    this.mkdirs = function(dirs, mode, cb) {
        (function next(e) {
            (!e && dirs.length) ? fs.mkdir(dirs.shift(), mode, next) : cb(e);
        })(null);
    };
    
    this.phonegapizeAndroidManifest = function(_self) {
        // First get reference file. TODO - add GitHub and installation references
        
        fs.readFile(__dirname + "/Resources/phonegap/AndroidManifest.xml", 'utf8', function(err, data) {
            if (err) console.log("phonegapizeAndroidManifest: Error reading AndroidManifest.xml in: " + __dirname + ". Error: " + err);
            var manifestInsert = _self.getManifestScreensAndPermissions(data);
            var minSdk = _self.getMinSdk(data);
         
            var newManifestFile = _self.projectDir + "/AndroidManifest.xml";
            fs.readFile(newManifestFile, 'utf8', function(err, data) {
                if (err) {
                    console.log("phonegapizeAndroidManifest: Error reading: " + newManifestFile + ". Error: " + err);
                    return;
                }
                
                // Add phonegap screens, permissions and turn on debuggable
                data = data.replace("<application android:", manifestInsert + "<application" + " android:debuggable=\"true\" android:");
                
                // Add android:configChanges="orientation|keyboardHidden" to the activity
                data = data.replace("<activity android:", "<activity android:configChanges=\"orientation|keyboardHidden\" android:");
                
                data = data.replace("</manifest>", minSdk + "</manifest>");
    
                fs.writeFile(newManifestFile, data, encoding='utf8', function(err) {
                    if (err) {
                        console.log("updateJavaMain: Error writing file: " + newManifestFile + ". Error: " + err);
                    } else {
                        _self.register(_self); // #6 success
                    }
                });
            });
        });
    };
    
    this.getManifestScreensAndPermissions = function(manifest) {
        var startIndex;
        startIndex = manifest.indexOf("<supports-screens");
        if (startIndex == -1)
            startIndex = manifest.indexOf("<uses-permissions");
        if (startIndex == -1)
            return null;
        var index = startIndex;
        var lastIndex;
        do {
            lastIndex = index;
            index = manifest.indexOf("<uses-permission", index + 1);
        } while (index > 0);
        lastIndex = manifest.indexOf('<', lastIndex + 1);
        return manifest.substring(startIndex, lastIndex);
    };
    
    this.getMinSdk = function(data) {
        var startIndex = data.indexOf("<uses-sdk");
        var endIndex = data.indexOf("<", startIndex + 1);
        return data.substring(startIndex, endIndex);
    };
    
    this.getResFiles = function(_self) {    
        async.copyfile(__dirname + "/Resources/phonegap/layout/main.xml", _self.projectDir + '/res/layout/main.xml', true, function (err) {
            if (err) {
                console.log("getResFiles: Error copying layout files to " + _self.projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #7 success
            }
        });
        
        fs.readdir(_self.projectDir + "/res", function (err, filenames) {
            if (err) {
                console.log("getResFiles: Error opening directory: " + _self.projectDir + ". Error: " + err);
                return;
            }
            var count = 0, total = 0;
            filenames.forEach(function (filename) {
                if (filename.indexOf("drawable") === 0) total++;  
            });
            filenames.forEach(function (filename) {  
                if (filename.indexOf("drawable") === 0) {     
                    var fullname = _self.projectDir + '/res/' + filename + '/icon.png';
                    async.copyfile(__dirname + "/Resources/phonegap/icons/mdspgicon.png", fullname, true, function (err) {
                        if (err) {
                            console.log("getResFiles: Error copying icon for PhoneGap project: " + fullname + ": Error: " + err);
                        } else {
                            if (++count === total)  _self.register(_self); // #8 success
                        }
                    });
                }
            });
        });
    };       
    this.register = function(_self) {
        console.log("success " + ++_self.successCount);
    };
        
}).call(PhonegapWizardPlugin.prototype);
