/**
 * app.js
 * Main application file that initializes the Sorting Visualizer
 */

document.addEventListener('DOMContentLoaded', () => {
    const hasWebGL = (function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch(e) {
            return false;
        }
    })();
    
    if (!hasWebGL) {
        console.warn('WebGL not supported. Falling back to Canvas rendering.');
    }
    
    const sortingEngine = new SortingEngine();
    
    const visualizer = new SortingVisualizer('visualizationArea');
    
    const arraySizeSlider = document.getElementById('arraySize');
    const arraySizeValue = document.getElementById('arraySizeValue');
    const animationSpeedSlider = document.getElementById('animationSpeed');
    const algorithmSelect = document.getElementById('algorithmSelect');
    const generateArrayBtn = document.getElementById('generateArrayBtn');
    const startSortBtn = document.getElementById('startSortBtn');
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const stopSortBtn = document.getElementById('stopSortBtn');
    const stepBtn = document.getElementById('stepBtn');
    const viewModeButtons = document.querySelectorAll('.view-mode');
    const soundToggleBtn = document.getElementById('soundToggle');
    const soundToggleText = document.getElementById('soundToggleText');
    const soundOnIcon = document.getElementById('soundOnIcon');
    const soundOffIcon = document.getElementById('soundOffIcon');
    
    const comparisonsEl = document.getElementById('comparisons');
    const swapsEl = document.getElementById('swaps');
    const accessesEl = document.getElementById('accesses');
    const timeElapsedEl = document.getElementById('timeElapsed');
    
    const algorithmDescriptionEl = document.getElementById('algorithmDescription');
    const bestCaseEl = document.getElementById('bestCase');
    const avgCaseEl = document.getElementById('avgCase');
    const worstCaseEl = document.getElementById('worstCase');
    const spaceComplexityEl = document.getElementById('spaceComplexity');
    const currentOperationEl = document.getElementById('currentOperation');
    
    const multiThreadedCheckbox = document.getElementById('multiThreadedCheckbox');
    const threadCountSelect = document.getElementById('threadCount');
    
    // Add advanced speed control elements
    const advancedSpeedControls = document.createElement('div');
    advancedSpeedControls.id = 'advancedSpeedControls';
    advancedSpeedControls.className = 'col-span-3 mt-2 bg-indigo-100 p-2 rounded-lg hidden';
    advancedSpeedControls.innerHTML = `
        <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-semibold">Advanced Speed Control:</label>
            <div class="flex items-center gap-2">
                <span class="text-xs">Slower</span>
                <input type="range" id="workerDelaySlider" min="10" max="2000" value="200" 
                    class="flex-grow h-2 bg-indigo-300 rounded-lg appearance-none cursor-pointer">
                <span class="text-xs">Faster</span>
            </div>
            <div class="text-xs text-gray-600 mt-1">Delay between operations: <span id="workerDelayValue">200</span>ms</div>
        </div>
        <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" id="highlightWorkersCheckbox" checked class="form-checkbox h-4 w-4 text-indigo-600">
            <label for="highlightWorkersCheckbox" class="text-sm text-gray-700">Highlight workers by color</label>
        </div>
    `;
    
    // Insert after thread count container
    const controlGroup = document.querySelector('.control-group:last-child');
    controlGroup.appendChild(advancedSpeedControls);
    
    // New elements for worker delay control
    const workerDelaySlider = document.getElementById('workerDelaySlider');
    const workerDelayValue = document.getElementById('workerDelayValue');
    const highlightWorkersCheckbox = document.getElementById('highlightWorkersCheckbox');
    
    let currentViewMode = 'bars';
    let isFirstSort = true;
    
    function init() {
        const initialSize = parseInt(arraySizeSlider.value);
        arraySizeValue.textContent = initialSize;
        
        sortingEngine.initialize(initialSize);
        
        registerCallbacks();
        
        generateNewArray();
        
        setupEventListeners();
        
        // Initialize algorithm info and multi-threading UI
        const initialAlgorithm = algorithmSelect.value;
        updateAlgorithmInfo(initialAlgorithm);
        updateMultiThreadingUI(initialAlgorithm);
        
        updateSoundToggleUI(sortingEngine.isSoundEnabled());
    }
    
    function registerCallbacks() {
        sortingEngine.registerCallbacks({
            onArrayUpdate: (array, indices) => {
                visualizer.updateArray(array, indices || []);
            },
            onMetricsUpdate: (metrics) => {
                updateMetricsDisplay(metrics);
            },
            onOperationUpdate: (operation, details) => {
                updateOperationDisplay(operation, details);
            },
            onSortingComplete: () => {
                sortingComplete();
            },
            onStepComplete: () => {
                console.log('Step complete callback received');
                updateStepButtonState(true);
                updateUIState();
            }
        });
    }
    
    function setupEventListeners() {
        arraySizeSlider.addEventListener('input', () => {
            const newSize = parseInt(arraySizeSlider.value);
            arraySizeValue.textContent = newSize;
            generateNewArray();
        });
        
        animationSpeedSlider.addEventListener('input', () => {
            const newSpeed = parseInt(animationSpeedSlider.value);
            sortingEngine.setAnimationSpeed(newSpeed);
        });
        
        multiThreadedCheckbox.addEventListener('change', () => {
            threadCountSelect.disabled = !multiThreadedCheckbox.checked;
            advancedSpeedControls.classList.toggle('hidden', !multiThreadedCheckbox.checked);
            updateAlgorithmInfo(algorithmSelect.value);
        });
        
        workerDelaySlider.addEventListener('input', () => {
            const delayValue = workerDelaySlider.value;
            workerDelayValue.textContent = delayValue;
            
            if (sortingEngine) {
                sortingEngine.setWorkerDelay(parseInt(delayValue));
            }
        });
        
        highlightWorkersCheckbox.addEventListener('change', () => {
            if (sortingEngine) {
                sortingEngine.setHighlightWorkers(highlightWorkersCheckbox.checked);
            }
        });
        
        algorithmSelect.addEventListener('change', () => {
            updateAlgorithmInfo(algorithmSelect.value);
            updateMultiThreadingUI(algorithmSelect.value);
        });
        
        generateArrayBtn.addEventListener('click', generateNewArray);
        
        startSortBtn.addEventListener('click', startSorting);
        
        pauseResumeBtn.addEventListener('click', togglePauseResume);
        
        stopSortBtn.addEventListener('click', stopSorting);
        
        stepBtn.addEventListener('click', executeStep);
        
        soundToggleBtn.addEventListener('click', toggleSound);
        
        viewModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                changeViewMode(mode);
            });
        });
    }
    
    function generateNewArray() {
        const size = parseInt(arraySizeSlider.value);
        sortingEngine.initialize(size);
        isFirstSort = true;
        updateUIState();
    }
    
    function startSorting() {
        const algorithm = algorithmSelect.value;
        const useMultiThreading = multiThreadedCheckbox.checked && isAlgorithmMultiThreadable(algorithm);
        const threadCount = useMultiThreading ? parseInt(threadCountSelect.value) : 1;
        
        // Set the worker delay if multi-threading is enabled
        if (useMultiThreading) {
            const workerDelay = parseInt(workerDelaySlider.value);
            sortingEngine.setWorkerDelay(workerDelay);
            sortingEngine.setHighlightWorkers(highlightWorkersCheckbox.checked);
        }
        
        sortingEngine.startSorting(algorithm, false, useMultiThreading, threadCount);
        isFirstSort = false;
        updateUIState();
    }
    
    function togglePauseResume() {
        const status = sortingEngine.getStatus();
        
        if (status === 'paused') {
            sortingEngine.resumeSorting();
        } else if (status === 'stepping') {
            sortingEngine.resumeSorting();
        } else if (status === 'running') {
            sortingEngine.pauseSorting();
        }
        
        updateUIState();
    }
    
    function stopSorting() {
        sortingEngine.stopSorting();
        isFirstSort = true;
        updateUIState();
    }
    
    function executeStep() {
        const status = sortingEngine.getStatus();
        
        // First start case
        if (status === 'idle') {
            const algorithm = algorithmSelect.value;
            console.log('Starting sort in step mode');
            
            // Multi-threading is not compatible with step mode
            const useMultiThreading = false;
            const threadCount = 1;
            
            // Temporarily disable step button until step completes
            updateStepButtonState(false);
            
            // Start the sort in step mode
            sortingEngine.startSorting(algorithm, true, useMultiThreading, threadCount);
            isFirstSort = false;
            
            // Execute the first step right away
            setTimeout(() => {
                sortingEngine.executeStep();
                updateUIState();
            }, 100);
            
            return;
        }
        
        // Execute a step
        const result = sortingEngine.executeStep();
        
        if (result) {
            // If step execution was successful, update button state to disabled
            updateStepButtonState(false);
        }
        
        updateUIState();
    }
    
    function updateStepButtonState(enabled) {
        console.log('Updating step button state:', enabled);
        
        stepBtn.disabled = !enabled;
        
        if (enabled) {
            stepBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-purple-700');
            stepBtn.classList.add('bg-purple-500', 'hover:bg-purple-600');
            stepBtn.textContent = 'Step';
        } else {
            stepBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-purple-700');
            stepBtn.classList.remove('bg-purple-500', 'hover:bg-purple-600');
            stepBtn.textContent = 'Executing...';
        }
    }
    
    function updateUIState() {
        const status = sortingEngine.getStatus();
        const stepPending = sortingEngine.isStepPending();
        
        // Update button states based on current status
        switch (status) {
            case 'idle':
                startSortBtn.disabled = false;
                pauseResumeBtn.disabled = true;
                stopSortBtn.disabled = true;
                stepBtn.disabled = false;
                generateArrayBtn.disabled = false;
                algorithmSelect.disabled = false;
                pauseResumeBtn.textContent = 'Pause';
                break;
                
            case 'running':
                startSortBtn.disabled = true;
                pauseResumeBtn.disabled = false;
                stopSortBtn.disabled = false;
                stepBtn.disabled = false;
                generateArrayBtn.disabled = true;
                algorithmSelect.disabled = true;
                pauseResumeBtn.textContent = 'Pause';
                break;
                
            case 'paused':
                startSortBtn.disabled = true;
                pauseResumeBtn.disabled = false;
                stopSortBtn.disabled = false;
                stepBtn.disabled = false;
                generateArrayBtn.disabled = true;
                algorithmSelect.disabled = true;
                pauseResumeBtn.textContent = 'Resume';
                break;
                
            case 'stepping':
                startSortBtn.disabled = true;
                pauseResumeBtn.disabled = false;
                stopSortBtn.disabled = false;
                stepBtn.disabled = stepPending;
                generateArrayBtn.disabled = true;
                algorithmSelect.disabled = true;
                pauseResumeBtn.textContent = 'Resume';
                break;
                
            case 'completed':
                startSortBtn.disabled = false;
                pauseResumeBtn.disabled = true;
                stopSortBtn.disabled = true;
                stepBtn.disabled = false;
                generateArrayBtn.disabled = false;
                algorithmSelect.disabled = false;
                pauseResumeBtn.textContent = 'Pause';
                break;
        }
    }
    
    function changeViewMode(mode) {
        currentViewMode = mode;
        visualizer.setRenderer(mode);
        
        // Update active button state
        viewModeButtons.forEach(button => {
            const buttonMode = button.getAttribute('data-mode');
            if (buttonMode === mode) {
                button.classList.add('active');
                button.classList.remove('bg-gray-200', 'hover:bg-gray-300');
                button.classList.add('bg-indigo-600', 'text-white');
            } else {
                button.classList.remove('active');
                button.classList.remove('bg-indigo-600', 'text-white');
                button.classList.add('bg-gray-200', 'hover:bg-gray-300');
            }
        });
    }
    
    function updateAlgorithmInfo(algorithmName) {
        const algorithmInfo = window.ALGORITHM_INFO[algorithmName];
        
        if (algorithmInfo) {
            algorithmDescriptionEl.textContent = algorithmInfo.description;
            bestCaseEl.textContent = algorithmInfo.timeComplexity.best;
            avgCaseEl.textContent = algorithmInfo.timeComplexity.average;
            worstCaseEl.textContent = algorithmInfo.timeComplexity.worst;
            spaceComplexityEl.textContent = algorithmInfo.spaceComplexity;
            
            // Update multi-threading UI based on the selected algorithm
            updateMultiThreadingUI(algorithmName);
        }
    }
    
    function updateMetricsDisplay(metrics) {
        comparisonsEl.textContent = metrics.comparisons.toLocaleString();
        swapsEl.textContent = metrics.swaps.toLocaleString();
        accessesEl.textContent = metrics.accesses.toLocaleString();
        
        if (metrics.startTime > 0) {
            const currentTime = performance.now();
            const elapsedTime = (currentTime - metrics.startTime) / 1000;
            timeElapsedEl.textContent = elapsedTime.toFixed(2) + 's';
        } else {
            timeElapsedEl.textContent = '0.00s';
        }
    }
    
    function updateOperationDisplay(operation, details) {
        if (details && details.description) {
            currentOperationEl.textContent = details.description;
        } else {
            currentOperationEl.textContent = `Operation: ${operation}`;
        }
    }
    
    function sortingComplete() {
        isFirstSort = true;
        
        const sortedIndices = Array.from({ length: sortingEngine.array.length }, (_, i) => i);
        visualizer.highlightElements(sortedIndices, 'sorted');
        
        currentOperationEl.textContent = 'Sorting completed!';
        
        visualizer.applyEffect('wave');
        
        updateUIState();
    }
    
    function toggleSound() {
        const soundEnabled = sortingEngine.toggleSound();
        updateSoundToggleUI(soundEnabled);
    }
    
    function updateSoundToggleUI(enabled) {
        if (enabled) {
            soundToggleText.textContent = 'Sound On';
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
            soundToggleBtn.classList.add('bg-indigo-700');
            soundToggleBtn.classList.remove('bg-gray-600');
        } else {
            soundToggleText.textContent = 'Sound Off';
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
            soundToggleBtn.classList.remove('bg-indigo-700');
            soundToggleBtn.classList.add('bg-gray-600');
        }
    }
    
    function updateMultiThreadingUI(algorithmName) {
        const isSupported = window.supportsMultiThreading(algorithmName);
        
        // Enable/disable multi-threading checkbox based on algorithm support
        if (!isSupported) {
            multiThreadedCheckbox.checked = false;
            multiThreadedCheckbox.disabled = true;
            threadCountSelect.disabled = true;
            advancedSpeedControls.classList.add('hidden');
        } else {
            multiThreadedCheckbox.disabled = false;
            threadCountSelect.disabled = !multiThreadedCheckbox.checked;
            advancedSpeedControls.classList.toggle('hidden', !multiThreadedCheckbox.checked);
        }
        
        // Show message about multi-threading support
        const algorithmInfo = window.ALGORITHM_INFO[algorithmName];
        const message = isSupported ? 
            `This algorithm supports multi-threading: ${algorithmInfo.parallelizationStrategy || ''}` : 
            `This algorithm doesn't benefit from multi-threading.`;
        
        currentOperationEl.textContent = message;
    }
    
    function isAlgorithmMultiThreadable(algorithmName) {
        return window.supportsMultiThreading(algorithmName);
    }
    
    init();
}); 