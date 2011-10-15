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
* Creates a new instance of JsAudio
* @param aConsole the console that owns this object
*/
function JsAudio(myConsole) {
    var audio = this;

    var CPU_SPEED = 1193191.66666667; //6502 speed is 1.19 MHz (million cycles /sec)

    var JAVA_SOUND_SAMPLE_RATE = 44100; //44,100 samples/sec
    var TIA_SAMPLE_RATE = 31400;

    var CYCLES_PER_SAMPLE = CPU_SPEED / (JAVA_SOUND_SAMPLE_RATE * 1.0); //27.056

    // *** AUDIO FORMAT CONSTANTS ***
    var BYTES_PER_SAMPLE = 1;
    var BITS_PER_SAMPLE = BYTES_PER_SAMPLE * 8;
    var BIG_ENDIAN = true;
    var SIGNED_VALUE = true;
    var CHANNELS = 1;

    //  *** AUDIO BUFFER MANAGEMENT ***
    var DEFAULT_BUFFER_CUSHION = 4000; //samples left in buffer to prevent underflow

    var myAudio = null;
    var myWave = new RIFFWAVE();

    //Misc
    var myPreOutputBuffer = new Array(JAVA_SOUND_SAMPLE_RATE * 4);
    var myInitSuccess = false;

    // Poke/Queue related variables
    // private java.util.Queue<AudioRegisterPoke> myPokeQueue=new java.util.ArrayDeque<AudioRegisterPoke>(); //J6SE only
    var myPokeQueue = new Queue(); //J5SE

    var myExcessCycles = 0;
    var myCyclePool = 0;
    var myPreviousCycle = 0;
    var myPreviousPoke = null;

    //Audio registers
    var myAUDC = new Array(2);
    var myAUDF = new Array(2);
    var myAUDV = [1, 1];

    var myFutureAUDC = new Array(2);
    var myFutureAUDF = new Array(2);
    var myFutureAUDV = new Array(2);

    //Synthesis related variables
    var myFrequencyDivider = [new FrequencyDivider(), new FrequencyDivider()]; //[2];    // Frequency dividers
    var myP4 = new Array(2);           // 4-bit register LFSR (lower 4 bits used)
    var myP5 = new Array(2);           // 5-bit register LFSR (lower 5 bits used)
    var myOutputCounter = 0;

    //CONFIG variables
    var myChannels = CHANNELS;
    var myVolumePercentage = 100;
    var myVolumeClip = 128;
    var myNominalDisplayFrameRate = 60;
    var myRealDisplayFrameRate = 60.0;
    var myCycleSampleFactor = 1.0;
    var myAdjustedCyclesPerAudioFrame = CYCLES_PER_SAMPLE;
    //private int myWholeCyclesPerAudioFrame=(int)(CYCLES_PER_SAMPLE / CHANNELS);

    var myBufferCushion = DEFAULT_BUFFER_CUSHION * myChannels;

    var mySoundEnabled = true;

    audio.isSoundEnabled = function () { return mySoundEnabled; }

    audio.setVolume = function (percent) { myVolumePercentage = percent; }

    audio.setSoundEnabled = function (aSoundEnabled) {
        /* if (aSoundEnabled!=mySoundEnabled)
        {
        reset();
        }//end : change in value
        */

        //TODO : better system of figuring out if sound is open/active, and informing user of this
        /*
        if ((mySDLine != null) && (mySDLine.isOpen())) {
        //if (aSoundEnabled==true) mySDLine.start();
        if (aSoundEnabled == false) {
        mySDLine.stop();
        mySDLine.flush();
        }
        } //end : not null
        */

        if (myAudio != null) {
            if (aSoundEnabled)
                myAudio.play();
            else
                myAudio.pause();
        }

        mySoundEnabled = aSoundEnabled;
    }

    audio.pauseAudio = function () {
        /*
        //TODO : a more elegant way of stopping audio temporarily, to keep clicks, etc from occuring during a pause
        if (mySDLine!=null) mySDLine.stop();  
        */

        myAudio.pause();
    }


    /**
    * Sets the nominal (theoretical) display frame rate.  This is usually 60 or 50.
    * See documentation for setRealDisplayFrameRate(...).
    * @param aFrameRate 
    */
    audio.setNominalDisplayFrameRate = function (aFrameRate) {
        myNominalDisplayFrameRate = aFrameRate;
        myPreviousCycle = 0; //? (JLA)
        updateCycleSampleFactor();
    }

    /**
    * The sound object bases its frequency on the display's frame rate.  If the game
    * was designed for 60 frames per second display rate, then it expects to be
    * called that many times per second to accurately produce the correct pitch.
    * Because the timers that are used to run the emulator use "millisecond deley" rather
    * than "frequency", certain frame rates can only be approximated.  
    * For example, a delay of 16 ms is 62.5 frames per second, and a delay of 17 ms
    * is 58.82 frames per second.  
    * To remedy this approximation, the class responsible for timing will notify
    * this class (via JSConsole) to compensate for this inexact.
    * @param aRealFrameRate 
    */
    audio.setRealDisplayFrameRate = function (aRealFrameRate) {
        myRealDisplayFrameRate = aRealFrameRate;
        updateCycleSampleFactor();
    }

    function updateCycleSampleFactor() {
        myCycleSampleFactor = myRealDisplayFrameRate / (myNominalDisplayFrameRate * 1.0);

        myAdjustedCyclesPerAudioFrame = CYCLES_PER_SAMPLE * myCycleSampleFactor;
    }

    audio.systemCyclesReset = function (aCurrentCycle) {
        myPreviousCycle -= aCurrentCycle;
    }

    /**
    * Used when user is saving game (aka a state save).  The only data from this class
    * that needs to be saved are the contents of the registers.  (Sometimes a game
    * will set the register early on and not touch it again.)  This is called
    * during the serialization method of JSConsole.
    * @return The audio register data in array form.
    */
    audio.getAudioRegisterData = function () {
        var zReturn = new Array(6);
        zReturn[0] = myAUDC[0];
        zReturn[1] = myAUDC[1];
        zReturn[2] = myAUDF[0];
        zReturn[3] = myAUDF[1];
        zReturn[4] = myAUDV[0];
        zReturn[5] = myAUDV[1];
        return zReturn;
    }

    /**
    * This is the opposite of the getAudioRegisterData() method.  It is called 
    * by JSConsole after a saved game has been read.
    * @param aData an array of the register values
    */
    audio.setAudioRegisterData = function (aData) {
        setAudioRegister(AUDC0, aData[0]);
        setAudioRegister(AUDC1, aData[1]);
        setAudioRegister(AUDF0, aData[2]);
        setAudioRegister(AUDF1, aData[3]);
        setAudioRegister(AUDV0, aData[4]);
        setAudioRegister(AUDV1, aData[5]);
    }

    /**
    * Changes the audio mode to either mono (channels=1), or stereo (channels=2).
    * @param aChannels Number of channels (1 or 2)
    */
    audio.setChannelNumber = function (aChannels) {
        //assert((aChannels==1)||(aChannels==2));

        if (myChannels != aChannels) //is a change
        {
            myChannels = aChannels;
            audio.initialize();

        } //end : changing value
    }

    /**
    * Returns the number of channels the audio system is using.
    * @return returns a 1 for mono, 2 for stereo
    */
    audio.getChannelNumber = function () {
        return myChannels;
    }

    /**
    * Closes the sound, freeing up system sound resources.
    */
    audio.close = function () {
        try {
            if (myAudio != null)
                myAudio.pause();

        } //end : try
        catch (msg) {
            //TODO : better exception handling
            alert(msg);
        }
    }

    /**
    * Initializes the sound.  After calling this, one should make sure that
    * close() is called when this class is finished.
    */
    audio.initialize = function () {
        try {
            var zPreviouslyEnabled = mySoundEnabled;
            mySoundEnabled = false; //just in case...


            //Step 0 - get rid of old sound system, if one exists
            if (myAudio != null) {
                myAudio.pause();
                myAudio = null;
            } //end : old one exists

            clearPokeQueue();

            //Step 1 - establish what format we're going to use
            //myAudioFormat = new AudioFormat((JAVA_SOUND_SAMPLE_RATE * 1.0), BITS_PER_SAMPLE, myChannels, SIGNED_VALUE, BIG_ENDIAN);
            myWave.header.sampleRate = JAVA_SOUND_SAMPLE_RATE;
            myWave.header.bitsPerSample = BITS_PER_SAMPLE;
            myWave.header.numChannels = myChannels;
            //System.out.println("AudioFormat - sampleRate=" + myAudioFormat.getSampleRate() + ", framerate=" + myAudioFormat.getFrameRate());

            //Step 2 - acquire a Source Data Line
            //var zDLI=new DataLine.Info(SourceDataLine.class, myAudioFormat);
            //System.out.println("Acquiring source data line info - " + zDLI);
            //mySDLine=(SourceDataLine)AudioSystem.getLine(zDLI);

            //Step 3 - open and start that Source Data Line object
            //mySDLine.open(myAudioFormat);
            //mySDLine.start();
            myInitSuccess = true;

            mySoundEnabled = zPreviouslyEnabled;
            myBufferCushion = DEFAULT_BUFFER_CUSHION * myChannels;
            updateCycleSampleFactor();

        } //end : try
        catch (msg) {

            //TODO : some type of notification that audio wasn't available
            myInitSuccess = false;

        } //end : catch - Line Unavailable
    }

    /**
    * Checks to see if the required Java Sound objects were created successfully.
    * @return true if sound objects created successfully
    */
    audio.isSuccessfullyInitialized = function () {
        return myInitSuccess;
    }

    audio.reset = function () {
        myPreviousCycle = 0;

        clearPokeQueue();
        myAUDC[0] = myAUDC[1] = myAUDF[0] = myAUDF[1] = myAUDV[0] = myAUDV[1] = 0;
        myFutureAUDC[0] = myFutureAUDC[1] = myFutureAUDF[0] = myFutureAUDF[1] = myFutureAUDV[0] = myFutureAUDV[1] = 0;
        myP4[0] = myP5[0] = myP4[1] = myP5[1] = 1;
        myFrequencyDivider[0].set(0);
        myFrequencyDivider[1].set(0);
        myOutputCounter = 0;
    }


    // ==================== AUDIO REGISTER METHODS ======================
    /**
    * This is the method that actually changes the sound register
    * variables.  It is called by processPokeQueue(...) shortly before
    * process(...) is called.
    * @param address Address of a sound register
    * @param value The value to assign to the given register
    */
    function setAudioRegister(address, value) {
        switch (address) {
            case 0x15: myAUDC[0] = value & 0x0f; break;
            case 0x16: myAUDC[1] = value & 0x0f; break;

            case 0x17:
                myAUDF[0] = value & 0x1f;
                myFrequencyDivider[0].set(myAUDF[0]);
                break;

            case 0x18:
                myAUDF[1] = value & 0x1f;
                myFrequencyDivider[1].set(myAUDF[1]);
                break;

            case 0x19: myAUDV[0] = value & 0x0f; break;
            case 0x1a: myAUDV[1] = value & 0x0f; break;
            default: break;
        }
    }

    function getAudioRegister(address) {
        switch (address) {
            case 0x15: return myAUDC[0];
            case 0x16: return myAUDC[1];
            case 0x17: return myAUDF[0];
            case 0x18: return myAUDF[1];
            case 0x19: return myAUDV[0];
            case 0x1a: return myAUDV[1];
            default: return 0;
        }
    }

    function setFutureAudioRegister(address, value) {
        switch (address) {
            case 0x15: myFutureAUDC[0] = value & 0x0f; break;
            case 0x16: myFutureAUDC[1] = value & 0x0f; break;
            case 0x17: myFutureAUDF[0] = value & 0x1f; break;
            case 0x18: myFutureAUDF[1] = value & 0x1f; break;
            case 0x19: myFutureAUDV[0] = value & 0x0f; break;
            case 0x1a: myFutureAUDV[1] = value & 0x0f; break;
            default: break;
        }
    }

    function getFutureAudioRegister(address) {
        switch (address) {
            case 0x15: return myFutureAUDC[0];
            case 0x16: return myFutureAUDC[1];
            case 0x17: return myFutureAUDF[0];
            case 0x18: return myFutureAUDF[1];
            case 0x19: return myFutureAUDV[0];
            case 0x1a: return myFutureAUDV[1];
            default: return 0;
        }
    }

    // ================= MAIN SYNTHESIS METHOD =====================
    function bool(aValue) {
        return (aValue != 0);
    }

    /**
    * This method creates sound samples based on the current settings of the
    * TIA sound registers.
    * @param buffer the array into which the newly calculated byte values are to be placed
    * @param aStartIndex the array index at which the method should start placing the samples
    * @param samples the number of samples to create
    */
    function synthesizeAudioData(aPreOutputBuffer, aStartIndex, aAudioFrames) {
        // int zSamplesToProcess=aSamplesPerChannel;
        var zSamples = aAudioFrames * myChannels;
        var zVolChannelZero = Math.floor(((myAUDV[0] << 2) * myVolumePercentage) / 100);
        var zVolChannelOne = Math.floor(((myAUDV[1] << 2) * myVolumePercentage) / 100);
        var zIndex = aStartIndex;
        // Loop until the sample buffer is full
        while (zSamples > 0) {
            // Process both TIA sound channels
            for (var c = 0; c < 2; ++c) {
                // Update P4 & P5 registers for channel if freq divider outputs a pulse
                if ((myFrequencyDivider[c].clock())) {
                    switch (myAUDC[c]) {
                        case 0x00:    // Set to 1
                            {  // Shift a 1 into the 4-bit register each clock
                                myP4[c] = (myP4[c] << 1) | 0x01;
                                break;
                            }

                        case 0x01:    // 4 bit poly
                            {
                                // Clock P4 as a standard 4-bit LSFR taps at bits 3 & 2
                                myP4[c] = bool(myP4[c] & 0x0f) ? ((myP4[c] << 1) | ((bool(myP4[c] & 0x08) ? 1 : 0) ^ (bool(myP4[c] & 0x04) ? 1 : 0))) : 1;
                                break;
                            }

                        case 0x02:    // div 31 . 4 bit poly
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // This does the divide-by 31 with length 13:18
                                if ((myP5[c] & 0x0f) == 0x08) {
                                    // Clock P4 as a standard 4-bit LSFR taps at bits 3 & 2
                                    myP4[c] = bool(myP4[c] & 0x0f) ? ((myP4[c] << 1) | ((bool(myP4[c] & 0x08) ? 1 : 0) ^ (bool(myP4[c] & 0x04) ? 1 : 0))) : 1;
                                }
                                break;
                            }

                        case 0x03:    // 5 bit poly . 4 bit poly
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // P5 clocks the 4 bit poly
                                if (bool(myP5[c] & 0x10)) {
                                    // Clock P4 as a standard 4-bit LSFR taps at bits 3 & 2
                                    myP4[c] = bool(myP4[c] & 0x0f) ? ((myP4[c] << 1) | ((bool(myP4[c] & 0x08) ? 1 : 0) ^ (bool(myP4[c] & 0x04) ? 1 : 0))) : 1;
                                }
                                break;
                            }

                        case 0x04:    // div 2
                            {
                                // Clock P4 toggling the lower bit (divide by 2)
                                myP4[c] = (myP4[c] << 1) | (bool(myP4[c] & 0x01) ? 0 : 1);
                                break;
                            }

                        case 0x05:    // div 2
                            {
                                // Clock P4 toggling the lower bit (divide by 2)
                                myP4[c] = (myP4[c] << 1) | (bool(myP4[c] & 0x01) ? 0 : 1);
                                break;
                            }

                        case 0x06:    // div 31 . div 2
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // This does the divide-by 31 with length 13:18
                                if ((myP5[c] & 0x0f) == 0x08) {
                                    // Clock P4 toggling the lower bit (divide by 2)
                                    myP4[c] = (myP4[c] << 1) | (bool(myP4[c] & 0x01) ? 0 : 1);
                                }
                                break;
                            }

                        case 0x07:    // 5 bit poly . div 2
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // P5 clocks the 4 bit register
                                if (bool(myP5[c] & 0x10)) {
                                    // Clock P4 toggling the lower bit (divide by 2)
                                    myP4[c] = (myP4[c] << 1) | (bool(myP4[c] & 0x01) ? 0 : 1);
                                }
                                break;
                            }

                        case 0x08:    // 9 bit poly
                            {
                                // Clock P5 & P4 as a standard 9-bit LSFR taps at 8 & 4
                                myP5[c] = (bool(myP5[c] & 0x1f) || bool(myP4[c] & 0x0f)) ? ((myP5[c] << 1) | ((bool(myP4[c] & 0x08) ? 1 : 0) ^ (bool(myP5[c] & 0x10) ? 1 : 0))) : 1;
                                myP4[c] = (myP4[c] << 1) | (bool(myP5[c] & 0x20) ? 1 : 0);
                                break;
                            }

                        case 0x09:    // 5 bit poly
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // Clock value out of P5 into P4 with no modification
                                myP4[c] = (myP4[c] << 1) | (bool(myP5[c] & 0x20) ? 1 : 0);
                                break;
                            }

                        case 0x0a:    // div 31
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // This does the divide-by 31 with length 13:18
                                if ((myP5[c] & 0x0f) == 0x08) {
                                    // Feed bit 4 of P5 into P4 (this will toggle back and forth)
                                    myP4[c] = (myP4[c] << 1) | (bool(myP5[c] & 0x10) ? 1 : 0);
                                }
                                break;
                            }

                        case 0x0b:    // Set last 4 bits to 1
                            {
                                // A 1 is shifted into the 4-bit register each clock
                                myP4[c] = (myP4[c] << 1) | 0x01;
                                break;
                            }

                        case 0x0c:    // div 6
                            {
                                // Use 4-bit register to generate sequence 000111000111
                                myP4[c] = (~myP4[c] << 1) | ((!(!bool(myP4[c] & 4) && (bool(myP4[c] & 7)))) ? 0 : 1);
                                break;
                            }

                        case 0x0d:    // div 6
                            {
                                // Use 4-bit register to generate sequence 000111000111
                                myP4[c] = (~myP4[c] << 1) | ((!(!bool(myP4[c] & 4) && (bool(myP4[c] & 7)))) ? 0 : 1);
                                break;
                            }

                        case 0x0e:    // div 31 . div 6
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // This does the divide-by 31 with length 13:18
                                if ((myP5[c] & 0x0f) == 0x08) {
                                    // Use 4-bit register to generate sequence 000111000111
                                    myP4[c] = (~myP4[c] << 1) | ((!(!bool(myP4[c] & 4) && (bool(myP4[c] & 7)))) ? 0 : 1);
                                }
                                break;
                            }

                        case 0x0f:    // poly 5 . div 6
                            {
                                // Clock P5 as a standard 5-bit LSFR taps at bits 4 & 2
                                myP5[c] = bool(myP5[c] & 0x1f) ? ((myP5[c] << 1) | ((bool(myP5[c] & 0x10) ? 1 : 0) ^ (bool(myP5[c] & 0x04) ? 1 : 0))) : 1;

                                // Use poly 5 to clock 4-bit div register
                                if (bool(myP5[c] & 0x10)) {
                                    // Use 4-bit register to generate sequence 000111000111
                                    myP4[c] = (~myP4[c] << 1) | ((!(!bool(myP4[c] & 4) && (bool(myP4[c] & 7)))) ? 0 : 1);
                                }
                                break;
                            }
                    }
                }
            }

            myOutputCounter += JAVA_SOUND_SAMPLE_RATE;

            if (myChannels == 1) {
                // Handle mono sample generation
                while ((zSamples > 0) && (myOutputCounter >= TIA_SAMPLE_RATE)) {
                    var zChannelZero = (bool(myP4[0] & 8) ? zVolChannelZero : 0); //if bit3 is on, amplitude is the volume, otherwise amp is 0
                    var zChannelOne = (bool(myP4[1] & 8) ? zVolChannelOne : 0);
                    var zBothChannels = zChannelZero + zChannelOne + myVolumeClip;
                    aPreOutputBuffer[zIndex] = (zBothChannels - 128) & 0xFF; // we are using a signed byte, which has a min. of -128

                    myOutputCounter -= TIA_SAMPLE_RATE;
                    zIndex++;
                    zSamples--;
                    //assert(zIndex<=aStartIndex + zSamplesToProcess);

                }
            }
            else {
                // Handle stereo sample generation
                while ((zSamples > 0) && (myOutputCounter >= TIA_SAMPLE_RATE)) {
                    var zChannelZero = (bool(myP4[0] & 8) ? zVolChannelZero : 0) + myVolumeClip; //if bit3 is on, amplitude is the volume, otherwise amp is 0
                    var zChannelOne = (bool(myP4[1] & 8) ? zVolChannelOne : 0) + myVolumeClip;
                    //int zBothChannels=zChannelZero + zChannelOne + myVolumeClip;

                    aPreOutputBuffer[zIndex] = (zChannelZero - 128) & 0xFF; // we are using a signed byte, which has a min. of -128
                    zIndex++;
                    zSamples--;

                    aPreOutputBuffer[zIndex] = (zChannelOne - 128) & 0xFF;
                    zIndex++;
                    zSamples--;

                    myOutputCounter -= TIA_SAMPLE_RATE;
                }
            }
        }
    }

    /**
    * This takes register values off the register queue and submits them to the process of
    * sample creation by calling the process(...) method.
    *
    * This is called by the doFrameAudio() method, which is called once per frame.
    * <b>
    * When the ROM tells the CPU to poke the sound registers in the TIA, the TIA forwards
    * the data to this class (to the set() method).  Instead of setting the register
    * variables immediately, it saves the poke data as a AudioRegisterPoke object and puts it
    * in a queue object.  The processPokeQueue method takes these one-by-one off the front
    * of the queue and, one-by-one, sets the register variables, and calls the process(...)
    * method, creating a sound with a sample length corresponding to the number of
    * processor cycles that elapsed between it and the sound register change after
    * it.
    * @return total number of samples created
    */
    function processPokeQueue() {
        assert(myPokeQueue.getSize() > 0);
        var zCurrentBufferIndex = 0;
        var zEndOfFrame = false;

        while (zEndOfFrame == false) {
            var zRW = myPokeQueue.dequeue();
            if ((zRW == null)) {
                zEndOfFrame = true;
            }

            if (zRW != null) {
                assert(zRW.myDeltaCycles >= 0);

                if (zRW.myAddr != 0)
                    setAudioRegister(zRW.myAddr, zRW.myByteValue);

                myCyclePool += zRW.myDeltaCycles;
                // if (myCyclePool>=CYCLE_COUNT_CUTOFF) {
                var zAudioFramesInPool = myCyclePool / myAdjustedCyclesPerAudioFrame;
                var zWholeAudioFramesInPool = Math.floor(zAudioFramesInPool);
                myCyclePool = myCyclePool - (zWholeAudioFramesInPool * myAdjustedCyclesPerAudioFrame * 1.0);
                //myCyclePool= myCyclePool % myWholeCyclesPerAudioFrame; //the new cycle count is the remainder from the division

                //   dbgout("Processing --frame=" + zRW.myDebugFrameCounter +", #=" + zRW.myDebugCounter + ", " + zSamplesInBunch + " samples/pool, zDeltaCycles==" + zRW.myDeltaCycles);
                synthesizeAudioData(myPreOutputBuffer, zCurrentBufferIndex, zWholeAudioFramesInPool);
                zCurrentBufferIndex += (zWholeAudioFramesInPool * myChannels);  //each samples is represented by a single byte in myAudioBuffer
                // }//end : met the threshold
            }
            var zNextARP = myPokeQueue.getOldestElement();
            if ((zNextARP == null) || (zNextARP.myFrameEnd == true)) zEndOfFrame = true;
        }

        return zCurrentBufferIndex;
    }

    /**
    * A very imperfect method that plays the sound information that has accumulated over
    * the past video frame.
    * @param aCycles the current CPU system cycle count
    * @param aFPS the console's framerate, in frames per second
    */
    audio.doFrameAudio = function (aCycles, aFPS) {


        return;


        if (audio.isSoundEnabled() == true) {
            //STEP 1 : add an 'end of frame' signal to the poke queue
            addPokeToQueue(true, aCycles, 0, 0); //indicates the end of a frame

            //STEP 2 : turn a frame's worth of poke objects into audio data (in the myPreOutputBuffer)
            zSamples = processPokeQueue();

            /*
            zBufferSize = mySDLine.getBufferSize();
            zAvailable = mySDLine.available();
            zInBuffer = zBufferSize - zAvailable;


            //STEP 3 : send audio data to the audio system (i.e. play the sound)



            //CURRENT SYSTEM OF BUFFER MANAGEMENT :
            //This assumes the actual emulator is running fastor than the nominal CPU speed, thus gradually filling up
            //the SDL sound buffer (not to be confused with myPreOutputBuffer).  It just limits the number of samples that
            //actually make it into the play buffer.  It doesn't affect the number of samples processed, as this might
            //affect the frequency (pitch) of music.

            zPercentFull = 100.0 * (zInBuffer / zBufferSize); //used in debugging

            var zToPlay = Math.min(myBufferCushion - zInBuffer, zSamples);
            zToPlay = Math.max(0, zToPlay); //Make sure it's zero or greater
            if (myChannels == 2) zToPlay = roundToEven(zToPlay); //make sure it's even if it's stereo
            */

            /*
            if (mySDLine.isRunning() == false) mySDLine.start();

            mySDLine.write(myPreOutputBuffer, 0, zToPlay); //Math.min(zSamples,zAvail));  //This sends the samples to the play buffer - out of the programmer's hands after this point
            */

            myAudio = new Audio();
            var buffer = myPreOutputBuffer.slice(0, zSamples);
            myWave.Make(buffer);
            myAudio.src = myWave.dataURI;
            myAudio.play();

        }
    }

    function roundToEven(aNumber) {
        //return (aNumber  / 2) * 2; 
        return (aNumber % 2 != 0) ? (aNumber - 1) : aNumber;
    }

    function clearPokeQueue() {
        myPokeQueue = new Queue();
        addPokeToQueue(true, 0, 0, 0);   //Add a 1-frame lag
    }

    function addPokeToQueue(aFrameEnd, aCycleNumber, aAddress, aByteValue) {
        //STEP 1 : Determine how many cycles have elapsed since last poke and assign that to previous poke (in queue)
        var zDeltaCycles = aCycleNumber - myPreviousCycle;
        if (myPreviousPoke != null) myPreviousPoke.myDeltaCycles = zDeltaCycles; //setting delta cycles on previous one

        //STEP 2 : Determine if this poke is actually changing any values
        var zValueToOverwrite = getFutureAudioRegister(aAddress);

        //STEP 3 : If poke is a new value or this is the end of a frame, add a poke object to queue
        //I'm not sure how necessary this whole only-add-if-different-value thing is...I just thought it might be good        if ((zValueToOverwrite!=aByteValue)||(aFrameEnd==true)) 
        //{     
        var zRW = new AudioRegisterPoke(aFrameEnd, aAddress, aByteValue);
        myPokeQueue.enqueue(zRW);
        setFutureAudioRegister(aAddress, aByteValue);
        myPreviousPoke = zRW;
        myPreviousCycle = aCycleNumber;

        //}//end : new value for future reg
        //
    }

    /**
    * This method is called by TIA when it receives a poke command destined for a
    * sound register.  This is the method that converts the data received into a
    * AudioRegisterPoke object and stores that object on a queue for later processing.
    * Check out the processPokeQueue(...) description for details.
    * @param addr address to poke
    * @param aByteValue byte value of the poke
    * @param cycle the CPU system cycle number
    * @see processPokeQueue(int, int, int)
    */
    audio.pokeAudioRegister = function (addr, aByteValue, cycle) {
        if (audio.isSoundEnabled() == true) {
            addPokeToQueue(false, cycle, addr, aByteValue);
        }
    }

    //=============================================================================
    //========================== INNER CLASSES ====================================
    //=============================================================================
    function FrequencyDivider() {
        //private final static long serialVersionUID = 8982487492473260236L;
        var myDivideByValue = 0;
        var myCounter = 0;
        var fd = this;

        fd.set = function (divideBy) { myDivideByValue = divideBy; }
        fd.clock = function () {
            myCounter++;
            if (myCounter > myDivideByValue) {
                myCounter = 0;
                return true;
            }
            return false;
        }
    }

    function AudioRegisterPoke(aFrameEnd, aAddr, aByteValue) {
        // private final static long serialVersionUID = -4187197137229151004L;
        var arp = this;
        arp.myAddr = aAddr;
        arp.myByteValue = aByteValue;
        arp.myDeltaCycles = 0;
        arp.myFrameEnd = aFrameEnd;
    }

    //NOTE : when actual frame rate is below the theoretical audio frame rate, you get a buffer underrun -> popping noises
    // when actual frame rate is significantly above the theoretical fps, you get too much cut out by the compensation,
    //which causes a sort of singing-on-a-bumpy-road effect...


    audio.debugSetReg = function (address, value) {
        setAudioRegister(address, value);
    }

    function dbgout(aOut) {
        System.out.println("DEBUG: " + aOut);
    }

    /**
    * Occasionally good for debugging, but ultimately, this method must go.
    * @param aTimerDelay
    * @deprecated
    */
    audio.debugPlayChunk = function (aTimerDelay) {
        var zSamples = Math.floor(((JAVA_SOUND_SAMPLE_RATE / 1000.0) * aTimerDelay));

        if (zSamples > myPreOutputBuffer.length) zSamples = myPreOutputBuffer.length;
        synthesizeAudioData(myPreOutputBuffer, 0, zSamples);
        var zAvail = mySDLine.available();

        mySDLine.write(myPreOutputBuffer, 0, Math.min(zSamples, zAvail));
    }

    audio.debugGetSourceDataLine = function () {
        return mySDLine;
    }

    audio.reset();
};

