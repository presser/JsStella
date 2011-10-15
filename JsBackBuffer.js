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

function JsBackBuffer(aCanvas) {
    var bb = this;

    bb.myCanvas = aCanvas;
    bb.myImage = null;

    bb.height = 0;
    bb.width = 0;

    bb.getHeight = function () {
        return bb.height;
    }

    bb.getWidth = function () {
        return bb.width;
    }

    bb.resize = function (aHeight, aWidth) {
        bb.myImage = bb.myCanvas.getContext().createImageData(aWidth, aHeight);
        bb.height = aHeight;
        bb.width = aWidth;
    }

    bb.getRGBArray = function (aColumn, aLine) {
        var base = (aLine * bb.width * 4) + (aColumn * 4);
        return [bb.myImage.data[base], bb.myImage.data[base + 1], bb.myImage.data[base + 2]];
    }

    bb.setRGB = function (aColumn, aLine, aValue) {
        var base = (aLine * bb.width * 4) + (aColumn * 4);
        bb.myImage.data[base] = (aValue >> 16) & 0xFF;
        bb.myImage.data[base + 1] = (aValue >> 8) & 0xFF;
        bb.myImage.data[base + 2] = (aValue & 0xFF);
        bb.myImage.data[base + 3] = 0xFF;
    }

    bb.clear = function () {
        for (var i = 0; i < bb.myImage.data.length; bb.myImage.data[i++] = 0);
    }
}