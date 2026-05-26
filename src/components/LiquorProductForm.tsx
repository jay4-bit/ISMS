'use client';

import { useState, useEffect, useMemo } from 'react';

const LIQUOR_CATEGORIES = [
  'Whisky', 'Whiskey', 'Beer', 'Wine', 'Vodka', 'Gin', 'Rum', 'Brandy',
  'Champagne', 'Spirits', 'Liqueur', 'Tequila', 'Cider', 'Sake',
  'Cocktail Mixers', 'Accessories', 'Fortified Wine', 'Vermouth'
];

interface LiquorProductFormProps {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function LiquorProductForm({ categories, suppliers, onSubmit, initialData }: LiquorProductFormProps) {
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) map[cat.name] = cat.id;
    return map;
  }, [categories]);

  const [formData, setFormData] = useState({
    name: '',
    categoryName: '',
    barcode: '',
    supplierId: '',
    purchaseCost: '',
    sellingPrice: '',
    wholesalePrice: '',
    stockQuantity: '',
    lowStockThreshold: '10',
    reorderPoint: '20',
    hasExpiry: false,
    expiryDate: '',
    size: '',
  });

  useEffect(() => {
    if (initialData) {
      const cat = categories.find(c => c.id === initialData.categoryId);
      setFormData({
        name: initialData.name || '',
        categoryName: cat?.name || '',
        barcode: initialData.barcode || '',
        supplierId: initialData.supplierId || '',
        purchaseCost: initialData.purchaseCost?.toString() || '',
        sellingPrice: initialData.sellingPrice?.toString() || '',
        wholesalePrice: initialData.wholesalePrice?.toString() || '',
        stockQuantity: initialData.stockQuantity?.toString() || '',
        lowStockThreshold: initialData.lowStockThreshold?.toString() || '10',
        reorderPoint: initialData.reorderPoint?.toString() || '20',
        hasExpiry: initialData.hasExpiry || false,
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : '',
        size: initialData.liquorFields?.size?.toString() || initialData.size?.toString() || '',
      });
    }
  }, [initialData, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'hasExpiry' && !checked) {
      setFormData(prev => ({ ...prev, hasExpiry: false, expiryDate: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catId = categoryMap[formData.categoryName] || null;
    onSubmit({
      ...formData,
      sku: initialData?.sku || `LIQ-${Date.now()}`,
      categoryId: catId || '',
      categoryName: catId ? undefined : formData.categoryName || undefined,
      purchaseCost: parseFloat(formData.purchaseCost) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
      reorderPoint: parseInt(formData.reorderPoint) || 20,
      size: formData.size ? parseFloat(formData.size) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basic Information</h3>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Product Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select name="categoryName" value={formData.categoryName} onChange={handleChange} style={styles.select}>
              <option value="">Select category</option>
              {LIQUOR_CATEGORIES.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Size (ml)</label>
            <input type="number" name="size" value={formData.size} onChange={handleChange} style={styles.input} placeholder="e.g., 750" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Supplier</label>
            <select name="supplierId" value={formData.supplierId} onChange={handleChange} style={styles.select}>
              <option value="">Select supplier</option>
              {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Barcode</label>
            <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} style={styles.input} placeholder="Scan or enter barcode" />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pricing</h3>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Cost Price *</label>
            <input type="number" name="purchaseCost" value={formData.purchaseCost} onChange={handleChange} style={styles.input} step="0.01" min="0" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Selling Price *</label>
            <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} style={styles.input} step="0.01" min="0" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Wholesale Price</label>
            <input type="number" name="wholesalePrice" value={formData.wholesalePrice} onChange={handleChange} style={styles.input} step="0.01" min="0" />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Stock & Inventory</h3>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Stock Quantity</label>
            <input type="number" name="stockQuantity" value={formData.stockQuantity} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Min Stock Level</label>
            <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reorder Point</label>
            <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} style={styles.input} />
          </div>
        </div>
        <div style={styles.checkboxRow}>
          <label style={styles.checkbox}>
            <input type="checkbox" name="hasExpiry" checked={formData.hasExpiry} onChange={handleChange} />
            <span>Has expiry date</span>
          </label>
        </div>
        {formData.hasExpiry && (
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Expiry Date</label>
              <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} style={styles.input} />
            </div>
          </div>
        )}
      </div>

      <button type="submit" style={styles.submitButton}>
        {initialData ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  section: { background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #334155' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '1rem' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8' },
  input: { padding: '0.625rem 0.875rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { padding: '0.625rem 0.875rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  checkboxRow: { display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#e2e8f0', cursor: 'pointer' },
  submitButton: { padding: '0.875rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
};
