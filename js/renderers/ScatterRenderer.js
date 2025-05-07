/**
 * ScatterRenderer.js
 * Renders the array as a scatter plot
 */
class ScatterRenderer {
    /**
     * Initialize the scatter plot renderer
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
            point: '#3498db',
            active: '#e74c3c',
            sorted: '#2ecc71',
            text: '#333333',
            gridLines: '#dddddd'
        };
        
        this.pointRadius = 6;
        this.padding = 40; // Padding from edges
        
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
     * Render the array as a scatter plot
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
        
        // Draw grid and axes
        this.drawGrid();
        
        // Calculate the plotting area
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        // Draw each point
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            
            // Scale coordinates to fit within the plotting area
            const x = this.padding + (i / (array.length - 1 || 1)) * plotWidth;
            const y = this.height - this.padding - (value / (maxValue || 1)) * plotHeight;
            
            // Determine the color based on the element state
            if (activeIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.active;
            } else if (sortedIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.sorted;
            } else {
                // Use a gradient color based on the index position
                const hue = 210 + (i / (array.length - 1 || 1)) * 60;
                this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            }
            
            // Draw the point
            this.drawPoint(x, y, this.pointRadius);
            
            // Draw value text for smaller arrays
            if (array.length <= 50) {
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x, y - 10);
            }
        }
        
        // Draw connecting lines to show the order
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < array.length; i++) {
            const x = this.padding + (i / (array.length - 1 || 1)) * plotWidth;
            const y = this.height - this.padding - (array[i] / (maxValue || 1)) * plotHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    /**
     * Draw a grid and axes
     */
    drawGrid() {
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        // Draw background grid
        this.ctx.strokeStyle = this.colorScheme.gridLines;
        this.ctx.lineWidth = 0.5;
        
        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = this.padding + (i / 10) * plotWidth;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.padding);
            this.ctx.lineTo(x, this.height - this.padding);
            this.ctx.stroke();
            
            // Draw x-axis labels
            if (this.array.length > 0 && i % 2 === 0) {
                const indexValue = Math.floor((i / 10) * (this.array.length - 1));
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(indexValue.toString(), x, this.height - this.padding + 15);
            }
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 10; i++) {
            const y = this.height - this.padding - (i / 10) * plotHeight;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, y);
            this.ctx.lineTo(this.width - this.padding, y);
            this.ctx.stroke();
            
            // Draw y-axis labels
            if (this.maxValue > 0) {
                const valueLabel = Math.round((i / 10) * this.maxValue);
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(valueLabel.toString(), this.padding - 5, y + 3);
            }
        }
        
        // Draw axes with darker lines
        this.ctx.strokeStyle = this.colorScheme.text;
        this.ctx.lineWidth = 1;
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.height - this.padding);
        this.ctx.lineTo(this.width - this.padding, this.height - this.padding);
        this.ctx.stroke();
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.height - this.padding);
        this.ctx.lineTo(this.padding, this.padding);
        this.ctx.stroke();
        
        // Add axis labels
        this.ctx.fillStyle = this.colorScheme.text;
        this.ctx.font = '12px Arial';
        
        // X-axis label
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Index', this.width / 2, this.height - 10);
        
        // Y-axis label
        this.ctx.save();
        this.ctx.translate(15, this.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Value', 0, 0);
        this.ctx.restore();
    }
    
    /**
     * Draw a point at the specified coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Point radius
     */
    drawPoint(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a white border for better visibility
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
        const duration = 500; // Animation duration in ms
        
        // Save original array values
        const value1 = this.array[index1];
        const value2 = this.array[index2];
        
        // Calculate positions
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        const x1 = this.padding + (index1 / (this.array.length - 1 || 1)) * plotWidth;
        const y1 = this.height - this.padding - (value1 / (this.maxValue || 1)) * plotHeight;
        
        const x2 = this.padding + (index2 / (this.array.length - 1 || 1)) * plotWidth;
        const y2 = this.height - this.padding - (value2 / (this.maxValue || 1)) * plotHeight;
        
        // Temporarily set active indices
        const originalActiveIndices = [...this.activeIndices];
        this.activeIndices = [index1, index2];
        
        // Animation function
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Create a temporary copy of the array for animation
            const tempArray = [...this.array];
            
            if (index1 !== index2) {
                // Interpolate the values for the animation
                tempArray[index1] = value1 + (value2 - value1) * progress;
                tempArray[index2] = value2 + (value1 - value2) * progress;
            }
            
            // Render the current state
            this.render(tempArray, this.maxValue, this.activeIndices, this.sortedIndices);
            
            // Draw animation path
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 2;
            
            // Draw path from point 1 to point 2
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.bezierCurveTo(
                x1, y1 - 50,
                x2, y2 - 50,
                x2, y2
            );
            this.ctx.stroke();
            
            // Draw animation marker on the path
            const t = progress;
            // Bezier curve formula for position
            const cx = (1 - t) * (1 - t) * (1 - t) * x1 + 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t * x2;
            const cy = (1 - t) * (1 - t) * (1 - t) * y1 + 3 * (1 - t) * (1 - t) * t * (y1 - 50) + 3 * (1 - t) * t * t * (y2 - 50) + t * t * t * y2;
            
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
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
     * @param {string} effectType - Type of effect
     * @param {Object} params - Parameters for the effect
     */
    applyEffect(effectType, params = {}) {
        switch (effectType) {
            case 'highlight':
                this.highlightPoints(params.indices);
                break;
                
            case 'connections':
                this.showConnections(params.indices);
                break;
                
            default:
                console.warn(`Unknown effect type for scatter renderer: ${effectType}`);
        }
    }
    
    /**
     * Highlight points with a pulsing effect
     * @param {Array<number>} indices - Indices to highlight
     */
    highlightPoints(indices = []) {
        if (!indices.length) return;
        
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        const startTime = performance.now();
        const duration = 1000; // Effect duration in ms
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate pulse size and opacity
            const pulseSize = 10 + Math.sin(progress * Math.PI) * 10;
            const opacity = 0.7 * (1 - progress);
            
            // Clear and redraw the base visualization
            this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
            
            // Draw highlight for each index
            indices.forEach(index => {
                const x = this.padding + (index / (this.array.length - 1 || 1)) * plotWidth;
                const y = this.height - this.padding - (this.array[index] / (this.maxValue || 1)) * plotHeight;
                
                // Draw pulsing circle
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
                this.ctx.fill();
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Show connections between points
     * @param {Array<number>} indices - Indices to connect
     */
    showConnections(indices = []) {
        if (indices.length < 2) return;
        
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        // Render the base visualization
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        
        // Draw connections between points
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        // Start at the first point
        const firstIndex = indices[0];
        const firstX = this.padding + (firstIndex / (this.array.length - 1 || 1)) * plotWidth;
        const firstY = this.height - this.padding - (this.array[firstIndex] / (this.maxValue || 1)) * plotHeight;
        
        this.ctx.moveTo(firstX, firstY);
        
        // Connect to each subsequent point
        for (let i = 1; i < indices.length; i++) {
            const index = indices[i];
            const x = this.padding + (index / (this.array.length - 1 || 1)) * plotWidth;
            const y = this.height - this.padding - (this.array[index] / (this.maxValue || 1)) * plotHeight;
            
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.stroke();
        
        // Highlight the connection points
        indices.forEach(index => {
            const x = this.padding + (index / (this.array.length - 1 || 1)) * plotWidth;
            const y = this.height - this.padding - (this.array[index] / (this.maxValue || 1)) * plotHeight;
            
            // Draw a highlighted point
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.pointRadius * 1.5, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }
    
    /**
     * Show a heatmap visualization
     * @param {Array<number>} data - Data for the heatmap (e.g., access counts)
     * @param {string} type - Type of heatmap
     */
    showHeatmap(data, type = 'access') {
        if (!data || data.length !== this.array.length) {
            console.error('Heatmap data must have the same length as the array');
            return;
        }
        
        // Find the maximum value in the data
        const maxData = Math.max(...data);
        
        // Render the base visualization
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        
        // Draw heatmap indicators
        const plotWidth = this.width - 2 * this.padding;
        const plotHeight = this.height - 2 * this.padding;
        
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            if (value === 0) continue; // Skip if no data
            
            const normalizedValue = value / (maxData || 1);
            const x = this.padding + (i / (this.array.length - 1 || 1)) * plotWidth;
            const y = this.height - this.padding - (this.array[i] / (this.maxValue || 1)) * plotHeight;
            
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
            
            // Draw heat indicator
            const heatRadius = this.pointRadius * 2 + normalizedValue * 10;
            this.ctx.beginPath();
            this.ctx.arc(x, y, heatRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            
            // Add value text if not too many points
            if (this.array.length <= 50) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '9px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x, y);
            }
        }
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
    module.exports = ScatterRenderer;
} 