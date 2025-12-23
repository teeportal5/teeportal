// app.js - Main application file (Updated with modal manager and programs support)
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
        this.counties = null;
        this.centres = null;
        this.programs = null;
        
        this.currentStudentId = null;
        this.currentView = 'dashboard';
        this.initialized = false;
        this.cachedStudents = null;
        this._initializing = false;
        
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
            
            if (typeof TranscriptsManager !== 'undefined') {
                this.transcripts = new TranscriptsManager(this.db, this);
            }
            
            // Initialize area managers if they exist
            if (typeof CountyManager !== 'undefined') {
                this.counties = new CountyManager(this.db, this);
            }
            
            if (typeof CentreManager !== 'undefined') {
                this.centres = new CentreManager(this.db, this);
            }
            
            if (typeof ProgramManager !== 'undefined') {
                this.programs = new ProgramManager(this.db, this);
            }
            
            console.log('✅ Modules initialized');
            
        } catch (error) {
            console.error('Error initializing modules:', error);
        }
    }
    
    async initialize() {
        // Prevent multiple initializations
        if (this._initializing) {
            console.warn('App initialization already in progress');
            return;
        }
        
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }
        
        this._initializing = true;
        console.log('🚀 TEEPortal Application Starting...');
        
        try {
            // Initialize database first
            console.log('📦 Initializing database...');
            await this.db.init();
            
            // Initialize modules again with database connection
            this.initializeModules();
            
            // Setup event listeners
            console.log('🔧 Setting up event listeners...');
            this.setupEventListeners();
            
            // Load initial data
            console.log('📊 Loading initial data...');
            await this.loadInitialData();
            
            // Initialize UI
            console.log('🎨 Initializing UI...');
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TEEPortal Ready');
            this.showToast('System initialized successfully', 'success');
            
            // Update global reference
            window.app = this;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            
            // More specific error messages
            let errorMessage = 'Failed to initialize system';
            if (error.message.includes('database') || error.message.includes('connection')) {
                errorMessage = 'Database connection failed. Please check your internet connection.';
            } else if (error.message.includes('auth') || error.message.includes('permission')) {
                errorMessage = 'Authentication failed. Please check your credentials.';
            }
            
            this.showToast(errorMessage, 'error');
            
            // Try to show error in UI
            this.showErrorUI(error);
            
            // Don't set initialized to true on error
            this.initialized = false;
            
        } finally {
            this._initializing = false;
        }
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');
            
            // Load students table
            if (this.students && this.students.loadStudentsTable) {
                await this.students.loadStudentsTable();
            }
            
            // Load programs
            if (this.programs && this.programs.loadProgramsTable) {
                await this.programs.loadProgramsTable();
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
            
            // Load county, centre, and program data
            await this.loadAreaData();
            
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
    
    /**
     * Load area data (counties, centres, programs)
     */
    async loadAreaData() {
        try {
            console.log('🗺️ Loading area data...');
            
            // Load counties for dropdowns
            await this.populateCountyDropdowns();
            
            // Load centres for dropdowns
            await this.populateCentreDropdowns();
            
            // Load programs for dropdowns
            await this.populateProgramDropdowns();
            
            console.log('✅ Area data loaded');
            
        } catch (error) {
            console.warn('⚠️ Could not load area data:', error);
            // This is not critical, so don't show error toast
        }
    }
    
    /**
     * Populate county dropdowns throughout the app
     */
    async populateCountyDropdowns() {
        try {
            const counties = await this.db.getCounties();
            
            // Populate student form county dropdown
            const countySelect = document.getElementById('studentCounty');
            if (countySelect) {
                countySelect.innerHTML = '<option value="">Select County</option>' +
                    counties.map(county => 
                        `<option value="${this.escapeHtml(county.name)}">${this.escapeHtml(county.name)}</option>`
                    ).join('');
            }
            
            // Populate centre form county dropdown
            const centreCountySelect = document.getElementById('centreCounty');
            if (centreCountySelect) {
                centreCountySelect.innerHTML = '<option value="">Select County</option>' +
                    counties.map(county => 
                        `<option value="${this.escapeHtml(county.name)}">${this.escapeHtml(county.name)}</option>`
                    ).join('');
            }
            
            // Populate filter dropdowns
            const filterCountySelect = document.getElementById('filterCounty');
            if (filterCountySelect) {
                filterCountySelect.innerHTML = '<option value="">All Counties</option>' +
                    counties.map(county => 
                        `<option value="${this.escapeHtml(county.name)}">${this.escapeHtml(county.name)}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Error populating county dropdowns:', error);
        }
    }
    
    /**
     * Populate centre dropdowns throughout the app
     */
    async populateCentreDropdowns() {
        try {
            const centres = await this.db.getCentres();
            
            // Populate student form centre dropdown
            const centreSelect = document.getElementById('studentCentre');
            if (centreSelect) {
                centreSelect.innerHTML = '<option value="">Select Centre</option>' +
                    centres.map(centre => 
                        `<option value="${this.escapeHtml(centre.name)}">${this.escapeHtml(centre.name)}</option>`
                    ).join('');
            }
            
            // Populate filter dropdowns
            const filterCentreSelect = document.getElementById('filterCentre');
            if (filterCentreSelect) {
                filterCentreSelect.innerHTML = '<option value="">All Centres</option>' +
                    centres.map(centre => 
                        `<option value="${this.escapeHtml(centre.name)}">${this.escapeHtml(centre.name)}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Error populating centre dropdowns:', error);
        }
    }
    
    /**
     * Populate program dropdowns throughout the app
     */
    async populateProgramDropdowns() {
        try {
            const programs = await this.db.getPrograms();
            
            // Populate student form program dropdown
            const programSelect = document.getElementById('studentProgram');
            if (programSelect) {
                programSelect.innerHTML = '<option value="">Select Program</option>' +
                    programs.map(program => 
                        `<option value="${this.escapeHtml(program.id)}">${this.escapeHtml(program.name)} (${this.escapeHtml(program.code)})</option>`
                    ).join('');
            }
            
            // Populate course form program dropdown
            const courseProgramSelect = document.getElementById('courseProgram');
            if (courseProgramSelect) {
                courseProgramSelect.innerHTML = '<option value="">Select Program</option>' +
                    programs.map(program => 
                        `<option value="${this.escapeHtml(program.id)}">${this.escapeHtml(program.name)}</option>`
                    ).join('');
            }
            
            // Populate filter dropdowns
            const filterProgramSelect = document.getElementById('filterProgram');
            if (filterProgramSelect) {
                filterProgramSelect.innerHTML = '<option value="">All Programs</option>' +
                    programs.map(program => 
                        `<option value="${this.escapeHtml(program.id)}">${this.escapeHtml(program.name)}</option>`
                    ).join('');
            }
            
            // Populate marks form program filter
            const marksProgramSelect = document.getElementById('marksProgram');
            if (marksProgramSelect) {
                marksProgramSelect.innerHTML = '<option value="">All Programs</option>' +
                    programs.map(program => 
                        `<option value="${this.escapeHtml(program.id)}">${this.escapeHtml(program.name)}</option>`
                    ).join('');
            }
            
            console.log(`Loaded ${programs.length} programs into dropdowns`);
            
        } catch (error) {
            console.error('Error populating program dropdowns:', error);
        }
    }
    
    initializeUI() {
        // Initialize date pickers
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (input) {
                input.max = today;
                if (!input.value) {
                    input.value = today;
                }
            }
        });
        
        // Initialize intake year dropdown
        this.populateIntakeYearDropdown();
        
        // Initialize settings tabs
        if (document.querySelector('.settings-tab-btn')) {
            try {
                if (this.settings && this.settings.initializeSettingsTabs) {
                    this.settings.initializeSettingsTabs();
                }
            } catch (error) {
                console.warn('Settings tabs initialization failed:', error);
            }
        }
    }
    
    populateIntakeYearDropdown() {
        const intakeSelect = document.getElementById('studentIntake');
        if (intakeSelect) {
            const currentYear = new Date().getFullYear();
            intakeSelect.innerHTML = '<option value="">Select Intake Year</option>';
            
            // Add 10 years back and 2 years forward
            for (let year = currentYear - 10; year <= currentYear + 2; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) {
                    option.selected = true;
                }
                intakeSelect.appendChild(option);
            }
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
            
            // Program form submission
            const programForm = document.getElementById('programForm');
            if (programForm) {
                programForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.programs && this.programs.saveProgram) {
                        this.programs.saveProgram(e);
                    } else {
                        this.showToast('Program module not available', 'error');
                    }
                });
            }
            
            // Centre form submission
            const centreForm = document.getElementById('centreForm');
            if (centreForm) {
                centreForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.centres && this.centres.saveCentre) {
                        this.centres.saveCentre(e);
                    }
                });
            }
            
            // Filter event listeners
            const filterCounty = document.getElementById('filterCounty');
            if (filterCounty) {
                filterCounty.addEventListener('change', () => {
                    if (this.students && this.students.filterStudents) {
                        this.students.filterStudents();
                    }
                });
            }
            
            const filterCentre = document.getElementById('filterCentre');
            if (filterCentre) {
                filterCentre.addEventListener('change', () => {
                    if (this.students && this.students.filterStudents) {
                        this.students.filterStudents();
                    }
                });
            }
            
            const filterProgram = document.getElementById('filterProgram');
            if (filterProgram) {
                filterProgram.addEventListener('change', () => {
                    if (this.students && this.students.filterStudents) {
                        this.students.filterStudents();
                    }
                });
            }
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    showToast(message, type = 'info') {
        try {
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                border-radius: 8px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            // Icon based on type
            const icon = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         'fa-info-circle';
            
            toast.innerHTML = `
                <i class="fas ${icon}" style="font-size: 18px;"></i>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    font-size: 16px;
                    opacity: 0.8;
                ">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Remove existing toasts if too many
            const existingToasts = document.querySelectorAll('.toast');
            if (existingToasts.length > 3) {
                existingToasts[0].remove();
            }
            
            document.body.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 5000);
            
            // Add animation styles if not already present
            if (!document.querySelector('#toast-animations')) {
                const style = document.createElement('style');
                style.id = 'toast-animations';
                style.textContent = `
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
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    /**
     * Show error UI
     */
    showErrorUI(error) {
        try {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'app-error';
            errorDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                padding: 20px;
                text-align: center;
            `;
            
            errorDiv.innerHTML = `
                <div style="max-width: 500px;">
                    <div style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #2c3e50; margin-bottom: 15px;">System Error</h2>
                    <p style="color: #7f8c8d; margin-bottom: 20px;">
                        The application could not start properly. Please try reloading the page.
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <code style="color: #e74c3c; font-size: 12px;">
                            ${this.escapeHtml(error.message || 'Unknown error')}
                        </code>
                    </div>
                    <button onclick="location.reload()" style="
                        padding: 12px 30px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 10px;
                    ">
                        <i class="fas fa-redo"></i> Reload Application
                    </button>
                </div>
            `;
            
            document.body.appendChild(errorDiv);
        } catch (e) {
            console.error('Could not show error UI:', e);
        }
    }
    
    /**
     * XSS Protection: Escape HTML
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Open student modal (compatibility function)
     */
    openStudentModal() {
        const modal = document.getElementById('studentModal');
        if (modal) {
            // Use modal manager if available
            if (window.modalManager) {
                window.modalManager.openModal('studentModal');
            } else {
                // Fallback
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    /**
     * Open marks modal (compatibility function)
     */
    openMarksModal() {
        const modal = document.getElementById('marksModal');
        if (modal) {
            // Use modal manager if available
            if (window.modalManager) {
                window.modalManager.openModal('marksModal');
            } else {
                // Fallback
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    /**
     * Open course modal (compatibility function)
     */
    openCourseModal() {
        const modal = document.getElementById('courseModal');
        if (modal) {
            // Use modal manager if available
            if (window.modalManager) {
                window.modalManager.openModal('courseModal');
            } else {
                // Fallback
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    /**
     * Open program modal (compatibility function)
     */
    openProgramModal() {
        const modal = document.getElementById('programModal');
        if (modal) {
            // Use modal manager if available
            if (window.modalManager) {
                window.modalManager.openModal('programModal');
            } else {
                // Fallback
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    /**
     * Refresh all data
     */
    async refreshAllData() {
        try {
            this.showToast('Refreshing data...', 'info');
            await this.loadInitialData();
            this.showToast('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showToast('Failed to refresh data', 'error');
        }
    }
    
    /**
     * Refresh dashboard
     */
    async refreshDashboard() {
        if (this.dashboard && this.dashboard.updateDashboard) {
            try {
                await this.dashboard.updateDashboard();
                this.showToast('Dashboard refreshed', 'success');
            } catch (error) {
                console.error('Error refreshing dashboard:', error);
                this.showToast('Failed to refresh dashboard', 'error');
            }
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Check database connection
            const dbHealthy = await this.db.healthCheck();
            
            // Check if modules are loaded
            const modulesHealthy = this.students && this.programs && this.courses;
            
            return {
                healthy: dbHealthy && modulesHealthy,
                database: dbHealthy,
                modules: {
                    students: !!this.students,
                    programs: !!this.programs,
                    courses: !!this.courses,
                    marks: !!this.marks,
                    centres: !!this.centres
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// ==============================
// GLOBAL INITIALIZATION
// ==============================

let app = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    // Prevent multiple initializations
    if (window.app && window.app.initialized) {
        console.log('App already initialized');
        return;
    }
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'app-loading';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    loadingIndicator.innerHTML = `
        <div class="spinner" style="
            width: 60px;
            height: 60px;
            border: 5px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        "></div>
        <h2 style="margin: 0 0 10px 0;">TEEPortal</h2>
        <p style="margin: 0; opacity: 0.8;">Initializing system...</p>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loadingIndicator);
    
    try {
        // Create app instance
        app = new TEEPortalApp();
        window.app = app;
        
        // Initialize with timeout
        const initTimeout = setTimeout(() => {
            loadingIndicator.innerHTML = `
                <h2 style="margin: 0 0 10px 0;">Taking longer than expected...</h2>
                <p style="margin: 0; opacity: 0.8;">Please wait while we initialize the system</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: white;
                    color: #764ba2;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Reload Now</button>
            `;
        }, 5000);
        
        await app.initialize();
        clearTimeout(initTimeout);
        
        // Remove loading indicator with fade out
        loadingIndicator.style.opacity = '0';
        loadingIndicator.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (loadingIndicator.parentElement) {
                loadingIndicator.remove();
            }
        }, 500);
        
        console.log('🎉 TEEPortal System Ready');
        
        // Show dashboard by default
        setTimeout(() => {
            // Check URL hash first
            const hash = window.location.hash.substring(1);
            if (hash && document.getElementById(hash)) {
                showSection(hash);
            } else {
                showSection('dashboard');
            }
        }, 100);
        
        // Run health check after initialization
        setTimeout(() => {
            if (app.healthCheck) {
                app.healthCheck().then(health => {
                    if (!health.healthy) {
                        console.warn('App health check failed:', health);
                        // Show warning if not critical
                        if (health.error && !health.error.includes('database')) {
                            app.showToast('Some features may not work properly', 'warning');
                        }
                    }
                });
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        // Update loading indicator to show error
        loadingIndicator.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px; color: #ff6b6b;">⚠️</div>
                <h2 style="margin: 0 0 10px 0; color: white;">Initialization Failed</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9; max-width: 400px;">
                    The system could not start properly. Please try reloading the page.
                </p>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <small style="display: block; margin-bottom: 5px; opacity: 0.8;">Error Details:</small>
                    <code style="font-family: monospace; font-size: 12px; word-break: break-all;">
                        ${error.message || 'Unknown error'}
                    </code>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="location.reload()" style="
                        padding: 12px 24px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-redo"></i> Reload Application
                    </button>
                    <button onclick="document.getElementById('app-loading').remove()" style="
                        padding: 12px 24px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        border-radius: 5px;
                        cursor: pointer;
                    ">
                        Dismiss
                    </button>
                </div>
                <p style="margin-top: 30px; font-size: 12px; opacity: 0.7;">
                    If this persists, check your internet connection and try again.
                </p>
            </div>
        `;
    }
});

// ==============================
// GLOBAL HELPER FUNCTIONS
// ==============================

// Global showSection function
window.showSection = function(sectionId) {
    console.log('🔄 Switching to section:', sectionId);
    
    // Update URL hash
    history.replaceState(null, null, '#' + sectionId);
    
    // Remove active class from all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        console.log('✅ Found section, showing:', sectionId);
        targetSection.classList.add('active');
        
        // Update page title
        const titleElement = document.getElementById('section-title');
        if (titleElement) {
            const titleMap = {
                'dashboard': 'Dashboard Overview',
                'students': 'Student Management',
                'programs': 'Program Management',
                'courses': 'Course Management',
                'marks': 'Academic Records',
                'reports': 'Reports & Analytics',
                'centres': 'Centre Management',
                'profile': 'User Profile',
                'settings': 'System Settings'
            };
            titleElement.textContent = titleMap[sectionId] || sectionId;
        }
    } else {
        console.error('❌ Section not found:', sectionId);
        // Fallback to dashboard
        showSection('dashboard');
        return;
    }
    
    // Add active class to nav link
    const navLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Lazy load section data if needed
    setTimeout(() => {
        lazyLoadSectionData(sectionId);
    }, 100);
};

// Lazy load section data
function lazyLoadSectionData(sectionId) {
    const app = window.app;
    if (!app) return;
    
    switch(sectionId) {
        case 'dashboard':
            if (app.dashboard?.updateDashboard) {
                app.dashboard.updateDashboard();
            }
            break;
        case 'students':
            if (app.students?.loadStudentsTable) {
                app.students.loadStudentsTable();
            }
            break;
        case 'programs':
            if (app.programs?.loadProgramsTable) {
                app.programs.loadProgramsTable();
            }
            break;
        case 'courses':
            if (app.courses?.loadCourses) {
                app.courses.loadCourses();
            }
            break;
        case 'centres':
            if (app.centres?.loadCentres) {
                app.centres.loadCentres();
            }
            break;
        case 'reports':
            if (app.reports?.initializeReportsUI) {
                const reportsSection = document.getElementById('reports');
                if (!reportsSection.dataset.initialized) {
                    app.reports.initializeReportsUI().then(() => {
                        reportsSection.dataset.initialized = 'true';
                    });
                }
            }
            break;
    }
}

// Handle hash changes
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    }
});

// Set today's date in date fields
document.addEventListener('DOMContentLoaded', function() {
    const dateFields = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateFields.forEach(field => {
        if (!field.value) {
            field.value = today;
        }
        field.max = today;
    });
});

// Add global modal functions for compatibility
window.closeModal = function(modalId) {
    if (window.modalManager) {
        window.modalManager.closeModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
};

window.openModal = function(modalId) {
    if (window.modalManager) {
        window.modalManager.openModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
};

// Global refresh function
window.refreshDashboard = function() {
    if (window.app && window.app.refreshDashboard) {
        window.app.refreshDashboard();
    }
};

// ==============================
// ADD STYLES
// ==============================

// Add toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        animation: slideIn 0.3s ease;
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastStyles);

console.log('📦 app.js loaded successfully');
