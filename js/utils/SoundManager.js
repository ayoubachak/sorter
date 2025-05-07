/**
 * SoundManager.js
 * Manages sound effects for the sorting visualization
 */
class SoundManager {
    constructor() {
        this.soundEnabled = true;
        this.sounds = {};
        this.context = null;
        
        // For throttling worker sounds to prevent audio overload
        this.lastWorkerSounds = {};
        this.workerSoundInterval = 100; // Min milliseconds between sounds from the same worker
        
        this.initAudioContext();
        
        this.loadSounds();
    }
    
    /**
     * Initialize audio context
     */
    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            
            if (this.context.state === 'running') {
                this.context.suspend();
            }
            
            const resumeAudio = () => {
                if (this.context && this.context.state !== 'running') {
                    this.context.resume();
                }
                
                ['click', 'touchstart', 'keydown'].forEach(event => {
                    document.removeEventListener(event, resumeAudio);
                });
            };
            
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, resumeAudio, { once: true });
            });
            
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.soundEnabled = false;
        }
    }
    
    /**
     * Load sound effects from audio URLs
     */
    loadSounds() {
        if (!this.soundEnabled) return;
        
        const sounds = {
            'swap': 'sounds/swap.mp3',
            'comparison': 'sounds/comparison.mp3',
            'insertion': 'sounds/insertion.mp3',
            'completed': 'sounds/completed.mp3',
            'pivot': 'sounds/pivot.mp3',
            'error': 'sounds/error.mp3'
        };
        
        this.createOscillatorSounds();
        
        Object.entries(sounds).forEach(([name, url]) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Sound file not found');
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.sounds[name] = audioBuffer;
                })
                .catch(error => {
                    console.log(`Using synthesized sound for ${name}: ${error.message}`);
                });
        });
    }
    
    /**
     * Create synthesized sounds using oscillators
     */
    createOscillatorSounds() {
        if (!this.soundEnabled || !this.context) return;
        
        const createTone = (frequency, duration, type = 'sine', volume = 0.5) => {
            const sampleRate = this.context.sampleRate;
            const length = duration * sampleRate;
            const buffer = this.context.createBuffer(1, length, sampleRate);
            const channel = buffer.getChannelData(0);
            
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                
                let sample = 0;
                switch (type) {
                    case 'sine':
                        sample = Math.sin(2 * Math.PI * frequency * t);
                        break;
                    case 'square':
                        sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
                        break;
                    case 'sawtooth':
                        sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
                        break;
                    case 'triangle':
                        sample = Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) * 2 - 1;
                        break;
                }
                
                const fadeIn = Math.min(1, i / (0.01 * sampleRate));
                const fadeOut = Math.min(1, (length - i) / (0.01 * sampleRate));
                channel[i] = sample * volume * fadeIn * fadeOut;
            }
            
            return buffer;
        };
        
        this.sounds['swap'] = createTone(500, 0.1, 'sine');
        this.sounds['comparison'] = createTone(300, 0.05, 'sine');
        this.sounds['insertion'] = createTone(600, 0.08, 'sine');
        this.sounds['pivot'] = createTone(400, 0.15, 'square', 0.3);
        this.sounds['error'] = createTone(200, 0.3, 'sawtooth', 0.4);
        
        const completedBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
        const completedChannel = completedBuffer.getChannelData(0);
        
        for (let i = 0; i < completedBuffer.length; i++) {
            const t = i / this.context.sampleRate;
            const fadeOut = Math.min(1, (completedBuffer.length - i) / (0.05 * this.context.sampleRate));
            
            completedChannel[i] = (
                0.2 * Math.sin(2 * Math.PI * 440 * t) + 
                0.2 * Math.sin(2 * Math.PI * 554.37 * t) + 
                0.2 * Math.sin(2 * Math.PI * 659.25 * t)
            ) * fadeOut;
        }
        
        this.sounds['completed'] = completedBuffer;
    }
    
    /**
     * Play a sound effect
     * @param {string} soundName - Name of the sound to play
     * @param {Object} options - Optional parameters (pitch, volume)
     */
    playSound(soundName, options = {}) {
        if (!this.soundEnabled || !this.context || !this.sounds[soundName]) {
            return;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = this.sounds[soundName];
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume || 0.5;
        
        if (options.pitch) {
            source.playbackRate.value = options.pitch;
        }
        
        source.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        source.start(0);
    }
    
    /**
     * Play a tone at a specific frequency
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {number} volume - Volume (0-1)
     */
    playTone(frequency, duration = 0.1, volume = 0.5) {
        if (!this.soundEnabled || !this.context) {
            return;
        }
        
        const oscillator = this.context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        
        const gainNode = this.context.createGain();
        gainNode.gain.setValueAtTime(0, this.context.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.01);
        gainNode.gain.setValueAtTime(volume, this.context.currentTime + duration - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);
    }
    
    /**
     * Play a sound for an array element value
     * @param {number} value - Value to sonify
     * @param {number} maxValue - Maximum value in the array
     */
    playElementSound(value, maxValue) {
        if (!this.soundEnabled || !this.context) {
            return;
        }
        
        const minFreq = 220; // A3
        const maxFreq = 880; // A5
        const frequency = minFreq + (value / maxValue) * (maxFreq - minFreq);
        
        this.playTone(frequency, 0.1, 0.2);
    }
    
    /**
     * Toggle sound on/off
     * @returns {boolean} - New sound enabled state
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        if (this.soundEnabled) {
            if (this.context && this.context.state !== 'running') {
                this.context.resume();
            }
        }
        
        return this.soundEnabled;
    }
    
    /**
     * Check if sound is enabled
     * @returns {boolean} - Sound enabled state
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
    
    /**
     * Play a sound for a specific worker thread (for multi-threading visualizations)
     * @param {number} workerId - ID of the worker thread
     * @param {string} operation - Operation being performed
     * @param {Object} options - Additional options
     */
    playWorkerSound(workerId, operation, options = {}) {
        if (!this.soundEnabled || !this.context) {
            return;
        }
        
        // Throttle sounds from the same worker to prevent audio overload
        const now = Date.now();
        const lastSoundTime = this.lastWorkerSounds[workerId] || 0;
        
        // Skip if this worker played a sound too recently
        if (now - lastSoundTime < this.workerSoundInterval) {
            return;
        }
        
        // Update last sound time for this worker
        this.lastWorkerSounds[workerId] = now;
        
        // Define base frequencies for each worker (using pentatonic scale for harmonious sounds)
        const baseFrequencies = [
            262, // C4
            294, // D4
            330, // E4
            349, // F4
            392, // G4
            440, // A4
            494, // B4
            523  // C5
        ];
        
        // Get the base frequency for this worker
        const baseFrequency = baseFrequencies[workerId % baseFrequencies.length];
        
        // Adjust volume and duration based on operation
        let volume = options.volume || 0.2;
        let duration = options.duration || 0.1;
        
        // Different sounds for different operations
        switch (operation) {
            case 'comparison':
                this.playTone(baseFrequency, 0.05, volume * 0.6);
                break;
                
            case 'swap':
                this.playTone(baseFrequency, 0.08, volume * 0.8);
                this.playTone(baseFrequency * 1.5, 0.08, volume * 0.6);
                break;
                
            case 'merge':
                this.playTone(baseFrequency * 0.8, 0.08, volume * 0.5);
                this.playTone(baseFrequency * 1.2, 0.08, volume * 0.5);
                break;
                
            case 'partition':
                this.playTone(baseFrequency * 1.2, 0.1, volume * 0.7);
                break;
                
            case 'pivot':
                this.playTone(baseFrequency * 1.5, 0.15, volume * 0.8);
                break;
                
            case 'split':
                this.playTone(baseFrequency * 1.2, 0.06, volume * 0.5);
                this.playTone(baseFrequency * 0.8, 0.06, volume * 0.5);
                break;
                
            default:
                // Default worker activity sound
                this.playTone(baseFrequency, duration, volume * 0.4);
        }
    }
    
    /**
     * Play a chord effect for important algorithm events
     * @param {string} type - Type of chord ('success', 'warning', etc.)
     * @param {Object} options - Options for the chord
     */
    playChord(type, options = {}) {
        if (!this.soundEnabled || !this.context) {
            return;
        }
        
        const volume = options.volume || 0.3;
        const duration = options.duration || 0.3;
        
        switch (type) {
            case 'success':
                // Major chord (C E G)
                this.playTone(261.63, duration, volume); // C
                this.playTone(329.63, duration, volume * 0.8); // E
                this.playTone(392.00, duration, volume * 0.6); // G
                break;
                
            case 'warning':
                // Minor chord (C Eb G)
                this.playTone(261.63, duration, volume); // C
                this.playTone(311.13, duration, volume * 0.8); // Eb
                this.playTone(392.00, duration, volume * 0.6); // G
                break;
                
            case 'error':
                // Diminished chord (C Eb Gb)
                this.playTone(261.63, duration, volume); // C
                this.playTone(311.13, duration, volume); // Eb
                this.playTone(369.99, duration, volume); // Gb
                break;
                
            case 'completion':
                // Major 7th chord (C E G B)
                this.playTone(261.63, duration * 1.5, volume); // C
                this.playTone(329.63, duration * 1.5, volume * 0.7); // E
                this.playTone(392.00, duration * 1.5, volume * 0.6); // G
                this.playTone(493.88, duration * 1.5, volume * 0.5); // B
                break;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
} 