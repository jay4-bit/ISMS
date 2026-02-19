'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Package, Plus, Search, Edit, Trash2, X, Camera, 
  Barcode, Printer, Tag, AlertTriangle, TrendingUp, 
  TrendingDown, DollarSign, ShoppingCart, Settings,
  CameraOff, Zap, Hash, ScanLine, FolderPlus, Lock, Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  category?: { name: string };
  supplier?: { name: string };
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  isFaulty: boolean;
  hasExpiry: boolean;
  expiryDate?: string;
  taxRate: number;
  location?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PriceTagTemplate {
  showBarcode: boolean;
  showPrice: boolean;
  showName: boolean;
  showSku: boolean;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const isWinger = user?.role === 'WINGER';
  const isCashier = user?.role === 'CASHIER';
  const isReadOnly = isCashier || isWinger;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPriceTags, setShowPriceTags] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '' });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [tagTemplate, setTagTemplate] = useState<PriceTagTemplate>({
    showBarcode: true,
    showPrice: true,
    showName: true,
    showSku: true
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', description: '', categoryId: '', supplierId: '',
    purchaseCost: '', sellingPrice: '', wholesalePrice: '', stockQuantity: '',
    lowStockThreshold: '10', reorderPoint: '20', hasExpiry: false, expiryDate: '',
    taxRate: '0', location: ''
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/categories'),
        fetch('/api/suppliers')
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const suppliersData = await suppliersRes.json();
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      setSuppliers(suppliersData.suppliers || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setCategories([...categories, data.category]);
        setNewCategoryName('');
        setShowCategoryModal(false);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  }

  async function createSupplier() {
    if (!newSupplier.name.trim()) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers([...suppliers, data.supplier]);
        setFormData({ ...formData, supplierId: data.supplier.id });
        setNewSupplier({ name: '', email: '', phone: '', address: '' });
        setShowSupplierModal(false);
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  function openModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        description: product.description || '',
        categoryId: product.categoryId,
        supplierId: '',
        purchaseCost: product.purchaseCost.toString(),
        sellingPrice: product.sellingPrice.toString(),
        wholesalePrice: product.wholesalePrice?.toString() || '',
        stockQuantity: product.stockQuantity.toString(),
        lowStockThreshold: product.lowStockThreshold.toString(),
        reorderPoint: product.reorderPoint.toString(),
        hasExpiry: product.hasExpiry,
        expiryDate: product.expiryDate || '',
        taxRate: product.taxRate.toString(),
        location: product.location || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', sku: '', barcode: '', description: '', 
        categoryId: categories[0]?.id || '', supplierId: '',
        purchaseCost: '', sellingPrice: '', wholesalePrice: '', 
        stockQuantity: '', lowStockThreshold: '10', reorderPoint: '20',
        hasExpiry: false, expiryDate: '', taxRate: '0', location: ''
      });
    }
    setShowModal(true);
  }

  function handleBarcodeScan(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && barcodeInput) {
      const product = products.find(p => p.barcode === barcodeInput || p.sku === barcodeInput);
      if (product) {
        openModal(product);
      } else {
        setFormData(prev => ({ ...prev, barcode: barcodeInput, sku: barcodeInput }));
        setShowModal(true);
      }
      setBarcodeInput('');
    }
  }

  function generateBarcode() {
    const code = 'SKU' + Date.now().toString(36).toUpperCase();
    setFormData(prev => ({ ...prev, barcode: code }));
  }

  function toggleProductSelection(productId: string) {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  function selectAllProducts() {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  }

  function printPriceTags() {
    const selected = products.filter(p => selectedProducts.includes(p.id));
    if (selected.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `
      <html>
      <head>
        <title>Price Tags</title>
        <style>
          @media print {
            .tag { 
              border: 1px solid #000; 
              padding: 10px; 
              margin: 5px; 
              display: inline-block; 
              text-align: center;
              font-family: Arial, sans-serif;
              page-break-inside: avoid;
            }
            .tag-name { font-weight: bold; font-size: 14px; }
            .tag-price { font-size: 20px; font-weight: bold; color: #000; }
            .tag-sku { font-size: 10px; color: #666; }
            .tag-barcode { margin-top: 5px; }
            .tag-barcode img { height: 40px; }
          }
        </style>
      </head>
      <body>
    `;

    selected.forEach(product => {
      html += `
        <div class="tag">
          ${tagTemplate.showName ? `<div class="tag-name">${product.name}</div>` : ''}
          ${tagTemplate.showPrice ? `<div class="tag-price">${formatCurrency(product.sellingPrice)}</div>` : ''}
          ${tagTemplate.showSku ? `<div class="tag-sku">SKU: ${product.sku}</div>` : ''}
          ${tagTemplate.showBarcode ? `<div class="tag-barcode"><img src="https://barcode.tec-it.com/${product.barcode || product.sku}?code=Code128&showtext=false" /></div>` : ''}
        </div>
      `;
    });

    html += '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = '/api/inventory';
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct ? { ...formData, id: editingProduct.id } : formData;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  const lowStockProducts = filteredProducts.filter(p => p.stockQuantity <= p.lowStockThreshold && !p.isFaulty);
  const outOfStock = filteredProducts.filter(p => p.stockQuantity === 0 && !p.isFaulty);
  const reorderNeeded = filteredProducts.filter(p => p.stockQuantity <= p.reorderPoint && !p.isFaulty);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Inventory</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Manage products</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isReadOnly && (
            <>
              <button onClick={() => setShowScanner(true)} className="btn btn-secondary" title="Scan Barcode" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Camera size={16} /> Scan
              </button>
              <button onClick={() => setShowPriceTags(true)} className="btn btn-secondary" title="Print Price Tags" disabled={selectedProducts.length === 0} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Tag size={16} /> Tags ({selectedProducts.length})
              </button>
              <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Plus size={16} /> Add
              </button>
            </>
          )}
          {isWinger && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#22c55e20', borderRadius: '0.375rem', color: '#22c55e' }}>
              <Eye size={14} />
              <span style={{ fontSize: '0.75rem' }}>View Only - Wholesale</span>
            </div>
          )}
          {isCashier && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#3b82f620', borderRadius: '0.375rem', color: '#3b82f6' }}>
              <Eye size={14} />
              <span style={{ fontSize: '0.75rem' }}>View Only</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card" style={{ border: lowStockProducts.length ? '1px solid #f59e0b' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color={lowStockProducts.length ? '#f59e0b' : '#22c55e'} />
            <div>
              <div className="stat-value" style={{ color: lowStockProducts.length ? '#f59e0b' : undefined }}>{lowStockProducts.length}</div>
              <div className="stat-label">Low Stock</div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ border: outOfStock.length ? '1px solid #ef4444' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color={outOfStock.length ? '#ef4444' : '#22c55e'} />
            <div>
              <div className="stat-value" style={{ color: outOfStock.length ? '#ef4444' : undefined }}>{outOfStock.length}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingDown size={20} color="#3b82f6" />
            <div>
              <div className="stat-value">{reorderNeeded.length}</div>
              <div className="stat-label">Reorder Needed</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{formatCurrency(filteredProducts.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0))}</div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid',
            borderColor: selectedCategory === 'all' ? '#3b82f6' : '#334155',
            background: selectedCategory === 'all' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#1e293b',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.75rem',
          }}
        >
          All ({products.length})
        </button>
        {categories.map(cat => {
          const count = products.filter(p => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid',
                borderColor: selectedCategory === cat.id ? '#3b82f6' : '#334155',
                background: selectedCategory === cat.id ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#1e293b',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.75rem',
              }}
            >
              {cat.name} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setShowCategoryModal(true)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px dashed #475569',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <FolderPlus size={14} /> Add
        </button>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', padding: '0.5rem', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ position: 'relative', width: '150px' }}>
            <ScanLine size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input"
              placeholder="Scan..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              style={{ paddingLeft: '34px', padding: '0.5rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>
        {selectedProducts.length > 0 && !isReadOnly && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={selectedProducts.length === products.length} 
              onChange={selectAllProducts}
            />
            <span style={{ fontSize: '0.8rem' }}>{selectedProducts.length} selected</span>
            <button onClick={printPriceTags} className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
              <Printer size={12} /> Print
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {isWinger ? (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                <th style={{ minWidth: '200px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ width: '120px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>BARCODE</th>
                <th style={{ width: '100px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>CATEGORY</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>LOCATION</th>
                <th style={{ width: '90px', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>WHOLESALE</th>
                <th style={{ width: '60px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: index % 2 === 0 ? '#1e293b' : '#0f172a', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '0.8rem' }}>{product.name}</div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {product.isFaulty && <span style={{ padding: '0.125rem 0.375rem', background: '#ef444420', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.6rem', fontWeight: '500' }}>Faulty</span>}
                      {product.hasExpiry && product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && <span style={{ padding: '0.125rem 0.375rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: '0.25rem', fontSize: '0.6rem', fontWeight: '500' }}>Expiring</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{product.barcode || '-'}</td>
                  <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                  <td style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>{product.location || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e', fontSize: '0.75rem' }}>
                    {formatCurrency(product.wholesalePrice || product.sellingPrice)}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? '#f59e0b' : product.stockQuantity === 0 ? '#ef4444' : '#f1f5f9' }}>
                      {product.stockQuantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                {!isReadOnly && (
                  <th style={{ width: '35px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155' }}>
                    <input type="checkbox" checked={selectedProducts.length > 0 && selectedProducts.length === products.length} onChange={selectAllProducts} />
                  </th>
                )}
                <th style={{ minWidth: '160px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>SKU</th>
                <th style={{ width: '100px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>BARCODE</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>CATEGORY</th>
                <th style={{ width: '70px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>LOC</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>COST</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>PRICE</th>
                <th style={{ width: '50px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>STOCK</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>STATUS</th>
                {!isReadOnly && <th style={{ width: '70px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: selectedProducts.includes(product.id) ? '#3b82f620' : index % 2 === 0 ? '#1e293b' : '#0f172a', transition: 'background 0.2s' }}>
                  {!isReadOnly && (
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={() => toggleProductSelection(product.id)} />
                    </td>
                  )}
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '0.8rem' }}>{product.name}</div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {product.isFaulty && <span style={{ padding: '0.125rem 0.375rem', background: '#ef444420', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.6rem', fontWeight: '500' }}>Faulty</span>}
                      {product.hasExpiry && product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && <span style={{ padding: '0.125rem 0.375rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: '0.25rem', fontSize: '0.6rem', fontWeight: '500' }}>Expiring</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{product.sku}</td>
                  <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{product.barcode || '-'}</td>
                  <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                  <td style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>{product.location || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem' }}>{formatCurrency(product.purchaseCost)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e', fontSize: '0.75rem' }}>{formatCurrency(product.sellingPrice)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? '#f59e0b' : product.stockQuantity === 0 ? '#ef4444' : '#f1f5f9' }}>{product.stockQuantity}</span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {product.stockQuantity === 0 ? (
                      <span style={{ padding: '0.2rem 0.4rem', background: '#ef444420', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: '600' }}>Out</span>
                    ) : product.stockQuantity <= product.lowStockThreshold ? (
                      <span style={{ padding: '0.2rem 0.4rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: '600' }}>Low</span>
                    ) : product.stockQuantity <= product.reorderPoint ? (
                      <span style={{ padding: '0.2rem 0.4rem', background: '#3b82f620', color: '#3b82f6', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: '600' }}>Reorder</span>
                    ) : (
                      <span style={{ padding: '0.2rem 0.4rem', background: '#22c55e20', color: '#22c55e', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: '600' }}>In Stock</span>
                    )}
                  </td>
                  {!isReadOnly && (
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: '#3b82f6', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit"><Edit size={12} /></button>
                        <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: '#ef4444', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filteredProducts.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1rem' }}>No products found</p>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>Try adjusting your search or filter</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Product Name *</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">SKU *</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input type="text" className="input" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required disabled={!!editingProduct} style={{ flex: 1 }} />
                    <button type="button" onClick={generateBarcode} className="btn btn-secondary" title="Generate SKU"><Hash size={18} /></button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Barcode</label>
                  <input type="text" className="input" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="select" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                    <option value="">Select category</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Supplier</label>
                  <select className="select" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                    <option value="">Select supplier</option>
                    {suppliers.map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="button" onClick={() => setShowSupplierModal(true)} style={{ padding: '0.625rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }} title="Add New Supplier">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Purchase Cost</label>
                  <input type="number" step="0.01" className="input" value={formData.purchaseCost} onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Selling Price *</label>
                  <input type="number" step="0.01" className="input" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Wholesale Price</label>
                  <input type="number" step="0.01" className="input" value={formData.wholesalePrice} onChange={e => setFormData({ ...formData, wholesalePrice: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Stock Quantity</label>
                  <input type="number" className="input" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Low Stock Alert</label>
                  <input type="number" className="input" value={formData.lowStockThreshold} onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                </div>
                <div>
                  <label className="label">Reorder Point</label>
                  <input type="number" className="input" value={formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Tax Rate (%)</label>
                  <input type="number" step="0.01" className="input" value={formData.taxRate} onChange={e => setFormData({ ...formData, taxRate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input type="text" className="input" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Aisle-Shelf" />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.hasExpiry} onChange={e => setFormData({ ...formData, hasExpiry: e.target.checked })} />
                  <span className="label" style={{ marginBottom: 0 }}>Has Expiry Date</span>
                </label>
              </div>
              {formData.hasExpiry && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Description</label>
                <input type="text" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Barcode Scanner</h2>
              <button onClick={() => setShowScanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed #e2e8f0', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <Camera size={48} color="#94a3b8" />
              <p style={{ marginTop: '1rem', color: '#64748b' }}>Camera scanner ready</p>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Point camera at barcode or use manual input below</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Enter barcode manually..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scannedCode) {
                    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
                    if (product) openModal(product);
                    setScannedCode('');
                    setShowScanner(false);
                  }
                }}
                autoFocus
              />
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (scannedCode) {
                    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
                    if (product) openModal(product);
                    setScannedCode('');
                    setShowScanner(false);
                  }
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceTags && (
        <div className="modal-overlay" onClick={() => setShowPriceTags(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Price Tag Settings</h2>
              <button onClick={() => setShowPriceTags(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#64748b' }}>{selectedProducts.length} products selected</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showName} onChange={(e) => setTagTemplate({ ...tagTemplate, showName: e.target.checked })} />
                <span>Show Product Name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showPrice} onChange={(e) => setTagTemplate({ ...tagTemplate, showPrice: e.target.checked })} />
                <span>Show Price</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showSku} onChange={(e) => setTagTemplate({ ...tagTemplate, showSku: e.target.checked })} />
                <span>Show SKU</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showBarcode} onChange={(e) => setTagTemplate({ ...tagTemplate, showBarcode: e.target.checked })} />
                <span>Show Barcode</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPriceTags(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={printPriceTags} className="btn btn-primary">
                <Printer size={18} /> Print Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.5rem', maxWidth: '400px', width: '90%', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: '600' }}><FolderPlus size={20} /> Add New Category</h2>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={createCategory} className="btn btn-primary">
                <Plus size={18} /> Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: '600' }}><Plus size={20} /> Add New Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Supplier Name *</label>
              <input
                type="text"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="Enter supplier name"
                style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Phone</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="+255..."
                  style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Address</label>
              <input
                type="text"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                placeholder="Supplier address"
                style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={createSupplier} className="btn btn-primary">
                <Plus size={18} /> Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
