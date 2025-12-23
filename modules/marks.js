// modules/marks.js - COMPLETE FIXED VERSION
class MarksManager {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        
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
        
        // Initialize when ready
        setTimeout(() => this.initEventListeners(), 100);
    }
    
    // ==================== INITIALIZATION ====================
    
    initEventListeners() {
        console.log('🎯 Initializing MarksManager event listeners');
        
        // Initialize modal handlers first
        this.initModalHandlers();
        
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
                e.preventDefault();
                const mode = btn.textContent.toLowerCase().includes('table') ? 'table' :
                            btn.textContent.toLowerCase().includes('card') ? 'cards' :
                            'compact';
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
        
        // Clear filters button
        const clearFiltersBtn = document.querySelector('.btn-outline[onclick*="clearFilters"]');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearFilters();
            });
        }
        
        // Marks form submit handler
        const marksForm = document.getElementById('marksForm');
        if (marksForm) {
            marksForm.addEventListener('submit', (e) => this.saveMarks(e));
        }
        
        // Add "Add Marks" button listener if it exists
        const addMarksBtn = document.querySelector('[onclick*="openMarksModal"]');
        if (addMarksBtn) {
            addMarksBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openMarksModal();
            });
        }
    }
    
    initModalHandlers() {
        // Global modal close handlers
        document.addEventListener('click', (e) => {
            // Close modal when clicking on close button
            if (e.target.closest('[data-modal-close]')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            }
            
            // Close modal when clicking outside
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="block"], .modal.active');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            
            // Reset forms
            if (modalId === 'marksModal') {
                const form = document.getElementById('marksForm');
                if (form) {
                    form.reset();
                    
                    // Reset specific fields
                    const maxScoreInput = document.getElementById('marksMaxScore');
                    if (maxScoreInput) maxScoreInput.value = '100';
                    
                    const assessmentType = document.getElementById('assessmentType');
                    if (assessmentType) assessmentType.value = 'exam';
                    
                    // Set today's date
                    const dateField = document.getElementById('assessmentDate');
                    if (dateField) {
                        dateField.value = new Date().toISOString().split('T')[0];
                    }
                    
                    // Reset grade display
                    this.resetMarksGradeDisplay(
                        document.getElementById('gradeBadge'),
                        document.getElementById('marksPercentage')
                    );
                }
            }
        }
    }
    
    // ==================== CORE DATA LOADING ====================
    
    async loadMarksTable() {
        try {
            console.log('📊 Loading marks table...');
            const marks = await this.db.getMarksTableData();
            this.filteredData = marks || [];
            
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
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
        return professionalGradePoints[upperGrade] || 0.0;
    }
    
    getGradeDescription(grade) {
        const professionalDescriptions = {
            'DISTINCTION': 'Excellent performance',
            'CREDIT': 'Good performance',
            'PASS': 'Satisfactory performance',
            'FAIL': 'Needs improvement'
        };
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
        return professionalDescriptions[upperGrade] || 'No description available';
    }
    
    getGradeCSSClass(grade) {
        const professionalClasses = {
            'DISTINCTION': 'grade-distinction',
            'CREDIT': 'grade-credit',
            'PASS': 'grade-pass',
            'FAIL': 'grade-fail'
        };
        
        const upperGrade = grade?.toUpperCase() || 'FAIL';
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
        
        return value;
    }
    
    // ==================== TABLE RENDERING ====================
    
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
            const status = mark.visible_to_student ? 'published' : 'hidden';
            
            // Escape HTML to prevent XSS
            const escapeHTML = (str) => {
                if (!str) return '';
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };
            
            html += `
                <tr data-mark-id="${mark.id}" class="${isSelected ? 'selected' : ''}">
                    <td class="select-col">
                        <input type="checkbox" 
                               ${isSelected ? 'checked' : ''}
                               onchange="window.app.marks.toggleSelection('${mark.id}')">
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
                            <button class="action-btn" onclick="window.app.marks.editMark('${mark.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="window.app.marks.viewDetails('${mark.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn btn-danger" onclick="window.app.marks.deleteMark('${mark.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
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
        } catch (error) {
            return 'N/A';
        }
    }
    
    getEmptyStateHTML(isCard = false) {
        const content = `
            <i class="fas fa-chart-bar fa-3x"></i>
            <h3>No Academic Records Found</h3>
            <p>${this.filteredData.length === 0 ? 'Get started by adding your first academic record' : 'No records match your filters'}</p>
            ${this.filteredData.length === 0 ? `
                <button class="btn-primary" onclick="window.app.marks.openMarksModal()">
                    <i class="fas fa-plus"></i> Add First Record
                </button>
            ` : `
                <button class="btn-secondary" onclick="window.app.marks.clearFilters()">
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
                        <p>Error loading academic records</p>
                        <small class="d-block mt-1">${error.message || 'Unknown error'}</small>
                        <button class="btn btn-secondary mt-2" onclick="window.app.marks.loadMarksTable()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    // ==================== DASHBOARD STATISTICS ====================
    
    updateDashboardStatistics(marks) {
        try {
            if (!marks || !Array.isArray(marks)) return;
            
            console.log('📈 Updating dashboard statistics...');
            
            // Calculate statistics
            const totalMarks = marks.length;
            const distinctStudents = new Set(marks.map(m => m.student_id).filter(Boolean)).size;
            
            let avgScore = 0;
            if (marks.length > 0) {
                const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
                avgScore = totalPercentage / marks.length;
            }
            
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
            this.updateDashboardElement('avgGrade', `${avgScore.toFixed(1)}%`);
            
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
        }
    }
    
    updateDashboardGradeDistribution(distribution, total) {
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
        if (!recentActivity || !Array.isArray(marks) || marks.length === 0) return;
        
        // Get last 5 marks sorted by date
        const recentMarks = marks
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
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
        } catch (error) {
            return 'Unknown time';
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
        
        // Update DOM elements
        this.updateElementText('totalRecords', totalRecords);
        this.updateElementText('distinctStudents', distinctStudents);
        this.updateElementText('avgScore', `${avgScore.toFixed(1)}%`);
        this.updateElementText('distinctionCount', distinctionCount);
        
        // Update grade distribution
        this.updateGradeDistribution(marks);
        
        // Update recent updates
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
        try {
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
        if (!Array.isArray(this.filteredData)) {
            this.filteredData = [];
            return;
        }
        
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
        
        this.filteredData = filtered;
    }
    
    clearFilters() {
        const searchInput = document.getElementById('marksSearch');
        const gradeFilter = document.getElementById('gradeFilter');
        const courseFilter = document.getElementById('courseFilter');
        const dateFilter = document.getElementById('dateFilter');
        const studentFilter = document.getElementById('studentFilter');
        
        if (searchInput) searchInput.value = '';
        if (gradeFilter) gradeFilter.value = '';
        if (courseFilter) courseFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (studentFilter) studentFilter.value = '';
        
        this.filters = {
            search: '',
            grade: '',
            course: '',
            date: '',
            student: ''
        };
        
        this.filterTable();
    }
    
    // ==================== PAGINATION ====================
    
    updatePagination() {
        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        
        // Update pagination info
        const startRow = Math.min((this.currentPage - 1) * this.pageSize + 1, totalRows);
        const endRow = Math.min(this.currentPage * this.pageSize, totalRows);
        
        this.safeUpdateElement('startRow', startRow);
        this.safeUpdateElement('endRow', endRow);
        this.safeUpdateElement('totalRows', totalRows);
        
        // Update page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || 
                    (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    html += `
                        <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                                onclick="window.app.marks.goToPage(${i})">
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
    
    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentView();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
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
    
    updateSelectedCounts() {
        const rowCount = document.querySelectorAll('#marksTableBody tr:not(.empty-state)').length;
        const countElement = document.getElementById('markCount');
        if (countElement) {
            countElement.textContent = `Total: ${rowCount} records`;
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
        
        const activeBtn = Array.from(document.querySelectorAll('.view-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(mode)
        );
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Show/hide containers
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        const compactView = document.getElementById('compactView');
        
        if (tableView) tableView.style.display = mode === 'table' ? 'block' : 'none';
        if (cardsView) cardsView.style.display = mode === 'cards' ? 'block' : 'none';
        if (compactView) compactView.style.display = mode === 'compact' ? 'block' : 'none';
        
        this.renderCurrentView();
    }
    
    // ==================== MARKS MODAL ====================
    
    async openMarksModal() {
        try {
            await this.populateStudentDropdown();
            await this.populateCourseDropdown();
            
            // Set today's date
            const dateField = document.getElementById('assessmentDate');
            if (dateField) {
                dateField.value = new Date().toISOString().split('T')[0];
            }
            
            // Set default max score
            const maxScoreField = document.getElementById('marksMaxScore');
            if (maxScoreField) {
                maxScoreField.value = 100;
            }
            
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
            const students = await this.db.getStudents();
            select.innerHTML = '<option value="">Select student...</option>';
            
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
            const courses = await this.db.getCourses();
            const activeCourses = courses.filter(c => !c.status || c.status === 'active');
            
            select.innerHTML = '<option value="">Select course...</option>';
            
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
        const maxScoreInput = document.getElementById('marksMaxScore');
        
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
            const maxScoreInput = document.getElementById('marksMaxScore');
            const percentageDisplay = document.getElementById('marksPercentage');
            const gradeBadge = document.getElementById('gradeBadge');
            
            if (!scoreInput || !gradeBadge || !maxScoreInput) return;
            
            const score = parseFloat(scoreInput.value);
            const maxScore = parseFloat(maxScoreInput.value);
            
            if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
                this.resetMarksGradeDisplay(gradeBadge, percentageDisplay);
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
            
            // Update percentage display
            if (percentageDisplay) {
                percentageDisplay.value = `${cappedPercentage.toFixed(2)}%`;
            }
            
            // Update grade badge
            gradeBadge.innerHTML = `<span>${grade}</span>`;
            gradeBadge.className = `grade-badge ${gradeCSSClass}`;
            gradeBadge.title = gradeDescription;
            
        } catch (error) {
            console.error('Error updating grade display:', error);
        }
    }
    
    resetMarksGradeDisplay(gradeBadge, percentageDisplay) {
        if (gradeBadge) {
            gradeBadge.innerHTML = '<span>Enter score to see grade</span>';
            gradeBadge.className = 'grade-badge';
            gradeBadge.title = '';
        }
        
        if (percentageDisplay) {
            percentageDisplay.value = '0.00%';
        }
    }
    
    async saveMarks(event) {
        event.preventDefault();
        
        try {
            // Get form values
            const studentId = document.getElementById('marksStudent').value;
            const courseId = document.getElementById('marksCourse').value;
            const score = parseFloat(document.getElementById('marksScore').value);
            const maxScore = parseFloat(document.getElementById('marksMaxScore').value) || 100;
            const assessmentType = document.getElementById('assessmentType')?.value || 'exam';
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
            
            // Prepare data
            const markData = {
                student_id: studentId,
                course_id: courseId,
                assessment_type: assessmentType,
                assessment_name: assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1),
                score: score,
                max_score: maxScore,
                percentage: percentage,
                grade: grade,
                grade_points: gradePoints,
                visible_to_student: true,
                entered_by: this.app.user?.id || 'system',
                assessment_date: assessmentDate
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
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(message, type = 'info') {
        try {
            // Create toast container if it doesn't exist
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
            toast.style.cssText = `
                background: ${this.getToastColor(type)};
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            
            const icons = {
                'success': 'fa-check-circle',
                'error': 'fa-exclamation-circle',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size: 18px;"></i>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
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
    
    getToastColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#6c757d';
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
    
    // ==================== OTHER METHODS ====================
    
    renderCardsView() {
        console.log('Cards view not implemented yet');
        const container = document.querySelector('#marksCards');
        if (container) {
            container.innerHTML = `
                <div class="empty-state-cards">
                    <i class="fas fa-th-large fa-3x"></i>
                    <h3>Cards View Coming Soon</h3>
                    <p>We're working on an enhanced cards view</p>
                    <button class="btn-secondary" onclick="window.app.marks.setViewMode('table')">
                        <i class="fas fa-table"></i> Switch to Table View
                    </button>
                </div>
            `;
        }
    }
    
    renderCompactView() {
        console.log('Compact view not implemented yet');
        const container = document.getElementById('compactView');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list fa-3x"></i>
                    <h3>Compact View Coming Soon</h3>
                    <p>We're working on a compact view for faster browsing</p>
                    <button class="btn-secondary" onclick="window.app.marks.setViewMode('table')">
                        <i class="fas fa-table"></i> Switch to Table View
                    </button>
                </div>
            `;
        }
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
        if (confirm('Are you sure you want to delete this record?')) {
            console.log('Delete mark:', markId);
            this.showToast('Delete feature coming soon!', 'info');
        }
    }
    
    deleteSelected() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to delete', 'warning');
            return;
        }
        
        if (confirm(`Are you sure you want to delete ${this.selectedMarks.size} selected records?`)) {
            console.log('Delete selected:', this.selectedMarks.size);
            this.showToast('Bulk delete coming soon!', 'info');
        }
    }
    
    exportSelected() {
        if (this.selectedMarks.size === 0) {
            this.showToast('Please select records to export', 'warning');
            return;
        }
        
        console.log('Export selected:', this.selectedMarks.size);
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
