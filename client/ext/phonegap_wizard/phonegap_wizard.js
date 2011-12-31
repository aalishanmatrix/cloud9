/**
 * PhoneGap Wizard Module for the Cloud9 IDE
 *
 * @copyright 2011, Mobile Developer Solutions
 * @author Paul Beusterien
 * @license TBD
 */
 
define(function(require, exports, module) {
 
 var ide = require("core/ide");
 var ext = require("core/ext");
 var editors = require("ext/editors/editors");
 var markup = require("text!ext/phonegap_wizard/phonegap_wizard.xml");
  
module.exports = ext.register("ext/phonegap_wizard/phonegap_wizard", {
    name     : "PhoneGap Wizard",
    dev      : "mobiledevelopersolutions.com",
    type     : ext.GENERAL,
    alone    : true,
    offline  : false,
    markup   : markup,
    commands  : {
        "phonegap_wizard": {hint: "configure a PhoneGap Project"}
    },
    pageTitle: "PhoneGap Project Creation Log",
    pageID   : "pgPWResults",
    hotitems : {},

    nodes    : [],

    hook : function(){
        var _self = this;

        this.nodes.push(
            mnuFile.appendChild(new apf.divider()),
            mnuFile.appendChild(new apf.item({
                caption : "Create PhoneGap for Android Project",
                onclick : function() {
                    _self.toggleDialog(false);
                }
            }))
        );
        
        this.hotitems["phonegap_wizard"] = [this.nodes[1]];
    },

    init : function(amlNode){

        this.btnCreate = btnPWCreate;
        this.btnCreate.onclick = this.execCreate.bind(this);

        winPhonegapWizard.onclose = function() {
            ceEditor.focus();
        };
        ide.addEventListener("socketDisconnect", this.onDisconnect.bind(this));
        ide.addEventListener("socketMessage", this.onMessage.bind(this));
        
        ide.addEventListener("consolecommand.phonegap_wizard", function(e) {
            ide.send(JSON.stringify({
                command: "internal-isfile",
                argv: e.data.argv,
                cwd: e.data.cwd,
                sender: "phonegap_wizard"
            }));
            return false;
        }); 
    },
    
    onMessage : function(e) {
        var message = e.message;
    //    console.log("MSG", message);
        if (message.type === "phonegap_wizard_complete") {
    //        console.log('PhoneGap wizard complete');
            if (message.name) editors.showFile('/workspace/' + message.name + '/assets/www/index.html');
            stProcessRunning.deactivate();
        }
    },
    
    onDisconnect : function() {
        stDebugProcessRunning.deactivate();
    },

    toggleDialog: function(forceShow, data) {
        ext.initExtension(this);
        
        if (!winPhonegapWizard.visible || forceShow) {
            winPhonegapWizard.show();
        }
        else {
            winPhonegapWizard.hide();
        }
        return false;
    },

    onHide : function() {
        var editor = require('ext/editors/editors').currentEditor;
        if (editor && editor.ceEditor)
            editor.ceEditor.focus();
    },

    phonegap_wizard: function(data) {
        return this.toggleDialog(true, data);
    },

    setupDialog: function(isReplace) {
        this.$lastState = isReplace;
        
        return this;
    },

    getOptions: function() {
        return {
            projectName : txtPWProjectName.value,
            packageName : txtPWPackageName.value,
            useJqm : ddPWTemplate.value === 'pgdemojQM',  // TODO implate dynamic templates
            minSdk : ddPWMinSdk.value
        };
    },

    execCreate: function() {
        winPhonegapWizard.hide();
        
        if (stProcessRunning.active || !stServerConnected.active) {
            console.log('phonegap_wizard: cannot create project when another process is running or the server is disconnected');
            return false;
        }
       
        var data = {
            command : "phonegap_wizard",
            cwd: ide.workspaceDir,
            options : this.getOptions()
        };            
        
        ide.socket.send(JSON.stringify(data));        
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