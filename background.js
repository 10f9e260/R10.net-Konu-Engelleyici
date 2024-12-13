// Configurations
const CONFIG = {
  targetUrl: "https://www.r10.net/profil/engellemeler/",
  defaultSettings: {
    displayMode: "blur" // 'blur' or 'hide'
  }
};

const sendMessage = (action, data = {}) => {
  chrome.runtime.sendMessage({
    action,
    ...data
  });
};

// Extension Core Module
const ExtensionCore = (() => {
  const handleExtensionClick = tab => {
    if (tab.url.includes("r10.net")) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ["content.js"]
      });
    }
  };

  const handleStartup = () => {
    BlockedUsersManager.fetchAndStoreBlockedUsers();
  };

  const handleInstalled = async details => {
    if (details.reason === "update") {
      chrome.storage.local.clear();
    }

    await BlockedUsersManager.fetchAndStoreBlockedUsers();
    await chrome.storage.local.set({settings: CONFIG.defaultSettings});
  };

  const initializeEventListeners = () => {
    chrome.action.onClicked.addListener(handleExtensionClick);
    chrome.runtime.onStartup.addListener(handleStartup);
    chrome.runtime.onInstalled.addListener(handleInstalled);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "fetchBlockedUsers") {
        BlockedUsersManager.fetchAndStoreBlockedUsers(true);
      }
    });
  };

  return {initializeEventListeners};
})();

// Blocked Users Manager Module
const BlockedUsersManager = (() => {
  const fetchAndStoreBlockedUsers = async (loading = false) => {
    try {
      if (loading) 
        sendMessage("loadingState", {loading: true});
      
      const response = await fetch(CONFIG.targetUrl, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const sourceCode = await response.text();
      const blockedUsers = parseBlockedUsers(sourceCode);

      await chrome.storage.local.set({blockedUsers});

      if (loading) 
        sendMessage("loadingState", {loading: false});
      }
    catch (error) {
      console.error("Failed to fetch blocked users:", error);
      sendMessage("loadingState", {loading: false});
    }
  };

  const parseBlockedUsers = sourceCode => {
    const regex = /<div class="checkbox[^>]*>.*?<label[^>]*>(.*?)<\/label>/g;
    const matches = [];
    let match;

    while ((match = regex.exec(sourceCode)) !== null) {
      matches.push(match[1].trim());
    }

    return matches;
  };

  return {fetchAndStoreBlockedUsers};
})();

// Initialize the extension
ExtensionCore.initializeEventListeners();
