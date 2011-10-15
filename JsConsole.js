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
* The console - the actual 2600 case.  This class encompasses the other emulation
* classes.
* 
* <p>
* Consult the "Stella Programmer's Guide" (Steve Wright, 1979) for more information.
* This guide was written back in the 1970s and was used originally by people who programmed
* games for the Atari 2600.  It is widely available on the Internet.
* 
* <ul>The console will contain:
* <li>1 TIA chip (TIA) - graphics/sound creator, also manages analog (paddle) controllers
* <li>1 RIOT chip (JsRiot) - provides the RAM, some timers, and manages digital (joystick) controllers
* <li>1 CPU (contained within a JSSystem object)
* <li>1 ROM (Cartridge) - the game to play
* </ul>
* 
* <p>The console (and thus the emulator) is run by having an external class repeatedly
* call console.doFrame().  Each call represents a frame, and typically there are about 50-60 frames/sec.</p>
* 
* <p>
*     Here is the core emulation in a nutshell:
*     Some kind of GUI class has a timer in it that is set to execute once every 17 milliseconds
*     (approximately 60 times per minute).  (For the standard NTSC games, that is.)  So 60 times per second,
*     the console.doFrame() method in JsConsole is called.  This method renders a visual frame of the animation,
*     and performs any type of calculations/"game logic" that goes with it.
* </p> 
* <p> 
* The console.doFrame() method will do three main things.  First, it will have the JSTIA class execute
* the CPU, which reads the ROM instructions...the CPU will in turn, based upon the instructions it 
* reads, send data to the TIA (mostly) which tell the TIA what to draw.  The TIA changes the 
* pixel data in the JSVideo class.  (The CPU also sends audio data to the TIA, which forwards it
* to the JSAudio object.)  When the CPU reaches the instruction that signals the end
* of a visual frame, the TIA class quits running the CPU.  Second, the doFrame method tells the 
* JsVideo to display its newly arranged visual data...i.e. paint it to the canvas.  Third, the 
* console.doFrame() method tells JSAudio to play a sound based on the sound data that the CPU/ROM sent to the
* TIA class. <br>
* So that's the emulation in a nutshell.
*     
* </p>
* @author Bradford W. Mott and the Stella team (original)
* J.L. Allen (Java translation)
*/
function JsConsole(aConsoleClient) {
    var console = this;

    var DEFAULT_YSTART = 34;
    var DEFAULT_DISPLAY_HEIGHT = 210;
    var DEFAULT_DISPLAY_WIDTH = JsConstants.CLOCKS_PER_LINE_VISIBLE;
    var TRASH_FRAMES = 60; //used in detection of display height/display type

    var myFrameRate = 60;
    var myDisplayFormat = DisplayFormat.NTSC;

    var myDisplayHeight = DEFAULT_DISPLAY_HEIGHT;
    var myDisplayWidth = DEFAULT_DISPLAY_WIDTH;
    var myYStart = DEFAULT_YSTART;

    var myConsoleClient = null;

    var myControllers = new Array(2);

    var mySwitches = 0xFF;

    var myTIA = null;
    var mySystem = null;
    var myCart = null;
    var myRiot = null;
    var myVideo = null;
    var myAudio = null; //transient - therefore, not stored in a "saved game"
    console.video = null;

    var myTelevisionMode = JsConstants.TELEVISION_MODE_OFF;

    function ConsoleSwitchItem(aIndex, aBitMask) {
        return {
            getIndex: function () { return aIndex; },
            getBitMask: function () { return aBitMask; }
        }
    }

    var ConsoleSwitch = {
        SWITCH_RESET: ConsoleSwitchItem(0, JsConstants.BIT0),
        SWITCH_SELECT: ConsoleSwitchItem(1, JsConstants.BIT1),
        SWITCH_BW: ConsoleSwitchItem(2, JsConstants.BIT3),
        SWITCH_DIFFICULTY_P0: ConsoleSwitchItem(3, JsConstants.BIT6),
        SWITCH_DIFFICULTY_P1: ConsoleSwitchItem(4, JsConstants.BIT7)
    }

    function init() {
        console.setConsoleClient(aConsoleClient);
        //   myUserPaletteDefined=false;

        initializeAudio();
        initializeVideo();

        console.flipSwitch(ConsoleSwitch.SWITCH_RESET, false);
        console.flipSwitch(ConsoleSwitch.SWITCH_SELECT, false);
        console.flipSwitch(ConsoleSwitch.SWITCH_BW, false);
        console.flipSwitch(ConsoleSwitch.SWITCH_DIFFICULTY_P0, false); //amateur setting
        console.flipSwitch(ConsoleSwitch.SWITCH_DIFFICULTY_P1, false); //amateur setting

        myControllers[0] = new JsController(JsConstants.Jack.LEFT);
        myControllers[1] = new JsController(JsConstants.Jack.RIGHT);

        mySystem = new JsSystem(console);
        myRiot = new JsRiot(console);
        myTIA = new JsTIA(console);

        mySystem.attach(myRiot);
        mySystem.attach(myTIA);
    }

    /**
    * The console should (must) be destroyed right before the object is no longer used,
    * e.g. when loading a serialized console from a stream.  Destroying the console
    * will free up the audio resources that the audio object has reserved.
    */
    console.destroy = function () {
        if (myAudio != null) {
            myAudio.close();
            myAudio = null;
        }
    }

    function detectDisplayHeight() {
        mySystem.reset();
        for (var i = 0; i < TRASH_FRAMES; i++) {
            myTIA.processFrame();
        }

        // System.out.println("debug : myDetectedYStop=" + myTIA.getDetectedYStop() + ", myDetectedYStart=" + myTIA.getDetectedYStart());
        myDisplayHeight = myTIA.getDetectedYStop() - myTIA.getDetectedYStart(); //getVBlankOn() - myTIA.getVBlankOff();
        if (myDisplayHeight <= 0) myDisplayHeight += myTIA.getVSyncOn();
        myDisplayHeight = Math.min(myDisplayHeight, JsConstants.FRAME_Y_MAX);

        if (myDisplayHeight < JsConstants.FRAME_Y_MIN) {
            //TODO : make sure this doesn't happen
            myDisplayHeight = 210;
            myYStart = 34;
        }

        myYStart = myTIA.getDetectedYStart();

        if ((myDisplayFormat == DisplayFormat.PAL) && (myDisplayHeight == 210))
            myDisplayHeight = 250;

        adjustBackBuffer();
    }

    function detectDisplayFormat() {
        // Run the system for 60 frames, looking for PAL scanline patterns
        // We assume the first 30 frames are garbage, and only consider
        // the second 30 (useful to get past SuperCharger BIOS)
        // Unfortunately, this means we have to always enable 'fastscbios',
        // since otherwise the BIOS loading will take over 250 frames!
        mySystem.reset();

        var zPalCount = 0;

        for (var i = 0; i < TRASH_FRAMES; i++) {
            myTIA.processFrame();
        }

        for (var i = 0; i < 30; i++) {
            myTIA.processFrame();
            if (myTIA.scanlines() > 285) {
                ++zPalCount;
            }
        }

        if (zPalCount >= 15)
            setDisplayFormat(DisplayFormat.PAL);
        else
            setDisplayFormat(DisplayFormat.NTSC);
    }

    console.changeYStart = function (aNewYStart) {
        if (aNewYStart != myYStart) {
            myYStart = aNewYStart;
            myTIA.frameReset();
        }
    }

    console.changeDisplayHeight = function (aNewHeight) {
        if (aNewHeight != myDisplayHeight) {
            myDisplayHeight = aNewHeight;
            adjustBackBuffer();
            myVideo.refresh();
            myTIA.frameReset();
        }
    }

    function adjustBackBuffer() {
        console.getVideo().adjustBackBuffer(JsVideoConsts.DEFAULT_WIDTH, myDisplayHeight);
    }

    console.getDisplayWidth = function () {
        return myDisplayWidth;
    }

    console.getDisplayHeight = function () {
        return myDisplayHeight;
    }

    console.getYStart = function () {
        return myYStart;
    }

    console.setConsoleClient = function (aConsoleClient) {
        myConsoleClient = aConsoleClient;
    }

    console.getConsoleClient = function () {
        return myConsoleClient;
    }

    console.getController = function (jack) {
        return (jack == JsConstants.Jack.LEFT) ? myControllers[0] : myControllers[1];
    }

    console.getTIA = function () {
        return myTIA;
    }

    console.getVideo = function () {
        return myVideo;
    }

    console.getAudio = function () {
        return myAudio;
    }

    console.getSystem = function () {
        return mySystem;
    }

    console.getCartridge = function () {
        return myCart;
    }

    console.getRiot = function () {
        return myRiot;
    }

    console.getNominalFrameRate = function () {
        // Set the correct framerate based on the format of the ROM
        // This can be overridden by changing the framerate in the
        // VideoDialog box or on the commandline, but it can't be saved
        // (ie, framerate is now solely determined based on ROM format).
        // int framerate = myOSystem.settings().getInt("framerate");
        // if(framerate == -1) {
        return myFrameRate;
    }

    console.setNominalFrameRate = function (aFrameRate) {
        myFrameRate = aFrameRate;
        console.getAudio().setNominalDisplayFrameRate(aFrameRate);
    }

    console.getDisplayFormat = function () {
        return myDisplayFormat;
    }

    function setDisplayFormat(aDisplayFormat) {
        myDisplayFormat = aDisplayFormat;
        console.setNominalFrameRate(aDisplayFormat.getDisplayRate());
        console.getVideo().setTIAPalette(aDisplayFormat.getDisplayPalette());

        mySystem.reset();
    }

    function reinstallCore() {
        mySystem.attach(myRiot);
        mySystem.attach(myTIA);
    }

    function initializeVideo() {
        if (myVideo == null) myVideo = new JsVideo(console);
        console.video = myVideo;
        console.getVideo().initialize();
    }

    function initializeAudio() {
        if (myAudio == null)
            myAudio = new JsAudio(console);
        else
            myAudio.close();   //Closes any open audio resources

        console.getAudio().setNominalDisplayFrameRate(console.getNominalFrameRate());
        console.getAudio().initialize();
    }

    console.setTelevisionMode = function (aTelevisionMode) {
        myTelevisionMode = aTelevisionMode;
    }

    console.getTelevisionMode = function () {
        return myTelevisionMode;
    }

    console.insertCartridge = function (aCart, aDisplayHeight) {
        if (aDisplayHeight == undefined)
            aDisplayHeight = -1;

        if ((myCart != null) && (myCart != aCart)) {
            mySystem.unattach(myCart);
            reinstallCore();
        }

        myVideo.clearBackBuffer();
        myVideo.clearBuffers();
        myCart = aCart;

        if (myCart != null) {
            myCart.setConsole(console);
            mySystem.attach(myCart);
        }

        mySystem.reset();

        detectDisplayFormat();

        if (aDisplayHeight <= 0)
            detectDisplayHeight();
        else
            myDisplayHeight = aDisplayHeight;

        adjustBackBuffer();

        // Make sure height is set properly for PAL ROM
        if (myCart != null) {
            console.setTelevisionMode(JsConstants.TELEVISION_MODE_GAME);
        }

        // Reset, the system to its power-on state
        mySystem.reset();
    }

    console.createCartridge = function (aROMData, aCartridgeType) {
        if ((aCartridgeType == null) || (aCartridgeType.trim().equals("")))
            return Cartridge.create(aROMData);
        else
            return Cartridge.create(aROMData, aCartridgeType);
    }

    console.createCartridge = function (aROMData, aCartridgeType) {
        var zCart = null;
        try {
            if (aROMData != null) {
                zCart = console.createCartridge(aROMData, aCartridgeType);
                //  if (aCartridgeType==null) zCart=Cartridge.create(zROMData);
                //  else zCart=Cartridge.create(zROMData, aCartridgeType);

            }
            else {
                throw "Invalid cartidge";
            }
        }
        catch (msg) {
            throw msg;
        }

        return zCart;
    }

    console.createCartridge = function (aROMData) {
        return console.createCartridge(aROMData, null);
    }

    /**
    * This is the main method of the class.  This method should be called
    * by the "outside" GUI object for every intended frame...that is,
    * the runner object should call this 50-60 times/sec, depending on
    * what the designated frame rate is.
    * @throws jstella.core.JSException
    */
    console.doFrame = function () {
        //profiling note - Sep 3 2007 - it seems that a lot of times, whenever console.doFrame() lasts long (e.g. 59 milliseconds), that 
        //  the processFrame is taking up most of the time

        if (myVideo != null) {
            if (console.getTelevisionMode() == JsConstants.TELEVISION_MODE_GAME) {
                if (myCart != null) {
                    myTIA.processFrame();
                    myVideo.doFrameVideo();
                    myAudio.doFrameAudio(mySystem.getCycles(), console.getNominalFrameRate());
                }
            }
            else if (console.getTelevisionMode() == JsConstants.TELEVISION_MODE_SNOW) {
                myVideo.doSnow();
            }
            else if (console.getTelevisionMode() == JsConstants.TELEVISION_MODE_TEST_PATTERN) {
                myVideo.doTestPattern();
            }
        }
        else {
            throw "JsStella Error : cannot animate";
        }
    }

    console.updateVideoFrame = function () {
        if (myVideo != null) {
            myVideo.console.updateVideoFrame();
        }
    }

    console.readSwitches = function () {
        return mySwitches;
    }

    /**
    * Flips a console switch.
    * Switch down is equivalent to setting the bit to zero.
    * See the SWITCH constants in the JsConsole class.
    * <p>
    * RESET - down to reset
    * SELECT - down to select
    * BW - down to change into black and white mode
    * DIFFICULTY P0 - down to set player 0 to easy
    * DIFFICULTY P1 - down to set player 1 to easy
    *
    * </p>
    * @param aSwitchType what switch to flip (see SWITCH constants in JSConstants)
    * @param aSwitchDown true if the switch should be down (see method description for details)
    */
    console.flipSwitch = function (aSwitchType, aSwitchDown) {
        if (aSwitchDown)
            mySwitches &= ~aSwitchType.getBitMask();
        else
            mySwitches |= aSwitchType.getBitMask();
    }

    console.isSwitchOn = function (aSwitch) {
        return ((mySwitches & aSwitch.getBitMask()) == 0); //in this case, a bit value of zero means 'on'
    }

    console.setPhosphorEnabled = function (aEnable) {
        console.getVideo().setPhosphorEnabled(aEnable);
    }

    console.isPhosphorEnabled = function () {
        return console.getVideo().getPhosphorEnabled();
    }

    console.setStereoSound = function (aEnable) {
        if (aEnable == true)
            console.getAudio().setChannelNumber(2);
        else
            console.getAudio().setChannelNumber(1);
    }

    console.isStereoSound = function () {
        return (console.getAudio().getChannelNumber() == 2);
    }

    console.setSoundEnabled = function (aEnabled) {
        console.getAudio().setSoundEnabled(aEnabled);
    }

    console.isSoundEnabled = function () {
        return console.getAudio().isSoundEnabled();
    }

    console.grayCurrentFrame = function () {
        console.getVideo().grayCurrentFrame();
    }

    console.pauseAudio = function () {
        console.getAudio().pauseAudio();
    }

    //TODO : Figure out if this setup (using java.util.Timer) is thread safe
    //TODO : Fix letter box mode...junk keeps appearing on margins (Sep 7 2007)
    //TODO : Fix flaws in emulator that cause AIR-RAID to act funny
    //TODO : Oct 2007 - use zip-based single file for repository
    //Misc bugs
    console.debugDoFrame = function () {
        try {
            console.doFrame();
        }
        catch (msg) {
            alert(msg);
        }
    }

    console.debugProcessFrame = function () {
        try {
            myTIA.processFrame();
        }
        catch (msg) {
            alert(msg);
        }
    }

    console.debugDoFrameVideo = function () {
        try {
            myVideo.doFrameVideo(); //.processFrame();
        }
        catch (msg) {
            alert(msg);
        }
    }

    init();
}
