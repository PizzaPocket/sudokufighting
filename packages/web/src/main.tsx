import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

console.log(
  '%cAh, a fellow sophisticate.',
  'font-size:15px;font-weight:bold;color:#8B49FF;',
  '\nFeel free to make yourself at home, I don\'t know what half this stuff does anyway.\n— Leonard'
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
