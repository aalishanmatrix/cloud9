/**
 * Android Build and Run Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
 
require.def("ext/android_run/buildrun", [], function() {
     
var ide = require("core/ide");
var console = require("ext/console/console");

var Buildrun = (function() {    
    
    function Buildrun() {
    }
    
    Buildrun.prototype = {
        buildrun : function (debug, name) {

            console.enable();
    
            // show the tab
            tabConsole.set(this.pageID);
           
            var data = {
                command : "android_run",
                cwd: ide.workspaceDir + '/' + name,
                invoke: "ant",
                args: ["debug"]
            };            
            
            ide.socket.send(JSON.stringify(data));        
            ide.dispatchEvent("track_action", {type: "android_run"});
        },
        
        build_done: function() {
            
        }
    };
    return Buildrun;
})();

return Buildrun;
});
    