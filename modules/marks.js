// modules/marks.js - Professional Marks Management Module
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.ui = app;
    }
    
    // ==================== PROFESSIONAL GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        // Validate input
        if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
            return 'FAIL';
        }
        
        // Cap percentage at 100%
        const cappedPercentage = Math.min(percentage, 100);
        
        // Professional grading scale
        if (cappedPercentage >= 85) return 'DISTINCTION';
        if (cappedPercentage >= 70) return 'CREDIT';
        if (cappedPercentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const professionalGradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalGradePoints[upperGrade] || 0.0;
    }
    
    getGradeDescription(grade) {
        const professionalDescriptions = {
            'DISTINCTION': 'Excellent performance',
            'CREDIT': 'Good performance',
            'PASS': 'Satisfactory performance',
            'FAIL': 'Needs improvement'
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalDescriptions[upperGrade] || 'No description available';
    }
    
    getGradeCSSClass(grade) {
        const professionalClasses = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalClasses[upperGrade] || 'grade-default';
    }
    
    // ==================== REAL-TIME VALIDATION ====================
    
    validateScoreInput(inputElement, maxScore) {
        const value = parseFloat(inputElement.value);
        
        if (isNaN(value)) {
            inputElement.value = '';
            return 0;
        }
        
        // Prevent negative scores
        if (value < 0) {
            inputElement.value = 0;
            return 0;
        }
        
        // Cap score at max score
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
        
        // Handle "00" or "0" input
        if (inputElement.value === "00" || inputElement.value === "0") {
            inputElement.value = "100";
            return 100;
        }
        
        return value;
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
                        <td colspan="11" class="empty-state">
                            <i class="fas fa-chart-bar fa-2x"></i>
                            <p>No academic records found</p>
                            <button class="btn btn-primary mt-2" onclick="app.marks.openMarksModal()">
                                <i class="fas fa-plus"></i> Add First Record
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
                const studentName = student.full_name || 'N/A';
                const formattedDate = mark.created_at ? 
                    new Date(mark.created_at).toLocaleDateString('en-GB') : 
                    new Date().toLocaleDateString('en-GB');
                
                html += `
                    <tr data-mark-id="${markId}">
                        <td>${student.reg_number || 'N/A'}</td>
                        <td>${studentName}</td>
                        <td>${course.course_code || 'N/A'}</td>
                        <td>${course.course_name || 'N/A'}</td>
                        <td>${mark.assessment_type || 'N/A'}</td>
                        <td><strong>${score}/${maxScore}</strong></td>
                        <td>${percentage ? percentage.toFixed(1) : 'N/A'}%</td>
                        <td>
                            <span class="grade-badge ${gradeCSSClass}" title="${gradeDescription}">
                                ${grade || 'FAIL'}
                            </span>
                        </td>
                        <td>${gradePoints.toFixed(1)}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <div class="action-buttons">
                                <button type="button" class="btn-action btn-edit" 
                                        onclick="app.marks.editMark('${markId}')" 
                                        title="Edit Record">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="btn-action btn-delete" 
                                        onclick="app.marks.deleteMark('${markId}')" 
                                        title="Delete Record">
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
                        <td colspan="11" class="error-state">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p>Error loading academic records</p>
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
            
            this.setupMarksModalListeners();
            this.openModal('marksModal');
            this.updateMarksGradeDisplay();
            
        } catch (error) {
            console.error('Error opening marks modal:', error);
            this.showToast('Error opening form', 'error');
        }
    }
    
    setupMarksModalListeners() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        
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
    
    updateMarksGradeDisplay() {
        try {
            const scoreInput = document.getElementById('marksScore');
            const maxScoreInput = document.getElementById('maxScore');
            const gradeDisplay = document.getElementById('gradeDisplay');
            const percentageDisplay = document.getElementById('percentageDisplay');
            const gradeDescriptionDisplay = document.getElementById('marksGradeDescription');
            
            if (!scoreInput || !gradeDisplay || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
                return;
            }
            
            // Ensure score doesn't exceed max score
            const validScore = Math.min(score, maxScore);
            if (score !== validScore) {
                scoreInput.value = validScore;
            }
            
            // Calculate percentage (capped at 100%)
            const percentage = (validScore / maxScore) * 100;
            const cappedPercentage = Math.min(percentage, 100);
            
            const grade = this.calculateGrade(cappedPercentage);
            const gradeDescription = this.getGradeDescription(grade);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge-balanced ${gradeCSSClass}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${cappedPercentage.toFixed(2)}%`;
            }
            
            if (gradeDescriptionDisplay) {
                gradeDescriptionDisplay.textContent = gradeDescription;
            }
            
        } catch (error) {
            console.error('Error updating grade display:', error);
        }
    }
    
    resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay) {
        if (gradeDisplay) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'grade-badge-balanced';
            gradeDisplay.title = '';
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
            const visibleToStudent = document.getElementById('visibleToStudent')?.checked || true;
            
            // Validation
            if (!studentId || !courseId || isNaN(score)) {
                this.showToast('Please select student, course, and enter score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and maximum score must be greater than 0', 'error');
                return;
            }
            
            if (score > maxScore) {
                this.showToast(`Score cannot exceed maximum score of ${maxScore}`, 'error');
                return;
            }
            
            // Calculate grade
            const percentage = (score / maxScore) * 100;
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
                visible_to_student: visibleToStudent
            };
            
            console.log('💾 Saving academic record:', markData);
            
            // Save to database
            await this.db.addMark(markData);
            
            // Success
            this.showToast('✅ Academic record saved successfully!', 'success');
            this.closeModal('marksModal');
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== EDIT MARKS MODAL ====================
    
    async editMark(markId) {
        try {
            console.log('🔧 Editing record ID:', markId);
            
            const mark = await this.db.getMarkById(markId);
            
            if (!mark) {
                this.showToast('Academic record not found', 'error');
                return;
            }
            
            this.populateEditForm(mark);
            this.setupEditFormListeners();
            this.openModal('editMarksModal');
            
        } catch (error) {
            console.error('❌ Error loading record for edit:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    populateEditForm(mark) {
        const student = mark.students || {};
        const course = mark.courses || {};
        
        // Set form values
        document.getElementById('editMarkId').value = mark.id || '';
        document.getElementById('editStudent').value = mark.student_id || '';
        document.getElementById('editCourse').value = mark.course_id || '';
        document.getElementById('editScore').value = mark.score || 0;
        
        // Optional fields
        if (document.getElementById('editAssessmentType')) {
            document.getElementById('editAssessmentType').value = mark.assessment_type || '';
        }
        
        if (document.getElementById('editAssessmentName')) {
            document.getElementById('editAssessmentName').value = mark.assessment_name || '';
        }
        
        if (document.getElementById('editMaxScore')) {
            document.getElementById('editMaxScore').value = mark.max_score || 100;
        }
        
        if (document.getElementById('editRemarks')) {
            document.getElementById('editRemarks').value = mark.remarks || '';
        }
        
        if (document.getElementById('editVisibleToStudent')) {
            document.getElementById('editVisibleToStudent').checked = mark.visible_to_student !== false;
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
            scoreInput.addEventListener('input', () => {
                const maxScore = parseFloat(maxScoreInput?.value) || 100;
                this.validateScoreInput(scoreInput, maxScore);
                this.updateEditGradeDisplay();
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                this.validateMaxScoreInput(maxScoreInput);
                this.updateEditGradeDisplay();
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
            
            if (!scoreInput || !gradeDisplay || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetEditGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
                return;
            }
            
            // Ensure score doesn't exceed max score
            const validScore = Math.min(score, maxScore);
            if (score !== validScore) {
                scoreInput.value = validScore;
            }
            
            // Calculate percentage (capped at 100%)
            const percentage = (validScore / maxScore) * 100;
            const cappedPercentage = Math.min(percentage, 100);
            
            const grade = this.calculateGrade(cappedPercentage);
            const gradeDescription = this.getGradeDescription(grade);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge-lg ${gradeCSSClass}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${cappedPercentage.toFixed(2)}%`;
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
                this.showToast('Invalid record ID', 'error');
                return;
            }
            
            // Get form values
            const score = parseFloat(document.getElementById('editScore').value);
            const maxScore = parseFloat(document.getElementById('editMaxScore').value) || 100;
            const assessmentType = document.getElementById('editAssessmentType')?.value || 'final';
            const assessmentName = document.getElementById('editAssessmentName')?.value || '';
            const remarks = document.getElementById('editRemarks')?.value || '';
            const visibleToStudent = document.getElementById('editVisibleToStudent')?.checked || true;
            
            // Validation
            if (isNaN(score)) {
                this.showToast('Please enter a valid score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and maximum score must be greater than 0', 'error');
                return;
            }
            
            if (score > maxScore) {
                this.showToast(`Score cannot exceed maximum score of ${maxScore}`, 'error');
                return;
            }
            
            // Calculate grade
            const percentage = (score / maxScore) * 100;
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
            
            console.log('🔄 Updating academic record:', markId, updateData);
            
            // Update in database
            await this.db.updateMark(markId, updateData);
            
            // Success
            this.showToast('✅ Academic record updated successfully!', 'success');
            this.closeModal('editMarksModal');
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error updating academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== DELETE MARKS ====================
    
    async deleteMark(markId) {
        try {
            if (!confirm('Are you sure you want to delete this academic record? This action cannot be undone.')) {
                return;
            }
            
            console.log('🗑️ Deleting record:', markId);
            
            await this.db.deleteMark(markId);
            
            this.showToast('✅ Academic record deleted successfully!', 'success');
            
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
            console.error('❌ Error deleting academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
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
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} records`;
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
    
    // ==================== PROFESSIONAL NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icons = {
                'success': 'fa-check-circle',
                'error': 'fa-exclamation-circle',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="toast-close">
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
