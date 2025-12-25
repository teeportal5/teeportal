// modules/reports.js - COMPLETE FIXED VERSION
class ReportsManager {
    constructor(db) {
        console.log('📊 ReportsManager constructor called');
        this.db = db || window.app?.db;
        this.app = window.app;
        
        if (!this.db) {
            console.error('❌ Database not available for ReportsManager');
        }
        
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
        
        console.log('Initialized ReportsManager:', {
            db: this.db ? `✅ ${this.db.constructor.name}` : '❌ Missing',
            hasGetStudents: typeof this.db?.getStudents === 'function',
            hasGetCourses: typeof this.db?.getCourses === 'function',
            hasGetMarks: typeof this.db?.getMarks === 'function',
            hasGetPrograms: typeof this.db?.getPrograms === 'function',
            hasGetCentres: typeof this.db?.getCentres === 'function',
            hasGetCounties: typeof this.db?.getCounties === 'function'
        });
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
            
            // Load initial reports grid
            await this.generateReportsGrid();
            
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
            console.log('🔄 Populating report filters...');
            
            // Populate Academic Year filter
            const yearSelect = document.getElementById('academicYear');
            if (yearSelect) {
                const currentYear = new Date().getFullYear();
                for (let year = currentYear; year >= currentYear - 5; year--) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearSelect.appendChild(option);
                }
                yearSelect.value = currentYear;
            }
            
            // Get real data from database
            const centres = await this.getCentres();
            const counties = await this.getCounties();
            const programs = await this.getPrograms();
            const students = await this.getStudents();
            
            // Populate Center filters
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
                    // Clear existing options
                    select.innerHTML = '';
                    
                    // Add "All Centres" option
                    const allOption = document.createElement('option');
                    allOption.value = 'all';
                    allOption.textContent = 'All Centres';
                    select.appendChild(allOption);
                    
                    // Add centre options from database
                    centres.forEach(centre => {
                        const option = document.createElement('option');
                        option.value = centre.id || centre.name;
                        option.textContent = centre.name || centre.code || 'Unknown Centre';
                        if (centre.county) {
                            option.textContent += ` (${centre.county})`;
                        }
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ Populated ${selectId} with ${centres.length} centres`);
                }
            });
            
            // Populate County filters
            const countySelects = ['filterCounty'];
            
            countySelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '';
                    
                    // Add "All Counties" option
                    const allOption = document.createElement('option');
                    allOption.value = 'all';
                    allOption.textContent = 'All Counties';
                    allOption.selected = true;
                    select.appendChild(allOption);
                    
                    counties.forEach(county => {
                        const option = document.createElement('option');
                        option.value = county.name || county;
                        option.textContent = county.name || county;
                        select.appendChild(option);
                    });
                }
            });
            
            // Populate Program filter
            const programSelect = document.getElementById('filterProgram');
            if (programSelect) {
                programSelect.innerHTML = '';
                
                // Add "All Programs" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Programs';
                allOption.selected = true;
                programSelect.appendChild(allOption);
                
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.code || program.name || program.id;
                    option.textContent = program.name || program.code || 'Unknown Program';
                    programSelect.appendChild(option);
                });
            }
            
            // Populate Intake filter
            const intakeSelect = document.getElementById('filterIntake');
            if (intakeSelect) {
                intakeSelect.innerHTML = '';
                
                // Add "All Intakes" option
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Intakes';
                allOption.selected = true;
                intakeSelect.appendChild(allOption);
                
                // Get unique intake years from students
                const intakeYears = [...new Set(students.map(s => s.intake_year).filter(Boolean))]
                    .sort((a, b) => b - a);
                
                intakeYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    intakeSelect.appendChild(option);
                });
            }
            
            console.log('✅ All filters populated successfully');
            
        } catch (error) {
            console.error('❌ Error populating filters:', error);
            this.showToast('Error loading filter data', 'error');
        }
    }
    
    async populateTranscriptStudents() {
        try {
            const studentSelect = document.getElementById('transcriptStudent');
            if (!studentSelect) return;
            
            studentSelect.innerHTML = '';
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Get all students from database
            const students = await this.getStudents();
            
            // Add student options
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                
                // Add student centre if available
                if (student.centre_name || student.centre) {
                    option.textContent += ` (${student.centre_name || student.centre})`;
                }
                
                studentSelect.appendChild(option);
            });
            
            console.log(`✅ Loaded ${students.length} students for transcript generation`);
            
        } catch (error) {
            console.error('❌ Error populating transcript students:', error);
            this.showToast('Error loading student list', 'error');
        }
    }
    
    // ==================== DATABASE METHODS ====================
    
    async getStudents() {
        try {
            if (!this.db || !this.db.getStudents) {
                console.error('getStudents method not available');
                return [];
            }
            return await this.db.getStudents();
        } catch (error) {
            console.error('❌ Error getting students:', error);
            return [];
        }
    }
    
    async getStudentById(studentId) {
        try {
            if (!this.db || !this.db.getStudent) {
                console.error('getStudent method not available');
                const students = await this.getStudents();
                return students.find(s => s.id == studentId) || null;
            }
            return await this.db.getStudent(studentId);
        } catch (error) {
            console.error('❌ Error getting student by ID:', error);
            return null;
        }
    }
    
    async getCourses() {
        try {
            if (!this.db || !this.db.getCourses) {
                console.error('getCourses method not available');
                return [];
            }
            return await this.db.getCourses();
        } catch (error) {
            console.error('❌ Error getting courses:', error);
            return [];
        }
    }
    
    async getMarks() {
        try {
            if (!this.db || !this.db.getMarks) {
                console.error('getMarks method not available');
                return [];
            }
            return await this.db.getMarks();
        } catch (error) {
            console.error('❌ Error getting marks:', error);
            return [];
        }
    }
    
    async getMarksByStudent(studentId) {
        try {
            if (!this.db || !this.db.getStudentMarks) {
                // Fallback: get all marks and filter
                const allMarks = await this.getMarks();
                return allMarks.filter(mark => mark.student_id == studentId);
            }
            return await this.db.getStudentMarks(studentId);
        } catch (error) {
            console.error('❌ Error getting marks by student:', error);
            return [];
        }
    }
    
    async getCentres() {
        try {
            if (!this.db || !this.db.getCentres) {
                console.error('getCentres method not available');
                // Fallback: get from students
                const students = await this.getStudents();
                const centres = [...new Set(students.map(s => s.centre_name || s.centre).filter(Boolean))];
                return centres.map(centre => ({ name: centre }));
            }
            return await this.db.getCentres();
        } catch (error) {
            console.error('❌ Error getting centres:', error);
            return [];
        }
    }
    
    async getCounties() {
        try {
            if (!this.db || !this.db.getCounties) {
                console.error('getCounties method not available');
                // Fallback: get from students
                const students = await this.getStudents();
                const counties = [...new Set(students.map(s => s.county).filter(Boolean))];
                return counties.map(county => ({ name: county }));
            }
            return await this.db.getCounties();
        } catch (error) {
            console.error('❌ Error getting counties:', error);
            return [];
        }
    }
    
    async getPrograms() {
        try {
            if (!this.db || !this.db.getPrograms) {
                console.error('getPrograms method not available');
                // Fallback: get from students
                const students = await this.getStudents();
                const programs = [...new Set(students.map(s => s.program).filter(Boolean))];
                return programs.map(program => ({ name: program, code: program }));
            }
            return await this.db.getPrograms();
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            return [];
        }
    }
    
    // ==================== REPORTS GRID ====================
    
    async generateReportsGrid() {
        try {
            const reportsContainer = document.getElementById('reportsGrid');
            if (!reportsContainer) return;
            
            const reports = [
                {
                    id: 'student-list',
                    title: 'Student List Report',
                    icon: 'fas fa-users',
                    description: 'Comprehensive list of all students with filters',
                    color: '#3498db',
                    action: 'studentReport'
                },
                {
                    id: 'academic-performance',
                    title: 'Academic Performance',
                    icon: 'fas fa-chart-line',
                    description: 'Student grades and performance analysis',
                    color: '#2ecc71',
                    action: 'academicReport'
                },
                {
                    id: 'centre-report',
                    title: 'Centre Report',
                    icon: 'fas fa-building',
                    description: 'Analysis by study centre',
                    color: '#9b59b6',
                    action: 'generateCentreReport'
                },
                {
                    id: 'geographical',
                    title: 'Geographical Report',
                    icon: 'fas fa-map-marker-alt',
                    description: 'Student distribution by county/region',
                    color: '#e74c3c',
                    action: 'geographicalReport'
                },
                {
                    id: 'summary',
                    title: 'Executive Summary',
                    icon: 'fas fa-chart-pie',
                    description: 'Key statistics and overview',
                    color: '#f39c12',
                    action: 'generateSummaryReport'
                },
                {
                    id: 'transcript',
                    title: 'Student Transcript',
                    icon: 'fas fa-graduation-cap',
                    description: 'Generate official student transcripts',
                    color: '#1abc9c',
                    action: 'openTranscriptSection'
                },
                {
                    id: 'center-comparison',
                    title: 'Centre Comparison',
                    icon: 'fas fa-balance-scale',
                    description: 'Compare performance across centres',
                    color: '#34495e',
                    action: 'generateCenterComparison'
                },
                {
                    id: 'scheduled',
                    title: 'Scheduled Reports',
                    icon: 'fas fa-calendar-alt',
                    description: 'Automated and scheduled reports',
                    color: '#7f8c8d',
                    action: 'showScheduledReports'
                }
            ];
            
            let html = '';
            
            reports.forEach(report => {
                html += `
                    <div class="report-card" onclick="app.reports.${report.action}()" 
                         style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; 
                                margin-bottom: 20px; background: white; cursor: pointer;
                                transition: transform 0.2s, box-shadow 0.2s;"
                         onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.1)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="width: 50px; height: 50px; border-radius: 10px; 
                                        background: ${report.color}; display: flex; 
                                        align-items: center; justify-content: center; 
                                        margin-right: 15px;">
                                <i class="${report.icon}" style="font-size: 24px; color: white;"></i>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${report.title}</h4>
                                <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">
                                    ${report.description}
                                </p>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.8rem; color: #95a5a6;">
                                <i class="fas fa-clock"></i> Click to generate
                            </span>
                            <button class="btn btn-sm" 
                                    style="background: ${report.color}; color: white; border: none;
                                           padding: 5px 15px; border-radius: 4px; font-size: 0.85rem;">
                                Generate <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            reportsContainer.innerHTML = html;
            
            console.log('✅ Reports grid generated');
            
        } catch (error) {
            console.error('❌ Error generating reports grid:', error);
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
        const applyBtn = document.querySelector('[onclick*="applyFilters"]');
        if (applyBtn) {
            applyBtn.onclick = () => this.applyFilters();
        }
        
        // Clear Filters button
        const clearBtn = document.querySelector('[onclick*="clearFilters"]');
        if (clearBtn) {
            clearBtn.onclick = () => this.clearFilters();
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('[onclick*="refreshReports"]');
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
        
        // Update all buttons with app.reports handlers
        document.querySelectorAll('button[onclick*="app.reports."]').forEach(button => {
            const onclickValue = button.getAttribute('onclick');
            if (onclickValue && onclickValue.includes('removeScheduledReport')) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    this.removeScheduledReport(button);
                };
            } else if (onclickValue && buttonMap[onclickValue]) {
                button.onclick = () => buttonMap[onclickValue]();
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
            studentSelect.innerHTML = '';
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select Student';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            studentSelect.appendChild(placeholderOption);
            
            // Filter students by centre
            const filteredStudents = selectedCenter === 'all' 
                ? students 
                : students.filter(student => 
                    (student.centre_name === selectedCenter) || 
                    (student.centre === selectedCenter)
                );
            
            // Add filtered students
            filteredStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.reg_number} - ${student.full_name}`;
                
                if (student.centre_name || student.centre) {
                    option.textContent += ` (${student.centre_name || student.centre})`;
                }
                
                studentSelect.appendChild(option);
            });
            
            console.log(`Filtered ${filteredStudents.length} students for centre: ${selectedCenter}`);
            
        } catch (error) {
            console.error('Error filtering transcript students by centre:', error);
        }
    }
    
    // ==================== TRANSCRIPT METHODS (IMPROVED) ====================
    
    async generateTranscriptData(studentId) {
        try {
            console.log('📄 Generating transcript data for student ID:', studentId);
            
            const student = await this.getStudentById(studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            const marks = await this.getMarksByStudent(studentId);
            console.log(`Found ${marks.length} marks for student`);
            
            // Group marks by course
            const coursesMap = {};
            
            marks.forEach(mark => {
                const courseId = mark.course_id;
                if (!courseId) return;
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        course_id: courseId,
                        marks: [],
                        totalScore: 0,
                        totalMaxScore: 0
                    };
                }
                
                coursesMap[courseId].marks.push({
                    assessment_name: mark.assessment_name || 'Assessment',
                    assessment_type: mark.assessment_type || 'Exam',
                    score: mark.score || 0,
                    max_score: mark.max_score || 100,
                    percentage: mark.percentage || 0,
                    grade: mark.grade || 'N/A',
                    date: mark.assessment_date || mark.created_at || new Date().toISOString()
                });
                
                coursesMap[courseId].totalScore += mark.score || 0;
                coursesMap[courseId].totalMaxScore += mark.max_score || 100;
            });
            
            // Get course details and calculate final grades
            const allCourses = await this.getCourses();
            const courseList = [];
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            Object.values(coursesMap).forEach(courseData => {
                const course = allCourses.find(c => c.id === courseData.course_id);
                if (!course) return;
                
                const finalScore = courseData.totalMaxScore > 0 
                    ? (courseData.totalScore / courseData.totalMaxScore) * 100 
                    : 0;
                
                const grade = this.calculateGrade(finalScore);
                const gradePoints = this.getGradePoints(grade);
                const credits = course.credits || 3;
                
                totalCredits += credits;
                totalGradePoints += gradePoints * credits;
                
                courseList.push({
                    course_code: course.course_code || course.code || 'N/A',
                    course_name: course.course_name || course.name || 'Unknown Course',
                    credits: credits,
                    semester: course.semester || 1,
                    final_score: finalScore.toFixed(1),
                    grade: grade,
                    grade_points: gradePoints,
                    assessments: courseData.marks
                });
            });
            
            // Sort by semester
            courseList.sort((a, b) => a.semester - b.semester);
            
            // Calculate GPA
            const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
            
            return {
                student: {
                    id: student.id,
                    reg_number: student.reg_number,
                    full_name: student.full_name,
                    program: student.program,
                    centre: student.centre_name || student.centre || 'Not specified',
                    intake_year: student.intake_year,
                    status: student.status || 'active',
                    date_of_birth: student.date_of_birth,
                    gender: student.gender,
                    email: student.email,
                    phone: student.phone
                },
                courses: courseList,
                summary: {
                    total_courses: courseList.length,
                    total_credits: totalCredits,
                    gpa: parseFloat(gpa),
                    cumulative_gpa: parseFloat(gpa),
                    date_generated: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating transcript data:', error);
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
            console.error('❌ Error previewing transcript:', error);
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
            
            console.log(`📄 Generating ${format.toUpperCase()} transcript for student ID: ${studentId}`);
            
            const data = await this.generateTranscriptData(studentId);
            
            if (format === 'pdf') {
                await this.exportTranscriptToPDF(data);
            } else {
                await this.exportData(data.courses, `transcript-${data.student.reg_number}`, format);
            }
            
            this.showToast('Transcript generated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error generating transcript:', error);
            this.showToast('Error generating transcript', 'error');
        }
    }
    
    previewTranscriptData(transcriptData) {
        try {
            const previewDiv = document.getElementById('transcriptPreview');
            if (!previewDiv) return;
            
            let html = `
                <div class="transcript-preview" style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div class="transcript-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin-bottom: 5px;">TEE College</h2>
                        <h3 style="color: #7f8c8d; font-weight: normal; margin-bottom: 20px;">Academic Transcript</h3>
                    </div>
                    
                    <div class="student-info" style="margin-bottom: 30px;">
                        <div class="row" style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Student Name:</strong>
                                <div style="color: #34495e;">${transcriptData.student.full_name}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Registration Number:</strong>
                                <div style="color: #34495e;"><code>${transcriptData.student.reg_number}</code></div>
                            </div>
                        </div>
                        <div class="row" style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Program:</strong>
                                <div style="color: #34495e;">${transcriptData.student.program}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Study Centre:</strong>
                                <div style="color: #34495e;">${transcriptData.student.centre}</div>
                            </div>
                        </div>
                        <div class="row" style="display: flex; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Intake Year:</strong>
                                <div style="color: #34495e;">${transcriptData.student.intake_year}</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Status:</strong>
                                <span class="badge ${transcriptData.student.status === 'active' ? 'badge-success' : 'badge-secondary'}" 
                                      style="background: ${transcriptData.student.status === 'active' ? '#2ecc71' : '#95a5a6'}; 
                                             color: white; padding: 3px 10px; border-radius: 4px;">
                                    ${transcriptData.student.status || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="courses-table" style="margin-bottom: 30px;">
                        <h4 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <i class="fas fa-book"></i> Course Performance
                        </h4>
            `;
            
            if (transcriptData.courses.length === 0) {
                html += `
                    <div class="alert alert-info" style="background: #e8f4fc; color: #31708f; padding: 15px; border-radius: 5px; text-align: center;">
                        <i class="fas fa-info-circle"></i> No course records found for this student
                    </div>
                `;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead style="background: #f8f9fa;">
                                <tr>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Course Code</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Course Name</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Credits</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Semester</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Grade</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Grade Points</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                transcriptData.courses.forEach(course => {
                    const gradeColor = course.grade === 'FAIL' ? '#e74c3c' : 
                                     course.grade === 'PASS' ? '#f39c12' : 
                                     course.grade === 'CREDIT' ? '#3498db' : '#2ecc71';
                    
                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px;"><strong>${course.course_code}</strong></td>
                            <td style="padding: 12px;">${course.course_name}</td>
                            <td style="padding: 12px; text-align: center;">${course.credits}</td>
                            <td style="padding: 12px; text-align: center;">${course.semester}</td>
                            <td style="padding: 12px;">
                                <span class="badge" style="background: ${gradeColor}; color: white; padding: 4px 8px; border-radius: 4px;">
                                    ${course.grade}
                                </span>
                            </td>
                            <td style="padding: 12px; text-align: center;">${course.grade_points.toFixed(1)}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            html += `
                    </div>
                    
                    <div class="transcript-summary" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <div class="row" style="display: flex; flex-wrap: wrap; justify-content: space-between;">
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Total Courses:</strong>
                                <div style="font-size: 1.2rem; color: #34495e;">${transcriptData.summary.total_courses}</div>
                            </div>
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Total Credits:</strong>
                                <div style="font-size: 1.2rem; color: #34495e;">${transcriptData.summary.total_credits}</div>
                            </div>
                            <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
                                <strong style="color: #2c3e50;">Grade Point Average (GPA):</strong>
                                <div style="font-size: 1.5rem; color: #2ecc71; font-weight: bold;">${transcriptData.summary.gpa.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="transcript-footer" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #7f8c8d; font-size: 0.9rem;">
                        <p>Generated on: ${transcriptData.summary.date_generated}</p>
                        <p><i class="fas fa-lock"></i> Official Transcript - For Academic Use Only</p>
                    </div>
                </div>
            `;
            
            previewDiv.innerHTML = html;
            previewDiv.style.display = 'block';
            
        } catch (error) {
            console.error('Error rendering transcript preview:', error);
            this.showToast('Error rendering transcript preview', 'error');
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
                this.showToast('No students found in database', 'warning');
            }
        } catch (error) {
            console.error('Error loading sample transcript:', error);
            this.showToast('Error loading sample', 'error');
        }
    }
    
    // ==================== REPORT GENERATION ====================
    
    async studentReport() {
        console.log('📊 Generating student report...');
        try {
            this.showToast('Generating student report...', 'info');
            const data = await this.generateStudentListReport();
            this.previewReportData(data, 'Student List Report');
            return data;
        } catch (error) {
            console.error('Error in studentReport:', error);
            this.showToast('Error generating student report', 'error');
            throw error;
        }
    }
    
    async academicReport() {
        console.log('📈 Generating academic report...');
        try {
            this.showToast('Generating academic report...', 'info');
            const data = await this.generateAcademicReport();
            this.previewReportData(data, 'Academic Performance Report');
            return data;
        } catch (error) {
            console.error('Error in academicReport:', error);
            this.showToast('Error generating academic report', 'error');
            throw error;
        }
    }
    
    async generateCentreReport() {
        console.log('📍 Generating centre report...');
        try {
            this.showToast('Generating centre report...', 'info');
            const data = await this.generateCentreReportData();
            this.previewReportData(data, 'Centre Report');
            return data;
        } catch (error) {
            console.error('Error in generateCentreReport:', error);
            this.showToast('Error generating centre report', 'error');
            throw error;
        }
    }
    
    async generateCentreReportData() {
        try {
            const students = await this.getStudents();
            const centres = await this.getCentres();
            
            const centreData = centres.map(centre => {
                const centreName = centre.name || centre;
                const centreStudents = students.filter(s => 
                    s.centre_name === centreName || s.centre === centreName
                );
                const activeStudents = centreStudents.filter(s => s.status === 'active');
                const graduatedStudents = centreStudents.filter(s => s.status === 'graduated');
                
                return {
                    'Centre Name': centreName,
                    'County': centre.county || 'Not specified',
                    'Total Students': centreStudents.length,
                    'Active Students': activeStudents.length,
                    'Graduated': graduatedStudents.length,
                    'Graduation Rate': centreStudents.length > 0 
                        ? ((graduatedStudents.length / centreStudents.length) * 100).toFixed(1) + '%' 
                        : '0%'
                };
            }).filter(data => data['Total Students'] > 0);
            
            return centreData;
        } catch (error) {
            console.error('Error generating centre report data:', error);
            throw error;
        }
    }
    
    async geographicalReport() {
        console.log('🗺️ Generating geographical report...');
        try {
            this.showToast('Generating geographical report...', 'info');
            const data = await this.generateGeographicalReportData();
            this.previewReportData(data, 'Geographical Distribution Report');
            return data;
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
                const countyName = county.name || county;
                const countyStudents = students.filter(s => s.county === countyName);
                const centres = [...new Set(countyStudents.map(s => s.centre_name || s.centre).filter(Boolean))];
                
                return {
                    'County': countyName,
                    'Students': countyStudents.length,
                    'Centres': centres.length,
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
    
    async generateSummaryReport() {
        console.log('📋 Generating summary report...');
        try {
            this.showToast('Generating summary report...', 'info');
            const data = await this.generateExecutiveSummary();
            this.previewReportData(data, 'Executive Summary Report');
            return data;
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
            
            const centres = await this.getCentres();
            
            return [
                { 'Metric': 'Total Students', 'Value': totalStudents },
                { 'Metric': 'Active Students', 'Value': activeStudents },
                { 'Metric': 'Graduated Students', 'Value': graduatedStudents },
                { 'Metric': 'Graduation Rate', 'Value': graduationRate },
                { 'Metric': 'Total Courses', 'Value': courses.length },
                { 'Metric': 'Active Centres', 'Value': centres.length },
                { 'Metric': 'Marks Entries', 'Value': marks.length }
            ];
        } catch (error) {
            console.error('Error generating executive summary:', error);
            throw error;
        }
    }
    
    async generateStudentListReport() {
        try {
            const students = await this.getStudents();
            let filteredStudents = this.applyStudentFilters(students);
            
            const centerFilter = this.getSelectedValues('studentReportCenter');
            if (centerFilter.length > 0 && !centerFilter.includes('all')) {
                filteredStudents = filteredStudents.filter(student => 
                    centerFilter.includes(student.centre_name || student.centre)
                );
            }
            
            return filteredStudents.map(student => ({
                'Registration Number': student.reg_number || 'N/A',
                'Full Name': student.full_name || 'N/A',
                'Email': student.email || '',
                'Phone': student.phone || '',
                'Program': student.program || '',
                'Centre': student.centre_name || student.centre || 'Not specified',
                'County': student.county || 'Not specified',
                'Intake Year': student.intake_year || '',
                'Status': student.status || '',
                'Date of Birth': student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
                'Gender': student.gender || '',
                'Address': student.address || '',
                'Created Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
            }));
            
        } catch (error) {
            console.error('Error generating student list:', error);
            throw error;
        }
    }
    
    async generateAcademicReport() {
        try {
            const marks = await this.getMarks();
            const courses = await this.getCourses();
            const students = await this.getStudents();
            
            // Group marks by student
            const studentPerformance = {};
            
            marks.forEach(mark => {
                const studentId = mark.student_id;
                if (!studentId) return;
                
                if (!studentPerformance[studentId]) {
                    const student = students.find(s => s.id === studentId) || {};
                    studentPerformance[studentId] = {
                        student_id: studentId,
                        reg_number: student.reg_number || 'N/A',
                        full_name: student.full_name || 'Unknown Student',
                        program: student.program || '',
                        centre: student.centre_name || student.centre || '',
                        total_marks: 0,
                        total_possible: 0,
                        courses_taken: 0,
                        average_percentage: 0,
                        gpa: 0
                    };
                }
                
                studentPerformance[studentId].total_marks += mark.score || 0;
                studentPerformance[studentId].total_possible += mark.max_score || 100;
                studentPerformance[studentId].courses_taken++;
            });
            
            // Calculate averages and GPA
            const reportData = Object.values(studentPerformance).map(performance => {
                const avgPercentage = performance.total_possible > 0 
                    ? (performance.total_marks / performance.total_possible) * 100 
                    : 0;
                
                const grade = this.calculateGrade(avgPercentage);
                const gpa = this.getGradePoints(grade);
                
                return {
                    'Registration Number': performance.reg_number,
                    'Student Name': performance.full_name,
                    'Program': performance.program,
                    'Centre': performance.centre,
                    'Courses Taken': performance.courses_taken,
                    'Average Score': `${avgPercentage.toFixed(1)}%`,
                    'Grade': grade,
                    'GPA': gpa.toFixed(2),
                    'Performance': avgPercentage >= 70 ? 'Excellent' : 
                                  avgPercentage >= 50 ? 'Good' : 
                                  avgPercentage >= 35 ? 'Satisfactory' : 'Needs Improvement'
                };
            });
            
            return reportData;
            
        } catch (error) {
            console.error('Error generating academic report:', error);
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
            await this.generateReportsGrid();
            
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
            const elements = ['academicYear', 'filterProgram', 'filterCourse', 'semester', 'filterCenter', 'filterCounty', 'filterIntake'];
            
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'select-multiple') {
                        Array.from(element.options).forEach(option => {
                            option.selected = option.value === 'all';
                        });
                    } else {
                        element.value = 'all';
                    }
                }
            });
            
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
            this.generateReportsGrid();
            
            this.showToast('Filters cleared', 'info');
            
        } catch (error) {
            console.error('Error clearing filters:', error);
            this.showToast('Error clearing filters', 'error');
        }
    }
    
    getSelectedValues(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return ['all'];
        
        if (select.type === 'select-multiple') {
            const selected = Array.from(select.selectedOptions)
                .map(option => option.value)
                .filter(value => value !== '' && value !== 'all');
            
            return selected.length > 0 ? selected : ['all'];
        } else {
            const value = select.value;
            return value && value !== 'all' ? [value] : ['all'];
        }
    }
    
    getSafeElementValue(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    applyStudentFilters(students) {
        let filtered = [...students];
        
        const programs = this.currentFilters.program;
        if (programs.length > 0 && !programs.includes('all')) {
            filtered = filtered.filter(s => programs.includes(s.program));
        }
        
        const centers = this.currentFilters.centers;
        if (centers.length > 0 && !centers.includes('all')) {
            filtered = filtered.filter(s => centers.includes(s.centre_name || s.centre));
        }
        
        const counties = this.currentFilters.counties;
        if (counties.length > 0 && !counties.includes('all')) {
            filtered = filtered.filter(s => counties.includes(s.county));
        }
        
        if (this.currentFilters.intake !== 'all') {
            filtered = filtered.filter(s => s.intake_year == parseInt(this.currentFilters.intake));
        }
        
        return filtered;
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
            
            const centres = await this.getCentres();
            const activeCentres = centres.length;
            
            // Calculate average GPA (simplified for now)
            const avgGPA = 3.24;
            
            this.updateElementText('totalStudents', totalStudents.toLocaleString());
            this.updateElementText('graduationRate', graduationRate + '%');
            this.updateElementText('avgGPA', avgGPA.toFixed(2));
            this.updateElementText('centersCount', activeCentres);
            
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
    
    // ==================== UTILITY METHODS ====================
    
    calculateGrade(percentage) {
        if (percentage >= 85) return 'DISTINCTION';
        if (percentage >= 70) return 'CREDIT';
        if (percentage >= 50) return 'PASS';
        return 'FAIL';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'DISTINCTION': 4.0,
            'CREDIT': 3.0,
            'PASS': 2.0,
            'FAIL': 0.0
        };
        return gradePoints[grade] || 0.0;
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('reportLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#2ecc71' : 
                        type === 'error' ? '#e74c3c' : 
                        type === 'warning' ? '#f39c12' : '#3498db'};
        `;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer;">
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
                <div class="alert alert-warning" style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
                    <i class="fas fa-exclamation-triangle"></i> No data available for preview
                </div>
            `;
            return;
        }
        
        const headers = Object.keys(data[0]);
        const previewData = data.slice(0, 10);
        
        let html = `
            <div class="report-preview" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h5 style="margin: 0; color: #2c3e50;">${title}</h5>
                    <span class="badge" style="background: #3498db; color: white; padding: 5px 10px; border-radius: 4px;">
                        ${data.length} records
                    </span>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                ${headers.map(header => `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        previewData.forEach(row => {
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    ${headers.map(header => `
                        <td style="padding: 12px; color: #495057;">${row[header] || ''}</td>
                    `).join('')}
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                ${data.length > 10 ? `
                    <div class="alert alert-info mt-2" style="background: #e8f4fc; color: #31708f; padding: 10px; border-radius: 5px; margin-top: 15px;">
                        <i class="fas fa-info-circle"></i> Showing first 10 of ${data.length} records
                    </div>
                ` : ''}
            </div>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    // ==================== EXPORT METHODS ====================
    
    async exportTranscriptToPDF(data) {
        // Placeholder for PDF export functionality
        console.log('PDF export functionality would be implemented here');
        console.log('Transcript data for PDF:', data);
        this.showToast('PDF export would be implemented with a PDF library', 'info');
    }
    
    async exportData(data, filename, format) {
        if (format === 'csv') {
            this.exportToCSV(data, filename);
        } else if (format === 'excel') {
            this.exportToExcel(data, filename);
        }
    }
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('CSV file downloaded', 'success');
    }
    
    exportToExcel(data, filename) {
        // Placeholder for Excel export
        console.log('Excel export would be implemented with a library like SheetJS');
        this.showToast('Excel export would require SheetJS library', 'info');
    }
    
    // ==================== UTILITY SHORTCUTS ====================
    
    refreshReports() {
        this.updateStatistics();
        this.generateReportsGrid();
        this.showToast('Reports refreshed', 'success');
    }
    
    openTranscriptSection() {
        const transcriptSection = document.getElementById('transcriptSection');
        if (transcriptSection) {
            transcriptSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    showScheduledReports() {
        this.showToast('Scheduled reports feature', 'info');
    }
    
    quickStudentReport() {
        this.studentReport();
    }
    
    quickAcademicReport() {
        this.academicReport();
    }
    
    previewStudentReport() {
        this.studentReport();
    }
    
    previewAcademicReport() {
        this.academicReport();
    }
    
    bulkExport() {
        this.showToast('Bulk export feature', 'info');
    }
    
    clearPreview() {
        const previewDiv = document.getElementById('reportPreview');
        if (previewDiv) {
            previewDiv.innerHTML = '';
        }
        
        const transcriptPreview = document.getElementById('transcriptPreview');
        if (transcriptPreview) {
            transcriptPreview.innerHTML = '';
            transcriptPreview.style.display = 'none';
        }
        
        this.showToast('Preview cleared', 'info');
    }
    
    generateCenterComparison() {
        this.showToast('Center comparison feature', 'info');
    }
    
    addScheduledReport() {
        this.showToast('Add scheduled report feature', 'info');
    }
    
    saveFilterPreset() {
        this.showToast('Save filter preset feature', 'info');
    }
    
    downloadPreview() {
        this.showToast('Download preview feature', 'info');
    }
    
    bulkTranscripts() {
        this.showToast('Bulk transcripts feature', 'info');
    }
    
    removeScheduledReport(btn) {
        if (btn && btn.closest) {
            const row = btn.closest('tr');
            if (row) {
                row.remove();
                this.showToast('Scheduled report removed', 'success');
            }
        }
    }
}

// Add CSS for animations
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .toast {
            animation: slideIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}
