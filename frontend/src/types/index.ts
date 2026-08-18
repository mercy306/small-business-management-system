export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  business_id: number;
  is_active: boolean;
}

export interface Business {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  currency: string;
  tax_rate: number;
  created_at: string;
}

export interface Category {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: number;
  business_id: number;
  category_id?: number;
  category?: Category;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryOverviewItem {
  product_id: number;
  name: string;
  sku?: string;
  stock_quantity: number;
  minimum_stock: number;
  unit: string;
  is_low_stock: boolean;
}

export interface InventoryTransaction {
  id: number;
  business_id: number;
  product_id: number;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  reference_type?: string;
  reference_id?: number;
  note?: string;
  created_by?: number;
  created_at: string;
}

export interface Customer {
  id: number;
  business_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  balance: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  business_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number;
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: number;
  business_id: number;
  customer_id?: number;
  cashier_id: number;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: 'completed' | 'pending' | 'cancelled' | 'returned';
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface Expense {
  id: number;
  business_id: number;
  category: string;
  description?: string;
  amount: number;
  payment_method: string;
  reference?: string;
  created_by?: number;
  created_at: string;
}

export interface Payment {
  id: number;
  business_id: number;
  sale_id?: number;
  customer_id?: number;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'credit' | 'mobile' | 'other';
  reference?: string;
  received_by?: number;
  created_at: string;
}

export interface DashboardData {
  stats: {
    today_sales: number;
    today_expenses: number;
    today_profit: number;
    today_transactions: number;
    total_products: number;
    low_stock_count: number;
    total_customers: number;
  };
  low_stock: Array<{
    id: number;
    name: string;
    stock_quantity: number;
    minimum_stock: number;
    unit: string;
  }>;
  recent_sales: Array<{
    id: number;
    invoice_number: string;
    total: number;
    created_at: string;
  }>;
  top_products: Array<{
    product_id: number;
    name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export interface Shift {
  id: number;
  business_id: number;
  user_id: number;
  opened_at: string;
  closed_at?: string;
  starting_cash: number;
  ending_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  status: 'open' | 'closed';
  notes?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}
