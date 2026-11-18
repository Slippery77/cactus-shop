import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ShopDataProvider } from './features/products/ShopDataContext';
import { CartProvider } from './features/cart/CartContext';
import { ToastProvider } from './components/Toast';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ShopDataProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ShopDataProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
