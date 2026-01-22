// modules/centres.js - UPDATED WITH AUTO-GENERATED CODE
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
        
        console.log('✅ Listeners ready');
    }
    
    // OPEN MODAL
    openCentreModal(centreId = null) {
        console.log('📂 Opening modal...');
        
        const modal = document.getElementById('centreModal');
        if (!modal) {
            console.error('❌ Modal not found!');
            return;
        }
        
        // Show modal
        modal.classList.add('active');
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
    }
    
    // CLOSE MODAL
    closeCentreModal() {
        const modal = document.getElementById('centreModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            this.resetForm();
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
        }
    }
    
    // LOAD CENTRE DATA FOR EDITING
    loadCentreData(centreId) {
        const centre = this.centres.find(c => c.id === centreId);
        if (!centre) return;
        
        this.currentEditId = centreId;
        
        // Update UI
        document.getElementById('centreModalTitle').innerHTML = 
            '<i class="fas fa-map-marker-alt"></i> Edit Centre';
        
        // Fill form
        document.getElementById('centreName').value = centre.name || '';
        document.getElementById('centreCounty').value = centre.county || '';
        document.getElementById('centreRegion').value = centre.region || '';
        document.getElementById('centreStatus').value = centre.status || 'active';
    }
    
    // GENERATE CENTRE CODE (NEW METHOD)
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
    
    // SAVE CENTRE - UPDATED WITH AUTO-GENERATED CODE
    async saveCentre() {
        console.log('💾 Saving centre...');
        
        // Get data WITH AUTO-GENERATED CODE
        const centreData = {
            name: document.getElementById('centreName').value.trim(),
            code: this.generateCentreCode(), // AUTO-GENERATED
            county: document.getElementById('centreCounty').value.trim(),
            region: document.getElementById('centreRegion').value,
            status: document.getElementById('centreStatus').value || 'active',
            updated_at: new Date().toISOString()
        };
        
        // Validate
        if (!centreData.name || !centreData.county) {
            alert('Please fill all required fields');
            return;
        }
        
        try {
            if (this.currentEditId) {
                // Update - keep existing code
                const existingCentre = this.centres.find(c => c.id === this.currentEditId);
                if (existingCentre && existingCentre.code) {
                    centreData.code = existingCentre.code; // Keep original code when editing
                }
                
                await this.updateCentre(this.currentEditId, centreData);
                alert('✅ Centre updated!');
            } else {
                // Add new - use auto-generated code
                centreData.created_at = new Date().toISOString();
                await this.addCentre(centreData);
                alert('✅ Centre added!');
            }
            
            // Close modal and refresh
            this.closeCentreModal();
            await this.loadCentres();
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            
            // Better error messages
            if (error.code === '23502') {
                alert('Error: Missing required field. The system auto-generated a code: ' + centreData.code);
            } else if (error.code === '23505') {
                alert('Error: A centre with this code already exists. Trying again...');
                // Retry with different code
                centreData.code = this.generateCentreCode() + '-2';
                await this.saveCentre(); // Retry
            } else {
                alert('Error saving centre: ' + (error.message || 'Unknown error'));
            }
        }
    }
    
    // LOAD CENTRES
    async loadCentres() {
        try {
            // Try to get from database
            if (this.db?.supabase) {
                const { data, error } = await this.db.supabase
                    .from('centres')
                    .select('*')
                    .order('name');
                if (error) throw error;
                this.centres = data || [];
            } else {
                // Fallback to empty array
                this.centres = [];
            }
            
            // Update counties list for datalist
            this.updateCountiesList();
            
            // Render
            this.renderCentres();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Load failed:', error);
            this.centres = [];
            this.renderEmptyState();
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
                `<option value="${county}">${county}</option>`
            ).join('');
        }
    }
    
    // RENDER CENTRES
    renderCentres() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
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
                    <small class="text-muted">Code: ${centre.code || 'N/A'}</small>
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
    }
    
    // RENDER EMPTY STATE
    renderEmptyState() {
        const grid = document.getElementById('centresGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt fa-3x"></i>
                <h3>No Centres Found</h3>
                <p>Click "Add Centre" to get started</p>
            </div>
        `;
    }
    
    // UPDATE STATISTICS
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
                    <p>No centres match "${query}"</p>
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
                    </div>
                </div>
            `).join('');
        }
    }
    
    // EXPORT CENTRES
    async exportCentres() {
        if (!this.centres.length) {
            alert('No centres to export');
            return;
        }
        
        const csv = [
            ['Name', 'Code', 'County', 'Region', 'Status', 'Created'].join(','),
            ...this.centres.map(c => [
                `"${c.name}"`,
                `"${c.code || ''}"`,
                `"${c.county}"`,
                `"${c.region || ''}"`,
                `"${c.status}"`,
                `"${c.created_at || ''}"`
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `centres_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        alert(`Exported ${this.centres.length} centres`);
    }
    
    // REFRESH
    async refresh() {
        await this.loadCentres();
        alert('Centres refreshed');
    }
    
    // EDIT CENTRE
    editCentre(centreId) {
        this.openCentreModal(centreId);
    }
    
    // DELETE CENTRE
    async deleteCentre(centreId) {
        if (!confirm('Delete this centre?')) return;
        
        try {
            if (this.db?.supabase) {
                await this.db.supabase.from('centres').delete().eq('id', centreId);
            }
            
            this.centres = this.centres.filter(c => c.id !== centreId);
            this.renderCentres();
            this.updateStats();
            alert('Centre deleted');
        } catch (error) {
            console.error('❌ Delete failed:', error);
            alert('Error deleting centre');
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
                .select();
            if (error) throw error;
            return result?.[0];
        }
        // Fallback: create local ID
        return { id: Date.now().toString(), ...data };
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

window.openCentreModal = function(centreId) {
    if (window.app?.centres) {
        window.app.centres.openCentreModal(centreId);
    } else {
        alert('Centres module not loaded');
    }
};

window.closeCentreModal = function() {
    if (window.app?.centres) {
        window.app.centres.closeCentreModal();
    }
};

window.saveCentre = function(event) {
    if (event) event.preventDefault();
    if (window.app?.centres) {
        window.app.centres.saveCentre();
    } else {
        alert('Centres module not loaded');
    }
    return false;
};

window.exportCentres = function() {
    if (window.app?.centres) {
        window.app.centres.exportCentres();
    } else {
        alert('Centres module not loaded');
    }
};

window.refreshCentres = function() {
    if (window.app?.centres) {
        window.app.centres.refresh();
    } else {
        alert('Centres module not loaded');
    }
};

window.editCentre = function(centreId) {
    if (window.app?.centres) {
        window.app.centres.editCentre(centreId);
    } else {
        alert('Centres module not loaded');
    }
};

window.deleteCentre = function(centreId) {
    if (window.app?.centres) {
        window.app.centres.deleteCentre(centreId);
    } else {
        alert('Centres module not loaded');
    }
};

// Export class globally
window.CentreManager = CentreManager;

console.log('✅ Centres module ready - WITH AUTO-GENERATED CODES');
