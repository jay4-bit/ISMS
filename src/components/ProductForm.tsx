'use client';

import { useState } from 'react';

interface ProductFormProps {
  shopType: string;
  categories: any[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function ProductForm({ shopType, categories, onSubmit, initialData }: ProductFormProps) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    purchaseCost: '',
    sellingPrice: '',
    wholesalePrice: '',
    stockQuantity: '',
    lowStockThreshold: '10',
    hasExpiry: false,
    expiryDate: '',
    hasSerialNumber: false,
    location: '',
  });

  const [specificFields, setSpecificFields] = useState<Record<string, any>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSpecificChange = (name: string, value: any) => {
    setSpecificFields(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      purchaseCost: parseFloat(formData.purchaseCost) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      wholesalePrice: parseFloat(formData.wholesalePrice) || undefined,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
      ...specificFields
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basic Information</h3>
        
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>SKU *</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              style={styles.input}
              placeholder="Auto-generated if empty"
              required
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
            <label style={styles.label}>Barcode</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            style={styles.textarea}
            rows={3}
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pricing</h3>
        
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Purchase Cost *</label>
            <input
              type="number"
              name="purchaseCost"
              value={formData.purchaseCost}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
              required
            />
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>Selling Price *</label>
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
              required
            />
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>Wholesale Price</label>
            <input
              type="number"
              name="wholesalePrice"
              value={formData.wholesalePrice}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Stock & Inventory</h3>
        
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Initial Stock *</label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              style={styles.input}
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
            />
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              style={styles.input}
              placeholder="e.g., Shelf A1"
            />
          </div>
        </div>

        <div style={styles.checkboxRow}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="hasExpiry"
              checked={formData.hasExpiry}
              onChange={handleChange}
            />
            <span>Product has expiry date</span>
          </label>
          
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="hasSerialNumber"
              checked={formData.hasSerialNumber}
              onChange={handleChange}
            />
            <span>Track serial numbers</span>
          </label>
        </div>

        {formData.hasExpiry && (
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
        )}
      </div>

      {shopType === 'PHARMACY' && <PharmacyFields onChange={handleSpecificChange} values={specificFields} />}
      {shopType === 'ELECTRONICS' && <ElectronicsFields onChange={handleSpecificChange} values={specificFields} />}
      {shopType === 'CLOTHING' && <ClothingFields onChange={handleSpecificChange} values={specificFields} />}

      <button type="submit" style={styles.submitButton}>
        {initialData ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );
}

function PharmacyFields({ onChange, values }: { onChange: (name: string, value: any) => void; values: any }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>💊 Pharmacy Details</h3>
      
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Dosage</label>
          <input
            type="text"
            value={values.dosage || ''}
            onChange={(e) => onChange('dosage', e.target.value)}
            style={styles.input}
            placeholder="e.g., 500mg"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Composition</label>
          <input
            type="text"
            value={values.composition || ''}
            onChange={(e) => onChange('composition', e.target.value)}
            style={styles.input}
            placeholder="Active ingredients"
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Manufacturer</label>
          <input
            type="text"
            value={values.manufacturer || ''}
            onChange={(e) => onChange('manufacturer', e.target.value)}
            style={styles.input}
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Batch Number</label>
          <input
            type="text"
            value={values.batchNumber || ''}
            onChange={(e) => onChange('batchNumber', e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.checkboxRow}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={values.prescriptionRequired || false}
            onChange={(e) => onChange('prescriptionRequired', e.target.checked)}
          />
          <span>Requires Prescription</span>
        </label>
        
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={values.requiresColdStorage || false}
            onChange={(e) => onChange('requiresColdStorage', e.target.checked)}
          />
          <span>Requires Cold Storage</span>
        </label>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Drug Schedule</label>
        <select
          value={values.drugSchedule || ''}
          onChange={(e) => onChange('drugSchedule', e.target.value)}
          style={styles.select}
        >
          <option value="">Select schedule</option>
          <option value="OTC">OTC (Over the Counter)</option>
          <option value="POM">POM (Prescription Only Medicine)</option>
          <option value="P">Pharmacy Only</option>
          <option value="GSL">General Sales List</option>
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Storage Instructions</label>
        <textarea
          value={values.storageInstructions || ''}
          onChange={(e) => onChange('storageInstructions', e.target.value)}
          style={styles.textarea}
          placeholder="How to store this medication"
          rows={2}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Side Effects</label>
        <textarea
          value={values.sideEffects || ''}
          onChange={(e) => onChange('sideEffects', e.target.value)}
          style={styles.textarea}
          rows={2}
        />
      </div>
    </div>
  );
}

function ElectronicsFields({ onChange, values }: { onChange: (name: string, value: any) => void; values: any }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>📱 Electronics Details</h3>
      
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Brand</label>
          <input
            type="text"
            value={values.brand || ''}
            onChange={(e) => onChange('brand', e.target.value)}
            style={styles.input}
            placeholder="e.g., Samsung"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Model</label>
          <input
            type="text"
            value={values.model || ''}
            onChange={(e) => onChange('model', e.target.value)}
            style={styles.input}
            placeholder="e.g., Galaxy S24"
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Warranty</label>
          <select
            value={values.warranty || ''}
            onChange={(e) => onChange('warranty', e.target.value)}
            style={styles.select}
          >
            <option value="">Select warranty</option>
            <option value="NONE">No Warranty</option>
            <option value="3MONTHS">3 Months</option>
            <option value="6MONTHS">6 Months</option>
            <option value="1YEAR">1 Year</option>
            <option value="2YEARS">2 Years</option>
          </select>
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Voltage</label>
          <input
            type="text"
            value={values.voltage || ''}
            onChange={(e) => onChange('voltage', e.target.value)}
            style={styles.input}
            placeholder="e.g., 220V"
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Wattage</label>
          <input
            type="number"
            value={values.wattage || ''}
            onChange={(e) => onChange('wattage', parseFloat(e.target.value))}
            style={styles.input}
            placeholder="e.g., 65"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Color</label>
          <input
            type="text"
            value={values.color || ''}
            onChange={(e) => onChange('color', e.target.value)}
            style={styles.input}
            placeholder="e.g., Black"
          />
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Specifications</label>
        <textarea
          value={values.specifications || ''}
          onChange={(e) => onChange('specifications', e.target.value)}
          style={styles.textarea}
          placeholder="Technical specifications"
          rows={3}
        />
      </div>
    </div>
  );
}

function ClothingFields({ onChange, values }: { onChange: (name: string, value: any) => void; values: any }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>👕 Clothing Details</h3>
      
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Size</label>
          <input
            type="text"
            value={values.size || ''}
            onChange={(e) => onChange('size', e.target.value)}
            style={styles.input}
            placeholder="e.g., M, L, XL"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Color</label>
          <input
            type="text"
            value={values.color || ''}
            onChange={(e) => onChange('color', e.target.value)}
            style={styles.input}
            placeholder="e.g., Blue"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Material</label>
          <input
            type="text"
            value={values.material || ''}
            onChange={(e) => onChange('material', e.target.value)}
            style={styles.input}
            placeholder="e.g., Cotton"
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Brand</label>
          <input
            type="text"
            value={values.brand || ''}
            onChange={(e) => onChange('brand', e.target.value)}
            style={styles.input}
            placeholder="e.g., Nike"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Season</label>
          <select
            value={values.season || ''}
            onChange={(e) => onChange('season', e.target.value)}
            style={styles.select}
          >
            <option value="">Select season</option>
            <option value="SUMMER">Summer</option>
            <option value="WINTER">Winter</option>
            <option value="SPRING">Spring</option>
            <option value="AUTUMN">Autumn</option>
            <option value="ALL_SEASON">All Season</option>
          </select>
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Gender</label>
          <select
            value={values.gender || ''}
            onChange={(e) => onChange('gender', e.target.value)}
            style={styles.select}
          >
            <option value="">Select gender</option>
            <option value="MALE">Men</option>
            <option value="FEMALE">Women</option>
            <option value="UNISEX">Unisex</option>
            <option value="KIDS">Kids</option>
          </select>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Pattern</label>
        <select
          value={values.pattern || ''}
          onChange={(e) => onChange('pattern', e.target.value)}
          style={styles.select}
        >
          <option value="">Select pattern</option>
          <option value="SOLID">Solid</option>
          <option value="STRIPED">Striped</option>
          <option value="CHECKERED">Checkered</option>
          <option value="PRINTED">Printed</option>
          <option value="PLAIN">Plain</option>
        </select>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  section: {
    background: '#1e293b',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '1rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
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
    background: '#0f172a',
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
    background: '#0f172a',
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
    background: '#0f172a',
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
    marginTop: '0.5rem',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};