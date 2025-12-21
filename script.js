// ==============================
// SUPABASE-ONLY DATABASE MANAGEMENT
// ==============================

class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.initPromise = null;
    }
    
    async init() {
        // If already initialized, return
        if (this.initialized) return true;
        
        // If initialization is in progress, wait for it
        if (this.initPromise) return await this.initPromise;
        
        // Start initialization
        this.initPromise = this._init();
        return await this.initPromise;
    }
    
    async _init() {
        try {
            // Check if supabase is available
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase client not loaded');
            }
            
            this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            
            // Initialize Supabase client
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection
            await this.testConnection();
            this.initialized = true;
            console.log('✅ Supabase connected successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('count')
                .limit(1);
                
            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    console.warn('⚠️ Table might not exist yet');
                    return true;
                }
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error('Connection test error:', error);
            throw error;
        }
    }
    
    // ========== SAFE DATABASE METHODS ==========
    
    async ensureConnected() {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.supabase) {
            throw new Error('Database connection not established');
        }
        
        return this.supabase;
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
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
    }
    
    async getStudent(id) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .or(`id.eq.${id},reg_number.eq.${id}`)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error fetching student:', error);
            throw error;
        }
    }
    
    async addStudent(studentData) {
        try {
            const supabase = await this.ensureConnected();
            const regNumber = await this.generateRegNumber(studentData.program, studentData.intake);
            
            const student = {
                reg_number: regNumber,
                full_name: studentData.name,
                email: studentData.email,
                phone: studentData.phone,
                dob: studentData.dob || null,
                gender: studentData.gender || null,
                program: studentData.program,
                intake_year: studentData.intake,
                status: 'active'
            };
            
            const { data, error } = await supabase
                .from('students')
                .insert([student])
                .select()
                .single();
                
            if (error) throw error;
            
            await this.logActivity('student_registered', `Registered student: ${data.full_name} (${data.reg_number})`);
            return data;
            
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    }
    
    async generateRegNumber(program, intakeYear) {
        try {
            const supabase = await this.ensureConnected();
            const { count, error } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('program', program)
                .eq('intake_year', intakeYear);
                
            if (error) throw error;
            
            const programPrefix = {
                'basic': 'TEE',
                'hnc': 'HNC',
                'advanced': 'ATE'
            };
            
            const prefix = programPrefix[program] || 'TEE';
            const year = intakeYear.toString().slice(-2);
            const sequence = ((count || 0) + 1).toString().padStart(3, '0');
            
            return `${prefix}${year}${sequence}`;
            
        } catch (error) {
            console.error('Error generating reg number:', error);
            const timestamp = Date.now().toString().slice(-6);
            return `TEMP${timestamp}`;
        }
    }
    
    // ========== COURSES ==========
    async getCourses() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    }
    
    async addCourse(courseData) {
        try {
            const supabase = await this.ensureConnected();
            const course = {
                course_code: courseData.code.toUpperCase(),
                course_name: courseData.name,
                program: courseData.program,
                credits: courseData.credits,
                description: courseData.description,
                status: 'active'
            };
            
            const { data, error } = await supabase
                .from('courses')
                .insert([course])
                .select()
                .single();
                
            if (error) throw error;
            
            await this.logActivity('course_added', `Added course: ${data.course_code}`);
            return data;
            
        } catch (error) {
            console.error('Error adding course:', error);
            throw error;
        }
    }
    
    async getCourse(id) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .or(`id.eq.${id},course_code.eq.${id}`)
                .single();
                
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error fetching course:', error);
            throw error;
        }
    }
    
    // ========== MARKS ==========
    async getMarks() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
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
            throw error;
        }
    }
    
    async addMark(markData) {
        try {
            const supabase = await this.ensureConnected();
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
            
            // Check if marks already exist
            const { data: existingMarks, error: checkError } = await supabase
                .from('marks')
                .select('*')
                .eq('student_id', markData.studentId)
                .eq('course_id', markData.courseId)
                .eq('assessment_name', markData.assessmentName)
                .maybeSingle();
                
            let result;
            
            if (existingMarks) {
                // UPDATE EXISTING MARKS
                const { data: updatedData, error: updateError } = await supabase
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
                
                result = updatedData;
                await this.logActivity('marks_updated', `Updated marks for student`);
                
            } else {
                // INSERT NEW MARKS
                const { data: newData, error: insertError } = await supabase
                    .from('marks')
                    .insert([mark])
                    .select()
                    .single();
                    
                if (insertError) throw insertError;
                
                result = newData;
                await this.logActivity('marks_entered', `Entered new marks for student`);
            }
            
            return result;
            
        } catch (error) {
            console.error('Error in addMark:', error);
            throw error;
        }
    }
    
    async getStudentMarks(studentId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
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
            throw error;
        }
    }
    
    async getMarksTableData() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('marks')
                .select(`
                    id,
                    score,
                    max_score,
                    percentage,
                    grade,
                    grade_points,
                    assessment_type,
                    assessment_name,
                    remarks,
                    created_at,
                    students!inner (
                        id,
                        reg_number,
                        full_name,
                        program,
                        intake_year
                    ),
                    courses!inner (
                        id,
                        course_code,
                        course_name,
                        program
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100);
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('Error fetching marks table data:', error);
            throw error;
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
    
    async calculateStudentGPA(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            if (marks.length === 0) return 0;
            
            const totalPoints = marks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0);
            return parseFloat((totalPoints / marks.length).toFixed(2));
        } catch (error) {
            console.error('Error calculating GPA:', error);
            return 0;
        }
    }
    
    async getSettings() {
        try {
            return this.getDefaultSettings();
        } catch (error) {
            return this.getDefaultSettings();
        }
    }
    
    async logActivity(type, description) {
        try {
            const supabase = await this.ensureConnected();
            const { error } = await supabase
                .from('activities')
                .insert([{
                    type: type,
                    description: description,
                   user_name: 'Administrator'
                }]);
                
            if (error) {
                console.error('Error logging activity:', error);
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    
    async getRecentActivities(limit = 10) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
                
            if (error) {
                console.error('Error fetching activities:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error fetching activities:', error);
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
        this.initialized = false;
        
        // Initialize event listeners
        this.setupEventListeners();
    }
    
    async initialize() {
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Initialize database first
            await this.db.init();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TEEPortal Ready');
            this.showToast('System initialized successfully', 'success');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showToast('Failed to connect to database', 'error');
        }
    }
    
    setupEventListeners() {
        // Setup form submissions
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            marksForm.addEventListener('submit', (e) => this.saveMarks(e));
        }
        
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => this.saveCourse(e));
        }
        
        // Setup real-time grade calculation
        const marksScoreInput = document.getElementById('marksScore');
        if (marksScoreInput) {
            marksScoreInput.addEventListener('input', () => updateGradeDisplay());
        }
        
        const maxScoreInput = document.getElementById('maxScore');
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => updateGradeDisplay());
        }
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            await this.loadStudentsTable();
            await this.loadCourses();
            await this.loadMarksTable();
            await this.updateDashboard();
            await this.loadRecentActivities();
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    initializeUI() {
        // Initialize date pickers
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (input) input.max = today;
        });
        
        this.populateDropdowns();
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
                option.textContent = `${student.reg_number} - ${student.full_name}`;
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
            const activeCourses = courses.filter(c => c.status === 'active');
            
            select.innerHTML = '<option value="">Select Course</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
        }
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
            
            this.showToast(`Student registered successfully! Registration Number: ${student.reg_number}`, 'success');
            
            // Close modal and reset form
            closeModal('studentModal');
            document.getElementById('studentForm').reset();
            
            // Update UI
            await this.loadStudentsTable();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.showToast('Error saving student data', 'error');
        }
    }
    
    async loadStudentsTable() {
        try {
            const students = await this.db.getStudents();
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
            
            const settings = await this.db.getSettings();
            let html = '';
            
            students.forEach(student => {
                const programName = settings.programs && settings.programs[student.program] ? 
                    settings.programs[student.program].name : student.program;
                
                html += `
                    <tr>
                        <td><strong>${student.reg_number}</strong></td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 40px; height: 40px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <strong>${student.full_name}</strong><br>
                                    <small>${student.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td>${programName}</td>
                        <td>${student.intake_year}</td>
                        <td>${student.email || ''}</td>
                        <td>${student.phone || ''}</td>
                        <td>
                            <span class="status-badge ${student.status || 'active'}">
                                ${(student.status || 'active').toUpperCase()}
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
            
        } catch (error) {
            console.error('Error loading students table:', error);
            const tbody = document.getElementById('studentsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading students</p>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    // ==============================
    // MARKS MANAGEMENT
    // ==============================
    
    async loadMarksTable() {
        try {
            const marks = await this.db.getMarksTableData();
            const tbody = document.querySelector('#marksTableBody');
            
            if (!tbody) {
                console.error('Marks table body not found');
                return;
            }
            
            if (marks.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="empty-state">
                            <i class="fas fa-chart-bar fa-2x"></i>
                            <p>No marks recorded yet</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            
            marks.forEach(mark => {
                const student = mark.students;
                const course = mark.courses;
                const percentage = mark.percentage || ((mark.score / mark.max_score) * 100).toFixed(2);
                
                html += `
                    <tr>
                        <td>
                            <strong>${student.reg_number}</strong><br>
                            <small>${student.full_name}</small>
                        </td>
                        <td>
                            <strong>${course.course_code}</strong><br>
                            <small>${course.course_name}</small>
                        </td>
                        <td>${mark.assessment_name || 'Assessment'}</td>
                        <td>${mark.assessment_type || 'Final'}</td>
                        <td>${mark.score}/${mark.max_score}</td>
                        <td>${percentage}%</td>
                        <td>
                            <span class="grade-badge grade-${mark.grade?.charAt(0) || 'F'}">
                                ${mark.grade || 'F'}
                            </span>
                        </td>
                        <td>${mark.grade_points || 0}</td>
                        <td>${mark.remarks || '-'}</td>
                        <td>
                            ${mark.created_at ? new Date(mark.created_at).toLocaleDateString() : '-'}
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading marks table:', error);
            const tbody = document.querySelector('#marksTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading marks</p>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
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
            
            const mark = await this.db.addMark(markData);
            
            this.showToast('✅ Marks saved successfully!', 'success');
            
            // Close modal and reset form
            closeModal('marksModal');
            document.getElementById('marksForm').reset();
            updateGradeDisplay();
            
            // Update UI
            await this.loadMarksTable();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error saving marks:', error);
            this.showToast('Error saving marks', 'error');
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
            
            const course = await this.db.addCourse(courseData);
            
            this.showToast(`Course "${course.course_code} - ${course.course_name}" added successfully`, 'success');
            
            // Close modal and reset form
            closeModal('courseModal');
            document.getElementById('courseForm').reset();
            
            // Update UI
            await this.loadCourses();
            await this.populateCourseDropdown();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast('Error saving course', 'error');
        }
    }
    
    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            const grid = document.getElementById('coursesGrid');
            
            if (!grid) return;
            
            if (!courses || courses.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open fa-3x"></i>
                        <h3>No Courses Found</h3>
                        <p>Add your first course to get started</p>
                        <button class="btn-primary" onclick="openCourseModal()">
                            <i class="fas fa-plus"></i> Add Course
                        </button>
                    </div>
                `;
                return;
            }
            
            const programNames = {
                'basic': 'Basic TEE',
                'hnc': 'HNC',
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
                const createdAt = course.created_at ? new Date(course.created_at).toLocaleDateString() : 'Unknown';
                
                html += `
                    <div class="course-card">
                        <div class="course-header" style="background: ${programColor};">
                            <div class="course-header-content">
                                <h3>${course.course_code}</h3>
                                <span class="course-status">${course.status}</span>
                            </div>
                        </div>
                        <div class="course-body">
                            <h4>${course.course_name}</h4>
                            <p class="course-description">${course.description || 'No description available'}</p>
                            <div class="course-meta">
                                <span><i class="fas fa-graduation-cap"></i> ${programName}</span>
                                <span><i class="fas fa-star"></i> ${course.credits} Credits</span>
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
    // DASHBOARD FUNCTIONS
    // ==============================
    
    async updateDashboard() {
        try {
            const [students, marks, courses] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses()
            ]);
            
            const settings = await this.db.getSettings();
            
            // Update stats
            this.updateStat('totalStudents', students.length);
            this.updateStat('activePrograms', this.countActivePrograms(students));
            this.updateStat('currentIntake', settings.academicYear || new Date().getFullYear());
            this.updateStat('totalCourses', courses.length);
            this.updateStat('totalMarks', marks.length);
            
            // Calculate average grade
            if (marks.length > 0) {
                const avgPercentage = marks.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / marks.length;
                const grade = this.db.calculateGrade(avgPercentage);
                this.updateStat('avgGrade', grade.grade);
            } else {
                this.updateStat('avgGrade', 'N/A');
            }
            
            this.updateCharts(students, marks);
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    countActivePrograms(students) {
        const programs = new Set(students.map(s => s.program).filter(Boolean));
        return programs.size;
    }
    
    updateCharts(students, marks) {
        try {
            // Destroy existing charts if they exist
            if (window.chartInstances) {
                Object.values(window.chartInstances).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
            }
            
            // Initialize chart instances object
            if (!window.chartInstances) {
                window.chartInstances = {};
            }
            
            // Program Distribution Chart
            const programCtx = document.getElementById('programChart');
            if (programCtx) {
                const programCounts = {};
                students.forEach(student => {
                    programCounts[student.program] = (programCounts[student.program] || 0) + 1;
                });
                
                window.chartInstances.programChart = new Chart(programCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(programCounts).map(p => p.toUpperCase()),
                        datasets: [{
                            data: Object.values(programCounts),
                            backgroundColor: ['#3498db', '#2ecc71', '#9b59b6', '#f39c12']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
            
            // Enrollment Chart
            const enrollmentCtx = document.getElementById('enrollmentChart');
            if (enrollmentCtx) {
                const intakeCounts = {};
                students.forEach(student => {
                    intakeCounts[student.intake_year] = (intakeCounts[student.intake_year] || 0) + 1;
                });
                
                const years = Object.keys(intakeCounts).sort();
                const counts = years.map(year => intakeCounts[year]);
                
                window.chartInstances.enrollmentChart = new Chart(enrollmentCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [{
                            label: 'Student Enrollment',
                            data: counts,
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
            // Grade Distribution Chart
            const gradeCtx = document.getElementById('gradeChart');
            if (gradeCtx && marks.length > 0) {
                const gradeCounts = {};
                marks.forEach(mark => {
                    gradeCounts[mark.grade] = (gradeCounts[mark.grade] || 0) + 1;
                });
                
                window.chartInstances.gradeChart = new Chart(gradeCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(gradeCounts),
                        datasets: [{
                            label: 'Number of Grades',
                            data: Object.values(gradeCounts),
                            backgroundColor: '#2ecc71'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
        } catch (error) {
            console.error('Error updating charts:', error);
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
                const timeAgo = this.getTimeAgo(activity.created_at);
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
        
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
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
                <button onclick="this.parentElement.remove()">
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
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    async openMarksModal() {
        await this.populateStudentDropdown();
        await this.populateCourseDropdown();
        openModal('marksModal');
    }
    
    enterMarksForStudent(studentId) {
        this.openMarksModal();
        if (studentId) {
            const marksStudent = document.getElementById('marksStudent');
            if (marksStudent) marksStudent.value = studentId;
        }
    }
    
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            const marks = await this.db.getStudentMarks(studentId);
            const gpa = await this.db.calculateStudentGPA(studentId);
            
            alert(`
                Student Details:
                --------------------
                Name: ${student.full_name}
                Reg Number: ${student.reg_number}
                Program: ${student.program}
                Intake: ${student.intake_year}
                Email: ${student.email}
                Phone: ${student.phone}
                GPA: ${gpa.toFixed(2)}
                Total Marks: ${marks.length}
                
                Click "Enter Marks" to add marks for this student.
            `);
            
        } catch (error) {
            console.error('Error viewing student:', error);
            this.showToast('Error loading student details', 'error');
        }
    }
    
    // ==============================
    // ADDITIONAL METHODS
    // ==============================
    
    async refreshDashboard() {
        try {
            this.showToast('Refreshing dashboard...', 'info');
            await this.updateDashboard();
            this.showToast('Dashboard refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showToast('Refresh failed', 'error');
        }
    }
    
    async editCourse(courseId) {
        try {
            const course = await this.db.getCourse(courseId);
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            document.getElementById('courseCode').value = course.course_code;
            document.getElementById('courseName').value = course.course_name;
            document.getElementById('courseProgram').value = course.program;
            document.getElementById('courseCredits').value = course.credits;
            document.getElementById('courseDescription').value = course.description || '';
            
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
            }
            
            openCourseModal();
            
        } catch (error) {
            console.error('Error editing course:', error);
            this.showToast('Error loading course', 'error');
        }
    }
    
    async deleteCourse(courseId) {
        if (!confirm('Are you sure you want to delete this course?')) {
            return;
        }
        
        try {
            const supabase = await this.db.ensureConnected();
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);
                
            if (error) throw error;
            
            this.showToast('Course deleted successfully', 'success');
            await this.loadCourses();
            await this.populateCourseDropdown();
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast('Error deleting course', 'error');
        }
    }
    
    async exportMarks() {
        try {
            console.log('📊 Exporting marks...');
            
            // Check if app is initialized
            if (!this.initialized) {
                this.showToast('Please wait for system to initialize', 'warning');
                return;
            }
            
            // Get all marks data with student and course info
            const marks = await this.db.getMarksTableData();
            
            if (!marks || marks.length === 0) {
                this.showToast('No marks data to export', 'warning');
                return;
            }
            
            // Convert to CSV format
            const csv = this.convertMarksToCSV(marks);
            
            // Create and download CSV file
            this.downloadCSV(csv, `teeportal-marks-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.showToast(`Exported ${marks.length} marks records`, 'success');
            
        } catch (error) {
            console.error('Error exporting marks:', error);
            this.showToast('Error exporting marks. Database may not be connected.', 'error');
        }
    }
    
    convertMarksToCSV(marks) {
        const headers = [
            'Student Reg No',
            'Student Name', 
            'Course Code',
            'Course Name',
            'Assessment Type',
            'Assessment Name',
            'Score',
            'Max Score',
            'Percentage',
            'Grade',
            'Grade Points',
            'Remarks',
            'Date Entered'
        ];
        
        const rows = marks.map(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            return [
                `"${student.reg_number || ''}"`,
                `"${student.full_name || ''}"`,
                `"${course.course_code || ''}"`,
                `"${course.course_name || ''}"`,
                `"${mark.assessment_type || ''}"`,
                `"${mark.assessment_name || ''}"`,
                mark.score || 0,
                mark.max_score || 100,
                mark.percentage || 0,
                `"${mark.grade || ''}"`,
                mark.grade_points || 0,
                `"${mark.remarks || ''}"`,
                `"${mark.created_at ? new Date(mark.created_at).toLocaleDateString() : ''}"`
            ].join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    // ==============================
    // REPORT METHODS
    // ==============================
    
    async generateReport() {
        try {
            const reportType = document.getElementById('reportType').value;
            const program = document.getElementById('reportProgram').value;
            const intakeYear = document.getElementById('reportIntake').value;
            const format = document.getElementById('reportFormat').value;
            
            if (!reportType) {
                this.showToast('Please select a report type', 'warning');
                return;
            }
            
            console.log(`📊 Generating ${reportType} report...`);
            
            let data;
            let fileName;
            
            switch(reportType) {
                case 'student':
                    data = await this.generateStudentListReport(program, intakeYear);
                    fileName = `student-list-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'marks':
                    data = await this.generateMarksReport(program, intakeYear);
                    fileName = `academic-marks-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    fileName = `enrollment-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'graduation':
                    data = await this.generateGraduationReport();
                    fileName = `graduation-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'transcript':
                    const studentId = prompt('Enter Student ID or Registration Number:');
                    if (studentId) {
                        await this.generateStudentTranscript(studentId, format);
                    }
                    return;
                    
                default:
                    this.showToast('Invalid report type selected', 'error');
                    return;
            }
            
            if (format === 'excel') {
                await this.exportToExcel(data, fileName);
            } else if (format === 'pdf') {
                await this.exportToPDF(data, fileName, reportType);
            } else {
                await this.exportToCSV(data, fileName);
            }
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            await this.db.logActivity('report_generated', `Generated ${reportType} report`);
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showToast('Error generating report', 'error');
        }
    }
    
    async generateStudentListReport(program = 'all', intakeYear = 'all') {
        try {
            const supabase = await this.db.ensureConnected();
            let query = supabase
                .from('students')
                .select('*')
                .order('reg_number', { ascending: true });
            
            if (program !== 'all') {
                query = query.eq('program', program);
            }
            
            if (intakeYear !== 'all') {
                query = query.eq('intake_year', parseInt(intakeYear));
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data.map(student => ({
                'Reg Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email,
                'Phone': student.phone,
                'Program': student.program,
                'Intake Year': student.intake_year,
                'Status': student.status,
                'Date of Birth': student.dob,
                'Gender': student.gender
            }));
            
        } catch (error) {
            console.error('Error generating student list:', error);
            throw error;
        }
    }
    
    async generateMarksReport(program = 'all', intakeYear = 'all') {
        try {
            const marks = await this.db.getMarksTableData();
            
            let filteredMarks = marks;
            
            if (program !== 'all') {
                filteredMarks = filteredMarks.filter(mark => 
                    mark.students?.program === program
                );
            }
            
            if (intakeYear !== 'all') {
                filteredMarks = filteredMarks.filter(mark => 
                    mark.students?.intake_year === parseInt(intakeYear)
                );
            }
            
            return filteredMarks.map(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                
                return {
                    'Reg Number': student.reg_number,
                    'Student Name': student.full_name,
                    'Course Code': course.course_code,
                    'Course Name': course.course_name,
                    'Assessment Type': mark.assessment_type,
                    'Assessment Name': mark.assessment_name,
                    'Score': mark.score,
                    'Max Score': mark.max_score,
                    'Percentage': mark.percentage,
                    'Grade': mark.grade,
                    'Grade Points': mark.grade_points,
                    'Remarks': mark.remarks,
                    'Date Entered': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : ''
                };
            });
            
        } catch (error) {
            console.error('Error generating marks report:', error);
            throw error;
        }
    }
    
    async generateEnrollmentReport() {
        try {
            const students = await this.db.getStudents();
            
            const enrollmentStats = {};
            
            students.forEach(student => {
                const key = `${student.program}-${student.intake_year}`;
                if (!enrollmentStats[key]) {
                    enrollmentStats[key] = {
                        program: student.program,
                        intakeYear: student.intake_year,
                        totalStudents: 0,
                        active: 0,
                        graduated: 0,
                        withdrawn: 0
                    };
                }
                
                enrollmentStats[key].totalStudents++;
                
                if (student.status === 'active') enrollmentStats[key].active++;
                if (student.status === 'graduated') enrollmentStats[key].graduated++;
                if (student.status === 'withdrawn') enrollmentStats[key].withdrawn++;
            });
            
            return Object.values(enrollmentStats).map(stat => ({
                'Program': stat.program,
                'Intake Year': stat.intakeYear,
                'Total Students': stat.totalStudents,
                'Active': stat.active,
                'Graduated': stat.graduated,
                'Withdrawn': stat.withdrawn,
                'Completion Rate': stat.totalStudents > 0 ? 
                    Math.round((stat.graduated / stat.totalStudents) * 100) + '%' : '0%'
            }));
            
        } catch (error) {
            console.error('Error generating enrollment report:', error);
            throw error;
        }
    }
    
    async generateGraduationReport() {
        try {
            const students = await this.db.getStudents();
            const graduatedStudents = students.filter(s => s.status === 'graduated');
            
            const graduationByProgram = {};
            const graduationByYear = {};
            
            graduatedStudents.forEach(student => {
                if (!graduationByProgram[student.program]) {
                    graduationByProgram[student.program] = 0;
                }
                graduationByProgram[student.program]++;
                
                const settings = this.db.getDefaultSettings();
                const programDuration = settings.programs[student.program]?.duration || '2 years';
                const durationYears = parseInt(programDuration);
                const graduationYear = student.intake_year + durationYears;
                
                if (!graduationByYear[graduationYear]) {
                    graduationByYear[graduationYear] = 0;
                }
                graduationByYear[graduationYear]++;
            });
            
            const programReport = Object.entries(graduationByProgram).map(([program, count]) => ({
                'Program': program,
                'Graduates': count
            }));
            
            const yearReport = Object.entries(graduationByYear).map(([year, count]) => ({
                'Year': year,
                'Graduates': count
            }));
            
            return {
                programReport,
                yearReport,
                totalGraduates: graduatedStudents.length,
                graduationRate: students.length > 0 ? 
                    Math.round((graduatedStudents.length / students.length) * 100) + '%' : '0%'
            };
            
        } catch (error) {
            console.error('Error generating graduation report:', error);
            throw error;
        }
    }
    
    async exportToCSV(data, fileName) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        this.downloadCSV(csvRows.join('\n'), `${fileName}.csv`);
    }
    
    async exportToExcel(data, fileName) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Excel export requires SheetJS library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
    
    async exportToPDF(data, fileName, reportType) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        use 
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            this.showToast('jsPDF not loaded', 'error');
            return;
        }
        
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`${reportType.toUpperCase()} REPORT`, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        if (data.length === 0) {
            doc.text('No data available', 105, 50, { align: 'center' });
        } else {
            const headers = Object.keys(data[0]);
            const tableData = data.map(row => headers.map(header => row[header] || ''));
            
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: 40,
                    head: [headers],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185] }
                });
            } else {
                doc.setFontSize(10);
                let y = 40;
                data.forEach((row, index) => {
                    if (index < 20) {
                        const rowText = headers.map(h => `${h}: ${row[h]}`).join(', ');
                        doc.text(rowText, 10, y);
                        y += 7;
                    }
                });
                if (data.length > 20) {
                    doc.text(`... and ${data.length - 20} more records`, 10, y);
                }
            }
        }
        
        doc.save(`${fileName}.pdf`);
    }
    
    async previewReport() {
        try {
            const reportType = document.getElementById('reportType').value;
            const program = document.getElementById('reportProgram').value;
            const intakeYear = document.getElementById('reportIntake').value;
            
            if (!reportType) {
                this.showToast('Please select a report type', 'warning');
                return;
            }
            
            let data;
            let title;
            
            switch(reportType) {
                case 'student':
                    data = await this.generateStudentListReport(program, intakeYear);
                    title = 'Student List Preview';
                    break;
                    
                case 'marks':
                    data = await this.generateMarksReport(program, intakeYear);
                    title = 'Academic Marks Preview';
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    title = 'Enrollment Statistics Preview';
                    break;
                    
                case 'graduation':
                    const graduationData = await this.generateGraduationReport();
                    this.previewGraduationReport(graduationData);
                    return;
                    
                default:
                    this.showToast('Invalid report type', 'error');
                    return;
            }
            
            this.previewReportData(data, title);
            
        } catch (error) {
            console.error('Error previewing report:', error);
            this.showToast('Error previewing report', 'error');
        }
    }
    
    previewReportData(data, title) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) return;
        
        if (!data || data.length === 0) {
            previewDiv.innerHTML = `<p class="no-data">No data available for preview</p>`;
            return;
        }
        
        const headers = Object.keys(data[0]);
        
        let html = `
            <h4>${title} (${data.length} records)</h4>
            <div class="table-responsive">
                <table class="preview-table">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.slice(0, 10).forEach(row => {
            html += `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <p class="preview-info">Showing first 10 of ${data.length} records</p>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    previewGraduationReport(data) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) return;
        
        let html = `
            <h4>Graduation Report Preview</h4>
            <div class="report-summary">
                <p><strong>Total Graduates:</strong> ${data.totalGraduates}</p>
                <p><strong>Graduation Rate:</strong> ${data.graduationRate}</p>
            </div>
        `;
        
        if (data.programReport.length > 0) {
            html += `
                <h5>Graduates by Program</h5>
                <div class="table-responsive">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Program</th>
                                <th>Graduates</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.programReport.map(row => `
                                <tr>
                                    <td>${row.Program}</td>
                                    <td>${row.Graduates}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        previewDiv.innerHTML = html;
    }
    
   async generateStudentTranscriptPrompt() {
        try {
            // Create a modal for student selection
            const modal = document.createElement('div');
            modal.id = 'transcriptModal';
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
                padding: 20px;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 900px;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                ">
                    <div style="
                        padding: 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; color: #2c3e50;">
                            <i class="fas fa-graduation-cap"></i> Generate Student Transcripts
                        </h3>
                        <button id="closeTranscriptModal" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>
                    
                    <div style="padding: 20px; flex: 1; overflow-y: auto;">
                        <!-- Filters -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 15px;
                            margin-bottom: 20px;
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        ">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-filter"></i> Filter by Program
                                </label>
                                <select id="transcriptProgramFilter" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    background: white;
                                ">
                                    <option value="all">All Programs</option>
                                    <option value="basic">Basic TEE</option>
                                    <option value="hnc">HNC</option>
                                    <option value="advanced">Advanced TEE</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-calendar"></i> Filter by Intake
                                </label>
                                <select id="transcriptIntakeFilter" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    background: white;
                                ">
                                    <option value="all">All Intakes</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                    <option value="2021">2021</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-search"></i> Search Student
                                </label>
                                <input type="text" id="transcriptSearch" placeholder="Search by name or reg number" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                ">
                            </div>
                        </div>
                        
                        <!-- Student Selection Table -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 10px;
                            ">
                                <h4 style="margin: 0; color: #2c3e50;">Select Students</h4>
                                <div style="display: flex; gap: 10px;">
                                    <button id="selectAllStudents" style="
                                        padding: 6px 12px;
                                        background: #3498db;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 13px;
                                    ">
                                        <i class="fas fa-check-square"></i> Select All
                                    </button>
                                    <button id="deselectAllStudents" style="
                                        padding: 6px 12px;
                                        background: #e74c3c;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 13px;
                                    ">
                                        <i class="fas fa-times-circle"></i> Deselect All
                                    </button>
                                </div>
                            </div>
                            
                            <div style="
                                max-height: 300px;
                                overflow-y: auto;
                                border: 1px solid #eee;
                                border-radius: 8px;
                            ">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; width: 50px;">
                                                <input type="checkbox" id="masterCheckbox" style="cursor: pointer;">
                                            </th>
                                            <th style="padding: 12px; text-align: left;">Reg Number</th>
                                            <th style="padding: 12px; text-align: left;">Student Name</th>
                                            <th style="padding: 12px; text-align: left;">Program</th>
                                            <th style="padding: 12px; text-align: left;">Intake</th>
                                            <th style="padding: 12px; text-align: left;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="transcriptStudentList">
                                        <!-- Students will be loaded here -->
                                        <tr>
                                            <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
                                                <i class="fas fa-spinner fa-spin"></i> Loading students...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="margin-top: 10px; font-size: 13px; color: #7f8c8d; text-align: right;">
                                <span id="selectedCount">0</span> students selected
                            </div>
                        </div>
                        
                        <!-- Format Selection -->
                        <div style="
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                            margin-bottom: 20px;
                        ">
                            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                <i class="fas fa-file-export"></i> Export Settings
                            </h4>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                        Export Format
                                    </label>
                                    <select id="transcriptFormat" style="
                                        width: 100%;
                                        padding: 8px 12px;
                                        border: 1px solid #ddd;
                                        border-radius: 6px;
                                        background: white;
                                    ">
                                        <option value="pdf">PDF Document (Individual files)</option>
                                        <option value="excel">Excel Spreadsheet (Combined)</option>
                                        <option value="csv">CSV File (Combined)</option>
                                        <option value="zip">ZIP Archive (All PDFs)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                        Include Details
                                    </label>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                            <input type="checkbox" id="includeAllAssessments" checked>
                                            <span>All assessment details</span>
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                            <input type="checkbox" id="includeGPA" checked>
                                            <span>GPA calculation</span>
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                            <input type="checkbox" id="includeRemarks" checked>
                                            <span>Remarks</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="
                        padding: 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                    ">
                        <button id="cancelTranscript" style="
                            padding: 10px 20px;
                            background: #95a5a6;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button id="generateTranscriptsBtn" style="
                            padding: 10px 20px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-download"></i> Generate Transcripts
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Load students
            await this.loadTranscriptStudents();
            
            // Setup event listeners
            this.setupTranscriptModalEvents();
            
        } catch (error) {
            console.error('Error creating transcript modal:', error);
            this.showToast('Error loading transcript interface', 'error');
        }
    }
    
    async loadTranscriptStudents() {
        try {
            const students = await this.db.getStudents();
            const tbody = document.getElementById('transcriptStudentList');
            
            if (!students || students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
                            <i class="fas fa-user-graduate"></i>
                            <p style="margin-top: 10px;">No students found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const settings = await this.db.getSettings();
            let html = '';
            
            students.forEach(student => {
                const programName = settings.programs && settings.programs[student.program] ? 
                    settings.programs[student.program].name : student.program;
                
                html += `
                    <tr class="student-row" data-program="${student.program}" data-intake="${student.intake_year}" data-name="${student.full_name.toLowerCase()}" data-reg="${student.reg_number.toLowerCase()}">
                        <td style="padding: 12px;">
                            <input type="checkbox" class="student-checkbox" value="${student.reg_number}" style="cursor: pointer;">
                        </td>
                        <td style="padding: 12px;">
                            <strong>${student.reg_number}</strong>
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 32px; height: 32px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <strong>${student.full_name}</strong><br>
                                    <small style="color: #7f8c8d;">${student.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 12px;">${programName}</td>
                        <td style="padding: 12px;">${student.intake_year}</td>
                        <td style="padding: 12px;">
                            <span style="
                                display: inline-block;
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 11px;
                                font-weight: 600;
                                background: ${student.status === 'active' ? '#d4edda' : student.status === 'graduated' ? '#cce5ff' : '#f8d7da'};
                                color: ${student.status === 'active' ? '#155724' : student.status === 'graduated' ? '#004085' : '#721c24'};
                            ">
                                ${(student.status || 'active').toUpperCase()}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            this.updateSelectedCount();
            
        } catch (error) {
            console.error('Error loading students for transcript:', error);
            const tbody = document.getElementById('transcriptStudentList');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin-top: 10px;">Error loading students</p>
                    </td>
                </tr>
            `;
        }
    }
    
    setupTranscriptModalEvents() {
        // Close modal
        document.getElementById('closeTranscriptModal').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        document.getElementById('cancelTranscript').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        // Master checkbox
        document.getElementById('masterCheckbox').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            this.updateSelectedCount();
        });
        
        // Select all button
        document.getElementById('selectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = true);
            document.getElementById('masterCheckbox').checked = true;
            this.updateSelectedCount();
        });
        
        // Deselect all button
        document.getElementById('deselectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            document.getElementById('masterCheckbox').checked = false;
            this.updateSelectedCount();
        });
        
        // Individual checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('student-checkbox')) {
                this.updateSelectedCount();
            }
        });
        
        // Filters
        document.getElementById('transcriptProgramFilter').addEventListener('change', () => {
            this.filterTranscriptStudents();
        });
        
        document.getElementById('transcriptIntakeFilter').addEventListener('change', () => {
            this.filterTranscriptStudents();
        });
        
        document.getElementById('transcriptSearch').addEventListener('input', () => {
            this.filterTranscriptStudents();
        });
        
        // Generate button
        document.getElementById('generateTranscriptsBtn').addEventListener('click', async () => {
            const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
                .map(cb => cb.value);
            
            if (selectedStudents.length === 0) {
                this.showToast('Please select at least one student', 'warning');
                return;
            }
            
            const format = document.getElementById('transcriptFormat').value;
            const includeAllAssessments = document.getElementById('includeAllAssessments').checked;
            const includeGPA = document.getElementById('includeGPA').checked;
            const includeRemarks = document.getElementById('includeRemarks').checked;
            
            // Disable button and show loading
            const btn = document.getElementById('generateTranscriptsBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btn.disabled = true;
            
            try {
                if (selectedStudents.length === 1) {
                    // Single student
                    await this.generateStudentTranscript(selectedStudents[0], format, {
                        includeAllAssessments,
                        includeGPA,
                        includeRemarks
                    });
                } else {
                    // Multiple students
                    if (format === 'zip' || format === 'pdf') {
                        // Generate individual PDFs
                        for (let i = 0; i < selectedStudents.length; i++) {
                            const studentId = selectedStudents[i];
                            await this.generateStudentTranscript(studentId, 'pdf', {
                                includeAllAssessments,
                                includeGPA,
                                includeRemarks,
                                batchMode: true
                            });
                            
                            // Update progress
                            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating (${i + 1}/${selectedStudents.length})...`;
                        }
                        
                        if (format === 'zip') {
                            // TODO: Create ZIP archive (would need JSZip library)
                            this.showToast(`Generated ${selectedStudents.length} transcripts. ZIP feature coming soon.`, 'info');
                        } else {
                            this.showToast(`Generated ${selectedStudents.length} PDF transcripts`, 'success');
                        }
                    } else {
                        // Combined Excel/CSV
                        await this.generateBulkTranscripts(selectedStudents, format, {
                            includeAllAssessments,
                            includeGPA,
                            includeRemarks
                        });
                    }
                }
                
                // Close modal on success
                setTimeout(() => {
                    document.getElementById('transcriptModal').remove();
                }, 1000);
                
            } catch (error) {
                console.error('Error generating transcripts:', error);
                this.showToast('Error generating transcripts', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
    
    filterTranscriptStudents() {
        const programFilter = document.getElementById('transcriptProgramFilter').value;
        const intakeFilter = document.getElementById('transcriptIntakeFilter').value;
        const searchTerm = document.getElementById('transcriptSearch').value.toLowerCase();
        
        const rows = document.querySelectorAll('.student-row');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const program = row.dataset.program;
            const intake = row.dataset.intake;
            const name = row.dataset.name;
            const reg = row.dataset.reg;
            
            let shouldShow = true;
            
            // Program filter
            if (programFilter !== 'all' && program !== programFilter) {
                shouldShow = false;
            }
            
            // Intake filter
            if (intakeFilter !== 'all' && intake !== intakeFilter) {
                shouldShow = false;
            }
            
            // Search filter
            if (searchTerm && !name.includes(searchTerm) && !reg.includes(searchTerm)) {
                shouldShow = false;
            }
            
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
                
                // Enable checkbox
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = false;
            } else {
                row.style.display = 'none';
                
                // Disable checkbox
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = true;
                checkbox.checked = false;
            }
        });
        
        // Update master checkbox state
        const visibleCheckboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
        const allChecked = visibleCheckboxes.length > 0 && 
            Array.from(visibleCheckboxes).every(cb => cb.checked);
        document.getElementById('masterCheckbox').checked = allChecked;
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.student-checkbox:checked').length;
        document.getElementById('selectedCount').textContent = selectedCount;
        
        // Update generate button text
        const btn = document.getElementById('generateTranscriptsBtn');
        if (selectedCount === 0) {
            btn.innerHTML = '<i class="fas fa-download"></i> Generate Transcripts';
        } else if (selectedCount === 1) {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate 1 Transcript`;
        } else {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate ${selectedCount} Transcripts`;
        }
    }
    
    // Updated generateStudentTranscript with options
    async generateStudentTranscript(studentId, format = 'pdf', options = {}) {
        try {
            console.log(`📚 Generating transcript for student: ${studentId}`);
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            const marks = await this.db.getStudentMarks(student.id);
            const gpa = await this.db.calculateStudentGPA(student.id);
            
            const courses = {};
            marks.forEach(mark => {
                if (!mark.courses || !mark.courses.course_code) {
                    console.warn('Mark missing course info:', mark);
                    return;
                }
                
                const courseCode = mark.courses.course_code;
                if (!courses[courseCode]) {
                    courses[courseCode] = {
                        courseCode: courseCode,
                        courseName: mark.courses.course_name || 'Unknown Course',
                        assessments: [],
                        finalGrade: '',
                        credits: 3
                    };
                }
                
                if (options.includeAllAssessments !== false) {
                    courses[courseCode].assessments.push({
                        name: mark.assessment_name || 'Assessment',
                        type: mark.assessment_type || 'Unknown',
                        score: mark.score || 0,
                        maxScore: mark.max_score || 100,
                        percentage: mark.percentage || 0,
                        grade: mark.grade || 'F',
                        remarks: options.includeRemarks !== false ? mark.remarks : ''
                    });
                }
                
                // Calculate final grade
                if (courses[courseCode].assessments.length > 0) {
                    const totalPercentage = courses[courseCode].assessments
                        .reduce((sum, a) => sum + (a.percentage || 0), 0);
                    const avgPercentage = totalPercentage / courses[courseCode].assessments.length;
                    courses[courseCode].finalGrade = this.db.calculateGrade(avgPercentage).grade;
                }
            });
            
            const courseList = Object.values(courses);
            const transcriptData = {
                student: student,
                courses: courseList,
                gpa: options.includeGPA !== false ? gpa : null,
                totalCredits: courseList.length * 3,
                generatedDate: new Date().toLocaleDateString(),
                options: options
            };
            
            if (format === 'pdf') {
                await this.generateTranscriptPDF(transcriptData);
            } else if (format === 'excel') {
                await this.generateTranscriptExcel(transcriptData);
            } else if (format === 'csv') {
                await this.generateTranscriptCSV(transcriptData);
            }
            
            if (!options.batchMode) {
                this.showToast(`Transcript generated for ${student.full_name}`, 'success');
                await this.db.logActivity('transcript_generated', 
                    `Generated transcript for ${student.full_name} (${student.reg_number})`);
            }
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            if (!options.batchMode) {
                this.showToast(`Error generating transcript: ${error.message}`, 'error');
            }
        }
    }
    
    // Bulk transcripts method
    async generateBulkTranscripts(studentIds, format, options) {
        try {
            console.log(`📚 Generating bulk transcripts for ${studentIds.length} students`);
            
            const allTranscripts = [];
            
            for (const studentId of studentIds) {
                const student = await this.db.getStudent(studentId);
                if (!student) continue;
                
                const marks = await this.db.getStudentMarks(student.id);
                const gpa = await this.db.calculateStudentGPA(student.id);
                
                const courses = {};
                
                // FIXED: Changed forEach to for...of loop or use return instead of continue
                for (const mark of marks) {
                    if (!mark.courses || !mark.courses.course_code) continue;  // Now valid in a for...of loop
                    
                    const courseCode = mark.courses.course_code;
                    if (!courses[courseCode]) {
                        courses[courseCode] = {
                            courseCode: courseCode,
                            courseName: mark.courses.course_name || 'Unknown Course',
                            finalGrade: '',
                            credits: 3
                        };
                    }
                    
                    // For bulk export, just calculate final grade
                    if (courses[courseCode].assessments) {
                        courses[courseCode].assessments.push({
                            percentage: mark.percentage || 0
                        });
                    } else {
                        courses[courseCode].assessments = [{
                            percentage: mark.percentage || 0
                        }];
                    }
                    
                    const totalPercentage = courses[courseCode].assessments
                        .reduce((sum, a) => sum + a.percentage, 0);
                    const avgPercentage = totalPercentage / courses[courseCode].assessments.length;
                    courses[courseCode].finalGrade = this.db.calculateGrade(avgPercentage).grade;
                }
                
                const transcript = {
                    'Reg Number': student.reg_number,
                    'Full Name': student.full_name,
                    'Program': student.program,
                    'Intake Year': student.intake_year,
                    'GPA': options.includeGPA !== false ? gpa.toFixed(2) : 'N/A',
                    'Total Courses': Object.keys(courses).length,
                    'Total Credits': Object.keys(courses).length * 3,
                    'Courses': Object.values(courses).map(c => c.courseCode).join(', ')
                };
                
                allTranscripts.push(transcript);
            }
            
            if (format === 'excel') {
                await this.exportToExcel(allTranscripts, `bulk-transcripts-${new Date().toISOString().split('T')[0]}`);
            } else if (format === 'csv') {
                await this.exportToCSV(allTranscripts, `bulk-transcripts-${new Date().toISOString().split('T')[0]}`);
            }
            
            this.showToast(`Generated ${allTranscripts.length} transcripts in ${format.toUpperCase()} format`, 'success');
            
        } catch (error) {
            console.error('Error generating bulk transcripts:', error);
            this.showToast('Error generating bulk transcripts', 'error');
        }
    }
}
// ==============================
// GLOBAL INITIALIZATION
// ==============================

let app = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    try {
        // Create app instance
        app = new TEEPortalApp();
        window.app = app;
        
        // Initialize
        await app.initialize();
        
        console.log('🎉 TEEPortal System Ready');
        
        // Show dashboard by default
        setTimeout(() => {
            if (typeof showSection === 'function') {
                showSection('dashboard');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize: ' + error.message);
    }
});

// Global helper functions
function showSection(sectionId) {
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
        
        const titleMap = {
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
            sectionTitle.textContent = titleMap[sectionId] || 'TeePortal';
        }
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function openStudentModal() {
    openModal('studentModal');
}

function openCourseModal() {
    openModal('courseModal');
}

function openMarksModal() {
    if (window.app && window.app.openMarksModal) {
        window.app.openMarksModal();
    } else {
        openModal('marksModal');
    }
}

function updateGradeDisplay() {
    try {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        const gradeDisplay = document.getElementById('gradeDisplay');
        const percentageField = document.getElementById('percentage');
        
        if (!scoreInput || !gradeDisplay) return;
        
        const score = parseFloat(scoreInput.value);
        const maxScore = parseFloat(maxScoreInput?.value) || 100;
        
        if (isNaN(score)) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'percentage-badge';
            if (percentageField) percentageField.value = '';
            return;
        }
        
        const percentage = (score / maxScore) * 100;
        
        // Grading scale
        const gradingScale = {
            'A': { min: 80, max: 100, color: '#27ae60' },
            'B+': { min: 75, max: 79, color: '#2ecc71' },
            'B': { min: 70, max: 74, color: '#2ecc71' },
            'C+': { min: 65, max: 69, color: '#f1c40f' },
            'C': { min: 60, max: 64, color: '#f1c40f' },
            'D+': { min: 55, max: 59, color: '#e67e22' },
            'D': { min: 50, max: 54, color: '#e67e22' },
            'F': { min: 0, max: 49, color: '#e74c3c' }
        };
        
        let grade = '--';
        for (const [gradeName, range] of Object.entries(gradingScale)) {
            if (percentage >= range.min && percentage <= range.max) {
                grade = gradeName;
                gradeDisplay.style.backgroundColor = range.color;
                break;
            }
        }
        
        gradeDisplay.textContent = grade;
        gradeDisplay.className = 'percentage-badge';
        
        if (percentageField) {
            percentageField.value = `${percentage.toFixed(2)}%`;
        }
        
    } catch (error) {
        console.error('Error updating grade display:', error);
    }
}

// Make functions globally available
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.openStudentModal = openStudentModal;
window.openCourseModal = openCourseModal;
window.openMarksModal = openMarksModal;
window.updateGradeDisplay = updateGradeDisplay;

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
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
    
    .grade-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        text-align: center;
        min-width: 30px;
    }
    
    .grade-A { background: #27ae60; }
    .grade-B { background: #2ecc71; }
    .grade-C { background: #f1c40f; }
    .grade-D { background: #e67e22; }
    .grade-F { background: #e74c3c; }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
    }
    
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
    
    .toast.info {
        border-left: 4px solid #3498db;
    }
    
    .toast.warning {
        border-left: 4px solid #f39c12;
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
`;
document.head.appendChild(style);

// Debug info
console.log('✅ Global initialization script loaded');
