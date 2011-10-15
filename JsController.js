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
* Creates a new instance of JSController
* @param aJack What jack the controller corresponds to
*/
function JsController(aJack) {
    var cont = this;

    /**
    * The Atari 2600 has the potential for 4 paddles at a time, with two for each jack.
    * This type specifies which paddle in the jack is being referred to, alpha or beta.
    */
    cont.PaddleID = { PADDLE_ALPHA: 0, PADDLE_BETA: 1 };

    var jack = JsConstants.Jack.LEFT;

    var pinValue = new Array(9);

    cont.resetController = function () {
        for (var i = 0; i < pinValue.length; i++) {
            pinValue[i] = 1;
        }

        cont.setPaddlePosition(cont.PaddleID.PADDLE_ALPHA, 00);
        cont.setPaddlePosition(cont.PaddleID.PADDLE_BETA, 00);
    }

    /**
    * Is called to read the value (true or false) of a given pin
    * @param pin what pin to read
    * @return whether the pin is "on"
    *
    cont.read = function(pin) {
    return (myPinValue[getPinIndex(pin)]!=0);
    }*/

    /**
    * This reads the resistance value associated with the given pin.
    * 
    * The paddles for the Atari 2600 consisted (in part) of a potentiometer, which is 
    * an electrical resistor that varies its resistance based upon where a dial setting
    * is...[this is the same type of thing as the volume control on an electric guitar].
    * This part of the paddle (i.e. the non-button part) uses these analog pins to
    * communicate resistance, and thus position of the dial.
    * @param pin the pin to read
    * @return the resistance
    *
    cont.read = function(pin) {
    return myPinValue[getPinIndex(pin)];
    }*/

    cont.read = function (pin) {
        if (pin == JsConstants.DigitalPin.One || pin == JsConstants.DigitalPin.Two ||
            pin == JsConstants.DigitalPin.Three || pin == JsConstants.DigitalPin.Four ||
            pin == JsConstants.DigitalPin.Six)
            return (pinValue[getPinIndex(pin)] != 0);

        return pinValue[getPinIndex(pin)];
    }

    cont.write = function (pin, value) {
    }

    cont.setJoystickState = function (aJoystickDir, aPressed) {
        if (aPressed == true)
            pinValue[aJoystickDir] = 0;
        else
            pinValue[aJoystickDir] = 1;
    }

    cont.setPaddleTrigger = function (aID, aPressed) {
        var zValue = (aPressed) ? 0 : 1;
        if (aID == cont.PaddleID.PADDLE_ALPHA)
            pinValue[JsConstants.PADDLE_ALPHA_BUTTON] = zValue;
        else if (aID == PaddleID.PADDLE_BETA)
            pinValue[JsConstants.PADDLE_BETA_BUTTON] = zValue;
    }

    cont.changeControllerState = function (aControlEventType, aOn) {
        var zValue = (aOn) ? 0 : 1;
        pinValue[aControlEventType] = zValue;
    }

    function toPercentX(aResistance) {
        return Math.floor(100 - (aResistance / 10000.0));
    }

    function toResistance(aPercentX) {
        return Math.floor(10000.0 * (100 - aPercentX));
    }

    /**
    * This sets the position of the paddle in terms of percentage, where
    * 0 is one extreme and 100 is the other.
    * @param aID which of the two paddles in the jack is it
    * @param aPercentage the new position of the paddle dial
    */
    cont.setPaddlePosition = function (aID, aPercentage) {
        //  System.out.println("DEBUG - setting paddle x pos : " + aPercentage);
        // int zRes= (int)(10000.0 * (100 - aPercentage));
        var zNewPercent = Math.min(aPercentage, 100);
        zNewPercent = Math.max(0, zNewPercent);
        var zRes = toResistance(zNewPercent);

        if (aID == cont.PaddleID.PADDLE_ALPHA)
            pinValue[JsConstants.PADDLE_ALPHA_RESISTANCE] = zRes;
        else if (aID == cont.PaddleID.PADDLE_BETA)
            pinValue[JsConstants.PADDLE_BETA_RESISTANCE] = zRes;
    }

    cont.getPaddlePosition = function (aID) {
        var zIndex = (aID == cont.PaddleID.PADDLE_BETA) ? JsConstants.PADDLE_BETA_RESISTANCE : JsConstants.PADDLE_ALPHA_RESISTANCE;
        return toPercentX(pinValue[zIndex]);
    }

    cont.changePaddlePosition = function (aID, aDeltaPercent) {
        var zCurrent = getPaddlePosition(aID);
        setPaddlePosition(aID, zCurrent + aDeltaPercent);
    }

    cont.setBoosterGripBooster = function (aPressed) {
        setPaddlePosition(cont.PaddleID.PADDLE_BETA, (aPressed ? 100 : 0));
    }

    cont.setBoosterGripTrigger = function (aPressed) {
        setPaddlePosition(cont.PaddleID.PADDLE_ALPHA, (aPressed ? 100 : 0));
    }

    function getPinIndex(aPin) {
        switch (aPin) {
            case JsConstants.DigitalPin.One: return 0;
            case JsConstants.DigitalPin.Two: return 1;
            case JsConstants.DigitalPin.Three: return 2;
            case JsConstants.DigitalPin.Four: return 3;
            case JsConstants.DigitalPin.Six: return 5;
            case JsConstants.AnalogPin.Five: return 4;
            case JsConstants.AnalogPin.Nine: return 8;
            default: assert(false);
                return 0;

        }
    }

    cont.debugStr = function () {
        var text = "JsConstants.DigitalPin.One=" + pinValue[getPinIndex(JsConstants.DigitalPin.One)] + "\n" +
          "JsConstants.DigitalPin.Two=" + pinValue[getPinIndex(JsConstants.DigitalPin.Two)] + "\n" +
          "JsConstants.DigitalPin.Three=" + pinValue[getPinIndex(JsConstants.DigitalPin.Three)] + "\n" +
          "JsConstants.DigitalPin.Four=" + pinValue[getPinIndex(JsConstants.DigitalPin.Four)] + "\n" +
          "JsConstants.AnalogPin.Five=" + pinValue[getPinIndex(JsConstants.AnalogPin.Five)] + "\n" +
          "JsConstants.DigitalPin.Six=" + pinValue[getPinIndex(JsConstants.DigitalPin.Six)] + "\n" +
          "JsConstants.AnalogPin.Nine=" + pinValue[getPinIndex(JsConstants.AnalogPin.Nine)];

        return text;
    }

    cont.resetController();
}
