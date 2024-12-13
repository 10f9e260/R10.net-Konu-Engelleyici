(async () => {
  chrome.storage.local.get(console.log);

  // Utility functions
  const getFromStorage = key => {
    return new Promise(resolve => {
      chrome.storage.local.get(key, result => resolve(result[key] || []));
    });
  };

  const applyBlurEffect = thread => {
    thread.style.display = "block";
    thread.style.filter = "blur(5px)";
    thread.style.opacity = "0.7";

    // Check if overlay already exists
    if (!thread.querySelector(".block-overlay")) {
      // Add overlay to prevent interaction
      const overlay = document.createElement("div");
      overlay.classList.add("block-overlay");
      overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            cursor: not-allowed;
        `;

      thread.style.position = "relative";
      thread.appendChild(overlay);
    }
  };

  const processThreads = (threads, users, topics, settings) => {
    threads.forEach(thread => {
      const topicElement = thread.querySelector(".title > a > span");
      const usernameElement = thread.querySelector("img");
      if (usernameElement) {
        const username = usernameElement.alt.trim();
        if (users.includes(username)) {
          thread.classList.add("blocked-user");

          if (settings.displayMode === "blur") {
            applyBlurEffect(thread);
          } else {
            thread.style.display = "none";
          }
        } else {
          if (thread.classList.contains("blocked-user")) {
            thread.classList.remove("blocked-user");
            thread.style.display = "block";
            thread.style.filter = "none";
            thread.style.opacity = "1";

            const overlay = thread.querySelector(".block-overlay");
            if (overlay) {
              thread.removeChild(overlay);
            }
          }
        }
      }

      if (topicElement) {
        const topic = topicElement.textContent.trim();
        let isMuted = false;
        topics.forEach(mutedTopic => {
          const regex = new RegExp(mutedTopic, "i");
          if (regex.test(topic)) {
            isMuted = true;
          }
        });

        if (isMuted) {
          thread.classList.add("muted-topic");

          if (settings.displayMode === "blur") {
            applyBlurEffect(thread);
          } else {
            thread.style.display = "none";
          }
        } else {
          if (thread.classList.contains("muted-topic")) {
            thread.classList.remove("muted-topic");
            thread.style.display = "block";
            thread.style.filter = "none";
            thread.style.opacity = "1";

            const overlay = thread.querySelector(".block-overlay");
            if (overlay) {
              thread.removeChild(overlay);
            }
          }
        }
      }
    });
  };

  const processPage = async () => {
    try {
      const threads = document.querySelectorAll(".threadList .thread");
      if (!threads || threads.length === 0) {
        return;
      }

      // Fetch data from storage
      const [blockedUsers, mutedUsers, mutedTopics, settings] = await Promise.all([getFromStorage("blockedUsers"), getFromStorage("mutedUsers"), getFromStorage("mutedTopics"), getFromStorage("settings")]);

      const users = [
        ...blockedUsers,
        ...mutedUsers
      ];

      // Process threads
      processThreads(threads, users, mutedTopics, settings);
    } catch (error) {
      console.error("Error in content script:", error);
    }
  };

  await processPage();

  chrome.runtime.onMessage.addListener(message => {
    if (message.action === "refreshPage") {
      processPage();
    }
  });
})();