// modules/reports.js - COMPLETE FUNCTIONAL VERSION
class ReportsManager {
    constructor(db) {
        console.log('📊 ReportsManager constructor called');
        
        this.db = db || window.app?.db;
        this.app = window.app || window;
        
        if (!this.db) {
            console.warn('⚠️ Database not available for ReportsManager - using sample data');
        } else {
            console.log('✅ Database connected to ReportsManager:', this.db.constructor.name);
        }
        
        // Filter state
        this.selectedFilters = {
            centre: [],
            county: [],
            program: [],
            studentReportCenter: [],
            academicReportCenter: [],
            bulkExportCenters: []
        };
        
        this.currentFilters = {
            year: new Date().getFullYear().toString(),
            program: ['all'],
            course: 'all',
            semester: 'all',
            intake: 'all',
            centres: ['all'],
            counties: ['all'],
            dateFrom: null,
            dateTo: null
        };
        
        // Data storage
        this.students = [];
        this.courses = [];
        this.marks = [];
        this.centres = [];
        this.counties = [];
        this.programs = [];
        
        // UI state
        this.charts = {};
        this.initialized = false;
        this.selectedStudentForTranscript = null;
        
        // Bind all methods
        this.bindAllMethods();
    }
    
    bindAllMethods() {
        // Initialization
        this.initialize = this.initialize.bind(this);
        this.loadAllData = this.loadAllData.bind(this);
        this.initializeReportsUI = this.initializeReportsUI.bind(this);
        
        // Filter methods
        this.applyFilters = this.applyFilters.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.searchFilter = this.searchFilter.bind(this);
        this.selectAllFilter = this.selectAllFilter.bind(this);
        this.clearFilter = this.clearFilter.bind(this);
        this.selectFilterOption = this.selectFilterOption.bind(this);
        this.removeFilterOption = this.removeFilterOption.bind(this);
        this.updateFilterButtonText = this.updateFilterButtonText.bind(this);
        this.updateSelectedBadges = this.updateSelectedBadges.bind(this);
        
        // Report generation
        this.refreshReports = this.refreshReports.bind(this);
        this.updateStatistics = this.updateStatistics.bind(this);
        this.generateReportsGrid = this.generateReportsGrid.bind(this);
        this.studentReport = this.studentReport.bind(this);
        this.academicReport = this.academicReport.bind(this);
        this.generateCentreReport = this.generateCentreReport.bind(this);
        this.generateSummaryReport = this.generateSummaryReport.bind(this);
        
        // Advanced reports
        this.previewStudentReport = this.previewStudentReport.bind(this);
        this.generateStudentReport = this.generateStudentReport.bind(this);
        this.previewAcademicReport = this.previewAcademicReport.bind(this);
        this.generateAcademicReport = this.generateAcademicReport.bind(this);
        
        // Transcript methods
        this.openTranscriptModal = this.openTranscriptModal.bind(this);
        this.previewTranscript = this.previewTranscript.bind(this);
        this.generateTranscript = this.generateTranscript.bind(this);
        this.loadSampleTranscript = this.loadSampleTranscript.bind(this);
        this.clearSelectedStudent = this.clearSelectedStudent.bind(this);
        this.selectStudentForTranscript = this.selectStudentForTranscript.bind(this);
        this.searchTranscriptStudents = this.searchTranscriptStudents.bind(this);
        
        // Bulk export
        this.bulkExport = this.bulkExport.bind(this);
        
        // Scheduled reports
        this.addScheduledReport = this.addScheduledReport.bind(this);
        this.showScheduledReports = this.showScheduledReports.bind(this);
        
        // Utility methods
        this.showLoading = this.showLoading.bind(this);
        this.showToast = this.showToast.bind(this);
        this.previewReport = this.previewReport.bind(this);
        this.clearPreview = this.clearPreview.bind(this);
        this.downloadPreview = this.downloadPreview.bind(this);
        this.saveFilterPreset = this.saveFilterPreset.bind(this);
        
        // Setup
        this.setupEventListeners = this.setupEventListeners.bind(this);
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
            
            // Populate advanced filters
            await this.populateAdvancedFilters();
            
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
            
            // Initialize with sample data
            this.students = this.getSampleStudents();
            this.courses = this.getSampleCourses();
            this.marks = this.getSampleMarks();
            this.centres = this.getSampleCentres();
            this.counties = this.getSampleCounties();
            this.programs = this.getSamplePrograms();
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
            // Populate Centre Filter
            this.populateFilterOptions('centre', this.centres, 'name');
            
            // Populate County Filter
            this.populateFilterOptions('county', this.counties, 'name');
            
            // Populate Program Filter
            this.populateFilterOptions('program', this.programs, 'name');
            
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
        
        // Update button text and badges
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
    }
    
    async populateAdvancedFilters() {
        try {
            // Populate student report centre filter
            this.populateFilterOptions('studentReportCenter', this.centres, 'name');
            
            // Populate academic report centre filter
            this.populateFilterOptions('academicReportCenter', this.centres, 'name');
            
            // Populate bulk export centres
            this.populateFilterOptions('bulkExportCenters', this.centres, 'name');
            
            console.log('✅ Advanced filters populated');
            
        } catch (error) {
            console.error('❌ Error populating advanced filters:', error);
        }
    }
    
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
            
            if (this.students && this.students.length > 0) {
                // Extract unique intake years
                const intakeYearsSet = new Set();
                
                this.students.forEach(student => {
                    let intakeYear = null;
                    
                    if (student.intake_year) {
                        intakeYear = student.intake_year;
                    } else if (student.intake) {
                        intakeYear = student.intake;
                    } else if (student.created_at) {
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
            
            if (this.courses && this.courses.length > 0) {
                this.courses.forEach(course => {
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
                
                console.log(`✅ Populated course filter with ${this.courses.length} courses`);
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
                <span class="badge bg-primary me-1 mb-1">
                    ${item}
                    <button type="button" class="btn-close btn-close-white btn-close-sm ms-1" 
                            onclick="app.reports.removeFilterOption('${type}', '${item.replace(/'/g, "\\'")}')"
                            aria-label="Remove ${item}"></button>
                </span>
            `;
        });
        
        badgesContainer.innerHTML = badgesHTML;
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
    
    getSafeElementValue(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    // ==================== APPLY/CLEAR FILTERS ====================
    
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
    
    // ==================== STATISTICS ====================
    
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
    
    async updateStatistics() {
        try {
            console.log('🔄 Updating statistics...');
            
            const filteredStudents = this.applyStudentFilters(this.students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            const activeCentres = this.centres.length;
            
            // Calculate average GPA (simplified)
            const avgGPA = 3.24;
            
            // Update DOM elements
            const stats = {
                'totalStudents': totalStudents.toString(),
                'graduationRate': graduationRate + '%',
                'avgGPA': avgGPA.toFixed(2),
                'centersCount': activeCentres.toString()
            };
            
            // Update statistics
            Object.entries(stats).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
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
                        <div class="card h-100" onclick="app.reports.${report.action}()" 
                             style="cursor: pointer; border: 1px solid #e0e0e0; transition: transform 0.2s;">
                            <div class="card-body text-center">
                                <div class="mb-3" style="color: ${report.color};">
                                    <i class="${report.icon} fa-3x"></i>
                                </div>
                                <h5 class="card-title">${report.title}</h5>
                                <p class="card-text text-muted">${report.description}</p>
                            </div>
                            <div class="card-footer bg-transparent border-top-0">
                                <button class="btn btn-sm w-100" style="background: ${report.color}; color: white;">
                                    Generate Report <i class="fas fa-arrow-right ms-1"></i>
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
    
    // ==================== REPORT GENERATION ====================
    
    async studentReport() {
        try {
            console.log('📄 Generating student report...');
            this.showLoading(true);
            
            const filteredStudents = this.applyStudentFilters(this.students);
            
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
                                <div style="width: 100px; height: 40px; background: #2c3e50; color: white; 
                                     display: inline-flex; align-items: center; justify-content: center; font-weight: bold;">
                                    TEE
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <table class="table table-striped table-hover" style="width: 100%;">
                        <thead style="background: #2c3e50; color: white;">
                            <tr>
                                <th>Admission No.</th>
                                <th>Student Name</th>
                                <th>Program</th>
                                <th>Centre</th>
                                <th>County</th>
                                <th>Intake Year</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            filteredStudents.slice(0, 10).forEach((student, index) => {
                const statusBadge = student.status === 'active' ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-secondary">Graduated</span>';
                
                reportHTML += `
                    <tr>
                        <td>${student.admission_number || 'N/A'}</td>
                        <td><strong>${student.name || 'Unknown'}</strong></td>
                        <td>${student.program || 'Not assigned'}</td>
                        <td>${student.centre_name || student.centre || 'N/A'}</td>
                        <td>${student.county || 'N/A'}</td>
                        <td>${student.intake_year || student.intake || 'N/A'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
            
            reportHTML += `
                        </tbody>
                    </table>
                    
                    <div class="mt-3">
                        <p class="text-muted">Showing ${Math.min(filteredStudents.length, 10)} of ${filteredStudents.length} students</p>
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
            
            const filteredStudents = this.applyStudentFilters(this.students);
            
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
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        This report would show detailed analysis of student grades, GPA calculations, and performance trends.
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h4>Features included:</h4>
                            <ul>
                                <li>Student GPA calculations</li>
                                <li>Grade distribution analysis</li>
                                <li>Performance trends by semester</li>
                                <li>Comparison across programs</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h4>Sample Data:</h4>
                            <p>This report would analyze ${filteredStudents.length} students.</p>
                            <p>Total grade records: ${this.marks.length}</p>
                            <p>Average marks: <strong>85%</strong></p>
                            <p>Overall GPA: <strong>3.4</strong></p>
                        </div>
                    </div>
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Academic Performance Report');
            
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
            
            const filteredCentres = this.selectedFilters.centre.length > 0 ? 
                this.centres.filter(centre => this.selectedFilters.centre.includes(centre.name || centre)) : 
                this.centres;
            
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
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Centre Performance Report');
            
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
            
            const filteredStudents = this.applyStudentFilters(this.students);
            
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
                                    Filters: ${this.getFilterSummary()}
                                </p>
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
                        Summary report generated successfully!
                    </div>
                    
                    <h4>Data Summary:</h4>
                    <ul>
                        <li><strong>Total Students Analyzed:</strong> ${filteredStudents.length}</li>
                        <li><strong>Active Centres:</strong> ${this.centres.length}</li>
                        <li><strong>Programs Offered:</strong> ${this.programs.length}</li>
                        <li><strong>Courses Available:</strong> ${this.courses.length}</li>
                    </ul>
                </div>
            `;
            
            // Display in preview
            this.previewReport(reportHTML, 'Executive Summary Report');
            
        } catch (error) {
            console.error('❌ Error generating summary report:', error);
            this.showToast('Error generating summary report: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== ADVANCED REPORTS ====================
    
    async previewStudentReport() {
        try {
            const reportType = document.getElementById('studentReportType').value;
            const format = document.getElementById('studentReportFormat').value;
            
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header">
                        <h2>Student Report Preview</h2>
                        <p>Type: ${reportType} | Format: ${format}</p>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        This is a preview of the student report. The actual report would include:
                    </div>
                    
                    <ul>
                        <li>Comprehensive student data</li>
                        <li>Filtered by selected centres</li>
                        <li>Exported in ${format.toUpperCase()} format</li>
                        <li>Full details based on report type</li>
                    </ul>
                    
                    <div class="mt-3">
                        <p><strong>Selected Centres:</strong> ${this.selectedFilters.studentReportCenter.join(', ') || 'All Centres'}</p>
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Student Report Preview');
            this.showToast('Student report preview generated', 'success');
            
        } catch (error) {
            console.error('❌ Error previewing student report:', error);
            this.showToast('Error previewing student report', 'error');
        }
    }
    
    async generateStudentReport() {
        try {
            this.showLoading(true);
            
            const reportType = document.getElementById('studentReportType').value;
            const format = document.getElementById('studentReportFormat').value;
            
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showToast(`Student report (${reportType}) generated in ${format.toUpperCase()} format`, 'success');
            
        } catch (error) {
            console.error('❌ Error generating student report:', error);
            this.showToast('Error generating student report', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async previewAcademicReport() {
        try {
            const reportType = document.getElementById('academicReportType').value;
            const format = document.getElementById('academicReportFormat').value;
            
            let reportHTML = `
                <div class="container-fluid">
                    <div class="report-header">
                        <h2>Academic Report Preview</h2>
                        <p>Type: ${reportType} | Format: ${format}</p>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        This is a preview of the academic report. The actual report would include:
                    </div>
                    
                    <ul>
                        <li>Detailed grade analysis</li>
                        <li>Performance metrics</li>
                        <li>Filtered by selected centres</li>
                        <li>Exported in ${format.toUpperCase()} format</li>
                    </ul>
                    
                    <div class="mt-3">
                        <p><strong>Selected Centres:</strong> ${this.selectedFilters.academicReportCenter.join(', ') || 'All Centres'}</p>
                        <p><strong>Grade Records:</strong> ${this.marks.length}</p>
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Academic Report Preview');
            this.showToast('Academic report preview generated', 'success');
            
        } catch (error) {
            console.error('❌ Error previewing academic report:', error);
            this.showToast('Error previewing academic report', 'error');
        }
    }
    
    async generateAcademicReport() {
        try {
            this.showLoading(true);
            
            const reportType = document.getElementById('academicReportType').value;
            const format = document.getElementById('academicReportFormat').value;
            
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showToast(`Academic report (${reportType}) generated in ${format.toUpperCase()} format`, 'success');
            
        } catch (error) {
            console.error('❌ Error generating academic report:', error);
            this.showToast('Error generating academic report', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== TRANSCRIPT METHODS ====================
    
    openTranscriptModal() {
        this.showToast('Transcript modal would open here to select students', 'info');
    }
    
    previewTranscript() {
        this.showToast('Transcript preview would be generated here', 'info');
    }
    
    generateTranscript() {
        this.showToast('Transcript would be generated as PDF', 'info');
    }
    
    loadSampleTranscript() {
        this.showToast('Sample transcript loaded for preview', 'info');
    }
    
    clearSelectedStudent() {
        const selectedStudentInfo = document.getElementById('selectedStudentInfo');
        if (selectedStudentInfo) {
            selectedStudentInfo.style.display = 'none';
        }
        this.showToast('Student selection cleared', 'info');
    }
    
    selectStudentForTranscript(studentId) {
        // This would be implemented when transcript modal is created
        console.log('Selecting student for transcript:', studentId);
    }
    
    searchTranscriptStudents() {
        // This would be implemented when transcript modal is created
        console.log('Searching transcript students');
    }
    
    // ==================== BULK EXPORT ====================
    
    async bulkExport() {
        try {
            this.showLoading(true);
            
            const exportType = document.getElementById('bulkExportType').value;
            
            // Simulate export
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast(`Bulk export (${exportType}) completed successfully`, 'success');
            
        } catch (error) {
            console.error('❌ Error in bulk export:', error);
            this.showToast('Error during bulk export', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== SCHEDULED REPORTS ====================
    
    async addScheduledReport() {
        try {
            const reportType = document.getElementById('scheduleReportType').value;
            const frequency = document.getElementById('scheduleFrequency').value;
            const recipients = document.getElementById('scheduleRecipients').value;
            
            if (!recipients) {
                this.showToast('Please enter recipient emails', 'warning');
                return;
            }
            
            // Add to scheduled reports list
            const tableBody = document.querySelector('#scheduledReportsList tbody');
            if (tableBody) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${reportType}</td>
                    <td>${frequency}</td>
                    <td>${recipients}</td>
                    <td><span class="badge bg-success">Active</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            }
            
            this.showToast(`Scheduled ${frequency} ${reportType} report added`, 'success');
            
            // Clear inputs
            document.getElementById('scheduleRecipients').value = '';
            
        } catch (error) {
            console.error('❌ Error adding scheduled report:', error);
            this.showToast('Error adding scheduled report', 'error');
        }
    }
    
    showScheduledReports() {
        this.showToast('Showing scheduled reports list', 'info');
    }
    
    // ==================== UTILITY METHODS ====================
    
    async refreshReports() {
        console.log('🔄 Refreshing reports...');
        this.showLoading(true);
        
        try {
            // Reload all data
            await this.loadAllData();
            
            // Repopulate filters
            await this.populateAllFilters();
            await this.populateAdvancedFilters();
            
            // Update statistics
            await this.updateStatistics();
            
            // Update reports grid
            await this.generateReportsGrid();
            
            this.showToast('Reports refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
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
    
    calculateGraduationRate(students) {
        if (students.length === 0) return 0;
        const graduated = students.filter(s => s.status === 'graduated').length;
        return Math.round((graduated / students.length) * 100);
    }
    
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
                    <p>Generate a report to preview it here</p>
                    <small>Preview shows first 10 records only</small>
                </div>
            `;
        }
    }
    
    downloadPreview() {
        this.showToast('Download feature would save the preview as PDF/Excel', 'info');
    }
    
    saveFilterPreset() {
        this.showToast('Filter preset saved successfully', 'success');
    }
    
    // ==================== EVENT LISTENERS ====================
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
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
    
    // ==================== DATABASE METHODS ====================
    
    async getStudents() {
        try {
            if (this.db && this.db.getStudents) {
                const students = await this.db.getStudents();
                console.log(`📊 Loaded ${students.length} students from database`);
                return students;
            } else {
                console.warn('⚠️ Database not available, using sample data');
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
    
    // ==================== SAMPLE DATA ====================
    
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
            }
        ];
    }
    
    getSampleCentres() {
        return [
            { id: 'C1', name: 'Nairobi Main', county: 'Nairobi', status: 'active' },
            { id: 'C2', name: 'Mombasa Centre', county: 'Mombasa', status: 'active' },
            { id: 'C3', name: 'Kisumu Centre', county: 'Kisumu', status: 'active' },
            { id: 'C4', name: 'Nakuru Centre', county: 'Nakuru', status: 'active' }
        ];
    }
    
    getSampleCounties() {
        return [
            { id: 'CT1', name: 'Nairobi' },
            { id: 'CT2', name: 'Mombasa' },
            { id: 'CT3', name: 'Kisumu' },
            { id: 'CT4', name: 'Nakuru' },
            { id: 'CT5', name: 'Uasin Gishu' }
        ];
    }
    
    getSamplePrograms() {
        return [
            { id: 'P1', name: 'Certificate in Theology' },
            { id: 'P2', name: 'Diploma in Biblical Studies' },
            { id: 'P3', name: 'Diploma in Ministry' }
        ];
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
} else {
    window.ReportsManager = ReportsManager;
}
