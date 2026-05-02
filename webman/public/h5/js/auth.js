class AuthService {
  constructor() {
    this.TOKEN_KEY = 'auth_token';
    this.USER_KEY = 'user_info';
  }

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getUser() {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  login(token, user) {
    this.setToken(token);
    this.setUser(user);
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

export const auth = new AuthService();
export default auth;