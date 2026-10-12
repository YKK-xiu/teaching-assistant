// API 请求封装
const TOKEN_KEY = 'ta_token';
const USER_KEY = 'ta_user';

const Auth = {
  getToken() { return localStorage.getItem(TOKEN_KEY) || ''; },
  setToken(t) { localStorage.setItem(TOKEN_KEY, t); },
  clearToken() { localStorage.removeItem(TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); },
  clearUser() { localStorage.removeItem(USER_KEY); },
  isLoggedIn() { return !!this.getToken(); },
  logout() { this.clearToken(); this.clearUser(); }
};

const API = {
  async request(method, url, data) {
    const opts = { method, headers: {} };
    const token = Auth.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data instanceof FormData) {
      opts.body = data;
    } else if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(data);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      Auth.logout();
      if (location.hash !== '#/login') {
        location.hash = '#/login';
      }
      throw new Error('请先登录');
    }
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      throw new Error(json.message || `请求失败 (${res.status})`);
    }
    return json.data;
  },
  get(url) { return this.request('GET', url); },
  post(url, data) { return this.request('POST', url, data); },
  put(url, data) { return this.request('PUT', url, data); },
  del(url) { return this.request('DELETE', url); },
  async upload(url, formData) {
    const token = Auth.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', body: formData, headers });
    if (res.status === 401) {
      Auth.logout();
      location.hash = '#/login';
      throw new Error('请先登录');
    }
    const json = await res.json();
    if (!res.ok || json.code !== 0) throw new Error(json.message || '上传失败');
    return json.data;
  }
};
