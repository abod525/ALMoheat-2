# Prompt لإزالة الحماية من ALMoheat-2
## Prompt to Remove Security from ALMoheat-2

انسخ هذا الـ Prompt واعطه لأي ذكاء اصطناعي (ChatGPT, Claude, Gemini, إلخ) لإزالة نظام الحماية من البرنامج.

---

## 📝 الـ Prompt:

```
أنا أملك مشروع ALMoheat-2 وأريد إزالة نظام الحماية (JWT, Password Hashing, Authentication) 
لأن البرنامج بسيط ولا أحتاج حماية الآن.

أريد منك أن تقوم بالتعديلات التالية:

## 1. تحديث requirements.txt

احذف السطور التالية:
- python-jose[cryptography]
- passlib[bcrypt]

الملف الجديد يجب أن يحتوي على:
fastapi
uvicorn
motor
python-dotenv
pydantic
resend
email-validator
pandas
openpyxl

## 2. تحديث backend/main.py

### احذف الاستيرادات التالية:
- from jose import JWTError, jwt
- from passlib.context import CryptContext
- from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
- from datetime import timedelta (إذا كانت تستخدم فقط للـ JWT)

### احذف الإعدادات التالية:
- SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
- ALGORITHM = "HS256"
- ACCESS_TOKEN_EXPIRE_MINUTES = 30
- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
- oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

### احذف الدوال التالية بالكامل:
- def create_access_token(data: dict, expires_delta: Optional[timedelta] = None)
- def verify_password(plain_password, hashed_password)
- def get_password_hash(password)
- async def get_user(username: str)
- async def authenticate_user(username: str, password: str)
- async def get_current_user(token: str = Depends(oauth2_scheme))

### احذف النماذج (Models) التالية:
- class User(BaseModel)
- class UserCreate(BaseModel)
- class Token(BaseModel)

### احذف الـ Endpoints التالية:
- @app.post("/token", response_model=Token) - async def login(form_data: OAuth2PasswordRequestForm = Depends())
- @app.post("/api/register", response_model=User) - async def register(user: UserCreate)
- @app.post("/api/login") - إذا كانت موجودة

### حدث CORS Middleware:

من:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

إلى:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

### احذف أي استخدام لـ Depends(get_current_user) من الـ Endpoints

مثلاً:
- من: async def get_products(current_user: User = Depends(get_current_user))
- إلى: async def get_products()

## 3. تحديث backend/.env.example

احذف السطور التالية:
- SECRET_KEY=...
- ALGORITHM=HS256
- ACCESS_TOKEN_EXPIRE_MINUTES=30

## 4. تحديث frontend/src/lib/api.js

احذف أي استدعاءات لـ:
- /token endpoint
- /api/register endpoint
- /api/login endpoint

إذا كانت موجودة، احذفها أو علقها.

## 5. تحديث frontend/src/pages

احذف أي صفحات متعلقة بـ:
- Login page
- Register page
- Authentication

إذا كانت موجودة.

## 6. تحديث frontend/src/App.tsx

احذف أي routes متعلقة بـ:
- /login
- /register
- /auth

## النتيجة النهائية:

بعد هذه التعديلات:
- ✅ لا توثيق للمستخدمين
- ✅ لا JWT tokens
- ✅ لا تشفير لكلمات المرور
- ✅ أي شخص يمكنه الوصول للبيانات
- ✅ البرنامج بسيط وسهل الاستخدام

تأكد من:
1. عدم وجود أخطاء في الكود
2. جميع الـ imports محدثة
3. لا توجد استدعاءات لدوال محذوفة
4. الـ Endpoints تعمل بدون توثيق

أرجوك قم بهذه التعديلات وأرني الملفات المحدثة.
```

---

## 🎯 كيفية الاستخدام:

### الخطوة 1: انسخ الـ Prompt

اختر الـ Prompt أعلاه وانسخه كاملاً.

### الخطوة 2: اختر الذكاء الاصطناعي

استخدم أحد هذه الخيارات:
- **ChatGPT:** https://chat.openai.com
- **Claude:** https://claude.ai
- **Gemini:** https://gemini.google.com
- **Copilot:** https://copilot.microsoft.com

### الخطوة 3: الصق الـ Prompt

الصق الـ Prompt في الذكاء الاصطناعي.

### الخطوة 4: أضف الملفات

إذا أراد الذكاء الاصطناعي أن يرى الملفات الحالية، أرسل له:
- `backend/main.py`
- `backend/requirements.txt`
- `frontend/src/lib/api.js`
- `frontend/src/App.tsx`

### الخطوة 5: احصل على النتيجة

الذكاء الاصطناعي سيعطيك الملفات المحدثة.

### الخطوة 6: استبدل الملفات

استبدل الملفات القديمة بالملفات الجديدة.

---

## 📋 الملفات التي ستتغير:

| الملف | التغيير |
|:---:|:---|
| `backend/requirements.txt` | حذف 2 مكتبة أمنية |
| `backend/main.py` | حذف ~200 سطر من الكود الأمني |
| `backend/.env.example` | حذف 3 متغيرات |
| `frontend/src/lib/api.js` | حذف endpoints التوثيق |
| `frontend/src/App.tsx` | حذف routes التوثيق |

---

## ✅ التحقق من النجاح:

بعد التعديلات، تأكد من:

```bash
# 1. تشغيل Backend بدون أخطاء
cd backend
python -m uvicorn main:app --reload

# 2. تشغيل Frontend بدون أخطاء
cd frontend
npm start

# 3. الوصول للـ API بدون توثيق
curl http://localhost:8000/api/products
# يجب أن تحصل على استجابة JSON
```

---

## ⚠️ ملاحظات مهمة:

1. **هذا للتطوير فقط** - لا تستخدم هذا في الإنتاج
2. **غير آمن** - أي شخص يمكنه الوصول للبيانات
3. **بدون توثيق** - لا يوجد تسجيل دخول
4. **بسيط** - سهل الاستخدام والتطوير

---

## 🆘 إذا حدثت مشاكل:

إذا حصلت على أخطاء بعد التعديلات:

1. تحقق من الـ imports
2. تحقق من أسماء الدوال
3. تحقق من الـ endpoints
4. اقرأ رسالة الخطأ بعناية

---

**تم إعداد هذا الـ Prompt:** 25 فبراير 2026  
**الإصدار:** 1.0
