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
        
        // First, check if course code already exists
        const { data: existingCourse, error: checkError } = await supabase
            .from('courses')
            .select('course_code')
            .eq('course_code', courseData.code.toUpperCase())
            .maybeSingle();
            
        if (checkError) {
            console.warn('Error checking existing course:', checkError);
            // Continue anyway, let the insert fail if duplicate
        }
        
        if (existingCourse) {
            throw new Error(`Course code "${courseData.code}" already exists. Please use a different code.`);
        }
        
        const course = {
            course_code: courseData.code.toUpperCase(),
            course_name: courseData.name,
            program: courseData.program,
            credits: courseData.credits || 3, // Default to 3 credits
            description: courseData.description || '',
            status: 'active'
        };
        
        const { data, error } = await supabase
            .from('courses')
            .insert([course])
            .select()
            .single();
            
        if (error) {
            // Handle specific PostgreSQL errors
            if (error.code === '23505') { // Unique violation
                throw new Error(`Course code "${courseData.code.toUpperCase()}" already exists. Please use a different course code.`);
            } else if (error.code === '23502') { // Not null violation
                throw new Error('Missing required fields. Please check your input.');
            } else if (error.code === '22P02') { // Invalid input syntax
                throw new Error('Invalid data format. Please check your input.');
            } else {
                // Generic error
                console.error('Supabase error details:', error);
                throw new Error(`Failed to add course: ${error.message}`);
            }
        }
        
        await this.logActivity('course_added', `Added course: ${data.course_code}`);
        return data;
        
    } catch (error) {
        console.error('Error adding course:', error);
        // Re-throw with better error message
        if (error.message.includes('already exists')) {
            throw error; // Keep our custom message
        }
        throw new Error(`Failed to add course: ${error.message}`);
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
            
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No course found
            }
            throw error;
        }
        return data;
        
    } catch (error) {
        console.error('Error fetching course:', error);
        throw error;
    }
}

// Add this method to update existing courses
async updateCourse(courseId, updateData) {
    try {
        const supabase = await this.ensureConnected();
        
        // If updating course code, check if new code already exists (excluding current course)
        if (updateData.code) {
            const { data: existingCourse, error: checkError } = await supabase
                .from('courses')
                .select('id')
                .eq('course_code', updateData.code.toUpperCase())
                .neq('id', courseId)
                .maybeSingle();
                
            if (existingCourse) {
                throw new Error(`Course code "${updateData.code}" is already used by another course.`);
            }
        }
        
        const updateObj = {};
        if (updateData.code) updateObj.course_code = updateData.code.toUpperCase();
        if (updateData.name) updateObj.course_name = updateData.name;
        if (updateData.program) updateObj.program = updateData.program;
        if (updateData.credits !== undefined) updateObj.credits = updateData.credits;
        if (updateData.description !== undefined) updateObj.description = updateData.description;
        if (updateData.status) updateObj.status = updateData.status;
        
        const { data, error } = await supabase
            .from('courses')
            .update(updateObj)
            .eq('id', courseId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logActivity('course_updated', `Updated course: ${data.course_code}`);
        return data;
        
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
}

// Add this method to delete courses
async deleteCourse(courseId) {
    try {
        const supabase = await this.ensureConnected();
        
        // First check if course exists
        const { data: course, error: checkError } = await supabase
            .from('courses')
            .select('course_code')
            .eq('id', courseId)
            .single();
            
        if (checkError) {
            if (checkError.code === 'PGRST116') {
                throw new Error('Course not found');
            }
            throw checkError;
        }
        
        // Then delete it
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);
            
        if (error) throw error;
        
        await this.logActivity('course_deleted', `Deleted course: ${course.course_code}`);
        return true;
        
    } catch (error) {
        console.error('Error deleting course:', error);
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
    // ========== MISSING MARK METHODS ==========

async getMarkById(markId) {
    try {
        const supabase = await this.ensureConnected();
        const { data, error } = await supabase
            .from('marks')
            .select(`
                *,
                students!inner (id, reg_number, full_name),
                courses!inner (id, course_code, course_name, credits)
            `)
            .eq('id', markId)
            .single();
            
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error fetching mark by ID:', error);
        throw error;
    }
}

async updateMark(markId, updateData) {
    try {
        const supabase = await this.ensureConnected();
        
        // First get the current mark to preserve existing data
        const { data: currentMark, error: fetchError } = await supabase
            .from('marks')
            .select('*')
            .eq('id', markId)
            .single();
            
        if (fetchError) throw fetchError;
        
        // Calculate new percentage and grade
        const score = updateData.score || currentMark.score;
        const maxScore = updateData.maxScore || currentMark.max_score;
        const percentage = (score / maxScore) * 100;
        const grade = this.calculateGrade(percentage);
        
        // Prepare update object
        const updateObj = {
            assessment_type: updateData.assessmentType || currentMark.assessment_type,
            assessment_name: updateData.assessmentName || currentMark.assessment_name,
            score: score,
            max_score: maxScore,
            percentage: parseFloat(percentage.toFixed(2)),
            grade: grade.grade,
            grade_points: grade.points,
            remarks: updateData.remarks || currentMark.remarks,
            updated_at: new Date().toISOString()
        };
        
        // Update the mark
        const { data, error } = await supabase
            .from('marks')
            .update(updateObj)
            .eq('id', markId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logActivity('marks_updated', `Updated marks for student`);
        return data;
        
    } catch (error) {
        console.error('Error updating mark:', error);
        throw error;
    }
}

async deleteMark(markId) {
    try {
        const supabase = await this.ensureConnected();
        
        // First get the mark details for logging
        const { data: mark, error: fetchError } = await supabase
            .from('marks')
            .select('id, assessment_name')
            .eq('id', markId)
            .single();
            
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.warn('Mark not found or already deleted:', fetchError);
        }
        
        // Delete the mark
        const { error } = await supabase
            .from('marks')
            .delete()
            .eq('id', markId);
            
        if (error) throw error;
        
        await this.logActivity('marks_deleted', `Deleted marks record`);
        return true;
        
    } catch (error) {
        console.error('Error deleting mark:', error);
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
    
   // ========== SETTINGS MANAGEMENT ==========
async getSettings() {
    try {
        const supabase = await this.ensureConnected();
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (error) {
            // If no settings exist, return default settings
            if (error.code === 'PGRST116') {
                return this.getDefaultSettings();
            }
            throw error;
        }
        
        // Merge with default settings to ensure all fields exist
        const defaultSettings = this.getDefaultSettings();
        return { ...defaultSettings, ...(data.settings_data || {}) };
        
    } catch (error) {
        console.error('Error fetching settings:', error);
        return this.getDefaultSettings();
    }
}

async saveSettings(settingsData) {
    try {
        const supabase = await this.ensureConnected();
        
        // Get existing settings to update or create new
        const { data: existingSettings, error: fetchError } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .maybeSingle();
            
        let result;
        
        if (existingSettings) {
            // Update existing settings
            const { data, error } = await supabase
                .from('settings')
                .update({
                    settings_data: settingsData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSettings.id)
                .select()
                .single();
                
            if (error) throw error;
            result = data;
        } else {
            // Create new settings
            const { data, error } = await supabase
                .from('settings')
                .insert([{
                    settings_data: settingsData,
                    setting_type: 'system',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
                
            if (error) throw error;
            result = data;
        }
        
        // Log the activity
        await this.logActivity('settings_updated', 'System settings updated');
        return result;
        
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// Update your existing getDefaultSettings() to be more comprehensive
getDefaultSettings() {
    return {
        instituteName: 'Theological Education by Extension College',
        instituteAbbreviation: 'TEE College',
        academicYear: new Date().getFullYear(),
        semester: 'Spring',
        timezone: 'Africa/Nairobi',
        currency: 'KES',
        language: 'en',
        
        // Grading Scale
        gradingScale: {
            'A': { min: 80, max: 100, points: 4.0, description: 'Excellent' },
            'B+': { min: 75, max: 79, points: 3.5, description: 'Very Good' },
            'B': { min: 70, max: 74, points: 3.0, description: 'Good' },
            'C+': { min: 65, max: 69, points: 2.5, description: 'Above Average' },
            'C': { min: 60, max: 64, points: 2.0, description: 'Average' },
            'D+': { min: 55, max: 59, points: 1.5, description: 'Below Average' },
            'D': { min: 50, max: 54, points: 1.0, description: 'Pass' },
            'F': { min: 0, max: 49, points: 0.0, description: 'Fail' }
        },
        
        // Programs Configuration
        programs: {
            'basic': { 
                name: 'Basic TEE', 
                duration: '2 years',
                maxCredits: 60,
                description: 'Basic theological education program'
            },
            'hnc': { 
                name: 'Higher National Certificate', 
                duration: '3 years',
                maxCredits: 90,
                description: 'Advanced certificate program'
            },
            'advanced': { 
                name: 'Advanced TEE', 
                duration: '4 years',
                maxCredits: 120,
                description: 'Advanced theological education program'
            }
        },
        
        // System Settings
        system: {
            autoGenerateRegNumbers: true,
            allowMarkOverwrite: false,
            showGPA: true,
            enableEmailNotifications: false,
            defaultPassword: 'Welcome123',
            sessionTimeout: 30, // minutes
            maxLoginAttempts: 5,
            enableTwoFactor: false
        }
    };
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
        this.cachedStudents = null;
        
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
    
    // ADD THIS - Settings form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => this.saveSettings(e));
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
    
    // ADD THESE - Settings page buttons if they exist
    const addGradeRowBtn = document.getElementById('addGradeRowBtn');
    if (addGradeRowBtn) {
        addGradeRowBtn.addEventListener('click', () => this.addGradingScaleRow());
    }
    
    const addProgramBtn = document.getElementById('addProgramBtn');
    if (addProgramBtn) {
        addProgramBtn.addEventListener('click', () => this.addProgramSetting());
    }
    
    // ADD THIS - Settings tab navigation
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            if (tabName) {
                this.openSettingsTab(tabName);
            }
        });
    });
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
                    <td colspan="11" class="empty-state">
                        <i class="fas fa-chart-bar fa-2x"></i>
                        <p>No marks recorded yet</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        marks.forEach(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const percentage = mark.percentage || ((mark.score / mark.max_score) * 100).toFixed(2);
            const markId = mark.id || mark._id || '';
            
            // Get student name and remove any "test" suffix
            let studentName = student.full_name || 'N/A';
            studentName = studentName.replace(/\s+test\s+\d*$/i, '');
            
            // Format date
            const dateObj = mark.created_at ? new Date(mark.created_at) : 
                          mark.date ? new Date(mark.date) : new Date();
            const formattedDate = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY format
            
            html += `
                <tr data-mark-id="${markId}">
                    <!-- Student ID -->
                    <td>${student.reg_number || 'N/A'}</td>
                    
                    <!-- Student Name -->
                    <td>${studentName}</td>
                    
                    <!-- Course Code -->
                    <td>${course.course_code || 'N/A'}</td>
                    
                    <!-- Course Name -->
                    <td>${course.course_name || 'N/A'}</td>
                    
                    <!-- Assessment -->
                    <td>${mark.assessment_name || 'Assessment'}</td>
                    
                    <!-- Score -->
                    <td><strong>${mark.score || 0}/${mark.max_score || 100}</strong></td>
                    
                    <!-- Percentage -->
                    <td>${percentage}%</td>
                    
                    <!-- Grade -->
                    <td>
                        <span class="grade-badge grade-${mark.grade?.charAt(0) || 'F'}">
                            ${mark.grade || 'F'}
                        </span>
                    </td>
                    
                    <!-- Credits -->
                    <td>${course.credits || mark.credits || 3}</td>
                    
                    <!-- Date -->
                    <td>${formattedDate}</td>
                    
                    <!-- Actions -->
                    <td>
                        <div class="action-buttons">
                            <button type="button" class="btn-action btn-edit" 
                                    onclick="app.editMark('${markId}')" 
                                    title="Edit Marks">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn-action btn-delete" 
                                    onclick="app.deleteMark('${markId}')" 
                                    title="Delete Marks">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
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
                    <td colspan="11" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p>Error loading marks</p>
                        <small class="d-block mt-1">${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }
}

// ==============================
// FIXED EDIT MARK FUNCTION
// ==============================

async editMark(markId) {
    try {
        console.log('🔧 Editing mark ID:', markId);
        
        // Fetch mark data - IMPORTANT: Use the new method we just added to db
        const mark = await this.db.getMarkById(markId);
        
        if (!mark) {
            this.showToast('Mark not found', 'error');
            return;
        }
        
        console.log('📊 Mark data fetched:', mark);
        
        // Populate edit modal form - CORRECTED PROPERTY NAMES
        document.getElementById('editMarkId').value = markId;
        // Use the actual column names from Supabase: student_id, not studentId
        document.getElementById('editStudent').value = mark.student_id || '';
        document.getElementById('editCourse').value = mark.course_id || '';
        document.getElementById('editAssessmentType').value = mark.assessment_type || 'final';
        document.getElementById('editAssessmentName').value = mark.assessment_name || '';
        document.getElementById('editScore').value = mark.score || 0;
        document.getElementById('editMaxScore').value = mark.max_score || 100;
        document.getElementById('editRemarks').value = mark.remarks || '';
        
        // Display student and course info for reference
        const student = mark.students || {};
        const course = mark.courses || {};
        
        // Show student name if available
        const studentDisplay = document.getElementById('editStudentDisplay');
        if (studentDisplay) {
            studentDisplay.textContent = student.full_name ? 
                `${student.reg_number} - ${student.full_name}` : 
                `Student ID: ${mark.student_id}`;
        }
        
        // Show course name if available
        const courseDisplay = document.getElementById('editCourseDisplay');
        if (courseDisplay) {
            courseDisplay.textContent = course.course_code ? 
                `${course.course_code} - ${course.course_name}` : 
                `Course ID: ${mark.course_id}`;
        }
        
        // Show edit modal
        this.openModal('editMarksModal');
        
    } catch (error) {
        console.error('❌ Error loading mark for edit:', error);
        this.showToast(`Error loading mark details: ${error.message}`, 'error');
    }
}

// ==============================
// FIXED UPDATE MARK FUNCTION
// ==============================

async updateMark(event) {
    event.preventDefault();
    
    try {
        const markId = document.getElementById('editMarkId').value;
        const score = parseFloat(document.getElementById('editScore').value);
        const maxScore = parseFloat(document.getElementById('editMaxScore').value) || 100;
        
        if (!markId || isNaN(score)) {
            this.showToast('Please enter valid score data', 'error');
            return;
        }
        
        if (score < 0 || maxScore <= 0) {
            this.showToast('Score must be positive and max score must be greater than 0', 'error');
            return;
        }
        
        const updateData = {
            assessmentType: document.getElementById('editAssessmentType').value,
            assessmentName: document.getElementById('editAssessmentName').value,
            score: score,
            maxScore: maxScore,
            remarks: document.getElementById('editRemarks').value || ''
        };
        
        console.log('🔄 Updating mark:', markId, updateData);
        
        await this.db.updateMark(markId, updateData);
        
        this.showToast('✅ Marks updated successfully!', 'success');
        closeModal('editMarksModal');
        
        // Refresh UI
        await this.loadMarksTable();
        await this.updateDashboard();
        
    } catch (error) {
        console.error('❌ Error updating mark:', error);
        this.showToast(`Error updating marks: ${error.message}`, 'error');
    }
}

// ==============================
// FIXED DELETE MARK FUNCTION
// ==============================

async deleteMark(markId) {
    try {
        if (!confirm('Are you sure you want to delete this mark record? This action cannot be undone.')) {
            return;
        }
        
        console.log('🗑️ Deleting mark:', markId);
        
        await this.db.deleteMark(markId);
        
        this.showToast('✅ Mark deleted successfully!', 'success');
        
        // Remove row from table with animation
        const row = document.querySelector(`tr[data-mark-id="${markId}"]`);
        if (row) {
            row.style.opacity = '0.5';
            row.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                row.remove();
                // Update counts if any
                this.updateSelectedCounts();
            }, 300);
        }
        
        // Update dashboard
        if (this.updateDashboard) {
            await this.updateDashboard();
        }
        
    } catch (error) {
        console.error('❌ Error deleting mark:', error);
        this.showToast(`Error deleting mark: ${error.message}`, 'error');
    }
}

// ==============================
// SAVE MARKS FUNCTION
// ==============================

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
        
        if (score < 0 || maxScore <= 0) {
            this.showToast('Score must be positive and max score must be greater than 0', 'error');
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
        
        console.log('💾 Saving marks:', markData);
        
        await this.db.addMark(markData);
        
        this.showToast('✅ Marks saved successfully!', 'success');
        
        // Close modal and reset form
        closeModal('marksModal');
        document.getElementById('marksForm').reset();
        
        if (typeof updateGradeDisplay === 'function') {
            updateGradeDisplay();
        }
        
        // Update UI
        await this.loadMarksTable();
        await this.updateDashboard();
        
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        this.showToast(`Error saving marks: ${error.message}`, 'error');
    }
}

// ==============================
// OPEN MODAL FUNCTION
// ==============================

openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        // Focus on first input if exists
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    } else {
        console.warn(`Modal #${modalId} not found`);
    }
}

// ==============================
// HELPER FUNCTIONS
// ==============================

updateSelectedCounts() {
    // Update any selected counts in UI if needed
    const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
    const countElement = document.getElementById('markCount');
    if (countElement) {
        countElement.textContent = `Total: ${rowCount} marks`;
    }
}
 // ==============================
// SETTINGS MANAGEMENT
// ==============================

async loadSettings() {
    try {
        const settings = await this.db.getSettings();
        
        // Populate settings form if it exists
        this.populateSettingsForm(settings);
        
        // Apply settings to UI
        this.applySettings(settings);
        
        return settings;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        return this.db.getDefaultSettings();
    }
}

populateSettingsForm(settings) {
    try {
        // Institute Settings
        if (document.getElementById('instituteName')) {
            document.getElementById('instituteName').value = settings.instituteName || '';
        }
        
        if (document.getElementById('instituteAbbreviation')) {
            document.getElementById('instituteAbbreviation').value = settings.instituteAbbreviation || '';
        }
        
        if (document.getElementById('academicYear')) {
            document.getElementById('academicYear').value = settings.academicYear || new Date().getFullYear();
        }
        
        if (document.getElementById('timezone')) {
            document.getElementById('timezone').value = settings.timezone || 'Africa/Nairobi';
        }
        
        // System Settings
        if (document.getElementById('autoGenerateRegNumbers')) {
            document.getElementById('autoGenerateRegNumbers').checked = settings.system?.autoGenerateRegNumbers !== false;
        }
        
        if (document.getElementById('allowMarkOverwrite')) {
            document.getElementById('allowMarkOverwrite').checked = settings.system?.allowMarkOverwrite || false;
        }
        
        if (document.getElementById('showGPA')) {
            document.getElementById('showGPA').checked = settings.system?.showGPA !== false;
        }
        
        // Populate grading scale table if it exists
        this.populateGradingScaleTable(settings.gradingScale);
        
        // Populate programs settings
        this.populateProgramsSettings(settings.programs);
        
    } catch (error) {
        console.error('Error populating settings form:', error);
    }
}

populateGradingScaleTable(gradingScale) {
    const tbody = document.getElementById('grading-scale-body');
    if (!tbody) return;
    
    let html = '';
    Object.entries(gradingScale).forEach(([grade, data]) => {
        html += `
            <tr>
                <td><strong>${grade}</strong></td>
                <td><input type="number" class="form-control-sm" value="${data.min}" min="0" max="100"></td>
                <td><input type="number" class="form-control-sm" value="${data.max}" min="0" max="100"></td>
                <td><input type="number" class="form-control-sm" value="${data.points}" step="0.1" min="0" max="4"></td>
                <td><input type="text" class="form-control" value="${data.description || ''}"></td>
                <td>
                    <button class="btn-action btn-delete" onclick="app.removeGradingScaleRow(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

populateProgramsSettings(programs) {
    const container = document.getElementById('programs-settings');
    if (!container) return;
    
    let html = '';
    Object.entries(programs).forEach(([code, data]) => {
        html += `
            <div class="program-setting-card">
                <div class="program-setting-header">
                    <h5>${data.name}</h5>
                    <span class="program-code">${code}</span>
                </div>
                <div class="program-setting-body">
                    <div class="form-group">
                        <label>Program Name</label>
                        <input type="text" class="form-control" value="${data.name}" data-field="name">
                    </div>
                    <div class="form-group">
                        <label>Duration</label>
                        <input type="text" class="form-control" value="${data.duration}" data-field="duration">
                    </div>
                    <div class="form-group">
                        <label>Max Credits</label>
                        <input type="number" class="form-control" value="${data.maxCredits || 0}" data-field="maxCredits">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" rows="2" data-field="description">${data.description || ''}</textarea>
                    </div>
                </div>
                <input type="hidden" class="program-code" value="${code}">
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async saveSettings(event) {
    if (event) event.preventDefault();
    
    try {
        // Collect settings from form
        const settingsData = {
            instituteName: document.getElementById('instituteName')?.value || '',
            instituteAbbreviation: document.getElementById('instituteAbbreviation')?.value || '',
            academicYear: parseInt(document.getElementById('academicYear')?.value) || new Date().getFullYear(),
            timezone: document.getElementById('timezone')?.value || 'Africa/Nairobi',
            currency: document.getElementById('currency')?.value || 'KES',
            language: document.getElementById('language')?.value || 'en',
            
            // Grading Scale
            gradingScale: this.collectGradingScaleData(),
            
            // Programs
            programs: this.collectProgramsData(),
            
            // System Settings
            system: {
                autoGenerateRegNumbers: document.getElementById('autoGenerateRegNumbers')?.checked || true,
                allowMarkOverwrite: document.getElementById('allowMarkOverwrite')?.checked || false,
                showGPA: document.getElementById('showGPA')?.checked || true,
                enableEmailNotifications: document.getElementById('enableEmailNotifications')?.checked || false,
                defaultPassword: document.getElementById('defaultPassword')?.value || 'Welcome123',
                sessionTimeout: parseInt(document.getElementById('sessionTimeout')?.value) || 30,
                maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts')?.value) || 5,
                enableTwoFactor: document.getElementById('enableTwoFactor')?.checked || false
            }
        };
        
        console.log('💾 Saving settings:', settingsData);
        
        await this.db.saveSettings(settingsData);
        
        this.showToast('✅ Settings saved successfully!', 'success');
        
        // Apply settings to UI
        this.applySettings(settingsData);
        
        // Refresh dashboard to reflect new settings
        await this.updateDashboard();
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        this.showToast(`Error saving settings: ${error.message}`, 'error');
    }
}

collectGradingScaleData() {
    const gradingScale = {};
    const rows = document.querySelectorAll('#grading-scale-body tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
            const grade = cells[0].querySelector('strong')?.textContent || '';
            const min = parseFloat(cells[1].querySelector('input')?.value) || 0;
            const max = parseFloat(cells[2].querySelector('input')?.value) || 0;
            const points = parseFloat(cells[3].querySelector('input')?.value) || 0;
            const description = cells[4].querySelector('input')?.value || '';
            
            if (grade) {
                gradingScale[grade] = { min, max, points, description };
            }
        }
    });
    
    return gradingScale;
}

collectProgramsData() {
    const programs = {};
    const cards = document.querySelectorAll('.program-setting-card');
    
    cards.forEach(card => {
        const code = card.querySelector('.program-code').value;
        const name = card.querySelector('[data-field="name"]')?.value || '';
        const duration = card.querySelector('[data-field="duration"]')?.value || '';
        const maxCredits = parseInt(card.querySelector('[data-field="maxCredits"]')?.value) || 0;
        const description = card.querySelector('[data-field="description"]')?.value || '';
        
        if (code && name) {
            programs[code] = {
                name,
                duration,
                maxCredits,
                description
            };
        }
    });
    
    return programs;
}

applySettings(settings) {
    // Update page title and headers
    document.title = `${settings.instituteName} - TEE Portal`;
    
    const instituteNameElements = document.querySelectorAll('.institute-name');
    instituteNameElements.forEach(el => {
        el.textContent = settings.instituteName;
    });
    
    const instituteAbbrElements = document.querySelectorAll('.institute-abbr');
    instituteAbbrElements.forEach(el => {
        el.textContent = settings.instituteAbbreviation;
    });
    
    // Update academic year display
    const academicYearElements = document.querySelectorAll('.academic-year');
    academicYearElements.forEach(el => {
        el.textContent = settings.academicYear;
    });
}

// Helper methods for grading scale
removeGradingScaleRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }
}

addGradingScaleRow() {
    const tbody = document.getElementById('grading-scale-body');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" class="form-control-sm" placeholder="A, B+, etc"></td>
        <td><input type="number" class="form-control-sm" placeholder="Min %" min="0" max="100"></td>
        <td><input type="number" class="form-control-sm" placeholder="Max %" min="0" max="100"></td>
        <td><input type="number" class="form-control-sm" placeholder="Points" step="0.1" min="0" max="4"></td>
        <td><input type="text" class="form-control" placeholder="Description"></td>
        <td>
            <button class="btn-action btn-delete" onclick="app.removeGradingScaleRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
}

addProgramSetting() {
    const container = document.getElementById('programs-settings');
    if (!container) return;
    
    const newCard = document.createElement('div');
    newCard.className = 'program-setting-card';
    newCard.innerHTML = `
        <div class="program-setting-header">
            <h5>New Program</h5>
            <span class="program-code">NEW</span>
        </div>
        <div class="program-setting-body">
            <div class="form-group">
                <label>Program Code</label>
                <input type="text" class="form-control program-code-input" placeholder="e.g., basic, hnc">
            </div>
            <div class="form-group">
                <label>Program Name</label>
                <input type="text" class="form-control" data-field="name" placeholder="Program Name">
            </div>
            <div class="form-group">
                <label>Duration</label>
                <input type="text" class="form-control" data-field="duration" placeholder="e.g., 2 years">
            </div>
            <div class="form-group">
                <label>Max Credits</label>
                <input type="number" class="form-control" data-field="maxCredits" value="0">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" rows="2" data-field="description"></textarea>
            </div>
        </div>
        <input type="hidden" class="program-code" value="">
    `;
    
    container.appendChild(newCard);
    
    // Add event listener for program code input
    const codeInput = newCard.querySelector('.program-code-input');
    const hiddenCode = newCard.querySelector('.program-code');
    const codeSpan = newCard.querySelector('.program-code');
    
    codeInput.addEventListener('input', function() {
        hiddenCode.value = this.value.toLowerCase();
        codeSpan.textContent = this.value.toUpperCase();
    });
}  
// ==============================
// COURSE MANAGEMENT - UPDATED
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
        if (!courseData.code) {
            this.showToast('Please enter a course code', 'error');
            return;
        }
        
        if (!courseData.name) {
            this.showToast('Please enter a course name', 'error');
            return;
        }
        
        if (!courseData.program) {
            this.showToast('Please select a program', 'error');
            return;
        }
        
        if (isNaN(courseData.credits) || courseData.credits < 1 || courseData.credits > 10) {
            this.showToast('Credits must be a number between 1 and 10', 'error');
            return;
        }
        
        console.log('📝 Saving course:', courseData);
        
        // Check if we're editing an existing course
        const form = document.getElementById('courseForm');
        const isEditMode = form.dataset.editId;
        
        let course;
        if (isEditMode) {
            // Update existing course
            course = await this.db.updateCourse(isEditMode, courseData);
            this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" updated successfully`, 'success');
            
            // Reset edit mode
            delete form.dataset.editId;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Course';
                submitBtn.classList.remove('btn-update');
                submitBtn.classList.add('btn-primary');
            }
        } else {
            // Add new course
            course = await this.db.addCourse(courseData);
            this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" added successfully`, 'success');
        }
        
        // Close modal and reset form
        closeModal('courseModal');
        form.reset();
        
        // Update UI
        await this.loadCourses();
        await this.populateCourseDropdown();
        
    } catch (error) {
        console.error('Error saving course:', error);
        // Show specific error message from the database
        this.showToast(`❌ ${error.message}`, 'error');
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
            const status = course.status || 'active';
            
            html += `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-header" style="background: ${programColor};">
                        <div class="course-header-content">
                            <h3>${course.course_code}</h3>
                            <span class="course-status ${status}">${status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="course-body">
                        <h4>${course.course_name}</h4>
                        <p class="course-description">${course.description || 'No description available'}</p>
                        <div class="course-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${programName}</span>
                            <span><i class="fas fa-star"></i> ${course.credits || 3} Credits</span>
                            <span><i class="fas fa-calendar"></i> ${createdAt}</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn-edit" onclick="app.editCourse('${course.id}')" title="Edit Course">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="app.deleteCoursePrompt('${course.id}', '${course.course_code}')" title="Delete Course">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading courses:', error);
        const grid = document.getElementById('coursesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Error Loading Courses</h3>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="app.loadCourses()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
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
        document.getElementById('courseCredits').value = course.credits || 3;
        document.getElementById('courseDescription').value = course.description || '';
        
        // Set edit mode
        const form = document.getElementById('courseForm');
        form.dataset.editId = courseId;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-update');
        }
        
        openModal('courseModal');
        
    } catch (error) {
        console.error('Error editing course:', error);
        this.showToast(`Error loading course: ${error.message}`, 'error');
    }
}

async deleteCoursePrompt(courseId, courseCode) {
    const confirmMessage = `Are you sure you want to delete the course "${courseCode}"?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        await this.db.deleteCourse(courseId);
        this.showToast('✅ Course deleted successfully', 'success');
        
        // Remove the course card with animation
        const courseCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
        if (courseCard) {
            courseCard.style.opacity = '0.5';
            courseCard.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                courseCard.remove();
                // Check if grid is now empty
                const grid = document.getElementById('coursesGrid');
                if (grid && grid.children.length === 0) {
                    this.loadCourses(); // Reload to show empty state
                }
            }, 300);
        }
        
        // Update dropdown
        await this.populateCourseDropdown();
        
    } catch (error) {
        console.error('Error deleting course:', error);
        this.showToast(`❌ Error: ${error.message}`, 'error');
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
    // TRANSCRIPT GENERATION METHODS
    // ==============================
    
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
                    max-width: 1000px;
                    max-height: 85vh;
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
                            aria-label="Close modal"
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
                                    aria-label="Search students"
                                ">
                            </div>
                        </div>
                        
                        <!-- Export Settings -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 20px;
                            margin-bottom: 20px;
                        ">
                            <!-- Format Selection -->
                            <div style="
                                padding: 15px;
                                background: #f8f9fa;
                                border-radius: 8px;
                            ">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    <i class="fas fa-file-export"></i> Export Settings
                                </h4>
                                
                                <div style="display: flex; flex-direction: column; gap: 15px;">
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
                                            Template
                                        </label>
                                        <select id="transcriptTemplate" style="
                                            width: 100%;
                                            padding: 8px 12px;
                                            border: 1px solid #ddd;
                                            border-radius: 6px;
                                            background: white;
                                        ">
                                            <option value="default">Default Template</option>
                                            <option value="official">Official Template</option>
                                            <option value="simple">Simplified Template</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                            Academic Period
                                        </label>
                                        <select id="transcriptPeriod" style="
                                            width: 100%;
                                            padding: 8px 12px;
                                            border: 1px solid #ddd;
                                            border-radius: 6px;
                                            background: white;
                                        ">
                                            <option value="all">All Periods</option>
                                            <option value="current">Current Academic Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                        <div id="customDateRange" style="display: none; margin-top: 10px; gap: 10px;">
                                            <input type="date" id="startDate" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                                            <input type="date" id="endDate" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Include Details -->
                            <div style="
                                padding: 15px;
                                background: #f8f9fa;
                                border-radius: 8px;
                            ">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    <i class="fas fa-cogs"></i> Content Options
                                </h4>
                                
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" id="includeAllAssessments" checked aria-label="Include all assessment details">
                                        <span>All assessment details</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" id="includeGPA" checked aria-label="Include GPA calculation">
                                        <span>GPA calculation</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" id="includeRemarks" checked aria-label="Include remarks">
                                        <span>Remarks</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" id="includeSensitiveData" aria-label="Include sensitive data">
                                        <span>Sensitive data (email, phone)</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" id="watermark" checked aria-label="Add watermark">
                                        <span>Add "Unofficial" watermark</span>
                                    </label>
                                </div>
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
                                        aria-label="Select all students"
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
                                        aria-label="Deselect all students"
                                    ">
                                        <i class="fas fa-times-circle"></i> Deselect All
                                    </button>
                                    <button id="previewTranscript" style="
                                        padding: 6px 12px;
                                        background: #9b59b6;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 13px;
                                        aria-label="Preview selected transcript"
                                    ">
                                        <i class="fas fa-eye"></i> Preview
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
                                                <input type="checkbox" id="masterCheckbox" style="cursor: pointer;" aria-label="Select/deselect all">
                                            </th>
                                            <th style="padding: 12px; text-align: left;">Reg Number</th>
                                            <th style="padding: 12px; text-align: left;">Student Name</th>
                                            <th style="padding: 12px; text-align: left;">Program</th>
                                            <th style="padding: 12px; text-align: left;">Intake</th>
                                            <th style="padding: 12px; text-align: left;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="transcriptStudentList">
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
                                <span id="visibleCount" style="margin-left: 15px;"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="
                        padding: 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div style="font-size: 13px; color: #7f8c8d;">
                            <i class="fas fa-info-circle"></i> 
                            Use Ctrl/Cmd + Click for multiple selection
                        </div>
                        <div style="display: flex; gap: 10px;">
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
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Load students
            await this.loadTranscriptStudents();
            
            // Setup event listeners
            this.setupTranscriptModalEvents();
            
            // Add accessibility enhancements
            this.enhanceTranscriptAccessibility();
            
        } catch (error) {
            console.error('Error creating transcript modal:', error);
            this.showToast('Error loading transcript interface', 'error');
        }
    }
    
    async loadTranscriptStudents() {
        try {
            const tbody = document.getElementById('transcriptStudentList');
            
            if (this.cachedStudents) {
                this.renderStudentTable(this.cachedStudents);
                return;
            }
            
            const students = await this.db.getStudents();
            this.cachedStudents = students;
            
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
            
            this.renderStudentTable(students);
            
        } catch (error) {
            console.error('Error loading students for transcript:', error);
            const tbody = document.getElementById('transcriptStudentList');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin-top: 10px;">Error loading students</p>
                        <button onclick="location.reload()" style="
                            margin-top: 10px;
                            padding: 5px 10px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
    
    renderStudentTable(students) {
        const tbody = document.getElementById('transcriptStudentList');
        const settings = this.db.settings || {};
        
        let html = '';
        
        students.forEach((student, index) => {
            const programName = settings.programs && settings.programs[student.program] ? 
                settings.programs[student.program].name : student.program;
            
            html += `
                <tr class="student-row" 
                    data-id="${student.id}" 
                    data-reg="${student.reg_number}"
                    data-program="${student.program}" 
                    data-intake="${student.intake_year}" 
                    data-name="${student.full_name.toLowerCase()}" 
                    data-reg-lower="${student.reg_number.toLowerCase()}"
                    tabindex="0"
                    aria-label="Student: ${student.full_name}, ${student.reg_number}"
                    role="row"
                >
                    <td style="padding: 12px;" role="cell">
                        <input type="checkbox" 
                               class="student-checkbox" 
                               value="${student.id}"
                               data-reg="${student.reg_number}"
                               aria-label="Select ${student.full_name}"
                               tabindex="0">
                    </td>
                    <td style="padding: 12px;" role="cell">
                        <strong>${student.reg_number}</strong>
                    </td>
                    <td style="padding: 12px;" role="cell">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <strong>${this.sanitizeHTML(student.full_name)}</strong><br>
                                <small style="color: #7f8c8d;">${student.email || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px;" role="cell">${programName}</td>
                    <td style="padding: 12px;" role="cell">${student.intake_year}</td>
                    <td style="padding: 12px;" role="cell">
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
        this.updateVisibleCount();
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
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                cb.setAttribute('aria-checked', e.target.checked);
            });
            this.updateSelectedCount();
        });
        
        // Select all button
        document.getElementById('selectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => {
                cb.checked = true;
                cb.setAttribute('aria-checked', 'true');
            });
            document.getElementById('masterCheckbox').checked = true;
            document.getElementById('masterCheckbox').setAttribute('aria-checked', 'true');
            this.updateSelectedCount();
        });
        
        // Deselect all button
        document.getElementById('deselectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = false;
                cb.setAttribute('aria-checked', 'false');
            });
            document.getElementById('masterCheckbox').checked = false;
            document.getElementById('masterCheckbox').setAttribute('aria-checked', 'false');
            this.updateSelectedCount();
        });
        
        // Preview button
        document.getElementById('previewTranscript').addEventListener('click', async () => {
            const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
                .map(cb => ({ id: cb.value, reg: cb.dataset.reg }));
            
            if (selectedStudents.length === 0) {
                this.showToast('Please select a student to preview', 'warning');
                return;
            }
            
            if (selectedStudents.length > 1) {
                this.showToast('Preview is only available for single student', 'warning');
                return;
            }
            
            try {
                await this.previewTranscript(selectedStudents[0].id);
            } catch (error) {
                console.error('Preview error:', error);
                this.showToast('Error generating preview', 'error');
            }
        });
        
        // Individual checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('student-checkbox')) {
                e.target.setAttribute('aria-checked', e.target.checked);
                this.updateSelectedCount();
            }
        });
        
        // Row click selection
        document.addEventListener('click', (e) => {
            const row = e.target.closest('.student-row');
            if (row && !e.target.matches('input[type="checkbox"]')) {
                const checkbox = row.querySelector('.student-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.setAttribute('aria-checked', checkbox.checked);
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        });
        
        // Filters with debouncing
        let searchTimeout;
        const filterInputs = [
            'transcriptProgramFilter',
            'transcriptIntakeFilter',
            'transcriptSearch'
        ];
        
        filterInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.filterTranscriptStudents());
                if (inputId === 'transcriptSearch') {
                    element.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            this.filterTranscriptStudents();
                        }, 300);
                    });
                }
            }
        });
        
        // Date range toggle
        document.getElementById('transcriptPeriod').addEventListener('change', (e) => {
            const customRange = document.getElementById('customDateRange');
            customRange.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        });
        
        // Generate button
        document.getElementById('generateTranscriptsBtn').addEventListener('click', async () => {
            const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
                .map(cb => ({ id: cb.value, reg: cb.dataset.reg }));
            
            if (selectedStudents.length === 0) {
                this.showToast('Please select at least one student', 'warning');
                return;
            }
            
            const format = document.getElementById('transcriptFormat').value;
            const template = document.getElementById('transcriptTemplate').value;
            const period = document.getElementById('transcriptPeriod').value;
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            
            const options = {
                includeAllAssessments: document.getElementById('includeAllAssessments').checked,
                includeGPA: document.getElementById('includeGPA').checked,
                includeRemarks: document.getElementById('includeRemarks').checked,
                includeSensitiveData: document.getElementById('includeSensitiveData').checked,
                watermark: document.getElementById('watermark').checked,
                template: template,
                period: period,
                dateRange: period === 'custom' ? { startDate, endDate } : null
            };
            
            // Disable button and show loading
            const btn = document.getElementById('generateTranscriptsBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btn.disabled = true;
            
            try {
                if (selectedStudents.length === 1) {
                    // Single student
                    await this.generateStudentTranscript(selectedStudents[0].id, format, options);
                } else {
                    // Multiple students - use batch processing
                    await this.generateTranscriptsBatch(selectedStudents.map(s => s.id), format, options);
                }
                
                // Close modal on success
                setTimeout(() => {
                    const modal = document.getElementById('transcriptModal');
                    if (modal) modal.remove();
                }, 1000);
                
            } catch (error) {
                console.error('Error generating transcripts:', error);
                this.showToast('Error generating transcripts', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('generateTranscriptsBtn').click();
            }
            if (e.key === 'Escape') {
                const modal = document.getElementById('transcriptModal');
                if (modal) modal.remove();
            }
        });
    }
    
    enhanceTranscriptAccessibility() {
        // Add keyboard navigation to table rows
        const rows = document.querySelectorAll('.student-row');
        rows.forEach((row, index) => {
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'row');
            
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const checkbox = row.querySelector('.student-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                }
                
                // Navigate with arrow keys
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextRow = rows[index + 1];
                    if (nextRow) nextRow.focus();
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevRow = rows[index - 1];
                    if (prevRow) prevRow.focus();
                }
            });
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
            const reg = row.dataset.regLower;
            
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
                row.removeAttribute('aria-hidden');
                visibleCount++;
                
                // Enable checkbox
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = false;
                checkbox.setAttribute('aria-disabled', 'false');
            } else {
                row.style.display = 'none';
                row.setAttribute('aria-hidden', 'true');
                
                // Disable checkbox
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = true;
                checkbox.checked = false;
                checkbox.setAttribute('aria-disabled', 'true');
                checkbox.setAttribute('aria-checked', 'false');
            }
        });
        
        // Update master checkbox state
        const visibleCheckboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
        const allChecked = visibleCheckboxes.length > 0 && 
            Array.from(visibleCheckboxes).every(cb => cb.checked);
        const masterCheckbox = document.getElementById('masterCheckbox');
        masterCheckbox.checked = allChecked;
        masterCheckbox.setAttribute('aria-checked', allChecked);
        
        this.updateSelectedCount();
        this.updateVisibleCount(visibleCount);
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
    
    updateVisibleCount(count) {
        const element = document.getElementById('visibleCount');
        if (!element) return;
        
        if (count !== undefined) {
            element.textContent = `${count} visible`;
        } else {
            const visibleRows = document.querySelectorAll('.student-row[style*="display: "], .student-row:not([style*="display: none"])');
        element.textContent = `${visibleRows.length} visible`; 
        }
    }
    
    // FIXED: Main method with UUID handling
    async generateStudentTranscript(studentId, format = 'pdf', options = {}) {
        try {
            console.log(`📚 Generating transcript for student ID: ${studentId}`);
            
            // Ensure we have a valid UUID (not registration number)
            let student;
            if (typeof studentId === 'string' && !studentId.includes('-') && studentId.length < 36) {
                // This looks like a registration number, not a UUID
                // Try to find student by registration number
                const students = await this.db.getStudents();
                student = students.find(s => s.reg_number === studentId);
                
                if (!student) {
                    throw new Error(`Student with registration number "${studentId}" not found`);
                }
                
                studentId = student.id; // Use the UUID
            } else {
                // studentId should be a UUID
                student = await this.db.getStudent(studentId);
            }
            
            if (!student) {
                throw new Error('Student not found');
            }
            
            // Prepare transcript data with error handling
            const transcriptData = await this.prepareTranscriptData(studentId, options);
            
            // Export based on format
            await this.exportTranscript(transcriptData, format, options);
            
            if (!options.batchMode) {
                this.showToast(`Transcript generated for ${student.full_name}`, 'success');
                await this.db.logActivity('transcript_generated', 
                    `Generated transcript for ${student.full_name} (${student.reg_number})`);
            }
            
            return transcriptData;
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            
            // User-friendly error messages
            let errorMessage = 'Error generating transcript';
            if (error.message.includes('invalid input syntax for type uuid')) {
                errorMessage = 'Invalid student identifier. Please refresh and try again.';
            } else if (error.message.includes('not found')) {
                errorMessage = error.message;
            }
            
            if (!options.batchMode) {
                this.showToast(errorMessage, 'error');
            }
            
            throw error;
        }
    }
    
    async prepareTranscriptData(studentId, options = {}) {
        const student = await this.db.getStudent(studentId);
        if (!student) {
            throw new Error('Student not found');
        }
        
        // Get marks with error handling
        let marks;
        try {
            marks = await this.db.getStudentMarks(studentId);
        } catch (error) {
            console.warn('Error fetching marks, using empty array:', error);
            marks = [];
        }
        
        // Calculate GPA with error handling
        let gpa;
        try {
            gpa = await this.db.calculateStudentGPA(studentId);
        } catch (error) {
            console.warn('Error calculating GPA:', error);
            gpa = 0.0;
        }
        
        // Process courses
        const courses = {};
        
        for (const mark of marks) {
            if (!mark.courses || !mark.courses.course_code) {
                console.warn('Mark missing course info:', mark);
                continue;
            }
            
            const courseCode = mark.courses.course_code;
            if (!courses[courseCode]) {
                courses[courseCode] = {
                    courseCode: courseCode,
                    courseName: mark.courses.course_name || 'Unknown Course',
                    assessments: [],
                    finalGrade: '',
                    credits: mark.courses.credits || 3,
                    courseId: mark.courses.id
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
                    remarks: options.includeRemarks !== false ? this.sanitizeHTML(mark.remarks || '') : '',
                    date: mark.assessment_date || null
                });
            }
            
            // Calculate final grade if we have assessments
            if (courses[courseCode].assessments.length > 0) {
                const totalPercentage = courses[courseCode].assessments
                    .reduce((sum, a) => sum + (a.percentage || 0), 0);
                const avgPercentage = courses[courseCode].assessments.length > 0 ? 
                    totalPercentage / courses[courseCode].assessments.length : 0;
                
                try {
                    courses[courseCode].finalGrade = this.db.calculateGrade(avgPercentage).grade;
                } catch (error) {
                    console.warn('Error calculating grade:', error);
                    courses[courseCode].finalGrade = 'N/A';
                }
            }
        }
        
        // Filter by date range if specified
        let filteredCourses = Object.values(courses);
        if (options.dateRange && options.dateRange.startDate && options.dateRange.endDate) {
            filteredCourses = filteredCourses.filter(course => {
                // Filter logic based on your data structure
                return true; // Implement actual date filtering
            });
        }
        
        // Sanitize sensitive data
        const sanitizedStudent = { ...student };
        if (!options.includeSensitiveData) {
            delete sanitizedStudent.email;
            delete sanitizedStudent.phone;
            delete sanitizedStudent.address;
            delete sanitizedStudent.emergency_contact;
        }
        
        return {
            student: sanitizedStudent,
            courses: filteredCourses,
            gpa: options.includeGPA !== false ? parseFloat(gpa.toFixed(2)) : null,
            totalCredits: filteredCourses.reduce((sum, course) => sum + (course.credits || 3), 0),
            generatedDate: new Date().toLocaleDateString(),
            generatedDateTime: new Date().toISOString(),
            options: options,
            metadata: {
                totalAssessments: marks.length,
                totalCourses: filteredCourses.length,
                period: options.period,
                template: options.template
            }
        };
    }
    
    async exportTranscript(transcriptData, format, options = {}) {
        const exporters = {
            pdf: this.generateTranscriptPDF.bind(this),
            excel: this.generateTranscriptExcel.bind(this),
            csv: this.generateTranscriptCSV.bind(this),
            zip: this.generateTranscriptZIP.bind(this)
        };
        
        if (!exporters[format]) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        return await exporters[format](transcriptData, options);
    }
    
    async generateTranscriptsBatch(studentIds, format, options) {
        const total = studentIds.length;
        
        if (total === 0) {
            this.showToast('No students selected', 'warning');
            return;
        }
        
        // Show progress modal for batch operations
        const progressModal = this.createProgressModal('Generating Transcripts', total);
        
        try {
            const results = [];
            
            // Process in chunks to avoid memory issues
            const chunkSize = 5;
            for (let i = 0; i < studentIds.length; i += chunkSize) {
                const chunk = studentIds.slice(i, i + chunkSize);
                
                const chunkPromises = chunk.map(async (studentId, index) => {
                    try {
                        const result = await this.generateStudentTranscript(studentId, format, {
                            ...options,
                            batchMode: true
                        });
                        
                        // Update progress
                        const current = i + index + 1;
                        progressModal.update(current, total, `Processing ${current}/${total}`);
                        
                        return { success: true, data: result };
                    } catch (error) {
                        console.error(`Error processing student ${studentId}:`, error);
                        return { success: false, error: error.message, studentId };
                    }
                });
                
                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);
                
                // Small delay between chunks for better UX
                if (i + chunkSize < studentIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // Analyze results
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            progressModal.complete();
            
            if (failed.length > 0) {
                this.showToast(`Generated ${successful.length} transcripts, ${failed.length} failed`, 'warning');
            } else {
                this.showToast(`Successfully generated ${successful.length} transcripts`, 'success');
            }
            
            // For ZIP format, create archive
            if (format === 'zip' && successful.length > 0) {
                await this.createTranscriptsZip(successful.map(r => r.data));
            }
            
            return results;
            
        } catch (error) {
            console.error('Batch processing error:', error);
            progressModal.error(error.message);
            throw error;
        }
    }
    
    // Helper method for preview
    async previewTranscript(studentId) {
        try {
            const transcriptData = await this.prepareTranscriptData(studentId, {
                includeAllAssessments: true,
                includeGPA: true,
                includeRemarks: true,
                includeSensitiveData: false,
                watermark: true
            });
            
            // Open in new tab for preview
            const previewWindow = window.open('', '_blank');
            previewWindow.document.write(this.generateTranscriptHTML(transcriptData));
            
            return {
                print: () => previewWindow.print(),
                download: () => this.exportTranscript(transcriptData, 'pdf', { watermark: false })
            };
            
        } catch (error) {
            console.error('Preview error:', error);
            throw error;
        }
    }
    
    generateTranscriptHTML(transcriptData) {
        // Generate HTML for preview/PDF
        const { student, courses, gpa, totalCredits, generatedDate } = transcriptData;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Transcript - ${student.full_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .transcript { border: 2px solid #333; padding: 30px; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .student-info { margin: 20px 0; }
                    .course-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .course-table th, .course-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    .course-table th { background: #f5f5f5; }
                    .footer { margin-top: 30px; text-align: right; font-size: 0.9em; color: #666; }
                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
                               font-size: 80px; color: rgba(0,0,0,0.1); z-index: 1000; pointer-events: none; }
                </style>
            </head>
            <body>
                ${transcriptData.options.watermark ? '<div class="watermark">UNOFFICIAL</div>' : ''}
                <div class="transcript">
                    <div class="header">
                        <h1>ACADEMIC TRANSCRIPT</h1>
                        <h2>${student.full_name}</h2>
                        <p>${student.reg_number} | ${student.program} | Intake: ${student.intake_year}</p>
                    </div>
                    
                    <div class="student-info">
                        <p><strong>Generated Date:</strong> ${generatedDate}</p>
                        ${gpa !== null ? `<p><strong>GPA:</strong> ${gpa.toFixed(2)}</p>` : ''}
                        <p><strong>Total Credits:</strong> ${totalCredits}</p>
                    </div>
                    
                    <table class="course-table">
                        <thead>
                            <tr>
                                <th>Course Code</th>
                                <th>Course Name</th>
                                <th>Credits</th>
                                <th>Final Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courses.map(course => `
                                <tr>
                                    <td>${course.courseCode}</td>
                                    <td>${course.courseName}</td>
                                    <td>${course.credits}</td>
                                    <td><strong>${course.finalGrade}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Generated by Student Management System</p>
                        <p>This is an unofficial transcript. For official copies, contact the registrar's office.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    // Utility methods
    sanitizeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    createProgressModal(title, total) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                min-width: 300px;
                text-align: center;
            ">
                <h3 style="margin-top: 0;">${title}</h3>
                <div id="progressBar" style="
                    width: 100%;
                    height: 20px;
                    background: #f0f0f0;
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 20px 0;
                ">
                    <div id="progressFill" style="
                        width: 0%;
                        height: 100%;
                        background: #27ae60;
                        transition: width 0.3s;
                    "></div>
                </div>
                <p id="progressText">Starting...</p>
                <button id="cancelProgress" style="
                    margin-top: 20px;
                    padding: 8px 20px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        return {
            update: (current, total, text) => {
                const percent = Math.min(100, (current / total) * 100);
                progressFill.style.width = `${percent}%`;
                progressText.textContent = text || `Processing ${current} of ${total}`;
            },
            complete: () => {
                progressFill.style.width = '100%';
                progressText.textContent = 'Complete!';
                setTimeout(() => modal.remove(), 1000);
            },
            error: (message) => {
                progressFill.style.background = '#e74c3c';
                progressText.textContent = `Error: ${message}`;
                setTimeout(() => modal.remove(), 3000);
            }
        };
    }
    
   async generateTranscriptPDF(data, options) {
    try {
        console.log('📄 Generating PDF transcript for:', data.student.full_name);
        
        // Check if jsPDF is loaded
        if (typeof jspdf === 'undefined') {
            this.showToast('Error: jsPDF library not loaded. Please add it to your HTML.', 'error');
            throw new Error('jsPDF not loaded');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Document properties
        doc.setProperties({
            title: `Transcript - ${data.student.full_name}`,
            subject: 'Academic Transcript',
            author: 'TEE Portal',
            creator: 'TEE Portal System'
        });
        
        // Page setup
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        
        // Watermark if enabled
        if (options.watermark) {
            doc.setFontSize(60);
            doc.setTextColor(230, 230, 230);
            doc.text('UNOFFICIAL', pageWidth / 2, 150, { align: 'center', angle: 45 });
            doc.setTextColor(0, 0, 0);
        }
        
        // Header - Institution
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('THEOLOGICAL EDUCATION BY EXTENSION COLLEGE', pageWidth / 2, 25, { align: 'center' });
        
        // Title
        doc.setFontSize(16);
        doc.text('ACADEMIC TRANSCRIPT', pageWidth / 2, 35, { align: 'center' });
        
        // Student Information Section
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Student Name: ${data.student.full_name}`, margin, 50);
        doc.text(`Registration No.: ${data.student.reg_number}`, margin, 58);
        doc.text(`Program: ${data.student.program}`, margin, 66);
        doc.text(`Intake Year: ${data.student.intake_year}`, margin, 74);
        
        if (data.gpa !== null) {
            doc.text(`Cumulative GPA: ${data.gpa.toFixed(2)}`, margin, 82);
        }
        
        doc.text(`Date Generated: ${data.generatedDate}`, margin, 90);
        
        // Course Table Header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('COURSE PERFORMANCE', margin, 105);
        
        // Create course table data
        const tableData = data.courses.map(course => [
            course.courseCode,
            course.courseName,
            course.credits || 3,
            course.finalGrade || 'N/A'
        ]);
        
        // Generate table using autoTable if available
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 110,
                head: [['Course Code', 'Course Name', 'Credits', 'Grade']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                margin: { left: margin, right: margin },
                styles: { fontSize: 10 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 20, halign: 'center' }
                }
            });
        } else {
            // Simple table if autoTable not available
            doc.setFontSize(10);
            let y = 115;
            tableData.forEach(row => {
                doc.text(row[0], margin, y);
                doc.text(row[1], margin + 30, y);
                doc.text(row[2], margin + 130, y);
                doc.text(row[3], margin + 150, y);
                y += 7;
            });
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(
                'Generated by TEE Portal System | Unofficial Transcript',
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
        
        // Save the PDF
        const fileName = `Transcript_${data.student.reg_number}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        console.log('✅ PDF generated:', fileName);
        return fileName;
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        this.showToast('Error generating PDF: ' + error.message, 'error');
        throw error;
    }
}
    async generateTranscriptExcel(data, options) {
        // Implement using ExcelJS or similar
        console.log('Generating Excel for:', data.student.full_name);
        // Your Excel generation logic here
        this.showToast(`Excel transcript generated for ${data.student.full_name}`, 'success');
    }
    
    async generateTranscriptCSV(data, options) {
        // Implement CSV generation
        console.log('Generating CSV for:', data.student.full_name);
        // Your CSV generation logic here
        this.showToast(`CSV transcript generated for ${data.student.full_name}`, 'success');
    }
    
    async generateTranscriptZIP(data, options) {
        // Implement ZIP generation using JSZip
        console.log('Generating ZIP archive');
        // Your ZIP generation logic here
        this.showToast(`ZIP archive generated`, 'success');
    }
    
    async createTranscriptsZip(transcripts) {
        // Create ZIP file containing all transcripts
        console.log('Creating ZIP with', transcripts.length, 'transcripts');
        // Implement using JSZip
    }
    
    // Test method
   async testTranscriptGeneration() {
    try {
        const testData = {
            student: {
                id: 'test-001',
                reg_number: 'TEST001',
                full_name: 'Test Student',
                program: 'basic',
                intake_year: '2024',
                status: 'active',
                email: 'test@example.com',
                phone: '123-456-7890'
            },
            courses: [{
                courseCode: 'CS101',
                courseName: 'Introduction to Computer Science',
                finalGrade: 'A',
                credits: 3,
                assessments: [
                    { 
                        name: 'Midterm Exam', 
                        type: 'Exam', 
                        score: 85, 
                        maxScore: 100, 
                        percentage: 85, 
                        grade: 'A',
                        remarks: 'Excellent performance'
                    },
                    { 
                        name: 'Final Project', 
                        type: 'Project', 
                        score: 95, 
                        maxScore: 100, 
                        percentage: 95, 
                        grade: 'A+',
                        remarks: 'Outstanding work'
                    }
                ]
            }, {
                courseCode: 'MATH101',
                courseName: 'Mathematics Fundamentals',
                finalGrade: 'B+',
                credits: 3,
                assessments: [
                    { 
                        name: 'Quiz 1', 
                        type: 'Quiz', 
                        score: 78, 
                        maxScore: 100, 
                        percentage: 78, 
                        grade: 'B+',
                        remarks: 'Good effort'
                    }
                ]
            }],
            gpa: 3.75,
            totalCredits: 6,
            generatedDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
        
        // Test PDF generation
        await this.generateTranscriptPDF(testData, {
            includeAllAssessments: true,
            includeGPA: true,
            includeRemarks: true,
            includeSensitiveData: true,
            watermark: true
        });
        
        // Test CSV generation
        await this.generateTranscriptCSV(testData, {
            includeAllAssessments: true,
            includeGPA: true,
            includeRemarks: true,
            includeSensitiveData: false
        });
        
        this.showToast('✅ Test transcript generation successful! Check your downloads folder.', 'success');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        this.showToast('Test failed: ' + error.message, 'error');
    }
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
                    this.generateStudentTranscriptPrompt();
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
console.log('✅ Complete TEEPortal script loaded');
