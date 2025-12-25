// modules/reports.js - COMPLETE FIXED VERSION
class ReportsManager {
    constructor(db) {
        console.log('📊 ReportsManager constructor called');
        
        // Proper database connection
        this.db = db || window.app?.db;
        this.app = window.app || window;
        
        // Log database availability
        if (this.db) {
            console.log('✅ Database connected to ReportsManager');
        } else {
            console.warn('⚠️ Database not available in constructor, will try during initialization');
        }
        
        // Initialize filters with proper defaults
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
        
        // Bind methods to ensure proper 'this' context
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
    }
    
    // ==================== INITIALIZATION ====================
    
    async initialize() {
        if (this.initialized) {
            console.log('ReportsManager already initialized');
            return;
        }
        
        try {
            console.log('📊 Initializing Reports Manager...');
            this.showLoading(true);
            
            // Load data first
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
            
            // Load data in parallel for better performance
            const [studentsData, coursesData, marksData] = await Promise.all([
                this.getStudents(),
                this.getCourses(),
                this.getMarks()
            ]);
            
            this.students = studentsData || [];
            this.courses = coursesData || [];
            this.marks = marksData || [];
            
            console.log(`📊 Data loaded: ${this.students.length} students, ${this.courses.length} courses, ${this.marks.length} marks`);
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showToast('Error loading report data', 'error');
            // Initialize with empty arrays to prevent crashes
            this.students = this.students || [];
            this.courses = this.courses || [];
            this.marks = this.marks || [];
        }
    }
    
    async initializeReportsUI() {
        try {
            // Populate all filters
            await this.populateAllFilters();
            
            // Set default dates
            this.setDefaultDates();
            
            // Initialize transcript section
            await this.populateTranscriptStudents();
            
            console.log('✅ Reports UI initialized');
            
        } catch (error) {
            console.error('❌ Error initializing reports UI:', error);
            throw error;
        }
    }
    
    async populateAllFilters() {
        try {
            console.log('🔄 Populating all filters...');
            
            // Get all data needed for filters
            const [centres, counties, programs, students, courses] = await Promise.all([
                this.getCentres(),
                this.getCounties(),
                this.getPrograms(),
                this.getStudents(),
                this.getCourses()
            ]);
            
            // 1. Academic Year filter
            this.populateAcademicYearFilter();
            
            // 2. Centre filters (all select elements that need centres)
            this.populateCentreFilters(centres);
            
            // 3. County filters
            this.populateCountyFilters(counties);
            
            // 4. Program filter
            this.populateProgramFilter(programs);
            
            // 5. Intake filter
            this.populateIntakeFilter(students);
            
            // 6. Course filter
            this.populateCourseFilter(courses);
            
            console.log('✅ All filters populated successfully');
            
        } catch (error) {
            console.error('❌ Error populating filters:', error);
            this.showToast('Error loading filter data', 'error');
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
    
    populateCentreFilters(centres) {
        const centreSelects = [
            'filterCenter', 
            'studentReportCenter', 
            'academicReportCenter',
            'transcriptCenterFilter',
            'bulkExportCenters',
            'scheduleCenter'
        ];
        
        centreSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options
                select.innerHTML = '';
                
                // Add "All Centres" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Centres';
                select.appendChild(allOption);
                
                // Add centre options from database
                if (centres && centres.length > 0) {
                    centres.forEach(centre => {
                        const option = document.createElement('option');
                        option.value = centre.id || centre.name || centre;
                        option.textContent = centre.name || centre.code || centre;
                        
                        // Add county if available
                        if (centre.county) {
                            option.textContent += ` (${centre.county})`;
                        }
                        
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ Populated ${selectId} with ${centres.length} centres`);
                } else {
                    console.warn(`No centres data for ${selectId}`);
                }
            } else {
                console.warn(`⚠️ Select element ${selectId} not found`);
            }
        });
    }
    
    populateCountyFilters(counties) {
        const countySelects = ['filterCounty'];
        
        countySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '';
                
                // Add "All Counties" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Counties';
                select.appendChild(allOption);
                
                // Add county options
                if (counties && counties.length > 0) {
                    counties.forEach(county => {
                        const option = document.createElement('option');
                        option.value = county.name || county;
                        option.textContent = county.name || county;
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ Populated ${selectId} with ${counties.length} counties`);
                }
            }
        });
    }
    
    populateProgramFilter(programs) {
        const programSelect = document.getElementById('filterProgram');
        if (programSelect) {
            programSelect.innerHTML = '';
            
            // Add "All Programs" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Programs';
            programSelect.appendChild(allOption);
            
            // Add program options
            if (programs && programs.length > 0) {
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.code || program.name || program.id;
                    option.textContent = program.name || program.code || 'Unknown Program';
                    programSelect.appendChild(option);
                });
                
                console.log(`✅ Populated program filter with ${programs.length} programs`);
            }
        }
    }
    
    populateIntakeFilter(students) {
        const intakeSelect = document.getElementById('filterIntake');
        if (intakeSelect) {
            intakeSelect.innerHTML = '';
            
            // Add "All Intakes" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Intakes';
            intakeSelect.appendChild(allOption);
            
            // Get unique intake years from students
            const intakeYears = [...new Set(students.map(s => s.intake_year || s.intake).filter(Boolean))]
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
        }
    }
    
    populateCourseFilter(courses) {
        const courseSelect = document.getElementById('filterCourse');
        if (courseSelect) {
            courseSelect.innerHTML = '';
            
            // Add "All Courses" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Courses';
            courseSelect.appendChild(allOption);
            
            // Add course options
            if (courses && courses.length > 0) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.course_code || course.code || course.id;
                    option.textContent = course.course_name || course.name || 'Unknown Course';
                    
                    // Add credits if available
                    if (course.credits) {
                        option.textContent += ` (${course.credits} credits)`;
                    }
                    
                    courseSelect.appendChild(option);
                });
            }
        }
    }
    
    async populateTranscriptStudents() {
        try {
            const studentSelect = document.getElementById('transcriptStudent');
            if (!studentSelect) {
                console.warn('⚠️ transcriptStudent element not found');
                return;
            }
            
            // Clear existing options
            studentSelect.innerHTML = '';
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Get all students
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            // Add student options
            if (students && students.length > 0) {
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id || student.reg_number;
                    option.textContent = `${student.reg_number || 'N/A'} - ${student.full_name || student.name || 'Unknown Student'}`;
                    
                    // Add student centre if available
                    if (student.centre_name || student.centre) {
                        option.textContent += ` (${student.centre_name || student.centre})`;
                    }
                    
                    studentSelect.appendChild(option);
                });
                
                console.log(`✅ Loaded ${students.length} students for transcript generation`);
            } else {
                console.warn('⚠️ No students found for transcript generation');
                
                // Add a disabled option to indicate no students
                const noStudentsOption = document.createElement('option');
                noStudentsOption.value = '';
                noStudentsOption.textContent = 'No students available';
                noStudentsOption.disabled = true;
                studentSelect.appendChild(noStudentsOption);
            }
            
        } catch (error) {
            console.error('❌ Error populating transcript students:', error);
            this.showToast('Error loading student list', 'error');
        }
    }
    
    // ==================== DATABASE METHODS ====================
    
    async getStudents() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getStudents');
                return this.students || [];
            }
            
            if (typeof this.db.getStudents === 'function') {
                const students = await this.db.getStudents();
                this.students = students || [];
                return this.students;
            } else {
                console.warn('⚠️ getStudents method not available on db');
                return this.students || [];
            }
        } catch (error) {
            console.error('❌ Error getting students:', error);
            return this.students || [];
        }
    }
    
    async getStudentById(studentId) {
        try {
            // First check if we have the student in memory
            if (this.students && this.students.length > 0) {
                const student = this.students.find(s => 
                    s.id == studentId || s.reg_number == studentId
                );
                if (student) return student;
            }
            
            // If not found, try database method
            if (this.db && typeof this.db.getStudent === 'function') {
                return await this.db.getStudent(studentId);
            }
            
            console.warn(`⚠️ Student with ID ${studentId} not found`);
            return null;
            
        } catch (error) {
            console.error('❌ Error getting student by ID:', error);
            return null;
        }
    }
    
    async getCourses() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getCourses');
                return this.courses || [];
            }
            
            if (typeof this.db.getCourses === 'function') {
                const courses = await this.db.getCourses();
                this.courses = courses || [];
                return this.courses;
            } else {
                console.warn('⚠️ getCourses method not available on db');
                return this.courses || [];
            }
        } catch (error) {
            console.error('❌ Error getting courses:', error);
            return this.courses || [];
        }
    }
    
    async getMarks() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getMarks');
                return this.marks || [];
            }
            
            if (typeof this.db.getMarks === 'function') {
                const marks = await this.db.getMarks();
                this.marks = marks || [];
                return this.marks;
            } else {
                console.warn('⚠️ getMarks method not available on db');
                return this.marks || [];
            }
        } catch (error) {
            console.error('❌ Error getting marks:', error);
            return this.marks || [];
        }
    }
    
    async getMarksByStudent(studentId) {
        try {
            // First filter from memory
            if (this.marks && this.marks.length > 0) {
                return this.marks.filter(mark => mark.student_id == studentId);
            }
            
            // Try database method
            if (this.db && typeof this.db.getStudentMarks === 'function') {
                return await this.db.getStudentMarks(studentId);
            }
            
            // Fallback: get all marks and filter
            const allMarks = await this.getMarks();
            return allMarks.filter(mark => mark.student_id == studentId);
            
        } catch (error) {
            console.error('❌ Error getting marks by student:', error);
            return [];
        }
    }
    
    async getCentres() {
        try {
            if (this.db && typeof this.db.getCentres === 'function') {
                return await this.db.getCentres();
            }
            
            // Fallback: extract from students
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const centres = [...new Set(students.map(s => s.centre_name || s.centre).filter(Boolean))];
            
            return centres.map(centre => ({ 
                name: centre,
                id: centre // Use name as ID for fallback
            }));
            
        } catch (error) {
            console.error('❌ Error getting centres:', error);
            return [];
        }
    }
    
    async getCounties() {
        try {
            if (this.db && typeof this.db.getCounties === 'function') {
                return await this.db.getCounties();
            }
            
            // Fallback: extract from students
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const counties = [...new Set(students.map(s => s.county).filter(Boolean))];
            
            return counties.map(county => ({ 
                name: county,
                id: county // Use name as ID for fallback
            }));
            
        } catch (error) {
            console.error('❌ Error getting counties:', error);
            return [];
        }
    }
    
    async getPrograms() {
        try {
            if (this.db && typeof this.db.getPrograms === 'function') {
                return await this.db.getPrograms();
            }
            
            // Fallback: extract from students
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const programs = [...new Set(students.map(s => s.program).filter(Boolean))];
            
            return programs.map(program => ({ 
                name: program,
                code: program // Use name as code for fallback
            }));
            
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            return [];
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
                    action: 'openTranscriptSection'
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
                        <div class="report-card" onclick="if(window.app && window.app.reports && window.app.reports.${report.action}) { window.app.reports.${report.action}(); } else { console.error('Report action not available'); }" 
                             style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; 
                                    background: white; cursor: pointer; height: 100%;
                                    transition: transform 0.2s, box-shadow 0.2s;"
                             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.1)'"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <div style="width: 50px; height: 50px; border-radius: 10px; 
                                            background: ${report.color}; display: flex; 
                                            align-items: center; justify-content: center; 
                                            margin-right: 15px;">
                                    <i class="${report.icon}" style="font-size: 24px; color: white;"></i>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 1.1rem;">${report.title}</h4>
                                    <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">
                                        ${report.description}
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                                <span style="font-size: 0.8rem; color: #95a5a6;">
                                    <i class="fas fa-clock"></i> Click to generate
                                </span>
                                <button class="btn btn-sm" 
                                        style="background: ${report.color}; color: white; border: none;
                                               padding: 5px 15px; border-radius: 4px; font-size: 0.85rem;">
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
    
    // ==================== HELPER METHODS ====================
    
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
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Update all onclick handlers
        this.updateButtonListeners();
        
        // Setup filter change listeners
        this.setupFilterChangeListeners();
        
        console.log('✅ Event listeners setup complete');
    }
    
    setupFilterChangeListeners() {
        // Transcript Centre Filter
        const transcriptCentreFilter = document.getElementById('transcriptCenterFilter');
        if (transcriptCentreFilter) {
            transcriptCentreFilter.addEventListener('change', () => this.filterTranscriptStudentsByCenter());
        }
        
        // Apply filters on change for certain filters
        const autoApplyFilters = ['academicYear', 'filterProgram', 'filterCenter', 'filterCounty', 'filterIntake'];
        autoApplyFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
    }
    
    updateButtonListeners() {
        console.log('🔄 Updating button listeners...');
        
        // Direct method binding for critical buttons
        this.bindButton('applyFilters', this.applyFilters);
        this.bindButton('clearFilters', this.clearFilters);
        this.bindButton('refreshReports', this.refreshReports);
        this.bindButton('saveFilterPreset', this.saveFilterPreset);
        this.bindButton('clearPreview', this.clearPreview);
        this.bindButton('downloadPreview', this.downloadPreview);
        
        // Report generation buttons
        this.bindButton('generateSummaryReport', this.generateSummaryReport);
        this.bindButton('generateCentreReport', this.generateCentreReport);
        this.bindButton('studentReport', this.studentReport);
        this.bindButton('academicReport', this.academicReport);
        this.bindButton('quickStudentReport', this.studentReport);
        this.bindButton('quickAcademicReport', this.academicReport);
        this.bindButton('previewStudentReport', this.previewStudentReport);
        this.bindButton('previewAcademicReport', this.previewAcademicReport);
        
        // Transcript buttons
        this.bindButton('previewTranscript', this.previewTranscript);
        this.bindButton('generateTranscript', this.generateTranscript);
        this.bindButton('loadSampleTranscript', this.loadSampleTranscript);
        this.bindButton('bulkTranscripts', this.bulkTranscripts);
        this.bindButton('bulkExport', this.bulkExport);
        this.bindButton('addScheduledReport', this.addScheduledReport);
        
        // Also update all onclick attributes globally
        this.updateAllOnclickHandlers();
        
        console.log('✅ Button listeners updated');
    }
    
    bindButton(elementId, method) {
        const element = document.getElementById(elementId);
        if (element) {
            element.onclick = method;
        } else {
            // Try to find by partial match
            const elements = document.querySelectorAll(`[id*="${elementId}"], [onclick*="${elementId}"]`);
            elements.forEach(el => {
                if (el.onclick === null || el.getAttribute('onclick')?.includes(elementId)) {
                    el.onclick = method;
                }
            });
        }
    }
    
    updateAllOnclickHandlers() {
        // Map of onclick strings to methods
        const handlerMap = {
            'app.reports.studentReport()': this.studentReport,
            'app.reports.academicReport()': this.academicReport,
            'app.reports.generateCentreReport()': this.generateCentreReport,
            'app.reports.generateSummaryReport()': this.generateSummaryReport,
            'app.reports.previewStudentReport()': this.previewStudentReport,
            'app.reports.previewAcademicReport()': this.previewAcademicReport,
            'app.reports.quickStudentReport()': this.studentReport,
            'app.reports.quickAcademicReport()': this.academicReport,
            'app.reports.previewTranscript()': this.previewTranscript,
            'app.reports.generateTranscript()': this.generateTranscript,
            'app.reports.bulkExport()': this.bulkExport,
            'app.reports.loadSampleTranscript()': this.loadSampleTranscript,
            'app.reports.clearPreview()': this.clearPreview,
            'app.reports.addScheduledReport()': this.addScheduledReport,
            'app.reports.saveFilterPreset()': this.saveFilterPreset,
            'app.reports.downloadPreview()': this.downloadPreview,
            'app.reports.bulkTranscripts()': this.bulkTranscripts,
            'app.reports.refreshReports()': this.refreshReports,
            'app.reports.applyFilters()': this.applyFilters,
            'app.reports.clearFilters()': this.clearFilters
        };
        
        // Update all buttons with onclick attributes
        document.querySelectorAll('[onclick]').forEach(element => {
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr) {
                // Check if this onclick matches any in our map
                for (const [pattern, handler] of Object.entries(handlerMap)) {
                    if (onclickAttr.includes(pattern.replace('app.reports.', '').replace('()', ''))) {
                        element.onclick = handler;
                        break;
                    }
                }
            }
        });
    }
    
    async filterTranscriptStudentsByCenter() {
        try {
            const centreFilter = document.getElementById('transcriptCenterFilter');
            const studentSelect = document.getElementById('transcriptStudent');
            
            if (!centreFilter || !studentSelect) return;
            
            const selectedCentre = centreFilter.value;
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            // Clear existing options
            studentSelect.innerHTML = '';
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Filter students by centre
            const filteredStudents = selectedCentre === 'all' 
                ? students 
                : students.filter(student => 
                    (student.centre_name === selectedCentre) || 
                    (student.centre === selectedCentre) ||
                    (student.centre_id === selectedCentre)
                );
            
            // Add filtered students
            filteredStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id || student.reg_number;
                option.textContent = `${student.reg_number || 'N/A'} - ${student.full_name || student.name || 'Unknown Student'}`;
                
                if (student.centre_name || student.centre) {
                    option.textContent += ` (${student.centre_name || student.centre})`;
                }
                
                studentSelect.appendChild(option);
            });
            
            console.log(`Filtered ${filteredStudents.length} students for centre: ${selectedCentre}`);
            
        } catch (error) {
            console.error('Error filtering transcript students by centre:', error);
        }
    }
    
    // ==================== TRANSCRIPT METHODS ====================
    
    async generateTranscriptData(studentId) {
        try {
            console.log('📄 Generating transcript data for student ID:', studentId);
            
            const student = await this.getStudentById(studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            const marks = await this.getMarksByStudent(studentId);
            console.log(`Found ${marks.length} marks for student`);
            
            // Group marks by course
            const coursesMap = {};
            
            marks.forEach(mark => {
                const courseId = mark.course_id || mark.course_code;
                if (!courseId) return;
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        course_id: courseId,
                        course_name: mark.course_name,
                        marks: [],
                        totalScore: 0,
                        totalMaxScore: 0
                    };
                }
                
                coursesMap[courseId].marks.push({
                    assessment_name: mark.assessment_name || 'Assessment',
                    assessment_type: mark.assessment_type || 'Exam',
                    score: mark.score || 0,
                    max_score: mark.max_score || 100,
                    percentage: mark.percentage || 0,
                    grade: mark.grade || 'N/A',
                    date: mark.assessment_date || mark.created_at || new Date().toISOString()
                });
                
                coursesMap[courseId].totalScore += mark.score || 0;
                coursesMap[courseId].totalMaxScore += mark.max_score || 100;
            });
            
            // Get course details and calculate final grades
            const allCourses = this.courses.length > 0 ? this.courses : await this.getCourses();
            const courseList = [];
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            Object.values(coursesMap).forEach(courseData => {
                const course = allCourses.find(c => 
                    c.id === courseData.course_id || 
                    c.course_code === courseData.course_id ||
                    c.code === courseData.course_id
                );
                
                const courseName = courseData.course_name || (course ? course.course_name || course.name : 'Unknown Course');
                const courseCode = courseData.course_id;
                const finalScore = courseData.totalMaxScore > 0 
                    ? (courseData.totalScore / courseData.totalMaxScore) * 100 
                    : 0;
                
                const grade = this.calculateGrade(finalScore);
                const gradePoints = this.getGradePoints(grade);
                const credits = course?.credits || 3;
                
                totalCredits += credits;
                totalGradePoints += gradePoints * credits;
                
                courseList.push({
                    course_code: courseCode,
                    course_name: courseName,
                    credits: credits,
                    semester: course?.semester || 1,
                    final_score: finalScore.toFixed(1),
                    grade: grade,
                    grade_points: gradePoints,
                    assessments: courseData.marks
                });
            });
            
            // Sort by semester
            courseList.sort((a, b) => a.semester - b.semester);
            
            // Calculate GPA
            const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
            
            return {
                student: {
                    id: student.id,
                    reg_number: student.reg_number,
                    full_name: student.full_name || student.name,
                    program: student.program,
                    centre: student.centre_name || student.centre || 'Not specified',
                    intake_year: student.intake_year || student.intake,
                    status: student.status || 'active',
                    date_of_birth: student.date_of_birth,
                    gender: student.gender,
                    email: student.email,
                    phone: student.phone
                },
                courses: courseList,
                summary: {
                    total_courses: courseList.length,
                    total_credits: totalCredits,
                    gpa: parseFloat(gpa),
                    cumulative_gpa: parseFloat(gpa),
                    date_generated: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating transcript data:', error);
            throw error;
        }
    }
    
    async previewTranscript() {
        try {
            const studentId = this.getSafeElementValue('transcriptStudent');
            
            if (!studentId) {
                this.showToast('Please select a student', 'warning');
                return;
            }
            
            console.log('Previewing transcript for student ID:', studentId);
            
            const data = await this.generateTranscriptData(studentId);
            this.previewTranscriptData(data);
            
            this.showToast('Transcript preview loaded', 'success');
            
        } catch (error) {
            console.error('❌ Error previewing transcript:', error);
            this.showToast('Error previewing transcript: ' + error.message, 'error');
        }
    }
    
    async generateTranscript() {
        try {
            const studentId = this.getSafeElementValue('transcriptStudent');
            const format = this.getSafeElementValue('transcriptFormat', 'pdf');
            
            if (!studentId) {
                this.showToast('Please select a student', 'warning');
                return;
            }
            
            console.log(`📄 Generating ${format.toUpperCase()} transcript for student ID: ${studentId}`);
            
            const data = await this.generateTranscriptData(studentId);
            
            if (format === 'pdf') {
                await this.exportTranscriptToPDF(data);
            } else {
                await this.exportData(data.courses, `transcript-${data.student.reg_number}`, format);
            }
            
            this.showToast('Transcript generated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error generating transcript:', error);
            this.showToast('Error generating transcript: ' + error.message, 'error');
        }
    }
    
    previewTranscriptData(transcriptData) {
        try {
            const previewDiv = document.getElementById('transcriptPreview');
            if (!previewDiv) {
                console.warn('transcriptPreview element not found');
                return;
            }
            
            let html = `
                <div class="transcript-preview" style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 100%; overflow-x: auto;">
                    <div class="transcript-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin-bottom: 5px;">TEE College</h2>
                        <h3 style="color: #7f8c8d; font-weight: normal; margin-bottom: 20px;">Academic Transcript</h3>
                    </div>
                    
                    <div class="student-info" style="margin-bottom: 30px;">
                        <div class="row" style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Student Name:</strong>
                                <div style="color: #34495e;">${transcriptData.student.full_name}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Registration Number:</strong>
                                <div style="color: #34495e;"><code>${transcriptData.student.reg_number}</code></div>
                            </div>
                        </div>
                        <div class="row" style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Program:</strong>
                                <div style="color: #34495e;">${transcriptData.student.program}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Study Centre:</strong>
                                <div style="color: #34495e;">${transcriptData.student.centre}</div>
                            </div>
                        </div>
                        <div class="row" style="display: flex; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Intake Year:</strong>
                                <div style="color: #34495e;">${transcriptData.student.intake_year}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Status:</strong>
                                <span class="badge" 
                                      style="background: ${transcriptData.student.status === 'active' ? '#2ecc71' : '#95a5a6'}; 
                                             color: white; padding: 3px 10px; border-radius: 4px;">
                                    ${transcriptData.student.status || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="courses-table" style="margin-bottom: 30px;">
                        <h4 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <i class="fas fa-book"></i> Course Performance
                        </h4>
            `;
            
            if (transcriptData.courses.length === 0) {
                html += `
                    <div class="alert alert-info" style="background: #e8f4fc; color: #31708f; padding: 15px; border-radius: 5px; text-align: center;">
                        <i class="fas fa-info-circle"></i> No course records found for this student
                    </div>
                `;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead style="background: #f8f9fa;">
                                <tr>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Course Code</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Course Name</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Credits</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Semester</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Score (%)</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Grade</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Grade Points</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                transcriptData.courses.forEach(course => {
                    const gradeColor = course.grade === 'FAIL' ? '#e74c3c' : 
                                     course.grade === 'PASS' ? '#f39c12' : 
                                     course.grade === 'CREDIT' ? '#3498db' : '#2ecc71';
                    
                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px;"><strong>${course.course_code}</strong></td>
                            <td style="padding: 12px;">${course.course_name}</td>
                            <td style="padding: 12px; text-align: center;">${course.credits}</td>
                            <td style="padding: 12px; text-align: center;">${course.semester}</td>
                            <td style="padding: 12px; text-align: center;">${course.final_score}%</td>
                            <td style="padding: 12px;">
                                <span class="badge" style="background: ${gradeColor}; color: white; padding: 4px 8px; border-radius: 4px;">
                                    ${course.grade}
                                </span>
                            </td>
                            <td style="padding: 12px; text-align: center;">${course.grade_points.toFixed(1)}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            html += `
                    </div>
                    
                    <div class="transcript-summary" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <div class="row" style="display: flex; flex-wrap: wrap; justify-content: space-between;">
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Total Courses:</strong>
                                <div style="font-size: 1.2rem; color: #34495e;">${transcriptData.summary.total_courses}</div>
                            </div>
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Total Credits:</strong>
                                <div style="font-size: 1.2rem; color: #34495e;">${transcriptData.summary.total_credits}</div>
                            </div>
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Grade Point Average (GPA):</strong>
                                <div style="font-size: 1.5rem; color: #2ecc71; font-weight: bold;">${transcriptData.summary.gpa.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="transcript-footer" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #7f8c8d; font-size: 0.9rem;">
                        <p>Generated on: ${transcriptData.summary.date_generated}</p>
                        <p><i class="fas fa-lock"></i> Official Transcript - For Academic Use Only</p>
                    </div>
                </div>
            `;
            
            previewDiv.innerHTML = html;
            previewDiv.style.display = 'block';
            
        } catch (error) {
            console.error('Error rendering transcript preview:', error);
            this.showToast('Error rendering transcript preview: ' + error.message, 'error');
        }
    }
    
    async loadSampleTranscript() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            if (students.length > 0) {
                const sampleStudent = students[0];
                const studentSelect = document.getElementById('transcriptStudent');
                if (studentSelect) {
                    studentSelect.value = sampleStudent.id || sampleStudent.reg_number;
                    await this.previewTranscript();
                    this.showToast('Loaded sample transcript', 'info');
                }
            } else {
                this.showToast('No students found in database', 'warning');
            }
        } catch (error) {
            console.error('Error loading sample transcript:', error);
            this.showToast('Error loading sample: ' + error.message, 'error');
        }
    }
    
    // ==================== REPORT GENERATION ====================
    
    async studentReport() {
        console.log('📊 Generating student report...');
        try {
            this.showToast('Generating student report...', 'info');
            const data = await this.generateStudentListReport();
            this.previewReportData(data, 'Student List Report');
            return data;
        } catch (error) {
            console.error('Error in studentReport:', error);
            this.showToast('Error generating student report: ' + error.message, 'error');
            throw error;
        }
    }
    
    async academicReport() {
        console.log('📈 Generating academic report...');
        try {
            this.showToast('Generating academic report...', 'info');
            const data = await this.generateAcademicReport();
            this.previewReportData(data, 'Academic Performance Report');
            return data;
        } catch (error) {
            console.error('Error in academicReport:', error);
            this.showToast('Error generating academic report: ' + error.message, 'error');
            throw error;
        }
    }
    
    async generateCentreReport() {
        console.log('📍 Generating centre report...');
        try {
            this.showToast('Generating centre report...', 'info');
            const data = await this.generateCentreReportData();
            this.previewReportData(data, 'Centre Report');
            return data;
        } catch (error) {
            console.error('Error in generateCentreReport:', error);
            this.showToast('Error generating centre report: ' + error.message, 'error');
            throw error;
        }
    }
    
    async generateSummaryReport() {
        console.log('📋 Generating summary report...');
        try {
            this.showToast('Generating summary report...', 'info');
            const data = await this.generateExecutiveSummary();
            this.previewReportData(data, 'Executive Summary Report');
            return data;
        } catch (error) {
            console.error('Error in generateSummaryReport:', error);
            this.showToast('Error generating summary report: ' + error.message, 'error');
            throw error;
        }
    }
    
    // ==================== DATA GENERATION METHODS ====================
    
    async generateStudentListReport() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            const centreFilter = this.getSelectedValues('studentReportCenter');
            if (centreFilter.length > 0 && !centreFilter.includes('all')) {
                filteredStudents = filteredStudents.filter(student => 
                    centreFilter.includes(student.centre_name || student.centre)
                );
            }
            
            return filteredStudents.map(student => ({
                'Registration Number': student.reg_number || 'N/A',
                'Full Name': student.full_name || student.name || 'N/A',
                'Email': student.email || '',
                'Phone': student.phone || '',
                'Program': student.program || '',
                'Centre': student.centre_name || student.centre || 'Not specified',
                'County': student.county || 'Not specified',
                'Intake Year': student.intake_year || student.intake || '',
                'Status': student.status || '',
                'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
                'Gender': student.gender || '',
                'Address': student.address || '',
                'Created Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
            }));
            
        } catch (error) {
            console.error('Error generating student list:', error);
            throw error;
        }
    }
    
    async generateAcademicReport() {
        try {
            const marks = this.marks.length > 0 ? this.marks : await this.getMarks();
            const courses = this.courses.length > 0 ? this.courses : await this.getCourses();
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            // Group marks by student
            const studentPerformance = {};
            
            marks.forEach(mark => {
                const studentId = mark.student_id;
                if (!studentId) return;
                
                if (!studentPerformance[studentId]) {
                    const student = students.find(s => s.id === studentId) || {};
                    studentPerformance[studentId] = {
                        student_id: studentId,
                        reg_number: student.reg_number || 'N/A',
                        full_name: student.full_name || student.name || 'Unknown Student',
                        program: student.program || '',
                        centre: student.centre_name || student.centre || '',
                        total_marks: 0,
                        total_possible: 0,
                        courses_taken: 0,
                        average_percentage: 0,
                        gpa: 0
                    };
                }
                
                studentPerformance[studentId].total_marks += mark.score || 0;
                studentPerformance[studentId].total_possible += mark.max_score || 100;
                studentPerformance[studentId].courses_taken++;
            });
            
            // Calculate averages and GPA
            const reportData = Object.values(studentPerformance).map(performance => {
                const avgPercentage = performance.total_possible > 0 
                    ? (performance.total_marks / performance.total_possible) * 100 
                    : 0;
                
                const grade = this.calculateGrade(avgPercentage);
                const gpa = this.getGradePoints(grade);
                
                return {
                    'Registration Number': performance.reg_number,
                    'Student Name': performance.full_name,
                    'Program': performance.program,
                    'Centre': performance.centre,
                    'Courses Taken': performance.courses_taken,
                    'Average Score': `${avgPercentage.toFixed(1)}%`,
                    'Grade': grade,
                    'GPA': gpa.toFixed(2),
                    'Performance': avgPercentage >= 70 ? 'Excellent' : 
                                  avgPercentage >= 50 ? 'Good' : 
                                  avgPercentage >= 35 ? 'Satisfactory' : 'Needs Improvement'
                };
            });
            
            return reportData;
            
        } catch (error) {
            console.error('Error generating academic report:', error);
            throw error;
        }
    }
    
    async generateCentreReportData() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const centres = await this.getCentres();
            
            const centreData = centres.map(centre => {
                const centreName = centre.name || centre;
                const centreStudents = students.filter(s => 
                    s.centre_name === centreName || s.centre === centreName
                );
                const activeStudents = centreStudents.filter(s => s.status === 'active');
                const graduatedStudents = centreStudents.filter(s => s.status === 'graduated');
                
                return {
                    'Centre Name': centreName,
                    'County': centre.county || 'Not specified',
                    'Total Students': centreStudents.length,
                    'Active Students': activeStudents.length,
                    'Graduated': graduatedStudents.length,
                    'Graduation Rate': centreStudents.length > 0 
                        ? ((graduatedStudents.length / centreStudents.length) * 100).toFixed(1) + '%' 
                        : '0%'
                };
            }).filter(data => data['Total Students'] > 0);
            
            return centreData;
        } catch (error) {
            console.error('Error generating centre report data:', error);
            throw error;
        }
    }
    
    async generateExecutiveSummary() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            const courses = this.courses.length > 0 ? this.courses : await this.getCourses();
            const marks = this.marks.length > 0 ? this.marks : await this.getMarks();
            const centres = await this.getCentres();
            
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.status === 'active').length;
            const graduatedStudents = students.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 
                ? ((graduatedStudents / totalStudents) * 100).toFixed(1) + '%'
                : '0%';
            
            return [
                { 'Metric': 'Total Students', 'Value': totalStudents },
                { 'Metric': 'Active Students', 'Value': activeStudents },
                { 'Metric': 'Graduated Students', 'Value': graduatedStudents },
                { 'Metric': 'Graduation Rate', 'Value': graduationRate },
                { 'Metric': 'Total Courses', 'Value': courses.length },
                { 'Metric': 'Active Centres', 'Value': centres.length },
                { 'Metric': 'Marks Entries', 'Value': marks.length }
            ];
        } catch (error) {
            console.error('Error generating executive summary:', error);
            throw error;
        }
    }
    
    // ==================== FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            this.showLoading(true);
            
            this.currentFilters = {
                year: this.getSafeElementValue('academicYear', 'all'),
                program: this.getSelectedValues('filterProgram'),
                course: this.getSafeElementValue('filterCourse', 'all'),
                semester: this.getSafeElementValue('semester', 'all'),
                status: 'all',
                intake: this.getSafeElementValue('filterIntake', 'all'),
                centres: this.getSelectedValues('filterCenter'),
                counties: this.getSelectedValues('filterCounty'),
                dateFrom: document.getElementById('reportStartDate')?.value || null,
                dateTo: document.getElementById('reportEndDate')?.value || null
            };
            
            console.log('Current filters:', this.currentFilters);
            
            await this.updateStatistics();
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
            // Reset filter elements
            const elements = ['academicYear', 'filterProgram', 'filterCourse', 'semester', 'filterCenter', 'filterCounty', 'filterIntake'];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'select-multiple') {
                        Array.from(element.options).forEach(option => {
                            option.selected = option.value === 'all';
                        });
                    } else {
                        element.value = 'all';
                    }
                }
            });
            
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
    
    applyStudentFilters(students) {
        let filtered = [...students];
        
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => programs.includes(s.program));
        }
        
        const centres = this.currentFilters.centres;
        if (centres.length > 0 && !centres.includes('all')) {
            filtered = filtered.filter(s => centres.includes(s.centre_name || s.centre));
        }
        
        const counties = this.currentFilters.counties;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => counties.includes(s.county));
        }
        
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(s => (s.intake_year || s.intake) == parseInt(this.currentFilters.intake));
        }
        
        return filtered;
    }
    
    // ==================== STATISTICS ====================
    
    async updateStatistics() {
        try {
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
            
            this.updateElementText('totalStudents', totalStudents.toLocaleString());
            this.updateElementText('graduationRate', graduationRate + '%');
            this.updateElementText('avgGPA', avgGPA.toFixed(2));
            this.updateElementText('centersCount', activeCentres);
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    calculateGrade(percentage) {
        if (percentage >= 85) return 'DISTINCTION';
        if (percentage >= 70) return 'CREDIT';
        if (percentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        return gradePoints[grade] || 0.0;
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <i class="fas ${icons[type] || 'fa-info-circle'}" 
                   style="font-size: 18px; margin-top: 2px;"></i>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; margin-bottom: 2px;">${type.toUpperCase()}</div>
                    <div style="font-size: 14px; opacity: 0.9;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Style based on type
        const styles = {
            success: 'background: #2ecc71; color: white; border-left: 4px solid #27ae60;',
            error: 'background: #e74c3c; color: white; border-left: 4px solid #c0392b;',
            warning: 'background: #f39c12; color: white; border-left: 4px solid #d35400;',
            info: 'background: #3498db; color: white; border-left: 4px solid #2980b9;'
        };
        
        toast.style.cssText = `
            ${styles[type] || styles.info}
            padding: 14px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            min-width: 300px;
            max-width: 400px;
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    
    // ==================== PREVIEW FUNCTIONS ====================
    
    previewReportData(data, title) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) {
            console.warn('reportPreview element not found');
            return;
        }
        
        if (!data || data.length === 0) {
            previewDiv.innerHTML = `
                <div class="alert alert-warning" style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
                    <i class="fas fa-exclamation-triangle"></i> No data available for preview
                </div>
            `;
            return;
        }
        
        const headers = Object.keys(data[0]);
        const previewData = data.slice(0, 10);
        
        let html = `
            <div class="report-preview" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h5 style="margin: 0; color: #2c3e50;">${title}</h5>
                    <span class="badge" style="background: #3498db; color: white; padding: 5px 10px; border-radius: 4px;">
                        ${data.length} records
                    </span>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                ${headers.map(header => `
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057; white-space: nowrap;">
                                        ${header}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        previewData.forEach((row, index) => {
            html += `
                <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                    ${headers.map(header => `
                        <td style="padding: 10px 12px; color: #495057; white-space: nowrap;">
                            ${row[header] !== undefined && row[header] !== null ? row[header] : ''}
                        </td>
                    `).join('')}
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                ${data.length > 10 ? `
                    <div class="alert alert-info mt-2" style="background: #e8f4fc; color: #31708f; padding: 10px; border-radius: 5px; margin-top: 15px;">
                        <i class="fas fa-info-circle"></i> Showing first 10 of ${data.length} records
                    </div>
                ` : ''}
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="app.reports.exportData(${JSON.stringify(data).replace(/</g, '\\u003c')}, '${title.toLowerCase().replace(/\s+/g, '-')}', 'csv')" 
                            class="btn btn-sm" 
                            style="background: #2ecc71; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-download mr-1"></i> Export as CSV
                    </button>
                    <button onclick="app.reports.clearPreview()" 
                            class="btn btn-sm" 
                            style="background: #95a5a6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-times mr-1"></i> Clear Preview
                    </button>
                </div>
            </div>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    // ==================== EXPORT METHODS ====================
    
    async exportTranscriptToPDF(data) {
        // This would be implemented with a PDF library like jsPDF
        console.log('PDF export functionality would be implemented here');
        console.log('Transcript data for PDF:', data);
        this.showToast('PDF export would be implemented with a PDF library', 'info');
        
        // For now, let's create a simple downloadable HTML file
        this.exportToHTML(data, `transcript-${data.student.reg_number}`);
    }
    
    exportToHTML(data, filename) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .student-info { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>TEE College</h1>
                    <h2>Academic Transcript</h2>
                </div>
                
                <div class="student-info">
                    <p><strong>Student:</strong> ${data.student.full_name}</p>
                    <p><strong>Registration Number:</strong> ${data.student.reg_number}</p>
                    <p><strong>Program:</strong> ${data.student.program}</p>
                    <p><strong>Centre:</strong> ${data.student.centre}</p>
                    <p><strong>GPA:</strong> ${data.summary.gpa.toFixed(2)}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Course Code</th>
                            <th>Course Name</th>
                            <th>Credits</th>
                            <th>Grade</th>
                            <th>Grade Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.courses.map(course => `
                            <tr>
                                <td>${course.course_code}</td>
                                <td>${course.course_name}</td>
                                <td>${course.credits}</td>
                                <td>${course.grade}</td>
                                <td>${course.grade_points.toFixed(1)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; font-size: 12px; color: #666;">
                    <p>Generated on: ${data.summary.date_generated}</p>
                </div>
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.html`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('HTML transcript downloaded', 'success');
    }
    
    async exportData(data, filename, format) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        if (format === 'csv') {
            this.exportToCSV(data, filename);
        } else if (format === 'excel') {
            this.exportToExcel(data, filename);
        } else {
            this.showToast(`Export format ${format} not supported`, 'error');
        }
    }
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        try {
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header];
                    // Handle special characters and commas
                    if (typeof value === 'string') {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value !== undefined && value !== null ? `"${value}"` : '';
                }).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('CSV file downloaded', 'success');
            
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            this.showToast('Error exporting to CSV: ' + error.message, 'error');
        }
    }
    
    exportToExcel(data, filename) {
        // Placeholder for Excel export
        this.showToast('Excel export would require SheetJS library', 'info');
        
        // Fallback to CSV
        this.exportToCSV(data, filename);
    }
    
    // ==================== UTILITY SHORTCUTS ====================
    
    refreshReports() {
        this.showToast('Refreshing reports...', 'info');
        this.loadAllData().then(() => {
            this.updateStatistics();
            this.generateReportsGrid();
            this.showToast('Reports refreshed', 'success');
        }).catch(error => {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports', 'error');
        });
    }
    
    openTranscriptSection() {
        const transcriptSection = document.getElementById('transcriptSection');
        if (transcriptSection) {
            transcriptSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    showScheduledReports() {
        this.showToast('Scheduled reports feature coming soon', 'info');
    }
    
    previewStudentReport() {
        this.studentReport();
    }
    
    previewAcademicReport() {
        this.academicReport();
    }
    
    bulkExport() {
        this.showToast('Bulk export feature coming soon', 'info');
    }
    
    clearPreview() {
        const previewDiv = document.getElementById('reportPreview');
        if (previewDiv) {
            previewDiv.innerHTML = '';
        }
        
        const transcriptPreview = document.getElementById('transcriptPreview');
        if (transcriptPreview) {
            transcriptPreview.innerHTML = '';
            transcriptPreview.style.display = 'none';
        }
        
        this.showToast('Preview cleared', 'info');
    }
    
    addScheduledReport() {
        this.showToast('Add scheduled report feature coming soon', 'info');
    }
    
    saveFilterPreset() {
        this.showToast('Save filter preset feature coming soon', 'info');
    }
    
    downloadPreview() {
        this.showToast('Download preview feature coming soon', 'info');
    }
    
    bulkTranscripts() {
        this.showToast('Bulk transcripts feature coming soon', 'info');
    }
    
    removeScheduledReport(btn) {
        if (btn && btn.closest) {
            const row = btn.closest('tr');
            if (row) {
                row.remove();
                this.showToast('Scheduled report removed', 'success');
            }
        }
    }
}

// Add CSS for animations if not already present
if (typeof document !== 'undefined' && !document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}
