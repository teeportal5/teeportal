// modules/marks.js - Marks management module
class MarksManager {
    constructor(db) {
        this.db = db;
    }
    
    async loadMarksTable() {
        try {
            const marks = await this.db.getMarksTableData();
            const tbody = document.querySelector('#marksTableBody');
            
            if (!tbody) {
                console.error('Marks table body not found');
                return;
            }
            
            if (marks.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="empty-state">
                            <i class="fas fa-chart-bar fa-2x"></i>
                            <p>No marks recorded yet</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            
            marks.forEach(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                const percentage = mark.percentage || ((mark.score / mark.max_score) * 100).toFixed(2);
                const markId = mark.id || mark._id || '';
                
                let studentName = student.full_name || 'N/A';
                studentName = studentName.replace(/\s+test\s+\d*$/i, '');
                
                const dateObj = mark.created_at ? new Date(mark.created_at) : 
                              mark.date ? new Date(mark.date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-GB');
                
                html += `
                    <tr data-mark-id="${markId}">
                        <td>${student.reg_number || 'N/A'}</td>
                        <td>${studentName}</td>
                        <td>${course.course_code || 'N/A'}</td>
                        <td>${course.course_name || 'N/A'}</td>
                        <td>${mark.assessment_name || 'Assessment'}</td>
                        <td><strong>${mark.score || 0}/${mark.max_score || 100}</strong></td>
                        <td>${percentage}%</td>
                        <td>
                            <span class="grade-badge grade-${mark.grade?.charAt(0) || 'F'}">
                                ${mark.grade || 'F'}
                            </span>
                        </td>
                        <td>${course.credits || mark.credits || 3}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <div class="action-buttons">
                                <button type="button" class="btn-action btn-edit" 
                                        onclick="app.marks.editMark('${markId}')" 
                                        title="Edit Marks">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" 
                                        onclick="app.marks.deleteMark('${markId}')" 
                                        title="Delete Marks">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading marks table:', error);
            const tbody = document.querySelector('#marksTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading marks</p>
                            <small class="d-block mt-1">${error.message}</small>
                        </td>
                    </tr>
                `;
            }
        }
    }

    async editMark(markId) {
        try {
            console.log('🔧 Editing mark ID:', markId);
            
            const mark = await this.db.getMarkById(markId);
            
            if (!mark) {
                this.showToast('Mark not found', 'error');
                return;
            }
            
            console.log('📊 Mark data fetched:', mark);
            
            document.getElementById('editMarkId').value = markId;
            document.getElementById('editStudent').value = mark.student_id || '';
            document.getElementById('editCourse').value = mark.course_id || '';
            document.getElementById('editAssessmentType').value = mark.assessment_type || 'final';
            document.getElementById('editAssessmentName').value = mark.assessment_name || '';
            document.getElementById('editScore').value = mark.score || 0;
            document.getElementById('editMaxScore').value = mark.max_score || 100;
            document.getElementById('editRemarks').value = mark.remarks || '';
            
            const student = mark.students || {};
            const course = mark.courses || {};
            
            const studentDisplay = document.getElementById('editStudentDisplay');
            if (studentDisplay) {
                studentDisplay.textContent = student.full_name ? 
                    `${student.reg_number} - ${student.full_name}` : 
                    `Student ID: ${mark.student_id}`;
            }
            
            const courseDisplay = document.getElementById('editCourseDisplay');
            if (courseDisplay) {
                courseDisplay.textContent = course.course_code ? 
                    `${course.course_code} - ${course.course_name}` : 
                    `Course ID: ${mark.course_id}`;
            }
            
            this.updateEditGradeDisplay();
            
            this.openModal('editMarksModal');
            
        } catch (error) {
            console.error('❌ Error loading mark for edit:', error);
            this.showToast(`Error loading mark details: ${error.message}`, 'error');
        }
    }

    async updateMark(event) {
        event.preventDefault();
        
        try {
            const markId = document.getElementById('editMarkId').value;
            const score = parseFloat(document.getElementById('editScore').value);
            const maxScore = parseFloat(document.getElementById('editMaxScore').value) || 100;
            
            if (!markId || isNaN(score)) {
                this.showToast('Please enter valid score data', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and max score must be greater than 0', 'error');
                return;
            }
            
            const updateData = {
                assessmentType: document.getElementById('editAssessmentType').value,
                assessmentName: document.getElementById('editAssessmentName').value,
                score: score,
                maxScore: maxScore,
                remarks: document.getElementById('editRemarks').value || ''
            };
            
            console.log('🔄 Updating mark:', markId, updateData);
            
            await this.db.updateMark(markId, updateData);
            
            this.showToast('✅ Marks updated successfully!', 'success');
            closeModal('editMarksModal');
            
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error updating mark:', error);
            this.showToast(`Error updating marks: ${error.message}`, 'error');
        }
    }

    async deleteMark(markId) {
        try {
            if (!confirm('Are you sure you want to delete this mark record? This action cannot be undone.')) {
                return;
            }
            
            console.log('🗑️ Deleting mark:', markId);
            
            await this.db.deleteMark(markId);
            
            this.showToast('✅ Mark deleted successfully!', 'success');
            
            const row = document.querySelector(`tr[data-mark-id="${markId}"]`);
            if (row) {
                row.style.opacity = '0.5';
                row.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    row.remove();
                    this.updateSelectedCounts();
                }, 300);
            }
            
        } catch (error) {
            console.error('❌ Error deleting mark:', error);
            this.showToast(`Error deleting mark: ${error.message}`, 'error');
        }
    }

    async saveMarks(event) {
        event.preventDefault();
        
        try {
            const studentId = document.getElementById('marksStudent').value;
            const courseId = document.getElementById('marksCourse').value;
            const score = parseFloat(document.getElementById('marksScore').value);
            const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
            const assessmentType = document.getElementById('assessmentType').value;
            const assessmentName = document.getElementById('assessmentName').value || 'Assessment';
            
            if (!studentId || !courseId || isNaN(score)) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and max score must be greater than 0', 'error');
                return;
            }
            
            const markData = {
                studentId: studentId,
                courseId: courseId,
                assessmentType: assessmentType,
                assessmentName: assessmentName,
                score: score,
                maxScore: maxScore,
                remarks: document.getElementById('marksRemarks').value || '',
                visibleToStudent: document.getElementById('visibleToStudent')?.checked || true
            };
            
            console.log('💾 Saving marks:', markData);
            
            await this.db.addMark(markData);
            
            this.showToast('✅ Marks saved successfully!', 'success');
            
            closeModal('marksModal');
            document.getElementById('marksForm').reset();
            
            if (typeof updateGradeDisplay === 'function') {
                updateGradeDisplay();
            }
            
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving marks:', error);
            this.showToast(`Error saving marks: ${error.message}`, 'error');
        }
    }

    async openMarksModal() {
        await this.populateStudentDropdown();
        await this.populateCourseDropdown();
        openModal('marksModal');
    }
    
    async populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        try {
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select Student</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating student dropdown:', error);
        }
    }
    
    async populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        try {
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => c.status === 'active');
            
            select.innerHTML = '<option value="">Select Course</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
        }
    }
    
    enterMarksForStudent(studentId) {
        this.openMarksModal();
        if (studentId) {
            const marksStudent = document.getElementById('marksStudent');
            if (marksStudent) marksStudent.value = studentId;
        }
    }
    
    updateEditGradeDisplay() {
        try {
            const scoreInput = document.getElementById('editScore');
            const maxScoreInput = document.getElementById('editMaxScore');
            const gradeDisplay = document.getElementById('editGradeDisplay');
            const percentageField = document.getElementById('editPercentage');
            
            if (!scoreInput || !gradeDisplay) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput?.value) || 100;
            
            if (isNaN(score)) {
                gradeDisplay.textContent = '--';
                gradeDisplay.className = 'percentage-badge';
                if (percentageField) percentageField.value = '';
                return;
            }
            
            const percentage = (score / maxScore) * 100;
            const grade = this.db.calculateGrade(percentage);
            
            gradeDisplay.textContent = grade.grade;
            gradeDisplay.className = `percentage-badge grade-${grade.grade.charAt(0)}`;
            
            if (percentageField) {
                percentageField.value = `${percentage.toFixed(2)}%`;
            }
            
        } catch (error) {
            console.error('Error updating edit grade display:', error);
        }
    }
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} marks`;
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        } else {
            console.warn(`Modal #${modalId} not found`);
        }
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
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }
}
