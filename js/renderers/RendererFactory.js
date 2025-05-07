/**
 * RendererFactory.js
 * Factory for creating different renderers
 */
class RendererFactory {
    /**
     * Create a renderer instance based on the type
     * @param {string} type - Type of renderer ('bars', 'circular', 'scatter', '3d')
     * @param {HTMLElement} container - Container element
     * @param {number} width - Width of the visualization
     * @param {number} height - Height of the visualization
     * @returns {Object} - The renderer instance
     */
    static createRenderer(type, container, width, height) {
        switch (type) {
            case 'bars':
                return new BarRenderer(container, width, height);
                
            case 'circular':
                return new CircularRenderer(container, width, height);
                
            case 'scatter':
                return new ScatterRenderer(container, width, height);
                
            case '3d':
                return new ThreeDRenderer(container, width, height);
                
            default:
                console.warn(`Unknown renderer type: ${type}. Falling back to bar renderer.`);
                return new BarRenderer(container, width, height);
        }
    }
    
    /**
     * Get all available renderer types
     * @returns {Array<string>} - Array of renderer types
     */
    static getAvailableRenderers() {
        return ['bars', 'circular', 'scatter', '3d'];
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RendererFactory;
} 