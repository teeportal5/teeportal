// modules/centres.js - COMPLETE CENTRE MANAGEMENT MODULE
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.counties = [];
        this.centres = [];
        this.countiesLoaded = false;
        this.isLoading = false;
        
        console.log('🏢 Centre Manager initialized with DB:', db ? 'Yes' : 'No');
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        console.log('🚀 Initializing Centre Manager...');
        
        try {
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
            
            // Method 1: Try database getCounties()
            if (this.db && typeof this.db.getCounties === 'function') {
                console.log('📡 Using db.getCounties()');
                const countiesData = await this.db.getCounties();
                
                if (countiesData && Array.isArray(countiesData)) {
                    this.counties = this.processCountiesData(countiesData);
                    console.log(`📊 Processed ${this.counties.length} counties from DB`);
                }
            }
            
            // Method 2: Try direct Supabase query
            if (this.counties.length === 0 && window.supabase) {
                console.log('📡 Trying direct Supabase query for counties');
                try {
                    const { data, error } = await window.supabase
                        .from('counties')
                        .select('*')
                        .order('name');
                    
                    if (!error && data) {
                        this.counties = this.processCountiesData(data);
                        console.log(`📊 Got ${this.counties.length} counties from Supabase`);
                    }
                } catch (supabaseError) {
                    console.warn('⚠️ Supabase counties query failed:', supabaseError);
                }
            }
            
            // Method 3: Try centres table to extract unique counties
            if (this.counties.length === 0 && window.supabase) {
                console.log('📡 Extracting counties from centres table');
                try {
                    const { data, error } = await window.supabase
                        .from('centres')
                        .select('county')
                        .not('county', 'is', null);
                    
                    if (!error && data) {
                        const uniqueCounties = [...new Set(data.map(item => item.county).filter(Boolean))];
                        this.counties = uniqueCounties.sort();
                        console.log(`📊 Extracted ${this.counties.length} unique counties from centres`);
                    }
                } catch (supabaseError) {
                    console.warn('⚠️ Failed to extract counties from centres:', supabaseError);
                }
            }
            
            // Method 4: Use default counties as fallback
            if (this.counties.length === 0) {
                console.log('🔄 Using default counties');
                this.counties = this.getDefaultCounties();
            }
            
            // Ensure we have some counties
            if (this.counties.length === 0) {
                this.counties = ['Nairobi', 'Mombasa', 'Kisumu'];
                console.log('⚠️ Using minimum default counties');
            }
            
            console.log(`✅ Final counties list: ${this.counties.length} counties`);
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
     * Process counties data from various formats
     */
    processCountiesData(data) {
        if (!data || !Array.isArray(data)) return [];
        
        return data
            .map(item => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') {
                    return item.name || item.county || item.county_name || item.title || 
                           item.Name || item.County || item.CountyName || 
                           Object.values(item).find(v => typeof v === 'string') || '';
                }
                return '';
            })
            .filter(county => county && county.trim() !== '')
            .sort((a, b) => a.localeCompare(b));
    }
    
    /**
     * Get default counties
     */
    getDefaultCounties() {
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
        
        // Export button
        const exportBtn = document.querySelector('[onclick*="exportCentres"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCentres());
        }
        
        // Event delegation for centre cards (for dynamically added buttons)
        const grid = document.getElementById('centresGrid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const target = e.target;
                const btn = target.closest('button');
                if (!btn) return;
                
                const centreId = btn.getAttribute('data-id') || 
                                btn.closest('.card')?.getAttribute('data-centre-id');
                if (!centreId) return;
                
                if (btn.classList.contains('edit-centre') || target.classList.contains('fa-edit')) {
                    this.editCentre(centreId);
                } else if (btn.classList.contains('delete-centre') || target.classList.contains('fa-trash')) {
                    this.deleteCentre(centreId);
                }
            });
        }
        
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
            this.showAlert('Modal not found. Please refresh the page.', 'error');
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
            document.body.classList.add('modal-open');
            
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
        
        console.log(`✅ County dropdown populated with ${this.counties.length} options`);
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
                titleEl.classList.add('editing');
            }
            
            // Populate form fields
            const formData = {
                'centreName': centre.name || '',
                'centreCode': centre.code || '',
                'centreCounty': centre.county || '',
                'centreSubCounty': centre.sub_county || centre.subCounty || '',
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
                } else {
                    console.warn(`⚠️ Form field ${fieldId} not found`);
                }
            });
            
            // Update submit button text
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Centre';
                submitBtn.classList.add('update-mode');
            }
            
            console.log('✅ Centre data loaded for editing:', formData);
            
        } catch (error) {
            console.error('❌ Error loading centre data:', error);
            this.showAlert('Error loading centre data', 'error');
            this.closeCentreModal();
        }
    }
    
    /**
     * Save centre to database
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
                county: document.getElementById('centreCounty')?.value || '',
                sub_county: document.getElementById('centreSubCounty')?.value.trim() || '',
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
            const originalContent = submitBtn?.innerHTML;
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }
            
            let result;
            let savedToDatabase = false;
            
            if (this.currentEditId) {
                // Update existing centre
                console.log(`🔄 Updating centre ${this.currentEditId}...`);
                
                // Try multiple methods to update
                result = await this.updateCentreInDatabase(this.currentEditId, centreData);
                savedToDatabase = true;
                
                this.showAlert('✅ Centre updated successfully!', 'success');
            } else {
                // Add new centre
                console.log('➕ Adding new centre...');
                
                // Add created_at timestamp
                centreData.created_at = new Date().toISOString();
                
                // Try multiple methods to insert
                result = await this.insertCentreInDatabase(centreData);
                savedToDatabase = true;
                
                this.showAlert('✅ Centre added successfully!', 'success');
            }
            
            if (savedToDatabase) {
                console.log('✅ Centre saved to database:', result);
                
                // Close modal and refresh
                this.closeCentreModal();
                await this.loadCentres();
            } else {
                throw new Error('Failed to save to database');
            }
            
        } catch (error) {
            console.error('❌ Error saving centre:', error);
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
     * Update centre in database using multiple methods
     */
    async updateCentreInDatabase(id, data) {
        // Method 1: Database method
        if (this.db && typeof this.db.updateCentre === 'function') {
            console.log('📡 Using db.updateCentre()');
            return await this.db.updateCentre(id, data);
        }
        
        // Method 2: Generic update method
        if (this.db && typeof this.db.update === 'function') {
            console.log('📡 Using db.update()');
            return await this.db.update('centres', id, data);
        }
        
        // Method 3: Direct Supabase
        if (window.supabase) {
            console.log('📡 Using direct Supabase update');
            const { data: result, error } = await window.supabase
                .from('centres')
                .update(data)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return result?.[0];
        }
        
        // Method 4: Fallback - store in memory
        console.warn('⚠️ No database method available, using memory fallback');
        const index = this.centres.findIndex(c => c.id == id || c.id === id);
        if (index !== -1) {
            this.centres[index] = { ...this.centres[index], ...data, id };
            return this.centres[index];
        }
        
        throw new Error('No update method available and centre not found');
    }
    
    /**
     * Insert centre in database using multiple methods
     */
    async insertCentreInDatabase(data) {
        // Method 1: Database method
        if (this.db && typeof this.db.addCentre === 'function') {
            console.log('📡 Using db.addCentre()');
            return await this.db.addCentre(data);
        }
        
        // Method 2: Generic insert method
        if (this.db && typeof this.db.insert === 'function') {
            console.log('📡 Using db.insert()');
            return await this.db.insert('centres', data);
        }
        
        // Method 3: Direct Supabase
        if (window.supabase) {
            console.log('📡 Using direct Supabase insert');
            const { data: result, error } = await window.supabase
                .from('centres')
                .insert([data])
                .select();
            
            if (error) {
                console.error('❌ Supabase insert error:', error);
                throw error;
            }
            return result?.[0];
        }
        
        // Method 4: Fallback - store in memory
        console.warn('⚠️ No database method available, using memory fallback');
        const newCentre = {
            id: `temp_${Date.now()}`,
            ...data
        };
        this.centres.unshift(newCentre);
        return newCentre;
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
            document.body.classList.remove('modal-open');
            
            // Reset form
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
                titleEl.classList.remove('editing');
            }
            
            // Reset submit button
            const submitBtn = document.querySelector('#centreForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Centre';
                submitBtn.classList.remove('update-mode');
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
            
            // Method 1: Database method
            if (this.db && typeof this.db.getCentres === 'function') {
                console.log('📡 Using db.getCentres()');
                this.centres = await this.db.getCentres();
            }
            // Method 2: Generic getAll method
            else if (this.db && typeof this.db.getAll === 'function') {
                console.log('📡 Using db.getAll("centres")');
                this.centres = await this.db.getAll('centres');
            }
            // Method 3: Direct Supabase
            else if (window.supabase) {
                console.log('📡 Using direct Supabase query');
                const { data, error } = await window.supabase
                    .from('centres')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                this.centres = data || [];
            }
            // Method 4: Fallback - use existing data
            else {
                console.warn('⚠️ No database method found, using existing data');
                this.centres = this.centres || [];
            }
            
            console.log(`✅ Loaded ${this.centres.length} centres`);
            
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
                    <div class="error-state full-width">
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
                        ${centre.phone ? `
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <span class="label">Phone:</span>
                            <span class="value">${this.escapeHtml(centre.phone)}</span>
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
        
        console.log(`✅ Rendered ${this.centres.length} centre cards`);
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="empty-state full-width">
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
            
            let deleted = false;
            
            // Method 1: Database method
            if (this.db && typeof this.db.deleteCentre === 'function') {
                await this.db.deleteCentre(centreId);
                deleted = true;
            }
            // Method 2: Generic delete method
            else if (this.db && typeof this.db.delete === 'function') {
                await this.db.delete('centres', centreId);
                deleted = true;
            }
            // Method 3: Direct Supabase
            else if (window.supabase) {
                const { error } = await window.supabase
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
                // Add animation for updates
                el.classList.add('updated');
                setTimeout(() => el.classList.remove('updated'), 500);
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
                (centre.sub_county && centre.sub_county.toLowerCase().includes(searchTerm)) ||
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
