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

(function () {
    JsConstants = new Object();

    JsConstants.JOYSTICK_UP = 0; //pin one
    JsConstants.JOYSTICK_DOWN = 1;
    JsConstants.JOYSTICK_LEFT = 2;
    JsConstants.JOYSTICK_RIGHT = 3;  //pin four
    JsConstants.JOYSTICK_BUTTON = 5; //pin six

    JsConstants.PADDLE_ALPHA_BUTTON = 3; //pin four
    JsConstants.PADDLE_BETA_BUTTON = 2; //pin three
    JsConstants.PADDLE_ALPHA_RESISTANCE = 8; //pin nine
    JsConstants.PADDLE_BETA_RESISTANCE = 4; //pin five

    JsConstants.BOOSTERGRIP_BOOSTER = 4; //pin five
    JsConstants.BOOSTERGRIP_TRIGGER = 8; //pin nine

    //Sep 7 2007 (JLA) : I think the following are concerned with the page size as far as PageAccess is concerned...but does the CPU consider a page size to be 256 bytes?             
    JsConstants.LOG_MEMSIZE = 13;
    JsConstants.LOG_PAGESIZE = 6;
    JsConstants.ADDRESS_MASK = ((1 << JsConstants.LOG_MEMSIZE) - 1);
    JsConstants.PAGE_MASK = ((1 << JsConstants.LOG_PAGESIZE) - 1);
    JsConstants.PAGE_SIZE = (1 << JsConstants.LOG_PAGESIZE);
    JsConstants.PAGE_SHIFT = JsConstants.LOG_PAGESIZE;
    JsConstants.PAGE_COUNT = (1 << (JsConstants.LOG_MEMSIZE - JsConstants.LOG_PAGESIZE));

    JsConstants.RESISTANCE_MAX = 2147483640; //0x7FFFFFFF;
    JsConstants.RESISTANCE_MIN = 0x00000000;

    JsConstants.Jack = { LEFT: 0, RIGHT: 1 };
    JsConstants.DigitalPin = { One: 1, Two: 2, Three: 3, Four: 4, Six: 6 };
    JsConstants.AnalogPin = { Five: 5, Nine: 9 };

    JsConstants.TELEVISION_MODE_OFF = 0;
    JsConstants.TELEVISION_MODE_GAME = 1;
    JsConstants.TELEVISION_MODE_TEST_PATTERN = 2;
    JsConstants.TELEVISION_MODE_SNOW = 3;

    JsConstants.CLOCKS_PER_CPU_CYCLE = 3;

    JsConstants.CLOCKS_PER_LINE_BLANK = 68;
    JsConstants.CLOCKS_PER_LINE_VISIBLE = 160;
    JsConstants.CLOCKS_PER_LINE_TOTAL = JsConstants.CLOCKS_PER_LINE_BLANK + JsConstants.CLOCKS_PER_LINE_VISIBLE; //228 clocks/line

    JsConstants.LINES_PER_FRAME_TOTAL = 262;

    JsConstants.CLOCKS_PER_FRAME = JsConstants.CLOCKS_PER_LINE_TOTAL * JsConstants.LINES_PER_FRAME_TOTAL; //59,736 clocks/frame
    JsConstants.CPU_CYCLES_PER_FRAME = Math.floor(JsConstants.CLOCKS_PER_FRAME / JsConstants.CLOCKS_PER_CPU_CYCLE); //19,912 cycles/frame

    JsConstants.CLOCKS_PER_PLAYFIELD_BIT = 4;

    JsConstants.TIA_POKE_REGISTER_COUNT = 45;

    JsConstants.FRAME_Y_MAX = 300;
    JsConstants.FRAME_Y_MIN = 100;

    JsConstants.BIT0 = 0x01;
    JsConstants.BIT1 = 0x02;
    JsConstants.BIT2 = 0x04;
    JsConstants.BIT3 = 0x08;
    JsConstants.BIT4 = 0x10;
    JsConstants.BIT5 = 0x20;
    JsConstants.BIT6 = 0x40;
    JsConstants.BIT7 = 0x80;

    JsConstants.PIXEL_WIDTH_HEIGHT_RATIO = 1.6;

    //#############################################################################
    //###################  TIA/RIOT Registers   ###################################
    //#############################################################################   

    //Comments were cut-and-pasted from DASM
    // ==================== TIA POKE REGISTERS ===========================
    JsConstants.VSYNC = 0x00;   // 0000 00x0   Vertical Sync Set-Clear
    JsConstants.VBLANK = 0x01;   // xx00 00x0   Vertical Blank Set-Clear
    JsConstants.WSYNC = 0x02;   // ---- ----   Wait for Horizontal Blank
    JsConstants.RSYNC = 0x03;   // ---- ----   Reset Horizontal Sync Counter
    JsConstants.NUSIZ0 = 0x04;   //  00xx 0xxx   Number-Size player/missle 0
    JsConstants.NUSIZ1 = 0x05;   //  00xx 0xxx   Number-Size player/missle 1
    JsConstants.COLUP0 = 0x06;   //  xxxx xxx0   Color-Luminance Player 0
    JsConstants.COLUP1 = 0x07;   //  //  xxxx xxx0   Color-Luminance Player 1
    JsConstants.COLUPF = 0x08;   //  //  xxxx xxx0   Color-Luminance Playfield
    JsConstants.COLUBK = 0x09;   //  //  xxxx xxx0   Color-Luminance Background
    JsConstants.CTRLPF = 0x0A;   //  00xx 0xxx   Control Playfield, Ball, Collisions
    JsConstants.REFP0 = 0x0B;   //  0000 x000   Reflection Player 0
    JsConstants.REFP1 = 0x0C;   //  0000 x000   Reflection Player 1
    JsConstants.PF0 = 0x0D;   //  xxxx 0000   Playfield Register Byte 0
    JsConstants.PF1 = 0x0E;   //  xxxx xxxx   Playfield Register Byte 1
    JsConstants.PF2 = 0x0F;   //  xxxx xxxx   Playfield Register Byte 2
    JsConstants.RESP0 = 0x10;   // ---- ----   Reset Player 0
    JsConstants.RESP1 = 0x11;   //---- ----   Reset Player 1
    JsConstants.RESM0 = 0x12;   //---- ----   Reset Missle 0
    JsConstants.RESM1 = 0x13;   //---- ----   Reset Missle 1
    JsConstants.RESBL = 0x14;   //---- ----   Reset Ball
    JsConstants.AUDC0 = 0x15;   //  0000 xxxx   Audio Control 0
    JsConstants.AUDC1 = 0x16;   //  0000 xxxx   Audio Control 1
    JsConstants.AUDF0 = 0x17;   // 000x xxxx   Audio Frequency 0
    JsConstants.AUDF1 = 0x18;   //000x xxxx   Audio Frequency 1
    JsConstants.AUDV0 = 0x19;   //  0000 xxxx   Audio Volume 0
    JsConstants.AUDV1 = 0x1A;   //  0000 xxxx   Audio Volume 1
    JsConstants.GRP0 = 0x1B;   //  xxxx xxxx   Graphics Register Player 0
    JsConstants.GRP1 = 0x1C;   //  xxxx xxxx   Graphics Register Player 1
    JsConstants.ENAM0 = 0x1D;   //  0000 00x0   Graphics Enable Missle 0
    JsConstants.ENAM1 = 0x1E;   //  0000 00x0   Graphics Enable Missle 1
    JsConstants.ENABL = 0x1F;   //  0000 00x0   Graphics Enable Ball
    JsConstants.HMP0 = 0x20;   //  xxxx 0000   Horizontal Motion Player 0
    JsConstants.HMP1 = 0x21;   //  xxxx 0000   Horizontal Motion Player 1
    JsConstants.HMM0 = 0x22;   //  xxxx 0000   Horizontal Motion Missle 0
    JsConstants.HMM1 = 0x23;   //  xxxx 0000   Horizontal Motion Missle 1
    JsConstants.HMBL = 0x24;   //  xxxx 0000   Horizontal Motion Ball
    JsConstants.VDELP0 = 0x25;   //0000 000x   Vertical Delay Player 0
    JsConstants.VDELP1 = 0x26;   // 0000 000x   Vertical Delay Player 1
    JsConstants.VDELBL = 0x27;   // 0000 000x   Vertical Delay Ball
    JsConstants.RESMP0 = 0x28;   // 0000 00x0   Reset Missle 0 to Player 0
    JsConstants.RESMP1 = 0x29;   //0000 00x0   Reset Missle 1 to Player 1
    JsConstants.HMOVE = 0x2A;   // ---- ----   Apply Horizontal Motion
    JsConstants.HMCLR = 0x2B;   //---- ----   Clear Horizontal Move Registers
    JsConstants.CXCLR = 0x2C;   //---- ----   Clear Collision Latches

    // =========================== TIA Peek Registers =========================================
    JsConstants.CXM0P = 0x00; //       xx00 0000       Read Collision  M0-P1   M0-P0
    JsConstants.CXM1P = 0x01; //       xx00 0000                       M1-P0   M1-P1
    JsConstants.CXP0FB = 0x02; //       xx00 0000                       P0-PF   P0-BL
    JsConstants.CXP1FB = 0x03; //      xx00 0000                       P1-PF   P1-BL
    JsConstants.CXM0FB = 0x04; //       xx00 0000                       M0-PF   M0-BL
    JsConstants.CXM1FB = 0x05; //       xx00 0000                       M1-PF   M1-BL
    JsConstants.CXBLPF = 0x06; //       x000 0000                       BL-PF   -----
    JsConstants.CXPPMM = 0x07; //       xx00 0000                       P0-P1   M0-M1
    JsConstants.INPT0 = 0x08; //       x000 0000       Read Pot Port 0
    JsConstants.INPT1 = 0x09; //      x000 0000       Read Pot Port 1
    JsConstants.INPT2 = 0x0A; //       x000 0000       Read Pot Port 2
    JsConstants.INPT3 = 0x0B; //       x000 0000       Read Pot Port 3
    JsConstants.INPT4 = 0x0C; //		x000 0000       Read Input (Trigger) 0
    JsConstants.INPT5 = 0x0D; //		x000 0000       Read Input (Trigger) 1

    // ==================== RIOT Registers =============================

    JsConstants.SWCHA = 0x280;  //      Port A data register for joysticks: Bits 4-7 for player 1.  Bits 0-3 for player 2.

    JsConstants.SWACNT = 0x281;  //      Port A data direction register (DDR)
    JsConstants.SWCHB = 0x282;  //		Port B data (console switches)
    JsConstants.SWBCNT = 0x283;  //      Port B DDR
    JsConstants.INTIM = 0x284;  //		Timer output

    JsConstants.TIMINT = 0x285;  //	

    JsConstants.TIM1T = 0x294;  //	set 1 clock interval
    JsConstants.TIM8T = 0x295;  //      set 8 clock interval
    JsConstants.TIM64T = 0x296;  //      set 64 clock interval
    JsConstants.T1024T = 0x297;  //      set 1024 clock interval

    //========================== Other ===================================
    //These go with myEnabledObjects etc variable in JSTIA
    JsConstants.BIT_P0 = 0x01;         // Bit for Player 0
    JsConstants.BIT_M0 = 0x02;         // Bit for Missile 0
    JsConstants.BIT_P1 = 0x04;         // Bit for Player 1
    JsConstants.BIT_M1 = 0x08;         // Bit for Missile 1
    JsConstants.BIT_BL = 0x10;         // Bit for Ball
    JsConstants.BIT_PF = 0x20;         // Bit for Playfield
    JsConstants.BIT_SCORE = 0x40;        // Bit for Playfield score mode
    JsConstants.BIT_PRIORITY = 0x080;     // Bit for Playfield priority

    JsConstants.POKE_DELAY_TABLE = [
    0, 1, 0, 0, 8, 8, 0, 0, 0, 0, 0, 1, 1, -1, -1, -1,
    0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    JsConstants.HMOVE_BLANK_ENABLE_CYCLES = [
        true, true, true, true, true, true, true, true, true, true,   // 00
        true, true, true, true, true, true, true, true, true, true,   // 10
        true, false, false, false, false, false, false, false, false, false,  // 20
        false, false, false, false, false, false, false, false, false, false,  // 30
        false, false, false, false, false, false, false, false, false, false,  // 40
        false, false, false, false, false, false, false, false, false, false,  // 50
        false, false, false, false, false, false, false, false, false, false,  // 60
        false, false, false, false, false, true                                // 70
    ];

    JsConstants.COMPLETE_MOTION_TABLE = [
        [0, -1, -2, -3, -4, -5, -6, -7, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -6, -7, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -6, -7, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -6, -7, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -6, -6, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -5, -5, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -5, -5, -5, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -4, -4, -4, -4, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -3, -3, -3, -3, -3, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -2, -2, -2, -2, -2, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -2, -2, -2, -2, -2, -2, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, -1, -1, -1, -1, -1, -1, -1, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [0, 0, 0, 0, 0, 0, 0, 0, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [1, 1, 1, 1, 1, 1, 1, 1, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [1, 1, 1, 1, 1, 1, 1, 1, 8, 7, 6, 5, 4, 3, 2, 1], // HBLANK
        [2, 2, 2, 2, 2, 2, 2, 2, 8, 7, 6, 5, 4, 3, 2, 2], // HBLANK
        [3, 3, 3, 3, 3, 3, 3, 3, 8, 7, 6, 5, 4, 3, 3, 3], // HBLANK
        [4, 4, 4, 4, 4, 4, 4, 4, 8, 7, 6, 5, 4, 4, 4, 4], // HBLANK
        [4, 4, 4, 4, 4, 4, 4, 4, 8, 7, 6, 5, 4, 4, 4, 4], // HBLANK
        [5, 5, 5, 5, 5, 5, 5, 5, 8, 7, 6, 5, 5, 5, 5, 5], // HBLANK
        [6, 6, 6, 6, 6, 6, 6, 6, 8, 7, 6, 6, 6, 6, 6, 6], // HBLANK
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, -1, -2, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, -1, -2, -3, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, -1, -2, -3, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, -1, -2, -3, -4, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, -1, -2, -3, -4, -5, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, -1, -2, -3, -4, -5, -6, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, -1, -2, -3, -4, -5, -6, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, -1, -2, -3, -4, -5, -6, -7, 0, 0, 0, 0, 0, 0, 0, 0],
        [-1, -2, -3, -4, -5, -6, -7, -8, 0, 0, 0, 0, 0, 0, 0, 0],
        [-2, -3, -4, -5, -6, -7, -8, -9, 0, 0, 0, 0, 0, 0, 0, -1],
        [-2, -3, -4, -5, -6, -7, -8, -9, 0, 0, 0, 0, 0, 0, 0, -1],
        [-3, -4, -5, -6, -7, -8, -9, -10, 0, 0, 0, 0, 0, 0, -1, -2],
        [-4, -5, -6, -7, -8, -9, -10, -11, 0, 0, 0, 0, 0, -1, -2, -3],
        [-5, -6, -7, -8, -9, -10, -11, -12, 0, 0, 0, 0, -1, -2, -3, -4],
        [-5, -6, -7, -8, -9, -10, -11, -12, 0, 0, 0, 0, -1, -2, -3, -4],
        [-6, -7, -8, -9, -10, -11, -12, -13, 0, 0, 0, -1, -2, -3, -4, -5],
        [-7, -8, -9, -10, -11, -12, -13, -14, 0, 0, -1, -2, -3, -4, -5, -6],
        [-8, -9, -10, -11, -12, -13, -14, -15, 0, -1, -2, -3, -4, -5, -6, -7],
        [-8, -9, -10, -11, -12, -13, -14, -15, 0, -1, -2, -3, -4, -5, -6, -7],
        [0, -1, -2, -3, -4, -5, -6, -7, 8, 7, 6, 5, 4, 3, 2, 1]  // HBLANK
    ];


    //========================== PALETTES ============================================
    JsConstants.PALETTE_NTSC = [
        0x000000, 0, 0x4a4a4a, 0, 0x6f6f6f, 0, 0x8e8e8e, 0,
        0xaaaaaa, 0, 0xc0c0c0, 0, 0xd6d6d6, 0, 0xececec, 0,
        0x484800, 0, 0x69690f, 0, 0x86861d, 0, 0xa2a22a, 0,
        0xbbbb35, 0, 0xd2d240, 0, 0xe8e84a, 0, 0xfcfc54, 0,
        0x7c2c00, 0, 0x904811, 0, 0xa26221, 0, 0xb47a30, 0,
        0xc3903d, 0, 0xd2a44a, 0, 0xdfb755, 0, 0xecc860, 0,
        0x901c00, 0, 0xa33915, 0, 0xb55328, 0, 0xc66c3a, 0,
        0xd5824a, 0, 0xe39759, 0, 0xf0aa67, 0, 0xfcbc74, 0,
        0x940000, 0, 0xa71a1a, 0, 0xb83232, 0, 0xc84848, 0,
        0xd65c5c, 0, 0xe46f6f, 0, 0xf08080, 0, 0xfc9090, 0,
        0x840064, 0, 0x97197a, 0, 0xa8308f, 0, 0xb846a2, 0,
        0xc659b3, 0, 0xd46cc3, 0, 0xe07cd2, 0, 0xec8ce0, 0,
        0x500084, 0, 0x68199a, 0, 0x7d30ad, 0, 0x9246c0, 0,
        0xa459d0, 0, 0xb56ce0, 0, 0xc57cee, 0, 0xd48cfc, 0,
        0x140090, 0, 0x331aa3, 0, 0x4e32b5, 0, 0x6848c6, 0,
        0x7f5cd5, 0, 0x956fe3, 0, 0xa980f0, 0, 0xbc90fc, 0,
        0x000094, 0, 0x181aa7, 0, 0x2d32b8, 0, 0x4248c8, 0,
        0x545cd6, 0, 0x656fe4, 0, 0x7580f0, 0, 0x8490fc, 0,
        0x001c88, 0, 0x183b9d, 0, 0x2d57b0, 0, 0x4272c2, 0,
        0x548ad2, 0, 0x65a0e1, 0, 0x75b5ef, 0, 0x84c8fc, 0,
        0x003064, 0, 0x185080, 0, 0x2d6d98, 0, 0x4288b0, 0,
        0x54a0c5, 0, 0x65b7d9, 0, 0x75cceb, 0, 0x84e0fc, 0,
        0x004030, 0, 0x18624e, 0, 0x2d8169, 0, 0x429e82, 0,
        0x54b899, 0, 0x65d1ae, 0, 0x75e7c2, 0, 0x84fcd4, 0,
        0x004400, 0, 0x1a661a, 0, 0x328432, 0, 0x48a048, 0,
        0x5cba5c, 0, 0x6fd26f, 0, 0x80e880, 0, 0x90fc90, 0,
        0x143c00, 0, 0x355f18, 0, 0x527e2d, 0, 0x6e9c42, 0,
        0x87b754, 0, 0x9ed065, 0, 0xb4e775, 0, 0xc8fc84, 0,
        0x303800, 0, 0x505916, 0, 0x6d762b, 0, 0x88923e, 0,
        0xa0ab4f, 0, 0xb7c25f, 0, 0xccd86e, 0, 0xe0ec7c, 0,
        0x482c00, 0, 0x694d14, 0, 0x866a26, 0, 0xa28638, 0,
        0xbb9f47, 0, 0xd2b656, 0, 0xe8cc63, 0, 0xfce070, 0
    ];

    JsConstants.PALETTE_PAL = [
        0x000000, 0, 0x2b2b2b, 0, 0x525252, 0, 0x767676, 0,
        0x979797, 0, 0xb6b6b6, 0, 0xd2d2d2, 0, 0xececec, 0,
        0x000000, 0, 0x2b2b2b, 0, 0x525252, 0, 0x767676, 0,
        0x979797, 0, 0xb6b6b6, 0, 0xd2d2d2, 0, 0xececec, 0,
        0x805800, 0, 0x96711a, 0, 0xab8732, 0, 0xbe9c48, 0,
        0xcfaf5c, 0, 0xdfc06f, 0, 0xeed180, 0, 0xfce090, 0,
        0x445c00, 0, 0x5e791a, 0, 0x769332, 0, 0x8cac48, 0,
        0xa0c25c, 0, 0xb3d76f, 0, 0xc4ea80, 0, 0xd4fc90, 0,
        0x703400, 0, 0x89511a, 0, 0xa06b32, 0, 0xb68448, 0,
        0xc99a5c, 0, 0xdcaf6f, 0, 0xecc280, 0, 0xfcd490, 0,
        0x006414, 0, 0x1a8035, 0, 0x329852, 0, 0x48b06e, 0,
        0x5cc587, 0, 0x6fd99e, 0, 0x80ebb4, 0, 0x90fcc8, 0,
        0x700014, 0, 0x891a35, 0, 0xa03252, 0, 0xb6486e, 0,
        0xc95c87, 0, 0xdc6f9e, 0, 0xec80b4, 0, 0xfc90c8, 0,
        0x005c5c, 0, 0x1a7676, 0, 0x328e8e, 0, 0x48a4a4, 0,
        0x5cb8b8, 0, 0x6fcbcb, 0, 0x80dcdc, 0, 0x90ecec, 0,
        0x70005c, 0, 0x841a74, 0, 0x963289, 0, 0xa8489e, 0,
        0xb75cb0, 0, 0xc66fc1, 0, 0xd380d1, 0, 0xe090e0, 0,
        0x003c70, 0, 0x195a89, 0, 0x2f75a0, 0, 0x448eb6, 0,
        0x57a5c9, 0, 0x68badc, 0, 0x79ceec, 0, 0x88e0fc, 0,
        0x580070, 0, 0x6e1a89, 0, 0x8332a0, 0, 0x9648b6, 0,
        0xa75cc9, 0, 0xb76fdc, 0, 0xc680ec, 0, 0xd490fc, 0,
        0x002070, 0, 0x193f89, 0, 0x2f5aa0, 0, 0x4474b6, 0,
        0x578bc9, 0, 0x68a1dc, 0, 0x79b5ec, 0, 0x88c8fc, 0,
        0x340080, 0, 0x4a1a96, 0, 0x5f32ab, 0, 0x7248be, 0,
        0x835ccf, 0, 0x936fdf, 0, 0xa280ee, 0, 0xb090fc, 0,
        0x000088, 0, 0x1a1a9d, 0, 0x3232b0, 0, 0x4848c2, 0,
        0x5c5cd2, 0, 0x6f6fe1, 0, 0x8080ef, 0, 0x9090fc, 0,
        0x000000, 0, 0x2b2b2b, 0, 0x525252, 0, 0x767676, 0,
        0x979797, 0, 0xb6b6b6, 0, 0xd2d2d2, 0, 0xececec, 0,
        0x000000, 0, 0x2b2b2b, 0, 0x525252, 0, 0x767676, 0,
        0x979797, 0, 0xb6b6b6, 0, 0xd2d2d2, 0, 0xececec, 0
    ];

    JsConstants.PALETTE_NTSC_11 = [
        0x000000, 0, 0x393939, 0, 0x797979, 0, 0xababab, 0,
        0xcdcdcd, 0, 0xe6e6e6, 0, 0xf2f2f2, 0, 0xffffff, 0,
        0x391701, 0, 0x833008, 0, 0xc85f24, 0, 0xff911d, 0,
        0xffc51d, 0, 0xffd84c, 0, 0xfff456, 0, 0xffff98, 0,
        0x451904, 0, 0x9f241e, 0, 0xc85122, 0, 0xff811e, 0,
        0xff982c, 0, 0xffc545, 0, 0xffc66d, 0, 0xffe4a1, 0,
        0x4a1704, 0, 0xb21d17, 0, 0xdf251c, 0, 0xfa5255, 0,
        0xff706e, 0, 0xff8f8f, 0, 0xffabad, 0, 0xffc7ce, 0,
        0x050568, 0, 0x712272, 0, 0xa532a6, 0, 0xcd3ecf, 0,
        0xea51eb, 0, 0xfe6dff, 0, 0xff87fb, 0, 0xffa4ff, 0,
        0x280479, 0, 0x590f90, 0, 0x8839aa, 0, 0xc04adc, 0,
        0xe05eff, 0, 0xf27cff, 0, 0xff98ff, 0, 0xfeabff, 0,
        0x35088a, 0, 0x500cd0, 0, 0x7945d0, 0, 0xa251d9, 0,
        0xbe60ff, 0, 0xcc77ff, 0, 0xd790ff, 0, 0xdfaaff, 0,
        0x051e81, 0, 0x082fca, 0, 0x444cde, 0, 0x5a68ff, 0,
        0x7183ff, 0, 0x90a0ff, 0, 0x9fb2ff, 0, 0xc0cbff, 0,
        0x0c048b, 0, 0x382db5, 0, 0x584fda, 0, 0x6b64ff, 0,
        0x8a84ff, 0, 0x9998ff, 0, 0xb1aeff, 0, 0xc0c2ff, 0,
        0x1d295a, 0, 0x1d4892, 0, 0x1c71c6, 0, 0x489bd9, 0,
        0x55b6ff, 0, 0x8cd8ff, 0, 0x9bdfff, 0, 0xc3e9ff, 0,
        0x2f4302, 0, 0x446103, 0, 0x3e9421, 0, 0x57ab3b, 0,
        0x61d070, 0, 0x72f584, 0, 0x87ff97, 0, 0xadffb6, 0,
        0x0a4108, 0, 0x10680d, 0, 0x169212, 0, 0x1cb917, 0,
        0x21d91b, 0, 0x6ef040, 0, 0x83ff5b, 0, 0xb2ff9a, 0,
        0x04410b, 0, 0x066611, 0, 0x088817, 0, 0x0baf1d, 0,
        0x86d922, 0, 0x99f927, 0, 0xb7ff5b, 0, 0xdcff81, 0,
        0x02350f, 0, 0x0c4a1c, 0, 0x4f7420, 0, 0x649228, 0,
        0xa1b034, 0, 0xb2d241, 0, 0xd6e149, 0, 0xf2ff53, 0,
        0x263001, 0, 0x234005, 0, 0x806931, 0, 0xaf993a, 0,
        0xd5b543, 0, 0xe1cb38, 0, 0xe3e534, 0, 0xfbff7d, 0,
        0x401a02, 0, 0x702408, 0, 0xab511f, 0, 0xbf7730, 0,
        0xe19344, 0, 0xf9ad58, 0, 0xffc160, 0, 0xffcb83, 0
    ];

    JsConstants.PALETTE_PAL_11 = [
        0x000000, 0, 0x242424, 0, 0x484848, 0, 0x6d6d6d, 0,
        0x919191, 0, 0xb6b6b6, 0, 0xdadada, 0, 0xffffff, 0,
        0x000000, 0, 0x242424, 0, 0x484848, 0, 0x6d6d6d, 0,
        0x919191, 0, 0xb6b6b6, 0, 0xdadada, 0, 0xffffff, 0,
        0x4a3700, 0, 0x705813, 0, 0x8c732a, 0, 0xa68d46, 0,
        0xbea767, 0, 0xd4c18b, 0, 0xeadcb3, 0, 0xfff6de, 0,
        0x284a00, 0, 0x44700f, 0, 0x5c8c21, 0, 0x74a638, 0,
        0x8cbe51, 0, 0xa6d46e, 0, 0xc0ea8e, 0, 0xdbffb0, 0,
        0x4a1300, 0, 0x70280f, 0, 0x8c3d21, 0, 0xa65438, 0,
        0xbe6d51, 0, 0xd4886e, 0, 0xeaa58e, 0, 0xffc4b0, 0,
        0x004a22, 0, 0x0f703b, 0, 0x218c52, 0, 0x38a66a, 0,
        0x51be83, 0, 0x6ed49d, 0, 0x8eeab8, 0, 0xb0ffd4, 0,
        0x4a0028, 0, 0x700f44, 0, 0x8c215c, 0, 0xa63874, 0,
        0xbe518c, 0, 0xd46ea6, 0, 0xea8ec0, 0, 0xffb0db, 0,
        0x00404a, 0, 0x0f6370, 0, 0x217e8c, 0, 0x3897a6, 0,
        0x51afbe, 0, 0x6ec7d4, 0, 0x8edeea, 0, 0xb0f4ff, 0,
        0x43002c, 0, 0x650f4b, 0, 0x7e2165, 0, 0x953880, 0,
        0xa6519a, 0, 0xbf6eb7, 0, 0xd38ed3, 0, 0xe5b0f1, 0,
        0x001d4a, 0, 0x0f3870, 0, 0x21538c, 0, 0x386ea6, 0,
        0x518dbe, 0, 0x6ea8d4, 0, 0x8ec8ea, 0, 0xb0e9ff, 0,
        0x37004a, 0, 0x570f70, 0, 0x70218c, 0, 0x8938a6, 0,
        0xa151be, 0, 0xba6ed4, 0, 0xd28eea, 0, 0xeab0ff, 0,
        0x00184a, 0, 0x0f2e70, 0, 0x21448c, 0, 0x385ba6, 0,
        0x5174be, 0, 0x6e8fd4, 0, 0x8eabea, 0, 0xb0c9ff, 0,
        0x13004a, 0, 0x280f70, 0, 0x3d218c, 0, 0x5438a6, 0,
        0x6d51be, 0, 0x886ed4, 0, 0xa58eea, 0, 0xc4b0ff, 0,
        0x00014a, 0, 0x0f1170, 0, 0x21248c, 0, 0x383aa6, 0,
        0x5153be, 0, 0x6e70d4, 0, 0x8e8fea, 0, 0xb0b2ff, 0,
        0x000000, 0, 0x242424, 0, 0x484848, 0, 0x6d6d6d, 0,
        0x919191, 0, 0xb6b6b6, 0, 0xdadada, 0, 0xffffff, 0,
        0x000000, 0, 0x242424, 0, 0x484848, 0, 0x6d6d6d, 0,
        0x919191, 0, 0xb6b6b6, 0, 0xdadada, 0, 0xffffff, 0
    ];

    JsConstants.PALETTE_NTSC_Z26 = [
        0x000000, 0, 0x505050, 0, 0x646464, 0, 0x787878, 0,
        0x8c8c8c, 0, 0xa0a0a0, 0, 0xb4b4b4, 0, 0xc8c8c8, 0,
        0x445400, 0, 0x586800, 0, 0x6c7c00, 0, 0x809000, 0,
        0x94a414, 0, 0xa8b828, 0, 0xbccc3c, 0, 0xd0e050, 0,
        0x673900, 0, 0x7b4d00, 0, 0x8f6100, 0, 0xa37513, 0,
        0xb78927, 0, 0xcb9d3b, 0, 0xdfb14f, 0, 0xf3c563, 0,
        0x7b2504, 0, 0x8f3918, 0, 0xa34d2c, 0, 0xb76140, 0,
        0xcb7554, 0, 0xdf8968, 0, 0xf39d7c, 0, 0xffb190, 0,
        0x7d122c, 0, 0x912640, 0, 0xa53a54, 0, 0xb94e68, 0,
        0xcd627c, 0, 0xe17690, 0, 0xf58aa4, 0, 0xff9eb8, 0,
        0x730871, 0, 0x871c85, 0, 0x9b3099, 0, 0xaf44ad, 0,
        0xc358c1, 0, 0xd76cd5, 0, 0xeb80e9, 0, 0xff94fd, 0,
        0x5d0b92, 0, 0x711fa6, 0, 0x8533ba, 0, 0x9947ce, 0,
        0xad5be2, 0, 0xc16ff6, 0, 0xd583ff, 0, 0xe997ff, 0,
        0x401599, 0, 0x5429ad, 0, 0x683dc1, 0, 0x7c51d5, 0,
        0x9065e9, 0, 0xa479fd, 0, 0xb88dff, 0, 0xcca1ff, 0,
        0x252593, 0, 0x3939a7, 0, 0x4d4dbb, 0, 0x6161cf, 0,
        0x7575e3, 0, 0x8989f7, 0, 0x9d9dff, 0, 0xb1b1ff, 0,
        0x0f3480, 0, 0x234894, 0, 0x375ca8, 0, 0x4b70bc, 0,
        0x5f84d0, 0, 0x7398e4, 0, 0x87acf8, 0, 0x9bc0ff, 0,
        0x04425a, 0, 0x18566e, 0, 0x2c6a82, 0, 0x407e96, 0,
        0x5492aa, 0, 0x68a6be, 0, 0x7cbad2, 0, 0x90cee6, 0,
        0x044f30, 0, 0x186344, 0, 0x2c7758, 0, 0x408b6c, 0,
        0x549f80, 0, 0x68b394, 0, 0x7cc7a8, 0, 0x90dbbc, 0,
        0x0f550a, 0, 0x23691e, 0, 0x377d32, 0, 0x4b9146, 0,
        0x5fa55a, 0, 0x73b96e, 0, 0x87cd82, 0, 0x9be196, 0,
        0x1f5100, 0, 0x336505, 0, 0x477919, 0, 0x5b8d2d, 0,
        0x6fa141, 0, 0x83b555, 0, 0x97c969, 0, 0xabdd7d, 0,
        0x344600, 0, 0x485a00, 0, 0x5c6e14, 0, 0x708228, 0,
        0x84963c, 0, 0x98aa50, 0, 0xacbe64, 0, 0xc0d278, 0,
        0x463e00, 0, 0x5a5205, 0, 0x6e6619, 0, 0x827a2d, 0,
        0x968e41, 0, 0xaaa255, 0, 0xbeb669, 0, 0xd2ca7d, 0
    ];

    JsConstants.PALETTE_PAL_Z26 = [
        0x000000, 0, 0x4c4c4c, 0, 0x606060, 0, 0x747474, 0,
        0x888888, 0, 0x9c9c9c, 0, 0xb0b0b0, 0, 0xc4c4c4, 0,
        0x000000, 0, 0x4c4c4c, 0, 0x606060, 0, 0x747474, 0,
        0x888888, 0, 0x9c9c9c, 0, 0xb0b0b0, 0, 0xc4c4c4, 0,
        0x533a00, 0, 0x674e00, 0, 0x7b6203, 0, 0x8f7617, 0,
        0xa38a2b, 0, 0xb79e3f, 0, 0xcbb253, 0, 0xdfc667, 0,
        0x1b5800, 0, 0x2f6c00, 0, 0x438001, 0, 0x579415, 0,
        0x6ba829, 0, 0x7fbc3d, 0, 0x93d051, 0, 0xa7e465, 0,
        0x6a2900, 0, 0x7e3d12, 0, 0x925126, 0, 0xa6653a, 0,
        0xba794e, 0, 0xce8d62, 0, 0xe2a176, 0, 0xf6b58a, 0,
        0x075b00, 0, 0x1b6f11, 0, 0x2f8325, 0, 0x439739, 0,
        0x57ab4d, 0, 0x6bbf61, 0, 0x7fd375, 0, 0x93e789, 0,
        0x741b2f, 0, 0x882f43, 0, 0x9c4357, 0, 0xb0576b, 0,
        0xc46b7f, 0, 0xd87f93, 0, 0xec93a7, 0, 0xffa7bb, 0,
        0x00572e, 0, 0x106b42, 0, 0x247f56, 0, 0x38936a, 0,
        0x4ca77e, 0, 0x60bb92, 0, 0x74cfa6, 0, 0x88e3ba, 0,
        0x6d165f, 0, 0x812a73, 0, 0x953e87, 0, 0xa9529b, 0,
        0xbd66af, 0, 0xd17ac3, 0, 0xe58ed7, 0, 0xf9a2eb, 0,
        0x014c5e, 0, 0x156072, 0, 0x297486, 0, 0x3d889a, 0,
        0x519cae, 0, 0x65b0c2, 0, 0x79c4d6, 0, 0x8dd8ea, 0,
        0x5f1588, 0, 0x73299c, 0, 0x873db0, 0, 0x9b51c4, 0,
        0xaf65d8, 0, 0xc379ec, 0, 0xd78dff, 0, 0xeba1ff, 0,
        0x123b87, 0, 0x264f9b, 0, 0x3a63af, 0, 0x4e77c3, 0,
        0x628bd7, 0, 0x769feb, 0, 0x8ab3ff, 0, 0x9ec7ff, 0,
        0x451e9d, 0, 0x5932b1, 0, 0x6d46c5, 0, 0x815ad9, 0,
        0x956eed, 0, 0xa982ff, 0, 0xbd96ff, 0, 0xd1aaff, 0,
        0x2a2b9e, 0, 0x3e3fb2, 0, 0x5253c6, 0, 0x6667da, 0,
        0x7a7bee, 0, 0x8e8fff, 0, 0xa2a3ff, 0, 0xb6b7ff, 0,
        0x000000, 0, 0x4c4c4c, 0, 0x606060, 0, 0x747474, 0,
        0x888888, 0, 0x9c9c9c, 0, 0xb0b0b0, 0, 0xc4c4c4, 0,
        0x000000, 0, 0x4c4c4c, 0, 0x606060, 0, 0x747474, 0,
        0x888888, 0, 0x9c9c9c, 0, 0xb0b0b0, 0, 0xc4c4c4, 0
    ];

    // ========================== TIA Tables ==================================    
    //These are the mask tables, and they are used in computing what to draw.  They are filled
    //by the corresponding compute...() methods, which are called exactly once (statically)
    //in the static init method.  Consult the compute method to determine what
    //each of the array dimensions means
    JsConstants.BALL_MASK_TABLE = buildMultiDimensionalArray([4, 4, 320]);
    JsConstants.COLLISION_TABLE = new Array(64);
    JsConstants.DISABLED_MASK_TABLE = new Array(640);
    JsConstants.MISSILE_MASK_TABLE = buildMultiDimensionalArray([4, 8, 4, 320]);
    JsConstants.PLAYER_MASK_TABLE = buildMultiDimensionalArray([4, 2, 8, 320], 0);
    JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE = buildMultiDimensionalArray([8, 160, 160]);
    JsConstants.PLAYER_REFLECT_TABLE = new Array(256);
    JsConstants.PLAYFIELD_TABLE = new buildMultiDimensionalArray([2, 160]);
    JsConstants.PRIORITY_ENCODER = new buildMultiDimensionalArray([2, 256]);

    function init() {
        //Compute all of the mask tables
        for (var i = 0; i < 640; ++i) {
            JsConstants.DISABLED_MASK_TABLE[i] = 0;
        }

        computeBallMaskTable();
        computeCollisionTable();
        computeMissileMaskTable();
        computePlayerMaskTable();
        computePlayerPositionResetWhenTable();
        computePlayerReflectTable();
        computePlayfieldMaskTable();
        computePriorityEncoder();
    }

    /**
    * (A method that allowed me to type less when converting C++ to Java. It makes for
    * more readable code as well. -JLA)
    * @param aValue an integer
    * @return the boolean equivalent (in C++) of the integer
    */
    function bool(aValue) {
        if (aValue == 0) return false;
        else return true;
    }

    function computePriorityEncoder() {
        for (var x = 0; x < 2; ++x) {
            for (var enabled = 0; enabled < 256; ++enabled) {
                if ((enabled & JsConstants.BIT_PRIORITY) != 0) {
                    var color = 0;

                    if ((enabled & (JsConstants.BIT_P1 | JsConstants.BIT_M1)) != 0)
                        color = 3;
                    if ((enabled & (JsConstants.BIT_P0 | JsConstants.BIT_M0)) != 0)
                        color = 2;
                    if ((enabled & JsConstants.BIT_BL) != 0)
                        color = 1;
                    if ((enabled & JsConstants.BIT_PF) != 0)
                        color = 1;  // NOTE: Playfield has priority so BIT_SCORE isn't used

                    JsConstants.PRIORITY_ENCODER[x][enabled] = color;
                }
                else {
                    var color = 0;

                    if ((enabled & JsConstants.BIT_BL) != 0)
                        color = 1;
                    if ((enabled & JsConstants.BIT_PF) != 0)
                        color = (((enabled & JsConstants.BIT_SCORE) != 0) ? ((x == 0) ? 2 : 3) : 1) & 0xFF;
                    if ((enabled & (JsConstants.BIT_P1 | JsConstants.BIT_M1)) != 0)
                        color = ((color != 2) ? 3 : 2);
                    if ((enabled & (JsConstants.BIT_P0 | JsConstants.BIT_M0)) != 0)
                        color = 2;

                    JsConstants.PRIORITY_ENCODER[x][enabled] = color;
                }
            }
        }
    }

    function computeBallMaskTable() {
        // First, calculate masks for alignment 0
        for (var size = 0; size < 4; ++size) {
            var x = 0;
            // Set all of the masks to false to start with
            for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x) { JsConstants.BALL_MASK_TABLE[0][size][x] = false; }

            // Set the necessary fields true
            for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE + 8; ++x) {
                if ((x >= 0) && (x < (1 << size))) {
                    JsConstants.BALL_MASK_TABLE[0][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                }
            }

            // Copy fields into the wrap-around area of the mask
            for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x) {
                JsConstants.BALL_MASK_TABLE[0][size][x + JsConstants.CLOCKS_PER_LINE_VISIBLE] = JsConstants.BALL_MASK_TABLE[0][size][x];
            }
        }

        // Now, copy data for alignments of 1, 2 and 3
        for (var align = 1; align < 4; ++align) {
            for (var size = 0; size < 4; ++size) {
                for (var x = 0; x < 320; ++x) {
                    JsConstants.BALL_MASK_TABLE[align][size][x] =
                            JsConstants.BALL_MASK_TABLE[0][size][(x + 320 - align) % 320];
                }
            }
        }
    }

    function computeCollisionTable() {
        for (var i = 0; i < 64; ++i) {
            JsConstants.COLLISION_TABLE[i] = 0;

            if (bool(i & JsConstants.BIT_M0) && bool(i & JsConstants.BIT_P1))    // M0-P1
                JsConstants.COLLISION_TABLE[i] |= 0x0001;

            if (bool(i & JsConstants.BIT_M0) && bool(i & JsConstants.BIT_P0))    // M0-P0
                JsConstants.COLLISION_TABLE[i] |= 0x0002;

            if (bool(i & JsConstants.BIT_M1) && bool(i & JsConstants.BIT_P0))    // M1-P0
                JsConstants.COLLISION_TABLE[i] |= 0x0004;

            if (bool(i & JsConstants.BIT_M1) && bool(i & JsConstants.BIT_P1))    // M1-P1
                JsConstants.COLLISION_TABLE[i] |= 0x0008;

            if (bool(i & JsConstants.BIT_P0) && bool(i & JsConstants.BIT_PF))    // P0-PF
                JsConstants.COLLISION_TABLE[i] |= 0x0010;

            if (bool(i & JsConstants.BIT_P0) && bool(i & JsConstants.BIT_BL))    // P0-BL
                JsConstants.COLLISION_TABLE[i] |= 0x0020;

            if (bool(i & JsConstants.BIT_P1) && bool(i & JsConstants.BIT_PF))    // P1-PF
                JsConstants.COLLISION_TABLE[i] |= 0x0040;

            if (bool(i & JsConstants.BIT_P1) && bool(i & JsConstants.BIT_BL))    // P1-BL
                JsConstants.COLLISION_TABLE[i] |= 0x0080;

            if (bool(i & JsConstants.BIT_M0) && bool(i & JsConstants.BIT_PF))    // M0-PF
                JsConstants.COLLISION_TABLE[i] |= 0x0100;

            if (bool(i & JsConstants.BIT_M0) && bool(i & JsConstants.BIT_BL))    // M0-BL
                JsConstants.COLLISION_TABLE[i] |= 0x0200;

            if (bool(i & JsConstants.BIT_M1) && bool(i & JsConstants.BIT_PF))    // M1-PF
                JsConstants.COLLISION_TABLE[i] |= 0x0400;

            if (bool(i & JsConstants.BIT_M1) && bool(i & JsConstants.BIT_BL))    // M1-BL
                JsConstants.COLLISION_TABLE[i] |= 0x0800;

            if (bool(i & JsConstants.BIT_BL) && bool(i & JsConstants.BIT_PF))    // BL-PF
                JsConstants.COLLISION_TABLE[i] |= 0x1000;

            if (bool(i & JsConstants.BIT_P0) && bool(i & JsConstants.BIT_P1))    // P0-P1
                JsConstants.COLLISION_TABLE[i] |= 0x2000;

            if (bool(i & JsConstants.BIT_M0) && bool(i & JsConstants.BIT_M1))    // M0-M1
                JsConstants.COLLISION_TABLE[i] |= 0x4000;
        }
    }

    function computeMissileMaskTable() {
        // First, calculate masks for alignment 0
        var x, size, number;

        // Clear the missile table to start with
        for (number = 0; number < 8; ++number)
            for (size = 0; size < 4; ++size)
                for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x)
                    JsConstants.MISSILE_MASK_TABLE[0][number][size][x] = false;

        for (number = 0; number < 8; ++number) {
            for (size = 0; size < 4; ++size) {
                for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE + 72; ++x) {
                    // Only one copy of the missile
                    if ((number == 0x00) || (number == 0x05) || (number == 0x07)) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                    // Two copies - close
                    else if (number == 0x01) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 16) >= 0) && ((x - 16) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                    // Two copies - medium
                    else if (number == 0x02) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 32) >= 0) && ((x - 32) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                    // Three copies - close
                    else if (number == 0x03) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 16) >= 0) && ((x - 16) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 32) >= 0) && ((x - 32) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                    // Two copies - wide
                    else if (number == 0x04) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 64) >= 0) && ((x - 64) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                    // Three copies - medium
                    else if (number == 0x06) {
                        if ((x >= 0) && (x < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 32) >= 0) && ((x - 32) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                        else if (((x - 64) >= 0) && ((x - 64) < (1 << size)))
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = true;
                    }
                }

                // Copy data into wrap-around area
                for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x)
                    JsConstants.MISSILE_MASK_TABLE[0][number][size][x + JsConstants.CLOCKS_PER_LINE_VISIBLE] =
                            JsConstants.MISSILE_MASK_TABLE[0][number][size][x];
            }
        }

        // Now, copy data for alignments of 1, 2 and 3
        for (var align = 1; align < 4; ++align) {
            for (number = 0; number < 8; ++number) {
                for (size = 0; size < 4; ++size) {
                    for (x = 0; x < 320; ++x) {
                        JsConstants.MISSILE_MASK_TABLE[align][number][size][x] =
                                JsConstants.MISSILE_MASK_TABLE[0][number][size][(x + 320 - align) % 320];
                    }
                }
            }
        }
    }

    function computePlayerMaskTable() {
        // First, calculate masks for alignment 0
        var x, enable, mode;

        // Now, compute the player mask table
        for (enable = 0; enable < 2; ++enable) {
            for (mode = 0; mode < 8; ++mode) {
                for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE + 72; ++x) {
                    if (mode == 0x00) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = ((0x80 >> x) & 0xFFFF);
                    }
                    else if (mode == 0x01) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> x;
                        else if (((x - 16) >= 0) && ((x - 16) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 16);
                    }
                    else if (mode == 0x02) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> x;
                        else if (((x - 32) >= 0) && ((x - 32) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 32);
                    }
                    else if (mode == 0x03) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> x;
                        else if (((x - 16) >= 0) && ((x - 16) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 16);
                        else if (((x - 32) >= 0) && ((x - 32) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 32);
                    }
                    else if (mode == 0x04) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> x;
                        else if (((x - 64) >= 0) && ((x - 64) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 64);
                    }
                    else if (mode == 0x05) {
                        // For some reason in double size mode the player's output
                        // is delayed by one pixel thus we use > instead of >=
                        if ((enable == 0) && (x > 0) && (x <= 16))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> Math.floor((x - 1) / 2);
                    }
                    else if (mode == 0x06) {
                        if ((enable == 0) && (x >= 0) && (x < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> x;
                        else if (((x - 32) >= 0) && ((x - 32) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 32);
                        else if (((x - 64) >= 0) && ((x - 64) < 8))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> (x - 64);
                    }
                    else if (mode == 0x07) {
                        // For some reason in quad size mode the player's output
                        // is delayed by one pixel thus we use > instead of >=
                        if ((enable == 0) && (x > 0) && (x <= 32))
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 0x80 >> Math.floor((x - 1) / 4);
                    }
                }

                // Copy data into wrap-around area
                for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x) {
                    JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x + JsConstants.CLOCKS_PER_LINE_VISIBLE] =
                            JsConstants.PLAYER_MASK_TABLE[0][enable][mode][x];
                }
            }
        }

        // Now, copy data for alignments of 1, 2 and 3
        for (var align = 1; align < 4; ++align) {
            for (enable = 0; enable < 2; ++enable) {
                for (mode = 0; mode < 8; ++mode) {
                    for (x = 0; x < 320; ++x) {
                        JsConstants.PLAYER_MASK_TABLE[align][enable][mode][x] =
                                JsConstants.PLAYER_MASK_TABLE[0][enable][mode][(x + 320 - align) % 320];
                    }
                }
            }
        }
    }

    function computePlayerPositionResetWhenTable() {
        var mode, oldx, newx;

        // Loop through all player modes, all old player positions, and all new
        // player positions and determine where the new position is located:
        // 1 means the new position is within the display of an old copy of the
        // player, -1 means the new position is within the delay portion of an
        // old copy of the player, and 0 means it's neither of these two
        for (mode = 0; mode < 8; ++mode) {
            for (oldx = 0; oldx < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++oldx) {
                // Set everything to 0 for non-delay/non-display section
                for (newx = 0; newx < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++newx) {
                    JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx] = 0;
                }

                // Now, we'll set the entries for non-delay/non-display section
                for (newx = 0; newx < JsConstants.CLOCKS_PER_LINE_VISIBLE + 72 + 5; ++newx) {
                    if (mode == 0x00) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x01) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 16)) && (newx < (oldx + 16 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 16 + 4) && (newx < (oldx + 16 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x02) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 32)) && (newx < (oldx + 32 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 32 + 4) && (newx < (oldx + 32 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x03) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 16)) && (newx < (oldx + 16 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 32)) && (newx < (oldx + 32 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 16 + 4) && (newx < (oldx + 16 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 32 + 4) && (newx < (oldx + 32 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x04) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 64)) && (newx < (oldx + 64 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 64 + 4) && (newx < (oldx + 64 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x05) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 16)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x06) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 32)) && (newx < (oldx + 32 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;
                        else if ((newx >= (oldx + 64)) && (newx < (oldx + 64 + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 32 + 4) && (newx < (oldx + 32 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                        else if ((newx >= oldx + 64 + 4) && (newx < (oldx + 64 + 4 + 8)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                    else if (mode == 0x07) {
                        if ((newx >= oldx) && (newx < (oldx + 4)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = -1;

                        if ((newx >= oldx + 4) && (newx < (oldx + 4 + 32)))
                            JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx % JsConstants.CLOCKS_PER_LINE_VISIBLE] = 1;
                    }
                }

                // Let's do a sanity check on our table entries
                var s1 = 0, s2 = 0;
                for (newx = 0; newx < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++newx) {
                    if (JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx] == -1)
                        ++s1;
                    if (JsConstants.PLAYER_POSITION_RESET_WHEN_TABLE[mode][oldx][newx] == 1)
                        ++s2;
                }
            }
        }
    }

    function computePlayerReflectTable() {
        for (var i = 0; i < 256; ++i) {
            var r = 0;

            for (var t = 1; t <= 128; t *= 2) {
                r = ((r << 1) | (bool(i & t) ? 0x01 : 0x00) & 0xFF);
            }

            JsConstants.PLAYER_REFLECT_TABLE[i] = r;
        }
    }

    function toBinary(n) {
        n = n.replace(/[^0-9]/, '');
        if (!n || n == 0) return 0;
        //calculate the number of bits required to store the number
        var bits = Math.floor(Math.log(Math.pow(2, Math.ceil(Math.log((Number(n) + 1)) / Math.log(2)))) / Math.log(2));
        var bitArray = new Array();
        var bitVal;
        var i;

        for (i = 0; i < bits; i++) {
            bitArray[i] = 0;
            //calculate the max value of this bit, make sure it starts as low as possible
            bitVal = Math.pow(2, bits - i - 1);
            if (n >= bitVal) {
                bitArray[i] = 1;
                n = n - bitVal;
            }
        }

        return bitArray.join("");
    }

    function debugDumpArray(aArray) {
        var zYCount = aArray[0].length;
        var zXCount = aArray.length;
        for (var i_x = 0; i_x < zXCount; i_x++) {
            for (var i_y = 0; i_y < zYCount; i_y++) {
                console.log("[" + i_x + "][" + i_y + "] = " + toBinary(aArray[i_x][i_y]));
            }
        }
    }

    function computePlayfieldMaskTable() {
        var x;

        // Compute playfield mask table for non-reflected mode
        for (x = 0; x < JsConstants.CLOCKS_PER_LINE_VISIBLE; ++x) {
            if (x < 16)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x00001 << Math.floor(x / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //0-15
            else if (x < 48)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x00800 >> Math.floor((x - 16) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //16-47
            else if (x < 80)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x01000 << Math.floor((x - 48) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //48-79 
            else if (x < 96)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x00001 << Math.floor((x - 80) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //80-95
            else if (x < 128)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x00800 >> Math.floor((x - 96) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //96-127
            else if (x < 160)
                JsConstants.PLAYFIELD_TABLE[0][x] = 0x01000 << Math.floor((x - 128) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT); //128-159
        }

        // Compute playfield mask table for reflected mode
        for (x = 0; x < 160; ++x) {
            if (x < 16)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x00001 << Math.floor(x / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
            else if (x < 48)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x00800 >> Math.floor((x - 16) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
            else if (x < 80)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x01000 << Math.floor((x - 48) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
            else if (x < 112)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x80000 >> Math.floor((x - 80) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
            else if (x < 144)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x00010 << Math.floor((x - 112) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
            else if (x < 160)
                JsConstants.PLAYFIELD_TABLE[1][x] = 0x00008 >> Math.floor((x - 144) / JsConstants.CLOCKS_PER_PLAYFIELD_BIT);
        }
    }

    init();

    window.JsConstants = JsConstants;
})();


