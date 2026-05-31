'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Check, Smartphone, Package, Trash2, UserPlus, Camera } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

const scanBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0.5rem', background: 'var(--secondary)',
  border: '1px solid #475569', borderRadius: '0.4rem',
  color: 'var(--foreground)', cursor: 'pointer',
};

interface Supplier {
  id: string;
  name: string;
}

interface Shop {
  id: string;
}

// ============== PHONE FORM ==============

interface ElectronicsPhoneFormProps {
  suppliers: Supplier[];
  shop: Shop | null;
  phoneBrands: string[];
  setPhoneBrands: (brands: string[]) => void;
  phoneCondition: string;
  setPhoneCondition: (c: string) => void;
  phoneBrand: string;
  setPhoneBrand: (b: string) => void;
  phoneBrandInput: string;
  setPhoneBrandInput: (b: string) => void;
  phoneModel: string;
  setPhoneModel: (m: string) => void;
  phoneQuantity: number;
  setPhoneQuantity: (q: number) => void;
  phoneColor: string;
  setPhoneColor: (c: string) => void;
  phoneStorage: string;
  setPhoneStorage: (s: string) => void;
  phoneImei: string;
  setPhoneImei: (i: string) => void;
  registeredPhones: any[];
  setRegisteredPhones: (phones: any[]) => void;
  currentPhoneIndex: number;
  setCurrentPhoneIndex: (i: number) => void;
  formData: any;
  setFormData: (f: any) => void;
  onCancel: () => void;
  onSuccess: () => void;
  editingProduct?: any;
}

export function ElectronicsPhoneForm({
  suppliers, shop, phoneBrands, setPhoneBrands, phoneCondition, setPhoneCondition,
  phoneBrand, setPhoneBrand, phoneBrandInput, setPhoneBrandInput,
  phoneModel, setPhoneModel, phoneQuantity, setPhoneQuantity,
  phoneColor, setPhoneColor, phoneStorage, setPhoneStorage, phoneImei, setPhoneImei,
  registeredPhones, setRegisteredPhones, currentPhoneIndex, setCurrentPhoneIndex,
  formData, setFormData, onCancel, onSuccess, editingProduct
}: ElectronicsPhoneFormProps) {
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '' });
  const [currentModelEntries, setCurrentModelEntries] = useState<{ color: string; storage: string; imei: string }[]>([]);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setPurchaseCost(editingProduct.purchaseCost?.toString() || '');
      setSellingPrice(editingProduct.sellingPrice?.toString() || '');
      setWholesalePrice(editingProduct.wholesalePrice?.toString() || '');
      setSelectedSupplier(editingProduct.supplierId || '');
      const ef = editingProduct.electronicsFields;
      if (ef) {
        setPhoneBrand(ef.brand || '');
        setPhoneModel(ef.model || '');
        setPhoneCondition(ef.condition || '');
        setPhoneColor(ef.color || '');
        setPhoneStorage(ef.storage || '');
        setPhoneImei(ef.imei || '');
      }
    }
  }, [editingProduct]);

  const resetForm = () => {
    setPhoneCondition('');
    setPhoneBrand('');
    setPhoneBrandInput('');
    setPhoneModel('');
    setPhoneQuantity(1);
    setPhoneColor('');
    setPhoneStorage('');
    setPhoneImei('');
    setCurrentModelEntries([]);
    setPurchaseCost('');
    setSellingPrice('');
    setWholesalePrice('');
    setSelectedSupplier('');
  };

  const handleAddPhone = async () => {
    if (!selectedSupplier) { alert('Please select a supplier'); return; }
    if (!phoneBrand && !phoneBrandInput) { alert('Please select or enter a brand'); return; }
    if (!phoneModel) { alert('Please enter model'); return; }

    const brandName = phoneBrand || phoneBrandInput;

    if (editingProduct) {
      try {
        const res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
          body: JSON.stringify({
            id: editingProduct.id,
            name: `${brandName} ${phoneModel}`,
            sku: editingProduct.sku,
            barcode: phoneImei || editingProduct.barcode,
            supplierId: selectedSupplier,
            purchaseCost: parseFloat(purchaseCost) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            wholesalePrice: parseFloat(wholesalePrice) || 0,
            stockQuantity: 1,
            electronicsFields: {
              brand: brandName,
              model: phoneModel,
              condition: phoneCondition,
              color: phoneColor,
              storage: phoneStorage,
              imei: phoneImei,
            }
          })
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || data.details || 'Failed to update phone'); }
        alert('Phone updated successfully!');
        onSuccess();
      } catch (error) {
        alert('Error: ' + (error as Error).message);
      }
      return;
    }

    if (!selectedSupplier) { alert('Please select a supplier'); return; }
    if (phoneQuantity < 1) { alert('Quantity must be at least 1'); return; }
    if (currentModelEntries.length !== phoneQuantity) { alert(`Please fill in details for all ${phoneQuantity} phones`); return; }
    
    try {
      for (let i = 0; i < phoneQuantity; i++) {
        const entry = currentModelEntries[i];
        const sku = `ELC-${Date.now()}-${i}`;
        
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
          body: JSON.stringify({
            name: `${brandName} ${phoneModel}`,
            sku,
            barcode: entry.imei,
            supplierId: selectedSupplier,
            purchaseCost: parseFloat(purchaseCost) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            wholesalePrice: parseFloat(wholesalePrice) || 0,
            stockQuantity: 1,
            electronicsFields: {
              brand: brandName,
              model: phoneModel,
              condition: phoneCondition,
              color: entry.color,
              storage: entry.storage,
              imei: entry.imei,
            }
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.details || data.error || 'Failed to save phone');
        }
      }
      
      alert(`${phoneQuantity} ${brandName} ${phoneModel} phones saved to inventory!`);
      resetForm();
      onSuccess();
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleNextPhone = () => {
    if (!selectedSupplier) { alert('Please select a supplier first'); return; }
    if (!phoneBrand && !phoneBrandInput) { alert('Please select or enter a brand first'); return; }
    if (!phoneModel) { alert('Please enter model first'); return; }
    if (!phoneColor || !phoneImei) { alert('Please fill in color and IMEI'); return; }
    if (currentModelEntries.length === 0 && !phoneStorage) { alert('Please fill in storage for the first phone'); return; }
    
    const storage = phoneStorage || currentModelEntries[0]?.storage || '';
    setCurrentModelEntries([...currentModelEntries, { color: phoneColor, storage, imei: phoneImei }]);
    setPhoneColor('');
    setPhoneImei('');
    
    if (currentModelEntries.length + 1 >= phoneQuantity) {
      setCurrentPhoneIndex(currentPhoneIndex + 1);
    }
  };

  const handleAddBrand = () => {
    if (!phoneBrandInput.trim()) { alert('Please enter a brand name'); return; }
    if (phoneBrands.includes(phoneBrandInput.trim())) { alert('Brand already exists'); return; }
    setPhoneBrands([...phoneBrands, phoneBrandInput.trim()]);
    setPhoneBrand(phoneBrandInput.trim());
    setPhoneBrandInput('');
  };

  const handleDeleteBrand = (brand: string) => {
    if (phoneBrand === brand) setPhoneBrand('');
    setPhoneBrands(phoneBrands.filter(b => b !== brand));
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) { alert('Please enter supplier name'); return; }
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSupplier(data.supplier.id);
        setShowAddSupplier(false);
        setNewSupplier({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      alert('Failed to add supplier');
    }
  };

  return (
    <div className="electronics-form">
      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Supplier *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} style={{ flex: 1, padding: '0.6rem', background: 'var(--card)', color: 'var(--foreground)' }}>
              <option value="" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Select Supplier</option>
              {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAddSupplier(!showAddSupplier)} className="btn btn-secondary" style={{ padding: '0.6rem' }}><UserPlus size={20} /></button>
          </div>
          {showAddSupplier && (
            <div style={{ padding: '1.25rem', marginTop: '0.75rem', background: 'var(--card)', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <input type="text" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Supplier Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
                <input type="email" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Email" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
                <input type="tel" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Phone" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={handleAddSupplier} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>Save</button>
                <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="label">Brand *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={phoneBrand} onChange={(e) => setPhoneBrand(e.target.value)} style={{ flex: 1, padding: '0.6rem', background: 'var(--card)', color: 'var(--foreground)' }}>
              <option value="" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Select Brand</option>
              {[...phoneBrands].sort().map(b => <option key={b} value={b} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{b}</option>)}
            </select>
            {phoneBrand && !currentModelEntries.length && (
              <button type="button" onClick={() => handleDeleteBrand(phoneBrand)} className="btn btn-danger" style={{ padding: '0.55rem' }} title="Delete selected brand"><Trash2 size={16} /></button>
            )}
            <input type="text" placeholder="New brand" value={phoneBrandInput} onChange={(e) => setPhoneBrandInput(e.target.value)} style={{ flex: 1, padding: '0.6rem' }} />
            <button type="button" onClick={handleAddBrand} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>Add</button>
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Model *</label>
          <input type="text" className="input" style={{ padding: '0.6rem' }} value={phoneModel} onChange={(e) => setPhoneModel(e.target.value)} placeholder="e.g., iPhone 15 Pro" />
        </div>
        <div>
          <label className="label">Condition</label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {['NEW', 'USED', 'REFURBISHED'].map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setPhoneCondition(c)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
borderColor: phoneCondition === c ? 'var(--primary)' : 'var(--border)',
     background: phoneCondition === c ? 'var(--primary)' : 'var(--card)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.8rem',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        {!editingProduct && (
          <div>
            <label className="label">Quantity *</label>
            <input type="number" className="input" style={{ padding: '0.6rem' }} value={phoneQuantity} onChange={(e) => setPhoneQuantity(parseInt(e.target.value) || 1)} min="1" />
          </div>
        )}
        <div>
          <label className="label">Storage *</label>
          <input type="text" className="input" style={{ padding: '0.6rem' }} value={phoneStorage} onChange={(e) => setPhoneStorage(e.target.value)} placeholder="e.g., 256GB" />
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Purchase Cost (TSh)</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
        <div>
          <label className="label">Selling Price (TSh) *</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
        <div>
          <label className="label">Wholesale Price (TSh)</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
      </div>

      {!editingProduct && currentModelEntries.map((entry, idx) => (
        <div key={idx} style={{ padding: '0.6rem', background: 'var(--card)', borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</span>
            <span style={{ color: 'var(--foreground)' }}>{entry.color} / {entry.storage}</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>{entry.imei}</span>
          </div>
        </div>
      ))}

      {(editingProduct || currentModelEntries.length < phoneQuantity) && (
      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Color *</label>
          <input type="text" className="input" style={{ padding: '0.6rem' }} value={phoneColor} onChange={(e) => setPhoneColor(e.target.value)} placeholder="e.g., Black" />
        </div>
        <div>
          <label className="label">IMEI *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="input" style={{ flex: 1, padding: '0.6rem' }} value={phoneImei} onChange={(e) => setPhoneImei(e.target.value)} placeholder="15-17 digit number" />
            <button type="button" onClick={() => setShowScanner(true)} style={scanBtnStyle} title="Scan barcode with camera"><Camera size={18} /></button>
          </div>
        </div>
      </div>
      )}

      {showScanner && <BarcodeScanner onScan={(code) => { setPhoneImei(code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
        {editingProduct ? (
          <button 
            type="button" 
            onClick={handleAddPhone}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem' }}
          >
            <Check size={18} /> Update Phone
          </button>
        ) : (
          <>
            <button 
              type="button" 
              onClick={handleNextPhone}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1rem' }}
              disabled={!phoneColor || !phoneImei || (currentModelEntries.length === 0 && !phoneStorage)}
            >
              <Plus size={18} /> Add Phone Entry ({currentModelEntries.length}/{phoneQuantity})
            </button>
            <button 
              type="button" 
              onClick={handleAddPhone}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.25rem' }}
              disabled={currentModelEntries.length !== phoneQuantity}
            >
              <Check size={18} /> Save {phoneQuantity} Phone(s)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============== ACCESSORY FORM ==============

interface ElectronicsAccessoryFormProps {
  suppliers: Supplier[];
  shop: Shop | null;
  accessoryGroups: string[];
  setAccessoryGroups: (g: string[]) => void;
  accessoryGroup: string;
  setAccessoryGroup: (g: string) => void;
  accessoryGroupInput: string;
  setAccessoryGroupInput: (g: string) => void;
  accessoryName: string;
  setAccessoryName: (n: string) => void;
  accessoryItems: any[];
  setAccessoryItems: (i: any[]) => void;
  formData: any;
  setFormData: (f: any) => void;
  onCancel: () => void;
  onSuccess: () => void;
  editingProduct?: any;
}

export function ElectronicsAccessoryForm({
  suppliers, shop, accessoryGroups, setAccessoryGroups, accessoryGroup, setAccessoryGroup,
  accessoryGroupInput, setAccessoryGroupInput, accessoryName, setAccessoryName,
  accessoryItems, setAccessoryItems, formData, setFormData, onCancel, onSuccess,
  editingProduct
}: ElectronicsAccessoryFormProps) {
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '' });
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [accessoryColor, setAccessoryColor] = useState('');
  const [accessoryBarcode, setAccessoryBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setPurchaseCost(editingProduct.purchaseCost?.toString() || '');
      setSellingPrice(editingProduct.sellingPrice?.toString() || '');
      setWholesalePrice(editingProduct.wholesalePrice?.toString() || '');
      setSelectedSupplier(editingProduct.supplierId || '');
      const ef = editingProduct.electronicsFields;
      if (ef) {
        setAccessoryGroup(ef.brand || '');
        setAccessoryName(ef.model || '');
        setAccessoryColor(ef.color || '');
      }
    }
  }, [editingProduct]);

  const resetForm = () => {
    setAccessoryGroup('');
    setAccessoryGroupInput('');
    setAccessoryName('');
    setAccessoryItems([]);
    setAccessoryBarcode('');
    setPurchaseCost('');
    setSellingPrice('');
    setWholesalePrice('');
    setAccessoryColor('');
    setSelectedSupplier('');
  };

  const handleAddAccessory = async () => {
    if (!selectedSupplier) { alert('Please select a supplier'); return; }
    if (!accessoryName) { alert('Please enter accessory name'); return; }
    if (!accessoryGroup && !accessoryGroupInput) { alert('Please select or enter a group'); return; }

    const groupName = accessoryGroup || accessoryGroupInput;

    if (editingProduct) {
      try {
        const res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
          body: JSON.stringify({
            id: editingProduct.id,
            name: accessoryName,
            sku: editingProduct.sku,
            barcode: accessoryBarcode || null,
            supplierId: selectedSupplier,
            purchaseCost: parseFloat(purchaseCost) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            wholesalePrice: parseFloat(wholesalePrice) || 0,
            stockQuantity: 1,
            electronicsFields: {
              brand: groupName,
              model: accessoryName,
              color: accessoryColor || null,
              storage: null,
              imei: null,
              condition: 'NEW'
            }
          })
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update accessory'); }
        alert('Accessory updated successfully!');
        onSuccess();
      } catch (error) {
        alert('Error: ' + (error as Error).message);
      }
      return;
    }

    if (accessoryItems.length === 0) { alert('Please add at least one item'); return; }
    
    try {
      for (let i = 0; i < accessoryItems.length; i++) {
        const item = accessoryItems[i];
        const sku = `ACC-${Date.now()}-${i}`;
        
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
          body: JSON.stringify({
            name: accessoryName,
            sku,
            barcode: accessoryBarcode || null,
            supplierId: selectedSupplier,
            purchaseCost: parseFloat(purchaseCost) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            wholesalePrice: parseFloat(wholesalePrice) || 0,
            stockQuantity: item.quantity || 1,
            electronicsFields: {
              brand: groupName,
              model: accessoryName,
              color: accessoryColor || null,
              storage: null,
              imei: null,
              condition: 'NEW'
            }
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save accessory');
        }
      }
      
      alert(`${accessoryItems.length} ${accessoryName} accessories saved!`);
      resetForm();
      onSuccess();
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleAddItem = () => {
    if (!selectedSupplier) { alert('Please select a supplier first'); return; }
    if (!accessoryGroup && !accessoryGroupInput) { alert('Please select or enter an accessory group first'); return; }
    if (!accessoryName) { alert('Please enter an accessory name first'); return; }
    if (!sellingPrice) { alert('Please enter a selling price first'); return; }
    const quantity = parseInt(formData.quantity) || 1;
    setAccessoryItems([...accessoryItems, { quantity }]);
    setFormData({ ...formData, quantity: '' });
  };

  const handleAddGroup = () => {
    if (!accessoryGroupInput.trim()) { alert('Please enter a group name'); return; }
    if (accessoryGroups.includes(accessoryGroupInput.trim())) { alert('Group already exists'); return; }
    setAccessoryGroups([...accessoryGroups, accessoryGroupInput.trim()]);
    setAccessoryGroup(accessoryGroupInput.trim());
    setAccessoryGroupInput('');
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) { alert('Please enter supplier name'); return; }
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSupplier(data.supplier.id);
        setShowAddSupplier(false);
        setNewSupplier({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      alert('Failed to add supplier');
    }
  };

  const needFieldsFilled = selectedSupplier && (accessoryGroup || accessoryGroupInput) && accessoryName && sellingPrice;

  return (
    <div className="electronics-form">
      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Supplier *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} disabled={editingProduct ? false : accessoryItems.length > 0} style={{ flex: 1, padding: '0.6rem', background: 'var(--card)', color: 'var(--foreground)', borderRadius: '0.4rem' }}>
              <option value="" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Select Supplier</option>
              {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAddSupplier(!showAddSupplier)} className="btn btn-secondary" disabled={editingProduct ? false : accessoryItems.length > 0} style={{ padding: '0.6rem' }}><UserPlus size={20} /></button>
          </div>
          {showAddSupplier && (
            <div style={{ padding: '1.25rem', marginTop: '0.75rem', background: 'var(--card)', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <input type="text" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Supplier Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
                <input type="email" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Email" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
                <input type="tel" className="input" style={{ padding: '0.85rem 1rem', fontSize: '1rem' }} placeholder="Phone" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={handleAddSupplier} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>Save</button>
                <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="label">Accessory Group *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={accessoryGroup} onChange={(e) => setAccessoryGroup(e.target.value)} style={{ flex: 1, padding: '0.6rem', background: 'var(--card)', color: 'var(--foreground)', borderRadius: '0.4rem' }}>
              <option value="" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Select Group</option>
              {[...accessoryGroups].sort().map(g => <option key={g} value={g} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{g}</option>)}
            </select>
            <input type="text" placeholder="New group" value={accessoryGroupInput} onChange={(e) => setAccessoryGroupInput(e.target.value)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.4rem' }} />
            <button type="button" onClick={handleAddGroup} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>Add</button>
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Accessory Name *</label>
          <input type="text" className="input" style={{ padding: '0.6rem' }} value={accessoryName} onChange={(e) => setAccessoryName(e.target.value)} placeholder="e.g., Charger, Headphones" />
        </div>
        <div>
          <label className="label">Quantity *</label>
          <input 
            type="number" 
            className="input"
            style={{ padding: '0.6rem' }}
            value={formData.quantity || ''}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            placeholder="1"
            min="1"
          />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Barcode</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="input" style={{ flex: 1, padding: '0.6rem' }} value={accessoryBarcode} onChange={(e) => setAccessoryBarcode(e.target.value)} placeholder="Scan or enter barcode" />
            <button type="button" onClick={() => setShowScanner(true)} style={scanBtnStyle} title="Scan barcode with camera"><Camera size={18} /></button>
          </div>
        </div>
        <div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Purchase Cost (TSh)</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
        <div>
          <label className="label">Selling Price (TSh) *</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
        <div>
          <label className="label">Wholesale Price (TSh)</label>
          <input type="number" className="input" style={{ padding: '0.6rem' }} value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="0.00" step="0.01" min="0" />
        </div>
        <div>
          <label className="label">Color</label>
          <input type="text" className="input" style={{ padding: '0.6rem' }} value={accessoryColor} onChange={(e) => setAccessoryColor(e.target.value)} placeholder="e.g., Black, White" />
        </div>
      </div>

      {!editingProduct && (
        <>
          {accessoryItems.length > 0 && (
            <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: '600' }}>ITEMS TO SAVE ({accessoryItems.length})</div>
              {accessoryItems.map((item, idx) => (
                <div key={idx} style={{ padding: '0.6rem 0.8rem', background: 'var(--background)', borderRadius: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</span>
                    <span style={{ color: 'var(--foreground)' }}>Qty: {item.quantity}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setAccessoryItems(accessoryItems.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showScanner && <BarcodeScanner onScan={(code) => { setAccessoryBarcode(code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
        {!editingProduct && (
          <button 
            type="button" 
            onClick={handleAddItem}
            className="btn btn-primary"
            disabled={!needFieldsFilled}
            style={{ padding: '0.6rem 1.25rem', opacity: needFieldsFilled ? 1 : 0.5 }}
          >
            <Plus size={18} /> Add Item
          </button>
        )}
        {editingProduct ? (
          <button 
            type="button" 
            onClick={handleAddAccessory}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem' }}
          >
            <Check size={18} /> Update Accessory
          </button>
        ) : (
          <button 
            type="button" 
            onClick={handleAddAccessory}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem' }}
            disabled={accessoryItems.length === 0}
          >
            <Check size={18} /> Save {accessoryItems.length} Accessorie(s)
          </button>
        )}
      </div>
    </div>
  );
}