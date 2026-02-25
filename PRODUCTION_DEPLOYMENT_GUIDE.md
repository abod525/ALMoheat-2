# دليل نشر التطبيق في الإنتاج
## Production Deployment Guide for ALMoheat-2

هذا الدليل يشرح كيفية نشر تطبيق ALMoheat-2 في بيئة الإنتاج بشكل آمن واحترافي.

---

## 📋 قائمة التحضيرات

قبل النشر في الإنتاج، تأكد من إكمال جميع الخطوات التالية:

- [ ] تحديث `requirements.txt` بجميع المكتبات
- [ ] إعداد ملف `.env` مع متغيرات البيئة الآمنة
- [ ] تفعيل MongoDB Replica Set
- [ ] الحصول على SSL/TLS Certificate
- [ ] إعداد HTTPS على الخادم
- [ ] تحديث CORS origins
- [ ] إعداد قاعدة بيانات الإنتاج
- [ ] اختبار شامل للتطبيق

---

## 🔐 الخطوة 1: إعداد متغيرات البيئة الآمنة

### 1.1 توليد SECRET_KEY قوي

```bash
# في Linux/Mac
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# في Windows PowerShell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

انسخ المفتاح الناتج وضعه في ملف `.env`:

```
SECRET_KEY=your-generated-secret-key-here
```

### 1.2 تحديث ملف .env للإنتاج

```bash
# انسخ ملف المثال
cp backend/.env.example backend/.env

# ثم عدل القيم
```

**محتوى .env للإنتاج:**

```
# ==================== DATABASE ====================
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/almoheat_db?retryWrites=true&w=majority

# ==================== SECURITY ====================
SECRET_KEY=your-generated-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ==================== CORS ====================
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ==================== API ====================
REACT_APP_API_BASE_URL=https://api.your-domain.com

# ==================== ENVIRONMENT ====================
ENVIRONMENT=production
```

### 1.3 حماية ملف .env

```bash
# تأكد من أن ملف .env لا يُرفع إلى Git
echo ".env" >> .gitignore

# تعيين صلاحيات آمنة
chmod 600 backend/.env
```

---

## 🔒 الخطوة 2: إعداد HTTPS و SSL/TLS

### 2.1 الحصول على SSL Certificate من Let's Encrypt

#### الطريقة 1: استخدام Certbot (الموصى به)

```bash
# تثبيت Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# الحصول على certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# سيتم حفظ الشهادات في:
# /etc/letsencrypt/live/your-domain.com/
```

#### الطريقة 2: استخدام Nginx

```bash
# تثبيت Nginx
sudo apt-get install nginx

# إعداد Nginx كـ reverse proxy
sudo nano /etc/nginx/sites-available/almoheat
```

**محتوى ملف إعداد Nginx:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # إعادة توجيه HTTP إلى HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

تفعيل الإعدادات:

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/almoheat /etc/nginx/sites-enabled/

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

### 2.2 تجديد SSL Certificate تلقائياً

```bash
# إعداد cron job لتجديد الشهادات تلقائياً
sudo crontab -e

# أضف السطر التالي:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🚀 الخطوة 3: نشر التطبيق

### 3.1 تثبيت المتطلبات

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
```

### 3.2 تشغيل Backend

#### الطريقة 1: استخدام Gunicorn (الموصى به)

```bash
# تثبيت Gunicorn
pip install gunicorn

# تشغيل التطبيق
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# أو باستخدام Uvicorn workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 main:app
```

#### الطريقة 2: استخدام Systemd Service

أنشئ ملف `/etc/systemd/system/almoheat-backend.service`:

```ini
[Unit]
Description=ALMoheat Backend Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/home/ubuntu/almoheat/backend
Environment="PATH=/home/ubuntu/almoheat/venv/bin"
ExecStart=/home/ubuntu/almoheat/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

تفعيل الخدمة:

```bash
sudo systemctl daemon-reload
sudo systemctl enable almoheat-backend
sudo systemctl start almoheat-backend
```

### 3.3 تشغيل Frontend

```bash
# بناء التطبيق
cd frontend
npm run build

# تقديم الملفات الثابتة عبر Nginx
# (تم تكوينه في الخطوة 2)
```

---

## 📊 الخطوة 4: المراقبة والصيانة

### 4.1 إعداد Logging

```bash
# تحقق من سجلات Backend
sudo journalctl -u almoheat-backend -f

# تحقق من سجلات Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 4.2 النسخ الاحتياطي

```bash
# نسخ احتياطي من قاعدة البيانات
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/almoheat_db" --out=/backup/almoheat_$(date +%Y%m%d)

# جدولة النسخ الاحتياطي يومياً
0 2 * * * /usr/local/bin/backup-almoheat.sh
```

### 4.3 مراقبة الأداء

```bash
# استخدم أدوات مثل:
# - New Relic
# - DataDog
# - Prometheus + Grafana
# - CloudFlare Analytics
```

---

## ✅ قائمة فحص ما قبل النشر

قبل نشر التطبيق، تحقق من:

- [ ] جميع متغيرات البيئة محدثة بشكل صحيح
- [ ] SSL Certificate مثبت وصحيح
- [ ] HTTPS يعمل بشكل صحيح
- [ ] CORS origins محدثة للنطاقات الصحيحة
- [ ] MongoDB Replica Set مفعل
- [ ] جميع الاختبارات تمر بنجاح
- [ ] الأداء مقبول تحت الحمل
- [ ] النسخ الاحتياطي مجدول
- [ ] المراقبة والتنبيهات مفعلة
- [ ] خطة الاستجابة للطوارئ جاهزة

---

## 🆘 استكشاف الأخطاء الشائعة

### المشكلة: "Connection refused" على Backend

**الحل:**
```bash
# تحقق من أن Backend يعمل
sudo systemctl status almoheat-backend

# أعد تشغيله
sudo systemctl restart almoheat-backend
```

### المشكلة: "SSL certificate problem"

**الحل:**
```bash
# تحقق من صلاحية الشهادة
sudo certbot certificates

# جدد الشهادة إذا لزم الأمر
sudo certbot renew --force-renewal
```

### المشكلة: "CORS error"

**الحل:**
- تحقق من أن `CORS_ORIGINS` في `.env` يحتوي على النطاق الصحيح
- أعد تشغيل Backend بعد تحديث `.env`

### المشكلة: "Database connection error"

**الحل:**
- تحقق من أن `MONGO_URL` صحيح
- تأكد من أن MongoDB يقبل الاتصالات من عنوان IP الخادم
- تحقق من بيانات المستخدم والكلمة المرور

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل:

1. تحقق من السجلات (logs)
2. اقرأ رسالة الخطأ بعناية
3. ابحث عن الحل في قسم "استكشاف الأخطاء"
4. اطلب مساعدة من فريق الدعم

---

**تم إعداد هذا الدليل:** 25 فبراير 2026  
**الإصدار:** 1.0
