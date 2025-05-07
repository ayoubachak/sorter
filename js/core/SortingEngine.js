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
        this.workers = []; // Array to hold multiple workers for multi-threading
        this.useMultiThreading = false;
        this.threadCount = 1;
        this.animationSpeed = 50; // 1-100
        this.workerDelay = 200; // Default delay for worker operations in ms
        this.highlightWorkers = true; // Whether to highlight which worker is processing which elements
        this.soundManager = new SoundManager(); // Initialize the sound manager
        this.callbacks = {
            onArrayUpdate: null,
            onMetricsUpdate: null,
            onOperationUpdate: null,
            onSortingComplete: null,
            onStepComplete: null,
            onResetWorkerVisualizations: null
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
        
        // Reset any worker visualizations 
        if (this.callbacks.onResetWorkerVisualizations) {
            this.callbacks.onResetWorkerVisualizations();
        }
        
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
     * @param {boolean} useMultiThreading - Whether to use multi-threading
     * @param {number} threadCount - Number of worker threads to use
     */
    startSorting(algorithmName, startInStepMode = false, useMultiThreading = false, threadCount = 1) {
        if (this.state.status === 'running') {
            return; // Already running
        }
        
        // Completely reset state from previous sorting, even if already completed
        this.array = [...this.originalArray]; // Reset array
        this.resetMetrics();
        
        // Reset any worker visualizations from previous sorting
        if (this.callbacks.onResetWorkerVisualizations) {
            this.callbacks.onResetWorkerVisualizations();
        }
        
        // Explicitly notify that we're starting fresh with no sorted indices
        if (this.callbacks.onArrayUpdate) {
            this.callbacks.onArrayUpdate(this.array, [], [], -1, false, null);
        }
        
        this.currentAlgorithm = algorithmName;
        this.useMultiThreading = useMultiThreading;
        this.threadCount = Math.max(1, threadCount);
        
        // Multi-threading is not compatible with step mode
        if (startInStepMode) {
            this.useMultiThreading = false;
            this.threadCount = 1;
        }
        
        // Set appropriate status based on starting mode
        this.state.status = startInStepMode ? 'stepping' : 'running';
        this.metrics.startTime = performance.now();
        
        // Notify about multi-threading if enabled
        if (this.useMultiThreading && this.callbacks.onOperationUpdate) {
            this.callbacks.onOperationUpdate('multi-threading', {
                description: `Using multi-threaded execution with ${this.threadCount} workers.`
            });
        }
        
        // Start the worker(s)
        if (this.useMultiThreading) {
            this.initializeMultiThreadedSorting(algorithmName);
        } else {
            this.initializeWorker(algorithmName, startInStepMode);
        }
        
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
        
        // Ensure fresh array copy before starting
        this.array = [...this.originalArray];
        
        // Create a new worker
        this.worker = new Worker('js/algorithms/algorithmWorker.js');
        
        // Set up event listeners for worker messages
        this.worker.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'array_update':
                    this.array = data.array;
                    if (this.callbacks.onArrayUpdate) {
                        this.callbacks.onArrayUpdate(this.array, data.indices, data.workerId);
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
                    // Add workerId to operation details if available for sound effects
                    if (data.workerId !== undefined && data.details) {
                        data.details.workerId = data.workerId;
                    }
                    
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
                    // Also play a completion chord for an enhanced finale
                    this.soundManager.playChord('completion', { volume: 0.4 });
                    
                    // Reset worker visualizations to clean up the UI
                    if (this.callbacks.onResetWorkerVisualizations) {
                        this.callbacks.onResetWorkerVisualizations();
                    }
                    
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
                stepMode: startInStepMode || this.state.status === 'stepping',
                useMultiThreading: false,
                threadCount: 1
            }
        });
    }
    
    /**
     * Initialize multiple workers for multi-threaded sorting
     * @param {string} algorithmName - Name of the algorithm to use
     */
    initializeMultiThreadedSorting(algorithmName) {
        // Terminate any existing workers
        this.terminateAllWorkers();
        
        try {
            console.log('Starting multi-threaded sorting with', this.threadCount, 'threads');
            
            // Create the main coordinator worker
            this.worker = new Worker('./js/algorithms/multiThreadedWorker.js');
            
            // Set up event listeners for worker messages (similar to single-threaded)
            this.worker.onmessage = (event) => {
                const { type, data } = event.data;
                
                switch (type) {
                    case 'array_update':
                        this.array = data.array;
                        if (this.callbacks.onArrayUpdate) {
                            // Pass worker ID for highlighting if available
                            this.callbacks.onArrayUpdate(this.array, data.indices, data.workerId);
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
                        // Add workerId to operation details if available for sound effects
                        if (data.workerId !== undefined && data.details) {
                            data.details.workerId = data.workerId;
                        }
                        
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
                        // Also play a completion chord for an enhanced finale
                        this.soundManager.playChord('completion', { volume: 0.4 });
                        
                        // Reset worker visualizations to clean up the UI
                        if (this.callbacks.onResetWorkerVisualizations) {
                            this.callbacks.onResetWorkerVisualizations();
                        }
                        
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
                    
                    case 'worker_visual_update':
                        // Update visualization for a specific worker without changing the array
                        if (this.callbacks.onArrayUpdate && this.highlightWorkers) {
                            // Pass worker stats if they exist
                            const workerStats = data.stats || null;
                            const isMergeOperation = data.mergeOperation || false;
                            
                            // If an array is provided with this update, use it
                            const arrayToUpdate = data.array || this.array;
                            
                            this.callbacks.onArrayUpdate(
                                arrayToUpdate, 
                                data.indices, 
                                data.workerId, 
                                isMergeOperation,
                                workerStats
                            );
                        }
                        break;
                    
                    case 'progress':
                        // Progress updates from individual workers in multi-threaded mode
                        if (this.callbacks.onArrayUpdate && this.highlightWorkers) {
                            // Handle progress updates as visual updates
                            const workerStats = data.stats || null;
                            const isMergeOperation = data.mergeOperation || false;
                            
                            this.callbacks.onArrayUpdate(
                                data.array || this.array, 
                                data.activeIndices || [], 
                                data.workerId, 
                                isMergeOperation,
                                workerStats
                            );
                        }
                        
                        // Also update metrics based on worker reports
                        if (data.metrics && this.callbacks.onMetricsUpdate) {
                            // In multi-threaded mode, we need to combine metrics from all workers
                            this.metrics.comparisons += data.metrics.comparisons || 0;
                            this.metrics.swaps += data.metrics.swaps || 0;
                            this.metrics.accesses += data.metrics.accesses || 0;
                            
                            this.callbacks.onMetricsUpdate(this.metrics);
                        }
                        break;
                    
                    case 'error':
                        console.error('Worker error:', data.message);
                        if (this.callbacks.onOperationUpdate) {
                            this.callbacks.onOperationUpdate('error', {
                                description: `Error in worker: ${data.message}`
                            });
                        }
                        break;
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                if (this.callbacks.onOperationUpdate) {
                    this.callbacks.onOperationUpdate('error', {
                        description: `Worker error: ${error.message}`
                    });
                }
            };
            
            console.log('Initializing multi-threaded sorting with', this.threadCount, 'threads');
            
            // Start the coordinator worker with additional parameters
            this.worker.postMessage({
                type: 'start_multi_threaded_sorting',
                data: {
                    algorithm: algorithmName,
                    array: [...this.array],
                    speed: this.animationSpeed,
                    threadCount: this.threadCount,
                    workerDelay: this.workerDelay,
                    highlightWorkers: this.highlightWorkers
                }
            });
        } catch (error) {
            console.error('Error initializing multi-threaded sorting:', error);
            if (this.callbacks.onOperationUpdate) {
                this.callbacks.onOperationUpdate('error', {
                    description: `Failed to initialize multi-threaded sorting: ${error.message}`
                });
            }
            
            // Fall back to single-threaded mode
            this.useMultiThreading = false;
            this.initializeWorker(algorithmName);
        }
    }
    
    /**
     * Terminate all active workers
     */
    terminateAllWorkers() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.workers.forEach(worker => {
            if (worker) {
                worker.terminate();
            }
        });
        
        this.workers = [];
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
        
        // Check if this is a worker-specific operation in multi-threading mode
        const workerId = details && details.workerId;
        
        if (this.useMultiThreading && workerId !== undefined) {
            // Use worker-specific sounds to create a multi-threaded "orchestra"
            this.soundManager.playWorkerSound(workerId, operation, {
                volume: 0.2,
                duration: 0.08
            });
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
                
            // Quick Sort Operations
            case 'pivot':
            case 'pivot-selection':
                this.soundManager.playSound('pivot', {
                    volume: 0.4,
                    pitch: details.value 
                        ? 0.8 + details.value / (Math.max(...this.array) * 1.5)
                        : 1
                });
                break;
                
            case 'partition':
                // Use a mix of sounds for partition operation
                this.soundManager.playTone(350, 0.1, 0.2);
                break;
                
            case 'pivot-placement':
                // Important moment in Quick Sort - use distinctive sound
                this.soundManager.playSound('pivot', {
                    volume: 0.4,
                    pitch: 1.2
                });
                break;
                
            case 'partition-complete':
                // Play a success tone when partition is complete
                this.soundManager.playTone(500, 0.2, 0.15);
                break;
                
            // Merge Sort Operations
            case 'split':
                // Play a split sound (high to low)
                this.soundManager.playTone(600, 0.1, 0.15);
                this.soundManager.playTone(400, 0.1, 0.15);
                break;
                
            case 'merge':
                // Play a merge sound (low to high)
                this.soundManager.playTone(300, 0.1, 0.15);
                this.soundManager.playTone(450, 0.1, 0.15);
                break;
                
            case 'merge-comparison':
                // Softer comparison sound for merges
                this.soundManager.playSound('comparison', { 
                    volume: 0.15,
                    pitch: 1.2
                });
                break;
                
            case 'merge-place':
                // Soft placing sound
                this.soundManager.playTone(550, 0.05, 0.1);
                break;
                
            case 'merge-complete':
                // Play a success tone when merge is complete
                this.soundManager.playTone(600, 0.15, 0.15);
                break;
                
            // Heap Sort Operations
            case 'build-heap':
                // Play a building sound
                this.soundManager.playTone(300, 0.2, 0.2);
                this.soundManager.playTone(350, 0.2, 0.2);
                this.soundManager.playTone(400, 0.2, 0.2);
                break;
                
            case 'heapify':
                // Heapify operation sound
                this.soundManager.playTone(450, 0.1, 0.2);
                break;
                
            case 'extract-max':
                // Max extraction sound
                this.soundManager.playTone(700, 0.2, 0.25);
                this.soundManager.playTone(500, 0.1, 0.15);
                break;
                
            // Radix/Counting Sort Operations
            case 'digit-extraction':
            case 'counting':
                // Play a digital sound
                if (details.digit !== undefined) {
                    // Use digit value for the sound
                    this.soundManager.playTone(400 + details.digit * 50, 0.05, 0.15);
                } else {
                    this.soundManager.playTone(450, 0.05, 0.15);
                }
                break;
                
            case 'bucket-placement':
            case 'placement':
                // Sound for placing an element in a bucket
                this.soundManager.playTone(600, 0.05, 0.12);
                break;
                
            // Shell Sort Operations
            case 'gap-change':
                // Sound for changing the gap
                if (details.gap) {
                    // Use gap size for pitch (smaller gap = higher pitch)
                    const pitch = 1.5 - (details.gap / this.array.length);
                    this.soundManager.playSound('pivot', {
                        volume: 0.3,
                        pitch: Math.max(0.8, Math.min(1.5, pitch))
                    });
                }
                break;
                
            // Generic Operations
            case 'shift':
                // Element shifting sound
                this.soundManager.playTone(400, 0.05, 0.1);
                break;
                
            case 'copy-back':
                // Very soft sound for copying back
                if (details.index % 5 === 0) { // Only play occasionally to avoid sound overload
                    this.soundManager.playTone(350, 0.02, 0.05);
                }
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
        
        // Terminate all workers
        this.terminateAllWorkers();
        
        // Reset the array to its original state
        this.array = [...this.originalArray];
        
        // Reset worker visualizations
        if (this.callbacks.onResetWorkerVisualizations) {
            this.callbacks.onResetWorkerVisualizations();
        }
        
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
    
    /**
     * Set the delay for worker operations (for multi-threading)
     * @param {number} delay - Delay in milliseconds
     */
    setWorkerDelay(delay) {
        this.workerDelay = delay;
        
        // Update current workers if they exist
        if (this.useMultiThreading && this.worker) {
            this.worker.postMessage({
                type: 'set_worker_delay',
                data: { delay: this.workerDelay }
            });
        }
    }
    
    /**
     * Set whether to highlight worker activity
     * @param {boolean} highlight - Whether to highlight workers
     */
    setHighlightWorkers(highlight) {
        this.highlightWorkers = highlight;
        
        // Update current workers if they exist
        if (this.useMultiThreading && this.worker) {
            this.worker.postMessage({
                type: 'set_highlight_workers',
                data: { highlight: this.highlightWorkers }
            });
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SortingEngine;
} 