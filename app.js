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
        // Initialize all modules
        this.students = new StudentManager(this.db, this);
        this.courses = new CourseManager(this.db, this);
        this.marks = new MarksManager(this.db, this);
        this.settings = new SettingsManager(this.db, this);
        this.dashboard = new DashboardManager(this.db, this);
        this.reports = new ReportsManager(this.db, this);
        this.transcripts = new TranscriptManager(this.db, this);
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
    
    setupEventListeners() {
        // Setup form submissions
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.students.saveStudent(e));
        }
        
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            marksForm.addEventListener('submit', (e) => this.marks.saveMarks(e));
        }
        
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => this.courses.saveCourse(e));
        }
        
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.settings.saveSettings(e));
        }
        
        const editMarksForm = document.getElementById('editMarksForm');
        if (editMarksForm) {
            editMarksForm.addEventListener('submit', (e) => this.marks.updateMark(e));
        }
        
        // Setup real-time grade calculation
        const marksScoreInput = document.getElementById('marksScore');
        if (marksScoreInput) {
            marksScoreInput.addEventListener('input', () => updateGradeDisplay());
        }
        
        const maxScoreInput = document.getElementById('maxScore');
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => updateGradeDisplay());
        }
        
        // Setup edit marks form grade calculation
        const editScoreInput = document.getElementById('editScore');
        if (editScoreInput) {
            editScoreInput.addEventListener('input', () => this.updateEditGradeDisplay());
        }
        
        const editMaxScoreInput = document.getElementById('editMaxScore');
        if (editMaxScoreInput) {
            editMaxScoreInput.addEventListener('input', () => this.updateEditGradeDisplay());
        }
        
        // Settings page buttons
        const addGradeRowBtn = document.getElementById('addGradeRowBtn');
        if (addGradeRowBtn) {
            addGradeRowBtn.addEventListener('click', () => this.settings.addGradingScaleRow());
        }
        
        const addProgramBtn = document.getElementById('addProgramBtn');
        if (addProgramBtn) {
            addProgramBtn.addEventListener('click', () => this.settings.addProgramSetting());
        }
        
        // Settings tab navigation
        const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
        settingsTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                if (tabName) {
                    this.settings.openSettingsTab(tabName);
                }
            });
        });
        
        // Report generation
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.reports.generateReport());
        }
        
        const previewReportBtn = document.getElementById('previewReportBtn');
        if (previewReportBtn) {
            previewReportBtn.addEventListener('click', () => this.reports.previewReport());
        }
        
        // Transcript generation
        const generateTranscriptBtn = document.getElementById('generateTranscriptBtn');
        if (generateTranscriptBtn) {
            generateTranscriptBtn.addEventListener('click', () => this.transcripts.generateStudentTranscriptPrompt());
        }
        
        // Search functionality
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', () => this.students.searchStudents());
        }
        
        // Filter functionality
        const filterProgram = document.getElementById('filterProgram');
        const filterIntake = document.getElementById('filterIntake');
        const filterStatus = document.getElementById('filterStatus');
        
        if (filterProgram) {
            filterProgram.addEventListener('change', () => this.students.filterStudents());
        }
        if (filterIntake) {
            filterIntake.addEventListener('change', () => this.students.filterStudents());
        }
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.students.filterStudents());
        }
        
        // Export functionality
        const exportStudentsBtn = document.getElementById('exportStudentsBtn');
        if (exportStudentsBtn) {
            exportStudentsBtn.addEventListener('click', () => this.students.exportStudents());
        }
        
        const exportMarksBtn = document.getElementById('exportMarksBtn');
        if (exportMarksBtn) {
            exportMarksBtn.addEventListener('click', () => this.marks.exportMarks());
        }
        
        // Import functionality
        const importStudentsBtn = document.getElementById('importStudentsBtn');
        if (importStudentsBtn) {
            importStudentsBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('importFile');
                if (fileInput) {
                    fileInput.click();
                    fileInput.onchange = (e) => {
                        if (e.target.files[0]) {
                            this.students.importStudents(e.target.files[0]);
                        }
                    };
                }
            });
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
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            await this.students.loadStudentsTable();
            await this.courses.loadCourses();
            await this.marks.loadMarksTable();
            await this.dashboard.updateDashboard();
            await this.dashboard.loadRecentActivities();
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
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
            this.settings.initializeSettingsTabs();
        }
    }
    
    async populateDropdowns() {
        await this.marks.populateStudentDropdown();
        await this.marks.populateCourseDropdown();
    }
    
    openMarksModal() {
        this.marks.openMarksModal();
    }
    
    enterMarksForStudent(studentId) {
        this.marks.enterMarksForStudent(studentId);
    }
    
    viewStudent(studentId) {
        this.students.viewStudent(studentId);
    }
    
    editMark(markId) {
        this.marks.editMark(markId);
    }
    
    deleteMark(markId) {
        this.marks.deleteMark(markId);
    }
    
    editCourse(courseId) {
        this.courses.editCourse(courseId);
    }
    
    deleteCoursePrompt(courseId, courseCode) {
        this.courses.deleteCoursePrompt(courseId, courseCode);
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
            await this.dashboard.updateDashboard();
            this.showToast('Dashboard refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showToast('Refresh failed', 'error');
        }
    }
    
    // ==============================
    // GLOBAL METHODS
    // ==============================
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        } else {
            console.warn(`Modal #${modalId} not found`);
        }
    }
}

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
            if (typeof showSection === 'function') {
                showSection('dashboard');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize: ' + error.message);
    }
});

// Global helper functions
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        const titleMap = {
            'dashboard': 'Dashboard Overview',
            'students': 'Student Management',
            'courses': 'Course Management',
            'marks': 'Academic Records',
            'intake': 'Intake Management',
            'reports': 'Reports & Analytics',
            'settings': 'System Settings'
        };
        
        const sectionTitle = document.getElementById('section-title');
        if (sectionTitle) {
            sectionTitle.textContent = titleMap[sectionId] || 'TeePortal';
        }
    }
}

// GLOBAL MODAL FUNCTIONS
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const focusable = modal.querySelector('input, select, button, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }, 100);
    }
}

function closeModal(modalId) {
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
}

function openStudentModal() {
    openModal('studentModal');
}

function openCourseModal() {
    openModal('courseModal');
}

function openMarksModal() {
    if (window.app && window.app.openMarksModal) {
        window.app.openMarksModal();
    } else {
        openModal('marksModal');
    }
}

function updateGradeDisplay() {
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
}

// Make functions globally available
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.openStudentModal = openStudentModal;
window.openCourseModal = openCourseModal;
window.openMarksModal = openMarksModal;
window.updateGradeDisplay = updateGradeDisplay;

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
    }
    
    .btn-action {
        background: none;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        color: #555;
        transition: all 0.2s;
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
`;
document.head.appendChild(style);

console.log('✅ TEEPortal app.js loaded');
