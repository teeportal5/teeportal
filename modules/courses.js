// modules/courses.js - Course management module with grading features
class CourseManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.currentCourse = null;
        this.selectedStudents = new Set();
        
        // Register global functions
        this.registerGlobalFunctions();
    }
    
    // Register global functions for HTML onclick handlers
    registerGlobalFunctions() {
        window.openCourseModal = () => this.openCourseModal();
        window.saveCourse = (e) => this.saveCourse(e);
        window.closeCourseModal = () => this.closeCourseModal();
    }
    
    async saveCourse(event) {
        event.preventDefault();
        
        try {
            const courseData = {
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                program: document.getElementById('courseProgram').value,
                credits: parseInt(document.getElementById('courseCredits').value),
                description: document.getElementById('courseDescription').value.trim()
            };
            
            // Validation
            if (!courseData.code) {
                this.showToast('Please enter a course code', 'error');
                return;
            }
            
            if (!courseData.name) {
                this.showToast('Please enter a course name', 'error');
                return;
            }
            
            if (!courseData.program) {
                this.showToast('Please select a program', 'error');
                return;
            }
            
            if (isNaN(courseData.credits) || courseData.credits < 1 || courseData.credits > 10) {
                this.showToast('Credits must be a number between 1 and 10', 'error');
                return;
            }
            
            console.log('📝 Saving course:', courseData);
            
            const form = document.getElementById('courseForm');
            const isEditMode = form.dataset.editId;
            
            let course;
            if (isEditMode) {
                course = await this.db.updateCourse(isEditMode, courseData);
                this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" updated successfully`, 'success');
                delete form.dataset.editId;
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Course';
                    submitBtn.classList.remove('btn-update');
                    submitBtn.classList.add('btn-primary');
                }
            } else {
                course = await this.db.addCourse(courseData);
                this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" added successfully`, 'success');
            }
            
            this.closeCourseModal();
            form.reset();
            
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            const grid = document.getElementById('coursesGrid');
            
            if (!grid) return;
            
            if (!courses || courses.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open fa-3x"></i>
                        <h3>No Courses Found</h3>
                        <p>Add your first course to get started</p>
                        <button class="btn-primary" onclick="openCourseModal()">
                            <i class="fas fa-plus"></i> Add Course
                        </button>
                    </div>
                `;
                return;
            }
            
            const programNames = {
                'basic': 'Basic TEE',
                'hnc': 'HNC',
                'advanced': 'Advanced TEE'
            };
            
            const programColors = {
                'basic': '#3498db',
                'hnc': '#2ecc71',
                'advanced': '#9b59b6'
            };
            
            let html = '';
            courses.forEach(course => {
                const programName = programNames[course.program] || course.program;
                const programColor = programColors[course.program] || '#95a5a6';
                const createdAt = course.created_at ? new Date(course.created_at).toLocaleDateString() : 'Unknown';
                const status = course.status || 'active';
                const enrolledStudents = course.enrolled_count || 0;
                const canGrade = enrolledStudents > 0;
                
                html += `
                    <div class="course-card" data-course-id="${course.id}">
                        <div class="course-header" style="background: ${programColor};">
                            <div class="course-header-content">
                                <h3>${course.course_code}</h3>
                                <span class="course-status ${status}">${status.toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="course-body">
                            <h4>${course.course_name}</h4>
                            <p class="course-description">${course.description || 'No description available'}</p>
                            <div class="course-meta">
                                <span><i class="fas fa-graduation-cap"></i> ${programName}</span>
                                <span><i class="fas fa-star"></i> ${course.credits || 3} Credits</span>
                                <span><i class="fas fa-users"></i> ${enrolledStudents} Students</span>
                            </div>
                        </div>
                        <div class="course-actions">
                            ${canGrade ? `
                                <button class="btn-grade" onclick="app.courses.openBulkGradeModal('${course.id}')" title="Grade all students">
                                    <i class="fas fa-chart-line"></i> Grade
                                </button>
                            ` : ''}
                            <button class="btn-edit" onclick="app.courses.editCourse('${course.id}')" title="Edit Course">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-delete" onclick="app.courses.deleteCoursePrompt('${course.id}', '${course.course_code}')" title="Delete Course">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            grid.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading courses:', error);
            const grid = document.getElementById('coursesGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Courses</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="app.courses.loadCourses()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    async editCourse(courseId) {
        try {
            // Check if getCourse method exists, otherwise fetch from getCourses
            let course;
            if (this.db.getCourse && typeof this.db.getCourse === 'function') {
                course = await this.db.getCourse(courseId);
            } else {
                // Fallback: get all courses and find the one we need
                const courses = await this.db.getCourses();
                course = courses.find(c => c.id === courseId);
            }
            
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            document.getElementById('courseCode').value = course.course_code;
            document.getElementById('courseName').value = course.course_name;
            document.getElementById('courseProgram').value = course.program;
            document.getElementById('courseCredits').value = course.credits || 3;
            document.getElementById('courseDescription').value = course.description || '';
            
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
                submitBtn.classList.remove('btn-primary');
                submitBtn.classList.add('btn-update');
            }
            
            this.openCourseModal();
            
        } catch (error) {
            console.error('Error editing course:', error);
            this.showToast(`Error loading course: ${error.message}`, 'error');
        }
    }

    async deleteCoursePrompt(courseId, courseCode) {
        const confirmMessage = `Are you sure you want to delete the course "${courseCode}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            await this.db.deleteCourse(courseId);
            this.showToast('✅ Course deleted successfully', 'success');
            
            const courseCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
            if (courseCard) {
                courseCard.style.opacity = '0.5';
                courseCard.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    courseCard.remove();
                    const grid = document.getElementById('coursesGrid');
                    if (grid && grid.children.length === 0) {
                        this.loadCourses();
                    }
                }, 300);
            }
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }
    
    // ===== MODAL FUNCTIONS =====
    
    openCourseModal() {
        const modal = document.getElementById('courseModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeCourseModal() {
        const modal = document.getElementById('courseModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        const form = document.getElementById('courseForm');
        if (form) {
            form.reset();
            delete form.dataset.editId;
        }
        const title = document.getElementById('courseModalTitle');
        if (title) {
            title.textContent = 'Add New Course';
        }
    }
    
    // ===== EXPORT FUNCTION =====
    
    async exportCourses() {
        try {
            const courses = await this.db.getCourses();
            // Simple export to console for now
            console.log('Courses data for export:', courses);
            this.showToast('Export feature coming soon', 'info');
            
            // You can implement actual export here:
            // - CSV export
            // - Excel export
            // - PDF export
        } catch (error) {
            console.error('Error exporting courses:', error);
            this.showToast('Error exporting courses', 'error');
        }
    }
    
    // ===== BULK GRADING FEATURES =====
    
    async openBulkGradeModal(courseId = null) {
        this.currentCourse = courseId;
        this.selectedStudents.clear();
        
        // Populate course dropdown
        const courseSelect = document.getElementById('bulkGradeCourse');
        if (courseSelect && courseId) {
            courseSelect.value = courseId;
        }
        
        // Load students for selected course
        await this.loadStudentsForBulkGrading();
        
        // Populate filters
        await this.populateBulkGradeFilters();
        
        // Show modal
        const modal = document.getElementById('bulkGradeModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    async loadStudentsForBulkGrading(courseId = null) {
        const courseIdToUse = courseId || this.currentCourse;
        if (!courseIdToUse) return;
        
        try {
            // Try to get course details
            let course;
            if (this.db.getCourse && typeof this.db.getCourse === 'function') {
                course = await this.db.getCourse(courseIdToUse);
            } else {
                const courses = await this.db.getCourses();
                course = courses.find(c => c.id === courseIdToUse);
            }
            
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }

            // Try to get students by course, or use fallback
            let students = [];
            if (this.db.getStudentsByCourse && typeof this.db.getStudentsByCourse === 'function') {
                students = await this.db.getStudentsByCourse(courseIdToUse);
            } else {
                // Fallback: get all students
                const allStudents = await this.db.getStudents();
                students = allStudents.slice(0, 5); // Just show first 5 as example
            }
            
            this.renderBulkGradeStudents(students, course);
            
        } catch (error) {
            console.error('❌ Error loading students for grading:', error);
            this.showToast('Error loading students', 'error');
        }
    }
    
    renderBulkGradeStudents(students, course) {
        const tbody = document.getElementById('bulkGradeStudentsList');
        if (!tbody) return;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-user-graduate fa-2x mb-2"></i>
                        <p>No students enrolled in this course</p>
                    </td>
                </tr>
            `;
            const submitBtn = document.getElementById('submitBulkGradesBtn');
            if (submitBtn) submitBtn.disabled = true;
            return;
        }
        
        const submitBtn = document.getElementById('submitBulkGradesBtn');
        if (submitBtn) submitBtn.disabled = false;
        
        let html = '';
        students.forEach((student, index) => {
            const existingGrade = student.existing_grade || '-';
            const existingScore = student.existing_score || '-';
            const studentId = student.id || student.student_id || `student-${index}`;
            
            html += `
                <tr data-student-id="${studentId}">
                    <td class="text-center">
                        <input type="checkbox" class="student-checkbox" 
                               data-student-id="${studentId}"
                               onchange="app.courses.toggleStudentSelection('${studentId}', this.checked)">
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || 'Student ' + (index + 1)}</strong>
                                <div class="text-muted small">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>${student.reg_number || 'REG-' + (index + 1)}</code></td>
                    <td>${student.centre_name || student.centre || '-'}</td>
                    <td>${student.intake_year || '-'}</td>
                    <td>
                        <span class="badge bg-${this.getGradeBadgeColor(existingGrade)}">
                            ${existingGrade}
                        </span>
                    </td>
                    <td>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control student-score" 
                                   data-student-id="${studentId}"
                                   placeholder="Score" min="0" max="100" step="0.01"
                                   value="${existingScore !== '-' ? existingScore : ''}">
                            <span class="input-group-text">/ 100</span>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        this.updateSelectedCount();
    }
    
    toggleStudentSelection(studentId, selected) {
        if (selected) {
            this.selectedStudents.add(studentId);
        } else {
            this.selectedStudents.delete(studentId);
        }
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${this.selectedStudents.size} students selected`;
        }
    }
    
    selectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            const studentId = checkbox.dataset.studentId;
            this.selectedStudents.add(studentId);
        });
        this.updateSelectedCount();
    }
    
    deselectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const studentId = checkbox.dataset.studentId;
            this.selectedStudents.delete(studentId);
        });
        this.updateSelectedCount();
    }
    
    async populateBulkGradeFilters() {
        // Populate intake years
        const intakeSelect = document.getElementById('bulkGradeIntake');
        if (intakeSelect) {
            const currentYear = new Date().getFullYear();
            intakeSelect.innerHTML = '<option value="">All Intakes</option>';
            for (let year = currentYear - 5; year <= currentYear + 1; year++) {
                intakeSelect.innerHTML += `<option value="${year}">${year}</option>`;
            }
        }
        
        // Populate centres
        const centreSelect = document.getElementById('bulkGradeCentre');
        if (centreSelect) {
            try {
                const centres = await this.db.getCentres();
                centreSelect.innerHTML = '<option value="">All Centres</option>';
                centres.forEach(centre => {
                    centreSelect.innerHTML += `<option value="${centre.name}">${centre.name}</option>`;
                });
            } catch (error) {
                console.error('Error loading centres:', error);
                // Create some default options
                centreSelect.innerHTML = `
                    <option value="">All Centres</option>
                    <option value="Main Campus">Main Campus</option>
                    <option value="Branch 1">Branch 1</option>
                    <option value="Branch 2">Branch 2</option>
                `;
            }
        }
        
        // Populate programs
        const programSelect = document.getElementById('bulkGradeProgram');
        if (programSelect) {
            try {
                const programs = await this.db.getPrograms();
                programSelect.innerHTML = '<option value="">All Programs</option>';
                programs.forEach(program => {
                    programSelect.innerHTML += `<option value="${program.id}">${program.name}</option>`;
                });
            } catch (error) {
                console.error('Error loading programs:', error);
                // Create some default options
                programSelect.innerHTML = `
                    <option value="">All Programs</option>
                    <option value="basic">Basic TEE</option>
                    <option value="hnc">HNC</option>
                    <option value="advanced">Advanced TEE</option>
                `;
            }
        }
    }
    
    async submitBulkGrades() {
        const courseId = document.getElementById('bulkGradeCourse')?.value;
        const assessmentType = document.getElementById('bulkGradeType')?.value;
        const assessmentDate = document.getElementById('bulkGradeDate')?.value;
        const maxScore = document.getElementById('bulkMaxScore')?.value || 100;
        
        if (!courseId) {
            this.showToast('Please select a course', 'error');
            return;
        }
        
        if (this.selectedStudents.size === 0) {
            this.showToast('Please select at least one student', 'error');
            return;
        }
        
        const sameScore = document.getElementById('bulkSameScore')?.value;
        const studentsToGrade = [];
        
        this.selectedStudents.forEach(studentId => {
            const scoreInput = document.querySelector(`.student-score[data-student-id="${studentId}"]`);
            const score = sameScore || (scoreInput ? scoreInput.value : null);
            
            if (score) {
                const percentage = (score / maxScore) * 100;
                const grade = this.calculateGrade(percentage);
                
                studentsToGrade.push({
                    student_id: studentId,
                    course_id: courseId,
                    score: parseFloat(score),
                    percentage: percentage,
                    grade: grade.grade,
                    grade_points: grade.points,
                    assessment_type: assessmentType,
                    assessment_date: assessmentDate,
                    max_score: parseFloat(maxScore)
                });
            }
        });
        
        if (studentsToGrade.length === 0) {
            this.showToast('No valid scores to save', 'error');
            return;
        }
        
        try {
            const results = await Promise.allSettled(
                studentsToGrade.map(gradeData => this.db.addMark(gradeData))
            );
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                this.showToast(`✅ ${successful} grades saved successfully${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
            }
            
            if (failed > 0) {
                console.error('Some grades failed to save:', results.filter(r => r.status === 'rejected'));
            }
            
            this.closeBulkGradeModal();
            await this.loadCourses();
            
        } catch (error) {
            console.error('❌ Error saving bulk grades:', error);
            this.showToast('Error saving grades', 'error');
        }
    }
    
    closeBulkGradeModal() {
        const modal = document.getElementById('bulkGradeModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        this.selectedStudents.clear();
        this.currentCourse = null;
    }
    
    // ===== END BULK GRADING FEATURES =====
    
    // Helper functions for grading
    getGradeBadgeColor(grade) {
        const gradeColors = {
            'DISTINCTION': 'success',
            'CREDIT': 'info',
            'PASS': 'warning',
            'FAIL': 'danger',
            '-': 'secondary'
        };
        return gradeColors[grade] || 'secondary';
    }
    
    calculateGrade(percentage) {
        if (percentage >= 85) return { grade: 'DISTINCTION', points: 4.0 };
        if (percentage >= 70) return { grade: 'CREDIT', points: 3.0 };
        if (percentage >= 50) return { grade: 'PASS', points: 2.0 };
        return { grade: 'FAIL', points: 0.0 };
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
