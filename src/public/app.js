// Client-side JavaScript for the Marvin Account Monitor web interface

document.addEventListener('DOMContentLoaded', function() {
  // Filter accounts by status
  setupFilters();
  
  // Handle status updates
  setupStatusUpdates();
  
  // Setup refresh button
  setupRefreshButton();
});

// Set up the status filters
function setupFilters() {
  const showAll = document.getElementById('show-all');
  const showPending = document.getElementById('show-pending');
  const showFixed = document.getElementById('show-fixed');
  const showIgnored = document.getElementById('show-ignored');
  
  if (!showAll || !showPending || !showFixed || !showIgnored) {
    return; // Elements not found, possibly no accounts to review
  }
  
  function updateFilters() {
    const accountCards = document.querySelectorAll('.account-card');
    
    if (showAll.checked) {
      showPending.checked = true;
      showFixed.checked = true;
      showIgnored.checked = true;
    }
    
    accountCards.forEach(card => {
      const status = card.dataset.status;
      
      if (status === 'pending' && showPending.checked) {
        card.style.display = '';
      } else if (status === 'fixed' && showFixed.checked) {
        card.style.display = '';
      } else if (status === 'ignored' && showIgnored.checked) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
    
    // Update counts
    updateCounts();
  }
  
  showAll.addEventListener('change', function() {
    if (this.checked) {
      showPending.checked = true;
      showFixed.checked = true;
      showIgnored.checked = true;
    }
    updateFilters();
  });
  
  [showPending, showFixed, showIgnored].forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (!this.checked) {
        showAll.checked = false;
      }
      
      if (showPending.checked && showFixed.checked && showIgnored.checked) {
        showAll.checked = true;
      }
      
      updateFilters();
    });
  });
}

// Set up the status update buttons
function setupStatusUpdates() {
  const updateStatusButtons = document.querySelectorAll('.update-status');
  
  updateStatusButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const id = this.dataset.id;
      const status = this.dataset.status;
      const notes = document.getElementById(`notes-${id}`).value;
      
      // Disable the button during the update
      this.disabled = true;
      this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
      
      try {
        const response = await fetch(`/api/accounts/${id}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status, notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update UI
          const card = this.closest('.account-card');
          card.className = `card account-card ${status}`;
          card.dataset.status = status;
          
          const statusBadge = card.querySelector('.status-badge');
          statusBadge.className = `badge status-badge bg-${status === 'pending' ? 'warning' : (status === 'fixed' ? 'success' : 'secondary')}`;
          statusBadge.textContent = status.toUpperCase();
          
          // Show success message
          showToast(`Account status updated to ${status}`, 'success');
          
          // Update counts
          updateCounts();
        } else {
          showToast('Failed to update account status', 'danger');
        }
      } catch (error) {
        console.error('Error updating account status:', error);
        showToast('An error occurred while updating account status', 'danger');
      } finally {
        // Re-enable the button
        this.disabled = false;
        this.innerHTML = status === 'fixed' ? 'Mark as Fixed' : 
                         (status === 'ignored' ? 'Ignore' : 'Mark as Pending');
      }
    });
  });
}

// Set up the refresh button
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-btn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      window.location.reload();
    });
  }
}

// Update the counts of visible accounts
function updateCounts() {
  const accountCards = document.querySelectorAll('.account-card');
  const visibleCards = Array.from(accountCards).filter(card => card.style.display !== 'none');
  
  const countBadge = document.querySelector('.badge.bg-primary');
  if (countBadge) {
    countBadge.textContent = `Accounts to Review: ${visibleCards.length}`;
  }
}

// Show a toast message
function showToast(message, type = 'info') {
  // Check if toast container exists, if not create it
  let toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = `toast-${Date.now()}`;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.setAttribute('id', toastId);
  
  // Create toast content
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Initialize and show the toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 3000
  });
  
  bsToast.show();
  
  // Remove toast after it's hidden
  toast.addEventListener('hidden.bs.toast', function() {
    toast.remove();
  });
}
