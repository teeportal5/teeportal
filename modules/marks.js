// modules/marks.js - FIXED Marks Manager
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        
        // State management
        this.state = {
            currentPage: 1,
            pageSize: 25,
            filteredData: [],
            selectedMarks: new Set(),
            viewMode: 'table',
            sortColumn: null,
            sortDirection: 'asc',
            filters: {
                search: '',
                grade: '',
                course: '',
                date: '',
                student: ''
            },
            isLoading: false
        };
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    // ==================== INITIALIZATION ====================
    
    initEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('marksSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filterTable();
            }, 300));
        }
        
        // Filter selects
        ['gradeFilter', 'courseFilter', 'dateFilter', 'studentFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterTable());
            }
        });
        
        // View mode buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'table';
                this.setViewMode(mode);
            });
        });
        
        // Pagination buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
        
        // Page size
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => this.changePageSize());
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', () => this.toggleSelectAll());
        }
    }
    
    // ==================== CORE DATA LOADING ====================
    
    async loadMarksTable() {
        if (this.state.isLoading) return;
        
        try {
            this.state.isLoading = true;
            this.showLoadingState(true);
            
            console.log('📊 Loading marks table...');
            
            // Check if db.getMarksTableData exists
            if (typeof this.db.getMarksTableData !== 'function') {
                throw new Error('Database method getMarksTableData not available');
            }
            
            const marks = await this.db.getMarksTableData();
            this.state.filteredData = marks || [];
            
            // Update all components
            this.updateSummaryStats(marks);
            this.updateDashboardStatistics(marks);
            this.applyFilters();
            this.renderCurrentView();
            this.updatePagination();
            await this.populateFilterDropdowns(marks);
            
            console.log('✅ Marks table loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading marks table:', error);
            this.showErrorState(error);
        } finally {
            this.state.isLoading = false;
            this.showLoadingState(false);
        }
    }
    
    showLoadingState(show) {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            if (show) {
                let overlay = tableContainer.querySelector('.loading-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'loading-overlay';
                    overlay.innerHTML = `
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading records...</div>
                    `;
                    tableContainer.appendChild(overlay);
                }
                overlay.style.display = 'flex';
            } else {
                const overlay = tableContainer.querySelector('.loading-overlay');
                if (overlay) {
                    overlay.style.display = 'none';
                }
            }
        }
    }
    
    // ==================== PROFESSIONAL GRADING SYSTEM ====================
    
    calculateGrade(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
            return 'FAIL';
        }
        
        const cappedPercentage = Math.min(percentage, 100);
        
        // Professional grading scale
        if (cappedPercentage >= 85) return 'DISTINCTION';
        if (cappedPercentage >= 70) return 'CREDIT';
        if (cappedPercentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        return gradePoints[grade?.toUpperCase()] || 0.0;
    }
    
    getGradeDescription(grade) {
        const descriptions = {
            'DISTINCTION': 'Excellent performance',
            'CREDIT': 'Good performance',
            'PASS': 'Satisfactory performance',
            'FAIL': 'Needs improvement'
        };
        return descriptions[grade?.toUpperCase()] || 'No description available';
    }
    
    getGradeCSSClass(grade) {
        const classes = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        return classes[grade?.toUpperCase()] || 'grade-default';
    }
    
    // ==================== TABLE RENDERING ====================
    
    renderCurrentView() {
        switch (this.state.viewMode) {
            case 'table': this.renderTableView(); break;
            case 'cards': this.renderCardsView(); break;
            case 'compact': this.renderCompactView(); break;
        }
        this.updateSelectedCounts();
    }
    
    renderTableView() {
        const tbody = document.querySelector('#marksTableBody');
        if (!tbody) {
            console.error('Table body not found');
            return;
        }
        
        const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
        const endIndex = startIndex + this.state.pageSize;
        const pageData = this.state.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        tbody.innerHTML = pageData.map(mark => this.createTableRow(mark)).join('');
    }
    
    createTableRow(mark) {
        const isSelected = this.state.selectedMarks.has(mark.id);
        const student = mark.students || {};
        const course = mark.courses || {};
        
        // Calculate values safely
        const score = mark.score || 0;
        const maxScore = mark.max_score || 100;
        let percentage = mark.percentage;
        if (percentage === undefined && maxScore > 0) {
            percentage = (score / maxScore) * 100;
        }
        
        let grade = mark.grade;
        if (!grade && percentage !== undefined) {
            grade = this.calculateGrade(percentage);
        }
        
        const gradeCSSClass = this.getGradeCSSClass(grade);
        const status = mark.visible_to_student ? 'published' : 'hidden';
        
        // Escape HTML to prevent XSS
        const escapeHTML = (str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };
        
        return `
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
                            <div class="student-name">${escapeHTML(student.full_name || 'N/A')}</div>
                            <div class="student-id">${escapeHTML(student.reg_number || 'N/A')}</div>
                        </div>
                    </div>
                </td>
                <td class="course-col">
                    <div class="course-code">${escapeHTML(course.course_code || 'N/A')}</div>
                    <div class="course-name">${escapeHTML(course.course_name || '')}</div>
                </td>
                <td class="assessment-col">
                    <div class="assessment-type">${escapeHTML(mark.assessment_type || 'N/A')}</div>
                    <div class="assessment-name">${escapeHTML(mark.assessment_name || '')}</div>
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
    }
    
    // ==================== UTILITIES ====================
    
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
        } catch {
            return 'N/A';
        }
    }
    
    getEmptyStateHTML(isCard = false) {
        const content = `
            <i class="fas fa-chart-bar fa-3x"></i>
            <h3>No Academic Records Found</h3>
            <p>${this.state.filteredData.length === 0 ? 'Get started by adding your first academic record' : 'No records match your filters'}</p>
            ${this.state.filteredData.length === 0 ? `
                <button class="btn-primary" onclick="app.marks.openMarksModal()">
                    <i class="fas fa-plus"></i> Add First Record
                </button>
            ` : `
                <button class="btn-secondary" onclick="app.marks.clearFilters()">
                    <i class="fas fa-filter"></i> Clear Filters
                </button>
            `}
        `;
        
        if (isCard) {
            return `<div class="empty-state-cards">${content}</div>`;
        }
        
        return `
            <tr class="empty-state-row">
                <td colspan="9">
                    <div class="empty-state">${content}</div>
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
                        <h3>Error loading academic records</h3>
                        <p>${error.message || 'Unknown error'}</p>
                        <div class="error-actions">
                            <button class="btn-secondary" onclick="app.marks.loadMarksTable()">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    // ==================== SUMMARY STATISTICS ====================
    
    updateSummaryStats(marks) {
        if (!marks || !Array.isArray(marks)) {
            this.resetSummaryStats();
            return;
        }
        
        const totalRecords = marks.length;
        const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
        
        let avgScore = 0;
        if (marks.length > 0) {
            const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
            avgScore = totalPercentage / marks.length;
        }
        
        const distinctionCount = marks.filter(m => m.grade === 'DISTINCTION').length;
        
        // Update elements - FIXED: No string replacement needed
        this.updateElementText('totalRecords', totalRecords);
        this.updateElementText('distinctStudents', distinctStudents);
        this.updateElementText('avgScore', `${avgScore.toFixed(1)}%`);
        this.updateElementText('distinctionCount', distinctionCount);
        
        this.updateGradeDistribution(marks);
        this.updateRecentUpdates(marks);
    }
    
    resetSummaryStats() {
        this.updateElementText('totalRecords', 0);
        this.updateElementText('distinctStudents', 0);
        this.updateElementText('avgScore', '0%');
        this.updateElementText('distinctionCount', 0);
    }
    
    updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Handle numbers and strings differently
            if (typeof value === 'number') {
                element.textContent = value.toLocaleString();
            } else {
                element.textContent = value;
            }
        }
    }
    
    updateGradeDistribution(marks) {
        const distribution = document.getElementById('gradeDistribution');
        if (!distribution) return;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            distribution.innerHTML = '<div class="distribution-item">No data available</div>';
            return;
        }
        
        const grades = ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'];
        const counts = { DISTINCTION: 0, CREDIT: 0, PASS: 0, FAIL: 0 };
        
        marks.forEach(mark => {
            const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
            if (counts[grade] !== undefined) counts[grade]++;
        });
        
        const total = marks.length;
        distribution.innerHTML = grades.map(grade => {
            const count = counts[grade];
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            
            return `
                <div class="distribution-item">
                    <div class="distribution-label">${grade}</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill ${grade.toLowerCase()}" 
                             style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">${count} (${percentage}%)</div>
                </div>
            `;
        }).join('');
    }
    
    updateRecentUpdates(marks) {
        const recentUpdates = document.getElementById('recentUpdates');
        if (!recentUpdates) return;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            recentUpdates.innerHTML = `
                <div class="update-item">
                    <div class="update-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="update-details">
                        <div>No recent updates</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Get last 3 marks
        const recent = marks
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 3);
        
        recentUpdates.innerHTML = recent.map(mark => {
            const student = mark.students || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            return `
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
        }).join('');
    }
    
    getTimeAgo(dateString) {
        if (!dateString) return 'Unknown time';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            
            if (diffMs < 0) return 'Just now';
            
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            return this.formatDate(dateString);
        } catch {
            return 'Unknown time';
        }
    }
    
    // ==================== DASHBOARD STATISTICS ====================
    
    updateDashboardStatistics(marks) {
        try {
            if (!marks || !Array.isArray(marks) || marks.length === 0) {
                this.resetDashboardStats();
                return;
            }
            
            console.log('📈 Updating dashboard statistics...');
            
            const totalMarks = marks.length;
            const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
            
            let avgScore = 0;
            if (marks.length > 0) {
                const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
                avgScore = totalPercentage / marks.length;
            }
            
            // Grade distribution
            const gradeDistribution = { DISTINCTION: 0, CREDIT: 0, PASS: 0, FAIL: 0 };
            marks.forEach(mark => {
                const grade = mark.grade || this.calculateGrade(mark.percentage || 0);
                if (gradeDistribution[grade] !== undefined) {
                    gradeDistribution[grade]++;
                }
            });
            
            // Update dashboard elements
            this.updateElement('totalMarks', totalMarks);
            this.updateElement('totalStudents', distinctStudents);
            this.updateElement('avgGrade', `${avgScore.toFixed(1)}%`);
            
            // Update grade distribution
            ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL'].forEach(grade => {
                this.updateElement(`${grade.toLowerCase()}Count`, gradeDistribution[grade] || 0);
            });
            
            this.updateRecentActivity(marks);
            
            console.log('✅ Dashboard statistics updated');
            
        } catch (error) {
            console.error('❌ Error updating dashboard statistics:', error);
        }
    }
    
    resetDashboardStats() {
        this.updateElement('totalMarks', 0);
        this.updateElement('totalStudents', 0);
        this.updateElement('avgGrade', '0%');
        
        const recentActivity = document.getElementById('recentActivity');
        if (recentActivity) {
            recentActivity.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-details">
                        <p>No recent activity</p>
                        <div class="activity-time">Add your first record to get started</div>
                    </div>
                </div>
            `;
        }
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateRecentActivity(marks) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            recentActivity.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-details">
                        <p>No recent activity</p>
                        <div class="activity-time">Add records to see activity</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Get last 5 marks
        const recentMarks = marks
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 5);
        
        recentActivity.innerHTML = recentMarks.map(mark => {
            const student = mark.students || {};
            const course = mark.courses || {};
            const timeAgo = this.getTimeAgo(mark.created_at);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="activity-details">
                        <p><strong>${student.full_name || 'Student'}</strong> 
                           scored ${mark.score}/${mark.max_score} in ${course.course_code || 'Course'}</p>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // ==================== FILTERING & SORTING ====================
    
    async populateFilterDropdowns(marks) {
        try {
            // Populate course filter
            const courseFilter = document.getElementById('courseFilter');
            if (courseFilter) {
                const courses = [...new Set(marks.map(m => m.courses?.course_name).filter(Boolean))];
                courseFilter.innerHTML = '<option value="">All Courses</option>' +
                    courses.map(course => `<option value="${course}">${course}</option>`).join('');
                
                // Restore selected value if any
                if (this.state.filters.course) {
                    courseFilter.value = this.state.filters.course;
                }
            }
            
            // Populate student filter
            const studentFilter = document.getElementById('studentFilter');
            if (studentFilter) {
                const students = [...new Set(marks.map(m => m.students?.full_name).filter(Boolean))];
                studentFilter.innerHTML = '<option value="">All Students</option>' +
                    students.map(student => `<option value="${student}">${student}</option>`).join('');
                
                // Restore selected value if any
                if (this.state.filters.student) {
                    studentFilter.value = this.state.filters.student;
                }
            }
            
            // Restore grade filter
            const gradeFilter = document.getElementById('gradeFilter');
            if (gradeFilter && this.state.filters.grade) {
                gradeFilter.value = this.state.filters.grade;
            }
            
        } catch (error) {
            console.error('Error populating filter dropdowns:', error);
        }
    }
    
    filterTable() {
        const searchInput = document.getElementById('marksSearch');
        const gradeFilter = document.getElementById('gradeFilter');
        const courseFilter = document.getElementById('courseFilter');
        const dateFilter = document.getElementById('dateFilter');
        const studentFilter = document.getElementById('studentFilter');
        
        this.state.filters = {
            search: searchInput?.value || '',
            grade: gradeFilter?.value || '',
            course: courseFilter?.value || '',
            date: dateFilter?.value || '',
            student: studentFilter?.value || ''
        };
        
        this.applyFilters();
        this.state.currentPage = 1;
        this.renderCurrentView();
        this.updatePagination();
        this.updateSummaryStats(this.state.filteredData);
    }
    
    applyFilters() {
        if (!this.state.filteredData || !Array.isArray(this.state.filteredData)) {
            return;
        }
        
        let filtered = [...this.state.filteredData];
        
        // Apply search filter
        if (this.state.filters.search) {
            const searchTerm = this.state.filters.search.toLowerCase().trim();
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
        if (this.state.filters.grade) {
            filtered = filtered.filter(mark => mark.grade === this.state.filters.grade);
        }
        
        // Apply course filter
        if (this.state.filters.course) {
            filtered = filtered.filter(mark => 
                mark.courses?.course_name === this.state.filters.course
            );
        }
        
        // Apply student filter
        if (this.state.filters.student) {
            filtered = filtered.filter(mark => 
                mark.students?.full_name === this.state.filters.student
            );
        }
        
        // Apply date filter
        if (this.state.filters.date) {
            const now = new Date();
            filtered = filtered.filter(mark => {
                if (!mark.created_at) return false;
                
                try {
                    const date = new Date(mark.created_at);
                    switch (this.state.filters.date) {
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
                } catch (error) {
                    return false;
                }
            });
        }
        
        this.state.filteredData = filtered;
    }
    
    clearFilters() {
        document.getElementById('marksSearch').value = '';
        document.getElementById('gradeFilter').value = '';
        document.getElementById('courseFilter').value = '';
        document.getElementById('studentFilter').value = '';
        document.getElementById('dateFilter').value = '';
        
        this.state.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        this.filterTable();
    }
    
    // ==================== PAGINATION (FIXED) ====================
    
    updatePagination() {
        const totalRows = this.state.filteredData.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / this.state.pageSize));
        
        const startRow = Math.min((this.state.currentPage - 1) * this.state.pageSize + 1, totalRows);
        const endRow = Math.min(this.state.currentPage * this.state.pageSize, totalRows);
        
        // FIXED: Use proper element update without string replacement errors
        this.safeUpdateElement('startRow', startRow);
        this.safeUpdateElement('endRow', endRow);
        this.safeUpdateElement('totalRows', totalRows);
        
        // Update page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        if (pageNumbers) {
            let html = '';
            
            // Always show first page
            if (totalPages > 0) {
                html += `
                    <button class="page-number ${1 === this.state.currentPage ? 'active' : ''}" 
                            onclick="app.marks.goToPage(1)">
                        1
                    </button>
                `;
            }
            
            // Show pages around current page
            const startPage = Math.max(2, this.state.currentPage - 1);
            const endPage = Math.min(totalPages - 1, this.state.currentPage + 1);
            
            if (startPage > 2) {
                html += '<span class="page-ellipsis">...</span>';
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="page-number ${i === this.state.currentPage ? 'active' : ''}" 
                            onclick="app.marks.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            if (endPage < totalPages - 1) {
                html += '<span class="page-ellipsis">...</span>';
            }
            
            // Always show last page if there's more than one page
            if (totalPages > 1) {
                html += `
                    <button class="page-number ${totalPages === this.state.currentPage ? 'active' : ''}" 
                            onclick="app.marks.goToPage(${totalPages})">
                        ${totalPages}
                    </button>
                `;
            }
            
            pageNumbers.innerHTML = html;
        }
        
        // Update button states
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.disabled = this.state.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.state.currentPage === totalPages;
    }
    
    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.state.currentPage = page;
        this.renderCurrentView();
        this.updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize);
        if (this.state.currentPage < totalPages) {
            this.goToPage(this.state.currentPage + 1);
        }
    }
    
    prevPage() {
        if (this.state.currentPage > 1) {
            this.goToPage(this.state.currentPage - 1);
        }
    }
    
    changePageSize() {
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            this.state.pageSize = parseInt(pageSizeSelect.value);
            this.state.currentPage = 1;
            this.renderCurrentView();
            this.updatePagination();
        }
    }
    
    // ==================== SELECTION MANAGEMENT ====================
    
    toggleSelection(markId) {
        if (this.state.selectedMarks.has(markId)) {
            this.state.selectedMarks.delete(markId);
        } else {
            this.state.selectedMarks.add(markId);
        }
        
        // Update row selection styling
        const element = document.querySelector(`[data-mark-id="${markId}"]`);
        if (element) {
            element.classList.toggle('selected');
        }
        
        this.updateSelectedActions();
    }
    
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        if (!selectAll) return;
        
        const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
        const endIndex = startIndex + this.state.pageSize;
        const pageData = this.state.filteredData.slice(startIndex, endIndex);
        
        if (selectAll.checked) {
            pageData.forEach(mark => this.state.selectedMarks.add(mark.id));
        } else {
            pageData.forEach(mark => this.state.selectedMarks.delete(mark.id));
        }
        
        this.renderCurrentView();
        this.updateSelectedActions();
    }
    
    updateSelectedActions() {
        const selectedCount = this.state.selectedMarks.size;
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
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} records`;
        }
    }
    
    // ==================== MARKS MODAL (FIXED) ====================
    
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
    
    async populateStudentDropdown() {
        const select = document.getElementById('marksStudent');
        if (!select) return;
        
        try {
            // Check if method exists
            if (typeof this.db.getStudents !== 'function') {
                throw new Error('getStudents method not available');
            }
            
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select Student...</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating student dropdown:', error);
            select.innerHTML = '<option value="">Error loading students</option>';
        }
    }
    
    async populateCourseDropdown() {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        try {
            // Check if method exists
            if (typeof this.db.getCourses !== 'function') {
                throw new Error('getCourses method not available');
            }
            
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => !c.status || c.status === 'active');
            
            select.innerHTML = '<option value="">Select Course...</option>';
            
            activeCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating course dropdown:', error);
            select.innerHTML = '<option value="">Error loading courses</option>';
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
        
        return value;
    }
    
    updateMarksGradeDisplay() {
        try {
            const scoreInput = document.getElementById('marksScore');
            const maxScoreInput = document.getElementById('maxScore');
            const gradeDisplay = document.getElementById('gradeDisplay');
            const percentageDisplay = document.getElementById('percentageDisplay');
            const gradeDescriptionDisplay = document.getElementById('gradeDescription');
            
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
            gradeDisplay.className = `grade-badge ${gradeCSSClass}`;
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
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
            // Get form values
            const studentId = document.getElementById('marksStudent').value;
            const courseId = document.getElementById('marksCourse').value;
            const score = parseFloat(document.getElementById('marksScore').value);
            const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;
            const assessmentType = document.getElementById('assessmentType')?.value || 'exam';
            const assessmentName = document.getElementById('assessmentName')?.value || '';
            const remarks = document.getElementById('marksRemarks')?.value || '';
            const visibleToStudent = document.getElementById('visibleToStudent')?.checked || true;
            
            // FIXED: Use the correct element from your HTML
            const assessmentDate = document.getElementById('assessmentDate')?.value || new Date().toISOString().split('T')[0];
            
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
            
            // Prepare data with all required fields
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
                visible_to_student: visibleToStudent,
                entered_by: this.app.user?.id || 'system'
            };
            
            console.log('💾 Saving academic record:', markData);
            
            // Save to database
            await this.db.addMark(markData);
            
            // Success
            this.showToast('✅ Academic record saved successfully!', 'success');
            this.closeModal('marksModal');
            
            // Reload table
            await this.loadMarksTable();
            
        } catch (error) {
            console.error('❌ Error saving academic record:', error);
            this.showToast(`Error: ${error.message || 'Failed to save'}`, 'error');
        }
    }
    
    // ==================== MODAL MANAGEMENT ====================
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            
            // Reset forms
            if (modalId === 'marksModal') {
                const form = document.getElementById('marksForm');
                if (form) {
                    form.reset();
                    // Reset default values
                    const maxScoreInput = document.getElementById('maxScore');
                    if (maxScoreInput) maxScoreInput.value = '100';
                    
                    const assessmentType = document.getElementById('assessmentType');
                    if (assessmentType) assessmentType.value = 'exam';
                    
                    // Reset grade display
                    this.resetMarksGradeDisplay(
                        document.getElementById('gradeDisplay'),
                        document.getElementById('percentageDisplay'),
                        document.getElementById('gradeDescription')
                    );
                }
            }
        }
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
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
            
            container.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // ==================== STUB METHODS (for incomplete features) ====================
    
    renderCardsView() {
        console.log('Cards view not implemented yet');
        this.showToast('Cards view coming soon!', 'info');
        this.setViewMode('table');
    }
    
    renderCompactView() {
        console.log('Compact view not implemented yet');
        this.showToast('Compact view coming soon!', 'info');
        this.setViewMode('table');
    }
    
    setViewMode(mode) {
        this.state.viewMode = mode;
        
        // Update view toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show only table view for now
        if (mode !== 'table') {
            this.showToast(`${mode} view coming soon!`, 'info');
            mode = 'table';
        }
        
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        if (tableView) tableView.style.display = 'block';
        if (cardsView) cardsView.style.display = 'none';
        
        this.renderCurrentView();
    }
    
    viewDetails(markId) {
        console.log('View details for:', markId);
        this.showToast('View details feature coming soon!', 'info');
    }
    
    editMark(markId) {
        console.log('Edit mark:', markId);
        this.showToast('Edit feature coming soon!', 'info');
    }
    
    deleteMark(markId) {
        console.log('Delete mark:', markId);
        this.showToast('Delete feature coming soon!', 'info');
    }
    
    deleteSelected() {
        console.log('Delete selected');
        this.showToast('Bulk delete coming soon!', 'info');
    }
    
    exportSelected() {
        console.log('Export selected');
        this.showToast('Export selected coming soon!', 'info');
    }
    
    exportMarks() {
        console.log('Export marks');
        this.showToast('Export feature coming soon!', 'info');
    }
    
    bulkEdit() {
        console.log('Bulk edit');
        this.showToast('Bulk edit coming soon!', 'info');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MarksManager = MarksManager;
}
