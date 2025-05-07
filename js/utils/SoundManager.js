/**
 * SoundManager.js
 * Manages sound effects for the sorting visualization
 */
class SoundManager {
    constructor() {
        this.soundEnabled = true;
        this.sounds = {};
        this.context = null;
        
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
} 