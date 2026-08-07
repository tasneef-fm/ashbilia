'use strict';
(() => {
  // وضع التشغيل المبسط: إبقاء الأقسام التي لها مقابل مباشر في ملفات Excel أو اللازمة لتشغيلها.
  const simplePages = [
    {id:'shopbooks',icon:'▦',label:'نظام المحل',permission:'reports.view'},
    {id:'pos',icon:'▣',label:'الكاشير',permission:'pos.view'},
    {id:'products',icon:'✿',label:'الأصناف والباركود',permission:'products.view'},
    {id:'purchases',icon:'⇣',label:'الموردين',permission:'suppliers.view'},
    {id:'bookings',icon:'◫',label:'الحجوزات',permission:'bookings.view'},
    {id:'stocktake',icon:'⌗',label:'الجرد الفعلي',permission:'stocktake.view'},
    {id:'damage',icon:'⚠',label:'التالف',permission:'damage.view'},
    {id:'employees',icon:'♟',label:'الموظفون',permission:'employees.view'},
    {id:'attendance',icon:'◷',label:'الحضور',permission:'attendance.view_self'},
    {id:'payroll',icon:'﷼',label:'الرواتب',permission:'payroll.view_self'},
    {id:'settings',icon:'⚙',label:'الإعدادات',permission:'settings.view'}
  ];
  pages.splice(0,pages.length,...simplePages);
  try{
    EMPLOYEE_PAGE_IDS.clear();
    ['shopbooks','pos','products','stocktake','damage','attendance','payroll'].forEach(x=>EMPLOYEE_PAGE_IDS.add(x));
  }catch{}

  // ترتيب تبويبات نظام المحل بنفس منطق ملفات Excel.
  SHOP_TABS.splice(0,SHOP_TABS.length,
    ['dashboard','لوحة التحكم'],
    ['inventory','الجرد والمخزون'],
    ['daily','المبيعات اليومية'],
    ['purchases','المشتريات'],
    ['expenses','المصروفات والنثريات'],
    ['bookings','الحجوزات'],
    ['custodies','العهد'],
    ['drivers','المندوبون'],
    ['payroll','الرواتب']
  );

  const oldLabel = pageLabel;
  pageLabel = function(meta){
    const m={shopbooks:'نظام المحل — عرض الإكسل',pos:'الكاشير',products:'الأصناف والباركود',purchases:'الموردين',bookings:'الحجوزات',stocktake:'الجرد الفعلي',damage:'سجل التالف',employees:'الموظفون',attendance:'الحضور',payroll:'الرواتب',settings:'الإعدادات'};
    return m[meta?.id]||oldLabel(meta);
  };
  const oldSub = pageSub;
  pageSub = function(p){
    const m={shopbooks:'نفس ترتيب وطريقة عمل ملفات Excel مع حساب تلقائي',pos:'واجهة بيع مباشرة مرتبطة بالمخزون',products:'دليل الأصناف: الكود، الباركود، الكمية، الشراء والبيع',purchases:'الموردين والفواتير والدفعات والملخص بنفس ملف Excel',bookings:'كشف الحجوزات: المبلغ، المدفوع والمتبقي',stocktake:'الكمية الفعلية وفرق الجرد واعتماده',damage:'التالف المعتمد وتأثيره على المخزون',employees:'بيانات العامل والراتب الأساسي',attendance:'الحضور والغياب المرتبط بالراتب',payroll:'كشف الرواتب بنفس أعمدة Excel',settings:'الإعدادات الأساسية فقط'};
    return m[p]||oldSub(p);
  };

  // اجعل نظام المحل هو الصفحة الأولى بدل لوحة إدارة منفصلة.
  if(state.currentPage==='dashboard') state.currentPage='shopbooks';

  // تحسين رأس نظام المحل ليشبه مصنف Excel: عنوان + تبويبات أوراق + جدول.
  const originalRenderShopBooks = renderShopBooks;
  renderShopBooks = async function(options={}){
    await originalRenderShopBooks(options);
    document.body.classList.add('excel-workflow-mode');
    const head=$('.shop-system-head');
    if(head){
      const h=head.querySelector('h2'); if(h) h.textContent='نظام المحل — مطابق لطريقة ملفات Excel';
      const p=head.querySelector('p'); if(p) p.textContent='اختر الورقة من التبويبات، ثم أدخل أو راجع البيانات بنفس ترتيب الأعمدة المعتاد. جميع المجاميع والحسابات تلقائية.';
    }
  };

  // أزرار مباشرة داخل أوراق النظام بدل التنقل بين أقسام كثيرة.
  const originalRenderShopTab = renderShopTab;
  renderShopTab = function(tab,d){
    originalRenderShopTab(tab,d);
    const area=$('#shopTabArea'); if(!area)return;
    const panelHead=area.querySelector('.panel-head');
    if(tab==='inventory' && panelHead){
      panelHead.insertAdjacentHTML('beforeend','<div class="excel-inline-actions"><button class="btn btn-primary" id="excelAddProduct">إضافة صنف</button><button class="btn btn-outline" id="excelBarcodes">الأصناف والباركود</button></div>');
      $('#excelAddProduct')?.addEventListener('click',()=>productForm());
      $('#excelBarcodes')?.addEventListener('click',()=>renderPage('products'));
    }
    if(tab==='purchases' && panelHead){
      panelHead.insertAdjacentHTML('beforeend','<div class="excel-inline-actions"><button class="btn btn-primary" id="excelAddPurchase">فاتورة شراء</button><button class="btn btn-outline" id="excelAddSupplier">إضافة مورد</button></div>');
      $('#excelAddPurchase')?.addEventListener('click',()=>purchaseOrderForm());
      $('#excelAddSupplier')?.addEventListener('click',()=>supplierForm());
      $('#openPurchases')?.remove();
    }
    if(tab==='bookings' && panelHead){
      panelHead.insertAdjacentHTML('beforeend','<div class="excel-inline-actions"><button class="btn btn-primary" id="excelAddBooking">إضافة حجز</button></div>');
      $('#excelAddBooking')?.addEventListener('click',()=>bookingForm());
      $('[data-go-page="bookings"]')?.remove();
    }
    if(tab==='payroll') $('#openPayroll')?.remove();
    if(tab==='inventory') $('#openInventory')?.remove();
  };

  // بعد تسجيل الدخول أظهر اسم أبسط للواجهة.
  const originalShowApp=showApp;
  showApp=async function(){
    await originalShowApp();
    if($('#portalSideLabel')) $('#portalSideLabel').textContent='وردة أشبيليا';
    if($('#portalHeaderTitle')) $('#portalHeaderTitle').textContent='نظام المحل';
    if($('#portalHeaderSubtitle')) $('#portalHeaderSubtitle').textContent='كاشير · مخزون · مشتريات · حجوزات · رواتب';
  };
})();
