// modules/courses.js - Course management module with grading features
class CourseManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.currentCourse = null;
        this.selectedStudents = new Set();
        this.currentView = 'grid'; // 'grid' or 'table'
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Register global functions
        this.registerGlobalFunctions();
        
        // Load initial data
        await this.loadCourses();
        await this.populateFilters();
        await this.updateStatistics();
    }
    
    // Register global functions for HTML onclick handlers
    registerGlobalFunctions() {
        window.openCourseModal = () => this.openCourseModal();
        window.saveCourse = (e) => this.saveCourse(e);
        window.closeCourseModal = () => this.closeCourseModal();
        window.openBulkGradeModal = () => this.openBulkGradeModal();
        window.closeBulkGradeModal = () => this.closeBulkGradeModal();
        window.loadStudentsForBulkGrading = () => this.loadStudentsForBulkGrading();
        window.filterStudentsForGrading = () => this.filterStudentsForGrading();
        window.selectAllStudents = () => this.selectAllStudents();
        window.deselectAllStudents = () => this.deselectAllStudents();
        window.submitBulkGrades = () => this.submitBulkGrades();
        window.toggleAllStudents = (checked) => {
            if (checked) this.selectAllStudents();
            else this.deselectAllStudents();
        };
        window.setCoursesView = (view) => this.setCoursesView(view);
        
        // Add app.courses methods for inline calls
        window.app = window.app || {};
        window.app.courses = window.app.courses || {};
        window.app.courses.exportCourses = () => this.exportCourses();
        window.app.courses.searchCourses = (query) => this.searchCourses(query);
        window.app.courses.filterCourses = () => this.filterCourses();
    }
    
    // ===== COURSE MANAGEMENT =====
    
    async saveCourse(event) {
        event.preventDefault();
        
        try {
            const courseData = {
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                program: document.getElementById('courseProgram').value,
                credits: parseInt(document.getElementById('courseCredits').value),
                level: document.getElementById('courseLevel').value,
                description: document.getElementById('courseDescription').value.trim(),
                status: document.getElementById('courseStatus').value || 'active'
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
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
                    submitBtn.classList.remove('btn-update');
                    submitBtn.classList.add('btn-primary');
                }
                document.getElementById('courseModalTitle').textContent = 'Add New Course';
            } else {
                course = await this.db.addCourse(courseData);
                this.showToast(`✅ Course "${course.course_code} - ${course.course_name}" added successfully`, 'success');
            }
            
            this.closeCourseModal();
            form.reset();
            
            await this.loadCourses();
            await this.updateStatistics();
            await this.populateBulkGradeFilters();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    async loadCourses() {
        try {
            const courses = await this.db.getCourses();
            
            // Update both grid and table views
            this.updateCoursesGrid(courses);
            this.updateCoursesTable(courses);
            
            // Update bulk grade course dropdown
            this.updateBulkGradeCourseDropdown(courses);
            
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
            // Hide table container if no courses
            const tableContainer = document.getElementById('coursesTableContainer');
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }
        
        const programNames = {
            'basic': 'Basic TEE',
            'hnc': 'HNC',
            'advanced': 'Advanced TEE'
        };
        
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
                            <span><i class="fas fa-users"></i> ${enrolledStudents} Students</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        ${canGrade ? `
                            <button class="btn btn-sm btn-success" onclick="app.courses.openBulkGradeForCourse('${course.id}')" title="Grade Students">
                                <i class="fas fa-chart-line"></i> Grade
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-primary" onclick="app.courses.editCourse('${course.id}')" title="Edit Course">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}', '${course.course_code}')" title="Delete Course">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
        // Update bulk grade button visibility
        const bulkGradeBtn = document.getElementById('bulkGradeBtn');
        if (bulkGradeBtn) {
            bulkGradeBtn.style.display = courses.some(c => (c.enrolled_count || 0) > 0) ? 'inline-block' : 'none';
        }
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
            
            html += `
                <tr data-course-id="${course.id}">
                    <td><strong>${course.course_code}</strong></td>
                    <td>${course.course_name}</td>
                    <td>${course.program || '-'}</td>
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
                            ${enrolledStudents > 0 ? `
                                <button class="btn btn-sm btn-success" onclick="app.courses.openBulkGradeForCourse('${course.id}')" title="Grade Students">
                                    <i class="fas fa-chart-line"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" onclick="app.courses.editCourse('${course.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.courses.deleteCoursePrompt('${course.id}', '${course.course_code}')" title="Delete">
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
    
    async editCourse(courseId) {
        try {
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
            document.getElementById('courseCode').value = course.course_code;
            document.getElementById('courseName').value = course.course_name;
            document.getElementById('courseProgram').value = course.program;
            document.getElementById('courseLevel').value = course.level || 'basic';
            document.getElementById('courseCredits').value = course.credits || 3;
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseStatus').value = course.status || 'active';
            
            // Set edit mode
            const form = document.getElementById('courseForm');
            form.dataset.editId = courseId;
            
            // Update modal title
            document.getElementById('courseModalTitle').textContent = 'Edit Course';
            
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
            
            await this.loadCourses();
            await this.updateStatistics();
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast(`❌ Error: ${error.message}`, 'error');
        }
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
    
    // ===== FILTERS AND SEARCH =====
    
    async populateFilters() {
        // Populate program filter
        const programFilter = document.getElementById('filterProgram');
        if (programFilter) {
            try {
                const programs = await this.db.getPrograms();
                programs.forEach(program => {
                    programFilter.innerHTML += `<option value="${program.id}">${program.name}</option>`;
                });
            } catch (error) {
                console.error('Error loading programs for filter:', error);
            }
        }
    }
    
    searchCourses(query) {
        const cards = document.querySelectorAll('#coursesGrid .card');
        const rows = document.querySelectorAll('#coursesTableBody tr');
        
        const searchTerm = query.toLowerCase();
        
        // Filter grid view
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm) ? '' : 'none';
        });
        
        // Filter table view
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
    
    filterCourses() {
        const program = document.getElementById('filterProgram').value;
        const level = document.getElementById('filterLevel').value;
        const status = document.getElementById('filterStatus').value;
        
        const cards = document.querySelectorAll('#coursesGrid .card');
        const rows = document.querySelectorAll('#coursesTableBody tr');
        
        cards.forEach(card => {
            const cardProgram = card.querySelector('.card-meta span:nth-child(1)')?.textContent || '';
            const cardLevel = card.querySelector('.card-meta span:nth-child(2)')?.textContent || '';
            const cardStatus = card.querySelector('.badge')?.textContent || '';
            
            const matchesProgram = !program || cardProgram.includes(program);
            const matchesLevel = !level || cardLevel.toLowerCase().includes(level);
            const matchesStatus = !status || cardStatus.toLowerCase().includes(status.toLowerCase());
            
            card.style.display = matchesProgram && matchesLevel && matchesStatus ? '' : 'none';
        });
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;
            
            const rowProgram = cells[2].textContent.trim();
            const rowStatus = cells[5].querySelector('.badge')?.textContent.trim() || '';
            
            // Note: Level is not in table view, so we can't filter by it
            const matchesProgram = !program || rowProgram === program;
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
        document.getElementById('courseModalTitle').textContent = 'Add New Course';
    }
    
    // ===== EXPORT =====
    
    async exportCourses() {
        try {
            const courses = await this.db.getCourses();
            console.log('Courses data for export:', courses);
            this.showToast('Export feature coming soon!', 'info');
        } catch (error) {
            console.error('Error exporting courses:', error);
            this.showToast('Error exporting courses', 'error');
        }
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
    
    async loadStudentsForBulkGrading() {
        const courseId = document.getElementById('bulkGradeCourse')?.value;
        if (!courseId) return;
        
        this.currentCourse = courseId;
        
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
            
            // Get students for this course
            let students = [];
            if (this.db.getStudentsByCourse && typeof this.db.getStudentsByCourse === 'function') {
                students = await this.db.getStudentsByCourse(courseId);
            } else {
                // Fallback: get all students (for demo)
                const allStudents = await this.db.getStudents();
                students = allStudents.slice(0, 8); // Limit for demo
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
                                   value="${existingScore !== '-' ? existingScore : ''}"
                                   onchange="app.courses.updateStudentScore('${studentId}', this.value)">
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
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
    
    updateStudentScore(studentId, score) {
        // Store score for this student
        // You might want to store this in a separate data structure
        console.log(`Score updated for student ${studentId}: ${score}`);
    }
    
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${this.selectedStudents.size} students selected`;
        }
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
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
                    centreSelect.innerHTML += `<option value="${centre.id || centre.name}">${centre.name}</option>`;
                });
            } catch (error) {
                console.error('Error loading centres:', error);
                centreSelect.innerHTML = `
                    <option value="">All Centres</option>
                    <option value="main">Main Campus</option>
                    <option value="branch1">Branch 1</option>
                    <option value="branch2">Branch 2</option>
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
                programSelect.innerHTML = `
                    <option value="">All Programs</option>
                    <option value="basic">Basic TEE</option>
                    <option value="hnc">HNC</option>
                    <option value="advanced">Advanced TEE</option>
                `;
            }
        }
    }
    
    filterStudentsForGrading() {
        // This would filter the students list based on the filter selections
        // For now, just reload all students
        this.loadStudentsForBulkGrading();
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
        
        if (!assessmentDate) {
            this.showToast('Please select an assessment date', 'error');
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
                    return Promise.resolve(gradeData); // Fallback for demo
                }
            });
            
            const results = await Promise.allSettled(savePromises);
            
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
            await this.updateStatistics();
            
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
    
    // ===== HELPER FUNCTIONS =====
    
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
