/**
 * BarRenderer.js
 * Renders the array as a bar chart
 */
class BarRenderer {
    /**
     * Initialize the bar renderer
     * @param {HTMLElement} container - Container element
     * @param {number} width - Width of the visualization
     * @param {number} height - Height of the visualization
     */
    constructor(container, width, height) {
        this.container = container;
        this.width = width;
        this.height = height;
        
        this.canvas = null;
        this.ctx = null;
        
        this.array = [];
        this.maxValue = 0;
        
        this.activeIndices = [];
        this.sortedIndices = [];
        
        this.colorScheme = {
            background: '#f8f9fa',
            bar: '#3498db',
            active: '#e74c3c',
            sorted: '#2ecc71',
            text: '#333333'
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the renderer
     */
    initialize() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.display = 'block';
        
        this.ctx = this.canvas.getContext('2d');
        
        // Clear any existing content and append the canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        
        // Initial render
        this.clear();
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.colorScheme.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Render the array as bars
     * @param {Array<number>} array - The array to visualize
     * @param {number} maxValue - Maximum value in the array
     * @param {Array<number>} activeIndices - Indices of active elements
     * @param {Array<number>} sortedIndices - Indices of sorted elements
     */
    render(array, maxValue, activeIndices = [], sortedIndices = []) {
        this.array = array;
        this.maxValue = maxValue;
        this.activeIndices = activeIndices;
        this.sortedIndices = sortedIndices;
        
        // Clear the canvas
        this.clear();
        
        const barWidth = this.width / array.length;
        const barHeightMultiplier = this.height / (maxValue || 1);
        
        // Draw each bar
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            const x = i * barWidth;
            const barHeight = value * barHeightMultiplier;
            const y = this.height - barHeight;
            
            // Determine the color based on the element state
            if (activeIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.active;
            } else if (sortedIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.sorted;
            } else {
                // Use a gradient for normal bars based on value
                const normalizedValue = value / (maxValue || 1);
                const hue = 210 + normalizedValue * 60; // Blue to purple gradient
                this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            }
            
            // Draw the bar with a small gap between bars
            this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
            
            // Draw value text for larger arrays
            if (array.length <= 50) {
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
            }
        }
    }
    
    /**
     * Highlight specific elements
     * @param {Array<number>} indices - Indices to highlight
     * @param {string} highlightType - Type of highlight ('active', 'sorted')
     */
    highlight(indices, highlightType = 'active') {
        if (highlightType === 'active') {
            this.activeIndices = indices;
        } else if (highlightType === 'sorted') {
            this.sortedIndices = indices;
        }
        
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
    }
    
    /**
     * Animate a swap between two elements
     * @param {number} index1 - First index
     * @param {number} index2 - Second index
     * @param {Function} onComplete - Callback to execute when animation completes
     */
    animateSwap(index1, index2, onComplete) {
        const startTime = performance.now();
        const duration = 300; // Animation duration in ms
        
        // Save original array values
        const value1 = this.array[index1];
        const value2 = this.array[index2];
        
        // Temporarily set active indices
        const originalActiveIndices = [...this.activeIndices];
        this.activeIndices = [index1, index2];
        
        // Animation function
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Create a temporary copy of the array for animation
            const tempArray = [...this.array];
            
            // Interpolate the values for the animation
            if (index1 !== index2) {
                tempArray[index1] = value1 + (value2 - value1) * progress;
                tempArray[index2] = value2 + (value1 - value2) * progress;
            }
            
            // Render the current state
            this.render(tempArray, this.maxValue, this.activeIndices, this.sortedIndices);
            
            // Continue the animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Update the real array with the swapped values
                this.array[index1] = value2;
                this.array[index2] = value1;
                
                // Restore original active indices
                this.activeIndices = originalActiveIndices;
                
                // Render the final state
                this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
                
                // Call the completion callback
                if (onComplete) {
                    onComplete();
                }
            }
        };
        
        // Start the animation
        requestAnimationFrame(animate);
    }
    
    /**
     * Apply a visual effect to the visualization
     * @param {string} effectType - Type of effect ('heatmap', 'particles', 'trails')
     * @param {Object} params - Parameters for the effect
     */
    applyEffect(effectType, params = {}) {
        switch (effectType) {
            case 'heatmap':
                this.showHeatmap(params.data, params.type);
                break;
                
            case 'particles':
                this.addParticleEffect(params.indices);
                break;
                
            case 'trails':
                this.addMotionTrails(params.indices);
                break;
                
            default:
                console.warn(`Unknown effect type: ${effectType}`);
        }
    }
    
    /**
     * Show a heatmap visualization
     * @param {Array<number>} data - Data for the heatmap (e.g., access counts)
     * @param {string} type - Type of heatmap ('access', 'comparison')
     */
    showHeatmap(data, type = 'access') {
        if (!data || data.length !== this.array.length) {
            console.error('Heatmap data must have the same length as the array');
            return;
        }
        
        // Find the maximum value in the data
        const maxData = Math.max(...data);
        
        // Render the array first
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        
        // Overlay the heatmap
        const barWidth = this.width / this.array.length;
        
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const normalizedValue = value / (maxData || 1);
            
            // Skip if no data
            if (value === 0) continue;
            
            const x = i * barWidth;
            const barHeight = this.array[i] * (this.height / (this.maxValue || 1));
            const y = this.height - barHeight;
            
            // Use a color based on the heatmap type
            let color;
            if (type === 'access') {
                // Red heatmap for access frequency
                color = `rgba(255, 0, 0, ${normalizedValue * 0.7})`;
            } else if (type === 'comparison') {
                // Green heatmap for comparison frequency
                color = `rgba(0, 255, 0, ${normalizedValue * 0.7})`;
            } else {
                color = `rgba(255, 165, 0, ${normalizedValue * 0.7})`; // Orange default
            }
            
            // Draw a semi-transparent overlay
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
            
            // Add a small indicator at the top
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(x + barWidth / 4, y - 10, barWidth / 2, 8);
            
            // Add text if the array is not too large
            if (this.array.length <= 50) {
                this.ctx.fillStyle = 'black';
                this.ctx.font = '8px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x + barWidth / 2, y - 3);
            }
        }
    }
    
    /**
     * Add a particle effect to specific elements
     * @param {Array<number>} indices - Indices to apply the effect to
     */
    addParticleEffect(indices = []) {
        if (!indices.length) return;
        
        const barWidth = this.width / this.array.length;
        
        // For each index, create a small burst of particles
        indices.forEach(index => {
            const value = this.array[index];
            const x = index * barWidth + barWidth / 2;
            const barHeight = value * (this.height / (this.maxValue || 1));
            const y = this.height - barHeight;
            
            // Create particles
            for (let i = 0; i < 10; i++) {
                const size = Math.random() * 4 + 2;
                const speedX = (Math.random() - 0.5) * 4;
                const speedY = -Math.random() * 6 - 2;
                const opacity = Math.random() * 0.5 + 0.5;
                
                // Add particle
                this.createParticle(x, y, size, speedX, speedY, opacity);
            }
        });
    }
    
    /**
     * Create a particle element
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Particle size
     * @param {number} speedX - X velocity
     * @param {number} speedY - Y velocity
     * @param {number} opacity - Initial opacity
     */
    createParticle(x, y, size, speedX, speedY, opacity) {
        const startTime = performance.now();
        const duration = 1000; // Particle lifetime in ms
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate current position
            const currentX = x + speedX * elapsed / 16;
            const currentY = y + speedY * elapsed / 16 + 0.5 * 9.8 * (elapsed / 16) ** 2; // With gravity
            const currentOpacity = opacity * (1 - progress);
            
            // Draw the particle
            this.ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, size * (1 - progress * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
            
            // Continue the animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        // Start the animation
        requestAnimationFrame(animate);
    }
    
    /**
     * Add motion trails to specific elements
     * @param {Array<number>} indices - Indices to apply the effect to
     */
    addMotionTrails(indices = []) {
        if (!indices.length) return;
        
        // Save the current canvas state
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        
        // For each index, add a motion trail
        const barWidth = this.width / this.array.length;
        
        indices.forEach(index => {
            const value = this.array[index];
            const x = index * barWidth;
            const barHeight = value * (this.height / (this.maxValue || 1));
            const y = this.height - barHeight;
            
            // Draw a semi-transparent trail
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(x - 5, y, barWidth + 10, barHeight);
            
            // Draw a glow effect
            const gradient = this.ctx.createRadialGradient(
                x + barWidth / 2, y + barHeight / 2, 0,
                x + barWidth / 2, y + barHeight / 2, barWidth
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - 10, y - 10, barWidth + 20, barHeight + 20);
        });
        
        // Fade out the trail over time
        const startTime = performance.now();
        const duration = 500; // Trail duration in ms
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                // Restore the original image with increasing opacity
                this.ctx.putImageData(imageData, 0, 0);
                requestAnimationFrame(animate);
            }
        };
        
        // Start the animation
        requestAnimationFrame(animate);
    }
    
    /**
     * Set the color scheme for the visualization
     * @param {Object} colorScheme - Colors to use
     */
    setColorScheme(colorScheme) {
        this.colorScheme = { ...this.colorScheme, ...colorScheme };
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
    }
    
    /**
     * Resize the visualization
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Nothing specific to clean up for Canvas-based rendering
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarRenderer;
} 