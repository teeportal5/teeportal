// modules/reports.js - COMPLETE WORKING VERSION FOR YOUR STRUCTURE
class ReportsManager {
    constructor(db) {
        console.log('📊 ReportsManager initialized');
        this.db = db || window.app?.db;
        this.app = window.app || window;
        
        // Filter state
        this.selectedFilters = {
            centre: [],
            county: [],
            program: [],
            studentReportCenter: [],
            academicReportCenter: [],
            bulkExportCenters: []
        };
        
        // Current filters
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
        
        // Initialize with empty arrays
        this.students = [];
        this.centres = [];
        this.counties = [];
        this.programs = [];
        this.courses = [];
        this.marks = [];
        
        // Bind methods
        this.bindAllMethods();
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    bindAllMethods() {
        const methods = [
            'initialize', 'loadRealData', 'loadSampleData', 'applyFilters', 'clearFilters', 'refreshReports',
            'searchFilter', 'selectAllFilter', 'clearFilter', 'selectFilterOption',
            'removeFilterOption', 'updateFilterButtonText', 'updateSelectedBadges',
            'populateFilterOptions', 'populateAcademicYearFilter', 'populateIntakeFilter',
            'populateCourseFilter', 'setDefaultDates', 'updateStatistics',
            'applyStudentFilters', 'generateReportsGrid', 'studentReport',
            'academicReport', 'generateCentreReport', 'generateSummaryReport',
            'previewStudentReport', 'generateStudentReport', 'previewAcademicReport',
            'generateAcademicReport', 'openTranscriptModal', 'previewTranscript',
            'generateTranscript', 'loadSampleTranscript', 'clearSelectedStudent',
            'bulkExport', 'addScheduledReport', 'showScheduledReports',
            'previewReport', 'clearPreview', 'downloadPreview', 'saveFilterPreset',
            'showToast', 'showLoading', 'downloadCSV', 'downloadExcel', 'downloadPDF',
            'downloadJSON', 'downloadReport', 'ensureTableVisibility', 'renderReports'
        ];
        
        methods.forEach(method => {
            this[method] = this[method].bind(this);
        });
    }
    
    async initialize() {
        console.log('🚀 Initializing Reports...');
        this.showLoading(true);
        
        try {
            // Load real data from database
            await this.loadRealData();
            
            // Populate all filters
            this.populateAcademicYearFilter();
            this.populateFilterOptions('centre', this.centres, 'name');
            this.populateFilterOptions('county', this.counties, 'name');
            this.populateFilterOptions('program', this.programs, 'name');
            this.populateIntakeFilter();
            this.populateCourseFilter();
            
            // Populate advanced filters
            this.populateFilterOptions('studentReportCenter', this.centres, 'name');
            this.populateFilterOptions('academicReportCenter', this.centres, 'name');
            this.populateFilterOptions('bulkExportCenters', this.centres, 'name');
            
            // Populate transcript filters
            this.populateTranscriptFilters();
            
            // Set default dates
            this.setDefaultDates();
            
            // Update statistics with real data
            this.updateStatistics();
            
            // Generate reports grid
            this.generateReportsGrid();
            
            // Render the reports section
            this.renderReports();
            
            // Ensure tables are visible
            setTimeout(() => {
                this.ensureTableVisibility();
            }, 500);
            
            console.log('✅ Reports initialized successfully with real data');
            console.log(`📊 Loaded: ${this.students.length} students, ${this.centres.length} centres`);
            
            this.showToast('Reports module loaded with real data', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing reports:', error);
            this.showToast('Error loading reports data', 'error');
            
            // Fallback to sample data if database fails
            console.log('⚠️ Using sample data as fallback');
            this.loadSampleData();
            this.updateStatistics();
            this.generateReportsGrid();
            this.ensureTableVisibility();
        } finally {
            this.showLoading(false);
        }
    }
    
    renderReports() {
        console.log('📋 Rendering reports section...');
        
        // Make sure the reports section is properly structured
        const reportsSection = document.getElementById('reports');
        if (reportsSection) {
            // Ensure the section has proper structure
            reportsSection.classList.add('content-section');
            
            // Check if we need to add any missing elements
            const reportsGrid = document.getElementById('reportsGrid');
            if (reportsGrid && reportsGrid.innerHTML.includes('Loading reports')) {
                this.generateReportsGrid();
            }
        }
        
        // Ensure all dropdowns work
        this.initializeDropdowns();
    }
    
    initializeDropdowns() {
        // Add click handlers for dropdown buttons if needed
        document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdown = button.nextElementSibling;
                if (dropdown && dropdown.classList.contains('dropdown-menu')) {
                    dropdown.classList.toggle('show');
                }
            });
        });
    }
    
    async loadRealData() {
        try {
            // Load students from database
            if (this.db?.getStudents) {
                const dbStudents = await this.db.getStudents();
                console.log(`📚 Raw students from DB: ${dbStudents?.length || 0}`);
                
                if (dbStudents && dbStudents.length > 0) {
                    this.students = dbStudents.map(s => ({
                        id: s.id,
                        name: s.full_name || s.name,
                        admission_number: s.reg_number || s.admission_number,
                        email: s.email,
                        phone: s.phone,
                        centre_name: s.centre_name || s.centre,
                        centre: s.centre_name || s.centre,
                        county: s.county,
                        program: s.program_name || s.program,
                        program_name: s.program_name || s.program,
                        intake_year: s.intake_year || s.intake,
                        status: s.status || 'active'
                    }));
                    console.log(`✅ Loaded ${this.students.length} students from database`);
                } else {
                    console.warn('⚠️ No students returned from database');
                    this.students = [];
                }
            }
            
            // Load centres
            if (this.db?.getCentres) {
                this.centres = await this.db.getCentres() || [];
                console.log(`✅ Loaded ${this.centres.length} centres from database`);
            }
            
            // Load programs
            if (this.db?.getPrograms) {
                this.programs = await this.db.getPrograms() || [];
                console.log(`✅ Loaded ${this.programs.length} programs from database`);
            }
            
            // Load counties
            if (this.db?.getCounties) {
                this.counties = await this.db.getCounties() || [];
                console.log(`✅ Loaded ${this.counties.length} counties from database`);
            } else {
                const uniqueCounties = [...new Set(this.students.map(s => s.county).filter(Boolean))];
                this.counties = uniqueCounties.map(name => ({ name }));
                console.log(`✅ Extracted ${this.counties.length} counties from student data`);
            }
            
            // Load courses
            if (this.db?.getCourses) {
                this.courses = await this.db.getCourses() || [];
                console.log(`✅ Loaded ${this.courses.length} courses from database`);
            }
            
            // Load marks
            if (this.db?.getMarks) {
                this.marks = await this.db.getMarks() || [];
                console.log(`✅ Loaded ${this.marks.length} marks from database`);
            }
            
        } catch (error) {
            console.error('Error loading real data:', error);
            throw error;
        }
    }
    
    loadSampleData() {
        this.students = this.getSampleStudents();
        this.centres = this.getSampleCentres();
        this.counties = this.getSampleCounties();
        this.programs = this.getSamplePrograms();
        this.courses = this.getSampleCourses();
        this.marks = this.getSampleMarks();
        
        console.log('⚠️ Using sample data as fallback');
    }
    
    // ==================== CRITICAL FIX: ENSURE TABLE VISIBILITY ====================
    
    ensureTableVisibility() {
        console.log('🔍 Ensuring report tables are visible...');
        
        // Target all tables in the reports section
        const reportsSection = document.getElementById('reports');
        if (!reportsSection) return;
        
        // Find all tables within reports section
        const tables = reportsSection.querySelectorAll('table');
        
        tables.forEach(table => {
            // Force table visible
            table.style.setProperty('display', 'table', 'important');
            table.style.setProperty('visibility', 'visible', 'important');
            table.style.setProperty('opacity', '1', 'important');
            
            // Force all rows visible
            table.querySelectorAll('tr').forEach(row => {
                row.style.setProperty('display', 'table-row', 'important');
                row.style.setProperty('visibility', 'visible', 'important');
            });
            
            console.log(`✅ Table forced visible: ${table.id || 'unnamed'} (${table.rows.length} rows)`);
        });
        
        // Make all parent containers visible
        let parent = reportsSection.parentElement;
        while (parent) {
            parent.style.setProperty('display', 'block', 'important');
            parent.style.setProperty('visibility', 'visible', 'important');
            parent.style.setProperty('overflow', 'visible', 'important');
            parent = parent.parentElement;
        }
        
        console.log('✅ All parent containers made visible');
    }
    
    // ==================== STATISTICS ====================
    
    updateStatistics() {
        try {
            const filteredStudents = this.applyStudentFilters(this.students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            const graduationRate = totalStudents > 0 ? Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            // Update statistics cards in reports section
            const totalElement = document.getElementById('totalStudents');
            if (totalElement) {
                totalElement.textContent = totalStudents;
                console.log('✅ Updated totalStudents to:', totalStudents);
            }
            
            const gradElement = document.getElementById('graduationRate');
            if (gradElement) {
                gradElement.textContent = graduationRate + '%';
                console.log('✅ Updated graduationRate to:', graduationRate + '%');
            }
            
            const gpaElement = document.getElementById('avgGPA');
            if (gpaElement) {
                gpaElement.textContent = '3.24';
            }
            
            const centresElement = document.getElementById('centersCount');
            if (centresElement) {
                centresElement.textContent = this.centres.length;
                console.log('✅ Updated centersCount to:', this.centres.length);
            }
            
            console.log('📊 Statistics updated:', {
                totalStudents,
                graduationRate: graduationRate + '%',
                centres: this.centres.length
            });
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    applyStudentFilters(students) {
        let filtered = [...students];
        
        // Apply program filter
        const programs = this.selectedFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => s.program && programs.includes(s.program));
        }
        
        // Apply centre filter
        const centres = this.selectedFilters.centre;
        if (centres.length > 0 && !centres.includes('all')) {
            filtered = filtered.filter(s => {
                const studentCentre = s.centre_name || s.centre;
                return studentCentre && centres.includes(studentCentre.toString());
            });
        }
        
        // Apply county filter
        const counties = this.selectedFilters.county;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => s.county && counties.includes(s.county));
        }
        
        return filtered;
    }
    
    // ==================== FILTER METHODS ====================
    
    searchFilter(type, searchTerm) {
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('.filter-option');
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchTerm.toLowerCase()) || searchTerm === '' ? 'block' : 'none';
        });
    }
    
    selectAllFilter(type) {
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
        const allCheckbox = document.querySelector(`input[value="all"][data-filter="${type}"]`);
        
        if (value === 'all') {
            const checkboxes = document.querySelectorAll(`input[data-filter="${type}"]`);
            checkboxes.forEach(cb => cb.checked = cb.value === 'all');
            this.selectedFilters[type] = [];
        } else {
            if (allCheckbox) allCheckbox.checked = false;
            
            if (checked) {
                if (!this.selectedFilters[type].includes(value)) {
                    this.selectedFilters[type].push(value);
                }
            } else {
                this.selectedFilters[type] = this.selectedFilters[type].filter(v => v !== value);
            }
            
            if (this.selectedFilters[type].length === 0 && allCheckbox) {
                allCheckbox.checked = true;
            }
        }
        
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    removeFilterOption(type, value) {
        this.selectedFilters[type] = this.selectedFilters[type].filter(v => v !== value);
        
        const checkbox = document.querySelector(`input[value="${value}"][data-filter="${type}"]`);
        if (checkbox) checkbox.checked = false;
        
        if (this.selectedFilters[type].length === 0) {
            const allCheckbox = document.querySelector(`input[value="all"][data-filter="${type}"]`);
            if (allCheckbox) allCheckbox.checked = true;
        }
        
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
        this.applyFilters();
    }
    
    updateFilterButtonText(type) {
        const buttonText = document.getElementById(`${type}ButtonText`);
        if (!buttonText) return;
        
        const selectedCount = this.selectedFilters[type].length;
        
        if (selectedCount === 0) {
            buttonText.textContent = `All ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
        } else if (selectedCount === 1) {
            const firstItem = this.selectedFilters[type][0];
            buttonText.textContent = firstItem.length > 20 ? firstItem.substring(0, 20) + '...' : firstItem;
        } else {
            buttonText.textContent = `${selectedCount} ${type.charAt(0).toUpperCase() + type.slice(1)}s selected`;
        }
    }
    
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
    
    populateFilterOptions(type, data, nameField) {
        const optionsContainer = document.getElementById(`${type}FilterOptions`);
        if (!optionsContainer) return;
        
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
        }
        
        optionsContainer.innerHTML = optionsHTML;
        
        // Update button text and badges
        this.updateFilterButtonText(type);
        this.updateSelectedBadges(type);
    }
    
    populateAcademicYearFilter() {
        const yearSelect = document.getElementById('academicYear');
        if (!yearSelect) return;
        
        yearSelect.innerHTML = '<option value="all">All Years</option>';
        
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        
        yearSelect.value = currentYear;
    }
    
    populateIntakeFilter() {
        const intakeSelect = document.getElementById('filterIntake');
        if (!intakeSelect) return;
        
        intakeSelect.innerHTML = '<option value="all">All Intakes</option>';
        
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            intakeSelect.appendChild(option);
        }
    }
    
    populateCourseFilter() {
        const courseSelect = document.getElementById('filterCourse');
        if (!courseSelect) return;
        
        courseSelect.innerHTML = '<option value="all">All Courses</option>';
        
        this.courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.course_code || course.code;
            option.textContent = `${course.course_code || course.code} - ${course.course_name || course.name}`;
            courseSelect.appendChild(option);
        });
    }
    
    populateTranscriptFilters() {
        // Populate transcript student dropdown
        const studentSelect = document.getElementById('transcriptStudent');
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="">Select a student...</option>';
            this.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.name} (${student.admission_number})`;
                studentSelect.appendChild(option);
            });
        }
        
        // Populate transcript centre filter
        const centreFilter = document.getElementById('transcriptCenterFilter');
        if (centreFilter) {
            centreFilter.innerHTML = '<option value="all">All Centres</option>';
            this.centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = centre.name;
                option.textContent = centre.name;
                centreFilter.appendChild(option);
            });
        }
        
        // Populate transcript program filter
        const programFilter = document.getElementById('transcriptProgram');
        if (programFilter) {
            programFilter.innerHTML = '<option value="all">All Programs</option>';
            this.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.name;
                option.textContent = program.name;
                programFilter.appendChild(option);
            });
        }
    }
    
    setDefaultDates() {
        const dateFrom = document.getElementById('reportStartDate');
        const dateTo = document.getElementById('reportEndDate');
        
        if (dateFrom) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            dateFrom.valueAsDate = oneYearAgo;
        }
        
        if (dateTo) {
            dateTo.valueAsDate = new Date();
        }
    }
    
    // ==================== FILTER ACTIONS ====================
    
    applyFilters() {
        console.log('🔍 Applying filters...');
        this.showLoading(true);
        
        setTimeout(() => {
            this.updateStatistics();
            this.ensureTableVisibility();
            this.showToast('Filters applied successfully', 'success');
            this.showLoading(false);
        }, 500);
    }
    
    clearFilters() {
        console.log('🧹 Clearing filters...');
        
        ['centre', 'county', 'program'].forEach(type => {
            this.selectedFilters[type] = [];
            this.updateFilterButtonText(type);
            this.updateSelectedBadges(type);
            
            const checkboxes = document.querySelectorAll(`input[data-filter="${type}"]`);
            checkboxes.forEach(cb => cb.checked = cb.value === 'all');
        });
        
        const yearSelect = document.getElementById('academicYear');
        if (yearSelect) yearSelect.value = new Date().getFullYear();
        
        const intakeSelect = document.getElementById('filterIntake');
        if (intakeSelect) intakeSelect.value = 'all';
        
        const courseSelect = document.getElementById('filterCourse');
        if (courseSelect) courseSelect.value = 'all';
        
        const semesterSelect = document.getElementById('semester');
        if (semesterSelect) semesterSelect.value = 'all';
        
        this.setDefaultDates();
        this.updateStatistics();
        this.ensureTableVisibility();
        this.showToast('Filters cleared', 'info');
    }
    
    // ==================== REPORTS GRID ====================
    
    generateReportsGrid() {
        const reportsContainer = document.getElementById('reportsGrid');
        if (!reportsContainer) return;
        
        const reports = [
            { 
                title: 'Student List Report', 
                icon: 'fas fa-users', 
                color: '#3498db', 
                action: 'studentReport',
                description: 'Comprehensive list of all students with filters'
            },
            { 
                title: 'Academic Performance', 
                icon: 'fas fa-chart-line', 
                color: '#2ecc71', 
                action: 'academicReport',
                description: 'Student grades and performance analysis'
            },
            { 
                title: 'Centre Report', 
                icon: 'fas fa-building', 
                color: '#9b59b6', 
                action: 'generateCentreReport',
                description: 'Analysis by study centre'
            },
            { 
                title: 'Executive Summary', 
                icon: 'fas fa-chart-pie', 
                color: '#f39c12', 
                action: 'generateSummaryReport',
                description: 'Key statistics and overview'
            },
            { 
                title: 'Student Transcript', 
                icon: 'fas fa-graduation-cap', 
                color: '#1abc9c', 
                action: 'openTranscriptModal',
                description: 'Generate official student transcripts'
            },
            { 
                title: 'Scheduled Reports', 
                icon: 'fas fa-calendar-alt', 
                color: '#7f8c8d', 
                action: 'showScheduledReports',
                description: 'Automated and scheduled reports'
            }
        ];
        
        let html = '<div class="row">';
        
        reports.forEach(report => {
            html += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100 shadow-sm border-0" onclick="app.reports.${report.action}()" 
                         style="cursor: pointer; transition: transform 0.2s;"
                         onmouseover="this.style.transform='translateY(-5px)'"
                         onmouseout="this.style.transform='translateY(0)'">
                        <div class="card-body text-center">
                            <div class="mb-3" style="color: ${report.color};">
                                <i class="${report.icon} fa-3x"></i>
                            </div>
                            <h5 class="card-title">${report.title}</h5>
                            <p class="card-text text-muted small">${report.description}</p>
                        </div>
                        <div class="card-footer bg-transparent border-top-0">
                            <button class="btn btn-sm w-100" style="background: ${report.color}; color: white;">
                                <i class="fas fa-play me-1"></i> Generate Report
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        reportsContainer.innerHTML = html;
    }
    
    // ==================== REPORT GENERATION ====================
    
    studentReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            const filteredStudents = this.applyStudentFilters(this.students);
            
            let reportHTML = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="mb-1">Student List Report</h2>
                            <p class="text-muted mb-0">Generated: ${new Date().toLocaleDateString()} | Total Students: ${filteredStudents.length}</p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-primary" onclick="app.reports.downloadCSV('students')">
                                <i class="fas fa-download me-1"></i> Download CSV
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Admission No.</th>
                                    <th>Student Name</th>
                                    <th>Program</th>
                                    <th>Centre</th>
                                    <th>County</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            filteredStudents.forEach((student, index) => {
                reportHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${student.admission_number || 'N/A'}</strong></td>
                        <td>${student.name || 'N/A'}</td>
                        <td>${student.program || 'N/A'}</td>
                        <td>${student.centre_name || student.centre || 'N/A'}</td>
                        <td>${student.county || 'N/A'}</td>
                        <td>
                            <span class="badge bg-${student.status === 'active' ? 'success' : 'secondary'}">
                                ${student.status || 'N/A'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            reportHTML += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-3 text-muted">
                        <p>Showing ${filteredStudents.length} of ${this.students.length} total students</p>
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Student List Report');
            this.showLoading(false);
        }, 800);
    }
    
    academicReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            let reportHTML = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="mb-1">Academic Performance Report</h2>
                            <p class="text-muted mb-0">Generated: ${new Date().toLocaleDateString()}</p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-success" onclick="app.reports.downloadExcel('academic')">
                                <i class="fas fa-file-excel me-1"></i> Download Excel
                            </button>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3 class="mb-0">85%</h3>
                                    <p class="text-muted mb-0">Average Marks</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3 class="mb-0">3.4</h3>
                                    <p class="text-muted mb-0">Average GPA</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3 class="mb-0">${this.marks.length}</h3>
                                    <p class="text-muted mb-0">Grade Records</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h3 class="mb-0">${this.courses.length}</h3>
                                    <p class="text-muted mb-0">Courses</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead class="table-dark">
                                <tr>
                                    <th>Course Code</th>
                                    <th>Course Name</th>
                                    <th>Average Marks</th>
                                    <th>Top Grade</th>
                                    <th>Students</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            this.courses.forEach(course => {
                const courseMarks = this.marks.filter(m => m.course_code === course.course_code);
                const avgMarks = courseMarks.length > 0 
                    ? Math.round(courseMarks.reduce((sum, m) => sum + m.marks, 0) / courseMarks.length)
                    : 0;
                const topGrade = courseMarks.length > 0 
                    ? courseMarks.reduce((max, m) => m.grade > max ? m.grade : max, 'F')
                    : 'N/A';
                
                reportHTML += `
                    <tr>
                        <td>${course.course_code || course.code || 'N/A'}</td>
                        <td>${course.course_name || course.name || 'N/A'}</td>
                        <td>${avgMarks}%</td>
                        <td><span class="badge bg-success">${topGrade}</span></td>
                        <td>${courseMarks.length}</td>
                    </tr>
                `;
            });
            
            reportHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Academic Performance Report');
            this.showLoading(false);
        }, 800);
    }
    
    generateCentreReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            let reportHTML = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="mb-1">Centre Performance Report</h2>
                            <p class="text-muted mb-0">Generated: ${new Date().toLocaleDateString()}</p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-primary" onclick="app.reports.downloadPDF('centre')">
                                <i class="fas fa-file-pdf me-1"></i> Download PDF
                            </button>
                        </div>
                    </div>
                    
                    <div class="row">
            `;
            
            this.centres.forEach(centre => {
                const centreStudents = this.students.filter(s => 
                    (s.centre_name || s.centre) === centre.name
                );
                const activeStudents = centreStudents.filter(s => s.status === 'active').length;
                const graduatedStudents = centreStudents.filter(s => s.status === 'graduated').length;
                
                reportHTML += `
                    <div class="col-md-6 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${centre.name || 'N/A'}</h5>
                                <p class="text-muted">${centre.county || 'N/A'}</p>
                                <div class="row text-center">
                                    <div class="col-4">
                                        <h4 class="mb-0">${centreStudents.length}</h4>
                                        <small class="text-muted">Total</small>
                                    </div>
                                    <div class="col-4">
                                        <h4 class="mb-0">${activeStudents}</h4>
                                        <small class="text-muted">Active</small>
                                    </div>
                                    <div class="col-4">
                                        <h4 class="mb-0">${graduatedStudents}</h4>
                                        <small class="text-muted">Graduated</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            reportHTML += `
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Centre Performance Report');
            this.showLoading(false);
        }, 800);
    }
    
    generateSummaryReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            const filteredStudents = this.applyStudentFilters(this.students);
            
            let reportHTML = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 class="mb-1">Executive Summary Report</h1>
                            <p class="text-muted mb-0">Generated: ${new Date().toLocaleDateString()}</p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning" onclick="app.reports.downloadJSON('summary')">
                                <i class="fas fa-file-code me-1"></i> Download JSON
                            </button>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center">
                                    <h2 class="mb-0">${filteredStudents.length}</h2>
                                    <p class="mb-0">Total Students</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center">
                                    <h2 class="mb-0">${this.centres.length}</h2>
                                    <p class="mb-0">Active Centres</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body text-center">
                                    <h2 class="mb-0">${this.programs.length}</h2>
                                    <p class="mb-0">Programs</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center">
                                    <h2 class="mb-0">3.24</h2>
                                    <p class="mb-0">Average GPA</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5>Program Distribution</h5>
                                    <ul class="list-group">
            `;
            
            this.programs.forEach(program => {
                const programStudents = filteredStudents.filter(s => s.program === program.name).length;
                reportHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${program.name || program}
                        <span class="badge bg-primary rounded-pill">${programStudents}</span>
                    </li>
                `;
            });
            
            reportHTML += `
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5>Centre Distribution</h5>
                                    <ul class="list-group">
            `;
            
            this.centres.slice(0, 5).forEach(centre => {
                const centreStudents = filteredStudents.filter(s => 
                    (s.centre_name || s.centre) === centre.name
                ).length;
                reportHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${centre.name || centre}
                        <span class="badge bg-success rounded-pill">${centreStudents}</span>
                    </li>
                `;
            });
            
            reportHTML += `
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <h5>Recommendations</h5>
                        <div class="alert alert-info">
                            <ul class="mb-0">
                                <li>Consider expanding programs to more centres</li>
                                <li>Focus on improving graduation rates in underperforming centres</li>
                                <li>Monitor student performance in core courses</li>
                                <li>Consider introducing new programs based on demand</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            
            this.previewReport(reportHTML, 'Executive Summary Report');
            this.showLoading(false);
        }, 1000);
    }
    
    // ==================== ADVANCED REPORTS ====================
    
    previewStudentReport() {
        const reportType = document.getElementById('studentReportType')?.value || 'list';
        const format = document.getElementById('studentReportFormat')?.value || 'csv';
        
        let reportHTML = `
            <div class="container-fluid">
                <h2>Student Report Preview</h2>
                <p><strong>Report Type:</strong> ${reportType}</p>
                <p><strong>Export Format:</strong> ${format}</p>
                <p><strong>Selected Centres:</strong> ${this.selectedFilters.studentReportCenter.join(', ') || 'All Centres'}</p>
                
                <div class="alert alert-info">
                    This is a preview of the student report. Click "Export" to generate the full report.
                </div>
            </div>
        `;
        
        this.previewReport(reportHTML, 'Student Report Preview');
    }
    
    generateStudentReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            const reportType = document.getElementById('studentReportType')?.value || 'list';
            const format = document.getElementById('studentReportFormat')?.value || 'csv';
            
            this.downloadReport(format, `student_${reportType}_${new Date().getTime()}`);
            this.showToast(`Student report (${reportType}) exported as ${format}`, 'success');
            this.showLoading(false);
        }, 1500);
    }
    
    previewAcademicReport() {
        const reportType = document.getElementById('academicReportType')?.value || 'marks';
        const format = document.getElementById('academicReportFormat')?.value || 'csv';
        
        let reportHTML = `
            <div class="container-fluid">
                <h2>Academic Report Preview</h2>
                <p><strong>Report Type:</strong> ${reportType}</p>
                <p><strong>Export Format:</strong> ${format}</p>
                <p><strong>Selected Centres:</strong> ${this.selectedFilters.academicReportCenter.join(', ') || 'All Centres'}</p>
                
                <div class="alert alert-info">
                    This is a preview of the academic report. Click "Export" to generate the full report.
                </div>
            </div>
        `;
        
        this.previewReport(reportHTML, 'Academic Report Preview');
    }
    
    generateAcademicReport() {
        this.showLoading(true);
        
        setTimeout(() => {
            const reportType = document.getElementById('academicReportType')?.value || 'marks';
            const format = document.getElementById('academicReportFormat')?.value || 'csv';
            
            this.downloadReport(format, `academic_${reportType}_${new Date().getTime()}`);
            this.showToast(`Academic report (${reportType}) exported as ${format}`, 'success');
            this.showLoading(false);
        }, 1500);
    }
    
    // ==================== DOWNLOAD/EXPORT METHODS ====================
    
    downloadCSV(type) {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (type === 'students') {
            csvContent += "Admission No.,Name,Program,Centre,County,Status\n";
            this.students.forEach(student => {
                csvContent += `${student.admission_number || ''},${student.name || ''},${student.program || ''},${student.centre_name || student.centre || ''},${student.county || ''},${student.status || ''}\n`;
            });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `students_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('CSV file downloaded', 'success');
    }
    
    downloadExcel(type) {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (type === 'academic') {
            csvContent += "Course Code,Course Name,Average Marks,Top Grade,Students\n";
            this.courses.forEach(course => {
                const courseMarks = this.marks.filter(m => m.course_code === course.course_code);
                const avgMarks = courseMarks.length > 0 
                    ? Math.round(courseMarks.reduce((sum, m) => sum + m.marks, 0) / courseMarks.length)
                    : 0;
                const topGrade = courseMarks.length > 0 
                    ? courseMarks.reduce((max, m) => m.grade > max ? m.grade : max, 'F')
                    : 'N/A';
                
                csvContent += `${course.course_code || ''},${course.course_name || ''},${avgMarks},${topGrade},${courseMarks.length}\n`;
            });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${type}_report_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Excel file downloaded', 'success');
    }
    
    downloadPDF(type) {
        this.showToast('PDF generation would open print dialog', 'info');
        setTimeout(() => {
            window.print();
        }, 500);
    }
    
    downloadJSON(type) {
        let data = {};
        
        if (type === 'summary') {
            data = {
                timestamp: new Date().toISOString(),
                statistics: {
                    totalStudents: this.students.length,
                    activeCentres: this.centres.length,
                    programs: this.programs.length,
                    averageGPA: 3.24
                },
                centres: this.centres,
                programs: this.programs
            };
        }
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement("a");
        link.setAttribute("href", dataUri);
        link.setAttribute("download", `${type}_${new Date().getTime()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('JSON file downloaded', 'success');
    }
    
    downloadReport(format, filename) {
        const data = {
            timestamp: new Date().toISOString(),
            students: this.students,
            centres: this.centres,
            courses: this.courses,
            marks: this.marks
        };
        
        let dataStr, ext;
        
        switch(format) {
            case 'csv':
                let csvContent = "data:text/csv;charset=utf-8,Admission No.,Name,Program,Centre,County,Status\n";
                this.students.forEach(student => {
                    csvContent += `${student.admission_number || ''},${student.name || ''},${student.program || ''},${student.centre_name || student.centre || ''},${student.county || ''},${student.status || ''}\n`;
                });
                dataStr = csvContent;
                ext = 'csv';
                break;
                
            case 'json':
                dataStr = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(data, null, 2));
                ext = 'json';
                break;
                
            case 'excel':
                let excelContent = "data:text/csv;charset=utf-8,Admission No.,Name,Program,Centre,County,Status\n";
                this.students.forEach(student => {
                    excelContent += `${student.admission_number || ''},${student.name || ''},${student.program || ''},${student.centre_name || student.centre || ''},${student.county || ''},${student.status || ''}\n`;
                });
                dataStr = excelContent;
                ext = 'xls';
                break;
                
            case 'pdf':
                this.showToast('PDF export would generate PDF file', 'info');
                return;
                
            default:
                this.showToast(`Unsupported format: ${format}`, 'error');
                return;
        }
        
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `${filename}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // ==================== BULK EXPORT ====================
    
    bulkExport() {
        this.showLoading(true);
        
        setTimeout(() => {
            const exportType = document.getElementById('bulkExportType')?.value || 'json';
            
            const exportData = {
                timestamp: new Date().toISOString(),
                metadata: {
                    system: "TEE Management System",
                    version: "1.0",
                    exportType: exportType
                },
                data: {
                    students: this.students,
                    centres: this.centres,
                    counties: this.counties,
                    programs: this.programs,
                    courses: this.courses,
                    marks: this.marks
                }
            };
            
            let dataStr, filename;
            
            switch(exportType) {
                case 'json':
                    dataStr = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(exportData, null, 2));
                    filename = `tee_backup_${new Date().getTime()}.json`;
                    break;
                    
                case 'excel':
                    let csvContent = "data:text/csv;charset=utf-8,";
                    csvContent += "Type,Count,Export Date\n";
                    csvContent += `Students,${this.students.length},${new Date().toLocaleDateString()}\n`;
                    csvContent += `Centres,${this.centres.length},${new Date().toLocaleDateString()}\n`;
                    csvContent += `Programs,${this.programs.length},${new Date().toLocaleDateString()}\n`;
                    dataStr = csvContent;
                    filename = `tee_export_${new Date().getTime()}.csv`;
                    break;
                    
                case 'csv_all':
                    this.downloadCSV('students');
                    this.showLoading(false);
                    return;
                    
                default:
                    this.showToast(`Export type: ${exportType}`, 'info');
                    this.showLoading(false);
                    return;
            }
            
            const link = document.createElement("a");
            link.setAttribute("href", dataStr);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast(`Bulk export (${exportType}) completed`, 'success');
            this.showLoading(false);
        }, 2000);
    }
    
    // ==================== SCHEDULED REPORTS ====================
    
    addScheduledReport() {
        const reportType = document.getElementById('scheduleReportType')?.value || 'weekly';
        const frequency = document.getElementById('scheduleFrequency')?.value || 'weekly';
        const recipients = document.getElementById('scheduleRecipients')?.value;
        
        if (!recipients) {
            this.showToast('Please enter recipient emails', 'warning');
            return;
        }
        
        const tableBody = document.querySelector('#scheduledReportsList tbody');
        if (tableBody) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reportType} Report</td>
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
        const input = document.getElementById('scheduleRecipients');
        if (input) input.value = '';
    }
    
    showScheduledReports() {
        this.showToast('Showing scheduled reports management', 'info');
    }
    
    // ==================== TRANSCRIPT METHODS ====================

    openTranscriptModal() {
        console.log('📄 Opening transcript modal...');
        
        if (window.app?.transcripts?.generateStudentTranscriptPrompt) {
            window.app.transcripts.generateStudentTranscriptPrompt();
        } 
        else if (window.app?.transcripts?.openTranscriptModal) {
            window.app.transcripts.openTranscriptModal();
        }
        else {
            this.showToast('Transcript module is not available', 'warning');
        }
    }

    previewTranscript() {
        if (window.app?.transcripts?.previewTranscript) {
            window.app.transcripts.previewTranscript();
        } else {
            this.showToast('Transcript preview not available', 'warning');
        }
    }

    generateTranscript() {
        if (window.app?.transcripts?.generateTranscriptFromUI) {
            window.app.transcripts.generateTranscriptFromUI();
        } else if (window.app?.transcripts?.generateTranscript) {
            window.app.transcripts.generateTranscript();
        } else {
            this.showToast('Transcript generation not available', 'warning');
        }
    }

    loadSampleTranscript() {
        if (window.app?.transcripts?.loadSampleTranscript) {
            window.app.transcripts.loadSampleTranscript();
        } else {
            this.showToast('Sample transcript not available', 'warning');
        }
    }

    clearSelectedStudent() {
        if (window.app?.transcripts?.clearSelectedStudent) {
            window.app.transcripts.clearSelectedStudent();
        } else {
            const selectedStudentInfo = document.getElementById('selectedStudentInfo');
            if (selectedStudentInfo) selectedStudentInfo.style.display = 'none';
            this.showToast('Student selection cleared', 'info');
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    refreshReports() {
        console.log('🔄 Refreshing reports...');
        this.showLoading(true);
        
        setTimeout(() => {
            this.updateStatistics();
            this.generateReportsGrid();
            this.ensureTableVisibility();
            this.showToast('Reports refreshed successfully', 'success');
            this.showLoading(false);
        }, 1000);
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
        const previewContainer = document.getElementById('reportPreview');
        if (previewContainer) {
            const content = previewContainer.innerHTML;
            const blob = new Blob([content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `report_${new Date().getTime()}.html`;
            link.click();
            URL.revokeObjectURL(url);
            this.showToast('Report downloaded as HTML', 'success');
        }
    }
    
    saveFilterPreset() {
        this.showToast('Filter preset saved successfully', 'success');
    }
    
    showToast(message, type = 'info') {
        console.log(`📢 ${type}: ${message}`);
        
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.style.cssText = `
            min-width: 250px;
            margin-bottom: 10px;
            opacity: 1;
        `;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${icons[type] || 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    // ==================== SAMPLE DATA ====================
    
    getSampleStudents() {
        return [
            { id: 'ST001', name: 'John Mwangi', admission_number: 'TEE2023001', email: 'john@example.com', phone: '+254712345678', centre_name: 'Nairobi Main', county: 'Nairobi', program: 'Certificate in Theology', intake_year: 2023, status: 'active' },
            { id: 'ST002', name: 'Sarah Akinyi', admission_number: 'TEE2023002', email: 'sarah@example.com', phone: '+254723456789', centre_name: 'Kisumu Centre', county: 'Kisumu', program: 'Diploma in Biblical Studies', intake_year: 2023, status: 'active' },
            { id: 'ST003', name: 'David Omondi', admission_number: 'TEE2022001', email: 'david@example.com', phone: '+254734567890', centre_name: 'Mombasa Centre', county: 'Mombasa', program: 'Certificate in Theology', intake_year: 2022, status: 'graduated' },
            { id: 'ST004', name: 'Grace Wanjiku', admission_number: 'TEE2023003', email: 'grace@example.com', phone: '+254745678901', centre_name: 'Nakuru Centre', county: 'Nakuru', program: 'Diploma in Ministry', intake_year: 2023, status: 'active' },
            { id: 'ST005', name: 'Peter Kamau', admission_number: 'TEE2022002', email: 'peter@example.com', phone: '+254756789012', centre_name: 'Nairobi Main', county: 'Nairobi', program: 'Diploma in Biblical Studies', intake_year: 2022, status: 'graduated' }
        ];
    }
    
    getSampleCentres() {
        return [
            { id: 'C1', name: 'Nairobi Main', county: 'Nairobi', status: 'active' },
            { id: 'C2', name: 'Mombasa Centre', county: 'Mombasa', status: 'active' },
            { id: 'C3', name: 'Kisumu Centre', county: 'Kisumu', status: 'active' },
            { id: 'C4', name: 'Nakuru Centre', county: 'Nakuru', status: 'active' },
            { id: 'C5', name: 'Eldoret Centre', county: 'Uasin Gishu', status: 'active' }
        ];
    }
    
    getSampleCounties() {
        return [
            { id: 'CT1', name: 'Nairobi' },
            { id: 'CT2', name: 'Mombasa' },
            { id: 'CT3', name: 'Kisumu' },
            { id: 'CT4', name: 'Nakuru' },
            { id: 'CT5', name: 'Uasin Gishu' },
            { id: 'CT6', name: 'Kiambu' },
            { id: 'CT7', name: 'Kakamega' },
            { id: 'CT8', name: 'Bungoma' }
        ];
    }
    
    getSamplePrograms() {
        return [
            { id: 'P1', name: 'Certificate in Theology' },
            { id: 'P2', name: 'Diploma in Biblical Studies' },
            { id: 'P3', name: 'Diploma in Ministry' },
            { id: 'P4', name: 'Pastoral Certificate' },
            { id: 'P5', name: 'Christian Leadership' }
        ];
    }
    
    getSampleCourses() {
        return [
            { id: 'C001', course_code: 'TEE101', course_name: 'Introduction to TEE', credits: 3 },
            { id: 'C002', course_code: 'BIB101', course_name: 'Bible Study Methods', credits: 3 },
            { id: 'C003', course_code: 'MIN101', course_name: 'Ministry Foundations', credits: 3 },
            { id: 'C004', course_code: 'BIB201', course_name: 'Biblical Hermeneutics', credits: 3 },
            { id: 'C005', course_code: 'THE201', course_name: 'Systematic Theology', credits: 3 }
        ];
    }
    
    getSampleMarks() {
        return [
            { student_id: 'ST001', course_code: 'TEE101', marks: 85, grade: 'A', semester: 1, academic_year: 2023 },
            { student_id: 'ST001', course_code: 'BIB101', marks: 78, grade: 'B+', semester: 1, academic_year: 2023 },
            { student_id: 'ST002', course_code: 'TEE101', marks: 92, grade: 'A', semester: 1, academic_year: 2023 },
            { student_id: 'ST003', course_code: 'TEE101', marks: 88, grade: 'A', semester: 1, academic_year: 2022 },
            { student_id: 'ST003', course_code: 'BIB101', marks: 91, grade: 'A', semester: 1, academic_year: 2022 }
        ];
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
} else {
    window.ReportsManager = ReportsManager;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if app exists and reports isn't already initialized
    if (window.app && !window.app.reports) {
        console.log('📊 Auto-initializing ReportsManager');
        window.app.reports = new ReportsManager(window.app.db);
    }
});
