// app.js
let app = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TEEPortal Starting...');
    
    try {
        // Initialize database
        const db = new TEEPortalSupabaseDB();
        await db.init();
        
        // Initialize managers
        const studentManager = new StudentManager(db);
        const courseManager = new CourseManager(db);
        const marksManager = new MarksManager(db);
        const settingsManager = new SettingsManager(db);
        const reportsManager = new ReportsManager(db);
        const transcriptsManager = new TranscriptsManager(db);
        
        // Create main app object
        app = {
            db,
            students: studentManager,
            courses: courseManager,
            marks: marksManager,
            settings: settingsManager,
            reports: reportsManager,
            transcripts: transcriptsManager,
            ui: new UIManager()
        };
        
        window.app = app;
        
        // Load initial data
        await app.students.loadStudentsTable();
        await app.courses.loadCourses();
        
        console.log('✅ TEEPortal Ready');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Failed to initialize: ' + error.message);
    }
});

// Global functions
function showSection(sectionId) {
    // Navigation function
}

function openModal(modalId) {
    // Open modal
}

function closeModal(modalId) {
    // Close modal
}
