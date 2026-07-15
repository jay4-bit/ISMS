'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Eye, Edit, Trash2, Upload, X } from 'lucide-react';

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
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', description: '', categoryId: '', supplierId: '',
    purchaseCost: '', sellingPrice: '', wholesalePrice: '', stockQuantity: '',
    lowStockThreshold: '10', reorderPoint: '20', hasExpiry: false, expiryDate: '',
  });
  const [liquorFields, setLiquorFields] = useState({ brand: '', size: '', notes: '' });

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchSuppliers();
    const interval = setInterval(() => { fetchData(); fetchCategories(); fetchSuppliers(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  function resetForm() {
    setFormData({
      name: '', sku: '', barcode: '', description: '', categoryId: '', supplierId: '',
      purchaseCost: '', sellingPrice: '', wholesalePrice: '', stockQuantity: '',
      lowStockThreshold: '10', reorderPoint: '20', hasExpiry: false, expiryDate: '',
    });
    setLiquorFields({ brand: '', size: '', notes: '' });
  }

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
    if (!search) return true;
    const q = search.toLowerCase();
    const a: any = p;
    const lf = a.liquorFields;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (a.barcode && a.barcode.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.brand && a.brand.toLowerCase().includes(q)) ||
      (lf?.brand && lf.brand.toLowerCase().includes(q)) ||
      (lf?.liquorType && lf.liquorType.toLowerCase().includes(q)) ||
      (lf?.origin && lf.origin.toLowerCase().includes(q)) ||
      (lf?.notes && lf.notes.toLowerCase().includes(q)) ||
      (lf?.vintage && lf.vintage.toLowerCase().includes(q)) ||
      (lf?.ageStatement && lf.ageStatement.toLowerCase().includes(q))
    );
  });

  function openAddModal() {
    resetForm();
    setEditingProduct(null);
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      purchaseCost: product.purchaseCost?.toString() || '',
      sellingPrice: product.sellingPrice?.toString() || '',
      wholesalePrice: product.wholesalePrice?.toString() || '',
      stockQuantity: product.stockQuantity?.toString() || '',
      lowStockThreshold: product.lowStockThreshold?.toString() || '10',
      reorderPoint: product.reorderPoint?.toString() || '20',
      hasExpiry: product.hasExpiry || false,
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
    });
    setLiquorFields({
      brand: product.liquorFields?.brand || '',
      size: product.liquorFields?.size?.toString() || '',
      notes: product.liquorFields?.notes || '',
    });
    setEditingProduct(product);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) { alert('Product name is required'); return; }
    const payload: any = {
      ...formData,
      name,
      sku: editingProduct ? formData.sku : `LIQ-${Date.now()}`,
      purchaseCost: parseFloat(formData.purchaseCost) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
      reorderPoint: parseInt(formData.reorderPoint) || 20,
      hasExpiry: formData.hasExpiry,
      expiryDate: formData.expiryDate || null,
      brand: liquorFields.brand || undefined,
      size: liquorFields.size ? parseFloat(liquorFields.size) : undefined,
      notes: liquorFields.notes || undefined,
    };
    delete payload.sku;

    const url = '/api/liquor-inventory';
    const method = editingProduct ? 'PUT' : 'POST';
    if (editingProduct) payload.id = editingProduct.id;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      resetForm();
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

  async function handleAddSupplier() {
    if (!newSupplier.name.trim()) { alert('Supplier name is required'); return; }
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
      body: JSON.stringify(newSupplier),
    });
    if (res.ok) {
      setNewSupplier({ name: '', email: '', phone: '', address: '' });
      setShowSupplierModal(false);
      fetchSuppliers();
    } else {
      const err = await res.json();
      alert('Failed to create supplier: ' + (err.details || err.error || 'Unknown error'));
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) { alert('Category name is required'); return; }
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
      body: JSON.stringify({ name: newCategoryName }),
    });
    if (res.ok) {
      setNewCategoryName('');
      setShowCategoryModal(false);
      fetchCategories();
    } else {
      const err = await res.json();
      alert('Failed to create category: ' + (err.error || 'Unknown error'));
    }
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
    } catch {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); setEditingProduct(null); }} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Product Name *</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="select" value={formData.categoryId} onChange={e => {
                    if (e.target.value === '__add_new__') { setShowCategoryModal(true); }
                    else { setFormData({ ...formData, categoryId: e.target.value }); }
                  }} required>
                    <option value="">Select category</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Size (ml)</label>
                  <input type="number" className="input" value={liquorFields.size} onChange={e => setLiquorFields({ ...liquorFields, size: e.target.value })} placeholder="e.g., 750" />
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select className="select" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} style={{ flex: 1 }}>
                      <option value="">Select supplier</option>
                      {Array.from(new Map(suppliers.map(s => [s.id, s])).values()).sort((a, b) => a.name.localeCompare(b.name)).map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                    </select>
                    <button type="button" onClick={() => setShowSupplierModal(true)} style={{ padding: '0.4rem 0.6rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.4rem', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>+ New</button>
                  </div>
                </div>
                <div>
                  <label className="label">Barcode</label>
                  <input type="text" className="input" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Cost Price *</label>
                  <input type="number" step="0.01" min="0" className="input" value={formData.purchaseCost} onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Selling Price *</label>
                  <input type="number" step="0.01" min="0" className="input" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Wholesale Price</label>
                  <input type="number" step="0.01" min="0" className="input" value={formData.wholesalePrice} onChange={e => setFormData({ ...formData, wholesalePrice: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Stock Quantity</label>
                  <input type="number" className="input" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Min Stock Level</label>
                  <input type="number" className="input" value={formData.lowStockThreshold} onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                </div>
                <div>
                  <label className="label">Reorder Point</label>
                  <input type="number" className="input" value={formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--foreground)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.hasExpiry} onChange={e => { setFormData(prev => ({ ...prev, hasExpiry: e.target.checked, expiryDate: e.target.checked ? prev.expiryDate : '' })); }} />
                  <span>Has expiry date</span>
                </label>
              </div>
              {formData.hasExpiry && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); setEditingProduct(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Add Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><label className="label">Name *</label><input type="text" className="input" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} /></div>
              <div><label className="label">Phone</label><input type="text" className="input" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} /></div>
              <div><label className="label">Address</label><input type="text" className="input" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} /></div>
              <button onClick={handleAddSupplier} className="btn btn-primary">Add Supplier</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Add Category</h2>
              <button onClick={() => setShowCategoryModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><label className="label">Category Name *</label><input type="text" className="input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} /></div>
              <button onClick={handleAddCategory} className="btn btn-primary">Add Category</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewingProduct && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{viewingProduct.name}</h2>
              <button onClick={() => { setShowViewModal(false); setViewingProduct(null); }} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {viewingProduct.liquorFields && (
                <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                  <h3 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Liquor Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Brand</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.brand || '-'}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Size</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.size ? `${viewingProduct.liquorFields.size}ml` : '-'}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>Volume</div><div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.volume ? `${viewingProduct.liquorFields.volume}ml` : '-'}</div></div>
                  </div>
                </div>
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
              <button onClick={() => { setShowImportModal(false); setImportData(''); setImportResult(null); }} style={styles.closeBtn}><X size={18} /></button>
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
                    const ExcelJS = await import('exceljs');
                    const data = await file.arrayBuffer();
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(data);
                    const sheet = workbook.worksheets[0];
                    const json: Record<string, unknown>[] = [];
                    sheet.eachRow((row, rowNumber) => {
                      if (rowNumber === 1) return;
                      const rowData: Record<string, unknown> = {};
                      row.eachCell((cell, colNumber) => {
                        rowData[sheet.getRow(1).getCell(colNumber).value as string] = cell.value;
                      });
                      json.push(rowData);
                    });
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
                    const ExcelJS = await import('exceljs');
                    const sampleData = [
                      { 'Product Name': 'Johnnie Walker Red', 'Category': 'Whiskey', 'Size (ml)': 750, 'Supplier': 'Distributor A', 'Barcode': '', 'Cost Price': 15000, 'Selling Price': 35000, 'Wholesale Price': 30000, 'Stock Quantity': 20, 'Min Stock Level': 10, 'Reorder Point': 15, 'Expiry Date': '' },
                      { 'Product Name': 'Heineken Lager', 'Category': 'Beer', 'Size (ml)': 330, 'Supplier': 'Distributor B', 'Barcode': '8712000012344', 'Cost Price': 3500, 'Selling Price': 5000, 'Wholesale Price': 4000, 'Stock Quantity': 120, 'Min Stock Level': 20, 'Reorder Point': 40, 'Expiry Date': '2026-12-31' },
                    ];
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Products');
                    worksheet.columns = Object.keys(sampleData[0]).map(key => ({ header: key, key }));
                    worksheet.addRows(sampleData);
                    await workbook.xlsx.writeFile('sample-liquor-import.xlsx');
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
    width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto',
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
