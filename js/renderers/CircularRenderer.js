/**
 * CircularRenderer.js
 * Renders the array as a circular visualization
 */
class CircularRenderer {
    /**
     * Initialize the circular renderer
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
            element: '#3498db',
            active: '#e74c3c',
            sorted: '#2ecc71',
            text: '#333333'
        };
        
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.maxRadius = Math.min(this.width, this.height) * 0.4;
        
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
     * Render the array in a circular pattern
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
        
        // Center coordinates
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.maxRadius = Math.min(this.width, this.height) * 0.4;
        
        // Clear the canvas
        this.clear();
        
        // Draw the circular background
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.maxRadius + 20, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.fill();
        
        // Calculate angle between elements
        const angleStep = (Math.PI * 2) / array.length;
        
        // Draw lines from center to each element position
        this.ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < array.length; i++) {
            const angle = i * angleStep;
            const x = this.centerX + Math.cos(angle) * this.maxRadius;
            const y = this.centerY + Math.sin(angle) * this.maxRadius;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
        
        // Draw each element
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            const normalizedValue = value / (maxValue || 1);
            const radius = 5 + normalizedValue * 15; // Element size based on value
            
            const angle = i * angleStep;
            const distance = this.maxRadius;
            
            const x = this.centerX + Math.cos(angle) * distance;
            const y = this.centerY + Math.sin(angle) * distance;
            
            // Determine the color based on the element state
            if (activeIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.active;
            } else if (sortedIndices.includes(i)) {
                this.ctx.fillStyle = this.colorScheme.sorted;
            } else {
                // Use a color based on the value
                const hue = 210 + normalizedValue * 60; // Blue to purple gradient
                this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            }
            
            // Draw the element
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add a value line from center based on element value
            const valueLineLength = normalizedValue * this.maxRadius * 0.8;
            const valueLineX = this.centerX + Math.cos(angle) * valueLineLength;
            const valueLineY = this.centerY + Math.sin(angle) * valueLineLength;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(valueLineX, valueLineY);
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw value text if array is not too large
            if (array.length <= 50) {
                const textX = this.centerX + Math.cos(angle) * (distance + 20);
                const textY = this.centerY + Math.sin(angle) * (distance + 20);
                
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(value.toString(), textX, textY);
            }
        }
        
        // Connect elements with lines to show the order
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        for (let i = 0; i < array.length; i++) {
            const angle = i * angleStep;
            const distance = this.maxRadius;
            
            const x = this.centerX + Math.cos(angle) * distance;
            const y = this.centerY + Math.sin(angle) * distance;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
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
        
        // Calculate angular positions
        const angleStep = (Math.PI * 2) / this.array.length;
        const angle1 = index1 * angleStep;
        const angle2 = index2 * angleStep;
        
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
                // Calculate the current interpolated values
                tempArray[index1] = value1 + (value2 - value1) * progress;
                tempArray[index2] = value2 + (value1 - value2) * progress;
            }
            
            // Render the current state
            this.render(tempArray, this.maxValue, this.activeIndices, this.sortedIndices);
            
            // Draw the animation path
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            // Draw an arc connecting the two positions
            const radius = this.maxRadius + 30;
            const startAngle = angle1;
            const endAngle = angle2;
            
            const controlPointAngle = (startAngle + endAngle) / 2;
            const controlPointDistance = radius * 1.3;
            
            const startX = this.centerX + Math.cos(startAngle) * radius;
            const startY = this.centerY + Math.sin(startAngle) * radius;
            
            const endX = this.centerX + Math.cos(endAngle) * radius;
            const endY = this.centerY + Math.sin(endAngle) * radius;
            
            const controlX = this.centerX + Math.cos(controlPointAngle) * controlPointDistance;
            const controlY = this.centerY + Math.sin(controlPointAngle) * controlPointDistance;
            
            // Draw quadratic curve for animation path
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            this.ctx.stroke();
            
            // Draw animation markers on the path
            const pointX1 = startX + (controlX - startX) * progress * 2 * (progress < 0.5 ? 1 : 0);
            const pointY1 = startY + (controlY - startY) * progress * 2 * (progress < 0.5 ? 1 : 0);
            
            const pointX2 = controlX + (endX - controlX) * (progress - 0.5) * 2 * (progress >= 0.5 ? 1 : 0);
            const pointY2 = controlY + (endY - controlY) * (progress - 0.5) * 2 * (progress >= 0.5 ? 1 : 0);
            
            const currentX = progress < 0.5 ? pointX1 : pointX2;
            const currentY = progress < 0.5 ? pointY1 : pointY2;
            
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
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
            case 'pulse':
                this.addPulseEffect(params.indices);
                break;
                
            case 'glow':
                this.addGlowEffect(params.indices);
                break;
                
            default:
                console.warn(`Unknown effect type for circular renderer: ${effectType}`);
        }
    }
    
    /**
     * Add a pulse effect to specific elements
     * @param {Array<number>} indices - Indices to apply the effect to
     */
    addPulseEffect(indices = []) {
        if (!indices.length) return;
        
        const angleStep = (Math.PI * 2) / this.array.length;
        const startTime = performance.now();
        const duration = 1000; // Effect duration in ms
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Clear and redraw the base visualization
            this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
            
            // Draw pulse circles for each index
            indices.forEach(index => {
                const angle = index * angleStep;
                const x = this.centerX + Math.cos(angle) * this.maxRadius;
                const y = this.centerY + Math.sin(angle) * this.maxRadius;
                
                // Pulse radius increases and then fades
                const pulseRadius = 5 + progress * 30;
                const alpha = 0.7 * (1 - progress);
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.fill();
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Add a glow effect to specific elements
     * @param {Array<number>} indices - Indices to apply the effect to
     */
    addGlowEffect(indices = []) {
        if (!indices.length) return;
        
        const angleStep = (Math.PI * 2) / this.array.length;
        
        // Calculate positions of the glowing elements
        const glowPoints = indices.map(index => {
            const angle = index * angleStep;
            const x = this.centerX + Math.cos(angle) * this.maxRadius;
            const y = this.centerY + Math.sin(angle) * this.maxRadius;
            
            return { x, y, value: this.array[index] };
        });
        
        // Redraw the visualization
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        
        // Add glow to each point
        glowPoints.forEach(point => {
            const normalizedValue = point.value / (this.maxValue || 1);
            const radius = 5 + normalizedValue * 15; // Base element size
            
            // Create a radial gradient for the glow
            const gradient = this.ctx.createRadialGradient(
                point.x, point.y, radius,
                point.x, point.y, radius * 3
            );
            
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            // Draw the glow
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
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
        
        // Calculate angle between elements
        const angleStep = (Math.PI * 2) / this.array.length;
        
        // Render the array first
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
        
        // Draw heat indicators
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const normalizedValue = value / (maxData || 1);
            
            // Skip if no data
            if (value === 0) continue;
            
            const angle = i * angleStep;
            const x = this.centerX + Math.cos(angle) * this.maxRadius;
            const y = this.centerY + Math.sin(angle) * this.maxRadius;
            
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
            
            // Draw a heat circle
            const heatRadius = 8 + normalizedValue * 15;
            this.ctx.beginPath();
            this.ctx.arc(x, y, heatRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            
            // Add a value indicator
            if (this.array.length <= 50) {
                const textX = x + Math.cos(angle) * 10;
                const textY = y + Math.sin(angle) * 10;
                
                this.ctx.fillStyle = 'white';
                this.ctx.font = '8px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(value.toString(), textX, textY);
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
    module.exports = CircularRenderer;
} 