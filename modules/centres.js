// modules/centres.js - COMPLETE FIXED VERSION
class CentreManager {
    constructor(db, app = null) {
        this.db = db; // This is your TEEPortalSupabaseDB instance
        this.app = app;
        this.currentEditId = null;
        this.centres = [];
        this.isLoading = false;
        
        console.log('🏢 Centre Manager initialized');
        console.log('🔍 Database type:', db?.constructor?.name || 'Unknown');
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('🚀 Initializing Centre Manager...');
        
        try {
            // First, ensure database is initialized
            if (this.db && typeof this.db.init === 'function') {
                console.log('📡 Initializing database connection...');
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
    openCentreModal(centreId = null) {
        console.log('📍 Opening centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        try {
            // Show modal
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // If editing, load centre data
            if (centreId) {
                this.loadCentreData(centreId);
            } else {
                // For new centre, reset form
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
     * Load centre data for editing
     */
    async loadCentreData(centreId) {
        try {
            console.log(`📝 Loading centre ${centreId} for editing...`);
            
            // Find centre in loaded centres
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
            
            // Populate form fields - FIXED: using region field
            const formData = {
                'centreName': centre.name || '',
                'centreCode': centre.code || '',
                'centreCounty': centre.county || '',
                'centreRegion': centre.region || centre.sub_county || '', // FIXED: Now uses region
                'centreAddress': centre.address || '',
                'centreContactPerson': centre.contact_person || centre.contactPerson || '',
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
            console.log('📋 Centre data:', centre);
            
        } catch (error) {
            console.error('❌ Error loading centre data:', error);
            this.showAlert('Error loading centre data', 'error');
        }
    }
    
    /**
     * Save centre - FIXED to use region column
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
            // Get form data - FIXED: using region field
            const centreData = {
                name: document.getElementById('centreName')?.value.trim() || '',
                code: document.getElementById('centreCode')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value.trim() || '', // TEXT INPUT
                region: document.getElementById('centreRegion')?.value.trim() || '', // FIXED: region field
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
            const errors = [];
            if (!centreData.name) {
                errors.push('Centre name is required');
                this.highlightField('centreName', true);
            } else {
                this.highlightField('centreName', false);
            }
            
            if (!centreData.code) {
                errors.push('Centre code is required');
                this.highlightField('centreCode', true);
            } else {
                this.highlightField('centreCode', false);
            }
            
            if (!centreData.county) {
                errors.push('County is required');
                this.highlightField('centreCounty', true);
            } else {
                this.highlightField('centreCounty', false);
            }
            
            // Show errors if any
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
                
                if (this.db && typeof this.db.updateCentre === 'function') {
                    console.log('📡 Using db.updateCentre()');
                    result = await this.db.updateCentre(this.currentEditId, centreData);
                } else if (this.db && typeof this.db.update === 'function') {
                    console.log('📡 Using db.update()');
                    result = await this.db.update('centres', this.currentEditId, centreData);
                } else if (this.db?.supabase) {
                    console.log('📡 Using db.supabase.from() directly');
                    const { data, error } = await this.db.supabase
                        .from('centres')
                        .update(centreData)
                        .eq('id', this.currentEditId)
                        .select();
                    
                    if (error) throw error;
                    result = data?.[0];
                } else {
                    throw new Error('No database update method available');
                }
                
                this.showAlert('✅ Centre updated successfully!', 'success');
                
            } else {
                // Add new centre - include created_at
                centreData.created_at = new Date().toISOString();
                
                console.log('➕ Adding new centre...');
                
                if (this.db && typeof this.db.addCentre === 'function') {
                    console.log('📡 Using db.addCentre()');
                    result = await this.db.addCentre(centreData);
                } else if (this.db && typeof this.db.insert === 'function') {
                    console.log('📡 Using db.insert()');
                    result = await this.db.insert('centres', centreData);
                } else if (this.db?.supabase) {
                    console.log('📡 Using db.supabase.from() directly');
                    const { data, error } = await this.db.supabase
                        .from('centres')
                        .insert([centreData])
                        .select();
                    
                    if (error) {
                        console.error('❌ Supabase error:', error);
                        throw error;
                    }
                    result = data?.[0];
                } else {
                    console.warn('⚠️ No database method found, adding locally');
                    const newId = Date.now().toString();
                    result = { id: newId, ...centreData };
                    this.centres.unshift(result);
                }
                
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            console.log('✅ Save result:', result);
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
            console.error('Error details:', error.message);
            this.showAlert(`Error: ${error.message || 'Failed to save centre. Please try again.'}`, 'error');
            
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
            if (isError) {
                field.classList.add('error');
                field.focus();
            } else {
                field.classList.remove('error');
            }
        }
    }
    
    /**
     * Load centres from database - FIXED
     */
    async loadCentres() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            console.log('📍 Loading centres...');
            
            // Method 1: Use database.getCentres()
            if (this.db && typeof this.db.getCentres === 'function') {
                console.log('📡 Using db.getCentres()');
                this.centres = await this.db.getCentres();
                console.log(`✅ Loaded ${this.centres.length} centres`);
            }
            // Method 2: Try direct supabase query
            else if (this.db && this.db.supabase && typeof this.db.supabase.from === 'function') {
                console.log('📡 Using direct supabase query');
                const { data, error } = await this.db.supabase
                    .from('centres')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                this.centres = data || [];
                console.log(`✅ Loaded ${this.centres.length} centres from Supabase`);
            }
            // Method 3: Fallback
            else {
                console.warn('⚠️ No database method found');
                this.centres = this.centres || [];
            }
            
            console.log('📋 Centre data:', this.centres.map(c => ({
                name: c.name,
                county: c.county,
                region: c.region,
                id: c.id
            })));
            
            // Render centres
            this.renderCentres();
            
            // Update statistics
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            this.showAlert('Failed to load centres. Please try again.', 'error');
            
            // Show error state
            this.renderEmptyState();
            
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Render centres grid - FIXED with proper event handling and region display
     */
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) {
            console.error('❌ centresGrid not found!');
            return;
        }
        
        if (!this.centres || this.centres.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        grid.innerHTML = '';
        
        // Create and append each centre card
        this.centres.forEach(centre => {
            const card = this.createCentreCard(centre);
            grid.appendChild(card);
        });
        
        console.log(`✅ Rendered ${this.centres.length} centre cards`);
        
        // Attach event listeners to buttons
        this.attachCardEventListeners();
    }
    
    /**
     * Create a centre card element - SEPARATE FUNCTION
     */
    createCentreCard(centre) {
        const card = document.createElement('div');
        card.className = 'card centre-card';
        card.setAttribute('data-centre-id', centre.id);
        
        // Format region display
        const regionDisplay = centre.region || centre.sub_county || 'Not specified';
        
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
                        <span class="value">${this.escapeHtml(regionDisplay)}</span>
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
     * Attach event listeners to centre card buttons - FIXED
     */
    attachCardEventListeners() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        // Use event delegation for better performance
        grid.addEventListener('click', (e) => {
            const target = e.target;
            
            // Handle edit button click
            const editBtn = target.closest('.edit-centre');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const centreId = editBtn.getAttribute('data-id');
                if (centreId) {
                    this.editCentre(centreId);
                }
                return;
            }
            
            // Handle delete button click
            const deleteBtn = target.closest('.delete-centre');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const centreId = deleteBtn.getAttribute('data-id');
                if (centreId) {
                    this.deleteCentre(centreId);
                }
                return;
            }
        });
        
        console.log('✅ Attached event listeners to centre cards');
    }
    
    /**
     * Edit centre - FIXED
     */
    async editCentre(centreId) {
        if (!centreId) {
            console.error('❌ No centre ID provided');
            return;
        }
        
        console.log(`✏️ Editing centre ${centreId}...`);
        this.openCentreModal(centreId);
    }
    
    /**
     * Delete centre with confirmation - FIXED
     */
    async deleteCentre(centreId) {
        if (!centreId) {
            console.error('❌ No centre ID provided');
            return;
        }
        
        // Find centre for confirmation message
        const centre = this.centres.find(c => c.id === centreId);
        const centreName = centre?.name || 'this centre';
        const regionInfo = centre?.region ? ` (${centre.region})` : '';
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${centreName}"${regionInfo}?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting centre ${centreId} (${centreName})...`);
            
            let deleted = false;
            
            // Method 1: Use database.deleteCentre()
            if (this.db && typeof this.db.deleteCentre === 'function') {
                console.log('📡 Using db.deleteCentre()');
                await this.db.deleteCentre(centreId);
                deleted = true;
            }
            // Method 2: Use database.delete()
            else if (this.db && typeof this.db.delete === 'function') {
                console.log('📡 Using db.delete()');
                await this.db.delete('centres', centreId);
                deleted = true;
            }
            // Method 3: Use supabase directly
            else if (this.db?.supabase) {
                console.log('📡 Using supabase directly');
                const { error } = await this.db.supabase
                    .from('centres')
                    .delete()
                    .eq('id', centreId);
                
                if (error) throw error;
                deleted = true;
            }
            
            if (deleted) {
                // Remove from local array
                this.centres = this.centres.filter(c => c.id !== centreId);
                
                // Show success message
                this.showAlert(`✅ Centre "${centreName}" deleted successfully!`, 'success');
                
                // Re-render
                this.renderCentres();
                this.updateStats();
                
                console.log(`✅ Centre ${centreId} deleted`);
            } else {
                throw new Error('No delete method available');
            }
            
        } catch (error) {
            console.error('❌ Error deleting centre:', error);
            this.showAlert(`Error: ${error.message || 'Failed to delete centre'}`, 'error');
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
                <button class="btn btn-primary" onclick="window.app?.centres?.openCentreModal()">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        if (!this.centres) return;
        
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        
        // Get unique counties
        const countiesSet = new Set();
        this.centres.forEach(centre => {
            if (centre.county) countiesSet.add(centre.county);
        });
        const counties = countiesSet.size;
        
        // Update DOM elements
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        updateElement('totalCentres', total);
        updateElement('activeCentres', active);
        updateElement('inactiveCentres', inactive);
        updateElement('totalCounties', counties);
        
        console.log(`📊 Stats updated: Total=${total}, Active=${active}, Inactive=${inactive}, Counties=${counties}`);
    }
    
    /**
     * Export centres to CSV
     */
    async exportCentres() {
        try {
            if (!this.centres || this.centres.length === 0) {
                this.showAlert('No centres to export', 'warning');
                return;
            }
            
            console.log(`📤 Exporting ${this.centres.length} centres...`);
            
            // Define CSV headers - INCLUDING REGION
            const headers = [
                'Name', 'Code', 'County', 'Region', 'Address',
                'Contact Person', 'Phone', 'Email', 'Status', 
                'Description', 'Created Date'
            ];
            
            // Convert centres to CSV rows
            const rows = this.centres.map(centre => [
                `"${(centre.name || '').replace(/"/g, '""')}"`,
                `"${(centre.code || '').replace(/"/g, '""')}"`,
                `"${(centre.county || '').replace(/"/g, '""')}"`,
                `"${(centre.region || centre.sub_county || '').replace(/"/g, '""')}"`, // FIXED: Include region
                `"${(centre.address || '').replace(/"/g, '""')}"`,
                `"${(centre.contact_person || '').replace(/"/g, '""')}"`,
                `"${(centre.phone || '').replace(/"/g, '""')}"`,
                `"${(centre.email || '').replace(/"/g, '""')}"`,
                `"${(centre.status || '').replace(/"/g, '""')}"`,
                `"${(centre.description || '').replace(/"/g, '""')}"`,
                `"${(centre.created_at ? new Date(centre.created_at).toLocaleDateString() : '')}"`
            ]);
            
            // Combine headers and rows
            const csvContent = [headers.join(','), ...rows].join('\n');
            
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
                (centre.sub_county && centre.sub_county.toLowerCase().includes(searchTerm))
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
                    <button class="btn btn-secondary" onclick="window.app?.centres?.renderCentres()">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = '';
            filtered.forEach(centre => {
                const card = this.createCentreCard(centre);
                grid.appendChild(card);
            });
            
            // Reattach event listeners
            this.attachCardEventListeners();
            
            console.log(`🔍 Found ${filtered.length} centres matching "${query}"`);
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
        alert(message);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================
// GLOBAL FUNCTIONS FOR HTML ONCLICK ATTRIBUTES
// ============================================

window.openCentreModal = function(centreId = null) {
    console.log('🌐 Global openCentreModal called with ID:', centreId);
    
    if (window.app && window.app.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        console.error('❌ Centre manager not initialized');
        alert('Centre manager not initialized. Please refresh the page.');
    }
};

window.closeCentreModal = function() {
    console.log('🌐 Global closeCentreModal called');
    
    if (window.app && window.app.centres) {
        window.app.centres.closeCentreModal();
    } else {
        // Fallback: Direct DOM manipulation
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
};

window.saveCentre = function(event) {
    if (event) event.preventDefault();
    console.log('🌐 Global saveCentre called');
    
    if (window.app && window.app.centres) {
        window.app.centres.saveCentre();
    } else {
        alert('Centre manager not initialized. Please refresh the page.');
    }
    return false;
};

// Make globally available
window.CentreManager = CentreManager;

console.log('✅ Centre Manager module loaded and ready');
