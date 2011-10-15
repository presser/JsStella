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
 * The class that takes care of drawing to the user's computer screen.
 * 
 * <p>
 *     It essentially works this way: <br>
 *     The currentFrameBuffer array (and the previousFrameBuffer one) represent
 *     the pixels of the TV display, with the top left being the first, and increasing
 *     to the right, eventually continuing on the next line down, on the left side of the 
 *     screen. The values of this array represent INDICES (of the palette array) of the 
 *     colors pertaining to that pixel.  It is the TIA's job to set the values of this
 *     array--it does so when JSConsole's doFrame() calls the TIA's processFrame() method.
 *     When the JSConsole calls the doVideo() method, this data should already be updated.
 *     So JSVideo first takes the values in the FrameBuffer array and uses them to 
 *     set the pixels on the back buffer image to the corresponding color.  It then has
 *     the back buffer painted onto the GUI's canvas.
 *     
 *     All of the GUI related scaling is done in the canvas class of the GUI.
 *     
 *     
 *     
 *     
 * </p>
 * @author Bradford W. Mott and the Stella team (original)
 * J.L. Allen (Java translation)
 */

var JsVideoConsts = {
    DEFAULT_WIDTH: 160,
    DEFAULT_HEIGHT: 200, //not sure if this is still used
    DEFAULT_PHOSPHOR_BLEND: 77
}

window.JsVideoConsts = JsVideoConsts;

function JsVideo(console) {
    var jsvideo = this;

    function toRGB(r, g, b) {
        var intValue = 0;
        intValue = intValue | (r & 255);
        intValue = intValue << 8;
        intValue = intValue | (g & 255);
        intValue = intValue << 8;
        intValue = intValue | (b & 255);
        return intValue;
    }

    var PALETTE_GRAY_STANDARD = new Array(256);
    for (var i = 0; i < 256; i++)
        PALETTE_GRAY_STANDARD[i] = toRGB(i, i, i);

    // TIA palettes for normal and phosphor modes
    var normalPalette = new Array(256);
    var blendedPalette = buildMultiDimensionalArray([256, 256], 0);
    var grayPalette = new Array(256);

    jsvideo.currentFrameBuffer = null;
    var previousFrameBuffer = new Array();
    
    var residualColorBuffer = null;
    var grayPaletteMode = false;

    var redrawTIAIndicator = true;   // Indicates if the TIA area should be redrawn
    var usePhosphor = false;  // Use phosphor effect (aka no flicker on 30Hz screens)
    var phosphorBlendPercent = JsVideoConsts.DEFAULT_PHOSPHOR_BLEND;   // Amount to blend when using phosphor effect

    var clipRect = new JsClipRectangle();
    var backBuffer = null; 
    var backBufferData = null;
    
    var testPattern = null;

    /**
    * Creates a new instance of JSVideo
    * @param aConsole the parent console
    */
    function init() {
        redrawTIAIndicator = true;
        usePhosphor = false;
        phosphorBlendPercent = JsVideoConsts.DEFAULT_PHOSPHOR_BLEND;

        // Allocate buffers for two frame buffers
        jsvideo.currentFrameBuffer = new Array(JsConstants.CLOCKS_PER_LINE_VISIBLE * JsConstants.FRAME_Y_MAX);
        previousFrameBuffer = new Array(JsConstants.CLOCKS_PER_LINE_VISIBLE * JsConstants.FRAME_Y_MAX);
        initBackBuffer(JsVideoConsts.DEFAULT_WIDTH, JsVideoConsts.DEFAULT_HEIGHT);
        initPalettes();
        loadImages();
        jsvideo.initialize();
    }

    /**
    * This method is called for the creation of the back buffer.  It is called when 
    * a new JSVideo object is created, as well as when a JSVideo object is
    * deserialized--that is, loaded from a stream (when a saved game state is loaded).
    * @param aWidth desired width of the back buffer
    * @param aHeight desired height of the back buffer
    * @return the new back buffer
    */
    function createBackBuffer(aWidth, aHeight) {
        var buffer = new JsBackBuffer(console.getConsoleClient().getCanvas());
        buffer.resize(aHeight, aWidth);
        return buffer;
    }

    function initBackBuffer(aWidth, aHeight) {
        backBuffer = createBackBuffer(aWidth, aHeight);
    }

    function initPalettes() {
        normalPalette = new Array(256);
        blendedPalette = buildMultiDimensionalArray([256, 256]);
        grayPalette = new Array(256);
    }

    /**
    * Clears the buffers.
    */
    jsvideo.clearBuffers = function () {
        for (var i = 0; i < jsvideo.currentFrameBuffer.length; ++i) {
            jsvideo.currentFrameBuffer[i] = 0;
            previousFrameBuffer[i] = 0;
        }
    }

    /**
    * This is called once a frame to swap the previous and the current frame buffers.
    * The previous becomes the current, and the former current becomes the previous.
    */
    jsvideo.swapFrameBuffers = function () {
        var tmp = jsvideo.currentFrameBuffer;
        jsvideo.currentFrameBuffer = previousFrameBuffer;
        previousFrameBuffer = tmp;
    }

    /**
    * Returns the current frame buffer.
    * <p>
    *    The current frame buffer represents all the pixels on the display screen (with
    *    each integer representing the index of a color in the current palette).
    * </p>
    * @return the current frame buffer
    */
    jsvideo.getCurrentFrameBuffer = function () {
        return jsvideo.currentFrameBuffer;
    }

    /**
    * Returns the previous frame buffer.
    * There are two frame buffers, a current and a previous, and they are switched every
    * frame.  This way, JSVideo can keep track of which pixels have changed, so that
    * it only has to redraw things that have changed.
    * @return previous frame buffer
    */
    jsvideo.getPreviousFrameBuffer = function () {
        return previousFrameBuffer;
    }

    /**
    * Calls the console's jsvideo.getWidth() method.
    * @return width of the display (as far as TIA is concerned)
    */
    jsvideo.getWidth = function () {
        return console.getDisplayWidth();
    }

    /**
    * Calls the console's jsvideo.getHeight() method.
    * @return height of the display (as far as TIA is concerned)
    */
    jsvideo.getHeight = function () {
        return console.getDisplayHeight();
    }

    /**
    * Is used to paint the current frame in shades of gray...is used when paused.
    * This method first changes the palette to grayscale, then repaints the 
    * current frame with that palette, and then changes the palette back to what
    * it was previously.  Thus, this is only good for one frame, so this is best
    * used when the game is paused.
    */
    jsvideo.grayCurrentFrame = function () {
        var zOldMode = grayPaletteMode;
        grayPaletteMode = true;
        jsvideo.updateVideoFrame();
        grayPaletteMode = zOldMode;

    }

    /**
    * Repaints the current frame.
    * This is similar to jsvideo.refresh(), but it also redraws the current frame, whereas refresh waits 
    * until it's time to redraw the frame again.
    */
    jsvideo.updateVideoFrame = function () {
        jsvideo.refresh();
        switch (console.getTelevisionMode()) {
            case TELEVISION_MODE_GAME: jsvideo.doFrameVideo(); break;
            case TELEVISION_MODE_SNOW: jsvideo.doSnow(); break;
            case TELEVISION_MODE_TEST_PATTERN: jsvideo.doTestPattern(); break;
        }
    }

    /**
    * Returns the back buffer object
    * @return the back buffer
    */
    jsvideo.getBackBuffer = function () {
        return backBuffer;
    }

    /**
    * Erases any images on the back buffer
    */
    jsvideo.clearBackBuffer = function () {
        backBuffer.clear();
    }

    /**
    * Ensures the back buffer is big enough to contain the current display.
    * The back buffer is a buffered image object that the JSVideo draws to, and which is
    * subsequently drawn to the screen by the canvas object.  The back buffer should be the
    * size of the display, so when the display changes size, this method should be called.
    * @param aNewWidth new display width
    * @param aNewHeight new display height
    */
    jsvideo.adjustBackBuffer = function (aNewWidth, aNewHeight) {
        backBuffer.resize(aNewHeight, aNewWidth);
    }

    /**
    * Prepares the JSVideo for use.
    */
    jsvideo.initialize = function () {
        jsvideo.setTIAPalette(JsConstants.PALETTE_NTSC);
    }

    /**
    * This method signals to the JSVideo that the whole display screen needs to be 
    * updated.  Normally, for performance reasons, the JSVideo object will only update
    * those regions of the display that, by its calculations, have changed.  This method 
    * tells JSVideo to ignore its calculations during the next frame, and redraw the whole
    * thing.
    * It does not cause the frame to be redrawn...it merely causes the ENTIRE frame to be
    * redrawn the next time a redraw occurs.
    */
    jsvideo.refresh = function () {
        redrawTIAIndicator = true;
    }

    /**
    * This method loads any images needed by the JSVideo object (e.g. the television 
    * test pattern image).  It is called when JSVideo object is created.
    */
    function loadImages() {
        testPattern = new Image();
        testPattern.src = "testpattern.gif";
    }

    /**
    * Draws static ("snow") on the back buffer, and paints the back buffer to the canvas.
    */
    jsvideo.doSnow = function () {
        if (backBuffer != null) {
            snowBackBuffer();
            if (getCanvas() != null)
                getCanvas().paintCanvas(backBuffer, backBuffer.getWidth(), backBuffer.getHeight());
        }
    }

    /**
    * This sets out random grayscale pixels on the backbuffer to simulate television static
    */
    function snowBackBuffer() {
        if (backBuffer != null) {
            var width = backBuffer.getWidth();
            var height = backBuffer.getHeight();
            for (var iY = 0; iY < height; iY++) {
                for (var iX = 0; iX < width; iX++) {
                    var randomValue = Math.min(Math.floor(Math.random() * 255.0));

                    backBuffer.setRGB(iX, iY, PALETTE_GRAY_STANDARD[randomValue]);
                }
            }
        }
    }

    /**
    * This method is a convenience method which fetches the Canvas object from the 
    * Console's client (i.e. the GUI).
    * @return the current canvas
    */
    function getCanvas() {
        if (console.getConsoleClient() != null)
            return console.getConsoleClient().getCanvas();
        else
            return null;
    }

    /**
    * This method is one of the most important of the program.  It draws the pixels
    * on the back buffer and then tells the component that display the back buffer to
    * repaint itself immediately.
    */
    jsvideo.doFrameVideo = function () {
        prepareBackBuffer();
        paintBackBufferToCanvas();
    }

    /**
    * This method takes data from the TIA object and uses it to draw the back buffer.
    */
    function prepareBackBuffer() {
        var zCurrentBuffer = jsvideo.getCurrentFrameBuffer();
        var zPrevBuffer = jsvideo.getPreviousFrameBuffer();
        if (residualColorBuffer == null)
            residualColorBuffer = new Array(zCurrentBuffer.length); //maybe a better way to set it
        var zWidth = Math.min(jsvideo.getWidth(), backBuffer.getWidth());
        var zHeight = Math.min(jsvideo.getHeight(), backBuffer.getHeight());

        var zBufferIndexAtLineStart = 0;

        for (var y = 0; y < zHeight; y++) {         //for each line
            for (var x = 0; x < zWidth; x++) {    //for each pixel on a given line
                var zBufferIndex = zBufferIndexAtLineStart + x;  //determing the buffer index at this given x and y

                var zNewColorIndex = zCurrentBuffer[zBufferIndex];
                var zOldColorIndex = zPrevBuffer[zBufferIndex];

                //TODO : make the following code more "elegant", and self-explanatory
                var zOldPaintedColor = residualColorBuffer[zBufferIndex];
                var zNewPaintedColor = usePhosphor ? getBlendedColorInt(zOldColorIndex, zNewColorIndex) : getColorInt(zNewColorIndex);

                if ((zNewPaintedColor != zOldPaintedColor) || (redrawTIAIndicator)) {   // either the color has changed, or we have been ordered to draw it regardless
                    clipRect.addPoint(x, y);                   // expands the clip rectangle, telling it there is another part of the screen in need of update

                    residualColorBuffer[zBufferIndex] = zNewPaintedColor;

                    if (backBufferData != null)
                        backBufferData[zBufferIndex] = zNewPaintedColor; //a quicker way if available
                    else
                        backBuffer.setRGB(x, y, zNewPaintedColor);      // the actual act of drawing
                }
            }

            zBufferIndexAtLineStart += zWidth;  //moving to next line
        }

        redrawTIAIndicator = false;
    }

    /**
    * This method paints the back buffer to the previously specified canvas
    */
    function paintBackBufferToCanvas() {
        if (getCanvas() != null) {
            //Tells the canvas to call the paint command...the coordinates are very important...drawing the screen is incredibly slow, so you must only
            //draw a portion of it at a time.  The portion that has changed is contained in clipRect
            //The calculations are there to scale, converting double into ints by rounding the correct direction
            getCanvas().paintCanvas(backBuffer, jsvideo.getWidth(), jsvideo.getHeight(), clipRect);

            clipRect.resetRect();
        }
    }

    /**
    * The "test pattern" is the image of colored bars that may be display when 
    * no ROM is loaded.  This method draws it to the canvas.
    */
    jsvideo.doTestPattern = function () {
        var canvas = document.createElement("canvas");
        canvas.height = backBuffer.getHeight();
        canvas.width = backBuffer.getWidth();
        var ctx = canvas.getContext("2d");

        ctx.drawImage(testPattern, 0, 0, canvas.height, canvas.width);

        for (var x = 0; x < backBuffer.getWidth(); x++) {
            for (var y = 0; y < backBuffer.getHeight(); y++) {
                backBuffer.setRGB(x, y, ctx.getImageData(x, y, 1, 1).data);
            }
        }

        if (getCanvas() != null) {
            //Tells the canvas to call the paint command...the coordinates are very important...drawing the screen is incredibly slow, so you must only
            //draw a portion of it at a time.  The portion that has changed is contained in clipRect
            //The calculations are there to scale, converting double into ints by rounding the correct direction
            clipRect.resetRect();
            getCanvas().paintCanvas(backBuffer, canvas.height, canvas.width, clipRect);

        }
    }

    /**
    * Returns true if phosphor mode is enabled
    * @return true if phosphor mode is enabled
    */
    jsvideo.getPhosphorEnabled = function () {
        return usePhosphor;
    }

    /**
    * Phosphor mode helps emulate the television a little better, and can be used as
    * an "anti-flicker" mode.  When the "pixels" on a traditional TV screen are illuminated,
    * they don't immediately fade when the next frame (and thus pixel) is set...instead,
    * there is somewhat of a blend of the old and the new.  Think "phosphorescence".
    * <p>
    *    Phosphor mode emulates this blend, and is useful for combatting flicker.
    *    Imagine a white background, and for every other frame, a black square is shown
    *    on that background.  Now imagine that there are 60 frames per second.
    *    Without phosphor mode, you are likely to see a flickering of a black square.
    *    With phosphor mode, you will likely see a steady gray square--it is a blend
    *    of white and black.
    *    
    * </p>
    * @param aEnable true to turn on phosphor mode
    */
    jsvideo.setPhosphorEnabled = function (aEnable) {
        usePhosphor = aEnable;
    }

    /**
    * Turns phosphor mode on/off, but also specifies a blend percentage value...(e.g. 77)
    * See the other jsvideo.setPhosphorEnabled(...) documentation.
    * @param aEnable true to enable
    * @param aBlendPercent percentage that the two colors should be blended
    */
    jsvideo.setPhosphorEnabled = function (aEnable, aBlendPercent) {
        jsvideosetPhosphorEnabled(aEnable);
        phosphorBlendPercent = aBlendPercent;

    }

    /**
    * Retrieves the color integer from a certain array.
    * The integer stores color information in the ARGB format (I think)
    * @param aIndex The array index of the desired color
    * @return An integer representing the desired color
    */
    function getColorInt(aIndex) {
        if (grayPaletteMode == true)
            return grayPalette[aIndex & 0xFF];
        else
            return normalPalette[aIndex & 0xFF];
    }

    /**
    * This is used in phosphor (aka anti-flicker) mode to get a blend
    * of the colors represented by the two indices
    * @param aOldIndex the old color index
    * @param aNewIndex the new color index
    * @return the color that represents the blend between the two indices
    */
    function getBlendedColorInt(aOldIndex, aNewIndex) {
        return blendedPalette[aOldIndex & 0xFF][aNewIndex & 0xFF];
    }

    /**
    * Sets the palette to be used.
    * The palettes are integer arrays of 256 values, in xRGB format, where x isn't used.
    * Thus, the lowest 8 bits of each value represent the blue value (0-255), the next 8 represent the green
    * value, and the next 8 represent the red value.
    * @param palette the palette to use
    */
    jsvideo.setTIAPalette = function (palette) {
        var i;
        var j;

        // Set palette for normal fill
        for (i = 0; i < 256; i++) {
            var r = (palette[i] >> 16) & 0xff;
            var g = (palette[i] >> 8) & 0xff;
            var b = palette[i] & 0xff;

            normalPalette[i] = calculateNormalColor(r, g, b);
            grayPalette[i] = calculateGrayColor(r, g, b);
        }

        // Set palette for phosphor effect
        for (i = 0; i < 256; i++) {
            for (j = 0; j < 256; j++) {
                var ri = (palette[i] >> 16) & 0xff;
                var gi = (palette[i] >> 8) & 0xff;
                var bi = palette[i] & 0xff;
                var rj = (palette[j] >> 16) & 0xff;
                var gj = (palette[j] >> 8) & 0xff;
                var bj = palette[j] & 0xff;

                var r = calculatePhosphorColor(ri, rj, phosphorBlendPercent);
                var g = calculatePhosphorColor(gi, gj, phosphorBlendPercent);
                var b = calculatePhosphorColor(bi, bj, phosphorBlendPercent);

                blendedPalette[i][j] = calculateNormalColor(r, g, b);
            }
        }

        redrawTIAIndicator = true;
    }

    /**
    * Returns an integer version of a color based on its components.
    * @param r red component
    * @param g green component
    * @param b blue component
    * @return an integer version of the specified color
    */
    function calculateNormalColor(r, g, b) {
        var intValue = 0;
        intValue = intValue | (r & 255);
        intValue = intValue << 8;
        intValue = intValue | (g & 255);
        intValue = intValue << 8;
        intValue = intValue | (b & 255);
        return intValue;
    }

    /**
    * Calculates a given phosphor blend based on the colors provided.  This is used 
    * when the palette is being set.
    * @param aColorComponentA the first component e.g. the red component (0-255) of the previous pixel
    * @param aColorComponentB the second component e.g. the red component (0-255) of the new pixel
    * @param aPhosphorBlend percentage to blend (e.g. 77)
    * @return new component value
    */
    function calculatePhosphorColor(aColorComponentA, aColorComponentB, aPhosphorBlend) {
        var zDifference = Math.abs(aColorComponentA - aColorComponentB);
        var zBlendFactor = aPhosphorBlend / 100.0;
        var zPhosp = Math.floor(Math.min(aColorComponentA, aColorComponentB) + Math.floor((zBlendFactor * zDifference)));
        assert((zPhosp >= 0) && (zPhosp < 0x100)); //i.e. between 0 and 256 (a byte value)
        return zPhosp;
    }

    /**
    * Calculates a gray color based on the given components
    * @param aRed red component (0-255)
    * @param aGreen green component (0-255)
    * @param aBlue blue component (0-255)
    * @return the new gray color in integer RGB format
    */
    function calculateGrayColor(aRed, aGreen, aBlue) {
        var zAverage = Math.floor((aRed + aGreen + aBlue) / 3);
        return calculateNormalColor(zAverage, zAverage, zAverage);
    }

    /**
    * A rectangle that remembers what part of the screen has been changed.
    * Everytime the drawMediaSource() method encounters a changed pixel,
    * it informs an object of this class, which resizes to encompass the new
    * point.
    */
    function JsClipRectangle() {
        var serialVersionUID = -5127735308538463352;
        this.isClear = true;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;

        /**
        * Resets the area of the rectangle.  Should be called every frame.
        */
        this.resetRect = function () {
            this.isClear = true;
            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;
        }

        /**
        * Tells the rectangle to expand to encompass the given point.
        * @param aX X
        * @param aY Y
        */
        this.addPoint = function (aX, aY) {
            if (this.isClear == true) //first point
            {
                this.x = aX - 1;
                this.y = aY - 1;
                this.width = 3;
                this.height = 3;
                this.isClear = false;
            }
            else {
                if (aX >= (this.x + this.width)) //to the right of rect
                {
                    this.width = (aX - this.x) + 2;
                }
                else if (aX <= this.x) //to the left of x
                {
                    this.width += (this.x - aX) + 2; //expand width
                    this.x = aX - 1;
                }

                if (aY >= (this.y + this.height)) //below rect
                {
                    this.height = (aY - this.y) + 2;
                }
                else if (aY <= this.y) //above y
                {
                    this.height += (this.y - aY) + 2; //expand height
                    this.y = aY - 1;
                }
            }
        }
    }

    init();
}
