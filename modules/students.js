// modules/students.js - FIXED ACTION BUTTONS OVERLAP
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
        this.viewMode = 'table'; // table, grid, cards
        
        // Performance and caching
        this.cache = {
            students: null,
            lastFetch: 0,
            cacheDuration: 30000 // 30 seconds
        };
        
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
        
        // Analytics
        this.analytics = {
            total: 0,
            active: 0,
            inactive: 0,
            graduated: 0,
            newThisMonth: 0,
            attendanceRate: 92,
            graduationRate: 87,
            maleCount: 0,
            femaleCount: 0,
            averageAge: 0,
            feesCollected: 0
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
            
            // Initialize view mode
            this._setViewMode(this.viewMode);
            
            console.log('✅ StudentManager ready');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.ui.showToast('Failed to initialize student module', 'error');
        } finally {
            this.ui.showLoading(false);
        }
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
            
            // Initialize quick stats
            this._initializeQuickStats();
            
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
            status: program.status || 'active'
        })).filter(p => p.code && p.name);
    }
    
    /**
     * Initialize quick stats
     */
    _initializeQuickStats() {
        // Update last updated time
        const lastUpdatedElement = document.getElementById('lastUpdatedTime');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = 'Just now';
        }
    }
    
    /**
     * Populate all dropdowns
     */
    _populateAllDropdowns() {
        this._populateProgramSelect();
        this._populateCentreSelect();
        this._populateIntakeYears();
        this._populateFilterDropdowns();
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
        
        select.innerHTML = '<option value="">Select Program</option>';
        
        if (this.programs.length > 0) {
            this.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.code;
                option.textContent = `${program.code} - ${program.name}`;
                select.appendChild(option);
            });
            
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
        
        select.innerHTML = '<option value="">Select Centre</option>';
        
        if (this.centres.length > 0) {
            this.centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = centre.id;
                option.textContent = centre.name || centre.code;
                select.appendChild(option);
            });
            
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
            
            if (this.programs.length > 0) {
                this.programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.code;
                    option.textContent = program.name;
                    programFilter.appendChild(option);
                });
            }
        }
        
        // Centre filter
        const centreFilter = document.getElementById('filterCentre');
        if (centreFilter) {
            centreFilter.innerHTML = '<option value="">All Centers</option>';
            
            if (this.centres.length > 0) {
                this.centres.forEach(centre => {
                    const option = document.createElement('option');
                    option.value = centre.id;
                    option.textContent = centre.name;
                    centreFilter.appendChild(option);
                });
            }
        }
        
        // County filter - simplified since we removed county from form
        const countyFilter = document.getElementById('filterCounty');
        if (countyFilter) {
            countyFilter.innerHTML = '<option value="">All Counties</option>';
            // You can add Kenyan counties here if needed
        }
        
        // Intake filter
        const intakeFilter = document.getElementById('filterIntake');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intakes</option>';
            
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= currentYear - 5; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeFilter.appendChild(option);
            }
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
                option.disabled = true;
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
     * Setup event listeners for enhanced UI
     */
    _setupEventListeners() {
        console.log('🔌 Setting up enhanced event listeners...');
        
        // Form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        // Enhanced search
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                this._debouncedSearch();
            });
            
            // Search clear button
            const searchClearBtn = document.querySelector('.search-clear');
            if (searchClearBtn) {
                searchClearBtn.addEventListener('click', () => {
                    studentSearch.value = '';
                    this.searchTerm = '';
                    this._debouncedSearch();
                });
            }
        }
        
        // Advanced filters
        ['filterProgram', 'filterYear', 'filterCentre', 'filterCounty', 'filterStatus', 'filterIntake'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.applyFilters();
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
        
        // Modal close buttons
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.ui.closeModal('studentModal');
                this.ui.closeModal('bulkUploadModal');
            });
        });
        
        // Quick filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                this._handleQuickFilter(e.target.getAttribute('onclick').match(/'([^']+)'/)[1]);
            });
        });
        
        // Action buttons in control panel
        this._setupActionButtonListeners();
        
        console.log('✅ Enhanced event listeners setup complete');
    }
    
    /**
     * Setup action button listeners
     */
    _setupActionButtonListeners() {
        // Add New Student
        const addStudentBtn = document.querySelector('.action-btn.primary');
        if (addStudentBtn) {
            addStudentBtn.addEventListener('click', () => this.openStudentModal());
        }
        
        // Bulk Upload
        const bulkUploadBtn = document.querySelector('.action-btn[data-action="bulk-upload"]');
        if (bulkUploadBtn) {
            bulkUploadBtn.addEventListener('click', () => this.bulkUpload());
        }
        
        // Export Data
        const exportBtn = document.querySelector('.action-btn[data-action="export-data"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStudents());
        }
        
        // Generate Reports
        const reportsBtn = document.querySelector('.action-btn[data-action="generate-reports"]');
        if (reportsBtn) {
            reportsBtn.addEventListener('click', () => this.generateReports());
        }
        
        // Send Communications
        const commsBtn = document.querySelector('.action-btn[data-action="send-communications"]');
        if (commsBtn) {
            commsBtn.addEventListener('click', () => this.sendCommunications());
        }
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
            
            // Escape to close modal
            if (e.key === 'Escape') {
                const modal = document.getElementById('studentModal');
                if (modal && modal.style.display === 'block') {
                    this.ui.closeModal('studentModal');
                }
            }
        });
    }
    
    /**
     * Perform search
     */
    _performSearch() {
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
        }
    }
    
    /**
     * Apply filters
     */
    _applyFilters() {
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
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
                    (student.program?.toLowerCase() || '').includes(searchLower) ||
                    (student.id_number?.toLowerCase() || '').includes(searchLower);
                
                if (!matches) return false;
            }
            
            // Advanced filters
            if (this.activeFilters.program && student.program !== this.activeFilters.program) {
                return false;
            }
            if (this.activeFilters.year && student.year_level != this.activeFilters.year) {
                return false;
            }
            if (this.activeFilters.centre && student.centre_id != this.activeFilters.centre) {
                return false;
            }
            if (this.activeFilters.status && student.status !== this.activeFilters.status) {
                return false;
            }
            if (this.activeFilters.intake_year && student.intake_year != this.activeFilters.intake_year) {
                return false;
            }
            
            return true;
        });
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
        const activeBtn = event?.currentTarget;
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Render based on view mode
        if (this.filteredStudents.length > 0) {
            if (mode === 'table') {
                this._renderStudentsTable();
            }
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
            
            // Render based on current view mode
            if (this.viewMode === 'table') {
                this._renderStudentsTable();
            }
            
            // Update counters
            this._updateCounters();
            
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
        
        // Update counters
        this._updateCounters();
    }
    
    /**
     * Create student row - FIXED ACTION BUTTONS
     */
    _createStudentRow(student, index) {
        const programDisplay = this._getProgramDisplayName(student.program);
        const centreDisplay = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const hasEmail = student.email && student.email.trim() !== '';
        const hasPhone = student.phone && student.phone.trim() !== '';
        
        return `
            <tr data-student-id="${this._escapeAttr(student.id)}" 
                data-student-reg="${this._escapeAttr(student.reg_number)}"
                class="${status === 'inactive' ? 'inactive-student' : ''}">
                
                <td style="width: 40px; text-align: center; padding: 8px;">
                    <input type="checkbox" data-student-id="${student.id}" style="margin: 0; width: 16px; height: 16px;">
                </td>
                
                <td style="width: 120px;">
                    <strong class="student-id">${this._escapeHtml(student.reg_number)}</strong>
                </td>
                
                <td style="min-width: 280px;">
                    <div class="student-info-enhanced">
                        <div class="student-avatar" style="background-color: ${this._getAvatarColor(student.full_name)}">
                            ${this._getStudentInitials(student.full_name)}
                        </div>
                        <div class="student-details">
                            <div class="student-name">
                                <strong>${this._escapeHtml(student.full_name)}</strong>
                                ${!hasEmail ? '<span class="warning-badge" title="No email"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                            </div>
                            <div class="student-meta">
                                ${student.email ? `
                                    <span class="student-email">
                                        <i class="fas fa-envelope"></i> ${this._escapeHtml(student.email)}
                                    </span>
                                ` : ''}
                                ${student.phone ? `
                                    <span class="student-phone">
                                        <i class="fas fa-phone"></i> ${this._escapeHtml(student.phone)}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                
                <td style="width: 180px;">
                    <div class="academic-info">
                        <div class="program-badge">
                            ${this._escapeHtml(programDisplay)}
                        </div>
                        <div class="year-level">
                            Year ${student.year_level || '1'}
                        </div>
                    </div>
                </td>
                
                <td style="width: 150px;">
                    <div class="contact-info">
                        ${centreDisplay ? `
                            <div class="centre-info">
                                <i class="fas fa-school"></i> ${this._escapeHtml(centreDisplay)}
                            </div>
                        ` : ''}
                    </div>
                </td>
                
                <td style="width: 100px;">
                    <span class="status-badge status-${status}">
                        <i class="fas fa-circle"></i>
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                
                <td style="width: 200px;" class="action-buttons">
                    <div class="btn-group" style="display: flex; gap: 6px; justify-content: center; flex-wrap: nowrap; min-width: 160px;">
                        <button class="btn-action btn-view" data-id="${this._escapeAttr(student.id)}" 
                                title="View Details" onclick="app.students?.viewStudent('${student.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" data-id="${this._escapeAttr(student.id)}" 
                                title="Edit Student" onclick="app.students?.editStudent('${student.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-marks" data-id="${this._escapeAttr(student.id)}" 
                                title="Enter Marks" onclick="app.students?.enterMarks('${student.id}')">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn-action btn-delete" data-id="${this._escapeAttr(student.id)}" 
                                title="Delete Student" onclick="app.students?.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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
        
        // Clear existing page numbers
        pageNumbersContainer.innerHTML = '';
        
        // Calculate visible pages
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(this.totalPages, startPage + 4);
        
        // Adjust if we're near the beginning
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // First page
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-number';
            firstPageBtn.textContent = '1';
            firstPageBtn.onclick = () => this._goToPage(1);
            pageNumbersContainer.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.className = 'page-dots';
                dots.textContent = '...';
                pageNumbersContainer.appendChild(dots);
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this._goToPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const dots = document.createElement('span');
                dots.className = 'page-dots';
                dots.textContent = '...';
                pageNumbersContainer.appendChild(dots);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-number';
            lastPageBtn.textContent = this.totalPages;
            lastPageBtn.onclick = () => this._goToPage(this.totalPages);
            pageNumbersContainer.appendChild(lastPageBtn);
        }
    }
    
    /**
     * Go to specific page
     */
    _goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
        }
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
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
        }
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
        event?.currentTarget?.classList.add('active');
        
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
            case 'new':
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();
                this.filteredStudents = this.allStudents.filter(student => {
                    const regDate = new Date(student.registration_date);
                    return regDate.getMonth() === currentMonth && 
                           regDate.getFullYear() === currentYear;
                });
                break;
            case 'overdue':
                this.ui.showToast('Fee data integration required', 'info');
                return;
        }
        
        this._applyFilters();
    }
    
    /**
     * Toggle advanced filters
     */
    _toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        if (advancedFilters) {
            const isVisible = advancedFilters.style.display !== 'none';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
            advancedFilters.classList.toggle('active', !isVisible);
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
            this._debouncedSearch();
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
        const filterIds = ['studentSearch', 'filterProgram', 'filterYear', 'filterCentre', 
                          'filterCounty', 'filterStatus', 'filterIntake'];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Reset quick filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        
        // Set "All Students" as active
        const allStudentsChip = document.querySelector('.filter-chip:first-child');
        if (allStudentsChip) {
            allStudentsChip.classList.add('active');
        }
        
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
        }
        
        this.ui.showToast('All filters cleared', 'info');
    }
    
    /**
     * Apply filters (for apply button)
     */
    applyFilters() {
        // Get filter values
        this.activeFilters.program = document.getElementById('filterProgram')?.value || '';
        this.activeFilters.year = document.getElementById('filterYear')?.value || '';
        this.activeFilters.centre = document.getElementById('filterCentre')?.value || '';
        this.activeFilters.county = document.getElementById('filterCounty')?.value || '';
        this.activeFilters.status = document.getElementById('filterStatus')?.value || '';
        this.activeFilters.intake_year = document.getElementById('filterIntake')?.value || '';
        
        this._applyFilters();
        this.ui.showToast('Filters applied', 'success');
    }
    
    /**
     * Refresh insights
     */
    refreshInsights() {
        this._updateLastUpdatedTime();
        this.ui.showToast('Insights refreshed', 'success');
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
     * Update analytics with enhanced metrics
     */
    _updateAnalytics() {
        this.analytics.total = this.allStudents.length;
        this.analytics.active = this.allStudents.filter(s => s.status === 'active').length;
        this.analytics.inactive = this.allStudents.filter(s => s.status === 'inactive').length;
        this.analytics.graduated = this.allStudents.filter(s => s.status === 'graduated').length;
        
        // Gender counts
        this.analytics.maleCount = this.allStudents.filter(s => s.gender === 'male').length;
        this.analytics.femaleCount = this.allStudents.filter(s => s.gender === 'female').length;
        
        // Update UI elements
        this._updateAnalyticsUI();
    }
    
    /**
     * Update analytics UI
     */
    _updateAnalyticsUI() {
        // Update quick insights
        const totalCount = document.getElementById('totalStudentsCount');
        const activeCount = document.getElementById('activeStudentsCount');
        const attendanceRate = document.getElementById('attendanceRate');
        const graduationRate = document.getElementById('graduationRate');
        
        if (totalCount) totalCount.textContent = this.analytics.total;
        if (activeCount) activeCount.textContent = this.analytics.active;
        if (attendanceRate) attendanceRate.textContent = `${this.analytics.attendanceRate}%`;
        if (graduationRate) graduationRate.textContent = `${this.analytics.graduationRate}%`;
        
        // Update quick stats footer
        const maleCount = document.getElementById('maleCount');
        const femaleCount = document.getElementById('femaleCount');
        const averageAge = document.getElementById('averageAge');
        const feesCollected = document.getElementById('feesCollected');
        
        if (maleCount) maleCount.textContent = this.analytics.maleCount;
        if (femaleCount) femaleCount.textContent = this.analytics.femaleCount;
        if (averageAge) averageAge.textContent = this.analytics.averageAge;
        if (feesCollected) feesCollected.textContent = `KES ${this.analytics.feesCollected}`;
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
                    ${this.allStudents.length === 0 ? `
                        <button class="btn-primary" onclick="app.students?.openStudentModal()">
                            <i class="fas fa-plus"></i> Add Your First Student
                        </button>
                    ` : ''}
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
                        <button class="btn-primary" onclick="app.students?.loadStudentsTable()">
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
            { id: 'studentPhone', name: 'Phone Number' },
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
 * Prepare form data with County and Region
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
        centreName = selectedCentreText;
    } else if (selectedCentreId && this.centres.length > 0) {
        const centre = this.centres.find(c => c.id === selectedCentreId);
        centreName = centre ? centre.name : '';
    }
    
    // Format phone number (optional)
    let phone = document.getElementById('studentPhone')?.value.trim() || '';
    if (phone && phone.trim() !== '' && !phone.startsWith('+254')) {
        // Remove any spaces and format
        phone = phone.replace(/\s+/g, '');
        if (phone.startsWith('0')) {
            phone = '+254' + phone.substring(1);
        } else if (phone.startsWith('7')) {
            phone = '+254' + phone;
        }
    }
    
    // Get county and region values
    const county = document.getElementById('studentCounty')?.value || '';
    const region = document.getElementById('studentRegion')?.value || '';
    
    return {
        reg_number: document.getElementById('studentRegNumber')?.value.trim() || '',
        full_name: document.getElementById('studentName')?.value.trim() || '',
        email: document.getElementById('studentEmail')?.value.trim() || '',
        phone: phone, // Optional
        county: county, // New field
        region: region, // New field
        gender: document.getElementById('studentGender')?.value || '',
        program: programCode,
        code: programCode,
        program_name: programName || programCode,
        intake_year: parseInt(document.getElementById('studentIntake')?.value) || new Date().getFullYear(),
        centre_id: selectedCentreId || '',
        centre: centreName || '',
        status: document.getElementById('studentStatus')?.value || 'active',
        registration_date: document.getElementById('studentRegDate')?.value || new Date().toISOString().split('T')[0]
    };
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
            regNumberInput.value = '';
        }
        
        // Set registration date to today
        const regDateField = document.getElementById('studentRegDate');
        if (regDateField) {
            regDateField.value = new Date().toISOString().split('T')[0];
        }
        
        // Reset modal title
        const modalTitle = document.getElementById('studentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Register New Student';
        }
        
        // Reset submit button
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
            submitBtn.disabled = false;
        }
        
        // Reset edit ID
        this.currentEditId = null;
        
        // Populate intake years with current year
        this._populateIntakeYears();
        
        // Generate registration number
        this.generateRegNumber();
        
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
            
            // Populate SIMPLIFIED form
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
     * Populate edit form for SIMPLIFIED FORM
     */
    async _populateEditForm(student) {
        // SIMPLIFIED FORM FIELDS ONLY
        this._setFieldValue('studentRegNumber', student.reg_number, true);
        this._setFieldValue('studentName', student.full_name);
        this._setFieldValue('studentEmail', student.email);
        
        // Format phone for display
        let phone = student.phone || '';
        if (phone && phone.startsWith('+254')) {
            phone = phone.substring(4); // Remove +254 for display
        }
        this._setFieldValue('studentPhone', phone);
        
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
                <div class="modal" style="display: block; z-index: 9999;">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3>Student Details</h3>
                            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
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
                                
                                <div style="display: grid; gap: 15px;">
                                    <div>
                                        <h4>Personal Information</h4>
                                        <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                                        <p><strong>Gender:</strong> ${student.gender || 'N/A'}</p>
                                        <p><strong>ID Number:</strong> ${student.id_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4>Academic Information</h4>
                                        <p><strong>Program:</strong> ${this._getProgramDisplayName(student.program)}</p>
                                        <p><strong>Centre:</strong> ${this._getCentreDisplayName(student.centre_id, student.centre)}</p>
                                        <p><strong>Intake Year:</strong> ${student.intake_year || 'N/A'}</p>
                                        <p><strong>Registration Date:</strong> ${student.registration_date ? new Date(student.registration_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                Close
                            </button>
                            <button class="btn btn-primary" onclick="app.students?.editStudent('${studentId}'); this.closest('.modal').remove()">
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
        this.ui.showToast('Export feature coming soon!', 'info');
    }
    
    /**
     * Bulk upload students
     */
    async bulkUpload() {
        this.ui.openModal('bulkUploadModal');
    }
    
    /**
     * Generate reports
     */
    async generateReports() {
        this.ui.showToast('Report generation feature coming soon!', 'info');
    }
    
    /**
     * Send communications
     */
    async sendCommunications() {
        this.ui.showToast('Communications feature coming soon!', 'info');
    }
    
    /**
     * Print documents
     */
    async printDocuments() {
        this.ui.showToast('Document printing feature coming soon!', 'info');
    }
    
    /**
     * Get centre display name
     */
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
    
    /**
     * Get program display name
     */
    _getProgramDisplayName(programCode) {
        if (!programCode) return 'Not assigned';
        
        const program = this.programs.find(p => p.code === programCode);
        if (program) {
            return `${program.code} - ${program.name}`;
        }
        
        return programCode;
    }
    
    /**
     * Get student initials
     */
    _getStudentInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    /**
     * Get avatar color
     */
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
    
    /**
     * Toggle select all
     */
    _toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-student-id]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
    
    // Global functions for HTML onclick handlers
    window.openStudentModal = function() {
        if (window.app && window.app.students) {
            window.app.students.openStudentModal();
        }
    };
    
    window.refreshInsights = function() {
        if (window.app && window.app.students) {
            window.app.students.refreshInsights();
        }
    };
    
    window.filterStudents = function(filterType) {
        if (window.app && window.app.students) {
            window.app.students._handleQuickFilter(filterType);
        }
    };
    
    window.toggleAdvancedFilters = function() {
        if (window.app && window.app.students) {
            window.app.students._toggleAdvancedFilters();
        }
    };
    
    window.clearSearch = function() {
        if (window.app && window.app.students) {
            window.app.students.clearSearch();
        }
    };
    
    window.clearAllFilters = function() {
        if (window.app && window.app.students) {
            window.app.students.clearAllFilters();
        }
    };
    
    window.applyFilters = function() {
        if (window.app && window.app.students) {
            window.app.students.applyFilters();
        }
    };
    
    window.setViewMode = function(mode) {
        if (window.app && window.app.students) {
            window.app.students._setViewMode(mode);
        }
    };
    
    window.toggleSelectAll = function() {
        const checkbox = document.getElementById('selectAll');
        if (checkbox && window.app && window.app.students) {
            window.app.students._toggleSelectAll(checkbox.checked);
        }
    };
    
    window.previousPage = function() {
        if (window.app && window.app.students) {
            window.app.students._previousPage();
        }
    };
    
    window.nextPage = function() {
        if (window.app && window.app.students) {
            window.app.students._nextPage();
        }
    };
    
    window.changePageSize = function(size) {
        if (window.app && window.app.students) {
            window.app.students._changePageSize(size);
        }
    };
}
