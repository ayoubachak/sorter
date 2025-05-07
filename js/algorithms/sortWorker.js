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
    state.workerDelay = Math.max(10, workerDelay || 50);
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
    
    // Send initial visualization update
    sendVisualizationUpdate([0, Math.min(array.length - 1, 5)]);
    
    // Notify that we're ready
    self.postMessage({
        type: 'ready',
        data: { workerId }
    });
    
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
        await delayPromise(Math.min(20, state.workerDelay));
    }
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
    sendVisualizationUpdate(indices);
}

/**
 * Send visualization update to show activity
 */
function sendVisualizationUpdate(indices) {
    if (!indices || indices.length === 0) return;
    
    self.postMessage({
        type: 'worker_visual_update',
        data: {
            workerId: state.workerId,
            indices: indices,
            array: state.array // Include current array state
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
    
    // Also send current array state for visualization
    self.postMessage({
        type: 'progress',
        data: {
            progress: progressPercent,
            workerId: state.workerId,
            metrics: { ...state.metrics }, // Include current metrics
            operation: currentOperation,
            array: state.array, // Include current array state
            activeIndices: state.activeIndices
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
    
    // Highlight the split operation
    updateActiveIndices([0, mid, arr.length - 1]);
    
    const left = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    
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
    
    while (leftIndex < left.length && rightIndex < right.length) {
        state.metrics.comparisons++;
        state.totalOperations++;
        
        // Highlight the elements being compared
        updateActiveIndices([leftStart + leftIndex, rightStart + rightIndex]);
        
        await applyDelay();
        
        if (left[leftIndex] <= right[rightIndex]) {
            result.push(left[leftIndex]);
            leftIndex++;
        } else {
            result.push(right[rightIndex]);
            rightIndex++;
        }
        
        // Periodically update progress
        if (state.totalOperations % 10 === 0) {
            updateProgress();
        }
    }
    
    // Add remaining elements and highlight
    if (leftIndex < left.length) {
        updateActiveIndices([leftStart + leftIndex]);
    } else if (rightIndex < right.length) {
        updateActiveIndices([rightStart + rightIndex]);
    }
    
    // Add remaining elements
    const resultArray = result
        .concat(left.slice(leftIndex))
        .concat(right.slice(rightIndex));
    
    // Update the state array with merged result for visualization
    for (let i = 0; i < resultArray.length; i++) {
        state.array[i] = resultArray[i];
    }
    
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
    
    // Highlight the pivot
    updateActiveIndices([high]);
    await applyDelay();
    
    for (let j = low; j < high; j++) {
        // Compare current element with pivot and highlight
        updateActiveIndices([j, high]);
        
        if (await compare(arr[j], pivot, j, high) <= 0) {
            i++;
            // Swap and highlight
            updateActiveIndices([i, j]);
            await swap(arr, i, j);
        }
    }
    
    // Swap the pivot element
    await swap(arr, i + 1, high);
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