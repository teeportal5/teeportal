// modules/students.js - COMPLETE FIXED VERSION
class StudentManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.ui = {
            showToast: (message, type = 'info') => {
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(message, type);
                } else {
                    console.log(`${type}: ${message}`);
                    // Simple toast fallback
                    const toast = document.createElement('div');
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                        color: white;
                        border-radius: 8px;
                        z-index: 9999;
                        animation: slideIn 0.3s ease;
                    `;
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }
            },
            closeModal: (id) => {
                window.closeModal?.(id) || (() => {
                    const modal = document.getElementById(id);
                    if (modal) {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                })();
            },
            openModal: (id) => {
                window.openModal?.(id) || (() => {
                    const modal = document.getElementById(id);
                    if (modal) {
                        modal.classList.add('active');
                        modal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                    }
                })();
            }
        };
        this.currentEditId = null;
        this.selectedStudents = new Set();
        this.centres = [];
        this.programs = [];
        this.isDataLoaded = false;
        this.loadingAttempts = 0;
        this.maxLoadingAttempts = 5;
    }

    /**
     * Initialize student module with retry logic
     */
    async init() {
        console.log('🎓 StudentManager initializing...');
        
        // Load centres and programs with retry mechanism
        await this._loadDataWithRetry();
        
        // Attach event listeners
        this._attachEventListeners();
        
        // Load students table
        await this.loadStudentsTable();
        
        // Setup bulk actions and modal handlers
        this._setupBulkActions();
        this._setupModalHandlers();
        
        // Populate intake years
        await this._populateIntakeYears();
        
        console.log('✅ StudentManager initialized successfully');
        this.isDataLoaded = true;
    }

    /**
     * Load data with retry mechanism
     */
    async _loadDataWithRetry() {
        while (this.loadingAttempts < this.maxLoadingAttempts && !this.isDataLoaded) {
            try {
                console.log(`🔄 Loading data (attempt ${this.loadingAttempts + 1}/${this.maxLoadingAttempts})...`);
                
                // Load programs
                if (this.db.getPrograms) {
                    const rawPrograms = await this.db.getPrograms();
                    console.log('📦 Raw programs data:', rawPrograms);
                    
                    if (rawPrograms && rawPrograms.length > 0) {
                        this.programs = rawPrograms;
                        console.log(`✅ Loaded ${this.programs.length} programs`);
                        
                        // Populate program dropdown
                        this.populateProgramSelect();
                    } else {
                        console.warn('⚠️ No programs returned from database');
                    }
                }
                
                // Load centres
                if (this.db.getCentres) {
                    this.centres = await this.db.getCentres();
                    console.log(`📍 Loaded ${this.centres.length} centres`);
                    
                    // Populate centre dropdown
                    this.populateCentreSelect();
                }
                
                // If we got here without errors, break the loop
                if (this.programs.length > 0 || this.centres.length > 0) {
                    this.isDataLoaded = true;
                    break;
                }
                
            } catch (error) {
                console.error(`❌ Loading attempt ${this.loadingAttempts + 1} failed:`, error);
                this.loadingAttempts++;
                
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, this.loadingAttempts), 10000);
                console.log(`⏳ Waiting ${delay}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // On last attempt, initialize with empty arrays
                if (this.loadingAttempts >= this.maxLoadingAttempts) {
                    console.warn('⚠️ Max loading attempts reached, initializing with empty data');
                    this.programs = this.programs || [];
                    this.centres = this.centres || [];
                    
                    // Still populate dropdowns (will show empty/placeholder)
                    this.populateProgramSelect();
                    this.populateCentreSelect();
                    break;
                }
            }
        }
    }

    /**
     * Load centres and programs
     */
    async _loadCentresAndPrograms() {
        try {
            // Load programs
            if (this.db.getPrograms) {
                const rawPrograms = await this.db.getPrograms();
                console.log('📦 Raw programs data from database:', rawPrograms);
                
                this.programs = rawPrograms || [];
                console.log(`🎓 Loaded ${this.programs.length} programs`);
                
                // Debug each program
                this.programs.forEach((p, i) => {
                    console.log(`Program ${i}: id="${p.id}", code="${p.code}", name="${p.name}"`);
                });
            }
            
            // Load centres
            if (this.db.getCentres) {
                this.centres = await this.db.getCentres() || [];
                console.log(`📍 Loaded ${this.centres.length} centres`);
            }
        } catch (error) {
            console.error('Error loading centres/programs:', error);
            // Ensure arrays are initialized even if empty
            this.programs = this.programs || [];
            this.centres = this.centres || [];
        }
    }

    /**
     * Populate program select dropdown
     */
    populateProgramSelect() {
        const select = document.getElementById('studentProgram');
        if (!select) {
            console.warn('studentProgram select element not found');
            return;
        }
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Program</option>';
        
        console.log('🔍 Available programs:', this.programs);
        
        if (this.programs && this.programs.length > 0) {
            console.log(`📝 Adding ${this.programs.length} programs to dropdown`);
            
            this.programs.forEach(p => {
                const option = document.createElement('option');
                
                // Use program CODE as value
                const programCode = p.code ? p.code.trim() : '';
                option.value = programCode;
                
                // Display format
                option.textContent = `${programCode} - ${p.name || 'Unnamed Program'}`;
                
                // Set data-program-id attribute
                if (p.id) {
                    option.setAttribute('data-program-id', p.id);
                } else {
                    console.warn(`⚠️ Program "${programCode}" has no ID`);
                }
                
                select.appendChild(option);
            });
            
            if (currentValue && currentValue !== '') {
                select.value = currentValue;
            }
            
            console.log(`✅ Populated ${this.programs.length} programs in dropdown`);
        } else {
            console.warn('⚠️ No programs available to populate dropdown');
            
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No programs available - Loading...';
            option.disabled = true;
            select.appendChild(option);
            
            // Try to reload after delay
            setTimeout(() => {
                if (this.programs.length === 0) {
                    console.log('🔄 Attempting to reload programs...');
                    this._loadCentresAndPrograms().then(() => {
                        this.populateProgramSelect();
                    });
                }
            }, 2000);
        }
    }

    /**
     * Populate centre select dropdown
     */
    populateCentreSelect() {
        const select = document.getElementById('studentCentre');
        if (!select) {
            console.warn('studentCentre select element not found');
            return;
        }
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Centre</option>';
        
        if (this.centres && this.centres.length > 0) {
            this.centres.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${c.name} (${c.code || c.county || 'Centre'})`;
                select.appendChild(option);
            });
            
            if (currentValue && currentValue !== '') {
                select.value = currentValue;
            }
            
            console.log(`✅ Populated ${this.centres.length} centres in dropdown`);
        } else {
            console.warn('No centres available to populate dropdown');
            
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No centres available - Loading...';
            option.disabled = true;
            select.appendChild(option);
        }
    }

    /**
     * Emergency fix for missing data-program-id attributes
     */
    _fixMissingProgramIds() {
        const programSelect = document.getElementById('studentProgram');
        if (!programSelect) return;
        
        const options = Array.from(programSelect.options);
        let fixedCount = 0;
        
        options.forEach(option => {
            if (option.value && !option.hasAttribute('data-program-id')) {
                const program = this.programs.find(p => p.code === option.value);
                if (program && program.id) {
                    option.setAttribute('data-program-id', program.id);
                    fixedCount++;
                    console.log(`🛠️ Fixed: Added data-program-id="${program.id}" to "${option.value}"`);
                }
            }
        });
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} missing data-program-id attributes`);
        }
    }

    /**
     * Get centre name by ID
     */
    _getCentreName(centreId) {
        if (!centreId) return 'Not assigned';
        const centre = this.centres.find(c => c.id === centreId);
        return centre ? centre.name : `Centre ${centreId.substring(0, 8)}`;
    }

    /**
     * Get program name by code
     */
    _getProgramName(programCode) {
        if (!programCode) return 'Not assigned';
        const program = this.programs.find(p => p.code === programCode);
        return program ? `${program.code} - ${program.name}` : programCode;
    }

    /**
     * Generate registration number based on program and intake year
     */
    async generateRegNumber() {
        try {
            const programSelect = document.getElementById('studentProgram');
            const intakeSelect = document.getElementById('studentIntake');
            const regNumberInput = document.getElementById('studentRegNumber');
            
            if (!programSelect || !intakeSelect || !regNumberInput) {
                console.warn('Required elements not found for registration number generation');
                return;
            }
            
            const programCode = programSelect.value;
            const intakeYear = intakeSelect.value;
            
            console.log('🔢 Generating reg number with:', { programCode, intakeYear });
            
            if (!programCode || !intakeYear) {
                regNumberInput.value = '';
                this.ui.showToast('Select program and intake year first', 'warning');
                return;
            }
            
            // Try database method first
            try {
                const regNumber = await this.db.generateRegistrationNumber(programCode, intakeYear);
                
                if (regNumber) {
                    console.log('✅ Generated registration number (database):', regNumber);
                    regNumberInput.value = regNumber;
                    
                    const formatSpan = document.getElementById('regNumberFormat');
                    if (formatSpan) {
                        formatSpan.textContent = `${programCode}-${intakeYear}-###`;
                    }
                } else {
                    throw new Error('Database method returned null');
                }
            } catch (dbError) {
                console.warn('Database method failed, using fallback:', dbError);
                
                // Manual generation as fallback
                const allStudents = await this.db.getStudents();
                const matchingStudents = allStudents.filter(student => 
                    student.program === programCode && 
                    student.intake_year === parseInt(intakeYear)
                );
                
                let highestSeq = 0;
                matchingStudents.forEach(student => {
                    if (student.reg_number) {
                        const parts = student.reg_number.split('-');
                        if (parts.length === 3 && parts[0] === programCode && parts[1] === intakeYear) {
                            const seq = parseInt(parts[2]);
                            if (!isNaN(seq) && seq > highestSeq) {
                                highestSeq = seq;
                            }
                        }
                    }
                });
                
                const sequenceNumber = highestSeq + 1;
                const regNumber = `${programCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
                
                console.log('✅ Generated registration number (fallback):', regNumber);
                regNumberInput.value = regNumber;
                
                const formatSpan = document.getElementById('regNumberFormat');
                if (formatSpan) {
                    formatSpan.textContent = `${programCode}-${intakeYear}-###`;
                }
            }
            
            return regNumberInput.value;
        } catch (error) {
            console.error('Error generating registration number:', error);
            this.ui.showToast('Error generating registration number', 'error');
            return null;
        }
    }

    /**
     * Populate intake year dropdown
     */
    async _populateIntakeYears(studentIntakeYear = null) {
        try {
            const intakeSelect = document.getElementById('studentIntake');
            if (!intakeSelect) {
                console.warn('studentIntake dropdown not found');
                return;
            }
            
            intakeSelect.innerHTML = '<option value="">Select Intake Year</option>';
            const currentYear = new Date().getFullYear();
            
            if (studentIntakeYear) {
                const year = parseInt(studentIntakeYear);
                if (!isNaN(year)) {
                    const studentOption = document.createElement('option');
                    studentOption.value = year;
                    studentOption.textContent = year;
                    studentOption.selected = true;
                    intakeSelect.appendChild(studentOption);
                    console.log(`✅ Added student's intake year: ${year}`);
                }
            }
            
            for (let i = 0; i <= 10; i++) {
                const year = currentYear - i;
                if (studentIntakeYear && year === parseInt(studentIntakeYear)) continue;
                
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                
                if (!studentIntakeYear && i === 0) {
                    option.selected = true;
                }
                
                intakeSelect.appendChild(option);
            }
            
            for (let i = 1; i <= 2; i++) {
                const year = currentYear + i;
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeSelect.appendChild(option);
            }
            
            console.log(`✅ Populated intake years dropdown`);
        } catch (error) {
            console.error('Error populating intake years:', error);
        }
    }

    /**
     * Attach all event listeners
     */
    _attachEventListeners() {
        // Form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        // Search input
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', () => this.searchStudents());
        }
        
        // Filter changes
        ['filterCounty', 'filterCentre', 'filterProgram', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterStudents());
            }
        });
        
        // Export buttons
        const exportBtn = document.querySelector('[onclick*="exportStudents"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStudents());
        }
        
        // Import button
        const importBtn = document.getElementById('importStudentsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this._openImportModal());
        }
        
        // Bulk action buttons
        const bulkStatusBtn = document.getElementById('bulkStatusBtn');
        if (bulkStatusBtn) {
            bulkStatusBtn.addEventListener('click', () => this._showBulkStatusModal());
        }
        
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this._showBulkDeleteModal());
        }
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllStudents');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this._toggleSelectAllStudents(e.target.checked);
            });
        }
        
        // Registration number generation triggers
        const programSelect = document.getElementById('studentProgram');
        const intakeSelect = document.getElementById('studentIntake');
        
        if (programSelect) {
            programSelect.addEventListener('change', () => this.generateRegNumber());
        }
        if (intakeSelect) {
            intakeSelect.addEventListener('change', () => this.generateRegNumber());
        }
        
        console.log('✅ Student event listeners attached');
    }

    /**
     * Setup modal handlers
     */
    _setupModalHandlers() {
        const studentModal = document.getElementById('studentModal');
        if (studentModal) {
            const closeBtn = studentModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                });
            }
            
            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal && activeModal.id === 'studentModal') {
                    this._resetStudentForm();
                    this.ui.closeModal(activeModal.id);
                }
            }
        });
        
        console.log('✅ Modal handlers setup');
    }

    /**
     * Save or update student
     */
    async saveStudent(event) {
        event.preventDefault();
        
        // Emergency fix for missing data-program-id attributes
        this._fixMissingProgramIds();
        
        const form = event.target;
        if (!form || form.id !== 'studentForm') return;

        try {
            const programSelect = document.getElementById('studentProgram');
            const selectedOption = programSelect?.options[programSelect?.selectedIndex];
            
            let programCode = '';
            let programId = null;
            let programName = '';
            
            if (selectedOption && selectedOption.value) {
                programCode = selectedOption.value;
                programId = selectedOption.getAttribute('data-program-id');
                const optionText = selectedOption.textContent || '';
                if (optionText.includes(' - ')) {
                    programName = optionText.split(' - ')[1].trim();
                }
                
                console.log('📊 Program selection debug:', {
                    optionText: optionText,
                    value: selectedOption.value,
                    programCode: programCode,
                    programId: programId,
                    programName: programName
                });
            }

            if (programCode.includes(' - ')) {
                console.warn('⚠️ Program code contains " - ", cleaning up...');
                programCode = programCode.split(' - ')[0].trim();
            }

            const centreSelect = document.getElementById('studentCentre');
            const selectedCentreId = centreSelect?.value || '';
            const selectedCentreOption = centreSelect?.options[centreSelect?.selectedIndex];
            const selectedCentreText = selectedCentreOption?.text || '';
            let centreName = '';
            
            if (selectedCentreText && selectedCentreText !== 'Select Centre') {
                const match = selectedCentreText.match(/^([^(]+)/);
                centreName = match ? match[0].trim() : selectedCentreText;
            } else if (selectedCentreId && this.centres.length > 0) {
                const centre = this.centres.find(c => c.id === selectedCentreId);
                centreName = centre ? centre.name : '';
            }

            const formData = {
                reg_number: document.getElementById('studentRegNumber')?.value.trim() || '',
                full_name: document.getElementById('studentName')?.value.trim() || '',
                email: document.getElementById('studentEmail')?.value.trim() || '',
                phone: document.getElementById('studentPhone')?.value.trim() || '',
                date_of_birth: document.getElementById('studentDOB')?.value || '',
                id_number: document.getElementById('studentIdNumber')?.value.trim() || '',
                gender: document.getElementById('studentGender')?.value || '',
                county: document.getElementById('studentCounty')?.value || '',
                region: document.getElementById('studentRegion')?.value.trim() || '',
                ward: document.getElementById('studentWard')?.value.trim() || '',
                village: document.getElementById('studentVillage')?.value.trim() || '',
                address: document.getElementById('studentAddress')?.value.trim() || '',
                program_id: programId,
                program: programCode,
                code: programCode,
                program_name: programName || programCode,
                intake_year: parseInt(document.getElementById('studentIntake')?.value) || new Date().getFullYear(),
                centre_id: selectedCentreId || '',
                centre: centreName || '',
                study_mode: document.getElementById('studentStudyMode')?.value || 'fulltime',
                status: document.getElementById('studentStatus')?.value || 'active',
                registration_date: new Date().toISOString().split('T')[0],
                employment_status: document.getElementById('studentEmployment')?.value || '',
                employer: document.getElementById('studentEmployer')?.value.trim() || '',
                job_title: document.getElementById('studentJobTitle')?.value.trim() || '',
                years_experience: parseInt(document.getElementById('studentExperience')?.value) || 0,
                emergency_contact_name: document.getElementById('studentEmergencyName')?.value.trim() || '',
                emergency_contact_phone: document.getElementById('studentEmergencyPhone')?.value.trim() || '',
                emergency_contact_relationship: document.getElementById('studentEmergencyContact')?.value.trim() || '',
                emergency_contact: document.getElementById('studentEmergencyPhone')?.value.trim() || '',
                notes: document.getElementById('studentNotes')?.value.trim() || ''
            };

            console.log('✅ Form data prepared for insert/update:', formData);
            
            if (!formData.program_id) {
                console.error('❌ PROGRAM_ID IS NULL!');
                if (programCode && this.programs.length > 0) {
                    const programObj = this.programs.find(p => p.code === programCode);
                    if (programObj) {
                        formData.program_id = programObj.id;
                        console.log('✅ Found program ID from loaded programs:', programObj.id);
                    }
                }
            }

            const requiredFields = ['reg_number', 'full_name', 'email', 'program_id', 'intake_year'];
            const missingFields = requiredFields.filter(field => !formData[field]);
            
            if (missingFields.length > 0) {
                console.error('❌ Missing required fields:', missingFields);
                this.ui.showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
                return;
            }

            if (!this._validateEmail(formData.email)) {
                this.ui.showToast('Please enter a valid email address', 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            let result;
            if (this.currentEditId) {
                result = await this.db.updateStudent(this.currentEditId, formData);
                this.ui.showToast(`Student updated successfully!`, 'success');
            } else {
                result = await this.db.addStudent(formData);
                const regNumber = result.reg_number || formData.reg_number;
                this.ui.showToast(`Student registered successfully! Registration Number: ${regNumber}`, 'success');
            }

            this._resetStudentForm();
            this.ui.closeModal('studentModal');
            await this.loadStudentsTable();

        } catch (error) {
            console.error('❌ Error saving student:', error);
            this.ui.showToast(error.message || 'Error saving student data', 'error');
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId 
                    ? '<i class="fas fa-save"></i> Update Student'
                    : '<i class="fas fa-plus"></i> Register Student';
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Edit student
     */
    async editStudent(studentId) {
        try {
            console.log(`✏️ Editing student ${studentId}...`);
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            this.currentEditId = studentId;
            
            console.log('📋 Student data from database:', student);
            
            await this._populateIntakeYears(student.intake_year);
            
            const fieldMap = {
                'studentRegNumber': student.reg_number || '',
                'studentName': student.full_name || '',
                'studentEmail': student.email || '',
                'studentPhone': student.phone || '',
                'studentDOB': student.date_of_birth ? this._formatDateForInput(student.date_of_birth) : '',
                'studentIdNumber': student.id_number || '',
                'studentGender': student.gender || '',
                'studentCounty': student.county || '',
                'studentRegion': student.region || student.sub_county || '',
                'studentWard': student.ward || '',
                'studentVillage': student.village || '',
                'studentAddress': student.address || '',
                'studentProgram': student.program || '',
                'studentCentre': student.centre_id || student.centre || '',
                'studentStudyMode': student.study_mode || 'fulltime',
                'studentStatus': student.status || 'active',
                'studentEmployment': student.employment_status || '',
                'studentEmployer': student.employer || '',
                'studentJobTitle': student.job_title || '',
                'studentExperience': student.years_experience || 0,
                'studentEmergencyName': student.emergency_contact_name || '',
                'studentEmergencyPhone': student.emergency_contact_phone || student.emergency_contact || '',
                'studentEmergencyContact': student.emergency_contact_relationship || '',
                'studentNotes': student.notes || ''
            };
            
            let populatedCount = 0;
            Object.entries(fieldMap).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                    populatedCount++;
                    console.log(`✅ Set ${fieldId}: ${value}`);
                } else {
                    console.warn(`⚠️ Field not found: ${fieldId}`);
                }
            });
            
            console.log(`📊 Populated ${populatedCount}/${Object.keys(fieldMap).length} fields`);
            
            const modalTitle = document.getElementById('studentModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Student';
            }
            
            const submitBtn = document.querySelector('#studentForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
                submitBtn.setAttribute('data-editing', 'true');
            }
            
            const regNumberInput = document.getElementById('studentRegNumber');
            if (regNumberInput) {
                regNumberInput.readOnly = true;
                regNumberInput.title = "Registration number cannot be changed";
            }
            
            this.ui.openModal('studentModal');
            
            const modalBody = document.querySelector('#studentModal .modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
            
            setTimeout(() => {
                document.getElementById('studentName')?.focus();
            }, 100);
            
        } catch (error) {
            console.error('Error editing student:', error);
            this.ui.showToast('Error loading student data: ' + error.message, 'error');
        }
    }

    /**
     * Format date for input field (YYYY-MM-DD)
     */
    _formatDateForInput(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error formatting date:', error);
            return '';
        }
    }

    /**
     * Reset student form
     */
    _resetStudentForm() {
        console.log('🔄 Resetting student form...');
        
        const form = document.getElementById('studentForm');
        if (form) {
            form.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.type === 'checkbox') {
                    field.checked = false;
                } else if (field.tagName === 'SELECT') {
                    if (field.id !== 'studentIntake') {
                        field.selectedIndex = 0;
                    }
                } else if (field.id === 'studentRegNumber') {
                    field.value = '';
                    field.readOnly = false;
                    field.title = '';
                } else {
                    field.value = '';
                }
            });
            
            // Populate dropdowns if data is loaded
            if (this.isDataLoaded) {
                this.populateProgramSelect();
                this.populateCentreSelect();
            } else {
                console.warn('⚠️ Data not loaded yet, dropdowns will be populated on next load');
            }
            
            const modalTitle = document.getElementById('studentModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Register New Student';
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
                submitBtn.removeAttribute('data-editing');
                submitBtn.disabled = false;
            }
            
            this.currentEditId = null;
            this._populateIntakeYears();
            
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            document.querySelectorAll('.form-control.error').forEach(el => {
                el.classList.remove('error');
            });
            
            console.log('✅ Form reset complete');
        }
    }

    /**
     * Validate email format
     */
    _validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Load students table
     */
    async loadStudentsTable(filterOptions = {}) {
        try {
            console.log('📋 Loading students table...');
            const students = await this.db.getStudents(filterOptions);
            const tbody = document.getElementById('studentsTableBody');
            
            if (!tbody) {
                console.warn('Students table body not found');
                return;
            }

            if (students.length === 0) {
                this._renderEmptyState(tbody);
                this._toggleBulkActions(false);
                return;
            }

            // Ensure every student has program_name
            students.forEach(student => {
                if (!student.program_name) {
                    const programObj = this.programs.find(p => p.id === student.program_id);
                    if (programObj) {
                        student.program_name = `${programObj.code} - ${programObj.name}`;
                    } else {
                        student.program_name = student.program || 'Unknown Program';
                    }
                }
            });

            const html = students.map(student => {
                const programDisplay = student.program_name;

                let centreDisplay = 'Not assigned';
                if (student.centre_name && student.centre_name.trim() !== '') {
                    centreDisplay = student.centre_name;
                } else if (student.centre && student.centre.trim() !== '') {
                    centreDisplay = student.centre;
                } else if (student.centre_id) {
                    const lookedUpName = this._getCentreName(student.centre_id);
                    centreDisplay = lookedUpName;
                }

                const studentName = this._escapeHtml(student.full_name || '');
                const email = this._escapeHtml(student.email || '');
                const status = student.status || 'active';
                const safeStudentId = this._escapeAttr(student.id);
                const safeRegNumber = this._escapeAttr(student.reg_number);

                return `
                    <tr data-student-id="${safeStudentId}" data-student-reg="${safeRegNumber}">
                        <td><strong>${this._escapeHtml(student.reg_number)}</strong></td>
                        <td>
                            <div class="student-avatar">
                                <div class="avatar-icon" style="background-color: ${this._getAvatarColor(student.full_name)}">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="student-info">
                                    <strong>${studentName}</strong><br>
                                    <small>${email}</small>
                                </div>
                            </div>
                        </td>
                        <td>${this._escapeHtml(programDisplay)}</td>
                        <td>${this._escapeHtml(centreDisplay)}</td>
                        <td>${this._escapeHtml(student.intake_year)}</td>
                        <td>
                            <span class="status-badge ${this._escapeAttr(status)}">
                                ${this._escapeHtml(status.toUpperCase())}
                            </span>
                        </td>
                        <td class="action-buttons">
                            <button class="btn-action view-student" data-id="${safeStudentId}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action edit-student" data-id="${safeStudentId}" title="Edit Student">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action enter-marks" data-id="${safeStudentId}" title="Enter Marks">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button class="btn-action delete-student" data-id="${safeStudentId}" title="Delete Student">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.innerHTML = html;
            this._attachStudentRowEventListeners();
            this._toggleBulkActions(students.length > 0);
            console.log(`✅ Loaded ${students.length} students`);

        } catch (error) {
            console.error('❌ Error loading students table:', error);
            this.ui.showToast('Error loading students data', 'error');
            this._renderErrorState();
        }
    }

    /**
     * Search students
     */
    async searchStudents() {
        const searchInput = document.getElementById('studentSearch');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            await this.loadStudentsTable();
            return;
        }
        
        try {
            const allStudents = await this.db.getStudents();
            const filteredStudents = allStudents.filter(student => {
                return (
                    (student.reg_number && student.reg_number.toLowerCase().includes(searchTerm)) ||
                    (student.full_name && student.full_name.toLowerCase().includes(searchTerm)) ||
                    (student.email && student.email.toLowerCase().includes(searchTerm)) ||
                    (student.phone && student.phone.includes(searchTerm)) ||
                    (student.program && student.program.toLowerCase().includes(searchTerm))
                );
            });
            
            this._renderFilteredStudents(filteredStudents);
        } catch (error) {
            console.error('Error searching students:', error);
        }
    }

    /**
     * Render filtered students
     */
    _renderFilteredStudents(students) {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-search fa-3x"></i>
                        <h3>No Students Found</h3>
                        <p>No students match your search criteria.</p>
                    </td>
                </tr>
            `;
            this._toggleBulkActions(false);
            return;
        }
        
        const html = students.map(student => {
            const programDisplay = student.program_name || this._getProgramName(student.program);
            const centreDisplay = student.centre || this._getCentreName(student.centre_id) || 'Not assigned';
            const studentName = this._escapeHtml(student.full_name || '');
            const email = this._escapeHtml(student.email || '');
            const status = student.status || 'active';
            const safeStudentId = this._escapeAttr(student.id);
            const safeRegNumber = this._escapeAttr(student.reg_number);
            
            return `
                <tr data-student-id="${safeStudentId}" data-student-reg="${safeRegNumber}">
                    <td><strong>${this._escapeHtml(student.reg_number)}</strong></td>
                    <td>
                        <div class="student-avatar">
                            <div class="avatar-icon" style="background-color: ${this._getAvatarColor(student.full_name)}">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="student-info">
                                <strong>${studentName}</strong><br>
                                <small>${email}</small>
                            </div>
                        </div>
                    </td>
                    <td>${this._escapeHtml(programDisplay)}</td>
                    <td>${this._escapeHtml(centreDisplay)}</td>
                    <td>${this._escapeHtml(student.county)}</td>
                    <td>${this._escapeHtml(student.intake_year)}</td>
                    <td>
                        <span class="status-badge ${this._escapeAttr(status)}">
                            ${this._escapeHtml(status.toUpperCase())}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn-action view-student" data-id="${safeStudentId}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action edit-student" data-id="${safeStudentId}" title="Edit Student">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action enter-marks" data-id="${safeStudentId}" title="Enter Marks">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn-action delete-student" data-id="${safeStudentId}" title="Delete Student">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
        this._attachStudentRowEventListeners();
        this._toggleBulkActions(true);
    }

    /**
     * Filter students by dropdown filters
     */
    async filterStudents() {
        try {
            const filters = {
                county: document.getElementById('filterCounty')?.value || '',
                centre: document.getElementById('filterCentre')?.value || '',
                program: document.getElementById('filterProgram')?.value || '',
                status: document.getElementById('filterStatus')?.value || ''
            };
            
            console.log('🔍 Applying filters:', filters);
            
            const allStudents = await this.db.getStudents();
            const filteredStudents = allStudents.filter(student => {
                let matches = true;
                
                if (filters.county && student.county !== filters.county) {
                    matches = false;
                }
                
                if (filters.centre) {
                    const centreMatch = student.centre_id === filters.centre || 
                                       student.centre === filters.centre;
                    if (!centreMatch) matches = false;
                }
                
                if (filters.program && student.program !== filters.program) {
                    matches = false;
                }
                
                if (filters.status && student.status !== filters.status) {
                    matches = false;
                }
                
                return matches;
            });
            
            this._renderFilteredStudents(filteredStudents);
        } catch (error) {
            console.error('Error filtering students:', error);
        }
    }

    /**
     * Attach event listeners to student row buttons
     */
    _attachStudentRowEventListeners() {
        document.querySelectorAll('.view-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.viewStudent(studentId);
            });
        });
        
        document.querySelectorAll('.edit-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.editStudent(studentId);
            });
        });
        
        document.querySelectorAll('.enter-marks').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.enterMarks(studentId);
            });
        });
        
        document.querySelectorAll('.delete-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.deleteStudent(studentId);
            });
        });
        
        console.log('✅ Attached row event listeners');
    }

    /**
     * Delete student with confirmation
     */
    async deleteStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            if (!confirm(`Are you sure you want to delete ${this._escapeHtml(student.full_name)} (${this._escapeHtml(student.reg_number)})? This action cannot be undone.`)) {
                return;
            }
            
            await this.db.deleteStudent(studentId);
            this.ui.showToast('Student deleted successfully', 'success');
            
            this.selectedStudents.delete(studentId);
            await this.loadStudentsTable();
        } catch (error) {
            console.error('Error deleting student:', error);
            this.ui.showToast('Error deleting student', 'error');
        }
    }

    /**
     * View student details
     */
    async viewStudent(studentId) {
        try {
            console.log(`👁️ Viewing student ${studentId}...`);
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            const modalContent = `
                <div class="modal-content" style="max-width: 800px; margin: 50px auto;">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0;"><i class="fas fa-user-graduate"></i> Student Details</h2>
                        <span class="close" onclick="this.closest('.modal').style.display='none'" style="font-size: 28px; cursor: pointer; color: #666;">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                        <div class="student-profile">
                            <div style="display: flex; align-items: center; gap: 20px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
                                <div style="background-color: ${this._getAvatarColor(student.full_name)}; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-user fa-2x" style="color: white;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <h2 style="margin: 0 0 5px 0; color: #333;">${this._escapeHtml(student.full_name)}</h2>
                                    <p style="margin: 0 0 10px 0; color: #666;">
                                        <i class="fas fa-id-card"></i> ${this._escapeHtml(student.reg_number)}
                                    </p>
                                    <span style="display: inline-block; padding: 4px 12px; background: ${student.status === 'active' ? '#d1fae5' : '#fee2e2'}; color: ${student.status === 'active' ? '#065f46' : '#991b1b'}; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                                        ${this._escapeHtml(student.status?.toUpperCase() || 'ACTIVE')}
                                    </span>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
                                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5;">
                                        <i class="fas fa-user"></i> Personal Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        ${student.email ? `
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Email:</span>
                                            <span style="color: #333;">${this._escapeHtml(student.email)}</span>
                                        </div>` : ''}
                                        
                                        ${student.phone ? `
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Phone:</span>
                                            <span style="color: #333;">${this._escapeHtml(student.phone)}</span>
                                        </div>` : ''}
                                        
                                        ${student.date_of_birth ? `
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Date of Birth:</span>
                                            <span style="color: #333;">${new Date(student.date_of_birth).toLocaleDateString()}</span>
                                        </div>` : ''}
                                        
                                        ${student.gender ? `
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Gender:</span>
                                            <span style="color: #333;">${this._escapeHtml(student.gender)}</span>
                                        </div>` : ''}
                                    </div>
                                </div>
                                
                                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5;">
                                        <i class="fas fa-graduation-cap"></i> Academic Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Program:</span>
                                            <span style="color: #333;">${this._escapeHtml(this._getProgramName(student.program))}</span>
                                        </div>
                                        
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Centre:</span>
                                            <span style="color: #333;">${this._escapeHtml(student.centre || this._getCentreName(student.centre_id))}</span>
                                        </div>
                                        
                                        ${student.intake_year ? `
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-weight: 600; color: #555;">Intake Year:</span>
                                            <span style="color: #333;">${this._escapeHtml(student.intake_year)}</span>
                                        </div>` : ''}
                                    </div>
                                </div>
                                
                                ${student.notes || student.address ? `
                                <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; grid-column: span 2;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5;">
                                        <i class="fas fa-info-circle"></i> Additional Information
                                    </h4>
                                    ${student.address ? `
                                    <div style="margin-bottom: 10px;">
                                        <p style="margin: 0 0 5px 0; color: #666;"><strong>Address:</strong></p>
                                        <p style="margin: 0; color: #333;">${this._escapeHtml(student.address)}</p>
                                    </div>` : ''}
                                    
                                    ${student.notes ? `
                                    <div>
                                        <p style="margin: 0 0 5px 0; color: #666;"><strong>Notes:</strong></p>
                                        <p style="margin: 0; color: #333; white-space: pre-wrap;">${this._escapeHtml(student.notes)}</p>
                                    </div>` : ''}
                                </div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 10px;">
                        <button onclick="this.closest('.modal').style.display='none'" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Close
                        </button>
                        <button onclick="app.students.editStudent('${studentId}'); this.closest('.modal').style.display='none'" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Edit Student
                        </button>
                    </div>
                </div>
            `;
            
            const modalId = 'viewStudentModal';
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'modal';
                modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = modalContent;
            modal.style.display = 'block';
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Error viewing student:', error);
            this.ui.showToast('Error loading student details', 'error');
        }
    }

    /**
     * Enter marks for a student
     */
    async enterMarks(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            this.ui.showToast(`Redirecting to marks entry for ${student.full_name}`, 'info');
            
            if (this.app?.marks?.openMarksModal) {
                this.app.marks.openMarksModal(studentId);
            } else {
                this.ui.showToast('Please use the Marks page to enter marks', 'info');
            }
        } catch (error) {
            console.error('Error entering marks:', error);
            this.ui.showToast('Error opening marks entry', 'error');
        }
    }

    /**
     * Export students
     */
    async exportStudents(format = 'csv') {
        try {
            const students = await this.db.getStudents();
            
            if (students.length === 0) {
                this.ui.showToast('No students to export', 'warning');
                return;
            }
            
            const data = students.map(student => ({
                'Registration Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email || '',
                'Phone': student.phone || '',
                'Program': this._getProgramName(student.program),
                'Centre': student.centre || this._getCentreName(student.centre_id),
                'County': student.county || '',
                'Intake Year': student.intake_year,
                'Status': student.status || 'active',
                'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                'Gender': student.gender || '',
                'Registration Date': student.registration_date || student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : ''
            }));
            
            if (format === 'csv') {
                this._exportToCSV(data, 'students');
            }
            
            this.ui.showToast(`Exported ${students.length} students`, 'success');
        } catch (error) {
            console.error('Error exporting students:', error);
            this.ui.showToast('Error exporting students', 'error');
        }
    }

    /**
     * Export to CSV
     */
    _exportToCSV(data, fileName) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this._downloadBlob(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    }

    /**
     * Download blob as file
     */
    _downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Escape HTML for text content
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape HTML for attributes
     */
    _escapeAttr(text) {
        if (text === null || text === undefined) return '';
        
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Get avatar color based on name
     */
    _getAvatarColor(name) {
        const colors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
            '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
        ];
        if (!name) return colors[0];
        
        const hash = name.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Setup bulk actions
     */
    _setupBulkActions() {
        this._toggleBulkActions(false);
    }

    /**
     * Toggle bulk actions visibility
     */
    _toggleBulkActions(show) {
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            bulkActions.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Toggle select all students
     */
    _toggleSelectAllStudents(selectAll) {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const studentId = checkbox.getAttribute('data-student-id');
            if (selectAll) {
                this.selectedStudents.add(studentId);
            } else {
                this.selectedStudents.delete(studentId);
            }
        });
        this._updateSelectedCount();
    }

    /**
     * Update selected students count
     */
    _updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedStudents.size;
        }
    }

    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>Get started by adding your first student.</p>
                    <button class="btn-primary" id="addFirstStudent">
                        <i class="fas fa-plus"></i> Add Your First Student
                    </button>
                </td>
            </tr>
        `;
        
        tbody.querySelector('#addFirstStudent')?.addEventListener('click', () => {
            this._resetStudentForm();
            this.ui.openModal('studentModal');
        });
    }

    /**
     * Render error state
     */
    _renderErrorState() {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Students</h3>
                        <p>Unable to load student data. Please try again.</p>
                        <button class="btn-primary" id="retryLoadStudents">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.querySelector('#retryLoadStudents')?.addEventListener('click', () => {
                this.loadStudentsTable();
            });
        }
    }

    /**
     * Open import modal
     */
    _openImportModal() {
        this.ui.showToast('Import feature coming soon!', 'info');
    }

    /**
     * Show bulk status modal
     */
    _showBulkStatusModal() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('Please select students first', 'warning');
            return;
        }
        this.ui.showToast(`Bulk status update for ${this.selectedStudents.size} students`, 'info');
    }

    /**
     * Show bulk delete modal
     */
    _showBulkDeleteModal() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('Please select students first', 'warning');
            return;
        }
        
        if (confirm(`Are you sure you want to delete ${this.selectedStudents.size} selected students? This action cannot be undone.`)) {
            this.ui.showToast(`Bulk delete for ${this.selectedStudents.size} students`, 'info');
        }
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
}
