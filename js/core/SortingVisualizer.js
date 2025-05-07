/**
 * SortingVisualizer.js
 * Manages the visualization of sorting algorithms using different renderers
 */
class SortingVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }
        
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        this.array = [];
        this.maxValue = 0;
        this.activeIndices = [];
        this.sortedIndices = [];
        this.workerColors = [
            '#FF5733', // Red-orange
            '#33A8FF', // Light blue
            '#33FF57', // Light green
            '#A833FF', // Purple
            '#FFD700', // Gold
            '#FF33A8', // Pink
            '#00CED1', // Turquoise
            '#FF8C00', // Dark orange
            '#9ACD32', // Yellow-green
            '#BA55D3', // Medium orchid
            '#20B2AA', // Light sea green
            '#F08080', // Light coral
            '#4682B4', // Steel blue
            '#D2691E', // Chocolate
            '#6A5ACD', // Slate blue
            '#808000'  // Olive
        ];
        
        this.currentRenderer = null;
        this.rendererType = 'bars'; // Default renderer type: 'bars', 'circular', 'scatter', '3d'
        
        this.initialize();
    }
    
    /**
     * Initialize the visualizer
     */
    initialize() {
        // Set up container
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        
        // Create renderer
        this.setRenderer(this.rendererType);
        
        // Handle resize events
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Set the renderer type
     * @param {string} rendererType - Type of renderer to use
     */
    setRenderer(rendererType) {
        // Clean up previous renderer if it exists
        if (this.currentRenderer && typeof this.currentRenderer.cleanup === 'function') {
            this.currentRenderer.cleanup();
        }
        
        this.rendererType = rendererType;
        
        // Create new renderer based on type
        switch (rendererType) {
            case 'bars':
                this.currentRenderer = new BarRenderer(this.container, this.width, this.height);
                break;
                
            case 'circular':
                this.currentRenderer = new CircularRenderer(this.container, this.width, this.height);
                break;
                
            case 'scatter':
                this.currentRenderer = new ScatterRenderer(this.container, this.width, this.height);
                break;
                
            case '3d':
                this.currentRenderer = new ThreeDRenderer(this.container, this.width, this.height);
                break;
                
            default:
                this.currentRenderer = new BarRenderer(this.container, this.width, this.height);
                break;
        }
        
        // Initialize the renderer
        if (this.array.length > 0) {
            this.updateArray(this.array, this.activeIndices, this.sortedIndices);
        }
    }
    
    /**
     * Update the array visualization
     * @param {Array<number>} array - The array to visualize
     * @param {Array<number>} activeIndices - Indices of elements currently being processed
     * @param {Array<number>} sortedIndices - Indices of elements that are already sorted
     * @param {number} workerId - ID of the worker processing these elements (for multi-threading)
     */
    updateArray(array, activeIndices = [], sortedIndices = [], workerId = -1) {
        this.array = array;
        this.maxValue = Math.max(...array);
        this.activeIndices = activeIndices;
        this.sortedIndices = sortedIndices;
        
        if (this.currentRenderer) {
            // If a worker ID is provided, use that worker's color for highlighting
            let highlightColor = undefined;
            if (workerId >= 0 && workerId < this.workerColors.length) {
                highlightColor = this.workerColors[workerId];
            }
            
            this.currentRenderer.render(array, this.maxValue, activeIndices, sortedIndices, highlightColor);
        }
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        if (this.currentRenderer) {
            this.currentRenderer.resize(this.width, this.height);
            this.currentRenderer.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        }
    }
    
    /**
     * Highlight specific elements in the array
     * @param {Array<number>} indices - Indices to highlight
     * @param {string} highlightType - Type of highlight ('active', 'sorted', etc.)
     * @param {number} workerId - ID of the worker to use for color (for multi-threading)
     */
    highlightElements(indices, highlightType = 'active', workerId = -1) {
        if (highlightType === 'active') {
            this.activeIndices = indices;
        } else if (highlightType === 'sorted') {
            this.sortedIndices = indices;
        }
        
        if (this.currentRenderer) {
            // If a worker ID is provided, use that worker's color for highlighting
            let highlightColor = undefined;
            if (workerId >= 0 && workerId < this.workerColors.length) {
                highlightColor = this.workerColors[workerId];
            }
            
            this.currentRenderer.highlight(indices, highlightType, highlightColor);
        }
    }
    
    /**
     * Animate a swap between two elements
     * @param {number} index1 - First index
     * @param {number} index2 - Second index
     * @param {Function} onComplete - Callback to be called when animation completes
     */
    animateSwap(index1, index2, onComplete) {
        if (this.currentRenderer && typeof this.currentRenderer.animateSwap === 'function') {
            this.currentRenderer.animateSwap(index1, index2, () => {
                // Update our internal array after the animation
                [this.array[index1], this.array[index2]] = [this.array[index2], this.array[index1]];
                
                if (onComplete) {
                    onComplete();
                }
            });
        } else {
            // If the renderer doesn't support animation, just update the array
            [this.array[index1], this.array[index2]] = [this.array[index2], this.array[index1]];
            this.updateArray(this.array, this.activeIndices, this.sortedIndices);
            
            if (onComplete) {
                onComplete();
            }
        }
    }
    
    /**
     * Apply visual effects to the visualization
     * @param {string} effectType - Type of effect to apply
     * @param {Object} params - Parameters for the effect
     */
    applyEffect(effectType, params = {}) {
        if (this.currentRenderer && typeof this.currentRenderer.applyEffect === 'function') {
            this.currentRenderer.applyEffect(effectType, params);
        }
    }
    
    /**
     * Set a color scheme for the visualization
     * @param {Object} colorScheme - Colors to use for visualization
     */
    setColorScheme(colorScheme) {
        if (this.currentRenderer && typeof this.currentRenderer.setColorScheme === 'function') {
            this.currentRenderer.setColorScheme(colorScheme);
            this.currentRenderer.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        }
    }
    
    /**
     * Show access frequency heatmap
     * @param {Array<number>} accessCounts - Array containing access count for each index
     */
    showAccessHeatmap(accessCounts) {
        if (this.currentRenderer && typeof this.currentRenderer.showHeatmap === 'function') {
            this.currentRenderer.showHeatmap(accessCounts, 'access');
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        if (this.currentRenderer && typeof this.currentRenderer.cleanup === 'function') {
            this.currentRenderer.cleanup();
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SortingVisualizer;
} 