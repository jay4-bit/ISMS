'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LiquorProductForm from '@/components/LiquorProductForm';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Eye, Edit, Trash2, Upload, Hash } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string } | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  hasExpiry: boolean;
  expiryDate: string | null;
  taxRate: number;
  location: string | null;
  isFaulty: boolean;
  liquorFields: {
    brand: string | null;
    size: number | null;
    volume: number | null;
    liquorType: string | null;
    vintage: string | null;
    origin: string | null;
    alcoholPercentage: number | null;
    requiresLiquorLicense: boolean | null;
    ageStatement: string | null;
    notes: string | null;
  } | null;
}

interface Category { id: string; name: string; }
interface Supplier { id: string; name: string; }

export default function LiquorInventoryPage() {
  const { shop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchSuppliers();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/liquor-inventory', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const json = await res.json();
      setProducts(json.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async function fetchSuppliers() {
    try {
      const res = await fetch('/api/suppliers', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return !search ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.liquorFields?.brand && p.liquorFields.brand.toLowerCase().includes(q));
  });

  function openAddModal() {
    setEditingProduct(null);
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setShowModal(true);
  }

  async function handleSubmit(formData: any) {
    const url = '/api/liquor-inventory';
    const method = editingProduct ? 'PUT' : 'POST';
    const body = editingProduct ? { ...formData, id: editingProduct.id } : formData;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowModal(false);
      setEditingProduct(null);
      fetchData();
      fetchCategories();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to save product');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    const res = await fetch(`/api/liquor-inventory?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-shop-id': shop?.id || '' }
    });
    if (res.ok) fetchData();
  }

  async function handleImport() {
    try {
      setImporting(true);
      const rows = importData.trim().split('\n').filter(r => r.trim());
      const products = rows.map(row => {
        const cols = row.split('\t');
        return {
          name: cols[0]?.trim(),
          category: cols[1]?.trim(),
          size: cols[2]?.trim(),
          supplier: cols[3]?.trim(),
          barcode: cols[4]?.trim(),
          purchaseCost: cols[5]?.trim(),
          sellingPrice: cols[6]?.trim(),
          wholesalePrice: cols[7]?.trim(),
          stockQuantity: cols[8]?.trim(),
          lowStockThreshold: cols[9]?.trim(),
          reorderPoint: cols[10]?.trim(),
        };
      });

      const res = await fetch('/api/liquor-inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ products }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.success > 0) { fetchData(); fetchCategories(); }
    } catch (err) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>Loading...</div>;
  }

  return (
    <div className="liquor-inventory-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Liquor Inventory</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{products.length} products</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowImportModal(true)} className="import-btn btn btn-secondary">
            <Upload size={16} /> Import
          </button>
          <button onClick={openAddModal} className="add-btn btn btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search products, brand, barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="liquor-inventory-table-wrap" style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ width: '200px', padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
              <th style={{ width: '130px', padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>CATEGORY</th>
              <th style={{ width: '80px', padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>SIZE (ml)</th>
              <th style={{ width: '110px', padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>COST PRICE</th>
              <th style={{ width: '110px', padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>SELLING PRICE</th>
              <th style={{ width: '70px', padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>STOCK</th>
              <th style={{ width: '100px', padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, idx) => (
              <tr key={product.id} style={{ background: idx % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                <td style={{ padding: '0.75rem', fontWeight: '500', color: '#f1f5f9' }}>{product.name}</td>
                <td style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>{['Whisky','Whiskey','Beer','Wine','Vodka','Gin','Rum','Brandy','Champagne','Spirits','Liqueur','Tequila','Cider','Sake','Cocktail Mixers','Accessories','Fortified Wine','Vermouth'].includes(product.category?.name||'') ? product.category!.name : '-'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>{product.liquorFields?.size ? `${product.liquorFields.size}ml` : '-'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatCurrency(product.purchaseCost)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#22c55e', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatCurrency(product.sellingPrice)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    fontWeight: '600', fontSize: '0.75rem',
                    color: product.stockQuantity <= product.lowStockThreshold ? '#f59e0b' : product.stockQuantity === 0 ? '#ef4444' : '#f1f5f9'
                  }}>
                    {product.stockQuantity}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }}
                      className="view-btn"
                      style={{ padding: '0.3rem', background: '#64748b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="View">
                      <Eye size={12} />
                    </button>
                    <button onClick={() => openEditModal(product)}
                      className="edit-btn"
                      style={{ padding: '0.3rem', background: '#3b82f6', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Edit">
                      <Edit size={12} />
                    </button>
                    <button onClick={() => handleDelete(product.id)}
                      className="delete-btn"
                      style={{ padding: '0.3rem', background: '#ef4444', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => { setShowModal(false); setEditingProduct(null); }} style={styles.closeBtn}>✕</button>
            </div>
            <LiquorProductForm
              categories={categories}
              suppliers={suppliers}
              onSubmit={handleSubmit}
              initialData={editingProduct}
            />
          </div>
        </div>
      )}

      {showViewModal && viewingProduct && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{viewingProduct.name}</h2>
              <button onClick={() => { setShowViewModal(false); setViewingProduct(null); }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              </div>
              {viewingProduct.liquorFields && (
                <>
                  <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                    <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Liquor Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Brand</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.brand || '-'}</div></div>
                      <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Size</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.size ? `${viewingProduct.liquorFields.size}ml` : '-'}</div></div>
                      <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Volume</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.volume ? `${viewingProduct.liquorFields.volume}ml` : '-'}</div></div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Cost Price</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{formatCurrency(viewingProduct.purchaseCost)}</div></div>
                <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Selling Price</div><div style={{ color: '#22c55e', fontSize: '0.85rem' }}>{formatCurrency(viewingProduct.sellingPrice)}</div></div>
                <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Stock</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.stockQuantity}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Import Products</h2>
              <button onClick={() => { setShowImportModal(false); setImportData(''); setImportResult(null); }} style={styles.closeBtn}>✕</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Paste tab-separated data or upload an Excel file (columns: Product Name, Category, Size (ml), Supplier, Barcode, Cost Price, Selling Price, Wholesale Price, Stock Quantity, Min Stock Level, Reorder Point, Expiry Date)
            </p>
            <textarea
              value={importData}
              onChange={e => setImportData(e.target.value)}
              style={{ ...styles.textarea, minHeight: '160px' }}
              placeholder="Johnnie Walker Red&#009;Whiskey&#009;750&#009;Distributor A&#009;&#009;15000&#009;35000&#009;30000&#009;20&#009;10&#009;15"
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <input
                type="file"
                accept=".xlsx"
                id="liquor-excel-upload"
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
                    const fieldMap: Record<string, string> = {
                      'Product Name': 'name',
                      'Category': 'category',
                      'Size (ml)': 'size',
                      'Supplier': 'supplier',
                      'Barcode': 'barcode',
                      'Cost Price': 'purchaseCost',
                      'Selling Price': 'sellingPrice',
                      'Wholesale Price': 'wholesalePrice',
                      'Stock Quantity': 'stockQuantity',
                      'Min Stock Level': 'lowStockThreshold',
                      'Reorder Point': 'reorderPoint',
                      'Expiry Date': 'expiryDate',
                    };
                    const normalized = json.map((row: any) => {
                      const obj: any = {};
                      for (const key of Object.keys(row)) {
                        const mapped = fieldMap[key] || key;
                        obj[mapped] = row[key];
                      }
                      return obj;
                    });
                    const res = await fetch('/api/liquor-inventory/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
                      body: JSON.stringify({ products: normalized })
                    });
                    const result = await res.json();
                    setImportResult(result);
                    if (result.success > 0) { fetchData(); fetchCategories(); }
                  } catch (err) {
                    console.error('Import error:', err);
                    alert('Failed to import. Make sure the file is a valid Excel file.');
                  } finally {
                    setImporting(false);
                  }
                }}
              />
              <label
                htmlFor="liquor-excel-upload"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  background: importing ? '#334155' : '#2563eb',
                  borderRadius: '0.4rem', color: 'white', cursor: importing ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap'
                }}
              >
                <Upload size={16} /> {importing ? 'Importing...' : 'Upload Excel'}
              </label>
              <button
                onClick={async () => {
                  try {
                    const XLSX = await import('xlsx');
                    const sampleData = [
                      { 'Product Name': 'Johnnie Walker Red', 'Category': 'Whiskey', 'Size (ml)': 750, 'Supplier': 'Distributor A', 'Barcode': '', 'Cost Price': 15000, 'Selling Price': 35000, 'Wholesale Price': 30000, 'Stock Quantity': 20, 'Min Stock Level': 10, 'Reorder Point': 15, 'Expiry Date': '' },
                      { 'Product Name': 'Heineken Lager', 'Category': 'Beer', 'Size (ml)': 330, 'Supplier': 'Distributor B', 'Barcode': '8712000012344', 'Cost Price': 3500, 'Selling Price': 5000, 'Wholesale Price': 4000, 'Stock Quantity': 120, 'Min Stock Level': 20, 'Reorder Point': 40, 'Expiry Date': '2026-12-31' },
                    ];
                    const worksheet = XLSX.utils.json_to_sheet(sampleData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                    XLSX.writeFile(workbook, 'sample-liquor-import.xlsx');
                  } catch (err) { console.error('Download error:', err); }
                }}
                style={{
                  color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'underline',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Download Sample
              </button>
              <button onClick={handleImport} className="btn btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} disabled={importing || !importData.trim()}>
                {importing ? 'Importing...' : 'Import Text'}
              </button>
              {importResult && (
                <span style={{ color: importResult.failed > 0 ? '#f59e0b' : '#22c55e', fontSize: '0.85rem' }}>
                  {importResult.success} imported, {importResult.failed} failed
                </span>
              )}
            </div>
            {importResult?.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: '0.75rem', color: '#ef4444', fontSize: '0.8rem' }}>
                {importResult.errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: '1000', padding: '1rem',
  },
  modal: {
    background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem',
    width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
    border: '1px solid #334155',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem',
    cursor: 'pointer', padding: '0.25rem',
  },
  textarea: {
    width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155',
    borderRadius: '0.5rem', color: '#f1f5f9', fontSize: '0.85rem',
    fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
  },
};
