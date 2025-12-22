// modules/reports.js - Reports module
class ReportsManager {
    constructor(db) {
        this.db = db;
    }
    
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
                    // Handled by transcript module
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
                'Date of Birth': student.dob,
                'Gender': student.gender
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
        
        previewDiv.innerHTML = html;
    }
    
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
}
