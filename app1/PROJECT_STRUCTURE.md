# Project Structure

This file gives a short bilingual explanation for the main parts of the project.

هذا الملف يشرح باختصار وباللغتين الأجزاء الرئيسية داخل المشروع.

## Root

`README.md`
- AR: دليل التشغيل السريع، بيئة العمل، وطريقة النشر على Vercel.
- EN: Quick start guide, environment setup, and Vercel deployment notes.

`PROJECT_STRUCTURE.md`
- AR: ملخص لأهم الملفات والمجلدات داخل المشروع.
- EN: Short guide to the main files and folders in the project.

`vite.config.js`
- AR: إعدادات Vite للتطوير والبناء، ومنها توجيه `/api` إلى السيرفر المحلي.
- EN: Vite configuration for development and build, including the local `/api` proxy.

## Frontend Source

`src/main.jsx`
- AR: نقطة بداية React، ويقوم أيضًا بتنظيف البيانات القديمة من التخزين المحلي.
- EN: React entry point, and it also cleans legacy local-storage data.

`src/App.jsx`
- AR: يربط الـ navbar مع الـ routes ويزامن الجلسة المحفوظة مع `/api/auth/me` عند وجود توكن API.
- EN: Connects the navbar with the routes and refreshes the saved session with `/api/auth/me` when an API token exists.

`src/App.css` and `src/index.css`
- AR: التنسيقات العامة على مستوى التطبيق.
- EN: Global application styles.

## Frontend Hooks

`src/hooks/useActiveSession.js`
- AR: hook تفاعلي يراقب الجلسة الحالية من `localStorage` ويحدّث الواجهة عند تسجيل الدخول أو الخروج.
- EN: Reactive hook that watches the current session in `localStorage` and updates the UI on login/logout.

`src/hooks/useAppStore.js`
- AR: المخزن الرئيسي لحالة التطبيق؛ يدير المنتجات، الأقسام، السلة، والطلبات من خلال الـ API.
- EN: Main application store; manages products, categories, cart, and orders through the API layer.

## Routes

`src/routes/AppRoutes.jsx`
- AR: يجمع كل مسارات التطبيق ويمرر الجلسة الحالية للمسارات المحمية.
- EN: Centralizes app routes and passes the current session into protected routes.

`src/routes/ProtectedRoute.jsx`
- AR: يحمي الصفحات التي تحتاج تسجيل دخول أو صلاحية admin.
- EN: Guards pages that require authentication or admin access.

## Auth UI

`src/componantes/SingnUp/SingnUp.jsx`
- AR: شاشة تسجيل الدخول وإنشاء الحساب، وتدعم API الأساسي مع fallback محلي عند تعذر الوصول للسيرفر.
- EN: Login and signup screen, supporting the main API with a local fallback when the backend is unreachable.

`src/utils/auth.js`
- AR: وظائف حفظ الجلسة، قراءتها، مسحها، وإشعار الواجهة عند تغيرها.
- EN: Helpers for saving, reading, clearing, and broadcasting session changes.

`src/utils/api.js`
- AR: طبقة طلبات HTTP لكل endpoints، مع فحص للاستجابات غير المتوقعة ومسار لجلب بيانات المستخدم الحالي.
- EN: HTTP wrapper for all endpoints, with unexpected-response guards and a current-user fetch helper.

`src/utils/localAuthFallback.js`
- AR: تسجيل دخول/تسجيل حساب محلي عند غياب السيرفر أثناء التطوير.
- EN: Local login/register fallback used when the backend is unavailable during development.

## Main Pages

`src/Pages/Home/Home.jsx`
- AR: الصفحة الرئيسية التي تعرض الأقسام والمنتجات والبحث والتصفية.
- EN: Home page showing categories, products, search, and filtering.

`src/Pages/PlecOurder/PlecOurder.jsx`
- AR: صفحة السلة الحالية ومراجعة العناصر قبل الشحن.
- EN: Current cart page for reviewing items before shipping.

`src/Pages/ShippingInformation/ShippingInformation.jsx`
- AR: نموذج الشحن مع ملخص الطلب، ويستخدم بيانات الجلسة الحالية لملء الاسم والبريد تلقائيًا.
- EN: Shipping form with order summary, prefilled from the active session when available.

`src/Pages/Orders/Orders.jsx`
- AR: صفحة الطلبات للمستخدم أو للإدارة، وتعرض حالة التحديث والطلبات الجديدة.
- EN: Orders page for customers or admins, including status updates and new-order indicators.

`src/Pages/Dashboard/Dashboard.jsx`
- AR: لوحة الإدارة لتعديل الأقسام والمنتجات.
- EN: Admin dashboard for managing categories and products.

`src/Pages/Dashboard/useDashboardManager.js`
- AR: منطق لوحة الإدارة مثل النماذج، التعديل، الحذف، وإدارة الصور والألوان.
- EN: Dashboard logic for forms, editing, deleting, image handling, and colors.

## Backend

`server/src/app.js`
- AR: تطبيق Express الرئيسي الخاص بمسارات MongoDB.
- EN: Main Express app for the MongoDB-backed API.

`server/src/server.js`
- AR: يشغّل السيرفر ويحوّل تلقائيًا إلى التخزين الملفي محليًا إذا لم يعمل MongoDB.
- EN: Starts the server and falls back to file storage locally when MongoDB is unavailable.

`server/src/fileApp.js`
- AR: نسخة API تعمل على التخزين الملفي المحلي، وتُستخدم كخطة بديلة أثناء التطوير.
- EN: File-storage API used as a local fallback during development.

`server/src/controllers/`
- AR: منطق المصادقة، السلة، الأقسام، المنتجات، والطلبات.
- EN: Controllers for auth, cart, categories, products, and orders.

`server/src/models/`
- AR: تعريفات Mongoose الخاصة بالمستخدمين والمنتجات والطلبات والسلة.
- EN: Mongoose models for users, products, orders, and cart data.

`server/src/services/`
- AR: خدمات مساعدة مثل البريد الإلكتروني، الـ seed الافتراضي، والتعامل مع التخزين الملفي.
- EN: Support services such as email, default seeding, and file-store helpers.

## Data and Deployment

`server/data/store.json`
- AR: ملف التخزين المحلي المستخدم عند تشغيل وضع file storage.
- EN: Local data file used when the app runs in file-storage mode.

`../api/[...path].js`
- AR: دالة Vercel serverless التي تختار بين تطبيق MongoDB والنسخة الملفية حسب البيئة.
- EN: Vercel serverless entry that chooses between the MongoDB app and the file-based fallback.

`../vercel.json`
- AR: إعدادات النشر التي تربط الـ frontend مع مخرجات البناء ومسار `/api`.
- EN: Deployment config that connects the frontend output with the `/api` serverless route.

## Notes

- AR: تم الإبقاء على بعض الأسماء القديمة مثل `componantes` و`PlecOurder` حتى لا تنكسر الاستيرادات الحالية.
- EN: Some legacy folder names such as `componantes` and `PlecOurder` were kept to avoid breaking existing imports.
