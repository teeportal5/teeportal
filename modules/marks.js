// modules/marks.js - COMPLETE WITH FULL FUNCTIONALITY
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
        setTimeout(() => this.initEventListeners(), 100);
    }
    
    // ==================== INITIALIZATION ====================
    
    initEventListeners() {
        console.log('🎯 Initializing MarksManager event listeners');
        // Add CSS styles
    this.addDuplicateCheckingStyles();
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
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const mode = btn.textContent.toLowerCase().includes('table') ? 'table' :
                            btn.textContent.toLowerCase().includes('card') ? 'cards' :
                            'compact';
                this.setViewMode(mode);
            });
        });
        
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
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', () => this.toggleSelectAll());
        }
        
        // Clear filters button
        const clearFiltersBtn = document.querySelector('.btn-outline[onclick*="clearFilters"]');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearFilters();
            });
        }
        
        // Export button
        const exportBtn = document.querySelector('[onclick*="exportMarks"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportMarks();
            });
        }
        
        // Bulk edit button
        const bulkEditBtn = document.querySelector('[onclick*="bulkEdit"]');
        if (bulkEditBtn) {
            bulkEditBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.bulkEdit();
            });
        }
        
        // Delete selected button
        const deleteSelectedBtn = document.querySelector('[onclick*="deleteSelected"]');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteSelected();
            });
        }
        
        // Export selected button
        const exportSelectedBtn = document.querySelector('[onclick*="exportSelected"]');
        if (exportSelectedBtn) {
            exportSelectedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportSelected();
            });
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
    
    // Check if already saving
    if (this.isSaving) {
        console.log('⚠️ Already saving, ignoring duplicate click');
        return false;
    }
    
    // Set saving flag
    this.isSaving = true;
    
    // Disable submit button to prevent multiple clicks
    const submitBtn = document.getElementById('saveMarksBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        console.log('📝 Handling single marks submission...');
        
        // Get form data
        const formData = this.getMarksFormData();
        
        // Validate form data
        if (!this.validateMarksForm(formData)) {
            this.resetSaveButton(submitBtn, originalText);
            this.isSaving = false;
            return false;
        }
        
        // Check if this is an overwrite operation (from duplicate warning)
        const isDuplicate = document.getElementById('isDuplicate')?.value === 'true';
        const existingId = document.getElementById('existingMarksId')?.value;
        
        let result;
        
        if (isDuplicate && existingId) {
            // Overwrite existing marks (user confirmed from duplicate warning)
            console.log(`🔄 Overwriting existing marks ID: ${existingId}`);
            result = await this.db.updateMark(existingId, formData);
            this.showToast('✅ Marks updated successfully!', 'success');
        } else {
            // Save new marks - SINGLE SAVE
            // NO DUPLICATE CHECK HERE - already done in real-time
            console.log('💾 Saving new marks (single save)...');
            result = await this.db.addMark(formData);
            this.showToast('✅ Marks saved successfully!', 'success');
        }
        
        // Close modal and refresh table
        this.closeModal('marksModal');
        await this.loadMarksTable();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        this.showToast(`Error: ${error.message || 'Failed to save marks'}`, 'error');
        return false;
        
    } finally {
        // Always reset saving flag
        this.isSaving = false;
        
        // Reset button state
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
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
        
        /* Real-time validation */
        .form-control:invalid {
            border-color: #dc3545;
        }
        
        .form-control:valid {
            border-color: #28a745;
        }
    `;
    
    document.head.appendChild(style);
}
    /**
     * Reset save button to original state
     */
    resetSaveButton(submitBtn, originalText) {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
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
        const studentSelect = document.getElementById('marksStudent');
        const courseSelect = document.getElementById('marksCourse');
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('marksMaxScore');
        const assessmentTypeSelect = document.getElementById('assessmentType');
        const assessmentDateInput = document.getElementById('assessmentDate');
        
        const studentId = studentSelect?.value;
        const courseId = courseSelect?.value;
        const score = parseFloat(scoreInput?.value) || 0;
        const maxScore = parseFloat(maxScoreInput?.value) || 100;
        const assessmentType = assessmentTypeSelect?.value || 'exam';
        const assessmentDate = assessmentDateInput?.value || new Date().toISOString().split('T')[0];
        
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
        
        let percentage = 0;
        if (maxScore > 0) {
            percentage = (score / maxScore) * 100;
        }
        percentage = parseFloat(percentage.toFixed(2));
        
        const grade = this.calculateGrade(percentage);
        const gradePoints = this.getGradePoints(grade);
        
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
             visible_to_student: visibleToStudent,
            entered_by: this.app.user?.id || 'system',
            assessment_date: assessmentDate
        };
    }
    
    validateMarksForm(formData) {
        if (!formData.student_id) {
            this.showToast('Please select a student', 'error');
            return false;
        }
        
        if (!formData.course_id) {
            this.showToast('Please select a course', 'error');
            return false;
        }
        
        if (formData.score < 0) {
            this.showToast('Score cannot be negative', 'error');
            return false;
        }
        
        if (formData.max_score <= 0) {
            this.showToast('Maximum score must be greater than 0', 'error');
            return false;
        }
        
        if (formData.score > formData.max_score) {
            this.showToast(`Score cannot exceed maximum score of ${formData.max_score}`, 'error');
            return false;
        }
        
        return true;
    }
    
    // ==================== CORE DATA LOADING ====================
    
    async loadMarksTable() {
        try {
            console.log('📊 Loading marks table...');
            const marks = await this.db.getMarksTableData();
            this.filteredData = marks || [];
            
            this.updateSummaryStats(marks);
            this.updateDashboardStatistics(marks);
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
            const isSelected = this.selectedMarks.has(mark.id);
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
            
            const escapeHTML = (str) => {
                if (!str) return '';
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };
            
            html += `
                <tr data-mark-id="${mark.id}" class="${isSelected ? 'selected' : ''}">
                    <td class="select-col">
                        <input type="checkbox" 
                               ${isSelected ? 'checked' : ''}
                               onchange="window.app.marks.toggleSelection('${mark.id}')">
                    </td>
                    <td class="student-col">
                        <div class="student-cell">
                            <div class="student-avatar-small">
                                ${this.getInitials(student.full_name || 'N/A')}
                            </div>
                            <div class="student-details">
                                <div class="student-name">${escapeHTML(student.full_name || 'N/A')}</div>
                                <div class="student-id">${escapeHTML(student.reg_number || 'N/A')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="course-col">
                        <div class="course-code">${escapeHTML(course.course_code || 'N/A')}</div>
                        <div class="course-name">${escapeHTML(course.course_name || '')}</div>
                    </td>
                    <td class="assessment-col">
                        <div class="assessment-type">${escapeHTML(mark.assessment_type || 'N/A')}</div>
                        <div class="assessment-name">${escapeHTML(mark.assessment_name || '')}</div>
                    </td>
                    <td class="score-col">
                        <div class="score-display">
                            <div class="score-value">${score}/${maxScore}</div>
                            <div class="score-percentage">${percentage ? percentage.toFixed(1) : '0.0'}%</div>
                        </div>
                    </td>
                    <td class="grade-col">
                        <span class="grade-badge-table ${gradeCSSClass}" 
                              title="${this.getGradeDescription(grade)}">
                            ${grade || 'FAIL'}
                        </span>
                    </td>
                    <td class="date-col">
                        ${mark.created_at ? this.formatDate(mark.created_at) : 'N/A'}
                    </td>
                    <td class="status-col">
                        <span class="status-indicator ${status}">
                            <i class="fas fa-${status === 'published' ? 'eye' : 'eye-slash'}"></i>
                            ${status}
                        </span>
                    </td>
                    <td class="actions-col">
                        <div class="table-actions">
                            <button class="action-btn btn-edit" data-mark-id="${mark.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-view" data-mark-id="${mark.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-delete" data-mark-id="${mark.id}" title="Delete">
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
    
    // ==================== BUTTON FUNCTIONS ====================
    
    async editMark(markId) {
        try {
            console.log(`✏️ Editing mark: ${markId}`);
            
            const mark = await this.db.getMark(markId);
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
            
            const mark = await this.db.getMark(markId);
            if (!mark) {
                this.showToast('Mark record not found', 'error');
                return;
            }
            
            // Get student and course details
            const [student, course] = await Promise.all([
                this.db.getStudent(mark.student_id),
                this.db.getCourse(mark.course_id)
            ]);
            
            // Create details modal
            this.showMarkDetailsModal(mark, student, course);
            
        } catch (error) {
            console.error('❌ Error viewing mark details:', error);
            this.showToast('Error loading mark details', 'error');
        }
    }
    
    showMarkDetailsModal(mark, student, course) {
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
    
    // ==================== BULK ACTIONS ====================
    
    async deleteSelected() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to delete', 'warning');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete ${this.selectedMarks.size} selected records? This action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting ${this.selectedMarks.size} selected marks...`);
            
            const deletePromises = Array.from(this.selectedMarks).map(markId => 
                this.db.deleteMark(markId)
            );
            
            await Promise.all(deletePromises);
            
            this.showToast(`✅ ${this.selectedMarks.size} records deleted successfully`, 'success');
            
            // Clear selection
            this.selectedMarks.clear();
            
            // Refresh table
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error deleting selected marks:', error);
            this.showToast('Error deleting selected records', 'error');
        }
    }
    
    async exportSelected() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to export', 'warning');
            return;
        }
        
        try {
            console.log(`📤 Exporting ${this.selectedMarks.size} selected marks...`);
            
            // Get selected marks data
            const marks = await Promise.all(
                Array.from(this.selectedMarks).map(markId => 
                    this.db.getMark(markId)
                )
            );
            
            // Filter out null values
            const validMarks = marks.filter(mark => mark !== null);
            
            if (validMarks.length === 0) {
                this.showToast('No valid records to export', 'warning');
                return;
            }
            
            // Get student and course details
            const enhancedMarks = await Promise.all(
                validMarks.map(async (mark) => {
                    const [student, course] = await Promise.all([
                        this.db.getStudent(mark.student_id),
                        this.db.getCourse(mark.course_id)
                    ]);
                    
                    return {
                        'Student Name': student?.full_name || 'N/A',
                        'Registration Number': student?.reg_number || 'N/A',
                        'Course Code': course?.course_code || 'N/A',
                        'Course Name': course?.course_name || 'N/A',
                        'Assessment Type': mark.assessment_name || mark.assessment_type,
                        'Score': `${mark.score}/${mark.max_score}`,
                        'Percentage': `${mark.percentage}%`,
                        'Grade': mark.grade,
                        'Grade Points': mark.grade_points || 0,
                        'Assessment Date': mark.assessment_date ? new Date(mark.assessment_date).toLocaleDateString() : 'N/A',
                        'Entered By': mark.entered_by || 'System',
                        'Entry Date': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : 'N/A'
                    };
                })
            );
            
            // Export to CSV
            this.exportToCSV(enhancedMarks, `selected-marks-${new Date().toISOString().split('T')[0]}`);
            
            this.showToast(`✅ Exported ${validMarks.length} records to CSV`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting selected marks:', error);
            this.showToast('Error exporting selected records', 'error');
        }
    }
    
    async exportMarks() {
        try {
            console.log('📤 Exporting all marks...');
            
            const marks = await this.db.getMarksTableData();
            
            if (!marks || marks.length === 0) {
                this.showToast('No records to export', 'warning');
                return;
            }
            
            // Get enhanced data
            const enhancedMarks = await Promise.all(
                marks.map(async (mark) => {
                    const student = mark.students || {};
                    const course = mark.courses || {};
                    
                    return {
                        'Student Name': student.full_name || 'N/A',
                        'Registration Number': student.reg_number || 'N/A',
                        'Course Code': course.course_code || 'N/A',
                        'Course Name': course.course_name || 'N/A',
                        'Assessment Type': mark.assessment_name || mark.assessment_type,
                        'Score': `${mark.score}/${mark.max_score}`,
                        'Percentage': `${mark.percentage}%`,
                        'Grade': mark.grade,
                        'Grade Points': mark.grade_points || 0,
                        'Assessment Date': mark.assessment_date ? new Date(mark.assessment_date).toLocaleDateString() : 'N/A',
                        'Entered By': mark.entered_by || 'System',
                        'Entry Date': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : 'N/A',
                        'Status': mark.visible_to_student ? 'Published' : 'Hidden'
                    };
                })
            );
            
            // Export to CSV
            this.exportToCSV(enhancedMarks, `all-marks-${new Date().toISOString().split('T')[0]}`);
            
            this.showToast(`✅ Exported ${marks.length} records to CSV`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting marks:', error);
            this.showToast('Error exporting records', 'error');
        }
    }
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    bulkEdit() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to edit', 'warning');
            return;
        }
        
        this.showToast('Bulk edit feature coming soon!', 'info');
        console.log(`⚙️ Bulk editing ${this.selectedMarks.size} marks...`);
    }
    
    // ==================== TABLE SELECTION ====================
    
    toggleSelection(markId) {
        if (this.selectedMarks.has(markId)) {
            this.selectedMarks.delete(markId);
        } else {
            this.selectedMarks.add(markId);
        }
        
        const element = document.querySelector(`[data-mark-id="${markId}"]`);
        if (element) {
            element.classList.toggle('selected');
        }
        
        this.updateSelectedActions();
    }
    
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        if (!selectAll) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (selectAll.checked) {
            pageData.forEach(mark => this.selectedMarks.add(mark.id));
        } else {
            pageData.forEach(mark => this.selectedMarks.delete(mark.id));
        }
        
        this.renderCurrentView();
        this.updateSelectedActions();
    }
    
    updateSelectedActions() {
        const selectedCount = this.selectedMarks.size;
        const selectedActions = document.getElementById('selectedActions');
        const selectedCountElement = document.getElementById('selectedCount');
        
        if (selectedActions && selectedCountElement) {
            if (selectedCount > 0) {
                selectedActions.style.display = 'flex';
                selectedCountElement.textContent = selectedCount;
            } else {
                selectedActions.style.display = 'none';
            }
        }
    }
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} records`;
        }
    }
    
    // ==================== MODAL POPULATION ====================
    
    async openMarksModal() {
        try {
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            const dateField = document.getElementById('assessmentDate');
            if (dateField) {
                dateField.value = new Date().toISOString().split('T')[0];
            }
            
            const maxScoreField = document.getElementById('marksMaxScore');
            if (maxScoreField) {
                maxScoreField.value = 100;
            }
            
            this.setupMarksModalListeners();
            this.openModal('marksModal');
            this.updateMarksGradeDisplay();
            
        } catch (error) {
            console.error('Error opening marks modal:', error);
            this.showToast('Error opening form', 'error');
        }
    }
    
    async populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        try {
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select student...</option>';
            
            students.forEach(student => {
                if (student.status === 'active') {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.registration_number} - ${student.name}`;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error populating student dropdown:', error);
            select.innerHTML = '<option value="">Error loading students</option>';
        }
    }
    
    async populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        try {
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => !c.status || c.status === 'active');
            
            select.innerHTML = '<option value="">Select course...</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.code} - ${course.name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
            select.innerHTML = '<option value="">Error loading courses</option>';
        }
    }
    
    setupMarksModalListeners() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('marksMaxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => {
                const maxScore = parseFloat(maxScoreInput?.value) || 100;
                this.validateScoreInput(scoreInput, maxScore);
                this.updateMarksGradeDisplay();
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                const maxScore = this.validateMaxScoreInput(maxScoreInput);
                const scoreInput = document.getElementById('marksScore');
                if (scoreInput) {
                    this.validateScoreInput(scoreInput, maxScore);
                }
                this.updateMarksGradeDisplay();
            });
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
    resetMarksGradeDisplay(gradeBadge, percentageDisplay) {
        if (gradeBadge) {
            gradeBadge.innerHTML = '<span>Enter score to see grade</span>';
            gradeBadge.className = 'grade-badge';
            gradeBadge.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.value = '0.00%';
        }
    }
    
    validateScoreInput(inputElement, maxScore) {
        const value = parseFloat(inputElement.value);
        
        if (isNaN(value)) {
            inputElement.value = '';
            return 0;
        }
        
        if (value < 0) {
            inputElement.value = 0;
            return 0;
        }
        
        if (maxScore && value > maxScore) {
            inputElement.value = maxScore;
            this.showToast(`Maximum score is ${maxScore}`, 'info');
            return maxScore;
        }
        
        return value;
    }
    
    validateMaxScoreInput(inputElement) {
        const value = parseFloat(inputElement.value);
        
        if (isNaN(value) || value <= 0) {
            inputElement.value = 100;
            return 100;
        }
        
        return value;
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
                <td colspan="9">
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
                    <td colspan="9" class="error-state">
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
    
    // ==================== FILTERING & PAGINATION ====================
    
    async populateFilterDropdowns(marks) {
        try {
            const courseFilter = document.getElementById('courseFilter');
            if (courseFilter) {
                const courses = [...new Set(marks.map(m => m.courses?.course_name).filter(Boolean))];
                courseFilter.innerHTML = '<option value="">All Courses</option>';
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course;
                    option.textContent = course;
                    courseFilter.appendChild(option);
                });
            }
            
            const studentFilter = document.getElementById('studentFilter');
            if (studentFilter) {
                const students = [...new Set(marks.map(m => m.students?.full_name).filter(Boolean))];
                studentFilter.innerHTML = '<option value="">All Students</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student;
                    option.textContent = student;
                    studentFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error populating filter dropdowns:', error);
        }
    }
    
    filterTable() {
        const searchInput = document.getElementById('marksSearch');
        const gradeFilter = document.getElementById('gradeFilter');
        const courseFilter = document.getElementById('courseFilter');
        const dateFilter = document.getElementById('dateFilter');
        const studentFilter = document.getElementById('studentFilter');
        
        this.filters = {
            search: searchInput?.value || '',
            grade: gradeFilter?.value || '',
            course: courseFilter?.value || '',
            date: dateFilter?.value || '',
            student: studentFilter?.value || ''
        };
        
        this.applyFilters();
        this.currentPage = 1;
        this.renderCurrentView();
        this.updatePagination();
        this.updateSummaryStats(this.filteredData);
    }
    
    applyFilters() {
        if (!Array.isArray(this.filteredData)) {
            this.filteredData = [];
            return;
        }
        
        let filtered = [...this.filteredData];
        
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(mark => {
                const studentName = mark.students?.full_name?.toLowerCase() || '';
                const studentId = mark.students?.reg_number?.toLowerCase() || '';
                const courseName = mark.courses?.course_name?.toLowerCase() || '';
                const courseCode = mark.courses?.course_code?.toLowerCase() || '';
                const assessment = mark.assessment_type?.toLowerCase() || '';
                const grade = mark.grade?.toLowerCase() || '';
                
                return studentName.includes(searchTerm) ||
                       studentId.includes(searchTerm) ||
                       courseName.includes(searchTerm) ||
                       courseCode.includes(searchTerm) ||
                       assessment.includes(searchTerm) ||
                       grade.includes(searchTerm);
            });
        }
        
        if (this.filters.grade) {
            filtered = filtered.filter(mark => mark.grade === this.filters.grade);
        }
        
        if (this.filters.course) {
            filtered = filtered.filter(mark => 
                mark.courses?.course_name === this.filters.course
            );
        }
        
        if (this.filters.student) {
            filtered = filtered.filter(mark => 
                mark.students?.full_name === this.filters.student
            );
        }
        
        this.filteredData = filtered;
    }
    
    clearFilters() {
        const searchInput = document.getElementById('marksSearch');
        const gradeFilter = document.getElementById('gradeFilter');
        const courseFilter = document.getElementById('courseFilter');
        const dateFilter = document.getElementById('dateFilter');
        const studentFilter = document.getElementById('studentFilter');
        
        if (searchInput) searchInput.value = '';
        if (gradeFilter) gradeFilter.value = '';
        if (courseFilter) courseFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (studentFilter) studentFilter.value = '';
        
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        this.filterTable();
    }
    
    updatePagination() {
        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        
        const startRow = Math.min((this.currentPage - 1) * this.pageSize + 1, totalRows);
        const endRow = Math.min(this.currentPage * this.pageSize, totalRows);
        
        this.safeUpdateElement('startRow', startRow);
        this.safeUpdateElement('endRow', endRow);
        this.safeUpdateElement('totalRows', totalRows);
        
        const pageNumbers = document.getElementById('pageNumbers');
        if (pageNumbers) {
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
        
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    }
    
    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentView();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    changePageSize() {
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            this.pageSize = parseInt(pageSizeSelect.value);
            this.currentPage = 1;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    // ==================== VIEW MANAGEMENT ====================
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.currentPage = 1;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = Array.from(document.querySelectorAll('.view-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(mode)
        );
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        const compactView = document.getElementById('compactView');
        
        if (tableView) tableView.style.display = mode === 'table' ? 'block' : 'none';
        if (cardsView) cardsView.style.display = mode === 'cards' ? 'block' : 'none';
        if (compactView) compactView.style.display = mode === 'compact' ? 'block' : 'none';
        
        this.renderCurrentView();
    }
    
    renderCardsView() {
        console.log('Cards view not implemented yet');
        const container = document.querySelector('#marksCards');
        if (container) {
            container.innerHTML = `
                <div class="empty-state-cards">
                    <i class="fas fa-th-large fa-3x"></i>
                    <h3>Cards View Coming Soon</h3>
                    <p>We're working on an enhanced cards view</p>
                    <button class="btn-secondary" onclick="window.app.marks.setViewMode('table')">
                        <i class="fas fa-table"></i> Switch to Table View
                    </button>
                </div>
            `;
        }
    }
    
    renderCompactView() {
        console.log('Compact view not implemented yet');
        const container = document.getElementById('compactView');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list fa-3x"></i>
                    <h3>Compact View Coming Soon</h3>
                    <p>We're working on a compact view for faster browsing</p>
                    <button class="btn-secondary" onclick="window.app.marks.setViewMode('table')">
                        <i class="fas fa-table"></i> Switch to Table View
                    </button>
                </div>
            `;
        }
    }
    
    // ==================== DASHBOARD & STATISTICS ====================
    
    updateDashboardStatistics(marks) {
        try {
            if (!marks || !Array.isArray(marks)) return;
            
            const totalMarks = marks.length;
            const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
            
            let avgScore = 0;
            if (marks.length > 0) {
                const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
                avgScore = totalPercentage / marks.length;
            }
            
            this.updateDashboardElement('totalMarks', totalMarks);
            this.updateDashboardElement('totalStudents', distinctStudents);
            this.updateDashboardElement('avgGrade', `${avgScore.toFixed(1)}%`);
            
            const gradeDistribution = {
                DISTINCTION: 0,
                CREDIT: 0,
                PASS: 0,
                FAIL: 0
            };
            
            marks.forEach(mark => {
                const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
                if (gradeDistribution[grade] !== undefined) {
                    gradeDistribution[grade]++;
                }
            });
            
            this.updateDashboardGradeDistribution(gradeDistribution, totalMarks);
            this.updateRecentActivity(marks);
            
        } catch (error) {
            console.error('❌ Error updating dashboard statistics:', error);
        }
    }
    
    updateDashboardElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateDashboardGradeDistribution(distribution, total) {
        ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'].forEach(grade => {
            const element = document.getElementById(`${grade.toLowerCase()}Count`);
            if (element) {
                element.textContent = distribution[grade] || 0;
            }
        });
    }
    
    updateRecentActivity(marks) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity || !Array.isArray(marks) || marks.length === 0) return;
        
        const recentMarks = marks
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 5);
        
        let html = '';
        
        recentMarks.forEach(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="activity-details">
                        <p><strong>${student.full_name || 'Student'}</strong> scored ${mark.score}/${mark.max_score} in ${course.course_code || 'Course'}</p>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        recentActivity.innerHTML = html;
    }
    
    getTimeAgo(dateString) {
        if (!dateString) return 'Unknown time';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            
            if (diffMs < 0) return 'Just now';
            
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            return this.formatDate(dateString);
        } catch (error) {
            return 'Unknown time';
        }
    }
    
    updateSummaryStats(marks) {
        if (!marks || !Array.isArray(marks)) {
            this.resetSummaryStats();
            return;
        }
        
        const totalRecords = marks.length;
        const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
        
        let avgScore = 0;
        if (marks.length > 0) {
            const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
            avgScore = totalPercentage / marks.length;
        }
        
        const distinctionCount = marks.filter(m => m.grade === 'DISTINCTION').length;
        
        this.updateElementText('totalRecords', totalRecords);
        this.updateElementText('distinctStudents', distinctStudents);
        this.updateElementText('avgScore', `${avgScore.toFixed(1)}%`);
        this.updateElementText('distinctionCount', distinctionCount);
        
        this.updateGradeDistribution(marks);
        this.updateRecentUpdates(marks);
    }
    
    resetSummaryStats() {
        this.updateElementText('totalRecords', 0);
        this.updateElementText('distinctStudents', 0);
        this.updateElementText('avgScore', '0%');
        this.updateElementText('distinctionCount', 0);
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
    
    updateGradeDistribution(marks) {
        const distribution = document.getElementById('gradeDistribution');
        if (!distribution) return;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            distribution.innerHTML = '<div class="distribution-item">No data available</div>';
            return;
        }
        
        const grades = ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'];
        const counts = {};
        grades.forEach(grade => counts[grade] = 0);
        
        marks.forEach(mark => {
            const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
            if (counts[grade] !== undefined) counts[grade]++;
        });
        
        const total = marks.length;
        let html = '';
        
        grades.forEach(grade => {
            const count = counts[grade];
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
            
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">${grade}</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill ${grade.toLowerCase()}" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">${count} (${percentage}%)</div>
                </div>
            `;
        });
        
        distribution.innerHTML = html;
    }
    
    updateRecentUpdates(marks) {
        const recentUpdates = document.getElementById('recentUpdates');
        if (!recentUpdates) return;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            recentUpdates.innerHTML = `
                <div class="update-item">
                    <div class="update-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="update-details">
                        <div>No recent updates</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const recent = marks
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 3);
        
        let html = '';
        
        recent.forEach(mark => {
            const student = mark.students || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            html += `
                <div class="update-item">
                    <div class="update-icon">
                        <i class="fas fa-user-edit"></i>
                    </div>
                    <div class="update-details">
                        <div>${student.full_name || 'Student'}</div>
                        <div class="update-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        recentUpdates.innerHTML = html;
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
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
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    getToastColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#6c757d';
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
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
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MarksManager = MarksManager;
}
