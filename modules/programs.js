// modules/programs.js - Full Program Management Module
class ProgramManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        
        // Define level colors and labels
        this.programLevels = {
            'certificate': { label: 'Certificate', color: '#10b981', bgColor: '#d1fae5' },
            'diploma': { label: 'Diploma', color: '#3b82f6', bgColor: '#dbeafe' },
            'degree': { label: 'Degree', color: '#8b5cf6', bgColor: '#ede9fe' },
            'advanced_diploma': { label: 'Advanced Diploma', color: '#f59e0b', bgColor: '#fef3c7' },
            'postgraduate': { label: 'Postgraduate', color: '#ef4444', bgColor: '#fee2e2' },
            'foundation': { label: 'Foundation', color: '#6b7280', bgColor: '#f3f4f6' }
        };
        
        // Use app's UI methods or create fallbacks
        this.ui = {
            showToast: (message, type = 'info') => {
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(message, type);
                } else {
                    console.log(`${type}: ${message}`);
                    // Simple toast fallback
                    const toast = document.createElement('div');
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                        color: white;
                        border-radius: 8px;
                        z-index: 9999;
                    `;
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }
            },
            closeModal: (id) => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                }
            },
            openModal: (id) => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.style.display = 'block';
                    modal.classList.add('active');
                }
            }
        };
    }
    
    /**
     * Initialize program module
     */
    async init() {
        console.log('Initializing Program Manager...');
        await this._loadInitialData();
        this._attachEventListeners();
        await this.loadProgramsTable();
    }
    
    /**
     * Load initial data from Supabase
     */
    async _loadInitialData() {
        try {
            console.log('Loading programs from Supabase...');
            // Load programs into dropdowns
            await this._populateProgramDropdowns();
        } catch (error) {
            console.error('Error loading initial program data:', error);
        }
    }
    
    /**
     * Populate program dropdowns across the application
     */
    async _populateProgramDropdowns() {
        try {
            const programs = await this.db.getPrograms();
            
            // Populate student form program dropdown
            const studentProgramSelect = document.getElementById('studentProgram');
            if (studentProgramSelect) {
                const currentValue = studentProgramSelect.value;
                studentProgramSelect.innerHTML = '<option value="">Select Program</option>';
                
                programs.forEach(program => {
                    if (program.status === 'active') {
                        const option = document.createElement('option');
                        option.value = program.id;
                        option.textContent = `${program.code} - ${program.name}`;
                        studentProgramSelect.appendChild(option);
                    }
                });
                
                if (currentValue) {
                    studentProgramSelect.value = currentValue;
                }
            }
            
            // Populate course form program dropdown
            const courseProgramSelect = document.getElementById('courseProgram');
            if (courseProgramSelect) {
                const currentValue = courseProgramSelect.value;
                courseProgramSelect.innerHTML = '<option value="">Select Program</option>';
                
                programs.forEach(program => {
                    if (program.status === 'active') {
                        const option = document.createElement('option');
                        option.value = program.id;
                        option.textContent = `${program.code} - ${program.name}`;
                        courseProgramSelect.appendChild(option);
                    }
                });
                
                if (currentValue) {
                    courseProgramSelect.value = currentValue;
                }
            }
            
            // Populate program filter dropdown
            const programFilterSelect = document.getElementById('filterProgram');
            if (programFilterSelect) {
                const currentValue = programFilterSelect.value;
                programFilterSelect.innerHTML = '<option value="">All Programs</option>';
                
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.id;
                      option.textContent = `${program.code} - ${program.name}`;
                    programFilterSelect.appendChild(option);
                });
                
                if (currentValue) {
                    programFilterSelect.value = currentValue;
                }
            }
            
            console.log(`Loaded ${programs.length} programs into dropdowns`);
            
        } catch (error) {
            console.error('Error populating program dropdowns:', error);
        }
    }
    
    /**
     * Attach all event listeners
     */
    _attachEventListeners() {
        // Program form submission
        const programForm = document.getElementById('programForm');
        if (programForm) {
            programForm.addEventListener('submit', (e) => this.saveProgram(e));
        }
        
        // Search input
        const programSearch = document.getElementById('programSearch');
        if (programSearch) {
            programSearch.addEventListener('input', () => this.searchPrograms());
        }
        
        // Filter changes
        ['filterProgramLevel', 'filterProgramStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterPrograms());
            }
        });
        
        // Program modal close handler
        const programModal = document.getElementById('programModal');
        if (programModal) {
            // Close button
            const closeBtn = programModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this._resetProgramForm();
                    this.ui.closeModal('programModal');
                });
            }
            
            // Click outside to close
            programModal.addEventListener('click', (e) => {
                if (e.target === programModal) {
                    this._resetProgramForm();
                    this.ui.closeModal('programModal');
                }
            });
        }
    }
    
    /**
     * Save or update program
     */
    async saveProgram(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'programForm') {
            console.error('Invalid form element');
            return;
        }
        
        try {
            // Get form data
            const formData = {
                code: document.getElementById('programCode')?.value.trim() || '',
                name: document.getElementById('programName')?.value.trim() || '',
                level: document.getElementById('programLevel')?.value || '',
                duration: parseInt(document.getElementById('programDuration')?.value) || 0,
                credits: parseInt(document.getElementById('programCredits')?.value) || 0,
                description: document.getElementById('programDescription')?.value.trim() || '',
                status: document.getElementById('programStatus')?.value || 'active'
            };
            
            console.log('Saving program data:', formData);
            
            // Validate required fields
            const requiredFields = ['code', 'name', 'level', 'duration'];
            const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');
            
            if (missingFields.length > 0) {
                this.ui.showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            let result;
            if (this.currentEditId) {
                // Update existing program
                console.log(`Updating program ${this.currentEditId}...`);
                result = await this.db.updateProgram(this.currentEditId, formData);
                this.ui.showToast(`Program updated successfully!`, 'success');
            } else {
                // Add new program
                console.log('Adding new program...');
                result = await this.db.addProgram(formData);
                this.ui.showToast(`Program added successfully!`, 'success');
            }
            
            // Reset form and close modal
            this._resetProgramForm();
            this.ui.closeModal('programModal');
            
            // Refresh programs table and dropdowns
            await this.loadProgramsTable();
            await this._populateProgramDropdowns();
            
        } catch (error) {
            console.error('Error saving program:', error);
            this.ui.showToast(error.message || 'Error saving program data', 'error');
            
            // Reset button if error
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId 
                    ? '<i class="fas fa-save"></i> Update Program'
                    : '<i class="fas fa-plus"></i> Add Program';
                submitBtn.disabled = false;
            }
        }
    }
    
    /**
     * Load programs into table
     */
    async loadProgramsTable(filterOptions = {}) {
        try {
            console.log('Loading programs table...');
            const programs = await this.db.getPrograms(filterOptions);
            const tbody = document.getElementById('programsTableBody');
            
            if (!tbody) {
                console.warn('Programs table body not found');
                return;
            }
            
            if (programs.length === 0) {
                this._renderEmptyState(tbody);
                return;
            }
            
            // Get detailed statistics for each program
            const programsWithStats = await this._getProgramsWithDetailedStats(programs);
            
            const html = programsWithStats.map(program => 
                this._renderProgramRow(program)
            ).join('');
            
            tbody.innerHTML = html;
            
            // Add CSS for level badges
            this._addLevelBadgeStyles();
            
            // Attach event listeners
            this._attachProgramRowEventListeners();
            
            console.log(`✅ Loaded ${programs.length} programs with detailed statistics`);
            
        } catch (error) {
            console.error('Error loading programs table:', error);
            this._renderErrorState();
        }
    }
    
    /**
     * Get detailed statistics for programs
     */
    async _getProgramsWithDetailedStats(programs) {
        return await Promise.all(
            programs.map(async (program) => {
                try {
                    const [courses, students, activeStudents] = await Promise.all([
                        this.db.getProgramCourses(program.id),
                        this.db.getProgramStudents(program.id),
                        this.db.getProgramStudents(program.id, 'active')
                    ]);
                    
                    // Get program level info
                    const levelInfo = this.programLevels[program.level] || {
                        label: program.level.charAt(0).toUpperCase() + program.level.slice(1),
                        color: '#6b7280',
                        bgColor: '#f3f4f6'
                    };
                    
                    return {
                        ...program,
                        course_count: courses.length,
                        total_student_count: students.length,
                        active_student_count: activeStudents.length,
                        level_info: levelInfo,
                        courses: courses.slice(0, 3) // Get first 3 courses for display
                    };
                } catch (error) {
                    console.error(`Error getting stats for program ${program.id}:`, error);
                    return {
                        ...program,
                        course_count: 0,
                        total_student_count: 0,
                        active_student_count: 0,
                        level_info: this.programLevels[program.level] || { label: program.level, color: '#6b7280', bgColor: '#f3f4f6' },
                        courses: []
                    };
                }
            })
        );
    }
    
    /**
     * Render program table row with detailed statistics
     */
    _renderProgramRow(program) {
        const safeProgramId = this._escapeAttr(program.id);
        const programCode = this._escapeHtml(program.code || '');
        const programName = this._escapeHtml(program.name || '');
        const level = program.level || '';
        const duration = program.duration || 0;
        const courseCount = program.course_count || 0;
        const totalStudents = program.total_student_count || 0;
        const activeStudents = program.active_student_count || 0;
        const status = program.status || 'active';
        const levelInfo = program.level_info || this.programLevels[level];
        
        // Create student statistics display
        let studentStats = '';
        if (totalStudents > 0) {
            studentStats = `
                <div class="student-stats">
                    <span class="stat-item" title="Total Students">
                        <i class="fas fa-users"></i> ${totalStudents} total
                    </span>
                    <span class="stat-item" title="Active Students">
                        <i class="fas fa-user-check"></i> ${activeStudents} active
                    </span>
                </div>
            `;
        }
        
        // Create course preview
        let coursePreview = '';
        if (program.courses && program.courses.length > 0) {
            const courseNames = program.courses.map(c => 
                `<span class="course-tag">${this._escapeHtml(c.code)}</span>`
            ).join('');
            coursePreview = `
                <div class="course-preview">
                    <small>Top courses:</small>
                    <div class="course-tags">${courseNames}</div>
                </div>
            `;
        }
        
        return `
            <tr data-program-id="${safeProgramId}">
                <td>
                    <div class="program-code-display">
                        <strong>${programCode}</strong>
                        <small class="text-muted">ID: ${program.id.substring(0, 8)}</small>
                    </div>
                </td>
                <td>
                    <div class="program-info">
                        <strong class="program-title">${programName}</strong>
                        ${program.description ? `<p class="program-description">${this._escapeHtml(program.description.substring(0, 120))}${program.description.length > 120 ? '...' : ''}</p>` : ''}
                        ${coursePreview}
                    </div>
                </td>
                <td>
                    <div class="level-display">
                        <span class="level-badge" style="background-color: ${levelInfo.bgColor}; color: ${levelInfo.color};">
                            <i class="fas fa-layer-group"></i> ${levelInfo.label}
                        </span>
                        <small class="text-muted">${duration} months</small>
                    </div>
                </td>
                <td>
                    <div class="course-count-display">
                        <div class="count-circle" style="background-color: ${levelInfo.bgColor}; color: ${levelInfo.color};">
                            ${courseCount}
                        </div>
                        <div>
                            <strong>${courseCount} Course${courseCount !== 1 ? 's' : ''}</strong>
                            ${program.credits ? `<small class="text-muted">${program.credits} credits</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="student-count-display">
                        <div class="count-circle" style="background-color: #dbeafe; color: #3b82f6;">
                            ${totalStudents}
                        </div>
                        <div>
                            <strong>${totalStudents} Student${totalStudents !== 1 ? 's' : ''}</strong>
                            ${studentStats}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${this._escapeAttr(status)}">
                        <i class="fas fa-circle"></i> ${this._escapeHtml(status.toUpperCase())}
                    </span>
                    <div class="program-stats">
                        <small class="text-muted">
                            <i class="fas fa-calendar"></i> Created: ${program.created_at ? new Date(program.created_at).toLocaleDateString() : 'N/A'}
                        </small>
                    </div>
                </td>
                <td class="action-buttons">
                    <button class="btn-action edit-program" data-id="${safeProgramId}" title="Edit Program">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action view-courses" data-id="${safeProgramId}" title="View Courses">
                        <i class="fas fa-book"></i>
                        <span class="badge-count">${courseCount}</span>
                    </button>
                    <button class="btn-action view-students" data-id="${safeProgramId}" title="View Students">
                        <i class="fas fa-users"></i>
                        <span class="badge-count">${totalStudents}</span>
                    </button>
                    <button class="btn-action delete-program" data-id="${safeProgramId}" title="Delete Program">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    /**
     * Add CSS styles for level badges and statistics
     */
    _addLevelBadgeStyles() {
        const styleId = 'program-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .level-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .count-circle {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                margin-right: 8px;
            }
            
            .course-count-display,
            .student-count-display {
                display: flex;
                align-items: center;
            }
            
            .course-count-display strong,
            .student-count-display strong {
                display: block;
                margin-bottom: 2px;
            }
            
            .course-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 4px;
            }
            
            .course-tag {
                background: #f3f4f6;
                color: #6b7280;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                white-space: nowrap;
            }
            
            .student-stats {
                display: flex;
                gap: 8px;
                margin-top: 2px;
            }
            
            .stat-item {
                font-size: 11px;
                color: #6b7280;
            }
            
            .stat-item i {
                margin-right: 2px;
            }
            
            .program-title {
                color: #1f2937;
                margin-bottom: 4px;
            }
            
            .program-description {
                color: #6b7280;
                font-size: 13px;
                margin: 4px 0;
                line-height: 1.4;
            }
            
            .program-code-display {
                display: flex;
                flex-direction: column;
            }
            
            .program-code-display small {
                font-size: 11px;
                color: #9ca3af;
            }
            
            .action-buttons {
                position: relative;
            }
            
            .badge-count {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .status-badge.active {
                background: #d1fae5;
                color: #065f46;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .status-badge.inactive {
                background: #f3f4f6;
                color: #6b7280;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .program-stats {
                margin-top: 4px;
            }
            
            .level-display {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Attach event listeners to program row buttons
     */
    _attachProgramRowEventListeners() {
        // Edit program buttons
        document.querySelectorAll('.edit-program').forEach(button => {
            button.addEventListener('click', (e) => {
                const programId = e.currentTarget.getAttribute('data-id');
                this.editProgram(programId);
            });
        });
        
        // View courses buttons
        document.querySelectorAll('.view-courses').forEach(button => {
            button.addEventListener('click', (e) => {
                const programId = e.currentTarget.getAttribute('data-id');
                this.viewProgramCourses(programId);
            });
        });
        
        // View students buttons
        document.querySelectorAll('.view-students').forEach(button => {
            button.addEventListener('click', (e) => {
                const programId = e.currentTarget.getAttribute('data-id');
                this.viewProgramStudents(programId);
            });
        });
        
        // Delete program buttons
        document.querySelectorAll('.delete-program').forEach(button => {
            button.addEventListener('click', (e) => {
                const programId = e.currentTarget.getAttribute('data-id');
                this.deleteProgram(programId);
            });
        });
    }
    
    /**
     * Edit program
     */
    async editProgram(programId) {
        try {
            console.log(`✏️ Editing program ${programId}...`);
            
            const program = await this.db.getProgram(programId);
            if (!program) {
                this.ui.showToast('Program not found', 'error');
                return;
            }
            
            this.currentEditId = programId;
            
            console.log('📋 Program data:', program);
            
            // Populate form fields
            document.getElementById('programCode').value = program.code || '';
            document.getElementById('programName').value = program.name || '';
            document.getElementById('programLevel').value = program.level || '';
            document.getElementById('programDuration').value = program.duration || '';
            document.getElementById('programCredits').value = program.credits || '';
            document.getElementById('programDescription').value = program.description || '';
            document.getElementById('programStatus').value = program.status || 'active';
            
            // Update submit button text
            const submitBtn = document.querySelector('#programForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Program';
            }
            
            // Open modal
            this.ui.openModal('programModal');
            
            // Focus on first field
            setTimeout(() => {
                document.getElementById('programCode')?.focus();
            }, 100);
            
        } catch (error) {
            console.error('Error editing program:', error);
            this.ui.showToast('Error loading program data: ' + error.message, 'error');
        }
    }
    
    /**
     * View program courses
     */
    async viewProgramCourses(programId) {
        try {
            const program = await this.db.getProgram(programId);
            if (!program) {
                this.ui.showToast('Program not found', 'error');
                return;
            }
            
            // Get all courses for this program
            const courses = await this.db.getProgramCourses(programId);
            
            // Show courses in a modal or navigate to courses section
            if (courses.length > 0) {
                this._showCoursesModal(program, courses);
            } else {
                this.ui.showToast(`No courses found for ${program.name}`, 'info');
            }
            
        } catch (error) {
            console.error('Error viewing program courses:', error);
            this.ui.showToast('Error loading program courses', 'error');
        }
    }
    
    /**
     * View program students
     */
    async viewProgramStudents(programId) {
        try {
            const program = await this.db.getProgram(programId);
            if (!program) {
                this.ui.showToast('Program not found', 'error');
                return;
            }
            
            // Get all students for this program
            const students = await this.db.getProgramStudents(programId);
            
            // Show students in a modal or navigate to students section
            if (students.length > 0) {
                this._showStudentsModal(program, students);
            } else {
                this.ui.showToast(`No students found for ${program.name}`, 'info');
            }
            
        } catch (error) {
            console.error('Error viewing program students:', error);
            this.ui.showToast('Error loading program students', 'error');
        }
    }
    
    /**
     * Show courses modal
     */
    _showCoursesModal(program, courses) {
        const modalHtml = `
            <div class="courses-modal">
                <div class="modal-header">
                    <h3>${this._escapeHtml(program.name)} - Courses (${courses.length})</h3>
                    <span class="close" onclick="this.closest('.courses-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="courses-list">
                        ${courses.map(course => `
                            <div class="course-item">
                                <strong>${this._escapeHtml(course.code)}</strong>
                                <span class="course-name">${this._escapeHtml(course.name)}</span>
                                ${course.credits ? `<span class="course-credits">${course.credits} credits</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal.firstElementChild);
        
        // Add styles for modal
        const style = document.createElement('style');
        style.textContent = `
            .courses-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                z-index: 10000;
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }
            
            .courses-modal .modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .courses-modal .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .courses-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .course-item {
                padding: 12px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .course-name {
                flex: 1;
                color: #4b5563;
            }
            
            .course-credits {
                background: #dbeafe;
                color: #1e40af;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show students modal
     */
    _showStudentsModal(program, students) {
        const modalHtml = `
            <div class="students-modal">
                <div class="modal-header">
                    <h3>${this._escapeHtml(program.name)} - Students (${students.length})</h3>
                    <span class="close" onclick="this.closest('.students-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="students-list">
                        ${students.map(student => `
                            <div class="student-item">
                                <div class="student-info">
                                    <strong>${this._escapeHtml(student.registration_number || '')}</strong>
                                    <span class="student-name">${this._escapeHtml(student.name || '')}</span>
                                    <span class="student-status ${student.status}">${student.status || 'active'}</span>
                                </div>
                                <div class="student-meta">
                                    <span class="student-centre">${this._escapeHtml(student.centre_name || '')}</span>
                                    <span class="student-intake">${student.intake_year || ''}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal.firstElementChild);
    }
    
    /**
     * Delete program with confirmation
     */
    async deleteProgram(programId) {
        try {
            const program = await this.db.getProgram(programId);
            if (!program) {
                this.ui.showToast('Program not found', 'error');
                return;
            }
            
            // Get program statistics
            const [students, courses] = await Promise.all([
                this.db.getProgramStudents(programId),
                this.db.getProgramCourses(programId)
            ]);
            
            let warningMessage = `Are you sure you want to delete "${this._escapeHtml(program.name)}" (${this._escapeHtml(program.code)})?`;
            
            if (students.length > 0 || courses.length > 0) {
                warningMessage += `\n\nThis program has:\n`;
                if (students.length > 0) warningMessage += `• ${students.length} enrolled student(s)\n`;
                if (courses.length > 0) warningMessage += `• ${courses.length} course(s)\n`;
                warningMessage += `\nDeleting the program will affect these records!`;
            }
            
            if (!confirm(warningMessage)) {
                return;
            }
            
            await this.db.deleteProgram(programId);
            this.ui.showToast('Program deleted successfully', 'success');
            
            await this.loadProgramsTable();
            await this._populateProgramDropdowns();
            
        } catch (error) {
            console.error('Error deleting program:', error);
            this.ui.showToast('Error deleting program: ' + error.message, 'error');
        }
    }
    
    /**
     * Reset program form
     */
    _resetProgramForm() {
        console.log('🔄 Resetting program form...');
        
        const form = document.getElementById('programForm');
        if (form) {
            form.reset();
            
            // Reset submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Program';
                submitBtn.disabled = false;
            }
            
            // Clear edit ID
            this.currentEditId = null;
            
            console.log('✅ Program form reset complete');
        }
    }
    
    /**
     * Search programs
     */
    async searchPrograms() {
        const searchTerm = document.getElementById('programSearch')?.value.toLowerCase() || '';
        const tbody = document.getElementById('programsTableBody');
        
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr[data-program-id]');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
    
    /**
     * Filter programs
     */
    async filterPrograms() {
        const level = document.getElementById('filterProgramLevel')?.value || '';
        const status = document.getElementById('filterProgramStatus')?.value || '';
        
        const filterOptions = {};
        if (level) filterOptions.level = level;
        if (status) filterOptions.status = status;
        
        await this.loadProgramsTable(filterOptions);
    }
    
    /**
     * Get program statistics for dashboard
     */
    async getProgramStats() {
        try {
            const programs = await this.db.getPrograms();
            const stats = {
                totalPrograms: programs.length,
                activePrograms: programs.filter(p => p.status === 'active').length,
                programsByLevel: {},
                totalCourses: 0,
                totalStudents: 0
            };
            
            // Get detailed statistics for each program
            const programsWithStats = await this._getProgramsWithDetailedStats(programs);
            
            // Aggregate statistics
            programsWithStats.forEach(program => {
                // Count by level
                const level = program.level || 'other';
                stats.programsByLevel[level] = (stats.programsByLevel[level] || 0) + 1;
                
                // Sum courses and students
                stats.totalCourses += program.course_count || 0;
                stats.totalStudents += program.total_student_count || 0;
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting program stats:', error);
            return {
                totalPrograms: 0,
                activePrograms: 0,
                programsByLevel: {},
                totalCourses: 0,
                totalStudents: 0
            };
        }
    }
    
    /**
     * Export programs
     */
    async exportPrograms(format = 'csv') {
        try {
            const programs = await this.db.getPrograms();
            
            if (programs.length === 0) {
                this.ui.showToast('No programs to export', 'warning');
                return;
            }
            
            // Get detailed statistics for export
            const programsWithStats = await this._getProgramsWithDetailedStats(programs);
            
            const data = programsWithStats.map(program => ({
                'Program Code': program.code,
                'Program Name': program.name,
                'Level': program.level_info?.label || program.level,
                'Duration (Months)': program.duration,
                'Required Credits': program.credits || '',
                'Total Courses': program.course_count,
                'Total Students': program.total_student_count,
                'Active Students': program.active_student_count,
                'Status': program.status,
                'Description': program.description || '',
                'Created Date': program.created_at ? new Date(program.created_at).toLocaleDateString() : ''
            }));
            
            if (format === 'csv') {
                this._exportToCSV(data, 'programs');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'programs');
            } else if (format === 'pdf') {
                this._exportToPDF(data, 'Programs List');
            }
            
            this.ui.showToast(`Exported ${programs.length} programs with statistics`, 'success');
            
        } catch (error) {
            console.error('Error exporting programs:', error);
            this.ui.showToast('Error exporting programs', 'error');
        }
    }
    
    /**
     * Export to CSV
     */
    _exportToCSV(data, fileName) {
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
        this._downloadBlob(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    }
    
    /**
     * Export to Excel
     */
    _exportToExcel(data, fileName) {
        if (!data || data.length === 0) return;
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Programs');
        XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    
    /**
     * Export to PDF
     */
    _exportToPDF(data, title) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text(title, 14, 15);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
        
        // Create table
        const columns = Object.keys(data[0]);
        const rows = data.map(row => Object.values(row));
        
        doc.autoTable({
            head: [columns],
            body: rows,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] }
        });
        
        doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    }
    
    /**
     * Download blob as file
     */
    _downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    /**
     * Escape HTML for text content
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Escape HTML for attributes
     */
    _escapeAttr(text) {
        if (text === null || text === undefined) return '';
        
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-certificate fa-3x"></i>
                    <h3>No Programs Found</h3>
                    <p>Get started by adding your first program.</p>
                    <button class="btn-primary" data-open-modal="programModal">
                        <i class="fas fa-plus"></i> Add Your First Program
                    </button>
                </td>
            </tr>
        `;
    }
    
    /**
     * Render error state
     */
    _renderErrorState() {
        const tbody = document.getElementById('programsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Programs</h3>
                        <p>Unable to load program data. Please try again.</p>
                        <button class="btn-primary" id="retryLoadPrograms">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.querySelector('#retryLoadPrograms')?.addEventListener('click', () => {
                this.loadProgramsTable();
            });
        }
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgramManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.ProgramManager = ProgramManager;
}
