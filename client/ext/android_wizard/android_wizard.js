/**
 * Android Wizard Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
 
define(function(require, exports, module) {
 
 var ide = require("core/ide");
 var ext = require("core/ext");
 var markup = require("text!ext/android_wizard/android_wizard.xml");
  
module.exports = ext.register("ext/android_wizard/android_wizard", {
    name     : "Android Wizard",
    dev      : "mobiledevelopersolutions.com",
    type     : ext.GENERAL,
    alone    : true,
    offline  : false,
    markup   : markup,
    commands  : {
        "android_wizard": {hint: "configure an Android Project"}
    },
    pageTitle: "Android Project Creation Log",
    pageID   : "pgAWResults",
    hotitems : {},

    nodes    : [],

    hook : function(){
        var _self = this;

        this.nodes.push(
            mnuFile.appendChild(new apf.divider()),
            mnuFile.appendChild(new apf.item({
                caption : "Create Android Project",
                onclick : function() {
                    _self.toggleDialog(false);
                }
            }))
        );
        
        this.hotitems["android_wizard"] = [this.nodes[1]];
    },

    init : function(amlNode){

        this.btnCreate = btnAWCreate;
        this.btnCreate.onclick = this.execCreate.bind(this);

        winAndroidWizard.onclose = function() {
            ceEditor.focus();
        };
        
        ide.addEventListener("socketDisconnect", this.onDisconnect.bind(this));
        ide.addEventListener("socketMessage", this.onMessage.bind(this));
        
        dbgNode.addEventListener("onsocketfind", function() {
            return ide.socket;
        });
        
        ide.addEventListener("consolecommand.android_wizard", function(e) {
            ide.send(JSON.stringify({
                command: "internal-isfile",
                argv: e.data.argv,
                cwd: e.data.cwd,
                sender: "android_wizard"
            }));
            return false;
        });        
    },
    
    onMessage : function(e) {
        var message = e.message;
        console.log("MSG", message);
        if (message.type === "android_wizard_complete") {
                console.log('got test-return');
                stProcessRunning.deactivate();
        }
    },
    
    onDisconnect : function() {
        stDebugProcessRunning.deactivate();
    },

    toggleDialog: function(forceShow, data) {
        ext.initExtension(this);
        
        if (!winAndroidWizard.visible || forceShow) {
            winAndroidWizard.show();
        }
        else {
            winAndroidWizard.hide();
        }
        return false;
    },

    onHide : function() {
        var editor = require('ext/editors/editors').currentEditor;
        if (editor && editor.ceEditor)
            editor.ceEditor.focus();
    },

    android_wizard: function(data) {
        return this.toggleDialog(true, data);
    },

    setupDialog: function(isReplace) {
        this.$lastState = isReplace;
        
        return this;
    },

    getOptions: function() {
        return {
            projectName : txtAWProjectName.value,
            appName : txtAWAppName.value,
            packageName : txtAWPackageName.value,
            activity : txtAWActivity.value,
            target : ddAWTarget.value,
            minSDK : txtAWMinSDK.value
        };
    },

    execCreate: function() {
        winAndroidWizard.hide();

        if (stProcessRunning.active || !stServerConnected.active) {
            console.log('android_wizard: cannot create project when another process is running or the server is disconnected');
            return false;
        }

        var data = {
            command : "android_wizard",
            cwd: ide.workspaceDir,
            options : this.getOptions()
        };            
        
        ide.send(JSON.stringify(data));  
        stProcessRunning.activate();
    },

    enable : function(){
        this.nodes.each(function(item){
            item.enable();
        });
    },

    disable : function(){
        this.nodes.each(function(item){
            item.disable();
        });
    },
 
    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
    }
});

});