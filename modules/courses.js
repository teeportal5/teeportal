// modules/courses.js - COMPLETE WORKING VERSION WITH ALL FIXES
class CourseManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.currentCourse = null;
        this.selectedStudents = new Set();
        this.currentView = 'grid';
        this.programs = [];
        this.studyCenters = [];
        this.intakeYears = [];
        
        // Initialize global functions for HTML onclick handlers
        this.registerGlobalFunctions();
        
        // Initialize data
        this.initializeData();
    }
    
    // Initialize data from database
    async initializeData() {
        try {
            // Load programs
            this.programs = await this.db.getPrograms();
            
            // Load study centers
            this.studyCenters = await this.db.getStudyCenters();
            
            // Generate intake years (last 5 years + next 2 years)
            this.generateIntakeYears();
            
            // Populate dropdowns
            this.populateDropdowns();
            
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    }
    
    // Generate intake years
    generateIntakeYears() {
        const currentYear = new Date().getFullYear();
        this.intakeYears = [];
        
        // Last 5 years
        for (let i = 5; i >= 1; i--) {
            this.intakeYears.push(currentYear - i);
        }
        
        // Current year and next 2 years
        for (let i = 0; i < 3; i++) {
            this.intakeYears.push(currentYear + i);
        }
        
        // Sort descending
        this.intakeYears.sort((a, b) => b - a);
    }
    
    // Populate all dropdowns
    populateDropdowns() {
        // Populate program dropdowns
        this.populateProgramDropdown('courseProgram');
        this.populateProgramDropdown('filterProgram');
        
        // Populate level dropdowns
        this.populateLevelDropdown('courseLevel');
        this.populateLevelDropdown('filterLevel');
        
        // Populate study center dropdown (for enrollment)
        this.populateStudyCenterDropdown();
        
        // Populate intake year dropdown (for enrollment)
        this.populateIntakeYearDropdown();
    }
    
    // Populate program dropdown
    populateProgramDropdown(elementId) {
        const select = document.getElementById(elementId);
        if (!select) return;
        
        select.innerHTML = '<option value="">All Programs</option>';
        
        this.programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program.code || program.id;
            option.textContent = program.name || program.program_name || program.code;
            select.appendChild(option);
        });
    }
    
    // Populate level dropdown
    populateLevelDropdown(elementId) {
        const select = document.getElementById(elementId);
        if (!select) return;
        
        const levels = ['basic', 'intermediate', 'advanced'];
        const levelLabels = {
            'basic': 'Basic Level',
            'intermediate': 'Intermediate Level',
            'advanced': 'Advanced Level'
        };
        
        select.innerHTML = '<option value="">All Levels</option>';
        
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = levelLabels[level] || level;
            select.appendChild(option);
        });
    }
    
    // Populate study center dropdown
    populateStudyCenterDropdown() {
        const select = document.getElementById('enrollmentStudyCenter');
        if (!select) return;
        
        select.innerHTML = '<option value="">All Study Centers</option>';
        
        this.studyCenters.forEach(center => {
            const option = document.createElement('option');
            option.value = center.id;
            option.textContent = center.name || center.centre_name || `Center ${center.id}`;
            select.appendChild(option);
        });
    }
    
    // Populate intake year dropdown
    populateIntakeYearDropdown() {
        const select = document.getElementById('enrollmentIntakeYear');
        if (!select) return;
        
        select.innerHTML = '<option value="">All Intake Years</option>';
        
        this.intakeYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
    }
    
    // Register all global functions that your HTML calls
    registerGlobalFunctions() {
        // Course modal functions
        window.openCourseModal = () => this.openCourseModal();
        window.saveCourse = (e) => this.saveCourse(e);
        window.closeCourseModal = () => this.closeCourseModal();
        
        // Bulk grade modal functions
        window.openBulkGradeModal = () => this.openBulkGradeModal();
        window.closeBulkGradeModal = () => this.closeBulkGradeModal();
        window.loadStudentsForBulkGrading = () => this.loadStudentsForBulkGrading();
        window.filterStudentsForGrading = () => this.filterStudentsForGrading();
        window.selectAllStudents = () => this.selectAllStudents();
        window.deselectAllStudents = () => this.deselectAllStudents();
        window.submitBulkGrades = () => this.submitBulkGrades();
        
        // Global toggle functions
        window.toggleAllStudents = (checked) => this.toggleAllStudents(checked);
        window.toggleStudentSelection = (checkbox) => this.toggleStudentSelection(checkbox);
        
        // View toggle function
        window.setCoursesView = (view) => this.setCoursesView(view);
        
        // Initialize app.courses object
        window.app = window.app || {};
        window.app.courses = this; // Set to current instance
    }
    
    // ===== COURSE MANAGEMENT =====
    
    async saveCourse(event) {
        if (event) event.preventDefault();
        
        try {
            const courseData = {
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                program: document.getElementById('courseProgram').value,
                level: document.getElementById('courseLevel').value,
                credits: parseInt(document.getElementById('courseCredits').value),
                description: document.getElementById('courseDescription').value.trim(),
                status: document.getElementById('courseStatus').value
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
            
            const form = document.getElementById('courseForm');
            const isEditMode = form.dataset.editId;
            
            let course;
            if (isEditMode) {
                // Update existing course
                course = await this.db.updateCourse(isEditMode, courseData);
                this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" updated successfully`, 'success');
                delete form.dataset.editId;
                
                // Reset modal to "Add New" mode
                document.getElementById('courseModalTitle').textContent = 'Add New Course';
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
                }
            } else {
                // Add new course
                course = await this.db.addCourse(courseData);
                this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" added successfully`, 'success');
            }
            
            this.closeCourseModal();
            form.reset();
            document.getElementById('courseCredits').value = 3;
            document.getElementById('courseStatus').value = 'active';
            
            await this.loadCourses();
            await this.updateStatistics();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            
            // Update UI
            this.updateCoursesGrid(courses);
            this.updateCoursesTable(courses);
            this.updateBulkGradeCourseDropdown(courses);
            
            // Update statistics
            await this.updateStatistics();
            
            // Show/hide bulk grade button
            const bulkGradeBtn = document.getElementById('bulkGradeBtn');
            if (bulkGradeBtn) {
                const hasEnrolledStudents = courses.some(c => (c.enrolled_count || 0) > 0);
                bulkGradeBtn.style.display = hasEnrolledStudents ? 'inline-block' : 'none';
            }
            
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showToast('Error loading courses', 'error');
        }
    }
    
    updateCoursesGrid(courses) {
        const grid = document.getElementById('coursesGrid');
        if (!grid) return;
        
        if (!courses || courses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book fa-3x"></i>
                    <h3>No Courses Found</h3>
                    <p>Get started by adding your first course</p>
                    <button class="btn btn-primary" onclick="openCourseModal()">
                        <i class="fas fa-plus"></i> Add Your First Course
                    </button>
                </div>
            `;
            return;
        }
        
        const programNames = {};
        this.programs.forEach(p => {
            programNames[p.code || p.id] = p.name || p.program_name || p.code;
        });
        
        const levelColors = {
            'basic': '#3498db',
            'intermediate': '#2ecc71',
            'advanced': '#9b59b6'
        };
        
        let html = '';
        courses.forEach(course => {
            const programName = programNames[course.program] || course.program;
            const levelColor = levelColors[course.level] || '#95a5a6';
            const enrolledStudents = course.enrolled_count || 0;
            const status = course.status || 'active';
            const canGrade = enrolledStudents > 0;
            
            // Escape quotes for onclick handlers
            const safeCode = course.course_code.replace(/'/g, "\\'");
            
            html += `
                <div class="card" data-course-id="${course.id}">
                    <div class="card-header" style="border-left: 4px solid ${levelColor};">
                        <div class="card-header-content">
                            <h3>${course.course_code}</h3>
                            <span class="badge ${status === 'active' ? 'badge-success' : 'badge-secondary'}">
                                ${status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h4>${course.course_name}</h4>
                        <p class="card-text">${course.description || 'No description available'}</p>
                        <div class="card-meta">
                            <span><i class="fas fa-graduation-cap"></i> ${programName}</span>
                            <span><i class="fas fa-layer-group"></i> ${course.level || 'basic'}</span>
                            <span><i class="fas fa-star"></i> ${course.credits || 3} Credits</span>
                        </div>
                        <div class="card-stats">
                            <span><i class="fas fa-users"></i> ${enrolledStudents} Students Enrolled</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-info" onclick="app.courses.openCourseEnrollmentModal('${course.id}')" 
                                title="Manage Enrollments">
                            <i class="fas fa-user-plus"></i> Enroll
                        </button>
                        ${canGrade ? `
                            <button class="btn btn-sm btn-success" onclick="app.courses.openBulkGradeForCourse('${course.id}')" 
                                    title="Grade Students">
                                <i class="fas fa-chart-line"></i> Grade
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-primary" onclick="app.courses.editCourse('${course.id}')" 
                                title="Edit Course">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}', '${safeCode}')" 
                                title="Delete Course">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }
    
    updateCoursesTable(courses) {
        const tbody = document.getElementById('coursesTableBody');
        if (!tbody) return;
        
        if (!courses || courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-book fa-2x mb-2"></i>
                        <p>No courses found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const programNames = {};
        this.programs.forEach(p => {
            programNames[p.code || p.id] = p.name || p.program_name || p.code;
        });
        
        let html = '';
        courses.forEach(course => {
            const enrolledStudents = course.enrolled_count || 0;
            const status = course.status || 'active';
            const programName = programNames[course.program] || course.program;
            const safeCode = course.course_code.replace(/'/g, "\\'");
            
            html += `
                <tr data-course-id="${course.id}">
                    <td><strong>${course.course_code}</strong></td>
                    <td>${course.course_name}</td>
                    <td>${programName}</td>
                    <td>${course.credits || 3}</td>
                    <td>
                        <span class="badge ${enrolledStudents > 0 ? 'badge-info' : 'badge-secondary'}">
                            ${enrolledStudents}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${status === 'active' ? 'badge-success' : 'badge-secondary'}">
                            ${status.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-info" onclick="app.courses.openCourseEnrollmentModal('${course.id}')" title="Enroll">
                                <i class="fas fa-user-plus"></i>
                            </button>
                            ${enrolledStudents > 0 ? `
                                <button class="btn btn-sm btn-success" onclick="app.courses.openBulkGradeForCourse('${course.id}')" title="Grade">
                                    <i class="fas fa-chart-line"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" onclick="app.courses.editCourse('${course.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}', '${safeCode}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // EDIT COURSE - FIXED (No recursion)
    async editCourse(courseId) {
        try {
            console.log('Editing course:', courseId);
            
            // Get course from database
            let course;
            if (this.db.getCourse && typeof this.db.getCourse === 'function') {
                course = await this.db.getCourse(courseId);
            } else {
                const courses = await this.db.getCourses();
                course = courses.find(c => c.id === courseId);
            }
            
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            // Populate form fields
            document.getElementById('courseCode').value = course.course_code || '';
            document.getElementById('courseName').value = course.course_name || '';
            document.getElementById('courseProgram').value = course.program || '';
            document.getElementById('courseLevel').value = course.level || 'basic';
            document.getElementById('courseCredits').value = course.credits || 3;
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseStatus').value = course.status || 'active';
            
            // Set edit mode
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            // Update modal title and button
            document.getElementById('courseModalTitle').textContent = 'Edit Course';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
                submitBtn.className = 'btn btn-warning';
            }
            
            // Open the modal
            this.openCourseModal();
            
        } catch (error) {
            console.error('Error editing course:', error);
            this.showToast(`Error loading course: ${error.message}`, 'error');
        }
    }
    
    // DELETE COURSE PROMPT - FIXED (No recursion)
    async deleteCoursePrompt(courseId, courseCode) {
        const confirmMessage = `Are you sure you want to delete the course "${courseCode}"?\n\nThis action will also delete all enrollments and grades associated with this course.\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            console.log('Deleting course:', courseId);
            await this.db.deleteCourse(courseId);
            this.showToast('✅ Course deleted successfully', 'success');
            
            // Reload courses
            await this.loadCourses();
            await this.updateStatistics();
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }
    
    // ===== ENROLLMENT MANAGEMENT =====
    
    async openCourseEnrollmentModal(courseId) {
        try {
            this.currentCourse = courseId;
            
            // Get course details
            let course;
            if (this.db.getCourse && typeof this.db.getCourse === 'function') {
                course = await this.db.getCourse(courseId);
            } else {
                const courses = await this.db.getCourses();
                course = courses.find(c => c.id === courseId);
            }
            
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            // Get enrolled students
            let enrolledStudents = [];
            if (this.db.getStudentsByCourse && typeof this.db.getStudentsByCourse === 'function') {
                enrolledStudents = await this.db.getStudentsByCourse(courseId);
            }
            
            // Get all active students
            const allStudents = await this.db.getStudents();
            const enrolledStudentIds = enrolledStudents.map(s => s.id);
            const availableStudents = allStudents.filter(s => 
                s.status === 'active' && !enrolledStudentIds.includes(s.id)
            );
            
            // Show enrollment modal
            this.showEnrollmentModal(course, enrolledStudents, availableStudents);
            
        } catch (error) {
            console.error('❌ Error opening enrollment modal:', error);
            this.showToast('Error loading enrollment data', 'error');
        }
    }
    
    showEnrollmentModal(course, enrolledStudents, availableStudents) {
        const modalHtml = `
            <div class="modal active" id="enrollmentModal" style="display: block;">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> Manage Enrollments: ${course.course_code}</h3>
                        <span class="close" onclick="document.getElementById('enrollmentModal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="enrollment-info">
                            <h4>${course.course_code} - ${course.course_name}</h4>
                            <p>${course.description || 'No description'}</p>
                            <div class="enrollment-stats">
                                <span class="badge badge-info"><i class="fas fa-users"></i> ${enrolledStudents.length} Enrolled</span>
                                <span class="badge badge-secondary"><i class="fas fa-user-plus"></i> ${availableStudents.length} Available</span>
                            </div>
                        </div>
                        
                        <div class="enrollment-controls mb-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <label>Filter by Study Center:</label>
                                    <select id="enrollmentStudyCenter" class="form-control" onchange="app.courses.filterEnrollmentLists()">
                                        <option value="">All Centers</option>
                                        ${this.studyCenters.map(c => `
                                            <option value="${c.id}">${c.name || c.centre_name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label>Filter by Intake Year:</label>
                                    <select id="enrollmentIntakeYear" class="form-control" onchange="app.courses.filterEnrollmentLists()">
                                        <option value="">All Years</option>
                                        ${this.intakeYears.map(year => `
                                            <option value="${year}">${year}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="enrollment-sections">
                            <!-- Enrolled Students -->
                            <div class="enrollment-section">
                                <h5><i class="fas fa-users"></i> Currently Enrolled (${enrolledStudents.length})</h5>
                                ${this.renderEnrollmentList(enrolledStudents, true, course.id)}
                            </div>
                            
                            <!-- Available Students -->
                            <div class="enrollment-section">
                                <h5><i class="fas fa-user-plus"></i> Available Students (${availableStudents.length})</h5>
                                ${this.renderEnrollmentList(availableStudents, false, course.id)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('enrollmentModal').remove()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('enrollmentModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to DOM
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
        
        // Add CSS for enrollment modal if not exists
        this.addEnrollmentModalCSS();
    }
    
    renderEnrollmentList(students, isEnrolled, courseId) {
        if (!students || students.length === 0) {
            return `
                <div class="empty-list">
                    <i class="fas fa-user-graduate fa-2x"></i>
                    <p>No students found</p>
                </div>
            `;
        }
        
        let html = `
            <div class="student-list">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Reg Number</th>
                            <th>Study Center</th>
                            <th>Intake Year</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.forEach(student => {
            html += `
                <tr data-student-id="${student.id}" data-center="${student.centre_id || ''}" data-intake="${student.intake_year || ''}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || 'Unknown Student'}</strong>
                                <div class="text-muted small">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>${student.reg_number || 'N/A'}</code></td>
                    <td>${this.getStudyCenterName(student.centre_id)}</td>
                    <td>${student.intake_year || 'N/A'}</td>
                    <td>
                        ${isEnrolled ? `
                            <button class="btn btn-sm btn-danger" onclick="app.courses.removeEnrollment('${courseId}', '${student.id}')" 
                                    title="Remove from course">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success" onclick="app.courses.addEnrollment('${courseId}', '${student.id}')" 
                                    title="Add to course">
                                <i class="fas fa-user-plus"></i> Enroll
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
    
    async addEnrollment(courseId, studentId) {
        try {
            const enrollmentData = {
                course_id: courseId,
                student_id: studentId,
                enrollment_date: new Date().toISOString().split('T')[0],
                status: 'active'
            };
            
            await this.db.addEnrollment(enrollmentData);
            this.showToast('✅ Student enrolled successfully', 'success');
            
            // Refresh the modal
            await this.openCourseEnrollmentModal(courseId);
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error adding enrollment:', error);
            this.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }
    
    async removeEnrollment(courseId, studentId) {
        if (!confirm('Are you sure you want to remove this student from the course?')) {
            return;
        }
        
        try {
            await this.db.removeEnrollment(courseId, studentId);
            this.showToast('✅ Student removed from course', 'success');
            
            // Refresh the modal
            await this.openCourseEnrollmentModal(courseId);
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error removing enrollment:', error);
            this.showToast(`❌ Error: ${error.message}`, 'error');
        }
    }
    
    filterEnrollmentLists() {
        const centerFilter = document.getElementById('enrollmentStudyCenter')?.value;
        const yearFilter = document.getElementById('enrollmentIntakeYear')?.value;
        
        // Filter enrolled students table
        const enrolledRows = document.querySelectorAll('#enrollmentModal tbody tr');
        enrolledRows.forEach(row => {
            const center = row.dataset.center;
            const year = row.dataset.intake;
            
            const centerMatch = !centerFilter || center === centerFilter;
            const yearMatch = !yearFilter || year === yearFilter;
            
            row.style.display = centerMatch && yearMatch ? '' : 'none';
        });
    }
    
    getStudyCenterName(centerId) {
        const center = this.studyCenters.find(c => c.id === centerId);
        return center ? (center.name || center.centre_name) : 'Unknown Center';
    }
    
    // ===== BULK GRADING =====
    
    openBulkGradeModal() {
        // Clear previous selections
        this.selectedStudents.clear();
        this.currentCourse = null;
        
        // Reset form
        const courseSelect = document.getElementById('bulkGradeCourse');
        if (courseSelect) courseSelect.value = '';
        
        const sameScore = document.getElementById('bulkSameScore');
        if (sameScore) sameScore.value = '';
        
        // Clear students list
        const tbody = document.getElementById('bulkGradeStudentsList');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-3">
                        <i class="fas fa-user-graduate fa-2x mb-2"></i>
                        <p>Select a course to load students</p>
                    </td>
                </tr>
            `;
        }
        
        // Update selected count
        this.updateSelectedCount();
        
        // Show modal
        const modal = document.getElementById('bulkGradeModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    openBulkGradeForCourse(courseId) {
        this.currentCourse = courseId;
        const courseSelect = document.getElementById('bulkGradeCourse');
        if (courseSelect) {
            courseSelect.value = courseId;
            this.loadStudentsForBulkGrading();
        }
        this.openBulkGradeModal();
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
    
    async loadStudentsForBulkGrading() {
        const courseId = document.getElementById('bulkGradeCourse')?.value;
        if (!courseId) return;
        
        try {
            // Get course details
            let course;
            if (this.db.getCourse && typeof this.db.getCourse === 'function') {
                course = await this.db.getCourse(courseId);
            } else {
                const courses = await this.db.getCourses();
                course = courses.find(c => c.id === courseId);
            }
            
            if (!course) {
                this.showToast('Course not found', 'error');
                return;
            }
            
            // Get students enrolled in this course
            let students = [];
            if (this.db.getStudentsByCourse && typeof this.db.getStudentsByCourse === 'function') {
                students = await this.db.getStudentsByCourse(courseId);
            } else {
                this.showToast('Enrollment system not available', 'error');
                return;
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
            const isSelected = this.selectedStudents.has(studentId);
            
            html += `
                <tr data-student-id="${studentId}">
                    <td class="text-center">
                        <input type="checkbox" class="student-checkbox" 
                               data-student-id="${studentId}"
                               ${isSelected ? 'checked' : ''}
                               onchange="toggleStudentSelection(this)">
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
                    <td>${this.getStudyCenterName(student.centre_id)}</td>
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
    
    toggleAllStudents(checked) {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const studentId = cb.dataset.studentId;
            if (checked) {
                this.selectedStudents.add(studentId);
            } else {
                this.selectedStudents.delete(studentId);
            }
        });
        this.updateSelectedCount();
    }
    
    toggleStudentSelection(checkbox) {
        const studentId = checkbox.dataset.studentId;
        if (checkbox.checked) {
            this.selectedStudents.add(studentId);
        } else {
            this.selectedStudents.delete(studentId);
        }
        this.updateSelectedCount();
    }
    
    selectAllStudents() {
        this.toggleAllStudents(true);
    }
    
    deselectAllStudents() {
        this.toggleAllStudents(false);
    }
    
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${this.selectedStudents.size} students selected`;
        }
    }
    
    async submitBulkGrades() {
        const courseId = document.getElementById('bulkGradeCourse')?.value;
        const assessmentType = document.getElementById('bulkGradeType')?.value || 'Final Exam';
        const assessmentDate = document.getElementById('bulkGradeDate')?.value || new Date().toISOString().split('T')[0];
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
        
        // Collect scores for selected students
        this.selectedStudents.forEach(studentId => {
            let score;
            
            if (sameScore) {
                score = parseFloat(sameScore);
            } else {
                const scoreInput = document.querySelector(`.student-score[data-student-id="${studentId}"]`);
                score = scoreInput ? parseFloat(scoreInput.value) : null;
            }
            
            if (score !== null && !isNaN(score)) {
                const percentage = (score / maxScore) * 100;
                const grade = this.calculateGrade(percentage);
                
                studentsToGrade.push({
                    student_id: studentId,
                    course_id: courseId,
                    score: score,
                    percentage: percentage,
                    grade: grade.grade,
                    grade_points: grade.points,
                    assessment_type: assessmentType,
                    assessment_date: assessmentDate,
                    max_score: parseFloat(maxScore),
                    created_by: 'system'
                });
            }
        });
        
        if (studentsToGrade.length === 0) {
            this.showToast('No valid scores to save', 'error');
            return;
        }
        
        try {
            // Save grades to database
            const savePromises = studentsToGrade.map(gradeData => {
                if (this.db.addMark) {
                    return this.db.addMark(gradeData);
                } else {
                    return Promise.resolve(gradeData);
                }
            });
            
            const results = await Promise.allSettled(savePromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                this.showToast(`✅ ${successful} grades saved successfully${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
            }
            
            this.closeBulkGradeModal();
            await this.loadCourses();
            
        } catch (error) {
            console.error('❌ Error saving bulk grades:', error);
            this.showToast('Error saving grades', 'error');
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
            document.getElementById('courseCredits').value = 3;
            document.getElementById('courseStatus').value = 'active';
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
                submitBtn.className = 'btn btn-primary';
            }
        }
        document.getElementById('courseModalTitle').textContent = 'Add New Course';
    }
    
    // ===== VIEW TOGGLE =====
    
    setCoursesView(viewType) {
        this.currentView = viewType;
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.dataset.view === viewType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show/hide views
        const grid = document.getElementById('coursesGrid');
        const table = document.getElementById('coursesTableContainer');
        
        if (viewType === 'grid') {
            if (grid) grid.style.display = 'flex';
            if (table) table.style.display = 'none';
        } else {
            if (grid) grid.style.display = 'none';
            if (table) table.style.display = 'block';
        }
    }
    
    // ===== SEARCH AND FILTER =====
    
    searchCourses() {
        const query = document.getElementById('searchCourses')?.value.toLowerCase() || '';
        
        if (!query) {
            // Show all if search is empty
            document.querySelectorAll('#coursesGrid .card, #coursesTableBody tr').forEach(el => {
                el.style.display = '';
            });
            return;
        }
        
        // Filter grid cards
        const cards = document.querySelectorAll('#coursesGrid .card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? '' : 'none';
        });
        
        // Filter table rows
        const rows = document.querySelectorAll('#coursesTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }
    
    filterCourses() {
        const program = document.getElementById('filterProgram').value;
        const level = document.getElementById('filterLevel').value;
        const status = document.getElementById('filterStatus').value;
        
        // Filter grid cards
        const cards = document.querySelectorAll('#coursesGrid .card');
        cards.forEach(card => {
            const cardData = card.dataset;
            const cardProgram = card.querySelector('.card-meta span:nth-child(1)')?.textContent || '';
            const cardLevel = card.querySelector('.card-meta span:nth-child(2)')?.textContent || '';
            const cardStatus = card.querySelector('.badge')?.textContent || '';
            
            const matchesProgram = !program || cardProgram.toLowerCase().includes(program.toLowerCase());
            const matchesLevel = !level || cardLevel.toLowerCase().includes(level.toLowerCase());
            const matchesStatus = !status || cardStatus.toLowerCase().includes(status.toLowerCase());
            
            card.style.display = matchesProgram && matchesLevel && matchesStatus ? '' : 'none';
        });
        
        // Filter table rows
        const rows = document.querySelectorAll('#coursesTableBody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;
            
            const rowProgram = cells[2].textContent.trim();
            const rowStatus = cells[5].querySelector('.badge')?.textContent.trim() || '';
            
            const matchesProgram = !program || rowProgram.toLowerCase().includes(program.toLowerCase());
            const matchesStatus = !status || rowStatus.toLowerCase().includes(status.toLowerCase());
            
            row.style.display = matchesProgram && matchesStatus ? '' : 'none';
        });
    }
    
    // ===== STATISTICS =====
    
    async updateStatistics() {
        try {
            const courses = await this.db.getCourses();
            
            const totalCourses = courses.length;
            const activeCourses = courses.filter(c => c.status === 'active').length;
            const totalStudents = courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0);
            const coursesToGrade = courses.filter(c => (c.enrolled_count || 0) > 0).length;
            
            document.getElementById('totalCourses').textContent = totalCourses;
            document.getElementById('activeCourses').textContent = activeCourses;
            document.getElementById('totalStudentsEnrolled').textContent = totalStudents;
            document.getElementById('coursesToGrade').textContent = coursesToGrade;
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    // ===== EXPORT =====
    
    async exportCourses() {
        try {
            const courses = await this.db.getCourses();
            const csvContent = this.convertToCSV(courses);
            this.downloadCSV(csvContent, 'courses_export.csv');
            this.showToast('✅ Courses exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting courses:', error);
            this.showToast('Error exporting courses', 'error');
        }
    }
    
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = ['Course Code', 'Course Name', 'Program', 'Level', 'Credits', 'Enrolled Students', 'Status', 'Description'];
        const rows = data.map(course => [
            course.course_code,
            course.course_name,
            course.program,
            course.level,
            course.credits,
            course.enrolled_count || 0,
            course.status,
            course.description || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }
    
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    // ===== HELPER FUNCTIONS =====
    
    updateBulkGradeCourseDropdown(courses) {
        const select = document.getElementById('bulkGradeCourse');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Course</option>';
        
        if (courses && courses.length > 0) {
            courses.forEach(course => {
                if (course.status === 'active') {
                    select.innerHTML += `
                        <option value="${course.id}">
                            ${course.course_code} - ${course.course_name}
                        </option>
                    `;
                }
            });
        }
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
    
    addEnrollmentModalCSS() {
        if (document.querySelector('#enrollment-modal-css')) return;
        
        const style = document.createElement('style');
        style.id = 'enrollment-modal-css';
        style.textContent = `
            .enrollment-sections {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .enrollment-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                border: 1px solid #dee2e6;
            }
            
            .enrollment-section h5 {
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            
            .student-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .student-list table {
                font-size: 0.9rem;
            }
            
            .student-list .avatar {
                width: 32px;
                height: 32px;
                background: #e9ecef;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .enrollment-info {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .enrollment-stats {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .enrollment-controls {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            
            .empty-list {
                text-align: center;
                padding: 40px;
                color: #6c757d;
            }
        `;
        document.head.appendChild(style);
    }
    
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        const bgColors = {
            success: '#2ecc71',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        
        toast.style.background = bgColors[type] || bgColors.info;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
}

// Add CSS for animations
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CourseManager = CourseManager;
}
