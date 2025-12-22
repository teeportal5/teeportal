// modules/settings.js - Settings management module
class SettingsManager {
    constructor(db) {
        this.db = db;
    }
    
    async loadSettings() {
        try {
            const settings = await this.db.getSettings();
            this.populateSettingsForm(settings);
            this.applySettings(settings);
            return settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.db.getDefaultSettings();
        }
    }
    
    populateSettingsForm(settings) {
        try {
            // Institute Settings
            if (document.getElementById('instituteName')) {
                document.getElementById('instituteName').value = settings.instituteName || '';
            }
            
            if (document.getElementById('instituteAbbreviation')) {
                document.getElementById('instituteAbbreviation').value = settings.instituteAbbreviation || '';
            }
            
            if (document.getElementById('academicYear')) {
                document.getElementById('academicYear').value = settings.academicYear || new Date().getFullYear();
            }
            
            if (document.getElementById('timezone')) {
                document.getElementById('timezone').value = settings.timezone || 'Africa/Nairobi';
            }
            
            // System Settings
            if (document.getElementById('autoGenerateRegNumbers')) {
                document.getElementById('autoGenerateRegNumbers').checked = settings.system?.autoGenerateRegNumbers !== false;
            }
            
            if (document.getElementById('allowMarkOverwrite')) {
                document.getElementById('allowMarkOverwrite').checked = settings.system?.allowMarkOverwrite || false;
            }
            
            if (document.getElementById('showGPA')) {
                document.getElementById('showGPA').checked = settings.system?.showGPA !== false;
            }
            
            // Populate grading scale table if it exists
            this.populateGradingScaleTable(settings.gradingScale);
            
            // Populate programs settings
            this.populateProgramsSettings(settings.programs);
            
        } catch (error) {
            console.error('Error populating settings form:', error);
        }
    }
    
    openSettingsTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = document.getElementById(`${tabName}Settings`);
        if (tabContent) {
            tabContent.style.display = 'block';
        }
        
        // Activate selected tab button
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    populateGradingScaleTable(gradingScale) {
        const tbody = document.getElementById('grading-scale-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(gradingScale || {}).forEach(([grade, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control form-control-sm grade-input" 
                          value="${grade}" readonly style="font-weight: bold; background: #f8f9fa;"></td>
                <td><input type="number" class="form-control form-control-sm min-input" 
                          value="${data.min}" min="0" max="100" data-grade="${grade}"></td>
                <td><input type="number" class="form-control form-control-sm max-input" 
                          value="${data.max}" min="0" max="100" data-grade="${grade}"></td>
                <td><input type="number" class="form-control form-control-sm points-input" 
                          value="${data.points}" step="0.1" min="0" max="4" data-grade="${grade}"></td>
                <td><input type="text" class="form-control description-input" 
                          value="${data.description || ''}" data-grade="${grade}"></td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="app.settings.removeGradingScaleRow('${grade}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    populateProgramsSettings(programs) {
        const container = document.getElementById('programs-settings');
        if (!container) return;
        
        let html = '';
        Object.entries(programs).forEach(([code, data]) => {
            html += `
                <div class="program-setting-card">
                    <div class="program-setting-header">
                        <h5>${data.name}</h5>
                        <span class="program-code">${code}</span>
                    </div>
                    <div class="program-setting-body">
                        <div class="form-group">
                            <label>Program Name</label>
                            <input type="text" class="form-control" value="${data.name}" data-field="name">
                        </div>
                        <div class="form-group">
                            <label>Duration</label>
                            <input type="text" class="form-control" value="${data.duration}" data-field="duration">
                        </div>
                        <div class="form-group">
                            <label>Max Credits</label>
                            <input type="number" class="form-control" value="${data.maxCredits || 0}" data-field="maxCredits">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea class="form-control" rows="2" data-field="description">${data.description || ''}</textarea>
                        </div>
                    </div>
                    <input type="hidden" class="program-code" value="${code}">
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async saveSettings(event) {
        if (event) event.preventDefault();
        
        try {
            // Collect settings from form
            const settingsData = {
                instituteName: document.getElementById('instituteName')?.value || '',
                instituteAbbreviation: document.getElementById('instituteAbbreviation')?.value || '',
                academicYear: parseInt(document.getElementById('academicYear')?.value) || new Date().getFullYear(),
                timezone: document.getElementById('timezone')?.value || 'Africa/Nairobi',
                currency: document.getElementById('currency')?.value || 'KES',
                language: document.getElementById('language')?.value || 'en',
                
                // Grading Scale
                gradingScale: this.collectGradingScaleData(),
                
                // Programs
                programs: this.collectProgramsData(),
                
                // System Settings
                system: {
                    autoGenerateRegNumbers: document.getElementById('autoGenerateRegNumbers')?.checked || true,
                    allowMarkOverwrite: document.getElementById('allowMarkOverwrite')?.checked || false,
                    showGPA: document.getElementById('showGPA')?.checked || true,
                    enableEmailNotifications: document.getElementById('enableEmailNotifications')?.checked || false,
                    defaultPassword: document.getElementById('defaultPassword')?.value || 'Welcome123',
                    sessionTimeout: parseInt(document.getElementById('sessionTimeout')?.value) || 30,
                    maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts')?.value) || 5,
                    enableTwoFactor: document.getElementById('enableTwoFactor')?.checked || false
                }
            };
            
            console.log('💾 Saving settings:', settingsData);
            
            await this.db.saveSettings(settingsData);
            
            this.showToast('✅ Settings saved successfully!', 'success');
            
            // Apply settings to UI
            this.applySettings(settingsData);
            
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showToast(`Error saving settings: ${error.message}`, 'error');
        }
    }
    
    collectGradingScaleData() {
        const gradingScale = {};
        const rows = document.querySelectorAll('#grading-scale-body tr');
        
        rows.forEach(row => {
            const gradeInput = row.querySelector('.grade-input');
            const minInput = row.querySelector('.min-input');
            const maxInput = row.querySelector('.max-input');
            const pointsInput = row.querySelector('.points-input');
            const descInput = row.querySelector('.description-input');
            
            if (gradeInput && gradeInput.value) {
                const grade = gradeInput.value.trim();
                const min = parseInt(minInput?.value) || 0;
                const max = parseInt(maxInput?.value) || 0;
                const points = parseFloat(pointsInput?.value) || 0;
                const description = descInput?.value || '';
                
                // Validation
                if (min < 0 || min > 100 || max < 0 || max > 100 || min > max) {
                    throw new Error(`Invalid range for grade ${grade}. Min must be ≤ Max and between 0-100.`);
                }
                
                if (points < 0 || points > 4) {
                    throw new Error(`Invalid points for grade ${grade}. Must be between 0-4.`);
                }
                
                gradingScale[grade] = { min, max, points, description };
            }
        });
        
        // Ensure all grades are present and ranges are contiguous
        this.validateGradingScale(gradingScale);
        
        return gradingScale;
    }
    
    collectProgramsData() {
        const programs = {};
        const cards = document.querySelectorAll('.program-setting-card');
        
        cards.forEach(card => {
            const code = card.querySelector('.program-code').value;
            const name = card.querySelector('[data-field="name"]')?.value || '';
            const duration = card.querySelector('[data-field="duration"]')?.value || '';
            const maxCredits = parseInt(card.querySelector('[data-field="maxCredits"]')?.value) || 0;
            const description = card.querySelector('[data-field="description"]')?.value || '';
            
            if (code && name) {
                programs[code] = {
                    name,
                    duration,
                    maxCredits,
                    description
                };
            }
        });
        
        return programs;
    }
    
    applySettings(settings) {
        // Update page title and headers
        document.title = `${settings.instituteName} - TEE Portal`;
        
        const instituteNameElements = document.querySelectorAll('.institute-name');
        instituteNameElements.forEach(el => {
            el.textContent = settings.instituteName;
        });
        
        const instituteAbbrElements = document.querySelectorAll('.institute-abbr');
        instituteAbbrElements.forEach(el => {
            el.textContent = settings.instituteAbbreviation;
        });
        
        // Update academic year display
        const academicYearElements = document.querySelectorAll('.academic-year');
        academicYearElements.forEach(el => {
            el.textContent = settings.academicYear;
        });
    }
    
    validateGradingScale(gradingScale) {
        const grades = Object.keys(gradingScale).sort();
        
        if (grades.length === 0) {
            throw new Error('Grading scale must have at least one grade');
        }
        
        // Check for overlaps but allow gaps
        for (let i = 0; i < grades.length - 1; i++) {
            const currentGrade = gradingScale[grades[i]];
            const nextGrade = gradingScale[grades[i + 1]];
            
            // Check for overlaps (bad) but allow gaps (okay)
            if (currentGrade.max >= nextGrade.min) {
                throw new Error(`Overlap detected: ${grades[i]} (${currentGrade.max}%) overlaps with ${grades[i + 1]} (${nextGrade.min}%)`);
            }
        }
        
        return true;
    }
    
    removeGradingScaleRow(grade) {
        if (!confirm(`Remove grade ${grade} from the grading scale?`)) {
            return;
        }
        
        const rows = document.querySelectorAll('#grading-scale-body tr');
        rows.forEach(row => {
            const gradeCell = row.querySelector('.grade-input');
            if (gradeCell && gradeCell.value === grade) {
                row.remove();
            }
        });
    }
    
    addGradingScaleRow() {
        const tbody = document.getElementById('grading-scale-body');
        if (!tbody) return;
        
        const newRow = document.createElement('tr');
        const newGrade = 'NEW' + Date.now().toString().slice(-4);
        
        newRow.innerHTML = `
            <td><input type="text" class="form-control form-control-sm grade-input" 
                      value="${newGrade}" style="font-weight: bold;"></td>
            <td><input type="number" class="form-control form-control-sm min-input" 
                      placeholder="Min %" min="0" max="100" value="0"></td>
            <td><input type="number" class="form-control form-control-sm max-input" 
                      placeholder="Max %" min="0" max="100" value="0"></td>
            <td><input type="number" class="form-control form-control-sm points-input" 
                      placeholder="Points" step="0.1" min="0" max="4" value="0"></td>
            <td><input type="text" class="form-control description-input" 
                      placeholder="Description"></td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" 
                        onclick="app.settings.removeGradingScaleRow('${newGrade}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(newRow);
    }
    
    addProgramSetting() {
        const container = document.getElementById('programs-settings');
        if (!container) return;
        
        const newCard = document.createElement('div');
        newCard.className = 'program-setting-card';
        const newCode = 'new' + Date.now().toString().slice(-4);
        
        newCard.innerHTML = `
            <div class="program-setting-header">
                <h5>New Program</h5>
                <span class="program-code">${newCode.toUpperCase()}</span>
            </div>
            <div class="program-setting-body">
                <div class="form-group">
                    <label>Program Code</label>
                    <input type="text" class="form-control program-code-input" 
                          value="${newCode}" placeholder="e.g., basic, hnc">
                </div>
                <div class="form-group">
                    <label>Program Name</label>
                    <input type="text" class="form-control" data-field="name" placeholder="Program Name">
                </div>
                <div class="form-group">
                    <label>Duration</label>
                    <input type="text" class="form-control" data-field="duration" placeholder="e.g., 2 years">
                </div>
                <div class="form-group">
                    <label>Max Credits</label>
                    <input type="number" class="form-control" data-field="maxCredits" value="60">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" rows="2" data-field="description"></textarea>
                </div>
            </div>
            <input type="hidden" class="program-code" value="${newCode}">
        `;
        
        container.appendChild(newCard);
        
        // Add event listener for program code input
        const codeInput = newCard.querySelector('.program-code-input');
        const hiddenCode = newCard.querySelector('.program-code');
        const codeSpan = newCard.querySelector('.program-code');
        
        codeInput.addEventListener('input', function() {
            const newValue = this.value.toLowerCase().replace(/[^a-z0-9]/g, '');
            hiddenCode.value = newValue;
            codeSpan.textContent = newValue.toUpperCase();
            this.value = newValue;
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }
}
