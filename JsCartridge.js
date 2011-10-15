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

function JsCartridge() {
    cart = this;

    var internalCartridge = null;

    cart.system = null;
    cart.bankLocked = false;

    function init() {
        cart.unlockBank();
    }

    cart.setInternalCartridge = function (aCartridge) {
        internalCartridge = aCartridge;
    }

    cart.lockBank = function () {
        bankLocked = true;
    }

    cart.unlockBank = function () {
        bankLocked = false;
    }

    cart.getImage = function () {
        return internalCartridge.getImage();
    }

    cart.setCurrentBank = function (bank) {
        return internalCartridge.setCurrentBank(bank);
    }

    cart.getCurrentBank = function () {
        return internalCartridge.getCurrentBank();
    }

    cart.bankCount = function () {
        return internalCartridge.bankCount();
    }

    cart.patch = function (address, value) {
        return internalCartridge.patch(address, value);
    }

    cart.name = function () {
        return internalCartridge.name();
    }

    cart.install = function (s) {
        cart.system = s;
        return internalCartridge.install(s);
    }

    cart.reset = function () {
        internalCartridge.reset();
    }

    cart.peek = function (address) {
        return internalCartridge.peek(address);
    }

    cart.poke = function (address, value) {
        return internalCartridge.poke(address, value);
    }

    cart.console = null;
    cart.setConsole = function (c) {
        cart.console = c;
    }

    cart.systemCyclesReset = function () {
    }

    cart.addIndirectAccess = function (aStartAddress, aEndAddress) {
        for (var zAddress = (aStartAddress & ~JsConstants.PAGE_MASK); zAddress < (aEndAddress & ~JsConstants.PAGE_MASK); zAddress += JsConstants.PAGE_SIZE) {
            cart.system.setPageAccess(zAddress >> JsConstants.PAGE_SHIFT, JsPageAccessHelper.createIndirectAccess(cart));
        }
    }

    cart.addDirectPeekAccess = function (aStartAddress, aEndAddress, aMemory, aBaseAddressMask, aBaseAddressOffset) {
        if (aBaseAddressOffset == undefined)
            aBaseAddressOffset = 0;

        for (var zAddress = (aStartAddress & ~JsConstants.PAGE_MASK); zAddress < (aEndAddress & ~JsConstants.PAGE_MASK); zAddress += JsConstants.PAGE_SIZE) {
            cart.system.setPageAccess(zAddress >> JsConstants.PAGE_SHIFT, JsPageAccessHelper.createDirectPeekAccess(cart, aMemory, aBaseAddressOffset + (zAddress & aBaseAddressMask)));
        }
    }

    cart.addDirectPokeAccess = function (aStartAddress, aEndAddress, aMemory, aBaseAddressMask, aBaseAddressOffset) {
        if (aBaseAddressOffset == undefined)
            aBaseAddressOffset = 0;

        for (var zAddress = (aStartAddress & ~JsPageAccess.PAGE_MASK); zAddress < (aEndAddress & ~JsPageAccess.PAGE_MASK); zAddress += JsPageAccess.PAGE_SIZE) {
            cart.system.setPageAccess(zAddress >> JsPageAccess.PAGE_SHIFT, JsPageAccessHelper.createDirectPokeAccess(cart, aMemory, aBaseAddressOffset + (zAddress & aBaseAddressMask)));
        }
    }

    cart.toString = function () {
        return "Cartridge : " + cart.name();
    }

    init();
}


(function () {
    JsCartridgeHelper = new Object();

    JsCartridgeHelper.TYPE_2K = "2K";
    JsCartridgeHelper.TYPE_4K = "4K";
    JsCartridgeHelper.TYPE_F8 = "F8";
    JsCartridgeHelper.TYPE_F8SWAPPED = "F8 swapped";
    JsCartridgeHelper.TYPE_F8SC = "F8SC";
    JsCartridgeHelper.TYPE_FASC = "FASC";
    JsCartridgeHelper.TYPE_F6 = "F6";
    JsCartridgeHelper.TYPE_F6SC = "F6SC";
    JsCartridgeHelper.TYPE_F4 = "F4";
    JsCartridgeHelper.TYPE_FE = "FE";
    JsCartridgeHelper.TYPE_DPC = "DPC";
    JsCartridgeHelper.TYPE_E0 = "E0";
    JsCartridgeHelper.TYPE_E7 = "E7";
    JsCartridgeHelper.TYPE_3F = "3F";
    JsCartridgeHelper.TYPE_F4SC = "F4SC";

    /**
    * Creates a cartridge from the given data.  This is the preferred method
    * for creating cartridge objects.  It detects what type of Cartridge needs to be created
    * based on the data, and returns a newly created one.
    * @param image the ROM data
    * @return a cartridge object
    * @throws jstella.core.JSException 
    */
    JsCartridgeHelper.create = function (aCartridge, image, aType) {
        if (aType == undefined)
            aType = detectTypeByImage(image);

        var zCart = null;

        var zUCType = aType.toUpperCase();

        var zIntImage = image;

        if (zUCType == JsCartridgeHelper.TYPE_2K.toUpperCase()) zCart = new JsCartridge2K(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_4K.toUpperCase()) zCart = new JsCartridge4K(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_F8.toUpperCase()) zCart = new JsCartridgeF8(zIntImage, aCartridge, false);
        else if (zUCType == JsCartridgeHelper.TYPE_F8SWAPPED.toUpperCase()) zCart = new JsCartridgeF8(zIntImage, aCartridge, true);
        else if (zUCType == JsCartridgeHelper.TYPE_F8SC.toUpperCase()) zCart = new JsCartridgeF8SC(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_F6.toUpperCase()) zCart = new JsCartridgeF6(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_F6SC.toUpperCase()) zCart = new JsCartridgeF6SC(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_F4SC.toUpperCase()) zCart = new JsCartridgeF4SC(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_FE.toUpperCase()) zCart = new JsCartridgeFE(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_DPC.toUpperCase()) zCart = new JsCartridgeDPC(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_E0.toUpperCase()) zCart = new JsCartridgeE0(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_E7.toUpperCase()) zCart = new JsCartridgeE7(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_3F.toUpperCase()) zCart = new JsCartridge3F(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_F4.toUpperCase()) zCart = new JsCartridgeF4(zIntImage, aCartridge);
        else if (zUCType == JsCartridgeHelper.TYPE_FASC.toUpperCase()) zCart = new JsCartridgeFASC(zIntImage, aCartridge);
        else {
            throw "JsStella does not yet support Cartridge Type " + aType + ".";
        }

        return aCartridge;
    }

    function arrayCompare(aArray, aIndexA, aIndexB, aCompCount) {
        var zReturn = true;

        for (var i = 0; i < aCompCount; i++) {
            if (aArray[aIndexA + i] != aArray[aIndexB + i]) {
                zReturn = false;
                break;
            }
        }
        return zReturn;
    }

    /**
    * Looks at the data to determine (or guess) what type of cartridge the data
    * represents.
    * @param image the ROM data
    * @return the cartridge type
    */
    function detectTypeByImage(image) {
        // Guess type based on size
        var type = "";
        var size = image.length;
        if ((size % 8448) == 0) {
            type = "AR";
        }
        else if ((size == 2048) || ((size == 4096) && (arrayCompare(image, 0, 2048, 2048) == true))) {
            if (isProbablyCV(image, size))
                type = "CV";
            else
                type = JsCartridgeHelper.TYPE_2K;
        }
        else if (size == 4096) {
            if (isProbablyCV(image, size))
                type = "CV";
            else
                type = JsCartridgeHelper.TYPE_4K;
        }
        else if (size == 8192)  // 8K
        {
            if (isProbablySC(image, size))
                type = JsCartridgeHelper.TYPE_F8SC;
            else if (arrayCompare(image, 0, 4096, 4096) == true)
                type = JsCartridgeHelper.TYPE_4K;
            else if (isProbablyE0(image, size))
                type = JsCartridgeHelper.TYPE_E0;
            else if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else if (isProbablyUA(image, size))
                type = "UA";
            else if (isProbablyFE(image, size))
                type = JsCartridgeHelper.TYPE_FE;
            else
                type = JsCartridgeHelper.TYPE_F8;
        }
        else if ((size == 10495) || (size == 10496) || (size == 10240))  // 10K - Pitfall2
        {
            type = JsCartridgeHelper.TYPE_DPC;
        }
        else if (size == 12288)  // 12K
        {
            // TODO - this should really be in a method that checks the first
            // 512 bytes of ROM and finds if either the lower 256 bytes or
            // higher 256 bytes are all the same.  For now, we assume that
            // all carts of 12K are CBS RAM Plus/FASC.
            type = "FASC";
        }
        else if (size == 16384)  // 16K
        {
            if (isProbablySC(image, size))
                type = JsCartridgeHelper.TYPE_F6SC;
            else if (isProbablyE7(image, size))
                type = JsCartridgeHelper.TYPE_E7;
            else if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else
                type = JsCartridgeHelper.TYPE_F6;
        }
        else if (size == 32768)  // 32K
        {
            if (isProbablySC(image, size))
                type = JsCartridgeHelper.TYPE_F4SC;
            else if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else
                type = "F4";
        }
        else if (size == 65536)  // 64K
        {
            // TODO - autodetect 4A50
            if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else
                type = "MB";
        }
        else if (size == 131072)  // 128K
        {
            // TODO - autodetect 4A50
            if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else
                type = "MC";
        }
        else  // what else can we do?
        {
            if (isProbably3E(image, size))
                type = "3E";
            else if (isProbably3F(image, size))
                type = JsCartridgeHelper.TYPE_3F;
            else
                type = JsCartridgeHelper.TYPE_4K;  // Most common bankswitching type
        }

        return type;
    }

    function searchForBytes(image, signature, sigsize, minhits) {
        var count = 0;
        var imagesize = image.length;
        for (var i = 0; i < imagesize - sigsize; /*++i*/i++) {
            var matches = 0;
            for (var j = 0; j < sigsize; /*++j*/j++) {
                if (image[i + j] == signature[j])
                    ++matches;
                else
                    break;
            }
            if (matches == sigsize) {
                ++count;
                i += sigsize;  // skip past this signature 'window' entirely
            }
            if (count >= minhits)
                break;
        }

        return (count >= minhits);
    }


    function isProbablySC(image, size) {
        // We assume a Superchip cart contains the same bytes for its entire
        // RAM area; obviously this test will fail if it doesn't
        // The RAM area will be the first 256 bytes of each 4K bank
        var banks = Math.floor(size / 4096.0);
        for (var i = 0; i < banks; ++i) {
            var first = image[i * 4096];
            for (var j = 0; j < 256; ++j) {
                if (image[(i * 4096) + j] != first)
                    return false;
            }
        }
        return true;
    }

    function isProbably3F(image, size) {
        // 3F cart bankswitching is triggered by storing the bank number
        // in address 3F using 'STA $3F'
        // We expect it will be present at least 2 times, since there are
        // at least two banks
        var intsignature = [0x85, 0x3F];  // STA $3F
        var signature = toDataUByte(intsignature);
        return searchForBytes(image, signature, 2, 2);
    }

    function isProbably3E(image, size) {
        // 3E cart bankswitching is triggered by storing the bank number
        // in address 3E using 'STA $3E', commonly followed by an
        // immediate mode LDA
        var intsignature = [0x85, 0x3E, 0xA9, 0x00];  // STA $3E; LDA #$00
        var signature = toDataUByte(intsignature);
        return searchForBytes(image, signature, 4, 1);
    }

    function isProbablyE0(image, size) {
        // E0 cart bankswitching is triggered by accessing addresses
        // $FE0 to $FF9 using absolute non-indexed addressing
        // To eliminate false positives (and speed up processing), we
        // search for only certain known signatures
        // Thanks to "stella@casperkitty.com" for this advice
        // These signatures are attributed to the MESS project
        var intsignature = [ /*[6][3]*/
            [0x8D, 0xE0, 0x1F],  // STA $1FE0
            [0x8D, 0xE0, 0x5F],  // STA $5FE0
            [0x8D, 0xE9, 0xFF],  // STA $FFE9
            [0xAD, 0xE9, 0xFF],  // LDA $FFE9
            [0xAD, 0xED, 0xFF],  // LDA $FFED
            [0xAD, 0xF3, 0xBF]   // LDA $BFF3
        ];
        var signature = toDataUByte(intsignature);
        for (var i = 0; i < 6; ++i) {
            if (searchForBytes(image, signature[i], 3, 1))
                return true;
        }
        return false;
    }

    function isProbablyE7(image, size) {
        // E7 carts map their second 1K block of RAM at addresses
        // $800 to $8FF.  However, since this occurs in the upper 2K address
        // space, and the last 2K in the cart always points to the last 2K of the
        // ROM image, the RAM area should fall in addresses $3800 to $38FF
        // Similar to the Superchip cart, we assume this RAM block contains
        // the same bytes for its entire area
        // Also, we want to distinguish between ROMs that have large blocks
        // of the same amount of (probably unused) data by making sure that
        // something differs in the previous 32 or next 32 bytes
        var first = image[0x3800];
        for (var i = 0x3800; i < 0x3A00; ++i) {
            if (first != image[i])
                return false;
        }

        // OK, now scan the surrounding 32 byte blocks
        var count1 = 0, count2 = 0;
        for (var i = 0x3800 - 32; i < 0x3800; ++i) {
            if (first != image[i])
                ++count1;
        }
        for (var i = 0x3A00; i < 0x3A00 + 32; ++i) {
            if (first != image[i])
                ++count2;
        }

        return (count1 > 0 || count2 > 0);
    }

    function isProbablyUA(image, size) {
        // UA cart bankswitching switches to bank 1 by accessing address 0x240
        // using 'STA $240'
        var intsignature = [0x8D, 0x40, 0x02];  // STA $240
        var signature = toDataUByte(intsignature);
        return searchForBytes(image, signature, 3, 1);
    }

    function isProbablyCV(image, size) {
        // CV RAM access occurs at addresses $f3ff and $f400
        // These signatures are attributed to the MESS project
        var intsignature /*[2][3]*/ = [
            [0x9D, 0xFF, 0xF3],  // STA $F3FF
            [0x99, 0x00, 0xF4]   // STA $F400
        ];
        var signature = toDataUByte(intsignature);
        if (searchForBytes(image, signature[0], 3, 1))
            return true;
        else
            return searchForBytes(image, signature[1], 3, 1);
    }

    function isProbablyFE(image, size) {
        // FE bankswitching is very weird, but always seems to include a
        // 'JSR $xxxx'
        // These signatures are attributed to the MESS project
        var intsignature/*[4][5]*/ = [
            [0x20, 0x00, 0xD0, 0xC6, 0xC5],  // JSR $D000; DEC $C5
            [0x20, 0xC3, 0xF8, 0xA5, 0x82],  // JSR $F8C3; LDA $82
            [0xD0, 0xFB, 0x20, 0x73, 0xFE],  // BNE $FB; JSR $FE73
            [0x20, 0x00, 0xF0, 0x84, 0xD6]   // JSR $F000; STY $D6
        ];
        var signature = toDataUByte(intsignature);
        for (var i = 0; i < 4; ++i) {
            if (searchForBytes(image, signature[i], 5, 1))
                return true;
        }
        return false;
    }

    JsCartridgeHelper.copyImage = function (aSourceImage) {
        var zReturn = new Array(aSourceImage.length);
        for (var i = 0; i < aSourceImage.length; i++) {
            zReturn[i] = aSourceImage[i];
        }
        return zReturn;
    }

    JsCartridgeHelper.randomizeRAM = function (aRAM) {
        for (var i = 0; i < aRAM.length; i++) {
            aRAM[i] = Math.floor(Math.random() * 255);
        }
    }

    /**
    * Returns a byte that represents the value supplied.
    * The byte is actually signed, so it is important
    * to remember that accessing its value directly may not
    * return the value supplied to it.
    * @param aByteValue The value to be represented as a byte (0-255)
    * @return A byte that represents the value supplied.
    */
    JsCartridgeHelper.toDataUByte = function (aByteValue) {
        return (aByteValue & 0xFF);
    }


    /**
    * Performs toDataUByte(int) on an array
    * @param aArray Array of values
    * @return Array of bytes
    */
    function toDataUByte(aArray) {
        var zReturn;
        if (aArray.length && aArray[0].length) {
            zReturn = new Array(aArray.length);
            for (var i = 0; i < aArray.length; i++) {
                zReturn[i] = new Array(aArray[i].length);
                for (var j = 0; j < aArray[i].length; j++) {
                    zReturn[i][j] = JsCartridgeHelper.toDataUByte(aArray[i][j]);
                }
            }
            return zReturn;
        }
        else {
            zReturn = new Array(aArray.length);
            for (var i = 0; i < aArray.length; i++) {
                zReturn[i] = JsCartridgeHelper.toDataUByte(aArray[i]);
            }
            return zReturn;
        }
    }

    window.JsCartridgeHelper = JsCartridgeHelper;
})();


function JsCartridge4K(img, parent) {
    c4k = this;
    var serialVersionUID = -3240308689643904765;

    var CARTRIDGE_MASK_VALUE = 0x0FFF;
    var CARTRIDGE_SIZE = 4096;
    var CARTRIDGE_BANK_COUNT = 1;
    var system;

    // The 4K ROM image for the cartridge
    var image = new Array(CARTRIDGE_SIZE);

    function init() {
        image = JsCartridgeHelper.copyImage(img);
        parent.setInternalCartridge(c4k);
    }

    c4k.name = function () {
        return "Cartridge4K";
    }

    c4k.reset = function () {
    }

    c4k.install = function (s) {
        system = s;
        parent.addDirectPeekAccess(0x1000, 0x2000, image, CARTRIDGE_MASK_VALUE);  // Map ROM image into the system
    }

    c4k.peek = function (address) {
        return image[address & CARTRIDGE_MASK_VALUE];
    }

    c4k.poke = function (aC, aB) {
        // This is ROM so poking has no effect :-)
    }

    c4k.setCurrentBank = function (bank) {
        // Doesn't support bankswitching
    }

    c4k.getCurrentBank = function () {
        // Doesn't support bankswitching
        return 0;
    }

    c4k.bankCount = function () {
        return CARTRIDGE_BANK_COUNT;
    }

    c4k.patch = function (address, value) {
        image[address & CARTRIDGE_MASK_VALUE] = value;
        return true;
    }

    c4k.getImage = function () {
        return image;
    }

    init();
}

function JsCartridge2K(img, parent) {
    var c2k = this;

    var image = new Array(2048);
    var system = null;

    function init() {
        image = JsCartridgeHelper.copyImage(img);  // Copy the ROM image into my buffer
        parent.setInternalCartridge(c2k);
    }

    c2k.name = function () {
        return "Cartridge2K";
    }

    c2k.reset = function () {
    }

    c2k.install = function (s) {
        system = s;

        // Make sure the system we're being installed in has a page size that'll work
        assert((0x1000 & JsConstants.PAGE_MASK) == 0);

        parent.addDirectPeekAccess(0x1000, 0x2000, image, 0x07FF);
    }

    c2k.peek = function (address) {
        return image[address & 0x07FF];
    }

    c2k.poke = function (aC, aB) {
        // This is ROM so poking has no effect :-)
    }

    c2k.setCurrentBank = function (bank) {
        // Doesn't support bankswitching
    }

    c2k.getCurrentBank = function () {
        // Doesn't support bankswitching
        return 0;
    }

    c2k.bankCount = function () {
        return 1;
    }

    c2k.patch = function (address, value) {
        image[address & 0x07FF] = value;
        return true;
    }

    c2k.getImage = function () {
        return image;
    }

    init();
}

function JsCartridge3F(img, parent) {
    var c3f = this;
    // Indicates which bank is currently active for the first segment
    var currentBank;
    // Pointer to a dynamically allocated ROM image of the cartridge (Daniel: HAHAHA, "pointer")
    var image = new Array();

    var system = null;

    function init() {
        image = JsCartridgeHelper.copyImage(img);
        parent.setInternalCartridge(c3f);
    }

    c3f.name = function () {
        return "Cartridge3F";
    }

    c3f.reset = function () {
        // We'll map bank 0 into the first segment upon reset
        c3f.setCurrentBank(0);
    }

    c3f.install = function (s) {
        system = s;

        // Set the page accessing methods for the hot spots (for 100% emulation
        // we need to chain any accesses below 0x40 to the TIA. Our poke() method
        // does this via mySystem.tiaPoke(...), at least until we come up with a
        // cleaner way to do it.)
        //System::PageAccess access;
        parent.addIndirectAccess(0x00, 0x40);  //Installing on zero page

        // Setup the second segment to always point to the last ROM slice
        parent.addDirectPeekAccess(0x1800, 0x2000, image, 0x07FF, image.length - 2048);

        // Install pages for bank 0 into the first segment
        c3f.setCurrentBank(0);
    }

    c3f.peek = function (address) {
        address = address & 0x0FFF;

        if (address < 0x0800) {
            return image[(address & 0x07FF) + currentBank * 2048];
        }
        else {
            return image[(address & 0x07FF) + image.length - 2048];
        }
    }

    c3f.poke = function (address, value) {
        address = address & 0x0FFF;

        // Switch banks if necessary
        if (address <= 0x003F) {
            c3f.setCurrentBank(value);
        }

        parent.console.getTIA().poke(address, value); // ??
    }

    c3f.setCurrentBank = function (bank) {
        if (parent.banckLocked == true) 
            return;

        // Make sure the bank they're asking for is reasonable
        if (bank * 2048 < image.length) {
            currentBank = bank;
        }
        else {
            // Oops, the bank they're asking for isn't valid so let's wrap it
            // around to a valid bank number
            currentBank = bank % Math.floor(image.length / 2048);
        }

        // Map ROM image into the system
        parent.addDirectPeekAccess(0x1000, 0x1800, image, 0x07FF, currentBank * 2048);
    }

    c3f.getCurrentBank = function () {
        return currentBank;
    }

    c3f.bankCount = function () {
        return Math.floor(image.length / 2048);
    }

    c3f.patch = function (address, value) {
        address = address & 0x0FFF;
        if (address < 0x0800) {
            image[(address & 0x07FF) + currentBank * 2048] = value;
        }
        else {
            image[(address & 0x07FF) + image.length - 2048] = value;
        }
        return true;
    }

    c3f.getImage = function () {
        return image;
    }

    init();
}

function JsCartridgeDPC(img, parent) {
    cdpc = this;

    var f = [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1];
    var musicAmplitudes = [0x00, 0x04, 0x05, 0x09, 0x06, 0x0a, 0x0b, 0x0f];

    //private java.util.Random myRandomGenerator=new java.util.Random();
    // Indicates which bank is currently active
    var currentBank;

    // The 8K program ROM image of the cartridge
    var programImage = new Array(8192);

    // The 2K display ROM image of the cartridge
    var displayImage = Array(2048);

    // Copy of the raw image, for use by getImage()
    var imageCopy = new Array(8192 + 2048 + 255);

    // The top registers for the data fetchers
    var tops = new Array(8);

    // The bottom registers for the data fetchers
    var bottoms = new Array(8);

    // The counter registers for the data fetchers
    var counters = new Array(8);

    // The flag registers for the data fetchers
    var flags = new Array(8);

    // The music mode DF5, DF6, & DF7 enabled flags
    var musicMode = new Array(3);

    // The random number generator register
    var randomNumber = 0;

    // CartridgeDPC cycle count when the last update to music data fetchers occurred
    var systemCycles = 0;

    // Fractional DPC music OSC clocks unused during the last update
    var fractionalClocks = 0.0;

    function init() {
        var addr;

        // Make a copy of the entire image as-is, for use by getImage()
        imageCopy = JsCartridgeHelper.copyImage(img);
        parent.setInternalCartridge(cdpc);

        // Copy the program ROM image into my buffer
        for (addr = 0; addr < 8192; ++addr) {
            programImage[addr] = image[addr];
        }

        // Copy the display ROM image into my buffer
        for (addr = 0; addr < 2048; ++addr) {
            displayImage[addr] = image[8192 + addr];
        }

        // Initialize the DPC data fetcher registers
        for (var i = 0; i < 8; ++i) {
            tops[i] = bottoms[i] = counters[i] = flags[i] = 0;
        }

        // None of the data fetchers are in music mode
        musicMode[0] = musicMode[1] = musicMode[2] = false;

        // Initialize the DPC's random number generator register (must be non-zero)
        randomNumber = 1;

        // Initialize the system cycles counter & fractional clock values
        systemCycles = 0;
        fractionalClocks = 0.0;
    }

    cdpc.name = function () {
        return "CartridgeDPC";
    }

    cdpc.reset = function () {
        // Update cycles to the current system cycles
        systemCycles = parent.system.getCycles();
        fractionalClocks = 0.0;

        // Upon reset we switch to bank 1
        cdpc.setCurrentBank(1);
    }

    cdpc.systemCyclesReset = function () {
        // Get the current system cycle
        var cycles = parent.system.getCycles();

        // Adjust the cycle counter so that it reflects the new value
        systemCycles -= cycles;
    }

    cdpc.install = function (s) {
        parent.addIndirectAccess(0x1FF8, 0x2000);    // Set the page accessing methods for the hot spots
        parent.addIndirectAccess(0x1000, 0x1080);    // Set the page accessing method for the DPC reading & writing pages

        cdpc.setCurrentBank(1); // Install pages for bank 1
    }

    function bool(aValue) {
        return (aValue != 0);
    }

    function clockRandomNumberGenerator() {
        // Table for computing the input bit of the random number generator's
        // shift register (it's the NOT of the EOR of four bits)


        // Using bits 7, 5, 4, & 3 of the shift register compute the input
        // bit for the shift register
        var bit = f[((randomNumber >> 3) & 0x07) |
                (bool(randomNumber & 0x80) ? 0x08 : 0x00)];

        // Update the shift register
        randomNumber = ((randomNumber << 1) | bit) & 0xFF;

        // randomNumber=((int)(myRandomGenerator.nextDouble() * 256))&0xFF;
    }

    function updateMusicModeDataFetchers() {
        // Calculate the number of cycles since the last update
        var cycles = parent.system.getCycles() - systemCycles;
        systemCycles = parent.system.getCycles();

        // Calculate the number of DPC OSC clocks since the last update
        var clocks = ((15750.0 * cycles) / 1193191.66666667) + fractionalClocks;
        var wholeClocks = Math.floor(clocks);
        fractionalClocks = clocks - wholeClocks;

        if (wholeClocks <= 0) {
            return;
        }

        // Let's update counters and flags of the music mode data fetchers
        for (var x = 5; x <= 7; ++x) {
            // Update only if the data fetcher is in music mode
            if (musicMode[x - 5]) {
                var top = tops[x] + 1;
                var newLow = (counters[x] & 255);

                if (tops[x] != 0) {
                    newLow -= (wholeClocks % top);
                    if (newLow < 0) {
                        newLow += top;
                    }
                }
                else {
                    newLow = 0;
                }

                // Update flag register for this data fetcher
                if (newLow <= bottoms[x]) {
                    flags[x] = 0x00;
                }
                else if (newLow <= tops[x]) {
                    flags[x] = 0xff;
                }

                counters[x] = (counters[x] & 0x0700) | newLow;
            }
        }
    }

    cdpc.peek = function (address) {
        var zNewAddress = (address & 0x0FFF);

        // Clock the random number generator.  This should be done for every
        // cartridge access, however, we're only doing it for the DPC and
        // hot-spot accesses to save time.
        clockRandomNumberGenerator();

        if (zNewAddress < 0x0040) {
            var result = 0;

            // Get the index of the data fetcher that's being accessed
            var index = zNewAddress & 0x07;
            var func = (zNewAddress >> 3) & 0x07;

            // Update flag register for selected data fetcher
            if ((counters[index] & 0x00ff) == tops[index]) {
                flags[index] = 0xff;
            }
            else if ((counters[index] & 0x00ff) == bottoms[index]) {
                flags[index] = 0x00;
            }

            switch (func) {
                case 0x00:
                    {
                        // Is this a random number read
                        if (index < 4) {
                            result = randomNumber;
                        }
                        // No, it's a music read
                        else {


                            // Update the music data fetchers (counter & flag)
                            updateMusicModeDataFetchers();

                            var i = 0;
                            if (musicMode[0] && bool(flags[5])) {
                                i |= 0x01;
                            }
                            if (musicMode[1] && bool(flags[6])) {
                                i |= 0x02;
                            }
                            if (musicMode[2] && bool(flags[7])) {
                                i |= 0x04;
                            }

                            result = musicAmplitudes[i];
                        }
                        break;
                    }

                    // DFx display data read
                case 0x01:
                    {
                        result = displayImage[2047 - counters[index]];
                        break;
                    }

                    // DFx display data read AND'd w/flag
                case 0x02:
                    {
                        result = displayImage[2047 - counters[index]] & flags[index];
                        break;
                    }

                    // DFx flag
                case 0x07:
                    {
                        result = flags[index];
                        break;
                    }

                default:
                    {
                        result = 0;
                    }
            }

            // Clock the selected data fetcher's counter if needed
            if ((index < 5) || ((index >= 5) && (!musicMode[index - 5]))) {
                counters[index] = (counters[index] - 1) & 0x07ff;
            }

            return result;
        }
        else {
            // Switch banks if necessary
            switch (zNewAddress) {
                case 0x0FF8:
                    // Set the current bank to the lower 4k bank
                    cdpc.setCurrentBank(0);
                    break;

                case 0x0FF9:
                    // Set the current bank to the upper 4k bank
                    cdpc.setCurrentBank(1);
                    break;

                default:
                    break;
            }
            return programImage[(currentBank * 4096) + zNewAddress];
        }
    }

    cdpc.poke = function (address, value) {
        assert((value < 0x100) && (value >= 0));
        var zNewAddress = (address & 0x0FFF);

        // Clock the random number generator.  This should be done for every
        // cartridge access, however, we're only doing it for the DPC and
        // hot-spot accesses to save time.
        clockRandomNumberGenerator();

        if ((zNewAddress >= 0x0040) && (zNewAddress < 0x0080)) {
            // Get the index of the data fetcher that's being accessed
            var index = zNewAddress & 0x07;
            var func = (zNewAddress >> 3) & 0x07;

            switch (func) {
                // DFx top count  
                case 0x00:
                    {
                        tops[index] = value;
                        flags[index] = 0x00;
                        break;
                    }

                    // DFx bottom count
                case 0x01:
                    {
                        bottoms[index] = value;
                        break;
                    }

                    // DFx counter low
                case 0x02:
                    {
                        if ((index >= 5) && musicMode[index - 5]) {
                            // Data fecther is in music mode so its low counter value
                            // should be loaded from the top register not the poked value
                            counters[index] = (counters[index] & 0x0700) |
                                tops[index];
                        }
                        else {
                            // Data fecther is either not a music mode data fecther or it
                            // isn't in music mode so it's low counter value should be loaded
                            // with the poked value
                            counters[index] = (counters[index] & 0x0700) | value;
                        }
                        break;
                    }

                    // DFx counter high
                case 0x03:
                    {
                        counters[index] = ((value & 0x07) << 8) |
                            (counters[index] & 0x00ff);

                        // Execute special code for music mode data fetchers
                        if (index >= 5) {
                            musicMode[index - 5] = bool(value & 0x10);

                            // NOTE: We are not handling the clock source input for
                            // the music mode data fetchers.  We're going to assume
                            // they always use the OSC input.
                        }
                        break;
                    }

                    // Random Number Generator Reset
                case 0x06:
                    {
                        randomNumber = 1;
                        break;
                    }

                default:
                    {
                        break;
                    }
            }
        }
        else {
            // Switch banks if necessary
            switch (zNewAddress) {
                case 0x0FF8:
                    // Set the current bank to the lower 4k bank
                    cdpc.setCurrentBank(0);
                    break;

                case 0x0FF9:
                    // Set the current bank to the upper 4k bank
                    cdpc.setCurrentBank(1);
                    break;

                default:
                    break;
            }
        }
    }

    cdpc.setCurrentBank = function (bank) {
        if (parent.banckLocked) return;

        // Remember what bank we're in
        currentBank = bank;

        // Map Program ROM image into the system
        parent.addDirectPeekAccess(0x1080, 0x1FF8, programImage, 0x0FFF, currentBank * 4096);

    }

    cdpc.getCurrentBank = function () {
        return currentBank;
    }

    cdpc.bankCount = function () {
        return 2;
    }

    cdpc.patch = function (address, value) {
        address = (address & 0x0FFF);
        programImage[(currentBank * 4096) + address] = value;
        return true;
    }

    cdpc.getImage = function () {
        //size = 8192 + 2048 + 255;

        var i;
        for (i = 0; i < 8192; i++)
            imageCopy[i] = programImage[i];

        for (i = 0; i < 2048; i++)
            imageCopy[i + 8192] = displayImage[i];

        return imageCopy;
    }

    init(aImage);
}

function JsCartridgeF8(img, parent, swapBanks) {
    var cf8 = this;
    var currentBank = 0;
    var resetBank = 0;
    var image = new Array(8192);

    function init() {
        image = JsCartridgeHelper.copyImage(img);
        parent.setInternalCartridge(cf8);

        // Normally bank 1 is the reset bank, unless we're dealing with ROMs
        // that have been incorrectly created with banks in the opposite order
        resetBank = swapBanks ? 0 : 1;
    }

    cf8.name = function () {
        return "CartridgeF8";
    }

    cf8.reset = function () {
        // Upon reset we switch to the reset bank
        cf8.setCurrentBank(resetBank);
    }


    cf8.install = function (s) {
        // Map ROM image into the system
        parent.addIndirectAccess(0x1FF8, 0x2000);

        cf8.setCurrentBank(1);
    }

    cf8.peek = function (address) {
        var zNewAddress = address & 0x0FFF;

        // Switch banks if necessary
        switch (zNewAddress) {
            case 0x0FF8:
                // Set the current bank to the lower 4k bank
                cf8.setCurrentBank(0);
                break;

            case 0x0FF9:
                // Set the current bank to the upper 4k bank
                cf8.setCurrentBank(1);
                break;

            default:
                break;
        }

        return image[(currentBank * 4096) + zNewAddress];
    }

    cf8.poke = function (address, aByteValue) {
        var zNewAddress = address & 0x0FFF;

        // Switch banks if necessary
        switch (zNewAddress) {
            case 0x0FF8:
                // Set the current bank to the lower 4k bank
                cf8.setCurrentBank(0);
                break;

            case 0x0FF9:
                // Set the current bank to the upper 4k bank
                cf8.setCurrentBank(1);
                break;

            default:
                break;
        }
    }

    cf8.setCurrentBank = function (bank) {
        if (parent.bankLocked)
            return;
        currentBank = bank;
        parent.addDirectPeekAccess(0x1000, 0x1FF8, image, 0x0FFF, currentBank * 4096);  // Map ROM image into the system
    }

    cf8.getCurrentBank = function () {
        return currentBank;
    }

    cf8.bankCount = function () {
        return 2;
    }

    cf8.patch = function (address, aValue) {
        address &= 0xfff;
        image[currentBank * 4096 + address] = aValue;
        cf8.setCurrentBank(currentBank);
        return true;
    }

    cf8.getImage = function () {
        return image;
    }

    init();
}
