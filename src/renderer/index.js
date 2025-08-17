/**
 * Settings window renderer logic for How long have I worked?
 */

class SettingsRenderer {
  constructor() {
    this.currentSettings = null;
    this.init();
  }

  /**
   * Initialize the settings window
   */
  async init() {
    try {
      // Load current settings
      await this.loadSettings();

      // Set up event listeners
      this.setupEventListeners();

      // Enable/disable inputs based on current selection
      this.updateInputStates();

      console.log("Settings window initialized");
    } catch (error) {
      console.error("Failed to initialize settings window:", error);
      this.showError("Failed to load settings");
    }
  }

  /**
   * Load current settings from main process
   */
  async loadSettings() {
    this.currentSettings = await window.electronAPI.getSettings();
    this.populateForm();
  }

  /**
   * Populate form with current settings
   */
  populateForm() {
    if (!this.currentSettings) return;

    // Work mode
    const workModeRadio = document.querySelector(
      `input[name="workMode"][value="${this.currentSettings.workMode}"]`
    );
    if (workModeRadio) workModeRadio.checked = true;

    // Total hours
    document.getElementById("totalHoursInput").value =
      this.currentSettings.totalHours;

    // End time
    document.getElementById("endTimeInput").value =
      this.currentSettings.endTime;

    // Display mode
    const displayModeRadio = document.querySelector(
      `input[name="displayMode"][value="${this.currentSettings.displayMode}"]`
    );
    if (displayModeRadio) displayModeRadio.checked = true;

    // Time format
    document.getElementById("use24HourFormat").checked =
      this.currentSettings.use24HourFormat;

    // Auto-start options
    document.getElementById("autoStartOnLaunch").checked =
      this.currentSettings.autoStartOnLaunch;
    document.getElementById("autoStartOnBoot").checked =
      this.currentSettings.autoStartOnBoot;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Work mode radio buttons
    document.querySelectorAll('input[name="workMode"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        this.updateInputStates();
      });
    });

    // Total hours input validation
    document
      .getElementById("totalHoursInput")
      .addEventListener("input", (e) => {
        this.validateTotalHours(e.target);
      });

    // End time input validation
    document.getElementById("endTimeInput").addEventListener("input", (e) => {
      this.validateEndTime(e.target);
    });

    // Save button
    document.getElementById("saveBtn").addEventListener("click", () => {
      this.saveSettings();
    });

    // Cancel button
    document.getElementById("cancelBtn").addEventListener("click", () => {
      this.cancelSettings();
    });

    // Form submission
    document.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.remove("active");
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active");
    });

    // Add active class to selected tab and panel
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
  }

  /**
   * Update input states based on current selections
   */
  updateInputStates() {
    const workMode = document.querySelector(
      'input[name="workMode"]:checked'
    )?.value;

    const totalHoursInput = document.getElementById("totalHoursInput");
    const endTimeInput = document.getElementById("endTimeInput");

    if (workMode === "totalHours") {
      totalHoursInput.disabled = false;
      endTimeInput.disabled = true;
    } else if (workMode === "endTime") {
      totalHoursInput.disabled = true;
      endTimeInput.disabled = false;
    }
  }

  /**
   * Validate total hours input
   */
  validateTotalHours(input) {
    const value = parseInt(input.value);
    const isValid = value >= 1 && value <= 12;

    input.setCustomValidity(
      isValid ? "" : "Total hours must be between 1 and 12"
    );

    if (!isValid) {
      input.classList.add("error");
    } else {
      input.classList.remove("error");
    }
  }

  /**
   * Validate end time input
   */
  validateEndTime(input) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const isValid = timeRegex.test(input.value);

    input.setCustomValidity(
      isValid ? "" : "Please enter time in HH:MM format (24-hour)"
    );

    if (!isValid) {
      input.classList.add("error");
    } else {
      input.classList.remove("error");
    }
  }

  /**
   * Collect form data
   */
  collectFormData() {
    return {
      workMode: document.querySelector('input[name="workMode"]:checked')?.value,
      totalHours: parseInt(document.getElementById("totalHoursInput").value),
      endTime: document.getElementById("endTimeInput").value,
      displayMode: document.querySelector('input[name="displayMode"]:checked')
        ?.value,
      use24HourFormat: document.getElementById("use24HourFormat").checked,
      autoStartOnLaunch: document.getElementById("autoStartOnLaunch").checked,
      autoStartOnBoot: document.getElementById("autoStartOnBoot").checked,
    };
  }

  /**
   * Validate all form data
   */
  validateForm() {
    const data = this.collectFormData();
    const errors = [];

    // Validate work mode selection
    if (!data.workMode) {
      errors.push("Please select a work duration mode");
    }

    // Validate total hours
    if (data.workMode === "totalHours") {
      if (!data.totalHours || data.totalHours < 1 || data.totalHours > 12) {
        errors.push("Total hours must be between 1 and 12");
      }
    }

    // Validate end time
    if (data.workMode === "endTime") {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!data.endTime || !timeRegex.test(data.endTime)) {
        errors.push("Please enter a valid end time in HH:MM format");
      }
    }

    // Validate display mode selection
    if (!data.displayMode) {
      errors.push("Please select a display mode");
    }

    return { data, errors };
  }

  /**
   * Save settings
   */
  async saveSettings() {
    try {
      const { data, errors } = this.validateForm();

      if (errors.length > 0) {
        this.showError(errors.join("\\n"));
        return;
      }

      // Show loading state
      this.setLoadingState(true);

      // Save to main process
      await window.electronAPI.saveSettings(data);

      // Show success message
      this.showSuccess("Settings saved successfully!");

      // Close window after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      this.showError(error.message || "Failed to save settings");
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Cancel settings (close window without saving)
   */
  cancelSettings() {
    window.close();
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, "error");
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showMessage(message, "success");
  }

  /**
   * Show message with given type
   */
  showMessage(message, type = "info") {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(".message");
    existingMessages.forEach((msg) => msg.remove());

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;

    // Insert at top of container
    const container = document.querySelector(".settings-container");
    container.insertBefore(messageEl, container.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  }

  /**
   * Set loading state for buttons
   */
  setLoadingState(loading) {
    const saveBtn = document.getElementById("saveBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (loading) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      cancelBtn.disabled = true;
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      cancelBtn.disabled = false;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SettingsRenderer();
});
