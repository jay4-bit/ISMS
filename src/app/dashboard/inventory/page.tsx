'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Plus, Search, Edit, Trash2, X, Camera, 
  Barcode, Printer, Tag, AlertTriangle, TrendingUp, 
  TrendingDown, DollarSign, ShoppingCart, Settings,
  CameraOff, Zap, Hash, ScanLine, FolderPlus, Lock, Eye, Upload, Download,
  Smartphone, Headphones, Wrench
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { ElectronicsPhoneForm, ElectronicsAccessoryForm } from '@/components/ElectronicsForms';

interface ElectronicsFieldsRecord {
  imei?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  color?: string | null;
  storage?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  category?: { id: string; name: string };
  supplierId?: string;
  supplier?: { id: string; name: string; email?: string; phone?: string; address?: string; contactPerson?: string };
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  isFaulty: boolean;
  hasExpiry: boolean;
  expiryDate?: string;
  taxRate: number;
  location?: string;
  weight?: number;
  imageUrl?: string;
  variant?: string;
  variantType?: string;
  brand?: string;
  createdAt: string;
  updatedAt: string;
  electronicsFields?: ElectronicsFieldsRecord | null;
  pharmacyFields?: {
    brandName?: string;
    genericName?: string;
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    dosage?: string;
    composition?: string;
    manufacturer?: string;
    prescriptionRequired?: boolean;
    requiresColdStorage?: boolean;
    drugSchedule?: string;
    sideEffects?: string;
    contraindications?: string;
    interactionWarnings?: string;
    storageInstructions?: string;
  } | null;
  liquorFields?: {
    brand?: string;
    size?: number;
    volume?: number;
    notes?: string;
  } | null;
  clothingFields?: {
    brand?: string;
    size?: string;
    color?: string;
    material?: string;
    season?: string;
    gender?: string;
    pattern?: string;
  } | null;
  variants?: Array<{
    variantValue: string;
    sku: string;
    stockQuantity: number;
    sellingPrice: number;
  }>;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PriceTagTemplate {
  showBarcode: boolean;
  showPrice: boolean;
  showName: boolean;
  showSku: boolean;
  copies: number;
}

const VARIANT_TYPES = [
  { value: 'COLOR', label: 'Color' },
  { value: 'SIZE', label: 'Size' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'PACK', label: 'Pack' },
  { value: 'FLAVOR', label: 'Flavor' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'OTHER', label: 'Other' },
];

export default function InventoryPage() {
  const { user, shop } = useAuth();
  const router = useRouter();
  const isWinger = user?.role === 'WINGER';
  const isCashier = user?.role === 'CASHIER';
  const isReadOnly = isCashier || isWinger;
  const isPharmacy = shop?.shopType === 'PHARMACY';
  const isLiquor = shop?.shopType === 'LIQUOR';
  const isElectronics = shop?.shopType === 'ELECTRONICS';
  const isClothing = shop?.shopType === 'CLOTHING';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedVariantType, setSelectedVariantType] = useState<string>('all');
  const [selectedVariantValue, setSelectedVariantValue] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPriceTags, setShowPriceTags] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pharmacyFields, setPharmacyFields] = useState({ brandName: '', genericName: '', batchNumber: '', manufacturingDate: '' });
  const [liquorFields, setLiquorFields] = useState({ brand: '', size: '', notes: '' });
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [returnItemMap, setReturnItemMap] = useState<Record<string, string>>({});
  const [fixedProductIds, setFixedProductIds] = useState<Set<string>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showBrandManageModal, setShowBrandManageModal] = useState(false);
  const [showCategoryManageModal, setShowCategoryManageModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '' });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedCode, setScannedCode] = useState('');

  const [electronicsMode, setElectronicsMode] = useState<string>('');
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
  const [tagTemplate, setTagTemplate] = useState<PriceTagTemplate>({
    showBarcode: true,
    showPrice: true,
    showName: true,
    showSku: true,
    copies: 1
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', description: '', categoryId: '', supplierId: '',
    purchaseCost: '', sellingPrice: '', wholesalePrice: '', stockQuantity: '',
    lowStockThreshold: '10', reorderPoint: '20', hasExpiry: false, expiryDate: '',
    taxRate: '0', location: '', variant: '', variantType: '', brand: ''
  });
  const [clothingVariants, setClothingVariants] = useState<Array<{variantType: string; variantValue: string}>>([]);
  const [generalVariants, setGeneralVariants] = useState<Array<{variantType: string; variantValue: string}>>([]);

  useEffect(() => { fetchData(); resetElectronicsForm(); }, []);

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
    setClothingVariants([]);
    setGeneralVariants([]);
    setRegisteredPhones([]);
    setCurrentPhoneIndex(0);
    setAccessoryGroup('');
    setAccessoryGroupInput('');
    setAccessoryName('');
    setAccessoryItems([]);
  }

  function resetAccessoryForm() {
    setAccessoryGroup('');
    setAccessoryGroupInput('');
    setAccessoryName('');
    setAccessoryItems([]);
  }

  async function fetchData() {
    console.log('Shop ID:', shop?.id, 'Shop Type:', shop?.shopType);
    try {
      const headers = { 'x-shop-id': shop?.id || '' };
      const [productsRes, categoriesRes, suppliersRes, brandsRes, returnsRes] = await Promise.all([
        fetch('/api/inventory', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/brands', { headers }),
        fetch('/api/returns', { headers })
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const suppliersData = await suppliersRes.json();
      const brandsData = await brandsRes.json();
      const returnsData = await returnsRes.json();
      
      // Build map of productId -> returnItemId for products with return items
      const rMap: Record<string, string> = {};
      for (const r of (returnsData.returns || [])) {
        for (const i of r.items) {
          if (i.productId && i.id) {
            rMap[i.productId] = i.id;
          }
        }
      }
      setReturnItemMap(rMap);

      // Build set of productIds that have been fixed (return item with repairCost > 0)
      const fixedSet = new Set<string>();
      for (const r of (returnsData.returns || [])) {
        for (const i of r.items) {
          if (i.productId && (i.repairCost || 0) > 0) {
            fixedSet.add(i.productId);
          }
        }
      }
      setFixedProductIds(fixedSet);
      
      console.log('=== FRONTEND RECEIVED ===');
      console.log('Products count:', productsData.products?.length);
      if (productsData.products?.length > 0) {
        console.log('First electronicsFields:', productsData.products[0].electronicsFields);
      }
      
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      setBrands(brandsData.brands || []);
      setSuppliers(suppliersData.suppliers || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('scanner-container', { verbose: false, useBarCodeDetectorIfSupported: true,         formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.MAXICODE,
        ],
      });
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 30 },
        (decodedText: string) => {
          const product = products.find(p => p.barcode === decodedText || p.sku === decodedText);
          if (product) {
            openModal(product);
          } else {
            alert(`Product not found for barcode: "${decodedText.trim()}"`);
          }
          stopScanner();
          setShowScanner(false);
        },
        () => {}
      );
      setScannerActive(true);
    } catch (err) {
      console.error('Scanner error:', err);
      alert('Camera not available or permission denied');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setScannerActive(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    if (!shop?.id) {
      alert('Shop not loaded. Please refresh the page.');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-shop-id': shop.id
        },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCategories([...categories, data.category]);
        setNewCategoryName('');
        setShowCategoryModal(false);
      } else {
        alert(data.error + (data.details ? '\n' + data.details : '') || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category: ' + (error as Error).message);
    }
  }

  async function createBrand() {
    if (!newBrandName.trim()) return;
    if (!shop?.id) {
      alert('Shop not loaded. Please refresh the page.');
      return;
    }
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shop.id
        },
        body: JSON.stringify({ name: newBrandName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setBrands([...brands, data.brand]);
        setFormData(prev => ({ ...prev, brand: data.brand.name }));
        setNewBrandName('');
        setShowBrandModal(false);
      } else {
        alert(data.error + (data.details ? '\n' + data.details : '') || 'Failed to create brand');
      }
    } catch (error) {
      console.error('Failed to create brand:', error);
      alert('Failed to create brand: ' + (error as Error).message);
    }
  }

  async function deleteBrand(id: string) {
    if (!confirm('Delete this brand?')) return;
    try {
      const res = await fetch(`/api/brands?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      if (res.ok) {
        setBrands(brands.filter(b => b.id !== id));
      } else {
        alert('Failed to delete brand');
      }
    } catch (error) {
      console.error('Failed to delete brand:', error);
      alert('Failed to delete brand');
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  }

  async function createSupplier() {
    if (!newSupplier.name.trim()) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-shop-id': shop?.id || ''
        },
        body: JSON.stringify(newSupplier)
      });
      const data = await res.json();
      if (res.ok) {
        setSuppliers([...suppliers, data.supplier]);
        setFormData({ ...formData, supplierId: data.supplier.id });
        setNewSupplier({ name: '', email: '', phone: '', address: '' });
        setShowSupplierModal(false);
      } else {
        alert(data.error || 'Failed to create supplier');
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
      alert('Failed to create supplier');
    }
  }

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const barcodeMatch = (p.barcode ?? '').toLowerCase().includes(q);
    const ef = p.electronicsFields;
    const electronicsMatch =
      isElectronics &&
      !!ef &&
      [ef.imei, ef.brand, ef.model, ef.condition, ef.color, ef.storage]
        .some((v) => v != null && String(v).toLowerCase().includes(q));
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      barcodeMatch ||
      electronicsMatch;
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const productBrand = ((p as any).clothingFields?.brand || '').toLowerCase();
    const matchesBrand = selectedBrand === 'all' || productBrand === selectedBrand.toLowerCase();
    const productVariants = ((p as any).variants || []).map((v: any) => v.variantValue.toLowerCase());
    const matchesVariantType = selectedVariantType === 'all' || productVariants.some((v: string) => v.startsWith(selectedVariantType.toLowerCase()));
    const matchesVariantValue = selectedVariantValue === 'all' || productVariants.some((v: string) => v === selectedVariantValue.toLowerCase());
    const matchesVariant = matchesVariantType && matchesVariantValue;
    return matchesSearch && matchesCategory && matchesBrand && matchesVariant;
  });

  function openModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        description: product.description || '',
        categoryId: product.categoryId,
        supplierId: product.supplierId || '',
        purchaseCost: product.purchaseCost.toString(),
        sellingPrice: product.sellingPrice.toString(),
        wholesalePrice: product.wholesalePrice?.toString() || '',
        stockQuantity: product.stockQuantity.toString(),
        lowStockThreshold: product.lowStockThreshold.toString(),
        reorderPoint: product.reorderPoint.toString(),
        hasExpiry: product.hasExpiry,
        expiryDate: product.expiryDate || '',
        taxRate: product.taxRate.toString(),
        location: product.location || '',
        variant: product.variant || '',
        variantType: product.variantType || '',
        brand: product.brand || '',
      });
      setPharmacyFields({
        brandName: (product as any).pharmacyFields?.brandName || '',
        genericName: (product as any).pharmacyFields?.genericName || '',
        batchNumber: (product as any).pharmacyFields?.batchNumber || '',
        manufacturingDate: (product as any).pharmacyFields?.manufacturingDate
          ? new Date((product as any).pharmacyFields.manufacturingDate).toISOString().split('T')[0]
          : ''
      });
      if (isLiquor) {
        const lf = (product as any).liquorFields || {};
        setLiquorFields({
          brand: lf.brand || '',
          size: lf.size?.toString() || '',
          notes: lf.notes || '',
        });
      }
      if (isElectronics) {
        const ef = product.electronicsFields;
        if (ef) {
          if (ef.imei || ef.storage) {
            setElectronicsMode('PHONES');
            setPhoneBrand(ef.brand || '');
            setPhoneModel(ef.model || '');
            setPhoneCondition(ef.condition || '');
            setPhoneColor(ef.color || '');
            setPhoneStorage(ef.storage || '');
            setPhoneImei(ef.imei || '');
            setPhoneQuantity(1);
            setRegisteredPhones([]);
            setCurrentPhoneIndex(0);
          } else {
            setElectronicsMode('ACCESSORIES');
            setAccessoryGroup(ef.brand || '');
            setAccessoryName(ef.model || '');
            setAccessoryItems([]);
          }
        } else {
          setElectronicsMode('');
          resetElectronicsForm();
        }
      }
      if (isClothing) {
        const cf = (product as any).clothingFields || {};
        const pv = (product as any).variants || [];
        setFormData(prev => ({ ...prev, brand: cf.brand || '' }));
        setClothingVariants(pv.map((v: any) => {
          const parts = (v.variantValue || '').split(': ');
          return {
            variantType: parts.length > 1 ? parts[0] : 'SIZE',
            variantValue: parts.length > 1 ? parts.slice(1).join(': ') : parts[0],
          };
        }));
      }
      if (!isPharmacy && !isLiquor && !isElectronics && !isClothing) {
        const pv = (product as any).variants || [];
        setGeneralVariants(pv.map((v: any) => {
          const parts = (v.variantValue || '').split(': ');
          return {
            variantType: parts.length > 1 ? parts[0] : 'OTHER',
            variantValue: parts.length > 1 ? parts.slice(1).join(': ') : parts[0],
          };
        }));
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', sku: '', barcode: '', description: '', 
        categoryId: categories[0]?.id || '', supplierId: '',
        purchaseCost: '', sellingPrice: '', wholesalePrice: '', 
        stockQuantity: '', lowStockThreshold: '10', reorderPoint: '20',
        hasExpiry: false, expiryDate: '', taxRate: '0', location: '',
        variant: '', variantType: '', brand: ''
      });
      setPharmacyFields({ brandName: '', genericName: '', batchNumber: '', manufacturingDate: '' });
      setLiquorFields({ brand: '', size: '', notes: '' });
      if (isElectronics) { resetElectronicsForm(); }
      setGeneralVariants([]);
    }
    setShowModal(true);
  }

  function handleBarcodeScan(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && barcodeInput) {
      const product = products.find(p => p.barcode === barcodeInput || p.sku === barcodeInput);
      if (product) {
        openModal(product);
      } else {
        setFormData(prev => ({ ...prev, barcode: barcodeInput, sku: barcodeInput }));
        setShowModal(true);
      }
      setBarcodeInput('');
    }
  }

  function generateBarcode() {
    const code = 'SKU' + Date.now().toString(36).toUpperCase();
    setFormData(prev => ({ ...prev, barcode: code }));
  }

  function toggleProductSelection(productId: string) {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  function selectAllProducts() {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  }

  function printPriceTags() {
    const selected = products.filter(p => selectedProducts.includes(p.id));
    if (selected.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const generateAllBarcodes = async () => {
      const JsBarcode = (await import('jsbarcode')).default;
      const tagsHtml: string[] = [];
      
      for (let i = 0; i < selected.length; i++) {
        const product = selected[i];
        const code = product.barcode || product.sku || '0000000000000';
        
        for (let copy = 0; copy < tagTemplate.copies; copy++) {
          let barcodeImg = '';
          try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, code, {
              format: 'EAN13',
              width: 2,
              height: 40,
              displayValue: true,
              fontSize: 10,
              margin: 0,
              background: 'var(--primary-foreground)',
              lineColor: '#000000'
            });
            barcodeImg = canvas.toDataURL('image/png');
          } catch (e) {
            barcodeImg = '';
          }
          
          tagsHtml.push(`
            <div class="tag">
              ${tagTemplate.showName ? `<div class="tag-name">${product.name}</div>` : ''}
              ${tagTemplate.showPrice ? `<div class="tag-price">${formatCurrency(product.sellingPrice)}</div>` : ''}
              ${tagTemplate.showSku ? `<div class="tag-sku">SKU: ${product.sku}</div>` : ''}
              ${tagTemplate.showBarcode && barcodeImg ? `<div class="tag-barcode"><img src="${barcodeImg}" /></div>` : ''}
            </div>
          `);
        }
      }
      return tagsHtml.join('');
    };

    generateAllBarcodes().then(tagsHtml => {
      let html = `
        <html>
        <head>
          <title>Price Tags - Barcode Labels</title>
          <style>
            @page {
              margin: 0;
              size: 58mm auto;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 2mm;
              }
              .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 2mm;
              }
              .tag { 
                width: 52mm;
                min-height: 22mm;
                padding: 2mm;
                display: inline-block; 
                text-align: center;
                font-family: Arial, sans-serif;
                page-break-inside: avoid;
                box-sizing: border-box;
              }
              .tag-name { font-weight: bold; font-size: 10px; line-height: 1.2; margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 48mm; }
              .tag-price { font-size: 14px; font-weight: bold; color: #000; margin: 1px 0; }
              .tag-sku { font-size: 8px; color: #666; }
              .tag-barcode { margin-top: 2px; }
              .tag-barcode img { max-width: 100%; height: 25mm; }
            }
            @media screen {
              body { 
                background: #f0f0f0; 
                padding: 20px;
              }
              .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                justify-content: center;
              }
              .tag { 
                width: 52mm;
                min-height: 22mm;
                padding: 5px;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                display: inline-block; 
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .tag-name { font-weight: bold; font-size: 10px; line-height: 1.2; margin-bottom: 1px; }
              .tag-price { font-size: 14px; font-weight: bold; color: #000; margin: 1px 0; }
              .tag-sku { font-size: 8px; color: #666; }
              .tag-barcode { margin-top: 2px; }
              .tag-barcode img { max-width: 100%; height: 25mm; }
            }
          </style>
        </head>
        <body>
          <div class="tags-container">
            ${tagsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = '/api/inventory';
      const method = editingProduct ? 'PUT' : 'POST';
      const extraFields = isPharmacy ? pharmacyFields : isLiquor ? liquorFields : {};
      const payload: any = { ...formData, ...extraFields };
      if ((isClothing || (!isPharmacy && !isLiquor && !isElectronics && !isClothing)) && generalVariants.length > 0) {
        payload.variants = generalVariants;
      }
      if (isClothing && clothingVariants.length > 0) {
        payload.variants = clothingVariants;
      }
      if (isClothing) {
        payload.clothingFields = { brand: formData.brand || '' };
      }
      const body = editingProduct ? { ...payload, id: editingProduct.id } : payload;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-shop-id': shop?.id || ''
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error + (data.details ? '\n' + data.details : ''));
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save product');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/inventory?id=${id}`, { 
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  const lowStockProducts = filteredProducts.filter(p => p.stockQuantity <= p.lowStockThreshold && !p.isFaulty);
  const outOfStock = filteredProducts.filter(p => p.stockQuantity === 0 && !p.isFaulty);
  const reorderNeeded = filteredProducts.filter(p => p.stockQuantity <= p.reorderPoint && !p.isFaulty);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="inventory-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Inventory</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Manage products</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isReadOnly && (
            <>
              <button onClick={() => setShowScanner(true)} className="btn btn-secondary" title="Scan Barcode" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Camera size={16} /> Scan
              </button>
              <button onClick={() => setShowPriceTags(true)} className="btn btn-secondary" title="Print Price Tags" disabled={selectedProducts.length === 0} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Tag size={16} /> Tags ({selectedProducts.length})
              </button>
              <button onClick={() => setShowImportModal(true)} className="btn btn-secondary" title="Import from Excel" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Upload size={16} /> Import
              </button>
              <button 
                onClick={async () => {
                  try {
                    const XLSX = await import('xlsx');
                    const exportData = products.map(p => ({
                      name: p.name,
                      sku: p.sku,
                      ...(isPharmacy ? {
                        brandName: (p as any).pharmacyFields?.brandName || '',
                        genericName: (p as any).pharmacyFields?.genericName || '',
                        batchNumber: (p as any).pharmacyFields?.batchNumber || '',
                        manufacturingDate: (p as any).pharmacyFields?.manufacturingDate || '',
                        expiryDate: p.expiryDate || '',
                        buyingPrice: p.purchaseCost,
                        sellingPrice: p.sellingPrice,
                        quantity: p.stockQuantity
                      } : {
                        barcode: p.barcode || '',
                        description: p.description || '',
                        category: p.category?.name || '',
                        purchaseCost: p.purchaseCost,
                        sellingPrice: p.sellingPrice,
                        wholesalePrice: p.wholesalePrice || '',
                        stockQuantity: p.stockQuantity,
                        lowStockThreshold: p.lowStockThreshold,
                        reorderPoint: p.reorderPoint,
                        taxRate: p.taxRate,
                        location: p.location || '',
                        hasExpiry: p.hasExpiry,
                        expiryDate: p.expiryDate || ''
                      })
                    }));
                    
                    const worksheet = XLSX.utils.json_to_sheet(exportData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                    
                    const date = new Date().toISOString().split('T')[0];
                    XLSX.writeFile(workbook, `inventory-export-${date}.xlsx`);
                  } catch (err) {
                    console.error('Export error:', err);
                    alert('Failed to export. Please try again.');
                  }
                }} 
                className="btn btn-secondary" 
                title="Export to Excel" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Download size={16} /> Export
              </button>
              <button 
                onClick={async () => {
                  const productsWithoutBarcode = products.filter(p => !p.barcode);
                  if (productsWithoutBarcode.length === 0) {
                    alert('All products already have barcodes!');
                    return;
                  }
                  if (!confirm(`Generate barcodes for ${productsWithoutBarcode.length} products?`)) return;
                  
                  try {
                    const res = await fetch('/api/inventory?action=generateBarcodes', { 
                      method: 'PATCH',
                      headers: { 'x-shop-id': shop?.id || '' }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert(`Generated ${data.updated} barcodes successfully!`);
                      fetchData();
                    } else {
                      alert('Failed to generate barcodes');
                    }
                  } catch (err) {
                    console.error('Generate error:', err);
                    alert('Failed to generate barcodes');
                  }
                }} 
                className="btn btn-secondary" 
                title="Generate Barcodes for products without barcodes" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Barcode size={16} /> Generate Barcodes
              </button>
              <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Plus size={16} /> Add
              </button>
            </>
          )}
          </div>
          {isWinger && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'color-mix(in srgb, var(--success) 12.5%, transparent)', borderRadius: '0.375rem', color: 'var(--success)' }}>
              <Eye size={14} />
              <span style={{ fontSize: '0.75rem' }}>View Only - Wholesale</span>
            </div>
          )}
          {isCashier && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'color-mix(in srgb, var(--primary) 12.5%, transparent)', borderRadius: '0.375rem', color: 'var(--primary)' }}>
              <Eye size={14} />
              <span style={{ fontSize: '0.75rem' }}>View Only</span>
            </div>
          )}
        </div>

      <div className="grid-cols-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card" style={{ border: lowStockProducts.length ? '1px solid var(--warning)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color={lowStockProducts.length ? 'var(--warning)' : 'var(--success)'} />
            <div>
              <div className="stat-value" style={{ color: lowStockProducts.length ? 'var(--warning)' : undefined }}>{lowStockProducts.length}</div>
              <div className="stat-label">Low Stock</div>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ border: outOfStock.length ? '1px solid #ef4444' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color={outOfStock.length ? 'var(--destructive)' : 'var(--success)'} />
            <div>
              <div className="stat-value" style={{ color: outOfStock.length ? 'var(--destructive)' : undefined }}>{outOfStock.length}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingDown size={20} color="var(--primary)" />
            <div>
              <div className="stat-value">{reorderNeeded.length}</div>
              <div className="stat-label">Reorder Needed</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{formatCurrency(filteredProducts.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0))}</div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="category-filters" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid',
            borderColor: selectedCategory === 'all' ? 'var(--primary)' : 'var(--border)',
            background: selectedCategory === 'all' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--card)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.75rem',
          }}
        >
          All ({products.length})
        </button>
        {(isClothing || isPharmacy ? categories : categories.filter(cat => ['Whisky','Whiskey','Beer','Wine','Vodka','Gin','Rum','Brandy','Champagne','Spirits','Liqueur','Tequila','Cider','Sake','Cocktail Mixers','Accessories','Fortified Wine','Vermouth'].includes(cat.name))).map(cat => {
          const count = products.filter(p => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid',
                borderColor: selectedCategory === cat.id ? 'var(--primary)' : 'var(--border)',
                background: selectedCategory === cat.id ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--card)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.75rem',
              }}
            >
              {cat.name} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setShowCategoryModal(true)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px dashed #475569',
            background: 'transparent',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <FolderPlus size={14} /> Add
        </button>
        <button type="button" onClick={() => setShowCategoryManageModal(true)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: '0.25rem' }}>Manage Categories</button>
      </div>

      {isClothing && (
        <div className="clothing-filters" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" style={{ width: '150px', padding: '0.35rem', fontSize: '0.8rem' }} value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
            <option value="all">All Brands</option>
            {[...new Set(products.map(p => ((p as any).clothingFields?.brand || '')).filter(Boolean))].sort().map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select className="select" style={{ width: '130px', padding: '0.35rem', fontSize: '0.8rem' }} value={selectedVariantType} onChange={e => { setSelectedVariantType(e.target.value); setSelectedVariantValue('all'); }}>
            <option value="all">All Types</option>
            {[...new Set(products.flatMap(p => ((p as any).variants || []).map((v: any) => v.variantValue.split(': ')[0])))].filter(Boolean).sort().map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className="select" style={{ width: '150px', padding: '0.35rem', fontSize: '0.8rem' }} value={selectedVariantValue} onChange={e => setSelectedVariantValue(e.target.value)} disabled={selectedVariantType === 'all'}>
            <option value="all">All Values</option>
            {selectedVariantType !== 'all' && [...new Set(products.flatMap(p => ((p as any).variants || []).map((v: any) => v.variantValue)).filter((v: string) => v.startsWith(selectedVariantType + ': ')))].sort().map(v => (
              <option key={v} value={v}>{v.split(': ')[1]}</option>
            ))}
          </select>
        </div>
      )}

      <div className="card search-bar" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.5rem', paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '150px' }}>
              <ScanLine size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                className="input"
                placeholder="Scan..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                style={{ padding: '0.5rem', paddingLeft: '34px', fontSize: '0.85rem' }}
              />
            </div>
            <button onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '0.4rem', color: 'var(--secondary-foreground)', cursor: 'pointer' }} title="Scan with camera">
              <Camera size={16} />
            </button>
          </div>
        </div>
        {selectedProducts.length > 0 && !isReadOnly && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={selectedProducts.length === products.length} 
              onChange={selectAllProducts}
            />
            <span style={{ fontSize: '0.8rem' }}>{selectedProducts.length} selected</span>
            <button onClick={printPriceTags} className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
              <Printer size={12} /> Print
            </button>
          </div>
        )}
      </div>

      <div className="card table-responsive" style={{ padding: 0 }}>
        {isPharmacy ? (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card)' }}>
                <th style={{ minWidth: '160px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>CATEGORY</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>BRAND</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>BATCH</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>EXPIRY</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>BUYING</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>SELLING</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>STOCK</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const pf = (product as any).pharmacyFields || {};
                const expiryDate = product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-';
                return (
                  <tr key={product.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.8rem' }}>{product.name}</div>
                    </td>
                    <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{pf.brandName || '-'}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{pf.batchNumber || '-'}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{expiryDate}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{formatCurrency(product.purchaseCost, shop?.currency ?? 'TZS')}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem' }}>{formatCurrency(product.sellingPrice, shop?.currency ?? 'TZS')}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? 'var(--warning)' : product.stockQuantity === 0 ? 'var(--destructive)' : 'var(--foreground)' }}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }} style={{ padding: '0.3rem', background: '#64748b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="View"><Eye size={12} /></button>
                      {returnItemMap[product.id] && (
                        <button onClick={() => router.push(`/dashboard/expenses?maintenance=1&returnItemId=${returnItemMap[product.id]}&category=MAINTENANCE`)} style={{ padding: '0.3rem', background: '#f59e0b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Fix / Maintenance"><Wrench size={12} /></button>
                      )}
                      {!isReadOnly && (
                          <>
                            <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: 'var(--primary)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Edit"><Edit size={12} /></button>
                            <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: 'var(--destructive)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Delete"><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : isLiquor ? (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card)' }}>
                <th style={{ width: '30%', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ width: '16%', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>CATEGORY</th>
                <th style={{ width: '10%', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>SIZE (ml)</th>
                <th style={{ width: '13%', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>COST PRICE</th>
                <th style={{ width: '13%', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>SELLING PRICE</th>
                <th style={{ width: '8%', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>STOCK</th>
                <th style={{ width: '10%', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                  <td style={{ padding: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.8rem' }}>{product.name}</div>
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{(product as any).liquorFields?.size ? `${(product as any).liquorFields.size}ml` : '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatCurrency(product.purchaseCost, shop?.currency ?? 'TZS')}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatCurrency(product.sellingPrice, shop?.currency ?? 'TZS')}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? 'var(--warning)' : product.stockQuantity === 0 ? 'var(--destructive)' : 'var(--foreground)' }}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }} style={{ padding: '0.3rem', background: '#64748b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="View"><Eye size={12} /></button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: 'var(--primary)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Edit"><Edit size={12} /></button>
                          <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: 'var(--destructive)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Delete"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : isElectronics ? (
          <div className="card table-responsive electronics-table" style={{ padding: 0 }}>
            <div className="electronics-header" style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                <div className="search-wrap" style={{ position: 'relative', minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                  <input
                    type="text"
                    placeholder="Search product, IMEI, brand..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              {!isReadOnly && (
                <button onClick={() => openModal()} className="btn btn-primary">
                  <Plus size={16} /> Add Product
                </button>
              )}
            </div>
            <table className="table" style={{ fontSize: '0.85rem', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--background)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>#</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>PRODUCT</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>IMEI</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>BRAND</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>MODEL</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>COND</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>COLOR</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>STORAGE</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>COST</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>PRICE</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>STOCK</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>STATUS</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid var(--border)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <div>No products found</div>
                    </td>
                  </tr>
                ) : filteredProducts.map((product, index) => {
                  const ef = product.electronicsFields;
                  const stockStatus = product.isFaulty ? 'Faulty' : fixedProductIds.has(product.id) ? 'Fixed' : product.stockQuantity === 0 ? 'Out of Stock' : product.stockQuantity <= product.lowStockThreshold ? 'Low Stock' : 'In Stock';
                  const stockColor = product.isFaulty ? '#a855f7' : fixedProductIds.has(product.id) ? '#06b6d4' : product.stockQuantity === 0 ? 'var(--destructive)' : product.stockQuantity <= product.lowStockThreshold ? 'var(--warning)' : 'var(--success)';
                  const condColor = ef?.condition === 'NEW' ? 'var(--success)' : ef?.condition === 'USED' ? 'var(--warning)' : 'var(--primary)';
                  return (
                    <tr key={product.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)', transition: 'background 0.2s' }} className="table-row">
                      <td style={{ padding: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{index + 1}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{product.name || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{product.category?.name || ''}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{ef?.imei || ''}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--foreground)' }}>{ef?.brand || ''}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--muted-foreground)' }}>{ef?.model || ''}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {ef?.condition ? (
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', background: `${condColor}20`, color: condColor, fontSize: '0.7rem', fontWeight: '600' }}>
                            {ef.condition}
                          </span>
                        ) : ''}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ef?.color && (
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: ef.color.toLowerCase(), border: '1px solid var(--border)' }} />
                          )}
                          <span>{ef?.color || ''}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{ef?.storage || ''}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--muted-foreground)' }}>{formatCurrency(product.purchaseCost, shop?.currency ?? 'TZS')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>{formatCurrency(product.sellingPrice, shop?.currency ?? 'TZS')}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: stockColor }}>{product.stockQuantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', background: `${stockColor}20`, color: stockColor, fontSize: '0.7rem', fontWeight: '500' }}>
                          {stockStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }} style={{ padding: '0.4rem', background: '#64748b', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }} title="View"><Eye size={14} /></button>
                          {returnItemMap[product.id] && (
                            <button onClick={() => router.push(`/dashboard/expenses?maintenance=1&returnItemId=${returnItemMap[product.id]}&category=MAINTENANCE`)} style={{ padding: '0.4rem', background: '#f59e0b', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }} title="Fix / Maintenance"><Wrench size={14} /></button>
                          )}
                          {!isReadOnly && (
                            <>
                              <button onClick={() => openModal(product)} style={{ padding: '0.4rem', background: 'var(--primary)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }} title="Edit"><Edit size={14} /></button>
                              <button onClick={() => handleDelete(product.id)} style={{ padding: '0.4rem', background: 'var(--destructive)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }} title="Delete"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length > 0 && (
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                <div>Showing {filteredProducts.length} of {products.length} products</div>
              </div>
            )}
          </div>
        ) : isWinger ? (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card)' }}>
                <th style={{ minWidth: '200px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ width: '120px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>BARCODE</th>
                <th style={{ width: '100px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>CATEGORY</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>LOCATION</th>
                <th style={{ width: '90px', padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>WHOLESALE</th>
                <th style={{ width: '60px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>STOCK</th>
                <th style={{ width: '80px', padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.8rem' }}>{product.name}</div>
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{product.barcode || '-'}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.location || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem' }}>
                    {formatCurrency(product.wholesalePrice || product.sellingPrice)}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? 'var(--warning)' : product.stockQuantity === 0 ? 'var(--destructive)' : 'var(--foreground)' }}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }} style={{ padding: '0.3rem', background: '#64748b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="View"><Eye size={12} /></button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: 'var(--primary)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit"><Edit size={12} /></button>
                          <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: 'var(--destructive)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card)' }}>
                <th style={{ minWidth: '140px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>PRODUCT</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>BRAND</th>
                <th style={{ minWidth: '180px', padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>VARIANT</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>BARCODE</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>CATEGORY</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>COST</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>PRICE</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>STOCK</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.8rem' }}>{product.name}</div>
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.brand || '-'}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{product.variants && product.variants.length > 0 ? product.variants.map(v => v.variantValue).join(', ') : product.variant || '-'}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{product.barcode || '-'}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{product.category?.name || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{formatCurrency(product.purchaseCost, shop?.currency ?? 'TZS')}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem' }}>{formatCurrency(product.sellingPrice, shop?.currency ?? 'TZS')}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', color: product.stockQuantity <= product.lowStockThreshold ? 'var(--warning)' : product.stockQuantity === 0 ? 'var(--destructive)' : 'var(--foreground)' }}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button onClick={() => { setViewingProduct(product); setShowViewModal(true); }} style={{ padding: '0.3rem', background: '#64748b', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="View"><Eye size={12} /></button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => openModal(product)} style={{ padding: '0.3rem', background: 'var(--primary)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Edit"><Edit size={12} /></button>
                          <button onClick={() => handleDelete(product.id)} style={{ padding: '0.3rem', background: 'var(--destructive)', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer' }} title="Delete"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {isPharmacy ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Supplier</label>
                    <select className="select" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                      <option value="">Select supplier</option>
                      {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Brand Name</label>
                      <input type="text" className="input" value={pharmacyFields.brandName} onChange={e => {
                        const brandName = e.target.value;
                        setPharmacyFields({ ...pharmacyFields, brandName });
                        if (!editingProduct) {
                          const gen = pharmacyFields.genericName;
                          const name = [brandName, gen].filter(Boolean).join(' ');
                          setFormData(prev => ({ ...prev, name, sku: name ? `SKU-${name.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` : '' }));
                        }
                      }} placeholder="e.g., Panadol" />
                    </div>
                    <div>
                      <label className="label">Generic Name</label>
                      <input type="text" className="input" value={pharmacyFields.genericName} onChange={e => {
                        const genericName = e.target.value;
                        setPharmacyFields({ ...pharmacyFields, genericName });
                        if (!editingProduct) {
                          const brand = pharmacyFields.brandName;
                          const name = [brand, genericName].filter(Boolean).join(' ');
                          setFormData(prev => ({ ...prev, name, sku: name ? `SKU-${name.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` : '' }));
                        }
                      }} placeholder="e.g., Paracetamol" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Category</label>
                    <select className="select" value={formData.categoryId} onChange={e => { if (e.target.value === '__add_new__') { setShowCategoryModal(true); } else { setFormData({ ...formData, categoryId: e.target.value }); } }} required>
                      <option value="">Select category</option>
                      {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                      <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Batch Number</label>
                    <input type="text" className="input" value={pharmacyFields.batchNumber} onChange={e => setPharmacyFields({ ...pharmacyFields, batchNumber: e.target.value })} placeholder="Batch number" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Manufacturing Date</label>
                      <input type="date" className="input" value={pharmacyFields.manufacturingDate} onChange={e => setPharmacyFields({ ...pharmacyFields, manufacturingDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Expiry Date</label>
                      <input type="date" className="input" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Buying Price *</label>
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
                      <label className="label">Quantity</label>
                      <input type="number" className="input" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Low Stock Alert</label>
                      <input type="number" className="input" value={formData.lowStockThreshold} onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Reorder Point</label>
                      <input type="number" className="input" value={formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Description</label>
                    <input type="text" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </>
              ) : isLiquor ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Product Name *</label>
                      <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select className="select" value={formData.categoryId} onChange={e => { if (e.target.value === '__add_new__') { setShowCategoryModal(true); } else { setFormData({ ...formData, categoryId: e.target.value }); } }} required>
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
                      <select className="select" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                        <option value="">Select supplier</option>
                        {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                      </select>
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
                </>
              ) : isElectronics ? (
                <>
                  {electronicsMode === '' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>What would you like to add?</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Select the category below</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button onClick={() => { setElectronicsMode('PHONES'); setShowModal(true); }} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #3b82f6', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Smartphone size={40} color="var(--primary)" />
                          <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Phones</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>iPhone, Samsung, etc.</span>
                        </button>
                        <button onClick={() => { setElectronicsMode('ACCESSORIES'); setShowModal(true); }} style={{ padding: '1.5rem', background: 'var(--card)', border: '2px solid #22c55e', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Headphones size={40} color="#22c55e" />
                          <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>Accessories</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Chargers, Cases, etc.</span>
                        </button>
                      </div>
                    </div>
                  ) : electronicsMode === 'PHONES' ? (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      <ElectronicsPhoneForm
                        suppliers={suppliers}
                        shop={shop}
                        phoneBrands={phoneBrands}
                        setPhoneBrands={setPhoneBrands}
                        phoneCondition={phoneCondition}
                        setPhoneCondition={setPhoneCondition}
                        phoneBrand={phoneBrand}
                        setPhoneBrand={setPhoneBrand}
                        phoneBrandInput={phoneBrandInput}
                        setPhoneBrandInput={setPhoneBrandInput}
                        phoneModel={phoneModel}
                        setPhoneModel={setPhoneModel}
                        phoneQuantity={phoneQuantity}
                        setPhoneQuantity={setPhoneQuantity}
                        phoneColor={phoneColor}
                        setPhoneColor={setPhoneColor}
                        phoneStorage={phoneStorage}
                        setPhoneStorage={setPhoneStorage}
                        phoneImei={phoneImei}
                        setPhoneImei={setPhoneImei}
                        registeredPhones={registeredPhones}
                        setRegisteredPhones={setRegisteredPhones}
                        currentPhoneIndex={currentPhoneIndex}
                        setCurrentPhoneIndex={setCurrentPhoneIndex}
                        formData={formData}
                        setFormData={setFormData}
                        editingProduct={editingProduct}
                        onCancel={() => { setShowModal(false); setElectronicsMode(''); resetElectronicsForm(); }}
                        onSuccess={() => { fetchData(); setShowModal(false); setElectronicsMode(''); resetElectronicsForm(); }}
                      />
                    </div>
                  ) : electronicsMode === 'ACCESSORIES' ? (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      <ElectronicsAccessoryForm
                        suppliers={suppliers}
                        shop={shop}
                        accessoryGroups={accessoryGroups}
                        setAccessoryGroups={setAccessoryGroups}
                        accessoryGroup={accessoryGroup}
                        setAccessoryGroup={setAccessoryGroup}
                        accessoryGroupInput={accessoryGroupInput}
                        setAccessoryGroupInput={setAccessoryGroupInput}
                        accessoryName={accessoryName}
                        setAccessoryName={setAccessoryName}
                        accessoryItems={accessoryItems}
                        setAccessoryItems={setAccessoryItems}
                        formData={formData}
                        setFormData={setFormData}
                        editingProduct={editingProduct}
                        onCancel={() => { setShowModal(false); setElectronicsMode(''); resetAccessoryForm(); }}
                        onSuccess={() => { fetchData(); setShowModal(false); setElectronicsMode(''); resetAccessoryForm(); }}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Product Name *</label>
                    <input type="text" className="input" value={formData.name} onChange={e => {
                      const name = e.target.value;
                      setFormData({ ...formData, name, sku: editingProduct ? formData.sku : name ? `SKU-${name.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` : '' });
                    }} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isClothing ? '1fr 1fr 1fr 1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Brand</label>
                      <select className="select" value={formData.brand} onChange={e => { if (e.target.value === '__add_new__') { setShowBrandModal(true); } else { setFormData({ ...formData, brand: e.target.value }); } }}>
                        <option value="">Select brand</option>
                        {brands.map(b => (<option key={b.id} value={b.name}>{b.name}</option>))}
                        <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Brand...</option>
                      </select>
                      <button type="button" onClick={() => setShowBrandManageModal(true)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.25rem', textDecoration: 'underline' }}>Manage Brands</button>
                    </div>
                    <div>
                      <label className="label">Barcode</label>
                      <input type="text" className="input" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan or enter barcode" />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select className="select" value={formData.categoryId} onChange={e => { if (e.target.value === '__add_new__') { setShowCategoryModal(true); } else { setFormData({ ...formData, categoryId: e.target.value }); } }} required>
                        <option value="">Select category</option>
                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                        <option value="__add_new__" style={{ color: 'var(--primary)', fontWeight: '600' }}>+ Add New Category...</option>
                      </select>
                    </div>
                    {isClothing && (
                      <div>
                        <label className="label">Stock Quantity</label>
                        <input type="number" className="input" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                      </div>
                    )}
                  </div>
                  {isClothing ? (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h4 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: '600' }}>Product Variants</h4>
                        <button type="button" onClick={() => setClothingVariants([...clothingVariants, { variantType: 'SIZE', variantValue: '' }])} className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          + Add Variant
                        </button>
                      </div>
                      {clothingVariants.length === 0 && (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No variants added. Click "Add Variant" to create product variations (e.g., sizes, colors).</p>
                      )}
                      {clothingVariants.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <select className="select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={v.variantType} onChange={e => { const c = [...clothingVariants]; c[i].variantType = e.target.value; setClothingVariants(c); }}>
                              {VARIANT_TYPES.map(vt => (<option key={vt.value} value={vt.value}>{vt.label}</option>))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <input type="text" className="input" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={v.variantValue} onChange={e => { const c = [...clothingVariants]; c[i].variantValue = e.target.value; setClothingVariants(c); }} placeholder={`e.g., ${v.variantType === 'COLOR' ? 'Red' : v.variantType === 'SIZE' ? '42' : 'value'}`} />
                          </div>
                          <button type="button" onClick={() => setClothingVariants(clothingVariants.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.5rem' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h4 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: '600' }}>Product Variants</h4>
                        <button type="button" onClick={() => setGeneralVariants([...generalVariants, { variantType: 'OTHER', variantValue: '' }])} className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          + Add Variant
                        </button>
                      </div>
                      {generalVariants.length === 0 && (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No variants added. Click "Add Variant" to create product variations (e.g., sizes, colors, pack sizes).</p>
                      )}
                      {generalVariants.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <select className="select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={v.variantType} onChange={e => { const c = [...generalVariants]; c[i].variantType = e.target.value; setGeneralVariants(c); }}>
                              {VARIANT_TYPES.map(vt => (<option key={vt.value} value={vt.value}>{vt.label}</option>))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <input type="text" className="input" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={v.variantValue} onChange={e => { const c = [...generalVariants]; c[i].variantValue = e.target.value; setGeneralVariants(c); }} placeholder={`e.g., ${v.variantType === 'COLOR' ? 'Red' : v.variantType === 'SIZE' ? '42' : 'value'}`} />
                          </div>
                          <button type="button" onClick={() => setGeneralVariants(generalVariants.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.5rem' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Supplier</label>
                    <select className="select" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                      <option value="">Select supplier</option>
                      {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="label">Purchase Cost</label>
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
                      <label className="label">Low Stock Alert</label>
                      <input type="number" className="input" value={formData.lowStockThreshold} onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Reorder Point</label>
                      <input type="number" className="input" value={formData.reorderPoint} onChange={e => setFormData({ ...formData, reorderPoint: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="label">Description</label>
                    <input type="text" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </>
              )}
              {(!isElectronics || !electronicsMode) && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingProduct ? 'Update' : 'Create'}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="modal-overlay" onClick={() => { setShowScanner(false); stopScanner(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Barcode Scanner</h2>
              <button onClick={() => { setShowScanner(false); stopScanner(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <div id="scanner-container" style={{ width: '100%', minHeight: '200px', borderRadius: '0.5rem', overflow: 'hidden', background: '#000' }} />
              {!scannerActive && (
                <button 
                  onClick={startScanner}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none', borderRadius: '0.5rem',
                    color: 'white', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  <Camera size={20} /> Start Camera Scanner
                </button>
              )}
            </div>
            
            <p style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              Or enter barcode manually below
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Enter barcode manually..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scannedCode) {
                    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
                    if (product) openModal(product);
                    else alert('Product not found');
                    setScannedCode('');
                    setShowScanner(false);
                  }
                }}
                autoFocus
              />
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (scannedCode) {
                    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
                    if (product) openModal(product);
                    else alert('Product not found');
                    setScannedCode('');
                    setShowScanner(false);
                  }
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceTags && (
        <div className="modal-overlay" onClick={() => setShowPriceTags(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Price Tag Settings</h2>
              <button onClick={() => setShowPriceTags(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>{selectedProducts.length} products selected</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showName} onChange={(e) => setTagTemplate({ ...tagTemplate, showName: e.target.checked })} />
                <span>Show Product Name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showPrice} onChange={(e) => setTagTemplate({ ...tagTemplate, showPrice: e.target.checked })} />
                <span>Show Price</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showSku} onChange={(e) => setTagTemplate({ ...tagTemplate, showSku: e.target.checked })} />
                <span>Show SKU</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={tagTemplate.showBarcode} onChange={(e) => setTagTemplate({ ...tagTemplate, showBarcode: e.target.checked })} />
                <span>Show Barcode</span>
              </label>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Number of copies per product</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={tagTemplate.copies} 
                  onChange={(e) => setTagTemplate({ ...tagTemplate, copies: parseInt(e.target.value) || 1 })}
                  style={{ 
                    width: '80px', 
                    padding: '0.5rem', 
                    background: 'var(--background)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '0.375rem', 
                    color: 'var(--foreground)',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPriceTags(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={printPriceTags} className="btn btn-primary">
                <Printer size={18} /> Print Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '400px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><FolderPlus size={20} /> Add New Category</h2>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                placeholder="Enter category name"
                style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={createCategory} className="btn btn-primary">
                <Plus size={18} /> Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryManageModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryManageModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><FolderPlus size={20} /> Manage Categories</h2>
              <button onClick={() => setShowCategoryManageModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {categories.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No categories yet.</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {categories.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}>{c.name}</span>
                    <button onClick={() => deleteCategory(c.id)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowCategoryManageModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div className="modal-overlay" onClick={() => setShowBrandModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '400px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><Tag size={20} /> Add New Brand</h2>
              <button onClick={() => setShowBrandModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Brand Name</label>
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createBrand()}
                placeholder="Enter brand name"
                style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBrandModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={createBrand} className="btn btn-primary">
                <Plus size={18} /> Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {showBrandManageModal && (
        <div className="modal-overlay" onClick={() => setShowBrandManageModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><Tag size={20} /> Manage Brands</h2>
              <button onClick={() => setShowBrandManageModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {brands.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No brands yet.</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {brands.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}>{b.name}</span>
                    <button onClick={() => deleteBrand(b.id)} style={{ background: 'none', border: 'none', color: 'var(--destructive)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowBrandManageModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><Plus size={20} /> Add New Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Supplier Name *</label>
              <input
                type="text"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && createSupplier()}
                placeholder="Enter supplier name"
                style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Phone</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="+255..."
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Address</label>
              <input
                type="text"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                placeholder="Supplier address"
                style={{ width: '100%', padding: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={createSupplier} className="btn btn-primary">
                <Plus size={18} /> Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewingProduct && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{viewingProduct.name}</h2>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Basic Information */}
              <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Name</div><div style={{ color: 'var(--foreground)', fontWeight: '500', fontSize: '0.85rem' }}>{viewingProduct.name}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Barcode</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{viewingProduct.barcode || '-'}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Category</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.category?.name || '-'}</div></div>
                  <div style={{ gridColumn: 'span 2' }}><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Description</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.description || '-'}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Weight</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.weight ? `${viewingProduct.weight} kg` : '-'}</div></div>
                </div>
              </div>

              {/* Registration Info */}
              <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Date Registered</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.createdAt ? new Date(viewingProduct.createdAt).toLocaleString() : '-'}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Last Updated</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.updatedAt ? new Date(viewingProduct.updatedAt).toLocaleString() : '-'}</div></div>
                </div>
              </div>

              {/* Supplier Info */}
              <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier</h3>
                {viewingProduct.supplier ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Name</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.supplier.name}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Contact Person</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.supplier.contactPerson || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Email</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.supplier.email || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Phone</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.supplier.phone || '-'}</div></div>
                    <div style={{ gridColumn: 'span 2' }}><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Address</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.supplier.address || '-'}</div></div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No supplier assigned</div>
                )}
              </div>

              {/* Pricing */}
              <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Purchase Cost</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{formatCurrency(viewingProduct.purchaseCost, shop?.currency ?? 'TZS')}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Selling Price</div><div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.85rem' }}>{formatCurrency(viewingProduct.sellingPrice, shop?.currency ?? 'TZS')}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Wholesale Price</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.wholesalePrice ? formatCurrency(viewingProduct.wholesalePrice, shop?.currency ?? 'TZS') : '-'}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Tax Rate</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.taxRate}%</div></div>
                </div>
              </div>

              {/* Stock Info */}
              <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Stock Quantity</div>
                    <div style={{ color: viewingProduct.stockQuantity <= viewingProduct.lowStockThreshold ? 'var(--warning)' : viewingProduct.stockQuantity === 0 ? 'var(--destructive)' : 'var(--foreground)', fontWeight: '600', fontSize: '0.85rem' }}>
                      {viewingProduct.stockQuantity}
                    </div>
                  </div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Status</div>
                    <div>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '500',
                        background: viewingProduct.isFaulty ? '#a855f720' : fixedProductIds.has(viewingProduct.id) ? '#06b6d420' : viewingProduct.stockQuantity === 0 ? 'color-mix(in srgb, var(--destructive) 12.5%, transparent)' : viewingProduct.stockQuantity <= viewingProduct.lowStockThreshold ? 'color-mix(in srgb, var(--warning) 12.5%, transparent)' : 'color-mix(in srgb, var(--success) 12.5%, transparent)',
                        color: viewingProduct.isFaulty ? '#a855f7' : fixedProductIds.has(viewingProduct.id) ? '#06b6d4' : viewingProduct.stockQuantity === 0 ? 'var(--destructive)' : viewingProduct.stockQuantity <= viewingProduct.lowStockThreshold ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {viewingProduct.isFaulty ? 'Faulty' : fixedProductIds.has(viewingProduct.id) ? 'Fixed' : viewingProduct.stockQuantity === 0 ? 'Out of Stock' : viewingProduct.stockQuantity <= viewingProduct.lowStockThreshold ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                  </div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Low Stock Threshold</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.lowStockThreshold}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Reorder Point</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.reorderPoint}</div></div>
                  <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Faulty / Fixed</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.isFaulty ? 'Faulty' : fixedProductIds.has(viewingProduct.id) ? 'Fixed' : 'No'}</div></div>
                </div>
              </div>

              {/* Expiry Info */}
              {viewingProduct.hasExpiry && (
                <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                  <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Has Expiry</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>Yes</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Expiry Date</div><div style={{ color: viewingProduct.expiryDate && new Date(viewingProduct.expiryDate) < new Date() ? 'var(--destructive)' : 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.expiryDate ? new Date(viewingProduct.expiryDate).toLocaleDateString() : '-'}</div></div>
                  </div>
                </div>
              )}

              {/* Pharmacy-specific fields (only for PHARMACY shops) */}
              {isPharmacy && viewingProduct.pharmacyFields && (
                <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                  <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pharmacy Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Brand Name</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.brandName || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Generic Name</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.genericName || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Batch Number</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.batchNumber || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Manufacturer</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.manufacturer || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Dosage</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.dosage || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Composition</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.composition || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Manufacturing Date</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.manufacturingDate ? new Date(viewingProduct.pharmacyFields.manufacturingDate).toLocaleDateString() : '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Drug Schedule</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.drugSchedule || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Prescription Required</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.prescriptionRequired ? 'Yes' : 'No'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Cold Storage Required</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.pharmacyFields.requiresColdStorage ? 'Yes' : 'No'}</div></div>
                  </div>
                </div>
              )}

              {/* Liquor-specific fields */}
              {viewingProduct.liquorFields && (
                <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                  <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liquor Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Brand</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.brand || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Size</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.size ? `${viewingProduct.liquorFields.size}ml` : '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Volume</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.volume ? `${viewingProduct.liquorFields.volume}ml` : '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Notes</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.liquorFields.notes || '-'}</div></div>
                  </div>
                </div>
              )}

              {/* Electronics-specific fields (only for ELECTRONICS shops) */}
              {isElectronics && viewingProduct.electronicsFields && (
                <div style={{ background: 'var(--background)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #1e293b' }}>
                  <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Electronics Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Brand</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.electronicsFields.brand || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Model</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.electronicsFields.model || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>IMEI</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{viewingProduct.electronicsFields.imei || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Condition</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.electronicsFields.condition || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Color</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.electronicsFields.color || '-'}</div></div>
                    <div><div style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Storage</div><div style={{ color: 'var(--foreground)', fontSize: '0.85rem' }}>{viewingProduct.electronicsFields.storage || '-'}</div></div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setShowViewModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
          <div style={{ background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '550px', width: '90%', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: '600' }}><Upload size={20} /> Import Products from Excel</h2>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            {!importResult ? (
              <>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px dashed #475569' }}>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    Upload an Excel file (.xlsx) with the following columns:
                  </p>
                  {isElectronics ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      name, imei, supplier, brand, model, color, storage, condition, purchaseCost, sellingPrice, wholesalePrice, stockQuantity
                    </div>
                  ) : isPharmacy ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      name, sku, brandName, genericName, batchNumber, manufacturingDate, expiryDate, buyingPrice, sellingPrice, wholesalePrice, quantity
                    </div>
                  ) : isLiquor ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      name, category, size, supplier, barcode, purchaseCost, sellingPrice, wholesalePrice, stockQuantity, lowStockThreshold, reorderPoint, expiryDate
                    </div>
                  ) : isClothing ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      name, sku, brand, barcode, category, stockQuantity, variants, supplier, purchaseCost, sellingPrice, wholesalePrice, lowStockThreshold, reorderPoint, description
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      name, sku, barcode, brand, category, supplier, purchaseCost, sellingPrice, wholesalePrice, stockQuantity, lowStockThreshold, reorderPoint, description, variants
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  accept=".xlsx"
                  id="excel-upload"
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
                      
                      const res = await fetch('/api/inventory/import', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'x-shop-id': shop?.id || ''
                        },
                        body: JSON.stringify({ products: json })
                      });
                      
                      const result = await res.json();
                      setImportResult(result);
                      if (result.success > 0) {
                        fetchData();
                      }
                    } catch (err) {
                      console.error('Import error:', err);
                      alert('Failed to import. Make sure the file is a valid Excel file.');
                    } finally {
                      setImporting(false);
                    }
                  }}
                />
                <label
                  htmlFor="excel-upload"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: importing ? 'var(--muted)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    marginBottom: '1rem'
                  }}
                >
                  <Upload size={20} /> {importing ? 'Importing...' : 'Select Excel File'}
                </label>
                
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={async () => {
                      try {
                        const XLSX = await import('xlsx');
                        const sampleData = isPharmacy ? [
                          {
                            name: 'Panadol Extra',
                            sku: 'MED001',
                            brandName: 'Panadol',
                            genericName: 'Paracetamol',
                            batchNumber: 'BATCH001',
                            manufacturingDate: '2025-01-15',
                            expiryDate: '2026-12-31',
                            buyingPrice: 5000,
                            sellingPrice: 8000,
                            wholesalePrice: 7000,
                            quantity: 100
                          },
                          {
                            name: 'Amoxicillin Capsules',
                            sku: 'MED002',
                            brandName: 'Amoxil',
                            genericName: 'Amoxicillin',
                            batchNumber: 'BATCH002',
                            manufacturingDate: '2024-12-01',
                            expiryDate: '2026-06-30',
                            buyingPrice: 15000,
                            sellingPrice: 25000,
                            wholesalePrice: 20000,
                            quantity: 50
                          }
                        ] : isLiquor ? [
                          {
                            name: 'Jameson Irish Whiskey',
                            category: 'Whiskey',
                            size: 750,
                            supplier: 'Distributor A',
                            purchaseCost: 45000,
                            sellingPrice: 65000,
                            stockQuantity: 24,
                            lowStockThreshold: 5,
                            reorderPoint: 10,
                          },
                          {
                            name: 'Heineken Lager',
                            category: 'Beer',
                            size: 330,
                            supplier: 'Distributor B',
                            barcode: '8712000012344',
                            purchaseCost: 3500,
                            sellingPrice: 5000,
                            stockQuantity: 120,
                            lowStockThreshold: 20,
                            reorderPoint: 40,
                            expiryDate: '2026-12-31',
                          },
                        ] : isElectronics ? [
                          {
                            name: 'iPhone 15 Pro',
                            imei: '358901234567890',
                            supplier: 'Apple Distributor',
                            brand: 'iPhone',
                            model: '15 Pro',
                            color: 'Space Black',
                            storage: '256GB',
                            condition: 'New',
                            purchaseCost: 1500000,
                            sellingPrice: 2100000,
                            wholesalePrice: 1900000,
                            stockQuantity: 1
                          },
                          {
                            name: 'iPhone 15 Pro',
                            imei: '358901234567891',
                            supplier: 'Apple Distributor',
                            brand: 'iPhone',
                            model: '15 Pro',
                            color: 'Natural Titanium',
                            storage: '256GB',
                            condition: 'New',
                            purchaseCost: 1500000,
                            sellingPrice: 2100000,
                            wholesalePrice: 1900000,
                            stockQuantity: 1
                          },
                          {
                            name: 'Samsung Charger Type-C',
                            imei: '358909876543210',
                            supplier: 'Samsung Official',
                            brand: 'Samsung',
                            model: 'EP-TA800',
                            color: 'White',
                            storage: '',
                            condition: 'New',
                            purchaseCost: 25000,
                            sellingPrice: 45000,
                            wholesalePrice: 35000,
                            stockQuantity: 1
                          }
                        ] : isClothing ? [
                          {
                            name: 'Classic T-Shirt',
                            sku: 'TSH-001',
                            brand: 'Nike',
                            barcode: '1234567890123',
                            category: 'Tops',
                            stockQuantity: 50,
                            variants: 'SIZE: M; COLOR: Black',
                            supplier: 'Clothing Distributor',
                            purchaseCost: 12000,
                            sellingPrice: 25000,
                            wholesalePrice: 20000,
                            lowStockThreshold: 10,
                            reorderPoint: 20,
                            description: 'Cotton crew neck t-shirt'
                          },
                          {
                            name: 'Denim Jeans',
                            sku: 'JNS-001',
                            brand: 'Levis',
                            barcode: '9876543210987',
                            category: 'Bottoms',
                            stockQuantity: 30,
                            variants: 'SIZE: 42; COLOR: Blue',
                            supplier: 'Jeans Importers',
                            purchaseCost: 35000,
                            sellingPrice: 65000,
                            wholesalePrice: 55000,
                            lowStockThreshold: 5,
                            reorderPoint: 10,
                            description: 'Slim fit denim jeans'
                          }
                        ] : [
                          {
                            name: 'Sample Product 1',
                            sku: 'SKU001',
                            barcode: '1234567890123',
                            brand: 'Sample Brand',
                            category: 'General',
                            supplier: 'Distributor A',
                            purchaseCost: 10000,
                            sellingPrice: 15000,
                            wholesalePrice: 12000,
                            stockQuantity: 50,
                            lowStockThreshold: 10,
                            reorderPoint: 20,
                            description: 'Sample product description',
                            variants: 'COLOR: Red; SIZE: M'
                          }
                        ];
                        
                        const worksheet = XLSX.utils.json_to_sheet(sampleData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                        
                        XLSX.writeFile(workbook, 'sample-import.xlsx');
                      } catch (err) {
                        console.error('Download error:', err);
                      }
                    }}
                    style={{ 
                      color: 'var(--primary)', 
                      fontSize: '0.875rem', 
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Download Sample Template
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: importResult.success > 0 ? 'color-mix(in srgb, var(--success) 12.5%, transparent)' : 'var(--background)',
                  borderRadius: '0.5rem',
                  border: `1px solid ${importResult.success > 0 ? 'var(--success)' : 'var(--border)'}`
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{importResult.success}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Imported</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importResult.failed > 0 ? 'var(--destructive)' : 'var(--muted-foreground)' }}>{importResult.failed}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Failed</div>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--foreground)', marginBottom: '0.5rem' }}>Errors:</div>
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: 'var(--destructive)', padding: '0.25rem 0' }}>{err}</div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>...and {importResult.errors.length - 10} more</div>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={() => { setImportResult(null); setShowImportModal(false); }} 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
