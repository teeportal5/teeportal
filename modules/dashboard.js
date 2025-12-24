// modules/dashboard.js - Dashboard module (XSS Secured) - FIXED Syntax Error
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
            
            // Update charts - pass settings
        this._updateCharts(students, marks, settings);
            
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
 * Update active programs card with count and tags - SIMPLIFIED VERSION
 */
async _updateActivePrograms(students, settings) {
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
    if (!programList) return;
    
    if (programSet.size === 0) {
        programList.innerHTML = '<span class="program-tag">No active programs</span>';
        return;
    }
    
    try {
        // Fetch all programs from database
        const allPrograms = await this.db.getPrograms(); // YOU NEED TO ADD THIS METHOD!
        
        // Create a map of program ID to name
        const programMap = {};
        if (allPrograms && Array.isArray(allPrograms)) {
            allPrograms.forEach(program => {
                programMap[program.id] = program.name;
            });
        }
        
        // Get program names from the map
        const programIds = Array.from(programSet);
        const programNames = programIds.map(id => {
            return programMap[id] || id; // Fallback to ID if name not found
        }).filter(name => name && name.trim());
        
        // Limit to 4-5 programs for display
        const displayPrograms = programNames.slice(0, 5);
        
        // Create tags with XSS protection
        if (displayPrograms.length === 0) {
            programList.innerHTML = '<span class="program-tag">No program names found</span>';
            return;
        }
        
        const tagsHtml = displayPrograms.map(program => 
            `<span class="program-tag">${this._escapeHtml(program)}</span>`
        ).join('');
        
        programList.innerHTML = tagsHtml;
        
        // Show "+ more" if there are more programs
        if (programNames.length > 5) {
            programList.innerHTML += `<span class="program-tag">+${programNames.length - 5} more</span>`;
        }
        
    } catch (error) {
        console.error('Error loading program names:', error);
        // Fallback: show program IDs
        const programIds = Array.from(programSet);
        const displayIds = programIds.slice(0, 5);
        const tagsHtml = displayIds.map(id => 
            `<span class="program-tag">${this._escapeHtml(id.substring(0, 8) + '...')}</span>`
        ).join('');
        programList.innerHTML = tagsHtml;
    }
}
    
    /**
     * Create county distribution chart
     */
    _createCountyChart(students) {
        const countyCtx = document.getElementById('countyChart');
        if (!countyCtx) return;
        
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
    }
    
    /**
     * Create centre enrollment chart
     */
    _createCentreChart(students) {
        const centreCtx = document.getElementById('centreChart');
        if (!centreCtx) return;
        
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
    }
    
    /**
 * Create program distribution chart - SIMPLIFIED VERSION
 */
async _createProgramChart(students, settings) {
    const programCtx = document.getElementById('programChart');
    if (!programCtx) return;
    
    const programCounts = {};
    
    try {
        // Fetch all programs from database
        const allPrograms = await this.db.getPrograms(); // YOU NEED TO ADD THIS METHOD!
        
        // Create a map of program ID to name
        const programMap = {};
        if (allPrograms && Array.isArray(allPrograms)) {
            allPrograms.forEach(program => {
                programMap[program.id] = program.name;
            });
        }
        
        // Count students per program
        students.forEach(student => {
            if (student.program && student.program.trim()) {
                const programName = programMap[student.program] || student.program;
                programCounts[programName] = (programCounts[programName] || 0) + 1;
            }
        });
        
    } catch (error) {
        console.error('Error loading programs for chart:', error);
        // Fallback: count by program ID
        students.forEach(student => {
            if (student.program && student.program.trim()) {
                programCounts[student.program] = (programCounts[student.program] || 0) + 1;
            }
        });
    }
    
    const labels = Object.keys(programCounts);
    const data = Object.values(programCounts);
    
    // Only create chart if we have data
    if (labels.length === 0) {
        programCtx.parentElement.innerHTML = '<p class="no-data">No program data available</p>';
        return;
    }
    
    // Clean up labels (truncate long UUIDs)
    const cleanLabels = labels.map(label => {
        if (label.length > 36) {
            return label.substring(0, 15) + '...';
        }
        return label;
    });
    
    this.chartInstances.programChart = new Chart(programCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: cleanLabels,
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
 * Helper to clean program names
 */
_cleanProgramName(programName) {
    if (!programName) return 'Unknown';
    
    const str = programName.toString();
    
    // If it contains UUID-like pattern and readable text, extract readable part
    if (str.includes('advanced') || str.includes('basic') || str.includes('intermediate')) {
        const matches = str.match(/(advanced|basic|intermediate|standard|premium|professional)/i);
        if (matches && matches[1]) {
            return matches[1].charAt(0).toUpperCase() + matches[1].slice(1);
        }
    }
    
    // If it's a UUID or too long, truncate
    if (str.length > 36) {
        // Try to find a readable substring
        const readableMatch = str.match(/[a-zA-Z]{4,}/);
        if (readableMatch) {
            return readableMatch[0];
        }
        return str.substring(0, 15) + '...';
    }
    
    return str;
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
        // Destroy existing charts
        Object.keys(this.chartInstances).forEach(chartId => {
            const chart = this.chartInstances[chartId];
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                } catch (error) {
                    console.warn('Error destroying chart:', error);
                }
            }
        });
        this.chartInstances = {};
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
