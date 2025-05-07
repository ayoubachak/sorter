/**
 * ThreeDRenderer.js
 * Renders the array as a 3D visualization using Three.js
 */
class ThreeDRenderer {
    /**
     * Initialize the 3D renderer
     * @param {HTMLElement} container - Container element
     * @param {number} width - Width of the visualization
     * @param {number} height - Height of the visualization
     */
    constructor(container, width, height) {
        this.container = container;
        this.width = width;
        this.height = height;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.array = [];
        this.maxValue = 0;
        
        this.elements = []; // 3D objects representing array elements
        this.activeIndices = [];
        this.sortedIndices = [];
        
        this.colorScheme = {
            background: '#f8f9fa',
            element: '#3498db',
            active: '#e74c3c',
            sorted: '#2ecc71',
            text: '#333333',
            grid: '#cccccc'
        };
        
        this.animations = []; // Current animations
        this.animationFrameId = null; // Reference to animation frame
        
        this.initialize();
    }
    
    /**
     * Initialize the 3D scene
     */
    initialize() {
        if (!window.THREE) {
            console.error('Three.js library not loaded. Cannot initialize 3D renderer.');
            return;
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.colorScheme.background);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.camera.position.set(100, 100, 100);
        this.camera.lookAt(0, 0, 0);
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add renderer to container
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
        
        // Add orbit controls for interaction
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Add lights
        this.addLights();
        
        // Add grid helper
        this.addGrid();
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Add lights to the scene
     */
    addLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Set shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
        
        // Add a light from the opposite direction
        const secondLight = new THREE.DirectionalLight(0xffffff, 0.3);
        secondLight.position.set(-50, 50, -50);
        this.scene.add(secondLight);
    }
    
    /**
     * Add a grid to the scene
     */
    addGrid() {
        const gridHelper = new THREE.GridHelper(100, 10, this.colorScheme.grid, this.colorScheme.grid);
        gridHelper.position.y = -0.01; // Slightly below the elements
        this.scene.add(gridHelper);
    }
    
    /**
     * Animation loop
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Process animations
        if (this.animations.length > 0) {
            const currentTime = performance.now();
            
            // Process each animation
            for (let i = this.animations.length - 1; i >= 0; i--) {
                const animation = this.animations[i];
                const elapsed = currentTime - animation.startTime;
                const progress = Math.min(elapsed / animation.duration, 1);
                
                // Update animation state
                animation.update(progress);
                
                // Remove completed animations
                if (progress >= 1) {
                    if (animation.onComplete) {
                        animation.onComplete();
                    }
                    this.animations.splice(i, 1);
                }
            }
        }
        
        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Render the array as 3D objects
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
        
        // Clear existing elements
        this.clearElements();
        
        // Create new elements
        const totalWidth = array.length * 2; // 2 units spacing per element
        const startX = -totalWidth / 2 + 1; // Center the array
        
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            const normalizedValue = value / (maxValue || 1);
            const height = 1 + normalizedValue * 40; // Scale height
            
            // Create cube geometry
            const geometry = new THREE.BoxGeometry(1, height, 1);
            
            // Determine material color based on element state
            let color;
            if (activeIndices.includes(i)) {
                color = this.colorScheme.active;
            } else if (sortedIndices.includes(i)) {
                color = this.colorScheme.sorted;
            } else {
                // Use a gradient color based on the value
                const hue = 210 + normalizedValue * 60; // Blue to purple gradient
                color = new THREE.Color(`hsl(${hue}, 70%, 50%)`);
            }
            
            const material = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 100,
                specular: 0x111111
            });
            
            // Create mesh
            const cube = new THREE.Mesh(geometry, material);
            
            // Position the cube
            cube.position.x = startX + i * 2;
            cube.position.y = height / 2; // Position the bottom at y=0
            cube.position.z = 0;
            
            // Add shadow
            cube.castShadow = true;
            cube.receiveShadow = true;
            
            // Add to scene and store reference
            this.scene.add(cube);
            this.elements[i] = cube;
            
            // Add value label for smaller arrays
            if (array.length <= 50) {
                this.addValueLabel(value.toString(), cube.position.x, height + 2, 0);
            }
        }
        
        // Adjust camera position for good viewing
        this.adjustCamera();
    }
    
    /**
     * Add a text label for an element value
     * @param {string} text - Text to display
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    addValueLabel(text, x, y, z) {
        // Create canvas for text rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 32;
        
        // Draw background with transparency
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.fillStyle = this.colorScheme.text;
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite material with the texture
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        // Scale and position the sprite
        sprite.scale.set(2, 1, 1);
        sprite.position.set(x, y, z);
        
        // Add to scene
        this.scene.add(sprite);
        
        // Store reference with the corresponding cube
        const index = this.elements.findIndex(el => 
            el.position.x === x && Math.abs(el.position.y * 2 - y) < 41);
        
        if (index !== -1) {
            if (!this.elements[index].labels) {
                this.elements[index].labels = [];
            }
            this.elements[index].labels.push(sprite);
        }
    }
    
    /**
     * Adjust camera position based on array size
     */
    adjustCamera() {
        const arrayLength = this.array.length;
        const maxHeight = this.maxValue / (this.maxValue || 1) * 40;
        
        // Calculate camera distance
        const distance = Math.max(arrayLength * 1.5, maxHeight * 2, 50);
        const angle = Math.PI / 4; // 45 degrees
        
        // Set camera position
        this.camera.position.x = distance * Math.cos(angle);
        this.camera.position.y = distance * 0.8;
        this.camera.position.z = distance * Math.sin(angle);
        
        // Look at center
        this.camera.lookAt(0, maxHeight / 2, 0);
        
        // Update controls
        this.controls.target.set(0, maxHeight / 2, 0);
        this.controls.update();
    }
    
    /**
     * Clear all elements from the scene
     */
    clearElements() {
        // Remove cubes and their labels
        for (const element of this.elements) {
            if (element) {
                // Remove labels associated with this element
                if (element.labels) {
                    for (const label of element.labels) {
                        this.scene.remove(label);
                    }
                }
                
                // Remove the element itself
                this.scene.remove(element);
                
                // Dispose of geometry and material
                if (element.geometry) element.geometry.dispose();
                if (element.material) element.material.dispose();
            }
        }
        
        this.elements = [];
    }
    
    /**
     * Highlight specific elements
     * @param {Array<number>} indices - Indices to highlight
     * @param {string} highlightType - Type of highlight ('active', 'sorted')
     */
    highlight(indices, highlightType = 'active') {
        // Set indices based on highlight type
        if (highlightType === 'active') {
            this.activeIndices = indices;
        } else if (highlightType === 'sorted') {
            this.sortedIndices = indices;
        }
        
        // Update colors for all elements
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (!element) continue;
            
            let color;
            if (this.activeIndices.includes(i)) {
                color = this.colorScheme.active;
            } else if (this.sortedIndices.includes(i)) {
                color = this.colorScheme.sorted;
            } else {
                // Use a gradient color based on the value
                const normalizedValue = this.array[i] / (this.maxValue || 1);
                const hue = 210 + normalizedValue * 60; // Blue to purple gradient
                color = new THREE.Color(`hsl(${hue}, 70%, 50%)`);
            }
            
            // Update material color
            element.material.color.set(color);
        }
        
        // Add highlight effect for newly active elements
        indices.forEach(index => {
            if (highlightType === 'active' && this.elements[index]) {
                this.addHighlightEffect(this.elements[index]);
            }
        });
    }
    
    /**
     * Add a highlight effect to an element
     * @param {THREE.Mesh} element - Element to highlight
     */
    addHighlightEffect(element) {
        // Create a glow effect
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.5
        });
        
        // Create a slightly larger cube for the glow effect
        const glowGeometry = new THREE.BoxGeometry(
            element.geometry.parameters.width * 1.2,
            element.geometry.parameters.height * 1.05,
            element.geometry.parameters.depth * 1.2
        );
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(element.position);
        
        this.scene.add(glowMesh);
        
        // Animate the glow effect
        const startTime = performance.now();
        const duration = 1000; // 1 second
        
        const animation = {
            startTime,
            duration,
            update: (progress) => {
                // Fade out the glow
                glowMaterial.opacity = 0.5 * (1 - progress);
                
                // Scale the glow
                const scale = 1 + progress * 0.3;
                glowMesh.scale.set(scale, 1, scale);
            },
            onComplete: () => {
                // Remove the glow mesh when animation completes
                this.scene.remove(glowMesh);
                glowGeometry.dispose();
                glowMaterial.dispose();
            }
        };
        
        this.animations.push(animation);
    }
    
    /**
     * Animate a swap between two elements
     * @param {number} index1 - First index
     * @param {number} index2 - Second index
     * @param {Function} onComplete - Callback to execute when animation completes
     */
    animateSwap(index1, index2, onComplete) {
        if (index1 === index2) {
            if (onComplete) onComplete();
            return;
        }
        
        const element1 = this.elements[index1];
        const element2 = this.elements[index2];
        
        if (!element1 || !element2) {
            console.error('Elements not found for swap animation');
            if (onComplete) onComplete();
            return;
        }
        
        // Save original positions
        const originalX1 = element1.position.x;
        const originalX2 = element2.position.x;
        
        // Mark elements as active
        const originalActiveIndices = [...this.activeIndices];
        this.highlight([index1, index2], 'active');
        
        // Create animation
        const startTime = performance.now();
        const duration = 500; // 500ms for swap animation
        
        const animation = {
            startTime,
            duration,
            update: (progress) => {
                // Use easing function for smoother motion
                const easedProgress = this.easeInOutCubic(progress);
                
                // Calculate X component (direct swap)
                const newX1 = originalX1 + (originalX2 - originalX1) * easedProgress;
                const newX2 = originalX2 + (originalX1 - originalX2) * easedProgress;
                
                // Add Y component for arc motion
                const arcY1 = Math.sin(easedProgress * Math.PI) * 5;
                const arcY2 = Math.sin(easedProgress * Math.PI) * 5;
                
                // Update positions
                element1.position.x = newX1;
                element1.position.y = element1.geometry.parameters.height / 2 + arcY1;
                
                element2.position.x = newX2;
                element2.position.y = element2.geometry.parameters.height / 2 + arcY2;
                
                // Update labels positions if they exist
                if (element1.labels) {
                    element1.labels.forEach(label => {
                        label.position.x = newX1;
                        label.position.y = element1.geometry.parameters.height + 2 + arcY1;
                    });
                }
                
                if (element2.labels) {
                    element2.labels.forEach(label => {
                        label.position.x = newX2;
                        label.position.y = element2.geometry.parameters.height + 2 + arcY2;
                    });
                }
            },
            onComplete: () => {
                // Swap the elements in the elements array
                this.elements[index1] = element2;
                this.elements[index2] = element1;
                
                // Reset positions to exactly where they should be
                element1.position.x = originalX2;
                element1.position.y = element1.geometry.parameters.height / 2;
                
                element2.position.x = originalX1;
                element2.position.y = element2.geometry.parameters.height / 2;
                
                // Update labels positions
                if (element1.labels) {
                    element1.labels.forEach(label => {
                        label.position.x = originalX2;
                        label.position.y = element1.geometry.parameters.height + 2;
                    });
                }
                
                if (element2.labels) {
                    element2.labels.forEach(label => {
                        label.position.x = originalX1;
                        label.position.y = element2.geometry.parameters.height + 2;
                    });
                }
                
                // Restore original active indices
                this.activeIndices = originalActiveIndices;
                
                // Call the completion callback
                if (onComplete) {
                    onComplete();
                }
            }
        };
        
        this.animations.push(animation);
    }
    
    /**
     * Easing function for smoother animations
     * @param {number} t - Progress value (0-1)
     * @returns {number} - Eased value
     */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Apply a visual effect to the visualization
     * @param {string} effectType - Type of effect
     * @param {Object} params - Parameters for the effect
     */
    applyEffect(effectType, params = {}) {
        switch (effectType) {
            case 'explosion':
                this.addExplosionEffect(params.indices);
                break;
                
            case 'wave':
                this.addWaveEffect();
                break;
                
            default:
                console.warn(`Unknown effect type for 3D renderer: ${effectType}`);
        }
    }
    
    /**
     * Add an explosion effect to specific elements
     * @param {Array<number>} indices - Indices to apply the effect to
     */
    addExplosionEffect(indices = []) {
        indices.forEach(index => {
            const element = this.elements[index];
            if (!element) return;
            
            // Create explosion particles
            const particleCount = 20;
            const particles = [];
            
            for (let i = 0; i < particleCount; i++) {
                const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                const particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.8
                });
                
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                // Place particle at element position
                particle.position.copy(element.position);
                
                // Generate random velocity
                const speed = 0.2 + Math.random() * 0.3;
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI * 2;
                
                particle.userData.velocity = new THREE.Vector3(
                    speed * Math.sin(angle1) * Math.cos(angle2),
                    speed * Math.cos(angle1),
                    speed * Math.sin(angle1) * Math.sin(angle2)
                );
                
                this.scene.add(particle);
                particles.push(particle);
            }
            
            // Animate particles
            const startTime = performance.now();
            const duration = 1500; // 1.5 seconds
            
            const animation = {
                startTime,
                duration,
                particles,
                update: (progress) => {
                    particles.forEach(particle => {
                        // Move particle based on velocity
                        particle.position.x += particle.userData.velocity.x;
                        particle.position.y += particle.userData.velocity.y;
                        particle.position.z += particle.userData.velocity.z;
                        
                        // Apply gravity
                        particle.userData.velocity.y -= 0.01;
                        
                        // Fade out
                        particle.material.opacity = 0.8 * (1 - progress);
                    });
                },
                onComplete: () => {
                    // Remove all particles
                    particles.forEach(particle => {
                        this.scene.remove(particle);
                        particle.geometry.dispose();
                        particle.material.dispose();
                    });
                }
            };
            
            this.animations.push(animation);
        });
    }
    
    /**
     * Add a wave effect that travels through the array
     */
    addWaveEffect() {
        const startTime = performance.now();
        const duration = 2000; // 2 seconds
        
        const animation = {
            startTime,
            duration,
            update: (progress) => {
                const waveCenter = progress * this.elements.length;
                
                this.elements.forEach((element, index) => {
                    if (!element) return;
                    
                    // Calculate distance from wave center
                    const distance = Math.abs(index - waveCenter);
                    const waveWidth = this.elements.length * 0.1; // 10% of array length
                    
                    if (distance < waveWidth) {
                        // Calculate wave height based on distance from center
                        const waveHeight = Math.cos((distance / waveWidth) * Math.PI) * 3;
                        
                        // Move element up
                        const baseHeight = element.geometry.parameters.height / 2;
                        element.position.y = baseHeight + waveHeight;
                        
                        // Update label position if exists
                        if (element.labels) {
                            element.labels.forEach(label => {
                                label.position.y = element.geometry.parameters.height + 2 + waveHeight;
                            });
                        }
                    } else {
                        // Reset to base position
                        element.position.y = element.geometry.parameters.height / 2;
                        
                        // Update label position if exists
                        if (element.labels) {
                            element.labels.forEach(label => {
                                label.position.y = element.geometry.parameters.height + 2;
                            });
                        }
                    }
                });
            },
            onComplete: () => {
                // Reset all elements to their original positions
                this.elements.forEach(element => {
                    if (!element) return;
                    
                    element.position.y = element.geometry.parameters.height / 2;
                    
                    // Update label position if exists
                    if (element.labels) {
                        element.labels.forEach(label => {
                            label.position.y = element.geometry.parameters.height + 2;
                        });
                    }
                });
            }
        };
        
        this.animations.push(animation);
    }
    
    /**
     * Show a heatmap visualization on the 3D objects
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
        
        // Apply heatmap colors to elements
        this.elements.forEach((element, index) => {
            if (!element) return;
            
            const value = data[index];
            if (value === 0) return; // Skip if no data
            
            const intensity = value / (maxData || 1);
            
            // Create different colors based on heatmap type
            let color;
            if (type === 'access') {
                color = new THREE.Color(1, 1 - intensity, 1 - intensity);
            } else if (type === 'comparison') {
                color = new THREE.Color(1 - intensity, 1, 1 - intensity);
            } else {
                color = new THREE.Color(1, 0.5 + intensity * 0.5, 1 - intensity);
            }
            
            // Apply the color
            element.material.color.copy(color);
            
            // Add a pulsing indicator
            this.addPulsingIndicator(element, intensity);
        });
    }
    
    /**
     * Add a pulsing indicator to an element for heatmap visualization
     * @param {THREE.Mesh} element - The element to add indicator to
     * @param {number} intensity - Intensity value (0-1)
     */
    addPulsingIndicator(element, intensity) {
        // Create a sphere indicator
        const geometry = new THREE.SphereGeometry(0.3 + intensity * 0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        
        const indicator = new THREE.Mesh(geometry, material);
        
        // Position the indicator on top of the element
        indicator.position.set(
            element.position.x,
            element.position.y + element.geometry.parameters.height / 2 + 1,
            element.position.z
        );
        
        this.scene.add(indicator);
        
        // Animate the indicator
        const startTime = performance.now();
        const duration = 2000; // 2 seconds
        const loopCount = Math.ceil(intensity * 5); // More loops for higher intensity
        
        const animation = {
            startTime,
            duration: duration * loopCount,
            update: (progress) => {
                // Calculate the local progress within a single loop
                const localProgress = (progress * loopCount) % 1;
                
                // Pulse size and opacity
                const scale = 1 + Math.sin(localProgress * Math.PI * 2) * 0.5;
                indicator.scale.set(scale, scale, scale);
                
                material.opacity = 0.7 * (0.5 + Math.sin(localProgress * Math.PI * 2) * 0.5);
            },
            onComplete: () => {
                // Remove the indicator
                this.scene.remove(indicator);
                geometry.dispose();
                material.dispose();
            }
        };
        
        this.animations.push(animation);
    }
    
    /**
     * Set the color scheme for the visualization
     * @param {Object} colorScheme - Colors to use
     */
    setColorScheme(colorScheme) {
        this.colorScheme = { ...this.colorScheme, ...colorScheme };
        
        // Update background color
        if (this.scene) {
            this.scene.background = new THREE.Color(this.colorScheme.background);
        }
        
        // Re-render with updated colors
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
        
        // Update renderer and camera
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
        
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Dispose of all elements
        this.clearElements();
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Remove from DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThreeDRenderer;
} 