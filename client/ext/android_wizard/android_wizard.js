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
 var util = require("core/util");
 var canon = require("pilot/canon");
 var editors = require("ext/editors/editors");
 var console = require("ext/console/console");
 var skin = require("text!ext/android_wizard/skin.xml");
 var markup = require("text!ext/android_wizard/android_wizard.xml");
  
return ext.register("ext/android_wizard/android_wizard", {
    name     : "Android Wizard",
    dev      : "mobiledevelopersolutions.com",
    type     : ext.GENERAL,
    alone    : true,
    offline  : false,
    markup   : markup,
    skin     : skin,
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

        var _self = this;
        winAndroidWizard.onclose = function() {
            ceEditor.focus();
        };
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
            appName : txtAWAppName.value,
            packageName : txtAWPackageName.value,
            activity : txtAWActivity.value,
            minSDK : txtAWMinSDK.value
        };
    },

    execCreate: function() {
        winAndroidWizard.hide();
        // show the console (also used by the debugger):
        console.enable();

        // show the tab
        tabConsole.set(this.pageID);
       
        var data = {
            command : "android_wizard",
            cwd: ide.workspaceDir,
            options : this.getOptions()
        };            
        
        ide.socket.send(JSON.stringify(data));        
        ide.dispatchEvent("track_action", {type: "android_wizard"});
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