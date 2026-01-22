// modules/centres.js - FIXED VERSION WITH WORKING ADD BUTTON
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.centres = [];
        this.isLoading = false;
        this.countiesList = [];
        
        console.log('🏢 Centre Manager initialized (Fixed)');
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
     * Setup all event listeners - FIXED VERSION
     */
    setupEventListeners() {
        console.log('📍 Setting up event listeners...');
        
        // Form submission - Use event delegation
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'centreForm') {
                e.preventDefault();
                this.saveCentre();
            }
        });
        
        // Add Centre button from header - FIXED
        const addBtn = document.querySelector('.btn-primary[onclick*="openCentreModal"]');
        if (addBtn) {
            // Remove the inline onclick and add proper event listener
            addBtn.removeAttribute('onclick');
            addBtn.addEventListener('click', () => {
                this.openCentreModal();
            });
            console.log('✅ Add Centre button listener added');
        }
        
        // Export button
        const exportBtn = document.querySelector('.btn-secondary[onclick*="exportCentres"]');
        if (exportBtn) {
            exportBtn.removeAttribute('onclick');
            exportBtn.addEventListener('click', () => this.exportCentres());
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('.btn-outline[onclick*="refresh"]');
        if (refreshBtn) {
            refreshBtn.removeAttribute('onclick');
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Search input - with debouncing
        const searchInput = document.getElementById('centreSearchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.searchCentres(e.target.value);
                }, 300);
            });
        }
        
        // Clear search button
        const clearSearchBtn = document.querySelector('.search-clear');
        if (clearSearchBtn) {
            clearSearchBtn.removeAttribute('onclick');
            clearSearchBtn.addEventListener('click', () => {
                document.getElementById('centreSearchInput').value = '';
                this.searchCentres('');
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Open centre modal
     */
    openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal for:', centreId || 'new centre');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        try {
            // Show modal
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            
            // Update counties list
            this.updateCountyDatalist();
            
            // If editing, load centre data
            if (centreId) {
                this.loadCentreData(centreId);
            } else {
                this.resetForm();
            }
            
            // Focus on first field
            setTimeout(() => {
                const firstInput = document.getElementById('centreName');
                if (firstInput) {
                    firstInput.focus();
                    firstInput.select();
                }
            }, 100);
            
            console.log('✅ Centre modal opened successfully');
            
        } catch (error) {
            console.error('❌ Error opening centre modal:', error);
            this.showAlert('Failed to open centre form', 'error');
        }
    }
    
    /**
     * Update county datalist with current counties
     */
    updateCountyDatalist() {
        // Get all unique counties from current centres
        const allCounties = [...new Set(this.centres
            .filter(c => c.county)
            .map(c => c.county.trim())
            .filter(c => c.length > 0))];
        
        // Combine with existing list
        const combinedCounties = [...new Set([...this.countiesList, ...allCounties])].sort();
        
        // Update datalist
        const datalist = document.getElementById('countySuggestions');
        if (datalist) {
            datalist.innerHTML = '';
            combinedCounties.forEach(county => {
                const option = document.createElement('option');
                option.value = county;
                datalist.appendChild(option);
            });
        }
    }
    
    /**
     * Load centre data for editing
     */
    async loadCentreData(centreId) {
        try {
            console.log(`📝 Loading centre ${centreId} for editing...`);
            
            // Find centre
            const centre = this.centres.find(c => 
                c.id == centreId || 
                c.id === centreId || 
                String(c.id) === String(centreId)
            );
            
            if (!centre) {
                this.showAlert('Centre not found', 'error');
                return;
            }
            
            this.currentEditId = centreId;
            
            // Update modal UI
            this.updateModalUI('Edit Centre');
            
            // Populate form fields
            const formData = {
                'centreName': centre.name || '',
                'centreCounty': centre.county || '',
                'centreRegion': centre.region || '',
                'centreStatus': centre.status || 'active'
            };
            
            // Set each field value
            Object.entries(formData).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                }
            });
            
            console.log('✅ Centre data loaded for editing');
            
        } catch (error) {
            console.error('❌ Error loading centre data:', error);
            this.showAlert('Error loading centre data', 'error');
        }
    }
    
    /**
     * Update modal UI based on action
     */
    updateModalUI(title) {
        // Update modal title
        const titleEl = document.getElementById('centreModalTitle');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${title}`;
        }
        
        // Update submit button text
        const submitBtn = document.querySelector('#centreForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = this.currentEditId 
                ? '<i class="fas fa-save"></i> Update Centre'
                : '<i class="fas fa-plus"></i> Add Centre';
        }
    }
    
    /**
     * Save centre
     */
    async saveCentre() {
        console.log('💾 Saving centre...');
        
        // Prevent multiple submissions
        if (this.isLoading) {
            console.log('⏳ Already saving, please wait...');
            return;
        }
        
        this.isLoading = true;
        
        try {
            // Get form data
            const centreData = {
                name: document.getElementById('centreName')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value.trim() || '',
                region: document.getElementById('centreRegion')?.value || '',
                status: document.getElementById('centreStatus')?.value || 'active',
                updated_at: new Date().toISOString()
            };
            
            console.log('📝 Form data to save:', centreData);
            
            // Validation
            const errors = this.validateCentreData(centreData);
            if (errors.length > 0) {
                this.showAlert(errors.join('\n'), 'error');
                this.isLoading = false;
                return;
            }
            
            // Show loading state on submit button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                const originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
                
                // Revert after save
                setTimeout(() => {
                    submitBtn.innerHTML = originalHtml;
                    submitBtn.disabled = false;
                }, 1000);
            }
            
            let result;
            
            if (this.currentEditId) {
                // Update existing centre
                console.log(`🔄 Updating centre ${this.currentEditId}...`);
                result = await this.updateCentreInDatabase(this.currentEditId, centreData);
                this.showAlert('✅ Centre updated successfully!', 'success');
            } else {
                // Add new centre
                centreData.created_at = new Date().toISOString();
                console.log('➕ Adding new centre...');
                result = await this.addCentreToDatabase(centreData);
                
                // Add new county to list if it's new
                if (centreData.county && !this.countiesList.includes(centreData.county)) {
                    this.countiesList.push(centreData.county);
                    this.countiesList.sort();
                }
                
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            console.log('✅ Save result:', result);
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            this.showAlert(`Error: ${error.message || 'Failed to save centre'}`, 'error');
            
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Validate centre data
     */
    validateCentreData(data) {
        const errors = [];
        
        if (!data.name.trim()) {
            errors.push('Centre name is required');
            this.highlightField('centreName', true);
        } else {
            this.highlightField('centreName', false);
        }
        
        if (!data.county.trim()) {
            errors.push('County is required');
            this.highlightField('centreCounty', true);
        } else {
            this.highlightField('centreCounty', false);
        }
        
        return errors;
    }
    
    /**
     * Highlight form field
     */
    highlightField(fieldId, isError) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.toggle('error', isError);
            if (isError) {
                field.focus();
            }
        }
    }
    
    /**
     * Update centre in database
     */
    async updateCentreInDatabase(id, data) {
        if (this.db && typeof this.db.updateCentre === 'function') {
            return await this.db.updateCentre(id, data);
        } else if (this.db && typeof this.db.update === 'function') {
            return await this.db.update('centres', id, data);
        } else if (this.db?.supabase) {
            const { data: result, error } = await this.db.supabase
                .from('centres')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result?.[0];
        } else {
            // Local fallback
            const index = this.centres.findIndex(c => c.id === id);
            if (index !== -1) {
                this.centres[index] = { ...this.centres[index], ...data };
                return this.centres[index];
            }
            throw new Error('Centre not found');
        }
    }
    
    /**
     * Add centre to database
     */
    async addCentreToDatabase(data) {
        if (this.db && typeof this.db.addCentre === 'function') {
            return await this.db.addCentre(data);
        } else if (this.db && typeof this.db.insert === 'function') {
            return await this.db.insert('centres', data);
        } else if (this.db?.supabase) {
            const { data: result, error } = await this.db.supabase
                .from('centres')
                .insert([data])
                .select();
            if (error) throw error;
            return result?.[0];
        } else {
            // Local fallback
            const newId = Date.now().toString();
            const newCentre = { 
                id: newId, 
                ...data
            };
            this.centres.unshift(newCentre);
            return newCentre;
        }
    }
    
    /**
     * Close centre modal
     */
    closeCentreModal() {
        console.log('📍 Closing centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            this.resetForm();
            
            console.log('✅ Centre modal closed');
        }
    }
    
    /**
     * Reset form
     */
    resetForm() {
        const form = document.getElementById('centreForm');
        if (form) {
            form.reset();
            
            // Remove error highlighting
            ['centreName', 'centreCounty'].forEach(id => {
                this.highlightField(id, false);
            });
            
            // Reset modal UI
            this.updateModalUI('Add New Centre');
            
            this.currentEditId = null;
            
            console.log('✅ Form reset');
        }
    }
    
    /**
     * Load centres from database
     */
    async loadCentres() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            console.log('📍 Loading centres...');
            
            if (this.db && typeof this.db.getCentres === 'function') {
                this.centres = await this.db.getCentres();
            } else if (this.db?.supabase) {
                const { data, error } = await this.db.supabase
                    .from('centres')
                    .select('*')
                    .order('name');
                if (error) throw error;
                this.centres = data || [];
            } else {
                // Fallback to local data
                this.centres = this.centres || [];
            }
            
            console.log(`✅ Loaded ${this.centres.length} centres`);
            
            // Update counties list
            const counties = [...new Set(this.centres
                .filter(c => c.county)
                .map(c => c.county.trim())
                .filter(c => c.length > 0))];
            this.countiesList = counties.sort();
            
            // Render centres
            this.renderCentres();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            this.showAlert('Failed to load centres', 'error');
            this.renderEmptyState();
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Render centres grid
     */
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (!this.centres || this.centres.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        grid.innerHTML = '';
        this.centres.forEach(centre => {
            const card = this.createCentreCard(centre);
            grid.appendChild(card);
        });
        
        console.log(`✅ Rendered ${this.centres.length} centre cards`);
        this.attachCardEventListeners();
    }
    
    /**
     * Create centre card
     */
    createCentreCard(centre) {
        const card = document.createElement('div');
        card.className = 'card centre-card';
        card.setAttribute('data-centre-id', centre.id);
        
        card.innerHTML = `
            <div class="card-header">
                <h4 class="centre-name">${this.escapeHtml(centre.name)}</h4>
                <span class="status-badge ${centre.status || 'active'}">
                    ${(centre.status || 'active').toUpperCase()}
                </span>
            </div>
            <div class="card-body">
                <div class="centre-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="label">County:</span>
                        <span class="value">${this.escapeHtml(centre.county || 'Not specified')}</span>
                    </div>
                    ${centre.region ? `
                    <div class="info-item">
                        <i class="fas fa-compass"></i>
                        <span class="label">Region:</span>
                        <span class="value">${this.escapeHtml(centre.region)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline edit-centre" data-id="${centre.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-centre" data-id="${centre.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Attach event listeners to cards
     */
    attachCardEventListeners() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        // Use event delegation for better performance
        grid.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-centre');
            if (editBtn) {
                e.preventDefault();
                const centreId = editBtn.getAttribute('data-id');
                this.editCentre(centreId);
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-centre');
            if (deleteBtn) {
                e.preventDefault();
                const centreId = deleteBtn.getAttribute('data-id');
                this.deleteCentre(centreId);
                return;
            }
        });
    }
    
    /**
     * Edit centre
     */
    editCentre(centreId) {
        if (!centreId) return;
        console.log(`✏️ Editing centre ${centreId}...`);
        this.openCentreModal(centreId);
    }
    
    /**
     * Delete centre
     */
    async deleteCentre(centreId) {
        if (!centreId) return;
        
        const centre = this.centres.find(c => c.id === centreId);
        if (!centre) return;
        
        if (!confirm(`Delete "${centre.name}" (${centre.county})?\n\nThis cannot be undone.`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting centre ${centreId}...`);
            
            let deleted = false;
            
            if (this.db && typeof this.db.deleteCentre === 'function') {
                await this.db.deleteCentre(centreId);
                deleted = true;
            } else if (this.db?.supabase) {
                const { error } = await this.db.supabase
                    .from('centres')
                    .delete()
                    .eq('id', centreId);
                if (error) throw error;
                deleted = true;
            } else {
                // Local fallback
                this.centres = this.centres.filter(c => c.id !== centreId);
                deleted = true;
            }
            
            if (deleted) {
                this.centres = this.centres.filter(c => c.id !== centreId);
                this.showAlert(`✅ Centre "${centre.name}" deleted`, 'success');
                this.renderCentres();
                this.updateStats();
            }
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            this.showAlert(`Error: ${error.message || 'Failed to delete'}`, 'error');
        }
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
                <p>Get started by adding your first centre.</p>
                <button class="btn btn-primary add-centre-btn">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
        
        // Add click listener to the button
        const addBtn = grid.querySelector('.add-centre-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openCentreModal());
        }
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        if (!this.centres) return;
        
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        
        // Unique counties
        const counties = new Set(this.centres.map(c => c.county).filter(Boolean)).size;
        
        // Update DOM elements
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        updateElement('totalCentresCount', total);
        updateElement('activeCentresCount', active);
        updateElement('inactiveCentresCount', inactive);
        updateElement('countiesCount', counties);
    }
    
    /**
     * Export centres
     */
    async exportCentres() {
        try {
            if (!this.centres || this.centres.length === 0) {
                this.showAlert('No centres to export', 'warning');
                return;
            }
            
            console.log(`📤 Exporting ${this.centres.length} centres...`);
            
            const headers = ['Name', 'County', 'Region', 'Status', 'Created Date'];
            
            const rows = this.centres.map(centre => [
                `"${(centre.name || '').replace(/"/g, '""')}"`,
                `"${(centre.county || '').replace(/"/g, '""')}"`,
                `"${(centre.region || '').replace(/"/g, '""')}"`,
                `"${(centre.status || '').replace(/"/g, '""')}"`,
                `"${(centre.created_at ? new Date(centre.created_at).toLocaleDateString() : '')}"`
            ]);
            
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
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
     * Search centres
     */
    searchCentres(query) {
        if (!query || query.trim() === '') {
            this.renderCentres();
            return;
        }
        
        const searchTerm = query.toLowerCase().trim();
        const filtered = this.centres.filter(centre => {
            return (
                (centre.name && centre.name.toLowerCase().includes(searchTerm)) ||
                (centre.county && centre.county.toLowerCase().includes(searchTerm)) ||
                (centre.region && centre.region.toLowerCase().includes(searchTerm))
            );
        });
        
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No Results Found</h3>
                    <p>No centres match "${query}"</p>
                    <button class="btn btn-secondary clear-search">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
            
            const clearBtn = grid.querySelector('.clear-search');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    const searchInput = document.getElementById('centreSearchInput');
                    if (searchInput) searchInput.value = '';
                    this.renderCentres();
                });
            }
        } else {
            grid.innerHTML = '';
            filtered.forEach(centre => {
                const card = this.createCentreCard(centre);
                grid.appendChild(card);
            });
            this.attachCardEventListeners();
        }
    }
    
    /**
     * Refresh centres
     */
    async refresh() {
        console.log('🔄 Refreshing centres...');
        await this.loadCentres();
        this.showAlert('Centres refreshed', 'success');
    }
    
    /**
     * Show alert
     */
    showAlert(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(message, type);
            return;
        }
        
        // Simple alert fallback
        alert(`${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make globally available
window.CentreManager = CentreManager;

console.log('✅ Fixed Centre Manager module loaded');
