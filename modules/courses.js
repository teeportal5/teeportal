// modules/courses.js - UPDATED FOR YOUR POSTGRESQL DATABASE
class CourseManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.currentCourse = null;
        this.selectedStudents = new Set();
        this.currentView = 'grid';
        this.programs = [];
        this.centres = [];
        this.intakeYears = [];
        
        this.registerGlobalFunctions();
        this.initializeData();
    }
    
    async initializeData() {
        try {
            // Load programs - use code and name
            this.programs = await this.db.getPrograms();
            
            // Load centres - use name for display
            this.centres = await this.db.getStudyCenters();
            
            // Generate intake years
            this.generateIntakeYears();
            
            // Populate dropdowns
            this.populateDropdowns();
            
            console.log('✅ Data initialized:', {
                programs: this.programs.length,
                centres: this.centres.length,
                intakeYears: this.intakeYears.length
            });
            
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    }
    
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
        
        this.intakeYears.sort((a, b) => b - a);
    }
    
    populateDropdowns() {
        // Populate program dropdowns - use name for display, code for value
        const programOptions = this.programs.map(p => ({
            value: p.code,
            label: p.name,
            level: p.level // Store level for later use
        }));
        this.populateDropdown('courseProgram', programOptions, 'Select Program');
        this.populateDropdown('filterProgram', programOptions, 'All Programs');
        
        // Populate level dropdown - get unique levels from programs
        const uniqueLevels = [...new Set(this.programs.map(p => p.level).filter(Boolean))];
        const levelOptions = uniqueLevels.map(level => ({
            value: level,
            label: level.charAt(0).toUpperCase() + level.slice(1)
        }));
        this.populateDropdown('filterLevel', levelOptions, 'All Levels');
        
        // Populate centre dropdowns
        const centreOptions = this.centres.map(c => ({
            value: c.name, // Use name for value since we display names
            label: c.name
        }));
        this.populateDropdown('enrollmentStudyCenter', centreOptions, 'All Centres');
        
        // Populate intake year dropdown
        const yearOptions = this.intakeYears.map(year => ({
            value: year,
            label: year
        }));
        this.populateDropdown('enrollmentIntakeYear', yearOptions, 'All Years');
        
        console.log('✅ Dropdowns populated');
    }
    
    populateDropdown(elementId, items, defaultLabel) {
        const select = document.getElementById(elementId);
        if (!select) return;
        
        select.innerHTML = `<option value="">${defaultLabel}</option>`;
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            option.dataset.level = item.level || ''; // Store level if available
            select.appendChild(option);
        });
    }
    
    registerGlobalFunctions() {
        // Course modal functions
        window.openCourseModal = () => this.openCourseModal();
        window.saveCourse = (e) => this.saveCourse(e);
        window.closeCourseModal = () => this.closeCourseModal();
        
        // Bulk grade modal functions
        window.openBulkGradeModal = () => this.openBulkGradeModal();
        window.closeBulkGradeModal = () => this.closeBulkGradeModal();
        window.loadStudentsForBulkGrading = () => this.loadStudentsForBulkGrading();
        window.selectAllStudents = () => this.selectAllStudents();
        window.deselectAllStudents = () => this.deselectAllStudents();
        window.submitBulkGrades = () => this.submitBulkGrades();
        window.toggleAllStudents = (checked) => this.toggleAllStudents(checked);
        window.toggleStudentSelection = (checkbox) => this.toggleStudentSelection(checkbox);
        
        // View toggle
        window.setCoursesView = (view) => this.setCoursesView(view);
        
        // Initialize app object
        window.app = window.app || {};
        window.app.courses = this;
        
        console.log('✅ Global functions registered');
    }
    
    // ===== COURSE MANAGEMENT =====
    
    async saveCourse(event) {
        if (event) event.preventDefault();
        
        try {
            const courseData = {
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                program: document.getElementById('courseProgram').value, // Program code
                credits: parseInt(document.getElementById('courseCredits').value) || 3,
                description: document.getElementById('courseDescription').value.trim(),
                status: document.getElementById('courseStatus').value || 'active'
            };
            
            // Validation
            if (!courseData.code || !courseData.name || !courseData.program) {
                this.showToast('Please fill all required fields', 'error');
                return;
            }
            
            if (isNaN(courseData.credits) || courseData.credits < 1 || courseData.credits > 10) {
                this.showToast('Credits must be between 1 and 10', 'error');
                return;
            }
            
            const form = document.getElementById('courseForm');
            const isEditMode = form.dataset.editId;
            
            let course;
            if (isEditMode) {
                // Update course
                course = await this.db.updateCourse(isEditMode, courseData);
                this.showToast('✅ Course updated successfully', 'success');
                delete form.dataset.editId;
                
                // Reset to "Add New" mode
                document.getElementById('courseModalTitle').textContent = 'Add New Course';
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
                    submitBtn.className = 'btn btn-primary';
                }
            } else {
                // Add new course
                course = await this.db.addCourse(courseData);
                this.showToast('✅ Course added successfully', 'success');
            }
            
            this.closeCourseModal();
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            
            // Add program names and levels to courses
            const enrichedCourses = courses.map(course => {
                const program = this.programs.find(p => p.code === course.program);
                return {
                    ...course,
                    program_name: program ? program.name : course.program,
                    program_level: program ? program.level : 'basic'
                };
            });
            
            this.updateStatistics(enrichedCourses);
            this.updateCoursesGrid(enrichedCourses);
            this.updateCoursesTable(enrichedCourses);
            this.updateBulkGradeCourseDropdown(enrichedCourses);
            
            console.log(`✅ Loaded ${enrichedCourses.length} courses`);
            
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showToast('Error loading courses', 'error');
        }
    }
    
    updateStatistics(courses) {
        const totalCourses = courses.length;
        const activeCourses = courses.filter(c => c.status === 'active').length;
        
        // Calculate total enrolled students
        const totalStudents = courses.reduce((sum, course) => {
            return sum + (course.enrolled_count || 0);
        }, 0);
        
        const coursesToGrade = courses.filter(c => (c.enrolled_count || 0) > 0).length;
        
        // Update stat cards
        document.getElementById('totalCourses').textContent = totalCourses;
        document.getElementById('activeCourses').textContent = activeCourses;
        document.getElementById('totalStudentsEnrolled').textContent = totalStudents;
        document.getElementById('coursesToGrade').textContent = coursesToGrade;
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
        
        let html = '';
        courses.forEach(course => {
            const enrolledStudents = course.enrolled_count || 0;
            const status = course.status || 'active';
            const canGrade = enrolledStudents > 0;
            const safeCode = (course.course_code || '').replace(/'/g, "\\'");
            
            // Get level from program or default to basic
            const level = course.program_level || 'basic';
            
            html += `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-card-header">
                        <div class="course-header-content">
                            <h3 class="course-code">${course.course_code || 'N/A'}</h3>
                            <span class="course-status ${status === 'active' ? 'active' : 'inactive'}">
                                ${status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="course-card-body">
                        <h4>${course.course_name || 'Unnamed Course'}</h4>
                        <p class="course-description">${course.description || 'No description available'}</p>
                        <div class="course-meta">
                            <div class="meta-item">
                                <i class="fas fa-graduation-cap"></i>
                                <span>${course.program_name || course.program}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-layer-group"></i>
                                <span>${level}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-star"></i>
                                <span>${course.credits || 3} Credits</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>${enrolledStudents} Enrolled</span>
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn btn-sm btn-info" onclick="app.courses.openCourseEnrollmentModal('${course.id}')">
                                <i class="fas fa-user-plus"></i> Enroll
                            </button>
                            ${canGrade ? `
                                <button class="btn btn-sm btn-success" onclick="app.courses.openBulkGradeForCourse('${course.id}')">
                                    <i class="fas fa-chart-line"></i> Grade
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" onclick="app.courses.editCourse('${course.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}', '${safeCode}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="course-card-footer">
                        <small>${course.program_name || course.program} • ${level}</small>
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
        
        let html = '';
        courses.forEach(course => {
            const enrolledStudents = course.enrolled_count || 0;
            const status = course.status || 'active';
            const safeCode = (course.course_code || '').replace(/'/g, "\\'");
            
            html += `
                <tr data-course-id="${course.id}">
                    <td><strong>${course.course_code || 'N/A'}</strong></td>
                    <td>${course.course_name || 'Unnamed'}</td>
                    <td>${course.program_name || course.program}</td>
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
                        <div class="action-buttons">
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
    
    updateBulkGradeCourseDropdown(courses) {
        const select = document.getElementById('bulkGradeCourse');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Course</option>';
        
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
    
    // FIXED EDIT COURSE - NO RECURSION
    async editCourse(courseId) {
        try {
            console.log('Editing course:', courseId);
            
            // Get course data
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
            
            // Find program name
            const program = this.programs.find(p => p.code === course.program);
            const programName = program ? program.name : course.program;
            
            // Populate form
            document.getElementById('courseCode').value = course.course_code || '';
            document.getElementById('courseName').value = course.course_name || '';
            document.getElementById('courseProgram').value = course.program || '';
            document.getElementById('courseCredits').value = course.credits || 3;
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseStatus').value = course.status || 'active';
            
            // Set edit mode
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            // Update modal
            document.getElementById('courseModalTitle').textContent = 'Edit Course';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
                submitBtn.className = 'btn btn-warning';
            }
            
            this.openCourseModal();
            
        } catch (error) {
            console.error('Error editing course:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // FIXED DELETE COURSE - NO RECURSION
    async deleteCoursePrompt(courseId, courseCode) {
        const confirmMessage = `Delete course "${courseCode}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;
        
        try {
            await this.db.deleteCourse(courseId);
            this.showToast('✅ Course deleted', 'success');
            await this.loadCourses();
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    // ===== ENROLLMENT MANAGEMENT =====
    
    async openCourseEnrollmentModal(courseId) {
        try {
            this.currentCourse = courseId;
            
            // Get course
            let course;
            if (this.db.getCourse) {
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
            if (this.db.getStudentsByCourse) {
                enrolledStudents = await this.db.getStudentsByCourse(courseId);
            } else {
                // Fallback: Get enrollments and join with students
                const enrollments = await this.db.getEnrollmentsByCourse(courseId);
                if (enrollments && enrollments.length > 0) {
                    const allStudents = await this.db.getStudents();
                    enrolledStudents = enrollments.map(enrollment => {
                        const student = allStudents.find(s => s.id === enrollment.student_id);
                        return student ? { ...student, enrollment_id: enrollment.id } : null;
                    }).filter(Boolean);
                }
            }
            
            // Get all active students
            const allStudents = await this.db.getStudents();
            const enrolledIds = enrolledStudents.map(s => s.id);
            const availableStudents = allStudents.filter(s => 
                !enrolledIds.includes(s.id) && s.status === 'active'
            );
            
            this.showEnrollmentModal(course, enrolledStudents, availableStudents);
            
        } catch (error) {
            console.error('Error opening enrollment modal:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    showEnrollmentModal(course, enrolledStudents, availableStudents) {
        const modalHtml = `
            <div class="modal active" id="enrollmentModal" style="display: block;">
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> Manage Enrollments</h3>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="enrollment-info">
                            <h4>${course.course_code} - ${course.course_name}</h4>
                            <p class="text-muted">${course.description || 'No description'}</p>
                            <div class="enrollment-stats">
                                <span class="badge badge-info">
                                    <i class="fas fa-users"></i> ${enrolledStudents.length} Enrolled
                                </span>
                                <span class="badge badge-secondary">
                                    <i class="fas fa-user-plus"></i> ${availableStudents.length} Available
                                </span>
                            </div>
                        </div>
                        
                        <div class="enrollment-controls mb-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <label>Study Centre:</label>
                                    <select id="enrollmentStudyCenter" class="form-control" onchange="app.courses.filterEnrollmentLists()">
                                        <option value="">All Centres</option>
                                        ${this.centres.map(c => `
                                            <option value="${c.name}">${c.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label>Intake Year:</label>
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
                            <div class="enrollment-section">
                                <h5><i class="fas fa-users text-success"></i> Enrolled Students (${enrolledStudents.length})</h5>
                                ${this.renderStudentList(enrolledStudents, true, course.id)}
                            </div>
                            <div class="enrollment-section">
                                <h5><i class="fas fa-user-plus text-primary"></i> Available Students (${availableStudents.length})</h5>
                                ${this.renderStudentList(availableStudents, false, course.id)}
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
        
        const existingModal = document.getElementById('enrollmentModal');
        if (existingModal) existingModal.remove();
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
        
        // Add CSS for enrollment modal
        this.addEnrollmentModalCSS();
    }
    
    renderStudentList(students, isEnrolled, courseId) {
        if (students.length === 0) {
            return `
                <div class="empty-list text-center py-4">
                    <i class="fas fa-user-graduate fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No students found</p>
                </div>
            `;
        }
        
        let html = `
            <div class="student-list" style="max-height: 300px; overflow-y: auto;">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Reg No</th>
                            <th>Centre</th>
                            <th>Intake</th>
                            <th>Program</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.forEach(student => {
            // Use centre_name if available, otherwise centre
            const centreDisplay = student.centre_name || student.centre || 'N/A';
            const programDisplay = student.program || 'N/A';
            
            html += `
                <tr data-student-id="${student.id}" 
                    data-centre="${centreDisplay}" 
                    data-intake="${student.intake_year}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || 'Student'}</strong>
                                <div class="text-muted small">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>${student.reg_number || 'N/A'}</code></td>
                    <td>${centreDisplay}</td>
                    <td>${student.intake_year || 'N/A'}</td>
                    <td>${programDisplay}</td>
                    <td>
                        ${isEnrolled ? `
                            <button class="btn btn-sm btn-danger" 
                                    onclick="app.courses.removeEnrollment('${courseId}', '${student.id}')"
                                    title="Remove from course">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success" 
                                    onclick="app.courses.addEnrollment('${courseId}', '${student.id}')"
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
            // Get student details to find program_id
            const student = await this.db.getStudent(studentId);
            const program = this.programs.find(p => p.code === student.program);
            
            const enrollmentData = {
                student_id: studentId,
                course_id: courseId,
                program_id: program ? program.id : null,
                academic_year: new Date().getFullYear(),
                semester: 'Semester 1',
                enrollment_date: new Date().toISOString().split('T')[0],
                enrollment_status: 'enrolled',
                is_active: true
            };
            
            await this.db.addEnrollment(enrollmentData);
            this.showToast('✅ Student enrolled successfully', 'success');
            
            // Refresh modal
            await this.openCourseEnrollmentModal(courseId);
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error adding enrollment:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    async removeEnrollment(courseId, studentId) {
        if (!confirm('Remove student from this course?')) return;
        
        try {
            await this.db.removeEnrollment(courseId, studentId);
            this.showToast('✅ Student removed from course', 'success');
            
            // Refresh modal
            await this.openCourseEnrollmentModal(courseId);
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error removing enrollment:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    filterEnrollmentLists() {
        const centreFilter = document.getElementById('enrollmentStudyCenter')?.value;
        const yearFilter = document.getElementById('enrollmentIntakeYear')?.value;
        
        const rows = document.querySelectorAll('#enrollmentModal tbody tr');
        rows.forEach(row => {
            const centre = row.dataset.centre;
            const year = row.dataset.intake;
            
            const centreMatch = !centreFilter || centre === centreFilter;
            const yearMatch = !yearFilter || year === yearFilter;
            
            row.style.display = centreMatch && yearMatch ? '' : 'none';
        });
    }
    
    // ===== BULK GRADING =====
    
    openBulkGradeModal() {
        this.selectedStudents.clear();
        this.currentCourse = null;
        
        document.getElementById('bulkGradeCourse').value = '';
        document.getElementById('bulkSameScore').value = '';
        
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
        
        this.updateSelectedCount();
        
        const modal = document.getElementById('bulkGradeModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    openBulkGradeForCourse(courseId) {
        this.currentCourse = courseId;
        document.getElementById('bulkGradeCourse').value = courseId;
        this.loadStudentsForBulkGrading();
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
            let course;
            if (this.db.getCourse) {
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
            let students = [];
            if (this.db.getStudentsByCourse) {
                students = await this.db.getStudentsByCourse(courseId);
            } else {
                // Fallback
                const enrollments = await this.db.getEnrollmentsByCourse(courseId);
                if (enrollments && enrollments.length > 0) {
                    const allStudents = await this.db.getStudents();
                    students = enrollments.map(enrollment => {
                        const student = allStudents.find(s => s.id === enrollment.student_id);
                        return student ? { ...student, enrollment_id: enrollment.id } : null;
                    }).filter(Boolean);
                }
            }
            
            this.renderBulkGradeStudents(students, course);
            
        } catch (error) {
            console.error('Error loading students:', error);
            this.showToast(`❌ ${error.message}`, 'error');
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
                        <button class="btn btn-sm btn-info mt-2" onclick="app.courses.openCourseEnrollmentModal('${course.id}')">
                            <i class="fas fa-user-plus"></i> Enroll Students
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        students.forEach((student, index) => {
            const studentId = student.id;
            const centreDisplay = student.centre_name || student.centre || 'N/A';
            
            html += `
                <tr data-student-id="${studentId}">
                    <td class="text-center">
                        <input type="checkbox" class="student-checkbox" 
                               data-student-id="${studentId}"
                               onchange="toggleStudentSelection(this)">
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || 'Student'}</strong>
                                <div class="text-muted small">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>${student.reg_number || 'N/A'}</code></td>
                    <td>${centreDisplay}</td>
                    <td>${student.intake_year || '-'}</td>
                    <td>${student.program || '-'}</td>
                    <td>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control student-score" 
                                   data-student-id="${studentId}"
                                   placeholder="Score" min="0" max="100" step="0.01"
                                   value="">
                            <span class="input-group-text">/ 100</span>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
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
        
        if (!courseId || this.selectedStudents.size === 0) {
            this.showToast('Please select a course and students', 'error');
            return;
        }
        
        const sameScore = document.getElementById('bulkSameScore')?.value;
        const studentsToGrade = [];
        
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
            const savePromises = studentsToGrade.map(gradeData => {
                if (this.db.addMark) {
                    return this.db.addMark(gradeData);
                }
                return Promise.resolve();
            });
            
            await Promise.allSettled(savePromises);
            this.showToast(`✅ ${studentsToGrade.length} grades saved successfully`, 'success');
            
            this.closeBulkGradeModal();
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error saving grades:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }
    
    // ===== MODAL FUNCTIONS =====
    
    openCourseModal() {
        const modal = document.getElementById('courseModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
        }
    }
    
    closeCourseModal() {
        const modal = document.getElementById('courseModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        const form = document.getElementById('courseForm');
        if (form) {
            form.reset();
            delete form.dataset.editId;
            document.getElementById('courseCredits').value = 3;
            document.getElementById('courseStatus').value = 'active';
            document.getElementById('courseModalTitle').textContent = 'Add New Course';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
                submitBtn.className = 'btn btn-primary';
            }
        }
    }
    
    // ===== VIEW TOGGLE =====
    
    setCoursesView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        const grid = document.getElementById('coursesGrid');
        const table = document.getElementById('coursesTableContainer');
        
        if (view === 'grid') {
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
        
        // Filter grid cards
        document.querySelectorAll('#coursesGrid .course-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? '' : 'none';
        });
        
        // Filter table rows
        document.querySelectorAll('#coursesTableBody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }
    
    filterCourses() {
        const program = document.getElementById('filterProgram').value;
        const level = document.getElementById('filterLevel').value;
        const status = document.getElementById('filterStatus').value;
        
        // Filter grid cards
        document.querySelectorAll('#coursesGrid .course-card').forEach(card => {
            const cardText = card.textContent.toLowerCase();
            const cardStatus = card.querySelector('.course-status')?.textContent.toLowerCase() || '';
            
            const programMatch = !program || cardText.includes(program.toLowerCase());
            const statusMatch = !status || cardStatus.includes(status.toLowerCase());
            // Note: Level filtering might not work since level isn't in courses table
            
            card.style.display = programMatch && statusMatch ? '' : 'none';
        });
        
        // Filter table rows
        document.querySelectorAll('#coursesTableBody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;
            
            const rowProgram = cells[2].textContent.trim();
            const rowStatus = cells[5].querySelector('.badge')?.textContent.trim() || '';
            
            const programMatch = !program || rowProgram.toLowerCase().includes(program.toLowerCase());
            const statusMatch = !status || rowStatus.toLowerCase().includes(status.toLowerCase());
            
            row.style.display = programMatch && statusMatch ? '' : 'none';
        });
    }
    
    // ===== HELPER FUNCTIONS =====
    
    calculateGrade(percentage) {
        if (percentage >= 85) return { grade: 'DISTINCTION', points: 4.0 };
        if (percentage >= 70) return { grade: 'CREDIT', points: 3.0 };
        if (percentage >= 50) return { grade: 'PASS', points: 2.0 };
        return { grade: 'FAIL', points: 0.0 };
    }
    
    getGradeBadgeColor(grade) {
        const colors = {
            'DISTINCTION': 'success',
            'CREDIT': 'info',
            'PASS': 'warning',
            'FAIL': 'danger'
        };
        return colors[grade] || 'secondary';
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
                margin-top: 20px;
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
                font-size: 1rem;
            }
            
            .student-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .student-list table {
                font-size: 0.85rem;
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
            
            @media (max-width: 992px) {
                .enrollment-sections {
                    grid-template-columns: 1fr;
                }
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
