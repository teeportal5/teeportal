// modules/marks.js - UPDATED WITH REAL STATISTICS AND FIXED CENTRE DISPLAY
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        
        // Table properties
        this.currentPage = 1;
        this.pageSize = 25;
        this.filteredData = [];
        this.selectedMarks = new Set();
        this.viewMode = 'table';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        // Duplicate validation properties
        this.existingMarksId = null;
        this.isDuplicateEntry = false;
        this.currentMarksData = null;
        
        // Form submission lock
        this.isSaving = false;
        
        // Initialize when ready
        setTimeout(() => this.initialize(), 100);
    }
    
    // ==================== INITIALIZATION ====================
    
    initialize() {
        console.log('🎯 Initializing MarksManager...');
        this.addDuplicateCheckingStyles();
        this.addHorizontalCardsStyles();
        this.addCompactViewStyles();
        this.initEventListeners();
        this.preventDuplicateFormSubmissions();
    }
    
    initEventListeners() {
        console.log('🎯 Initializing MarksManager event listeners');
        
        // Initialize modal handlers first
        this.initModalHandlers();
        
        // Search input with debounce
        const searchInput = document.getElementById('marksSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filterTable();
            }, 300));
        }
        
        // Filter selects
        ['gradeFilter', 'courseFilter', 'dateFilter', 'studentFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterTable());
            }
        });
        
        // View mode buttons
        const viewModeBtns = document.querySelectorAll('.view-mode-btn');
        if (viewModeBtns.length > 0) {
            viewModeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const viewMode = btn.getAttribute('data-view');
                    this.setViewMode(viewMode);
                });
            });
        }
        
        // Pagination buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        
        // Page size
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => this.changePageSize());
        }
        
        // Marks form submit handler - SINGLE SAVE PREVENTION
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            // Remove any existing listeners
            marksForm.removeEventListener('submit', this.handleMarksSubmission);
            // Add new listener with single save protection
            marksForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSingleSaveMarks(e);
            });
        }
        
        // Add Marks button
        const addMarksBtn = document.querySelector('[onclick*="openMarksModal"]');
        if (addMarksBtn) {
            addMarksBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openMarksModal();
            });
        }
        
        // Setup marks modal listeners for duplicate checking
        this.setupMarksModalValidation();
    }
    
    setupMarksModalValidation() {
        // Student change - check for duplicates IMMEDIATELY
        const studentSelect = document.getElementById('marksStudent');
        if (studentSelect) {
            studentSelect.addEventListener('change', () => {
                // Show loading state
                this.showDuplicateChecking();
                // Check immediately
                this.checkForDuplicateMarks();
            });
        }
        
        // Course change - check for duplicates IMMEDIATELY
        const courseSelect = document.getElementById('marksCourse');
        if (courseSelect) {
            courseSelect.addEventListener('change', () => {
                this.showDuplicateChecking();
                this.checkForDuplicateMarks();
            });
        }
        
        // Assessment type change - check for duplicates IMMEDIATELY
        const assessmentSelect = document.getElementById('assessmentType');
        if (assessmentSelect) {
            assessmentSelect.addEventListener('change', () => {
                this.showDuplicateChecking();
                this.checkForDuplicateMarks();
            });
        }
        
        // Date change - check for duplicates IMMEDIATELY
        const dateInput = document.getElementById('assessmentDate');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.showDuplicateChecking();
                this.checkForDuplicateMarks();
            });
        }
        
        // Also add input event listeners for score fields
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('marksMaxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => {
                this.updateMarksGradeDisplay();
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                this.updateMarksGradeDisplay();
            });
        }
    }
    
    // ADD THIS NEW METHOD
    showDuplicateChecking() {
        const duplicateStatus = document.getElementById('duplicateStatus');
        if (duplicateStatus) {
            duplicateStatus.style.display = 'block';
        }
    }
    
    // UPDATE THIS METHOD
    hideDuplicateChecking() {
        const duplicateStatus = document.getElementById('duplicateStatus');
        if (duplicateStatus) {
            duplicateStatus.style.display = 'none';
        }
    }
    
    initModalHandlers() {
        // Global modal close handlers
        document.addEventListener('click', (e) => {
            // Close modal when clicking on close button
            if (e.target.closest('[data-modal-close]')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            }
            
            // Close modal when clicking outside
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="block"], .modal.active');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
    }
    
    // ==================== SINGLE SAVE PROTECTION ====================
    
    /**
     * Handle single save marks - prevents multiple saves
     */
    async handleSingleSaveMarks(event) {
        event.preventDefault();
        
        console.log('🛡️ Single save protection check...');
        
        // ✅ STRICTER: Check if already saving
        if (this.isSaving) {
            console.log('⚠️ BLOCKED: Already saving, ignoring duplicate click');
            this.showToast('Already saving, please wait...', 'warning');
            return false;
        }
        
        // ✅ Set saving flag IMMEDIATELY
        this.isSaving = true;
        console.log('🔒 Save lock activated');
        
        // Disable submit button
        const submitBtn = document.getElementById('saveMarksBtn');
        const originalText = submitBtn.innerHTML;
        const originalDisabled = submitBtn.disabled;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Also disable form inputs temporarily
        const formInputs = document.querySelectorAll('#marksForm input, #marksForm select, #marksForm button');
        formInputs.forEach(input => {
            if (input !== submitBtn) {
                input.disabled = true;
            }
        });
        
        try {
            console.log('📝 Handling single marks submission...');
            
            // Get form data
            const formData = this.getMarksFormData();
            console.log('📊 Form data:', formData);
            
            // Validate form data
            if (!this.validateMarksForm(formData)) {
                console.log('❌ Form validation failed');
                throw new Error('Form validation failed');
            }
            
            // Check if this is an overwrite operation
            const isDuplicate = document.getElementById('isDuplicate')?.value === 'true';
            const existingId = document.getElementById('existingMarksId')?.value;
            
            let result;
            
            if (isDuplicate && existingId) {
                // Overwrite existing marks
                console.log(`🔄 Overwriting existing marks ID: ${existingId}`);
                result = await this.db.updateMark(existingId, formData);
                this.showToast('✅ Marks updated successfully!', 'success');
            } else {
                // Save new marks - SINGLE SAVE
                console.log('💾 Saving new marks (single save)...');
                result = await this.db.addMark(formData);
                this.showToast('✅ Marks saved successfully!', 'success');
            }
            
            // Close modal and refresh table
            console.log('✅ Save successful, closing modal...');
            this.closeModal('marksModal');
            
            // Small delay before refreshing table
            setTimeout(async () => {
                await this.loadMarksTable();
                console.log('✅ Table refreshed');
            }, 500);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving marks:', error);
            this.showToast(`Error: ${error.message || 'Failed to save marks'}`, 'error');
            return false;
            
        } finally {
            console.log('🔓 Releasing save lock...');
            
            // ✅ Always reset saving flag
            this.isSaving = false;
            
            // ✅ Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = originalDisabled;
            }
            
            // ✅ Re-enable form inputs
            const formInputs = document.querySelectorAll('#marksForm input, #marksForm select, #marksForm button');
            formInputs.forEach(input => {
                input.disabled = false;
            });
            
            console.log('🔄 Form reset complete');
        }
    }
    
    // Add this method to prevent multiple event listeners
    preventDuplicateFormSubmissions() {
        const marksForm = document.getElementById('marksForm');
        if (!marksForm) return;
        
        console.log('🛡️ Setting up form submission protection...');
        
        // Remove ALL existing submit event listeners
        const newForm = marksForm.cloneNode(true);
        marksForm.parentNode.replaceChild(newForm, marksForm);
        
        // Add single submit handler
        newForm.addEventListener('submit', (e) => {
            console.log('📝 Form submit event fired');
            this.handleSingleSaveMarks(e);
        });
        
        // Also prevent double-clicks on the save button
        const saveBtn = document.getElementById('saveMarksBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                console.log('🖱️ Save button clicked');
                if (this.isSaving) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⚠️ Save button blocked (already saving)');
                    return false;
                }
            });
        }
    }
    
    addDuplicateCheckingStyles() {
        const styleId = 'duplicate-checking-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Duplicate checking status */
            #duplicateStatus {
                transition: all 0.3s ease;
            }
            
            #duplicateStatus .status-message {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                color: #1565c0;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9em;
                font-weight: 500;
            }
            
            /* Form loading states */
            .form-loading {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: #6c757d;
                font-size: 0.8em;
            }
            
            .form-group {
                position: relative;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    addHorizontalCardsStyles() {
        const styleId = 'horizontal-cards-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Horizontal Cards Container */
            .cards-container-horizontal {
                width: 100%;
                overflow-x: auto;
                padding: 20px 10px;
                margin: -10px;
            }
            
            .cards-scroll-wrapper {
                min-width: min-content;
            }
            
            .cards-grid-horizontal {
                display: flex;
                gap: 20px;
                padding: 10px;
            }
            
            /* Individual Card Styling */
            .mark-card-horizontal {
                flex: 0 0 auto;
                width: 320px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                border: 1px solid #e5e7eb;
                overflow: hidden;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .mark-card-horizontal:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                border-color: #3b82f6;
            }
            
            /* Card Header */
            .card-header-horizontal {
                display: flex;
                align-items: center;
                padding: 16px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-bottom: 1px solid #e5e7eb;
            }
            
            .student-avatar-horizontal {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                border: 2px solid;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .avatar-initials-horizontal {
                font-size: 1.125rem;
                font-weight: 700;
            }
            
            .student-info-horizontal {
                flex: 1;
                min-width: 0;
            }
            
            .student-name-horizontal {
                font-weight: 600;
                color: #1f2937;
                font-size: 1rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .student-reg-horizontal {
                font-size: 0.75rem;
                color: #6b7280;
                font-family: monospace;
                margin-top: 2px;
            }
            
            .card-actions-horizontal {
                display: flex;
                gap: 6px;
                margin-left: 8px;
            }
            
            .card-action-btn {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                background: white;
                color: #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .card-action-btn:hover {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            /* Card Body */
            .card-body-horizontal {
                padding: 16px;
            }
            
            .course-info-horizontal {
                margin-bottom: 16px;
            }
            
            .course-code-horizontal {
                font-weight: 700;
                color: #1f2937;
                font-size: 1.125rem;
            }
            
            .course-name-horizontal {
                font-size: 0.875rem;
                color: #6b7280;
                margin-top: 2px;
            }
            
            .score-display-horizontal {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
            }
            
            .score-main-horizontal {
                display: flex;
                align-items: baseline;
            }
            
            .score-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
            }
            
            .score-separator {
                font-size: 1rem;
                color: #9ca3af;
                margin: 0 4px;
            }
            
            .score-max {
                font-size: 1rem;
                color: #6b7280;
                font-weight: 600;
            }
            
            .score-percentage {
                font-size: 1rem;
                font-weight: 700;
            }
            
            .grade-display-horizontal {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            
            .grade-badge-horizontal {
                padding: 8px 16px;
                border-radius: 20px;
                color: white;
                font-weight: 700;
                font-size: 0.875rem;
            }
            
            .grade-points {
                font-size: 0.875rem;
                color: #6b7280;
                font-weight: 600;
            }
            
            /* Card Footer */
            .card-footer-horizontal {
                border-top: 1px solid #e5e7eb;
                padding-top: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .assessment-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .assessment-type,
            .assessment-date {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.75rem;
                color: #6b7280;
            }
            
            .assessment-type i,
            .assessment-date i {
                width: 12px;
            }
            
            .status-indicator-horizontal {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            /* Empty state for cards */
            .empty-state-cards {
                text-align: center;
                padding: 60px 20px;
                color: #6b7280;
            }
            
            .empty-state-cards i {
                color: #d1d5db;
                margin-bottom: 16px;
            }
            
            .empty-state-cards h3 {
                color: #374151;
                margin-bottom: 8px;
                font-size: 1.25rem;
            }
            
            .empty-state-cards p {
                margin-bottom: 20px;
            }
            
            /* Scrollbar styling */
            .cards-container-horizontal::-webkit-scrollbar {
                height: 8px;
            }
            
            .cards-container-horizontal::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
            }
            
            .cards-container-horizontal::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            
            .cards-container-horizontal::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .mark-card-horizontal {
                    width: 280px;
                }
                
                .cards-grid-horizontal {
                    gap: 12px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    addCompactViewStyles() {
        const styleId = 'compact-view-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .compact-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 10px;
            }
            
            .compact-item {
                background: white;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                padding: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.2s;
            }
            
            .compact-item:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                border-color: #3b82f6;
            }
            
            .compact-header {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            .compact-avatar {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .compact-info {
                flex: 1;
                min-width: 0;
            }
            
            .compact-name {
                font-weight: 600;
                color: #1f2937;
                font-size: 0.95rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .compact-meta {
                display: flex;
                gap: 8px;
                font-size: 0.75rem;
                color: #6b7280;
                margin-top: 2px;
            }
            
            .compact-reg {
                font-family: monospace;
            }
            
            .compact-status {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .compact-status.published {
                color: #10b981;
            }
            
            .compact-status.hidden {
                color: #6b7280;
            }
            
            .compact-body {
                display: flex;
                align-items: center;
                gap: 16px;
                margin: 0 20px;
            }
            
            .compact-score {
                display: flex;
                align-items: baseline;
                gap: 6px;
            }
            
            .compact-grade {
                font-weight: 600;
                font-size: 0.875rem;
                padding: 4px 10px;
                border-radius: 12px;
                background: rgba(0,0,0,0.05);
            }
            
            .compact-actions {
                display: flex;
                gap: 6px;
            }
            
            .compact-action-btn {
                width: 28px;
                height: 28px;
                border-radius: 6px;
                border: 1px solid #d1d5db;
                background: white;
                color: #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .compact-action-btn:hover {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Reset duplicate flags when opening modal
            if (modalId === 'marksModal') {
                this.existingMarksId = null;
                this.isDuplicateEntry = false;
                this.currentMarksData = null;
                this.hideDuplicateWarning();
            }
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset forms and flags
            if (modalId === 'marksModal') {
                const form = document.getElementById('marksForm');
                if (form) {
                    form.reset();
                    
                    // Reset specific fields
                    const maxScoreInput = document.getElementById('marksMaxScore');
                    if (maxScoreInput) maxScoreInput.value = '100';
                    
                    const assessmentType = document.getElementById('assessmentType');
                    if (assessmentType) assessmentType.value = 'exam';
                    
                    // Set today's date properly
                    const dateField = document.getElementById('assessmentDate');
                    if (dateField) {
                        const today = new Date();
                        dateField.value = today.toISOString().split('T')[0];
                    }
                    
                    // Reset grade display
                    this.resetMarksGradeDisplay(
                        document.getElementById('gradeBadge'),
                        document.getElementById('marksPercentage')
                    );
                    
                    // Reset duplicate warning
                    this.existingMarksId = null;
                    this.isDuplicateEntry = false;
                    this.currentMarksData = null;
                    this.hideDuplicateWarning();
                    
                    // Reset save button
                    const submitBtn = document.getElementById('saveMarksBtn');
                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Marks';
                        submitBtn.disabled = false;
                        submitBtn.className = 'btn btn-primary';
                    }
                    
                    // Reset hidden fields
                    document.getElementById('isDuplicate').value = 'false';
                    document.getElementById('existingMarksId').value = '';
                }
            }
        }
    }
    
    // ==================== DUPLICATE VALIDATION ====================
    
    async checkForDuplicateMarks() {
        try {
            const studentId = document.getElementById('marksStudent')?.value;
            const courseId = document.getElementById('marksCourse')?.value;
            const assessmentType = document.getElementById('assessmentType')?.value;
            const assessmentDate = document.getElementById('assessmentDate')?.value;
            
            // Hide checking status
            this.hideDuplicateChecking();
            
            if (!studentId || !courseId || !assessmentType || !assessmentDate) {
                this.hideDuplicateWarning();
                return null;
            }
            
            console.log('🔍 Checking for duplicate marks in real-time...');
            
            const existingMarks = await this.db.checkDuplicateMarks(
                studentId, 
                courseId, 
                assessmentType,
                assessmentDate
            );
            
            if (existingMarks && existingMarks.length > 0) {
                // Show duplicate warning IMMEDIATELY
                this.showDuplicateWarning(existingMarks[0]);
                return existingMarks[0];
            } else {
                this.hideDuplicateWarning();
                
                // Update save button back to normal
                const submitBtn = document.getElementById('saveMarksBtn');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Marks';
                    submitBtn.className = 'btn btn-primary';
                    submitBtn.disabled = false;
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error checking for duplicate marks:', error);
            this.hideDuplicateWarning();
            this.hideDuplicateChecking();
            return null;
        }
    }
    
    showDuplicateWarning(existingMark) {
        this.existingMarksId = existingMark.id;
        this.isDuplicateEntry = true;
        
        const score = existingMark.score || 0;
        const maxScore = existingMark.max_score || 100;
        const percentage = existingMark.percentage || 0;
        const grade = existingMark.grade || 'N/A';
        
        const warningHtml = `
            <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #92400e;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong style="font-size: 0.95rem;">Duplicate Entry Found!</strong>
                </div>
                <div style="font-size: 0.875rem; color: #78350f;">
                    <div style="margin-bottom: 8px;">This student already has marks for this assessment.</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: rgba(255,255,255,0.5); padding: 8px; border-radius: 6px;">
                        <div>
                            <div style="font-size: 0.75rem; color: #6b7280;">Existing Score</div>
                            <div style="font-weight: 600;">${score}/${maxScore}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: #6b7280;">Grade</div>
                            <div style="font-weight: 600; color: ${this.getGradeColor(grade)}">${grade}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: #6b7280;">Percentage</div>
                            <div style="font-weight: 600;">${percentage.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button type="button" class="btn-warning-overwrite" 
                                onclick="window.app.marks.overwriteExistingMarks()"
                                style="flex: 1; background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-redo"></i> Overwrite
                        </button>
                        <button type="button" class="btn-warning-cancel" 
                                onclick="window.app.marks.hideDuplicateWarning()"
                                style="flex: 1; background: #6b7280; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const duplicateWarning = document.getElementById('duplicateWarning');
        if (duplicateWarning) {
            duplicateWarning.innerHTML = warningHtml;
            duplicateWarning.style.display = 'block';
        }
        
        const submitBtn = document.getElementById('saveMarksBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Overwrite Marks';
            submitBtn.className = 'btn btn-warning';
            submitBtn.style.background = '#f59e0b';
        }
    }
    
    // Add this helper method
    getGradeColor(grade) {
        const colors = {
            'DISTINCTION': '#10b981',
            'CREDIT': '#3b82f6',
            'PASS': '#f59e0b',
            'FAIL': '#ef4444'
        };
        return colors[grade] || '#6b7280';
    }
    
    hideDuplicateWarning() {
        const duplicateWarning = document.getElementById('duplicateWarning');
        if (duplicateWarning) {
            duplicateWarning.style.display = 'none';
        }
        
        const submitBtn = document.getElementById('saveMarksBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Save Marks';
            submitBtn.className = 'btn btn-primary';
            submitBtn.style.background = '#3b82f6';
        }
        
        this.existingMarksId = null;
        this.isDuplicateEntry = false;
    }
    
    overwriteExistingMarks() {
        document.getElementById('isDuplicate').value = 'true';
        document.getElementById('existingMarksId').value = this.existingMarksId;
        
        const submitBtn = document.getElementById('saveMarksBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Overwrite';
            submitBtn.style.background = '#dc2626';
            submitBtn.className = 'btn btn-danger';
        }
        
        const warningDiv = document.querySelector('#duplicateWarning > div');
        if (warningDiv) {
            const messageDiv = warningDiv.querySelector('div:nth-child(2) > div:nth-child(1)');
            if (messageDiv) {
                messageDiv.innerHTML = '<strong>⚠️ Confirm overwrite?</strong> This will replace the existing marks.';
            }
        }
    }
    
    // ==================== FORM DATA HANDLING ====================
    
    getMarksFormData() {
        console.log('📝 Getting form data...');
        
        // Get form field values
        const studentSelect = document.getElementById('marksStudent');
        const courseSelect = document.getElementById('marksCourse');
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('marksMaxScore');
        const assessmentTypeSelect = document.getElementById('assessmentType');
        const assessmentDateInput = document.getElementById('assessmentDate');
        
        // ✅ FIXED: Get radio button values CORRECTLY
        const statusPublished = document.getElementById('statusPublished');
        const statusDraft = document.getElementById('statusDraft');
        
        console.log('🔍 Radio button states:', {
            published: statusPublished?.checked,
            draft: statusDraft?.checked
        });
        
        let visibleToStudent = true; // Default to published
        
        if (statusPublished && statusPublished.checked) {
            visibleToStudent = true;
            console.log('📢 Status: Published (visible to student)');
        } else if (statusDraft && statusDraft.checked) {
            visibleToStudent = false;
            console.log('📢 Status: Draft (hidden from student)');
        } else {
            console.warn('⚠️ No radio button selected, defaulting to published');
        }
        
        const studentId = studentSelect?.value;
        const courseId = courseSelect?.value;
        const score = parseFloat(scoreInput?.value) || 0;
        const maxScore = parseFloat(maxScoreInput?.value) || 100;
        const assessmentType = assessmentTypeSelect?.value || 'exam';
        const assessmentDate = assessmentDateInput?.value || new Date().toISOString().split('T')[0];
        
        console.log('📊 Form values:', {
            studentId,
            courseId,
            score,
            maxScore,
            assessmentType,
            assessmentDate,
            visibleToStudent
        });
        
        // Validate required fields
        if (!studentId) {
            console.error('❌ Student not selected');
            throw new Error('Please select a student');
        }
        
        if (!courseId) {
            console.error('❌ Course not selected');
            throw new Error('Please select a course');
        }
        
        if (isNaN(score) || score < 0) {
            console.error('❌ Invalid score:', score);
            throw new Error('Please enter a valid score');
        }
        
        if (maxScore <= 0) {
            console.error('❌ Invalid max score:', maxScore);
            throw new Error('Maximum score must be greater than 0');
        }
        
        if (score > maxScore) {
            console.error('❌ Score exceeds max:', score, '>', maxScore);
            throw new Error(`Score cannot exceed maximum score of ${maxScore}`);
        }
        
        // Assessment name mapping
        let assessmentName;
        switch(assessmentType) {
            case 'exam':
                assessmentName = 'Final Exam';
                break;
            case 'test':
                assessmentName = 'Test';
                break;
            case 'assignment':
                assessmentName = 'Assignment';
                break;
            case 'practical':
                assessmentName = 'Practical';
                break;
            case 'cat':
                assessmentName = 'CAT';
                break;
            default:
                assessmentName = 'Assessment';
        }
        
        // Calculate percentage
        let percentage = 0;
        if (maxScore > 0) {
            percentage = (score / maxScore) * 100;
        }
        percentage = parseFloat(percentage.toFixed(2));
        
        // Calculate grade
        const grade = this.calculateGrade(percentage);
        const gradePoints = this.getGradePoints(grade);
        
        console.log('🎓 Calculated grade:', {
            percentage,
            grade,
            gradePoints
        });
        
        // Return form data object
        return {
            student_id: studentId,
            course_id: courseId,
            assessment_type: assessmentType,
            assessment_name: assessmentName,
            score: score,
            max_score: maxScore,
            percentage: percentage,
            grade: grade,
            grade_points: gradePoints,
            visible_to_student: visibleToStudent, // ✅ FIXED: Now properly defined
            entered_by: this.app.user?.id || 'system',
            assessment_date: assessmentDate
        };
    }
    
    validateMarksForm(formData) {
        console.log('✅ Validating form data...');
        
        const errors = [];
        
        if (!formData.student_id) {
            errors.push('Please select a student');
            this.showFieldError('marksStudent', 'Please select a student');
        }
        
        if (!formData.course_id) {
            errors.push('Please select a course');
            this.showFieldError('marksCourse', 'Please select a course');
        }
        
        if (formData.score < 0) {
            errors.push('Score cannot be negative');
            this.showFieldError('marksScore', 'Score cannot be negative');
        }
        
        if (formData.max_score <= 0) {
            errors.push('Maximum score must be greater than 0');
            this.showFieldError('marksMaxScore', 'Maximum score must be greater than 0');
        }
        
        if (formData.score > formData.max_score) {
            errors.push(`Score cannot exceed maximum score of ${formData.max_score}`);
            this.showFieldError('marksScore', `Score cannot exceed maximum score of ${formData.max_score}`);
        }
        
        if (!formData.assessment_date) {
            errors.push('Please select an assessment date');
            this.showFieldError('assessmentDate', 'Please select an assessment date');
        }
        
        if (errors.length > 0) {
            console.error('❌ Validation errors:', errors);
            this.showToast(errors[0], 'error');
            return false;
        }
        
        console.log('✅ Form validation passed');
        return true;
    }
    
    // Add helper method for field errors
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '#ef4444';
            
            // Create or update error message
            let errorElement = document.getElementById(`${fieldId}Error`);
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = `${fieldId}Error`;
                errorElement.className = 'field-error';
                errorElement.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 4px;';
                field.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
        }
    }
    
    // Clear field errors when modal opens
    clearFieldErrors() {
        const errorFields = ['marksStudent', 'marksCourse', 'marksScore', 'marksMaxScore', 'assessmentDate'];
        errorFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.borderColor = '';
            }
            
            const errorElement = document.getElementById(`${fieldId}Error`);
            if (errorElement) {
                errorElement.remove();
            }
        });
    }
    
    // ==================== CORE DATA LOADING ====================
    
    async loadMarksTable() {
        try {
            console.log('📊 Loading marks table...');
            const marks = await this.db.getMarksTableData();
            this.filteredData = marks || [];
            
            // ✅ UPDATED: Calculate statistics from actual data
            this.updateSummaryStatsFromData(marks);
            this.applyFilters();
            this.renderCurrentView();
            this.updatePagination();
            await this.populateFilterDropdowns(marks);
            
            console.log('✅ Marks table loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading marks table:', error);
            this.showErrorState(error);
        }
    }
    
    // ==================== REAL STATISTICS FROM DATA ====================
    
    updateSummaryStatsFromData(marks) {
        console.log('📊 Calculating REAL statistics from data...');
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            this.resetSummaryStats();
            return;
        }
        
        // Calculate REAL statistics from actual data
        const totalRecords = marks.length;
        
        // Count distinct students
        const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
        
        // Calculate average percentage
        let totalPercentage = 0;
        let countWithPercentage = 0;
        marks.forEach(mark => {
            if (mark.percentage !== undefined && mark.percentage !== null) {
                totalPercentage += mark.percentage;
                countWithPercentage++;
            }
        });
        const avgScore = countWithPercentage > 0 ? (totalPercentage / countWithPercentage) : 0;
        
        // Count distinctions
        const distinctionCount = marks.filter(m => 
            m.grade && m.grade.toUpperCase() === 'DISTINCTION'
        ).length;
        
        // Find highest and lowest scores
        let highestScore = 0;
        let highestScoreStudent = '';
        let highestScoreCourse = '';
        let lowestScore = 100;
        let lowestScoreStudent = '';
        let lowestScoreCourse = '';
        
        marks.forEach(mark => {
            const percentage = mark.percentage || 0;
            const student = mark.students || {};
            const course = mark.courses || {};
            
            if (percentage > highestScore) {
                highestScore = percentage;
                highestScoreStudent = student.full_name || '';
                highestScoreCourse = course.course_name || '';
            }
            if (percentage < lowestScore && percentage > 0) {
                lowestScore = percentage;
                lowestScoreStudent = student.full_name || '';
                lowestScoreCourse = course.course_name || '';
            }
        });
        
        // ✅ UPDATE STATISTICS CARDS WITH REAL DATA
        this.updateElementText('totalRecords', totalRecords);
        this.updateElementText('distinctStudents', distinctStudents);
        this.updateElementText('avgScore', `${avgScore.toFixed(1)}%`);
        this.updateElementText('distinctionCount', distinctionCount);
        
        // Update highest score card with REAL data
        const highestScoreElement = document.querySelector('.marks-stat-card:nth-child(4) .marks-stat-value');
        if (highestScoreElement) {
            highestScoreElement.textContent = `${highestScore.toFixed(1)}%`;
        }
        const highestScoreSubtitle = document.querySelector('.marks-stat-card:nth-child(4) .marks-stat-subtitle');
        if (highestScoreSubtitle) {
            highestScoreSubtitle.textContent = highestScoreStudent ? 
                `${highestScoreStudent} - ${highestScoreCourse}` : 'No data';
        }
        
        // Update lowest score card with REAL data
        const lowestScoreElement = document.querySelector('.marks-stat-card:nth-child(5) .marks-stat-value');
        if (lowestScoreElement) {
            lowestScoreElement.textContent = `${lowestScore.toFixed(1)}%`;
        }
        const lowestScoreSubtitle = document.querySelector('.marks-stat-card:nth-child(5) .marks-stat-subtitle');
        if (lowestScoreSubtitle) {
            lowestScoreSubtitle.textContent = lowestScoreStudent ? 
                `${lowestScoreStudent} - ${lowestScoreCourse}` : 'No data';
        }
        
        console.log('📈 REAL Statistics calculated:', {
            totalRecords,
            distinctStudents,
            avgScore,
            distinctionCount,
            highestScore,
            lowestScore
        });
    }
    
    resetSummaryStats() {
        this.updateElementText('totalRecords', 0);
        this.updateElementText('distinctStudents', 0);
        this.updateElementText('avgScore', '0%');
        this.updateElementText('distinctionCount', 0);
        
        // Reset highest and lowest score cards
        const highestScoreElement = document.querySelector('.marks-stat-card:nth-child(4) .marks-stat-value');
        if (highestScoreElement) {
            highestScoreElement.textContent = '0%';
        }
        const highestScoreSubtitle = document.querySelector('.marks-stat-card:nth-child(4) .marks-stat-subtitle');
        if (highestScoreSubtitle) {
            highestScoreSubtitle.textContent = 'No data';
        }
        
        const lowestScoreElement = document.querySelector('.marks-stat-card:nth-child(5) .marks-stat-value');
        if (lowestScoreElement) {
            lowestScoreElement.textContent = '0%';
        }
        const lowestScoreSubtitle = document.querySelector('.marks-stat-card:nth-child(5) .marks-stat-subtitle');
        if (lowestScoreSubtitle) {
            lowestScoreSubtitle.textContent = 'No data';
        }
    }
    
    updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            if (typeof value === 'number') {
                element.textContent = value.toLocaleString();
            } else {
                element.textContent = value;
            }
        }
    }
    
    // ==================== TABLE RENDERING ====================
    
    renderCurrentView() {
        switch (this.viewMode) {
            case 'table':
                this.renderTableView();
                break;
            case 'cards':
                this.renderCardsView();
                break;
            case 'compact':
                this.renderCompactView();
                break;
        }
        this.updateSelectedCounts();
    }
    
    renderTableView() {
        const tbody = document.querySelector('#marksTableBody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        let html = '';
        
        pageData.forEach((mark) => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeCSSClass = this.getGradeCSSClass(grade);
            const status = mark.visible_to_student ? 'published' : 'hidden';
            const statusIcon = status === 'published' ? 'fa-eye' : 'fa-eye-slash';
            const statusText = status === 'published' ? 'Visible' : 'Hidden';
            
            // ✅ FIXED: Get centre name properly - NO MORE "iuud"!
            const studentCentre = this.getCentreDisplayName(student);
            
            // Format date
            const formattedDate = mark.created_at ? this.formatDate(mark.created_at) : 'N/A';
            
            // Simple escape function inline
            const escape = (str) => {
                if (!str) return '';
                return str.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            };
            
            html += `
                <tr data-mark-id="${mark.id}">
                    <!-- Student Column (Name + Reg No combined) -->
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.875rem; flex-shrink: 0;">
                                ${this.getInitials(student.full_name || 'N/A')}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">${escape(student.full_name || 'N/A')}</div>
                                <div style="font-size: 0.75rem; color: #6b7280; font-family: monospace;">${escape(student.reg_number || 'N/A')}</div>
                            </div>
                        </div>
                    </td>
                    
                    <!-- Course Column -->
                    <td>
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">${escape(course.course_code || 'N/A')}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${escape(course.course_name || '')}</div>
                    </td>
                    
                    <!-- Centre Column - FIXED: No more "iuud"! -->
                    <td>
                        <div style="font-weight: 600; color: #1f2937;">${escape(studentCentre)}</div>
                        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${status === 'published' ? '#d1fae5' : '#f3f4f6'}; color: ${status === 'published' ? '#065f46' : '#6b7280'}; margin-top: 4px;">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </div>
                    </td>
                    
                    <!-- Score Column -->
                    <td>
                        <div style="text-align: center;">
                            <div style="font-weight: 700; color: #1f2937; font-size: 1rem;">${score}/${maxScore}</div>
                            <div style="font-size: 0.75rem; color: #6b7280; font-weight: 600;">${percentage ? percentage.toFixed(1) : '0.0'}%</div>
                        </div>
                    </td>
                    
                    <!-- Grade Column -->
                    <td>
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.75rem; ${gradeCSSClass === 'grade-distinction' ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;' : gradeCSSClass === 'grade-credit' ? 'background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;' : gradeCSSClass === 'grade-pass' ? 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;' : 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white;'}">
                            ${grade || 'FAIL'}
                        </span>
                    </td>
                    
                    <!-- Date Column -->
                    <td style="color: #6b7280; font-size: 0.875rem;">
                        ${formattedDate}
                    </td>
                    
                    <!-- Actions Column -->
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="action-btn btn-edit" data-mark-id="${mark.id}" title="Edit" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: white; color: #6b7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-view" data-mark-id="${mark.id}" title="View Details" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: white; color: #6b7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-delete" data-mark-id="${mark.id}" title="Delete" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #d1d5db; background: white; color: #6b7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // Attach event listeners to table buttons
        this.attachTableButtonListeners();
    }
    
    // ==================== HELPER METHOD FOR CENTRE NAME (FIXED) ====================
    
    getCentreDisplayName(student) {
        // ✅ FIXED: This properly displays centre names, not IDs like "iuud"
        if (!student) return 'Main Campus';
        
        // Check in order of preference for display name
        if (student.centre_display && student.centre_display.trim() !== '') {
            return student.centre_display;
        }
        if (student.centre_name && student.centre_name.trim() !== '') {
            return student.centre_name;
        }
        if (student.campus && student.campus.trim() !== '') {
            return student.campus;
        }
        if (student.location && student.location.trim() !== '') {
            return student.location;
        }
        if (student.centre && student.centre.trim() !== '') {
            // Check if it looks like an ID (all numbers or has specific pattern)
            if (/^\d+$/.test(student.centre) || student.centre.includes('_') || student.centre.length <= 5) {
                // This is likely an ID, try to get actual name
                if (this.app.centres && this.app.centres[student.centre]) {
                    return this.app.centres[student.centre];
                }
                // If we can't map it, return a generic name
                return 'Centre ' + student.centre;
            }
            // If it doesn't look like an ID, use it as is
            return student.centre;
        }
        
        return 'Main Campus'; // Default fallback
    }
    
    // ==================== CARDS VIEW (HORIZONTAL) WITH REAL DATA ====================
    
    renderCardsView() {
        const container = document.querySelector('#cardsView');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            container.innerHTML = this.getEmptyStateHTML(true);
            return;
        }
        
        let html = `
            <div class="cards-container-horizontal">
                <div class="cards-scroll-wrapper">
                    <div class="cards-grid-horizontal">
        `;
        
        pageData.forEach((mark) => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeColor = this.getGradeColor(grade);
            const status = mark.visible_to_student ? 'published' : 'hidden';
            const statusIcon = status === 'published' ? 'fa-eye' : 'fa-eye-slash';
            const statusColor = status === 'published' ? '#10b981' : '#6b7280';
            const studentInitials = this.getInitials(student.full_name || 'N/A');
            
            // ✅ FIXED: Get proper centre name, not "iuud"
            const studentCentre = this.getCentreDisplayName(student);
            
            // Escape function
            const escape = (str) => {
                if (!str) return '';
                return str.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            };
            
            html += `
                <div class="mark-card-horizontal" data-mark-id="${mark.id}">
                    <div class="card-header-horizontal">
                        <div class="student-avatar-horizontal" style="background: ${gradeColor}20; border-color: ${gradeColor};">
                            <div class="avatar-initials-horizontal" style="color: ${gradeColor};">${studentInitials}</div>
                        </div>
                        <div class="student-info-horizontal">
                            <div class="student-name-horizontal">${escape(student.full_name || 'N/A')}</div>
                            <div class="student-reg-horizontal">${escape(student.reg_number || 'N/A')}</div>
                            <div class="student-centre-horizontal" style="font-size: 0.7rem; color: #9ca3af; margin-top: 2px;">
                                <i class="fas fa-map-marker-alt"></i> ${escape(studentCentre)}
                            </div>
                        </div>
                        <div class="card-actions-horizontal">
                            <button class="card-action-btn" data-mark-id="${mark.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="card-action-btn" data-mark-id="${mark.id}" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body-horizontal">
                        <div class="course-info-horizontal">
                            <div class="course-code-horizontal">${escape(course.course_code || 'N/A')}</div>
                            <div class="course-name-horizontal">${escape(course.course_name || 'Course')}</div>
                        </div>
                        
                        <div class="score-display-horizontal">
                            <div class="score-main-horizontal">
                                <span class="score-value">${score}</span>
                                <span class="score-separator">/</span>
                                <span class="score-max">${maxScore}</span>
                            </div>
                            <div class="score-percentage" style="color: ${gradeColor};">
                                ${percentage ? percentage.toFixed(1) : '0.0'}%
                            </div>
                        </div>
                        
                        <div class="grade-display-horizontal">
                            <div class="grade-badge-horizontal" style="background: ${gradeColor};">
                                ${grade || 'N/A'}
                            </div>
                            <div class="grade-points">
                                ${mark.grade_points || 0} pts
                            </div>
                        </div>
                        
                        <div class="card-footer-horizontal">
                            <div class="assessment-info">
                                <div class="assessment-type">
                                    <i class="fas fa-tasks"></i>
                                    ${mark.assessment_type || 'Assessment'}
                                </div>
                                <div class="assessment-date">
                                    <i class="fas fa-calendar"></i>
                                    ${mark.assessment_date ? this.formatDate(mark.assessment_date) : 'N/A'}
                                </div>
                            </div>
                            <div class="status-indicator-horizontal" style="color: ${statusColor};">
                                <i class="fas ${statusIcon}"></i>
                                ${status === 'published' ? 'Visible' : 'Hidden'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Attach event listeners
        this.attachCardsViewListeners();
    }
    
    attachCardsViewListeners() {
        // Edit buttons
        document.querySelectorAll('.card-action-btn .fa-edit, .card-action-btn .fa-edit').forEach(btn => {
            btn.closest('.card-action-btn').addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.editMark(markId);
                e.stopPropagation();
            });
        });
        
        // View buttons
        document.querySelectorAll('.card-action-btn .fa-eye, .card-action-btn .fa-eye').forEach(btn => {
            btn.closest('.card-action-btn').addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.viewMarkDetails(markId);
                e.stopPropagation();
            });
        });
        
        // Card click to view details
        document.querySelectorAll('.mark-card-horizontal').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-action-btn')) {
                    const markId = card.getAttribute('data-mark-id');
                    this.viewMarkDetails(markId);
                }
            });
        });
    }
    
    attachTableButtonListeners() {
        // Edit buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.editMark(markId);
            });
        });
        
        // View buttons
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.viewMarkDetails(markId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.deleteMark(markId);
            });
        });
    }
    
    // ==================== COMPACT VIEW RENDERING ====================
    
    renderCompactView() {
        const container = document.getElementById('compactView');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            container.innerHTML = this.getEmptyStateHTML(true);
            return;
        }
        
        let html = '<div class="compact-list">';
        
        pageData.forEach((mark) => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeColor = this.getGradeColor(grade);
            const status = mark.visible_to_student ? 'published' : 'hidden';
            
            // ✅ FIXED: Get proper centre name
            const studentCentre = this.getCentreDisplayName(student);
            
            // Escape function
            const escape = (str) => {
                if (!str) return '';
                return str.toString()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            };
            
            html += `
                <div class="compact-item" data-mark-id="${mark.id}">
                    <div class="compact-header">
                        <div class="compact-avatar" style="background: ${gradeColor}20; color: ${gradeColor};">
                            ${this.getInitials(student.full_name || 'N/A')}
                        </div>
                        <div class="compact-info">
                            <div class="compact-name">${escape(student.full_name || 'N/A')}</div>
                            <div class="compact-meta">
                                <span class="compact-reg">${escape(student.reg_number || 'N/A')}</span>
                                <span class="compact-course">${escape(course.course_code || 'N/A')}</span>
                                <span class="compact-centre">${escape(studentCentre)}</span>
                                <span class="compact-status ${status}" title="${status === 'published' ? 'Visible to student' : 'Hidden from student'}">
                                    <i class="fas ${status === 'published' ? 'fa-eye' : 'fa-eye-slash'}"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="compact-body">
                        <div class="compact-score">
                            <span class="score-value">${score}/${maxScore}</span>
                            <span class="score-percentage" style="color: ${gradeColor};">(${percentage ? percentage.toFixed(1) : '0.0'}%)</span>
                        </div>
                        <div class="compact-grade" style="color: ${gradeColor};">
                            ${grade}
                        </div>
                    </div>
                    <div class="compact-actions">
                        <button class="compact-action-btn" data-mark-id="${mark.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="compact-action-btn" data-mark-id="${mark.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Add event listeners
        this.attachCompactViewListeners();
    }
    
    attachCompactViewListeners() {
        // Edit buttons
        document.querySelectorAll('.compact-action-btn .fa-edit').forEach(btn => {
            btn.closest('.compact-action-btn').addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.editMark(markId);
                e.stopPropagation();
            });
        });
        
        // View buttons
        document.querySelectorAll('.compact-action-btn .fa-eye').forEach(btn => {
            btn.closest('.compact-action-btn').addEventListener('click', (e) => {
                const markId = e.currentTarget.getAttribute('data-mark-id');
                this.viewMarkDetails(markId);
                e.stopPropagation();
            });
        });
        
        // Item click to view details
        document.querySelectorAll('.compact-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.compact-action-btn')) {
                    const markId = item.getAttribute('data-mark-id');
                    this.viewMarkDetails(markId);
                }
            });
        });
    }
    
    // ==================== BUTTON FUNCTIONS ====================
    
    async editMark(markId) {
        try {
            console.log(`✏️ Editing mark: ${markId}`);
            
            const mark = await this.db.getMarkById(markId);
            if (!mark) {
                this.showToast('Mark record not found', 'error');
                return;
            }
            
            // Populate modal with mark data
            await this.openMarksModalForEdit(mark);
            
            this.showToast('Edit mode activated', 'info');
            
        } catch (error) {
            console.error('❌ Error editing mark:', error);
            this.showToast('Error loading mark data', 'error');
        }
    }
    
    async openMarksModalForEdit(mark) {
        await this.populateStudentDropdown();
        await this.populateCourseDropdown();
        
        // Populate form fields
        document.getElementById('marksStudent').value = mark.student_id;
        document.getElementById('marksCourse').value = mark.course_id;
        document.getElementById('marksScore').value = mark.score;
        document.getElementById('marksMaxScore').value = mark.max_score;
        document.getElementById('assessmentType').value = mark.assessment_type;
        
        if (mark.assessment_date) {
            document.getElementById('assessmentDate').value = mark.assessment_date;
        }
        
        // Set status radio buttons
        if (mark.visible_to_student === false) {
            document.getElementById('statusDraft').checked = true;
            document.getElementById('statusPublished').checked = false;
        } else {
            document.getElementById('statusPublished').checked = true;
            document.getElementById('statusDraft').checked = false;
        }
        
        // Store the mark ID for update
        this.existingMarksId = mark.id;
        document.getElementById('existingMarksId').value = mark.id;
        document.getElementById('isDuplicate').value = 'true';
        
        // Update button text
        const submitBtn = document.getElementById('saveMarksBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Marks';
            submitBtn.className = 'btn btn-warning';
        }
        
        // Update grade display
        this.updateMarksGradeDisplay();
        
        // Open modal
        this.openModal('marksModal');
    }
    
    async viewMarkDetails(markId) {
        try {
            console.log(`👁️ Viewing mark details: ${markId}`);
            
            const mark = await this.db.getMarkById(markId);
            if (!mark) {
                this.showToast('Mark record not found', 'error');
                return;
            }
            
            console.log('📄 Mark data:', mark);
            
            // Get student and course details
            const student = await this.db.getStudent(mark.student_id);
            const course = await this.db.getCourse(mark.course_id);
            
            // Create details modal
            this.showMarkDetailsModal(mark, student, course);
            
        } catch (error) {
            console.error('❌ Error viewing mark details:', error);
            this.showToast('Error loading mark details', 'error');
        }
    }
    
    showMarkDetailsModal(mark, student, course) {
        // ✅ FIXED: Get proper centre name for details modal
        const studentCentre = this.getCentreDisplayName(student);
        
        const modalHtml = `
            <div class="modal" id="markDetailsModal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-info-circle"></i> Mark Details</h3>
                        <span class="close" onclick="document.getElementById('markDetailsModal').style.display='none'">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="details-grid">
                            <div class="detail-section">
                                <h4><i class="fas fa-user-graduate"></i> Student Information</h4>
                                <div class="detail-item">
                                    <span class="label">Name:</span>
                                    <span class="value">${student?.full_name || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Registration Number:</span>
                                    <span class="value">${student?.reg_number || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Centre:</span>
                                    <span class="value">${studentCentre}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Program:</span>
                                    <span class="value">${student?.program_name || 'N/A'}</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-book"></i> Course Information</h4>
                                <div class="detail-item">
                                    <span class="label">Course Code:</span>
                                    <span class="value">${course?.course_code || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Course Name:</span>
                                    <span class="value">${course?.course_name || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Credits:</span>
                                    <span class="value">${course?.credits || 'N/A'}</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-chart-bar"></i> Assessment Details</h4>
                                <div class="detail-item">
                                    <span class="label">Assessment Type:</span>
                                    <span class="value">${mark.assessment_name || mark.assessment_type}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Date:</span>
                                    <span class="value">${this.formatDate(mark.assessment_date)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Score:</span>
                                    <span class="value"><strong>${mark.score}/${mark.max_score}</strong></span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Percentage:</span>
                                    <span class="value"><strong>${mark.percentage}%</strong></span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Grade:</span>
                                    <span class="value grade-badge ${this.getGradeCSSClass(mark.grade)}">${mark.grade}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Grade Points:</span>
                                    <span class="value">${mark.grade_points || 0}</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-history"></i> Record Information</h4>
                                <div class="detail-item">
                                    <span class="label">Entered By:</span>
                                    <span class="value">${mark.entered_by || 'System'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Entry Date:</span>
                                    <span class="value">${this.formatDate(mark.created_at)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Last Updated:</span>
                                    <span class="value">${this.formatDate(mark.updated_at)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Status:</span>
                                    <span class="value status-indicator ${mark.visible_to_student ? 'published' : 'hidden'}">
                                        ${mark.visible_to_student ? 'Published to Student' : 'Hidden from Student'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" 
                                onclick="document.getElementById('markDetailsModal').style.display='none'">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button type="button" class="btn btn-primary" 
                                onclick="window.app.marks.editMark('${mark.id}')">
                            <i class="fas fa-edit"></i> Edit This Record
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('markDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to DOM
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
        
        // Add styles for details modal
        this.addDetailsModalStyles();
    }
    
    addDetailsModalStyles() {
        const styleId = 'mark-details-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .details-grid {
                display: grid;
                gap: 20px;
            }
            
            .detail-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                border-left: 4px solid #3b82f6;
            }
            
            .detail-section h4 {
                margin-top: 0;
                margin-bottom: 12px;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 4px 0;
            }
            
            .detail-item .label {
                font-weight: 600;
                color: #4b5563;
            }
            
            .detail-item .value {
                color: #1f2937;
            }
            
            .grade-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.9em;
            }
            
            .status-indicator {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: 600;
            }
            
            .status-indicator.published {
                background: #d1fae5;
                color: #065f46;
            }
            
            .status-indicator.hidden {
                background: #f3f4f6;
                color: #6b7280;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    async deleteMark(markId) {
        if (!confirm('Are you sure you want to delete this mark record? This action cannot be undone.')) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting mark: ${markId}`);
            
            await this.db.deleteMark(markId);
            this.showToast('✅ Mark record deleted successfully', 'success');
            
            // Remove from selected set if present
            this.selectedMarks.delete(markId);
            
            // Refresh table
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error deleting mark:', error);
            this.showToast('Error deleting mark record', 'error');
        }
    }
    
    // ==================== GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
            return 'FAIL';
        }
        
        const cappedPercentage = Math.min(percentage, 100);
        
        if (cappedPercentage >= 85) return 'DISTINCTION';
        if (cappedPercentage >= 70) return 'CREDIT';
        if (cappedPercentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
        return gradePoints[upperGrade] || 0.0;
    }
    
    getGradeDescription(grade) {
        const descriptions = {
            'DISTINCTION': 'Excellent performance',
            'CREDIT': 'Good performance',
            'PASS': 'Satisfactory performance',
            'FAIL': 'Needs improvement'
        };
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
        return descriptions[upperGrade] || 'No description available';
    }
    
    getGradeCSSClass(grade) {
        const classes = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
        return classes[upperGrade] || 'grade-default';
    }
    
    updateMarksGradeDisplay() {
        try {
            const scoreInput = document.getElementById('marksScore');
            const maxScoreInput = document.getElementById('marksMaxScore');
            const percentageDisplay = document.getElementById('marksPercentage');
            const gradeBadge = document.getElementById('gradeBadge');
            
            if (!scoreInput || !gradeBadge || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetMarksGradeDisplay(gradeBadge, percentageDisplay);
                return;
            }
            
            const validScore = Math.min(score, maxScore);
            if (score !== validScore) {
                scoreInput.value = validScore;
            }
            
            const percentage = (validScore / maxScore) * 100;
            const cappedPercentage = Math.min(percentage, 100);
            
            const grade = this.calculateGrade(cappedPercentage);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${cappedPercentage.toFixed(2)}%`;
            }
            
            // Update grade badge with new HTML structure
            gradeBadge.textContent = grade;
            gradeBadge.className = gradeCSSClass;
            
        } catch (error) {
            console.error('Error updating grade display:', error);
        }
    }
    
    resetMarksGradeDisplay(gradeBadge, percentageDisplay) {
        if (gradeBadge) {
            gradeBadge.textContent = '--';
            gradeBadge.className = 'grade-default';
        }
        
        if (percentageDisplay) {
            percentageDisplay.textContent = '0.00%';
        }
    }
    
    // ==================== MODAL POPULATION ====================
    
    async openMarksModal() {
        console.log('📝 Opening marks modal...');
        
        try {
            // Reset the form first
            const form = document.getElementById('marksForm');
            if (form) {
                form.reset();
                
                // Reset specific fields
                const maxScoreInput = document.getElementById('marksMaxScore');
                if (maxScoreInput) maxScoreInput.value = '100';
                
                const assessmentType = document.getElementById('assessmentType');
                if (assessmentType) assessmentType.value = 'exam';
                
                // Set today's date
                const dateField = document.getElementById('assessmentDate');
                if (dateField) {
                    const today = new Date();
                    dateField.value = today.toISOString().split('T')[0];
                }
                
                // Set default status to published
                const statusPublished = document.getElementById('statusPublished');
                const statusDraft = document.getElementById('statusDraft');
                if (statusPublished) statusPublished.checked = true;
                if (statusDraft) statusDraft.checked = false;
                
                // Reset grade display
                this.resetMarksGradeDisplay(
                    document.getElementById('gradeBadge'),
                    document.getElementById('marksPercentage')
                );
                
                // Reset duplicate flags
                this.existingMarksId = null;
                this.isDuplicateEntry = false;
                this.currentMarksData = null;
                this.hideDuplicateWarning();
                this.hideDuplicateChecking();
            }
            
            // Populate dropdowns
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            // Reset hidden fields
            document.getElementById('isDuplicate').value = 'false';
            document.getElementById('existingMarksId').value = '';
            
            // Reset save button
            const submitBtn = document.getElementById('saveMarksBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Marks';
                submitBtn.disabled = false;
                submitBtn.className = 'btn btn-primary';
                submitBtn.style.background = '#3b82f6';
            }
            
            // Open the modal
            this.openModal('marksModal');
            
            // Clear any field errors
            this.clearFieldErrors();
            
            console.log('✅ Marks modal opened successfully');
            
        } catch (error) {
            console.error('❌ Error opening marks modal:', error);
            this.showToast('Error opening marks form', 'error');
        }
    }
    
    async populateStudentDropdown() {
        try {
            const studentSelect = document.getElementById('marksStudent');
            if (!studentSelect) return;
            
            // Clear existing options except the first one
            while (studentSelect.options.length > 1) {
                studentSelect.remove(1);
            }
            
            // Get students from database
            const students = await this.db.getStudents();
            
            // Add options
            if (students && students.length > 0) {
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    
                    // ✅ Include centre name in display
                    const centreName = this.getCentreDisplayName(student);
                    option.textContent = `${student.full_name} (${student.reg_number}) - ${centreName}`;
                    
                    // Add data attributes for additional info
                    option.dataset.regNumber = student.reg_number;
                    option.dataset.centre = centreName;
                    option.dataset.program = student.program_name || '';
                    
                    studentSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No students found';
                option.disabled = true;
                studentSelect.appendChild(option);
            }
            
        } catch (error) {
            console.error('❌ Error populating student dropdown:', error);
        }
    }
    
    async populateCourseDropdown() {
        try {
            const courseSelect = document.getElementById('marksCourse');
            if (!courseSelect) return;
            
            // Clear existing options except the first one
            while (courseSelect.options.length > 1) {
                courseSelect.remove(1);
            }
            
            // Get courses from database
            const courses = await this.db.getCourses();
            
            // Add options
            if (courses && courses.length > 0) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.course_name}`;
                    
                    // Add data attributes
                    option.dataset.code = course.course_code;
                    option.dataset.name = course.course_name;
                    option.dataset.credits = course.credits || 0;
                    
                    courseSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No courses found';
                option.disabled = true;
                courseSelect.appendChild(option);
            }
            
        } catch (error) {
            console.error('❌ Error populating course dropdown:', error);
        }
    }
    
    async populateFilterDropdowns(marks) {
        if (!marks || !Array.isArray(marks)) return;
        
        try {
            // Populate grade filter
            const gradeFilter = document.getElementById('gradeFilter');
            if (gradeFilter) {
                const grades = [...new Set(marks.map(m => m.grade).filter(Boolean))].sort();
                this.populateSelectOptions(gradeFilter, grades);
            }
            
            // Populate course filter
            const courseFilter = document.getElementById('courseFilter');
            if (courseFilter) {
                const courses = [...new Set(marks.map(m => m.courses?.course_name).filter(Boolean))].sort();
                this.populateSelectOptions(courseFilter, courses);
            }
            
            // Populate date filter
            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter) {
                const dates = [...new Set(marks.map(m => m.created_at?.split('T')[0]).filter(Boolean))].sort().reverse();
                this.populateSelectOptions(dateFilter, dates);
            }
            
            // Populate student filter
            const studentFilter = document.getElementById('studentFilter');
            if (studentFilter) {
                const students = [...new Set(marks.map(m => m.students?.full_name).filter(Boolean))].sort();
                this.populateSelectOptions(studentFilter, students);
            }
            
        } catch (error) {
            console.error('❌ Error populating filter dropdowns:', error);
        }
    }
    
    populateSelectOptions(selectElement, options) {
        // Clear existing options except the first one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElement.appendChild(optionElement);
        });
    }
    
    // ==================== FILTERING AND SEARCH ====================
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    filterTable() {
        try {
            console.log('🔍 Filtering marks table...');
            
            // Get filter values
            const searchTerm = document.getElementById('marksSearch')?.value.toLowerCase() || '';
            const gradeFilter = document.getElementById('gradeFilter')?.value || '';
            const courseFilter = document.getElementById('courseFilter')?.value || '';
            const dateFilter = document.getElementById('dateFilter')?.value || '';
            const studentFilter = document.getElementById('studentFilter')?.value || '';
            
            // Update filters object
            this.filters = {
                search: searchTerm,
                grade: gradeFilter,
                course: courseFilter,
                date: dateFilter,
                student: studentFilter
            };
            
            // Apply filters
            this.applyFilters();
            
            // Reset to first page
            this.currentPage = 1;
            
            // Render the current view
            this.renderCurrentView();
            
            // Update pagination
            this.updatePagination();
            
        } catch (error) {
            console.error('❌ Error filtering table:', error);
        }
    }
    
    applyFilters() {
        if (!this.filteredData || !Array.isArray(this.filteredData)) {
            this.filteredData = [];
            return;
        }
        
        const filtered = this.filteredData.filter(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const matches = 
                    (student.full_name?.toLowerCase() || '').includes(searchLower) ||
                    (student.reg_number?.toLowerCase() || '').includes(searchLower) ||
                    (course.course_code?.toLowerCase() || '').includes(searchLower) ||
                    (course.course_name?.toLowerCase() || '').includes(searchLower) ||
                    (mark.grade?.toLowerCase() || '').includes(searchLower);
                
                if (!matches) return false;
            }
            
            // Grade filter
            if (this.filters.grade && mark.grade !== this.filters.grade) {
                return false;
            }
            
            // Course filter
            if (this.filters.course && course.course_name !== this.filters.course) {
                return false;
            }
            
            // Date filter
            if (this.filters.date) {
                const markDate = mark.created_at?.split('T')[0];
                if (markDate !== this.filters.date) {
                    return false;
                }
            }
            
            // Student filter
            if (this.filters.student && student.full_name !== this.filters.student) {
                return false;
            }
            
            return true;
        });
        
        this.filteredData = filtered;
    }
    
    clearFilters() {
        console.log('🧹 Clearing filters...');
        
        // Reset filter inputs
        const searchInput = document.getElementById('marksSearch');
        if (searchInput) searchInput.value = '';
        
        const filters = ['gradeFilter', 'courseFilter', 'dateFilter', 'studentFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) filter.value = '';
        });
        
        // Reset filter object
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        // Reload table
        this.loadMarksTable();
        
        this.showToast('Filters cleared', 'info');
    }
    
    // ==================== PAGINATION ====================
    
    changePageSize() {
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            this.pageSize = parseInt(pageSizeSelect.value);
            this.currentPage = 1;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    updatePagination() {
        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        
        const startRow = Math.min((this.currentPage - 1) * this.pageSize + 1, totalRows);
        const endRow = Math.min(this.currentPage * this.pageSize, totalRows);
        
        // Update pagination info
        const startElement = document.getElementById('startRow');
        const endElement = document.getElementById('endRow');
        const totalElement = document.getElementById('totalRows');
        
        if (startElement) startElement.textContent = startRow;
        if (endElement) endElement.textContent = endRow;
        if (totalElement) totalElement.textContent = totalRows;
        
        // Update page buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
        
        // Update page numbers
        this.updatePageNumbers(totalPages);
    }
    
    updatePageNumbers(totalPages) {
        const pageNumbers = document.getElementById('pageNumbers');
        if (!pageNumbers) return;
        
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                            onclick="window.app.marks.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="page-ellipsis">...</span>';
            }
        }
        pageNumbers.innerHTML = html;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    // ==================== VIEW MANAGEMENT ====================
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.currentPage = 1;
        
        // Update active button
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === mode);
        });
        
        // Show/hide views
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        const compactView = document.getElementById('compactView');
        
        if (tableView) tableView.style.display = mode === 'table' ? 'block' : 'none';
        if (cardsView) cardsView.style.display = mode === 'cards' ? 'block' : 'none';
        if (compactView) compactView.style.display = mode === 'compact' ? 'block' : 'none';
        
        this.renderCurrentView();
        this.updatePagination();
    }
    
    // ==================== UTILITY METHODS ====================
    
    getInitials(name) {
        if (!name || name === 'N/A') return 'NA';
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }
    
    getEmptyStateHTML(isCard = false) {
        const content = `
            <i class="fas fa-chart-bar fa-3x"></i>
            <h3>No Academic Records Found</h3>
            <p>${this.filteredData.length === 0 ? 'Get started by adding your first academic record' : 'No records match your filters'}</p>
            ${this.filteredData.length === 0 ? `
                <button class="btn-primary" onclick="window.app.marks.openMarksModal()">
                    <i class="fas fa-plus"></i> Add First Record
                </button>
            ` : `
                <button class="btn-secondary" onclick="window.app.marks.clearFilters()">
                    <i class="fas fa-filter"></i> Clear Filters
                </button>
            `}
        `;
        
        if (isCard) {
            return `<div class="empty-state-cards">${content}</div>`;
        }
        
        return `
            <tr class="empty-state-row">
                <td colspan="7">
                    <div class="empty-state">${content}</div>
                </td>
            </tr>
        `;
    }
    
    showErrorState(error) {
        const tbody = document.querySelector('#marksTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p>Error loading academic records</p>
                        <small class="d-block mt-1">${error.message || 'Unknown error'}</small>
                        <button class="btn btn-secondary mt-2" onclick="window.app.marks.loadMarksTable()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    updateSelectedCounts() {
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Showing ${Math.min(this.currentPage * this.pageSize, this.filteredData.length)} of ${this.filteredData.length} records`;
        }
    }
    
    showToast(message, type = 'info') {
        try {
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(container);
            }
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.style.cssText = `
                background: ${this.getToastColor(type)};
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            `;
            
            const icons = {
                'success': 'fa-check-circle',
                'error': 'fa-exclamation-circle',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size: 18px;"></i>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            container.appendChild(toast);
            
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
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    getToastColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || '#6b7280';
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MarksManager = MarksManager;
}
