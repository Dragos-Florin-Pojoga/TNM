import './style.css';
import { App } from './App';

const app = new App();
app.init().catch((err) => {
  console.error('Fatal application error:', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'block';
    loading.innerHTML = '<p style="color:#ff4444;">Failed to initialize. Please reload the page.</p>';
  }
});
