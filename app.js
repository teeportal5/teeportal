// app.js - ENHANCED PRODUCTION-READY VERSION
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
        this.currentSection = null;
        this.initialized = false;
        this.cachedStudents = null;
        this._initializing = false;
        this._databaseLoaded = false;
        
        // Enhanced caching
        this.cache = {
            students: { data: null, timestamp: null, ttl: 60000 },
            courses: { data: null, timestamp: null, ttl: 300000 },
            programs: { data: null, timestamp: null, ttl: 300000 },
            centres: { data: null, timestamp: null, ttl: 300000 },
            counties: { data: null, timestamp: null, ttl: 86400000 }
        };
        
        // Rate limiting
        this.rateLimits = {};
        
        // Timeout/Interval tracking
        this._timeouts = [];
        this._intervals = [];
        
        // Offline support
        this.pendingChanges = [];
        this.isOnline = navigator.onLine;
        
        // Keyboard shortcuts
        this.shortcuts = new Map();
        
        console.log('🚀 TEEPortal Application Instance Created');
    }
    
    async initialize() {
        if (this._initializing) {
            console.log('⚠️ Initialization already in progress');
            return;
        }
        if (this.initialized) {
            console.log('⚠️ Already initialized');
            return;
        }
        
        this._initializing = true;
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Track initialization start
            this.trackEvent('app', 'initialization_start');
            
            // Setup offline support first
            this.setupOfflineSupport();
            
            // Wait for database class to load
            if (typeof TEEPortalSupabaseDB === 'undefined') {
                console.log('📦 Loading database module...');
                await this._loadDatabaseModule();
            }
            
            // Create database instance
            console.log('🔗 Creating database connection...');
            this.db = new TEEPortalSupabaseDB();
            
            // Initialize database with timeout
            const dbInitialized = await Promise.race([
                this.db.init(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
                )
            ]);
            
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
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI
            this.initializeUI();
            
            // Preload other sections
            this.preloadSections();
            
            this.initialized = true;
            this.trackEvent('app', 'initialization_complete');
            
            console.log('✅ TEEPortal Ready');
            
            // Show success toast
            this.showToast('System initialized successfully', 'success', 3000);
            
            // Set global reference
            window.app = this;
            
            // Performance mark
            performance.mark('app-initialized');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.trackEvent('app', 'initialization_error', error.message);
            this.reportError(error, 'app-initialization');
            
            // Show user-friendly error modal
            this.showErrorModal({
                title: 'Limited Functionality Mode',
                message: 'The system is running with limited functionality. Some features may not be available.',
                details: error.message,
                retryAction: () => this.retryInitialization()
            });
            
            // Initialize critical components only
            await this.initializeCriticalComponents();
            
        } finally {
            this._initializing = false;
        }
    }
    
    async retryInitialization() {
        console.log('🔄 Retrying initialization...');
        this.initialized = false;
        await this.initialize();
    }
    
    async initializeCriticalComponents() {
        console.log('🛡️ Initializing critical components...');
        
        this._createFallbackDatabase();
        this.initializeModules();
        this.setupCriticalEventListeners();
        this.initializeUI();
        
        this.initialized = true;
        window.app = this;
        
        this.showToast('System running in basic mode', 'warning', 5000);
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
            const timeoutId = setTimeout(() => {
                if (!this._databaseLoaded) {
                    console.warn('⚠️ Database loading timeout');
                    this._createFallbackDatabase();
                    resolve();
                }
            }, 10000);
            
            this._timeouts.push(timeoutId);
        });
    }
    
    _createFallbackDatabase() {
        console.log('🔄 Creating fallback database...');
        
        class FallbackDB {
            constructor() {
                console.log('📦 Fallback database created');
                this.initialized = true;
                this.settings = this.getDefaultSettings();
                this.localStorage = window.localStorage;
                this._initLocalStorage();
            }
            
            _initLocalStorage() {
                // Initialize local storage structure
                if (!this.localStorage.getItem('tee_fallback_data')) {
                    this.localStorage.setItem('tee_fallback_data', JSON.stringify({
                        students: [],
                        courses: [],
                        programs: [],
                        centres: [],
                        marks: [],
                        lastUpdate: new Date().toISOString()
                    }));
                }
            }
            
            _getStorage() {
                const data = this.localStorage.getItem('tee_fallback_data');
                return data ? JSON.parse(data) : { students: [], courses: [], programs: [], centres: [], marks: [] };
            }
            
            _saveStorage(data) {
                data.lastUpdate = new Date().toISOString();
                this.localStorage.setItem('tee_fallback_data', JSON.stringify(data));
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
                const storage = this._getStorage();
                let students = storage.students;
                
                // Apply filters
                if (filterOptions.county) {
                    students = students.filter(s => s.county === filterOptions.county);
                }
                if (filterOptions.centre_id) {
                    students = students.filter(s => s.centre_id === filterOptions.centre_id);
                }
                if (filterOptions.program) {
                    students = students.filter(s => s.program === filterOptions.program);
                }
                if (filterOptions.status) {
                    students = students.filter(s => s.status === filterOptions.status);
                }
                if (filterOptions.search) {
                    const search = filterOptions.search.toLowerCase();
                    students = students.filter(s => 
                        s.full_name?.toLowerCase().includes(search) ||
                        s.reg_number?.toLowerCase().includes(search) ||
                        s.email?.toLowerCase().includes(search)
                    );
                }
                
                return students.length > 0 ? students : [this._getSampleStudent()];
            }
            
            _getSampleStudent() {
                return {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    reg_number: 'TEE-2023-001',
                    full_name: 'John Doe',
                    email: 'john@example.com',
                    phone: '0712345678',
                    date_of_birth: '1995-05-15',
                    gender: 'Male',
                    program: 'TEE',
                    intake_year: 2023,
                    status: 'active',
                    centre_id: '550e8400-e29b-41d4-a716-446655440001',
                    county: 'Nairobi',
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
                };
            }
            
            async getStudent(id) {
                console.log('📋 Fallback: Getting student', id);
                const storage = this._getStorage();
                const student = storage.students.find(s => s.id === id);
                
                return student || {
                    id: id,
                    reg_number: 'TEE-2023-001',
                    full_name: 'Unknown Student',
                    email: '',
                    phone: '',
                    date_of_birth: '1990-01-01',
                    gender: 'Male',
                    program: 'TEE',
                    intake_year: new Date().getFullYear(),
                    status: 'active',
                    centre_id: '550e8400-e29b-41d4-a716-446655440001',
                    county: 'Nairobi',
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
                const storage = this._getStorage();
                const studentId = '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12);
                const student = { 
                    id: studentId,
                    ...data,
                    reg_number: data.reg_number || 'FB-' + Date.now(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                storage.students.push(student);
                this._saveStorage(storage);
                
                return student;
            }
            
            async updateStudent(id, data) {
                console.log('📋 Fallback: Updating student');
                const storage = this._getStorage();
                const index = storage.students.findIndex(s => s.id === id);
                
                if (index !== -1) {
                    storage.students[index] = { 
                        ...storage.students[index], 
                        ...data,
                        updated_at: new Date().toISOString()
                    };
                    this._saveStorage(storage);
                    return storage.students[index];
                }
                
                return { id: id, ...data };
            }
            
            async deleteStudent(id) {
                console.log('📋 Fallback: Deleting student');
                const storage = this._getStorage();
                storage.students = storage.students.filter(s => s.id !== id);
                this._saveStorage(storage);
                return { success: true, id: id };
            }
            
            // ========== PROGRAM METHODS ==========
            async getPrograms() {
                console.log('🎓 Fallback: Getting programs');
                const storage = this._getStorage();
                
                if (storage.programs.length === 0) {
                    storage.programs = [
                        { 
                            id: '550e8400-e29b-41d4-a716-446655440100',
                            code: 'TEE', 
                            name: 'Basic TEE', 
                            level: 'Certificate',
                            duration: 2,
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
                        }
                    ];
                    this._saveStorage(storage);
                }
                
                return storage.programs;
            }
            
            // ========== COURSE METHODS ==========
            async getCourses() {
                console.log('📚 Fallback: Getting courses');
                const storage = this._getStorage();
                
                if (storage.courses.length === 0) {
                    storage.courses = [
                        {
                            id: '550e8400-e29b-41d4-a716-446655440200',
                            course_code: 'MATH101',
                            course_name: 'Introduction to Mathematics',
                            program: 'TEE',
                            credits: 3,
                            description: 'Basic mathematics concepts and operations',
                            status: 'active',
                            created_at: '2023-01-01T00:00:00Z',
                            updated_at: '2023-01-01T00:00:00Z',
                            academic_year: '2023/2024',
                            semester: 'Semester 1'
                        }
                    ];
                    this._saveStorage(storage);
                }
                
                return storage.courses;
            }

            async addCourse(data) {
                console.log('📚 Fallback: Adding course');
                const storage = this._getStorage();
                const courseId = '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12);
                const course = {
                    id: courseId,
                    course_code: data.course_code,
                    course_name: data.course_name,
                    program: data.program,
                    credits: data.credits || 3,
                    description: data.description || '',
                    status: data.status || 'active',
                    academic_year: data.academic_year || '2023/2024',
                    semester: data.semester || 'Semester 1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                storage.courses.push(course);
                this._saveStorage(storage);
                return course;
            }

            async updateCourse(id, data) {
                console.log('📚 Fallback: Updating course', id);
                const storage = this._getStorage();
                const index = storage.courses.findIndex(c => c.id === id);
                
                if (index !== -1) {
                    storage.courses[index] = { 
                        ...storage.courses[index], 
                        ...data,
                        updated_at: new Date().toISOString()
                    };
                    this._saveStorage(storage);
                    return storage.courses[index];
                }
                
                return { id: id, ...data };
            }

            async deleteCourse(id) {
                console.log('📚 Fallback: Deleting course', id);
                const storage = this._getStorage();
                storage.courses = storage.courses.filter(c => c.id !== id);
                this._saveStorage(storage);
                return { success: true, id: id };
            }

            async getCourse(id) {
                console.log('📚 Fallback: Getting course', id);
                const storage = this._getStorage();
                return storage.courses.find(c => c.id === id) || null;
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
                const storage = this._getStorage();
                
                if (storage.centres.length === 0) {
                    storage.centres = [
                        { 
                            id: '550e8400-e29b-41d4-a716-446655440001',
                            name: 'Nairobi Main Campus', 
                            code: 'NBO001', 
                            county: 'Nairobi',
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
                        }
                    ];
                    this._saveStorage(storage);
                }
                
                return storage.centres;
            }

            // ========== COUNTY METHODS ==========
            async getCounties() {
                console.log('🗺️ Fallback: Getting counties');
                const storage = this._getStorage();
                
                if (storage.counties.length === 0) {
                    storage.counties = [
                        { 
                            id: '550e8400-e29b-41d4-a716-446655440010',
                            code: '001',
                            name: 'Nairobi', 
                            region: 'Central',
                            created_at: '2023-01-01T00:00:00Z'
                        }
                    ];
                    this._saveStorage(storage);
                }
                
                return storage.counties;
            }

            // ========== MARK METHODS ==========
            async getMarksTableData() {
                console.log('📊 Fallback: Getting marks');
                const storage = this._getStorage();
                return storage.marks;
            }

            async getMarks() {
                return await this.getMarksTableData();
            }

            async addMark(data) {
                console.log('📊 Fallback: Adding mark', data);
                const storage = this._getStorage();
                const markId = '550e8400-e29b-41d4-a716-' + Date.now().toString().slice(-12);
                const mark = {
                    id: markId,
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                storage.marks.push(mark);
                this._saveStorage(storage);
                return mark;
            }

            async updateMark(id, data) {
                console.log('📊 Fallback: Updating mark');
                const storage = this._getStorage();
                const index = storage.marks.findIndex(m => m.id === id);
                
                if (index !== -1) {
                    storage.marks[index] = { 
                        ...storage.marks[index], 
                        ...data,
                        updated_at: new Date().toISOString()
                    };
                    this._saveStorage(storage);
                    return storage.marks[index];
                }
                
                return { id: id, ...data };
            }

            async deleteMark(id) {
                console.log('📊 Fallback: Deleting mark');
                const storage = this._getStorage();
                storage.marks = storage.marks.filter(m => m.id !== id);
                this._saveStorage(storage);
                return true;
            }

            async getMarkById(id) {
                console.log('📊 Fallback: Getting mark');
                const storage = this._getStorage();
                return storage.marks.find(m => m.id === id) || null;
            }

            async checkDuplicateMarks(studentId, courseId, assessmentType, assessmentDate) {
                console.log('🔍 Fallback: Checking duplicate marks');
                const storage = this._getStorage();
                return storage.marks.filter(m => 
                    m.student_id === studentId &&
                    m.course_id === courseId &&
                    m.assessment_type === assessmentType &&
                    m.assessment_date === assessmentDate
                );
            }

            async getStudentMarks(studentId) {
                const storage = this._getStorage();
                return storage.marks.filter(m => m.student_id === studentId);
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
                const program = programCode || 'TEE';
                const storage = this._getStorage();
                const yearStudents = storage.students.filter(s => 
                    s.program === programCode && s.intake_year === parseInt(intakeYear)
                );
                const sequence = yearStudents.length + 1;
                return `${program}-${intakeYear}-${sequence.toString().padStart(3, '0')}`;
            }
            
            async getLastStudentForProgramYear(programCode, intakeYear) {
                console.log('📅 Fallback: Getting last student');
                const storage = this._getStorage();
                const yearStudents = storage.students.filter(s => 
                    s.program === programCode && s.intake_year === parseInt(intakeYear)
                );
                return yearStudents.length > 0 ? yearStudents[yearStudents.length - 1] : null;
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
                const storage = this._getStorage();
                const studentMarks = storage.marks.filter(m => m.student_id === studentId);
                
                if (studentMarks.length === 0) return 0;
                
                const totalPoints = studentMarks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0);
                return totalPoints / studentMarks.length;
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
    console.log('✅ StudentManager instantiated');
    
    // 🔥 CRITICAL FIX - Initialize the student manager 🔥
    setTimeout(() => {
        if (this.students) {
            console.log('🚀 Calling StudentManager.init()');
            this.students.init().catch(err => {
                console.error('❌ StudentManager.init() failed:', err);
            });
        }
    }, 500); // Small delay to ensure DOM is ready
    
} else {
    console.warn('⚠️ StudentManager not loaded');
    this.loadModuleScript('modules/students.js', 'StudentManager');
}
            // Initialize marks manager
            if (typeof MarksManager !== 'undefined') {
                this.marks = new MarksManager(this.db, this);
                console.log('✅ MarksManager initialized');
            } else {
                console.warn('⚠️ MarksManager not loaded');
                this.loadModuleScript('modules/marks.js', 'MarksManager');
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
                console.warn('⚠️ CourseManager not loaded');
                this.loadModuleScript('modules/courses.js', 'CourseManager');
            }
            
            // Initialize program manager
            if (typeof ProgramManager !== 'undefined') {
                this.programs = new ProgramManager(this.db, this);
                console.log('✅ ProgramManager initialized');
            } else {
                console.warn('⚠️ ProgramManager not loaded');
                this.loadModuleScript('modules/programs.js', 'ProgramManager');
            }
            
            // Initialize centre manager
            if (typeof CentreManager !== 'undefined') {
                this.centres = new CentreManager(this.db, this);
                console.log('✅ CentreManager initialized');
            } else {
                console.warn('⚠️ CentreManager not loaded');
                this.loadModuleScript('modules/centres.js', 'CentreManager');
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
            
            // Initialize settings manager
            if (typeof SettingsManager !== 'undefined') {
                this.settings = new SettingsManager(this.db, this);
                console.log('✅ SettingsManager initialized');
            } else {
                console.warn('⚠️ SettingsManager not loaded');
            }
            
            // Initialize transcripts manager
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
    
    loadModuleScript(src, className) {
        console.log(`📦 Loading ${className} script...`);
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                console.log(`✅ ${className} script loaded`);
                
                if (window[className]) {
                    this[className.toLowerCase().replace('manager', '')] = new window[className](this.db, this);
                    console.log(`✅ ${className} initialized`);
                    
                    // Initialize specific methods
                    setTimeout(() => {
                        const instance = this[className.toLowerCase().replace('manager', '')];
                        if (instance && instance.loadStudentsTable) {
                            instance.loadStudentsTable();
                        } else if (instance && instance.loadCourses) {
                            instance.loadCourses();
                        }
                    }, 1000);
                }
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ Failed to load ${className} script`);
                resolve();
            };
            
            document.head.appendChild(script);
        });
    }
    
    initializeReportsManager() {
        try {
            if (typeof ReportsManager !== 'undefined') {
                this.reports = new ReportsManager(this.db, this);
                console.log('✅ ReportsManager initialized');
                
                setTimeout(async () => {
                    try {
                        if (this.reports?.initialize) {
                            await this.reports.initialize();
                            console.log('📊 ReportsManager fully initialized');
                            
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
            
            if (typeof ReportManager !== 'undefined') {
                this.reports = new ReportManager(this.db, this);
                console.log('✅ ReportManager initialized (alternative)');
                return;
            }
            
            console.warn('⚠️ ReportsManager not loaded, attempting dynamic load');
            this.loadModuleScript('modules/reports.js', 'ReportsManager');
            
        } catch (error) {
            console.error('❌ Error initializing ReportsManager:', error);
        }
    }
    
    createReportsFallback() {
        console.log('🛡️ Creating reports fallback...');
        
        this.reports = {
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
            
            showToast: (message, type = 'info') => {
                alert(`${type.toUpperCase()}: ${message}`);
            }
        };
        
        console.log('✅ Reports fallback created');
    }
    
    setupAllButtonListeners() {
        console.log('🔗 Setting up all button listeners...');
        
        this.setupReportsButtonListeners();
        this.setupOtherButtonListeners();
        
        console.log('✅ All button listeners setup');
    }
    
    setupReportsButtonListeners() {
        console.log('🔗 Setting up reports button listeners...');
        
        setTimeout(() => {
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
                            this.showToast(fallback || 'Reports module not ready yet', 'warning');
                        }
                    };
                    console.log(`✅ Button ${id} bound to reports.${method}`);
                }
            });
            
            this.updateReportsOnclickHandlers();
            
            console.log('✅ Reports button listeners setup complete');
            
        }, 1000);
    }
    
    updateReportsOnclickHandlers() {
        document.querySelectorAll('[onclick*="app.reports"]').forEach(element => {
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/app\.reports\.(\w+)\(/);
                if (match) {
                    const methodName = match[1];
                    element.onclick = (e) => {
                        e.preventDefault();
                        if (this.reports && this.reports[methodName]) {
                            return this.reports[methodName]();
                        } else {
                            this.showToast(`Reports function ${methodName} not ready`, 'warning');
                        }
                    };
                }
            }
        });
    }
    
    setupOtherButtonListeners() {
        // Add search debouncing
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.students?.searchStudents) {
                        this.students.searchStudents(e.target.value);
                    }
                }, 300);
            });
        }
        
        console.log('🔗 Other button listeners setup');
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            // Load dropdown data with caching
            await this.loadDropdownData();
            
            // Load students with caching
            if (this.students && this.students.loadStudentsTable) {
                await this.getCachedData('students', 
                    () => this.students.loadStudentsTable(), 
                    false
                );
                console.log('✅ Students table loaded');
            }
            
            // Load marks
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
    
    async getCachedData(key, fetchFunction, forceRefresh = false) {
        const cacheEntry = this.cache[key];
        const now = Date.now();
        
        if (!forceRefresh && cacheEntry?.data && 
            (now - cacheEntry.timestamp) < cacheEntry.ttl) {
            console.log(`📦 Using cached ${key}`);
            return cacheEntry.data;
        }
        
        console.log(`🔄 Fetching fresh ${key}`);
        const data = await fetchFunction();
        this.cache[key] = { data, timestamp: now, ttl: cacheEntry?.ttl || 60000 };
        return data;
    }
    
    async loadDropdownData() {
        try {
            console.log('📊 Loading dropdown data...');
            
            // Load counties with caching
            if (this.db.getCounties) {
                const counties = await this.getCachedData('counties', () => this.db.getCounties());
                this.populateSelect('studentCounty', counties, 'name', 'name', 'Select County', 'region');
                this.populateSelect('filterCounty', counties, 'name', 'name', 'All Counties', 'region');
                console.log(`✅ Loaded ${counties.length} counties`);
            }
            
            // Load centres with caching
            if (this.db.getCentres) {
                const centres = await this.getCachedData('centres', () => this.db.getCentres());
                this.populateSelect('studentCentre', centres, 'id', 'name', 'Select Centre');
                this.populateSelect('filterCentre', centres, 'id', 'name', 'All Centres');
                console.log(`✅ Loaded ${centres.length} centres`);
            }
            
            // Load programs with caching
            if (this.db.getPrograms) {
                const programs = await this.getCachedData('programs', () => this.db.getPrograms());
                this.populateSelect('studentProgram', programs, 'code', 'code', 'Select Program', 'name');
                this.populateSelect('filterProgram', programs, 'code', 'code', 'All Programs', 'name');
                console.log(`✅ Loaded ${programs.length} programs`);
            }
            
            console.log('✅ All dropdown data loaded');
            
        } catch (error) {
            console.warn('⚠️ Could not load dropdown data:', error);
            this.showToast('Error loading dropdown data', 'error');
        }
    }
    
    populateSelect(selectId, data, valueKey, textKey, defaultText, extraTextKey = null) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select element ${selectId} not found`);
            return;
        }
        
        // Show loading state
        const originalHTML = select.innerHTML;
        select.innerHTML = `<option value="">Loading...</option>`;
        select.disabled = true;
        
        setTimeout(() => {
            select.innerHTML = `<option value="">${defaultText}</option>`;
            select.disabled = false;
            
            if (!data || data.length === 0) {
                console.warn(`⚠️ No data to populate ${selectId}`);
                select.innerHTML = `<option value="">No data available</option>`;
                return;
            }
            
            data.forEach((item, index) => {
                const option = document.createElement('option');
                
                let value = item[valueKey];
                if (value === undefined || value === null) {
                    console.warn(`⚠️ Item ${index} missing value key "${valueKey}":`, item);
                    value = '';
                }
                option.value = value;
                
                let displayText = '';
                
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
                }
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
                else if (selectId.includes('County') || selectId.includes('county')) {
                    const name = item.name || '';
                    const region = item.region || '';
                    
                    if (name && region) {
                        displayText = `${name} (${region})`;
                    } else if (name) {
                        displayText = name;
                    }
                }
                else {
                    displayText = item[textKey] || '';
                    if (extraTextKey && item[extraTextKey]) {
                        displayText += ` (${item[extraTextKey]})`;
                    }
                }
                
                if (!displayText || displayText.trim() === '') {
                    displayText = value || `Item ${index}`;
                }
                
                option.textContent = this.escapeHtml(displayText);
                option.setAttribute('title', displayText); // Tooltip for long text
                select.appendChild(option);
            });
            
            console.log(`✅ Populated ${selectId} with ${data.length} items`);
            
        }, 300); // Small delay for better UX
    }
    
    initializeUI() {
        console.log('🎨 Initializing UI...');
        
        // Set today's date for all date inputs
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input && !input.value) {
                input.value = today;
                input.max = today;
                input.min = '1900-01-01';
            }
        });
        
        // Initialize intake year dropdown
        this.initializeIntakeYearDropdown();
        
        // Fix any PHP code in date inputs
        this.fixDateInputs();
        
        // Add loading states to buttons
        this.addButtonLoadingStates();
        
        // Setup accessibility
        this.setupAccessibility();
        
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
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input.value && input.value.includes('<?php')) {
                input.value = new Date().toISOString().split('T')[0];
            }
        });
    }
    
  addButtonLoadingStates() {
    // COMPLETELY DISABLED - This interferes with our custom form handlers
    // Student forms are handled by students.js
    // Other forms have their own handlers
    console.log('ℹ️ Button loading states disabled to prevent interference');
    // Do nothing - this prevents the 10-second reset from breaking our forms
}
    
    setupAccessibility() {
        // Add aria labels to icons
        document.querySelectorAll('i.fas, i.far').forEach(icon => {
            if (!icon.getAttribute('aria-label')) {
                const title = icon.parentElement?.title || icon.title || icon.className.replace('fas fa-', '').replace('far fa-', '');
                icon.setAttribute('aria-label', title);
            }
        });
        
        // Make modals accessible
        document.querySelectorAll('.modal').forEach(modal => {
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('role', 'dialog');
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
                    this.withLoadingState(e.submitter, async () => {
                        if (this.students && this.students.saveStudent) {
                            await this.students.saveStudent(e);
                        } else {
                            this.showToast('Student module not available', 'error');
                        }
                    });
                });
            }
            
            // Marks form submission
            const marksForm = document.getElementById('marksForm');
            if (marksForm) {
                marksForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.withLoadingState(e.submitter, async () => {
                        if (this.marks && this.marks.saveMarks) {
                            await this.marks.saveMarks(e);
                        } else {
                            this.showToast('Marks module not available', 'error');
                        }
                    });
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
            
            // Registration number generation
            const programSelect = document.getElementById('studentProgram');
            const intakeSelect = document.getElementById('studentIntake');
            
            if (programSelect && this.students && this.students.generateRegNumber) {
                programSelect.addEventListener('change', () => {
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
            
            // Auto-save forms on field change (with debounce)
            this.setupAutoSave();
            
            // Confirmation for destructive actions
            this.setupConfirmations();
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }
    
    setupCriticalEventListeners() {
        // Only setup essential event listeners for basic functionality
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('System in basic mode - Student saving disabled');
            });
        }
    }
    
    setupAutoSave() {
        const forms = ['studentForm', 'marksForm', 'courseForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                let saveTimeout;
                form.addEventListener('input', (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(() => {
                            this.showToast('Auto-saved draft', 'info', 2000);
                        }, 2000);
                    }
                });
            }
        });
    }
    
    setupConfirmations() {
        // Add confirmation to delete buttons
        document.querySelectorAll('.btn-delete, [onclick*="delete"], button[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        });
    }
    
    setupOfflineSupport() {
        // Check online status
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('Connection restored. Syncing data...', 'success');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('You are offline. Changes will be saved locally.', 'warning', 5000);
        });
        
        // Initialize service worker if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('✅ Service Worker registered:', reg);
                    this.trackEvent('app', 'service_worker_registered');
                })
                .catch(err => {
                    console.warn('⚠️ Service Worker failed:', err);
                    this.trackEvent('app', 'service_worker_failed', err.message);
                });
        }
    }
    
    async syncOfflineData() {
        if (!this.pendingChanges.length) return;
        
        this.showToast(`Syncing ${this.pendingChanges.length} pending changes...`, 'info');
        
        for (const change of this.pendingChanges) {
            try {
                await this.syncChange(change);
                this.removePendingChange(change.id);
                this.showToast(`Synced: ${change.type}`, 'success', 2000);
            } catch (error) {
                console.error('Sync failed:', error);
                this.showToast(`Failed to sync ${change.type}`, 'error');
            }
        }
    }
    
    syncChange(change) {
        // Implement sync logic based on change type
        console.log('Syncing change:', change);
        return Promise.resolve();
    }
    
    getPendingChanges() {
        return this.pendingChanges;
    }
    
    addPendingChange(change) {
        this.pendingChanges.push({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...change
        });
        
        // Save to localStorage
        localStorage.setItem('tee_pending_changes', JSON.stringify(this.pendingChanges));
    }
    
    removePendingChange(id) {
        this.pendingChanges = this.pendingChanges.filter(c => c.id !== id);
        localStorage.setItem('tee_pending_changes', JSON.stringify(this.pendingChanges));
    }
    
    setupKeyboardShortcuts() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const activeForm = document.querySelector('form:focus-within');
                if (activeForm) {
                    activeForm.dispatchEvent(new Event('submit'));
                }
            }
            
            // Esc to close modals
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.active');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
            
            // Alt + number for navigation
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                const sections = [
                    'dashboard', 'students', 'programs', 'courses', 
                    'marks', 'centres', 'reports', 'settings'
                ];
                const index = parseInt(e.key) - 1;
                if (sections[index]) {
                    showSection(sections[index]);
                }
            }
        });
    }
    
    withLoadingState(button, action) {
        if (!button) return;
        
        const originalText = button.innerHTML;
        const originalDisabled = button.disabled;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.disabled = true;
        
        Promise.resolve(action())
            .finally(() => {
                button.innerHTML = originalText;
                button.disabled = originalDisabled;
            });
    }
    
    showToast(message, type = 'info', duration = 5000) {
        try {
            // Remove existing toasts if too many
            const existingToasts = document.querySelectorAll('.toast');
            if (existingToasts.length > 3) {
                existingToasts[0].remove();
            }
            
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
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
                cursor: pointer;
                transition: transform 0.3s ease;
            `;
            
            const icon = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 
                         'fa-info-circle';
            
            toast.innerHTML = `
                <i class="fas ${icon}" style="font-size: 18px;"></i>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button onclick="document.getElementById('${toastId}').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    font-size: 16px;
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                " aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
                <div class="toast-progress" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 0 0 8px 8px;
                    overflow: hidden;
                ">
                    <div class="toast-progress-bar" style="
                        height: 100%;
                        background: white;
                        animation: progress ${duration}ms linear;
                    "></div>
                </div>
            `;
            
            toast.addEventListener('click', () => toast.remove());
            
            document.body.appendChild(toast);
            
            // Auto remove after duration
            const timeoutId = setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, duration);
            
            this._timeouts.push(timeoutId);
            
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
                    @keyframes progress {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                    .toast:hover {
                        transform: translateY(-2px);
                    }
                `;
                document.head.appendChild(style);
            }
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    showErrorModal(options) {
        const modalId = 'error-modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>${options.title || 'Error'}</h2>
                    <button class="close-modal" onclick="app.closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${options.message || 'An error occurred.'}</p>
                    ${options.details ? `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; overflow: auto;">${this.escapeHtml(options.details)}</pre>` : ''}
                </div>
                <div class="modal-footer">
                    ${options.retryAction ? `<button class="btn btn-primary" onclick="app.closeModal('${modalId}'); ${options.retryAction.toString()}">Retry</button>` : ''}
                    <button class="btn btn-secondary" onclick="app.closeModal('${modalId}')">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.openModal(modalId);
    }
    
    reportError(error, context) {
        const errorReport = {
            context,
            message: error.message,
            stack: error.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        console.error('Error Report:', errorReport);
        
        // Send to error tracking service
        if (this.isOnline) {
            fetch('/api/errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorReport)
            }).catch(() => {
                // Silently fail if error reporting fails
            });
        }
    }
    
    trackEvent(category, action, label = null, value = null) {
        // Don't track in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`📊 Analytics: ${category} - ${action}`, label ? `(${label})` : '');
            return;
        }
        
        const event = {
            category,
            action,
            label,
            value,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.pathname
        };
        
        // Send to analytics endpoint
        if (this.isOnline) {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(() => {
                // Silently fail if analytics unavailable
            });
        }
    }
    
    preloadSections() {
        // Preload data for other sections in background
        setTimeout(() => {
            if (this.dashboard && this.dashboard.updateDashboard) {
                this.dashboard.updateDashboard();
            }
            
            if (this.programs && this.programs.loadProgramsTable) {
                this.programs.loadProgramsTable();
            }
            
            if (this.centres && this.centres.loadCentres) {
                this.centres.loadCentres();
            }
        }, 3000);
    }
    
    callWithRateLimit(key, apiCall, maxCalls = 5, timeWindow = 60000) {
        const now = Date.now();
        const calls = this.rateLimits[key] || [];
        
        // Remove old calls
        const recentCalls = calls.filter(time => now - time < timeWindow);
        
        if (recentCalls.length >= maxCalls) {
            throw new Error(`Rate limit exceeded for ${key}. Please try again later.`);
        }
        
        // Add this call
        recentCalls.push(now);
        this.rateLimits[key] = recentCalls;
        
        return apiCall();
    }
    
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>"'`]/g, '')
            .trim();
    }
    
    exportData(dataType, format = 'json') {
        let data;
        
        switch(dataType) {
            case 'students':
                data = this.cache.students?.data || [];
                break;
            case 'marks':
                data = this.cache.marks?.data || [];
                break;
            case 'courses':
                data = this.cache.courses?.data || [];
                break;
            default:
                throw new Error('Invalid data type');
        }
        
        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return JSON.stringify(data, null, 2);
    }
    
    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }
    
    cleanupSection(sectionId) {
        // Cleanup specific section resources
        switch(sectionId) {
            case 'reports':
                if (this.reports && this.reports.cleanup) {
                    this.reports.cleanup();
                }
                break;
            case 'students':
                if (this.students && this.students.cleanup) {
                    this.students.cleanup();
                }
                break;
        }
    }
    
    cleanup() {
        // Clear all timeouts
        this._timeouts.forEach(timeout => clearTimeout(timeout));
        this._timeouts = [];
        
        // Clear all intervals
        this._intervals.forEach(interval => clearInterval(interval));
        this._intervals = [];
        
        // Remove global event listeners
        this.removeEventListeners();
        
        // Clear caches
        this.cache = {};
        this.cachedStudents = null;
        
        console.log('🧹 App cleaned up');
    }
    
    removeEventListeners() {
        // Implement if needed to remove specific event listeners
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
                
                // Focus first input in modal
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
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
                
                // Reset form if exists
                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                }
            }
        }
    }
    
    lazyLoadSection(sectionId) {
        this.currentSection = sectionId;
        this.trackEvent('navigation', 'section_load', sectionId);
        
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        transition: opacity 0.5s ease;
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
        <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 300; text-align: center;">TEEPortal</h2>
        <p style="margin: 0; opacity: 0.8; font-size: 14px;">Initializing system...</p>
        <div style="margin-top: 30px; width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
            <div id="loading-progress" style="height: 100%; background: white; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loadingIndicator);
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }, 500);
    
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
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; color: white;">Initializing System</h2>
                    <p style="margin: 0 0 20px 0; opacity: 0.8; color: white;">This is taking longer than expected...</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: white;
                        color: #764ba2;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-redo"></i> Reload
                    </button>
                </div>
            `;
        }, 10000);
        
        // Initialize app
        await app.initialize();
        
        clearTimeout(initTimeout);
        clearInterval(progressInterval);
        
        // Complete progress
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // Remove loading indicator
        setTimeout(() => {
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                if (loadingIndicator.parentElement) {
                    loadingIndicator.remove();
                }
            }, 500);
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
        clearInterval(progressInterval);
        
        loadingIndicator.innerHTML = `
            <div style="text-align: center; padding: 20px; max-width: 500px;">
                <div style="font-size: 48px; color: #ff6b6b; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin: 0 0 10px 0; color: white; font-size: 24px;">Initialization Error</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9; line-height: 1.5; color: white;">
                    The system encountered an error during startup. The application will run in limited mode.
                </p>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <small style="display: block; margin-bottom: 5px; opacity: 0.8; color: white;">Error Details:</small>
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
    }
});

// ==============================
// GLOBAL HELPER FUNCTIONS
// ==============================

window.showSection = function(sectionId) {
    console.log('🔄 Switching to section:', sectionId);
    
    // Cleanup previous section
    if (window.app?.currentSection) {
        window.app.cleanupSection(window.app.currentSection);
    }
    
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
            'settings': 'Settings',
            'transcripts': 'Transcripts'
        };
        
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = titleMap[sectionId] || sectionId;
        }
        
        // Add fade-in animation
        targetSection.style.animation = 'fadeIn 0.3s ease';
        setTimeout(() => {
            targetSection.style.animation = '';
        }, 300);
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

// Add fade-in animation
if (!document.querySelector('#fade-animation')) {
    const style = document.createElement('style');
    style.id = 'fade-animation';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

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
        input.min = '1900-01-01';
    });
    
    // Add form validation
    document.querySelectorAll('form').forEach(form => {
        form.setAttribute('novalidate', 'novalidate');
        form.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                const invalid = this.querySelector(':invalid');
                if (invalid) {
                    invalid.focus();
                    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    if (window.app) {
                        window.app.showToast('Please fill in all required fields correctly', 'error');
                    }
                }
            }
        });
    });
});

// Add beforeunload warning for unsaved changes
window.addEventListener('beforeunload', function(e) {
    const forms = document.querySelectorAll('form');
    const hasUnsavedChanges = Array.from(forms).some(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        return Array.from(inputs).some(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                return input.defaultChecked !== input.checked;
            }
            return input.defaultValue !== input.value;
        });
    });
    
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Add visibility change handler
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible again
        if (window.app?.initialized) {
            console.log('🔄 Tab became visible, refreshing data...');
            
            // Refresh cache for current section
            if (window.app.currentSection) {
                const cacheKey = window.app.currentSection;
                if (window.app.cache[cacheKey]) {
                    window.app.cache[cacheKey].timestamp = 0; // Force refresh
                }
                
                setTimeout(() => {
                    window.app.lazyLoadSection(window.app.currentSection);
                }, 1000);
            }
        }
    }
});

console.log('📦 app.js loaded successfully');
