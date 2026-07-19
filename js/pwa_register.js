const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

let installPromptEvent = null;
const installButton = document.getElementById("install-btn");

function hasEnoughEngagement() {
  const pagesVisited = JSON.parse(
    localStorage.getItem("swl_pages_visited") || "[]",
  );
  const cart = JSON.parse(localStorage.getItem("swl_cart") || "[]");
  return pagesVisited.length >= 2 || cart.length > 0;
}

function recordPageVisit() {
  const pagesVisited = new Set(
    JSON.parse(localStorage.getItem("swl_pages_visited") || "[]"),
  );
  pagesVisited.add(location.pathname);
  localStorage.setItem(
    "swl_pages_visited",
    JSON.stringify([...pagesVisited]),
  );
}

if (!isStandalone) {
  recordPageVisit();
}

function maybeShowInstallUI() {
  if (isStandalone || !hasEnoughEngagement()) return;

  if (isIOS) {
    showIOSInstallHint();
  } else if (installPromptEvent && installButton) {
    installButton.style.display = "flex";
  }
}
function showIOSInstallHint() {
  if (isStandalone || document.getElementById("ios-install-hint")) return;
  if (sessionStorage.getItem("swl_ios_hint_dismissed")) return;

  const hint = document.createElement("div");
  hint.id = "ios-install-hint";
  hint.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #0e6e4e, #0a4f38);
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999;
      display: flex;
      gap: 12px;
      align-items: center;
    ">
      <span style="flex: 1; font-size: 14px">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/><path d="M9 6c1-1 5-1 6 0" stroke-width="1.6"/></svg> Install this app: tap <strong>Share</strong>, then
        <strong>Add to Home Screen</strong>
      </span>
      <button id="ios-hint-dismiss" style="
        background: white;
        color: #0e6e4e;
        border: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      ">
        Got it
      </button>
    </div>
  `;
  document.body.appendChild(hint);
  document.getElementById("ios-hint-dismiss").addEventListener("click", () => {
    sessionStorage.setItem("swl_ios_hint_dismissed", "1");
    hint.remove();
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  console.log("Install prompt available");
  maybeShowInstallUI();
});
window.addEventListener("storage", (e) => {
  if (e.key === "swl_cart" || e.key === "swl_pages_visited") {
    maybeShowInstallUI();
  }
});
setTimeout(maybeShowInstallUI, 2000);

if (installButton) {
  installButton.addEventListener("click", async () => {
    if (!installPromptEvent) return;
    try {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === "accepted") {
        trackEvent("pwa_install", { status: "accepted" });
      }
      installPromptEvent = null;
      if (installButton) {
        installButton.style.display = "none";
      }
    } catch (err) {
      console.error("Error showing install prompt:", err);
      trackError("install_prompt_error", err);
    }
  });
}

window.addEventListener("appinstalled", () => {
  console.log("PWA installed successfully");
  trackEvent("pwa_installed", {});
  if (installButton) {
    installButton.style.display = "none";
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service_worker.js");
      console.log("Service worker registered:", reg.scope);
      trackEvent("service_worker_registered", { scope: reg.scope });

      setInterval(async () => {
        try {
          await reg.update();
        } catch (err) {
          console.error("Error updating service worker:", err);
        }
      }, 60000);

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        console.log("New service worker version found");

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdatePrompt();
            trackEvent("service_worker_update_available", {});
          }
        });
      });
    } catch (err) {
      console.error("Service worker registration failed:", err);
      trackError("service_worker_registration_error", err);
    }
  });
}

function showUpdatePrompt() {
  const updateDiv = document.createElement("div");
  updateDiv.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #0e6e4e, #0a4f38);
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999;
      display: flex;
      gap: 12px;
      align-items: center;
    ">
      <span style="flex: 1"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m6 6 2.5 2.5"/><path d="m15.5 15.5 2.5 2.5"/><path d="m18 6-2.5 2.5"/><path d="m8.5 15.5-2.5 2.5"/></svg> New version available!</span>
      <button onclick="location.reload()" style="
        background: white;
        color: #0e6e4e;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      ">
        Update Now
      </button>
    </div>
  `;
  document.body.appendChild(updateDiv);
  setTimeout(() => updateDiv.remove(), 30000);
}

window.addEventListener("offline", () => {
  console.log("App is offline");
  trackEvent("app_offline", {});
  showOfflineIndicator();
});

window.addEventListener("online", () => {
  console.log("App is back online");
  trackEvent("app_online", {});
  hideOfflineIndicator();
  syncOfflineData();
});

function showOfflineIndicator() {
  let indicator = document.getElementById("offline-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "offline-indicator";
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #e14e3b;
        color: white;
        padding: 12px;
        text-align: center;
        font-weight: 600;
        z-index: 1000;
      ">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20v-7"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5.5 13.5a9 9 0 0 1 13 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg> You're offline - some features may not work
      </div>
    `;
    document.body.appendChild(indicator);
    document.body.style.marginTop = "46px";
  }
}

function hideOfflineIndicator() {
  const indicator = document.getElementById("offline-indicator");
  if (indicator) {
    indicator.remove();
    document.body.style.marginTop = "0";
  }
}

function syncOfflineData() {
  const offlineOrders = JSON.parse(
    localStorage.getItem("swl_offline_orders") || "[]",
  );
  if (offlineOrders.length > 0) {
    console.log(`Syncing ${offlineOrders.length} offline orders...`);
  }
}

function trackEvent(eventName, data) {
  console.log("Analytics Event:", eventName, data);
}

function trackError(errorName, error) {
  console.error("Tracked Error:", errorName, error);
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
  trackError("unhandled_rejection", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("Global Error:", event.error);
  trackError("global_error", event.error);
});
