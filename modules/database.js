// modules/database.js - Complete Supabase DB class from your code
class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.initPromise = null;
        this.settings = null;
        this.isInitializing = false;
    }
    
    async init() {
        // Your complete init() method
        if (this.initialized) return true;
        if (this.initPromise) return await this.initPromise;
        
        this.initPromise = this._init();
        return await this.initPromise;
    }
    
    async _init() {
        this.isInitializing = true;
        
        try {
            console.log('🔄 Initializing Supabase connection...');
            
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase client not loaded');
            }
            
            this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ Supabase connected successfully');
            await this.loadSettings();
            
            return true;
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.initialized = false;
            this.isInitializing = false;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }
    
    async testConnection() {
        // Your complete testConnection method
        if (!this.supabase) throw new Error('Supabase client not created yet');
        
        try {
            const { data, error } = await this.supabase
                .from('students')
                .select('count', { count: 'exact', head: true })
                .limit(1);
                
            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    console.warn('⚠️ Table might not exist yet');
                    return true;
                }
                throw error;
            }
            
            console.log('✅ Connection test passed');
            return true;
        } catch (error) {
            console.error('Connection test error:', error);
            if (error.message.includes('JWT') || error.message.includes('auth')) {
                throw new Error('Invalid Supabase credentials');
            }
            throw error;
        }
    }
    
    async ensureConnected() {
        if (!this.initialized && !this.isInitializing) await this.init();
        if (!this.supabase) throw new Error('Database connection not established');
        return this.supabase;
    }
    
    async loadSettings() {
        try {
            console.log('📋 Loading settings...');
            const settings = await this.getSettings();
            this.settings = settings;
            console.log('✅ Settings loaded');
            return settings;
        } catch (error) {
            console.warn('⚠️ Could not load settings, using defaults:', error.message);
            this.settings = this.getDefaultSettings();
            return this.settings;
        }
    }
    
 getDefaultSettings() {
    return {
        instituteName: 'Theological Education by Extension College',
        instituteAbbreviation: 'TEE College',
        academicYear: new Date().getFullYear(),
        semester: 'Spring',
        timezone: 'Africa/Nairobi',
        currency: 'KES',
        language: 'en',
        
        // FIXED: Use DISTINCTION/CREDIT/PASS/FAIL system
        gradingScale: {
            'DISTINCTION': { min: 85, max: 100, points: 4.0, description: 'Excellent - Outstanding achievement' },
            'CREDIT': { min: 70, max: 84, points: 3.0, description: 'Good - Above average achievement' },
            'PASS': { min: 50, max: 69, points: 2.0, description: 'Satisfactory - Minimum requirements met' },
            'FAIL': { min: 0, max: 49, points: 0.0, description: 'Fail - Requirements not met' }
        },
        
        programs: {
            'basic': { name: 'Basic TEE', duration: '2 years', maxCredits: 60 },
            'hnc': { name: 'Higher National Certificate', duration: '3 years', maxCredits: 90 },
            'advanced': { name: 'Advanced TEE', duration: '4 years', maxCredits: 120 }
        },
        system: {
            autoGenerateRegNumbers: true,
            allowMarkOverwrite: false,
            showGPA: true,
            enableEmailNotifications: false,
            defaultPassword: 'Welcome123',
            sessionTimeout: 30,
            maxLoginAttempts: 5,
            enableTwoFactor: false
        }
    };
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
                if (error.code === 'PGRST116') {
                    const defaults = this.getDefaultSettings();
                    this.settings = defaults;
                    return defaults;
                }
                throw error;
            }
            
            const defaultSettings = this.getDefaultSettings();
            const mergedSettings = { ...defaultSettings, ...(data.settings_data || {}) };
            this.settings = mergedSettings;
            return mergedSettings;
        } catch (error) {
            console.error('Error fetching settings:', error);
            const defaults = this.getDefaultSettings();
            this.settings = defaults;
            return defaults;
        }
    }

    async saveSettings(settingsData) {
        try {
            const supabase = await this.ensureConnected();
            
            const { data: existingSettings, error: fetchError } = await supabase
                .from('settings')
                .select('*')
                .limit(1)
                .maybeSingle();
                
            let result;
            
            if (existingSettings) {
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
            
            this.settings = settingsData;
            await this.logActivity('settings_updated', 'System settings updated');
            return result;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
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
            
            const { data: existingCourse, error: checkError } = await supabase
                .from('courses')
                .select('course_code')
                .eq('course_code', courseData.code.toUpperCase())
                .maybeSingle();
                
            if (existingCourse) {
                throw new Error(`Course code "${courseData.code}" already exists.`);
            }
            
            const course = {
                course_code: courseData.code.toUpperCase(),
                course_name: courseData.name,
                program: courseData.program,
                credits: courseData.credits || 3,
                description: courseData.description || '',
                status: 'active'
            };
            
            const { data, error } = await supabase
                .from('courses')
                .insert([course])
                .select()
                .single();
                
            if (error) {
                if (error.code === '23505') {
                    throw new Error(`Course code "${courseData.code.toUpperCase()}" already exists.`);
                } else if (error.code === '23502') {
                    throw new Error('Missing required fields.');
                } else if (error.code === '22P02') {
                    throw new Error('Invalid data format.');
                } else {
                    console.error('Supabase error details:', error);
                    throw new Error(`Failed to add course: ${error.message}`);
                }
            }
            
            await this.logActivity('course_added', `Added course: ${data.course_code}`);
            return data;
        } catch (error) {
            console.error('Error adding course:', error);
            if (error.message.includes('already exists')) {
                throw error;
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
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error fetching course:', error);
            throw error;
        }
    }

    async updateCourse(courseId, updateData) {
        try {
            const supabase = await this.ensureConnected();
            
            if (updateData.code) {
                const { data: existingCourse, error: checkError } = await supabase
                    .from('courses')
                    .select('id')
                    .eq('course_code', updateData.code.toUpperCase())
                    .neq('id', courseId)
                    .maybeSingle();
                    
                if (existingCourse) {
                    throw new Error(`Course code "${updateData.code}" is already used.`);
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

    async deleteCourse(courseId) {
        try {
            const supabase = await this.ensureConnected();
            
            const { data: course, error: checkError } = await supabase
                .from('courses')
                .select('course_code')
                .eq('id', courseId)
                .single();
                
            if (checkError) {
                if (checkError.code === 'PGRST116') throw new Error('Course not found');
                throw checkError;
            }
            
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
            
            const { data: existingMarks, error: checkError } = await supabase
                .from('marks')
                .select('*')
                .eq('student_id', markData.studentId)
                .eq('course_id', markData.courseId)
                .eq('assessment_name', markData.assessmentName)
                .maybeSingle();
                
            let result;
            
            if (existingMarks) {
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
            
            const { data: currentMark, error: fetchError } = await supabase
                .from('marks')
                .select('*')
                .eq('id', markId)
                .single();
                
            if (fetchError) throw fetchError;
            
            const score = updateData.score || currentMark.score;
            const maxScore = updateData.maxScore || currentMark.max_score;
            const percentage = (score / maxScore) * 100;
            const grade = this.calculateGrade(percentage);
            
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
            
            const { data: mark, error: fetchError } = await supabase
                .from('marks')
                .select('id, assessment_name')
                .eq('id', markId)
                .single();
                
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('Mark not found or already deleted:', fetchError);
            }
            
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
    if (typeof percentage !== 'number' || isNaN(percentage)) {
        return { grade: 'FAIL', points: 0.0 };
    }
    
    // Use DISTINCTION/CREDIT/PASS/FAIL system
    if (percentage >= 85) {
        return { grade: 'DISTINCTION', points: 4.0 };
    } else if (percentage >= 70) {
        return { grade: 'CREDIT', points: 3.0 };
    } else if (percentage >= 50) {
        return { grade: 'PASS', points: 2.0 };
    } else {
        return { grade: 'FAIL', points: 0.0 };
    }
}
    
   async calculateStudentGPA(studentId) {
    try {
        const marks = await this.getStudentMarks(studentId);
        if (marks.length === 0) return 0;
        
        // Filter out failed grades if you want (optional)
        const validMarks = marks.filter(mark => mark.grade !== 'FAIL');
        if (validMarks.length === 0) return 0;
        
        // Calculate weighted GPA based on credits
        let totalWeightedPoints = 0;
        let totalCredits = 0;
        
        for (const mark of validMarks) {
            const credits = mark.courses?.credits || 3; // Default 3 credits
            const gradePoints = mark.grade_points || 0;
            
            totalWeightedPoints += gradePoints * credits;
            totalCredits += credits;
        }
        
        if (totalCredits === 0) return 0;
        
        return parseFloat((totalWeightedPoints / totalCredits).toFixed(2));
    } catch (error) {
        console.error('Error calculating GPA:', error);
        return 0;
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
                
            if (error) console.error('Error logging activity:', error);
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
