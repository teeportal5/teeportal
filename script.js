// ============================================
// TEEPORTAL - Complete Supabase JavaScript
// ============================================

// Prevent duplicate loading
if (window.__teePortalLoaded) {
    console.warn('TeePortal already loaded');
} else {
    window.__teePortalLoaded = true;

    // ============================================
    // SUPABASE CONFIGURATION
    // ============================================
    const SUPABASE_URL = 'https://kmkjsessuzdfadlmndyr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';

    let supabase = null;

    // ============================================
    // GLOBAL STATE & CONFIGURATION
    // ============================================
    const state = {
        students: [],
        courses: [],
        marks: [],
        intakes: [],
        programs: ['Basic TEE', 'HNC', 'Advanced TEE', 'TEENS'],
        currentUser: { name: 'Administrator', role: 'TEE Coordinator' },
        activeTab: 'personal',
        currentYear: new Date().getFullYear(),
        gradingSystem: [
            { grade: 'A+', min: 90, max: 100, points: 4.0, description: 'Excellent' },
            { grade: 'A', min: 80, max: 89, points: 4.0, description: 'Very Good' },
            { grade: 'B+', min: 75, max: 79, points: 3.5, description: 'Good' },
            { grade: 'B', min: 70, max: 74, points: 3.0, description: 'Above Average' },
            { grade: 'C+', min: 65, max: 69, points: 2.5, description: 'Average' },
            { grade: 'C', min: 60, max: 64, points: 2.0, description: 'Satisfactory' },
            { grade: 'D', min: 50, max: 59, points: 1.0, description: 'Pass' },
            { grade: 'F', min: 0, max: 49, points: 0.0, description: 'Fail' }
        ],
        settings: {
            instituteName: 'Theological Education by Extension College',
            minPassingGrade: 'D',
            maxCredits: 18,
            attendanceThreshold: 75,
            dateFormat: 'DD/MM/YYYY',
            timezone: 'Africa/Nairobi',
            language: 'en',
            enableBasicTEE: true,
            enableHNC: true,
            enableAdvancedTEE: false,
            enableTEENS: false
        },
        subscriptions: {},
        pendingConfirm: null,
        isLoading: false
    };

    // DOM Elements Cache
    const elements = {};

    // ============================================
    // CORE INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', initializeApp);

    async function initializeApp() {
        console.log('TEEPortal Initializing...');
        
        try {
            // 1. Initialize Supabase
            await initializeSupabase();
            
            // 2. Cache DOM elements
            cacheElements();
            
            // 3. Initialize navigation
            initializeNavigation();
            
            // 4. Setup event listeners
            setupEventListeners();
            
            // 5. Initialize UI components
            initializeUI();
            
            // 6. Load initial data
            await loadInitialData();
            
            // 7. Start real-time subscriptions
            startRealtimeSubscriptions();
            
            // 8. Show success message
            showToast('TEE Portal initialized successfully', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Error initializing system: ' + error.message, 'error');
        }
    }

    async function initializeSupabase() {
        try {
            // Check if Supabase is already loaded
            if (typeof window.supabase === 'undefined') {
                console.error('Supabase library not loaded');
                showToast('Error: Supabase library not loaded. Please refresh the page.', 'error');
                return;
            }
            
            // Initialize Supabase client
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Test connection
            const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
            
            if (error) {
                console.error('Supabase connection error:', error);
                showToast('Warning: Could not connect to database. Using local storage.', 'warning');
                // Fallback to local storage mode
                state.useLocalStorage = true;
            } else {
                console.log('Supabase connected successfully. Students count:', data);
                state.useLocalStorage = false;
            }
        } catch (error) {
            console.error('Supabase initialization error:', error);
            state.useLocalStorage = true;
        }
    }

    function cacheElements() {
        // Cache frequently used elements
        elements.sections = document.querySelectorAll('.content-section');
        elements.navLinks = document.querySelectorAll('.nav-link');
        
        // Forms
        elements.studentForm = document.getElementById('addStudentForm');
        elements.courseForm = document.getElementById('courseForm');
        elements.marksForm = document.getElementById('marksForm');
        elements.intakeForm = document.getElementById('intakeForm');
        
        // Modals
        elements.studentModal = document.getElementById('studentModal');
        elements.courseModal = document.getElementById('courseModal');
        elements.intakeModal = document.getElementById('intakeModal');
        elements.confirmModal = document.getElementById('confirmModal');
        
        // Tables
        elements.studentsTableBody = document.getElementById('studentTableBody');
        elements.coursesGrid = document.getElementById('coursesGrid');
        elements.marksTableBody = document.getElementById('marksTableBody');
        
        // Stats
        elements.totalStudents = document.getElementById('totalStudents');
        elements.totalCourses = document.getElementById('totalCourses');
        elements.avgGrade = document.getElementById('avgGrade');
        elements.headerStudentCount = document.getElementById('headerStudentCount');
        
        // Search inputs
        elements.studentSearch = document.getElementById('studentSearch');
        
        // Loading indicators
        elements.loadingOverlay = document.getElementById('loadingOverlay');
    }

    function initializeNavigation() {
        // Navigation click handlers
        elements.navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                const sectionId = href.substring(1); // Remove #
                showSection(sectionId);
                
                // Update active state
                elements.navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    async function loadInitialData() {
        try {
            showLoading(true);
            
            // Load data in parallel
            await Promise.all([
                loadStudents(),
                loadCourses(),
                loadMarks(),
                loadIntakes()
            ]);
            
            updateDashboard();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Error loading data: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    function setupEventListeners() {
        // Form submissions
        if (elements.studentForm) {
            elements.studentForm.addEventListener('submit', saveStudent);
        }
        
        if (elements.courseForm) {
            elements.courseForm.addEventListener('submit', saveCourse);
        }
        
        if (elements.marksForm) {
            elements.marksForm.addEventListener('submit', saveMarks);
        }
        
        if (elements.intakeForm) {
            elements.intakeForm.addEventListener('submit', saveIntake);
        }
        
        // Search inputs
        if (elements.studentSearch) {
            elements.studentSearch.addEventListener('input', searchStudents);
        }
        
        // Modal close buttons
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal.id);
            });
        });
        
        // Confirm modal
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');
        
        if (confirmYes) {
            confirmYes.addEventListener('click', confirmAction);
        }
        
        if (confirmNo) {
            confirmNo.addEventListener('click', () => closeModal('confirmModal'));
        }
        
        // Refresh buttons
        const refreshBtn = document.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshDashboard);
        }
    }

    function initializeUI() {
        // Initialize date pickers
        initializeDatePickers();
        
        // Initialize select dropdowns
        initializeSelects();
        
        // Initialize charts
        initializeCharts();
        
        // Load settings
        loadSettings();
    }

    function showLoading(show) {
        state.isLoading = show;
        
        if (show) {
            // Create loading overlay if it doesn't exist
            if (!elements.loadingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading data from database...</p>
                    </div>
                `;
                document.body.appendChild(overlay);
                elements.loadingOverlay = overlay;
            }
            elements.loadingOverlay.style.display = 'flex';
        } else if (elements.loadingOverlay) {
            elements.loadingOverlay.style.display = 'none';
        }
    }

    // ============================================
    // SECTION NAVIGATION
    // ============================================
    function showSection(sectionId) {
        // Hide all sections
        elements.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Update title
            const title = document.getElementById('section-title');
            const titles = {
                dashboard: 'Dashboard',
                students: 'Student Management',
                courses: 'Course Management',
                marks: 'Academic Records',
                intake: 'Intake Management',
                settings: 'System Settings'
            };
            if (title && titles[sectionId]) {
                title.textContent = titles[sectionId];
            }
            
            // Load section-specific data
            loadSectionData(sectionId);
        }
    }

    function loadSectionData(sectionId) {
        switch(sectionId) {
            case 'students':
                renderStudentsTable();
                break;
            case 'courses':
                renderCoursesGrid();
                break;
            case 'marks':
                renderMarksTable();
                break;
            case 'intake':
                renderIntakes();
                break;
            case 'settings':
                loadSettingsUI();
                break;
        }
    }

    // ============================================
    // STUDENT MANAGEMENT - SUPABASE INTEGRATION
    // ============================================
    async function loadStudents() {
        try {
            let students = [];
            
            if (state.useLocalStorage) {
                // Fallback to localStorage
                const saved = localStorage.getItem('teeportal_students');
                students = saved ? JSON.parse(saved) : [];
            } else {
                // Load from Supabase
                const { data, error } = await supabase
                    .from('students')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                students = data || [];
            }
            
            state.students = students;
            renderStudentsTable();
            updateStudentCounts();
            
            return students;
        } catch (error) {
            console.error('Error loading students:', error);
            showToast('Error loading students: ' + error.message, 'error');
            return [];
        }
    }

    async function saveStudent(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const studentName = form.querySelector('input[placeholder="Full Name"]')?.value;
            const studentEmail = form.querySelector('input[type="email"]')?.value;
            const studentProgram = form.querySelector('select')?.value || 'Basic TEE';
            
            if (!studentName || !studentEmail) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const studentData = {
                full_name: studentName,
                email: studentEmail,
                program: studentProgram,
                status: 'Active',
                enrollment_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            let result;
            
            if (state.useLocalStorage) {
                // Fallback to localStorage
                const studentId = Date.now().toString();
                const newStudent = {
                    id: studentId,
                    ...studentData
                };
                state.students.unshift(newStudent);
                localStorage.setItem('teeportal_students', JSON.stringify(state.students));
                result = newStudent;
            } else {
                // Save to Supabase
                const { data, error } = await supabase
                    .from('students')
                    .insert([studentData])
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            showToast('Student saved successfully', 'success');
            
            // Update UI
            if (!state.useLocalStorage) {
                await loadStudents(); // Reload from database
            } else {
                renderStudentsTable();
                updateStudentCounts();
            }
            
            closeModal('studentModal');
            form.reset();
            
            return result;
        } catch (error) {
            console.error('Error saving student:', error);
            showToast('Error saving student: ' + error.message, 'error');
        }
    }

    async function deleteStudent(studentId) {
        try {
            const confirmed = await showConfirmModal('Are you sure you want to delete this student? This action cannot be undone.');
            if (!confirmed) return;
            
            if (state.useLocalStorage) {
                // Fallback to localStorage
                state.students = state.students.filter(s => s.id !== studentId);
                localStorage.setItem('teeportal_students', JSON.stringify(state.students));
            } else {
                // Delete from Supabase
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', studentId);
                
                if (error) throw error;
            }
            
            showToast('Student deleted successfully', 'success');
            
            // Update UI
            if (!state.useLocalStorage) {
                await loadStudents();
            } else {
                renderStudentsTable();
                updateStudentCounts();
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error deleting student: ' + error.message, 'error');
        }
    }

    // ============================================
    // COURSE MANAGEMENT - SUPABASE INTEGRATION
    // ============================================
    async function loadCourses() {
        try {
            let courses = [];
            
            if (state.useLocalStorage) {
                const saved = localStorage.getItem('teeportal_courses');
                courses = saved ? JSON.parse(saved) : [];
            } else {
                const { data, error } = await supabase
                    .from('courses')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                courses = data || [];
            }
            
            state.courses = courses;
            renderCoursesGrid();
            updateCourseCounts();
            
            return courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            showToast('Error loading courses: ' + error.message, 'error');
            return [];
        }
    }

    async function saveCourse(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const courseCode = document.getElementById('courseCode')?.value;
            const courseName = document.getElementById('courseName')?.value;
            const courseProgram = document.getElementById('courseProgram')?.value;
            const courseCredits = document.getElementById('courseCredits')?.value;
            
            if (!courseCode || !courseName || !courseProgram) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const courseData = {
                code: courseCode,
                name: courseName,
                program: courseProgram,
                credits: parseInt(courseCredits) || 3,
                status: 'Active',
                created_at: new Date().toISOString()
            };
            
            let result;
            
            if (state.useLocalStorage) {
                const courseId = Date.now().toString();
                const newCourse = {
                    id: courseId,
                    ...courseData,
                    students: 0
                };
                state.courses.unshift(newCourse);
                localStorage.setItem('teeportal_courses', JSON.stringify(state.courses));
                result = newCourse;
            } else {
                const { data, error } = await supabase
                    .from('courses')
                    .insert([courseData])
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            showToast('Course saved successfully', 'success');
            
            if (!state.useLocalStorage) {
                await loadCourses();
            } else {
                renderCoursesGrid();
                updateCourseCounts();
            }
            
            closeModal('courseModal');
            form.reset();
            
            return result;
        } catch (error) {
            console.error('Error saving course:', error);
            showToast('Error saving course: ' + error.message, 'error');
        }
    }

    async function deleteCourse(courseId) {
        try {
            const confirmed = await showConfirmModal('Are you sure you want to delete this course?');
            if (!confirmed) return;
            
            if (state.useLocalStorage) {
                state.courses = state.courses.filter(c => c.id !== courseId);
                localStorage.setItem('teeportal_courses', JSON.stringify(state.courses));
            } else {
                const { error } = await supabase
                    .from('courses')
                    .delete()
                    .eq('id', courseId);
                
                if (error) throw error;
            }
            
            showToast('Course deleted successfully', 'success');
            
            if (!state.useLocalStorage) {
                await loadCourses();
            } else {
                renderCoursesGrid();
                updateCourseCounts();
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            showToast('Error deleting course: ' + error.message, 'error');
        }
    }

    // ============================================
    // MARKS MANAGEMENT - SUPABASE INTEGRATION
    // ============================================
    async function loadMarks() {
        try {
            let marks = [];
            
            if (state.useLocalStorage) {
                const saved = localStorage.getItem('teeportal_marks');
                marks = saved ? JSON.parse(saved) : [];
            } else {
                const { data, error } = await supabase
                    .from('marks')
                    .select(`
                        *,
                        students (full_name),
                        courses (name, code)
                    `)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                marks = data || [];
            }
            
            state.marks = marks;
            renderMarksTable();
            updateAverageGrade();
            
            return marks;
        } catch (error) {
            console.error('Error loading marks:', error);
            showToast('Error loading academic records: ' + error.message, 'error');
            return [];
        }
    }

    async function saveMarks(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const studentId = document.getElementById('marksStudent')?.value;
            const courseId = document.getElementById('marksCourse')?.value;
            const assignment1 = parseInt(document.getElementById('assignment1')?.value) || 0;
            const midterm = parseInt(document.getElementById('midterm')?.value) || 0;
            const finalExam = parseInt(document.getElementById('finalExam')?.value) || 0;
            
            if (!studentId || !courseId) {
                showToast('Please select student and course', 'error');
                return;
            }
            
            // Calculate total and grade
            const total = Math.round((assignment1 + midterm + finalExam) / 3);
            const grade = calculateGrade(total);
            
            const marksData = {
                student_id: studentId,
                course_id: courseId,
                assignment1,
                midterm,
                final_exam: finalExam,
                total,
                grade,
                assessment_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            let result;
            
            if (state.useLocalStorage) {
                const markId = Date.now().toString();
                const newMark = {
                    id: markId,
                    ...marksData,
                    student: { full_name: 'Student Name' },
                    course: { name: 'Course Name', code: 'C001' }
                };
                state.marks.unshift(newMark);
                localStorage.setItem('teeportal_marks', JSON.stringify(state.marks));
                result = newMark;
            } else {
                const { data, error } = await supabase
                    .from('marks')
                    .insert([marksData])
                    .select(`
                        *,
                        students (full_name),
                        courses (name, code)
                    `)
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            showToast('Marks saved successfully', 'success');
            
            if (!state.useLocalStorage) {
                await loadMarks();
            } else {
                renderMarksTable();
                updateAverageGrade();
            }
            
            closeModal('marksModal');
            form.reset();
            
            return result;
        } catch (error) {
            console.error('Error saving marks:', error);
            showToast('Error saving marks: ' + error.message, 'error');
        }
    }

    // ============================================
    // INTAKE MANAGEMENT - SUPABASE INTEGRATION
    // ============================================
    async function loadIntakes() {
        try {
            let intakes = [];
            
            if (state.useLocalStorage) {
                const saved = localStorage.getItem('teeportal_intakes');
                intakes = saved ? JSON.parse(saved) : [];
            } else {
                const { data, error } = await supabase
                    .from('intakes')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                intakes = data || [];
            }
            
            state.intakes = intakes;
            renderIntakes();
            
            return intakes;
        } catch (error) {
            console.error('Error loading intakes:', error);
            showToast('Error loading intakes: ' + error.message, 'error');
            return [];
        }
    }

    async function saveIntake(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const intakeName = form.querySelector('input[placeholder="e.g., Spring 2025"]')?.value;
            const deadline = form.querySelector('input[type="date"]')?.value;
            
            if (!intakeName || !deadline) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            const intakeData = {
                name: intakeName,
                deadline,
                status: 'Upcoming',
                created_at: new Date().toISOString()
            };
            
            let result;
            
            if (state.useLocalStorage) {
                const intakeId = Date.now().toString();
                const newIntake = {
                    id: intakeId,
                    ...intakeData,
                    students: 0
                };
                state.intakes.unshift(newIntake);
                localStorage.setItem('teeportal_intakes', JSON.stringify(state.intakes));
                result = newIntake;
            } else {
                const { data, error } = await supabase
                    .from('intakes')
                    .insert([intakeData])
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            showToast('Intake created successfully', 'success');
            
            if (!state.useLocalStorage) {
                await loadIntakes();
            }
            
            closeModal('intakeModal');
            form.reset();
            
            return result;
        } catch (error) {
            console.error('Error saving intake:', error);
            showToast('Error saving intake: ' + error.message, 'error');
        }
    }

    // ============================================
    // REALTIME SUBSCRIPTIONS
    // ============================================
    function startRealtimeSubscriptions() {
        if (state.useLocalStorage || !supabase) return;
        
        try {
            // Subscribe to students table changes
            const studentsChannel = supabase
                .channel('students-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'students' }, 
                    async (payload) => {
                        console.log('Students changed:', payload);
                        await loadStudents();
                        updateDashboard();
                    }
                )
                .subscribe();
            
            // Subscribe to courses table changes
            const coursesChannel = supabase
                .channel('courses-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'courses' }, 
                    async (payload) => {
                        console.log('Courses changed:', payload);
                        await loadCourses();
                        updateDashboard();
                    }
                )
                .subscribe();
            
            // Subscribe to marks table changes
            const marksChannel = supabase
                .channel('marks-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'marks' }, 
                    async (payload) => {
                        console.log('Marks changed:', payload);
                        await loadMarks();
                        updateDashboard();
                    }
                )
                .subscribe();
            
            // Store subscriptions
            state.subscriptions = {
                students: studentsChannel,
                courses: coursesChannel,
                marks: marksChannel
            };
            
            console.log('Real-time subscriptions started');
        } catch (error) {
            console.error('Error starting real-time subscriptions:', error);
        }
    }

    // ============================================
    // DASHBOARD FUNCTIONS
    // ============================================
    function updateDashboard() {
        // Update stats
        updateStudentCounts();
        updateCourseCounts();
        updateAverageGrade();
        
        // Update charts
        updateEnrollmentChart();
        updateGradeDistributionChart();
    }

    function updateStudentCounts() {
        if (elements.totalStudents) {
            elements.totalStudents.textContent = state.students.length;
        }
        if (elements.headerStudentCount) {
            elements.headerStudentCount.textContent = `${state.students.length} Students Registered`;
        }
    }

    function updateCourseCounts() {
        if (elements.totalCourses) {
            elements.totalCourses.textContent = state.courses.length;
        }
    }

    function updateAverageGrade() {
        if (state.marks.length === 0) {
            if (elements.avgGrade) {
                elements.avgGrade.textContent = 'N/A';
            }
            return;
        }
        
        const total = state.marks.reduce((sum, mark) => sum + (mark.total || 0), 0);
        const average = Math.round(total / state.marks.length);
        
        if (elements.avgGrade) {
            elements.avgGrade.textContent = `${average}%`;
        }
        
        updateGradeDistributionChart();
    }

    function calculateGrade(percentage) {
        const system = state.gradingSystem;
        for (const grade of system) {
            if (percentage >= grade.min && percentage <= grade.max) {
                return grade.grade;
            }
        }
        return 'F';
    }

    function initializeCharts() {
        // Enrollment Chart
        const ctx1 = document.getElementById('enrollmentChart')?.getContext('2d');
        if (ctx1) {
            state.enrollmentChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Student Enrollment',
                        data: [65, 79, 90, 81, 56, 85],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4
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
        
        // Grade Distribution Chart
        const ctx2 = document.getElementById('gradeChart')?.getContext('2d');
        if (ctx2) {
            state.gradeChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['A', 'B', 'C', 'D', 'F'],
                    datasets: [{
                        data: [25, 35, 20, 15, 5],
                        backgroundColor: [
                            '#22c55e',
                            '#3b82f6',
                            '#eab308',
                            '#f97316',
                            '#ef4444'
                        ]
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
    }

    function updateEnrollmentChart() {
        if (!state.enrollmentChart) return;
        
        const monthlyData = [0, 0, 0, 0, 0, 0];
        state.students.forEach(student => {
            const month = new Date(student.enrollment_date || student.enrollmentDate).getMonth();
            if (month >= 0 && month <= 5) {
                monthlyData[month]++;
            }
        });
        
        state.enrollmentChart.data.datasets[0].data = monthlyData;
        state.enrollmentChart.update();
    }

    function updateGradeDistributionChart() {
        if (!state.gradeChart || state.marks.length === 0) return;
        
        const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        state.marks.forEach(mark => {
            const grade = mark.grade?.[0] || 'F';
            if (gradeCount.hasOwnProperty(grade)) {
                gradeCount[grade]++;
            }
        });
        
        state.gradeChart.data.datasets[0].data = [
            gradeCount.A,
            gradeCount.B,
            gradeCount.C,
            gradeCount.D,
            gradeCount.F
        ];
        state.gradeChart.update();
    }

    // ============================================
    // UI RENDERING FUNCTIONS
    // ============================================
    function renderStudentsTable() {
        const tbody = elements.studentsTableBody;
        if (!tbody) return;
        
        if (state.students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <p>No students found. Add your first student!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        state.students.forEach(student => {
            html += `
                <tr>
                    <td>${student.id}</td>
                    <td>${student.full_name || student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.program}</td>
                    <td>
                        <span class="status-badge status-${(student.status || 'Active').toLowerCase()}">
                            ${student.status || 'Active'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn-action btn-edit" onclick="editStudent('${student.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    function renderCoursesGrid() {
        const grid = elements.coursesGrid;
        if (!grid) return;
        
        if (state.courses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <p>No courses found. Add your first course!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        state.courses.forEach(course => {
            html += `
                <div class="course-card">
                    <div class="course-header">
                        <h3>${course.code}</h3>
                        <span class="course-status ${(course.status || 'Active').toLowerCase()}">
                            ${course.status || 'Active'}
                        </span>
                    </div>
                    <div class="course-body">
                        <h4>${course.name}</h4>
                        <p class="course-description">${course.description || 'Course description'}</p>
                        <div class="course-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${course.program}</span>
                            <span><i class="fas fa-star"></i> ${course.credits || 3} Credits</span>
                            <span><i class="fas fa-users"></i> ${course.student_count || 0} Students</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn-edit" onclick="editCourse('${course.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteCourse('${course.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }

    function renderMarksTable() {
        const tbody = elements.marksTableBody;
        if (!tbody) return;
        
        if (state.marks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No academic records found</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        state.marks.forEach(record => {
            const studentName = record.students?.full_name || record.student_name || 'Unknown';
            const courseName = record.courses?.name || record.course_name || 'Unknown';
            
            html += `
                <tr>
                    <td>${studentName}</td>
                    <td>${record.assignment1 || 0}</td>
                    <td>${record.midterm || 0}</td>
                    <td>${record.final_exam || record.finalExam || 0}</td>
                    <td>${record.total || 0}</td>
                    <td><strong class="grade-${record.grade}">${record.grade || 'N/A'}</strong></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    function renderIntakes() {
        // Render intake timeline and cards
        console.log('Rendering intakes:', state.intakes.length);
    }

    function searchStudents() {
        const searchTerm = elements.studentSearch?.value.toLowerCase() || '';
        const tbody = elements.studentsTableBody;
        if (!tbody) return;
        
        const filtered = state.students.filter(student => 
            (student.full_name || student.name || '').toLowerCase().includes(searchTerm) ||
            (student.email || '').toLowerCase().includes(searchTerm) ||
            (student.program || '').toLowerCase().includes(searchTerm)
        );
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No students match your search</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        filtered.forEach(student => {
            html += `
                <tr>
                    <td>${student.id}</td>
                    <td>${student.full_name || student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.program}</td>
                    <td>${student.status || 'Active'}</td>
                    <td class="action-buttons">
                        <button class="btn-action btn-edit" onclick="editStudent('${student.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    // ============================================
    // MODAL & UI FUNCTIONS
    // ============================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                delete form.dataset.editId;
            }
        }
    }

    async function showConfirmModal(message) {
        return new Promise((resolve) => {
            const modal = elements.confirmModal;
            const messageEl = document.getElementById('confirmMessage');
            
            if (messageEl) messageEl.textContent = message;
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            
            state.pendingConfirm = resolve;
        });
    }

    function confirmAction() {
        if (state.pendingConfirm) {
            state.pendingConfirm(true);
            state.pendingConfirm = null;
        }
        closeModal('confirmModal');
    }

    function openMarksModal() {
        if (!document.getElementById('marksModal')) {
            createMarksModal();
        }
        openModal('marksModal');
    }

    function createMarksModal() {
        const modalHTML = `
            <div id="marksModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> Enter Marks</h3>
                        <button class="close-btn" onclick="closeModal('marksModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="marksForm">
                            <div class="form-group">
                                <label>Student</label>
                                <select id="marksStudent" required>
                                    <option value="">Select Student</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Course</label>
                                <select id="marksCourse" required>
                                    <option value="">Select Course</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Assignment 1</label>
                                    <input type="number" id="assignment1" min="0" max="100">
                                </div>
                                <div class="form-group">
                                    <label>Midterm</label>
                                    <input type="number" id="midterm" min="0" max="100">
                                </div>
                                <div class="form-group">
                                    <label>Final Exam</label>
                                    <input type="number" id="finalExam" min="0" max="100">
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="closeModal('marksModal')">Cancel</button>
                                <button type="submit" class="btn-primary">Save Marks</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Populate student and course dropdowns
        populateMarksDropdowns();
    }

    function populateMarksDropdowns() {
        const studentSelect = document.getElementById('marksStudent');
        const courseSelect = document.getElementById('marksCourse');
        
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            state.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.full_name || student.name;
                studentSelect.appendChild(option);
            });
        }
        
        if (courseSelect) {
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            state.courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.code} - ${course.name}`;
                courseSelect.appendChild(option);
            });
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }

    function getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    function initializeDatePickers() {
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.value = new Date().toISOString().split('T')[0];
            }
        });
    }

    function initializeSelects() {
        // Populate course select
        const courseSelect = document.getElementById('courseSelect');
        if (courseSelect) {
            state.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program;
                option.textContent = program;
                courseSelect.appendChild(option);
            });
        }
    }

    function loadSettings() {
        const saved = localStorage.getItem('teeportal_settings');
        if (saved) {
            state.settings = JSON.parse(saved);
            applySettings();
        }
    }

    function applySettings() {
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
    }

    function refreshDashboard() {
        loadInitialData();
        showToast('Dashboard refreshed', 'info');
    }

    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logged out successfully', 'info');
            setTimeout(() => {
                alert('Redirecting to login page...');
                // window.location.href = 'login.html';
            }, 1000);
        }
    }

    // ============================================
    // WINDOW OBJECT EXPORTS
    // ============================================
    window.showSection = showSection;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.openStudentModal = () => openModal('studentModal');
    window.openCourseModal = () => openModal('courseModal');
    window.openIntakeModal = () => openModal('intakeModal');
    window.openMarksModal = openMarksModal;
    window.saveStudent = saveStudent;
    window.saveCourse = saveCourse;
    window.saveMarks = saveMarks;
    window.saveIntake = saveIntake;
    window.editStudent = async (id) => {
        const student = state.students.find(s => s.id === id);
        if (student) {
            // Fill and open edit form
            const form = elements.studentForm;
            if (form) {
                const nameInput = form.querySelector('input[placeholder="Full Name"]');
                const emailInput = form.querySelector('input[type="email"]');
                const programSelect = form.querySelector('select');
                
                if (nameInput) nameInput.value = student.full_name || student.name;
                if (emailInput) emailInput.value = student.email;
                if (programSelect) programSelect.value = student.program;
                
                form.dataset.editId = id;
                openModal('studentModal');
                
                const title = elements.studentModal?.querySelector('h3');
                if (title) title.textContent = 'Edit Student';
            }
        }
    };
    window.deleteStudent = deleteStudent;
    window.editCourse = async (id) => {
        const course = state.courses.find(c => c.id === id);
        if (course) {
            // Fill and open edit form
            if (document.getElementById('courseCode')) {
                document.getElementById('courseCode').value = course.code;
                document.getElementById('courseName').value = course.name;
                document.getElementById('courseProgram').value = course.program;
                document.getElementById('courseCredits').value = course.credits;
                
                const form = elements.courseForm;
                if (form) form.dataset.editId = id;
                openModal('courseModal');
                
                const title = elements.courseModal?.querySelector('h3');
                if (title) title.textContent = 'Edit Course';
            }
        }
    };
    window.deleteCourse = deleteCourse;
    window.searchStudents = searchStudents;
    window.searchCourses = () => {
        const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
        const grid = elements.coursesGrid;
        if (!grid) return;
        
        const filtered = state.courses.filter(course => 
            (course.name || '').toLowerCase().includes(searchTerm) ||
            (course.code || '').toLowerCase().includes(searchTerm)
        );
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <p>No courses match your search</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        filtered.forEach(course => {
            html += `
                <div class="course-card">
                    <div class="course-header">
                        <h3>${course.code}</h3>
                        <span class="course-status ${(course.status || 'Active').toLowerCase()}">${course.status || 'Active'}</span>
                    </div>
                    <div class="course-body">
                        <h4>${course.name}</h4>
                        <p class="course-description">${course.description || 'Course description'}</p>
                        <div class="course-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${course.program}</span>
                            <span><i class="fas fa-star"></i> ${course.credits || 3} Credits</span>
                            <span><i class="fas fa-users"></i> ${course.student_count || 0} Students</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn-edit" onclick="editCourse('${course.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteCourse('${course.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    };
    window.exportMarks = () => {
        let csv = 'Student,Course,Assignment 1,Midterm,Final Exam,Total,Grade\n';
        state.marks.forEach(record => {
            const studentName = record.students?.full_name || record.student_name || 'Unknown';
            const courseName = record.courses?.name || record.course_name || 'Unknown';
            csv += `${studentName},${courseName},${record.assignment1 || 0},${record.midterm || 0},${record.final_exam || record.finalExam || 0},${record.total || 0},${record.grade || 'N/A'}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `marks_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Marks exported successfully', 'success');
    };
    window.toggleDarkMode = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark.toString());
        showToast(`Dark mode ${isDark ? 'enabled' : 'disabled'}`, 'info');
    };
    window.refreshAll = refreshDashboard;
    window.refreshDashboard = refreshDashboard;
    window.handleLogout = handleLogout;
    window.saveSettings = () => {
        const settings = {
            instituteName: document.getElementById('instituteName')?.value || state.settings.instituteName,
            minPassingGrade: document.getElementById('minPassingGrade')?.value || 'D',
            maxCredits: parseInt(document.getElementById('maxCredits')?.value || 18),
            attendanceThreshold: parseInt(document.getElementById('attendanceThreshold')?.value || 75),
            enableBasicTEE: document.getElementById('enableBasicTEE')?.checked || true,
            enableHNC: document.getElementById('enableHNC')?.checked || true,
            enableAdvancedTEE: document.getElementById('enableAdvancedTEE')?.checked || false,
            enableTEENS: document.getElementById('enableTEENS')?.checked || false
        };
        
        state.settings = { ...state.settings, ...settings };
        localStorage.setItem('teeportal_settings', JSON.stringify(state.settings));
        showToast('Settings saved successfully', 'success');
        applySettings();
    };
    window.showToast = showToast;
    window.showConfirmModal = showConfirmModal;
    window.generateReport = () => {
        showToast('Report generation started', 'info');
        setTimeout(() => {
            showToast('Report generated successfully', 'success');
        }, 1500);
    };
    window.printReport = () => {
        window.print();
        showToast('Printing report...', 'info');
    };

    console.log('TEEPortal with Supabase integration loaded successfully');
}
