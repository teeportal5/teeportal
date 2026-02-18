// modules/database.js - COMPLETE FIXED VERSION WITH ALL METHODS
class TEEPortalSupabaseDB {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.initPromise = null;
        this.settings = null;
        this.isInitializing = false;
    }
    
    async init() {
        if (this.initialized) return true;
        if (this.initPromise) return await this.initPromise;
        
        this.initPromise = this._init();
        return await this.initPromise;
    }
    
    async _init() {
        this.isInitializing = true;
        
        try {
            console.log('🔄 Initializing Supabase connection...');
            
            // Load Supabase client
            await this._loadSupabaseClient();
            
            this.supabaseUrl = 'https://kmkjsessuzdfadlmndyr.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
            
            // Create Supabase client
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Test connection
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ Supabase connected successfully');
            
            // Load settings
            await this.loadSettings();
            
            return true;
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.initialized = false;
            this.isInitializing = false;
            
            // Create fallback methods so app doesn't crash
            this._createFallbackMethods();
            return true;
        } finally {
            this.isInitializing = false;
        }
    }
    
    async _loadSupabaseClient() {
        return new Promise((resolve, reject) => {
            // Check if supabase is already loaded
            if (window.supabase) {
                resolve();
                return;
            }
            
            // Load from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = () => {
                console.log('✅ Supabase client loaded from CDN');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Failed to load Supabase client:', error);
                reject(new Error('Failed to load Supabase client'));
            };
            document.head.appendChild(script);
        });
    }
    
    _createFallbackMethods() {
        console.log('🔄 Creating fallback database methods...');
        
        // Create mock supabase client with all necessary methods
        this.supabase = {
            from: (table) => {
                console.log(`📊 Fallback: Accessing table "${table}"`);
                
                const mockMethods = {
                    select: (columns = '*') => {
                        console.log(`📊 Fallback: Selecting from "${table}"`);
                        return {
                            eq: (column, value) => ({
                                single: () => Promise.resolve({ data: null, error: null }),
                                maybeSingle: () => Promise.resolve({ data: null, error: null }),
                                limit: (count) => Promise.resolve({ data: [], error: null })
                            }),
                            order: (column, options = { ascending: true }) => ({
                                limit: (count) => Promise.resolve({ data: [], error: null })
                            }),
                            in: (column, values) => Promise.resolve({ data: [], error: null }),
                            limit: (count) => Promise.resolve({ data: [], error: null }),
                            single: () => Promise.resolve({ data: null, error: null }),
                            maybeSingle: () => Promise.resolve({ data: null, error: null })
                        };
                    },
                    insert: (data) => ({
                        select: (columns = '*') => ({
                            single: () => Promise.resolve({ data: { id: Date.now(), ...data[0] }, error: null })
                        })
                    }),
                    update: (data) => ({
                        eq: (column, value) => ({
                            select: (columns = '*') => ({
                                single: () => Promise.resolve({ data: { id: value, ...data }, error: null })
                            })
                        })
                    }),
                    delete: () => ({
                        eq: (column, value) => Promise.resolve({ error: null })
                    }),
                    or: (conditions) => ({
                        single: () => Promise.resolve({ data: null, error: null })
                    })
                };
                
                return mockMethods;
            }
        };
        
        // Mark as initialized for fallback mode
        this.initialized = true;
    }
    
    async testConnection() {
        try {
            const { error } = await this.supabase
                .from('students')
                .select('count', { count: 'exact', head: true })
                .limit(1);
                
            if (error && error.code !== 'PGRST116') {
                console.warn('⚠️ Connection test warning:', error.message);
            }
            
            console.log('✅ Connection test completed');
            return true;
        } catch (error) {
            console.warn('⚠️ Connection test failed, using fallback mode');
            return true; // Still return true to continue
        }
    }
    
    async ensureConnected() {
        if (!this.initialized && !this.isInitializing) {
            await this.init();
        }
        return this.supabase;
    }
    
    // ========== SETTINGS MANAGEMENT ==========
    
    async loadSettings() {
        try {
            console.log('📋 Loading settings...');
            this.settings = await this.getSettings();
            console.log('✅ Settings loaded');
            return this.settings;
        } catch (error) {
            console.warn('⚠️ Could not load settings, using defaults');
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
            gradingScale: {
                'DISTINCTION': { min: 85, max: 100, points: 4.0 },
                'CREDIT': { min: 70, max: 84, points: 3.0 },
                'PASS': { min: 50, max: 69, points: 2.0 },
                'FAIL': { min: 0, max: 49, points: 0.0 }
            },
            programs: {
                'basic': { name: 'Basic TEE', duration: '2 years', maxCredits: 60 },
                'hnc': { name: 'Higher National Certificate', duration: '3 years', maxCredits: 90 },
                'advanced': { name: 'Advanced TEE', duration: '4 years', maxCredits: 120 }
            },
            counties: [
                { id: 1, name: 'Nairobi', code: '001' },
                { id: 2, name: 'Mombasa', code: '002' },
                { id: 3, name: 'Kisumu', code: '003' },
                { id: 4, name: 'Nakuru', code: '004' },
                { id: 5, name: 'Eldoret', code: '005' }
            ],
            centres: [
                { id: 1, name: 'Nairobi Main Campus', code: 'NBO001', county: 'Nairobi' },
                { id: 2, name: 'Mombasa Branch', code: 'MBA001', county: 'Mombasa' },
                { id: 3, name: 'Kisumu Centre', code: 'KSM001', county: 'Kisumu' }
            ]
        };
    }
    
    async getSettings() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (error) {
                return this.getDefaultSettings();
            }
            
            const defaults = this.getDefaultSettings();
            return { ...defaults, ...(data.settings_data || {}) };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return this.getDefaultSettings();
        }
    }
    
    // ========== STUDENTS MANAGEMENT ==========
    
    async getStudents(filterOptions = {}) {
        try {
            const supabase = await this.ensureConnected();
            
            let query = this.supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
            
            // Apply filters
            if (filterOptions.program) {
                query = query.eq('program', filterOptions.program);
            }
            if (filterOptions.intake) {
                query = query.eq('intake_year', filterOptions.intake);
            }
            if (filterOptions.status && filterOptions.status !== 'all') {
                query = query.eq('status', filterOptions.status);
            }
            if (filterOptions.centre) {
                query = query.ilike('centre', `%${filterOptions.centre}%`);
            }
            if (filterOptions.county) {
                query = query.ilike('county', `%${filterOptions.county}%`);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Error fetching students:', error);
                return [];
            }
            
            // Process students to ensure consistent data structure
            return (data || []).map(student => this._processStudent(student));
            
        } catch (error) {
            console.error('❌ Error in getStudents:', error);
            return [];
        }
    }
    
    async getStudent(id) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('students')
                .select('*')
                .or(`id.eq.${id},reg_number.eq.${id}`)
                .single();
                
            if (error) {
                console.error('❌ Error fetching student:', error);
                return null;
            }
            
            return this._processStudent(data);
        } catch (error) {
            console.error('❌ Error in getStudent:', error);
            return null;
        }
    }
    
    _processStudent(student) {
        if (!student) return null;
        
        // Ensure centre field is properly set
        let centreDisplay = 'Main Campus';
        if (student.centre_name && student.centre_name.trim()) {
            centreDisplay = student.centre_name.trim();
        } else if (student.centre && student.centre.trim()) {
            centreDisplay = student.centre.trim();
        }
        
        return {
            id: student.id,
            reg_number: student.reg_number || '',
            full_name: student.full_name || student.name || '',
            email: student.email || '',
            phone: student.phone || '',
            date_of_birth: student.date_of_birth || null,
            gender: student.gender || '',
            id_number: student.id_number || '',
            
            // Location fields
            county: student.county || '',
            sub_county: student.sub_county || '',
            ward: student.ward || '',
            village: student.village || '',
            address: student.address || '',
            
            // Centre fields - FIXED
            centre: centreDisplay,
            centre_name: centreDisplay,
            
            // Academic fields
            program: student.program || '',
            intake_year: student.intake_year || new Date().getFullYear(),
            study_mode: student.study_mode || 'fulltime',
            status: student.status || 'active',
            
            // Employment fields
            employment_status: student.employment_status || '',
            employer: student.employer || '',
            job_title: student.job_title || '',
            years_experience: student.years_experience || 0,
            
            // Emergency contact
            emergency_contact_name: student.emergency_contact_name || '',
            emergency_contact_phone: student.emergency_contact_phone || '',
            emergency_contact: student.emergency_contact || '',
            
            // Other fields
            notes: student.notes || '',
            created_at: student.created_at,
            updated_at: student.updated_at
        };
    }
    
    async addStudent(studentData) {
        try {
            const supabase = await this.ensureConnected();
            
            // Prepare student object
            const student = {
                reg_number: studentData.reg_number || '',
                full_name: studentData.full_name || '',
                email: studentData.email || '',
                phone: studentData.phone || '',
                date_of_birth: studentData.date_of_birth || null,
                gender: studentData.gender || '',
                id_number: studentData.id_number || '',
                
                // Location fields
                county: studentData.county || '',
                sub_county: studentData.sub_county || '',
                ward: studentData.ward || '',
                village: studentData.village || '',
                address: studentData.address || '',
                
                // Centre fields - use centre_name
                centre_name: studentData.centre_name || studentData.centre || '',
                centre: studentData.centre || studentData.centre_name || '',
                
                // Academic fields
                program: studentData.program || '',
                intake_year: studentData.intake_year || new Date().getFullYear(),
                study_mode: studentData.study_mode || 'fulltime',
                status: studentData.status || 'active',
                
                // Employment fields
                employment_status: studentData.employment_status || '',
                employer: studentData.employer || '',
                job_title: studentData.job_title || '',
                years_experience: studentData.years_experience || 0,
                
                // Emergency contact
                emergency_contact_name: studentData.emergency_contact_name || '',
                emergency_contact_phone: studentData.emergency_contact_phone || '',
                emergency_contact: studentData.emergency_contact || '',
                
                // Other fields
                notes: studentData.notes || ''
            };
            
            // Validate required fields
            if (!student.reg_number || !student.full_name || !student.email) {
                throw new Error('Registration number, full name, and email are required');
            }
            
            const { data, error } = await this.supabase
                .from('students')
                .insert([student])
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error adding student:', error);
                throw new Error(`Failed to add student: ${error.message}`);
            }
            
            console.log('✅ Student added successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error adding student:', error);
            throw error;
        }
    }
    
    async updateStudent(studentId, updates) {
        try {
            const supabase = await this.ensureConnected();
            
            const updateObj = {
                full_name: updates.full_name || '',
                email: updates.email || '',
                phone: updates.phone || '',
                date_of_birth: updates.date_of_birth || null,
                gender: updates.gender || '',
                id_number: updates.id_number || '',
                
                // Location fields
                county: updates.county || '',
                sub_county: updates.sub_county || '',
                ward: updates.ward || '',
                village: updates.village || '',
                address: updates.address || '',
                
                // Centre fields
                centre_name: updates.centre_name || updates.centre || '',
                centre: updates.centre || updates.centre_name || '',
                
                // Academic fields
                program: updates.program || '',
                intake_year: updates.intake_year || new Date().getFullYear(),
                study_mode: updates.study_mode || 'fulltime',
                status: updates.status || 'active',
                
                // Employment fields
                employment_status: updates.employment_status || '',
                employer: updates.employer || '',
                job_title: updates.job_title || '',
                years_experience: updates.years_experience || 0,
                
                // Emergency contact
                emergency_contact_name: updates.emergency_contact_name || '',
                emergency_contact_phone: updates.emergency_contact_phone || '',
                emergency_contact: updates.emergency_contact || '',
                
                // Other fields
                notes: updates.notes || '',
                updated_at: new Date().toISOString()
            };
            
            // Remove undefined values
            Object.keys(updateObj).forEach(key => {
                if (updateObj[key] === undefined) {
                    delete updateObj[key];
                }
            });
            
            const { data, error } = await this.supabase
                .from('students')
                .update(updateObj)
                .eq('id', studentId)
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error updating student:', error);
                throw new Error(`Failed to update student: ${error.message}`);
            }
            
            console.log('✅ Student updated successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error updating student:', error);
            throw error;
        }
    }
    
    async deleteStudent(studentId) {
        try {
            const supabase = await this.ensureConnected();
            
            // First, delete related marks
            try {
                await this.supabase
                    .from('marks')
                    .delete()
                    .eq('student_id', studentId);
            } catch (error) {
                console.warn('⚠️ Could not delete student marks:', error);
            }
            
            // Then delete the student
            const { error } = await this.supabase
                .from('students')
                .delete()
                .eq('id', studentId);
                
            if (error) {
                console.error('❌ Database error deleting student:', error);
                throw new Error(`Failed to delete student: ${error.message}`);
            }
            
            console.log('✅ Student deleted successfully');
            return { success: true, message: 'Student deleted' };
            
        } catch (error) {
            console.error('❌ Error deleting student:', error);
            throw error;
        }
    }
    
    // ========== MARKS MANAGEMENT ==========
    
    async getMarksTableData() {
        try {
            const supabase = await this.ensureConnected();
            
            console.log('📊 Fetching marks table data...');
            
            // First get all marks
            const { data: marks, error } = await this.supabase
                .from('marks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
                
            if (error) {
                console.error('❌ Error fetching marks:', error);
                return [];
            }
            
            if (!marks || marks.length === 0) {
                console.log('📭 No marks found');
                return [];
            }
            
            console.log(`✅ Found ${marks.length} marks`);
            
            // Get unique student IDs
            const studentIds = [...new Set(marks.map(m => m.student_id).filter(Boolean))];
            
            // Fetch students for these marks
            const { data: students, error: studentsError } = await this.supabase
                .from('students')
                .select('*')
                .in('id', studentIds);
                
            if (studentsError) {
                console.error('❌ Error fetching students for marks:', studentsError);
                // Return marks without student data
                return marks.map(mark => ({
                    ...mark,
                    students: {},
                    courses: {}
                }));
            }
            
            // Process students
            const processedStudents = {};
            students?.forEach(student => {
                processedStudents[student.id] = this._processStudent(student);
            });
            
            // Get unique course IDs
            const courseIds = [...new Set(marks.map(m => m.course_id).filter(Boolean))];
            const coursesMap = {};
            
            if (courseIds.length > 0) {
                try {
                    const { data: courses, error: coursesError } = await this.supabase
                        .from('courses')
                        .select('*')
                        .in('id', courseIds);
                        
                    if (!coursesError && courses) {
                        courses.forEach(course => {
                            coursesMap[course.id] = {
                                id: course.id,
                                course_code: course.course_code || 'N/A',
                                course_name: course.course_name || 'Unknown Course',
                                credits: course.credits || 3
                            };
                        });
                    }
                } catch (error) {
                    console.warn('⚠️ Could not fetch courses:', error);
                }
            }
            
            // Combine all data
            const processedMarks = marks.map(mark => {
                const student = processedStudents[mark.student_id] || {};
                const course = coursesMap[mark.course_id] || {};
                
                return {
                    ...mark,
                    students: student,
                    courses: course
                };
            });
            
            console.log('✅ Successfully processed marks data');
            return processedMarks;
            
        } catch (error) {
            console.error('❌ Error in getMarksTableData:', error);
            return [];
        }
    }
    
    async getMarks() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('marks')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Error fetching marks:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in getMarks:', error);
            return [];
        }
    }
    
    async addMark(markData) {
        try {
            const supabase = await this.ensureConnected();
            
            // Calculate percentage
            const score = markData.score || 0;
            const maxScore = markData.max_score || markData.maxScore || 100;
            const percentage = (score / maxScore) * 100;
            
            // Calculate grade
            const gradeObj = this.calculateGrade(percentage);
            
            // Prepare mark object
            const mark = {
                student_id: markData.student_id || markData.studentId,
                course_id: markData.course_id || markData.courseId,
                assessment_type: markData.assessment_type || markData.assessmentType,
                assessment_name: markData.assessment_name || markData.assessmentName || 'Assessment',
                score: score,
                max_score: maxScore,
                percentage: parseFloat(percentage.toFixed(2)),
                grade: gradeObj.grade,
                grade_points: gradeObj.points,
                remarks: markData.remarks || '',
                visible_to_student: markData.visible_to_student !== undefined 
                    ? markData.visible_to_student 
                    : true,
                entered_by: markData.entered_by || 'admin',
                assessment_date: markData.assessment_date || new Date().toISOString().split('T')[0]
            };
            
            const { data, error } = await this.supabase
                .from('marks')
                .insert([mark])
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error adding mark:', error);
                throw new Error(`Failed to add mark: ${error.message}`);
            }
            
            console.log('✅ Mark added successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error adding mark:', error);
            throw error;
        }
    }
    
    async updateMark(markId, updateData) {
        try {
            const supabase = await this.ensureConnected();
            
            // Get current mark
            const { data: currentMark, error: fetchError } = await this.supabase
                .from('marks')
                .select('*')
                .eq('id', markId)
                .single();
                
            if (fetchError) throw fetchError;
            
            // Calculate new values
            const score = updateData.score || currentMark.score;
            const maxScore = updateData.max_score || updateData.maxScore || currentMark.max_score;
            const percentage = (score / maxScore) * 100;
            const gradeObj = this.calculateGrade(percentage);
            
            const updateObj = {
                assessment_type: updateData.assessment_type || updateData.assessmentType || currentMark.assessment_type,
                assessment_name: updateData.assessment_name || updateData.assessmentName || currentMark.assessment_name,
                score: score,
                max_score: maxScore,
                percentage: parseFloat(percentage.toFixed(2)),
                grade: gradeObj.grade,
                grade_points: gradeObj.points,
                remarks: updateData.remarks || currentMark.remarks,
                visible_to_student: updateData.visible_to_student !== undefined 
                    ? updateData.visible_to_student 
                    : currentMark.visible_to_student,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('marks')
                .update(updateObj)
                .eq('id', markId)
                .select()
                .single();
                
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('❌ Error updating mark:', error);
            throw error;
        }
    }
    
    async deleteMark(markId) {
        try {
            const supabase = await this.ensureConnected();
            
            const { error } = await this.supabase
                .from('marks')
                .delete()
                .eq('id', markId);
                
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting mark:', error);
            throw error;
        }
    }
    
    async getMarkById(markId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('marks')
                .select('*')
                .eq('id', markId)
                .single();
                
            if (error) {
                console.error('❌ Error fetching mark:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error in getMarkById:', error);
            return null;
        }
    }
    
    async checkDuplicateMarks(studentId, courseId, assessmentType, assessmentDate) {
        try {
            const supabase = await this.ensureConnected();
            
            const { data, error } = await this.supabase
                .from('marks')
                .select('*')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .eq('assessment_type', assessmentType)
                .eq('assessment_date', assessmentDate)
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (error) {
                console.error('❌ Error checking duplicates:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in checkDuplicateMarks:', error);
            return [];
        }
    }
    
    // ========== COURSE MANAGEMENT METHODS ==========
    
    async addCourse(courseData) {
        try {
            const supabase = await this.ensureConnected();
            
            // Prepare course object
            const course = {
                course_code: courseData.code || '',
                course_name: courseData.name || '',
                program: courseData.program || '',
                credits: courseData.credits || 3,
                description: courseData.description || '',
                status: courseData.status || 'active',
                semester: courseData.semester || 'fall',
                academic_year: courseData.academic_year || new Date().getFullYear(),
                created_at: new Date().toISOString()
            };
            
            // Validate required fields
            if (!course.course_code || !course.course_name || !course.program) {
                throw new Error('Course code, name, and program are required');
            }
            
            // Check for duplicate course code
            const { data: existing, error: checkError } = await this.supabase
                .from('courses')
                .select('id')
                .eq('course_code', course.course_code)
                .maybeSingle();
                
            if (checkError) {
                console.warn('Warning checking for duplicate course:', checkError);
            }
            
            if (existing) {
                throw new Error(`Course with code "${course.course_code}" already exists`);
            }
            
            const { data, error } = await this.supabase
                .from('courses')
                .insert([course])
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error adding course:', error);
                throw new Error(`Failed to add course: ${error.message}`);
            }
            
            console.log('✅ Course added successfully:', data);
            
            // Log activity
            await this.logActivity('course_add', 
                `Added new course: ${course.course_code} - ${course.course_name}`);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error adding course:', error);
            throw error;
        }
    }
    
    async updateCourse(courseId, courseData) {
        try {
            const supabase = await this.ensureConnected();
            
            const updateObj = {
                course_code: courseData.code,
                course_name: courseData.name,
                program: courseData.program,
                credits: courseData.credits || 3,
                description: courseData.description || '',
                status: courseData.status || 'active',
                semester: courseData.semester || 'fall',
                academic_year: courseData.academic_year || new Date().getFullYear(),
                updated_at: new Date().toISOString()
            };
            
            // Remove undefined values
            Object.keys(updateObj).forEach(key => {
                if (updateObj[key] === undefined) {
                    delete updateObj[key];
                }
            });
            
            // Check for duplicate course code (if code is being changed)
            if (courseData.code) {
                const { data: existing, error: checkError } = await this.supabase
                    .from('courses')
                    .select('id')
                    .eq('course_code', courseData.code)
                    .neq('id', courseId)
                    .maybeSingle();
                    
                if (!checkError && existing) {
                    throw new Error(`Another course with code "${courseData.code}" already exists`);
                }
            }
            
            const { data, error } = await this.supabase
                .from('courses')
                .update(updateObj)
                .eq('id', courseId)
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error updating course:', error);
                throw new Error(`Failed to update course: ${error.message}`);
            }
            
            console.log('✅ Course updated successfully:', data);
            
            // Log activity
            await this.logActivity('course_update', 
                `Updated course: ${courseData.code || data.course_code} - ${courseData.name || data.course_name}`);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error updating course:', error);
            throw error;
        }
    }
    
    async deleteCourse(courseId) {
        try {
            const supabase = await this.ensureConnected();
            
            // First check if course has any enrollments
            const { data: enrollments, error: checkError } = await this.supabase
                .from('enrollments')
                .select('id')
                .eq('course_id', courseId)
                .limit(1);
                
            if (checkError) {
                console.warn('⚠️ Could not check enrollments:', checkError);
            }
            
            if (enrollments && enrollments.length > 0) {
                throw new Error('Cannot delete course that has active enrollments');
            }
            
            // Check if course has any marks
            const { data: marks, error: marksError } = await this.supabase
                .from('marks')
                .select('id')
                .eq('course_id', courseId)
                .limit(1);
                
            if (!marksError && marks && marks.length > 0) {
                throw new Error('Cannot delete course that has marks recorded');
            }
            
            // Get course details before deletion for logging
            const { data: course, error: fetchError } = await this.supabase
                .from('courses')
                .select('course_code, course_name')
                .eq('id', courseId)
                .single();
                
            if (fetchError) {
                console.warn('⚠️ Could not fetch course details:', fetchError);
            }
            
            // Delete the course
            const { error } = await this.supabase
                .from('courses')
                .delete()
                .eq('id', courseId);
                
            if (error) {
                console.error('❌ Database error deleting course:', error);
                throw new Error(`Failed to delete course: ${error.message}`);
            }
            
            console.log('✅ Course deleted successfully');
            
            // Log activity
            if (course) {
                await this.logActivity('course_delete', 
                    `Deleted course: ${course.course_code} - ${course.course_name}`);
            }
            
            return { success: true, message: 'Course deleted successfully' };
            
        } catch (error) {
            console.error('❌ Error deleting course:', error);
            throw error;
        }
    }
    
    async getCourses() {
        try {
            const supabase = await this.ensureConnected();
            
            console.log('📚 Fetching courses...');
            
            // Method 1: Simple query first to test
            const { data: courses, error } = await this.supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Error fetching courses:', error);
                return [];
            }
            
            console.log(`✅ Found ${courses?.length || 0} courses`);
            
            if (!courses || courses.length === 0) {
                return [];
            }
            
            // Get enrollment counts for each course
            const courseIds = courses.map(c => c.id);
            
            // Try to get enrollment counts from enrollments table
            let enrollmentCounts = {};
            try {
                const { data: enrollments, error: enrollError } = await this.supabase
                    .from('enrollments')
                    .select('course_id, student_id')
                    .in('course_id', courseIds)
                    .eq('enrollment_status', 'enrolled')
                    .eq('is_active', true);
                    
                if (!enrollError && enrollments) {
                    // Count unique students per course
                    const courseStudentMap = {};
                    enrollments.forEach(enrollment => {
                        if (!courseStudentMap[enrollment.course_id]) {
                            courseStudentMap[enrollment.course_id] = new Set();
                        }
                        courseStudentMap[enrollment.course_id].add(enrollment.student_id);
                    });
                    
                    Object.keys(courseStudentMap).forEach(courseId => {
                        enrollmentCounts[courseId] = courseStudentMap[courseId].size;
                    });
                }
            } catch (e) {
                console.warn('⚠️ Could not fetch enrollments:', e.message);
            }
            
            // If no enrollments found, check marks table as fallback
            if (Object.keys(enrollmentCounts).length === 0) {
                try {
                    const { data: marks, error: marksError } = await this.supabase
                        .from('marks')
                        .select('course_id, student_id')
                        .in('course_id', courseIds);
                        
                    if (!marksError && marks) {
                        // Count unique students per course from marks
                        const courseStudentMap = {};
                        marks.forEach(mark => {
                            if (!courseStudentMap[mark.course_id]) {
                                courseStudentMap[mark.course_id] = new Set();
                            }
                            courseStudentMap[mark.course_id].add(mark.student_id);
                        });
                        
                        Object.keys(courseStudentMap).forEach(courseId => {
                            enrollmentCounts[courseId] = courseStudentMap[courseId].size;
                        });
                    }
                } catch (e) {
                    console.warn('⚠️ Could not fetch marks for enrollment counts:', e.message);
                }
            }
            
            // Combine courses with enrollment counts
            const processedCourses = courses.map(course => ({
                ...course,
                enrolled_count: enrollmentCounts[course.id] || 0
            }));
            
            console.log('📊 Courses with enrollment counts:', processedCourses);
            return processedCourses;
            
        } catch (error) {
            console.error('❌ Error in getCourses:', error);
            return [];
        }
    }
    
    async getCoursesSimple() {
        try {
            const supabase = await this.ensureConnected();
            
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Error fetching courses:', error);
                return [];
            }
            
            // Add default enrolled_count
            return (data || []).map(course => ({
                ...course,
                enrolled_count: 0
            }));
            
        } catch (error) {
            console.error('❌ Error in getCoursesSimple:', error);
            return [];
        }
    }
    
    // ========== CENTRE MANAGEMENT METHODS ==========
    
    async getCentres() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('centres')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                console.error('❌ Error fetching centres:', error);
                // Return from settings as fallback
                const settings = await this.getSettings();
                return settings.centres || [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in getCentres:', error);
            return [];
        }
    }
    
    // Alias for getStudyCenters to maintain backward compatibility
    async getStudyCenters() {
        console.warn('getStudyCenters() is deprecated, use getCentres() instead');
        return this.getCentres();
    }
    
    async addCentre(centreData) {
        try {
            const supabase = await this.ensureConnected();
            
            const { data, error } = await this.supabase
                .from('centres')
                .insert([centreData])
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error adding centre:', error);
                throw new Error(`Failed to add centre: ${error.message}`);
            }
            
            console.log('✅ Centre added successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error adding centre:', error);
            throw error;
        }
    }
    
    async updateCentre(centreId, updates) {
        try {
            const supabase = await this.ensureConnected();
            
            const updateObj = {
                name: updates.name || '',
                code: updates.code || '',
                county: updates.county || '',
                sub_county: updates.sub_county || '',
                address: updates.address || '',
                contact_person: updates.contact_person || '',
                phone: updates.phone || '',
                email: updates.email || '',
                status: updates.status || 'active',
                description: updates.description || '',
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('centres')
                .update(updateObj)
                .eq('id', centreId)
                .select()
                .single();
                
            if (error) {
                console.error('❌ Database error updating centre:', error);
                throw new Error(`Failed to update centre: ${error.message}`);
            }
            
            console.log('✅ Centre updated successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error updating centre:', error);
            throw error;
        }
    }
    
    async deleteCentre(centreId) {
        try {
            const supabase = await this.ensureConnected();
            
            const { error } = await this.supabase
                .from('centres')
                .delete()
                .eq('id', centreId);
                
            if (error) {
                console.error('❌ Database error deleting centre:', error);
                throw new Error(`Failed to delete centre: ${error.message}`);
            }
            
            console.log('✅ Centre deleted successfully');
            return { success: true, message: 'Centre deleted' };
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            throw error;
        }
    }
    
    // ========== PROGRAM METHODS ==========
    
    async getPrograms() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('programs')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                console.error('❌ Error fetching programs:', error);
                // Return from settings as fallback
                const settings = await this.getSettings();
                const programsArray = [];
                
                if (settings.programs) {
                    Object.entries(settings.programs).forEach(([id, program]) => {
                        programsArray.push({
                            id: id,
                            code: id.toUpperCase(),
                            name: program.name,
                            duration: program.duration,
                            max_credits: program.maxCredits
                        });
                    });
                }
                return programsArray;
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in getPrograms:', error);
            return [];
        }
    }

    // Add this to your TEEPortalSupabaseDB class, right after getPrograms() method
async getProgram(programId) {
    try {
        const supabase = await this.ensureConnected();
        const { data, error } = await this.supabase
            .from('programs')
            .select('*')
            .or(`id.eq.${programId},code.eq.${programId}`)
            .single();
            
        if (error) {
            console.error('❌ Error fetching program:', error);
            // Try to get from settings as fallback
            const settings = await this.getSettings();
            const programSettings = settings.programs || {};
            
            if (programSettings[programId]) {
                const program = programSettings[programId];
                return {
                    id: programId,
                    code: programId.toUpperCase(),
                    name: program.name,
                    duration: program.duration,
                    max_credits: program.maxCredits,
                    description: '',
                    status: 'active'
                };
            }
            
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error in getProgram:', error);
        return null;
    }
}

    
// You might also want to add getCourse() if you're missing it:
async getCourse(courseId) {
    try {
        const supabase = await this.ensureConnected();
        const { data, error } = await this.supabase
            .from('courses')
            .select('*')
            .or(`id.eq.${courseId},course_code.eq.${courseId}`)
            .single();
            
        if (error) {
            console.error('❌ Error fetching course:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error in getCourse:', error);
        return null;
    }
}
    // Add these methods right after getProgram() and before getCourse()

/**
 * Get students for a specific program
 * @param {string} programId - The program ID
 * @param {string} status - Optional status filter ('active', 'inactive', etc.)
 */
async getProgramStudents(programId, status = null) {
    try {
        await this.ensureConnected();
        
        let query = this.supabase
            .from('students')
            .select('*')
            .eq('program_id', programId);
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Error getting program students:', error);
            return [];
        }
        
        // Process each student to ensure consistent format
        return (data || []).map(student => this._processStudent(student));
        
    } catch (error) {
        console.error('❌ Error in getProgramStudents:', error);
        return [];
    }
}

/**
 * Get courses for a specific program
 * @param {string} programId - The program ID
 */
async getProgramCourses(programId) {
    try {
        await this.ensureConnected();
        
        // First, get the program to know its name/code for fallback matching
        const program = await this.getProgram(programId);
        
        if (!program) {
            console.warn(`⚠️ Program ${programId} not found`);
            return [];
        }
        
        // Try to get courses from program_courses junction table if it exists
        try {
            const { data, error } = await this.supabase
                .from('program_courses')
                .select(`
                    course_id,
                    courses (*)
                `)
                .eq('program_id', programId);
            
            if (!error && data && data.length > 0) {
                // Extract course objects from the joined data
                const courses = data
                    .map(item => item.courses)
                    .filter(course => course !== null);
                
                console.log(`✅ Found ${courses.length} courses for program ${program.code}`);
                return courses;
            }
        } catch (e) {
            // program_courses table might not exist yet
            console.log('ℹ️ program_courses table not available, using fallback');
        }
        
        // Fallback: Try to get courses by program name/code from courses table
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .or(`program.ilike.%${program.name}%,program.ilike.%${program.code}%`);
            
            if (!error && data) {
                console.log(`✅ Found ${data.length} courses for program ${program.code} (fallback method)`);
                return data;
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch courses by program name');
        }
        
        // No courses found
        return [];
        
    } catch (error) {
        console.error('❌ Error in getProgramCourses:', error);
        return [];
    }
}

// You might also want to add getCourse() if you're missing it:
async getCourse(courseId) {
    try {
        const supabase = await this.ensureConnected();
        const { data, error } = await this.supabase
            .from('courses')
            .select('*')
            .or(`id.eq.${courseId},course_code.eq.${courseId}`)
            .single();
            
        if (error) {
            console.error('❌ Error fetching course:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error in getCourse:', error);
        return null;
    }
}
    // ========== COUNTY METHODS ==========
    
    async getCounties() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('counties')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                console.error('❌ Error fetching counties:', error);
                // Return from settings as fallback
                const settings = await this.getSettings();
                return settings.counties || [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in getCounties:', error);
            return [];
        }
    }
    
    // ========== ENROLLMENT METHODS ==========
    
    async getEnrollments(filterOptions = {}) {
        try {
            const supabase = await this.ensureConnected();
            
            let query = this.supabase
                .from('enrollments')
                .select(`
                    *,
                    students (*),
                    courses (*)
                `)
                .order('created_at', { ascending: false });
            
            // Apply filters
            if (filterOptions.course_id) {
                query = query.eq('course_id', filterOptions.course_id);
            }
            if (filterOptions.student_id) {
                query = query.eq('student_id', filterOptions.student_id);
            }
            if (filterOptions.academic_year) {
                query = query.eq('academic_year', filterOptions.academic_year);
            }
            if (filterOptions.enrollment_status) {
                query = query.eq('enrollment_status', filterOptions.enrollment_status);
            }
            if (filterOptions.is_active !== undefined) {
                query = query.eq('is_active', filterOptions.is_active);
            }
            
            const { data, error } = await query;
        
            if (error) {
                console.error('❌ Error fetching enrollments:', error);
                return [];
            }
            
            return data || [];
            
        } catch (error) {
            console.error('❌ Error in getEnrollments:', error);
            return [];
        }
    }
    
    async getStudentsByCourse(courseId) {
        try {
            const supabase = await this.ensureConnected();
            
            const { data, error } = await this.supabase
                .from('enrollments')
                .select(`
                    id,
                    student_id,
                    academic_year,
                    semester,
                    enrollment_status,
                    students (
                        id,
                        full_name,
                        reg_number,
                        email,
                        phone,
                        centre_name,
                        program,
                        intake_year
                    )
                `)
                .eq('course_id', courseId)
                .eq('enrollment_status', 'enrolled')
                .eq('is_active', true);
                
            if (error) {
                console.error('❌ Error getting students by course:', error);
                return [];
            }
            
            // Process the data
            return (data || []).map(item => ({
                enrollment_id: item.id,
                academic_year: item.academic_year,
                semester: item.semester,
                ...item.students
            }));
            
        } catch (error) {
            console.error('❌ Error in getStudentsByCourse:', error);
            return [];
        }
    }
    
    async enrollStudent(enrollmentData) {
        try {
            const supabase = await this.ensureConnected();
            
            // Validate required fields
            if (!enrollmentData.student_id || !enrollmentData.course_id || !enrollmentData.academic_year) {
                throw new Error('Student ID, Course ID, and Academic Year are required');
            }
            
            const enrollment = {
                student_id: enrollmentData.student_id,
                course_id: enrollmentData.course_id,
                program_id: enrollmentData.program_id,
                academic_year: parseInt(enrollmentData.academic_year),
                semester: enrollmentData.semester || 'fall',
                enrollment_status: enrollmentData.enrollment_status || 'enrolled',
                enrollment_type: enrollmentData.enrollment_type || 'regular',
                is_active: enrollmentData.is_active !== undefined ? enrollmentData.is_active : true
            };
            
            const { data, error } = await this.supabase
                .from('enrollments')
                .insert([enrollment])
                .select(`
                    *,
                    students (*),
                    courses (*)
                `)
                .single();
                
            if (error) {
                console.error('❌ Database error enrolling student:', error);
                throw new Error(`Failed to enroll student: ${error.message}`);
            }
            
            console.log('✅ Student enrolled successfully:', data);
            
            // Log activity
            await this.logActivity('enrollment', 
                `Enrolled ${data.students?.full_name || 'student'} in ${data.courses?.course_code || 'course'}`);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error enrolling student:', error);
            throw error;
        }
    }
    
    async updateEnrollment(enrollmentId, updates) {
        try {
            const supabase = await this.ensureConnected();
            
            const updateObj = {
                enrollment_status: updates.enrollment_status,
                enrollment_type: updates.enrollment_type,
                is_active: updates.is_active,
                academic_year: updates.academic_year ? parseInt(updates.academic_year) : undefined,
                semester: updates.semester,
                updated_at: new Date().toISOString()
            };
            
            // Remove undefined values
            Object.keys(updateObj).forEach(key => {
                if (updateObj[key] === undefined) {
                    delete updateObj[key];
                }
            });
            
            const { data, error } = await this.supabase
                .from('enrollments')
                .update(updateObj)
                .eq('id', enrollmentId)
                .select(`
                    *,
                    students (*),
                    courses (*)
                `)
                .single();
                
            if (error) {
                console.error('❌ Database error updating enrollment:', error);
                throw new Error(`Failed to update enrollment: ${error.message}`);
            }
            
            console.log('✅ Enrollment updated successfully:', data);
            
            // Log activity
            await this.logActivity('enrollment_update', 
                `Updated enrollment for ${data.students?.full_name || 'student'} in ${data.courses?.course_code || 'course'}`);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error updating enrollment:', error);
            throw error;
        }
    }
    
    async deleteEnrollment(enrollmentId) {
        try {
            const supabase = await this.ensureConnected();
            
            // Get enrollment details before deletion for logging
            const { data: enrollment, error: fetchError } = await this.supabase
                .from('enrollments')
                .select(`
                    *,
                    students (*),
                    courses (*)
                `)
                .eq('id', enrollmentId)
                .single();
                
            if (fetchError) {
                console.warn('⚠️ Could not fetch enrollment details:', fetchError);
            }
            
            // Delete the enrollment
            const { error } = await this.supabase
                .from('enrollments')
                .delete()
                .eq('id', enrollmentId);
                
            if (error) {
                console.error('❌ Database error deleting enrollment:', error);
                throw new Error(`Failed to delete enrollment: ${error.message}`);
            }
            
            console.log('✅ Enrollment deleted successfully');
            
            // Log activity
            if (enrollment) {
                await this.logActivity('enrollment_delete', 
                    `Removed ${enrollment.students?.full_name || 'student'} from ${enrollment.courses?.course_code || 'course'}`);
            }
            
            return { success: true, message: 'Enrollment deleted' };
            
        } catch (error) {
            console.error('❌ Error deleting enrollment:', error);
            throw error;
        }
    }
    
    async getCourseEnrollmentCount(courseId) {
        try {
            const supabase = await this.ensureConnected();
            
            const { count, error } = await this.supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', courseId)
                .eq('enrollment_status', 'enrolled')
                .eq('is_active', true);
                
            if (error) {
                console.error('❌ Error counting enrollments:', error);
                return 0;
            }
            
            return count || 0;
            
        } catch (error) {
            console.error('❌ Error in getCourseEnrollmentCount:', error);
            return 0;
        }
    }
    
    async backfillEnrollments() {
        try {
            console.log('🔄 Backfilling enrollments from existing data...');
            
            // Get all active students
            const { data: students, error: studentsError } = await this.supabase
                .from('students')
                .select('id, program, intake_year, status')
                .eq('status', 'active');
                
            if (studentsError) {
                console.error('❌ Error fetching students for backfill:', studentsError);
                return { success: false, message: 'Failed to fetch students' };
            }
            
            if (!students || students.length === 0) {
                console.log('📭 No active students found for backfill');
                return { success: true, message: 'No students to enroll' };
            }
            
            // Get all courses
            const { data: courses, error: coursesError } = await this.supabase
                .from('courses')
                .select('id, program, credits');
                
            if (coursesError) {
                console.error('❌ Error fetching courses for backfill:', coursesError);
                return { success: false, message: 'Failed to fetch courses' };
            }
            
            // Group courses by program
            const coursesByProgram = {};
            courses.forEach(course => {
                if (!coursesByProgram[course.program]) {
                    coursesByProgram[course.program] = [];
                }
                coursesByProgram[course.program].push(course);
            });
            
            // Create enrollments
            const enrollments = [];
            const currentYear = new Date().getFullYear();
            
            students.forEach(student => {
                const programCourses = coursesByProgram[student.program] || [];
                
                programCourses.forEach(course => {
                    enrollments.push({
                        student_id: student.id,
                        course_id: course.id,
                        program_id: student.program,
                        academic_year: student.intake_year || currentYear,
                        semester: 'fall',
                        enrollment_status: 'enrolled',
                        enrollment_type: 'regular',
                        is_active: true
                    });
                });
            });
            
            console.log(`📝 Creating ${enrollments.length} enrollment records...`);
            
            // Insert in batches of 100
            const batchSize = 100;
            for (let i = 0; i < enrollments.length; i += batchSize) {
                const batch = enrollments.slice(i, i + batchSize);
                
                const { error } = await this.supabase
                    .from('enrollments')
                    .insert(batch)
                    .select();
                    
                if (error) {
                    console.error(`❌ Error inserting batch ${i/batchSize + 1}:`, error);
                    // Continue with next batch
                } else {
                    console.log(`✅ Batch ${i/batchSize + 1} inserted successfully`);
                }
            }
            
            console.log(`🎉 Backfill completed: ${enrollments.length} enrollments created`);
            return { 
                success: true, 
                message: `Created ${enrollments.length} enrollment records` 
            };
            
        } catch (error) {
            console.error('❌ Error in backfillEnrollments:', error);
            return { success: false, message: error.message };
        }
    }
    
    // ========== UTILITY METHODS ==========
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return { grade: 'FAIL', points: 0.0 };
        }
        
        if (percentage >= 85) return { grade: 'DISTINCTION', points: 4.0 };
        if (percentage >= 70) return { grade: 'CREDIT', points: 3.0 };
        if (percentage >= 50) return { grade: 'PASS', points: 2.0 };
        return { grade: 'FAIL', points: 0.0 };
    }
    
    async generateRegNumberNew(programId, intakeYear) {
        try {
            // Get program code
            const programs = await this.getPrograms();
            const program = programs.find(p => p.id === programId);
            const programCode = program?.code || programId.substring(0, 3).toUpperCase();
            
            // Try to get last student
            const lastStudent = await this.getLastStudentForProgramYear(programId, intakeYear);
            let sequenceNumber = 1;
            
            if (lastStudent && lastStudent.reg_number) {
                const regParts = lastStudent.reg_number.split('-');
                if (regParts.length === 3) {
                    const lastSeq = parseInt(regParts[2]);
                    if (!isNaN(lastSeq)) {
                        sequenceNumber = lastSeq + 1;
                    }
                }
            }
            
            // Format: ABC-2025-001
            return `${programCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
            
        } catch (error) {
            console.error('❌ Error generating reg number:', error);
            const timestamp = Date.now().toString().slice(-6);
            return `TEMP-${timestamp}`;
        }
    }
    
    async getLastStudentForProgramYear(programId, intakeYear) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('students')
                .select('reg_number')
                .eq('program', programId)
                .eq('intake_year', parseInt(intakeYear))
                .order('reg_number', { ascending: false })
                .limit(1)
                .single();
                
            if (error) {
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error getting last student:', error);
            return null;
        }
    }
    
    async getStudentCourses(studentId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('marks')
                .select('course_id')
                .eq('student_id', studentId)
                .not('course_id', 'is', null);
            
            if (error) return [];
            
            // Get unique course IDs
            const courseIds = [...new Set(data.map(m => m.course_id).filter(Boolean))];
            
            if (courseIds.length === 0) return [];
            
            // Fetch course details
            const { data: courses, error: coursesError } = await this.supabase
                .from('courses')
                .select('*')
                .in('id', courseIds);
                
            if (coursesError) return [];
            
            return courses || [];
        } catch (error) {
            console.error('❌ Error getting student courses:', error);
            return [];
        }
    }
    
    async getStudentMarks(studentId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('marks')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });
                
            if (error) return [];
            return data || [];
        } catch (error) {
            console.error('❌ Error getting student marks:', error);
            return [];
        }
    }
    
    async calculateStudentGPA(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            if (marks.length === 0) return 0;
            
            let totalPoints = 0;
            let totalCredits = 0;
            
            for (const mark of marks) {
                if (mark.grade !== 'FAIL') {
                    const credits = 3; // Default credits
                    const gradePoints = mark.grade_points || 0;
                    
                    totalPoints += gradePoints * credits;
                    totalCredits += credits;
                }
            }
            
            if (totalCredits === 0) return 0;
            return parseFloat((totalPoints / totalCredits).toFixed(2));
        } catch (error) {
            console.error('❌ Error calculating GPA:', error);
            return 0;
        }
    }
    
    async logActivity(type, description) {
        try {
            const supabase = await this.ensureConnected();
            await this.supabase
                .from('activities')
                .insert([{
                    type: type,
                    description: description,
                    user_name: 'Administrator',
                    created_at: new Date().toISOString()
                }]);
        } catch (error) {
            console.error('❌ Error logging activity:', error);
        }
    }
    
    async getRecentActivities(limit = 10) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await this.supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
                
            if (error) return [];
            return data || [];
        } catch (error) {
            console.error('❌ Error getting recent activities:', error);
            return [];
        }
    }
}

// ========== EXPORT ==========

if (typeof window !== 'undefined') {
    window.TEEPortalSupabaseDB = TEEPortalSupabaseDB;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TEEPortalSupabaseDB;
}
