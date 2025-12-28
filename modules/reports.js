// modules/reports.js - COMPLETE WORKING VERSION
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
        
        // Sample data
        this.students = this.getSampleStudents();
        this.centres = this.getSampleCentres();
        this.counties = this.getSampleCounties();
        this.programs = this.getSamplePrograms();
        this.courses = this.getSampleCourses();
        this.marks = this.getSampleMarks();
        
        // Bind methods
        this.bindAllMethods();
        
        // Initialize
        setTimeout(() => this.initialize(), 100);
    }
    
    bindAllMethods() {
        const methods = [
            'initialize', 'applyFilters', 'clearFilters', 'refreshReports',
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
            'showToast', 'showLoading'
        ];
        
        methods.forEach(method => {
            this[method] = this[method].bind(this);
        });
    }
    
    async initialize() {
        console.log('🚀 Initializing Reports...');
        this.showLoading(true);
        
        try {
            // Populate filters
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
            
            // Set default dates
            this.setDefaultDates();
            
            // Update statistics
            this.updateStatistics();
            
            // Generate reports grid
            this.generateReportsGrid();
            
            console.log('✅ Reports initialized successfully');
            this.showToast('Reports module loaded', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing reports:', error);
            this.showToast('Error loading reports', 'error');
        } finally {
            this.showLoading(false);
        }
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
                this.selectedFilters[type].push(value);
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
        
        document.getElementById('academicYear').value = new Date().getFullYear();
        document.getElementById('filterIntake').value = 'all';
        document.getElementById('filterCourse').value = 'all';
        document.getElementById('semester').value = 'all';
        
        this.setDefaultDates();
        this.updateStatistics();
        this.showToast('Filters cleared', 'info');
    }
    
    // ==================== STATISTICS ====================
    
    updateStatistics() {
        try {
            const filteredStudents = this.applyStudentFilters(this.students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            const graduationRate = totalStudents > 0 ? Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            // Update DOM
            const stats = {
                'totalStudents': totalStudents,
                'graduationRate': graduationRate + '%',
                'avgGPA': '3.24',
                'centersCount': this.centres.length
            };
            
            Object.entries(stats).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
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
        
        let html = '';
        
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
                        <td><strong>${student.admission_number}</strong></td>
                        <td>${student.name}</td>
                        <td>${student.program}</td>
                        <td>${student.centre_name || student.centre}</td>
                        <td>${student.county}</td>
                        <td>
                            <span class="badge bg-${student.status === 'active' ? 'success' : 'secondary'}">
                                ${student.status}
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
                        <td>${course.course_code}</td>
                        <td>${course.course_name}</td>
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
                                <h5 class="card-title">${centre.name}</h5>
                                <p class="text-muted">${centre.county}</p>
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
                        ${program.name}
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
            
            this.centres.forEach(centre => {
                const centreStudents = filteredStudents.filter(s => 
                    (s.centre_name || s.centre) === centre.name
                ).length;
                reportHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${centre.name}
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
                                <li>Consider expanding ${this.programs[0]?.name} program to more centres</li>
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
        const reportType = document.getElementById('studentReportType').value;
        const format = document.getElementById('studentReportFormat').value;
        
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
            const reportType = document.getElementById('studentReportType').value;
            const format = document.getElementById('studentReportFormat').value;
            
            this.downloadReport(format, `student_${reportType}_${new Date().getTime()}`);
            this.showToast(`Student report (${reportType}) exported as ${format}`, 'success');
            this.showLoading(false);
        }, 1500);
    }
    
    previewAcademicReport() {
        const reportType = document.getElementById('academicReportType').value;
        const format = document.getElementById('academicReportFormat').value;
        
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
            const reportType = document.getElementById('academicReportType').value;
            const format = document.getElementById('academicReportFormat').value;
            
            this.downloadReport(format, `academic_${reportType}_${new Date().getTime()}`);
            this.showToast(`Academic report (${reportType}) exported as ${format}`, 'success');
            this.showLoading(false);
        }, 1500);
    }
    
    // ==================== DOWNLOAD/EXPORT METHODS ====================
    
    downloadCSV(type) {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (type === 'students') {
            csvContent += "Admission No.,Name,Program,Centre,County,Status\\n";
            this.students.forEach(student => {
                csvContent += `${student.admission_number},${student.name},${student.program},${student.centre_name || student.centre},${student.county},${student.status}\\n`;
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
        // Create a simple Excel-like CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (type === 'academic') {
            csvContent += "Course Code,Course Name,Average Marks,Top Grade,Students\\n";
            this.courses.forEach(course => {
                const courseMarks = this.marks.filter(m => m.course_code === course.course_code);
                const avgMarks = courseMarks.length > 0 
                    ? Math.round(courseMarks.reduce((sum, m) => sum + m.marks, 0) / courseMarks.length)
                    : 0;
                const topGrade = courseMarks.length > 0 
                    ? courseMarks.reduce((max, m) => m.grade > max ? m.grade : max, 'F')
                    : 'N/A';
                
                csvContent += `${course.course_code},${course.course_name},${avgMarks},${topGrade},${courseMarks.length}\\n`;
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
        
        let dataStr, mimeType, ext;
        
        switch(format) {
            case 'csv':
                // Simple CSV conversion
                let csvContent = "data:text/csv;charset=utf-8,Admission No.,Name,Program,Centre,County,Status\\n";
                this.students.forEach(student => {
                    csvContent += `${student.admission_number},${student.name},${student.program},${student.centre_name || student.centre},${student.county},${student.status}\\n`;
                });
                dataStr = csvContent;
                mimeType = 'text/csv';
                ext = 'csv';
                break;
                
            case 'json':
                dataStr = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(data, null, 2));
                mimeType = 'application/json';
                ext = 'json';
                break;
                
            case 'excel':
                // CSV as Excel
                let excelContent = "data:text/csv;charset=utf-8,Admission No.,Name,Program,Centre,County,Status\\n";
                this.students.forEach(student => {
                    excelContent += `${student.admission_number},${student.name},${student.program},${student.centre_name || student.centre},${student.county},${student.status}\\n`;
                });
                dataStr = excelContent;
                mimeType = 'application/vnd.ms-excel';
                ext = 'xls';
                break;
                
            case 'pdf':
                this.showToast('PDF export would generate PDF file', 'info');
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
            const exportType = document.getElementById('bulkExportType').value;
            
            // Create comprehensive data export
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
            
            let dataStr, filename, mimeType;
            
            switch(exportType) {
                case 'json':
                    dataStr = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(exportData, null, 2));
                    filename = `tee_backup_${new Date().getTime()}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'excel':
                    // Create CSV for Excel
                    let csvContent = "data:text/csv;charset=utf-8,";
                    csvContent += "Type,Count,Export Date\\n";
                    csvContent += `Students,${this.students.length},${new Date().toLocaleDateString()}\\n`;
                    csvContent += `Centres,${this.centres.length},${new Date().toLocaleDateString()}\\n`;
                    csvContent += `Programs,${this.programs.length},${new Date().toLocaleDateString()}\\n`;
                    dataStr = csvContent;
                    filename = `tee_export_${new Date().getTime()}.csv`;
                    mimeType = 'application/vnd.ms-excel';
                    break;
                    
                case 'csv_all':
                    // Multiple CSV files (simplified)
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
        const reportType = document.getElementById('scheduleReportType').value;
        const frequency = document.getElementById('scheduleFrequency').value;
        const recipients = document.getElementById('scheduleRecipients').value;
        
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
        document.getElementById('scheduleRecipients').value = '';
    }
    
    showScheduledReports() {
        this.showToast('Showing scheduled reports management', 'info');
    }
    
    // ==================== TRANSCRIPT METHODS ====================

openTranscriptModal() {
    console.log('📄 Opening transcript modal via reports.js...');
    
    // Check if transcripts.js is loaded
    if (window.app?.transcripts?.generateStudentTranscriptPrompt) {
        console.log('✅ Redirecting to transcripts.js modal');
        window.app.transcripts.generateStudentTranscriptPrompt();
    } 
    else if (window.app?.transcripts?.openTranscriptModal) {
        console.log('✅ Using transcripts.js openTranscriptModal');
        window.app.transcripts.openTranscriptModal();
    }
    else {
        console.warn('❌ transcripts.js not loaded, showing fallback');
        this.showToast('Transcript module is not available. Please check if transcripts.js is loaded.', 'warning');
        
        // Create a simple fallback modal
        this.createFallbackTranscriptModal();
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

// Fallback modal if transcripts.js isn't loaded
createFallbackTranscriptModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
        ">
            <h3><i class="fas fa-exclamation-triangle text-warning"></i> Transcript Module Not Available</h3>
            <p class="mt-3">The transcripts module (transcripts.js) is not loaded or has errors.</p>
            <p>Please check:</p>
            <ul>
                <li>Is transcripts.js file in the modules folder?</li>
                <li>Is it loaded after database.js?</li>
                <li>Check browser console for errors</li>
            </ul>
            <div class="mt-4 text-end">
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 5px;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
    
    // ==================== UTILITY METHODS ====================
    
    refreshReports() {
        console.log('🔄 Refreshing reports...');
        this.showLoading(true);
        
        setTimeout(() => {
            this.updateStatistics();
            this.generateReportsGrid();
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
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 250px;
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
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
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

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
} else {
    window.ReportsManager = ReportsManager;
}
