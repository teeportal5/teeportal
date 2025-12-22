// modules/students.js - Student management module
class StudentManager {
    constructor(db) {
        this.db = db;
    }
    
    async saveStudent(event) {
        event.preventDefault();
        
        try {
            const studentData = {
                name: document.getElementById('studentName').value.trim(),
                email: document.getElementById('studentEmail').value.trim(),
                phone: document.getElementById('studentPhone').value.trim(),
                dob: document.getElementById('studentDOB').value,
                gender: document.getElementById('studentGender').value,
                program: document.getElementById('studentProgram').value,
                intake: document.getElementById('studentIntake').value
            };
            
            // Validation
            if (!studentData.name || !studentData.email || !studentData.program || !studentData.intake) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const student = await this.db.addStudent(studentData);
            
            this.showToast(`Student registered successfully! Registration Number: ${student.reg_number}`, 'success');
            
            closeModal('studentModal');
            document.getElementById('studentForm').reset();
            
            await this.loadStudentsTable();
            
        } catch (error) {
            console.error('Error saving student:', error);
            this.showToast('Error saving student data', 'error');
        }
    }
    
    async loadStudentsTable() {
        try {
            const students = await this.db.getStudents();
            const tbody = document.getElementById('studentsTableBody');
            if (!tbody) return;
            
            if (students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <i class="fas fa-user-graduate fa-2x"></i>
                            <p>No students found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const settings = await this.db.getSettings();
            let html = '';
            
            students.forEach(student => {
                const programName = settings.programs && settings.programs[student.program] ? 
                    settings.programs[student.program].name : student.program;
                
                html += `
                    <tr>
                        <td><strong>${student.reg_number}</strong></td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 40px; height: 40px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <strong>${student.full_name}</strong><br>
                                    <small>${student.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td>${programName}</td>
                        <td>${student.intake_year}</td>
                        <td>${student.email || ''}</td>
                        <td>${student.phone || ''}</td>
                        <td>
                            <span class="status-badge ${student.status || 'active'}">
                                ${(student.status || 'active').toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <button class="btn-action" onclick="app.students.viewStudent('${student.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action" onclick="app.marks.enterMarksForStudent('${student.id}')" title="Enter Marks">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading students table:', error);
            const tbody = document.getElementById('studentsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading students</p>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    async viewStudent(studentId) {
        try {
            const student = await this.db.getStudent(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            const marks = await this.db.getStudentMarks(studentId);
            const gpa = await this.db.calculateStudentGPA(studentId);
            
            alert(`
                Student Details:
                --------------------
                Name: ${student.full_name}
                Reg Number: ${student.reg_number}
                Program: ${student.program}
                Intake: ${student.intake_year}
                Email: ${student.email}
                Phone: ${student.phone}
                GPA: ${gpa.toFixed(2)}
                Total Marks: ${marks.length}
                
                Click "Enter Marks" to add marks for this student.
            `);
            
        } catch (error) {
            console.error('Error viewing student:', error);
            this.showToast('Error loading student details', 'error');
        }
    }
    
    async searchStudents() {
        // Implement search functionality
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#studentsTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
    
    async filterStudents() {
        // Implement filter functionality
        const program = document.getElementById('filterProgram')?.value;
        const intake = document.getElementById('filterIntake')?.value;
        const status = document.getElementById('filterStatus')?.value;
        
        // Your filtering logic here
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 5000);
    }
}
