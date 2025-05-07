/**
 * multiThreadedWorker.js
 * Web Worker for coordinating multi-threaded sorting algorithms
 */

// Internal state for coordination
let workerState = {
    algorithm: '',
    originalArray: [],
    threadCount: 4,
    workersReady: 0,
    workersCompleted: 0,
    speed: 50,
    workerDelay: 200, // Default delay between worker operations in ms
    highlightWorkers: true, // Whether to highlight which worker is processing which elements
    metrics: {
        comparisons: 0,
        swaps: 0,
        accesses: 0
    },
    subArrays: [],           // Array partitions for each worker
    sortedSubArrays: [],     // Sorted partitions returned by workers
    workers: [],             // Worker references
    status: 'idle',          // 'idle', 'initializing', 'sorting', 'merging', 'completed'
    workerRanges: []         // Store start and end indices for each worker's partition
};

// Import algorithm information
self.importScripts('./algorithms.js');
console.log('MultiThreadedWorker: Loaded algorithms.js');

/**
 * Start multi-threaded sorting
 * @param {string} algorithm - Algorithm name
 * @param {Array} array - Array to sort
 * @param {number} threadCount - Number of worker threads to use
 * @param {number} speed - Animation speed
 * @param {number} workerDelay - Delay between worker operations
 * @param {boolean} highlightWorkers - Whether to highlight worker activity
 */
function startMultiThreadedSorting(algorithm, array, threadCount, speed, workerDelay = 200, highlightWorkers = true) {
    console.log('MultiThreadedWorker: Starting sorting with', threadCount, 'threads');
    
    workerState.algorithm = algorithm;
    workerState.originalArray = [...array];
    workerState.threadCount = threadCount;
    workerState.speed = speed;
    // Cap the worker delay to be more responsive
    workerState.workerDelay = Math.min(100, workerDelay);
    workerState.highlightWorkers = highlightWorkers;
    workerState.workersReady = 0;
    workerState.workersCompleted = 0;
    workerState.status = 'initializing';
    workerState.metrics = { comparisons: 0, swaps: 0, accesses: 0 };
    
    // Reset sub-arrays
    workerState.subArrays = [];
    workerState.sortedSubArrays = [];
    workerState.workerRanges = [];
    
    sendOperationUpdate('multi-threading', {
        description: `Starting multi-threaded ${algorithm} sort with ${threadCount} workers (delay: ${workerState.workerDelay}ms)`
    });
    
    // Different approach for different algorithms
    try {
        switch(algorithm) {
            case 'merge':
                initializeMergeSortThreads(array, threadCount);
                break;
                
            case 'quick':
                initializeQuickSortThreads(array, threadCount);
                break;
                
            case 'tim':
                initializeTimSortThreads(array, threadCount);
                break;
                
            case 'radix':
                initializeRadixSortThreads(array, threadCount);
                break;
                
            default:
                sendError(`Algorithm ${algorithm} is not supported for multi-threading`);
                return;
        }
    } catch (error) {
        sendError(`Error initializing workers: ${error.message}`);
        console.error('Error in multi-threaded sorting:', error);
    }
}

/**
 * Initialize parallel merge sort
 */
function initializeMergeSortThreads(array, threadCount) {
    const n = array.length;
    
    // Partition the array into equal chunks
    const partitionSize = Math.ceil(n / threadCount);
    
    sendOperationUpdate('partitioning', {
        description: `Partitioning array into ${threadCount} chunks of approximately ${partitionSize} elements each`
    });
    
    // Create sub-arrays for each worker
    for (let i = 0; i < threadCount; i++) {
        const start = i * partitionSize;
        const end = Math.min(start + partitionSize, n);
        workerState.subArrays[i] = array.slice(start, end);
        workerState.workerRanges[i] = { start, end: end - 1 };
    }
    
    // Initialize workers
    for (let i = 0; i < threadCount; i++) {
        try {
            const worker = new Worker('./sortWorker.js');
            
            worker.onmessage = function(e) {
                handleWorkerMessage(e.data, i);
            };
            
            worker.onerror = function(error) {
                sendError(`Error in worker ${i}: ${error.message}`);
                console.error(`Error in worker ${i}:`, error);
            };
            
            workerState.workers[i] = worker;
            
            // Start the worker with its portion of the array
            worker.postMessage({
                type: 'sort',
                data: {
                    algorithm: workerState.algorithm,
                    array: workerState.subArrays[i],
                    workerId: i,
                    speed: workerState.speed,
                    workerDelay: workerState.workerDelay
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements (delay: ${workerState.workerDelay}ms)`);
        } catch (error) {
            sendError(`Failed to create worker ${i}: ${error.message}`);
            console.error(`Failed to create worker ${i}:`, error);
        }
    }
}

/**
 * Initialize parallel quick sort
 */
function initializeQuickSortThreads(array, threadCount) {
    // For quick sort, we need to first find good pivots
    const n = array.length;
    
    sendOperationUpdate('finding-pivots', {
        description: `Finding ${threadCount - 1} pivot points for quick sort partitioning`
    });
    
    // Sample the array to find potential pivots
    const sampleSize = Math.min(1000, n);
    const samples = [];
    const sampleStep = Math.max(1, Math.floor(n / sampleSize));
    
    for (let i = 0; i < n; i += sampleStep) {
        samples.push(array[i]);
    }
    
    // Sort the samples
    samples.sort((a, b) => a - b);
    
    // Choose pivots at regular intervals
    const pivots = [];
    const pivotStep = Math.floor(samples.length / threadCount);
    for (let i = 1; i < threadCount; i++) {
        pivots.push(samples[i * pivotStep]);
    }
    
    sendOperationUpdate('partitioning', {
        description: `Partitioning array using ${pivots.length} pivot values`
    });
    
    // Partition the array based on pivots
    const partitions = Array(threadCount).fill().map(() => []);
    
    // Distribute elements into partitions
    for (let i = 0; i < n; i++) {
        const val = array[i];
        let j = 0;
        while (j < pivots.length && val > pivots[j]) {
            j++;
        }
        partitions[j].push(val);
    }
    
    // Save partitions as sub-arrays
    workerState.subArrays = partitions;
    
    // Track the global index ranges for each partition
    let startIdx = 0;
    for (let i = 0; i < threadCount; i++) {
        const partitionSize = partitions[i].length;
        workerState.workerRanges[i] = { 
            start: startIdx, 
            end: startIdx + partitionSize - 1 
        };
        startIdx += partitionSize;
    }
    
    // Initialize workers
    for (let i = 0; i < threadCount; i++) {
        try {
            const worker = new Worker('./sortWorker.js');
            
            worker.onmessage = function(e) {
                handleWorkerMessage(e.data, i);
            };
            
            worker.onerror = function(error) {
                sendError(`Error in worker ${i}: ${error.message}`);
                console.error(`Error in worker ${i}:`, error);
            };
            
            workerState.workers[i] = worker;
            
            // Start the worker with its portion of the array
            worker.postMessage({
                type: 'sort',
                data: {
                    algorithm: workerState.algorithm,
                    array: workerState.subArrays[i],
                    workerId: i,
                    speed: workerState.speed,
                    workerDelay: workerState.workerDelay
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements (delay: ${workerState.workerDelay}ms)`);
        } catch (error) {
            sendError(`Failed to create worker ${i}: ${error.message}`);
            console.error(`Failed to create worker ${i}:`, error);
        }
    }
}

/**
 * Initialize parallel Tim sort
 */
function initializeTimSortThreads(array, threadCount) {
    // Tim sort is similar to merge sort for multi-threading
    const n = array.length;
    
    // Partition the array into equal chunks
    const partitionSize = Math.ceil(n / threadCount);
    
    sendOperationUpdate('partitioning', {
        description: `Partitioning array into ${threadCount} chunks of approximately ${partitionSize} elements each for Tim Sort`
    });
    
    // Create sub-arrays for each worker
    for (let i = 0; i < threadCount; i++) {
        const start = i * partitionSize;
        const end = Math.min(start + partitionSize, n);
        workerState.subArrays[i] = array.slice(start, end);
        workerState.workerRanges[i] = { start, end: end - 1 };
    }
    
    // Initialize workers
    for (let i = 0; i < threadCount; i++) {
        try {
            const worker = new Worker('./sortWorker.js');
            
            worker.onmessage = function(e) {
                handleWorkerMessage(e.data, i);
            };
            
            worker.onerror = function(error) {
                sendError(`Error in worker ${i}: ${error.message}`);
                console.error(`Error in worker ${i}:`, error);
            };
            
            workerState.workers[i] = worker;
            
            // Start the worker with its portion of the array
            worker.postMessage({
                type: 'sort',
                data: {
                    algorithm: 'insertion', // Use insertion sort for small partitions as Tim Sort would
                    array: workerState.subArrays[i],
                    workerId: i,
                    speed: workerState.speed,
                    workerDelay: workerState.workerDelay
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements (delay: ${workerState.workerDelay}ms)`);
        } catch (error) {
            sendError(`Failed to create worker ${i}: ${error.message}`);
            console.error(`Failed to create worker ${i}:`, error);
        }
    }
}

/**
 * Initialize parallel Radix sort
 */
function initializeRadixSortThreads(array, threadCount) {
    const n = array.length;
    
    // Find the maximum number to know number of digits
    let max = array[0];
    for (let i = 1; i < n; i++) {
        max = Math.max(max, array[i]);
    }
    
    const digits = Math.floor(Math.log10(max)) + 1;
    
    sendOperationUpdate('digit-analysis', {
        description: `Analyzing digits for radix sort: max value ${max}, ${digits} digits`
    });
    
    // Split work by digit position rather than by array partitioning
    // Each worker handles a specific digit position for the entire array
    
    // For simplicity in this implementation, we'll divide the array
    const partitionSize = Math.ceil(n / threadCount);
    
    sendOperationUpdate('partitioning', {
        description: `Partitioning array into ${threadCount} chunks for parallel radix sort`
    });
    
    // Create sub-arrays for each worker
    for (let i = 0; i < threadCount; i++) {
        const start = i * partitionSize;
        const end = Math.min(start + partitionSize, n);
        workerState.subArrays[i] = array.slice(start, end);
        workerState.workerRanges[i] = { start, end: end - 1 };
    }
    
    // Initialize workers
    for (let i = 0; i < threadCount; i++) {
        try {
            const worker = new Worker('./sortWorker.js');
            
            worker.onmessage = function(e) {
                handleWorkerMessage(e.data, i);
            };
            
            worker.onerror = function(error) {
                sendError(`Error in worker ${i}: ${error.message}`);
                console.error(`Error in worker ${i}:`, error);
            };
            
            workerState.workers[i] = worker;
            
            // Start the worker with its portion of the array
            worker.postMessage({
                type: 'sort',
                data: {
                    algorithm: 'radix',
                    array: workerState.subArrays[i],
                    workerId: i,
                    speed: workerState.speed,
                    maxDigits: digits,
                    workerDelay: workerState.workerDelay
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements (delay: ${workerState.workerDelay}ms)`);
        } catch (error) {
            sendError(`Failed to create worker ${i}: ${error.message}`);
            console.error(`Failed to create worker ${i}:`, error);
        }
    }
}

/**
 * Handle messages from individual workers
 */
function handleWorkerMessage(message, workerId) {
    const { type, data } = message;
    
    switch (type) {
        case 'ready':
            workerState.workersReady++;
            if (workerState.workersReady === workerState.threadCount) {
                workerState.status = 'sorting';
                sendOperationUpdate('workers-initialized', {
                    description: `All ${workerState.threadCount} workers initialized and ready`
                });
            }
            break;
            
        case 'progress':
            // Forward progress updates from individual workers and show visual indication
            sendOperationUpdate('worker-progress', {
                workerId: workerId,
                progress: data.progress,
                description: `Worker ${workerId} progress: ${data.progress}%`
            });
            
            // Show visual indication of which elements this worker is processing
            if (workerState.highlightWorkers) {
                // If the worker included active indices, use those
                if (data.activeIndices && data.activeIndices.length > 0) {
                    const workerRange = workerState.workerRanges[workerId];
                    if (workerRange) {
                        // Map worker's local indices to global indices
                        const globalIndices = data.activeIndices.map(idx => 
                            workerRange.start + Math.min(idx, workerState.subArrays[workerId].length - 1)
                        );
                        
                        // Send visual update with the worker's current array state
                        sendWorkerVisualUpdate(workerId, globalIndices, data.array);
                        
                        // Add non-blocking delay
                        setTimeout(() => {}, 0);
                    }
                } else {
                    const workerRange = workerState.workerRanges[workerId];
                    if (workerRange) {
                        // Instead of random indices, highlight a section of the worker's assigned partition
                        // to show real-time processing
                        const partitionSize = workerRange.end - workerRange.start + 1;
                        const progress = data.progress / 100; // Convert to 0-1 scale
                        
                        // Highlight a window of elements around the current progress point
                        const windowSize = Math.min(10, Math.ceil(partitionSize * 0.2));
                        const centerIdx = Math.floor(workerRange.start + progress * partitionSize);
                        
                        // Create an array of indices to highlight around the center point
                        let globalIndices = [];
                        const halfWindow = Math.floor(windowSize / 2);
                        
                        for (let i = Math.max(workerRange.start, centerIdx - halfWindow); 
                             i <= Math.min(workerRange.end, centerIdx + halfWindow); i++) {
                            globalIndices.push(i);
                        }
                        
                        // Send visual update
                        sendWorkerVisualUpdate(workerId, globalIndices, data.array);
                        
                        // Add non-blocking delay
                        setTimeout(() => {}, 0);
                    }
                }
            }
            
            // Update metrics from worker if available
            if (data.metrics) {
                // These are incremental updates, so add to our current metrics
                if (data.metrics.comparisons) workerState.metrics.comparisons += 1;
                if (data.metrics.swaps) workerState.metrics.swaps += 1;
                if (data.metrics.accesses) workerState.metrics.accesses += 1;
                
                sendMetricsUpdate();
            }
            break;
            
        case 'worker_visual_update':
            // Process visual updates from workers with their current array state
            if (workerState.highlightWorkers) {
                const workerRange = workerState.workerRanges[workerId];
                if (workerRange && data.indices) {
                    // Map worker's local indices to global indices
                    const globalIndices = data.indices.map(idx => 
                        workerRange.start + Math.min(idx, workerState.subArrays[workerId].length - 1)
                    );
                    
                    // Send visual update
                    sendWorkerVisualUpdate(workerId, globalIndices, data.array);
                    
                    // If the worker also included its current array state, update our tracking
                    if (data.array) {
                        updateWorkerArraySection(workerId, data.array);
                    }
                }
            }
            break;
            
        case 'metrics':
            // Aggregate metrics from workers
            workerState.metrics.comparisons += data.metrics.comparisons;
            workerState.metrics.swaps += data.metrics.swaps;
            workerState.metrics.accesses += data.metrics.accesses;
            
            sendMetricsUpdate();
            break;
            
        case 'sorted':
            // Worker has completed sorting its sub-array
            workerState.sortedSubArrays[workerId] = data.sortedArray;
            workerState.workersCompleted++;
            
            sendOperationUpdate('worker-complete', {
                workerId: workerId,
                description: `Worker ${workerId} completed sorting ${data.sortedArray.length} elements`
            });
            
            // Forward the partial sort for visualization
            sendArrayUpdateForWorker(workerId, data.sortedArray);
            
            // Check if all workers have completed
            if (workerState.workersCompleted === workerState.threadCount) {
                mergeResults();
            }
            break;
            
        case 'error':
            sendError(`Error in worker ${workerId}: ${data.message}`);
            break;
    }
}

/**
 * Update the array state with a worker's current section
 */
function updateWorkerArraySection(workerId, workerArray) {
    if (!workerArray || !workerState.workerRanges[workerId]) return;
    
    // Get the range for this worker
    const range = workerState.workerRanges[workerId];
    const startIdx = range.start;
    
    // Update the original array with the worker's current array state
    const sectionLength = Math.min(workerArray.length, range.end - range.start + 1);
    for (let i = 0; i < sectionLength; i++) {
        workerState.originalArray[startIdx + i] = workerArray[i];
    }
}

/**
 * Merge the sorted sub-arrays from all workers
 */
function mergeResults() {
    workerState.status = 'merging';
    
    sendOperationUpdate('merging', {
        description: `Merging ${workerState.threadCount} sorted sub-arrays`
    });
    
    // Terminate worker threads as they're no longer needed
    workerState.workers.forEach(worker => {
        if (worker) {
            worker.terminate();
        }
    });
    
    // Merge the sorted sub-arrays based on the algorithm
    let finalSortedArray;
    
    switch (workerState.algorithm) {
        case 'merge':
        case 'tim':
            // Visualize the merge process for merge and tim sorts
            visualizeMerging(workerState.sortedSubArrays);
            return; // The visualization function will handle final array update
            
        case 'quick':
            // For quick sort, just concatenate the sorted partitions
            finalSortedArray = [].concat(...workerState.sortedSubArrays);
            break;
            
        case 'radix':
            // For radix sort, visualize the merging process
            visualizeMerging(workerState.sortedSubArrays);
            return; // The visualization function will handle final array update
            
        default:
            finalSortedArray = [].concat(...workerState.sortedSubArrays);
    }
    
    // Send the final sorted array
    sendFullArrayUpdate(finalSortedArray);
    
    // Mark sorting as completed
    workerState.status = 'completed';
    sendSortingComplete();
}

/**
 * Visualize the process of merging sorted subarrays
 * @param {Array<Array>} sortedArrays - The sorted subarrays to merge
 */
async function visualizeMerging(sortedArrays) {
    const mergeDelay = workerState.workerDelay * 2; // Slow down merging for visibility
    
    sendOperationUpdate('merging-visualization', {
        description: `Visualizing the merging of ${sortedArrays.length} sorted subarrays`
    });
    
    // Use a clone of the original array to build up our result
    let resultArray = [...workerState.originalArray];
    
    // Prepare an array of pointers, one for each sorted subarray
    const pointers = Array(sortedArrays.length).fill(0);
    
    // Calculate total elements to merge and prepare global indices mapping
    const totalElements = sortedArrays.reduce((sum, arr) => sum + arr.length, 0);
    
    // Keep track of where each subarray starts in the global array
    let globalStartIndices = [];
    let startIdx = 0;
    for (let i = 0; i < sortedArrays.length; i++) {
        globalStartIndices[i] = startIdx;
        startIdx += sortedArrays[i].length;
    }
    
    // Perform merge with visualization
    for (let resultIdx = 0; resultIdx < totalElements; resultIdx++) {
        let minValue = Infinity;
        let minArrayIdx = -1;
        
        // Find the minimum value across all arrays
        for (let i = 0; i < sortedArrays.length; i++) {
            if (pointers[i] < sortedArrays[i].length) {
                const value = sortedArrays[i][pointers[i]];
                if (value < minValue) {
                    minValue = value;
                    minArrayIdx = i;
                }
            }
        }
        
        // If we found a minimum, add it to the result array
        if (minArrayIdx !== -1) {
            // Calculate the global position for this element
            const globalPosition = globalStartIndices[minArrayIdx] + pointers[minArrayIdx];
            
            // Update result array
            resultArray[resultIdx] = minValue;
            
            // Visualize this merge step
            sendOperationUpdate('merge-step', {
                description: `Merging element ${minValue} from worker ${minArrayIdx} to position ${resultIdx}`
            });
            
            // Highlight both the source and destination positions
            const indicesToHighlight = [globalPosition, resultIdx];
            
            // Send visual update
            self.postMessage({
                type: 'array_update',
                data: {
                    array: resultArray,
                    indices: indicesToHighlight,
                    mergeOperation: true
                }
            });
            
            // Increment the pointer for the array we took from
            pointers[minArrayIdx]++;
            
            // Add delay for visualization
            await delayPromise(mergeDelay);
        }
    }
    
    // After merging is complete, send the final sorted array
    sendFullArrayUpdate(resultArray);
    
    // Mark sorting as completed
    workerState.status = 'completed';
    sendSortingComplete();
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
 * Merge multiple sorted arrays into a single sorted array
 */
function mergeSortedArrays(arrays) {
    // Create pointers for each array
    const pointers = Array(arrays.length).fill(0);
    const result = [];
    const totalElements = arrays.reduce((sum, arr) => sum + arr.length, 0);
    
    for (let i = 0; i < totalElements; i++) {
        let minValue = Infinity;
        let minIndex = -1;
        
        // Find the minimum value across all arrays
        for (let j = 0; j < arrays.length; j++) {
            if (pointers[j] < arrays[j].length && arrays[j][pointers[j]] < minValue) {
                minValue = arrays[j][pointers[j]];
                minIndex = j;
            }
        }
        
        if (minIndex !== -1) {
            result.push(minValue);
            pointers[minIndex]++;
        }
    }
    
    return result;
}

/**
 * Send array update for visualization
 * @param {number} workerId - ID of the worker
 * @param {Array} array - Sorted sub-array
 */
function sendArrayUpdateForWorker(workerId, array) {
    // Get the global range information for this worker
    const workerRange = workerState.workerRanges[workerId];
    if (!workerRange) return;
    
    // Create global indices array for this worker's partition
    const globalIndices = Array.from(
        { length: array.length }, 
        (_, i) => workerRange.start + i
    );
    
    // Create a full array representation for visualization
    let fullArray = [...workerState.originalArray];
    
    // Update only the elements this worker processed
    for (let i = 0; i < array.length; i++) {
        fullArray[workerRange.start + i] = array[i];
    }
    
    // Also update our tracking of the original array
    updateWorkerArraySection(workerId, array);
    
    self.postMessage({
        type: 'array_update',
        data: {
            array: fullArray,
            indices: globalIndices,
            workerId: workerId // Pass the worker ID for color coding
        }
    });
    
    // Use a non-blocking delay for visualization
    setTimeout(() => {}, 0);
}

/**
 * Send visual update for worker activity without changing array values
 * @param {number} workerId - ID of the worker
 * @param {Array} indices - Indices to highlight
 * @param {Array} array - Current state of the worker's array (optional)
 */
function sendWorkerVisualUpdate(workerId, indices, array = null) {
    // Create message data
    const messageData = {
        indices: indices,
        workerId: workerId
    };
    
    // If the worker provided its current array state, include it
    if (array) {
        // Update our tracking of the original array first
        updateWorkerArraySection(workerId, array);
        
        // Create a full array representation
        const fullArray = [...workerState.originalArray];
        messageData.array = fullArray;
    }
    
    self.postMessage({
        type: 'worker_visual_update',
        data: messageData
    });
}

/**
 * Send the complete sorted array
 */
function sendFullArrayUpdate(array) {
    self.postMessage({
        type: 'array_update',
        data: {
            array: array,
            indices: Array.from({ length: array.length }, (_, i) => i)
        }
    });
}

/**
 * Send metrics update to main thread
 */
function sendMetricsUpdate() {
    self.postMessage({
        type: 'metrics_update',
        data: { ...workerState.metrics }
    });
}

/**
 * Send operation update to main thread
 */
function sendOperationUpdate(operation, details = {}) {
    self.postMessage({
        type: 'operation_update',
        data: {
            operation,
            details
        }
    });
}

/**
 * Send error message to main thread
 */
function sendError(message) {
    self.postMessage({
        type: 'error',
        data: {
            message
        }
    });
}

/**
 * Send sorting complete notification to main thread
 */
function sendSortingComplete() {
    self.postMessage({
        type: 'sorting_complete'
    });
}

// Message event listener
self.addEventListener('message', function(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'start_multi_threaded_sorting':
            startMultiThreadedSorting(
                data.algorithm,
                data.array,
                data.threadCount,
                data.speed,
                data.workerDelay || 200,
                data.highlightWorkers !== undefined ? data.highlightWorkers : true
            );
            break;
            
        case 'terminate':
            workerState.workers.forEach(worker => {
                if (worker) {
                    worker.terminate();
                }
            });
            self.close();
            break;
            
        case 'set_worker_delay':
            workerState.workerDelay = data.delay;
            
            // Propagate to all workers
            workerState.workers.forEach(worker => {
                if (worker) {
                    worker.postMessage({
                        type: 'set_worker_delay',
                        data: { delay: workerState.workerDelay }
                    });
                }
            });
            break;
            
        case 'set_highlight_workers':
            workerState.highlightWorkers = data.highlight;
            break;
    }
}); 