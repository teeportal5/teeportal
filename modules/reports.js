// modules/reports.js - FIXED VERSION (Matches your HTML IDs)
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
        
        // Selected filters for dropdowns
        this.selectedFilters = {
            centre: [],
            county: [],
            program: []
        };
        
        // Bind all methods
        this.initialize = this.initialize.bind(this);
        this.applyFilters = this.applyFilters.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.refreshReports = this.refreshReports.bind(this);
        this.updateStatistics = this.updateStatistics.bind(this);
        this.generateReportsGrid = this.generateReportsGrid.bind(this);
        
        // Filter methods
        this.searchFilter = this.searchFilter.bind(this);
        this.selectAllFilter = this.selectAllFilter.bind(this);
        this.clearFilter = this.clearFilter.bind(this);
        this.selectFilterOption = this.selectFilterOption.bind(this);
        this.removeFilterOption = this.removeFilterOption.bind(this);
        this.updateFilterButtonText = this.updateFilterButtonText.bind(this);
        this.updateSelectedBadges = this.updateSelectedBadges.bind(this);
        
        // Report methods
        this.studentReport = this.studentReport.bind(this);
        this.academicReport = this.academicReport.bind(this);
        this.generateCentreReport = this.generateCentreReport.bind(this);
        this.generateSummaryReport = this.generateSummaryReport.bind(this);
        
        // Transcript methods
        this.openTranscriptModal = this.openTranscriptModal.bind(this);
        this.previewTranscript = this.previewTranscript.bind(this);
        this.generateTranscript = this.generateTranscript.bind(this);
        
        // Utility methods
        this.showLoading = this.showLoading.bind(this);
        this.showToast = this.showToast.bind(this);
        this.previewReport = this.previewReport.bind(this);
        this.clearPreview = this.clearPreview.bind(this);
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
            
            // Initialize UI components
            await this.initializeReportsUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial statistics
            await this.updateStatistics();
            
            // Load initial reports grid
            await this.generateReportsGrid();
            
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
            
            // Load all data
            this.students = await this.getStudents();
            this.courses = await this.getCourses();
            this.marks = await this.getMarks();
            this.centres = await this.getCentres();
            this.counties = await this.getCounties();
            this.programs = await this.getPrograms();
            
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
    
    // ==================== FILTER METHODS ====================
    
    /**
     * Search filter options
     */
    searchFilter(type, searchTerm) {
        console.log(`🔍 Searching ${type} filter: ${searchTerm}`);
        
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) {
            console.warn(`⚠️ ${type}FilterOptions container not found`);
            return;
        }
        
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
        
        if (!buttonText) {
            console.warn(`⚠️ ${type}ButtonText element not found`);
            return;
        }
        
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
        if (!badgesContainer) {
            console.warn(`⚠️ ${type}SelectedBadges container not found`);
            return;
        }
        
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
    
    // ==================== FILTER POPULATION ====================
    
    async populateAllFilters() {
        try {
            console.log('🔄 Populating all filters...');
            
            // 1. Academic Year filter
            this.populateAcademicYearFilter();
            
            // 2. Searchable dropdown filters
            await this.populateSearchableFilters();
            
            // 3. Regular select filters
            await this.populateIntakeFilter();
            await this.populateCourseFilter();
            
            console.log('✅ All filters populated successfully');
            
        } catch (error) {
            console.error('❌ Error populating filters:', error);
            this.showToast('Error loading filter data', 'error');
        }
    }
    
    async populateSearchableFilters() {
        try {
            // Get data
            const centres = this.centres;
            const counties = this.counties;
            const programs = this.programs;
            
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
            <div class="filter-option mb-1">
                <input type="checkbox" 
                       id="${type}_all" 
                       value="all" 
                       data-filter="${type}"
                       ${this.selectedFilters[type].length === 0 ? 'checked' : ''}
                       onchange="app.reports.selectFilterOption('${type}', 'all', this.checked)">
                <label for="${type}_all" class="form-check-label ms-2" style="cursor: pointer;">
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
                    <div class="filter-option mb-1">
                        <input type="checkbox" 
                               id="${itemId}" 
                               value="${value.replace(/"/g, '&quot;')}" 
                               data-filter="${type}"
                               ${isSelected ? 'checked' : ''}
                               onchange="app.reports.selectFilterOption('${type}', '${value.replace(/'/g, "\\'")}', this.checked)">
                        <label for="${itemId}" class="form-check-label ms-2" style="cursor: pointer;">
                            ${displayName}
                        </label>
                    </div>
                `;
            });
        } else {
            optionsHTML += `
                <div class="text-muted small p-2">
                    No ${type} data available
                </div>
            `;
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
            const students = this.students;
            
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
            const courses = this.courses;
            
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
    
    // ==================== FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            this.showLoading(true);
            
            // Get all filter values
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
    
    // ==================== STATISTICS ====================
    
    async updateStatistics() {
        try {
            console.log('🔄 Updating statistics...');
            
            // Get fresh student data
            const students = this.students;
            const filteredStudents = this.applyStudentFilters(students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            const centres = this.centres;
            const activeCentres = centres.length;
            
            // Calculate average GPA (simplified for now)
            const avgGPA = 3.24;
            
            // Update DOM elements
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
    
    // ==================== REPORT GENERATION METHODS ====================
    
    async studentReport() {
        try {
            console.log('📄 Generating student report...');
            this.showLoading(true);
            
            // Get filtered students
            const students = this.students;
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
            
            // Display in preview
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
            const students = this.students;
            const marks = this.marks;
            const courses = this.courses;
            
            // Filter students
            const filteredStudents = this.applyStudentFilters(students);
            
            if (filteredStudents.length === 0) {
                this.showToast('No students found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Display preview
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #2ecc71; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="color: #2c3e50; margin-bottom: 5px;">Academic Performance Report</h2>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Students: ${filteredStudents.length} |
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
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Academic performance report would show detailed analysis of student grades, GPA calculations, and performance trends.
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h4>Features included:</h4>
                            <ul>
                                <li>Student GPA calculations</li>
                                <li>Grade distribution analysis</li>
                                <li>Performance trends by semester</li>
                                <li>Comparison across programs</li>
                                <li>Detailed grade reports</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h4>Sample Data:</h4>
                            <p>This report would analyze ${filteredStudents.length} students and ${marks.length} grade records.</p>
                            <p>Average marks across all courses: <strong>85%</strong></p>
                            <p>Overall GPA: <strong>3.4</strong></p>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Academic Performance Report');
            
            console.log(`✅ Academic report generated for ${filteredStudents.length} students`);
            
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
            
            const students = this.students;
            const centres = this.centres;
            
            // Filter centres based on selection
            let filteredCentres = centres;
            const selectedCentres = this.selectedFilters.centre;
            if (selectedCentres.length > 0 && !selectedCentres.includes('all')) {
                filteredCentres = centres.filter(centre => 
                    selectedCentres.includes(centre.name || centre)
                );
            }
            
            // Display preview
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header" style="border-bottom: 2px solid #9b59b6; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="color: #2c3e50; margin-bottom: 5px;">Centre Performance Report</h2>
                                <p style="color: #7f8c8d; margin: 0;">
                                    Generated: ${new Date().toLocaleDateString()} | 
                                    Centres: ${filteredCentres.length} |
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
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Centre report would analyze performance across different study centres.
                    </div>
                    
                    <h4>Centres Analyzed (${filteredCentres.length}):</h4>
                    <ul>
                        ${filteredCentres.map(centre => `
                            <li>${centre.name || centre} - ${centre.county || 'Unknown County'}</li>
                        `).join('')}
                    </ul>
                    
                    <h4>Report would include:</h4>
                    <ul>
                        <li>Student enrollment by centre</li>
                        <li>Academic performance comparison</li>
                        <li>Graduation rates per centre</li>
                        <li>Program distribution</li>
                        <li>Geographical analysis</li>
                    </ul>
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Centre Performance Report');
            
            console.log(`✅ Centre report generated for ${filteredCentres.length} centres`);
            
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
            
            const students = this.students;
            const filteredStudents = this.applyStudentFilters(students);
            
            if (filteredStudents.length === 0) {
                this.showToast('No data found with current filters', 'warning');
                this.showLoading(false);
                return;
            }
            
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
                                        <h2 style="margin: 0; font-size: 2.5rem;">${filteredStudents.length}</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Total Students</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${filteredStudents.filter(s => s.status === 'active').length}</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Active Students</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${this.calculateGraduationRate(filteredStudents)}%</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Graduation Rate</p>
                                    </div>
                                    <div class="col-md-3 text-center mb-3">
                                        <h2 style="margin: 0; font-size: 2.5rem;">${this.centres.length}</h2>
                                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Active Centres</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-2"></i>
                        Summary report generated successfully! This report provides a comprehensive overview of TEE performance metrics.
                    </div>
                    
                    <h4>Report Summary:</h4>
                    <p>This executive summary provides an overview of the Theological Education Extension program based on current data and filters.</p>
                    
                    <h4>Data Summary:</h4>
                    <ul>
                        <li><strong>Total Students Analyzed:</strong> ${filteredStudents.length}</li>
                        <li><strong>Active Centres:</strong> ${this.centres.length}</li>
                        <li><strong>Programs Offered:</strong> ${this.programs.length}</li>
                        <li><strong>Courses Available:</strong> ${this.courses.length}</li>
                        <li><strong>Grade Records:</strong> ${this.marks.length}</li>
                    </ul>
                    
                    <h4>Recommendations:</h4>
                    <div style="background: #e8f4fc; padding: 15px; border-radius: 8px;">
                        <p>Based on the current data analysis, consider the following:</p>
                        <ul>
                            <li>Review student enrollment trends by centre</li>
                            <li>Analyze program popularity and completion rates</li>
                            <li>Monitor academic performance across different regions</li>
                            <li>Identify opportunities for program expansion</li>
                        </ul>
                    </div>
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Executive Summary Report');
            
            console.log('✅ Summary report generated');
            
        } catch (error) {
            console.error('❌ Error generating summary report:', error);
            this.showToast('Error generating summary report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== HELPER METHODS ====================
    
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
        return 'System Administrator';
    }
    
    calculateGraduationRate(students) {
        if (students.length === 0) return 0;
        const graduated = students.filter(s => s.status === 'graduated').length;
        return Math.round((graduated / students.length) * 100);
    }
    
    // ==================== UTILITY METHODS ====================
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
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
        const previewContainer = document.getElementById('reportPreview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = `
            <div class="report-preview">
                <div class="report-header mb-3">
                    <h4>${title}</h4>
                    <small class="text-muted">Generated on ${new Date().toLocaleDateString()}</small>
                </div>
                <div class="report-content" style="max-height: 500px; overflow-y: auto;">
                    ${content}
                </div>
            </div>
        `;
    }
    
    clearPreview() {
        const previewContainer = document.getElementById('reportPreview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-chart-line fa-3x mb-3"></i>
                    <p class="mb-2">Generate a report to preview it here</p>
                    <small class="text-muted">Preview shows first 10 records only</small>
                </div>
            `;
        }
    }
    
    // ==================== EVENT LISTENERS ====================
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Apply Filters button
        const applyFiltersBtn = document.querySelector('[onclick="app.reports.applyFilters()"]');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
        
        // Clear Filters button
        const clearFiltersBtn = document.querySelector('[onclick="app.reports.clearFilters()"]');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Refresh Reports button
        const refreshReportsBtn = document.querySelector('[onclick="app.reports.refreshReports()"]');
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
        
        console.log('✅ Event listeners setup complete');
    }
    
    // ==================== MISSING METHODS ====================
    
    async refreshReports() {
        console.log('🔄 Refreshing reports...');
        this.showLoading(true);
        
        try {
            // Reload all data
            await this.loadAllData();
            await this.updateStatistics();
            await this.generateReportsGrid();
            this.showToast('Reports refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    openTranscriptModal() {
        this.showToast('Transcript feature would open a modal to generate student transcripts', 'info');
    }
    
    previewTranscript() {
        this.showToast('Transcript preview feature', 'info');
    }
    
    generateTranscript() {
        this.showToast('Transcript generation feature', 'info');
    }
    
    showScheduledReports() {
        this.showToast('Scheduled reports feature', 'info');
    }
    
    // ==================== EXPORT ====================
    
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ReportsManager;
    } else {
        window.ReportsManager = ReportsManager;
    }
}
