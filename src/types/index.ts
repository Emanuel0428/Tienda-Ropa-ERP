export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordinador' | 'administradora' | 'asesora' | 'auditor';
  store?: string;
  avatar?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  manager: string;
  status: 'active' | 'inactive';
}

export interface Sale {
  id: string;
  storeId: string;
  date: string;
  items: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  invoiceNumber: string;
  amount: number;
  advisor: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  dueDate: string;
  storeId: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  category: string;
  month: string;
  uploadDate: string;
  storeId: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  size: string;
  color: string;
  quantity: number;
  location: string;
  barcode: string;
}

export interface Goal {
  id: string;
  storeId: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  period: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}