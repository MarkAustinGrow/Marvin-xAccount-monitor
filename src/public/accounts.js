// Client-side JavaScript for the Account Management page

document.addEventListener('DOMContentLoaded', function() {
  // Set up the account search functionality
  setupAccountSearch();
  
  // Set up the add account form
  setupAddAccountForm();
  
  // Set up the delete account buttons
  setupDeleteAccountButtons();
  
  // Set up the priority select functionality
  setupPrioritySelects();
  
  // Set up the refresh button
  setupRefreshButton();
});

// Set up the account search functionality
function setupAccountSearch() {
  const accountSearch = document.getElementById('account-search');
  
  if (accountSearch) {
    accountSearch.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const accountRows = document.querySelectorAll('.account-row');
      
      accountRows.forEach(row => {
        const handle = row.dataset.handle;
        if (handle.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }
}

// Set up the add account form
function setupAddAccountForm() {
  const addAccountForm = document.getElementById('add-account-form');
  
  if (addAccountForm) {
    addAccountForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const handleInput = document.getElementById('account-handle');
      const prioritySelect = document.getElementById('account-priority');
      const addButton = document.getElementById('add-account-btn');
      
      // Get the values
      const handle = handleInput.value.trim();
      const priority = prioritySelect.value;
      
      // Validate
      if (!handle) {
        showToast('Please enter an account handle', 'danger');
        return;
      }
      
      // Disable the button during the request
      addButton.disabled = true;
      addButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
      
      try {
        // Send the request to add the account
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ handle, priority })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Show success message
          showToast(`Account @${handle} added successfully`, 'success');
          
          // Clear the form
          handleInput.value = '';
          prioritySelect.value = '3';
          
          // Refresh the page to show the new account
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showToast(`Error: ${data.error}`, 'danger');
        }
      } catch (error) {
        console.error('Error adding account:', error);
        showToast('An error occurred while adding the account', 'danger');
      } finally {
        // Re-enable the button
        addButton.disabled = false;
        addButton.innerHTML = 'Add Account';
      }
    });
  }
}

// Set up the delete account buttons
function setupDeleteAccountButtons() {
  const deleteButtons = document.querySelectorAll('.delete-account');
  const deleteModal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const deleteAccountName = document.getElementById('delete-account-name');
  
  let accountToDelete = null;
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', function() {
      const id = this.dataset.id;
      const handle = this.dataset.handle;
      
      // Set the account to delete
      accountToDelete = { id, handle };
      
      // Update the modal
      deleteAccountName.textContent = `@${handle}`;
      
      // Show the modal
      deleteModal.show();
    });
  });
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function() {
      if (!accountToDelete) return;
      
      // Disable the button during the request
      this.disabled = true;
      this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
      
      try {
        // Send the request to delete the account
        const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Hide the modal
          deleteModal.hide();
          
          // Show success message
          showToast(`Account @${accountToDelete.handle} removed successfully`, 'success');
          
          // Remove the row from the table
          const row = document.querySelector(`.account-row[data-handle="${accountToDelete.handle.toLowerCase()}"]`);
          if (row) {
            row.remove();
          }
          
          // Update the account count
          updateAccountCount();
        } else {
          showToast(`Error: ${data.error}`, 'danger');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        showToast('An error occurred while removing the account', 'danger');
      } finally {
        // Re-enable the button
        this.disabled = false;
        this.innerHTML = 'Remove Account';
        
        // Reset the account to delete
        accountToDelete = null;
      }
    });
  }
}

// Set up the refresh button
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-accounts-btn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      window.location.reload();
    });
  }
}

// Set up the priority select functionality
function setupPrioritySelects() {
  const prioritySelects = document.querySelectorAll('.priority-select');
  
  prioritySelects.forEach(select => {
    // Store the original value
    const originalValue = select.value;
    
    // Add change event listener
    select.addEventListener('change', function() {
      const id = this.dataset.id;
      const saveButton = this.parentElement.querySelector('.save-priority');
      
      // Show the save button if the value has changed
      if (this.value !== this.dataset.original) {
        saveButton.style.display = 'block';
      } else {
        saveButton.style.display = 'none';
      }
    });
    
    // Add save button click event listener
    const saveButton = select.parentElement.querySelector('.save-priority');
    if (saveButton) {
      saveButton.addEventListener('click', async function() {
        const id = this.dataset.id;
        const select = this.parentElement.querySelector('.priority-select');
        const newPriority = select.value;
        
        // Disable the button during the request
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
          // Send the request to update the priority
          const response = await fetch(`/api/accounts/${id}/priority`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ priority: newPriority })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Update the original value
            select.dataset.original = newPriority;
            
            // Hide the save button
            this.style.display = 'none';
            
            // Show success message
            showToast('Priority updated successfully', 'success');
          } else {
            showToast(`Error: ${data.error}`, 'danger');
            
            // Reset to original value
            select.value = select.dataset.original;
          }
        } catch (error) {
          console.error('Error updating priority:', error);
          showToast('An error occurred while updating priority', 'danger');
          
          // Reset to original value
          select.value = select.dataset.original;
        } finally {
          // Re-enable the button
          this.disabled = false;
          this.innerHTML = '<i class="bi bi-check"></i>';
        }
      });
    }
  });
}

// Update the account count in the badge
function updateAccountCount() {
  const countBadge = document.querySelector('.badge.bg-primary');
  const accountRows = document.querySelectorAll('.account-row');
  
  if (countBadge) {
    countBadge.textContent = `Accounts: ${accountRows.length}`;
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
