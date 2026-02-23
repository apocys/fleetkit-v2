/**
 * FleetKit Executive Office V4 - Countdown Timer Component
 * Reusable countdown timer for cron jobs and scheduled tasks
 */

class CountdownTimer {
    constructor(element, options = {}) {
        this.element = element;
        this.targetTime = options.targetTime || element.dataset.targetTime;
        this.onComplete = options.onComplete;
        this.onUpdate = options.onUpdate;
        this.format = options.format || 'auto';
        this.showIcon = options.showIcon !== false;
        this.autoStart = options.autoStart !== false;
        
        this.intervalId = null;
        this.isRunning = false;
        this.isComplete = false;
        
        this.init();
    }

    init() {
        if (!this.targetTime) {
            console.warn('CountdownTimer: No target time provided');
            return;
        }

        this.setupElement();
        
        if (this.autoStart) {
            this.start();
        }
    }

    setupElement() {
        if (!this.element.classList.contains('countdown-timer')) {
            this.element.classList.add('countdown-timer');
        }

        // Create internal structure if not present
        if (!this.element.querySelector('.countdown-text')) {
            this.element.innerHTML = `
                ${this.showIcon ? '<span class="countdown-icon">⏱️</span>' : ''}
                <span class="countdown-text">Loading...</span>
            `;
        }

        this.textElement = this.element.querySelector('.countdown-text');
        this.iconElement = this.element.querySelector('.countdown-icon');
    }

    start() {
        if (this.isRunning) {
            this.stop();
        }

        this.isRunning = true;
        this.isComplete = false;
        this.update(); // Initial update
        
        this.intervalId = setInterval(() => {
            this.update();
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }

    update() {
        const now = new Date();
        const target = new Date(this.targetTime);
        const diff = target - now;

        if (diff <= 0 && !this.isComplete) {
            this.handleComplete();
            return;
        }

        const timeText = this.formatTime(diff);
        this.updateDisplay(timeText);

        // Call update callback if provided
        if (this.onUpdate) {
            this.onUpdate(diff, timeText);
        }
    }

    handleComplete() {
        this.isComplete = true;
        this.stop();
        
        this.updateDisplay('Running...', 'running');
        
        if (this.iconElement) {
            this.iconElement.textContent = '▶️';
        }

        // Call completion callback if provided
        if (this.onComplete) {
            this.onComplete();
        }

        // Emit event
        this.element.dispatchEvent(new CustomEvent('countdown:complete', {
            detail: { timer: this }
        }));
    }

    updateDisplay(text, status = null) {
        if (this.textElement) {
            this.textElement.textContent = text;
            
            // Update status classes
            this.textElement.classList.remove('running', 'overdue', 'soon');
            if (status) {
                this.textElement.classList.add(status);
            }
        }
    }

    formatTime(milliseconds) {
        if (milliseconds <= 0) {
            return 'Now';
        }

        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;

        return this.getFormattedString(days, hours, minutes, seconds);
    }

    getFormattedString(days, hours, minutes, seconds) {
        switch (this.format) {
            case 'compact':
                return this.getCompactFormat(days, hours, minutes, seconds);
            case 'full':
                return this.getFullFormat(days, hours, minutes, seconds);
            case 'short':
                return this.getShortFormat(days, hours, minutes, seconds);
            case 'auto':
            default:
                return this.getAutoFormat(days, hours, minutes, seconds);
        }
    }

    getAutoFormat(days, hours, minutes, seconds) {
        // Auto format selects the most appropriate format based on time remaining
        if (days > 0) {
            return hours > 0 ? `${days}d ${hours}h` : `${days} days`;
        } else if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
        } else if (minutes > 5) {
            return `${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getCompactFormat(days, hours, minutes, seconds) {
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    getFullFormat(days, hours, minutes, seconds) {
        const parts = [];
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (seconds > 0 && parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
        
        return parts.length > 0 ? parts.join(', ') : '0 seconds';
    }

    getShortFormat(days, hours, minutes, seconds) {
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m ${seconds}s`;
    }

    // Public API methods
    setTargetTime(targetTime) {
        this.targetTime = targetTime;
        if (this.isRunning) {
            this.start(); // Restart with new target
        }
    }

    getTimeRemaining() {
        const now = new Date();
        const target = new Date(this.targetTime);
        return Math.max(0, target - now);
    }

    isCompleted() {
        return this.isComplete;
    }

    pause() {
        this.stop();
    }

    resume() {
        if (!this.isComplete) {
            this.start();
        }
    }

    destroy() {
        this.stop();
        this.element = null;
        this.textElement = null;
        this.iconElement = null;
    }
}

// Static factory methods for common use cases
CountdownTimer.create = function(selector, options = {}) {
    const elements = document.querySelectorAll(selector);
    const timers = [];
    
    elements.forEach(element => {
        const timer = new CountdownTimer(element, options);
        timers.push(timer);
    });
    
    return timers.length === 1 ? timers[0] : timers;
};

CountdownTimer.createFromData = function(selector) {
    const elements = document.querySelectorAll(selector);
    const timers = [];
    
    elements.forEach(element => {
        const options = {
            targetTime: element.dataset.targetTime,
            format: element.dataset.format || 'auto',
            showIcon: element.dataset.showIcon !== 'false'
        };
        
        const timer = new CountdownTimer(element, options);
        timers.push(timer);
    });
    
    return timers.length === 1 ? timers[0] : timers;
};

// Utility functions for common countdown scenarios
CountdownTimer.forCronJob = function(element, cronJob) {
    return new CountdownTimer(element, {
        targetTime: cronJob.nextRunAt,
        format: 'auto',
        onComplete: () => {
            console.log(`Cron job "${cronJob.name}" is running`);
            // Could emit event to refresh cron data
            FleetEvents?.emit('cron:job:running', { cronJob });
        }
    });
};

CountdownTimer.forSession = function(element, sessionTimeout) {
    return new CountdownTimer(element, {
        targetTime: sessionTimeout,
        format: 'compact',
        onComplete: () => {
            console.log('Session timeout reached');
            // Could emit event for session cleanup
            FleetEvents?.emit('session:timeout', { element });
        },
        onUpdate: (timeLeft, timeText) => {
            // Change appearance when time is running low
            const minutes = Math.floor(timeLeft / (1000 * 60));
            if (minutes <= 5) {
                element.classList.add('countdown-urgent');
            } else {
                element.classList.remove('countdown-urgent');
            }
        }
    });
};

CountdownTimer.forMission = function(element, deadline) {
    return new CountdownTimer(element, {
        targetTime: deadline,
        format: 'auto',
        onComplete: () => {
            console.log('Mission deadline reached');
            FleetEvents?.emit('mission:deadline:reached', { deadline, element });
        }
    });
};

// Auto-initialization for elements with data attributes
document.addEventListener('DOMContentLoaded', () => {
    // Initialize timers with data-countdown-target attribute
    const autoTimers = document.querySelectorAll('[data-countdown-target]');
    autoTimers.forEach(element => {
        new CountdownTimer(element, {
            targetTime: element.dataset.countdownTarget,
            format: element.dataset.countdownFormat,
            showIcon: element.dataset.countdownShowIcon !== 'false'
        });
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CountdownTimer;
} else if (typeof window !== 'undefined') {
    window.CountdownTimer = CountdownTimer;
}