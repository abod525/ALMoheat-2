from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import sys
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from io import BytesIO
import pandas as pd
import webview 
import threading
import uvicorn
import time

# ✅ المتغير العام للنافذة (ضروري لعمل backup_excel)
window = None

# ---------------------------------------------------------
# 1. إعداد المسارات
# ---------------------------------------------------------
def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, 'frozen', False):
    ROOT_DIR = sys._MEIPASS

load_dotenv(os.path.join(ROOT_DIR, '.env'))

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'account_db')
db = client[db_name]

app = FastAPI(title="المُحيط - نظام المحاسبة")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== (MODELS) ====================
class ProductBase(BaseModel):
    name: str
    purchase_price: float
    sale_price: float
    quantity: float  # ✅ Feature 1: Changed from int to float for fractional support
    min_quantity: float = 10.0  # ✅ Feature 1: Changed from int to float
    description: Optional[str] = None

class ProductCreate(ProductBase): 
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    quantity: Optional[float] = None  # ✅ Feature 1: Changed from int to float
    min_quantity: Optional[float] = None  # ✅ Feature 1: Changed from int to float
    description: Optional[str] = None

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactBase(BaseModel):
    name: str
    contact_type: Literal["customer", "supplier"]
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    balance: float = 0.0

class ContactCreate(ContactBase): 
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    balance: Optional[float] = None

class Contact(ContactBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: float  # ✅ Feature 1: Changed from int to float for fractional support
    unit_price: float
    total: float

class InvoiceItemCreate(BaseModel):
    product_id: str
    quantity: float  # ✅ Feature 1: Changed from int to float for fractional support

class InvoiceBase(BaseModel):
    invoice_type: Literal["sale", "purchase"]
    contact_id: str
    contact_name: str
    notes: Optional[str] = None

class InvoiceCreate(BaseModel):
    invoice_type: Literal["sale", "purchase"]
    contact_id: Optional[str] = None
    new_contact_name: Optional[str] = None
    items: List[InvoiceItemCreate]
    notes: Optional[str] = None
    status: Literal["pending", "paid", "cancelled"] = "pending"

class Invoice(InvoiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = ""
    items: List[InvoiceItemBase] = []
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    status: Literal["pending", "paid", "cancelled"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CashTransactionBase(BaseModel):
    transaction_type: Literal["receipt", "payment", "expense"]  # ✅ Added "expense" type
    amount: float
    description: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    invoice_id: Optional[str] = None

class CashTransactionCreate(CashTransactionBase): 
    pass

class CashTransactionUpdate(BaseModel):
    transaction_type: Optional[Literal["receipt", "payment", "expense"]] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    contact_id: Optional[str] = None

class CashTransaction(CashTransactionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ✅ Feature 4: New Expense Model
class ExpenseCreate(BaseModel):
    name: str
    amount: float
    notes: Optional[str] = None

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def deserialize_datetime(doc, fields=['created_at', 'updated_at']):
    for field in fields:
        if field in doc and isinstance(doc[field], str):
            try: 
                doc[field] = datetime.fromisoformat(doc[field])
            except: 
                pass
    return doc

async def get_next_invoice_number(invoice_type: str) -> str:
    prefix = "INV" if invoice_type == "sale" else "PUR"
    count = await db.invoices.count_documents({"invoice_type": invoice_type})
    return f"{prefix}-{str(count + 1).zfill(6)}"

async def get_or_create_contact(name: str):
    if not name: 
        return None
    clean_name = name.strip()
    existing = await db.contacts.find_one({"name": clean_name})
    if existing: 
        return existing["id"]
    new_contact = Contact(name=clean_name, contact_type="customer", balance=0.0)
    doc = new_contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.contacts.insert_one(doc)
    return new_contact.id

@api_router.get("/")
async def root(): 
    return {"message": "System Operational"}

# --- Products Routes ---
@api_router.post("/products", response_model=Product)
async def create_product(p: ProductCreate):
    obj = Product(**p.model_dump())
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.products.insert_one(doc)
    return obj

@api_router.get("/products", response_model=List[Product])
async def get_products(low_stock: bool = False):
    query = {"$expr": {"$lte": ["$quantity", "$min_quantity"]}} if low_stock else {}
    items = await db.products.find(query, {"_id": 0}).to_list(1000)
    for i in items: 
        deserialize_datetime(i)
    return items

@api_router.put("/products/{id}", response_model=Product)
async def update_product(id: str, update: ProductUpdate):
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not data: 
        raise HTTPException(400, "No data")
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({"id": id}, {"$set": data})
    p = await db.products.find_one({"id": id}, {"_id": 0})
    return deserialize_datetime(p)

@api_router.delete("/products/{id}")
async def delete_product(id: str):
    await db.products.delete_one({"id": id})
    return {"msg": "Deleted"}

# --- Contacts Routes ---
@api_router.post("/contacts", response_model=Contact)
async def create_contact(c: ContactCreate):
    obj = Contact(**c.model_dump())
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.contacts.insert_one(doc)
    return obj

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(contact_type: Optional[str] = None):
    query = {"contact_type": contact_type} if contact_type else {}
    items = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    for i in items: 
        deserialize_datetime(i)
    return items

@api_router.put("/contacts/{id}", response_model=Contact)
async def update_contact(id: str, update: ContactUpdate):
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.contacts.update_one({"id": id}, {"$set": data})
    c = await db.contacts.find_one({"id": id}, {"_id": 0})
    return deserialize_datetime(c)

@api_router.delete("/contacts/{id}")
async def delete_contact(id: str):
    await db.contacts.delete_one({"id": id})
    return {"msg": "Deleted"}

# --- Invoices Routes ---
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(data: InvoiceCreate):
    # 1. تحديد العميل
    contact_id = data.contact_id
    contact_name = ""
    if data.new_contact_name and not contact_id:
        contact_id = await get_or_create_contact(data.new_contact_name)
        contact = await db.contacts.find_one({"id": contact_id})
        contact_name = contact['name']
    elif contact_id:
        contact = await db.contacts.find_one({"id": contact_id})
        contact_name = contact['name']

    # 2. التحقق من توفر الكمية (للمبيعات فقط) - ✅ Feature 1: Now handles float quantities
    if data.invoice_type == "sale":
        for item in data.items:
            prod_check = await db.products.find_one({"id": item.product_id})
            if not prod_check:
                raise HTTPException(404, f"المنتج غير موجود: {item.product_id}")
            if prod_check['quantity'] < item.quantity:
                raise HTTPException(400, f"عفواً، الكمية غير متوفرة للمنتج: {prod_check['name']}. المتوفر حالياً: {prod_check['quantity']}")

    # 3. معالجة المنتجات وتحديث المخزون
    items = []
    subtotal = 0.0
    for item in data.items:
        prod = await db.products.find_one({"id": item.product_id})
        if prod:
            price = prod['sale_price'] if data.invoice_type == "sale" else prod['purchase_price']
            total = price * item.quantity
            items.append(InvoiceItemBase(
                product_id=item.product_id, 
                product_name=prod['name'], 
                quantity=item.quantity,  # ✅ Feature 1: float quantity
                unit_price=price, 
                total=total
            ))
            subtotal += total
            
            # خصم/إضافة الكمية للمخزون - ✅ Feature 1: Now handles float quantities
            qty_change = -item.quantity if data.invoice_type == "sale" else item.quantity
            await db.products.update_one({"id": item.product_id}, {"$inc": {"quantity": qty_change}})

    # 4. حفظ الفاتورة في قاعدة البيانات
    inv_num = await get_next_invoice_number(data.invoice_type)
    inv = Invoice(
        invoice_type=data.invoice_type, 
        contact_id=contact_id, 
        contact_name=contact_name, 
        invoice_number=inv_num, 
        items=[i.model_dump() for i in items], 
        subtotal=subtotal, 
        total=subtotal, 
        notes=data.notes,
        status=data.status
    )
    doc = inv.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.invoices.insert_one(doc)

    # 5. المعالجة المالية
    if data.status == "paid":
        txn_type = "receipt" if data.invoice_type == "sale" else "payment"
        await db.cash_transactions.insert_one({
            "id": str(uuid.uuid4()), 
            "transaction_type": txn_type, 
            "amount": subtotal,
            "description": f"Invoice {inv_num} (Instant Payment)", 
            "contact_id": contact_id, 
            "invoice_id": inv.id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        bal_change = subtotal if data.invoice_type == "sale" else -subtotal
        await db.contacts.update_one({"id": contact_id}, {"$inc": {"balance": bal_change}})

    return inv

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(invoice_type: Optional[str] = None):
    query = {"invoice_type": invoice_type} if invoice_type else {}
    items = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for i in items: 
        deserialize_datetime(i)
    return items

@api_router.put("/invoices/{id}")
async def update_invoice(id: str, payload: Dict[str, Any]):
    existing = await db.invoices.find_one({"id": id}, {"_id": 0})
    if not existing: 
        raise HTTPException(404, "Not found")
    
    if 'items' in payload:
        for item in existing.get('items', []):
            qty = item['quantity'] if existing['invoice_type'] == "sale" else -item['quantity']
            await db.products.update_one({"id": item['product_id']}, {"$inc": {"quantity": qty}})
        old_total = existing.get('total', 0)
        bal_rev = -old_total if existing['invoice_type'] == "sale" else old_total
        await db.contacts.update_one({"id": existing['contact_id']}, {"$inc": {"balance": bal_rev}})
    
    update_dict = {}
    if 'notes' in payload: 
        update_dict['notes'] = payload['notes']
    if 'status' in payload: 
        update_dict['status'] = payload['status']
    
    contact_id = existing['contact_id']
    if 'items' in payload:
        new_items = []
        subtotal = 0.0
        inv_type = payload.get('invoice_type', existing['invoice_type'])
        for item in payload['items']:
            prod = await db.products.find_one({"id": item['product_id']})
            if prod:
                price = prod['sale_price'] if inv_type == "sale" else prod['purchase_price']
                quantity = float(item['quantity'])  # ✅ Feature 1: Handle float quantity
                total = price * quantity
                new_items.append({
                    "product_id": item['product_id'], 
                    "product_name": prod['name'], 
                    "quantity": quantity, 
                    "unit_price": price, 
                    "total": total
                })
                subtotal += total
                qty_change = -quantity if inv_type == "sale" else quantity
                await db.products.update_one({"id": item['product_id']}, {"$inc": {"quantity": qty_change}})
        update_dict['items'] = new_items
        update_dict['subtotal'] = subtotal
        update_dict['total'] = subtotal
        new_bal = subtotal if inv_type == "sale" else -subtotal
        await db.contacts.update_one({"id": contact_id}, {"$inc": {"balance": new_bal}})
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"id": id}, {"$set": update_dict})
    
    new_status = update_dict.get('status', existing.get('status'))
    old_status = existing.get('status')
    if new_status == "paid" and old_status != "paid":
        txn_type = "receipt" if existing['invoice_type'] == "sale" else "payment"
        await db.cash_transactions.insert_one({
            "id": str(uuid.uuid4()), 
            "transaction_type": txn_type, 
            "amount": update_dict.get('total', existing['total']),
            "description": f"Invoice {existing['invoice_number']}", 
            "contact_id": contact_id, 
            "invoice_id": id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif new_status != "paid" and old_status == "paid":
        await db.cash_transactions.delete_one({"invoice_id": id})
    
    return {"msg": "Updated"}

@api_router.delete("/invoices/{id}")
async def delete_invoice(id: str):
    inv = await db.invoices.find_one({"id": id})
    if not inv: 
        raise HTTPException(404)
    for item in inv.get('items', []):
        qty = item['quantity'] if inv['invoice_type'] == "sale" else -item['quantity']
        await db.products.update_one({"id": item['product_id']}, {"$inc": {"quantity": qty}})
    bal_rev = -inv['total'] if inv['invoice_type'] == "sale" else inv['total']
    await db.contacts.update_one({"id": inv['contact_id']}, {"$inc": {"balance": bal_rev}})
    await db.cash_transactions.delete_one({"invoice_id": id})
    await db.invoices.delete_one({"id": id})
    return {"msg": "Deleted"}

# --- Cash Transactions Routes ---
@api_router.post("/transactions", response_model=CashTransaction)
async def create_txn(txn: CashTransactionCreate):
    contact_name = None
    if txn.contact_id:
        c = await db.contacts.find_one({"id": txn.contact_id})
        if c:
            contact_name = c['name']
            change = -txn.amount if txn.transaction_type == "receipt" else txn.amount
            await db.contacts.update_one({"id": txn.contact_id}, {"$inc": {"balance": change}})
    data = txn.model_dump()
    data['contact_name'] = contact_name
    obj = CashTransaction(**data)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.cash_transactions.insert_one(doc)
    return obj

@api_router.get("/transactions", response_model=List[CashTransaction])
async def get_txns(transaction_type: Optional[str] = None):
    query = {"transaction_type": transaction_type} if transaction_type else {}
    items = await db.cash_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for i in items: 
        deserialize_datetime(i)
    return items

@api_router.put("/transactions/{id}", response_model=CashTransaction)
async def update_txn(id: str, update: CashTransactionUpdate):
    old = await db.cash_transactions.find_one({"id": id}, {"_id": 0})
    if not old: 
        raise HTTPException(404, "Not found")
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    if old.get('contact_id'):
        rev = old['amount'] if old['transaction_type'] == "receipt" else -old['amount']
        await db.contacts.update_one({"id": old['contact_id']}, {"$inc": {"balance": rev}})
    await db.cash_transactions.update_one({"id": id}, {"$set": data})
    new_txn = await db.cash_transactions.find_one({"id": id}, {"_id": 0})
    if new_txn.get('contact_id'):
        change = -new_txn['amount'] if new_txn['transaction_type'] == "receipt" else new_txn['amount']
        await db.contacts.update_one({"id": new_txn['contact_id']}, {"$inc": {"balance": change}})
        c = await db.contacts.find_one({"id": new_txn['contact_id']})
        if c: 
            await db.cash_transactions.update_one({"id": id}, {"$set": {"contact_name": c['name']}})
    return deserialize_datetime(new_txn)

@api_router.delete("/transactions/{id}")
async def delete_txn(id: str):
    txn = await db.cash_transactions.find_one({"id": id})
    if txn and txn.get('contact_id'):
        rev = txn['amount'] if txn['transaction_type'] == "receipt" else -txn['amount']
        await db.contacts.update_one({"id": txn['contact_id']}, {"$inc": {"balance": rev}})
    await db.cash_transactions.delete_one({"id": id})
    return {"msg": "Deleted"}

@api_router.get("/transactions/balance")
async def get_balance():
    pipeline = [{"$group": {"_id": "$transaction_type", "total": {"$sum": "$amount"}}}]
    res = await db.cash_transactions.aggregate(pipeline).to_list(10)
    receipts = next((r['total'] for r in res if r['_id'] == 'receipt'), 0)
    payments = next((r['total'] for r in res if r['_id'] == 'payment'), 0)
    expenses = next((r['total'] for r in res if r['_id'] == 'expense'), 0)  # ✅ Include expenses
    return {"receipts": receipts, "payments": payments, "expenses": expenses, "balance": receipts - payments - expenses}

# ✅ Feature 4: Expenses Routes
@api_router.post("/expenses")
async def create_expense(data: ExpenseCreate):
    """Create a new expense and automatically add to cash transactions"""
    # 1. Save expense to expenses collection
    expense = Expense(
        name=data.name,
        amount=data.amount,
        notes=data.notes
    )
    doc = expense.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.expenses.insert_one(doc)
    
    # 2. CRITICAL: Insert into cash_transactions to update cash balance
    txn_doc = {
        "id": str(uuid.uuid4()),
        "transaction_type": "expense",
        "amount": data.amount,
        "description": f"مصروف: {data.name}" + (f" - {data.notes}" if data.notes else ""),
        "contact_id": None,
        "contact_name": None,
        "invoice_id": None,
        "expense_id": expense.id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cash_transactions.insert_one(txn_doc)
    
    return {"msg": "Expense created", "expense_id": expense.id}

@api_router.get("/expenses")
async def get_expenses(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get all expenses with optional date filtering"""
    query = {}
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = start_date
        if end_date:
            query["created_at"]["$lte"] = end_date
    
    items = await db.expenses.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for i in items: 
        deserialize_datetime(i)
    return items

@api_router.delete("/expenses/{id}")
async def delete_expense(id: str):
    """Delete expense and its associated cash transaction"""
    await db.expenses.delete_one({"id": id})
    await db.cash_transactions.delete_one({"expense_id": id})
    return {"msg": "Deleted"}

# --- Reports Routes ---
@api_router.get("/reports/profit-loss")
async def get_profit_loss_report(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if start_date: 
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query: 
            query["created_at"]["$lte"] = end_date
        else: 
            query["created_at"] = {"$lte": end_date}
    
    # 1. حساب المبيعات
    sales_pipeline = [{"$match": {**query, "invoice_type": "sale"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    sales_res = await db.invoices.aggregate(sales_pipeline).to_list(1)
    sales_total = sales_res[0]['total'] if sales_res else 0.0
    
    # 2. حساب المشتريات
    pur_pipeline = [{"$match": {**query, "invoice_type": "purchase"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    pur_res = await db.invoices.aggregate(pur_pipeline).to_list(1)
    pur_total = pur_res[0]['total'] if pur_res else 0.0
    
    # 3. حساب المصروفات
    expense_pipeline = [{"$match": query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    expense_res = await db.expenses.aggregate(expense_pipeline).to_list(1)
    expenses_total = expense_res[0]['total'] if expense_res else 0.0
    
    # 4. النتائج
    gross_profit = sales_total - pur_total - expenses_total
    profit_margin = (gross_profit / sales_total * 100) if sales_total > 0 else 0.0

    return {
        "sales_total": sales_total, 
        "purchases_total": pur_total,
        "expenses_total": expenses_total,
        "gross_profit": gross_profit,
        "profit_margin": profit_margin
    }

@api_router.get("/reports/dashboard")
async def dashboard():
    # 1. عداد المنتجات والنواقص
    prod_count = await db.products.count_documents({})
    low_stock = await db.products.count_documents({"$expr": {"$lte": ["$quantity", "$min_quantity"]}})
    
    # 2. عداد العملاء
    customers_count = await db.contacts.count_documents({"contact_type": "customer"})

    # 3. حساب إجمالي المبيعات
    sales_pipeline = [
        {"$match": {"invoice_type": "sale"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    sales_res = await db.invoices.aggregate(sales_pipeline).to_list(1)
    total_sales = sales_res[0]['total'] if sales_res else 0.0

    # 4. حساب إجمالي المشتريات
    pur_pipeline = [
        {"$match": {"invoice_type": "purchase"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    pur_res = await db.invoices.aggregate(pur_pipeline).to_list(1)
    total_purchases = pur_res[0]['total'] if pur_res else 0.0

    # 5. حساب رصيد الصندوق (يشمل المصروفات الآن)
    balance_pipeline = [
        {"$group": {
            "_id": "$transaction_type",
            "total": {"$sum": "$amount"}
        }}
    ]
    bal_res = await db.cash_transactions.aggregate(balance_pipeline).to_list(10)
    receipts = next((item['total'] for item in bal_res if item['_id'] == 'receipt'), 0.0)
    payments = next((item['total'] for item in bal_res if item['_id'] == 'payment'), 0.0)
    expenses = next((item['total'] for item in bal_res if item['_id'] == 'expense'), 0.0)
    cash_balance = receipts - payments - expenses

    # 6. جلب أحدث 5 فواتير
    recent_invoices = await db.invoices.find({}, {"_id": 0})\
        .sort("created_at", -1)\
        .limit(5)\
        .to_list(5)

    return {
        "products_count": prod_count,
        "low_stock_count": low_stock,
        "customers_count": customers_count,
        "total_sales": total_sales,
        "total_purchases": total_purchases,
        "cash_balance": cash_balance,
        "recent_invoices": recent_invoices
    }

# ✅ Feature 2: Updated Account Statement with Date Filtering
@api_router.get("/reports/account-statement/{contact_id}")
async def get_account_statement(
    contact_id: str, 
    start_date: Optional[str] = None,  # Format: YYYY-MM-DD
    end_date: Optional[str] = None     # Format: YYYY-MM-DD
):
    # 1. جلب بيانات العميل
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact: 
        raise HTTPException(404, "جهة الاتصال غير موجودة")
    
    # 2. بناء استعلام الفواتير مع التاريخ
    invoice_query = {"contact_id": contact_id}
    if start_date or end_date:
        invoice_query["created_at"] = {}
        if start_date:
            invoice_query["created_at"]["$gte"] = f"{start_date}T00:00:00"
        if end_date:
            invoice_query["created_at"]["$lte"] = f"{end_date}T23:59:59"
    
    # 3. جلب الفواتير المرتبطة به
    invoices = await db.invoices.find(invoice_query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # 4. بناء استعلام المعاملات مع التاريخ
    txn_query = {"contact_id": contact_id}
    if start_date or end_date:
        txn_query["created_at"] = {}
        if start_date:
            txn_query["created_at"]["$gte"] = f"{start_date}T00:00:00"
        if end_date:
            txn_query["created_at"]["$lte"] = f"{end_date}T23:59:59"
    
    # 5. جلب الدفعات المالية المرتبطة به
    txns = await db.cash_transactions.find(txn_query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return {
        "contact": contact, 
        "invoices": invoices, 
        "transactions": txns, 
        "current_balance": contact.get('balance', 0.0),
        "filter": {
            "start_date": start_date,
            "end_date": end_date
        }
    }

# ✅ Feature 3: Updated Inventory Report with Date Filtering
@api_router.get("/reports/inventory")
async def get_inventory_report(
    start_date: Optional[str] = None,  # Format: YYYY-MM-DD
    end_date: Optional[str] = None     # Format: YYYY-MM-DD
):
    # بناء الاستعلام مع التاريخ
    query = {}
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = f"{start_date}T00:00:00"
        if end_date:
            query["created_at"]["$lte"] = f"{end_date}T23:59:59"
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    total_val = 0.0
    low_stock = []
    
    for p in products:
        qty = p.get('quantity', 0)
        price = p.get('purchase_price', 0)
        min_qty = p.get('min_quantity', 10)
        
        val = qty * price
        total_val += val
        p['stock_value'] = val
        
        if qty <= min_qty: 
            low_stock.append(p)
            
    return {
        "products": products, 
        "total_items": len(products), 
        "total_value": total_val, 
        "low_stock_count": len(low_stock), 
        "low_stock_items": low_stock,
        "filter": {
            "start_date": start_date,
            "end_date": end_date
        }
    }

# ✅ دالة النسخ الاحتياطي
@api_router.get("/system/backup/excel")
async def backup_excel():
    global window
    
    # 1. جلب البيانات
    prods = await db.products.find({}, {"_id": 0, "id": 0, "created_at": 0, "updated_at": 0}).to_list(10000)
    contacts = await db.contacts.find({}, {"_id": 0, "id": 0, "created_at": 0, "updated_at": 0}).to_list(10000)
    invoices = await db.invoices.find({}, {"_id": 0, "id": 0, "updated_at": 0}).to_list(10000)
    txns = await db.cash_transactions.find({}, {"_id": 0, "id": 0}).to_list(10000)
    expenses = await db.expenses.find({}, {"_id": 0, "id": 0}).to_list(10000)  # ✅ Include expenses
    
    # 2. تحويل إلى DataFrames
    df_p = pd.DataFrame(prods)
    df_c = pd.DataFrame(contacts)
    df_i = pd.DataFrame(invoices)
    df_t = pd.DataFrame(txns)
    df_e = pd.DataFrame(expenses)  # ✅ Expenses dataframe
    
    # 3. تغيير أسماء الأعمدة إلى العربية
    if not df_p.empty:
        df_p.rename(columns={
            "name": "اسم المنتج",
            "purchase_price": "سعر الشراء",
            "sale_price": "سعر البيع",
            "quantity": "الكمية",
            "min_quantity": "الحد الأدنى",
            "description": "الوصف"
        }, inplace=True)

    if not df_c.empty:
        df_c.rename(columns={
            "name": "الاسم",
            "contact_type": "النوع",
            "phone": "الهاتف",
            "email": "الإيميل",
            "address": "العنوان",
            "balance": "الرصيد"
        }, inplace=True)
        df_c['النوع'] = df_c['النوع'].replace({'customer': 'عميل', 'supplier': 'مورد'})

    if not df_i.empty:
        df_i.rename(columns={
            "invoice_number": "رقم الفاتورة",
            "contact_name": "الاسم",
            "total": "الإجمالي",
            "invoice_type": "نوع الفاتورة",
            "status": "الحالة",
            "created_at": "التاريخ"
        }, inplace=True)
        if 'items' in df_i.columns:
            df_i['items'] = df_i['items'].apply(lambda x: str(x))
    
    # ✅ Expenses sheet
    if not df_e.empty:
        df_e.rename(columns={
            "name": "اسم المصروف",
            "amount": "المبلغ",
            "notes": "ملاحظات",
            "created_at": "التاريخ"
        }, inplace=True)

    suggested_name = f"AlMoheet_Backup_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    save_path = window.create_file_dialog(
        webview.SAVE_DIALOG, directory='', save_filename=suggested_name,
        file_types=('Excel Files (*.xlsx)', 'All files (*.*)')
    )
    
    if not save_path: 
        raise HTTPException(400, "Cancelled")
    if isinstance(save_path, (list, tuple)): 
        save_path = save_path[0]
    
    try:
        with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
            if not df_p.empty: df_p.to_excel(writer, sheet_name='المنتجات', index=False)
            if not df_c.empty: df_c.to_excel(writer, sheet_name='العملاء والموردين', index=False)
            if not df_i.empty: df_i.to_excel(writer, sheet_name='الفواتير', index=False)
            if not df_t.empty: df_t.to_excel(writer, sheet_name='الصندوق', index=False)
            if not df_e.empty: df_e.to_excel(writer, sheet_name='المصروفات', index=False)  # ✅ New sheet
        return {"message": "Success", "path": save_path}
    except Exception as e:
        raise HTTPException(500, str(e))
    
app.include_router(api_router)

# ---------------------------------------------------------
# 2. تشغيل الواجهة
# ---------------------------------------------------------
frontend_dist_path = os.path.join(ROOT_DIR, "frontend", "build")
if getattr(sys, 'frozen', False):
    frontend_dist_path = os.path.join(sys._MEIPASS, "frontend", "build")

if os.path.exists(frontend_dist_path):
    static_folder = os.path.join(frontend_dist_path, "static")
    if os.path.exists(static_folder):
        try: 
            app.mount("/static", StaticFiles(directory=static_folder), name="static")
        except: 
            pass
    assets_folder = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_folder):
        try: 
            app.mount("/assets", StaticFiles(directory=assets_folder), name="assets")
        except: 
            pass

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api"): 
            raise HTTPException(404)
        possible_file = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(possible_file) and os.path.isfile(possible_file):
            return FileResponse(possible_file)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

if __name__ == "__main__":
    def start_server():
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()
    time.sleep(1)

    window = webview.create_window(
        title="المُحيط - نظام المحاسبة",
        url="http://127.0.0.1:8000",
        width=1280,
        height=800,
        min_size=(1024, 700),
        maximized=True,
        resizable=True,
        background_color='#f8fafc',
        text_select=False,
        confirm_close=True  
    )

    webview.start(debug=False)