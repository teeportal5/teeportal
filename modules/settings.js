// modules/settings.js - Settings Manager
class SettingsManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.defaultSettings = this.getDefaultSettings();
        this.currentSettings = null;
        this.uiInitialized = false;
        this.gradingScaleChanged = false;
        this.programsChanged = false;
    }
    
    // ==================== INITIALIZATION ====================
    
    async initializeSettingsUI() {
        try {
            if (this.uiInitialized) {
                console.log('Settings UI already initialized');
                return;
            }
            
            console.log('⚙️ Initializing Settings UI...');
            
            // Wait for DOM elements to be ready
            await this.waitForSettingsDOM();
            
            // Load settings from database or use defaults
            await this.loadSettings();
            
            // Setup tabs
            this.setupSettingsTabs();
            
            // Setup form submission
            this.setupFormEvents();
            
            // Setup buttons
            this.setupButtons();
            
            // Initialize all settings sections
            await this.initializeAllSettingsSections();
            
            this.uiInitialized = true;
            console.log('✅ Settings UI initialized');
            
        } catch (error) {
            console.error('Error initializing settings UI:', error);
            this.showToast('Error loading settings', 'error');
        }
    }
    
    waitForSettingsDOM() {
        return new Promise((resolve) => {
            const maxAttempts = 50;
            let attempts = 0;
            
            const checkDOM = () => {
                attempts++;
                
                // Check for essential elements
                const hasSettingsSection = document.getElementById('settings');
                const hasTabs = document.querySelectorAll('.settings-tab-btn').length > 0;
                const hasGeneralSettings = document.getElementById('generalSettings');
                
                if ((hasSettingsSection && hasTabs && hasGeneralSettings) || attempts >= maxAttempts) {
                    resolve();
                } else {
                    setTimeout(checkDOM, 100);
                }
            };
            
            checkDOM();
        });
    }
    
    async initializeAllSettingsSections() {
        try {
            // Load all settings sections
            await this.loadGeneralSettings();
            await this.loadAcademicSettings();
            await this.loadSystemSettings();
            
            console.log('✅ All settings sections loaded');
        } catch (error) {
            console.error('Error loading settings sections:', error);
        }
    }
    
    // ==================== TAB MANAGEMENT ====================
    
    setupSettingsTabs() {
        try {
            const tabButtons = document.querySelectorAll('.settings-tab-btn');
            const tabContents = document.querySelectorAll('.settings-tab-content');
            
            if (tabButtons.length === 0) {
                console.warn('Settings tabs not found');
                return;
            }
            
            tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Show corresponding content
                    const tabId = button.getAttribute('data-tab');
                    const contentId = `${tabId}Settings`;
                    const targetContent = document.getElementById(contentId);
                    
                    if (targetContent) {
                        targetContent.classList.add('active');
                        console.log(`Switched to ${tabId} settings`);
                        
                        // Refresh content if needed
                        this.refreshTabContent(tabId);
                    }
                });
            });
            
            console.log('✅ Settings tabs initialized');
            
        } catch (error) {
            console.error('Error setting up settings tabs:', error);
        }
    }
    
    refreshTabContent(tabId) {
        switch(tabId) {
            case 'academic':
                // Refresh academic settings
                this.loadGradingScale().catch(console.error);
                this.loadProgramSettings().catch(console.error);
                break;
            case 'system':
                // Refresh system settings
                this.loadSystemSettings();
                break;
            case 'general':
                // Refresh general settings
                this.loadGeneralSettings();
                break;
        }
    }
    
    // ==================== FORM & EVENT HANDLING ====================
    
    setupFormEvents() {
        // General Settings Form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGeneralSettings();
            });
            
            // Auto-save on blur for general settings
            const generalInputs = ['instituteName', 'instituteAbbreviation', 'academicYear', 'timezone'];
            generalInputs.forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('blur', () => {
                        if (this.uiInitialized) {
                            this.saveGeneralSettings();
                        }
                    });
                }
            });
        }
        
        // System Settings - Auto-save on change
        const systemCheckboxes = ['autoGenerateRegNumbers', 'allowMarkOverwrite', 'showGPA'];
        systemCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (this.uiInitialized) {
                        this.saveSystemSettings();
                    }
                });
            }
        });
        
        // System Settings - Auto-save on blur for inputs
        const systemInputs = ['defaultPassword', 'sessionTimeout'];
        systemInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', () => {
                    if (this.uiInitialized) {
                        this.saveSystemSettings();
                    }
                });
            }
        });
        
        console.log('✅ Form events setup complete');
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
        
        console.log('✅ Button events setup complete');
    }
    
    // ==================== LOAD SETTINGS ====================
    
    async loadSettings() {
        try {
            console.log('📋 Loading settings from database...');
            
            // Try to load from database
            const supabase = await this.db.ensureConnected();
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) {
                // Check if it's a "no rows" error
                if (error.code === 'PGRST116' || error.message.includes('No rows')) {
                    console.log('No settings found in database, using defaults');
                    this.currentSettings = { ...this.defaultSettings };
                } else {
                    throw error;
                }
            } else if (data && data.settings) {
                // Merge database settings with defaults
                this.currentSettings = { ...this.defaultSettings, ...data.settings };
                console.log('✅ Settings loaded from database');
            } else {
                this.currentSettings = { ...this.defaultSettings };
                console.log('✅ Using default settings');
            }
            
            // Ensure all required properties exist
            this.ensureSettingsStructure();
            
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.ensureSettingsStructure();
            this.showToast('Using default settings', 'warning');
        }
    }
    
    ensureSettingsStructure() {
        // Ensure all default properties exist in current settings
        const ensureNested = (obj, defaults) => {
            for (const key in defaults) {
                if (typeof defaults[key] === 'object' && defaults[key] !== null) {
                    if (!obj[key] || typeof obj[key] !== 'object') {
                        obj[key] = { ...defaults[key] };
                    } else {
                        ensureNested(obj[key], defaults[key]);
                    }
                } else if (!obj.hasOwnProperty(key)) {
                    obj[key] = defaults[key];
                }
            }
        };
        
        ensureNested(this.currentSettings, this.defaultSettings);
    }
    
    async loadGeneralSettings() {
        try {
            if (!this.currentSettings) {
                await this.loadSettings();
            }
            
            // Populate form fields
            this.setValue('instituteName', this.currentSettings.institute.name);
            this.setValue('instituteAbbreviation', this.currentSettings.institute.abbreviation);
            this.setValue('academicYear', this.currentSettings.academic.year);
            this.setValue('timezone', this.currentSettings.institute.timezone);
            
            console.log('✅ General settings loaded');
            
        } catch (error) {
            console.error('Error loading general settings:', error);
        }
    }
    
    async loadAcademicSettings() {
        try {
            await this.loadGradingScale();
            await this.loadProgramSettings();
            console.log('✅ Academic settings loaded');
        } catch (error) {
            console.error('Error loading academic settings:', error);
        }
    }
    
    async loadGradingScale() {
        try {
            if (!this.currentSettings) {
                await this.loadSettings();
            }
            
            const gradingScale = this.currentSettings.academic.gradingScale || [];
            const tbody = document.getElementById('grading-scale-body');
            
            if (!tbody) {
                console.warn('Grading scale table body not found');
                return;
            }
            
            tbody.innerHTML = '';
            
            if (gradingScale.length === 0) {
                // Add default rows if empty
                const defaultScale = this.defaultSettings.academic.gradingScale;
                this.currentSettings.academic.gradingScale = [...defaultScale];
                gradingScale.push(...defaultScale);
            }
            
            gradingScale.forEach((grade, index) => {
                const row = this.createGradeRow(grade, index);
                tbody.appendChild(row);
            });
            
            console.log(`✅ Grading scale loaded (${gradingScale.length} grades)`);
            
        } catch (error) {
            console.error('Error loading grading scale:', error);
        }
    }
    
    async loadProgramSettings() {
        try {
            if (!this.currentSettings) {
                await this.loadSettings();
            }
            
            const programs = this.currentSettings.programs || {};
            const container = document.getElementById('programs-settings');
            
            if (!container) {
                console.warn('Programs container not found');
                return;
            }
            
            container.innerHTML = '';
            
            const programEntries = Object.entries(programs);
            
            if (programEntries.length === 0) {
                // Add default programs if empty
                const defaultPrograms = this.defaultSettings.programs;
                this.currentSettings.programs = { ...defaultPrograms };
                Object.assign(programs, defaultPrograms);
            }
            
            programEntries.forEach(([programName, programData], index) => {
                const programDiv = this.createProgramField(programName, programData, index);
                container.appendChild(programDiv);
            });
            
            console.log(`✅ Program settings loaded (${programEntries.length} programs)`);
            
        } catch (error) {
            console.error('Error loading program settings:', error);
        }
    }
    
    loadSystemSettings() {
        try {
            if (!this.currentSettings) return;
            
            // Set checkbox values
            this.setCheckbox('autoGenerateRegNumbers', this.currentSettings.system.autoGenerateRegNumbers);
            this.setCheckbox('allowMarkOverwrite', this.currentSettings.system.allowMarkOverwrite);
            this.setCheckbox('showGPA', this.currentSettings.system.showGPA);
            
            // Set input values
            this.setValue('defaultPassword', this.currentSettings.system.defaultPassword);
            this.setValue('sessionTimeout', this.currentSettings.system.sessionTimeout);
            
            console.log('✅ System settings loaded');
            
        } catch (error) {
            console.error('Error loading system settings:', error);
        }
    }
    
    // ==================== CREATE UI ELEMENTS ====================
    
    createGradeRow(grade, index) {
        const row = document.createElement('tr');
        row.className = 'grade-row';
        
        row.innerHTML = `
            <td>
                <input type="text" class="form-control grade-letter" value="${grade.grade || ''}" 
                       data-index="${index}" placeholder="A" maxlength="2">
            </td>
            <td>
                <input type="number" class="form-control grade-min" value="${grade.min || 0}" 
                       min="0" max="100" data-index="${index}" placeholder="0">
            </td>
            <td>
                <input type="number" class="form-control grade-max" value="${grade.max || 0}" 
                       min="0" max="100" data-index="${index}" placeholder="100">
            </td>
            <td>
                <input type="number" class="form-control grade-points" value="${grade.points || 0}" 
                       step="0.1" min="0" max="4" data-index="${index}" placeholder="4.0">
            </td>
            <td>
                <input type="text" class="form-control grade-description" value="${grade.description || ''}" 
                       data-index="${index}" placeholder="Excellent">
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-danger btn-remove-grade" 
                        data-index="${index}" title="Remove Grade">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Add event listeners to inputs for auto-save
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (this.uiInitialized) {
                    this.updateGradingScale();
                }
            });
        });
        
        // Add event listener to remove button
        const removeBtn = row.querySelector('.btn-remove-grade');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.removeGradeRow(index);
        });
        
        return row;
    }
    
    createProgramField(programName, programData, index) {
        const div = document.createElement('div');
        div.className = 'program-field mb-3 p-3 border rounded';
        
        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-5">
                    <label class="form-label">Program Name</label>
                    <input type="text" class="form-control program-name" 
                           value="${programName || ''}" placeholder="e.g., Diploma in IT"
                           data-index="${index}">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Duration (years)</label>
                    <input type="number" class="form-control program-duration" 
                           value="${programData.duration || 2}" placeholder="2"
                           min="1" max="6" data-index="${index}">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Total Credits</label>
                    <input type="number" class="form-control program-credits" 
                           value="${programData.totalCredits || 120}" placeholder="120"
                           min="1" max="200" data-index="${index}">
                </div>
                <div class="col-md-1">
                    <label class="form-label d-block">&nbsp;</label>
                    <button type="button" class="btn btn-danger btn-remove-program w-100" 
                            data-index="${index}" title="Remove Program">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for auto-save
        const inputs = div.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (this.uiInitialized) {
                    this.updateProgramSettings();
                }
            });
        });
        
        // Add event listener to remove button
        const removeBtn = div.querySelector('.btn-remove-program');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.removeProgramField(index);
        });
        
        return div;
    }
    
    // ==================== CRUD OPERATIONS ====================
    
    addGradeRow() {
        try {
            if (!this.currentSettings) return;
            
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
            this.showToast('Grade row added', 'success');
            
        } catch (error) {
            console.error('Error adding grade row:', error);
            this.showToast('Error adding grade', 'error');
        }
    }
    
    removeGradeRow(index) {
        try {
            if (!this.currentSettings) return;
            
            if (this.currentSettings.academic.gradingScale.length <= 1) {
                this.showToast('Cannot remove the last grade', 'warning');
                return;
            }
            
            // Get grade being removed for confirmation
            const gradeToRemove = this.currentSettings.academic.gradingScale[index];
            
            if (confirm(`Remove grade "${gradeToRemove.grade}"?`)) {
                this.currentSettings.academic.gradingScale.splice(index, 1);
                this.loadGradingScale();
                this.saveAcademicSettings();
                this.showToast('Grade removed', 'success');
            }
            
        } catch (error) {
            console.error('Error removing grade row:', error);
            this.showToast('Error removing grade', 'error');
        }
    }
    
    updateGradingScale() {
        try {
            if (!this.currentSettings) return;
            
            // Get all grade rows
            const gradeRows = document.querySelectorAll('.grade-row');
            const newGradingScale = [];
            
            gradeRows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                if (inputs.length >= 5) {
                    const grade = {
                        grade: inputs[0].value.trim() || 'A',
                        min: parseFloat(inputs[1].value) || 0,
                        max: parseFloat(inputs[2].value) || 0,
                        points: parseFloat(inputs[3].value) || 0,
                        description: inputs[4].value.trim() || ''
                    };
                    
                    // Validate grade
                    if (grade.grade && !isNaN(grade.min) && !isNaN(grade.max) && !isNaN(grade.points)) {
                        newGradingScale.push(grade);
                    }
                }
            });
            
            // Sort by min percentage
            newGradingScale.sort((a, b) => a.min - b.min);
            
            // Update current settings
            this.currentSettings.academic.gradingScale = newGradingScale;
            
            // Auto-save
            this.saveAcademicSettings();
            
        } catch (error) {
            console.error('Error updating grading scale:', error);
        }
    }
    
    addProgramField() {
        try {
            if (!this.currentSettings) return;
            
            const programCount = Object.keys(this.currentSettings.programs).length;
            const newProgramName = `New Program ${programCount + 1}`;
            
            this.currentSettings.programs[newProgramName] = {
                duration: 2,
                totalCredits: 120
            };
            
            this.loadProgramSettings();
            this.saveAcademicSettings();
            this.showToast('Program field added', 'success');
            
        } catch (error) {
            console.error('Error adding program field:', error);
            this.showToast('Error adding program', 'error');
        }
    }
    
    removeProgramField(index) {
        try {
            if (!this.currentSettings) return;
            
            const programNames = Object.keys(this.currentSettings.programs);
            if (programNames.length <= 1) {
                this.showToast('Cannot remove the last program', 'warning');
                return;
            }
            
            const programToRemove = programNames[index];
            
            if (confirm(`Remove program "${programToRemove}"?`)) {
                delete this.currentSettings.programs[programToRemove];
                this.loadProgramSettings();
                this.saveAcademicSettings();
                this.showToast('Program removed', 'success');
            }
            
        } catch (error) {
            console.error('Error removing program field:', error);
            this.showToast('Error removing program', 'error');
        }
    }
    
    updateProgramSettings() {
        try {
            if (!this.currentSettings) return;
            
            const programFields = document.querySelectorAll('.program-field');
            const newPrograms = {};
            
            programFields.forEach((field, index) => {
                const nameInput = field.querySelector('.program-name');
                const durationInput = field.querySelector('.program-duration');
                const creditsInput = field.querySelector('.program-credits');
                
                const name = nameInput ? nameInput.value.trim() : '';
                const duration = durationInput ? parseInt(durationInput.value) || 2 : 2;
                const credits = creditsInput ? parseInt(creditsInput.value) || 120 : 120;
                
                if (name) {
                    newPrograms[name] = {
                        duration: Math.max(1, Math.min(6, duration)),
                        totalCredits: Math.max(1, Math.min(200, credits))
                    };
                }
            });
            
            // Ensure at least one program exists
            if (Object.keys(newPrograms).length === 0) {
                newPrograms['Default Program'] = {
                    duration: 2,
                    totalCredits: 120
                };
            }
            
            this.currentSettings.programs = newPrograms;
            this.saveAcademicSettings();
            
        } catch (error) {
            console.error('Error updating program settings:', error);
        }
    }
    
    // ==================== SAVE OPERATIONS ====================
    
    async saveGeneralSettings() {
        try {
            if (!this.currentSettings) return;
            
            console.log('💾 Saving general settings...');
            
            // Validate and update settings
            this.currentSettings.institute.name = this.getValue('instituteName') || this.defaultSettings.institute.name;
            this.currentSettings.institute.abbreviation = this.getValue('instituteAbbreviation') || this.defaultSettings.institute.abbreviation;
            
            const academicYear = parseInt(this.getValue('academicYear'));
            this.currentSettings.academic.year = !isNaN(academicYear) ? academicYear : new Date().getFullYear();
            
            this.currentSettings.institute.timezone = this.getValue('timezone') || this.defaultSettings.institute.timezone;
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('General settings saved successfully', 'success');
            await this.logActivity('settings_updated', 'Updated general settings');
            
        } catch (error) {
            console.error('❌ Error saving general settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveAcademicSettings() {
        try {
            if (!this.currentSettings) return;
            
            console.log('💾 Saving academic settings...');
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('Academic settings saved', 'success');
            
        } catch (error) {
            console.error('❌ Error saving academic settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveSystemSettings() {
        try {
            if (!this.currentSettings) return;
            
            console.log('💾 Saving system settings...');
            
            // Update current settings
            this.currentSettings.system.autoGenerateRegNumbers = this.getCheckbox('autoGenerateRegNumbers');
            this.currentSettings.system.allowMarkOverwrite = this.getCheckbox('allowMarkOverwrite');
            this.currentSettings.system.showGPA = this.getCheckbox('showGPA');
            
            this.currentSettings.system.defaultPassword = this.getValue('defaultPassword') || this.defaultSettings.system.defaultPassword;
            
            const sessionTimeout = parseInt(this.getValue('sessionTimeout'));
            this.currentSettings.system.sessionTimeout = !isNaN(sessionTimeout) ? Math.max(5, Math.min(120, sessionTimeout)) : 30;
            
            // Save to database
            await this.saveToDatabase();
            
            this.showToast('System settings saved', 'success');
            
        } catch (error) {
            console.error('❌ Error saving system settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }
    
    async saveToDatabase() {
        try {
            if (!this.currentSettings) {
                throw new Error('No settings to save');
            }
            
            const supabase = await this.db.ensureConnected();
            
            // First, check if settings exist
            const { data: existing, error: fetchError } = await supabase
                .from('settings')
                .select('id')
                .limit(1);
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            
            const now = new Date().toISOString();
            
            if (existing && existing.length > 0) {
                // Update existing settings
                const { error } = await supabase
                    .from('settings')
                    .update({
                        settings: this.currentSettings,
                        updated_at: now
                    })
                    .eq('id', existing[0].id);
                
                if (error) throw error;
                console.log('✅ Settings updated in database');
            } else {
                // Insert new settings
                const { error } = await supabase
                    .from('settings')
                    .insert({
                        settings: this.currentSettings,
                        created_at: now,
                        updated_at: now
                    });
                
                if (error) throw error;
                console.log('✅ Settings inserted into database');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving to database:', error);
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
        if (element) {
            element.value = value || '';
        }
    }
    
    getCheckbox(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.checked : false;
    }
    
    setCheckbox(elementId, checked) {
        const element = document.getElementById(elementId);
        if (element) {
            element.checked = !!checked;
        }
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
            await this.loadGeneralSettings();
            await this.loadAcademicSettings();
            this.loadSystemSettings();
            this.showToast('Settings refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing settings:', error);
            this.showToast('Error refreshing settings', 'error');
        }
    }
    
    getGradeForPercentage(percentage) {
        if (!this.currentSettings || !this.currentSettings.academic.gradingScale) {
            return this.defaultSettings.academic.gradingScale[0];
        }
        
        const gradingScale = this.currentSettings.academic.gradingScale;
        
        for (const grade of gradingScale) {
            if (percentage >= grade.min && percentage <= grade.max) {
                return grade;
            }
        }
        
        // Return lowest grade if no match
        return gradingScale[gradingScale.length - 1] || this.defaultSettings.academic.gradingScale[0];
    }
    
    calculateGradePoints(grade) {
        if (!this.currentSettings || !this.currentSettings.academic.gradingScale) {
            return 0.0;
        }
        
        const gradeObj = this.currentSettings.academic.gradingScale.find(g => g.grade === grade);
        return gradeObj ? gradeObj.points : 0.0;
    }
    
    getProgramDuration(programName) {
        if (!this.currentSettings || !this.currentSettings.programs) {
            return 2;
        }
        
        return this.currentSettings.programs[programName]?.duration || 2;
    }
    
    getProgramCredits(programName) {
        if (!this.currentSettings || !this.currentSettings.programs) {
            return 120;
        }
        
        return this.currentSettings.programs[programName]?.totalCredits || 120;
    }
    
    async logActivity(type, description) {
        try {
            if (this.db && this.db.logActivity) {
                await this.db.logActivity(type, description);
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                                type === 'error' ? 'fa-exclamation-circle' : 
                                type === 'warning' ? 'fa-exclamation-triangle' : 
                                'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    // ==================== RESET / EXPORT ====================
    
    async resetToDefaults() {
        try {
            if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                this.currentSettings = { ...this.defaultSettings };
                await this.saveToDatabase();
                await this.refreshSettings();
                this.showToast('Settings reset to defaults', 'success');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showToast('Error resetting settings', 'error');
        }
    }
    
    async exportSettings() {
        try {
            const settings = this.getCurrentSettings();
            const jsonStr = JSON.stringify(settings, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teeportal-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.showToast('Settings exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showToast('Error exporting settings', 'error');
        }
    }
    
    async importSettings(file) {
        try {
            const text = await file.text();
            const importedSettings = JSON.parse(text);
            
            // Validate imported settings
            if (!importedSettings.institute || !importedSettings.academic) {
                throw new Error('Invalid settings file format');
            }
            
            // Merge with defaults to ensure all properties exist
            const mergedSettings = { ...this.defaultSettings, ...importedSettings };
            this.currentSettings = mergedSettings;
            
            await this.saveToDatabase();
            await this.refreshSettings();
            
            this.showToast('Settings imported successfully', 'success');
        } catch (error) {
            console.error('Error importing settings:', error);
            this.showToast('Error importing settings: ' + error.message, 'error');
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}
