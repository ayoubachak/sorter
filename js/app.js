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
    
    let currentViewMode = 'bars';
    let isFirstSort = true;
    
    function init() {
        const initialSize = parseInt(arraySizeSlider.value);
        arraySizeValue.textContent = initialSize;
        
        sortingEngine.initialize(initialSize);
        
        registerCallbacks();
        
        generateNewArray();
        
        setupEventListeners();
        
        updateAlgorithmInfo(algorithmSelect.value);
        
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
        
        algorithmSelect.addEventListener('change', () => {
            updateAlgorithmInfo(algorithmSelect.value);
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
                
                viewModeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
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
        sortingEngine.startSorting(algorithm);
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
            sortingEngine.startSorting(algorithm);
            isFirstSort = false;
            
            // Set a slight delay before calling step to ensure the algorithm has started
            setTimeout(() => {
                sortingEngine.executeStep();
                updateUIState();
                // Temporarily disable step button until step completes
                updateStepButtonState(false);
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
    }
    
    function updateAlgorithmInfo(algorithmName) {
        const algorithmInfo = window.ALGORITHM_INFO[algorithmName];
        
        if (algorithmInfo) {
            algorithmDescriptionEl.textContent = algorithmInfo.description;
            bestCaseEl.textContent = algorithmInfo.timeComplexity.best;
            avgCaseEl.textContent = algorithmInfo.timeComplexity.average;
            worstCaseEl.textContent = algorithmInfo.timeComplexity.worst;
            spaceComplexityEl.textContent = algorithmInfo.spaceComplexity;
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
    
    init();
}); 