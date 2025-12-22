// modules/settings.js
class SettingsManager {
    constructor(db) {
        this.db = db;
    }
     
    async loadSettings() {
        // Load settings
    }
    
    async saveSettings(event) {
        try {
            const settingsData = {
                // Collect form data
                gradingScale: this.collectGradingScaleData(),
                // ... other settings
            };
            
            console.log('Saving settings:', settingsData);
            
            // **FIXED: Validate but don't block saving**
            try {
                this.validateGradingScale(settingsData.gradingScale);
            } catch (validationError) {
                console.warn('Grading scale validation warning:', validationError.message);
                // Ask user if they want to continue
                const shouldContinue = confirm(
                    `Grading scale has issues:\n${validationError.message}\n\n` +
                    `Do you want to save anyway?\n\n` +
                    `Click OK to save, Cancel to go back and fix.`
                );
                
                if (!shouldContinue) {
                    return; // Don't save
                }
            }
            
            await this.db.saveSettings(settingsData);
            this.showToast('✅ Settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    validateGradingScale(gradingScale) {
        const grades = Object.keys(gradingScale).sort();
        
        if (grades.length === 0) {
            throw new Error('Grading scale must have at least one grade');
        }
        
        // **FIXED: Make all checks warnings, not blocking errors**
        for (let i = 0; i < grades.length - 1; i++) {
            const currentGrade = gradingScale[grades[i]];
            const nextGrade = gradingScale[grades[i + 1]];
            
            // **CHANGED: Just log warning, don't throw**
            if (currentGrade.max >= nextGrade.min) {
                console.warn(`Overlap: ${grades[i]} (${currentGrade.max}%) overlaps with ${grades[i+1]} (${nextGrade.min}%)`);
            }
            
            if (currentGrade.max < nextGrade.min - 1) {
                console.warn(`Gap: Missing ${nextGrade.min - currentGrade.max - 1}% between ${grades[i]} and ${grades[i+1]}`);
            }
        }
        
        // **CHANGED: Make F and A grade requirements optional**
        if (!gradingScale['F']) {
            console.warn('Note: F grade (Fail) is recommended but not required');
        } else if (gradingScale['F'].min > 0 || gradingScale['F'].max < 49) {
            console.warn(`Note: F grade covers ${gradingScale['F'].min}-${gradingScale['F'].max}% (recommended: 0-49%)`);
        }
        
        if (!gradingScale['A']) {
            console.warn('Note: A grade (Excellent) is recommended');
        } else if (gradingScale['A'].max !== 100) {
            console.warn(`Note: A grade ends at ${gradingScale['A'].max}% (recommended: 100%)`);
        }
        
        return true; // Always return true
    }
    
    collectGradingScaleData() {
        // Collect data from table
    }
    
    addGradingScaleRow() {
        // Add new grade row
    }
}
