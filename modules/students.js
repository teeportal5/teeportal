// modules/students.js - Student management module
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
                }
            }
        };
    }
    
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
            
            const student = await this.db.addStudent(studentData);
            
            this.ui.showToast(`Student registered successfully! Registration Number: ${student.reg_number}`, 'success');
            
            this.ui.closeModal('studentModal');
            form.reset();
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.ui.showToast(error.message || 'Error saving student data', 'error');
        }
    }
    
    _extractFormData(form) {
        return {
            name: document.getElementById('studentName')?.value.trim() || '',
            email: document.getElementById('studentEmail')?.value.trim() || '',
            phone: document.getElementById('studentPhone')?.value.trim() || '',
            dob: document.getElementById('studentDOB')?.value || '',
            gender: document.getElementById('studentGender')?.value || '',
            program: document.getElementById('studentProgram')?.value || '',
            intake: document.getElementById('studentIntake')?.value || ''
        };
    }
    
    _validateStudentData(data) {
        const requiredFields = ['name', 'email', 'program', 'intake'];
        return requiredFields.every(field => 
            data[field] && data[field].toString().trim().length > 0
        );
    }
    
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
                return;
            }
            
            const settings = await this.db.getSettings();
            const html = students.map(student => 
                this._renderStudentRow(student, settings)
            ).join('');
            
            tbody.innerHTML = html;
            
            // Attach event listeners to action buttons
            this._attachStudentRowEventListeners();
            
        } catch (error) {
            console.error('Error loading students table:', error);
            this._renderErrorState();
        }
    }
    
    _renderStudentRow(student, settings) {
        const programName = settings.programs && settings.programs[student.program] 
            ? settings.programs[student.program].name 
            : student.program;
        
        const studentName = this._escapeHtml(student.full_name || '');
        const email = this._escapeHtml(student.email || '');
        const phone = this._escapeHtml(student.phone || '');
        const status = student.status || 'active';
        
        return `
            <tr data-student-id="${student.id}" data-student-reg="${student.reg_number}">
                <td><strong>${student.reg_number}</strong></td>
                <td>
                    <div class="student-avatar">
                        <div class="avatar-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="student-info">
                            <strong>${studentName}</strong><br>
                            <small>${email}</small>
                        </div>
                    </div>
                </td>
                <td>${programName}</td>
                <td>${student.intake_year}</td>
                <td>${email}</td>
                <td>${phone}</td>
                <td>
                    <span class="status-badge ${status}">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-action view-student" data-id="${student.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action enter-marks" data-id="${student.id}" title="Enter Marks">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    _attachStudentRowEventListeners() {
        // View student buttons
        document.querySelectorAll('.view-student').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.viewStudent(studentId);
            });
        });
        
        // Enter marks buttons
        document.querySelectorAll('.enter-marks').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                this.enterMarksForStudent(studentId);
            });
        });
    }
    
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.ui.showToast('Student not found', 'error');
                return;
            }
            
            const marks = await this.db.getStudentMarks(studentId);
            const gpa = await this.db.calculateStudentGPA(studentId);
            
            // Create a modal to show student details
            this._showStudentDetailsModal(student, marks, gpa);
            
        } catch (error) {
            console.error('Error viewing student:', error);
            this.ui.showToast('Error loading student details', 'error');
        }
    }
    
    _showStudentDetailsModal(student, marks, gpa) {
        const modal = document.createElement('div');
        modal.id = 'studentDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Student Details</h3>
                    <span class="close" onclick="document.getElementById('studentDetailsModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="student-detail-header">
                        <div class="student-avatar-large">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <h2>${this._escapeHtml(student.full_name)}</h2>
                            <p class="student-reg">${student.reg_number}</p>
                        </div>
                    </div>
                    
                    <div class="student-details-grid">
                        <div class="detail-item">
                            <label>Program:</label>
                            <span>${student.program}</span>
                        </div>
                        <div class="detail-item">
                            <label>Intake Year:</label>
                            <span>${student.intake_year}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge ${student.status || 'active'}">
                                ${(student.status || 'active').toUpperCase()}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Email:</label>
                            <span>${student.email || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span>${student.phone || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Date of Birth:</label>
                            <span>${student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Gender:</label>
                            <span>${student.gender || 'N/A'}</span>
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
                        </div>
                        
                        ${marks.length > 0 ? `
                            <h5>Recent Marks</h5>
                            <div class="marks-list">
                                ${marks.slice(0, 5).map(mark => `
                                    <div class="mark-item">
                                        <div class="mark-course">${mark.courses?.course_code || 'N/A'}</div>
                                        <div class="mark-grade grade-${mark.grade?.charAt(0) || 'F'}">${mark.grade || 'F'}</div>
                                        <div class="mark-score">${mark.score}/${mark.max_score || 100}</div>
                                        <div class="mark-date">${new Date(mark.created_at).toLocaleDateString()}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="no-marks">No marks recorded yet.</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="document.getElementById('studentDetailsModal').remove()">Close</button>
                    <button class="btn-primary" onclick="app.enterMarksForStudent('${student.id}')">
                        <i class="fas fa-chart-bar"></i> Enter Marks
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    _countCompletedCourses(marks) {
        const courseSet = new Set();
        marks.forEach(mark => {
            if (mark.course_id) {
                courseSet.add(mark.course_id);
            }
        });
        return courseSet.size;
    }
    
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
    
    async searchStudents() {
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#studentsTableBody tr[data-student-id]');
        
        rows.forEach(row => {
            const regNumber = row.getAttribute('data-student-reg')?.toLowerCase() || '';
            const studentName = row.querySelector('.student-info strong')?.textContent.toLowerCase() || '';
            const email = row.querySelector('.student-info small')?.textContent.toLowerCase() || '';
            
            const match = regNumber.includes(searchTerm) || 
                         studentName.includes(searchTerm) || 
                         email.includes(searchTerm);
            
            row.style.display = match ? '' : 'none';
        });
    }
    
    async filterStudents() {
        const program = document.getElementById('filterProgram')?.value;
        const intake = document.getElementById('filterIntake')?.value;
        const status = document.getElementById('filterStatus')?.value;
        
        const rows = document.querySelectorAll('#studentsTableBody tr[data-student-id]');
        
        rows.forEach(row => {
            const rowProgram = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
            const rowIntake = row.querySelector('td:nth-child(4)')?.textContent || '';
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
                    'Date Registered': student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : ''
                };
            });
            
            if (format === 'csv') {
                this._exportToCSV(data, 'students');
            } else if (format === 'excel') {
                this._exportToExcel(data, 'students');
            } else if (format === 'pdf') {
                this._exportToPDF(data, 'students');
            }
            
            this.ui.showToast(`Exported ${students.length} students`, 'success');
            
        } catch (error) {
            console.error('Error exporting students:', error);
            this.ui.showToast('Error exporting students', 'error');
        }
    }
    
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
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    _exportToExcel(data, fileName) {
        // This would require a library like SheetJS
        // For now, fall back to CSV
        this._exportToCSV(data, fileName);
        this.ui.showToast('Excel export requires SheetJS library. CSV exported instead.', 'info');
    }
    
    _exportToPDF(data, fileName) {
        // This would require a library like jsPDF
        this.ui.showToast('PDF export requires jsPDF library', 'info');
    }
    
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
            const rows = text.split('\n').filter(row => row.trim());
            
            if (rows.length < 2) {
                this.ui.showToast('CSV file is empty or invalid', 'error');
                return;
            }
            
            const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const students = [];
            
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''));
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
                        intake: student.intake_year || student.intake || new Date().getFullYear().toString()
                    });
                }
            }
            
            if (students.length === 0) {
                this.ui.showToast('No valid student data found in CSV', 'warning');
                return;
            }
            
            // Show import confirmation
            this._showImportConfirmation(students);
            
        } catch (error) {
            console.error('Error importing students:', error);
            this.ui.showToast('Error importing students: ' + error.message, 'error');
        }
    }
    
    _showImportConfirmation(students) {
        const modal = document.createElement('div');
        modal.id = 'importConfirmationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Confirmation</h3>
                    <span class="close" onclick="document.getElementById('importConfirmationModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Found ${students.length} student(s) to import:</p>
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
                                        <td>${student.program}</td>
                                        <td>${student.intake}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${students.length > 10 ? `<p>... and ${students.length - 10} more</p>` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="document.getElementById('importConfirmationModal').remove()">Cancel</button>
                    <button class="btn-primary" id="confirmImport">Import ${students.length} Students</button>
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
    
    async _processImport(students) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        for (const studentData of students) {
            try {
                await this.db.addStudent(studentData);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`${studentData.name}: ${error.message}`);
            }
        }
        
        return results;
    }
    
    _showImportResults(results) {
        const modal = document.createElement('div');
        modal.id = 'importResultsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Results</h3>
                    <span class="close" onclick="document.getElementById('importResultsModal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="import-results">
                        <div class="result-success">
                            <i class="fas fa-check-circle"></i>
                            <span>${results.success} students imported successfully</span>
                        </div>
                        ${results.failed > 0 ? `
                            <div class="result-failed">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>${results.failed} students failed to import</span>
                            </div>
                        ` : ''}
                        
                        ${results.errors.length > 0 ? `
                            <div class="error-list">
                                <h5>Errors:</h5>
                                <ul>
                                    ${results.errors.slice(0, 5).map(error => `<li>${this._escapeHtml(error)}</li>`).join('')}
                                </ul>
                                ${results.errors.length > 5 ? `<p>... and ${results.errors.length - 5} more errors</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="document.getElementById('importResultsModal').remove(); app.loadStudentsTable();">Close & Refresh</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                this.loadStudentsTable();
            }
        });
    }
    
    _renderEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-user-graduate fa-2x"></i>
                    <p>No students found</p>
                    <button class="btn-primary" onclick="openStudentModal()" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> Add Your First Student
                    </button>
                </td>
            </tr>
        `;
    }
    
    _renderErrorState() {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p>Error loading students</p>
                        <button class="btn-primary" onclick="app.loadStudentsTable()" style="margin-top: 10px;">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentManager;
}

// Auto-initialize if loaded in browser without modules
if (typeof window !== 'undefined') {
    // Add CSS styles for the student module
    const style = document.createElement('style');
    style.textContent = `
        .student-avatar {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .avatar-icon {
            width: 40px;
            height: 40px;
            background: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .student-info {
            flex: 1;
        }
        
        .student-info strong {
            display: block;
            margin-bottom: 2px;
        }
        
        .student-info small {
            color: #666;
            font-size: 12px;
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        .btn-action {
            background: none;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 6px;
            cursor: pointer;
            color: #555;
            transition: all 0.2s;
        }
        
        .btn-action:hover {
            background: #f8f9fa;
            border-color: #3498db;
            color: #3498db;
        }
        
        /* Student Details Modal Styles */
        .student-detail-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .student-avatar-large {
            width: 80px;
            height: 80px;
            background: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
        }
        
        .student-reg {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .student-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .detail-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .detail-item label {
            display: block;
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
            font-size: 13px;
        }
        
        .detail-item span {
            color: #333;
        }
        
        .academic-performance {
            margin-top: 30px;
        }
        
        .performance-stats {
            display: flex;
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            flex: 1;
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #eee;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .marks-list {
            margin-top: 15px;
        }
        
        .mark-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
            gap: 15px;
        }
        
        .mark-item:last-child {
            border-bottom: none;
        }
        
        .mark-course {
            flex: 2;
            font-weight: 500;
        }
        
        .mark-grade {
            flex: 1;
            text-align: center;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            min-width: 40px;
        }
        
        .mark-score {
            flex: 1;
            text-align: center;
        }
        
        .mark-date {
            flex: 1;
            text-align: right;
            font-size: 12px;
            color: #666;
        }
        
        .no-marks {
            text-align: center;
            padding: 30px;
            color: #999;
            font-style: italic;
        }
        
        /* Import Preview Styles */
        .import-preview {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin: 15px 0;
        }
        
        .import-preview table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .import-preview th {
            background: #f8f9fa;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            font-size: 13px;
        }
        
        .import-preview td {
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
        }
        
        .import-results {
            padding: 20px 0;
        }
        
        .result-success, .result-failed {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 6px;
        }
        
        .result-success {
            background: #d4edda;
            color: #155724;
        }
        
        .result-failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .error-list {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #eee;
        }
        
        .error-list h5 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #721c24;
        }
        
        .error-list ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .error-list li {
            margin-bottom: 5px;
            font-size: 13px;
            color: #721c24;
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 0;
            border-radius: 10px;
            width: 90%;
            max-width: 700px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
        }
        
        .close {
            font-size: 28px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }
        
        .close:hover {
            color: #333;
        }
        
        .modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .btn-primary:hover {
            background: #2980b9;
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .btn-secondary:hover {
            background: #7f8c8d;
        }
    `;
    document.head.appendChild(style);
}
