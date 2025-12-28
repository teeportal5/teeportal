// modules/centres.js - UPDATED VERSION (No inline styles, County dropdown with typing)
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.centres = [];
        this.isLoading = false;
        this.countiesList = []; // List of counties for dropdown
        
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
            
            // Load counties list (for dropdown suggestions)
            await this.loadCountiesList();
            
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
     * Load counties list from existing centres for dropdown suggestions
     */
    async loadCountiesList() {
        try {
            console.log('📍 Loading counties list...');
            
            if (this.db && typeof this.db.getCentres === 'function') {
                const centres = await this.db.getCentres();
                // Extract unique counties
                const counties = [...new Set(centres
                    .filter(c => c.county)
                    .map(c => c.county.trim())
                    .filter(c => c.length > 0))];
                
                this.countiesList = counties.sort();
                console.log(`✅ Loaded ${this.countiesList.length} unique counties`);
            }
        } catch (error) {
            console.error('❌ Error loading counties list:', error);
            this.countiesList = [];
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
        }
        
        // Close modal buttons
        document.querySelectorAll('[data-modal-close], .close').forEach(btn => {
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
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                this.closeCentreModal();
            }
        });
        
        // Setup county field with datalist (allows typing AND dropdown)
        this.setupCountyField();
        
        // Search input
        const searchInput = document.getElementById('centreSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchCentres(e.target.value);
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('exportCentresBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCentres());
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Setup county field with datalist (allows both typing and dropdown)
     */
    setupCountyField() {
        const countyInput = document.getElementById('centreCounty');
        if (!countyInput) return;
        
        // Create or get datalist
        let datalist = document.getElementById('countySuggestions');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'countySuggestions';
            document.body.appendChild(datalist);
        }
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add county options
        this.countiesList.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            datalist.appendChild(option);
        });
        
        // Connect input to datalist
        countyInput.setAttribute('list', 'countySuggestions');
        countyInput.setAttribute('autocomplete', 'off');
        
        console.log(`✅ County field setup with ${this.countiesList.length} suggestions`);
    }
    
    /**
     * Open centre modal (NO INLINE STYLES)
     */
    openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        try {
            // Show modal using CSS class ONLY
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            
            // Update counties list in case new counties were added
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
                'centreRegion': centre.region || '', // Using region field
                'centreAddress': centre.address || '',
                'centreContactPerson': centre.contact_person || '',
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
            
            // Update submit button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Centre';
                submitBtn.dataset.action = 'update';
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
                code: document.getElementById('centreCode')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value.trim() || '',
                region: document.getElementById('centreRegion')?.value.trim() || '',
                address: document.getElementById('centreAddress')?.value.trim() || '',
                contact_person: document.getElementById('centreContactPerson')?.value.trim() || '',
                phone: document.getElementById('centrePhone')?.value.trim() || '',
                email: document.getElementById('centreEmail')?.value.trim() || '',
                status: document.getElementById('centreStatus')?.value || 'active',
                description: document.getElementById('centreDescription')?.value.trim() || '',
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
            
            // Show loading state
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
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
                    this.setupCountyField();
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
            // Reset loading state
            this.isLoading = false;
            
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
        
        if (!data.code.trim()) {
            errors.push('Centre code is required');
            this.highlightField('centreCode', true);
        } else {
            this.highlightField('centreCode', false);
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
            throw new Error('No database update method available');
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
            const newId = Date.now().toString();
            const newCentre = { id: newId, ...data };
            this.centres.unshift(newCentre);
            return newCentre;
        }
    }
    
    /**
     * Close centre modal (NO INLINE STYLES)
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
            ['centreName', 'centreCode', 'centreCounty'].forEach(id => {
                this.highlightField(id, false);
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
                submitBtn.dataset.action = 'add';
                submitBtn.disabled = false;
            }
            
            this.currentEditId = null;
            
            console.log('✅ Form reset');
        }
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
                this.centres = this.centres || [];
            }
            
            console.log(`✅ Loaded ${this.centres.length} centres`);
            
            // Update counties list
            await this.loadCountiesList();
            this.setupCountyField();
            
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
                        <i class="fas fa-hashtag"></i>
                        <span class="label">Code:</span>
                        <span class="value">${this.escapeHtml(centre.code || 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="label">County:</span>
                        <span class="value">${this.escapeHtml(centre.county || 'Not specified')}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-compass"></i>
                        <span class="label">Region:</span>
                        <span class="value">${this.escapeHtml(centre.region || 'Not specified')}</span>
                    </div>
                    ${centre.contact_person ? `
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span class="label">Contact:</span>
                        <span class="value">${this.escapeHtml(centre.contact_person)}</span>
                    </div>
                    ` : ''}
                    ${centre.phone ? `
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span class="label">Phone:</span>
                        <span class="value">${this.escapeHtml(centre.phone)}</span>
                    </div>
                    ` : ''}
                    ${centre.email ? `
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span class="label">Email:</span>
                        <span class="value">${this.escapeHtml(centre.email)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline edit-centre" data-id="${centre.id}" title="Edit Centre">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-centre" data-id="${centre.id}" title="Delete Centre">
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
        
        grid.addEventListener('click', (e) => {
            const target = e.target;
            
            const editBtn = target.closest('.edit-centre');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const centreId = editBtn.getAttribute('data-id');
                this.editCentre(centreId);
                return;
            }
            
            const deleteBtn = target.closest('.delete-centre');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
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
        
        // Update DOM
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
            if (!this.centres || this.centres.length === 0) {
                this.showAlert('No centres to export', 'warning');
                return;
            }
            
            console.log(`📤 Exporting ${this.centres.length} centres...`);
            
            const headers = [
                'Name', 'Code', 'County', 'Region', 'Address',
                'Contact Person', 'Phone', 'Email', 'Status', 
                'Description', 'Created Date'
            ];
            
            const rows = this.centres.map(centre => [
                `"${(centre.name || '').replace(/"/g, '""')}"`,
                `"${(centre.code || '').replace(/"/g, '""')}"`,
                `"${(centre.county || '').replace(/"/g, '""')}"`,
                `"${(centre.region || '').replace(/"/g, '""')}"`,
                `"${(centre.address || '').replace(/"/g, '""')}"`,
                `"${(centre.contact_person || '').replace(/"/g, '""')}"`,
                `"${(centre.phone || '').replace(/"/g, '""')}"`,
                `"${(centre.email || '').replace(/"/g, '""')}"`,
                `"${(centre.status || '').replace(/"/g, '""')}"`,
                `"${(centre.description || '').replace(/"/g, '""')}"`,
                `"${(centre.created_at ? new Date(centre.created_at).toLocaleDateString() : '')}"`
            ]);
            
            const csvContent = [headers.join(','), ...rows].join('\n');
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
                (centre.code && centre.code.toLowerCase().includes(searchTerm)) ||
                (centre.county && centre.county.toLowerCase().includes(searchTerm)) ||
                (centre.region && centre.region.toLowerCase().includes(searchTerm)) ||
                (centre.contact_person && centre.contact_person.toLowerCase().includes(searchTerm))
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
        
        alert(message);
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

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.openCentreModal = function(centreId = null) {
    console.log('🌐 Global openCentreModal called');
    if (window.app && window.app.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        alert('Centre manager not initialized');
    }
};

window.closeCentreModal = function() {
    console.log('🌐 Global closeCentreModal called');
    if (window.app && window.app.centres) {
        window.app.centres.closeCentreModal();
    } else {
        const modal = document.getElementById('centreModal');
        if (modal) modal.classList.remove('active');
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

console.log('✅ Centre Manager module loaded');
