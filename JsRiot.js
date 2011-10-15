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
 * The constructor - creates a new JsRiot chip.
 * @param console The console to which this chip belongs
 */
function JsRiot(myConsole) {
    riot = this;

    var mySystem = null;
    var myRAM = new Array(128);

    // Current value of my Timer
    var myTimer = 0;

    // Log base 2 of the number of cycles in a timer interval
    var myIntervalShift = 0;

    // Indicates the number of cycles when the timer was last set
    var myCyclesWhenTimerSet = 0;

    // Indicates when the timer was read after timer interrupt occured
    var myCyclesWhenInterruptReset = 0;

    // Indicates if a read from timer has taken place after interrupt occured
    var myTimerReadAfterInterrupt = false;

    // Data Direction Register for Port A
    var myDDRA = 0;

    // Data Direction Register for Port B
    var myDDRB = 0;

    riot.name = function () {
        return "6532";
    }

    /**
    * Resets the RIOT chip.
    */
    riot.reset = function () {
        myTimer = 25 + (Math.floor(Math.random() * 75));
        myIntervalShift = 6;
        myCyclesWhenTimerSet = 0;
        myCyclesWhenInterruptReset = 0;
        myTimerReadAfterInterrupt = false;

        // Zero the I/O registers
        myDDRA = 0x00;
        myDDRB = 0x00;
    }

    /**
    * Resets the RIOT chip
    */
    riot.systemCyclesReset = function () {
        // JSSystem cycles are being reset to zero so we need to adjust
        // the cycle count we remembered when the timer was last set
        myCyclesWhenTimerSet -= mySystem.getCycles();
        myCyclesWhenInterruptReset -= mySystem.getCycles();
    }

    riot.install = function (system) {
        // Remember which system I'm installed in
        mySystem = system;

        var shift = JsConstants.PAGE_SHIFT;
        var mask = JsConstants.PAGE_MASK;

        // Make sure the system we're being installed in has a page size that'll work
        //assert((0x1080 & mask) == 0);

        // All accesses are to this device
        // We're installing in a 2600 system
        for (var address = 0; address < 8192; address += (1 << shift)) {
            if ((address & 0x1080) == 0x0080) {
                if ((address & 0x0200) == 0x0000) {
                    var access = new JsPageAccess(riot);
                    access.setDirectPeekMemory(myRAM, address & 0x007f);
                    access.setDirectPokeMemory(myRAM, address & 0x007f);

                    mySystem.setPageAccess((address >> shift), access);
                }
                else {
                    var access = new JsPageAccess(riot);
                    access.setIndirectMode(); //Bases(0,0);//directPeekBase = 0;

                    mySystem.setPageAccess((address >> shift), access);
                }
            }
        }
    }

    /**
    * Returns the hex string equivalent.
    * Because I'm lazy
    */
    riot.toHexStr = function (addr) {
        return "0x" + (addr * 1).toString(16);
    }

    riot.peek = function (addr) {
        var zReturn = 0;

        switch (addr & 0x07) {

            case 0x00:    // Port A I/O Register (Joystick)
                {
                    var value = 0x00;

                    if (myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.DigitalPin.One)) value |= 0x10;
                    if (myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.DigitalPin.Two)) value |= 0x20;
                    if (myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.DigitalPin.Three)) value |= 0x40;
                    if (myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.DigitalPin.Four)) value |= 0x80;
                    if (myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.DigitalPin.One)) value |= 0x01;
                    if (myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.DigitalPin.Two)) value |= 0x02;
                    if (myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.DigitalPin.Three)) value |= 0x04;
                    if (myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.DigitalPin.Four)) value |= 0x08;
                    zReturn = value;
                    break;
                }

            case 0x01:    // Port A Data Direction Register
                {
                    zReturn = myDDRA;
                    break;
                }

            case 0x02:    // Port B I/O Register (JSConsole switches)
                {
                    zReturn = myConsole.readSwitches();
                    break;
                }

            case 0x03:    // Port B Data Direction Register
                {
                    zReturn = myDDRB;
                    break;
                }

            case 0x04:    // Timer Output
            case 0x06:
                {
                    var zCurrentCycle = mySystem.getCycles() - 1;
                    var zCyclesElapsed = zCurrentCycle - myCyclesWhenTimerSet;
                    var zCurrentIntervalCount = Math.floor(myTimer - (zCyclesElapsed >> myIntervalShift) - 1);

                    // See if the zCurrentIntervalCount has expired yet?
                    if (zCurrentIntervalCount >= 0) {
                        zReturn = zCurrentIntervalCount;
                        break;
                    }
                    else {
                        zCurrentIntervalCount = Math.floor((myTimer << myIntervalShift) - zCyclesElapsed - 1);

                        if ((zCurrentIntervalCount <= -2) && !myTimerReadAfterInterrupt) {
                            // Indicate that zCurrentIntervalCount has been read after interrupt occured
                            myTimerReadAfterInterrupt = true;
                            myCyclesWhenInterruptReset = mySystem.getCycles();
                        }

                        if (myTimerReadAfterInterrupt) {
                            var zOffset = myCyclesWhenInterruptReset - (myCyclesWhenTimerSet + (myTimer << myIntervalShift));

                            zCurrentIntervalCount = myTimer - (zCyclesElapsed >> myIntervalShift) - zOffset;
                        }

                        zReturn = zCurrentIntervalCount & 0xff;
                        break;
                    }
                }

            case 0x05:    // Interrupt Flag
            case 0x07:
                {
                    var cycles = mySystem.getCycles() - 1;
                    var delta = cycles - myCyclesWhenTimerSet;
                    var timer = Math.floor(myTimer - (delta >> myIntervalShift) - 1);

                    if ((timer >= 0) || myTimerReadAfterInterrupt)
                        zReturn = 0x00;
                    else zReturn = 0x80;
                    break;
                }

            default:
                {
                    zReturn = 0;
                    break;
                }
        }

        return zReturn;
    }

    function bool(aValue) {
        return ((aValue * 1) != 0);
    }

    riot.poke = function (addr, value) {
        if ((addr & 0x07) == 0x00)         // Port A I/O Register (Joystick)
        {
            var a = value & myDDRA;

            myConsole.getController(JsConstants.Jack.LEFT).write(JsConstants.DigitalPin.One, bool(a & 0x10));
            myConsole.getController(JsConstants.Jack.LEFT).write(JsConstants.DigitalPin.Two, bool(a & 0x20));
            myConsole.getController(JsConstants.Jack.LEFT).write(JsConstants.DigitalPin.Three, bool(a & 0x40));
            myConsole.getController(JsConstants.Jack.LEFT).write(JsConstants.DigitalPin.Four, bool(a & 0x80));

            myConsole.getController(JsConstants.Jack.RIGHT).write(JsConstants.DigitalPin.One, bool(a & 0x01));
            myConsole.getController(JsConstants.Jack.RIGHT).write(JsConstants.DigitalPin.Two, bool(a & 0x02));
            myConsole.getController(JsConstants.Jack.RIGHT).write(JsConstants.DigitalPin.Three, bool(a & 0x04));
            myConsole.getController(JsConstants.Jack.RIGHT).write(JsConstants.DigitalPin.Four, bool(a & 0x08));
        }
        else if ((addr & 0x07) == 0x01)    // Port A Data Direction Register
        {
            myDDRA = value;
        }
        else if ((addr & 0x07) == 0x02)    // Port B I/O Register (JSConsole switches)
        {
            return;
        }
        else if ((addr & 0x07) == 0x03)    // Port B Data Direction Register
        {
            //        myDDRB = value;
            return;
        }
        else if ((addr & 0x17) == 0x14)    // TIM1T - Write timer divide by 1
        {
            myTimer = value;
            myIntervalShift = 0;
            myCyclesWhenTimerSet = mySystem.getCycles();
            myTimerReadAfterInterrupt = false;
        }
        else if ((addr & 0x17) == 0x15)    // TIM8T - Write timer divide by 8
        {
            myTimer = value;
            myIntervalShift = 3;
            myCyclesWhenTimerSet = mySystem.getCycles();
            myTimerReadAfterInterrupt = false;
        }
        else if ((addr & 0x17) == 0x16)    // TIM64T - Write timer divide by 64
        {
            myTimer = value;
            myIntervalShift = 6;
            myCyclesWhenTimerSet = mySystem.getCycles();
            myTimerReadAfterInterrupt = false;
        }
        else if ((addr & 0x17) == 0x17)    // TIM1024T - Write timer divide by 1024
        {
            myTimer = value;
            myIntervalShift = 10;
            myCyclesWhenTimerSet = mySystem.getCycles();
            myTimerReadAfterInterrupt = false;
        }
        else if ((addr & 0x14) == 0x04)    // Write Edge Detect Control
        {
            //wut   
        }
        else {
            //wut II
        }
    }

    // Randomize the 128 bytes of memory - just like it would be in real life
    for (var i = 0; i < myRAM.length; i++) {
        myRAM[i] = Math.floor(Math.random() * 255);
    }

    // Initialize other data members
    riot.reset();
}

