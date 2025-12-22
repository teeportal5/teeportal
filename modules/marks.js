// modules/marks.js - Marks management module (with plus/minus grades)
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.ui = app;
    }
    
    // ==================== GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return 'F';
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
        
        // Default comprehensive grading scale with plus/minus
        return this.getDefaultGrade(percentage);
    }
    
    getDefaultGrade(percentage) {
        // Comprehensive grading scale with plus/minus
        if (percentage >= 97) return 'A+';
        if (percentage >= 93) return 'A';
        if (percentage >= 90) return 'A-';
        if (percentage >= 87) return 'B+';
        if (percentage >= 83) return 'B';
        if (percentage >= 80) return 'B-';
        if (percentage >= 77) return 'C+';
        if (percentage >= 73) return 'C';
        if (percentage >= 70) return 'C-';
        if (percentage >= 67) return 'D+';
        if (percentage >= 63) return 'D';
        if (percentage >= 60) return 'D-';
        return 'F';
    }
    
    getGradePoints(grade) {
        // Grade point mapping (4.0 scale)
        const gradePoints = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0
        };
        
        // Try to get from settings first
        if (this.app.settings && this.app.settings.calculateGradePoints) {
            const points = this.app.settings.calculateGradePoints(grade);
            if (points !== undefined) return points;
        }
        
        return gradePoints[grade] || 0.0;
    }
    
    getGradeDescription(grade) {
        // Grade descriptions
        const descriptions = {
            'A+': 'Outstanding',
            'A': 'Excellent',
            'A-': 'Excellent',
            'B+': 'Very Good',
            'B': 'Good',
            'B-': 'Good',
            'C+': 'Satisfactory',
            'C': 'Average',
            'C-': 'Average',
            'D+': 'Below Average',
            'D': 'Poor',
            'D-': 'Poor',
            'F': 'Fail'
        };
        
        return descriptions[grade] || 'No Description';
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
                tbody.innerHTML = this.getEmptyStateHTML();
                return;
            }
            
            let html = '';
            
            marks.forEach(mark => {
                html += this.createMarkRowHTML(mark);
            });
            
            tbody.innerHTML = html;
            this.updateSelectedCounts();
            
        } catch (error) {
            console.error('Error loading marks table:', error);
            const tbody = document.querySelector('#marksTableBody');
            if (tbody) {
                tbody.innerHTML = this.getErrorStateHTML(error);
            }
        }
    }
    
    createMarkRowHTML(mark) {
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
        
        const markId = mark.id || mark._id || '';
        let studentName = student.full_name || 'N/A';
        studentName = studentName.replace(/\s+test\s+\d*$/i, '');
        
        const dateObj = mark.created_at ? new Date(mark.created_at) : 
                      mark.date ? new Date(mark.date) : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-GB');
        
        return `
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
                        <span class="grade-badge grade-${grade?.charAt(0) || 'F'}">
                            ${grade || 'F'}
                        </span>
                        <div class="grade-tooltip">
                            ${gradeDescription} (${gradePoints.toFixed(1)} GPA)
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
    }
    
    getEmptyStateHTML() {
        return `
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
    }
    
    getErrorStateHTML(error) {
        return `
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
    
    // ==================== EDIT MARKS ====================
    
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
        const requiredFields = ['editMarkId', 'editStudent', 'editCourse', 'editScore'];
        for (const fieldId of requiredFields) {
            const element = document.getElementById(fieldId);
            if (!element) {
                console.error(`Required field ${fieldId} not found`);
                this.showToast('Edit form is incomplete', 'error');
                return;
            }
        }
        
        // Set values
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
        }
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => this.updateEditGradeDisplay());
        }
    }
    
    updateEditGradeDisplay() {
        try {
            const scoreInput = document.getElementById('editScore');
            const maxScoreInput = document.getElementById('editMaxScore');
            const gradeDisplay = document.getElementById('editGradeDisplay');
            const percentageField = document.getElementById('editPercentage');
            const gradePointsField = document.getElementById('editGradePoints');
            
            if (!scoreInput || !gradeDisplay) {
                console.warn('Grade display elements not found');
                return;
            }
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput?.value) || 100;
            
            if (isNaN(score)) {
                this.resetGradeDisplay(gradeDisplay, percentageField, gradePointsField);
                return;
            }
            
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const grade = this.calculateGrade(percentage);
            const gradePoints = this.getGradePoints(grade);
            const gradeDescription = this.getGradeDescription(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge grade-${grade.charAt(0)}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageField) {
                percentageField.value = `${percentage.toFixed(2)}%`;
            }
            
            if (gradePointsField) {
                gradePointsField.value = gradePoints.toFixed(1);
            }
            
        } catch (error) {
            console.error('Error updating edit grade display:', error);
        }
    }
    
    resetGradeDisplay(gradeDisplay, percentageField, gradePointsField) {
        gradeDisplay.textContent = '--';
        gradeDisplay.className = 'grade-badge';
        gradeDisplay.title = '';
        
        if (percentageField) percentageField.value = '';
        if (gradePointsField) gradePointsField.value = '';
    }
    
    // ==================== SAVE/UPDATE MARKS ====================
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
            // Get form values
            const formData = this.getMarksFormData();
            
            // Validate
            if (!this.validateMarksData(formData)) return;
            
            // Calculate additional values
            const processedData = this.processMarksData(formData);
            
            console.log('💾 Saving marks:', processedData);
            
            await this.db.addMark(processedData);
            
            this.showToast('✅ Marks saved successfully!', 'success');
            
            this.closeModal('marksModal');
            document.getElementById('marksForm').reset();
            this.resetGradeDisplayInModal();
            
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving marks:', error);
            this.showToast(`Error saving marks: ${error.message}`, 'error');
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
            const formData = this.getEditFormData();
            
            // Validate
            if (!this.validateMarksData(formData)) return;
            
            // Calculate additional values
            const processedData = this.processMarksData(formData);
            
            console.log('🔄 Updating mark:', markId, processedData);
            
            await this.db.updateMark(markId, processedData);
            
            this.showToast('✅ Marks updated successfully!', 'success');
            this.closeModal('editMarksModal');
            
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error updating mark:', error);
            this.showToast(`Error updating marks: ${error.message}`, 'error');
        }
    }
    
    getMarksFormData() {
        return {
            studentId: document.getElementById('marksStudent').value,
            courseId: document.getElementById('marksCourse').value,
            score: parseFloat(document.getElementById('marksScore').value),
            maxScore: parseFloat(document.getElementById('maxScore').value) || 100,
            assessmentType: document.getElementById('assessmentType').value,
            assessmentName: document.getElementById('assessmentName').value || 'Assessment',
            remarks: document.getElementById('marksRemarks')?.value || ''
        };
    }
    
    getEditFormData() {
        return {
            score: parseFloat(document.getElementById('editScore').value),
            maxScore: parseFloat(document.getElementById('editMaxScore').value) || 100,
            assessmentType: document.getElementById('editAssessmentType')?.value || 'Exam',
            assessmentName: document.getElementById('editAssessmentName')?.value || 'Assessment',
            remarks: document.getElementById('editRemarks')?.value || ''
        };
    }
    
    validateMarksData(data) {
        if (!data.studentId && !data.courseId) {
            this.showToast('Please select student and course', 'error');
            return false;
        }
        
        if (isNaN(data.score)) {
            this.showToast('Please enter a valid score', 'error');
            return false;
        }
        
        if (data.score < 0 || data.maxScore <= 0) {
            this.showToast('Score must be positive and max score must be greater than 0', 'error');
            return false;
        }
        
        return true;
    }
    
    processMarksData(data) {
        const percentage = data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0;
        const grade = this.calculateGrade(percentage);
        const gradePoints = this.getGradePoints(grade);
        
        return {
            student_id: data.studentId,
            course_id: data.courseId,
            assessment_type: data.assessmentType,
            assessment_name: data.assessmentName,
            score: data.score,
            max_score: data.maxScore,
            percentage: percentage,
            grade: grade,
            grade_points: gradePoints,
            remarks: data.remarks || '',
            visible_to_student: document.getElementById('visibleToStudent')?.checked || true
        };
    }
    
    // ==================== MODAL MANAGEMENT ====================
    
    async openMarksModal() {
        try {
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            // Setup real-time grade updates
            this.setupMarksModalListeners();
            
            this.openModal('marksModal');
            
            // Initial grade update
            this.updateMarksModalGradeDisplay();
            
        } catch (error) {
            console.error('Error opening marks modal:', error);
            this.showToast('Error opening marks form', 'error');
        }
    }
    
    setupMarksModalListeners() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        const gradeDisplay = document.getElementById('gradeDisplay');
        const percentageDisplay = document.getElementById('percentageDisplay');
        const gradePointsDisplay = document.getElementById('gradePointsDisplay');
        
        if (scoreInput && gradeDisplay) {
            const updateGrade = () => {
                const score = parseFloat(scoreInput.value);
                const maxScore = parseFloat(maxScoreInput?.value) || 100;
                
                if (!isNaN(score) && maxScore > 0) {
                    const percentage = (score / maxScore) * 100;
                    const grade = this.calculateGrade(percentage);
                    const gradePoints = this.getGradePoints(grade);
                    const gradeDescription = this.getGradeDescription(grade);
                    
                    gradeDisplay.textContent = grade;
                    gradeDisplay.className = `grade-badge grade-${grade.charAt(0)}`;
                    gradeDisplay.title = gradeDescription;
                    
                    if (percentageDisplay) {
                        percentageDisplay.textContent = `${percentage.toFixed(2)}%`;
                    }
                    
                    if (gradePointsDisplay) {
                        gradePointsDisplay.textContent = gradePoints.toFixed(1);
                    }
                } else {
                    this.resetMarksModalGradeDisplay(gradeDisplay, percentageDisplay, gradePointsDisplay);
                }
            };
            
            scoreInput.addEventListener('input', updateGrade);
            if (maxScoreInput) {
                maxScoreInput.addEventListener('input', updateGrade);
            }
            
            // Trigger initial update
            updateGrade();
        }
    }
    
    resetMarksModalGradeDisplay(gradeDisplay, percentageDisplay, gradePointsDisplay) {
        if (gradeDisplay) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'grade-badge';
            gradeDisplay.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.textContent = '--%';
        }
        
        if (gradePointsDisplay) {
            gradePointsDisplay.textContent = '0.0';
        }
    }
    
    resetGradeDisplayInModal() {
        const gradeDisplay = document.getElementById('gradeDisplay');
        const percentageDisplay = document.getElementById('percentageDisplay');
        const gradePointsDisplay = document.getElementById('gradePointsDisplay');
        
        this.resetMarksModalGradeDisplay(gradeDisplay, percentageDisplay, gradePointsDisplay);
    }
    
    updateMarksModalGradeDisplay() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        
        if (scoreInput && (parseFloat(scoreInput.value) || 0) > 0) {
            this.setupMarksModalListeners();
        }
    }
    
    // ==================== OTHER METHODS ====================
    
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
        }
    }
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} marks`;
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
