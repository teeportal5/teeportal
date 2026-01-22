// modules/centres.js - SIMPLIFIED WORKING VERSION
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.centres = [];
        this.isLoading = false;
        this.countiesList = [];
        
        console.log('🏢 Centre Manager initialized');
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('🚀 Initializing Centre Manager...');
        
        try {
            // Initialize database
            if (this.db && typeof this.db.init === 'function') {
                await this.db.init();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load centres
            await this.loadCentres();
            
            console.log('✅ Centre Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Centre Manager:', error);
            this.showAlert('Failed to initialize centre module', 'error');
            return false;
        }
    }
    
    /**
     * Setup all event listeners - SIMPLE VERSION
     */
    setupEventListeners() {
        console.log('📍 Setting up event listeners...');
        
        // Add Centre button
        document.getElementById('addCentreBtn')?.addEventListener('click', () => {
            this.openCentreModal();
        });
        
        // Export button
        document.getElementById('exportCentresBtn')?.addEventListener('click', () => {
            this.exportCentres();
        });
        
        // Refresh button
        document.getElementById('refreshCentresBtn')?.addEventListener('click', () => {
            this.refresh();
        });
        
        // Clear search button
        document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
            document.getElementById('centreSearchInput').value = '';
            this.searchCentres('');
        });
        
        // Search input
        document.getElementById('centreSearchInput')?.addEventListener('input', (e) => {
            this.searchCentres(e.target.value);
        });
        
        // Modal close buttons
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            this.closeCentreModal();
        });
        
        document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
            this.closeCentreModal();
        });
        
        // Form submission
        document.getElementById('centreForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCentre();
        });
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Open centre modal
     */
    openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal...', centreId);
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Update counties list
        this.updateCountyDatalist();
        
        if (centreId) {
            this.loadCentreData(centreId);
        } else {
            this.resetForm();
        }
        
        // Focus on first field
        setTimeout(() => {
            document.getElementById('centreName')?.focus();
        }, 100);
    }
    
    /**
     * Update county datalist
     */
    updateCountyDatalist() {
        const counties = [...new Set(this.centres
            .filter(c => c.county)
            .map(c => c.county.trim())
            .filter(c => c.length > 0))].sort();
        
        const datalist = document.getElementById('countySuggestions');
        if (datalist) {
            datalist.innerHTML = counties.map(county => 
                `<option value="${county}">${county}</option>`
            ).join('');
        }
    }
    
    /**
     * Load centre data for editing
     */
    loadCentreData(centreId) {
        const centre = this.centres.find(c => c.id === centreId);
        if (!centre) return;
        
        this.currentEditId = centreId;
        
        // Update modal title
        const titleEl = document.getElementById('centreModalTitle');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> Edit Centre`;
        }
        
        // Update submit button text
        const submitBtn = document.getElementById('saveCentreBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Centre';
        }
        
        // Populate form
        document.getElementById('centreName').value = centre.name || '';
        document.getElementById('centreCounty').value = centre.county || '';
        document.getElementById('centreRegion').value = centre.region || '';
        document.getElementById('centreStatus').value = centre.status || 'active';
    }
    
    /**
     * Save centre
     */
    async saveCentre() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            // Get form data
            const centreData = {
                name: document.getElementById('centreName').value.trim(),
                county: document.getElementById('centreCounty').value.trim(),
                region: document.getElementById('centreRegion').value,
                status: document.getElementById('centreStatus').value || 'active',
                updated_at: new Date().toISOString()
            };
            
            // Validate
            if (!centreData.name) {
                this.showAlert('Centre name is required', 'error');
                this.isLoading = false;
                return;
            }
            
            if (!centreData.county) {
                this.showAlert('County is required', 'error');
                this.isLoading = false;
                return;
            }
            
            // Show loading
            const submitBtn = document.getElementById('saveCentreBtn');
            const originalText = submitBtn?.innerHTML;
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }
            
            if (this.currentEditId) {
                // Update
                await this.updateCentreInDatabase(this.currentEditId, centreData);
                this.showAlert('Centre updated successfully', 'success');
            } else {
                // Add new
                centreData.created_at = new Date().toISOString();
                await this.addCentreToDatabase(centreData);
                this.showAlert('Centre added successfully', 'success');
            }
            
            // Reset button
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            this.showAlert('Error saving centre: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Reset form
     */
    resetForm() {
        document.getElementById('centreForm')?.reset();
        
        // Reset modal title
        const titleEl = document.getElementById('centreModalTitle');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> Add New Centre`;
        }
        
        // Reset submit button
        const submitBtn = document.getElementById('saveCentreBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Centre';
        }
        
        this.currentEditId = null;
    }
    
    /**
     * Close centre modal
     */
    closeCentreModal() {
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            this.resetForm();
        }
    }
    
    /**
     * Load centres
     */
    async loadCentres() {
        try {
            if (this.db && typeof this.db.getCentres === 'function') {
                this.centres = await this.db.getCentres();
            } else if (this.db?.supabase) {
                const { data, error } = await this.db.supabase
                    .from('centres')
                    .select('*')
                    .order('name');
                if (error) throw error;
                this.centres = data || [];
            }
            
            this.renderCentres();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            this.renderEmptyState();
        }
    }
    
    /**
     * Render centres grid
     */
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (!this.centres.length) {
            this.renderEmptyState();
            return;
        }
        
        grid.innerHTML = this.centres.map(centre => this.createCentreCard(centre)).join('');
        
        // Add event listeners to cards
        setTimeout(() => {
            document.querySelectorAll('.edit-centre').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const centreId = e.target.closest('button').dataset.id;
                    this.openCentreModal(centreId);
                });
            });
            
            document.querySelectorAll('.delete-centre').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const centreId = e.target.closest('button').dataset.id;
                    if (confirm('Delete this centre?')) {
                        await this.deleteCentre(centreId);
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Create centre card HTML
     */
    createCentreCard(centre) {
        return `
            <div class="card centre-card">
                <div class="card-header">
                    <h4>${this.escapeHtml(centre.name)}</h4>
                    <span class="status-badge ${centre.status}">${centre.status}</span>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <strong>County:</strong> ${this.escapeHtml(centre.county || 'N/A')}
                    </div>
                    ${centre.region ? `
                    <div class="info-item">
                        <i class="fas fa-globe"></i>
                        <strong>Region:</strong> ${this.escapeHtml(centre.region)}
                    </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline edit-centre" data-id="${centre.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-centre" data-id="${centre.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt fa-3x"></i>
                <h3>No Centres Found</h3>
                <p>Click "Add Centre" to get started</p>
                <button class="btn btn-primary" id="emptyAddBtn">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
        
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => {
            this.openCentreModal();
        });
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        const counties = new Set(this.centres.map(c => c.county).filter(Boolean)).size;
        
        document.getElementById('totalCentresCount').textContent = total;
        document.getElementById('activeCentresCount').textContent = active;
        document.getElementById('inactiveCentresCount').textContent = inactive;
        document.getElementById('countiesCount').textContent = counties;
    }
    
    /**
     * Search centres
     */
    searchCentres(query) {
        if (!query.trim()) {
            this.renderCentres();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = this.centres.filter(centre =>
            centre.name.toLowerCase().includes(searchTerm) ||
            centre.county.toLowerCase().includes(searchTerm) ||
            (centre.region && centre.region.toLowerCase().includes(searchTerm))
        );
        
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (!filtered.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No Results Found</h3>
                    <p>No centres match "${query}"</p>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(centre => this.createCentreCard(centre)).join('');
        }
    }
    
    /**
     * Export centres
     */
    async exportCentres() {
        if (!this.centres.length) {
            this.showAlert('No centres to export', 'warning');
            return;
        }
        
        const csvContent = [
            ['Name', 'County', 'Region', 'Status', 'Created'].join(','),
            ...this.centres.map(c => [
                `"${c.name}"`,
                `"${c.county}"`,
                `"${c.region || ''}"`,
                `"${c.status}"`,
                `"${c.created_at || ''}"`
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showAlert(`Exported ${this.centres.length} centres`, 'success');
    }
    
    /**
     * Refresh centres
     */
    async refresh() {
        await this.loadCentres();
        this.showAlert('Centres refreshed', 'success');
    }
    
    /**
     * Delete centre
     */
    async deleteCentre(centreId) {
        try {
            if (this.db && typeof this.db.deleteCentre === 'function') {
                await this.db.deleteCentre(centreId);
            } else if (this.db?.supabase) {
                await this.db.supabase.from('centres').delete().eq('id', centreId);
            }
            
            this.centres = this.centres.filter(c => c.id !== centreId);
            this.renderCentres();
            this.updateStats();
            this.showAlert('Centre deleted', 'success');
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            this.showAlert('Error deleting centre', 'error');
        }
    }
    
    /**
     * Database helper methods
     */
    async updateCentreInDatabase(id, data) {
        if (this.db?.supabase) {
            const { error } = await this.db.supabase
                .from('centres')
                .update(data)
                .eq('id', id);
            if (error) throw error;
        }
    }
    
    async addCentreToDatabase(data) {
        if (this.db?.supabase) {
            const { data: result, error } = await this.db.supabase
                .from('centres')
                .insert([data])
                .select();
            if (error) throw error;
            return result?.[0];
        }
        return data;
    }
    
    /**
     * Show alert
     */
    showAlert(message, type = 'info') {
        console.log(`${type}: ${message}`);
        alert(`${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export
window.CentreManager = CentreManager;
