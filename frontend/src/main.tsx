import React from 'react';
import ReactDOM from 'react-dom/client';
import RightPanel from './components/RightPanel';
import './app.css'; // Make sure this import is present at your entry point!

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RightPanel />
  </React.StrictMode>
);