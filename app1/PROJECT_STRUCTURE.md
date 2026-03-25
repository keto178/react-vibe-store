# Project Structure

This file gives a short bilingual explanation for the main parts of the project.

هذا الملف يشرح باختصار وباللغتين الأجزاء الرئيسية داخل المشروع.

## Root

`package.json`
- AR: يحتوي أوامر التشغيل والبناء والاعتمادات الأساسية للمشروع.
- EN: Contains the project scripts, dependencies, and build commands.

`vite.config.js`
- AR: إعدادات Vite الخاصة بالتطوير والبناء.
- EN: Vite configuration for development and production build behavior.

`README.md`
- AR: المدخل السريع للمشروع وطريقة تشغيله والرجوع للتوثيق.
- EN: Quick entry document for running the project and finding the docs.

## Source

`src/main.jsx`
- AR: نقطة بداية React؛ يقوم بتركيب `App` داخل `BrowserRouter`.
- EN: React entry point; mounts `App` inside `BrowserRouter`.

`src/App.jsx`
- AR: ملف التركيب الرئيسي الذي يربط شريط التنقل مع الـ routes.
- EN: Main composition file that connects the navbar with the routes.

`src/App.css` and `src/index.css`
- AR: تنسيقات عامة على مستوى التطبيق.
- EN: Global styles used across the application.

## Hooks

`src/hooks/useAppStore.js`
- AR: المخزن الرئيسي للحالة؛ يدير المنتجات، السلة، الأقسام، الطلبات، والحفظ في `localStorage`.
- EN: Main state store; manages products, cart, categories, orders, and localStorage persistence.

## Routes

`src/routes/AppRoutes.jsx`
- AR: يجمع كل مسارات التطبيق في ملف واحد.
- EN: Centralizes all app routes in one file.

`src/routes/ProtectedRoute.jsx`
- AR: يحمي صفحة لوحة التحكم ويمنع الوصول لغير المصرح لهم.
- EN: Protects the dashboard page from unauthorized access.

## Components

`src/componantes/NavPar/NavPar.jsx`
- AR: شريط التنقل العلوي؛ يعرض الروابط والسلة والإشعارات وتسجيل الدخول أو الخروج.
- EN: Top navigation bar; shows links, cart, notifications, and auth actions.

`src/componantes/Header/Header.jsx`
- AR: هيدر الصفحة الرئيسية مع ملخص بسيط عن المتجر.
- EN: Home hero section with a quick store summary.

`src/componantes/SingnUp/SingnUp.jsx`
- AR: شاشة تسجيل الدخول وإنشاء الحساب باستخدام تخزين محلي.
- EN: Login and signup screen using local storage.

## Pages

`src/Pages/Home/Home.jsx`
- AR: الصفحة الرئيسية؛ تعرض الأقسام والمنتجات مع إمكانية الفلترة حسب القسم.
- EN: Home page; shows categories and products with category filtering.

`src/Pages/Home/components/CategoryListSection.jsx`
- AR: جزء مستقل لعرض قائمة أقسام واحدة.
- EN: Small standalone block for rendering one category list.

`src/Pages/Card/Card.jsx`
- AR: بطاقة المنتج المشتركة بين الصفحة الرئيسية ولوحة التحكم، وتدعم اختيار اللون.
- EN: Shared product card used in Home and Dashboard, with color selection support.

`src/Pages/Dashboard/Dashboard.jsx`
- AR: صفحة الإدارة، والآن تعمل كتركيب لمكونات أصغر بدل ملف ضخم واحد.
- EN: Admin page, now acting as a composition of smaller components instead of one large file.

`src/Pages/Dashboard/useDashboardManager.js`
- AR: يحتوي منطق لوحة التحكم مثل النماذج، التعديل، الحذف، والألوان.
- EN: Holds dashboard logic such as forms, editing, deleting, and color handling.

`src/Pages/Dashboard/dashboardForms.js`
- AR: يجمع القيم الأولية ومُحضّرات نماذج الأقسام والمنتجات.
- EN: Stores initial values and form builders for category and product forms.

`src/Pages/Dashboard/components/DashboardHeader.jsx`
- AR: رأس لوحة التحكم والإحصائيات السريعة.
- EN: Dashboard top area and quick stats.

`src/Pages/Dashboard/components/CategorySection.jsx`
- AR: قسم إدارة الأقسام.
- EN: Category management section.

`src/Pages/Dashboard/components/ProductSection.jsx`
- AR: قسم إضافة وتعديل المنتجات.
- EN: Product add/edit section.

`src/Pages/Dashboard/components/ProductListSection.jsx`
- AR: قائمة المنتجات الموجودة مع أزرار التعديل والحذف.
- EN: Existing product list with edit and delete actions.

`src/Pages/PlecOurder/PlecOurder.jsx`
- AR: صفحة السلة الحالية ومراجعة العناصر قبل الشحن.
- EN: Current cart page for reviewing items before shipping.

`src/Pages/PlecOurder/components/CartItemCard.jsx`
- AR: بطاقة مستقلة لعنصر واحد داخل السلة.
- EN: Standalone card for a single cart item.

`src/Pages/ShippingInformation/ShippingInformation.jsx`
- AR: صفحة بيانات الشحن وإرسال الطلب.
- EN: Shipping details and order submission page.

`src/Pages/ShippingInformation/shippingForm.js`
- AR: القيم الافتراضية الخاصة بنموذج الشحن.
- EN: Default values for the shipping form.

`src/Pages/ShippingInformation/components/ShippingSummaryPanel.jsx`
- AR: يعرض ملخص الطلب داخل صفحة الشحن.
- EN: Displays the order summary inside the shipping page.

`src/Pages/Orders/Orders.jsx`
- AR: صفحة الطلبات للعميل أو للأدمن حسب المستخدم الحالي.
- EN: Orders page for either the customer or the admin depending on the active user.

`src/Pages/Orders/components/OrderCard.jsx`
- AR: بطاقة الطلب الكاملة، وتعرض العناصر، اللون المختار، والإجمالي، وزر `Done`.
- EN: Full order card showing items, selected color, totals, and the `Done` button.

`src/Pages/Orders/components/EmailStatus.jsx`
- AR: يعرض حالة إرسال إشعار الإيميل الخاص بالطلب.
- EN: Displays the email notification status for the order.

## Utilities

`src/utils/auth.js`
- AR: وظائف المستخدمين والجلسات والصلاحيات.
- EN: User, session, and permission helpers.

`src/utils/products.js`
- AR: تحميل وحفظ المنتجات مع توحيد بيانات الألوان.
- EN: Loads and saves products while normalizing color data.

`src/utils/categories.js`
- AR: تحميل وحفظ الأقسام مع توحيد نوع القسم.
- EN: Loads and saves categories while normalizing the category group.

`src/utils/cart.js`
- AR: تحميل وحفظ عناصر السلة مع توحيد الكمية واللون.
- EN: Loads and saves cart items while normalizing quantity and color.

`src/utils/orders.js`
- AR: كل منطق الطلبات مثل الحسابات والتخزين والفلترة وتنسيق العنوان.
- EN: Core order logic such as totals, storage, filtering, and address formatting.

`src/utils/orderEmail.js`
- AR: مسؤول عن إرسال إشعار الطلب إلى الإيميل باستخدام EmailJS.
- EN: Responsible for sending order notification emails through EmailJS.

`src/utils/files.js`
- AR: أداة مساعدة لتحويل ملفات الصور إلى `data URL`.
- EN: Helper for converting image files into data URLs.

## Assets

`src/assets` and `public`
- AR: تحتوي الصور والأيقونات والملفات الثابتة المستخدمة في الواجهة.
- EN: Contain images, icons, and static files used by the UI.

## Notes

- AR: تم الحفاظ على أسماء بعض المجلدات كما هي مثل `componantes` و`PlecOurder` حتى لا نكسر الاستيرادات الحالية.
- EN: Some existing folder names such as `componantes` and `PlecOurder` were kept as-is to avoid breaking current imports.
