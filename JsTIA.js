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
 * This class is a device that emulates the Television Interface Adapator
 * found in the Atari 2600 and 7800 consoles.  The Television Interface
 * Adapator is an integrated circuit designed to interface between an
 * eight bit microprocessor and a television video modulator. It converts
 * eight bit parallel data into serial outputs for the color, luminosity,
 * and composite sync required by a video modulator.
 * 
 * This class outputs the serial data into a frame buffer which can then
 * be displayed on screen.
 * 
 * <p>
 * Consult the "Stella Programmer's Guide" (Steve Wright, 1979) for more information.
 * This guide was written back in the 1970s and was used originally by people who programmed
 * games for the Atari 2600.  It is widely available on the Internet.
 * 
 * Some definitions:
 * <dl>
 *  <dt>TIA</dt>
 *  <dd>a.k.a. Stella chip.The television interface
 * adapter, a chip found in the Atari 2600 that converted pokes from the
 * CPU into pictures and sound. It also managed the analog part
 * of the paddle controllers. </dd>
 * </dl>
 * <dl>
 *  <dt>color clock</dt>
 *  <dd>This can be thought of as a pixel, or
 * alternatively, as a unit of time (in which one pixel is drawn).
 * For every CPU cycle, there are three color clocks (often
 * abbreviated simply as "clocks") drawn. The width of the
 * visible part of a frame is 160 color clocks.</dd>
 * </dl>
 * @author Bradford W. Mott
 * @version $Id: JSTIA.java,v 1.12 2007/09/12 00:55:32 mauvila Exp $
 */
function JsTIA(myConsole) {
    var tia = this;

    //TODO : Maybe get rid of the old offset (0-3) system, as currently used in these masks
    //TODO : Get rid of disabled missile mask table...
    var COSMICBUG_MOVEMENT = [18, 33, 0, 17];

    var M0Disabled = false;
    var M1Disabled = false;

    var myCurrentM0Mask = new Array(4);
    var myCurrentM1Mask = new Array(4);
    var myCurrentP0Mask = new Array(4);
    var myCurrentP1Mask = new Array(4);
    var myCurrentBLMask = new Array(3);

    var myTIAPokeRegister = new Array(JsConstants.TIA_POKE_REGISTER_COUNT);

    var mySystem = null;

    var myColorLossEnabled;  //No clue what this means, except it has something to do with PAL (-JLA)
    var myPartialFrameFlag = false;
    // var myFrameCounter=0;   // Number of frames displayed by this TIA
    var myFramePointer = 0;  // Index to the next pixel that will be drawn in the current frame buffer
    var myFrameXStart = 0;  // Indicates where the scanline should start being displayed

    var myClockWhenFrameStarted = 0;
    var myClockStartDisplay = 0; // Indicates color clocks when frame should begin to be drawn
    var myClockStopDisplay = 0;
    var myClockAtLastUpdate = 0;
    var myClocksToEndOfScanLine = 0;
    var myScanlineCountForLastFrame = 0;
    var myCurrentScanline = 0;  // Indicates the current scanline during a partial frame.
    var myMaximumNumberOfScanlines = 0;
    var myVSYNCFinishClock = 0;  // Color clock when JsConstants.VSYNC ending causes a new frame to be started

    var myEnabledObjects = 0;

    var myPlayfieldPriorityAndScore = 0;

    var myVBlankOff = 0;
    var myVBlankOn = 0;
    var myVSyncOn = 0;
    var myDetectedYStart = 0;
    var myDetectedYStop = 0;

    // ---------- TIA register variables -----------

    var myDGRP0 = 0;        // Player 0 delayed graphics register
    var myDGRP1 = 0;        // Player 1 delayed graphics register

    var myDENABL;        // Indicates if the vertically delayed ball is enabled

    var myCollision = 0;    // Collision register

    var myPOSP0 = 0;         // Player 0 position register
    var myPOSP1 = 0;         // Player 1 position register
    var myPOSM0 = 0;         // Missile 0 position register
    var myPOSM1 = 0;         // Missile 1 position register
    var myPOSBL = 0;         // Ball position register

    var myCurrentGRP0 = 0;

    var myCurrentGRP1 = 0;

    // Audio values. Only used by TIADebug.
    /*   var myAUDV0;
    var myAUDV1;
    var myAUDC0;
    var myAUDC1;
    var myAUDF0;
    var myAUDF1;
    */

    //------ Other variables --------

    var myDumpDisabledCycle = 0;  // Indicates when the dump for paddles was last set
    var myDumpEnabled = false; // Indicates if the dump is current enabled for the paddles

    var myLastHMOVEClock = 0;  // Color clock when last JsConstants.HMOVE occured
    var myHMOVEBlankEnabled = false; // Indicates if JsConstants.HMOVE blanks are currently enabled 
    var myAllowHMOVEBlanks = false; // Indicates if we're allowing JsConstants.HMOVE blanks to be enabled (?-JLA)
    var myM0CosmicArkMotionEnabled = true; // TIA M0 "bug" used for stars in Cosmic Ark flag
    var myM0CosmicArkCounter = 0;
    // private boolean[] myBitEnabled=new boolean[6];

    var debugInstructionsExecuted = 0;
    var debugHasExecutionOverrun = false;

    function init() {
        myColorLossEnabled = false;
        myMaximumNumberOfScanlines = JsConstants.LINES_PER_FRAME_TOTAL; //262 scanlines        
    }


    //========================== SIMPLE ACCESSOR METHODS ===================================
    // Note : some of these may seem superfluous, especially for internal use, but they
    // can come in handy when debugging.  (One can put an assert() in the accessor methods to see
    // exactly what bad data comes in and what goes out, and when these things occur.)
    function getCOLUBK() {
        return myTIAPokeRegister[JsConstants.COLUBK];
    }

    function setCOLUBK(aValue) {
        myTIAPokeRegister[JsConstants.COLUBK] = aValue;
    }

    function getCOLUPF() {
        return myTIAPokeRegister[JsConstants.COLUPF];
    }

    function setCOLUPF(aValue) {
        myTIAPokeRegister[JsConstants.COLUPF] = aValue;
    }

    function getCOLUP0() {
        return myTIAPokeRegister[JsConstants.COLUP0];
    }

    function setCOLUP0(aValue) {
        myTIAPokeRegister[JsConstants.COLUP0] = aValue;
    }

    function getCOLUP1() {
        return myTIAPokeRegister[JsConstants.COLUP1];
    }

    function setCOLUP1(aValue) {
        myTIAPokeRegister[JsConstants.COLUP1] = aValue;
    }


    tia.getCurrentFrameBuffer = function () {
        return myConsole.video.currentFrameBuffer;
    }

    // public int getVBlankOn() { return myVBlankOn; }
    // public int getVBlankOff() { return myVBlankOff; }
    tia.getVSyncOn = function () { return myVSyncOn; }
    tia.getDetectedYStart = function () { return myDetectedYStart; }
    tia.getDetectedYStop = function () { return myDetectedYStop; }

    /**
    * Answers the total number of scanlines the media source generated
    * in producing the current frame buffer. For partial frames, this
    * will be the current scanline.
    * @return total number of scanlines generated
    */
    tia.scanlines = function () {
        return Math.floor(((mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE) - myClockWhenFrameStarted) / JsConstants.CLOCKS_PER_LINE_TOTAL);
    }

    function getConsole() {
        return myConsole;
    }

    //The get and set accessors for the current masks were originally done to ease the change from C++ to Java...
    //i.e. it involved less typing for me. -JLA
    function getCurrentP0Mask(aIndex) {
        return JsConstants.PLAYER_MASK_TABLE[myCurrentP0Mask[0]][myCurrentP0Mask[1]][myCurrentP0Mask[2]][myCurrentP0Mask[3] + aIndex];
    }

    function getCurrentP1Mask(aIndex) {
        return JsConstants.PLAYER_MASK_TABLE[myCurrentP1Mask[0]][myCurrentP1Mask[1]][myCurrentP1Mask[2]][myCurrentP1Mask[3] + aIndex];
    }

    function getCurrentM0Mask(aIndex) {
        if (M0Disabled == true)
            return bool(JsConstants.DISABLED_MASK_TABLE[aIndex]);
        else {
            assert(myCurrentM0Mask[3] + aIndex < 360);
            return JsConstants.MISSILE_MASK_TABLE[myCurrentM0Mask[0]][myCurrentM0Mask[1]][myCurrentM0Mask[2]][myCurrentM0Mask[3] + aIndex];
        }
    }

    function getCurrentM1Mask(aIndex) {
        if (M1Disabled == true)
            return bool(JsConstants.DISABLED_MASK_TABLE[aIndex]);
        else {
            assert(myCurrentM1Mask[3] + aIndex < 360);
            return JsConstants.MISSILE_MASK_TABLE[myCurrentM1Mask[0]][myCurrentM1Mask[1]][myCurrentM1Mask[2]][myCurrentM1Mask[3] + aIndex];
        }
    }

    function setCurrentM1Mask(aA, aB, aC, aD) {
        myCurrentM1Mask[0] = aA;
        myCurrentM1Mask[1] = aB;
        myCurrentM1Mask[2] = aC;
        myCurrentM1Mask[3] = aD;
        M1Disabled = false;
    }

    function setCurrentP0Mask(aA, aB, aC, aD) {
        if (debugLockP0Mask == false) {
            myCurrentP0Mask[0] = aA;
            myCurrentP0Mask[1] = aB;
            myCurrentP0Mask[2] = aC;
            myCurrentP0Mask[3] = aD;
        }
    }

    function setCurrentP1Mask(aA, aB, aC, aD) {
        if (debugLockP1Mask == false) {
            myCurrentP1Mask[0] = aA;
            myCurrentP1Mask[1] = aB;
            myCurrentP1Mask[2] = aC;
            myCurrentP1Mask[3] = aD;
        }
    }

    function setCurrentM0Mask(aA, aB, aC, aD) {
        myCurrentM0Mask[0] = aA;
        myCurrentM0Mask[1] = aB;
        myCurrentM0Mask[2] = aC;
        myCurrentM0Mask[3] = aD;

        //myCurrentM0MaskIndex=getMasterIndexOMMT(aA, aB, aC, aD);
        M0Disabled = false;
    }

    function setCurrentM0MaskDisabled() {
        M0Disabled = true;
    }

    function getCurrentBLMask(aIndex) {
        return JsConstants.BALL_MASK_TABLE[myCurrentBLMask[0]][myCurrentBLMask[1]][myCurrentBLMask[2] + aIndex];
    }

    function setCurrentBLMask(aA, aB, aC) {
        myCurrentBLMask[0] = aA;
        myCurrentBLMask[1] = aB;
        myCurrentBLMask[2] = aC;
    }

    function getYStart() {
        return myConsole.getYStart();
    }

    function getDisplayHeight() {
        return myConsole.getDisplayHeight();
    }


    function isBitOn(aBitNumber, aValue) {
        return ((aValue & (1 << aBitNumber)) != 0);
    }


    function getAudio() { return myConsole.getAudio(); }

    function getCurrentClockCount() {
        var tmp = mySystem.getCycles();
        return tmp * JsConstants.CLOCKS_PER_CPU_CYCLE;
        //return mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE; 
    }

    function getCurrentXPos() {
        var val = ((getCurrentClockCount() - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL);
        return val;
    }

    function getCurrentScanline() {
        var tmp = getCurrentClockCount();
        tmp = tmp - myClockWhenFrameStarted;
        tmp = tmp / JsConstants.CLOCKS_PER_LINE_TOTAL;
        return Math.floor(tmp);
    }

    function getColor(aIndex) {
        switch (aIndex) {
            case 0: return getCOLUBK(); //=myColor[0];
            case 1: return myTIAPokeRegister[JsConstants.COLUPF]; //=myColor[1];
            case 2: return myTIAPokeRegister[JsConstants.COLUP0]; //=myColor[2];
            case 3: return myTIAPokeRegister[JsConstants.COLUP1]; //=myColor[3];
            default: throw "Invalid color index: " + aIndex;

        }
    }

    tia.name = function () {
        return "TIA";
    }

    tia.reset = function () {
        // Reset the sound device
        // dbg.out("RESETTING TIA");
        getAudio().reset(); //The TIA is in charge of the audio, at least as far as system is concerned

        for (var i = 0; i < myTIAPokeRegister.length; i++) {
            myTIAPokeRegister[i] = 0;
        }

        // Currently no objects are enabled
        myEnabledObjects = 0;

        // Some default values for the registers
        myPlayfieldPriorityAndScore = 0;

        //  myPF = 0;
        // myGRP0 = 0;
        // myGRP1 = 0;
        myDGRP0 = 0;
        myDGRP1 = 0;

        myDENABL = false;

        //myRESMP0 = false;
        //myRESMP1 = false;
        myCollision = 0;
        myPOSP0 = 0;
        myPOSP1 = 0;
        myPOSM0 = 0;
        myPOSM1 = 0;
        myPOSBL = 0;

        // Some default values for the "current" variables
        myCurrentGRP0 = 0;
        myCurrentGRP1 = 0;
        setCurrentBLMask(0, 0, 0); // = ourBallMaskTable[0][0];

        setCurrentM0Mask(0, 0, 0, 0);
        setCurrentM1Mask(0, 0, 0, 0);
        setCurrentP0Mask(0, 0, 0, 0); //ourPlayerMaskTable[0][0][0];
        setCurrentP1Mask(0, 0, 0, 0);
        //myCurrentP1Mask = ourPlayerMaskTable[0][0][0];
        //myCurrentPFMask = PLAYFIELD_TABLE[0];

        myLastHMOVEClock = 0;
        myHMOVEBlankEnabled = false;
        myM0CosmicArkMotionEnabled = false;
        myM0CosmicArkCounter = 0;

        myDumpEnabled = false;
        myDumpDisabledCycle = 0;

        myAllowHMOVEBlanks = true;

        if ((myConsole.getDisplayFormat() == DisplayFormat.PAL) || (myConsole.getDisplayFormat() == DisplayFormat.PAL60)) {
            myColorLossEnabled = true;
            myMaximumNumberOfScanlines = 342;
        }
        else  // NTSC
        {
            myColorLossEnabled = false;
            myMaximumNumberOfScanlines = 290;
        }

        myVBlankOff = 0;
        myVBlankOn = 0;
        myVSyncOn = -1;
        myDetectedYStart = 0;
        myDetectedYStop = 0;

        debugHasExecutionOverrun = false;

        // Recalculate the size of the display
        frameReset();
    }

    /**
    * Resets certain variables about the frame.
    * This is called by the TIA's reset method.  It is also called whenever the JSConsole
    * changes a relevant attribute about the frame (e.g. the DisplayHeight).
    */
    function frameReset() {
        myConsole.getVideo().clearBuffers();   // Clear frame buffers

        myFramePointer = 0;    // Reset pixel pointer and drawing flag

        // Calculate color clock offsets for starting and stoping frame drawing
        //myStartDisplayOffset = JsConstants.CLOCKS_PER_LINE_TOTAL * getYStart();
        // myStopDisplayOffset = myStartDisplayOffset + (JsConstants.CLOCKS_PER_LINE_TOTAL * getDisplayHeight());

        // Reasonable values to start and stop the current frame drawing
        myClockWhenFrameStarted = mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE; //now
        myClockStartDisplay = myClockWhenFrameStarted + (JsConstants.CLOCKS_PER_LINE_TOTAL * getYStart()); //what the clock will be when the visible part of the frame starts
        myClockStopDisplay = myClockWhenFrameStarted + (JsConstants.CLOCKS_PER_LINE_TOTAL * (getYStart() + getDisplayHeight())); //when the visible part of the frame stops
        myClockAtLastUpdate = myClockWhenFrameStarted;
        myClocksToEndOfScanLine = JsConstants.CLOCKS_PER_LINE_TOTAL;  //currently at beginning of a line
        myVSYNCFinishClock = 0x7FFFFFFF;
        myScanlineCountForLastFrame = 0;
        myCurrentScanline = 0; //currently on the first line

        myFrameXStart = 0;    // Hardcoded in preparation for new TIA class
        //myFrameWidth  = JsConstants.CLOCKS_PER_LINE_VISIBLE;  // Hardcoded in preparation for new TIA class
    }

    /**
    * This is called by the JSSystem whenever it resets its cycle counter, which it 
    * is supposed to do every frame.  This method makes sure that all of the variables
    * in the TIA class (and those that it controls) compensate for this, mostly by
    * subtracting from all the relevant variables the same value that was subtracted
    * from the JSSystem's counter.
    */
    tia.systemCyclesReset = function () {
        // Get the current system cycle
        var cycles = mySystem.getCycles();

        //If we reset the cycle number from x to zero (i.e. subtract x from cycle #), we should subtract the same number from the previousCycles variable in Audio.
        //This way, (currentCycles - previousCycles) will remain as it would have without the reset
        if (getAudio() != null)
            getAudio().systemCyclesReset(cycles);   // Adjust the sound cycle counter

        myDumpDisabledCycle -= cycles;   // Adjust the dump cycle

        var clocks = cycles * JsConstants.CLOCKS_PER_CPU_CYCLE;    // Get the current color clock the system is using

        // Adjust the clocks by this amount since we're reseting the clock to zero
        myClockWhenFrameStarted -= clocks;
        myClockStartDisplay -= clocks;
        myClockStopDisplay -= clocks;
        myClockAtLastUpdate -= clocks;
        myVSYNCFinishClock -= clocks;
        myLastHMOVEClock -= clocks;
    }

    /**
    * This method existed originally for debugging.  Performs the obvious.
    * @param aIndex array index
    * @param aValue new value
    */
    function setCurrentFrameBuffer(aIndex, aValue) {
        tia.getCurrentFrameBuffer()[aIndex] = aValue;
    }

    tia.install = function (system) {
        // Remember which system I'm installed in
        mySystem = system;

        var shift = JsConstants.PAGE_SHIFT;
        mySystem.resetCycles();

        // All accesses are to this device
        var access = new JsPageAccess(tia);
        access.setIndirectMode();

        // We're installing in a 2600 system
        for (var i = 0; i < 8192; i += (1 << shift)) {
            if ((i & 0x1080) == 0x0000) {
                mySystem.setPageAccess(((i >> shift) & 0xFFFF), access);
            }
        }
    }

    /**
    * This method is the one that causes the CPU to execute.  It should be run once per frame.
    */
    tia.processFrame = function () {

        if (!myPartialFrameFlag)
            startFrame();

        myPartialFrameFlag = true;

        // Execute instructions until frame is finished, or a breakpoint/trap hits
        // 25000 is an arbitrary high number...this is called with the assumption that it will stop
        // before then (e.g. if the TIA is poked at JsConstants.VSYNC, depending on its state, it may halt the CPU,
        // thus completing the frame

        var zExecutions = 0;
        var zInstructionsExecuted = 0;
        //    long zTimeA=System.nanoTime();
        do {

            //A not very elegant work-around :
            //Some ROMs have a BRK instruction which terminates the execution before the frame is done...
            //this will keep calling executeCPU (up to 9 or 10 times) to see if it finishes the frame

            zInstructionsExecuted += mySystem.executeCPU(25000);
            zExecutions++;
            if (myPartialFrameFlag == false) break;

        } while (zExecutions < 10);

        //todo : this execution do-while think may be unneeded-figure out
        if (zExecutions >= 10) {
            if (debugHasExecutionOverrun == false)
                console.log("debug: ********** Execution overrun in TIA *********");

            debugHasExecutionOverrun = true;
        }

        // if (JSConsole.DEBUG_MODE_ON==true) System.out.println("debug JSTIA - " + zInstructionsExecuted + " instructions executed");;
        var totalClocks = (mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE) - myClockWhenFrameStarted;
        myCurrentScanline = Math.floor(totalClocks / JsConstants.CLOCKS_PER_LINE_TOTAL);

        if (!myPartialFrameFlag)
            endFrame();
    }

    /**
    * (A method that allowed me to type less when converting C++ to Java. It makes for
    * more readable code as well. -JLA)
    * @param aValue an integer
    * @return the boolean equivalent (in C++) of the integer
    */
    function bool(aValue) {
        if (typeof (aValue) == "boolean")
            return aValue;

        if (aValue == 0)
            return false;
        else
            return true;
    }

    /**
    * Called by update() at the start of a new frame.
    */
    function startFrame() {
        // This stuff should only happen at the beginning of a new frame.

        myConsole.getVideo().swapFrameBuffers();
        // Remember the number of clocks which have passed on the current scanline
        // so that we can adjust the frame's starting clock by this amount.  This
        // is necessary since some games position objects during JsConstants.VSYNC and the
        // TIA's internal counters are not reset by JsConstants.VSYNC.
        var clocks = ((mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE) - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;

        // Ask the system to reset the cycle count so it doesn't overflow
        mySystem.resetCycles();

        // Setup clocks that'll be used for drawing this frame
        myClockWhenFrameStarted = -1 * clocks;

        //myClockWhenFrameStarted=0;
        myClockStartDisplay = myClockWhenFrameStarted + (JsConstants.CLOCKS_PER_LINE_TOTAL * getYStart());
        myClockStopDisplay = myClockWhenFrameStarted + (JsConstants.CLOCKS_PER_LINE_TOTAL * (getYStart() + getDisplayHeight())); //myStopDisplayOffset;
        myClockAtLastUpdate = myClockStartDisplay;
        myClocksToEndOfScanLine = JsConstants.CLOCKS_PER_LINE_TOTAL;

        // Reset frame buffer pointer
        myFramePointer = 0; //myCurrentFrameBuffer;

        // If color loss is enabled then update the color registers based on
        // the number of scanlines in the last frame that was generated
        if (myColorLossEnabled) {
            if ((myScanlineCountForLastFrame & 0x01) != 0) {
                myTIAPokeRegister[JsConstants.COLUP0] |= 0x01010101;
                myTIAPokeRegister[JsConstants.COLUP1] |= 0x01010101;
                myTIAPokeRegister[JsConstants.COLUPF] |= 0x01010101;
                myTIAPokeRegister[JsConstants.COLUBK] |= 0x01010101;
            }
            else {
                myTIAPokeRegister[JsConstants.COLUP0] &= 0xfefefefe;
                myTIAPokeRegister[JsConstants.COLUP1] &= 0xfefefefe;
                myTIAPokeRegister[JsConstants.COLUPF] &= 0xfefefefe;
                myTIAPokeRegister[JsConstants.COLUBK] &= 0xfefefefe;
            }
        }
    }

    /**
    * Called by update() at the end of a frame.
    */
    function endFrame() {
        // This stuff should only happen at the end of a frame
        // Compute the number of scanlines in the frame
        myScanlineCountForLastFrame = myCurrentScanline;
    }

    function clocksThisLine() {
        // calculate the current scanline
        var totalClocks = (mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE) - myClockWhenFrameStarted;
        return Math.floor(totalClocks % JsConstants.CLOCKS_PER_LINE_TOTAL);
    }

    function isPlayfieldPixelOn(aHPos) {
        var zPFBlock = Math.floor(aHPos / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
        var res = false;
        if (zPFBlock >= 20) {
            if (isBitOn(0, myTIAPokeRegister[JsConstants.CTRLPF]) == true)
                zPFBlock = 39 - zPFBlock; //reflected
            else
                zPFBlock = zPFBlock - 20;
        }

        if (zPFBlock < 4)
            res = isBitOn(4 + zPFBlock, myTIAPokeRegister[JsConstants.PF0]); //7 - zPFBlock, myTIAPokeRegister[JsConstants.PF0]);
        else if (zPFBlock < 12)
            res = isBitOn(11 - zPFBlock, myTIAPokeRegister[JsConstants.PF1]);
        else
            res = isBitOn(zPFBlock - 12, myTIAPokeRegister[JsConstants.PF2]); //(19 - zPFBlock, myTIAPokeRegister[JsConstants.PF2]);

        return res;
    }

    function isPlayer0PixelOn(aHPos) {
        return ((myCurrentGRP0 & getCurrentP0Mask(aHPos)) != 0);
    }

    function isPlayer1PixelOn(aHPos) {
        return ((myCurrentGRP1 & getCurrentP1Mask(aHPos)) != 0);
    }

    function isMissile0PixelOn(aHPos) {
        return getCurrentM0Mask(aHPos);
    }

    function isMissile1PixelOn(aHPos) {
        return getCurrentM1Mask(aHPos);
    }

    function isRESMP0() {
        return ((myTIAPokeRegister[JsConstants.RESMP0] & JsConstants.BIT1) != 0);
    }

    function isRESMP1() {
        return ((myTIAPokeRegister[JsConstants.RESMP1] & JsConstants.BIT1) != 0);
    }

    function updatePlayfieldStatus() {
        if (((myTIAPokeRegister[JsConstants.PF0] & 0xF0) == 0) && (myTIAPokeRegister[JsConstants.PF1] == 0) && (myTIAPokeRegister[JsConstants.PF2] == 0))
            myEnabledObjects &= ~JsConstants.BIT_PF;
        else
            myEnabledObjects |= JsConstants.BIT_PF;
    }

    function memsetFrameBuffer(aIndex, aByteValue, aCount) {
        for (var i = aIndex; i < aCount; i++) {
            setCurrentFrameBuffer(i, (aByteValue & 0xFF));
        }
    }

    /**
    * This is the method that takes the values in the registers and uses them to 
    * create graphics (one horizontal line's worth) in JSVideo's FrameBuffer object.  
    * This is the very large version, which is slightly faster (although may not be 
    * significant on today's machines) than the smaller one (called updateFrameScanlineSimple at the moment.)
    * @param clocksToUpdate how many clocks to update
    * @param hpos current horizontal position
    */
    function updateFrameScanline(clocksToUpdate, hpos) {
        // Calculate the zEnding frame pointer value
        var zEnding = myFramePointer + clocksToUpdate;

        // See if we're in the vertical blank region
        // if(bool(myVBLANK & 0x02)) {
        if (isBitOn(1, myTIAPokeRegister[JsConstants.VBLANK])) {
            memsetFrameBuffer(myFramePointer, 0, clocksToUpdate);
        }
        // Handle all other possible combinations
        else {
            var zDebugSwitch = myEnabledObjects | myPlayfieldPriorityAndScore;
            if ((zDebugSwitch >= 0) && (zDebugSwitch < 0x100)) debugRenderTypes[zDebugSwitch] = true;
            switch (myEnabledObjects | myPlayfieldPriorityAndScore) {
                // Background     
                case 0x00:
                case 0x00 | JsConstants.BIT_SCORE:
                case 0x00 | JsConstants.BIT_PRIORITY:
                case 0x00 | JsConstants.BIT_PRIORITY | JsConstants.BIT_SCORE:
                    {
                        memsetFrameBuffer(myFramePointer, myTIAPokeRegister[JsConstants.COLUBK], clocksToUpdate);
                        break;
                    }

                    // Playfield is enabled and the score bit is not set
                case JsConstants.BIT_PF:
                case JsConstants.BIT_PF | JsConstants.BIT_PRIORITY:
                    {
                        // int mask = hpos; //myCurrentPFMask[hpos];
                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, isPlayfieldPixelOn(hpos) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]);
                            myFramePointer++;
                            hpos++;
                        }

                        break;
                    }

                    // Playfield is enabled and the score bit is set
                case JsConstants.BIT_PF | JsConstants.BIT_SCORE:
                case JsConstants.BIT_PF | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        // int mask = hpos;//&myCurrentPFMask[hpos];
                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, isPlayfieldPixelOn(hpos) ?
                            (hpos < 80 ? myTIAPokeRegister[JsConstants.COLUP0] : myTIAPokeRegister[JsConstants.COLUP1]) : myTIAPokeRegister[JsConstants.COLUBK]);

                            myFramePointer++;

                            hpos++;
                        }

                        break;
                    }

                    // Player 0 is enabled
                case JsConstants.BIT_P0:
                case JsConstants.BIT_P0 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_P0 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_P0 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        // int mP0 = hpos;
                        while (myFramePointer < zEnding) {
                            var zPlayer0Pixel = isPlayer0PixelOn(hpos);

                            setCurrentFrameBuffer(myFramePointer, zPlayer0Pixel ? myTIAPokeRegister[JsConstants.COLUP0] : myTIAPokeRegister[JsConstants.COLUBK]);

                            hpos++;
                            myFramePointer++;
                        }
                        break;
                    }

                    // Player 1 is enabled
                case JsConstants.BIT_P1:
                case JsConstants.BIT_P1 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_P1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_P1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, isPlayer1PixelOn(hpos) ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]);

                            myFramePointer++;
                            hpos++;
                        }
                        break;
                    }

                    // Player 0 and 1 are enabled
                case JsConstants.BIT_P0 | JsConstants.BIT_P1:
                case JsConstants.BIT_P0 | JsConstants.BIT_P1 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_P0 | JsConstants.BIT_P1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_P0 | JsConstants.BIT_P1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        while (myFramePointer < zEnding) {
                            var zPlayer0Pixel = isPlayer0PixelOn(hpos);
                            var zPlayer1Pixel = isPlayer1PixelOn(hpos);
                            setCurrentFrameBuffer(myFramePointer, zPlayer0Pixel ?
                            myTIAPokeRegister[JsConstants.COLUP0] : (zPlayer1Pixel ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (zPlayer0Pixel && zPlayer1Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_P0 | JsConstants.BIT_P1];

                            myFramePointer++;
                            hpos++;
                        }
                        break;
                    }

                    // Missile 0 is enabled
                case JsConstants.BIT_M1:
                case JsConstants.BIT_M1 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_M1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_M1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mM0 = hpos;

                        while (myFramePointer < zEnding) {
                            var zMMask = getCurrentM0Mask(mM0);

                            setCurrentFrameBuffer(myFramePointer, zMMask ? myTIAPokeRegister[JsConstants.COLUP0] : myTIAPokeRegister[JsConstants.COLUBK]);
                            ++mM0;
                            ++myFramePointer;
                            hpos++;

                        }
                        break;
                    }

                    // Missile 1 is enabled
                case JsConstants.BIT_M1:
                case JsConstants.BIT_M1 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_M1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_M1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mM1 = hpos; //myCurrentM1Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, getCurrentM1Mask(mM1) ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]);
                            ++mM1;
                            ++myFramePointer;
                            hpos++;

                        }
                        break;
                    }

                    // Ball is enabled
                case JsConstants.BIT_BL:
                case JsConstants.BIT_BL | JsConstants.BIT_SCORE:
                case JsConstants.BIT_BL | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_BL | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mBL = hpos; // &myCurrentBLMask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]);
                            ++mBL; ++myFramePointer;
                            hpos++;

                        }
                        break;
                    }

                    // Missile 0 and 1 are enabled
                case JsConstants.BIT_M1 | JsConstants.BIT_M1:
                case JsConstants.BIT_M1 | JsConstants.BIT_M1 | JsConstants.BIT_SCORE:
                case JsConstants.BIT_M1 | JsConstants.BIT_M1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_M1 | JsConstants.BIT_M1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mM0 = hpos; //myCurrentM0Mask[hpos];
                        var mM1 = hpos; //myCurrentM1Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, getCurrentM0Mask(mM0) ? myTIAPokeRegister[JsConstants.COLUP0] : (getCurrentM1Mask(mM1) ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (getCurrentM0Mask(mM0) && getCurrentM1Mask(mM1))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_M1 | JsConstants.BIT_M1];
                            hpos++;
                            ++mM0; ++mM1; ++myFramePointer;

                        }
                        break;
                    }

                    // Ball and Missile 0 are enabled and playfield priority is not set
                case JsConstants.BIT_BL | JsConstants.BIT_M1:
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_SCORE:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];
                        var mM0 = hpos; //myCurrentM0Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, (getCurrentM0Mask(mM0) ? myTIAPokeRegister[JsConstants.COLUP0] : (getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK])));

                            if (getCurrentBLMask(mBL) && getCurrentM0Mask(mM0))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_M1];

                            ++mBL; ++mM0; ++myFramePointer;
                            hpos++;
                        }
                        break;
                    }

                    // Ball and Missile 0 are enabled and playfield priority is set
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];
                        var mM0 = hpos; //myCurrentM0Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, (getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : (getCurrentM0Mask(mM0) ? myTIAPokeRegister[JsConstants.COLUP0] : myTIAPokeRegister[JsConstants.COLUBK])));

                            if (getCurrentBLMask(mBL) && getCurrentM0Mask(mM0))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_M1];

                            ++mBL; ++mM0; ++myFramePointer;
                            hpos++;
                        }
                        break;
                    }

                    // Ball and Missile 1 are enabled and playfield priority is not set
                case JsConstants.BIT_BL | JsConstants.BIT_M1:
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_SCORE:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];
                        var mM1 = hpos; //myCurrentM1Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, (getCurrentM1Mask(mM1) ? myTIAPokeRegister[JsConstants.COLUP1] : (getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK])));

                            if (getCurrentBLMask(mBL) && getCurrentM1Mask(mM1))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_M1];

                            ++mBL; ++mM1; ++myFramePointer;
                            hpos++;

                        }
                        break;
                    }

                    // Ball and Missile 1 are enabled and playfield priority is set
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_BL | JsConstants.BIT_M1 | JsConstants.BIT_SCORE | JsConstants.BIT_PRIORITY:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];
                        var mM1 = hpos; //myCurrentM1Mask[hpos];

                        while (myFramePointer < zEnding) {
                            setCurrentFrameBuffer(myFramePointer, (getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : (getCurrentM1Mask(mM1) ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK])));

                            if (getCurrentBLMask(mBL) && getCurrentM1Mask(mM1))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_M1];

                            ++mBL; ++mM1; ++myFramePointer;
                            hpos++;
                        }
                        break;
                    }

                    // Ball and Player 1 are enabled and playfield priority is not set
                case JsConstants.BIT_BL | JsConstants.BIT_P1:
                case JsConstants.BIT_BL | JsConstants.BIT_P1 | JsConstants.BIT_SCORE:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];
                        // int mP1 = hpos;//myCurrentP1Mask[hpos];

                        while (myFramePointer < zEnding) {
                            var zPlayer1Pixel = isPlayer1PixelOn(hpos);
                            setCurrentFrameBuffer(myFramePointer, zPlayer1Pixel ? myTIAPokeRegister[JsConstants.COLUP1] :
                            (getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (getCurrentBLMask(mBL) && zPlayer1Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_P1];

                            ++mBL;
                            //++mP1; 
                            ++myFramePointer;
                            hpos++;
                        }
                        break;
                    }

                    // Ball and Player 1 are enabled and playfield priority is set
                case JsConstants.BIT_BL | JsConstants.BIT_P1 | JsConstants.BIT_PRIORITY:
                case JsConstants.BIT_BL | JsConstants.BIT_P1 | JsConstants.BIT_PRIORITY | JsConstants.BIT_SCORE:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];

                        while (myFramePointer < zEnding) {
                            var zPlayer1Pixel = isPlayer1PixelOn(hpos);
                            setCurrentFrameBuffer(myFramePointer, getCurrentBLMask(mBL) ? myTIAPokeRegister[JsConstants.COLUPF] :
                            (zPlayer1Pixel ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (getCurrentBLMask(mBL) && zPlayer1Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_BL | JsConstants.BIT_P1];

                            ++mBL;
                            //++mP1; 
                            ++myFramePointer;
                            hpos++;
                        }
                        break;
                    }

                    // Playfield and Player 0 are enabled and playfield priority is not set
                case JsConstants.BIT_PF | JsConstants.BIT_P0:
                    {
                        // int mPF = hpos;// &myCurrentPFMask[hpos];
                        // int mP0 = hpos;//myCurrentP0Mask[hpos];

                        while (myFramePointer < zEnding) {

                            var zPlayfieldIsOn = isPlayfieldPixelOn(hpos);
                            var zPlayer0Pixel = isPlayer0PixelOn(hpos);
                            setCurrentFrameBuffer(myFramePointer, zPlayer0Pixel ?
                            myTIAPokeRegister[JsConstants.COLUP0] : (zPlayfieldIsOn ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (zPlayfieldIsOn && zPlayer0Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_PF | JsConstants.BIT_P0];

                            hpos++;

                            ++myFramePointer;
                        }

                        break;
                    }

                    // Playfield and Player 0 are enabled and playfield priority is set
                case JsConstants.BIT_PF | JsConstants.BIT_P0 | JsConstants.BIT_PRIORITY:
                    {
                        //  int mPF = hpos; // &myCurrentPFMask[hpos];
                        //int mP0 = hpos;//myCurrentP0Mask[hpos];

                        while (myFramePointer < zEnding) {
                            var zPlayfieldIsOn = isPlayfieldPixelOn(hpos);
                            var zPlayer0Pixel = isPlayer0PixelOn(hpos);
                            setCurrentFrameBuffer(myFramePointer, zPlayfieldIsOn ? myTIAPokeRegister[JsConstants.COLUPF] :
                            (zPlayer0Pixel ? myTIAPokeRegister[JsConstants.COLUP0] : myTIAPokeRegister[JsConstants.COLUBK]));
                            if (zPlayfieldIsOn && zPlayer0Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_PF | JsConstants.BIT_P0];

                            hpos++;

                            ++myFramePointer;
                        }

                        break;
                    }

                    // Playfield and Player 1 are enabled and playfield priority is not set
                case JsConstants.BIT_PF | JsConstants.BIT_P1:
                    {
                        while (myFramePointer < zEnding) {
                            var zPlayfieldIsOn = isPlayfieldPixelOn(hpos);
                            var zPlayer1Pixel = isPlayer1PixelOn(hpos);

                            setCurrentFrameBuffer(myFramePointer, zPlayer1Pixel ?
                            myTIAPokeRegister[JsConstants.COLUP1] : (zPlayfieldIsOn ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]));

                            if (zPlayfieldIsOn && zPlayer1Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_PF | JsConstants.BIT_P1];

                            hpos++;
                            //++mP1; 
                            ++myFramePointer;
                        }

                        break;
                    }

                    // Playfield and Player 1 are enabled and playfield priority is set
                case JsConstants.BIT_PF | JsConstants.BIT_P1 | JsConstants.BIT_PRIORITY:
                    {
                        while (myFramePointer < zEnding) {
                            var zPlayfieldIsOn = isPlayfieldPixelOn(hpos);
                            var zPlayer1Pixel = isPlayer1PixelOn(hpos);

                            setCurrentFrameBuffer(myFramePointer, zPlayfieldIsOn ? myTIAPokeRegister[JsConstants.COLUPF] :
                            (zPlayer1Pixel ? myTIAPokeRegister[JsConstants.COLUP1] : myTIAPokeRegister[JsConstants.COLUBK]));
                            if (zPlayfieldIsOn && zPlayer1Pixel)
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_PF | JsConstants.BIT_P1];

                            hpos++;
                            //++mP1; 
                            ++myFramePointer;
                        }

                        break;
                    }

                    // Playfield and Ball are enabled
                case JsConstants.BIT_PF | JsConstants.BIT_BL:
                case JsConstants.BIT_PF | JsConstants.BIT_BL | JsConstants.BIT_PRIORITY:
                    {
                        var mBL = hpos; //myCurrentBLMask[hpos];

                        while (myFramePointer < zEnding) {
                            var zPlayfieldIsOn = isPlayfieldPixelOn(hpos);

                            setCurrentFrameBuffer(myFramePointer, (zPlayfieldIsOn || getCurrentBLMask(mBL)) ? myTIAPokeRegister[JsConstants.COLUPF] : myTIAPokeRegister[JsConstants.COLUBK]);

                            if (zPlayfieldIsOn && getCurrentBLMask(mBL))
                                myCollision |= JsConstants.COLLISION_TABLE[JsConstants.BIT_PF | JsConstants.BIT_BL];

                            hpos++;
                            ++mBL; ++myFramePointer;
                        }

                        break;
                    }

                    // Handle all of the other cases
                default:
                    {
                        for (; myFramePointer < zEnding; ++myFramePointer, ++hpos) {
                            var enabled = isPlayfieldPixelOn(hpos) ? JsConstants.BIT_PF : 0;            //bool(myPF  & myCurrentPFMask[hpos]) ? JsConstants.BIT_PF : 0;

                            if (bool(myEnabledObjects & JsConstants.BIT_BL) && getCurrentBLMask(hpos))
                                enabled |= JsConstants.BIT_BL;
                            if (isPlayer1PixelOn(hpos))
                                enabled |= JsConstants.BIT_P1;
                            if (bool(myEnabledObjects & JsConstants.BIT_M1) && getCurrentM1Mask(hpos))
                                enabled |= JsConstants.BIT_M1;
                            if (isPlayer0PixelOn(hpos))
                                enabled |= JsConstants.BIT_P0;
                            if (bool(myEnabledObjects & JsConstants.BIT_M0) && getCurrentM0Mask(hpos))
                                enabled |= JsConstants.BIT_M0;

                            myCollision |= JsConstants.COLLISION_TABLE[enabled];
                            setCurrentFrameBuffer(myFramePointer, getColor(JsConstants.PRIORITY_ENCODER[hpos < 80 ? 0 : 1][enabled | myPlayfieldPriorityAndScore]));
                        }
                        break;
                    }
            }
        }

        myFramePointer = zEnding;
    }

    /**
    * This is a trimmed-up version of updateFrameScanline.  It is
    * much smaller, but takes a little more time to execute.  
    * This method perhaps should replace the 
    * updateFrameScanline method, for simplicity reasons.
    * (It needs to be worked on--some games (e.g. med. mayhem) shake with this method.
    * @param aClocksToUpdate How many clocks to update
    * @param aHPos Current horizontal position
    */
    function updateFrameScanlineSimple(aClocksToUpdate, aHPos) {
        var zEnding = myFramePointer + aClocksToUpdate;

        // See if we're in the vertical blank region
        // if(bool(myVBLANK & 0x02)) {
        if (isBitOn(1, myTIAPokeRegister[JsConstants.VBLANK])) {
            memsetFrameBuffer(myFramePointer, 0, aClocksToUpdate);
        }
        else {
            var zBallEnabled = ((myEnabledObjects & JsConstants.BIT_BL) != 0);
            var zPlayfieldEnabled = ((myEnabledObjects & JsConstants.BIT_PF) != 0);
            var zPlayer0Enabled = ((myEnabledObjects & JsConstants.BIT_P0) != 0);
            var zPlayer1Enabled = ((myEnabledObjects & JsConstants.BIT_P1) != 0);
            var zMissile0Enabled = ((myEnabledObjects & JsConstants.BIT_M0) != 0);
            var zMissile1Enabled = ((myEnabledObjects & JsConstants.BIT_M1) != 0);

            for (; myFramePointer < zEnding; ++myFramePointer, ++aHPos) {
                var enabled = 0;

                if (zPlayfieldEnabled && isPlayfieldPixelOn(aHPos))
                    enabled |= JsConstants.BIT_PF; // : 0;            //bool(myPF  & myCurrentPFMask[aHPos]) ? JsConstants.BIT_PF : 0;

                if (zBallEnabled && getCurrentBLMask(aHPos))
                    enabled |= JsConstants.BIT_BL;
                if (zPlayer1Enabled && isPlayer1PixelOn(aHPos))
                    enabled |= JsConstants.BIT_P1;
                if (zMissile1Enabled && getCurrentM1Mask(aHPos))
                    enabled |= JsConstants.BIT_M1;
                if (zPlayer0Enabled && isPlayer0PixelOn(aHPos))
                    enabled |= JsConstants.BIT_P0;
                if (zMissile0Enabled && getCurrentM0Mask(aHPos))
                    enabled |= JsConstants.BIT_M0;

                myCollision |= JsConstants.COLLISION_TABLE[enabled];
                setCurrentFrameBuffer(myFramePointer, getColor(JsConstants.PRIORITY_ENCODER[aHPos < 80 ? 0 : 1][enabled | myPlayfieldPriorityAndScore]));
            }
        }
    }

    function updateFrame(clock) {
        // See if we're in the nondisplayable portion of the screen or if
        // we've already updated this portion of the screen
        if ((clock < myClockStartDisplay) || (clock <= myClockAtLastUpdate) || (myClockAtLastUpdate >= myClockStopDisplay)) {
            return;
        }

        // Truncate the number of cycles to update to the stop display point
        if (clock > myClockStopDisplay)
            clock = myClockStopDisplay;

        // Update frame one scanline at a time
        do //START OF LOOP
        {
            // Compute the number of clocks we're going to update
            var clocksToUpdate = 0;

            // Remember how many clocks we are from the left side of the screen
            var clocksFromStartOfScanLine = JsConstants.CLOCKS_PER_LINE_TOTAL - myClocksToEndOfScanLine;

            // See if we're updating more than the current scanline
            if (clock > (myClockAtLastUpdate + myClocksToEndOfScanLine)) {
                // Yes, we have more than one scanline to update so finish current one
                clocksToUpdate = myClocksToEndOfScanLine;
                myClocksToEndOfScanLine = JsConstants.CLOCKS_PER_LINE_TOTAL;
                myClockAtLastUpdate += clocksToUpdate;
            }
            else {
                // No, so do as much of the current scanline as possible
                clocksToUpdate = clock - myClockAtLastUpdate;
                myClocksToEndOfScanLine -= clocksToUpdate;
                myClockAtLastUpdate = clock;
            }

            var startOfScanLine = JsConstants.CLOCKS_PER_LINE_BLANK + myFrameXStart;

            // Skip over as many horizontal blank clocks as we can
            if (clocksFromStartOfScanLine < startOfScanLine) {
                var tmp;

                if ((startOfScanLine - clocksFromStartOfScanLine) < clocksToUpdate)
                    tmp = startOfScanLine - clocksFromStartOfScanLine;
                else
                    tmp = clocksToUpdate;

                clocksFromStartOfScanLine += tmp;
                clocksToUpdate -= tmp;
            }

            // Remember frame pointer in case JsConstants.HMOVE blanks need to be handled
            var oldFramePointer = myFramePointer;

            // Update as much of the scanline as we can
            if (clocksToUpdate != 0) {
                updateFrameScanline(clocksToUpdate, clocksFromStartOfScanLine - JsConstants.CLOCKS_PER_LINE_BLANK);
                //updateFrameScanlineSimple(clocksToUpdate, clocksFromStartOfScanLine - JsConstants.CLOCKS_PER_LINE_BLANK);
            }

            // Handle JsConstants.HMOVE blanks if they are enabled
            if (myHMOVEBlankEnabled && (startOfScanLine < JsConstants.CLOCKS_PER_LINE_BLANK + 8) && (clocksFromStartOfScanLine < (JsConstants.CLOCKS_PER_LINE_BLANK + 8))) {
                var blanks = (JsConstants.CLOCKS_PER_LINE_BLANK + 8) - clocksFromStartOfScanLine;
                memsetFrameBuffer(oldFramePointer, 0, blanks);
                if ((clocksToUpdate + clocksFromStartOfScanLine) >= (JsConstants.CLOCKS_PER_LINE_BLANK + 8)) myHMOVEBlankEnabled = false;
            }

            // See if we're at the end of a scanline
            if (myClocksToEndOfScanLine == JsConstants.CLOCKS_PER_LINE_TOTAL) {
                myFramePointer -= (JsConstants.CLOCKS_PER_LINE_VISIBLE - myConsole.getDisplayWidth() - myFrameXStart);

                // Yes, so set PF mask based on current JsConstants.CTRLPF reflection state
                // myCurrentPFMask = PLAYFIELD_TABLE[myTIAPokeRegister[JsConstants.CTRLPF] & 0x01];
                //TODO : figure out what this did exactly

                // TODO: These should be reset right after the first copy of the player
                // has passed.  However, for now we'll just reset at the end of the
                // scanline since the other way would be too slow (01/21/99).

                setCurrentP0Mask(myPOSP0 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));
                setCurrentP1Mask(myPOSP1 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));

                // Handle the "Cosmic Ark" TIA bug if it's enabled
                if (myM0CosmicArkMotionEnabled) emulateCosmicBug();
            }
        }
        while (myClockAtLastUpdate < clock);
    }

    function emulateCosmicBug() {
        // Movement table associated with the bug

        myM0CosmicArkCounter = (myM0CosmicArkCounter + 1) & 3;
        myPOSM0 -= COSMICBUG_MOVEMENT[myM0CosmicArkCounter];

        if (myPOSM0 >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
            myPOSM0 -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
        else if (myPOSM0 < 0)
            myPOSM0 += JsConstants.CLOCKS_PER_LINE_VISIBLE;

        if (myM0CosmicArkCounter == 1) {
            // Stretch this missile so it's at least 2 pixels wide
            setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4) | 0x01, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));
        }
        else if (myM0CosmicArkCounter == 2) {
            // Missile is disabled on this line
            setCurrentM0MaskDisabled();
        }
        else {
            setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));
        }
    }

    function waitHorizontalSync() {
        var cyclesToEndOfLine = 76 - ((mySystem.getCycles() -
                Math.floor(myClockWhenFrameStarted / JsConstants.CLOCKS_PER_CPU_CYCLE)) % 76);

        if (cyclesToEndOfLine < 76) {
            mySystem.incrementCycles(cyclesToEndOfLine);
        }
    }

    /**
    * Returns a value associated with the given address.
    * The peekable addresses of the TIA are those that involve either a collision
    * register or an external input (e.g. paddles).
    * @param addr Address to peek
    * @return Byte value associated with the address
    */
    tia.peek = function (addr) {
        var zReturn = 0;
        // Update frame to current color clock before we look at anything!
        // dbg.out("Peek - TIA:", Math.flooraddr);
        assert(addr >= 0);
        updateFrame(mySystem.getCycles() * JsConstants.CLOCKS_PER_CPU_CYCLE);

        var noise = mySystem.getDataBusState() & 0x3F;

        switch (addr & 0x000f) {
            case JsConstants.CXM0P: //0x00:    // CXM0P
                zReturn = (bool(myCollision & 0x0001) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0002) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXM1P: //0x01:    // CXM1P
                zReturn = (bool(myCollision & 0x0004) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0008) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXP0FB: //0x02:    // CXP0FB
                zReturn = (bool(myCollision & 0x0010) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0020) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXP1FB: //0x03:    // CXP1FB
                zReturn = (bool(myCollision & 0x0040) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0080) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXM0FB: //0x04:    // CXM0FB
                zReturn = (bool(myCollision & 0x0100) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0200) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXM1FB: // 0x05:    // CXM1FB
                zReturn = (bool(myCollision & 0x0400) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x0800) ? 0x40 : 0x00) | noise; break;

            case JsConstants.CXBLPF: //0x06:    // CXBLPF
                zReturn = (bool(myCollision & 0x1000) ? 0x80 : 0x00) | noise; break;

            case JsConstants.CXPPMM: //0x07:    // CXPPMM
                zReturn = (bool(myCollision & 0x2000) ? 0x80 : 0x00) |
                        (bool(myCollision & 0x4000) ? 0x40 : 0x00) | noise; break;

            case JsConstants.INPT0: //0x08:    // INPT0
                {
                    var r = myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.AnalogPin.Nine);
                    if (r == JsConstants.RESISTANCE_MIN) {
                        zReturn = 0x80 | noise; break;
                    }
                    else if ((r == JsConstants.RESISTANCE_MAX) || myDumpEnabled) {
                        zReturn = noise; break;
                    }
                    else {
                        var t = (1.6 * r * 0.01E-6);
                        var needed = Math.floor(t * 1.19E6);
                        if (mySystem.getCycles() > (myDumpDisabledCycle + needed)) {
                            zReturn = 0x80 | noise; break;
                        }
                        else {
                            zReturn = noise; break;
                        }
                    }
                }

            case JsConstants.INPT1: //0x09:    // INPT1
                {
                    var r = myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.AnalogPin.Five);
                    if (r == JsConstants.RESISTANCE_MIN) {
                        zReturn = 0x80 | noise; break;
                    }
                    else if ((r == JsConstants.RESISTANCE_MAX) || myDumpEnabled) {
                        zReturn = noise; break;
                    }
                    else {
                        var t = (1.6 * r * 0.01E-6);
                        var needed = Math.floor(t * 1.19E6);
                        if (mySystem.getCycles() > (myDumpDisabledCycle + needed)) {
                            zReturn = 0x80 | noise; break;
                        }
                        else {
                            zReturn = noise; break;
                        }
                    }
                }

            case JsConstants.INPT2: //0x0A:    // INPT2
                {
                    var r = myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.AnalogPin.Nine);
                    if (r == JsConstants.RESISTANCE_MIN) {
                        zReturn = 0x80 | noise; break;
                    }
                    else if ((r == JsConstants.RESISTANCE_MAX) || myDumpEnabled) {
                        zReturn = noise; break;
                    }
                    else {
                        var t = (1.6 * r * 0.01E-6);
                        var needed = Math.floor(t * 1.19E6);
                        if (mySystem.getCycles() > (myDumpDisabledCycle + needed)) {
                            zReturn = 0x80 | noise; break;
                        }
                        else {
                            zReturn = noise; break;
                        }
                    }
                }

            case JsConstants.INPT3: //0x0B:    // INPT3
                {
                    var r = myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.AnalogPin.Five);
                    if (r == JsConstants.RESISTANCE_MIN) {
                        zReturn = 0x80 | noise; break;
                    }
                    else if ((r == JsConstants.RESISTANCE_MAX) || myDumpEnabled) {
                        zReturn = noise; break;
                    }
                    else {
                        var t = (1.6 * r * 0.01E-6);
                        var needed = Math.floor(t * 1.19E6);
                        if (mySystem.getCycles() > (myDumpDisabledCycle + needed)) {
                            zReturn = 0x80 | noise; break;
                        }
                        else {
                            zReturn = noise; break;
                        }
                    }
                }

            case JsConstants.INPT4: //0x0C:    // INPT4
                zReturn = myConsole.getController(JsConstants.Jack.LEFT).read(JsConstants.DigitalPin.Six) ?
                    (0x80 | noise) : noise; break;

            case JsConstants.INPT5: //0x0D:    // INPT5
                zReturn = myConsole.getController(JsConstants.Jack.RIGHT).read(JsConstants.DigitalPin.Six) ?
                    (0x80 | noise) : noise; break;

            case 0x0E:
                zReturn = noise; break;

            default:
                zReturn = noise;

                break;
        }
        assert((zReturn >= 0) && (zReturn < 0x100));
        return zReturn;
    }

    /**
    * Writes a byte to the TIA chip.
    * Depending on the address supplied, either a byte is stored in a TIA register or
    * the TIA performs some function (i.e. STROBE registers), in this case ignoring the byte.
    * This TIA emulator class will outsource any poke of an audio register to the
    * JSAudio object of the console.
    * <p>
    * Note: the TIA will only look at the 6 lowest bits in the address supplied.  This
    * 6 bit number corresponds with the values found in the TIA guide found on the
    * Internet.
    * @param aAddress address to poke
    * @param aByteValue the byte to write to the TIA chip
    */
    tia.poke = function (aAddress, aByteValue) {
        assert((aByteValue >= 0) && (aByteValue < 0x100));

        var addr = aAddress & 0x003f;

        var clock = getCurrentClockCount(); //mySystem.getCycles() * 3;
        var delay = JsConstants.POKE_DELAY_TABLE[addr];

        // See if this is a poke to a PF register
        if (delay == -1) {
            var d = [4, 5, 2, 3];
            var x = getCurrentXPos(); //((clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL);
            delay = (d[Math.floor(x / 3) & 3]) & 0xFFFF;
        }

        // Update frame to current CPU cycle before we make any changes!
        updateFrame(clock + delay);

        // If a JsConstants.VSYNC hasn't been generated in time go ahead and end the frame
        var temp = getCurrentScanline();
        if (temp > myMaximumNumberOfScanlines) {
            mySystem.stopCPU(); //.stop();
            if (temp > 10000)
                throw "Teste";
            myPartialFrameFlag = false;
        }


        if (addr < JsConstants.TIA_POKE_REGISTER_COUNT) // is the address is a pokable TIA register?
        {
            var zPreviousValue = myTIAPokeRegister[addr]; //remember what the previous value was, just in case someone below wants to know

            myTIAPokeRegister[addr] = aByteValue;  //SETS THE NEW VALUE!

            switch (addr) {
                case JsConstants.VSYNC:    // JsConstants.VSYNC (vertical sync set/clear)
                    {
                        // myVSYNC = aByteValue;
                        //  System.out.println("Debug : JsConstants.VSYNC poked, value=" + aByteValue + ", tia.scanlines()==" + tia.scanlines()); 
                        if (((aByteValue & JsConstants.BIT1) != 0) && ((zPreviousValue & JsConstants.BIT1) == 0)) {

                            myVSyncOn = tia.scanlines();
                            // System.out.println("Debug : JsConstants.VSYNC ON, value=" + aByteValue + ", tia.scanlines()==" + tia.scanlines()); 
                        }

                        if (bool(myTIAPokeRegister[JsConstants.VSYNC] & JsConstants.BIT1)) //is bit #1 on?
                        {
                            // Indicate when JsConstants.VSYNC should be finished.  This should really
                            // be 3 * 228 according to Atari's documentation, however, some
                            // games don't supply the full 3 scanlines of JsConstants.VSYNC.
                            myVSYNCFinishClock = clock + JsConstants.CLOCKS_PER_LINE_TOTAL;
                        }
                        else if (!bool(myTIAPokeRegister[JsConstants.VSYNC] & JsConstants.BIT1) && (clock >= myVSYNCFinishClock)) {
                            // We're no longer interested in myVSYNCFinishClock
                            myVSYNCFinishClock = 0x7FFFFFFF;

                            // Since we're finished with the frame tell the processor to halt
                            mySystem.stopCPU();
                            myPartialFrameFlag = false;
                        }

                        break;
                    }

                case JsConstants.VBLANK:    // JsConstants.VBLANK (vertical blank set/clear)
                    {
                        // Is the dump to ground path being set for I0, I1, I2, and I3?
                        if (((aByteValue & JsConstants.BIT1) != 0) && ((zPreviousValue & JsConstants.BIT1) == 0)) //AUTO DETECT FRAME HEIGHT
                        {
                            //TODO : have this done only when in detection mode
                            myVBlankOn = tia.scanlines();

                            var zHeight = myVBlankOn - myVBlankOff;
                            if (zHeight < 0) zHeight += myVSyncOn;
                            if (zHeight >= JsConstants.FRAME_Y_MIN) {
                                myDetectedYStart = myVBlankOff;
                                if (myDetectedYStart >= myVSyncOn) myDetectedYStart -= myVSyncOn;
                                myDetectedYStop = myDetectedYStart + zHeight;
                            }
                        }
                        else if (((aByteValue & JsConstants.BIT1) == 0) && ((zPreviousValue & JsConstants.BIT1) != 0)) {
                            myVBlankOff = tia.scanlines();
                        }

                        if ((bool(zPreviousValue & JsConstants.BIT7) == false) && (bool(myTIAPokeRegister[JsConstants.VBLANK] & JsConstants.BIT7) == true))
                            myDumpEnabled = true;
                        else if ((bool(zPreviousValue & JsConstants.BIT7) == true) && (bool(myTIAPokeRegister[JsConstants.VBLANK] & JsConstants.BIT7) == false)) {
                            myDumpEnabled = false;
                            myDumpDisabledCycle = mySystem.getCycles();
                        }

                        break;
                    }

                case JsConstants.WSYNC:    // JsConstants.WSYNC : Wait for leading edge of HBLANK
                    {
                        // It appears that the 6507 only halts during a read cycle so
                        // we test here for follow-on writes which should be ignored as
                        // far as halting the processor is concerned.
                        //
                        // TODO - 08-30-2006: This halting isn't correct since it's
                        // still halting on the original write.  The 6507 emulation
                        // should be expanded to include a READY line.
                        if (mySystem.getCPU().lastAccessWasRead()) {
                            // Tell the cpu to waste the necessary amount of time
                            waitHorizontalSync();
                        }
                        break;
                    }

                case JsConstants.RSYNC:    // Reset horizontal sync counter
                    {   //Not really supposed to be poked, except for during the initial memory clearing? - JLA
                        break;
                    }

                case JsConstants.NUSIZ0:    // Number-size of player-missile 0
                    {
                        // TODO: Technically the "enable" part, [0], should depend on the current
                        // enabled or disabled state.  This mean we probably need a data member
                        // to maintain that state (01/21/99).                
                        setCurrentP0Mask(myPOSP0 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));
                        setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));

                        break;
                    }

                case JsConstants.NUSIZ1:    // Number-size of player-missile 1
                    {
                        // TODO: Technically the "enable" part, [0], should depend on the current
                        // enabled or disabled state.  This mean we probably need a data member
                        // to maintain that state (01/21/99).

                        setCurrentP1Mask(myPOSP1 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));
                        setCurrentM1Mask(myPOSM1 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM1 & 0xFC));

                        break;
                    }

                case JsConstants.COLUP0:    // Color-Luminance Player 0
                case JsConstants.COLUP1:    // COLUM P1
                case JsConstants.COLUPF:    // COLUM PF
                case JsConstants.COLUBK:    // COLUM BK
                    {
                        var zColor = (aByteValue & 0xfe);
                        if (myColorLossEnabled && bool(myScanlineCountForLastFrame & JsConstants.BIT0)) zColor |= JsConstants.BIT0;
                        myTIAPokeRegister[addr] = zColor;
                        break;
                    }



                case 0x0A:    // Control Playfield, Ball size, Collisions
                    {
                        //myCTRLPF = aByteValue;

                        // The playfield priority and score bits from the control register
                        // are accessed when the frame is being drawn.  We precompute the
                        // necessary aByteValue here so we can save time while drawing.
                        myPlayfieldPriorityAndScore = ((myTIAPokeRegister[JsConstants.CTRLPF] & 0x06) << 5);

                        // Update the playfield mask based on reflection state if
                        // we're still on the left hand side of the playfield
                        if (((clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL) < (68 + 79)) {
                            //  myCurrentPFMask = PLAYFIELD_TABLE[myTIAPokeRegister[JsConstants.CTRLPF] & 0x01];
                            //TODO : figure out what this did exactly
                        }

                        setCurrentBLMask(myPOSBL & 0x03, (myTIAPokeRegister[JsConstants.CTRLPF] & 0x30) >> 4, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSBL & 0xFC));

                        break;
                    }

                case JsConstants.REFP0:    // Reflect Player 0
                    {
                        // See if the reflection state of the player is being changed
                        if ((zPreviousValue & JsConstants.BIT3) != (aByteValue & JsConstants.BIT3)) myCurrentGRP0 = JsConstants.PLAYER_REFLECT_TABLE[myCurrentGRP0];
                        break;
                    }

                case JsConstants.REFP1:    // Reflect Player 1
                    {
                        // See if the reflection state of the player is being changed
                        if ((zPreviousValue & JsConstants.BIT3) != (aByteValue & JsConstants.BIT3)) myCurrentGRP1 = JsConstants.PLAYER_REFLECT_TABLE[myCurrentGRP1];

                        break;
                    }

                case JsConstants.PF0:    // Playfield register byte 0
                    {
                        updatePlayfieldStatus();
                        break;
                    }

                case JsConstants.PF1:    // Playfield register byte 1
                    {
                        //  myPF = (myPF & 0x000FF00F) | (Math.flooraByteValue << 4);

                        updatePlayfieldStatus();
                        break;
                    }

                case JsConstants.PF2:    // Playfield register byte 2
                    {
                        // myPF = (myPF & 0x00000FFF) | (Math.flooraByteValue << 12);

                        updatePlayfieldStatus();
                        break;
                    }

                case JsConstants.RESP0:    // Reset Player 0
                    {
                        var hpos = (clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;
                        var newx = hpos < JsConstants.CLOCKS_PER_LINE_BLANK ? 3 : (((hpos - JsConstants.CLOCKS_PER_LINE_BLANK) + 5) % JsConstants.CLOCKS_PER_LINE_VISIBLE);

                        // Find out under what condition the player is being reset
                        var when = JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[myTIAPokeRegister[JsConstants.NUSIZ0] & 7][myPOSP0][newx];

                        // Player is being reset during the display of one of its copies
                        if (when == 1) {
                            // So we go ahead and update the display before moving the player
                            // TODO: The 11 should depend on how much of the player has already
                            // been displayed.  Probably change table to return the amount to
                            // delay by instead of just 1 (01/21/99).
                            updateFrame(clock + 11);

                            myPOSP0 = newx;

                            // Setup the mask to skip the first copy of the player

                            setCurrentP0Mask(myPOSP0 & 0x03, 1, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));
                        }
                        // Player is being reset in neither the delay nor display section
                        else if (when == 0) {
                            myPOSP0 = newx;

                            // So we setup the mask to skip the first copy of the player
                            setCurrentP0Mask(myPOSP0 & 0x03, 1, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));
                        }
                        // Player is being reset during the delay section of one of its copies
                        else if (when == -1) {
                            myPOSP0 = newx;

                            // So we setup the mask to display all copies of the player
                            setCurrentP0Mask(myPOSP0 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));
                        }
                        break;
                    }

                case JsConstants.RESP1:    // Reset Player 1
                    {
                        var hpos = (clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;
                        var newx = hpos < JsConstants.CLOCKS_PER_LINE_BLANK ? 3 : (((hpos - JsConstants.CLOCKS_PER_LINE_BLANK) + 5) % JsConstants.CLOCKS_PER_LINE_VISIBLE);

                        // Find out under what condition the player is being reset
                        var when = JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[myTIAPokeRegister[JsConstants.NUSIZ1] & 7][myPOSP1][newx];

                        // Player is being reset during the display of one of its copies
                        if (when == 1) {
                            // So we go ahead and update the display before moving the player
                            // TODO: The 11 should depend on how much of the player has already
                            // been displayed.  Probably change table to return the amount to
                            // delay by instead of just 1 (01/21/99).
                            updateFrame(clock + 11);

                            myPOSP1 = newx;

                            // Setup the mask to skip the first copy of the player

                            setCurrentP1Mask(myPOSP1 & 0x03, 1, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));
                        }
                        // Player is being reset in neither the delay nor display section
                        else if (when == 0) {
                            myPOSP1 = newx;

                            // So we setup the mask to skip the first copy of the player
                            setCurrentP1Mask(myPOSP1 & 0x03, 1, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));
                        }
                        // Player is being reset during the delay section of one of its copies
                        else if (when == -1) {
                            myPOSP1 = newx;

                            // So we setup the mask to display all copies of the player
                            setCurrentP1Mask(myPOSP1 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));
                        }

                        break;
                    }

                case JsConstants.RESM0:    // Reset Missile 0
                    {
                        var hpos = (clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;
                        myPOSM0 = hpos < JsConstants.CLOCKS_PER_LINE_BLANK ? 2 : (((hpos - JsConstants.CLOCKS_PER_LINE_BLANK) + 4) % JsConstants.CLOCKS_PER_LINE_VISIBLE);

                        // TODO: Remove the following special hack for Dolphin by
                        // figuring out what really happens when Reset Missile
                        // occurs 20 cycles after an JsConstants.HMOVE (04/13/02).
                        if (((clock - myLastHMOVEClock) == (20 * 3)) && (hpos == 69)) {
                            myPOSM0 = 8;
                        }
                        setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));
                        break;
                    }

                case JsConstants.RESM1:    // Reset Missile 1
                    {
                        var hpos = (clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;
                        myPOSM1 = hpos < JsConstants.CLOCKS_PER_LINE_BLANK ? 2 : (((hpos - JsConstants.CLOCKS_PER_LINE_BLANK) + 4) % JsConstants.CLOCKS_PER_LINE_VISIBLE);

                        // TODO: Remove the following special hack for Pitfall II by
                        // figuring out what really happens when Reset Missile
                        // occurs 3 cycles after an JsConstants.HMOVE (04/13/02).
                        if (((clock - myLastHMOVEClock) == (3 * 3)) && (hpos == 18)) {
                            myPOSM1 = 3;
                        }

                        setCurrentM1Mask(myPOSM1 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM1 & 0xFC));

                        break;
                    }

                case JsConstants.RESBL:    // Reset Ball
                    {
                        var hpos = (clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL;
                        myPOSBL = hpos < JsConstants.CLOCKS_PER_LINE_BLANK ? 2 : (((hpos - JsConstants.CLOCKS_PER_LINE_BLANK) + 4) % JsConstants.CLOCKS_PER_LINE_VISIBLE);

                        // TODO: Remove the following special hack for Escape from the
                        // Mindmaster by figuring out what really happens when Reset Ball
                        // occurs 18 cycles after an JsConstants.HMOVE (01/09/99).
                        if (((clock - myLastHMOVEClock) == (18 * 3)) &&
                        ((hpos == 60) || (hpos == 69))) {
                            myPOSBL = 10;
                        }
                        // TODO: Remove the following special hack for Decathlon by
                        // figuring out what really happens when Reset Ball
                        // occurs 3 cycles after an JsConstants.HMOVE (04/13/02).
                        else if (((clock - myLastHMOVEClock) == (3 * 3)) && (hpos == 18)) {
                            myPOSBL = 3;
                        }
                        // TODO: Remove the following special hack for Robot Tank by
                        // figuring out what really happens when Reset Ball
                        // occurs 7 cycles after an JsConstants.HMOVE (04/13/02).
                        else if (((clock - myLastHMOVEClock) == (7 * 3)) && (hpos == 30)) {
                            myPOSBL = 6;
                        }
                        // TODO: Remove the following special hack for Hole Hunter by
                        // figuring out what really happens when Reset Ball
                        // occurs 6 cycles after an JsConstants.HMOVE (04/13/02).
                        else if (((clock - myLastHMOVEClock) == (6 * 3)) && (hpos == 27)) {
                            myPOSBL = 5;
                        }
                        setCurrentBLMask(myPOSBL & 0x03, (myTIAPokeRegister[JsConstants.CTRLPF] & 0x30) >> 4, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSBL & 0xFC));

                        break;
                    }

                    // AUDIO REGISTER POKE
                case JsConstants.AUDC0:    // Audio control 0
                case JsConstants.AUDC1:    // Audio control 1
                case JsConstants.AUDF0:    // Audio frequency 0
                case JsConstants.AUDF1:    // Audio frequency 1
                case JsConstants.AUDV0:    // Audio volume 0
                case JsConstants.AUDV1:    // Audio volume 1
                    getAudio().pokeAudioRegister(addr, aByteValue, mySystem.getCycles()); //outsource to JSAudio
                    break;
                case JsConstants.GRP0: //0x1B:    // Graphics Player 0
                    {
                        // Set player 0 graphics
                        // myGRP0 = aByteValue; //(myBitEnabled[TIABitP0] ? aByteValue : 0);

                        // Copy player 1 graphics into its delayed register
                        myDGRP1 = myTIAPokeRegister[JsConstants.GRP1];

                        // Get the "current" data for JsConstants.GRP0 base on delay register and reflect
                        var grp0 = bool(myTIAPokeRegister[JsConstants.VDELP0] & JsConstants.BIT0) ? myDGRP0 : myTIAPokeRegister[JsConstants.GRP0];
                        myCurrentGRP0 = bool(myTIAPokeRegister[JsConstants.REFP0] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp0] : grp0;

                        // Get the "current" data for JsConstants.GRP1 base on delay register and reflect
                        var grp1 = bool(myTIAPokeRegister[JsConstants.VDELP1] & JsConstants.BIT0) ? myDGRP1 : myTIAPokeRegister[JsConstants.GRP1];
                        myCurrentGRP1 = bool(myTIAPokeRegister[JsConstants.REFP1] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp1] : grp1;

                        // Set enabled object bits
                        if (myCurrentGRP0 != 0)
                            myEnabledObjects |= JsConstants.BIT_P0;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_P0;

                        if (myCurrentGRP1 != 0)
                            myEnabledObjects |= JsConstants.BIT_P1;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_P1;

                        break;
                    }

                case JsConstants.GRP1: //0x1C:    // Graphics Player 1
                    {
                        // Set player 1 graphics
                        // myGRP1 = aByteValue; //(myBitEnabled[TIABitP1] ? aByteValue : 0);

                        // Copy player 0 graphics into its delayed register
                        myDGRP0 = myTIAPokeRegister[JsConstants.GRP0];

                        // Copy ball graphics into its delayed register
                        myDENABL = bool(myTIAPokeRegister[JsConstants.ENABL] & JsConstants.BIT1);

                        // Get the "current" data for JsConstants.GRP0 base on delay register
                        var grp0 = bool(myTIAPokeRegister[JsConstants.VDELP0] & JsConstants.BIT0) ? myDGRP0 : myTIAPokeRegister[JsConstants.GRP0];
                        myCurrentGRP0 = bool(myTIAPokeRegister[JsConstants.REFP0] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp0] : grp0;

                        // Get the "current" data for JsConstants.GRP1 base on delay register
                        var grp1 = bool(myTIAPokeRegister[JsConstants.VDELP1] & JsConstants.BIT0) ? myDGRP1 : myTIAPokeRegister[JsConstants.GRP1];
                        myCurrentGRP1 = bool(myTIAPokeRegister[JsConstants.REFP1] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp1] : grp1;

                        // Set enabled object bits
                        if (myCurrentGRP0 != 0)
                            myEnabledObjects |= JsConstants.BIT_P0;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_P0;

                        if (myCurrentGRP1 != 0)
                            myEnabledObjects |= JsConstants.BIT_P1;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_P1;

                        if (bool(myTIAPokeRegister[JsConstants.VDELBL] & JsConstants.BIT0) ? myDENABL : bool(myTIAPokeRegister[JsConstants.ENABL] & JsConstants.BIT1))
                            myEnabledObjects |= JsConstants.BIT_BL;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_BL;

                        break;
                    }

                case JsConstants.ENAM0:    // Enable Missile 0 graphics
                    {
                        // myENAM0 = bool(myBitEnabled[TIABitM0] ? aByteValue & 0x02 : 0);
                        //   if (myBitEnabled[TIABitM0] == false) myTIAPokeRegister[JsConstants.ENAM0]=0;
                        if (bool(myTIAPokeRegister[JsConstants.ENAM0] & JsConstants.BIT1) && !isRESMP0())
                            myEnabledObjects |= JsConstants.BIT_M0;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_M0;
                        break;
                    }

                case JsConstants.ENAM1:    // Enable Missile 1 graphics
                    {
                        //myENAM1 = bool(myBitEnabled[TIABitM1] ? aByteValue & 0x02 : 0);
                        //  if (myBitEnabled[TIABitM1] == false) myTIAPokeRegister[JsConstants.ENAM1]=0;
                        if (bool(myTIAPokeRegister[JsConstants.ENAM1] & JsConstants.BIT1) && !isRESMP1())
                            myEnabledObjects |= JsConstants.BIT_M1;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_M1;
                        break;
                    }

                case JsConstants.ENABL:    // Enable Ball graphics
                    {
                        //  myENABL = bool(myBitEnabled[TIABitBL] ? aByteValue & 0x02 : 0);
                        //    if (myBitEnabled[TIABitBL] == false) myTIAPokeRegister[JsConstants.ENABL]=0;
                        if (bool(myTIAPokeRegister[JsConstants.VDELBL] & JsConstants.BIT0) ? myDENABL : bool(myTIAPokeRegister[JsConstants.ENABL] & JsConstants.BIT1))
                            myEnabledObjects |= JsConstants.BIT_BL;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_BL;

                        break;
                    }

                case JsConstants.HMP0:    // Horizontal Motion Player 0
                    {
                        //  int zSignedVal=com.mauvila.mvunsigned.MvUnsignedUtil.toSignedByteValue(aByteValue)
                        // myHMP0 = aByteValue >> 4;
                        break;
                    }

                case JsConstants.HMP1:    // Horizontal Motion Player 1
                    {
                        // myHMP1 = aByteValue >> 4;
                        break;
                    }

                case JsConstants.HMM0:    // Horizontal Motion Missile 0
                    {
                        var tmp = aByteValue >> 4;

                        // Should we enabled TIA M0 "bug" used for stars in Cosmic Ark?
                        if ((clock == (myLastHMOVEClock + 21 * 3)) && ((zPreviousValue >> 4) == 7) && (tmp == 6)) {
                            myM0CosmicArkMotionEnabled = true;
                            myM0CosmicArkCounter = 0;
                        }

                        // myHMM0 = tmp;
                        break;
                    }

                case JsConstants.HMM1:    // Horizontal Motion Missile 1
                    {
                        // myHMM1 = aByteValue >> 4;
                        break;
                    }

                case JsConstants.HMBL:    // Horizontal Motion Ball
                    {
                        //  myHMBL = aByteValue >> 4;
                        break;
                    }

                case JsConstants.VDELP0:    // Vertial Delay Player 0
                    {
                        //myVDELP0 = bool(aByteValue & 0x01);

                        var grp0 = bool(myTIAPokeRegister[JsConstants.VDELP0] & JsConstants.BIT0) ? myDGRP0 : myTIAPokeRegister[JsConstants.GRP0];
                        myCurrentGRP0 = bool(myTIAPokeRegister[JsConstants.REFP0] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp0] : grp0;

                        if (myCurrentGRP0 != 0)
                            myEnabledObjects |= JsConstants.BIT_P0;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_P0;
                        break;
                    }

                case JsConstants.VDELP1:    // Vertial Delay Player 1
                    {
                        // myVDELP1 = bool(aByteValue & 0x01);
                        var grp1 = bool(myTIAPokeRegister[JsConstants.VDELP1] & JsConstants.BIT0) ? myDGRP1 : myTIAPokeRegister[JsConstants.GRP1];
                        myCurrentGRP1 = bool(myTIAPokeRegister[JsConstants.REFP1] & JsConstants.BIT3) ? JsConstants.PLAYER_REFLECT_TABLE[grp1] : grp1;
                        if (myCurrentGRP1 != 0) myEnabledObjects |= JsConstants.BIT_P1;
                        else myEnabledObjects &= ~JsConstants.BIT_P1;
                        break;
                    }

                case JsConstants.VDELBL:    // Vertial Delay Ball
                    {
                        //  myVDELBL = bool(aByteValue & 0x01);

                        if (bool(myTIAPokeRegister[JsConstants.VDELBL] & JsConstants.BIT0) ? myDENABL : bool(myTIAPokeRegister[JsConstants.ENABL] & JsConstants.BIT1))
                            myEnabledObjects |= JsConstants.BIT_BL;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_BL;
                        break;
                    }

                case JsConstants.RESMP0:    // Reset missile 0 to player 0
                    {
                        if (((zPreviousValue & JsConstants.BIT1) != 0) && !bool(aByteValue & 0x02)) {
                            var middle;

                            if ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07) == 0x05)
                                middle = 8;
                            else if ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07) == 0x07)
                                middle = 16;
                            else
                                middle = 4;

                            myPOSM0 = (myPOSP0 + middle) % JsConstants.CLOCKS_PER_LINE_VISIBLE;
                            setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));
                        }

                        //myRESMP0 = bool(aByteValue & 0x02);

                        if (bool(myTIAPokeRegister[JsConstants.ENAM0] & JsConstants.BIT1) && !isRESMP0())
                            myEnabledObjects |= JsConstants.BIT_M0;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_M0;

                        break;
                    }

                case JsConstants.RESMP1:    // Reset missile 1 to player 1
                    {
                        if (((zPreviousValue & JsConstants.BIT1) != 0) && !bool(aByteValue & 0x02)) {
                            var middle;

                            if ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07) == 0x05)
                                middle = 8;
                            else if ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07) == 0x07)
                                middle = 16;
                            else
                                middle = 4;

                            myPOSM1 = (myPOSP1 + middle) % JsConstants.CLOCKS_PER_LINE_VISIBLE;

                            setCurrentM1Mask(myPOSM1 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM1 & 0xFC));
                        }

                        //myRESMP1 = bool(aByteValue & 0x02);

                        if (bool(myTIAPokeRegister[JsConstants.ENAM1] & JsConstants.BIT1) && !isRESMP1())
                            myEnabledObjects |= JsConstants.BIT_M1;
                        else
                            myEnabledObjects &= ~JsConstants.BIT_M1;
                        break;
                    }

                case JsConstants.HMOVE: //0x2A:    // Apply horizontal motion JsConstants.HMOVE
                    {
                        // Figure out what cycle we're at
                        var x = Math.floor(((clock - myClockWhenFrameStarted) % JsConstants.CLOCKS_PER_LINE_TOTAL) / 3);

                        // See if we need to enable the JsConstants.HMOVE blank bug
                        if (myAllowHMOVEBlanks && JsConstants.HMOVE_BLANK_ENABLE_CYCLES[x]) {
                            // TODO: Allow this to be turned off using properties...
                            myHMOVEBlankEnabled = true;
                        }

                        myPOSP0 += JsConstants.COMPLETE_MOTION_TABLE[x][myTIAPokeRegister[JsConstants.HMP0] >> 4];
                        myPOSP1 += JsConstants.COMPLETE_MOTION_TABLE[x][myTIAPokeRegister[JsConstants.HMP1] >> 4];
                        myPOSM0 += JsConstants.COMPLETE_MOTION_TABLE[x][myTIAPokeRegister[JsConstants.HMM0] >> 4];
                        myPOSM1 += JsConstants.COMPLETE_MOTION_TABLE[x][myTIAPokeRegister[JsConstants.HMM1] >> 4];
                        myPOSBL += JsConstants.COMPLETE_MOTION_TABLE[x][myTIAPokeRegister[JsConstants.HMBL] >> 4];

                        if (myPOSP0 >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
                            myPOSP0 -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        else if (myPOSP0 < 0)
                            myPOSP0 += JsConstants.CLOCKS_PER_LINE_VISIBLE;

                        if (myPOSP1 >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
                            myPOSP1 -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        else if (myPOSP1 < 0)
                            myPOSP1 += JsConstants.CLOCKS_PER_LINE_VISIBLE;

                        if (myPOSM0 >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
                            myPOSM0 -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        else if (myPOSM0 < 0)
                            myPOSM0 += JsConstants.CLOCKS_PER_LINE_VISIBLE;

                        if (myPOSM1 >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
                            myPOSM1 -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        else if (myPOSM1 < 0)
                            myPOSM1 += JsConstants.CLOCKS_PER_LINE_VISIBLE;

                        if (myPOSBL >= JsConstants.CLOCKS_PER_LINE_VISIBLE)
                            myPOSBL -= JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        else if (myPOSBL < 0)
                            myPOSBL += JsConstants.CLOCKS_PER_LINE_VISIBLE;
                        setCurrentBLMask(myPOSBL & 0x03, (myTIAPokeRegister[JsConstants.CTRLPF] & 0x30) >> 4, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSBL & 0xFC));

                        setCurrentP0Mask(myPOSP0 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP0 & 0xFC));

                        setCurrentP1Mask(myPOSP1 & 0x03, 0, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSP1 & 0xFC));

                        setCurrentM0Mask(myPOSM0 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ0] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ0] & 0x30) >> 4) /*| 0x01*/, JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM0 & 0xFC));
                        setCurrentM1Mask(myPOSM1 & 0x03, myTIAPokeRegister[JsConstants.NUSIZ1] & 0x07, ((myTIAPokeRegister[JsConstants.NUSIZ1] & 0x30) >> 4), JsConstants.CLOCKS_PER_LINE_VISIBLE - (myPOSM1 & 0xFC));

                        // Remember what clock JsConstants.HMOVE occured at
                        myLastHMOVEClock = clock;

                        // Disable TIA M0 "bug" used for stars in Cosmic ark
                        myM0CosmicArkMotionEnabled = false;
                        break;
                    }

                case JsConstants.HMCLR: //0x2b:    // Clear horizontal motion registers
                    {
                        myTIAPokeRegister[JsConstants.HMP0] = 0;
                        myTIAPokeRegister[JsConstants.HMP1] = 0;
                        myTIAPokeRegister[JsConstants.HMM0] = 0;
                        myTIAPokeRegister[JsConstants.HMM1] = 0;
                        myTIAPokeRegister[JsConstants.HMBL] = 0;
                        break;
                    }

                case JsConstants.CXCLR: //0x2c:    // Clear collision latches
                    {
                        myCollision = 0;
                        break;
                    }

                default:
                    {
                        break;
                    }
            }
        }
    }

    //TODO : fix bug with "electrophoresis ladder" looking thing on left side of screen
    //             -maybe a TIA bug, or maybe a CPU bug

    var debugRenderTypes = new Array(256);
    var debugStraightPoke = false;
    var debugLockP0Mask = false;
    var debugLockP1Mask = false;
    var debugRegLocked = new Array(0x2C);

    tia.debugResetRenderTypes = function () {
        debugRenderTypes = Array(256);
    }

    tia.debugGetRenderTypes = function () {
        return debugRenderTypes;
    }

    tia.setDebugLockRegister = function (aItem, aValue) {
        debugRegLocked[aItem] = aValue;
    }

    tia.getDebugLockRegister = function (aItem) {
        return debugRegLocked[aItem];
    }

    tia.debugUnlockAllRegisters = function () {
        debugRegLocked = new Array(0x2C);
        debugLockP0Mask = false;
        debugLockP1Mask = false;
    }

    tia.debugGetNUSIZ0 = function () {
        return myTIAPokeRegister[JsConstants.NUSIZ0];
    }

    tia.debugGetNUSIZ1 = function () {
        return myTIAPokeRegister[JsConstants.NUSIZ1];
    }

    tia.debugSetP0Mask = function (aA, aB, aC, aD) {
        setCurrentP0Mask(aA, aB, aC, aD);
        debugLockP0Mask = true;
    }

    tia.debugSetP1Mask = function (aA, aB, aC, aD) {
        setCurrentP1Mask(aA, aB, aC, aD);
        debugLockP1Mask = true;
    }

    tia.debugDumpRegs = function () {
        var zSB = "";
        zSB += "JsConstants.ENAM0=" + bool(myTIAPokeRegister[JsConstants.ENAM0] & JsConstants.BIT1) + "; JsConstants.NUSIZ0=" + tia.dbgHex(myTIAPokeRegister[JsConstants.NUSIZ0]) + "; JsConstants.ENAM1=" + bool(myTIAPokeRegister[JsConstants.ENAM1] & JsConstants.BIT1) + "; JsConstants.NUSIZ1=" + tia.dbgHex(myTIAPokeRegister[JsConstants.NUSIZ1]) + "\n";
        // zSB.append("JsConstants.ENAM0=" + bool(myTIAPokeRegister[JsConstants.ENAM0] & JsConstants.BIT1) + "\n");
        zSB += "CurrentM0Mask : alignment=" + myCurrentM0Mask[0] + ", num=" + myCurrentM0Mask[1] + ", size=" + myCurrentM0Mask[2] + ", x=" + myCurrentM0Mask[3] + "\n";
        zSB += "CurrentM1Mask : alignment=" + myCurrentM1Mask[0] + ", num=" + myCurrentM1Mask[1] + ", size=" + myCurrentM1Mask[2] + ", x=" + myCurrentM1Mask[3] + "\n";
        zSB += "CurrentP0Mask : alignment=" + myCurrentP0Mask[0] + ", num=" + myCurrentP0Mask[1] + ", size=" + myCurrentP0Mask[2] + ", x=" + myCurrentP0Mask[3] + "\n";
        zSB += "CurrentP1Mask : alignment=" + myCurrentP1Mask[0] + ", num=" + myCurrentP1Mask[1] + ", size=" + myCurrentP1Mask[2] + ", x=" + myCurrentP1Mask[3] + "\n";

        zSB += "M0Pos=" + myPOSM0 + "; M1Pos=" + myPOSM1 + "\n";
        zSB += "P0Pos=" + myPOSP0 + "; P1Pos=" + myPOSP1 + "\n";
        zSB += "JsConstants.COLUBK=0x" + tia.dbgHex(myTIAPokeRegister[JsConstants.COLUBK]) + "\n";
        return zSB;
    }

    tia.debugPoke = function (aAddr, aValue) {
        debugStraightPoke = true;
        tia.poke(aAddr, aValue);
        debugStraightPoke = false;
    }

    tia.dbgHex = function (aNum) {
        if (!isNaN(aNum))
            return "0x" + aNum.toString(16);
        else
            return aNum;
    }
}
