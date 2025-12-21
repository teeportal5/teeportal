// ============================================
// TEEPORTAL - Complete JavaScript
// ============================================

// Prevent duplicate loading
if (window.__teePortalLoaded) {
    console.warn('TeePortal already loaded');
} else {
    window.__teePortalLoaded = true;

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
        subscriptions: {}
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
            // 1. Cache DOM elements
            cacheElements();
            
            // 2. Initialize navigation
            initializeNavigation();
            
            // 3. Load initial data
            await loadInitialData();
            
            // 4. Setup event listeners
            setupEventListeners();
            
            // 5. Initialize UI components
            initializeUI();
            
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
        elements.studentForm = document.getElementById('studentForm');
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
            // Load from localStorage or use demo data
            await loadStudents();
            await loadCourses();
            await loadMarks();
            await loadIntakes();
            
            updateDashboard();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            throw error;
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
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', searchStudents);
        }
        
        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal.id);
            });
        });
        
        // Confirm modal
        document.getElementById('confirmYes')?.addEventListener('click', confirmAction);
        document.getElementById('confirmNo')?.addEventListener('click', () => closeModal('confirmModal'));
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
        }
    }

    // ============================================
    // STUDENT MANAGEMENT
    // ============================================
    async function loadStudents() {
        try {
            // Load from localStorage or use demo data
            const saved = localStorage.getItem('teeportal_students');
            if (saved) {
                state.students = JSON.parse(saved);
            } else {
                // Demo data
                state.students = [
                    {
                        id: '1',
                        name: 'John Doe',
                        email: 'john@example.com',
                        program: 'Basic TEE',
                        status: 'Active',
                        enrollmentDate: '2024-01-15'
                    },
                    {
                        id: '2',
                        name: 'Jane Smith',
                        email: 'jane@example.com',
                        program: 'HNC',
                        status: 'Active',
                        enrollmentDate: '2024-01-20'
                    }
                ];
                localStorage.setItem('teeportal_students', JSON.stringify(state.students));
            }
            
            renderStudentsTable();
            updateStudentCounts();
            
            return state.students;
        } catch (error) {
            console.error('Error loading students:', error);
            showToast('Error loading students', 'error');
            return [];
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
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.program}</td>
                    <td>
                        <span class="status-badge status-${student.status.toLowerCase()}">
                            ${student.status}
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

    function updateStudentCounts() {
        if (elements.totalStudents) {
            elements.totalStudents.textContent = state.students.length;
        }
        if (elements.headerStudentCount) {
            elements.headerStudentCount.textContent = `${state.students.length} Students Registered`;
        }
    }

    function searchStudents() {
        const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
        const filtered = state.students.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.program.toLowerCase().includes(searchTerm)
        );
        
        // Update table with filtered results
        const tbody = elements.studentsTableBody;
        if (!tbody) return;
        
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
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.program}</td>
                    <td>${student.status}</td>
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

    function saveStudent(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const studentData = {
            id: Date.now().toString(),
            name: formData.get('name') || document.getElementById('studentName')?.value,
            email: formData.get('email') || document.getElementById('studentEmail')?.value,
            program: formData.get('program') || document.getElementById('studentProgram')?.value,
            status: 'Active',
            enrollmentDate: new Date().toISOString().split('T')[0]
        };
        
        state.students.push(studentData);
        localStorage.setItem('teeportal_students', JSON.stringify(state.students));
        
        showToast('Student saved successfully', 'success');
        renderStudentsTable();
        updateStudentCounts();
        closeModal('studentModal');
        form.reset();
    }

    function editStudent(studentId) {
        const student = state.students.find(s => s.id === studentId);
        if (!student) return;
        
        // Fill form with student data
        document.getElementById('studentName')?.value = student.name || '';
        document.getElementById('studentEmail')?.value = student.email || '';
        document.getElementById('studentProgram')?.value = student.program || '';
        
        // Show modal
        openModal('studentModal');
        
        // Update form to edit mode
        const modalTitle = elements.studentModal?.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Edit Student';
        
        // Store student ID for update
        const form = elements.studentForm;
        if (form) {
            form.dataset.editId = studentId;
        }
    }

    async function deleteStudent(studentId) {
        const confirmed = await showConfirmModal('Are you sure you want to delete this student?');
        if (!confirmed) return;
        
        state.students = state.students.filter(s => s.id !== studentId);
        localStorage.setItem('teeportal_students', JSON.stringify(state.students));
        
        showToast('Student deleted successfully', 'success');
        renderStudentsTable();
        updateStudentCounts();
    }

    // ============================================
    // COURSE MANAGEMENT
    // ============================================
    async function loadCourses() {
        try {
            const saved = localStorage.getItem('teeportal_courses');
            if (saved) {
                state.courses = JSON.parse(saved);
            } else {
                state.courses = [
                    {
                        id: '1',
                        code: 'TEE101',
                        name: 'Introduction to Theology',
                        program: 'Basic TEE',
                        credits: 3,
                        students: 45,
                        status: 'Active'
                    },
                    {
                        id: '2',
                        code: 'TEE102',
                        name: 'Biblical Studies',
                        program: 'Basic TEE',
                        credits: 4,
                        students: 38,
                        status: 'Active'
                    }
                ];
                localStorage.setItem('teeportal_courses', JSON.stringify(state.courses));
            }
            
            renderCoursesGrid();
            updateCourseCounts();
            
            return state.courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            showToast('Error loading courses', 'error');
            return [];
        }
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
                        <span class="course-status ${course.status.toLowerCase()}">${course.status}</span>
                    </div>
                    <div class="course-body">
                        <h4>${course.name}</h4>
                        <p class="course-description">Sample course description</p>
                        <div class="course-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${course.program}</span>
                            <span><i class="fas fa-star"></i> ${course.credits} Credits</span>
                            <span><i class="fas fa-users"></i> ${course.students} Students</span>
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

    function updateCourseCounts() {
        if (elements.totalCourses) {
            elements.totalCourses.textContent = state.courses.length;
        }
    }

    function saveCourse(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const courseData = {
            id: Date.now().toString(),
            code: formData.get('code') || document.getElementById('courseCode')?.value,
            name: formData.get('name') || document.getElementById('courseName')?.value,
            program: formData.get('program') || document.getElementById('courseProgram')?.value,
            credits: parseInt(formData.get('credits') || 3),
            students: 0,
            status: 'Active'
        };
        
        state.courses.push(courseData);
        localStorage.setItem('teeportal_courses', JSON.stringify(state.courses));
        
        showToast('Course saved successfully', 'success');
        renderCoursesGrid();
        updateCourseCounts();
        closeModal('courseModal');
        form.reset();
    }

    function editCourse(courseId) {
        const course = state.courses.find(c => c.id === courseId);
        if (!course) return;
        
        // Fill form with course data
        document.getElementById('courseCode')?.value = course.code || '';
        document.getElementById('courseName')?.value = course.name || '';
        document.getElementById('courseProgram')?.value = course.program || '';
        document.getElementById('courseCredits')?.value = course.credits || 3;
        
        // Show modal
        openModal('courseModal');
        
        // Update form to edit mode
        const modalTitle = elements.courseModal?.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Edit Course';
        
        // Store course ID for update
        const form = elements.courseForm;
        if (form) {
            form.dataset.editId = courseId;
        }
    }

    async function deleteCourse(courseId) {
        const confirmed = await showConfirmModal('Are you sure you want to delete this course?');
        if (!confirmed) return;
        
        state.courses = state.courses.filter(c => c.id !== courseId);
        localStorage.setItem('teeportal_courses', JSON.stringify(state.courses));
        
        showToast('Course deleted successfully', 'success');
        renderCoursesGrid();
        updateCourseCounts();
    }

    function searchCourses() {
        const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
        const filtered = state.courses.filter(course => 
            course.name.toLowerCase().includes(searchTerm) ||
            course.code.toLowerCase().includes(searchTerm)
        );
        
        renderCoursesGrid(filtered);
    }

    // ============================================
    // ACADEMIC RECORDS (MARKS)
    // ============================================
    async function loadMarks() {
        try {
            const saved = localStorage.getItem('teeportal_marks');
            if (saved) {
                state.marks = JSON.parse(saved);
            } else {
                state.marks = [
                    {
                        id: '1',
                        student: 'John Doe',
                        course: 'Introduction to Theology',
                        assignment1: 85,
                        midterm: 78,
                        finalExam: 92,
                        total: 85,
                        grade: 'A'
                    }
                ];
                localStorage.setItem('teeportal_marks', JSON.stringify(state.marks));
            }
            
            renderMarksTable();
            
            return state.marks;
        } catch (error) {
            console.error('Error loading marks:', error);
            showToast('Error loading academic records', 'error');
            return [];
        }
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
            html += `
                <tr>
                    <td>${record.student}</td>
                    <td>${record.assignment1}</td>
                    <td>${record.midterm}</td>
                    <td>${record.finalExam}</td>
                    <td>${record.total}</td>
                    <td><strong class="grade-${record.grade}">${record.grade}</strong></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    function saveMarks(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Calculate total and grade
        const assignment1 = parseFloat(formData.get('assignment1') || 0);
        const midterm = parseFloat(formData.get('midterm') || 0);
        const finalExam = parseFloat(formData.get('finalExam') || 0);
        const total = Math.round((assignment1 + midterm + finalExam) / 3);
        const grade = calculateGrade(total);
        
        const marksData = {
            id: Date.now().toString(),
            student: formData.get('student') || 'Unknown Student',
            course: formData.get('course') || 'Unknown Course',
            assignment1,
            midterm,
            finalExam,
            total,
            grade,
            date: new Date().toISOString().split('T')[0]
        };
        
        state.marks.push(marksData);
        localStorage.setItem('teeportal_marks', JSON.stringify(state.marks));
        
        showToast('Marks saved successfully', 'success');
        renderMarksTable();
        closeModal('marksModal');
        form.reset();
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

    function exportMarks() {
        // Create CSV content
        let csv = 'Student,Course,Assignment 1,Midterm,Final Exam,Total,Grade\n';
        state.marks.forEach(record => {
            csv += `${record.student},${record.course},${record.assignment1},${record.midterm},${record.finalExam},${record.total},${record.grade}\n`;
        });
        
        // Create download link
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
    }

    // ============================================
    // INTAKE MANAGEMENT
    // ============================================
    async function loadIntakes() {
        try {
            const saved = localStorage.getItem('teeportal_intakes');
            if (saved) {
                state.intakes = JSON.parse(saved);
            } else {
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
                localStorage.setItem('teeportal_intakes', JSON.stringify(state.intakes));
            }
            
            return state.intakes;
        } catch (error) {
            console.error('Error loading intakes:', error);
            showToast('Error loading intakes', 'error');
            return [];
        }
    }

    function saveIntake(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const intakeData = {
            id: Date.now().toString(),
            name: formData.get('name') || 'New Intake',
            deadline: formData.get('deadline') || new Date().toISOString().split('T')[0],
            students: 0,
            status: 'Upcoming',
            created: new Date().toISOString()
        };
        
        state.intakes.unshift(intakeData);
        localStorage.setItem('teeportal_intakes', JSON.stringify(state.intakes));
        
        showToast('Intake created successfully', 'success');
        closeModal('intakeModal');
        form.reset();
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

    function updateAverageGrade() {
        if (state.marks.length === 0) {
            if (elements.avgGrade) {
                elements.avgGrade.textContent = 'N/A';
            }
            return;
        }
        
        const total = state.marks.reduce((sum, mark) => sum + mark.total, 0);
        const average = Math.round(total / state.marks.length);
        
        if (elements.avgGrade) {
            elements.avgGrade.textContent = `${average}%`;
        }
        
        // Update grade distribution
        updateGradeDistributionChart();
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
        
        // Update chart data based on current students
        const monthlyData = [0, 0, 0, 0, 0, 0]; // Jan-Jun
        state.students.forEach(student => {
            const month = new Date(student.enrollmentDate).getMonth();
            if (month >= 0 && month <= 5) {
                monthlyData[month]++;
            }
        });
        
        state.enrollmentChart.data.datasets[0].data = monthlyData;
        state.enrollmentChart.update();
    }

    function updateGradeDistributionChart() {
        if (!state.gradeChart || state.marks.length === 0) return;
        
        // Count grades
        const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        state.marks.forEach(mark => {
            const grade = mark.grade[0]; // Get first character (A, B, C, etc.)
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
    // MODAL FUNCTIONS
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
            
            // Reset forms
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                delete form.dataset.editId;
                
                // Reset modal title if it was in edit mode
                const title = modal.querySelector('h3');
                if (title && modalId === 'studentModal') {
                    title.textContent = 'Register New Student';
                } else if (title && modalId === 'courseModal') {
                    title.textContent = 'Add New Course';
                }
            }
        }
    }

    async function showConfirmModal(message) {
        return new Promise((resolve) => {
            const modal = elements.confirmModal;
            const messageEl = document.getElementById('confirmMessage');
            
            if (messageEl) {
                messageEl.textContent = message;
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Store resolve function
            state.pendingConfirm = resolve;
        });
    }

    function confirmAction() {
        const modal = elements.confirmModal;
        if (state.pendingConfirm) {
            state.pendingConfirm(true);
            state.pendingConfirm = null;
        }
        closeModal('confirmModal');
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
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
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = new Date().toISOString().split('T')[0];
            }
        });
    }

    function initializeSelects() {
        // Populate program selects
        const programSelects = document.querySelectorAll('select[id*="Program"], select[id*="program"]');
        programSelects.forEach(select => {
            state.programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program;
                option.textContent = program;
                select.appendChild(option);
            });
        });
        
        // Populate intake year selects
        const yearSelects = document.querySelectorAll('select[id*="Year"], select[id*="year"]');
        yearSelects.forEach(select => {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= 2010; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                select.appendChild(option);
            }
        });
    }

    function loadSettings() {
        const saved = localStorage.getItem('teeportal_settings');
        if (saved) {
            state.settings = JSON.parse(saved);
            applySettings();
        }
    }

    function applySettings() {
        // Apply dark mode if enabled
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        // Apply institute name
        const instituteEls = document.querySelectorAll('.institute-name');
        instituteEls.forEach(el => {
            if (el) el.textContent = state.settings.instituteName;
        });
    }

    function saveSettings() {
        // Get current settings from UI
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
    }

    function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark.toString());
        showToast(`Dark mode ${isDark ? 'enabled' : 'disabled'}`, 'info');
    }

    function refreshAll() {
        loadInitialData();
        showToast('Data refreshed successfully', 'success');
    }

    function handleLogout() {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
            // In a real app, you would clear auth tokens and redirect
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
    window.showStudentForm = () => openModal('studentModal');
    window.showCourseForm = () => openModal('courseModal');
    window.showIntakeForm = () => openModal('intakeModal');
    window.saveStudent = saveStudent;
    window.saveCourse = saveCourse;
    window.saveMarks = saveMarks;
    window.saveIntake = saveIntake;
    window.editStudent = editStudent;
    window.deleteStudent = deleteStudent;
    window.editCourse = editCourse;
    window.deleteCourse = deleteCourse;
    window.searchStudents = searchStudents;
    window.searchCourses = searchCourses;
    window.exportMarks = exportMarks;
    window.toggleDarkMode = toggleDarkMode;
    window.refreshAll = refreshAll;
    window.handleLogout = handleLogout;
    window.saveSettings = saveSettings;
    window.showToast = showToast;
    window.showConfirmModal = showConfirmModal;
    window.generateReport = generateReport;
    window.printReport = printReport;

    // Additional functions
    function generateReport() {
        showToast('Report generation started', 'info');
        // Report generation logic would go here
        setTimeout(() => {
            showToast('Report generated successfully', 'success');
        }, 2000);
    }

    function printReport() {
        window.print();
        showToast('Printing report...', 'info');
    }

    console.log('TEEPortal JavaScript loaded successfully');
}
