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

(function () {
    var ConsoleSwitch = new Object();
    ConsoleSwitch.SWITCH_RESET = JsConstants.BIT0;
    ConsoleSwitch.SWITCH_SELECT = JsConstants.BIT1;
    ConsoleSwitch.SWITCH_BW = JsConstants.BIT3;
    ConsoleSwitch.SWITCH_DIFFICULTY_P0 = JsConstants.BIT6;
    ConsoleSwitch.SWITCH_DIFFICULTY_P1 = JsConstants.BIT7;

    var myIndex;
    var myBitMask;
    ConsoleSwitch.init = function (aIndex, aBitMask) {
        myIndex = aIndex;
        myBitMask = aBitMask;
    }

    ConsoleSwitch.getIndex = function () { return myIndex; }
    ConsoleSwitch.getBitMask = function () { return myBitMask; }

    window.ConsoleSwitch = ConsoleSwitch;
})();
