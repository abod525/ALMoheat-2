"""
ALMoheat Accounting System - Backend API v2.0
FastAPI + MongoDB with Strict Dual-Unit System
"""

from fastapi import FastAPI, HTTPException, Query, status
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
from decimal import Decimal

# Initialize FastAPI app
app = FastAPI(title="ALMoheat Accounting System", version="2.0.0")

# Load environment variables
load_dotenv()

# CORS Middleware - Allow all origins (no security)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
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
    cost: Decimal = Field(ge=0)
    price: Decimal = Field(ge=0)
    unit_type: UnitType = UnitType.SIMPLE
    weight_per_unit: Optional[Decimal] = Field(default=None, ge=0)
    stock_count: Decimal = Field(default=Decimal("0"), ge=0)
    stock_weight: Decimal = Field(default=Decimal("0"), ge=0)
    
    @model_validator(mode='after')
    def validate_dual_unit(self):
        """Validate dual unit products have weight_per_unit"""
        if self.unit_type == UnitType.DUAL:
            if self.weight_per_unit is None or self.weight_per_unit <= 0:
                raise ValueError('weight_per_unit is required and must be > 0 when unit_type is "dual"')
            if self.stock_count is not None and self.weight_per_unit is not None:
                self.stock_weight = self.stock_count * self.weight_per_unit
        return self

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[Decimal] = Field(default=None, ge=0)
    price: Optional[Decimal] = Field(default=None, ge=0)
    unit_type: Optional[UnitType] = None
    weight_per_unit: Optional[Decimal] = Field(default=None, ge=0)
    stock_count: Optional[Decimal] = Field(default=None, ge=0)
    stock_weight: Optional[Decimal] = Field(default=None, ge=0)

class Product(ProductBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

# ==================== INVOICE ITEM MODELS ====================

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    total: Decimal
    sale_unit: SaleUnit = SaleUnit.COUNT
    weight_per_unit: Optional[Decimal] = None
    weight_per_unit_snapshot: Optional[Decimal] = None

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
    subtotal: Decimal
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    total: Decimal
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

# ==================== CLIENT MODELS ====================

class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    balance: Decimal = Field(default=Decimal("0"))

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    balance: Optional[Decimal] = None

class Client(ClientBase):
    id: str = Field(alias="_id")
    created_at: datetime
    last_transaction_date: Optional[datetime] = None
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

# ==================== CASH TRANSACTION MODELS ====================

class CashTransactionBase(BaseModel):
    date: datetime
    type: TransactionType
    amount: Decimal = Field(gt=0)
    note: Optional[str] = None

class CashTransactionCreate(CashTransactionBase):
    pass

class CashTransaction(CashTransactionBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    """Convert MongoDB document to serializable dict"""
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    # Convert Decimal to string for JSON serialization
    for key, value in doc.items():
        if isinstance(value, Decimal):
            doc[key] = str(value)
    return doc

def serialize_docs(docs):
    """Convert multiple MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]

# ==================== PRODUCT ENDPOINTS ====================

@app.get("/api/products", response_model=List[Product])
async def get_products():
    """Get all products"""
    products = await db.products.find().to_list(None)
    return [serialize_doc(p) for p in products]

@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a specific product"""
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        return serialize_doc(product)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/products", response_model=Product)
async def create_product(product: ProductCreate):
    """Create a new product"""
    try:
        product_data = product.model_dump()
        product_data["created_at"] = datetime.utcnow()
        product_data["updated_at"] = datetime.utcnow()
        
        # Convert Decimal to string for MongoDB storage
        for key, value in product_data.items():
            if isinstance(value, Decimal):
                product_data[key] = str(value)
        
        result = await db.products.insert_one(product_data)
        created = await db.products.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate):
    """Update a product"""
    try:
        update_data = {k: v for k, v in product.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Convert Decimal to string
        for key, value in update_data.items():
            if isinstance(value, Decimal):
                update_data[key] = str(value)
        
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        
        updated = await db.products.find_one({"_id": ObjectId(product_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    try:
        result = await db.products.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        return {"message": "تم حذف المنتج بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== INVOICE ENDPOINTS ====================

@app.get("/api/invoices", response_model=List[Invoice])
async def get_invoices():
    """Get all invoices"""
    invoices = await db.invoices.find().to_list(None)
    return [serialize_doc(inv) for inv in invoices]

@app.get("/api/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    """Get a specific invoice"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")
        return serialize_doc(invoice)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/invoices", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate):
    """Create a new invoice"""
    try:
        session = await client.start_session()
        async with session.start_transaction():
            invoice_data = invoice.model_dump()
            invoice_data["created_at"] = datetime.utcnow()
            
            # Convert Decimal to string
            for key, value in invoice_data.items():
                if isinstance(value, Decimal):
                    invoice_data[key] = str(value)
            
            # Convert items
            if "items" in invoice_data and isinstance(invoice_data["items"], list):
                for item in invoice_data["items"]:
                    for key, value in item.items():
                        if isinstance(value, Decimal):
                            item[key] = str(value)
            
            result = await db.invoices.insert_one(invoice_data, session=session)
            created = await db.invoices.find_one({"_id": result.inserted_id}, session=session)
            
            await session.commit_transaction()
            return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice"""
    try:
        session = await client.start_session()
        async with session.start_transaction():
            result = await db.invoices.delete_one({"_id": ObjectId(invoice_id)}, session=session)
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")
            
            await session.commit_transaction()
            return {"message": "تم حذف الفاتورة بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CLIENT ENDPOINTS ====================

@app.get("/api/clients", response_model=List[Client])
async def get_clients():
    """Get all clients"""
    clients = await db.clients.find().to_list(None)
    return [serialize_doc(c) for c in clients]

@app.get("/api/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a specific client"""
    try:
        client_doc = await db.clients.find_one({"_id": ObjectId(client_id)})
        if not client_doc:
            raise HTTPException(status_code=404, detail="العميل غير موجود")
        return serialize_doc(client_doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clients", response_model=Client)
async def create_client(client_data: ClientCreate):
    """Create a new client"""
    try:
        data = client_data.model_dump()
        data["created_at"] = datetime.utcnow()
        data["last_transaction_date"] = None
        
        # Convert Decimal to string
        for key, value in data.items():
            if isinstance(value, Decimal):
                data[key] = str(value)
        
        result = await db.clients.insert_one(data)
        created = await db.clients.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientUpdate):
    """Update a client"""
    try:
        update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
        
        # Convert Decimal to string
        for key, value in update_data.items():
            if isinstance(value, Decimal):
                update_data[key] = str(value)
        
        result = await db.clients.update_one(
            {"_id": ObjectId(client_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="العميل غير موجود")
        
        updated = await db.clients.find_one({"_id": ObjectId(client_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    try:
        result = await db.clients.delete_one({"_id": ObjectId(client_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="العميل غير موجود")
        return {"message": "تم حذف العميل بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CASH TRANSACTION ENDPOINTS ====================

@app.get("/api/cash", response_model=List[CashTransaction])
async def get_cash_transactions(type: Optional[str] = Query(None)):
    """Get cash transactions"""
    try:
        if type:
            transactions = await db.cash_transactions.find({"type": type}).to_list(None)
        else:
            transactions = await db.cash_transactions.find().to_list(None)
        return [serialize_doc(t) for t in transactions]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/cash", response_model=CashTransaction)
async def create_cash_transaction(transaction: CashTransactionCreate):
    """Create a new cash transaction"""
    try:
        data = transaction.model_dump()
        data["created_at"] = datetime.utcnow()
        
        # Convert Decimal to string
        for key, value in data.items():
            if isinstance(value, Decimal):
                data[key] = str(value)
        
        result = await db.cash_transactions.insert_one(data)
        created = await db.cash_transactions.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/cash/{transaction_id}")
async def delete_cash_transaction(transaction_id: str):
    """Delete a cash transaction"""
    try:
        result = await db.cash_transactions.delete_one({"_id": ObjectId(transaction_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
        return {"message": "تم حذف المعاملة بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== EXPORT ENDPOINTS ====================

@app.get("/api/export/products")
async def export_products():
    """Export products to Excel"""
    try:
        products = await db.products.find().to_list(None)
        df = pd.DataFrame([serialize_doc(p) for p in products])
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Products', index=False)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=products.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/export/invoices")
async def export_invoices():
    """Export invoices to Excel"""
    try:
        invoices = await db.invoices.find().to_list(None)
        df = pd.DataFrame([serialize_doc(inv) for inv in invoices])
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Invoices', index=False)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=invoices.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "ALMoheat API is running"}
