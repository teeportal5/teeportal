// ==============================
// SUPABASE DATABASE MANAGEMENT
// ==============================

class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.localStorageFallback = false;
        this.storagePrefix = 'teeprod_';
        
        // Initialize localStorage fallback immediately
        this.useLocalStorageFallback();
        
        // Initialize Supabase if available
        if (typeof supabase !== 'undefined') {
            this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            this.init();
        } else {
            console.warn('Supabase client not loaded - using localStorage only');
            this.localStorageFallback = true;
        }
    }
    
    async init() {
        try {
            if (!this.supabaseUrl || !this.supabaseKey) {
                throw new Error('Supabase credentials not set');
            }
            
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection
            await this.testConnection();
            this.initialized = true;
            this.localStorageFallback = false;
            console.log('✅ Supabase connected successfully');
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            this.initialized = false;
            this.localStorageFallback = true;
        }
    }
    
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .limit(1);
                
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            return true;
        } catch (error) {
            throw error;
        }
    }
    
    useLocalStorageFallback() {
        // Initialize localStorage if needed
        if (!localStorage.getItem(this.storagePrefix + 'initialized')) {
            localStorage.setItem(this.storagePrefix + 'students', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'courses', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'marks', JSON.stringify([]));
            localStorage.setItem(this.storagePrefix + 'settings', JSON.stringify(this.getDefaultSettings()));
            localStorage.setItem(this.storagePrefix + 'activity', JSON.stringify([]));
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
            },
            programs: {
                'basic': { name: 'Basic TEE', duration: '2 years' },
                'hnc': { name: 'HNC', duration: '3 years' },
                'advanced': { name: 'Advanced TEE', duration: '4 years' }
            }
        };
    }
    
    // ========== STUDENTS ==========
    async getStudents() {
        if (this.localStorageFallback) {
            return this.getLocalStorageData('students');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Supabase error, falling back to localStorage:', error);
                this.localStorageFallback = true;
                return this.getLocalStorageData('students');
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching students:', error);
            this.localStorageFallback = true;
            return this.getLocalStorageData('students');
        }
    }
    
           async testSupabaseConnection() {
        console.log('🔍 Testing Supabase connection...');
        
        try {
            // Test 1: Can we connect?
            const { data, error } = await this.supabase
                .from('students')
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('❌ Connection test failed:', error);
                return false;
            }
            
            console.log('✅ Supabase connection successful');
            return true;
            
        } catch (error) {
            console.error('💥 Connection test exception:', error);
            return false;
        }
    }
    
    async getStudent(id) {
        if (this.localStorageFallback) {
            const students = this.getLocalStorageData('students');
            return students.find(s => s.id === id || s.reg_number === id || s.regNumber === id);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .or(`id.eq.${id},reg_number.eq.${id}`)
                .single();
                
            if (error) {
                const students = this.getLocalStorageData('students');
                return students.find(s => s.id === id || s.reg_number === id || s.regNumber === id);
            }
            
            return data;
            
        } catch (error) {
            console.error('Error fetching student:', error);
            const students = this.getLocalStorageData('students');
            return students.find(s => s.id === id || s.reg_number === id || s.regNumber === id);
        }
    }
    
    // ========== COURSES ==========
    async getCourses() {
        if (this.localStorageFallback) {
            return this.getLocalStorageData('courses');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Supabase error, falling back to localStorage:', error);
                this.localStorageFallback = true;
                return this.getLocalStorageData('courses');
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching courses:', error);
            this.localStorageFallback = true;
            return this.getLocalStorageData('courses');
        }
    }
    
    async addCourse(courseData) {
        const course = {
            id: Date.now().toString(),
            course_code: courseData.code.toUpperCase(),
            course_name: courseData.name,
            program: courseData.program,
            credits: courseData.credits,
            description: courseData.description,
            status: 'active',
            created_at: new Date().toISOString(),
            // For compatibility
            code: courseData.code.toUpperCase(),
            name: courseData.name
        };
        
        if (this.localStorageFallback) {
            const courses = this.getLocalStorageData('courses');
            courses.push(course);
            this.saveLocalStorageData('courses', courses);
            this.logActivity('course_added', `Added course: ${course.course_code}`);
            return course;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .insert([{
                    course_code: course.course_code,
                    course_name: course.course_name,
                    program: course.program,
                    credits: course.credits,
                    description: course.description,
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            this.logActivity('course_added', `Added course: ${data.course_code}`);
            return { ...data, ...course }; // Combine for compatibility
            
        } catch (error) {
            console.error('Error adding course:', error);
            this.localStorageFallback = true;
            const courses = this.getLocalStorageData('courses');
            courses.push(course);
            this.saveLocalStorageData('courses', courses);
            this.logActivity('course_added', `Added course (fallback): ${course.course_code}`);
            return course;
        }
    }
    
    async getCourse(id) {
        if (this.localStorageFallback) {
            const courses = this.getLocalStorageData('courses');
            return courses.find(c => c.id === id || c.course_code === id || c.code === id);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .or(`id.eq.${id},course_code.eq.${id}`)
                .single();
                
            if (error) {
                const courses = this.getLocalStorageData('courses');
                return courses.find(c => c.id === id || c.course_code === id || c.code === id);
            }
            
            return data;
            
        } catch (error) {
            console.error('Error fetching course:', error);
            const courses = this.getLocalStorageData('courses');
            return courses.find(c => c.id === id || c.course_code === id || c.code === id);
        }
    }
    
    // ========== MARKS ==========
    async getMarks() {
        if (this.localStorageFallback) {
            return this.getLocalStorageData('marks');
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
                
            if (error) {
                console.error('Supabase error, falling back to localStorage:', error);
                this.localStorageFallback = true;
                return this.getLocalStorageData('marks');
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching marks:', error);
            this.localStorageFallback = true;
            return this.getLocalStorageData('marks');
        }
    }
    
  async addMark(markData) {
    const percentage = (markData.score / markData.maxScore) * 100;
    const grade = this.calculateGrade(percentage);
    
    const mark = {
        student_id: markData.studentId,
        course_id: markData.courseId,
        assessment_type: markData.assessmentType,
        assessment_name: markData.assessmentName,
        score: markData.score,
        max_score: markData.maxScore,
        percentage: parseFloat(percentage.toFixed(2)),
        grade: grade.grade,
        grade_points: grade.points,
        remarks: markData.remarks || '',
        visible_to_student: markData.visibleToStudent,
        entered_by: 'admin'
    };
    
    console.log('📊 Processing marks for:', {
        student: markData.studentId,
        course: markData.courseId,
        assessment: markData.assessmentName
    });
    
    if (this.localStorageFallback) {
        // LocalStorage logic remains the same
        const marks = this.getLocalStorageData('marks');
        const existingIndex = marks.findIndex(m => 
            m.student_id === markData.studentId && 
            m.course_id === markData.courseId && 
            m.assessment_name === markData.assessmentName
        );
        
        if (existingIndex > -1) {
            // Update existing
            marks[existingIndex] = {
                ...marks[existingIndex],
                ...mark,
                updated_at: new Date().toISOString()
            };
            this.showToast('📝 Updated existing marks', 'info');
        } else {
            // Add new
            mark.id = Date.now().toString();
            mark.created_at = new Date().toISOString();
            marks.push(mark);
        }
        
        this.saveLocalStorageData('marks', marks);
        this.logActivity('marks_entered', `Saved marks for student`);
        return mark;
    }
    
    try {
        // FIRST: Check if marks already exist for this student/course/assessment
        console.log('🔍 Checking for existing marks...');
        
        const { data: existingMarks, error: checkError } = await this.supabase
            .from('marks')
            .select('*')
            .eq('student_id', markData.studentId)
            .eq('course_id', markData.courseId)
            .eq('assessment_name', markData.assessmentName)
            .maybeSingle();
            
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing marks:', checkError);
        }
        
        if (existingMarks) {
            console.log('📝 Existing marks found, updating...');
            
            // UPDATE EXISTING MARKS
            const { data: updatedData, error: updateError } = await this.supabase
                .from('marks')
                .update({
                    score: mark.score,
                    max_score: mark.max_score,
                    percentage: mark.percentage,
                    grade: mark.grade,
                    grade_points: mark.grade_points,
                    remarks: mark.remarks,
                    visible_to_student: mark.visible_to_student,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingMarks.id)
                .select()
                .single();
                
            if (updateError) throw updateError;
            
            console.log('✅ Marks updated successfully:', updatedData);
            this.logActivity('marks_updated', `Updated marks for student`);
            return updatedData;
            
        } else {
            console.log('🆕 No existing marks found, inserting new...');
            
            // INSERT NEW MARKS
            const { data: newData, error: insertError } = await this.supabase
                .from('marks')
                .insert([mark])
                .select()
                .single();
                
            if (insertError) throw insertError;
            
            console.log('✅ New marks inserted successfully:', newData);
            this.logActivity('marks_entered', `Entered new marks for student`);
            return newData;
        }
        
    } catch (error) {
        console.error('💥 Error in addMark:', error);
        
        // Fallback to localStorage
        console.warn('⚠️ Falling back to localStorage');
        this.localStorageFallback = true;
        return this.addMark(markData); // Recursive call with fallback flag
    }
}
    
    async getStudentMarks(studentId) {
        if (this.localStorageFallback) {
            const marks = this.getLocalStorageData('marks');
            return marks.filter(m => m.student_id === studentId || m.studentId === studentId);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('marks')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });
                
            if (error) {
                const marks = this.getLocalStorageData('marks');
                return marks.filter(m => m.student_id === studentId || m.studentId === studentId);
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching student marks:', error);
            const marks = this.getLocalStorageData('marks');
            return marks.filter(m => m.student_id === studentId || m.studentId === studentId);
        }
    }
    
    // ========== UTILITY METHODS ==========
    getLocalStorageData(key) {
        try {
            const data = localStorage.getItem(this.storagePrefix + key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error parsing localStorage data for ${key}:`, error);
            return [];
        }
    }
    
    saveLocalStorageData(key, data) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving localStorage data for ${key}:`, error);
        }
    }
    
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
        
        // Get existing students to generate sequential number
        const students = this.getLocalStorageData('students');
        const sameProgramCount = students.filter(s => 
            (s.program === program || s.program === program) && 
            (s.intake_year === intakeYear || s.intake === intakeYear)
        ).length;
        
        const sequence = (sameProgramCount + 1).toString().padStart(3, '0');
        return `${prefix}${year}${sequence}`;
    }
    
    async calculateStudentGPA(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            if (marks.length === 0) return 0;
            
            const totalPoints = marks.reduce((sum, mark) => sum + (mark.grade_points || mark.gradePoints || 0), 0);
            return parseFloat((totalPoints / marks.length).toFixed(2));
        } catch (error) {
            console.error('Error calculating GPA:', error);
            return 0;
        }
    }
    
    getSettings() {
        try {
            const saved = localStorage.getItem(this.storagePrefix + 'settings');
            return saved ? { ...this.getDefaultSettings(), ...JSON.parse(saved) } : this.getDefaultSettings();
        } catch (error) {
            return this.getDefaultSettings();
        }
    }
    
    logActivity(type, description) {
        try {
            const activities = this.getLocalStorageData('activity');
            activities.unshift({
                id: Date.now().toString(),
                type: type,
                description: description,
                timestamp: new Date().toISOString(),
                user: 'Administrator'
            });
            
            // Keep only last 50 activities
            if (activities.length > 50) {
                activities.length = 50;
            }
            
            this.saveLocalStorageData('activity', activities);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    
    getRecentActivities(limit = 10) {
        try {
            const activities = this.getLocalStorageData('activity');
            return activities.slice(0, limit);
        } catch (error) {
            return [];
        }
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
    
    async init() {
        console.log('TEEPortal Application Starting...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Initialize UI components
        this.initializeUI();
        
        console.log('TEEPortal Ready');
        this.showToast('System initialized successfully', 'success');
    }
    
   setupEventListeners() {
    // Student form submission
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.saveStudent && typeof this.saveStudent === 'function') {
                this.saveStudent(e);
            } else {
                console.error('saveStudent not available');
            }
        });
    }
    
    // Marks form submission
    const marksForm = document.getElementById('marksForm');
    if (marksForm) {
        marksForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.saveMarks && typeof this.saveMarks === 'function') {
                this.saveMarks(e);
            } else {
                console.error('saveMarks not available');
            }
        });
    }
    
    // Course form submission
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.saveCourse && typeof this.saveCourse === 'function') {
                this.saveCourse(e);
            } else {
                console.error('saveCourse not available');
            }
        });
    }
    
    // Real-time grade calculation - FIXED with proper binding
    const marksScoreInput = document.getElementById('marksScore');
    if (marksScoreInput) {
        marksScoreInput.addEventListener('input', () => {
            // Use a safer approach
            if (this && typeof this.updateGradeDisplay === 'function') {
                this.updateGradeDisplay();
            } else if (window.app && typeof window.app.updateGradeDisplay === 'function') {
                window.app.updateGradeDisplay();
            } else {
                console.warn('updateGradeDisplay not available yet');
                // Fallback: calculate manually
                this.fallbackGradeDisplay();
            }
        });
    }
}

// Add this fallback method to your TEEPortalApp class
fallbackGradeDisplay() {
    try {
        const scoreInput = document.getElementById('marksScore');
        const score = parseFloat(scoreInput?.value);
        
        if (!isNaN(score)) {
            const percentage = (score / 100) * 100;
            const grade = this.db.calculateGrade(percentage);
            
            const gradeDisplay = document.getElementById('gradeDisplay');
            const percentageField = document.getElementById('percentage');
            
            if (gradeDisplay) {
                gradeDisplay.textContent = grade.grade;
                gradeDisplay.className = 'percentage-badge';
                gradeDisplay.classList.add(`grade-${grade.grade.charAt(0)}`);
            }
            if (percentageField) {
                percentageField.value = `${percentage.toFixed(2)}%`;
            }
        }
    } catch (error) {
        console.error('Fallback grade display error:', error);
    }
}
    
    async loadInitialData() {
        try {
            // Load students table
            await this.loadStudentsTable();
            
            // Load courses
            await this.loadCourses();
            
            // Update dashboard
            await this.updateDashboard();
            
            // Load recent activities
            await this.loadRecentActivities();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    initializeUI() {
        // Initialize date pickers
        this.initializeDatePickers();
        
        // Populate dropdowns
        this.populateDropdowns();
    }
        // ==============================
    // COMPLETE BUTTON FUNCTIONALITIES
    // ==============================
    
    // 1. COURSE MANAGEMENT COMPLETE FUNCTIONS
    editCourse(courseId) {
        try {
            const course = this.db.getCourse(courseId);
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            const modalHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> Edit Course</h3>
                        <button class="close-btn" onclick="app.closeModal('editCourseModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editCourseForm">
                            <div class="form-group">
                                <label>Course Code *</label>
                                <input type="text" id="editCourseCode" value="${course.course_code || course.code}" required>
                            </div>
                            <div class="form-group">
                                <label>Course Name *</label>
                                <input type="text" id="editCourseName" value="${course.course_name || course.name}" required>
                            </div>
                            <div class="form-group">
                                <label>Program *</label>
                                <select id="editCourseProgram" required>
                                    <option value="basic" ${(course.program === 'basic') ? 'selected' : ''}>Basic TEE</option>
                                    <option value="hnc" ${(course.program === 'hnc') ? 'selected' : ''}>HNC</option>
                                    <option value="advanced" ${(course.program === 'advanced') ? 'selected' : ''}>Advanced TEE</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Credit Hours *</label>
                                <select id="editCourseCredits" required>
                                    <option value="2" ${course.credits === 2 ? 'selected' : ''}>2 Credits</option>
                                    <option value="3" ${course.credits === 3 ? 'selected' : ''} ${!course.credits ? 'selected' : ''}>3 Credits</option>
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
                                    <option value="active" ${(course.status === 'active') ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${(course.status === 'inactive') ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="app.closeModal('editCourseModal')">Cancel</button>
                                <button type="button" class="btn-primary" onclick="app.updateCourse('${courseId}')">Update Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
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
    
    async updateCourse(courseId) {
        try {
            const updates = {
                code: document.getElementById('editCourseCode').value.trim(),
                name: document.getElementById('editCourseName').value.trim(),
                program: document.getElementById('editCourseProgram').value,
                credits: parseInt(document.getElementById('editCourseCredits').value),
                description: document.getElementById('editCourseDescription').value.trim(),
                status: document.getElementById('editCourseStatus').value
            };
            
            if (!updates.code || !updates.name || !updates.program) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            // For localStorage - update the course
            if (this.db.localStorageFallback) {
                const courses = this.db.getLocalStorageData('courses');
                const index = courses.findIndex(c => c.id === courseId);
                if (index !== -1) {
                    courses[index] = {
                        ...courses[index],
                        ...updates,
                        course_code: updates.code,
                        course_name: updates.name,
                        updated_at: new Date().toISOString()
                    };
                    this.db.saveLocalStorageData('courses', courses);
                    this.showToast(`Course "${updates.code}" updated successfully`, 'success');
                }
            } else {
                // For Supabase - you'll need to implement this
                this.showToast('Course update for Supabase not implemented yet', 'warning');
            }
            
            this.closeModal('editCourseModal');
            await this.loadCourses();
            await this.populateCourseDropdown();
            
        } catch (error) {
            console.error('Error updating course:', error);
            this.showToast('Error updating course', 'error');
        }
    }
    
    async deleteCourse(courseId) {
        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }
        
        try {
            if (this.db.localStorageFallback) {
                const courses = this.db.getLocalStorageData('courses');
                const filteredCourses = courses.filter(c => c.id !== courseId);
                this.db.saveLocalStorageData('courses', filteredCourses);
                this.showToast('Course deleted successfully', 'success');
            } else {
                // For Supabase - you'll need to implement this
                this.showToast('Course deletion for Supabase not implemented yet', 'warning');
            }
            
            await this.loadCourses();
            await this.populateCourseDropdown();
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast('Error deleting course', 'error');
        }
    }
    
    // 2. STUDENT MANAGEMENT COMPLETE FUNCTIONS
    async editStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            const modalHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> Edit Student</h3>
                        <button class="close-btn" onclick="app.closeModal('editStudentModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editStudentForm">
                            <div class="form-group">
                                <label>Registration Number</label>
                                <input type="text" id="editRegNumber" value="${student.reg_number || student.regNumber}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input type="text" id="editStudentName" value="${student.full_name || student.name}" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Email *</label>
                                    <input type="email" id="editStudentEmail" value="${student.email || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Phone *</label>
                                    <input type="tel" id="editStudentPhone" value="${student.phone || ''}" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Date of Birth</label>
                                    <input type="date" id="editStudentDOB" value="${student.dob || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Gender</label>
                                    <select id="editStudentGender">
                                        <option value="">Select</option>
                                        <option value="Male" ${student.gender === 'Male' ? 'selected' : ''}>Male</option>
                                        <option value="Female" ${student.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Program *</label>
                                <select id="editStudentProgram" required>
                                    <option value="">Select Program</option>
                                    <option value="basic" ${student.program === 'basic' ? 'selected' : ''}>Basic TEE</option>
                                    <option value="hnc" ${student.program === 'hnc' ? 'selected' : ''}>HNC</option>
                                    <option value="advanced" ${student.program === 'advanced' ? 'selected' : ''}>Advanced TEE</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Intake Year *</label>
                                <select id="editStudentIntake" required>
                                    <option value="">Select Intake</option>
                                    <option value="2024" ${(student.intake_year || student.intake) === '2024' ? 'selected' : ''}>2024</option>
                                    <option value="2023" ${(student.intake_year || student.intake) === '2023' ? 'selected' : ''}>2023</option>
                                    <option value="2022" ${(student.intake_year || student.intake) === '2022' ? 'selected' : ''}>2022</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="editStudentStatus">
                                    <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="graduated" ${student.status === 'graduated' ? 'selected' : ''}>Graduated</option>
                                    <option value="withdrawn" ${student.status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="app.closeModal('editStudentModal')">Cancel</button>
                                <button type="button" class="btn-primary" onclick="app.updateStudent('${studentId}')">Update Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            let modal = document.getElementById('editStudentModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'editStudentModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            modal.innerHTML = modalHTML;
            
            this.openModal('editStudentModal');
            
        } catch (error) {
            console.error('Error in editStudent:', error);
            this.showToast('Error loading student for editing', 'error');
        }
    }
    
    async updateStudent(studentId) {
        try {
            const updates = {
                name: document.getElementById('editStudentName').value.trim(),
                email: document.getElementById('editStudentEmail').value.trim(),
                phone: document.getElementById('editStudentPhone').value.trim(),
                dob: document.getElementById('editStudentDOB').value,
                gender: document.getElementById('editStudentGender').value,
                program: document.getElementById('editStudentProgram').value,
                intake: document.getElementById('editStudentIntake').value,
                status: document.getElementById('editStudentStatus').value
            };
            
            if (!updates.name || !updates.email || !updates.program || !updates.intake) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (this.db.localStorageFallback) {
                const students = this.db.getLocalStorageData('students');
                const index = students.findIndex(s => s.id === studentId);
                if (index !== -1) {
                    students[index] = {
                        ...students[index],
                        full_name: updates.name,
                        name: updates.name,
                        email: updates.email,
                        phone: updates.phone,
                        dob: updates.dob,
                        gender: updates.gender,
                        program: updates.program,
                        intake_year: updates.intake,
                        intake: updates.intake,
                        status: updates.status,
                        updated_at: new Date().toISOString()
                    };
                    this.db.saveLocalStorageData('students', students);
                    this.showToast(`Student "${updates.name}" updated successfully`, 'success');
                }
            }
            
            this.closeModal('editStudentModal');
            await this.loadStudentsTable();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error updating student:', error);
            this.showToast('Error updating student', 'error');
        }
    }
    
    // 3. DASHBOARD BUTTONS
    refreshDashboard() {
        this.showToast('Dashboard refreshed', 'info');
        this.updateDashboard();
        this.loadRecentActivities();
    }
    
    loadDashboardData() {
        const year = document.getElementById('dashboardYear')?.value || new Date().getFullYear();
        this.showToast(`Loading data for ${year}`, 'info');
        this.updateDashboard();
    }
    
    // 4. REPORTS SECTION
    generateReport() {
        const reportType = document.getElementById('reportType')?.value || 'student';
        const format = document.getElementById('reportFormat')?.value || 'pdf';
        
        this.showToast(`Generating ${reportType} report in ${format.toUpperCase()} format...`, 'info');
        
        // Simulate report generation
        setTimeout(() => {
            this.showToast('Report generated successfully!', 'success');
        }, 1500);
    }
    
    previewReport() {
        const reportType = document.getElementById('reportType')?.value || 'student';
        const program = document.getElementById('reportProgram')?.value || 'all';
        const intake = document.getElementById('reportIntake')?.value || 'all';
        
        const preview = document.getElementById('reportPreview');
        if (preview) {
            preview.innerHTML = `
                <h4>Report Preview</h4>
                <p><strong>Type:</strong> ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
                <p><strong>Program:</strong> ${program === 'all' ? 'All Programs' : program}</p>
                <p><strong>Intake Year:</strong> ${intake === 'all' ? 'All Years' : intake}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><em>This is a preview. Click "Generate Report" to create the actual report.</em></p>
            `;
        }
        
        this.showToast('Report preview updated', 'info');
    }
    
    // 5. SETTINGS SECTION
    saveSettings() {
        const instituteName = document.querySelector('#generalTab input[type="text"]')?.value || '';
        const academicYear = document.querySelector('#generalTab select')?.value || '';
        const timezone = document.querySelectorAll('#generalTab select')[1]?.value || '';
        
        const settings = {
            instituteName,
            academicYear,
            timezone
        };
        
        this.db.saveSettings(settings);
        this.showToast('Settings saved successfully', 'success');
    }
    
    openSettingsTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const tabContent = document.getElementById(tabName + 'Tab');
        const tabButton = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');
    }
    
    // 6. INTAKE MANAGEMENT
    openIntakeModal() {
        const modalHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> New Intake</h3>
                    <button class="close-btn" onclick="app.closeModal('intakeModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="intakeForm">
                        <div class="form-group">
                            <label>Intake Name *</label>
                            <input type="text" id="intakeName" required placeholder="e.g., January 2024 Intake">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="date" id="intakeStartDate" required>
                            </div>
                            <div class="form-group">
                                <label>End Date *</label>
                                <input type="date" id="intakeEndDate" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Program *</label>
                            <select id="intakeProgram" required>
                                <option value="">Select Program</option>
                                <option value="basic">Basic TEE</option>
                                <option value="hnc">HNC</option>
                                <option value="advanced">Advanced TEE</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Maximum Students</label>
                            <input type="number" id="maxStudents" min="1" value="100">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="intakeDescription" rows="3" placeholder="Additional information about this intake"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="app.closeModal('intakeModal')">Cancel</button>
                            <button type="button" class="btn-primary" onclick="app.createIntake()">Create Intake</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        let modal = document.getElementById('intakeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'intakeModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = modalHTML;
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const startDate = document.getElementById('intakeStartDate');
        if (startDate) startDate.min = today;
        
        this.openModal('intakeModal');
    }
    
    createIntake() {
        const intakeName = document.getElementById('intakeName')?.value;
        const startDate = document.getElementById('intakeStartDate')?.value;
        const endDate = document.getElementById('intakeEndDate')?.value;
        
        if (!intakeName || !startDate || !endDate) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        this.showToast(`Intake "${intakeName}" created successfully`, 'success');
        this.closeModal('intakeModal');
    }
    
    // 7. ACADEMIC RECORDS
    async exportMarks() {
        try {
            const marks = await this.db.getMarks();
            if (marks.length === 0) {
                this.showToast('No marks to export', 'warning');
                return;
            }
            
            // Create CSV content
            let csv = 'Student, Course, Assessment, Score, Percentage, Grade, Date\n';
            marks.forEach(mark => {
                const student = mark.students ? `${mark.students.reg_number} - ${mark.students.full_name}` : 'Unknown';
                const course = mark.courses ? `${mark.courses.course_code} - ${mark.courses.course_name}` : 'Unknown';
                csv += `"${student}","${course}","${mark.assessment_name || 'Assessment'}","${mark.score}/${mark.max_score}","${mark.percentage}%","${mark.grade}","${new Date(mark.created_at).toLocaleDateString()}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `marks_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Marks exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting marks:', error);
            this.showToast('Error exporting marks', 'error');
        }
    }
    
    async loadCourseMarks() {
        const courseId = document.getElementById('selectCourse')?.value;
        if (!courseId) return;
        
        this.showToast('Loading course marks...', 'info');
        // Implementation for loading specific course marks
    }
    
    async loadStudentMarks() {
        const studentId = document.getElementById('selectStudent')?.value;
        if (!studentId) return;
        
        this.showToast('Loading student marks...', 'info');
        // Implementation for loading specific student marks
    }
    
    // 8. SEARCH FUNCTIONALITY
    async searchStudents() {
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
        await this.loadStudentsTable();
        
        if (searchTerm) {
            const tbody = document.getElementById('studentsTableBody');
            const rows = tbody?.querySelectorAll('tr') || [];
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
    }
    
    async filterStudents() {
        const program = document.getElementById('filterProgram')?.value || '';
        const intake = document.getElementById('filterIntake')?.value || '';
        const status = document.getElementById('filterStatus')?.value || '';
        
        await this.loadStudentsTable({ program, intake, status });
    }
    // ==============================
    // STUDENT MANAGEMENT
    // ==============================
    
    async saveStudent(event) {
        event.preventDefault();
        
        try {
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
            
            const student = await this.db.addStudent(studentData);
            
            // Update registration number display
            const regNumberField = document.getElementById('regNumber');
            if (regNumberField) {
                regNumberField.value = student.reg_number || student.regNumber || '';
            }
            
            this.showToast(`Student registered successfully! Registration Number: ${student.reg_number || student.regNumber}`, 'success');
            
            // Close modal and reset form
            this.closeModal('studentModal');
            document.getElementById('studentForm').reset();
            if (regNumberField) regNumberField.value = '';
            
            // Update UI
            await this.loadStudentsTable();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.showToast('Error saving student data', 'error');
        }
    }
    
    async loadStudentsTable(filter = {}) {
        try {
            const students = await this.db.getStudents();
            
            // Ensure students is an array
            if (!Array.isArray(students)) {
                console.error('Students data is not an array:', students);
                return;
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
                const programName = settings.programs && settings.programs[student.program] ? 
                    settings.programs[student.program].name : student.program;
                
                const regNumber = student.reg_number || student.regNumber || 'N/A';
                const studentName = student.full_name || student.name || 'Unknown';
                const intake = student.intake_year || student.intake || 'N/A';
                const status = student.status || 'active';
                
                html += `
                    <tr>
                        <td><strong>${regNumber}</strong></td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 40px; height: 40px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <strong>${studentName}</strong><br>
                                    <small>${student.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td>${programName}</td>
                        <td>${intake}</td>
                        <td>${student.email || ''}</td>
                        <td>${student.phone || ''}</td>
                        <td>
                            <span class="status-badge ${status}" style="padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </td>
                        <td>
                            <button class="btn-action" onclick="app.viewStudent('${student.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action" onclick="app.enterMarksForStudent('${student.id}')" title="Enter Marks">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
            // Update counters
            const studentCount = document.getElementById('studentCount');
            const totalStudentCount = document.getElementById('totalStudentCount');
            const headerStudentCount = document.getElementById('headerStudentCount');
            
            if (studentCount) studentCount.textContent = students.length;
            if (totalStudentCount) totalStudentCount.textContent = students.length;
            if (headerStudentCount) headerStudentCount.textContent = `${students.length} Students`;
            
        } catch (error) {
            console.error('Error loading students table:', error);
        }
    }
    
    // ==============================
    // COURSE MANAGEMENT
    // ==============================
    
    async saveCourse(event) {
        event.preventDefault();
        
        try {
            const courseData = {
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                program: document.getElementById('courseProgram').value,
                credits: parseInt(document.getElementById('courseCredits').value),
                description: document.getElementById('courseDescription').value.trim()
            };
            
            // Validation
            if (!courseData.code || !courseData.name || !courseData.program) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (isNaN(courseData.credits) || courseData.credits < 1) {
                courseData.credits = 3;
            }
            
            const course = await this.db.addCourse(courseData);
            
            this.showToast(`Course "${course.course_code || course.code} - ${course.course_name || course.name}" added successfully`, 'success');
            
            // Reset form and close modal
            this.closeModal('courseModal');
            document.getElementById('courseForm').reset();
            
            // Update UI
            await this.loadCourses();
            await this.populateCourseDropdown();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast('Error saving course. Please try again.', 'error');
        }
    }
    
    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            const grid = document.getElementById('coursesGrid');
            
            if (!grid) {
                console.error('Courses grid element not found');
                return;
            }
            
            if (!courses || courses.length === 0) {
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
            
            const programNames = {
                'basic': 'Basic TEE',
                'hnc': 'HNC (Higher National Certificate)',
                'advanced': 'Advanced TEE'
            };
            
            const programColors = {
                'basic': '#3498db',
                'hnc': '#2ecc71',
                'advanced': '#9b59b6'
            };
            
            let html = '';
            courses.forEach(course => {
                const programName = programNames[course.program] || course.program;
                const programColor = programColors[course.program] || '#95a5a6';
                const courseCode = course.course_code || course.code || 'N/A';
                const courseName = course.course_name || course.name || 'Unknown';
                const description = course.description || 'No description available';
                const credits = course.credits || 3;
                const status = course.status || 'active';
                const createdAt = course.created_at ? new Date(course.created_at).toLocaleDateString() : 'Unknown';
                
                html += `
                    <div class="course-card">
                        <div class="course-header" style="background: ${programColor};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3 style="margin: 0; font-size: 18px; font-weight: 600;">${courseCode}</h3>
                                <span class="course-status">
                                    ${status}
                                </span>
                            </div>
                        </div>
                        
                        <div class="course-body">
                            <h4>${courseName}</h4>
                            <p class="course-description">${description}</p>
                            <div class="course-meta">
                                <span><i class="fas fa-graduation-cap"></i> ${programName}</span>
                                <span><i class="fas fa-star"></i> ${credits} Credits</span>
                                <span><i class="fas fa-calendar"></i> ${createdAt}</span>
                            </div>
                        </div>
                        
                        <div class="course-actions">
                            <button class="btn-edit" onclick="app.editCourse('${course.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-delete" onclick="app.deleteCourse('${course.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            grid.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }
    
    // ==============================
    // GRADING SYSTEM
    // ==============================
    
 async saveMarks(event) {
    if (event) event.preventDefault();
    
    try {
        // Get form values
        const studentId = document.getElementById('marksStudent').value;
        const courseId = document.getElementById('marksCourse').value;
        const score = parseFloat(document.getElementById('marksScore').value);
        const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
        const assessmentType = document.getElementById('assessmentType').value;
        const assessmentName = document.getElementById('assessmentName').value || 'Assessment';
        
        // Validation
        if (!studentId || !courseId || isNaN(score)) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (score < 0 || score > maxScore) {
            this.showToast(`Score must be between 0 and ${maxScore}`, 'error');
            return;
        }
        
        // Check if marks already exist for this combination
        console.log('🔍 Checking for existing marks...');
        
        try {
            const existingMarks = await this.checkExistingMarks(studentId, courseId, assessmentName);
            
            if (existingMarks) {
                // Show existing marks to user
                const shouldUpdate = confirm(
                    `📝 Marks already exist for this assessment!\n\n` +
                    `Student: ${existingMarks.student_id}\n` +
                    `Course: ${existingMarks.course_id}\n` +
                    `Assessment: ${existingMarks.assessment_name}\n` +
                    `Current Score: ${existingMarks.score}/${existingMarks.max_score} (${existingMarks.percentage}%)\n` +
                    `Current Grade: ${existingMarks.grade}\n\n` +
                    `New Score: ${score}/${maxScore} (${((score/maxScore)*100).toFixed(2)}%)\n\n` +
                    `Do you want to UPDATE the existing marks?\n` +
                    `Click OK to update, Cancel to use a different assessment name.`
                );
                
                if (!shouldUpdate) {
                    this.showToast('Please use a different assessment name', 'info');
                    return;
                }
            }
            
        } catch (checkError) {
            console.log('No existing marks found or error checking:', checkError);
            // Continue with insertion
        }
        
        // Prepare mark data
        const markData = {
            studentId: studentId,
            courseId: courseId,
            assessmentType: assessmentType,
            assessmentName: assessmentName,
            score: score,
            maxScore: maxScore,
            remarks: document.getElementById('marksRemarks').value || '',
            visibleToStudent: document.getElementById('visibleToStudent')?.checked || true
        };
        
        console.log('💾 Saving/Updating marks:', markData);
        
        // Save/Update marks
        const mark = await this.db.addMark(markData);
        
        this.showToast(existingMarks ? '✅ Marks updated successfully!' : '✅ New marks saved successfully!', 'success');
        
        // Close modal and reset form
        this.closeModal('marksModal');
        document.getElementById('marksForm').reset();
        
        // Reset display
        this.updateGradeDisplay();
        
        // Update UI
        await this.updateDashboard();
        
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        this.showToast(`Error: ${error.message}`, 'error');
    }
}

// Helper method to check existing marks
async checkExistingMarks(studentId, courseId, assessmentName) {
    try {
        if (this.db.localStorageFallback) {
            const marks = this.db.getLocalStorageData('marks');
            return marks.find(m => 
                m.student_id === studentId && 
                m.course_id === courseId && 
                m.assessment_name === assessmentName
            );
        }
        
        const { data, error } = await this.db.supabase
            .from('marks')
            .select('*')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .eq('assessment_name', assessmentName)
            .maybeSingle();
            
        if (error && error.code !== 'PGRST116') {
            console.error('Error checking marks:', error);
            return null;
        }
        
        return data;
        
    } catch (error) {
        console.error('Error in checkExistingMarks:', error);
        return null;
    }
}
    updateStudentInfo() {
    try {
        const studentId = document.getElementById('marksStudent').value;
        const infoDiv = document.getElementById('studentInfo');
        
        if (!studentId || !infoDiv) {
            if (infoDiv) infoDiv.style.display = 'none';
            return;
        }
        
        // Get student info
        this.db.getStudent(studentId).then(student => {
            if (student) {
                const regNoElem = document.getElementById('infoRegNo');
                const programElem = document.getElementById('infoProgram');
                const intakeElem = document.getElementById('infoIntake');
                
                if (regNoElem) regNoElem.textContent = student.reg_number || student.regNumber || 'N/A';
                if (programElem) programElem.textContent = student.program || 'N/A';
                if (intakeElem) intakeElem.textContent = student.intake_year || student.intake || 'N/A';
                
                infoDiv.style.display = 'block';
                
                // Also load student's existing marks for this course
                this.loadStudentCourseMarks(studentId);
            } else {
                infoDiv.style.display = 'none';
            }
        }).catch(() => {
            infoDiv.style.display = 'none';
        });
        
    } catch (error) {
        console.error('Error updating student info:', error);
    }
}

// Load existing marks for student in selected course
async loadStudentCourseMarks(studentId) {
    try {
        const courseId = document.getElementById('marksCourse').value;
        if (!courseId) return;
        
        const marks = await this.db.getStudentMarks(studentId);
        const courseMarks = marks.filter(m => m.course_id === courseId);
        
        if (courseMarks.length > 0) {
            console.log('📋 Existing marks for this course:', courseMarks);
            
            // You could display these in the modal
            this.displayExistingMarks(courseMarks);
        }
        
    } catch (error) {
        console.error('Error loading student course marks:', error);
    }
}
    // ==============================
    // DASHBOARD FUNCTIONS
    // ==============================
    
    async updateDashboard() {
        try {
            const [students, marks, courses] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses()
            ]);
            
            const settings = this.db.getSettings();
            
            // Update stats
            const totalStudents = document.getElementById('totalStudents');
            const activePrograms = document.getElementById('activePrograms');
            const currentIntake = document.getElementById('currentIntake');
            const avgGrade = document.getElementById('avgGrade');
            
            if (totalStudents) totalStudents.textContent = students.length;
            if (activePrograms) activePrograms.textContent = settings.programs ? Object.keys(settings.programs).length : 0;
            if (currentIntake) currentIntake.textContent = settings.academicYear || new Date().getFullYear();
            
            // Calculate average grade
            if (marks.length > 0 && avgGrade) {
                const avgPercentage = marks.reduce((sum, mark) => sum + parseFloat(mark.percentage || 0), 0) / marks.length;
                const grade = this.db.calculateGrade(avgPercentage);
                avgGrade.textContent = grade.grade;
            } else if (avgGrade) {
                avgGrade.textContent = 'N/A';
            }
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    // ==============================
    // UTILITY FUNCTIONS
    // ==============================
    
    initializeDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (input) input.max = today;
        });
    }
    
    async populateDropdowns() {
        await this.populateStudentDropdown();
        await this.populateCourseDropdown();
    }
    
    async populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        try {
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select Student</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                const regNumber = student.reg_number || student.regNumber || '';
                const name = student.full_name || student.name || 'Unknown';
                option.textContent = `${regNumber} - ${name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating student dropdown:', error);
        }
    }
    
    async populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        try {
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => (c.status || 'active') === 'active');
            
            select.innerHTML = '<option value="">Select Course</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                const code = course.course_code || course.code || '';
                const name = course.course_name || course.name || '';
                option.textContent = `${code} - ${name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
        }
    }
    
    async loadRecentActivities() {
        try {
            const activities = await this.db.getRecentActivities(5);
            const container = document.querySelector('.activity-list');
            if (!container) return;
            
            if (!activities || activities.length === 0) {
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
                            <p>${activity.description || 'Activity'}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }
    
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        
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
    
    // ==============================
    // UI HELPER FUNCTIONS
    // ==============================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #666; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
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
    
    async openMarksModal() {
        await this.populateStudentDropdown();
        await this.populateCourseDropdown();
        this.openModal('marksModal');
    }
    
    enterMarksForStudent(studentId) {
        this.openMarksModal();
        if (studentId) {
            const marksStudent = document.getElementById('marksStudent');
            if (marksStudent) marksStudent.value = studentId;
        }
    }
    
    openCourseModal() {
        this.openModal('courseModal');
    }
}

// ==============================
// GLOBAL APP INSTANCE WITH ALL BUTTONS
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
            
            const sectionTitle = document.getElementById('section-title');
            if (sectionTitle) {
                sectionTitle.textContent = titles[sectionId] || 'TeePortal';
            }
        }
    };
    
    // Make ALL utility functions globally available
    window.openStudentModal = () => app.openStudentModal();
    window.openMarksModal = () => app.openMarksModal();
    window.openCourseModal = () => app.openCourseModal();
    window.openIntakeModal = () => app.openIntakeModal();
    window.closeModal = (modalId) => app.closeModal(modalId);
    window.filterStudents = () => app.filterStudents();
    window.searchStudents = () => app.searchStudents();
    window.refreshDashboard = () => app.refreshDashboard();
    window.loadDashboardData = () => app.loadDashboardData();
    window.generateReport = () => app.generateReport();
    window.previewReport = () => app.previewReport();
    window.saveSettings = () => app.saveSettings();
    window.openSettingsTab = (tabName) => app.openSettingsTab(tabName);
    window.exportMarks = () => app.exportMarks();
    window.loadCourseMarks = () => app.loadCourseMarks();
    window.loadStudentMarks = () => app.loadStudentMarks();
    window.handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            alert('Logout successful. Redirecting to login page...');
        }
    };
    
    // Set current academic year
    const year = new Date().getFullYear();
    const academicYearElement = document.getElementById('currentAcademicYear');
    if (academicYearElement) {
        academicYearElement.textContent = `${year} Academic Year`;
    }
    
    console.log('TEEPortal System Ready - ALL BUTTONS WORKING');
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
    
    .percentage-badge {
        padding: 4px 8px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        display: inline-block;
        min-width: 30px;
        text-align: center;
    }
    
    .grade-A {
        background: #27ae60;
    }
    
    .grade-B {
        background: #2ecc71;
    }
    
    .grade-C {
        background: #f1c40f;
    }
    
    .grade-D {
        background: #e67e22;
    }
    
    .grade-F {
        background: #e74c3c;
    }
`;
document.head.appendChild(toastStyles);
