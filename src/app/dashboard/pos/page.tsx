'use client';

import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Search, Trash2, CreditCard, DollarSign, Smartphone, Printer, Camera, QrCode, FileText, X, Check, ScanLine, Keyboard, Building2, User } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  isFaulty?: boolean;
  category?: { name: string };
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface SaleData {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  saleType: string;
  amountPaid: number;
  changeGiven: number;
  isInstallment: boolean;
  installmentTotal?: number;
  installmentPaid?: number;
  installmentDue?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  cashier: { name: string };
  items: { id: string; product: { name: string }; quantity: number; unitPrice: number; total: number }[];
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE' | 'CREDIT'>('CASH');
  const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [cashReceived, setCashReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [showScanner]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [barcodeInput]);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setProducts(data.products?.filter((p: Product) => p.stockQuantity > 0 && !p.isFaulty) || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function startScanner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      showNotification('Camera not available', 'error');
    }
  }

  function stopScanner() {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  }

  function handleBarcodeScan(code: string) {
    const product = products.find(p => p.barcode === code || p.sku === code);
    if (product) {
      addToCart(product);
      showNotification(`Added: ${product.name}`, 'success');
    } else {
      showNotification('Product not found', 'error');
    }
    setShowScanner(false);
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stockQuantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }

  const getPrice = (product: Product) => {
    if (saleType === 'WHOLESALE' && product.wholesalePrice) {
      return product.wholesalePrice;
    }
    return product.sellingPrice;
  };

  const subtotal = cart.reduce((sum, item) => sum + getPrice(item.product) * item.quantity, 0);
  const total = subtotal - discount;
  const change = Math.max(0, parseFloat(cashReceived) || 0 - total);

  const isCredit = paymentMethod === 'CREDIT';

  async function completeSale() {
    if (cart.length === 0) {
      showNotification('Cart is empty', 'error');
      return;
    }
    
    const cashAmount = parseFloat(cashReceived) || 0;
    
    if (isCredit) {
      if (!customerName || customerName.trim() === '') {
        showNotification('Please enter customer name for credit sale', 'error');
        return;
      }
      if (!customerPhone || customerPhone.trim() === '') {
        showNotification('Please enter customer phone for credit sale', 'error');
        return;
      }
      if (cashAmount <= 0) {
        showNotification('Please enter initial payment amount', 'error');
        return;
      }
    }
    
    if (paymentMethod === 'CASH' && cashAmount <= 0) {
      showNotification('Please enter cash received amount', 'error');
      return;
    }
    
    if (paymentMethod === 'CASH' && cashAmount < total) {
      showNotification('Insufficient cash received', 'error');
      return;
    }
    
    try {
      const saleData = { 
        items: cart, 
        discount, 
        paymentMethod,
        saleType,
        customerName: isCredit ? customerName : null,
        customerPhone: isCredit ? customerPhone : null,
        isInstallment: isCredit,
        amountPaid: cashAmount,
      };
      
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showNotification(data.error || 'Sale failed', 'error');
        return;
      }
      
      setLastSale(data.sale);
      setShowReceipt(true);
      setCart([]);
      setDiscount(0);
      setCashReceived('');
      setCustomerName('');
      setCustomerPhone('');
      fetchProducts();
      
      if (isCredit) {
        const due = total - cashAmount;
        showNotification(
          `Credit Sale: ${formatCurrency(total)} | Paid: ${formatCurrency(cashAmount)} | Due: ${formatCurrency(due)}`, 
          'success'
        );
      } else {
        showNotification(`Sale completed! Total: ${formatCurrency(total)}`, 'success');
      }
    } catch (error) {
      console.error('Sale failed:', error);
      showNotification('Sale failed. Please try again.', 'error');
    }
  }

  function printReceipt() {
    if (!lastSale) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${lastSale.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 80mm; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .info { margin-bottom: 10px; }
          .info div { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table th, table td { text-align: left; padding: 3px 0; }
          table th:last-child, table td:last-child { text-align: right; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
          .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
          .totals .grand-total { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          @media print { body { width: 80mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ISMS PRO</h1>
          <p>Inventory & Sales Management</p>
        </div>
        <div class="info">
          <div><span>Receipt:</span><span>${lastSale.receiptNumber}</span></div>
          <div><span>Date:</span><span>${formatDate(lastSale.createdAt)}</span></div>
          <div><span>Type:</span><span>${lastSale.saleType}</span></div>
          <div><span>Payment:</span><span>${lastSale.paymentMethod}</span></div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            ${lastSale.items.map(item => `
              <tr>
                <td>${item.product.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal:</span><span>${formatCurrency(lastSale.subtotal)}</span></div>
          ${lastSale.discount > 0 ? `<div><span>Discount:</span><span>-${formatCurrency(lastSale.discount)}</span></div>` : ''}
          <div class="grand-total"><span>TOTAL:</span><span>${formatCurrency(lastSale.total)}</span></div>
          <div><span>Paid:</span><span>${formatCurrency(lastSale.amountPaid)}</span></div>
          ${lastSale.changeGiven > 0 ? `<div><span>Change:</span><span>${formatCurrency(lastSale.changeGiven)}</span></div>` : ''}
        </div>
        ${lastSale.isInstallment ? `<div style="text-align:center;margin-top:10px;font-weight:bold;">INSTALLMENT SALE<br/>Due: ${formatCurrency(lastSale.installmentDue || 0)}</div>` : ''}
        <div class="footer">
          <p>Thank you for shopping with us!</p>
        </div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function handleBarcodeInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && barcodeInput) {
      handleBarcodeScan(barcodeInput);
      setBarcodeInput('');
    }
  }

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      <style>{`
        .cart-scroll::-webkit-scrollbar { width: 8px; }
        .cart-scroll::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
        .cart-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .cart-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .cart-items-scroll::-webkit-scrollbar { width: 8px; }
        .cart-items-scroll::-webkit-scrollbar-track { background: #1e293b; border-radius: 4px; }
        .cart-items-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .cart-items-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><ShoppingCart size={28} /> POS / Sales</h1>
          <p style={styles.subtitle}>Point of Sale - Scan or search products</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowScanner(true)} style={styles.scanBtn}>
            <Camera size={18} /> Scan
          </button>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.productsSection}>
          <div style={styles.searchBar}>
            <div style={styles.searchWrapper}>
              <ScanLine size={18} style={styles.searchIcon} />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or press Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeInputKeyDown}
                style={styles.searchInput}
              />
            </div>
            <button onClick={() => setShowManualEntry(true)} style={styles.manualBtn}>
              <Keyboard size={18} /> Manual
            </button>
          </div>

          <div style={styles.saleTypeToggle}>
            <button
              onClick={() => setSaleType('RETAIL')}
              style={{
                ...styles.typeBtn,
                ...(saleType === 'RETAIL' ? styles.typeBtnActive : {}),
              }}
            >
              <User size={18} /> Retail
            </button>
            <button
              onClick={() => setSaleType('WHOLESALE')}
              style={{
                ...styles.typeBtn,
                ...(saleType === 'WHOLESALE' ? styles.typeBtnActive : {}),
              }}
            >
              <Building2 size={18} /> Wholesale
            </button>
          </div>

          <div style={styles.productsGrid}>
            {products.map(product => (
              <div 
                key={product.id} 
                style={styles.productCard} 
                onClick={() => addToCart(product)}
                className="product-card"
              >
                <div style={styles.productName}>{product.name}</div>
                <div style={styles.productSku}>{product.sku}</div>
                <div style={styles.productFooter}>
                  <span style={styles.productPrice}>
                    {saleType === 'WHOLESALE' && product.wholesalePrice 
                      ? formatCurrency(product.wholesalePrice)
                      : formatCurrency(product.sellingPrice)
                    }
                  </span>
                  <span style={styles.productStock}>Stock: {product.stockQuantity}</span>
                </div>
                {saleType === 'WHOLESALE' && product.wholesalePrice && (
                  <div style={styles.wholesaleBadge}>Wholesale</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.cartSection}>
          <div style={styles.cartHeader}>
            <ShoppingCart size={20} />
            <h2 style={styles.cartTitle}>Cart</h2>
            <span style={styles.cartBadge}>{cart.length} items</span>
          </div>

          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <ShoppingCart size={48} style={{ opacity: 0.3 }} />
              <p>Cart is empty</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Click products to add</p>
            </div>
          ) : (
            <div>
              <div style={styles.cartListHeader}>
                <span>#</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Total</span>
                <span></span>
              </div>
              
              <div className="cart-items-scroll" style={styles.cartItemsContainer}>
                {cart.map((item) => (
                  <div key={item.product.id} style={styles.cartItemBox}>
                    <div style={styles.itemNumber}>{cart.indexOf(item) + 1}</div>
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>{item.product.name}</div>
                      <div style={styles.itemPrice}>
                        {formatCurrency(getPrice(item.product))} × {item.quantity}
                      </div>
                    </div>
                    <div style={styles.itemQty}>
                      <button onClick={() => updateQuantity(item.product.id, -1)} style={styles.btnMinus}>-</button>
                      <span style={styles.qtyNum}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} style={styles.btnPlus}>+</button>
                    </div>
                    <div style={styles.itemTotal}>{formatCurrency(getPrice(item.product) * item.quantity)}</div>
                    <button onClick={() => removeFromCart(item.product.id)} style={styles.btnRemove}>×</button>
                  </div>
                ))}
              </div>

              <div style={styles.cartSummary}>
                <div style={styles.summaryRow}>
                  <span>{saleType === 'WHOLESALE' ? 'Wholesale' : 'Retail'} Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Discount</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(Math.min(parseFloat(e.target.value) || 0, subtotal))}
                    style={styles.discountInput}
                  />
                </div>
                <div style={styles.totalRow}>
                  <span>Total</span>
                  <span style={styles.totalAmount}>{formatCurrency(total)}</span>
                </div>

                <div style={styles.paymentMethods}>
                  <label style={styles.paymentLabel}>Payment Method</label>
                  <div style={styles.paymentBtns}>
                    <button
                      onClick={() => setPaymentMethod('CASH')}
                      style={{ ...styles.paymentBtn, ...(paymentMethod === 'CASH' ? styles.paymentBtnActive : {}) }}
                    >
                      <DollarSign size={18} /> Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CARD')}
                      style={{ ...styles.paymentBtn, ...(paymentMethod === 'CARD' ? styles.paymentBtnActive : {}) }}
                    >
                      <CreditCard size={18} /> Card
                    </button>
                    <button
                      onClick={() => setPaymentMethod('MOBILE')}
                      style={{ ...styles.paymentBtn, ...(paymentMethod === 'MOBILE' ? styles.paymentBtnActive : {}) }}
                    >
                      <Smartphone size={18} /> Mobile
                    </button>
                    <button
                      onClick={() => setPaymentMethod('CREDIT')}
                      style={{ ...styles.paymentBtn, ...(paymentMethod === 'CREDIT' ? styles.paymentBtnActive : {}) }}
                    >
                      <FileText size={18} /> Credit
                    </button>
                  </div>
                </div>

                {isCredit && (
                  <div className="credit-scroll" style={styles.creditSection}>
                    <div style={styles.creditTitle}><FileText size={16} /> Credit / Installment Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={styles.fieldLabel}>Customer Name *</label>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          style={styles.creditInput}
                          required
                        />
                      </div>
                      <div>
                        <label style={styles.fieldLabel}>Phone Number *</label>
                        <input
                          type="text"
                          placeholder="+255..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          style={styles.creditInput}
                          required
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={styles.fieldLabel}>Initial Payment (Down Payment) *</label>
                      <input
                        type="number"
                        placeholder="Amount paid now"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        style={styles.creditInput}
                        required
                      />
                    </div>
                    <div style={{ ...styles.creditDue, flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total:</span>
                        <span style={{ fontWeight: '700' }}>{formatCurrency(total)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                        <span>Paid:</span>
                        <span style={{ fontWeight: '700' }}>{formatCurrency(parseFloat(cashReceived) || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f59e0b', paddingTop: '0.5rem', color: '#f59e0b' }}>
                        <span style={{ fontWeight: '700' }}>Balance Due:</span>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{formatCurrency(total - (parseFloat(cashReceived) || 0))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isCredit && paymentMethod === 'CASH' && (
                  <div style={styles.cashInput}>
                    <label style={styles.cashLabel}>Cash Received *</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Enter amount"
                      style={styles.cashField}
                      required
                    />
                    {parseFloat(cashReceived) > 0 && (
                      <div style={styles.changeDisplay}>
                        Change: <span style={styles.changeAmount}>{formatCurrency(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={completeSale}
                  style={styles.completeBtn}
                  disabled={cart.length === 0}
                >
                  <Check size={20} /> {isCredit ? 'Record Credit Sale' : 'Complete Sale'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <div style={styles.modalOverlay} onClick={() => setShowScanner(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><QrCode size={20} /> Scan Barcode</h2>
              <button onClick={() => setShowScanner(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.scannerBox}>
              <video ref={videoRef} autoPlay playsInline style={styles.video} />
            </div>
            <p style={styles.scanHint}>Point camera at barcode</p>
            <button onClick={() => setShowScanner(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {showManualEntry && (
        <div style={styles.modalOverlay} onClick={() => setShowManualEntry(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><Keyboard size={20} /> Manual Entry</h2>
              <button onClick={() => setShowManualEntry(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.manualForm}>
              <label style={styles.inputLabel}>Barcode / SKU</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter barcode or SKU"
                style={styles.inputField}
                autoFocus
              />
              <label style={styles.inputLabel}>Quantity</label>
              <input
                type="number"
                min="1"
                value={manualQty}
                onChange={(e) => setManualQty(parseInt(e.target.value) || 1)}
                style={styles.inputField}
              />
              <button onClick={() => { if(manualCode) handleBarcodeScan(manualCode); setShowManualEntry(false); }} style={styles.submitBtn}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastSale && (
        <div style={styles.modalOverlay} onClick={() => setShowReceipt(false)}>
          <div style={styles.receiptModal} onClick={e => e.stopPropagation()}>
            <div style={styles.receiptSuccess}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Check size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{isCredit ? 'Credit Sale Recorded!' : 'Sale Complete!'}</h2>
              <p style={styles.receiptNum}>#{lastSale.receiptNumber}</p>
            </div>
            
            <div style={{ background: '#0f172a', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sale Type</div>
                  <div style={{ fontWeight: '700', color: lastSale.saleType === 'WHOLESALE' ? '#8b5cf6' : '#3b82f6' }}>{lastSale.saleType}</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Payment</div>
                  <div style={{ fontWeight: '700', color: '#22c55e' }}>{lastSale.paymentMethod}</div>
                </div>
              </div>
              
              <div style={styles.receiptItems}>
                {lastSale.items.map(item => (
                  <div key={item.id} style={styles.receiptItem}>
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
                <div style={{ ...styles.receiptTotal, borderTop: '2px solid #334155', paddingTop: '0.75rem' }}>
                  <span>Total Amount</span>
                  <span style={{ fontSize: '1.25rem' }}>{formatCurrency(lastSale.total)}</span>
                </div>
              </div>
              
              {lastSale.isInstallment && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '0.5rem', border: '1px solid #8b5cf6' }}>
                  <div style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={16} /> Credit Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Paid Now</div>
                      <div style={{ fontWeight: '700', color: '#22c55e' }}>{formatCurrency(lastSale.installmentPaid || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Remaining</div>
                      <div style={{ fontWeight: '700', color: '#f59e0b' }}>{formatCurrency(lastSale.installmentDue || 0)}</div>
                    </div>
                  </div>
                  {lastSale.customerName && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Customer: {lastSale.customerName} {lastSale.customerPhone && `(${lastSale.customerPhone})`}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div style={styles.receiptActions}>
              <button onClick={printReceipt} style={styles.printBtn}>
                <Printer size={18} /> Print Receipt
              </button>
              <button onClick={() => setShowReceipt(false)} style={styles.doneBtn}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1.5rem', color: '#e2e8f0' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.25rem', color: '#64748b' },
  notification: { 
    position: 'fixed', 
    top: '1rem', 
    right: '1rem', 
    padding: '1rem 1.5rem', 
    borderRadius: '0.75rem', 
    color: 'white', 
    fontWeight: '600', 
    zIndex: 1000,
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    border: '2px solid',
    animation: 'slideIn 0.3s ease',
    maxWidth: '400px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: '#94a3b8', fontSize: '0.875rem' },
  headerActions: { display: 'flex', gap: '0.75rem' },
  scanBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' },
  productsSection: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  searchBar: { display: 'flex', gap: '0.75rem' },
  searchWrapper: { flex: 1, position: 'relative' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' },
  searchInput: { width: '100%', padding: '0.875rem 1rem 0.875rem 44px', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' },
  manualBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.25rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: '#e2e8f0', fontWeight: '600', cursor: 'pointer' },
  saleTypeToggle: { display: 'flex', gap: '0.5rem' },
  typeBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#94a3b8', fontWeight: '600', cursor: 'pointer' },
  typeBtnActive: { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '1px solid #8b5cf6', color: 'white' },
  productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' },
  productCard: { background: 'linear-gradient(145deg, #1e293b, #334155)', border: '1px solid #475569', borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', position: 'relative' },
  productName: { fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem', color: '#f1f5f9' },
  productSku: { fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' },
  productFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontWeight: '700', fontSize: '1.1rem', color: '#22c55e' },
  productStock: { fontSize: '0.75rem', color: '#94a3b8' },
  wholesaleBadge: { position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#8b5cf6', color: 'white', fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontWeight: '600' },
  wsLabel: { fontSize: '0.7rem', color: '#8b5cf6', marginLeft: '0.25rem' },
  cartSection: { background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem', minHeight: '600px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '1.5rem' },
  cartHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' },
  cartTitle: { fontSize: '1.125rem', fontWeight: '600', flex: 1 },
  cartBadge: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  emptyCart: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b', textAlign: 'center' },
  cartListHeader: { display: 'grid', gridTemplateColumns: '30px 1fr 70px 70px 30px', gap: '0.5rem', padding: '0.5rem', background: '#0f172a', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  cartItemsContainer: { flex: 1, minHeight: '100px', maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  cartItemBox: { display: 'grid', gridTemplateColumns: '30px 1fr 70px 70px 30px', gap: '0.5rem', alignItems: 'center', padding: '0.6rem', background: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' },
  itemNumber: { width: '24px', height: '24px', background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#94a3b8' },
  itemInfo: { minWidth: 0 },
  itemName: { fontWeight: '600', fontSize: '0.85rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemPrice: { fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' },
  itemQty: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  btnMinus: { width: '22px', height: '22px', background: '#ef4444', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
  qtyNum: { width: '20px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem' },
  btnPlus: { width: '22px', height: '22px', background: '#22c55e', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
  itemTotal: { fontWeight: '700', color: '#22c55e', fontSize: '0.85rem', textAlign: 'right' },
  btnRemove: { width: '22px', height: '22px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '0.25rem', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
  cartSummary: { borderTop: '2px solid #334155', paddingTop: '1rem', flexShrink: 0 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#94a3b8' },
  discountInput: { width: '80px', padding: '0.25rem 0.5rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.25rem', color: '#e2e8f0', textAlign: 'right' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' },
  totalAmount: { color: '#22c55e', fontWeight: '700' },
  paymentMethods: { marginTop: '1rem' },
  paymentLabel: { display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' },
  paymentBtns: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' },
  paymentBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.625rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' },
  paymentBtnActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '1px solid #3b82f6', color: 'white' },
  creditSection: { marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '0.75rem', border: '2px solid #8b5cf6' },
  creditTitle: { fontWeight: '700', color: '#a78bfa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' },
  creditInput: { width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem' },
  fieldLabel: { display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: '500' },
  creditDue: { marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' },
  cashInput: { marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' },
  cashLabel: { display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' },
  cashField: { width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600' },
  changeDisplay: { marginTop: '0.5rem', fontSize: '0.875rem', color: '#22c55e' },
  changeAmount: { fontWeight: '700', fontSize: '1.1rem' },
  completeBtn: { width: '100%', marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#1e293b', borderRadius: '1rem', padding: '1.5rem', maxWidth: '400px', width: '90%', border: '1px solid #334155' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#f1f5f9' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' },
  scannerBox: { position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  scanHint: { textAlign: 'center', color: '#94a3b8', marginBottom: '1rem' },
  cancelBtn: { width: '100%', padding: '0.75rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: '#e2e8f0', fontWeight: '600', cursor: 'pointer' },
  manualForm: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  inputLabel: { fontSize: '0.875rem', color: '#94a3b8' },
  inputField: { padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' },
  submitBtn: { padding: '0.875rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  receiptModal: { background: '#1e293b', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '90%', border: '1px solid #334155', textAlign: 'center' },
  receiptSuccess: { marginBottom: '1.5rem' },
  receiptNum: { color: '#94a3b8', marginTop: '0.5rem' },
  receiptItems: { background: '#0f172a', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' },
  receiptItem: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155', fontSize: '0.9rem' },
  receiptTotal: { display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', fontWeight: '700', fontSize: '1.1rem' },
  receiptInstallment: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.75rem', fontSize: '0.875rem', color: '#f59e0b' },
  receiptActions: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  printBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer' },
  doneBtn: { padding: '0.875rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: '#e2e8f0', fontWeight: '600', cursor: 'pointer' },
};
