// modules/reports.js - Reports module
class ReportsManager {
    constructor(db) {
        this.db = db;
        this.currentFilters = {
            year: 'all',
            program: 'all',
            course: 'all',
            semester: 'all',
            status: 'all',
            intake: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.charts = {};
    }
    
   // ==================== MISSING METHODS FOR HTML BUTTONS ====================

studentReport() {
    console.log('📊 Generating student report...');
    try {
        this.showToast('Generating student report...', 'info');
        // Call the existing quickStudentReport function
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
        // Call the existing quickAcademicReport function
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
        this.showToast('Centre report feature coming soon', 'info');
        // This would generate a report focused on centres
        // For now, create a simple placeholder report
        return this.generateCentreReportData();
    } catch (error) {
        console.error('Error in generateCentreReport:', error);
        this.showToast('Error generating centre report', 'error');
        throw error;
    }
}

generateCentreReportData() {
    // Placeholder function - would generate centre-specific report
    this.showToast('Centre report feature is in development', 'warning');
    return Promise.resolve([]);
}

geographicalReport() {
    console.log('🗺️ Generating geographical report...');
    try {
        this.showToast('Geographical report feature coming soon', 'info');
        // This would generate a geographical distribution report
        // For now, create a simple placeholder report
        return this.generateGeographicalReportData();
    } catch (error) {
        console.error('Error in geographicalReport:', error);
        this.showToast('Error generating geographical report', 'error');
        throw error;
    }
}

generateGeographicalReportData() {
    // Placeholder function - would generate geographical report
    this.showToast('Geographical report feature is in development', 'warning');
    return Promise.resolve([]);
}

generateSummaryReport() {
    console.log('📋 Generating summary report...');
    try {
        this.showToast('Generating summary report...', 'info');
        // This would generate a comprehensive summary report
        // For now, use the existing performance report
        return this.quickAcademicReport();
    } catch (error) {
        console.error('Error in generateSummaryReport:', error);
        this.showToast('Error generating summary report', 'error');
        throw error;
    }
}

// ==================== INITIALIZATION METHOD ====================

async initialize() {
    if (this.initialized) return;
    
    try {
        console.log('📊 Initializing Reports Manager...');
        
        // Initialize UI components
        await this.initializeReportsUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial statistics
        await this.updateStatistics();
        
        this.initialized = true;
        console.log('✅ Reports Manager initialized');
        
        // Show success message
        this.showToast('Reports module ready', 'success');
        
    } catch (error) {
        console.error('❌ Error initializing reports:', error);
        this.showToast('Reports module failed to initialize', 'error');
    }
}
    
    async populateFilters() {
        try {
            // Populate Year filter
            const yearSelect = document.getElementById('filterYear');
            if (yearSelect) {
                const currentYear = new Date().getFullYear();
                for (let year = currentYear; year >= currentYear - 10; year--) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = `${year}-${year + 1}`;
                    yearSelect.appendChild(option);
                }
            }
            
            // Populate Program filter
            const programSelect = document.getElementById('filterProgram');
            if (programSelect) {
                const programs = await this.db.getPrograms();
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programSelect.appendChild(option);
                });
            }
            
            // Populate Course filter
            const courseSelect = document.getElementById('filterCourse');
            if (courseSelect) {
                const courses = await this.db.getCourses();
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_code} - ${course.course_name}`;
                    courseSelect.appendChild(option);
                });
            }
            
            // Populate Intake filter
            const intakeSelect = document.getElementById('filterIntake');
            if (intakeSelect) {
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
            
            // Populate Transcript Student selector
            const transcriptStudent = document.getElementById('transcriptStudent');
            if (transcriptStudent) {
                const students = await this.db.getStudents();
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.reg_number} - ${student.full_name}`;
                    transcriptStudent.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error populating filters:', error);
        }
    }
    
    async populateReportSelectors() {
        // Populate Student Report Type options
        const studentReportType = document.getElementById('studentReportType');
        if (studentReportType) {
            // Already has options in HTML
        }
        
        // Populate Academic Report Type options
        const academicReportType = document.getElementById('academicReportType');
        if (academicReportType) {
            // Already has options in HTML
        }
    }
    
    setDefaultDates() {
        const dateFrom = document.getElementById('filterDateFrom');
        const dateTo = document.getElementById('filterDateTo');
        
        if (dateFrom) {
            // Set to 1 year ago
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            dateFrom.valueAsDate = oneYearAgo;
        }
        
        if (dateTo) {
            // Set to today
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
        
        // Update Statistics button
        const updateStatsBtn = document.querySelector('[onclick="app.reports.updateStatistics()"]');
        if (updateStatsBtn) {
            updateStatsBtn.onclick = () => this.updateStatistics();
        }
        
        // Clear Preview button
        const clearPreviewBtn = document.querySelector('[onclick="app.reports.clearPreview()"]');
        if (clearPreviewBtn) {
            clearPreviewBtn.onclick = () => this.clearPreview();
        }
        
        // Load Sample Transcript button
        const sampleTranscriptBtn = document.querySelector('[onclick="app.reports.loadSampleTranscript()"]');
        if (sampleTranscriptBtn) {
            sampleTranscriptBtn.onclick = () => this.loadSampleTranscript();
        }
        
        // Report buttons
        const studentReportBtn = document.querySelector('[onclick="app.reports.quickStudentReport()"]');
        if (studentReportBtn) studentReportBtn.onclick = () => this.quickStudentReport();
        
        const academicReportBtn = document.querySelector('[onclick="app.reports.quickAcademicReport()"]');
        if (academicReportBtn) academicReportBtn.onclick = () => this.quickAcademicReport();
        
        const transcriptBtn = document.querySelector('[onclick="app.reports.generateTranscript()"]');
        if (transcriptBtn) transcriptBtn.onclick = () => this.generateTranscript();
        
        const bulkExportBtn = document.querySelector('[onclick="app.reports.bulkExport()"]');
        if (bulkExportBtn) bulkExportBtn.onclick = () => this.bulkExport();
        
        const previewStudentBtn = document.querySelector('[onclick="app.reports.previewStudentReport()"]');
        if (previewStudentBtn) previewStudentBtn.onclick = () => this.previewStudentReport();
        
        const previewAcademicBtn = document.querySelector('[onclick="app.reports.previewAcademicReport()"]');
        if (previewAcademicBtn) previewAcademicBtn.onclick = () => this.previewAcademicReport();
        
        const previewTranscriptBtn = document.querySelector('[onclick="app.reports.previewTranscript()"]');
        if (previewTranscriptBtn) previewTranscriptBtn.onclick = () => this.previewTranscript();
    }
    
    // ==================== FILTER FUNCTIONS ====================
    
    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            
            // Get filter values
            this.currentFilters = {
                year: this.getSafeElementValue('filterYear', 'all'),
                program: this.getSafeElementValue('filterProgram', 'all'),
                course: this.getSafeElementValue('filterCourse', 'all'),
                semester: this.getSafeElementValue('filterSemester', 'all'),
                status: this.getSafeElementValue('filterStatus', 'all'),
                intake: this.getSafeElementValue('filterIntake', 'all'),
                dateFrom: document.getElementById('filterDateFrom')?.value || null,
                dateTo: document.getElementById('filterDateTo')?.value || null
            };
            
            console.log('Current filters:', this.currentFilters);
            
            // Update statistics with filters
            await this.updateStatistics();
            
            this.showToast('Filters applied successfully', 'success');
            
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showToast('Error applying filters', 'error');
        }
    }
    
    clearFilters() {
        try {
            // Reset all filters to "all"
            document.getElementById('filterYear').value = 'all';
            document.getElementById('filterProgram').value = 'all';
            document.getElementById('filterCourse').value = 'all';
            document.getElementById('filterSemester').value = 'all';
            document.getElementById('filterStatus').value = 'all';
            document.getElementById('filterIntake').value = 'all';
            
            // Reset dates
            this.setDefaultDates();
            
            // Clear current filters
            this.currentFilters = {
                year: 'all',
                program: 'all',
                course: 'all',
                semester: 'all',
                status: 'all',
                intake: 'all',
                dateFrom: null,
                dateTo: null
            };
            
            // Update statistics
            this.updateStatistics();
            
            this.showToast('Filters cleared', 'info');
            
        } catch (error) {
            console.error('Error clearing filters:', error);
            this.showToast('Error clearing filters', 'error');
        }
    }
    
    // ==================== REPORT GENERATION ====================
    
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
            
            // Export based on format
            await this.exportData(data, fileName, format);
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            await this.db.logActivity('report_generated', `Generated ${reportType} student report`);
            
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
            
            // Export based on format
            await this.exportData(data, fileName, format);
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            await this.db.logActivity('report_generated', `Generated ${reportType} academic report`);
            
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
            await this.db.logActivity('transcript_generated', `Generated transcript for ${data.student.regNumber}`);
            
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
            // Get first student as sample
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
            
            // Apply filters
            let filteredStudents = this.applyStudentFilters(students);
            
            return filteredStudents.map(student => ({
                'Registration Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email,
                'Phone': student.phone,
                'Program': student.program,
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
            
            // Apply filters
            let filteredStudents = this.applyStudentFilters(students);
            
            const enrollmentStats = {};
            
            filteredStudents.forEach(student => {
                const key = `${student.program}-${student.intake_year}`;
                if (!enrollmentStats[key]) {
                    enrollmentStats[key] = {
                        program: student.program,
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
            
            // Apply filters
            let filteredStudents = this.applyStudentFilters(students);
            
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated');
            
            const graduationByProgram = {};
            const graduationByYear = {};
            
            graduatedStudents.forEach(student => {
                if (!graduationByProgram[student.program]) {
                    graduationByProgram[student.program] = 0;
                }
                graduationByProgram[student.program]++;
                
                const settings = this.db.getDefaultSettings();
                const programDuration = settings.programs[student.program]?.duration || '2 years';
                const durationYears = parseInt(programDuration);
                const graduationYear = student.intake_year + durationYears;
                
                if (!graduationByYear[graduationYear]) {
                    graduationByYear[graduationYear] = 0;
                }
                graduationByYear[graduationYear]++;
            });
            
            const programReport = Object.entries(graduationByProgram).map(([program, count]) => ({
                'Program': program,
                'Graduates': count
            }));
            
            const yearReport = Object.entries(graduationByYear).map(([year, count]) => ({
                'Year': year,
                'Graduates': count
            }));
            
            // Return as single array for preview
            return [
                ...programReport,
                ...yearReport,
                {
                    'Metric': 'Total Graduates',
                    'Value': graduatedStudents.length
                },
                {
                    'Metric': 'Graduation Rate',
                    'Value': filteredStudents.length > 0 ? 
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
            
            // Apply filters
            let filteredStudents = this.applyStudentFilters(students);
            
            const demographics = {
                byGender: {},
                byProgram: {},
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
                demographics.byGender[student.gender] = (demographics.byGender[student.gender] || 0) + 1;
                
                // Program
                demographics.byProgram[student.program] = (demographics.byProgram[student.program] || 0) + 1;
                
                // Status
                demographics.byStatus[student.status] = (demographics.byStatus[student.status] || 0) + 1;
                
                // Intake Year
                demographics.byIntakeYear[student.intake_year] = (demographics.byIntakeYear[student.intake_year] || 0) + 1;
                
                // Age Group (if DOB is available)
                if (student.dob) {
                    const dob = new Date(student.dob);
                    const age = new Date().getFullYear() - dob.getFullYear();
                    
                    if (age < 18) demographics.ageGroups['Under 18']++;
                    else if (age <= 22) demographics.ageGroups['18-22']++;
                    else if (age <= 25) demographics.ageGroups['23-25']++;
                    else if (age <= 30) demographics.ageGroups['26-30']++;
                    else demographics.ageGroups['Over 30']++;
                }
            });
            
            // Convert to array format for export
            const result = [];
            
            // Gender breakdown
            Object.entries(demographics.byGender).forEach(([gender, count]) => {
                result.push({
                    'Category': 'Gender',
                    'Subcategory': gender,
                    'Count': count,
                    'Percentage': Math.round((count / filteredStudents.length) * 100) + '%'
                });
            });
            
            // Program breakdown
            Object.entries(demographics.byProgram).forEach(([program, count]) => {
                result.push({
                    'Category': 'Program',
                    'Subcategory': program,
                    'Count': count,
                    'Percentage': Math.round((count / filteredStudents.length) * 100) + '%'
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
            
            // Apply filters
            let filteredMarks = this.applyMarksFilters(marks);
            
            return filteredMarks.map(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                
                return {
                    'Registration Number': student.reg_number,
                    'Student Name': student.full_name,
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
            
            // Apply filters
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Group by student
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
                        totalMarks: 0,
                        totalMaxScore: 0,
                        courses: {},
                        gradeCounts: {}
                    };
                }
                
                // Add to totals
                studentPerformance[studentId].totalMarks += mark.score || 0;
                studentPerformance[studentId].totalMaxScore += mark.max_score || 0;
                
                // Track courses
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
                
                // Track grades
                const grade = mark.grade;
                if (grade) {
                    studentPerformance[studentId].gradeCounts[grade] = 
                        (studentPerformance[studentId].gradeCounts[grade] || 0) + 1;
                }
            });
            
            // Convert to array
            return Object.values(studentPerformance).map(student => {
                const totalPercentage = student.totalMaxScore > 0 ? 
                    (student.totalMarks / student.totalMaxScore) * 100 : 0;
                
                // Calculate average per course
                const courseAverages = Object.values(student.courses).map(course => 
                    course.totalMax > 0 ? (course.totalScore / course.totalMax) * 100 : 0
                );
                
                const averageCourseScore = courseAverages.length > 0 ?
                    courseAverages.reduce((a, b) => a + b, 0) / courseAverages.length : 0;
                
                // Get most common grade
                const grades = Object.entries(student.gradeCounts);
                const mostCommonGrade = grades.length > 0 ?
                    grades.sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
                
                return {
                    'Registration Number': student.regNumber,
                    'Student Name': student.name,
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
            
            // Apply filters
            let filteredMarks = this.applyMarksFilters(marks);
            
            const gradeDistribution = {
                'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
                'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
                'C+': 0, 'C-': 0, 'D+': 0, 'D-': 0
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
            
            // Apply filters
            let filteredMarks = this.applyMarksFilters(marks);
            
            // Group by course
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
                
                // Track grades
                if (mark.grade) {
                    courseStats[courseId].grades[mark.grade] = 
                        (courseStats[courseId].grades[mark.grade] || 0) + 1;
                }
                
                // Track assessment types
                if (mark.assessment_type) {
                    courseStats[courseId].assessments[mark.assessment_type] = 
                        (courseStats[courseId].assessments[mark.assessment_type] || 0) + 1;
                }
            });
            
            // Convert to array
            return Object.values(courseStats).map(course => {
                const averageScore = course.totalMaxScore > 0 ?
                    (course.totalScore / course.totalMaxScore) * 100 : 0;
                
                // Find most common grade
                const gradeEntries = Object.entries(course.grades);
                const mostCommonGrade = gradeEntries.length > 0 ?
                    gradeEntries.sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
                
                // Calculate pass rate (assuming D and above is pass)
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
            
            // Group marks by course
            const courses = {};
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            marks.forEach(mark => {
                const course = mark.courses || {};
                const courseId = course.id;
                
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
            
            // Calculate course averages and GPA
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
            
            // Sort courses by semester
            courseList.sort((a, b) => a.semester - b.semester);
            
            const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0.00;
            
            return {
                student: {
                    id: student.id,
                    regNumber: student.reg_number,
                    name: student.full_name,
                    program: student.program,
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
        if (this.currentFilters.program !== 'all') {
            filtered = filtered.filter(s => s.program === this.currentFilters.program);
        }
        
        // Apply intake year filter
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(s => s.intake_year === parseInt(this.currentFilters.intake));
        }
        
        // Apply status filter
        if (this.currentFilters.status !== 'all') {
            filtered = filtered.filter(s => s.status === this.currentFilters.status);
        }
        
        return filtered;
    }
    
    applyMarksFilters(marks) {
        let filtered = [...marks];
        
        // Apply program filter via student
        if (this.currentFilters.program !== 'all') {
            filtered = filtered.filter(mark => 
                mark.students?.program === this.currentFilters.program
            );
        }
        
        // Apply course filter
        if (this.currentFilters.course !== 'all') {
            filtered = filtered.filter(mark => 
                mark.course_id === this.currentFilters.course
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
            toDate.setHours(23, 59, 59, 999); // End of day
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
            <h5>${title} (${data.length} records)</h5>
            <div class="table-responsive">
                <table class="table table-sm table-striped">
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
            <div class="alert alert-info mt-2">
                <i class="fas fa-info-circle"></i> Showing first 10 of ${data.length} records
            </div>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    previewTranscriptData(transcriptData) {
        try {
            // Update preview elements
            document.getElementById('previewStudentName').textContent = transcriptData.student.name;
            document.getElementById('previewRegNumber').textContent = transcriptData.student.regNumber;
            document.getElementById('previewProgram').textContent = transcriptData.student.program;
            document.getElementById('previewIntake').textContent = transcriptData.student.intakeYear;
            document.getElementById('previewStatus').textContent = transcriptData.student.status;
            
            // Update status badge color
            const statusBadge = document.getElementById('previewStatus');
            statusBadge.className = 'badge ' + (
                transcriptData.student.status === 'active' ? 'bg-success' :
                transcriptData.student.status === 'graduated' ? 'bg-primary' :
                transcriptData.student.status === 'withdrawn' ? 'bg-danger' : 'bg-secondary'
            );
            
            // Update courses table
            const coursesTbody = document.getElementById('previewCourses');
            if (transcriptData.courses.length > 0) {
                coursesTbody.innerHTML = transcriptData.courses.slice(0, 5).map(course => `
                    <tr>
                        <td>${course.courseCode}<br><small class="text-muted">${course.courseName}</small></td>
                        <td><span class="badge bg-info">${course.grade}</span></td>
                        <td>${course.credits}</td>
                    </tr>
                `).join('');
                
                if (transcriptData.courses.length > 5) {
                    coursesTbody.innerHTML += `
                        <tr>
                            <td colspan="3" class="text-center text-muted">
                                ... and ${transcriptData.courses.length - 5} more courses
                            </td>
                        </tr>
                    `;
                }
            } else {
                coursesTbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-muted text-center">No courses available</td>
                    </tr>
                `;
            }
            
            // Update summary
            document.getElementById('previewGPA').textContent = transcriptData.summary.gpa;
            document.getElementById('previewCredits').textContent = transcriptData.summary.totalCredits;
            
            // Calculate completion percentage (simplified)
            const completionRate = transcriptData.courses.length > 8 ? '100%' : 
                Math.round((transcriptData.courses.length / 8) * 100) + '%';
            document.getElementById('previewCompletion').textContent = completionRate;
            
            // Update transcript status
            document.getElementById('transcriptStatus').textContent = 'Ready';
            
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
            doc.text(`Intake Year: ${transcriptData.student.intakeYear}`, 100, studentY);
            studentY += 7;
            doc.text(`Status: ${transcriptData.student.status}`, 20, studentY);
            doc.text(`Date Generated: ${transcriptData.summary.dateGenerated}`, 100, studentY);
            
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
            
            // Save
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
                settings: this.db.getDefaultSettings(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const jsonStr = JSON.stringify(data, null, 2);
            this.downloadFile(jsonStr, `teeportal-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            
            this.showToast('All data exported successfully', 'success');
            await this.db.logActivity('data_exported', 'Exported all data as JSON backup');
            
        } catch (error) {
            console.error('Error exporting all data:', error);
            this.showToast('Error exporting data', 'error');
        }
    }
    
    async exportAllToExcel() {
        // Similar to exportAllData but create Excel workbook with multiple sheets
        this.showToast('Excel workbook export coming soon', 'info');
    }
    
    async exportAllToCSV() {
        // Export each dataset as separate CSV and zip them
        this.showToast('CSV archive export coming soon', 'info');
    }
    
    async exportAllToPDF() {
        // Generate multiple PDF reports
        this.showToast('PDF reports export coming soon', 'info');
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
    
    // ==================== STATISTICS ====================
    
    async updateStatistics() {
        try {
            const students = await this.db.getStudents();
            const courses = await this.db.getCourses();
            const marks = await this.db.getMarksTableData();
            
            // Apply filters
            const filteredStudents = this.applyStudentFilters(students);
            const filteredMarks = this.applyMarksFilters(marks);
            
            // Calculate statistics
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            const totalCourses = courses.length;
            const marksEntries = filteredMarks.length;
            
            // Calculate graduation rate
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            // Calculate average GPA (simplified)
            let totalGPA = 0;
            let studentCount = 0;
            
            // Group marks by student and calculate GPA
            const studentMarks = {};
            filteredMarks.forEach(mark => {
                const studentId = mark.student_id;
                if (!studentId) return;
                
                if (!studentMarks[studentId]) {
                    studentMarks[studentId] = {
                        totalGradePoints: 0,
                        totalCredits: 0
                    };
                }
                
                // Simplified GPA calculation
                const gradePoints = this.getGradePoints(mark.grade);
                const credits = mark.courses?.credits || 3;
                
                studentMarks[studentId].totalGradePoints += gradePoints * credits;
                studentMarks[studentId].totalCredits += credits;
            });
            
            // Calculate average of all student GPAs
            Object.values(studentMarks).forEach(student => {
                if (student.totalCredits > 0) {
                    totalGPA += student.totalGradePoints / student.totalCredits;
                    studentCount++;
                }
            });
            
            const averageGPA = studentCount > 0 ? (totalGPA / studentCount).toFixed(2) : 0.00;
            
            // Update UI
            document.getElementById('statTotalStudents').textContent = totalStudents;
            document.getElementById('statActiveStudents').textContent = activeStudents;
            document.getElementById('statTotalCourses').textContent = totalCourses;
            document.getElementById('statMarksEntries').textContent = marksEntries;
            document.getElementById('statGraduationRate').textContent = graduationRate + '%';
            document.getElementById('statAverageGPA').textContent = averageGPA;
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
    
    // ==================== REFRESH ====================
    
    async refreshReports() {
        try {
            console.log('🔄 Refreshing reports...');
            
            // Clear dropdowns
            const dropdowns = ['filterProgram', 'filterCourse', 'filterIntake', 'transcriptStudent'];
            dropdowns.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    // Keep first option
                    while (select.options.length > 1) {
                        select.remove(1);
                    }
                }
            });
            
            // Repopulate
            await this.populateFilters();
            await this.updateStatistics();
            
            // Clear previews
            this.clearPreview();
            
            this.showToast('Reports data refreshed', 'success');
            
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports', 'error');
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
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
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
