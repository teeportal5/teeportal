// modules/students.js - FIXED VERSION WITH AUTO-GENERATED REG NUMBERS
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
        this.programCodes = {}; // Store program codes from database
    }
    
    /**
     * Initialize student module
     */
    async init() {
        this._attachEventListeners();
        await this.loadStudentsTable();
        this._setupBulkActions();
        this._setupModalHandlers();
        
        // Load program codes for registration number generation
        await this._loadProgramCodes();
        
        // Populate intake years dropdown on page load
        await this._populateIntakeYears();
    }
    
    async _loadProgramCodes() {
    try {
        const programs = await this.db.getPrograms();
        if (programs && Array.isArray(programs)) {
            // Clear existing codes
            this.programCodes = {};
            
            // Load all program codes (id -> code mapping)
            programs.forEach(program => {
                if (program.id && program.code) {
                    this.programCodes[program.id] = program.code;
                }
            });
            console.log('📊 Loaded program codes from database:', this.programCodes);
        } else {
            console.warn('No programs found in database');
            this.programCodes = {};
        }
    } catch (error) {
        console.error('Could not load program codes:', error);
        this.programCodes = {};
    }
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
        
        const programId = programSelect.value;
        const intakeYear = intakeSelect.value;
        
        console.log('🔢 Generating reg number with:', { 
            programId, 
            intakeYear 
        });
        
        if (!programId || !intakeYear) {
            regNumberInput.value = '';
            this.ui.showToast('Select program and intake year first', 'warning');
            return;
        }
        
        // **METHOD 1: Use database's method to generate registration number**
        try {
            // Call the database method that gets the last student and generates number
            const regNumber = await this.db.generateRegNumberNew(programId, intakeYear);
            
            if (regNumber) {
                console.log('✅ Generated registration number:', regNumber);
                regNumberInput.value = regNumber;
                
                // Update format display
                const formatSpan = document.getElementById('regNumberFormat');
                if (formatSpan) {
                    const programCode = regNumber.split('-')[0];
                    formatSpan.textContent = `${programCode}-${intakeYear}-###`;
                }
            } else {
                throw new Error('Could not generate registration number');
            }
            
        } catch (error) {
            console.warn('Primary method failed, trying alternative:', error);
            
            // **METHOD 2: Manual generation as fallback**
            // Get program details to get the code
            const programs = await this.db.getPrograms();
            const program = programs.find(p => p.id === programId);
            
            if (!program) {
                throw new Error('Program not found');
            }
            
            const programCode = program.code || 'GEN';
            
            // Get last student for this program and year using the database method
            const lastStudent = await this.db.getLastStudentForProgramYear(programId, intakeYear);
            
            // Calculate next sequence number
            let sequenceNumber = 1;
            if (lastStudent && lastStudent.reg_number) {
                const regParts = lastStudent.reg_number.split('-');
                if (regParts.length === 3) {
                    const lastSeq = parseInt(regParts[2]);
                    if (!isNaN(lastSeq)) {
                        sequenceNumber = lastSeq + 1;
                    }
                }
            }
            
            // Format: DHNC-2025-001
            const regNumber = `${programCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
            
            console.log('✅ Generated registration number (fallback):', regNumber);
            regNumberInput.value = regNumber;
            
            // Update format display
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
     * Populate intake year dropdown with student's year included
     */
    async _populateIntakeYears(studentIntakeYear = null) {
        try {
            const intakeSelect = document.getElementById('studentIntake');
            if (!intakeSelect) {
                console.warn('studentIntake dropdown not found');
                return;
            }
            
            // Clear existing options
            intakeSelect.innerHTML = '<option value="">Select Intake Year</option>';
            
            const currentYear = new Date().getFullYear();
            
            // Always include the student's intake year if provided
            if (studentIntakeYear) {
                const year = parseInt(studentIntakeYear);
                if (!isNaN(year)) {
                    // Add student's year first
                    const studentOption = document.createElement('option');
                    studentOption.value = year;
                    studentOption.textContent = year;
                    studentOption.selected = true;
                    intakeSelect.appendChild(studentOption);
                    console.log(`✅ Added student's intake year: ${year}`);
                }
            }
            
            // Add current year and previous 10 years
            for (let i = 0; i <= 10; i++) {
                const year = currentYear - i;
                
                // Don't add duplicate if it's the student's year
                if (studentIntakeYear && year === parseInt(studentIntakeYear)) continue;
                
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                
                // Select current year by default for new students
                if (!studentIntakeYear && i === 0) {
                    option.selected = true;
                }
                
                intakeSelect.appendChild(option);
            }
            
            // Add future years (next 2 years)
            for (let i = 1; i <= 2; i++) {
                const year = currentYear + i;
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeSelect.appendChild(option);
            }
            
            console.log(`✅ Populated intake years dropdown (student year: ${studentIntakeYear || 'not specified'})`);
            
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
    }
    
    /**
     * Setup modal handlers
     */
    _setupModalHandlers() {
        // Student modal close handler
        const studentModal = document.getElementById('studentModal');
        if (studentModal) {
            // Close button
            const closeBtn = studentModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                });
            }
            
            // Click outside to close
            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                }
            });
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal && activeModal.id === 'studentModal') {
                    this._resetStudentForm();
                    this.ui.closeModal(activeModal.id);
                }
            }
        });
    }
    
   async saveStudent(event) {
    event.preventDefault();
    
    const form = event.target;
    if (!form || form.id !== 'studentForm') {
        console.error('Invalid form element');
        return;
    }
    
    try {
        // Get all form data with CORRECT field names
        const formData = {
            // **CRITICAL FIX: Use centre_name NOT centre_id for names**
            centre_name: document.getElementById('studentCentre')?.value || '',
            
            // Registration Number (Auto-generated)
            reg_number: document.getElementById('studentRegNumber')?.value.trim() || '',
            
            // Personal Information
            full_name: document.getElementById('studentName')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            phone: document.getElementById('studentPhone')?.value.trim() || '',
            date_of_birth: document.getElementById('studentDOB')?.value || '',
            id_number: document.getElementById('studentIdNumber')?.value.trim() || '',
            gender: document.getElementById('studentGender')?.value || '',
            
            // Location Information
            county: document.getElementById('studentCounty')?.value || '',
            sub_county: document.getElementById('studentSubCounty')?.value.trim() || '',
            ward: document.getElementById('studentWard')?.value.trim() || '',
            village: document.getElementById('studentVillage')?.value.trim() || '',
            address: document.getElementById('studentAddress')?.value.trim() || '',
            
            // Academic Information
            program: document.getElementById('studentProgram')?.value || '',
            intake_year: document.getElementById('studentIntake')?.value || new Date().getFullYear().toString(),
            study_mode: document.getElementById('studentStudyMode')?.value || 'fulltime',
            status: document.getElementById('studentStatus')?.value || 'active',
            
            // Employment Information
            employment_status: document.getElementById('studentEmployment')?.value || '',
            employer: document.getElementById('studentEmployer')?.value.trim() || '',
            job_title: document.getElementById('studentJobTitle')?.value.trim() || '',
            years_experience: parseInt(document.getElementById('studentExperience')?.value) || 0,
            
            // Emergency Contact
            emergency_contact_name: document.getElementById('studentEmergencyName')?.value.trim() || '',
            emergency_contact_phone: document.getElementById('studentEmergencyPhone')?.value.trim() || '',
            emergency_contact_relationship: document.getElementById('studentEmergencyContact')?.value.trim() || '',
            
            // Additional Information
            notes: document.getElementById('studentNotes')?.value.trim() || '',
            
            // Optional: Set centre_id to null if not using UUIDs
            centre_id: null
        };
        
        console.log('📝 Form data to save:', formData);
        
        // Validate required fields
        const requiredFields = ['reg_number', 'full_name', 'email', 'program', 'intake_year'];
        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');
        
        if (missingFields.length > 0) {
            this.ui.showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        let result;
        if (this.currentEditId) {
            // Update existing student
            result = await this.db.updateStudent(this.currentEditId, formData);
            this.ui.showToast(`Student updated successfully!`, 'success');
        } else {
            // Add new student
            result = await this.db.addStudent(formData);
            const regNumber = result.reg_number || formData.reg_number;
            this.ui.showToast(`Student registered successfully! Registration Number: ${regNumber}`, 'success');
        }
        
        // Reset form and close modal
        this._resetStudentForm();
        this.ui.closeModal('studentModal');
        
        // Refresh students table
        await this.loadStudentsTable();
        
    } catch (error) {
        console.error('❌ Error saving student:', error);
        this.ui.showToast(error.message || 'Error saving student data', 'error');
        
        // Reset button if error
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
 * Edit student - UPDATED WITH REGISTRATION NUMBER AND CENTRE_NAME
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
        
        // FIRST: Populate intake years with student's actual year
        await this._populateIntakeYears(student.intake_year);
        
        // Field mapping - matches the HTML form
        const fieldMap = {
            // **REGISTRATION NUMBER**
            'studentRegNumber': student.reg_number || '',
            
            // Personal Information
            'studentName': student.full_name || '',
            'studentEmail': student.email || '',
            'studentPhone': student.phone || '',
            'studentDOB': student.date_of_birth ? this._formatDateForInput(student.date_of_birth) : '',
            'studentIdNumber': student.id_number || '',
            'studentGender': student.gender || '',
            
            // Location Information
            'studentCounty': student.county || '',
            'studentSubCounty': student.sub_county || '',
            'studentWard': student.ward || '',
            'studentVillage': student.village || '',
            'studentAddress': student.address || '',
            
            // Academic Information
            'studentProgram': student.program || '',
            'studentCentre': student.centre_name || student.centre || '', // ← FIXED: centre_name
            'studentStudyMode': student.study_mode || 'fulltime',
            'studentStatus': student.status || 'active',
            
            // Employment Information
            'studentEmployment': student.employment_status || '',
            'studentEmployer': student.employer || '',
            'studentJobTitle': student.job_title || '',
            'studentExperience': student.years_experience || 0,
            
            // Emergency Contact
            'studentEmergencyName': student.emergency_contact_name || '',
            'studentEmergencyPhone': student.emergency_contact_phone || '',
            'studentEmergencyContact': student.emergency_contact_relationship || student.emergency_contact || '', // ← ADDED relationship
            
            // Notes
            'studentNotes': student.notes || ''
        };
        
        // Populate form fields
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
        
        // Update modal title
        const modalTitle = document.getElementById('studentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Student';
        }
        
        // Update submit button
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
            submitBtn.setAttribute('data-editing', 'true');
        }
        
        // Disable registration number field when editing (shouldn't change)
        const regNumberInput = document.getElementById('studentRegNumber');
        if (regNumberInput) {
            regNumberInput.readOnly = true;
            regNumberInput.title = "Registration number cannot be changed";
        }
        
        // Open modal
        this.ui.openModal('studentModal');
        
        // Scroll to top of modal
        const modalBody = document.querySelector('#studentModal .modal-body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
        
        // Focus on first field
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
     * Reset student form - UPDATED FOR REGISTRATION NUMBER
     */
    _resetStudentForm() {
        console.log('🔄 Resetting student form...');
        
        const form = document.getElementById('studentForm');
        if (form) {
            // Reset all input fields
            form.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.type === 'checkbox') {
                    field.checked = false;
                } else if (field.tagName === 'SELECT') {
                    // Don't reset intake year dropdown - we'll repopulate it
                    if (field.id !== 'studentIntake') {
                        field.selectedIndex = 0;
                    }
                } else if (field.id === 'studentRegNumber') {
                    // Clear but keep field writable for new students
                    field.value = '';
                    field.readOnly = false;
                    field.title = '';
                } else {
                    field.value = '';
                }
            });
            
            // Reset modal title
            const modalTitle = document.getElementById('studentModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Register New Student';
            }
            
            // Reset submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
                submitBtn.removeAttribute('data-editing');
                submitBtn.disabled = false;
            }
            
            // Clear edit ID
            this.currentEditId = null;
            
            // Repopulate intake years for new student
            this._populateIntakeYears();
            
            // Clear any error messages
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
     * Load students into table
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
            
            // Fetch programs once for all students
            const allPrograms = await this.db.getPrograms();
            const programMap = {};
            if (allPrograms && Array.isArray(allPrograms)) {
                allPrograms.forEach(program => {
                    programMap[program.id] = program.name;
                });
            }
            
            // Render all rows with program names
            const html = students.map(student => {
                const programName = student.program 
                    ? (programMap[student.program] || student.program)
                    : 'N/A';
                    
                const studentName = this._escapeHtml(student.full_name || '');
                const email = this._escapeHtml(student.email || '');
                const status = student.status || 'active';
                const safeStudentId = this._escapeAttr(student.id);
                const safeRegNumber = this._escapeAttr(student.reg_number);
                const centreName = student.centre || 'N/A';
                
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
                        <td>${this._escapeHtml(programName)}</td>
                        <td>${this._escapeHtml(centreName)}</td>
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
            
            // Attach event listeners
            this._attachStudentRowEventListeners();
            this._setupCheckboxListeners();
            
            // Show bulk actions if we have students
            this._toggleBulkActions(true);
            
            console.log(`✅ Loaded ${students.length} students`);
            
        } catch (error) {
            console.error('Error loading students table:', error);
            this._renderErrorState();
        }
    }
    
    /**
     * Render student table row
     */
    _renderStudentRow(student) {
        try {
            // Fetch all programs from database to get proper names
            const allPrograms = this.db.getPrograms ? this.db.getPrograms() : [];
            const programMap = {};
            if (allPrograms && Array.isArray(allPrograms)) {
                allPrograms.forEach(program => {
                    programMap[program.id] = program.name;
                });
            }
            
            // Get program name from map or fallback
            const programName = student.program 
                ? (programMap[student.program] || student.program)
                : 'N/A';
            
            // Get other data
            const studentName = this._escapeHtml(student.full_name || '');
            const email = this._escapeHtml(student.email || '');
            const status = student.status || 'active';
            const safeStudentId = this._escapeAttr(student.id);
            const safeRegNumber = this._escapeAttr(student.reg_number);
            const centreName = student.centre || 'N/A';
            
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
                    <td>${this._escapeHtml(programName)}</td>
                    <td>${this._escapeHtml(centreName)}</td>
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
            
        } catch (error) {
            console.error('Error rendering student row:', error);
            return this._renderStudentRowFallback(student);
        }
    }

    /**
     * Fallback student row rendering
     */
    _renderStudentRowFallback(student) {
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
                <td>${this._escapeHtml(student.program || 'N/A')}</td>
                <td>${this._escapeHtml(student.centre || 'N/A')}</td>
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
    }
    
    /**
     * Attach event listeners to student row buttons
     */
    _attachStudentRowEventListeners() {
        // View student buttons
        document.querySelectorAll('.view-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.viewStudent(studentId);
            });
        });
        
        // Edit student buttons
        document.querySelectorAll('.edit-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.editStudent(studentId);
            });
        });
        
        // Enter marks buttons
        document.querySelectorAll('.enter-marks').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.enterMarks(studentId);
            });
        });
        
        // Delete student buttons
        document.querySelectorAll('.delete-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.deleteStudent(studentId);
            });
        });
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
            
            // Remove from selected if present
            this.selectedStudents.delete(studentId);
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            this.ui.showToast('Error deleting student', 'error');
        }
    }
    
    /**
     * Export students
     */
    async exportStudents(format = 'csv') {
        try {
            const students = await this.db.getStudents();
            const settings = await this.db.getSettings();
            
            if (students.length === 0) {
                this.ui.showToast('No students to export', 'warning');
                return;
            }
            
            const data = students.map(student => {
                const programName = settings.programs && settings.programs[student.program] 
                    ? settings.programs[student.program].name 
                    : student.program;
                
                return {
                    'Registration Number': student.reg_number,
                    'Full Name': student.full_name,
                    'Email': student.email || '',
                    'Phone': student.phone || '',
                    'Program': programName,
                    'Intake Year': student.intake_year,
                    'Status': student.status || 'active',
                    'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                    'Gender': student.gender || '',
                    'County': student.county || '',
                    'Sub-County': student.sub_county || '',
                    'Ward': student.ward || '',
                    'Village': student.village || '',
                    'Employment Status': student.employment_status || '',
                    'Employer': student.employer || '',
                    'Job Title': student.job_title || '',
                    'Experience (Years)': student.years_experience || '',
                    'Date Registered': student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : ''
                };
            });
            
            if (format === 'csv') {
                this._exportToCSV(data, 'students');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'students');
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
     * Setup checkbox listeners
     */
    _setupCheckboxListeners() {
        document.querySelectorAll('.student-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const studentId = e.target.getAttribute('data-student-id');
                if (e.target.checked) {
                    this.selectedStudents.add(studentId);
                } else {
                    this.selectedStudents.delete(studentId);
                }
                this._updateSelectedCount();
            });
        });
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
        
        // Add event listener for the button
        tbody.querySelector('#addFirstStudent')?.addEventListener('click', () => {
            this._resetStudentForm();
            this.ui.openModal('studentModal');
        });
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
            
            // Fetch program name from database
            const allPrograms = await this.db.getPrograms();
            const programMap = {};
            if (allPrograms && Array.isArray(allPrograms)) {
                allPrograms.forEach(program => {
                    programMap[program.id] = program.name;
                });
            }
            
            const programName = student.program 
                ? (programMap[student.program] || student.program)
                : 'Not assigned';
            
            // Format dates
            const formatDate = (dateString) => {
                if (!dateString) return '';
                try {
                    return new Date(dateString).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } catch (e) {
                    return dateString;
                }
            };
            
            // Create modal content with proper structure
            const modalContent = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-graduate"></i> Student Details</h3>
                        <span class="close" data-modal-close>&times;</span>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; max-height: 70vh;">
                        <div class="student-profile">
                            <!-- Student Header -->
                            <div class="student-header" style="display: flex; align-items: center; gap: 20px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
                                <div class="student-avatar-large">
                                    <div style="background-color: ${this._getAvatarColor(student.full_name)}; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-user fa-2x" style="color: white;"></i>
                                    </div>
                                </div>
                                <div class="student-info-header" style="flex: 1;">
                                    <h2 style="margin: 0 0 5px 0; color: #333;">${this._escapeHtml(student.full_name)}</h2>
                                    <p class="student-reg" style="margin: 0 0 10px 0; color: #666;">
                                        <i class="fas fa-id-card"></i> ${this._escapeHtml(student.reg_number)}
                                    </p>
                                    <span class="status-badge ${student.status}" style="display: inline-block; padding: 4px 12px; background: ${student.status === 'active' ? '#d1fae5' : '#fee2e2'}; color: ${student.status === 'active' ? '#065f46' : '#991b1b'}; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                                        ${this._escapeHtml(student.status.toUpperCase())}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Details Grid -->
                            <div class="student-details-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                
                                <!-- Personal Information -->
                                <div class="detail-section" style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-user"></i> Personal Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        ${student.email ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Email:</span>
                                            <span style="color: #333; text-align: right; flex: 1; word-break: break-word;">
                                                <i class="fas fa-envelope" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.email)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.phone ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Phone:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-phone" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.phone)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.date_of_birth ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Date of Birth:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-calendar" style="margin-right: 5px;"></i>
                                                ${formatDate(student.date_of_birth)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.gender ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Gender:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-venus-mars" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.gender)}
                                            </span>
                                        </div>` : ''}
                                    </div>
                                </div>
                                
                                <!-- Academic Information -->
                                <div class="detail-section" style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-graduation-cap"></i> Academic Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Program:</span>
                                            <span style="color: #333; text-align: right; flex: 1; word-break: break-word;">
                                                <i class="fas fa-book" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(programName)}
                                            </span>
                                        </div>
                                        
                                        ${student.centre ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Centre:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-school" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.centre)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.intake_year ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Intake Year:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-calendar-alt" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.intake_year)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.study_mode ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Study Mode:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-clock" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.study_mode)}
                                            </span>
                                        </div>` : ''}
                                    </div>
                                </div>
                                
                                <!-- Location Information -->
                                <div class="detail-section" style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-map-marker-alt"></i> Location Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        ${student.county ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">County:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-map" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.county)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.sub_county ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Sub-County:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-map-pin" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.sub_county)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.ward ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Ward:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-location-dot" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.ward)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.village ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Village/Estate:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-home" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.village)}
                                            </span>
                                        </div>` : ''}
                                    </div>
                                </div>
                                
                                <!-- Employment Information (if exists) -->
                                ${student.employment_status || student.employer || student.job_title ? `
                                <div class="detail-section" style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 15px 0; color: #4f46e5; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-briefcase"></i> Employment Information
                                    </h4>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        ${student.employment_status ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Employment Status:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-user-tie" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.employment_status)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.employer ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Employer:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-building" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.employer)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.job_title ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Job Title:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-suitcase" style="margin-right: 5px;"></i>
                                                ${this._escapeHtml(student.job_title)}
                                            </span>
                                        </div>` : ''}
                                        
                                        ${student.years_experience ? `
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <span style="font-weight: 600; color: #555; min-width: 120px;">Experience:</span>
                                            <span style="color: #333; text-align: right; flex: 1;">
                                                <i class="fas fa-clock-rotate-left" style="margin-right: 5px;"></i>
                                                ${student.years_experience} years
                                            </span>
                                        </div>` : ''}
                                    </div>
                                </div>` : ''}
                                
                            </div>
                            
                            <!-- Additional Information -->
                            ${student.notes || student.address ? `
                            <div class="additional-info" style="margin-top: 25px; padding: 20px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #4f46e5;">
                                <h4 style="margin: 0 0 15px 0; color: #4f46e5;">
                                    <i class="fas fa-info-circle"></i> Additional Information
                                </h4>
                                <div style="display: flex; flex-direction: column; gap: 15px;">
                                    ${student.address ? `
                                    <div>
                                        <h5 style="margin: 0 0 8px 0; color: #666; font-size: 0.95rem;">
                                            <i class="fas fa-map-marker"></i> Address:
                                        </h5>
                                        <p style="margin: 0; color: #333; line-height: 1.5;">
                                            ${this._escapeHtml(student.address)}
                                        </p>
                                    </div>` : ''}
                                    
                                    ${student.notes ? `
                                    <div>
                                        <h5 style="margin: 0 0 8px 0; color: #666; font-size: 0.95rem;">
                                            <i class="fas fa-sticky-note"></i> Notes:
                                        </h5>
                                        <p style="margin: 0; color: #333; line-height: 1.5; white-space: pre-wrap;">
                                            ${this._escapeHtml(student.notes)}
                                        </p>
                                    </div>` : ''}
                                </div>
                            </div>` : ''}
                            
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-modal-close style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button type="button" class="btn btn-primary" onclick="app.students.editStudent('${studentId}')" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-edit"></i> Edit Student
                        </button>
                    </div>
                </div>
            `;
            
            // Create modal
            const modalId = 'viewStudentModal';
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'modal';
                modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;';
                document.body.appendChild(modal);
                
                // Add close handlers
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('[data-modal-close]')) {
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                });
                
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.style.display === 'block') {
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                });
            }
            
            modal.innerHTML = modalContent;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Scroll to top of modal
            setTimeout(() => {
                modal.scrollTop = 0;
            }, 10);
            
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
            console.log(`📝 Entering marks for student ${studentId}...`);
            
            // Get student details
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            // Check if marks manager exists in the app
            if (this.app && this.app.marks && typeof this.app.marks.openMarksModal === 'function') {
                // Use the marks module if available
                this.app.marks.openMarksModal(studentId);
            } else if (window.app && window.app.marks && typeof window.app.marks.openMarksModal === 'function') {
                // Try global app instance
                window.app.marks.openMarksModal(studentId);
            } else {
                // Show message to use marks page
                this.ui.showToast('Please use the Marks page to enter marks for students.', 'info');
                // Or open a simple modal
                this._openSimpleMarksInfoModal(studentId);
            }
            
        } catch (error) {
            console.error('Error entering marks:', error);
            this.ui.showToast('Error opening marks entry', 'error');
        }
    }

    /**
     * Simple fallback modal for marks entry
     */
    _openSimpleMarksInfoModal(studentId) {
        const modalId = 'simpleMarksModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
            `;
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; margin: 100px auto; max-width: 500px; padding: 20px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Enter Marks</h3>
                    <span onclick="document.getElementById('${modalId}').style.display='none'" 
                          style="cursor: pointer; font-size: 24px;">&times;</span>
                </div>
                <div style="margin-bottom: 20px;">
                    <p>To enter marks for this student:</p>
                    <ol style="margin-left: 20px;">
                        <li>Go to the <strong>Marks</strong> page</li>
                        <li>Click <strong>Add Marks</strong></li>
                        <li>Select the student and course</li>
                        <li>Enter the marks</li>
                    </ol>
                </div>
                <div style="text-align: right;">
                    <button onclick="document.getElementById('${modalId}').style.display='none'" 
                            style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                        Close
                    </button>
                    <button onclick="window.location.hash = '#marks'" 
                            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Go to Marks Page
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
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
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
}
