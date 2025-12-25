class CourseManager {
    constructor(db, app) {
        console.log('🔍 CourseManager constructor called');
        
        // Get database from app if not provided
        this.db = db || window.app?.db;
        this.app = app || window.app;
        
        console.log('Initialized with:', {
            db: this.db ? `✅ ${this.db.constructor.name}` : '❌ Missing',
            app: this.app ? `✅ ${this.app.constructor.name}` : '❌ Missing',
            hasGetCourses: typeof this.db?.getCourses === 'function',
            hasAddCourse: typeof this.db?.addCourse === 'function',
            hasUpdateCourse: typeof this.db?.updateCourse === 'function',
            hasDeleteCourse: typeof this.db?.deleteCourse === 'function'
        });
        
        if (!this.db || !this.app) {
            console.error('❌ Missing database or app');
            return;
        }
        
        // Initialize state
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
            console.log('=== DEBUG AUTO-POPULATION START ===');
            
            // 1. Load programs
            console.log('1. Loading programs...');
            this.programs = await this.db.getPrograms();
            console.log('Programs loaded:', this.programs);
            console.log('Number of programs:', this.programs.length);
            
            // 2. Load centres
            console.log('2. Loading centres...');
            this.centres = await this.db.getCentres();
            console.log('Centres loaded:', this.centres);
            console.log('Number of centres:', this.centres.length);
            
            // 3. Generate intake years
            console.log('3. Generating intake years...');
            this.generateIntakeYears();
            console.log('Intake years:', this.intakeYears);
            
            // 4. Populate dropdowns
            console.log('4. Populating dropdowns...');
            this.populateDropdowns();
            
            // 5. Load courses
            console.log('5. Loading courses...');
            await this.loadCourses();
            
            console.log('=== DEBUG AUTO-POPULATION END ===');
            
        } catch (error) {
            console.error('❌ Error initializing data:', error);
            this.showToast('Error initializing data: ' + error.message, 'error');
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
        console.log('🔄 Starting populateDropdowns()...');
        
        // DEBUG: Check what data we have
        console.log('DEBUG - this.programs:', this.programs);
        console.log('DEBUG - Number of programs:', this.programs.length);
        
        if (!this.programs || this.programs.length === 0) {
            console.error('❌ No programs data to populate!');
            // Use default options
            this.programs = [
                { value: 'basic', label: 'Basic TEE' },
                { value: 'hnc', label: 'Higher National Certificate' },
                { value: 'advanced', label: 'Advanced TEE' }
            ];
        }
        
        // Convert programs to proper format if needed
        const programOptions = this.programs.map(program => ({
            value: program.code || program.value || program.id || program,
            label: program.name || program.label || program
        }));
        
        // Populate program dropdowns
        this.populateDropdown('courseProgram', programOptions, 'Select Program');
        this.populateDropdown('filterProgram', programOptions, 'All Programs');
        
        // Get unique levels from programs
        const uniqueLevels = [...new Set(this.programs.map(p => p.level).filter(Boolean))];
        console.log('Unique levels from programs:', uniqueLevels);
        
        // If no levels from programs, use default levels
        if (uniqueLevels.length === 0) {
            uniqueLevels.push('basic', 'intermediate', 'advanced');
        }
        
        const levelOptions = uniqueLevels.map(level => ({
            value: level,
            label: level.charAt(0).toUpperCase() + level.slice(1)
        }));
        
        // Populate level dropdowns
        this.populateDropdown('filterLevel', levelOptions, 'All Levels');
        
        // Populate status dropdowns
        const statusOptions = [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
        ];
        this.populateDropdown('filterStatus', statusOptions, 'All Status');
        
        console.log('✅ populateDropdowns() completed');
    }
    
    populateDropdown(elementId, items, defaultLabel) {
        const select = document.getElementById(elementId);
        if (!select) {
            console.error(`❌ Element ${elementId} not found!`);
            return;
        }
        
        console.log(`📝 Populating ${elementId} with ${items.length} items`);
        
        // Clear existing options
        select.innerHTML = `<option value="">${defaultLabel}</option>`;
        
        // Add items
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });
        
        console.log(`✅ ${elementId} now has ${select.options.length} options`);
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
        
        // Search and filter
        window.searchCourses = () => this.searchCourses();
        window.filterCourses = () => this.filterCourses();
        
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
                program: document.getElementById('courseProgram').value,
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
                if (!this.db.updateCourse) {
                    throw new Error('updateCourse method not available in database');
                }
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
                if (!this.db.addCourse) {
                    throw new Error('addCourse method not available in database');
                }
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
            console.log('🔄 Loading courses...');
            const courses = await this.db.getCourses();
            console.log(`✅ Found ${courses.length} courses:`, courses);
            
            if (courses.length === 0) {
                console.log('No courses found in database');
                this.updateStatistics([]);
                this.updateCoursesGrid([]);
                this.updateCoursesTable([]);
                this.updateBulkGradeCourseDropdown([]);
                return;
            }
            
            // Add program names to courses
            const enrichedCourses = courses.map(course => {
                const program = this.programs.find(p => 
                    p.code === course.program || 
                    p.value === course.program || 
                    p.id === course.program
                );
                
                // Handle different field names
                const courseCode = course.course_code || course.code || 'N/A';
                const courseName = course.course_name || course.name || 'Unnamed Course';
                const programName = program ? program.name || program.label : course.program || 'N/A';
                const credits = course.credits || 3;
                const status = course.status || 'active';
                const description = course.description || '';
                const enrolledCount = course.enrolled_count || course.enrolled || 0;
                
                return {
                    ...course,
                    id: course.id,
                    course_code: courseCode,
                    course_name: courseName,
                    program: course.program,
                    program_name: programName,
                    credits: credits,
                    status: status,
                    description: description,
                    enrolled_count: enrolledCount
                };
            });
            
            console.log('Enriched courses:', enrichedCourses);
            
            this.updateStatistics(enrichedCourses);
            this.updateCoursesGrid(enrichedCourses);
            this.updateCoursesTable(enrichedCourses);
            this.updateBulkGradeCourseDropdown(enrichedCourses);
            
            console.log(`✅ Successfully loaded ${enrichedCourses.length} courses`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            this.showToast(`Error loading courses: ${error.message}`, 'error');
            
            // Show empty state
            this.updateCoursesGrid([]);
            this.updateCoursesTable([]);
        }
    }
    
    updateStatistics(courses) {
        try {
            const totalCourses = courses.length;
            const activeCourses = courses.filter(c => c.status === 'active').length;
            
            // Calculate total enrolled students
            const totalStudents = courses.reduce((sum, course) => {
                return sum + (course.enrolled_count || 0);
            }, 0);
            
            const coursesToGrade = courses.filter(c => (c.enrolled_count || 0) > 0).length;
            
            // Update stat cards
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            updateElement('totalCourses', totalCourses);
            updateElement('activeCourses', activeCourses);
            updateElement('totalStudentsEnrolled', totalStudents);
            updateElement('coursesToGrade', coursesToGrade);
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    updateCoursesGrid(courses) {
        const grid = document.getElementById('coursesGrid');
        if (!grid) {
            console.error('❌ coursesGrid element not found');
            return;
        }
        
        if (!courses || courses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-book fa-3x mb-3" style="color: #ccc;"></i>
                    <h3>No Courses Found</h3>
                    <p style="margin-bottom: 20px;">Get started by adding your first course</p>
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
            
            html += `
                <div class="course-card" data-course-id="${course.id}" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white;">
                    <div class="course-card-header" style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                        <div class="course-header-content" style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 class="course-code" style="margin: 0; font-size: 1.1rem;">${course.course_code}</h3>
                            <span class="course-status ${status === 'active' ? 'active' : 'inactive'}" 
                                  style="padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; 
                                         background: ${status === 'active' ? '#2ecc71' : '#95a5a6'}; 
                                         color: white;">
                                ${status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="course-card-body">
                        <h4 style="margin: 0 0 10px 0;">${course.course_name}</h4>
                        <p class="course-description" style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">
                            ${course.description || 'No description available'}
                        </p>
                        <div class="course-meta" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                            <div class="meta-item" style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-graduation-cap" style="color: #3498db;"></i>
                                <span style="font-size: 0.9rem;">${course.program_name}</span>
                            </div>
                            <div class="meta-item" style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-star" style="color: #f39c12;"></i>
                                <span style="font-size: 0.9rem;">${course.credits} Credits</span>
                            </div>
                            <div class="meta-item" style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-users" style="color: #9b59b6;"></i>
                                <span style="font-size: 0.9rem;">${enrolledStudents} Enrolled</span>
                            </div>
                        </div>
                        <div class="course-actions" style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-info" 
                                    onclick="app.courses.openCourseEnrollmentModal('${course.id}')"
                                    style="padding: 5px 10px; font-size: 0.85rem;">
                                <i class="fas fa-user-plus"></i> Enroll
                            </button>
                            ${canGrade ? `
                                <button class="btn btn-sm btn-success" 
                                        onclick="app.courses.openBulkGradeForCourse('${course.id}')"
                                        style="padding: 5px 10px; font-size: 0.85rem;">
                                    <i class="fas fa-chart-line"></i> Grade
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" 
                                    onclick="app.courses.editCourse('${course.id}')"
                                    style="padding: 5px 10px; font-size: 0.85rem;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="app.courses.deleteCoursePrompt('${course.id}', '${safeCode}')"
                                    style="padding: 5px 10px; font-size: 0.85rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
    }
    
    updateCoursesTable(courses) {
        const tbody = document.getElementById('coursesTableBody');
        if (!tbody) {
            console.error('❌ coursesTableBody element not found');
            return;
        }
        
        if (!courses || courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-book fa-2x mb-2" style="color: #ccc;"></i>
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
                    <td><strong>${course.course_code}</strong></td>
                    <td>${course.course_name}</td>
                    <td>${course.program_name}</td>
                    <td>${course.credits}</td>
                    <td>
                        <span class="badge ${enrolledStudents > 0 ? 'badge-info' : 'badge-secondary'}" 
                              style="background: ${enrolledStudents > 0 ? '#3498db' : '#95a5a6'}; color: white; padding: 3px 8px; border-radius: 4px;">
                            ${enrolledStudents}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${status === 'active' ? 'badge-success' : 'badge-secondary'}"
                              style="background: ${status === 'active' ? '#2ecc71' : '#95a5a6'}; color: white; padding: 3px 8px; border-radius: 4px;">
                            ${status.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons" style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-info" 
                                    onclick="app.courses.openCourseEnrollmentModal('${course.id}')" 
                                    title="Enroll"
                                    style="padding: 3px 8px; font-size: 0.8rem;">
                                <i class="fas fa-user-plus"></i>
                            </button>
                            ${enrolledStudents > 0 ? `
                                <button class="btn btn-sm btn-success" 
                                        onclick="app.courses.openBulkGradeForCourse('${course.id}')" 
                                        title="Grade"
                                        style="padding: 3px 8px; font-size: 0.8rem;">
                                    <i class="fas fa-chart-line"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" 
                                    onclick="app.courses.editCourse('${course.id}')" 
                                    title="Edit"
                                    style="padding: 3px 8px; font-size: 0.8rem;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="app.courses.deleteCoursePrompt('${course.id}', '${safeCode}')" 
                                    title="Delete"
                                    style="padding: 3px 8px; font-size: 0.8rem;">
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
            
            // Populate form
            document.getElementById('courseCode').value = course.course_code || course.code || '';
            document.getElementById('courseName').value = course.course_name || course.name || '';
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
    
    async deleteCoursePrompt(courseId, courseCode) {
        const confirmMessage = `Delete course "${courseCode}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;
        
        try {
            if (!this.db.deleteCourse) {
                throw new Error('deleteCourse method not available in database');
            }
            
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
            } else {
                console.warn('getStudentsByCourse not available, trying getEnrollments');
                if (this.db.getEnrollments && typeof this.db.getEnrollments === 'function') {
                    const enrollments = await this.db.getEnrollments({ course_id: courseId });
                    if (enrollments && enrollments.length > 0) {
                        const allStudents = await this.db.getStudents();
                        enrolledStudents = enrollments.map(enrollment => {
                            const student = allStudents.find(s => s.id === enrollment.student_id);
                            return student ? { ...student, enrollment_id: enrollment.id } : null;
                        }).filter(Boolean);
                    }
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
            <div class="modal active" id="enrollmentModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: block;">
                <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; max-width: 1000px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;"><i class="fas fa-user-plus"></i> Manage Enrollments</h3>
                        <span class="close" onclick="this.closest('.modal').remove()" style="cursor: pointer; font-size: 1.5rem;">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="enrollment-info" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 5px 0;">${course.course_code} - ${course.course_name}</h4>
                            <p style="margin: 0; opacity: 0.9;">${course.description || 'No description'}</p>
                            <div class="enrollment-stats" style="display: flex; gap: 10px; margin-top: 10px;">
                                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 4px; font-size: 0.9rem;">
                                    <i class="fas fa-users"></i> ${enrolledStudents.length} Enrolled
                                </span>
                                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 4px; font-size: 0.9rem;">
                                    <i class="fas fa-user-plus"></i> ${availableStudents.length} Available
                                </span>
                            </div>
                        </div>
                        
                        <div class="enrollment-controls" style="margin-bottom: 20px;">
                            <div class="row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                                <div style="flex: 1;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Study Centre:</label>
                                    <select id="enrollmentStudyCenter" class="form-control" onchange="app.courses.filterEnrollmentLists()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="">All Centres</option>
                                        ${this.centres.map(c => `
                                            <option value="${c.name || c.value || c}">${c.name || c.label || c}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div style="flex: 1;">
                                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Intake Year:</label>
                                    <select id="enrollmentIntakeYear" class="form-control" onchange="app.courses.filterEnrollmentLists()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="">All Years</option>
                                        ${this.intakeYears.map(year => `
                                            <option value="${year}">${year}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="enrollment-sections" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="enrollment-section" style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #dee2e6;">
                                <h5 style="border-bottom: 2px solid #2ecc71; padding-bottom: 10px; margin-bottom: 15px; font-size: 1rem; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-users text-success"></i> Enrolled Students (${enrolledStudents.length})
                                </h5>
                                ${this.renderStudentList(enrolledStudents, true, course.id)}
                            </div>
                            <div class="enrollment-section" style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #dee2e6;">
                                <h5 style="border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; font-size: 1rem; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-user-plus text-primary"></i> Available Students (${availableStudents.length})
                                </h5>
                                ${this.renderStudentList(availableStudents, false, course.id)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-secondary" onclick="document.getElementById('enrollmentModal').remove()" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
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
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f1f1;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Name</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Reg No</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Centre</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Intake</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Program</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.forEach(student => {
            const centreDisplay = student.centre_name || student.centre || 'N/A';
            const programDisplay = student.program || 'N/A';
            const safeId = student.id.toString().replace(/'/g, "\\'");
            
            html += `
                <tr data-student-id="${student.id}" 
                    data-centre="${centreDisplay}" 
                    data-intake="${student.intake_year}"
                    style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 32px; height: 32px; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || student.name || 'Student'}</strong>
                                <div style="font-size: 0.8rem; color: #666;">${student.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 8px;"><code>${student.reg_number || 'N/A'}</code></td>
                    <td style="padding: 8px;">${centreDisplay}</td>
                    <td style="padding: 8px;">${student.intake_year || 'N/A'}</td>
                    <td style="padding: 8px;">${programDisplay}</td>
                    <td style="padding: 8px;">
                        ${isEnrolled ? `
                            <button class="btn btn-sm btn-danger" 
                                    onclick="app.courses.removeEnrollment('${courseId}', '${safeId}')"
                                    style="padding: 3px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success" 
                                    onclick="app.courses.addEnrollment('${courseId}', '${safeId}')"
                                    style="padding: 3px 8px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
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
            // Get student details
            const student = await this.db.getStudent(studentId);
            const program = this.programs.find(p => 
                p.code === student.program || 
                p.value === student.program
            );
            
            const enrollmentData = {
                student_id: studentId,
                course_id: courseId,
                program_id: program ? program.id || program.value : null,
                academic_year: new Date().getFullYear(),
                semester: 'Semester 1',
                enrollment_date: new Date().toISOString().split('T')[0],
                enrollment_status: 'enrolled',
                is_active: true
            };
            
            // Use enrollStudent method
            if (this.db.enrollStudent && typeof this.db.enrollStudent === 'function') {
                await this.db.enrollStudent(enrollmentData);
            } else if (this.db.addEnrollment && typeof this.db.addEnrollment === 'function') {
                await this.db.addEnrollment(enrollmentData);
            } else {
                throw new Error('No enrollment method available');
            }
            
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
            // Use deleteEnrollment method
            if (this.db.deleteEnrollment && typeof this.db.deleteEnrollment === 'function') {
                // Need to find enrollment ID first
                const enrollments = await this.db.getEnrollments({ 
                    course_id: courseId, 
                    student_id: studentId 
                });
                
                if (enrollments && enrollments.length > 0) {
                    await this.db.deleteEnrollment(enrollments[0].id);
                } else {
                    throw new Error('Enrollment not found');
                }
            } else if (this.db.removeEnrollment && typeof this.db.removeEnrollment === 'function') {
                await this.db.removeEnrollment(courseId, studentId);
            } else {
                throw new Error('No remove enrollment method available');
            }
            
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
            let students = [];
            if (this.db.getStudentsByCourse && typeof this.db.getStudentsByCourse === 'function') {
                students = await this.db.getStudentsByCourse(courseId);
            } else if (this.db.getEnrollments && typeof this.db.getEnrollments === 'function') {
                const enrollments = await this.db.getEnrollments({ course_id: courseId });
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
            const safeId = studentId.toString().replace(/'/g, "\\'");
            
            html += `
                <tr data-student-id="${studentId}">
                    <td class="text-center">
                        <input type="checkbox" class="student-checkbox" 
                               data-student-id="${safeId}"
                               onchange="toggleStudentSelection(this)">
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-2">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <strong>${student.full_name || student.name || 'Student'}</strong>
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
                                   data-student-id="${safeId}"
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
            if (!this.db.addMark) {
                throw new Error('addMark method not available in database');
            }
            
            const savePromises = studentsToGrade.map(gradeData => {
                return this.db.addMark(gradeData);
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
        const query = document.getElementById('courseSearch')?.value.toLowerCase() || '';
        
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
