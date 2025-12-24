// modules/dashboard.js - Dashboard module with REAL centre data
class DashboardManager {
    constructor(db) {
        this.db = db;
        this.chartInstances = {};
    }
    
    async updateDashboard() {
        try {
            console.log('📊 Updating dashboard with real data...');
            
            // Fetch ALL data in parallel
            const [students, marks, courses, centres, settings] = await Promise.all([
                this.db.getStudents(),
                this.db.getMarks(),
                this.db.getCourses(),
                this.db.getCentres(), // ADDED: Get centres from database
                this.db.getSettings()
            ]);
            
            console.log('📈 Data loaded:', {
                students: students.length,
                marks: marks.length,
                courses: courses.length,
                centres: centres.length,
                centresData: centres // Log first few centres
            });
            
            // Update all statistics with REAL centre data
            await this._updateStatistics(students, marks, courses, centres, settings);
            
            // Update charts with REAL centre data
            await this._updateCharts(students, marks, centres);
            
            // Load recent activities
            await this._loadRecentActivities();
            
            console.log('✅ Dashboard updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating dashboard:', error);
            this._showDashboardError();
        }
    }
    
    /**
     * Update all statistics for the 6 cards with REAL centre data
     */
    async _updateStatistics(students, marks, courses, centres, settings) {
        console.log('📊 Updating statistics with real centre data...');
        
        // 1. Total Students
        this._updateStat('totalStudents', students.length);
        
        // 2. Active Centres - FROM DATABASE
        const activeCentresCount = this._countActiveCentresFromDB(centres);
        this._updateStat('activeCentres', activeCentresCount);
        
        // 3. Active Programs (Card with count AND tags)
        await this._updateActivePrograms(students);
        
        // 4. Counties Covered - FROM DATABASE
        const countiesCount = this._countCountiesFromDB(centres);
        this._updateStat('countiesCovered', countiesCount);
        
        // 5. Total Courses
        this._updateStat('totalCourses', courses.length);
        
        // 6. Total Marks
        this._updateStat('totalMarks', marks.length);
        
        // 7. Average Grade (optional)
        if (marks.length > 0) {
            const avgPercentage = marks.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / marks.length;
            const grade = this.db.calculateGrade(avgPercentage);
            this._updateStat('avgGrade', grade.grade);
        } else {
            this._updateStat('avgGrade', 'N/A');
        }
        
        // NEW: Show actual centre names in tooltip
        this._updateCentreTooltip(centres);
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
     * Count active centres FROM DATABASE
     */
    _countActiveCentresFromDB(centres) {
        if (!centres || !Array.isArray(centres)) return 0;
        
        // Count centres with status 'active' or no status (assume active)
        const activeCentres = centres.filter(centre => 
            !centre.status || centre.status === 'active' || centre.status === ''
        );
        
        console.log(`🏢 Active centres from DB: ${activeCentres.length} of ${centres.length}`);
        return activeCentres.length;
    }
    
    /**
     * Count unique counties FROM DATABASE
     */
    _countCountiesFromDB(centres) {
        if (!centres || !Array.isArray(centres)) return 0;
        
        const counties = new Set();
        centres.forEach(centre => {
            if (centre.county && centre.county.trim()) {
                counties.add(centre.county.trim());
            }
        });
        
        console.log(`🗺️ Counties from DB: ${counties.size}`);
        return counties.size;
    }
    
    /**
     * Update centre tooltip with actual centre names
     */
    _updateCentreTooltip(centres) {
        const centreCard = document.querySelector('.stat-card:nth-child(2)'); // Active Centres card
        if (!centreCard || !centres || centres.length === 0) return;
        
        // Get top 5 centres
        const topCentres = centres.slice(0, 5);
        const centreNames = topCentres.map(c => c.name || 'Unnamed').join(', ');
        
        // Add tooltip
        centreCard.title = `Centres: ${centreNames}${centres.length > 5 ? '...' : ''}`;
        
        // Also update the small text
        const smallText = centreCard.querySelector('small');
        if (smallText) {
            smallText.textContent = `${centres.length} centres total`;
        }
    }
    
    /**
     * Update active programs card with count and tags
     */
    async _updateActivePrograms(students) {
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
            const allPrograms = await this.db.getPrograms();
            
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
     * Update all charts with REAL centre data
     */
    async _updateCharts(students, marks, centres) {
        try {
            console.log('📈 Updating charts with real centre data...');
            
            // Destroy existing charts
            Object.keys(this.chartInstances).forEach(chartId => {
                const chart = this.chartInstances[chartId];
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            
            // Initialize chart instances object
            this.chartInstances = {};
            
            // Create charts
            this._createCountyChart(students);
            await this._createCentreChartWithDB(students, centres); // UPDATED: Use real centres
            await this._createProgramChart(students);
            
        } catch (error) {
            console.error('Error updating charts:', error);
            this._showChartError();
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
        
        // Only create chart if we have data
        if (labels.length === 0) {
            countyCtx.parentElement.innerHTML = '<p class="no-data">No county data available</p>';
            return;
        }
        
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
     * Create centre enrollment chart WITH REAL DATABASE CENTRES
     */
    async _createCentreChartWithDB(students, centres) {
        const centreCtx = document.getElementById('centreChart');
        if (!centreCtx) return;
        
        try {
            console.log('🏢 Creating centre chart with', centres.length, 'centres from DB');
            
            // Count students per centre
            const centreCounts = {};
            
            // First, initialize all centres from database
            centres.forEach(centre => {
                if (centre.name) {
                    centreCounts[centre.name] = 0;
                }
            });
            
            // Then count students in each centre
            students.forEach(student => {
                const centreName = student.centre_name || student.centre;
                if (centreName && centreCounts.hasOwnProperty(centreName)) {
                    centreCounts[centreName] += 1;
                }
            });
            
            // Filter out centres with 0 students (optional)
            const centresWithStudents = Object.entries(centreCounts)
                .filter(([_, count]) => count > 0);
            
            // Sort by student count (descending)
            const sortedCentres = centresWithStudents.sort((a, b) => b[1] - a[1]);
            
            const labels = sortedCentres.map(([centre]) => centre);
            const data = sortedCentres.map(([, count]) => count);
            
            console.log('📊 Centre chart data:', { labels, data });
            
            // Only create chart if we have data
            if (labels.length === 0) {
                centreCtx.parentElement.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-building fa-2x"></i>
                        <p>No student enrollment data for centres</p>
                        <small>${centres.length} centres in database</small>
                    </div>
                `;
                return;
            }
            
            // Destroy existing chart if it exists
            if (this.chartInstances.centreChart) {
                this.chartInstances.centreChart.destroy();
            }
            
            this.chartInstances.centreChart = new Chart(centreCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
                            '#9b59b6', '#1abc9c', '#d35400', '#34495e',
                            '#16a085', '#8e44ad', '#2c3e50', '#f1c40f'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${value} students`;
                                }
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error creating centre chart with DB data:', error);
            // Fallback to student data
            this._createCentreChartFallback(students);
        }
    }
    
    /**
     * Fallback method for centre chart
     */
    _createCentreChartFallback(students) {
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
        
        if (labels.length === 0) {
            centreCtx.parentElement.innerHTML = '<p class="no-data">No centre data available</p>';
            return;
        }
        
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
     * Create program distribution chart
     */
    async _createProgramChart(students) {
        const programCtx = document.getElementById('programChart');
        if (!programCtx) return;
        
        const programCounts = {};
        
        try {
            // Fetch all programs from database
            const allPrograms = await this.db.getPrograms();
            
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
            'centre_added': 'fas fa-map-marker-alt',
            'centre_updated': 'fas fa-map-marker',
            'centre_deleted': 'fas fa-map-marker-times',
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
                    <small>Check console for details</small>
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
    
    /**
     * Quick refresh (for when new data is added)
     */
    async quickRefresh() {
        try {
            console.log('🔄 Quick refreshing dashboard...');
            await this.updateDashboard();
        } catch (error) {
            console.error('Quick refresh failed:', error);
        }
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined' && typeof window.DashboardManager === 'undefined') {
    window.DashboardManager = DashboardManager;
}
