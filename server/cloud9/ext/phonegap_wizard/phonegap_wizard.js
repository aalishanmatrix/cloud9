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
        this.projectName = message.options.projectName;
        this.useJqm = message.options.useJqm;
        this.minSdk = message.options.minSdk;
        var _self = this;
        var android_message = message;
        android_message.command = "android_wizard";
        this.ide.workspace.execHook("command", user, android_message, client, this.afterAndroid, _self);
    };
    
    this.afterAndroid = function(code, err, out, _self) {
        _self.log(_self, "Got here" + code + 'err: ' + err + 'out: ' + out + 'cwd: ' + _self.projectDir);
        
        _self.successCount = 0; // Needs to be incremented to 9 for a successful project creation
        _self.errorLogged = false; // Just send first error back to client (all logged on console)
        _self.findJavaFile(_self, _self.projectDir);  // First, find and update the Java Main file
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
                _self.log(_self, "findJavaFile: Error opening directory: " + dir + ". Error: " + err);
                return;
            }
            filenames.forEach(function (filename) {
                var fullname = dir + '/' + filename;
                fs.stat(fullname, function (err, stat) {
                    if (err) {
                        _self.log(_self, "findJavaFile: Error opening file: " + fullname + ". Error: " + err);
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
                _self.log(_self, "updateJavaMain: Error reading file: " + filename + ". Error: " + err);
                return;
            }
            
            // Import com.phonegap instead of Activity
            data = data.replace("import android.app.Activity;", "import com.phonegap.*;");
    
            // Change superclass to DroidGap instead of Activity
            data = data.replace("extends Activity", "extends DroidGap");
    
            // Change to start with index.html
            data = data.replace('setContentView(R.layout.main);',
                    'if (getResources().getBoolean(R.bool.weinre)) {\n' +
                    '\t\t\tsuper.loadUrl("file:///android_asset/www/weinre_index.html");\n' +
                    '\t\t} else {\n' +
                    '\t\t\tsuper.loadUrl("file:///android_asset/www/index.html");\n' +
                    '\t\t}');

            fs.writeFile(filename, data, 'utf8', function(err) {
                if (err) {
                    _self.log(_self, "updateJavaMain: Error writing file: " + filename + ". Error: " + err);
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
                _self.log(_self, "getPhonegapJar: Error copying phonegap.jar to " + _self.projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #2 success
            }
        }); 
        async.copyfile(__dirname + "/Resources/phonegap/jar/dot_classpath", _self.projectDir + '/.classpath', true, function (err) {
            if (err) {
                _self.log(_self, "getPhonegapJar: Error copying .classpath to " + _self.projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #3 success
            }
        }); 
    };
    
    this.getWWWSources = function(_self) {
        var jqm = _self.useJqm;
        var newDirs = [_self.projectDir + "/assets", _self.projectDir + "/assets/www/"];
        if (jqm) newDirs.push(_self.projectDir + "/assets/www/jquery.mobile");
        _self.mkdirs(newDirs, function(err) {
            if (err) {
                _self.log(_self, "getWWWSources: Error creating assets/www directory: " + err);
            } else {
                async.copytree(__dirname + "/Resources/phonegap/js/", _self.projectDir + "/assets/www/", function (err) {
                    if (err) {
                        _self.log(_self, "getWWWSources: Error copying phonegap.js to " + _self.projectDir + " for PhoneGap project. " + err);
                    } else {
                        _self.register(_self); // #4 success
                    }
                }); 
                var wwwSrc = __dirname + (jqm ? "/Resources/jqm/phonegapExample/" : "/Resources/phonegap/Sample/");
                async.copytree(wwwSrc, _self.projectDir + "/assets/www/", function (err) {
                    if (err) {
                        _self.log(_self, "getWWWSources: Error populating www for PhoneGap project. " + err);
                    } else {
                        _self.register(_self); // #5 success
                    }
                });
                
                if (jqm) {           
                    async.copytree(__dirname + "/Resources/jqm/jquery.mobile", _self.projectDir + "/assets/www/jquery.mobile/", function (err) {
                        if (err) {
                            _self.log(_self, "getWWWSources: Error populating jquery.mobile for PhoneGap project. " + err);
                        } else {
                            _self.register(_self); // #6 success
                        }
                    });
                } else {
                      _self.register(_self); // #6 success (dummy to stay even with jqm case)
                }
            }   
        });
    };
    
    this.mkdirs = function(dirs, cb) {
        (function next(e) {
            (!e && dirs.length) ? fs.mkdir(dirs.shift(), 0755, next) : cb(e);
        })(null);
    };
    
    this.phonegapizeAndroidManifest = function(_self) {
        // First get reference file. TODO - add GitHub and installation references
        
        fs.readFile(__dirname + "/Resources/phonegap/AndroidManifest.xml", 'utf8', function(err, templateData) {
            if (err) _self.log(_self, "phonegapizeAndroidManifest: Error reading AndroidManifest.xml in: " + __dirname + ". Error: " + err);
            var manifestInsert = _self.getManifestScreensAndPermissions(templateData);
            var minSdk = _self.getMinSdk(_self.minSdk);
         
            var newManifestFile = _self.projectDir + "/AndroidManifest.xml";
            fs.readFile(newManifestFile, 'utf8', function(err, data) {
                if (err) {
                    _self.log(_self, "phonegapizeAndroidManifest: Error reading: " + newManifestFile + ". Error: " + err);
                    return;
                }
                
                // Add phonegap screens, permissions and turn on debuggable
                data = data.replace("<application android:", manifestInsert + "<application" + " android:debuggable=\"true\" android:");
                
                // Add android:configChanges="orientation|keyboardHidden" to the activity
                data = data.replace("<activity android:", "<activity android:configChanges=\"orientation|keyboardHidden\" android:");
                
                // Copy additional activities from source to destination - especially the DroidGap activity
                var activityIndex = templateData.indexOf("<activity");
                var secondActivityIndex = templateData.indexOf("<activity", activityIndex + 1);
                if (secondActivityIndex > 0) {
                    var endIndex = templateData.lastIndexOf("</activity>");
                    data = data.replace("</activity>", "</activity>\n\t\t" +
                            templateData.substring(secondActivityIndex, endIndex + 11));
                }
                
                data = data.replace("</manifest>", minSdk + "</manifest>");
    
                fs.writeFile(newManifestFile, data, 'utf8', function(err) {
                    if (err) {
                        _self.log(_self, "updateJavaMain: Error writing file: " + newManifestFile + ". Error: " + err);
                    } else {
                        _self.register(_self); // #7 success
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
            if (index < 0) {  // <uses-feature added in PhoneGap 1.0.0 manifest
                index = manifest.indexOf("<uses-feature", lastIndex + 1);
            }
        } while (index > 0);
        lastIndex = manifest.indexOf('<', lastIndex + 1);
        return manifest.substring(startIndex, lastIndex);
    };
    
    this.getMinSdk = function(minSdk) {
        var val = minSdk.substring(minSdk.lastIndexOf('-') + 1);
        return '\t<uses-sdk android:minSdkVersion="' + val + '" />\n';
    };
    
    this.getResFiles = function(_self) {    
        var projectDir = _self.projectDir;
        async.copyfile(__dirname + "/Resources/phonegap/layout/main.xml", projectDir + '/res/layout/main.xml', true, function (err) {
            if (err) {
                _self.log(_self, "getResFiles: Error copying layout files to " + projectDir + " for PhoneGap project. " + err);
            } else {
                _self.register(_self); // #8 success
            }
        });
        var weinre = '<?xml version="1.0" encoding="utf-8"?>\n' +
            '<resources>\n' +
            '\t<item format="boolean" type="bool" name="weinre">false</item>\n' +
            '</resources>\n';
        fs.writeFile(_self.projectDir + '/res/values/weinre.xml', weinre, 'utf8', function(err) {
                if (err) {
                    _self.log(_self, "getResFiles: Error creating weinre.xml. Error: " + err);
                    return;
                }
                _self.register(_self); // #9 success
            }); 
            
        _self.mkdirs([projectDir + "/res/xml/"], function(err) {
            if (err) {
                _self.log(_self, "getResFiles: Error creating res/xml directory: " + err);
            } else {
                async.copyfile(__dirname + "/Resources/phonegap/xml/plugins.xml", projectDir + '/res/xml/plugins.xml', true, function (err) {
                    if (err) {
                        _self.log(_self, "getResFiles: Error copying plugins.xml to " + projectDir + " for PhoneGap project. " + data.error);
                    } else {
                        _self.register(_self); // #10 success
                    }
                });
        
                fs.readdir(projectDir + "/res", function (err) {
                    if (err) {
                        _self.log(_self, "getResFiles: Error opening directory: " + projectDir + ". Error: " + err);
                        return;
                    }
//                      SDK Tools 15 has the directories created
//                    var newDirs = [projectDir + "/res/drawable-hdpi", projectDir + "/res/drawable-mdpi", projectDir + "/res/drawable-ldpi"];
//                    mkdirs(newDirs, function() {  // OK if directories already exist (older SDKs)
                    
                    async.copyfile(__dirname + "/Resources/phonegap/icons/appicon-ldpi.png", projectDir + "/res/drawable-ldpi/ic_launcher.png", true, function (err) {
                        if (err) {
                            _self.log(_self, "getResFiles: Error copying icon for PhoneGap project: " + projectDir + "/res/drawable-ldpi/appicon.png" + ": Error: " + err);
                            return;
                        }
                    });
                    async.copyfile(__dirname + "/Resources/phonegap/icons/appicon-mdpi.png", projectDir + "/res/drawable-mdpi/ic_launcher.png", true, function (err) {
                        if (err) {
                            _self.log(_self, "getResFiles: Error copying icon for PhoneGap project: " + projectDir + "/res/drawable-mdpi/appicon.png" + ": Error: " + err);
                            return;
                        }
                    });
                    async.copyfile(__dirname + "/Resources/phonegap/icons/appicon-hdpi.png", projectDir + "/res/drawable-hdpi/ic_launcher.png", true, function (err) {
                        if (err) {
                            _self.log(_self, "getResFiles: Error copying icon for PhoneGap project: " + projectDir + "/res/drawable-hdpi/appicon.png" + ": Error: " + err);
                            return;
                        }
                    });
                    _self.register(_self); // #11 success
                });
            }
        });
    };  
    this.log = function(_self, str) {
        console.log('phonegap_wizard error log:' + str);
        if (_self.errorLogged === false) {  // Just send first failure back to client
            _self.errorLogged = true;
            _self.ide.broadcast(JSON.stringify({"type": "phonegap_wizard_complete", "name" : _self.projectName }), _self.name);
            _self.sendResult(0, "phonegap_wizard", {
                err: str,
                code: 1
            });
        }
    };
    
    this.register = function(_self) {
        if (++_self.successCount === 11) {
            _self.ide.broadcast(JSON.stringify({"type": "phonegap_wizard_complete", "name" : _self.projectName }), _self.name);
            _self.sendResult(0, "phonegap_wizard", {
                out: "PhoneGap project " + _self.projectName + " successfully created",
                code: 1 //end
            });
        }
//        console.log ('successCount ' + _self.successCount);
    };
        
}).call(PhonegapWizardPlugin.prototype);
