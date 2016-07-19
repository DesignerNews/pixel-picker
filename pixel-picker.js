/*!
 * Pixel Picker - a jQuery plugin to create cool pixel art.
 *
 * Copyright (c) 2015 Designer News Ltd.
 *
 * Project home:
 *   https://github.com/DesignerNews/pixel-picker
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Version:  0.1.1
 */

(function ($) {

  $.fn.pixelPicker = function(options) {
    var settings,
        rows,
        currentColor,
        isErasing = false,
        isDragging = false,
        palette = [],
        map = [];

    // Core functions
    var updateHandler,
        applyColor,
        cycleColor;

    // Helper functions
    var parseColor,
        parseHex,
        parseRgb,
        arrayToRgb,
        arrayEqual;

    // Takes the passed in cell, finds its current background color within
    // the color palette, and updates the currentColor to the next
    // (or previous if reverse is true) color in the palette
    cycleColor = function(cell, reverse) {
      var cellColor = parseColor(cell.css('background-color').length ? cell.css('background-color') : '#ffffff');

      // If we're in eraser mode, return early
      if (isErasing) {
        return currentColor = parseColor(settings.eraserColor);
      };

      // Locate our position in the palette based on our
      // current cell's background color
      var currentIndex = (function() {
        var matchingIndex;

        palette.forEach(function(color, index) {
          if (arrayEqual(color, cellColor)) {
            matchingIndex = index;
          };
        });

        return matchingIndex;
      })();

      var nextIndex = (function() {
        if (reverse) {
          // Go back in the array, or to the end if we've reached the beginning
          return (currentIndex - 1) === -1 ? palette.length - 1 : (currentIndex - 1);
        } else {
          // Go forward in the array, or the beginning if we've reached the end
          return (currentIndex + 1) in palette ? (currentIndex + 1) : 0;
        };
      })();

      // Set the new global current color!
      return currentColor = palette[nextIndex];
    };

    // Apply the global current color as the cell's background
    applyColor = function(cell) {
      return cell.css('background-color', arrayToRgb(currentColor));
    };

    // Update whatever is handling the updated map of colors
    updateHandler = function(rowIndex, cellIndex, cell, dontHandle) {
      var handler = settings.update;
      var newColor = (cell != null && cell.css('background-color').length ? parseColor(cell.css('background-color')) : currentColor);

      map[rowIndex][cellIndex] = newColor;

      if (dontHandle) return;

      if (typeof handler === 'function') {
        // We can either pass off the updated map to a function
        handler(map);
      } else if (handler instanceof jQuery) {
        // Or, we can update the value="" of a jQuery input
        handler.val(JSON.stringify(map));
      }
    };

    // Determine if we need to parse a hex or rgb value
    parseColor = function(color) {
      // If the color is already an RGB array, return
      if (Object.prototype.toString.call(color) === '[object Array]') {
        return color;
      };

      return color.charAt(0) === '#' ? parseHex(color) : parseRgb(color);
    };

    // Parse a hex value to an RGB array (i.e. [255,255,255])
    parseHex = function(hexValue) {
      var rgb = parseInt(hexValue.substring(1), 16);
      return [(rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF];
    };

    // Parse an RGB value to an RGB array (i.e. [255,255,255])
    parseRgb = function(rgbValue) {
      return rgbValue.replace(/[^\d,]/g, '').split(',').map(function(value) {
        return parseInt(value, 10);
      });
    };

    // Convert an RGB array back to a CSS RGB color
    arrayToRgb = function(inArray) {
      return 'rgb(' + inArray[0] + ', ' + inArray[1] + ', ' + inArray[2] + ')';
    };

    // Check if two arrays are exacty the same
    arrayEqual = function(a, b) {
      return a.length === b.length && a.every(function(elem, i) {
        return elem === b[i];
      });
    };

    // Woo settings!
    settings = $.extend({
      update: null,
      ready: null,
      rowSelector: '.pixel-picker-row',
      cellSelector: '.pixel-picker-cell',
      eraserColor: null,
      palette: [
        '#ffffff', '#000000',
        '#ff0000', '#0000ff',
        '#ffff00', '#008000'
      ]
    }, options);

    // Convert palette to array of RGB arrays
    settings.palette.forEach(function(color) {
      palette.push(parseColor(color));
    });

    // Add the eraser color as the first color in
    // the palette. Required to make color cycling work.
    // If eraserColor is left unset, first color in
    // palette is assigned
    if (settings.eraserColor == null) {
      settings.eraserColor = settings.palette[0];
    } else {
      var eraserColor = parseColor(settings.eraserColor);

      var existingEraserColorPosition = (function() {
        var matchingIndex;

        palette.forEach(function(color, index) {
          if (arrayEqual(color, eraserColor)) {
            matchingIndex = index;
          };
        });

        return matchingIndex;
      })();

      if (existingEraserColorPosition != null) {
        palette.slice(existingEraserColorPosition, 1);
      };

      palette.unshift();
    };

    $(window)
      // Prevent context menu from showing up over top of cells
      .on('contextmenu', function(event) {
        if ($(event.target).hasClass(settings.cellSelector.substring(1))) return event.preventDefault();
      })
      // When CTRL (Mac) or CMD (Windows) key is down, eraser is active
      .on('keydown', function(event) {
        if (event.metaKey || event.ctrlKey) isErasing = true;
      })
      // When CTRL (Mac) or CMD (Windows) key is released, eraser is inactive
      .on('keyup', function(event) {
        if (!event.metaKey && !event.ctrlKey) isErasing = false;
      });

    // Find all the rows
    rows = this.find(settings.rowSelector);
    rowCount = rows.length;

    // Set up our initial color
    currentColor = settings.palette[0];

    rows.each(function(rowIndex, row) {
      row = $(row);
      map.push([]);
      var cellCollection = map[rowIndex];
      var cells = row.find(settings.cellSelector);
      var cellCount = cells.length;

      cells.each(function(cellIndex, cell) {
        cell = $(cell);
        cellCollection.push([]);

        // When a cell is clicked in to...
        cell.on('mousedown', function(event) {
          // First, was it a right click?
          var isRightClick = ('which' in event && event.which === 3) || ('button' in event && event.button === 2);

          // By default, turn dragging on so the mouse can move to
          // another cell and have continuity
          isDragging = true;

          // Now we do all the work
          cycleColor(cell, isRightClick);
          applyColor(cell);
          updateHandler(rowIndex, cellIndex);
        });

        // Turn dragging off when we mouse up
        cell.on('mouseup', function() {
          isDragging = false;
        });

        // When the mouse enters a cell, if dragging is on
        // (turned on in the mousedown event), apply our current
        // global color to the cell, no cycling
        cell.on('mouseenter', function() {
          if (!isDragging) return;

          applyColor(cell);
          updateHandler(rowIndex, cellIndex);
        });

        // Update the handler when we've finished the initial cell processing
        if (rowIndex + 1 === rowCount && cellIndex + 1 === cellCount) {
          updateHandler(rowIndex, cellIndex, cell);

          // Trigger the ready handler if there is one
          if (settings.ready) {
            settings.ready();
          }
        } else {
          updateHandler(rowIndex, cellIndex, cell, true);
        };
      });
    });

    return this;

  };

}(jQuery));
