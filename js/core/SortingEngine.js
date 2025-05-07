/**
 * SortingEngine.js
 * Core engine that manages the sorting process, state, and dispatches visualization updates
 */
class SortingEngine {
    constructor() {
        this.array = [];
        this.originalArray = [];
        
        // Simplified state model with clear states
        this.state = {
            status: 'idle', // 'idle', 'running', 'paused', 'stepping', 'completed'
            stepPending: false
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
        this.soundManager = new SoundManager(); // Initialize the sound manager
        this.callbacks = {
            onArrayUpdate: null,
            onMetricsUpdate: null,
            onOperationUpdate: null,
            onSortingComplete: null,
            onStepComplete: null
        };
    }
    
    /**
     * Initialize the engine with a new array
     * @param {number} size - Size of the array to generate
     * @param {string} distribution - Distribution type ('random', 'nearly-sorted', 'reversed', etc.)
     */
    initialize(size, distribution = 'random') {
        this.resetMetrics();
        this.state.status = 'idle';
        this.state.stepPending = false;
        
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
     * @param {boolean} startInStepMode - Whether to start in step mode
     */
    startSorting(algorithmName, startInStepMode = false) {
        if (this.state.status === 'running') {
            return; // Already running
        }
        
        if (this.state.status === 'completed') {
            this.array = [...this.originalArray]; // Reset array
            this.resetMetrics();
        }
        
        this.currentAlgorithm = algorithmName;
        
        // Set appropriate status based on starting mode
        this.state.status = startInStepMode ? 'stepping' : 'running';
        this.metrics.startTime = performance.now();
        
        // Start the worker
        this.initializeWorker(algorithmName, startInStepMode);
        
        // If starting in step mode, signal that we're waiting for a step
        if (startInStepMode) {
            if (this.callbacks.onOperationUpdate) {
                this.callbacks.onOperationUpdate('status', {
                    description: 'Ready for step-by-step execution. Click Step to begin.'
                });
            }
        }
    }
    
    /**
     * Initialize a Web Worker for the sorting algorithm
     * @param {string} algorithmName - Name of the algorithm to use
     * @param {boolean} startInStepMode - Whether to start in step mode
     */
    initializeWorker(algorithmName, startInStepMode = false) {
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
                    
                    // Play sounds based on operation type
                    this.playSoundForOperation(data.operation, data.details);
                    break;
                    
                case 'sorting_complete':
                    this.state.status = 'completed';
                    this.metrics.endTime = performance.now();
                    
                    // Play completion sound
                    this.soundManager.playSound('completed', { volume: 0.6 });
                    
                    if (this.callbacks.onSortingComplete) {
                        this.callbacks.onSortingComplete(this.metrics);
                    }
                    break;
                    
                case 'step_complete':
                    console.log('Engine received step_complete from worker');
                    this.state.stepPending = false;
                    
                    // Log when a step completes
                    console.log('Step completed, state:', this.state.status);
                    
                    if (this.callbacks.onStepComplete) {
                        this.callbacks.onStepComplete();
                    }
                    break;
                    
                case 'awaiting_step':
                    console.log('Engine received awaiting_step from worker');
                    this.state.stepPending = false;
                    break;
            }
        };
        
        // If we're starting in step mode, make sure to set the state
        if (startInStepMode) {
            this.state.status = 'stepping';
            this.state.stepPending = false;
        }
        
        console.log('Initializing worker with step mode:', startInStepMode || this.state.status === 'stepping');
        
        // Start the sorting process in the worker
        this.worker.postMessage({
            type: 'start_sorting',
            data: {
                algorithm: algorithmName,
                array: this.array,
                speed: this.animationSpeed,
                stepMode: startInStepMode || this.state.status === 'stepping'
            }
        });
    }
    
    /**
     * Play sounds based on operation type
     * @param {string} operation - Operation type
     * @param {Object} details - Operation details
     */
    playSoundForOperation(operation, details) {
        if (!this.soundManager.isSoundEnabled()) {
            return;
        }
        
        switch (operation) {
            case 'comparison':
                this.soundManager.playSound('comparison', { 
                    volume: 0.2,
                    // Higher pitch for higher values
                    pitch: details.values && details.values.length === 2 
                        ? 0.8 + Math.max(...details.values) / (this.array.length * 2)
                        : 1
                });
                break;
                
            case 'swap':
                this.soundManager.playSound('swap', {
                    volume: 0.3,
                    // Pitch based on distance between swapped elements
                    pitch: details.indices && details.indices.length === 2
                        ? 0.8 + Math.abs(details.indices[0] - details.indices[1]) / this.array.length
                        : 1
                });
                break;
                
            case 'key-selection':
            case 'insertion':
                this.soundManager.playSound('insertion', {
                    volume: 0.3,
                    pitch: details.value 
                        ? 0.8 + details.value / (Math.max(...this.array) * 1.5)
                        : 1
                });
                break;
                
            case 'pivot-selection':
                this.soundManager.playSound('pivot', {
                    volume: 0.4,
                    pitch: details.value 
                        ? 0.8 + details.value / (Math.max(...this.array) * 1.5)
                        : 1
                });
                break;
        }
    }
    
    /**
     * Pause the sorting process
     */
    pauseSorting() {
        if (this.state.status !== 'running') {
            return;
        }
        
        this.state.status = 'paused';
        if (this.worker) {
            this.worker.postMessage({
                type: 'pause_sorting'
            });
        }
        
        if (this.callbacks.onOperationUpdate) {
            this.callbacks.onOperationUpdate('status', {
                description: 'Sorting paused. Press Resume to continue or Step for step-by-step execution.'
            });
        }
    }
    
    /**
     * Resume the sorting process
     */
    resumeSorting() {
        if (this.state.status !== 'paused' && this.state.status !== 'stepping') {
            return;
        }
        
        // Store previous status for logging
        const wasInStepMode = this.state.status === 'stepping';
        
        this.state.status = 'running';
        this.state.stepPending = false;
        
        if (this.worker) {
            this.worker.postMessage({
                type: 'resume_sorting',
                data: {
                    wasInStepMode: wasInStepMode
                }
            });
        }
        
        if (this.callbacks.onOperationUpdate) {
            this.callbacks.onOperationUpdate('status', {
                description: wasInStepMode ? 
                    'Resumed from step mode to continuous execution.' : 
                    'Sorting resumed.'
            });
        }
    }
    
    /**
     * Stop the sorting process
     */
    stopSorting() {
        if (this.state.status === 'idle' || this.state.status === 'completed') {
            return;
        }
        
        this.state.status = 'idle';
        this.state.stepPending = false;
        
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
     * Switch to step-by-step mode
     */
    enableStepMode() {
        if (this.state.status === 'idle' || this.state.status === 'completed') {
            return;
        }
        
        const previousStatus = this.state.status;
        this.state.status = 'stepping';
        
        if (this.worker) {
            this.worker.postMessage({
                type: 'enable_step_mode',
                data: {
                    previousStatus
                }
            });
            
            // Force state sync - if coming from pause, we need to ensure
            // the first step can be executed immediately
            if (previousStatus === 'paused') {
                setTimeout(() => {
                    if (this.worker) {
                        this.worker.postMessage({
                            type: 'execute_step'
                        });
                    }
                }, 50);
            }
        }
        
        if (this.callbacks.onOperationUpdate) {
            this.callbacks.onOperationUpdate('status', {
                description: previousStatus === 'paused' ?
                    'Switched from pause to step mode. Continue clicking Step to advance one operation at a time.' :
                    'Step mode enabled. Click Step to execute one operation at a time.'
            });
        }
    }
    
    /**
     * Execute a single step in step-by-step mode
     * @returns {boolean} - True if step was executed, false if not possible
     */
    executeStep() {
        if (this.state.status === 'idle' || this.state.status === 'completed') {
            return false;
        }
        
        // If not already in step mode, switch to it (including from paused state)
        if (this.state.status !== 'stepping') {
            this.enableStepMode();
            
            // For paused state we need a delay to ensure worker is ready
            if (this.state.status === 'paused') {
                // Wait a tiny bit for the state to propagate
                setTimeout(() => {
                    if (this.worker) {
                        console.log('Engine sending delayed execute_step');
                        this.worker.postMessage({
                            type: 'execute_step'
                        });
                        this.state.stepPending = true;
                    }
                }, 50);
                return true;
            }
            return true;
        }
        
        // Clear any previous stepPending state to ensure we can execute another step
        // This fixes the issue where steps couldn't be executed consecutively
        this.state.stepPending = false;
        
        // Only execute if we have a worker
        if (this.worker) {
            this.state.stepPending = true;
            
            // Update UI to indicate step is in progress
            if (this.callbacks.onOperationUpdate) {
                this.callbacks.onOperationUpdate('step', {
                    description: 'Executing a single operation...'
                });
            }
            
            // Log step execution for debugging
            console.log('Engine sending step command, status:', this.state.status);
            
            this.worker.postMessage({
                type: 'execute_step'
            });
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if a step is in progress
     * @returns {boolean} - True if a step is currently executing
     */
    isStepPending() {
        return this.state.stepPending;
    }
    
    /**
     * Get the current status of the sorting process
     * @returns {string} - Current status ('idle', 'running', 'paused', 'stepping', 'completed')
     */
    getStatus() {
        return this.state.status;
    }
    
    /**
     * Check if the sorting is currently in progress
     * @returns {boolean} - True if sorting is in progress (running, paused, or stepping)
     */
    isInProgress() {
        return this.state.status === 'running' || 
               this.state.status === 'paused' || 
               this.state.status === 'stepping';
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
     * Toggle sound on/off
     * @returns {boolean} - New sound state
     */
    toggleSound() {
        return this.soundManager.toggleSound();
    }
    
    /**
     * Check if sound is enabled
     * @returns {boolean} - Sound state
     */
    isSoundEnabled() {
        return this.soundManager.isSoundEnabled();
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