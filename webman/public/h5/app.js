import { router } from './js/router.js';
import { auth } from './js/auth.js';
import LoginView from './js/views/LoginView.js';
import ListView from './js/views/ListView.js';

class App {
  constructor() {
    this.loginView = null;
    this.listView = null;
    this.init();
  }

  init() {
    this.createViews();
    router.init();
    router.setApp(this);
    router.start();
  }

  createViews() {
    const app = document.getElementById('app');

    const loginViewEl = document.createElement('div');
    loginViewEl.id = 'login-view';
    loginViewEl.className = 'view login-view';
    app.appendChild(loginViewEl);

    const listViewEl = document.createElement('div');
    listViewEl.id = 'list-view';
    listViewEl.className = 'view list-view';
    app.appendChild(listViewEl);

    this.loginView = new LoginView(loginViewEl);
    this.listView = new ListView(listViewEl);
    listViewEl.__listView = this.listView;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});