// app.js - Main application file
class TEEPortalApp {
    constructor() {
        this.db = new TEEPortalSupabaseDB();
        this.students = null;
        this.courses = null;
        this.marks = null;
        this.settings = null;
        this.dashboard = null;
        this.reports = null;
        this.transcripts = null;
        
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.initialized = false;
        this.cachedStudents = null;
        
        // Initialize modules
        this.initializeModules();
        this.setupEventListeners();
    }
    
    initializeModules() {
        try {
            console.log('🔄 Initializing modules...');
            
            // Check if modules are loaded
            if (typeof StudentManager === 'undefined') {
                console.error('❌ StudentManager not loaded');
                // Create a minimal version if module not loaded
                this.students = {
                    loadStudentsTable: async () => {
                        console.warn('StudentManager module not loaded');
                        const tbody = document.getElementById('studentsTableBody');
                        if (tbody) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="8" class="empty-state">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <p>Student module not loaded</p>
                                    </td>
                                </tr>
                            `;
                        }
                    }
                };
            } else {
                this.students = new StudentManager(this.db, this);
            }
            
            if (typeof CourseManager === 'undefined') {
                console.error('❌ CourseManager not loaded');
                this.courses = {
                    loadCourses: async () => {
                        console.warn('CourseManager module not loaded');
                        const grid = document.getElementById('coursesGrid');
                        if (grid) {
                            grid.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <p>Course module not loaded</p>
                                </div>
                            `;
                        }
                    },
                    populateCourseDropdown: async () => {}
                };
            } else {
                this.courses = new CourseManager(this.db, this);
            }
            
            if (typeof MarksManager === 'undefined') {
                console.error('❌ MarksManager not loaded');
                this.marks = {
                    loadMarksTable: async () => {
                        console.warn('MarksManager module not loaded');
                        const tbody = document.querySelector('#marksTableBody');
                        if (tbody) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="11" class="empty-state">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <p>Marks module not loaded</p>
                                    </td>
                                </tr>
                            `;
                        }
                    },
                    populateStudentDropdown: async () => {},
                    populateCourseDropdown: async () => {}
                };
            } else {
                this.marks = new MarksManager(this.db, this);
            }
            
            // Initialize other modules with fallbacks
            this.settings = new (typeof SettingsManager !== 'undefined' ? SettingsManager : function() {
                this.openSettingsTab = () => {};
                this.initializeSettingsTabs = () => {};
            })(this.db, this);
            
            this.dashboard = new (typeof DashboardManager !== 'undefined' ? DashboardManager : function() {
                this.updateDashboard = async () => {};
                this.loadRecentActivities = async () => {};
            })(this.db, this);
            
            console.log('✅ Modules initialized');
        } catch (error) {
            console.error('Error initializing modules:', error);
        }
    }
    
    async initialize() {
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Initialize database first
            await this.db.init();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TEEPortal Ready');
            this.showToast('System initialized successfully', 'success');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showToast('Failed to connect to database', 'error');
        }
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            // Load students table
            if (this.students && this.students.loadStudentsTable) {
                await this.students.loadStudentsTable();
            }
            
            // Load courses
            if (this.courses && this.courses.loadCourses) {
                await this.courses.loadCourses();
            }
            
            // Load marks table
            if (this.marks && this.marks.loadMarksTable) {
                await this.marks.loadMarksTable();
            }
            
            // Update dashboard
            if (this.dashboard && this.dashboard.updateDashboard) {
                await this.dashboard.updateDashboard();
            }
            
            // Load recent activities
            if (this.dashboard && this.dashboard.loadRecentActivities) {
                await this.dashboard.loadRecentActivities();
            }
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading data: ' + error.message, 'error');
        }
    }
    
    initializeUI() {
        // Initialize date pickers
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (input) input.max = today;
        });
        
        this.populateDropdowns();
        
        // Initialize settings tabs
        if (document.querySelector('.settings-tab-btn')) {
            try {
                this.settings.initializeSettingsTabs();
            } catch (error) {
                console.warn('Settings tabs initialization failed:', error);
            }
        }
    }
    
    async populateDropdowns() {
        if (this.marks && this.marks.populateStudentDropdown) {
            await this.marks.populateStudentDropdown();
        }
        if (this.marks && this.marks.populateCourseDropdown) {
            await this.marks.populateCourseDropdown();
        }
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Setup form submissions with error handling
        try {
            const studentForm = document.getElementById('studentForm');
            if (studentForm) {
                studentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.students && this.students.saveStudent) {
                        this.students.saveStudent(e);
                    } else {
                        this.showToast('Student module not available', 'error');
                    }
                });
            }
            
            const marksForm = document.getElementById('marksForm');
            if (marksForm) {
                marksForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.marks && this.marks.saveMarks) {
                        this.marks.saveMarks(e);
                    } else {
                        this.showToast('Marks module not available', 'error');
                    }
                });
            }
            
            const courseForm = document.getElementById('courseForm');
            if (courseForm) {
                courseForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.courses && this.courses.saveCourse) {
                        this.courses.saveCourse(e);
                    } else {
                        this.showToast('Course module not available', 'error');
                    }
                });
            }
            
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.settings && this.settings.saveSettings) {
                        this.settings.saveSettings(e);
                    } else {
                        this.showToast('Settings module not available', 'error');
                    }
                });
            }
            
            const editMarksForm = document.getElementById('editMarksForm');
            if (editMarksForm) {
                editMarksForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.marks && this.marks.updateMark) {
                        this.marks.updateMark(e);
                    } else {
                        this.showToast('Marks module not available', 'error');
                    }
                });
            }
            
            // Setup real-time grade calculation
            const marksScoreInput = document.getElementById('marksScore');
            if (marksScoreInput) {
                marksScoreInput.addEventListener('input', () => {
                    if (typeof updateGradeDisplay === 'function') {
                        updateGradeDisplay();
                    }
                });
            }
            
            const maxScoreInput = document.getElementById('maxScore');
            if (maxScoreInput) {
                maxScoreInput.addEventListener('input', () => {
                    if (typeof updateGradeDisplay === 'function') {
                        updateGradeDisplay();
                    }
                });
            }
            
            // Setup edit marks form grade calculation
            const editScoreInput = document.getElementById('editScore');
            if (editScoreInput) {
                editScoreInput.addEventListener('input', () => {
                    if (typeof updateEditGradeDisplay === 'function') {
                        updateEditGradeDisplay();
                    } else if (this.updateEditGradeDisplay) {
                        this.updateEditGradeDisplay();
                    }
                });
            }
            
            const editMaxScoreInput = document.getElementById('editMaxScore');
            if (editMaxScoreInput) {
                editMaxScoreInput.addEventListener('input', () => {
                    if (typeof updateEditGradeDisplay === 'function') {
                        updateEditGradeDisplay();
                    } else if (this.updateEditGradeDisplay) {
                        this.updateEditGradeDisplay();
                    }
                });
            }
            
            // Navigation event listeners
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const sectionId = e.target.getAttribute('href').replace('#', '');
                    showSection(sectionId);
                });
            });
            
            // Modal open buttons
            const openStudentModalBtn = document.querySelector('[onclick*="openStudentModal"]');
            if (openStudentModalBtn) {
                openStudentModalBtn.onclick = (e) => {
                    e.preventDefault();
                    openStudentModal();
                };
            }
            
            const openCourseModalBtn = document.querySelector('[onclick*="openCourseModal"]');
            if (openCourseModalBtn) {
                openCourseModalBtn.onclick = (e) => {
                    e.preventDefault();
                    openCourseModal();
                };
            }
            
            const openMarksModalBtn = document.querySelector('[onclick*="openMarksModal"]');
            if (openMarksModalBtn) {
                openMarksModalBtn.onclick = (e) => {
                    e.preventDefault();
                    openMarksModal();
                };
            }
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    updateEditGradeDisplay() {
        try {
            const scoreInput = document.getElementById('editScore');
            const maxScoreInput = document.getElementById('editMaxScore');
            const gradeDisplay = document.getElementById('editGradeDisplay');
            const percentageField = document.getElementById('editPercentage');
            
            if (!scoreInput || !gradeDisplay) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput?.value) || 100;
            
            if (isNaN(score)) {
                gradeDisplay.textContent = '--';
                gradeDisplay.className = 'percentage-badge';
                if (percentageField) percentageField.value = '';
                return;
            }
            
            const percentage = (score / maxScore) * 100;
            const grade = this.db.calculateGrade(percentage);
            
            gradeDisplay.textContent = grade.grade;
            gradeDisplay.className = `percentage-badge grade-${grade.grade.charAt(0)}`;
            
            if (percentageField) {
                percentageField.value = `${percentage.toFixed(2)}%`;
            }
            
        } catch (error) {
            console.error('Error updating edit grade display:', error);
        }
    }
    
    openMarksModal() {
        if (this.marks && this.marks.openMarksModal) {
            this.marks.openMarksModal();
        } else {
            openModal('marksModal');
        }
    }
    
    enterMarksForStudent(studentId) {
        if (this.marks && this.marks.enterMarksForStudent) {
            this.marks.enterMarksForStudent(studentId);
        } else {
            openModal('marksModal');
            if (studentId) {
                const marksStudent = document.getElementById('marksStudent');
                if (marksStudent) marksStudent.value = studentId;
            }
        }
    }
    
    viewStudent(studentId) {
        if (this.students && this.students.viewStudent) {
            this.students.viewStudent(studentId);
        } else {
            this.showToast('Student details not available', 'info');
        }
    }
    
    editMark(markId) {
        if (this.marks && this.marks.editMark) {
            this.marks.editMark(markId);
        } else {
            this.showToast('Edit marks not available', 'info');
        }
    }
    
    deleteMark(markId) {
        if (this.marks && this.marks.deleteMark) {
            this.marks.deleteMark(markId);
        } else {
            this.showToast('Delete marks not available', 'info');
        }
    }
    
    editCourse(courseId) {
        if (this.courses && this.courses.editCourse) {
            this.courses.editCourse(courseId);
        } else {
            this.showToast('Edit course not available', 'info');
        }
    }
    
    deleteCoursePrompt(courseId, courseCode) {
        if (this.courses && this.courses.deleteCoursePrompt) {
            this.courses.deleteCoursePrompt(courseId, courseCode);
        } else {
            this.showToast('Delete course not available', 'info');
        }
    }
    
    // ==============================
    // UI HELPER FUNCTIONS
    // ==============================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    async refreshDashboard() {
        try {
            this.showToast('Refreshing dashboard...', 'info');
            if (this.dashboard && this.dashboard.updateDashboard) {
                await this.dashboard.updateDashboard();
            }
            this.showToast('Dashboard refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showToast('Refresh failed', 'error');
        }
    }
}

// ==============================
// GLOBAL FUNCTIONS - MUST BE DEFINED BEFORE DOMContentLoaded
// ==============================

// Global helper function to show sections
window.showSection = function(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Set active nav link
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Update section title
        const titleMap = {
            'dashboard': 'Dashboard Overview',
            'students': 'Student Management',
            'courses': 'Course Management',
            'marks': 'Academic Records',
            'reports': 'Reports & Analytics',
            'settings': 'System Settings'
        };
        
        const sectionTitle = document.getElementById('section-title');
        if (sectionTitle) {
            sectionTitle.textContent = titleMap[sectionId] || 'TeePortal';
        }
        
        // Load data for the section if needed
        if (window.app && window.app.initialized) {
            setTimeout(() => {
                switch(sectionId) {
                    case 'students':
                        if (window.app.students && window.app.students.loadStudentsTable) {
                            window.app.students.loadStudentsTable();
                        }
                        break;
                    case 'courses':
                        if (window.app.courses && window.app.courses.loadCourses) {
                            window.app.courses.loadCourses();
                        }
                        break;
                    case 'marks':
                        if (window.app.marks && window.app.marks.loadMarksTable) {
                            window.app.marks.loadMarksTable();
                        }
                        break;
                    case 'dashboard':
                        if (window.app.dashboard && window.app.dashboard.updateDashboard) {
                            window.app.dashboard.updateDashboard();
                        }
                        break;
                    case 'settings':
                        if (window.app.settings && window.app.settings.loadSettings) {
                            window.app.settings.loadSettings();
                        }
                        break;
                }
            }, 100);
        }
    } else {
        console.error('Section not found:', sectionId);
    }
};

// GLOBAL MODAL FUNCTIONS
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const focusable = modal.querySelector('input, select, button, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }, 100);
    } else {
        console.warn(`Modal #${modalId} not found`);
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                if (modalId === 'courseModal' && form.dataset.editId) {
                    delete form.dataset.editId;
                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Course';
                        submitBtn.classList.remove('btn-update');
                        submitBtn.classList.add('btn-primary');
                    }
                }
            }
        }, 300);
    }
};

window.openStudentModal = function() {
    openModal('studentModal');
};

window.openCourseModal = function() {
    openModal('courseModal');
};

window.openMarksModal = function() {
    if (window.app && window.app.openMarksModal) {
        window.app.openMarksModal();
    } else {
        openModal('marksModal');
    }
};

window.updateGradeDisplay = function() {
    try {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        const gradeDisplay = document.getElementById('gradeDisplay');
        const percentageField = document.getElementById('percentage');
        
        if (!scoreInput || !gradeDisplay) return;
        
        const score = parseFloat(scoreInput.value);
        const maxScore = parseFloat(maxScoreInput?.value) || 100;
        
        if (isNaN(score)) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'percentage-badge';
            if (percentageField) percentageField.value = '';
            return;
        }
        
        const percentage = (score / maxScore) * 100;
        
        // Grading scale
        const gradingScale = {
            'A': { min: 80, max: 100, color: '#27ae60' },
            'B+': { min: 75, max: 79, color: '#2ecc71' },
            'B': { min: 70, max: 74, color: '#2ecc71' },
            'C+': { min: 65, max: 69, color: '#f1c40f' },
            'C': { min: 60, max: 64, color: '#f1c40f' },
            'D+': { min: 55, max: 59, color: '#e67e22' },
            'D': { min: 50, max: 54, color: '#e67e22' },
            'F': { min: 0, max: 49, color: '#e74c3c' }
        };
        
        let grade = '--';
        for (const [gradeName, range] of Object.entries(gradingScale)) {
            if (percentage >= range.min && percentage <= range.max) {
                grade = gradeName;
                gradeDisplay.style.backgroundColor = range.color;
                break;
            }
        }
        
        gradeDisplay.textContent = grade;
        gradeDisplay.className = 'percentage-badge';
        
        if (percentageField) {
            percentageField.value = `${percentage.toFixed(2)}%`;
        }
        
    } catch (error) {
        console.error('Error updating grade display:', error);
    }
};

window.updateEditGradeDisplay = function() {
    if (window.app && window.app.updateEditGradeDisplay) {
        window.app.updateEditGradeDisplay();
    }
};

// ==============================
// GLOBAL INITIALIZATION
// ==============================

let app = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    try {
        // Create app instance
        app = new TEEPortalApp();
        window.app = app;
        
        // Initialize
        await app.initialize();
        
        console.log('🎉 TEEPortal System Ready');
        
        // Show dashboard by default
        setTimeout(() => {
            showSection('dashboard');
        }, 100);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        // Try to show error in UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>System Initialization Failed:</strong> ${error.message}
            <button onclick="location.reload()" style="
                margin-left: 20px;
                background: white;
                color: #e74c3c;
                border: none;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
            ">Retry</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-badge.active {
        background: #d4edda;
        color: #155724;
    }
    
    .status-badge.graduated {
        background: #cce5ff;
        color: #004085;
    }
    
    .status-badge.withdrawn {
        background: #f8d7da;
        color: #721c24;
    }
    
    .grade-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        text-align: center;
        min-width: 30px;
    }
    
    .grade-A { background: #27ae60; }
    .grade-B { background: #2ecc71; }
    .grade-C { background: #f1c40f; }
    .grade-D { background: #e67e22; }
    .grade-F { background: #e74c3c; }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
    }
    
    .error-state {
        text-align: center;
        padding: 40px 20px;
        color: #e74c3c;
    }
    
    .error-state i {
        font-size: 48px;
        margin-bottom: 15px;
        color: #e74c3c;
    }
    
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        min-width: 300px;
        max-width: 400px;
    }
    
    .toast.success {
        border-left: 4px solid #27ae60;
    }
    
    .toast.error {
        border-left: 4px solid #e74c3c;
    }
    
    .toast.info {
        border-left: 4px solid #3498db;
    }
    
    .toast.warning {
        border-left: 4px solid #f39c12;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .percentage-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        min-width: 40px;
        text-align: center;
        background: #3498db;
    }
    
    .percentage-badge.grade-A { background: #27ae60; }
    .percentage-badge.grade-B { background: #2ecc71; }
    .percentage-badge.grade-C { background: #f1c40f; }
    .percentage-badge.grade-D { background: #e67e22; }
    .percentage-badge.grade-F { background: #e74c3c; }
    
    .btn-action {
        background: none;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        color: #555;
        transition: all 0.2s;
        margin: 2px;
    }
    
    .btn-action:hover {
        background: #f8f9fa;
        border-color: #3498db;
        color: #3498db;
    }
    
    .btn-edit {
        background: #f39c12;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .btn-edit:hover {
        background: #e67e22;
    }
    
    .btn-delete {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .btn-delete:hover {
        background: #c0392b;
    }
    
    .btn-primary {
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.3s;
    }
    
    .btn-primary:hover {
        background: #2980b9;
    }
    
    .btn-update {
        background: #27ae60;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    }
    
    .btn-update:hover {
        background: #219653;
    }
    
    /* Modal styles */
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
    }
    
    .modal.active {
        display: flex;
    }
    
    .modal-content {
        background: white;
        border-radius: 10px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow: hidden;
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-body {
        padding: 20px;
        overflow-y: auto;
        max-height: 70vh;
    }
    
    .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    
    .close {
        font-size: 28px;
        font-weight: bold;
        color: #aaa;
        cursor: pointer;
    }
    
    .close:hover {
        color: #333;
    }
    
    /* Section styles */
    .content-section {
        display: none;
        padding: 20px;
    }
    
    .content-section.active {
        display: block;
    }
    
    /* Table styles */
    .table-responsive {
        overflow-x: auto;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    table th, table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    
    table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #2c3e50;
    }
    
    table tr:hover {
        background: #f8f9fa;
    }
    
    /* Navigation styles */
    .nav-link {
        display: block;
        padding: 10px 15px;
        color: #2c3e50;
        text-decoration: none;
        border-radius: 4px;
        margin: 2px 0;
        transition: all 0.3s;
    }
    
    .nav-link:hover {
        background: #f8f9fa;
        color: #3498db;
    }
    
    .nav-link.active {
        background: #3498db;
        color: white;
    }
    
    .nav-link.active:hover {
        background: #2980b9;
    }
`;
document.head.appendChild(style);

console.log('✅ TEEPortal app.js loaded');
