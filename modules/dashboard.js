// modules/dashboard.js - Dashboard module
class DashboardManager {
    constructor(db) {
        this.db = db;
        this.chartInstances = {};
    }
    
    async updateDashboard() {
        try {
            const [students, marks, courses] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses()
            ]);
            
            const settings = await this.db.getSettings();
            
            // Update stats
            this.updateStat('totalStudents', students.length);
            this.updateStat('activePrograms', this.countActivePrograms(students));
            this.updateStat('currentIntake', settings.academicYear || new Date().getFullYear());
            this.updateStat('totalCourses', courses.length);
            this.updateStat('totalMarks', marks.length);
            
            // Calculate average grade
            if (marks.length > 0) {
                const avgPercentage = marks.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / marks.length;
                const grade = this.db.calculateGrade(avgPercentage);
                this.updateStat('avgGrade', grade.grade);
            } else {
                this.updateStat('avgGrade', 'N/A');
            }
            
            this.updateCharts(students, marks);
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    countActivePrograms(students) {
        const programs = new Set(students.map(s => s.program).filter(Boolean));
        return programs.size;
    }
    
    updateCharts(students, marks) {
        try {
            // Destroy existing charts if they exist
            if (this.chartInstances) {
                Object.values(this.chartInstances).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
            }
            
            // Initialize chart instances object
            this.chartInstances = {};
            
            // Program Distribution Chart
            const programCtx = document.getElementById('programChart');
            if (programCtx) {
                const programCounts = {};
                students.forEach(student => {
                    programCounts[student.program] = (programCounts[student.program] || 0) + 1;
                });
                
                this.chartInstances.programChart = new Chart(programCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(programCounts).map(p => p.toUpperCase()),
                        datasets: [{
                            data: Object.values(programCounts),
                            backgroundColor: ['#3498db', '#2ecc71', '#9b59b6', '#f39c12']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
            
            // Enrollment Chart
            const enrollmentCtx = document.getElementById('enrollmentChart');
            if (enrollmentCtx) {
                const intakeCounts = {};
                students.forEach(student => {
                    intakeCounts[student.intake_year] = (intakeCounts[student.intake_year] || 0) + 1;
                });
                
                const years = Object.keys(intakeCounts).sort();
                const counts = years.map(year => intakeCounts[year]);
                
                this.chartInstances.enrollmentChart = new Chart(enrollmentCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [{
                            label: 'Student Enrollment',
                            data: counts,
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
            // Grade Distribution Chart
            const gradeCtx = document.getElementById('gradeChart');
            if (gradeCtx && marks.length > 0) {
                const gradeCounts = {};
                marks.forEach(mark => {
                    gradeCounts[mark.grade] = (gradeCounts[mark.grade] || 0) + 1;
                });
                
                this.chartInstances.gradeChart = new Chart(gradeCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(gradeCounts),
                        datasets: [{
                            label: 'Number of Grades',
                            data: Object.values(gradeCounts),
                            backgroundColor: '#2ecc71'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }
    
    async loadRecentActivities() {
        try {
            const activities = await this.db.getRecentActivities(5);
            const container = document.querySelector('.activity-list');
            if (!container) return;
            
            if (!activities || activities.length === 0) {
                container.innerHTML = '<p>No recent activities</p>';
                return;
            }
            
            let html = '';
            activities.forEach(activity => {
                const timeAgo = this.getTimeAgo(activity.created_at);
                const icon = this.getActivityIcon(activity.type);
                
                html += `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="activity-details">
                            <p>${activity.description || 'Activity'}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }
    
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return 'Over a month ago';
    }
    
    getActivityIcon(type) {
        const icons = {
            'student_registered': 'fas fa-user-plus',
            'marks_entered': 'fas fa-chart-bar',
            'course_added': 'fas fa-book',
            'settings_updated': 'fas fa-cog',
            'transcript_generated': 'fas fa-file-pdf',
            'report_generated': 'fas fa-chart-line'
        };
        return icons[type] || 'fas fa-info-circle';
    }
}
async editStudent(studentId) {
    try {
        const student = await this.db.getStudent(studentId);
        if (!student) {
            this.ui.showToast('Student not found', 'error');
            return;
        }
        
        this.currentEditId = studentId;
        
        // Debug: Log what elements exist
        console.log('Student data:', student);
        console.log('Looking for form elements...');
        
        // Populate form fields - Use correct IDs from your HTML
        const elements = {
            'studentName': student.full_name || '',
            'studentEmail': student.email || '',
            'studentPhone': student.phone || '',
            'studentDOB': student.dob ? student.dob.split('T')[0] : '',
            'studentGender': student.gender || '',
            'studentProgram': student.program || '',
            'studentIntake': student.intake_year || '',
            'studentAddress': student.address || '',
            'emergencyContact': student.emergency_contact || '',
            'studentNotes': student.notes || ''
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            console.log(`Element ${id}:`, element, 'Value:', value);
            if (element) {
                element.value = value;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });
        
        // Change button text
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
        }
        
        // Open modal
        this.ui.openModal('studentModal');
        
    } catch (error) {
        console.error('Error editing student:', error);
        this.ui.showToast('Error loading student data', 'error');
    }
}
