// modules/reports.js - Reports module
class ReportsManager {
    constructor(db) {
        this.db = db;
    }
    
    // ==================== MAIN REPORT GENERATION ====================
    
    async generateReport() {
        try {
            const reportType = document.getElementById('reportType').value;
            const program = document.getElementById('reportProgram').value;
            const intakeYear = document.getElementById('reportIntake').value;
            const format = document.getElementById('reportFormat').value;
            
            if (!reportType) {
                this.showToast('Please select a report type', 'warning');
                return;
            }
            
            console.log(`📊 Generating ${reportType} report...`);
            
            let data;
            let fileName;
            
            switch(reportType) {
                case 'student':
                    data = await this.generateStudentListReport(program, intakeYear);
                    fileName = `student-list-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'marks':
                    data = await this.generateMarksReport(program, intakeYear);
                    fileName = `academic-marks-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    fileName = `enrollment-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'graduation':
                    data = await this.generateGraduationReport();
                    fileName = `graduation-report-${new Date().toISOString().split('T')[0]}`;
                    break;
                    
                case 'transcript':
                    await this.generateTranscriptReport();
                    return;
                    
                default:
                    this.showToast('Invalid report type selected', 'error');
                    return;
            }
            
            if (format === 'excel') {
                await this.exportToExcel(data, fileName);
            } else if (format === 'pdf') {
                await this.exportToPDF(data, fileName, reportType);
            } else {
                await this.exportToCSV(data, fileName);
            }
            
            this.showToast(`${reportType} report generated successfully`, 'success');
            await this.db.logActivity('report_generated', `Generated ${reportType} report`);
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showToast('Error generating report', 'error');
        }
    }
    
    // ==================== BACKWARD COMPATIBILITY METHODS ====================
    
    async generateStudentReport() {
        try {
            console.log('📊 Generating student report...');
            
            // Set report type to student
            const reportType = document.getElementById('reportType');
            if (reportType) reportType.value = 'student';
            
            // Call the main generateReport method
            return await this.generateReport();
        } catch (error) {
            console.error('Error generating student report:', error);
            this.showToast('Error generating student report', 'error');
        }
    }
    
    async generateAcademicReport() {
        try {
            console.log('📊 Generating academic report...');
            
            // Set report type to marks
            const reportType = document.getElementById('reportType');
            if (reportType) reportType.value = 'marks';
            
            // Call the main generateReport method
            return await this.generateReport();
        } catch (error) {
            console.error('Error generating academic report:', error);
            this.showToast('Error generating academic report', 'error');
        }
    }
    
    async exportAllData() {
        try {
            console.log('📊 Exporting all data...');
            
            // Get all data
            const students = await this.db.getStudents();
            const courses = await this.db.getCourses();
            const marks = await this.db.getMarksTableData();
            const settings = this.db.getDefaultSettings();
            
            const data = {
                students: students,
                courses: courses,
                marks: marks,
                settings: settings,
                exportDate: new Date().toISOString(),
                version: '1.0',
                recordCounts: {
                    students: students.length,
                    courses: courses.length,
                    marks: marks.length
                }
            };
            
            // Convert to JSON string
            const jsonStr = JSON.stringify(data, null, 2);
            
            // Create download
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `teeportal-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.showToast('All data exported successfully', 'success');
            await this.db.logActivity('data_exported', 'Exported all data as JSON backup');
            
        } catch (error) {
            console.error('Error exporting all data:', error);
            this.showToast('Error exporting data', 'error');
        }
    }
    
    // ==================== REPORT TYPES ====================
    
    async generateStudentListReport(program = 'all', intakeYear = 'all') {
        try {
            const supabase = await this.db.ensureConnected();
            let query = supabase
                .from('students')
                .select('*')
                .order('reg_number', { ascending: true });
            
            if (program !== 'all') {
                query = query.eq('program', program);
            }
            
            if (intakeYear !== 'all') {
                query = query.eq('intake_year', parseInt(intakeYear));
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data.map(student => ({
                'Reg Number': student.reg_number,
                'Full Name': student.full_name,
                'Email': student.email,
                'Phone': student.phone,
                'Program': student.program,
                'Intake Year': student.intake_year,
                'Status': student.status,
                'Date of Birth': student.dob ? new Date(student.dob).toLocaleDateString() : '',
                'Gender': student.gender,
                'Created Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
            }));
            
        } catch (error) {
            console.error('Error generating student list:', error);
            throw error;
        }
    }
    
    async generateMarksReport(program = 'all', intakeYear = 'all') {
        try {
            const marks = await this.db.getMarksTableData();
            
            let filteredMarks = marks;
            
            if (program !== 'all') {
                filteredMarks = filteredMarks.filter(mark => 
                    mark.students?.program === program
                );
            }
            
            if (intakeYear !== 'all') {
                filteredMarks = filteredMarks.filter(mark => 
                    mark.students?.intake_year === parseInt(intakeYear)
                );
            }
            
            return filteredMarks.map(mark => {
                const student = mark.students || {};
                const course = mark.courses || {};
                
                return {
                    'Reg Number': student.reg_number,
                    'Student Name': student.full_name,
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
                    'Date Entered': mark.created_at ? new Date(mark.created_at).toLocaleDateString() : ''
                };
            });
            
        } catch (error) {
            console.error('Error generating marks report:', error);
            throw error;
        }
    }
    
    async generateEnrollmentReport() {
        try {
            const students = await this.db.getStudents();
            
            const enrollmentStats = {};
            
            students.forEach(student => {
                const key = `${student.program}-${student.intake_year}`;
                if (!enrollmentStats[key]) {
                    enrollmentStats[key] = {
                        program: student.program,
                        intakeYear: student.intake_year,
                        totalStudents: 0,
                        active: 0,
                        graduated: 0,
                        withdrawn: 0
                    };
                }
                
                enrollmentStats[key].totalStudents++;
                
                if (student.status === 'active') enrollmentStats[key].active++;
                if (student.status === 'graduated') enrollmentStats[key].graduated++;
                if (student.status === 'withdrawn') enrollmentStats[key].withdrawn++;
            });
            
            return Object.values(enrollmentStats).map(stat => ({
                'Program': stat.program,
                'Intake Year': stat.intakeYear,
                'Total Students': stat.totalStudents,
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
            const graduatedStudents = students.filter(s => s.status === 'graduated');
            
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
            
            return {
                programReport,
                yearReport,
                totalGraduates: graduatedStudents.length,
                graduationRate: students.length > 0 ? 
                    Math.round((graduatedStudents.length / students.length) * 100) + '%' : '0%'
            };
            
        } catch (error) {
            console.error('Error generating graduation report:', error);
            throw error;
        }
    }
    
    // ==================== TRANSCRIPT REPORT ====================
    
    async generateTranscriptReport(studentId = null) {
        try {
            console.log('📄 Generating transcript report...');
            
            // If no student ID provided, show selection modal
            if (!studentId) {
                const studentSelect = document.getElementById('transcriptStudent');
                if (studentSelect && studentSelect.value) {
                    studentId = studentSelect.value;
                } else {
                    this.showToast('Please select a student', 'warning');
                    return;
                }
            }
            
            // Get student data
            const student = await this.db.getStudentById(studentId);
            if (!student) {
                this.showToast('Student not found', 'error');
                return;
            }
            
            // Get student's marks
            const marks = await this.db.getMarksByStudent(studentId);
            
            if (marks.length === 0) {
                this.showToast('No marks found for this student', 'warning');
                return;
            }
            
            // Group marks by course
            const courses = {};
            let totalCredits = 0;
            let totalGradePoints = 0;
            
            marks.forEach(mark => {
                const courseId = mark.course_id;
                if (!courses[courseId]) {
                    courses[courseId] = {
                        course_code: mark.courses?.course_code || 'N/A',
                        course_name: mark.courses?.course_name || 'Unknown Course',
                        credits: mark.courses?.credits || 3,
                        marks: [],
                        average: 0,
                        grade: 'N/A'
                    };
                }
                
                courses[courseId].marks.push({
                    assessment: mark.assessment_name,
                    type: mark.assessment_type,
                    score: mark.score,
                    max_score: mark.max_score,
                    percentage: mark.percentage,
                    grade: mark.grade,
                    date: mark.created_at
                });
            });
            
            // Calculate course averages and GPA
            Object.values(courses).forEach(course => {
                if (course.marks.length > 0) {
                    const totalPercentage = course.marks.reduce((sum, mark) => sum + (mark.percentage || 0), 0);
                    course.average = totalPercentage / course.marks.length;
                    course.grade = this.calculateGrade(course.average);
                    
                    totalCredits += course.credits;
                    totalGradePoints += this.getGradePoints(course.grade) * course.credits;
                }
            });
            
            const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0.00;
            
            // Generate transcript data
            const transcriptData = {
                student: {
                    name: student.full_name,
                    regNumber: student.reg_number,
                    program: student.program,
                    intakeYear: student.intake_year,
                    status: student.status,
                    dob: student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'
                },
                courses: Object.values(courses),
                summary: {
                    totalCourses: Object.keys(courses).length,
                    totalCredits: totalCredits,
                    gpa: gpa,
                    cgpa: gpa,
                    dateGenerated: new Date().toLocaleDateString()
                }
            };
            
            // Export as PDF
            await this.exportTranscriptToPDF(transcriptData);
            
            this.showToast('Transcript generated successfully', 'success');
            await this.db.logActivity('transcript_generated', `Generated transcript for ${student.reg_number}`);
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            this.showToast('Error generating transcript', 'error');
        }
    }
    
    calculateGrade(percentage) {
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    getGradePoints(grade) {
        const gradePoints = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'D': 1.0,
            'F': 0.0
        };
        return gradePoints[grade] || 0.0;
    }
    
    async exportTranscriptToPDF(transcriptData) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            return;
        }
        
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            this.showToast('jsPDF not loaded', 'error');
            return;
        }
        
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('OFFICIAL TRANSCRIPT', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text('TEEPortal University', 105, 30, { align: 'center' });
        doc.text('Academic Records Office', 105, 35, { align: 'center' });
        
        // Student Info
        doc.setFontSize(12);
        doc.text('STUDENT INFORMATION', 20, 50);
        
        doc.setFontSize(10);
        doc.text(`Name: ${transcriptData.student.name}`, 20, 60);
        doc.text(`Registration Number: ${transcriptData.student.regNumber}`, 20, 65);
        doc.text(`Program: ${transcriptData.student.program}`, 20, 70);
        doc.text(`Intake Year: ${transcriptData.student.intakeYear}`, 20, 75);
        doc.text(`Status: ${transcriptData.student.status}`, 20, 80);
        
        // Academic Performance
        doc.setFontSize(12);
        doc.text('ACADEMIC PERFORMANCE', 20, 95);
        
        // Course table
        const tableData = [];
        transcriptData.courses.forEach((course, index) => {
            tableData.push([
                index + 1,
                course.course_code,
                course.course_name,
                course.credits.toString(),
                course.average.toFixed(2) + '%',
                course.grade,
                this.getGradePoints(course.grade).toFixed(1)
            ]);
        });
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 105,
                head: [['#', 'Code', 'Course Name', 'Credits', 'Average', 'Grade', 'Grade Points']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] }
            });
        } else {
            // Fallback if autoTable is not available
            doc.setFontSize(10);
            let y = 105;
            transcriptData.courses.forEach((course, index) => {
                if (index < 15) { // Limit to first 15 courses
                    doc.text(`${index + 1}. ${course.course_code} - ${course.course_name} (${course.credits} credits) - Grade: ${course.grade}`, 20, y);
                    y += 7;
                }
            });
            if (transcriptData.courses.length > 15) {
                doc.text(`... and ${transcriptData.courses.length - 15} more courses`, 20, y);
            }
        }
        
        // Summary
        const finalY = (typeof doc.lastAutoTable !== 'undefined' && doc.lastAutoTable.finalY) ? 
            doc.lastAutoTable.finalY + 20 : 105 + (Math.min(transcriptData.courses.length, 15) * 7) + 20;
        
        doc.setFontSize(12);
        doc.text('SUMMARY', 20, finalY + 10);
        
        doc.setFontSize(10);
        doc.text(`Total Courses: ${transcriptData.summary.totalCourses}`, 20, finalY + 20);
        doc.text(`Total Credits: ${transcriptData.summary.totalCredits}`, 20, finalY + 25);
        doc.text(`GPA: ${transcriptData.summary.gpa}`, 20, finalY + 30);
        doc.text(`Date Generated: ${transcriptData.summary.dateGenerated}`, 20, finalY + 35);
        
        // Footer
        doc.setFontSize(8);
        const pageHeight = doc.internal.pageSize.height;
        doc.text('This is an official document. For verification, contact the Academic Records Office.', 
                 105, pageHeight - 20, { align: 'center' });
        
        // Save the PDF
        const fileName = `transcript-${transcriptData.student.regNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }
    
    // ==================== EXPORT FORMATS ====================
    
    async exportToCSV(data, fileName) {
        if (!data || data.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
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
        
        this.downloadCSV(csvRows.join('\n'), `${fileName}.csv`);
    }
    
    async exportToExcel(data, fileName) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Excel export requires SheetJS library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
    
    async exportToPDF(data, fileName, reportType) {
        if (typeof jspdf === 'undefined') {
            this.showToast('PDF export requires jsPDF library', 'warning');
            await this.exportToCSV(data, fileName);
            return;
        }
        
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            this.showToast('jsPDF not loaded', 'error');
            return;
        }
        
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`${reportType.toUpperCase()} REPORT`, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        if (data.length === 0) {
            doc.text('No data available', 105, 50, { align: 'center' });
        } else {
            const headers = Object.keys(data[0]);
            const tableData = data.map(row => headers.map(header => row[header] || ''));
            
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: 40,
                    head: [headers],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185] }
                });
            } else {
                doc.setFontSize(10);
                let y = 40;
                data.forEach((row, index) => {
                    if (index < 20) {
                        const rowText = headers.map(h => `${h}: ${row[h]}`).join(', ');
                        doc.text(rowText, 10, y);
                        y += 7;
                    }
                });
                if (data.length > 20) {
                    doc.text(`... and ${data.length - 20} more records`, 10, y);
                }
            }
        }
        
        doc.save(`${fileName}.pdf`);
    }
    
    // ==================== PREVIEW FUNCTIONS ====================
    
    async previewReport() {
        try {
            const reportType = document.getElementById('reportType').value;
            const program = document.getElementById('reportProgram').value;
            const intakeYear = document.getElementById('reportIntake').value;
            
            if (!reportType) {
                this.showToast('Please select a report type', 'warning');
                return;
            }
            
            let data;
            let title;
            
            switch(reportType) {
                case 'student':
                    data = await this.generateStudentListReport(program, intakeYear);
                    title = 'Student List Preview';
                    break;
                    
                case 'marks':
                    data = await this.generateMarksReport(program, intakeYear);
                    title = 'Academic Marks Preview';
                    break;
                    
                case 'enrollment':
                    data = await this.generateEnrollmentReport();
                    title = 'Enrollment Statistics Preview';
                    break;
                    
                case 'graduation':
                    const graduationData = await this.generateGraduationReport();
                    this.previewGraduationReport(graduationData);
                    return;
                    
                case 'transcript':
                    this.showToast('Transcript preview not available. Generate full transcript instead.', 'info');
                    return;
                    
                default:
                    this.showToast('Invalid report type', 'error');
                    return;
            }
            
            this.previewReportData(data, title);
            
        } catch (error) {
            console.error('Error previewing report:', error);
            this.showToast('Error previewing report', 'error');
        }
    }
    
    previewReportData(data, title) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) return;
        
        if (!data || data.length === 0) {
            previewDiv.innerHTML = `<p class="no-data">No data available for preview</p>`;
            return;
        }
        
        const headers = Object.keys(data[0]);
        
        let html = `
            <h4>${title} (${data.length} records)</h4>
            <div class="table-responsive">
                <table class="preview-table">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.slice(0, 10).forEach(row => {
            html += `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <p class="preview-info">Showing first 10 of ${data.length} records</p>
        `;
        
        previewDiv.innerHTML = html;
    }
    
    previewGraduationReport(data) {
        const previewDiv = document.getElementById('reportPreview');
        if (!previewDiv) return;
        
        let html = `
            <h4>Graduation Report Preview</h4>
            <div class="report-summary">
                <p><strong>Total Graduates:</strong> ${data.totalGraduates}</p>
                <p><strong>Graduation Rate:</strong> ${data.graduationRate}</p>
            </div>
        `;
        
        if (data.programReport.length > 0) {
            html += `
                <h5>Graduates by Program</h5>
                <div class="table-responsive">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Program</th>
                                <th>Graduates</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.programReport.map(row => `
                                <tr>
                                    <td>${row.Program}</td>
                                    <td>${row.Graduates}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        if (data.yearReport.length > 0) {
            html += `
                <h5>Graduates by Year</h5>
                <div class="table-responsive">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Graduates</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.yearReport.map(row => `
                                <tr>
                                    <td>${row.Year}</td>
                                    <td>${row.Graduates}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        previewDiv.innerHTML = html;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    
    // ==================== INITIALIZATION ====================
    
    initializeReportsUI() {
        try {
            console.log('📊 Initializing Reports UI...');
            
            // Initialize report filters
            this.populateReportFilters();
            
            // Set up event listeners
            this.setupReportEventListeners();
            
            console.log('✅ Reports UI initialized');
        } catch (error) {
            console.error('Error initializing reports UI:', error);
        }
    }
    
    async populateReportFilters() {
        try {
            // Populate program filter
            const programSelect = document.getElementById('reportProgram');
            if (programSelect) {
                programSelect.innerHTML = '<option value="all">All Programs</option>';
                const programs = await this.db.getPrograms();
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programSelect.appendChild(option);
                });
            }
            
            // Populate intake year filter
            const intakeSelect = document.getElementById('reportIntake');
            if (intakeSelect) {
                intakeSelect.innerHTML = '<option value="all">All Intakes</option>';
                const students = await this.db.getStudents();
                const intakeYears = [...new Set(students.map(s => s.intake_year))].sort((a, b) => b - a);
                
                intakeYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    intakeSelect.appendChild(option);
                });
            }
            
            // Populate transcript student selector
            const transcriptStudentSelect = document.getElementById('transcriptStudent');
            if (transcriptStudentSelect) {
                transcriptStudentSelect.innerHTML = '<option value="">Select Student...</option>';
                const students = await this.db.getStudents();
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.reg_number} - ${student.full_name} (${student.program})`;
                    transcriptStudentSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error populating report filters:', error);
        }
    }
    
    setupReportEventListeners() {
        // Preview button
        const previewBtn = document.getElementById('previewReportBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewReport());
        }
        
        // Generate button
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }
        
        // Transcript button
        const transcriptBtn = document.getElementById('generateTranscriptBtn');
        if (transcriptBtn) {
            transcriptBtn.addEventListener('click', () => this.generateTranscriptReport());
        }
        
        // Export all data button
        const exportAllBtn = document.getElementById('exportAllDataBtn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => this.exportAllData());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshReportsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshReports());
        }
    }
    
    async refreshReports() {
        try {
            console.log('🔄 Refreshing reports data...');
            
            // Clear existing filters
            const programSelect = document.getElementById('reportProgram');
            const intakeSelect = document.getElementById('reportIntake');
            const transcriptSelect = document.getElementById('transcriptStudent');
            
            if (programSelect) programSelect.innerHTML = '<option value="all">All Programs</option>';
            if (intakeSelect) intakeSelect.innerHTML = '<option value="all">All Intakes</option>';
            if (transcriptSelect) transcriptSelect.innerHTML = '<option value="">Select Student...</option>';
            
            // Repopulate
            await this.populateReportFilters();
            
            // Clear preview
            const previewDiv = document.getElementById('reportPreview');
            if (previewDiv) previewDiv.innerHTML = '';
            
            this.showToast('Reports data refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing reports:', error);
            this.showToast('Error refreshing reports', 'error');
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    async quickExport(type) {
        switch(type) {
            case 'students':
                const studentData = await this.generateStudentListReport();
                await this.exportToCSV(studentData, `quick-export-students-${new Date().toISOString().split('T')[0]}`);
                break;
                
            case 'marks':
                const marksData = await this.generateMarksReport();
                await this.exportToCSV(marksData, `quick-export-marks-${new Date().toISOString().split('T')[0]}`);
                break;
                
            case 'enrollment':
                const enrollmentData = await this.generateEnrollmentReport();
                await this.exportToCSV(enrollmentData, `quick-export-enrollment-${new Date().toISOString().split('T')[0]}`);
                break;
        }
    }
    
    async getReportStatistics() {
        try {
            const students = await this.db.getStudents();
            const courses = await this.db.getCourses();
            const marks = await this.db.getMarksTableData();
            
            return {
                totalStudents: students.length,
                totalCourses: courses.length,
                totalMarksEntries: marks.length,
                activeStudents: students.filter(s => s.status === 'active').length,
                graduatedStudents: students.filter(s => s.status === 'graduated').length,
                averageMarksPerStudent: students.length > 0 ? (marks.length / students.length).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting report statistics:', error);
            return null;
        }
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}
