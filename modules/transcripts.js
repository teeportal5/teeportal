// modules/transcripts.js - COMPLETE FIXED VERSION WITH PROPER METHOD BINDING
class TranscriptsManager {
    constructor(db) {
        console.log('🎓 TranscriptsManager initialized');
        this.db = db;
        this.cachedStudents = null;
        this.currentTranscriptData = null;
        this.app = window.app || window;
        
        // Bind all methods to ensure 'this' works correctly
        this.bindAllMethods();
    }

    bindAllMethods() {
        // List all methods that need binding
        const methods = [
            'initialize',
            'initializeTranscriptsUI',
            'setupTranscriptButtons',
            'populateTranscriptDropdowns',
            'loadSampleTranscript',
            'previewTranscript',
            'displayTranscriptInHTML',
            'generateTranscriptHTML',
            'generateTranscriptFromUI',
            'downloadCurrentTranscript',
            'emailTranscript',
            'filterTranscriptStudentsByCenter',
            'populateStudentDropdown',
            'generateStudentTranscriptPrompt',
            'loadModalStudents',
            'renderModalStudentTable',
            'setupModalEvents',
            'filterModalStudents',
            'updateModalSelectedCount',
            'generateStudentTranscript',
            'prepareTranscriptData',
            'exportTranscript',
            'generateTranscriptsBatch',
            'generateTranscriptPDF',
            'generateTranscriptExcel',
            'generateTranscriptCSV',
            'showToast',
            'openTranscriptModal',
            'generateTranscript',
            'clearSelectedStudent',
            'openBulkTranscriptModal'
        ];
        
        // Bind each method
        methods.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
        
        console.log('✅ All transcript methods bound');
    }

    // ==================== PUBLIC API METHODS (FOR HTML) ====================
    
    // This is what HTML buttons call - MUST EXIST
    openTranscriptModal() {
        console.log('📄 TranscriptsManager.openTranscriptModal() called');
        return this.generateStudentTranscriptPrompt();
    }
    
    // Alias for reports compatibility
    generateTranscript() {
        console.log('📄 TranscriptsManager.generateTranscript() called');
        return this.generateTranscriptFromUI();
    }
    
    // Alias for reports compatibility
    clearSelectedStudent() {
        console.log('📄 TranscriptsManager.clearSelectedStudent() called');
        const selectedStudentInfo = document.getElementById('selectedStudentInfo');
        if (selectedStudentInfo) {
            selectedStudentInfo.style.display = 'none';
        }
        this.showToast('Student selection cleared', 'info');
        return true;
    }
    
    // Alias for bulk generation
    openBulkTranscriptModal() {
        console.log('📄 TranscriptsManager.openBulkTranscriptModal() called');
        return this.generateStudentTranscriptPrompt();
    }

    // ==================== INITIALIZATION ====================
    
    async initialize() {
        console.log('🎓 Initializing Transcripts Manager...');
        try {
            await this.initializeTranscriptsUI();
            console.log('✅ Transcripts Manager initialized');
            return this;
        } catch (error) {
            console.error('❌ Error initializing transcripts:', error);
            throw error;
        }
    }
    
    async initializeTranscriptsUI() {
        try {
            console.log('📄 Initializing Transcripts UI...');
            
            // Initialize event listeners for HTML buttons
            this.setupTranscriptButtons();
            
            // Populate dropdowns if they exist
            await this.populateTranscriptDropdowns();
            
            console.log('✅ Transcripts UI initialized');
        } catch (error) {
            console.error('Error initializing transcripts UI:', error);
        }
    }
    
    setupTranscriptButtons() {
        // Connect HTML buttons to our methods
        const buttons = {
            'loadSampleTranscript': () => this.loadSampleTranscript(),
            'previewTranscript': () => this.previewTranscript(),
            'generateTranscript': () => this.generateTranscriptFromUI(),
            'bulkTranscripts': () => this.generateStudentTranscriptPrompt(),
            'downloadTranscript': () => this.downloadCurrentTranscript(),
            'emailTranscript': () => this.emailTranscript(),
            'clearSelectedStudent': () => this.clearSelectedStudent(),
            'openTranscriptModal': () => this.openTranscriptModal(),
            'openBulkTranscriptModal': () => this.openBulkTranscriptModal()
        };
        
        // Add event listeners if elements exist
        Object.keys(buttons).forEach(buttonId => {
            const element = document.querySelector(`[onclick*="${buttonId}"]`);
            if (element) {
                element.onclick = buttons[buttonId];
            }
        });
        
        // Also add event listeners for filter dropdowns
        const centreFilter = document.getElementById('transcriptCenterFilter');
        if (centreFilter) {
            centreFilter.onchange = () => this.filterTranscriptStudentsByCenter();
        }
    }
    
    async populateTranscriptDropdowns() {
        try {
            // Populate centre filter
            const centres = await this.db.getCentres();
            const centreSelect = document.getElementById('transcriptCenterFilter');
            if (centreSelect) {
                centreSelect.innerHTML = '<option value="all">All Centres</option>';
                centres.forEach(centre => {
                    const option = document.createElement('option');
                    option.value = centre.id;
                    option.textContent = centre.name;
                    centreSelect.appendChild(option);
                });
            }
            
            // Populate program filter
            const programs = await this.db.getPrograms();
            const programSelect = document.getElementById('transcriptProgram');
            if (programSelect) {
                programSelect.innerHTML = '<option value="all">All Programs</option>';
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.id;
                    option.textContent = program.name || program.code;
                    programSelect.appendChild(option);
                });
            }
            
            // Populate student dropdown
            await this.populateStudentDropdown();
            
        } catch (error) {
            console.error('Error populating dropdowns:', error);
        }
    }

    // ==================== HTML INTEGRATION METHODS ====================
    
    async loadSampleTranscript() {
        try {
            console.log('📄 Loading sample transcript...');
            
            // Get the first student from database for sample
            const students = await this.db.getStudents();
            if (!students || students.length === 0) {
                this.showToast('No students found in database', 'warning');
                return;
            }
            
            const student = students[0];
            const transcriptData = await this.prepareTranscriptData(student.id, {
                includeAllAssessments: true,
                includeGPA: true,
                includeRemarks: true
            });
            
            // Store the data
            this.currentTranscriptData = transcriptData;
            
            // Display the transcript in HTML
            this.displayTranscriptInHTML(transcriptData);
            
            this.showToast('Sample transcript loaded', 'success');
            
        } catch (error) {
            console.error('Error loading sample transcript:', error);
            this.showToast('Error loading sample: ' + error.message, 'error');
        }
    }
    
    async previewTranscript() {
        try {
            console.log('📄 previewTranscript() called - Loading real marks...');
            
            // Get selected student from dropdown
            const studentSelect = document.getElementById('transcriptStudent');
            const studentId = studentSelect?.value;
            
            if (!studentId || studentId === '') {
                this.showToast('Please select a student first', 'warning');
                return;
            }
            
            // Show loading
            this.showToast('Loading student marks...', 'info');
            
            // Get options from checkboxes
            const options = {
                includeAllAssessments: document.getElementById('includeGrades')?.checked || true,
                includeGPA: document.getElementById('includeGPA')?.checked || true,
                includeRemarks: document.getElementById('includeSignatures')?.checked || true
            };
            
            console.log(`📊 Fetching marks for student ID: ${studentId}`);
            
            // Prepare transcript data with REAL marks from database
            const transcriptData = await this.prepareTranscriptData(studentId, options);
            
            // Check if we got any marks
            const totalCourses = transcriptData.courses.length;
            const totalAssessments = transcriptData.courses.reduce((sum, course) => 
                sum + (course.assessments?.length || 0), 0);
            
            console.log(`✅ Loaded ${totalCourses} courses with ${totalAssessments} assessments`);
            
            if (totalAssessments === 0) {
                this.showToast('No marks found for this student', 'warning');
            }
            
            this.currentTranscriptData = transcriptData;
            
            // Display in HTML
            this.displayTranscriptInHTML(transcriptData);
            
            this.showToast(`Transcript loaded with ${totalCourses} courses`, 'success');
            
        } catch (error) {
            console.error('Error previewing transcript:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    displayTranscriptInHTML(transcriptData) {
        try {
            console.log('📄 Displaying transcript in HTML with marks...');
            
            // Get the preview container
            const previewContainer = document.getElementById('transcriptPreview');
            const contentDiv = document.getElementById('transcriptPreviewContent');
            
            if (!previewContainer || !contentDiv) {
                console.error('Transcript preview elements not found');
                return;
            }
            
            // Generate transcript HTML with REAL marks
            const html = this.generateTranscriptHTML(transcriptData);
            contentDiv.innerHTML = html;
            
            // Show the preview
            previewContainer.style.display = 'block';
            
            // Scroll to preview
            previewContainer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error displaying transcript:', error);
            throw error;
        }
    }
    
    generateTranscriptHTML(data) {
        console.log('📄 Generating HTML with marks data:', data);
        
        // Calculate overall statistics from REAL marks
        const totalCredits = data.courses.reduce((sum, course) => sum + (course.credits || 3), 0);
        const earnedCredits = data.courses.filter(course => 
            course.finalGrade && course.finalGrade !== 'FAIL' && course.finalGrade !== 'N/A'
        ).reduce((sum, course) => sum + (course.credits || 3), 0);
        
        // Calculate average percentage from REAL marks
        let totalPercentage = 0;
        let coursesWithMarks = 0;
        
        data.courses.forEach(course => {
            if (course.assessments && course.assessments.length > 0) {
                const courseTotal = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                const courseAvg = course.assessments.length > 0 ? courseTotal / course.assessments.length : 0;
                totalPercentage += courseAvg;
                coursesWithMarks++;
            }
        });
        
        const avgPercentage = coursesWithMarks > 0 ? totalPercentage / coursesWithMarks : 0;
        
        // Determine overall grade based on REAL marks
        let overallGrade = 'PASS';
        if (avgPercentage >= 80) overallGrade = 'DISTINCTION';
        else if (avgPercentage >= 70) overallGrade = 'CREDIT';
        else if (avgPercentage >= 60) overallGrade = 'PASS';
        else if (avgPercentage > 0) overallGrade = 'FAIL';
        else overallGrade = 'NO MARKS';
        
        // Get current date
        const currentDate = new Date();
        const issueDate = currentDate.toLocaleDateString('en-GB');
        const issuedOn = currentDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const transcriptId = `TRX-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}-001`;
        
        // Generate course rows from REAL marks
        let courseRows = '';
        if (data.courses.length === 0) {
            courseRows = `
                <tr>
                    <td colspan="6" style="padding: 30px; text-align: center; color: #999;">
                        <i class="fas fa-exclamation-circle"></i> No course marks found for this student
                    </td>
                </tr>
            `;
        } else {
            data.courses.forEach((course, index) => {
                let gradeClass = '';
                if (course.finalGrade === 'DISTINCTION') gradeClass = 'bg-success';
                else if (course.finalGrade === 'CREDIT') gradeClass = 'bg-primary';
                else if (course.finalGrade === 'PASS') gradeClass = 'bg-warning';
                else if (course.finalGrade === 'FAIL') gradeClass = 'bg-danger';
                else gradeClass = 'bg-secondary';
                
                // Calculate course percentage from REAL assessments
                let coursePercentage = 0;
                if (course.assessments && course.assessments.length > 0) {
                    const total = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                    coursePercentage = Math.round(total / course.assessments.length);
                }
                
                courseRows += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px; text-align: center;">${index + 1}</td>
                        <td style="padding: 10px;">${course.courseCode || 'N/A'}</td>
                        <td style="padding: 10px;">${course.courseName || 'Unknown Course'}</td>
                        <td style="padding: 10px; text-align: center;">${course.credits || 3}</td>
                        <td style="padding: 10px; text-align: center;">
                            ${coursePercentage > 0 ? coursePercentage + '%' : '—'}
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <span class="badge ${gradeClass}" style="padding: 5px 10px; font-weight: bold;">
                                ${course.finalGrade || 'N/A'}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Generate detailed marks section for each course from REAL assessments
        let detailedMarksHTML = '';
        if (data.courses.length > 0) {
            data.courses.forEach((course, courseIndex) => {
                if (course.assessments && course.assessments.length > 0) {
                    let assessmentRows = '';
                    let totalScore = 0;
                    let maxScore = 0;
                    
                    course.assessments.forEach((assessment, assessmentIndex) => {
                        const percentage = assessment.percentage || 0;
                        let gradeBadge = '';
                        
                        if (percentage >= 80) gradeBadge = 'bg-success';
                        else if (percentage >= 70) gradeBadge = 'bg-primary';
                        else if (percentage >= 60) gradeBadge = 'bg-warning';
                        else gradeBadge = 'bg-danger';
                        
                        totalScore += assessment.score || 0;
                        maxScore += assessment.maxScore || 100;
                        
                        assessmentRows += `
                            <tr>
                                <td style="padding: 8px; text-align: center;">${assessmentIndex + 1}</td>
                                <td style="padding: 8px;">${assessment.name || 'Assessment'}</td>
                                <td style="padding: 8px; text-align: center;">${assessment.type || 'N/A'}</td>
                                <td style="padding: 8px; text-align: center;">${assessment.score || 0} / ${assessment.maxScore || 100}</td>
                                <td style="padding: 8px; text-align: center;">${percentage.toFixed(1)}%</td>
                                <td style="padding: 8px; text-align: center;">
                                    <span class="badge ${gradeBadge}" style="padding: 3px 8px; font-size: 12px;">
                                        ${assessment.grade || 'N/A'}
                                    </span>
                                </td>
                                <td style="padding: 8px;">${assessment.remarks || ''}</td>
                            </tr>
                        `;
                    });
                    
                    const coursePercentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0;
                    
                    detailedMarksHTML += `
                        <div class="course-marks-section mb-4" style="margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                            <h6 style="color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">
                                <i class="fas fa-book"></i> ${course.courseCode || 'N/A'} - ${course.courseName || 'Unknown Course'}
                                <span style="float: right; font-size: 14px; color: #666;">
                                    Course Total: ${coursePercentage}% | Final Grade: 
                                    <span class="badge ${course.finalGrade === 'DISTINCTION' ? 'bg-success' : course.finalGrade === 'CREDIT' ? 'bg-primary' : course.finalGrade === 'PASS' ? 'bg-warning' : course.finalGrade === 'FAIL' ? 'bg-danger' : 'bg-secondary'}" 
                                          style="padding: 3px 8px;">
                                        ${course.finalGrade || 'N/A'}
                                    </span>
                                </span>
                            </h6>
                            
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                                            <th style="padding: 10px; text-align: center; width: 5%;">#</th>
                                            <th style="padding: 10px; text-align: left; width: 25%;">Assessment</th>
                                            <th style="padding: 10px; text-align: center; width: 15%;">Type</th>
                                            <th style="padding: 10px; text-align: center; width: 15%;">Score</th>
                                            <th style="padding: 10px; text-align: center; width: 10%;">%</th>
                                            <th style="padding: 10px; text-align: center; width: 10%;">Grade</th>
                                            <th style="padding: 10px; text-align: left; width: 20%;">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${assessmentRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        if (detailedMarksHTML === '') {
            detailedMarksHTML = `
                <div style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px; color: #999;">
                    <i class="fas fa-chart-bar fa-3x mb-3"></i>
                    <p>No detailed assessment marks found for this student</p>
                </div>
            `;
        }
        
        // Get student info
        const student = data.student || {};
        const fullName = student.full_name || student.name || 'Unknown Student';
        const regNumber = student.reg_number || student.admission_number || 'N/A';
        const program = student.program_name || student.program || 'N/A';
        const centre = student.centre_name || student.centre || 'Main Campus';
        const county = student.county || 'N/A';
        const intakeYear = student.intake_year || 'N/A';
        
        // Generate the HTML
        return `
            <div id="transcriptModel" style="background: white; padding: 30px; border: 2px solid #1e3a8a; border-radius: 8px; max-width: 800px; margin: 0 auto; font-family: 'Georgia', serif;">
                
                <!-- HEADER WITH SEAL -->
                <div class="text-center mb-4 position-relative">
                    <div style="position: absolute; left: 0; top: 0; width: 80px; height: 80px; border: 2px solid #1e3a8a; border-radius: 50%; text-align: center; line-height: 80px; color: #1e3a8a; font-size: 12px;">
                        OFFICIAL SEAL
                    </div>
                    
                    <h1 style="color: #1e3a8a; font-size: 28px; margin-bottom: 5px;">THEOLOGICAL EXTENSION BY EDUCATION</h1>
                    <h2 style="color: #3b82f6; font-size: 20px; margin-bottom: 5px;">TEE COLLEGE</h2>
                    <h3 style="color: #666; font-size: 16px; margin-bottom: 15px;">Accredited Theological Institution</h3>
                    <h4 style="color: #1e3a8a; font-size: 22px; font-weight: bold; border-top: 2px solid #1e3a8a; border-bottom: 2px solid #1e3a8a; padding: 10px 0; display: inline-block; padding: 10px 40px;">
                        OFFICIAL ACADEMIC TRANSCRIPT
                    </h4>
                </div>
                
                <!-- STUDENT INFORMATION -->
                <div class="student-info mb-4" style="background: #f8fafc; padding: 20px; border-radius: 5px;">
                    <div class="row">
                        <div class="col-md-8">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="width: 35%; padding: 5px 0;"><strong>FULL NAME:</strong></td>
                                    <td style="padding: 5px 0;" id="modelStudentName">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>REGISTRATION NO:</strong></td>
                                    <td style="padding: 5px 0;" id="modelRegNumber">${regNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>PROGRAM:</strong></td>
                                    <td style="padding: 5px 0;" id="modelProgram">${program}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>STUDY CENTRE:</strong></td>
                                    <td style="padding: 5px 0;" id="modelCentre">${centre}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>COUNTY:</strong></td>
                                    <td style="padding: 5px 0;" id="modelCounty">${county}</td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-4 text-center">
                            <div style="border: 1px solid #ccc; padding: 10px; display: inline-block;">
                                <div style="width: 120px; height: 150px; background: #f8f9fa; line-height: 150px; color: #666; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-user-graduate fa-3x"></i>
                                </div>
                                <div style="font-size: 12px; color: #666; margin-top: 5px;">Student Photo</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- PROGRAM DETAILS -->
                <div class="program-details mb-4">
                    <div class="row text-center">
                        <div class="col-md-3">
                            <div style="background: #1e3a8a; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">INTAKE DATE</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelIntakeDate">${intakeYear}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #3b82f6; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">COMPLETION DATE</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelCompletionDate">${student.completion_date || 'In Progress'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #10b981; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">DURATION</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelDuration">${student.duration || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #8b5cf6; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">MODE OF STUDY</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelStudyMode">${student.study_mode || 'Full-time'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ACADEMIC PERFORMANCE TABLE -->
                <div class="academic-table mb-4">
                    <h5 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 15px;">
                        <i class="fas fa-graduation-cap"></i> ACADEMIC PERFORMANCE SUMMARY
                    </h5>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #1e3a8a; color: white;">
                                <th style="padding: 12px; text-align: left; width: 8%;">NO.</th>
                                <th style="padding: 12px; text-align: left; width: 12%;">CODE</th>
                                <th style="padding: 12px; text-align: left; width: 40%;">COURSE TITLE</th>
                                <th style="padding: 12px; text-align: center; width: 10%;">CREDITS</th>
                                <th style="padding: 12px; text-align: center; width: 12%;">SCORE %</th>
                                <th style="padding: 12px; text-align: center; width: 18%;">GRADE</th>
                            </tr>
                        </thead>
                        <tbody id="modelCoursesTable">
                            ${courseRows}
                        </tbody>
                    </table>
                </div>
                
                <!-- DETAILED ASSESSMENT MARKS -->
                <div class="detailed-marks-section mb-4">
                    <h5 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 15px;">
                        <i class="fas fa-chart-bar"></i> DETAILED ASSESSMENT MARKS
                    </h5>
                    ${detailedMarksHTML}
                </div>
                
                <!-- SUMMARY & GRADING SCALE -->
                <div class="summary-section mb-4">
                    <div class="row">
                        <div class="col-md-6">
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6;">
                                <h6 style="color: #1e3a8a; margin-bottom: 10px;"><i class="fas fa-calculator"></i> ACADEMIC SUMMARY</h6>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 5px 0;"><strong>Total Credits Attempted:</strong></td>
                                        <td style="padding: 5px 0; text-align: right;">${totalCredits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;"><strong>Total Credits Earned:</strong></td>
                                        <td style="padding: 5px 0; text-align: right;">${earnedCredits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;"><strong>Overall Percentage:</strong></td>
                                        <td style="padding: 5px 0; text-align: right;">${Math.round(avgPercentage)}%</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;"><strong>Cumulative GPA:</strong></td>
                                        <td style="padding: 5px 0; text-align: right;">${data.gpa ? data.gpa.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;"><strong>Final Grade:</strong></td>
                                        <td style="padding: 5px 0; text-align: right;">
                                            <span class="badge ${overallGrade === 'DISTINCTION' ? 'bg-success' : overallGrade === 'CREDIT' ? 'bg-primary' : overallGrade === 'PASS' ? 'bg-warning' : overallGrade === 'FAIL' ? 'bg-danger' : 'bg-secondary'}" style="font-size: 14px; padding: 5px 10px;">
                                                ${overallGrade}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981;">
                                <h6 style="color: #1e3a8a; margin-bottom: 10px;"><i class="fas fa-scale-balanced"></i> GRADING SYSTEM</h6>
                                <table style="width: 100%; font-size: 13px;">
                                    <tr>
                                        <td style="padding: 3px 0;">80% - 100%</td>
                                        <td style="padding: 3px 0; font-weight: bold;">DISTINCTION</td>
                                        <td style="padding: 3px 0; text-align: right;">
                                            <span class="badge bg-success" style="padding: 3px 8px;">Excellent</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0;">70% - 79%</td>
                                        <td style="padding: 3px 0; font-weight: bold;">CREDIT</td>
                                        <td style="padding: 3px 0; text-align: right;">
                                            <span class="badge bg-primary" style="padding: 3px 8px;">Good</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0;">60% - 69%</td>
                                        <td style="padding: 3px 0; font-weight: bold;">PASS</td>
                                        <td style="padding: 3px 0; text-align: right;">
                                            <span class="badge bg-warning" style="padding: 3px 8px;">Satisfactory</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0;">Below 60%</td>
                                        <td style="padding: 3px 0; font-weight: bold;">FAIL</td>
                                        <td style="padding: 3px 0; text-align: right;">
                                            <span class="badge bg-danger" style="padding: 3px 8px;">Repeat</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- FOOTER WITH SIGNATURES -->
                <div class="transcript-footer mt-4 pt-4" style="border-top: 2px solid #1e3a8a;">
                    <div class="row">
                        <div class="col-md-4 text-center">
                            <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 10px;">
                                <div style="font-weight: bold;">REGISTRAR</div>
                                <div style="color: #666; font-size: 14px;">TEE College</div>
                                <div style="color: #666; font-size: 12px;">Date: <span id="issueDate">${issueDate}</span></div>
                            </div>
                        </div>
                        <div class="col-md-4 text-center">
                            <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 10px;">
                                <div style="font-weight: bold;">ACADEMIC DEAN</div>
                                <div style="color: #666; font-size: 14px;">TEE College</div>
                                <div style="color: #666; font-size: 12px;">Stamp & Seal</div>
                            </div>
                        </div>
                        <div class="col-md-4 text-center">
                            <div style="border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 10px;">
                                <div style="font-weight: bold;">CENTRE DIRECTOR</div>
                                <div style="color: #666; font-size: 14px;">${centre}</div>
                                <div style="color: #666; font-size: 12px;">Official Stamp</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- OFFICIAL NOTES -->
                    <div class="official-notes mt-4" style="background: #fef2f2; padding: 10px; border-radius: 5px; font-size: 12px; color: #666;">
                        <p style="margin: 0;"><strong>OFFICIAL NOTES:</strong> This is an official transcript issued by TEE College. Any alteration renders this document invalid. For verification, contact the Registrar's Office.</p>
                        <p style="margin: 5px 0 0 0;"><strong>TRANSCRIPT ID:</strong> <span id="transcriptId">${transcriptId}</span> | <strong>ISSUED ON:</strong> ${issuedOn}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    async generateTranscriptFromUI() {
        try {
            console.log('📄 generateTranscriptFromUI() called - Generating with real marks...');
            
            // Get selected student
            const studentSelect = document.getElementById('transcriptStudent');
            const studentId = studentSelect?.value;
            
            if (!studentId || studentId === '') {
                this.showToast('Please select a student first', 'warning');
                return;
            }
            
            // Get format
            const formatSelect = document.getElementById('transcriptFormat');
            const format = formatSelect?.value || 'pdf';
            
            // Get options
            const options = {
                includeAllAssessments: document.getElementById('includeGrades')?.checked || true,
                includeGPA: document.getElementById('includeGPA')?.checked || true,
                includeRemarks: document.getElementById('includeSignatures')?.checked || true
            };
            
            console.log(`📊 Generating ${format} transcript with real marks for student ${studentId}`);
            
            // Generate the transcript with REAL marks
            await this.generateStudentTranscript(studentId, format, options);
            
        } catch (error) {
            console.error('Error generating transcript from UI:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    downloadCurrentTranscript() {
        if (!this.currentTranscriptData) {
            this.showToast('No transcript loaded to download', 'warning');
            return;
        }
        
        // Get format
        const formatSelect = document.getElementById('transcriptFormat');
        const format = formatSelect?.value || 'pdf';
        
        // Generate and download
        this.generateStudentTranscript(this.currentTranscriptData.student.id, format, {
            includeAllAssessments: true,
            includeGPA: true,
            includeRemarks: true
        });
    }
    
    emailTranscript() {
        if (!this.currentTranscriptData) {
            this.showToast('No transcript loaded to email', 'warning');
            return;
        }
        
        const student = this.currentTranscriptData.student;
        const email = student.email;
        
        if (!email) {
            this.showToast('Student has no email address', 'warning');
            return;
        }
        
        // In a real app, you would send an API request to email the transcript
        this.showToast(`Email would be sent to ${email}`, 'info');
    }
    
    async filterTranscriptStudentsByCenter() {
        try {
            const centreSelect = document.getElementById('transcriptCenterFilter');
            const studentSelect = document.getElementById('transcriptStudent');
            const centreId = centreSelect?.value;
            
            if (!centreId || centreId === 'all') {
                // Show all students
                await this.populateStudentDropdown();
                return;
            }
            
            // Get students for this centre
            const students = await this.db.getStudents();
            const filteredStudents = students.filter(student => 
                student.centre_id === centreId || student.centre === centreId
            );
            
            // Update student dropdown
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            filteredStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.full_name} (${student.reg_number})`;
                studentSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error filtering students:', error);
        }
    }
    
    async populateStudentDropdown() {
        try {
            const students = await this.db.getStudents();
            const studentSelect = document.getElementById('transcriptStudent');
            
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select Student</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.full_name} (${student.reg_number})`;
                    studentSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error populating student dropdown:', error);
        }
    }

    // ==================== MODAL FUNCTIONS ====================
    
    async generateStudentTranscriptPrompt() {
        try {
            // Remove existing modal if any
            const existingModal = document.getElementById('transcriptModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            const modal = document.createElement('div');
            modal.id = 'transcriptModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 1000px;
                    max-height: 85vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                ">
                    <div style="
                        padding: 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; color: #2c3e50;">
                            <i class="fas fa-graduation-cap"></i> Generate Student Transcripts
                        </h3>
                        <button id="closeTranscriptModal" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #7f8c8d;
                        ">&times;</button>
                    </div>
                    
                    <div style="padding: 20px; flex: 1; overflow-y: auto;">
                        <!-- Filters -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 15px;
                            margin-bottom: 20px;
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        ">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-filter"></i> Filter by Program
                                </label>
                                <select id="modalProgramFilter" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    background: white;
                                ">
                                    <option value="all">All Programs</option>
                                    <option value="basic">Basic TEE</option>
                                    <option value="hnc">HNC</option>
                                    <option value="advanced">Advanced TEE</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-calendar"></i> Filter by Intake
                                </label>
                                <select id="modalIntakeFilter" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                    background: white;
                                ">
                                    <option value="all">All Intakes</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                    <option value="2021">2021</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                    <i class="fas fa-search"></i> Search Student
                                </label>
                                <input type="text" id="modalSearch" placeholder="Search by name or reg number" style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 6px;
                                ">
                            </div>
                        </div>
                        
                        <!-- Export Settings -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 20px;
                            margin-bottom: 20px;
                        ">
                            <!-- Format Selection -->
                            <div style="
                                padding: 15px;
                                background: #f8f9fa;
                                border-radius: 8px;
                            ">
                                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                                    <i class="fas fa-file-export"></i> Export Settings
                                </h4>
                                
                                <div style="display: flex; flex-direction: column; gap: 15px;">
                                    <div>
                                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                            Export Format
                                        </label>
                                        <select id="modalFormat" style="
                                            width: 100%;
                                            padding: 8px 12px;
                                            border: 1px solid #ddd;
                                            border-radius: 6px;
                                            background: white;
                                        ">
                                            <option value="pdf">PDF Document</option>
                                            <option value="excel">Excel Spreadsheet</option>
                                            <option value="csv">CSV File</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                            Include Details
                                        </label>
                                        <div style="display: flex; flex-direction: column; gap: 10px;">
                                            <label style="display: flex; align-items: center; gap: 8px;">
                                                <input type="checkbox" id="modalIncludeAllAssessments" checked>
                                                <span>All assessment details</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px;">
                                                <input type="checkbox" id="modalIncludeGPA" checked>
                                                <span>GPA calculation</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px;">
                                                <input type="checkbox" id="modalIncludeRemarks" checked>
                                                <span>Remarks</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Student Selection Table -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 10px;
                            ">
                                <h4 style="margin: 0; color: #2c3e50;">Select Students</h4>
                                <div style="display: flex; gap: 10px;">
                                    <button id="modalSelectAll" style="
                                        padding: 6px 12px;
                                        background: #3498db;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 13px;
                                    ">
                                        <i class="fas fa-check-square"></i> Select All
                                    </button>
                                    <button id="modalDeselectAll" style="
                                        padding: 6px 12px;
                                        background: #e74c3c;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 13px;
                                    ">
                                        <i class="fas fa-times-circle"></i> Deselect All
                                    </button>
                                </div>
                            </div>
                            
                            <div style="
                                max-height: 300px;
                                overflow-y: auto;
                                border: 1px solid #eee;
                                border-radius: 8px;
                            ">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; width: 50px;">
                                                <input type="checkbox" id="modalMasterCheckbox" style="cursor: pointer;">
                                            </th>
                                            <th style="padding: 12px; text-align: left;">Reg Number</th>
                                            <th style="padding: 12px; text-align: left;">Student Name</th>
                                            <th style="padding: 12px; text-align: left;">Program</th>
                                            <th style="padding: 12px; text-align: left;">Intake</th>
                                            <th style="padding: 12px; text-align: left;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modalStudentList">
                                        <tr>
                                            <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
                                                <i class="fas fa-spinner fa-spin"></i> Loading students...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="margin-top: 10px; font-size: 13px; color: #7f8c8d; text-align: right;">
                                <span id="modalSelectedCount">0</span> students selected
                            </div>
                        </div>
                    </div>
                    
                    <div style="
                        padding: 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <button id="modalCancel" style="
                            padding: 10px 20px;
                            background: #95a5a6;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button id="modalGenerate" style="
                            padding: 10px 20px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-download"></i> Generate Transcripts
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            await this.loadModalStudents();
            this.setupModalEvents();
            
        } catch (error) {
            console.error('Error creating transcript modal:', error);
            this.showToast('Error loading transcript interface', 'error');
        }
    }
    
    async loadModalStudents() {
        try {
            const tbody = document.getElementById('modalStudentList');
            
            if (this.cachedStudents) {
                this.renderModalStudentTable(this.cachedStudents);
                return;
            }
            
            const students = await this.db.getStudents();
            this.cachedStudents = students;
            
            if (!students || students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
                            <i class="fas fa-user-graduate"></i>
                            <p style="margin-top: 10px;">No students found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            this.renderModalStudentTable(students);
            
        } catch (error) {
            console.error('Error loading students for modal:', error);
            const tbody = document.getElementById('modalStudentList');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin-top: 10px;">Error loading students</p>
                    </td>
                </tr>
            `;
        }
    }
    
    renderModalStudentTable(students) {
        const tbody = document.getElementById('modalStudentList');
        
        let html = '';
        
        students.forEach((student) => {
            html += `
                <tr class="modal-student-row" 
                    data-id="${student.id}" 
                    data-reg="${student.reg_number}"
                    data-program="${student.program}" 
                    data-intake="${student.intake_year}" 
                    data-name="${student.full_name.toLowerCase()}" 
                    data-reg-lower="${student.reg_number.toLowerCase()}">
                    <td style="padding: 12px;">
                        <input type="checkbox" 
                               class="modal-student-checkbox" 
                               value="${student.id}"
                               data-reg="${student.reg_number}">
                    </td>
                    <td style="padding: 12px;">
                        <strong>${student.reg_number}</strong>
                    </td>
                    <td style="padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <strong>${student.full_name}</strong><br>
                                <small style="color: #7f8c8d;">${student.email || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px;">${student.program}</td>
                    <td style="padding: 12px;">${student.intake_year}</td>
                    <td style="padding: 12px;">
                        <span style="
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 11px;
                            font-weight: 600;
                            background: ${student.status === 'active' ? '#d4edda' : student.status === 'graduated' ? '#cce5ff' : '#f8d7da'};
                            color: ${student.status === 'active' ? '#155724' : student.status === 'graduated' ? '#004085' : '#721c24'};
                        ">
                            ${(student.status || 'active').toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        this.updateModalSelectedCount();
    }
    
    setupModalEvents() {
        // Close modal
        document.getElementById('closeTranscriptModal').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        document.getElementById('modalCancel').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        // Master checkbox
        document.getElementById('modalMasterCheckbox').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.modal-student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            this.updateModalSelectedCount();
        });
        
        // Select all button
        document.getElementById('modalSelectAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.modal-student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = true);
            document.getElementById('modalMasterCheckbox').checked = true;
            this.updateModalSelectedCount();
        });
        
        // Deselect all button
        document.getElementById('modalDeselectAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.modal-student-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            document.getElementById('modalMasterCheckbox').checked = false;
            this.updateModalSelectedCount();
        });
        
        // Individual checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('modal-student-checkbox')) {
                this.updateModalSelectedCount();
            }
        });
        
        // Filters
        const filterInputs = ['modalProgramFilter', 'modalIntakeFilter', 'modalSearch'];
        filterInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.filterModalStudents());
                if (inputId === 'modalSearch') {
                    element.addEventListener('input', () => {
                        clearTimeout(this.modalSearchTimeout);
                        this.modalSearchTimeout = setTimeout(() => {
                            this.filterModalStudents();
                        }, 300);
                    });
                }
            }
        });
        
        // Generate button
        document.getElementById('modalGenerate').addEventListener('click', async () => {
            const selectedStudents = Array.from(document.querySelectorAll('.modal-student-checkbox:checked'))
                .map(cb => ({ id: cb.value, reg: cb.dataset.reg }));
            
            if (selectedStudents.length === 0) {
                this.showToast('Please select at least one student', 'warning');
                return;
            }
            
            const format = document.getElementById('modalFormat').value;
            const options = {
                includeAllAssessments: document.getElementById('modalIncludeAllAssessments').checked,
                includeGPA: document.getElementById('modalIncludeGPA').checked,
                includeRemarks: document.getElementById('modalIncludeRemarks').checked
            };
            
            const btn = document.getElementById('modalGenerate');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btn.disabled = true;
            
            try {
                if (selectedStudents.length === 1) {
                    await this.generateStudentTranscript(selectedStudents[0].id, format, options);
                } else {
                    await this.generateTranscriptsBatch(selectedStudents.map(s => s.id), format, options);
                }
                
                setTimeout(() => {
                    const modal = document.getElementById('transcriptModal');
                    if (modal) modal.remove();
                }, 1000);
                
            } catch (error) {
                console.error('Error generating transcripts:', error);
                this.showToast('Error generating transcripts', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
    
    filterModalStudents() {
        const programFilter = document.getElementById('modalProgramFilter').value;
        const intakeFilter = document.getElementById('modalIntakeFilter').value;
        const searchTerm = document.getElementById('modalSearch').value.toLowerCase();
        
        const rows = document.querySelectorAll('.modal-student-row');
        
        rows.forEach(row => {
            const program = row.dataset.program;
            const intake = row.dataset.intake;
            const name = row.dataset.name;
            const reg = row.dataset.regLower;
            
            let shouldShow = true;
            
            if (programFilter !== 'all' && program !== programFilter) {
                shouldShow = false;
            }
            
            if (intakeFilter !== 'all' && intake !== intakeFilter) {
                shouldShow = false;
            }
            
            if (searchTerm && !name.includes(searchTerm) && !reg.includes(searchTerm)) {
                shouldShow = false;
            }
            
            if (shouldShow) {
                row.style.display = '';
                const checkbox = row.querySelector('.modal-student-checkbox');
                checkbox.disabled = false;
            } else {
                row.style.display = 'none';
                const checkbox = row.querySelector('.modal-student-checkbox');
                checkbox.disabled = true;
                checkbox.checked = false;
            }
        });
        
        const visibleCheckboxes = document.querySelectorAll('.modal-student-checkbox:not(:disabled)');
        const allChecked = visibleCheckboxes.length > 0 && 
            Array.from(visibleCheckboxes).every(cb => cb.checked);
        document.getElementById('modalMasterCheckbox').checked = allChecked;
        
        this.updateModalSelectedCount();
    }
    
    updateModalSelectedCount() {
        const selectedCount = document.querySelectorAll('.modal-student-checkbox:checked').length;
        document.getElementById('modalSelectedCount').textContent = selectedCount;
        
        const btn = document.getElementById('modalGenerate');
        if (selectedCount === 0) {
            btn.innerHTML = '<i class="fas fa-download"></i> Generate Transcripts';
        } else if (selectedCount === 1) {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate 1 Transcript`;
        } else {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate ${selectedCount} Transcripts`;
        }
    }

    // ==================== TRANSCRIPT GENERATION ====================
    
    async generateStudentTranscript(studentId, format = 'pdf', options = {}) {
        try {
            console.log(`📚 Generating transcript for student ID: ${studentId}`);
            
            let student;
            if (typeof studentId === 'string' && !studentId.includes('-') && studentId.length < 36) {
                // This looks like a registration number
                const students = await this.db.getStudents();
                student = students.find(s => s.reg_number === studentId);
                
                if (!student) {
                    throw new Error(`Student with registration number "${studentId}" not found`);
                }
                
                studentId = student.id;
            } else {
                student = await this.db.getStudent(studentId);
            }
            
            if (!student) {
                throw new Error('Student not found');
            }
            
            const transcriptData = await this.prepareTranscriptData(studentId, options);
            this.currentTranscriptData = transcriptData;
            
            // If format is 'print', show HTML preview instead
            if (format === 'print' || format === 'digital') {
                this.displayTranscriptInHTML(transcriptData);
                this.showToast(`Transcript preview loaded for ${student.full_name}`, 'success');
            } else {
                await this.exportTranscript(transcriptData, format, options);
                this.showToast(`Transcript generated for ${student.full_name}`, 'success');
            }
            
            if (this.db.logActivity) {
                await this.db.logActivity('transcript_generated', 
                    `Generated transcript for ${student.full_name} (${student.reg_number})`);
            }
            
            return transcriptData;
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            let errorMessage = 'Error generating transcript';
            if (error.message.includes('invalid input syntax for type uuid')) {
                errorMessage = 'Invalid student identifier. Please refresh and try again.';
            } else if (error.message.includes('not found')) {
                errorMessage = error.message;
            }
            
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }
    
    // ==================== FIXED PREPARETRANSCRIPTDATA METHOD ====================
    
    async prepareTranscriptData(studentId, options = {}) {
        console.log(`📊 Preparing transcript data for student ID: ${studentId}`);
        
        const student = await this.db.getStudent(studentId);
        if (!student) {
            throw new Error('Student not found');
        }
        
        // Get REAL marks from database
        let marks = [];
        try {
            marks = await this.db.getStudentMarks(studentId);
            console.log(`📚 Found ${marks.length} mark records for student`);
            
            // Log the first mark to see its structure
            if (marks.length > 0) {
                console.log('Sample mark structure:', marks[0]);
            }
        } catch (error) {
            console.warn('Error fetching marks, using empty array:', error);
            marks = [];
        }
        
        // Get GPA
        let gpa;
        try {
            gpa = await this.db.calculateStudentGPA(studentId);
            console.log(`📊 GPA calculated: ${gpa}`);
        } catch (error) {
            console.warn('Error calculating GPA:', error);
            gpa = 0.0;
        }
        
        // Get all courses for reference
        let allCourses = [];
        try {
            allCourses = await this.db.getCourses();
            console.log(`📚 Loaded ${allCourses.length} courses for reference`);
        } catch (error) {
            console.warn('Could not load courses:', error);
            allCourses = [];
        }
        
        // Create a lookup map for courses by ID
        const courseMap = {};
        allCourses.forEach(course => {
            courseMap[course.id] = course;
        });
        
        // Organize marks by course
        const courses = {};
        
        if (marks.length > 0) {
            for (const mark of marks) {
                // Get the course ID from the mark
                const courseId = mark.course_id;
                
                if (!courseId) {
                    console.warn('Mark has no course_id:', mark);
                    continue;
                }
                
                // Find the course in our map
                const course = courseMap[courseId];
                
                // Determine course code and name
                let courseCode = 'N/A';
                let courseName = 'Unknown Course';
                let credits = 3;
                
                if (course) {
                    courseCode = course.course_code || course.code || courseId.substring(0, 8);
                    courseName = course.course_name || course.name || 'Unknown Course';
                    credits = course.credits || 3;
                } else {
                    console.warn(`Course not found for ID: ${courseId}`);
                    courseCode = `COURSE-${courseId.substring(0, 6)}`;
                    courseName = 'Course Details Unavailable';
                }
                
                // Initialize course if not exists
                if (!courses[courseCode]) {
                    courses[courseCode] = {
                        courseCode: courseCode,
                        courseName: courseName,
                        assessments: [],
                        finalGrade: '',
                        credits: credits,
                        courseId: courseId
                    };
                }
                
                // Add assessment to course
                if (options.includeAllAssessments !== false) {
                    // Calculate percentage if not provided
                    let percentage = mark.percentage;
                    if (percentage === undefined && mark.score !== undefined && mark.max_score) {
                        percentage = (mark.score / mark.max_score) * 100;
                    }
                    
                    courses[courseCode].assessments.push({
                        name: mark.assessment_name || 'Assessment',
                        type: mark.assessment_type || 'Unknown',
                        score: mark.score || 0,
                        maxScore: mark.max_score || 100,
                        percentage: percentage || 0,
                        grade: mark.grade || 'F',
                        remarks: options.includeRemarks !== false ? (mark.remarks || '') : '',
                        date: mark.assessment_date || null
                    });
                }
            }
            
            // Calculate final grades for each course
            Object.values(courses).forEach(course => {
                if (course.assessments.length > 0) {
                    // Calculate average percentage from all assessments in this course
                    const totalPercentage = course.assessments
                        .reduce((sum, a) => sum + (a.percentage || 0), 0);
                    const avgPercentage = course.assessments.length > 0 ? 
                        totalPercentage / course.assessments.length : 0;
                    
                    // Determine final grade based on average percentage
                    if (avgPercentage >= 80) course.finalGrade = 'DISTINCTION';
                    else if (avgPercentage >= 70) course.finalGrade = 'CREDIT';
                    else if (avgPercentage >= 60) course.finalGrade = 'PASS';
                    else if (avgPercentage > 0) course.finalGrade = 'FAIL';
                    else course.finalGrade = 'N/A';
                    
                    console.log(`Course ${course.courseCode}: avg ${avgPercentage.toFixed(1)}% -> ${course.finalGrade}`);
                }
            });
        } else {
            console.log('⚠️ No marks found for this student');
        }
        
        const filteredCourses = Object.values(courses);
        console.log(`✅ Processed ${filteredCourses.length} courses with marks`);
        
        // Log the courses we found
        filteredCourses.forEach(course => {
            console.log(`  - ${course.courseCode}: ${course.courseName} (${course.assessments.length} assessments)`);
        });
        
        return {
            student: student,
            courses: filteredCourses,
            gpa: options.includeGPA !== false ? parseFloat(gpa.toFixed(2)) : null,
            totalCredits: filteredCourses.reduce((sum, course) => sum + (course.credits || 3), 0),
            generatedDate: new Date().toLocaleDateString(),
            generatedDateTime: new Date().toISOString(),
            options: options
        };
    }
    
    async exportTranscript(transcriptData, format, options = {}) {
        console.log(`📄 Exporting transcript in format: ${format}`);
        
        // Directly call the appropriate method without using bind in a way that causes issues
        if (format === 'pdf') {
            return await this.generateTranscriptPDF(transcriptData, options);
        } else if (format === 'excel') {
            return await this.generateTranscriptExcel(transcriptData, options);
        } else if (format === 'csv') {
            return await this.generateTranscriptCSV(transcriptData, options);
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }
    }
    
    async generateTranscriptsBatch(studentIds, format, options) {
        const total = studentIds.length;
        
        if (total === 0) {
            this.showToast('No students selected', 'warning');
            return;
        }
        
        const results = [];
        
        for (let i = 0; i < studentIds.length; i++) {
            try {
                const result = await this.generateStudentTranscript(studentIds[i], format, {
                    ...options,
                    batchMode: true
                });
                
                results.push({ success: true, data: result });
                
                // Update progress
                const progress = Math.round(((i + 1) / total) * 100);
                console.log(`Progress: ${progress}% (${i + 1}/${total})`);
                
            } catch (error) {
                console.error(`Error processing student ${studentIds[i]}:`, error);
                results.push({ success: false, error: error.message, studentId: studentIds[i] });
            }
            
            // Small delay to prevent overwhelming the browser
            if (i < studentIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (failed.length > 0) {
            this.showToast(`Generated ${successful.length} transcripts, ${failed.length} failed`, 'warning');
        } else {
            this.showToast(`Successfully generated ${successful.length} transcripts`, 'success');
        }
        
        return results;
    }
    
    // ==================== FORMAT-SPECIFIC EXPORTS ====================
    
  
            
           async generateTranscriptPDF(data, options) {
    try {
        console.log('📄 Generating PDF transcript for:', data.student.full_name);
        
        if (typeof jspdf === 'undefined') {
            this.showToast('Error: jsPDF library not loaded. Please add it to your HTML.', 'error');
            throw new Error('jsPDF not loaded');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 20;
        
        // ==================== HEADER WITH SEAL ====================
        
        // Official Seal (circle)
        doc.setDrawColor(30, 58, 138); // #1e3a8a
        doc.setFillColor(255, 255, 255);
        doc.circle(40, 35, 15, 'S');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text('OFFICIAL', 32, 35);
        doc.text('SEAL', 37, 40);
        
        // Institution Name
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138); // #1e3a8a
        doc.text('THEOLOGICAL EXTENSION BY EDUCATION', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246); // #3b82f6
        doc.text('TEE COLLEGE', pageWidth / 2, 35, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 102, 102); // #666
        doc.text('Accredited Theological Institution', pageWidth / 2, 42, { align: 'center' });
        
        // Official Transcript Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138); // #1e3a8a
        doc.text('OFFICIAL ACADEMIC TRANSCRIPT', pageWidth / 2, 55, { align: 'center' });
        
        // Draw line under title
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.line(margin, 60, pageWidth - margin, 60);
        
        yPos = 70;
        
        // ==================== STUDENT INFORMATION ====================
        
        // Background for student info
        doc.setFillColor(248, 250, 252); // #f8fafc
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 45, 'F');
        
        // Student details in table format
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        // Left column
        doc.text('FULL NAME:', margin + 5, yPos);
        doc.text('REGISTRATION NO:', margin + 5, yPos + 8);
        doc.text('PROGRAM:', margin + 5, yPos + 16);
        doc.text('STUDY CENTRE:', margin + 5, yPos + 24);
        doc.text('COUNTY:', margin + 5, yPos + 32);
        
        // Right column (values) - CONVERT ALL TO STRINGS
        doc.setFont('helvetica', 'normal');
        doc.text(String(data.student.full_name || 'N/A'), margin + 55, yPos);
        doc.text(String(data.student.reg_number || 'N/A'), margin + 55, yPos + 8);
        doc.text(String(data.student.program || 'N/A'), margin + 55, yPos + 16);
        doc.text(String(data.student.centre_name || data.student.centre || 'N/A'), margin + 55, yPos + 24);
        doc.text(String(data.student.county || 'N/A'), margin + 55, yPos + 32);
        
        // Student Photo placeholder
        doc.setDrawColor(204, 204, 204);
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(pageWidth - 70, yPos - 5, 50, 50, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(102, 102, 102);
        doc.text('Student', pageWidth - 55, yPos + 20);
        doc.text('Photo', pageWidth - 53, yPos + 28);
        
        yPos += 50;
        
        // ==================== PROGRAM DETAILS ====================
        
        // Four colored boxes
        const boxWidth = (pageWidth - (margin * 2) - 30) / 4;
        
        // Intake Date - CONVERT TO STRING
        doc.setFillColor(30, 58, 138); // #1e3a8a
        doc.rect(margin, yPos, boxWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('INTAKE DATE', margin + 5, yPos + 8);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(String(data.student.intake_year || 'N/A'), margin + 5, yPos + 20);
        
        // Completion Date - CONVERT TO STRING
        doc.setFillColor(59, 130, 246); // #3b82f6
        doc.rect(margin + boxWidth + 10, yPos, boxWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('COMPLETION DATE', margin + boxWidth + 15, yPos + 8);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(String(data.student.completion_date || 'In Progress'), margin + boxWidth + 15, yPos + 20);
        
        // Duration - CONVERT TO STRING
        doc.setFillColor(16, 185, 129); // #10b981
        doc.rect(margin + (boxWidth + 10) * 2, yPos, boxWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('DURATION', margin + (boxWidth + 10) * 2 + 5, yPos + 8);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(String(data.student.duration || 'N/A'), margin + (boxWidth + 10) * 2 + 5, yPos + 20);
        
        // Mode of Study - CONVERT TO STRING
        doc.setFillColor(139, 92, 246); // #8b5cf6
        doc.rect(margin + (boxWidth + 10) * 3, yPos, boxWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('MODE OF STUDY', margin + (boxWidth + 10) * 3 + 5, yPos + 8);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(String(data.student.study_mode || 'Full-time'), margin + (boxWidth + 10) * 3 + 5, yPos + 20);
        
        yPos += 35;
        
        // ==================== ACADEMIC PERFORMANCE SUMMARY ====================
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('ACADEMIC PERFORMANCE SUMMARY', margin, yPos);
        
        yPos += 10;
        
        // Table headers
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        const col1 = margin + 5;
        const col2 = margin + 25;
        const col3 = margin + 70;
        const col4 = margin + 140;
        const col5 = margin + 160;
        const col6 = margin + 180;
        
        doc.text('NO.', col1, yPos);
        doc.text('CODE', col2, yPos);
        doc.text('COURSE TITLE', col3, yPos);
        doc.text('CREDITS', col4, yPos);
        doc.text('SCORE %', col5, yPos);
        doc.text('GRADE', col6, yPos);
        
        yPos += 8;
        
        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        data.courses.forEach((course, index) => {
            // Calculate course percentage
            let coursePercentage = 0;
            if (course.assessments && course.assessments.length > 0) {
                const total = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                coursePercentage = Math.round(total / course.assessments.length);
            }
            
            // Set color based on grade
            if (course.finalGrade === 'DISTINCTION') {
                doc.setTextColor(22, 163, 74); // green
            } else if (course.finalGrade === 'CREDIT') {
                doc.setTextColor(59, 130, 246); // blue
            } else if (course.finalGrade === 'PASS') {
                doc.setTextColor(245, 158, 11); // orange
            } else if (course.finalGrade === 'FAIL') {
                doc.setTextColor(220, 38, 38); // red
            } else {
                doc.setTextColor(0, 0, 0);
            }
            
            // CONVERT ALL TO STRINGS
            doc.text(String(index + 1), col1, yPos);
            doc.text(String(course.courseCode || 'N/A'), col2, yPos);
            
            // Truncate long course names
            let courseName = course.courseName || 'Unknown';
            if (courseName.length > 30) {
                courseName = courseName.substring(0, 27) + '...';
            }
            doc.text(String(courseName), col3, yPos);
            doc.text(String(course.credits || 3), col4, yPos);
            doc.text(coursePercentage > 0 ? coursePercentage + '%' : '—', col5, yPos);
            doc.text(String(course.finalGrade || 'N/A'), col6, yPos);
            
            yPos += 7;
            
            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }
        });
        
        yPos += 10;
        
        // ==================== DETAILED ASSESSMENT MARKS ====================
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('DETAILED ASSESSMENT MARKS', margin, yPos);
        
        yPos += 10;
        
        data.courses.forEach((course, courseIndex) => {
            if (course.assessments && course.assessments.length > 0) {
                // Calculate course total percentage
                let totalScore = 0;
                let maxScore = 0;
                course.assessments.forEach(a => {
                    totalScore += a.score || 0;
                    maxScore += a.maxScore || 100;
                });
                const coursePercentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0;
                
                // Course header
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 58, 138);
                doc.text(String(course.courseCode || 'N/A') + ' - ' + String(course.courseName || 'Unknown'), margin, yPos);
                
                // Course total and grade on same line
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(102, 102, 102);
                
                doc.text(`Course Total: ${coursePercentage}% | Final Grade: ${course.finalGrade || 'N/A'}`, 
                         pageWidth - margin - 80, yPos);
                
                yPos += 7;
                
                // Assessment table headers
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 6, 'F');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                
                const aCol1 = margin + 5;
                const aCol2 = margin + 25;
                const aCol3 = margin + 80;
                const aCol4 = margin + 120;
                const aCol5 = margin + 150;
                const aCol6 = margin + 170;
                const aCol7 = margin + 190;
                
                doc.text('#', aCol1, yPos);
                doc.text('Assessment', aCol2, yPos);
                doc.text('Type', aCol3, yPos);
                doc.text('Score', aCol4, yPos);
                doc.text('%', aCol5, yPos);
                doc.text('Grade', aCol6, yPos);
                doc.text('Remarks', aCol7, yPos);
                
                yPos += 6;
                
                // Assessment rows
                doc.setFont('helvetica', 'normal');
                course.assessments.forEach((assessment, aIndex) => {
                    // Color based on percentage
                    if (assessment.percentage >= 80) {
                        doc.setTextColor(22, 163, 74);
                    } else if (assessment.percentage >= 70) {
                        doc.setTextColor(59, 130, 246);
                    } else if (assessment.percentage >= 60) {
                        doc.setTextColor(245, 158, 11);
                    } else {
                        doc.setTextColor(220, 38, 38);
                    }
                    
                    doc.text(String(aIndex + 1), aCol1, yPos);
                    
                    let assessName = assessment.name || 'Assessment';
                    if (assessName.length > 15) assessName = assessName.substring(0, 12) + '...';
                    doc.text(String(assessName), aCol2, yPos);
                    
                    doc.text(String(assessment.type || 'N/A'), aCol3, yPos);
                    doc.text(String(assessment.score || 0) + '/' + String(assessment.maxScore || 100), aCol4, yPos);
                    doc.text(String((assessment.percentage || 0).toFixed(1)) + '%', aCol5, yPos);
                    doc.text(String(assessment.grade || 'N/A'), aCol6, yPos);
                    
                    let remarks = assessment.remarks || '';
                    if (remarks.length > 10) remarks = remarks.substring(0, 7) + '...';
                    doc.text(String(remarks), aCol7, yPos);
                    
                    yPos += 6;
                    
                    // Check if we need a new page
                    if (yPos > pageHeight - 80) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                
                yPos += 5;
            }
        });
        
        // ==================== SUMMARY & GRADING SCALE ====================
        
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = 20;
        }
        
        // Calculate totals
        const totalCredits = data.courses.reduce((sum, course) => sum + (course.credits || 3), 0);
        const earnedCredits = data.courses.filter(c => 
            c.finalGrade && c.finalGrade !== 'FAIL' && c.finalGrade !== 'N/A'
        ).reduce((sum, course) => sum + (course.credits || 3), 0);
        
        // Calculate average percentage
        let totalPercentage = 0;
        let coursesWithMarks = 0;
        data.courses.forEach(course => {
            if (course.assessments && course.assessments.length > 0) {
                const courseTotal = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                const courseAvg = course.assessments.length > 0 ? courseTotal / course.assessments.length : 0;
                totalPercentage += courseAvg;
                coursesWithMarks++;
            }
        });
        const avgPercentage = coursesWithMarks > 0 ? Math.round(totalPercentage / coursesWithMarks) : 0;
        
        // Determine overall grade
        let overallGrade = 'PASS';
        if (avgPercentage >= 80) overallGrade = 'DISTINCTION';
        else if (avgPercentage >= 70) overallGrade = 'CREDIT';
        else if (avgPercentage >= 60) overallGrade = 'PASS';
        else if (avgPercentage > 0) overallGrade = 'FAIL';
        else overallGrade = 'NO MARKS';
        
        // Left column - Academic Summary
        doc.setFillColor(240, 249, 255);
        doc.rect(margin, yPos - 5, (pageWidth - (margin * 2) - 20) / 2, 50, 'F');
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(1);
        doc.line(margin, yPos - 5, margin, yPos + 45);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('ACADEMIC SUMMARY', margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        let summaryY = yPos + 8;
        doc.text('Total Credits Attempted:', margin + 5, summaryY);
        doc.text(String(totalCredits), margin + 80, summaryY);
        
        summaryY += 6;
        doc.text('Total Credits Earned:', margin + 5, summaryY);
        doc.text(String(earnedCredits), margin + 80, summaryY);
        
        summaryY += 6;
        doc.text('Overall Percentage:', margin + 5, summaryY);
        doc.text(avgPercentage + '%', margin + 80, summaryY);
        
        summaryY += 6;
        doc.text('Cumulative GPA:', margin + 5, summaryY);
        doc.text(String(data.gpa ? data.gpa.toFixed(2) : 'N/A'), margin + 80, summaryY);
        
        summaryY += 6;
        doc.text('Final Grade:', margin + 5, summaryY);
        
        // Color for final grade
        if (overallGrade === 'DISTINCTION') doc.setTextColor(22, 163, 74);
        else if (overallGrade === 'CREDIT') doc.setTextColor(59, 130, 246);
        else if (overallGrade === 'PASS') doc.setTextColor(245, 158, 11);
        else if (overallGrade === 'FAIL') doc.setTextColor(220, 38, 38);
        
        doc.text(String(overallGrade), margin + 80, summaryY);
        
        // Right column - Grading System
        doc.setFillColor(240, 253, 244);
        doc.rect(margin + (pageWidth - (margin * 2) - 20) / 2 + 10, yPos - 5, (pageWidth - (margin * 2) - 20) / 2, 50, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1);
        doc.line(margin + (pageWidth - (margin * 2) - 20) / 2 + 10, yPos - 5, 
                margin + (pageWidth - (margin * 2) - 20) / 2 + 10, yPos + 45);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('GRADING SYSTEM', margin + (pageWidth - (margin * 2) - 20) / 2 + 15, yPos);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        let gradingY = yPos + 8;
        
        doc.setTextColor(0, 0, 0);
        doc.text('80% - 100%', margin + (pageWidth - (margin * 2) - 20) / 2 + 15, gradingY);
        doc.setTextColor(22, 163, 74);
        doc.text('DISTINCTION', margin + (pageWidth - (margin * 2) - 20) / 2 + 70, gradingY);
        doc.setTextColor(102, 102, 102);
        doc.text('Excellent', margin + (pageWidth - (margin * 2) - 20) / 2 + 120, gradingY);
        
        gradingY += 6;
        doc.setTextColor(0, 0, 0);
        doc.text('70% - 79%', margin + (pageWidth - (margin * 2) - 20) / 2 + 15, gradingY);
        doc.setTextColor(59, 130, 246);
        doc.text('CREDIT', margin + (pageWidth - (margin * 2) - 20) / 2 + 70, gradingY);
        doc.setTextColor(102, 102, 102);
        doc.text('Good', margin + (pageWidth - (margin * 2) - 20) / 2 + 120, gradingY);
        
        gradingY += 6;
        doc.setTextColor(0, 0, 0);
        doc.text('60% - 69%', margin + (pageWidth - (margin * 2) - 20) / 2 + 15, gradingY);
        doc.setTextColor(245, 158, 11);
        doc.text('PASS', margin + (pageWidth - (margin * 2) - 20) / 2 + 70, gradingY);
        doc.setTextColor(102, 102, 102);
        doc.text('Satisfactory', margin + (pageWidth - (margin * 2) - 20) / 2 + 120, gradingY);
        
        gradingY += 6;
        doc.setTextColor(0, 0, 0);
        doc.text('Below 60%', margin + (pageWidth - (margin * 2) - 20) / 2 + 15, gradingY);
        doc.setTextColor(220, 38, 38);
        doc.text('FAIL', margin + (pageWidth - (margin * 2) - 20) / 2 + 70, gradingY);
        doc.setTextColor(102, 102, 102);
        doc.text('Repeat', margin + (pageWidth - (margin * 2) - 20) / 2 + 120, gradingY);
        
        yPos += 55;
        
        // ==================== FOOTER WITH SIGNATURES ====================
        
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
        }
        
        // Top border
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(1);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        // Signatures
        const sigWidth = (pageWidth - (margin * 2) - 40) / 3;
        
        // Registrar
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('REGISTRAR', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(102, 102, 102);
        doc.text('TEE College', margin, yPos + 6);
        doc.text('Date: ' + new Date().toLocaleDateString('en-GB'), margin, yPos + 12);
        
        // Academic Dean
        doc.text('ACADEMIC DEAN', margin + sigWidth + 20, yPos);
        doc.text('TEE College', margin + sigWidth + 20, yPos + 6);
        doc.text('Stamp & Seal', margin + sigWidth + 20, yPos + 12);
        
        // Centre Director
        doc.text('CENTRE DIRECTOR', margin + (sigWidth + 20) * 2, yPos);
        doc.text(String(data.student.centre_name || data.student.centre || 'N/A'), margin + (sigWidth + 20) * 2, yPos + 6);
        doc.text('Official Stamp', margin + (sigWidth + 20) * 2, yPos + 12);
        
        yPos += 20;
        
        // Official Notes
        doc.setFillColor(254, 242, 242);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102);
        doc.text('OFFICIAL NOTES: This is an official transcript issued by TEE College. Any alteration renders this document invalid. For verification, contact the Registrar\'s Office.', 
                 margin + 5, yPos + 5);
        
        const transcriptId = `TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`;
        const issuedOn = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        doc.text('TRANSCRIPT ID: ' + transcriptId + ' | ISSUED ON: ' + issuedOn, 
                 margin + 5, yPos + 12);
        
        // Save the PDF
        const fileName = `Transcript_${data.student.reg_number}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        console.log('✅ PDF generated matching preview:', fileName);
        this.showToast(`PDF transcript generated for ${data.student.full_name}`, 'success');
        
        return fileName;
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        this.showToast('Error generating PDF: ' + error.message, 'error');
        throw error;
    }
}
    
    // ==================== UTILITY FUNCTIONS ====================
    
    showToast(message, type = 'info') {
        console.log(`📢 ${type}: ${message}`);
        
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed; 
                top: 20px; 
                right: 20px; 
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
        
        toast.innerHTML = `
            <span style="font-size: 18px; font-weight: bold;">${icon}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.8;
            ">×</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 300);
            }
        }, 5000);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TranscriptsManager = TranscriptsManager;
}
