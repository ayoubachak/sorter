/**
 * sortWorker.js
 * Worker thread for sorting a portion of the array in parallel
 */

// State for this worker
const state = {
    workerId: -1,
    array: [],
    algorithm: '',
    metrics: {
        comparisons: 0,
        swaps: 0,
        accesses: 0
    }
};

// Import the algorithms
self.importScripts('algorithms.js');

/**
 * Start sorting a partition
 */
function startSorting(data) {
    const { algorithm, array, workerId, speed, maxDigits } = data;
    
    state.workerId = workerId;
    state.array = [...array];
    state.algorithm = algorithm;
    state.metrics = { comparisons: 0, swaps: 0, accesses: 0 };
    
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
                sortedArray = mergeSort(array);
                break;
                
            case 'quick':
                sortedArray = quickSort(array);
                break;
                
            case 'insertion':
                sortedArray = insertionSort(array);
                break;
                
            case 'radix':
                sortedArray = radixSort(array, maxDigits);
                break;
                
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        
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
 * Track metrics for comparisons
 */
function compare(a, b) {
    state.metrics.comparisons++;
    
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * Track metrics for array access
 */
function arrayAccess(arr, index) {
    state.metrics.accesses++;
    return arr[index];
}

/**
 * Track metrics for swaps
 */
function swap(arr, i, j) {
    if (i === j) return;
    
    state.metrics.swaps++;
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

/**
 * Send progress update
 */
function updateProgress(progress) {
    self.postMessage({
        type: 'progress',
        data: {
            progress,
            workerId: state.workerId
        }
    });
}

/**
 * Merge sort implementation
 */
function mergeSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    
    // Send progress updates
    updateProgress(50);
    
    return merge(left, right);
}

/**
 * Merge two sorted arrays
 */
function merge(left, right) {
    const result = [];
    let leftIndex = 0;
    let rightIndex = 0;
    
    while (leftIndex < left.length && rightIndex < right.length) {
        state.metrics.comparisons++;
        
        if (left[leftIndex] <= right[rightIndex]) {
            result.push(left[leftIndex]);
            leftIndex++;
        } else {
            result.push(right[rightIndex]);
            rightIndex++;
        }
    }
    
    // Add remaining elements
    return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

/**
 * Quick sort implementation
 */
function quickSort(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        const pivotIndex = partition(arr, low, high);
        
        // Send progress update
        updateProgress(Math.floor((pivotIndex / arr.length) * 100));
        
        quickSort(arr, low, pivotIndex - 1);
        quickSort(arr, pivotIndex + 1, high);
    }
    
    return arr;
}

/**
 * Partition function for Quick Sort
 */
function partition(arr, low, high) {
    const pivot = arrayAccess(arr, high);
    let i = low - 1;
    
    for (let j = low; j < high; j++) {
        if (compare(arr[j], pivot) <= 0) {
            i++;
            swap(arr, i, j);
        }
    }
    
    swap(arr, i + 1, high);
    return i + 1;
}

/**
 * Insertion sort implementation
 */
function insertionSort(arr) {
    const n = arr.length;
    
    for (let i = 1; i < n; i++) {
        const key = arrayAccess(arr, i);
        let j = i - 1;
        
        // Update progress periodically
        if (i % 10 === 0) {
            updateProgress(Math.floor((i / n) * 100));
        }
        
        while (j >= 0 && compare(arr[j], key) > 0) {
            arr[j + 1] = arr[j];
            state.metrics.accesses++;
            j--;
        }
        
        arr[j + 1] = key;
        state.metrics.accesses++;
    }
    
    return arr;
}

/**
 * Radix sort implementation
 */
function radixSort(arr, maxDigits) {
    const n = arr.length;
    
    // Do counting sort for every digit position
    for (let exp = 1, digit = 0; digit < maxDigits; exp *= 10, digit++) {
        countingSortByDigit(arr, exp);
        
        // Send progress update
        updateProgress(Math.floor(((digit + 1) / maxDigits) * 100));
    }
    
    return arr;
}

/**
 * Counting sort by digit for radix sort
 */
function countingSortByDigit(arr, exp) {
    const n = arr.length;
    const output = new Array(n).fill(0);
    const count = new Array(10).fill(0);
    
    // Store count of occurrences
    for (let i = 0; i < n; i++) {
        const digit = Math.floor(arrayAccess(arr, i) / exp) % 10;
        count[digit]++;
    }
    
    // Change count[i] to contain actual position
    for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
    }
    
    // Build the output array
    for (let i = n - 1; i >= 0; i--) {
        const value = arrayAccess(arr, i);
        const digit = Math.floor(value / exp) % 10;
        
        output[count[digit] - 1] = value;
        count[digit]--;
    }
    
    // Copy back to the original array
    for (let i = 0; i < n; i++) {
        arr[i] = output[i];
        state.metrics.accesses++;
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
    }
}); 