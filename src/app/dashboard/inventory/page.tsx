'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Package, Plus, Search, Edit, Trash2, X, Camera, 
  Barcode, Printer, Tag, AlertTriangle, TrendingUp, 
  TrendingDown, DollarSign, ShoppingCart, Settings,
  CameraOff, Zap, Hash, ScanLine, FolderPlus, Lock, Eye, Upload, Download
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
  variant?: string;
  variantType?: string;
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
  copies: number;
}

const VARIANT_TYPES = [
  { value: 'COLOR', label: 'Color' },
  { value: 'SIZE', label: 'Size' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'PACK', label: 'Pack' },
  { value: 'FLAVOR', label: 'Flavor' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'OTHER', label: 'Other' },
];

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
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
    showSku: true,
    copies: 1
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', description: '', categoryId: '', supplierId: '',
    purchaseCost: '', sellingPrice: '', wholesalePrice: '', stockQuantity: '',
    lowStockThreshold: '10', reorderPoint: '20', hasExpiry: false, expiryDate: '',
    taxRate: '0', location: '', variant: '', variantType: ''
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

  async function startScanner() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('scanner-container');
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          const product = products.find(p => p.barcode === decodedText || p.sku === decodedText);
          if (product) {
            openModal(product);
          } else {
            alert(`Product not found for code: ${decodedText}`);
          }
          stopScanner();
          setShowScanner(false);
        },
        () => {}
      );
      setScannerActive(true);
    } catch (err) {
      console.error('Scanner error:', err);
      alert('Camera not available or permission denied');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setScannerActive(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

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
        location: product.location || '',
        variant: product.variant || '',
        variantType: product.variantType || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', sku: '', barcode: '', description: '', 
        categoryId: categories[0]?.id || '', supplierId: '',
        purchaseCost: '', sellingPrice: '', wholesalePrice: '', 
        stockQuantity: '', lowStockThreshold: '10', reorderPoint: '20',
        hasExpiry: false, expiryDate: '', taxRate: '0', location: '',
        variant: '', variantType: ''
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

    const generateAllBarcodes = async () => {
      const JsBarcode = (await import('jsbarcode')).default;
      const tagsHtml: string[] = [];
      
      for (let i = 0; i < selected.length; i++) {
        const product = selected[i];
        const code = product.barcode || product.sku || '0000000000000';
        
        for (let copy = 0; copy < tagTemplate.copies; copy++) {
          let barcodeImg = '';
          try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, code, {
              format: 'EAN13',
              width: 2,
              height: 40,
              displayValue: true,
              fontSize: 10,
              margin: 0,
              background: '#ffffff',
              lineColor: '#000000'
            });
            barcodeImg = canvas.toDataURL('image/png');
          } catch (e) {
            barcodeImg = '';
          }
          
          tagsHtml.push(`
            <div class="tag">
              ${tagTemplate.showName ? `<div class="tag-name">${product.name}</div>` : ''}
              ${tagTemplate.showPrice ? `<div class="tag-price">${formatCurrency(product.sellingPrice)}</div>` : ''}
              ${tagTemplate.showSku ? `<div class="tag-sku">SKU: ${product.sku}</div>` : ''}
              ${tagTemplate.showBarcode && barcodeImg ? `<div class="tag-barcode"><img src="${barcodeImg}" /></div>` : ''}
            </div>
          `);
        }
      }
      return tagsHtml.join('');
    };

    generateAllBarcodes().then(tagsHtml => {
      let html = `
        <html>
        <head>
          <title>Price Tags - Barcode Labels</title>
          <style>
            @page {
              margin: 0;
              size: 58mm auto;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 2mm;
              }
              .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 2mm;
              }
              .tag { 
                width: 52mm;
                min-height: 22mm;
                padding: 2mm;
                display: inline-block; 
                text-align: center;
                font-family: Arial, sans-serif;
                page-break-inside: avoid;
                box-sizing: border-box;
              }
              .tag-name { font-weight: bold; font-size: 10px; line-height: 1.2; margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 48mm; }
              .tag-price { font-size: 14px; font-weight: bold; color: #000; margin: 1px 0; }
              .tag-sku { font-size: 8px; color: #666; }
              .tag-barcode { margin-top: 2px; }
              .tag-barcode img { max-width: 100%; height: 25mm; }
            }
            @media screen {
              body { 
                background: #f0f0f0; 
                padding: 20px;
              }
              .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                justify-content: center;
              }
              .tag { 
                width: 52mm;
                min-height: 22mm;
                padding: 5px;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                display: inline-block; 
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .tag-name { font-weight: bold; font-size: 10px; line-height: 1.2; margin-bottom: 1px; }
              .tag-price { font-size: 14px; font-weight: bold; color: #000; margin: 1px 0; }
              .tag-sku { font-size: 8px; color: #666; }
              .tag-barcode { margin-top: 2px; }
              .tag-barcode img { max-width: 100%; height: 25mm; }
            }
          </style>
        </head>
        <body>
          <div class="tags-container">
            ${tagsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    });
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
              <button onClick={() => setShowImportModal(true)} className="btn btn-secondary" title="Import from Excel" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Upload size={16} /> Import
              </button>
              <button 
                onClick={async () => {
                  try {
                    const XLSX = await import('xlsx');
                    const exportData = products.map(p => ({
                      name: p.name,
                      sku: p.sku,
                      barcode: p.barcode || '',
                      description: p.description || '',
                      category: p.category?.name || '',
                      supplier: p.supplier?.name || '',
                      purchaseCost: p.purchaseCost,
                      sellingPrice: p.sellingPrice,
                      wholesalePrice: p.wholesalePrice || '',
                      stockQuantity: p.stockQuantity,
                      lowStockThreshold: p.lowStockThreshold,
                      reorderPoint: p.reorderPoint,
                      taxRate: p.taxRate,
                      location: p.location || '',
                      hasExpiry: p.hasExpiry,
                      expiryDate: p.expiryDate || '',
                      variant: p.variant || '',
                      variantType: p.variantType || ''
                    }));
                    
                    const worksheet = XLSX.utils.json_to_sheet(exportData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                    
                    const date = new Date().toISOString().split('T')[0];
                    XLSX.writeFile(workbook, `inventory-export-${date}.xlsx`);
                  } catch (err) {
                    console.error('Export error:', err);
                    alert('Failed to export. Please try again.');
                  }
                }} 
                className="btn btn-secondary" 
                title="Export to Excel" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Download size={16} /> Export
              </button>
              <button 
                onClick={async () => {
                  const productsWithoutBarcode = products.filter(p => !p.barcode);
                  if (productsWithoutBarcode.length === 0) {
                    alert('All products already have barcodes!');
                    return;
                  }
                  if (!confirm(`Generate barcodes for ${productsWithoutBarcode.length} products?`)) return;
                  
                  try {
                    const res = await fetch('/api/inventory?action=generateBarcodes', { method: 'PATCH' });
                    const data = await res.json();
                    if (res.ok) {
                      alert(`Generated ${data.updated} barcodes successfully!`);
                      fetchData();
                    } else {
                      alert('Failed to generate barcodes');
                    }
                  } catch (err) {
                    console.error('Generate error:', err);
                    alert('Failed to generate barcodes');
                  }
                }} 
                className="btn btn-secondary" 
                title="Generate Barcodes for products without barcodes" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Barcode size={16} /> Generate Barcodes
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
                {!isReadOnly && <th style={{ width: '70px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: index % 2 === 0 ? '#1e293b' : '#0f172a', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '0.8rem' }}>{product.name}</div>
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
        ) : (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
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
                  {!isReadOnly && (
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: '#3b82f6', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Edit"><Edit size={12} /></button>
                        <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: '#ef4444', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
                  <label className="label">Variant Type</label>
                  <select 
                    className="select" 
                    value={formData.variantType} 
                    onChange={e => setFormData({ ...formData, variantType: e.target.value, variant: '' })}
                  >
                    <option value="">No Variant</option>
                    {VARIANT_TYPES.map(vt => (
                      <option key={vt.value} value={vt.value}>{vt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Variant Value</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={formData.variant} 
                    onChange={e => setFormData({ ...formData, variant: e.target.value })} 
                    placeholder={formData.variantType ? `e.g., ${formData.variantType === 'COLOR' ? 'Red, Blue' : formData.variantType === 'SIZE' ? 'S, M, L' : 'variant'}` : 'Select variant type first'}
                    disabled={!formData.variantType}
                  />
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
        <div className="modal-overlay" onClick={() => { setShowScanner(false); stopScanner(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Barcode Scanner</h2>
              <button onClick={() => { setShowScanner(false); stopScanner(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              {!scannerActive ? (
                <button 
                  onClick={startScanner}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Camera size={20} /> Start Camera Scanner
                </button>
              ) : (
                <div id="scanner-container" style={{ width: '100%', minHeight: '200px', borderRadius: '0.5rem', overflow: 'hidden', background: '#000' }} />
              )}
            </div>
            
            <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
              Or enter barcode manually below
            </p>
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
                    else alert('Product not found');
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
                    else alert('Product not found');
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
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Number of copies per product</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={tagTemplate.copies} 
                  onChange={(e) => setTagTemplate({ ...tagTemplate, copies: parseInt(e.target.value) || 1 })}
                  style={{ 
                    width: '80px', 
                    padding: '0.5rem', 
                    background: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '0.375rem', 
                    color: '#e2e8f0',
                    fontSize: '1rem'
                  }}
                />
              </div>
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

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
          <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.5rem', maxWidth: '550px', width: '90%', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: '600' }}><Upload size={20} /> Import Products from Excel</h2>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            {!importResult ? (
              <>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '0.5rem', border: '1px dashed #475569' }}>
                  <p style={{ color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    Upload an Excel file (.xlsx) with the following columns:
                  </p>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                    name, sku, barcode, description, category, supplier, purchaseCost, sellingPrice, wholesalePrice, stockQuantity, lowStockThreshold, reorderPoint, taxRate, location, hasExpiry, expiryDate
                  </div>
                </div>
                
                <input
                  type="file"
                  accept=".xlsx"
                  id="excel-upload"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setImporting(true);
                    try {
                      const XLSX = await import('xlsx');
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data);
                      const sheetName = workbook.SheetNames[0];
                      const sheet = workbook.Sheets[sheetName];
                      const json = XLSX.utils.sheet_to_json(sheet);
                      
                      if (!json || json.length === 0) {
                        alert('No data found in the Excel file');
                        setImporting(false);
                        return;
                      }
                      
                      const res = await fetch('/api/inventory/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ products: json })
                      });
                      
                      const result = await res.json();
                      setImportResult(result);
                      if (result.success > 0) {
                        fetchData();
                      }
                    } catch (err) {
                      console.error('Import error:', err);
                      alert('Failed to import. Make sure the file is a valid Excel file.');
                    } finally {
                      setImporting(false);
                    }
                  }}
                />
                <label
                  htmlFor="excel-upload"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: importing ? '#334155' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    marginBottom: '1rem'
                  }}
                >
                  <Upload size={20} /> {importing ? 'Importing...' : 'Select Excel File'}
                </label>
                
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={async () => {
                      try {
                        const XLSX = await import('xlsx');
                        const sampleData = [
                          {
                            name: 'Sample Product 1',
                            sku: 'SKU001',
                            barcode: '1234567890123',
                            description: 'Sample product description',
                            category: 'Electronics',
                            supplier: 'Sample Supplier',
                            purchaseCost: 10000,
                            sellingPrice: 15000,
                            wholesalePrice: 12000,
                            stockQuantity: 50,
                            lowStockThreshold: 10,
                            reorderPoint: 20,
                            taxRate: 0,
                            location: 'Shelf A1',
                            hasExpiry: false,
                            expiryDate: ''
                          },
                          {
                            name: 'Sample Product 2',
                            sku: 'SKU002',
                            barcode: '1234567890124',
                            description: 'Another product',
                            category: 'Food',
                            supplier: '',
                            purchaseCost: 5000,
                            sellingPrice: 8000,
                            wholesalePrice: 6500,
                            stockQuantity: 100,
                            lowStockThreshold: 15,
                            reorderPoint: 30,
                            taxRate: 0,
                            location: 'Shelf B2',
                            hasExpiry: true,
                            expiryDate: '2026-12-31'
                          }
                        ];
                        
                        const worksheet = XLSX.utils.json_to_sheet(sampleData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                        
                        XLSX.writeFile(workbook, 'sample-import.xlsx');
                      } catch (err) {
                        console.error('Download error:', err);
                      }
                    }}
                    style={{ 
                      color: '#3b82f6', 
                      fontSize: '0.875rem', 
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Download Sample Template
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: importResult.success > 0 ? '#22c55e20' : '#0f172a',
                  borderRadius: '0.5rem',
                  border: `1px solid ${importResult.success > 0 ? '#22c55e' : '#475569'}`
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>{importResult.success}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Imported</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importResult.failed > 0 ? '#ef4444' : '#64748b' }}>{importResult.failed}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Failed</div>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#f1f5f9', marginBottom: '0.5rem' }}>Errors:</div>
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: '#ef4444', padding: '0.25rem 0' }}>{err}</div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>...and {importResult.errors.length - 10} more</div>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={() => { setImportResult(null); setShowImportModal(false); }} 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
