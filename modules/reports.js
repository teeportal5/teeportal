// modules/reports.js - UPDATED VERSION
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
    
    createTranscriptModal() {
        // Check if modal already exists
        if (document.getElementById('transcriptModal')) {
            return;
        }
        
        const modalHTML = `
        <div class="modal fade" id="transcriptModal" tabindex="-1" role="dialog" aria-labelledby="transcriptModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="transcriptModalLabel">
                            <i class="fas fa-graduation-cap mr-2"></i>Select Student for Transcript
                        </h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="input-group">
                                    <input type="text" 
                                           id="transcriptStudentSearch" 
                                           class="form-control" 
                                           placeholder="Search by name, reg number, or program..."
                                           onkeyup="app.reports.searchTranscriptStudents()">
                                    <div class="input-group-append">
                                        <button class="btn btn-outline-secondary" type="button" onclick="app.reports.searchTranscriptStudents()">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <select id="transcriptModalCentreFilter" class="form-control" onchange="app.reports.searchTranscriptStudents()">
                                    <option value="all">All Centres</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="transcriptModalProgramFilter" class="form-control" onchange="app.reports.searchTranscriptStudents()">
                                    <option value="all">All Programs</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-hover table-sm">
                                <thead class="thead-light">
                                    <tr>
                                        <th style="width: 50px;">Select</th>
                                        <th>Reg Number</th>
                                        <th>Student Name</th>
                                        <th>Program</th>
                                        <th>Centre</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="transcriptModalStudentsList">
                                    <!-- Student list will be populated here -->
                                </tbody>
                            </table>
                        </div>
                        
                        <div id="transcriptModalNoResults" class="text-center p-4" style="display: none;">
                            <i class="fas fa-user-slash fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No students found</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="app.reports.selectStudentForTranscript()" disabled id="selectStudentBtn">
                            <i class="fas fa-check mr-1"></i> Select Student
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        console.log('✅ Transcript modal created');
    }
    
    // ==================== FILTER POPULATION ====================
    
    async populateAllFilters() {
        try {
            console.log('🔄 Populating all filters...');
            
            // Check which elements exist before trying to populate them
            const filterElements = {
                'academicYear': 'Academic Year',
                'filterCenter': 'Centre Filter',
                'filterCounty': 'County Filter',
                'filterProgram': 'Program Filter',
                'filterIntake': 'Intake Filter',
                'filterCourse': 'Course Filter',
                'studentReportCenter': 'Student Report Centre',
                'academicReportCenter': 'Academic Report Centre',
                'transcriptCenterFilter': 'Transcript Centre Filter',
                'bulkExportCenters': 'Bulk Export Centres',
                'scheduleCenter': 'Schedule Centre'
            };
            
            // Log which elements are found
            Object.entries(filterElements).forEach(([id, name]) => {
                const element = document.getElementById(id);
                console.log(`${element ? '✅' : '❌'} ${name} element: ${element ? 'Found' : 'Not found'}`);
            });
            
            // 1. Academic Year filter
            this.populateAcademicYearFilter();
            
            // 2. Centre filters
            await this.populateCentreFilters();
            
            // 3. County filters
            await this.populateCountyFilters();
            
            // 4. Program filter
            await this.populateProgramFilter();
            
            // 5. Intake filter
            await this.populateIntakeFilter();
            
            // 6. Course filter
            await this.populateCourseFilter();
            
            // 7. Modal filters
            await this.populateModalFilters();
            
            console.log('✅ All filters populated successfully');
            
        } catch (error) {
            console.error('❌ Error populating filters:', error);
            this.showToast('Error loading filter data', 'error');
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
    
    async populateCentreFilters() {
        try {
            const centreSelects = [
                'filterCenter', 
                'studentReportCenter', 
                'academicReportCenter',
                'transcriptCenterFilter',
                'bulkExportCenters',
                'scheduleCenter'
            ];
            
            for (const selectId of centreSelects) {
                const select = document.getElementById(selectId);
                if (!select) {
                    console.warn(`⚠️ Select element ${selectId} not found`);
                    continue;
                }
                
                // Clear existing options
                select.innerHTML = '';
                
                // Add "All Centres" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Centres';
                select.appendChild(allOption);
                
                // Get centres data
                const centres = this.centres.length > 0 ? this.centres : await this.getCentres();
                
                if (centres && centres.length > 0) {
                    centres.forEach(centre => {
                        const option = document.createElement('option');
                        const centreId = centre.id || centre.code || centre.name;
                        const centreName = centre.name || centre.code || 'Unknown Centre';
                        
                        option.value = centreId;
                        option.textContent = centreName;
                        
                        // Add county if available
                        if (centre.county) {
                            option.textContent += ` (${centre.county})`;
                        }
                        
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ Populated ${selectId} with ${centres.length} centres`);
                } else {
                    console.warn(`⚠️ No centres data for ${selectId}`);
                    
                    // Add a default option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = 'default';
                    defaultOption.textContent = 'Main Campus';
                    select.appendChild(defaultOption);
                }
            }
            
        } catch (error) {
            console.error('❌ Error populating centre filters:', error);
        }
    }
    
    async populateCountyFilters() {
        try {
            const countySelects = ['filterCounty'];
            
            for (const selectId of countySelects) {
                const select = document.getElementById(selectId);
                if (!select) {
                    console.warn(`⚠️ Select element ${selectId} not found`);
                    continue;
                }
                
                select.innerHTML = '';
                
                // Add "All Counties" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Counties';
                select.appendChild(allOption);
                
                // Get counties data
                const counties = this.counties.length > 0 ? this.counties : await this.getCounties();
                
                if (counties && counties.length > 0) {
                    counties.forEach(county => {
                        const option = document.createElement('option');
                        option.value = county.name || county;
                        option.textContent = county.name || county;
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ Populated ${selectId} with ${counties.length} counties`);
                } else {
                    // Add default counties from settings
                    const defaultCounties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];
                    defaultCounties.forEach(county => {
                        const option = document.createElement('option');
                        option.value = county;
                        option.textContent = county;
                        select.appendChild(option);
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error populating county filters:', error);
        }
    }
    
    async populateProgramFilter() {
        try {
            const programSelect = document.getElementById('filterProgram');
            if (!programSelect) {
                console.warn('⚠️ filterProgram element not found');
                return;
            }
            
            programSelect.innerHTML = '';
            
            // Add "All Programs" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Programs';
            programSelect.appendChild(allOption);
            
            // Get programs data
            const programs = this.programs.length > 0 ? this.programs : await this.getPrograms();
            
            if (programs && programs.length > 0) {
                programs.forEach(program => {
                    const option = document.createElement('option');
                    
                    // Extract program code and name
                    let programCode = program.code || program.id || program.program_code || 'N/A';
                    let programName = program.name || program.program_name || 'Unknown Program';
                    
                    option.value = programCode;
                    option.textContent = `${programCode} - ${programName}`;
                    programSelect.appendChild(option);
                });
                
                console.log(`✅ Populated program filter with ${programs.length} programs`);
            } else {
                console.warn('⚠️ No programs data found');
                
                // Add default programs
                const defaultPrograms = [
                    { code: 'BASIC', name: 'Basic TEE' },
                    { code: 'HNC', name: 'Higher National Certificate' },
                    { code: 'ADV', name: 'Advanced TEE' }
                ];
                
                defaultPrograms.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.code;
                    option.textContent = `${program.code} - ${program.name}`;
                    programSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('❌ Error populating program filter:', error);
        }
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
    
    // ==================== DATABASE METHODS ====================
    
    async getStudents() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getStudents');
                return this.students || [];
            }
            
            console.log('📊 Fetching students from database...');
            
            let studentsData = [];
            
            // Try multiple methods to get students
            if (typeof this.db.getStudents === 'function') {
                console.log('📡 Using db.getStudents()');
                studentsData = await this.db.getStudents();
            } else if (typeof this.db.getStudentList === 'function') {
                console.log('📡 Using db.getStudentList()');
                studentsData = await this.db.getStudentList();
            } else if (typeof this.db.getAll === 'function') {
                console.log('📡 Using db.getAll("students")');
                studentsData = await this.db.getAll('students');
            } else if (this.db.supabase && typeof this.db.supabase.from === 'function') {
                console.log('📡 Using direct Supabase query');
                const { data, error } = await this.db.supabase
                    .from('students')
                    .select(`
                        id,
                        reg_number,
                        name,
                        email,
                        phone,
                        county,
                        region,
                        ward,
                        village,
                        centre_id,
                        program_id,
                        intake_year,
                        status,
                        created_at,
                        centres:centre_id (name, code, county),
                        programs:program_id (name, code, duration)
                    `);
                
                if (error) throw error;
                studentsData = data || [];
            }
            
            console.log(`✅ Got ${studentsData?.length || 0} students from database`);
            
            // Process students to ensure consistent structure
            const processedStudents = (studentsData || []).map(student => {
                // Determine centre name
                let centreName = '';
                if (student.centres && student.centres.name) {
                    centreName = student.centres.name;
                } else if (student.centre_name) {
                    centreName = student.centre_name;
                } else if (student.centre) {
                    centreName = student.centre;
                } else if (student.centre_id && typeof student.centre_id === 'object') {
                    centreName = student.centre_id.name || student.centre_id.code || '';
                }
                
                // Determine program name
                let programName = '';
                if (student.programs && student.programs.name) {
                    programName = student.programs.name;
                } else if (student.program_name) {
                    programName = student.program_name;
                } else if (student.program) {
                    programName = student.program;
                } else if (student.program_id && typeof student.program_id === 'object') {
                    programName = student.program_id.name || student.program_id.code || '';
                }
                
                // Determine intake year
                let intakeYear = '';
                if (student.intake_year) {
                    intakeYear = student.intake_year;
                } else if (student.intake) {
                    intakeYear = student.intake;
                } else if (student.created_at) {
                    intakeYear = new Date(student.created_at).getFullYear().toString();
                }
                
                return {
                    id: student.id || student.student_id || Date.now().toString(),
                    reg_number: student.reg_number || `STU-${Date.now()}`,
                    full_name: student.full_name || student.name || 'Unknown Student',
                    email: student.email || '',
                    phone: student.phone || '',
                    county: student.county || '',
                    region: student.region || student.sub_county || '',
                    ward: student.ward || '',
                    village: student.village || '',
                    
                    // Centre information
                    centre_id: student.centre_id?.id || student.centre_id,
                    centre_name: centreName || 'Main Campus',
                    centre: centreName || 'Main Campus',
                    
                    // Program information
                    program_id: student.program_id?.id || student.program_id,
                    program_name: programName,
                    program: programName,
                    
                    // Academic information
                    intake_year: intakeYear,
                    intake: intakeYear,
                    status: student.status || 'active',
                    
                    // Timestamps
                    created_at: student.created_at,
                    updated_at: student.updated_at
                };
            });
            
            console.log('Processed students sample:', processedStudents.slice(0, 2));
            this.students = processedStudents;
            return processedStudents;
            
        } catch (error) {
            console.error('❌ Error getting students:', error);
            
            // Return fallback data for testing
            if (this.students && this.students.length > 0) {
                console.log('⚠️ Using cached students due to error');
                return this.students;
            }
            
            console.warn('⚠️ Creating sample students for testing');
            const sampleStudents = this.createSampleStudents();
            this.students = sampleStudents;
            return sampleStudents;
        }
    }
    
    createSampleStudents() {
        return [
            {
                id: 'stu1',
                reg_number: 'STU-2024-001',
                full_name: 'John Doe',
                email: 'john@example.com',
                phone: '0712345678',
                county: 'Nairobi',
                region: 'Central',
                centre: 'Nairobi HQ',
                centre_name: 'Nairobi Headquarters',
                program: 'TEE Basic Certificate',
                program_name: 'TEE Basic Certificate',
                intake_year: '2024',
                intake: '2024',
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: 'stu2',
                reg_number: 'STU-2024-002',
                full_name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '0723456789',
                county: 'Nakuru',
                region: 'Rift Valley',
                centre: 'Nakuru Centre',
                centre_name: 'Nakuru Study Centre',
                program: 'TEE Advanced Diploma',
                program_name: 'TEE Advanced Diploma',
                intake_year: '2023',
                intake: '2023',
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: 'stu3',
                reg_number: 'STU-2023-001',
                full_name: 'Robert Johnson',
                email: 'robert@example.com',
                phone: '0734567890',
                county: 'Mombasa',
                region: 'Coast',
                centre: 'Mombasa Centre',
                centre_name: 'Mombasa Study Centre',
                program: 'TEE Basic Certificate',
                program_name: 'TEE Basic Certificate',
                intake_year: '2023',
                intake: '2023',
                status: 'graduated',
                created_at: new Date().toISOString()
            }
        ];
    }
    
    async getCourses() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getCourses');
                return this.courses || [];
            }
            
            if (typeof this.db.getCourses === 'function') {
                const courses = await this.db.getCourses();
                console.log(`📚 Got ${courses?.length || 0} courses from database`);
                this.courses = courses || [];
                return this.courses;
            } else if (typeof this.db.getCoursesSimple === 'function') {
                const courses = await this.db.getCoursesSimple();
                console.log(`📚 Got ${courses?.length || 0} courses (simple) from database`);
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
                console.log(`📝 Got ${marks?.length || 0} marks from database`);
                this.marks = marks || [];
                return this.marks;
            } else if (typeof this.db.getMarksTableData === 'function') {
                const marks = await this.db.getMarksTableData();
                console.log(`📝 Got ${marks?.length || 0} marks (table data) from database`);
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
    
    async getCentres() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getCentres');
                return this.centres || [];
            }
            
            if (typeof this.db.getCentres === 'function') {
                const centres = await this.db.getCentres();
                console.log(`🏛️ Got ${centres?.length || 0} centres from database`);
                this.centres = centres || [];
                return this.centres;
            } else if (typeof this.db.getStudyCenters === 'function') {
                const centres = await this.db.getStudyCenters();
                console.log(`🏛️ Got ${centres?.length || 0} study centres from database`);
                this.centres = centres || [];
                return this.centres;
            } else {
                // Try to get centres from settings
                if (typeof this.db.getSettings === 'function') {
                    const settings = await this.db.getSettings();
                    if (settings && settings.centres) {
                        console.log(`🏛️ Got ${settings.centres.length} centres from settings`);
                        this.centres = settings.centres;
                        return this.centres;
                    }
                }
                
                console.warn('⚠️ No centres data available');
                return this.centres || [];
            }
        } catch (error) {
            console.error('❌ Error getting centres:', error);
            return this.centres || [];
        }
    }
    
    async getCounties() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getCounties');
                return this.counties || [];
            }
            
            if (typeof this.db.getCounties === 'function') {
                const counties = await this.db.getCounties();
                console.log(`🗺️ Got ${counties?.length || 0} counties from database`);
                this.counties = counties || [];
                return this.counties;
            } else {
                // Try to get counties from settings
                if (typeof this.db.getSettings === 'function') {
                    const settings = await this.db.getSettings();
                    if (settings && settings.counties) {
                        console.log(`🗺️ Got ${settings.counties.length} counties from settings`);
                        this.counties = settings.counties;
                        return this.counties;
                    }
                }
                
                console.warn('⚠️ No counties data available');
                return this.counties || [];
            }
        } catch (error) {
            console.error('❌ Error getting counties:', error);
            return this.counties || [];
        }
    }
    
    async getPrograms() {
        try {
            if (!this.db) {
                console.warn('⚠️ Database not available in getPrograms');
                return this.programs || [];
            }
            
            console.log('🎓 Fetching programs from database...');
            
            let programsData = [];
            
            if (typeof this.db.getPrograms === 'function') {
                console.log('📡 Using db.getPrograms()');
                programsData = await this.db.getPrograms();
            } else if (typeof this.db.getAllPrograms === 'function') {
                console.log('📡 Using db.getAllPrograms()');
                programsData = await this.db.getAllPrograms();
            } else if (typeof this.db.getAll === 'function') {
                console.log('📡 Using db.getAll("programs")');
                programsData = await this.db.getAll('programs');
            } else if (this.db.supabase && typeof this.db.supabase.from === 'function') {
                console.log('📡 Using direct Supabase query for programs');
                const { data, error } = await this.db.supabase
                    .from('programs')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                programsData = data || [];
            }
            
            console.log(`✅ Got ${programsData?.length || 0} programs from database`);
            
            // Process programs to ensure consistent structure
            const processedPrograms = (programsData || []).map(program => {
                return {
                    id: program.id || program.program_id || Date.now().toString(),
                    code: program.code || program.program_code || 'PROG-001',
                    name: program.name || program.program_name || 'Unnamed Program',
                    description: program.description || '',
                    level: program.level || 'certificate',
                    duration: program.duration || '1 year',
                    credits: program.credits || program.total_credits || 30,
                    status: program.status || 'active'
                };
            });
            
            // Add default programs if none found
            if (processedPrograms.length === 0) {
                console.warn('⚠️ No programs found, creating sample programs');
                processedPrograms.push(
                    {
                        id: 'prog1',
                        code: 'TEE-BASIC',
                        name: 'TEE Basic Certificate',
                        description: 'Basic Theological Education by Extension',
                        level: 'certificate',
                        duration: '1 year',
                        credits: 30,
                        status: 'active'
                    },
                    {
                        id: 'prog2',
                        code: 'TEE-ADV',
                        name: 'TEE Advanced Diploma',
                        description: 'Advanced Theological Education',
                        level: 'diploma',
                        duration: '2 years',
                        credits: 60,
                        status: 'active'
                    },
                    {
                        id: 'prog3',
                        code: 'TEE-HNC',
                        name: 'Higher National Certificate',
                        description: 'Advanced theological training',
                        level: 'certificate',
                        duration: '1.5 years',
                        credits: 45,
                        status: 'active'
                    }
                );
            }
            
            this.programs = processedPrograms;
            return processedPrograms;
            
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            
            // Return fallback data
            if (this.programs && this.programs.length > 0) {
                return this.programs;
            }
            
            console.warn('⚠️ Creating sample programs for testing');
            const samplePrograms = [
                {
                    id: 'prog1',
                    code: 'TEE-BASIC',
                    name: 'TEE Basic Certificate',
                    level: 'certificate',
                    duration: '1 year',
                    credits: 30
                },
                {
                    id: 'prog2',
                    code: 'TEE-ADV',
                    name: 'TEE Advanced Diploma',
                    level: 'diploma',
                    duration: '2 years',
                    credits: 60
                }
            ];
            
            this.programs = samplePrograms;
            return samplePrograms;
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
        // Apply filters on change for certain filters
        const autoApplyFilters = ['academicYear', 'filterProgram', 'filterCenter', 'filterCounty', 'filterIntake', 'filterCourse', 'semester'];
        autoApplyFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Date range filters
        const dateFrom = document.getElementById('reportStartDate');
        const dateTo = document.getElementById('reportEndDate');
        if (dateFrom) dateFrom.addEventListener('change', () => this.applyFilters());
        if (dateTo) dateTo.addEventListener('change', () => this.applyFilters());
    }
    
    updateButtonListeners() {
        console.log('🔄 Updating button listeners...');
        
        // Map of button IDs to methods
        const buttonMap = {
            'applyFilters': this.applyFilters,
            'clearFilters': this.clearFilters,
            'refreshReports': this.refreshReports,
            'saveFilterPreset': this.saveFilterPreset,
            'clearPreview': this.clearPreview,
            'downloadPreview': this.downloadPreview,
            'generateSummaryReport': this.generateSummaryReport,
            'generateCentreReport': this.generateCentreReport,
            'studentReport': this.studentReport,
            'academicReport': this.academicReport,
            'previewTranscript': this.previewTranscript,
            'generateTranscript': this.generateTranscript,
            'loadSampleTranscript': this.loadSampleTranscript,
            'bulkTranscripts': this.bulkTranscripts,
            'bulkExport': this.bulkExport,
            'addScheduledReport': this.addScheduledReport,
            'openTranscriptModal': this.openTranscriptModal,
            'clearSelectedStudent': this.clearSelectedStudent,
            'generateStudentReport': this.generateStudentReport,
            'generateAcademicReport': this.generateAcademicReport
        };
        
        // Bind all buttons
        Object.entries(buttonMap).forEach(([id, method]) => {
            this.bindButton(id, method);
        });
        
        // Also update all onclick attributes in the DOM
        this.updateAllOnclickHandlers();
        
        console.log('✅ Button listeners updated');
    }
    
    bindButton(elementId, method) {
        // Try to find by ID first
        let element = document.getElementById(elementId);
        
        // If not found by ID, try to find by onclick attribute
        if (!element) {
            const elements = document.querySelectorAll(`[onclick*="${elementId}"]`);
            if (elements.length > 0) {
                element = elements[0];
            }
        }
        
        if (element) {
            element.onclick = method;
            console.log(`✅ Bound ${elementId} to method`);
        } else {
            console.warn(`⚠️ Could not find element for ${elementId}`);
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
            'app.reports.quickStudentReport()': this.quickStudentReport,
            'app.reports.quickAcademicReport()': this.quickAcademicReport,
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
            'app.reports.clearFilters()': this.clearFilters,
            'app.reports.openTranscriptSection()': this.openTranscriptSection,
            'app.reports.showScheduledReports()': this.showScheduledReports,
            'app.reports.openTranscriptModal()': this.openTranscriptModal,
            'app.reports.clearSelectedStudent()': this.clearSelectedStudent,
            'app.reports.populateReportDropdowns()': this.populateReportDropdowns,
            'app.reports.debugDropdowns()': this.debugDropdowns,
            'app.reports.generateStudentReport()': this.generateStudentReport,
            'app.reports.generateAcademicReport()': this.generateAcademicReport
        };
        
        // Update all elements with onclick attributes
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
    
    // ==================== FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            this.showLoading(true);
            
            // Get all filter values
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
            
            // Reset all filter elements
            const filterElements = {
                'academicYear': () => {
                    const element = document.getElementById('academicYear');
                    if (element) {
                        element.value = new Date().getFullYear();
                    }
                },
                'filterProgram': () => {
                    const element = document.getElementById('filterProgram');
                    if (element) {
                        if (element.type === 'select-multiple') {
                            Array.from(element.options).forEach(option => {
                                option.selected = option.value === 'all';
                            });
                        } else {
                            element.value = 'all';
                        }
                    }
                },
                'filterCenter': () => {
                    const element = document.getElementById('filterCenter');
                    if (element) {
                        if (element.type === 'select-multiple') {
                            Array.from(element.options).forEach(option => {
                                option.selected = option.value === 'all';
                            });
                        } else {
                            element.value = 'all';
                        }
                    }
                },
                'filterCounty': () => {
                    const element = document.getElementById('filterCounty');
                    if (element) element.value = 'all';
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
            
            // Update DOM elements
            this.updateElementText('totalStudents', totalStudents.toLocaleString());
            this.updateElementText('graduationRate', graduationRate + '%');
            this.updateElementText('avgGPA', avgGPA.toFixed(2));
            this.updateElementText('centersCount', activeCentres);
            
            console.log(`📊 Statistics updated: ${totalStudents} students, ${graduationRate}% graduation rate`);
            
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
    
    // ==================== TRANSCRIPT MODAL METHODS ====================
    
    async openTranscriptModal() {
        try {
            console.log('🎓 Opening transcript modal...');
            
            // Load fresh student data for modal
            const students = await this.getStudents();
            this.students = students;
            
            // Populate modal filters
            await this.populateModalFilters();
            
            // Populate student list
            await this.searchTranscriptStudents();
            
            // Show modal
            $('#transcriptModal').modal('show');
            
            this.showToast('Select a student for transcript', 'info');
            
        } catch (error) {
            console.error('❌ Error opening transcript modal:', error);
            this.showToast('Error opening student selector', 'error');
        }
    }
    
    async searchTranscriptStudents() {
        try {
            const searchInput = document.getElementById('transcriptStudentSearch');
            const centreFilter = document.getElementById('transcriptModalCentreFilter');
            const programFilter = document.getElementById('transcriptModalProgramFilter');
            const studentsList = document.getElementById('transcriptModalStudentsList');
            const noResultsDiv = document.getElementById('transcriptModalNoResults');
            
            if (!searchInput || !studentsList) return;
            
            const searchTerm = searchInput.value.toLowerCase();
            const selectedCentre = centreFilter ? centreFilter.value : 'all';
            const selectedProgram = programFilter ? programFilter.value : 'all';
            
            // Get students (use cached if available)
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            
            // Filter students
            const filteredStudents = students.filter(student => {
                // Search term filter
                const matchesSearch = searchTerm === '' || 
                    (student.full_name && student.full_name.toLowerCase().includes(searchTerm)) ||
                    (student.reg_number && student.reg_number.toLowerCase().includes(searchTerm)) ||
                    (student.program && student.program.toLowerCase().includes(searchTerm));
                
                // Centre filter
                const matchesCentre = selectedCentre === 'all' || 
                    (student.centre_name && student.centre_name === selectedCentre) ||
                    (student.centre && student.centre === selectedCentre);
                
                // Program filter
                const matchesProgram = selectedProgram === 'all' ||
                    (student.program && student.program === selectedProgram);
                
                return matchesSearch && matchesCentre && matchesProgram;
            });
            
            // Clear current selection
            this.selectedStudentForTranscript = null;
            document.getElementById('selectStudentBtn').disabled = true;
            
            // Display results
            if (filteredStudents.length === 0) {
                studentsList.innerHTML = '';
                if (noResultsDiv) noResultsDiv.style.display = 'block';
                return;
            }
            
            if (noResultsDiv) noResultsDiv.style.display = 'none';
            
            // Build table rows
            let html = '';
            filteredStudents.forEach(student => {
                const studentId = student.id || student.student_id || student.reg_number;
                const regNumber = student.reg_number || 'N/A';
                const fullName = student.full_name || student.name || 'Unknown';
                const program = student.program || 'Not specified';
                const centre = student.centre_name || student.centre || 'Not specified';
                const status = student.status || 'active';
                
                const statusColor = status === 'active' ? 'success' : 
                                  status === 'graduated' ? 'primary' : 
                                  status === 'inactive' ? 'secondary' : 'warning';
                
                html += `
                <tr onclick="app.reports.selectStudentRow(this, '${studentId}')" style="cursor: pointer;">
                    <td>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="studentSelection" id="student_${studentId}" value="${studentId}">
                        </div>
                    </td>
                    <td><strong>${regNumber}</strong></td>
                    <td>${fullName}</td>
                    <td>${program}</td>
                    <td>${centre}</td>
                    <td>
                        <span class="badge badge-${statusColor}">${status}</span>
                    </td>
                </tr>
                `;
            });
            
            studentsList.innerHTML = html;
            
            console.log(`🔍 Found ${filteredStudents.length} students matching search`);
            
        } catch (error) {
            console.error('❌ Error searching transcript students:', error);
        }
    }
    
    selectStudentRow(rowElement, studentId) {
        // Uncheck all other radio buttons
        document.querySelectorAll('input[name="studentSelection"]').forEach(radio => {
            radio.checked = false;
            radio.closest('tr').classList.remove('table-primary');
        });
        
        // Check the selected radio
        const radio = document.getElementById(`student_${studentId}`);
        if (radio) {
            radio.checked = true;
            rowElement.classList.add('table-primary');
            
            // Find the student data
            const student = this.students.find(s => 
                (s.id && s.id.toString() === studentId.toString()) ||
                (s.student_id && s.student_id.toString() === studentId.toString()) ||
                (s.reg_number && s.reg_number === studentId)
            );
            
            this.selectedStudentForTranscript = student;
            document.getElementById('selectStudentBtn').disabled = false;
        }
    }
    
    selectStudentForTranscript() {
        if (!this.selectedStudentForTranscript) {
            this.showToast('Please select a student first', 'warning');
            return;
        }
        
        console.log('✅ Selected student for transcript:', this.selectedStudentForTranscript);
        
        // Close modal
        $('#transcriptModal').modal('hide');
        
        // Display selected student info
        this.displaySelectedStudentInfo();
        
        this.showToast(`Selected: ${this.selectedStudentForTranscript.full_name || this.selectedStudentForTranscript.reg_number}`, 'success');
    }
    
    closeTranscriptModal() {
        $('#transcriptModal').modal('hide');
        this.selectedStudentForTranscript = null;
    }
    
    /**
     * Display selected student info
     */
    displaySelectedStudentInfo() {
        if (!this.selectedStudentForTranscript) {
            const infoDiv = document.getElementById('selectedStudentInfo');
            if (infoDiv) infoDiv.style.display = 'none';
            return;
        }
        
        const infoDiv = document.getElementById('selectedStudentInfo');
        const nameSpan = document.getElementById('selectedStudentName');
        const regSpan = document.getElementById('selectedStudentReg');
        
        if (infoDiv && nameSpan && regSpan) {
            nameSpan.textContent = this.selectedStudentForTranscript.full_name;
            regSpan.textContent = this.selectedStudentForTranscript.reg_number;
            infoDiv.style.display = 'block';
        }
    }
    
    /**
     * Clear selected student
     */
    clearSelectedStudent() {
        this.selectedStudentForTranscript = null;
        this.displaySelectedStudentInfo();
        const previewDiv = document.getElementById('transcriptPreview');
        if (previewDiv) previewDiv.style.display = 'none';
        this.showToast('Student selection cleared', 'info');
    }
    
    /**
     * Populate all dropdowns (for debugging)
     */
    async populateReportDropdowns() {
        console.log('🔄 Populating all report dropdowns...');
        try {
            await this.populateAllFilters();
            this.showToast('Report dropdowns refreshed', 'success');
        } catch (error) {
            console.error('❌ Error populating dropdowns:', error);
            this.showToast('Error refreshing dropdowns', 'error');
        }
    }
    
    /**
     * Debug dropdowns
     */
    debugDropdowns() {
        console.log('🔍 Debugging dropdowns...');
        
        const dropdowns = [
            'filterCenter', 'filterCounty', 'filterProgram', 'filterIntake', 'filterCourse',
            'studentReportCenter', 'academicReportCenter', 'transcriptCenterFilter',
            'bulkExportCenters', 'scheduleCenter'
        ];
        
        dropdowns.forEach(id => {
            const element = document.getElementById(id);
            console.log(`${id}: ${element ? 'Found' : 'Not found'} with ${element ? element.options.length : 0} options`);
        });
        
        this.showToast('Dropdown debug info logged to console', 'info');
    }
    
    // ==================== UTILITY METHODS ====================
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return 'FAIL';
        }
        
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
    
    async generateStudentReport() {
        try {
            const centreFilter = this.getSelectedValues('studentReportCenter');
            const reportType = this.getSafeElementValue('studentReportType', 'list');
            const format = this.getSafeElementValue('studentReportFormat', 'csv');
            
            console.log(`📊 Generating ${reportType} student report in ${format} format`);
            
            let data = [];
            if (reportType === 'list') {
                data = await this.generateStudentListReport();
            } else if (reportType === 'enrollment') {
                data = await this.generateEnrollmentReport();
            } else if (reportType === 'graduation') {
                data = await this.generateGraduationReport();
            } else if (reportType === 'demographics') {
                data = await this.generateDemographicsReport();
            } else if (reportType === 'center_distribution') {
                data = await this.generateCentreDistributionReport();
            }
            
            // Filter by centre if specified
            if (centreFilter.length > 0 && !centreFilter.includes('all')) {
                data = data.filter(student => 
                    centreFilter.includes(student.centre_name || student.centre)
                );
            }
            
            this.previewReportData(data, `Student ${reportType} Report`);
            this.showToast(`Student ${reportType} report generated`, 'success');
            
            // Option to export
            if (format !== 'preview') {
                this.exportData(data, `student-${reportType}-report`, format);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Error generating student report:', error);
            this.showToast('Error generating student report: ' + error.message, 'error');
        }
    }
    
    async generateAcademicReport() {
        try {
            const centreFilter = this.getSelectedValues('academicReportCenter');
            const reportType = this.getSafeElementValue('academicReportType', 'marks');
            const format = this.getSafeElementValue('academicReportFormat', 'csv');
            
            console.log(`📈 Generating ${reportType} academic report in ${format} format`);
            
            let data = [];
            if (reportType === 'marks') {
                data = await this.generateMarksReport();
            } else if (reportType === 'performance') {
                data = await this.generatePerformanceReport();
            } else if (reportType === 'grades') {
                data = await this.generateGradeDistributionReport();
            } else if (reportType === 'coursewise') {
                data = await this.generateCoursewiseReport();
            } else if (reportType === 'center_performance') {
                data = await this.generateCentrePerformanceReport();
            }
            
            this.previewReportData(data, `Academic ${reportType} Report`);
            this.showToast(`Academic ${reportType} report generated`, 'success');
            
            // Option to export
            if (format !== 'preview') {
                this.exportData(data, `academic-${reportType}-report`, format);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Error generating academic report:', error);
            this.showToast('Error generating academic report: ' + error.message, 'error');
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
    
    async generateAcademicReportData() {
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
            if (!this.selectedStudentForTranscript) {
                this.showToast('Please select a student first', 'warning');
                await this.openTranscriptModal();
                return;
            }
            
            console.log('Previewing transcript for student ID:', this.selectedStudentForTranscript.id);
            
            const data = await this.generateTranscriptData(this.selectedStudentForTranscript.id);
            this.previewTranscriptData(data);
            
            this.showToast('Transcript preview loaded', 'success');
            
        } catch (error) {
            console.error('❌ Error previewing transcript:', error);
            this.showToast('Error previewing transcript: ' + error.message, 'error');
        }
    }
    
    async generateTranscript() {
        try {
            if (!this.selectedStudentForTranscript) {
                this.showToast('Please select a student first', 'warning');
                await this.openTranscriptModal();
                return;
            }
            
            const format = this.getSafeElementValue('transcriptFormat', 'pdf');
            
            console.log(`📄 Generating ${format.toUpperCase()} transcript for student ID: ${this.selectedStudentForTranscript.id}`);
            
            const data = await this.generateTranscriptData(this.selectedStudentForTranscript.id);
            
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
    
    async loadSampleTranscript() {
        try {
            const students = this.students.length > 0 ? this.students : await this.getStudents();
            if (students.length > 0) {
                this.selectedStudentForTranscript = students[0];
                this.displaySelectedStudentInfo();
                await this.previewTranscript();
                this.showToast('Loaded sample transcript', 'info');
            } else {
                this.showToast('No students found in database', 'warning');
            }
        } catch (error) {
            console.error('Error loading sample transcript:', error);
            this.showToast('Error loading sample: ' + error.message, 'error');
        }
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
        } else if (format === 'pdf') {
            this.showToast('PDF export requires additional setup', 'info');
            this.exportToCSV(data, filename); // Fallback to CSV
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
    
    async refreshReports() {
        this.showToast('Refreshing reports...', 'info');
        try {
            await this.loadAllData();
            await this.updateStatistics();
            await this.generateReportsGrid();
            this.showToast('Reports refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports: ' + error.message, 'error');
        }
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
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv || previewDiv.innerHTML === '') {
            this.showToast('No preview to download', 'warning');
            return;
        }
        
        this.showToast('Downloading preview...', 'info');
        // Implementation would depend on what's in the preview
    }
    
    bulkTranscripts() {
        this.showToast('Bulk transcripts feature coming soon', 'info');
    }
    
    async debugStudentData() {
        console.log('🔍 Debugging student data...');
        
        try {
            // Test getting students
            const students = await this.getStudents();
            console.log(`📊 Total students: ${students.length}`);
            
            if (students.length > 0) {
                console.log('📋 Sample student data:');
                students.slice(0, 3).forEach((student, index) => {
                    console.log(`Student ${index + 1}:`, {
                        id: student.id,
                        reg_number: student.reg_number,
                        name: student.full_name,
                        centre: student.centre_name,
                        program: student.program_name,
                        intake_year: student.intake_year
                    });
                });
            }
            
            // Test getting programs
            const programs = await this.getPrograms();
            console.log(`🎓 Total programs: ${programs.length}`);
            
            if (programs.length > 0) {
                console.log('📋 Sample program data:');
                programs.slice(0, 3).forEach((program, index) => {
                    console.log(`Program ${index + 1}:`, {
                        id: program.id,
                        code: program.code,
                        name: program.name
                    });
                });
            }
            
            // Test getting centres
            const centres = await this.getCentres();
            console.log(`🏛️ Total centres: ${centres.length}`);
            
            console.log('✅ Debug complete');
            
        } catch (error) {
            console.error('❌ Debug error:', error);
        }
    }
    
    previewStudentReport() {
        this.studentReport();
    }
    
    previewAcademicReport() {
        this.academicReport();
    }
    
    quickStudentReport() {
        this.studentReport();
    }
    
    quickAcademicReport() {
        this.academicReport();
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
