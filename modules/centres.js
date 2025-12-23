/**
 * Centres Management Module
 * Handles TEE centres/stations across Kenya
 */

class CentresModule {
    constructor(db) {
        this.db = db;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalCentres = 0;
        this.kenyaCounties = []; // Will store Kenya counties
        this.init();
    }

    init() {
        console.log('Initializing Centres Module');
        this.loadKenyaCounties();
        this.loadCentres();
        this.setupEventListeners();
    }

    loadKenyaCounties() {
        // All 47 Kenya counties
        this.kenyaCounties = [
            "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera",
            "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
            "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia",
            "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
            "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay",
            "Migori", "Kisii", "Nyamira", "Nairobi"
        ];

        // Populate county dropdowns
        const countySelects = document.querySelectorAll('select[id*="County"], select[id*="county"]');
        countySelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select County</option>' +
                this.kenyaCounties.map(county => 
                    `<option value="${county.toLowerCase().replace(/\s+/g, '-')}">${county}</option>`
                ).join('');
            
            // Restore current value if exists
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    async loadCentres() {
        try {
            // Load from database or localStorage
            const centres = await this.db.getCentres() || [];
            this.totalCentres = centres.length;
            
            this.updateCentresGrid(centres);
            this.updateDashboardStats(centres);
            this.populateCentreDropdowns(centres);
            
            // Update settings page
            this.updateCentreList(centres);
            
            return centres;
        } catch (error) {
            console.error('Error loading centres:', error);
            return [];
        }
    }

    updateCentresGrid(centres) {
        const centresGrid = document.getElementById('centresGrid');
        if (!centresGrid) return;

        if (centres.length === 0) {
            centresGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marker-alt fa-3x"></i>
                    <h3>No Centres Found</h3>
                    <p>Add your first centre to get started</p>
                    <button class="btn btn-primary" onclick="openCentreModal()">
                        <i class="fas fa-plus"></i> Add Centre
                    </button>
                </div>
            `;
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedCentres = centres.slice(startIndex, endIndex);

        centresGrid.innerHTML = paginatedCentres.map(centre => `
            <div class="card centre-card" data-centre-id="${centre.id}">
                <div class="card-header">
                    <div class="centre-code">${centre.code}</div>
                    <div class="centre-status ${centre.status}">${centre.status}</div>
                </div>
                <div class="card-body">
                    <h3 class="centre-name">${centre.name}</h3>
                    <div class="centre-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${this.getCountyName(centre.county)}, ${centre.subCounty || 'N/A'}</span>
                    </div>
                    <div class="centre-contact">
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${centre.phone || 'N/A'}</span>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>${centre.email || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="centre-stats">
                        <div class="stat-item">
                            <span class="stat-label">Students</span>
                            <span class="stat-value">${centre.studentCount || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Courses</span>
                            <span class="stat-value">${centre.courseCount || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-primary" onclick="app.centres.editCentre('${centre.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="app.centres.viewCentreDetails('${centre.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.centres.deleteCentre('${centre.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Update pagination
        this.updatePagination(centres.length);
    }

    getCountyName(countyCode) {
        const county = this.kenyaCounties.find(c => 
            c.toLowerCase().replace(/\s+/g, '-') === countyCode
        );
        return county || countyCode;
    }

    populateCentreDropdowns(centres) {
        const centreSelects = document.querySelectorAll('select[id*="Centre"], select[id*="centre"]');
        centreSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Centre</option>' +
                centres.filter(c => c.status === 'active')
                    .map(centre => `<option value="${centre.id}">${centre.name} (${centre.code})</option>`)
                    .join('');
            
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    updateCentreList(centres) {
        const centreList = document.getElementById('centreList');
        if (!centreList) return;

        centreList.innerHTML = centres.map(centre => `
            <div class="list-item" data-centre-id="${centre.id}">
                <div class="item-info">
                    <strong>${centre.name}</strong>
                    <small>${this.getCountyName(centre.county)} • ${centre.code}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-xs btn-primary" onclick="app.centres.editCentre('${centre.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-xs btn-danger" onclick="app.centres.deleteCentre('${centre.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async saveCentre(event) {
        event.preventDefault();
        
        const form = document.getElementById('centreForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const centreData = {
            name: document.getElementById('centreName').value.trim(),
            code: document.getElementById('centreCode').value.trim().toUpperCase(),
            county: document.getElementById('centreCounty').value,
            subCounty: document.getElementById('centreSubCounty').value.trim(),
            address: document.getElementById('centreAddress').value.trim(),
            contactPerson: document.getElementById('centreContactPerson').value.trim(),
            phone: document.getElementById('centrePhone').value.trim(),
            email: document.getElementById('centreEmail').value.trim(),
            status: document.getElementById('centreStatus').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await this.db.saveCentre(centreData);
            this.showToast('Centre saved successfully!', 'success');
            
            closeModal('centreModal');
            form.reset();
            
            // Reload centres
            await this.loadCentres();
            
            // Refresh dashboard if needed
            if (window.app.dashboard) {
                window.app.dashboard.updateDashboard();
            }
        } catch (error) {
            console.error('Error saving centre:', error);
            this.showToast('Error saving centre', 'error');
        }
    }

    async editCentre(centreId) {
        try {
            const centres = await this.db.getCentres();
            const centre = centres.find(c => c.id === centreId);
            
            if (!centre) {
                this.showToast('Centre not found', 'error');
                return;
            }

            // Populate modal
            document.getElementById('centreName').value = centre.name;
            document.getElementById('centreCode').value = centre.code;
            document.getElementById('centreCounty').value = centre.county;
            document.getElementById('centreSubCounty').value = centre.subCounty || '';
            document.getElementById('centreAddress').value = centre.address || '';
            document.getElementById('centreContactPerson').value = centre.contactPerson || '';
            document.getElementById('centrePhone').value = centre.phone || '';
            document.getElementById('centreEmail').value = centre.email || '';
            document.getElementById('centreStatus').value = centre.status;

            // Store centre ID for update
            const form = document.getElementById('centreForm');
            form.dataset.editId = centreId;

            openModal('centreModal');
        } catch (error) {
            console.error('Error editing centre:', error);
            this.showToast('Error loading centre', 'error');
        }
    }

    async deleteCentre(centreId) {
        if (!confirm('Are you sure you want to delete this centre? This action cannot be undone.')) {
            return;
        }

        try {
            await this.db.deleteCentre(centreId);
            this.showToast('Centre deleted successfully', 'success');
            
            // Reload centres
            await this.loadCentres();
        } catch (error) {
            console.error('Error deleting centre:', error);
            this.showToast('Error deleting centre', 'error');
        }
    }

    viewCentreDetails(centreId) {
        // Implementation for viewing centre details
        console.log('View centre details:', centreId);
        // This could open a detailed view modal
    }

    async exportCentres() {
        try {
            const centres = await this.db.getCentres();
            
            if (centres.length === 0) {
                this.showToast('No centres to export', 'warning');
                return;
            }

            // Prepare data for export
            const exportData = centres.map(centre => ({
                'Centre Code': centre.code,
                'Centre Name': centre.name,
                'County': this.getCountyName(centre.county),
                'Sub-County': centre.subCounty || '',
                'Address': centre.address || '',
                'Contact Person': centre.contactPerson || '',
                'Phone': centre.phone || '',
                'Email': centre.email || '',
                'Status': centre.status,
                'Students': centre.studentCount || 0,
                'Courses': centre.courseCount || 0
            }));

            // Create Excel workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Centres');
            
            // Generate file
            const fileName = `tee_centres_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.showToast('Centres exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting centres:', error);
            this.showToast('Error exporting centres', 'error');
        }
    }

    updateDashboardStats(centres) {
        // Update dashboard counters
        const totalCentres = centres.length;
        const activeCentres = centres.filter(c => c.status === 'active').length;
        const counties = [...new Set(centres.map(c => c.county))].length;

        document.getElementById('totalCentres').textContent = totalCentres;
        document.getElementById('activeCentres').textContent = activeCentres;
        document.getElementById('countiesCovered').textContent = counties;

        // Update centres page stats
        const centreStudents = document.getElementById('centreStudents');
        if (centreStudents) {
            const totalStudents = centres.reduce((sum, centre) => sum + (centre.studentCount || 0), 0);
            centreStudents.textContent = totalStudents;
        }

        const totalCounties = document.getElementById('totalCounties');
        if (totalCounties) {
            totalCounties.textContent = counties;
        }
    }

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.pageSize);
        
        // Update pagination controls if they exist
        const paginationControls = document.querySelector('.pagination-controls');
        if (paginationControls) {
            paginationControls.innerHTML = `
                <button class="btn btn-sm ${this.currentPage === 1 ? 'disabled' : ''}" 
                        onclick="app.centres.prevPage()">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span>Page ${this.currentPage} of ${totalPages}</span>
                <button class="btn btn-sm ${this.currentPage === totalPages ? 'disabled' : ''}" 
                        onclick="app.centres.nextPage()">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadCentres();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalCentres / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.loadCentres();
        }
    }

    setupEventListeners() {
        // Centre form submission
        const centreForm = document.getElementById('centreForm');
        if (centreForm) {
            centreForm.addEventListener('submit', (e) => this.saveCentre(e));
        }

        // County management
        const addCountyBtn = document.querySelector('[onclick="addCounty()"]');
        if (addCountyBtn) {
            addCountyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addCounty();
            });
        }

        // Filter listeners
        const filterInputs = document.querySelectorAll('#centres .filter-select, #centres .search-input');
        filterInputs.forEach(input => {
            input.addEventListener('input', () => this.filterCentres());
            input.addEventListener('change', () => this.filterCentres());
        });
    }

    filterCentres() {
        // Implementation for filtering centres
        console.log('Filtering centres...');
        // This would filter the centres grid based on search/filter criteria
    }

    addCounty() {
        const countyName = prompt('Enter new county name:');
        if (countyName && countyName.trim()) {
            const normalizedCounty = countyName.trim().toLowerCase().replace(/\s+/g, '-');
            
            if (!this.kenyaCounties.includes(countyName.trim())) {
                this.kenyaCounties.push(countyName.trim());
                this.loadKenyaCounties();
                this.showToast('County added successfully', 'success');
            } else {
                this.showToast('County already exists', 'warning');
            }
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                           type === 'error' ? 'exclamation-circle' : 
                           type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CentresModule;
}
