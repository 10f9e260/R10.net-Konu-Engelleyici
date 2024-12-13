// Initialize DOM Content Loaded event
const initializeExtension = () => {
  loadAllData();
  setupEventListeners();
};

document.addEventListener("DOMContentLoaded", initializeExtension);

// Utility functions
const getElement = id => document.getElementById(id);

const getFromStorage = key => {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => resolve(result[key] || []));
  });
};

const setToStorage = (key, value) => {
  return new Promise(resolve => {
    chrome.storage.local.set({
      [key]: value
    }, resolve);
  });
};

// Update refresh button state
const updateRefreshButton = isLoading => {
  const refreshButton = getElement("refreshBlockedUsers");
  refreshButton.disabled = isLoading;
  refreshButton.textContent = isLoading
    ? "Yenileniyor..."
    : "Yenile";
};

// Chrome runtime message listener
chrome.runtime.onMessage.addListener(message => {
  if (message.action === "loadingState") {
    updateRefreshButton(message.loading);
    if (!message.loading) 
      loadBlockedUsers();
    }
  });

const refreshPage = () => {};

// Event listeners setup
const setupEventListeners = () => {
  getElement("displayMode").addEventListener("change", saveSettings);
  getElement("refreshBlockedUsers").addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "fetchBlockedUsers"});
  });

  getElement("addMutedUser").addEventListener("click", addMutedUser);
  getElement("mutedUsersList").addEventListener("click", handleMutedUserDelete);

  getElement("addMutedTopic").addEventListener("click", addMutedTopic);
  getElement("mutedTopicsList").addEventListener("click", handleMutedTopicDelete);
};

// Load all data
const loadAllData = async () => {
  await Promise.all([loadSettings(), loadBlockedUsers(), loadMutedUsers(), loadMutedTopics()]);
};

// Load settings
const loadSettings = async () => {
  const settings = await getFromStorage("settings");
  if (settings) 
    getElement("displayMode").value = settings.displayMode;
  };

const sendMessageToContent = async () => {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    await chrome.tabs.sendMessage(tab.id, {action: "refreshPage"});
  } catch (error) {
    console.error("send message to content", error);
  }
};

const saveSettings = async () => {
  const newSettings = {
    displayMode: getElement("displayMode").value
  };
  await setToStorage("settings", newSettings);
  await sendMessageToContent();
};

// Load blocked users
const loadBlockedUsers = async () => {
  const blockedUsers = await getFromStorage("blockedUsers");
  await sendMessageToContent();
  const list = getElement("blockedUsersList");
  list.innerHTML = "";
  blockedUsers.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    list.appendChild(li);
  });
};

// Load muted users
const loadMutedUsers = async () => {
  const mutedUsers = await getFromStorage("mutedUsers");
  await sendMessageToContent();
  const list = getElement("mutedUsersList");
  list.innerHTML = "";
  mutedUsers.forEach(user => {
    const li = document.createElement("li");
    li.innerHTML = `
            <span>${user}</span>
            <button class="delete-btn" data-user="${user}">Sil</button>
        `;
    list.appendChild(li);
  });
};

// Load muted topics
const loadMutedTopics = async () => {
  const mutedTopics = await getFromStorage("mutedTopics");
  await sendMessageToContent();
  const list = getElement("mutedTopicsList");
  list.innerHTML = "";
  mutedTopics.forEach(topic => {
    const li = document.createElement("li");
    li.innerHTML = `
            <span>${topic}</span>
            <button class="delete-btn" data-topic="${topic}">Sil</button>
        `;
    list.appendChild(li);
  });
};

// Add muted user
const addMutedUser = async () => {
  const input = getElement("mutedUserInput");
  const username = input.value.trim();
  if (!username) 
    return;
  
  const mutedUsers = await getFromStorage("mutedUsers");
  if (!mutedUsers.includes(username)) {
    mutedUsers.push(username);
    await setToStorage("mutedUsers", mutedUsers);
    loadMutedUsers();
    input.value = "";
  }
};

// Add muted topic
const addMutedTopic = async () => {
  const input = getElement("mutedTopicInput");
  const topic = input.value.trim();
  if (!topic) 
    return;
  
  const mutedTopics = await getFromStorage("mutedTopics");
  if (!mutedTopics.includes(topic)) {
    mutedTopics.push(topic);
    await setToStorage("mutedTopics", mutedTopics);
    loadMutedTopics();
    input.value = "";
  }
};

// Handle muted user delete
const handleMutedUserDelete = async event => {
  if (!event.target.classList.contains("delete-btn")) 
    return;
  const username = event.target.dataset.user;

  const mutedUsers = await getFromStorage("mutedUsers");
  const updatedUsers = mutedUsers.filter(user => user !== username);
  await setToStorage("mutedUsers", updatedUsers);
  await loadMutedUsers();
};

// Handle muted topic delete
const handleMutedTopicDelete = async event => {
  if (!event.target.classList.contains("delete-btn")) 
    return;
  const topic = event.target.dataset.topic;

  const mutedTopics = await getFromStorage("mutedTopics");
  const updatedTopics = mutedTopics.filter(t => t !== topic);
  await setToStorage("mutedTopics", updatedTopics);
  await loadMutedTopics();
};
