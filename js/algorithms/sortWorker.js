/**
 * sortWorker.js
 * Worker thread for sorting a portion of the array in parallel
 */

// State for this worker
const state = {
    workerId: -1,
    array: [],
    algorithm: '',
    workerDelay: 0, // Delay between operations
    metrics: {
        comparisons: 0,
        swaps: 0,
        accesses: 0
    },
    totalOperations: 0, // Track total operations for progress calculation
    estimatedTotalOperations: 0, // Estimated total operations for this algorithm
    activeIndices: [] // Track currently active indices for visualization
};

// Import the algorithms
self.importScripts('algorithms.js');

/**
 * Start sorting a partition
 */
async function startSorting(data) {
    const { algorithm, array, workerId, speed, maxDigits, workerDelay } = data;
    
    state.workerId = workerId;
    state.array = [...array];
    state.algorithm = algorithm;
    // Ensure workers are fast but visible
    state.workerDelay = Math.min(30, Math.max(5, workerDelay || 20));
    state.metrics = { comparisons: 0, swaps: 0, accesses: 0 };
    state.totalOperations = 0;
    state.activeIndices = [];
    
    // Estimate total operations based on algorithm and array size
    // This gives us a way to calculate progress percentage
    const n = array.length;
    switch (algorithm) {
        case 'merge':
            state.estimatedTotalOperations = n * Math.log2(n) * 3; // O(n log n)
            break;
        case 'quick':
            state.estimatedTotalOperations = n * Math.log2(n) * 2; // O(n log n)
            break;
        case 'insertion':
            state.estimatedTotalOperations = n * n / 2; // O(n²)
            break;
        case 'radix':
            state.estimatedTotalOperations = n * (maxDigits || 5) * 2; // O(n*k)
            break;
        default:
            state.estimatedTotalOperations = n * n; // Default case
    }
    
    // Make workers more visible by highlighting their entire range at start
    const rangeSize = Math.min(array.length, 10);
    const rangeMid = Math.floor(array.length / 2);
    const rangeStart = Math.max(0, rangeMid - Math.floor(rangeSize / 2));
    const indices = Array.from({ length: rangeSize }, (_, i) => rangeStart + i);
    sendVisualizationUpdate(indices);
    
    // Notify that we're ready
    self.postMessage({
        type: 'ready',
        data: { workerId }
    });
    
    // First, send a full array update to show initial worker state
    sendFullArrayUpdate(state.array);
    
    // Sort the array based on algorithm
    try {
        let sortedArray;
        
        switch (algorithm) {
            case 'merge':
                sortedArray = await mergeSort(array);
                break;
                
            case 'quick':
                sortedArray = await quickSort(array);
                break;
                
            case 'insertion':
                sortedArray = await insertionSort(array);
                break;
                
            case 'radix':
                sortedArray = await radixSort(array, maxDigits);
                break;
                
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        
        // Final visualization update showing entire sorted array
        sendVisualizationUpdate(Array.from({ length: array.length }, (_, i) => i));
        
        // Send back the sorted array and metrics
        self.postMessage({
            type: 'sorted',
            data: {
                sortedArray,
                workerId: state.workerId
            }
        });
        
        // Send final metrics
        self.postMessage({
            type: 'metrics',
            data: {
                metrics: state.metrics
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            data: {
                message: error.message,
                workerId: state.workerId
            }
        });
    }
}

/**
 * Create a promise-based delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
function delayPromise(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Apply a delay between operations
 */
async function applyDelay() {
    if (state.workerDelay > 0) {
        // Use a very small delay to keep visualization responsive
        await delayPromise(Math.min(10, state.workerDelay));
    }
}

/**
 * Send full array update to show worker activity
 * @param {Array} array - The current array state
 */
function sendFullArrayUpdate(array) {
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: Array.from({ length: array.length }, (_, i) => i),
            array: array
        }
    });
}

/**
 * Track metrics for comparisons
 */
async function compare(a, b, i, j) {
    state.metrics.comparisons++;
    state.totalOperations++;
    
    // If indices are provided, update active indices
    if (i !== undefined && j !== undefined) {
        updateActiveIndices([i, j]);
    }
    
    // Apply delay for visualization
    await applyDelay();
    
    // Send progress update periodically
    if (state.metrics.comparisons % 5 === 0 || state.totalOperations % 10 === 0) {
        updateProgress();
    }
    
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * Track metrics for array access
 */
async function arrayAccess(arr, index) {
    state.metrics.accesses++;
    state.totalOperations++;
    
    // Update active index
    updateActiveIndices([index]);
    
    // Apply delay for visualization
    if (state.metrics.accesses % 3 === 0) {
        await applyDelay();
        updateProgress();
    }
    
    return arr[index];
}

/**
 * Track metrics for swaps
 */
async function swap(arr, i, j) {
    if (i === j) return;
    
    state.metrics.swaps++;
    state.totalOperations++;
    
    // Update active indices
    updateActiveIndices([i, j]);
    
    // Perform the actual swap
    [arr[i], arr[j]] = [arr[j], arr[i]];
    
    // Apply delay for visualization
    await applyDelay();
    
    // Send progress update for every swap
    updateProgress();
}

/**
 * Update currently active indices and send visualization
 */
function updateActiveIndices(indices) {
    if (!indices || indices.length === 0) return;
    
    state.activeIndices = [...indices];
    
    // Add neighboring elements for better visibility of worker activity
    const expanded = [...indices];
    indices.forEach(idx => {
        if (idx > 0 && !expanded.includes(idx-1)) expanded.push(idx-1);
        if (idx < state.array.length-1 && !expanded.includes(idx+1)) expanded.push(idx+1);
    });
    
    sendVisualizationUpdate(expanded);
    
    // Send progress update more frequently to make workers more visible
    updateProgress();
}

/**
 * Send visualization update to show activity
 */
function sendVisualizationUpdate(indices) {
    if (!indices || indices.length === 0) return;
    
    // Determine the current operation the worker is performing
    let currentOperation = 'processing';
    
    if (state.metrics.comparisons > 0 && state.metrics.comparisons > state.metrics.swaps * 2) {
        currentOperation = 'comparison';
    } else if (state.metrics.swaps > 0) {
        currentOperation = 'swap';
    }
    
    // For merge sort, detect merge operation
    if (state.algorithm === 'merge' && 
        indices.length > 2 && 
        Math.max(...indices) - Math.min(...indices) > 10) {
        currentOperation = 'merge';
    }
    
    // For quick sort, detect partition operation
    if (state.algorithm === 'quick' && 
        indices.length > 1 && 
        state.metrics.comparisons > 0 && 
        state.metrics.swaps > 0) {
        currentOperation = 'partition';
    }
    
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: indices,
            array: state.array, // Include current array state
            stats: {
                operation: currentOperation,
                metrics: { ...state.metrics },
                activeIndices: indices,
                workerId: state.workerId // Include worker ID for sound effects
            }
        }
    });
}

/**
 * Send progress update
 */
function updateProgress() {
    // Calculate progress percentage based on total operations
    const progressPercent = Math.min(
        99, // Never show 100% until completely done
        Math.floor((state.totalOperations / state.estimatedTotalOperations) * 100)
    );
    
    // Include current operation type in the progress update for better visualization
    const currentOperation = state.metrics.comparisons > state.metrics.swaps ? 'comparison' : 'swap';
    
    // Calculate additional metrics for visualization
    const currentActivityIntensity = Math.min(
        100, 
        state.totalOperations > 0 ? 
            Math.floor((state.totalOperations % 100) / 100 * 100) : 0
    );
    
    // For visualizing worker activity, we need to determine the "focus region"
    // This gives us the most active part of the array the worker is currently operating on
    let focusRegion = {};
    if (state.activeIndices && state.activeIndices.length > 0) {
        const min = Math.min(...state.activeIndices);
        const max = Math.max(...state.activeIndices);
        focusRegion = { min, max };
    }
    
    // Also send current array state for visualization
    self.postMessage({
        type: 'progress',
        data: {
            progress: progressPercent,
            workerId: state.workerId,
            metrics: { ...state.metrics }, // Include current metrics
            operation: currentOperation,
            array: state.array, // Include current array state
            activeIndices: state.activeIndices,
            stats: {
                progress: progressPercent,
                operation: currentOperation,
                intensity: currentActivityIntensity,
                focusRegion: focusRegion,
                metrics: { ...state.metrics }
            }
        }
    });
    
    // Allow the main thread to process this message
    setTimeout(() => {}, 0);
}

/**
 * Merge sort implementation
 */
async function mergeSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    
    const mid = Math.floor(arr.length / 2);
    
    // Highlight the split operation and send explicit visualization
    updateActiveIndices([0, mid, arr.length - 1]);
    
    // Send explicit split visualization
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: [0, mid, arr.length - 1],
            array: [...arr],
            stats: {
                operation: 'split',
                metrics: { ...state.metrics },
                activeIndices: [0, mid, arr.length - 1],
                focusRegion: { min: 0, max: arr.length - 1 }
            }
        }
    });
    
    const left = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    
    // Send visualization for merging phase
    const leftIndices = Array.from({ length: left.length }, (_, i) => i);
    const rightIndices = Array.from({ length: right.length }, (_, i) => mid + i);
    
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: [...leftIndices, ...rightIndices],
            array: [...arr],
            stats: {
                operation: 'merge',
                metrics: { ...state.metrics },
                activeIndices: [...leftIndices, ...rightIndices],
                focusRegion: { min: 0, max: arr.length - 1 }
            }
        }
    });
    
    // Send progress updates
    updateProgress();
    
    return await merge(left, right);
}

/**
 * Merge two sorted arrays
 */
async function merge(left, right) {
    const result = [];
    let leftIndex = 0;
    let rightIndex = 0;
    
    // Create visual map of original indices
    const leftStart = 0;
    const rightStart = left.length;
    const totalLength = left.length + right.length;
    
    // Send visualization for start of merging
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: Array.from({ length: totalLength }, (_, i) => i),
            array: [...left, ...right], // Show the two arrays being merged
            stats: {
                operation: 'merge',
                metrics: { ...state.metrics },
                activeIndices: [],
                focusRegion: { min: 0, max: totalLength - 1 }
            }
        }
    });
    
    while (leftIndex < left.length && rightIndex < right.length) {
        state.metrics.comparisons++;
        state.totalOperations++;
        
        // Highlight the elements being compared
        updateActiveIndices([leftStart + leftIndex, rightStart + rightIndex]);
        
        // Send comparison visualization
        if ((leftIndex + rightIndex) % 3 === 0) {
            // Create temporary merged array for visualization
            const tempArray = [
                ...left.slice(0, leftIndex), 
                ...result, 
                ...left.slice(leftIndex),
                ...right.slice(rightIndex)
            ];
            
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [leftStart + leftIndex, rightStart + rightIndex],
                    array: tempArray,
                    stats: {
                        operation: 'merge-comparison',
                        metrics: { ...state.metrics },
                        activeIndices: [leftStart + leftIndex, rightStart + rightIndex],
                        values: [left[leftIndex], right[rightIndex]]
                    }
                }
            });
        }
        
        await applyDelay();
        
        if (left[leftIndex] <= right[rightIndex]) {
            result.push(left[leftIndex]);
            
            // Visualize element being placed in result
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [leftStart + leftIndex, result.length - 1],
                    array: null,
                    stats: {
                        operation: 'merge-place',
                        metrics: { ...state.metrics },
                        activeIndices: [leftStart + leftIndex],
                        value: left[leftIndex]
                    }
                }
            });
            
            leftIndex++;
        } else {
            result.push(right[rightIndex]);
            
            // Visualize element being placed in result
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [rightStart + rightIndex, result.length - 1],
                    array: null,
                    stats: {
                        operation: 'merge-place',
                        metrics: { ...state.metrics },
                        activeIndices: [rightStart + rightIndex],
                        value: right[rightIndex]
                    }
                }
            });
            
            rightIndex++;
        }
        
        // Periodically update progress
        if (state.totalOperations % 5 === 0) {
            updateProgress();
        }
    }
    
    // Add remaining elements and highlight
    if (leftIndex < left.length) {
        updateActiveIndices([leftStart + leftIndex]);
        
        // Visualize remaining left elements
        self.postMessage({
            type: 'worker_visual_update',
            data: {
                workerId: state.workerId,
                indices: Array.from({ length: left.length - leftIndex }, (_, i) => leftStart + leftIndex + i),
                array: null,
                stats: {
                    operation: 'merge-remaining',
                    metrics: { ...state.metrics },
                    activeIndices: Array.from({ length: left.length - leftIndex }, (_, i) => leftStart + leftIndex + i),
                    side: 'left'
                }
            }
        });
    } else if (rightIndex < right.length) {
        updateActiveIndices([rightStart + rightIndex]);
        
        // Visualize remaining right elements
        self.postMessage({
            type: 'worker_visual_update',
            data: {
                workerId: state.workerId,
                indices: Array.from({ length: right.length - rightIndex }, (_, i) => rightStart + rightIndex + i),
                array: null,
                stats: {
                    operation: 'merge-remaining',
                    metrics: { ...state.metrics },
                    activeIndices: Array.from({ length: right.length - rightIndex }, (_, i) => rightStart + rightIndex + i),
                    side: 'right'
                }
            }
        });
    }
    
    // Add remaining elements
    const resultArray = result
        .concat(left.slice(leftIndex))
        .concat(right.slice(rightIndex));
    
    // Update the state array with merged result for visualization
    for (let i = 0; i < resultArray.length; i++) {
        state.array[i] = resultArray[i];
    }
    
    // Send final merged array visualization
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: Array.from({ length: resultArray.length }, (_, i) => i),
            array: [...resultArray],
            stats: {
                operation: 'merge-complete',
                metrics: { ...state.metrics },
                activeIndices: Array.from({ length: resultArray.length }, (_, i) => i)
            }
        }
    });
    
    updateProgress();
    return resultArray;
}

/**
 * Quick sort implementation
 */
async function quickSort(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        // Highlight the current partition
        updateActiveIndices([low, high]);
        
        // Send explicit partition operation notification
        // to ensure visualization during partitioning phase
        self.postMessage({
            type: 'worker_visual_update',
            data: {
                workerId: state.workerId,
                indices: [low, high],
                array: arr,
                stats: {
                    operation: 'partition',
                    metrics: { ...state.metrics },
                    activeIndices: [low, high],
                    focusRegion: { min: low, max: high }
                }
            }
        });
        
        const pivotIndex = await partition(arr, low, high);
        
        // Send progress update
        updateProgress();
        
        await quickSort(arr, low, pivotIndex - 1);
        await quickSort(arr, pivotIndex + 1, high);
    }
    
    return arr;
}

/**
 * Partition function for Quick Sort
 */
async function partition(arr, low, high) {
    const pivot = await arrayAccess(arr, high);
    let i = low - 1;
    
    // Highlight the pivot and send explicit visualization
    updateActiveIndices([high]);
    
    // Send explicit notification about pivot selection
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: [high],
            array: [...arr],
            stats: {
                operation: 'pivot',
                metrics: { ...state.metrics },
                activeIndices: [high],
                focusRegion: { min: low, max: high }
            }
        }
    });
    
    await applyDelay();
    
    // Mark the entire region being partitioned
    const partitionIndices = Array.from({ length: high - low + 1 }, (_, idx) => low + idx);
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: partitionIndices,
            array: [...arr],
            stats: {
                operation: 'partition',
                metrics: { ...state.metrics },
                activeIndices: partitionIndices,
                focusRegion: { min: low, max: high }
            }
        }
    });
    
    for (let j = low; j < high; j++) {
        // Compare current element with pivot and highlight
        updateActiveIndices([j, high]);
        
        // Send more frequent visualization updates during partitioning
        if (j % 2 === 0 || (j - low) < 5 || (high - j) < 5) { // More updates at start and end
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [j, high, i+1],
                    array: [...arr],
                    stats: {
                        operation: 'partition',
                        metrics: { ...state.metrics },
                        activeIndices: [j, high, i+1],
                        focusRegion: { min: low, max: high }
                    }
                }
            });
        }
        
        if (await compare(arr[j], pivot, j, high) <= 0) {
            i++;
            // Swap and highlight
            updateActiveIndices([i, j]);
            
            // Send explicit swap visualization BEFORE the actual swap
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [i, j, high],
                    array: [...arr],
                    stats: {
                        operation: 'swap',
                        metrics: { ...state.metrics },
                        activeIndices: [i, j, high],
                        focusRegion: { min: low, max: high }
                    }
                }
            });
            
            await swap(arr, i, j);
            
            // Send another update AFTER the swap
            self.postMessage({
                type: 'worker_visual_update',
                data: {
                    workerId: state.workerId,
                    indices: [i, j, high],
                    array: [...arr],
                    stats: {
                        operation: 'swap',
                        metrics: { ...state.metrics },
                        activeIndices: [i, j, high],
                        focusRegion: { min: low, max: high }
                    }
                }
            });
        }
    }
    
    // Highlight final pivot position
    updateActiveIndices([i+1, high]);
    
    // Send notification about final pivot swap
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: [i+1, high],
            array: [...arr],
            stats: {
                operation: 'pivot-placement',
                metrics: { ...state.metrics },
                activeIndices: [i+1, high],
                focusRegion: { min: low, max: high }
            }
        }
    });
    
    // Swap the pivot element
    await swap(arr, i + 1, high);
    
    // Send final partition state
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: [i+1],
            array: [...arr],
            stats: {
                operation: 'partition-complete',
                metrics: { ...state.metrics },
                activeIndices: [i+1],
                focusRegion: { min: low, max: high }
            }
        }
    });
    
    return i + 1;
}

/**
 * Insertion sort implementation
 */
async function insertionSort(arr) {
    const n = arr.length;
    
    for (let i = 1; i < n; i++) {
        // Highlight current element
        updateActiveIndices([i]);
        
        const key = await arrayAccess(arr, i);
        let j = i - 1;
        
        // Update progress periodically
        if (i % 3 === 0) {
            updateProgress();
        }
        
        while (j >= 0) {
            // Highlight comparison elements
            updateActiveIndices([j, i]);
            
            if (await compare(arr[j], key, j, i) <= 0) {
                break;
            }
            
            // Move element one position ahead
            arr[j + 1] = arr[j];
            state.metrics.accesses++;
            state.totalOperations++;
            
            // Highlight the move
            updateActiveIndices([j, j + 1]);
            
            j--;
            
            // Apply a delay periodically
            if (j % 2 === 0) {
                await applyDelay();
            }
        }
        
        arr[j + 1] = key;
        state.metrics.accesses++;
        state.totalOperations++;
        
        // Highlight the insertion
        updateActiveIndices([j + 1]);
    }
    
    return arr;
}

/**
 * Radix sort implementation
 */
async function radixSort(arr, maxDigits) {
    const n = arr.length;
    
    // Do counting sort for every digit position
    for (let exp = 1, digit = 0; digit < maxDigits; exp *= 10, digit++) {
        // Highlight that we're processing this digit
        updateActiveIndices([0, n - 1]);
        
        await countingSortByDigit(arr, exp);
        
        // Send progress update
        updateProgress();
    }
    
    return arr;
}

/**
 * Counting sort by digit for radix sort
 */
async function countingSortByDigit(arr, exp) {
    const n = arr.length;
    const output = new Array(n).fill(0);
    const count = new Array(10).fill(0);
    
    // Store count of occurrences
    for (let i = 0; i < n; i++) {
        const value = await arrayAccess(arr, i);
        const digit = Math.floor(value / exp) % 10;
        
        // Highlight current element and its digit
        updateActiveIndices([i]);
        
        count[digit]++;
        
        // Apply delay periodically
        if (i % 5 === 0) {
            await applyDelay();
            updateProgress();
        }
    }
    
    // Change count[i] to contain actual position
    for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
    }
    
    // Build the output array
    for (let i = n - 1; i >= 0; i--) {
        const value = await arrayAccess(arr, i);
        const digit = Math.floor(value / exp) % 10;
        
        // Highlight currently processed element
        updateActiveIndices([i]);
        
        output[count[digit] - 1] = value;
        count[digit]--;
        
        // Apply delay periodically
        if (i % 5 === 0) {
            await applyDelay();
            updateProgress();
        }
    }
    
    // Copy back to the original array
    for (let i = 0; i < n; i++) {
        // Highlight currently updated position
        updateActiveIndices([i]);
        
        arr[i] = output[i];
        state.metrics.accesses++;
        state.totalOperations++;
        
        // Update the state.array for visualization
        state.array[i] = output[i];
        
        // Apply delay periodically
        if (i % 5 === 0) {
            await applyDelay();
            updateProgress();
        }
    }
}

// Message handler
self.addEventListener('message', function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'sort':
            startSorting(data);
            break;
            
        case 'terminate':
            self.close();
            break;
            
        case 'set_worker_delay':
            state.workerDelay = data.delay;
            break;
    }
}); 