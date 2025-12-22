// modules/transcripts.js - Transcript management module
class TranscriptsManager {
    constructor(db) {
        this.db = db;
        this.cachedStudents = null;
    }

    async generateStudentTranscriptPrompt() {
        try {
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
                                <select id="transcriptProgramFilter" style="
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
                                <select id="transcriptIntakeFilter" style="
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
                                <input type="text" id="transcriptSearch" placeholder="Search by name or reg number" style="
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
                                        <select id="transcriptFormat" style="
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
                                                <input type="checkbox" id="includeAllAssessments" checked>
                                                <span>All assessment details</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px;">
                                                <input type="checkbox" id="includeGPA" checked>
                                                <span>GPA calculation</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 8px;">
                                                <input type="checkbox" id="includeRemarks" checked>
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
                                    <button id="selectAllStudents" style="
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
                                    <button id="deselectAllStudents" style="
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
                                                <input type="checkbox" id="masterCheckbox" style="cursor: pointer;">
                                            </th>
                                            <th style="padding: 12px; text-align: left;">Reg Number</th>
                                            <th style="padding: 12px; text-align: left;">Student Name</th>
                                            <th style="padding: 12px; text-align: left;">Program</th>
                                            <th style="padding: 12px; text-align: left;">Intake</th>
                                            <th style="padding: 12px; text-align: left;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="transcriptStudentList">
                                        <tr>
                                            <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
                                                <i class="fas fa-spinner fa-spin"></i> Loading students...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="margin-top: 10px; font-size: 13px; color: #7f8c8d; text-align: right;">
                                <span id="selectedCount">0</span> students selected
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
                        <button id="cancelTranscript" style="
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
                        <button id="generateTranscriptsBtn" style="
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
            
            await this.loadTranscriptStudents();
            this.setupTranscriptModalEvents();
            
        } catch (error) {
            console.error('Error creating transcript modal:', error);
            this.showToast('Error loading transcript interface', 'error');
        }
    }
    
    async loadTranscriptStudents() {
        try {
            const tbody = document.getElementById('transcriptStudentList');
            
            if (this.cachedStudents) {
                this.renderStudentTable(this.cachedStudents);
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
            
            this.renderStudentTable(students);
            
        } catch (error) {
            console.error('Error loading students for transcript:', error);
            const tbody = document.getElementById('transcriptStudentList');
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
    
    renderStudentTable(students) {
        const tbody = document.getElementById('transcriptStudentList');
        const settings = this.db.settings || {};
        
        let html = '';
        
        students.forEach((student) => {
            const programName = settings.programs && settings.programs[student.program] ? 
                settings.programs[student.program].name : student.program;
            
            html += `
                <tr class="student-row" 
                    data-id="${student.id}" 
                    data-reg="${student.reg_number}"
                    data-program="${student.program}" 
                    data-intake="${student.intake_year}" 
                    data-name="${student.full_name.toLowerCase()}" 
                    data-reg-lower="${student.reg_number.toLowerCase()}">
                    <td style="padding: 12px;">
                        <input type="checkbox" 
                               class="student-checkbox" 
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
                    <td style="padding: 12px;">${programName}</td>
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
        this.updateSelectedCount();
    }
    
    setupTranscriptModalEvents() {
        // Close modal
        document.getElementById('closeTranscriptModal').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        document.getElementById('cancelTranscript').addEventListener('click', () => {
            document.getElementById('transcriptModal').remove();
        });
        
        // Master checkbox
        document.getElementById('masterCheckbox').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            this.updateSelectedCount();
        });
        
        // Select all button
        document.getElementById('selectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
            checkboxes.forEach(cb => cb.checked = true);
            document.getElementById('masterCheckbox').checked = true;
            this.updateSelectedCount();
        });
        
        // Deselect all button
        document.getElementById('deselectAllStudents').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            document.getElementById('masterCheckbox').checked = false;
            this.updateSelectedCount();
        });
        
        // Individual checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('student-checkbox')) {
                this.updateSelectedCount();
            }
        });
        
        // Filters
        const filterInputs = ['transcriptProgramFilter', 'transcriptIntakeFilter', 'transcriptSearch'];
        filterInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.filterTranscriptStudents());
                if (inputId === 'transcriptSearch') {
                    element.addEventListener('input', () => {
                        clearTimeout(this.searchTimeout);
                        this.searchTimeout = setTimeout(() => {
                            this.filterTranscriptStudents();
                        }, 300);
                    });
                }
            }
        });
        
        // Generate button
        document.getElementById('generateTranscriptsBtn').addEventListener('click', async () => {
            const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
                .map(cb => ({ id: cb.value, reg: cb.dataset.reg }));
            
            if (selectedStudents.length === 0) {
                this.showToast('Please select at least one student', 'warning');
                return;
            }
            
            const format = document.getElementById('transcriptFormat').value;
            const options = {
                includeAllAssessments: document.getElementById('includeAllAssessments').checked,
                includeGPA: document.getElementById('includeGPA').checked,
                includeRemarks: document.getElementById('includeRemarks').checked
            };
            
            const btn = document.getElementById('generateTranscriptsBtn');
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
    
    filterTranscriptStudents() {
        const programFilter = document.getElementById('transcriptProgramFilter').value;
        const intakeFilter = document.getElementById('transcriptIntakeFilter').value;
        const searchTerm = document.getElementById('transcriptSearch').value.toLowerCase();
        
        const rows = document.querySelectorAll('.student-row');
        
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
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = false;
            } else {
                row.style.display = 'none';
                const checkbox = row.querySelector('.student-checkbox');
                checkbox.disabled = true;
                checkbox.checked = false;
            }
        });
        
        const visibleCheckboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
        const allChecked = visibleCheckboxes.length > 0 && 
            Array.from(visibleCheckboxes).every(cb => cb.checked);
        document.getElementById('masterCheckbox').checked = allChecked;
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.student-checkbox:checked').length;
        document.getElementById('selectedCount').textContent = selectedCount;
        
        const btn = document.getElementById('generateTranscriptsBtn');
        if (selectedCount === 0) {
            btn.innerHTML = '<i class="fas fa-download"></i> Generate Transcripts';
        } else if (selectedCount === 1) {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate 1 Transcript`;
        } else {
            btn.innerHTML = `<i class="fas fa-download"></i> Generate ${selectedCount} Transcripts`;
        }
    }
    
    // Main transcript generation method
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
            await this.exportTranscript(transcriptData, format, options);
            
            this.showToast(`Transcript generated for ${student.full_name}`, 'success');
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
