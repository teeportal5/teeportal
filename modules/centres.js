// modules/centres.js - SIMPLE Centre Management
class CentreManager {
    constructor(db, app = null) {
        this.db = db;
        this.app = app;
        this.currentEditId = null;
        this.counties = [];
    }
    
    /**
     * Initialize centre module
     */
    async init() {
        await this.loadCentres();
        await this.loadCounties();
        this._attachEventListeners();
    }
    
    /**
     * Load counties for dropdown
     */
    async loadCounties() {
        try {
            this.counties = await this.db.getCounties();
            this._populateCountyDropdown();
        } catch (error) {
            console.error('Error loading counties:', error);
        }
    }
    
    /**
     * Populate county dropdown
     */
    _populateCountyDropdown() {
        const countySelect = document.getElementById('centreCounty');
        if (!countySelect) return;
        
        // Clear and add counties
        countySelect.innerHTML = '<option value="">Select County</option>';
        
        this.counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county.name || county;
            option.textContent = county.name || county;
            countySelect.appendChild(option);
        });
    }
    
    /**
     * Load centres into the grid
     */
    async loadCentres() {
        try {
            const centres = await this.db.getCentres();
            const grid = document.getElementById('centresGrid');
            
            if (!grid) return;
            
            if (centres.length === 0) {
                this._renderEmptyState(grid);
                return;
            }
            
            // Render simple centre cards
            grid.innerHTML = centres.map(centre => this._renderSimpleCentreCard(centre)).join('');
            
            // Update stats
            this._updateStats(centres.length);
            
        } catch (error) {
            console.error('Error loading centres:', error);
        }
    }
    
    /**
     * Render simple centre card (only name and county)
     */
    _renderSimpleCentreCard(centre) {
        const centreName = centre.name || 'Unnamed Centre';
        const county = centre.county || 'Not specified';
        const status = centre.status || 'active';
        const centreId = centre.id;
        
        return `
            <div class="card centre-card" data-centre-id="${centreId}">
                <div class="card-header">
                    <h3>${this._escapeHtml(centreName)}</h3>
                    <span class="status-badge ${status}">${status.toUpperCase()}</span>
                </div>
                <div class="card-body">
                    <div class="centre-info-simple">
                        <div class="info-item">
                            <i class="fas fa-map"></i>
                            <span class="value">${this._escapeHtml(county)} County</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn-action edit-centre" data-id="${centreId}" title="Edit Centre">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete-centre" data-id="${centreId}" title="Delete Centre">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Update statistics display
     */
    _updateStats(totalCentres) {
        const centresEl = document.getElementById('totalCentres');
        if (centresEl) centresEl.textContent = totalCentres;
    }
    
    /**
     * Save or update centre (SIMPLE - only name and county)
     */
    async saveCentre(event) {
        event.preventDefault();
        
        const form = event.target;
        if (!form || form.id !== 'centreForm') return;
        
        try {
            // Get only name and county
            const centreData = {
                name: document.getElementById('centreName')?.value.trim() || '',
                county: document.getElementById('centreCounty')?.value || '',
                status: document.getElementById('centreStatus')?.value || 'active'
            };
            
            // Validate
            if (!centreData.name) {
                alert('Centre name is required');
                return;
            }
            
            if (!centreData.county) {
                alert('County is required');
                return;
            }
            
            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            let result;
            if (this.currentEditId) {
                // Update
                result = await this.db.updateCentre(this.currentEditId, centreData);
                alert('Centre updated successfully!');
            } else {
                // Add new
                result = await this.db.addCentre(centreData);
                alert('Centre added successfully!');
            }
            
            // Reset and close
            this._resetCentreForm();
            closeCentreModal();
            
            // Refresh
            await this.loadCentres();
            
        } catch (error) {
            console.error('Error saving centre:', error);
            alert('Error: ' + (error.message || 'Failed to save centre'));
            
            // Reset button
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
     * Edit centre
     */
    async editCentre(centreId) {
        try {
            const centres = await this.db.getCentres();
            const centre = centres.find(c => c.id === centreId);
            
            if (!centre) {
                alert('Centre not found');
                return;
            }
            
            this.currentEditId = centreId;
            
            // Populate form
            document.getElementById('centreName').value = centre.name || '';
            document.getElementById('centreCounty').value = centre.county || '';
            document.getElementById('centreStatus').value = centre.status || 'active';
            
            // Update modal title
            document.getElementById('centreModalTitle').textContent = 'Edit Centre';
            
            // Open modal
            openCentreModal();
            
        } catch (error) {
            console.error('Error editing centre:', error);
            alert('Error loading centre data');
        }
    }
    
    /**
     * Delete centre with confirmation
     */
    async deleteCentre(centreId) {
        if (!confirm('Are you sure you want to delete this centre?')) {
            return;
        }
        
        try {
            // We need a delete method in db.js
            // For now, we'll just show a message
            alert('Delete functionality needs to be implemented in db.js');
            console.log('Would delete centre:', centreId);
            
            // Refresh the list
            await this.loadCentres();
            
        } catch (error) {
            console.error('Error deleting centre:', error);
            alert('Error deleting centre');
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
            this.currentEditId = null;
        }
    }
    
    /**
     * Attach event listeners
     */
    _attachEventListeners() {
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
    }
    
    /**
     * Helper: Escape HTML
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Export centres (simple CSV)
     */
    async exportCentres() {
        try {
            const centres = await this.db.getCentres();
            if (centres.length === 0) {
                alert('No centres to export');
                return;
            }
            
            const csvContent = [
                ['Name', 'County', 'Status'].join(','),
                ...centres.map(c => [
                    `"${(c.name || '').replace(/"/g, '""')}"`,
                    `"${(c.county || '').replace(/"/g, '""')}"`,
                    `"${(c.status || '').replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `centres-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            
            alert(`Exported ${centres.length} centres`);
            
        } catch (error) {
            console.error('Error exporting centres:', error);
            alert('Error exporting centres');
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
                <button class="btn-primary" onclick="openCentreModal()">
                    <i class="fas fa-plus"></i> Add Centre
                </button>
            </div>
        `;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CentreManager;
}

// Global functions for HTML onclick
function openCentreModal() {
    const modal = document.getElementById('centreModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeCentreModal() {
    const modal = document.getElementById('centreModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = document.getElementById('centreForm');
        if (form) form.reset();
        document.getElementById('centreModalTitle').textContent = 'Add New Centre';
        
        // Clear edit ID if exists in app
        if (window.app && window.app.centres) {
            window.app.centres.currentEditId = null;
        }
    }
}

function saveCentre(event) {
    if (window.app && window.app.centres) {
        window.app.centres.saveCentre(event);
    } else {
        event.preventDefault();
        alert('Centre manager not initialized');
    }
    return false;
}
