export type Role = 'superadmin' | 'admin' | 'seller';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: 'pending' | 'active';
  name?: string;
  photoURL?: string;
  createdAt?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  qrCodeData: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
}

export interface Sale {
  id: string;
  date: number;
  items: SaleItem[];
  total: number;
  sellerUid: string;
  sellerEmail: string;
  paymentMethod: 'Efectivo' | 'Mercado Pago' | 'Transferencia Bancaria';
  change?: number;
  customerId?: string;
  customerName?: string;
  promotionId?: string;
  promotionName?: string;
  discountPercentage?: number;
  discountApplied?: number;
  subtotal?: number;
}

export interface Promotion {
  id: string;
  name: string;
  discountPercentage: number;
  active: boolean;
  createdAt: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email?: string;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: 'product' | 'user' | 'sale' | 'system';
  entityId: string;
  details: string;
  userId: string;
  userEmail: string;
  timestamp: number;
}
