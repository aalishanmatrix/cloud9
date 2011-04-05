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
        winAndroidWizard.onshow = function() {
            // get selected node in tree and set it as selection
            var name = _self.getSelectedTreeNode().getAttribute("name");
            if (name.length > 25)
                name = name.substr(0, 22) + "...";
            rbSFSelection.setAttribute("label", "Selection ( " + name + " )");
        };
        trAWResult.addEventListener("afterselect", function(e) {
            var path,
                root = trFiles.xmlRoot.selectSingleNode("folder[1]"),
                node = trAWResult.selected,
                line = 0,
                text = "";
            if (node.tagName == "d:maxreached")
                return;
            if (node.tagName == "d:excerpt") {
                path = node.parentNode.getAttribute("path");
                line = node.getAttribute("line");
                text = node.parentNode.getAttribute("query");
            }
            else {
                path = node.getAttribute("path");
                text = node.getAttribute("query");
            }
            editors.showFile(root.getAttribute("path") + "/" + path, line, 0, text);
        });
        ide.addEventListener("socketMessage", this.onMessage.bind(this));
    },
    
    

    getSelectedTreeNode: function() {
        var node = trFiles.selected;
        if (!node)
            node = trFiles.xmlRoot.selectSingleNode("folder[1]");
        while (node.tagName != "folder")
            node = node.parentNode;
        return node;
    },

    toggleDialog: function(forceShow, data) {
        ext.initExtension(this);
        
        if (!winAndroidWizard.visible || forceShow || this.$lastState != isReplace) {
            //this.setupDialog(isReplace);
            var value = null;            
            if (data && data.line) {
                var pos = data.line.indexOf(" ");
                if (pos > 0) {
                    value = data.line.slice(pos + 1);
                }
            }
            if (value === null) {
                var editor = editors.currentEditor;
                if (editor) {
                    value  = editor.getDocument().getTextRange(editor.getSelection().getRange());
                }
            }
            if (value) {
                this.txtFind.setValue(value);
            }
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
        if (!this.$panel) {
            this.$panel = tabConsole.add(this.pageTitle, this.pageID);
            this.$panel.appendChild(trAWResult);
            trAWResult.setProperty("visible", true);
            this.$model = trAWResult.getModel();
            var _self = this;
            // make sure the tab is shown when results come in
            this.$model.addEventListener("afterload", function() {
                tabConsole.set(_self.pageID);
            });
        }
        // show the tab
        tabConsole.set(this.pageID);
        var node = this.$currentScope = grpSFScope.value == "projects"
            ? trFiles.xmlRoot.selectSingleNode("folder[1]")
            : this.getSelectedTreeNode();
        trAWResult.setAttribute("empty-message", "Nothing returned1");
        
        var data = {
            command : "android_wizard",
            cwd: ide.workspaceDir,
            options : this.getOptions()
        };            
        
        ide.socket.send(JSON.stringify(data));
        
//        this.$model.load("{davProject.report('" + node.getAttribute("path")
//            + "', 'codesearch', " + JSON.stringify(this.getOptions()) + ")}");
        ide.dispatchEvent("track_action", {type: "android_wizard"});
    },
    
    
    onMessage: function(e) {
        var res,
            message = e.message;

        util.alert("In android_wizard:onMessage.");
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