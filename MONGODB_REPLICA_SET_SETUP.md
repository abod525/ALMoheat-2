# دليل إعداد MongoDB Replica Set
## MongoDB Replica Set Setup Guide

**المتطلب:** المعاملات الذرية (Atomic Transactions) في التطبيق تتطلب Replica Set في MongoDB.

---

## ✅ الخيار 1: MongoDB Atlas (الموصى به للإنتاج)

### الخطوات:

1. **انتقل إلى MongoDB Atlas**
   - الموقع: https://www.mongodb.com/cloud/atlas
   - سجل حساباً جديداً أو سجل الدخول

2. **إنشاء Cluster جديد**
   - اضغط على "Create Deployment"
   - اختر "Build a Cluster"
   - اختر الخطة المجانية (M0) أو الخطة المدفوعة حسب احتياجاتك
   - تأكد من أن الـ Cluster يتضمن Replica Set (الافتراضي)

3. **إنشاء Database User**
   - اذهب إلى "Database Access"
   - اضغط "Add New Database User"
   - أدخل اسم المستخدم وكلمة المرور قوية
   - اختر "Built-in Role: Atlas admin" أو "readWriteAnyDatabase"

4. **السماح بالوصول من عنوانك**
   - اذهب إلى "Network Access"
   - اضغط "Add IP Address"
   - أضف عنوان IP الخاص بك أو "0.0.0.0/0" (غير آمن للإنتاج)

5. **الحصول على Connection String**
   - اضغط على "Connect" في الـ Cluster
   - اختر "Connect your application"
   - انسخ Connection String
   - استبدل `<username>` و `<password>` بـ بيانات المستخدم

6. **تحديث ملف .env**
   ```
   MONGO_URL=mongodb+srv://username:password@cluster-name.mongodb.net/almoheat_db?retryWrites=true&w=majority
   ```

**ملاحظة:** MongoDB Atlas يوفر Replica Set افتراضياً، لذا لا تحتاج إلى إعدادات إضافية.

---

## 🐳 الخيار 2: Docker (للتطوير المحلي)

### المتطلبات:
- Docker مثبت على جهازك
- Docker Compose (اختياري)

### الخطوات:

#### 1. تشغيل MongoDB مع Replica Set باستخدام Docker

```bash
# إنشاء شبكة Docker
docker network create mongo-network

# تشغيل MongoDB مع Replica Set
docker run -d \
  --name mongodb \
  --network mongo-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest \
  --replSet rs0 \
  --bind_ip_all
```

#### 2. تهيئة Replica Set

```bash
# الدخول إلى MongoDB
docker exec -it mongodb mongosh

# تشغيل أوامر التهيئة
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb:27017" }
  ]
})

# التحقق من الحالة
rs.status()
```

#### 3. تحديث ملف .env

```
MONGO_URL=mongodb://admin:password@localhost:27017/almoheat_db?authSource=admin&replicaSet=rs0
```

### استخدام Docker Compose (الطريقة الأسهل)

أنشئ ملف `docker-compose.yml` في مجلد المشروع:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: almoheat-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    command: --replSet rs0 --bind_ip_all
    volumes:
      - mongo_data:/data/db
    networks:
      - almoheat-network

  mongo-init:
    image: mongo:latest
    container_name: almoheat-mongo-init
    depends_on:
      - mongodb
    command: >
      mongosh --host mongodb:27017 -u admin -p password --authenticationDatabase admin --eval
      "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]})"
    networks:
      - almoheat-network

volumes:
  mongo_data:

networks:
  almoheat-network:
    driver: bridge
```

ثم شغل:

```bash
docker-compose up -d
```

---

## 🔍 التحقق من أن Replica Set يعمل

### 1. الاتصال بـ MongoDB

```bash
# للتطوير المحلي
mongosh "mongodb://admin:password@localhost:27017/almoheat_db?authSource=admin&replicaSet=rs0"

# أو للـ MongoDB Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/almoheat_db"
```

### 2. التحقق من حالة Replica Set

```javascript
rs.status()
```

يجب أن ترى:
```
{
  "set": "rs0",
  "ismaster": true,
  "secondary": false,
  "ok": 1
}
```

### 3. اختبار المعاملات

```javascript
// إنشاء session
const session = db.getMongo().startSession();

// بدء transaction
session.startTransaction();

// تنفيذ عمليات
db.products.insertOne({name: "Test"}, {session});
db.cash_transactions.insertOne({type: "income", amount: 100}, {session});

// إنهاء transaction
session.commitTransaction();
```

---

## ⚙️ تحديث ملف .env

بعد إعداد Replica Set، تأكد من تحديث ملف `.env`:

```bash
# انسخ ملف المثال
cp backend/.env.example backend/.env

# ثم عدل القيم حسب إعداداتك
```

**للتطوير:**
```
MONGO_URL=mongodb://admin:password@localhost:27017/almoheat_db?authSource=admin&replicaSet=rs0
```

**للإنتاج (MongoDB Atlas):**
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/almoheat_db?retryWrites=true&w=majority
```

---

## 🚨 استكشاف الأخطاء

### المشكلة: "not a replica set"
**الحل:** تأكد من أن MongoDB يعمل مع `--replSet` و أن Replica Set تم تهيئته بـ `rs.initiate()`

### المشكلة: "connection refused"
**الحل:** تأكد من أن MongoDB يعمل على المنفذ 27017

### المشكلة: "authentication failed"
**الحل:** تحقق من اسم المستخدم وكلمة المرور و authSource

---

## ✅ الخطوة التالية

بعد إعداد Replica Set بنجاح:
1. تأكد من أن التطبيق يتصل بـ MongoDB بشكل صحيح
2. اختبر المعاملات الذرية في التطبيق
3. تحقق من أن `create_invoice` و `delete_invoice` تعمل بشكل صحيح
