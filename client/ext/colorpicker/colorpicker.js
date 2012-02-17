/**
 * Code Tools Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var Editors = require("ext/editors/editors");

var Range = require("ace/range").Range;

var origArrowTop;
var Colors = {};
var namedColors = apf.color.colorshex;
var namedPart = Object.keys(namedColors).join("|");
var colorsRe = new RegExp("(#([0-9A-Fa-f]{3,6})\\b)"
    + "|\\b(" + namedPart + ")\\b"
    + "|(rgba?\\(\\s*\\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\b\\s*,\\s*\\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\b\\s*,\\s*\\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\b\\s*(:?\\s*,\\s*(?:1|0|0?\\.[0-9]{1,2})\\s*)?\\))"
    + "|(rgba?\\(\\s*(\\d?\\d%|100%)+\\s*,\\s*(\\d?\\d%|100%)+\\s*,\\s*(\\d?\\d%|100%)+\\s*(:?\\s*,\\s*(?:1|0|0?\\.[0-9]{1,2})\\s*)?\\))", "gi");
var RGBRe = new RegExp("(?:rgba?\\(\\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\s*,\\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\s*,\\s*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\s*(:?\\s*,\\s*(?:1|0|0?\\.[0-9]{1,2})\\s*)?\\))"
    + "|(rgba?\\(\\s*(\\d?\\d%|100%)+\\s*,\\s*(\\d?\\d%|100%)+\\s*,\\s*(\\d?\\d%|100%)+\\s*(:?\\s*,\\s*(?:1|0|0?\\.[0-9]{1,2})\\s*)?\\))");

var css = require("text!ext/colorpicker/colorpicker.css");
var markup = require("text!ext/colorpicker/colorpicker.xml");
var skin = require("text!ext/colorpicker/skin.xml");

/**
 * Creates an ACE range object that points to the start of the color (row, column)
 * and the end of the color (row, column) inside the document.
 * 
 * @param {Number} row
 * @param {Number} col
 * @param {String} line
 * @param {String} color
 * @type {Range}
 */
function createColorRange(row, col, line, color) {
    if (col) {
        var str = line;
        var colorLen = color.length;
        var lastIdx;
        var atPos = false;
        while ((lastIdx = str.indexOf(color)) != -1) {
            str = str.substr(lastIdx + colorLen);
            if (lastIdx <= col && lastIdx + colorLen >= col) {
                atPos = true;
                col = lastIdx;
            }
        }
        if (!atPos)
            return null;
    }
    col = line.indexOf(color);
    return Range.fromPoints({
        row: row,
        column: col
    }, {
        row: row,
        column: col + color.length
    });
}

module.exports = ext.register("ext/colorpicker/colorpicker", {
    dev    : "Ajax.org",
    name   : "Colorpicker Code Tool",
    alone  : true,
    type   : ext.GENERAL,
    skin   : skin,

    nodes : [],

    /**
     * Initializes the plugin; inserts markup and adds event listeners to different
     * areas of the UI.
     * 
     * @type {void}
     */
    init: function() {
        apf.document.body.insertMarkup(markup);
        this.menu = mnuColorPicker;
        this.colorpicker = clrCodeTools;
        var divs = this.menu.$ext.getElementsByTagName("div");
        var _self = this;

        // fetch the colortool DOM node and that of the arrow of the menu.
        for (var i = 0, l = divs.length; i < l; ++i) {
            if (divs[i].className.indexOf("arrow") > -1)
                this.arrow = divs[i];
            else if (divs[i].className.indexOf("codetools_colorpicker_tools") > -1)
                this.colortools = divs[i];
        }

        // add listeners for interaction with the colortools element. This element
        // is propagated with colors used inside a document, which can be selected.
        apf.addListener(this.colortools, "mousemove", function(e) {
            var el = e.srcElement || e.element;
            if (el.nodeType != 1 || el.className.indexOf("color") == -1)
                return;
            var cls;
            var spans = _self.colortools.getElementsByTagName("span");
            for (var i = 0, l = spans.length; i < l; ++i) {
                cls = spans[i].className;
                if (spans[i] !== el)
                    apf.setStyleClass(spans[i], null, ["color_hover"]);
                else if (cls.indexOf("color_hover") === -1 && spans[i] === el)
                    apf.setStyleClass(spans[i], "color_hover", []);
            }
        });

        apf.addListener(this.colortools, "mousedown", function(e) {
            var el = e.srcElement || e.element;
            if (el.nodeType != 1 || el.className.indexOf("color") == -1)
                return;

            var c = apf.color;
            var cp = _self.colorpicker;
            var hsb = c.hexToHSB(c.fixHex(el.getAttribute("data-color")));
            cp.setAttribute("hue", hsb.h);
            cp.setAttribute("saturation", hsb.s);
            cp.setAttribute("brightness", hsb.b);
        });

        // when a color was picked in the colorpicker, the 'hex' property changes.
        // we listen to 'hex', because we use this as the base format to convert
        // from and to.
        this.colorpicker.addEventListener("prop.hex", function(e) {
            _self.onColorPicked(e.oldvalue, e.value);
        });

        // when the menu (that contains the colorpicker) hides, do some housekeeping
        // like unregistering of event listeners.
        this.menu.addEventListener("prop.visible", function(e) {
            // when the the colorpicker hides, hide all tooltip markers
            if (!e.value) {
                var a = _self.$activeColor;
                if (a) {
                    apf.removeEventListener("keydown", a.listeners.onKeyDown);
                    a.editor.removeEventListener("mousewheel", a.listeners.onScroll);
                    ide.removeEventListener("codetools.cursorchange", a.listeners.onCursorChange);
                    ide.removeEventListener("codetools.selectionchange", a.listeners.onSelectionChange);
                    delete _self.$activeColor;
                    _self.hideColorTooltips(a.editor);
                    _self.colorpicker.$input.blur();
                    a.editor.focus();
                }
            }
        });
    },

    /**
     * In the hook function we load the CSS for the markers that appear on hover
     * and hook the event listeners of the codetools plugin.
     * The codetools plugin emits events when the user moves her mouse and we then
     * detect if the mouse pointer is hovering a color we recognize.
     * 
     * @type {void}
     */
    hook: function() {
        apf.importCssString(css || "");

        // detect and return a list of colors found on a line from an ACE document.
        function detectColors(pos, line) {
            var colors = line.match(colorsRe);
            if (!colors || !colors.length)
                return [];
            var start, end;
            var col = pos.column;
            for (var i = 0, l = colors.length; i < l; ++i) {
                start = line.indexOf(colors[i]);
                end = start + colors[i].length;
                if (col >= start && col <= end)
                    return [colors, colors[i]];
            }
            return [colors];
        }

        var _self = this;
        var columnChangeTimer;

        ide.addEventListener("codetools.columnchange", function(e) {
            clearTimeout(columnChangeTimer);
            var doc = e.doc;
            var pos = e.pos;
            var editor = e.editor;

            var line = doc.getLine(1);
            if (!(e.amlEditor.syntax == "css" || e.amlEditor.syntax == "svg" || (line && line.indexOf("<a:skin") > -1)))
                return;

            line = doc.getLine(pos.row);
            var colors = detectColors(pos, line);
            if (colors[0] && colors[0].length) {
                _self.showColorTooltip(pos, editor, line, colors[0]);
            }
            else {
                columnChangeTimer = setTimeout(function() {
                    _self.hideColorTooltips(editor);
                }, 100);
            }
        });

        ide.addEventListener("codetools.codeclick", function(e) {
            var doc = e.doc;
            var pos = e.pos;
            var editor = e.editor;

            var line = doc.getLine(1);
            if (!(e.amlEditor.syntax == "css" || e.amlEditor.syntax == "svg" || (line && line.indexOf("<a:skin") > -1)))
                return;
            //do not show anything when a selection is made...
            var range = editor.selection.getRange();
            if (range.start.row !== range.end.row || range.start.column !== range.end.column)
                return;

            line = doc.getLine(pos.row);
            var colors = detectColors(pos, line);
            if (colors[1])
                _self.toggleColorPicker(pos, editor, line, colors[1]);
            else if (_self.menu && _self.menu.visible)
                _self.menu.hide();
        });

        ide.addEventListener("codetools.codedblclick", function(e) {
            _self.hideColorTooltips(e.editor);
        });

        // hide all markers and the colorpicker upon tab-/ editorswitch
        ide.addEventListener("beforeeditorswitch", function() {
            if (_self.menu && _self.menu.visible)
                _self.menu.hide();
            else
                _self.hideColorTooltips();
        });
    },

    /**
     * Show a marker/ tooltip on top of the code that is a color of the format
     * we recognize.
     * 
     * @param {Range} pos
     * @param {Editor} editor
     * @param {String} line
     * @param {Array} colors
     * @param {String} markerId
     * @type {void}
     */
    showColorTooltip: function(pos, editor, line, colors, markerId) {
        if (this.menu && this.menu.visible && !markerId)
            return;

        var markers = [];
        colors.forEach(function(color) {
            var id = markerId || color + (pos.row + "") + pos.column;
            var marker = Colors[id];
            // the tooltip DOM node is stored in the third element of the selection array
            if (!marker) {
                var range = createColorRange(pos.row, pos.column, line, color);
                if (!range)
                    return;
                marker = editor.session.addMarker(range, "codetools_colorpicker", function(stringBuilder, range, left, top, viewport) {
                    stringBuilder.push(
                        "<span class='codetools_colorpicker' style='",
                        "left:", left - 3, "px;",
                        "top:", top - 1, "px;",
                        "height:", viewport.lineHeight, "px;",
                        "' onclick='require(\'ext/codetools/codetools\').toggleColorPicker({row:",
                        pos.row, ",column:", pos.column, ",color:\'", color, "\'});'", (markerId ? " id='" + markerId + "'" : ""), ">", color, "</span>"
                    );
                }, true);
                Colors[id] = [range, marker, editor.session];
            }
            markers.push(marker);
        });

        this.hideColorTooltips(editor, markers);
    },

    /**
     * Hide all markers/ tooltips that are currently visible. Exceptions can be
     * provided via the [exceptions] argument.
     * 
     * @param {Editor} editor
     * @param {Array} exceptions
     * @type {void}
     */
    hideColorTooltips: function(editor, exceptions) {
        if (this.$activeColor)
            return;
        if (!exceptions && this.menu && this.menu.visible)
            this.menu.hide();
        if (exceptions && !apf.isArray(exceptions))
            exceptions = [exceptions];
        var marker, session;
        for (var mid in Colors) {
            marker = Colors[mid][1];
            session = editor ? editor.session : Colors[mid][2];
            if (exceptions && exceptions.indexOf(marker) > -1)
                continue;
            session.removeMarker(marker);
            delete Colors[mid];
        }
    },

    /**
     * Show or hide the colorpicker, depending on its current state (visible or not).
     * 
     * @param {Range} pos
     * @param {Editor} editor
     * @param {String} line
     * @param {String} color
     * @type {void}
     */
    toggleColorPicker: function(pos, editor, line, color) {
        ext.initExtension(this);
        var menu = this.menu;
        var cp = this.colorpicker;

        var type = "hex";
        var orig = color;// = color.replace("#", "");
        if (typeof namedColors[color] != "undefined")
            color = apf.color.fixHex(namedColors[color].toString(16));
        var rgb = color.match(RGBRe);
        if (rgb && rgb.length >= 3) {
            rgb = {
                r: rgb[1], 
                g: rgb[2], 
                b: rgb[3]
            };
            color = apf.color.RGBToHex(rgb);
            type = "rgb";
        }
        else
            color = "#" + apf.color.fixHex(color.replace("#", ""), true);

        if (menu.visible && color == this.$activeColor.color && pos.row == this.$activeColor.row)
            return menu.hide();

        // set appropriate event listeners, that will be removed when the colorpicker
        // hides.
        var onKeyDown, onScroll, onCursorChange, onSelectionChange;
        var _self = this;
        apf.addEventListener("keydown", onKeyDown = function(e) {
            var a = _self.$activeColor;

            if (!cp || !a || !cp.visible) 
                return;

            // when ESC is pressed, undo all changes made by the colorpicker
            if (e.keyCode === 27) {
                menu.hide();
                clearTimeout(_self.$colorPickTimer);
                var at = editor.session.$undoManager;
                if (at.undolength > a.start)
                    at.undo(at.undolength - a.start);
            }
        });

        ide.addEventListener("codetools.cursorchange", onCursorChange = function(e) {
            var a = _self.$activeColor;

            if (!cp || !a || !cp.visible) 
                return;

            var pos = e.pos;
            var range = a.marker[0];
            if (pos.row < range.start.row || pos.row > range.end.row 
              || pos.column < range.start.column || pos.column > range.end.column)
                menu.hide();
        });

        editor.addEventListener("mousewheel", onScroll = function(e) {
            var a = _self.$activeColor;

            if (!cp || !a || !cp.visible) 
                return;

            menu.hide();
        });

        var id = "colorpicker" + color + pos.row;
        delete this.$activeColor;
        this.hideColorTooltips(editor);
        this.showColorTooltip(pos, editor, line, [orig], id);
        menu.show();
        cp.$input.focus();
        this.$activeColor = {
            color: color,
            markerNode: id,
            orig: orig,
            line: line,
            current: orig,
            type: type,
            pos: pos,
            marker: Colors[id],
            editor: editor,
            ignore: cp.value != color ? 2 : 1,
            start: editor.session.$undoManager.undolength,
            listeners: {
                onKeyDown: onKeyDown,
                onScroll: onScroll,
                onCursorChange: onCursorChange,
                onSelectionChange: onSelectionChange
            }
        };
        if (type == "rgb") {
            cp.setProperty("red", rgb.r);
            cp.setProperty("green", rgb.g);
            cp.setProperty("blue", rgb.b);
        }
        else
            cp.setProperty("value", color);

        this.updateColorTools(editor);

        this.resize();
    },

    /**
     * Scans the document for colors and generates the list as shown below the 
     * color picker for quick access to colors that are already in use.
     * 
     * @param {Editor} editor
     * @type {void}
     */
    updateColorTools: function(editor) {
        var lines = editor.session.getLines(0, 2000);
        var m;
        var colors = [];
        for (var i = 0, l = lines.length; i < l; ++i) {
            if (!(m = lines[i].match(colorsRe)))
                continue;
            colors = colors.concat(m);
        }

        var out = [];
        var color;
        for (i = 0, l = Math.min(colors.length, 11); i < l; ++i) {
            color = colors[i];
            var rgb = color.match(RGBRe);
            if (rgb && rgb.length >= 3) {
                rgb = {
                    r: rgb[1], 
                    g: rgb[2], 
                    b: rgb[3]
                };
                color = apf.color.RGBToHex(rgb);
            }
            else
                color = apf.color.fixHex(color.replace("#", ""));
            out.push('<span class="color" style="background-color: #', color, 
                '" data-color="', color, '">&nbsp;</span>');
        }
        this.colortools.innerHTML = "<span>Existing file colors:</span>" + out.join("");
    },

    /**
     * When a color is picked in the colorpicker, this function is called. It 
     * updates the color value inside the ACE document with the newly picked color.
     * Since the value change of the color picker is realtime and generates A LOT 
     * of calls to this function, we filter the calls and only apply the change
     * when no color was picked for 200ms.
     * 
     * @param {String} old
     * @param {String} color
     * @type {void}
     */
    onColorPicked: function(old, color) {
        var a = this.$activeColor;
        if (!a)
            return;
        if (a.ignore) {
            --a.ignore;
            return;
        }

        clearTimeout(this.$colorPickTimer);

        var doc = a.editor.session.doc;
        var line = doc.getLine(a.pos.row);
        if (typeof a.markerNode == "string") {
            var node = document.getElementById(a.markerNode);
            if (node)
                a.markerNode = node;
            else
                return;
        }
        var newLine, newColor;
        if (a.type == "hex") {
            newColor = "#" + color;
        }
        else if (a.type == "rgb") {
            var m = a.current.match(RGBRe);
            var regex = new RegExp("(rgba?)\\(\\s*" + m[1] + "\\s*,\\s*" + m[2] 
                + "\\s*,\\s*" + m[3] + "(\\s*,\\s*(?:1|0|0?\\.[0-9]{1,2})\\s*)?\\)", "i");
            if (!line.match(regex))
                return;
            var RGB = apf.color.hexToRGB(color);
            newLine = line.replace(regex, function(m, prefix, suffix) {
                return (newColor = prefix + "(" + RGB.r + ", " + RGB.g + ", " + RGB.b + (suffix || "") + ")");
            });
        }
        a.color = color;

        a.markerNode.innerHTML = newColor;

        this.$colorPickTimer = setTimeout(function() {
            var range = createColorRange(a.pos.row, a.pos.column, line, a.current);
            if (!range)
                return;
            a.marker[0] = range;
            doc.replace(range, newColor);
            a.current = newColor;
        }, 200);
    },

    /**
     * When the browser window is resized and the colorpicker menu is opened, the
     * position of the colorpicker has to be adjusted to the correct value.
     * This function also takes window edges and menu arrow positioning into 
     * account.
     * 
     * @param {Object} color
     * @type {void}
     */
    resize: function(color) {
        if (!this.menu.visible)
            return;

        color = color || this.$activeColor;
        var pos = color.pos;
        var orig = color.orig;
        var line = color.line;
        var renderer = Editors.currentEditor.amlEditor.$editor.renderer;
        var cp = this.colorpicker;
        var menu = this.menu;

        //default to arrow on the left side:
        menu.setProperty("class", "left");

        // calculate the x and y (top and left) position of the colorpicker
        var coordsStart = renderer.textToScreenCoordinates(pos.row, line.indexOf(orig) - 1);
        var coordsEnd = renderer.textToScreenCoordinates(pos.row, line.indexOf(orig) + orig.length);
        var origX, origY;
        var y = origY = coordsEnd.pageY - 24;
        var x = origX = coordsEnd.pageX + 30;
        var pOverflow = apf.getOverflowParent(cp.$ext);
        // we take a margin of 20px on each side of the window:
        var height = menu.$ext.offsetHeight + 10;
        var width = menu.$ext.offsetWidth + 10;

        var edgeY = (pOverflow == document.documentElement
            ? (apf.isIE 
                ? pOverflow.offsetHeight 
                : (window.innerHeight + window.pageYOffset)) + pOverflow.scrollTop
            : pOverflow.offsetHeight + pOverflow.scrollTop);
        var edgeX = (pOverflow == document.documentElement
            ? (apf.isIE 
                ? pOverflow.offsetWidth
                : (window.innerWidth + window.pageXOffset)) + pOverflow.scrollLeft
            : pOverflow.offsetWidth + pOverflow.scrollLeft);

        if (y + height > edgeY) {
            y = edgeY - height;
            if (y < 0)
                y = 10;
        }
        if (x + width > edgeX) {
            x = edgeX - width;
            // check if the menu will be positioned on top of the text
            if (coordsEnd.pageX > x && coordsEnd.pageX < x + width) {
                // take 20px for the arrow...
                x = coordsStart.pageX - width - 20;
                menu.setProperty("class", "right");
            }
            if (x < 10) {
                menu.setProperty("class", "noarrow");
                if (coordsStart.pageY > height)
                    y = coordsStart.pageY - height + 10;
                else
                    y = coordsStart.pageY + 40;

                x = 10;
            }
        }

        // position the arrow
        if (!origArrowTop)
            origArrowTop = parseInt(apf.getStyle(this.arrow, "top"), 10);
        if (y != origY)
            this.arrow.style.top = (origArrowTop + (origY - y)) + "px"
        else
            this.arrow.style.top = origArrowTop + "px";

        menu.$ext.style.zIndex = 10002;
        menu.$ext.style.top = y + "px";
        menu.$ext.style.left = x + "px";
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
        // hiding the menu also detaches all event listeners.
        if (this.menu.visible)
            this.menu.hide();

        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
    }
});

});
