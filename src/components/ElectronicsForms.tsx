'use client';

import { useState } from 'react';
import { Plus, X, Check, Smartphone, Package, Trash2, UserPlus } from 'lucide-react';

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
}

export function ElectronicsPhoneForm({
  suppliers, shop, phoneBrands, setPhoneBrands, phoneCondition, setPhoneCondition,
  phoneBrand, setPhoneBrand, phoneBrandInput, setPhoneBrandInput,
  phoneModel, setPhoneModel, phoneQuantity, setPhoneQuantity,
  phoneColor, setPhoneColor, phoneStorage, setPhoneStorage, phoneImei, setPhoneImei,
  registeredPhones, setRegisteredPhones, currentPhoneIndex, setCurrentPhoneIndex,
  formData, setFormData, onCancel, onSuccess
}: ElectronicsPhoneFormProps) {
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '' });
  const [currentModelEntries, setCurrentModelEntries] = useState<{ color: string; storage: string; imei: string }[]>([]);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

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
  };

  const handleAddPhone = async () => {
    if (!selectedSupplier) { alert('Please select a supplier'); return; }
    if (!phoneBrand && !phoneBrandInput) { alert('Please select or enter a brand'); return; }
    if (!phoneModel) { alert('Please enter model'); return; }
    if (phoneQuantity < 1) { alert('Quantity must be at least 1'); return; }
    if (currentModelEntries.length !== phoneQuantity) { alert(`Please fill in details for all ${phoneQuantity} phones`); return; }

    const brandName = phoneBrand || phoneBrandInput;
    
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
            supplierId: selectedSupplier,
            purchaseCost: purchaseCost || 0,
            sellingPrice: sellingPrice || 0,
            stockQuantity: 1,
            electronicsBrand: brandName,
            electronicsModel: phoneModel,
            electronicsCondition: phoneCondition,
            electronicsColor: entry.color,
            electronicsStorage: entry.storage,
            electronicsIMEI: entry.imei,
          })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save phone');
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
    if (!phoneColor || !phoneStorage || !phoneImei) { alert('Please fill in color, storage and IMEI'); return; }
    
    setCurrentModelEntries([...currentModelEntries, { color: phoneColor, storage: phoneStorage, imei: phoneImei }]);
    setPhoneColor('');
    setPhoneStorage('');
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
    <div>
      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Brand *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={phoneBrand} 
              onChange={(e) => setPhoneBrand(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select Brand</option>
              {phoneBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="New brand" 
              value={phoneBrandInput}
              onChange={(e) => setPhoneBrandInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddBrand} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Add</button>
          </div>
        </div>
        <div>
          <label className="label">Model *</label>
          <input 
            type="text" 
            className="input" 
            value={phoneModel}
            onChange={(e) => setPhoneModel(e.target.value)}
            placeholder="e.g., iPhone 15 Pro"
          />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Condition</label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {['NEW', 'USED', 'REFURBISHED'].map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setPhoneCondition(c)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  borderColor: phoneCondition === c ? '#3b82f6' : '#334155',
                  background: phoneCondition === c ? '#3b82f6' : '#1e293b',
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
        <div>
          <label className="label">Quantity *</label>
          <input 
            type="number" 
            className="input" 
            value={phoneQuantity}
            onChange={(e) => setPhoneQuantity(parseInt(e.target.value) || 1)}
            min="1"
          />
        </div>
      </div>

      {currentModelEntries.map((entry, idx) => (
        <div key={idx} style={{ padding: '0.5rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>#{idx + 1}</span>
            <span style={{ color: '#f1f5f9' }}>{entry.color} / {entry.storage}</span>
            <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{entry.imei}</span>
          </div>
        </div>
      ))}

      <div className="grid-cols-3" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Color *</label>
          <input 
            type="text" 
            className="input" 
            value={phoneColor}
            onChange={(e) => setPhoneColor(e.target.value)}
            placeholder="e.g., Black"
          />
        </div>
        <div>
          <label className="label">Storage *</label>
          <input 
            type="text" 
            className="input" 
            value={phoneStorage}
            onChange={(e) => setPhoneStorage(e.target.value)}
            placeholder="e.g., 256GB"
          />
        </div>
        <div>
          <label className="label">IMEI *</label>
          <input 
            type="text" 
            className="input" 
            value={phoneImei}
            onChange={(e) => setPhoneImei(e.target.value)}
            placeholder="15-17 digit number"
          />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Purchase Cost (TSh)</label>
          <input 
            type="number" 
            className="input" 
            value={purchaseCost}
            onChange={(e) => setPurchaseCost(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">Selling Price (TSh) *</label>
          <input 
            type="number" 
            className="input" 
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Supplier *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={selectedSupplier} 
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAddSupplier(true)} className="btn btn-secondary" style={{ padding: '0.5rem' }}><UserPlus size={16} /></button>
          </div>
        </div>
      </div>

      {showAddSupplier && (
        <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Add New Supplier</h4>
          <div className="grid-cols-3" style={{ marginBottom: '0.5rem' }}>
            <input type="text" className="input" placeholder="Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
            <input type="email" className="input" placeholder="Email" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
            <input type="tel" className="input" placeholder="Phone" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleAddSupplier} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem' }}>Save</button>
            <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button 
          type="button" 
          onClick={handleNextPhone}
          className="btn btn-secondary"
          disabled={!phoneColor || !phoneStorage || !phoneImei}
        >
          <Plus size={16} /> Add Phone Entry ({currentModelEntries.length}/{phoneQuantity})
        </button>
        <button 
          type="button" 
          onClick={handleAddPhone}
          className="btn btn-primary"
          disabled={currentModelEntries.length !== phoneQuantity}
        >
          <Check size={16} /> Save {phoneQuantity} Phone(s)
        </button>
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
}

export function ElectronicsAccessoryForm({
  suppliers, shop, accessoryGroups, setAccessoryGroups, accessoryGroup, setAccessoryGroup,
  accessoryGroupInput, setAccessoryGroupInput, accessoryName, setAccessoryName,
  accessoryItems, setAccessoryItems, formData, setFormData, onCancel, onSuccess
}: ElectronicsAccessoryFormProps) {
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '' });
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const resetForm = () => {
    setAccessoryGroup('');
    setAccessoryGroupInput('');
    setAccessoryName('');
    setAccessoryItems([]);
    setPurchaseCost('');
    setSellingPrice('');
  };

  const handleAddAccessory = async () => {
    if (!selectedSupplier) { alert('Please select a supplier'); return; }
    if (!accessoryName) { alert('Please enter accessory name'); return; }
    if (!accessoryGroup && !accessoryGroupInput) { alert('Please select or enter a group'); return; }
    if (accessoryItems.length === 0) { alert('Please add at least one item'); return; }

    const groupName = accessoryGroup || accessoryGroupInput;
    
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
            supplierId: selectedSupplier,
            purchaseCost: purchaseCost || 0,
            sellingPrice: sellingPrice || 0,
            stockQuantity: item.quantity || 1,
            electronicsBrand: groupName,
            electronicsModel: accessoryName,
            accessoryGroup: groupName,
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
    const quantity = parseInt(formData.quantity) || 1;
    setAccessoryItems([...accessoryItems, { quantity }]);
    setFormData({ quantity: '' });
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

  return (
    <div>
      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Accessory Group *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={accessoryGroup} 
              onChange={(e) => setAccessoryGroup(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select Group</option>
              {accessoryGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="New group" 
              value={accessoryGroupInput}
              onChange={(e) => setAccessoryGroupInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddGroup} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Add</button>
          </div>
        </div>
        <div>
          <label className="label">Accessory Name *</label>
          <input 
            type="text" 
            className="input" 
            value={accessoryName}
            onChange={(e) => setAccessoryName(e.target.value)}
            placeholder="e.g., Charger, Headphones"
          />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Purchase Cost (TSh)</label>
          <input 
            type="number" 
            className="input" 
            value={purchaseCost}
            onChange={(e) => setPurchaseCost(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">Selling Price (TSh) *</label>
          <input 
            type="number" 
            className="input" 
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {accessoryItems.map((item, idx) => (
        <div key={idx} style={{ padding: '0.5rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>#{idx + 1}</span>
            <span style={{ color: '#f1f5f9' }}>Qty: {item.quantity}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setAccessoryItems(accessoryItems.filter((_, i) => i !== idx))}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Quantity *</label>
          <input 
            type="number" 
            className="input" 
            value={formData.quantity || ''}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            placeholder="1"
            min="1"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            type="button" 
            onClick={handleAddItem}
            className="btn btn-secondary"
            disabled={!formData.quantity}
            style={{ padding: '0.5rem 1rem' }}
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Supplier *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={selectedSupplier} 
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAddSupplier(true)} className="btn btn-secondary" style={{ padding: '0.5rem' }}><UserPlus size={16} /></button>
          </div>
        </div>
      </div>

      {showAddSupplier && (
        <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Add New Supplier</h4>
          <div className="grid-cols-3" style={{ marginBottom: '0.5rem' }}>
            <input type="text" className="input" placeholder="Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
            <input type="email" className="input" placeholder="Email" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
            <input type="tel" className="input" placeholder="Phone" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleAddSupplier} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem' }}>Save</button>
            <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button 
          type="button" 
          onClick={handleAddAccessory}
          className="btn btn-primary"
          disabled={accessoryItems.length === 0}
        >
          <Check size={16} /> Save {accessoryItems.length} Accessorie(s)
        </button>
      </div>
    </div>
  );
}
