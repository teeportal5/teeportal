 // modules/courses.js - Course management module
class CourseManager {
    constructor(db) {
        this.db = db;
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
            
            closeModal('courseModal');
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
                                <span><i class="fas fa-calendar"></i> ${createdAt}</span>
                            </div>
                        </div>
                        <div class="course-actions">
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
            const course = await this.db.getCourse(courseId);
            
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
            
            openModal('courseModal');
            
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
