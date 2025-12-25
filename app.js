// app.js - COMPLETE FIXED TEE PORTAL APPLICATION
class TEEPortalApp {
    constructor() {
        console.log('🚀 TEEPortalApp constructor called');
        
        // Make this instance globally available
        window.app = this;
        
        // Initialize module references
        this.modules = {
            db: null,
            ui: null,
            settings: null,
            modals: null,
            students: null,
            courses: null,
            programs: null,
            centres: null,
            marks: null,
            reports: null,
            transcripts: null,
            dashboard: null,
            profile: null
        };
        
        // App state
        this.initialized = false;
        this.isLoading = false;
        this.currentPage = null;
        this.user = null;
        this.data = {
            students: [],
            courses: [],
            programs: [],
            centres: [],
            marks: []
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.initializeModule = this.initializeModule.bind(this);
        this.showLoading = this.showLoading.bind(this);
        this.showToast = this.showToast.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.loadInitialData = this.loadInitialData.bind(this);
        
        console.log('✅ TEEPortalApp instance created');
    }
    
    async init() {
        if (this.initialized) {
            console.log('✅ App already initialized');
            return;
        }
        
        try {
            this.showLoading(true);
            console.log('🔄 Starting TEE Portal initialization...');
            
            // Step 1: Initialize Database
            await this.initializeDatabase();
            
            // Step 2: Initialize all modules
            await this.initializeAllModules();
            
            // Step 3: Load initial data
            await this.loadInitialData();
            
            // Step 4: Setup event listeners
            this.setupEventListeners();
            
            // Step 5: Initialize UI
            this.initializeUI();
            
            this.initialized = true;
            console.log('🎉 TEE Portal fully initialized!');
            
            this.showToast('TEE Portal ready! All systems operational.', 'success');
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showToast(`Initialization error: ${error.message}`, 'error');
            
            // Try fallback initialization
            await this.fallbackInitialization();
            
        } finally {
            this.showLoading(false);
        }
    }
    
    async initializeDatabase() {
        console.log('🔄 Step 1: Initializing Database...');
        
        // Check if database class exists
        if (typeof TEEPortalSupabaseDB === 'undefined') {
            throw new Error('TEEPortalSupabaseDB class not found. Make sure database.js is loaded.');
        }
        
        // Create database instance
        this.modules.db = new TEEPortalSupabaseDB();
        
        // Initialize database
        const dbInitialized = await this.modules.db.init();
        
        if (!dbInitialized) {
            console.warn('⚠️ Database initialization returned false, but continuing...');
        }
        
        console.log('✅ Database initialized');
        return this.modules.db;
    }
    
    async initializeAllModules() {
        console.log('🔄 Step 2: Initializing all modules...');
        
        // Define module loading order
        const moduleLoadOrder = [
            { name: 'ui', class: 'UIManager' },
            { name: 'settings', class: 'SettingsManager' },
            { name: 'modals', class: 'ModalManager' },
            { name: 'students', class: 'StudentsManager' },
            { name: 'courses', class: 'CourseManager' },
            { name: 'programs', class: 'ProgramsManager' },
            { name: 'centres', class: 'CentresManager' },
            { name: 'marks', class: 'MarksManager' },
            { name: 'reports', class: 'ReportsManager' },
            { name: 'transcripts', class: 'TranscriptsManager' },
            { name: 'dashboard', class: 'DashboardManager' },
            { name: 'profile', class: 'ProfileManager' }
        ];
        
        // Initialize modules in order
        for (const module of moduleLoadOrder) {
            await this.initializeModule(module.name, module.class);
        }
        
        console.log('✅ All modules initialized');
    }
    
    async initializeModule(moduleName, className) {
        console.log(`  🔄 Initializing ${moduleName}...`);
        
        // Check if class exists
        if (typeof window[className] === 'undefined') {
            console.warn(`⚠️ ${className} not found, skipping ${moduleName}`);
            return;
        }
        
        try {
            // Create module instance with appropriate parameters
            switch(moduleName) {
                case 'ui':
                    this.modules[moduleName] = new UIManager(this);
                    break;
                    
                case 'settings':
                    this.modules[moduleName] = new SettingsManager(this.modules.db);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'modals':
                    this.modules[moduleName] = new ModalManager(this);
                    break;
                    
                case 'students':
                    this.modules[moduleName] = new StudentsManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'courses':
                    this.modules[moduleName] = new CourseManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'programs':
                    this.modules[moduleName] = new ProgramsManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'centres':
                    this.modules[moduleName] = new CentresManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'marks':
                    this.modules[moduleName] = new MarksManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'reports':
                    this.modules[moduleName] = new ReportsManager(this.modules.db);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'transcripts':
                    this.modules[moduleName] = new TranscriptsManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'dashboard':
                    this.modules[moduleName] = new DashboardManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                case 'profile':
                    this.modules[moduleName] = new ProfileManager(this.modules.db, this);
                    await this.modules[moduleName].initialize();
                    break;
                    
                default:
                    this.modules[moduleName] = new window[className](this.modules.db, this);
                    if (this.modules[moduleName].initialize) {
                        await this.modules[moduleName].initialize();
                    }
            }
            
            console.log(`  ✅ ${moduleName} initialized`);
            
        } catch (error) {
            console.error(`❌ Error initializing ${moduleName}:`, error);
            this.modules[moduleName] = null;
        }
    }
    
    async loadInitialData() {
        console.log('🔄 Step 3: Loading initial data...');
        
        try {
            // Load data in parallel for better performance
            const dataPromises = [];
            
            // Load students if module exists
            if (this.modules.students && this.modules.students.loadStudents) {
                dataPromises.push(
                    this.modules.students.loadStudents().then(students => {
                        this.data.students = students;
                        console.log(`✅ Loaded ${students.length} students`);
                    }).catch(e => console.error('Error loading students:', e))
                );
            }
            
            // Load courses if module exists
            if (this.modules.courses && this.modules.courses.loadCourses) {
                dataPromises.push(
                    this.modules.courses.loadCourses().then(courses => {
                        this.data.courses = courses;
                        console.log(`✅ Loaded ${courses.length} courses`);
                    }).catch(e => console.error('Error loading courses:', e))
                );
            }
            
            // Load programs if module exists
            if (this.modules.programs && this.modules.programs.loadPrograms) {
                dataPromises.push(
                    this.modules.programs.loadPrograms().then(programs => {
                        this.data.programs = programs;
                        console.log(`✅ Loaded ${programs.length} programs`);
                    }).catch(e => console.error('Error loading programs:', e))
                );
            }
            
            // Load centres if module exists
            if (this.modules.centres && this.modules.centres.loadCentres) {
                dataPromises.push(
                    this.modules.centres.loadCentres().then(centres => {
                        this.data.centres = centres;
                        console.log(`✅ Loaded ${centres.length} centres`);
                    }).catch(e => console.error('Error loading centres:', e))
                );
            }
            
            // Wait for all data to load
            await Promise.allSettled(dataPromises);
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }
    
    setupEventListeners() {
        console.log('🔄 Step 4: Setting up event listeners...');
        
        try {
            // Global click handler for navigation
            document.addEventListener('click', (event) => {
                const target = event.target;
                
                // Handle section navigation
                if (target.matches('[data-section]') || target.closest('[data-section]')) {
                    const sectionElement = target.matches('[data-section]') ? target : target.closest('[data-section]');
                    const sectionId = sectionElement.getAttribute('data-section');
                    this.navigateToSection(sectionId);
                    event.preventDefault();
                }
                
                // Handle modal open
                if (target.matches('[data-modal]') || target.closest('[data-modal]')) {
                    const modalElement = target.matches('[data-modal]') ? target : target.closest('[data-modal]');
                    const modalId = modalElement.getAttribute('data-modal');
                    this.openModal(modalId);
                    event.preventDefault();
                }
                
                // Handle modal close
                if (target.matches('.modal-close, .btn-close') || 
                    target.closest('.modal-close, .btn-close')) {
                    const modal = target.closest('.modal');
                    if (modal) {
                        this.closeModal(modal.id);
                    }
                    event.preventDefault();
                }
            });
            
            // Handle hash changes for section navigation
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.substring(1);
                if (hash) {
                    this.navigateToSection(hash);
                }
            });
            
            // Global error handler
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
                this.showToast(`Error: ${event.error?.message || 'Unknown error'}`, 'error');
            });
            
            // Handle form submissions globally
            document.addEventListener('submit', (event) => {
                const form = event.target;
                if (form.matches('form[data-action]')) {
                    event.preventDefault();
                    const action = form.getAttribute('data-action');
                    this.handleFormSubmission(form, action);
                }
            });
            
            console.log('✅ Event listeners setup complete');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }
    
    initializeUI() {
        console.log('🔄 Step 5: Initializing UI...');
        
        try {
            // Initialize date inputs
            this.initializeDateInputs();
            
            // Initialize select dropdowns
            this.initializeSelects();
            
            // Show initial section
            const hash = window.location.hash.substring(1);
            const initialSection = hash || 'dashboard';
            this.navigateToSection(initialSection);
            
            // Update page title
            document.title = 'TEE College Portal';
            
            console.log('✅ UI initialized');
            
        } catch (error) {
            console.error('❌ Error initializing UI:', error);
        }
    }
    
    initializeDateInputs() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.value = today;
            }
            // Set max date to today for past dates
            if (!input.hasAttribute('data-future') || input.getAttribute('data-future') !== 'true') {
                input.max = today;
            }
        });
    }
    
    initializeSelects() {
        // Initialize intake year selects
        document.querySelectorAll('select[name*="intake"], select[name*="year"]').forEach(select => {
            const currentYear = new Date().getFullYear();
            if (select.options.length <= 1) {
                select.innerHTML = '<option value="">Select Year</option>';
                for (let year = currentYear; year >= currentYear - 10; year--) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    select.appendChild(option);
                }
            }
        });
    }
    
    async fallbackInitialization() {
        console.log('🔄 Attempting fallback initialization...');
        
        try {
            // Create minimal database if none exists
            if (!this.modules.db && typeof TEEPortalSupabaseDB === 'undefined') {
                console.log('📦 Creating fallback database...');
                this.createFallbackDatabase();
            }
            
            // Initialize essential modules only
            if (window.ReportsManager) {
                this.modules.reports = new ReportsManager(this.modules.db || {});
                await this.modules.reports.initialize();
                console.log('✅ Reports module initialized (fallback)');
            }
            
            // Mark as initialized with limited functionality
            this.initialized = true;
            this.showToast('System running in limited mode. Some features may not work.', 'warning');
            
        } catch (error) {
            console.error('❌ Fallback initialization also failed:', error);
        }
    }
    
    createFallbackDatabase() {
        // Create a simple fallback database object
        this.modules.db = {
            async init() { return true; },
            async getStudents() { return []; },
            async getCourses() { return []; },
            async getMarks() { return []; },
            async getPrograms() { return []; },
            async getCentres() { return []; },
            async getCounties() { return []; },
            async getSettings() { 
                return {
                    instituteName: 'TEE College',
                    centres: [
                        { id: 1, name: 'Main Campus', code: 'MAIN' },
                        { id: 2, name: 'Branch Campus', code: 'BRANCH' }
                    ],
                    counties: [
                        { id: 1, name: 'Nairobi' },
                        { id: 2, name: 'Mombasa' }
                    ]
                };
            }
        };
        
        console.log('✅ Fallback database created');
    }
    
    // ==================== PUBLIC METHODS ====================
    
    navigateToSection(sectionId) {
        console.log(`📍 Navigating to section: ${sectionId}`);
        
        // Hide all sections
        document.querySelectorAll('.content-section, .page-section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        
        // Remove active class from nav links
        document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
            this.currentPage = sectionId;
            
            // Update URL hash without triggering navigation
            window.history.replaceState(null, null, `#${sectionId}`);
            
            // Add active class to corresponding nav link
            const navLink = document.querySelector(`[href="#${sectionId}"], [data-section="${sectionId}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
            
            // Trigger section-specific initialization
            this.onSectionChange(sectionId);
            
        } else {
            console.warn(`⚠️ Section ${sectionId} not found, falling back to dashboard`);
            this.navigateToSection('dashboard');
        }
    }
    
    onSectionChange(sectionId) {
        // Trigger module-specific actions when section changes
        switch(sectionId) {
            case 'students':
                if (this.modules.students && this.modules.students.onSectionActivated) {
                    this.modules.students.onSectionActivated();
                }
                break;
                
            case 'courses':
                if (this.modules.courses && this.modules.courses.onSectionActivated) {
                    this.modules.courses.onSectionActivated();
                }
                break;
                
            case 'marks':
                if (this.modules.marks && this.modules.marks.onSectionActivated) {
                    this.modules.marks.onSectionActivated();
                }
                break;
                
            case 'reports':
                if (this.modules.reports && this.modules.reports.onSectionActivated) {
                    this.modules.reports.onSectionActivated();
                }
                break;
                
            case 'dashboard':
                if (this.modules.dashboard && this.modules.dashboard.onSectionActivated) {
                    this.modules.dashboard.onSectionActivated();
                }
                break;
        }
    }
    
    openModal(modalId) {
        console.log(`📦 Opening modal: ${modalId}`);
        
        if (this.modules.modals && this.modules.modals.openModal) {
            this.modules.modals.openModal(modalId);
        } else {
            // Fallback modal opening
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    closeModal(modalId) {
        if (this.modules.modals && this.modules.modals.closeModal) {
            this.modules.modals.closeModal(modalId);
        } else {
            // Fallback modal closing
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
    }
    
    handleFormSubmission(form, action) {
        console.log(`📝 Handling form submission: ${action}`);
        
        // Find the appropriate module to handle this form
        switch(action) {
            case 'add-student':
            case 'update-student':
                if (this.modules.students && this.modules.students.handleFormSubmit) {
                    this.modules.students.handleFormSubmit(form, action);
                }
                break;
                
            case 'add-course':
            case 'update-course':
                if (this.modules.courses && this.modules.courses.handleFormSubmit) {
                    this.modules.courses.handleFormSubmit(form, action);
                }
                break;
                
            case 'add-mark':
            case 'update-mark':
                if (this.modules.marks && this.modules.marks.handleFormSubmit) {
                    this.modules.marks.handleFormSubmit(form, action);
                }
                break;
                
            case 'generate-report':
                if (this.modules.reports && this.modules.reports.handleFormSubmit) {
                    this.modules.reports.handleFormSubmit(form, action);
                }
                break;
                
            default:
                console.warn(`Unknown form action: ${action}`);
                this.showToast(`Unknown form action: ${action}`, 'warning');
        }
    }
    
    showLoading(show) {
        this.isLoading = show;
        
        // Create or update loading overlay
        let loadingOverlay = document.getElementById('app-loading-overlay');
        
        if (show) {
            if (!loadingOverlay) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.id = 'app-loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-content">
                        <div class="spinner"></div>
                        <div class="loading-text">Loading...</div>
                    </div>
                `;
                document.body.appendChild(loadingOverlay);
            }
            loadingOverlay.style.display = 'flex';
        } else if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: white; 
                        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 4px solid 
                        ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};">
                <i class="fas ${icons[type] || 'fa-info-circle'}" 
                   style="font-size: 20px; color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">${this.escapeHtml(message)}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utility method to refresh all data
    async refreshAllData() {
        console.log('🔄 Refreshing all data...');
        this.showLoading(true);
        
        try {
            await this.loadInitialData();
            this.showToast('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showToast('Error refreshing data', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // Get module shortcut
    getModule(name) {
        return this.modules[name];
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

async function initializeApp() {
    console.log('📄 DOM Ready - Initializing TEE Portal Application...');
    
    // Add loading styles
    const loadingStyles = document.createElement('style');
    loadingStyles.textContent = `
        #app-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .loading-content {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .spinner {
            width: 60px;
            height: 60px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        .loading-text {
            color: #2c3e50;
            font-size: 16px;
            font-weight: 500;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(loadingStyles);
    
    try {
        // Create and initialize app
        const app = new TEEPortalApp();
        await app.init();
        
        // Make app available globally
        window.app = app;
        
        console.log('🎉 TEE Portal Application Ready!');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="text-align: center; max-width: 500px;">
                <h1 style="font-size: 48px; margin-bottom: 20px;">⚠️</h1>
                <h2 style="font-size: 28px; margin-bottom: 16px;">Initialization Error</h2>
                <p style="margin-bottom: 24px; opacity: 0.9; line-height: 1.6;">
                    The TEE Portal failed to initialize. Please check the browser console for details.
                </p>
                <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">Error Details:</div>
                    <div style="font-family: monospace; font-size: 13px; word-break: break-all;">
                        ${error.message || 'Unknown error'}
                    </div>
                </div>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    background: white;
                    color: #764ba2;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-redo"></i> Reload Application
                </button>
            </div>
        `;
        
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    }
}

// Global helper functions
window.showToast = function(message, type) {
    if (window.app && window.app.showToast) {
        window.app.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
};

window.showSection = function(sectionId) {
    if (window.app && window.app.navigateToSection) {
        window.app.navigateToSection(sectionId);
    }
};

window.openModal = function(modalId) {
    if (window.app && window.app.openModal) {
        window.app.openModal(modalId);
    }
};

window.closeModal = function(modalId) {
    if (window.app && window.app.closeModal) {
        window.app.closeModal(modalId);
    }
};

console.log('📦 app.js loaded successfully');
