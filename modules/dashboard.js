// modules/dashboard.js - Dashboard module (XSS Secured) - FIXED
class DashboardManager {
    constructor(db) {
        this.db = db;
        this.chartInstances = {};
    }
    
    async updateDashboard() {
        try {
            const [students, marks, courses, settings] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses(),
                this.db.getSettings()
            ]);
            
            // Update all statistics
            this._updateStatistics(students, marks, courses, settings);
            
            // Update charts
            this._updateCharts(students, marks);
            
            // Load recent activities
            await this._loadRecentActivities();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this._showDashboardError();
        }
    }
    
    /**
     * Update all statistics for the 6 cards
     */
    _updateStatistics(students, marks, courses, settings) {
        // 1. Total Students
        this._updateStat('totalStudents', students.length);
        
        // 2. Active Centres
        this._updateStat('activeCentres', this._countActiveCentres(students));
        
        // 3. Active Programs (Card with count AND tags)
        this._updateActivePrograms(students, settings);
        
        // 4. Counties Covered
        this._updateStat('countiesCovered', this._countCountiesCovered(students));
        
        // 5. Total Courses
        this._updateStat('totalCourses', courses.length);
        
        // 6. Total Marks
        this._updateStat('totalMarks', marks.length);
        
        // 7. Average Grade (optional extra card if you have it)
        if (marks.length > 0) {
            const avgPercentage = marks.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / marks.length;
            const grade = this.db.calculateGrade(avgPercentage);
            this._updateStat('avgGrade', grade.grade);
        } else {
            this._updateStat('avgGrade', 'N/A');
        }
    }
    
    /**
     * Update a statistic element
     */
    _updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * Count active centres from student data
     */
    _countActiveCentres(students) {
        const centres = new Set();
        students.forEach(student => {
            if (student.centre && student.centre.trim()) {
                centres.add(student.centre.trim().toLowerCase());
            }
        });
        return centres.size;
    }
    
    /**
     * Count unique counties covered
     */
    _countCountiesCovered(students) {
        const counties = new Set();
        students.forEach(student => {
            if (student.county && student.county.trim()) {
                counties.add(student.county.trim().toLowerCase());
            }
        });
        return counties.size;
    }
    
    /**
     * Update active programs card with count and tags
     */
    _updateActivePrograms(students, settings) {
        // Count active programs
        const programSet = new Set();
        students.forEach(student => {
            if (student.program && student.program.trim()) {
                programSet.add(student.program);
            }
        });
        
        // Update the count
        this._updateStat('activePrograms', programSet.size);
        
        // Update the program tags
        const programList = document.getElementById('programList');
        if (programList) {
            if (programSet.size === 0) {
                programList.innerHTML = '<span class="program-tag">No active programs</span>';
                return;
            }
            
            // Get program names from settings if available
            let programTags = Array.from(programSet);
            
            // If we have settings with program names, use those
            if (settings && settings.programs) {
                programTags = programTags.map(programId => {
                    return settings.programs[programId]?.name || programId;
                });
            }
            
            // Limit to 4-5 programs for display
            const displayPrograms = programTags.slice(0, 5);
            
            // Create tags with XSS protection
            const tagsHtml = displayPrograms.map(program => 
                `<span class="program-tag">${this._escapeHtml(program)}</span>`
            ).join('');
            
            programList.innerHTML = tagsHtml;
            
            // Show "+ more" if there are more programs
            if (programTags.length > 5) {
                programList.innerHTML += `<span class="program-tag">+${programTags.length - 5} more</span>`;
            }
        }
    }
    
    /**
     * Update all charts - FIXED with proper chart destruction
     */
    _updateCharts(students, marks) {
        try {
            // Destroy existing charts if they exist
            this._destroyAllCharts();
            
            // Initialize chart instances object
            this.chartInstances = {};
            
            // Create charts based on your HTML
            this._createCountyChart(students);
            this._createCentreChart(students);
            this._createProgramChart(students);
            
        } catch (error) {
            console.error('Error updating charts:', error);
            this._showChartError();
        }
    }
    
    /**
     * Destroy all existing charts properly
     */
    _destroyAllCharts() {
        // Destroy charts from our instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                } catch (destroyError) {
                    console.warn('Error destroying chart:', destroyError);
                }
            }
        });
        
        // Also check if Chart.js has any charts attached to canvas elements
        const canvasIds = ['countyChart', 'centreChart', 'programChart'];
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                // Get any existing chart on this canvas
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    try {
                        existingChart.destroy();
                    } catch (e) {
                        console.warn(`Could not destroy chart on ${canvasId}:`, e);
                    }
                }
            }
        });
        
        // Clear our instances
        this.chartInstances = {};
    }
    
    /**
     * Create county distribution chart
     */
    _createCountyChart(students) {
        const countyCtx = document.getElementById('countyChart');
        if (!countyCtx) return;
        
        // Check if there's already a chart on this canvas
        const existingChart = Chart.getChart(countyCtx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (e) {
                console.warn('Could not destroy existing county chart:', e);
            }
        }
        
        const countyCounts = {};
        students.forEach(student => {
            if (student.county) {
                const county = this._escapeHtml(student.county);
                countyCounts[county] = (countyCounts[county] || 0) + 1;
            }
        });
        
        // Sort by count (descending) and take top 10
        const sortedCounties = Object.entries(countyCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const labels = sortedCounties.map(([county]) => county);
        const data = sortedCounties.map(([, count]) => count);
        
        // Create new chart
        try {
            this.chartInstances.countyChart = new Chart(countyCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Students',
                        data: data,
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Students'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'County'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating county chart:', error);
        }
    }
    
    /**
     * Create centre enrollment chart
     */
    _createCentreChart(students) {
        const centreCtx = document.getElementById('centreChart');
        if (!centreCtx) return;
        
        // Check if there's already a chart on this canvas
        const existingChart = Chart.getChart(centreCtx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (e) {
                console.warn('Could not destroy existing centre chart:', e);
            }
        }
        
        const centreCounts = {};
        students.forEach(student => {
            if (student.centre) {
                const centre = this._escapeHtml(student.centre);
                centreCounts[centre] = (centreCounts[centre] || 0) + 1;
            }
        });
        
        // Sort by count (descending) and take top 8
        const sortedCentres = Object.entries(centreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        
        const labels = sortedCentres.map(([centre]) => centre);
        const data = sortedCentres.map(([, count]) => count);
        
        try {
            this.chartInstances.centreChart = new Chart(centreCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
                            '#9b59b6', '#1abc9c', '#d35400', '#34495e'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating centre chart:', error);
        }
    }
    
    /**
     * Create program distribution chart
     */
    _createProgramChart(students) {
        const programCtx = document.getElementById('programChart');
        if (!programCtx) return;
        
        // Check if there's already a chart on this canvas
        const existingChart = Chart.getChart(programCtx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (e) {
                console.warn('Could not destroy existing program chart:', e);
            }
        }
        
        const programCounts = {};
        students.forEach(student => {
            if (student.program) {
                const program = this._escapeHtml(student.program);
                programCounts[program] = (programCounts[program] || 0) + 1;
            }
        });
        
        const labels = Object.keys(programCounts);
        const data = Object.values(programCounts);
        
        try {
            this.chartInstances.programChart = new Chart(programCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
                            '#9b59b6', '#1abc9c', '#d35400', '#34495e',
                            '#7f8c8d', '#27ae60'
                        ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    /**
     * Load recent activities
     */
    async _loadRecentActivities() {
        try {
            const activities = await this.db.getRecentActivities(10);
            const container = document.getElementById('activityList');
            if (!container) return;
            
            if (!activities || activities.length === 0) {
                container.innerHTML = '<p class="no-activities">No recent activities</p>';
                return;
            }
            
            let html = '';
            activities.forEach(activity => {
                const timeAgo = this._getTimeAgo(activity.created_at);
                const icon = this._getActivityIcon(activity.type);
                const description = this._escapeHtml(activity.description || 'Activity recorded');
                
                html += `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="activity-details">
                            <p>${description}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading recent activities:', error);
            const container = document.getElementById('activityList');
            if (container) {
                container.innerHTML = '<p class="error-activities">Unable to load activities</p>';
            }
        }
    }
    
    /**
     * Get time ago string
     */
    _getTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return 'Over a month ago';
    }
    
    /**
     * Get activity icon based on type
     */
    _getActivityIcon(type) {
        const icons = {
            'student_registered': 'fas fa-user-plus',
            'student_updated': 'fas fa-user-edit',
            'student_deleted': 'fas fa-user-minus',
            'marks_entered': 'fas fa-chart-bar',
            'marks_updated': 'fas fa-chart-line',
            'course_added': 'fas fa-book',
            'course_updated': 'fas fa-book-open',
            'settings_updated': 'fas fa-cog',
            'transcript_generated': 'fas fa-file-pdf',
            'report_generated': 'fas fa-chart-line',
            'login': 'fas fa-sign-in-alt',
            'logout': 'fas fa-sign-out-alt',
            'export': 'fas fa-download',
            'import': 'fas fa-upload'
        };
        return icons[type] || 'fas fa-info-circle';
    }
    
    /**
     * Show dashboard error
     */
    _showDashboardError() {
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'dashboard-error';
            errorDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Unable to load dashboard data. Please try again.</span>
                    <button class="btn-retry" onclick="app.dashboard.updateDashboard()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
            statsGrid.parentNode.insertBefore(errorDiv, statsGrid);
        }
    }
    
    /**
     * Show chart error
     */
    _showChartError() {
        const charts = document.querySelectorAll('.chart-card canvas');
        charts.forEach(canvas => {
            const parent = canvas.parentElement;
            parent.innerHTML = `
                <div class="chart-error">
                    <i class="fas fa-chart-line"></i>
                    <p>Chart data unavailable</p>
                </div>
            `;
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cleanup method to call when leaving dashboard
     */
    cleanup() {
        this._destroyAllCharts();
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined' && typeof window.DashboardManager !== 'undefined') {
    window.DashboardManager = DashboardManager;
}
