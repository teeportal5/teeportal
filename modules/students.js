// modules/students.js - COMPLETE ENHANCED VERSION
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
            attendanceRate: 0,
            graduationRate: 0,
            maleCount: 0,
            femaleCount: 0,
            averageAge: 0,
            feesCollected: 0,
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
            duration: program.duration || 0,
            credits: program.credits || 0,
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
            lastUpdatedElement.textContent = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
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
        
        // County filter
        const countyFilter = document.getElementById('filterCounty');
        if (countyFilter) {
            countyFilter.innerHTML = '<option value="">All Counties</option>';
            
            const uniqueCounties = [...new Set(this.allStudents.map(s => s.county).filter(Boolean))];
            uniqueCounties.sort().forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                option.textContent = county;
                countyFilter.appendChild(option);
            });
        }
        
        // Intake filter
        const intakeFilter = document.getElementById('filterIntake');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intakes</option>';
            
            const uniqueIntakes = [...new Set(this.allStudents.map(s => s.intake_year).filter(Boolean))];
            uniqueIntakes.sort((a, b) => b - a).forEach(intake => {
                const option = document.createElement('option');
                option.value = intake;
                option.textContent = intake;
                intakeFilter.appendChild(option);
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
        
        // Enhanced filters
        ['filterProgram', 'filterYear', 'filterCentre', 'filterCounty', 'filterStatus', 'filterIntake'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    const filterKey = id.replace('filter', '').toLowerCase();
                    this.activeFilters[filterKey] = e.target.value;
                    this._debouncedFilter();
                    
                    // Update filter chips
                    if (e.target.value) {
                        const label = e.target.options[e.target.selectedIndex]?.text || e.target.value;
                        this._addFilterChip(filterKey, e.target.value, label);
                    } else {
                        this._removeFilterChip(filterKey);
                    }
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
            });
        });
        
        // Add event listeners for table actions
        this._attachTableEventListeners();
        
        console.log('✅ Enhanced event listeners setup complete');
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
     * Attach table event listeners
     */
    _attachTableEventListeners() {
        // Delegate events to table body for dynamic content
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const target = e.target;
                
                // Handle view button
                if (target.closest('.btn-view')) {
                    const button = target.closest('.btn-view');
                    const studentId = button.getAttribute('data-id');
                    this.viewStudent(studentId);
                }
                
                // Handle edit button
                if (target.closest('.btn-edit')) {
                    const button = target.closest('.btn-edit');
                    const studentId = button.getAttribute('data-id');
                    this.editStudent(studentId);
                }
                
                // Handle marks button
                if (target.closest('.btn-marks')) {
                    const button = target.closest('.btn-marks');
                    const studentId = button.getAttribute('data-id');
                    this.enterMarks(studentId);
                }
                
                // Handle delete button
                if (target.closest('.btn-delete')) {
                    const button = target.closest('.btn-delete');
                    const studentId = button.getAttribute('data-id');
                    this.deleteStudent(studentId);
                }
                
                // Handle checkbox selection
                if (target.type === 'checkbox' && target.hasAttribute('data-student-id')) {
                    const studentId = target.getAttribute('data-student-id');
                    this._handleStudentSelection(studentId, target.checked);
                }
            });
        }
    }
    
    /**
     * Perform search
     */
    _performSearch() {
        this.filteredStudents = this._applyCurrentFilters(this.allStudents);
        this.currentPage = 1;
        
        if (this.viewMode === 'table') {
            this._renderStudentsTable();
        } else {
            this._renderStudentsGrid();
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
        } else {
            this._renderStudentsGrid();
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
            
            // Active filters
            for (const [key, value] of Object.entries(this.activeFilters)) {
                if (value) {
                    if (key === 'year') {
                        // Special handling for year filter
                        if (student.year_level != value) return false;
                    } else if (key === 'centre') {
                        if (student.centre_id != value && student.centre != value) return false;
                    } else if (student[key] != value) {
                        return false;
                    }
                }
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
        const activeBtn = document.querySelector(`.view-btn[onclick*="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Render based on view mode
        if (this.filteredStudents.length > 0) {
            if (mode === 'table') {
                this._renderStudentsTable();
            } else if (mode === 'grid' || mode === 'cards') {
                this._renderStudentsGrid();
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
            } else {
                this._renderStudentsGrid();
            }
            
            this._populateFilterDropdowns();
            
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
            return this._createEnhancedStudentRow(student, rowIndex);
        }).join('');
        
        tbody.innerHTML = rows;
        
        // Update pagination controls
        this._updatePaginationControls();
        
        // Update counters
        this._updateCounters();
    }
    
    /**
     * Create enhanced student row
     */
    _createEnhancedStudentRow(student, index) {
        const programDisplay = this._getProgramDisplayName(student.program);
        const centreDisplay = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const hasEmail = student.email && student.email.trim() !== '';
        const hasPhone = student.phone && student.phone.trim() !== '';
        const isSelected = this.selectedStudents.has(student.id.toString());
        
        return `
            <tr data-student-id="${this._escapeAttr(student.id)}" 
                data-student-reg="${this._escapeAttr(student.reg_number)}"
                class="${status === 'inactive' ? 'inactive-student' : ''} ${isSelected ? 'selected' : ''}">
                
                <td style="width: 50px; text-align: center;">
                    <input type="checkbox" data-student-id="${student.id}" 
                           ${isSelected ? 'checked' : ''}>
                </td>
                
                <td style="width: 120px;">
                    <strong class="student-id">${this._escapeHtml(student.reg_number)}</strong>
                </td>
                
                <td>
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
                
                <td style="width: 200px;">
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
                        ${hasPhone ? `
                            <div class="phone-info">
                                <i class="fas fa-phone"></i> ${this._escapeHtml(student.phone)}
                            </div>
                        ` : ''}
                        ${student.county ? `
                            <div class="location-info">
                                <i class="fas fa-map-marker-alt"></i> ${this._escapeHtml(student.county)}
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
                
                <td style="width: 180px;" class="action-buttons">
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
     * Render students grid
     */
    _renderStudentsGrid() {
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
        
        // Create grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'students-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        gridContainer.style.gap = '20px';
        gridContainer.style.padding = '20px';
        
        // Generate grid cards
        pageStudents.forEach((student, index) => {
            const card = this._createStudentCard(student, startIndex + index + 1);
            gridContainer.innerHTML += card;
        });
        
        // Replace table with grid
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        
        // Add grid to table body temporarily
        tbody.innerHTML = '';
        tbody.parentNode.insertBefore(gridContainer, tbody);
        
        // Update pagination controls
        this._updatePaginationControls();
        
        // Update counters
        this._updateCounters();
    }
    
    /**
     * Create student card for grid view
     */
    _createStudentCard(student, index) {
        const programDisplay = this._getProgramDisplayName(student.program);
        const centreDisplay = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const hasEmail = student.email && student.email.trim() !== '';
        const hasPhone = student.phone && student.phone.trim() !== '';
        
        return `
            <div class="student-card" data-student-id="${student.id}">
                <div class="card-header">
                    <div class="student-avatar-large" style="background-color: ${this._getAvatarColor(student.full_name)}">
                        ${this._getStudentInitials(student.full_name)}
                    </div>
                    <div class="student-card-info">
                        <h4>${this._escapeHtml(student.full_name)}</h4>
                        <p class="student-reg">${this._escapeHtml(student.reg_number)}</p>
                        <span class="status-badge status-${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                </div>
                
                <div class="card-content">
                    <div class="info-row">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${this._escapeHtml(programDisplay)}</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-school"></i>
                        <span>${this._escapeHtml(centreDisplay)}</span>
                    </div>
                    ${student.email ? `
                        <div class="info-row">
                            <i class="fas fa-envelope"></i>
                            <span>${this._escapeHtml(student.email)}</span>
                        </div>
                    ` : ''}
                    ${student.phone ? `
                        <div class="info-row">
                            <i class="fas fa-phone"></i>
                            <span>${this._escapeHtml(student.phone)}</span>
                        </div>
                    ` : ''}
                    ${student.county ? `
                        <div class="info-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this._escapeHtml(student.county)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-actions">
                    <button class="btn-action btn-sm" onclick="app.students?.viewStudent('${student.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action btn-sm" onclick="app.students?.editStudent('${student.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-sm" onclick="app.students?.enterMarks('${student.id}')">
                        <i class="fas fa-chart-bar"></i> Marks
                    </button>
                </div>
            </div>
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
        
        // Update button states
        const prevBtn = document.querySelector('.page-btn.prev');
        const nextBtn = document.querySelector('.page-btn.next');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
            prevBtn.classList.toggle('disabled', this.currentPage === 1);
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === this.totalPages;
            nextBtn.classList.toggle('disabled', this.currentPage === this.totalPages);
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
        } else {
            this._renderStudentsGrid();
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
        } else {
            this._renderStudentsGrid();
        }
    }
    
    /**
     * Handle student selection
     */
    _handleStudentSelection(studentId, isSelected) {
        if (isSelected) {
            this.selectedStudents.add(studentId);
        } else {
            this.selectedStudents.delete(studentId);
            
            // Uncheck select all if any checkbox is unchecked
            const selectAllCheckbox = document.getElementById('selectAll');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
        }
        
        this._updateBulkActions();
    }
    
    /**
     * Toggle select all students
     */
    _toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-student-id]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const studentId = checkbox.getAttribute('data-student-id');
            if (checked) {
                this.selectedStudents.add(studentId);
            } else {
                this.selectedStudents.delete(studentId);
            }
        });
        
        // Update bulk actions UI
        this._updateBulkActions();
    }
    
    /**
     * Update bulk actions UI
     */
    _updateBulkActions() {
        const count = this.selectedStudents.size;
        
        if (count > 0) {
            // Show bulk actions bar if not exists
            this._createBulkActionsBar(count);
        } else {
            // Hide bulk actions bar
            const bulkActionsBar = document.getElementById('bulkActionsBar');
            if (bulkActionsBar) {
                bulkActionsBar.remove();
            }
        }
    }
    
    /**
     * Create bulk actions bar
     */
    _createBulkActionsBar(count) {
        let bulkActionsBar = document.getElementById('bulkActionsBar');
        
        if (!bulkActionsBar) {
            bulkActionsBar = document.createElement('div');
            bulkActionsBar.id = 'bulkActionsBar';
            bulkActionsBar.className = 'bulk-actions-bar';
            
            // Insert before the table
            const dataSection = document.querySelector('.data-section');
            if (dataSection) {
                dataSection.insertBefore(bulkActionsBar, dataSection.querySelector('.table-container'));
            }
        }
        
        bulkActionsBar.innerHTML = `
            <div class="bulk-actions-content">
                <span class="bulk-selection-count">${count} selected</span>
                <div class="bulk-actions-buttons">
                    <button class="btn-bulk-action" onclick="app.students?.sendBulkEmail()">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                    <button class="btn-bulk-action" onclick="app.students?.exportSelected()">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn-bulk-action btn-danger" onclick="app.students?.deleteSelected()">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="btn-bulk-action btn-close" onclick="app.students?.clearSelection()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedStudents.clear();
        
        // Uncheck all checkboxes
        document.querySelectorAll('input[type="checkbox"][data-student-id]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Remove bulk actions bar
        const bulkActionsBar = document.getElementById('bulkActionsBar');
        if (bulkActionsBar) {
            bulkActionsBar.remove();
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
                // This would require fee data integration
                this.ui.showToast('Fee data integration required', 'info');
                break;
        }
        
        this._applyFilters();
    }
    
    /**
     * Add filter chip
     */
    _addFilterChip(key, value, label) {
        const chipsContainer = document.getElementById('filterChips');
        if (!chipsContainer) return;
        
        // Check if chip already exists
        const existingChip = chipsContainer.querySelector(`[data-filter="${key}"]`);
        if (existingChip) {
            existingChip.remove();
        }
        
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.dataset.filter = key;
        chip.dataset.value = value;
        chip.innerHTML = `
            ${label}
            <button class="chip-remove" onclick="app.students?._removeFilterChip('${key}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        chipsContainer.appendChild(chip);
    }
    
    /**
     * Remove filter chip
     */
    _removeFilterChip(key) {
        const chipsContainer = document.getElementById('filterChips');
        if (!chipsContainer) return;
        
        const chip = chipsContainer.querySelector(`[data-filter="${key}"]`);
        if (chip) {
            chip.remove();
        }
        
        // Clear the filter
        this.activeFilters[key] = '';
        const filterElement = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (filterElement) {
            filterElement.value = '';
        }
        
        this._debouncedFilter();
    }
    
    /**
     * Toggle advanced filters
     */
    _toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        if (advancedFilters) {
            const isVisible = advancedFilters.style.display !== 'none';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
            
            const toggleBtn = document.querySelector('.btn-advanced');
            if (toggleBtn) {
                toggleBtn.innerHTML = isVisible 
                    ? '<i class="fas fa-sliders-h"></i> Advanced Filters'
                    : '<i class="fas fa-times"></i> Hide Filters';
            }
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
        
        // Clear filter chips
        const chipsContainer = document.getElementById('filterChips');
        if (chipsContainer) {
            chipsContainer.innerHTML = '';
        }
        
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
        } else {
            this._renderStudentsGrid();
        }
        
        this.ui.showToast('All filters cleared', 'info');
    }
    
    /**
     * Apply filters (for apply button)
     */
    applyFilters() {
        // Filters are already applied via event listeners
        // This just closes the advanced filters panel
        this._toggleAdvancedFilters();
        this.ui.showToast('Filters applied', 'success');
    }
    
    /**
     * Refresh insights
     */
    async refreshInsights() {
        try {
            this.ui.showLoading(true, 'Refreshing insights...');
            
            // Clear cache
            this.cache.students = null;
            
            // Reload data
            await this.loadStudentsTable();
            
            // Update analytics
            this._updateAnalytics();
            
            // Update last updated time
            const lastUpdatedElement = document.getElementById('lastUpdatedTime');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = new Date().toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            this.ui.showToast('Insights refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error refreshing insights:', error);
            this.ui.showToast('Failed to refresh insights', 'error');
        } finally {
            this.ui.showLoading(false);
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
        
        // New this month
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        this.analytics.newThisMonth = this.allStudents.filter(student => {
            const regDate = new Date(student.registration_date);
            return regDate.getMonth() === currentMonth && 
                   regDate.getFullYear() === currentYear;
        }).length;
        
        // Gender counts
        this.analytics.maleCount = this.allStudents.filter(s => s.gender === 'male').length;
        this.analytics.femaleCount = this.allStudents.filter(s => s.gender === 'female').length;
        
        // Average age
        const totalAge = this.allStudents.reduce((sum, student) => {
            if (student.date_of_birth) {
                const birthDate = new Date(student.date_of_birth);
                const age = currentDate.getFullYear() - birthDate.getFullYear();
                return sum + age;
            }
            return sum;
        }, 0);
        
        const studentsWithDOB = this.allStudents.filter(s => s.date_of_birth).length;
        this.analytics.averageAge = studentsWithDOB > 0 
            ? Math.round(totalAge / studentsWithDOB) 
            : 0;
        
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
        const graduatedCount = document.getElementById('graduatedStudentsCount');
        const newMonthCount = document.getElementById('newThisMonthCount');
        
        if (totalCount) totalCount.textContent = this.analytics.total;
        if (activeCount) activeCount.textContent = this.analytics.active;
        if (graduatedCount) graduatedCount.textContent = this.analytics.graduated;
        if (newMonthCount) newMonthCount.textContent = this.analytics.newThisMonth;
        
        // Update quick stats footer
        const maleCount = document.getElementById('maleCount');
        const femaleCount = document.getElementById('femaleCount');
        const averageAge = document.getElementById('averageAge');
        
        if (maleCount) maleCount.textContent = this.analytics.maleCount;
        if (femaleCount) femaleCount.textContent = this.analytics.femaleCount;
        if (averageAge) averageAge.textContent = this.analytics.averageAge;
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>${this.allStudents.length === 0 ? 'Get started by adding your first student.' : 'No students match your search criteria.'}</p>
                    ${this.allStudents.length === 0 ? `
                        <button class="btn-primary" onclick="app.students.openStudentModal()">
                            <i class="fas fa-plus"></i> Add Your First Student
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="app.students.clearAllFilters()">
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
                    <td colspan="7" class="error-state">
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
                <div class="modal" style="display: block; z-index: 9999;">
                    <div class="modal-content" style="max-width: 600px;">
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
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                Close
                            </button>
                            <button class="btn btn-primary" onclick="app.students.editStudent('${studentId}'); this.closest('.modal').remove()">
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
     * Export selected students
     */
    async exportSelected() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        try {
            this.ui.showLoading(true, 'Exporting selected students...');
            
            const selectedStudentsData = this.allStudents.filter(student => 
                this.selectedStudents.has(student.id.toString())
            );
            
            const data = selectedStudentsData.map(student => ({
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
            
            this._exportToCSV(data, 'selected_students');
            
            this.ui.showToast(`Exported ${this.selectedStudents.size} students successfully`, 'success');
            
        } catch (error) {
            console.error('Error exporting selected students:', error);
            this.ui.showToast('Failed to export students', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Send bulk email
     */
    async sendBulkEmail() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        const selectedStudents = this.allStudents.filter(student => 
            this.selectedStudents.has(student.id.toString()) && student.email
        );
        
        if (selectedStudents.length === 0) {
            this.ui.showToast('No valid email addresses found', 'warning');
            return;
        }
        
        // Open email composer or show modal
        this.ui.showToast(`Preparing email for ${selectedStudents.length} students`, 'info');
        
        // This would integrate with your email service
        // For now, just show a message
        const emailList = selectedStudents.map(s => s.email).join(', ');
        prompt('Email addresses (copy to your email client):', emailList);
    }
    
    /**
     * Delete selected students
     */
    async deleteSelected() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        const confirmed = await this.ui.showConfirmation({
            message: `Are you sure you want to delete ${this.selectedStudents.size} selected students? This action cannot be undone.`
        });
        
        if (!confirmed) return;
        
        try {
            this.ui.showLoading(true, 'Deleting selected students...');
            
            // Delete each student
            for (const studentId of this.selectedStudents) {
                await this.db.deleteStudent(studentId);
            }
            
            // Clear cache and reload
            this.cache.students = null;
            this.selectedStudents.clear();
            
            await this.loadStudentsTable();
            
            this.ui.showToast(`Deleted ${this.selectedStudents.size} students successfully`, 'success');
            
        } catch (error) {
            console.error('Error deleting selected students:', error);
            this.ui.showToast('Failed to delete students', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Bulk upload students
     */
    async bulkUpload() {
        this.ui.showToast('Bulk upload feature coming soon!', 'info');
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
