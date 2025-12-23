// modules/modal-manager.js
class ModalManager {
    constructor() {
        this.currentModal = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupEscapeHandler();
    }
    
    setupEventListeners() {
        // Handle clicks on close buttons (× and Cancel)
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-modal-close]');
            if (closeBtn) {
                e.preventDefault();
                this.closeCurrentModal();
                return;
            }
            
            // Handle clicks on open modal buttons
            const openBtn = e.target.closest('[data-open-modal]');
            if (openBtn) {
                e.preventDefault();
                const modalId = openBtn.getAttribute('data-open-modal');
                this.openModal(modalId);
                return;
            }
            
            // Handle clicks outside modal content
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }
    
    setupEscapeHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCurrentModal();
            }
        });
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }
        
        // Close any open modal first
        this.closeCurrentModal();
        
        // Open the new modal
        modal.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.currentModal = modalId;
        
        console.log(`Opened modal: ${modalId}`);
        
        // Special handling for different modal types
        this.handleModalOpen(modalId);
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        if (this.currentModal === modalId) {
            this.currentModal = null;
        }
        
        console.log(`Closed modal: ${modalId}`);
        
        // Special handling for different modal types
        this.handleModalClose(modalId);
    }
    
    closeCurrentModal() {
        if (this.currentModal) {
            this.closeModal(this.currentModal);
        }
    }
    
    handleModalOpen(modalId) {
        switch(modalId) {
            case 'studentModal':
                // Reset form for new student
                if (window.app?.students?._resetStudentForm) {
                    const submitBtn = document.querySelector('#studentForm button[type="submit"]');
                    if (submitBtn && !submitBtn.innerHTML.includes('Update')) {
                        window.app.students._resetStudentForm();
                    }
                }
                break;
                
            case 'marksModal':
                // Let marks module handle it
                if (window.app?.marks?.openMarksModal) {
                    window.app.marks.openMarksModal();
                }
                break;
        }
    }
    
    handleModalClose(modalId) {
        switch(modalId) {
            case 'studentModal':
                // Reset student form
                if (window.app?.students?._resetStudentForm) {
                    window.app.students._resetStudentForm();
                }
                break;
        }
    }
    
    // Global compatibility functions
    static setupGlobalFunctions() {
        window.closeModal = (modalId) => {
            const modalManager = window.modalManager;
            if (modalManager) {
                modalManager.closeModal(modalId);
            } else {
                // Fallback
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                }
            }
        };
        
        window.openModal = (modalId) => {
            const modalManager = window.modalManager;
            if (modalManager) {
                modalManager.openModal(modalId);
            } else {
                // Fallback
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'block';
                    modal.classList.add('active');
                }
            }
        };
        
        window.openStudentModal = () => {
            window.openModal('studentModal');
        };
    }
}

// Initialize Modal Manager
document.addEventListener('DOMContentLoaded', () => {
    window.modalManager = new ModalManager();
    ModalManager.setupGlobalFunctions();
    console.log('Modal Manager initialized');
});
