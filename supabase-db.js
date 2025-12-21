// supabase-db.js - Supabase Backend Integration
class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }
    
    async init() {
        // Replace with your actual Supabase URL and Anon Key
        const supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
        
        try {
            this.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
            await this.testConnection();
            this.initialized = true;
            console.log('Supabase connected successfully');
        } catch (error) {
            console.error('Supabase connection failed:', error);
            this.initialized = false;
        }
    }
    
    async testConnection() {
        const { data, error } = await this.supabase
            .from('settings')
            .select('*')
            .limit(1);
            
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return true;
    }
    
    // ========== STUDENTS TABLE ==========
    async getStudents() {
        if (!this.initialized) return [];
        
        const { data, error } = await this.supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching students:', error);
            return [];
        }
        return data || [];
    }
    
    async addStudent(studentData) {
        if (!this.initialized) throw new Error('Database not connected');
        
        const { data, error } = await this.supabase
            .from('students')
            .insert([{
                reg_number: studentData.regNumber,
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
    }
    
    // ========== COURSES TABLE ==========
    async getCourses() {
        if (!this.initialized) return [];
        
        const { data, error } = await this.supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
        return data || [];
    }
    
    async addCourse(courseData) {
        if (!this.initialized) throw new Error('Database not connected');
        
        const { data, error } = await this.supabase
            .from('courses')
            .insert([{
                course_code: courseData.code,
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
    }
    
    // ========== MARKS TABLE ==========
    async getMarks() {
        if (!this.initialized) return [];
        
        const { data, error } = await this.supabase
            .from('marks')
            .select(`
                *,
                students:student_id (reg_number, full_name),
                courses:course_id (course_code, course_name)
            `)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching marks:', error);
            return [];
        }
        return data || [];
    }
    
    async addMark(markData) {
        if (!this.initialized) throw new Error('Database not connected');
        
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
                students:student_id (reg_number, full_name),
                courses:course_id (course_code, course_name)
            `)
            .single();
            
        if (error) throw error;
        return data;
    }
    
    async getStudentMarks(studentId) {
        if (!this.initialized) return [];
        
        const { data, error } = await this.supabase
            .from('marks')
            .select(`
                *,
                courses:course_id (course_code, course_name)
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching student marks:', error);
            return [];
        }
        return data || [];
    }
    
    async getCourseMarks(courseId) {
        if (!this.initialized) return [];
        
        const { data, error } = await this.supabase
            .from('marks')
            .select(`
                *,
                students:student_id (reg_number, full_name)
            `)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching course marks:', error);
            return [];
        }
        return data || [];
    }
    
    // ========== GRADING SYSTEM ==========
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
}
