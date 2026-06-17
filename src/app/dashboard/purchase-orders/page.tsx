'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Eye, X, Truck, CheckCircle, Clock, Package, DollarSign, Calendar, Search, UserPlus, Trash2, AlertTriangle, Smartphone, Headphones, Check, Hash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  expectedDelivery: string | null;
  receivedAt: string | null;
  createdAt: string;
  items: any[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  purchaseCost: number;
  sellingPrice: number;
  stockQuantity: number;
  supplier?: { id: string; name: string };
  electronicsFields?: { imei?: string | null; brand?: string | null; model?: string | null; color?: string | null; storage?: string | null; condition?: string | null } | null;
}

export default function PurchaseOrdersPage() {
  const { shop } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showBrandManageModal, setShowBrandManageModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const formatCurr = (amount: number) => formatCurrency(amount, settings?.currency || 'TZS');

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDelivery: '',
    items: [] as any[]
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const isElectronics = shop?.shopType === 'ELECTRONICS';
  const isPharmacy = shop?.shopType === 'PHARMACY';
  const isClothing = shop?.shopType === 'CLOTHING';
  const isLiquor = shop?.shopType === 'LIQUOR';
  const [electronicsMode, setElectronicsMode] = useState<string>('');
  const [showLiquorForm, setShowLiquorForm] = useState(false);
  const [liquorItem, setLiquorItem] = useState({
    name: '', categoryId: '', size: '', supplierId: '', barcode: '',
    purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1,
    hasExpiry: false, expiryDate: '',
  });
  const [showPharmacyForm, setShowPharmacyForm] = useState(false);
  const [pharmacyItem, setPharmacyItem] = useState({
    brandName: '',
    genericName: '',
    categoryId: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    purchaseCost: '',
    sellingPrice: '',
    wholesalePrice: '',
    quantity: 1,
  });
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [generalItem, setGeneralItem] = useState({
    name: '',
    brand: '',
    barcode: '',
    categoryId: '',
    purchaseCost: '',
    sellingPrice: '',
    wholesalePrice: '',
    quantity: 1,
    variants: [] as { variantType: string; variantValue: string }[],
  });
  const [showClothingForm, setShowClothingForm] = useState(false);
  const [clothingItem, setClothingItem] = useState({
    name: '',
    brand: '',
    barcode: '',
    categoryId: '',
    purchaseCost: '',
    sellingPrice: '',
    wholesalePrice: '',
    quantity: 1,
    variants: [] as { type: string; values: string }[],
  });
  const [phoneCondition, setPhoneCondition] = useState<string>('');
  const [phoneBrand, setPhoneBrand] = useState('');
  const [phoneBrandInput, setPhoneBrandInput] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [phoneColor, setPhoneColor] = useState('');
  const [phoneStorage, setPhoneStorage] = useState('');
  const [phoneImei, setPhoneImei] = useState('');
  const [phoneQuantity, setPhoneQuantity] = useState(1);
  const [registeredPhones, setRegisteredPhones] = useState<any[]>([]);
  const [currentPhoneIndex, setCurrentPhoneIndex] = useState(0);
  const [accessoryGroup, setAccessoryGroup] = useState('');
  const [accessoryGroupInput, setAccessoryGroupInput] = useState('');
  const [accessoryName, setAccessoryName] = useState('');
  const [accessoryItems, setAccessoryItems] = useState<any[]>([]);
  const [accessoryGroups, setAccessoryGroups] = useState(['Charging', 'Music', 'Car', 'Camera LCD', 'Protection', 'Storage', 'Other']);
  const [phoneBrands, setPhoneBrands] = useState(['iPhone', 'Samsung', 'Google Pixel', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'OnePlus', 'Nokia', 'Tecno', 'Infinix', 'Itel']);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [phonePurchaseCost, setPhonePurchaseCost] = useState('');
  const [phoneSellingPrice, setPhoneSellingPrice] = useState('');
  const [phoneWholesalePrice, setPhoneWholesalePrice] = useState('');

  function resetElectronicsForm() {
    setElectronicsMode('');
    setPhoneCondition('');
    setPhoneBrand('');
    setPhoneBrandInput('');
    setPhoneModel('');
    setPhoneQuantity(1);
    setPhoneColor('');
    setPhoneStorage('');
    setPhoneImei('');
    setRegisteredPhones([]);
    setCurrentPhoneIndex(0);
    setAccessoryGroup('');
    setAccessoryGroupInput('');
    setAccessoryName('');
    setAccessoryItems([]);
    setPhonePurchaseCost('');
    setPhoneSellingPrice('');
    setPhoneWholesalePrice('');
  }

  function generateVariantCombinations(variants: { type: string; values: string }[]): string[] {
    const parsed = variants
      .filter(v => v.type && v.values.trim())
      .map(v => ({
        type: v.type,
        values: v.values.split(',').map(s => s.trim()).filter(Boolean)
      }));
    if (parsed.length === 0) return [];
    return parsed.reduce((acc, v) => {
      if (acc.length === 0) return v.values.map(val => `${v.type}: ${val}`);
      return acc.flatMap(combo => v.values.map(val => `${combo}, ${v.type}: ${val}`));
    }, [] as string[]);
  }

  useEffect(() => { fetchData(); }, [shop]);

  async function fetchData() {
    try {
      const headers = { 'x-shop-id': shop?.id || '' };
      const [ordersRes, suppliersRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
        fetch('/api/purchase-orders', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/inventory', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/brands', { headers })
      ]);
      const ordersData = await ordersRes.json();
      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const brandsData = await brandsRes.json();
      setOrders(ordersData.orders || []);
      setSuppliers(suppliersData.suppliers || []);
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      setBrands(brandsData.brands || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitCost: 0 }]
    });
  }

  function updateItem(index: number, field: string, value: any) {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        items[index].unitCost = product.purchaseCost;
        items[index].productName = product.name;
      }
    }
    
    setFormData({ ...formData, items });
  }

  function removeItem(index: number) {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  }

  async function handleCreateSupplier() {
    const name = newSupplier.name.trim();
    if (!name) {
      alert('Please enter supplier name');
      return;
    }
    
    if (!shop?.id) {
      alert('Shop not loaded. Please refresh the page.');
      return;
    }
    
    console.log('Creating supplier:', { name, shopId: shop.id });
    
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shop.id
        },
        body: JSON.stringify({
          name: name,
          email: newSupplier.email || null,
          phone: newSupplier.phone || null,
          address: newSupplier.address || null
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setSuppliers([...suppliers, data.supplier]);
        setFormData({ ...formData, supplierId: data.supplier.id });
        setShowAddSupplier(false);
        setNewSupplier({ name: '', email: '', phone: '', address: '' });
        alert('Supplier added successfully!');
      } else {
        alert(data.error || 'Failed to create supplier');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert('Error: ' + (error as Error).message);
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories([...categories, data.category]);
        setPharmacyItem({ ...pharmacyItem, categoryId: data.category.id });
        setClothingItem({ ...clothingItem, categoryId: data.category.id });
        setNewCategoryName('');
        setShowCategoryModal(false);
      } else {
        alert(data.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      alert('Failed to create category');
    }
  }

  async function createBrand() {
    if (!newBrandName.trim()) {
      alert('Please enter a brand name');
      return;
    }
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setBrands([...brands, data.brand]);
        setClothingItem({ ...clothingItem, brand: data.brand.name });
        setNewBrandName('');
        setShowBrandModal(false);
      } else {
        alert(data.error || 'Failed to create brand');
      }
    } catch (error) {
      console.error('Create brand error:', error);
      alert('Failed to create brand');
    }
  }

  async function deleteBrand(id: string) {
    if (!confirm('Delete this brand?')) return;
    try {
      await fetch(`/api/brands?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      setBrands(brands.filter((b: any) => b.id !== id));
    } catch (error) {
      console.error('Delete brand error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.supplierId) {
      alert('Please select a supplier');
      return;
    }
        if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    try {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      let poItems = [...formData.items];

      if (isElectronics) {
        poItems = orderItems.map((item: any) => {
          if (item.type === 'EXISTING') {
            return {
              productId: item.productId,
              quantity: item.quantity || 1,
              unitCost: item.purchaseCost,
              productName: item.productName,
              sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
            };
          } else if (item.type === 'PHONE') {
            return {
              productId: null,
              quantity: 1,
              unitCost: item.purchaseCost,
              productName: `${item.brand} ${item.model}`,
              sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
              wholesalePrice: item.wholesalePrice || null,
              electronicsBrand: item.brand,
              electronicsModel: item.model,
              electronicsImei: item.imei,
              electronicsColor: item.color,
              electronicsStorage: item.storage,
              electronicsCondition: item.condition,
            };
          } else {
            return {
              productId: null,
              quantity: item.quantity,
              unitCost: item.purchaseCost,
              productName: item.name,
              sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
              electronicsBrand: item.group,
              electronicsModel: item.name,
            };
          }
        });
      } else if (isPharmacy) {
        poItems = orderItems.map((item: any) => ({
          productId: null,
          quantity: item.quantity || 1,
          unitCost: item.purchaseCost,
          productName: [item.brandName, item.genericName].filter(Boolean).join(' '),
          sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
          wholesalePrice: item.wholesalePrice || null,
          pharmacyBrandName: item.brandName,
          pharmacyGenericName: item.genericName,
          pharmacyBatchNumber: item.batchNumber,
          pharmacyManufacturingDate: item.manufacturingDate,
          pharmacyExpiryDate: item.expiryDate,
          pharmacyCategoryName: item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || '' : '',
        }));
      } else if (isClothing) {
        poItems = orderItems.map((item: any) => ({
          productId: null,
          quantity: item.quantity || 1,
          unitCost: item.totalCost ? (item.totalCost / (item.quantity || 1)) : item.purchaseCost,
          productName: item.name || item.brand,
          productBarcode: item.barcode || null,
          sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
          wholesalePrice: item.wholesalePrice || null,
          clothingBrand: item.brand,
          clothingVariants: item.clothingVariants || null,
          clothingCategoryName: item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || '' : '',
        }));
      } else if (isLiquor) {
        poItems = orderItems.map((item: any) => ({
          productId: null,
          quantity: item.quantity || 1,
          unitCost: item.purchaseCost,
          productName: item.name,
          productBarcode: item.barcode || null,
          sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
          wholesalePrice: item.wholesalePrice || null,
          liquorSize: item.size ? parseFloat(item.size) : undefined,
          liquorCategoryName: item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || '' : '',
          liquorExpiryDate: item.expiryDate || null,
        }));
      } else {
        poItems = orderItems.map((item: any) => ({
          productId: null,
          quantity: item.quantity || 1,
          unitCost: item.purchaseCost,
          productName: item.name,
          productBarcode: item.barcode || null,
          sellingPrice: item.sellingPrice || item.purchaseCost * 1.2,
          wholesalePrice: item.wholesalePrice || null,
          clothingBrand: item.clothingBrand || null,
          clothingVariants: item.clothingVariants || null,
        }));
      }

      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          supplierName: supplier?.name,
          expectedDelivery: formData.expectedDelivery || null,
          items: poItems
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setFormData({ supplierId: '', expectedDelivery: '', items: [] });
        setOrderItems([]);
        setShowPharmacyForm(false);
        setShowLiquorForm(false);
        setShowClothingForm(false);
        setShowGeneralForm(false);
        setGeneralItem({ name: '', brand: '', barcode: '', categoryId: '', purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1, variants: [] });
        resetElectronicsForm();
        fetchData();
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Error: ' + (error as Error).message);
    }
  }

  function openReceiveModal(order: PurchaseOrder) {
    setReceivingOrder(order);
    const qtyMap: Record<string, number> = {};
    order.items.forEach((item: any) => {
      qtyMap[item.id] = item.quantityOrdered;
    });
    setReceivedQuantities(qtyMap);
    setShowReceiveModal(true);
  }

  async function handleReceiveOrder() {
    if (!receivingOrder) return;
    const receivedItems = Object.entries(receivedQuantities).map(([itemId, quantityReceived]) => ({
      itemId,
      quantityReceived
    }));
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: receivingOrder.id, status: 'RECEIVED', receivedItems })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to receive order, please try again');
        return;
      }
      setShowReceiveModal(false);
      setReceivingOrder(null);
      fetchData();
    } catch (error) {
      console.error('Failed to receive order:', error);
      alert('Network error while receiving order');
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: orderId, status })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await fetch(`/api/purchase-orders?id=${orderId}`, { 
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  }

  const filteredOrders = orders.filter(o => 
    !search || 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.supplierName && o.supplierName.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING');
  const orderedOrders = filteredOrders.filter(o => o.status === 'ORDERED');
  const receivedOrders = filteredOrders.filter(o => o.status === 'RECEIVED');
  const overdueOrders = filteredOrders.filter(o => 
    o.expectedDelivery && new Date(o.expectedDelivery) < new Date() && 
    o.status !== 'RECEIVED' && o.status !== 'CANCELLED'
  );

  function getStatusBadge(status: string, expectedDelivery?: string | null) {
    const isOverdue = expectedDelivery && new Date(expectedDelivery) < new Date() && status !== 'RECEIVED' && status !== 'CANCELLED';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {getStatusBadgeInner(status)}
        {isOverdue && <AlertTriangle size={14} color="#ef4444" />}
      </div>
    );
  }

  function getStatusBadgeInner(status: string) {
    switch (status) {
      case 'PENDING': return <span className="badge badge-warning">Pending</span>;
      case 'ORDERED': return <span className="badge badge-info">Ordered</span>;
      case 'RECEIVED': return <span className="badge badge-success">Received</span>;
      case 'CANCELLED': return <span className="badge badge-danger">Cancelled</span>;
      default: return <span>{status}</span>;
    }
  }

  function renderVariantComboInfo() {
    if (!clothingItem.variants.some(v => v.type && v.values.trim())) return null;
    const comboCount = generateVariantCombinations(clothingItem.variants).length;
    if (comboCount === 0) return null;
    const qty = clothingItem.quantity || 1;
    const total = comboCount * qty;
    return <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 500 }}>
      {comboCount} variant{comboCount > 1 ? 's' : ''} {qty > 1 ? `× ${qty} = ${total} total items` : `= ${total} item${total > 1 ? 's' : ''}`}
    </p>;
  }

  function getAddButtonText() {
    const c = generateVariantCombinations(clothingItem.variants).length * (clothingItem.quantity || 1);
    return c > 0 ? `${c} Items` : 'to Order';
  }

  function getFirstVariant(variants: string) {
    try { const arr = JSON.parse(variants); return arr[0] || ''; } catch { return ''; }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="page-container inventory-page purchase-orders-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }} className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Purchase Orders</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage supplier orders and restocking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary add-btn">
          <Plus size={18} /> New Order
        </button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="#f59e0b" />
            <div>
              <div className="stat-value">{pendingOrders.length}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} color="#3b82f6" />
            <div>
              <div className="stat-value">{orderedOrders.length}</div>
              <div className="stat-label">Ordered</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{receivedOrders.length}</div>
              <div className="stat-label">Received</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#8b5cf6" />
            <div>
              <div className="stat-value">{formatCurr(filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0))}</div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div className="search-box" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="card table-responsive" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Expected</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: '600' }}>{order.orderNumber}</td>
                <td>{order.supplierName}</td>
                <td>{getStatusBadge(order.status, order.expectedDelivery)}</td>
                <td style={{ color: order.expectedDelivery && new Date(order.expectedDelivery) < new Date() && order.status !== 'RECEIVED' && order.status !== 'CANCELLED' ? '#ef4444' : 'inherit', fontWeight: order.expectedDelivery && new Date(order.expectedDelivery) < new Date() && order.status !== 'RECEIVED' && order.status !== 'CANCELLED' ? '600' : 'normal' }}>
                  {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : '-'}
                </td>
                <td>{formatCurr(order.totalAmount)}</td>
                <td>{formatCurr(order.paidAmount)}</td>
                <td style={{ fontWeight: '600', color: order.totalAmount - order.paidAmount > 0 ? '#ef4444' : '#22c55e' }}>
                  {formatCurr(order.totalAmount - order.paidAmount)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => setSelectedOrder(order)} className="btn btn-secondary view-btn" style={{ padding: '0.25rem' }} title="View Details">
                      <Eye size={14} />
                    </button>
                    {order.status === 'PENDING' && (
                      <button onClick={() => updateOrderStatus(order.id, 'ORDERED')} className="btn btn-primary order-btn" style={{ padding: '0.25rem' }} title="Mark as Ordered">
                        <Truck size={14} />
                      </button>
                    )}
                    {order.status === 'ORDERED' && (
                      <button onClick={() => openReceiveModal(order)} className="btn btn-success receive-btn" style={{ padding: '0.25rem', background: '#22c55e' }} title="Mark as Received">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                      <button onClick={() => updateOrderStatus(order.id, 'CANCELLED')} className="btn btn-danger cancel-btn" style={{ padding: '0.25rem' }} title="Cancel Order">
                        <X size={14} />
                      </button>
                    )}
                    {order.status === 'PENDING' && (
                      <button onClick={() => deleteOrder(order.id)} className="btn btn-danger delete-btn" style={{ padding: '0.25rem' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No purchase orders found.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Create Purchase Order</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {suppliers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No suppliers found. Please add a supplier first.</p>
                <button onClick={() => { setShowModal(false); window.location.href = '/dashboard/suppliers'; }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Go to Suppliers
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="label">Supplier *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select 
                        className="select" 
                        style={{ flex: 1, background: 'var(--card)', color: 'var(--foreground)' }}
                        value={formData.supplierId} 
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        required
                      >
                        <option value="" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>Select Supplier</option>
                        {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                          <option key={s.id} value={s.id} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{s.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        console.log('Opening supplier modal');
                        setShowAddSupplier(true);
                      }} className="btn btn-secondary" title="Add Supplier">
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Expected Delivery</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={formData.expectedDelivery}
                      onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="label" style={{ margin: 0 }}>Order Items *</label>
                    {!isElectronics && !isPharmacy && !isClothing && !isLiquor && !showGeneralForm && (
                      <button type="button" onClick={() => setShowGeneralForm(true)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                        <Plus size={14} /> Add Item
                      </button>
                    )}
                  </div>
                  
                  {isPharmacy ? (
                    showPharmacyForm ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <button onClick={() => setShowPharmacyForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                          <span style={{ color: '#8b5cf6', fontWeight: '600', fontSize: '0.9rem' }}>Add Pharmacy Item</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Brand Name</label>
                            <input type="text" className="input" value={pharmacyItem.brandName} onChange={e => setPharmacyItem({ ...pharmacyItem, brandName: e.target.value })} placeholder="e.g., Panadol" />
                          </div>
                          <div>
                            <label className="label">Generic Name</label>
                            <input type="text" className="input" value={pharmacyItem.genericName} onChange={e => setPharmacyItem({ ...pharmacyItem, genericName: e.target.value })} placeholder="e.g., Paracetamol" />
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label">Category</label>
                          <select className="input" value={pharmacyItem.categoryId} onChange={e => {
                            if (e.target.value === '__add_new__') {
                              setShowCategoryModal(true);
                            } else {
                              setPharmacyItem({ ...pharmacyItem, categoryId: e.target.value });
                            }
                          }}>
                            <option value="">Select category</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                            <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                          </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Batch Number</label>
                            <input type="text" className="input" value={pharmacyItem.batchNumber} onChange={e => setPharmacyItem({ ...pharmacyItem, batchNumber: e.target.value })} placeholder="Batch number" />
                          </div>
                          <div>
                            <label className="label">Manufacturing Date</label>
                            <input type="date" className="input" value={pharmacyItem.manufacturingDate} onChange={e => setPharmacyItem({ ...pharmacyItem, manufacturingDate: e.target.value })} />
                          </div>
                          <div>
                            <label className="label">Expiry Date</label>
                            <input type="date" className="input" value={pharmacyItem.expiryDate} onChange={e => setPharmacyItem({ ...pharmacyItem, expiryDate: e.target.value })} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Quantity *</label>
                            <input type="number" className="input" value={pharmacyItem.quantity} onChange={e => setPharmacyItem({ ...pharmacyItem, quantity: parseInt(e.target.value) || 1 })} min="1" />
                          </div>
                          <div>
                            <label className="label">Buying Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={pharmacyItem.purchaseCost} onChange={e => setPharmacyItem({ ...pharmacyItem, purchaseCost: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Selling Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={pharmacyItem.sellingPrice} onChange={e => setPharmacyItem({ ...pharmacyItem, sellingPrice: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Wholesale Price</label>
                            <input type="number" step="0.01" min="0" className="input" value={pharmacyItem.wholesalePrice} onChange={e => setPharmacyItem({ ...pharmacyItem, wholesalePrice: e.target.value })} placeholder="0.00" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                          <button type="button" onClick={() => { setShowPharmacyForm(false); }} className="btn btn-secondary">Cancel</button>
                          <button type="button" onClick={() => {
                            if (!pharmacyItem.brandName && !pharmacyItem.genericName) { alert('Please enter brand name or generic name'); return; }
                            if (!pharmacyItem.purchaseCost) { alert('Please enter buying price'); return; }
                            if (!pharmacyItem.sellingPrice) { alert('Please enter selling price'); return; }
                            setOrderItems([...orderItems, { ...pharmacyItem, purchaseCost: parseFloat(pharmacyItem.purchaseCost) || 0, sellingPrice: parseFloat(pharmacyItem.sellingPrice) || 0, wholesalePrice: pharmacyItem.wholesalePrice ? parseFloat(pharmacyItem.wholesalePrice) : null }]);
                            setPharmacyItem({ brandName: '', genericName: '', categoryId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1 });
                            setShowPharmacyForm(false);
                          }} className="btn btn-primary">
                            <Plus size={16} /> Add to Order
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Add pharmacy items to this order</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button onClick={() => setShowPharmacyForm(true)} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #8b5cf6', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={40} color="#8b5cf6" />
                            <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Pharmacy Item</span>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Brand, Batch, Expiry, Prices</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : isClothing ? (
                    showClothingForm ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <button onClick={() => setShowClothingForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                          <span style={{ color: 'var(--warning)', fontWeight: '600', fontSize: '0.9rem' }}>Add Clothing Item</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label">Product Name *</label>
                          <input type="text" className="input" value={clothingItem.name} onChange={e => setClothingItem({ ...clothingItem, name: e.target.value })} placeholder="Product name" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Brand</label>
                            <select className="input" value={clothingItem.brand} onChange={e => {
                              if (e.target.value === '__add_new__') {
                                setShowBrandModal(true);
                              } else {
                                setClothingItem({ ...clothingItem, brand: e.target.value });
                              }
                            }}>
                              <option value="">Select brand</option>
                              {brands.map((b: any) => (<option key={b.id} value={b.name}>{b.name}</option>))}
                              <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Brand...</option>
                            </select>
                            <button type="button" onClick={() => setShowBrandManageModal(true)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.25rem', textDecoration: 'underline' }}>Manage Brands</button>
                          </div>
                          <div>
                            <label className="label">Barcode</label>
                            <input type="text" className="input" value={clothingItem.barcode} onChange={e => setClothingItem({ ...clothingItem, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                          </div>
                          <div>
                            <label className="label">Category</label>
                            <select className="input" value={clothingItem.categoryId} onChange={e => {
                              if (e.target.value === '__add_new__') {
                                setShowCategoryModal(true);
                              } else {
                                setClothingItem({ ...clothingItem, categoryId: e.target.value });
                              }
                            }}>
                              <option value="">Select category</option>
                              {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                              <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Quantity per Variant</label>
                            <input type="number" className="input" value={clothingItem.quantity} onChange={e => setClothingItem({ ...clothingItem, quantity: parseInt(e.target.value) || 1 })} min="1" placeholder="1" />
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label">Variants <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>(enter comma-separated values per type)</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {clothingItem.variants.map((v, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select value={v.type} onChange={e => {
                                  const vs = [...clothingItem.variants];
                                  vs[idx] = { ...vs[idx], type: e.target.value };
                                  setClothingItem({ ...clothingItem, variants: vs });
                                }} style={{ width: '120px', padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }}>
                                  {[{ value: '', label: 'Type' }, { value: 'COLOR', label: 'Color' }, { value: 'SIZE', label: 'Size' }, { value: 'LENGTH', label: 'Length' }, { value: 'WEIGHT', label: 'Weight' }, { value: 'VOLUME', label: 'Volume' }, { value: 'PACK', label: 'Pack' }, { value: 'FLAVOR', label: 'Flavor' }, { value: 'MATERIAL', label: 'Material' }, { value: 'OTHER', label: 'Other' }].map(vt => (<option key={vt.value} value={vt.value} style={vt.value === '' ? { background: 'var(--background)', color: 'var(--muted-foreground)' } : { background: 'var(--background)', color: 'var(--foreground)' }}>{vt.label}</option>))}
                                </select>
                                <input type="text" placeholder={`e.g., ${v.type === 'COLOR' ? 'Black, White, Red' : v.type === 'SIZE' ? '39, 40, 41, 42' : 'value1, value2'}`} value={v.values} onChange={e => {
                                  const vs = [...clothingItem.variants];
                                  vs[idx] = { ...vs[idx], values: e.target.value };
                                  setClothingItem({ ...clothingItem, variants: vs });
                                }} style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }} />
                                <button type="button" onClick={() => {
                                  setClothingItem({ ...clothingItem, variants: clothingItem.variants.filter((_, i) => i !== idx) });
                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--destructive)' }}><X size={16} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              setClothingItem({ ...clothingItem, variants: [...clothingItem.variants, { type: '', values: '' }] });
                            }} className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                              + Add Variant Type
                            </button>
                          </div>
                          {renderVariantComboInfo()}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Purchase Cost *</label>
                            <input type="number" step="0.01" min="0" className="input" value={clothingItem.purchaseCost} onChange={e => setClothingItem({ ...clothingItem, purchaseCost: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Selling Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={clothingItem.sellingPrice} onChange={e => setClothingItem({ ...clothingItem, sellingPrice: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Wholesale Price</label>
                            <input type="number" step="0.01" min="0" className="input" value={clothingItem.wholesalePrice} onChange={e => setClothingItem({ ...clothingItem, wholesalePrice: e.target.value })} placeholder="0.00" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                          <button type="button" onClick={() => { setShowClothingForm(false); }} className="btn btn-secondary">Cancel</button>
                          <button type="button" onClick={() => {
                            if (!clothingItem.name) { alert('Please enter product name'); return; }
                            if (!clothingItem.purchaseCost) { alert('Please enter purchase cost'); return; }
                            if (!clothingItem.sellingPrice) { alert('Please enter selling price'); return; }
                            const variantCombos = generateVariantCombinations(clothingItem.variants);
                            if (variantCombos.length === 0) { alert('Please add at least one variant with values'); return; }
                            const qty = clothingItem.quantity || 1;
                            const expanded = variantCombos.flatMap(combo => Array(qty).fill(combo));
                            setOrderItems([...orderItems, {
                              ...clothingItem,
                              purchaseCost: parseFloat(clothingItem.purchaseCost) || 0,
                              sellingPrice: parseFloat(clothingItem.sellingPrice) || 0,
                              wholesalePrice: clothingItem.wholesalePrice ? parseFloat(clothingItem.wholesalePrice) : null,
                              quantity: expanded.length,
                              totalCost: (parseFloat(clothingItem.purchaseCost) || 0) * expanded.length,
                              clothingVariants: JSON.stringify(expanded),
                              variants: [],
                            }]);
                            setClothingItem({ name: '', brand: '', barcode: '', categoryId: '', purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1, variants: [] });
                            setShowClothingForm(false);
                          }} className="btn btn-primary">
                            <Plus size={16} /> Add {getAddButtonText()}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Add clothing items to this order</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button onClick={() => setShowClothingForm(true)} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #f59e0b', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={40} color="#f59e0b" />
                            <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Clothing Item</span>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Brand, Variants, Prices</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : isLiquor ? (
                    showLiquorForm ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <button onClick={() => setShowLiquorForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                          <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.9rem' }}>Add Liquor Item</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Product Name *</label>
                            <input type="text" className="input" value={liquorItem.name} onChange={e => setLiquorItem({ ...liquorItem, name: e.target.value })} placeholder="Product name" />
                          </div>
                          <div>
                            <label className="label">Category</label>
                            <select className="input" value={liquorItem.categoryId} onChange={e => {
                              if (e.target.value === '__add_new__') { setShowCategoryModal(true); }
                              else { setLiquorItem({ ...liquorItem, categoryId: e.target.value }); }
                            }}>
                              <option value="">Select category</option>
                              {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                              <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Size (ml)</label>
                            <input type="number" className="input" value={liquorItem.size} onChange={e => setLiquorItem({ ...liquorItem, size: e.target.value })} placeholder="e.g., 750" />
                          </div>
                          <div>
                            <label className="label">Barcode</label>
                            <input type="text" className="input" value={liquorItem.barcode} onChange={e => setLiquorItem({ ...liquorItem, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Quantity *</label>
                            <input type="number" className="input" value={liquorItem.quantity} onChange={e => setLiquorItem({ ...liquorItem, quantity: parseInt(e.target.value) || 1 })} min="1" />
                          </div>
                          <div>
                            <label className="label">Cost Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={liquorItem.purchaseCost} onChange={e => setLiquorItem({ ...liquorItem, purchaseCost: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Selling Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={liquorItem.sellingPrice} onChange={e => setLiquorItem({ ...liquorItem, sellingPrice: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Wholesale Price</label>
                            <input type="number" step="0.01" min="0" className="input" value={liquorItem.wholesalePrice} onChange={e => setLiquorItem({ ...liquorItem, wholesalePrice: e.target.value })} placeholder="0.00" />
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--foreground)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={liquorItem.hasExpiry} onChange={e => setLiquorItem({ ...liquorItem, hasExpiry: e.target.checked, expiryDate: e.target.checked ? liquorItem.expiryDate : '' })} />
                            <span>Has expiry date</span>
                          </label>
                        </div>
                        {liquorItem.hasExpiry && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <label className="label">Expiry Date</label>
                            <input type="date" className="input" value={liquorItem.expiryDate} onChange={e => setLiquorItem({ ...liquorItem, expiryDate: e.target.value })} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                          <button type="button" onClick={() => { setShowLiquorForm(false); }} className="btn btn-secondary">Cancel</button>
                          <button type="button" onClick={() => {
                            if (!liquorItem.name.trim()) { alert('Please enter product name'); return; }
                            if (!liquorItem.purchaseCost) { alert('Please enter cost price'); return; }
                            if (!liquorItem.sellingPrice) { alert('Please enter selling price'); return; }
                            setOrderItems([...orderItems, {
                              ...liquorItem,
                              purchaseCost: parseFloat(liquorItem.purchaseCost) || 0,
                              sellingPrice: parseFloat(liquorItem.sellingPrice) || 0,
                              wholesalePrice: liquorItem.wholesalePrice ? parseFloat(liquorItem.wholesalePrice) : null,
                            }]);
                            setLiquorItem({ name: '', categoryId: '', size: '', supplierId: '', barcode: '', purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1, hasExpiry: false, expiryDate: '' });
                            setShowLiquorForm(false);
                          }} className="btn btn-primary">
                            <Plus size={16} /> Add to Order
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Add liquor items to this order</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button onClick={() => setShowLiquorForm(true)} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #22c55e', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={40} color="#22c55e" />
                            <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Liquor Item</span>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Name, Size, Pricing, Expiry</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : !isElectronics ? (
                    showGeneralForm ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <button onClick={() => setShowGeneralForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                          <span style={{ color: 'var(--foreground)', fontWeight: '600', fontSize: '0.9rem' }}>Add General Item</span>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label">Product Name *</label>
                          <input type="text" className="input" value={generalItem.name} onChange={e => setGeneralItem({ ...generalItem, name: e.target.value })} placeholder="Product name" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Brand</label>
                            <select className="input" value={generalItem.brand} onChange={e => {
                              if (e.target.value === '__add_new__') {
                                setShowBrandModal(true);
                              } else {
                                setGeneralItem({ ...generalItem, brand: e.target.value });
                              }
                            }}>
                              <option value="">Select brand</option>
                              {brands.map((b: any) => (<option key={b.id} value={b.name}>{b.name}</option>))}
                              <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Brand...</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Barcode</label>
                            <input type="text" className="input" value={generalItem.barcode} onChange={e => setGeneralItem({ ...generalItem, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label">Category</label>
                          <select className="input" value={generalItem.categoryId} onChange={e => {
                            if (e.target.value === '__add_new__') {
                              setShowCategoryModal(true);
                            } else {
                              setGeneralItem({ ...generalItem, categoryId: e.target.value });
                            }
                          }}>
                            <option value="">Select category</option>
                            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                            <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: '0.75rem', padding: '1rem', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h4 style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: '600' }}>Variants</h4>
                            <button type="button" onClick={() => setGeneralItem({ ...generalItem, variants: [...generalItem.variants, { variantType: 'OTHER', variantValue: '' }] })} className="btn btn-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                              + Add Variant
                            </button>
                          </div>
                          {generalItem.variants.length === 0 && (
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>No variants added. Click "Add Variant" to create product variations (e.g., sizes, colors, pack sizes).</p>
                          )}
                          {generalItem.variants.map((v, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', padding: '0.6rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                              <div style={{ flex: 1 }}>
                                <select className="input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={v.variantType} onChange={e => {
                                  const vs = [...generalItem.variants];
                                  vs[i] = { ...vs[i], variantType: e.target.value };
                                  setGeneralItem({ ...generalItem, variants: vs });
                                }}>
                                  {[{ value: 'COLOR', label: 'Color' }, { value: 'SIZE', label: 'Size' }, { value: 'LENGTH', label: 'Length' }, { value: 'WEIGHT', label: 'Weight' }, { value: 'VOLUME', label: 'Volume' }, { value: 'PACK', label: 'Pack' }, { value: 'FLAVOR', label: 'Flavor' }, { value: 'MATERIAL', label: 'Material' }, { value: 'OTHER', label: 'Other' }].map(vt => (<option key={vt.value} value={vt.value} style={vt.value === '' ? { background: 'var(--background)', color: 'var(--muted-foreground)' } : { background: 'var(--background)', color: 'var(--foreground)' }}>{vt.label}</option>))}
                                </select>
                              </div>
                              <div style={{ flex: 1 }}>
                                <input type="text" className="input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={v.variantValue} onChange={e => {
                                  const vs = [...generalItem.variants];
                                  vs[i] = { ...vs[i], variantValue: e.target.value };
                                  setGeneralItem({ ...generalItem, variants: vs });
                                }} placeholder={`e.g., ${v.variantType === 'COLOR' ? 'Red' : v.variantType === 'SIZE' ? '42' : 'value'}`} />
                              </div>
                              <button type="button" onClick={() => setGeneralItem({ ...generalItem, variants: generalItem.variants.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.4rem' }}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className="label">Quantity *</label>
                            <input type="number" className="input" value={generalItem.quantity} onChange={e => setGeneralItem({ ...generalItem, quantity: parseInt(e.target.value) || 1 })} min="1" />
                          </div>
                          <div>
                            <label className="label">Buying Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={generalItem.purchaseCost} onChange={e => setGeneralItem({ ...generalItem, purchaseCost: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Selling Price *</label>
                            <input type="number" step="0.01" min="0" className="input" value={generalItem.sellingPrice} onChange={e => setGeneralItem({ ...generalItem, sellingPrice: e.target.value })} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="label">Wholesale Price</label>
                            <input type="number" step="0.01" min="0" className="input" value={generalItem.wholesalePrice} onChange={e => setGeneralItem({ ...generalItem, wholesalePrice: e.target.value })} placeholder="0.00" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                          <button type="button" onClick={() => { setShowGeneralForm(false); }} className="btn btn-secondary">Cancel</button>
                          <button type="button" onClick={() => {
                            if (!generalItem.name) { alert('Please enter product name'); return; }
                            if (!generalItem.purchaseCost) { alert('Please enter buying price'); return; }
                            if (!generalItem.sellingPrice) { alert('Please enter selling price'); return; }
                            const variantArr = generalItem.variants.map(v => `${v.variantType}: ${v.variantValue}`);
                            const variantStr = variantArr.length > 0 ? JSON.stringify(variantArr) : null;
                            setOrderItems([...orderItems, { ...generalItem, purchaseCost: parseFloat(generalItem.purchaseCost) || 0, sellingPrice: parseFloat(generalItem.sellingPrice) || 0, wholesalePrice: generalItem.wholesalePrice ? parseFloat(generalItem.wholesalePrice) : null, clothingVariants: variantStr, clothingBrand: generalItem.brand || null }]);
                            setGeneralItem({ name: '', brand: '', barcode: '', categoryId: '', purchaseCost: '', sellingPrice: '', wholesalePrice: '', quantity: 1, variants: [] });
                            setShowGeneralForm(false);
                          }} className="btn btn-primary">
                            <Plus size={16} /> Add to Order
                          </button>
                        </div>
                      </div>
                    ) : orderItems.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        Click "Add Item" to add products
                      </div>
                    ) : null
                  ) : electronicsMode === '' ? (
                    <div style={{ padding: '1rem 0' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Select the type of item to add to this order</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <button onClick={() => setElectronicsMode('PHONES')} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #3b82f6', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Smartphone size={40} color="#3b82f6" />
                          <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Phones</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>iPhone, Samsung, etc.</span>
                        </button>
                        <button onClick={() => setElectronicsMode('ACCESSORIES')} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #22c55e', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Headphones size={40} color="#22c55e" />
                          <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Accessories</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Chargers, Cases, etc.</span>
                        </button>
                        <button onClick={() => setElectronicsMode('EXISTING')} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #f59e0b', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Package size={40} color="#f59e0b" />
                          <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Existing Products</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>From inventory</span>
                        </button>
                      </div>
                    </div>
                  ) : electronicsMode === 'PHONES' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <button onClick={() => setElectronicsMode('')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                        <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>Add Phones to Order</span>
                      </div>
                      <div className="grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Brand *</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select value={phoneBrand} onChange={(e) => setPhoneBrand(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }}>
                              <option value="" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>Select Brand</option>
                              {[...phoneBrands].sort().map(b => <option key={b} value={b} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>{b}</option>)}
                            </select>
                            <input type="text" placeholder="New brand" value={phoneBrandInput} onChange={(e) => setPhoneBrandInput(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }} />
                            <button type="button" onClick={() => { if (phoneBrandInput.trim() && !phoneBrands.includes(phoneBrandInput.trim())) { setPhoneBrands([...phoneBrands, phoneBrandInput.trim()]); setPhoneBrand(phoneBrandInput.trim()); setPhoneBrandInput(''); } }} className="btn btn-secondary" disabled={orderItems.some((i: any) => i.type === 'PHONE')} style={{ padding: '0.5rem' }}>Add</button>
                          </div>
                        </div>
                        <div>
                          <label className="label">Model *</label>
                          <input type="text" className="input" value={phoneModel} onChange={(e) => setPhoneModel(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} placeholder="e.g., iPhone 15 Pro" />
                        </div>
                      </div>
                      <div className="grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Condition</label>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {['NEW', 'USED', 'REFURBISHED'].map(c => (
                              <button type="button" key={c} onClick={() => setPhoneCondition(c)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.375rem', border: '1px solid', borderColor: phoneCondition === c ? 'var(--primary)' : 'var(--border)', background: phoneCondition === c ? 'var(--primary)' : orderItems.some((i: any) => i.type === 'PHONE') ? 'var(--background)' : 'var(--card)', color: phoneCondition === c ? 'white' : orderItems.some((i: any) => i.type === 'PHONE') ? 'var(--muted-foreground)' : 'var(--foreground)', cursor: orderItems.some((i: any) => i.type === 'PHONE') ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.75rem', opacity: orderItems.some((i: any) => i.type === 'PHONE') ? 0.5 : 1 }}>{c}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label">Quantity *</label>
                          <input type="number" className="input" value={phoneQuantity} onChange={(e) => setPhoneQuantity(parseInt(e.target.value) || 1)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} min="1" />
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label className="label">Storage *</label>
                        <input type="text" className="input" value={phoneStorage} onChange={(e) => setPhoneStorage(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} placeholder="e.g., 256GB" style={{ width: '100%' }} />
                      </div>
                      <div className="grid-cols-3" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Purchase Cost (TSh)</label>
                          <input type="number" className="input" value={phonePurchaseCost} onChange={(e) => setPhonePurchaseCost(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} placeholder="0.00" step="0.01" min="0" />
                        </div>
                        <div>
                          <label className="label">Selling Price (TSh) *</label>
                          <input type="number" className="input" value={phoneSellingPrice} onChange={(e) => setPhoneSellingPrice(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} placeholder="0.00" step="0.01" min="0" />
                        </div>
                        <div>
                          <label className="label">Wholesale Price (TSh)</label>
                          <input type="number" className="input" value={phoneWholesalePrice} onChange={(e) => setPhoneWholesalePrice(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'PHONE')} placeholder="0.00" step="0.01" min="0" />
                        </div>
                      </div>
                      <div className="grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Color *</label>
                          <input type="text" className="input" value={phoneColor} onChange={(e) => setPhoneColor(e.target.value)} placeholder="e.g., Black" />
                        </div>
                        <div>
                          <label className="label">IMEI *</label>
                          <input type="text" className="input" value={phoneImei} onChange={(e) => setPhoneImei(e.target.value)} placeholder="15-17 digit number" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <button type="button" onClick={() => { setElectronicsMode(''); }} className="btn btn-secondary">{orderItems.some((i: any) => i.type === 'PHONE') ? 'Done' : 'Cancel'}</button>
                        {orderItems.filter((i: any) => i.type === 'PHONE').length < phoneQuantity && (
                          <button type="button" onClick={() => {
                            if (!phoneColor || !phoneStorage || !phoneImei) { alert('Please fill in color, storage and IMEI'); return; }
                            const brandName = phoneBrand || phoneBrandInput;
                            if (!brandName) { alert('Please select or enter a brand'); return; }
                            if (!phoneModel) { alert('Please enter model'); return; }
                            setOrderItems([...orderItems, {
                              type: 'PHONE',
                              brand: brandName,
                              model: phoneModel,
                              condition: phoneCondition,
                              color: phoneColor,
                              storage: phoneStorage,
                              imei: phoneImei,
                              purchaseCost: parseFloat(phonePurchaseCost) || 0,
                              sellingPrice: parseFloat(phoneSellingPrice) || 0,
                              wholesalePrice: parseFloat(phoneWholesalePrice) || 0,
                            }]);
                            setPhoneColor('');
                            setPhoneImei('');
                          }} className="btn btn-primary">
                            <Plus size={16} /> {orderItems.some((i: any) => i.type === 'PHONE') ? 'Add Another Phone' : 'Add Phone to Order'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : electronicsMode === 'ACCESSORIES' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <button onClick={() => setElectronicsMode('')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                        <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.9rem' }}>Add Accessories to Order</span>
                      </div>
                      <div className="grid-cols-2" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Accessory Group *</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select value={accessoryGroup} onChange={(e) => setAccessoryGroup(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }}>
                              <option value="" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>Select Group</option>
                              {[...accessoryGroups].sort().map(g => <option key={g} value={g} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>{g}</option>)}
                            </select>
                            <input type="text" placeholder="New group" value={accessoryGroupInput} onChange={(e) => setAccessoryGroupInput(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }} />
                            <button type="button" onClick={() => { if (accessoryGroupInput.trim() && !accessoryGroups.includes(accessoryGroupInput.trim())) { setAccessoryGroups([...accessoryGroups, accessoryGroupInput.trim()]); setAccessoryGroup(accessoryGroupInput.trim()); setAccessoryGroupInput(''); } }} className="btn btn-secondary" disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} style={{ padding: '0.5rem' }}>Add</button>
                          </div>
                        </div>
                        <div>
                          <label className="label">Accessory Name *</label>
                          <input type="text" className="input" value={accessoryName} onChange={(e) => setAccessoryName(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} placeholder="e.g., Charger, Headphones" />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label className="label">Quantity *</label>
                          <input type="number" className="input" value={phoneQuantity} onChange={(e) => setPhoneQuantity(parseInt(e.target.value) || 1)} min="1" />
                        </div>
                        <div>
                          <label className="label">Purchase Cost (TSh)</label>
                          <input type="number" className="input" value={phonePurchaseCost} onChange={(e) => setPhonePurchaseCost(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} placeholder="0.00" step="0.01" min="0" />
                        </div>
                        <div>
                          <label className="label">Selling Price (TSh) *</label>
                          <input type="number" className="input" value={phoneSellingPrice} onChange={(e) => setPhoneSellingPrice(e.target.value)} disabled={orderItems.some((i: any) => i.type === 'ACCESSORY')} placeholder="0.00" step="0.01" min="0" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <button type="button" onClick={() => { setElectronicsMode(''); }} className="btn btn-secondary">{orderItems.some((i: any) => i.type === 'ACCESSORY') ? 'Done' : 'Cancel'}</button>
                        {orderItems.filter((i: any) => i.type === 'ACCESSORY').length < phoneQuantity && (
                          <button type="button" onClick={() => {
                            const groupName = accessoryGroup || accessoryGroupInput;
                            if (!groupName) { alert('Please select or enter a group'); return; }
                            if (!accessoryName) { alert('Please enter accessory name'); return; }
                            setOrderItems([...orderItems, {
                              type: 'ACCESSORY',
                              group: groupName,
                              name: accessoryName,
                              quantity: phoneQuantity,
                              purchaseCost: parseFloat(phonePurchaseCost) || 0,
                              sellingPrice: parseFloat(phoneSellingPrice) || 0,
                            }]);
                            setPhoneQuantity(1);
                          }} className="btn btn-primary">
                            <Plus size={16} /> {orderItems.some((i: any) => i.type === 'ACCESSORY') ? 'Add Another Accessory' : 'Add Accessory to Order'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : electronicsMode === 'EXISTING' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <button onClick={() => setElectronicsMode('')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>← Back</button>
                        <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem' }}>Add Existing Products</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <select
                          style={{ flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid #475569', borderRadius: '0.35rem', color: 'var(--foreground)' }}
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const product = products.find(p => p.id === e.target.value);
                            if (!product) return;
                            setOrderItems([...orderItems, {
                              type: 'EXISTING',
                              productId: product.id,
                              productName: product.name,
                              purchaseCost: product.purchaseCost || 0,
                              sellingPrice: product.sellingPrice || 0,
                              quantity: 1,
                              totalCost: product.purchaseCost || 0,
                            }]);
                          }}
                        >
                          <option value="">Select a product...</option>
                          {products.filter(p => !orderItems.some((oi: any) => oi.productId === p.id && oi.type === 'EXISTING')).map(p => (
                            <option key={p.id} value={p.id} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>{p.name} (Qty: {p.stockQuantity})</option>
                          ))}
                        </select>
                      </div>
                      {orderItems.filter((i: any) => i.type === 'EXISTING').length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="label" style={{ marginBottom: '0.5rem' }}>Selected Products</label>
                          {orderItems.filter((i: any) => i.type === 'EXISTING').map((item: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', background: 'var(--background)', borderRadius: '0.4rem', marginBottom: '0.35rem', border: '1px solid var(--border)' }}>
                              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--foreground)' }}>{item.productName}</span>
                              <input type="number" style={{ width: '60px', padding: '0.2rem 0.4rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.3rem', color: 'var(--foreground)', fontSize: '0.8rem' }} value={item.quantity} min="1" onChange={(e) => {
                                const newItems = orderItems.filter((i: any) => !(i.type === 'EXISTING' && i.productId === item.productId));
                                newItems.push({ ...item, quantity: parseInt(e.target.value) || 1, totalCost: (parseInt(e.target.value) || 1) * item.purchaseCost });
                                setOrderItems(newItems);
                              }} />
                              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', width: '80px', textAlign: 'right' }}>{formatCurr(item.quantity * item.purchaseCost)}</span>
                              <button type="button" onClick={() => setOrderItems(orderItems.filter((i: any) => !(i.type === 'EXISTING' && i.productId === item.productId)))} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.2rem' }}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setElectronicsMode('')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Done</button>
                      </div>
                    </div>
                  ) : null}
                </div>

                  {(isElectronics || isPharmacy || isClothing || isLiquor || (!isElectronics && !isPharmacy && !isClothing && !isLiquor)) && orderItems.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label" style={{ marginBottom: '0.5rem' }}>Items in this Order</label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Details</th>
                            <th>Cost</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '500', fontSize: '0.8rem' }}>
                                {item.type === 'PHONE' ? `${item.brand} ${item.model}` : item.type === 'ACCESSORY' ? `${item.group} - ${item.name}` : item.clothingBrand ? `${item.name || item.brand}` : item.brandName ? [item.brandName, item.genericName].filter(Boolean).join(' ') : item.name || 'Liquor Item'}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                {item.type === 'PHONE' ? `${item.color} / ${item.storage} / IMEI: ${item.imei}` : item.clothingBrand ? (item.quantity > 1 ? `${item.quantity} variants, e.g. ${getFirstVariant(item.clothingVariants)}` : item.clothingVariants ? getFirstVariant(item.clothingVariants) : '') : item.batchNumber ? `Batch: ${item.batchNumber} / Qty: ${item.quantity}` : item.size ? `${item.size}ml / Qty: ${item.quantity}` : `Qty: ${item.quantity}`}
                              </td>
                              <td style={{ fontWeight: '600', fontSize: '0.8rem' }}>{formatCurr(item.totalCost || item.purchaseCost)}</td>
                              <td>
                                <button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="btn btn-danger" style={{ padding: '0.25rem' }}>
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <span style={{ fontWeight: '600' }}>Total:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                    {formatCurr(orderItems.reduce((sum, item) => sum + ((item.totalCost || item.purchaseCost || 0) * (item.quantity || 1)), 0))}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Order</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="modal-overlay" onClick={() => setShowAddSupplier(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New Supplier</h2>
              <button onClick={() => setShowAddSupplier(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleCreateSupplier()} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" className="input" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" className="input" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
<div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={handleCreateSupplier} className="btn btn-primary">Add Supplier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New Category</h2>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div>
              <input type="text" className="input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCategory()} placeholder="Category name" autoFocus />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={createCategory} className="btn btn-primary">Add Category</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div className="modal-overlay" onClick={() => setShowBrandModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New Brand</h2>
              <button onClick={() => setShowBrandModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div>
              <input type="text" className="input" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createBrand()} placeholder="Brand name" autoFocus />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowBrandModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={createBrand} className="btn btn-primary">Add Brand</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBrandManageModal && (
        <div className="modal-overlay" onClick={() => setShowBrandManageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Manage Brands</h2>
              <button onClick={() => setShowBrandManageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {brands.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '1rem' }}>No brands found</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {brands.map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{b.name}</span>
                    <button type="button" onClick={() => deleteBrand(b.id)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Order Review - {selectedOrder.orderNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '1rem', background: 'var(--card)', borderRadius: '0.5rem' }}>
              <div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Supplier</p>
                <p style={{ fontWeight: '600' }}>{selectedOrder.supplierName}</p>
              </div>
              <div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status</p>
                <div>{getStatusBadge(selectedOrder.status, selectedOrder.expectedDelivery)}</div>
              </div>
              <div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Created</p>
                <p>{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Expected Delivery</p>
                <p style={{ color: selectedOrder.expectedDelivery && new Date(selectedOrder.expectedDelivery) < new Date() && selectedOrder.status !== 'RECEIVED' && selectedOrder.status !== 'CANCELLED' ? '#ef4444' : '#f1f5f9', fontWeight: selectedOrder.expectedDelivery && new Date(selectedOrder.expectedDelivery) < new Date() && selectedOrder.status !== 'RECEIVED' && selectedOrder.status !== 'CANCELLED' ? '600' : '400' }}>
                  {selectedOrder.expectedDelivery ? new Date(selectedOrder.expectedDelivery).toLocaleDateString() : 'Not set'}
                  {selectedOrder.expectedDelivery && new Date(selectedOrder.expectedDelivery) < new Date() && selectedOrder.status !== 'RECEIVED' && selectedOrder.status !== 'CANCELLED' && ' (Overdue)'}
                </p>
              </div>
              {selectedOrder.status === 'RECEIVED' && selectedOrder.receivedAt && (
                <div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Received At</p>
                  <p style={{ color: 'var(--success)' }}>{new Date(selectedOrder.receivedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Items</h3>
              {selectedOrder.items?.length > 0 ? (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>Product</th><th>Ordered</th><th>Received</th><th>Unit Cost</th><th>Total</th></tr></thead>
                    <tbody>
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '500' }}>
                            {item.productName}
                            {item.isPendingProduct ? <span style={{ color: 'var(--warning)', fontSize: '0.6rem', display: 'block', fontStyle: 'italic' }}>Pending creation</span> : null}
                            {(item.productImei || item.productBrand || item.productModel) ? <span style={{ color: 'var(--warning)', fontSize: '0.65rem', fontFamily: 'monospace', display: 'block' }}>
                              {[item.productBrand, item.productModel].filter(Boolean).join(' ')} {item.productImei ? `IMEI: ${item.productImei}` : ''}
                            </span> : null}
                          </td>
                          <td>{item.quantityOrdered}</td>
                          <td style={{ color: selectedOrder.status === 'RECEIVED' ? '#22c55e' : '#94a3b8' }}>{item.quantityReceived || 0}</td>
                          <td>{formatCurr(item.unitCost)}</td>
                          <td style={{ fontWeight: '600' }}>{formatCurr(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--muted-foreground)' }}>No items</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontWeight: '600' }}>Total Amount:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>{formatCurr(selectedOrder.totalAmount)}</span>
            </div>
            {selectedOrder.status === 'ORDERED' && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setSelectedOrder(null); openReceiveModal(selectedOrder); }} className="btn btn-success" style={{ background: '#22c55e' }}>
                  <CheckCircle size={16} /> Confirm Received
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && receivingOrder && (
        <div className="modal-overlay" onClick={() => { setShowReceiveModal(false); setReceivingOrder(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Confirm Delivery - {receivingOrder.orderNumber}</h2>
              <button onClick={() => { setShowReceiveModal(false); setReceivingOrder(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Confirm that these items have been delivered. The inventory will be updated automatically.
            </p>
            <div style={{ marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              <table className="table">
                <thead><tr><th>Product</th><th>Ordered</th><th>Receiving</th></tr></thead>
                <tbody>
                  {receivingOrder.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '500' }}>
                        {item.productName}
                        {(item.productImei || item.productBrand || item.productModel) ? <span style={{ color: 'var(--warning)', fontSize: '0.6rem', fontFamily: 'monospace', display: 'block' }}>
                          {[item.productBrand, item.productModel].filter(Boolean).join(' ')} {item.productImei ? `IMEI: ${item.productImei}` : ''}
                        </span> : null}
                      </td>
                      <td>{item.quantityOrdered}</td>
                      <td>
                        <input
                          type="number"
                          className="input"
                          style={{ width: '80px' }}
                          min="0"
                          max={item.quantityOrdered}
                          value={receivedQuantities[item.id] ?? item.quantityOrdered}
                          onChange={e => setReceivedQuantities({ ...receivedQuantities, [item.id]: parseInt(e.target.value) || 0 })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowReceiveModal(false); setReceivingOrder(null); }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleReceiveOrder} className="btn btn-success" style={{ background: '#22c55e' }}>
                <CheckCircle size={16} /> Confirm & Update Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
