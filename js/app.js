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
    let stepMode = false;
    
    function init() {
        const initialSize = parseInt(arraySizeSlider.value);
        arraySizeValue.textContent = initialSize;
        
        sortingEngine.initialize(initialSize);
        
        registerCallbacks();
        
        generateNewArray();
        
        setupEventListeners();
        
        updateAlgorithmInfo(algorithmSelect.value);
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
        
        viewModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                changeViewMode(mode);
                
                viewModeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        window.addEventListener('resize', () => {
        });
    }
    
    function generateNewArray() {
        const size = parseInt(arraySizeSlider.value);
        sortingEngine.initialize(size);
    }
    
    function startSorting() {
        const algorithm = algorithmSelect.value;
        
        startSortBtn.disabled = true;
        pauseResumeBtn.disabled = false;
        stopSortBtn.disabled = false;
        generateArrayBtn.disabled = true;
        algorithmSelect.disabled = true;
        
        stepMode = false;
        
        sortingEngine.startSorting(algorithm);
    }
    
    function togglePauseResume() {
        if (sortingEngine.sortingState.paused) {
            sortingEngine.resumeSorting();
            pauseResumeBtn.textContent = 'Pause';
        } else {
            sortingEngine.pauseSorting();
            pauseResumeBtn.textContent = 'Resume';
        }
    }
    
    function stopSorting() {
        sortingEngine.stopSorting();
        
        startSortBtn.disabled = false;
        pauseResumeBtn.disabled = true;
        pauseResumeBtn.textContent = 'Pause';
        stopSortBtn.disabled = true;
        generateArrayBtn.disabled = false;
        algorithmSelect.disabled = false;
    }
    
    function executeStep() {
        if (!sortingEngine.sortingState.inProgress) {
            stepMode = true;
            sortingEngine.enableStepMode();
            
            if (!sortingEngine.sortingState.inProgress) {
                startSorting();
            }
        }
        
        sortingEngine.executeStep();
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
        startSortBtn.disabled = false;
        pauseResumeBtn.disabled = true;
        pauseResumeBtn.textContent = 'Pause';
        stopSortBtn.disabled = true;
        generateArrayBtn.disabled = false;
        algorithmSelect.disabled = false;
        
        const sortedIndices = Array.from({ length: sortingEngine.array.length }, (_, i) => i);
        visualizer.highlightElements(sortedIndices, 'sorted');
        
        currentOperationEl.textContent = 'Sorting completed!';
        
        visualizer.applyEffect('wave');
    }
    
    init();
}); 