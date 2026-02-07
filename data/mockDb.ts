import { Product, ProductType, Table, TableStatus, RestaurantTheme, User, Role, Order, Transaction, AuditLog } from '../types';

// Interfaces para o Banco de Dados
interface RestaurantData {
  theme: RestaurantTheme;
  users: User[];
  products: Product[];
  tables: Table[];
  orders: Order[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
}

interface Database {
  [slug: string]: RestaurantData;
}

// Dados iniciais (Factories)
const createUsers = (prefix: string): User[] => [
  { id: `${prefix}_u1`, name: 'Admin', role: Role.ADMIN, pin: '1234' },
  { id: `${prefix}_u2`, name: 'Garçom 1', role: Role.WAITER, pin: '0000' },
  { id: `${prefix}_u3`, name: 'Cozinha', role: Role.KITCHEN, pin: '1111' },
  { id: `${prefix}_u4`, name: 'Caixa', role: Role.CASHIER, pin: '2222' },
];

const createTables = (count: number): Table[] => Array.from({ length: count }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  status: TableStatus.AVAILABLE,
  customerName: '',
  accessCode: ''
}));

// --- DADOS DOS RESTAURANTES ---

export const MOCK_DB: Database = {
  'bistro': {
    theme: {
      primaryColor: '#ea580c', // Orange
      backgroundColor: '#fff7ed',
      fontColor: '#1c1917',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/1996/1996068.png',
      restaurantName: 'Bistrô do Chef'
    },
    users: createUsers('bistro'),
    tables: createTables(10),
    orders: [],
    transactions: [],
    auditLogs: [],
    products: [
      {
        id: 'p1', name: 'Filet Mignon', description: 'Ao molho madeira com purê.', price: 65.00,
        category: 'Pratos Principais', type: ProductType.KITCHEN, image: 'https://picsum.photos/200/200?random=10', isVisible: true, sortOrder: 1
      },
      {
        id: 'p2', name: 'Vinho Tinto', description: 'Cabernet Sauvignon.', price: 80.00,
        category: 'Bebidas', type: ProductType.BAR, image: 'https://picsum.photos/200/200?random=11', isVisible: true, sortOrder: 2
      }
    ]
  },
  'burger': {
    theme: {
      primaryColor: '#dc2626', // Red
      backgroundColor: '#fef2f2',
      fontColor: '#1f2937',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
      restaurantName: 'Burger Kingo'
    },
    users: createUsers('burger'),
    tables: createTables(20),
    orders: [],
    transactions: [],
    auditLogs: [],
    products: [
        {
            id: 'bp1', name: 'X-Bacon', description: 'Muito bacon crocante.', price: 28.00,
            category: 'Lanches', type: ProductType.KITCHEN, image: 'https://picsum.photos/200/200?random=20', isVisible: true, sortOrder: 1
        },
        {
            id: 'bp2', name: 'Milkshake', description: 'Morango com chantilly.', price: 18.00,
            category: 'Sobremesas', type: ProductType.BAR, image: 'https://picsum.photos/200/200?random=21', isVisible: true, sortOrder: 2
        }
    ]
  },
  'pizza': {
    theme: {
        primaryColor: '#16a34a', // Green
        backgroundColor: '#f0fdf4',
        fontColor: '#1f2937',
        logoUrl: 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
        restaurantName: 'Pizzaria Express'
      },
      users: createUsers('pizza'),
      tables: createTables(15),
      orders: [],
      transactions: [],
      auditLogs: [],
      products: [
          {
              id: 'pp1', name: 'Pizza Calabresa', description: 'Queijo, calabresa e cebola.', price: 45.00,
              category: 'Pizzas', type: ProductType.KITCHEN, image: 'https://picsum.photos/200/200?random=30', isVisible: true, sortOrder: 1
          },
          {
              id: 'pp2', name: 'Coca Cola 2L', description: 'Gelada.', price: 14.00,
              category: 'Bebidas', type: ProductType.BAR, image: 'https://picsum.photos/200/200?random=31', isVisible: true, sortOrder: 2
          }
      ]
  }
};

// Função helper para pegar dados (simulando fetch)
export const getTenantData = (slug: string): RestaurantData | null => {
    return MOCK_DB[slug] || null;
};