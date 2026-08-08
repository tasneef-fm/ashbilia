'use strict';
(() => {
  const STORAGE_KEY='wardat_language';
  const AR_EN={
    'وردة أشبيليا':'Wardat Ashbilya',
    'شعار وردة أشبيليا':'Wardat Ashbilya logo',
    'الرئيسية':'Home','المتجر':'Shop','المناسبات':'Events','أعمالنا':'Our Work','السلة':'Cart',
    'دخول الموظفين':'Employee Login','دخول الإدارة':'Admin Login','صفحة العميل':'Customer Page','العودة إلى متجر العميل':'Back to Store',
    'تفاصيل تُزهر فرحًا':'Details that bloom with joy','نصنع لحظاتكم':'We Create Your Moments','بأناقة الورد':'With Floral Elegance',
    'باقات فاخرة، كوش أعراس، وتنسيق مناسبات مصمم بعناية ليحكي قصتكم.':'Luxury bouquets, wedding stages, and carefully designed event styling that tells your story.',
    'اطلب الآن':'Order Now','احجز مناسبتك':'Book Your Event','صمم باقتك':'Design Your Bouquet',
    '✓ تنسيق حسب الطلب':'✓ Custom arrangements','✓ توصيل بالرياض':'✓ Riyadh delivery','✓ دفع آمن':'✓ Secure payment',
    'كوش أعراس':'Wedding Stages','بتصميم خاص':'Custom Designed','باقات مختارة':'Selected Bouquets','بعناية يومية':'Freshly Curated Daily',
    'تسوق حسب المناسبة':'Shop by Occasion','كل وردة لها حكاية':'Every Flower Has a Story','مختاراتنا':'Our Selection','أحدث المنتجات':'Latest Products','عرض الكل':'Show All',
    'الأعراس والمناسبات':'Weddings & Events','من الفكرة إلى لحظة التنفيذ':'From Idea to Execution',
    'نرافقكم من المعاينة وعرض السعر إلى التركيب والتوثيق والفك، بفريق واحد ونظام متابعة واضح.':'From site inspection and quotation to installation, documentation, and dismantling, one team manages the entire process.',
    'ابدأ طلب حجز':'Start Booking','مساعد وردة الذكي':'Wardat Smart Assistant','اختر الباقة المناسبة خلال دقيقة':'Choose the Right Bouquet in One Minute',
    'أخبرنا بالمناسبة والميزانية والألوان، وسنقترح ثلاث خيارات مناسبة.':'Tell us the occasion, budget, and colors and we will suggest three suitable options.','ابدأ الآن':'Start Now',
    'الرياض، المملكة العربية السعودية · جميع الأسعار بالريال السعودي وتشمل الضريبة عند الفوترة.':'Riyadh, Saudi Arabia · All prices are in Saudi Riyals and VAT is applied when invoiced.',
    'سلة المشتريات':'Shopping Cart','إتمام الطلب':'Checkout','إتمام طلبك':'Complete Your Order','الاسم':'Name','رقم الجوال':'Mobile Number','طريقة الاستلام':'Fulfillment Method',
    'استلام من المحل':'Store Pickup','توصيل':'Delivery','موعد الاستلام أو التوصيل':'Pickup or Delivery Time','العنوان عند التوصيل':'Delivery Address','نص البطاقة':'Card Message','تأكيد الطلب':'Confirm Order',
    'حجز مناسبة':'Event Booking','اسم العميل':'Customer Name','نوع المناسبة':'Event Type','زفاف':'Wedding','خطوبة':'Engagement','ملكة':'Marriage Contract','تخرج':'Graduation','عيد ميلاد':'Birthday','استقبال مولود':'New Baby','مناسبة شركات':'Corporate Event','حسب الطلب':'Custom',
    'عدد الضيوف':'Guest Count','بداية المناسبة':'Event Start','نهاية المناسبة':'Event End','اسم القاعة أو الموقع':'Venue / Location','الحي':'District','الميزانية المتوقعة':'Expected Budget','الألوان المفضلة':'Preferred Colors','تفاصيل الطلب':'Request Details','أطلب معاينة الموقع':'Request Site Inspection','إرسال طلب الحجز':'Send Booking Request',
    'مساعد اختيار الباقة':'Bouquet Assistant','الميزانية':'Budget','الألوان':'Colors','ورد طبيعي أم صناعي؟':'Natural or Artificial Flowers?','طبيعي':'Natural','صناعي':'Artificial','لا يهم':'No Preference','اعرض الخيارات':'Show Options',

    'بوابة مستقلة وآمنة':'Independent & Secure Portal','تسجيل الدخول':'Sign In','تسجيل الخروج':'Sign Out','اسم المستخدم أو البريد الإلكتروني':'Username or Email','كلمة المرور':'Password','تغيير كلمة المرور':'Change Password','كلمة المرور الجديدة':'New Password','تأكيد كلمة المرور':'Confirm Password','حفظ كلمة المرور':'Save Password',
    'دخول الموظفين':'Employee Login','دخول الإدارة':'Admin Login','لوحة الإدارة':'Admin Dashboard','نظام الإدارة':'Admin System','كاشير الموظفين':'Employee Cashier','الكاشير':'Cashier','واجهة البيع الخاصة بالموظف':'Employee Sales Interface',
    'هذه الصفحة مخصصة للإدارة، ويمكن أيضًا للموظف تسجيل الدخول باسم المستخدم وسيتم تحويله تلقائيًا إلى الكاشير.':'This page is for management. Employees can also sign in with their username and will be redirected automatically to the cashier.',
    'هذه الصفحة مخصصة لموظفي الكاشير. بعد تسجيل الدخول تظهر شاشة البيع فقط، وتسجل الفاتورة باسم الموظف تلقائيًا.':'This page is for cashier employees. After sign-in, only the sales screen appears and invoices are recorded automatically under the employee name.',
    'سيتم توجيه الحساب تلقائيًا إلى الصفحة المناسبة حسب دوره.':'The account will be redirected automatically according to its role.',
    'مثال: emp001':'Example: emp001','مثال: emp005 أو admin@example.com':'Example: emp005 or admin@example.com',
    'تحديث':'Refresh','الإشعارات':'Notifications','المستخدم':'User','الدور':'Role','الإدارة والمبيعات والتشغيل':'Management, Sales & Operations',

    'لوحة الإدارة':'Dashboard','نظام المحل':'Store System','نقطة البيع':'POS','الطلبات':'Orders','الحجوزات والمناسبات':'Bookings & Events','عروض الأسعار':'Quotations','أوامر العمل':'Work Orders','الموظفون':'Employees','المنتجات':'Products','المخزون':'Inventory','المشتريات والموردون':'Purchases & Suppliers','العملاء والولاء':'Customers & Loyalty','المساعد الذكي':'Smart Assistant','التقارير':'Reports','الحضور والانصراف':'Attendance','الإجازات والمأذونيات':'Leaves & Permissions','مسير الرواتب':'Payroll','السلف والجزاءات والمكافآت':'Advances, Penalties & Bonuses','المستخدمون والصلاحيات':'Users & Permissions','سجل التعديلات':'Audit Log','جودة البيانات':'Data Quality','الإعدادات':'Settings',
    'نظام المحل — عرض الإكسل':'Store System — Excel View','نظام المحل — مطابق لطريقة ملفات Excel':'Store System — Excel Workflow','كاشير · مخزون · مشتريات · حجوزات · رواتب':'Cashier · Inventory · Purchases · Bookings · Payroll',
    'لوحة التحكم':'Dashboard','الجرد والمخزون':'Stocktake & Inventory','المبيعات اليومية':'Daily Sales','المشتريات':'Purchases','المصروفات والنثريات':'Expenses & Petty Cash','الحجوزات':'Bookings','العهد':'Custody','المندوبون':'Couriers','الرواتب':'Payroll','الأصناف والباركود':'Products & Barcodes','الموردين':'Suppliers','الجرد الفعلي':'Physical Stocktake','سجل التالف':'Damage Register','الإعدادات الأساسية فقط':'Basic Settings Only',
    'نفس ترتيب وطريقة عمل ملفات Excel مع حساب تلقائي':'Same Excel workflow and order with automatic calculations',
    'اختر الورقة من التبويبات، ثم أدخل أو راجع البيانات بنفس ترتيب الأعمدة المعتاد. جميع المجاميع والحسابات تلقائية.':'Choose a sheet tab, then enter or review data in the same familiar column order. All totals and calculations are automatic.',
    'دليل الأصناف: الكود، الباركود، الكمية، الشراء والبيع':'Product list: code, barcode, quantity, purchase and selling prices',
    'واجهة بيع مباشرة مرتبطة بالمخزون':'Direct sales interface linked to inventory','الموردين والفواتير والدفعات والملخص بنفس ملف Excel':'Suppliers, invoices, payments and summary matching the Excel file','كشف الحجوزات: المبلغ، المدفوع والمتبقي':'Booking sheet: total, paid and remaining','الكمية الفعلية وفرق الجرد واعتماده':'Actual quantity, stocktake variance and approval','التالف المعتمد وتأثيره على المخزون':'Approved damage and inventory impact','بيانات العامل والراتب الأساسي':'Employee data and base salary','الحضور والغياب المرتبط بالراتب':'Attendance and absence linked to payroll','كشف الرواتب بنفس أعمدة Excel':'Payroll sheet with the same Excel columns',

    'كشف حساب الموردين الذكي':'Smart Supplier Accounts','الموردين':'Suppliers','الفواتير':'Invoices','الدفعات':'Payments','الملخص':'Summary','طريقة الإدخال:':'Entry Method:','طريقة العمل':'Workflow',
    'كود المورد':'Supplier Code','اسم الشركة':'Company Name','تاريخ فتح الحساب':'Account Open Date','الرصيد الافتتاحي':'Opening Balance','إجمالي الفواتير الآجلة':'Total Credit Invoices','إجمالي المسدد':'Total Paid','الرصيد الحالي':'Current Balance','حالة الحساب':'Account Status','ملاحظات':'Notes',
    'رقم الفاتورة':'Invoice No.','التاريخ':'Date','اسم المورد':'Supplier Name','قيمة الفاتورة':'Invoice Amount','تاريخ الاستحقاق':'Due Date','المسدد':'Paid','المتبقي':'Remaining','حالة السداد':'Payment Status','رقم السداد':'Payment No.','المبلغ المسدد':'Amount Paid','طريقة السداد':'Payment Method','مرجع العملية':'Transaction Reference',
    'عدد الموردين':'Supplier Count','إجمالي الفواتير':'Total Invoices','الرصيد المتبقي':'Remaining Balance','حسابات مسددة':'Paid Accounts','حسابات جزئية':'Partial Accounts','حسابات آجلة':'Credit Accounts','الملخص يتحدث تلقائيًا':'The summary updates automatically',
    'آجل':'Credit','مسدد':'Paid','جزئي':'Partial','دائن':'Credit Balance','كاش':'Cash','شبكة':'Card','تحويل':'Transfer','إلكتروني':'Electronic',
    'تم حفظ المورد':'Supplier saved','تم تسجيل فاتورة المورد':'Supplier invoice recorded','تم تسجيل الدفعة وتحديث رصيد المورد':'Payment recorded and supplier balance updated','اكتب اسم المورد':'Enter supplier name','كود المورد غير موجود':'Supplier code not found','أدخل قيمة الفاتورة':'Enter invoice amount','أدخل مبلغ السداد':'Enter payment amount',

    'كشف الحجوزات':'Bookings Sheet','عدد الحجوزات الفعلية':'Actual Bookings','الحجوزات المسددة':'Paid Bookings','إجمالي المبلغ':'Total Amount','إجمالي المدفوع':'Total Paid','إجمالي المتبقي':'Total Remaining','رقم الحجز':'Booking No.','تاريخ الحجز':'Booking Date','المبلغ':'Amount','المبلغ المدفوع':'Paid Amount','المبلغ المتبقي':'Remaining Amount','تم السداد':'Paid','نعم':'Yes','لا':'No','دفعة':'Payment',
    'اكتب اسم العميل':'Enter customer name','اختر تاريخ الحجز':'Choose booking date','أدخل المبلغ المدفوع أو المتبقي':'Enter paid or remaining amount','المبالغ لا يمكن أن تكون سالبة':'Amounts cannot be negative','تم حفظ الحجز وتحديث الملخص':'Booking saved and summary updated','تم تسجيل الدفعة وتحديث المتبقي':'Payment recorded and remaining balance updated','تعذر حفظ الحجز':'Unable to save booking',

    'حالة التصفية':'Settlement Status','تمت التصفية':'Settled','لم تتم التصفية':'Not Settled','قيمة الفواتير':'Invoice Value','العهدة':'Custody Amount','حذف':'Delete',

    'الأصناف والمخزون — إدخال مباشر':'Products & Inventory — Direct Entry','الخانات الرمادية محسوبة تلقائيًا':'Gray cells are calculated automatically','طريقة الإدخال مثل Excel:':'Excel-style entry:','حفظ السطر':'Save Row','اسم المنتج':'Product Name','اسم المنتج بالعربي':'Product Name (Arabic)','اسم المنتج بالإنجليزي':'Product Name (English)','اسم المنتج عربي':'Product Name (Arabic)','اسم المنتج English':'Product Name (English)','العدد':'Quantity','سعر الشراء':'Purchase Price','سعر البيع':'Selling Price','الكود':'Code','الباركود':'Barcode','الإجمالي':'Total','الحالة':'Status','الكمية':'Quantity','سعر الوحدة':'Unit Price','الخصم':'Discount','الضريبة':'VAT','قبل الضريبة':'Before VAT','الإجمالي شامل الضريبة':'Total incl. VAT','الإجمالي قبل الضريبة':'Total before VAT','الإجمالي قبل الخصم':'Subtotal Before Discount','إجمالي الخصومات':'Total Discounts','التكلفة':'Cost','صافي الربح':'Net Profit','هامش الربح':'Profit Margin',
    'بحث':'Search','بحث بالاسم أو الكود أو الباركود':'Search by name, code, or barcode','إضافة':'Add','تعديل':'Edit','حفظ':'Save','إلغاء':'Cancel','اعتماد':'Approve','رفض':'Reject','طباعة':'Print','تنزيل PDF':'Download PDF','إرسال/مشاركة':'Send / Share','إغلاق':'Close','التالي':'Next','السابق':'Previous','الكل':'All','جميع الأصناف':'All Products',
    'لا توجد بيانات':'No data','لا توجد أصناف مطابقة':'No matching products','لا توجد بنود':'No items','لا توجد عمليات استيراد بعد.':'No import operations yet.','لا توجد باركودات للطباعة':'No barcodes to print',
    'المبيعات':'Sales','تكلفة المباع':'COGS','مجمل الربح':'Gross Profit','المصروفات':'Expenses','التالف':'Damage','التالف المعتمد':'Approved Damage','خسارة التالف':'Damage Loss','صافي الربح الحقيقي':'True Net Profit','قيمة المخزون':'Inventory Value','مخزون بداية الفترة':'Opening Inventory','قيمة المخزون نهاية الفترة':'Closing Inventory','تغير قيمة المخزون':'Inventory Change','مشتريات الفترة':'Period Purchases','مستحقات الموردين':'Supplier Payables','الحجوزات المتبقية':'Outstanding Bookings','العهد غير المصفاة':'Unsettled Custody','مستحقات/سجلات المندوبين':'Courier Dues / Records','إجمالي الرواتب للفترة':'Total Payroll for Period','عدد الأصناف':'Product Count','منخفضة المخزون':'Low Stock','نافدة':'Out of Stock','أصناف خاسرة':'Loss-Making Products',
    'مبيعات بدون VAT':'Sales excl. VAT','المبيعات بدون VAT':'Sales excl. VAT','VAT مبيعات':'Output VAT','VAT مشتريات':'Input VAT','VAT المستحق':'VAT Due','صافي VAT':'Net VAT','ضريبة VAT':'VAT','الربح المحاسبي':'Accounting Profit','الحركة النقدية':'Cash Flow','مدفوع للموردين':'Paid to Suppliers','مرتجعات نقدية':'Cash Refunds','المرتجعات':'Returns',
    'استيراد Excel':'Import Excel','نوع البيانات':'Data Type','ملف Excel':'Excel File','ورقة العمل':'Worksheet','معاينة البيانات':'Preview Data','سجل الاستيراد':'Import Log','الرقم':'No.','الملف':'File','النوع':'Type','مقبول':'Accepted','مرفوض':'Rejected',

    'مسح باركود':'Scan Barcode','تشغيل الفلاش':'Flash On','إيقاف الفلاش':'Flash Off','تبديل الكاميرا':'Switch Camera','إدخال يدوي':'Manual Entry','جاري تشغيل الكاميرا...':'Starting camera...','الكاميرا جاهزة للمسح المتواصل':'Camera ready for continuous scanning','تعذر تشغيل الكاميرا — استخدم الإدخال اليدوي':'Unable to start camera — use manual entry','المتصفح لا يدعم استخدام الكاميرا':'This browser does not support camera access','الباركود غير مربوط بصنف':'Barcode is not linked to a product','الكمية غير متاحة':'Quantity not available','الفلاش غير متاح':'Flash unavailable','تم تشغيل الفلاش':'Flash enabled','تم إيقاف الفلاش':'Flash disabled','لا توجد كاميرا أخرى متاحة':'No other camera available',
    '📷 تصوير الصنف بالكاميرا':'📷 Take Product Photo','جاري ضغط الصورة...':'Compressing image...','عدد الملصقات لكل صنف':'Labels per product','توليد الباركودات':'Generate Barcodes','طباعة الباركودات':'Print Barcodes','اختيار التصنيف':'Select Category','عدد النسخ':'Copies','بيانات دخول الموظفين':'Employee Login Details','إعادة تعيين كلمة المرور':'Reset Password','اسم المستخدم':'Username','كلمة المرور المؤقتة':'Temporary Password',

    'فاتورة مبيعات':'Sales Invoice','فاتورة ضريبية':'Tax Invoice','عرض سعر':'Quotation','تأكيد حجز':'Booking Confirmation','عقد تجهيز مناسبة':'Event Setup Contract','أمر عمل':'Work Order','أمر شراء':'Purchase Order','قسيمة راتب':'Payslip','مسير رواتب':'Payroll','كشف حساب عميل':'Customer Statement','كشف حساب مورد':'Supplier Statement','بطاقة منتج':'Product Card','تقرير مخزون':'Inventory Report','تقرير':'Report','سند قبض':'Receipt Voucher','سند صرف':'Payment Voucher','تقرير توصيل':'Delivery Report','تقرير الحضور والانصراف':'Attendance Report','بطاقة هدية':'Gift Card','بطاقة باقة ورد':'Bouquet Card',
    'رقم المستند':'Document No.','تاريخ الإصدار':'Issue Date','العميل/المستفيد':'Customer / Beneficiary','الموقع':'Location','رقم التقرير':'Report No.','المستودع':'Warehouse','المستودع الرئيسي':'Main Warehouse','نطاق التقرير':'Report Scope','الكاشير:':'Cashier:','الرقم الضريبي:':'VAT No.:','السجل التجاري:':'CR No.:','البيان':'Description','المحجوز':'Reserved','المتاح':'Available','قيمة الشراء':'Purchase Value','قيمة البيع':'Sales Value','مسؤول المخزون':'Inventory Officer','اعتماد الإدارة':'Management Approval','الختم':'Stamp','توقيع العميل':'Customer Signature','شكرًا لاختياركم وردة أشبيليا':'Thank you for choosing Wardat Ashbilya','تقرير مخزون وردة أشبيليا':'Wardat Ashbilya Inventory Report','صفحة':'Page',

    'جديد':'New','بانتظار الدفع':'Awaiting Payment','غير مدفوع':'Unpaid','مدفوع جزئيًا':'Partially Paid','مدفوع':'Paid','جاري التجهيز':'Preparing','جاهز':'Ready','خرج للتوصيل':'Out for Delivery','تم التسليم':'Delivered','مكتمل':'Completed','ملغي':'Cancelled','مرتجع':'Returned','بانتظار التواصل':'Awaiting Contact','موعد معاينة':'Inspection Scheduled','تمت المعاينة':'Inspected','إعداد عرض السعر':'Preparing Quotation','تم إرسال العرض':'Quotation Sent','بانتظار العميل':'Awaiting Customer','تم دفع العربون':'Deposit Paid','مؤكد':'Confirmed','جاري التركيب':'Installing','تم التنفيذ':'Executed','تم الفك':'Dismantled','مسودة':'Draft','مرسل':'Sent','معتمد':'Approved','مرفوض':'Rejected','تم الاستلام':'Received','جاهز للخروج':'Ready to Leave','في الطريق':'On the Way','وصل الموقع':'Arrived','تم التركيب':'Installed','تم التوثيق':'Documented','بانتظار الفك':'Awaiting Dismantling','تمت إعادة المعدات':'Equipment Returned','توجد ملاحظة':'Note Exists','معلق':'Pending','حاضر':'Present','متأخر':'Late','انصراف مبكر':'Early Leave','غائب':'Absent','إجازة':'Leave','لم يسجل انصراف':'Missing Checkout','بانتظار المسؤول':'Awaiting Supervisor','بانتظار الإدارة':'Awaiting Management','تحت المراجعة':'Under Review','بانتظار الاعتماد':'Awaiting Approval','جاهز للصرف':'Ready to Pay','مصروف جزئيًا':'Partially Paid',

    'ليس لديك صلاحية لتنفيذ هذه العملية':'You do not have permission to perform this action','تعذر':'Failed','تم حفظ الإعدادات':'Settings saved','تم تحديث المخزون':'Inventory updated','تم تحديث صلاحياتك تلقائيًا':'Your permissions were updated automatically','تم إيقاف الحساب. راجع الإدارة.':'Account disabled. Contact management.','السلة فارغة':'Cart is empty',
    'فاتورة كاشير':'Cashier Invoice','مسح السلة':'Clear Cart','عميل نقدي سريع':'Walk-in Customer','الدفع المختلط':'Split Payment','المتبقي/الآجل':'Remaining / Credit','الباقي للعميل':'Change Due','إتمام البيع':'Complete Sale','مسح':'Scan','الدفع':'Payment','السعر':'Price','متاح':'Available','خدمة':'Service','اسم / كود / باركود':'Name / Code / Barcode','طرق الدفع':'Payment Methods',
    'المورد':'Supplier','اختر المورد':'Select Supplier','رقم فاتورة المورد':'Supplier Invoice No.','تاريخ الفاتورة':'Invoice Date','التوريد المتوقع':'Expected Delivery','طريقة احتساب السعر':'Price Calculation Method','السعر قبل الضريبة':'Price Before VAT','السعر شامل الضريبة':'Price Including VAT','معفى من الضريبة':'VAT Exempt','المدفوع الآن':'Paid Now','طريقة الدفعة':'Payment Method','مرجع الدفعة':'Payment Reference','الأصناف':'Products','إضافة صنف':'Add Product','اعتماد فاتورة الشراء':'Approve Purchase Invoice','فاتورة شراء مخزون':'Inventory Purchase Invoice',
    'تسجيل دفعة مورد':'Record Supplier Payment','المتبقي الحالي':'Current Remaining','تسجيل الدفعة':'Record Payment','تسجيل تالف':'Record Damage','اختر الصنف':'Select Product','الكمية التالفة':'Damaged Quantity','المسؤول':'Responsible Person','سبب التلف':'Damage Reason','إرسال للاعتماد مباشرة':'Submit for Approval Immediately','حفظ التالف':'Save Damage','مرتجع مشتريات':'Purchase Return','فاتورة الشراء الأصلية':'Original Purchase Invoice','اختر الفاتورة':'Select Invoice','اعتماد مرتجع المشتريات':'Approve Purchase Return','المستلم':'Received','كمية المرتجع':'Return Quantity',
    'اليوم':'Day','مصروفات':'Expenses','تالف':'Damage','ربح محاسبي':'Accounting Profit','مشتريات':'Purchases','حركة نقدية':'Cash Flow','نوع المصروف':'Expense Type','الوصف':'Description','القيمة':'Value',
    'إجمالي الأصناف':'Total Products','إجمالي القطع':'Total Pieces','إجمالي قيمة الشراء':'Total Purchase Value','إجمالي قيمة البيع':'Total Sales Value','الربح المتوقع':'Expected Profit','منخفضة الكمية':'Low Stock','غير مصرح':'Not Authorized','كود المنتج':'Product Code','الصنف':'Product','الحالي':'Current','قيمة الشراء':'Purchase Value','قيمة البيع':'Sales Value','الخصومات':'Discounts','قبل الضريبة':'Before VAT','بند':'Item','مستند':'Document','النظام':'System','ملاحظات':'Notes','جيد':'Good','منخفض':'Low',
    'نظرة مباشرة على التشغيل والمبيعات':'Live overview of operations and sales','نظام المحل مطابق لكشوف الإكسل والحسابات التلقائية':'Store system matching Excel sheets with automatic calculations','إدارة المنتجات والأسعار والتصنيفات':'Manage products, prices and categories','الكميات والحركات والتنبيهات':'Quantities, movements and alerts','بيع مباشر وإصدار فاتورة وخصم المخزون':'Direct sale, invoice issuance and inventory deduction','متابعة الطلبات والمدفوعات والتسليم':'Track orders, payments and delivery','تقويم الأعراس والمناسبات والمعاينات':'Wedding, event and inspection calendar','من عرض السعر إلى الحجز وأمر العمل':'From quotation to booking and work order','تنفيذ المهام والتوثيق وإعادة المعدات':'Task execution, documentation and equipment return','ملفات الموظفين وربطهم بالحضور والغياب والرواتب':'Employee files linked to attendance, absences and payroll','سجل العميل والطلبات ونقاط الولاء':'Customer records, orders and loyalty points','الموردون وأوامر الشراء والاستلام':'Suppliers, purchase orders and receiving','تنبيهات واقتراحات مبنية على بيانات النظام':'Alerts and suggestions based on system data','تقارير قابلة للفلترة والتصدير':'Filterable and exportable reports','إدارة المستخدمين والأدوار والصلاحيات الفعلية':'Manage users, roles and effective permissions','كل تعديل وحذف واعتماد داخل النظام':'Every edit, deletion and approval in the system','كشف التكرار وعدم التطابق والأخطاء قبل أن تؤثر على التشغيل':'Detect duplicates, mismatches and errors before they affect operations','تسجيل وتحضير ومراجعة الحضور والغياب والأوفر تايم':'Record and review attendance, absence and overtime','طلبات الإجازات والمأذونيات وربطها بالحضور والراتب':'Leave and permission requests linked to attendance and payroll','الاحتساب والمراجعة والاعتماد والقسائم والصرف':'Calculation, review, approval, payslips and payment','السلف والأقساط والجزاءات والمكافآت والعمولات':'Advances, installments, penalties, bonuses and commissions','بيانات المنشأة والتجربة والإعدادات':'Business information and settings',
    'لغة':'Language','العربية':'Arabic','الإنجليزية':'English'
  };

  const EN_AR={};
  Object.entries(AR_EN).forEach(([ar,en])=>{ if(!EN_AR[en]) EN_AR[en]=ar; });
  const getLanguage=()=>localStorage.getItem(STORAGE_KEY)==='en'?'en':'ar';
  const locale=()=>getLanguage()==='en'?'en-US':'ar-SA';
  const dir=()=>getLanguage()==='en'?'ltr':'rtl';

  function t(value){
    const s=String(value??'');
    return getLanguage()==='en' ? (AR_EN[s]||s) : (EN_AR[s]||s);
  }
  function translateDynamic(text,toLang=getLanguage()){
    if(text==null)return text;
    let s=String(text);
    const trimmed=s.trim();
    const leading=s.slice(0,s.indexOf(trimmed));
    const trailing=s.slice(s.indexOf(trimmed)+trimmed.length);
    const dict=toLang==='en'?AR_EN:EN_AR;
    if(dict[trimmed])return leading+dict[trimmed]+trailing;
    if(toLang==='en'){
      let m=trimmed.match(/^صفحة\s+(.+?)\s+من\s+(.+?)\s+·\s+(.+?)\s+سجل$/);
      if(m)return `${leading}Page ${m[1]} of ${m[2]} · ${m[3]} records${trailing}`;
      m=trimmed.match(/^الكاشير:\s*(.+)$/); if(m)return `${leading}Cashier: ${m[1]}${trailing}`;
      m=trimmed.match(/^الرقم الضريبي:\s*(.+)$/); if(m)return `${leading}VAT No.: ${m[1]}${trailing}`;
      m=trimmed.match(/^السجل التجاري:\s*(.+)$/); if(m)return `${leading}CR No.: ${m[1]}${trailing}`;
      m=trimmed.match(/^إجمالي\s+(.+)$/); if(m && AR_EN[m[1]])return `${leading}Total ${AR_EN[m[1]]}${trailing}`;
    } else {
      let m=trimmed.match(/^Page\s+(.+?)\s+of\s+(.+?)\s+·\s+(.+?)\s+records$/); if(m)return `${leading}صفحة ${m[1]} من ${m[2]} · ${m[3]} سجل${trailing}`;
      m=trimmed.match(/^Cashier:\s*(.+)$/); if(m)return `${leading}الكاشير: ${m[1]}${trailing}`;
      m=trimmed.match(/^VAT No\.:\s*(.+)$/); if(m)return `${leading}الرقم الضريبي: ${m[1]}${trailing}`;
      m=trimmed.match(/^CR No\.:\s*(.+)$/); if(m)return `${leading}السجل التجاري: ${m[1]}${trailing}`;
    }
    return s;
  }

  function shouldSkipTextNode(node){
    const p=node.parentElement;
    if(!p)return true;
    if(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA'].includes(p.tagName))return true;
    if(p.closest('[data-no-i18n]'))return true;
    // Data cells contain business/user-entered values. Only translate exact known values there.
    return false;
  }
  function translateTextNode(node){
    if(shouldSkipTextNode(node))return;
    const p=node.parentElement;
    const original=node.nodeValue;
    const translated=translateDynamic(original);
    if(translated!==original){node.nodeValue=translated;return;}
    // For UI prose, allow safe phrase replacement for a few common compounds.
    if(p && !['TD','INPUT','TEXTAREA'].includes(p.tagName)){
      let s=original;
      const entries=getLanguage()==='en'?Object.entries(AR_EN):Object.entries(EN_AR);
      for(const [from,to] of entries){
        if(from.length<5 || !s.includes(from))continue;
        s=s.split(from).join(to);
      }
      if(s!==original)node.nodeValue=s;
    }
  }
  function translateAttributes(el){
    if(!(el instanceof Element)||el.closest('[data-no-i18n]'))return;
    for(const attr of ['placeholder','title','aria-label']){
      if(el.hasAttribute(attr)){
        const old=el.getAttribute(attr),next=translateDynamic(old);
        if(next!==old)el.setAttribute(attr,next);
      }
    }
    if(el.tagName==='INPUT' && ['button','submit','reset'].includes(el.type)){
      const old=el.value,next=translateDynamic(old); if(next!==old)el.value=next;
    }
  }
  function translateSubtree(root=document){
    if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE && root!==document)return;
    if(root instanceof Element)translateAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let n;while((n=walker.nextNode())){
      if(n.nodeType===Node.TEXT_NODE)translateTextNode(n);else translateAttributes(n);
    }
  }
  function applyDocumentState(){
    const lang=getLanguage();
    document.documentElement.lang=lang;
    document.documentElement.dir=dir();
    document.body?.setAttribute('dir',dir());
    document.body?.classList.toggle('lang-en',lang==='en');
    document.body?.classList.toggle('lang-ar',lang==='ar');
    try{window.WardatFinancial?.setConfig?.({locale:locale()});}catch{}
    translateSubtree(document);
    updateToggle();
  }
  function setLanguage(lang){
    const next=lang==='en'?'en':'ar';
    localStorage.setItem(STORAGE_KEY,next);
    applyDocumentState();
    window.dispatchEvent(new CustomEvent('wardat:languagechange',{detail:{language:next,locale:locale(),dir:dir()}}));
  }
  function toggle(){setLanguage(getLanguage()==='ar'?'en':'ar');}
  function createToggle(){
    if(document.getElementById('wardatLanguageToggle'))return;
    const b=document.createElement('button');
    b.type='button'; b.id='wardatLanguageToggle'; b.className='language-toggle'; b.onclick=toggle;
    const host=document.querySelector('.top-actions')||document.querySelector('.store-actions')||document.querySelector('.portal-login-card')||document.body;
    if(host.matches?.('.portal-login-card'))host.insertBefore(b,host.firstChild);else host.prepend(b);
    updateToggle();
  }
  function updateToggle(){
    const b=document.getElementById('wardatLanguageToggle'); if(!b)return;
    const en=getLanguage()==='en';
    b.innerHTML=en?'<span class="lang-code">ع</span><span class="lang-name">العربية</span>':'<span class="lang-code">EN</span><span class="lang-name">English</span>';
    b.title=en?'Switch to Arabic':'التبديل إلى الإنجليزية';
    b.setAttribute('aria-label',b.title);
  }
  let observer;
  function observe(){
    observer?.disconnect();
    observer=new MutationObserver(muts=>{
      observer.disconnect();
      try{
        muts.forEach(m=>{
          if(m.type==='childList')m.addedNodes.forEach(n=>translateSubtree(n));
          else if(m.type==='characterData')translateTextNode(m.target);
          else if(m.type==='attributes')translateAttributes(m.target);
        });
        createToggle(); updateToggle();
      }finally{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});}
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
  }
  function init(){applyDocumentState();createToggle();observe();setTimeout(()=>{translateSubtree(document);createToggle();},50);setTimeout(()=>translateSubtree(document),500);}

  window.WardatI18n={t,translate:translateDynamic,translateSubtree,getLanguage,setLanguage,toggle,locale,dir,dictionary:AR_EN};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
