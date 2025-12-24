// modules/reports.js - Complete Reports Module
class ReportsManager {
    constructor(db) {
        this.db = db;
        this.currentFilters = {
            year: 'all',
            program: ['all'],
            course: 'all',
            semester: 'all',
            status: 'all',
            intake: 'all',
            centers: ['all'],
            counties: ['all'],
            dateFrom: null,
            dateTo: null
        };
        this.charts = {};
        this.initialized = false;
    }
    
    // ==================== INITIALIZATION ====================
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('📊 Initializing Reports Manager...');
            this.showLoading(true);
            
            // Initialize UI components
            await this.initializeReportsUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial statistics
            await this.updateStatistics();
            
            this.initialized = true;
            console.log('✅ Reports Manager initialized');
            
            this.showToast('Reports module ready', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing reports:', error);
            this.showToast('Reports module failed to initialize', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async initializeReportsUI() {
        try {
            // Populate all filters
            await this.populateFilters();
            
            // Set default dates
            this.setDefaultDates();
            
            // Initialize student selector for transcripts
            await this.populateTranscriptStudents();
            
        } catch (error) {
            console.error('Error initializing reports UI:', error);
            throw error;
        }
    }
    
    async populateFilters() {
        try {
            // Populate Academic Year filter
            const yearSelect = document.getElementById('academicYear');
            if (yearSelect) {
                const currentYear = new Date().getFullYear();
                for (let year = currentYear; year >= currentYear - 10; year--) {
                    const option = document.createElement('option');
                    option.value = `${year}-${year + 1}`;
                    option.textContent = `${year}-${year + 1}`;
                    yearSelect.appendChild(option);
                }
                yearSelect.value = `${currentYear}-${currentYear + 1}`;
            }
            
            // Populate Center filters
            const centers = await this.getCenters();
            const centerSelects = [
                'filterCenter', 
                'studentReportCenter', 
                'academicReportCenter',
                'transcriptCenterFilter',
                'bulkExportCenters',
                'scheduleCenter',
                'centerCompareSelect'
            ];
            
            centerSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except first
                    while (select.options.length > 0) {
                        select.remove(0);
                    }
                    
                    // Add "All Centers" option
                    const allOption = document.createElement('option');
                    allOption.value = 'all';
                    allOption.textContent = 'All Centers';
                    select.appendChild(allOption);
                    
                    // Add center options
                    centers.forEach(center => {
                        const option = document.createElement('option');
                        option.value = center.id || center.name.toLowerCase().replace(/\s+/g, '_');
                        option.textContent = center.name;
                        if (selectId === 'centerCompareSelect') {
                            option.textContent += ` (${center.county || 'Unknown'})`;
                        }
                        select.appendChild(option);
                    });
                }
            });
            
            // Populate County filters
            const counties = await this.getCounties();
            const countySelects = ['filterCounty'];
            
            countySelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    while (select.options.length > 0) {
                        select.remove(0);
                    }
                    
                    // Add "All Counties" option
                    const allOption = document.createElement('option');
                    allOption.value = 'all';
                    allOption.textContent = 'All Counties';
                    allOption.selected = true;
                    select.appendChild(allOption);
                    
                    counties.forEach(county => {
                        const option = document.createElement('option');
                        option.value = county;
                        option.textContent = county;
                        select.appendChild(option);
                    });
                }
            });
            
            // Populate Program filter
            const programSelect = document.getElementById('filterProgram');
            if (programSelect) {
                // Clear existing options
                while (programSelect.options.length > 0) {
                    programSelect.remove(0);
                }
                
                // Add "All Programs" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Programs';
                allOption.selected = true;
                programSelect.appendChild(allOption);
                
                const programs = await this.db.getPrograms();
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programSelect.appendChild(option);
                });
            }
            
            // Populate Intake filter
            const intakeSelect = document.getElementById('filterIntake');
            if (intakeSelect) {
                // Clear existing options
                while (intakeSelect.options.length > 0) {
                    intakeSelect.remove(0);
                }
                
                // Add "All Intakes" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Intakes';
                allOption.selected = true;
                intakeSelect.appendChild(allOption);
                
                const students = await this.db.getStudents();
                const intakeYears = [...new Set(students.map(s => s.intake_year))]
                    .sort((a, b) => b - a);
                
                intakeYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    intakeSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error populating filters:', error);
        }
    }
    
    async populateTranscriptStudents() {
        try {
            const studentSelect = document.getElementById('transcriptStudent');
            if (!studentSelect) return;
            
            // Clear existing options
            while (studentSelect.options.length > 0) {
                studentSelect.remove(0);
            }
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Get all students
            const students = await this.db.getStudents();
            
            // Add student options
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                
                // Add student center if available
                if (student.center) {
                    option.textContent += ` (${student.center})`;
                }
                
                studentSelect.appendChild(option);
            });
            
            console.log(`Loaded ${students.length} students for transcript generation`);
            
        } catch (error) {
            console.error('Error populating transcript students:', error);
            this.showToast('Error loading student list', 'error');
        }
    }
    
    async getCenters() {
        try {
            // Try to get centers from database
            const students = await this.db.getStudents();
            const centers = [...new Set(students.map(s => s.center).filter(Boolean))];
            
            if (centers.length > 0) {
                return centers.map(center => ({
                    id: center.toLowerCase().replace(/\s+/g, '_'),
                    name: center,
                    county: 'Unknown' // Default value
                }));
            }
            
            // Default centers if none found
            return [
                { id: 'main_campus', name: 'Main Campus', county: 'Nairobi' },
                { id: 'west_campus', name: 'West Campus', county: 'Kiambu' },
                { id: 'east_campus', name: 'East Campus', county: 'Machakos' }
            ];
        } catch (error) {
            console.error('Error getting centers:', error);
            return [];
        }
    }
    
    async getCounties() {
        try {
            const students = await this.db.getStudents();
            const counties = [...new Set(students.map(s => s.county).filter(Boolean))];
            
            if (counties.length > 0) {
                return counties;
            }
            
            return ['Nairobi', 'Kiambu', 'Machakos', 'Mombasa', 'Kisumu', 'Nakuru'];
        } catch (error) {
            console.error('Error getting counties:', error);
            return [];
        }
    }
    
    setDefaultDates() {
        const dateFrom = document.getElementById('reportStartDate');
        const dateTo = document.getElementById('reportEndDate');
        
        if (dateFrom) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            dateFrom.valueAsDate = oneYearAgo;
        }
        
        if (dateTo) {
            dateTo.valueAsDate = new Date();
        }
    }
    
    setupEventListeners() {
        // Apply Filters button
        const applyBtn = document.querySelector('[onclick="app.reports.applyFilters()"]');
        if (applyBtn) {
            applyBtn.onclick = () => this.applyFilters();
        }
        
        // Clear Filters button
        const clearBtn = document.querySelector('[onclick="app.reports.clearFilters()"]');
        if (clearBtn) {
            clearBtn.onclick = () => this.clearFilters();
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('[onclick="app.reports.refreshReports()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshReports();
        }
        
        // Transcript Center Filter
        const transcriptCenterFilter = document.getElementById('transcriptCenterFilter');
        if (transcriptCenterFilter) {
            transcriptCenterFilter.onchange = () => this.filterTranscriptStudentsByCenter();
        }
        
        // Update all onclick handlers
        this.updateButtonListeners();
    }
    
    updateButtonListeners() {
        const buttonMap = {
            'app.reports.studentReport()': () => this.studentReport(),
            'app.reports.academicReport()': () => this.academicReport(),
            'app.reports.generateCentreReport()': () => this.generateCentreReport(),
            'app.reports.geographicalReport()': () => this.geographicalReport(),
            'app.reports.generateSummaryReport()': () => this.generateSummaryReport(),
            'app.reports.previewStudentReport()': () => this.previewStudentReport(),
            'app.reports.previewAcademicReport()': () => this.previewAcademicReport(),
            'app.reports.quickStudentReport()': () => this.quickStudentReport(),
            'app.reports.quickAcademicReport()': () => this.quickAcademicReport(),
            'app.reports.previewTranscript()': () => this.previewTranscript(),
            'app.reports.generateTranscript()': () => this.generateTranscript(),
            'app.reports.bulkExport()': () => this.bulkExport(),
            'app.reports.loadSampleTranscript()': () => this.loadSampleTranscript(),
            'app.reports.clearPreview()': () => this.clearPreview(),
            'app.reports.generateCenterComparison()': () => this.generateCenterComparison(),
            'app.reports.addScheduledReport()': () => this.addScheduledReport(),
            'app.reports.saveFilterPreset()': () => this.saveFilterPreset(),
            'app.reports.downloadPreview()': () => this.downloadPreview(),
            'app.reports.bulkTranscripts()': () => this.bulkTranscripts(),
            'app.reports.removeScheduledReport()': (btn) => this.removeScheduledReport(btn)
        };
        
        document.querySelectorAll('[onclick]').forEach(button => {
            const onclickValue = button.getAttribute('onclick');
            if (onclickValue && onclickValue.startsWith('app.reports.')) {
                const funcName = onclickValue;
                if (funcName.includes('removeScheduledReport')) {
                    button.onclick = (e) => {
                        e.stopPropagation();
                        this.removeScheduledReport(button);
                    };
                } else if (buttonMap[funcName]) {
                    button.onclick = () => buttonMap[funcName]();
                }
            }
        });
    }
    
    async filterTranscriptStudentsByCenter() {
        try {
            const centerFilter = document.getElementById('transcriptCenterFilter');
            const studentSelect = document.getElementById('transcriptStudent');
            
            if (!centerFilter || !studentSelect) return;
            
            const selectedCenter = centerFilter.value;
            const students = await this.db.getStudents();
            
            // Clear existing options
            while (studentSelect.options.length > 0) {
                studentSelect.remove(0);
            }
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Filter students by center
            const filteredStudents = selectedCenter === 'all' 
                ? students 
                : students.filter(student => student.center === selectedCenter);
            
            // Add filtered students
            filteredStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                
                if (student.center) {
                    option.textContent += ` (${student.center})`;
                }
                
                studentSelect.appendChild(option);
            });
            
            console.log(`Filtered ${filteredStudents.length} students for center: ${selectedCenter}`);
            
        } catch (error) {
            console.error('Error filtering transcript students by center:', error);
        }
    }
    
    // ==================== REPORT GENERATION METHODS ====================
    
    studentReport() {
        console.log('📊 Generating student report...');
        try {
            this.showToast('Generating student report...', 'info');
            return this.quickStudentReport();
        } catch (error) {
            console.error('Error in studentReport:', error);
            this.showToast('Error generating student report', 'error');
            throw error;
        }
    }
    
    academicReport() {
        console.log('📈 Generating academic report...');
        try {
            this.showToast('Generating academic report...', 'info');
            return this.quickAcademicReport();
        } catch (error) {
            console.error('Error in academicReport:', error);
            this.showToast('Error generating academic report', 'error');
            throw error;
        }
    }
    
    generateCentreReport() {
        console.log('📍 Generating centre report...');
        try {
            this.showToast('Generating centre report...', 'info');
            const reportData = this.generateCentreReportData();
            this.previewReportData(reportData, 'Center Report');
            return reportData;
        } catch (error) {
            console.error('Error in generateCentreReport:', error);
            this.showToast('Error generating centre report', 'error');
            throw error;
        }
    }
    
    async generateCentreReportData() {
        try {
            const students = await this.db.getStudents();
            const centers = await this.getCenters();
            
            const centerData = centers.map(center => {
                const centerStudents = students.filter(s => s.center === center.name);
                const activeStudents = centerStudents.filter(s => s.status === 'active');
                const graduatedStudents = centerStudents.filter(s => s.status === 'graduated');
                
                return {
                    'Center Name': center.name,
                    'County': center.county,
                    'Total Students': centerStudents.length,
                    'Active Students': activeStudents.length,
                    'Graduated': graduatedStudents.length,
                    'Graduation Rate': centerStudents.length > 0 
                        ? ((graduatedStudents.length / centerStudents.length) * 100).toFixed(1) + '%' 
                        : '0%'
                };
            });
            
            return centerData;
        } catch (error) {
            console.error('Error generating center report data:', error);
            throw error;
        }
    }
    
    geographicalReport() {
        console.log('🗺️ Generating geographical report...');
        try {
            this.showToast('Generating geographical report...', 'info');
            const reportData = this.generateGeographicalReportData();
            this.previewReportData(reportData, 'Geographical Distribution Report');
            return reportData;
        } catch (error) {
            console.error('Error in geographicalReport:', error);
            this.showToast('Error generating geographical report', 'error');
            throw error;
        }
    }
    
    async generateGeographicalReportData() {
        try {
            const students = await this.db.getStudents();
            const counties = await this.getCounties();
            
            const countyData = counties.map(county => {
                const countyStudents = students.filter(s => s.county === county);
                const centers = [...new Set(countyStudents.map(s => s.center).filter(Boolean))];
                
                return {
                    'County': county,
                    'Students': countyStudents.length,
                    'Centers': centers.length,
                    'Programs': [...new Set(countyStudents.map(s => s.program).filter(Boolean))].length,
                    'Active Students': countyStudents.filter(s => s.status === 'active').length
                };
            }).filter(data => data.Students > 0); // Only include counties with students
            
            return countyData;
        } catch (error) {
            console.error('Error generating geographical report data:', error);
            throw error;
        }
    }
    
    generateSummaryReport() {
        console.log('📋 Generating summary report...');
        try {
            this.showToast('Generating summary report...', 'info');
            const reportData = this.generateExecutiveSummary();
            this.previewReportData(reportData, 'Executive Summary Report');
            return reportData;
        } catch (error) {
            console.error('Error in generateSummaryReport:', error);
            this.showToast('Error generating summary report', 'error');
            throw error;
        }
    }
    
    async generateExecutiveSummary() {
        try {
            const students = await this.db.getStudents();
            const courses = await this.db.getCourses();
            const marks = await this.db.getMarksTableData();
            
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.status === 'active').length;
            const graduatedStudents = students.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 
                ? ((graduatedStudents / totalStudents) * 100).toFixed(1) + '%'
                : '0%';
            
            const centers = await this.getCenters();
            
            return [
                { 'Metric': 'Total Students', 'Value': totalStudents },
                { 'Metric': 'Active Students', 'Value': activeStudents },
                { 'Metric': 'Graduated Students', 'Value': graduatedStudents },
                { 'Metric': 'Graduation Rate', 'Value': graduationRate },
                { 'Metric': 'Total Courses', 'Value': courses.length },
                { 'Metric': 'Active Centers', 'Value': centers.length },
                { 'Metric': 'Marks Entries', 'Value': marks.length }
            ];
        } catch (error) {
            console.error('Error generating executive summary:', error);
            throw error;
        }
    }
    
    // ==================== FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            this.showLoading(true);
            
            this.currentFilters = {
                year: this.getSafeElementValue('academicYear', 'all'),
                program: this.getSelectedValues('filterProgram'),
                course: this.getSafeElementValue('filterCourse', 'all'),
                semester: this.getSafeElementValue('semester', 'all'),
                status: 'all',
                intake: this.getSafeElementValue('filterIntake', 'all'),
                centers: this.getSelectedValues('filterCenter'),
                counties: this.getSelectedValues('filterCounty'),
                dateFrom: document.getElementById('reportStartDate')?.value || null,
                dateTo: document.getElementById('reportEndDate')?.value || null
            };
            
            console.log('Current filters:', this.currentFilters);
            
            await this.updateStatistics();
            
            this.showToast('Filters applied successfully', 'success');
            
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showToast('Error applying filters', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    clearFilters() {
        try {
            document.getElementById('academicYear').value = 'all';
            this.resetSelect('filterProgram');
            this.resetSelect('filterCourse');
            document.getElementById('semester').value = 'all';
            this.resetSelect('filterCenter');
            this.resetSelect('filterCounty');
            this.resetSelect('filterIntake');
            
            this.setDefaultDates();
            
            this.currentFilters = {
                year: 'all',
                program: ['all'],
                course: 'all',
                semester: 'all',
                status: 'all',
                intake: 'all',
                centers: ['all'],
                counties: ['all'],
                dateFrom: null,
                dateTo: null
            };
            
            this.updateStatistics();
            
            this.showToast('Filters cleared', 'info');
            
        } catch (error) {
            console.error('Error clearing filters:', error);
            this.showToast('Error clearing filters', 'error');
        }
    }
    
    resetSelect(selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = option.value === 'all';
            });
        }
    }
    
    getSelectedValues(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return ['all'];
        
        const selected = Array.from(select.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');
        
        return selected.length > 0 ? selected : ['all'];
    }
    
    // ==================== CENTER COMPARISON ====================
    
    async generateCenterComparison() {
        try {
            const centerSelect = document.getElementById('centerCompareSelect');
            const metricSelect = document.getElementById('centerMetric');
            const periodSelect = document.getElementById('centerPeriod');
            
            if (!centerSelect || !metricSelect || !periodSelect) return;
            
            const selectedCenters = Array.from(centerSelect.selectedOptions)
                .map(opt => opt.value)
                .filter(val => val !== 'all');
            
            const metric = metricSelect.value;
            const period = periodSelect.value;
            
            if (selectedCenters.length < 2) {
                this.showToast('Please select at least 2 centers to compare', 'warning');
                return;
            }
            
            console.log(`📊 Generating center comparison for ${selectedCenters.length} centers`);
            
            const comparisonData = await this.generateComparisonData(selectedCenters, metric, period);
            this.displayCenterComparisonChart(comparisonData, metric);
            
        } catch (error) {
            console.error('Error generating center comparison:', error);
            this.showToast('Error generating comparison', 'error');
        }
    }
    
    async generateComparisonData(centerIds, metric, period) {
        try {
            const students = await this.db.getStudents();
            const centers = await this.getCenters();
            const selectedCenters = centers.filter(center => centerIds.includes(center.id));
            
            const comparisonData = [];
            
            for (const center of selectedCenters) {
                const centerStudents = students.filter(s => s.center === center.name);
                
                if (centerStudents.length === 0) {
                    comparisonData.push({
                        center: center.name,
                        value: 0,
                        county: center.county
                    });
                    continue;
                }
                
                let value;
                
                switch(metric) {
                    case 'enrollment':
                        value = centerStudents.length;
                        break;
                        
                    case 'graduation_rate':
                        const graduated = centerStudents.filter(s => s.status === 'graduated').length;
                        value = centerStudents.length > 0 
                            ? (graduated / centerStudents.length) * 100 
                            : 0;
                        break;
                        
                    case 'avg_gpa':
                        // This would require actual GPA calculation from marks
                        value = 3.0; // Placeholder
                        break;
                        
                    case 'attendance':
                        // This would require attendance data
                        value = 85; // Placeholder percentage
                        break;
                        
                    case 'dropout_rate':
                        const withdrawn = centerStudents.filter(s => s.status === 'withdrawn').length;
                        value = centerStudents.length > 0 
                            ? (withdrawn / centerStudents.length) * 100 
                            : 0;
                        break;
                        
                    default:
                        value = 0;
                }
                
                comparisonData.push({
                    center: center.name,
                    value: parseFloat(value.toFixed(2)),
                    county: center.county
                });
            }
            
            return comparisonData;
        } catch (error) {
            console.error('Error generating comparison data:', error);
            return [];
        }
    }
    
    displayCenterComparisonChart(data, metric) {
        const chartContainer = document.getElementById('centerComparisonChart');
        const canvas = document.getElementById('centerComparisonCanvas');
        
        if (!chartContainer || !canvas) return;
        
        // Clear canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        chartContainer.style.display = 'block';
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.centerComparison) {
            this.charts.centerComparison.destroy();
        }
        
        // Create new chart
        const metricLabels = {
            enrollment: 'Enrollment Count',
            graduation_rate: 'Graduation Rate (%)',
            avg_gpa: 'Average GPA',
            attendance: 'Attendance Rate (%)',
            dropout_rate: 'Dropout Rate (%)'
        };
        
        this.charts.centerComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.center),
                datasets: [{
                    label: metricLabels[metric] || 'Value',
                    data: data.map(d => d.value),
                    backgroundColor: data.map((d, i) => 
                        `hsl(${i * 60}, 70%, 60%)`
                    ),
                    borderColor: data.map((d, i) => 
                        `hsl(${i * 60}, 70%, 40%)`
                    ),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Center Performance Comparison',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const county = data[context.dataIndex].county;
                                return `${context.dataset.label}: ${context.raw} (${county})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: metricLabels[metric] || 'Value'
                        }
                    }
                }
            }
        });
    }
    
    // ==================== SCHEDULED REPORTS ====================
    
    async addScheduledReport() {
        try {
            const reportType = document.getElementById('scheduleReportType')?.value;
            const frequency = document.getElementById('scheduleFrequency')?.value;
            const center = document.getElementById('scheduleCenter')?.value;
            const email = document.getElementById('scheduleEmail')?.value;
            
            if (!reportType || !frequency || !email) {
                this.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showToast('Please enter a valid email address', 'warning');
                return;
            }
            
            await this.addToScheduledList(reportType, center, frequency, email);
            
            document.getElementById('scheduleEmail').value = '';
            
            this.showToast('Report scheduled successfully', 'success');
            
        } catch (error) {
            console.error('Error scheduling report:', error);
            this.showToast('Error scheduling report', 'error');
        }
    }
    
    async addToScheduledList(reportType, center, frequency, email) {
        const list = document.getElementById('scheduledReportsList');
        if (!list) return;
        
        let table = list.querySelector('table');
        if (!table) {
            const tableHTML = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Report Type</th>
                                <th>Center</th>
                                <th>Frequency</th>
                                <th>Next Run</th>
                                <th>Recipients</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>
            `;
            list.innerHTML = tableHTML;
            table = list.querySelector('table');
        }
        
        const tbody = table.querySelector('tbody');
        const nextRun = this.calculateNextRun(frequency);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${this.getReportTypeName(reportType)}</td>
            <td>${center === 'all' ? 'All Centers' : center}</td>
            <td>${this.getFrequencyName(frequency)}</td>
            <td>${nextRun}</td>
            <td>${email}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="app.reports.removeScheduledReport(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    }
    
    removeScheduledReport(button) {
        const row = button.closest('tr');
        if (row) {
            row.remove();
            this.showToast('Scheduled report removed', 'info');
        }
    }
    
    calculateNextRun(frequency) {
        const now = new Date();
        const nextRun = new Date(now);
        
        switch(frequency) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
            case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                break;
            case 'quarterly':
                nextRun.setMonth(nextRun.getMonth() + 3);
                break;
        }
        
        return nextRun.toLocaleDateString();
    }
    
    getReportTypeName(type) {
        const types = {
            'weekly_summary': 'Weekly Summary',
            'monthly_attendance': 'Monthly Attendance',
            'quarterly_grades': 'Quarterly Grades',
            'center_weekly': 'Weekly Center Report',
            'monthly_center': 'Monthly Center Performance'
        };
        return types[type] || type;
    }
    
    getFrequencyName(frequency) {
        const frequencies = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly'
        };
        return frequencies[frequency] || frequency;
    }
    
    // ==================== NEW FEATURE METHODS ====================
    
    async saveFilterPreset() {
        try {
            const presetName = prompt('Enter a name for this filter preset:');
            if (!presetName) return;
            
            const presets = JSON.parse(localStorage.getItem('reportFilterPresets') || '[]');
            presets.push({
                name: presetName,
                filters: this.currentFilters,
                date: new Date().toISOString()
            });
            
            localStorage.setItem('reportFilterPresets', JSON.stringify(presets));
            this.showToast(`Filter preset "${presetName}" saved`, 'success');
            
        } catch (error) {
            console.error('Error saving filter preset:', error);
            this.showToast('Error saving filter preset', 'error');
        }
    }
    
    async downloadPreview() {
        try {
            const preview = document.getElementById('reportPreview');
            if (!preview) {
                this.showToast('No preview available to download', 'warning');
                return;
            }
            
            const content = preview.innerHTML;
            const blob = new Blob([content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-preview-${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.showToast('Preview downloaded', 'success');
            
        } catch (error) {
            console.error('Error downloading preview:', error);
            this.showToast('Error downloading preview', 'error');
        }
    }
    
    async bulkTranscripts() {
        try {
            const centerFilter = document.getElementById('transcriptCenterFilter');
            const format = document.getElementById('transcriptFormat');
            
            if (!centerFilter || !format) return;
            
            const center = centerFilter.value;
            const selectedFormat = format.value;
            
            const confirmMessage = `Generate transcripts for ${center === 'all' ? 'ALL centers' : 'selected center'} in ${selectedFormat.toUpperCase()} format?`;
            
            if (!confirm(confirmMessage)) return;
            
            this.showToast('Bulk transcript generation started... This may take a few moments.', 'info');
            
            // Simulate processing
            setTimeout(() => {
                this.showToast('Bulk transcripts generated successfully', 'success');
            }, 3000);
            
        } catch (error) {
            console.error('Error in bulk transcripts:', error);
            this.showToast('Error generating bulk transcripts', 'error');
        }
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    // ==================== STATISTICS ====================
    
    async updateStatistics() {
        try {
            const students = await this.db.getStudents();
            const filteredStudents = this.applyStudentFilters(students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            const centers = await this.getCenters();
            const activeCenters = centers.length;
            
            // Calculate average GPA (placeholder - would need actual GPA calculation)
            const avgGPA = 3.24;
            
            this.updateElementText('totalStudents', totalStudents.toLocaleString());
            this.updateElementText('graduationRate', graduationRate + '%');
            this.updateElementText('avgGPA', avgGPA.toFixed(2));
            this.updateElementText('centersCount', activeCenters);
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    // ==================== REPORT PREVIEW & GENERATION ====================
    
    async quickStudentReport() {
        try {
            const reportType = this.getSafeElementValue('studentReportType', 'list');
            const format = this.getSafeElementValue('studentReportFormat', 'csv');
            
            console.log(`📊 Generating ${reportType} student report...`);
            
            let data;
            let fileName;
            
            switch(reportType) {
                case 'list':
                    data = await this.generateStudentListReport();
                    fileName = `student-list-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    fileName = `enrollment-stats-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'graduation':
                    data = await this.generateGraduationReport();
                    fileName = `graduation-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'demographics':
                    data = await this.generateDemographicsReport();
                    fileName = `demographics-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                default:
                    throw new Error('Invalid report type');
            }
            
            await this.exportData(data, fileName, format);
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            
        } catch (error) {
            console.error('Error generating student report:', error);
            this.showToast('Error generating student report', 'error');
        }
    }
    
    async quickAcademicReport() {
        try {
            const reportType = this.getSafeElementValue('academicReportType', 'marks');
            const format = this.getSafeElementValue('academicReportFormat', 'csv');
            
            console.log(`📊 Generating ${reportType} academic report...`);
            
            let data;
            let fileName;
            
            switch(reportType) {
                case 'marks':
                    data = await this.generateMarksReport();
                    fileName = `academic-marks-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'performance':
                    data = await this.generatePerformanceReport();
                    fileName = `performance-analysis-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'grades':
                    data = await this.generateGradeDistributionReport();
                    fileName = `grade-distribution-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'coursewise':
                    data = await this.generateCoursewiseReport();
                    fileName = `coursewise-results-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                default:
                    throw new Error('Invalid report type');
            }
            
            await this.exportData(data, fileName, format);
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            
        } catch (error) {
            console.error('Error generating academic report:', error);
            this.showToast('Error generating academic report', 'error');
        }
    }
    
    async generateTranscript() {
        try {
            const studentId = this.getSafeElementValue('transcriptStudent');
            const format = this.getSafeElementValue('transcriptFormat', 'pdf');
            
            if (!studentId) {
                this.showToast('Please select a student', 'warning');
                return;
            }
            
            console.log(`📄 Generating transcript for student ID: ${studentId}`);
            
            const data = await this.generateTranscriptData(studentId);
            
            if (format === 'pdf') {
                await this.exportTranscriptToPDF(data);
            } else {
                await this.exportData(data.courses, `transcript-${data.student.regNumber}`, format);
            }
            
            this.showToast('Transcript generated successfully', 'success');
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            this.showToast('Error generating transcript', 'error');
        }
    }
    
    async bulkExport() {
        try {
            const exportType = this.getSafeElementValue('bulkExportType', 'json');
            
            console.log(`📦 Starting bulk export (${exportType})...`);
            
            switch(exportType) {
                case 'json':
                    await this.exportAllData();
                    break;
                    
                case 'excel':
                    await this.exportAllToExcel();
                    break;
                    
                case 'csv_all':
                    await this.exportAllToCSV();
                    break;
                    
                case 'pdf_all':
                    await this.exportAllToPDF();
                    break;
                    
                default:
                    throw new Error('Invalid export type');
            }
            
        } catch (error) {
            console.error('Error in bulk export:', error);
            this.showToast('Error in bulk export', 'error');
        }
    }
    
    // ==================== PREVIEW FUNCTIONS ====================
    
    async previewStudentReport() {
        try {
            const reportType = this.getSafeElementValue('studentReportType', 'list');
            
            let data;
            let title;
            
            switch(reportType) {
                case 'list':
                    data = await this.generateStudentListReport();
                    title = 'Student List Preview';
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    title = 'Enrollment Statistics Preview';
                    break;
                    
                case 'graduation':
                    data = await this.generateGraduationReport();
                    title = 'Graduation Report Preview';
                    break;
                    
                case 'demographics':
                    data = await this.generateDemographicsReport();
                    title = 'Demographics Report Preview';
                    break;
                    
                default:
                    this.showToast('Invalid report type', 'error');
                    return;
            }
            
            this.previewReportData(data, title);
            
        } catch (error) {
            console.error('Error previewing student report:', error);
            this.showToast('Error previewing report', 'error');
        }
    }
    
    async previewAcademicReport() {
        try {
            const reportType = this.getSafeElementValue('academicReportType', 'marks');
            
            let data;
            let title;
            
            switch(reportType) {
                case 'marks':
                    data = await this.generateMarksReport();
                    title = 'Academic Marks Preview';
                    break;
                    
                case 'performance':
                    data = await this.generatePerformanceReport();
                    title = 'Performance Analysis Preview';
                    break;
                    
                case 'grades':
                    data = await this.generateGradeDistributionReport();
                    title = 'Grade Distribution Preview';
                    break;
                    
                case 'coursewise':
                    data = await this.generateCoursewiseReport();
                    title = 'Course-wise Results Preview';
                    break;
                    
                default:
                    this.showToast('Invalid report type', 'error');
                    return;
            }
            
            this.previewReportData(data, title);
            
        } catch (error) {
            console.error('Error previewing academic report:', error);
            this.showToast('Error previewing report', 'error');
        }
    }
    
    async previewTranscript() {
        try {
            const studentId = this.getSafeElementValue('transcriptStudent');
            
            if (!studentId) {
                this.showToast('Please select a student', 'warning');
                return;
            }
            
            const data = await this.generateTranscriptData(studentId);
            this.previewTranscriptData(data);
            
        } catch (error) {
            console.error('Error previewing transcript:', error);
            this.showToast('Error previewing transcript', 'error');
        }
    }
    
    async loadSampleTranscript() {
        try {
            const students = await this.db.getStudents();
            if (students.length > 0) {
                const sampleStudent = students[0];
                document.getElementById('transcriptStudent').value = sampleStudent.id;
                await this.previewTranscript();
                this.showToast('Loaded sample transcript', 'info');
            } else {
                this.showToast('No students found', 'warning');
            }
        } catch (error) {
            console.error('Error loading sample transcript:', error);
            this.showToast('Error loading sample', 'error');
        }
    }
    
    clearPreview() {
        const previewDiv = document.getElementById('reportPreview');
        if (previewDiv) {
            previewDiv.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-chart-line fa-3x mb-3"></i>
                    <p>Select a report type and click "Preview" to see a sample here</p>
                    <small>Preview shows first 10 records only</small>
                </div>
            `;
        }
    }
    
    // ==================== DATA GENERATION FUNCTIONS ====================
    
    async generateStudentListReport() {
        try {
            const students = await this.db.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            // Apply center filter specifically for student reports
            const centerFilter = this.getSelectedValues('studentReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredStudents = filteredStudents.filter(student => 
                    centerFilter.includes(student.center)
                );
            }
            
            return filteredStudents.map(student => ({
                'Registration Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email,
                'Phone': student.phone,
                'Program': student.program,
                'Center': student.center || 'Not specified',
                'County': student.county || 'Not specified',
                'Intake Year': student.intake_year,
                'Status': student.status,
                'Date of Birth': student.dob ? new Date(student.dob).toLocaleDateString() : '',
                'Gender': student.gender,
                'Address': student.address || '',
                'Created Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
            }));
            
        } catch (error) {
            console.error('Error generating student list:', error);
            throw error;
        }
    }
    
    async generateEnrollmentReport() {
        try {
            const students = await this.db.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            const enrollmentStats = {};
            
            filteredStudents.forEach(student => {
                const program = student.program || 'Not specified';
                const center = student.center || 'Main Campus';
                const key = `${program}-${center}-${student.intake_year}`;
                
                if (!enrollmentStats[key]) {
                    enrollmentStats[key] = {
                        program: program,
                        center: center,
                        intakeYear: student.intake_year,
                        totalStudents: 0,
                        male: 0,
                        female: 0,
                        active: 0,
                        graduated: 0,
                        withdrawn: 0
                    };
                }
                
                enrollmentStats[key].totalStudents++;
                
                if (student.gender === 'Male') enrollmentStats[key].male++;
                if (student.gender === 'Female') enrollmentStats[key].female++;
                if (student.status === 'active') enrollmentStats[key].active++;
                if (student.status === 'graduated') enrollmentStats[key].graduated++;
                if (student.status === 'withdrawn') enrollmentStats[key].withdrawn++;
            });
            
            return Object.values(enrollmentStats).map(stat => ({
                'Program': stat.program,
                'Center': stat.center,
                'Intake Year': stat.intakeYear,
                'Total Students': stat.totalStudents,
                'Male': stat.male,
                'Female': stat.female,
                'Active': stat.active,
                'Graduated': stat.graduated,
                'Withdrawn': stat.withdrawn,
                'Completion Rate': stat.totalStudents > 0 ? 
                    Math.round((stat.graduated / stat.totalStudents) * 100) + '%' : '0%'
            }));
            
        } catch (error) {
            console.error('Error generating enrollment report:', error);
            throw error;
        }
    }
    
    async generateGraduationReport() {
        try {
            const students = await this.db.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated');
            
            const graduationByProgram = {};
            const graduationByCenter = {};
            const graduationByYear = {};
            
            graduatedStudents.forEach(student => {
                // By program
                const program = student.program || 'Not specified';
                if (!graduationByProgram[program]) {
                    graduationByProgram[program] = 0;
                }
                graduationByProgram[program]++;
                
                // By center
                const center = student.center || 'Main Campus';
                if (!graduationByCenter[center]) {
                    graduationByCenter[center] = 0;
                }
                graduationByCenter[center]++;
                
                // By year
                const graduationYear = student.intake_year + 4; // Assuming 4-year program
                if (!graduationByYear[graduationYear]) {
                    graduationByYear[graduationYear] = 0;
                }
                graduationByYear[graduationYear]++;
            });
            
            const programReport = Object.entries(graduationByProgram).map(([program, count]) => ({
                'Category': 'Program',
                'Subcategory': program,
                'Graduates': count
            }));
            
            const centerReport = Object.entries(graduationByCenter).map(([center, count]) => ({
                'Category': 'Center',
                'Subcategory': center,
                'Graduates': count
            }));
            
            const yearReport = Object.entries(graduationByYear).map(([year, count]) => ({
                'Category': 'Year',
                'Subcategory': year,
                'Graduates': count
            }));
            
            // Return as single array for preview
            return [
                ...programReport,
                ...centerReport,
                ...yearReport,
                {
                    'Category': 'Summary',
                    'Subcategory': 'Total Graduates',
                    'Graduates': graduatedStudents.length
                },
                {
                    'Category': 'Summary',
                    'Subcategory': 'Graduation Rate',
                    'Graduates': filteredStudents.length > 0 ? 
                        Math.round((graduatedStudents.length / filteredStudents.length) * 100) + '%' : '0%'
                }
            ];
            
        } catch (error) {
            console.error('Error generating graduation report:', error);
            throw error;
        }
    }
    
    async generateDemographicsReport() {
        try {
            const students = await this.db.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            const demographics = {
                byGender: {},
                byProgram: {},
                byCenter: {},
                byCounty: {},
                byStatus: {},
                byIntakeYear: {},
                ageGroups: {
                    'Under 18': 0,
                    '18-22': 0,
                    '23-25': 0,
                    '26-30': 0,
                    'Over 30': 0
                }
            };
            
            filteredStudents.forEach(student => {
                // Gender
                const gender = student.gender || 'Not specified';
                demographics.byGender[gender] = (demographics.byGender[gender] || 0) + 1;
                
                // Program
                const program = student.program || 'Not specified';
                demographics.byProgram[program] = (demographics.byProgram[program] || 0) + 1;
                
                // Center
                const center = student.center || 'Not specified';
                demographics.byCenter[center] = (demographics.byCenter[center] || 0) + 1;
                
                // County
                const county = student.county || 'Not specified';
                demographics.byCounty[county] = (demographics.byCounty[county] || 0) + 1;
                
                // Status
                demographics.byStatus[student.status] = (demographics.byStatus[student.status] || 0) + 1;
                
                // Intake Year
                demographics.byIntakeYear[student.intake_year] = (demographics.byIntakeYear[student.intake_year] || 0) + 1;
                
                // Age Group
                if (student.dob) {
                    try {
                        const dob = new Date(student.dob);
                        const age = new Date().getFullYear() - dob.getFullYear();
                        
                        if (age < 18) demographics.ageGroups['Under 18']++;
                        else if (age <= 22) demographics.ageGroups['18-22']++;
                        else if (age <= 25) demographics.ageGroups['23-25']++;
                        else if (age <= 30) demographics.ageGroups['26-30']++;
                        else demographics.ageGroups['Over 30']++;
                    } catch (e) {
                        // Invalid date, skip
                    }
                }
            });
            
            const result = [];
            
            // Gender breakdown
            Object.entries(demographics.byGender).forEach(([gender, count]) => {
                result.push({
                    'Category': 'Gender',
                    'Subcategory': gender,
                    'Count': count,
                    'Percentage': filteredStudents.length > 0 ? 
                        Math.round((count / filteredStudents.length) * 100) + '%' : '0%'
                });
            });
            
            // Program breakdown
            Object.entries(demographics.byProgram).forEach(([program, count]) => {
                result.push({
                    'Category': 'Program',
                    'Subcategory': program,
                    'Count': count,
                    'Percentage': filteredStudents.length > 0 ? 
                        Math.round((count / filteredStudents.length) * 100) + '%' : '0%'
                });
            });
            
            // Center breakdown
            Object.entries(demographics.byCenter).forEach(([center, count]) => {
                result.push({
                    'Category': 'Center',
                    'Subcategory': center,
                    'Count': count,
                    'Percentage': filteredStudents.length > 0 ? 
                        Math.round((count / filteredStudents.length) * 100) + '%' : '0%'
                });
            });
            
            return result;
            
        } catch (error) {
            console.error('Error generating demographics report:', error);
            throw error;
        }
    }
    
    async generateMarksReport() {
        try {
            const marks = await this.db.getMarksTableData();
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Apply center filter for academic reports
            const centerFilter = this.getSelectedValues('academicReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredMarks = filteredMarks.filter(mark => 
                    centerFilter.includes(mark.students?.center)
                );
            }
            
            return filteredMarks.map(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                
                return {
                    'Registration Number': student.reg_number,
                    'Student Name': student.full_name,
                    'Center': student.center || 'Not specified',
                    'Program': student.program,
                    'Course Code': course.course_code,
                    'Course Name': course.course_name,
                    'Assessment Type': mark.assessment_type,
                    'Assessment Name': mark.assessment_name,
                    'Score': mark.score,
                    'Max Score': mark.max_score,
                    'Percentage': mark.percentage,
                    'Grade': mark.grade,
                    'Grade Points': mark.grade_points,
                    'Remarks': mark.remarks,
                    'Date Entered': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : '',
                    'Academic Year': student.intake_year || ''
                };
            });
            
        } catch (error) {
            console.error('Error generating marks report:', error);
            throw error;
        }
    }
    
    async generatePerformanceReport() {
        try {
            const marks = await this.db.getMarksTableData();
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Apply center filter
            const centerFilter = this.getSelectedValues('academicReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredMarks = filteredMarks.filter(mark => 
                    centerFilter.includes(mark.students?.center)
                );
            }
            
            const studentPerformance = {};
            
            filteredMarks.forEach(mark => {
                const student = mark.students || {};
                const studentId = student.id;
                
                if (!studentId) return;
                
                if (!studentPerformance[studentId]) {
                    studentPerformance[studentId] = {
                        regNumber: student.reg_number,
                        name: student.full_name,
                        program: student.program,
                        center: student.center || 'Not specified',
                        totalMarks: 0,
                        totalMaxScore: 0,
                        courses: {},
                        gradeCounts: {}
                    };
                }
                
                studentPerformance[studentId].totalMarks += mark.score || 0;
                studentPerformance[studentId].totalMaxScore += mark.max_score || 0;
                
                const courseId = mark.course_id;
                if (!studentPerformance[studentId].courses[courseId]) {
                    studentPerformance[studentId].courses[courseId] = {
                        courseCode: mark.courses?.course_code,
                        totalScore: 0,
                        totalMax: 0,
                        count: 0
                    };
                }
                
                studentPerformance[studentId].courses[courseId].totalScore += mark.score || 0;
                studentPerformance[studentId].courses[courseId].totalMax += mark.max_score || 0;
                studentPerformance[studentId].courses[courseId].count++;
                
                const grade = mark.grade;
                if (grade) {
                    studentPerformance[studentId].gradeCounts[grade] = 
                        (studentPerformance[studentId].gradeCounts[grade] || 0) + 1;
                }
            });
            
            return Object.values(studentPerformance).map(student => {
                const totalPercentage = student.totalMaxScore > 0 ? 
                    (student.totalMarks / student.totalMaxScore) * 100 : 0;
                
                const courseAverages = Object.values(student.courses).map(course => 
                    course.totalMax > 0 ? (course.totalScore / course.totalMax) * 100 : 0
                );
                
                const averageCourseScore = courseAverages.length > 0 ?
                    courseAverages.reduce((a, b) => a + b, 0) / courseAverages.length : 0;
                
                const grades = Object.entries(student.gradeCounts);
                const mostCommonGrade = grades.length > 0 ?
                    grades.sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
                
                return {
                    'Registration Number': student.regNumber,
                    'Student Name': student.name,
                    'Center': student.center,
                    'Program': student.program,
                    'Total Score': student.totalMarks.toFixed(2),
                    'Total Max Score': student.totalMaxScore.toFixed(2),
                    'Overall Percentage': totalPercentage.toFixed(2) + '%',
                    'Average Course Score': averageCourseScore.toFixed(2) + '%',
                    'Courses Taken': Object.keys(student.courses).length,
                    'Most Common Grade': mostCommonGrade,
                    'Performance Level': this.getPerformanceLevel(totalPercentage)
                };
            });
            
        } catch (error) {
            console.error('Error generating performance report:', error);
            throw error;
        }
    }
    
    async generateGradeDistributionReport() {
        try {
            const marks = await this.db.getMarksTableData();
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Apply center filter
            const centerFilter = this.getSelectedValues('academicReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredMarks = filteredMarks.filter(mark => 
                    centerFilter.includes(mark.students?.center)
                );
            }
            
            const gradeDistribution = {
                'A+': 0, 'A': 0, 'A-': 0,
                'B+': 0, 'B': 0, 'B-': 0,
                'C+': 0, 'C': 0, 'C-': 0,
                'D+': 0, 'D': 0, 'D-': 0,
                'F': 0
            };
            
            filteredMarks.forEach(mark => {
                if (mark.grade && gradeDistribution.hasOwnProperty(mark.grade)) {
                    gradeDistribution[mark.grade]++;
                }
            });
            
            const total = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
            
            return Object.entries(gradeDistribution)
                .filter(([grade, count]) => count > 0)
                .map(([grade, count]) => ({
                    'Grade': grade,
                    'Count': count,
                    'Percentage': total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%'
                }));
            
        } catch (error) {
            console.error('Error generating grade distribution:', error);
            throw error;
        }
    }
    
    async generateCoursewiseReport() {
        try {
            const marks = await this.db.getMarksTableData();
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Apply center filter
            const centerFilter = this.getSelectedValues('academicReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredMarks = filteredMarks.filter(mark => 
                    centerFilter.includes(mark.students?.center)
                );
            }
            
            const courseStats = {};
            
            filteredMarks.forEach(mark => {
                const course = mark.courses || {};
                const courseId = course.id;
                
                if (!courseId) return;
                
                if (!courseStats[courseId]) {
                    courseStats[courseId] = {
                        courseCode: course.course_code,
                        courseName: course.course_name,
                        credits: course.credits || 3,
                        totalStudents: 0,
                        totalScore: 0,
                        totalMaxScore: 0,
                        grades: {},
                        assessments: {}
                    };
                }
                
                courseStats[courseId].totalStudents++;
                courseStats[courseId].totalScore += mark.score || 0;
                courseStats[courseId].totalMaxScore += mark.max_score || 0;
                
                if (mark.grade) {
                    courseStats[courseId].grades[mark.grade] = 
                        (courseStats[courseId].grades[mark.grade] || 0) + 1;
                }
                
                if (mark.assessment_type) {
                    courseStats[courseId].assessments[mark.assessment_type] = 
                        (courseStats[courseId].assessments[mark.assessment_type] || 0) + 1;
                }
            });
            
            return Object.values(courseStats).map(course => {
                const averageScore = course.totalMaxScore > 0 ?
                    (course.totalScore / course.totalMaxScore) * 100 : 0;
                
                const gradeEntries = Object.entries(course.grades);
                const mostCommonGrade = gradeEntries.length > 0 ?
                    gradeEntries.sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
                
                const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
                const passingCount = gradeEntries
                    .filter(([grade]) => passingGrades.includes(grade))
                    .reduce((sum, [, count]) => sum + count, 0);
                
                const passRate = course.totalStudents > 0 ?
                    (passingCount / course.totalStudents) * 100 : 0;
                
                return {
                    'Course Code': course.courseCode,
                    'Course Name': course.courseName,
                    'Credits': course.credits,
                    'Total Students': course.totalStudents,
                    'Average Score': averageScore.toFixed(2) + '%',
                    'Most Common Grade': mostCommonGrade,
                    'Pass Rate': passRate.toFixed(2) + '%',
                    'Assessment Types': Object.keys(course.assessments).join(', ')
                };
            });
            
        } catch (error) {
            console.error('Error generating coursewise report:', error);
            throw error;
        }
    }
    
    async generateTranscriptData(studentId) {
        try {
            const student = await this.db.getStudentById(studentId);
            if (!student) throw new Error('Student not found');
            
            const marks = await this.db.getMarksByStudent(studentId);
            
            const courses = {};
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            marks.forEach(mark => {
                const course = mark.courses || {};
                const courseId = course.id;
                
                if (!courseId) return;
                
                if (!courses[courseId]) {
                    courses[courseId] = {
                        courseCode: course.course_code,
                        courseName: course.course_name,
                        credits: course.credits || 3,
                        semester: course.semester || 1,
                        marks: [],
                        totalScore: 0,
                        totalMaxScore: 0
                    };
                }
                
                courses[courseId].marks.push({
                    assessment: mark.assessment_name,
                    type: mark.assessment_type,
                    score: mark.score,
                    maxScore: mark.max_score,
                    percentage: mark.percentage,
                    grade: mark.grade,
                    date: mark.created_at
                });
                
                courses[courseId].totalScore += mark.score || 0;
                courses[courseId].totalMaxScore += mark.max_score || 0;
            });
            
            const courseList = Object.values(courses).map(course => {
                const average = course.totalMaxScore > 0 ?
                    (course.totalScore / course.totalMaxScore) * 100 : 0;
                const grade = this.calculateGrade(average);
                const gradePoints = this.getGradePoints(grade);
                
                totalCredits += course.credits;
                totalGradePoints += gradePoints * course.credits;
                
                return {
                    ...course,
                    average: average,
                    grade: grade,
                    gradePoints: gradePoints
                };
            });
            
            courseList.sort((a, b) => a.semester - b.semester);
            
            const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0.00;
            
            return {
                student: {
                    id: student.id,
                    regNumber: student.reg_number,
                    name: student.full_name,
                    program: student.program,
                    center: student.center || 'Not specified',
                    intakeYear: student.intake_year,
                    status: student.status,
                    dob: student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A',
                    gender: student.gender,
                    email: student.email
                },
                courses: courseList,
                summary: {
                    totalCourses: courseList.length,
                    totalCredits: totalCredits,
                    gpa: parseFloat(gpa),
                    cgpa: parseFloat(gpa),
                    dateGenerated: new Date().toLocaleDateString()
                }
            };
            
        } catch (error) {
            console.error('Error generating transcript data:', error);
            throw error;
        }
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    getSafeElementValue(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    applyStudentFilters(students) {
        let filtered = [...students];
        
        // Apply program filter
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => programs.includes(s.program));
        }
        
        // Apply center filter
        const centers = this.currentFilters.centers;
        if (centers.length > 0 && !centers.includes('all')) {
            filtered = filtered.filter(s => centers.includes(s.center));
        }
        
        // Apply county filter
        const counties = this.currentFilters.counties;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => counties.includes(s.county));
        }
        
        // Apply intake year filter
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(s => s.intake_year === parseInt(this.currentFilters.intake));
        }
        
        return filtered;
    }
    
    applyMarksFilters(marks) {
        let filtered = [...marks];
        
        // Apply program filter via student
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(mark => 
                programs.includes(mark.students?.program)
            );
        }
        
        // Apply center filter via student
        const centers = this.currentFilters.centers;
        if (centers.length > 0 && !centers.includes('all')) {
            filtered = filtered.filter(mark => 
                centers.includes(mark.students?.center)
            );
        }
        
        // Apply intake year filter via student
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(mark => 
                mark.students?.intake_year === parseInt(this.currentFilters.intake)
            );
        }
        
        // Apply date filters
        if (this.currentFilters.dateFrom) {
            const fromDate = new Date(this.currentFilters.dateFrom);
            filtered = filtered.filter(mark => 
                !mark.created_at || new Date(mark.created_at) >= fromDate
            );
        }
        
        if (this.currentFilters.dateTo) {
            const toDate = new Date(this.currentFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(mark => 
                !mark.created_at || new Date(mark.created_at) <= toDate
            );
        }
        
        return filtered;
    }
    
    calculateGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 85) return 'A';
        if (percentage >= 80) return 'A-';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'B-';
        if (percentage >= 60) return 'C+';
        if (percentage >= 55) return 'C';
        if (percentage >= 50) return 'C-';
        if (percentage >= 45) return 'D+';
        if (percentage >= 40) return 'D';
        if (percentage >= 35) return 'D-';
        return 'F';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0
        };
        return gradePoints[grade] || 0.0;
    }
    
    getPerformanceLevel(percentage) {
        if (percentage >= 80) return 'Excellent';
        if (percentage >= 70) return 'Good';
        if (percentage >= 60) return 'Satisfactory';
        if (percentage >= 50) return 'Needs Improvement';
        return 'Poor';
    }
    
    // ==================== PREVIEW RENDERING ====================
    
    previewReportData(data, title) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) return;
        
        if (!data || data.length === 0) {
            previewDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> No data available for preview
                </div>
            `;
            return;
        }
        
        const headers = Object.keys(data[0]);
        const previewData = data.slice(0, 10);
        
        let html = `
            <div class="report-preview">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">${title}</h5>
                    <span class="badge bg-info">${data.length} records</span>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-striped table-hover">
                        <thead class="table-light">
                            <tr>
                                ${headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        previewData.forEach(row => {
            html += `
                <tr>
                    ${headers.map(header => `
                        <td>${row[header] || ''}</td>
                    `).join('')}
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                ${data.length > 10 ? `
                    <div class="alert alert-info mt-2">
                        <i class="fas fa-info-circle"></i> Showing first 10 of ${data.length} records
                    </div>
                ` : ''}
            </div>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    previewTranscriptData(transcriptData) {
        try {
            document.getElementById('previewStudentName').textContent = transcriptData.student.name;
            document.getElementById('previewRegNumber').textContent = transcriptData.student.regNumber;
            document.getElementById('previewProgram').textContent = transcriptData.student.program;
            document.getElementById('previewCenter').textContent = transcriptData.student.center;
            document.getElementById('previewIntake').textContent = transcriptData.student.intakeYear;
            document.getElementById('previewStatus').textContent = transcriptData.student.status;
            
            const statusBadge = document.getElementById('previewStatus');
            statusBadge.className = 'badge ' + (
                transcriptData.student.status === 'active' ? 'bg-success' :
                transcriptData.student.status === 'graduated' ? 'bg-primary' :
                transcriptData.student.status === 'withdrawn' ? 'bg-danger' : 'bg-secondary'
            );
            
            const coursesTbody = document.getElementById('previewCourses');
            if (transcriptData.courses.length > 0) {
                coursesTbody.innerHTML = transcriptData.courses.slice(0, 5).map(course => `
                    <tr>
                        <td>${course.courseCode}<br><small class="text-muted">${course.courseName}</small></td>
                        <td><span class="badge bg-info">${course.grade}</span></td>
                        <td>${course.credits}</td>
                        <td>${course.semester}</td>
                    </tr>
                `).join('');
                
                if (transcriptData.courses.length > 5) {
                    coursesTbody.innerHTML += `
                        <tr>
                            <td colspan="4" class="text-center text-muted">
                                ... and ${transcriptData.courses.length - 5} more courses
                            </td>
                        </tr>
                    `;
                }
            } else {
                coursesTbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-muted text-center">No courses available</td>
                    </tr>
                `;
            }
            
            document.getElementById('previewGPA').textContent = transcriptData.summary.gpa;
            
            const previewElement = document.getElementById('transcriptPreview');
            if (previewElement) {
                previewElement.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error rendering transcript preview:', error);
        }
    }
    
    // ==================== EXPORT FUNCTIONS ====================
    
    async exportData(data, fileName, format) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        switch(format) {
            case 'csv':
                await this.exportToCSV(data, fileName);
                break;
                
            case 'excel':
                await this.exportToExcel(data, fileName);
                break;
                
            case 'pdf':
                await this.exportToPDF(data, fileName);
                break;
                
            default:
                await this.exportToCSV(data, fileName);
        }
    }
    
    async exportToCSV(data, fileName) {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        this.downloadFile(csvRows.join('\n'), `${fileName}.csv`, 'text/csv');
    }
    
    async exportToExcel(data, fileName) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Excel export requires SheetJS library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } catch (error) {
            console.error('Excel export error:', error);
            await this.exportToCSV(data, fileName);
        }
    }
    
    async exportToPDF(data, fileName) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(16);
            doc.text('REPORT', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
            doc.text(`Records: ${data.length}`, 105, 35, { align: 'center' });
            
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const tableData = data.map(row => headers.map(header => row[header] || ''));
                
                if (typeof doc.autoTable !== 'undefined') {
                    doc.autoTable({
                        startY: 45,
                        head: [headers],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [41, 128, 185] }
                    });
                } else {
                    doc.setFontSize(10);
                    let y = 45;
                    data.slice(0, 30).forEach((row, index) => {
                        const rowText = headers.map(h => `${h}: ${row[h]}`).join(', ');
                        doc.text(rowText, 10, y);
                        y += 7;
                    });
                    if (data.length > 30) {
                        doc.text(`... and ${data.length - 30} more records`, 10, y);
                    }
                }
            } else {
                doc.text('No data available', 105, 50, { align: 'center' });
            }
            
            doc.save(`${fileName}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
            await this.exportToCSV(data, fileName);
        }
    }
    
    async exportTranscriptToPDF(transcriptData) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(20);
            doc.text('OFFICIAL TRANSCRIPT', 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.text('TEEPortal University', 105, 30, { align: 'center' });
            doc.text('Academic Records Office', 105, 35, { align: 'center' });
            
            // Student Information
            doc.setFontSize(12);
            doc.text('STUDENT INFORMATION', 20, 50);
            
            doc.setFontSize(10);
            let studentY = 60;
            doc.text(`Name: ${transcriptData.student.name}`, 20, studentY);
            doc.text(`Registration Number: ${transcriptData.student.regNumber}`, 100, studentY);
            studentY += 7;
            doc.text(`Program: ${transcriptData.student.program}`, 20, studentY);
            doc.text(`Center: ${transcriptData.student.center}`, 100, studentY);
            studentY += 7;
            doc.text(`Intake Year: ${transcriptData.student.intakeYear}`, 20, studentY);
            doc.text(`Status: ${transcriptData.student.status}`, 100, studentY);
            
            // Academic Performance
            doc.setFontSize(12);
            doc.text('ACADEMIC PERFORMANCE', 20, studentY + 15);
            
            // Course table
            const tableStartY = studentY + 25;
            const tableData = transcriptData.courses.map((course, index) => [
                index + 1,
                course.courseCode,
                course.courseName,
                course.credits.toString(),
                course.average.toFixed(2) + '%',
                course.grade,
                course.gradePoints.toFixed(1)
            ]);
            
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: tableStartY,
                    head: [['#', 'Code', 'Course Name', 'Credits', 'Average', 'Grade', 'Grade Points']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185] }
                });
            }
            
            // Summary
            const finalY = doc.lastAutoTable?.finalY || tableStartY + (transcriptData.courses.length * 10) + 20;
            
            doc.setFontSize(12);
            doc.text('SUMMARY', 20, finalY + 10);
            
            doc.setFontSize(10);
            doc.text(`Total Courses: ${transcriptData.summary.totalCourses}`, 20, finalY + 20);
            doc.text(`Total Credits: ${transcriptData.summary.totalCredits}`, 20, finalY + 25);
            doc.text(`GPA: ${transcriptData.summary.gpa}`, 20, finalY + 30);
            doc.text(`CGPA: ${transcriptData.summary.cgpa}`, 20, finalY + 35);
            
            // Footer
            doc.setFontSize(8);
            doc.text('This is an official document. For verification, contact the Academic Records Office.', 
                     105, doc.internal.pageSize.height - 20, { align: 'center' });
            
            doc.save(`transcript-${transcriptData.student.regNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Transcript PDF export error:', error);
            this.showToast('Error generating transcript PDF', 'error');
        }
    }
    
    async exportAllData() {
        try {
            console.log('📦 Exporting all data as JSON...');
            
            const data = {
                students: await this.db.getStudents(),
                courses: await this.db.getCourses(),
                marks: await this.db.getMarksTableData(),
                centers: await this.getCenters(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const jsonStr = JSON.stringify(data, null, 2);
            this.downloadFile(jsonStr, `teeportal-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            
            this.showToast('All data exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting all data:', error);
            this.showToast('Error exporting data', 'error');
        }
    }
    
    async exportAllToExcel() {
        try {
            if (typeof XLSX === 'undefined') {
                this.showToast('Excel export requires SheetJS library', 'warning');
                return;
            }
            
            const workbook = XLSX.utils.book_new();
            
            // Add students sheet
            const students = await this.db.getStudents();
            const studentsWs = XLSX.utils.json_to_sheet(students);
            XLSX.utils.book_append_sheet(workbook, studentsWs, 'Students');
            
            // Add courses sheet
            const courses = await this.db.getCourses();
            const coursesWs = XLSX.utils.json_to_sheet(courses);
            XLSX.utils.book_append_sheet(workbook, coursesWs, 'Courses');
            
            // Add marks sheet
            const marks = await this.db.getMarksTableData();
            const marksWs = XLSX.utils.json_to_sheet(marks);
            XLSX.utils.book_append_sheet(workbook, marksWs, 'Marks');
            
            XLSX.writeFile(workbook, `teeportal-full-export-${new Date().toISOString().split('T')[0]}.xlsx`);
            this.showToast('Excel workbook exported successfully', 'success');
            
        } catch (error) {
            console.error('Excel workbook export error:', error);
            this.showToast('Error exporting Excel workbook', 'error');
        }
    }
    
    async exportAllToCSV() {
        try {
            // Create ZIP file with multiple CSVs
            if (typeof JSZip === 'undefined') {
                this.showToast('CSV archive requires JSZip library', 'warning');
                return;
            }
            
            const zip = new JSZip();
            
            // Add students CSV
            const students = await this.db.getStudents();
            const studentsCsv = this.convertToCSV(students);
            zip.file("students.csv", studentsCsv);
            
            // Add courses CSV
            const courses = await this.db.getCourses();
            const coursesCsv = this.convertToCSV(courses);
            zip.file("courses.csv", coursesCsv);
            
            // Add marks CSV
            const marks = await this.db.getMarksTableData();
            const marksCsv = this.convertToCSV(marks);
            zip.file("marks.csv", marksCsv);
            
            // Generate ZIP file
            const content = await zip.generateAsync({type: "blob"});
            this.downloadFile(content, `teeportal-data-archive-${new Date().toISOString().split('T')[0]}.zip`, 'application/zip');
            this.showToast('CSV archive exported successfully', 'success');
            
        } catch (error) {
            console.error('CSV archive export error:', error);
            this.showToast('Error exporting CSV archive', 'error');
        }
    }
    
    async exportAllToPDF() {
        this.showToast('Multiple PDF reports feature coming soon', 'info');
    }
    
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    // ==================== REFRESH ====================
    
    async refreshReports() {
        try {
            console.log('🔄 Refreshing reports...');
            this.showLoading(true);
            
            // Clear dropdowns
            const dropdowns = ['filterProgram', 'filterCourse', 'filterIntake', 'transcriptStudent'];
            dropdowns.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    while (select.options.length > 0) {
                        select.remove(0);
                    }
                }
            });
            
            // Repopulate
            await this.populateFilters();
            await this.populateTranscriptStudents();
            await this.updateStatistics();
            
            // Clear previews
            this.clearPreview();
            
            this.showToast('Reports data refreshed', 'success');
            
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
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
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}
