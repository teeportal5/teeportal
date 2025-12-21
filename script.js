// ==============================
// SUPABASE DATABASE MANAGEMENT
// ==============================

class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        // ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
        this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
        this.init();
    }
    
    async init() {
        try {
            // Initialize Supabase client
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection
            await this.testConnection();
            this.initialized = true;
            console.log('✅ Supabase connected successfully');
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            this.initialized = false;
            // Fallback to localStorage
            this.useLocalStorageFallback();
        }
    }
    
    async testConnection() {
        const { data, error } = await this.supabase
            .from('students')
            .select('*')
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }
        return true;
    }
    
    useLocalStorageFallback() {
        console.log('⚠️ Using localStorage fallback');
        this.storagePrefix = 'teeprod_';
        this.localStorageFallback = true;
        
        // Initialize localStorage if needed
        if (!localStorage.getItem(this.storagePrefix + 'initialized')) {
            localStorage.setItem(this.storagePrefix + 'students', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'courses', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'marks', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'settings', JSON.stringify(this.getDefaultSettings()));
            localStorage.setItem(this.storagePrefix + 'initialized', 'true');
        }
    }
    
    getDefaultSettings() {
        return {
            instituteName: 'Theological Education by Extension College',
            academicYear: new Date().getFullYear(),
            timezone: 'Africa/Nairobi',
            gradingScale: {
                'A': { min: 80, max: 100, points: 4.0 },
                'B+': { min: 75, max: 79, points: 3.5 },
                'B': { min: 70, max: 74, points: 3.0 },
                'C+': { min: 65, max: 69, points: 2.5 },
                'C': { min: 60, max: 64, points: 2.0 },
                'D+': { min: 55, max: 59, points: 1.5 },
                'D': { min: 50, max: 54, points: 1.0 },
                'F': { min: 0, max: 49, points: 0.0 }
            }
        };
    }
    
    // ========== STUDENTS ==========
    async getStudents() {
        if (!this.initialized || this.localStorageFallback) {
            // Fallback to localStorage
            return JSON.parse(localStorage.getItem(this.storagePrefix + 'students')) || [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }
    
    async addStudent(studentData) {
        if (!this.initialized || this.localStorageFallback) {
            // Fallback to localStorage
            const students = JSON.parse(localStorage.getItem(this.storagePrefix + 'students')) || [];
            const student = {
                id: Date.now().toString(),
                reg_number: this.generateRegNumber(studentData.program, studentData.intake),
                full_name: studentData.name,
                email: studentData.email,
                phone: studentData.phone,
                dob: studentData.dob,
                gender: studentData.gender,
                program: studentData.program,
                intake_year: studentData.intake,
                status: 'active',
                created_at: new Date().toISOString()
            };
            
            students.push(student);
            localStorage.setItem(this.storagePrefix + 'students', JSON.stringify(students));
            return student;
        }
        
        try {
            const regNumber = this.generateRegNumber(studentData.program, studentData.intake);
            
            const { data, error } = await this.supabase
                .from('students')
                .insert([{
                    reg_number: regNumber,
                    full_name: studentData.name,
                    email: studentData.email,
                    phone: studentData.phone,
                    dob: studentData.dob,
                    gender: studentData.gender,
                    program: studentData.program,
                    intake_year: studentData.intake,
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    }
    
    async getStudent(id) {
        if (!this.initialized || this.localStorageFallback) {
            const students = JSON.parse(localStorage.getItem(this.storagePrefix + 'students')) || [];
            return students.find(s => s.id === id);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error fetching student:', error);
            return null;
        }
    }
    
    // ========== COURSES ==========
    async getCourses() {
        if (!this.initialized || this.localStorageFallback) {
            return JSON.parse(localStorage.getItem(this.storagePrefix + 'courses')) || [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
    }
    
    async addCourse(courseData) {
        if (!this.initialized || this.localStorageFallback) {
            const courses = JSON.parse(localStorage.getItem(this.storagePrefix + 'courses')) || [];
            const course = {
                id: Date.now().toString(),
                course_code: courseData.code.toUpperCase(),
                course_name: courseData.name,
                program: courseData.program,
                credits: courseData.credits,
                description: courseData.description,
                status: 'active',
                created_at: new Date().toISOString()
            };
            
            courses.push(course);
            localStorage.setItem(this.storagePrefix + 'courses', JSON.stringify(courses));
            return course;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .insert([{
                    course_code: courseData.code.toUpperCase(),
                    course_name: courseData.name,
                    program: courseData.program,
                    credits: courseData.credits,
                    description: courseData.description,
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error adding course:', error);
            throw error;
        }
    }
    
    async getCourse(id) {
        if (!this.initialized || this.localStorageFallback) {
            const courses = JSON.parse(localStorage.getItem(this.storagePrefix + 'courses')) || [];
            return courses.find(c => c.id === id);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error fetching course:', error);
            return null;
        }
    }
    
    // ========== MARKS ==========
    async getMarks() {
        if (!this.initialized || this.localStorageFallback) {
            return JSON.parse(localStorage.getItem(this.storagePrefix + 'marks')) || [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from('marks')
                .select(`
                    *,
                    students!inner(reg_number, full_name),
                    courses!inner(course_code, course_name)
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching marks:', error);
            return [];
        }
    }
    
    async addMark(markData) {
        if (!this.initialized || this.localStorageFallback) {
            const marks = JSON.parse(localStorage.getItem(this.storagePrefix + 'marks')) || [];
            const percentage = (markData.score / markData.maxScore) * 100;
            const grade = this.calculateGrade(percentage);
            
            const mark = {
                id: Date.now().toString(),
                student_id: markData.studentId,
                course_id: markData.courseId,
                assessment_type: markData.assessmentType,
                assessment_name: markData.assessmentName,
                score: markData.score,
                max_score: markData.maxScore,
                percentage: parseFloat(percentage.toFixed(2)),
                grade: grade.grade,
                grade_points: grade.points,
                remarks: markData.remarks,
                visible_to_student: markData.visibleToStudent,
                entered_by: 'admin',
                created_at: new Date().toISOString()
            };
            
            marks.push(mark);
            localStorage.setItem(this.storagePrefix + 'marks', JSON.stringify(marks));
            return mark;
        }
        
        try {
            const percentage = (markData.score / markData.maxScore) * 100;
            const grade = this.calculateGrade(percentage);
            
            const { data, error } = await this.supabase
                .from('marks')
                .insert([{
                    student_id: markData.studentId,
                    course_id: markData.courseId,
                    assessment_type: markData.assessmentType,
                    assessment_name: markData.assessmentName,
                    score: markData.score,
                    max_score: markData.maxScore,
                    percentage: parseFloat(percentage.toFixed(2)),
                    grade: grade.grade,
                    grade_points: grade.points,
                    remarks: markData.remarks,
                    visible_to_student: markData.visibleToStudent,
                    entered_by: 'admin'
                }])
                .select(`
                    *,
                    students!inner(reg_number, full_name),
                    courses!inner(course_code, course_name)
                `)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error adding mark:', error);
            throw error;
        }
    }
    
    async getStudentMarks(studentId) {
        if (!this.initialized || this.localStorageFallback) {
            const marks = JSON.parse(localStorage.getItem(this.storagePrefix + 'marks')) || [];
            return marks.filter(m => m.student_id === studentId);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('marks')
                .select(`
                    *,
                    courses!inner(course_code, course_name)
                `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching student marks:', error);
            return [];
        }
    }
    
    async getCourseMarks(courseId) {
        if (!this.initialized || this.localStorageFallback) {
            const marks = JSON.parse(localStorage.getItem(this.storagePrefix + 'marks')) || [];
            return marks.filter(m => m.course_id === courseId);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('marks')
                .select(`
                    *,
                    students!inner(reg_number, full_name)
                `)
                .eq('course_id', courseId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching course marks:', error);
            return [];
        }
    }
    
    async calculateStudentGPA(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            if (marks.length === 0) return 0;
            
            const totalPoints = marks.reduce((sum, mark) => sum + mark.grade_points, 0);
            return parseFloat((totalPoints / marks.length).toFixed(2));
        } catch (error) {
            console.error('Error calculating GPA:', error);
            return 0;
        }
    }
    
    // ========== UTILITY METHODS ==========
    calculateGrade(percentage) {
        const gradingScale = {
            'A': { min: 80, max: 100, points: 4.0 },
            'B+': { min: 75, max: 79, points: 3.5 },
            'B': { min: 70, max: 74, points: 3.0 },
            'C+': { min: 65, max: 69, points: 2.5 },
            'C': { min: 60, max: 64, points: 2.0 },
            'D+': { min: 55, max: 59, points: 1.5 },
            'D': { min: 50, max: 54, points: 1.0 },
            'F': { min: 0, max: 49, points: 0.0 }
        };
        
        for (const [grade, range] of Object.entries(gradingScale)) {
            if (percentage >= range.min && percentage <= range.max) {
                return { grade, points: range.points };
            }
        }
        return { grade: 'F', points: 0.0 };
    }
    
    generateRegNumber(program, intakeYear) {
        const programPrefix = {
            'basic': 'TEE',
            'hnc': 'HNC',
            'advanced': 'ATE'
        };
        
        const prefix = programPrefix[program] || 'TEE';
        const year = intakeYear.toString().slice(-2);
        
        // Generate random 4-digit number
        const randomNum = Math.floor(Math.random() * 9000) + 1000;
        return `${prefix}${year}${randomNum}`;
    }
    
    getSettings() {
        // For now, return default settings
        return this.getDefaultSettings();
    }
    
    logActivity(type, description) {
        // Simple logging to console for now
        console.log(`📝 Activity [${type}]: ${description}`);
    }
    
    getRecentActivities(limit = 5) {
        // Return empty array for now
        return [];
    }
    
    calculateStudentGPA(studentId) {
        const marks = this.getStudentMarks(studentId);
        if (marks.length === 0) return 0;
        
        const totalPoints = marks.reduce((sum, mark) => sum + mark.gradePoints, 0);
        return (totalPoints / marks.length).toFixed(2);
    }
    
    // ========== REGISTRATION NUMBER GENERATOR ==========
    generateRegNumber(program, intakeYear) {
        const programPrefix = {
            'basic': 'TEE',
            'hnc': 'HNC',
            'advanced': 'ATE'
        };
        
        const prefix = programPrefix[program] || 'TEE';
        const year = intakeYear.toString().slice(-2);
        const students = this.getStudents();
        
        // Count students in same program and intake
        const count = students.filter(s => 
            s.program === program && 
            s.intake === intakeYear
        ).length + 1;
        
        const sequence = count.toString().padStart(4, '0');
        return `${prefix}${year}${sequence}`;
    }
    
    // ========== SETTINGS ==========
    getSettings() {
        const saved = JSON.parse(localStorage.getItem(this.storagePrefix + 'settings'));
        return saved ? { ...this.getDefaultSettings(), ...saved } : this.getDefaultSettings();
    }
    
    saveSettings(settings) {
        localStorage.setItem(this.storagePrefix + 'settings', JSON.stringify(settings));
    }
    
    // ========== ACTIVITY LOG ==========
    logActivity(type, description) {
        const activities = JSON.parse(localStorage.getItem(this.storagePrefix + 'activity')) || [];
        activities.unshift({
            id: Date.now().toString(),
            type: type,
            description: description,
            timestamp: new Date().toISOString(),
            user: 'Administrator'
        });
        
        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.pop();
        }
        
        localStorage.setItem(this.storagePrefix + 'activity', JSON.stringify(activities));
    }
    
    getRecentActivities(limit = 10) {
        const activities = JSON.parse(localStorage.getItem(this.storagePrefix + 'activity')) || [];
        return activities.slice(0, limit);
    }
    
    // ========== EXPORT DATA ==========
    exportData(format = 'json') {
        const data = {
            students: this.getStudents(),
            courses: this.getCourses(),
            marks: this.getMarks(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            // Convert students to CSV
            let csv = 'Registration Number,Name,Email,Phone,Program,Intake,Status\n';
            data.students.forEach(student => {
                csv += `"${student.regNumber}","${student.name}","${student.email}","${student.phone}","${student.program}","${student.intake}","${student.status}"\n`;
            });
            return csv;
        }
        
        return data;
    }
}

// ==============================
// APPLICATION CORE
// ==============================

class TEEPortalApp {
    constructor() {
        this.db = new TEEPortalSupabaseDB();
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.charts = {};
        
        this.init();
    }
    
    init() {
        console.log('TEEPortal Application Starting...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        this.loadInitialData();
        
        // Initialize UI components
        this.initializeUI();
        
        console.log('TEEPortal Ready');
        this.showToast('System initialized successfully', 'success');
    }
    
    setupEventListeners() {
        // Student form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        // Marks form submission
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            marksForm.addEventListener('submit', (e) => this.saveMarks(e));
        }
        
        // Course form submission
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => this.saveCourse(e));
        }
        
        // Real-time grade calculation
        const marksScoreInput = document.getElementById('marksScore');
        if (marksScoreInput) {
            marksScoreInput.addEventListener('input', () => this.updateGradeDisplay());
        }
        
        // Search functionality
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('keyup', () => this.searchStudents());
        }
    }
    
    loadInitialData() {
        // Load students table
        this.loadStudentsTable();
        
        // Load courses
        this.loadCourses();
        
        // Load marks
        this.loadMarksTable();
        
        // Update dashboard
        this.updateDashboard();
        
        // Load recent activities
        this.loadRecentActivities();
    }
    
    initializeUI() {
        // Initialize date pickers
        this.initializeDatePickers();
        
        // Initialize charts
        this.initializeCharts();
        
        // Populate dropdowns
        this.populateDropdowns();
    }
    
    // ==============================
    // STUDENT MANAGEMENT
    // ==============================
    
    saveStudent(event) {
        event.preventDefault();
        
        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            email: document.getElementById('studentEmail').value.trim(),
            phone: document.getElementById('studentPhone').value.trim(),
            dob: document.getElementById('studentDOB').value,
            gender: document.getElementById('studentGender').value,
            program: document.getElementById('studentProgram').value,
            intake: document.getElementById('studentIntake').value
        };
        
        // Validation
        if (!studentData.name || !studentData.email || !studentData.program || !studentData.intake) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const student = this.db.addStudent(studentData);
            
            this.showToast(`Student registered successfully! Registration Number: ${student.regNumber}`, 'success');
            
            // Close modal and reset form
            this.closeModal('studentModal');
            document.getElementById('studentForm').reset();
            
            // Update UI
            this.loadStudentsTable();
            this.updateDashboard();
            this.loadRecentActivities();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.showToast('Error saving student data', 'error');
        }
    }
    
    loadStudentsTable(filter = {}) {
        let students = this.db.getStudents();
        
        // Apply filters
        if (filter.program) {
            students = students.filter(s => s.program === filter.program);
        }
        
        if (filter.intake) {
            students = students.filter(s => s.intake === filter.intake);
        }
        
        if (filter.status) {
            students = students.filter(s => s.status === filter.status);
        }
        
        // Apply search
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase();
        if (searchTerm) {
            students = students.filter(s => 
                s.name.toLowerCase().includes(searchTerm) ||
                s.regNumber.toLowerCase().includes(searchTerm) ||
                s.email.toLowerCase().includes(searchTerm)
            );
        }
        
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-user-graduate fa-2x"></i>
                        <p>No students found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const settings = this.db.getSettings();
        
        let html = '';
        students.forEach(student => {
            const programName = settings.programs[student.program]?.name || student.program;
            
            html += `
                <tr>
                    <td><strong>${student.regNumber}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <strong>${student.name}</strong><br>
                                <small>${student.email}</small>
                            </div>
                        </div>
                    </td>
                    <td>${programName}</td>
                    <td>${student.intake}</td>
                    <td>${student.email}</td>
                    <td>${student.phone}</td>
                    <td>
                        <span class="status-badge ${student.status}" style="padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                            ${student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-action" onclick="app.viewStudent('${student.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" onclick="app.enterMarksForStudent('${student.id}')" title="Enter Marks">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn-action" onclick="app.editStudent('${student.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // Update counters
        document.getElementById('studentCount').textContent = students.length;
        document.getElementById('totalStudentCount').textContent = this.db.getStudents().length;
        document.getElementById('headerStudentCount').textContent = `${this.db.getStudents().length} Students`;
    }
    
    viewStudent(studentId) {
        const student = this.db.getStudent(studentId);
        if (!student) {
            this.showToast('Student not found', 'error');
            return;
        }
        
        const settings = this.db.getSettings();
        const programName = settings.programs[student.program]?.name || student.program;
        const marks = this.db.getStudentMarks(studentId);
        const gpa = this.db.calculateStudentGPA(studentId);
        
        // Calculate statistics
        const avgGrade = marks.length > 0 ? 
            (marks.reduce((sum, mark) => sum + parseFloat(mark.percentage), 0) / marks.length).toFixed(1) : 
            'N/A';
        
        // Create student view modal HTML
        const modalHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-circle"></i> Student Details</h3>
                    <button class="close-btn" onclick="app.closeModal('studentViewModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="student-profile">
                        <div class="profile-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                            <div style="width: 80px; height: 80px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 36px;">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0 0 5px 0;">${student.name}</h2>
                                <p style="color: #666; margin: 0 0 10px 0;">${student.regNumber}</p>
                                <span class="status-badge ${student.status}" style="padding: 6px 15px; border-radius: 20px; font-size: 14px;">
                                    ${student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                </span>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                            <div>
                                <h4 style="margin-bottom: 15px; color: #2c3e50;">
                                    <i class="fas fa-info-circle"></i> Personal Information
                                </h4>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                                        <td style="padding: 8px 0;">${student.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                                        <td style="padding: 8px 0;">${student.phone}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Date of Birth:</strong></td>
                                        <td style="padding: 8px 0;">${student.dob || 'Not specified'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Gender:</strong></td>
                                        <td style="padding: 8px 0;">${student.gender || 'Not specified'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Program:</strong></td>
                                        <td style="padding: 8px 0;">${programName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Intake Year:</strong></td>
                                        <td style="padding: 8px 0;">${student.intake}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666;"><strong>Registration Date:</strong></td>
                                        <td style="padding: 8px 0;">${student.registrationDate}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div>
                                <h4 style="margin-bottom: 15px; color: #2c3e50;">
                                    <i class="fas fa-chart-line"></i> Academic Performance
                                </h4>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 24px; font-weight: bold; color: #3498db;">${gpa}</div>
                                        <div style="font-size: 12px; color: #666;">GPA</div>
                                    </div>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 24px; font-weight: bold; color: #2ecc71;">${marks.length}</div>
                                        <div style="font-size: 12px; color: #666;">Assessments</div>
                                    </div>
                                </div>
                                
                                ${marks.length > 0 ? `
                                    <h5 style="margin-bottom: 10px;">Recent Grades</h5>
                                    <div style="max-height: 200px; overflow-y: auto;">
                                        ${marks.slice(0, 5).map(mark => `
                                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                                                <div>${mark.assessmentName || 'Assessment'}</div>
                                                <div>
                                                    <span style="padding: 2px 8px; border-radius: 12px; background: ${this.getGradeColor(mark.grade)}; color: white; font-size: 12px;">
                                                        ${mark.grade} (${mark.percentage}%)
                                                    </span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<p>No academic records yet</p>'}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions" style="padding: 20px 30px; border-top: 1px solid #eee; text-align: right;">
                    <button class="btn-secondary" onclick="app.closeModal('studentViewModal')" style="margin-right: 10px;">
                        Close
                    </button>
                    <button class="btn-primary" onclick="app.enterMarksForStudent('${student.id}')">
                        <i class="fas fa-plus"></i> Enter Marks
                    </button>
                </div>
            </div>
        `;
        
        // Create or update modal
        let modal = document.getElementById('studentViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'studentViewModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = modalHTML;
        
        this.openModal('studentViewModal');
    }
    
    // ==============================
    // GRADING SYSTEM
    // ==============================
    
    saveMarks(event) {
        event.preventDefault();
        
        const studentId = document.getElementById('marksStudent').value;
        const courseId = document.getElementById('marksCourse').value;
        const score = parseFloat(document.getElementById('marksScore').value);
        const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
        
        if (!studentId || !courseId || isNaN(score)) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (score > maxScore) {
            this.showToast(`Score cannot exceed maximum score (${maxScore})`, 'error');
            return;
        }
        
        const markData = {
            studentId: studentId,
            courseId: courseId,
            assessmentType: document.getElementById('assessmentType').value,
            assessmentName: document.getElementById('assessmentName').value || 'Assessment',
            score: score,
            maxScore: maxScore,
            remarks: document.getElementById('marksRemarks').value,
            visibleToStudent: document.getElementById('visibleToStudent').checked
        };
        
        try {
            const mark = this.db.addMark(markData);
            
            this.showToast('Marks saved successfully', 'success');
            
            // Close modal and reset form
            this.closeModal('marksModal');
            document.getElementById('marksForm').reset();
            document.getElementById('gradeDisplay').textContent = '-';
            document.getElementById('percentage').value = '';
            
            // Update UI
            this.loadMarksTable();
            this.updateDashboard();
            this.loadRecentActivities();
            
        } catch (error) {
            console.error('Error saving marks:', error);
            this.showToast('Error saving marks', 'error');
        }
    }
    
    updateGradeDisplay() {
        const score = parseFloat(document.getElementById('marksScore').value);
        const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
        
        if (isNaN(score)) {
            document.getElementById('gradeDisplay').textContent = '-';
            document.getElementById('percentage').value = '';
            return;
        }
        
        const percentage = (score / maxScore) * 100;
        const grade = this.db.calculateGrade(percentage);
        
        document.getElementById('percentage').value = `${percentage.toFixed(2)}%`;
        document.getElementById('gradeDisplay').textContent = grade.grade;
        
        // Add grade color class
        const gradeDisplay = document.getElementById('gradeDisplay');
        gradeDisplay.className = 'percentage-badge';
        gradeDisplay.classList.add(`grade-${grade.grade.charAt(0)}`);
    }
    
    getGradeColor(grade) {
        const colors = {
            'A': '#27ae60',
            'B': '#2ecc71',
            'C': '#f1c40f',
            'D': '#e67e22',
            'F': '#e74c3c'
        };
        return colors[grade.charAt(0)] || '#95a5a6';
    }
    
   // ==============================
// COURSE MANAGEMENT
// ==============================

saveCourse(event) {
    event.preventDefault();
    
    try {
        // Safely get form values with defensive checks
        const getElementValue = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Element with id "${id}" not found`);
                return '';
            }
            return element.value || '';
        };
        
        const courseData = {
            code: getElementValue('courseCode').trim(),
            name: getElementValue('courseName').trim(),
            program: getElementValue('courseProgram'),
            credits: parseInt(getElementValue('courseCredits')),
            description: getElementValue('courseDescription').trim()
        };
        
        console.log('Course data to save:', courseData);
        
        // Validate required fields
        if (!courseData.code) {
            this.showToast('Course code is required', 'error');
            return;
        }
        
        if (!courseData.name) {
            this.showToast('Course name is required', 'error');
            return;
        }
        
        if (!courseData.program) {
            this.showToast('Please select a program', 'error');
            return;
        }
        
        if (isNaN(courseData.credits) || courseData.credits < 1) {
            courseData.credits = 3; // Default value
        }
        
        // Save the course
        const course = this.db.addCourse(courseData);
        
        this.showToast(`Course "${course.code} - ${course.name}" added successfully`, 'success');
        
        // Reset form and close modal
        const form = document.getElementById('courseForm');
        if (form) {
            form.reset();
        }
        this.closeModal('courseModal');
        
        // Update UI
        this.loadCourses();
        this.populateCourseDropdown();
        this.loadRecentActivities();
        
    } catch (error) {
        console.error('Error saving course:', error);
        this.showToast(error.message || 'Error saving course. Please try again.', 'error');
    }
}

loadCourses() {
    try {
        const courses = this.db.getCourses();
        const grid = document.getElementById('coursesGrid');
        
        if (!grid) {
            console.error('Courses grid element not found');
            return;
        }
        
        if (courses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-book-open fa-3x" style="color: #95a5a6; margin-bottom: 20px;"></i>
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">No Courses Found</h3>
                    <p style="color: #7f8c8d; margin-bottom: 20px;">Add your first course to get started</p>
                    <button class="btn-primary" onclick="app.openCourseModal()" 
                            style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-plus"></i> Add Course
                    </button>
                </div>
            `;
            return;
        }
        
        const settings = this.db.getSettings();
        const programNames = {
            'basic': 'Basic TEE',
            'hnc': 'HNC (Higher National Certificate)',
            'advanced': 'Advanced TEE'
        };
        
        let html = '';
        courses.forEach(course => {
            const programName = programNames[course.program] || course.program;
            const programColors = {
                'basic': '#3498db',
                'hnc': '#2ecc71',
                'advanced': '#9b59b6'
            };
            const programColor = programColors[course.program] || '#95a5a6';
            
            html += `
                <div class="course-card" style="
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    transition: transform 0.3s, box-shadow 0.3s;
                ">
                    <div class="course-header" style="
                        background: ${programColor};
                        color: white;
                        padding: 15px 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">${course.code}</h3>
                            <span class="course-status" style="
                                background: rgba(255,255,255,0.2);
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 12px;
                                font-weight: 500;
                            ">
                                ${course.status || 'Active'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="course-body" style="padding: 20px;">
                        <h4 style="
                            margin: 0 0 10px 0;
                            color: #2c3e50;
                            font-size: 16px;
                            font-weight: 600;
                        ">
                            ${course.name}
                        </h4>
                        
                        <p class="course-description" style="
                            color: #666;
                            font-size: 14px;
                            line-height: 1.5;
                            margin-bottom: 15px;
                            min-height: 42px;
                        ">
                            ${course.description || 'No description available'}
                        </p>
                        
                        <div class="course-meta" style="
                            display: flex;
                            flex-wrap: wrap;
                            gap: 15px;
                            font-size: 13px;
                            color: #7f8c8d;
                        ">
                            <span style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-graduation-cap"></i>
                                ${programName}
                            </span>
                            <span style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-star"></i>
                                ${course.credits || 3} Credits
                            </span>
                            <span style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-calendar"></i>
                                ${new Date(course.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    
                    <div class="course-actions" style="
                        padding: 15px 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        gap: 10px;
                        background: #f8f9fa;
                    ">
                        <button class="btn-edit" onclick="app.editCourse('${course.id}')" 
                                style="
                                    flex: 1;
                                    background: #3498db;
                                    color: white;
                                    border: none;
                                    padding: 8px;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 5px;
                                ">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        
                        <button class="btn-delete" onclick="app.deleteCourse('${course.id}')"
                                style="
                                    flex: 1;
                                    background: #e74c3c;
                                    color: white;
                                    border: none;
                                    padding: 8px;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 5px;
                                ">
                            <i class="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading courses:', error);
        this.showToast('Error loading courses', 'error');
    }
}

editCourse(courseId) {
    try {
        const course = this.db.getCourse(courseId);
        if (!course) {
            this.showToast('Course not found', 'error');
            return;
        }
        
        // Create edit modal HTML
        const modalHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Course</h3>
                    <button class="close-btn" onclick="app.closeModal('editCourseModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editCourseForm" onsubmit="app.updateCourseHandler(event, '${course.id}')">
                        <div class="form-group">
                            <label>Course Code *</label>
                            <input type="text" id="editCourseCode" value="${course.code}" required>
                        </div>
                        <div class="form-group">
                            <label>Course Name *</label>
                            <input type="text" id="editCourseName" value="${course.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Program *</label>
                            <select id="editCourseProgram" required>
                                <option value="basic" ${course.program === 'basic' ? 'selected' : ''}>Basic TEE</option>
                                <option value="hnc" ${course.program === 'hnc' ? 'selected' : ''}>HNC</option>
                                <option value="advanced" ${course.program === 'advanced' ? 'selected' : ''}>Advanced TEE</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Credit Hours *</label>
                            <select id="editCourseCredits" required>
                                <option value="2" ${course.credits === 2 ? 'selected' : ''}>2 Credits</option>
                                <option value="3" ${course.credits === 3 ? 'selected' : ''}>3 Credits</option>
                                <option value="4" ${course.credits === 4 ? 'selected' : ''}>4 Credits</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="editCourseDescription" rows="3">${course.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="editCourseStatus">
                                <option value="active" ${course.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${course.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="app.closeModal('editCourseModal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Course</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Create or update modal
        let modal = document.getElementById('editCourseModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editCourseModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = modalHTML;
        
        this.openModal('editCourseModal');
        
    } catch (error) {
        console.error('Error in editCourse:', error);
        this.showToast('Error loading course for editing', 'error');
    }
}

updateCourseHandler(event, courseId) {
    event.preventDefault();
    
    try {
        const updates = {
            code: document.getElementById('editCourseCode').value.trim(),
            name: document.getElementById('editCourseName').value.trim(),
            program: document.getElementById('editCourseProgram').value,
            credits: parseInt(document.getElementById('editCourseCredits').value),
            description: document.getElementById('editCourseDescription').value.trim(),
            status: document.getElementById('editCourseStatus').value
        };
        
        // Validate
        if (!updates.code || !updates.name || !updates.program) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const updatedCourse = this.db.updateCourse(courseId, updates);
        this.showToast(`Course "${updatedCourse.code}" updated successfully`, 'success');
        
        this.closeModal('editCourseModal');
        this.loadCourses();
        this.populateCourseDropdown();
        
    } catch (error) {
        console.error('Error updating course:', error);
        this.showToast(error.message || 'Error updating course', 'error');
    }
}

deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        return;
    }
    
    try {
        const success = this.db.deleteCourse(courseId);
        if (success) {
            this.showToast('Course deleted successfully', 'success');
            this.loadCourses();
            this.populateCourseDropdown();
        } else {
            this.showToast('Course not found', 'error');
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        this.showToast('Error deleting course', 'error');
    }
}

populateCourseDropdown() {
    try {
        const select = document.getElementById('marksCourse');
        if (!select) {
            console.warn('marksCourse dropdown not found');
            return;
        }
        
        const courses = this.db.getCourses().filter(c => c.status === 'active');
        
        // Store current selection
        const currentValue = select.value;
        
        // Clear and repopulate
        select.innerHTML = '<option value="">Select Course</option>';
        
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = `${course.code} - ${course.name}`;
            select.appendChild(option);
        });
        
        // Restore previous selection if possible
        if (currentValue && courses.some(c => c.id === currentValue)) {
            select.value = currentValue;
        }
        
    } catch (error) {
        console.error('Error populating course dropdown:', error);
    }
}
    // ==============================
    // DASHBOARD FUNCTIONS
    // ==============================
    
    updateDashboard() {
        const students = this.db.getStudents();
        const marks = this.db.getMarks();
        const courses = this.db.getCourses();
        const settings = this.db.getSettings();
        
        // Update stats
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('activePrograms').textContent = Object.keys(settings.programs).length;
        document.getElementById('currentIntake').textContent = settings.academicYear;
        
        // Calculate average grade
        if (marks.length > 0) {
            const avgPercentage = marks.reduce((sum, mark) => sum + parseFloat(mark.percentage), 0) / marks.length;
            const grade = this.db.calculateGrade(avgPercentage);
            document.getElementById('avgGrade').textContent = grade.grade;
        } else {
            document.getElementById('avgGrade').textContent = 'N/A';
        }
        
        // Update charts
        this.updateEnrollmentChart(students);
        this.updateProgramDistributionChart(students);
        this.updateGradeDistributionChart(marks);
    }
    
    updateEnrollmentChart(students) {
        const ctx = document.getElementById('enrollmentChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.enrollment) {
            this.charts.enrollment.destroy();
        }
        
        // Group by intake year
        const enrollments = {};
        students.forEach(student => {
            enrollments[student.intake] = (enrollments[student.intake] || 0) + 1;
        });
        
        const years = Object.keys(enrollments).sort();
        const counts = years.map(year => enrollments[year]);
        
        this.charts.enrollment = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Student Enrollment',
                    data: counts,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    updateProgramDistributionChart(students) {
        const ctx = document.getElementById('programChart');
        if (!ctx) return;
        
        if (this.charts.program) {
            this.charts.program.destroy();
        }
        
        const settings = this.db.getSettings();
        const programCounts = {};
        
        students.forEach(student => {
            const programName = settings.programs[student.program]?.name || student.program;
            programCounts[programName] = (programCounts[programName] || 0) + 1;
        });
        
        const colors = ['#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        
        this.charts.program = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(programCounts),
                datasets: [{
                    data: Object.values(programCounts),
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    updateGradeDistributionChart(marks) {
        const ctx = document.getElementById('gradeChart');
        if (!ctx) return;
        
        if (this.charts.grade) {
            this.charts.grade.destroy();
        }
        
        const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        
        marks.forEach(mark => {
            const firstLetter = mark.grade.charAt(0);
            if (gradeCounts[firstLetter] !== undefined) {
                gradeCounts[firstLetter]++;
            }
        });
        
        const colors = ['#27ae60', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'];
        
        this.charts.grade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['A', 'B', 'C', 'D', 'F'],
                datasets: [{
                    label: 'Grade Distribution',
                    data: Object.values(gradeCounts),
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // ==============================
    // UTILITY FUNCTIONS
    // ==============================
    
    initializeDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            input.max = today;
        });
    }
    
    populateDropdowns() {
        // Populate marks modal dropdowns
        this.populateStudentDropdown();
        this.populateCourseDropdown();
    }
    
    populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Student</option>';
        
        const students = this.db.getStudents();
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.regNumber} - ${student.name}`;
            select.appendChild(option);
        });
    }
    
    populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Course</option>';
        
        const courses = this.db.getCourses();
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = `${course.code} - ${course.name}`;
            select.appendChild(option);
        });
    }
    
    updateStudentInfo() {
        const studentId = document.getElementById('marksStudent').value;
        const infoDiv = document.getElementById('studentInfo');
        
        if (!studentId) {
            infoDiv.style.display = 'none';
            return;
        }
        
        const student = this.db.getStudent(studentId);
        if (student) {
            document.getElementById('infoRegNo').textContent = student.regNumber;
            document.getElementById('infoProgram').textContent = student.program;
            document.getElementById('infoIntake').textContent = student.intake;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    }
    
    loadRecentActivities() {
        const activities = this.db.getRecentActivities(5);
        const container = document.querySelector('.activity-list');
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<p>No recent activities</p>';
            return;
        }
        
        let html = '';
        activities.forEach(activity => {
            const timeAgo = this.getTimeAgo(activity.timestamp);
            const icon = this.getActivityIcon(activity.type);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="activity-details">
                        <p>${activity.description}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        return 'Over a month ago';
    }
    
    getActivityIcon(type) {
        const icons = {
            'student_registered': 'fas fa-user-plus',
            'marks_entered': 'fas fa-chart-bar',
            'course_added': 'fas fa-book',
            'settings_updated': 'fas fa-cog'
        };
        return icons[type] || 'fas fa-info-circle';
    }
    
    loadMarksTable() {
        const marks = this.db.getMarks();
        const tbody = document.getElementById('marksTableBody');
        if (!tbody) return;
        
        if (marks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-chart-bar fa-2x"></i>
                        <p>No academic records yet</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        marks.forEach(mark => {
            const student = this.db.getStudent(mark.studentId);
            const course = this.db.getCourses().find(c => c.id === mark.courseId);
            
            html += `
                <tr>
                    <td>${student ? student.name : 'Unknown'}</td>
                    <td>${course ? course.code : 'Unknown'}</td>
                    <td>${mark.assessmentName}</td>
                    <td>${mark.score}/${mark.maxScore}</td>
                    <td>${mark.percentage}%</td>
                    <td>
                        <span style="padding: 4px 8px; border-radius: 4px; background: ${this.getGradeColor(mark.grade)}; color: white;">
                            ${mark.grade}
                        </span>
                    </td>
                    <td>${new Date(mark.enteredAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-action" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // ==============================
    // UI HELPER FUNCTIONS
    // ==============================
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #666; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.getElementById('toastContainer');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.id = 'toastContainer';
            newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(newContainer);
            container = newContainer;
        }
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    openStudentModal() {
        this.openModal('studentModal');
    }
    
    openMarksModal() {
        this.populateStudentDropdown();
        this.populateCourseDropdown();
        this.openModal('marksModal');
    }
    
    enterMarksForStudent(studentId) {
        this.openMarksModal();
        if (studentId) {
            document.getElementById('marksStudent').value = studentId;
            this.updateStudentInfo();
        }
    }
    
    openCourseModal() {
        this.openModal('courseModal');
    }
    
    filterStudents() {
        const program = document.getElementById('filterProgram').value;
        const intake = document.getElementById('filterIntake').value;
        const status = document.getElementById('filterStatus').value;
        
        this.loadStudentsTable({ program, intake, status });
    }
    
    searchStudents() {
        this.loadStudentsTable();
    }
    
    // ==============================
    // INITIALIZATION
    // ==============================
    
    initializeCharts() {
        // Initialize empty charts if needed
        this.updateDashboard();
    }
}

// ==============================
// GLOBAL APP INSTANCE
// ==============================

let app = null;

document.addEventListener('DOMContentLoaded', function() {
    app = new TEEPortalApp();
    
    // Make app methods globally available
    window.app = app;
    
    // Setup navigation
    window.showSection = function(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            const titles = {
                'dashboard': 'Dashboard Overview',
                'students': 'Student Management',
                'courses': 'Course Management',
                'marks': 'Academic Records',
                'intake': 'Intake Management',
                'reports': 'Reports & Analytics',
                'settings': 'System Settings'
            };
            
            document.getElementById('section-title').textContent = titles[sectionId] || 'TeePortal';
        }
    };
    
    // Make utility functions globally available
    window.openStudentModal = () => app.openStudentModal();
    window.openMarksModal = () => app.openMarksModal();
    window.openCourseModal = () => app.openCourseModal();
    window.closeModal = (modalId) => app.closeModal(modalId);
    window.filterStudents = () => app.filterStudents();
    window.searchStudents = () => app.searchStudents();
    
    // Set current academic year
    const year = new Date().getFullYear();
    document.getElementById('currentAcademicYear').textContent = `${year} Academic Year`;
    
    console.log('TEEPortal System Ready');
});

// Add CSS for toast notifications
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        min-width: 300px;
        max-width: 400px;
    }
    
    .toast.success {
        border-left: 4px solid #27ae60;
    }
    
    .toast.error {
        border-left: 4px solid #e74c3c;
    }
    
    .toast.warning {
        border-left: 4px solid #f39c12;
    }
    
    .toast.info {
        border-left: 4px solid #3498db;
    }
    
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
    
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-badge.active {
        background: #d4edda;
        color: #155724;
    }
    
    .status-badge.graduated {
        background: #cce5ff;
        color: #004085;
    }
    
    .status-badge.withdrawn {
        background: #f8d7da;
        color: #721c24;
    }
    
    .btn-action {
        background: none;
        border: 1px solid #ddd;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 2px;
    }
    
    .btn-action:hover {
        background: #f5f5f5;
    }
`;
document.head.appendChild(toastStyles);
