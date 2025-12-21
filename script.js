
// ==============================
// ENHANCED SUPABASE DATABASE MANAGEMENT
// ==============================

class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.localStorageFallback = false;
        this.storagePrefix = 'teeprod_';
        
        // Check if Supabase is available
        this.checkSupabaseAvailability();
        
        // Initialize localStorage fallback
        this.useLocalStorageFallback();
    }
    
    async checkSupabaseAvailability() {
        // Check if supabase is defined globally
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            await this.init();
        } else {
            console.warn('⚠️ Supabase client not loaded - using localStorage only');
            this.localStorageFallback = true;
        }
    }
    
    async init() {
        try {
            if (!this.supabaseUrl || !this.supabaseKey) {
                throw new Error('❌ Supabase credentials not set');
            }
            
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection with timeout
            const connectionTest = await Promise.race([
                this.testConnection(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
            
            this.initialized = true;
            this.localStorageFallback = false;
            console.log('✅ Supabase connected successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            this.initialized = false;
            this.localStorageFallback = true;
            return false;
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
    
    // ========== ENHANCED STUDENT METHODS ==========
    async addStudent(studentData) {
        const regNumber = this.generateRegNumber(studentData.program, studentData.intake);
        
        const student = {
            id: Date.now().toString(),
            reg_number: regNumber,
            full_name: studentData.name,
            email: studentData.email,
            phone: studentData.phone,
            dob: studentData.dob || null,
            gender: studentData.gender || null,
            program: studentData.program,
            intake_year: studentData.intake,
            status: 'active',
            created_at: new Date().toISOString(),
            // For compatibility
            regNumber: regNumber,
            name: studentData.name,
            intake: studentData.intake
        };
        
        if (this.localStorageFallback) {
            const students = this.getLocalStorageData('students');
            students.push(student);
            this.saveLocalStorageData('students', students);
            this.logActivity('student_registered', `Registered student: ${student.full_name} (${student.reg_number})`);
            return student;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .insert([{
                    reg_number: student.reg_number,
                    full_name: student.full_name,
                    email: student.email,
                    phone: student.phone,
                    dob: student.dob,
                    gender: student.gender,
                    program: student.program,
                    intake_year: student.intake_year,
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) {
                // Check for duplicate registration number
                if (error.code === '23505') { // Unique violation
                    const newRegNumber = this.generateUniqueRegNumber(studentData.program, studentData.intake);
                    return await this.addStudent({...studentData, regNumber: newRegNumber});
                }
                throw error;
            }
            
            this.logActivity('student_registered', `Registered student: ${data.full_name} (${data.reg_number})`);
            return { ...data, ...student }; // Combine for compatibility
            
        } catch (error) {
            console.error('❌ Error adding student to Supabase:', error);
            
            // Check if it's a connection error
            if (error.message && error.message.includes('Failed to fetch')) {
                console.warn('⚠️ Network error detected, falling back to localStorage');
                this.localStorageFallback = true;
            }
            
            const students = this.getLocalStorageData('students');
            students.push(student);
            this.saveLocalStorageData('students', students);
            this.logActivity('student_registered', `Registered student (fallback): ${student.full_name} (${student.reg_number})`);
            return student;
        }
    }
    
    generateUniqueRegNumber(program, intakeYear) {
        const baseRegNumber = this.generateRegNumber(program, intakeYear);
        const students = this.getLocalStorageData('students');
        
        let counter = 1;
        let newRegNumber = baseRegNumber;
        
        // Check if registration number exists and find unique one
        while (students.some(s => s.reg_number === newRegNumber || s.regNumber === newRegNumber)) {
            const programPrefix = {
                'basic': 'TEE',
                'hnc': 'HNC',
                'advanced': 'ATE'
            };
            
            const prefix = programPrefix[program] || 'TEE';
            const year = intakeYear.toString().slice(-2);
            newRegNumber = `${prefix}${year}${counter.toString().padStart(3, '0')}`;
            counter++;
            
            // Safety break
            if (counter > 999) break;
        }
        
        return newRegNumber;
    }
    
    // ========== ENHANCED MARKS METHODS ==========
    async getMarksWithFilters(filters = {}) {
        try {
            let query = this.supabase
                .from('marks')
                .select(`
                    *,
                    students!inner(reg_number, full_name, program),
                    courses!inner(course_code, course_name, program)
                `);
            
            // Apply filters
            if (filters.studentId) {
                query = query.eq('student_id', filters.studentId);
            }
            
            if (filters.courseId) {
                query = query.eq('course_id', filters.courseId);
            }
            
            if (filters.program) {
                query = query.eq('students.program', filters.program);
            }
            
            if (filters.intake) {
                query = query.eq('students.intake_year', filters.intake);
            }
            
            const { data, error } = await query
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching marks with filters:', error);
            return [];
        }
    }
    
    async getStudentStatistics(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            
            if (marks.length === 0) {
                return {
                    totalMarks: 0,
                    averageScore: 0,
                    averageGrade: 'N/A',
                    gpa: 0,
                    coursesCount: 0
                };
            }
            
            // Calculate statistics
            const totalMarks = marks.length;
            const totalScore = marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
            const totalMaxScore = marks.reduce((sum, mark) => sum + (mark.max_score || 100), 0);
            const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
            const averageGrade = this.calculateGrade(averageScore);
            
            // Calculate GPA
            const totalGradePoints = marks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0);
            const gpa = totalMarks > 0 ? totalGradePoints / totalMarks : 0;
            
            // Count unique courses
            const uniqueCourses = [...new Set(marks.map(mark => mark.course_id))];
            
            return {
                totalMarks,
                averageScore: parseFloat(averageScore.toFixed(2)),
                averageGrade: averageGrade.grade,
                gpa: parseFloat(gpa.toFixed(2)),
                coursesCount: uniqueCourses.length
            };
            
        } catch (error) {
            console.error('Error calculating student statistics:', error);
            return {
                totalMarks: 0,
                averageScore: 0,
                averageGrade: 'N/A',
                gpa: 0,
                coursesCount: 0
            };
        }
    }
    
    // ========== ENHANCED UTILITY METHODS ==========
    async syncLocalToSupabase() {
        if (!this.initialized || this.localStorageFallback) {
            console.warn('Cannot sync: Supabase not available');
            return false;
        }
        
        try {
            const students = this.getLocalStorageData('students');
            const courses = this.getLocalStorageData('courses');
            const marks = this.getLocalStorageData('marks');
            
            let syncedCount = 0;
            
            // Sync students
            for (const student of students) {
                if (student.synced) continue;
                
                const { error } = await this.supabase
                    .from('students')
                    .upsert({
                        reg_number: student.reg_number || student.regNumber,
                        full_name: student.full_name || student.name,
                        email: student.email,
                        phone: student.phone,
                        dob: student.dob,
                        gender: student.gender,
                        program: student.program,
                        intake_year: student.intake_year || student.intake,
                        status: student.status || 'active'
                    }, {
                        onConflict: 'reg_number'
                    });
                
                if (!error) {
                    student.synced = true;
                    syncedCount++;
                }
            }
            
            // Update localStorage
            this.saveLocalStorageData('students', students);
            
            console.log(`✅ Synced ${syncedCount} items to Supabase`);
            return true;
            
        } catch (error) {
            console.error('Error syncing to Supabase:', error);
            return false;
        }
    }
    
    // ========== NEW: BACKUP AND RESTORE METHODS ==========
    async createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    students: this.getLocalStorageData('students'),
                    courses: this.getLocalStorageData('courses'),
                    marks: this.getLocalStorageData('marks'),
                    settings: this.getLocalStorageData('settings'),
                    activity: this.getLocalStorageData('activity')
                }
            };
            
            // Create download link
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teeportal_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            return true;
            
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }
    
    async restoreBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    // Validate backup structure
                    if (!backup.data || !backup.data.students) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    // Restore data
                    this.saveLocalStorageData('students', backup.data.students);
                    this.saveLocalStorageData('courses', backup.data.courses);
                    this.saveLocalStorageData('marks', backup.data.marks);
                    this.saveLocalStorageData('settings', backup.data.settings);
                    this.saveLocalStorageData('activity', backup.data.activity);
                    
                    resolve(true);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }
}

// ==============================
// ENHANCED APPLICATION CORE
// ==============================

class TEEPortalApp {
    constructor() {
        this.db = new TEEPortalSupabaseDB();
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.charts = {};
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('🚀 TEEPortal Application Starting...');
        
        // Show loading state
        this.showLoading(true);
        
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI components
            this.initializeUI();
            
            // Hide loading state
            this.showLoading(false);
            
            console.log('✅ TEEPortal Ready');
            this.showToast('System initialized successfully', 'success');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showToast('System initialization failed', 'error');
            this.showLoading(false);
        }
    }
    
    showLoading(show) {
        let loader = document.getElementById('appLoader');
        
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'appLoader';
                loader.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                               background: rgba(255, 255, 255, 0.9); z-index: 9999; 
                               display: flex; flex-direction: column; align-items: center; 
                               justify-content: center;">
                        <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; 
                                  border-top: 5px solid #3498db; border-radius: 50%; 
                                  animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 20px; color: #2c3e50;">Loading TEEPortal...</p>
                    </div>
                `;
                
                // Add spin animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
                
                document.body.appendChild(loader);
            }
        } else {
            if (loader) {
                loader.remove();
            }
        }
    }
    
    // ==============================
    // ENHANCED STUDENT MANAGEMENT
    // ==============================
    
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            const [marks, statistics] = await Promise.all([
                this.db.getStudentMarks(studentId),
                this.db.getStudentStatistics(studentId)
            ]);
            
            const modalHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-graduate"></i> Student Details</h3>
                        <button class="close-btn" onclick="app.closeModal('studentDetailModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="student-profile">
                            <div class="profile-header">
                                <div class="profile-avatar">
                                    <i class="fas fa-user-circle fa-4x"></i>
                                </div>
                                <div class="profile-info">
                                    <h2>${student.full_name || student.name}</h2>
                                    <p class="reg-number">${student.reg_number || student.regNumber}</p>
                                    <div class="profile-stats">
                                        <span class="stat-item">
                                            <i class="fas fa-book"></i> ${statistics.coursesCount} Courses
                                        </span>
                                        <span class="stat-item">
                                            <i class="fas fa-chart-line"></i> GPA: ${statistics.gpa}
                                        </span>
                                        <span class="stat-item">
                                            <i class="fas fa-star"></i> Grade: ${statistics.averageGrade}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="profile-details">
                                <div class="detail-section">
                                    <h4><i class="fas fa-info-circle"></i> Personal Information</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>Email:</label>
                                            <span>${student.email || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Phone:</label>
                                            <span>${student.phone || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Date of Birth:</label>
                                            <span>${student.dob || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Gender:</label>
                                            <span>${student.gender || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Program:</label>
                                            <span class="program-badge ${student.program}">${student.program?.toUpperCase() || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Intake Year:</label>
                                            <span>${student.intake_year || student.intake || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Status:</label>
                                            <span class="status-badge ${student.status || 'active'}">${student.status?.toUpperCase() || 'ACTIVE'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="detail-section">
                                    <h4><i class="fas fa-chart-bar"></i> Academic Performance</h4>
                                    ${marks.length > 0 ? this.renderStudentMarksTable(marks) : '<p>No marks recorded yet.</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.closeModal('studentDetailModal')">Close</button>
                        <button class="btn-primary" onclick="app.editStudent('${studentId}')">Edit Student</button>
                        <button class="btn-primary" onclick="app.enterMarksForStudent('${studentId}')">Enter Marks</button>
                    </div>
                </div>
            `;
            
            this.showModal('studentDetailModal', modalHTML);
            
        } catch (error) {
            console.error('Error viewing student:', error);
            this.showToast('Error loading student details', 'error');
        }
    }
    
    renderStudentMarksTable(marks) {
        if (marks.length === 0) return '<p>No marks available</p>';
        
        let html = `
            <div class="table-responsive">
                <table class="marks-table">
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Assessment</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        marks.forEach(mark => {
            const courseName = mark.courses?.course_name || mark.course_name || 'Unknown';
            const courseCode = mark.courses?.course_code || mark.course_code || '';
            const percentage = mark.percentage || ((mark.score / mark.max_score) * 100);
            const grade = this.db.calculateGrade(percentage);
            const date = mark.created_at ? new Date(mark.created_at).toLocaleDateString() : 'N/A';
            
            html += `
                <tr>
                    <td>${courseCode} - ${courseName}</td>
                    <td>${mark.assessment_name || 'Assessment'}</td>
                    <td>${mark.score}/${mark.max_score}</td>
                    <td>${percentage.toFixed(2)}%</td>
                    <td><span class="grade-badge grade-${grade.grade.charAt(0)}">${grade.grade}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
    
    // ==============================
    // ENHANCED DASHBOARD
    // ==============================
    
    async updateDashboard() {
        try {
            const [students, marks, courses, activities] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses(),
                this.db.getRecentActivities(10)
            ]);
            
            const settings = this.db.getSettings();
            
            // Update quick stats
            this.updateStats({
                totalStudents: students.length,
                totalCourses: courses.length,
                totalMarks: marks.length,
                averageGrade: this.calculateOverallAverageGrade(marks),
                activePrograms: this.countActivePrograms(students)
            });
            
            // Update charts
            this.updateCharts(students, marks, courses);
            
            // Update recent activities
            this.updateRecentActivities(activities);
            
            // Update program distribution
            this.updateProgramDistribution(students);
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    calculateOverallAverageGrade(marks) {
        if (marks.length === 0) return 'N/A';
        
        const avgPercentage = marks.reduce((sum, mark) => {
            return sum + (mark.percentage || ((mark.score / mark.max_score) * 100));
        }, 0) / marks.length;
        
        const grade = this.db.calculateGrade(avgPercentage);
        return grade.grade;
    }
    
    countActivePrograms(students) {
        const programs = new Set(students.map(s => s.program).filter(Boolean));
        return programs.size;
    }
    
    updateStats(stats) {
        const statElements = {
            'totalStudents': document.getElementById('totalStudents'),
            'totalCourses': document.getElementById('totalCourses'),
            'totalMarks': document.getElementById('totalMarks'),
            'averageGrade': document.getElementById('averageGrade'),
            'activePrograms': document.getElementById('activePrograms')
        };
        
        Object.entries(stats).forEach(([key, value]) => {
            if (statElements[key]) {
                statElements[key].textContent = value;
            }
        });
    }
    
    updateProgramDistribution(students) {
        const programCounts = {};
        
        students.forEach(student => {
            const program = student.program || 'unknown';
            programCounts[program] = (programCounts[program] || 0) + 1;
        });
        
        const distributionContainer = document.getElementById('programDistribution');
        if (distributionContainer) {
            let html = '';
            
            Object.entries(programCounts).forEach(([program, count]) => {
                const percentage = (count / students.length) * 100;
                const programNames = {
                    'basic': 'Basic TEE',
                    'hnc': 'HNC',
                    'advanced': 'Advanced TEE',
                    'unknown': 'Unknown'
                };
                
                html += `
                    <div class="program-item">
                        <div class="program-bar" style="width: ${percentage}%; background: ${this.getProgramColor(program)};"></div>
                        <div class="program-info">
                            <span class="program-name">${programNames[program] || program}</span>
                            <span class="program-count">${count} students (${percentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                `;
            });
            
            distributionContainer.innerHTML = html || '<p>No program data available</p>';
        }
    }
    
    getProgramColor(program) {
        const colors = {
            'basic': '#3498db',
            'hnc': '#2ecc71',
            'advanced': '#9b59b6',
            'unknown': '#95a5a6'
        };
        return colors[program] || '#95a5a6';
    }
    
    updateRecentActivities(activities) {
        const container = document.querySelector('.activity-list');
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent activities</p>';
            return;
        }
        
        let html = '';
        activities.forEach(activity => {
            const timeAgo = this.getTimeAgo(activity.timestamp);
            const icon = this.getActivityIcon(activity.type);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="activity-details">
                        <p class="activity-desc">${activity.description || 'Activity'}</p>
                        <div class="activity-meta">
                            <span class="activity-user"><i class="fas fa-user"></i> ${activity.user || 'System'}</span>
                            <span class="activity-time"><i class="fas fa-clock"></i> ${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // ==============================
    // ENHANCED MODAL MANAGEMENT
    // ==============================
    
    showModal(modalId, content) {
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }, 50);
        
        // Add escape key listener
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modalId);
            }
        };
        
        modal.dataset.escapeHandler = escapeHandler;
        document.addEventListener('keydown', escapeHandler);
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Remove escape listener
            if (modal.dataset.escapeHandler) {
                document.removeEventListener('keydown', modal.dataset.escapeHandler);
            }
            
            // Hide modal
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.remove();
            }, 300);
        }
    }
    
    // ==============================
    // ENHANCED DATA EXPORT
    // ==============================
    
    async exportData(type = 'all') {
        try {
            let data = {};
            let filename = '';
            
            switch (type) {
                case 'students':
                    data = await this.db.getStudents();
                    filename = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'courses':
                    data = await this.db.getCourses();
                    filename = `courses_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'marks':
                    data = await this.db.getMarks();
                    filename = `marks_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'all':
                    data = {
                        students: await this.db.getStudents(),
                        courses: await this.db.getCourses(),
                        marks: await this.db.getMarks(),
                        settings: this.db.getSettings(),
                        exported: new Date().toISOString()
                    };
                    filename = `teeportal_full_export_${new Date().toISOString().split('T')[0]}.json`;
                    break;
            }
            
            if (Array.isArray(data) && data.length === 0) {
                this.showToast(`No ${type} data to export`, 'warning');
                return;
            }
            
            // Convert to appropriate format
            let content, mimeType;
            
            if (type === 'all') {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            } else {
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
            }
            
            // Create download
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast(`${type} exported successfully`, 'success');
            
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.showToast(`Error exporting ${type}`, 'error');
        }
    }
    
    convertToCSV(data) {
        if (!Array.isArray(data) || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '', (key, value) => 
                        value === null ? '' : value
                    )
                ).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }
    
    // ==============================
    // ENHANCED SEARCH AND FILTER
    // ==============================
    
    setupAdvancedSearch() {
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            let debounceTimer;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchStudents(e.target.value);
                }, 300);
            });
        }
    }
    
    async searchStudents(searchTerm) {
        try {
            const students = await this.db.getStudents();
            
            if (!searchTerm.trim()) {
                return this.loadStudentsTable();
            }
            
            const filtered = students.filter(student => {
                const searchFields = [
                    student.full_name || student.name,
                    student.reg_number || student.regNumber,
                    student.email,
                    student.phone,
                    student.program,
                    student.intake_year || student.intake
                ].map(field => (field || '').toString().toLowerCase());
                
                return searchFields.some(field => 
                    field.includes(searchTerm.toLowerCase())
                );
            });
            
            this.renderFilteredStudents(filtered);
            
        } catch (error) {
            console.error('Error searching students:', error);
        }
    }
    
    renderFilteredStudents(students) {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-search fa-2x"></i>
                        <p>No students found matching your search</p>
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
                        <div class="student-info">
                            <div class="student-avatar">
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
                        <span class="status-badge ${status}">
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
                        <button class="btn-action" onclick="app.editStudent('${student.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // ==============================
    // ENHANCED ERROR HANDLING
    // ==============================
    
    async handleDatabaseError(error, context) {
        console.error(`❌ ${context}:`, error);
        
        // Check error type and show appropriate message
        if (error.message && error.message.includes('Failed to fetch')) {
            this.showToast('Network error. Check your internet connection.', 'error');
            this.db.localStorageFallback = true;
            return true; // Indicate fallback was activated
        }
        
        if (error.code === '23505') {
            this.showToast('Duplicate entry detected. Please try again.', 'error');
            return false;
        }
        
        if (error.code === '42501') {
            this.showToast('Permission denied. Please check your database permissions.', 'error');
            return false;
        }
        
        this.showToast(`Error: ${error.message || 'Unknown error'}`, 'error');
        return false;
    }
}

// ==============================
// ENHANCED GLOBAL INITIALIZATION
// ==============================

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize app
        window.app = new TEEPortalApp();
        
        // Setup global event handlers
        setupGlobalHandlers();
        
        // Check connection status
        checkConnectionStatus();
        
        console.log('🎉 TEEPortal Enhanced Version Ready');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showCriticalError(error);
    }
});

function setupGlobalHandlers() {
    // Global click handler for data attributes
    document.addEventListener('click', function(e) {
        // Handle data-action attributes
        if (e.target.dataset.action) {
            handleDataAction(e.target.dataset.action, e.target);
        }
        
        // Handle data-modal attributes
        if (e.target.dataset.modal) {
            if (window.app && window.app.openModal) {
                window.app.openModal(e.target.dataset.modal);
            }
        }
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'n':
                    if (e.shiftKey) window.app?.openStudentModal();
                    break;
                case 'm':
                    window.app?.openMarksModal();
                    break;
                case 'c':
                    window.app?.openCourseModal();
                    break;
                case 's':
                    if (window.app?.saveSettings) {
                        e.preventDefault();
                        window.app.saveSettings();
                    }
                    break;
            }
        }
    });
}

function checkConnectionStatus() {
    const interval = setInterval(async () => {
        if (window.app?.db) {
            const wasFallback = window.app.db.localStorageFallback;
            
            try {
                // Try to reconnect
                if (!window.app.db.initialized && window.app.db.supabaseUrl) {
                    await window.app.db.init();
                    
                    if (window.app.db.initialized && wasFallback) {
                        window.app.showToast('✅ Reconnected to Supabase! Syncing data...', 'success');
                        window.app.db.syncLocalToSupabase();
                    }
                }
            } catch (error) {
                // Connection still down
            }
        }
    }, 30000); // Check every 30 seconds
}

function showCriticalError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #e74c3c;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
        text-align: center;
    `;
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle fa-4x" style="margin-bottom: 20px;"></i>
        <h1 style="margin-bottom: 10px;">Critical Error</h1>
        <p style="margin-bottom: 20px; max-width: 600px;">
            The application failed to initialize. Please refresh the page or contact support.
        </p>
        <pre style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px; max-width: 600px; overflow: auto;">
${error.stack || error.message}
        </pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-redo"></i> Refresh Application
        </button>
    `;
    
    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);
}

// Add additional CSS
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    /* Enhanced styles */
    .student-profile {
        background: white;
        border-radius: 10px;
        overflow: hidden;
    }
    
    .profile-header {
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        padding: 30px;
        display: flex;
        align-items: center;
        gap: 20px;
    }
    
    .profile-avatar {
        width: 80px;
        height: 80px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .profile-info h2 {
        margin: 0 0 5px 0;
        font-size: 24px;
    }
    
    .reg-number {
        opacity: 0.8;
        margin-bottom: 15px;
    }
    
    .profile-stats {
        display: flex;
        gap: 20px;
        margin-top: 15px;
    }
    
    .stat-item {
        background: rgba(255,255,255,0.1);
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 14px;
    }
    
    .detail-section {
        padding: 20px;
        border-bottom: 1px solid #eee;
    }
    
    .detail-section:last-child {
        border-bottom: none;
    }
    
    .detail-section h4 {
        margin: 0 0 15px 0;
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
    }
    
    .detail-item label {
        font-weight: 600;
        color: #7f8c8d;
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 5px;
    }
    
    .detail-item span {
        color: #2c3e50;
    }
    
    .program-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .program-badge.basic { background: #d6eaf8; color: #21618c; }
    .program-badge.hnc { background: #d5f4e6; color: #186a3b; }
    .program-badge.advanced { background: #e8daef; color: #6c3483; }
    
    .marks-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
    }
    
    .marks-table th {
        background: #f8f9fa;
        padding: 12px;
        text-align: left;
        border-bottom: 2px solid #dee2e6;
        font-weight: 600;
        color: #495057;
    }
    
    .marks-table td {
        padding: 12px;
        border-bottom: 1px solid #dee2e6;
    }
    
    .marks-table tr:hover {
        background: #f8f9fa;
    }
    
    .grade-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        color: white;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
    }
    
    .grade-A { background: #27ae60; }
    .grade-B { background: #2ecc71; }
    .grade-C { background: #f1c40f; }
    .grade-D { background: #e67e22; }
    .grade-F { background: #e74c3c; }
    
    .modal-footer {
        padding: 20px;
        background: #f8f9fa;
        border-top: 1px solid #dee2e6;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    
    .table-responsive {
        overflow-x: auto;
    }
    
    .program-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        gap: 10px;
    }
    
    .program-bar {
        height: 10px;
        border-radius: 5px;
        transition: width 0.3s ease;
    }
    
    .program-info {
        display: flex;
        justify-content: space-between;
        flex: 1;
    }
    
    .student-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .student-avatar {
        width: 40px;
        height: 40px;
        background: #3498db;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }
    
    /* Activity item enhancements */
    .activity-item {
        display: flex;
        padding: 15px;
        border-radius: 8px;
        background: white;
        margin-bottom: 10px;
        border-left: 4px solid #3498db;
    }
    
    .activity-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
        font-size: 18px;
    }
    
    .activity-icon.student_registered { background: #d4edda; color: #155724; }
    .activity-icon.marks_entered { background: #fff3cd; color: #856404; }
    .activity-icon.course_added { background: #cce5ff; color: #004085; }
    
    .activity-details {
        flex: 1;
        margin-left: 15px;
    }
    
    .activity-desc {
        margin: 0 0 5px 0;
        font-weight: 500;
    }
    
    .activity-meta {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: #6c757d;
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
`;
document.head.appendChild(enhancedStyles);
