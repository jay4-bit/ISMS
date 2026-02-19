'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Edit, Trash2, X, Phone, Mail, MapPin, Package, ToggleLeft, ToggleRight } from 'lucide-react';

interface SupplierData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  notes: string | null;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', contactPerson: '', notes: ''
  });

  useEffect(() => { fetchSuppliers(); }, []);

  async function fetchSuppliers() {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(supplier?: SupplierData) {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        contactPerson: supplier.contactPerson || '',
        notes: supplier.notes || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', email: '', phone: '', address: '', contactPerson: '', notes: '' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingSupplier ? 'PUT' : 'POST';
      const body = editingSupplier ? { ...formData, id: editingSupplier.id } : formData;
      const res = await fetch('/api/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
      fetchSuppliers();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  async function toggleActive(supplier: SupplierData) {
    try {
      await fetch('/api/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supplier.id, isActive: !supplier.isActive })
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  }

  const filteredSuppliers = suppliers.filter(s => showInactive || s.isActive);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Supplier Management</h1>
          <p style={{ color: '#64748b' }}>Manage suppliers and purchase orders</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <span>Show inactive suppliers</span>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="card" style={{ opacity: supplier.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: '600', fontSize: '1.125rem' }}>{supplier.name}</h3>
                {supplier.contactPerson && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Contact: {supplier.contactPerson}</p>
                )}
              </div>
              <button 
                onClick={() => toggleActive(supplier)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                title={supplier.isActive ? 'Active' : 'Inactive'}
              >
                {supplier.isActive ? <ToggleRight size={24} color="#22c55e" /> : <ToggleLeft size={24} color="#94a3b8" />}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {supplier.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                  <Phone size={16} /> {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                  <Mail size={16} /> {supplier.email}
                </div>
              )}
              {supplier.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                  <MapPin size={16} style={{ marginTop: '2px' }} /> {supplier.address}
                </div>
              )}
            </div>

            {supplier.notes && (
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem', fontStyle: 'italic' }}>
                {supplier.notes}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button onClick={() => openModal(supplier)} className="btn btn-secondary" style={{ flex: 1 }}>
                <Edit size={16} /> Edit
              </button>
              <button onClick={() => handleDelete(supplier.id)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No suppliers found. Add your first supplier to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Supplier Name *</label>
                <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Contact Person</label>
                <input type="text" className="input" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Address</label>
                <input type="text" className="input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
