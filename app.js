// app.js - COMPLETE FIXED VERSION
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
            // **FIX 1: Wait for database class to load**
            if (typeof TEEPortalSupabaseDB === 'undefined') {
                console.log('📦 Loading database module...');
                await this._loadDatabaseModule();
            }
            
            // **FIX 2: Create database instance**
            console.log('🔗 Creating database connection...');
            this.db = new TEEPortalSupabaseDB();
            
            // **FIX 3: Initialize database**
            const dbInitialized = await this.db.init();
            console.log('✅ Database initialized:', dbInitialized);
            
            // **FIX 4: Initialize modal manager first**
            if (typeof ModalManager !== 'undefined') {
                this.modalManager = new ModalManager(this.db, this);
                window.modalManager = this.modalManager;
            }
            
            // **FIX 5: Initialize modules**
            this.initializeModules();
            
            // **FIX 6: Setup event listeners**
            this.setupEventListeners();
            
            // **FIX 7: Load initial data**
            await this.loadInitialData();
            
            // **FIX 8: Initialize UI**
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TEEPortal Ready');
            
            // **FIX 9: Show success toast**
            this.showToast('System initialized successfully', 'success');
            
            // **FIX 10: Set global reference**
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
            
            // Student methods
            async getStudents(filterOptions = {}) {
                console.log('📋 Fallback: Getting students');
                return [];
            }
            
            async getStudent(id) {
                console.log('📋 Fallback: Getting student', id);
                return {
                    id: id,
                    reg_number: 'N/A',
                    full_name: 'Unknown Student',
                    email: '',
                    phone: '',
                    county: '',
                    centre: 'Main Campus',
                    centre_name: 'Main Campus',
                    program: '',
                    intake_year: new Date().getFullYear(),
                    status: 'active'
                };
            }
            
            async addStudent(data) {
                console.log('📋 Fallback: Adding student');
                const studentId = 'FB-' + Date.now();
                return { 
                    id: studentId,
                    ...data,
                    reg_number: data.reg_number || studentId
                };
            }
            
            async updateStudent(id, data) {
                console.log('📋 Fallback: Updating student');
                return { id, ...data };
            }
            
            async deleteStudent(id) {
                console.log('📋 Fallback: Deleting student');
                return { success: true };
            }
            
            // Marks methods
            async getMarksTableData() {
                console.log('📊 Fallback: Getting marks');
                return [];
            }
            
            async getMarks() {
                return [];
            }
            
            async addMark(data) {
                console.log('📊 Fallback: Adding mark');
                return { 
                    id: 'M-' + Date.now(),
                    ...data,
                    percentage: data.percentage || 0,
                    grade: data.grade || 'FAIL',
                    grade_points: data.grade_points || 0
                };
            }
            
            async updateMark(id, data) {
                console.log('📊 Fallback: Updating mark');
                return { id, ...data };
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
            
           // Other data methods
async getPrograms() {
    console.log('🎓 Fallback: Getting programs');
    return [
        { 
            id: 'basic', 
            code: 'TEE', 
            name: 'Basic TEE', 
            duration: '2 years', 
            max_credits: 60 
        },
        { 
            id: 'hnc', 
            code: 'HNC', 
            name: 'Higher National Certificate', 
            duration: '3 years', 
            max_credits: 90 
        },
        { 
            id: 'advanced', 
            code: 'ATE', 
            name: 'Advanced TEE', 
            duration: '4 years', 
            max_credits: 120 
        }
    ];
}

async getCourses() {
    console.log('📚 Fallback: Getting courses');
    return [
        {
            id: '1',
            course_code: 'MATH101',
            course_name: 'Introduction to Mathematics',
            program: 'basic',
            level: 'basic',
            credits: 3,
            description: 'Basic mathematics concepts and operations',
            status: 'active',
            enrolled_count: 15,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            course_code: 'ENG201',
            course_name: 'Advanced English',
            program: 'advanced',
            level: 'advanced',
            credits: 4,
            description: 'Advanced English composition and literature',
            status: 'active',
            enrolled_count: 12,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            course_code: 'BIB101',
            course_name: 'Biblical Studies',
            program: 'hnc',
            level: 'intermediate',
            credits: 3,
            description: 'Introduction to biblical studies',
            status: 'active',
            enrolled_count: 8,
            created_at: new Date().toISOString()
        }
    ];
}

// Add these missing course methods:
async addCourse(data) {
    console.log('📚 Fallback: Adding course');
    const courseId = 'C-' + Date.now();
    return {
        id: courseId,
        course_code: data.code,
        course_name: data.name,
        program: data.program,
        level: data.level || 'basic',
        credits: data.credits || 3,
        description: data.description || '',
        status: data.status || 'active',
        enrolled_count: 0,
        created_at: new Date().toISOString()
    };
}

async updateCourse(id, data) {
    console.log('📚 Fallback: Updating course', id);
    return {
        id: id,
        course_code: data.code,
        course_name: data.name,
        program: data.program,
        level: data.level || 'basic',
        credits: data.credits || 3,
        description: data.description || '',
        status: data.status || 'active',
        enrolled_count: 0,
        created_at: new Date().toISOString()
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

// Add this method for getting students by course (needed for grading)
async getStudentsByCourse(courseId) {
    console.log('👥 Fallback: Getting students for course', courseId);
    return [
        {
            id: 'S1',
            student_id: 'S1',
            full_name: 'John Doe',
            reg_number: 'TEE-2023-001',
            email: 'john@example.com',
            centre_name: 'Nairobi Main Campus',
            centre: 'Nairobi Main Campus',
            intake_year: 2023,
            existing_grade: '-',
            existing_score: '-'
        },
        {
            id: 'S2',
            student_id: 'S2',
            full_name: 'Jane Smith',
            reg_number: 'TEE-2023-002',
            email: 'jane@example.com',
            centre_name: 'Mombasa Branch',
            centre: 'Mombasa Branch',
            intake_year: 2023,
            existing_grade: 'PASS',
            existing_score: '65'
        },
        {
            id: 'S3',
            student_id: 'S3',
            full_name: 'Robert Johnson',
            reg_number: 'HNC-2023-001',
            email: 'robert@example.com',
            centre_name: 'Kisumu Centre',
            centre: 'Kisumu Centre',
            intake_year: 2023,
            existing_grade: 'CREDIT',
            existing_score: '78'
        }
    ];
}

async getCentres() {
    console.log('📍 Fallback: Getting centres');
    return [
        { id: 1, name: 'Nairobi Main Campus', code: 'NBO001', county: 'Nairobi' },
        { id: 2, name: 'Mombasa Branch', code: 'MBA001', county: 'Mombasa' },
        { id: 3, name: 'Kisumu Centre', code: 'KSM001', county: 'Kisumu' }
    ];
}

async getCounties() {
    console.log('🗺️ Fallback: Getting counties');
    return [
        { id: 1, name: 'Nairobi', code: '001' },
        { id: 2, name: 'Mombasa', code: '002' },
        { id: 3, name: 'Kisumu', code: '003' },
        { id: 4, name: 'Nakuru', code: '004' },
        { id: 5, name: 'Eldoret', code: '005' }
    ];
}

// Add this method for adding marks (needed for grading)
async addMark(data) {
    console.log('📊 Fallback: Adding mark', data);
    return {
        id: 'M-' + Date.now(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}
            
            // Settings methods
            getDefaultSettings() {
                return {
                    instituteName: 'Theological Education by Extension College',
                    instituteAbbreviation: 'TEE College',
                    centres: [
                        { id: 1, name: 'Nairobi Main Campus', code: 'NBO001' },
                        { id: 2, name: 'Mombasa Branch', code: 'MBA001' },
                        { id: 3, name: 'Kisumu Centre', code: 'KSM001' }
                    ],
                    counties: [
                        { id: 1, name: 'Nairobi', code: '001' },
                        { id: 2, name: 'Mombasa', code: '002' },
                        { id: 3, name: 'Kisumu', code: '003' }
                    ]
                };
            }
            
            async getSettings() {
                console.log('⚙️ Fallback: Getting settings');
                return this.getDefaultSettings();
            }
            
            // Utility methods
            async generateRegNumberNew(programId, intakeYear) {
                console.log('🔢 Fallback: Generating reg number');
                const programCode = programId?.substring(0, 3).toUpperCase() || 'TEE';
                const timestamp = Date.now().toString().slice(-6);
                return `${programCode}-${intakeYear}-${timestamp}`;
            }
            
            async getLastStudentForProgramYear(programId, intakeYear) {
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
            
            async getStudentMarks(studentId) {
                return [];
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
        
        // ✅ ADD THIS: Initialize Report Manager
        if (typeof ReportManager !== 'undefined') {
            this.reports = new ReportManager(this.db, this);
            console.log('✅ ReportManager initialized');
            
            // Optional: Pre-load some report data in background
            setTimeout(() => {
                if (this.reports && this.reports.preloadReportData) {
                    this.reports.preloadReportData();
                    console.log('📊 Report data pre-loaded');
                }
            }, 3000);
        } else {
            console.warn('⚠️ ReportManager not loaded - Reports section will not work');
        }
        
        // ✅ ADD THIS: Initialize Settings Manager (if exists)
        if (typeof SettingsManager !== 'undefined') {
            this.settings = new SettingsManager(this.db, this);
            console.log('✅ SettingsManager initialized');
        } else {
            console.warn('⚠️ SettingsManager not loaded');
        }
        
        // ✅ ADD THIS: Initialize Transcripts Manager (if exists)
        if (typeof TranscriptsManager !== 'undefined') {
            this.transcripts = new TranscriptsManager(this.db, this);
            console.log('✅ TranscriptsManager initialized');
        } else {
            console.warn('⚠️ TranscriptsManager not loaded');
        }
        
        // ✅ ADD THIS: Initialize Profile Manager (if exists)
        if (typeof ProfileManager !== 'undefined') {
            this.profile = new ProfileManager(this.db, this);
            console.log('✅ ProfileManager initialized');
        } else {
            console.warn('⚠️ ProfileManager not loaded');
        }
        
        console.log('✅ All modules initialized');
        
    } catch (error) {
        console.error('❌ Error initializing modules:', error);
        this.showToast('Error initializing modules', 'error');
    }
}

// Add this method to load CourseManager script dynamically
loadCourseManagerScript() {
    // Check if already loaded
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
            
            // Load courses after initialization
            setTimeout(() => {
                if (this.courses && this.courses.loadCourses) {
                    this.courses.loadCourses();
                    this.courses.updateStatistics();
                    console.log('📚 Courses loaded dynamically');
                }
            }, 500);
        } else {
            console.error('❌ CourseManager still not defined after loading script');
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
            // Load counties
            if (this.db.getCounties) {
                const counties = await this.db.getCounties();
                this.populateSelect('studentCounty', counties, 'name', 'name', 'Select County');
                this.populateSelect('filterCounty', counties, 'name', 'name', 'All Counties');
                console.log(`✅ Loaded ${counties.length} counties`);
            }
            
            // Load centres
            if (this.db.getCentres) {
                const centres = await this.db.getCentres();
                this.populateSelect('studentCentre', centres, 'name', 'name', 'Select Centre');
                this.populateSelect('filterCentre', centres, 'name', 'name', 'All Centres');
                console.log(`✅ Loaded ${centres.length} centres`);
            }
            
            // Load programs
            if (this.db.getPrograms) {
                const programs = await this.db.getPrograms();
                this.populateSelect('studentProgram', programs, 'id', 'name', 'Select Program', 'code');
                this.populateSelect('filterProgram', programs, 'id', 'name', 'All Programs');
                console.log(`✅ Loaded ${programs.length} programs`);
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load dropdown data:', error);
        }
    }
    
    populateSelect(selectId, data, valueKey, textKey, defaultText, extraTextKey = null) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = `<option value="">${defaultText}</option>`;
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            
            let text = item[textKey];
            if (extraTextKey && item[extraTextKey]) {
                text += ` (${item[extraTextKey]})`;
            }
            
            option.textContent = this.escapeHtml(text);
            select.appendChild(option);
        });
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
            
            // Registration number generation triggers
            const programSelect = document.getElementById('studentProgram');
            const intakeSelect = document.getElementById('studentIntake');
            
            if (programSelect && this.students && this.students.generateRegNumber) {
                programSelect.addEventListener('change', () => this.students.generateRegNumber());
            }
            
            if (intakeSelect && this.students && this.students.generateRegNumber) {
                intakeSelect.addEventListener('change', () => this.students.generateRegNumber());
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
   // ✅ ADD THIS CASE FOR REPORTS
        case 'reports':
            if (this.reports && this.reports.loadAllReports) {
                console.log('📈 Loading all reports...');
                this.reports.loadAllReports();
            } else {
                console.warn('⚠️ ReportManager not available for loading reports.');
                if (window.app && window.app.showToast) {
                    window.app.showToast('Reports module not loaded', 'error');
                }
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
    // Fix PHP code in date inputs
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
