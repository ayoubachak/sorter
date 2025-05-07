/**
 * algorithmWorker.js
 * Web Worker for running sorting algorithms in a separate thread
 */

// State variables
let array = [];
let originalArray = [];
let sortingState = {
    inProgress: false,
    paused: false,
    stepMode: false,
    stepReady: false
};

let metrics = {
    comparisons: 0,
    swaps: 0,
    accesses: 0
};

let algorithmName = '';
let animationSpeed = 50;
let delayTime = 500 / animationSpeed; // Calculate delay time from speed (1-100)

self.importScripts('algorithms.js');

/**
 * Helper function to delay execution for animation purposes
 * @param {number} ms - Time to delay in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send an array update to the main thread
 * @param {Array<number>} array - Current state of the array
 * @param {Array<number>} indices - Indices of elements being modified
 */
function sendArrayUpdate(array, indices = []) {
    self.postMessage({
        type: 'array_update',
        data: {
            array: [...array],
            indices
        }
    });
}

/**
 * Send a metrics update to the main thread
 */
function sendMetricsUpdate() {
    self.postMessage({
        type: 'metrics_update',
        data: { ...metrics }
    });
}

/**
 * Send an operation update to the main thread
 * @param {string} operation - Name of the operation
 * @param {Object} details - Additional details about the operation
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
 * Send a sorting complete message to the main thread
 */
function sendSortingComplete() {
    self.postMessage({
        type: 'sorting_complete'
    });
}

/**
 * Wrapper for array access that tracks metrics
 * @param {Array<number>} arr - The array to access
 * @param {number} index - The index to access
 * @returns {number} - The value at the specified index
 */
function arrayAccess(arr, index) {
    metrics.accesses++;
    sendMetricsUpdate();
    return arr[index];
}

/**
 * Wrapper for array comparison that tracks metrics
 * @param {number} a - First value to compare
 * @param {number} b - Second value to compare
 * @returns {number} - Comparison result (-1, 0, or 1)
 */
function compare(a, b) {
    metrics.comparisons++;
    sendMetricsUpdate();
    
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * Wrapper for array swap that tracks metrics and sends updates
 * @param {Array<number>} arr - The array to modify
 * @param {number} i - First index
 * @param {number} j - Second index
 */
async function swap(arr, i, j) {
    if (i === j) return;
    
    metrics.swaps++;
    sendMetricsUpdate();
    sendOperationUpdate('swap', { indices: [i, j], values: [arr[i], arr[j]] });
    
    // Notify main thread about the swap
    sendArrayUpdate(arr, [i, j]);
    
    // Wait for visualization if not in step mode
    if (!sortingState.stepMode) {
        await waitIfPaused();
        await delay(delayTime);
    }
    
    // Perform the actual swap
    [arr[i], arr[j]] = [arr[j], arr[i]];
    
    // Send the updated array
    sendArrayUpdate(arr, [i, j]);
}

/**
 * Wait if sorting is paused
 * @returns {Promise} - Promise that resolves when sorting is resumed
 */
function waitIfPaused() {
    return new Promise(resolve => {
        if (sortingState.paused) {
            const checkPaused = () => {
                if (sortingState.paused) {
                    setTimeout(checkPaused, 100);
                } else {
                    resolve();
                }
            };
            checkPaused();
        } else {
            resolve();
        }
    });
}

/**
 * Wait for step execution in step mode
 * @returns {Promise} - Promise that resolves when a step is executed
 */
function waitForStep() {
    return new Promise(resolve => {
        if (sortingState.stepMode && !sortingState.stepReady) {
            const checkStep = () => {
                if (!sortingState.stepReady) {
                    setTimeout(checkStep, 100);
                } else {
                    sortingState.stepReady = false;
                    resolve();
                }
            };
            checkStep();
        } else {
            if (sortingState.stepMode) {
                sortingState.stepReady = false;
            }
            resolve();
        }
    });
}

/**
 * Start the sorting process
 * @param {string} algorithm - Name of the algorithm to use
 * @param {Array<number>} inputArray - Array to sort
 * @param {number} speed - Animation speed (1-100)
 * @param {boolean} stepMode - Whether to use step-by-step mode
 */
async function startSorting(algorithm, inputArray, speed, stepMode = false) {
    // Initialize state
    algorithmName = algorithm;
    array = [...inputArray];
    originalArray = [...inputArray];
    animationSpeed = speed;
    delayTime = Math.max(10, 1000 / (speed * speed * 0.01));
    
    sortingState.inProgress = true;
    sortingState.paused = false;
    sortingState.stepMode = stepMode;
    sortingState.stepReady = false;
    
    metrics = {
        comparisons: 0,
        swaps: 0,
        accesses: 0
    };
    
    sendArrayUpdate(array);
    sendMetricsUpdate();
    
    try {
        // Select the correct algorithm
        switch (algorithm) {
            case 'bubble':
                await bubbleSort(array);
                break;
                
            case 'selection':
                await selectionSort(array);
                break;
                
            case 'insertion':
                await insertionSort(array);
                break;
                
            case 'merge':
                await mergeSort(array, 0, array.length - 1);
                break;
                
            case 'quick':
                await quickSort(array, 0, array.length - 1);
                break;
                
            case 'heap':
                await heapSort(array);
                break;
                
            default:
                throw new Error(`Unknown algorithm: ${algorithm}`);
        }
        
        // Mark all elements as sorted for visualization
        sendArrayUpdate(array, Array.from({ length: array.length }, (_, i) => i));
        
        // Send completion notification
        sortingState.inProgress = false;
        sortingState.completed = true;
        sendSortingComplete();
        
    } catch (error) {
        console.error(`Error in sorting algorithm: ${error}`);
        self.postMessage({
            type: 'error',
            data: {
                message: error.message
            }
        });
    }
}

// Bubble Sort Implementation
async function bubbleSort(arr) {
    sendOperationUpdate('algorithm', { 
        name: 'Bubble Sort',
        description: 'Starting bubble sort algorithm'
    });
    
    const n = arr.length;
    
    for (let i = 0; i < n; i++) {
        let swapped = false;
        
        for (let j = 0; j < n - i - 1; j++) {
            // Wait if in step mode
            if (sortingState.stepMode) {
                await waitForStep();
            }
            
            // Wait if paused
            await waitIfPaused();
            
            sendOperationUpdate('comparison', { 
                indices: [j, j + 1],
                values: [arr[j], arr[j + 1]],
                description: `Comparing elements at positions ${j} and ${j + 1}`
            });
            
            if (compare(arr[j], arr[j + 1]) > 0) {
                await swap(arr, j, j + 1);
                swapped = true;
            }
        }
        
        // If no swapping occurred in this pass, array is sorted
        if (!swapped) {
            break;
        }
    }
    
    return arr;
}

// Selection Sort Implementation
async function selectionSort(arr) {
    sendOperationUpdate('algorithm', { 
        name: 'Selection Sort',
        description: 'Starting selection sort algorithm'
    });
    
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        
        for (let j = i + 1; j < n; j++) {
            // Wait if in step mode
            if (sortingState.stepMode) {
                await waitForStep();
            }
            
            // Wait if paused
            await waitIfPaused();
            
            sendOperationUpdate('comparison', { 
                indices: [minIdx, j],
                values: [arr[minIdx], arr[j]],
                description: `Looking for minimum: comparing elements at positions ${minIdx} and ${j}`
            });
            
            if (compare(arr[j], arr[minIdx]) < 0) {
                minIdx = j;
            }
        }
        
        // Swap the minimum element with the first element
        if (minIdx !== i) {
            await swap(arr, i, minIdx);
        }
    }
    
    return arr;
}

// Insertion Sort Implementation
async function insertionSort(arr) {
    sendOperationUpdate('algorithm', { 
        name: 'Insertion Sort',
        description: 'Starting insertion sort algorithm'
    });
    
    const n = arr.length;
    
    for (let i = 1; i < n; i++) {
        const key = arrayAccess(arr, i);
        let j = i - 1;
        
        sendOperationUpdate('key-selection', { 
            index: i,
            value: key,
            description: `Selected key at position ${i} with value ${key}`
        });
        
        while (j >= 0) {
            // Wait if in step mode
            if (sortingState.stepMode) {
                await waitForStep();
            }
            
            // Wait if paused
            await waitIfPaused();
            
            sendOperationUpdate('comparison', { 
                indices: [j, j + 1],
                values: [arr[j], key],
                description: `Comparing key with element at position ${j}`
            });
            
            if (compare(arr[j], key) <= 0) {
                break;
            }
            
            // Move element one position ahead
            arr[j + 1] = arr[j];
            sendArrayUpdate(arr, [j, j + 1]);
            
            await delay(delayTime);
            j--;
        }
        
        arr[j + 1] = key;
        sendArrayUpdate(arr, [j + 1]);
    }
    
    return arr;
}

// Merge Sort Implementation
async function mergeSort(arr, left, right) {
    if (left >= right) {
        return;
    }
    
    sendOperationUpdate('split', { 
        left,
        right,
        description: `Splitting array from index ${left} to ${right}`
    });
    
    const mid = Math.floor((left + right) / 2);
    
    // Wait if in step mode
    if (sortingState.stepMode) {
        await waitForStep();
    }
    
    // Sort first and second halves
    await mergeSort(arr, left, mid);
    await mergeSort(arr, mid + 1, right);
    
    // Merge the sorted halves
    await merge(arr, left, mid, right);
    
    return arr;
}

// Merge function for Merge Sort
async function merge(arr, left, mid, right) {
    sendOperationUpdate('merge', { 
        left,
        mid,
        right,
        description: `Merging subarrays from ${left} to ${mid} and from ${mid + 1} to ${right}`
    });
    
    const n1 = mid - left + 1;
    const n2 = right - mid;
    
    // Create temporary arrays
    const L = new Array(n1);
    const R = new Array(n2);
    
    // Copy data to temporary arrays
    for (let i = 0; i < n1; i++) {
        L[i] = arrayAccess(arr, left + i);
    }
    
    for (let j = 0; j < n2; j++) {
        R[j] = arrayAccess(arr, mid + 1 + j);
    }
    
    // Merge the temporary arrays back into arr
    let i = 0, j = 0, k = left;
    
    while (i < n1 && j < n2) {
        // Wait if in step mode
        if (sortingState.stepMode) {
            await waitForStep();
        }
        
        // Wait if paused
        await waitIfPaused();
        
        sendOperationUpdate('comparison', { 
            indices: [left + i, mid + 1 + j],
            values: [L[i], R[j]],
            description: `Comparing elements from left and right subarrays`
        });
        
        if (compare(L[i], R[j]) <= 0) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        
        sendArrayUpdate(arr, [k]);
        await delay(delayTime);
        k++;
    }
    
    // Copy the remaining elements of L[]
    while (i < n1) {
        if (sortingState.stepMode) {
            await waitForStep();
        }
        await waitIfPaused();
        
        arr[k] = L[i];
        sendArrayUpdate(arr, [k]);
        await delay(delayTime);
        i++;
        k++;
    }
    
    // Copy the remaining elements of R[]
    while (j < n2) {
        if (sortingState.stepMode) {
            await waitForStep();
        }
        await waitIfPaused();
        
        arr[k] = R[j];
        sendArrayUpdate(arr, [k]);
        await delay(delayTime);
        j++;
        k++;
    }
}

// Quick Sort Implementation
async function quickSort(arr, low, high) {
    if (low < high) {
        sendOperationUpdate('partition', { 
            low,
            high,
            description: `Partitioning array from index ${low} to ${high}`
        });
        
        // Wait if in step mode
        if (sortingState.stepMode) {
            await waitForStep();
        }
        
        // Wait if paused
        await waitIfPaused();
        
        // Partition the array and get the pivot index
        const pivotIndex = await partition(arr, low, high);
        
        // Recursively sort elements before and after partition
        await quickSort(arr, low, pivotIndex - 1);
        await quickSort(arr, pivotIndex + 1, high);
    }
}

// Partition function for Quick Sort
async function partition(arr, low, high) {
    // Choose pivot as the last element
    const pivot = arrayAccess(arr, high);
    
    sendOperationUpdate('pivot-selection', { 
        index: high,
        value: pivot,
        description: `Selected pivot at position ${high} with value ${pivot}`
    });
    
    let i = low - 1; // Index of smaller element
    
    for (let j = low; j < high; j++) {
        // Wait if in step mode
        if (sortingState.stepMode) {
            await waitForStep();
        }
        
        // Wait if paused
        await waitIfPaused();
        
        sendOperationUpdate('comparison', { 
            indices: [j, high],
            values: [arr[j], pivot],
            description: `Comparing element at position ${j} with pivot`
        });
        
        // If current element is smaller than the pivot
        if (compare(arr[j], pivot) < 0) {
            i++;
            await swap(arr, i, j);
        }
    }
    
    // Swap the pivot element with the element at (i+1)
    await swap(arr, i + 1, high);
    
    return i + 1;
}

// Heap Sort Implementation
async function heapSort(arr) {
    sendOperationUpdate('algorithm', { 
        name: 'Heap Sort',
        description: 'Starting heap sort algorithm'
    });
    
    const n = arr.length;
    
    // Build heap (rearrange array)
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        await heapify(arr, n, i);
    }
    
    // Extract elements from heap one by one
    for (let i = n - 1; i > 0; i--) {
        // Wait if in step mode
        if (sortingState.stepMode) {
            await waitForStep();
        }
        
        // Wait if paused
        await waitIfPaused();
        
        // Move current root to end
        await swap(arr, 0, i);
        
        // Call max heapify on the reduced heap
        await heapify(arr, i, 0);
    }
    
    return arr;
}

// Heapify a subtree rooted with node i
async function heapify(arr, n, i) {
    let largest = i; // Initialize largest as root
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    
    // If left child is larger than root
    if (left < n) {
        sendOperationUpdate('comparison', { 
            indices: [largest, left],
            values: [arr[largest], arr[left]],
            description: `Comparing root with left child in heap`
        });
        
        if (compare(arr[left], arr[largest]) > 0) {
            largest = left;
        }
    }
    
    // If right child is larger than largest so far
    if (right < n) {
        sendOperationUpdate('comparison', { 
            indices: [largest, right],
            values: [arr[largest], arr[right]],
            description: `Comparing current largest with right child in heap`
        });
        
        if (compare(arr[right], arr[largest]) > 0) {
            largest = right;
        }
    }
    
    // If largest is not root
    if (largest !== i) {
        await swap(arr, i, largest);
        
        // Recursively heapify the affected sub-tree
        await heapify(arr, n, largest);
    }
}

// Message event listener
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'start_sorting':
            await startSorting(
                data.algorithm,
                data.array,
                data.speed,
                data.stepMode
            );
            break;
            
        case 'pause_sorting':
            sortingState.paused = true;
            break;
            
        case 'resume_sorting':
            sortingState.paused = false;
            break;
            
        case 'stop_sorting':
            sortingState.inProgress = false;
            sortingState.paused = false;
            break;
            
        case 'enable_step_mode':
            sortingState.stepMode = true;
            break;
            
        case 'execute_step':
            sortingState.stepReady = true;
            break;
            
        case 'set_speed':
            animationSpeed = data.speed;
            delayTime = Math.max(10, 1000 / (animationSpeed * animationSpeed * 0.01));
            break;
    }
}); 