// modules/settings.js - Settings Manager
class SettingsManager {
    constructor(db) {
        this.db = db;
        this.defaultSettings = this.getDefaultSettings();
    }
    
    // ==================== INITIALIZATION ====================
    
    async initializeSettingsUI() {
        try {
            console.log('⚙️ Initializing Settings UI...');
            
            // Load settings from database or use defaults
            await this.loadSettings();
            
            // Setup tabs
            this.setupSettingsTabs();
            
            // Setup form submission
            this.setupFormEvents();
            
            // Load grading scale
            await this.loadGradingScale();
            
            // Load program settings
            await this.loadProgramSettings();
            
            // Setup buttons
            this.setupButtons();
            
            console.log('✅ Settings UI initialized');
        } catch (error) {
            console.error('Error initializing settings UI:', error);
            this.showToast('Error loading settings', 'error');
        }
    }
    
    setupSettingsTabs() {
        const tabButtons = document.querySelectorAll('.settings-tab-btn');
        const tabContents = document.querySelectorAll('.settings-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Show corresponding content
                const tabId = button.getAttribute('data-tab');
                const contentId = `${tabId}Settings`;
                document.getElementById(contentId)?.classList.add('active');
            });
        });
    }
    
    setupFormEvents() {
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGeneralSettings();
            });
        }
        
        // System settings checkboxes
        const checkboxes = [
            'autoGenerateRegNumbers',
            'allowMarkOverwrite',
            'showGPA'
        ];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.saveSystemSettings());
            }
        });
        
        // System settings inputs
        const systemInputs = ['defaultPassword', 'sessionTimeout'];
        systemInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => this.saveSystemSettings());
            }
        });
    }
    
    setupButtons() {
        // Add Grade Row button
        const addGradeBtn = document.getElementById('addGradeRowBtn');
        if (addGradeBtn) {
            addGradeBtn.addEventListener('click', () => this.addGradeRow());
        }
        
        // Add Program button
        const addProgramBtn = document.getElementById('addProgramBtn');
        if (addProgramBtn) {
            addProgramBtn.addEventListener('click', () => this.addProgramField());
        }
    }
    
    // ==================== LOAD SETTINGS ====================
    
    async loadSettings() {
        try {
            console.log('📋 Loading settings...');
            
            // Try to load from database first
            const supabase = await this.db.ensureConnected();
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (data) {
                // Merge with defaults
                this.currentSettings = { ...this.defaultSettings, ...data.settings };
            } else {
                // Use defaults
                this.currentSettings = this.defaultSettings;
            }
            
            // Populate form fields
            this.populateSettingsForm();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.currentSettings = this.defaultSettings;
            this.populateSettingsForm();
        }
    }
    
    populateSettingsForm() {
        // General Settings
        this.setValue('instituteName', this.currentSettings.institute.name);
        this.setValue('instituteAbbreviation', this.currentSettings.institute.abbreviation);
        this.setValue('academicYear', this.currentSettings.academic.year);
        this.setValue('timezone', this.currentSettings.institute.timezone);
        
        // System Settings
        this.setCheckbox('autoGenerateRegNumbers', this.currentSettings.system.autoGenerateRegNumbers);
        this.setCheckbox('allowMarkOverwrite', this.currentSettings.system.allowMarkOverwrite);
        this.setCheckbox('showGPA', this.currentSettings.system.showGPA);
        this.setValue('defaultPassword', this.currentSettings.system.defaultPassword);
        this.setValue('sessionTimeout', this.currentSettings.system.sessionTimeout);
    }
    
    // ==================== GRADING SCALE ====================
    
    async loadGradingScale() {
        try {
            const gradingScale = this.currentSettings.academic.gradingScale;
            const tbody = document.getElementById('grading-scale-body');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            gradingScale.forEach((grade, index) => {
                const row = this.createGradeRow(grade, index);
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading grading scale:', error);
        }
    }
    
    createGradeRow(grade, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" class="form-control grade-letter" value="${grade.grade}" 
                       data-index="${index}" data-field="grade">
            </td>
            <td>
                <input type="number" class="form-control grade-min" value="${grade.min}" 
                       min="0" max="100" data-index="${index}" data-field="min">
            </td>
            <td>
                <input type="number" class="form-control grade-max" value="${grade.max}" 
                       min="0" max="100" data-index="${index}" data-field="max">
            </td>
            <td>
                <input type="number" class="form-control grade-points" value="${grade.points}" 
                       step="0.1" min="0" max="4" data-index="${index}" data-field="points">
            </td>
            <td>
                <input type="text" class="form-control grade-description" value="${grade.description}" 
                       data-index="${index}" data-field="description">
            </td>
            <td>
                <button type="button" class="btn-icon btn-remove-grade" data-index="${index}" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Add event listeners to inputs
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateGradingScale());
        });
        
        // Add event listener to remove button
        const removeBtn = row.querySelector('.btn-remove-grade');
        removeBtn.addEventListener('click', () => this.removeGradeRow(index));
        
        return row;
    }
    
    addGradeRow() {
        const newGrade = {
            grade: 'A',
            min: 80,
            max: 100,
            points: 4.0,
            description: 'Excellent'
        };
        
        this.currentSettings.academic.gradingScale.push(newGrade);
        this.loadGradingScale();
        this.saveAcademicSettings();
    }
    
    removeGradeRow(index) {
        if (this.currentSettings.academic.gradingScale.length <= 1) {
            this.showToast('Cannot remove the last grade', 'warning');
            return;
        }
        
        this.currentSettings.academic.gradingScale.splice(index, 1);
        this.loadGradingScale();
        this.saveAcademicSettings();
    }
    
    updateGradingScale() {
        // Get all grade rows
        const gradeRows = document.querySelectorAll('#grading-scale-body tr');
        
        gradeRows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const index = parseInt(inputs[0].getAttribute('data-index'));
            
            inputs.forEach(input => {
                const field = input.getAttribute('data-field');
                const value = input.type === 'number' ? parseFloat(input.value) : input.value;
                
                if (field && this.currentSettings.academic.gradingScale[index]) {
                    this.currentSettings.academic.gradingScale[index][field] = value;
                }
            });
        });
        
        // Auto-save
        this.saveAcademicSettings();
    }
    
    // ==================== PROGRAM SETTINGS ====================
    
    async loadProgramSettings() {
        try {
            const programs = this.currentSettings.programs;
            const container = document.getElementById('programs-settings');
            if (!container) return;
            
            container.innerHTML = '';
            
            Object.entries(programs).forEach(([programName, programData], index) => {
                const programDiv = this.createProgramField(programName, programData, index);
                container.appendChild(programDiv);
            });
            
        } catch (error) {
            console.error('Error loading program settings:', error);
        }
    }
    
    createProgramField(programName, programData, index) {
        const div = document.createElement('div');
        div.className = 'program-field';
        div.innerHTML = `
            <div class="form-row">
                <div class="col-md-4">
                    <input type="text" class="form-control program-name" 
                           value="${programName}" placeholder="Program Name"
                           data-index="${index}">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control program-duration" 
                           value="${programData.duration}" placeholder="Duration (years)"
                           min="1" max="6" data-index="${index}">
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control program-credits" 
                           value="${programData.totalCredits}" placeholder="Total Credits"
                           min="1" max="200" data-index="${index}">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn-icon btn-remove-program" 
                            data-index="${index}" title="Remove Program">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const inputs = div.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateProgramSettings());
        });
        
        const removeBtn = div.querySelector('.btn-remove-program');
        removeBtn.addEventListener('click', () => this.removeProgramField(index));
        
        return div;
    }
    
    addProgramField() {
        const programName = `New Program ${Object.keys(this.currentSettings.programs).length + 1}`;
        this.currentSettings.programs[programName] = {
            duration: 2,
            totalCredits: 120
        };
        
        this.loadProgramSettings();
        this.saveAcademicSettings();
    }
    
    removeProgramField(index) {
        const programNames = Object.keys(this.currentSettings.programs);
        if (programNames.length <= 1) {
            this.showToast('Cannot remove the last program', 'warning');
            return;
        }
        
        const programToRemove = programNames[index];
        delete this.currentSettings.programs[programToRemove];
        
        this.loadProgramSettings();
        this.saveAcademicSettings();
    }
    
    updateProgramSettings() {
        const programFields = document.querySelectorAll('.program-field');
        const newPrograms = {};
        
        programFields.forEach((field, index) => {
            const nameInput = field.querySelector('.program-name');
            const durationInput = field.querySelector('.program-duration');
            const creditsInput = field.querySelector('.program-credits');
            
            const name = nameInput.value.trim();
            const duration = parseInt(durationInput.value) || 2;
            const credits = parseInt(creditsInput.value) || 120;
            
            if (name) {
                newPrograms[name] = {
                    duration: duration,
                    totalCredits: credits
                };
            }
        });
        
        this.currentSettings.programs = newPrograms;
        this.saveAcademicSettings();
    }
    
    // ==================== SAVE SETTINGS ====================
    
    async saveGeneralSettings() {
        try {
            console.log('💾 Saving general settings...');
            
            // Update current settings
            this.currentSettings.institute.name = this.getValue('instituteName');
            this.currentSettings.institute.abbreviation = this.getValue('instituteAbbreviation');
            this.currentSettings.academic.year = parseInt(this.getValue('academicYear')) || new Date().getFullYear();
            this.currentSettings.institute.timezone = this.getValue('timezone');
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('General settings saved successfully', 'success');
            await this.db.logActivity('settings_updated', 'Updated general settings');
            
        } catch (error) {
            console.error('Error saving general settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveAcademicSettings() {
        try {
            console.log('💾 Saving academic settings...');
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('Academic settings saved', 'success');
            
        } catch (error) {
            console.error('Error saving academic settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveSystemSettings() {
        try {
            console.log('💾 Saving system settings...');
            
            // Update current settings
            this.currentSettings.system.autoGenerateRegNumbers = this.getCheckbox('autoGenerateRegNumbers');
            this.currentSettings.system.allowMarkOverwrite = this.getCheckbox('allowMarkOverwrite');
            this.currentSettings.system.showGPA = this.getCheckbox('showGPA');
            this.currentSettings.system.defaultPassword = this.getValue('defaultPassword');
            this.currentSettings.system.sessionTimeout = parseInt(this.getValue('sessionTimeout')) || 30;
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('System settings saved', 'success');
            
        } catch (error) {
            console.error('Error saving system settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveToDatabase() {
        try {
            const supabase = await this.db.ensureConnected();
            
            // Check if settings already exist
            const { data: existing } = await supabase
                .from('settings')
                .select('id')
                .single();
            
            if (existing) {
                // Update existing settings
                const { error } = await supabase
                    .from('settings')
                    .update({
                        settings: this.currentSettings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                
                if (error) throw error;
            } else {
                // Insert new settings
                const { error } = await supabase
                    .from('settings')
                    .insert({
                        settings: this.currentSettings,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
            }
            
        } catch (error) {
            console.error('Error saving to database:', error);
            throw error;
        }
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }
    
    setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.value = value;
    }
    
    getCheckbox(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.checked : false;
    }
    
    setCheckbox(elementId, checked) {
        const element = document.getElementById(elementId);
        if (element) element.checked = checked;
    }
    
    getDefaultSettings() {
        return {
            institute: {
                name: 'Technical Education Institute',
                abbreviation: 'TEI',
                address: '',
                phone: '',
                email: '',
                website: '',
                timezone: 'Africa/Nairobi',
                logo: ''
            },
            academic: {
                year: new Date().getFullYear(),
                semester: 1,
                gradingScale: [
                    { grade: 'A', min: 80, max: 100, points: 4.0, description: 'Excellent' },
                    { grade: 'B', min: 70, max: 79, points: 3.0, description: 'Good' },
                    { grade: 'C', min: 60, max: 69, points: 2.0, description: 'Satisfactory' },
                    { grade: 'D', min: 50, max: 59, points: 1.0, description: 'Pass' },
                    { grade: 'F', min: 0, max: 49, points: 0.0, description: 'Fail' }
                ],
                assessmentTypes: ['Exam', 'Test', 'Assignment', 'Project', 'Presentation'],
                passingGrade: 'D',
                minAttendance: 75
            },
            programs: {
                'Diploma in IT': { duration: 2, totalCredits: 120 },
                'Diploma in Business': { duration: 2, totalCredits: 120 },
                'Certificate in Accounting': { duration: 1, totalCredits: 60 }
            },
            system: {
                autoGenerateRegNumbers: true,
                regNumberFormat: 'TEI/{year}/{program}/{seq:4}',
                allowMarkOverwrite: false,
                showGPA: true,
                defaultPassword: 'Welcome123',
                sessionTimeout: 30,
                maxLoginAttempts: 3,
                backupFrequency: 'weekly',
                dataRetentionYears: 5
            },
            notifications: {
                emailNotifications: true,
                markEntryAlerts: true,
                reportReadyAlerts: true,
                systemAlerts: true
            },
            export: {
                defaultFormat: 'csv',
                includeHeaders: true,
                dateFormat: 'DD/MM/YYYY',
                numberFormat: '0.00'
            }
        };
    }
    
    getCurrentSettings() {
        return this.currentSettings || this.defaultSettings;
    }
    
    async refreshSettings() {
        try {
            await this.loadSettings();
            this.showToast('Settings refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing settings:', error);
            this.showToast('Error refreshing settings', 'error');
        }
    }
    
    getGradeForPercentage(percentage) {
        const gradingScale = this.currentSettings.academic.gradingScale;
        
        for (const grade of gradingScale) {
            if (percentage >= grade.min && percentage <= grade.max) {
                return grade;
            }
        }
        
        return gradingScale[gradingScale.length - 1]; // Return lowest grade
    }
    
    calculateGradePoints(grade) {
        const gradeObj = this.currentSettings.academic.gradingScale.find(g => g.grade === grade);
        return gradeObj ? gradeObj.points : 0.0;
    }
    
    getProgramDuration(programName) {
        return this.currentSettings.programs[programName]?.duration || 2;
    }
    
    getProgramCredits(programName) {
        return this.currentSettings.programs[programName]?.totalCredits || 120;
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
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

// Make available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}
