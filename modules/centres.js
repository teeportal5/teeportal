// modules/centres.js - COMPLETE Centre Management Module
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.counties = [];
        this.centres = [];
        this.isLoading = false;
        
        // Bind methods
        this.openCentreModal = this.openCentreModal.bind(this);
        this.closeCentreModal = this.closeCentreModal.bind(this);
        this.saveCentre = this.saveCentre.bind(this);
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('📍 Initializing Centre Manager...');
        
        try {
            await this.loadCounties();
            await this.loadCentres();
            this._attachEventListeners();
            this._setupModalHandlers();
            
            console.log('✅ Centre Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Centre Manager:', error);
            this.showAlert('Failed to initialize centre module. Please refresh the page.', 'error');
        }
    }
    
    /**
     * Load counties for dropdown
     */
    async loadCounties() {
        try {
            console.log('📍 Loading counties...');
            
            // Try to get counties from database
            if (this.db && typeof this.db.getCounties === 'function') {
                this.counties = await this.db.getCounties();
                console.log(`✅ Loaded ${this.counties.length} counties from database`);
            } else {
                // Fallback to hardcoded counties
                this.counties = this._getDefaultCounties();
                console.log(`⚠️ Using ${this.counties.length} default counties (database not available)`);
            }
            
        } catch (error) {
            console.error('❌ Error loading counties:', error);
            this.counties = this._getDefaultCounties();
            console.log(`⚠️ Using ${this.counties.length} default counties as fallback`);
        }
    }
    
    /**
     * Get default counties (fallback)
     */
    _getDefaultCounties() {
        return [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 
            'Kisii', 'Kakamega', 'Thika', 'Nyeri', 'Meru',
            'Machakos', 'Kitui', 'Garissa', 'Wajir', 'Mandera',
            'Lamu', 'Kilifi', 'Kwale', 'Tana River', 'Taita Taveta',
            'Embu', 'Kirinyaga', 'Muranga', 'Kiambu', 'Turkana',
            'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu',
            'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia',
            'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Homa Bay',
            'Migori', 'Siaya', 'Busia', 'Vihiga', 'Bungoma'
        ].map((name, index) => ({ id: index + 1, name: name, code: `00${index + 1}`.slice(-3) }));
    }
    
    /**
     * Populate county dropdown
     */
    populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        if (!countySelect) {
            console.error('❌ centreCounty select element not found');
            return;
        }
        
        console.log(`📍 Populating county dropdown with ${this.counties.length} options`);
        
        // Clear existing options (keep first option if it exists)
        const firstOption = countySelect.querySelector('option')?.value === '' ? countySelect.querySelector('option') : null;
        countySelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select County';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        countySelect.appendChild(defaultOption);
        
        // Add counties
        this.counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county.name || county;
            option.textContent = county.name || county;
            countySelect.appendChild(option);
        });
        
        // Restore first option if it was a placeholder
        if (firstOption) {
            countySelect.insertBefore(firstOption, countySelect.firstChild);
        }
        
        console.log('✅ County dropdown populated');
    }
    
    /**
     * Setup modal handlers
     */
    _setupModalHandlers() {
        console.log('📍 Setting up modal handlers...');
        
        // Close button
        const closeBtn = document.querySelector('#centreModal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCentreModal());
        }
        
        // Close when clicking outside modal
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCentreModal();
                }
            });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'block') {
                this.closeCentreModal();
            }
        });
        
        console.log('✅ Modal handlers set up');
    }
    
    /**
     * Open centre modal
     */
    async openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal...');
        
        try {
            const modal = document.getElementById('centreModal');
            if (!modal) {
                throw new Error('Centre modal element not found');
            }
            
            // Populate county dropdown
            await this.populateCountyDropdown();
            
            // If editing an existing centre, load its data
            if (centreId) {
                await this.loadCentreForEdit(centreId);
            } else {
                // For new centre, reset form
                this._resetCentreForm();
                document.getElementById('centreModalTitle').textContent = 'Add New Centre';
            }
            
            // Show modal
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus on first field
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select');
                if (firstInput) firstInput.focus();
            }, 100);
            
            console.log('✅ Centre modal opened');
            
        } catch (error) {
            console.error('❌ Error opening centre modal:', error);
            this.showAlert('Failed to open centre form', 'error');
        }
    }
    
    /**
     * Load centre data for editing
     */
    async loadCentreForEdit(centreId) {
        try {
            console.log(`📝 Loading centre ${centreId} for editing...`);
            
            // Find centre in loaded centres
            const centre = this.centres.find(c => c.id == centreId || c.id === centreId);
            
            if (!centre) {
                throw new Error('Centre not found');
            }
            
            this.currentEditId = centreId;
            
            // Update modal title
            document.getElementById('centreModalTitle').textContent = 'Edit Centre';
            
            // Populate form fields
            const formData = {
                'centreName': centre.name || '',
                'centreCode': centre.code || '',
                'centreCounty': centre.county || '',
                'centreStatus': centre.status || 'active',
                'centreAddress': centre.address || '',
                'centrePhone': centre.phone || '',
                'centreEmail': centre.email || '',
                'centreDescription': centre.description || ''
            };
            
            Object.keys(formData).forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    if (element.type === 'select-one') {
                        element.value = formData[fieldId];
                    } else {
                        element.value = formData[fieldId];
                    }
                }
            });
            
            // Update submit button text
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Centre';
            }
            
            console.log('✅ Centre data loaded for editing');
            
        } catch (error) {
            console.error('❌ Error loading centre for edit:', error);
            this.showAlert('Failed to load centre data', 'error');
            this.closeCentreModal();
        }
    }
    
    /**
     * Close centre modal
     */
    closeCentreModal() {
        console.log('📍 Closing centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) return;
        
        // Hide modal
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset form
        this._resetCentreForm();
        
        console.log('✅ Centre modal closed');
    }
    
    /**
     * Load centres into the grid
     */
    async loadCentres() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            console.log('📍 Loading centres...');
            
            // Get centres from database
            if (this.db && typeof this.db.getCentres === 'function') {
                this.centres = await this.db.getCentres();
                console.log(`✅ Loaded ${this.centres.length} centres from database`);
            } else {
                // Fallback to empty array
                this.centres = [];
                console.log('⚠️ Database not available, using empty centres list');
            }
            
            // Render centres
            await this.renderCentres();
            
            // Update stats
            this._updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            
            // Show error state
            const grid = document.getElementById('centresGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state full-width">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Centres</h3>
                        <p>${error.message || 'Failed to load centres'}</p>
                        <button class="btn-primary" onclick="window.app.centres.loadCentres()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
            }
            
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Render centres in the grid
     */
    async renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) {
            console.error('❌ centresGrid element not found');
            return;
        }
        
        // Show empty state if no centres
        if (!this.centres || this.centres.length === 0) {
            this._renderEmptyState(grid);
            return;
        }
        
        // Render centre cards
        grid.innerHTML = this.centres
            .map(centre => this._renderCentreCard(centre))
            .join('');
        
        console.log(`✅ Rendered ${this.centres.length} centre cards`);
    }
    
    /**
     * Render a centre card
     */
    _renderCentreCard(centre) {
        const centreName = centre.name || 'Unnamed Centre';
        const county = centre.county || 'Not specified';
        const status = centre.status || 'active';
        const centreId = centre.id;
        const code = centre.code || '';
        const address = centre.address || '';
        const phone = centre.phone || '';
        const email = centre.email || '';
        
        // Status badge class
        const statusClass = status === 'active' ? 'active' : 'inactive';
        
        return `
            <div class="card centre-card" data-centre-id="${centreId}">
                <div class="card-header">
                    <h3>${this._escapeHtml(centreName)}</h3>
                    <span class="status-badge ${statusClass}">${status.toUpperCase()}</span>
                </div>
                <div class="card-body">
                    <div class="centre-info">
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="label">County:</span>
                            <span class="value">${this._escapeHtml(county)}</span>
                        </div>
                        ${code ? `
                        <div class="info-item">
                            <i class="fas fa-hashtag"></i>
                            <span class="label">Code:</span>
                            <span class="value">${this._escapeHtml(code)}</span>
                        </div>
                        ` : ''}
                        ${address ? `
                        <div class="info-item">
                            <i class="fas fa-location-dot"></i>
                            <span class="label">Address:</span>
                            <span class="value">${this._escapeHtml(address)}</span>
                        </div>
                        ` : ''}
                        ${phone ? `
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <span class="label">Phone:</span>
                            <span class="value">${this._escapeHtml(phone)}</span>
                        </div>
                        ` : ''}
                        ${email ? `
                        <div class="info-item">
                            <i class="fas fa-envelope"></i>
                            <span class="label">Email:</span>
                            <span class="value">${this._escapeHtml(email)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn-action edit-centre" data-id="${centreId}" title="Edit Centre">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action delete-centre" data-id="${centreId}" title="Delete Centre">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Update statistics display
     */
    _updateStats() {
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        
        const totalEl = document.getElementById('totalCentres');
        const activeEl = document.getElementById('activeCentres');
        const inactiveEl = document.getElementById('inactiveCentres');
        
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (inactiveEl) inactiveEl.textContent = inactive;
    }
    
    /**
     * Save or update centre
     */
    async saveCentre(event) {
        if (event) event.preventDefault();
        
        console.log('💾 Saving centre...');
        
        const form = document.getElementById('centreForm');
        if (!form) {
            console.error('❌ Centre form not found');
            return false;
        }
        
        try {
            // Get form data
            const centreData = {
                name: document.getElementById('centreName')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value || '',
                code: document.getElementById('centreCode')?.value.trim() || '',
                status: document.getElementById('centreStatus')?.value || 'active',
                address: document.getElementById('centreAddress')?.value.trim() || '',
                phone: document.getElementById('centrePhone')?.value.trim() || '',
                email: document.getElementById('centreEmail')?.value.trim() || '',
                description: document.getElementById('centreDescription')?.value.trim() || ''
            };
            
            console.log('📝 Centre data to save:', centreData);
            
            // Validate
            if (!centreData.name) {
                this.showAlert('Centre name is required', 'error');
                return false;
            }
            
            if (!centreData.county) {
                this.showAlert('County is required', 'error');
                return false;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            let result;
            
            if (this.currentEditId) {
                // Update existing centre
                console.log(`🔄 Updating centre ${this.currentEditId}...`);
                
                if (this.db && typeof this.db.updateCentre === 'function') {
                    result = await this.db.updateCentre(this.currentEditId, centreData);
                } else {
                    // Mock update for testing
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
                    const newId = Date.now().toString();
                    centreData.id = newId;
                    result = { success: true, id: newId };
                }
                
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            // Close modal and refresh list
            this.closeCentreModal();
            await this.loadCentres();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            this.showAlert(`Error: ${error.message || 'Failed to save centre'}`, 'error');
            return false;
            
        } finally {
            // Reset button state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = this.currentEditId 
                    ? '<i class="fas fa-save"></i> Update Centre'
                    : '<i class="fas fa-plus"></i> Add Centre';
                submitBtn.disabled = false;
            }
        }
    }
    
    /**
     * Edit centre (called from button click)
     */
    editCentre(centreId) {
        if (!centreId) {
            console.error('❌ No centre ID provided for editing');
            return;
        }
        
        console.log(`✏️ Editing centre ${centreId}...`);
        this.openCentreModal(centreId);
    }
    
    /**
     * Delete centre with confirmation
     */
    async deleteCentre(centreId) {
        if (!centreId) {
            console.error('❌ No centre ID provided for deletion');
            return;
        }
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this centre? This action cannot be undone.')) {
            return;
        }
        
        console.log(`🗑️ Deleting centre ${centreId}...`);
        
        try {
            // Call database delete method
            if (this.db && typeof this.db.deleteCentre === 'function') {
                await this.db.deleteCentre(centreId);
            } else {
                // Mock delete for testing
                console.log(`Mock delete of centre ${centreId}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.showAlert('✅ Centre deleted successfully!', 'success');
            
            // Refresh the list
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            this.showAlert(`Error: ${error.message || 'Failed to delete centre'}`, 'error');
        }
    }
    
    /**
     * Reset centre form
     */
    _resetCentreForm() {
        const form = document.getElementById('centreForm');
        if (form) {
            form.reset();
            document.getElementById('centreModalTitle').textContent = 'Add New Centre';
            
            // Reset submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Centre';
            }
            
            this.currentEditId = null;
        }
    }
    
    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        console.log('📍 Attaching event listeners...');
        
        // Centre form submission
        const centreForm = document.getElementById('centreForm');
        if (centreForm) {
            centreForm.addEventListener('submit', this.saveCentre);
        }
        
        // Export button
        const exportBtn = document.querySelector('[data-action="export-centres"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCentres());
        }
        
        // Add centre button
        const addBtn = document.querySelector('[data-action="add-centre"]');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openCentreModal());
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('[data-action="refresh-centres"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadCentres());
        }
        
        // Event delegation for centre cards (edit/delete buttons)
        const grid = document.getElementById('centresGrid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                const centreId = btn.getAttribute('data-id');
                if (!centreId) return;
                
                if (btn.classList.contains('edit-centre')) {
                    this.editCentre(centreId);
                } else if (btn.classList.contains('delete-centre')) {
                    this.deleteCentre(centreId);
                }
            });
        }
        
        console.log('✅ Event listeners attached');
    }
    
    /**
     * Show alert/toast message
     */
    showAlert(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Use app's toast if available
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type);
            return;
        }
        
        // Fallback to browser alert
        switch (type) {
            case 'error':
                alert(`❌ ${message}`);
                break;
            case 'success':
                alert(`✅ ${message}`);
                break;
            case 'warning':
                alert(`⚠️ ${message}`);
                break;
            default:
                alert(message);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Export centres to CSV
     */
    async exportCentres() {
        try {
            console.log('📤 Exporting centres...');
            
            if (!this.centres || this.centres.length === 0) {
                this.showAlert('No centres to export', 'warning');
                return;
            }
            
            // Create CSV content
            const headers = ['Name', 'Code', 'County', 'Status', 'Address', 'Phone', 'Email', 'Description'];
            const rows = this.centres.map(centre => [
                centre.name || '',
                centre.code || '',
                centre.county || '',
                centre.status || '',
                centre.address || '',
                centre.phone || '',
                centre.email || '',
                centre.description || ''
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => 
                    row.map(cell => 
                        `"${cell.replace(/"/g, '""')}"`
                    ).join(',')
                )
            ].join('\n');
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert(`✅ Exported ${this.centres.length} centres to CSV`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting centres:', error);
            this.showAlert('Failed to export centres', 'error');
        }
    }
    
    /**
     * Render empty state
     */
    _renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state full-width">
                <i class="fas fa-map-marker-alt fa-3x"></i>
                <h3>No Centres Found</h3>
                <p>Get started by adding your first centre.</p>
                <button class="btn-primary" onclick="window.app.centres.openCentreModal()">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
    }
    
    /**
     * Search centres by name or county
     */
    searchCentres(query) {
        if (!query || query.trim() === '') {
            this.renderCentres();
            return;
        }
        
        const searchTerm = query.toLowerCase().trim();
        const filtered = this.centres.filter(centre => 
            (centre.name && centre.name.toLowerCase().includes(searchTerm)) ||
            (centre.county && centre.county.toLowerCase().includes(searchTerm)) ||
            (centre.code && centre.code.toLowerCase().includes(searchTerm))
        );
        
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state full-width">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No Matching Centres</h3>
                    <p>No centres found for "${query}"</p>
                </div>
            `;
        } else {
            grid.innerHTML = filtered
                .map(centre => this._renderCentreCard(centre))
                .join('');
        }
    }
    
    /**
     * Refresh centres data
     */
    async refresh() {
        console.log('🔄 Refreshing centres data...');
        await this.loadCentres();
        this.showAlert('Centres data refreshed', 'success');
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CentreManager;
}

// Global functions for backward compatibility
window.CentreManager = CentreManager;

window.openCentreModal = function(centreId = null) {
    if (window.app && window.app.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        console.error('Centre manager not initialized');
        alert('Please wait for the app to initialize');
    }
};

window.closeCentreModal = function() {
    if (window.app && window.app.centres) {
        window.app.centres.closeCentreModal();
    } else {
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
};

window.saveCentre = function(event) {
    event.preventDefault();
    if (window.app && window.app.centres) {
        window.app.centres.saveCentre(event);
    } else {
        alert('Centre manager not initialized');
    }
    return false;
};

console.log('✅ Centre Manager module loaded');
