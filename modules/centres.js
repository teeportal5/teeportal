// modules/centres.js - Centre Management Module (Fixed Mandatory Fields)
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.counties = [];
        this.centres = [];
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('🚀 Initializing Centre Manager...');
        
        try {
            await this.loadCounties();
            this.setupEventListeners();
            await this.loadCentres();
            
            console.log('✅ Centre Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Centre Manager:', error);
        }
    }
    
    /**
     * Load counties for dropdown
     */
    async loadCounties() {
        try {
            console.log('📍 Loading counties...');
            
            if (this.db && typeof this.db.getCounties === 'function') {
                const countiesData = await this.db.getCounties();
                this.counties = countiesData.map(item => 
                    typeof item === 'string' ? item : item.name || item
                );
            } else {
                // Default counties
                this.counties = [
                    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
                    'Kisii', 'Kakamega', 'Thika', 'Nyeri', 'Meru'
                ];
            }
            
            console.log(`✅ Loaded ${this.counties.length} counties`);
            
        } catch (error) {
            console.error('❌ Error loading counties:', error);
            this.counties = ['Nairobi', 'Mombasa', 'Kisumu'];
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        console.log('📍 Setting up event listeners...');
        
        // Form submission
        const form = document.getElementById('centreForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCentre();
            });
            console.log('✅ Form submit listener added');
        } else {
            console.error('❌ Centre form not found!');
        }
        
        // Close modal buttons
        const closeButtons = document.querySelectorAll('[data-modal-close], .close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeCentreModal());
        });
        
        // Close modal when clicking outside
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCentreModal();
                }
            });
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'block') {
                this.closeCentreModal();
            }
        });
        
        console.log('✅ Event listeners setup complete');
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
        
        // Show modal
        modal.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Populate counties dropdown
        await this.populateCountyDropdown();
        
        // If editing, load centre data
        if (centreId) {
            await this.loadCentreData(centreId);
        } else {
            // For new centre, reset form
            this.resetForm();
        }
        
        // Focus on first field
        setTimeout(() => {
            document.getElementById('centreName')?.focus();
        }, 100);
        
        console.log('✅ Centre modal opened');
    }
    
    /**
     * Populate county dropdown
     */
    async populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        if (!countySelect) {
            console.error('❌ centreCounty select not found!');
            return;
        }
        
        console.log(`📍 Populating county dropdown with ${this.counties.length} counties`);
        
        // Clear and add options
        countySelect.innerHTML = '<option value="">Select County</option>';
        
        this.counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countySelect.appendChild(option);
        });
        
        console.log('✅ County dropdown populated');
    }
    
    /**
     * Load centre data for editing
     */
    async loadCentreData(centreId) {
        try {
            console.log(`📝 Loading centre ${centreId} for editing...`);
            
            // Find centre in loaded centres
            const centre = this.centres.find(c => c.id == centreId || c.id === centreId);
            
            if (!centre) {
                this.showAlert('Centre not found', 'error');
                return;
            }
            
            this.currentEditId = centreId;
            
            // Update modal title
            const titleEl = document.getElementById('centreModalTitle');
            if (titleEl) {
                titleEl.textContent = 'Edit Centre';
            }
            
            // Populate form fields
            const formData = {
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
            
            // Set each field value
            Object.entries(formData).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                }
            });
            
            // Update submit button text
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Centre';
            }
            
            console.log('✅ Centre data loaded for editing');
            
        } catch (error) {
            console.error('❌ Error loading centre data:', error);
            this.showAlert('Error loading centre data', 'error');
        }
    }
    
    /**
     * Save centre - ONLY NAME, CODE, COUNTY ARE MANDATORY
     */
    async saveCentre() {
        console.log('💾 Saving centre...');
        
        // Get MANDATORY fields
        const centreName = document.getElementById('centreName')?.value.trim() || '';
        const centreCode = document.getElementById('centreCode')?.value.trim() || '';
        const centreCounty = document.getElementById('centreCounty')?.value || '';
        
        // Get OPTIONAL fields
        const centreSubCounty = document.getElementById('centreSubCounty')?.value.trim() || '';
        const centreAddress = document.getElementById('centreAddress')?.value.trim() || '';
        const centreContactPerson = document.getElementById('centreContactPerson')?.value.trim() || '';
        const centrePhone = document.getElementById('centrePhone')?.value.trim() || '';
        const centreEmail = document.getElementById('centreEmail')?.value.trim() || '';
        const centreStatus = document.getElementById('centreStatus')?.value || 'active';
        const centreDescription = document.getElementById('centreDescription')?.value.trim() || '';
        
        // Collect all data
        const centreData = {
            name: centreName,
            code: centreCode,
            county: centreCounty,
            subCounty: centreSubCounty,
            address: centreAddress,
            contactPerson: centreContactPerson,
            phone: centrePhone,
            email: centreEmail,
            status: centreStatus,
            description: centreDescription
        };
        
        console.log('📝 Form data:', centreData);
        
        // VALIDATION: Only check mandatory fields
        const errors = [];
        
        if (!centreData.name) {
            errors.push('Centre name is required');
            document.getElementById('centreName')?.classList.add('error');
        } else {
            document.getElementById('centreName')?.classList.remove('error');
        }
        
        if (!centreData.code) {
            errors.push('Centre code is required');
            document.getElementById('centreCode')?.classList.add('error');
        } else {
            document.getElementById('centreCode')?.classList.remove('error');
        }
        
        if (!centreData.county) {
            errors.push('County is required');
            document.getElementById('centreCounty')?.classList.add('error');
        } else {
            document.getElementById('centreCounty')?.classList.remove('error');
        }
        
        // Show errors if any
        if (errors.length > 0) {
            this.showAlert(errors.join('\n'), 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            const originalContent = submitBtn?.innerHTML;
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }
            
            let result;
            
            if (this.currentEditId) {
                // Update existing centre
                console.log(`🔄 Updating centre ${this.currentEditId}...`);
                
                if (this.db && typeof this.db.updateCentre === 'function') {
                    result = await this.db.updateCentre(this.currentEditId, centreData);
                } else {
                    // Mock update for testing
                    console.log('Mock update:', centreData);
                    result = { success: true, id: this.currentEditId };
                }
                
                this.showAlert('✅ Centre updated successfully!', 'success');
            } else {
                // Add new centre
                console.log('➕ Adding new centre...');
                
                if (this.db && typeof this.db.addCentre === 'function') {
                    result = await this.db.addCentre(centreData);
                } else {
                    // Mock add for testing
                    console.log('Mock add:', centreData);
                    const newId = 'centre_' + Date.now();
                    centreData.id = newId;
                    result = { success: true, id: newId };
                }
                
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            this.showAlert('Error saving centre: ' + error.message, 'error');
            
            // Reset button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId 
                    ? '<i class="fas fa-save"></i> Update Centre'
                    : '<i class="fas fa-plus"></i> Add Centre';
                submitBtn.disabled = false;
            }
        }
    }
    
    /**
     * Close centre modal
     */
    closeCentreModal() {
        console.log('📍 Closing centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
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
            
            // Remove error classes
            ['centreName', 'centreCode', 'centreCounty'].forEach(id => {
                document.getElementById(id)?.classList.remove('error');
            });
            
            // Reset modal title
            const titleEl = document.getElementById('centreModalTitle');
            if (titleEl) {
                titleEl.textContent = 'Add New Centre';
            }
            
            // Reset submit button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Centre';
            }
            
            this.currentEditId = null;
            
            console.log('✅ Form reset');
        }
    }
    
    /**
     * Load centres
     */
    async loadCentres() {
        try {
            console.log('📍 Loading centres...');
            
            if (this.db && typeof this.db.getCentres === 'function') {
                this.centres = await this.db.getCentres();
            } else {
                // Mock data for testing
                this.centres = [
                    { 
                        id: 1, 
                        name: 'Nairobi Main Centre', 
                        code: 'NBO001', 
                        county: 'Nairobi',
                        subCounty: 'Westlands',
                        address: 'Westlands Road',
                        contactPerson: 'John Doe',
                        phone: '0712345678',
                        email: 'nairobi@example.com',
                        status: 'active',
                        description: 'Main centre in Nairobi'
                    },
                    { 
                        id: 2, 
                        name: 'Mombasa Branch', 
                        code: 'MBA001', 
                        county: 'Mombasa',
                        status: 'active'
                    },
                    { 
                        id: 3, 
                        name: 'Kisumu Centre', 
                        code: 'KSM001', 
                        county: 'Kisumu',
                        status: 'inactive'
                    }
                ];
            }
            
            this.renderCentres();
            this.updateStats();
            
            console.log(`✅ Loaded ${this.centres.length} centres`);
            
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
        if (!grid) {
            console.error('❌ centresGrid not found!');
            return;
        }
        
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
                    ${centre.subCounty ? `<p><strong>Sub-County:</strong> ${centre.subCounty}</p>` : ''}
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
     * Edit centre
     */
    editCentre(centreId) {
        console.log(`✏️ Editing centre ${centreId}...`);
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
            console.log(`🗑️ Deleting centre ${centreId}...`);
            
            if (this.db && typeof this.db.deleteCentre === 'function') {
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
     * Update statistics
     */
    updateStats() {
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        const counties = [...new Set(this.centres.map(c => c.county).filter(Boolean))].length;
        
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        updateElement('totalCentres', total);
        updateElement('activeCentres', active);
        updateElement('inactiveCentres', inactive);
        updateElement('totalCounties', counties);
        
        console.log('📊 Stats updated:', { total, active, inactive, counties });
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
            
            const headers = ['Name', 'Code', 'County', 'Sub-County', 'Address', 'Contact Person', 'Phone', 'Email', 'Status', 'Description'];
            const rows = this.centres.map(c => [
                c.name || '',
                c.code || '',
                c.county || '',
                c.subCounty || '',
                c.address || '',
                c.contactPerson || '',
                c.phone || '',
                c.email || '',
                c.status || '',
                c.description || ''
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert(`✅ Exported ${this.centres.length} centres`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting:', error);
            this.showAlert('Failed to export centres', 'error');
        }
    }
    
    /**
     * Show alert
     */
    showAlert(message, type = 'info') {
        console.log(`📢 ${type}: ${message}`);
        
        // Try app toast first
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type);
            return;
        }
        
        // Fallback to alert with emoji
        const emojis = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        alert(`${emojis[type] || ''} ${message}`);
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
}

// Global functions for HTML onclick
window.openCentreModal = function(centreId = null) {
    console.log('🌐 Global openCentreModal called');
    if (window.app && window.app.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        console.error('❌ Centre manager not initialized');
        alert('Please wait for app initialization');
    }
};

window.closeCentreModal = function() {
    console.log('🌐 Global closeCentreModal called');
    if (window.app && window.app.centres) {
        window.app.centres.closeCentreModal();
    }
};

window.saveCentre = function(event) {
    if (event) event.preventDefault();
    console.log('🌐 Global saveCentre called');
    if (window.app && window.app.centres) {
        window.app.centres.saveCentre();
    } else {
        alert('Centre manager not initialized');
    }
    return false;
};

// Make globally available
window.CentreManager = CentreManager;

console.log('✅ Centre Manager module loaded and ready');
