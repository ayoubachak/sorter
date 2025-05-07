/**
 * AlgorithmWorkerManager.js
 * Manages the communication with sorting algorithm workers
 */
class AlgorithmWorkerManager {
    constructor() {
        this.workers = {};
        this.activeWorker = null;
        this.multiThreadedWorker = null;
        this.isMultiThreaded = false;
        this.callbacks = {
            onArrayUpdate: null,
            onMetricsUpdate: null,
            onOperationUpdate: null,
            onSortingComplete: null,
            onWorkerVisualUpdate: null,
            onError: null
        };
    }
    
    /**
     * Initialize a worker for a specific algorithm
     * @param {string} algorithmName - The name of the algorithm
     */
    initializeWorker(algorithmName) {
        if (this.workers[algorithmName]) {
            this.workers[algorithmName].terminate();
        }
        
        const worker = new Worker('js/algorithms/algorithmWorker.js');
        
        worker.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'array_update':
                    if (this.callbacks.onArrayUpdate) {
                        // Check if this is a merge operation
                        const isMergeOperation = data.mergeOperation === true;
                        const workerId = data.workerId !== undefined ? data.workerId : null;
                        
                        this.callbacks.onArrayUpdate(
                            data.array, 
                            data.indices,
                            workerId,
                            isMergeOperation
                        );
                    }
                    break;
                    
                case 'worker_visual_update':
                    if (this.callbacks.onWorkerVisualUpdate) {
                        this.callbacks.onWorkerVisualUpdate(data.workerId, data.indices);
                    }
                    break;
                    
                case 'metrics_update':
                    if (this.callbacks.onMetricsUpdate) {
                        this.callbacks.onMetricsUpdate(data);
                    }
                    break;
                    
                case 'operation_update':
                    if (this.callbacks.onOperationUpdate) {
                        this.callbacks.onOperationUpdate(data.operation, data.details);
                    }
                    break;
                    
                case 'sorting_complete':
                    if (this.callbacks.onSortingComplete) {
                        this.callbacks.onSortingComplete();
                    }
                    break;
                    
                case 'error':
                    if (this.callbacks.onError) {
                        this.callbacks.onError(data.message);
                    } else {
                        console.error('Worker error:', data.message);
                    }
                    break;
                    
                case 'awaiting_step':
                    if (this.callbacks.onAwaitingStep) {
                        this.callbacks.onAwaitingStep();
                    }
                    break;
                    
                case 'step_complete':
                    if (this.callbacks.onStepComplete) {
                        this.callbacks.onStepComplete();
                    }
                    break;
            }
        };
        
        worker.onerror = (error) => {
            console.error(`Error in ${algorithmName} worker:`, error);
            if (this.callbacks.onError) {
                this.callbacks.onError(`Error in ${algorithmName} worker: ${error.message}`);
            }
        };
        
        this.workers[algorithmName] = worker;
    }
    
    /**
     * Initialize the multi-threaded worker
     */
    initializeMultiThreadedWorker() {
        if (this.multiThreadedWorker) {
            this.multiThreadedWorker.terminate();
        }
        
        this.multiThreadedWorker = new Worker('js/algorithms/multiThreadedWorker.js');
        
        this.multiThreadedWorker.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'array_update':
                    if (this.callbacks.onArrayUpdate) {
                        // Check if this is a merge operation
                        const isMergeOperation = data.mergeOperation === true;
                        const workerId = data.workerId !== undefined ? data.workerId : null;
                        
                        this.callbacks.onArrayUpdate(
                            data.array, 
                            data.indices,
                            workerId,
                            isMergeOperation
                        );
                    }
                    break;
                    
                case 'worker_visual_update':
                    if (this.callbacks.onWorkerVisualUpdate) {
                        // Check if this update includes array state
                        const array = data.array || null;
                        
                        if (array) {
                            // If array data is included, update the visualization with it
                            this.callbacks.onWorkerVisualUpdate(
                                data.workerId, 
                                data.indices,
                                array
                            );
                        } else {
                            // Otherwise just highlight the indices
                            this.callbacks.onWorkerVisualUpdate(
                                data.workerId, 
                                data.indices
                            );
                        }
                    }
                    break;
                    
                case 'metrics_update':
                    if (this.callbacks.onMetricsUpdate) {
                        this.callbacks.onMetricsUpdate(data);
                    }
                    break;
                    
                case 'operation_update':
                    if (this.callbacks.onOperationUpdate) {
                        this.callbacks.onOperationUpdate(data.operation, data.details);
                    }
                    break;
                    
                case 'sorting_complete':
                    this.isMultiThreaded = false;
                    if (this.callbacks.onSortingComplete) {
                        this.callbacks.onSortingComplete();
                    }
                    break;
                    
                case 'error':
                    if (this.callbacks.onError) {
                        this.callbacks.onError(data.message);
                    } else {
                        console.error('Multi-threaded worker error:', data.message);
                    }
                    break;
            }
        };
        
        this.multiThreadedWorker.onerror = (error) => {
            console.error('Error in multi-threaded worker:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(`Error in multi-threaded worker: ${error.message}`);
            }
        };
    }
    
    /**
     * Start sorting with the specified algorithm
     * @param {string} algorithmName - Name of the algorithm to use
     * @param {Array<number>} array - The array to sort
     * @param {number} speed - Animation speed (1-100)
     * @param {boolean} stepMode - Whether to use step-by-step mode
     * @param {boolean} useMultiThreading - Whether to use multi-threading if available
     * @param {number} threadCount - Number of threads to use if multi-threading
     */
    startSorting(algorithmName, array, speed, stepMode = false, useMultiThreading = false, threadCount = 4) {
        // Check if the algorithm supports multi-threading and if multi-threading is requested
        const supportsMultiThreading = window.supportsMultiThreading && window.supportsMultiThreading(algorithmName);
        
        if (useMultiThreading && supportsMultiThreading) {
            // Use multi-threaded sorting
            this.startMultiThreadedSorting(algorithmName, array, speed, threadCount);
        } else {
            // Use single-threaded sorting
            if (!this.workers[algorithmName]) {
                this.initializeWorker(algorithmName);
            }
            
            this.activeWorker = this.workers[algorithmName];
            this.isMultiThreaded = false;
            
            this.activeWorker.postMessage({
                type: 'start_sorting',
                data: {
                    algorithm: algorithmName,
                    array: [...array], // Clone the array to avoid shared memory issues
                    speed,
                    stepMode
                }
            });
        }
    }
    
    /**
     * Start multi-threaded sorting
     * @param {string} algorithmName - Name of the algorithm
     * @param {Array<number>} array - Array to sort
     * @param {number} speed - Animation speed
     * @param {number} threadCount - Number of threads to use
     */
    startMultiThreadedSorting(algorithmName, array, speed, threadCount = 4) {
        if (!this.multiThreadedWorker) {
            this.initializeMultiThreadedWorker();
        }
        
        this.activeWorker = this.multiThreadedWorker;
        this.isMultiThreaded = true;
        
        // Calculate worker delay based on speed
        const workerDelay = Math.max(10, 1000 / (speed * 0.1));
        
        this.multiThreadedWorker.postMessage({
            type: 'start_multi_threaded_sorting',
            data: {
                algorithm: algorithmName,
                array: [...array], // Clone the array
                threadCount: threadCount,
                speed: speed,
                workerDelay: workerDelay,
                highlightWorkers: true
            }
        });
    }
    
    /**
     * Pause the active sorting process
     */
    pauseSorting() {
        if (this.activeWorker && !this.isMultiThreaded) {
            this.activeWorker.postMessage({
                type: 'pause_sorting'
            });
        }
    }
    
    /**
     * Resume the active sorting process
     */
    resumeSorting() {
        if (this.activeWorker && !this.isMultiThreaded) {
            this.activeWorker.postMessage({
                type: 'resume_sorting'
            });
        }
    }
    
    /**
     * Stop the active sorting process
     */
    stopSorting() {
        if (this.activeWorker) {
            if (this.isMultiThreaded) {
                this.activeWorker.postMessage({
                    type: 'terminate'
                });
                this.isMultiThreaded = false;
            } else {
                this.activeWorker.postMessage({
                    type: 'stop_sorting'
                });
            }
        }
    }
    
    /**
     * Execute a single step in step-by-step mode
     */
    executeStep() {
        if (this.activeWorker && !this.isMultiThreaded) {
            this.activeWorker.postMessage({
                type: 'execute_step'
            });
        }
    }
    
    /**
     * Enable step mode
     */
    enableStepMode() {
        if (this.activeWorker && !this.isMultiThreaded) {
            this.activeWorker.postMessage({
                type: 'enable_step_mode'
            });
        }
    }
    
    /**
     * Set the animation speed
     * @param {number} speed - Speed value (1-100)
     */
    setAnimationSpeed(speed) {
        if (this.activeWorker) {
            if (this.isMultiThreaded) {
                // For multi-threaded worker, convert speed to delay
                const workerDelay = Math.max(10, 1000 / (speed * 0.1));
                this.activeWorker.postMessage({
                    type: 'set_worker_delay',
                    data: {
                        delay: workerDelay
                    }
                });
            } else {
                // For single-threaded worker
                this.activeWorker.postMessage({
                    type: 'set_speed',
                    data: {
                        speed
                    }
                });
            }
        }
    }
    
    /**
     * Set worker highlighting for multi-threaded mode
     * @param {boolean} highlight - Whether to highlight worker activity
     */
    setHighlightWorkers(highlight) {
        if (this.multiThreadedWorker && this.isMultiThreaded) {
            this.multiThreadedWorker.postMessage({
                type: 'set_highlight_workers',
                data: {
                    highlight
                }
            });
        }
    }
    
    /**
     * Register callback functions
     * @param {Object} callbacks - Object containing callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Terminate all workers
     */
    terminateAll() {
        // Terminate regular workers
        Object.values(this.workers).forEach(worker => {
            worker.terminate();
        });
        
        // Terminate multi-threaded worker if it exists
        if (this.multiThreadedWorker) {
            this.multiThreadedWorker.terminate();
        }
        
        this.workers = {};
        this.activeWorker = null;
        this.multiThreadedWorker = null;
        this.isMultiThreaded = false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlgorithmWorkerManager;
} 