// Setup Wizard Logic
let currentStep = 1;
let connectionTested = false;
let configData = {};

// Initialize setup
document.addEventListener('DOMContentLoaded', async () => {
  // Load default workspace path
  try {
    const defaultPath = await window.electronAPI.getDefaultWorkspace();
    document.getElementById('workspacePath').value = defaultPath;
  } catch (error) {
    console.error('Failed to get default workspace:', error);
  }
});

// Navigation functions
function nextStep() {
  if (currentStep === 2 && !connectionTested) {
    showStatus('Please test your connection first', 'error');
    return;
  }
  
  if (currentStep < 3) {
    hideStep(currentStep);
    currentStep++;
    showStep(currentStep);
    updateProgress();
  }
}

function prevStep() {
  if (currentStep > 1) {
    hideStep(currentStep);
    currentStep--;
    showStep(currentStep);
    updateProgress();
  }
}

function hideStep(step) {
  const stepElement = document.getElementById(`step${step}`);
  stepElement.style.display = 'none';
}

function showStep(step) {
  const stepElement = document.getElementById(`step${step}`);
  stepElement.style.display = 'block';
  stepElement.classList.add('fade-in');
  
  // Reset animation class
  setTimeout(() => {
    stepElement.classList.remove('fade-in');
  }, 300);
}

function updateProgress() {
  for (let i = 1; i <= 3; i++) {
    const progressStep = document.getElementById(`step${i}-progress`);
    if (i <= currentStep) {
      progressStep.classList.add('active');
    } else {
      progressStep.classList.remove('active');
    }
  }
}

// Browse for workspace directory
async function browseWorkspace() {
  try {
    const selectedPath = await window.electronAPI.browseDirectory();
    if (selectedPath) {
      document.getElementById('workspacePath').value = selectedPath;
    }
  } catch (error) {
    console.error('Failed to browse directory:', error);
    showStatus('Failed to open directory browser', 'error');
  }
}

// Test API connection
async function testConnection() {
  const testBtn = document.getElementById('testBtn');
  const continueBtn = document.getElementById('continueBtn');
  const provider = document.getElementById('apiProvider').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter your API key', 'error');
    return;
  }
  
  // Show loading state
  testBtn.classList.add('btn-loading');
  testBtn.disabled = true;
  
  try {
    const isValid = await window.electronAPI.testConnection(provider, apiKey);
    
    if (isValid) {
      showStatus('Connection successful!', 'success');
      connectionTested = true;
      continueBtn.disabled = false;
      
      // Store config data
      configData = {
        workspacePath: document.getElementById('workspacePath').value,
        apiProvider: provider,
        apiKey: apiKey
      };
    } else {
      showStatus('Invalid API key. Please check and try again.', 'error');
      connectionTested = false;
      continueBtn.disabled = true;
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    showStatus('Connection test failed. Please try again.', 'error');
    connectionTested = false;
    continueBtn.disabled = true;
  } finally {
    testBtn.classList.remove('btn-loading');
    testBtn.disabled = false;
  }
}

// Show status message
function showStatus(message, type) {
  const statusElement = document.getElementById('connectionStatus');
  statusElement.innerHTML = `
    <div class="status-indicator status-${type}">
      ${getStatusIcon(type)} ${message}
    </div>
  `;
  statusElement.style.display = 'block';
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

function getStatusIcon(type) {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    default: return 'ℹ️';
  }
}

// Finish setup
async function finishSetup() {
  try {
    // Save configuration
    await window.electronAPI.saveConfig(configData);
    
    // Close setup window and open main window
    await window.electronAPI.finishSetup();
  } catch (error) {
    console.error('Failed to finish setup:', error);
    showStatus('Failed to save configuration. Please try again.', 'error');
  }
}

// Reset connection test when API key changes
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const providerSelect = document.getElementById('apiProvider');
  
  function resetConnectionTest() {
    connectionTested = false;
    document.getElementById('continueBtn').disabled = true;
    document.getElementById('connectionStatus').style.display = 'none';
  }
  
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', resetConnectionTest);
  }
  
  if (providerSelect) {
    providerSelect.addEventListener('change', resetConnectionTest);
  }
});

// Keyboard navigation
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (currentStep === 1) {
      nextStep();
    } else if (currentStep === 2) {
      const apiKey = document.getElementById('apiKey').value.trim();
      if (apiKey && !connectionTested) {
        testConnection();
      } else if (connectionTested) {
        nextStep();
      }
    } else if (currentStep === 3) {
      finishSetup();
    }
  } else if (event.key === 'Escape' && currentStep > 1) {
    prevStep();
  }
});