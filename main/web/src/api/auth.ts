export async function getSession() {
  return fetch("/api/auth/session", { credentials: "include" }).then((res) => res.json());
}

export async function signOut() {
  return fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
