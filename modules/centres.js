// modules/centres.js - FINAL Centre Management Module
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.counties = [];
        this.centres = [];
        
        // Initialize immediately
        this.init();
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('🚀 Initializing Centre Manager...');
        
        // Load counties first
        await this.loadCounties();
        
        // Setup modal event listeners
        this.setupModalEvents();
        
        // Setup form submission
        this.setupFormSubmission();
        
        // Load centres
        await this.loadCentres();
        
        console.log('✅ Centre Manager initialized');
    }
    
    /**
     * Load counties for dropdown
     */
    async loadCounties() {
        try {
            console.log('📍 Loading counties...');
            
            // Try database first
            if (this.db && typeof this.db.getCounties === 'function') {
                const countiesData = await this.db.getCounties();
                // Handle both array of objects or array of strings
                this.counties = countiesData.map(item => 
                    typeof item === 'string' ? item : item.name || item
                );
            } else {
                // Default counties
                this.counties = [
                    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
                    'Kisii', 'Kakamega', 'Thika', 'Nyeri', 'Meru',
                    'Machakos', 'Kitui', 'Garissa', 'Wajir', 'Mandera'
                ];
            }
            
            console.log(`✅ Loaded ${this.counties.length} counties`);
            
        } catch (error) {
            console.error('❌ Error loading counties:', error);
            this.counties = ['Nairobi', 'Mombasa', 'Kisumu']; // Fallback
        }
    }
    
    /**
     * Populate county dropdown
     */
    populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        if (!countySelect) {
            console.error('❌ County select not found!');
            return;
        }
        
        // Clear existing options (keep first empty option)
        countySelect.innerHTML = '<option value="">Select County</option>';
        
        // Add counties
        this.counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countySelect.appendChild(option);
        });
        
        console.log(`✅ Populated ${this.counties.length} counties in dropdown`);
    }
    
    /**
     * Setup modal events
     */
    setupModalEvents() {
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        // Close modal when clicking X
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Close modal when clicking Cancel button
        const cancelBtn = modal.querySelector('[onclick*="closeCentreModal"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });
        
        console.log('✅ Modal events setup complete');
    }
    
    /**
     * Setup form submission
     */
    setupFormSubmission() {
        const form = document.getElementById('centreForm');
        if (!form) {
            console.error('❌ Centre form not found!');
            return;
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCentre();
        });
        
        console.log('✅ Form submission setup complete');
    }
    
    /**
     * Open centre modal
     */
    async openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        // 1. Center the modal
        modal.style.display = 'block';
        modal.classList.add('active');
        
        // 2. Auto-populate counties dropdown
        this.populateCountyDropdown();
        
        // 3. Reset form or load centre data
        if (centreId) {
            await this.loadCentreForEdit(centreId);
        } else {
            this.resetForm();
        }
        
        // 4. Focus on first input
        setTimeout(() => {
            document.getElementById('centreName')?.focus();
        }, 100);
        
        console.log('✅ Centre modal opened and centered');
    }
    
    /**
     * Load centre data for editing
     */
    async loadCentreForEdit(centreId) {
        try {
            const centre = this.centres.find(c => c.id === centreId);
            if (!centre) {
                throw new Error('Centre not found');
            }
            
            this.currentEditId = centreId;
            
            // Update modal title
            const title = document.getElementById('centreModalTitle');
            if (title) title.textContent = 'Edit Centre';
            
            // Populate form fields
            const fields = {
                'centreName': centre.name || '',
                'centreCode': centre.code || '',
                'centreCounty': centre.county || '',
                'centreSubCounty': centre.subCounty || '',
                'centreAddress': centre.address || '',
                'centreContactPerson': centre.contactPerson || '',
                'centrePhone': centre.phone || '',
                'centreEmail': centre.email || '',
                'centreStatus': centre.status || 'active',
                'centreDescription': centre.description || ''
            };
            
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.value = value;
            });
            
            // Update button text
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Update Centre';
            
        } catch (error) {
            console.error('❌ Error loading centre:', error);
            this.showAlert('Failed to load centre data', 'error');
        }
    }
    
    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            this.resetForm();
        }
    }
    
    /**
     * Reset form
     */
    resetForm() {
        const form = document.getElementById('centreForm');
        if (form) {
            form.reset();
            
            // Reset modal title
            const title = document.getElementById('centreModalTitle');
            if (title) title.textContent = 'Add New Centre';
            
            // Reset button text
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Save Centre';
            
            this.currentEditId = null;
        }
    }
    
    /**
     * Save centre
     */
    async saveCentre() {
        console.log('💾 Saving centre...');
        
        // Collect form data
        const centreData = {
            name: document.getElementById('centreName')?.value.trim() || '',
            code: document.getElementById('centreCode')?.value.trim() || '',
            county: document.getElementById('centreCounty')?.value || '',
            subCounty: document.getElementById('centreSubCounty')?.value.trim() || '',
            address: document.getElementById('centreAddress')?.value.trim() || '',
            contactPerson: document.getElementById('centreContactPerson')?.value.trim() || '',
            phone: document.getElementById('centrePhone')?.value.trim() || '',
            email: document.getElementById('centreEmail')?.value.trim() || '',
            status: document.getElementById('centreStatus')?.value || 'active',
            description: document.getElementById('centreDescription')?.value.trim() || ''
        };
        
        // Validation
        if (!centreData.name) {
            this.showAlert('Centre name is required', 'error');
            return;
        }
        
        if (!centreData.county) {
            this.showAlert('County is required', 'error');
            return;
        }
        
        try {
            // Show loading
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            const originalText = submitBtn?.textContent || 'Save';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }
            
            // Save to database
            let result;
            if (this.currentEditId) {
                // Update existing
                if (this.db && this.db.updateCentre) {
                    result = await this.db.updateCentre(this.currentEditId, centreData);
                }
                this.showAlert('✅ Centre updated successfully!', 'success');
            } else {
                // Add new
                if (this.db && this.db.addCentre) {
                    result = await this.db.addCentre(centreData);
                }
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            // Close modal and refresh
            this.closeModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            this.showAlert('Failed to save centre: ' + error.message, 'error');
        } finally {
            // Reset button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId ? 
                    '<i class="fas fa-save"></i> Update Centre' : 
                    '<i class="fas fa-plus"></i> Add Centre';
                submitBtn.disabled = false;
            }
        }
    }
    
    /**
     * Load centres
     */
    async loadCentres() {
        try {
            console.log('📍 Loading centres...');
            
            // Get from database
            if (this.db && this.db.getCentres) {
                this.centres = await this.db.getCentres();
            } else {
                // Mock data for testing
                this.centres = [
                    { id: 1, name: 'Nairobi Main Centre', code: 'NBO001', county: 'Nairobi', status: 'active' },
                    { id: 2, name: 'Mombasa Branch', code: 'MBA001', county: 'Mombasa', status: 'active' },
                    { id: 3, name: 'Kisumu Centre', code: 'KSM001', county: 'Kisumu', status: 'inactive' }
                ];
            }
            
            this.renderCentres();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            this.showAlert('Failed to load centres', 'error');
        }
    }
    
    /**
     * Render centres grid
     */
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (this.centres.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marker-alt fa-3x"></i>
                    <h3>No Centres Found</h3>
                    <p>Get started by adding your first centre.</p>
                    <button class="btn btn-primary" onclick="window.openCentreModal()">
                        <i class="fas fa-plus"></i> Add Centre
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.centres.map(centre => `
            <div class="card">
                <div class="card-header">
                    <h4>${this.escapeHtml(centre.name)}</h4>
                    <span class="status-badge ${centre.status}">${centre.status.toUpperCase()}</span>
                </div>
                <div class="card-body">
                    <p><strong>Code:</strong> ${centre.code || 'N/A'}</p>
                    <p><strong>County:</strong> ${centre.county || 'N/A'}</p>
                    <p><strong>Sub-County:</strong> ${centre.subCounty || 'N/A'}</p>
                    ${centre.contactPerson ? `<p><strong>Contact:</strong> ${centre.contactPerson}</p>` : ''}
                    ${centre.phone ? `<p><strong>Phone:</strong> ${centre.phone}</p>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline" onclick="window.app.centres.editCentre('${centre.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.app.centres.deleteCentre('${centre.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        const counties = new Set(this.centres.map(c => c.county)).size;
        
        document.getElementById('totalCentres').textContent = total;
        document.getElementById('activeCentres').textContent = active;
        document.getElementById('inactiveCentres').textContent = inactive;
        document.getElementById('totalCounties').textContent = counties;
    }
    
    /**
     * Edit centre
     */
    editCentre(centreId) {
        this.openCentreModal(centreId);
    }
    
    /**
     * Delete centre
     */
    async deleteCentre(centreId) {
        if (!confirm('Are you sure you want to delete this centre?')) {
            return;
        }
        
        try {
            if (this.db && this.db.deleteCentre) {
                await this.db.deleteCentre(centreId);
            }
            
            this.showAlert('✅ Centre deleted successfully!', 'success');
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            this.showAlert('Failed to delete centre', 'error');
        }
    }
    
    /**
     * Export centres
     */
    async exportCentres() {
        try {
            if (this.centres.length === 0) {
                this.showAlert('No centres to export', 'warning');
                return;
            }
            
            // Create CSV
            const headers = ['Name', 'Code', 'County', 'Sub-County', 'Address', 'Contact Person', 'Phone', 'Email', 'Status'];
            const rows = this.centres.map(c => [
                c.name || '',
                c.code || '',
                c.county || '',
                c.subCounty || '',
                c.address || '',
                c.contactPerson || '',
                c.phone || '',
                c.email || '',
                c.status || ''
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            // Download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            this.showAlert(`✅ Exported ${this.centres.length} centres`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting:', error);
            this.showAlert('Failed to export centres', 'error');
        }
    }
    
    /**
     * Search centres
     */
    searchCentres(query) {
        if (!query) {
            this.renderCentres();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = this.centres.filter(c =>
            (c.name && c.name.toLowerCase().includes(searchTerm)) ||
            (c.code && c.code.toLowerCase().includes(searchTerm)) ||
            (c.county && c.county.toLowerCase().includes(searchTerm)) ||
            (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm))
        );
        
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No Results Found</h3>
                    <p>No centres match "${query}"</p>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(centre => `
                <div class="card">
                    <div class="card-header">
                        <h4>${this.escapeHtml(centre.name)}</h4>
                        <span class="status-badge ${centre.status}">${centre.status.toUpperCase()}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Code:</strong> ${centre.code || 'N/A'}</p>
                        <p><strong>County:</strong> ${centre.county || 'N/A'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline" onclick="window.app.centres.editCentre('${centre.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.centres.deleteCentre('${centre.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    /**
     * Show alert
     */
    showAlert(message, type = 'info') {
        // Try to use app's toast if available
        if (this.app && this.app.showToast) {
            this.app.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Refresh centres
     */
    async refresh() {
        await this.loadCentres();
        this.showAlert('Centres refreshed', 'success');
    }
}

// Global functions for HTML onclick
window.openCentreModal = function(centreId) {
    if (window.app && window.app.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        console.error('Centre manager not initialized');
        alert('Please wait for the app to initialize');
    }
};

window.closeCentreModal = function() {
    if (window.app && window.app.centres) {
        window.app.centres.closeModal();
    }
};

window.saveCentre = function(event) {
    if (event) event.preventDefault();
    if (window.app && window.app.centres) {
        window.app.centres.saveCentre();
    } else {
        alert('Centre manager not initialized');
    }
    return false;
};

// Make it globally available
window.CentreManager = CentreManager;

console.log('✅ Centre Manager module loaded');
