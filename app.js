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
    }
    
    initializeModules() {
        try {
            console.log('🔄 Initializing modules...');
            
            // Initialize each module if the class exists
            if (typeof StudentManager !== 'undefined') {
                this.students = new StudentManager(this.db, this);
            }
            
            if (typeof CourseManager !== 'undefined') {
                this.courses = new CourseManager(this.db, this);
            }
            
            if (typeof MarksManager !== 'undefined') {
                this.marks = new MarksManager(this.db, this);
            }
            
            if (typeof SettingsManager !== 'undefined') {
                this.settings = new SettingsManager(this.db, this);
            }
            
            if (typeof DashboardManager !== 'undefined') {
                this.dashboard = new DashboardManager(this.db, this);
            }
            
            if (typeof ReportsManager !== 'undefined') {
                this.reports = new ReportsManager(this.db, this);
            }
            
            // FIXED: Use TranscriptsManager (with 's') instead of TranscriptManager
            if (typeof TranscriptsManager !== 'undefined') {
                this.transcripts = new TranscriptsManager(this.db);
            }
            
            console.log('✅ Modules initialized');
            
            // Setup event listeners after modules are initialized
            this.setupEventListeners();
            
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
              // Initialize reports UI
        if (this.reports && this.reports.initializeReportsUI) {
            await this.reports.initializeReportsUI();
        }
        
            // Update dashboard
            if (this.dashboard && this.dashboard.updateDashboard) {
                await this.dashboard.updateDashboard();
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
        
        try {
            // Setup form submissions with error handling
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
            
            // Add other form submissions as needed
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
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
        // Show error in UI
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

// Global helper functions
if (typeof showSection === 'undefined') {
    window.showSection = function(sectionId) {
        console.log('Showing section:', sectionId);
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    };
}
// Add to the end of app.js, before the closing </script> tag
const style = document.createElement('style');
style.textContent = `
    /* Section styling */
    .content-section {
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 20px;
        min-height: 500px;
    }
    
    .content-section.active {
        display: block;
        opacity: 1;
    }
    
    /* Navigation styling */
    .nav-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        color: #2c3e50;
        text-decoration: none;
        border-radius: 8px;
        margin: 5px 0;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .nav-link:hover {
        background: #f8f9fa;
        color: #3498db;
        transform: translateX(5px);
    }
    
    .nav-link.active {
        background: #3498db;
        color: white;
        font-weight: 600;
    }
    
    .nav-link i {
        width: 20px;
        text-align: center;
    }
    
    /* Dashboard specific */
    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .stat-card {
        background: white;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-left: 4px solid #3498db;
    }
    
    .stat-card h3 {
        margin: 0 0 10px 0;
        color: #2c3e50;
        font-size: 16px;
    }
    
    .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 5px;
    }
    
    .stat-label {
        color: #7f8c8d;
        font-size: 14px;
    }
`;
document.head.appendChild(style);
