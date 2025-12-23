// modules/students.js - FIXED VERSION
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
                        animation: slideIn 0.3s ease;
                    `;
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }
            },
            closeModal: (id) => {
                window.closeModal?.(id) || (() => {
                    const modal = document.getElementById(id);
                    if (modal) {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                })();
            },
            openModal: (id) => {
                window.openModal?.(id) || (() => {
                    const modal = document.getElementById(id);
                    if (modal) {
                        modal.classList.add('active');
                        modal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                    }
                })();
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
        this._setupModalHandlers(); // Add modal handlers
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
        ['filterCounty', 'filterCentre', 'filterProgram', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterStudents());
            }
        });
        
        // Export buttons
        const exportBtn = document.querySelector('[onclick*="exportStudents"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportStudents());
        }
        
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
     * Setup modal handlers
     */
    _setupModalHandlers() {
        // Student modal close handler
        const studentModal = document.getElementById('studentModal');
        if (studentModal) {
            // Close button
            const closeBtn = studentModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                });
            }
            
            // Click outside to close
            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    this._resetStudentForm();
                    this.ui.closeModal('studentModal');
                }
            });
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal && activeModal.id === 'studentModal') {
                    this._resetStudentForm();
                    this.ui.closeModal(activeModal.id);
                }
            }
        });
    }
    
    /**
     * Save or update student - FIXED VERSION
     */
    async saveStudent(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'studentForm') {
            console.error('Invalid form element');
            return;
        }
        
        try {
            // Get all form data with proper field mapping
            const formData = {
                // Personal Information
                full_name: document.getElementById('studentName')?.value.trim() || '',
                email: document.getElementById('studentEmail')?.value.trim() || '',
                phone: document.getElementById('studentPhone')?.value.trim() || '',
                date_of_birth: document.getElementById('studentDOB')?.value || '',
                id_number: document.getElementById('studentIdNumber')?.value.trim() || '',
                gender: document.getElementById('studentGender')?.value || '',
                
                // Location Information
                county: document.getElementById('studentCounty')?.value || '',
                sub_county: document.getElementById('studentSubCounty')?.value.trim() || '',
                ward: document.getElementById('studentWard')?.value.trim() || '',
                village: document.getElementById('studentVillage')?.value.trim() || '',
                
                // Academic Information
                program: document.getElementById('studentProgram')?.value || '',
                intake_year: document.getElementById('studentIntake')?.value || new Date().getFullYear().toString(),
                centre_id: document.getElementById('studentCentre')?.value || '',
                study_mode: document.getElementById('studentStudyMode')?.value || 'fulltime',
                
                // Employment Information
                employment_status: document.getElementById('studentEmployment')?.value || '',
                employer: document.getElementById('studentEmployer')?.value.trim() || '',
                job_title: document.getElementById('studentJobTitle')?.value.trim() || '',
                years_experience: parseInt(document.getElementById('studentExperience')?.value) || 0,
                
                // Status
                status: 'active'
            };
            
            console.log('📝 Form data to save:', formData);
            
            // Validate required fields
            const requiredFields = ['full_name', 'email', 'program', 'intake_year'];
            const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');
            
            if (missingFields.length > 0) {
                this.ui.showToast(`Missing required fields: ${missingFields.join(', ')}`, 'error');
                return;
            }
            
            // Validate email
            if (!this._validateEmail(formData.email)) {
                this.ui.showToast('Please enter a valid email address', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            let result;
            if (this.currentEditId) {
                // Update existing student
                console.log(`Updating student ${this.currentEditId}...`);
                result = await this.db.updateStudent(this.currentEditId, formData);
                this.ui.showToast(`Student updated successfully!`, 'success');
            } else {
                // Add new student
                console.log('Adding new student...');
                result = await this.db.addStudent(formData);
                const regNumber = result.reg_number || result.id;
                this.ui.showToast(`Student registered successfully! Registration Number: ${regNumber}`, 'success');
            }
            
            // Reset form and close modal
            this._resetStudentForm();
            this.ui.closeModal('studentModal');
            
            // Refresh students table
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.ui.showToast(error.message || 'Error saving student data', 'error');
            
            // Reset button if error
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId 
                    ? '<i class="fas fa-save"></i> Update Student'
                    : '<i class="fas fa-plus"></i> Register Student';
                submitBtn.disabled = false;
            }
        }
    }
    
    /**
     * Edit student - FIXED VERSION
     */
    async editStudent(studentId) {
        try {
            console.log(`✏️ Editing student ${studentId}...`);
            
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            this.currentEditId = studentId;
            
            console.log('📋 Student data:', student);
            
            // Field mapping - map database fields to form field IDs
            const fieldMap = {
                // Personal Information
                'studentName': student.full_name || '',
                'studentEmail': student.email || '',
                'studentPhone': student.phone || '',
                'studentDOB': student.date_of_birth ? this._formatDateForInput(student.date_of_birth) : '',
                'studentIdNumber': student.id_number || '',
                'studentGender': student.gender || '',
                
                // Location Information
                'studentCounty': student.county || '',
                'studentSubCounty': student.sub_county || '',
                'studentWard': student.ward || '',
                'studentVillage': student.village || '',
                
                // Academic Information
                'studentProgram': student.program || '',
                'studentIntake': student.intake_year || new Date().getFullYear().toString(),
                'studentCentre': student.centre_id || student.centre || '',
                'studentStudyMode': student.study_mode || 'fulltime',
                
                // Employment Information
                'studentEmployment': student.employment_status || '',
                'studentEmployer': student.employer || '',
                'studentJobTitle': student.job_title || '',
                'studentExperience': student.years_experience || 0
            };
            
            // Populate form fields
            let populatedCount = 0;
            Object.entries(fieldMap).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                    populatedCount++;
                    console.log(`✅ Set ${fieldId}: ${value}`);
                } else {
                    console.warn(`⚠️ Field not found: ${fieldId}`);
                }
            });
            
            console.log(`📊 Populated ${populatedCount}/${Object.keys(fieldMap).length} fields`);
            
            // Update submit button text
            const submitBtn = document.querySelector('#studentForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
                submitBtn.setAttribute('data-editing', 'true');
            }
            
            // Open modal
            this.ui.openModal('studentModal');
            
            // Scroll to top of modal
            const modalBody = document.querySelector('#studentModal .modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
            
            // Focus on first field
            setTimeout(() => {
                document.getElementById('studentName')?.focus();
            }, 100);
            
        } catch (error) {
            console.error('Error editing student:', error);
            this.ui.showToast('Error loading student data: ' + error.message, 'error');
        }
    }
    
    /**
     * Format date for input field (YYYY-MM-DD)
     */
    _formatDateForInput(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error formatting date:', error);
            return '';
        }
    }
    
    /**
     * Reset student form - FIXED VERSION
     */
    _resetStudentForm() {
        console.log('🔄 Resetting student form...');
        
        const form = document.getElementById('studentForm');
        if (form) {
            // Reset all input fields
            form.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.type === 'checkbox') {
                    field.checked = false;
                } else if (field.tagName === 'SELECT') {
                    field.selectedIndex = 0;
                } else {
                    field.value = '';
                }
            });
            
            // Reset submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Register Student';
                submitBtn.removeAttribute('data-editing');
                submitBtn.disabled = false;
            }
            
            // Clear edit ID
            this.currentEditId = null;
            
            // Clear any error messages
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            document.querySelectorAll('.form-control.error').forEach(el => {
                el.classList.remove('error');
            });
            
            console.log('✅ Form reset complete');
        }
    }
    
    /**
     * Validate email format
     */
    _validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Load students into table
     */
    async loadStudentsTable(filterOptions = {}) {
        try {
            console.log('📋 Loading students table...');
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
            
            console.log(`✅ Loaded ${students.length} students`);
            
        } catch (error) {
            console.error('Error loading students table:', error);
            this._renderErrorState();
        }
    }
    
    /**
     * Render student table row
     */
    _renderStudentRow(student, settings) {
        const programName = settings.programs && settings.programs[student.program] 
            ? this._escapeHtml(settings.programs[student.program].name) 
            : this._escapeHtml(student.program || 'N/A');
        
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
        
        // Delete student buttons
        document.querySelectorAll('.delete-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.deleteStudent(studentId);
            });
        });
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
                    'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                    'Gender': student.gender || '',
                    'County': student.county || '',
                    'Sub-County': student.sub_county || '',
                    'Ward': student.ward || '',
                    'Village': student.village || '',
                    'Employment Status': student.employment_status || '',
                    'Employer': student.employer || '',
                    'Job Title': student.job_title || '',
                    'Experience (Years)': student.years_experience || '',
                    'Date Registered': student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : ''
                };
            });
            
            if (format === 'csv') {
                this._exportToCSV(data, 'students');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'students');
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
     * Render empty state
     */
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-user-graduate fa-3x"></i>
                    <h3>No Students Found</h3>
                    <p>Get started by adding your first student.</p>
                    <button class="btn-primary" id="addFirstStudent">
                        <i class="fas fa-plus"></i> Add Your First Student
                    </button>
                </td>
            </tr>
        `;
        
        // Add event listener for the button
        tbody.querySelector('#addFirstStudent')?.addEventListener('click', () => {
            this._resetStudentForm();
            this.ui.openModal('studentModal');
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
                    <td colspan="9" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Students</h3>
                        <p>Unable to load student data. Please try again.</p>
                        <button class="btn-primary" id="retryLoadStudents">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.querySelector('#retryLoadStudents')?.addEventListener('click', () => {
                this.loadStudentsTable();
            });
        }
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.StudentManager = StudentManager;
}
