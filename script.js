// ============================================
// TEEPORTAL - Theological Education by Extension
// Complete Administration System
// ============================================

// Check if supabase is already declared
if (typeof window.supabaseClient === 'undefined') {
    const SUPABASE_URL = 'https://kmkjsessuzdfadlmndyr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;

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

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('TEEPortal Initializing...');
    initializeApp();
});

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

function editStudent(studentId) {
    const student = currentState.students.find(s => s.id === studentId);
    if (student) {
        showStudentForm(student);
    }
}

async function deleteStudent(studentId) {
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
}

function searchStudents() {
    const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
    const filtered = currentState.students.filter(student => 
        student.first_name.toLowerCase().includes(searchTerm) ||
        student.last_name.toLowerCase().includes(searchTerm) ||
        student.email.toLowerCase().includes(searchTerm) ||
        student.registration_number.toLowerCase().includes(searchTerm) ||
        student.program.toLowerCase().includes(searchTerm)
    );
    renderStudentsTable(filtered);
}

function filterStudents() {
    const program = document.getElementById('filterProgram').value;
    const intakeYear = document.getElementById('filterIntakeYear').value;
    const status = document.getElementById('filterStatus').value;
    
    let filtered = currentState.students;
    
    if (program) {
        filtered = filtered.filter(s => s.program === program);
    }
    
    if (intakeYear) {
        filtered = filtered.filter(s => s.intake_year == intakeYear);
    }
    
    if (status) {
        filtered = filtered.filter(s => s.status === status);
    }
    
    renderStudentsTable(filtered);
}

// ============================================
// COURSE MANAGEMENT
// ============================================

async function loadCourses() {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_code', { ascending: true });
        
        if (error) throw error;
        
        currentState.courses = data || [];
        return data || [];
    } catch (error) {
        console.error('Error loading courses:', error);
        showToast('Error loading courses: ' + error.message, 'error');
        return [];
    }
}

function showCourseForm(course = null) {
    const modal = elements.courseModal;
    const formTitle = document.getElementById('courseFormTitle');
    
    if (course) {
        formTitle.textContent = 'Edit Course';
        populateCourseForm(course);
    } else {
        formTitle.textContent = 'Add New Course';
        resetCourseForm();
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideCourseForm() {
    const modal = elements.courseModal;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetCourseForm();
}

function populateCourseForm(course) {
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseCode').value = course.course_code || '';
    document.getElementById('courseName').value = course.course_name || '';
    document.getElementById('courseProgram').value = course.program || '';
    document.getElementById('courseLevel').value = course.level || '';
    document.getElementById('courseCredits').value = course.credits || '';
    document.getElementById('courseSemester').value = course.semester || '';
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('courseStatus').value = course.status || 'Active';
}

function resetCourseForm() {
    const form = elements.courseForm;
    if (form) {
        form.reset();
        document.getElementById('courseId').value = '';
        document.getElementById('courseStatus').value = 'Active';
    }
}

async function saveCourse(event) {
    event.preventDefault();
    
    try {
        const courseData = {
            course_code: document.getElementById('courseCode').value,
            course_name: document.getElementById('courseName').value,
            program: document.getElementById('courseProgram').value,
            level: parseInt(document.getElementById('courseLevel').value),
            credits: parseInt(document.getElementById('courseCredits').value),
            semester: document.getElementById('courseSemester').value,
            description: document.getElementById('courseDescription').value,
            status: document.getElementById('courseStatus').value
        };
        
        const courseId = document.getElementById('courseId').value;
        let result;
        
        if (courseId) {
            const { data, error } = await supabase
                .from('courses')
                .update(courseData)
                .eq('id', courseId)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Course updated successfully', 'success');
        } else {
            const { data, error } = await supabase
                .from('courses')
                .insert([courseData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Course added successfully', 'success');
        }
        
        hideCourseForm();
        await loadCourses();
        
        return result;
    } catch (error) {
        console.error('Error saving course:', error);
        showToast('Error saving course: ' + error.message, 'error');
    }
}

function renderCoursesTable(courses) {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    if (!courses || courses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    <i class="fas fa-book"></i>
                    <p>No courses found. Add your first course!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    courses.forEach(course => {
        // Count enrolled students for this course
        const enrolledCount = currentState.marks.filter(m => 
            m.course_id === course.id
        ).length;
        
        html += `
            <tr>
                <td>${course.course_code}</td>
                <td>
                    <strong>${course.course_name}</strong>
                    ${course.description ? `<br><small>${course.description.substring(0, 50)}...</small>` : ''}
                </td>
                <td>${course.program}</td>
                <td>Level ${course.level}</td>
                <td>${course.credits} Credits</td>
                <td>${course.semester}</td>
                <td>${enrolledCount}</td>
                <td>
                    <span class="status-badge status-${course.status?.toLowerCase() || 'active'}">
                        ${course.status || 'Active'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editCourse('${course.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteCourse('${course.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function renderCourseCategories() {
    const programs = {
        'Basic TEE': 'basicTEECourses',
        'HNC': 'hncCourses',
        'Advanced TEE': 'advancedTEECourses',
        'TEENS': 'teensCourses'
    };
    
    Object.entries(programs).forEach(([program, elementId]) => {
        const element = document.getElementById(elementId);
        if (element) {
            const programCourses = currentState.courses.filter(c => c.program === program);
            
            if (programCourses.length === 0) {
                element.innerHTML = '<li>No courses available</li>';
                return;
            }
            
            let html = '';
            programCourses.forEach(course => {
                html += `
                    <li>
                        ${course.course_code}: ${course.course_name}
                        <span class="course-info">
                            ${course.credits} credits • Level ${course.level}
                        </span>
                    </li>
                `;
            });
            
            element.innerHTML = html;
        }
    });
}

function searchCourses() {
    const searchTerm = document.getElementById('searchCourses').value.toLowerCase();
    const filtered = currentState.courses.filter(course => 
        course.course_code.toLowerCase().includes(searchTerm) ||
        course.course_name.toLowerCase().includes(searchTerm) ||
        course.description?.toLowerCase().includes(searchTerm)
    );
    renderCoursesTable(filtered);
}

function filterCourses() {
    const program = document.getElementById('filterCourseProgram').value;
    const level = document.getElementById('filterCourseLevel').value;
    const status = document.getElementById('filterCourseStatus').value;
    
    let filtered = currentState.courses;
    
    if (program) {
        filtered = filtered.filter(c => c.program === program);
    }
    
    if (level) {
        filtered = filtered.filter(c => c.level === level);
    }
    
    if (status) {
        filtered = filtered.filter(c => c.status === status);
    }
    
    renderCoursesTable(filtered);
}

// ============================================
// MARKS MANAGEMENT
// ============================================

async function loadMarks() {
    try {
        const { data, error } = await supabase
            .from('marks')
            .select(`
                *,
                students (
                    id,
                    registration_number,
                    first_name,
                    last_name,
                    program
                ),
                courses (
                    id,
                    course_code,
                    course_name
                )
            `)
            .order('assessment_date', { ascending: false });
        
        if (error) throw error;
        
        currentState.marks = data || [];
        return data || [];
    } catch (error) {
        console.error('Error loading marks:', error);
        showToast('Error loading marks: ' + error.message, 'error');
        return [];
    }
}

function showMarksForm() {
    // Ensure we're on marks section
    showSection('marks');
    
    // Scroll to form
    const marksForm = document.getElementById('marksForm');
    if (marksForm) {
        marksForm.scrollIntoView({ behavior: 'smooth' });
    }
}

async function saveMarks(event) {
    event.preventDefault();
    
    try {
        const studentId = document.getElementById('marksStudent').value;
        const courseId = document.getElementById('marksCourse').value;
        const marksObtained = parseFloat(document.getElementById('marksObtained').value);
        const totalMarks = parseFloat(document.getElementById('marksTotal').value);
        
        // Calculate percentage and grade
        const percentage = (marksObtained / totalMarks) * 100;
        const grade = calculateGrade(percentage);
        const gradePoints = calculateGradePoints(grade);
        
        const marksData = {
            student_id: studentId,
            course_id: courseId,
            assessment_type: document.getElementById('marksAssessment').value,
            assessment_date: document.getElementById('marksDate').value,
            marks_obtained: marksObtained,
            total_marks: totalMarks,
            percentage: percentage,
            grade: grade,
            grade_points: gradePoints,
            remarks: document.getElementById('marksRemarks').value,
            recorded_by: 'Administrator',
            recorded_at: new Date().toISOString()
        };
        
        const marksId = document.getElementById('marksId').value;
        let result;
        
        if (marksId) {
            const { data, error } = await supabase
                .from('marks')
                .update(marksData)
                .eq('id', marksId)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Marks updated successfully', 'success');
        } else {
            const { data, error } = await supabase
                .from('marks')
                .insert([marksData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Marks saved successfully', 'success');
        }
        
        resetMarksForm();
        await loadMarks();
        
        return result;
    } catch (error) {
        console.error('Error saving marks:', error);
        showToast('Error saving marks: ' + error.message, 'error');
    }
}

function calculateMarks() {
    const obtained = parseFloat(document.getElementById('marksObtained').value) || 0;
    const total = parseFloat(document.getElementById('marksTotal').value) || 100;
    
    if (total > 0) {
        const percentage = (obtained / total) * 100;
        const grade = calculateGrade(percentage);
        const gradePoints = calculateGradePoints(grade);
        
        document.getElementById('marksPercentage').textContent = percentage.toFixed(2) + '%';
        document.getElementById('marksGrade').textContent = grade;
        document.getElementById('marksGradePoints').textContent = gradePoints.toFixed(1);
    }
}

function calculateGrade(percentage) {
    const grade = currentState.gradingSystem.find(g => 
        percentage >= g.min && percentage <= g.max
    );
    return grade ? grade.grade : 'F';
}

function calculateGradePoints(grade) {
    const gradeInfo = currentState.gradingSystem.find(g => g.grade === grade);
    return gradeInfo ? gradeInfo.points : 0.0;
}

function resetMarksForm() {
    const form = elements.marksForm;
    if (form) {
        form.reset();
        document.getElementById('marksId').value = '';
        document.getElementById('marksTotal').value = '100';
        document.getElementById('marksDate').value = new Date().toISOString().split('T')[0];
        
        // Reset calculations
        document.getElementById('marksPercentage').textContent = '0%';
        document.getElementById('marksGrade').textContent = '-';
        document.getElementById('marksGradePoints').textContent = '0.0';
    }
}

function renderMarksTable(marks) {
    const tbody = document.getElementById('marksTableBody');
    if (!tbody) return;
    
    if (!marks || marks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fas fa-chart-bar"></i>
                    <p>No marks records found. Enter your first marks!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    marks.forEach(record => {
        const student = record.students;
        const course = record.courses;
        
        html += `
            <tr>
                <td>
                    <strong>${student?.first_name || 'N/A'} ${student?.last_name || ''}</strong><br>
                    <small>${student?.registration_number || ''}</small>
                </td>
                <td>${course?.course_name || 'N/A'}</td>
                <td>${record.assessment_type}</td>
                <td>${record.marks_obtained}/${record.total_marks}</td>
                <td>${record.percentage?.toFixed(2)}%</td>
                <td>
                    <span class="grade-badge grade-${record.grade?.charAt(0).toLowerCase()}">
                        ${record.grade}
                    </span>
                </td>
                <td>${new Date(record.assessment_date).toLocaleDateString()}</td>
                <td class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editMarks('${record.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteMarks('${record.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateGradesChart() {
    const ctx = document.getElementById('gradesChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.gradesChartInstance) {
        window.gradesChartInstance.destroy();
    }
    
    // Count grades
    const gradeCounts = {};
    currentState.gradingSystem.forEach(grade => {
        gradeCounts[grade.grade] = 0;
    });
    
    currentState.marks.forEach(record => {
        if (record.grade && gradeCounts.hasOwnProperty(record.grade)) {
            gradeCounts[record.grade]++;
        }
    });
    
    window.gradesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(gradeCounts),
            datasets: [{
                label: 'Grade Distribution',
                data: Object.values(gradeCounts),
                backgroundColor: [
                    '#2ecc71', '#27ae60', '#3498db', '#2980b9',
                    '#9b59b6', '#8e44ad', '#f1c40f', '#e74c3c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Grades'
                    }
                }
            }
        }
    });
}

// ============================================
// INTAKE MANAGEMENT
// ============================================

async function loadIntakes() {
    try {
        const { data, error } = await supabase
            .from('intakes')
            .select('*')
            .order('year', { ascending: false });
        
        if (error) throw error;
        
        currentState.intakes = data || [];
        return data || [];
    } catch (error) {
        console.error('Error loading intakes:', error);
        showToast('Error loading intakes: ' + error.message, 'error');
        return [];
    }
}

function showIntakeForm(intake = null) {
    const modal = elements.intakeModal;
    const formTitle = document.getElementById('intakeFormTitle');
    
    if (intake) {
        formTitle.textContent = 'Edit Intake';
        populateIntakeForm(intake);
    } else {
        formTitle.textContent = 'Create New Intake';
        resetIntakeForm();
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideIntakeForm() {
    const modal = elements.intakeModal;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetIntakeForm();
}

function populateIntakeForm(intake) {
    document.getElementById('intakeId').value = intake.id;
    document.getElementById('intakeYear').value = intake.year || '';
    document.getElementById('intakeSemester').value = intake.semester || '';
    document.getElementById('intakeStart').value = intake.start_date || '';
    document.getElementById('intakeEnd').value = intake.end_date || '';
    document.getElementById('intakeStatus').value = intake.status || 'Upcoming';
    document.getElementById('intakePrograms').value = Array.isArray(intake.programs) ? intake.programs.join(', ') : intake.programs || '';
    document.getElementById('intakeCapacity').value = intake.capacity || 0;
    document.getElementById('intakeNotes').value = intake.notes || '';
}

function resetIntakeForm() {
    const form = elements.intakeForm;
    if (form) {
        form.reset();
        document.getElementById('intakeId').value = '';
        document.getElementById('intakeYear').value = currentState.currentYear;
        document.getElementById('intakeSemester').value = 'Semester 1';
        document.getElementById('intakeStatus').value = 'Upcoming';
        document.getElementById('intakeCapacity').value = 50;
        document.getElementById('intakePrograms').value = currentState.programs.join(', ');
        
        // Set default dates
        const today = new Date();
        document.getElementById('intakeStart').value = today.toISOString().split('T')[0];
        const endDate = new Date(today);
        endDate.setMonth(today.getMonth() + 4); // 4 months later
        document.getElementById('intakeEnd').value = endDate.toISOString().split('T')[0];
    }
}

async function saveIntake(event) {
    event.preventDefault();
    
    try {
        const intakeData = {
            year: parseInt(document.getElementById('intakeYear').value),
            semester: document.getElementById('intakeSemester').value,
            start_date: document.getElementById('intakeStart').value,
            end_date: document.getElementById('intakeEnd').value,
            status: document.getElementById('intakeStatus').value,
            programs: document.getElementById('intakePrograms').value.split(',').map(p => p.trim()).filter(p => p),
            capacity: parseInt(document.getElementById('intakeCapacity').value),
            notes: document.getElementById('intakeNotes').value,
            created_at: new Date().toISOString()
        };
        
        const intakeId = document.getElementById('intakeId').value;
        let result;
        
        if (intakeId) {
            const { data, error } = await supabase
                .from('intakes')
                .update(intakeData)
                .eq('id', intakeId)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Intake updated successfully', 'success');
        } else {
            const { data, error } = await supabase
                .from('intakes')
                .insert([intakeData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Intake created successfully', 'success');
        }
        
        hideIntakeForm();
        await loadIntakes();
        
        return result;
    } catch (error) {
        console.error('Error saving intake:', error);
        showToast('Error saving intake: ' + error.message, 'error');
    }
}

function renderIntakesTimeline() {
    const timeline = document.getElementById('intakesTimeline');
    if (!timeline) return;
    
    if (!currentState.intakes || currentState.intakes.length === 0) {
        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-content">
                    <h4>No intakes found</h4>
                    <p>Create your first intake to get started</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    currentState.intakes.forEach(intake => {
        const enrolledCount = currentState.students.filter(s => 
            s.intake_year === intake.year && s.semester === intake.semester
        ).length;
        
        const capacityPercent = intake.capacity > 0 ? 
            Math.round((enrolledCount / intake.capacity) * 100) : 0;
        
        html += `
            <div class="timeline-item">
                <div class="timeline-marker status-${intake.status.toLowerCase()}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h4>${intake.year} - ${intake.semester}</h4>
                        <span class="status-badge status-${intake.status.toLowerCase()}">
                            ${intake.status}
                        </span>
                    </div>
                    <div class="timeline-details">
                        <p><i class="fas fa-calendar"></i> ${new Date(intake.start_date).toLocaleDateString()} - ${new Date(intake.end_date).toLocaleDateString()}</p>
                        <p><i class="fas fa-users"></i> ${enrolledCount} / ${intake.capacity} students (${capacityPercent}%)</p>
                        <p><i class="fas fa-graduation-cap"></i> ${Array.isArray(intake.programs) ? intake.programs.join(', ') : intake.programs || 'All programs'}</p>
                    </div>
                    <div class="timeline-progress">
                        <div class="progress-bar" style="width: ${capacityPercent}%"></div>
                    </div>
                    <div class="timeline-actions">
                        <button class="btn-action btn-edit" onclick="editIntake('${intake.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action btn-view" onclick="viewIntakeDetails('${intake.id}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    timeline.innerHTML = html;
}

function renderCurrentIntakes() {
    const container = document.getElementById('currentIntakes');
    if (!container) return;
    
    const currentIntakes = currentState.intakes.filter(intake => 
        intake.status === 'Active' || intake.status === 'Ongoing'
    );
    
    if (currentIntakes.length === 0) {
        container.innerHTML = `
            <div class="no-intakes">
                <i class="fas fa-calendar-times"></i>
                <p>No active intakes at the moment</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="intakes-grid">';
    currentIntakes.forEach(intake => {
        const enrolledStudents = currentState.students.filter(s => 
            s.intake_year === intake.year && s.semester === intake.semester
        );
        
        html += `
            <div class="intake-card">
                <div class="intake-card-header">
                    <h4>${intake.year} ${intake.semester}</h4>
                    <span class="status-badge status-${intake.status.toLowerCase()}">
                        ${intake.status}
                    </span>
                </div>
                <div class="intake-card-body">
                    <div class="intake-stats">
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <div>
                                <h3>${enrolledStudents.length}</h3>
                                <p>Enrolled</p>
                            </div>
                        </div>
                        <div class="stat">
                            <i class="fas fa-graduation-cap"></i>
                            <div>
                                <h3>${Array.isArray(intake.programs) ? intake.programs.length : 1}</h3>
                                <p>Programs</p>
                            </div>
                        </div>
                    </div>
                    <div class="intake-dates">
                        <p><i class="fas fa-calendar"></i> ${new Date(intake.start_date).toLocaleDateString()} - ${new Date(intake.end_date).toLocaleDateString()}</p>
                    </div>
                    <div class="intake-progress">
                        <div class="progress-info">
                            <span>Capacity: ${enrolledStudents.length}/${intake.capacity}</span>
                            <span>${Math.round((enrolledStudents.length / intake.capacity) * 100)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(enrolledStudents.length / intake.capacity) * 100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="intake-card-footer">
                    <button class="btn-action" onclick="viewIntakeDetails('${intake.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-action" onclick="viewIntakeStudents('${intake.id}')">
                        <i class="fas fa-users"></i> View Students
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function viewIntakeDetails(intakeId) {
    const intake = currentState.intakes.find(i => i.id === intakeId);
    if (!intake) return;
    
    const enrolledStudents = currentState.students.filter(s => 
        s.intake_year === intake.year && s.semester === intake.semester
    );
    
    showConfirmModal(
        `<h4>${intake.year} - ${intake.semester} Intake</h4>
        <div class="intake-details-modal">
            <p><strong>Status:</strong> <span class="status-badge status-${intake.status.toLowerCase()}">${intake.status}</span></p>
            <p><strong>Duration:</strong> ${new Date(intake.start_date).toLocaleDateString()} to ${new Date(intake.end_date).toLocaleDateString()}</p>
            <p><strong>Programs:</strong> ${Array.isArray(intake.programs) ? intake.programs.join(', ') : intake.programs || 'All programs'}</p>
            <p><strong>Capacity:</strong> ${intake.capacity} students</p>
            <p><strong>Enrolled:</strong> ${enrolledStudents.length} students</p>
            <p><strong>Enrollment Rate:</strong> ${Math.round((enrolledStudents.length / intake.capacity) * 100)}%</p>
            ${intake.notes ? `<p><strong>Notes:</strong> ${intake.notes}</p>` : ''}
            <div style="margin-top: 15px;">
                <button onclick="viewIntakeStudents('${intake.id}')" style="padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    View Students
                </button>
                <button onclick="editIntake('${intake.id}')" style="padding: 8px 15px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Edit Intake
                </button>
            </div>
        </div>`,
        'Close',
        null
    );
}

function viewIntakeStudents(intakeId) {
    const intake = currentState.intakes.find(i => i.id === intakeId);
    if (!intake) return;
    
    const intakeStudents = currentState.students.filter(s => 
        s.intake_year === intake.year && s.semester === intake.semester
    );
    
    let html = `
        <h4>Students in ${intake.year} - ${intake.semester} Intake</h4>
        <div class="intake-students-modal">
            <div class="intake-stats-summary">
                <div class="stat">
                    <i class="fas fa-users"></i>
                    <div>
                        <h3>${intakeStudents.length}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div class="stat">
                    <i class="fas fa-graduation-cap"></i>
                    <div>
                        <h3>${new Set(intakeStudents.map(s => s.program)).size}</h3>
                        <p>Programs</p>
                    </div>
                </div>
                <div class="stat">
                    <i class="fas fa-user-check"></i>
                    <div>
                        <h3>${intakeStudents.filter(s => s.status === 'Active').length}</h3>
                        <p>Active Students</p>
                    </div>
                </div>
            </div>
    `;
    
    if (intakeStudents.length === 0) {
        html += '<p class="no-data">No students enrolled in this intake yet.</p>';
    } else {
        html += `
            <div class="students-list">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Reg No</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        intakeStudents.forEach(student => {
            html += `
                <tr>
                    <td>${student.registration_number || 'N/A'}</td>
                    <td>${student.first_name} ${student.last_name}</td>
                    <td>${student.program || 'N/A'}</td>
                    <td>
                        <span class="status-badge status-${student.status?.toLowerCase() || 'active'}">
                            ${student.status || 'Active'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewStudent('${student.id}'); hideConfirmModal();">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editStudent('${student.id}'); hideConfirmModal();">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += '</div>';
    
    showConfirmModal(html, 'Close', null);
}

function updateIntakeStats() {
    const currentYear = currentState.currentYear;
    const yearIntakes = currentState.intakes.filter(i => i.year === currentYear);
    const yearStudents = currentState.students.filter(s => s.intake_year === currentYear);
    
    const totalIntakes = yearIntakes.length;
    const totalStudents = yearStudents.length;
    const activeIntakes = yearIntakes.filter(i => i.status === 'Active').length;
    
    document.getElementById('currentYearIntakes').textContent = currentYear;
    document.getElementById('totalIntakes').textContent = totalIntakes;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('activeIntakes').textContent = activeIntakes;
}

// ============================================
// REPORTS & DASHBOARD
// ============================================

function renderReportsSection() {
    const container = document.getElementById('reportsSection');
    if (!container) return;
    
    container.innerHTML = `
        <div class="reports-container">
            <div class="reports-header">
                <h2><i class="fas fa-chart-pie"></i> Reports & Analytics</h2>
                <p>Generate detailed reports and view analytics</p>
            </div>
            
            <div class="reports-grid">
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <h3>Student Reports</h3>
                    <p>Generate individual student transcripts and performance reports</p>
                    <button class="btn-primary" onclick="generateStudentReports()">
                        <i class="fas fa-file-pdf"></i> Generate Reports
                    </button>
                </div>
                
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3>Program Reports</h3>
                    <p>View program statistics and performance analytics</p>
                    <button class="btn-primary" onclick="generateProgramReports()">
                        <i class="fas fa-chart-bar"></i> View Analytics
                    </button>
                </div>
                
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <h3>Intake Reports</h3>
                    <p>Generate intake statistics and enrollment reports</p>
                    <button class="btn-primary" onclick="generateIntakeReports()">
                        <i class="fas fa-file-excel"></i> Export Data
                    </button>
                </div>
                
                <div class="report-card">
                    <div class="report-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>Performance Reports</h3>
                    <p>View grade distributions and academic performance</p>
                    <button class="btn-primary" onclick="generatePerformanceReports()">
                        <i class="fas fa-chart-pie"></i> View Charts
                    </button>
                </div>
            </div>
            
            <div class="quick-stats-reports">
                <h3>Quick Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <h4>Total Students</h4>
                        <h2>${currentState.students.length}</h2>
                    </div>
                    <div class="stat-box">
                        <h4>Active Courses</h4>
                        <h2>${currentState.courses.filter(c => c.status === 'Active').length}</h2>
                    </div>
                    <div class="stat-box">
                        <h4>Pass Rate</h4>
                        <h2>${calculateOverallPassRate()}%</h2>
                    </div>
                    <div class="stat-box">
                        <h4>Average GPA</h4>
                        <h2>${calculateAverageGPA()}</h2>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function calculateOverallPassRate() {
    if (currentState.marks.length === 0) return '0.0';
    const passed = currentState.marks.filter(m => m.grade !== 'F').length;
    return ((passed / currentState.marks.length) * 100).toFixed(1);
}

function calculateAverageGPA() {
    if (currentState.marks.length === 0) return '0.00';
    const totalGradePoints = currentState.marks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0);
    return (totalGradePoints / currentState.marks.length).toFixed(2);
}

function generateStudentReports() {
    showConfirmModal(`
        <h4>Generate Student Reports</h4>
        <div class="report-options">
            <label>Select Student:</label>
            <select id="reportStudent" class="form-control">
                <option value="">Select Student</option>
                ${currentState.students.map(student => `
                    <option value="${student.id}">${student.registration_number} - ${student.first_name} ${student.last_name}</option>
                `).join('')}
            </select>
            
            <label>Report Type:</label>
            <select id="reportType" class="form-control">
                <option value="transcript">Academic Transcript</option>
                <option value="performance">Performance Report</option>
                <option value="summary">Summary Report</option>
            </select>
            
            <div style="margin-top: 20px;">
                <button onclick="generateSelectedStudentReport()" class="btn-primary" style="width: 100%;">
                    <i class="fas fa-file-pdf"></i> Generate Report
                </button>
            </div>
        </div>
    `, 'Close', null);
}

function generateSelectedStudentReport() {
    const studentId = document.getElementById('reportStudent').value;
    const reportType = document.getElementById('reportType').value;
    
    if (!studentId) {
        showToast('Please select a student', 'error');
        return;
    }
    
    hideConfirmModal();
    generateStudentReport(studentId, reportType);
}

function generateProgramReports() {
    showConfirmModal(`
        <h4>Generate Program Reports</h4>
        <div class="report-options">
            <label>Select Program:</label>
            <select id="reportProgram" class="form-control">
                <option value="">All Programs</option>
                ${currentState.programs.map(program => `
                    <option value="${program}">${program}</option>
                `).join('')}
            </select>
            
            <label>Report Period:</label>
            <select id="reportPeriod" class="form-control">
                <option value="current">Current Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Period</option>
            </select>
            
            <div style="margin-top: 20px;">
                <button onclick="generateSelectedProgramReport()" class="btn-primary" style="width: 100%;">
                    <i class="fas fa-chart-bar"></i> Generate Report
                </button>
            </div>
        </div>
    `, 'Close', null);
}

function generateIntakeReports() {
    showConfirmModal(`
        <h4>Generate Intake Reports</h4>
        <div class="report-options">
            <label>Select Intake Year:</label>
            <select id="reportIntakeYear" class="form-control">
                <option value="">All Years</option>
                ${Array.from(new Set(currentState.intakes.map(i => i.year))).sort((a, b) => b - a).map(year => `
                    <option value="${year}">${year}</option>
                `).join('')}
            </select>
            
            <label>Report Format:</label>
            <select id="reportFormat" class="form-control">
                <option value="excel">Excel Spreadsheet</option>
                <option value="pdf">PDF Document</option>
                <option value="csv">CSV File</option>
            </select>
            
            <div style="margin-top: 20px;">
                <button onclick="generateSelectedIntakeReport()" class="btn-primary" style="width: 100%;">
                    <i class="fas fa-file-excel"></i> Export Report
                </button>
            </div>
        </div>
    `, 'Close', null);
}

function generatePerformanceReports() {
    // Show performance charts
    showConfirmModal(`
        <h4>Performance Analytics</h4>
        <div class="performance-analytics">
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="trendChart"></canvas>
            </div>
        </div>
    `, 'Close', null);
    
    // Initialize charts after modal is shown
    setTimeout(() => {
        renderPerformanceCharts();
    }, 100);
}

function renderPerformanceCharts() {
    // Performance by program chart
    const performanceCtx = document.getElementById('performanceChart');
    if (performanceCtx) {
        const programPerformance = {};
        currentState.programs.forEach(program => {
            const programStudents = currentState.students.filter(s => s.program === program);
            const programMarks = currentState.marks.filter(m => 
                programStudents.some(s => s.id === m.student_id)
            );
            
            if (programMarks.length > 0) {
                const avgGradePoints = programMarks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0) / programMarks.length;
                programPerformance[program] = avgGradePoints;
            }
        });
        
        new Chart(performanceCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(programPerformance),
                datasets: [{
                    label: 'Average GPA',
                    data: Object.values(programPerformance),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 4.0
                    }
                }
            }
        });
    }
    
    // Trend chart
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        const years = Array.from(new Set(currentState.students.map(s => s.intake_year))).sort();
        const enrollmentTrend = years.map(year => 
            currentState.students.filter(s => s.intake_year === year).length
        );
        
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Enrollment Trend',
                    data: enrollmentTrend,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

function generateStudentReport(studentId, reportType = 'transcript') {
    const student = currentState.students.find(s => s.id === studentId);
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }
    
    const studentMarks = currentState.marks.filter(m => m.student_id === studentId);
    const courses = studentMarks.map(mark => {
        const course = currentState.courses.find(c => c.id === mark.course_id);
        return {
            course_code: course?.course_code || 'Unknown',
            course_name: course?.course_name || 'Unknown',
            grade: mark.grade,
            percentage: mark.percentage,
            credits: course?.credits || 0,
            assessment_date: mark.assessment_date
        };
    });
    
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const gpa = studentMarks.length > 0 ? 
        (studentMarks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0) / studentMarks.length).toFixed(2) : 
        '0.00';
    
    // Create a new window for the report
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
        <html>
        <head>
            <title>Student ${reportType === 'transcript' ? 'Transcript' : 'Report'} - ${student.first_name} ${student.last_name}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #ccc;
                    padding-bottom: 20px;
                }
                .student-info {
                    margin-bottom: 30px;
                }
                .student-info table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .student-info td {
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                }
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .report-table th, .report-table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                .report-table th {
                    background-color: #f4f4f4;
                    font-weight: bold;
                }
                .grade-a { color: #27ae60; font-weight: bold; }
                .grade-b { color: #3498db; font-weight: bold; }
                .grade-c { color: #f39c12; font-weight: bold; }
                .grade-d { color: #e67e22; font-weight: bold; }
                .grade-f { color: #e74c3c; font-weight: bold; }
                .summary {
                    display: flex;
                    justify-content: space-between;
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                }
                .grading-scale {
                    margin-top: 30px;
                }
                .grading-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .grading-table th, .grading-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: center;
                }
                .grading-table th {
                    background-color: #f4f4f4;
                }
                .no-data {
                    text-align: center;
                    color: #999;
                    font-style: italic;
                    padding: 20px;
                }
                @media print {
                    body { margin: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h2>${currentState.settings.instituteName}</h2>
                <h3>Student ${reportType === 'transcript' ? 'Academic Transcript' : reportType === 'performance' ? 'Performance Report' : 'Summary Report'}</h3>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="student-info">
                <h4>Student Information</h4>
                <table>
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td>${student.first_name} ${student.last_name} ${student.other_names ? '(' + student.other_names + ')' : ''}</td>
                    </tr>
                    <tr>
                        <td><strong>Registration Number:</strong></td>
                        <td>${student.registration_number || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Program:</strong></td>
                        <td>${student.program || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Intake Year:</strong></td>
                        <td>${student.intake_year || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Status:</strong></td>
                        <td>${student.status || 'Active'}</td>
                    </tr>
                </table>
            </div>
            
            ${courses.length > 0 ? `
                <div class="academic-performance">
                    <h4>Academic Performance</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Course Code</th>
                                <th>Course Name</th>
                                <th>Credits</th>
                                <th>Grade</th>
                                <th>Percentage</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courses.map(course => `
                                <tr>
                                    <td>${course.course_code}</td>
                                    <td>${course.course_name}</td>
                                    <td>${course.credits}</td>
                                    <td class="grade-${course.grade.charAt(0).toLowerCase()}">${course.grade}</td>
                                    <td>${course.percentage.toFixed(1)}%</td>
                                    <td>${new Date(course.assessment_date).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="summary">
                        <div><strong>Total Credits:</strong> ${totalCredits}</div>
                        <div><strong>GPA:</strong> ${gpa}</div>
                        <div><strong>Courses Completed:</strong> ${courses.length}</div>
                    </div>
                </div>
            ` : '<p class="no-data">No academic records found.</p>'}
            
            <div class="grading-scale">
                <h4>Grading Scale</h4>
                <table class="grading-table">
                    <thead>
                        <tr>
                            <th>Grade</th>
                            <th>Points</th>
                            <th>Percentage</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentState.gradingSystem.map(grade => `
                            <tr>
                                <td class="grade-${grade.grade.charAt(0).toLowerCase()}">${grade.grade}</td>
                                <td>${grade.points}</td>
                                <td>${grade.min}% - ${grade.max}%</td>
                                <td>${grade.description}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Print Report
                </button>
            </div>
        </body>
        </html>
    `);
    reportWindow.document.close();
}

function updateDashboard() {
    updateStatsCards();
    updateProgramChart();
    updateRecentActivity();
    updatePerformanceSummary();
}

function updateStatsCards() {
    // Total Students
    document.getElementById('totalStudentsCount').textContent = currentState.students.length;
    
    // Active Courses
    const activeCourses = currentState.courses.filter(c => c.status === 'Active').length;
    document.getElementById('activeCoursesCount').textContent = activeCourses;
    
    // Average Grade
    const totalGradePoints = currentState.marks.reduce((sum, mark) => sum + (mark.grade_points || 0), 0);
    const avgGrade = currentState.marks.length > 0 ? (totalGradePoints / currentState.marks.length).toFixed(2) : '0.00';
    document.getElementById('averageGrade').textContent = avgGrade;
    
    // Current Intakes
    const currentIntakes = currentState.intakes.filter(i => 
        i.status === 'Active' || i.status === 'Ongoing'
    ).length;
    document.getElementById('currentIntakesCount').textContent = currentIntakes;
}

function updateProgramChart() {
    const ctx = document.getElementById('programChart');
    if (!ctx) return;
    
    // Count students by program
    const programCounts = {};
    currentState.programs.forEach(program => {
        programCounts[program] = 0;
    });
    
    currentState.students.forEach(student => {
        if (student.program && programCounts.hasOwnProperty(student.program)) {
            programCounts[student.program]++;
        }
    });
    
    // Destroy existing chart if it exists
    if (window.programChartInstance) {
        window.programChartInstance.destroy();
    }
    
    window.programChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(programCounts),
            datasets: [{
                data: Object.values(programCounts),
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Students by Program'
                }
            }
        }
    });
}

function updateRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    // Combine and sort recent activities from all tables
    const activities = [];
    
    // Recent students (last 5)
    currentState.students.slice(0, 5).forEach(student => {
        activities.push({
            type: 'student',
            action: student.status === 'Active' ? 'enrolled' : 'registered',
            name: `${student.first_name} ${student.last_name}`,
            program: student.program,
            date: student.enrollment_date || student.created_at,
            icon: 'fas fa-user-plus'
        });
    });
    
    // Recent marks (last 5)
    currentState.marks.slice(0, 5).forEach(mark => {
        const student = currentState.students.find(s => s.id === mark.student_id);
        const course = currentState.courses.find(c => c.id === mark.course_id);
        if (student && course) {
            activities.push({
                type: 'marks',
                action: 'graded',
                name: `${student.first_name} ${student.last_name}`,
                details: `${course.course_code}: ${mark.grade}`,
                date: mark.assessment_date || mark.created_at,
                icon: 'fas fa-chart-line'
            });
        }
    });
    
    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render activities
    let html = '';
    activities.slice(0, 10).forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>
                        <strong>${activity.name}</strong> 
                        ${activity.action} 
                        ${activity.details ? `in ${activity.details}` : `in ${activity.program}`}
                    </p>
                    <small>${new Date(activity.date).toLocaleDateString()} at ${new Date(activity.date).toLocaleTimeString()}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="no-data">No recent activity</p>';
}

function updatePerformanceSummary() {
    const container = document.getElementById('performanceSummary');
    if (!container) return;
    
    if (currentState.marks.length === 0) {
        container.innerHTML = '<p class="no-data">No performance data available</p>';
        return;
    }
    
    // Calculate statistics
    const totalMarks = currentState.marks.length;
    const passed = currentState.marks.filter(m => m.grade !== 'F').length;
    const passRate = ((passed / totalMarks) * 100).toFixed(1);
    
    const topPerformers = currentState.marks
        .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
        .slice(0, 5)
        .map(mark => {
            const student = currentState.students.find(s => s.id === mark.student_id);
            const course = currentState.courses.find(c => c.id === mark.course_id);
            return {
                name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
                course: course?.course_code || 'Unknown',
                grade: mark.grade,
                percentage: mark.percentage
            };
        });
    
    let html = `
        <div class="performance-stats">
            <div class="stat-card">
                <h3>${passRate}%</h3>
                <p>Pass Rate</p>
            </div>
            <div class="stat-card">
                <h3>${currentState.gradingSystem[0].grade}</h3>
                <p>Top Grade</p>
            </div>
            <div class="stat-card">
                <h3>${totalMarks}</h3>
                <p>Total Assessments</p>
            </div>
        </div>
    `;
    
    if (topPerformers.length > 0) {
        html += `
            <div class="top-performers">
                <h4>Top Performers</h4>
                <ul>
        `;
        
        topPerformers.forEach(performer => {
            html += `
                <li>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-course">${performer.course}</span>
                    <span class="performer-grade grade-badge grade-${performer.grade?.charAt(0).toLowerCase()}">
                        ${performer.grade} (${performer.percentage?.toFixed(1) || '0.0'}%)
                    </span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const targetContent = document.getElementById(`${tabId}Tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Activate selected tab
    const targetTab = document.querySelector(`.form-tab[data-tab="${tabId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function populateIntakeYears() {
    const currentYear = currentState.currentYear;
    const yearSelects = document.querySelectorAll('select[id*="intakeYear"]');
    
    yearSelects.forEach(select => {
        if (select.id !== 'filterIntakeYear') {
            let html = '';
            for (let year = currentYear - 5; year <= currentYear + 2; year++) {
                html += `<option value="${year}">${year}</option>`;
            }
            select.innerHTML = html;
            select.value = currentYear;
        }
    });
}

function populateStudentDropdowns() {
    const studentSelects = document.querySelectorAll('select[id*="marksStudent"], select[id*="student"]');
    
    studentSelects.forEach(select => {
        let html = '<option value="">Select Student</option>';
        currentState.students.forEach(student => {
            html += `<option value="${student.id}">${student.registration_number} - ${student.first_name} ${student.last_name}</option>`;
        });
        select.innerHTML = html;
    });
}

function populateCourseDropdowns() {
    const courseSelects = document.querySelectorAll('select[id*="marksCourse"], select[id*="course"]');
    
    courseSelects.forEach(select => {
        let html = '<option value="">Select Course</option>';
        currentState.courses.forEach(course => {
            if (course.status === 'Active') {
                html += `<option value="${course.id}">${course.course_code} - ${course.course_name}</option>`;
            }
        });
        select.innerHTML = html;
    });
}

function loadProgramCourses() {
    const program = document.getElementById('program').value;
    const courseSelection = document.getElementById('courseSelection');
    
    if (!program || !courseSelection) return;
    
    const programCourses = currentState.courses.filter(c => 
        c.program === program && c.status === 'Active'
    );
    
    if (programCourses.length === 0) {
        courseSelection.innerHTML = '<p class="no-courses">No courses available for this program</p>';
        return;
    }
    
    let html = '<div class="course-checkboxes">';
    programCourses.forEach(course => {
        html += `
            <label class="course-checkbox">
                <input type="checkbox" name="enrolled_courses" value="${course.id}">
                <span class="course-checkbox-info">
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <small>${course.credits} credits • Level ${course.level}</small>
                </span>
            </label>
        `;
    });
    html += '</div>';
    
    courseSelection.innerHTML = html;
}

function showSettingsTab(tabId) {
    // Hide all settings tab contents
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all settings tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const targetContent = document.getElementById(`${tabId}Settings`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Activate selected tab
    const targetTab = document.querySelector(`.settings-tab[data-tab="${tabId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function loadSettingsUI() {
    const settings = currentState.settings;
    
    // General Settings
    document.getElementById('instituteName').value = settings.instituteName;
    document.getElementById('minPassingGrade').value = settings.minPassingGrade;
    document.getElementById('maxCredits').value = settings.maxCredits;
    document.getElementById('attendanceThreshold').value = settings.attendanceThreshold;
    document.getElementById('dateFormat').value = settings.dateFormat;
    document.getElementById('timezone').value = settings.timezone;
    document.getElementById('language').value = settings.language;
    
    // Program Settings
    document.getElementById('enableBasicTEE').checked = settings.enableBasicTEE;
    document.getElementById('enableHNC').checked = settings.enableHNC;
    document.getElementById('enableAdvancedTEE').checked = settings.enableAdvancedTEE;
    document.getElementById('enableTEENS').checked = settings.enableTEENS;
    
    // User Preferences
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('enableDarkMode').checked = darkMode;
}

function saveSettings() {
    try {
        // General Settings
        currentState.settings.instituteName = document.getElementById('instituteName').value;
        currentState.settings.minPassingGrade = document.getElementById('minPassingGrade').value;
        currentState.settings.maxCredits = parseInt(document.getElementById('maxCredits').value);
        currentState.settings.attendanceThreshold = parseInt(document.getElementById('attendanceThreshold').value);
        currentState.settings.dateFormat = document.getElementById('dateFormat').value;
        currentState.settings.timezone = document.getElementById('timezone').value;
        currentState.settings.language = document.getElementById('language').value;
        
        // Program Settings
        currentState.settings.enableBasicTEE = document.getElementById('enableBasicTEE').checked;
        currentState.settings.enableHNC = document.getElementById('enableHNC').checked;
        currentState.settings.enableAdvancedTEE = document.getElementById('enableAdvancedTEE').checked;
        currentState.settings.enableTEENS = document.getElementById('enableTEENS').checked;
        
        // User Preferences
        const darkMode = document.getElementById('enableDarkMode').checked;
        localStorage.setItem('darkMode', darkMode);
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Save to localStorage
        localStorage.setItem('teeportalSettings', JSON.stringify(currentState.settings));
        
        // Apply settings
        applySettings();
        
        showToast('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings: ' + error.message, 'error');
    }
}

function exportData(dataType) {
    try {
        let data, filename;
        
        switch(dataType) {
            case 'students':
                data = currentState.students;
                filename = `students_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case 'courses':
                data = currentState.courses;
                filename = `courses_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case 'marks':
                data = currentState.marks;
                filename = `marks_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case 'intakes':
                data = currentState.intakes;
                filename = `intakes_${new Date().toISOString().split('T')[0]}.json`;
                break;
            default:
                throw new Error('Invalid data type');
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`${dataType} exported successfully`, 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error exporting data: ' + error.message, 'error');
    }
}

function showConfirmModal(message, confirmText = 'Yes', cancelText = 'No') {
    return new Promise((resolve) => {
        elements.confirmMessage.innerHTML = message;
        elements.confirmYes.textContent = confirmText;
        elements.confirmNo.textContent = cancelText;
        
        elements.confirmModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Store resolve function
        currentState.confirmResolve = resolve;
    });
}

function hideConfirmModal() {
    elements.confirmModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    if (currentState.confirmResolve) {
        currentState.confirmResolve(false);
        currentState.confirmResolve = null;
    }
}

function handleConfirmYes() {
    hideConfirmModal();
    if (currentState.confirmResolve) {
        currentState.confirmResolve(true);
        currentState.confirmResolve = null;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function viewStudent(studentId) {
    const student = currentState.students.find(s => s.id === studentId);
    if (!student) return;
    
    // Calculate student statistics
    const studentMarks = currentState.marks.filter(m => m.student_id === studentId);
    const completedCourses = studentMarks.length;
    const avgGrade = studentMarks.length > 0 ? 
        (studentMarks.reduce((sum, m) => sum + (m.grade_points || 0), 0) / studentMarks.length).toFixed(2) : 
        0;
    
    const modalContent = `
        <div class="student-profile-modal">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="profile-info">
                    <h3>${student.first_name} ${student.last_name}</h3>
                    <p>${student.registration_number} • ${student.program}</p>
                    <span class="status-badge status-${student.status?.toLowerCase() || 'active'}">
                        ${student.status || 'Active'}
                    </span>
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="stat">
                    <h4>${completedCourses}</h4>
                    <p>Courses Completed</p>
                </div>
                <div class="stat">
                    <h4>${avgGrade}</h4>
                    <p>Average Grade</p>
                </div>
                <div class="stat">
                    <h4>${student.intake_year}</h4>
                    <p>Intake Year</p>
                </div>
            </div>
            
            <div class="profile-details">
                <h4>Personal Information</h4>
                <p><strong>Email:</strong> ${student.email}</p>
                <p><strong>Phone:</strong> ${student.phone}</p>
                <p><strong>Home Church:</strong> ${student.home_church || 'Not specified'}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(student.enrollment_date).toLocaleDateString()}</p>
            </div>
            
            ${studentMarks.length > 0 ? `
                <div class="profile-performance">
                    <h4>Academic Performance</h4>
                    <table class="marks-table">
                        <thead>
                            <tr>
                                <th>Course</th>
                                <th>Grade</th>
                                <th>Percentage</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentMarks.map(mark => {
                                const course = currentState.courses.find(c => c.id === mark.course_id);
                                return `
                                    <tr>
                                        <td>${course?.course_code || 'Unknown'}</td>
                                        <td><span class="grade-badge grade-${mark.grade?.charAt(0).toLowerCase()}">${mark.grade}</span></td>
                                        <td>${mark.percentage?.toFixed(1)}%</td>
                                        <td>${new Date(mark.assessment_date).toLocaleDateString()}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="generateStudentReport('${studentId}')" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    <i class="fas fa-file-pdf"></i> Generate Report
                </button>
                <button onclick="editStudent('${studentId}'); hideConfirmModal();" style="padding: 10px 20px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-edit"></i> Edit Student
                </button>
            </div>
        </div>
    `;
    
    showConfirmModal(modalContent, 'Close', null);
}

// ============================================
// EVENT HANDLERS FOR BUTTONS
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

// ============================================
// HELPER FUNCTIONS FOR MISSING IMPLEMENTATIONS
// ============================================

function editCourse(courseId) {
    const course = currentState.courses.find(c => c.id === courseId);
    if (course) {
        showCourseForm(course);
    }
}

async function deleteCourse(courseId) {
    const confirmed = await showConfirmModal('Are you sure you want to delete this course? This will also delete all associated marks.');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);
        
        if (error) throw error;
        
        showToast('Course deleted successfully', 'success');
        await loadCourses();
    } catch (error) {
        console.error('Error deleting course:', error);
        showToast('Error deleting course: ' + error.message, 'error');
    }
}

function editMarks(marksId) {
    const mark = currentState.marks.find(m => m.id === marksId);
    if (mark) {
        showMarksForm();
        // Populate marks form
        document.getElementById('marksId').value = mark.id;
        document.getElementById('marksStudent').value = mark.student_id;
        document.getElementById('marksCourse').value = mark.course_id;
        document.getElementById('marksAssessment').value = mark.assessment_type;
        document.getElementById('marksDate').value = mark.assessment_date;
        document.getElementById('marksObtained').value = mark.marks_obtained;
        document.getElementById('marksTotal').value = mark.total_marks;
        document.getElementById('marksRemarks').value = mark.remarks || '';
        
        // Trigger calculation
        calculateMarks();
    }
}

async function deleteMarks(marksId) {
    const confirmed = await showConfirmModal('Are you sure you want to delete these marks?');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase
            .from('marks')
            .delete()
            .eq('id', marksId);
        
        if (error) throw error;
        
        showToast('Marks deleted successfully', 'success');
        await loadMarks();
    } catch (error) {
        console.error('Error deleting marks:', error);
        showToast('Error deleting marks: ' + error.message, 'error');
    }
}

function editIntake(intakeId) {
    const intake = currentState.intakes.find(i => i.id === intakeId);
    if (intake) {
        showIntakeForm(intake);
    }
}

function updateStudentCounts() {
    document.getElementById('totalStudentsCount').textContent = currentState.students.length;
    const activeStudents = currentState.students.filter(s => s.status === 'Active').length;
    document.getElementById('activeStudentsCount').textContent = activeStudents;
}

function generateSelectedProgramReport() {
    const program = document.getElementById('reportProgram').value;
    const period = document.getElementById('reportPeriod').value;
    
    hideConfirmModal();
    showToast(`Generating ${program || 'All Programs'} report for ${period} period`, 'info');
    // Implementation would go here
}

function generateSelectedIntakeReport() {
    const year = document.getElementById('reportIntakeYear').value;
    const format = document.getElementById('reportFormat').value;
    
    hideConfirmModal();
    showToast(`Exporting ${year || 'All Years'} intake data as ${format}`, 'info');
    // Implementation would go here
}

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log('TEEPortal Admin System loaded successfully');
