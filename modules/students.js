// modules/students.js - Enhanced Student Management Module (XSS Secured)
class StudentManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.ui = {
            showToast: (message, type = 'info') => {
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(message, type);
                } else {
                    console.log(`${type}: ${message}`);
                }
            },
            closeModal: (id) => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            },
            openModal: (id) => {
                const modal = document.getElementById(id);
                if (modal) {
                    modal.style.display = 'block';
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        };
        this.currentEditId = null;
        this.selectedStudents = new Set();
    }
    
    /**
     * Initialize student module
     */
    async init() {
        this._attachEventListeners();
        await this.loadStudentsTable();
        this._setupBulkActions();
    }
    
    /**
     * Attach all event listeners
     */
    _attachEventListeners() {
        // Form submission
        const studentForm = document.getElementById('studentForm');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => this.saveStudent(e));
        }
        
        // Search input
        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', () => this.searchStudents());
        }
        
        // Filter changes
        ['filterProgram', 'filterIntake', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterStudents());
            }
        });
        
        // Export buttons
        document.querySelectorAll('[data-export-format]').forEach(button => {
            button.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-export-format');
                this.exportStudents(format);
            });
        });
        
        // Import button
        const importBtn = document.getElementById('importStudentsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this._openImportModal());
        }
        
        // Bulk action buttons
        const bulkStatusBtn = document.getElementById('bulkStatusBtn');
        if (bulkStatusBtn) {
            bulkStatusBtn.addEventListener('click', () => this._showBulkStatusModal());
        }
        
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this._showBulkDeleteModal());
        }
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllStudents');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this._toggleSelectAllStudents(e.target.checked);
            });
        }
    }
    
    /**
     * Save or update student
     */
    async saveStudent(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'studentForm') {
            console.error('Invalid form element');
            return;
        }
        
        try {
            const studentData = this._extractFormData(form);
            
            if (!this._validateStudentData(studentData)) {
                this.ui.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (!this._validateEmail(studentData.email)) {
                this.ui.showToast('Please enter a valid email address', 'error');
                return;
            }
            
            let student;
            if (this.currentEditId) {
                // Update existing student
                student = await this.db.updateStudent(this.currentEditId, studentData);
                this.ui.showToast(`Student updated successfully!`, 'success');
                this.currentEditId = null;
                
                // Change button text back to "Add Student"
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Student';
                }
            } else {
                // Add new student
                student = await this.db.addStudent(studentData);
                this.ui.showToast(`Student registered successfully! Registration Number: ${student.reg_number}`, 'success');
            }
            
            this.ui.closeModal('studentModal');
            form.reset();
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.ui.showToast(error.message || 'Error saving student data', 'error');
        }
    }
    
    /**
     * Extract form data
     */
    _extractFormData(form) {
        return {
            name: document.getElementById('studentName')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            phone: document.getElementById('studentPhone')?.value.trim() || '',
            dob: document.getElementById('studentDOB')?.value || '',
            gender: document.getElementById('studentGender')?.value || '',
            program: document.getElementById('studentProgram')?.value || '',
            intake: document.getElementById('studentIntake')?.value || '',
            address: document.getElementById('studentAddress')?.value.trim() || '',
            emergency_contact: document.getElementById('emergencyContact')?.value.trim() || '',
            notes: document.getElementById('studentNotes')?.value.trim() || ''
        };
    }
    
    /**
     * Validate student data
     */
    _validateStudentData(data) {
        const requiredFields = ['name', 'email', 'program', 'intake'];
        
        // Check required fields
        if (!requiredFields.every(field => data[field] && data[field].toString().trim().length > 0)) {
            return false;
        }
        
        // Validate email format
        if (!this._validateEmail(data.email)) {
            return false;
        }
        
        // Validate phone if provided
        if (data.phone && !this._validatePhone(data.phone)) {
            return false;
        }
        
        // Validate date of birth if provided
        if (data.dob) {
            const dob = new Date(data.dob);
            const today = new Date();
            if (dob >= today) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validate email format
     */
    _validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate phone number
     */
    _validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    /**
     * Load students into table
     */
    async loadStudentsTable(filterOptions = {}) {
        try {
            const students = await this.db.getStudents(filterOptions);
            const tbody = document.getElementById('studentsTableBody');
            
            if (!tbody) {
                console.warn('Students table body not found');
                return;
            }
            
            if (students.length === 0) {
                this._renderEmptyState(tbody);
                this._toggleBulkActions(false);
                return;
            }
            
            const settings = await this.db.getSettings();
            const html = students.map(student => 
                this._renderStudentRow(student, settings)
            ).join('');
            
            tbody.innerHTML = html;
            
            // Attach event listeners
            this._attachStudentRowEventListeners();
            this._setupCheckboxListeners();
            
            // Show bulk actions if we have students
            this._toggleBulkActions(true);
            
        } catch (error) {
            console.error('Error loading students table:', error);
            this._renderErrorState();
        }
    }
    
    /**
     * Render student table row (XSS SECURED)
     */
    _renderStudentRow(student, settings) {
        const programName = settings.programs && settings.programs[student.program] 
            ? this._escapeHtml(settings.programs[student.program].name) 
            : this._escapeHtml(student.program || '');
        
        const studentName = this._escapeHtml(student.full_name || '');
        const email = this._escapeHtml(student.email || '');
        const phone = this._escapeHtml(student.phone || '');
        const status = student.status || 'active';
        const isSelected = this.selectedStudents.has(student.id);
        const safeStudentId = this._escapeAttr(student.id);
        const safeRegNumber = this._escapeAttr(student.reg_number);
        
        return `
            <tr data-student-id="${safeStudentId}" data-student-reg="${safeRegNumber}">
                <td>
                    <input type="checkbox" class="student-checkbox" 
                           data-student-id="${safeStudentId}" 
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td><strong>${this._escapeHtml(student.reg_number)}</strong></td>
                <td>
                    <div class="student-avatar">
                        <div class="avatar-icon" style="background-color: ${this._getAvatarColor(student.full_name)}">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="student-info">
                            <strong>${studentName}</strong><br>
                            <small>${email}</small>
                        </div>
                    </div>
                </td>
                <td>${programName}</td>
                <td>${this._escapeHtml(student.intake_year)}</td>
                <td>${email}</td>
                <td>${phone}</td>
                <td>
                    <span class="status-badge ${this._escapeAttr(status)}">
                        ${this._escapeHtml(status.toUpperCase())}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-action view-student" data-id="${safeStudentId}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action edit-student" data-id="${safeStudentId}" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action enter-marks" data-id="${safeStudentId}" title="Enter Marks">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn-action delete-student" data-id="${safeStudentId}" title="Delete Student">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    /**
     * Get avatar color based on name
     */
    _getAvatarColor(name) {
        const colors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
            '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
        ];
        if (!name) return colors[0];
        
        const hash = name.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    /**
     * Attach event listeners to student row buttons
     */
    _attachStudentRowEventListeners() {
        // View student buttons
        document.querySelectorAll('.view-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.viewStudent(studentId);
            });
        });
        
        // Edit student buttons
        document.querySelectorAll('.edit-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.editStudent(studentId);
            });
        });
        
        // Enter marks buttons
        document.querySelectorAll('.enter-marks').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.enterMarksForStudent(studentId);
            });
        });
        
        // Delete student buttons
        document.querySelectorAll('.delete-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.deleteStudent(studentId);
            });
        });
    }
    
    /**
     * Setup checkbox listeners
     */
    _setupCheckboxListeners() {
        document.querySelectorAll('.student-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const studentId = e.target.getAttribute('data-student-id');
                if (e.target.checked) {
                    this.selectedStudents.add(studentId);
                } else {
                    this.selectedStudents.delete(studentId);
                }
                this._updateSelectedCount();
            });
        });
    }
    
    /**
     * Toggle select all students
     */
    _toggleSelectAllStudents(selectAll) {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const studentId = checkbox.getAttribute('data-student-id');
            if (selectAll) {
                this.selectedStudents.add(studentId);
            } else {
                this.selectedStudents.delete(studentId);
            }
        });
        this._updateSelectedCount();
    }
    
    /**
     * Update selected students count
     */
    _updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedStudents.size;
        }
    }
    
    /**
     * Setup bulk actions
     */
    _setupBulkActions() {
        this._toggleBulkActions(false);
    }
    
    /**
     * Toggle bulk actions visibility
     */
    _toggleBulkActions(show) {
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            bulkActions.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * View student details
     */
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            const marks = await this.db.getStudentMarks(studentId);
            const gpa = await this.db.calculateStudentGPA(studentId);
            const courses = await this.db.getStudentCourses(studentId);
            
            this._showStudentDetailsModal(student, marks, gpa, courses);
            
        } catch (error) {
            console.error('Error viewing student:', error);
            this.ui.showToast('Error loading student details', 'error');
        }
    }
    
    /**
     * Edit student
     */
   async editStudent(studentId) {
    try {
        const student = await this.db.getStudent(studentId);
        if (!student) {
            this.ui.showToast('Student not found', 'error');
            return;
        }
        
        this.currentEditId = studentId;
        
        console.log('🔍 Editing student:', student.full_name);
        
        // Safe way to set form values
        const setFormValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
                return true;
            }
            return false;
        };
        
        // List of fields to try (in order of priority)
        const fields = [
            // Personal info
            { id: 'studentName', value: student.full_name },
            { id: 'studentEmail', value: student.email },
            { id: 'studentPhone', value: student.phone },
            { id: 'studentDOB', value: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '' },
            { id: 'studentGender', value: student.gender },
            { id: 'studentIdNumber', value: student.id_number },
            
            // Academic info
            { id: 'studentProgram', value: student.program },
            { id: 'studentIntake', value: student.intake_year },
            { id: 'studentCentre', value: student.centre_id || student.centre },
            { id: 'studentStudyMode', value: student.study_mode },
            
            // Location info
            { id: 'studentCounty', value: student.county },
            { id: 'studentSubCounty', value: student.sub_county },
            { id: 'studentWard', value: student.ward },
            { id: 'studentVillage', value: student.village },
            
            // Other fields
            { id: 'studentAddress', value: student.address },
            { id: 'emergencyContact', value: student.emergency_contact },
            { id: 'studentNotes', value: student.notes }
        ];
        
        let successCount = 0;
        fields.forEach(field => {
            if (setFormValue(field.id, field.value)) {
                successCount++;
            }
        });
        
        console.log(`✅ Set ${successCount}/${fields.length} form fields`);
        
        // Update submit button
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
        }
        
        // Open modal
        this.ui.openModal('studentModal');
        
    } catch (error) {
        console.error('Error editing student:', error);
        this.ui.showToast('Error loading student data', 'error');
    }
}
    
    /**
     * Delete student with confirmation
     */
    async deleteStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            if (!confirm(`Are you sure you want to delete ${this._escapeHtml(student.full_name)} (${this._escapeHtml(student.reg_number)})? This action cannot be undone.`)) {
                return;
            }
            
            await this.db.deleteStudent(studentId);
            this.ui.showToast('Student deleted successfully', 'success');
            
            // Remove from selected if present
            this.selectedStudents.delete(studentId);
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            this.ui.showToast('Error deleting student', 'error');
        }
    }
    
    /**
     * Bulk update student status
     */
    async bulkUpdateStatus(status) {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        try {
            const validStatuses = ['active', 'inactive', 'suspended', 'graduated'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }
            
            const studentIds = Array.from(this.selectedStudents);
            const promises = studentIds.map(id => 
                this.db.updateStudent(id, { status })
            );
            
            await Promise.all(promises);
            
            this.ui.showToast(`Updated status for ${studentIds.length} students to ${status}`, 'success');
            this.selectedStudents.clear();
            this._updateSelectedCount();
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error bulk updating status:', error);
            this.ui.showToast('Error updating student status', 'error');
        }
    }
    
    /**
     * Bulk delete students
     */
    async bulkDeleteStudents() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete ${this.selectedStudents.size} student(s)? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const studentIds = Array.from(this.selectedStudents);
            const promises = studentIds.map(id => this.db.deleteStudent(id));
            
            await Promise.all(promises);
            
            this.ui.showToast(`Deleted ${studentIds.length} student(s) successfully`, 'success');
            this.selectedStudents.clear();
            this._updateSelectedCount();
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error bulk deleting students:', error);
            this.ui.showToast('Error deleting students', 'error');
        }
    }
    
    /**
     * Show bulk status modal
     */
    _showBulkStatusModal() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'bulkStatusModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Update Status for ${this._escapeHtml(this.selectedStudents.size.toString())} Student(s)</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="bulkStatus">New Status:</label>
                        <select id="bulkStatus" class="form-control">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                            <option value="graduated">Graduated</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn-primary" id="confirmBulkStatus">Update Status</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        document.getElementById('confirmBulkStatus').addEventListener('click', async () => {
            const status = document.getElementById('bulkStatus').value;
            modal.remove();
            await this.bulkUpdateStatus(status);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Show bulk delete modal
     */
    _showBulkDeleteModal() {
        if (this.selectedStudents.size === 0) {
            this.ui.showToast('No students selected', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'bulkDeleteModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Delete ${this._escapeHtml(this.selectedStudents.size.toString())} Student(s)</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> This action cannot be undone. 
                        Are you sure you want to delete ${this._escapeHtml(this.selectedStudents.size.toString())} student(s)?
                    </div>
                    <p>This will permanently remove all data associated with these students, including marks and records.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn-danger" id="confirmBulkDelete">
                        <i class="fas fa-trash"></i> Delete ${this._escapeHtml(this.selectedStudents.size.toString())} Student(s)
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        document.getElementById('confirmBulkDelete').addEventListener('click', async () => {
            modal.remove();
            await this.bulkDeleteStudents();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Show student details modal (XSS SECURED)
     */
    _showStudentDetailsModal(student, marks, gpa, courses) {
        const safeStudentId = this._escapeAttr(student.id);
        const safeStudentName = this._escapeHtml(student.full_name);
        const safeRegNumber = this._escapeHtml(student.reg_number);
        const safeEmail = this._escapeHtml(student.email);
        const safePhone = this._escapeHtml(student.phone || 'N/A');
        const safeProgram = this._escapeHtml(student.program);
        const safeIntakeYear = this._escapeHtml(student.intake_year);
        const safeStatus = this._escapeAttr(student.status || 'active');
        const safeDob = student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A';
        const safeGender = this._escapeHtml(student.gender || 'N/A');
        const safeAddress = this._escapeHtml(student.address || 'N/A');
        const safeEmergencyContact = this._escapeHtml(student.emergency_contact || 'N/A');
        const safeNotes = this._escapeHtml(student.notes || 'No notes');
        
        const modal = document.createElement('div');
        modal.id = 'studentDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Student Details</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="student-detail-header">
                        <div class="student-avatar-large" style="background-color: ${this._getAvatarColor(student.full_name)}">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <h2>${safeStudentName}</h2>
                            <p class="student-reg">${safeRegNumber}</p>
                            <p class="student-email">${safeEmail}</p>
                        </div>
                    </div>
                    
                    <div class="student-details-grid">
                        <div class="detail-item">
                            <label>Program:</label>
                            <span>${safeProgram}</span>
                        </div>
                        <div class="detail-item">
                            <label>Intake Year:</label>
                            <span>${safeIntakeYear}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge ${safeStatus}">
                                ${this._escapeHtml((student.status || 'active').toUpperCase())}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span>${safePhone}</span>
                        </div>
                        <div class="detail-item">
                            <label>Date of Birth:</label>
                            <span>${safeDob}</span>
                        </div>
                        <div class="detail-item">
                            <label>Gender:</label>
                            <span>${safeGender}</span>
                        </div>
                        <div class="detail-item">
                            <label>Address:</label>
                            <span>${safeAddress}</span>
                        </div>
                        <div class="detail-item">
                            <label>Emergency Contact:</label>
                            <span>${safeEmergencyContact}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Notes:</label>
                            <span>${safeNotes}</span>
                        </div>
                    </div>
                    
                    <div class="academic-performance">
                        <h4>Academic Performance</h4>
                        <div class="performance-stats">
                            <div class="stat-card">
                                <div class="stat-value">${gpa.toFixed(2)}</div>
                                <div class="stat-label">GPA</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${marks.length}</div>
                                <div class="stat-label">Total Marks</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${this._countCompletedCourses(marks)}</div>
                                <div class="stat-label">Courses Completed</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${courses.length}</div>
                                <div class="stat-label">Courses Enrolled</div>
                            </div>
                        </div>
                        
                        ${marks.length > 0 ? this._renderMarksList(marks) : '<p class="no-marks">No marks recorded yet.</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    <button class="btn-primary edit-student-details" data-id="${safeStudentId}">
                        <i class="fas fa-edit"></i> Edit Student
                    </button>
                    <button class="btn-success enter-marks-details" data-id="${safeStudentId}">
                        <i class="fas fa-chart-bar"></i> Enter Marks
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Attach event listeners using safe methods
        modal.querySelector('.edit-student-details').addEventListener('click', () => {
            modal.remove();
            this.editStudent(student.id);
        });
        
        modal.querySelector('.enter-marks-details').addEventListener('click', () => {
            modal.remove();
            this.enterMarksForStudent(student.id);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Render marks list (XSS Secured)
     */
    _renderMarksList(marks) {
        const recentMarks = marks.slice(0, 10);
        const marksHtml = recentMarks.map(mark => {
            const courseCode = this._escapeHtml(mark.courses?.course_code || 'N/A');
            const grade = this._escapeHtml(mark.grade || 'F');
            const score = this._escapeHtml(mark.score || 0);
            const maxScore = this._escapeHtml(mark.max_score || 100);
            const date = mark.created_at ? new Date(mark.created_at).toLocaleDateString() : 'N/A';
            
            return `
                <div class="mark-item">
                    <div class="mark-course">${courseCode}</div>
                    <div class="mark-grade grade-${this._escapeAttr(grade.charAt(0) || 'F')}">${grade}</div>
                    <div class="mark-score">${score}/${maxScore}</div>
                    <div class="mark-date">${date}</div>
                </div>
            `;
        }).join('');
        
        return `
            <h5>Recent Marks</h5>
            <div class="marks-list">${marksHtml}</div>
            ${marks.length > 10 ? `<p class="text-center">... and ${this._escapeHtml((marks.length - 10).toString())} more marks</p>` : ''}
        `;
    }
    
    /**
     * Count completed courses
     */
    _countCompletedCourses(marks) {
        const courseSet = new Set();
        marks.forEach(mark => {
            if (mark.course_id) {
                courseSet.add(mark.course_id);
            }
        });
        return courseSet.size;
    }
    
    /**
     * Enter marks for student
     */
    async enterMarksForStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            // Open marks modal
            if (window.app && typeof window.app.openMarksModal === 'function') {
                window.app.openMarksModal();
                
                // Pre-select the student
                setTimeout(() => {
                    const studentSelect = document.getElementById('marksStudent');
                    if (studentSelect) {
                        studentSelect.value = studentId;
                        studentSelect.dispatchEvent(new Event('change'));
                    }
                }, 100);
            } else {
                // Fallback to simple modal
                this.ui.showToast('Open the marks section to enter marks for this student', 'info');
            }
            
        } catch (error) {
            console.error('Error preparing marks entry:', error);
            this.ui.showToast('Error preparing marks entry', 'error');
        }
    }
    
    /**
     * Search students
     */
    async searchStudents() {
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#studentsTableBody tr[data-student-id]');
        
        rows.forEach(row => {
            const regNumber = row.getAttribute('data-student-reg')?.toLowerCase() || '';
            const studentName = row.querySelector('.student-info strong')?.textContent.toLowerCase() || '';
            const email = row.querySelector('.student-info small')?.textContent.toLowerCase() || '';
            const phone = row.querySelector('td:nth-child(7)')?.textContent.toLowerCase() || '';
            
            const match = regNumber.includes(searchTerm) || 
                         studentName.includes(searchTerm) || 
                         email.includes(searchTerm) ||
                         phone.includes(searchTerm);
            
            row.style.display = match ? '' : 'none';
        });
    }
    
    /**
     * Filter students
     */
    async filterStudents() {
        const program = document.getElementById('filterProgram')?.value;
        const intake = document.getElementById('filterIntake')?.value;
        const status = document.getElementById('filterStatus')?.value;
        
        const rows = document.querySelectorAll('#studentsTableBody tr[data-student-id]');
        
        rows.forEach(row => {
            const rowProgram = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase() || '';
            const rowIntake = row.querySelector('td:nth-child(5)')?.textContent || '';
            const rowStatus = row.querySelector('.status-badge')?.className.includes(status) || false;
            
            let shouldShow = true;
            
            if (program && !rowProgram.includes(program.toLowerCase())) {
                shouldShow = false;
            }
            
            if (intake && rowIntake !== intake) {
                shouldShow = false;
            }
            
            if (status && status !== 'all' && !rowStatus) {
                shouldShow = false;
            }
            
            row.style.display = shouldShow ? '' : 'none';
        });
    }
    
    /**
     * Export students
     */
    async exportStudents(format = 'csv') {
        try {
            const students = await this.db.getStudents();
            const settings = await this.db.getSettings();
            
            if (students.length === 0) {
                this.ui.showToast('No students to export', 'warning');
                return;
            }
            
            const data = students.map(student => {
                const programName = settings.programs && settings.programs[student.program] 
                    ? settings.programs[student.program].name 
                    : student.program;
                
                return {
                    'Registration Number': student.reg_number,
                    'Full Name': student.full_name,
                    'Email': student.email || '',
                    'Phone': student.phone || '',
                    'Program': programName,
                    'Intake Year': student.intake_year,
                    'Status': student.status || 'active',
                    'Date of Birth': student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
                    'Gender': student.gender || '',
                    'Address': student.address || '',
                    'Emergency Contact': student.emergency_contact || '',
                    'Notes': student.notes || '',
                    'Date Registered': student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : ''
                };
            });
            
            if (format === 'csv') {
                this._exportToCSV(data, 'students');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'students');
            } else if (format === 'pdf') {
                this._exportToPDF(data, 'students');
            } else if (format === 'json') {
                this._exportToJSON(data, 'students');
            }
            
            this.ui.showToast(`Exported ${students.length} students`, 'success');
            
        } catch (error) {
            console.error('Error exporting students:', error);
            this.ui.showToast('Error exporting students', 'error');
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
     * Export to Excel (CSV fallback)
     */
    _exportToExcel(data, fileName) {
        // Check if SheetJS is available
        if (typeof XLSX !== 'undefined') {
            try {
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Students");
                XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
                return;
            } catch (error) {
                console.warn('SheetJS error, falling back to CSV:', error);
            }
        }
        
        // Fall back to CSV
        this._exportToCSV(data, fileName);
        this.ui.showToast('Excel export requires SheetJS library. CSV exported instead.', 'info');
    }
    
    /**
     * Export to PDF
     */
    _exportToPDF(data, fileName) {
        // Check if jsPDF is available
        if (typeof jsPDF !== 'undefined') {
            try {
                const doc = new jsPDF();
                doc.text('Student List', 20, 20);
                
                // Simple table implementation
                const headers = Object.keys(data[0]);
                const rows = data.map(row => Object.values(row));
                
                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: 30,
                });
                
                doc.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
                return;
            } catch (error) {
                console.warn('jsPDF error:', error);
            }
        }
        
        this.ui.showToast('PDF export requires jsPDF library', 'info');
    }
    
    /**
     * Export to JSON
     */
    _exportToJSON(data, fileName) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        this._downloadBlob(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.json`);
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
     * Import students from file
     */
    async importStudents(file) {
        try {
            if (!file) {
                this.ui.showToast('Please select a file', 'error');
                return;
            }
            
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                this.ui.showToast('Please upload a CSV file', 'error');
                return;
            }
            
            const text = await file.text();
            const rows = this._parseCSV(text);
            
            if (rows.length < 2) {
                this.ui.showToast('CSV file is empty or invalid', 'error');
                return;
            }
            
            const headers = rows[0];
            const students = [];
            
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i];
                const student = {};
                
                headers.forEach((header, index) => {
                    student[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
                });
                
                if (student.full_name && student.email) {
                    students.push({
                        name: student.full_name,
                        email: student.email,
                        phone: student.phone || '',
                        dob: student.date_of_birth || student.dob || '',
                        gender: student.gender || '',
                        program: student.program || 'basic',
                        intake: student.intake_year || student.intake || new Date().getFullYear().toString(),
                        address: student.address || '',
                        emergency_contact: student.emergency_contact || '',
                        notes: student.notes || ''
                    });
                }
            }
            
            if (students.length === 0) {
                this.ui.showToast('No valid student data found in CSV', 'warning');
                return;
            }
            
            this._showImportConfirmation(students);
            
        } catch (error) {
            console.error('Error importing students:', error);
            this.ui.showToast('Error importing students: ' + error.message, 'error');
        }
    }
    
    /**
     * Parse CSV with proper handling of quoted fields
     */
    _parseCSV(text) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let insideQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++; // Skip next character
                } else {
                    // Start or end of quoted field
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                // End of field
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n' && !insideQuotes) {
                // End of row
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '\r' && nextChar === '\n' && !insideQuotes) {
                // Windows line ending
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                i++; // Skip \n
            } else {
                currentField += char;
            }
        }
        
        // Add last field and row if any
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        
        return rows;
    }
    
    /**
     * Open import modal
     */
    _openImportModal() {
        const modal = document.createElement('div');
        modal.id = 'importModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Students</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="import-instructions">
                        <h4>Instructions:</h4>
                        <ol>
                            <li>Download the <a href="#" class="download-template-link">template CSV</a></li>
                            <li>Fill in the student information</li>
                            <li>Upload the completed CSV file</li>
                        </ol>
                        <p><strong>Required fields:</strong> Full Name, Email, Program, Intake Year</p>
                        <p><strong>Optional fields:</strong> Phone, Date of Birth, Gender, Address, Emergency Contact, Notes</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="importFile">Select CSV File:</label>
                        <input type="file" id="importFile" accept=".csv" class="form-control">
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="skipDuplicates" class="form-check-input" checked>
                        <label for="skipDuplicates" class="form-check-label">Skip duplicate emails</label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="sendWelcomeEmail" class="form-check-input">
                        <label for="sendWelcomeEmail" class="form-check-label">Send welcome email to new students</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn-primary" id="processImport">Import Students</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Safe event listener attachment
        modal.querySelector('.download-template-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });
        
        modal.querySelector('#processImport').addEventListener('click', async () => {
            const fileInput = document.getElementById('importFile');
            const skipDuplicates = document.getElementById('skipDuplicates').checked;
            
            if (!fileInput.files.length) {
                this.ui.showToast('Please select a file', 'error');
                return;
            }
            
            modal.remove();
            await this.importStudents(fileInput.files[0], skipDuplicates);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Download import template
     */
    downloadTemplate() {
        const template = [
            ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'program', 'intake_year', 'address', 'emergency_contact', 'notes'],
            ['John Doe', 'john@example.com', '+1234567890', '2000-01-15', 'male', 'computer-science', '2023', '123 Main St', '+0987654321', 'Excellent student'],
            ['Jane Smith', 'jane@example.com', '', '2001-05-20', 'female', 'business', '2023', '', '', '']
        ];
        
        const csvContent = template.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this._downloadBlob(blob, 'student-import-template.csv');
    }
    
    /**
     * Show import confirmation
     */
    _showImportConfirmation(students) {
        const modal = document.createElement('div');
        modal.id = 'importConfirmationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Confirmation</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Found ${this._escapeHtml(students.length.toString())} student(s) to import:</p>
                    <div class="import-preview">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Program</th>
                                    <th>Intake</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.slice(0, 10).map(student => `
                                    <tr>
                                        <td>${this._escapeHtml(student.name)}</td>
                                        <td>${this._escapeHtml(student.email)}</td>
                                        <td>${this._escapeHtml(student.program)}</td>
                                        <td>${this._escapeHtml(student.intake)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${students.length > 10 ? `<p>... and ${this._escapeHtml((students.length - 10).toString())} more</p>` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn-primary" id="confirmImport">Import ${this._escapeHtml(students.length.toString())} Students</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        document.getElementById('confirmImport').addEventListener('click', async () => {
            try {
                const results = await this._processImport(students);
                modal.remove();
                this._showImportResults(results);
            } catch (error) {
                console.error('Error processing import:', error);
                this.ui.showToast('Error during import: ' + error.message, 'error');
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Process import
     */
    async _processImport(students, skipDuplicates = true) {
        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
        
        // Check for duplicates
        const existingStudents = await this.db.getStudents();
        const existingEmails = new Set(existingStudents.map(s => s.email?.toLowerCase()));
        
        for (const studentData of students) {
            try {
                // Skip duplicates
                if (skipDuplicates && existingEmails.has(studentData.email.toLowerCase())) {
                    results.skipped++;
                    results.errors.push(`${studentData.name}: Email already exists`);
                    continue;
                }
                
                await this.db.addStudent(studentData);
                results.success++;
                existingEmails.add(studentData.email.toLowerCase());
                
            } catch (error) {
                results.failed++;
                results.errors.push(`${studentData.name}: ${error.message}`);
            }
        }
        
        return results;
    }
    
    /**
     * Show import results
     */
    _showImportResults(results) {
        const modal = document.createElement('div');
        modal.id = 'importResultsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Results</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="import-results">
                        <div class="result-success">
                            <i class="fas fa-check-circle"></i>
                            <span>${this._escapeHtml(results.success.toString())} students imported successfully</span>
                        </div>
                        ${results.skipped > 0 ? `
                            <div class="result-skipped">
                                <i class="fas fa-info-circle"></i>
                                <span>${this._escapeHtml(results.skipped.toString())} students skipped (duplicates)</span>
                            </div>
                        ` : ''}
                        ${results.failed > 0 ? `
                            <div class="result-failed">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>${this._escapeHtml(results.failed.toString())} students failed to import</span>
                            </div>
                        ` : ''}
                        
                        ${results.errors.length > 0 ? `
                            <div class="error-list">
                                <h5>Details:</h5>
                                <ul>
                                    ${results.errors.slice(0, 10).map(error => `<li>${this._escapeHtml(error)}</li>`).join('')}
                                </ul>
                                ${results.errors.length > 10 ? `<p>... and ${this._escapeHtml((results.errors.length - 10).toString())} more</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="closeImportResults">Close & Refresh</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('#closeImportResults').addEventListener('click', () => {
            modal.remove();
            this.loadStudentsTable();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.loadStudentsTable();
            }
        });
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>Get started by adding your first student.</p>
                    <button class="btn-primary open-student-modal">
                        <i class="fas fa-plus"></i> Add Your First Student
                    </button>
                    <p style="margin-top: 15px;">
                        <small>or <a href="#" class="download-template-link">download template</a> to import multiple students</small>
                    </p>
                </td>
            </tr>
        `;
        
        // Safe event listeners
        tbody.querySelector('.open-student-modal')?.addEventListener('click', () => {
            if (this.app && typeof this.app.openStudentModal === 'function') {
                this.app.openStudentModal();
            } else {
                this.ui.openModal('studentModal');
            }
        });
        
        tbody.querySelector('.download-template-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });
    }
    
    /**
     * Render error state
     */
    _renderErrorState() {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Students</h3>
                        <p>Unable to load student data. Please try again.</p>
                        <button class="btn-primary retry-load-students">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.querySelector('.retry-load-students')?.addEventListener('click', () => {
                this.loadStudentsTable();
            });
        }
    }
    
    /**
     * Escape HTML for text content (safe for text nodes)
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Escape HTML for attributes (safe for attribute values)
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
     * Escape HTML for URL attributes (href, src)
     */
    _escapeUrl(text) {
        if (text === null || text === undefined) return '';
        
        // Only allow safe URLs
        const safeText = String(text).replace(/[^-A-Za-z0-9+&@#/%?=~_|!:,.;\(\)]/g, '');
        return encodeURI(safeText);
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined' && typeof window.StudentManager !== 'undefined') {
    window.StudentManager = StudentManager;
}
