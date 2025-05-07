/**
 * SortingEngine.js
 * Core engine that manages the sorting process, state, and dispatches visualization updates
 */
class SortingEngine {
    constructor() {
        this.array = [];
        this.originalArray = [];
        this.sortingState = {
            inProgress: false,
            paused: false,
            completed: false,
            stepMode: false
        };
        
        this.metrics = {
            comparisons: 0,
            swaps: 0,
            accesses: 0,
            startTime: 0,
            endTime: 0
        };
        
        this.currentAlgorithm = null;
        this.worker = null;
        this.animationSpeed = 50; // 1-100
        this.callbacks = {
            onArrayUpdate: null,
            onMetricsUpdate: null,
            onOperationUpdate: null,
            onSortingComplete: null
        };
    }
    
    /**
     * Initialize the engine with a new array
     * @param {number} size - Size of the array to generate
     * @param {string} distribution - Distribution type ('random', 'nearly-sorted', 'reversed', etc.)
     */
    initialize(size, distribution = 'random') {
        this.resetMetrics();
        this.sortingState.inProgress = false;
        this.sortingState.paused = false;
        this.sortingState.completed = false;
        
        this.array = this.generateArray(size, distribution);
        this.originalArray = [...this.array];
        
        if (this.callbacks.onArrayUpdate) {
            this.callbacks.onArrayUpdate(this.array);
        }
    }
    
    /**
     * Generate an array with the specified properties
     * @param {number} size - Size of the array
     * @param {string} distribution - Distribution type
     * @returns {Array<number>} - The generated array
     */
    generateArray(size, distribution) {
        const array = [];
        
        switch (distribution) {
            case 'random':
                for (let i = 0; i < size; i++) {
                    array.push(Math.floor(Math.random() * size) + 1);
                }
                break;
                
            case 'nearly-sorted':
                for (let i = 0; i < size; i++) {
                    array.push(i + 1);
                }
                // Swap a few elements to make it nearly sorted
                const swaps = Math.floor(size * 0.1);
                for (let i = 0; i < swaps; i++) {
                    const idx1 = Math.floor(Math.random() * size);
                    const idx2 = Math.floor(Math.random() * size);
                    [array[idx1], array[idx2]] = [array[idx2], array[idx1]];
                }
                break;
                
            case 'reversed':
                for (let i = 0; i < size; i++) {
                    array.push(size - i);
                }
                break;
                
            case 'few-unique':
                for (let i = 0; i < size; i++) {
                    array.push(Math.floor(Math.random() * 5) + 1);
                }
                break;
                
            default:
                for (let i = 0; i < size; i++) {
                    array.push(Math.floor(Math.random() * size) + 1);
                }
        }
        
        return array;
    }
    
    /**
     * Start the sorting process with the selected algorithm
     * @param {string} algorithmName - Name of the algorithm to use
     */
    startSorting(algorithmName) {
        if (this.sortingState.inProgress && !this.sortingState.paused) {
            return; // Already in progress
        }
        
        if (this.sortingState.completed) {
            this.array = [...this.originalArray]; // Reset array
            this.resetMetrics();
        }
        
        this.currentAlgorithm = algorithmName;
        this.sortingState.inProgress = true;
        this.sortingState.paused = false;
        this.sortingState.completed = false;
        this.sortingState.stepMode = false;
        
        this.metrics.startTime = performance.now();
        
        // Start the worker
        this.initializeWorker(algorithmName);
    }
    
    /**
     * Initialize a Web Worker for the sorting algorithm
     * @param {string} algorithmName - Name of the algorithm to use
     */
    initializeWorker(algorithmName) {
        // Terminate any existing worker
        if (this.worker) {
            this.worker.terminate();
        }
        
        // Create a new worker
        this.worker = new Worker('js/algorithms/algorithmWorker.js');
        
        // Set up event listeners for worker messages
        this.worker.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'array_update':
                    this.array = data.array;
                    if (this.callbacks.onArrayUpdate) {
                        this.callbacks.onArrayUpdate(this.array, data.indices);
                    }
                    break;
                    
                case 'metrics_update':
                    this.metrics.comparisons = data.comparisons;
                    this.metrics.swaps = data.swaps;
                    this.metrics.accesses = data.accesses;
                    if (this.callbacks.onMetricsUpdate) {
                        this.callbacks.onMetricsUpdate(this.metrics);
                    }
                    break;
                    
                case 'operation_update':
                    if (this.callbacks.onOperationUpdate) {
                        this.callbacks.onOperationUpdate(data.operation, data.details);
                    }
                    break;
                    
                case 'sorting_complete':
                    this.sortingState.inProgress = false;
                    this.sortingState.completed = true;
                    this.metrics.endTime = performance.now();
                    if (this.callbacks.onSortingComplete) {
                        this.callbacks.onSortingComplete(this.metrics);
                    }
                    break;
            }
        };
        
        // Start the sorting process in the worker
        this.worker.postMessage({
            type: 'start_sorting',
            data: {
                algorithm: algorithmName,
                array: this.array,
                speed: this.animationSpeed,
                stepMode: this.sortingState.stepMode
            }
        });
    }
    
    /**
     * Pause the sorting process
     */
    pauseSorting() {
        if (!this.sortingState.inProgress || this.sortingState.paused) {
            return;
        }
        
        this.sortingState.paused = true;
        if (this.worker) {
            this.worker.postMessage({
                type: 'pause_sorting'
            });
        }
    }
    
    /**
     * Resume the sorting process
     */
    resumeSorting() {
        if (!this.sortingState.inProgress || !this.sortingState.paused) {
            return;
        }
        
        this.sortingState.paused = false;
        if (this.worker) {
            this.worker.postMessage({
                type: 'resume_sorting'
            });
        }
    }
    
    /**
     * Stop the sorting process
     */
    stopSorting() {
        if (!this.sortingState.inProgress) {
            return;
        }
        
        this.sortingState.inProgress = false;
        this.sortingState.paused = false;
        
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        // Reset the array to its original state
        this.array = [...this.originalArray];
        if (this.callbacks.onArrayUpdate) {
            this.callbacks.onArrayUpdate(this.array);
        }
    }
    
    /**
     * Enable step-by-step mode
     */
    enableStepMode() {
        this.sortingState.stepMode = true;
        if (this.worker) {
            this.worker.postMessage({
                type: 'enable_step_mode'
            });
        }
    }
    
    /**
     * Execute a single step in step-by-step mode
     */
    executeStep() {
        if (!this.sortingState.inProgress || !this.sortingState.stepMode) {
            return;
        }
        
        if (this.worker) {
            this.worker.postMessage({
                type: 'execute_step'
            });
        }
    }
    
    /**
     * Set animation speed
     * @param {number} speed - Speed value from 1-100
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        if (this.worker) {
            this.worker.postMessage({
                type: 'set_speed',
                data: { speed }
            });
        }
    }
    
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            comparisons: 0,
            swaps: 0,
            accesses: 0,
            startTime: 0,
            endTime: 0
        };
        
        if (this.callbacks.onMetricsUpdate) {
            this.callbacks.onMetricsUpdate(this.metrics);
        }
    }
    
    /**
     * Register callback functions
     * @param {Object} callbacks - Object containing callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SortingEngine;
} 