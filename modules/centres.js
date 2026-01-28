// modules/centres.js - UPDATED WITH CORRECT MODAL HANDLING
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.centres = [];
        this.countiesList = [];
        
        console.log('🏢 Centre Manager loaded');
    }
    
    async init() {
        console.log('🚀 Initializing centres...');
        
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load centres
            await this.loadCentres();
            
            console.log('✅ Centres ready');
            return true;
        } catch (error) {
            console.error('❌ Centre init failed:', error);
            return false;
        }
    }
    
    setupEventListeners() {
        console.log('📍 Setting up listeners...');
        
        // Form submission
        const form = document.getElementById('centreForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCentre();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('centreSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchCentres(e.target.value);
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('[data-modal-close]').forEach(button => {
            button.addEventListener('click', () => {
                this.closeCentreModal();
            });
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
        
        console.log('✅ Listeners ready');
    }
    
    // OPEN MODAL - FIXED VERSION (uses .show class)
    openCentreModal(centreId = null) {
        console.log('📂 Opening centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Centre modal not found!');
            return;
        }
        
        // Remove any inline display styles
        modal.style.display = '';
        
        // Use .show class (matches CSS)
        modal.classList.add('show');
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        
        // Reset or load data
        if (centreId) {
            this.loadCentreData(centreId);
        } else {
            this.resetForm();
        }
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('centreName')?.focus();
        }, 100);
        
        console.log('✅ Modal opened with .show class');
    }
    
    // CLOSE MODAL - FIXED VERSION
    closeCentreModal() {
        console.log('📂 Closing centre modal...');
        
        const modal = document.getElementById('centreModal');
        if (modal) {
            // Remove .show class
            modal.classList.remove('show');
            
            // Re-enable body scrolling
            document.body.style.overflow = 'auto';
            document.body.classList.remove('modal-open');
            
            // Reset form
            this.resetForm();
            
            console.log('✅ Modal closed');
        }
    }
    
    // RESET FORM
    resetForm() {
        const form = document.getElementById('centreForm');
        if (form) {
            form.reset();
            document.getElementById('centreModalTitle').innerHTML = 
                '<i class="fas fa-map-marker-alt"></i> Add New Centre';
            this.currentEditId = null;
            
            // Reset any validation styles
            document.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('is-invalid');
            });
        }
    }
    
    // LOAD CENTRE DATA FOR EDITING
    loadCentreData(centreId) {
        const centre = this.centres.find(c => c.id === centreId);
        if (!centre) {
            console.error('❌ Centre not found for editing:', centreId);
            return;
        }
        
        this.currentEditId = centreId;
        
        // Update UI
        document.getElementById('centreModalTitle').innerHTML = 
            '<i class="fas fa-map-marker-alt"></i> Edit Centre';
        
        // Fill form
        document.getElementById('centreName').value = centre.name || '';
        document.getElementById('centreCounty').value = centre.county || '';
        document.getElementById('centreRegion').value = centre.region || '';
        document.getElementById('centreStatus').value = centre.status || 'active';
        
        console.log('✅ Loaded centre data for editing:', centre.name);
    }
    
    // GENERATE CENTRE CODE
    generateCentreCode() {
        const name = document.getElementById('centreName')?.value.trim() || 'Centre';
        const county = document.getElementById('centreCounty')?.value.trim() || '';
        
        // Get prefix from county or name
        let prefix = 'CTR';
        if (county) {
            prefix = county.substring(0, 3).toUpperCase();
        } else if (name) {
            prefix = name.substring(0, 3).toUpperCase();
        }
        
        // Generate unique number from timestamp
        const uniqueNum = Date.now().toString().slice(-6);
        
        return `${prefix}-${uniqueNum}`;
    }
    
    // VALIDATE FORM
    validateForm() {
        let isValid = true;
        const errors = [];
        
        const name = document.getElementById('centreName').value.trim();
        const county = document.getElementById('centreCounty').value.trim();
        
        // Clear previous validation
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
        });
        
        // Validate name
        if (!name) {
            document.getElementById('centreName').classList.add('is-invalid');
            errors.push('Centre name is required');
            isValid = false;
        }
        
        // Validate county
        if (!county) {
            document.getElementById('centreCounty').classList.add('is-invalid');
            errors.push('County is required');
            isValid = false;
        }
        
        return { isValid, errors };
    }
    
    // SAVE CENTRE
    async saveCentre() {
        console.log('💾 Saving centre...');
        
        // Validate form
        const validation = this.validateForm();
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Get data WITH AUTO-GENERATED CODE
        const centreData = {
            name: document.getElementById('centreName').value.trim(),
            code: this.generateCentreCode(), // AUTO-GENERATED
            county: document.getElementById('centreCounty').value.trim(),
            region: document.getElementById('centreRegion').value,
            status: document.getElementById('centreStatus').value || 'active',
            updated_at: new Date().toISOString()
        };
        
        try {
            if (this.currentEditId) {
                // Update - keep existing code
                const existingCentre = this.centres.find(c => c.id === this.currentEditId);
                if (existingCentre && existingCentre.code) {
                    centreData.code = existingCentre.code; // Keep original code when editing
                }
                
                await this.updateCentre(this.currentEditId, centreData);
                this.showToast('✅ Centre updated successfully!', 'success');
            } else {
                // Add new - use auto-generated code
                centreData.created_at = new Date().toISOString();
                await this.addCentre(centreData);
                this.showToast('✅ Centre added successfully!', 'success');
            }
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            
            // Better error messages
            if (error.code === '23502') {
                this.showToast('Error: Missing required field. Code: ' + centreData.code, 'error');
            } else if (error.code === '23505') {
                this.showToast('Error: A centre with this code already exists. Trying again...', 'warning');
                // Retry with different code
                centreData.code = this.generateCentreCode() + '-2';
                await this.saveCentre(); // Retry
            } else {
                this.showToast('Error saving centre: ' + (error.message || 'Unknown error'), 'error');
            }
        }
    }
    
    // LOAD CENTRES
    async loadCentres() {
        console.log('📊 Loading centres...');
        
        try {
            // Try to get from database
            if (this.db?.supabase) {
                const { data, error } = await this.db.supabase
                    .from('centres')
                    .select('*')
                    .order('name');
                if (error) throw error;
                this.centres = data || [];
                console.log(`✅ Loaded ${this.centres.length} centres from database`);
            } else {
                // Fallback to empty array
                this.centres = [];
                console.log('⚠️ No database connection, using empty array');
            }
            
            // Update counties list for datalist
            this.updateCountiesList();
            
            // Render
            this.renderCentres();
            this.updateStats();
            
            return this.centres;
            
        } catch (error) {
            console.error('❌ Load failed:', error);
            this.centres = [];
            this.renderEmptyState();
            this.showToast('Error loading centres: ' + error.message, 'error');
            return [];
        }
    }
    
    // UPDATE COUNTIES LIST FOR DATALIST
    updateCountiesList() {
        const counties = [...new Set(this.centres
            .filter(c => c.county)
            .map(c => c.county.trim())
            .filter(c => c.length > 0))].sort();
        
        const datalist = document.getElementById('countySuggestions');
        if (datalist) {
            datalist.innerHTML = counties.map(county => 
                `<option value="${this.escapeHtml(county)}">${this.escapeHtml(county)}</option>`
            ).join('');
        }
    }
    
    // RENDER CENTRES
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) {
            console.error('❌ Centres grid not found');
            return;
        }
        
        if (!this.centres.length) {
            this.renderEmptyState();
            return;
        }
        
        grid.innerHTML = this.centres.map(centre => `
            <div class="card centre-card">
                <div class="card-header">
                    <h4>${this.escapeHtml(centre.name)}</h4>
                    <span class="status-badge ${centre.status}">${centre.status}</span>
                </div>
                <div class="card-body">
                    <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(centre.county)}</p>
                    ${centre.region ? `<p><i class="fas fa-globe"></i> ${this.escapeHtml(centre.region)}</p>` : ''}
                    ${centre.code ? `<small class="text-muted">Code: ${this.escapeHtml(centre.code)}</small>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline" onclick="editCentre('${centre.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCentre('${centre.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log(`✅ Rendered ${this.centres.length} centres`);
    }
    
    // RENDER EMPTY STATE
    renderEmptyState() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt fa-3x"></i>
                <h3>No Centres Found</h3>
                <p>Get started by adding your first centre</p>
                <button class="btn btn-primary" onclick="openCentreModal()">
                    <i class="fas fa-plus"></i> Add Your First Centre
                </button>
            </div>
        `;
    }
    
    // UPDATE STATISTICS
    updateStats() {
        const total = this.centres.length;
        const active = this.centres.filter(c => c.status === 'active').length;
        const inactive = this.centres.filter(c => c.status === 'inactive').length;
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
        
        console.log(`📊 Stats: ${total} centres, ${active} active, ${inactive} inactive, ${counties} counties`);
    }
    
    // SEARCH CENTRES
    searchCentres(query) {
        if (!query.trim()) {
            this.renderCentres();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = this.centres.filter(centre =>
            centre.name.toLowerCase().includes(searchTerm) ||
            centre.county.toLowerCase().includes(searchTerm) ||
            (centre.region && centre.region.toLowerCase().includes(searchTerm)) ||
            (centre.code && centre.code.toLowerCase().includes(searchTerm))
        );
        
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        if (!filtered.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No Results Found</h3>
                    <p>No centres match "${this.escapeHtml(query)}"</p>
                    <button class="btn btn-outline" onclick="document.getElementById('centreSearchInput').value = ''; refreshCentres();">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(centre => `
                <div class="card centre-card">
                    <div class="card-header">
                        <h4>${this.escapeHtml(centre.name)}</h4>
                        <span class="status-badge ${centre.status}">${centre.status}</span>
                    </div>
                    <div class="card-body">
                        <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(centre.county)}</p>
                        ${centre.region ? `<p><i class="fas fa-globe"></i> ${this.escapeHtml(centre.region)}</p>` : ''}
                        ${centre.code ? `<small class="text-muted">Code: ${this.escapeHtml(centre.code)}</small>` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        console.log(`🔍 Search "${query}": Found ${filtered.length} centres`);
    }
    
    // EXPORT CENTRES
    async exportCentres() {
        if (!this.centres.length) {
            this.showToast('No centres to export', 'warning');
            return;
        }
        
        try {
            const csv = [
                ['Name', 'Code', 'County', 'Region', 'Status', 'Created'].join(','),
                ...this.centres.map(c => [
                    `"${c.name || ''}"`,
                    `"${c.code || ''}"`,
                    `"${c.county || ''}"`,
                    `"${c.region || ''}"`,
                    `"${c.status || ''}"`,
                    `"${c.created_at || ''}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast(`Exported ${this.centres.length} centres to CSV`, 'success');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showToast('Error exporting centres: ' + error.message, 'error');
        }
    }
    
    // REFRESH
    async refresh() {
        console.log('🔄 Refreshing centres...');
        await this.loadCentres();
        this.showToast('Centres refreshed', 'info');
    }
    
    // EDIT CENTRE
    editCentre(centreId) {
        console.log('✏️ Editing centre:', centreId);
        this.openCentreModal(centreId);
    }
    
    // DELETE CENTRE
    async deleteCentre(centreId) {
        if (!confirm('Are you sure you want to delete this centre?\n\nThis action cannot be undone.')) {
            return;
        }
        
        try {
            console.log('🗑️ Deleting centre:', centreId);
            
            if (this.db?.supabase) {
                const { error } = await this.db.supabase
                    .from('centres')
                    .delete()
                    .eq('id', centreId);
                if (error) throw error;
            }
            
            // Remove from local array
            this.centres = this.centres.filter(c => c.id !== centreId);
            
            // Re-render
            this.renderCentres();
            this.updateStats();
            
            this.showToast('Centre deleted successfully', 'success');
            
        } catch (error) {
            console.error('❌ Delete failed:', error);
            this.showToast('Error deleting centre: ' + error.message, 'error');
        }
    }
    
    // DATABASE HELPERS
    async updateCentre(id, data) {
        if (this.db?.supabase) {
            const { error } = await this.db.supabase
                .from('centres')
                .update(data)
                .eq('id', id);
            if (error) throw error;
        }
    }
    
    async addCentre(data) {
        if (this.db?.supabase) {
            const { data: result, error } = await this.db.supabase
                .from('centres')
                .insert([data])
                .select()
                .single();
            if (error) throw error;
            return result;
        }
        // Fallback: create local ID
        return { id: Date.now().toString(), ...data };
    }
    
    // TOAST NOTIFICATION
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(container);
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${this.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    // HELPER: Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================
// GLOBAL FUNCTIONS (Connect HTML to Class)
// ============================================

window.openCentreModal = function(centreId = null) {
    console.log('🌐 Global openCentreModal called with ID:', centreId);
    
    if (window.app?.centres) {
        window.app.centres.openCentreModal(centreId);
    } else if (window.centreManager) {
        window.centreManager.openCentreModal(centreId);
    } else {
        console.error('❌ Centres module not loaded');
        alert('Please wait for the system to load, or refresh the page.');
    }
};

window.closeCentreModal = function() {
    console.log('🌐 Global closeCentreModal called');
    
    if (window.app?.centres) {
        window.app.centres.closeCentreModal();
    } else if (window.centreManager) {
        window.centreManager.closeCentreModal();
    }
};

window.saveCentre = function(event) {
    if (event) event.preventDefault();
    console.log('🌐 Global saveCentre called');
    
    if (window.app?.centres) {
        window.app.centres.saveCentre();
    } else if (window.centreManager) {
        window.centreManager.saveCentre();
    } else {
        alert('Centres module not loaded');
    }
    return false;
};

window.exportCentres = function() {
    console.log('🌐 Global exportCentres called');
    
    if (window.app?.centres) {
        window.app.centres.exportCentres();
    } else if (window.centreManager) {
        window.centreManager.exportCentres();
    } else {
        alert('Centres module not loaded');
    }
};

window.refreshCentres = function() {
    console.log('🌐 Global refreshCentres called');
    
    if (window.app?.centres) {
        window.app.centres.refresh();
    } else if (window.centreManager) {
        window.centreManager.refresh();
    } else {
        alert('Centres module not loaded');
    }
};

window.editCentre = function(centreId) {
    console.log('🌐 Global editCentre called:', centreId);
    
    if (window.app?.centres) {
        window.app.centres.editCentre(centreId);
    } else if (window.centreManager) {
        window.centreManager.editCentre(centreId);
    } else {
        alert('Centres module not loaded');
    }
};

window.deleteCentre = function(centreId) {
    console.log('🌐 Global deleteCentre called:', centreId);
    
    if (window.app?.centres) {
        window.app.centres.deleteCentre(centreId);
    } else if (window.centreManager) {
        window.centreManager.deleteCentre(centreId);
    } else {
        alert('Centres module not loaded');
    }
};

// Debug helper
window.debugCentres = function() {
    console.log('🔍 Debug centres module:');
    console.log('window.app?.centres:', window.app?.centres);
    console.log('window.centreManager:', window.centreManager);
    console.log('Modal element:', document.getElementById('centreModal'));
    console.log('Modal classes:', document.getElementById('centreModal')?.className);
};

// Export class globally
window.CentreManager = CentreManager;

console.log('✅ Centres module ready - WITH CORRECT MODAL HANDLING');
