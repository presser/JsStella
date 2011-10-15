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
    * Creates a new instance of Js6507
    * 
    * @param aSystem The system that takes care of memory, storage, etc.
    * aka "the outside world".
    */
function Js6507(aSystem) {
    that = this;

    var serialVersionUID = 2315253717432920075;
    var DEBUG_MODE_ON = false;
	var debugCanvas = null;

    /** @see #getRegisterSnapshot() */
    that.INDEX_PC = 0;
    /** @see #getRegisterSnapshot() */
    that.INDEX_A = 1;
    /** @see #getRegisterSnapshot() */
    that.INDEX_X = 2;
    /** @see #getRegisterSnapshot() */
    that.INDEX_Y = 3;
    /** @see #getRegisterSnapshot() */
    that.INDEX_SP = 4;
    /** @see #getRegisterSnapshot() */
    that.INDEX_FLAGS = 5;

    var BCDTable = new Array(2);
    BCDTable[0] = new Array();
    BCDTable[1] = new Array();

    var myOperationList = new Array();

    for (var t = 0; t < 256; ++t) {
        BCDTable[0].push(((t >> 4) * 10) + (t & 0x0f));
        BCDTable[1].push((((t % 100) / 10) << 4) | (t % 10));
    }

    that.AddressingMode = {
        Absolute: 0,
        AbsoluteX: 1,
        AbsoluteY: 2,
        /**
        * 
        */
        Immediate: 3,
        /**
        * Implied addressing
        */
        Implied: 4,
        Indirect: 5,
        IndirectX: 6,
        IndirectY: 7,
        Invalid: 8,
        /**
        * 
        */
        Relative: 9,
        /**
        * Zero page addressing
        */
        Zero: 10,
        /**
        * Zero page X addressing
        */
        ZeroX: 11,
        /**
        * Zero page Y addressing
        */
        ZeroY: 12
    };

    that.ourAddressingModeTable = [
        that.AddressingMode.Implied, that.AddressingMode.IndirectX, that.AddressingMode.Invalid, that.AddressingMode.IndirectX,    // 0x0?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0x1?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX,

        that.AddressingMode.Absolute, that.AddressingMode.IndirectX, that.AddressingMode.Invalid, that.AddressingMode.IndirectX,    // 0x2?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0x3?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX,

        that.AddressingMode.Implied, that.AddressingMode.IndirectX, that.AddressingMode.Invalid, that.AddressingMode.IndirectX,    // 0x4?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0x5?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX,

        that.AddressingMode.Implied, that.AddressingMode.IndirectX, that.AddressingMode.Invalid, that.AddressingMode.IndirectX,    // 0x6?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Indirect, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0x7?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX,

        that.AddressingMode.Immediate, that.AddressingMode.IndirectX, that.AddressingMode.Immediate, that.AddressingMode.IndirectX,    // 0x8?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0x9?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroY, that.AddressingMode.ZeroY,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteY, that.AddressingMode.AbsoluteY,

        that.AddressingMode.Immediate, that.AddressingMode.IndirectX, that.AddressingMode.Immediate, that.AddressingMode.IndirectX,    // 0xA?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0xB?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroY, that.AddressingMode.ZeroY,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteY, that.AddressingMode.AbsoluteY,

        that.AddressingMode.Immediate, that.AddressingMode.IndirectX, that.AddressingMode.Immediate, that.AddressingMode.IndirectX,    // 0xC?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0xD?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX,

        that.AddressingMode.Immediate, that.AddressingMode.IndirectX, that.AddressingMode.Immediate, that.AddressingMode.IndirectX,    // 0xE?
        that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero, that.AddressingMode.Zero,
        that.AddressingMode.Implied, that.AddressingMode.Immediate, that.AddressingMode.Implied, that.AddressingMode.Immediate,
        that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute, that.AddressingMode.Absolute,

        that.AddressingMode.Relative, that.AddressingMode.IndirectY, that.AddressingMode.Invalid, that.AddressingMode.IndirectY,    // 0xF?
        that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX, that.AddressingMode.ZeroX,
        that.AddressingMode.Implied, that.AddressingMode.AbsoluteY, that.AddressingMode.Implied, that.AddressingMode.AbsoluteY,
        that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX, that.AddressingMode.AbsoluteX
    ];

    /**
    * This table represents the minimum number of processor cycles a given
    * opcode takes.  (A number of opcodes can last longer, depending
    * on the result of the operation...e.g. page crossing.)
    */
    that.ourInstructionProcessorCycleTable = [
    //  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
        7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,  // 0
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,  // 1
        6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,  // 2
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,  // 3
        6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,  // 4
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,  // 5
        6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,  // 6
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,  // 7
        2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,  // 8
        2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5,  // 9
        2, 6, 2, 6, 3, 3, 3, 4, 2, 2, 2, 2, 4, 4, 4, 4,  // a
        2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,  // b
        2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,  // c
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,  // d
        2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,  // e
        2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7   // f
    ];

    /**
    * This table specifies whether a given opcode is subject
    * to a variable number of processor cycles.
    * Value of 1 = add 1 cycle if this operation crosses a page
    * Value of 2 = this opcode is a branch instruction--
    *          add 1 cycle if branch is successful
    *          add another 1 if a page is crossed
    *          (i.e. add 2 for a sucessful branch that crosses page boundary).
    */
    that.ourInstructionPageCrossDelay = [
    //  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 0
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,  // 1
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 2
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,  // 3
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 4
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,  // 5
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 6
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,  // 7
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 8
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 9
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // a
        2, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1,  // b
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // c
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,  // d
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // e
        2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0  // f
    ]; //;

    //TODO : add unofficial opcode data to ourInstructionPageCrossDelay
    // - added so far:
    //      - lax


    /**
    * This table holds the assembler mnemonic (used in 
    * assembly language) for the given opcode. This table is
    * mainly used in debugging.
    */
    that.ourInstructionMnemonicTable = [
        "BRK", "ORA", "n/a", "slo", "nop", "ORA", "ASL", "slo",    // 0x0?
        "PHP", "ORA", "ASLA", "anc", "nop", "ORA", "ASL", "slo",

        "BPL", "ORA", "n/a", "slo", "nop", "ORA", "ASL", "slo",    // 0x1?
        "CLC", "ORA", "nop", "slo", "nop", "ORA", "ASL", "slo",

        "JSR", "AND", "n/a", "rla", "BIT", "AND", "ROL", "rla",    // 0x2?
        "PLP", "AND", "ROLA", "anc", "BIT", "AND", "ROL", "rla",

        "BMI", "AND", "n/a", "rla", "nop", "AND", "ROL", "rla",    // 0x3?
        "SEC", "AND", "nop", "rla", "nop", "AND", "ROL", "rla",

        "RTI", "EOR", "n/a", "sre", "nop", "EOR", "LSR", "sre",    // 0x4?
        "PHA", "EOR", "LSRA", "asr", "JMP", "EOR", "LSR", "sre",

        "BVC", "EOR", "n/a", "sre", "nop", "EOR", "LSR", "sre",    // 0x5?
        "CLI", "EOR", "nop", "sre", "nop", "EOR", "LSR", "sre",

        "RTS", "ADC", "n/a", "rra", "nop", "ADC", "ROR", "rra",    // 0x6?
        "PLA", "ADC", "RORA", "arr", "JMP", "ADC", "ROR", "rra",

        "BVS", "ADC", "n/a", "rra", "nop", "ADC", "ROR", "rra",    // 0x7?
        "SEI", "ADC", "nop", "rra", "nop", "ADC", "ROR", "rra",

        "nop", "STA", "nop", "sax", "STY", "STA", "STX", "sax",    // 0x8?
        "DEY", "nop", "TXA", "ane", "STY", "STA", "STX", "sax",

        "BCC", "STA", "n/a", "sha", "STY", "STA", "STX", "sax",    // 0x9?
        "TYA", "STA", "TXS", "shs", "shy", "STA", "shx", "sha",

        "LDY", "LDA", "LDX", "lax", "LDY", "LDA", "LDX", "lax",    // 0xA?
        "TAY", "LDA", "TAX", "lxa", "LDY", "LDA", "LDX", "lax",

        "BCS", "LDA", "n/a", "lax", "LDY", "LDA", "LDX", "lax",    // 0xB?
        "CLV", "LDA", "TSX", "las", "LDY", "LDA", "LDX", "lax",

        "CPY", "CMP", "nop", "dcp", "CPY", "CMP", "DEC", "dcp",    // 0xC?
        "INY", "CMP", "DEX", "sbx", "CPY", "CMP", "DEC", "dcp",

        "BNE", "CMP", "n/a", "dcp", "nop", "CMP", "DEC", "dcp",    // 0xD?
        "CLD", "CMP", "nop", "dcp", "nop", "CMP", "DEC", "dcp",

        "CPX", "SBC", "nop", "isb", "CPX", "SBC", "INC", "isb",    // 0xE?
        "INX", "SBC", "NOP", "sbc", "CPX", "SBC", "INC", "isb",

        "BEQ", "SBC", "n/a", "isb", "nop", "SBC", "INC", "isb",    // 0xF?
        "SED", "SBC", "nop", "isb", "nop", "SBC", "INC", "isb"
    ];


    var StopExecutionBit = 0x01;
    var FatalErrorBit = 0x02;
    var MaskableInterruptBit = 0x04;
    var NonmaskableInterruptBit = 0x08;

    /**
    * The current system for this processor.
    */
    var myCurrentSystem = null;

    /**
    * Negative flag
    */
    var N = false;     // N flag for processor status register
    /**
    * Overflow flag
    */
    var V = false;     // V flag for processor status register
    /**
    * Break command bit
    */
    var B = false;     // B flag for processor status register
    /**
    * Decimal flag
    */
    var D = false;     // D flag for processor status register
    /**
    * Interrupt disable flag ("Do not disturb")
    */
    var I = false;     // I flag for processor status register
    /**
    * The not-zero flag, holding the opposite of what the zero flag would 
    * have held.
    */
    var notZ = false;  // Z flag complement for processor status register
    /**
    * Carry flag
    */
    var C = false;     // C flag for processor status register


    /**
    * Accumulator register
    */
    var A = 0;   // Accumulator - byte
    /**
    * X register
    */
    var X = 0;   // X index register - byte
    /**
    * Y register
    */
    var Y = 0;    // Y index register - byte
    /**
    * Stack Pointer
    */
    var SP = 0;  // Stack Pointer - byte
    /**
    * Holds the opcode.
    */
    var IR = 0;   // Instruction register - byte
    /**
    * PC register (Program Counter)
    */
    var PC = 0;  // Program Counter - two bytes

    var myDebugInstructionsLeftToReport = 0;

    var myExecutionStatus = 0;

    /**
    * Set to wherever the last value was retrieved.
    */
    var myLastOperandAddress = 0;
    var myLastImmediateValues = [0, 0];
    /**
    * This is set to true if a page is crossed during the instruction.
    */
    var myPageCrossed = false;
    /**
    * The results of the most recent branch (with the number returned representing 
    * the additional number of processor cycles used.)
    */
    var myBranchResult = 0;

    /**
    * The number of cycles that have been communicated to mySystem in this instruction
    * cycle.  At the end of the instruction cycle, this number will be used to determine
    * the remaining number of cycles that mySystem should be informed of.
    */
    var myCyclesSignaled = 0;

    var myReadLast = false;

    var debugStartDump = false;

    function assert(check, msg) {
        if (!check) {
            console.log(msg);
        }
    }

    /*---a-a-a-a*/
    that.getRegisterSnapshot = function () {
        var zReturn = new Array();
        zReturn[that.INDEX_A] = that.getA();
        zReturn[that.INDEX_X] = that.getX();
        zReturn[that.INDEX_Y] = that.getY();
        zReturn[that.INDEX_PC] = that.getPC();
        zReturn[that.INDEX_SP] = that.getSP();
        zReturn[that.INDEX_FLAGS] = getFlags();
        return zReturn;
    }

    /**
    * Sets the system
    * @param aSystem The intended system for this 6502
    */
    that.install = function (aSystem) {
        myCurrentSystem = aSystem;
    }

    /**
    * Stops the execution loop of the CPU
    */
    that.stop = function () {
        myExecutionStatus |= StopExecutionBit;
    }

    /**
    * Retrieves a BCD (binary coded decimal) table for operations
    * involving numbers with decimals.
    * @return BCD table
    */
    that.getBCDTable = function () {
        return BCDTable;
    }

    that.isN = function () {
        return N;
    }

    that.setN = function (aN) {
        if (typeof(aN) == "boolean")
            N = aN;
        else
            N = aN != 0;
    }

    that.isV = function () {
        return V;
    }

    that.setV = function (aV) {
        if (typeof (aV) == "boolean")
            V = aV;
        else
            V = aV != 0;
    }

    that.isB = function () {
        return B;
    }

    that.setB = function (aB) {
        if (typeof (aB) == "boolean")
            B = aB;
        else
            B = aB != 0;
    }

    that.isD = function () {
        return D;
    }

    that.setD = function (aD) {
        if (typeof (aD) == "boolean")
            D = aD;
        else
            D = aD != 0;
    }

    that.isI = function () {
        return I;
    }

    that.setI = function (aI) {
        if (typeof (aI) == "boolean")
            I = aI;
        else
            I = aI != 0;
    }

    that.isNotZ = function () {
        return notZ;
    }

    that.setNotZ = function (aNotZ) {
        if (typeof (aNotZ) == "boolean")
            notZ = aNotZ;
        else
            notZ = aNotZ != 0;
    }

    that.isC = function () {
        return C;
    }

    that.setC = function (aC) {
        if (typeof (aC) == "boolean")
            C = aC;
        else
            C = aC != 0;
    }

    that.getA = function () {
        assert((A >= 0) && (A < 0x100));
        return A;
    }

    that.setA = function (aValue) {
        //debugMsg("Setting A", aA);
        assert((aValue >= 0) && (aValue < 0x100));
        A = aValue & 0xFF; //masking
    }

    that.getX = function () {
        return X;
    }

    that.setX = function (aValue) {
        assert((aValue >= 0) && (aValue < 0x100));
        X = aValue & 0xFF; //masking
    }

    that.getY = function () {
        return Y;
    }

    that.setY = function (aValue) {
        assert((aValue >= 0) && (aValue < 0x100));
        Y = aValue & 0xFF;
    }

    that.getSP = function () {
        return SP;
    }

    that.setSP = function (aValue) {
        assert((aValue >= 0) && (aValue < 0x100));
        SP = aValue;
    }

    that.SPdec = function () {  //same as SP--, but does the byte length limit thing
        var zOldSP = SP;
        SP = ((SP - 1) & 0xFF);
        return zOldSP;
    }

    that.SPinc = function () { //same as SP++, but does the byte length limit thing
        var zOldSP = SP;
        SP = ((SP + 1) & 0xFF);
        return zOldSP;
    }

    that.getIR = function () {
        return IR;
    }

    that.setIR = function (aValue) {
        assert((aValue >= 0) && (aValue < 0x100));
        IR  = aValue;
    }

    that.getPC = function () {
        return PC;
    }

    that.setPC = function (aPC) {
        PC = aPC;
    }

    // END ACCESSORS

    // ****************************** REGULAR METHODS ********************************
    /**
    * A not-very-elegant way of determining (I think) whether the most
    * recent operation of the CPU was a read (as opposed to a write).
    * @return true if last operation was a read (?)
    */
    that.lastAccessWasRead = function () {
        return myReadLast;
    }

    /**
    * Determines whether the two addresses are on the different pages.
    * @param aAddrA Address A
    * @param aAddrB Address B
    * @return true if the two addresses are on different pages
    */
    that.notSamePage = function (aAddrA, aAddrB) {
        return ((((aAddrA) ^ (aAddrB)) & 0xFF00) != 0);
    }

    /**
    * Executes a single execution cycle
    * @throws jstella.that.that.Js6507Exception 
    * @return number of instructions executed
    */
    /*
    that.execute = function () {
    return that.execute(-1);
    }
    */

    /**
    * This is the main method of this class.  It will execute for
    * the number of loops specified (unless something stops it early),
    * starting with the instruction at the address in the PC register.
    * 
    * An 'execution cycle' represents a single instruction.  It shouldn't
    * be confused with 'processor cycle'.  One execution cycle/loop usually takes
    * between 2 and 7 processor cycles.
    * @return number of instructions executed
    * @param aRepeats Number of loops (instructions) to execute
    * @throws jstella.that.that.Js6507Exception 
    */
    that.execute = function (aRepeats) {
        if (aRepeats == undefined)
            aRepeats = -1;
        // boolean zReturn=false;
        //int zReturn=0;
        var zContinue = true;
        myExecutionStatus &= FatalErrorBit; //clears all of the bits except fatal error bit
        //for (int i=0; i<aNumber; i++)

        //var inicioLoop = +new Date();

        var zCounter = 0;
        while (zContinue == true) {
            if ((aRepeats >= 0) && (zCounter == aRepeats)) {
                // System.out.println("DEBUG 6507 - repeats == counter");
                zContinue = false;
                break;
            } //end : reached # of repeats
            else zCounter++;

            if (zContinue == false) {
                // zReturn=zCounter; //BREAK
                break;
            }
            var zPreSnapshot = null;
            if (DEBUG_MODE_ON && zCounter < 7000) zPreSnapshot = that.getRegisterSnapshot();
            var zOpPC = that.getPC();
            IR = peekImmediate(); //Cost : 1 cycle

            var zOperand = 0;
            var zOperandAddress = 0;

            //var inicio = +new Date();
            //var operador = IR;

            //  debugMsg("OpCode", IR);

            // if (zOpPC==0xFB5E) debugStartDump=true;
            // if (debugStartDump==true) 
            //System.out.println("" + zCounter + " : DEBUG 6507 : address = " + Integer.toHexString(zOpPC) + " " + ourInstructionMnemonicTable[IR]);

            // int zCycles=ourInstructionProcessorCycleTable[IR];

            //DEBUGGING
            /*   if (IR==0x0C)
            {
            //  System.out.println("NOP_W");
                
                
            }//end : debug
            if (PC==0xD13A)
            {
                
            System.out.println("0xD139");
            }//end : debug
            * */
            /*  if ((IR==0x2C)&&(PC>50000) && (PC<60000))
            {
            // System.out.println("BIT_W - PC = " + PC + ", A=" + A + ", V=" + V + ", N=" + N + ", C=" + C);    
            // myDebugInstructionsLeftToReport+=10;
            
            }
            
            if ((IR==0x30)&&(PC==53689))
            {
            // System.out.println("BMI - PC = " + PC + ", A=" + A + ", V=" + V + ", N=" + N + ", C=" + C);    
             
            myDebugInstructionsLeftToReport+=10;
            }
            
            if (myDebugInstructionsLeftToReport>0)
            {
            String zOpCode=ourInstructionMnemonicTable[IR];
            System.out.println("" + zOpCode + " - PC = " + PC + ", A=" + A + ", V=" + V + ", N=" + N + ", C=" + C);    
            myDebugInstructionsLeftToReport--;
                 
            }
            * */

            switch (IR) {
                // BRK                                    
                case 0x00: INSTR_BRK();

                    // zContinue=false;
                    break;

                //ADC                                    
                case 0x69:
                case 0x65:
                case 0x75:
                case 0x6d:
                case 0x7d:
                case 0x79:
                case 0x61:
                case 0x71:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_ADC(zOperand);
                    break;






                //LDA                                    

                case 0xA9:
                case 0xA5:
                case 0xB5:
                case 0xAD:
                case 0xBD:
                case 0xB9:
                case 0xA1:
                case 0xB1:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_LDA(zOperand);
                    break;






                //LDX                                    
                case 0xA2:
                case 0xA6:
                case 0xB6:
                case 0xAE:
                case 0xBE:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_LDX(zOperand);
                    break;





                //LDY                                    
                case 0xA0:
                case 0xA4:
                case 0xB4:
                case 0xAC:
                case 0xBC:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_LDY(zOperand);
                    break;



                //  AND                                    
                case 0x29:
                case 0x25:
                case 0x35:
                case 0x2D:
                case 0x3D:
                case 0x39:
                case 0x21:
                case 0x31:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_AND(zOperand);
                    break;

                //ASL                                    

                case 0x0A: INSTR_ASLA(); break;
                case 0x06:
                case 0x16:
                case 0x0E:
                case 0x1E:

                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_ASL(zOperand, zOperandAddress);
                    break;

                // BIT                                    
                case 0x24:
                case 0x2C:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_BIT(zOperand);
                    break;




                // FLAG STUFF                                    

                case 0x18: INSTR_CLC(); break;
                case 0x38: INSTR_SEC(); break;
                case 0x58: INSTR_CLI(); break;
                case 0x78: INSTR_SEI(); break;
                case 0xB8: INSTR_CLV(); break;
                case 0xD8: INSTR_CLD(); break;
                case 0xF8: INSTR_SED(); break;


                // CMP                                    
                case 0xC9:
                case 0xC5:
                case 0xD5:
                case 0xCD:
                case 0xDD:
                case 0xD9:
                case 0xC1:
                case 0xD1:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_CMP(zOperand);
                    break;


                // CPX                                    
                case 0xE0:
                case 0xE4:
                case 0xEC:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_CPX(zOperand);
                    break;

                // CPY                                    
                case 0xC0:
                case 0xC4:
                case 0xCC:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_CPY(zOperand);
                    break;

                // DEC                                    
                case 0xC6:
                case 0xD6:
                case 0xCE:
                case 0xDE:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_DEC(zOperand, zOperandAddress);
                    break;


                // EOR                                    
                case 0x49:
                case 0x45:
                case 0x55:
                case 0x4D:
                case 0x5D:
                case 0x59:
                case 0x41:
                case 0x51:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_EOR(zOperand);
                    break;

                // INC                                    
                case 0xE6:
                case 0xF6:
                case 0xEE:
                case 0xFE:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_INC(zOperand, zOperandAddress);
                    break;

                //REG instructions                                    
                case 0xAA: INSTR_TAX(); break;
                case 0x8A: INSTR_TXA(); break;
                case 0xCA: INSTR_DEX(); break;
                case 0xE8: INSTR_INX(); break;
                case 0xA8: INSTR_TAY(); break;
                case 0x98: INSTR_TYA(); break;
                case 0x88: INSTR_DEY(); break;
                case 0xC8: INSTR_INY(); break;

                //JMP                                    
                case 0x4C:
                    peekAbsoluteJMP();
                    INSTR_JMP(zOperand, myLastOperandAddress);
                    break;
                case 0x6C:
                    //zOperand=retrieveOperand(ourAddressingModeTable[IR]);
                    //zOperandAddress=myLastOperandAddress;
                    peekIndirect();
                    INSTR_JMP(zOperand, myLastOperandAddress);
                    break;


                //JSR                                    
                case 0x20: INSTR_JSR(); break;


                //LSR                                    

                case 0x4A: INSTR_LSRA(); break;
                case 0x46:
                case 0x56:
                case 0x4E:
                case 0x5E:

                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_LSR(zOperand, zOperandAddress);
                    break;



                case 0xEA:
                    //case 0xE2 : //unofficial
                    //case 0x80 : //unofficial
                    INSTR_NOP(); break;


                // ORA                                    
                case 0x09:
                case 0x05:
                case 0x15:
                case 0x0D:
                case 0x1D:
                case 0x19:
                case 0x01:
                case 0x11:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_ORA(zOperand);
                    break;


                //Stack instructions                                    
                case 0x9A: INSTR_TXS(); break;
                case 0xBA: INSTR_TSX(); break;
                case 0x48: INSTR_PHA(); break;
                case 0x68: INSTR_PLA(); break;
                case 0x08: INSTR_PHP(); break;
                case 0x28: INSTR_PLP(); break;



                //ROL                                    

                case 0x2A: INSTR_ROLA(); break;

                case 0x26:
                case 0x36:
                case 0x2E:
                case 0x3E:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_ROL(zOperand, zOperandAddress);
                    break;


                //ROR                                    

                case 0x6A: INSTR_RORA(); break;

                case 0x66:
                case 0x76:
                case 0x6E:
                case 0x7E:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_ROR(zOperand, zOperandAddress);
                    break;


                // RT                                    
                case 0x40: INSTR_RTI(); break;
                case 0x60: INSTR_RTS(); break;


                // SBC                                    
                case 0xE9:
                case 0xE5:
                case 0xF5:
                case 0xED:
                case 0xFD:
                case 0xF9:
                case 0xE1:
                case 0xF1:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_SBC(zOperand);
                    break;


                // STA                                    

                case 0x85:
                case 0x95:
                case 0x8D:
                case 0x9D:
                case 0x99:
                case 0x81:
                case 0x91:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_STA(zOperand, zOperandAddress);
                    break;


                // STX                                    
                case 0x86:
                case 0x96:
                case 0x8E:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_STX(zOperand, zOperandAddress);
                    break;


                case 0x84:
                case 0x94:
                case 0x8C:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_STY(zOperand, zOperandAddress);
                    break;



                // BRANCH                                    
                case 0x10:
                    zOperand = peekImmediate();
                    INSTR_BPL(zOperand);
                    break;

                case 0x30:
                    zOperand = peekImmediate();
                    INSTR_BMI(zOperand);
                    break;

                case 0x50:
                    zOperand = peekImmediate();
                    INSTR_BVC(zOperand);
                    break;

                case 0x70:
                    zOperand = peekImmediate();
                    INSTR_BVS(zOperand);
                    break;

                case 0x90:
                    zOperand = peekImmediate();
                    INSTR_BCC(zOperand);
                    break;

                case 0xB0:
                    zOperand = peekImmediate();
                    INSTR_BCS(zOperand);
                    break;

                case 0xD0:
                    zOperand = peekImmediate();
                    INSTR_BNE(zOperand);
                    break;

                case 0xF0:
                    zOperand = peekImmediate();
                    INSTR_BEQ(zOperand);
                    break;


                //sax                                    

                case 0x87:
                case 0x97:
                case 0x83:
                case 0x8F:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_sax(zOperand, zOperandAddress);
                    break;


                //lax                                    
                case 0xA3:
                case 0xA7:
                case 0xB3:
                case 0xAF:
                case 0xB7:
                case 0xBF:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_lax(zOperand);
                    break;


                //sbx                                    
                case 0xCB:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_sbx(zOperand);
                    break;

                // nop w/operand                                    
                case 0x04:
                case 0x0C:
                case 0x14:
                case 0x1C:
                case 0x1A:
                case 0x34:
                case 0x3C:
                case 0x3A:
                case 0x44:
                case 0x54:
                case 0x5C:
                case 0x5A:
                case 0x64:
                case 0x74:
                case 0x7C:
                case 0x7A:
                case 0x80:
                case 0x82:
                case 0x89:
                case 0xC2:
                case 0xD4:
                case 0xDC:
                case 0xDA:
                case 0xE2:
                case 0xF4:
                case 0xFC:
                case 0xFA:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_nop(zOperand);
                    break;

                //dcp                                    
                case 0xC3:
                case 0xC7:
                case 0xCF:
                case 0xD3:
                case 0xD7:
                case 0xDB:
                case 0xDF:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_dcp(zOperand, zOperandAddress);
                    break;


                //isb                                    
                case 0xE3:
                case 0xE7:
                case 0xEF:
                case 0xF3:
                case 0xF7:
                case 0xFB:
                case 0xFF:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_isb(zOperand, zOperandAddress);
                    break;




                //slo                                    
                case 0x03:
                case 0x07:
                case 0x0F:
                case 0x13:
                case 0x17:
                case 0x1B:
                case 0x1F:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_slo(zOperand, zOperandAddress);
                    break;

                //asr                                    
                case 0x4B:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    INSTR_asr(zOperand);
                    break;


                //rla                                    
                case 0x27:
                case 0x37:
                case 0x2F:
                case 0x3F:
                case 0x3B:
                case 0x23:
                case 0x33:
                    zOperand = retrieveOperand(that.ourAddressingModeTable[IR]);
                    zOperandAddress = myLastOperandAddress;
                    INSTR_rla(zOperand, zOperandAddress);
                    break;



                default:
                    var zMsg = "Instruction not recognized - " + that.ourInstructionMnemonicTable[IR] + " (0x" + Integer.toHexString(IR) + ") at " + Integer.toHexString(that.getPC()) + "\n" + "Instructions in this cycle=" + zCounter;
                    throw zMsg;
                    //dbgout("Not recognized");
                    //assert(false);
                    //return true;
            } //end : switch


            /*
            var fim = +new Date();
            var diff = fim - inicio;
            myOperationList[operador] = diff;
            */

            if (DEBUG_MODE_ON && zCounter < 7000) {
                var zPostSnapshot = that.getRegisterSnapshot();
                debugCommand(zOpPC, IR, myLastImmediateValues, zPreSnapshot, zPostSnapshot); //formatValueString(IR, myLastImmediateValues));
            }

            var zCycles = calculateCycles(IR) - myCyclesSignaled;
            if (zCycles < 0) {
                var zDebug = 20;
            }
            assert(zCycles >= 0); //make sure we haven't signalled more cycles than have occurred
            myCurrentSystem.processorCycle(zCycles);
            myCyclesSignaled = 0;


            if (((myExecutionStatus & MaskableInterruptBit) != 0) || ((myExecutionStatus & NonmaskableInterruptBit) != 0)) {
                // Yes, so handle the interrupt
                assert(false); //INTERRUPTS haven't been tested
                //interruptHandler();
            }

            // See if execution has been stopped
            if ((myExecutionStatus & StopExecutionBit) != 0) {
                // Yes, so answer that everything finished fine
                // return true;
                //zReturn=zCounter;
                break;
            }

        } //end : for i loop

        /*
        var fimLoop = +new Date();
        var list = "Loop: " + (fimLoop - inicioLoop) + "<br />";
        for (var temp = 0; temp < that.ourInstructionMnemonicTable.length; temp++) {
            if (myOperationList[temp])
                list += that.ourInstructionMnemonicTable[temp] + " = " + myOperationList[temp] + "<br />";
        }
        $("#debug").html(list);
        */

        return zCounter; //zReturn;
    }


    function signalCycle() {
        myCurrentSystem.processorCycle(1);
        myCyclesSignaled++;
    }

    function calculateCycles(aIR) {
        var zCycleNum = that.ourInstructionProcessorCycleTable[aIR];
        var zIsBranch = (that.ourInstructionPageCrossDelay[aIR] == 2);
        var zPageDependent = (that.ourInstructionPageCrossDelay[aIR] == 1);
        if ((zIsBranch == true))
            zCycleNum += myBranchResult;
        else if ((zPageDependent == true) && (myPageCrossed == true))
            zCycleNum++;


        return zCycleNum;
    }


    function debugCommand(aOpPC, aIR, aOperands, aPre, aPost) {
        var zReturn = "";
        zReturn = "" + aOpPC.toString(16) + " " + that.ourInstructionMnemonicTable[IR];

        $(debugCanvas).append(zReturn);
		return;

        var zMode = that.ourAddressingModeTable[aIR];
        switch (zMode) {

            case that.AddressingMode.Implied: break; // (zMode==AddressingMode.Implied)

            case that.AddressingMode.Absolute:
            case that.AddressingMode.AbsoluteX:
            case that.AddressingMode.AbsoluteY:
                zReturn += " $" + aOperands[0].toString(16) + aOperands[1].toString(16);
                if (zMode == that.AddressingMode.AbsoluteX) zReturn += ",X";
                else if (zMode == that.AddressingMode.AbsoluteY) zReturn += ",Y";
                break;


            case that.AddressingMode.Immediate:
                zReturn += " #$" + aOperands[0].toString(16);
                break;

            case that.AddressingMode.Indirect:
                zReturn += " ($" + aOperands[0].toString(16) + aOperands[1].toString(16) + ")";
                break;

            case that.AddressingMode.IndirectX:
                zReturn += " ($" + aOperands[0].toString(16) + ",X)";
                break;

            case that.AddressingMode.IndirectY:
                zReturn += " ($" + aOperands[0].toString(16) + "),Y";
                break;

            case that.AddressingMode.Relative:
                zReturn += " $" + aOperands[0].toString(16) + "";
                break;

            case that.AddressingMode.Zero:
                zReturn += " $" + aOperands[0].toString(16) + "";
                break;

            case that.AddressingMode.ZeroX:
                zReturn += " $" + aOperands[0].toString(16) + ",X";
                break;

            case that.AddressingMode.ZeroY:
                zReturn += " $" + aOperands[0].toString(16) + ",Y";
                break;


        } //end :switch
        // myCurrentSystem.debugInstruction(zReturn, aPre, aPost);

        $(debugCanvas).html(zReturn);
    }

    that.reset = function () {
        myExecutionStatus = 0;
        A = 0x00;
        X = 0x00; //.setValue(0);
        Y = 0x00; //.setValue(0);

        SP = 0xff;
        setFlags(0x20);

        var res = myCurrentSystem.getResetPC();
        that.setPC(res);
    };

    function peek(aAddress, aSignalCycle) {
        if (aSignalCycle == undefined)
            aSignalCycle = true;

        assert(aAddress >= 0);
        myReadLast = true;
        myLastOperandAddress = aAddress;
        if (aSignalCycle == true) signalCycle();
        return myCurrentSystem.peek(aAddress);
    }


    function peekImmediate() {

        var zReturn = peek(PC); // +1 cycle
        PC++;
        myLastImmediateValues[1] = myLastImmediateValues[0];
        myLastImmediateValues[0] = zReturn;
        return zReturn;
    }

    /*
    function peekZeroPage() { //Total : 2 cycles
    var zAddr = peekImmediate(); // +1 cycle
    return peek(zAddr); // +1 cycle
    }
    */

    function peekZeroPage(aAdd) {
        if (aAdd == undefined) {
            var zAddr = peekImmediate(); // +1 cycle
            return peek(zAddr); // +1 cycle
        }
        else {
            var zAddr = peekImmediate(); // +1 cycle
            peek(zAddr); // +1 cycle        
            zAddr += aAdd;
            zAddr &= 0xFF;
            return peek(zAddr); // +1 cycle
        }
    }

    function peekAbsolute() {
        var zLowByte = peekImmediate(); // +1 cycle
        var zHighByte = peekImmediate(); // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8));

        // peek(zAddr); //FOR CYCLE ACCOUNTING PURPOSES?

        myPageCrossed = false;
        return peek(zAddr); // +1 cycle
    }

    function peekAbsoluteJMP() {
        var zLowByte = peekImmediate(); // +1 cycle
        var zHighByte = peekImmediate(); // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8));

        // peek(zAddr); //FOR CYCLE ACCOUNTING PURPOSES?

        myPageCrossed = false;
        return peek(zAddr, false); // +0 cycle
    }

    function peekAbsoluteIndex(aAdd) {
        var zLowByte = peekImmediate(); // +1 cycle
        var zHighByte = peekImmediate();  // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8));
        zAddr += aAdd;

        if (zLowByte + aAdd > 0xFF) {
            peek(zAddr); // +1 cycle - FOR CYCLE ACCOUNTING PURPOSES?
            myPageCrossed = true;
        } //end : page crossed
        else myPageCrossed = false;

        return peek(zAddr); // +1
    }

    function peekIndirect() {
        var zLowByte = peekImmediate(); // +1 cycle
        var zHighByte = peekImmediate(); // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8));
        var zLowByteB = peek(zAddr); // +1 cycle
        var zHighByteB = peek((zAddr + 1)); //+1 cycle
        var zAddrB = (zLowByteB | (zHighByteB << 8));
        return peek(zAddrB, false); // +0 cycle
    }

    function peekIndirectX() {
        var zZeroPage = ((peekImmediate() + X) & 255); //+1 cycle //the & 0xFF means address is confined to zero page
        var zLowByte = peek(zZeroPage); // +1 cycle
        var zHighByte = peek(((zZeroPage + 1) & 0xFF)); // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8));

        var zReturn = peek(zAddr); // +1 cycle

        return zReturn;
    }

    /*   private int peekIndirectQuasiY(int aAdder) //NOT A REAL INSTRUCTION
    {
    char zZeroPage=(peekImmediate());
    int zLowByte=peek(zZeroPage);
    int zHighByte=peek((zZeroPage+1));
    int zAddr=(zLowByte | (zHighByte<<8)) + aAdder;
    if (zLowByte + aAdder > 0xFF) peek(zAddr); //CYCLE?
    return peek(zAddr);
    }
    */

    function peekIndirectY() {
        var zZeroPage = (peekImmediate()); // +1 cycle
        var zLowByte = peek(zZeroPage); // +1 cycle
        var zHighByte = peek((zZeroPage + 1)); // +1 cycle
        var zAddr = (zLowByte | (zHighByte << 8)) + Y;
        if (zLowByte + Y > 0xFF) {
            peek(zAddr); // (+1 cycle)
            myPageCrossed = true;
        } //end : page cross
        else myPageCrossed = false;
        return peek(zAddr); // +1 cycle
    }

    function peekRelative() //note : actually retrieves the destination PC; not sure if this is used
    {
        var zOldPC = PC;
        var zByte = peekImmediate(); // +1
        var zAdd = toSignedByteValue(zByte);
        return zOldPC + zAdd;
    }

    /**
    * This method is used to convert from an unsigned byte value to a signed byte value.
    * @param aUnsignedByteValue The value that would be represented if a certain byte were unsigned.
    * @return The value that would be represented if the same certain byte were signed. 
    */
    function toSignedByteValue(aUnsignedByteValue) {
        assert(aUnsignedByteValue >= 0);
        assert(aUnsignedByteValue < 256);
        if ((aUnsignedByteValue >= 0) && (aUnsignedByteValue <= 127)) return aUnsignedByteValue;
        else {
            return aUnsignedByteValue - 256;
        } //end : is negative
    }


    /**
    * A method called from the that.execute() method that will retrieve the "operand"
    * value referred to by the instruction.
    * It will also set the myLastOperandAddress variable to wherever it finds this value.
    * @param aMode Addressing mode of the instruction
    * @return The value of the operand.
    */
    function retrieveOperand(aMode) {
        if (aMode == that.AddressingMode.Immediate) return peekImmediate();
        else if (aMode == that.AddressingMode.Zero) return peekZeroPage();
        else if (aMode == that.AddressingMode.ZeroX) return peekZeroPage(X);
        else if (aMode == that.AddressingMode.ZeroY) return peekZeroPage(Y);
        else if (aMode == that.AddressingMode.Indirect) return peekIndirect();
        //  else if (aMode==AddressingMode.IndirectX) return peekIndirectQuasiY(X);  //TODO : change back to normal
        else if (aMode == that.AddressingMode.IndirectX) return peekIndirectX();
        else if (aMode == that.AddressingMode.IndirectY) return peekIndirectY();
        else if (aMode == that.AddressingMode.Absolute) return peekAbsolute();
        else if (aMode == that.AddressingMode.AbsoluteX) return peekAbsoluteIndex(X);
        else if (aMode == that.AddressingMode.AbsoluteY) return peekAbsoluteIndex(Y);
        else if (aMode == that.AddressingMode.Relative) return peekRelative();
        else {
            assert(false);
            return 0;
        } //end : error
        //else if (aMode==AddressingMode.)
    }


    /*  private void poke(int aAddress, int aByteValue) {
        
    poke((char)aAddress, aByteValue);
       
    }
    */

    function poke(aAddress, aByteValue) {
        assert((aByteValue < 0x100) && (aByteValue >= 0x00));
        if (aAddress >= 0) {
            /*   if ((aAddress==0x99)&&(aByteValue==127))//&&(aByteValue > 100)&&(aByteValue<128))
            {
            System.out.println("******************************************************");
            System.out.println("Poking " + aAddress + " with " + aByteValue + ", IR=" + IR + ", PC=" + PC);
            System.out.println("*******************************************************");
            }*/
            myCurrentSystem.poke(aAddress, aByteValue);
            //TODO : mask all bytes going in?
        } //end >=0

        myReadLast = false;


        //  poke((int)aAddress, aByteValue);
    }


    /**
    * Sets the flags as if all the flags were bits of a single byte.
    * @param aByteValue The byte value to set the flags to.  Each bit represents a single flag.
    */
    function setFlags(aByteValue) {
        N = ((aByteValue & 0x80) != 0);
        V = ((aByteValue & 0x40) != 0);
        B = ((aByteValue & 0x10) != 0); //;  The 6507's B flag always true
        D = ((aByteValue & 0x08) != 0);
        I = ((aByteValue & 0x04) != 0);
        notZ = !((aByteValue & 0x02) != 0);
        C = ((aByteValue & 0x01) != 0);
    }

    /**
    * Retrieves the flag values as if they were part of a single byte.  Each bit 
    * represents a flag.
    * @return All of the flags, combined in a single byte
    */
    function getFlags() {

        var ps = 0x20;
        if (N) ps |= 0x80;
        if (V) ps |= 0x40;
        if (B) ps |= 0x10;
        if (D) ps |= 0x08;
        if (I) ps |= 0x04;
        if (!notZ) ps |= 0x02;
        if (C) ps |= 0x01;

        return ps;
    }



    function getBit(aByte, aBitNumber) {
        //boolean zReturn=false;
        return ((aByte & (0x01 << aBitNumber)) != 0);
    }

    //============== INSTRUCTIONS ============================

    function toByte(aValue) {
        return aValue & 255;
    }


    function INSTR_ADC(operand) {
        /*unsigned byte*/var oldA = A;
        assert((operand >= 0) && (operand < 0x100));
        var zUSum = A + operand;
        if (!D) //not decimal
        {
            var zSignedSum = (toByte(A) + toByte(operand));
            if (C == true) zSignedSum++;

            //short sum = (short)(((byte)A) + (short)((byte)operand) + (C ? 1 : 0));
            V = ((zSignedSum > 127) || (zSignedSum < -128)); //overflow


            if (C == true) zUSum++;
            //(short)((short)A + (short)operand + (C ? 1 : 0));
            that.setC(zUSum > 0xff);
            that.setA(zUSum & 0xFF);

            that.setNotZ((zUSum & 0xff) != 0);
            that.setN(getBit(A, 7));
        } else {
            var sum = BCDTable[0][A] + BCDTable[0][operand] + (C ? 1 : 0);

            that.setC(sum > 99);
            that.setNotZ(zUSum & 0xff);
            that.setA(BCDTable[1][sum & 0xff]);
            //  that.setNotZ(A!=0);
            //  N = (A.getBit(7));
            that.setN(getBit(A, 7));
            V = (((oldA ^ A) & 0x80) != 0) && (((A ^ operand) & 0x80) != 0);
        }
    }

    function INSTR_SBC(operand) {
        var oldA = A & 0xFF;
        assert((operand >= 0) && (operand < 0x100));
        if (!D) {
            //TODO: This is a very awkward method...needs to be more straight-forward/transparent (JLA)

            var zRevOperand = (~operand) & 0xFF;
            var zAmountToAdd = toSignedByteValue(zRevOperand) + (C ? 1 : 0); //if carry is on, amountToAdd= -1 * amountToSubtract, else it's one less (i.e. more negative)

            var zSignedResult = toSignedByteValue(A) + zAmountToAdd;
            that.setV(((zSignedResult > 127) || (zSignedResult < -128)));



            var zNewA = A + zAmountToAdd;


            var zAmountToSubtract = operand + (C ? 0 : 1);
            that.setC(zAmountToSubtract <= oldA);


            //that.setC(!(difference > 0xff));
            that.setA(zNewA & 0xFF);
            that.setNotZ(A != 0);
            that.setN((A & 0x80) != 0);
        } else {
            var difference = BCDTable[0][A] - BCDTable[0][operand] - (C ? 0 : 1);

            if (difference < 0)
                difference += 100;

            //Testing the following
            that.setNotZ(((A) + (~operand) + (C ? 1 : 0)) & 0xff);
            that.setA(BCDTable[1][difference]);

            //that.setNotZ(A!=0); //The original code
            that.setN((A & 0x80) != 0);

            that.setC((oldA >= (operand + (C ? 0 : 1))));
            that.setV((((oldA ^ A) & 0x80) != 0) && (((A ^ operand) & 0x80) != 0));
        }
    }


    function INSTR_LDA(aValue) {
        that.setA(aValue);
        notZ = (A != 0);
        N = ((A & 0x80) != 0);
    }


    function INSTR_LDX(operand) {
        assert(operand < 0x100);
        that.setX(operand);
        notZ = (X != 0);
        N = ((X & 0x80) != 0);

    } //::

    function INSTR_LDY(operand) {

        Y = operand;
        notZ = (Y != 0);
        N = ((Y & 0x80) != 0);

    } //::


    // ================


    function INSTR_AND(aValue) { //OK
        var zNewA = that.getA() & aValue;
        that.setA(zNewA);
        that.setNotZ(zNewA != 0);
        that.setN((zNewA & 0x80) != 0);
    }

    function INSTR_EOR(aValue) { //OK
        var zNewA = that.getA() ^ aValue;
        that.setA(zNewA);
        that.setNotZ(zNewA != 0);
        that.setN((zNewA & 0x80) != 0);

    }

    function INSTR_ORA(aValue) { //OK
        var zNewA = that.getA() | aValue;
        that.setA(zNewA);
        that.setNotZ(zNewA != 0);
        that.setN((zNewA & 0x80) != 0);
        //  A |= operand;
        // notZ = (A!=0);
        // N = ((A & 0x80)!=0);
    }





    function INSTR_ASL(aValue, operandAddress) { //OK
        // Set carry flag according to the left-most bit in value
        that.setC(aValue & 0x80);

        aValue <<= 1;
        aValue &= 0xFF;
        poke(operandAddress, aValue);

        that.setNotZ(aValue != 0);
        that.setN(aValue & 0x80);
    }

    function INSTR_ASLA() {
        // Set carry flag according to the left-most bit in A
        that.setC(A & 0x80);

        var zNewA = that.getA() << 1;
        zNewA &= 0xFF;
        that.setA(zNewA);

        that.setNotZ(A != 0);
        that.setN((A & 0x80) != 0);
    }




    function branch(aDoBranch, aDelta) {
        if (aDoBranch == true) {
            peek(PC);
            var address = PC + toSignedByteValue(aDelta);
            if (that.notSamePage(PC, address)) myBranchResult = 2;
            else myBranchResult = 1; //myPageCrossed=false; //  peek((PC & 0xFF00) | (address & 0x00FF));
            that.setPC(address);
        } else myBranchResult = 0;
    }


    function INSTR_BCC(operand) { branch(!C, operand); }
    function INSTR_BCS(operand) { branch(C, operand); }
    function INSTR_BEQ(operand) { branch(!notZ, operand); }
    function INSTR_BMI(operand) { branch(N, operand); }
    function INSTR_BNE(operand) { branch(notZ, operand); }
    function INSTR_BPL(operand) { branch(!N, operand); }
    function INSTR_BVC(operand) { branch(!V, operand); }
    function INSTR_BVS(operand) { branch(V, operand); }

    function INSTR_BIT(operand) { //OK
        assert((operand >= 0) && (operand < 0x100));
        that.setNotZ(A & operand);
        that.setN(operand & 0x80);
        that.setV(operand & 0x40);
    }

    function INSTR_BRK() { //OK
        peek(PC++);
        //  System.out.println("6507 DEBUG : BRK");
        B = true;

        poke(0x0100 + that.SPdec(), PC >> 8);
        poke(0x0100 + that.SPdec(), PC & 0x00ff);
        poke(0x0100 + that.SPdec(), getFlags());

        I = true;

        PC = peek(0xfffe);
        PC |= (peek(0xffff) << 8);
    }

    function INSTR_CLC() { that.setC(false); }
    function INSTR_CLD() { that.setD(false); }
    function INSTR_CLI() { that.setI(false); }
    function INSTR_CLV() { that.setV(false); }

    function INSTR_SEC() { that.setC(true); }
    function INSTR_SED() { that.setD(true); }
    function INSTR_SEI() { that.setI(true); }



    function INSTR_CMP(operand) { //OK
        var value = A - operand;

        that.setNotZ(value);
        that.setN(value & 0x0080);
        that.setC(((value & 0x0100) == 0));
    }

    function INSTR_CPX(operand) { //OK
        value = X - operand;

        that.setNotZ(value);
        that.setN(value & 0x0080);
        that.setC((value & 0x0100) == 0);
    }

    function INSTR_CPY(operand) { //OK
        var value = Y - operand;

        that.setNotZ(value);
        that.setN(value & 0x0080);
        that.setC((value & 0x0100) == 0);
    }



    function INSTR_DEC(operand, operandAddress) { //OK
        var value = operand - 1;
        value &= 0xFF;
        poke(operandAddress, value);

        that.setNotZ(value);
        that.setN(value & 0x80);
    }

    function INSTR_DEX() { //OK
        X--;
        X &= 0xFF; //masking, in case it went below zero
        notZ = (X != 0);
        N = ((X & 0x80) != 0);
    }


    function INSTR_DEY() { //OK
        Y--;

        Y &= 0xFF; //masking, in case it went below zero
        notZ = (Y != 0);
        N = ((Y & 0x80) != 0);
    }



    function INSTR_INC(operand, operandAddress) { //ok
        var value = operand + 1;
        value &= 0xFF;
        poke(operandAddress, value);

        that.setNotZ(value);
        that.setN(value & 0x80);
    }

    function INSTR_INX() { //OK
        X++;
        X &= 0xFF;
        assert(X < 0x100);
        notZ = (X != 0);
        N = ((X & 0x80) != 0);
    }

    function INSTR_INY() { //OK
        Y++;
        Y &= 0xFF;
        notZ = (Y != 0);
        N = ((Y & 0x80) != 0);
    }


    function INSTR_JMP(operand, operandAddress) { //OK
        PC = operandAddress;
    }

    function INSTR_JSR() { //OK
        var low = peekImmediate(); //PC++);
        peek(0x0100 + SP);

        // It seems that the 650x does not push the address of the next instruction
        // on the stack it actually pushes the address of the next instruction
        // minus one.  This is compensated for in the RTS instruction
        poke(0x0100 + that.SPdec(), PC >>> 8);
        poke(0x0100 + that.SPdec(), PC & 0xff);
        var high = peekImmediate();
        PC = (low | (high << 8));
    }

    function INSTR_RTS() { //OK
        peek(0x0100 + that.SPinc());

        var zAddr = 0;

        zAddr = peek(0x100 + that.SPinc());
        //that.setPC(zAddr);

        var zNewPC = (zAddr | (peek(0x0100 + SP) << 8));
        that.setPC(zNewPC);
        // debugMsg("RTS", zNewPC);
        peek(PC++);
    }






    function INSTR_LSR(operand, operandAddress) { //OK
        // Set carry flag according to the right-most bit in value
        that.setC(operand & 0x01);

        operand = (operand >> 1) & 0x7f;
        poke(operandAddress, operand);

        notZ = (operand != 0);
        that.setN(operand & 0x80);
    }


    function INSTR_LSRA() { //OK
        // Set carry flag according to the right-most bit
        that.setC(A & 0x01);

        that.setA((that.getA() >> 1) & 0x7f);

        that.setNotZ(A != 0);
        that.setN((A & 0x80) != 0);
    }




    function INSTR_NOP() {  //OK
    }



    function INSTR_PHA() { //OK
        poke(0x0100 + that.SPdec(), A);
    }

    function INSTR_PHP() { //OK
        poke(0x0100 + that.SPdec(), getFlags());
    }

    function INSTR_PLA() { //OK
        peek(0x0100 + that.SPinc());
        that.setA(peek(0x0100 + SP));
        that.setNotZ(A != 0);
        that.setN((A & 0x80) != 0);
    }

    function INSTR_PLP() { //OK
        peek(0x0100 + that.SPinc());
        setFlags(peek(0x0100 + SP));
    }



    function INSTR_ROL(operand, operandAddress) { //OK
        var oldC;

        if (typeof (C) == "boolean")
            oldC = C;
        else
            oldC = C != 0;

        // Set carry flag according to the left-most bit in operand
        that.setC(operand & 0x80);

        operand = ((operand << 1) | (oldC ? 1 : 0)) & 0xFF;
        poke(operandAddress, operand);

        notZ = (operand != 0);
        that.setN(operand & 0x80);
    }

    function INSTR_ROLA() { //OK
        var oldC;

        if (typeof (C) == "boolean")
            oldC = C;
        else
            oldC = C != 0;

        // Set carry flag according to the left-most bit
        that.setC(A & 0x80);
        var zNewA = (that.getA() << 1) | (oldC ? 1 : 0);
        that.setA(zNewA & 0xFF);

        that.setNotZ(A != 0);
        N = ((A & 0x80) != 0);
    }

    function INSTR_ROR(operand, operandAddress) {
        var oldC;

        if (typeof (C) == "boolean")
            oldC = C;
        else
            oldC = C != 0;


        // Set carry flag according to the right-most bit
        that.setC(operand & 0x01);

        operand = ((operand >> 1) & 0x7f) | (oldC ? 0x80 : 0x00);
        poke(operandAddress, operand);

        notZ = (operand != 0);
        that.setN(operand & 0x80);
    }

    function INSTR_RORA() {
        var oldC;

        if (typeof (C) == "boolean")
            oldC = C;
        else
            oldC = C != 0;


        // Set carry flag according to the right-most bit
        that.setC(A & 0x01);
        var zOldA = that.getA();
        var zNewA = ((that.getA() >> 1) & 0x7f) | (oldC ? 0x80 : 0x00);
        that.setA(zNewA);
        notZ = (zNewA != 0);
        N = ((zNewA & 0x80) != 0);
    }



    function INSTR_RTI() {
        peek(0x0100 + that.SPinc());
        setFlags(peek(0x0100 + that.SPinc()));
        PC = peek(0x0100 + that.SPinc());
        PC |= (peek(0x0100 + SP) << 8);
    }








    function INSTR_STA(operand, operandAddress) { //OK

        poke(operandAddress, that.getA());
    }

    function INSTR_STX(operand, operandAddress) { //ok
        poke(operandAddress, X);
    }

    function INSTR_STY(operand, operandAddress) { //ok
        poke(operandAddress, Y);
    }

    function INSTR_TAX() { //OK
        X = A;
        notZ = (X != 0);
        N = ((X & 0x80) != 0);
    }

    function INSTR_TAY() { //OK
        Y = A;
        notZ = (Y != 0);
        N = ((Y & 0x80) != 0);
    }

    function INSTR_TSX() { //OK
        X = SP;
        notZ = (X != 0);
        N = ((X & 0x80) != 0);
    }

    function INSTR_TXA() { //OK
        that.setA(X);
        notZ = (A != 0);
        N = ((A & 0x80) != 0);
    }

    function INSTR_TXS() { //OK
        that.setSP(X);
    }

    function INSTR_TYA() { //OK
        that.setA(Y);
        notZ = (A != 0);
        N = ((A & 0x80) != 0);
    }

    // ************** UNOFFICIAL INSTRUCTIONS ****************************  

    function INSTR_sax(operand, operandAddress) {
        poke(operandAddress, A & X);
    }


    function INSTR_lax(aValue) {
        that.setA(aValue);
        that.setX(aValue);
        notZ = (A != 0);
        N = ((A & 0x80) != 0);
    }



    function INSTR_sbx(operand) {
        var difference = ((A & X) & 0xff) - operand;

        that.setC((difference & 0x100) == 0);
        difference &= 0xff;
        that.setX(difference);
        that.setNotZ(difference != 0);
        that.setN((difference & 0x80) != 0);
    }


    function INSTR_asr(operand) {
        var myA = A & operand;

        that.setC(myA & 0x01);
        myA = (myA >> 1) & 0x7f;

        that.setA(myA);
        that.setNotZ(myA != 0);
        that.setN((myA & 0x80) != 0);


    }


    function INSTR_rla(operand, operandAddress) { //TODO: Double check code--it is untested
        var zValue = (operand << 1) | (C ? 1 : 0);
        poke(operandAddress, zValue);

        var zNewA = A & zValue;
        that.setA(zNewA & 0xFF);
        that.setC(operand & 0x80);
        that.setNotZ(zNewA);
        that.setN(zNewA & 0x80);
    }


    function INSTR_nop(operand) {  //do nothing (??)
    }

    function INSTR_dcp(operand, operandAddress) { //OK
        //this is DEC
        var value = operand - 1;
        value &= 0xFF;
        poke(operandAddress, value);

        //this is CMP
        value = A - value;

        that.setNotZ(value);
        that.setN(value & 0x0080);
        that.setC(((value & 0x0100) == 0));
    }

    function INSTR_isb(operand, operandAddress) {
        // this is INC
        // INSTR_INC(operand,operandAddress);
        // INSTR_SBC(operand+1);
        var value = operand + 1;
        value &= 0xFF;
        poke(operandAddress, value);



        // this is SBC
        var oldA = A;
        if (!D) {

            var zRevOperand = (~value) & 0xFF;

            var Sdifference = toSignedByteValue(A) + toSignedByteValue(zRevOperand) + (C ? 1 : 0);

            that.setV(((Sdifference > 127) || (Sdifference < -128)));
            var zSBV = toSignedByteValue(zRevOperand);

            var difference = A + zSBV + (C ? 1 : 0);


            var zSubAmount = value + (C ? 0 : 1);
            that.setC(zSubAmount <= oldA);

            //that.setC(!(difference > 0xff));
            that.setA(difference & 0xFF);
            that.setNotZ(A != 0);
            that.setN((A & 0x80) != 0);
        } else {
            var difference = BCDTable[0][A & 0xff] - BCDTable[0][value & 0xff] - (C ? 0 : 1);

            if (difference < 0)
                difference += 100;

            that.setA(BCDTable[1][difference & 0xff]);
            that.setNotZ(A != 0);
            that.setN((A & 0x80) != 0);

            that.setC((oldA >= (value + (C ? 0 : 1))));
            that.setV((((oldA ^ A) & 0x80) != 0) && (((A ^ value) & 0x80) != 0));
        }
    }



    function INSTR_slo(operand, operandAddress) {
        // Set carry flag according to the left-most bit in value
        that.setC(operand & 0x80);

        operand <<= 1;
        operand &= 0xFF;
        poke(operandAddress, operand);

        INSTR_ORA(operand);
    }

    that.systemCyclesReset = function () {
    }

    that.teste = function () {
        alert("Js6507");
    }

	that.enableDebug = function(aCanvas) {
		debugCanvas = aCanvas;
		DEBUG_MODE_ON = true;
	}

	that.disableDebug = function() {
		debugCanvas = null;
		DEBUG_MODE_ON = false;
	}

    that.install(aSystem);
};

