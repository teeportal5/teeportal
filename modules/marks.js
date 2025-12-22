// modules/marks.js - Marks management module
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.ui = app;
    }
    
    // ==================== GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return 'FAIL';
        }
        
        // Try to get grading scale from settings
        let gradingScale = null;
        if (this.app.settings && this.app.settings.getCurrentSettings) {
            const settings = this.app.settings.getCurrentSettings();
            gradingScale = settings?.academic?.gradingScale;
        }
        
        // If settings have detailed grading scale, use it
        if (gradingScale && gradingScale.length > 0) {
            for (const grade of gradingScale) {
                if (percentage >= grade.min && percentage <= grade.max) {
                    return grade.grade;
                }
            }
        }
        
        // Simplified 4-grade system
        // 85% and above = DISTINCTION
        // 70% - 84% = CREDIT
        // 50% - 69% = PASS
        // Below 50% = FAIL
        if (percentage >= 85) return 'DISTINCTION';
        if (percentage >= 70) return 'CREDIT';
        if (percentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        
        // Try to get from settings first
        if (this.app.settings && this.app.settings.calculateGradePoints) {
            const points = this.app.settings.calculateGradePoints(grade);
            if (points !== undefined) return points;
        }
        
        const upperGrade = grade.toUpperCase();
        return gradePoints[upperGrade] || 0.0;
    }
    
    getGradeDescription(grade) {
        const descriptions = {
            'DISTINCTION': 'Excellent - Outstanding achievement (85% and above)',
            'CREDIT': 'Good - Above average achievement (70% - 84%)',
            'PASS': 'Satisfactory - Minimum requirements met (50% - 69%)',
            'FAIL': 'Fail - Requirements not met (Below 50%)'
        };
        
        const upperGrade = grade.toUpperCase();
        return descriptions[upperGrade] || 'No Description Available';
    }
    
    getGradeCSSClass(grade) {
        const classes = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        
        const upperGrade = grade.toUpperCase();
        return classes[upperGrade] || 'grade-default';
    }
    
    // ==================== MARKS TABLE ====================
    
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
                        <td colspan="13" class="empty-state">
                            <i class="fas fa-chart-bar fa-2x"></i>
                            <p>No marks recorded yet</p>
                            <button class="btn btn-primary mt-2" onclick="app.marks.openMarksModal()">
                                <i class="fas fa-plus"></i> Add First Mark
                            </button>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            
            marks.forEach(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                
                // Calculate values
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
                
                const gradePoints = this.getGradePoints(grade);
                const gradeDescription = this.getGradeDescription(grade);
                const gradeCSSClass = this.getGradeCSSClass(grade);
                
                const markId = mark.id || mark._id || '';
                let studentName = student.full_name || 'N/A';
                studentName = studentName.replace(/\s+test\s+\d*$/i, '');
                
                const dateObj = mark.created_at ? new Date(mark.created_at) : 
                              mark.date ? new Date(mark.date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-GB');
                
                html += `
                    <tr data-mark-id="${markId}" data-grade="${grade}">
                        <td>${student.reg_number || 'N/A'}</td>
                        <td>${studentName}</td>
                        <td>${course.course_code || 'N/A'}</td>
                        <td>${course.course_name || 'N/A'}</td>
                        <td>${mark.assessment_type || 'N/A'}</td>
                        <td>${mark.assessment_name || 'N/A'}</td>
                        <td><strong>${score}/${maxScore}</strong></td>
                        <td>${percentage ? percentage.toFixed(2) : 'N/A'}%</td>
                        <td>
                            <div class="grade-display">
                                <span class="grade-badge ${gradeCSSClass}" title="${gradeDescription}">
                                    ${grade || 'FAIL'}
                                </span>
                                <div class="grade-tooltip">
                                    ${gradeDescription}
                                </div>
                            </div>
                        </td>
                        <td>${gradePoints.toFixed(1)}</td>
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
            this.updateSelectedCounts();
            
        } catch (error) {
            console.error('Error loading marks table:', error);
            const tbody = document.querySelector('#marksTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading marks</p>
                            <small class="d-block mt-1">${error.message}</small>
                            <button class="btn btn-secondary mt-2" onclick="app.marks.loadMarksTable()">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    // ==================== ENTER MARKS MODAL ====================
    
    async openMarksModal() {
        try {
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            // Setup real-time grade updates
            this.setupMarksModalListeners();
            
            this.openModal('marksModal');
            
            // Initial grade update
            this.updateMarksGradeDisplay();
            
        } catch (error) {
            console.error('Error opening marks modal:', error);
            this.showToast('Error opening marks form', 'error');
        }
    }
    
    setupMarksModalListeners() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => this.updateMarksGradeDisplay());
            scoreInput.addEventListener('blur', () => {
                const value = parseFloat(scoreInput.value);
                if (value < 0) {
                    scoreInput.value = 0;
                    this.updateMarksGradeDisplay();
                }
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => this.updateMarksGradeDisplay());
            maxScoreInput.addEventListener('blur', () => {
                const value = parseFloat(maxScoreInput.value);
                if (value <= 0) {
                    maxScoreInput.value = 100;
                    this.updateMarksGradeDisplay();
                }
            });
        }
    }
    updateMarksGradeDisplay() {
    try {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        const gradeDisplay = document.getElementById('gradeDisplay');
        const percentageDisplay = document.getElementById('percentageDisplay');
        const gradeDescriptionDisplay = document.getElementById('marksGradeDescription');
        
        if (!scoreInput || !gradeDisplay) return;
        
        const score = parseFloat(scoreInput.value);
        const maxScore = parseFloat(maxScoreInput?.value) || 100;
        
        if (isNaN(score) || maxScore <= 0) {
            this.resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
            return;
        }
        
        const percentage = (score / maxScore) * 100;
        const grade = this.calculateGrade(percentage);
        const gradeDescription = this.getGradeDescription(grade);
        const gradeCSSClass = this.getGradeCSSClass(grade);
        
        // Update display
        gradeDisplay.textContent = grade;
        gradeDisplay.className = `grade-badge-balanced ${gradeCSSClass}`;
        gradeDisplay.title = gradeDescription;
        
        if (percentageDisplay) {
            percentageDisplay.textContent = `${percentage.toFixed(2)}%`;
        }
        
        if (gradeDescriptionDisplay) {
            gradeDescriptionDisplay.textContent = gradeDescription;
        }
        
    } catch (error) {
        console.error('Error updating marks grade display:', error);
    }
}
   resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay) {
    if (gradeDisplay) {
        gradeDisplay.textContent = '--';
        gradeDisplay.className = 'grade-badge-balanced';
        gradeDisplay.title = 'Enter score to see grade';
    }
    
    if (percentageDisplay) {
        percentageDisplay.textContent = '0.00%';
    }
    
    if (gradeDescriptionDisplay) {
        gradeDescriptionDisplay.textContent = '--';
    }
}
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
            // Get form values
            const studentId = document.getElementById('marksStudent').value;
            const courseId = document.getElementById('marksCourse').value;
            const score = parseFloat(document.getElementById('marksScore').value);
            const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
            const assessmentType = document.getElementById('assessmentType')?.value || 'final';
            const assessmentName = document.getElementById('assessmentName')?.value || '';
            const remarks = document.getElementById('marksRemarks')?.value || '';
            
            // Validation
            if (!studentId || !courseId || isNaN(score)) {
                this.showToast('Please select student, course, and enter score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and max score must be greater than 0', 'error');
                return;
            }
            
            // Ensure assessment type is not empty
            if (!assessmentType.trim()) {
                this.showToast('Assessment type is required', 'error');
                return;
            }
            
            // Calculate grade
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const grade = this.calculateGrade(percentage);
            const gradePoints = this.getGradePoints(grade);
            
            // Prepare data
            const markData = {
                student_id: studentId,
                course_id: courseId,
                assessment_type: assessmentType,
                assessment_name: assessmentName || 'Assessment',
                score: score,
                max_score: maxScore,
                percentage: percentage,
                grade: grade,
                grade_points: gradePoints,
                remarks: remarks,
                visible_to_student: document.getElementById('visibleToStudent')?.checked || true
            };
            
            console.log('💾 Saving marks:', markData);
            
            // Save to database
            await this.db.addMark(markData);
            
            // Success
            this.showToast('✅ Marks saved successfully!', 'success');
            
            // Close modal and reset
            this.closeModal('marksModal');
            
            // Refresh marks table
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving marks:', error);
            this.showToast(`Error saving marks: ${error.message}`, 'error');
        }
    }
    
    // ==================== EDIT MARKS MODAL ====================
    
    async editMark(markId) {
        try {
            console.log('🔧 Editing mark ID:', markId);
            
            const mark = await this.db.getMarkById(markId);
            
            if (!mark) {
                this.showToast('Mark not found', 'error');
                return;
            }
            
            // Set form values
            this.populateEditForm(mark);
            
            // Add event listeners for real-time updates
            this.setupEditFormListeners();
            
            this.openModal('editMarksModal');
            
        } catch (error) {
            console.error('❌ Error loading mark for edit:', error);
            this.showToast(`Error loading mark details: ${error.message}`, 'error');
        }
    }
    
    populateEditForm(mark) {
        const student = mark.students || {};
        const course = mark.courses || {};
        
        // Required fields
        document.getElementById('editMarkId').value = mark.id || '';
        document.getElementById('editStudent').value = mark.student_id || '';
        document.getElementById('editCourse').value = mark.course_id || '';
        document.getElementById('editScore').value = mark.score || 0;
        
        // Optional fields
        const optionalFields = {
            'editAssessmentType': mark.assessment_type,
            'editAssessmentName': mark.assessment_name,
            'editMaxScore': mark.max_score || 100,
            'editRemarks': mark.remarks
        };
        
        for (const [fieldId, value] of Object.entries(optionalFields)) {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value || '';
            }
        }
        
        // Display fields
        const studentDisplay = document.getElementById('editStudentDisplay');
        const courseDisplay = document.getElementById('editCourseDisplay');
        
        if (studentDisplay) {
            studentDisplay.textContent = student.full_name ? 
                `${student.reg_number} - ${student.full_name}` : 
                `Student ID: ${mark.student_id}`;
        }
        
        if (courseDisplay) {
            courseDisplay.textContent = course.course_code ? 
                `${course.course_code} - ${course.course_name}` : 
                `Course ID: ${mark.course_id}`;
        }
        
        // Update grade display
        this.updateEditGradeDisplay();
    }
    
    setupEditFormListeners() {
        const scoreInput = document.getElementById('editScore');
        const maxScoreInput = document.getElementById('editMaxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => this.updateEditGradeDisplay());
            scoreInput.addEventListener('blur', () => {
                const value = parseFloat(scoreInput.value);
                if (value < 0) {
                    scoreInput.value = 0;
                    this.updateEditGradeDisplay();
                }
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => this.updateEditGradeDisplay());
            maxScoreInput.addEventListener('blur', () => {
                const value = parseFloat(maxScoreInput.value);
                if (value <= 0) {
                    maxScoreInput.value = 100;
                    this.updateEditGradeDisplay();
                }
            });
        }
    }
    
    updateEditGradeDisplay() {
        try {
            const scoreInput = document.getElementById('editScore');
            const maxScoreInput = document.getElementById('editMaxScore');
            const gradeDisplay = document.getElementById('editGradeDisplay');
            const percentageDisplay = document.getElementById('editPercentage');
            const gradeDescriptionDisplay = document.getElementById('editGradeDescription');
            
            if (!scoreInput || !gradeDisplay) {
                console.warn('Grade display elements not found');
                return;
            }
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput?.value) || 100;
            
            if (isNaN(score)) {
                this.resetEditGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
                return;
            }
            
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const grade = this.calculateGrade(percentage);
            const gradeDescription = this.getGradeDescription(grade);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge-lg ${gradeCSSClass}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${percentage.toFixed(2)}%`;
            }
            
            if (gradeDescriptionDisplay) {
                gradeDescriptionDisplay.textContent = gradeDescription;
            }
            
        } catch (error) {
            console.error('Error updating edit grade display:', error);
        }
    }
    
    resetEditGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay) {
        if (gradeDisplay) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'grade-badge-lg';
            gradeDisplay.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.textContent = '0.00%';
        }
        
        if (gradeDescriptionDisplay) {
            gradeDescriptionDisplay.textContent = '--';
        }
    }
    
    async updateMark(event) {
        event.preventDefault();
        
        try {
            const markId = document.getElementById('editMarkId').value;
            
            if (!markId) {
                this.showToast('Invalid mark ID', 'error');
                return;
            }
            
            // Get form values
            const score = parseFloat(document.getElementById('editScore').value);
            const maxScore = parseFloat(document.getElementById('editMaxScore').value) || 100;
            const assessmentType = document.getElementById('editAssessmentType')?.value || 'final';
            const assessmentName = document.getElementById('editAssessmentName')?.value || '';
            const remarks = document.getElementById('editRemarks')?.value || '';
            const visibleToStudent = document.getElementById('editVisibleToStudent')?.checked || true;
            
            // Validate
            if (isNaN(score)) {
                this.showToast('Please enter a valid score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and max score must be greater than 0', 'error');
                return;
            }
            
            // Calculate grade
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const grade = this.calculateGrade(percentage);
            const gradePoints = this.getGradePoints(grade);
            
            // Prepare update data
            const updateData = {
                assessment_type: assessmentType,
                assessment_name: assessmentName,
                score: score,
                max_score: maxScore,
                percentage: percentage,
                grade: grade,
                grade_points: gradePoints,
                remarks: remarks,
                visible_to_student: visibleToStudent,
                updated_at: new Date().toISOString()
            };
            
            console.log('🔄 Updating mark:', markId, updateData);
            
            // Update in database
            await this.db.updateMark(markId, updateData);
            
            // Success
            this.showToast('✅ Marks updated successfully!', 'success');
            this.closeModal('editMarksModal');
            
            // Refresh marks table
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error updating mark:', error);
            this.showToast(`Error updating marks: ${error.message}`, 'error');
        }
    }
    
    // ==================== DELETE MARKS ====================
    
    async deleteMark(markId) {
        try {
            if (!confirm('Are you sure you want to delete this mark record? This action cannot be undone.')) {
                return;
            }
            
            console.log('🗑️ Deleting mark:', markId);
            
            await this.db.deleteMark(markId);
            
            this.showToast('✅ Mark deleted successfully!', 'success');
            
            // Remove from table with animation
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
    
    // ==================== UTILITY METHODS ====================
    
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
            const activeCourses = courses.filter(c => !c.status || c.status === 'active');
            
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
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            
            // Reset forms
            if (modalId === 'marksModal') {
                const form = document.getElementById('marksForm');
                if (form) {
                    form.reset();
                    document.getElementById('maxScore').value = '100';
                    this.resetMarksGradeDisplay(
                        document.getElementById('gradeDisplay'),
                        document.getElementById('percentageDisplay'),
                        document.getElementById('marksGradeDescription')
                    );
                }
            }
            
            if (modalId === 'editMarksModal') {
                const form = document.getElementById('editMarksForm');
                if (form) {
                    form.reset();
                }
            }
        }
    }
    
    // ==================== EXPORT ====================
    
    async exportMarks() {
        try {
            const marks = await this.db.getMarksTableData();
            
            if (!marks || marks.length === 0) {
                this.showToast('No marks data to export', 'warning');
                return;
            }
            
            const csv = this.convertMarksToCSV(marks);
            this.downloadCSV(csv, `teeportal-marks-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.showToast(`Exported ${marks.length} marks records`, 'success');
            
        } catch (error) {
            console.error('Error exporting marks:', error);
            this.showToast('Error exporting marks', 'error');
        }
    }
    
    convertMarksToCSV(marks) {
        const headers = [
            'Student Reg No',
            'Student Name', 
            'Course Code',
            'Course Name',
            'Assessment Type',
            'Assessment Name',
            'Score',
            'Max Score',
            'Percentage',
            'Grade',
            'Grade Points',
            'Grade Description',
            'Remarks',
            'Date Entered'
        ];
        
        const rows = marks.map(mark => {
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
            
            const gradePoints = this.getGradePoints(grade);
            const gradeDescription = this.getGradeDescription(grade);
            
            return [
                `"${student.reg_number || ''}"`,
                `"${student.full_name || ''}"`,
                `"${course.course_code || ''}"`,
                `"${course.course_name || ''}"`,
                `"${mark.assessment_type || ''}"`,
                `"${mark.assessment_name || ''}"`,
                score,
                maxScore,
                percentage ? percentage.toFixed(2) : '0.00',
                `"${grade}"`,
                gradePoints.toFixed(1),
                `"${gradeDescription}"`,
                `"${mark.remarks || ''}"`,
                `"${mark.created_at ? new Date(mark.created_at).toLocaleDateString() : ''}"`
            ].join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                                type === 'error' ? 'fa-exclamation-circle' : 
                                type === 'warning' ? 'fa-exclamation-triangle' : 
                                'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
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
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MarksManager = MarksManager;
}
