// modules/centres.js - COMPLETE FIXED VERSION (Works with TEEPortalSupabaseDB)
class CentreManager {
    constructor(db, app = null) {
        this.db = db; // This is your TEEPortalSupabaseDB instance
        this.app = app;
        this.currentEditId = null;
        this.counties = []; 
        this.centres = [];
        this.countiesLoaded = false;
        this.isLoading = false;
        
        console.log('🏢 Centre Manager initialized');
        console.log('🔍 Database type:', db?.constructor?.name || 'Unknown');
        console.log('🔍 Has getCounties?', typeof db?.getCounties === 'function');
        console.log('🔍 Has getCentres?', typeof db?.getCentres === 'function');
        console.log('🔍 Has addCentre?', typeof db?.addCentre === 'function');
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
            
            // Load counties FIRST
            await this.loadCounties();
            console.log(`✅ Loaded ${this.counties.length} counties`);
            
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
     * Load counties for dropdown
     */
    async loadCounties() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            console.log('📍 Loading counties...');
            
            // Reset counties array
            this.counties = [];
            
            // Method 1: Use database.getCounties()
            if (this.db && typeof this.db.getCounties === 'function') {
                console.log('📡 Calling db.getCounties()...');
                const countiesData = await this.db.getCounties();
                console.log('📦 Raw counties data:', countiesData);
                
                if (countiesData && Array.isArray(countiesData)) {
                    // Process the data
                    this.counties = countiesData.map(item => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') {
                            return item.name || item.county_name || item.title || 
                                   item.Name || item.County || String(item);
                        }
                        return '';
                    }).filter(Boolean);
                    
                    console.log(`📊 Processed ${this.counties.length} counties`);
                }
            }
            
            // Method 2: Use default counties if still empty
            if (this.counties.length === 0) {
                console.log('🔄 Using default counties');
                this.counties = this.getDefaultCounties();
            }
            
            console.log(`✅ Final counties (${this.counties.length}):`, this.counties.slice(0, 5));
            this.countiesLoaded = true;
            
        } catch (error) {
            console.error('❌ Error loading counties:', error);
            this.counties = this.getDefaultCounties();
            this.countiesLoaded = true;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Get default counties
     */
    getDefaultCounties() {
        return [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
            'Kisii', 'Kakamega', 'Thika', 'Nyeri', 'Meru',
            'Machakos', 'Kitui', 'Garissa', 'Mandera',
            'Lamu', 'Kilifi', 'Kilifi','Kilifi','Kilifi','Kwale', 'Tana River', 'Taita Taveta'
        ].sort();
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
        
        try {
            // Ensure counties are loaded
            if (!this.countiesLoaded || this.counties.length === 0) {
                console.log('🔄 Loading counties before opening modal...');
                await this.loadCounties();
            }
            
            // Show modal
            modal.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Populate counties dropdown
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
     * Populate county dropdown
     */
    populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        
        if (!countySelect) {
            console.error('❌ centreCounty select element not found!');
            return;
        }
        
        console.log(`📍 Populating county dropdown with ${this.counties.length} counties`);
        
        // Save current value if editing
        const currentValue = countySelect.value;
        
        // Clear existing options
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
        
        console.log(`✅ County dropdown populated`);
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
            
            // Populate form fields
            const formData = {
                'centreName': centre.name || '',
                'centreCode': centre.code || '',
                'centreCounty': centre.county || '',
                'centreRegion': centre.sub_county || centre.Region || '',
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
            
        } catch (error) {
            console.error('❌ Error loading centre data:', error);
            this.showAlert('Error loading centre data', 'error');
        }
    }
    
    /**
     * Save centre - FIXED to use your database class
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
            // Get form data - match your database column names
            const centreData = {
                name: document.getElementById('centreName')?.value.trim() || '',
                code: document.getElementById('centreCode')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value || '',
                sub_county: document.getElementById('centreRegion')?.value.trim() || '',
                address: document.getElementById('centreAddress')?.value.trim() || '',
                contact_person: document.getElementById('centreContactPerson')?.value.trim() || '',
                phone: document.getElementById('centrePhone')?.value.trim() || '',
                email: document.getElementById('centreEmail')?.value.trim() || '',
                status: document.getElementById('centreStatus')?.value || 'active',
                description: document.getElementById('centreDescription')?.value.trim() || '',
                created_at: new Date().toISOString(),
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
            const originalContent = submitBtn?.innerHTML;
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }
            
            let result;
            
            // CRITICAL FIX: Check what database methods are available
            console.log('🔍 Checking available database methods:', {
                hasAddCentre: typeof this.db?.addCentre === 'function',
                hasInsertCentre: typeof this.db?.insertCentre === 'function',
                hasUpdateCentre: typeof this.db?.updateCentre === 'function',
                dbMethods: Object.keys(this.db || {})
            });
            
            if (this.currentEditId) {
                // Update existing centre
                console.log(`🔄 Updating centre ${this.currentEditId}...`);
                
                if (this.db && typeof this.db.updateCentre === 'function') {
                    console.log('📡 Using db.updateCentre()');
                    result = await this.db.updateCentre(this.currentEditId, centreData);
                } else if (this.db && typeof this.db.update === 'function') {
                    console.log('📡 Using db.update()');
                    result = await this.db.update('centres', this.currentEditId, centreData);
                } else {
                    // Check if database has a supabase client we can use directly
                    if (this.db.supabase && typeof this.db.supabase.from === 'function') {
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
                }
                
                this.showAlert('✅ Centre updated successfully!', 'success');
                
            } else {
                // Add new centre
                console.log('➕ Adding new centre...');
                
                if (this.db && typeof this.db.addCentre === 'function') {
                    console.log('📡 Using db.addCentre()');
                    result = await this.db.addCentre(centreData);
                } else if (this.db && typeof this.db.insert === 'function') {
                    console.log('📡 Using db.insert()');
                    result = await this.db.insert('centres', centreData);
                } else {
                    // Check if database has a supabase client
                    if (this.db.supabase && typeof this.db.supabase.from === 'function') {
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
                        // Last resort: add to local array
                        console.warn('⚠️ No database method found, adding locally');
                        const newId = Date.now();
                        result = { id: newId, ...centreData };
                        this.centres.unshift(result);
                    }
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
            console.error('Error stack:', error.stack);
            
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
     * Add a centre method to your database class
     */
    async addCentreMethodToDB() {
        // Add the missing addCentre method to your database class
        if (this.db && !this.db.addCentre) {
            console.log('➕ Adding addCentre method to database class');
            
            this.db.addCentre = async (centreData) => {
                console.log('📡 Custom addCentre called:', centreData);
                
                // Check if supabase client is available
                if (this.db.supabase && typeof this.db.supabase.from === 'function') {
                    const { data, error } = await this.db.supabase
                        .from('centres')
                        .insert([centreData])
                        .select();
                    
                    if (error) throw error;
                    return data?.[0];
                } else {
                    throw new Error('Supabase client not available');
                }
            };
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
     * Load centres from database
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
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                this.centres = data || [];
                console.log(`✅ Loaded ${this.centres.length} centres from Supabase`);
            }
            // Method 3: Fallback
            else {
                console.warn('⚠️ No database method found');
                this.centres = this.centres || [];
            }
            
            // Render centres
            this.renderCentres();
            
            // Update statistics
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading centres:', error);
            this.showAlert('Failed to load centres. Please try again.', 'error');
            
            // Show error state
            const grid = document.getElementById('centresGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Centres</h3>
                        <p>${error.message || 'Unknown error occurred'}</p>
                        <button class="btn btn-primary" onclick="window.app.centres.loadCentres()">
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
     * Render centres grid
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
        
        grid.innerHTML = this.centres.map(centre => `
            <div class="card centre-card" data-centre-id="${centre.id}">
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
                        ${centre.sub_county ? `
                        <div class="info-item">
                            <i class="fas fa-map-pin"></i>
                            <span class="label">Sub-County:</span>
                            <span class="value">${this.escapeHtml(centre.sub_county)}</span>
                        </div>
                        ` : ''}
                        ${centre.contact_person ? `
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span class="label">Contact:</span>
                            <span class="value">${this.escapeHtml(centre.contact_person)}</span>
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
            </div>
        `).join('');
        
        // Attach event listeners to buttons
        this.attachCardEventListeners();
        
        console.log(`✅ Rendered ${this.centres.length} centre cards`);
    }
    
    /**
     * Attach event listeners to centre card buttons
     */
    attachCardEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-centre').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const centreId = e.currentTarget.getAttribute('data-id');
                this.editCentre(centreId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-centre').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const centreId = e.currentTarget.getAttribute('data-id');
                this.deleteCentre(centreId);
            });
        });
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
                <button class="btn btn-primary" onclick="window.openCentreModal()">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
    }
    
    /**
     * Edit centre
     */
    editCentre(centreId) {
        if (!centreId) {
            console.error('❌ No centre ID provided');
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
            console.error('❌ No centre ID provided');
            return;
        }
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this centre?\n\nThis action cannot be undone.')) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting centre ${centreId}...`);
            
            // Try multiple methods
            let deleted = false;
            
            if (this.db && typeof this.db.deleteCentre === 'function') {
                await this.db.deleteCentre(centreId);
                deleted = true;
            } else if (this.db && typeof this.db.delete === 'function') {
                await this.db.delete('centres', centreId);
                deleted = true;
            } else if (this.db && this.db.supabase && typeof this.db.supabase.from === 'function') {
                const { error } = await this.db.supabase
                    .from('centres')
                    .delete()
                    .eq('id', centreId);
                
                if (error) throw error;
                deleted = true;
            }
            
            if (deleted) {
                this.showAlert('✅ Centre deleted successfully!', 'success');
                
                // Remove from local array
                this.centres = this.centres.filter(c => c.id != centreId && c.id !== centreId);
                
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
     * Update statistics
     */
    updateStats() {
        if (!this.centres) return;
        
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
        const pending = this.centres.filter(c => c.status === 'pending').length;
        
        // Get unique counties
        const countiesSet = new Set();
        this.centres.forEach(centre => {
            if (centre.county) countiesSet.add(centre.county);
        });
        const counties = countiesSet.size;
        
        // Update DOM elements
        const elements = {
            'totalCentres': total,
            'activeCentres': active,
            'inactiveCentres': inactive,
            'totalCounties': counties
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        });
        
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
            
            // Define CSV headers
            const headers = [
                'Name', 'Code', 'County', 'Sub-County', 'Address',
                'Contact Person', 'Phone', 'Email', 'Status', 
                'Description', 'Created Date'
            ];
            
            // Convert centres to CSV rows
            const rows = this.centres.map(centre => [
                `"${(centre.name || '').replace(/"/g, '""')}"`,
                `"${(centre.code || '').replace(/"/g, '""')}"`,
                `"${(centre.county || '').replace(/"/g, '""')}"`,
                `"${(centre.sub_county || '').replace(/"/g, '""')}"`,
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
                    <button class="btn btn-secondary" onclick="window.app.centres.renderCentres()">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(centre => `
                <div class="card centre-card" data-centre-id="${centre.id}">
                    <div class="card-header">
                        <h4 class="centre-name">${this.escapeHtml(centre.name)}</h4>
                        <span class="status-badge ${centre.status || 'active'}">
                            ${(centre.status || 'active').toUpperCase()}
                        </span>
                    </div>
                    <div class="card-body">
                        <p><strong>Code:</strong> ${centre.code || 'N/A'}</p>
                        <p><strong>County:</strong> ${centre.county || 'Not specified'}</p>
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
            `).join('');
            
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
