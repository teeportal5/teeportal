// modules/students.js - UPDATED FOR SIMPLIFIED FORM
class StudentManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        
        // State management
        this.currentEditId = null;
        this.selectedStudents = new Set();
        this.centres = [];
        this.programs = [];
        this.filteredStudents = [];
        this.allStudents = [];
        this.viewMode = 'table';
        
        // Search and filtering
        this.searchTerm = '';
        this.activeFilters = {
            program: '',
            year: '',
            centre: '',
            county: '',
            status: '',
            intake_year: ''
        };
        
        // Pagination
        this.currentPage = 1;
        this.pageSize = 25;
        this.totalPages = 1;
        
        console.log('🎓 StudentManager initialized');
    }
    
    /**
     * Initialize
     */
    async init() {
        console.log('🚀 Initializing StudentManager...');
        
        try {
            await this._loadEssentialData();
            await this._setupEventListeners();
            await this.loadStudentsTable();
            
            console.log('✅ StudentManager ready');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this._showToast('Failed to initialize student module', 'error');
        }
    }
    
    /**
     * Load essential data
     */
    async _loadEssentialData() {
        try {
            // Load programs
            if (this.db.getPrograms) {
                const rawPrograms = await this.db.getPrograms();
                if (rawPrograms && Array.isArray(rawPrograms)) {
                    this.programs = rawPrograms;
                }
            }
            
            // Load centres
            if (this.db.getCentres) {
                const rawCentres = await this.db.getCentres();
                if (rawCentres && Array.isArray(rawCentres)) {
                    this.centres = rawCentres;
                }
            }
            
            // Populate dropdowns
            this._populateAllDropdowns();
            
        } catch (error) {
            console.error('❌ Error loading essential data:', error);
            this._showToast('Error loading programs and centres', 'error');
        }
    }
    
    /**
     * Populate all dropdowns
     */
    _populateAllDropdowns() {
        this._populateProgramSelect();
        this._populateCentreSelect();
        this._populateIntakeYears();
    }
    
    /**
     * Populate program select
     */
    _populateProgramSelect() {
        const select = document.getElementById('studentProgram');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Program</option>';
        
        if (this.programs.length > 0) {
            this.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.code || program.id;
                option.textContent = program.name || program.code;
                select.appendChild(option);
            });
        }
    }
    
    /**
     * Populate centre select
     */
    _populateCentreSelect() {
        const select = document.getElementById('studentCentre');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Centre</option>';
        
        if (this.centres.length > 0) {
            this.centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = centre.id;
                option.textContent = centre.name || centre.code;
                select.appendChild(option);
            });
        }
    }
    
    /**
     * Populate intake years
     */
    _populateIntakeYears(studentIntakeYear = null) {
        try {
            const intakeSelect = document.getElementById('studentIntake');
            if (!intakeSelect) return;
            
            intakeSelect.innerHTML = '<option value="">Select Intake Year</option>';
            const currentYear = new Date().getFullYear();
            
            // Add years from current year -5 to current year +2
            for (let year = currentYear + 2; year >= currentYear - 5; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeSelect.appendChild(option);
                
                // Select if matches student intake year
                if (studentIntakeYear && year === parseInt(studentIntakeYear)) {
                    option.selected = true;
                }
            }
            
            // Select current year if no specific year provided and not editing
            if (!studentIntakeYear) {
                intakeSelect.value = currentYear;
            }
            
        } catch (error) {
            console.error('Error populating intake years:', error);
        }
    }
    
    /**
     * Setup event listeners
     */
    async _setupEventListeners() {
        console.log('🔌 Setting up event listeners...');
        
        // Form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this._saveStudent(e));
        }
        
        // Search input
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                this._handleSearch();
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._closeModal();
            });
        });
        
        // Registration number generation triggers
        const programSelect = document.getElementById('studentProgram');
        const intakeSelect = document.getElementById('studentIntake');
        
        if (programSelect) {
            programSelect.addEventListener('change', () => this.generateRegNumber());
        }
        if (intakeSelect) {
            intakeSelect.addEventListener('change', () => this.generateRegNumber());
        }
        
        // Advanced filters toggle
        const advancedBtn = document.querySelector('.btn-advanced');
        if (advancedBtn) {
            advancedBtn.addEventListener('click', () => {
                this._toggleAdvancedFilters();
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Handle search
     */
    _handleSearch() {
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        this._renderStudentsTable();
    }
    
    /**
     * Apply current filters to students
     */
    _applyCurrentFilters(students) {
        return students.filter(student => {
            // Search filter
            if (this.searchTerm) {
                const searchLower = this.searchTerm.toLowerCase();
                const matches = 
                    (student.reg_number?.toLowerCase() || '').includes(searchLower) ||
                    (student.full_name?.toLowerCase() || '').includes(searchLower) ||
                    (student.email?.toLowerCase() || '').includes(searchLower) ||
                    (student.phone?.toLowerCase() || '').includes(searchLower) ||
                    (student.program?.toLowerCase() || '').includes(searchLower) ||
                    (student.id_number?.toLowerCase() || '').includes(searchLower);
                
                if (!matches) return false;
            }
            
            // Active filters
            for (const [key, value] of Object.entries(this.activeFilters)) {
                if (value) {
                    if (student[key] != value) {
                        return false;
                    }
                }
            }
            
            return true;
        });
    }
    
    /**
     * Load students table
     */
    async loadStudentsTable() {
        try {
            this._showLoading(true, 'Loading students...');
            
            this.allStudents = await this.db.getStudents();
            this.filteredStudents = this._applyCurrentFilters(this.allStudents);
            
            this._renderStudentsTable();
            this._updateCounters();
            
            console.log(`✅ Loaded ${this.allStudents.length} students`);
            
        } catch (error) {
            console.error('❌ Error loading students:', error);
            this._showToast('Failed to load students', 'error');
            this._renderErrorState();
        } finally {
            this._showLoading(false);
        }
    }
    
    /**
     * Render students table
     */
    _renderStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (this.filteredStudents.length === 0) {
            this._renderEmptyState(tbody);
            return;
        }
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredStudents.length);
        const pageStudents = this.filteredStudents.slice(startIndex, endIndex);
        this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize);
        
        // Generate table rows
        const rows = pageStudents.map((student, index) => {
            const rowIndex = startIndex + index + 1;
            return this._createStudentRow(student, rowIndex);
        }).join('');
        
        tbody.innerHTML = rows;
        
        // Update pagination controls
        this._updatePaginationControls();
        this._updateCounters();
    }
    
    /**
     * Create student row
     */
    _createStudentRow(student, index) {
        const status = student.status || 'active';
        
        return `
            <tr>
                <td>
                    <input type="checkbox" data-student-id="${student.id}">
                </td>
                <td>
                    <strong>${this._escapeHtml(student.reg_number)}</strong>
                </td>
                <td>
                    <div>
                        <strong>${this._escapeHtml(student.full_name)}</strong><br>
                        <small>${this._escapeHtml(student.email || 'No email')}</small>
                    </div>
                </td>
                <td>
                    ${this._escapeHtml(student.program || 'No program')}<br>
                    <small>Year ${student.year_level || '1'}</small>
                </td>
                <td>
                    ${this._escapeHtml(student.phone || 'No phone')}
                </td>
                <td>
                    <span class="status-badge status-${status}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td>
                    <button class="btn-action btn-edit" data-id="${student.id}" 
                            title="Edit Student" onclick="app.students?.editStudent('${student.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-view" data-id="${student.id}" 
                            title="View Details" onclick="app.students?.viewStudent('${student.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-delete" data-id="${student.id}" 
                            title="Delete Student" onclick="app.students?.deleteStudent('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    /**
     * Update pagination controls
     */
    _updatePaginationControls() {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer) return;
        
        pageNumbersContainer.innerHTML = '';
        
        // Simple pagination - show first, current-1, current, current+1, last
        const pages = [];
        if (this.totalPages <= 5) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (this.currentPage > 3) pages.push('...');
            for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(this.totalPages - 1, this.currentPage + 1); i++) {
                pages.push(i);
            }
            if (this.currentPage < this.totalPages - 2) pages.push('...');
            pages.push(this.totalPages);
        }
        
        pages.forEach(page => {
            if (page === '...') {
                const dots = document.createElement('span');
                dots.className = 'page-dots';
                dots.textContent = '...';
                pageNumbersContainer.appendChild(dots);
            } else {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${page === this.currentPage ? 'active' : ''}`;
                pageBtn.textContent = page;
                pageBtn.onclick = () => this._goToPage(page);
                pageNumbersContainer.appendChild(pageBtn);
            }
        });
    }
    
    /**
     * Go to specific page
     */
    _goToPage(page) {
        this.currentPage = page;
        this._renderStudentsTable();
    }
    
    /**
     * Go to previous page
     */
    _previousPage() {
        if (this.currentPage > 1) {
            this._goToPage(this.currentPage - 1);
        }
    }
    
    /**
     * Go to next page
     */
    _nextPage() {
        if (this.currentPage < this.totalPages) {
            this._goToPage(this.currentPage + 1);
        }
    }
    
    /**
     * Change page size
     */
    _changePageSize(size) {
        this.pageSize = parseInt(size);
        this.currentPage = 1;
        this._renderStudentsTable();
    }
    
    /**
     * Toggle select all
     */
    _toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-student-id]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }
    
    /**
     * Handle quick filter
     */
    _handleQuickFilter(filterType) {
        // Remove active class from all chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        
        // Add active class to clicked chip
        event.currentTarget.classList.add('active');
        
        // Reset all filters first
        this.clearAllFilters();
        
        // Apply specific filter
        switch(filterType) {
            case 'all':
                // No filter needed
                break;
            case 'active':
                this.activeFilters.status = 'active';
                break;
            case 'inactive':
                this.activeFilters.status = 'inactive';
                break;
            case 'graduated':
                this.activeFilters.status = 'graduated';
                break;
        }
        
        this._handleSearch();
    }
    
    /**
     * Toggle advanced filters
     */
    _toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        if (advancedFilters) {
            const isVisible = advancedFilters.style.display !== 'none';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.value = '';
            this.searchTerm = '';
            this._handleSearch();
        }
    }
    
    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.searchTerm = '';
        this.activeFilters = {
            program: '',
            year: '',
            centre: '',
            county: '',
            status: '',
            intake_year: ''
        };
        
        // Reset all filter inputs
        const filterIds = ['filterProgram', 'filterYear', 'filterCentre', 
                          'filterCounty', 'filterStatus', 'filterIntake'];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        this._handleSearch();
    }
    
    /**
     * Apply filters
     */
    applyFilters() {
        // Get filter values
        this.activeFilters.program = document.getElementById('filterProgram')?.value || '';
        this.activeFilters.year = document.getElementById('filterYear')?.value || '';
        this.activeFilters.centre = document.getElementById('filterCentre')?.value || '';
        this.activeFilters.county = document.getElementById('filterCounty')?.value || '';
        this.activeFilters.status = document.getElementById('filterStatus')?.value || '';
        this.activeFilters.intake_year = document.getElementById('filterIntake')?.value || '';
        
        this._handleSearch();
        this._toggleAdvancedFilters();
    }
    
    /**
     * Refresh insights
     */
    refreshInsights() {
        this._updateLastUpdatedTime();
        this._showToast('Insights refreshed', 'success');
    }
    
    /**
     * Update last updated time
     */
    _updateLastUpdatedTime() {
        const lastUpdatedElement = document.getElementById('lastUpdatedTime');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = 'Just now';
        }
    }
    
    /**
     * Update counters
     */
    _updateCounters() {
        // Update record count
        const displayCount = document.getElementById('displayCount');
        if (displayCount) {
            displayCount.textContent = this.filteredStudents.length;
        }
        
        // Update total records
        const totalRecords = document.getElementById('totalRecords');
        if (totalRecords) {
            totalRecords.textContent = this.filteredStudents.length;
        }
        
        // Update pagination info
        this._updatePaginationInfo();
    }
    
    /**
     * Update pagination info
     */
    _updatePaginationInfo() {
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.filteredStudents.length);
        
        const pageStart = document.getElementById('pageStart');
        const pageEnd = document.getElementById('pageEnd');
        
        if (pageStart) pageStart.textContent = start;
        if (pageEnd) pageEnd.textContent = end;
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <h3>No Students Found</h3>
                    <p>${this.allStudents.length === 0 ? 'Get started by adding your first student.' : 'No students match your search criteria.'}</p>
                </td>
            </tr>
        `;
    }
    
    /**
     * Render error state
     */
    _renderErrorState() {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Students</h3>
                        <p>Unable to load student data. Please try again.</p>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Save student
     */
    async _saveStudent(event) {
        event.preventDefault();
        
        try {
            // Validate form
            if (!this._validateStudentForm()) {
                return;
            }
            
            // Prepare form data
            const formData = this._prepareFormData();
            
            // Save to database
            if (this.currentEditId) {
                await this.db.updateStudent(this.currentEditId, formData);
                this._showToast('✅ Student updated successfully!', 'success');
            } else {
                await this.db.addStudent(formData);
                this._showToast('✅ Student registered successfully!', 'success');
            }
            
            // Reset and reload
            this._resetStudentForm();
            this._closeModal();
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('❌ Error saving student:', error);
            this._showToast('Failed to save student', 'error');
        }
    }
    
    /**
     * Validate student form
     */
    _validateStudentForm() {
        const requiredFields = [
            { id: 'studentName', name: 'Full Name' },
            { id: 'studentEmail', name: 'Email' },
            { id: 'studentProgram', name: 'Program' },
            { id: 'studentIntake', name: 'Intake Year' },
            { id: 'studentCentre', name: 'Study Centre' }
        ];
        
        const missingFields = [];
        
        requiredFields.forEach(({ id, name }) => {
            const field = document.getElementById(id);
            if (field && !field.value.trim()) {
                missingFields.push(name);
            }
        });
        
        if (missingFields.length > 0) {
            this._showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Prepare form data
     */
    _prepareFormData() {
        return {
            reg_number: document.getElementById('studentRegNumber')?.value.trim() || '',
            full_name: document.getElementById('studentName')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            phone: document.getElementById('studentPhone')?.value.trim() || '',
            id_number: document.getElementById('studentIdNumber')?.value.trim() || '',
            gender: document.getElementById('studentGender')?.value || '',
            program: document.getElementById('studentProgram')?.value || '',
            intake_year: parseInt(document.getElementById('studentIntake')?.value) || new Date().getFullYear(),
            centre_id: document.getElementById('studentCentre')?.value || '',
            status: document.getElementById('studentStatus')?.value || 'active',
            registration_date: document.getElementById('studentRegDate')?.value || new Date().toISOString().split('T')[0]
        };
    }
    
    /**
     * Open student modal
     */
    openStudentModal() {
        this._resetStudentForm();
        this._openModal('studentModal');
    }
    
    /**
     * Reset student form
     */
    _resetStudentForm() {
        const form = document.getElementById('studentForm');
        if (!form) return;
        
        // Reset form
        form.reset();
        
        // Reset modal title and button
        const modalTitle = document.getElementById('studentModalTitle');
        const submitBtn = document.getElementById('submitButtonText');
        
        if (modalTitle) modalTitle.textContent = 'Register New Student';
        if (submitBtn) submitBtn.textContent = 'Register Student';
        
        // Reset edit ID
        this.currentEditId = null;
        
        // Generate registration number
        this.generateRegNumber();
        
        // Set registration date to today
        const regDateField = document.getElementById('studentRegDate');
        if (regDateField) {
            regDateField.value = new Date().toISOString().split('T')[0];
        }
        
        // Populate intake years with current year
        this._populateIntakeYears();
    }
    
    /**
     * Generate registration number
     */
    async generateRegNumber() {
        try {
            const programSelect = document.getElementById('studentProgram');
            const intakeSelect = document.getElementById('studentIntake');
            const regNumberInput = document.getElementById('studentRegNumber');
            
            if (!programSelect || !intakeSelect || !regNumberInput) return;
            
            const programCode = programSelect.value;
            const intakeYear = intakeSelect.value;
            
            if (!programCode || !intakeYear) {
                regNumberInput.value = '';
                return;
            }
            
            // Get last sequence number for this program and year
            const allStudents = await this.db.getStudents();
            const matchingStudents = allStudents.filter(student => 
                student.program === programCode && 
                student.intake_year?.toString() === intakeYear
            );
            
            let highestSeq = 0;
            matchingStudents.forEach(student => {
                if (student.reg_number) {
                    const match = student.reg_number.match(new RegExp(`${programCode}-${intakeYear}-(\\d+)`));
                    if (match) {
                        const seq = parseInt(match[1]);
                        if (!isNaN(seq) && seq > highestSeq) {
                            highestSeq = seq;
                        }
                    }
                }
            });
            
            const sequenceNumber = highestSeq + 1;
            const regNumber = `${programCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
            
            regNumberInput.value = regNumber;
            
        } catch (error) {
            console.error('❌ Error generating registration number:', error);
        }
    }
    
    /**
     * Edit student
     */
    async editStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this._showToast('Student not found', 'error');
                return;
            }
            
            this.currentEditId = studentId;
            
            // Populate form
            await this._populateEditForm(student);
            
            // Update UI for edit mode
            this._setupEditMode();
            
            // Open modal
            this._openModal('studentModal');
            
        } catch (error) {
            console.error('❌ Error editing student:', error);
            this._showToast('Failed to load student data', 'error');
        }
    }
    
    /**
     * Populate edit form
     */
    async _populateEditForm(student) {
        // Set field values
        this._setFieldValue('studentRegNumber', student.reg_number, true);
        this._setFieldValue('studentName', student.full_name);
        this._setFieldValue('studentEmail', student.email);
        this._setFieldValue('studentPhone', student.phone);
        this._setFieldValue('studentIdNumber', student.id_number);
        this._setFieldValue('studentGender', student.gender);
        
        // Academic
        this._setFieldValue('studentProgram', student.program);
        this._setFieldValue('studentCentre', student.centre_id);
        
        // Custom intake year population
        await this._populateIntakeYears(student.intake_year);
        
        this._setFieldValue('studentStatus', student.status || 'active');
        
        // Registration date
        this._setFieldValue('studentRegDate', student.registration_date ? 
            new Date(student.registration_date).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0]
        );
    }
    
    /**
     * Set field value
     */
    _setFieldValue(fieldId, value, readOnly = false) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            if (readOnly) {
                field.readOnly = true;
                field.style.backgroundColor = '#f3f4f6';
            }
        }
    }
    
    /**
     * Setup edit mode
     */
    _setupEditMode() {
        // Update modal title
        const modalTitle = document.getElementById('studentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Student';
        }
        
        // Update submit button
        const submitBtn = document.getElementById('submitButtonText');
        if (submitBtn) {
            submitBtn.textContent = 'Update Student';
        }
    }
    
    /**
     * View student
     */
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this._showToast('Student not found', 'error');
                return;
            }
            
            // Simple alert view for now
            alert(`
                Student Details:
                
                Name: ${student.full_name}
                Registration: ${student.reg_number}
                Email: ${student.email || 'N/A'}
                Phone: ${student.phone || 'N/A'}
                Program: ${student.program || 'N/A'}
                Centre: ${this._getCentreDisplayName(student.centre_id)}
                Status: ${student.status || 'active'}
                Registration Date: ${student.registration_date || 'N/A'}
            `);
            
        } catch (error) {
            console.error('❌ Error viewing student:', error);
            this._showToast('Failed to load student details', 'error');
        }
    }
    
    /**
     * Delete student
     */
    async deleteStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this._showToast('Student not found', 'error');
                return;
            }
            
            if (confirm(`Are you sure you want to delete ${student.full_name}?`)) {
                await this.db.deleteStudent(studentId);
                this._showToast(`Student ${student.full_name} deleted`, 'success');
                await this.loadStudentsTable();
            }
            
        } catch (error) {
            console.error('❌ Error deleting student:', error);
            this._showToast('Failed to delete student', 'error');
        }
    }
    
    /**
     * Get centre display name
     */
    _getCentreDisplayName(centreId) {
        if (!centreId) return 'Not assigned';
        
        const centre = this.centres.find(c => c.id === centreId);
        return centre ? centre.name : 'Unknown centre';
    }
    
    /**
     * Open modal
     */
    _openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * Close modal
     */
    _closeModal() {
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    /**
     * Set view mode
     */
    _setViewMode(mode) {
        this.viewMode = mode;
        
        // Update active button state
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current mode button
        const activeBtn = event.currentTarget;
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // For now, only table view is supported
        this._renderStudentsTable();
    }
    
    /**
     * Show toast
     */
    _showToast(message, type = 'info') {
        // Simple toast implementation
        alert(`${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * Show loading
     */
    _showLoading(show, message = 'Loading...') {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (show) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>${message}</span>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Escape HTML
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Export functions for global use
    exportStudents() {
        this._showToast('Export feature coming soon', 'info');
    }
    
    bulkUpload() {
        this._showToast('Bulk upload feature coming soon', 'info');
    }
    
    generateReports() {
        this._showToast('Report generation feature coming soon', 'info');
    }
    
    sendCommunications() {
        this._showToast('Communications feature coming soon', 'info');
    }
    
    printDocuments() {
        this._showToast('Document printing feature coming soon', 'info');
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
}
