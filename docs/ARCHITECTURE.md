# Multi-Tenant SaaS ERP Architecture (React + TypeScript + Supabase)

This document defines the production-ready, scalable architecture for the Restaurant SaaS ERP. It follows Domain-Driven Design (DDD), Event-Driven Architecture (EDA), and leverages Supabase for backend logic, Realtime, and Multi-tenancy (RLS).

---

## 1️⃣ CORE LAYER (`/src/core`)

The Core layer contains shared infrastructure, utilities, and base configurations used across all modules. It is strictly agnostic to business logic.

### `src/core/events/eventBus.ts`
Client-side event bus for decoupled module communication (e.g., triggering a UI toast when an order is created, without coupling the Order module to the UI module).

```typescript
type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private static events: Record<string, EventCallback[]> = {};

  static subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }

  static publish<T>(event: string, payload: T): void {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => callback(payload));
  }
}
```

### `src/core/events/eventTypes.ts`
```typescript
export enum AppEvents {
  ORDER_CREATED = 'order.created',
  ORDER_STATUS_CHANGED = 'order.status_changed',
  PAYMENT_COMPLETED = 'payment.completed',
  INVENTORY_LOW = 'inventory.low_stock',
  AUTH_SESSION_EXPIRED = 'auth.session_expired',
}

export interface OrderCreatedPayload {
  orderId: string;
  tableId: string;
  total: number;
  tenantId: string;
}
```

### `src/core/tenant/tenantResolver.ts`
Resolves the tenant slug from the URL to establish the current environment.

```typescript
export const getTenantSlug = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('restaurant');
  if (slug) return slug;
  
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'r' && pathParts[2]) return pathParts[2];
  
  return null;
};
```

---

## 2️⃣ MODULE ARCHITECTURE (`/src/modules`)

Each module is a self-contained domain. 

### Structure of a Module (e.g., `orders`)
```text
src/modules/orders/
├── components/       # UI components specific to orders (e.g., OrderCard.tsx)
├── context/          # React Context for state orchestration (OrderContext.tsx)
├── hooks/            # Custom hooks (e.g., useOrders.ts, useRealtimeOrders.ts)
├── pages/            # Page components (e.g., OrderDashboard.tsx)
├── services/         # Business logic & Supabase calls (orderService.ts)
└── types/            # TypeScript interfaces (orderTypes.ts)
```

**Responsibilities:**
*   **Context:** Holds the current state (e.g., `activeOrders`, `isLoading`). It does *not* contain complex business logic. It calls Services.
*   **Services:** Pure functions/classes that interact with Supabase (RPCs, Inserts).
*   **Components:** Dumb UI components.
*   **Hooks:** Connects Components to Contexts or Realtime subscriptions.

---

## 3️⃣ DOMAIN SERVICES

Services contain the actual business logic and API calls. Since "All logic must be in Supabase", the frontend services act as thin clients calling Supabase RPCs (Remote Procedure Calls) or standard DML operations.

### `src/modules/orders/services/orderService.ts`
```typescript
import { supabase } from '@/core/api/supabaseClient';
import { EventBus } from '@/core/events/eventBus';
import { AppEvents } from '@/core/events/eventTypes';
import { Order, CreateOrderDTO } from '../types/orderTypes';

export const OrderService = {
  async createOrder(payload: CreateOrderDTO): Promise<Order> {
    // Calling a Supabase RPC to ensure transactional integrity (Order + Items)
    const { data, error } = await supabase.rpc('create_order_transaction', {
      p_table_id: payload.tableId,
      p_items: payload.items,
      p_tenant_id: payload.tenantId
    });

    if (error) throw new Error(error.message);

    // Publish client-side event for UI updates (e.g., clear cart)
    EventBus.publish(AppEvents.ORDER_CREATED, {
      orderId: data.id,
      tableId: payload.tableId,
      total: data.total,
      tenantId: payload.tenantId
    });

    return data as Order;
  },

  async updateOrderStatus(orderId: string, status: 'PREPARING' | 'READY' | 'DELIVERED') {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw new Error(error.message);
  }
};
```

---

## 4️⃣ EVENT DRIVEN ARCHITECTURE

The system uses a hybrid EDA:
1.  **Client-Side (EventBus):** For cross-module UI reactivity (e.g., Cart clears when OrderService succeeds).
2.  **Server-Side (Supabase Realtime & Postgres Triggers):** For distributed logic.

### Example Flow: Order to Inventory
1. **Action:** Waiter creates an order via `OrderService.createOrder()`.
2. **Database:** Supabase RPC inserts the order and items.
3. **Trigger (Postgres):** An `AFTER INSERT` trigger on `order_items` automatically deducts ingredients from the `inventory_items` table.
4. **Realtime:** Supabase Realtime broadcasts the new order to the `orders` channel.
5. **KDS Reactivity:** The KDS module, subscribed to the `orders` channel, receives the payload and updates the Kitchen UI instantly.

---

## 5️⃣ DATABASE SCHEMA (PostgreSQL / Supabase)

To enforce multi-tenancy and keep logic in the database, we use **Row Level Security (RLS)** and **Postgres Functions/Triggers**.

```sql
-- 1. TENANTS TABLE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS & ROLES (Mapping Supabase Auth to Tenants)
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN')),
    UNIQUE(tenant_id, user_id)
);

-- 3. PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL, -- Refers to tables
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'PAID', 'CANCELLED')),
    total DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    price_at_time DECIMAL(10, 2) NOT NULL
);

-- 5. INVENTORY
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10, 3) NOT NULL DEFAULT 5
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);

-- ==========================================
-- DATABASE LOGIC: AUTOMATIC INVENTORY DEDUCTION
-- ==========================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Assuming a product_ingredients mapping table exists
    UPDATE inventory_items ii
    SET quantity = ii.quantity - (pi.amount * NEW.quantity)
    FROM product_ingredients pi
    WHERE pi.product_id = NEW.product_id
      AND pi.inventory_item_id = ii.id
      AND ii.tenant_id = (SELECT tenant_id FROM orders WHERE id = NEW.order_id);
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_order();
```

---

## 6️⃣ MULTI-TENANCY & RLS (Row Level Security)

Tenant isolation is strictly enforced at the database level using Supabase RLS. No query can accidentally leak data from another restaurant.

### RLS Implementation Strategy
We extract the `tenant_id` from the authenticated user's JWT metadata (set during login) or by joining the `tenant_users` table.

```sql
-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create a helper function to get the current user's tenant_ids
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Policy: Users can only SELECT orders belonging to their tenant
CREATE POLICY tenant_isolation_select_orders ON orders
FOR SELECT
USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Policy: Users can only INSERT orders for their tenant
CREATE POLICY tenant_isolation_insert_orders ON orders
FOR INSERT
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
```

---

## 7️⃣ FOLDER STRUCTURE

```text
src/
├── core/
│   ├── api/             # supabaseClient.ts
│   ├── auth/            # roleTypes.ts, permissionGuard.tsx
│   ├── events/          # eventBus.ts, eventTypes.ts
│   ├── tenant/          # tenantResolver.ts
│   └── utils/           # currency.ts, date.ts
├── modules/
│   ├── saas/            # Super Admin, Billing, Tenant Provisioning
│   ├── auth/            # Login, RBAC, Session Management
│   ├── restaurant/      # Settings, Tables, QR Generation
│   ├── menu/            # Categories, Products, Modifiers
│   ├── orders/          # Cart, Checkout, Order History
│   ├── kds/             # Kitchen Display, Prep Times
│   ├── finance/         # POS, Payments, Expenses, DRE
│   ├── inventory/       # Stock, Suppliers, Purchase Orders
│   ├── staff/           # Employees, Timeclock, Payroll
│   └── audit/           # Action Logs, Security
├── App.tsx
├── main.tsx
└── index.css
```

---

## 8️⃣ REALTIME FEATURES (Supabase Realtime)

Supabase Realtime is used to push database changes directly to the React clients via WebSockets.

### `src/modules/kds/hooks/useRealtimeKDS.ts`
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { Order } from '@/modules/orders/types/orderTypes';

export const useRealtimeKDS = (tenantId: string) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchActiveOrders();

    // Subscribe to changes in the 'orders' table for this specific tenant
    const channel = supabase
      .channel('kds_orders')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Realtime Order Update:', payload);
          // Handle payload (add new order, update status, remove delivered)
          handleRealtimePayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // ... implementation of fetchActiveOrders and handleRealtimePayload
  return { activeOrders };
};
```

---

## 9️⃣ EXAMPLES: END-TO-END FLOW

### 1. Processing a Payment & Closing a Table
This demonstrates calling a Supabase RPC that handles the business logic transactionally.

```typescript
// src/modules/finance/services/paymentService.ts
import { supabase } from '@/core/api/supabaseClient';

export const PaymentService = {
  async processPaymentAndCloseTable(orderId: string, tableId: string, amount: number, method: string) {
    // The RPC 'process_payment_transaction' will:
    // 1. Insert into 'payments' table
    // 2. Update 'orders' status to 'PAID'
    // 3. Update 'tables' status to 'AVAILABLE'
    // 4. Insert into 'audit_logs'
    const { error } = await supabase.rpc('process_payment_transaction', {
      p_order_id: orderId,
      p_table_id: tableId,
      p_amount: amount,
      p_method: method
    });

    if (error) throw new Error(`Payment failed: ${error.message}`);
    
    // Client-side event to clear local POS state
    EventBus.publish(AppEvents.PAYMENT_COMPLETED, { orderId, amount });
  }
};
```

### 2. Triggering Audit Logs via Postgres (No Frontend Code Needed)
To ensure 100% audit compliance, the logic lives in Supabase.

```sql
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details)
    VALUES (
        NEW.tenant_id,
        auth.uid(),
        TG_OP, -- 'INSERT', 'UPDATE', or 'DELETE'
        'ORDER',
        NEW.id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_orders
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_order_changes();
```
