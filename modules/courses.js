// modules/courses.js
class CourseManager {
    constructor(db) {
        this.db = db;
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
            
            // Render courses...
            // Your existing loadCourses logic here
            
        } catch (error) {
            console.error('Error loading courses:', error);
        }
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
            if (!courseData.code || !courseData.name || !courseData.program) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const course = await this.db.addCourse(courseData);
            
            this.showToast(`Course "${course.course_code}" added successfully!`, 'success');
            
            closeModal('courseModal');
            document.getElementById('courseForm').reset();
            
            await this.loadCourses();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // Helper method for toast (or use the UI manager)
    showToast(message, type = 'info') {
        // Your toast implementation
        console.log(`[${type}] ${message}`);
    }
}
