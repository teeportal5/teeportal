// modules/students.js - FIXED VERSION
class StudentManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        
        // Initialize debounced methods properly
        this._debouncedSearch = null;
        this._debouncedFilter = null;
        
        // Enhanced UI handlers
        this.ui = this._createUIHandlers();
        
        // State management
        this.currentEditId = null;
        this.selectedStudents = new Set();
        this.centres = [];
        this.programs = [];
        this.filteredStudents = [];
        this.allStudents = [];
        
        // Performance and caching
        this.cache = {
            students: null,
            lastFetch: 0,
            cacheDuration: 30000 // 30 seconds
        };
        
        // Search and filtering
        this.searchTerm = '';
        this.activeFilters = {
            county: '',
            centre: '',
            program: '',
            status: '',
            intake_year: ''
        };
        
        // Pagination
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalPages = 1;
        
        // Analytics
        this.analytics = {
            total: 0,
            active: 0,
            inactive: 0,
            byProgram: {},
            byCentre: {},
            byIntake: {}
        };
        
        console.log('🎓 StudentManager initialized');
    }
    
    /**
     * Create enhanced UI handlers
     */
    _createUIHandlers() {
        return {
            showToast: (message, type = 'info', duration = 5000) => {
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(message, type, duration);
                } else {
                    this._showSimpleToast(message, type, duration);
                }
            },
            
            showLoading: (show = true, message = 'Loading...') => {
                if (show) {
                    this._showLoader(message);
                } else {
                    this._hideLoader();
                }
            },
            
            showConfirmation: (options) => {
                return new Promise((resolve) => {
                    if (window.confirm(options.message)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            },
            
            openModal: (id, options = {}) => {
                const modal = document.getElementById(id);
                if (modal) {
                    if (options.onOpen) options.onOpen();
                    
                    modal.classList.add('active');
                    modal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                    
                    // Focus first input
                    setTimeout(() => {
                        const firstInput = modal.querySelector('input, select, textarea');
                        if (firstInput) firstInput.focus();
                    }, 100);
                }
            },
            
            closeModal: (id, options = {}) => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    
                    if (options.onClose) options.onClose();
                }
            },
            
            updateElement: (id, content) => {
                const element = document.getElementById(id);
                if (element) {
                    element.innerHTML = content;
                }
            }
        };
    }
    
    /**
     * Initialize with enhanced features
     */
    async init() {
        console.log('🚀 Initializing StudentManager...');
        
        try {
            // Show loading state
            this.ui.showLoading(true, 'Loading student data...');
            
            // Initialize debounced methods AFTER all methods are defined
            this._debouncedSearch = this._debounce(this._performSearch.bind(this), 300);
            this._debouncedFilter = this._debounce(this._applyFilters.bind(this), 200);
            
            // Load initial data
            await Promise.all([
                this._loadEssentialData(),
                this._setupEventListeners(),
                this._setupKeyboardShortcuts()
            ]);
            
            // Load and render
            await this.loadStudentsTable();
            
            // Update analytics dashboard
            this._updateAnalytics();
            
            // Preload related data
            this._preloadRelatedData();
            
            console.log('✅ StudentManager ready');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.ui.showToast('Failed to initialize student module', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Perform search
     */
    _performSearch() {
        this._applyFilters();
    }
    
    /**
     * Apply filters
     */
    _applyFilters() {
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        this._renderStudentsTable();
    }
    
    /**
     * Load essential data
     */
    async _loadEssentialData() {
        try {
            console.log('🔄 Loading essential data...');
            
            // Load programs
            if (this.db.getPrograms) {
                const rawPrograms = await this.db.getPrograms();
                
                if (rawPrograms && Array.isArray(rawPrograms) && rawPrograms.length > 0) {
                    this.programs = this._normalizePrograms(rawPrograms);
                    console.log(`✅ Loaded ${this.programs.length} programs`);
                } else {
                    console.warn('⚠️ No valid programs returned');
                    this.programs = [];
                }
            }
            
            // Load centres
            if (this.db.getCentres) {
                const rawCentres = await this.db.getCentres();
                
                if (rawCentres && Array.isArray(rawCentres) && rawCentres.length > 0) {
                    this.centres = rawCentres;
                    console.log(`📍 Loaded ${this.centres.length} centres`);
                } else {
                    console.warn('⚠️ No valid centres returned');
                    this.centres = [];
                }
            }
            
            // Populate dropdowns
            this._populateAllDropdowns();
            
            console.log('✅ Essential data loaded');
            
        } catch (error) {
            console.error('❌ Error loading essential data:', error);
            this.ui.showToast('Error loading programs and centres', 'error');
        }
    }
    
    /**
     * Normalize program data
     */
    _normalizePrograms(programs) {
        return programs.map(program => ({
            id: program.id || program.program_id || '',
            code: (program.code || program.program_code || '').trim(),
            name: (program.name || program.program_name || 'Unnamed Program').trim(),
            duration: program.duration || 0,
            credits: program.credits || 0,
            status: program.status || 'active'
        })).filter(p => p.code && p.name);
    }
    
    /**
     * Populate all dropdowns
     */
    _populateAllDropdowns() {
        this._populateProgramSelect();
        this._populateCentreSelect();
        this._populateFilterDropdowns();
        this._populateIntakeYears();
        this._populateCountySelect();
    }
    
    /**
     * Populate program select
     */
    _populateProgramSelect() {
        const select = document.getElementById('studentProgram');
        if (!select) {
            console.warn('studentProgram select element not found');
            return;
        }
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Program</option>';
        
        if (this.programs.length > 0) {
            this.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.code;
                option.textContent = `${program.code} - ${program.name}`;
                option.dataset.programId = program.id;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
            
            console.log(`✅ Populated ${this.programs.length} programs`);
        }
    }
    
    /**
     * Populate centre select
     */
    _populateCentreSelect() {
        const select = document.getElementById('studentCentre');
        if (!select) {
            console.warn('studentCentre select element not found');
            return;
        }
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Centre</option>';
        
        if (this.centres.length > 0) {
            this.centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = centre.id;
                option.textContent = `${centre.name} (${centre.code || centre.county || 'Centre'})`;
                option.dataset.centreCode = centre.code || '';
                option.dataset.county = centre.county || '';
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
            
            console.log(`✅ Populated ${this.centres.length} centres`);
        }
    }
    
    /**
     * Populate filter dropdowns
     */
    _populateFilterDropdowns() {
        // Program filter
        const programFilter = document.getElementById('filterProgram');
        if (programFilter) {
            programFilter.innerHTML = '<option value="">All Programs</option>';
            
            const uniquePrograms = [...new Set(this.allStudents.map(s => s.program).filter(Boolean))];
            uniquePrograms.sort().forEach(program => {
                const option = document.createElement('option');
                option.value = program;
                option.textContent = this._getProgramDisplayName(program);
                programFilter.appendChild(option);
            });
        }
        
        // Centre filter
        const centreFilter = document.getElementById('filterCentre');
        if (centreFilter) {
            centreFilter.innerHTML = '<option value="">All Centres</option>';
            
            const uniqueCentres = [...new Set(this.allStudents.map(s => s.centre_id).filter(Boolean))];
            uniqueCentres.forEach(centreId => {
                const centre = this.centres.find(c => c.id === centreId);
                if (centre) {
                    const option = document.createElement('option');
                    option.value = centreId;
                    option.textContent = centre.name;
                    centreFilter.appendChild(option);
                }
            });
        }
    }
    
    /**
     * Populate intake years
     */
    _populateIntakeYears(studentIntakeYear = null) {
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
                }
            }
            
            // Add years from current year -5 to current year +2
            for (let i = 5; i >= 0; i--) {
                const year = currentYear - i;
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeSelect.appendChild(option);
            }
            
            for (let i = 1; i <= 2; i++) {
                const year = currentYear + i;
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeSelect.appendChild(option);
            }
            
            // Select current year if no specific year provided
            if (!studentIntakeYear) {
                intakeSelect.value = currentYear;
            }
            
        } catch (error) {
            console.error('Error populating intake years:', error);
        }
    }
    
    /**
     * Populate county select with Kenyan counties
     */
    _populateCountySelect() {
        const countySelect = document.getElementById('studentCounty');
        if (!countySelect) return;
        
        const kenyanCounties = [
            'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
            'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
            'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
            'Makueni', 'Mandera', 'Meru', 'Migori', 'Marsabit', 'Mombasa', 'Murang\'a', 'Nairobi',
            'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
            'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
            'Vihiga', 'Wajir', 'West Pokot'
        ];
        
        countySelect.innerHTML = '<option value="">Select County</option>';
        kenyanCounties.sort().forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countySelect.appendChild(option);
        });
    }
    
    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        console.log('🔌 Setting up event listeners...');
        
        // Form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        // Real-time search
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                this._debouncedSearch();
            });
        }
        
        // Filters
        ['filterCentre', 'filterProgram', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.activeFilters[id.replace('filter', '').toLowerCase()] = element.value;
                    this._debouncedFilter();
                });
            }
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
        
        // Add new student button
        const addStudentBtn = document.querySelector('[onclick*="openStudentModal"], #addStudentBtn');
        if (addStudentBtn) {
            addStudentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openStudentModal();
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Setup keyboard shortcuts
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N for new student
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openStudentModal();
            }
            
            // Ctrl/Cmd + F for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('studentSearch');
                if (searchInput) searchInput.focus();
            }
        });
    }
    
    /**
     * Preload related data
     */
    async _preloadRelatedData() {
        try {
            if (this.db.getMarksTableData) {
                this.marksData = await this.db.getMarksTableData();
                console.log(`📊 Preloaded ${this.marksData?.length || 0} marks records`);
            }
        } catch (error) {
            console.warn('Could not preload marks data:', error);
        }
    }
    
    /**
     * Load students table
     */
    async loadStudentsTable() {
        try {
            this.ui.showLoading(true, 'Loading students...');
            
            const now = Date.now();
            if (this.cache.students && now - this.cache.lastFetch < this.cache.cacheDuration) {
                console.log('📦 Using cached students data');
                this.allStudents = this.cache.students;
            } else {
                console.log('🔄 Fetching fresh students data');
                this.allStudents = await this.db.getStudents();
                this.cache.students = this.allStudents;
                this.cache.lastFetch = now;
            }
            
            this._updateAnalytics();
            this.filteredStudents = this._applyCurrentFilters(this.allStudents);
            this._renderStudentsTable();
            this._populateFilterDropdowns();
            
            console.log(`✅ Loaded ${this.allStudents.length} students`);
            
        } catch (error) {
            console.error('❌ Error loading students:', error);
            this.ui.showToast('Failed to load students', 'error');
            this._renderErrorState();
        } finally {
            this.ui.showLoading(false);
        }
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
                    (student.program?.toLowerCase() || '').includes(searchLower);
                
                if (!matches) return false;
            }
            
            // Active filters
            for (const [key, value] of Object.entries(this.activeFilters)) {
                if (value && student[key] !== value) {
                    return false;
                }
            }
            
            return true;
        });
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
        const endIndex = startIndex + this.pageSize;
        const pageStudents = this.filteredStudents.slice(startIndex, endIndex);
        this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize);
        
        // Generate table rows
        const rows = pageStudents.map((student, index) => {
            const rowIndex = startIndex + index + 1;
            return this._createStudentRow(student, rowIndex);
        }).join('');
        
        tbody.innerHTML = rows;
        
        // Add event listeners
        this._attachRowEventListeners();
        
        // Update counter
        this._updateStudentCounter();
    }
    
    /**
     * Create student row
     */
    _createStudentRow(student, index) {
        const programDisplay = this._getProgramDisplayName(student.program);
        const centreDisplay = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const hasEmail = student.email && student.email.trim() !== '';
        
        return `
            <tr data-student-id="${this._escapeAttr(student.id)}" 
                data-student-reg="${this._escapeAttr(student.reg_number)}"
                class="${status === 'inactive' ? 'inactive-student' : ''}">
                
                <td style="width: 60px; text-align: center; color: #6b7280; font-weight: 600;">
                    ${index}
                </td>
                
                <td>
                    <strong>${this._escapeHtml(student.reg_number)}</strong>
                </td>
                
                <td>
                    <div class="student-info-compact">
                        <div class="student-avatar-small" style="background-color: ${this._getAvatarColor(student.full_name)}">
                            ${this._getStudentInitials(student.full_name)}
                        </div>
                        <div>
                            <div class="student-name">
                                <strong>${this._escapeHtml(student.full_name)}</strong>
                                ${!hasEmail ? '<span class="warning-badge" title="No email"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                            </div>
                            <div class="student-meta">
                                ${student.email ? `<span class="student-email">${this._escapeHtml(student.email)}</span>` : ''}
                                ${student.phone ? `<span class="student-phone">${this._escapeHtml(student.phone)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                
                <td>
                    <div class="program-badge">
                        ${this._escapeHtml(programDisplay)}
                    </div>
                </td>
                
                <td>
                    ${this._escapeHtml(centreDisplay)}
                    ${student.county ? `<br><small class="text-muted">${this._escapeHtml(student.county)}</small>` : ''}
                </td>
                
                <td>
                    ${this._escapeHtml(student.intake_year || 'N/A')}
                </td>
                
                <td>
                    <span class="status-indicator ${status}">
                        <i class="fas fa-circle"></i>
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                
                <td class="action-buttons">
                    <div class="btn-group">
                        <button class="btn-action btn-view" data-id="${this._escapeAttr(student.id)}" 
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" data-id="${this._escapeAttr(student.id)}" 
                                title="Edit Student">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-marks" data-id="${this._escapeAttr(student.id)}" 
                                title="Enter Marks">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn-action btn-delete" data-id="${this._escapeAttr(student.id)}" 
                                title="Delete Student">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Attach row event listeners
     */
    _attachRowEventListeners() {
        document.querySelectorAll('.btn-view').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.viewStudent(studentId);
            });
        });
        
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.editStudent(studentId);
            });
        });
        
        document.querySelectorAll('.btn-marks').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.enterMarks(studentId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.deleteStudent(studentId);
            });
        });
    }
    
    /**
     * Update student counter
     */
    _updateStudentCounter() {
        const counterElement = document.getElementById('studentCounter');
        if (counterElement) {
            counterElement.textContent = `Showing ${this.filteredStudents.length} of ${this.allStudents.length} students`;
        }
    }
    
    /**
     * Update analytics
     */
    _updateAnalytics() {
        this.analytics.total = this.allStudents.length;
        this.analytics.active = this.allStudents.filter(s => s.status === 'active').length;
        this.analytics.inactive = this.allStudents.filter(s => s.status === 'inactive').length;
        
        // Count by program
        this.analytics.byProgram = {};
        this.allStudents.forEach(student => {
            const program = student.program || 'Unknown';
            this.analytics.byProgram[program] = (this.analytics.byProgram[program] || 0) + 1;
        });
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>${this.allStudents.length === 0 ? 'Get started by adding your first student.' : 'No students match your search criteria.'}</p>
                    ${this.allStudents.length === 0 ? `
                        <button class="btn-primary" onclick="app.students.openStudentModal()">
                            <i class="fas fa-plus"></i> Add Your First Student
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="app.students.clearFilters()">
                            <i class="fas fa-filter"></i> Clear Filters
                        </button>
                    `}
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
                    <td colspan="8" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Students</h3>
                        <p>Unable to load student data. Please try again.</p>
                        <button class="btn-primary" onclick="app.students.loadStudentsTable()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Save student
     */
    async saveStudent(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'studentForm') return;
        
        try {
            // Validate form
            if (!this._validateStudentForm()) {
                return;
            }
            
            // Prepare form data
            const formData = this._prepareFormData();
            
            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            // Save to database
            let result;
            if (this.currentEditId) {
                result = await this.db.updateStudent(this.currentEditId, formData);
                this.ui.showToast('✅ Student updated successfully!', 'success');
            } else {
                result = await this.db.addStudent(formData);
                const regNumber = result.reg_number || formData.reg_number;
                this.ui.showToast(`✅ Student registered! Registration: ${regNumber}`, 'success');
            }
            
            // Clear cache
            this.cache.students = null;
            
            // Reset and reload
            this._resetStudentForm();
            this.ui.closeModal('studentModal');
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('❌ Error saving student:', error);
            this.ui.showToast(error.message || 'Failed to save student', 'error');
            
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
     * Validate student form
     */
    _validateStudentForm() {
        const requiredFields = [
            { id: 'studentName', name: 'Full Name' },
            { id: 'studentEmail', name: 'Email' },
            { id: 'studentProgram', name: 'Program' },
            { id: 'studentIntake', name: 'Intake Year' }
        ];
        
        const missingFields = [];
        
        requiredFields.forEach(({ id, name }) => {
            const field = document.getElementById(id);
            if (field && !field.value.trim()) {
                missingFields.push(name);
            }
        });
        
        if (missingFields.length > 0) {
            this.ui.showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
            return false;
        }
        
        // Email validation
        const emailField = document.getElementById('studentEmail');
        if (emailField && emailField.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value.trim())) {
                this.ui.showToast('Please enter a valid email address', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Prepare form data
     */
    _prepareFormData() {
        const programSelect = document.getElementById('studentProgram');
        const selectedOption = programSelect?.options[programSelect?.selectedIndex];
        
        let programCode = '';
        let programName = '';
        
        if (selectedOption && selectedOption.value) {
            programCode = selectedOption.value;
            
            // Extract program name from text
            const optionText = selectedOption.textContent || '';
            if (optionText.includes(' - ')) {
                programName = optionText.split(' - ')[1].trim();
            } else {
                programName = programCode;
            }
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
        
        return {
            reg_number: document.getElementById('studentRegNumber')?.value.trim() || '',
            full_name: document.getElementById('studentName')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            phone: document.getElementById('studentPhone')?.value.trim() || '',
            date_of_birth: document.getElementById('studentDOB')?.value || '',
            id_number: document.getElementById('studentIdNumber')?.value.trim() || '',
            gender: document.getElementById('studentGender')?.value || '',
            county: document.getElementById('studentCounty')?.value || '',
            region: document.getElementById('studentRegion')?.value.trim() || '',
            address: document.getElementById('studentAddress')?.value.trim() || '',
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
            notes: document.getElementById('studentNotes')?.value.trim() || ''
        };
    }
    
    /**
     * Edit student
     */
    async editStudent(studentId) {
        try {
            this.ui.showLoading(true, 'Loading student data...');
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            this.currentEditId = studentId;
            
            // Populate form
            await this._populateEditForm(student);
            
            // Update UI for edit mode
            this._setupEditMode();
            
            // Open modal
            this.ui.openModal('studentModal', {
                onOpen: () => {
                    document.getElementById('studentName')?.focus();
                }
            });
            
            console.log(`✅ Loaded student data for editing: ${student.full_name}`);
            
        } catch (error) {
            console.error('❌ Error editing student:', error);
            this.ui.showToast('Failed to load student data', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Populate edit form
     */
    async _populateEditForm(student) {
        // Personal info
        this._setFieldValue('studentRegNumber', student.reg_number, true);
        this._setFieldValue('studentName', student.full_name);
        this._setFieldValue('studentEmail', student.email);
        this._setFieldValue('studentPhone', student.phone);
        this._setFieldValue('studentDOB', student.date_of_birth ? this._formatDateForInput(student.date_of_birth) : '');
        this._setFieldValue('studentIdNumber', student.id_number);
        this._setFieldValue('studentGender', student.gender);
        
        // Location
        this._setFieldValue('studentCounty', student.county);
        this._setFieldValue('studentRegion', student.region || student.sub_county);
        this._setFieldValue('studentAddress', student.address);
        
        // Academic
        this._setFieldValue('studentProgram', student.program);
        this._setFieldValue('studentCentre', student.centre_id || student.centre);
        
        // Custom intake year population
        await this._populateIntakeYears(student.intake_year);
        
        this._setFieldValue('studentStudyMode', student.study_mode || 'fulltime');
        this._setFieldValue('studentStatus', student.status || 'active');
        
        // Employment
        this._setFieldValue('studentEmployment', student.employment_status);
        this._setFieldValue('studentEmployer', student.employer);
        this._setFieldValue('studentJobTitle', student.job_title);
        this._setFieldValue('studentExperience', student.years_experience);
        
        // Emergency contact
        this._setFieldValue('studentEmergencyName', student.emergency_contact_name);
        this._setFieldValue('studentEmergencyPhone', student.emergency_contact_phone || student.emergency_contact);
        this._setFieldValue('studentEmergencyContact', student.emergency_contact_relationship);
        
        // Notes
        this._setFieldValue('studentNotes', student.notes);
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
                field.title = 'This field cannot be changed';
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
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
        }
    }
    
    /**
     * View student
     */
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            // Simple view modal
            const modalContent = `
                <div class="modal" style="display: block;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>Student Details</h3>
                            <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="student-profile">
                                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                                    <div style="background-color: ${this._getAvatarColor(student.full_name)}; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-user fa-2x" style="color: white;"></i>
                                    </div>
                                    <div>
                                        <h3 style="margin: 0;">${this._escapeHtml(student.full_name)}</h3>
                                        <p style="margin: 5px 0; color: #666;">${this._escapeHtml(student.reg_number)}</p>
                                        <span style="display: inline-block; padding: 4px 12px; background: ${student.status === 'active' ? '#d1fae5' : '#fee2e2'}; color: ${student.status === 'active' ? '#065f46' : '#991b1b'}; border-radius: 20px; font-size: 0.85rem;">
                                            ${this._escapeHtml(student.status?.toUpperCase() || 'ACTIVE')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <div>
                                        <h4>Personal Information</h4>
                                        <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                                        <p><strong>Gender:</strong> ${student.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4>Academic Information</h4>
                                        <p><strong>Program:</strong> ${this._getProgramDisplayName(student.program)}</p>
                                        <p><strong>Centre:</strong> ${this._getCentreDisplayName(student.centre_id, student.centre)}</p>
                                        <p><strong>Intake Year:</strong> ${student.intake_year || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">
                                Close
                            </button>
                            <button class="btn btn-primary" onclick="app.students.editStudent('${studentId}'); this.closest('.modal').style.display='none'">
                                Edit Student
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = modalContent;
            document.body.appendChild(modalDiv.firstElementChild);
            
        } catch (error) {
            console.error('❌ Error viewing student:', error);
            this.ui.showToast('Failed to load student details', 'error');
        }
    }
    
    /**
     * Delete student
     */
    async deleteStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            const confirmed = await this.ui.showConfirmation({
                message: `Are you sure you want to delete ${this._escapeHtml(student.full_name)} (${this._escapeHtml(student.reg_number)})? This action cannot be undone.`
            });
            
            if (!confirmed) return;
            
            await this.db.deleteStudent(studentId);
            
            // Clear cache
            this.cache.students = null;
            
            // Show success message
            this.ui.showToast(`Student ${student.full_name} deleted successfully`, 'success');
            
            // Reload table
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('❌ Error deleting student:', error);
            this.ui.showToast('Failed to delete student', 'error');
        }
    }
    
    /**
     * Enter marks for student
     */
    async enterMarks(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            this.ui.showToast(`Opening marks entry for ${student.full_name}`, 'info');
            
            // Navigate to marks page or open marks modal
            if (this.app?.marks?.openMarksModal) {
                this.app.marks.openMarksModal(studentId);
            } else {
                this.ui.showToast('Please use the Marks page to enter marks', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error entering marks:', error);
            this.ui.showToast('Failed to open marks entry', 'error');
        }
    }
    
    /**
     * Export students
     */
    async exportStudents() {
        try {
            this.ui.showLoading(true, 'Preparing export...');
            
            const studentsToExport = this.allStudents;
            
            if (studentsToExport.length === 0) {
                this.ui.showToast('No students to export', 'warning');
                return;
            }
            
            const data = studentsToExport.map(student => ({
                'Registration Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email || '',
                'Phone': student.phone || '',
                'Program': this._getProgramDisplayName(student.program),
                'Centre': this._getCentreDisplayName(student.centre_id, student.centre),
                'County': student.county || '',
                'Intake Year': student.intake_year,
                'Status': student.status || 'active',
                'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                'Gender': student.gender || '',
                'Registration Date': student.registration_date || student.created_at ? new Date(student.registration_date || student.created_at).toISOString().split('T')[0] : ''
            }));
            
            this._exportToCSV(data, 'students_export');
            
            this.ui.showToast(`Exported ${studentsToExport.length} students successfully`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting students:', error);
            this.ui.showToast('Failed to export students', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Export to CSV
     */
    _exportToCSV(data, fileName) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add UTF-8 BOM for Excel compatibility
        csvRows.push('\ufeff' + headers.join(','));
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                
                if (value === null || value === undefined) return '';
                
                let stringValue = String(value);
                
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    stringValue = stringValue.replace(/"/g, '""');
                    return `"${stringValue}"`;
                }
                
                return stringValue;
            });
            
            csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this._downloadBlob(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    }
    
    /**
     * Download blob
     */
    _downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    /**
     * Open student modal
     */
    openStudentModal() {
        this._resetStudentForm();
        this.ui.openModal('studentModal', {
            onOpen: () => {
                document.getElementById('studentName')?.focus();
            }
        });
    }
    
    /**
     * Reset student form
     */
    _resetStudentForm() {
        console.log('🔄 Resetting student form...');
        
        const form = document.getElementById('studentForm');
        if (!form) return;
        
        // Reset all fields
        form.reset();
        
        // Reset specific fields
        const regNumberInput = document.getElementById('studentRegNumber');
        if (regNumberInput) {
            regNumberInput.readOnly = false;
            regNumberInput.style.backgroundColor = '';
            regNumberInput.title = '';
        }
        
        // Reset modal title
        const modalTitle = document.getElementById('studentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Register New Student';
        }
        
        // Reset submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
            submitBtn.disabled = false;
        }
        
        // Reset edit ID
        this.currentEditId = null;
        
        // Populate intake years with current year
        this._populateIntakeYears();
        
        console.log('✅ Form reset complete');
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
            
            // Clean program code
            const cleanProgramCode = programCode.split('-')[0].trim();
            
            try {
                // Try database method first
                const regNumber = await this.db.generateRegistrationNumber(cleanProgramCode, intakeYear);
                
                if (regNumber) {
                    regNumberInput.value = regNumber;
                } else {
                    throw new Error('Database method returned null');
                }
            } catch (dbError) {
                console.warn('Using fallback registration number generation:', dbError);
                
                // Manual fallback
                const allStudents = await this.db.getStudents();
                const matchingStudents = allStudents.filter(student => {
                    const studentYear = student.intake_year?.toString();
                    return student.program === cleanProgramCode && studentYear === intakeYear;
                });
                
                let highestSeq = 0;
                matchingStudents.forEach(student => {
                    if (student.reg_number) {
                        const match = student.reg_number.match(new RegExp(`${cleanProgramCode}-${intakeYear}-(\\d+)`));
                        if (match) {
                            const seq = parseInt(match[1]);
                            if (!isNaN(seq) && seq > highestSeq) {
                                highestSeq = seq;
                            }
                        }
                    }
                });
                
                const sequenceNumber = highestSeq + 1;
                const regNumber = `${cleanProgramCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
                
                regNumberInput.value = regNumber;
            }
            
            // Update format display
            const formatSpan = document.getElementById('regNumberFormat');
            if (formatSpan) {
                formatSpan.textContent = `${cleanProgramCode}-${intakeYear}-###`;
            }
            
        } catch (error) {
            console.error('❌ Error generating registration number:', error);
        }
    }
    
    /**
     * Clear filters
     */
    clearFilters() {
        this.searchTerm = '';
        this.activeFilters = {
            county: '',
            centre: '',
            program: '',
            status: '',
            intake_year: ''
        };
        
        // Reset filter inputs
        document.getElementById('studentSearch').value = '';
        document.getElementById('filterCentre').value = '';
        document.getElementById('filterProgram').value = '';
        document.getElementById('filterStatus').value = '';
        
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this._renderStudentsTable();
        
        this.ui.showToast('Filters cleared', 'info');
    }
    
    /**
     * Helper methods
     */
    
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    _showSimpleToast(message, type, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;margin-left:10px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 300);
            }
        }, duration);
    }
    
    _showLoader(message) {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            document.body.appendChild(loader);
        }
        
        loader.innerHTML = `
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <p style="margin-top: 20px; color: #666;">${message}</p>
        `;
        
        loader.style.display = 'flex';
    }
    
    _hideLoader() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    _formatDateForInput(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }
    
    _getProgramDisplayName(programCode) {
        if (!programCode) return 'Not assigned';
        
        const program = this.programs.find(p => p.code === programCode);
        if (program) {
            return `${program.code} - ${program.name}`;
        }
        
        return programCode;
    }
    
    _getCentreDisplayName(centreId, centreName) {
        if (centreName && centreName.trim() !== '') {
            return centreName;
        }
        
        if (centreId) {
            const centre = this.centres.find(c => c.id === centreId);
            if (centre) return centre.name;
        }
        
        return 'Not assigned';
    }
    
    _getStudentInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    _getAvatarColor(name) {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];
        
        if (!name) return colors[0];
        
        const hash = name.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    _escapeAttr(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
}
