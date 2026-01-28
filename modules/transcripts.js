// modules/transcripts.js - COMPLETE FIXED VERSION WITH DETAILED MARKS
class TranscriptsManager {
    constructor(db) {
        console.log('🎓 TranscriptsManager initialized');
        this.db = db;
        this.cachedStudents = null;
        this.currentTranscriptData = null;
        this.app = window.app || window;
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
    loadSampleTranscript() {
        console.log('📄 TranscriptsManager.loadSampleTranscript() called');
        return this.loadSampleTranscript();
    }
    
    // Alias for reports compatibility
    previewTranscript() {
        console.log('📄 TranscriptsManager.previewTranscript() called');
        return this.previewTranscript();
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
    
    // Bulk generation function
    generateTranscriptsBatch(filter = 'all', format = 'pdf') {
        console.log(`📄 Bulk generation: ${filter} students in ${format} format`);
        this.showToast(`Bulk generation for ${filter} students started`, 'info');
        // This is a placeholder - you'll need to implement the actual logic
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
            // Get selected student from dropdown
            const studentSelect = document.getElementById('transcriptStudent');
            const studentId = studentSelect?.value;
            
            if (!studentId || studentId === '') {
                this.showToast('Please select a student first', 'warning');
                return;
            }
            
            // Get options from checkboxes
            const options = {
                includeAllAssessments: document.getElementById('includeGrades')?.checked || true,
                includeGPA: document.getElementById('includeGPA')?.checked || true,
                includeRemarks: document.getElementById('includeSignatures')?.checked || true
            };
            
            // Prepare transcript data
            const transcriptData = await this.prepareTranscriptData(studentId, options);
            this.currentTranscriptData = transcriptData;
            
            // Display in HTML
            this.displayTranscriptInHTML(transcriptData);
            
            this.showToast('Transcript preview loaded', 'success');
            
        } catch (error) {
            console.error('Error previewing transcript:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    displayTranscriptInHTML(transcriptData) {
        try {
            // Get the preview container
            const previewContainer = document.getElementById('transcriptPreview');
            const contentDiv = document.getElementById('transcriptPreviewContent');
            
            if (!previewContainer || !contentDiv) {
                console.error('Transcript preview elements not found');
                return;
            }
            
            // Generate transcript HTML
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
        // Calculate overall statistics
        const totalCredits = data.courses.reduce((sum, course) => sum + (course.credits || 3), 0);
        const earnedCredits = data.courses.filter(course => 
            course.finalGrade && course.finalGrade !== 'FAIL'
        ).reduce((sum, course) => sum + (course.credits || 3), 0);
        
        // Calculate average percentage
        const percentages = data.courses
            .filter(course => course.assessments && course.assessments.length > 0)
            .map(course => {
                const total = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                return course.assessments.length > 0 ? total / course.assessments.length : 0;
            });
        
        const avgPercentage = percentages.length > 0 ? 
            percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
        
        // Determine overall grade
        let overallGrade = 'PASS';
        if (avgPercentage >= 80) overallGrade = 'DISTINCTION';
        else if (avgPercentage >= 70) overallGrade = 'CREDIT';
        else if (avgPercentage < 60) overallGrade = 'FAIL';
        
        // Get current date
        const currentDate = new Date();
        const issueDate = currentDate.toLocaleDateString('en-GB');
        const issuedOn = currentDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const transcriptId = `TRX-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}-001`;
        
        // Generate course rows
        let courseRows = '';
        data.courses.forEach((course, index) => {
            let gradeClass = '';
            if (course.finalGrade === 'DISTINCTION') gradeClass = 'bg-success';
            else if (course.finalGrade === 'CREDIT') gradeClass = 'bg-primary';
            else if (course.finalGrade === 'PASS') gradeClass = 'bg-warning';
            else if (course.finalGrade === 'FAIL') gradeClass = 'bg-danger';
            
            // Calculate course percentage
            let coursePercentage = 0;
            if (course.assessments && course.assessments.length > 0) {
                const total = course.assessments.reduce((sum, a) => sum + (a.percentage || 0), 0);
                coursePercentage = Math.round(total / course.assessments.length);
            }
            
            courseRows += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; text-align: center;">${index + 1}</td>
                    <td style="padding: 10px;">${course.courseCode}</td>
                    <td style="padding: 10px;">${course.courseName}</td>
                    <td style="padding: 10px; text-align: center;">${course.credits || 3}</td>
                    <td style="padding: 10px; text-align: center;">${coursePercentage}%</td>
                    <td style="padding: 10px; text-align: center;">
                        <span class="badge ${gradeClass}" style="padding: 5px 10px; font-weight: bold;">
                            ${course.finalGrade || 'N/A'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        // Generate detailed marks section for each course
        let detailedMarksHTML = '';
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
                            <td style="padding: 8px;">${assessment.name}</td>
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
                    <div class="course-marks-section mb-4" style="margin-top: 20px;">
                        <h6 style="color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">
                            <i class="fas fa-book"></i> ${course.courseCode} - ${course.courseName}
                            <span style="float: right; font-size: 14px; color: #666;">
                                Course Total: ${coursePercentage}% | Final Grade: 
                                <span class="badge ${course.finalGrade === 'DISTINCTION' ? 'bg-success' : course.finalGrade === 'CREDIT' ? 'bg-primary' : course.finalGrade === 'PASS' ? 'bg-warning' : 'bg-danger'}" 
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
                                    <td style="padding: 5px 0;" id="modelStudentName">${data.student.full_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>REGISTRATION NO:</strong></td>
                                    <td style="padding: 5px 0;" id="modelRegNumber">${data.student.reg_number}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>PROGRAM:</strong></td>
                                    <td style="padding: 5px 0;" id="modelProgram">${data.student.program}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>STUDY CENTRE:</strong></td>
                                    <td style="padding: 5px 0;" id="modelCentre">${data.student.centre || 'Main Campus'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;"><strong>COUNTY:</strong></td>
                                    <td style="padding: 5px 0;" id="modelCounty">${data.student.county || 'N/A'}</td>
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
                                <div style="font-size: 16px; font-weight: bold;" id="modelIntakeDate">${data.student.intake_year || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #3b82f6; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">COMPLETION DATE</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelCompletionDate">${data.student.completion_date || 'In Progress'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #10b981; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">DURATION</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelDuration">${data.student.duration || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div style="background: #8b5cf6; color: white; padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px;">MODE OF STUDY</div>
                                <div style="font-size: 16px; font-weight: bold;" id="modelStudyMode">${data.student.study_mode || 'Full-time'}</div>
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
                                            <span class="badge ${overallGrade === 'DISTINCTION' ? 'bg-success' : overallGrade === 'CREDIT' ? 'bg-primary' : overallGrade === 'PASS' ? 'bg-warning' : 'bg-danger'}" style="font-size: 14px; padding: 5px 10px;">
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
                                <div style="color: #666; font-size: 14px;">${data.student.centre || 'Main Campus'}</div>
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
            
            // Generate the transcript
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
            
            await this.db.logActivity('transcript_generated', 
                `Generated transcript for ${student.full_name} (${student.reg_number})`);
            
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
    
    async prepareTranscriptData(studentId, options = {}) {
        const student = await this.db.getStudent(studentId);
        if (!student) {
            throw new Error('Student not found');
        }
        
        let marks;
        try {
            marks = await this.db.getStudentMarks(studentId);
        } catch (error) {
            console.warn('Error fetching marks, using empty array:', error);
            marks = [];
        }
        
        let gpa;
        try {
            gpa = await this.db.calculateStudentGPA(studentId);
        } catch (error) {
            console.warn('Error calculating GPA:', error);
            gpa = 0.0;
        }
        
        const courses = {};
        
        for (const mark of marks) {
            if (!mark.courses || !mark.courses.course_code) {
                console.warn('Mark missing course info:', mark);
                continue;
            }
            
            const courseCode = mark.courses.course_code;
            if (!courses[courseCode]) {
                courses[courseCode] = {
                    courseCode: courseCode,
                    courseName: mark.courses.course_name || 'Unknown Course',
                    assessments: [],
                    finalGrade: '',
                    credits: mark.courses.credits || 3,
                    courseId: mark.courses.id
                };
            }
            
            if (options.includeAllAssessments !== false) {
                courses[courseCode].assessments.push({
                    name: mark.assessment_name || 'Assessment',
                    type: mark.assessment_type || 'Unknown',
                    score: mark.score || 0,
                    maxScore: mark.max_score || 100,
                    percentage: mark.percentage || 0,
                    grade: mark.grade || 'F',
                    remarks: options.includeRemarks !== false ? (mark.remarks || '') : '',
                    date: mark.assessment_date || null
                });
            }
            
            if (courses[courseCode].assessments.length > 0) {
                const totalPercentage = courses[courseCode].assessments
                    .reduce((sum, a) => sum + (a.percentage || 0), 0);
                const avgPercentage = courses[courseCode].assessments.length > 0 ? 
                    totalPercentage / courses[courseCode].assessments.length : 0;
                
                try {
                    courses[courseCode].finalGrade = this.db.calculateGrade(avgPercentage).grade;
                } catch (error) {
                    console.warn('Error calculating grade:', error);
                    courses[courseCode].finalGrade = 'N/A';
                }
            }
        }
        
        const filteredCourses = Object.values(courses);
        
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
        const exporters = {
            pdf: this.generateTranscriptPDF.bind(this),
            excel: this.generateTranscriptExcel.bind(this),
            csv: this.generateTranscriptCSV.bind(this)
        };
        
        if (!exporters[format]) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        return await exporters[format](transcriptData, options);
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
            const margin = 20;
            
            // Watermark if enabled
            if (options.watermark) {
                doc.setFontSize(60);
                doc.setTextColor(230, 230, 230);
                doc.text('UNOFFICIAL', pageWidth / 2, 150, { align: 'center', angle: 45 });
                doc.setTextColor(0, 0, 0);
            }
            
            // Header - Institution
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('THEOLOGICAL EDUCATION BY EXTENSION COLLEGE', pageWidth / 2, 25, { align: 'center' });
            
            // Title
            doc.setFontSize(16);
            doc.text('ACADEMIC TRANSCRIPT', pageWidth / 2, 35, { align: 'center' });
            
            // Student Information Section
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Student Name: ${data.student.full_name}`, margin, 50);
            doc.text(`Registration No.: ${data.student.reg_number}`, margin, 58);
            doc.text(`Program: ${data.student.program}`, margin, 66);
            doc.text(`Intake Year: ${data.student.intake_year}`, margin, 74);
            
            if (data.gpa !== null) {
                doc.text(`Cumulative GPA: ${data.gpa.toFixed(2)}`, margin, 82);
            }
            
            doc.text(`Date Generated: ${data.generatedDate}`, margin, 90);
            
            // Course Table Header
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('COURSE PERFORMANCE', margin, 105);
            
            // Create course table data
            const tableData = data.courses.map(course => [
                course.courseCode,
                course.courseName,
                course.credits || 3,
                course.finalGrade || 'N/A'
            ]);
            
            // Generate table using autoTable if available
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: 110,
                    head: [['Course Code', 'Course Name', 'Credits', 'Grade']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [41, 128, 185],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    margin: { left: margin, right: margin },
                    styles: { fontSize: 10 }
                });
            } else {
                // Simple table if autoTable not available
                doc.setFontSize(10);
                let y = 115;
                tableData.forEach(row => {
                    doc.text(row[0], margin, y);
                    doc.text(row[1], margin + 30, y);
                    doc.text(row[2], margin + 130, y);
                    doc.text(row[3], margin + 150, y);
                    y += 7;
                });
            }
            
            // Add detailed marks section
            if (options.includeAllAssessments) {
                doc.addPage();
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('DETAILED ASSESSMENT MARKS', margin, 20);
                
                let y = 30;
                data.courses.forEach((course, index) => {
                    if (course.assessments && course.assessments.length > 0) {
                        doc.setFontSize(12);
                        doc.setFont(undefined, 'bold');
                        doc.text(`${course.courseCode} - ${course.courseName}`, margin, y);
                        y += 8;
                        
                        // Add assessment table headers
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');
                        doc.text('Assessment', margin, y);
                        doc.text('Type', margin + 60, y);
                        doc.text('Score', margin + 100, y);
                        doc.text('%', margin + 130, y);
                        doc.text('Grade', margin + 150, y);
                        y += 6;
                        
                        // Add assessment rows
                        course.assessments.forEach(assessment => {
                            doc.text(assessment.name, margin, y);
                            doc.text(assessment.type || 'N/A', margin + 60, y);
                            doc.text(`${assessment.score || 0}/${assessment.maxScore || 100}`, margin + 100, y);
                            doc.text(`${(assessment.percentage || 0).toFixed(1)}%`, margin + 130, y);
                            doc.text(assessment.grade || 'N/A', margin + 150, y);
                            y += 7;
                            
                            // Check if we need a new page
                            if (y > 280) {
                                doc.addPage();
                                y = 20;
                            }
                        });
                        
                        y += 10;
                    }
                });
            }
            
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    'Generated by TEE Portal System | Unofficial Transcript',
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
            
            // Save the PDF
            const fileName = `Transcript_${data.student.reg_number}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            console.log('✅ PDF generated:', fileName);
            return fileName;
            
        } catch (error) {
            console.error('❌ Error generating PDF:', error);
            this.showToast('Error generating PDF: ' + error.message, 'error');
            throw error;
        }
    }
    
    async generateTranscriptExcel(data, options) {
        try {
            console.log('📊 Generating Excel transcript for:', data.student.full_name);
            
            if (typeof XLSX === 'undefined') {
                this.showToast('Excel export requires SheetJS library', 'warning');
                return;
            }
            
            // Prepare data for Excel
            const excelData = [];
            
            // Add header
            excelData.push(['ACADEMIC TRANSCRIPT']);
            excelData.push([`Student: ${data.student.full_name}`]);
            excelData.push([`Registration No.: ${data.student.reg_number}`]);
            excelData.push([`Program: ${data.student.program}`]);
            excelData.push([`Intake Year: ${data.student.intake_year}`]);
            if (data.gpa !== null) {
                excelData.push([`Cumulative GPA: ${data.gpa.toFixed(2)}`]);
            }
            excelData.push([`Date Generated: ${data.generatedDate}`]);
            excelData.push([]); // Empty row
            
            // Add course headers
            excelData.push(['Course Code', 'Course Name', 'Credits', 'Final Grade']);
            
            // Add course data
            data.courses.forEach(course => {
                excelData.push([
                    course.courseCode,
                    course.courseName,
                    course.credits || 3,
                    course.finalGrade || 'N/A'
                ]);
            });
            
            // Add detailed marks if requested
            if (options.includeAllAssessments) {
                excelData.push([]);
                excelData.push(['DETAILED ASSESSMENT MARKS']);
                excelData.push([]);
                
                data.courses.forEach(course => {
                    if (course.assessments && course.assessments.length > 0) {
                        excelData.push([`${course.courseCode} - ${course.courseName}`]);
                        excelData.push(['Assessment', 'Type', 'Score', 'Max Score', 'Percentage', 'Grade', 'Remarks']);
                        
                        course.assessments.forEach(assessment => {
                            excelData.push([
                                assessment.name,
                                assessment.type || 'N/A',
                                assessment.score || 0,
                                assessment.maxScore || 100,
                                assessment.percentage || 0,
                                assessment.grade || 'N/A',
                                assessment.remarks || ''
                            ]);
                        });
                        
                        excelData.push([]);
                    }
                });
            }
            
            // Create worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transcript');
            
            // Save file
            const fileName = `Transcript_${data.student.reg_number}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            console.log('✅ Excel generated:', fileName);
            this.showToast(`Excel transcript generated for ${data.student.full_name}`, 'success');
            
            return fileName;
            
        } catch (error) {
            console.error('❌ Error generating Excel:', error);
            this.showToast('Error generating Excel: ' + error.message, 'error');
            throw error;
        }
    }
    
    async generateTranscriptCSV(data, options) {
        try {
            console.log('📄 Generating CSV transcript for:', data.student.full_name);
            
            // Prepare CSV content
            let csvContent = 'ACADEMIC TRANSCRIPT\n';
            csvContent += `Student,${data.student.full_name}\n`;
            csvContent += `Registration No.,${data.student.reg_number}\n`;
            csvContent += `Program,${data.student.program}\n`;
            csvContent += `Intake Year,${data.student.intake_year}\n`;
            if (data.gpa !== null) {
                csvContent += `Cumulative GPA,${data.gpa.toFixed(2)}\n`;
            }
            csvContent += `Date Generated,${data.generatedDate}\n\n`;
            
            // Course data
            csvContent += 'Course Code,Course Name,Credits,Final Grade\n';
            data.courses.forEach(course => {
                csvContent += `${course.courseCode},${course.courseName},${course.credits || 3},${course.finalGrade || 'N/A'}\n`;
            });
            
            // Add detailed marks if requested
            if (options.includeAllAssessments) {
                csvContent += '\n\nDETAILED ASSESSMENT MARKS\n\n';
                
                data.courses.forEach(course => {
                    if (course.assessments && course.assessments.length > 0) {
                        csvContent += `${course.courseCode} - ${course.courseName}\n`;
                        csvContent += 'Assessment,Type,Score,Max Score,Percentage,Grade,Remarks\n';
                        
                        course.assessments.forEach(assessment => {
                            csvContent += `${assessment.name},`;
                            csvContent += `${assessment.type || 'N/A'},`;
                            csvContent += `${assessment.score || 0},`;
                            csvContent += `${assessment.maxScore || 100},`;
                            csvContent += `${assessment.percentage || 0},`;
                            csvContent += `${assessment.grade || 'N/A'},`;
                            csvContent += `${assessment.remarks || ''}\n`;
                        });
                        
                        csvContent += '\n';
                    }
                });
            }
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `Transcript_${data.student.reg_number}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            console.log('✅ CSV generated');
            this.showToast(`CSV transcript generated for ${data.student.full_name}`, 'success');
            
        } catch (error) {
            console.error('❌ Error generating CSV:', error);
            this.showToast('Error generating CSV: ' + error.message, 'error');
            throw error;
        }
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
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
    window.TranscriptsManager = TranscriptsManager;
}
