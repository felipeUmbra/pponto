import './styles.css';
import { greet } from './greet.js';

const app = document.querySelector('#app');

if (app) {
  app.innerHTML = `<h1>${greet('Ponto Dot8')}</h1>`;
}