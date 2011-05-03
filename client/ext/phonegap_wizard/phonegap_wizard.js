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
 var util = require("core/util");
 var canon = require("pilot/canon");
 var editors = require("ext/editors/editors");
 var console = require("ext/console/console");
 var skin = require("text!ext/phonegap_wizard/skin.xml");
 var markup = require("text!ext/phonegap_wizard/phonegap_wizard.xml");
  
return ext.register("ext/phonegap_wizard/phonegap_wizard", {
    name     : "PhoneGap Wizard",
    dev      : "mobiledevelopersolutions.com",
    type     : ext.GENERAL,
    alone    : true,
    offline  : false,
    markup   : markup,
    skin     : skin,
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

        var _self = this;
        winPhonegapWizard.onclose = function() {
            ceEditor.focus();
        };
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
            appName : txtPWAppName.value,
            packageName : txtPWPackageName.value,
            activity : txtPWActivity.value,
            target : ddPWTarget.value
        };
    },

    execCreate: function() {
        winPhonegapWizard.hide();
        // show the console (also used by the debugger):
        console.enable();

        // show the tab
        tabConsole.set(this.pageID);
       
        var data = {
            command : "phonegap_wizard",
            cwd: ide.workspaceDir,
            options : this.getOptions()
        };            
        
        ide.socket.send(JSON.stringify(data));        
        ide.dispatchEvent("track_action", {type: "phonegap_wizard"});
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