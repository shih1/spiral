import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Collect and log web vitals
reportWebVitals((metric) => {
  console.log(metric);
  // This will be captured by the PerformanceMonitor component
});
