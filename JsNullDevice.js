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
 * Class that represents a "null" device.  The basic idea is that a
 * null device is installed in a 6502 based system anywhere there are
 * holes in the address space (i.e. no real device attached).
 *
 * @author  Bradford W. Mott
 * @version $Id: NullDevice.java,v 1.3 2007/08/18 09:10:37 mauvila Exp $
 */
function JsNullDevice() {
    this.name = function () {
        return "NULL";
    }

    this.reset = function () {
    }

    this.install = function (system) {
    }

    this.peek = function (address) {
    }

    this.poke = function (address, aByteValue) {
    }

    this.systemCyclesReset = function () {
    }
}
