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
    metrics: {
        comparisons: 0,
        swaps: 0,
        accesses: 0
    },
    subArrays: [],           // Array partitions for each worker
    sortedSubArrays: [],     // Sorted partitions returned by workers
    workers: [],             // Worker references
    status: 'idle'           // 'idle', 'initializing', 'sorting', 'merging', 'completed'
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
 */
function startMultiThreadedSorting(algorithm, array, threadCount, speed) {
    console.log('MultiThreadedWorker: Starting sorting with', threadCount, 'threads');
    
    workerState.algorithm = algorithm;
    workerState.originalArray = [...array];
    workerState.threadCount = threadCount;
    workerState.speed = speed;
    workerState.workersReady = 0;
    workerState.workersCompleted = 0;
    workerState.status = 'initializing';
    workerState.metrics = { comparisons: 0, swaps: 0, accesses: 0 };
    
    // Reset sub-arrays
    workerState.subArrays = [];
    workerState.sortedSubArrays = [];
    
    sendOperationUpdate('multi-threading', {
        description: `Starting multi-threaded ${algorithm} sort with ${threadCount} workers`
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
                    speed: workerState.speed
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements`);
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
                    speed: workerState.speed
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements`);
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
                    speed: workerState.speed
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements`);
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
                    maxDigits: digits
                }
            });
            
            console.log(`Started worker ${i} with ${workerState.subArrays[i].length} elements`);
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
            // Forward progress updates from individual workers
            sendOperationUpdate('worker-progress', {
                workerId: workerId,
                progress: data.progress,
                description: `Worker ${workerId} progress: ${data.progress}%`
            });
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
            finalSortedArray = mergeSortedArrays(workerState.sortedSubArrays);
            break;
            
        case 'quick':
            // For quick sort, just concatenate the sorted partitions
            finalSortedArray = [].concat(...workerState.sortedSubArrays);
            break;
            
        case 'radix':
            finalSortedArray = mergeSortedArrays(workerState.sortedSubArrays);
            break;
            
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
    // Calculate the global indices for this worker's partition
    let globalIndices = [];
    let startIndex = 0;
    
    // Sum up the lengths of previous partitions
    for (let i = 0; i < workerId; i++) {
        startIndex += workerState.subArrays[i].length;
    }
    
    // Create global indices array
    for (let i = 0; i < array.length; i++) {
        globalIndices.push(startIndex + i);
    }
    
    // Create a full array representation for visualization
    let fullArray = [...workerState.originalArray];
    for (let i = 0; i < array.length; i++) {
        fullArray[startIndex + i] = array[i];
    }
    
    self.postMessage({
        type: 'array_update',
        data: {
            array: fullArray,
            indices: globalIndices
        }
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
                data.speed
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
    }
}); 