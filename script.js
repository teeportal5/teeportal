// ==============================
// SUPABASE-ONLY DATABASE MANAGEMENT
// ==============================

class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }
    
    async init() {
        try {
            // Check if supabase is available
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase client not loaded');
            }
            
            this.supabaseUrl = window.SUPABASE_URL || 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            
            // IMPORTANT: For security, move the key to environment variables
            if (!this.supabaseKey || this.supabaseKey.includes('eyJhbGci')) {
                console.warn('⚠️ Using default Supabase key - For production, use environment variables');
            }
            
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection
            await this.testConnection();
            this.initialized = true;
            console.log('✅ Supabase connected successfully');
            
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
                // Check if table doesn't exist (PGRST116)
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    console.warn('⚠️ Table might not exist yet, but connection is successful');
                    return true;
                }
                throw error;
            }
            
            return true;
        } catch (error) {
            throw error;
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
        try {
            const { data, error } = await this.supabase
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
            const { data, error } = await this.supabase
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
            // Generate registration number
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
            
            const { data, error } = await this.supabase
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
            // Get count of students in same program and intake
            const { count, error } = await this.supabase
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
            // Fallback to timestamp-based number
            const timestamp = Date.now().toString().slice(-6);
            return `TEMP${timestamp}`;
        }
    }
    
    // ========== COURSES ==========
    async getCourses() {
        try {
            const { data, error } = await this.supabase
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
            const course = {
                course_code: courseData.code.toUpperCase(),
                course_name: courseData.name,
                program: courseData.program,
                credits: courseData.credits,
                description: courseData.description,
                status: 'active'
            };
            
            const { data, error } = await this.supabase
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
            const { data, error } = await this.supabase
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
            throw error;
        }
    }
    
    async addMark(markData) {
        try {
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
            
            console.log('📊 Processing marks:', {
                student: markData.studentId,
                course: markData.courseId,
                assessment: markData.assessmentName
            });
            
            // Check if marks already exist
            const { data: existingMarks, error: checkError } = await this.supabase
                .from('marks')
                .select('*')
                .eq('student_id', markData.studentId)
                .eq('course_id', markData.courseId)
                .eq('assessment_name', markData.assessmentName)
                .maybeSingle();
                
            let result;
            
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
                
                result = updatedData;
                console.log('✅ Marks updated successfully');
                await this.logActivity('marks_updated', `Updated marks for student`);
                
            } else {
                console.log('🆕 No existing marks found, inserting new...');
                
                // INSERT NEW MARKS
                const { data: newData, error: insertError } = await this.supabase
                    .from('marks')
                    .insert([mark])
                    .select()
                    .single();
                    
                if (insertError) throw insertError;
                
                result = newData;
                console.log('✅ New marks inserted successfully');
                await this.logActivity('marks_entered', `Entered new marks for student`);
            }
            
            return result;
            
        } catch (error) {
            console.error('💥 Error in addMark:', error);
            throw error;
        }
    }
    
    async getStudentMarks(studentId) {
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
            throw error;
        }
    }
    
    async getMarksTableData() {
        try {
            const { data, error } = await this.supabase
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
            const { error } = await this.supabase
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
            const { data, error } = await this.supabase
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
// APPLICATION CORE - SUPABASE ONLY
// ==============================

class TEEPortalApp {
    constructor() {
        this.db = new TEEPortalSupabaseDB();
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.initialized = false;
    }
    
    async initialize() {
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Initialize database first
            await this.db.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
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
        // Student form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStudent(e);
            });
        }
        
        // Marks form submission
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            marksForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMarks(e);
            });
        }
        
        // Course form submission
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCourse(e);
            });
        }
        
        // Real-time grade calculation
        const marksScoreInput = document.getElementById('marksScore');
        if (marksScoreInput) {
            marksScoreInput.addEventListener('input', () => {
                this.updateGradeDisplay();
            });
        }
        
        const maxScoreInput = document.getElementById('maxScore');
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                this.updateGradeDisplay();
            });
        }
        
        // Report generation
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }
        
        const previewReportBtn = document.getElementById('previewReportBtn');
        if (previewReportBtn) {
            previewReportBtn.addEventListener('click', () => {
                this.previewReport();
            });
        }
        
        // Export buttons
        const exportMarksBtn = document.getElementById('exportMarksBtn');
        if (exportMarksBtn) {
            exportMarksBtn.addEventListener('click', () => {
                this.exportMarks();
            });
        }
        
        const generateTranscriptBtn = document.getElementById('generateTranscriptBtn');
        if (generateTranscriptBtn) {
            generateTranscriptBtn.addEventListener('click', () => {
                this.generateStudentTranscriptPrompt();
            });
        }
    }
    
    updateGradeDisplay() {
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
            const grade = this.db.calculateGrade(percentage);
            
            gradeDisplay.textContent = grade.grade;
            gradeDisplay.className = 'percentage-badge';
            gradeDisplay.classList.add(`grade-${grade.grade.charAt(0)}`);
            
            if (percentageField) {
                percentageField.value = `${percentage.toFixed(2)}%`;
            }
            
        } catch (error) {
            console.error('Error updating grade display:', error);
        }
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            // Load students table
            await this.loadStudentsTable();
            
            // Load courses
            await this.loadCourses();
            
            // Load marks table
            await this.loadMarksTable();
            
            // Update dashboard
            await this.updateDashboard();
            
            // Load recent activities
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
        
        // Populate dropdowns
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
            this.closeModal('studentModal');
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
            this.closeModal('marksModal');
            document.getElementById('marksForm').reset();
            this.updateGradeDisplay();
            
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
            this.closeModal('courseModal');
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
                        <button class="btn-primary" onclick="app.openCourseModal()">
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
    // REPORT GENERATION
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
            let query = this.db.supabase
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
            
            // Filter by program and intake if needed
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
            
            // Group by program and intake year
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
            
            // Calculate graduation statistics
            const graduationByProgram = {};
            const graduationByYear = {};
            
            graduatedStudents.forEach(student => {
                // By program
                if (!graduationByProgram[student.program]) {
                    graduationByProgram[student.program] = 0;
                }
                graduationByProgram[student.program]++;
                
                // By year (assuming graduation year is intake + program duration)
                const settings = await this.db.getSettings();
                const programDuration = settings.programs[student.program]?.duration || '2 years';
                const durationYears = parseInt(programDuration);
                const graduationYear = student.intake_year + durationYears;
                
                if (!graduationByYear[graduationYear]) {
                    graduationByYear[graduationYear] = 0;
                }
                graduationByYear[graduationYear]++;
            });
            
            // Convert to array for reporting
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
    
    // ==============================
    // STUDENT TRANSCRIPT GENERATION
    // ==============================
    
    async generateStudentTranscript(studentId, format = 'pdf') {
        try {
            console.log(`📚 Generating transcript for student: ${studentId}`);
            
            // Get student details
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            // Get student marks
            const marks = await this.db.getStudentMarks(student.id);
            
            // Calculate GPA
            const gpa = await this.db.calculateStudentGPA(student.id);
            
            // Group marks by course
            const courses = {};
            marks.forEach(mark => {
                if (!courses[mark.courses.course_code]) {
                    courses[mark.courses.course_code] = {
                        courseCode: mark.courses.course_code,
                        courseName: mark.courses.course_name,
                        assessments: [],
                        finalGrade: '',
                        credits: 3
                    };
                }
                
                courses[mark.courses.course_code].assessments.push({
                    name: mark.assessment_name,
                    type: mark.assessment_type,
                    score: mark.score,
                    maxScore: mark.max_score,
                    percentage: mark.percentage,
                    grade: mark.grade
                });
                
                // Determine final grade
                const totalPercentage = courses[mark.courses.course_code].assessments
                    .reduce((sum, a) => sum + a.percentage, 0);
                const avgPercentage = totalPercentage / courses[mark.courses.course_code].assessments.length;
                courses[mark.courses.course_code].finalGrade = this.db.calculateGrade(avgPercentage).grade;
            });
            
            const transcriptData = {
                student: student,
                courses: Object.values(courses),
                gpa: gpa,
                totalCredits: Object.values(courses).length * 3,
                generatedDate: new Date().toLocaleDateString()
            };
            
            if (format === 'pdf') {
                await this.generateTranscriptPDF(transcriptData);
            } else if (format === 'excel') {
                await this.generateTranscriptExcel(transcriptData);
            } else {
                await this.generateTranscriptCSV(transcriptData);
            }
            
            this.showToast(`Transcript generated for ${student.full_name}`, 'success');
            await this.db.logActivity('transcript_generated', 
                `Generated transcript for ${student.full_name} (${student.reg_number})`);
                
        } catch (error) {
            console.error('Error generating transcript:', error);
            this.showToast('Error generating transcript', 'error');
        }
    }
    
    async generateTranscriptPDF(transcriptData) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            return;
        }
        
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            this.showToast('jsPDF not loaded', 'error');
            return;
        }
        
        const doc = new jsPDF();
        
        const { student, courses, gpa, totalCredits, generatedDate } = transcriptData;
        
        // Add header with institution info
        doc.setFontSize(16);
        doc.text('THEOLOGICAL EDUCATION BY EXTENSION COLLEGE', 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text('OFFICIAL ACADEMIC TRANSCRIPT', 105, 30, { align: 'center' });
        
        // Student information
        doc.setFontSize(11);
        doc.text(`Student Name: ${student.full_name}`, 20, 50);
        doc.text(`Registration Number: ${student.reg_number}`, 20, 58);
        doc.text(`Program: ${student.program.toUpperCase()}`, 20, 66);
        doc.text(`Intake Year: ${student.intake_year}`, 20, 74);
        doc.text(`Date Generated: ${generatedDate}`, 140, 50);
        
        // Academic summary
        doc.text(`Cumulative GPA: ${gpa.toFixed(2)}`, 140, 58);
        doc.text(`Total Credits: ${totalCredits}`, 140, 66);
        
        // Course table
        let startY = 90;
        doc.setFontSize(12);
        doc.text('ACADEMIC RECORD', 20, startY - 5);
        
        const tableHeaders = [['Course Code', 'Course Name', 'Credits', 'Final Grade']];
        const tableData = courses.map(course => [
            course.courseCode,
            course.courseName,
            '3',
            course.finalGrade
        ]);
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: startY,
                head: tableHeaders,
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                margin: { left: 20 }
            });
            
            // Assessment details (second page)
            if (courses.length > 0) {
                doc.addPage();
                doc.setFontSize(12);
                doc.text('DETAILED ASSESSMENT RECORDS', 20, 20);
                
                let yPos = 30;
                courses.forEach((course, index) => {
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${course.courseCode} - ${course.courseName}`, 20, yPos);
                    doc.setFont(undefined, 'normal');
                    
                    yPos += 8;
                    
                    // Assessment table for this course
                    const assessmentHeaders = [['Assessment', 'Type', 'Score', 'Percentage', 'Grade']];
                    const assessmentData = course.assessments.map(assessment => [
                        assessment.name,
                        assessment.type,
                        `${assessment.score}/${assessment.maxScore}`,
                        `${assessment.percentage.toFixed(2)}%`,
                        assessment.grade
                    ]);
                    
                    doc.autoTable({
                        startY: yPos,
                        head: assessmentHeaders,
                        body: assessmentData,
                        theme: 'grid',
                        margin: { left: 20 },
                        styles: { fontSize: 9 }
                    });
                    
                    yPos = doc.lastAutoTable.finalY + 15;
                });
            }
        } else {
            // Simple table without autoTable
            doc.setFontSize(10);
            let y = startY;
            courses.forEach(course => {
                doc.text(`${course.courseCode} - ${course.courseName} - Credits: 3 - Grade: ${course.finalGrade}`, 20, y);
                y += 7;
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            });
        }
        
        // Footer with official seal
        doc.setFontSize(10);
        doc.text('Registrar\'s Signature: ________________________', 20, 280);
        doc.text('College Seal', 180, 280, { align: 'right' });
        
        // Save PDF
        doc.save(`${student.reg_number}-transcript-${generatedDate.replace(/\//g, '-')}.pdf`);
    }
    
    async generateTranscriptCSV(transcriptData) {
        const { student, courses } = transcriptData;
        
        let csvContent = `Student Transcript\n`;
        csvContent += `Student Name: ${student.full_name}\n`;
        csvContent += `Registration Number: ${student.reg_number}\n`;
        csvContent += `Program: ${student.program}\n`;
        csvContent += `Intake Year: ${student.intake_year}\n\n`;
        
        csvContent += `Course Code,Course Name,Credits,Final Grade\n`;
        courses.forEach(course => {
            csvContent += `${course.courseCode},"${course.courseName}",3,${course.finalGrade}\n`;
        });
        
        csvContent += `\nDetailed Assessments\n`;
        csvContent += `Course Code,Assessment,Type,Score,Percentage,Grade\n`;
        
        courses.forEach(course => {
            course.assessments.forEach(assessment => {
                csvContent += `${course.courseCode},"${assessment.name}",${assessment.type},`;
                csvContent += `${assessment.score}/${assessment.maxScore},`;
                csvContent += `${assessment.percentage}%,${assessment.grade}\n`;
            });
        });
        
        this.downloadCSV(csvContent, `${student.reg_number}-transcript.csv`);
    }
    
    async generateTranscriptExcel(transcriptData) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Excel export requires SheetJS library', 'warning');
            await this.generateTranscriptCSV(transcriptData);
            return;
        }
        
        const { student, courses } = transcriptData;
        
        // Create workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
            ['Student Transcript', '', '', ''],
            ['Student Name:', student.full_name, '', ''],
            ['Registration Number:', student.reg_number, '', ''],
            ['Program:', student.program, '', ''],
            ['Intake Year:', student.intake_year, '', ''],
            ['Date Generated:', new Date().toLocaleDateString(), '', ''],
            ['', '', '', ''],
            ['Course Code', 'Course Name', 'Credits', 'Final Grade']
        ];
        
        courses.forEach(course => {
            summaryData.push([course.courseCode, course.courseName, '3', course.finalGrade]);
        });
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        
        // Detailed assessments sheet
        const detailedData = [
            ['Course Code', 'Assessment', 'Type', 'Score', 'Percentage', 'Grade']
        ];
        
        courses.forEach(course => {
            course.assessments.forEach(assessment => {
                detailedData.push([
                    course.courseCode,
                    assessment.name,
                    assessment.type,
                    `${assessment.score}/${assessment.maxScore}`,
                    `${assessment.percentage}%`,
                    assessment.grade
                ]);
            });
        });
        
        const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Assessments');
        
        // Save Excel file
        XLSX.writeFile(workbook, `${student.reg_number}-transcript.xlsx`);
    }
    
    // ==============================
    // EXPORT UTILITIES
    // ==============================
    
    async exportToCSV(data, fileName) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        // Convert array of objects to CSV
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        this.downloadCSV(csvRows.join('\n'), `${fileName}.csv`);
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
        
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            this.showToast('jsPDF not loaded', 'error');
            return;
        }
        
        const doc = new jsPDF();
        
        // Add title
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
                // Simple table without autoTable
                doc.setFontSize(10);
                let y = 40;
                data.forEach((row, index) => {
                    if (index < 20) { // Limit to 20 rows
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
        
        // Show first 10 rows for preview
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
    // EXPORT METHODS
    // ==============================
    
    async exportMarks() {
        try {
            console.log('📊 Exporting marks...');
            
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
            this.showToast('Error exporting marks', 'error');
        }
    }
    
    async exportMarksToExcel() {
        try {
            const marks = await this.db.getMarksTableData();
            
            if (!marks || marks.length === 0) {
                this.showToast('No marks data to export', 'warning');
                return;
            }
            
            // Create Excel workbook using SheetJS (if included)
            if (typeof XLSX !== 'undefined') {
                await this.exportToExcelXLSX(marks);
            } else {
                // Fallback to CSV
                await this.exportMarks();
            }
            
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.showToast('Error exporting to Excel', 'error');
        }
    }
    
    async exportToExcelXLSX(marks) {
        // Convert marks to worksheet data
        const worksheetData = marks.map(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            return {
                'Reg No': student.reg_number || '',
                'Student Name': student.full_name || '',
                'Course Code': course.course_code || '',
                'Course Name': course.course_name || '',
                'Assessment Type': mark.assessment_type || '',
                'Assessment Name': mark.assessment_name || '',
                'Score': mark.score || 0,
                'Max Score': mark.max_score || 100,
                'Percentage': mark.percentage || 0,
                'Grade': mark.grade || '',
                'Grade Points': mark.grade_points || 0,
                'Remarks': mark.remarks || '',
                'Date': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : ''
            };
        });
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks');
        
        // Export to Excel
        XLSX.writeFile(workbook, `teeportal-marks-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    
    convertMarksToCSV(marks) {
        // CSV headers
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
        
        // Convert data to CSV rows
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
        
        // Combine headers and rows
        return [headers.join(','), ...rows].join('\n');
    }
    
    async generateStudentTranscriptPrompt() {
        const studentId = prompt('Enter Student ID or Registration Number:');
        if (studentId) {
            const format = prompt('Select format:\n1. PDF\n2. Excel\n3. CSV', '1');
            let formatCode = 'pdf';
            
            switch(format) {
                case '1': formatCode = 'pdf'; break;
                case '2': formatCode = 'excel'; break;
                case '3': formatCode = 'csv'; break;
            }
            
            await this.generateStudentTranscript(studentId, formatCode);
        }
    }
    
    // ==============================
    // ADDITIONAL UTILITY METHODS
    // ==============================
    
    async refreshData() {
        try {
            this.showToast('Refreshing data...', 'info');
            await this.loadInitialData();
            this.showToast('Data refreshed', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
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
            
            // Populate form
            document.getElementById('courseCode').value = course.course_code;
            document.getElementById('courseName').value = course.course_name;
            document.getElementById('courseProgram').value = course.program;
            document.getElementById('courseCredits').value = course.credits;
            document.getElementById('courseDescription').value = course.description || '';
            
            // Change form to update mode
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            // Change button text
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
            }
            
            this.openCourseModal();
            
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
            const { error } = await this.db.supabase
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
}

// ==============================
// GLOBAL INITIALIZATION
// ==============================

let app = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    try {
        // Initialize app
        app = new TEEPortalApp();
        window.app = app;
        
        // Initialize app asynchronously
        await app.initialize();
        
        // Setup navigation
        setupNavigation();
        
        console.log('🎉 TEEPortal System Ready');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showCriticalError(error);
    }
});

function setupNavigation() {
    window.showSection = function(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Activate corresponding nav link
            const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Update section title
            const titles = {
                'dashboard': 'Dashboard Overview',
                'students': 'Student Management',
                'courses': 'Course Management',
                'marks': 'Academic Records',
                'reports': 'Reports & Analytics',
                'settings': 'System Settings'
            };
            
            const sectionTitle = document.getElementById('section-title');
            if (sectionTitle) {
                sectionTitle.textContent = titles[sectionId] || 'TEE Portal';
            }
            
            // Load section-specific data
            if (sectionId === 'marks' && app) {
                app.loadMarksTable();
            }
            if (sectionId === 'students' && app) {
                app.loadStudentsTable();
            }
            if (sectionId === 'courses' && app) {
                app.loadCourses();
            }
        }
    };
    
    // Set default view to dashboard
    setTimeout(() => showSection('dashboard'), 100);
}

function showCriticalError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #f8d7da;
        color: #721c24;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
        text-align: center;
    `;
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
        <h2 style="margin-bottom: 10px;">Database Connection Error</h2>
        <p style="margin-bottom: 20px; max-width: 600px;">
            Unable to connect to Supabase database. Please check:
        </p>
        <ul style="text-align: left; margin-bottom: 20px; max-width: 600px;">
            <li>Internet connection</li>
            <li>Supabase project status</li>
            <li>Database tables exist</li>
            <li>Check browser console for details</li>
        </ul>
        <p style="color: #666; font-size: 14px;">Error: ${error.message || 'Unknown error'}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #721c24; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
            <i class="fas fa-redo"></i> Retry Connection
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Add CSS styles
const styles = document.createElement('style');
styles.textContent = `
    /* Toast styles */
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
    
    .toast button {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        margin-left: auto;
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
    
    /* Status badges */
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
    
    /* Grade badges */
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
    
    /* Action buttons */
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
    
    /* Course cards */
    .course-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .course-header {
        padding: 15px;
        color: white;
    }
    
    .course-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .course-body {
        padding: 15px;
    }
    
    .course-description {
        color: #666;
        font-size: 14px;
        margin: 10px 0;
    }
    
    .course-meta {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: #888;
        margin-top: 10px;
    }
    
    .course-actions {
        padding: 15px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
    }
    
    /* Empty states */
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
    
    .error-state {
        text-align: center;
        padding: 40px 20px;
        color: #dc3545;
    }
    
    .error-state i {
        font-size: 48px;
        margin-bottom: 15px;
    }
    
    /* Activity items */
    .activity-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .activity-item:last-child {
        border-bottom: none;
    }
    
    .activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #e3f2fd;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3498db;
        margin-right: 15px;
    }
    
    .activity-details {
        flex: 1;
    }
    
    .activity-details p {
        margin: 0 0 5px 0;
        font-size: 14px;
    }
    
    .activity-time {
        font-size: 12px;
        color: #95a5a6;
    }
    
    /* Table styles */
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th {
        background: #f8f9fa;
        padding: 12px;
        text-align: left;
        border-bottom: 2px solid #dee2e6;
        font-weight: 600;
        color: #495057;
    }
    
    td {
        padding: 12px;
        border-bottom: 1px solid #dee2e6;
    }
    
    tr:hover {
        background: #f8f9fa;
    }
    
    /* Preview table */
    .preview-table {
        font-size: 12px;
    }
    
    .preview-table th {
        font-size: 11px;
        padding: 8px;
    }
    
    .preview-table td {
        padding: 8px;
    }
    
    .preview-info {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-top: 10px;
    }
    
    /* Report summary */
    .report-summary {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    
    .no-data {
        text-align: center;
        color: #6c757d;
        font-style: italic;
        padding: 40px;
    }
`;
document.head.appendChild(styles);

// Add this to handle Supabase client loading
if (typeof supabase === 'undefined') {
    console.warn('Supabase client not loaded. Loading from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
        console.log('Supabase client loaded from CDN');
        if (app && !app.initialized) {
            app.initialize();
        }
    };
    document.head.appendChild(script);
}
