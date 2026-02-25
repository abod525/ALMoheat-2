"""
ALMoheat Accounting System - Backend API v2.0
FastAPI + MongoDB with Strict Dual-Unit System
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

# Initialize FastAPI app
app = FastAPI(title="ALMoheat Accounting System", version="2.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client.almoheat_db

# ==================== ENUMS ====================

class UnitType(str, Enum):
    SIMPLE = "simple"
    DUAL = "dual"

class SaleUnit(str, Enum):
    COUNT = "count"
    WEIGHT = "weight"

class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"

# ==================== PRODUCT MODELS ====================

class ProductBase(BaseModel):
    name: str
    cost: float = Field(ge=0)
    price: float = Field(ge=0)
    unit_type: UnitType = UnitType.SIMPLE
    weight_per_unit: Optional[float] = Field(default=None, ge=0)
    stock_count: float = Field(default=0, ge=0)
    stock_weight: float = Field(default=0, ge=0)
    
    @model_validator(mode='after')
    def validate_dual_unit(self):
        """Validate dual unit products have weight_per_unit"""
        if self.unit_type == UnitType.DUAL:
            if self.weight_per_unit is None or self.weight_per_unit <= 0:
                raise ValueError('weight_per_unit is required and must be > 0 when unit_type is "dual"')
            # Ensure stock_weight is synchronized
            expected_weight = self.stock_count * self.weight_per_unit
            if abs(self.stock_weight - expected_weight) > 0.001:  # Small tolerance for float
                self.stock_weight = expected_weight
        return self

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[float] = Field(default=None, ge=0)
    price: Optional[float] = Field(default=None, ge=0)
    unit_type: Optional[UnitType] = None
    weight_per_unit: Optional[float] = Field(default=None, ge=0)
    stock_count: Optional[float] = Field(default=None, ge=0)
    stock_weight: Optional[float] = Field(default=None, ge=0)

class Product(ProductBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== INVOICE ITEM MODELS ====================

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)
    total: float
    sale_unit: SaleUnit = SaleUnit.COUNT
    weight_per_unit: Optional[float] = None

class InvoiceItemDisplay(InvoiceItem):
    """Extended invoice item for display in reports"""
    pass

# ==================== INVOICE MODELS ====================

class InvoiceBase(BaseModel):
    customer_id: str
    customer_name: str
    invoice_number: str
    date: datetime
    items: List[InvoiceItem]
    subtotal: float
    discount: float = Field(default=0, ge=0)
    total: float
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== CLIENT MODELS ====================

class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    balance: float = Field(default=0)

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    balance: Optional[float] = None

class Client(ClientBase):
    id: str = Field(alias="_id")
    created_at: datetime
    last_transaction_date: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== EXPENSE/CASH MODELS ====================

class ExpenseBase(BaseModel):
    date: datetime
    type: TransactionType
    amount: float = Field(gt=0)
    note: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    """Convert MongoDB document to serializable dict"""
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    return doc

def serialize_docs(docs):
    """Convert multiple MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]

# ==================== PRODUCT ENDPOINTS ====================

@app.get("/api/products", response_model=List[Product])
async def get_products():
    """Get all products"""
    products = await db.products.find().sort("name", 1).to_list(length=None)
    return serialize_docs(products)

@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a single product by ID"""
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return serialize_doc(product)

@app.post("/api/products", response_model=Product)
async def create_product(product: ProductCreate):
    """Create a new product with synchronized stock"""
    now = datetime.now()
    
    # For dual unit products, ensure stock_weight consistency
    stock_weight = product.stock_weight
    if product.unit_type == UnitType.DUAL and product.weight_per_unit:
        stock_weight = product.stock_count * product.weight_per_unit
    
    product_data = {
        **product.model_dump(),
        "stock_weight": stock_weight,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.products.insert_one(product_data)
    created = await db.products.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@app.put("/api/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate):
    """Update a product with synchronized stock"""
    existing = await db.products.find_one({"_id": ObjectId(product_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    # For dual unit products, maintain stock_weight consistency
    if existing.get("unit_type") == UnitType.DUAL or update_data.get("unit_type") == UnitType.DUAL:
        weight_per_unit = update_data.get("weight_per_unit", existing.get("weight_per_unit"))
        stock_count = update_data.get("stock_count", existing.get("stock_count", 0))
        if weight_per_unit:
            update_data["stock_weight"] = stock_count * weight_per_unit
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    updated = await db.products.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(updated)

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return {"message": "تم حذف المنتج بنجاح"}

# ==================== INVOICE ENDPOINTS ====================

@app.get("/api/invoices", response_model=List[Invoice])
async def get_invoices(
    customer_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all invoices with optional filtering"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    invoices = await db.invoices.find(query).sort("date", -1).to_list(length=None)
    return serialize_docs(invoices)

@app.get("/api/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    """Get a single invoice by ID"""
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")
    return serialize_doc(invoice)

@app.post("/api/invoices", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate):
    """Create a new invoice with STRICT dual unit stock validation"""
    
    # Validate and update stock for each item
    for item in invoice.items:
        product = await db.products.find_one({"_id": ObjectId(item.product_id)})
        if not product:
            raise HTTPException(status_code=404, detail=f"المنتج غير موجود: {item.product_id}")
        
        # Set product name and weight_per_unit snapshot
        item.product_name = product["name"]
        item.weight_per_unit = product.get("weight_per_unit")
        
        if product.get("unit_type") == UnitType.DUAL:
            weight_per_unit = product.get("weight_per_unit", 1)
            
            if item.sale_unit == SaleUnit.COUNT:
                # Selling by count: validate stock_count
                if product.get("stock_count", 0) < item.quantity:
                    available = product.get("stock_count", 0)
                    raise HTTPException(
                        status_code=400, 
                        detail=f"الكمية غير متوفرة! المتاح: {available} كيس"
                    )
                
                # Deduct from stock_count and stock_weight
                deduct_count = item.quantity
                deduct_weight = item.quantity * weight_per_unit
                
                # Additional validation for weight
                if product.get("stock_weight", 0) < deduct_weight:
                    available_weight = product.get("stock_weight", 0)
                    raise HTTPException(
                        status_code=400,
                        detail=f"الوزن غير متوفر! المتاح: {available_weight} كغ"
                    )
                
                new_stock_count = product.get("stock_count", 0) - deduct_count
                new_stock_weight = product.get("stock_weight", 0) - deduct_weight
                
            else:  # SaleUnit.WEIGHT
                # Selling by weight: validate stock_weight
                if product.get("stock_weight", 0) < item.quantity:
                    available_weight = product.get("stock_weight", 0)
                    raise HTTPException(
                        status_code=400,
                        detail=f"الوزن غير متوفر! المتاح: {available_weight} كغ"
                    )
                
                # Deduct from stock_weight and recalculate stock_count
                deduct_weight = item.quantity
                deduct_count = item.quantity / weight_per_unit
                
                new_stock_weight = product.get("stock_weight", 0) - deduct_weight
                new_stock_count = new_stock_weight / weight_per_unit
            
            # Apply stock update
            await db.products.update_one(
                {"_id": ObjectId(item.product_id)},
                {
                    "$set": {
                        "stock_count": new_stock_count,
                        "stock_weight": new_stock_weight,
                        "updated_at": datetime.now()
                    }
                }
            )
            
        else:
            # Simple unit product - validate stock_count
            if product.get("stock_count", 0) < item.quantity:
                available = product.get("stock_count", 0)
                raise HTTPException(
                    status_code=400,
                    detail=f"الكمية غير متوفرة! المتاح: {available}"
                )
            
            new_stock_count = product.get("stock_count", 0) - item.quantity
            await db.products.update_one(
                {"_id": ObjectId(item.product_id)},
                {
                    "$set": {
                        "stock_count": new_stock_count,
                        "updated_at": datetime.now()
                    }
                }
            )
    
    # Create invoice
    invoice_data = {
        **invoice.model_dump(),
        "created_at": datetime.now()
    }
    
    result = await db.invoices.insert_one(invoice_data)
    created = await db.invoices.find_one({"_id": result.inserted_id})
    
    # Update customer balance and last transaction date
    await db.clients.update_one(
        {"_id": ObjectId(invoice.customer_id)},
        {
            "$inc": {"balance": invoice.total},
            "$set": {"last_transaction_date": datetime.now()}
        }
    )
    
    return serialize_doc(created)

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice and restore stock"""
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")
    
    # Restore stock for each item
    for item in invoice.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product and product.get("unit_type") == UnitType.DUAL:
            weight_per_unit = item.get("weight_per_unit", product.get("weight_per_unit", 1))
            
            if item.get("sale_unit") == SaleUnit.COUNT:
                restore_count = item["quantity"]
                restore_weight = item["quantity"] * weight_per_unit
            else:
                restore_weight = item["quantity"]
                restore_count = item["quantity"] / weight_per_unit
            
            await db.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {
                    "$inc": {
                        "stock_count": restore_count,
                        "stock_weight": restore_weight
                    },
                    "$set": {"updated_at": datetime.now()}
                }
            )
        else:
            await db.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {
                    "$inc": {"stock_count": item["quantity"]},
                    "$set": {"updated_at": datetime.now()}
                }
            )
    
    # Restore customer balance
    await db.clients.update_one(
        {"_id": ObjectId(invoice["customer_id"])},
        {"$inc": {"balance": -invoice["total"]}}
    )
    
    await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    return {"message": "تم حذف الفاتورة بنجاح"}

# ==================== CLIENT ENDPOINTS ====================

@app.get("/api/clients", response_model=List[Client])
async def get_clients():
    """Get all clients"""
    clients = await db.clients.find().sort("name", 1).to_list(length=None)
    return serialize_docs(clients)

@app.get("/api/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a single client by ID"""
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    return serialize_doc(client)

@app.post("/api/clients", response_model=Client)
async def create_client(client: ClientCreate):
    """Create a new client"""
    client_data = {
        **client.model_dump(),
        "created_at": datetime.now(),
        "last_transaction_date": None
    }
    result = await db.clients.insert_one(client_data)
    created = await db.clients.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@app.put("/api/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client: ClientUpdate):
    """Update a client"""
    update_data = {k: v for k, v in client.model_dump().items() if v is not None}
    
    result = await db.clients.update_one(
        {"_id": ObjectId(client_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    
    updated = await db.clients.find_one({"_id": ObjectId(client_id)})
    return serialize_doc(updated)

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    result = await db.clients.delete_one({"_id": ObjectId(client_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    return {"message": "تم حذف العميل بنجاح"}

# ==================== EXPENSE ENDPOINTS ====================

@app.get("/api/expenses", response_model=List[Expense])
async def get_expenses(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all expenses with optional date filtering"""
    query = {}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    expenses = await db.expenses.find(query).sort("date", -1).to_list(length=None)
    return serialize_docs(expenses)

@app.post("/api/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate):
    """Create a new expense/cash transaction"""
    expense_data = {
        **expense.model_dump(),
        "created_at": datetime.now()
    }
    result = await db.expenses.insert_one(expense_data)
    created = await db.expenses.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense"""
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    return {"message": "تم حذف المعاملة بنجاح"}

# ==================== REPORTS ENDPOINTS ====================

@app.get("/api/reports/account-statement/{client_id}")
async def get_account_statement(
    client_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get account statement for a client with full invoice items"""
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    
    query = {"customer_id": client_id}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    invoices = await db.invoices.find(query).sort("date", -1).to_list(length=None)
    
    return {
        "client": serialize_doc(client),
        "invoices": serialize_docs(invoices)
    }

@app.get("/api/reports/inventory")
async def get_inventory_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get inventory report with optional date filtering"""
    query = {}
    
    # If dates provided, filter products created or updated within range
    if start_date and end_date:
        query["$or"] = [
            {"created_at": {"$gte": start_date, "$lte": end_date}},
            {"updated_at": {"$gte": start_date, "$lte": end_date}}
        ]
    
    products = await db.products.find(query).sort("name", 1).to_list(length=None)
    
    # Calculate total values
    total_value_cost = 0
    total_value_price = 0
    
    for p in products:
        if p.get("unit_type") == UnitType.DUAL:
            total_value_cost += p.get("stock_count", 0) * p.get("cost", 0)
            total_value_price += p.get("stock_count", 0) * p.get("price", 0)
        else:
            total_value_cost += p.get("stock_count", 0) * p.get("cost", 0)
            total_value_price += p.get("stock_count", 0) * p.get("price", 0)
    
    return {
        "products": serialize_docs(products),
        "summary": {
            "total_products": len(products),
            "total_value_cost": total_value_cost,
            "total_value_price": total_value_price
        }
    }

@app.get("/api/reports/financial")
async def get_financial_report(
    start_date: datetime,
    end_date: datetime
):
    """Get financial report for a date range"""
    
    # Get invoices in range
    invoices = await db.invoices.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(length=None)
    
    # Get expenses in range
    expenses = await db.expenses.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(length=None)
    
    total_sales = sum(inv.get("total", 0) for inv in invoices)
    total_expenses = sum(exp.get("amount", 0) for exp in expenses if exp.get("type") == TransactionType.EXPENSE)
    total_income = sum(exp.get("amount", 0) for exp in expenses if exp.get("type") == TransactionType.INCOME)
    
    return {
        "total_sales": total_sales,
        "total_expenses": total_expenses,
        "total_income": total_income,
        "net_profit": total_sales - total_expenses + total_income,
        "invoices_count": len(invoices),
        "expenses_count": len(expenses)
    }

# ==================== BACKUP ENDPOINT ====================

@app.get("/api/backup/excel")
async def backup_excel():
    """Generate comprehensive Excel backup with all data"""
    
    # Create Excel writer
    output = BytesIO()
    writer = pd.ExcelWriter(output, engine='openpyxl')
    
    # ==================== Sheet 1: Products ====================
    products = await db.products.find().to_list(length=None)
    if products:
        products_data = []
        for p in products:
            is_dual = p.get("unit_type") == UnitType.DUAL
            products_data.append({
                "اسم المنتج": p.get("name", ""),
                "سعر التكلفة": p.get("cost", 0),
                "سعر البيع": p.get("price", 0),
                "نوع الوحدة": "ثنائية" if is_dual else "بسيطة",
                "الوزن لكل وحدة": p.get("weight_per_unit", "-") if is_dual else "-",
                "الكمية (عدد)": p.get("stock_count", 0),
                "الكمية (وزن كغ)": p.get("stock_weight", 0) if is_dual else "-",
                "القيمة الإجمالية": p.get("stock_count", 0) * p.get("price", 0)
            })
        
        df_products = pd.DataFrame(products_data)
        df_products.to_excel(writer, sheet_name='المنتجات', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['المنتجات']
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    # ==================== Sheet 2: Clients ====================
    clients = await db.clients.find().to_list(length=None)
    if clients:
        clients_data = []
        for c in clients:
            last_trans = c.get("last_transaction_date")
            clients_data.append({
                "اسم العميل": c.get("name", ""),
                "رقم الهاتف": c.get("phone", ""),
                "الرصيد": c.get("balance", 0),
                "آخر معاملة": last_trans.strftime("%Y-%m-%d") if last_trans else "-"
            })
        
        df_clients = pd.DataFrame(clients_data)
        df_clients.to_excel(writer, sheet_name='العملاء', index=False)
        
        worksheet = writer.sheets['العملاء']
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    # ==================== Sheet 3: Invoices Detailed ====================
    invoices = await db.invoices.find().to_list(length=None)
    if invoices:
        invoices_data = []
        for inv in invoices:
            inv_date = inv.get("date")
            if isinstance(inv_date, datetime):
                date_str = inv_date.strftime("%Y-%m-%d %H:%M")
            else:
                date_str = str(inv_date)
            
            for item in inv.get("items", []):
                invoices_data.append({
                    "رقم الفاتورة": inv.get("invoice_number", ""),
                    "التاريخ": date_str,
                    "العميل": inv.get("customer_name", ""),
                    "اسم المنتج": item.get("product_name", ""),
                    "الكمية": item.get("quantity", 0),
                    "وحدة البيع": "عدد" if item.get("sale_unit") == SaleUnit.COUNT else "وزن",
                    "سعر الوحدة": item.get("unit_price", 0),
                    "الإجمالي": item.get("total", 0)
                })
        
        df_invoices = pd.DataFrame(invoices_data)
        df_invoices.to_excel(writer, sheet_name='الفواتير تفصيلي', index=False)
        
        worksheet = writer.sheets['الفواتير تفصيلي']
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    # ==================== Sheet 4: Expenses/Cash ====================
    expenses = await db.expenses.find().to_list(length=None)
    if expenses:
        expenses_data = []
        for e in expenses:
            exp_date = e.get("date")
            if isinstance(exp_date, datetime):
                date_str = exp_date.strftime("%Y-%m-%d")
            else:
                date_str = str(exp_date)
            
            expenses_data.append({
                "التاريخ": date_str,
                "النوع": "إيراد" if e.get("type") == TransactionType.INCOME else "مصروف",
                "المبلغ": e.get("amount", 0),
                "ملاحظات": e.get("note", "")
            })
        
        df_expenses = pd.DataFrame(expenses_data)
        df_expenses.to_excel(writer, sheet_name='المصروفات والنقدية', index=False)
        
        worksheet = writer.sheets['المصروفات والنقدية']
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    writer.close()
    output.seek(0)
    
    filename = f"ALMoheat_Backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now()}

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)