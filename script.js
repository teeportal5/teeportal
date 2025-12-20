// ============================================
// TEEPORTAL - Theological Education by Extension
// Complete Administration System
// ============================================

// Initialize Supabase
const SUPABASE_URL = 'https://kmkjsessuzdfadlmndyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2pzZXNzdXpkZmFkbG1uZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTA1MzUsImV4cCI6MjA4MTgyNjUzNX0.16m_thmf2Td8uB5lan8vZDLkGkWIlftaxSOroqvDkU4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
                // Initialize reports
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
    
    const chart = new Chart(ctx, {
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
    document.getElementById('intakeName').value = intake.name || '';
    document.getElementById('intakeStartDate').value = intake.start_date || '';
    document.getElementById('intakeEndDate').value = intake.end_date || '';
    document.getElementById('intakeStatus').value = intake.status || '';
    document.getElementById('intakeDescription').value = intake.description || '';
}

function resetIntakeForm() {
    const form = elements.intakeForm;
    if (form) {
        form.reset();
        document.getElementById('intakeId').value = '';
        document.getElementById('intakeStatus').value = 'Upcoming';
        document.getElementById('intakeStartDate').value = new Date().toISOString().split('T')[0];
        
        // Set end date to 6 months from now
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);
        document.getElementById('intakeEndDate').value = endDate.toISOString().split('T')[0];
    }
}

async function saveIntake(event) {
    event.preventDefault();
    
    try {
        // Get selected programs
        const programCheckboxes = document.querySelectorAll('input[name="intakePrograms"]:checked');
        const programs = Array.from(programCheckboxes).map(cb => cb.value);
        
        const intakeData = {
            year: parseInt(document.getElementById('intakeYear').value),
            semester: document.getElementById('intakeSemester').value,
            name: document.getElementById('intakeName').value,
            start_date: document.getElementById('intakeStartDate').value,
            end_date: document.getElementById('intakeEndDate').value,
            status: document.getElementById('intakeStatus').value,
            description: document.getElementById('intakeDescription').value,
            programs: programs,
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
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    
    let html = '';
    for (let year = 2013; year <= 2030; year++) {
        const intake = currentState.intakes.find(i => i.year == year);
        const studentCount = currentState.students.filter(s => s.intake_year == year).length;
        
        html += `
            <div class="timeline-year ${intake ? 'active' : ''}" onclick="viewIntakeYear(${year})">
                <div class="year-label">Intake</div>
                <div class="year-value">${year}</div>
                <div class="year-stats">
                    ${studentCount} student${studentCount !== 1 ? 's' : ''}
                </div>
            </div>
        `;
    }
    
    timeline.innerHTML = html;
}

function renderCurrentIntakes() {
    const container = document.getElementById('currentIntakes');
    if (!container) return;
    
    const currentDate = new Date();
    const currentIntakes = currentState.intakes.filter(intake => {
        const endDate = new Date(intake.end_date);
        return endDate >= currentDate;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    if (currentIntakes.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-calendar-times"></i>
                <p>No current or upcoming intakes</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    currentIntakes.forEach(intake => {
        const studentCount = currentState.students.filter(s => s.intake_year == intake.year).length;
        const programs = Array.isArray(intake.programs) ? intake.programs : JSON.parse(intake.programs || '[]');
        
        html += `
            <div class="intake-card">
                <div class="intake-header">
                    <div class="intake-name">${intake.name}</div>
                    <div class="intake-status status-${intake.status.toLowerCase()}">
                        ${intake.status}
                    </div>
                </div>
                <div class="intake-dates">
                    <span>${new Date(intake.start_date).toLocaleDateString()}</span>
                    <span>to</span>
                    <span>${new Date(intake.end_date).toLocaleDateString()}</span>
                </div>
                <div class="intake-programs">
                    ${programs.map(program => `
                        <span class="program-badge">${program}</span>
                    `).join('')}
                </div>
                <div class="intake-stats">
                    <span><i class="fas fa-users"></i> ${studentCount} Students</span>
                    <span><i class="fas fa-book"></i> ${programs.length} Programs</span>
                </div>
                <div class="intake-actions">
                    <button class="btn btn-sm btn-primary" onclick="editIntake('${intake.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="viewIntakeDetails('${intake.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateIntakeStats() {
    const totalIntakes = currentState.intakes.length;
    const activeIntakes = currentState.intakes.filter(i => i.status === 'Ongoing').length;
    const totalEnrolled = currentState.students.length;
    const avgIntakeSize = totalIntakes > 0 ? Math.round(totalEnrolled / totalIntakes) : 0;
    
    document.getElementById('totalIntakes').textContent = totalIntakes;
    document.getElementById('activeIntakes').textContent = activeIntakes;
    document.getElementById('totalEnrolled').textContent = totalEnrolled;
    document.getElementById('avgIntakeSize').textContent = avgIntakeSize;
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

function updateDashboard() {
    updateStudentCounts();
    updateDashboardStats();
    updateProgramChart();
    updateRecentActivity();
}

function updateStudentCounts() {
    const totalStudents = currentState.students.length;
    const activeStudents = currentState.students.filter(s => s.status === 'Active').length;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('activeStudents').textContent = activeStudents;
    document.getElementById('headerStudentCount').textContent = `${totalStudents} Students`;
    document.getElementById('footerStudentCount').textContent = totalStudents;
}

function updateDashboardStats() {
    // Calculate average grade
    if (currentState.marks.length > 0) {
        const totalMarks = currentState.marks.length;
        const avgGrade = calculateAverageGrade();
        
        document.getElementById('totalMarks').textContent = totalMarks;
        document.getElementById('avgGrade').textContent = avgGrade;
    }
    
    // Update course count
    document.getElementById('footerCourseCount').textContent = currentState.courses.length;
    document.getElementById('footerIntakeCount').textContent = currentState.intakes.length;
}

function calculateAverageGrade() {
    if (currentState.marks.length === 0) return 'N/A';
    
    const gradePoints = currentState.marks
        .map(m => currentState.gradingSystem.find(g => g.grade === m.grade)?.points || 0)
        .filter(p => p > 0);
    
    if (gradePoints.length === 0) return 'N/A';
    
    const avgPoints = gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length;
    
    // Convert points back to grade
    const grade = currentState.gradingSystem.find(g => 
        avgPoints >= g.points - 0.3 && avgPoints <= g.points + 0.3
    )?.grade || 'N/A';
    
    return grade;
}

function updateProgramChart() {
    const ctx = document.getElementById('programChart');
    if (!ctx) return;
    
    const programCounts = {};
    currentState.programs.forEach(program => {
        programCounts[program] = currentState.students.filter(s => s.program === program).length;
    });
    
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(programCounts),
            datasets: [{
                data: Object.values(programCounts),
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#9b59b6',
                    '#f1c40f'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    // Get recent marks (last 5)
    const recentMarks = [...currentState.marks]
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, 5);
    
    let html = '';
    recentMarks.forEach(record => {
        const student = record.students;
        const course = record.courses;
        const timeAgo = getTimeAgo(new Date(record.recorded_at));
        
        html += `
            <div class="activity-item">
                <div class="activity-icon activity-success">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="activity-content">
                    <p>${student?.first_name} ${student?.last_name} scored ${record.grade} in ${course?.course_name}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function populateIntakeYears() {
    const selectElements = [
        'intakeYear',
        'filterIntakeYear',
        'reportIntake',
        'dashboardYear'
    ];
    
    selectElements.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Year</option>';
            for (let year = 2013; year <= 2030; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentState.currentYear) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        }
    });
}

function populateStudentDropdowns() {
    const selectElements = [
        'marksStudent',
        'filterMarksStudent',
        'reportStudent'
    ];
    
    selectElements.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Student</option>';
            currentState.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.registration_number} - ${student.first_name} ${student.last_name}`;
                select.appendChild(option);
            });
        }
    });
}

function populateCourseDropdowns() {
    const selectElements = [
        'marksCourse',
        'filterMarksCourse',
        'coursePrerequisites'
    ];
    
    selectElements.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Course</option>';
            currentState.courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        }
    });
}

async function loadProgramCourses() {
    const program = document.getElementById('program').value;
    const container = document.getElementById('courseSelection');
    
    if (!program || !container) return;
    
    const programCourses = currentState.courses.filter(c => 
        c.program === program || c.program === 'All'
    );
    
    if (programCourses.length === 0) {
        container.innerHTML = '<p class="select-program-prompt">No courses available for this program</p>';
        return;
    }
    
    let html = '';
    programCourses.forEach(course => {
        html += `
            <label class="course-checkbox">
                <input type="checkbox" name="selectedCourses" value="${course.id}">
                <span>${course.course_code}: ${course.course_name}</span>
                <small>(${course.credits} credits)</small>
            </label>
        `;
    });
    
    container.innerHTML = html;
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId + 'Tab') {
            content.classList.add('active');
        }
    });
    
    currentState.activeTab = tabId;
}

function nextTab() {
    const tabs = ['personal', 'academic', 'contact'];
    const currentIndex = tabs.indexOf(currentState.activeTab);
    if (currentIndex < tabs.length - 1) {
        switchTab(tabs[currentIndex + 1]);
    }
}

function previousTab() {
    const tabs = ['personal', 'academic', 'contact'];
    const currentIndex = tabs.indexOf(currentState.activeTab);
    if (currentIndex > 0) {
        switchTab(tabs[currentIndex - 1]);
    }
}

function showSettingsTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === tabId + 'Panel') {
            panel.classList.add('active');
        }
    });
}

function loadSettingsUI() {
    const settings = currentState.settings;
    
    // Populate settings form
    document.getElementById('instituteName').value = settings.instituteName;
    document.getElementById('minPassingGrade').value = settings.minPassingGrade;
    document.getElementById('maxCredits').value = settings.maxCredits;
    document.getElementById('attendanceThreshold').value = settings.attendanceThreshold;
    document.getElementById('dateFormat').value = settings.dateFormat;
    document.getElementById('timezone').value = settings.timezone;
    document.getElementById('language').value = settings.language;
    
    // Program settings
    document.getElementById('enableBasicTEE').checked = settings.enableBasicTEE;
    document.getElementById('enableHNC').checked = settings.enableHNC;
    document.getElementById('enableAdvancedTEE').checked = settings.enableAdvancedTEE;
    document.getElementById('enableTEENS').checked = settings.enableTEENS;
    
    // Populate grading system
    renderGradingSystem();
}

function saveSettings() {
    const settings = {
        instituteName: document.getElementById('instituteName').value,
        minPassingGrade: document.getElementById('minPassingGrade').value,
        maxCredits: parseInt(document.getElementById('maxCredits').value),
        attendanceThreshold: parseInt(document.getElementById('attendanceThreshold').value),
        dateFormat: document.getElementById('dateFormat').value,
        timezone: document.getElementById('timezone').value,
        language: document.getElementById('language').value,
        enableBasicTEE: document.getElementById('enableBasicTEE').checked,
        enableHNC: document.getElementById('enableHNC').checked,
        enableAdvancedTEE: document.getElementById('enableAdvancedTEE').checked,
        enableTEENS: document.getElementById('enableTEENS').checked
    };
    
    currentState.settings = settings;
    localStorage.setItem('teeportalSettings', JSON.stringify(settings));
    applySettings();
    showToast('Settings saved successfully', 'success');
}

function renderGradingSystem() {
    const container = document.getElementById('gradingRows');
    if (!container) return;
    
    let html = '';
    currentState.gradingSystem.forEach((grade, index) => {
        html += `
            <div class="grading-row">
                <input type="text" value="${grade.grade}" onchange="updateGrade(${index}, 'grade', this.value)">
                <input type="number" value="${grade.min}" onchange="updateGrade(${index}, 'min', this.value)">
                <input type="number" value="${grade.max}" onchange="updateGrade(${index}, 'max', this.value)">
                <input type="number" value="${grade.points}" step="0.1" onchange="updateGrade(${index}, 'points', this.value)">
                <input type="text" value="${grade.description}" onchange="updateGrade(${index}, 'description', this.value)">
                <button class="btn-action btn-delete" onclick="removeGrade(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateGrade(index, field, value) {
    currentState.gradingSystem[index][field] = field === 'points' ? parseFloat(value) : 
                                               (field === 'min' || field === 'max') ? parseInt(value) : value;
    localStorage.setItem('gradingSystem', JSON.stringify(currentState.gradingSystem));
}

function addGradeRow() {
    currentState.gradingSystem.push({
        grade: 'New',
        min: 0,
        max: 100,
        points: 0.0,
        description: 'New Grade'
    });
    renderGradingSystem();
}

function removeGrade(index) {
    if (currentState.gradingSystem.length > 1) {
        currentState.gradingSystem.splice(index, 1);
        renderGradingSystem();
    } else {
        showToast('Cannot remove the last grade', 'warning');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
    
    return Math.floor(seconds) + ' second' + (seconds === 1 ? '' : 's') + ' ago';
}

// ============================================
// MODAL & TOAST FUNCTIONS
// ============================================

let confirmCallback = null;

function showConfirmModal(message, callback) {
    elements.confirmMessage.textContent = message;
    elements.confirmModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    confirmCallback = callback;
    
    return new Promise((resolve) => {
        elements.confirmYes.onclick = () => {
            hideConfirmModal();
            if (confirmCallback) confirmCallback();
            resolve(true);
        };
        
        elements.confirmNo.onclick = () => {
            hideConfirmModal();
            resolve(false);
        };
    });
}

function hideConfirmModal() {
    elements.confirmModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    confirmCallback = null;
}

function handleConfirmYes() {
    hideConfirmModal();
    if (confirmCallback) {
        confirmCallback();
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ============================================
// ADDITIONAL FUNCTIONS
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
    const marks = currentState.marks.find(m => m.id === marksId);
    if (marks) {
        // Populate marks form
        document.getElementById('marksId').value = marks.id;
        document.getElementById('marksStudent').value = marks.student_id;
        document.getElementById('marksCourse').value = marks.course_id;
        document.getElementById('marksAssessment').value = marks.assessment_type;
        document.getElementById('marksDate').value = marks.assessment_date;
        document.getElementById('marksObtained').value = marks.marks_obtained;
        document.getElementById('marksTotal').value = marks.total_marks;
        document.getElementById('marksRemarks').value = marks.remarks;
        
        // Calculate and display
        calculateMarks();
        
        // Scroll to form
        showMarksForm();
    }
}

async function deleteMarks(marksId) {
    const confirmed = await showConfirmModal('Are you sure you want to delete this marks record?');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase
            .from('marks')
            .delete()
            .eq('id', marksId);
        
        if (error) throw error;
        
        showToast('Marks record deleted successfully', 'success');
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

function viewIntakeYear(year) {
    // Filter students by intake year
    const filteredStudents = currentState.students.filter(s => s.intake_year == year);
    showSection('students');
    
    // Set filter and render
    document.getElementById('filterIntakeYear').value = year;
    renderStudentsTable(filteredStudents);
}

function viewIntakeDetails(intakeId) {
    const intake = currentState.intakes.find(i => i.id === intakeId);
    if (intake) {
        alert(`Intake Details:\n\nName: ${intake.name}\nYear: ${intake.year}\nSemester: ${intake.semester}\nStatus: ${intake.status}\nStart: ${intake.start_date}\nEnd: ${intake.end_date}\nPrograms: ${JSON.parse(intake.programs || '[]').join(', ')}`);
    }
}

function viewStudent(studentId) {
    const student = currentState.students.find(s => s.id === studentId);
    if (student) {
        // Create student details modal
        const details = `
            <div class="student-details">
                <h3>${student.first_name} ${student.last_name}</h3>
                <p><strong>Registration No:</strong> ${student.registration_number}</p>
                <p><strong>Program:</strong> ${student.program}</p>
                <p><strong>Intake Year:</strong> ${student.intake_year}</p>
                <p><strong>Email:</strong> ${student.email}</p>
                <p><strong>Phone:</strong> ${student.phone}</p>
                <p><strong>Status:</strong> ${student.status}</p>
                <p><strong>Enrollment Date:</strong> ${student.enrollment_date}</p>
            </div>
        `;
        
        showConfirmModal(details, null);
        document.getElementById('confirmYes').style.display = 'none';
        document.getElementById('confirmNo').textContent = 'Close';
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportData() {
    try {
        const data = {
            students: currentState.students,
            courses: currentState.courses,
            marks: currentState.marks,
            intakes: currentState.intakes,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teeportal-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error exporting data: ' + error.message, 'error');
    }
}

// ============================================
// SYSTEM FUNCTIONS
// ============================================

function logout() {
    showConfirmModal('Are you sure you want to logout?', () => {
        // Clear any stored data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login or reload
        window.location.reload();
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    showToast(`Dark mode ${isDark ? 'enabled' : 'disabled'}`, 'info');
}

function refreshAll() {
    showToast('Refreshing data...', 'info');
    loadInitialData().then(() => {
        showToast('Data refreshed successfully', 'success');
    }).catch(error => {
        showToast('Error refreshing data: ' + error.message, 'error');
    });
}

// ============================================
// REPORT FUNCTIONS
// ============================================

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const program = document.getElementById('reportProgram').value;
    const intakeYear = document.getElementById('reportIntake').value;
    const format = document.getElementById('reportFormat').value;
    
    if (!reportType) {
        showToast('Please select a report type', 'warning');
        return;
    }
    
    showToast('Generating report...', 'info');
    
    // Filter data based on selections
    let filteredStudents = [...currentState.students];
    let filteredMarks = [...currentState.marks];
    
    if (program) {
        filteredStudents = filteredStudents.filter(s => s.program === program);
        filteredMarks = filteredMarks.filter(m => 
            filteredStudents.some(s => s.id === m.student_id)
        );
    }
    
    if (intakeYear) {
        filteredStudents = filteredStudents.filter(s => s.intake_year == intakeYear);
        filteredMarks = filteredMarks.filter(m => 
            filteredStudents.some(s => s.id === m.student_id)
        );
    }
    
    // Generate report based on type
    let reportData;
    switch(reportType) {
        case 'studentList':
            reportData = generateStudentListReport(filteredStudents);
            break;
        case 'academicPerformance':
            reportData = generateAcademicReport(filteredStudents, filteredMarks);
            break;
        case 'enrollmentReport':
            reportData = generateEnrollmentReport(filteredStudents);
            break;
        default:
            reportData = { error: 'Report type not implemented' };
    }
    
    // Display preview
    displayReportPreview(reportData, format);
}

function generateStudentListReport(students) {
    return {
        title: 'Student List Report',
        headers: ['Reg No', 'Name', 'Program', 'Intake', 'Email', 'Phone', 'Status'],
        data: students.map(s => [
            s.registration_number,
            `${s.first_name} ${s.last_name}`,
            s.program,
            s.intake_year,
            s.email,
            s.phone,
            s.status
        ]),
        summary: {
            total: students.length,
            byProgram: students.reduce((acc, s) => {
                acc[s.program] = (acc[s.program] || 0) + 1;
                return acc;
            }, {}),
            byStatus: students.reduce((acc, s) => {
                acc[s.status] = (acc[s.status] || 0) + 1;
                return acc;
            }, {})
        }
    };
}

function generateAcademicReport(students, marks) {
    const studentPerformance = students.map(student => {
        const studentMarks = marks.filter(m => m.student_id === student.id);
        const average = studentMarks.length > 0 ? 
            studentMarks.reduce((sum, m) => sum + m.percentage, 0) / studentMarks.length : 0;
        
        return {
            student: student,
            totalCourses: studentMarks.length,
            averageScore: average,
            highestGrade: studentMarks.length > 0 ? 
                studentMarks.reduce((max, m) => m.percentage > max.percentage ? m : max, studentMarks[0]) : null
        };
    });
    
    return {
        title: 'Academic Performance Report',
        headers: ['Reg No', 'Name', 'Program', 'Courses Taken', 'Average %', 'Highest Grade'],
        data: studentPerformance.map(sp => [
            sp.student.registration_number,
            `${sp.student.first_name} ${sp.student.last_name}`,
            sp.student.program,
            sp.totalCourses,
            sp.averageScore.toFixed(2) + '%',
            sp.highestGrade ? sp.highestGrade.grade + ' (' + sp.highestGrade.percentage.toFixed(2) + '%)' : 'N/A'
        ]),
        summary: {
            totalStudents: students.length,
            averageOverall: studentPerformance.reduce((sum, sp) => sum + sp.averageScore, 0) / studentPerformance.length,
            topPerformer: studentPerformance.reduce((top, sp) => 
                sp.averageScore > top.averageScore ? sp : top, studentPerformance[0])
        }
    };
}

function generateEnrollmentReport(students) {
    const byProgram = students.reduce((acc, s) => {
        acc[s.program] = (acc[s.program] || 0) + 1;
        return acc;
    }, {});
    
    const byIntake = students.reduce((acc, s) => {
        acc[s.intake_year] = (acc[s.intake_year] || 0) + 1;
        return acc;
    }, {});
    
    return {
        title: 'Enrollment Report',
        headers: ['Program', 'Number of Students', 'Percentage'],
        data: Object.entries(byProgram).map(([program, count]) => [
            program,
            count,
            ((count / students.length) * 100).toFixed(2) + '%'
        ]),
        summary: {
            totalStudents: students.length,
            byProgram: byProgram,
            byIntake: byIntake,
            averageIntake: Object.values(byIntake).reduce((sum, count) => sum + count, 0) / Object.keys(byIntake).length
        }
    };
}

function displayReportPreview(reportData, format) {
    const preview = document.getElementById('reportPreview');
    
    if (format === 'html') {
        let html = `
            <div class="report-content">
                <h3>${reportData.title}</h3>
                <div class="report-summary">
                    <p>Total Records: ${reportData.summary?.total || 0}</p>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            ${reportData.headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.data.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        preview.innerHTML = html;
    }
    
    showToast('Report generated successfully', 'success');
}

function exportReport() {
    showToast('Export feature coming soon!', 'info');
}

function previewReport() {
    generateReport();
}

function generateQuickReport(type) {
    // Set report type and generate
    document.getElementById('reportType').value = type;
    generateReport();
}

function printReport() {
    window.print();
}

function bulkUploadMarks() {
    showToast('Bulk upload feature coming soon!', 'info');
}

// ============================================
// CREATE DATABASE TABLES
// ============================================

async function createDatabaseTables() {
    try {
        // Check if tables exist by trying to query them
        const { error: studentsError } = await supabase
            .from('students')
            .select('count', { count: 'exact', head: true });
        
        if (studentsError && studentsError.code === '42P01') {
            // Table doesn't exist, show SQL to create it
            const sql = `
                -- Students table
                CREATE TABLE IF NOT EXISTS students (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    registration_number VARCHAR(50) UNIQUE NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    other_names VARCHAR(200),
                    gender VARCHAR(10),
                    date_of_birth DATE,
                    marital_status VARCHAR(20),
                    home_church TEXT,
                    program VARCHAR(50),
                    intake_year INTEGER,
                    study_mode VARCHAR(50),
                    enrollment_date DATE DEFAULT CURRENT_DATE,
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    alternative_phone VARCHAR(20),
                    address TEXT,
                    kin_name VARCHAR(100),
                    kin_relationship VARCHAR(50),
                    kin_phone VARCHAR(20),
                    status VARCHAR(20) DEFAULT 'Active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Courses table
                CREATE TABLE IF NOT EXISTS courses (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    course_code VARCHAR(20) UNIQUE NOT NULL,
                    course_name VARCHAR(200) NOT NULL,
                    program VARCHAR(50),
                    level INTEGER,
                    credits INTEGER,
                    semester VARCHAR(50),
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'Active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Marks table
                CREATE TABLE IF NOT EXISTS marks (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
                    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                    assessment_type VARCHAR(50),
                    assessment_date DATE DEFAULT CURRENT_DATE,
                    marks_obtained DECIMAL(5,2),
                    total_marks DECIMAL(5,2) DEFAULT 100,
                    percentage DECIMAL(5,2),
                    grade VARCHAR(10),
                    grade_points DECIMAL(3,2),
                    remarks TEXT,
                    recorded_by VARCHAR(100),
                    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Intakes table
                CREATE TABLE IF NOT EXISTS intakes (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    year INTEGER,
                    semester VARCHAR(50),
                    name VARCHAR(100),
                    start_date DATE,
                    end_date DATE,
                    status VARCHAR(20),
                    description TEXT,
                    programs JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;
            
            console.log('Copy this SQL to Supabase SQL Editor to create tables:');
            console.log(sql);
            showToast('Tables need to be created in Supabase. Check console for SQL.', 'warning');
        } else {
            showToast('Database tables already exist', 'success');
        }
        
    } catch (error) {
        console.error('Error checking database:', error);
        showToast('Error checking database: ' + error.message, 'error');
    }
}

// ============================================
// WINDOW EXPORTS
// ============================================

// Export functions to global scope
window.showSection = showSection;
window.showStudentForm = showStudentForm;
window.hideStudentForm = hideStudentForm;
window.saveStudent = saveStudent;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.searchStudents = searchStudents;
window.filterStudents = filterStudents;

window.showCourseForm = showCourseForm;
window.hideCourseForm = hideCourseForm;
window.saveCourse = saveCourse;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.searchCourses = searchCourses;
window.filterCourses = filterCourses;

window.showMarksForm = showMarksForm;
window.saveMarks = saveMarks;
window.calculateMarks = calculateMarks;
window.resetMarksForm = resetMarksForm;
window.editMarks = editMarks;
window.deleteMarks = deleteMarks;

window.showIntakeForm = showIntakeForm;
window.hideIntakeForm = hideIntakeForm;
window.saveIntake = saveIntake;
window.editIntake = editIntake;
window.viewIntakeYear = viewIntakeYear;
window.viewIntakeDetails = viewIntakeDetails;

window.switchTab = switchTab;
window.nextTab = nextTab;
window.previousTab = previousTab;

window.showSettingsTab = showSettingsTab;
window.saveSettings = saveSettings;
window.addGradeRow = addGradeRow;
window.removeGrade = removeGrade;
window.updateGrade = updateGrade;

window.showConfirmModal = showConfirmModal;
window.hideConfirmModal = hideConfirmModal;
window.showToast = showToast;

window.logout = logout;
window.toggleDarkMode = toggleDarkMode;
window.refreshAll = refreshAll;
window.refreshDashboard = updateDashboard;
window.exportData = exportData;

window.loadProgramCourses = loadProgramCourses;
window.viewStudent = viewStudent;

window.generateReport = generateReport;
window.previewReport = previewReport;
window.exportReport = exportReport;
window.generateQuickReport = generateQuickReport;
window.printReport = printReport;
window.bulkUploadMarks = bulkUploadMarks;

window.createDatabaseTables = createDatabaseTables;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
