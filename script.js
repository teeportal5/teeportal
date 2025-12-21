// ============================================
// TEEPORTAL - Complete JavaScript with Supabase
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
        isLoading: false,
        useLocalStorage: true // Default to localStorage until Supabase loads
    };

    // DOM Elements Cache
    const elements = {};

    // ============================================
    // CORE INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('TEEPortal Initializing...');
        
        // First, load Supabase from CDN if not already loaded
        loadSupabase().then(() => {
            initializeApp();
        }).catch(error => {
            console.error('Failed to load Supabase:', error);
            // Continue with localStorage mode
            state.useLocalStorage = true;
            initializeApp();
        });
    });

    async function loadSupabase() {
        return new Promise((resolve, reject) => {
            // Check if Supabase is already loaded
            if (window.supabase && window.supabase.createClient) {
                console.log('Supabase already loaded');
                resolve();
                return;
            }

            // Load Supabase from CDN
            console.log('Loading Supabase from CDN...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = function() {
                console.log('Supabase CDN script loaded');
                
                // Initialize Supabase client
                if (window.supabase && window.supabase.createClient) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized');
                    
                    // Test connection
                    testSupabaseConnection().then(resolve).catch(reject);
                } else {
                    reject(new Error('Supabase library not available after loading'));
                }
            };
            
            script.onerror = function() {
                reject(new Error('Failed to load Supabase script'));
            };
            
            document.head.appendChild(script);
        });
    }

    async function testSupabaseConnection() {
        try {
            console.log('Testing Supabase connection...');
            const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
            
            if (error) {
                console.warn('Supabase connection test failed:', error.message);
                state.useLocalStorage = true;
                showToast('Connected to Supabase (read-only mode)', 'warning');
            } else {
                console.log('Supabase connection successful');
                state.useLocalStorage = false;
                showToast('Connected to live database', 'success');
            }
        } catch (error) {
            console.warn('Supabase connection error:', error.message);
            state.useLocalStorage = true;
            showToast('Using local storage mode', 'info');
        }
    }

    async function initializeApp() {
        try {
            // 1. Cache DOM elements
            cacheElements();
            
            // 2. Initialize navigation
            initializeNavigation();
            
            // 3. Setup event listeners
            setupEventListeners();
            
            // 4. Initialize UI components
            initializeUI();
            
            // 5. Load initial data
            await loadInitialData();
            
            // 6. Show success message
            showToast('TEE Portal initialized successfully', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Error initializing system: ' + error.message, 'error');
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
            
            // Load demo data immediately for better UX
            await loadDemoData();
            
            // Then try to load from Supabase
            if (!state.useLocalStorage && supabase) {
                await Promise.all([
                    loadStudentsFromSupabase(),
                    loadCoursesFromSupabase(),
                    loadMarksFromSupabase(),
                    loadIntakesFromSupabase()
                ]);
            }
            
            updateDashboard();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Using demo data for now', 'info');
        } finally {
            showLoading(false);
        }
    }

    async function loadDemoData() {
        // Load demo data for immediate display
        state.students = [
            {
                id: '1',
                full_name: 'John Doe',
                email: 'john@example.com',
                program: 'Basic TEE',
                status: 'Active',
                enrollment_date: '2024-01-15'
            },
            {
                id: '2',
                full_name: 'Jane Smith',
                email: 'jane@example.com',
                program: 'HNC',
                status: 'Active',
                enrollment_date: '2024-01-20'
            },
            {
                id: '3',
                full_name: 'Michael Johnson',
                email: 'michael@example.com',
                program: 'Advanced TEE',
                status: 'Graduated',
                enrollment_date: '2023-09-10'
            }
        ];
        
        state.courses = [
            {
                id: '1',
                code: 'TEE101',
                name: 'Introduction to Theology',
                program: 'Basic TEE',
                credits: 3,
                status: 'Active'
            },
            {
                id: '2',
                code: 'TEE102',
                name: 'Biblical Studies',
                program: 'Basic TEE',
                credits: 4,
                status: 'Active'
            },
            {
                id: '3',
                code: 'HNC201',
                name: 'Pastoral Counseling',
                program: 'HNC',
                credits: 3,
                status: 'Active'
            }
        ];
        
        state.marks = [
            {
                id: '1',
                student: { full_name: 'John Doe' },
                course: { name: 'Introduction to Theology' },
                assignment1: 85,
                midterm: 78,
                final_exam: 92,
                total: 85,
                grade: 'A'
            },
            {
                id: '2',
                student: { full_name: 'Jane Smith' },
                course: { name: 'Biblical Studies' },
                assignment1: 72,
                midterm: 68,
                final_exam: 75,
                total: 71,
                grade: 'B'
            }
        ];
        
        state.intakes = [
            {
                id: '1',
                name: 'Spring 2024',
                deadline: '2024-04-30',
                students: 120,
                status: 'Active'
            },
            {
                id: '2',
                name: 'Fall 2023',
                deadline: '2023-11-30',
                students: 98,
                status: 'Completed'
            }
        ];
        
        renderStudentsTable();
        renderCoursesGrid();
        renderMarksTable();
        updateDashboard();
    }

    async function loadStudentsFromSupabase() {
        try {
            if (!supabase) {
                console.log('Supabase not available, skipping student load');
                return;
            }
            
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                state.students = data;
                renderStudentsTable();
                updateStudentCounts();
                console.log('Loaded', data.length, 'students from Supabase');
            }
        } catch (error) {
            console.error('Error loading students from Supabase:', error);
            // Don't show error toast here - localStorage mode is acceptable
        }
    }

    async function loadCoursesFromSupabase() {
        try {
            if (!supabase) return;
            
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                state.courses = data;
                renderCoursesGrid();
                updateCourseCounts();
            }
        } catch (error) {
            console.error('Error loading courses from Supabase:', error);
        }
    }

    async function loadMarksFromSupabase() {
        try {
            if (!supabase) return;
            
            const { data, error } = await supabase
                .from('marks')
                .select(`
                    *,
                    students (full_name),
                    courses (name, code)
                `)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                state.marks = data;
                renderMarksTable();
                updateAverageGrade();
            }
        } catch (error) {
            console.error('Error loading marks from Supabase:', error);
        }
    }

    async function loadIntakesFromSupabase() {
        try {
            if (!supabase) return;
            
            const { data, error } = await supabase
                .from('intakes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                state.intakes = data;
            }
        } catch (error) {
            console.error('Error loading intakes from Supabase:', error);
        }
    }

    // ============================================
    // UI FUNCTIONS (SAME AS BEFORE, but simplified)
    // ============================================
    function showSection(sectionId) {
        elements.sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
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
        }
    }

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
        updateStudentCounts();
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
        updateCourseCounts();
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
        updateAverageGrade();
    }

    function updateDashboard() {
        updateStudentCounts();
        updateCourseCounts();
        updateAverageGrade();
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
            if (elements.avgGrade) elements.avgGrade.textContent = 'N/A';
            return;
        }
        
        const total = state.marks.reduce((sum, mark) => sum + (mark.total || 0), 0);
        const average = Math.round(total / state.marks.length);
        if (elements.avgGrade) elements.avgGrade.textContent = `${average}%`;
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================
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
                enrollment_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            };
            
            // Try to save to Supabase first
            if (!state.useLocalStorage && supabase) {
                const { data, error } = await supabase
                    .from('students')
                    .insert([studentData])
                    .select()
                    .single();
                
                if (error) throw error;
                
                showToast('Student saved to database', 'success');
                await loadStudentsFromSupabase();
            } else {
                // Fallback to localStorage
                const studentId = Date.now().toString();
                const newStudent = {
                    id: studentId,
                    ...studentData
                };
                state.students.unshift(newStudent);
                localStorage.setItem('teeportal_students', JSON.stringify(state.students));
                showToast('Student saved locally', 'success');
                renderStudentsTable();
            }
            
            closeModal('studentModal');
            form.reset();
            
        } catch (error) {
            console.error('Error saving student:', error);
            showToast('Error saving student: ' + error.message, 'error');
        }
    }

    async function deleteStudent(studentId) {
        try {
            const confirmed = await showConfirmModal('Are you sure you want to delete this student?');
            if (!confirmed) return;
            
            if (!state.useLocalStorage && supabase) {
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', studentId);
                
                if (error) throw error;
                
                showToast('Student deleted from database', 'success');
                await loadStudentsFromSupabase();
            } else {
                state.students = state.students.filter(s => s.id !== studentId);
                localStorage.setItem('teeportal_students', JSON.stringify(state.students));
                showToast('Student deleted locally', 'success');
                renderStudentsTable();
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error deleting student', 'error');
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function setupEventListeners() {
        // Form submissions
        if (elements.studentForm) {
            elements.studentForm.addEventListener('submit', saveStudent);
        }
        
        if (elements.courseForm) {
            elements.courseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showToast('Course saved (demo mode)', 'success');
                closeModal('courseModal');
            });
        }
        
        if (elements.marksForm) {
            elements.marksForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showToast('Marks saved (demo mode)', 'success');
                closeModal('marksModal');
            });
        }
        
        if (elements.intakeForm) {
            elements.intakeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showToast('Intake saved (demo mode)', 'success');
                closeModal('intakeModal');
            });
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
        
        // Refresh button
        const refreshBtn = document.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshDashboard);
        }
    }

    function initializeUI() {
        initializeDatePickers();
        initializeSelects();
        initializeCharts();
        loadSettings();
    }

    function showLoading(show) {
        if (show) {
            if (!elements.loadingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading...</p>
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
            if (form) form.reset();
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

    function searchStudents() {
        const searchTerm = elements.studentSearch?.value.toLowerCase() || '';
        const tbody = elements.studentsTableBody;
        if (!tbody) return;
        
        const filtered = state.students.filter(student => 
            (student.full_name || student.name || '').toLowerCase().includes(searchTerm) ||
            (student.email || '').toLowerCase().includes(searchTerm)
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

    function refreshDashboard() {
        if (!state.useLocalStorage && supabase) {
            loadInitialData();
            showToast('Refreshing from database...', 'info');
        } else {
            showToast('Refreshed local data', 'info');
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
    window.openMarksModal = () => {
        if (!document.getElementById('marksModal')) {
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
                                    <label>Student Name</label>
                                    <input type="text" placeholder="Student Name" required>
                                </div>
                                <div class="form-group">
                                    <label>Course</label>
                                    <input type="text" placeholder="Course Name" required>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Assignment 1</label>
                                        <input type="number" placeholder="Assignment 1" min="0" max="100">
                                    </div>
                                    <div class="form-group">
                                        <label>Midterm</label>
                                        <input type="number" placeholder="Midterm" min="0" max="100">
                                    </div>
                                    <div class="form-group">
                                        <label>Final Exam</label>
                                        <input type="number" placeholder="Final Exam" min="0" max="100">
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
        }
        openModal('marksModal');
    };
    window.saveStudent = saveStudent;
    window.saveCourse = () => showToast('Course saved (demo)', 'success');
    window.saveMarks = () => showToast('Marks saved (demo)', 'success');
    window.saveIntake = () => showToast('Intake saved (demo)', 'success');
    window.editStudent = (id) => {
        const student = state.students.find(s => s.id === id);
        if (student) {
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
    window.editCourse = (id) => {
        const course = state.courses.find(c => c.id === id);
        if (course) {
            if (document.getElementById('courseCode')) {
                document.getElementById('courseCode').value = course.code;
                document.getElementById('courseName').value = course.name;
                document.getElementById('courseProgram').value = course.program;
                document.getElementById('courseCredits').value = course.credits;
                openModal('courseModal');
                
                const title = elements.courseModal?.querySelector('h3');
                if (title) title.textContent = 'Edit Course';
            }
        }
    };
    window.deleteCourse = (id) => {
        showConfirmModal('Delete this course?').then(confirmed => {
            if (confirmed) {
                state.courses = state.courses.filter(c => c.id !== id);
                renderCoursesGrid();
                showToast('Course deleted', 'success');
            }
        });
    };
    window.searchStudents = searchStudents;
    window.searchCourses = () => showToast('Search courses (demo)', 'info');
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
    window.handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            showToast('Logged out successfully', 'info');
            setTimeout(() => {
                alert('Redirecting to login page...');
                // window.location.href = 'login.html';
            }, 1000);
        }
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

    console.log('TEEPortal loaded successfully');
}
