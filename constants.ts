import { Product, ProductType, Table, TableStatus, RestaurantTheme, User, Role, RestaurantTenant } from './types';

export const DEFAULT_THEME: RestaurantTheme = {
  primaryColor: '#2563eb', // Blue-600
  backgroundColor: '#f3f4f6', // Gray-100
  fontColor: '#1f2937', // Gray-800
  logoUrl: '',
  restaurantName: 'GastroFlow'
};

// Removido o SUPER_ADMIN desta lista, pois ele não pertence a um restaurante específico
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Restaurante', role: Role.ADMIN, pin: '1234' },
  { id: 'u2', name: 'Carlos Garçom', role: Role.WAITER, pin: '0000' },
  { id: 'u3', name: 'Maria Cozinha', role: Role.KITCHEN, pin: '1111' },
  { id: 'u4', name: 'Ana Caixa', role: Role.CASHIER, pin: '2222' },
];

export const MOCK_TENANTS: RestaurantTenant[] = [
  { id: 'r1', name: 'Bistrô do Chef', ownerName: 'João Silva', email: 'joao@bistro.com', status: 'ACTIVE', plan: 'PRO', joinedAt: new Date('2023-01-15') },
  { id: 'r2', name: 'Burger Kingo', ownerName: 'Ana Souza', email: 'ana@burger.com', status: 'ACTIVE', plan: 'ENTERPRISE', joinedAt: new Date('2023-03-10') },
  { id: 'r3', name: 'Pizzaria Express', ownerName: 'Carlos Lima', email: 'carlos@pizza.com', status: 'INACTIVE', plan: 'FREE', joinedAt: new Date('2023-06-20') },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Hambúrguer Clássico',
    description: 'Hambúrguer suculento com cheddar, alface, tomate e molho especial da casa.',
    price: 32.50,
    category: 'Lanches',
    type: ProductType.KITCHEN,
    image: 'https://picsum.photos/200/200?random=1',
    isVisible: true,
    sortOrder: 1
  },
  {
    id: 'p2',
    name: 'Batata Frita Trufada',
    description: 'Batatas crocantes finalizadas com azeite trufado e queijo parmesão ralado.',
    price: 22.00,
    category: 'Acompanhamentos',
    type: ProductType.KITCHEN,
    image: 'https://picsum.photos/200/200?random=2',
    isVisible: true,
    sortOrder: 2
  },
  {
    id: 'p3',
    name: 'Mojito',
    description: 'Refrescante mistura de rum, hortelã, limão e água com gás.',
    price: 24.00,
    category: 'Bebidas',
    type: ProductType.BAR,
    image: 'https://picsum.photos/200/200?random=3',
    isVisible: true,
    sortOrder: 3
  },
  {
    id: 'p4',
    name: 'Salmão Grelhado',
    description: 'Filé de salmão fresco servido com aspargos e molho de manteiga e limão.',
    price: 58.00,
    category: 'Pratos Principais',
    type: ProductType.KITCHEN,
    image: 'https://picsum.photos/200/200?random=4',
    isVisible: true,
    sortOrder: 4
  },
  {
    id: 'p5',
    name: 'Coca Cola',
    description: 'Refrigerante de cola gelado com limão e gelo.',
    price: 8.00,
    category: 'Bebidas',
    type: ProductType.BAR,
    image: 'https://picsum.photos/200/200?random=5',
    isVisible: true,
    sortOrder: 5
  }
];

export const MOCK_TABLES: Table[] = Array.from({ length: 6 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  status: TableStatus.AVAILABLE,
  customerName: '',
  accessCode: ''
}));