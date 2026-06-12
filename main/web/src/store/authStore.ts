export const authStore = {
  session: null as null | { userId: string; email: string; role: string },
  setSession(session: { userId: string; email: string; role: string }) {
    this.session = session;
  },
  clear() {
    this.session = null;
  },
};
