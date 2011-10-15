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

/**
 * A class used by JSSystem that acts as an agent for each device, representing
 * its device at a given memory segment.  The JSSystem determines, based on the address
 * of a peek/poke, what PageAccess to use.  It then forwards this peek/poke to the 
 * PageAccess.  If the PageAccess uses the standard "indirect" mode, it simply
 * forwards the peek/poke to its client (the device).  If the client (device) had
 * previously set up this page access with an array, the page access can just interact
 * with this surrogate array instead of bothering the device.  This is called the direct
 * mode, and it can be used for peek, poke, or both.
 */
function JsPageAccess(aDevice) {
    var pg = this;

    pg.device = null;
    pg.directPeekBaseIndex = 0;
    pg.directPokeBaseIndex = 0;
    pg.directPeekMemory = new Array();
    pg.directPokeMemory = new Array();

    function init() {
        pg.myDevice = aDevice;
    }

    pg.copyDataFrom = function (pa) {
        pg.device = pa.myDevice;

        pg.directPeekMemory = pa.directPeekMemory;
        pg.directPokeMemory = pa.directPokeMemory;
        pg.directPeekBaseIndex = pa.directPeekBaseIndex;
        pg.directPokeBaseIndex = pa.directPokeBaseIndex;
    }

    pg.usesDirectPeek = function () {
        return (pg.directPeekMemory != null);
    }

    pg.usesDirectPoke = function () {
        return (pg.directPokeMemory != null);
    }

    pg.directPoke = function (off, val) {
        pg.directPokeMemory[pg.directPokeBaseIndex + off] = val;
    }

    pg.directPeek = function (off) {
        var zReturn = 0;
        zReturn = directPeekMemory[pg.directPeekBaseIndex + off];
        return zReturn;
    }

    pg.setDevice = function (dev) {
        pg.device = dev;
    }

    pg.getDevice = function () {
        return pg.myDevice;
    }

    pg.pagePoke = function (addr, val) {
        pg.directPoke(addr, val);
    }

    pg.pagePeek = function (addr) {
        return pg.directPeek(addr);
    }

    pg.peek = function (addr) {
        if (pg.usesDirectPeek() == true)
            return pg.directPeek((addr & JsConstants.PAGE_MASK));
        else
            return pg.getDevice().peek(addr);
    }

    pg.poke = function (addr, val) {
        if (pg.usesDirectPoke() == true)
            pg.directPoke((addr & JsConstants.PAGE_MASK), val);
        else
            pg.getDevice().poke(addr, val);
    }

    /**
    * Turns both directPeek mode and directPoke mode off.
    */
    pg.setIndirectMode = function () {
        pg.setDirectPeekMemory(null, 0);
        pg.setDirectPokeMemory(null, 0);
    }

    pg.getDirectPeekMemory = function () {
        return pg.directPeekMemory;
    }

    /**
    * Sets the array associated with direct-peek mode, thus turning the mode on.
    * @param aDirectPeekMemory the array to route peek requests to
    * @param aDirectPeekBaseIndex the base index that the given address (converted to page offset) will be added to
    */
    pg.setDirectPeekMemory = function (aDirectPeekMemory, aDirectPeekBaseIndex) {
        pg.directPeekMemory = aDirectPeekMemory;
        pg.directPeekBaseIndex = aDirectPeekBaseIndex;
    }

    pg.setDirectPokeMemory = function (aDirectPokeMemory, aDirectPokeBaseIndex) {
        pg.directPokeMemory = aDirectPokeMemory;
        pg.directPokeBaseIndex = aDirectPokeBaseIndex;
    }

    pg.getDirectPokeMemory = function () {
        return pg.directPokeMemory;
    }

    init();
}

(function () {
    JsPageAccessHelper = new Object();

    JsPageAccessHelper.createDirectPeekAccess = function (aDevice, aDirectPeekMemory, aDirectPeekBaseIndex) {
        var zReturn = new JsPageAccess(aDevice);
        zReturn.setDirectPeekMemory(aDirectPeekMemory, aDirectPeekBaseIndex);
        return zReturn;
    }

    JsPageAccessHelper.createDirectPokeAccess = function (aDevice, aDirectPokeMemory, aDirectPokeBaseIndex) {
        var zReturn = new JsPageAccess(aDevice);
        zReturn.setDirectPokeMemory(aDirectPokeMemory, aDirectPokeBaseIndex);
        return zReturn;
    }

    JsPageAccessHelper.createIndirectAccess = function (aDevice) {
        var zReturn = new JsPageAccess(aDevice);
        zReturn.setIndirectMode();
        return zReturn;
    }

    window.JsPageAccessHelper = JsPageAccessHelper;
})();