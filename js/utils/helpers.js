/**
 * helpers.js
 * Utility functions for the sorting visualizer
 */

/**
 * Generate a random array of integers
 * @param {number} size - Size of the array
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Array<number>} - Random array
 */
function generateRandomArray(size, min = 1, max = 100) {
    return Array.from({ length: size }, () => 
        Math.floor(Math.random() * (max - min + 1)) + min
    );
}

/**
 * Generate a nearly sorted array
 * @param {number} size - Size of the array
 * @param {number} swapPercentage - Percentage of elements to swap (0-100)
 * @returns {Array<number>} - Nearly sorted array
 */
function generateNearlySortedArray(size, swapPercentage = 10) {
    // Create a sorted array first
    const array = Array.from({ length: size }, (_, i) => i + 1);
    
    // Calculate number of swaps to perform
    const swaps = Math.floor((size * swapPercentage) / 100);
    
    // Perform random swaps
    for (let i = 0; i < swaps; i++) {
        const idx1 = Math.floor(Math.random() * size);
        const idx2 = Math.floor(Math.random() * size);
        [array[idx1], array[idx2]] = [array[idx2], array[idx1]];
    }
    
    return array;
}

/**
 * Generate a reverse sorted array
 * @param {number} size - Size of the array
 * @returns {Array<number>} - Reverse sorted array
 */
function generateReverseSortedArray(size) {
    return Array.from({ length: size }, (_, i) => size - i);
}

/**
 * Generate an array with few unique values
 * @param {number} size - Size of the array
 * @param {number} uniqueValues - Number of unique values
 * @returns {Array<number>} - Array with few unique values
 */
function generateFewUniqueArray(size, uniqueValues = 5) {
    const values = Array.from({ length: uniqueValues }, (_, i) => 
        Math.floor(Math.random() * 100) + 1
    );
    
    return Array.from({ length: size }, () => 
        values[Math.floor(Math.random() * uniqueValues)]
    );
}

/**
 * Generate an array with a specific distribution
 * @param {string} distribution - Distribution type ('random', 'nearly-sorted', 'reversed', 'few-unique')
 * @param {number} size - Size of the array
 * @returns {Array<number>} - Generated array
 */
function generateArray(distribution, size) {
    switch (distribution) {
        case 'random':
            return generateRandomArray(size);
            
        case 'nearly-sorted':
            return generateNearlySortedArray(size);
            
        case 'reversed':
            return generateReverseSortedArray(size);
            
        case 'few-unique':
            return generateFewUniqueArray(size);
            
        default:
            return generateRandomArray(size);
    }
}

/**
 * Check if an array is sorted
 * @param {Array<number>} array - Array to check
 * @returns {boolean} - True if the array is sorted
 */
function isSorted(array) {
    for (let i = 1; i < array.length; i++) {
        if (array[i] < array[i - 1]) {
            return false;
        }
    }
    return true;
}

/**
 * Format time in milliseconds to a readable string
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
function formatTime(ms) {
    if (ms < 1000) {
        return `${ms.toFixed(2)}ms`;
    } else {
        return `${(ms / 1000).toFixed(2)}s`;
    }
}

/**
 * Calculate statistics for a sorting operation
 * @param {Object} metrics - Metrics object
 * @returns {Object} - Statistics object
 */
function calculateStats(metrics) {
    const timeElapsed = metrics.endTime - metrics.startTime;
    const operationsPerSecond = timeElapsed > 0 
        ? Math.floor((metrics.comparisons + metrics.swaps + metrics.accesses) / (timeElapsed / 1000))
        : 0;
    
    return {
        timeElapsed: formatTime(timeElapsed),
        operationsPerSecond
    };
}

/**
 * Calculate the expected time complexity class based on array size and operation count
 * @param {number} size - Array size
 * @param {number} operations - Number of operations performed
 * @returns {string} - Time complexity class ('O(n)', 'O(n log n)', 'O(n²)', etc.)
 */
function estimateTimeComplexity(size, operations) {
    const ratio = operations / size;
    
    if (ratio < 2 * size) {
        // Constant or linear time algorithms
        if (ratio < 10) {
            return 'O(1) or O(n)';
        }
        return 'O(n)';
    } else if (ratio < 4 * size * Math.log2(size)) {
        // Linearithmic time algorithms
        return 'O(n log n)';
    } else if (ratio < 2 * size * size) {
        // Quadratic time algorithms
        return 'O(n²)';
    } else {
        // Higher complexity algorithms
        return 'O(n²) or higher';
    }
}

/**
 * Delay execution for a specific amount of time
 * @param {number} ms - Time to delay in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Map a value from one range to another
 * @param {number} value - Input value
 * @param {number} inMin - Input minimum
 * @param {number} inMax - Input maximum
 * @param {number} outMin - Output minimum
 * @param {number} outMax - Output maximum
 * @returns {number} - Mapped value
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Generate color based on value
 * @param {number} value - Input value (0-1)
 * @param {Array<string>} colorStops - Array of color stops in hex format
 * @returns {string} - Interpolated color in hex format
 */
function interpolateColor(value, colorStops = ['#3498db', '#e74c3c']) {
    if (value <= 0) return colorStops[0];
    if (value >= 1) return colorStops[colorStops.length - 1];
    
    const segmentSize = 1 / (colorStops.length - 1);
    const segment = Math.floor(value / segmentSize);
    const segmentProgress = (value - segment * segmentSize) / segmentSize;
    
    const color1 = hexToRgb(colorStops[segment]);
    const color2 = hexToRgb(colorStops[segment + 1]);
    
    const r = Math.round(color1.r + segmentProgress * (color2.r - color1.r));
    const g = Math.round(color1.g + segmentProgress * (color2.g - color1.g));
    const b = Math.round(color1.b + segmentProgress * (color2.b - color1.b));
    
    return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color code
 * @returns {Object} - RGB object
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse the hex value
    const bigint = parseInt(hex, 16);
    
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * Convert RGB values to hex color
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} - Hex color code
 */
function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Export the utility functions
if (typeof window !== 'undefined') {
    // Browser environment
    window.Utils = {
        generateRandomArray,
        generateNearlySortedArray,
        generateReverseSortedArray,
        generateFewUniqueArray,
        generateArray,
        isSorted,
        formatTime,
        calculateStats,
        estimateTimeComplexity,
        delay,
        mapRange,
        interpolateColor
    };
}

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRandomArray,
        generateNearlySortedArray,
        generateReverseSortedArray,
        generateFewUniqueArray,
        generateArray,
        isSorted,
        formatTime,
        calculateStats,
        estimateTimeComplexity,
        delay,
        mapRange,
        interpolateColor
    };
} 