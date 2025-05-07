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
        
        // Store worker-specific indices and colors
        this.workerIndices = {};
        this.workerColors = [
            'rgba(231, 76, 60, 0.9)',   // Red
            'rgba(46, 204, 113, 0.9)',  // Green
            'rgba(52, 152, 219, 0.9)',  // Blue
            'rgba(243, 156, 18, 0.9)',  // Orange
            'rgba(155, 89, 182, 0.9)',  // Purple
            'rgba(26, 188, 156, 0.9)',  // Turquoise
            'rgba(211, 84, 0, 0.9)',    // Pumpkin
            'rgba(52, 73, 94, 0.9)'     // Dark Blue
        ];
        
        // Store highlighted worker for more prominent display
        this.highlightedWorker = null;
        this.highlightTime = 0;
        
        // Store worker statistics and progress
        this.workerStats = {};
        this.workerProgress = {};
        this.workerActivity = {};
        this.workerRegions = {};
        
        this.colorScheme = {
            background: '#f8f9fa',
            bar: '#3498db',
            active: '#e74c3c',
            sorted: '#2ecc71',
            text: '#333333',
            mergeSource: '#f39c12', // Orange
            mergeTarget: '#9b59b6'  // Purple
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
        
        // Set up animation loop for worker highlights
        this.animateWorkerHighlights();
    }
    
    /**
     * Animate worker highlights for better visibility
     */
    animateWorkerHighlights() {
        const animate = () => {
            this.highlightTime = (this.highlightTime + 1) % 100;
            
            // Only re-render if we have active workers
            if (Object.keys(this.workerIndices).length > 0) {
                this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices);
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
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
     * @param {string|number} workerId - ID of the worker (for multi-threading)
     * @param {boolean} mergeOperation - Whether this is a merge operation
     */
    render(array, maxValue, activeIndices = [], sortedIndices = [], workerId = null, mergeOperation = false) {
        this.array = array;
        this.maxValue = maxValue;
        this.activeIndices = activeIndices;
        this.sortedIndices = sortedIndices;
        
        // If this is a worker update, store the indices for that worker
        if (workerId !== null) {
            this.workerIndices[workerId] = activeIndices;
            this.highlightedWorker = workerId; // Highlight this worker temporarily
            
            // Update worker activity timestamp
            this.workerActivity[workerId] = Date.now();
            
            // If we get a new set of indices, try to determine worker's responsible region
            if (activeIndices && activeIndices.length > 0) {
                if (!this.workerRegions[workerId]) {
                    // Make an initial guess at the worker's region based on active indices
                    const minIdx = Math.min(...activeIndices);
                    const maxIdx = Math.max(...activeIndices);
                    
                    // If the range is significant, store it as the worker's region
                    if (maxIdx - minIdx > array.length / 20) {
                        this.workerRegions[workerId] = {
                            start: Math.max(0, minIdx - 5),
                            end: Math.min(array.length - 1, maxIdx + 5)
                        };
                    }
                }
            }
        }
        
        // Clear the canvas
        this.clear();
        
        const barWidth = this.width / array.length;
        const barHeightMultiplier = this.height / (maxValue || 1);
        
        // First, draw worker region indicators at the top if we have them
        this.drawWorkerRegions(barWidth);
        
        // Draw each bar
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            const x = i * barWidth;
            const barHeight = value * barHeightMultiplier;
            const y = this.height - barHeight;
            
            // Determine the color based on the element state
            let barColor;
            let borderColor = null;
            let glowEffect = false;
            
            if (mergeOperation && activeIndices.includes(i)) {
                // For merge operations, use special colors
                if (i === activeIndices[0]) {
                    barColor = this.colorScheme.mergeSource; // Source element
                } else if (i === activeIndices[1]) {
                    barColor = this.colorScheme.mergeTarget; // Target element
                } else {
                    barColor = this.colorScheme.mergeTarget; // Other merge elements
                }
                glowEffect = true;
            } else if (activeIndices.includes(i)) {
                // Use active color or worker-specific color if available
                barColor = workerId !== null && workerId >= 0 ? 
                    this.workerColors[workerId % this.workerColors.length] : 
                    this.colorScheme.active;
                glowEffect = true;
            } else if (sortedIndices.includes(i)) {
                barColor = this.colorScheme.sorted;
            } else {
                // Check if this index is part of any worker's active set
                let isPartOfWorker = false;
                let workerForThisIndex = null;
                
                for (const wId in this.workerIndices) {
                    if (this.workerIndices[wId].includes(i)) {
                        const workerNum = parseInt(wId);
                        workerForThisIndex = workerNum;
                        barColor = this.workerColors[workerNum % this.workerColors.length];
                        
                        // Add pulsing effect to the current worker's bars
                        if (this.highlightedWorker !== null && parseInt(wId) === this.highlightedWorker) {
                            // Calculate pulsing opacity based on time
                            const pulseOpacity = 0.7 + 0.3 * Math.sin(this.highlightTime * 0.1);
                            barColor = this.adjustOpacity(barColor, pulseOpacity);
                            borderColor = '#ffffff';
                            glowEffect = true;
                        }
                        
                        isPartOfWorker = true;
                        break;
                    }
                }
                
                // Check if the element is part of a worker's region
                if (!isPartOfWorker) {
                    for (const wId in this.workerRegions) {
                        const region = this.workerRegions[wId];
                        if (i >= region.start && i <= region.end) {
                            const workerNum = parseInt(wId);
                            
                            // Use a lighter version of the worker's color for the region
                            const baseColor = this.workerColors[workerNum % this.workerColors.length];
                            barColor = this.adjustOpacity(baseColor, 0.3);
                            
                            // Only override if no specific worker has claimed this index
                            if (!workerForThisIndex) {
                                break;
                            }
                        }
                    }
                }
                
                // If not part of any worker, use the default gradient
                if (!isPartOfWorker && !barColor) {
                    const normalizedValue = value / (maxValue || 1);
                    const hue = 210 + normalizedValue * 60; // Blue to purple gradient
                    barColor = `hsl(${hue}, 70%, 50%)`;
                }
            }
            
            // Add glow effect to active elements
            if (glowEffect) {
                // Draw a glow around active bars
                const glow = this.ctx.createRadialGradient(
                    x + barWidth/2, y + barHeight/2, 0,
                    x + barWidth/2, y + barHeight/2, barWidth * 2
                );
                glow.addColorStop(0, barColor);
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                
                this.ctx.fillStyle = glow;
                this.ctx.fillRect(x - barWidth/2, y - barHeight/4, barWidth * 2, barHeight * 1.5);
            }
            
            // Draw the bar with a small gap between bars
            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
            
            // Add border if specified
            if (borderColor) {
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x + 1, y, barWidth - 2, barHeight);
            }
            
            // Draw value text for larger arrays
            if (array.length <= 50) {
                this.ctx.fillStyle = this.colorScheme.text;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
            }
        }
        
        // Draw worker legends if there are active workers
        if (Object.keys(this.workerIndices).length > 0) {
            this.drawWorkerLegends();
        }
        
        // If this is a merge operation, draw a special legend
        if (mergeOperation) {
            this.drawMergeLegend();
        }
    }
    
    /**
     * Adjust the opacity of a color
     * @param {string} color - CSS color string
     * @param {number} opacity - New opacity value (0-1)
     * @returns {string} - Adjusted color
     */
    adjustOpacity(color, opacity) {
        if (color.startsWith('rgba')) {
            // Extract the RGB parts and replace the opacity
            const parts = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d\.]+\)/);
            if (parts) {
                return `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${opacity})`;
            }
        } else if (color.startsWith('rgb')) {
            // Convert RGB to RGBA
            const parts = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (parts) {
                return `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${opacity})`;
            }
        }
        
        // Default fallback
        return color;
    }
    
    /**
     * Draw color legends for all active workers
     */
    drawWorkerLegends() {
        const legendWidth = 140;
        const legendHeight = 30;
        const padding = 10;
        const spacing = 2;
        
        // Count active workers
        const activeWorkers = Object.keys(this.workerIndices).filter(id => 
            this.workerActivity[id] && Date.now() - this.workerActivity[id] < 2000
        );
        
        // Background for all legends
        const totalHeight = (activeWorkers.length * (legendHeight + spacing)) + padding * 2;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(
            this.width - legendWidth - padding, 
            padding, 
            legendWidth, 
            totalHeight
        );
        
        // Draw outer border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.width - legendWidth - padding, 
            padding, 
            legendWidth,
            totalHeight
        );
        
        // Draw a legend for each worker
        let yOffset = padding + spacing * 2;
        for (const workerId of activeWorkers) {
            const workerNum = parseInt(workerId);
            
            // Worker color sample with pulsing effect if it's the highlighted worker
            let workerColor = this.workerColors[workerNum % this.workerColors.length];
            let borderColor = null;
            const isHighlighted = this.highlightedWorker !== null && workerNum === this.highlightedWorker;
            
            if (isHighlighted) {
                // Calculate pulsing opacity for the legend
                const pulseOpacity = 0.7 + 0.3 * Math.sin(this.highlightTime * 0.1);
                workerColor = this.adjustOpacity(workerColor, pulseOpacity);
                borderColor = '#ffffff';
                
                // Add glow effect to highlighted worker
                const centerX = this.width - legendWidth - padding + 15;
                const centerY = yOffset + 12;
                const glow = this.ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, 25
                );
                glow.addColorStop(0, workerColor);
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                
                this.ctx.fillStyle = glow;
                this.ctx.fillRect(
                    centerX - 15, 
                    centerY - 12, 
                    30, 
                    24
                );
            }
            
            // Worker color box
            this.ctx.fillStyle = workerColor;
            this.ctx.fillRect(
                this.width - legendWidth - padding + 5, 
                yOffset, 
                20, 
                legendHeight - 10
            );
            
            // Add a border for the worker box
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                this.width - legendWidth - padding + 5, 
                yOffset, 
                20, 
                legendHeight - 10
            );
            
            // Draw activity indicator
            const lastActivity = this.workerActivity[workerId] || 0;
            const timeSinceActivity = Date.now() - lastActivity;
            
            if (timeSinceActivity < 500) {
                // Recent activity - show animated indicator
                const activityDot = 3 + Math.sin(this.highlightTime * 0.2) * 2;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.width - legendWidth - padding + 30,
                    yOffset + legendHeight/2 - 5,
                    activityDot,
                    0,
                    Math.PI * 2
                );
                this.ctx.fillStyle = '#4CAF50'; // Green dot
                this.ctx.fill();
            } else if (timeSinceActivity < 2000) {
                // Somewhat recent activity - static indicator
                this.ctx.beginPath();
                this.ctx.arc(
                    this.width - legendWidth - padding + 30,
                    yOffset + legendHeight/2 - 5,
                    3,
                    0,
                    Math.PI * 2
                );
                this.ctx.fillStyle = '#FFC107'; // Yellow dot
                this.ctx.fill();
            }
            
            // Worker text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'left';
            
            const region = this.workerRegions[workerId];
            const regionText = region ? 
                `[${region.start}...${region.end}]` : 
                'array section';
                
            this.ctx.fillText(
                `Worker ${workerId}`, 
                this.width - legendWidth - padding + 35, 
                yOffset + 10
            );
            
            // Worker region info
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '8px Arial';
            this.ctx.fillText(
                regionText,
                this.width - legendWidth - padding + 35,
                yOffset + 22
            );
            
            yOffset += legendHeight + spacing;
        }
    }
    
    /**
     * Draw a legend specifically for merge operations
     */
    drawMergeLegend() {
        const legendWidth = 140;
        const legendHeight = 60;
        const padding = 10;
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(
            this.width - legendWidth - padding, 
            this.height - legendHeight - padding, 
            legendWidth, 
            legendHeight
        );
        
        // Source color sample
        this.ctx.fillStyle = this.colorScheme.mergeSource;
        this.ctx.fillRect(
            this.width - legendWidth - padding + 10, 
            this.height - legendHeight - padding + 15, 
            20, 
            10
        );
        
        // Source text
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(
            'Source Element', 
            this.width - legendWidth - padding + 40, 
            this.height - legendHeight - padding + 23
        );
        
        // Target color sample
        this.ctx.fillStyle = this.colorScheme.mergeTarget;
        this.ctx.fillRect(
            this.width - legendWidth - padding + 10, 
            this.height - legendHeight - padding + 35, 
            20, 
            10
        );
        
        // Target text
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(
            'Target Position', 
            this.width - legendWidth - padding + 40, 
            this.height - legendHeight - padding + 43
        );
    }
    
    /**
     * Highlight specific elements
     * @param {Array<number>} indices - Indices to highlight
     * @param {string} highlightType - Type of highlight ('active', 'sorted')
     * @param {number} workerId - ID of the worker for multi-threading
     * @param {boolean} mergeOperation - Whether this is a merge operation
     */
    highlight(indices, highlightType = 'active', workerId = null, mergeOperation = false) {
        if (highlightType === 'active') {
            this.activeIndices = indices;
        } else if (highlightType === 'sorted') {
            this.sortedIndices = indices;
        }
        
        // If highlighting worker activity, store the worker ID
        if (workerId !== null) {
            this.workerIndices[workerId] = indices;
        }
        
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices, workerId, mergeOperation);
    }
    
    /**
     * Update for a worker operation
     * @param {number} workerId - Worker ID
     * @param {Array<number>} indices - Indices being processed by the worker
     * @param {Array<number>} array - Current array state (optional)
     * @param {Object} stats - Worker statistics (optional)
     */
    updateWorkerActivity(workerId, indices, array = null, stats = null) {
        if (!indices || indices.length === 0) {
            // Don't clear worker indices anymore - we'll keep them for visualization
            // Just update the activity time to show the worker is still active
            this.workerActivity[workerId] = Date.now();
        } else {
            // Store these indices for this worker
            this.workerIndices[workerId] = indices;
            this.workerActivity[workerId] = Date.now();
            
            // Update region if we have a better understanding
            if (indices.length > 1) {
                const minIdx = Math.min(...indices);
                const maxIdx = Math.max(...indices);
                
                // If we got a larger region than previously detected, update it
                if (!this.workerRegions[workerId] || 
                    (maxIdx - minIdx > 5 && 
                     (minIdx < this.workerRegions[workerId].start || 
                      maxIdx > this.workerRegions[workerId].end))) {
                    
                    this.workerRegions[workerId] = {
                        start: Math.max(0, minIdx - 2),
                        end: Math.min(this.array.length - 1, maxIdx + 2)
                    };
                }
            }
            
            // Update worker stats if provided
            if (stats) {
                this.workerStats[workerId] = stats;
                
                // If progress info is present, store it
                if (stats.progress !== undefined) {
                    this.workerProgress[workerId] = stats.progress;
                }
                
                // Update worker animation based on operation type
                if (stats.operation) {
                    // Store the operation type to visualize differently
                    this.workerOperations = this.workerOperations || {};
                    this.workerOperations[workerId] = stats.operation;
                }
            }
        }
        
        // If array is provided, update our array state
        if (array) {
            // Update just the portion of the array this worker is responsible for
            const region = this.workerRegions[workerId];
            if (region && this.array.length === array.length) {
                for (let i = region.start; i <= region.end; i++) {
                    this.array[i] = array[i];
                }
            } else {
                // Update the entire array if provided and we don't have region info
                this.array = [...array];
            }
        }
        
        // Highlight this worker temporarily
        this.highlightedWorker = workerId;
        
        // Render with current active indices, but pass the worker ID
        this.render(this.array, this.maxValue, this.activeIndices, this.sortedIndices, workerId);
        
        // Draw progress bar for this worker if we have progress info
        if (this.workerProgress[workerId] !== undefined) {
            this.drawWorkerProgress(workerId, this.workerProgress[workerId]);
        }
    }
    
    /**
     * Draw progress bar for a specific worker
     * @param {number} workerId - Worker ID
     * @param {number} progress - Progress percentage (0-100)
     */
    drawWorkerProgress(workerId, progress) {
        if (progress === undefined || progress < 0 || progress > 100) return;
        
        const region = this.workerRegions[workerId];
        if (!region) return;
        
        const barWidth = this.width / this.array.length;
        const startX = region.start * barWidth;
        const endX = (region.end + 1) * barWidth;
        const width = endX - startX;
        
        // Draw progress bar below the region indicator
        const progressHeight = 3;
        const y = 18; // Just below the region indicator
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(startX, y, width, progressHeight);
        
        // Progress fill
        const progressWidth = (progress / 100) * width;
        this.ctx.fillStyle = this.workerColors[workerId % this.workerColors.length];
        this.ctx.fillRect(startX, y, progressWidth, progressHeight);
        
        // Show percentage text for wider regions
        if (width > 40) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${Math.round(progress)}%`,
                startX + width / 2,
                y + progressHeight + 8
            );
        }
    }
    
    /**
     * Update for a merge operation visualization
     * @param {Array<number>} array - Current array state
     * @param {Array<number>} indices - Indices involved in the merge (source and target)
     */
    updateMergeOperation(array, indices) {
        // Render with the special merge flag
        this.render(array, this.maxValue, indices, this.sortedIndices, null, true);
    }
    
    /**
     * Reset all worker indices
     */
    resetWorkers() {
        this.workerIndices = {};
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
    
    /**
     * Draw worker region indicators at the top of the visualization
     * @param {number} barWidth - Width of each bar
     */
    drawWorkerRegions(barWidth) {
        const regionHeight = 15;
        const padding = 2;
        
        for (const workerId in this.workerRegions) {
            const region = this.workerRegions[workerId];
            const workerNum = parseInt(workerId);
            const workerColor = this.workerColors[workerNum % this.workerColors.length];
            
            // Calculate region position
            const startX = region.start * barWidth;
            const endX = (region.end + 1) * barWidth;
            const width = endX - startX;
            
            // Draw region background
            this.ctx.fillStyle = this.adjustOpacity(workerColor, 0.3);
            this.ctx.fillRect(startX, 0, width, regionHeight);
            
            // Draw animated border for active worker
            if (this.highlightedWorker !== null && parseInt(workerId) === this.highlightedWorker) {
                this.ctx.strokeStyle = this.adjustOpacity(workerColor, 0.8 + 0.2 * Math.sin(this.highlightTime * 0.1));
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(startX, 0, width, regionHeight);
                
                // Add label with worker number
                this.ctx.fillStyle = '#333';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`Worker ${workerId}`, startX + width/2, regionHeight - 4);
            } else {
                // For non-highlighted workers, still show a lighter label
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.font = '9px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`W${workerId}`, startX + width/2, regionHeight - 4);
            }
            
            // Check if this worker was recently active
            const now = Date.now();
            const lastActivity = this.workerActivity[workerId] || 0;
            
            // Get the current operation if available
            const workerOp = this.workerOperations && this.workerOperations[workerId];
            let operationIndicator = '';
            let operationColor = '#fff';
            
            if (workerOp) {
                // Create a visual indicator of what operation is happening
                switch(workerOp) {
                    case 'comparison':
                        operationIndicator = 'C';
                        operationColor = '#64B5F6'; // Light blue
                        break;
                    case 'swap':
                        operationIndicator = 'S';
                        operationColor = '#FFD54F'; // Amber
                        break;
                    case 'merge':
                        operationIndicator = 'M';
                        operationColor = '#81C784'; // Light green
                        break;
                    case 'partition':
                        operationIndicator = 'P';
                        operationColor = '#BA68C8'; // Purple
                        break;
                    default:
                        operationIndicator = '•';
                        operationColor = '#fff';
                }
            }
            
            if (now - lastActivity < 500) { // Activity within last 500ms
                // Draw activity indicator with operation type
                if (operationIndicator) {
                    const pulseSize = 9 + 2 * Math.sin(this.highlightTime * 0.2);
                    
                    // Draw operation background
                    this.ctx.beginPath();
                    this.ctx.arc(startX + 15, regionHeight/2, pulseSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = operationColor;
                    this.ctx.fill();
                    
                    // Draw operation text
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(operationIndicator, startX + 15, regionHeight/2 + 3);
                } else {
                    // Simple activity indicator without operation info
                    const pulseRadius = 3 + 2 * Math.sin(this.highlightTime * 0.2);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(startX + 10, regionHeight/2, pulseRadius, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fill();
                }
            } else if (now - lastActivity < 2000 && operationIndicator) { // Recent activity with known operation
                // Draw static operation indicator
                this.ctx.beginPath();
                this.ctx.arc(startX + 15, regionHeight/2, 8, 0, Math.PI * 2);
                this.ctx.fillStyle = this.adjustOpacity(operationColor, 0.7);
                this.ctx.fill();
                
                // Draw operation text
                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 8px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(operationIndicator, startX + 15, regionHeight/2 + 3);
            }
        }
    }
    
    /**
     * Reset all worker state for clean visualization
     */
    resetWorkerState() {
        // Clear all worker-related state
        this.workerIndices = {};
        this.workerProgress = {};
        this.workerActivity = {};
        this.workerRegions = {};
        this.workerStats = {};
        this.workerOperations = {};
        this.highlightedWorker = null;
        
        // Also reset any other visualization states
        this.sortedIndices = [];
        this.activeIndices = [];
        
        // Redraw the array with clean state
        if (this.array && this.array.length > 0) {
            this.render(this.array, this.maxValue, [], []);
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarRenderer;
} 