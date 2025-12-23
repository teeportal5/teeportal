// modules/programs.js - Full Program Management Module
class ProgramManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        
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
            
            // Get additional stats for each program
            const programsWithStats = await Promise.all(
                programs.map(async (program) => {
                    try {
                        const [courses, students] = await Promise.all([
                            this.db.getProgramCourses(program.id),
                            this.db.getProgramStudents(program.id)
                        ]);
                        
                        return {
                            ...program,
                            course_count: courses.length,
                            student_count: students.length
                        };
                    } catch (error) {
                        console.error(`Error getting stats for program ${program.id}:`, error);
                        return {
                            ...program,
                            course_count: 0,
                            student_count: 0
                        };
                    }
                })
            );
            
            const html = programsWithStats.map(program => 
                this._renderProgramRow(program)
            ).join('');
            
            tbody.innerHTML = html;
            
            // Attach event listeners
            this._attachProgramRowEventListeners();
            
            console.log(`✅ Loaded ${programs.length} programs`);
            
        } catch (error) {
            console.error('Error loading programs table:', error);
            this._renderErrorState();
        }
    }
    
    /**
     * Render program table row
     */
    _renderProgramRow(program) {
        const safeProgramId = this._escapeAttr(program.id);
        const programCode = this._escapeHtml(program.code || '');
        const programName = this._escapeHtml(program.name || '');
        const level = program.level || '';
        const duration = program.duration || 0;
        const courseCount = program.course_count || 0;
        const studentCount = program.student_count || 0;
        const status = program.status || 'active';
        
        return `
            <tr data-program-id="${safeProgramId}">
                <td><strong>${programCode}</strong></td>
                <td>
                    <div class="program-info">
                        <strong>${programName}</strong>
                        ${program.description ? `<br><small class="text-muted">${this._escapeHtml(program.description.substring(0, 100))}${program.description.length > 100 ? '...' : ''}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="level-badge ${this._escapeAttr(level)}">
                        ${this._escapeHtml(level.toUpperCase())}
                    </span>
                </td>
                <td>${duration} months</td>
                <td>
                    <span class="badge bg-info">${courseCount} courses</span>
                </td>
                <td>
                    <span class="badge bg-primary">${studentCount} students</span>
                </td>
                <td>
                    <span class="status-badge ${this._escapeAttr(status)}">
                        ${this._escapeHtml(status.toUpperCase())}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-action edit-program" data-id="${safeProgramId}" title="Edit Program">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action view-courses" data-id="${safeProgramId}" title="View Courses">
                        <i class="fas fa-book"></i>
                    </button>
                    <button class="btn-action delete-program" data-id="${safeProgramId}" title="Delete Program">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
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
            
            // Navigate to courses section with filter
            showSection('courses');
            
            // Set program filter in courses section
            setTimeout(() => {
                const programFilter = document.getElementById('courseProgramFilter');
                if (programFilter) {
                    programFilter.value = programId;
                    // Trigger filter if courses module has a filter function
                    if (window.app?.courses?.filterCourses) {
                        window.app.courses.filterCourses();
                    }
                }
            }, 500);
            
            this.ui.showToast(`Viewing courses for ${program.name}`, 'info');
            
        } catch (error) {
            console.error('Error viewing program courses:', error);
            this.ui.showToast('Error loading program courses', 'error');
        }
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
            
            // Check if program has students
            const students = await this.db.getProgramStudents(programId);
            if (students.length > 0) {
                this.ui.showToast(`Cannot delete program. ${students.length} students are enrolled in this program.`, 'error');
                return;
            }
            
            if (!confirm(`Are you sure you want to delete "${this._escapeHtml(program.name)}" (${this._escapeHtml(program.code)})? This action cannot be undone.`)) {
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
     * Export programs
     */
    async exportPrograms(format = 'csv') {
        try {
            const programs = await this.db.getPrograms();
            
            if (programs.length === 0) {
                this.ui.showToast('No programs to export', 'warning');
                return;
            }
            
            const data = programs.map(program => ({
                'Program Code': program.code,
                'Program Name': program.name,
                'Level': program.level,
                'Duration (Months)': program.duration,
                'Required Credits': program.credits || '',
                'Description': program.description || '',
                'Status': program.status,
                'Created Date': program.created_at ? new Date(program.created_at).toLocaleDateString() : ''
            }));
            
            if (format === 'csv') {
                this._exportToCSV(data, 'programs');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'programs');
            } else if (format === 'pdf') {
                this._exportToPDF(data, 'Programs List');
            }
            
            this.ui.showToast(`Exported ${programs.length} programs`, 'success');
            
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
