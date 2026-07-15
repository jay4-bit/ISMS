'use client';

import { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface ProductData {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  supplierId: string;
  purchaseCost: string;
  sellingPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  brandName: string;
  genericName: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  dosage: string;
  composition: string;
  manufacturer: string;
  prescriptionRequired: boolean;
  requiresColdStorage: boolean;
  drugSchedule: string;
  storageInstructions: string;
  sideEffects: string;
}

interface PharmacyProductFormProps {
  shopId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editProduct?: any;
}

export default function PharmacyProductForm({ shopId, onSuccess, onCancel, editProduct }: PharmacyProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ProductData>({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    supplierId: '',
    purchaseCost: '',
    sellingPrice: '',
    stockQuantity: '',
    lowStockThreshold: '10',
    brandName: '',
    genericName: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    dosage: '',
    composition: '',
    manufacturer: '',
    prescriptionRequired: false,
    requiresColdStorage: false,
    drugSchedule: '',
    storageInstructions: '',
    sideEffects: '',
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: { 'x-shop-id': shopId }
      });
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (editProduct) {
      setFormData({
        name: editProduct.name || '',
        sku: editProduct.sku || '',
        barcode: editProduct.barcode || '',
        categoryId: editProduct.categoryId || '',
        supplierId: editProduct.supplierId || '',
        purchaseCost: editProduct.purchaseCost?.toString() || '',
        sellingPrice: editProduct.sellingPrice?.toString() || '',
        stockQuantity: editProduct.stockQuantity?.toString() || '',
        lowStockThreshold: editProduct.lowStockThreshold?.toString() || '10',
        brandName: editProduct.pharmacyFields?.brandName || '',
        genericName: editProduct.pharmacyFields?.genericName || '',
        batchNumber: editProduct.pharmacyFields?.batchNumber || '',
        manufacturingDate: editProduct.pharmacyFields?.manufacturingDate?.split('T')[0] || '',
        expiryDate: editProduct.pharmacyFields?.expiryDate?.split('T')[0] || '',
        dosage: editProduct.pharmacyFields?.dosage || '',
        composition: editProduct.pharmacyFields?.composition || '',
        manufacturer: editProduct.pharmacyFields?.manufacturer || '',
        prescriptionRequired: editProduct.pharmacyFields?.prescriptionRequired || false,
        requiresColdStorage: editProduct.pharmacyFields?.requiresColdStorage || false,
        drugSchedule: editProduct.pharmacyFields?.drugSchedule || '',
        storageInstructions: editProduct.pharmacyFields?.storageInstructions || '',
        sideEffects: editProduct.pharmacyFields?.sideEffects || '',
      });
    }
  }, [editProduct]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = editProduct ? `/api/inventory?id=${editProduct.id}` : '/api/inventory';
      const method = editProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku || undefined,
          categoryId: formData.categoryId,
          purchaseCost: parseFloat(formData.purchaseCost) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          stockQuantity: parseInt(formData.stockQuantity) || 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
          expiryDate: formData.expiryDate || undefined,
          hasExpiry: !!formData.expiryDate,
          brandName: formData.brandName || undefined,
          genericName: formData.genericName || undefined,
          batchNumber: formData.batchNumber || undefined,
          manufacturingDate: formData.manufacturingDate || undefined,
          dosage: formData.dosage || undefined,
          composition: formData.composition || undefined,
          manufacturer: formData.manufacturer || undefined,
          prescriptionRequired: formData.prescriptionRequired,
          requiresColdStorage: formData.requiresColdStorage,
          drugSchedule: formData.drugSchedule || undefined,
          storageInstructions: formData.storageInstructions || undefined,
          sideEffects: formData.sideEffects || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save product');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Package size={24} color="white" />
          </div>
          <div>
            <h2 style={styles.title}>{editProduct ? 'Edit Medicine' : 'Add New Medicine'}</h2>
            <p style={styles.subtitle}>Pharmacy Inventory Management</p>
          </div>
          <button onClick={onCancel} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            <Check size={18} />
            Product saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Basic Information</h3>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Medicine Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., Panadol Extra"
                  required
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Category *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Brand Name</label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., GSK, Pfizer"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Generic Name</label>
                <input
                  type="text"
                  name="genericName"
                  value={formData.genericName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., Paracetamol"
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Manufacturer</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Manufacturing company"
                />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Medicine Details</h3>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Dosage</label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., 500mg"
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Composition</label>
                <input
                  type="text"
                  name="composition"
                  value={formData.composition}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Active ingredients"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Batch Number</label>
                <input
                  type="text"
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., BTH2024001"
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Drug Schedule</label>
                <select
                  name="drugSchedule"
                  value={formData.drugSchedule}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">Select schedule</option>
                  <option value="OTC">OTC - Over The Counter</option>
                  <option value="POM">POM - Prescription Only</option>
                  <option value="P">P - Pharmacy Only</option>
                  <option value="GSL">GSL - General Sales List</option>
                </select>
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Dates & Pricing</h3>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Manufacturing Date</label>
                <input
                  type="date"
                  name="manufacturingDate"
                  value={formData.manufacturingDate}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Buying Price (TSh) *</label>
                <input
                  type="number"
                  name="purchaseCost"
                  value={formData.purchaseCost}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Selling Price (TSh) *</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Quantity *</label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="0"
                  required
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Low Stock Alert</label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Additional Information</h3>
            
            <div style={styles.checkboxRow}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  name="prescriptionRequired"
                  checked={formData.prescriptionRequired}
                  onChange={handleChange}
                />
                <span>Requires Prescription</span>
              </label>
              
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  name="requiresColdStorage"
                  checked={formData.requiresColdStorage}
                  onChange={handleChange}
                />
                <span>Requires Cold Storage</span>
              </label>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Storage Instructions</label>
              <textarea
                name="storageInstructions"
                value={formData.storageInstructions}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="How to store this medicine"
                rows={2}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Side Effects</label>
              <textarea
                name="sideEffects"
                value={formData.sideEffects}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Known side effects"
                rows={2}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Saving...' : editProduct ? 'Update Medicine' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    background: '#1e293b',
    borderRadius: '1rem',
    border: '1px solid #334155',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
    borderBottom: '1px solid #334155',
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '0.75rem',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#f1f5f9',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '0.875rem',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'rgba(34, 197, 94, 0.1)',
    borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
    fontSize: '0.875rem',
  },
  form: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
  },
  formSection: {
    marginBottom: '1.5rem',
    padding: '1.25rem',
    background: '#0f172a',
    borderRadius: '0.75rem',
    border: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #334155',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#94a3b8',
  },
  input: {
    padding: '0.625rem 0.875rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '0.625rem 0.875rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    padding: '0.625rem 0.875rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
  },
  checkboxRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1.5rem',
    marginBottom: '1rem',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    padding: '1.5rem',
    borderTop: '1px solid #334155',
    background: '#0f172a',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: '0.5rem',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    border: 'none',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};