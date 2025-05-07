/**
 * AlgorithmWorkerManager.js
 * Manages the communication with sorting algorithm workers
 */
class AlgorithmWorkerManager {
    constructor() {
        this.workers = {};
        this.activeWorker = null;
        this.callbacks = {
            onArrayUpdate: null,
            onMetricsUpdate: null,
            onOperationUpdate: null,
            onSortingComplete: null
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
                        this.callbacks.onArrayUpdate(data.array, data.indices);
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
            }
        };
        
        worker.onerror = (error) => {
            console.error(`Error in ${algorithmName} worker:`, error);
        };
        
        this.workers[algorithmName] = worker;
    }
    
    /**
     * Start sorting with the specified algorithm
     * @param {string} algorithmName - Name of the algorithm to use
     * @param {Array<number>} array - The array to sort
     * @param {number} speed - Animation speed (1-100)
     * @param {boolean} stepMode - Whether to use step-by-step mode
     */
    startSorting(algorithmName, array, speed, stepMode = false) {
        if (!this.workers[algorithmName]) {
            this.initializeWorker(algorithmName);
        }
        
        this.activeWorker = this.workers[algorithmName];
        
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
    
    /**
     * Pause the active sorting process
     */
    pauseSorting() {
        if (this.activeWorker) {
            this.activeWorker.postMessage({
                type: 'pause_sorting'
            });
        }
    }
    
    /**
     * Resume the active sorting process
     */
    resumeSorting() {
        if (this.activeWorker) {
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
            this.activeWorker.postMessage({
                type: 'stop_sorting'
            });
        }
    }
    
    /**
     * Execute a single step in step-by-step mode
     */
    executeStep() {
        if (this.activeWorker) {
            this.activeWorker.postMessage({
                type: 'execute_step'
            });
        }
    }
    
    /**
     * Set the animation speed
     * @param {number} speed - Speed value (1-100)
     */
    setAnimationSpeed(speed) {
        if (this.activeWorker) {
            this.activeWorker.postMessage({
                type: 'set_speed',
                data: {
                    speed
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
        Object.values(this.workers).forEach(worker => {
            worker.terminate();
        });
        
        this.workers = {};
        this.activeWorker = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlgorithmWorkerManager;
} 