// modules/reports.js - COMPLETE UPDATED VERSION
class ReportsManager {
    constructor(db) {
        console.log('📊 ReportsManager constructor called');
        
        this.db = db || window.app?.db;
        this.app = window.app || window;
        
        if (!this.db) {
            console.error('❌ Database not available for ReportsManager');
        } else {
            console.log('✅ Database connected to ReportsManager:', this.db.constructor.name);
        }
        
        this.currentFilters = {
            year: new Date().getFullYear().toString(),
            program: ['all'],
            course: 'all',
            semester: 'all',
            status: 'all',
            intake: 'all',
            centres: ['all'],
            counties: ['all'],
            dateFrom: null,
            dateTo: null
        };
        
        this.charts = {};
        this.initialized = false;
        this.students = [];
        this.courses = [];
        this.marks = [];
        this.centres = [];
        this.counties = [];
        this.programs = [];
        this.selectedStudentForTranscript = null;
        
        // NEW: Selected filters for dropdowns
        this.selectedFilters = {
            centre: [],
            county: [],
            program: []
        };
        
        // Bind all methods
        this.applyFilters = this.applyFilters.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.refreshReports = this.refreshReports.bind(this);
        this.studentReport = this.studentReport.bind(this);
        this.academicReport = this.academicReport.bind(this);
        this.generateCentreReport = this.generateCentreReport.bind(this);
        this.generateSummaryReport = this.generateSummaryReport.bind(this);
        this.previewTranscript = this.previewTranscript.bind(this);
        this.generateTranscript = this.generateTranscript.bind(this);
        this.loadSampleTranscript = this.loadSampleTranscript.bind(this);
        this.clearPreview = this.clearPreview.bind(this);
        this.previewStudentReport = this.previewStudentReport.bind(this);
        this.previewAcademicReport = this.previewAcademicReport.bind(this);
        this.quickStudentReport = this.quickStudentReport.bind(this);
        this.quickAcademicReport = this.quickAcademicReport.bind(this);
        this.bulkExport = this.bulkExport.bind(this);
        this.bulkTranscripts = this.bulkTranscripts.bind(this);
        this.addScheduledReport = this.addScheduledReport.bind(this);
        this.saveFilterPreset = this.saveFilterPreset.bind(this);
        this.downloadPreview = this.downloadPreview.bind(this);
        this.openTranscriptSection = this.openTranscriptSection.bind(this);
        this.showScheduledReports = this.showScheduledReports.bind(this);
        this.openTranscriptModal = this.openTranscriptModal.bind(this);
        this.selectStudentForTranscript = this.selectStudentForTranscript.bind(this);
        this.closeTranscriptModal = this.closeTranscriptModal.bind(this);
        this.searchTranscriptStudents = this.searchTranscriptStudents.bind(this);
        this.clearSelectedStudent = this.clearSelectedStudent.bind(this);
        this.displaySelectedStudentInfo = this.displaySelectedStudentInfo.bind(this);
        this.populateReportDropdowns = this.populateReportDropdowns.bind(this);
        this.debugDropdowns = this.debugDropdowns.bind(this);
        this.generateStudentReport = this.generateStudentReport.bind(this);
        this.generateAcademicReport = this.generateAcademicReport.bind(this);
        
        // NEW METHODS for searchable dropdowns
        this.searchFilter = this.searchFilter.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.selectAllFilter = this.selectAllFilter.bind(this);
        this.clearFilter = this.clearFilter.bind(this);
        this.selectFilterOption = this.selectFilterOption.bind(this);
        this.removeFilterOption = this.removeFilterOption.bind(this);
        this.updateFilterButtonText = this.updateFilterButtonText.bind(this);
        this.updateSelectedBadges = this.updateSelectedBadges.bind(this);
    }
    
    // ==================== INITIALIZATION ====================
    
    async initialize() {
        if (this.initialized) {
            console.log('✅ ReportsManager already initialized');
            return;
        }
        
        try {
            console.log('📊 Initializing Reports Manager...');
            this.showLoading(true);
            
            // Load all data first
            await this.loadAllData();
            
            // DEBUG: Check data
            await this.debugStudentData();
            
            // Initialize UI components
            await this.initializeReportsUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial statistics
            await this.updateStatistics();
            
            // Load initial reports grid
            await this.generateReportsGrid();
            
            // Display any selected student info
            this.displaySelectedStudentInfo();
            
            this.initialized = true;
            console.log('✅ Reports Manager initialized successfully');
            
            this.showToast('Reports module ready', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing reports:', error);
            this.showToast('Reports module failed to initialize: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadAllData() {
        try {
            console.log('🔄 Loading all data for reports...');
            
            // Load all data in parallel
            const [studentsData, coursesData, marksData, centresData, countiesData, programsData] = await Promise.all([
                this.getStudents(),
                this.getCourses(),
                this.getMarks(),
                this.getCentres(),
                this.getCounties(),
                this.getPrograms()
            ]);
            
            this.students = studentsData || [];
            this.courses = coursesData || [];
            this.marks = marksData || [];
            this.centres = centresData || [];
            this.counties = countiesData || [];
            this.programs = programsData || [];
            
            console.log(`📊 Data loaded: 
                ${this.students.length} students, 
                ${this.courses.length} courses, 
                ${this.marks.length} marks,
                ${this.centres.length} centres,
                ${this.counties.length} counties,
                ${this.programs.length} programs`);
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showToast('Error loading report data', 'error');
            
            // Initialize with empty arrays to prevent crashes
            this.students = this.students || [];
            this.courses = this.courses || [];
            this.marks = this.marks || [];
            this.centres = this.centres || [];
            this.counties = this.counties || [];
            this.programs = this.programs || [];
        }
    }
    
    async initializeReportsUI() {
        try {
            console.log('🔄 Initializing Reports UI...');
            
            // Create transcript modal if it doesn't exist
            this.createTranscriptModal();
            
            // Populate all filters
            await this.populateAllFilters();
            
            // Set default dates
            this.setDefaultDates();
            
            console.log('✅ Reports UI initialized');
            
        } catch (error) {
            console.error('❌ Error initializing reports UI:', error);
            throw error;
        }
    }
    
    // ==================== NEW FILTER METHODS ====================
    
    /**
     * Search filter options
     */
    searchFilter(type, searchTerm) {
        console.log(`🔍 Searching ${type} filter: ${searchTerm}`);
        
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('.filter-option');
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    /**
     * Toggle dropdown visibility
     */
    toggleDropdown(type) {
        // Bootstrap handles this automatically via data-bs-toggle
        // This method is kept for compatibility
        console.log(`📂 Toggling ${type} dropdown`);
    }
    
    /**
     * Select all options in filter
     */
    selectAllFilter(type) {
        console.log(`✅ Selecting all ${type} options`);
        
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) return;
        
        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        const allOptions = [];
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            if (checkbox.value !== 'all') {
                allOptions.push(checkbox.value);
            }
        });
        
        this.selectedFilters[type] = allOptions;
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    /**
     * Clear filter selection
     */
    clearFilter(type) {
        console.log(`🧹 Clearing ${type} filter`);
        
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) return;
        
        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === 'all';
        });
        
        this.selectedFilters[type] = [];
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    /**
     * Select/deselect filter option
     */
    selectFilterOption(type, value, checked) {
        console.log(`${checked ? '✅' : '❌'} ${type} filter: ${value}`);
        
        const allCheckbox = document.querySelector(`input[value="all"][data-filter="${type}"]`);
        
        if (value === 'all') {
            // "All" selected - clear other selections
            const checkboxes = document.querySelectorAll(`input[data-filter="${type}"]`);
            checkboxes.forEach(cb => {
                cb.checked = cb.value === 'all';
            });
            this.selectedFilters[type] = [];
        } else {
            // Specific option selected - uncheck "All"
            if (allCheckbox) {
                allCheckbox.checked = false;
            }
            
            if (checked) {
                this.selectedFilters[type].push(value);
            } else {
                this.selectedFilters[type] = this.selectedFilters[type].filter(v => v !== value);
            }
            
            // If no options selected, check "All"
            if (this.selectedFilters[type].length === 0 && allCheckbox) {
                allCheckbox.checked = true;
            }
        }
        
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    /**
     * Remove selected badge
     */
    removeFilterOption(type, value) {
        console.log(`🗑️ Removing ${type}: ${value}`);
        
        this.selectedFilters[type] = this.selectedFilters[type].filter(v => v !== value);
        
        // Uncheck the checkbox
        const checkbox = document.querySelector(`input[value="${value}"][data-filter="${type}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        // If no options selected, check "All"
        if (this.selectedFilters[type].length === 0) {
            const allCheckbox = document.querySelector(`input[value="all"][data-filter="${type}"]`);
            if (allCheckbox) {
                allCheckbox.checked = true;
            }
        }
        
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    /**
     * Update filter button text
     */
    updateFilterButtonText(type) {
        const buttonText = document.getElementById(`${type}ButtonText`);
        
        if (!buttonText) return;
        
        const selectedCount = this.selectedFilters[type].length;
        
        if (selectedCount === 0) {
            buttonText.textContent = `All ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
        } else if (selectedCount === 1) {
            // Show the single selected item
            const firstItem = this.selectedFilters[type][0];
            buttonText.textContent = firstItem.length > 20 ? 
                firstItem.substring(0, 20) + '...' : firstItem;
        } else {
            buttonText.textContent = `${selectedCount} ${type.charAt(0).toUpperCase() + type.slice(1)}s selected`;
        }
    }
    
    /**
     * Update selected badges display
     */
    updateSelectedBadges(type) {
        const badgesContainer = document.getElementById(`${type}SelectedBadges`);
        if (!badgesContainer) return;
        
        const selectedItems = this.selectedFilters[type];
        
        if (selectedItems.length === 0) {
            badgesContainer.innerHTML = '';
            return;
        }
        
        let badgesHTML = '';
        selectedItems.forEach(item => {
            badgesHTML += `
                <span class="selected-badge">
                    ${item}
                    <span class="badge-remove" onclick="app.reports.removeFilterOption('${type}', '${item.replace(/'/g, "\\'")}')">
                        <i class="fas fa-times"></i>
                    </span>
                </span>
            `;
        });
        
        badgesContainer.innerHTML = badgesHTML;
    }
    
    // ==================== UPDATED FILTER POPULATION ====================
    
    async populateAllFilters() {
        try {
            console.log('🔄 Populating all filters...');
            
            // 1. Academic Year filter
            this.populateAcademicYearFilter();
            
            // 2. NEW: Populate searchable dropdown filters
            await this.populateSearchableFilters();
            
            // 3. Regular select filters
            await this.populateIntakeFilter();
            await this.populateCourseFilter();
            
            // 4. Modal filters
            await this.populateModalFilters();
            
            // 5. Set default dates
            this.setDefaultDates();
            
            console.log('✅ All filters populated successfully');
            
        } catch (error) {
            console.error('❌ Error populating filters:', error);
            this.showToast('Error loading filter data', 'error');
        }
    }
    
    async populateSearchableFilters() {
        try {
            // Get data
            const centres = this.centres.length > 0 ? this.centres : await this.getCentres();
            const counties = this.counties.length > 0 ? this.counties : await this.getCounties();
            const programs = this.programs.length > 0 ? this.programs : await this.getPrograms();
            
            // Populate Centre Filter
            this.populateFilterOptions('centre', centres, 'name');
            
            // Populate County Filter
            this.populateFilterOptions('county', counties, 'name');
            
            // Populate Program Filter
            this.populateFilterOptions('program', programs, 'name');
            
        } catch (error) {
            console.error('❌ Error populating searchable filters:', error);
        }
    }
    
    populateFilterOptions(type, data, nameField) {
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) {
            console.warn(`⚠️ ${type}FilterOptions container not found`);
            return;
        }
        
        let optionsHTML = '';
        
        // Add "All" option
        optionsHTML += `
            <div class="filter-option">
                <input type="checkbox" 
                       id="${type}_all" 
                       value="all" 
                       data-filter="${type}"
                       ${this.selectedFilters[type].length === 0 ? 'checked' : ''}
                       onchange="app.reports.selectFilterOption('${type}', 'all', this.checked)">
                <label for="${type}_all" style="cursor: pointer; margin-left: 5px;">
                    All ${type.charAt(0).toUpperCase() + type.slice(1)}s
                </label>
            </div>
        `;
        
        // Add data options
        if (data && data.length > 0) {
            data.forEach((item, index) => {
                const value = item[nameField] || item;
                const displayName = item[nameField] || item;
                const itemId = `${type}_${index}`;
                const isSelected = this.selectedFilters[type].includes(value);
                
                optionsHTML += `
                    <div class="filter-option">
                        <input type="checkbox" 
                               id="${itemId}" 
                               value="${value.replace(/"/g, '&quot;')}" 
                               data-filter="${type}"
                               ${isSelected ? 'checked' : ''}
                               onchange="app.reports.selectFilterOption('${type}', '${value.replace(/'/g, "\\'")}', this.checked)">
                        <label for="${itemId}" style="cursor: pointer; margin-left: 5px;">
                            ${displayName}
                        </label>
                    </div>
                `;
            });
        }
        
        optionsContainer.innerHTML = optionsHTML;
        console.log(`✅ Populated ${type} filter with ${data?.length || 0} options`);
    }
    
    // ==================== FILTER POPULATION HELPERS ====================
    
    populateAcademicYearFilter() {
        const yearSelect = document.getElementById('academicYear');
        if (!yearSelect) {
            console.warn('⚠️ academicYear element not found');
            return;
        }
        
        // Clear existing options
        yearSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All Years';
        yearSelect.appendChild(defaultOption);
        
        // Add current year and previous 5 years
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        
        // Set default to current year
        yearSelect.value = currentYear;
        this.currentFilters.year = currentYear.toString();
    }
    
    async populateIntakeFilter() {
        try {
            const intakeSelect = document.getElementById('filterIntake');
            if (!intakeSelect) {
                console.warn('⚠️ filterIntake element not found');
                return;
            }
            
            intakeSelect.innerHTML = '';
            
            // Add "All Intakes" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Intakes';
            intakeSelect.appendChild(allOption);
            
            // Get students data
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            if (students && students.length > 0) {
                // Extract unique intake years
                const intakeYearsSet = new Set();
                
                students.forEach(student => {
                    let intakeYear = null;
                    
                    // Try different possible field names
                    if (student.intake_year) {
                        intakeYear = student.intake_year;
                    } else if (student.intake) {
                        intakeYear = student.intake;
                    } else if (student.created_at) {
                        // Extract year from created_at
                        intakeYear = new Date(student.created_at).getFullYear();
                    }
                    
                    if (intakeYear) {
                        intakeYearsSet.add(parseInt(intakeYear));
                    }
                });
                
                // Convert to array and sort descending
                const intakeYears = Array.from(intakeYearsSet)
                    .filter(year => !isNaN(year) && year > 2000 && year <= new Date().getFullYear())
                    .sort((a, b) => b - a);
                
                if (intakeYears.length > 0) {
                    intakeYears.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year.toString();
                        intakeSelect.appendChild(option);
                    });
                    
                    console.log(`✅ Populated intake filter with ${intakeYears.length} years`);
                } else {
                    // Add current year as fallback
                    const currentYear = new Date().getFullYear();
                    const option = document.createElement('option');
                    option.value = currentYear;
                    option.textContent = currentYear.toString();
                    intakeSelect.appendChild(option);
                }
            } else {
                // Add current year as fallback
                const currentYear = new Date().getFullYear();
                const option = document.createElement('option');
                option.value = currentYear;
                option.textContent = currentYear.toString();
                intakeSelect.appendChild(option);
            }
            
        } catch (error) {
            console.error('❌ Error populating intake filter:', error);
        }
    }
    
    async populateCourseFilter() {
        try {
            const courseSelect = document.getElementById('filterCourse');
            if (!courseSelect) {
                console.warn('⚠️ filterCourse element not found');
                return;
            }
            
            courseSelect.innerHTML = '';
            
            // Add "All Courses" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Courses';
            courseSelect.appendChild(allOption);
            
            // Get courses data
            const courses = this.courses.length > 0 ? this.courses : await this.getCourses();
            
            if (courses && courses.length > 0) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    
                    // Extract course code and name
                    let courseCode = course.course_code || course.code || 'N/A';
                    let courseName = course.course_name || course.name || 'Unknown Course';
                    
                    option.value = courseCode;
                    option.textContent = `${courseCode} - ${courseName}`;
                    
                    // Add credits if available
                    if (course.credits) {
                        option.textContent += ` (${course.credits} credits)`;
                    }
                    
                    courseSelect.appendChild(option);
                });
                
                console.log(`✅ Populated course filter with ${courses.length} courses`);
            } else {
                console.warn('⚠️ No courses data found');
                
                // Add default courses
                const defaultCourses = [
                    { code: 'TEE101', name: 'Introduction to TEE', credits: 3 },
                    { code: 'BIB101', name: 'Bible Study Methods', credits: 3 },
                    { code: 'MIN101', name: 'Ministry Foundations', credits: 3 }
                ];
                
                defaultCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.code;
                    option.textContent = `${course.code} - ${course.name} (${course.credits} credits)`;
                    courseSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('❌ Error populating course filter:', error);
        }
    }
    
    async populateModalFilters() {
        try {
            // Populate modal centre filter
            const modalCentreFilter = document.getElementById('transcriptModalCentreFilter');
            if (modalCentreFilter) {
                modalCentreFilter.innerHTML = '<option value="all">All Centres</option>';
                
                const centres = this.centres.length > 0 ? this.centres : await this.getCentres();
                if (centres && centres.length > 0) {
                    centres.forEach(centre => {
                        const option = document.createElement('option');
                        const centreName = centre.name || centre.code || centre;
                        option.value = centreName;
                        option.textContent = centreName;
                        modalCentreFilter.appendChild(option);
                    });
                }
            }
            
            // Populate modal program filter
            const modalProgramFilter = document.getElementById('transcriptModalProgramFilter');
            if (modalProgramFilter) {
                modalProgramFilter.innerHTML = '<option value="all">All Programs</option>';
                
                const programs = this.programs.length > 0 ? this.programs : await this.getPrograms();
                if (programs && programs.length > 0) {
                    programs.forEach(program => {
                        const option = document.createElement('option');
                        const programName = program.name || program.code || program;
                        option.value = programName;
                        option.textContent = programName;
                        modalProgramFilter.appendChild(option);
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error populating modal filters:', error);
        }
    }
    
    // ==================== UPDATED FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            this.showLoading(true);
            
            // Get all filter values - UPDATED for searchable dropdowns
            this.currentFilters = {
                year: this.getSafeElementValue('academicYear', 'all'),
                program: this.selectedFilters.program.length > 0 ? this.selectedFilters.program : ['all'],
                course: this.getSafeElementValue('filterCourse', 'all'),
                semester: this.getSafeElementValue('semester', 'all'),
                status: 'all',
                intake: this.getSafeElementValue('filterIntake', 'all'),
                centres: this.selectedFilters.centre.length > 0 ? this.selectedFilters.centre : ['all'],
                counties: this.selectedFilters.county.length > 0 ? this.selectedFilters.county : ['all'],
                dateFrom: document.getElementById('reportStartDate')?.value || null,
                dateTo: document.getElementById('reportEndDate')?.value || null
            };
            
            console.log('Current filters:', this.currentFilters);
            
            // Update statistics with current filters
            await this.updateStatistics();
            
            // Update reports grid
            await this.generateReportsGrid();
            
            this.showToast('Filters applied successfully', 'success');
            
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showToast('Error applying filters: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    clearFilters() {
        try {
            console.log('🧹 Clearing filters...');
            
            // Reset searchable dropdowns
            ['centre', 'county', 'program'].forEach(type => {
                this.selectedFilters[type] = [];
                this.updateFilterButtonText(type);
                this.updateSelectedBadges(type);
                
                // Reset checkboxes
                const checkboxes = document.querySelectorAll(`input[data-filter="${type}"]`);
                checkboxes.forEach(cb => {
                    cb.checked = cb.value === 'all';
                });
            });
            
            // Reset regular select elements
            const filterElements = {
                'academicYear': () => {
                    const element = document.getElementById('academicYear');
                    if (element) {
                        element.value = new Date().getFullYear();
                    }
                },
                'filterIntake': () => {
                    const element = document.getElementById('filterIntake');
                    if (element) element.value = 'all';
                },
                'filterCourse': () => {
                    const element = document.getElementById('filterCourse');
                    if (element) element.value = 'all';
                },
                'semester': () => {
                    const element = document.getElementById('semester');
                    if (element) element.value = 'all';
                }
            };
            
            // Reset each filter
            Object.values(filterElements).forEach(resetFunction => resetFunction());
            
            // Reset dates
            this.setDefaultDates();
            
            // Reset current filters
            this.currentFilters = {
                year: new Date().getFullYear().toString(),
                program: ['all'],
                course: 'all',
                semester: 'all',
                status: 'all',
                intake: 'all',
                centres: ['all'],
                counties: ['all'],
                dateFrom: null,
                dateTo: null
            };
            
            // Update UI
            this.updateStatistics();
            this.generateReportsGrid();
            
            this.showToast('Filters cleared', 'info');
            
        } catch (error) {
            console.error('Error clearing filters:', error);
            this.showToast('Error clearing filters: ' + error.message, 'error');
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    getSelectedValues(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return ['all'];
        
        if (select.type === 'select-multiple') {
            const selected = Array.from(select.selectedOptions)
                .map(option => option.value)
                .filter(value => value && value !== '' && value !== 'all');
            
            return selected.length > 0 ? selected : ['all'];
        } else {
            const value = select.value;
            return value && value !== '' && value !== 'all' ? [value] : ['all'];
        }
    }
    
    getSafeElementValue(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    setDefaultDates() {
        const dateFrom = document.getElementById('reportStartDate');
        const dateTo = document.getElementById('reportEndDate');
        
        if (dateFrom) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            dateFrom.valueAsDate = oneYearAgo;
            this.currentFilters.dateFrom = oneYearAgo.toISOString().split('T')[0];
        }
        
        if (dateTo) {
            dateTo.valueAsDate = new Date();
            this.currentFilters.dateTo = new Date().toISOString().split('T')[0];
        }
    }
    
    applyStudentFilters(students) {
        if (!students || !Array.isArray(students)) return [];
        
        let filtered = [...students];
        
        // Apply program filter
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => 
                s.program && programs.includes(s.program)
            );
        }
        
        // Apply centre filter
        const centres = this.currentFilters.centres;
        if (centres.length > 0 && !centres.includes('all')) {
            filtered = filtered.filter(s => {
                const studentCentre = s.centre_name || s.centre;
                return studentCentre && centres.includes(studentCentre.toString());
            });
        }
        
        // Apply county filter
        const counties = this.currentFilters.counties;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => 
                s.county && counties.includes(s.county)
            );
        }
        
        // Apply intake filter
        if (this.currentFilters.intake !== 'all') {
            const intakeYear = parseInt(this.currentFilters.intake);
            filtered = filtered.filter(s => {
                const studentIntake = s.intake_year || s.intake;
                return studentIntake && parseInt(studentIntake) === intakeYear;
            });
        }
        
        return filtered;
    }
    
    // ==================== UPDATED STATISTICS ====================
    
    async updateStatistics() {
        try {
            console.log('🔄 Updating statistics...');
            
            // Get fresh student data
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const filteredStudents = this.applyStudentFilters(students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            const centres = await this.getCentres();
            const activeCentres = centres.length;
            
            // Calculate average GPA (simplified for now)
            const avgGPA = 3.24;
            
            // Update DOM elements - SIMPLIFIED for new HTML structure
            const stats = {
                'totalStudents': totalStudents.toLocaleString(),
                'graduationRate': graduationRate + '%',
                'avgGPA': avgGPA.toFixed(2),
                'centersCount': activeCentres.toString()
            };
            
            // Simple update - these IDs should match your HTML
            Object.entries(stats).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    console.log(`✅ Updated #${id} to: ${value}`);
                } else {
                    console.warn(`⚠️ Element #${id} not found`);
                }
            });
            
            console.log(`✅ Statistics updated: ${totalStudents} students, ${graduationRate}% graduation rate`);
            
        } catch (error) {
            console.error('❌ Error updating statistics:', error);
            
            // Set fallback values on error
            const fallbackStats = {
                'totalStudents': '0',
                'graduationRate': '0%',
                'avgGPA': '0.00',
                'centersCount': '0'
            };
            
            Object.entries(fallbackStats).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        }
    }
    
    // ==================== REPORTS GRID ====================
    
    async generateReportsGrid() {
        try {
            const reportsContainer = document.getElementById('reportsGrid');
            if (!reportsContainer) {
                console.warn('⚠️ reportsGrid element not found');
                return;
            }
            
            const reports = [
                {
                    id: 'student-list',
                    title: 'Student List Report',
                    icon: 'fas fa-users',
                    description: 'Comprehensive list of all students with filters',
                    color: '#3498db',
                    action: 'studentReport'
                },
                {
                    id: 'academic-performance',
                    title: 'Academic Performance',
                    icon: 'fas fa-chart-line',
                    description: 'Student grades and performance analysis',
                    color: '#2ecc71',
                    action: 'academicReport'
                },
                {
                    id: 'centre-report',
                    title: 'Centre Report',
                    icon: 'fas fa-building',
                    description: 'Analysis by study centre',
                    color: '#9b59b6',
                    action: 'generateCentreReport'
                },
                {
                    id: 'executive-summary',
                    title: 'Executive Summary',
                    icon: 'fas fa-chart-pie',
                    description: 'Key statistics and overview',
                    color: '#f39c12',
                    action: 'generateSummaryReport'
                },
                {
                    id: 'transcript',
                    title: 'Student Transcript',
                    icon: 'fas fa-graduation-cap',
                    description: 'Generate official student transcripts',
                    color: '#1abc9c',
                    action: 'openTranscriptModal'
                },
                {
                    id: 'scheduled',
                    title: 'Scheduled Reports',
                    icon: 'fas fa-calendar-alt',
                    description: 'Automated and scheduled reports',
                    color: '#7f8c8d',
                    action: 'showScheduledReports'
                }
            ];
            
            let html = '';
            
            reports.forEach(report => {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="report-card" onclick="app.reports.${report.action}()" 
                             style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; 
                                    background: white; cursor: pointer; height: 100%;
                                    transition: transform 0.2s, box-shadow 0.2s;"
                             onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <div style="width: 45px; height: 45px; border-radius: 8px; 
                                            background: ${report.color}; display: flex; 
                                            align-items: center; justify-content: center; 
                                            margin-right: 12px;">
                                    <i class="${report.icon}" style="font-size: 20px; color: white;"></i>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; color: #2c3e50; font-size: 1rem;">${report.title}</h4>
                                    <p style="margin: 0; color: #7f8c8d; font-size: 0.85rem;">
                                        ${report.description}
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                                <span style="font-size: 0.75rem; color: #95a5a6;">
                                    <i class="fas fa-clock"></i> Click to generate
                                </span>
                                <button class="btn btn-sm" 
                                        style="background: ${report.color}; color: white; border: none;
                                               padding: 4px 12px; border-radius: 4px; font-size: 0.8rem;">
                                    Generate <i class="fas fa-arrow-right ml-1"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            reportsContainer.innerHTML = html;
            
            console.log('✅ Reports grid generated');
            
        } catch (error) {
            console.error('❌ Error generating reports grid:', error);
        }
    }
    
        // ==================== DATABASE METHODS ====================

    async getStudents() {
        try {
            if (this.db && this.db.getStudents) {
                const students = await this.db.getStudents();
                console.log(`📊 Loaded ${students.length} students from database`);
                return students;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                // Return sample data
                return this.getSampleStudents();
            }
        } catch (error) {
            console.error('❌ Error getting students:', error);
            return this.getSampleStudents();
        }
    }

    async getCourses() {
        try {
            if (this.db && this.db.getCourses) {
                const courses = await this.db.getCourses();
                console.log(`📊 Loaded ${courses.length} courses from database`);
                return courses;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                return this.getSampleCourses();
            }
        } catch (error) {
            console.error('❌ Error getting courses:', error);
            return this.getSampleCourses();
        }
    }

    async getMarks() {
        try {
            if (this.db && this.db.getMarks) {
                const marks = await this.db.getMarks();
                console.log(`📊 Loaded ${marks.length} marks from database`);
                return marks;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                return this.getSampleMarks();
            }
        } catch (error) {
            console.error('❌ Error getting marks:', error);
            return this.getSampleMarks();
        }
    }

    async getCentres() {
        try {
            if (this.db && this.db.getCentres) {
                const centres = await this.db.getCentres();
                console.log(`📊 Loaded ${centres.length} centres from database`);
                return centres;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                return this.getSampleCentres();
            }
        } catch (error) {
            console.error('❌ Error getting centres:', error);
            return this.getSampleCentres();
        }
    }

    async getCounties() {
        try {
            if (this.db && this.db.getCounties) {
                const counties = await this.db.getCounties();
                console.log(`📊 Loaded ${counties.length} counties from database`);
                return counties;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                return this.getSampleCounties();
            }
        } catch (error) {
            console.error('❌ Error getting counties:', error);
            return this.getSampleCounties();
        }
    }

    async getPrograms() {
        try {
            if (this.db && this.db.getPrograms) {
                const programs = await this.db.getPrograms();
                console.log(`📊 Loaded ${programs.length} programs from database`);
                return programs;
            } else {
                console.warn('⚠️ Database not available, using sample data');
                return this.getSamplePrograms();
            }
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            return this.getSamplePrograms();
        }
    }

    // ==================== SAMPLE DATA GENERATORS ====================

    getSampleStudents() {
        return [
            {
                id: 'ST001',
                name: 'John Mwangi',
                admission_number: 'TEE2023001',
                email: 'john.mwangi@example.com',
                phone: '+254712345678',
                centre_name: 'Nairobi Main',
                county: 'Nairobi',
                program: 'Certificate in Theology',
                intake_year: 2023,
                status: 'active',
                created_at: '2023-01-15'
            },
            {
                id: 'ST002',
                name: 'Sarah Akinyi',
                admission_number: 'TEE2023002',
                email: 'sarah.akinyi@example.com',
                phone: '+254723456789',
                centre_name: 'Kisumu Centre',
                county: 'Kisumu',
                program: 'Diploma in Biblical Studies',
                intake_year: 2023,
                status: 'active',
                created_at: '2023-02-20'
            },
            {
                id: 'ST003',
                name: 'David Omondi',
                admission_number: 'TEE2022001',
                email: 'david.omondi@example.com',
                phone: '+254734567890',
                centre_name: 'Mombasa Centre',
                county: 'Mombasa',
                program: 'Certificate in Theology',
                intake_year: 2022,
                status: 'graduated',
                created_at: '2022-03-10'
            },
            {
                id: 'ST004',
                name: 'Grace Wanjiku',
                admission_number: 'TEE2023003',
                email: 'grace.wanjiku@example.com',
                phone: '+254745678901',
                centre_name: 'Nakuru Centre',
                county: 'Nakuru',
                program: 'Diploma in Ministry',
                intake_year: 2023,
                status: 'active',
                created_at: '2023-03-05'
            },
            {
                id: 'ST005',
                name: 'Peter Kamau',
                admission_number: 'TEE2022002',
                email: 'peter.kamau@example.com',
                phone: '+254756789012',
                centre_name: 'Nairobi Main',
                county: 'Nairobi',
                program: 'Diploma in Biblical Studies',
                intake_year: 2022,
                status: 'graduated',
                created_at: '2022-04-15'
            }
        ];
    }

    getSampleCourses() {
        return [
            {
                id: 'C001',
                course_code: 'TEE101',
                course_name: 'Introduction to Theological Education',
                credits: 3,
                semester: 1,
                program: 'Certificate in Theology'
            },
            {
                id: 'C002',
                course_code: 'BIB101',
                course_name: 'Bible Study Methods',
                credits: 3,
                semester: 1,
                program: 'Certificate in Theology'
            },
            {
                id: 'C003',
                course_code: 'MIN101',
                course_name: 'Ministry Foundations',
                credits: 3,
                semester: 2,
                program: 'Certificate in Theology'
            },
            {
                id: 'C004',
                course_code: 'BIB201',
                course_name: 'Biblical Hermeneutics',
                credits: 3,
                semester: 1,
                program: 'Diploma in Biblical Studies'
            },
            {
                id: 'C005',
                course_code: 'THE201',
                course_name: 'Systematic Theology',
                credits: 3,
                semester: 2,
                program: 'Diploma in Biblical Studies'
            }
        ];
    }

    getSampleMarks() {
        return [
            {
                student_id: 'ST001',
                course_code: 'TEE101',
                marks: 85,
                grade: 'A',
                semester: 1,
                academic_year: 2023
            },
            {
                student_id: 'ST001',
                course_code: 'BIB101',
                marks: 78,
                grade: 'B+',
                semester: 1,
                academic_year: 2023
            },
            {
                student_id: 'ST002',
                course_code: 'TEE101',
                marks: 92,
                grade: 'A',
                semester: 1,
                academic_year: 2023
            },
            {
                student_id: 'ST003',
                course_code: 'TEE101',
                marks: 88,
                grade: 'A',
                semester: 1,
                academic_year: 2022
            },
            {
                student_id: 'ST003',
                course_code: 'BIB101',
                marks: 91,
                grade: 'A',
                semester: 1,
                academic_year: 2022
            }
        ];
    }

    getSampleCentres() {
        return [
            { id: 'C1', name: 'Nairobi Main', code: 'NRB', county: 'Nairobi', status: 'active' },
            { id: 'C2', name: 'Mombasa Centre', code: 'MBA', county: 'Mombasa', status: 'active' },
            { id: 'C3', name: 'Kisumu Centre', code: 'KSM', county: 'Kisumu', status: 'active' },
            { id: 'C4', name: 'Nakuru Centre', code: 'NKR', county: 'Nakuru', status: 'active' },
            { id: 'C5', name: 'Eldoret Centre', code: 'ELD', county: 'Uasin Gishu', status: 'active' }
        ];
    }

    getSampleCounties() {
        return [
            { id: 'CT1', name: 'Nairobi', code: 'NRB' },
            { id: 'CT2', name: 'Mombasa', code: 'MBA' },
            { id: 'CT3', name: 'Kisumu', code: 'KSM' },
            { id: 'CT4', name: 'Nakuru', code: 'NKR' },
            { id: 'CT5', name: 'Uasin Gishu', code: 'UG' },
            { id: 'CT6', name: 'Kiambu', code: 'KBU' },
            { id: 'CT7', name: 'Kakamega', code: 'KKG' },
            { id: 'CT8', name: 'Bungoma', code: 'BGM' }
        ];
    }

    getSamplePrograms() {
        return [
            { id: 'P1', name: 'Certificate in Theology', code: 'CERT-TH', duration: '1 year' },
            { id: 'P2', name: 'Diploma in Biblical Studies', code: 'DIP-BIB', duration: '2 years' },
            { id: 'P3', name: 'Diploma in Ministry', code: 'DIP-MIN', duration: '2 years' },
            { id: 'P4', name: 'Pastoral Certificate', code: 'CERT-PAS', duration: '1 year' },
            { id: 'P5', name: 'Christian Leadership', code: 'CERT-LDR', duration: '1 year' }
        ];
    }

    // ==================== DEBUG METHODS ====================

    async debugStudentData() {
        try {
            console.log('🔍 DEBUG: Checking student data...');
            
            // Check students data
            console.log(`Students loaded: ${this.students?.length || 0}`);
            if (this.students && this.students.length > 0) {
                console.log('First 3 students:', this.students.slice(0, 3));
                
                // Check fields
                const sampleStudent = this.students[0];
                console.log('Sample student fields:', Object.keys(sampleStudent));
                console.log('Sample student values:', sampleStudent);
            }
            
            // Check courses
            console.log(`Courses loaded: ${this.courses?.length || 0}`);
            
            // Check centres
            console.log(`Centres loaded: ${this.centres?.length || 0}`);
            
            // Check programs
            console.log(`Programs loaded: ${this.programs?.length || 0}`);
            
            // Check filters
            console.log('Current filters:', this.currentFilters);
            console.log('Selected filters:', this.selectedFilters);
            
        } catch (error) {
            console.error('❌ Debug error:', error);
        }
    }

    async debugDropdowns() {
        console.log('🔍 DEBUG: Checking dropdowns...');
        
        // Check if dropdown containers exist
        const dropdowns = [
            'centreFilterOptions',
            'countyFilterOptions',
            'programFilterOptions',
            'academicYear',
            'filterIntake',
            'filterCourse',
            'semester'
        ];
        
        dropdowns.forEach(id => {
            const element = document.getElementById(id);
            console.log(`${id}: ${element ? '✅ Found' : '❌ Not found'}`);
            if (element) {
                console.log(`  Type: ${element.tagName}, Options: ${element.options?.length || element.children?.length || 0}`);
            }
        });
    }

    // ==================== REPORT GENERATION METHODS ====================

    async studentReport() {
        try {
            console.log('📄 Generating student report...');
            this.showLoading(true);
            
            // Get filtered students
            const students = await this.getStudents();
            const filteredStudents = this.applyStudentFilters(students);
            
            if (filteredStudents.length === 0) {
                this.showToast('No students found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Generate report HTML
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="color: #2c3e50; margin-bottom: 5px;">Student List Report</h2>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Total Students: ${filteredStudents.length} |
                                    Filters: ${this.getFilterSummary()}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <img src="/api/placeholder/150/50" alt="TEE Logo" style="height: 50px;">
                                <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 0.9rem;">
                                    Theological Education Extension
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <table class="table table-striped table-hover" style="width: 100%;">
                        <thead style="background: #2c3e50; color: white;">
                            <tr>
                                <th style="padding: 10px;">Admission No.</th>
                                <th style="padding: 10px;">Student Name</th>
                                <th style="padding: 10px;">Program</th>
                                <th style="padding: 10px;">Centre</th>
                                <th style="padding: 10px;">County</th>
                                <th style="padding: 10px;">Intake Year</th>
                                <th style="padding: 10px;">Status</th>
                                <th style="padding: 10px;">Email</th>
                                <th style="padding: 10px;">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            filteredStudents.forEach((student, index) => {
                const rowColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                const statusBadge = student.status === 'active' ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-secondary">Graduated</span>';
                
                reportHTML += `
                    <tr style="background-color: ${rowColor};">
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.admission_number || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            <strong>${student.name || 'Unknown'}</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.program || 'Not assigned'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.centre_name || student.centre || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.county || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.intake_year || student.intake || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${statusBadge}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.email || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.phone || 'N/A'}
                        </td>
                    </tr>
                `;
            });
            
            reportHTML += `
                        </tbody>
                    </table>
                    
                    <div class="report-footer" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #7f8c8d; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <p><strong>Report Summary:</strong></p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>Active Students: ${filteredStudents.filter(s => s.status === 'active').length}</li>
                                    <li>Graduated: ${filteredStudents.filter(s => s.status === 'graduated').length}</li>
                                    <li>Generated by: ${this.getCurrentUser()}</li>
                                </ul>
                            </div>
                            <div style="text-align: right;">
                                <p>Page 1 of 1</p>
                                <p>Confidential - For TEE Use Only</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview modal
            this.previewReport(reportHTML, 'Student List Report');
            
            console.log(`✅ Student report generated with ${filteredStudents.length} students`);
            
        } catch (error) {
            console.error('❌ Error generating student report:', error);
            this.showToast('Error generating student report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async academicReport() {
        try {
            console.log('📊 Generating academic report...');
            this.showLoading(true);
            
            // Get students and marks
            const students = await this.getStudents();
            const marks = await this.getMarks();
            const courses = await this.getCourses();
            
            // Filter students
            const filteredStudents = this.applyStudentFilters(students);
            
            if (filteredStudents.length === 0) {
                this.showToast('No students found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Calculate academic statistics
            const studentPerformance = [];
            
            filteredStudents.forEach(student => {
                const studentMarks = marks.filter(m => m.student_id === student.id);
                const totalMarks = studentMarks.reduce((sum, mark) => sum + (mark.marks || 0), 0);
                const average = studentMarks.length > 0 ? totalMarks / studentMarks.length : 0;
                const coursesTaken = studentMarks.length;
                
                // Calculate grade points
                const gradePoints = studentMarks.map(mark => {
                    const grade = mark.grade;
                    const points = this.getGradePoints(grade);
                    return points * (courses.find(c => c.course_code === mark.course_code)?.credits || 3);
                });
                
                const totalGradePoints = gradePoints.reduce((sum, points) => sum + points, 0);
                const totalCredits = studentMarks.length * 3; // Assuming 3 credits per course
                const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
                
                studentPerformance.push({
                    student,
                    average,
                    coursesTaken,
                    gpa: gpa.toFixed(2),
                    totalMarks
                });
            });
            
            // Sort by GPA (highest first)
            studentPerformance.sort((a, b) => b.gpa - a.gpa);
            
            // Generate report HTML
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #2ecc71; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="color: #2c3e50; margin-bottom: 5px;">Academic Performance Report</h2>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Students: ${studentPerformance.length} |
                                    Filters: ${this.getFilterSummary()}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <img src="/api/placeholder/150/50" alt="TEE Logo" style="height: 50px;">
                                <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 0.9rem;">
                                    Theological Education Extension
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="color: #2ecc71; margin: 0;">${studentPerformance.length}</h4>
                                <p style="color: #7f8c8d; margin: 5px 0 0 0;">Students Analyzed</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="color: #3498db; margin: 0;">${this.calculateAverageGPA(studentPerformance).toFixed(2)}</h4>
                                <p style="color: #7f8c8d; margin: 5px 0 0 0;">Average GPA</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="color: #e74c3c; margin: 0;">${this.countStudentsBelowGPA(studentPerformance, 2.0)}</h4>
                                <p style="color: #7f8c8d; margin: 5px 0 0 0;">Below 2.0 GPA</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="color: #f39c12; margin: 0;">${this.countTopPerformers(studentPerformance)}</h4>
                                <p style="color: #7f8c8d; margin: 5px 0 0 0;">Top Performers (3.5+)</p>
                            </div>
                        </div>
                    </div>
                    
                    <table class="table table-striped table-hover" style="width: 100%;">
                        <thead style="background: #2c3e50; color: white;">
                            <tr>
                                <th style="padding: 10px;">Rank</th>
                                <th style="padding: 10px;">Student Name</th>
                                <th style="padding: 10px;">Admission No.</th>
                                <th style="padding: 10px;">Program</th>
                                <th style="padding: 10px;">Centre</th>
                                <th style="padding: 10px;">GPA</th>
                                <th style="padding: 10px;">Avg. Marks</th>
                                <th style="padding: 10px;">Courses Taken</th>
                                <th style="padding: 10px;">Performance</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            studentPerformance.forEach((performance, index) => {
                const student = performance.student;
                const gpa = parseFloat(performance.gpa);
                const performanceLevel = this.getPerformanceLevel(gpa);
                
                let performanceColor, performanceText;
                switch(performanceLevel) {
                    case 'excellent':
                        performanceColor = '#27ae60';
                        performanceText = 'Excellent';
                        break;
                    case 'good':
                        performanceColor = '#2ecc71';
                        performanceText = 'Good';
                        break;
                    case 'average':
                        performanceColor = '#f39c12';
                        performanceText = 'Average';
                        break;
                    case 'poor':
                        performanceColor = '#e74c3c';
                        performanceText = 'Needs Improvement';
                        break;
                    default:
                        performanceColor = '#7f8c8d';
                        performanceText = 'No Data';
                }
                
                reportHTML += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            <strong>#${index + 1}</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            <strong>${student.name || 'Unknown'}</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.admission_number || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.program || 'Not assigned'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${student.centre_name || student.centre || 'N/A'}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            <strong style="color: ${performanceColor};">${performance.gpa}</strong>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${performance.average.toFixed(1)}%
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            ${performance.coursesTaken}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                            <span style="background-color: ${performanceColor}20; color: ${performanceColor}; 
                                   padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">
                                ${performanceText}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            reportHTML += `
                        </tbody>
                    </table>
                    
                    <div class="report-footer" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #7f8c8d; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <p><strong>GPA Scale:</strong></p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>3.5 - 4.0: Excellent</li>
                                    <li>3.0 - 3.49: Good</li>
                                    <li>2.0 - 2.99: Average</li>
                                    <li>Below 2.0: Needs Improvement</li>
                                </ul>
                            </div>
                            <div style="text-align: right;">
                                <p>Generated by: ${this.getCurrentUser()}</p>
                                <p>Confidential - For TEE Use Only</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview modal
            this.previewReport(reportHTML, 'Academic Performance Report');
            
            console.log(`✅ Academic report generated for ${studentPerformance.length} students`);
            
        } catch (error) {
            console.error('❌ Error generating academic report:', error);
            this.showToast('Error generating academic report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateCentreReport() {
        try {
            console.log('🏢 Generating centre report...');
            this.showLoading(true);
            
            const students = await this.getStudents();
            const centres = await this.getCentres();
            
            // Filter centres based on selection
            let filteredCentres = centres;
            const selectedCentres = this.selectedFilters.centre;
            if (selectedCentres.length > 0 && !selectedCentres.includes('all')) {
                filteredCentres = centres.filter(centre => 
                    selectedCentres.includes(centre.name || centre)
                );
            }
            
            // Calculate centre statistics
            const centreStats = filteredCentres.map(centre => {
                const centreName = centre.name || centre;
                const centreStudents = students.filter(s => 
                    (s.centre_name || s.centre) === centreName
                );
                
                const filteredCentreStudents = this.applyStudentFilters(centreStudents);
                
                return {
                    centre: centreName,
                    county: centre.county || 'N/A',
                    totalStudents: filteredCentreStudents.length,
                    activeStudents: filteredCentreStudents.filter(s => s.status === 'active').length,
                    graduated: filteredCentreStudents.filter(s => s.status === 'graduated').length,
                    programs: [...new Set(filteredCentreStudents.map(s => s.program).filter(Boolean))],
                    intakeYears: [...new Set(filteredCentreStudents.map(s => s.intake_year || s.intake).filter(Boolean))]
                };
            });
            
            // Filter out centres with no students (if all filter is selected)
            const validCentreStats = centreStats.filter(stat => stat.totalStudents > 0);
            
            if (validCentreStats.length === 0) {
                this.showToast('No centre data found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Generate report HTML
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #9b59b6; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="color: #2c3e50; margin-bottom: 5px;">Centre Performance Report</h2>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Centres: ${validCentreStats.length} |
                                    Filters: ${this.getFilterSummary()}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <img src="/api/placeholder/150/50" alt="TEE Logo" style="height: 50px;">
                                <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 0.9rem;">
                                    Theological Education Extension
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        ${validCentreStats.map(stat => `
                            <div class="col-md-4 mb-3">
                                <div style="background: #f8f9fa; border-left: 4px solid #9b59b6; padding: 15px; border-radius: 4px; height: 100%;">
                                    <h5 style="color: #2c3e50; margin-bottom: 10px;">${stat.centre}</h5>
                                    <p style="color: #7f8c8d; margin: 0 0 8px 0;">
                                        <i class="fas fa-map-marker-alt"></i> ${stat.county}
                                    </p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div>
                                            <h6 style="color: #3498db; margin: 0;">${stat.totalStudents}</h6>
                                            <small style="color: #7f8c8d;">Total Students</small>
                                        </div>
                                        <div>
                                            <h6 style="color: #2ecc71; margin: 0;">${stat.activeStudents}</h6>
                                            <small style="color: #7f8c8d;">Active</small>
                                        </div>
                                        <div>
                                            <h6 style="color: #f39c12; margin: 0;">${stat.graduated}</h6>
                                            <small style="color: #7f8c8d;">Graduated</small>
                                        </div>
                                        <div>
                                            <h6 style="color: #9b59b6; margin: 0;">${stat.programs.length}</h6>
                                            <small style="color: #7f8c8d;">Programs</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <h4 style="color: #2c3e50; margin-bottom: 15px;">Centre Comparison</h4>
                            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;">
                                <canvas id="centreChart" height="250"></canvas>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <h4 style="color: #2c3e50; margin-bottom: 15px;">Key Metrics</h4>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                <div style="margin-bottom: 15px;">
                                    <p style="color: #7f8c8d; margin: 0 0 5px 0;">Total Students Across Centres</p>
                                    <h3 style="color: #2c3e50; margin: 0;">
                                        ${validCentreStats.reduce((sum, stat) => sum + stat.totalStudents, 0)}
                                    </h3>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <p style="color: #7f8c8d; margin: 0 0 5px 0;">Average Students per Centre</p>
                                    <h3 style="color: #2c3e50; margin: 0;">
                                        ${Math.round(validCentreStats.reduce((sum, stat) => sum + stat.totalStudents, 0) / validCentreStats.length)}
                                    </h3>
                                </div>
                                <div>
                                    <p style="color: #7f8c8d; margin: 0 0 5px 0;">Centre with Most Students</p>
                                    <h4 style="color: #9b59b6; margin: 0;">
                                        ${validCentreStats.reduce((max, stat) => 
                                            stat.totalStudents > max.totalStudents ? stat : max, 
                                            {totalStudents: 0, centre: 'None'}
                                        ).centre}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-footer" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #7f8c8d; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <p><strong>Report Summary:</strong></p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>Total Centres Analyzed: ${validCentreStats.length}</li>
                                    <li>Total Students: ${validCentreStats.reduce((sum, stat) => sum + stat.totalStudents, 0)}</li>
                                    <li>Generated by: ${this.getCurrentUser()}</li>
                                </ul>
                            </div>
                            <div style="text-align: right;">
                                <p>Page 1 of 1</p>
                                <p>Confidential - For TEE Use Only</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview modal
            this.previewReport(reportHTML, 'Centre Performance Report');
            
            // Initialize chart after modal is shown
            setTimeout(() => {
                this.renderCentreChart(validCentreStats);
            }, 500);
            
            console.log(`✅ Centre report generated for ${validCentreStats.length} centres`);
            
        } catch (error) {
            console.error('❌ Error generating centre report:', error);
            this.showToast('Error generating centre report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateSummaryReport() {
        try {
            console.log('📈 Generating summary report...');
            this.showLoading(true);
            
            const students = await this.getStudents();
            const marks = await this.getMarks();
            const centres = await this.getCentres();
            const programs = await this.getPrograms();
            
            const filteredStudents = this.applyStudentFilters(students);
            
            if (filteredStudents.length === 0) {
                this.showToast('No data found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Calculate comprehensive statistics
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            const graduationRate = totalStudents > 0 ? (graduatedStudents / totalStudents * 100).toFixed(1) : 0;
            
            // Program distribution
            const programDistribution = {};
            filteredStudents.forEach(student => {
                const program = student.program || 'Unknown';
                programDistribution[program] = (programDistribution[program] || 0) + 1;
            });
            
            // Centre distribution
            const centreDistribution = {};
            filteredStudents.forEach(student => {
                const centre = student.centre_name || student.centre || 'Unknown';
                centreDistribution[centre] = (centreDistribution[centre] || 0) + 1;
            });
            
            // County distribution
            const countyDistribution = {};
            filteredStudents.forEach(student => {
                const county = student.county || 'Unknown';
                countyDistribution[county] = (countyDistribution[county] || 0) + 1;
            });
            
            // Academic performance
            const studentMarks = filteredStudents.map(student => {
                const studentMarkData = marks.filter(m => m.student_id === student.id);
                const average = studentMarkData.length > 0 ? 
                    studentMarkData.reduce((sum, m) => sum + (m.marks || 0), 0) / studentMarkData.length : 0;
                return average;
            }).filter(avg => avg > 0);
            
            const avgMarks = studentMarks.length > 0 ? 
                (studentMarks.reduce((sum, avg) => sum + avg, 0) / studentMarks.length).toFixed(1) : 0;
            
            // Intake year distribution
            const intakeDistribution = {};
            filteredStudents.forEach(student => {
                const intakeYear = student.intake_year || student.intake || 'Unknown';
                intakeDistribution[intakeYear] = (intakeDistribution[intakeYear] || 0) + 1;
            });
            
            // Generate report HTML
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #f39c12; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="color: #2c3e50; margin-bottom: 10px;">Executive Summary Report</h1>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Period: ${this.getDateRange()} |
                                    Filters: ${this.getFilterSummary()}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <img src="/api/placeholder/150/50" alt="TEE Logo" style="height: 50px;">
                                <h3 style="color: #2c3e50; margin: 5px 0 0 0;">Theological Education Extension</h3>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Executive Overview -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <div style="background: linear-gradient(135deg, #2c3e50, #4a6491); color: white; padding: 20px; border-radius: 8px;">
                                <h3 style="margin: 0 0 10px 0;">Key Performance Indicators</h3>
                                <div class="row">
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${totalStudents}</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Total Students</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${activeStudents}</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Active Students</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${graduationRate}%</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Graduation Rate</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${avgMarks}%</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Avg. Marks</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <!-- Program Distribution -->
                        <div class="col-md-6 mb-4">
                            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; height: 100%;">
                                <h4 style="color: #2c3e50; margin-bottom: 15px;">Program Distribution</h4>
                                <canvas id="programChart" height="200"></canvas>
                            </div>
                        </div>
                        
                        <!-- Centre Performance -->
                        <div class="col-md-6 mb-4">
                            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; height: 100%;">
                                <h4 style="color: #2c3e50; margin-bottom: 15px;">Top 5 Centres</h4>
                                ${this.generateTopCentresTable(centreDistribution)}
                            </div>
                        </div>
                        
                        <!-- County Distribution -->
                        <div class="col-md-6 mb-4">
                            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; height: 100%;">
                                <h4 style="color: #2c3e50; margin-bottom: 15px;">Geographical Distribution</h4>
                                <canvas id="countyChart" height="200"></canvas>
                            </div>
                        </div>
                        
                        <!-- Intake Trends -->
                        <div class="col-md-6 mb-4">
                            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; height: 100%;">
                                <h4 style="color: #2c3e50; margin-bottom: 15px;">Intake Trends</h4>
                                <canvas id="intakeChart" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recommendations -->
                    <div class="row">
                        <div class="col-12">
                            <div style="background: #e8f4fc; border-left: 4px solid #3498db; padding: 20px; border-radius: 4px;">
                                <h4 style="color: #2c3e50; margin-bottom: 15px;">
                                    <i class="fas fa-lightbulb"></i> Key Recommendations
                                </h4>
                                <div class="row">
                                    <div class="col-md-6">
                                        <ul style="color: #2c3e50;">
                                            ${this.generateRecommendations(filteredStudents, centres, programs)}
                                        </ul>
                                    </div>
                                    <div class="col-md-6">
                                        <div style="background: white; padding: 15px; border-radius: 4px;">
                                            <h5 style="color: #2c3e50;">Next Steps</h5>
                                            <ol style="color: #7f8c8d;">
                                                <li>Review underperforming centres</li>
                                                <li>Enhance student support programs</li>
                                                <li>Expand successful programs to new centres</li>
                                                <li>Implement retention strategies</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-footer" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #7f8c8d; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <p><strong>Report Prepared For:</strong></p>
                                <p style="color: #2c3e50; margin: 0;">Theological Education Extension Management</p>
                                <p style="margin: 5px 0 0 0;">Date: ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div style="text-align: right;">
                                <p>Generated by: ${this.getCurrentUser()}</p>
                                <p>Confidential - Executive Use Only</p>
                                <p style="color: #f39c12; margin: 5px 0 0 0;">
                                    <i class="fas fa-exclamation-circle"></i> Report valid for 30 days
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview modal
            this.previewReport(reportHTML, 'Executive Summary Report');
            
            // Initialize charts after modal is shown
            setTimeout(() => {
                this.renderSummaryCharts(programDistribution, countyDistribution, intakeDistribution);
            }, 500);
            
            console.log('✅ Summary report generated');
            
        } catch (error) {
            console.error('❌ Error generating summary report:', error);
            this.showToast('Error generating summary report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== HELPER METHODS FOR REPORTS ====================

    getFilterSummary() {
        const filters = [];
        
        // Year filter
        if (this.currentFilters.year && this.currentFilters.year !== 'all') {
            filters.push(`Year: ${this.currentFilters.year}`);
        }
        
        // Program filter
        if (this.selectedFilters.program.length > 0 && !this.selectedFilters.program.includes('all')) {
            if (this.selectedFilters.program.length <= 2) {
                filters.push(`Programs: ${this.selectedFilters.program.join(', ')}`);
            } else {
                filters.push(`Programs: ${this.selectedFilters.program.length} selected`);
            }
        }
        
        // Centre filter
        if (this.selectedFilters.centre.length > 0 && !this.selectedFilters.centre.includes('all')) {
            if (this.selectedFilters.centre.length <= 2) {
                filters.push(`Centres: ${this.selectedFilters.centre.join(', ')}`);
            } else {
                filters.push(`Centres: ${this.selectedFilters.centre.length} selected`);
            }
        }
        
        // County filter
        if (this.selectedFilters.county.length > 0 && !this.selectedFilters.county.includes('all')) {
            if (this.selectedFilters.county.length <= 2) {
                filters.push(`Counties: ${this.selectedFilters.county.join(', ')}`);
            } else {
                filters.push(`Counties: ${this.selectedFilters.county.length} selected`);
            }
        }
        
        // Date filters
        if (this.currentFilters.dateFrom || this.currentFilters.dateTo) {
            const dateRange = [];
            if (this.currentFilters.dateFrom) dateRange.push(`From: ${this.formatDate(this.currentFilters.dateFrom)}`);
            if (this.currentFilters.dateTo) dateRange.push(`To: ${this.formatDate(this.currentFilters.dateTo)}`);
            filters.push(`Date: ${dateRange.join(' ')}`);
        }
        
        return filters.length > 0 ? filters.join(' | ') : 'All (No filters)';
    }

    getDateRange() {
        const from = this.currentFilters.dateFrom ? 
            this.formatDate(this.currentFilters.dateFrom) : 'Beginning';
        const to = this.currentFilters.dateTo ? 
            this.formatDate(this.currentFilters.dateTo) : 'Present';
        
        return `${from} - ${to}`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    getCurrentUser() {
        // In a real app, this would come from authentication
        return 'System Administrator';
    }

    getGradePoints(grade) {
        const gradeMap = {
            'A': 4.0,
            'A-': 3.7,
            'B+': 3.3,
            'B': 3.0,
            'B-': 2.7,
            'C+': 2.3,
            'C': 2.0,
            'C-': 1.7,
            'D+': 1.3,
            'D': 1.0,
            'F': 0.0
        };
        
        return gradeMap[grade] || 0.0;
    }

    getPerformanceLevel(gpa) {
        if (gpa >= 3.5) return 'excellent';
        if (gpa >= 3.0) return 'good';
        if (gpa >= 2.0) return 'average';
        return 'poor';
    }

    calculateAverageGPA(performances) {
        if (performances.length === 0) return 0;
        const total = performances.reduce((sum, perf) => sum + parseFloat(perf.gpa || 0), 0);
        return total / performances.length;
    }

    countStudentsBelowGPA(performances, threshold) {
        return performances.filter(perf => parseFloat(perf.gpa || 0) < threshold).length;
    }

    countTopPerformers(performances) {
        return performances.filter(perf => parseFloat(perf.gpa || 0) >= 3.5).length;
    }

    generateTopCentresTable(centreDistribution) {
        // Convert to array and sort by count
        const topCentres = Object.entries(centreDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (topCentres.length === 0) {
            return '<p>No centre data available</p>';
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        
        topCentres.forEach(([centre, count], index) => {
            const percentage = (count / Object.values(centreDistribution).reduce((a, b) => a + b, 0) * 100).toFixed(1);
            const rankColors = ['#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c'];
            const rankColor = rankColors[index] || '#7f8c8d';
            
            html += `
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 24px; height: 24px; background: ${rankColor}; color: white; 
                                 border-radius: 4px; display: flex; align-items: center; 
                                 justify-content: center; margin-right: 10px; font-size: 0.85rem;">
                                ${index + 1}
                            </div>
                            <div style="flex: 1;">
                                <strong style="color: #2c3e50;">${centre}</strong>
                                <div style="display: flex; align-items: center; margin-top: 2px;">
                                    <div style="flex: 1; height: 6px; background: #ecf0f1; border-radius: 3px; margin-right: 10px;">
                                        <div style="height: 100%; width: ${percentage}%; background: ${rankColor}; border-radius: 3px;"></div>
                                    </div>
                                    <span style="color: #7f8c8d; font-size: 0.85rem;">
                                        ${count} students (${percentage}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += '</table>';
        return html;
    }

    generateRecommendations(students, centres, programs) {
        const recommendations = [];
        
        // Check student distribution across centres
        const centreCounts = {};
        students.forEach(student => {
            const centre = student.centre_name || student.centre || 'Unknown';
            centreCounts[centre] = (centreCounts[centre] || 0) + 1;
        });
        
        // Find underperforming centres (less than 10 students)
        const underperformingCentres = Object.entries(centreCounts)
            .filter(([_, count]) => count < 10)
            .map(([centre]) => centre);
        
        if (underperformingCentres.length > 0) {
            recommendations.push(
                `<li><strong>Centre Optimization:</strong> Consider consolidating or enhancing support for centres with low enrollment (${underperformingCentres.join(', ')})</li>`
            );
        }
        
        // Check program popularity
        const programCounts = {};
        students.forEach(student => {
            const program = student.program || 'Unknown';
            programCounts[program] = (programCounts[program] || 0) + 1;
        });
        
        const popularPrograms = Object.entries(programCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([program]) => program);
        
        if (popularPrograms.length > 0) {
            recommendations.push(
                `<li><strong>Program Expansion:</strong> Consider expanding ${popularPrograms.join(' and ')} to more centres based on popularity</li>`
            );
        }
        
        // Check graduation rate
        const graduated = students.filter(s => s.status === 'graduated').length;
        const graduationRate = (graduated / students.length * 100).toFixed(1);
        
        if (parseFloat(graduationRate) < 50) {
            recommendations.push(
                `<li><strong>Retention Strategy:</strong> Implement enhanced student support programs to improve graduation rate (current: ${graduationRate}%)</li>`
            );
        }
        
        // Add general recommendations
        if (recommendations.length === 0) {
            recommendations.push(
                `<li><strong>Growth Opportunity:</strong> Consider expanding to new counties based on current success</li>`
            );
        }
        
        return recommendations.join('');
    }

    // ==================== CHART METHODS ====================

    renderCentreChart(centreStats) {
        try {
            const canvas = document.getElementById('centreChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.centreChart) {
                this.charts.centreChart.destroy();
            }
            
            const centres = centreStats.map(stat => stat.centre);
            const studentCounts = centreStats.map(stat => stat.totalStudents);
            const activeCounts = centreStats.map(stat => stat.activeStudents);
            const graduatedCounts = centreStats.map(stat => stat.graduated);
            
            this.charts.centreChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: centres,
                    datasets: [
                        {
                            label: 'Total Students',
                            data: studentCounts,
                            backgroundColor: '#3498db',
                            borderColor: '#2980b9',
                            borderWidth: 1
                        },
                        {
                            label: 'Active Students',
                            data: activeCounts,
                            backgroundColor: '#2ecc71',
                            borderColor: '#27ae60',
                            borderWidth: 1
                        },
                        {
                            label: 'Graduated',
                            data: graduatedCounts,
                            backgroundColor: '#f39c12',
                            borderColor: '#d35400',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Students'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Study Centres'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Student Distribution by Centre'
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Error rendering centre chart:', error);
        }
    }

    renderSummaryCharts(programDistribution, countyDistribution, intakeDistribution) {
        try {
            // Program Distribution Pie Chart
            const programCanvas = document.getElementById('programChart');
            if (programCanvas) {
                const programCtx = programCanvas.getContext('2d');
                
                const programLabels = Object.keys(programDistribution);
                const programData = Object.values(programDistribution);
                
                // Destroy existing chart
                if (this.charts.programChart) {
                    this.charts.programChart.destroy();
                }
                
                this.charts.programChart = new Chart(programCtx, {
                    type: 'doughnut',
                    data: {
                        labels: programLabels,
                        datasets: [{
                            data: programData,
                            backgroundColor: [
                                '#3498db', '#2ecc71', '#9b59b6', '#f39c12', 
                                '#e74c3c', '#1abc9c', '#34495e', '#7f8c8d'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                            },
                            title: {
                                display: true,
                                text: 'Student Enrollment by Program'
                            }
                        }
                    }
                });
            }
            
            // County Distribution Bar Chart
            const countyCanvas = document.getElementById('countyChart');
            if (countyCanvas) {
                const countyCtx = countyCanvas.getContext('2d');
                
                // Get top 8 counties
                const topCounties = Object.entries(countyDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8);
                
                const countyLabels = topCounties.map(([county]) => county);
                const countyData = topCounties.map(([_, count]) => count);
                
                // Destroy existing chart
                if (this.charts.countyChart) {
                    this.charts.countyChart.destroy();
                }
                
                this.charts.countyChart = new Chart(countyCtx, {
                    type: 'bar',
                    data: {
                        labels: countyLabels,
                        datasets: [{
                            label: 'Number of Students',
                            data: countyData,
                            backgroundColor: '#1abc9c',
                            borderColor: '#16a085',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Students'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Counties'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Geographical Distribution (Top 8 Counties)'
                            }
                        }
                    }
                });
            }
            
            // Intake Trends Line Chart
            const intakeCanvas = document.getElementById('intakeChart');
            if (intakeCanvas) {
                const intakeCtx = intakeCanvas.getContext('2d');
                
                // Sort intake years
                const sortedIntakes = Object.entries(intakeDistribution)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b));
                
                const intakeLabels = sortedIntakes.map(([year]) => year);
                const intakeData = sortedIntakes.map(([_, count]) => count);
                
                // Destroy existing chart
                if (this.charts.intakeChart) {
                    this.charts.intakeChart.destroy();
                }
                
                this.charts.intakeChart = new Chart(intakeCtx, {
                    type: 'line',
                    data: {
                        labels: intakeLabels,
                        datasets: [{
                            label: 'Number of Students',
                            data: intakeData,
                            backgroundColor: 'rgba(52, 152, 219, 0.2)',
                            borderColor: '#3498db',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Students'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Intake Year'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Student Enrollment Trends'
                            }
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error rendering summary charts:', error);
        }
    }

    // ==================== TRANSCRIPT METHODS ====================

    createTranscriptModal() {
        // Check if modal already exists
        if (document.getElementById('transcriptModal')) return;
        
        const modalHTML = `
            <div class="modal fade" id="transcriptModal" tabindex="-1" aria-labelledby="transcriptModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="transcriptModalLabel">
                                <i class="fas fa-graduation-cap me-2"></i>Generate Student Transcript
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <!-- Student Search Section -->
                                <div class="col-md-5">
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; height: 100%;">
                                        <h6 class="mb-3"><i class="fas fa-search me-2"></i>Find Student</h6>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">Search by Name or Admission Number</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="transcriptSearch" 
                                                       placeholder="Enter student name or admission number..." 
                                                       onkeyup="app.reports.searchTranscriptStudents()">
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <i class="fas fa-search"></i>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Quick Filters -->
                                        <div class="row mb-3">
                                            <div class="col-6">
                                                <label class="form-label">Centre</label>
                                                <select class="form-select form-select-sm" id="transcriptModalCentreFilter">
                                                    <option value="all">All Centres</option>
                                                </select>
                                            </div>
                                            <div class="col-6">
                                                <label class="form-label">Program</label>
                                                <select class="form-select form-select-sm" id="transcriptModalProgramFilter">
                                                    <option value="all">All Programs</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <!-- Student List -->
                                        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px;">
                                            <div id="transcriptStudentList" class="list-group list-group-flush">
                                                <!-- Student list will be populated here -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Selected Student Info -->
                                <div class="col-md-7">
                                    <div id="selectedStudentInfo" style="display: none;">
                                        <h5>Selected Student</h5>
                                        <div class="card mb-3">
                                            <div class="card-body">
                                                <div id="selectedStudentDetails">
                                                    <!-- Student details will be shown here -->
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <h5>Transcript Options</h5>
                                        <div class="card">
                                            <div class="card-body">
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <label class="form-label">Include Grades From</label>
                                                        <select class="form-select" id="transcriptStartYear">
                                                            <option value="all">All Years</option>
                                                            ${this.generateYearOptions()}
                                                        </select>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">To</label>
                                                        <select class="form-select" id="transcriptEndYear">
                                                            <option value="all">All Years</option>
                                                            ${this.generateYearOptions()}
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                <div class="form-check mb-3">
                                                    <input class="form-check-input" type="checkbox" id="includeSemesterBreakdown" checked>
                                                    <label class="form-check-label" for="includeSemesterBreakdown">
                                                        Include semester breakdown
                                                    </label>
                                                </div>
                                                
                                                <div class="form-check mb-3">
                                                    <input class="form-check-input" type="checkbox" id="includeGPA" checked>
                                                    <label class="form-check-label" for="includeGPA">
                                                        Include GPA calculation
                                                    </label>
                                                </div>
                                                
                                                <div class="form-check mb-3">
                                                    <input class="form-check-input" type="checkbox" id="includeSignature" checked>
                                                    <label class="form-check-label" for="includeSignature">
                                                        Include official signature
                                                    </label>
                                                </div>
                                                
                                                <div class="d-grid gap-2">
                                                    <button class="btn btn-primary" onclick="app.reports.generateTranscript()">
                                                        <i class="fas fa-file-pdf me-2"></i>Generate Transcript
                                                    </button>
                                                    <button class="btn btn-outline-primary" onclick="app.reports.previewTranscript()">
                                                        <i class="fas fa-eye me-2"></i>Preview Transcript
                                                    </button>
                                                    <button class="btn btn-outline-secondary" onclick="app.reports.clearSelectedStudent()">
                                                        <i class="fas fa-times me-2"></i>Clear Selection
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div id="noStudentSelected" style="text-align: center; padding: 40px 20px;">
                                        <i class="fas fa-user-graduate" style="font-size: 4rem; color: #dee2e6; margin-bottom: 20px;"></i>
                                        <h5>No Student Selected</h5>
                                        <p class="text-muted">Search and select a student from the list to generate their transcript.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-outline-primary" onclick="app.reports.loadSampleTranscript()">
                                <i class="fas fa-magic me-2"></i>Load Sample Transcript
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        console.log('✅ Transcript modal created');
    }

    generateYearOptions() {
        let options = '';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 10; year--) {
            options += `<option value="${year}">${year}</option>`;
        }
        return options;
    }

    async openTranscriptModal() {
        try {
            console.log('🎓 Opening transcript modal...');
            
            // Initialize modal if not already done
            this.createTranscriptModal();
            
            // Load students for the list
            await this.loadTranscriptStudents();
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('transcriptModal'));
            modal.show();
            
            // Update selected filters
            this.populateModalFilters();
            
            console.log('✅ Transcript modal opened');
            
        } catch (error) {
            console.error('❌ Error opening transcript modal:', error);
            this.showToast('Error opening transcript modal', 'error');
        }
    }

    async loadTranscriptStudents() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const studentList = document.getElementById('transcriptStudentList');
            
            if (!studentList) return;
            
            if (students.length === 0) {
                studentList.innerHTML = `
                    <div class="list-group-item text-center text-muted">
                        <i class="fas fa-users-slash fa-2x mb-2"></i>
                        <p>No students found in database</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            students.forEach((student, index) => {
                const statusBadge = student.status === 'active' ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-secondary">Graduated</span>';
                
                html += `
                    <a href="#" class="list-group-item list-group-item-action" 
                       onclick="app.reports.selectStudentForTranscript('${student.id}')"
                       style="border-left: 4px solid ${index % 2 === 0 ? '#3498db' : '#2ecc71'};">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${student.name || 'Unknown'}</h6>
                                <small class="text-muted">
                                    ${student.admission_number || 'N/A'} | 
                                    ${student.program || 'Not assigned'}
                                </small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="mt-2">
                            <small>
                                <i class="fas fa-building me-1"></i>${student.centre_name || student.centre || 'N/A'} |
                                <i class="fas fa-calendar me-1"></i>Intake: ${student.intake_year || student.intake || 'N/A'}
                            </small>
                        </div>
                    </a>
                `;
            });
            
            studentList.innerHTML = html;
            
            console.log(`✅ Loaded ${students.length} students for transcript selection`);
            
        } catch (error) {
            console.error('❌ Error loading transcript students:', error);
        }
    }

    async searchTranscriptStudents() {
        try {
            const searchTerm = document.getElementById('transcriptSearch').value.toLowerCase();
            const centreFilter = document.getElementById('transcriptModalCentreFilter')?.value;
            const programFilter = document.getElementById('transcriptModalProgramFilter')?.value;
            
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            const filteredStudents = students.filter(student => {
                // Text search
                const matchesSearch = searchTerm === '' || 
                    (student.name && student.name.toLowerCase().includes(searchTerm)) ||
                    (student.admission_number && student.admission_number.toLowerCase().includes(searchTerm));
                
                // Centre filter
                const matchesCentre = centreFilter === 'all' || 
                    (student.centre_name && student.centre_name === centreFilter) ||
                    (student.centre && student.centre === centreFilter);
                
                // Program filter
                const matchesProgram = programFilter === 'all' || 
                    student.program === programFilter;
                
                return matchesSearch && matchesCentre && matchesProgram;
            });
            
            const studentList = document.getElementById('transcriptStudentList');
            if (!studentList) return;
            
            if (filteredStudents.length === 0) {
                studentList.innerHTML = `
                    <div class="list-group-item text-center text-muted">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <p>No students match your search criteria</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            filteredStudents.forEach((student, index) => {
                const statusBadge = student.status === 'active' ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-secondary">Graduated</span>';
                
                html += `
                    <a href="#" class="list-group-item list-group-item-action" 
                       onclick="app.reports.selectStudentForTranscript('${student.id}')"
                       style="border-left: 4px solid ${index % 2 === 0 ? '#3498db' : '#2ecc71'};">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${student.name || 'Unknown'}</h6>
                                <small class="text-muted">
                                    ${student.admission_number || 'N/A'} | 
                                    ${student.program || 'Not assigned'}
                                </small>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="mt-2">
                            <small>
                                <i class="fas fa-building me-1"></i>${student.centre_name || student.centre || 'N/A'} |
                                <i class="fas fa-calendar me-1"></i>Intake: ${student.intake_year || student.intake || 'N/A'}
                            </small>
                        </div>
                    </a>
                `;
            });
            
            studentList.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Error searching transcript students:', error);
        }
    }

    selectStudentForTranscript(studentId) {
        try {
            const student = this.students.find(s => s.id === studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            this.selectedStudentForTranscript = student;
            this.displaySelectedStudentInfo();
            
            console.log(`✅ Selected student for transcript: ${student.name}`);
            
        } catch (error) {
            console.error('❌ Error selecting student:', error);
            this.showToast('Error selecting student', 'error');
        }
    }

    displaySelectedStudentInfo() {
        const infoContainer = document.getElementById('selectedStudentInfo');
        const noSelectionContainer = document.getElementById('noStudentSelected');
        const detailsContainer = document.getElementById('selectedStudentDetails');
        
        if (!infoContainer || !noSelectionContainer || !detailsContainer) return;
        
        if (this.selectedStudentForTranscript) {
            const student = this.selectedStudentForTranscript;
            const statusBadge = student.status === 'active' ? 
                '<span class="badge bg-success">Active</span>' : 
                '<span class="badge bg-secondary">Graduated</span>';
            
            detailsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-8">
                        <h4>${student.name || 'Unknown'}</h4>
                        <p class="mb-1">
                            <strong>Admission No.:</strong> ${student.admission_number || 'N/A'}
                        </p>
                        <p class="mb-1">
                            <strong>Program:</strong> ${student.program || 'Not assigned'}
                        </p>
                        <p class="mb-1">
                            <strong>Centre:</strong> ${student.centre_name || student.centre || 'N/A'}
                        </p>
                        <p class="mb-0">
                            <strong>Status:</strong> ${statusBadge}
                        </p>
                    </div>
                    <div class="col-md-4">
                        <div style="text-align: center;">
                            <div style="width: 80px; height: 80px; background: #e9ecef; border-radius: 50%; 
                                 display: inline-flex; align-items: center; justify-content: center;
                                 margin-bottom: 10px;">
                                <i class="fas fa-user-graduate fa-2x" style="color: #6c757d;"></i>
                            </div>
                            <p class="text-muted mb-0">Student ID: ${student.id}</p>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="mb-1"><strong>Contact Information:</strong></p>
                    <p class="mb-1">
                        <i class="fas fa-envelope me-2"></i>${student.email || 'N/A'}
                    </p>
                    <p class="mb-0">
                        <i class="fas fa-phone me-2"></i>${student.phone || 'N/A'}
                    </p>
                </div>
            `;
            
            infoContainer.style.display = 'block';
            noSelectionContainer.style.display = 'none';
        } else {
            infoContainer.style.display = 'none';
            noSelectionContainer.style.display = 'block';
        }
    }

    clearSelectedStudent() {
        this.selectedStudentForTranscript = null;
        this.displaySelectedStudentInfo();
        
        // Clear search
        document.getElementById('transcriptSearch').value = '';
        this.searchTranscriptStudents();
    }

    async previewTranscript() {
        try {
            if (!this.selectedStudentForTranscript) {
                this.showToast('Please select a student first', 'warning');
                return;
            }
            
            console.log('👁️ Previewing transcript...');
            this.showLoading(true);
            
            const student = this.selectedStudentForTranscript;
            const marks = await this.getMarks();
            const courses = await this.getCourses();
            
            // Get student's marks
            const studentMarks = marks.filter(m => m.student_id === student.id);
            
            // Calculate GPA and other statistics
            const transcriptData = this.calculateTranscriptData(studentMarks, courses);
            
            // Generate transcript HTML
            const transcriptHTML = this.generateTranscriptHTML(student, transcriptData);
            
            // Display in preview modal
            this.previewReport(transcriptHTML, 'Student Transcript');
            
            this.showToast('Transcript preview generated', 'success');
            
        } catch (error) {
            console.error('❌ Error previewing transcript:', error);
            this.showToast('Error generating transcript preview: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    calculateTranscriptData(studentMarks, courses) {
        // Group marks by semester
        const marksBySemester = {};
        const grades = [];
        
        studentMarks.forEach(mark => {
            const semester = mark.semester || 1;
            if (!marksBySemester[semester]) {
                marksBySemester[semester] = [];
            }
            marksBySemester[semester].push(mark);
            
            // Get course info
            const course = courses.find(c => c.course_code === mark.course_code);
            
            grades.push({
                courseCode: mark.course_code,
                courseName: course ? course.course_name : 'Unknown Course',
                semester: semester,
                academicYear: mark.academic_year || 'N/A',
                marks: mark.marks,
                grade: mark.grade,
                gradePoints: this.getGradePoints(mark.grade),
                credits: course ? course.credits : 3
            });
        });
        
        // Calculate semester GPAs
        const semesterGPAs = {};
        Object.keys(marksBySemester).forEach(semester => {
            const semesterGrades = grades.filter(g => g.semester === parseInt(semester));
            const totalGradePoints = semesterGrades.reduce((sum, grade) => 
                sum + (grade.gradePoints * grade.credits), 0);
            const totalCredits = semesterGrades.reduce((sum, grade) => sum + grade.credits, 0);
            semesterGPAs[semester] = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
        });
        
        // Calculate cumulative GPA
        const totalGradePoints = grades.reduce((sum, grade) => 
            sum + (grade.gradePoints * grade.credits), 0);
        const totalCredits = grades.reduce((sum, grade) => sum + grade.credits, 0);
        const cumulativeGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
        
        // Calculate class if applicable
        const classOfHonour = this.calculateClassOfHonour(parseFloat(cumulativeGPA));
        
        return {
            grades,
            semesterGPAs,
            cumulativeGPA,
            classOfHonour,
            totalCredits,
            semestersCompleted: Object.keys(marksBySemester).length
        };
    }

    calculateClassOfHonour(gpa) {
        if (gpa >= 3.7) return 'First Class Honours';
        if (gpa >= 3.3) return 'Second Class Honours (Upper Division)';
        if (gpa >= 3.0) return 'Second Class Honours (Lower Division)';
        if (gpa >= 2.7) return 'Third Class Honours';
        if (gpa >= 2.0) return 'Pass';
        return 'Fail';
    }

    generateTranscriptHTML(student, transcriptData) {
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <div class="container-fluid" style="max-width: 210mm; margin: 0 auto; padding: 20px; font-family: 'Times New Roman', Times, serif;">
                <!-- Header -->
                <div style="border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="color: #2c3e50; margin: 0 0 5px 0; font-size: 24px;">
                                THEOLOGICAL EDUCATION EXTENSION
                            </h1>
                            <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
                                P.O. Box 12345, Nairobi, Kenya | Email: info@tee.ac.ke | Tel: +254 700 000 000
                            </p>
                        </div>
                        <div style="text-align: center;">
                            <div style="width: 80px; height: 80px; background: #2c3e50; color: white; 
                                 border-radius: 8px; display: inline-flex; align-items: center; 
                                 justify-content: center; font-size: 32px; font-weight: bold;">
                                TEE
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Title -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #2c3e50; margin-bottom: 10px; text-decoration: underline;">OFFICIAL ACADEMIC TRANSCRIPT</h2>
                    <p style="color: #7f8c8d; margin: 0;">This document is an official record of academic achievement</p>
                </div>
                
                <!-- Student Information -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h4 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
                        <i class="fas fa-user-graduate"></i> Student Information
                    </h4>
                    <div class="row">
                        <div class="col-md-6">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 5px 0; width: 40%;"><strong>Full Name:</strong></td>
                                    <td style="padding: 5px 0;">${student.name || 'Unknown'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Admission Number:</strong></td>
                                    <td style="padding: 5px 0;">${student.admission_number || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Program:</strong></td>
                                    <td style="padding: 5px 0;">${student.program || 'Not assigned'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Study Centre:</strong></td>
                                    <td style="padding: 5px 0;">${student.centre_name || student.centre || 'N/A'}</td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 5px 0; width: 40%;"><strong>Date of Issue:</strong></td>
                                    <td style="padding: 5px 0;">${currentDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Transcript ID:</strong></td>
                                    <td style="padding: 5px 0;">TXN-${Date.now().toString().slice(-8)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Status:</strong></td>
                                    <td style="padding: 5px 0;">
                                        <span style="color: ${student.status === 'active' ? '#27ae60' : '#7f8c8d'};">
                                            ${student.status === 'active' ? 'Active Student' : 'Graduated'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>Intake Year:</strong></td>
                                    <td style="padding: 5px 0;">${student.intake_year || student.intake || 'N/A'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Academic Record -->
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
                        <i class="fas fa-book"></i> Academic Record
                    </h4>
                    
                    ${transcriptData.grades.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background: #2c3e50; color: white;">
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Course Code</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Course Title</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Semester</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Academic Year</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Credits</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Marks (%)</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Grade</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Grade Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transcriptData.grades.map(grade => `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #dee2e6;">${grade.courseCode}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6;">${grade.courseName}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${grade.semester}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${grade.academicYear}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${grade.credits}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${grade.marks}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center; font-weight: bold;">${grade.grade}</td>
                                        <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${grade.gradePoints.toFixed(1)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px;">
                            <i class="fas fa-book-open" style="font-size: 48px; color: #dee2e6; margin-bottom: 20px;"></i>
                            <h5>No Academic Records Found</h5>
                            <p class="text-muted">This student has no recorded grades or courses.</p>
                        </div>
                    `}
                </div>
                
                <!-- Performance Summary -->
                ${transcriptData.grades.length > 0 ? `
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <h4 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
                            <i class="fas fa-chart-line"></i> Performance Summary
                        </h4>
                        <div class="row">
                            <div class="col-md-6">
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0;"><strong>Total Credits Earned:</strong></td>
                                        <td style="padding: 8px 0; text-align: right;">${transcriptData.totalCredits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;"><strong>Semesters Completed:</strong></td>
                                        <td style="padding: 8px 0; text-align: right;">${transcriptData.semestersCompleted}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;"><strong>Cumulative GPA:</strong></td>
                                        <td style="padding: 8px 0; text-align: right;">
                                            <strong style="color: #2c3e50; font-size: 1.2em;">${transcriptData.cumulativeGPA}</strong>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0;"><strong>Class of Honours:</strong></td>
                                        <td style="padding: 8px 0; text-align: right;">
                                            <strong style="color: #27ae60;">${transcriptData.classOfHonour}</strong>
                                        </td>
                                    </tr>
                                    ${Object.entries(transcriptData.semesterGPAs).map(([semester, gpa]) => `
                                        <tr>
                                            <td style="padding: 8px 0;"><strong>Semester ${semester} GPA:</strong></td>
                                            <td style="padding: 8px 0; text-align: right;">${gpa}</td>
                                        </tr>
                                    `).join('')}
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Grading Scale -->
                <div style="margin-bottom: 30px;">
                    <h5 style="color: #2c3e50; margin-bottom: 10px;">Grading Scale</h5>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 8px; border: 1px solid #dee2e6;">Marks Range</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6;">Grade</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6;">Grade Points</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6;">Description</th>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">80 - 100%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">A</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">4.0</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Excellent</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">75 - 79%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">A-</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">3.7</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Very Good</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">70 - 74%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">B+</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">3.3</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Good</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">65 - 69%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">B</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">3.0</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Above Average</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">60 - 64%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">B-</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">2.7</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Average</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">55 - 59%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">C+</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">2.3</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Satisfactory</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">50 - 54%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">C</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">2.0</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Pass</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Below 50%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; text-align: center;">F</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">0.0</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">Fail</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 3px double #333; padding-top: 20px; margin-top: 30px;">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Official Stamp:</strong></p>
                            <div style="width: 150px; height: 100px; border: 2px dashed #dee2e6; 
                                 display: flex; align-items: center; justify-content: center; color: #7f8c8d;">
                                [Official Stamp Area]
                            </div>
                        </div>
                        <div class="col-md-6" style="text-align: right;">
                            <p><strong>Authorized Signature:</strong></p>
                            <div style="width: 200px; height: 100px; border-bottom: 1px solid #333; 
                                 display: inline-block; margin-top: 20px;"></div>
                            <p style="margin-top: 10px;">
                                <strong>Dr. John Mwangi</strong><br>
                                Registrar<br>
                                Theological Education Extension
                            </p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
                        <p style="margin: 0;">
                            <strong>Important:</strong> This transcript is official only when signed and stamped. 
                            Any alterations invalidate this document.
                        </p>
                        <p style="margin: 5px 0 0 0;">
                            Transcript ID: TXN-${Date.now().toString().slice(-8)} | Generated on: ${currentDate}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    async generateTranscript() {
        try {
            if (!this.selectedStudentForTranscript) {
                this.showToast('Please select a student first', 'warning');
                return;
            }
            
            console.log('📄 Generating official transcript...');
            this.showLoading(true);
            
            // For now, just show a success message
            // In a real app, this would generate a PDF
            this.showToast('Transcript generation started. This feature would create a downloadable PDF in a real application.', 'info');
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('transcriptModal'));
            if (modal) modal.hide();
            
            // Show loading simulation
            setTimeout(() => {
                this.showToast('Transcript generated successfully!', 'success');
                this.showLoading(false);
                
                // In a real app, this would trigger a download
                // this.downloadPDF(transcriptHTML, `${student.name}_Transcript.pdf`);
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error generating transcript:', error);
            this.showToast('Error generating transcript: ' + error.message, 'error');
            this.showLoading(false);
        }
    }

    async loadSampleTranscript() {
        try {
            console.log('🎨 Loading sample transcript...');
            
            // Load sample data
            const sampleStudent = this.getSampleStudents()[0];
            const sampleMarks = this.getSampleMarks();
            const sampleCourses = this.getSampleCourses();
            
            this.selectedStudentForTranscript = sampleStudent;
            this.displaySelectedStudentInfo();
            
            // Show success message
            this.showToast('Sample student loaded. Click "Preview Transcript" to see sample transcript.', 'success');
            
        } catch (error) {
            console.error('❌ Error loading sample transcript:', error);
            this.showToast('Error loading sample transcript', 'error');
        }
    }

    closeTranscriptModal() {
        const modal = document.getElementById('transcriptModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
    }

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Apply Filters button
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
        
        // Clear Filters button
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Refresh Reports button
        const refreshReportsBtn = document.getElementById('refreshReports');
        if (refreshReportsBtn) {
            refreshReportsBtn.addEventListener('click', () => this.refreshReports());
        }
        
        // Date filter changes
        const dateFilters = ['reportStartDate', 'reportEndDate'];
        dateFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Select filter changes
        const selectFilters = ['academicYear', 'filterIntake', 'filterCourse', 'semester'];
        selectFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Report type buttons
        const reportButtons = [
            'btnStudentReport', 'btnAcademicReport', 'btnCentreReport',
            'btnSummaryReport', 'btnTranscript', 'btnScheduled'
        ];
        
        reportButtons.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const action = id.replace('btn', '').replace(/([A-Z])/g, ' $1').trim();
                element.addEventListener('click', () => {
                    console.log(`📊 Generating ${action} report`);
                    this.showLoading(true);
                    
                    // Call appropriate method based on button
                    switch(id) {
                        case 'btnStudentReport':
                            this.studentReport();
                            break;
                        case 'btnAcademicReport':
                            this.academicReport();
                            break;
                        case 'btnCentreReport':
                            this.generateCentreReport();
                            break;
                        case 'btnSummaryReport':
                            this.generateSummaryReport();
                            break;
                        case 'btnTranscript':
                            this.openTranscriptModal();
                            this.showLoading(false);
                            return; // Don't hide loading for modal
                        case 'btnScheduled':
                            this.showScheduledReports();
                            break;
                    }
                    
                    setTimeout(() => this.showLoading(false), 500);
                });
            }
        });
        
        console.log('✅ Event listeners setup complete');
    }

    // ==================== UTILITY METHODS ====================

    refreshReports() {
        console.log('🔄 Refreshing reports...');
        this.showLoading(true);
        
        // Reload all data
        this.loadAllData().then(() => {
            this.updateStatistics();
            this.generateReportsGrid();
            this.showToast('Reports refreshed successfully', 'success');
            this.showLoading(false);
        }).catch(error => {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports: ' + error.message, 'error');
            this.showLoading(false);
        });
    }

    showLoading(show) {
        // You would typically show/hide a loading spinner here
        if (show) {
            console.log('⏳ Loading...');
        } else {
            console.log('✅ Loading complete');
        }
    }

    showToast(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 250px;
        `;
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    previewReport(content, title) {
        // Create preview modal
        const modalId = 'reportPreviewModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="reportPreviewContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="app.reports.downloadPreview()">
                                <i class="fas fa-download me-2"></i>Download Report
                            </button>
                            <button type="button" class="btn btn-outline-primary" onclick="window.print()">
                                <i class="fas fa-print me-2"></i>Print Report
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Set content
        const contentDiv = document.getElementById('reportPreviewContent');
        if (contentDiv) {
            contentDiv.innerHTML = content;
        }
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    downloadPreview() {
        // This would download the report as PDF or Excel
        this.showToast('Download feature would be implemented here. This would generate a PDF/Excel file.', 'info');
    }

    openTranscriptSection() {
        this.openTranscriptModal();
    }

    showScheduledReports() {
        this.showToast('Scheduled reports feature would be implemented here.', 'info');
    }

    // ==================== ALIAS METHODS FOR HTML ONCLICK ====================

    // These methods are aliases for HTML onclick attributes
    generateStudentReport() { this.studentReport(); }
    generateAcademicReport() { this.academicReport(); }
    previewStudentReport() { this.studentReport(); }
    previewAcademicReport() { this.academicReport(); }
    quickStudentReport() { this.studentReport(); }
    quickAcademicReport() { this.academicReport(); }
    bulkExport() { this.showToast('Bulk export feature would be implemented here.', 'info'); }
    bulkTranscripts() { this.showToast('Bulk transcripts feature would be implemented here.', 'info'); }
    addScheduledReport() { this.showToast('Add scheduled report feature would be implemented here.', 'info'); }
    saveFilterPreset() { this.showToast('Save filter preset feature would be implemented here.', 'info'); }
    clearPreview() { 
        const modal = document.getElementById('reportPreviewModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
} else {
    window.ReportsManager = ReportsManager;
}
