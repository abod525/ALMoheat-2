# دليل البدء السريع
## Quick Start Guide for ALMoheat-2

هذا الدليل يساعدك على البدء بسرعة مع تطبيق ALMoheat-2 بعد تطبيق جميع التوصيات.

---

## 🚀 البدء في 5 دقائق

### 1️⃣ نسخ ملف البيئة

```bash
cd backend
cp .env.example .env
```

### 2️⃣ توليد SECRET_KEY

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

انسخ المفتاح وضعه في `.env`:

```
SECRET_KEY=your-generated-key-here
```

### 3️⃣ تشغيل MongoDB (Docker)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest \
  --replSet rs0 \
  --bind_ip_all

# تهيئة Replica Set
docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]})"
```

### 4️⃣ تثبيت المكتبات

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 5️⃣ تشغيل التطبيق

```bash
# في terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload

# في terminal 2 - Frontend
cd frontend
npm start
```

**افتح المتصفح على:** `http://localhost:3000`

---

## 📋 الملفات المهمة

| الملف | الوصف | الموقع |
|:---:|:---|:---:|
| `IMPLEMENTATION_GUIDE.md` | دليل شامل لتطبيق جميع التوصيات | الجذر |
| `MONGODB_REPLICA_SET_SETUP.md` | دليل تفصيلي لإعداد MongoDB | الجذر |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | دليل النشر في الإنتاج | الجذر |
| `COMPREHENSIVE_TEST_REPORT.md` | تقرير الاختبارات الشامل | الجذر |
| `.env.example` | مثال متغيرات البيئة | `backend/` |
| `requirements.txt` | المكتبات المطلوبة | `backend/` |

---

## ✅ التحقق من النجاح

### Backend يعمل؟

```bash
curl http://localhost:8000/api/products
```

يجب أن تحصل على استجابة JSON.

### Frontend يعمل؟

افتح `http://localhost:3000` في المتصفح.

### MongoDB يعمل؟

```bash
mongosh "mongodb://admin:password@localhost:27017/almoheat_db?authSource=admin&replicaSet=rs0"
rs.status()
```

يجب أن ترى `"ismaster": true`.

---

## 🔐 الخطوات الأمنية المهمة

### قبل الإنتاج:

1. **غير كلمة مرور MongoDB**
   ```
   MONGO_URL=mongodb://new-username:new-password@...
   ```

2. **غير SECRET_KEY**
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **حدث CORS_ORIGINS**
   ```
   CORS_ORIGINS=https://your-domain.com
   ```

4. **استخدم HTTPS**
   - احصل على SSL Certificate من Let's Encrypt
   - اتبع `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## 🐛 استكشاف الأخطاء الشائعة

### "Connection refused" على MongoDB

```bash
# تحقق من أن MongoDB يعمل
docker ps | grep mongodb

# أعد تشغيله إذا لزم
docker restart mongodb
```

### "CORS error"

- تحقق من أن `CORS_ORIGINS` في `.env` يحتوي على `http://localhost:3000`
- أعد تشغيل Backend

### "not a replica set"

- تأكد من أن MongoDB يعمل مع `--replSet rs0`
- تحقق من أن `rs.initiate()` تم تنفيذه

---

## 📚 المزيد من المعلومات

- اقرأ `IMPLEMENTATION_GUIDE.md` للخطوات التفصيلية
- اقرأ `PRODUCTION_DEPLOYMENT_GUIDE.md` قبل النشر
- اقرأ `COMPREHENSIVE_TEST_REPORT.md` لفهم الاختبارات

---

## 🎯 الخطوات التالية

1. ✅ تشغيل التطبيق محلياً
2. ✅ اختبار جميع الميزات
3. ✅ إعداد MongoDB Replica Set
4. ✅ إعداد HTTPS و SSL
5. ✅ النشر في الإنتاج

---

**تم إعداد هذا الدليل:** 25 فبراير 2026  
**الإصدار:** 1.0
