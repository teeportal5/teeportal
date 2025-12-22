// app.js - Main application with modular structure
class TEEPortalApp {
    constructor() {
        this.db = new TEEPortalSupabaseDB();
        
        // Initialize modules
        this.students = new StudentsManager(this.db);
        this.courses = new CoursesManager(this.db);
        this.marks = new MarksManager(this.db);
        this.settings = new SettingsManager(this.db);
        this.dashboard = new DashboardManager(this.db);
        this.reports = new ReportsManager(this.db);
        this.transcripts = new TranscriptsManager(this.db);
        
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.initialized = false;
        this.cachedStudents = null;
        
        // Initialize event listeners
        this.setupEventListeners();
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
            editScoreInput.addEventListener('input', () => this.marks.updateEditGradeDisplay());
        }
        
        const editMaxScoreInput = document.getElementById('editMaxScore');
        if (editMaxScoreInput) {
            editMaxScoreInput.addEventListener('input', () => this.marks.updateEditGradeDisplay());
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
    
    showToast(message, type = 'info') {
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
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }
}
