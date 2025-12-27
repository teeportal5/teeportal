// modules/students.js - ENHANCED VERSION WITH BETTER FEATURES
class StudentManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        
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
        
        // Initialize with debounced methods
        this._debouncedSearch = this._debounce(this._performSearch.bind(this), 300);
        this._debouncedFilter = this._debounce(this._applyFilters.bind(this), 200);
        
        console.log('🎓 Enhanced StudentManager initialized');
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
        console.log('🚀 Initializing Enhanced StudentManager...');
        
        try {
            // Show loading state
            this.ui.showLoading(true, 'Loading student data...');
            
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
            
            console.log('✅ Enhanced StudentManager ready');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.ui.showToast('Failed to initialize student module', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Load essential data with retry mechanism
     */
    async _loadEssentialData() {
        const maxRetries = 3;
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                console.log(`🔄 Loading data (attempt ${retries + 1}/${maxRetries})...`);
                
                // Load programs with enhanced validation
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
                
                // Create centre lookup map for faster access
                this.centreMap = new Map(this.centres.map(c => [c.id, c]));
                
                // Create program lookup map
                this.programMap = new Map(this.programs.map(p => [p.code, p]));
                
                break; // Success, exit loop
                
            } catch (error) {
                retries++;
                console.error(`❌ Loading attempt ${retries} failed:`, error);
                
                if (retries >= maxRetries) {
                    console.warn('⚠️ Max retries reached, using fallback data');
                    this.programs = this.programs || [];
                    this.centres = this.centres || [];
                    this._populateAllDropdowns();
                    break;
                }
                
                // Exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, 1000 * Math.pow(2, retries))
                );
            }
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
        })).filter(p => p.code && p.name); // Remove invalid entries
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
     * Enhanced program select population
     */
    _populateProgramSelect() {
        const select = document.getElementById('studentProgram');
        if (!select) return;
        
        const currentValue = select.value;
        
        // Clear and add default option
        select.innerHTML = `
            <option value="" disabled selected>Select Program</option>
            <option value="custom">Custom Program...</option>
        `;
        
        if (this.programs.length > 0) {
            // Group programs by status
            const activePrograms = this.programs.filter(p => p.status === 'active');
            const inactivePrograms = this.programs.filter(p => p.status !== 'active');
            
            // Add active programs
            if (activePrograms.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'Active Programs';
                
                activePrograms.forEach(program => {
                    const option = this._createProgramOption(program);
                    group.appendChild(option);
                });
                select.appendChild(group);
            }
            
            // Add inactive programs
            if (inactivePrograms.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'Inactive Programs';
                group.style.color = '#999';
                
                inactivePrograms.forEach(program => {
                    const option = this._createProgramOption(program);
                    option.disabled = true;
                    group.appendChild(option);
                });
                select.appendChild(group);
            }
            
            // Restore previous value
            if (currentValue) {
                select.value = currentValue;
            }
            
            console.log(`✅ Enhanced program dropdown with ${this.programs.length} programs`);
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No programs available';
            option.disabled = true;
            select.appendChild(option);
        }
        
        // Add custom program input handler
        select.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this._showCustomProgramInput();
            }
        });
    }
    
    /**
     * Create program option element
     */
    _createProgramOption(program) {
        const option = document.createElement('option');
        option.value = program.code;
        option.textContent = `${program.code} - ${program.name}`;
        option.dataset.programId = program.id;
        option.dataset.duration = program.duration;
        option.dataset.credits = program.credits;
        
        // Add tooltip
        option.title = `Duration: ${program.duration || 'N/A'} months | Credits: ${program.credits || 'N/A'}`;
        
        return option;
    }
    
    /**
     * Show custom program input
     */
    _showCustomProgramInput() {
        const programSelect = document.getElementById('studentProgram');
        const container = programSelect.parentElement;
        
        // Create input group
        const inputGroup = document.createElement('div');
        inputGroup.className = 'custom-program-input';
        inputGroup.innerHTML = `
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <input type="text" id="customProgramCode" 
                       placeholder="Program Code (e.g., CTOT)" 
                       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <input type="text" id="customProgramName" 
                       placeholder="Program Name" 
                       style="flex: 2; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="btn-save-custom" 
                        style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Save
                </button>
                <button type="button" class="btn-cancel-custom" 
                        style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        container.appendChild(inputGroup);
        
        // Handle save
        inputGroup.querySelector('.btn-save-custom').addEventListener('click', () => {
            const code = document.getElementById('customProgramCode').value.trim();
            const name = document.getElementById('customProgramName').value.trim();
            
            if (code && name) {
                // Add to dropdown
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${code} - ${name}`;
                option.dataset.custom = 'true';
                programSelect.appendChild(option);
                programSelect.value = code;
                
                // Remove input group
                inputGroup.remove();
                
                this.ui.showToast('Custom program added', 'success');
            } else {
                this.ui.showToast('Please enter both code and name', 'warning');
            }
        });
        
        // Handle cancel
        inputGroup.querySelector('.btn-cancel-custom').addEventListener('click', () => {
            programSelect.value = '';
            inputGroup.remove();
        });
    }
    
    /**
     * Enhanced centre select population
     */
    _populateCentreSelect() {
        const select = document.getElementById('studentCentre');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="" disabled selected>Select Centre</option>';
        
        if (this.centres.length > 0) {
            // Sort centres by name
            const sortedCentres = [...this.centres].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            sortedCentres.forEach(centre => {
                const option = document.createElement('option');
                option.value = centre.id;
                option.textContent = `${centre.name} (${centre.code || centre.county || 'Centre'})`;
                option.dataset.centreCode = centre.code || '';
                option.dataset.county = centre.county || '';
                
                // Add emoji based on type
                if (centre.type === 'main') {
                    option.textContent = '🏛️ ' + option.textContent;
                } else if (centre.type === 'satellite') {
                    option.textContent = '🛰️ ' + option.textContent;
                }
                
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
            
            console.log(`✅ Enhanced centre dropdown with ${this.centres.length} centres`);
        }
    }
    
    /**
     * Populate filter dropdowns with live data
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
        
        // Intake year filter
        const intakeFilter = document.getElementById('filterIntake');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intakes</option>';
            
            const uniqueYears = [...new Set(this.allStudents.map(s => s.intake_year).filter(Boolean))];
            uniqueYears.sort((a, b) => b - a).forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                intakeFilter.appendChild(option);
            });
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
     * Setup enhanced event listeners
     */
    _setupEventListeners() {
        console.log('🔌 Setting up enhanced event listeners...');
        
        // Form submission with validation
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStudent(e);
            });
        }
        
        // Real-time search with debouncing
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                this._debouncedSearch();
            });
            
            // Add clear button
            this._addSearchClearButton(studentSearch);
        }
        
        // Advanced filters
        ['filterCounty', 'filterCentre', 'filterProgram', 'filterStatus', 'filterIntake'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.activeFilters[id.replace('filter', '').toLowerCase()] = element.value;
                    this._debouncedFilter();
                });
            }
        });
        
        // Quick actions
        this._setupQuickActions();
        
        // Modal handlers
        this._setupEnhancedModalHandlers();
        
        // Bulk actions
        this._setupEnhancedBulkActions();
        
        // Registration number generation
        const programSelect = document.getElementById('studentProgram');
        const intakeSelect = document.getElementById('studentIntake');
        
        if (programSelect) {
            programSelect.addEventListener('change', () => {
                this.generateRegNumber();
                this._updateProgramDetails();
            });
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
        
        console.log('✅ Enhanced event listeners setup complete');
    }
    
    /**
     * Add clear button to search input
     */
    _addSearchClearButton(searchInput) {
        const container = searchInput.parentElement;
        
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'search-clear-btn';
        clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearBtn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            display: none;
        `;
        
        container.style.position = 'relative';
        container.appendChild(clearBtn);
        
        // Show/hide clear button
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value ? 'block' : 'none';
        });
        
        // Clear search
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            clearBtn.style.display = 'none';
            this._debouncedSearch();
            searchInput.focus();
        });
    }
    
    /**
     * Setup quick action buttons
     */
    _setupQuickActions() {
        // Add quick filter buttons
        const quickFilters = document.getElementById('quickFilters');
        if (quickFilters) {
            quickFilters.innerHTML = `
                <button class="quick-filter-btn active" data-filter="all">All</button>
                <button class="quick-filter-btn" data-filter="active">Active</button>
                <button class="quick-filter-btn" data-filter="inactive">Inactive</button>
                <button class="quick-filter-btn" data-filter="recent">Recent</button>
                <button class="quick-filter-btn" data-filter="no-email">No Email</button>
            `;
            
            quickFilters.querySelectorAll('.quick-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Update active button
                    quickFilters.querySelectorAll('.quick-filter-btn').forEach(b => 
                        b.classList.remove('active')
                    );
                    e.target.classList.add('active');
                    
                    // Apply filter
                    const filter = e.target.dataset.filter;
                    this._applyQuickFilter(filter);
                });
            });
        }
    }
    
    /**
     * Apply quick filter
     */
    _applyQuickFilter(filter) {
        switch (filter) {
            case 'active':
                this.activeFilters.status = 'active';
                break;
            case 'inactive':
                this.activeFilters.status = 'inactive';
                break;
            case 'recent':
                const currentYear = new Date().getFullYear();
                this.activeFilters.intake_year = currentYear.toString();
                break;
            case 'no-email':
                this.filteredStudents = this.allStudents.filter(s => !s.email || s.email.trim() === '');
                this._renderStudentsTable();
                return;
            default:
                // Clear all filters
                Object.keys(this.activeFilters).forEach(key => {
                    this.activeFilters[key] = '';
                });
                break;
        }
        
        this._applyFilters();
    }
    
    /**
     * Setup enhanced modal handlers
     */
    _setupEnhancedModalHandlers() {
        const studentModal = document.getElementById('studentModal');
        if (studentModal) {
            // Close on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && studentModal.classList.contains('active')) {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                }
            });
            
            // Close on overlay click
            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                }
            });
            
            // Form field auto-focus and validation
            studentModal.querySelectorAll('input, select, textarea').forEach(field => {
                // Real-time validation
                if (field.type === 'email') {
                    field.addEventListener('blur', () => this._validateEmailField(field));
                }
                
                if (field.id === 'studentPhone') {
                    field.addEventListener('input', () => this._formatPhoneNumber(field));
                }
            });
        }
    }
    
    /**
     * Setup enhanced bulk actions
     */
    _setupEnhancedBulkActions() {
        // Select all checkbox
        const selectAll = document.getElementById('selectAllStudents');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this._toggleSelectAll(e.target.checked);
            });
        }
        
        // Bulk status update
        const bulkStatusBtn = document.getElementById('bulkStatusBtn');
        if (bulkStatusBtn) {
            bulkStatusBtn.addEventListener('click', () => this._showBulkStatusDialog());
        }
        
        // Bulk delete
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this._showBulkDeleteDialog());
        }
        
        // Bulk export
        const bulkExportBtn = document.getElementById('bulkExportBtn');
        if (bulkExportBtn) {
            bulkExportBtn.addEventListener('click', () => this._exportSelectedStudents());
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
            
            // Ctrl/Cmd + E for export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.exportStudents();
            }
        });
    }
    
    /**
     * Preload related data for better performance
     */
    async _preloadRelatedData() {
        // Preload marks data for student performance
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
     * Load students table with caching
     */
    async loadStudentsTable() {
        try {
            this.ui.showLoading(true, 'Loading students...');
            
            // Check cache
            const now = Date.now();
            if (this.cache.students && now - this.cache.lastFetch < this.cache.cacheDuration) {
                console.log('📦 Using cached students data');
                this.allStudents = this.cache.students;
            } else {
                // Fetch fresh data
                console.log('🔄 Fetching fresh students data');
                this.allStudents = await this.db.getStudents();
                this.cache.students = this.allStudents;
                this.cache.lastFetch = now;
            }
            
            // Update analytics
            this._updateAnalytics();
            
            // Apply current filters
            this.filteredStudents = this._applyCurrentFilters(this.allStudents);
            
            // Render table
            this._renderStudentsTable();
            
            // Update filter dropdowns with current data
            this._populateFilterDropdowns();
            
            // Update statistics display
            this._updateStatisticsDisplay();
            
            console.log(`✅ Loaded ${this.allStudents.length} students (${this.filteredStudents.length} filtered)`);
            
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
     * Render students table with enhanced features
     */
    _renderStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (this.filteredStudents.length === 0) {
            this._renderEmptyState(tbody);
            this._toggleBulkActions(false);
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
        
        // Update pagination
        this._updatePagination();
        
        // Update bulk actions
        this._toggleBulkActions(this.filteredStudents.length > 0);
        
        // Update counter
        this._updateStudentCounter();
    }
    
    /**
     * Create enhanced student row
     */
    _createStudentRow(student, index) {
        const programDisplay = this._getProgramDisplayName(student.program);
        const centreDisplay = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const hasEmail = student.email && student.email.trim() !== '';
        const hasPhone = student.phone && student.phone.trim() !== '';
        const lastUpdated = student.updated_at ? this._formatRelativeTime(student.updated_at) : 'Never';
        
        // Calculate student performance if marks data is available
        const performance = this._calculateStudentPerformance(student.id);
        
        return `
            <tr data-student-id="${this._escapeAttr(student.id)}" 
                data-student-reg="${this._escapeAttr(student.reg_number)}"
                class="${status === 'inactive' ? 'inactive-student' : ''}">
                
                <td style="width: 40px; text-align: center;">
                    <input type="checkbox" class="student-checkbox" 
                           data-student-id="${this._escapeAttr(student.id)}"
                           ${this.selectedStudents.has(student.id) ? 'checked' : ''}>
                </td>
                
                <td style="width: 60px; text-align: center; color: #6b7280; font-weight: 600;">
                    ${index}
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
                                <span class="reg-number">${this._escapeHtml(student.reg_number)}</span>
                                ${hasEmail ? `<span class="student-email">${this._escapeHtml(student.email)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                
                <td>
                    <div class="program-badge">
                        ${this._escapeHtml(programDisplay)}
                    </div>
                    <small class="text-muted">${student.intake_year || 'N/A'}</small>
                </td>
                
                <td>
                    ${this._escapeHtml(centreDisplay)}
                    ${student.county ? `<br><small class="text-muted">${this._escapeHtml(student.county)}</small>` : ''}
                </td>
                
                <td>
                    <span class="status-indicator ${status}">
                        <i class="fas fa-circle"></i>
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                
                <td class="text-center">
                    ${performance.averageScore ? `
                        <div class="performance-score" title="Average: ${performance.averageScore}%">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${performance.averageScore}%"></div>
                            </div>
                            <small>${performance.averageScore}%</small>
                        </div>
                    ` : '<span class="text-muted">No marks</span>'}
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
     * Calculate student performance from marks
     */
    _calculateStudentPerformance(studentId) {
        if (!this.marksData) return { averageScore: 0, totalMarks: 0 };
        
        const studentMarks = this.marksData.filter(mark => 
            mark.student_id === studentId && mark.percentage
        );
        
        if (studentMarks.length === 0) return { averageScore: 0, totalMarks: 0 };
        
        const totalPercentage = studentMarks.reduce((sum, mark) => sum + (mark.percentage || 0), 0);
        const averageScore = Math.round(totalPercentage / studentMarks.length);
        
        return {
            averageScore,
            totalMarks: studentMarks.length,
            latestScore: studentMarks[0]?.percentage || 0
        };
    }
    
    /**
     * Update analytics dashboard
     */
    _updateAnalytics() {
        this.analytics = {
            total: this.allStudents.length,
            active: this.allStudents.filter(s => s.status === 'active').length,
            inactive: this.allStudents.filter(s => s.status === 'inactive').length,
            byProgram: {},
            byCentre: {},
            byIntake: {}
        };
        
        // Count by program
        this.allStudents.forEach(student => {
            const program = student.program || 'Unknown';
            this.analytics.byProgram[program] = (this.analytics.byProgram[program] || 0) + 1;
            
            const centre = student.centre || 'Unknown';
            this.analytics.byCentre[centre] = (this.analytics.byCentre[centre] || 0) + 1;
            
            const year = student.intake_year || 'Unknown';
            this.analytics.byIntake[year] = (this.analytics.byIntake[year] || 0) + 1;
        });
    }
    
    /**
     * Update statistics display
     */
    _updateStatisticsDisplay() {
        // Update total count
        const totalCount = document.getElementById('totalStudentsCount');
        if (totalCount) {
            totalCount.textContent = this.analytics.total.toLocaleString();
        }
        
        // Update active count
        const activeCount = document.getElementById('activeStudentsCount');
        if (activeCount) {
            activeCount.textContent = this.analytics.active.toLocaleString();
        }
        
        // Update inactive count
        const inactiveCount = document.getElementById('inactiveStudentsCount');
        if (inactiveCount) {
            inactiveCount.textContent = this.analytics.inactive.toLocaleString();
        }
        
        // Update program distribution
        this._renderProgramDistribution();
    }
    
    /**
     * Render program distribution chart
     */
    _renderProgramDistribution() {
        const container = document.getElementById('programDistribution');
        if (!container || Object.keys(this.analytics.byProgram).length === 0) return;
        
        const topPrograms = Object.entries(this.analytics.byProgram)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const total = topPrograms.reduce((sum, [_, count]) => sum + count, 0);
        
        let html = '<div class="distribution-chart">';
        
        topPrograms.forEach(([program, count]) => {
            const percentage = Math.round((count / total) * 100);
            const displayName = this._getProgramDisplayName(program);
            
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">
                        <span class="program-color" style="background-color: ${this._getProgramColor(program)}"></span>
                        ${this._escapeHtml(displayName)}
                    </div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">
                        ${count} (${percentage}%)
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    /**
     * Get program color for charts
     */
    _getProgramColor(programCode) {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];
        
        const hash = programCode.split('').reduce((acc, char) => 
            char.charCodeAt(0) + ((acc << 5) - acc), 0
        );
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    /**
     * Enhanced save student method
     */
    async saveStudent(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'studentForm') return;
        
        try {
            // Validate form
            const validationResult = this._validateStudentForm();
            if (!validationResult.isValid) {
                this.ui.showToast(validationResult.message, 'error');
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
     * Enhanced student form validation
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
                this._highlightFieldError(field, true);
            } else {
                this._highlightFieldError(field, false);
            }
        });
        
        // Email validation
        const emailField = document.getElementById('studentEmail');
        if (emailField && emailField.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value.trim())) {
                this._highlightFieldError(emailField, true, 'Invalid email format');
                return {
                    isValid: false,
                    message: 'Please enter a valid email address'
                };
            }
        }
        
        if (missingFields.length > 0) {
            return {
                isValid: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }
        
        return { isValid: true, message: 'Form is valid' };
    }
    
    /**
     * Highlight field error
     */
    _highlightFieldError(field, hasError, message = 'This field is required') {
        if (!field) return;
        
        const container = field.closest('.form-group');
        if (!container) return;
        
        if (hasError) {
            field.classList.add('error');
            
            let errorElement = container.querySelector('.error-message');
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                container.appendChild(errorElement);
            }
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            field.classList.remove('error');
            const errorElement = container.querySelector('.error-message');
            if (errorElement) errorElement.style.display = 'none';
        }
    }
    
    /**
     * Enhanced student editing
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
     * Populate edit form with student data
     */
    async _populateEditForm(student) {
        console.log('📋 Student data for edit:', student);
        
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
        this._setFieldValue('studentWard', student.ward);
        this._setFieldValue('studentVillage', student.village);
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
     * Set field value with validation
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
     * Setup edit mode UI
     */
    _setupEditMode() {
        // Update modal title
        const modalTitle = document.getElementById('studentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Student';
            modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Student';
        }
        
        // Update submit button
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
            submitBtn.classList.add('btn-warning');
        }
        
        // Add delete button to modal
        this._addDeleteButtonToModal();
    }
    
    /**
     * Add delete button to edit modal
     */
    _addDeleteButtonToModal() {
        const modalFooter = document.querySelector('#studentModal .modal-footer');
        if (!modalFooter) return;
        
        // Remove existing delete button
        const existingDeleteBtn = modalFooter.querySelector('.btn-delete-modal');
        if (existingDeleteBtn) existingDeleteBtn.remove();
        
        // Add new delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger btn-delete-modal';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Student';
        deleteBtn.style.marginRight = 'auto';
        
        deleteBtn.addEventListener('click', async () => {
            const confirmed = await this.ui.showConfirmation({
                message: 'Are you sure you want to delete this student? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel'
            });
            
            if (confirmed) {
                await this.deleteStudent(this.currentEditId);
            }
        });
        
        modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
    }
    
    /**
     * Enhanced student viewing
     */
    async viewStudent(studentId) {
        try {
            this.ui.showLoading(true, 'Loading student details...');
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            // Get marks data for this student
            let marksData = [];
            try {
                if (this.db.getStudentMarks) {
                    marksData = await this.db.getStudentMarks(studentId);
                }
            } catch (error) {
                console.warn('Could not load marks data:', error);
            }
            
            // Create enhanced view modal
            this._createEnhancedViewModal(student, marksData);
            
        } catch (error) {
            console.error('❌ Error viewing student:', error);
            this.ui.showToast('Failed to load student details', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Create enhanced view modal
     */
    _createEnhancedViewModal(student, marksData) {
        const modalId = 'enhancedStudentViewModal';
        
        // Remove existing modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal enhanced-modal';
        modal.innerHTML = this._getEnhancedViewModalHTML(student, marksData);
        
        document.body.appendChild(modal);
        
        // Show modal
        this.ui.openModal(modalId, {
            onOpen: () => {
                // Initialize tabs
                this._initViewModalTabs();
                
                // Render performance chart if marks exist
                if (marksData.length > 0) {
                    this._renderPerformanceChart(marksData);
                }
            }
        });
    }
    
    /**
     * Get enhanced view modal HTML
     */
    _getEnhancedViewModalHTML(student, marksData) {
        const programName = this._getProgramDisplayName(student.program);
        const centreName = this._getCentreDisplayName(student.centre_id, student.centre);
        const status = student.status || 'active';
        const registrationDate = student.registration_date || student.created_at;
        const lastUpdated = student.updated_at;
        
        return `
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header">
                    <div class="student-header">
                        <div class="student-avatar-large" style="background-color: ${this._getAvatarColor(student.full_name)}">
                            ${this._getStudentInitials(student.full_name)}
                        </div>
                        <div class="student-header-info">
                            <h2>${this._escapeHtml(student.full_name)}</h2>
                            <div class="student-meta">
                                <span class="reg-number">${this._escapeHtml(student.reg_number)}</span>
                                <span class="status-badge ${status}">${status.toUpperCase()}</span>
                                <span class="intake-year">Intake: ${student.intake_year || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <span class="close" onclick="app.students.ui.closeModal('enhancedStudentViewModal')">&times;</span>
                </div>
                
                <div class="modal-body">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="personal">
                            <i class="fas fa-user"></i> Personal
                        </button>
                        <button class="tab-btn" data-tab="academic">
                            <i class="fas fa-graduation-cap"></i> Academic
                        </button>
                        <button class="tab-btn" data-tab="performance">
                            <i class="fas fa-chart-line"></i> Performance
                            ${marksData.length > 0 ? `<span class="badge">${marksData.length}</span>` : ''}
                        </button>
                        <button class="tab-btn" data-tab="contact">
                            <i class="fas fa-address-book"></i> Contact
                        </button>
                    </div>
                    
                    <div class="tab-content">
                        <!-- Personal Tab -->
                        <div class="tab-pane active" id="tab-personal">
                            ${this._getPersonalInfoHTML(student)}
                        </div>
                        
                        <!-- Academic Tab -->
                        <div class="tab-pane" id="tab-academic">
                            ${this._getAcademicInfoHTML(student)}
                        </div>
                        
                        <!-- Performance Tab -->
                        <div class="tab-pane" id="tab-performance">
                            ${marksData.length > 0 ? 
                                this._getPerformanceHTML(marksData) : 
                                '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No marks recorded yet</p></div>'
                            }
                        </div>
                        
                        <!-- Contact Tab -->
                        <div class="tab-pane" id="tab-contact">
                            ${this._getContactInfoHTML(student)}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="app.students.ui.closeModal('enhancedStudentViewModal')">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-primary" onclick="app.students.editStudent('${this._escapeAttr(student.id)}'); app.students.ui.closeModal('enhancedStudentViewModal')">
                        <i class="fas fa-edit"></i> Edit Student
                    </button>
                    <button class="btn btn-success" onclick="app.students.enterMarks('${this._escapeAttr(student.id)}'); app.students.ui.closeModal('enhancedStudentViewModal')">
                        <i class="fas fa-chart-bar"></i> Enter Marks
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize view modal tabs
     */
    _initViewModalTabs() {
        const tabBtns = document.querySelectorAll('#enhancedStudentViewModal .tab-btn');
        const tabPanes = document.querySelectorAll('#enhancedStudentViewModal .tab-pane');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show active pane
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `tab-${tabId}`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }
    
    /**
     * Get personal info HTML
     */
    _getPersonalInfoHTML(student) {
        return `
            <div class="info-grid">
                <div class="info-card">
                    <h4><i class="fas fa-id-card"></i> Identification</h4>
                    <div class="info-item">
                        <span class="label">Email:</span>
                        <span class="value">${student.email || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Phone:</span>
                        <span class="value">${student.phone || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">ID Number:</span>
                        <span class="value">${student.id_number || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Gender:</span>
                        <span class="value">${student.gender || '<span class="text-muted">Not specified</span>'}</span>
                    </div>
                    ${student.date_of_birth ? `
                    <div class="info-item">
                        <span class="label">Date of Birth:</span>
                        <span class="value">${new Date(student.date_of_birth).toLocaleDateString()} (Age: ${this._calculateAge(student.date_of_birth)})</span>
                    </div>` : ''}
                </div>
                
                <div class="info-card">
                    <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
                    <div class="info-item">
                        <span class="label">County:</span>
                        <span class="value">${student.county || '<span class="text-muted">Not specified</span>'}</span>
                    </div>
                    ${student.region ? `
                    <div class="info-item">
                        <span class="label">Region/Sub-county:</span>
                        <span class="value">${student.region}</span>
                    </div>` : ''}
                    ${student.ward ? `
                    <div class="info-item">
                        <span class="label">Ward:</span>
                        <span class="value">${student.ward}</span>
                    </div>` : ''}
                    ${student.village ? `
                    <div class="info-item">
                        <span class="label">Village/Estate:</span>
                        <span class="value">${student.village}</span>
                    </div>` : ''}
                    ${student.address ? `
                    <div class="info-item">
                        <span class="label">Address:</span>
                        <span class="value">${student.address}</span>
                    </div>` : ''}
                </div>
                
                ${student.employment_status || student.employer ? `
                <div class="info-card">
                    <h4><i class="fas fa-briefcase"></i> Employment</h4>
                    ${student.employment_status ? `
                    <div class="info-item">
                        <span class="label">Status:</span>
                        <span class="value">${student.employment_status}</span>
                    </div>` : ''}
                    ${student.employer ? `
                    <div class="info-item">
                        <span class="label">Employer:</span>
                        <span class="value">${student.employer}</span>
                    </div>` : ''}
                    ${student.job_title ? `
                    <div class="info-item">
                        <span class="label">Job Title:</span>
                        <span class="value">${student.job_title}</span>
                    </div>` : ''}
                    ${student.years_experience ? `
                    <div class="info-item">
                        <span class="label">Experience:</span>
                        <span class="value">${student.years_experience} years</span>
                    </div>` : ''}
                </div>` : ''}
            </div>
        `;
    }
    
    /**
     * Get academic info HTML
     */
    _getAcademicInfoHTML(student) {
        const program = this.programs.find(p => p.code === student.program);
        
        return `
            <div class="info-grid">
                <div class="info-card">
                    <h4><i class="fas fa-graduation-cap"></i> Program Details</h4>
                    <div class="info-item">
                        <span class="label">Program:</span>
                        <span class="value">${this._getProgramDisplayName(student.program)}</span>
                    </div>
                    ${program ? `
                    <div class="info-item">
                        <span class="label">Duration:</span>
                        <span class="value">${program.duration || 'N/A'} months</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Credits:</span>
                        <span class="value">${program.credits || 'N/A'}</span>
                    </div>
                    ` : ''}
                    <div class="info-item">
                        <span class="label">Study Mode:</span>
                        <span class="value">${student.study_mode || 'Full-time'}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h4><i class="fas fa-school"></i> Institution Details</h4>
                    <div class="info-item">
                        <span class="label">Centre:</span>
                        <span class="value">${this._getCentreDisplayName(student.centre_id, student.centre)}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Intake Year:</span>
                        <span class="value">${student.intake_year || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Registration Date:</span>
                        <span class="value">${registrationDate ? new Date(registrationDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    ${lastUpdated ? `
                    <div class="info-item">
                        <span class="label">Last Updated:</span>
                        <span class="value">${new Date(lastUpdated).toLocaleDateString()}</span>
                    </div>` : ''}
                </div>
                
                ${student.notes ? `
                <div class="info-card full-width">
                    <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                    <div class="notes-content">
                        ${this._escapeHtml(student.notes)}
                    </div>
                </div>` : ''}
            </div>
        `;
    }
    
    /**
     * Get performance HTML
     */
    _getPerformanceHTML(marksData) {
        // Calculate statistics
        const totalMarks = marksData.length;
        const averageScore = marksData.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / totalMarks;
        const highestScore = Math.max(...marksData.map(m => m.percentage || 0));
        const lowestScore = Math.min(...marksData.map(m => m.percentage || 0));
        
        // Group by course
        const byCourse = {};
        marksData.forEach(mark => {
            const courseName = mark.courses?.course_name || mark.course_name || 'Unknown Course';
            if (!byCourse[courseName]) {
                byCourse[courseName] = [];
            }
            byCourse[courseName].push(mark);
        });
        
        return `
            <div class="performance-summary">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalMarks}</div>
                        <div class="stat-label">Total Assessments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${averageScore.toFixed(1)}%</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${highestScore.toFixed(1)}%</div>
                        <div class="stat-label">Highest Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${lowestScore.toFixed(1)}%</div>
                        <div class="stat-label">Lowest Score</div>
                    </div>
                </div>
                
                <div class="performance-chart" id="performanceChart">
                    <!-- Chart will be rendered here -->
                </div>
                
                <div class="marks-table">
                    <h4>Recent Assessments</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Course</th>
                                <th>Assessment</th>
                                <th>Score</th>
                                <th>Grade</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${marksData.slice(0, 10).map(mark => `
                                <tr>
                                    <td>${mark.courses?.course_name || mark.course_name || 'N/A'}</td>
                                    <td>${mark.assessment_name || mark.assessment_type || 'Assessment'}</td>
                                    <td><strong>${mark.score}/${mark.max_score}</strong> (${mark.percentage?.toFixed(1)}%)</td>
                                    <td><span class="grade-badge ${this._getGradeCSSClass(mark.grade)}">${mark.grade || 'N/A'}</span></td>
                                    <td>${mark.assessment_date ? new Date(mark.assessment_date).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    /**
     * Get contact info HTML
     */
    _getContactInfoHTML(student) {
        return `
            <div class="info-grid">
                <div class="info-card">
                    <h4><i class="fas fa-phone"></i> Primary Contact</h4>
                    <div class="info-item">
                        <span class="label">Phone:</span>
                        <span class="value">${student.phone || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Email:</span>
                        <span class="value">${student.email || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Address:</span>
                        <span class="value">${student.address || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                </div>
                
                ${student.emergency_contact_name || student.emergency_contact_phone ? `
                <div class="info-card">
                    <h4><i class="fas fa-user-md"></i> Emergency Contact</h4>
                    ${student.emergency_contact_name ? `
                    <div class="info-item">
                        <span class="label">Name:</span>
                        <span class="value">${student.emergency_contact_name}</span>
                    </div>` : ''}
                    ${student.emergency_contact_phone ? `
                    <div class="info-item">
                        <span class="label">Phone:</span>
                        <span class="value">${student.emergency_contact_phone}</span>
                    </div>` : ''}
                    ${student.emergency_contact_relationship ? `
                    <div class="info-item">
                        <span class="label">Relationship:</span>
                        <span class="value">${student.emergency_contact_relationship}</span>
                    </div>` : ''}
                </div>` : ''}
                
                <div class="info-card full-width">
                    <h4><i class="fas fa-comments"></i> Communication History</h4>
                    <div class="communication-history">
                        <p class="text-muted">Communication history feature coming soon...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render performance chart
     */
    _renderPerformanceChart(marksData) {
        // This is a simple implementation. You can integrate with Chart.js or other library
        const chartContainer = document.getElementById('performanceChart');
        if (!chartContainer) return;
        
        // Sort by date
        const sortedMarks = [...marksData].sort((a, b) => 
            new Date(a.assessment_date || a.created_at) - new Date(b.assessment_date || b.created_at)
        );
        
        const dates = sortedMarks.map(m => 
            new Date(m.assessment_date || m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        const scores = sortedMarks.map(m => m.percentage || 0);
        
        // Create simple SVG chart
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '200');
        svg.style.borderRadius = '4px';
        svg.style.backgroundColor = '#f8f9fa';
        
        chartContainer.innerHTML = '';
        chartContainer.appendChild(svg);
    }
    
    /**
     * Enhanced export functionality
     */
    async exportStudents(format = 'csv', selectedOnly = false) {
        try {
            this.ui.showLoading(true, 'Preparing export...');
            
            const studentsToExport = selectedOnly 
                ? this.allStudents.filter(s => this.selectedStudents.has(s.id))
                : this.allStudents;
            
            if (studentsToExport.length === 0) {
                this.ui.showToast('No students to export', 'warning');
                return;
            }
            
            const data = studentsToExport.map(student => ({
                'Registration Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email || '',
                'Phone': student.phone || '',
                'ID Number': student.id_number || '',
                'Gender': student.gender || '',
                'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                'Program': this._getProgramDisplayName(student.program),
                'Program Code': student.program || '',
                'Centre': this._getCentreDisplayName(student.centre_id, student.centre),
                'County': student.county || '',
                'Region': student.region || '',
                'Ward': student.ward || '',
                'Village': student.village || '',
                'Address': student.address || '',
                'Intake Year': student.intake_year || '',
                'Study Mode': student.study_mode || '',
                'Status': student.status || '',
                'Employment Status': student.employment_status || '',
                'Employer': student.employer || '',
                'Job Title': student.job_title || '',
                'Experience': student.years_experience || 0,
                'Emergency Contact': student.emergency_contact_name || '',
                'Emergency Phone': student.emergency_contact_phone || '',
                'Relationship': student.emergency_contact_relationship || '',
                'Registration Date': student.registration_date || student.created_at ? new Date(student.registration_date || student.created_at).toISOString().split('T')[0] : '',
                'Notes': student.notes || ''
            }));
            
            if (format === 'csv') {
                this._exportToEnhancedCSV(data, 'students_export');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'students_export');
            } else if (format === 'pdf') {
                this._exportToPDF(data, 'students_export');
            }
            
            this.ui.showToast(`Exported ${studentsToExport.length} students successfully`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting students:', error);
            this.ui.showToast('Failed to export students', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }
    
    /**
     * Export to enhanced CSV with better formatting
     */
    _exportToEnhancedCSV(data, fileName) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add UTF-8 BOM for Excel compatibility
        csvRows.push('\ufeff' + headers.join(','));
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                
                // Handle special characters and commas
                if (value === null || value === undefined) return '';
                
                let stringValue = String(value);
                
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
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
     * Export to Excel (using CSV with .xls extension)
     */
    _exportToExcel(data, fileName) {
        // For now, export as CSV with .xls extension
        this._exportToEnhancedCSV(data, fileName);
    }
    
    /**
     * Export to PDF (placeholder - would need a PDF library)
     */
    _exportToPDF(data, fileName) {
        this.ui.showToast('PDF export coming soon. Exporting as CSV instead.', 'info');
        this._exportToEnhancedCSV(data, fileName);
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
     * Enhanced student deletion
     */
    async deleteStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            // Check if student has marks
            let hasMarks = false;
            if (this.marksData) {
                hasMarks = this.marksData.some(mark => mark.student_id === studentId);
            }
            
            let confirmationMessage = `Are you sure you want to delete ${this._escapeHtml(student.full_name)} (${this._escapeHtml(student.reg_number)})?`;
            
            if (hasMarks) {
                confirmationMessage += '\n\n⚠️ This student has marks recorded. Deleting will also remove all associated marks.';
            }
            
            confirmationMessage += '\n\nThis action cannot be undone.';
            
            const confirmed = await this.ui.showConfirmation({
                message: confirmationMessage,
                confirmText: hasMarks ? 'Delete Student & Marks' : 'Delete Student',
                cancelText: 'Cancel'
            });
            
            if (!confirmed) return;
            
            await this.db.deleteStudent(studentId);
            
            // Update cache
            this.cache.students = null;
            
            // Remove from selected
            this.selectedStudents.delete(studentId);
            
            // Show success message
            this.ui.showToast(`Student ${student.full_name} deleted successfully`, 'success');
            
            // Reload table
            await this.loadStudentsTable();
            
            // Close modal if open
            this.ui.closeModal('studentModal');
            this.ui.closeModal('enhancedStudentViewModal');
            
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
            
            // Close any open modals
            this.ui.closeModal('studentModal');
            this.ui.closeModal('enhancedStudentViewModal');
            
            // Show notification
            this.ui.showToast(`Opening marks entry for ${student.full_name}`, 'info');
            
            // Navigate to marks page or open marks modal
            if (this.app?.marks?.openMarksModal) {
                this.app.marks.openMarksModal(studentId);
            } else {
                // Fallback: redirect to marks page or show message
                this.ui.showToast('Please use the Marks page to enter marks', 'info');
                
                // Alternative: open a simple marks entry modal
                this._openSimpleMarksModal(student);
            }
            
        } catch (error) {
            console.error('❌ Error entering marks:', error);
            this.ui.showToast('Failed to open marks entry', 'error');
        }
    }
    
    /**
     * Open simple marks modal (fallback)
     */
    _openSimpleMarksModal(student) {
        const modalId = 'simpleMarksModal';
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Enter Marks for ${this._escapeHtml(student.full_name)}</h3>
                    <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Full marks entry functionality is available on the Marks page.</p>
                    <p><strong>Student:</strong> ${this._escapeHtml(student.full_name)}</p>
                    <p><strong>Registration:</strong> ${this._escapeHtml(student.reg_number)}</p>
                    <p><strong>Program:</strong> ${this._getProgramDisplayName(student.program)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Close</button>
                    <button class="btn btn-primary" onclick="window.location.href='marks.html'">Go to Marks Page</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.ui.openModal(modalId);
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
        
        // Clear validation errors
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        
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
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Register New Student';
        }
        
        // Reset submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
            submitBtn.classList.remove('btn-warning');
            submitBtn.disabled = false;
        }
        
        // Remove delete button from modal
        const deleteBtn = document.querySelector('#studentModal .btn-delete-modal');
        if (deleteBtn) deleteBtn.remove();
        
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
            
            // Clean program code (remove any extra text)
            const cleanProgramCode = programCode.split('-')[0].trim();
            
            try {
                // Try database method first
                const regNumber = await this.db.generateRegistrationNumber(cleanProgramCode, intakeYear);
                
                if (regNumber) {
                    regNumberInput.value = regNumber;
                    console.log('✅ Generated registration number:', regNumber);
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
                console.log('✅ Generated fallback registration number:', regNumber);
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
     * Update program details display
     */
    _updateProgramDetails() {
        const programSelect = document.getElementById('studentProgram');
        const selectedOption = programSelect?.options[programSelect.selectedIndex];
        
        if (!selectedOption || !selectedOption.value) return;
        
        const program = this.programs.find(p => p.code === selectedOption.value);
        if (!program) return;
        
        // Update program info display
        const infoDiv = document.getElementById('programInfoDisplay');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <div class="program-info">
                    <strong>${program.name}</strong>
                    ${program.duration ? `<div>Duration: ${program.duration} months</div>` : ''}
                    ${program.credits ? `<div>Credits: ${program.credits}</div>` : ''}
                </div>
            `;
            infoDiv.style.display = 'block';
        }
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
    
    _formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    }
    
    _calculateAge(dateOfBirth) {
        try {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            return age;
        } catch (error) {
            return 'N/A';
        }
    }
    
    _validateEmailField(field) {
        if (!field.value.trim()) return;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value.trim())) {
            this._highlightFieldError(field, true, 'Invalid email format');
        } else {
            this._highlightFieldError(field, false);
        }
    }
    
    _formatPhoneNumber(field) {
        let value = field.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = value.slice(0, 3) + '-' + value.slice(3);
            } else {
                value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
            }
        }
        
        field.value = value;
    }
    
    _getProgramDisplayName(programCode) {
        if (!programCode) return 'Not assigned';
        
        const program = this.programs.find(p => p.code === programCode);
        if (program) {
            return `${program.code} - ${program.name}`;
        }
        
        // Try to extract from custom programs in dropdown
        const programSelect = document.getElementById('studentProgram');
        if (programSelect) {
            const option = Array.from(programSelect.options).find(opt => opt.value === programCode);
            if (option) return option.textContent;
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
    
    _getGradeCSSClass(grade) {
        if (!grade) return 'grade-unknown';
        
        const gradeUpper = grade.toUpperCase();
        if (gradeUpper.includes('DISTINCTION')) return 'grade-distinction';
        if (gradeUpper.includes('CREDIT')) return 'grade-credit';
        if (gradeUpper.includes('PASS')) return 'grade-pass';
        if (gradeUpper.includes('FAIL')) return 'grade-fail';
        return 'grade-unknown';
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
    
    // Add more helper methods as needed...
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
    
    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (window.app && window.app.students) {
            setTimeout(() => window.app.students.init(), 100);
        }
    });
}
