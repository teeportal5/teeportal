// modules/reports.js - Fixed version
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
                
                const students = await this.getStudents();
                const programs = [...new Set(students.map(s => s.program).filter(Boolean))];
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
                
                const students = await this.getStudents();
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
            const students = await this.getStudents();
            
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
    
    // ==================== DATABASE METHODS ====================
    
    async getStudents() {
        try {
            // Try to use the database method
            if (this.db && typeof this.db.getStudents === 'function') {
                return await this.db.getStudents();
            } else if (window.app && window.app.db && typeof window.app.db.getStudents === 'function') {
                return await window.app.db.getStudents();
            } else {
                console.warn('getStudents method not found, returning empty array');
                return [];
            }
        } catch (error) {
            console.error('Error getting students:', error);
            return [];
        }
    }
    
    async getStudentById(studentId) {
        try {
            const students = await this.getStudents();
            return students.find(student => student.id == studentId) || null;
        } catch (error) {
            console.error('Error getting student by ID:', error);
            return null;
        }
    }
    
    async getCourses() {
        try {
            if (this.db && typeof this.db.getCourses === 'function') {
                return await this.db.getCourses();
            } else if (window.app && window.app.db && typeof window.app.db.getCourses === 'function') {
                return await window.app.db.getCourses();
            } else {
                console.warn('getCourses method not found, returning empty array');
                return [];
            }
        } catch (error) {
            console.error('Error getting courses:', error);
            return [];
        }
    }
    
    async getMarks() {
        try {
            if (this.db && typeof this.db.getMarks === 'function') {
                return await this.db.getMarks();
            } else if (window.app && window.app.db && typeof window.app.db.getMarks === 'function') {
                return await window.app.db.getMarks();
            } else if (this.db && typeof this.db.getMarksTableData === 'function') {
                return await this.db.getMarksTableData();
            } else {
                console.warn('getMarks method not found, returning empty array');
                return [];
            }
        } catch (error) {
            console.error('Error getting marks:', error);
            return [];
        }
    }
    
    async getMarksByStudent(studentId) {
        try {
            const allMarks = await this.getMarks();
            return allMarks.filter(mark => mark.student_id == studentId || mark.students?.id == studentId);
        } catch (error) {
            console.error('Error getting marks by student:', error);
            return [];
        }
    }
    
    async getCenters() {
        try {
            const students = await this.getStudents();
            const centers = [...new Set(students.map(s => s.center).filter(Boolean))];
            
            if (centers.length > 0) {
                return centers.map(center => ({
                    id: center.toLowerCase().replace(/\s+/g, '_'),
                    name: center,
                    county: 'Unknown'
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
            const students = await this.getStudents();
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
    
    async getPrograms() {
        try {
            const students = await this.getStudents();
            return [...new Set(students.map(s => s.program).filter(Boolean))];
        } catch (error) {
            console.error('Error getting programs:', error);
            return [];
        }
    }
    
    // ==================== HELPER METHODS ====================
    
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
            const students = await this.getStudents();
            
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
    
    // ==================== TRANSCRIPT METHODS (FIXED) ====================
    
    async generateTranscriptData(studentId) {
        try {
            console.log('Getting student data for ID:', studentId);
            const student = await this.getStudentById(studentId);
            
            if (!student) {
                throw new Error('Student not found');
            }
            
            console.log('Student found:', student);
            
            const marks = await this.getMarksByStudent(studentId);
            console.log('Student marks:', marks.length);
            
            const courses = {};
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            marks.forEach(mark => {
                const course = mark.courses || mark.course || {};
                const courseId = course.id || mark.course_id;
                
                if (!courseId) return;
                
                if (!courses[courseId]) {
                    courses[courseId] = {
                        courseCode: course.course_code || course.code || 'N/A',
                        courseName: course.course_name || course.name || 'Unknown Course',
                        credits: course.credits || 3,
                        semester: course.semester || 1,
                        marks: [],
                        totalScore: 0,
                        totalMaxScore: 0
                    };
                }
                
                courses[courseId].marks.push({
                    assessment: mark.assessment_name || mark.assessment || 'Assessment',
                    type: mark.assessment_type || 'Exam',
                    score: mark.score || 0,
                    maxScore: mark.max_score || 100,
                    percentage: mark.percentage || 0,
                    grade: mark.grade || 'N/A',
                    date: mark.created_at || new Date().toISOString()
                });
                
                courses[courseId].totalScore += mark.score || 0;
                courses[courseId].totalMaxScore += mark.max_score || 100;
            });
            
            console.log('Processed courses:', Object.keys(courses).length);
            
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
    
    async previewTranscript() {
        try {
            const studentId = this.getSafeElementValue('transcriptStudent');
            
            if (!studentId) {
                this.showToast('Please select a student', 'warning');
                return;
            }
            
            console.log('Previewing transcript for student ID:', studentId);
            
            const data = await this.generateTranscriptData(studentId);
            this.previewTranscriptData(data);
            
            this.showToast('Transcript preview loaded', 'success');
            
        } catch (error) {
            console.error('Error previewing transcript:', error);
            this.showToast('Error previewing transcript. Please check student data.', 'error');
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
    
    async loadSampleTranscript() {
        try {
            const students = await this.getStudents();
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
    
    // ==================== REPORT GENERATION ====================
    
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
            const students = await this.getStudents();
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
            const students = await this.getStudents();
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
            }).filter(data => data.Students > 0);
            
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
            const students = await this.getStudents();
            const courses = await this.getCourses();
            const marks = await this.getMarks();
            
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
    
    getSafeElementValue(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    // ==================== STATISTICS ====================
    
    async updateStatistics() {
        try {
            const students = await this.getStudents();
            const filteredStudents = this.applyStudentFilters(students);
            
            const totalStudents = filteredStudents.length;
            const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
            const graduatedStudents = filteredStudents.filter(s => s.status === 'graduated').length;
            
            const graduationRate = totalStudents > 0 ? 
                Math.round((graduatedStudents / totalStudents) * 100) : 0;
            
            const centers = await this.getCenters();
            const activeCenters = centers.length;
            
            // Calculate average GPA (placeholder)
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
    
    // ==================== REPORT GENERATION FUNCTIONS ====================
    
    async generateStudentListReport() {
        try {
            const students = await this.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
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
    
    applyStudentFilters(students) {
        let filtered = [...students];
        
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => programs.includes(s.program));
        }
        
        const centers = this.currentFilters.centers;
        if (centers.length > 0 && !centers.includes('all')) {
            filtered = filtered.filter(s => centers.includes(s.center));
        }
        
        const counties = this.currentFilters.counties;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => counties.includes(s.county));
        }
        
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(s => s.intake_year === parseInt(this.currentFilters.intake));
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
    
    // ==================== REST OF THE METHODS (keep as before) ====================
    // Note: I've included the essential methods. The rest of the methods from the previous code
    // should be kept as they are, just ensure they use the fixed database methods above.
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
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
    
    // ==================== PREVIEW FUNCTIONS ====================
    
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
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}
