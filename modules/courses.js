// modules/courses.js - COMPLETE Course Management Module
class CourseManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.currentCourse = null;
        this.selectedStudents = new Set();
    }

    // Initialize the module
    async initialize() {
        console.log('📚 CourseManager initializing...');
        await this.loadCourses();
        this.setupEventListeners();
        this.updateCourseStats();
    }

    // Load all courses
    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            this.renderCourses(courses);
            this.populateCourseDropdowns();
            this.updateCourseStats();
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            this.app?.showToast('Error loading courses', 'error');
        }
    }

    // Render courses in grid and table views
    renderCourses(courses) {
        this.renderCourseGrid(courses);
        this.renderCourseTable(courses);
    }

    // Render grid view
    renderCourseGrid(courses) {
        const grid = document.getElementById('coursesGrid');
        if (!grid) return;

        if (!courses || courses.length === 0) {
            grid.innerHTML = this.getEmptyState();
            return;
        }

        let html = '';
        courses.forEach(course => {
            const enrolledStudents = course.enrolled_count || 0;
            const canGrade = enrolledStudents > 0;
            
            html += `
                <div class="card" data-course-id="${course.id}">
                    <div class="card-header" style="background: linear-gradient(135deg, ${this.getProgramColor(course.program_code)});">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h4 class="mb-0" style="color: white;">${course.course_code}</h4>
                                <small style="color: rgba(255,255,255,0.8);">${course.program_name || course.program_code}</small>
                            </div>
                            <span class="badge ${course.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                ${course.status || 'active'}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h5>${course.course_name}</h5>
                        <p class="text-muted mb-3">${course.description || 'No description available'}</p>
                        
                        <div class="course-meta mb-3">
                            <div class="meta-item">
                                <i class="fas fa-graduation-cap"></i>
                                <span>${course.credits || 3} Credits</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>${enrolledStudents} Students</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-layer-group"></i>
                                <span>${course.level || 'Basic'}</span>
                            </div>
                        </div>
                        
                        <div class="course-actions">
                            ${canGrade ? `
                                <button class="btn btn-sm btn-success me-2" onclick="app.courses.openBulkGradeModal('${course.id}')" title="Grade all students">
                                    <i class="fas fa-chart-line"></i> Grade
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="app.courses.editCourse('${course.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.courses.deleteCoursePrompt('${course.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">
                            <i class="fas fa-calendar"></i> Created: ${this.formatDate(course.created_at)}
                        </small>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    // Render table view
    renderCourseTable(courses) {
        const tbody = document.getElementById('coursesTableBody');
        if (!tbody) return;

        let html = '';
        courses.forEach(course => {
            const enrolledStudents = course.enrolled_count || 0;
            
            html += `
                <tr data-course-id="${course.id}">
                    <td><strong>${course.course_code}</strong></td>
                    <td>${course.course_name}</td>
                    <td>${course.program_name || course.program_code}</td>
                    <td class="text-center">${course.credits || 3}</td>
                    <td class="text-center">${enrolledStudents}</td>
                    <td>
                        <span class="badge ${course.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                            ${course.status || 'active'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${enrolledStudents > 0 ? `
                                <button class="btn btn-success" onclick="app.courses.openBulkGradeModal('${course.id}')" title="Grade all students">
                                    <i class="fas fa-chart-line"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-primary" onclick="app.courses.editCourse('${course.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // Open bulk grade modal
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
        modal.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Load students for bulk grading
    async loadStudentsForBulkGrading(courseId = null) {
        const courseIdToUse = courseId || this.currentCourse;
        if (!courseIdToUse) return;

        try {
            const course = await this.db.getCourse(courseIdToUse);
            if (!course) {
                this.app?.showToast('Course not found', 'error');
                return;
            }

            const students = await this.db.getStudentsByCourse(courseIdToUse);
            this.renderBulkGradeStudents(students, course);
            
        } catch (error) {
            console.error('❌ Error loading students for grading:', error);
            this.app?.showToast('Error loading students', 'error');
        }
    }

    // Render students for bulk grading
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
            document.getElementById('submitBulkGradesBtn').disabled = true;
            return;
        }

        document.getElementById('submitBulkGradesBtn').disabled = false;
        
        let html = '';
        students.forEach(student => {
            const existingGrade = student.existing_grade || '-';
            const existingScore = student.existing_score || '-';
            const studentId = student.id || student.student_id;
            
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
                                <strong>${student.full_name}</strong>
                                <div class="text-muted small">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>${student.reg_number}</code></td>
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

    // Toggle student selection
    toggleStudentSelection(studentId, selected) {
        if (selected) {
            this.selectedStudents.add(studentId);
        } else {
            this.selectedStudents.delete(studentId);
        }
        this.updateSelectedCount();
    }

    // Update selected count display
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${this.selectedStudents.size} students selected`;
        }
    }

    // Select all students
    selectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            const studentId = checkbox.dataset.studentId;
            this.selectedStudents.add(studentId);
        });
        this.updateSelectedCount();
    }

    // Deselect all students
    deselectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const studentId = checkbox.dataset.studentId;
            this.selectedStudents.delete(studentId);
        });
        this.updateSelectedCount();
    }

    // Filter students based on selected criteria
    async filterStudentsForGrading() {
        const intake = document.getElementById('bulkGradeIntake')?.value;
        const centre = document.getElementById('bulkGradeCentre')?.value;
        const program = document.getElementById('bulkGradeProgram')?.value;
        
        // In a real implementation, you would filter from the server
        // For now, we'll filter client-side from the current list
        const rows = document.querySelectorAll('#bulkGradeStudentsList tr[data-student-id]');
        
        rows.forEach(row => {
            let shouldShow = true;
            const studentIntake = row.cells[4].textContent;
            const studentCentre = row.cells[3].textContent;
            const studentProgram = ''; // You would need to store this data
            
            if (intake && studentIntake !== intake) shouldShow = false;
            if (centre && studentCentre !== centre) shouldShow = false;
            if (program && studentProgram !== program) shouldShow = false;
            
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    // Submit bulk grades
    async submitBulkGrades() {
        const courseId = document.getElementById('bulkGradeCourse')?.value;
        const assessmentType = document.getElementById('bulkGradeType')?.value;
        const assessmentDate = document.getElementById('bulkGradeDate')?.value;
        const maxScore = document.getElementById('bulkMaxScore')?.value || 100;
        
        if (!courseId) {
            this.app?.showToast('Please select a course', 'error');
            return;
        }
        
        if (this.selectedStudents.size === 0) {
            this.app?.showToast('Please select at least one student', 'error');
            return;
        }
        
        const sameScore = document.getElementById('bulkSameScore')?.value;
        const studentsToGrade = [];
        
        // Collect all students' scores
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
            this.app?.showToast('No valid scores to save', 'error');
            return;
        }
        
        try {
            // Save grades in bulk
            const results = await Promise.allSettled(
                studentsToGrade.map(gradeData => this.db.addMark(gradeData))
            );
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                this.app?.showToast(`✅ ${successful} grades saved successfully${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
            }
            
            if (failed > 0) {
                console.error('Some grades failed to save:', results.filter(r => r.status === 'rejected'));
            }
            
            // Close modal and refresh
            this.closeBulkGradeModal();
            await this.loadCourses(); // Refresh course data
            
        } catch (error) {
            console.error('❌ Error saving bulk grades:', error);
            this.app?.showToast('Error saving grades', 'error');
        }
    }

    // Close bulk grade modal
    closeBulkGradeModal() {
        const modal = document.getElementById('bulkGradeModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.selectedStudents.clear();
        this.currentCourse = null;
    }

    // Populate bulk grade filters
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
            }
        }
    }

    // Populate course dropdowns
    async populateCourseDropdowns() {
        try {
            const courses = await this.db.getCourses();
            const courseSelect = document.getElementById('bulkGradeCourse');
            const filterCourseSelect = document.getElementById('filterCourseProgram');
            
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">Select Course</option>';
                courses.forEach(course => {
                    courseSelect.innerHTML += `<option value="${course.id}">${course.course_code} - ${course.course_name}</option>`;
                });
            }
            
            if (filterCourseSelect) {
                filterCourseSelect.innerHTML = '<option value="">All Programs</option>';
                const uniquePrograms = [...new Set(courses.map(c => c.program_code))];
                uniquePrograms.forEach(program => {
                    filterCourseSelect.innerHTML += `<option value="${program}">${program}</option>`;
                });
            }
        } catch (error) {
            console.error('Error populating course dropdowns:', error);
        }
    }

    // Update course statistics
    async updateCourseStats() {
        try {
            const courses = await this.db.getCourses();
            const totalCourses = courses.length;
            const activeCourses = courses.filter(c => c.status === 'active').length;
            const enrolledStudents = courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0);
            const avgCredits = totalCourses > 0 
                ? (courses.reduce((sum, course) => sum + (course.credits || 0), 0) / totalCourses).toFixed(1)
                : 0;
            
            // Update UI elements
            document.getElementById('totalCourses')?.textContent = totalCourses;
            document.getElementById('activeCourses')?.textContent = activeCourses;
            document.getElementById('totalStudentsEnrolled')?.textContent = enrolledStudents;
            document.getElementById('avgCredits')?.textContent = avgCredits;
            document.getElementById('coursesToGrade')?.textContent = courses.filter(c => (c.enrolled_count || 0) > 0).length;
            
            // Show/hide bulk grade button
            const bulkGradeBtn = document.getElementById('bulkGradeBtn');
            if (bulkGradeBtn) {
                bulkGradeBtn.style.display = totalCourses > 0 ? 'inline-block' : 'none';
            }
            
        } catch (error) {
            console.error('Error updating course stats:', error);
        }
    }

    // Course CRUD operations (existing functions)
    async saveCourse(event) {
        event.preventDefault();
        
        try {
            const courseData = {
                course_code: document.getElementById('courseCode').value.trim(),
                course_name: document.getElementById('courseName').value.trim(),
                program_code: document.getElementById('courseProgram').value,
                credits: parseInt(document.getElementById('courseCredits').value) || 3,
                level: document.getElementById('courseLevel').value || 'basic',
                status: document.getElementById('courseStatus').value || 'active',
                description: document.getElementById('courseDescription').value.trim(),
                type: document.getElementById('courseType').value || 'core',
                semester: document.getElementById('courseSemester').value || null,
                min_grade: parseInt(document.getElementById('courseMinGrade').value) || 50,
                max_students: parseInt(document.getElementById('courseMaxStudents').value) || 100,
                prerequisites: document.getElementById('coursePrerequisites').value || null,
                notes: document.getElementById('courseNotes').value || null
            };
            
            // Validation
            if (!courseData.course_code) {
                this.app?.showToast('Please enter a course code', 'error');
                return;
            }
            
            if (!courseData.course_name) {
                this.app?.showToast('Please enter a course name', 'error');
                return;
            }
            
            const form = document.getElementById('courseForm');
            const isEditMode = form.dataset.editId;
            
            let course;
            if (isEditMode) {
                course = await this.db.updateCourse(isEditMode, courseData);
                this.app?.showToast(`✅ Course "${course.course_code}" updated successfully`, 'success');
                delete form.dataset.editId;
                document.getElementById('courseModalTitle').textContent = 'Add New Course';
            } else {
                course = await this.db.addCourse(courseData);
                this.app?.showToast(`✅ Course "${course.course_code}" added successfully`, 'success');
            }
            
            this.closeCourseModal();
            await this.loadCourses();
            
        } catch (error) {
            console.error('❌ Error saving course:', error);
            this.app?.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }

    async editCourse(courseId) {
        try {
            const course = await this.db.getCourse(courseId);
            if (!course) {
                this.app?.showToast('Course not found', 'error');
                return;
            }
            
            // Populate form fields
            document.getElementById('courseCode').value = course.course_code || '';
            document.getElementById('courseName').value = course.course_name || '';
            document.getElementById('courseProgram').value = course.program_code || '';
            document.getElementById('courseCredits').value = course.credits || 3;
            document.getElementById('courseLevel').value = course.level || 'basic';
            document.getElementById('courseStatus').value = course.status || 'active';
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseType').value = course.type || 'core';
            document.getElementById('courseSemester').value = course.semester || '';
            document.getElementById('courseMinGrade').value = course.min_grade || 50;
            document.getElementById('courseMaxStudents').value = course.max_students || 100;
            document.getElementById('coursePrerequisites').value = course.prerequisites || '';
            document.getElementById('courseNotes').value = course.notes || '';
            
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            document.getElementById('courseModalTitle').textContent = 'Edit Course';
            
            this.openCourseModal();
            
        } catch (error) {
            console.error('❌ Error editing course:', error);
            this.app?.showToast(`Error loading course: ${error.message}`, 'error');
        }
    }

    async deleteCoursePrompt(courseId) {
        const course = await this.db.getCourse(courseId);
        if (!course) return;
        
        const confirmDelete = confirm(`Are you sure you want to delete "${course.course_code} - ${course.course_name}"?\n\nThis will also delete all associated grades and enrollments.`);
        
        if (!confirmDelete) return;
        
        try {
            await this.db.deleteCourse(courseId);
            this.app?.showToast('✅ Course deleted successfully', 'success');
            await this.loadCourses();
        } catch (error) {
            console.error('❌ Error deleting course:', error);
            this.app?.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }

    // Search courses
    async searchCourses(query) {
        try {
            const courses = await this.db.getCourses();
            const filtered = courses.filter(course => 
                course.course_code.toLowerCase().includes(query.toLowerCase()) ||
                course.course_name.toLowerCase().includes(query.toLowerCase()) ||
                (course.description && course.description.toLowerCase().includes(query.toLowerCase()))
            );
            this.renderCourses(filtered);
        } catch (error) {
            console.error('Error searching courses:', error);
        }
    }

    // Filter courses
    async filterCourses() {
        try {
            const courses = await this.db.getCourses();
            const programFilter = document.getElementById('filterProgram')?.value;
            const levelFilter = document.getElementById('filterLevel')?.value;
            const statusFilter = document.getElementById('filterStatus')?.value;
            
            const filtered = courses.filter(course => {
                let match = true;
                if (programFilter && course.program_code !== programFilter) match = false;
                if (levelFilter && course.level !== levelFilter) match = false;
                if (statusFilter && course.status !== statusFilter) match = false;
                return match;
            });
            
            this.renderCourses(filtered);
        } catch (error) {
            console.error('Error filtering courses:', error);
        }
    }

    // Toggle view between grid and table
    setCoursesView(view) {
        const grid = document.getElementById('coursesGrid');
        const table = document.getElementById('coursesTableContainer');
        const gridBtn = document.querySelector('[data-view="grid"]');
        const tableBtn = document.querySelector('[data-view="table"]');
        
        if (view === 'grid') {
            grid.style.display = 'grid';
            table.style.display = 'none';
            gridBtn?.classList.add('active');
            tableBtn?.classList.remove('active');
        } else {
            grid.style.display = 'none';
            table.style.display = 'block';
            gridBtn?.classList.remove('active');
            tableBtn?.classList.add('active');
        }
    }

    // Modal functions
    openCourseModal() {
        document.getElementById('courseModal').style.display = 'block';
    }

    closeCourseModal() {
        document.getElementById('courseModal').style.display = 'none';
        document.getElementById('courseForm').reset();
        delete document.getElementById('courseForm').dataset.editId;
        document.getElementById('courseModalTitle').textContent = 'Add New Course';
    }

    // Export courses
    async exportCourses() {
        try {
            const courses = await this.db.getCourses();
            // Export logic here
            this.app?.showToast('Export feature coming soon', 'info');
        } catch (error) {
            console.error('Error exporting courses:', error);
            this.app?.showToast('Error exporting courses', 'error');
        }
    }

    // Helper functions
    getProgramColor(programCode) {
        const colors = {
            'TEE': '#3498db, #2980b9',
            'HNC': '#2ecc71, #27ae60',
            'ATE': '#9b59b6, #8e44ad',
            'DIP': '#e74c3c, #c0392b',
            'CERT': '#f39c12, #d35400'
        };
        return colors[programCode] || '#95a5a6, #7f8c8d';
    }

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

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-book-open fa-3x"></i>
                <h3>No Courses Found</h3>
                <p>Add your first course to get started</p>
                <button class="btn-primary" onclick="app.courses.openCourseModal()">
                    <i class="fas fa-plus"></i> Add Course
                </button>
            </div>
        `;
    }

    // Setup event listeners
    setupEventListeners() {
        // Course form submission
        const courseForm = document.getElementById('courseForm');
        if (courseForm) {
            courseForm.addEventListener('submit', (e) => this.saveCourse(e));
        }
        
        // Course search
        const courseSearch = document.getElementById('courseSearch');
        if (courseSearch) {
            courseSearch.addEventListener('input', (e) => this.searchCourses(e.target.value));
        }
        
        // Course filters
        ['filterProgram', 'filterLevel', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterCourses());
            }
        });
        
        // Bulk grade modal close
        const closeButtons = document.querySelectorAll('#bulkGradeModal .close, #bulkGradeModal .btn-secondary');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeBulkGradeModal());
        });
        
        // Bulk grade course selection
        const bulkGradeCourse = document.getElementById('bulkGradeCourse');
        if (bulkGradeCourse) {
            bulkGradeCourse.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.currentCourse = e.target.value;
                    this.loadStudentsForBulkGrading();
                }
            });
        }
        
        // Bulk grade filters
        ['bulkGradeIntake', 'bulkGradeCentre', 'bulkGradeProgram'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterStudentsForGrading());
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CourseManager;
}
