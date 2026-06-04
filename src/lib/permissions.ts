export const MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard analytics and stats' },
  { id: 'inventory', name: 'Inventory', description: 'Manage products and stock' },
  { id: 'pos', name: 'POS', description: 'Process point-of-sale transactions' },
  { id: 'sales', name: 'Sales', description: 'View and manage sales records' },
  { id: 'returns', name: 'Returns', description: 'Handle product returns' },
  { id: 'installments', name: 'Installments', description: 'Manage installment payments' },
  { id: 'suppliers', name: 'Suppliers', description: 'Manage supplier information' },
  { id: 'purchase-orders', name: 'Purchase Orders', description: 'Create and manage purchase orders' },
  { id: 'clients', name: 'Clients', description: 'Manage customer records' },
  { id: 'expenses', name: 'Expenses', description: 'Track business expenses' },
  { id: 'profit-loss', name: 'Profit & Loss', description: 'View profit and loss reports' },
  { id: 'reports', name: 'Reports', description: 'Generate business reports' },
  { id: 'users', name: 'Users', description: 'Manage system users' },
  { id: 'settings', name: 'Settings', description: 'Configure system settings' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[]> = {
  OWNER: MODULES.map(m => ({ module: m.id, canRead: true, canWrite: true, canDelete: true })),
  MANAGER: [
    { module: 'inventory', canRead: true, canWrite: true, canDelete: false },
    { module: 'pos', canRead: true, canWrite: true, canDelete: false },
    { module: 'sales', canRead: true, canWrite: true, canDelete: false },
    { module: 'returns', canRead: true, canWrite: true, canDelete: false },
    { module: 'installments', canRead: true, canWrite: true, canDelete: false },
    { module: 'suppliers', canRead: true, canWrite: true, canDelete: false },
    { module: 'purchase-orders', canRead: true, canWrite: true, canDelete: false },
    { module: 'clients', canRead: true, canWrite: true, canDelete: false },
    { module: 'expenses', canRead: true, canWrite: true, canDelete: false },
    { module: 'profit-loss', canRead: true, canWrite: true, canDelete: false },
    { module: 'reports', canRead: true, canWrite: true, canDelete: false },
    { module: 'users', canRead: true, canWrite: false, canDelete: false },
    { module: 'settings', canRead: true, canWrite: false, canDelete: false },
  ],
  CASHIER: [
    { module: 'pos', canRead: true, canWrite: true, canDelete: false },
    { module: 'returns', canRead: true, canWrite: false, canDelete: false },
  ],
  PHARMACIST: [
    { module: 'pos', canRead: true, canWrite: true, canDelete: false },
    { module: 'inventory', canRead: true, canWrite: true, canDelete: false },
    { module: 'returns', canRead: true, canWrite: false, canDelete: false },
  ],
  WINGER: [
    { module: 'pos', canRead: true, canWrite: true, canDelete: false },
    { module: 'inventory', canRead: true, canWrite: true, canDelete: false },
  ],
  ASSISTANT: [
    { module: 'inventory', canRead: true, canWrite: true, canDelete: false },
    { module: 'pos', canRead: true, canWrite: true, canDelete: false },
  ],
};

export function getDefaultPermissions(role: string): { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}
