'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Phone, Mail, MapPin, ShoppingCart, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditBalance: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  _count?: { sales: number; installmentSales: number };
}

export default function ClientsPage() {
  const { shop } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: ''
  });

  useEffect(() => { if (shop?.id) fetchClients(); const interval = setInterval(() => { if (shop?.id) fetchClients(); }, 30000); return () => clearInterval(interval); }, [shop?.id]);

  async function fetchClients() {
    try {
      const res = await fetch('/api/clients', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setClients(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(client?: Client) {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingClient ? 'PUT' : 'POST';
      const body = editingClient ? { ...formData, id: editingClient.id } : formData;
      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        fetchClients();
      } else {
        const text = await res.text();
        alert(text || 'Failed to save client');
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this client?')) return;
    try {
      await fetch(`/api/clients?id=${id}`, { method: 'DELETE', headers: { 'x-shop-id': shop?.id || '' } });
      fetchClients();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  const filteredClients = clients.filter(c => 
    !search || 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="clients-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Clients</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Manage customers and clients</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <Plus size={18} /> Add Client
        </button>
      </div>

      <div className="card search-box" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.5rem', paddingLeft: '34px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <div className="card table-responsive clients-grid" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--card)' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>CLIENT</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>CONTACT</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>TOTAL PURCHASES</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>CREDIT</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>STATUS</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, index) => (
              <tr key={client.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{client.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                    {client._count?.sales || 0} sales
                  </div>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {client.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        <Phone size={12} /> {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        <Mail size={12} /> {client.email}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e' }}>
                  {formatCurrency(client.totalPurchases || 0)}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: client.creditBalance > 0 ? 'var(--warning)' : 'var(--muted-foreground)' }}>
                  {formatCurrency(client.creditBalance || 0)}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.65rem', 
                    fontWeight: '600',
                    background: client.isActive ? '#22c55e20' : '#ef444420',
                    color: client.isActive ? '#22c55e' : '#ef4444'
                  }}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button onClick={() => openModal(client)} className="btn btn-secondary edit-btn" style={{ padding: '0.25rem' }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="btn btn-danger delete-btn" style={{ padding: '0.25rem' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredClients.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No clients found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Address</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingClient ? 'Update' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
