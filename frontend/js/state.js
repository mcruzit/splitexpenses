export const THEME_KEY = 'gastos_theme';

const state = {
  currentGroup: null,
  pushSubscriptionEndpoint: null,
};

// --- Local Storage Helpers ---
export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.error("Could not save to local storage", e);
    }
}

export function getFromLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error("Could not read from local storage", e);
        return null;
    }
}

// --- Theme Management ---
function _applyActualTheme(theme) {
    document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');
}

function _getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function applyTheme(theme) {
    if (theme === 'system') {
        _applyActualTheme(_getSystemTheme());
    } else {
        _applyActualTheme(theme);
    }
}

export function setTheme(theme) {
    saveToLocalStorage(THEME_KEY, theme);
    applyTheme(theme);
}

export function getTheme() {
    return getFromLocalStorage(THEME_KEY) || 'system';
}

export function initializeTheme() {
    const theme = getTheme();
    applyTheme(theme);

    // Listen for changes in the system theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentTheme = getTheme();
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });
}

// --- Group Management ---
export function setGroup(group) {
  state.currentGroup = group;
}

export function getGroup() {
  return state.currentGroup;
}

export async function getPushSubscriptionEndpoint() {
  if (state.pushSubscriptionEndpoint) {
    return state.pushSubscriptionEndpoint;
  }

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        state.pushSubscriptionEndpoint = subscription.endpoint;
        return subscription.endpoint;
      }
    } catch (error) {
      console.error('Error getting push subscription:', error);
    }
  }
  return null;
}