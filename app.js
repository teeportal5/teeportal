// app.js - COMPLETE VERSION MATCHING YOUR EXACT DATABASE SCHEMA
class TEEPortalApp {
    constructor() {
        this.db = null;
        this.students = null;
        this.courses = null;
        this.marks = null;
        this.settings = null;
        this.dashboard = null;
        this.reports = null;
        this.transcripts = null;
        this.counties = null;
        this.centres = null;
        this.programs = null;
        this.modalManager = null;
        
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.initialized = false;
        this.cachedStudents = null;
        this._initializing = false;
        this._databaseLoaded = false;
    }
    
    async initialize() {
        if (this._initializing) return;
        if (this.initialized) return;
        
        this._initializing = true;
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Wait for database class to load
            if (typeof TEEPortalSupabaseDB === 'undefined') {
                console.log('📦 Loading database module...');
                await this._loadDatabaseModule();
            }
            
            // Create database instance
            console.log('🔗 Creating database connection...');
            this.db = new TEEPortalSupabaseDB();
            
            // Initialize database
            const dbInitialized = await this.db.init();
            console.log('✅ Database initialized:', dbInitialized);
            
            // Initialize modal manager first
            if (typeof ModalManager !== 'undefined') {
                this.modalManager = new ModalManager(this.db, this);
                window.modalManager = this.modalManager;
            }
            
            // Initialize modules
            this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TEEPortal Ready');
            
            // Show success toast
            this.showToast('System initialized successfully', 'success');
            
            // Set global reference
            window.app = this;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showToast('System initialized in limited mode. Some features may not work.', 'warning');
            
            // Create fallback database and continue
            this._createFallbackDatabase();
            this.initializeModules();
            this.setupEventListeners();
            this.initializeUI();
            this.initialized = true;
            window.app = this;
            
        } finally {
            this._initializing = false;
        }
    }
    
    async _loadDatabaseModule() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'modules/database.js';
            script.async = true;
            
            script.onload = () => {
                console.log('✅ Database module loaded');
                if (typeof TEEPortalSupabaseDB !== 'undefined') {
                    this._databaseLoaded = true;
                    resolve();
                } else {
                    reject(new Error('Database class not defined'));
                }
            };
            
            script.onerror = (error) => {
                console.error('❌ Failed to load database module:', error);
                reject(new Error('Failed to load database'));
            };
            
            document.head.appendChild(script);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this._databaseLoaded) {
                    console.warn('⚠️ Database loading timeout');
                    this._createFallbackDatabase();
                    resolve();
                }
            }, 10000);
        });
    }
    
    _createFallbackDatabase() {
        console.log('🔄 Creating fallback database...');
        
        class FallbackDB {
            constructor() {
                console.log('📦 Fallback database created');
                this.initialized = true;
                this.settings = this.getDefaultSettings();
            }
            
            async init() {
                console.log('✅ Fallback database initialized');
                return true;
            }
            
            async ensureConnected() {
                return this;
            }
            
            // ========== STUDENT METHODS ==========
            async getStudents(filterOptions = {}) {
                console.log('📋 Fallback: Getting students');
                return [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        reg_number: 'TEE-2023-001',
                        full_name: 'John Doe',
                        email: 'john@example.com',
                        phone: '0712345678',
                        date_of_birth: '1995-05-15',
                        gender: 'Male',
                        program: 'TEE', // TEXT, not UUID!
                        intake_year: 2023,
                        status: 'active',
                        centre_id: '550e8400-e29b-41d4-a716-446655440001',
                        county: 'Nairobi', // TEXT, not UUID!
                        region: 'Central',
                        ward: 'Westlands',
                        village: 'Kilimani',
                        address: '123 Main Street, Nairobi',
                        centre: 'Nairobi Main Campus',
                        centre_name: 'Nairobi Main Campus',
                        emergency_contact: '0712345679',
                        notes: 'Good student',
                        emergency_contact_name: 'Jane Doe',
                        emergency_contact_phone: '0712345679',
                        employer: 'ABC Company',
                        employment_status: 'Employed',
                        id_number: '12345678',
                        job_title: 'Manager',
                        years_experience: 5,
                        emergency_contact_relationship: 'Spouse',
                        study_mode: 'Full-time',
                        registration_date: '2023-01-15',
                        created_at: '2023-01-15T10:30:00Z',
                        updated_at: '2023-01-15T10:30:00Z'
                    }
                ];
            }
            
            async getStudent(id) {
                console.log('📋 Fallback: Getting student', id);
                return {
                    id: id,
                    reg_number: 'TEE-2023-001',
                    full_name: 'Unknown Student',
                    email: '',
                    phone: '',
                    date_of_birth: '1990-01-01',
                    gender: 'Male',
                    program: 'TEE', // TEXT, not UUID!
                    intake_year: new Date().getFullYear(),
                    status: 'active',
                    centre_id: '550e8400-e29b-41d4-a716-446655440001',
                    county: 'Nairobi', // TEXT, not UUID!
                    region: 'Central',
                    ward: '',
                    village: '',
                    address: '',
                    centre: 'Main Campus',
                    centre_name: 'Main Campus',
                    emergency_contact: '',
                    notes: '',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    employer: '',
                    employment_status: '',
                    id_number: '',
                    job_title: '',
                    years_experience: 0,
                    emergency_contact_relationship: '',
                    study_mode: 'Full-time',
                    registration_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }
            
            async addStudent(data) {
                console.log('📋 Fallback: Adding student');
                const studentId = '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12);
                return { 
                    id: studentId,
                    ...data,
                    reg_number: data.reg_number || 'FB-' + Date.now()
                };
            }
            
            async updateStudent(id, data) {
                console.log('📋 Fallback: Updating student');
                return { id: id, ...data };
            }
            
            async deleteStudent(id) {
                console.log('📋 Fallback: Deleting student');
                return { success: true };
            }
            
            // ========== PROGRAM METHODS ==========
            async getPrograms() {
                console.log('🎓 Fallback: Getting programs');
                return [
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440100',
                        code: 'TEE', 
                        name: 'Basic TEE', 
                        level: 'Certificate',
                        duration: 2, // Years
                        credits: 60,
                        max_credits: 72,
                        description: 'Basic theological education program',
                        status: 'active',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    },
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440101',
                        code: 'HNC', 
                        name: 'Higher National Certificate', 
                        level: 'Diploma',
                        duration: 3,
                        credits: 90,
                        max_credits: 108,
                        description: 'Advanced theological studies',
                        status: 'active',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    },
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440102',
                        code: 'ATE', 
                        name: 'Advanced TEE', 
                        level: 'Advanced Diploma',
                        duration: 4,
                        credits: 120,
                        max_credits: 144,
                        description: 'Advanced theological education',
                        status: 'active',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                ];
            }
            
            // ========== COURSE METHODS ==========
            async getCourses() {
                console.log('📚 Fallback: Getting courses');
                return [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440200',
                        course_code: 'MATH101',
                        course_name: 'Introduction to Mathematics',
                        program: 'TEE', // TEXT, not UUID!
                        credits: 3,
                        description: 'Basic mathematics concepts and operations',
                        status: 'active',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z',
                        academic_year: '2023/2024',
                        semester: 'Semester 1'
                    },
                    {
                        id: '550e8400-e29b-41d4-a716-446655440201',
                        course_code: 'ENG201',
                        course_name: 'Advanced English',
                        program: 'ATE', // TEXT, not UUID!
                        credits: 4,
                        description: 'Advanced English composition and literature',
                        status: 'active',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z',
                        academic_year: '2023/2024',
                        semester: 'Semester 2'
                    }
                ];
            }

            async addCourse(data) {
                console.log('📚 Fallback: Adding course');
                const courseId = '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12);
                return {
                    id: courseId,
                    course_code: data.course_code,
                    course_name: data.course_name,
                    program: data.program, // TEXT, not UUID!
                    credits: data.credits || 3,
                    description: data.description || '',
                    status: data.status || 'active',
                    academic_year: data.academic_year || '2023/2024',
                    semester: data.semester || 'Semester 1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }

            async updateCourse(id, data) {
                console.log('📚 Fallback: Updating course', id);
                return {
                    id: id,
                    course_code: data.course_code,
                    course_name: data.course_name,
                    program: data.program, // TEXT, not UUID!
                    credits: data.credits || 3,
                    description: data.description || '',
                    status: data.status || 'active',
                    academic_year: data.academic_year || '2023/2024',
                    semester: data.semester || 'Semester 1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }

            async deleteCourse(id) {
                console.log('📚 Fallback: Deleting course', id);
                return { success: true, id: id };
            }

            async getCourse(id) {
                console.log('📚 Fallback: Getting course', id);
                const courses = await this.getCourses();
                return courses.find(c => c.id === id) || null;
            }

            async getStudentsByCourse(courseId) {
                console.log('👥 Fallback: Getting students for course', courseId);
                return [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        reg_number: 'TEE-2023-001',
                        full_name: 'John Doe',
                        email: 'john@example.com',
                        centre_name: 'Nairobi Main Campus',
                        county: 'Nairobi',
                        intake_year: 2023,
                        existing_grade: '-',
                        existing_score: '-'
                    }
                ];
            }

            // ========== CENTRE METHODS ==========
            async getCentres() {
                console.log('📍 Fallback: Getting centres');
                return [
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        name: 'Nairobi Main Campus', 
                        code: 'NBO001', 
                        county: 'Nairobi', // TEXT, not UUID!
                        region: 'Central',
                        address: '123 Main Street, Nairobi',
                        contact_person: 'John Manager',
                        phone: '020-1234567',
                        email: 'nairobi@teecollege.ac.ke',
                        status: 'active',
                        description: 'Main campus in Nairobi',
                        sub_county: 'Westlands',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    },
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440002',
                        name: 'Mombasa Branch', 
                        code: 'MBA001', 
                        county: 'Mombasa', // TEXT, not UUID!
                        region: 'Coast',
                        address: '456 Coast Road, Mombasa',
                        contact_person: 'Jane Director',
                        phone: '041-2345678',
                        email: 'mombasa@teecollege.ac.ke',
                        status: 'active',
                        description: 'Coast region branch',
                        sub_county: 'Mvita',
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                ];
            }

            // ========== COUNTY METHODS ==========
            async getCounties() {
                console.log('🗺️ Fallback: Getting counties');
                return [
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440010',
                        code: '001',
                        name: 'Nairobi', 
                        region: 'Central',
                        created_at: '2023-01-01T00:00:00Z'
                    },
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440011',
                        code: '002',
                        name: 'Mombasa', 
                        region: 'Coast',
                        created_at: '2023-01-01T00:00:00Z'
                    },
                    { 
                        id: '550e8400-e29b-41d4-a716-446655440012',
                        code: '003',
                        name: 'Kisumu', 
                        region: 'Nyanza',
                        created_at: '2023-01-01T00:00:00Z'
                    }
                ];
            }

            // ========== MARK METHODS ==========
            async getMarksTableData() {
                console.log('📊 Fallback: Getting marks');
                return [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440300',
                        student_id: '550e8400-e29b-41d4-a716-446655440000',
                        course_id: '550e8400-e29b-41d4-a716-446655440200',
                        centre_id: '550e8400-e29b-41d4-a716-446655440001',
                        assessment_type: 'Final Exam',
                        assessment_name: 'Mathematics Final',
                        score: 85,
                        max_score: 100,
                        percentage: 85.0,
                        grade: 'DISTINCTION',
                        grade_points: 4.0,
                        remarks: 'Excellent performance',
                        visible_to_student: true,
                        entered_by: 'admin',
                        assessment_date: '2023-06-15',
                        created_at: '2023-06-15T10:30:00Z',
                        updated_at: '2023-06-15T10:30:00Z'
                    }
                ];
            }

            async getMarks() {
                return await this.getMarksTableData();
            }

            async addMark(data) {
                console.log('📊 Fallback: Adding mark', data);
                return {
                    id: '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12),
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }

            async updateMark(id, data) {
                console.log('📊 Fallback: Updating mark');
                return { id: id, ...data };
            }

            async deleteMark(id) {
                console.log('📊 Fallback: Deleting mark');
                return true;
            }

            async getMarkById(id) {
                console.log('📊 Fallback: Getting mark');
                return null;
            }

            async checkDuplicateMarks(studentId, courseId, assessmentType, assessmentDate) {
                console.log('🔍 Fallback: Checking duplicate marks');
                return [];
            }

            async getStudentMarks(studentId) {
                return [];
            }

            // ========== ENROLLMENT METHODS ==========
            async getEnrollments() {
                console.log('📝 Fallback: Getting enrollments');
                return [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440400',
                        student_id: '550e8400-e29b-41d4-a716-446655440000',
                        course_id: '550e8400-e29b-41d4-a716-446655440200',
                        program_id: '550e8400-e29b-41d4-a716-446655440100',
                        academic_year: 2023,
                        semester: 'Semester 1',
                        enrollment_date: '2023-01-15',
                        enrollment_status: 'Active',
                        enrollment_type: 'Regular',
                        final_grade: null,
                        completion_date: null,
                        credits_attempted: 3,
                        credits_earned: 3,
                        is_active: true,
                        notes: 'Regular enrollment',
                        created_at: '2023-01-15T10:30:00Z',
                        updated_at: '2023-01-15T10:30:00Z'
                    }
                ];
            }

            // ========== SETTINGS METHODS ==========
            getDefaultSettings() {
                return {
                    institute_name: 'Theological Education by Extension College',
                    institute_abbreviation: 'TEE College',
                    address: 'P.O. Box 12345, Nairobi, Kenya',
                    phone: '+254 20 1234567',
                    email: 'info@teecollege.ac.ke',
                    website: 'www.teecollege.ac.ke',
                    logo_url: '/images/logo.png',
                    academic_year: new Date().getFullYear()
                };
            }
            
            async getSettings() {
                console.log('⚙️ Fallback: Getting settings');
                return this.getDefaultSettings();
            }
            
            // ========== UTILITY METHODS ==========
            async generateRegistrationNumber(programCode, intakeYear) {
                console.log('🔢 Fallback: Generating registration number');
                // Your database stores program as TEXT (program code), not UUID
                const program = programCode || 'TEE';
                const timestamp = Date.now().toString().slice(-6);
                return `${program}-${intakeYear}-${timestamp}`;
            }
            
            async getLastStudentForProgramYear(programCode, intakeYear) {
                console.log('📅 Fallback: Getting last student');
                return null;
            }
            
            calculateGrade(percentage) {
                if (typeof percentage !== 'number' || isNaN(percentage)) {
                    return { grade: 'FAIL', points: 0.0 };
                }
                if (percentage >= 85) return { grade: 'DISTINCTION', points: 4.0 };
                if (percentage >= 70) return { grade: 'CREDIT', points: 3.0 };
                if (percentage >= 50) return { grade: 'PASS', points: 2.0 };
                return { grade: 'FAIL', points: 0.0 };
            }
            
            async calculateStudentGPA(studentId) {
                return 0;
            }
            
            async logActivity(type, description) {
                console.log(`📝 Activity: ${type} - ${description}`);
            }
        }
        
        // Create global database class
        window.TEEPortalSupabaseDB = FallbackDB;
        console.log('✅ Fallback database class created');
    }
    
    initializeModules() {
        try {
            console.log('🔄 Initializing modules...');
            
            // Initialize student manager
            if (typeof StudentManager !== 'undefined') {
                this.students = new StudentManager(this.db, this);
                console.log('✅ StudentManager initialized');
            } else {
                console.warn('⚠️ StudentManager not loaded');
            }
            
            // Initialize marks manager
            if (typeof MarksManager !== 'undefined') {
                this.marks = new MarksManager(this.db, this);
                console.log('✅ MarksManager initialized');
            } else {
                console.warn('⚠️ MarksManager not loaded');
            }
            
            // Initialize course manager
            if (typeof CourseManager !== 'undefined') {
                this.courses = new CourseManager(this.db, this);
                console.log('✅ CourseManager initialized');
                
                // Load courses after a short delay
                setTimeout(() => {
                    if (this.courses && this.courses.loadCourses) {
                        this.courses.loadCourses();
                        this.courses.updateStatistics();
                        console.log('📚 Courses loaded');
                    }
                }, 1500);
            } else {
                console.warn('⚠️ CourseManager not loaded - will try to load it dynamically');
                this.loadCourseManagerScript();
            }
            
            // Initialize program manager
            if (typeof ProgramManager !== 'undefined') {
                this.programs = new ProgramManager(this.db, this);
                console.log('✅ ProgramManager initialized');
            } else {
                console.warn('⚠️ ProgramManager not loaded');
            }
            
            // Initialize centre manager
            if (typeof CentreManager !== 'undefined') {
                this.centres = new CentreManager(this.db, this);
                console.log('✅ CentreManager initialized');
            } else {
                console.warn('⚠️ CentreManager not loaded');
            }
            
            // Initialize county manager
            if (typeof CountyManager !== 'undefined') {
                this.counties = new CountyManager(this.db, this);
                console.log('✅ CountyManager initialized');
            } else {
                console.warn('⚠️ CountyManager not loaded');
            }
            
            // Initialize dashboard manager
            if (typeof DashboardManager !== 'undefined') {
                this.dashboard = new DashboardManager(this.db, this);
                console.log('✅ DashboardManager initialized');
            } else {
                console.warn('⚠️ DashboardManager not loaded');
            }
            
            // Initialize Report Manager
            this.initializeReportsManager();
            
            // Initialize settings manager (if exists)
            if (typeof SettingsManager !== 'undefined') {
                this.settings = new SettingsManager(this.db, this);
                console.log('✅ SettingsManager initialized');
            } else {
                console.warn('⚠️ SettingsManager not loaded');
            }
            
            // Initialize transcripts manager (if exists)
            if (typeof TranscriptsManager !== 'undefined') {
                this.transcripts = new TranscriptsManager(this.db, this);
                console.log('✅ TranscriptsManager initialized');
            } else {
                console.warn('⚠️ TranscriptsManager not loaded');
            }
            
            console.log('✅ All modules initialized');
            
            // Setup button listeners for all modules
            setTimeout(() => this.setupAllButtonListeners(), 2000);
            
        } catch (error) {
            console.error('❌ Error initializing modules:', error);
            this.showToast('Error initializing modules', 'error');
        }
    }

    /**
     * Initialize Reports Manager with proper checks
     */
    initializeReportsManager() {
        try {
            // First try ReportsManager (with 's')
            if (typeof ReportsManager !== 'undefined') {
                this.reports = new ReportsManager(this.db, this);
                console.log('✅ ReportsManager initialized');
                
                // Initialize in background
                setTimeout(async () => {
                    try {
                        if (this.reports?.initialize) {
                            await this.reports.initialize();
                            console.log('📊 ReportsManager fully initialized');
                            
                            // Pre-populate data
                            if (this.reports.populateReportDropdowns) {
                                await this.reports.populateReportDropdowns();
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ ReportsManager background init failed:', error);
                    }
                }, 1000);
                
                return;
            }
            
            // Fallback: try ReportManager (without 's')
            if (typeof ReportManager !== 'undefined') {
                this.reports = new ReportManager(this.db, this);
                console.log('✅ ReportManager initialized (alternative)');
                return;
            }
            
            // If not loaded, try dynamic loading
            console.warn('⚠️ ReportsManager not loaded, attempting dynamic load');
            this.loadReportsManagerScript();
            
        } catch (error) {
            console.error('❌ Error initializing ReportsManager:', error);
        }
    }

    /**
     * Load ReportsManager script dynamically
     */
    loadReportsManagerScript() {
        console.log('📦 Loading ReportsManager script...');
        
        const script = document.createElement('script');
        script.src = 'modules/reports.js';
        script.async = true;
        
        script.onload = () => {
            console.log('✅ ReportsManager script loaded');
            
            if (typeof ReportsManager !== 'undefined') {
                this.reports = new ReportsManager(this.db, this);
                console.log('✅ ReportsManager initialized dynamically');
                
                // Initialize after a short delay
                setTimeout(async () => {
                    try {
                        if (this.reports?.initialize) {
                            await this.reports.initialize();
                            console.log('📊 ReportsManager initialized after dynamic load');
                            
                            // Setup button listeners for reports
                            this.setupReportsButtonListeners();
                            
                            this.showToast('Reports module loaded successfully', 'success');
                        }
                    } catch (error) {
                        console.warn('⚠️ Dynamic ReportsManager init failed:', error);
                    }
                }, 1500);
            } else {
                console.error('❌ ReportsManager still undefined after script load');
                this.showToast('Reports module failed to load completely', 'warning');
            }
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load ReportsManager script:', error);
            this.showToast('Could not load reports module', 'error');
            
            // Create a fallback reports object to prevent errors
            this.createReportsFallback();
        };
        
        document.head.appendChild(script);
    }

    /**
     * Create fallback reports object to prevent errors
     */
    createReportsFallback() {
        console.log('🛡️ Creating reports fallback...');
        
        this.reports = {
            // Safe methods that won't crash
            initialize: async () => {
                console.log('📊 Reports fallback initialized');
                return true;
            },
            
            debugDropdowns: () => {
                console.log('🔍 Debug reports fallback');
                alert('Reports module is loading... Please wait a moment and try again.');
            },
            
            refreshReports: () => {
                console.log('🔄 Refresh reports fallback');
                alert('Reports module is loading... Please wait.');
            },
            
            populateReportDropdowns: () => {
                console.log('📋 Populate dropdowns fallback');
                alert('Reports data is being loaded...');
            },
            
            generateSummaryReport: () => {
                console.log('📄 Generate summary fallback');
                alert('Reports module not ready yet. Try clicking "Refresh Data" first.');
            },
            
            studentReport: () => {
                alert('Student reports not ready yet.');
            },
            
            academicReport: () => {
                alert('Academic reports not ready yet.');
            },
            
            generateCentreReport: () => {
                alert('Centre reports not ready yet.');
            },
            
            // Add other required methods...
            showToast: (message, type = 'info') => {
                alert(`${type.toUpperCase()}: ${message}`);
            }
        };
        
        console.log('✅ Reports fallback created');
    }

    /**
     * Setup all button listeners
     */
    setupAllButtonListeners() {
        console.log('🔗 Setting up all button listeners...');
        
        // Setup reports button listeners
        this.setupReportsButtonListeners();
        
        // Setup other module button listeners if needed
        this.setupOtherButtonListeners();
        
        console.log('✅ All button listeners setup');
    }

    /**
     * Setup safe button listeners for reports section
     */
    setupReportsButtonListeners() {
        console.log('🔗 Setting up reports button listeners...');
        
        // Wait for DOM to be ready
        setTimeout(() => {
            // Define button mappings - match your HTML button IDs
            const buttonMappings = [
                { id: 'summaryReportBtn', method: 'generateSummaryReport', fallback: 'Summary report not ready' },
                { id: 'refreshReportsBtn', method: 'refreshReports', fallback: 'Refreshing reports...' },
                { id: 'refreshDataBtn', method: 'populateReportDropdowns', fallback: 'Refreshing data...' },
                { id: 'debugReportsBtn', method: 'debugDropdowns', fallback: 'Debugging...' },
                { id: 'studentReportBtn', method: 'studentReport', fallback: 'Student reports not ready' },
                { id: 'academicReportBtn', method: 'academicReport', fallback: 'Academic reports not ready' },
                { id: 'centreReportBtn', method: 'generateCentreReport', fallback: 'Centre reports not ready' },
                { id: 'applyFiltersBtn', method: 'applyFilters', fallback: 'Applying filters...' },
                { id: 'clearFiltersBtn', method: 'clearFilters', fallback: 'Clearing filters...' },
                { id: 'previewTranscriptBtn', method: 'previewTranscript', fallback: 'Transcript preview not ready' },
                { id: 'generateTranscriptBtn', method: 'generateTranscript', fallback: 'Transcript generation not ready' }
            ];
            
            // Setup each button
            buttonMappings.forEach(({ id, method, fallback }) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (this.reports && typeof this.reports[method] === 'function') {
                            console.log(`📊 Calling reports.${method}()`);
                            return this.reports[method]();
                        } else {
                            console.warn(`⚠️ Reports method ${method} not available`);
                            alert(fallback || 'Reports module not ready yet');
                            
                            // Try to initialize if not ready
                            if (!this.reports && this.loadReportsManagerScript) {
                                this.loadReportsManagerScript();
                                alert('Reports module is loading. Please try again in a moment.');
                            }
                        }
                    };
                    console.log(`✅ Button ${id} bound to reports.${method}`);
                } else {
                    console.log(`⚠️ Button ${id} not found in DOM`);
                }
            });
            
            // Also update onclick handlers in the DOM
            this.updateReportsOnclickHandlers();
            
            console.log('✅ Reports button listeners setup complete');
            
        }, 1000); // Delay to ensure DOM is ready
    }

    /**
     * Update onclick handlers in the DOM for reports section
     */
    updateReportsOnclickHandlers() {
        // Update all onclick attributes that reference app.reports
        document.querySelectorAll('[onclick*="app.reports"]').forEach(element => {
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr) {
                // Extract method name from onclick
                const match = onclickAttr.match(/app\.reports\.(\w+)\(/);
                if (match) {
                    const methodName = match[1];
                    element.onclick = (e) => {
                        e.preventDefault();
                        if (this.reports && this.reports[methodName]) {
                            return this.reports[methodName]();
                        } else {
                            alert(`Reports function ${methodName} not ready`);
                        }
                    };
                    console.log(`✅ Updated onclick for ${methodName}`);
                }
            }
        });
    }

    /**
     * Setup other button listeners
     */
    setupOtherButtonListeners() {
        // Add other module button setups here if needed
        console.log('🔗 Other button listeners setup');
    }

    /**
     * Load CourseManager script dynamically
     */
    loadCourseManagerScript() {
        if (typeof CourseManager !== 'undefined') {
            this.courses = new CourseManager(this.db, this);
            console.log('✅ CourseManager initialized from dynamic check');
            return;
        }
        
        console.log('📦 Loading CourseManager script...');
        
        const script = document.createElement('script');
        script.src = 'modules/courses.js';
        script.async = true;
        
        script.onload = () => {
            console.log('✅ CourseManager script loaded');
            if (typeof CourseManager !== 'undefined') {
                this.courses = new CourseManager(this.db, this);
                console.log('✅ CourseManager initialized');
                
                setTimeout(() => {
                    if (this.courses?.loadCourses) {
                        this.courses.loadCourses();
                        this.courses.updateStatistics();
                        console.log('📚 Courses loaded dynamically');
                    }
                }, 500);
            } else {
                console.error('❌ CourseManager still undefined');
            }
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load CourseManager:', error);
            this.showToast('Courses module failed to load', 'error');
        };
        
        document.head.appendChild(script);
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            // Load dropdown data
            await this.loadDropdownData();
            
            // Load students if manager is available
            if (this.students && this.students.loadStudentsTable) {
                await this.students.loadStudentsTable();
                console.log('✅ Students table loaded');
            }
            
            // Load marks if manager is available
            if (this.marks && this.marks.loadMarksTable) {
                await this.marks.loadMarksTable();
                console.log('✅ Marks table loaded');
            }
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showToast('Error loading initial data', 'error');
        }
    }
    
    async loadDropdownData() {
        try {
            console.log('📊 Loading dropdown data...');
            
            // Load counties - using county_name as text value
            if (this.db.getCounties) {
                const counties = await this.db.getCounties();
                // Students store county as TEXT (county name), not UUID
                this.populateSelect('studentCounty', counties, 'name', 'name', 'Select County', 'region');
                this.populateSelect('filterCounty', counties, 'name', 'name', 'All Counties', 'region');
                console.log(`✅ Loaded ${counties.length} counties`);
            }
            
            // Load centres
if (this.db.getCentres) {
    const centres = await this.db.getCentres();
    
    // EXTRA DEBUGGING
    console.log('📍 Centres from database:', centres);
    console.log('📍 First centre full object:', centres[0]);
    console.log('📍 Checking fields in first centre:');
    console.log('  - Has id?', centres[0].id);
    console.log('  - Has name?', centres[0].name);
    console.log('  - Has code?', centres[0].code);
    console.log('  - Has county?', centres[0].county);
    console.log('  - Has region?', centres[0].region);
    
    // Force test with sample data
    const testCentres = [
        {
            id: "ab5aef9e-816b-4208-bc20-c3e066e7a1ce",
            name: "PUEA HEADQUATERS ",
            code: "PUEA-HQ",
            county: "Nairobi",
            region: "Central",
            status: "active"
        },
        {
            id: "b3dec280-63fd-483d-9b22-781153a64888",
            name: "DR ArTHUR",
            code: "NKR",
            county: "Nakuru",
            region: "Nakuru Town East",
            status: "active"
        }
    ];
    
    // Try with real data first
    this.populateSelect('studentCentre', centres, 'id', 'name', 'Select Centre');
    this.populateSelect('filterCentre', centres, 'id', 'name', 'All Centres');
    
    // If that doesn't work, try with test data
    // this.populateSelect('studentCentre', testCentres, 'id', 'name', 'Select Centre');
    // this.populateSelect('filterCentre', testCentres, 'id', 'name', 'All Centres');
    
    console.log(`✅ Loaded ${centres.length} centres`);
}
            
            // Load programs - using program code as text value (NOT UUID!)
            if (this.db.getPrograms) {
                const programs = await this.db.getPrograms();
                
                console.log('📋 Programs loaded:', programs.length);
                if (programs.length > 0) {
                    console.log('🔍 First program:', programs[0]);
                    console.log('🔍 Program has code field:', programs[0].code);
                    console.log('🔍 Program has name field:', programs[0].name);
                }
                
                // CRITICAL FIX: Students store program as TEXT (program code), not UUID!
                // So we need to use 'code' as the value, not 'id'
                this.populateSelect('studentProgram', programs, 'code', 'code', 'Select Program', 'name');
                this.populateSelect('filterProgram', programs, 'code', 'code', 'All Programs', 'name');
                
                console.log(`✅ Loaded ${programs.length} programs (using code as value)`);
            }
            
            console.log('✅ All dropdown data loaded');
            
        } catch (error) {
            console.warn('⚠️ Could not load dropdown data:', error);
            this.showToast('Error loading dropdown data', 'error');
        }
    }
    
    /**
     * Populate select dropdown - UPDATED FOR YOUR SCHEMA
     */
  populateSelect(selectId, data, valueKey, textKey, defaultText, extraTextKey = null) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`⚠️ Select element ${selectId} not found`);
        return;
    }
    
    select.innerHTML = `<option value="">${defaultText}</option>`;
    
    if (!data || data.length === 0) {
        console.warn(`⚠️ No data to populate ${selectId}`);
        return;
    }
    
    console.log(`🔍 Populating ${selectId} with ${data.length} items`);
    console.log(`🔍 First item keys:`, Object.keys(data[0]));
    console.log(`🔍 First item values:`, data[0]);
    
    data.forEach((item, index) => {
        const option = document.createElement('option');
        
        // Get the value - handle missing values
        let value = item[valueKey];
        if (value === undefined || value === null) {
            console.warn(`⚠️ Item ${index} missing value key "${valueKey}":`, item);
            value = '';
        }
        option.value = value;
        
        // Build display text based on select type
        let displayText = '';
        
        // FOR CENTRES: "NAME (CODE) - COUNTY"
        if (selectId.includes('Centre') || selectId.includes('centre')) {
            const name = item.name || '';
            const code = item.code || '';
            const county = item.county || '';
            
            if (name && code) {
                displayText = `${name} (${code})`;
            } else if (name) {
                displayText = name;
            } else if (code) {
                displayText = `Centre ${code}`;
            }
            
            if (county && displayText) {
                displayText += ` - ${county}`;
            }
            
            console.log(`🔍 Centre ${index}: name="${name}", code="${code}", county="${county}", display="${displayText}"`);
        }
        // FOR PROGRAMS: "CODE - NAME (duration)"
        else if (selectId.includes('Program') || selectId.includes('program')) {
            const code = item.code || '';
            const name = item.name || '';
            const duration = item.duration || '';
            
            if (code && name) {
                displayText = `${code} - ${name}`;
            } else if (code) {
                displayText = code;
            } else if (name) {
                displayText = name;
            }
            
            if (duration && displayText) {
                displayText += ` (${duration} year${duration > 1 ? 's' : ''})`;
            }
        }
        // FOR COUNTIES: "NAME (REGION)"
        else if (selectId.includes('County') || selectId.includes('county')) {
            const name = item.name || '';
            const region = item.region || '';
            
            if (name && region) {
                displayText = `${name} (${region})`;
            } else if (name) {
                displayText = name;
            }
        }
        // DEFAULT: Use textKey + extraTextKey
        else {
            displayText = item[textKey] || '';
            if (extraTextKey && item[extraTextKey]) {
                displayText += ` (${item[extraTextKey]})`;
            }
        }
        
        // Final fallback
        if (!displayText || displayText.trim() === '') {
            displayText = value || `Item ${index}`;
            console.warn(`⚠️ Empty display text for item ${index}, using: "${displayText}"`);
        }
        
        option.textContent = this.escapeHtml(displayText);
        select.appendChild(option);
    });
    
    console.log(`✅ Populated ${selectId} with ${data.length} items`);
    
    // Debug: Check what's in the dropdown
    setTimeout(() => {
        const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
        }));
        console.log(`🔍 ${selectId} options:`, options);
    }, 100);
}
    
    initializeUI() {
        console.log('🎨 Initializing UI...');
        
        // Set today's date for all date inputs
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input && !input.value) {
                input.value = today;
                input.max = today;
            }
        });
        
        // Initialize intake year dropdown
        this.initializeIntakeYearDropdown();
        
        // Fix any PHP code in date inputs
        this.fixDateInputs();
        
        console.log('✅ UI initialized');
    }
    
    initializeIntakeYearDropdown() {
        const intakeSelect = document.getElementById('studentIntake');
        if (!intakeSelect) return;
        
        const currentYear = new Date().getFullYear();
        intakeSelect.innerHTML = '<option value="">Select Intake Year</option>';
        
        for (let year = currentYear - 10; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            intakeSelect.appendChild(option);
        }
    }
    
    fixDateInputs() {
        // Remove any PHP code from date inputs
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input.value && input.value.includes('<?php')) {
                input.value = new Date().toISOString().split('T')[0];
            }
        });
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        try {
            // Student form submission
            const studentForm = document.getElementById('studentForm');
            if (studentForm) {
                studentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.students && this.students.saveStudent) {
                        this.students.saveStudent(e);
                    } else {
                        this.showToast('Student module not available', 'error');
                    }
                });
            }
            
            // Marks form submission
            const marksForm = document.getElementById('marksForm');
            if (marksForm) {
                marksForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.marks && this.marks.saveMarks) {
                        this.marks.saveMarks(e);
                    } else {
                        this.showToast('Marks module not available', 'error');
                    }
                });
            }
            
            // Filter changes
            const filterIds = ['filterCounty', 'filterCentre', 'filterProgram', 'filterStatus'];
            filterIds.forEach(id => {
                const element = document.getElementById(id);
                if (element && this.students && this.students.filterStudents) {
                    element.addEventListener('change', () => this.students.filterStudents());
                }
            });
            
            // Search input
            const searchInput = document.getElementById('studentSearch');
            if (searchInput && this.students && this.students.searchStudents) {
                searchInput.addEventListener('input', (e) => {
                    this.students.searchStudents(e.target.value);
                });
            }
            
            // Registration number generation triggers - UPDATED FOR TEXT PROGRAM
            const programSelect = document.getElementById('studentProgram');
            const intakeSelect = document.getElementById('studentIntake');
            
            if (programSelect && this.students && this.students.generateRegNumber) {
                programSelect.addEventListener('change', () => {
                    // Get the selected program CODE (not UUID)
                    const programCode = programSelect.value;
                    this.students.generateRegNumber(programCode);
                });
            }
            
            if (intakeSelect && this.students && this.students.generateRegNumber) {
                intakeSelect.addEventListener('change', () => {
                    const programCode = programSelect ? programSelect.value : '';
                    const intakeYear = intakeSelect.value;
                    this.students.generateRegNumber(programCode, intakeYear);
                });
            }
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }
    
    showToast(message, type = 'info') {
        try {
            // Remove existing toasts if too many
            const existingToasts = document.querySelectorAll('.toast');
            if (existingToasts.length > 3) {
                existingToasts[0].remove();
            }
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                border-radius: 8px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            `;
            
            const icon = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         'fa-info-circle';
            
            toast.innerHTML = `
                <i class="fas ${icon}" style="font-size: 18px;"></i>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    font-size: 16px;
                    opacity: 0.8;
                ">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            document.body.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 5000);
            
            // Add animation styles if not already present
            if (!document.querySelector('#toast-animations')) {
                const style = document.createElement('style');
                style.id = 'toast-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Compatibility functions for modals
    openStudentModal() {
        this.openModal('studentModal');
    }
    
    openMarksModal() {
        this.openModal('marksModal');
    }
    
    openModal(modalId) {
        if (this.modalManager) {
            this.modalManager.openModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    closeModal(modalId) {
        if (this.modalManager) {
            this.modalManager.closeModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
    }
}

// ==============================
// GLOBAL INITIALIZATION
// ==============================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    // Prevent multiple initializations
    if (window.app && window.app.initialized) {
        console.log('App already initialized');
        return;
    }
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'app-loading';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    loadingIndicator.innerHTML = `
        <div class="spinner" style="
            width: 60px;
            height: 60px;
            border: 5px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        "></div>
        <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 300;">TEEPortal</h2>
        <p style="margin: 0; opacity: 0.8; font-size: 14px;">Initializing system...</p>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loadingIndicator);
    
    try {
        // Create app instance
        const app = new TEEPortalApp();
        window.app = app;
        
        // Initialize with timeout
        const initTimeout = setTimeout(() => {
            loadingIndicator.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="spinner" style="
                        width: 60px;
                        height: 60px;
                        border: 5px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    "></div>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px;">Initializing System</h2>
                    <p style="margin: 0 0 20px 0; opacity: 0.8;">This is taking longer than expected...</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: white;
                        color: #764ba2;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        <i class="fas fa-redo"></i> Reload
                    </button>
                </div>
            `;
        }, 5000);
        
        // Initialize app
        await app.initialize();
        clearTimeout(initTimeout);
        
        // Remove loading indicator
        loadingIndicator.style.opacity = '0';
        loadingIndicator.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (loadingIndicator.parentElement) {
                loadingIndicator.remove();
            }
        }, 500);
        
        console.log('🎉 TEEPortal System Ready');
        
        // Show initial section
        setTimeout(() => {
            const hash = window.location.hash.substring(1);
            if (hash && document.getElementById(hash)) {
                showSection(hash);
            } else {
                showSection('dashboard');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        loadingIndicator.innerHTML = `
            <div style="text-align: center; padding: 20px; max-width: 500px;">
                <div style="font-size: 48px; color: #ff6b6b; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin: 0 0 10px 0; color: white; font-size: 24px;">Initialization Error</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9; line-height: 1.5;">
                    The system encountered an error during startup. The application will run in limited mode.
                </p>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <small style="display: block; margin-bottom: 5px; opacity: 0.8;">Error Details:</small>
                    <code style="font-family: monospace; font-size: 12px; color: #ffdddd; word-break: break-all;">
                        ${error.message || 'Unknown error'}
                    </code>
                </div>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin: 5px;
                ">
                    <i class="fas fa-redo"></i> Reload Application
                </button>
                <button onclick="document.getElementById('app-loading').remove()" style="
                    padding: 12px 24px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 5px;
                ">
                    Continue Anyway
                </button>
            </div>
        `;
        
        // Try to create app anyway
        setTimeout(() => {
            if (window.app) {
                loadingIndicator.remove();
                window.app.showToast('Running in limited mode', 'warning');
            }
        }, 3000);
    }
});

// ==============================
// GLOBAL HELPER FUNCTIONS
// ==============================

window.showSection = function(sectionId) {
    console.log('🔄 Switching to section:', sectionId);
    
    // Update URL hash
    history.replaceState(null, null, '#' + sectionId);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Update page title
        const titleMap = {
            'dashboard': 'Dashboard',
            'students': 'Students',
            'programs': 'Programs',
            'courses': 'Courses',
            'marks': 'Marks',
            'centres': 'Centres',
            'reports': 'Reports',
            'settings': 'Settings'
        };
        
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = titleMap[sectionId] || sectionId;
        }
    } else {
        console.error('Section not found:', sectionId);
        showSection('dashboard');
    }
    
    // Activate nav link
    const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Lazy load section data
    if (window.app) {
        setTimeout(() => window.app.lazyLoadSection(sectionId), 100);
    }
};

// Add to TEEPortalApp class
TEEPortalApp.prototype.lazyLoadSection = function(sectionId) {
    switch(sectionId) {
        case 'students':
            if (this.students && this.students.loadStudentsTable) {
                this.students.loadStudentsTable();
            }
            break;
        case 'marks':
            if (this.marks && this.marks.loadMarksTable) {
                this.marks.loadMarksTable();
            }
            break;
        case 'dashboard':
            if (this.dashboard && this.dashboard.updateDashboard) {
                this.dashboard.updateDashboard();
            }
            break;
        case 'reports':
            if (this.reports && this.reports.loadAllReports) {
                console.log('📈 Loading reports section...');
                this.reports.loadAllReports();
                this.reports.generateReportsGrid();
                this.reports.updateStatistics();
                
                if (this.transcripts && this.transcripts.initializeTranscriptsUI) {
                    setTimeout(() => {
                        this.transcripts.initializeTranscriptsUI();
                        console.log('📄 Transcripts UI initialized for reports section');
                    }, 500);
                }
            }
            break;
        case 'transcripts':
            if (this.transcripts && this.transcripts.initializeTranscriptsUI) {
                this.transcripts.initializeTranscriptsUI();
            }
            break;
        case 'courses':
            if (this.courses && this.courses.loadCourses) {
                this.courses.loadCourses();
            }
            break;
        case 'centres':
            if (this.centres && this.centres.loadCentres) {
                this.centres.loadCentres();
            }
            break;
        case 'programs':
            if (this.programs && this.programs.loadProgramsTable) {
                this.programs.loadProgramsTable();
            }
            break;
    }
};

// Handle hash changes
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showSection(hash);
    }
});

// Global modal functions
window.openModal = function(modalId) {
    if (window.app) {
        window.app.openModal(modalId);
    }
};

window.closeModal = function(modalId) {
    if (window.app) {
        window.app.closeModal(modalId);
    }
};

// Fix date inputs on page load
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.value && input.value.includes('<?php')) {
            input.value = new Date().toISOString().split('T')[0];
        }
        if (!input.value) {
            input.value = new Date().toISOString().split('T')[0];
        }
        input.max = new Date().toISOString().split('T')[0];
    });
});

console.log('📦 app.js loaded successfully');
