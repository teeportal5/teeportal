// modules/marks.js - Professional Enhanced Marks Management Module
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.ui = app;
        
        // Enhanced table properties
        this.currentPage = 1;
        this.pageSize = 25;
        this.filteredData = [];
        this.selectedMarks = new Set();
        this.viewMode = 'table';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
    }
    
    // ==================== PROFESSIONAL GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        // Validate input
        if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
            return 'FAIL';
        }
        
        // Cap percentage at 100%
        const cappedPercentage = Math.min(percentage, 100);
        
        // Professional grading scale
        if (cappedPercentage >= 85) return 'DISTINCTION';
        if (cappedPercentage >= 70) return 'CREDIT';
        if (cappedPercentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const professionalGradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalGradePoints[upperGrade] || 0.0;
    }
    
    getGradeDescription(grade) {
        const professionalDescriptions = {
            'DISTINCTION': 'Excellent performance',
            'CREDIT': 'Good performance',
            'PASS': 'Satisfactory performance',
            'FAIL': 'Needs improvement'
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalDescriptions[upperGrade] || 'No description available';
    }
    
    getGradeCSSClass(grade) {
        const professionalClasses = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        
        const upperGrade = grade.toUpperCase();
        return professionalClasses[upperGrade] || 'grade-default';
    }
    
    // ==================== REAL-TIME VALIDATION ====================
    
    validateScoreInput(inputElement, maxScore) {
        const value = parseFloat(inputElement.value);
        
        if (isNaN(value)) {
            inputElement.value = '';
            return 0;
        }
        
        // Prevent negative scores
        if (value < 0) {
            inputElement.value = 0;
            return 0;
        }
        
        // Cap score at max score
        if (maxScore && value > maxScore) {
            inputElement.value = maxScore;
            this.showToast(`Maximum score is ${maxScore}`, 'info');
            return maxScore;
        }
        
        return value;
    }
    
    validateMaxScoreInput(inputElement) {
        const value = parseFloat(inputElement.value);
        
        if (isNaN(value) || value <= 0) {
            inputElement.value = 100;
            return 100;
        }
        
        // Handle "00" or "0" input
        if (inputElement.value === "00" || inputElement.value === "0") {
            inputElement.value = "100";
            return 100;
        }
        
        return value;
    }
    
    // ==================== ENHANCED TABLE LOADING ====================
    
    async loadMarksTable() {
        try {
            console.log('📊 Loading marks table...');
            const marks = await this.db.getMarksTableData();
            this.filteredData = marks;
            
            // Update summary stats
            this.updateSummaryStats(marks);
            
            // Update dashboard statistics
            this.updateDashboardStatistics(marks);
            
            // Apply any existing filters
            this.applyFilters();
            
            // Render based on current view mode
            this.renderCurrentView();
            
            // Update pagination
            this.updatePagination();
            
            // Update filter dropdowns
            await this.populateFilterDropdowns(marks);
            
            console.log('✅ Marks table loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading marks table:', error);
            this.showErrorState(error);
        }
    }
    
    renderCurrentView() {
        switch (this.viewMode) {
            case 'table':
                this.renderTableView();
                break;
            case 'cards':
                this.renderCardsView();
                break;
            case 'compact':
                this.renderCompactView();
                break;
        }
        this.updateSelectedCounts();
    }
    
    renderTableView() {
        const tbody = document.querySelector('#marksTableBody');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        let html = '';
        
        pageData.forEach((mark, index) => {
            const isSelected = this.selectedMarks.has(mark.id);
            const student = mark.students || {};
            const course = mark.courses || {};
            
            // Calculate values
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeCSSClass = this.getGradeCSSClass(grade);
            const gradePoints = this.getGradePoints(grade);
            const status = mark.visible_to_student ? 'published' : 'hidden';
            
            html += `
                <tr data-mark-id="${mark.id}" class="${isSelected ? 'selected' : ''}">
                    <td class="select-col">
                        <input type="checkbox" 
                               ${isSelected ? 'checked' : ''}
                               onchange="app.marks.toggleSelection('${mark.id}')">
                    </td>
                    <td class="student-col">
                        <div class="student-cell">
                            <div class="student-avatar-small">
                                ${this.getInitials(student.full_name || 'N/A')}
                            </div>
                            <div class="student-details">
                                <div class="student-name">${student.full_name || 'N/A'}</div>
                                <div class="student-id">${student.reg_number || 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="course-col">
                        <div class="course-code">${course.course_code || 'N/A'}</div>
                        <div class="course-name">${course.course_name || ''}</div>
                    </td>
                    <td class="assessment-col">
                        <div class="assessment-type">${mark.assessment_type || 'N/A'}</div>
                        <div class="assessment-name">${mark.assessment_name || ''}</div>
                    </td>
                    <td class="score-col">
                        <div class="score-display">
                            <div class="score-value">${score}/${maxScore}</div>
                            <div class="score-percentage">${percentage ? percentage.toFixed(1) : '0.0'}%</div>
                        </div>
                    </td>
                    <td class="grade-col">
                        <span class="grade-badge-table ${gradeCSSClass}" 
                              title="${this.getGradeDescription(grade)}">
                            ${grade || 'FAIL'}
                        </span>
                    </td>
                    <td class="date-col">
                        ${mark.created_at ? this.formatDate(mark.created_at) : 'N/A'}
                    </td>
                    <td class="status-col">
                        <span class="status-indicator ${status}">
                            <i class="fas fa-${status === 'published' ? 'eye' : 'eye-slash'}"></i>
                            ${status}
                        </span>
                    </td>
                    <td class="actions-col">
                        <div class="table-actions">
                            <button class="action-btn" onclick="app.marks.editMark('${mark.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="app.marks.viewDetails('${mark.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-danger" onclick="app.marks.deleteMark('${mark.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        this.addTableRowHoverEffects();
    }
    
    renderCardsView() {
        const container = document.querySelector('#marksCards');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            container.innerHTML = this.getEmptyStateHTML(true);
            return;
        }
        
        let html = '';
        
        pageData.forEach(mark => {
            const isSelected = this.selectedMarks.has(mark.id);
            const student = mark.students || {};
            const course = mark.courses || {};
            
            // Calculate values
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeCSSClass = this.getGradeCSSClass(grade);
            const gradePoints = this.getGradePoints(grade);
            
            html += `
                <div class="mark-card" data-mark-id="${mark.id}">
                    <div class="card-header">
                        <div class="student-avatar">
                            ${this.getInitials(student.full_name || 'N/A')}
                        </div>
                        <div class="student-info">
                            <h4>${student.full_name || 'N/A'}</h4>
                            <p class="student-id">${student.reg_number || 'N/A'}</p>
                        </div>
                        <div class="card-actions">
                            <input type="checkbox" class="select-card" 
                                   ${isSelected ? 'checked' : ''}
                                   onchange="app.marks.toggleSelection('${mark.id}')">
                            <button class="card-action-btn" onclick="app.marks.editMark('${mark.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="course-info">
                            <div class="course-code">${course.course_code || 'N/A'}</div>
                            <div class="course-name">${course.course_name || ''}</div>
                        </div>
                        <div class="score-display">
                            <div class="score">
                                <span class="label">Score:</span>
                                <span class="value">${score}/${maxScore}</span>
                            </div>
                            <div class="percentage">
                                <span class="label">Percentage:</span>
                                <span class="value">${percentage ? percentage.toFixed(1) : '0.0'}%</span>
                            </div>
                        </div>
                        <div class="grade-display">
                            <span class="grade-badge ${gradeCSSClass}">${grade || 'FAIL'}</span>
                            <span class="grade-points">${gradePoints.toFixed(1)} GP</span>
                        </div>
                        <div class="assessment-info">
                            <span class="type">${mark.assessment_type || 'N/A'}</span>
                            <span class="date">${mark.created_at ? this.formatDate(mark.created_at) : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="footer-actions">
                            <button class="btn-sm" onclick="app.marks.viewDetails('${mark.id}')">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button class="btn-sm btn-danger" onclick="app.marks.deleteMark('${mark.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        this.addCardHoverEffects();
    }
    
    renderCompactView() {
        const tbody = document.querySelector('#compactTableBody');
        if (!tbody) {
            // Create compact table if it doesn't exist
            const container = document.getElementById('compactView');
            if (container) {
                container.innerHTML = `
                    <table class="data-table compact-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Course</th>
                                <th>Score</th>
                                <th>Grade</th>
                                <th>%</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="compactTableBody"></tbody>
                    </table>
                `;
            }
            tbody = document.querySelector('#compactTableBody');
        }
        
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        let html = '';
        
        pageData.forEach(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            const score = mark.score || 0;
            const maxScore = mark.max_score || 100;
            let percentage = mark.percentage;
            if (!percentage && maxScore > 0) {
                percentage = (score / maxScore) * 100;
            }
            
            let grade = mark.grade;
            if (!grade && percentage !== undefined) {
                grade = this.calculateGrade(parseFloat(percentage));
            }
            
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            html += `
                <tr data-mark-id="${mark.id}">
                    <td>
                        <div class="compact-student">
                            <strong>${student.full_name || 'N/A'}</strong>
                            <small>${student.reg_number || 'N/A'}</small>
                        </div>
                    </td>
                    <td>
                        <div>${course.course_code || 'N/A'}</div>
                        <small>${mark.assessment_type || 'N/A'}</small>
                    </td>
                    <td class="text-center">
                        <strong>${score}/${maxScore}</strong>
                    </td>
                    <td class="text-center">
                        <span class="grade-badge-sm ${gradeCSSClass}">${grade || 'FAIL'}</span>
                    </td>
                    <td class="text-center">
                        ${percentage ? percentage.toFixed(1) : '0.0'}%
                    </td>
                    <td class="text-center">
                        <button class="btn-action btn-sm" onclick="app.marks.editMark('${mark.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-sm btn-danger" onclick="app.marks.deleteMark('${mark.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // ==================== TABLE UTILITIES ====================
    
    getInitials(name) {
        if (!name || name === 'N/A') return 'NA';
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }
    
    getEmptyStateHTML(isCard = false) {
        if (isCard) {
            return `
                <div class="empty-state-cards">
                    <i class="fas fa-chart-bar fa-3x"></i>
                    <h3>No Academic Records Found</h3>
                    <p>Get started by adding your first academic record</p>
                    <button class="btn-primary" onclick="app.marks.openMarksModal()">
                        <i class="fas fa-plus"></i> Add First Record
                    </button>
                </div>
            `;
        }
        
        return `
            <tr class="empty-state-row">
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-chart-bar fa-3x"></i>
                        <h3>No Academic Records Found</h3>
                        <p>Get started by adding your first academic record</p>
                        <button class="btn-primary" onclick="app.marks.openMarksModal()">
                            <i class="fas fa-plus"></i> Add First Record
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    showErrorState(error) {
        const tbody = document.querySelector('#marksTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="error-state">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p>Error loading academic records</p>
                        <small class="d-block mt-1">${error.message}</small>
                        <button class="btn btn-secondary mt-2" onclick="app.marks.loadMarksTable()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    addTableRowHoverEffects() {
        const rows = document.querySelectorAll('.enhanced-table tbody tr');
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                row.style.transform = 'scale(1.01)';
                row.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.transform = 'scale(1)';
                row.style.boxShadow = 'none';
            });
        });
    }
    
    addCardHoverEffects() {
        const cards = document.querySelectorAll('.mark-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            });
        });
    }
    
    // ==================== DASHBOARD STATISTICS UPDATER ====================
    
    updateDashboardStatistics(marks) {
        try {
            console.log('📈 Updating dashboard statistics...');
            
            // Calculate statistics
            const totalMarks = marks.length;
            const distinctStudents = new Set(marks.map(m => m.student_id)).size;
            const avgScore = marks.length > 0 
                ? (marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length).toFixed(1)
                : 0;
            
            // Grade distribution
            const gradeDistribution = {
                DISTINCTION: 0,
                CREDIT: 0,
                PASS: 0,
                FAIL: 0
            };
            
            marks.forEach(mark => {
                const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
                if (gradeDistribution[grade] !== undefined) {
                    gradeDistribution[grade]++;
                }
            });
            
            // Update dashboard elements if they exist
            this.updateDashboardElement('totalMarks', totalMarks);
            this.updateDashboardElement('totalStudents', distinctStudents);
            this.updateDashboardElement('avgGrade', `${avgScore}%`);
            
            // Update grade distribution on dashboard
            this.updateDashboardGradeDistribution(gradeDistribution, totalMarks);
            
            // Update recent activity
            this.updateRecentActivity(marks);
            
            console.log('✅ Dashboard statistics updated');
            
        } catch (error) {
            console.error('❌ Error updating dashboard statistics:', error);
        }
    }
    
    updateDashboardElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            
            // Add animation
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }
    }
    
    updateDashboardGradeDistribution(distribution, total) {
        // Update pie chart or distribution display on dashboard
        const gradeChart = document.getElementById('gradeChart');
        if (gradeChart) {
            // This would update a Chart.js chart if you have one
            console.log('Grade Distribution:', distribution);
        }
        
        // Update any grade distribution elements
        ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'].forEach(grade => {
            const element = document.getElementById(`${grade.toLowerCase()}Count`);
            if (element) {
                element.textContent = distribution[grade] || 0;
            }
        });
    }
    
    updateRecentActivity(marks) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;
        
        // Get last 5 marks sorted by date
        const recentMarks = marks
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
        
        let html = '';
        
        recentMarks.forEach(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="activity-details">
                        <p><strong>${student.full_name || 'Student'}</strong> scored ${mark.score}/${mark.max_score} in ${course.course_code || 'Course'}</p>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        recentActivity.innerHTML = html;
    }
    
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return this.formatDate(dateString);
    }
    
    // ==================== SUMMARY STATISTICS ====================
    
    updateSummaryStats(marks) {
        const totalRecords = marks.length;
        const distinctStudents = new Set(marks.map(m => m.student_id)).size;
        
        const avgScore = marks.length > 0 
            ? (marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length).toFixed(1)
            : 0;
        
        const distinctionCount = marks.filter(m => m.grade === 'DISTINCTION').length;
        
        // Update DOM elements
        this.updateElementText('totalRecords', totalRecords.toLocaleString());
        this.updateElementText('distinctStudents', distinctStudents.toLocaleString());
        this.updateElementText('avgScore', `${avgScore}%`);
        this.updateElementText('distinctionCount', distinctionCount.toLocaleString());
        
        // Update grade distribution
        this.updateGradeDistribution(marks);
        
        // Update recent updates
        this.updateRecentUpdates(marks);
    }
    
    updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            // Animate number change
            const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
            const newValue = parseInt(text.replace(/%/g, '').replace(/,/g, '')) || 0;
            
            if (!isNaN(currentValue) && !isNaN(newValue) && currentValue !== newValue) {
                this.animateNumberChange(element, currentValue, newValue);
            } else {
                element.textContent = text;
            }
        }
    }
    
    animateNumberChange(element, start, end) {
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(start + (end - start) * easeOut);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    updateGradeDistribution(marks) {
        const distribution = document.getElementById('gradeDistribution');
        if (!distribution) return;
        
        const grades = ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'];
        const counts = {};
        grades.forEach(grade => counts[grade] = 0);
        
        marks.forEach(mark => {
            const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
            if (counts[grade] !== undefined) counts[grade]++;
        });
        
        const total = marks.length;
        let html = '';
        
        grades.forEach(grade => {
            const count = counts[grade];
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
            
            html += `
                <div class="distribution-item">
                    <div class="distribution-label">${grade}</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill ${grade.toLowerCase()}" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">${count} (${percentage}%)</div>
                </div>
            `;
        });
        
        distribution.innerHTML = html;
    }
    
    updateRecentUpdates(marks) {
        const recentUpdates = document.getElementById('recentUpdates');
        if (!recentUpdates) return;
        
        // Get last 3 marks
        const recent = marks
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
        
        let html = '';
        
        recent.forEach(mark => {
            const student = mark.students || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            html += `
                <div class="update-item">
                    <div class="update-icon">
                        <i class="fas fa-user-edit"></i>
                    </div>
                    <div class="update-details">
                        <div>${student.full_name || 'Student'}</div>
                        <div class="update-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        recentUpdates.innerHTML = html;
    }
    
    // ==================== FILTERING & SORTING ====================
    
    async populateFilterDropdowns(marks) {
        // Populate course filter
        const courseFilter = document.getElementById('courseFilter');
        if (courseFilter) {
            const courses = [...new Set(marks.map(m => m.courses?.course_name).filter(Boolean))];
            courseFilter.innerHTML = '<option value="">All Courses</option>';
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                courseFilter.appendChild(option);
            });
        }
        
        // Populate student filter
        const studentFilter = document.getElementById('studentFilter');
        if (studentFilter) {
            const students = [...new Set(marks.map(m => m.students?.full_name).filter(Boolean))];
            studentFilter.innerHTML = '<option value="">All Students</option>';
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student;
                option.textContent = student;
                studentFilter.appendChild(option);
            });
        }
    }
    
    filterTable() {
        const searchInput = document.getElementById('marksSearch');
        const gradeFilter = document.getElementById('gradeFilter');
        const courseFilter = document.getElementById('courseFilter');
        const dateFilter = document.getElementById('dateFilter');
        const studentFilter = document.getElementById('studentFilter');
        
        this.filters = {
            search: searchInput?.value || '',
            grade: gradeFilter?.value || '',
            course: courseFilter?.value || '',
            date: dateFilter?.value || '',
            student: studentFilter?.value || ''
        };
        
        this.applyFilters();
        this.currentPage = 1;
        this.renderCurrentView();
        this.updatePagination();
        this.updateSummaryStats(this.filteredData);
    }
    
    applyFilters() {
        let filtered = [...this.filteredData];
        
        // Apply search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(mark => {
                const studentName = mark.students?.full_name?.toLowerCase() || '';
                const studentId = mark.students?.reg_number?.toLowerCase() || '';
                const courseName = mark.courses?.course_name?.toLowerCase() || '';
                const courseCode = mark.courses?.course_code?.toLowerCase() || '';
                const assessment = mark.assessment_type?.toLowerCase() || '';
                const grade = mark.grade?.toLowerCase() || '';
                
                return studentName.includes(searchTerm) ||
                       studentId.includes(searchTerm) ||
                       courseName.includes(searchTerm) ||
                       courseCode.includes(searchTerm) ||
                       assessment.includes(searchTerm) ||
                       grade.includes(searchTerm);
            });
        }
        
        // Apply grade filter
        if (this.filters.grade) {
            filtered = filtered.filter(mark => mark.grade === this.filters.grade);
        }
        
        // Apply course filter
        if (this.filters.course) {
            filtered = filtered.filter(mark => 
                mark.courses?.course_name === this.filters.course
            );
        }
        
        // Apply student filter
        if (this.filters.student) {
            filtered = filtered.filter(mark => 
                mark.students?.full_name === this.filters.student
            );
        }
        
        // Apply date filter
        if (this.filters.date) {
            const now = new Date();
            filtered = filtered.filter(mark => {
                const date = new Date(mark.created_at);
                switch (this.filters.date) {
                    case 'today':
                        return date.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return date >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return date >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        this.filteredData = filtered;
    }
    
    clearFilters() {
        document.getElementById('marksSearch').value = '';
        document.getElementById('gradeFilter').value = '';
        document.getElementById('courseFilter').value = '';
        document.getElementById('studentFilter').value = '';
        document.getElementById('dateFilter').value = '';
        
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        this.filterTable();
    }
    
    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.filteredData.sort((a, b) => {
            let aValue, bValue;
            
            switch (column) {
                case 'student':
                    aValue = a.students?.full_name || '';
                    bValue = b.students?.full_name || '';
                    break;
                case 'course':
                    aValue = a.courses?.course_name || '';
                    bValue = b.courses?.course_name || '';
                    break;
                case 'score':
                    aValue = a.score || 0;
                    bValue = b.score || 0;
                    break;
                case 'grade':
                    aValue = this.getGradePoints(a.grade);
                    bValue = this.getGradePoints(b.grade);
                    break;
                case 'date':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                default:
                    return 0;
            }
            
            if (this.sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        this.renderCurrentView();
        this.updateSortIndicators();
    }
    
    updateSortIndicators() {
        // Remove all sort indicators
        document.querySelectorAll('.sort-indicator').forEach(el => el.remove());
        
        if (this.sortColumn) {
            const header = document.querySelector(`th[data-sort="${this.sortColumn}"]`);
            if (header) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.innerHTML = this.sortDirection === 'asc' ? 
                    '<i class="fas fa-arrow-up"></i>' : 
                    '<i class="fas fa-arrow-down"></i>';
                header.appendChild(indicator);
            }
        }
    }
    
    // ==================== PAGINATION ====================
    
    updatePagination() {
        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        
        // Update pagination info
        const startRow = Math.min((this.currentPage - 1) * this.pageSize + 1, totalRows);
        const endRow = Math.min(this.currentPage * this.pageSize, totalRows);
        
        this.updateElementText('startRow', startRow);
        this.updateElementText('endRow', endRow);
        this.updateElementText('totalRows', totalRows);
        
        // Update page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || 
                    (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    html += `
                        <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                                onclick="app.marks.goToPage(${i})">
                            ${i}
                        </button>
                    `;
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    html += '<span class="page-ellipsis">...</span>';
                }
            }
            pageNumbers.innerHTML = html;
        }
        
        // Update button states
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderCurrentView();
        this.updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    changePageSize() {
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            this.pageSize = parseInt(pageSizeSelect.value);
            this.currentPage = 1;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    // ==================== SELECTION MANAGEMENT ====================
    
    toggleSelection(markId) {
        if (this.selectedMarks.has(markId)) {
            this.selectedMarks.delete(markId);
        } else {
            this.selectedMarks.add(markId);
        }
        
        // Update row/card selection styling
        const element = document.querySelector(`[data-mark-id="${markId}"]`);
        if (element) {
            element.classList.toggle('selected');
        }
        
        this.updateSelectedActions();
    }
    
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        if (!selectAll) return;
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (selectAll.checked) {
            pageData.forEach(mark => this.selectedMarks.add(mark.id));
        } else {
            pageData.forEach(mark => this.selectedMarks.delete(mark.id));
        }
        
        this.renderCurrentView();
        this.updateSelectedActions();
    }
    
    updateSelectedActions() {
        const selectedCount = this.selectedMarks.size;
        const selectedActions = document.getElementById('selectedActions');
        const selectedCountElement = document.getElementById('selectedCount');
        
        if (selectedActions && selectedCountElement) {
            if (selectedCount > 0) {
                selectedActions.style.display = 'flex';
                selectedCountElement.textContent = selectedCount;
            } else {
                selectedActions.style.display = 'none';
            }
        }
    }
    
    async deleteSelected() {
        if (this.selectedMarks.size === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${this.selectedMarks.size} selected records? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const promises = Array.from(this.selectedMarks).map(id => 
                this.db.deleteMark(id)
            );
            
            await Promise.all(promises);
            
            this.showToast(`✅ ${this.selectedMarks.size} records deleted successfully!`, 'success');
            this.selectedMarks.clear();
            
            // Reload table and update dashboard
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error deleting selected records:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    async exportSelected() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to export', 'warning');
            return;
        }
        
        try {
            const selectedMarks = this.filteredData.filter(mark => 
                this.selectedMarks.has(mark.id)
            );
            
            await this.exportMarks(selectedMarks, 'selected_records');
            this.showToast(`✅ ${selectedMarks.length} records exported successfully!`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting selected records:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== VIEW MANAGEMENT ====================
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.currentPage = 1;
        
        // Update view toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.view-btn[onclick*="app.marks.setViewMode('${mode}')"]`);
        if (!activeBtn) {
            // Fallback to manual button click
            const manualBtns = document.querySelectorAll('.view-btn');
            manualBtns.forEach((btn, index) => {
                if (index === 0 && mode === 'table') btn.classList.add('active');
                else if (index === 1 && mode === 'cards') btn.classList.add('active');
                else if (index === 2 && mode === 'compact') btn.classList.add('active');
            });
        } else {
            activeBtn.classList.add('active');
        }
        
        // Show/hide containers
        const views = ['tableView', 'cardsView', 'compactView'];
        views.forEach(view => {
            const container = document.getElementById(view);
            if (container) {
                container.style.display = 'none';
            }
        });
        
        const activeContainer = document.getElementById(`${mode}View`);
        if (activeContainer) {
            activeContainer.style.display = 'block';
        }
        
        this.renderCurrentView();
    }
    
    // ==================== EXPORT FUNCTIONALITY ====================
    
    async exportMarks(marks = null, filename = 'academic_records') {
        try {
            const data = marks || this.filteredData;
            
            if (data.length === 0) {
                this.showToast('No data to export', 'warning');
                return;
            }
            
            // Convert to CSV
            const csv = this.convertToCSV(data);
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('❌ Error exporting marks:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    convertToCSV(data) {
        const headers = ['Student ID', 'Student Name', 'Course Code', 'Course Name', 
                        'Assessment Type', 'Assessment Name', 'Score', 'Max Score', 
                        'Percentage', 'Grade', 'Grade Points', 'Date', 'Remarks'];
        
        const rows = data.map(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            
            return [
                student.reg_number || '',
                student.full_name || '',
                course.course_code || '',
                course.course_name || '',
                mark.assessment_type || '',
                mark.assessment_name || '',
                mark.score || 0,
                mark.max_score || 100,
                mark.percentage || 0,
                mark.grade || '',
                this.getGradePoints(mark.grade) || 0,
                mark.created_at ? new Date(mark.created_at).toLocaleDateString('en-GB') : '',
                mark.remarks || ''
            ].map(cell => `"${cell}"`).join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    // ==================== VIEW DETAILS ====================
    
    async viewDetails(markId) {
        try {
            const mark = await this.db.getMarkById(markId);
            if (!mark) {
                this.showToast('Record not found', 'error');
                return;
            }
            
            this.openDetailsModal(mark);
            
        } catch (error) {
            console.error('❌ Error viewing record details:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    openDetailsModal(mark) {
        // Create and show details modal
        const modalId = 'markDetailsModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-info-circle"></i> Record Details</h3>
                        <span class="close" onclick="app.marks.closeModal('${modalId}')">&times;</span>
                    </div>
                    <div class="modal-body" id="markDetailsContent">
                        <!-- Content will be populated dynamically -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.marks.closeModal('${modalId}')">
                            Close
                        </button>
                        <button class="btn-primary" onclick="app.marks.editMark('${mark.id}')">
                            <i class="fas fa-edit"></i> Edit Record
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Populate details
        const student = mark.students || {};
        const course = mark.courses || {};
        const percentage = mark.percentage || 0;
        const grade = mark.grade || this.calculateGrade(percentage);
        const gradeCSSClass = this.getGradeCSSClass(grade);
        
        document.getElementById('markDetailsContent').innerHTML = `
            <div class="details-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-user-graduate"></i> Student Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${student.full_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Registration Number:</span>
                        <span class="detail-value">${student.reg_number || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-book"></i> Course Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Course Code:</span>
                        <span class="detail-value">${course.course_code || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Course Name:</span>
                        <span class="detail-value">${course.course_name || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Assessment Details</h4>
                    <div class="detail-item">
                        <span class="detail-label">Assessment Type:</span>
                        <span class="detail-value">${mark.assessment_type || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Assessment Name:</span>
                        <span class="detail-value">${mark.assessment_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Score:</span>
                        <span class="detail-value">${mark.score || 0}/${mark.max_score || 100}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-star"></i> Grade Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Percentage:</span>
                        <span class="detail-value">${percentage.toFixed(2)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Grade:</span>
                        <span class="detail-value grade-badge ${gradeCSSClass}">${grade}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Grade Points:</span>
                        <span class="detail-value">${this.getGradePoints(grade).toFixed(1)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Grade Description:</span>
                        <span class="detail-value">${this.getGradeDescription(grade)}</span>
                    </div>
                </div>
                
                ${mark.remarks ? `
                <div class="detail-section">
                    <h4><i class="fas fa-comment"></i> Remarks</h4>
                    <div class="remarks">
                        ${mark.remarks}
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h4><i class="fas fa-calendar"></i> Metadata</h4>
                    <div class="detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${mark.created_at ? new Date(mark.created_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Updated:</span>
                        <span class="detail-value">${mark.updated_at ? new Date(mark.updated_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Visibility:</span>
                        <span class="detail-value status-indicator ${mark.visible_to_student ? 'published' : 'hidden'}">
                            <i class="fas fa-${mark.visible_to_student ? 'eye' : 'eye-slash'}"></i>
                            ${mark.visible_to_student ? 'Visible to Student' : 'Hidden from Student'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        this.openModal(modalId);
    }
    
    // ==================== BULK EDIT ====================
    
    bulkEdit() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to edit', 'warning');
            return;
        }
        
        // Open bulk edit modal
        this.openBulkEditModal();
    }
    
    openBulkEditModal() {
        // Implementation for bulk edit modal
        // This would allow editing multiple selected records at once
        console.log('Bulk edit for', this.selectedMarks.size, 'records');
        this.showToast('Bulk edit feature coming soon!', 'info');
    }
    
    // ==================== ENTER MARKS MODAL ====================
    
    async openMarksModal() {
        try {
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            this.setupMarksModalListeners();
            this.openModal('marksModal');
            this.updateMarksGradeDisplay();
            
        } catch (error) {
            console.error('Error opening marks modal:', error);
            this.showToast('Error opening form', 'error');
        }
    }
    
    setupMarksModalListeners() {
        const scoreInput = document.getElementById('marksScore');
        const maxScoreInput = document.getElementById('maxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => {
                const maxScore = parseFloat(maxScoreInput?.value) || 100;
                this.validateScoreInput(scoreInput, maxScore);
                this.updateMarksGradeDisplay();
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                const maxScore = this.validateMaxScoreInput(maxScoreInput);
                const scoreInput = document.getElementById('marksScore');
                if (scoreInput) {
                    this.validateScoreInput(scoreInput, maxScore);
                }
                this.updateMarksGradeDisplay();
            });
        }
    }
    
    updateMarksGradeDisplay() {
        try {
            const scoreInput = document.getElementById('marksScore');
            const maxScoreInput = document.getElementById('maxScore');
            const gradeDisplay = document.getElementById('gradeDisplay');
            const percentageDisplay = document.getElementById('percentageDisplay');
            const gradeDescriptionDisplay = document.getElementById('marksGradeDescription');
            
            if (!scoreInput || !gradeDisplay || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
                return;
            }
            
            // Ensure score doesn't exceed max score
            const validScore = Math.min(score, maxScore);
            if (score !== validScore) {
                scoreInput.value = validScore;
            }
            
            // Calculate percentage (capped at 100%)
            const percentage = (validScore / maxScore) * 100;
            const cappedPercentage = Math.min(percentage, 100);
            
            const grade = this.calculateGrade(cappedPercentage);
            const gradeDescription = this.getGradeDescription(grade);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge-professional ${gradeCSSClass}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${cappedPercentage.toFixed(2)}%`;
            }
            
            if (gradeDescriptionDisplay) {
                gradeDescriptionDisplay.textContent = gradeDescription;
            }
            
        } catch (error) {
            console.error('Error updating grade display:', error);
        }
    }
    
    resetMarksGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay) {
        if (gradeDisplay) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'grade-badge-professional';
            gradeDisplay.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.textContent = '0.00%';
        }
        
        if (gradeDescriptionDisplay) {
            gradeDescriptionDisplay.textContent = '--';
        }
    }
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
            // Get form values
            const studentId = document.getElementById('marksStudent').value;
            const courseId = document.getElementById('marksCourse').value;
            const score = parseFloat(document.getElementById('marksScore').value);
            const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
            const assessmentType = document.getElementById('assessmentType')?.value || 'final';
            const assessmentName = document.getElementById('assessmentName')?.value || '';
            const remarks = document.getElementById('marksRemarks')?.value || '';
            const visibleToStudent = document.getElementById('visibleToStudent')?.checked || true;
            
            // Validation
            if (!studentId || !courseId || isNaN(score)) {
                this.showToast('Please select student, course, and enter score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and maximum score must be greater than 0', 'error');
                return;
            }
            
            if (score > maxScore) {
                this.showToast(`Score cannot exceed maximum score of ${maxScore}`, 'error');
                return;
            }
            
            // Calculate grade
            const percentage = (score / maxScore) * 100;
            const grade = this.calculateGrade(percentage);
            const gradePoints = this.getGradePoints(grade);
            
            // Prepare data
            const markData = {
                student_id: studentId,
                course_id: courseId,
                assessment_type: assessmentType,
                assessment_name: assessmentName || 'Assessment',
                score: score,
                max_score: maxScore,
                percentage: percentage,
                grade: grade,
                grade_points: gradePoints,
                remarks: remarks,
                visible_to_student: visibleToStudent
            };
            
            console.log('💾 Saving academic record:', markData);
            
            // Save to database
            await this.db.addMark(markData);
            
            // Success
            this.showToast('✅ Academic record saved successfully!', 'success');
            this.closeModal('marksModal');
            
            // Reload table and update dashboard
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== EDIT MARKS MODAL ====================
    
    async editMark(markId) {
        try {
            console.log('🔧 Editing record ID:', markId);
            
            const mark = await this.db.getMarkById(markId);
            
            if (!mark) {
                this.showToast('Academic record not found', 'error');
                return;
            }
            
            this.populateEditForm(mark);
            this.setupEditFormListeners();
            this.openModal('editMarksModal');
            
        } catch (error) {
            console.error('❌ Error loading record for edit:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    populateEditForm(mark) {
        const student = mark.students || {};
        const course = mark.courses || {};
        
        // Set form values
        document.getElementById('editMarkId').value = mark.id || '';
        document.getElementById('editStudent').value = mark.student_id || '';
        document.getElementById('editCourse').value = mark.course_id || '';
        document.getElementById('editScore').value = mark.score || 0;
        
        // Optional fields
        if (document.getElementById('editAssessmentType')) {
            document.getElementById('editAssessmentType').value = mark.assessment_type || '';
        }
        
        if (document.getElementById('editAssessmentName')) {
            document.getElementById('editAssessmentName').value = mark.assessment_name || '';
        }
        
        if (document.getElementById('editMaxScore')) {
            document.getElementById('editMaxScore').value = mark.max_score || 100;
        }
        
        if (document.getElementById('editRemarks')) {
            document.getElementById('editRemarks').value = mark.remarks || '';
        }
        
        if (document.getElementById('editVisibleToStudent')) {
            document.getElementById('editVisibleToStudent').checked = mark.visible_to_student !== false;
        }
        
        // Display fields
        const studentDisplay = document.getElementById('editStudentDisplay');
        const courseDisplay = document.getElementById('editCourseDisplay');
        
        if (studentDisplay) {
            studentDisplay.textContent = student.full_name ? 
                `${student.reg_number} - ${student.full_name}` : 
                `Student ID: ${mark.student_id}`;
        }
        
        if (courseDisplay) {
            courseDisplay.textContent = course.course_code ? 
                `${course.course_code} - ${course.course_name}` : 
                `Course ID: ${mark.course_id}`;
        }
        
        // Update grade display
        this.updateEditGradeDisplay();
    }
    
    setupEditFormListeners() {
        const scoreInput = document.getElementById('editScore');
        const maxScoreInput = document.getElementById('editMaxScore');
        
        if (scoreInput) {
            scoreInput.addEventListener('input', () => {
                const maxScore = parseFloat(maxScoreInput?.value) || 100;
                this.validateScoreInput(scoreInput, maxScore);
                this.updateEditGradeDisplay();
            });
        }
        
        if (maxScoreInput) {
            maxScoreInput.addEventListener('input', () => {
                this.validateMaxScoreInput(maxScoreInput);
                this.updateEditGradeDisplay();
            });
        }
    }
    
    updateEditGradeDisplay() {
        try {
            const scoreInput = document.getElementById('editScore');
            const maxScoreInput = document.getElementById('editMaxScore');
            const gradeDisplay = document.getElementById('editGradeDisplay');
            const percentageDisplay = document.getElementById('editPercentage');
            const gradeDescriptionDisplay = document.getElementById('editGradeDescription');
            
            if (!scoreInput || !gradeDisplay || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetEditGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay);
                return;
            }
            
            // Ensure score doesn't exceed max score
            const validScore = Math.min(score, maxScore);
            if (score !== validScore) {
                scoreInput.value = validScore;
            }
            
            // Calculate percentage (capped at 100%)
            const percentage = (validScore / maxScore) * 100;
            const cappedPercentage = Math.min(percentage, 100);
            
            const grade = this.calculateGrade(cappedPercentage);
            const gradeDescription = this.getGradeDescription(grade);
            const gradeCSSClass = this.getGradeCSSClass(grade);
            
            // Update display
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `grade-badge ${gradeCSSClass}`;
            gradeDisplay.title = gradeDescription;
            
            if (percentageDisplay) {
                percentageDisplay.textContent = `${cappedPercentage.toFixed(2)}%`;
            }
            
            if (gradeDescriptionDisplay) {
                gradeDescriptionDisplay.textContent = gradeDescription;
            }
            
        } catch (error) {
            console.error('Error updating edit grade display:', error);
        }
    }
    
    resetEditGradeDisplay(gradeDisplay, percentageDisplay, gradeDescriptionDisplay) {
        if (gradeDisplay) {
            gradeDisplay.textContent = '--';
            gradeDisplay.className = 'grade-badge';
            gradeDisplay.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.textContent = '0.00%';
        }
        
        if (gradeDescriptionDisplay) {
            gradeDescriptionDisplay.textContent = '--';
        }
    }
    
    async updateMark(event) {
        event.preventDefault();
        
        try {
            const markId = document.getElementById('editMarkId').value;
            
            if (!markId) {
                this.showToast('Invalid record ID', 'error');
                return;
            }
            
            // Get form values
            const score = parseFloat(document.getElementById('editScore').value);
            const maxScore = parseFloat(document.getElementById('editMaxScore').value) || 100;
            const assessmentType = document.getElementById('editAssessmentType')?.value || 'final';
            const assessmentName = document.getElementById('editAssessmentName')?.value || '';
            const remarks = document.getElementById('editRemarks')?.value || '';
            const visibleToStudent = document.getElementById('editVisibleToStudent')?.checked || true;
            
            // Validation
            if (isNaN(score)) {
                this.showToast('Please enter a valid score', 'error');
                return;
            }
            
            if (score < 0 || maxScore <= 0) {
                this.showToast('Score must be positive and maximum score must be greater than 0', 'error');
                return;
            }
            
            if (score > maxScore) {
                this.showToast(`Score cannot exceed maximum score of ${maxScore}`, 'error');
                return;
            }
            
            // Calculate grade
            const percentage = (score / maxScore) * 100;
            const grade = this.calculateGrade(percentage);
            const gradePoints = this.getGradePoints(grade);
            
            // Prepare update data
            const updateData = {
                assessment_type: assessmentType,
                assessment_name: assessmentName,
                score: score,
                max_score: maxScore,
                percentage: percentage,
                grade: grade,
                grade_points: gradePoints,
                remarks: remarks,
                visible_to_student: visibleToStudent,
                updated_at: new Date().toISOString()
            };
            
            console.log('🔄 Updating academic record:', markId, updateData);
            
            // Update in database
            await this.db.updateMark(markId, updateData);
            
            // Success
            this.showToast('✅ Academic record updated successfully!', 'success');
            this.closeModal('editMarksModal');
            
            // Reload table and update dashboard
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error updating academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== DELETE MARKS ====================
    
    async deleteMark(markId) {
        try {
            if (!confirm('Are you sure you want to delete this academic record? This action cannot be undone.')) {
                return;
            }
            
            console.log('🗑️ Deleting record:', markId);
            
            await this.db.deleteMark(markId);
            
            this.showToast('✅ Academic record deleted successfully!', 'success');
            
            // Remove from table with animation
            const row = document.querySelector(`tr[data-mark-id="${markId}"]`);
            if (row) {
                row.style.opacity = '0.5';
                row.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    row.remove();
                    this.updateSelectedCounts();
                }, 300);
            }
            
            // Update dashboard statistics
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error deleting academic record:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    async populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        try {
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select Student</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating student dropdown:', error);
        }
    }
    
    async populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        try {
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => !c.status || c.status === 'active');
            
            select.innerHTML = '<option value="">Select Course</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
        }
    }
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} records`;
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        } else {
            console.warn(`Modal #${modalId} not found`);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            
            // Reset forms
            if (modalId === 'marksModal') {
                const form = document.getElementById('marksForm');
                if (form) {
                    form.reset();
                    const maxScoreInput = document.getElementById('maxScore');
                    if (maxScoreInput) maxScoreInput.value = '100';
                    this.resetMarksGradeDisplay(
                        document.getElementById('gradeDisplay'),
                        document.getElementById('percentageDisplay'),
                        document.getElementById('marksGradeDescription')
                    );
                }
            }
            
            if (modalId === 'editMarksModal') {
                const form = document.getElementById('editMarksForm');
                if (form) {
                    form.reset();
                }
            }
        }
    }
    
    // ==================== PROFESSIONAL NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icons = {
                'success': 'fa-check-circle',
                'error': 'fa-exclamation-circle',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MarksManager = MarksManager;
}
