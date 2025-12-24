// modules/centres.js - FIXED County Population
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
            // Load counties FIRST
            await this.loadCounties();
            this.setupEventListeners();
            await this.loadCentres();
            
            console.log('✅ Centre Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Centre Manager:', error);
        }
    }
    
    /**
     * Load counties for dropdown - FIXED
     */
    async loadCounties() {
        try {
            console.log('📍 Loading counties for dropdown...');
            
            if (this.db && typeof this.db.getCounties === 'function') {
                console.log('📡 Fetching counties from database...');
                const countiesData = await this.db.getCounties();
                
                // Handle different response formats
                if (Array.isArray(countiesData)) {
                    if (countiesData.length > 0 && typeof countiesData[0] === 'string') {
                        // Array of strings: ['Nairobi', 'Mombasa']
                        this.counties = countiesData;
                    } else if (countiesData.length > 0 && countiesData[0].name) {
                        // Array of objects: [{name: 'Nairobi'}, {name: 'Mombasa'}]
                        this.counties = countiesData.map(county => county.name);
                    } else {
                        // Unknown format, use defaults
                        this.counties = this.getDefaultCounties();
                    }
                } else {
                    // Not an array, use defaults
                    this.counties = this.getDefaultCounties();
                }
                
                console.log(`✅ Loaded ${this.counties.length} counties from database:`, this.counties);
            } else {
                // Use default counties
                this.counties = this.getDefaultCounties();
                console.log(`📋 Using ${this.counties.length} default counties:`, this.counties);
            }
            
        } catch (error) {
            console.error('❌ Error loading counties:', error);
            this.counties = this.getDefaultCounties();
            console.log('🔄 Using fallback counties due to error:', this.counties);
        }
    }
    
    /**
     * Get default counties
     */
    getDefaultCounties() {
        return [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
            'Kisii', 'Kakamega', 'Thika', 'Nyeri', 'Meru',
            'Machakos', 'Kitui', 'Garissa', 'Wajir', 'Mandera',
            'Lamu', 'Kilifi', 'Kwale', 'Tana River', 'Taita Taveta'
        ];
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
     * Open centre modal - FIXED to populate counties
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
        
        // DEBUG: Check counties data
        console.log('🔍 Available counties:', this.counties);
        console.log('🔍 County dropdown element:', document.getElementById('centreCounty'));
        
        // Populate counties dropdown - THIS IS THE FIX
        this.populateCountyDropdown();
        
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
        
        console.log('✅ Centre modal opened with counties populated');
    }
    
    /**
     * Populate county dropdown - FIXED FUNCTION
     */
    populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        
        if (!countySelect) {
            console.error('❌ centreCounty select element not found in DOM!');
            console.error('🔍 Searching for centreCounty...', document.querySelectorAll('select'));
            return;
        }
        
        console.log(`📍 Populating county dropdown with ${this.counties.length} counties`);
        console.log('🔍 Counties to add:', this.counties);
        
        // Save current value if editing
        const currentValue = countySelect.value;
        
        // Clear existing options (keep first option if it exists)
        countySelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select County';
        defaultOption.disabled = true;
        defaultOption.selected = !currentValue;
        countySelect.appendChild(defaultOption);
        
        // Add all counties
        this.counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            
            // Select if this was the previously selected value
            if (currentValue === county) {
                option.selected = true;
                defaultOption.selected = false;
            }
            
            countySelect.appendChild(option);
        });
        
        console.log(`✅ County dropdown populated with ${this.counties.length} options`);
        console.log('🔍 Final dropdown HTML:', countySelect.innerHTML);
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
                    console.log(`✓ Set ${fieldId} = "${value}"`);
                } else {
                    console.error(`❌ Field ${fieldId} not found in DOM`);
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
     * Save centre
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
        
        console.log('📝 Form data to save:', centreData);
        
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
                        status: 'active'
                    },
                    { 
                        id: 2, 
                        name: 'Mombasa Branch', 
                        code: 'MBA001', 
                        county: 'Mombasa',
                        status: 'active'
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
        
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type);
            return;
        }
        
        alert(message);
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
