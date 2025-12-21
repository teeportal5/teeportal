// ============================================
// PREVENT DUPLICATE LOADING WITH IIFE
// ============================================

// Check if this script has already been loaded
if (typeof window.__teePortalLoaded !== 'undefined') {
    // Script already loaded, exit immediately
    console.warn('TeePortal already loaded, skipping duplicate load');
    // Don't execute anything else
    // We'll wrap everything in a function that won't execute if already loaded
} else {
    // Mark as loaded
    window.__teePortalLoaded = true;
    
    // Start the main application
    (function() {
        // ============================================
        // TEEPORTAL - Theological Education by Extension
        // Complete Administration System
        // ============================================

        // State Management
        let currentState = {
            students: [],
            courses: [],
            marks: [],
            intakes: [],
            programs: ['Basic TEE', 'HNC', 'Advanced TEE', 'TEENS'],
            currentUser: null,
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
            }
        };

        // DOM Elements Cache
        const elements = {};

        // Supabase client variable (will be initialized after DOM loads)
        let supabase;

        // ============================================
        // INITIALIZATION
        // ============================================

        document.addEventListener('DOMContentLoaded', function() {
            console.log('TEEPortal Initializing...');
            
            // Initialize Supabase client
            try {
                if (typeof window.supabaseClient === 'undefined') {
                    const SUPABASE_URL = 'https://kmkjsessuzdfadlmndyr.supabase.co';
                    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
                    
                    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                        supabase = window.supabaseClient;
                        console.log('Supabase client initialized successfully');
                    } else {
                        console.error('Supabase library not loaded');
                        showToast('Error: Supabase library not loaded. Please refresh the page.', 'error');
                        return;
                    }
                } else {
                    supabase = window.supabaseClient;
                    console.log('Using existing Supabase client');
                }
                
                initializeApp();
            } catch (error) {
                console.error('Error initializing Supabase:', error);
                showToast('Error initializing database: ' + error.message, 'error');
            }
        });

        // ============================================
        // MAIN APPLICATION FUNCTIONS
        // ============================================

        async function initializeApp() {
            try {
                // Cache DOM elements
                cacheElements();
                
                // Initialize navigation
                initializeNavigation();
                
                // Load initial data
                await loadInitialData();
                
                // Set up event listeners
                setupEventListeners();
                
                // Initialize charts
                initializeCharts();
                
                // Start real-time subscriptions
                startRealtimeSubscriptions();
                
                // Update UI
                updateDashboard();
                
                // Load settings
                loadSettings();
                
                console.log('TEEPortal initialized successfully');
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
            elements.confirmModal = document.getElementById('confirmModalOverlay');
            elements.confirmMessage = document.getElementById('confirmMessage');
            elements.confirmYes = document.getElementById('confirmYes');
            elements.confirmNo = document.getElementById('confirmNo');
            elements.toastContainer = document.getElementById('toastContainer');
            
            // Form elements
            elements.studentForm = document.getElementById('studentForm');
            elements.courseForm = document.getElementById('courseForm');
            elements.marksForm = document.getElementById('marksForm');
            elements.intakeForm = document.getElementById('intakeForm');
            
            // Modal elements
            elements.studentModal = document.getElementById('studentModalOverlay');
            elements.courseModal = document.getElementById('courseModalOverlay');
            elements.intakeModal = document.getElementById('intakeModalOverlay');
        }

        function initializeNavigation() {
            // Navigation click handlers
            elements.navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const sectionId = this.getAttribute('data-section');
                    showSection(sectionId);
                    
                    // Update active state
                    elements.navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }

        async function loadInitialData() {
            try {
                // Load all data in parallel
                const [students, courses, marks, intakes] = await Promise.all([
                    loadStudents(),
                    loadCourses(),
                    loadMarks(),
                    loadIntakes()
                ]);
                
                currentState.students = students;
                currentState.courses = courses;
                currentState.marks = marks;
                currentState.intakes = intakes;
                
                // Populate dropdowns
                populateIntakeYears();
                populateStudentDropdowns();
                populateCourseDropdowns();
                
                return true;
            } catch (error) {
                console.error('Error loading initial data:', error);
                throw error;
            }
        }

        function setupEventListeners() {
            // Form tab navigation
            document.querySelectorAll('.form-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    switchTab(tabId);
                });
            });
            
            // Confirm modal
            elements.confirmYes.addEventListener('click', handleConfirmYes);
            elements.confirmNo.addEventListener('click', hideConfirmModal);
            
            // Program selection for courses
            const programSelect = document.getElementById('program');
            if (programSelect) {
                programSelect.addEventListener('change', loadProgramCourses);
            }
            
            // Marks calculation
            const marksObtainedInput = document.getElementById('marksObtained');
            const marksTotalInput = document.getElementById('marksTotal');
            if (marksObtainedInput && marksTotalInput) {
                marksObtainedInput.addEventListener('input', calculateMarks);
                marksTotalInput.addEventListener('input', calculateMarks);
            }
            
            // Settings tabs
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    showSettingsTab(tabId);
                });
            });
            
            // Search inputs
            const searchStudentsInput = document.getElementById('searchStudents');
            if (searchStudentsInput) {
                searchStudentsInput.addEventListener('input', searchStudents);
            }
            
            const searchCoursesInput = document.getElementById('searchCourses');
            if (searchCoursesInput) {
                searchCoursesInput.addEventListener('input', searchCourses);
            }
        }

        function initializeCharts() {
            updateProgramChart();
            updateGradesChart();
        }

        function startRealtimeSubscriptions() {
            // Subscribe to students table changes
            const studentsSubscription = supabase
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
            
            // Subscribe to marks table changes
            const marksSubscription = supabase
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
            
            // Subscribe to courses table changes
            const coursesSubscription = supabase
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
            
            // Store subscriptions
            currentState.subscriptions = {
                students: studentsSubscription,
                marks: marksSubscription,
                courses: coursesSubscription
            };
        }

        function loadSettings() {
            const settings = JSON.parse(localStorage.getItem('teeportalSettings') || '{}');
            currentState.settings = { ...currentState.settings, ...settings };
            applySettings();
        }

        function applySettings() {
            // Apply settings to UI
            const settings = currentState.settings;
            
            // Update institute name
            const instituteElements = document.querySelectorAll('.institute-name');
            instituteElements.forEach(el => {
                el.textContent = settings.instituteName;
            });
            
            // Apply dark mode if enabled
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark-mode');
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
                
                // Load section-specific data
                switch(sectionId) {
                    case 'students':
                        renderStudentsTable(currentState.students);
                        break;
                    case 'courses':
                        renderCoursesTable(currentState.courses);
                        renderCourseCategories();
                        break;
                    case 'marks':
                        renderMarksTable(currentState.marks);
                        updateGradesChart();
                        break;
                    case 'intake':
                        renderIntakesTimeline();
                        renderCurrentIntakes();
                        updateIntakeStats();
                        break;
                    case 'reports':
                        renderReportsSection();
                        break;
                    case 'settings':
                        loadSettingsUI();
                        break;
                }
            }
        }

        // ============================================
        // STUDENT MANAGEMENT
        // ============================================

        async function loadStudents() {
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('*')
                    .order('enrollment_date', { ascending: false });
                
                if (error) throw error;
                
                // Update state
                currentState.students = data || [];
                
                // Update UI
                updateStudentCounts();
                
                return data || [];
            } catch (error) {
                console.error('Error loading students:', error);
                showToast('Error loading students: ' + error.message, 'error');
                return [];
            }
        }

        function showStudentForm(student = null) {
            const modal = elements.studentModal;
            const formTitle = document.getElementById('studentFormTitle');
            
            if (student) {
                // Edit mode
                formTitle.textContent = 'Edit Student';
                populateStudentForm(student);
            } else {
                // Add mode
                formTitle.textContent = 'Register New Student';
                resetStudentForm();
            }
            
            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function hideStudentForm() {
            const modal = elements.studentModal;
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetStudentForm();
        }

        function populateStudentForm(student) {
            // Fill form with student data
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentRegNo').value = student.registration_number || '';
            document.getElementById('firstName').value = student.first_name || '';
            document.getElementById('lastName').value = student.last_name || '';
            document.getElementById('otherNames').value = student.other_names || '';
            document.getElementById('gender').value = student.gender || '';
            document.getElementById('dob').value = student.date_of_birth || '';
            document.getElementById('maritalStatus').value = student.marital_status || '';
            document.getElementById('homeChurch').value = student.home_church || '';
            document.getElementById('program').value = student.program || '';
            document.getElementById('intakeYear').value = student.intake_year || '';
            document.getElementById('studyMode').value = student.study_mode || '';
            document.getElementById('enrollmentDate').value = student.enrollment_date || '';
            document.getElementById('email').value = student.email || '';
            document.getElementById('phone').value = student.phone || '';
            document.getElementById('alternativePhone').value = student.alternative_phone || '';
            document.getElementById('address').value = student.address || '';
            document.getElementById('kinName').value = student.kin_name || '';
            document.getElementById('kinRelationship').value = student.kin_relationship || '';
            document.getElementById('kinPhone').value = student.kin_phone || '';
            
            // Load courses for the program
            if (student.program) {
                loadProgramCourses();
            }
        }

        function resetStudentForm() {
            const form = elements.studentForm;
            if (form) {
                form.reset();
                document.getElementById('studentId').value = '';
                document.getElementById('enrollmentDate').value = new Date().toISOString().split('T')[0];
                
                // Reset course selection
                const courseSelection = document.getElementById('courseSelection');
                if (courseSelection) {
                    courseSelection.innerHTML = '<p class="select-program-prompt">Select a program to see available courses</p>';
                }
                
                // Reset to first tab
                switchTab('personal');
            }
        }

        async function saveStudent(event) {
            event.preventDefault();
            
            try {
                const studentData = {
                    registration_number: document.getElementById('studentRegNo').value,
                    first_name: document.getElementById('firstName').value,
                    last_name: document.getElementById('lastName').value,
                    other_names: document.getElementById('otherNames').value,
                    gender: document.getElementById('gender').value,
                    date_of_birth: document.getElementById('dob').value,
                    marital_status: document.getElementById('maritalStatus').value,
                    home_church: document.getElementById('homeChurch').value,
                    program: document.getElementById('program').value,
                    intake_year: parseInt(document.getElementById('intakeYear').value),
                    study_mode: document.getElementById('studyMode').value,
                    enrollment_date: document.getElementById('enrollmentDate').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    alternative_phone: document.getElementById('alternativePhone').value,
                    address: document.getElementById('address').value,
                    kin_name: document.getElementById('kinName').value,
                    kin_relationship: document.getElementById('kinRelationship').value,
                    kin_phone: document.getElementById('kinPhone').value,
                    status: 'Active',
                    created_at: new Date().toISOString()
                };
                
                const studentId = document.getElementById('studentId').value;
                let result;
                
                if (studentId) {
                    // Update existing student
                    const { data, error } = await supabase
                        .from('students')
                        .update(studentData)
                        .eq('id', studentId)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    result = data;
                    showToast('Student updated successfully', 'success');
                } else {
                    // Create new student
                    const { data, error } = await supabase
                        .from('students')
                        .insert([studentData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    result = data;
                    showToast('Student registered successfully', 'success');
                }
                
                // Hide form and refresh data
                hideStudentForm();
                await loadStudents();
                
                return result;
            } catch (error) {
                console.error('Error saving student:', error);
                showToast('Error saving student: ' + error.message, 'error');
            }
        }

        function renderStudentsTable(students) {
            const tbody = document.getElementById('studentsTableBody');
            if (!tbody) return;
            
            if (!students || students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-data">
                            <i class="fas fa-users"></i>
                            <p>No students found. Add your first student!</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            students.forEach(student => {
                html += `
                    <tr>
                        <td>${student.registration_number || 'N/A'}</td>
                        <td>
                            <strong>${student.first_name} ${student.last_name}</strong>
                            ${student.other_names ? `<br><small>${student.other_names}</small>` : ''}
                        </td>
                        <td>${student.email}</td>
                        <td>${student.program || 'N/A'}</td>
                        <td>${student.intake_year || 'N/A'}</td>
                        <td>
                            <span class="status-badge status-${student.status?.toLowerCase() || 'active'}">
                                ${student.status || 'Active'}
                            </span>
                        </td>
                        <td>${student.phone}</td>
                        <td class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editStudent('${student.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteStudent('${student.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn-action btn-view" onclick="viewStudent('${student.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            updateStudentCounts();
        }

        // ============================================
        // WINDOW OBJECT EXPORTS
        // ============================================

        // Make functions available globally
        window.showStudentForm = () => showStudentForm();
        window.hideStudentForm = hideStudentForm;
        window.saveStudent = saveStudent;
        window.editStudent = editStudent;
        window.deleteStudent = deleteStudent;
        window.viewStudent = viewStudent;
        window.searchStudents = searchStudents;
        window.filterStudents = filterStudents;

        window.showCourseForm = () => showCourseForm();
        window.hideCourseForm = hideCourseForm;
        window.saveCourse = saveCourse;
        window.editCourse = editCourse;
        window.deleteCourse = deleteCourse;
        window.searchCourses = searchCourses;
        window.filterCourses = filterCourses;

        window.showMarksForm = showMarksForm;
        window.saveMarks = saveMarks;
        window.calculateMarks = calculateMarks;
        window.editMarks = editMarks;
        window.deleteMarks = deleteMarks;

        window.showIntakeForm = () => showIntakeForm();
        window.hideIntakeForm = hideIntakeForm;
        window.saveIntake = saveIntake;
        window.editIntake = editIntake;
        window.viewIntakeDetails = viewIntakeDetails;
        window.viewIntakeStudents = viewIntakeStudents;

        window.switchTab = switchTab;
        window.showSettingsTab = showSettingsTab;
        window.saveSettings = saveSettings;
        window.exportData = exportData;

        window.showConfirmModal = showConfirmModal;
        window.hideConfirmModal = hideConfirmModal;
        window.showToast = showToast;

        window.generateStudentReports = generateStudentReports;
        window.generateProgramReports = generateProgramReports;
        window.generateIntakeReports = generateIntakeReports;
        window.generatePerformanceReports = generatePerformanceReports;
        window.generateStudentReport = generateStudentReport;

        // Add other functions that need to be global...
        window.editStudent = function(studentId) {
            const student = currentState.students.find(s => s.id === studentId);
            if (student) {
                showStudentForm(student);
            }
        };

        window.deleteStudent = async function(studentId) {
            const confirmed = await showConfirmModal('Are you sure you want to delete this student? This will also delete all their academic records.');
            if (!confirmed) return;
            
            try {
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', studentId);
                
                if (error) throw error;
                
                showToast('Student deleted successfully', 'success');
                await loadStudents();
            } catch (error) {
                console.error('Error deleting student:', error);
                showToast('Error deleting student: ' + error.message, 'error');
            }
        };

        // Continue with all the other functions from your original script...
        // [Add all the remaining functions here...]

        // ============================================
        // INITIALIZATION COMPLETE
        // ============================================

        console.log('TEEPortal Admin System loaded successfully');
        
    })(); // End of IIFE
}
