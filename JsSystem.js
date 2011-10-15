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
 * This class is the intermediary between the CPU (J6507) and the rest of the
 * emulator - it is the "CPU's secretary".  Unlike the J6507 class, this class is specifically tailored for
 * the JStella system.
 * <p> 
 * This class implements the IfcSystem interface in the J6507 package, which enables
 * a J6507 object (the CPU) to interact with it.  Each instruction cycle goes roughly like
 * this: <br>
 * The CPU, when it is executed, will ask the JSSystem object for the next instruction.  The
 * JSSystem will forward that request to the ROM (game).  So the ROM returns the instruction,
 * and based on what that instruction was, the CPU may do various things...if that instruction
 * was to change the sound a note, the CPU sends the JSSystem a poke() (a write command)...
 * the JSSystem matches the given address up and sees that the TIA is the intended target, and thus
 * forwards it to that object.  Or if the instruction was to see if the joystick is pointing left,
 * the CPU sends a peek() (a read command) to the JSSystem, which forwards that peek to the RIOT
 * object.
 *     
 * </p>
 * <p>
 *     The JSSystem knows which object to forward a peek/poke to by looking at the address.
 *     Each possible recipient ("device") has previously specified ranges of addresses which it looks
 *     at ("maps to"), and the JSSystem object keeps a list of what device covers what address. (See
 *     the IfcDevice interface.)  If you are curious about what device maps to what range of addresses,
 *     consult the Internet for a memory map for the Atari 2600.
 * </p>
 * @author Bradford W. Mott and the Stella team (original)
 * J.L. Allen (Java translation)
 */
function JsSystem(myConsole) {
    var sys = this;

    /**
    * The log(base2) of the size of the memory (addressable space).
    * In other words, 2 to the power of LOG_MEMSIZE equals the size of the addressable
    * space, in bytes.
    */
    function pageOffset(aAddress) {
        return ((aAddress & JsConstants.PAGE_MASK) & 255);
    }

    var myPageAccessTable = new Array(JsConstants.PAGE_COUNT);

    var myDeviceList = new Array();
    var myNumberOfDevices = 0;
    var myCPU = null;
    var myConsole = null;

    var myCycles = 0;
    var myNullDevice = new JsNullDevice();
    var myDataBusState = 0;
    var myDataBusLocked = false;

    /**
    * Creates a new JSSystem object.  This will automatically create a J6507 (CPU) object.
    * The other JStella classes should not concern themselves with interacting directly with 
    * the CPU, but instead should act through this class, the CPU's secretary.
    * @param aConsole The 2600 console that this JSSystem belongs to
    */
    function init() {
        //assert((1 <= LOG_PAGESIZE) && (LOG_PAGESIZE <= LOG_MEMSIZE) && (LOG_MEMSIZE <= 16));  // Make sure the settings are reasonable
        sys.clearPageAccesses();   // Installs null devices for every page
        myDataBusLocked = false;  // Bus starts out unlocked (in other words, peek() changes myDataBusState)

        var cpu = new Js6507(sys);
        sys.attachCPU(cpu);
        sys.attach(cpu); //creates the CPU and installs it
    }

    /**
    * This method is called by the CPU to tell the system that a specified number of cycles have
    * elapsed. See the documentation under the IfcSystem class.
    * @param aCyclesElapsed the number of processor cycles that have elapsed
    */
    sys.processorCycle = function (aCyclesElapsed) {
        sys.incrementCycles(aCyclesElapsed);
    }

    /**
    * Returns the number of processor cycles that have elapsed since the last reset.
    * Don't confuse processor cycles with "instruction cycles"...a given instruction will
    * last multiple processor cycles.
    * @return the number of processor cycles that have elapsed
    */
    sys.getCycles = function () {
        return myCycles;
    }

    /**
    * This does the same exact thing as processorCycle().<br>
    * (I'm can't remember why there are two different methods... JLA Sep 7 2007)
    * @param amount The number of cycles to add to the growing count
    */
    sys.incrementCycles = function (amount) {
        if (amount > 100) {
            var temp = amount;
        }

        myCycles += amount;
    }

    /**
    * (Sep 7 2007 - JLA: I don't know what this does...originally from Stella code)
    * @return ?
    */
    sys.getDataBusState = function () {
        return myDataBusState;
    }

    /**
    * Halts the CPU.  When the TIA encounters the signal that tells it a visual frame 
    * is complete, it will call this method, and the CPU will not execute any more 
    * instructions until it is instructed to do so again.
    */
    sys.stopCPU = function () {
        sys.getCPU().stop();
    }

    /**
    * Returns the CPU object (although it's probably better for objects to go
    * through the JSSystem--the secretary--than go directly to the CPU, just for
    * encapsulation's sake, not for performance reasons.
    * @return the CPU object
    */
    sys.getCPU = function () {
        return myCPU;
    }

    sys.getNullDevice = function () {
        return myNullDevice;
    }

    /**
    * This erases all the the PageAccess objects from the list...it essentially
    * clears all the "claims" that devices have on ranges of memory
    */
    sys.clearPageAccesses = function () {
        // Initialize page access table
        var access = new JsPageAccess(myNullDevice);
        for (var page = 0; page < JsConstants.PAGE_COUNT; page++) {
            myPageAccessTable[page] = new JsPageAccess(myNullDevice);
            sys.setPageAccess(page, access);
        }
    }

    /**
    * This will cause the CPU to execute instructions, up to the number supplied.  If the 
    * CPU signals another device which, in turn, stops the CPU, this method will exit before
    * the specified number of instructions have been executed.
    * @param aInstructionCount the (maximum) number of instructions that will be executed
    * @throws jstella.core.JSException if an instruction is not recognized
    * @return the number of CPU instructions executed
    */
    sys.executeCPU = function (aInstructionCount) {
        var zReturn = 0;
        zReturn = myCPU.execute(aInstructionCount);
        return zReturn;
    }

    /**
    * Resets the CPU, and then resets all of the devices currently installed
    * in this JSSystem object.
    */
    sys.reset = function () {
        sys.resetCycles();  // Reset system cycle counter
        for (var i = 0; i < myDeviceList.length; i++)
            myDeviceList[i].reset();
        if (myCPU != null) myCPU.reset();  // Now we reset the processor if it exists    
    }

    /**
    * This will do two things:<br>
    * 1. It will add the device to a list of devices that it maintains
    * 2. It will tell the device to "install" itself...that is, to register a claim
    * over certain addresses by calling the setPageAccess(...) method.
    * @param aDevice the device which should be installed
    */
    sys.attach = function (aDevice) {
        if (myDeviceList.contains(aDevice) == false)
            myDeviceList.push(aDevice);   // Add device to my collection of devices

        aDevice.install(sys); // Ask the device to install itself
    }

    /**
    * This does the opposite of attach(...)
    * @param aDevice device to uninstall
    */
    sys.unattach = function (aDevice) {
        //PART 1 : remove the device from the device list
        var temp = 0;
        while (temp < myDeviceList.length) {
            if (myDeviceList[temp] == aDevice)
                myDeviceList.splice(temp, 1);
            else
                temp++;
        }

        //PART 2 : replace the page accesses of the device with those of the null device
        var zPA = new JsPageAccess(sys.getNullDevice());
        for (var i = 0; i < myPageAccessTable.length; i++) {
            if (aDevice == myPageAccessTable[i].getDevice()) {
                sys.setPageAccess(i, zPA);
            }
        }
    }

    /**
    * This sets the CPU object that the system will use.  There should be no reason
    * for outside classes to call this method... (but it will remain public for the time
    * being).
    * @param a6507 the CPU
    */
    sys.attachCPU = function (a6507) {
        myCPU = a6507;  // Remember the processor
        myCPU.install(sys);   // Ask the processor to install itself
    }

    /**
    * This resets the cycle count that the JSSystem object maintains...it is generally 
    * called by the TIA at the start of a new visual frame.
    */
    sys.resetCycles = function () {
        for (var i = 0; i < myDeviceList.length; i++)
            myDeviceList[i].systemCyclesReset(); // First we let all of the device attached to me know about the reset

        // if (myCycles!=JSTIA.CPU_CYCLES_PER_FRAME) System.out.println("JSSystem warning: resetting cycles at " + myCycles);
        myCycles = 0;  // Now, we reset cycle count to zero
    }

    /**
    * Assigns the PageAccess to the given page. <br>
    * <p>
    *     PageAccess objects are used to register what device has claimed a given chunk ("page") of
    *     memory.  Each chunck is 64 bytes of memory.   
    * </p>
    * Rather than use the PaceAccess object
    * passed as an argument, it only makes a copy of the data.  Therefore, later changes
    * to the object that is passed as an argument will not be reflected in the PageAccess
    * that is stored in this JSSystem class.
    * @param page Page number to associate this PageAccess information with
    * @param access a PageAccess class containing the information that will be copied to the
    * PageAccess object at the specified page number
    */
    sys.setPageAccess = function (page, access) {
        myPageAccessTable[page].copyDataFrom(access);
    }

    /**
    * Retrieves the PageAccess for a given page.
    * @param page the page number
    * @return the corresponding PageAccess
    */
    sys.getPageAccess = function (page) {
        return myPageAccessTable[page];
    }

    sys.peek = function (addr) {
        //assert(addr>=0);
        var result = 0;
        result = pageAccessAtAddress(addr).peek(addr);

        myDataBusState = result;
        return result;
    }

    /**
    * This is called by the CPU to write to an address.  The system is responsible for
    * routing this request to the appropriate device.
    * @param addr the address to poke
    * @param aByteValue the byte to associate with that address
    */
    sys.poke = function (addr, aByteValue) {
        //assert((aByteValue>=0)&&(aByteValue<0x100));

        pageAccessAtAddress(addr).poke(addr, aByteValue);
        myDataBusState = aByteValue;
    }

    function pageAccessAtAddress(aAddress) {
        return myPageAccessTable[(aAddress & JsConstants.ADDRESS_MASK) >>> JsConstants.PAGE_SHIFT];
    }

    /**
    * This is called by the CPU to determine what address it should start with after
    * the CPU has been reset.
    * @return the address that the CPU should start with
    */
    sys.getResetPC = function () {

        var zReturn = ((sys.peek(0xfffc)) | (sys.peek(0xfffd) << 8));
        //  dbg.out("getResetPC()", zReturn);
        return zReturn;
    }

    init();
}