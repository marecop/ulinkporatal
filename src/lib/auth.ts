const SESSION_STORAGE_KEYS = [
  "activitiesData",
  "timetableData",
  "examsData",
  "examsAutoSyncAt",
] as const;

export function clearPortalTransientStorage() {
  for (const key of SESSION_STORAGE_KEYS) {
    sessionStorage.removeItem(key);
  }
}

export function clearPortalClientState() {
  clearPortalTransientStorage();
  localStorage.removeItem("authToken");
}

export function redirectToLogin() {
  clearPortalClientState();
  window.location.replace("/");
}
