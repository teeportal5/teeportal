/**
 * Profile Management Module
 * Handles user profile, preferences, and security
 */

class ProfileModule {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('Initializing Profile Module');
        this.loadUserProfile();
        this.setupEventListeners();
        this.setupTabNavigation();
    }

    async loadUserProfile() {
        try {
            // Load current user from database or localStorage
            this.currentUser = await this.db.getCurrentUser() || this.getDefaultUser();
            
            this.updateProfileDisplay();
            this.updateSidebarProfile();
            this.loadActivityLog();
            
            return this.currentUser;
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.currentUser = this.getDefaultUser();
            return this.currentUser;
        }
    }

    getDefaultUser() {
        return {
            id: 'user-001',
            name: 'Admin User',
            email: 'admin@teeportal.edu',
            role: 'Administrator',
            centre: 'nairobi-hq',
            phone: '+254 700 000000',
            department: 'Administration',
            bio: 'System Administrator',
            avatar: null,
            preferences: {
                emailNotifications: true,
                darkMode: false,
                autoSave: true,
                language: 'en',
                timezone: 'Africa/Nairobi'
            },
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    updateProfileDisplay() {
        // Update main profile display
        document.getElementById('profileUserName').textContent = this.currentUser.name;
        document.getElementById('profileUserEmail').textContent = this.currentUser.email;
        document.getElementById('profileUserRole').textContent = this.currentUser.role;
        
        const profileCentre = document.getElementById('profileUserCentre');
        if (profileCentre) {
            profileCentre.textContent = this.currentUser.centre || 'Not assigned';
        }

        // Update form fields
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhone = document.getElementById('profilePhone');
        const profileDepartment = document.getElementById('profileDepartment');
        const profileBio = document.getElementById('profileBio');
        const profileCentreSelect = document.getElementById('profileCentre');

        if (profileName) profileName.value = this.currentUser.name;
        if (profileEmail) profileEmail.value = this.currentUser.email;
        if (profilePhone) profilePhone.value = this.currentUser.phone || '';
        if (profileDepartment) profileDepartment.value = this.currentUser.department || '';
        if (profileBio) profileBio.value = this.currentUser.bio || '';
        
        // Update centre selection if available
        if (profileCentreSelect) {
            // Centre options should be loaded from centres module
            // For now, set the value if it exists
            if (this.currentUser.centre) {
                profileCentreSelect.value = this.currentUser.centre;
            }
        }

        // Update preferences
        this.updatePreferencesDisplay();
    }

    updateSidebarProfile() {
        document.getElementById('sidebarUserName').textContent = this.currentUser.name;
        document.getElementById('sidebarUserRole').textContent = this.currentUser.role;
        
        const sidebarUserCentre = document.getElementById('sidebarUserCentre');
        if (sidebarUserCentre) {
            sidebarUserCentre.textContent = this.currentUser.centre || 'N/A';
        }
    }

    updatePreferencesDisplay() {
        const preferences = this.currentUser.preferences || {};
        
        // Update checkbox states
        const emailNotifications = document.getElementById('emailNotifications');
        const darkMode = document.getElementById('darkMode');
        const autoSave = document.getElementById('autoSave');

        if (emailNotifications) emailNotifications.checked = preferences.emailNotifications || true;
        if (darkMode) darkMode.checked = preferences.darkMode || false;
        if (autoSave) autoSave.checked = preferences.autoSave || true;
    }

    async saveProfile(event) {
        event.preventDefault();
        
        const form = document.getElementById('profileForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const updatedUser = {
            ...this.currentUser,
            name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim(),
            department: document.getElementById('profileDepartment').value.trim(),
            bio: document.getElementById('profileBio').value.trim(),
            centre: document.getElementById('profileCentre').value,
            updatedAt: new Date().toISOString()
        };

        try {
            await this.db.saveUser(updatedUser);
            this.currentUser = updatedUser;
            
            this.updateProfileDisplay();
            this.updateSidebarProfile();
            
            this.showToast('Profile updated successfully!', 'success');
            this.addActivity('Updated profile information');
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showToast('Error updating profile', 'error');
        }
    }

    async changePassword(event) {
        event.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Basic validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showToast('Please fill all password fields', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            this.showToast('Password must be at least 8 characters', 'warning');
            return;
        }

        // In a real app, verify current password with backend
        try {
            // Here you would typically verify current password with server
            // For demo purposes, we'll simulate success
            const isCurrentPasswordValid = await this.verifyCurrentPassword(currentPassword);
            
            if (!isCurrentPasswordValid) {
                this.showToast('Current password is incorrect', 'error');
                return;
            }

            // Update password
            await this.db.updateUserPassword(this.currentUser.id, newPassword);
            
            // Clear form
            document.getElementById('securityForm').reset();
            
            this.showToast('Password updated successfully!', 'success');
            this.addActivity('Changed password');
            
            // Log user out or keep session based on security policy
            // setTimeout(() => {
            //     window.location.href = '/login';
            // }, 2000);
            
        } catch (error) {
            console.error('Error changing password:', error);
            this.showToast('Error changing password', 'error');
        }
    }

    async verifyCurrentPassword(password) {
        // In a real application, this would verify with the server
        // For demo, we'll use a simple check
        return true; // Always return true for demo
    }

    async savePreferences() {
        const preferences = {
            emailNotifications: document.getElementById('emailNotifications').checked,
            darkMode: document.getElementById('darkMode').checked,
            autoSave: document.getElementById('autoSave').checked,
            language: this.currentUser.preferences?.language || 'en',
            timezone: this.currentUser.preferences?.timezone || 'Africa/Nairobi'
        };

        try {
            const updatedUser = {
                ...this.currentUser,
                preferences: preferences,
                updatedAt: new Date().toISOString()
            };

            await this.db.saveUser(updatedUser);
            this.currentUser = updatedUser;

            this.showToast('Preferences saved successfully!', 'success');
            this.addActivity('Updated preferences');

            // Apply dark mode if changed
            if (preferences.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showToast('Error saving preferences', 'error');
        }
    }

    async loadActivityLog() {
        try {
            const activities = await this.db.getUserActivities(this.currentUser.id) || [];
            this.displayActivityLog(activities);
        } catch (error) {
            console.error('Error loading activity log:', error);
            this.displayActivityLog([]);
        }
    }

    displayActivityLog(activities) {
        const activityLog = document.getElementById('profileActivityLog');
        if (!activityLog) return;

        if (activities.length === 0) {
            activityLog.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-history fa-2x"></i>
                    <p>No activities recorded yet</p>
                </div>
            `;
            return;
        }

        // Sort by date (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        activityLog.innerHTML = activities.slice(0, 20).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description || ''}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(activityType) {
        const icons = {
            'login': 'sign-in-alt',
            'logout': 'sign-out-alt',
            'profile_update': 'user-edit',
            'password_change': 'key',
            'student_add': 'user-plus',
            'student_edit': 'user-edit',
            'marks_entry': 'chart-bar',
            'report_generated': 'file-export',
            'preferences_update': 'cog',
            'centre_add': 'map-marker-alt'
        };
        return icons[activityType] || 'info-circle';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    addActivity(title, type = 'info', description = '') {
        const activity = {
            id: `activity-${Date.now()}`,
            userId: this.currentUser.id,
            title: title,
            type: type,
            description: description,
            timestamp: new Date().toISOString()
        };

        // Save activity to database
        this.db.saveActivity(activity);

        // Reload activity log
        this.loadActivityLog();
    }

    async uploadAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image size should be less than 5MB', 'error');
            return;
        }

        // In a real app, upload to server
        // For demo, create a local URL
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Update user with avatar
                const updatedUser = {
                    ...this.currentUser,
                    avatar: e.target.result,
                    updatedAt: new Date().toISOString()
                };

                await this.db.saveUser(updatedUser);
                this.currentUser = updatedUser;

                // Update avatar display
                this.updateAvatarDisplay(e.target.result);
                
                this.showToast('Profile picture updated!', 'success');
                this.addActivity('Updated profile picture');
            } catch (error) {
                console.error('Error updating avatar:', error);
                this.showToast('Error updating profile picture', 'error');
            }
        };
        reader.readAsDataURL(file);
    }

    updateAvatarDisplay(avatarData) {
        // Update sidebar avatar
        const sidebarAvatar = document.querySelector('.user-avatar i');
        if (sidebarAvatar && avatarData) {
            sidebarAvatar.parentElement.innerHTML = `<img src="${avatarData}" alt="Avatar">`;
        }

        // Update profile page avatar
        const profileAvatar = document.querySelector('.profile-avatar i');
        if (profileAvatar && avatarData) {
            profileAvatar.parentElement.innerHTML = `
                <img src="${avatarData}" alt="Profile Picture">
                <button class="btn-change-avatar" onclick="document.getElementById('avatarUpload').click()">
                    <i class="fas fa-camera"></i>
                </button>
            `;
        }
    }

    setupEventListeners() {
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.saveProfile(e));
        }

        // Security form
        const securityForm = document.getElementById('securityForm');
        if (securityForm) {
            securityForm.addEventListener('submit', (e) => this.changePassword(e));
        }

        // Preferences save button
        const savePrefsBtn = document.querySelector('[onclick="app.profile.savePreferences()"]');
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.savePreferences();
            });
        }

        // Avatar upload
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.uploadAvatar(e));
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Update active tab
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.profile-tab[data-tab="${tabId}"]`).classList.add('active');

        // Show corresponding content
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}Tab`).classList.add('active');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                           type === 'error' ? 'exclamation-circle' : 
                           type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Public methods for other modules to call
    updateUserCentre(centreId) {
        if (this.currentUser) {
            this.currentUser.centre = centreId;
            this.updateProfileDisplay();
            this.updateSidebarProfile();
        }
    }

    getUserCentre() {
        return this.currentUser?.centre || null;
    }

    getUserRole() {
        return this.currentUser?.role || 'user';
    }

    hasPermission(permission) {
        const userRole = this.getUserRole();
        const permissions = {
            'administrator': ['all'],
            'centre_manager': ['view_students', 'add_students', 'enter_marks', 'view_reports'],
            'teacher': ['view_students', 'enter_marks'],
            'user': ['view_profile']
        };

        const rolePermissions = permissions[userRole] || [];
        return rolePermissions.includes('all') || rolePermissions.includes(permission);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileModule;
}
