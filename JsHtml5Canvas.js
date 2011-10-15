/*
JsStella, a javascript/HTML5 Atari 2600 emulator, based on JStella.

Copyright (C) 2011 Daniel Presser (daniel dot presser at gmail dot com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function JsHtml5Canvas(aCanvas) {
    var that = this;
    var context = aCanvas.getContext("2d");

    that.console = null;

    /**
    * This is called by the core emulator classes to tell the GUI to paint 
    * an image (the back buffer) to the screen.
    * @param aImage the back buffer to paint
    * @param aOriginalWidth the width of the original (unscaled) image to paint
    * @param aOriginalHeight the height of the original (unscaled) image to paint
    * @param aOriginalClip a clip that indicates what part of the unscaled image has changed, and thus needs to
    * be repainted.
    */
    that.paintCanvas = function (aImage, aOriginalWidth, aOriginalHeight, aOriginalClip) {
        if (aCanvas.width != aImage.getWidth() || aCanvas.height != aImage.getHeight()) {
            aCanvas.width = aImage.getWidth();
            aCanvas.height = aImage.getHeight();
        }

        context.putImageData(aImage.myImage, 0, 0);
    }

    that.getContext = function () {
        return context;
    }
}

function JsHtml5ConsoleClient(aJsCanvas) {
    /**
    * This is called whenever the core classes want access to the GUI's canvas.
    * The GUI classes are in charge of creating and maintaining an object that
    * implements the IfcCanvas interface.
    * @return the GUI's canvas
    */
    this.getCanvas = function () {
        return aJsCanvas;
    }
}