// modules/database.js - Complete Supabase DB class with all fixes
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
            
            // Create missing tables if needed
            await this._ensureTablesExist();
            
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
    
    async _ensureTablesExist() {
        try {
            console.log('🔍 Checking for required tables...');
            
            // Test each table
            const tables = ['students', 'courses', 'marks', 'settings', 'activities'];
            for (const table of tables) {
                const { error } = await this.supabase
                    .from(table)
                    .select('count', { count: 'exact', head: true })
                    .limit(1);
                    
                if (error && error.code === '42P01') {
                    console.warn(`⚠️ Table "${table}" does not exist`);
                } else {
                    console.log(`✅ Table "${table}" exists`);
                }
            }
            
            // Check for new tables
            const newTables = ['counties', 'centres', 'programs'];
            for (const table of newTables) {
                const { error } = await this.supabase
                    .from(table)
                    .select('count', { count: 'exact', head: true })
                    .limit(1);
                    
                if (error && error.code === '42P01') {
                    console.log(`ℹ️ Table "${table}" not found - will use defaults`);
                }
            }
        } catch (error) {
            console.warn('Table check error:', error);
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
            ],
            
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
    
    // ========== COUNTIES MANAGEMENT ==========
    async getCounties() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('counties')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                // Table might not exist yet - return from settings
                const settings = await this.getSettings();
                return settings.counties || [];
            }
            return data || [];
        } catch (error) {
            console.error('Error fetching counties:', error);
            const settings = await this.getSettings();
            return settings.counties || [];
        }
    }
    
    async addCounty(countyData) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('counties')
                .insert([{
                    name: countyData.name,
                    code: countyData.code,
                    region: countyData.region || ''
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            // Update settings with new county
            const settings = await this.getSettings();
            if (!settings.counties) settings.counties = [];
            settings.counties.push({
                id: data.id,
                name: data.name,
                code: data.code,
                region: data.region
            });
            await this.saveSettings(settings);
            
            await this.logActivity('county_added', `Added county: ${data.name}`);
            return data;
        } catch (error) {
            console.error('Error adding county:', error);
            throw error;
        }
    }
    
    // ========== CENTRES MANAGEMENT ==========
    async getCentres() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('centres')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                // Table might not exist yet - return from settings
                const settings = await this.getSettings();
                return settings.centres || [];
            }
            return data || [];
        } catch (error) {
            console.error('Error fetching centres:', error);
            const settings = await this.getSettings();
            return settings.centres || [];
        }
    }
    
    async addCentre(centreData) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('centres')
                .insert([{
                    name: centreData.name,
                    code: centreData.code,
                    county: centreData.county,
                    address: centreData.address || '',
                    phone: centreData.phone || '',
                    email: centreData.email || '',
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            // Update settings with new centre
            const settings = await this.getSettings();
            if (!settings.centres) settings.centres = [];
            settings.centres.push({
                id: data.id,
                name: data.name,
                code: data.code,
                county: data.county
            });
            await this.saveSettings(settings);
            
            await this.logActivity('centre_added', `Added centre: ${data.name}`);
            return data;
        } catch (error) {
            console.error('Error adding centre:', error);
            throw error;
        }
    }
    async updateCentre(centreId, updates) {
    try {
        const supabase = await this.ensureConnected();
        
        // Prepare update object - only include fields that exist in your centres table
        const updateObj = {
            name: updates.name || '',
            county: updates.county || '',
            status: updates.status || 'active'
            // Note: Your centres table doesn't have code, address, phone, email based on the data shown
            // Add only if your table has these columns
        };
        
        console.log('🔄 Updating centre:', centreId, updateObj);
        
        const { data, error } = await supabase
            .from('centres')
            .update(updateObj)
            .eq('id', centreId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logActivity('centre_updated', `Updated centre: ${data.name}`);
        return data;
        
    } catch (error) {
        console.error('Error updating centre:', error);
        throw error;
    }
}
    async deleteCentre(centreId) {
    try {
        const supabase = await this.ensureConnected();
        
        // First get centre name for logging
        const { data: centre, error: getError } = await supabase
            .from('centres')
            .select('name')
            .eq('id', centreId)
            .single();
            
        if (getError && getError.code !== 'PGRST116') {
            console.warn('Centre not found:', getError);
        }
        
        // Delete the centre
        const { error } = await supabase
            .from('centres')
            .delete()
            .eq('id', centreId);
            
        if (error) throw error;
        
        // Log activity
        const centreName = centre ? centre.name : `ID: ${centreId}`;
        await this.logActivity('centre_deleted', `Deleted centre: ${centreName}`);
        
        return { success: true, message: 'Centre deleted successfully' };
        
    } catch (error) {
        console.error('Error deleting centre:', error);
        throw error;
    }
}
    // ========== PROGRAMS MANAGEMENT ==========
    async getPrograms() {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('programs')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                // Table might not exist yet - use settings programs
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
            console.error('Error fetching programs:', error);
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
    }
    
    async addProgram(programData) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('programs')
                .insert([{
                    code: programData.code,
                    name: programData.name,
                    description: programData.description || '',
                    duration: programData.duration || '2 years',
                    max_credits: programData.maxCredits || 60,
                    status: 'active'
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            // Also update settings programs for backward compatibility
            const settings = await this.getSettings();
            if (!settings.programs) settings.programs = {};
            settings.programs[programData.code.toLowerCase()] = {
                name: programData.name,
                duration: programData.duration || '2 years',
                maxCredits: programData.maxCredits || 60
            };
            await this.saveSettings(settings);
            
            await this.logActivity('program_added', `Added program: ${data.name}`);
            return data;
        } catch (error) {
            console.error('Error adding program:', error);
            throw error;
        }
    }
    
    // ========== STUDENTS MANAGEMENT ==========
    async getStudents(filterOptions = {}) {
        try {
            const supabase = await this.ensureConnected();
            let query = supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
            
            // Apply filters if provided
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
                query = query.eq('centre', filterOptions.centre);
            }
            if (filterOptions.county) {
                query = query.eq('county', filterOptions.county);
            }
            
            const { data, error } = await query;
                
            if (error) throw error;
            
            // Ensure all students have county and centre fields
            return (data || []).map(student => ({
                ...student,
                county: student.county || 'Not specified',
                centre: student.centre || 'Main Campus',
                full_name: student.full_name || '',
                email: student.email || '',
                phone: student.phone || ''
            }));
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
            
            // Add default values for missing fields
            return {
                ...data,
                county: data.county || 'Not specified',
                centre: data.centre || 'Main Campus'
            };
        } catch (error) {
            console.error('Error fetching student:', error);
            throw error;
        }
    }
    
    async addStudent(studentData) {
    try {
        const supabase = await this.ensureConnected();
        
        // Debug: Log incoming student data
        console.log('📋 Adding student with data:', studentData);
        
        // Extract ALL fields from studentData to avoid missing any
        const student = {
            reg_number: studentData.reg_number || '',
            full_name: studentData.full_name || studentData.name || '',
            email: studentData.email || '',
            phone: studentData.phone || '',
            date_of_birth: studentData.date_of_birth || studentData.dob || null,
            gender: studentData.gender || null,
            id_number: studentData.id_number || '',
            
            // Location fields
            county: studentData.county || '',
            sub_county: studentData.sub_county || '',
            ward: studentData.ward || '',
            village: studentData.village || '',
            address: studentData.address || '',
            
            // **FIXED: centre_id must be NULL for UUID column, not empty string**
            centre_id: null, // ← CHANGED THIS LINE
            
            // **ADDED: Use centre_name field**
            centre_name: studentData.centre_name || studentData.centre || '',
            
            // Keep old field for backward compatibility
            centre: studentData.centre || '',
            
            // Academic fields
            program: studentData.program || '',
            intake_year: studentData.intake_year || studentData.intake || new Date().getFullYear(),
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
        
        console.log('📤 Prepared student for database:', student);
        
        // Check for required fields
        const requiredFields = ['reg_number', 'full_name', 'email', 'program', 'intake_year'];
        const missingFields = requiredFields.filter(field => !student[field] || student[field].toString().trim() === '');
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        const { data, error } = await supabase
            .from('students')
            .insert([student])
            .select()
            .single();
            
        if (error) {
            console.error('❌ Database error:', error);
            if (error.code === '23502') {
                throw new Error(`Database constraint violation: ${error.message}. Missing required field.`);
            } else if (error.code === '23505') {
                throw new Error(`Registration number "${student.reg_number}" already exists.`);
            }
            throw new Error(`Database error: ${error.message}`);
        }
        
        await this.logActivity('student_registered', `Registered student: ${data.full_name} (${data.reg_number})`);
        return data;
    } catch (error) {
        console.error('Error adding student:', error);
        throw error;
    }
}
    // ========== REGISTRATION NUMBER HELPERS ==========
    
    /**
     * Get last student for a specific program and intake year
     * Used for generating sequential registration numbers
     */
    async getLastStudentForProgramYear(programId, intakeYear) {
        try {
            const supabase = await this.ensureConnected();
            console.log('🔍 Looking for last student for:', { programId, intakeYear });
            
            const { data, error } = await supabase
                .from('students')
                .select('reg_number')
                .eq('program', programId)
                .eq('intake_year', parseInt(intakeYear))
                .order('reg_number', { ascending: false })
                .limit(1)
                .single();
                
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('✅ No existing students found for this program/year');
                    return null;
                }
                console.error('Error in getLastStudentForProgramYear:', error);
                return null;
            }
            
            console.log('📊 Found last student:', data);
            return data;
        } catch (error) {
            console.error('Error getting last student for program/year:', error);
            return null;
        }
    }
    
    /**
     * Generate registration number using format: ABC-2025-001
     */
    async generateRegNumberNew(programId, intakeYear) {
        try {
            // Get program code
            const programs = await this.getPrograms();
            const program = programs.find(p => p.id === programId);
            const programCode = program?.code || programId.substring(0, 3).toUpperCase();
            
            // Get last sequence number
            const lastStudent = await this.getLastStudentForProgramYear(programId, intakeYear);
            let sequenceNumber = 1;
            
            if (lastStudent && lastStudent.reg_number) {
                // Extract sequence from existing reg number
                const regParts = lastStudent.reg_number.split('-');
                if (regParts.length === 3) {
                    const lastSeq = parseInt(regParts[2]);
                    if (!isNaN(lastSeq)) {
                        sequenceNumber = lastSeq + 1;
                    }
                }
            }
            
            // Format: ABC-2025-001
            const regNumber = `${programCode}-${intakeYear}-${sequenceNumber.toString().padStart(3, '0')}`;
            console.log('🔢 Generated reg number:', regNumber);
            
            return regNumber;
        } catch (error) {
            console.error('Error generating reg number:', error);
            // Fallback: timestamp based
            const timestamp = Date.now().toString().slice(-6);
            return `TEMP-${timestamp}`;
        }
    }
    
    /**
     * Original registration number generator (kept for backward compatibility)
     */
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
            
            const regNumber = `${prefix}${year}${sequence}`;
            console.log('🔢 Generated reg number (old format):', regNumber);
            return regNumber;
        } catch (error) {
            console.error('Error generating reg number:', error);
            const timestamp = Date.now().toString().slice(-6);
            return `TEMP${timestamp}`;
        }
    }
    
    async updateStudent(studentId, updates) {
    try {
        const supabase = await this.ensureConnected();
        
        const updateObj = {
            full_name: updates.full_name || updates.name || '',
            email: updates.email || '',
            phone: updates.phone || '',
            date_of_birth: updates.date_of_birth || updates.dob || null,
            gender: updates.gender || null,
            id_number: updates.id_number || '',
            
            // Location fields
            county: updates.county || '',
            sub_county: updates.sub_county || '',
            ward: updates.ward || '',
            village: updates.village || '',
            address: updates.address || '',
            
            // **FIXED: centre_id must be NULL, not empty string**
            centre_id: null, // ← CHANGED THIS LINE
            
            // **ADDED: Use centre_name field**
            centre_name: updates.centre_name || updates.centre || '',
            
            // Keep old field for backward compatibility
            centre: updates.centre || '',
            
            // Academic fields
            program: updates.program || '',
            intake_year: updates.intake_year || updates.intake || new Date().getFullYear(),
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
        
        console.log('🔄 Updating student with data:', updateObj);
        
        const { data, error } = await supabase
            .from('students')
            .update(updateObj)
            .eq('id', studentId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logActivity('student_updated', `Updated student: ${data.full_name} (${data.reg_number})`);
        return data;
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
}
    
    async deleteStudent(studentId) {
        try {
            const supabase = await this.ensureConnected();
            
            // First, get the student details for logging
            const { data: student, error: getError } = await supabase
                .from('students')
                .select('reg_number, full_name')
                .eq('id', studentId)
                .single();
                
            if (getError && getError.code !== 'PGRST116') {
                console.warn('Student not found:', getError);
            }
            
            // Delete related marks first
            const { error: marksError } = await supabase
                .from('marks')
                .delete()
                .eq('student_id', studentId);
                
            if (marksError) console.error('Error deleting marks:', marksError);
            
            // Then delete the student
            const { error: studentError } = await supabase
                .from('students')
                .delete()
                .eq('id', studentId);
                
            if (studentError) throw studentError;
            
            // Log activity
            const studentName = student ? `${student.full_name} (${student.reg_number})` : `ID: ${studentId}`;
            await this.logActivity('student_deleted', `Deleted student: ${studentName}`);
            
            return { success: true, message: 'Student deleted successfully' };
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }
    
    async getStudentCourses(studentId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('marks')
                .select(`
                    course_id,
                    courses (
                        id,
                        course_code,
                        course_name,
                        program,
                        credits
                    )
                `)
                .eq('student_id', studentId)
                .not('course_id', 'is', null);
            
            if (error) throw error;
            
            // Extract unique courses
            const uniqueCourses = [];
            const seenCourseIds = new Set();
            
            data.forEach(mark => {
                if (mark.course_id && mark.courses && !seenCourseIds.has(mark.course_id)) {
                    seenCourseIds.add(mark.course_id);
                    uniqueCourses.push(mark.courses);
                }
            });
            
            return uniqueCourses;
        } catch (error) {
            console.error('Error getting student courses:', error);
            return [];
        }
    }
    
    async getStudentMarks(studentId) {
        try {
            const supabase = await this.ensureConnected();
            const { data, error } = await supabase
                .from('marks')
                .select(`
                    *,
                    courses!inner(course_code, course_name, credits)
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
    
    async calculateStudentGPA(studentId) {
        try {
            const marks = await this.getStudentMarks(studentId);
            if (marks.length === 0) return 0;
            
            // Filter out failed grades
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
    
    // ========== COURSES MANAGEMENT ==========
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
    
    // ========== MARKS MANAGEMENT ==========
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
        
        // Use the percentage from markData if it exists, otherwise calculate it
        let percentage;
        if (markData.percentage !== undefined && markData.percentage !== null) {
            percentage = markData.percentage;
        } else {
            // Calculate from score and max_score (note: snake_case)
            const score = markData.score || markData.Score;
            const maxScore = markData.max_score || markData.maxScore || 100;
            percentage = (score / maxScore) * 100;
        }
        
        // Use grade from markData if it exists, otherwise calculate it
        let gradeObj;
        if (markData.grade && markData.grade_points) {
            gradeObj = {
                grade: markData.grade,
                points: markData.grade_points
            };
        } else {
            gradeObj = this.calculateGrade(percentage);
        }
        
        // Build the mark object with BOTH camelCase and snake_case support
        const mark = {
            student_id: markData.student_id || markData.studentId,
            course_id: markData.course_id || markData.courseId,
            assessment_type: markData.assessment_type || markData.assessmentType,
            assessment_name: markData.assessment_name || markData.assessmentName || 'Assessment',
            score: markData.score || markData.Score,
            max_score: markData.max_score || markData.maxScore || 100,
            percentage: parseFloat(percentage.toFixed(2)),
            grade: gradeObj.grade,
            grade_points: gradeObj.points,
            remarks: markData.remarks || '',
            visible_to_student: markData.visible_to_student !== undefined 
                ? markData.visible_to_student 
                : (markData.visibleToStudent !== undefined ? markData.visibleToStudent : true),
            entered_by: markData.entered_by || 'admin',
            assessment_date: markData.assessment_date || new Date().toISOString().split('T')[0]
        };
        
        console.log('📤 DATABASE: Prepared mark data:', mark);
        
        // Check if mark already exists
        const { data: existingMarks, error: checkError } = await supabase
            .from('marks')
            .select('*')
            .eq('student_id', mark.student_id)
            .eq('course_id', mark.course_id)
            .eq('assessment_name', mark.assessment_name)
            .maybeSingle();
            
        let result;
        
        if (existingMarks) {
            // Update existing mark
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
            await this.logActivity('marks_updated', `Updated marks for student ${mark.student_id}`);
        } else {
            // Insert new mark
            const { data: newData, error: insertError } = await supabase
                .from('marks')
                .insert([mark])
                .select()
                .single();
                
            if (insertError) throw insertError;
            result = newData;
            await this.logActivity('marks_entered', `Entered new marks for student ${mark.student_id}`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error in addMark:', error);
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

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TEEPortalSupabaseDB;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.TEEPortalSupabaseDB = TEEPortalSupabaseDB;
}
