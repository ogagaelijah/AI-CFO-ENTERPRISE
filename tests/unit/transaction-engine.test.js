// tests/unit/transaction-engine.test.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// =============================================
// REPOSITORIES
// =============================================
const SaleRepository = require('../../src/infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('../../src/infrastructure/database/sqlite/repositories/PurchaseRepository');
const InventoryRepository = require('../../src/infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../src/infrastructure/database/sqlite/repositories/DebtorRepository');
const CreditorRepository = require('../../src/infrastructure/database/sqlite/repositories/CreditorRepository');
const CustomerRepository = require('../../src/infrastructure/database/sqlite/repositories/CustomerRepository');
const SupplierRepository = require('../../src/infrastructure/database/sqlite/repositories/SupplierRepository');
const PaymentRepository = require('../../src/infrastructure/database/sqlite/repositories/PaymentRepository');

// =============================================
// USE CASES
// =============================================
const RecordSaleUseCase = require('../../src/application/useCases/sales/RecordSaleUseCase');
const RecordPurchaseUseCase = require('../../src/application/useCases/purchases/RecordPurchaseUseCase');

// =============================================
// SETUP TEST DATABASE
// =============================================
const TEST_DB_PATH = path.join(__dirname, '../data/test.db');

function setupTestDb() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (e) {}
  }

  const db = new Database(TEST_DB_PATH);
  db.pragma('foreign_keys = ON');

  // Create minimal tables for testing
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      industry TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      item_name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      last_purchase_cost REAL DEFAULT 0,
      reorder_level INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      item_name TEXT,
      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      customer_name TEXT,
      customer_id INTEGER,
      customer_type TEXT DEFAULT 'CUSTOMER',
      payment_status TEXT DEFAULT 'UNPAID',
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      unit_cost REAL DEFAULT 0,
      cogs REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      margin_percentage REAL DEFAULT 0,
      items TEXT,
      invoice_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      supplier_id INTEGER,
      supplier_name TEXT,
      item_name TEXT,
      quantity REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'UNPAID',
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      due_date DATETIME,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      items TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      type TEXT DEFAULT 'CUSTOMER',
      tax_id TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // ✅ FIX: Add last_payment_date column
  db.exec(`
    CREATE TABLE IF NOT EXISTS debtors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      customer_name TEXT,
      customer_id INTEGER,
      customer_type TEXT DEFAULT 'CUSTOMER',
      total_owed REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      due_date DATETIME,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      last_payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // ✅ FIX: Add last_payment_date column
  db.exec(`
    CREATE TABLE IF NOT EXISTS creditors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      supplier_id INTEGER,
      supplier_name TEXT,
      total_owed REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      due_date DATETIME,
      reference_type TEXT,
      reference_id INTEGER,
      last_payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('RECEIVED', 'MADE')),
      reference_type TEXT NOT NULL CHECK (reference_type IN ('SALE', 'PURCHASE', 'EXPENSE', 'INCOME', 'DEBTOR', 'CREDITOR', 'OTHER')),
      reference_id INTEGER,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT,
      reference_number TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Insert test user and business
  db.exec(`
    INSERT OR IGNORE INTO users (id, full_name, email, phone, password_hash, created_at)
    VALUES (1, 'Test User', 'test@test.com', '08012345678', 'hashed_password', datetime('now'))
  `);

  db.exec(`
    INSERT OR IGNORE INTO businesses (id, user_id, name, industry, created_at)
    VALUES (1, 1, 'Test Business', 'RETAIL', datetime('now'))
  `);

  // Insert test inventory
  db.exec(`
    INSERT OR IGNORE INTO inventory (id, user_id, business_id, item_name, quantity, cost_price, selling_price, reorder_level)
    VALUES 
      (1, 1, 1, 'Test Product', 50, 1000, 1500, 5),
      (2, 1, 1, 'Bread', 30, 1200, 1800, 10)
  `);

  return db;
}

// =============================================
// TEST SUITE
// =============================================
describe('Phase 1: Transaction Engine Tests', () => {
  let db;
  let saleRepo;
  let purchaseRepo;
  let inventoryRepo;
  let debtorRepo;
  let creditorRepo;
  let customerRepo;
  let supplierRepo;
  let paymentRepo;
  let recordSale;
  let recordPurchase;

  const TEST_USER_ID = 1;
  const TEST_BUSINESS_ID = 1;

  beforeEach(() => {
    db = setupTestDb();

    saleRepo = new SaleRepository(db);
    purchaseRepo = new PurchaseRepository(db);
    inventoryRepo = new InventoryRepository(db);
    debtorRepo = new DebtorRepository(db);
    creditorRepo = new CreditorRepository(db);
    customerRepo = new CustomerRepository(db);
    supplierRepo = new SupplierRepository(db);
    paymentRepo = new PaymentRepository(db);

    // Initialize use cases with payment repo
    recordSale = new RecordSaleUseCase(
      saleRepo,
      inventoryRepo,
      debtorRepo,
      customerRepo,
      paymentRepo
    );

    recordPurchase = new RecordPurchaseUseCase({
      purchaseRepository: purchaseRepo,
      transactionRepository: null,
      inventoryRepository: inventoryRepo,
      inventoryTransactionRepository: null,
      creditorRepository: creditorRepo,
      supplierRepository: supplierRepo,
      paymentRepository: paymentRepo,
    });
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch (e) {}
    }
  });

  // =============================================
  // TEST 1: Record PAID Sale
  // =============================================
  test('Record PAID Sale - Creates sale, payment, reduces inventory', async () => {
    const result = await recordSale.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      itemName: 'Test Product',
      quantity: 2,
      unitPrice: 1500,
      customerName: 'Test Customer',
      paymentStatus: 'PAID',
      amountPaid: 3000,
      saleDate: new Date(),
      items: [],
      notes: '',
    });

    expect(result.success).toBe(true);
    expect(result.sale.total_price).toBe(3000);
    expect(result.sale.cogs).toBe(2000);
    expect(result.sale.unit_cost).toBe(1000);

    const inventoryItem = await inventoryRepo.findById(1);
    expect(inventoryItem.quantity).toBe(48);

    const payments = await paymentRepo.findByReference(TEST_BUSINESS_ID, 'SALE', result.sale.id);
    expect(payments.length).toBeGreaterThan(0);
    expect(payments[0].amount).toBe(3000);

    const debtors = await debtorRepo.findByCustomerName(TEST_USER_ID, 'Test Customer');
    const activeDebtor = debtors.find(d => d.balance_remaining > 0);
    expect(activeDebtor).toBeUndefined();

    console.log('✅ Test 1 passed: PAID Sale');
  });

  // =============================================
  // TEST 2: Record UNPAID Sale (Creates Debtor)
  // =============================================
  test('Record UNPAID Sale - Creates debtor', async () => {
    const result = await recordSale.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      itemName: 'Test Product',
      quantity: 1,
      unitPrice: 1500,
      customerName: 'Credit Customer',
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      saleDate: new Date(),
      items: [],
      notes: '',
    });

    expect(result.success).toBe(true);
    expect(result.sale.total_price).toBe(1500);
    expect(result.sale.balance_remaining).toBe(1500);

    const debtors = await debtorRepo.findByCustomerName(TEST_USER_ID, 'Credit Customer');
    const activeDebtor = debtors.find(d => d.balance_remaining > 0);
    expect(activeDebtor).toBeDefined();
    expect(activeDebtor.balance_remaining).toBe(1500);
    expect(activeDebtor.status).toBe('ACTIVE');

    const payments = await paymentRepo.findByReference(TEST_BUSINESS_ID, 'SALE', result.sale.id);
    expect(payments.length).toBe(0);

    console.log('✅ Test 2 passed: UNPAID Sale creates Debtor');
  });

  // =============================================
  // TEST 3: Record PAID Purchase
  // =============================================
  test('Record PAID Purchase - Creates purchase, payment, increases inventory', async () => {
    const result = await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'Test Supplier',
      items: [{ name: 'Test Product', quantity: 5, unitCost: 1100 }],
      paymentStatus: 'PAID',
      amountPaid: 5500,
      purchaseDate: new Date(),
      notes: '',
    });

    expect(result.success).toBe(true);
    expect(result.purchase.total_cost).toBe(5500);

    const inventoryItem = await inventoryRepo.findById(1);
    expect(inventoryItem.quantity).toBe(55);

    expect(inventoryItem.cost_price).toBeCloseTo(1009.09, 2);

    const payments = await paymentRepo.findByReference(TEST_BUSINESS_ID, 'PURCHASE', result.purchase.id);
    expect(payments.length).toBeGreaterThan(0);
    expect(payments[0].amount).toBe(5500);

    console.log('✅ Test 3 passed: PAID Purchase');
  });

  // =============================================
  // TEST 4: Record UNPAID Purchase (Creates Creditor)
  // =============================================
  test('Record UNPAID Purchase - Creates creditor', async () => {
    const result = await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'Credit Supplier',
      items: [{ name: 'Bread', quantity: 10, unitCost: 1300 }],
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      purchaseDate: new Date(),
      notes: '',
    });

    expect(result.success).toBe(true);
    expect(result.purchase.total_cost).toBe(13000);
    expect(result.purchase.balance_remaining).toBe(13000);

    const creditors = await creditorRepo.findBySupplierName(TEST_USER_ID, 'Credit Supplier');
    const activeCreditor = creditors.find(c => c.balance_remaining > 0);
    expect(activeCreditor).toBeDefined();
    expect(activeCreditor.balance_remaining).toBe(13000);

    console.log('✅ Test 4 passed: UNPAID Purchase creates Creditor');
  });

  // =============================================
  // TEST 5: Record Payment to Debtor
  // =============================================
  test('Record Payment to Debtor - Reduces debtor balance', async () => {
    // First create a debtor
    const saleResult = await recordSale.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      itemName: 'Test Product',
      quantity: 2,
      unitPrice: 1500,
      customerName: 'Debtor Customer',
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      saleDate: new Date(),
      items: [],
      notes: '',
    });

    const debtors = await debtorRepo.findByCustomerName(TEST_USER_ID, 'Debtor Customer');
    const debtor = debtors.find(d => d.balance_remaining > 0);
    expect(debtor).toBeDefined();
    expect(debtor.balance_remaining).toBe(3000);

    // Record payment
    await paymentRepo.create({
      businessId: TEST_BUSINESS_ID,
      userId: TEST_USER_ID,
      type: 'RECEIVED',
      amount: 2000,
      referenceType: 'DEBTOR',
      referenceId: debtor.id,
      paymentDate: new Date(),
      paymentMethod: 'CASH',
      notes: 'Partial payment',
    });

    // Update debtor
    await debtorRepo.recordPayment(debtor.id, 2000);

    const updatedDebtor = await debtorRepo.findById(debtor.id);
    expect(updatedDebtor.balance_remaining).toBe(1000);
    expect(updatedDebtor.amount_paid).toBe(2000);
    expect(updatedDebtor.status).toBe('ACTIVE');

    console.log('✅ Test 5 passed: Payment to Debtor');
  });

  // =============================================
  // TEST 6: Record Payment to Creditor
  // =============================================
  test('Record Payment to Creditor - Reduces creditor balance', async () => {
    // First create a creditor
    const purchaseResult = await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'Creditor Supplier',
      items: [{ name: 'Bread', quantity: 5, unitCost: 1200 }],
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      purchaseDate: new Date(),
      notes: '',
    });

    const creditors = await creditorRepo.findBySupplierName(TEST_USER_ID, 'Creditor Supplier');
    const creditor = creditors.find(c => c.balance_remaining > 0);
    expect(creditor).toBeDefined();
    expect(creditor.balance_remaining).toBe(6000);

    // Record payment
    await paymentRepo.create({
      businessId: TEST_BUSINESS_ID,
      userId: TEST_USER_ID,
      type: 'MADE',
      amount: 4000,
      referenceType: 'CREDITOR',
      referenceId: creditor.id,
      paymentDate: new Date(),
      paymentMethod: 'CASH',
      notes: 'Partial payment',
    });

    // Update creditor
    await creditorRepo.recordPayment(creditor.id, 4000);

    const updatedCreditor = await creditorRepo.findById(creditor.id);
    expect(updatedCreditor.balance_remaining).toBe(2000);
    expect(updatedCreditor.amount_paid).toBe(4000);
    expect(updatedCreditor.status).toBe('ACTIVE');

    console.log('✅ Test 6 passed: Payment to Creditor');
  });

  // =============================================
  // TEST 7: Auto-create Customer on Sale
  // =============================================
  test('Auto-create Customer on Sale - New customer created', async () => {
    const customerName = 'New Auto Customer ' + Date.now();

    await recordSale.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      itemName: 'Test Product',
      quantity: 1,
      unitPrice: 1500,
      customerName: customerName,
      paymentStatus: 'PAID',
      amountPaid: 1500,
      saleDate: new Date(),
      items: [],
      notes: '',
    });

    const customers = await customerRepo.findByBusinessId(TEST_BUSINESS_ID, {
      search: customerName,
      limit: 1,
    });
    expect(customers.length).toBeGreaterThan(0);
    expect(customers[0].name).toBe(customerName);

    console.log('✅ Test 7 passed: Auto-create Customer');
  });

  // =============================================
  // TEST 8: Auto-create Supplier on Purchase
  // =============================================
  test('Auto-create Supplier on Purchase - New supplier created', async () => {
    const supplierName = 'New Auto Supplier ' + Date.now();

    await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: supplierName,
      items: [{ name: 'Test Product', quantity: 5, unitCost: 1000 }],
      paymentStatus: 'PAID',
      amountPaid: 5000,
      purchaseDate: new Date(),
      notes: '',
    });

    const suppliers = await supplierRepo.findByBusinessId(TEST_BUSINESS_ID, {
      search: supplierName,
      limit: 1,
    });
    expect(suppliers.length).toBeGreaterThan(0);
    expect(suppliers[0].name).toBe(supplierName);

    console.log('✅ Test 8 passed: Auto-create Supplier');
  });

  // =============================================
  // TEST 9: WAC Update on Multiple Purchases
  // =============================================
  test('WAC Update on Multiple Purchases - Weighted average correct', async () => {
    // Get initial inventory
    const initialItem = await inventoryRepo.findById(2);
    const initialQty = initialItem.quantity || 0;
    const initialCost = initialItem.cost_price || 0;

    // First purchase
    await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'WAC Supplier',
      items: [{ name: 'Bread', quantity: 10, unitCost: 1200 }],
      paymentStatus: 'PAID',
      amountPaid: 12000,
      purchaseDate: new Date(),
      notes: '',
    });

    // Second purchase at different price
    await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'WAC Supplier',
      items: [{ name: 'Bread', quantity: 5, unitCost: 1500 }],
      paymentStatus: 'PAID',
      amountPaid: 7500,
      purchaseDate: new Date(),
      notes: '',
    });

    const finalItem = await inventoryRepo.findById(2);
    const totalQty = initialQty + 15;
    const totalCost = (initialQty * initialCost) + (10 * 1200) + (5 * 1500);
    const expectedWAC = totalCost / totalQty;

    expect(finalItem.cost_price).toBeCloseTo(expectedWAC, 2);

    console.log(`✅ Test 9 passed: WAC updated correctly (${finalItem.cost_price})`);
  });

  // =============================================
  // TEST 10: COGS Frozen on Sale
  // =============================================
  test('COGS Frozen on Sale - Unit cost frozen at time of sale', async () => {
    // Record sale
    const saleResult = await recordSale.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      itemName: 'Bread',
      quantity: 2,
      unitPrice: 2000,
      customerName: 'COGS Test',
      paymentStatus: 'PAID',
      amountPaid: 4000,
      saleDate: new Date(),
      items: [],
      notes: '',
    });

    const inventoryItem = await inventoryRepo.findById(2);
    const currentWAC = inventoryItem.cost_price;

    expect(saleResult.sale.unit_cost).toBe(currentWAC);
    expect(saleResult.sale.cogs).toBe(2 * currentWAC);

    // Change WAC with new purchase
    await recordPurchase.execute({
      userId: TEST_USER_ID,
      businessId: TEST_BUSINESS_ID,
      supplierName: 'COGS Supplier',
      items: [{ name: 'Bread', quantity: 10, unitCost: 3000 }],
      paymentStatus: 'PAID',
      amountPaid: 30000,
      purchaseDate: new Date(),
      notes: '',
    });

    const savedSale = await saleRepo.findById(saleResult.sale.id);
    expect(savedSale.unit_cost).toBe(currentWAC);
    expect(savedSale.cogs).toBe(2 * currentWAC);

    console.log('✅ Test 10 passed: COGS frozen on sale');
  });
});

console.log('\n🎯 Running Phase 1: Transaction Engine Tests...\n');