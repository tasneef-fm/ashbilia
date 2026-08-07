'use strict';
(() => {
  const V27_PAGES=[
    {id:'damage',icon:'⚠',label:'سجل التالف',permission:'damage.view'},
    {id:'stocktake',icon:'⌗',label:'الجرد الفعلي',permission:'stocktake.view'},
    {id:'vat',icon:'%',label:'ضريبة VAT',permission:'vat.view'},
    {id:'returns',icon:'↩',label:'المرتجعات',permission:'orders.return'},
    {id:'excel_import',icon:'⇩',label:'استيراد Excel',permission:'excel.import'}
  ];
  V27_PAGES.forEach(meta=>{if(!pages.some(x=>x.id===meta.id)){const at=meta.id==='vat'?pages.findIndex(x=>x.id==='reports'):pages.findIndex(x=>x.id==='inventory')+1;pages.splice(Math.max(0,at),0,meta);}});
  try{EMPLOYEE_PAGE_IDS.add('damage');EMPLOYEE_PAGE_IDS.add('stocktake');}catch{}
  const oldPageSub=pageSub;
  pageSub=function(p){return {damage:'التالف لا يخصم من المخزون إلا بعد الاعتماد',stocktake:'جرد فعلي محفوظ مع اعتماد وفروق وحركة مخزون',vat:'ضريبة المبيعات والمشتريات وصافي الضريبة ربع السنوية',returns:'مرتجع مبيعات ومشتريات مرتبط بالمستند الأصلي والمخزون والضريبة',excel_import:'استيراد آمن مع معاينة وفحص التكرار وسجل كامل للعملية'}[p]||oldPageSub(p);};

  const apiV27=(url,opts)=>api(url,opts);
  const isoDate=d=>d.toISOString().slice(0,10);
  const firstOfMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;};
  const statusText=s=>({draft:'مسودة',pending:'بانتظار الاعتماد',approved:'معتمد',rejected:'مرفوض',cancelled:'ملغي'}[s]||s||'—');
  const paymentLabel=m=>({cash:'كاش',mada:'شبكة/مدى',bank_transfer:'تحويل',online:'إلكتروني',credit:'آجل'}[m]||m||'—');
  let dashboardCharts=[];
  function destroyCharts(){dashboardCharts.forEach(c=>{try{c.destroy();}catch{}});dashboardCharts=[];}
  function drawChart(id,type,labels,data,label){
    if(!window.Chart)return;const canvas=document.getElementById(id);if(!canvas)return;
    dashboardCharts.push(new Chart(canvas,{type,data:{labels,datasets:[{label,data}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut'}}}}));
  }

  // ---------------- لوحة التحكم المالية الموحدة ----------------
  renderDashboard=async function(){
    const from=state.cache.v27DashFrom||firstOfMonth(),to=state.cache.v27DashTo||isoDate(new Date());
    const d=await apiV27(`/api/store-dashboard?from=${from}&to=${to}`);
    destroyCharts();
    $('#content').innerHTML=`
      <section class="panel v27-filter-panel"><div class="report-filters">
        <label>من<input id="v27DashFrom" type="date" value="${from}"></label><label>إلى<input id="v27DashTo" type="date" value="${to}"></label>
        <button class="btn btn-primary" id="v27DashRun">تحديث</button><button class="btn btn-outline" id="v27DashToday">اليوم</button><button class="btn btn-outline" id="v27DashMonth">هذا الشهر</button>
      </div></section>
      <div class="metrics v27-metrics">
        ${metricHtml('المبيعات بدون VAT',money(d.sales_total))}${metricHtml('تكلفة البضاعة المباعة',money(d.cost_of_goods))}${metricHtml('مجمل الربح',money(d.gross_profit))}
        ${metricHtml('المصروفات',money(d.expenses_total))}${metricHtml('خسارة التالف',money(d.damage_total))}${metricHtml('صافي الربح الحقيقي',money(d.net_profit))}
        ${metricHtml('مخزون بداية الفترة',money(d.opening_inventory_value))}${metricHtml('قيمة المخزون نهاية الفترة',money(d.inventory_value))}${metricHtml('تغير قيمة المخزون',money(d.inventory_change))}
        ${metricHtml('مشتريات الفترة',money(d.purchases_total))}${metricHtml('إضافات المخزون بالتكلفة',money(d.purchases_added_value))}${metricHtml('مستحقات الموردين',money(d.supplier_due))}
        ${metricHtml('الحجوزات المتبقية',money(d.bookings_due))}${metricHtml('العهد غير المصفاة',money(d.custodies_due))}${metricHtml('مستحقات/سجلات المندوبين',money(d.courier_total))}
        ${metricHtml('إجمالي الرواتب للفترة',money(d.payroll_total))}${metricHtml('VAT مبيعات',money(d.output_vat))}${metricHtml('VAT مشتريات',money(d.input_vat))}${metricHtml('صافي VAT',money(d.vat_due))}
        ${metricHtml('عدد الأصناف',number(d.product_count))}${metricHtml('منخفضة المخزون',number(d.low_stock))}${metricHtml('نافدة',number(d.out_of_stock))}${metricHtml('أصناف خاسرة',number(d.losing_products))}
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h3>المبيعات اليومية</h3><small>القيم بدون الضريبة</small></div><div class="v27-chart"><canvas id="v27SalesChart"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>الربح اليومي</h3></div><div class="v27-chart"><canvas id="v27ProfitChart"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>المشتريات اليومية</h3></div><div class="v27-chart"><canvas id="v27PurchasesChart"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>طرق الدفع</h3></div><div class="v27-chart"><canvas id="v27PaymentChart"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>أفضل الأصناف مبيعًا</h3></div><div class="v27-chart"><canvas id="v27TopProductsChart"></canvas></div></section>
        <section class="panel"><div class="panel-head"><h3>أقل الأصناف مبيعًا</h3></div><div class="list">${(d.low_products||[]).map(x=>`<div class="list-item"><span>${escapeHtml(x.name||'صنف')}</span><b>${number(x.qty)} · ${money(x.sales)}</b></div>`).join('')||'<div class="empty">لا توجد مبيعات في الفترة</div>'}</div></section>
      </div>
      <div class="v27-accounting-note"><b>الربح المحاسبي:</b> المبيعات بدون الضريبة − تكلفة المباع − المصروفات − التالف المعتمد. <b>مشتريات المخزون لا تُحسب خسارة مباشرة.</b></div>`;
    const daily=d.daily_sales||[],pay=d.payment_breakdown||[],top=d.top_products||[];
    drawChart('v27SalesChart','line',daily.map(x=>dateOnly(x.day)),daily.map(x=>Number(x.sales||0)),'المبيعات');
    drawChart('v27ProfitChart','line',daily.map(x=>dateOnly(x.day)),daily.map(x=>Number(x.profit||0)),'صافي الربح');
    drawChart('v27PurchasesChart','bar',daily.map(x=>dateOnly(x.day)),daily.map(x=>Number(x.purchases||0)),'المشتريات');
    drawChart('v27PaymentChart','doughnut',pay.map(x=>paymentLabel(x.method)),pay.map(x=>Number(x.amount||0)),'الدفع');
    drawChart('v27TopProductsChart','bar',top.map(x=>x.name||'صنف'),top.map(x=>Number(x.qty||0)),'الكمية المباعة');
    $('#v27DashRun').onclick=()=>{state.cache.v27DashFrom=$('#v27DashFrom').value;state.cache.v27DashTo=$('#v27DashTo').value;renderDashboard();};
    $('#v27DashToday').onclick=()=>{const t=isoDate(new Date());state.cache.v27DashFrom=t;state.cache.v27DashTo=t;renderDashboard();};
    $('#v27DashMonth').onclick=()=>{state.cache.v27DashFrom=firstOfMonth();state.cache.v27DashTo=isoDate(new Date());renderDashboard();};
  };

  // ---------------- كاميرا المنتج + الباركود والملصقات ----------------
  function generatedBarcode(){return `WA${Date.now().toString().slice(-10)}${Math.floor(Math.random()*90+10)}`;}
  async function compressImage(file){
    if(!file?.type?.startsWith('image/'))return file;
    const max=1800,quality=.84;
    let img,width,height,revoke='';
    try{img=await createImageBitmap(file);width=img.width;height=img.height;}catch{
      const url=URL.createObjectURL(file);revoke=url;img=await new Promise((res,rej)=>{const x=new Image();x.onload=()=>res(x);x.onerror=rej;x.src=url;});width=img.naturalWidth;height=img.naturalHeight;
    }
    const scale=Math.min(1,max/Math.max(width,height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',quality));if(revoke)URL.revokeObjectURL(revoke);try{img.close?.();}catch{}
    return blob?new File([blob],`${(file.name||'product').replace(/\.[^.]+$/,'')}-compressed.jpg`,{type:'image/jpeg',lastModified:Date.now()}):file;
  }
  const originalUploadProductImage=window.WardatBackend?.uploadProductImage?.bind(window.WardatBackend);
  if(originalUploadProductImage){
    window.WardatBackend.uploadProductImage=async(productId,file,options={})=>originalUploadProductImage(productId,await compressImage(file),options);
  }

  function printBarcode(product){
    if(!product?.barcode)return toast('أضف باركود للصنف أولًا','error');
    if(!window.JsBarcode)return toast('مكتبة طباعة الباركود غير متاحة','error');
    let count=Math.max(1,Math.min(100,Number(prompt('عدد ملصقات الباركود', '1'))||1));
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    try{JsBarcode(svg,product.barcode,{format:'CODE128',displayValue:true,fontSize:13,height:44,margin:5});}catch(e){return toast('تعذر إنشاء الباركود','error');}
    const markup=svg.outerHTML,labels=Array.from({length:count},()=>`<div class="label"><b>${escapeHtml(product.name_ar)}</b><span>${money(product.sale_price)}</span>${markup}</div>`).join('');
    const w=window.open('','_blank');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>باركود ${escapeHtml(product.name_ar)}</title><style>@page{margin:6mm}.sheet{display:flex;flex-wrap:wrap;gap:3mm}.label{width:48mm;min-height:27mm;border:1px dashed #bbb;padding:3mm;box-sizing:border-box;text-align:center;font-family:Arial}.label b,.label span{display:block}.label svg{max-width:100%;height:16mm}</style></head><body><div class="sheet">${labels}</div><script>onload=()=>print()<\/script></body></html>`);w.document.close();
  }
  const oldProductForm=productForm;
  productForm=function(p=null){
    oldProductForm(p);
    setTimeout(()=>{
      const form=$('#productFinanceForm');if(!form)return;
      const barcode=$('[name="barcode"]',form);if(barcode&&!$('#v27BarcodeActions',form)){
        const box=document.createElement('div');box.id='v27BarcodeActions';box.className='v27-inline-actions';
        box.innerHTML=`<button type="button" class="mini-btn" data-v27-generate>إنشاء باركود</button><button type="button" class="mini-btn" data-v27-scan-code>مسح بالكاميرا</button>`;
        barcode.closest('label').appendChild(box);
        $('[data-v27-generate]',box).onclick=()=>{barcode.value=generatedBarcode();barcode.dispatchEvent(new Event('input',{bubbles:true}));};
        $('[data-v27-scan-code]',box).onclick=()=>window.WardatScanner?.open({onDetected:async code=>{barcode.value=code;barcode.dispatchEvent(new Event('input',{bubbles:true}));window.WardatScanner.close();}});
      }
      const drop=$('#productImageDropzone',form),mainInput=$('#productImageFiles',form);if(drop&&mainInput&&!$('#v27CameraInput',form)){
        const camera=document.createElement('input');camera.type='file';camera.id='v27CameraInput';camera.accept='image/*';camera.setAttribute('capture','environment');camera.hidden=true;drop.after(camera);
        const btn=document.createElement('button');btn.type='button';btn.className='btn btn-outline v27-camera-btn';btn.textContent='📷 تصوير الصنف بالكاميرا';drop.after(btn);btn.onclick=()=>camera.click();
        camera.onchange=async()=>{const f=camera.files?.[0];if(!f)return;btn.disabled=true;btn.textContent='جاري ضغط الصورة...';try{const compact=await compressImage(f),dtf=new DataTransfer();dtf.items.add(compact);mainInput.files=dtf.files;mainInput.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){toast(e.message,'error');}finally{btn.disabled=false;btn.textContent='📷 تصوير الصنف بالكاميرا';camera.value='';}};
      }
    },30);
  };
  const oldRenderProductRows=renderProductRows;
  renderProductRows=function(items){oldRenderProductRows(items);setTimeout(()=>{items.forEach(p=>{const edit=$(`[data-record-edit="product"][data-id="${p.id}"]`);const cell=edit?.closest('td');if(cell&&!cell.querySelector(`[data-v27-barcode-print="${p.id}"]`)){const b=document.createElement('button');b.className='mini-btn';b.dataset.v27BarcodePrint=p.id;b.textContent='باركود';b.onclick=()=>printBarcode(p);cell.appendChild(b);}});},0);};


  // ---------------- الموردون والمشتريات V27 ----------------
  supplierForm=function(){
    if(!guard('suppliers.create'))return;
    openForm('إضافة مورد',`<form class="form-grid"><label>اسم المورد<input name="name" required></label><label>الجوال<input name="phone"></label><label>البريد<input type="email" name="email"></label><label>الرقم الضريبي<input name="tax_no"></label><label>تاريخ فتح الحساب<input type="date" name="account_opened_date" value="${isoDate(new Date())}"></label><label>الرصيد الافتتاحي<input type="number" step="0.01" min="0" name="opening_balance" value="0"></label><label>نوع المواد<input name="material_types"></label><label>التقييم<input type="number" min="0" max="5" step="0.5" name="rating" value="0"></label><label class="span-2">العنوان<input name="address"></label><label class="span-2">ملاحظات<textarea name="notes"></textarea></label><button class="btn btn-primary span-2">حفظ المورد</button></form>`,async b=>{b.opening_balance=Number(b.opening_balance)||0;b.rating=Number(b.rating)||0;await apiV27('/api/suppliers',{method:'POST',body:b});toast('تم حفظ المورد ورصيده الافتتاحي');await renderPurchases();});
  };
  purchaseOrderForm=function(){
    if(!guard('purchases.create')||!guard('purchases.approve')||!guard('purchases.view_financial'))return;
    const suppliers=state.cache.suppliers||[],products=state.cache.products||[],canPay=can('suppliers.pay');
    openForm('فاتورة شراء مخزون',`<form class="form-grid" id="poCreate"><label>المورد<select name="supplier_id" required><option value="">اختر المورد</option>${suppliers.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></label><label>رقم فاتورة المورد<input name="supplier_invoice_no"></label><label>تاريخ الفاتورة<input type="date" name="invoice_date" value="${isoDate(new Date())}"></label><label>تاريخ الاستحقاق<input type="date" name="due_date"></label><label>التوريد المتوقع<input type="date" name="expected_at"></label><label>طريقة احتساب السعر<select name="price_input_mode"><option value="exclusive">السعر قبل الضريبة</option><option value="inclusive">السعر شامل الضريبة</option><option value="exempt">معفى من الضريبة</option></select></label>${canPay?`<label>المدفوع الآن<input type="number" step="0.01" min="0" name="paid_amount" value="0"></label><label>طريقة الدفعة<select name="payment_method"><option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option></select></label><label>مرجع الدفعة<input name="transaction_ref"></label>`:''}<label class="span-2">ملاحظات<textarea name="notes"></textarea></label><div class="span-2"><div class="panel-head"><h3>الأصناف</h3><button type="button" class="mini-btn" id="addPOLine">إضافة صنف</button></div><div id="poLines"></div></div><button class="btn btn-primary span-2">اعتماد فاتورة الشراء</button></form>`,async b=>{b.idempotency_key=crypto.randomUUID();b.paid_amount=canPay?(Number(b.paid_amount)||0):0;b.items=$$('.po-line','#poCreate').map(l=>{const pid=$('[name=product_id]',l).value,p=products.find(x=>x.id===pid);return{product_id:pid,description:p?.name_ar,qty:Number($('[name=qty]',l).value)||0,unit_price:Number($('[name=unit_price]',l).value)||0,price_input_mode:b.price_input_mode};}).filter(x=>x.product_id&&x.qty>0);if(!b.items.length)throw new Error('أضف صنفًا واحدًا على الأقل');await apiV27('/api/purchase-orders',{method:'POST',body:b});toast('تم إنشاء فاتورة الشراء بضريبة الإعدادات');await renderPurchases();});
    setTimeout(()=>{const add=()=>{ $('#poLines').insertAdjacentHTML('beforeend',`<div class="po-line form-grid v27-po-line"><label>الصنف<select name="product_id"><option value="">اختر</option>${products.map(p=>`<option value="${p.id}">${escapeHtml(p.name_ar)} (${escapeHtml(p.sku||'')})</option>`).join('')}</select></label><label>الكمية<input type="number" min="0.001" step="0.001" name="qty" value="1"></label><label>تكلفة الوحدة<input type="number" min="0" step="0.01" name="unit_price" required></label><button type="button" class="mini-btn danger-lite v27-remove-po">حذف</button></div>`); const row=$$('.po-line','#poLines').at(-1); $('.v27-remove-po',row).onclick=()=>row.remove(); };$('#addPOLine').onclick=add;add();},0);
  };

  // ---------------- كاشير لمس + مسح باركود + دفع مختلط ----------------
  function paymentTotal(){return ['Cash','Mada','Transfer','Online'].reduce((s,k)=>s+(Number($(`#posPay${k}`)?.value)||0),0);}
  currentPosFinancials=function(){return window.WardatFinancial.document({lines:state.posCart.map(i=>({qty:i.qty,unitPrice:i.price,cost:i.cost,priceMode:$('#posPriceMode')?.value})),invoiceDiscountType:$('#posDiscountType')?.value,invoiceDiscountValue:$('#posDiscount')?.value,deliveryFee:$('#posDelivery')?.value,extrasTotal:$('#posExtras')?.value,paid:paymentTotal()});};
  function editPosLinePrice(idx){
    const line=state.posCart[idx];if(!line)return;if(!(can('cashier.change_price')||can('orders.edit_financial')))return toast('ليست لديك صلاحية تعديل السعر','error');
    openForm(`تعديل سعر — ${line.name}`,`<form class="form-grid single"><label>السعر<input name="price" type="number" min="0.01" step="0.01" value="${Number(line.price||0)}" required></label><button class="btn btn-primary">حفظ</button></form>`,async b=>{line.price=Number(b.price);renderPosCart();});
  }
  renderPosCart=function(){
    const el=$('#posCart');if(!el)return null;
    el.innerHTML=state.posCart.length?state.posCart.map((i,idx)=>`<div class="cart-line v27-cart-line"><div class="v27-cart-name"><b>${escapeHtml(i.name)}</b><small>${i.is_service?'خدمة':money(i.price)}</small><button class="mini-btn" data-v27-edit-price="${idx}">السعر</button></div><div class="qty-control"><button data-pdec="${idx}">−</button><span>${number(i.qty)}</span><button data-pinc="${idx}">+</button></div><b>${money(i.qty*i.price)}</b></div>`).join(''):'<div class="empty">امسح باركود أو اختر منتجًا</div>';
    const r=currentPosFinancials();window.WardatFinancial.paint($('#posTotals'),r,can('orders.view_financial'));
    const change=$('#posChange');if(change)change.textContent=money(Math.max(0,paymentTotal()-r.total));const due=$('#posDue');if(due)due.textContent=money(Math.max(0,r.total-paymentTotal()));
    $$('[data-pinc]').forEach(b=>b.onclick=()=>{const i=state.posCart[+b.dataset.pinc];if(!i.is_service&&i.qty>=i.available)return toast('الكمية غير متاحة','error');i.qty++;renderPosCart();});
    $$('[data-pdec]').forEach(b=>b.onclick=()=>{const i=state.posCart[+b.dataset.pdec];i.qty--;if(i.qty<=0)state.posCart.splice(+b.dataset.pdec,1);renderPosCart();});
    $$('[data-v27-edit-price]').forEach(b=>b.onclick=()=>editPosLinePrice(+b.dataset.v27EditPrice));return r;
  };
  async function addBarcodeToPos(code){
    let p=state.cache.products?.find(x=>String(x.barcode||'')===String(code));
    if(!p){const found=await apiV27(`/api/products/barcode/${encodeURIComponent(code)}`);p=found.item;if(p){state.cache.products.push(p);}}
    if(!p)throw new Error(`لا يوجد صنف بهذا الباركود: ${code}`);if(!isServiceProduct(p)&&Number(p.available_qty)<=0)throw new Error('الصنف نافد من المخزون');posAdd(p.id);toast(`تمت إضافة ${p.name_ar}`);
  }
  renderPOS=async function(){
    const [{items:products},{items:customers}]=await Promise.all([apiV27('/api/products?active=1&page_size=100'),apiV27('/api/customers?page_size=100')]);state.cache.products=products;state.cache.customers=customers;
    $('#content').innerHTML=`<div class="pos-layout v27-pos-layout"><section class="v27-pos-catalog"><div class="toolbar v27-pos-toolbar"><button class="btn btn-primary" id="posScanBarcode">▣ مسح باركود</button><input class="search" id="posSearch" placeholder="اسم / كود / باركود"><span class="kpi-pill">متاح ${products.filter(p=>isServiceProduct(p)||Number(p.available_qty)>0).length}</span></div><div id="posProducts" class="pos-products">${posProductCards(products)}</div></section>
      <aside class="panel cart-panel v27-pos-cart"><div class="panel-head"><div><h3>فاتورة كاشير</h3><small>${escapeHtml(state.user?.name||'')}</small></div><button class="mini-btn" id="clearPos">مسح السلة</button></div><div id="posCart"></div>
      <div class="form-grid single v27-pos-fields"><label>العميل<select id="posCustomer"><option value="">عميل نقدي سريع</option>${customers.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} · ${escapeHtml(c.phone||'')}</option>`).join('')}</select></label>
      <label>طريقة السعر<select id="posPriceMode"><option value="exclusive">غير شامل VAT</option><option value="inclusive">شامل VAT</option><option value="exempt">معفى</option></select></label>
      <div class="v27-two"><label>نوع الخصم<select id="posDiscountType"><option value="fixed">مبلغ</option><option value="percent">نسبة %</option></select></label><label>الخصم<input id="posDiscount" type="number" min="0" step="0.01" value="0"></label></div>
      <div class="v27-two"><label>التوصيل<input id="posDelivery" type="number" min="0" step="0.01" value="0"></label><label>إضافات<input id="posExtras" type="number" min="0" step="0.01" value="0"></label></div>
      <div class="v27-payments"><b>الدفع المختلط</b><label>كاش<input id="posPayCash" type="number" min="0" step="0.01" value="0"></label><label>شبكة<input id="posPayMada" type="number" min="0" step="0.01" value="0"></label><label>تحويل<input id="posPayTransfer" type="number" min="0" step="0.01" value="0"></label><label>إلكتروني<input id="posPayOnline" type="number" min="0" step="0.01" value="0"></label></div>
      <div class="v27-due-row"><span>المتبقي/الآجل <b id="posDue">0</b></span><span>الباقي للعميل <b id="posChange">0</b></span></div></div>
      ${financialSummaryMarkup('posTotals')}<button class="btn btn-primary wide v27-complete-sale" id="completeSale">إتمام البيع</button></aside></div>
      <nav class="v27-pos-bottom"><button id="posBottomScan">▣<span>مسح</span></button><button id="posBottomSearch">⌕<span>بحث</span></button><button id="posBottomCart">▤<span>السلة</span></button><button id="posBottomPay">﷼<span>الدفع</span></button></nav>`;
    renderPosCart();
    $('#posSearch').oninput=e=>$('#posProducts').innerHTML=posProductCards(products.filter(p=>`${p.name_ar} ${p.sku} ${p.barcode||''}`.toLowerCase().includes(e.target.value.toLowerCase())));
    $('#posProducts').onclick=e=>{const b=e.target.closest('[data-pos-add]');if(b)posAdd(b.dataset.posAdd);};$('#clearPos').onclick=()=>{state.posCart=[];renderPosCart();};
    ['posDiscount','posDiscountType','posDelivery','posExtras','posPriceMode','posPayCash','posPayMada','posPayTransfer','posPayOnline'].forEach(id=>$('#'+id)?.addEventListener('input',renderPosCart));
    const scan=()=>window.WardatScanner?.open({onDetected:addBarcodeToPos});$('#posScanBarcode').onclick=scan;$('#posBottomScan').onclick=scan;$('#posBottomSearch').onclick=()=>{$('#posSearch').focus();$('#posSearch').scrollIntoView({behavior:'smooth',block:'center'});};$('#posBottomCart').onclick=()=>$('#posCart').scrollIntoView({behavior:'smooth',block:'start'});$('#posBottomPay').onclick=()=>$('.v27-payments').scrollIntoView({behavior:'smooth',block:'center'});$('#completeSale').onclick=completeSale;
  };
  completeSale=async function(){
    if(!guard('pos.create_sale'))return;if(!state.posCart.length)return toast('أضف منتجًا واحدًا على الأقل','error');const r=renderPosCart();
    if(r.totalDiscount>0&&!(can('cashier.discount')||can('pos.apply_discount')))return toast('ليست لديك صلاحية الخصم','error');
    const paid=paymentTotal();if(paid>r.total+0.01)return toast('إجمالي الدفع أكبر من قيمة الفاتورة','error');if(paid<r.total&&!can('pos.partial_payment'))return toast('ليست لديك صلاحية البيع الآجل أو الجزئي','error');
    const customerId=$('#posCustomer').value,customer=state.cache.customers.find(c=>c.id===customerId),payments=[['cash','posPayCash'],['mada','posPayMada'],['bank_transfer','posPayTransfer'],['online','posPayOnline']].map(([method,id])=>({method,amount:Number($('#'+id).value)||0})).filter(x=>x.amount>0);
    const btn=$('#completeSale');btn.disabled=true;const key=crypto.randomUUID();
    try{const result=await apiV27('/api/orders',{method:'POST',body:{customer_id:customerId||null,customer_name:customer?.name||'عميل نقدي',phone:customer?.phone||'',items:state.posCart.map(i=>({product_id:i.product_id,qty:i.qty,unit_price:i.price,is_service:!!i.is_service,price_input_mode:$('#posPriceMode').value})),discount_type:$('#posDiscountType').value,discount_value:Number($('#posDiscount').value)||0,delivery_fee:Number($('#posDelivery').value)||0,extras_total:Number($('#posExtras').value)||0,price_input_mode:$('#posPriceMode').value,paid_amount:paid,payments,idempotency_key:key}});toast(`تمت عملية البيع: ${result.item.order_no}`);state.posCart=[];window.WardatScanner?.close();await renderPOS();await window.WardatDocuments.open('order',result.item.id);}catch(err){toast(err.message,'error');}finally{btn.disabled=false;}
  };

  // ---------------- دفعات الموردين ----------------
  shopPurchasePaymentForm=function(id,remaining){
    openForm('تسجيل دفعة مورد',`<form class="form-grid single"><div class="demo-note">المتبقي الحالي: <b>${money(remaining)}</b></div><label>المبلغ<input type="number" name="amount" min="0.01" max="${remaining}" step="0.01" required></label><label>طريقة السداد<select name="method"><option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option></select></label><label>مرجع العملية<input name="transaction_ref" placeholder="رقم التحويل/المرجع"></label><label>ملاحظات<input name="notes"></label><button class="btn btn-primary" type="submit">تسجيل الدفعة</button></form>`,async b=>{await apiV27('/api/shop-system/purchase-payment',{method:'POST',body:{purchase_order_id:id,...b,idempotency_key:crypto.randomUUID()}});toast('تم تسجيل دفعة المورد وتحديث الرصيد');await renderShopBooks({month:state.cache.shopMonth,tab:'purchases'});});
  };

  // ---------------- التالف ----------------
  async function damageForm(){
    const {items:products}=await apiV27('/api/products?active=1&page_size=100');
    openForm('تسجيل تالف',`<form class="form-grid" id="v27DamageForm"><label>التاريخ<input name="damage_date" type="date" value="${isoDate(new Date())}" required></label><label>الصنف<select name="product_id" id="v27DamageProduct" required><option value="">اختر الصنف</option>${products.filter(p=>!isServiceProduct(p)).map(p=>`<option value="${p.id}" data-barcode="${escapeHtml(p.barcode||'')}">${escapeHtml(p.name_ar)} · ${escapeHtml(p.sku)}</option>`).join('')}</select><button type="button" class="mini-btn" id="v27DamageScan">مسح باركود</button></label><label>الكمية التالفة<input name="qty" type="number" min="0.001" step="0.001" required></label><label>المسؤول<input name="responsible"></label><label class="span-2">سبب التلف<input name="reason" required></label><label class="span-2">ملاحظات<textarea name="notes"></textarea></label><label class="check-label span-2"><input type="checkbox" name="submit_for_approval" checked> إرسال للاعتماد مباشرة</label><button class="btn btn-primary span-2">حفظ التالف</button></form>`,async b=>{b.idempotency_key=crypto.randomUUID();await apiV27('/api/damage-records',{method:'POST',body:b});window.WardatScanner?.close();toast('تم تسجيل التالف دون خصم المخزون حتى الاعتماد');await renderDamageV27();});
    setTimeout(()=>{$('#v27DamageScan').onclick=()=>window.WardatScanner?.open({onDetected:async code=>{const p=products.find(x=>String(x.barcode||'')===String(code));if(!p)throw new Error('الباركود غير مربوط بصنف');$('#v27DamageProduct').value=p.id;window.WardatScanner.close();}});},0);
  }
  async function renderDamageV27(){
    const from=state.cache.damageFrom||firstOfMonth(),to=state.cache.damageTo||isoDate(new Date()),d=await apiV27(`/api/damage-records?from=${from}&to=${to}`),rows=d.items||[];
    $('#content').innerHTML=`<div class="toolbar"><div><button class="btn btn-primary" id="v27AddDamage">تسجيل تالف</button></div><div class="report-filters"><label>من<input id="v27DamageFrom" type="date" value="${from}"></label><label>إلى<input id="v27DamageTo" type="date" value="${to}"></label><button class="btn btn-outline" id="v27DamageFilter">عرض</button></div></div><div class="metrics">${metricHtml('عدد السجلات',number(rows.length))}${metricHtml('قيمة المعتمد',money(rows.filter(x=>x.status==='approved').reduce((s,x)=>s+Number(x.total_cost||0),0)))}${metricHtml('بانتظار الاعتماد',number(rows.filter(x=>x.status==='pending').length))}</div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>الحركة</th><th>التاريخ</th><th>الصنف</th><th>الكمية</th><th>التكلفة</th><th>القيمة</th><th>السبب</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${escapeHtml(x.damage_no)}</b></td><td>${dateOnly(x.damage_date)}</td><td>${escapeHtml(x.product_name)}<small>${escapeHtml(x.sku||'')}</small></td><td>${number(x.qty)}</td><td>${money(x.unit_cost)}</td><td>${money(x.total_cost)}</td><td>${escapeHtml(x.reason)}</td><td><span class="status ${x.status==='approved'?'green':x.status==='rejected'?'red':'amber'}">${statusText(x.status)}</span></td><td>${x.status==='pending'&&can('damage.approve')?`<button class="mini-btn" data-dmg-approve="${x.id}">اعتماد</button><button class="mini-btn danger-lite" data-dmg-reject="${x.id}">رفض</button>`:x.status==='draft'?`<button class="mini-btn" data-dmg-submit="${x.id}">إرسال للاعتماد</button>`:'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
    $('#v27AddDamage').onclick=damageForm;$('#v27DamageFilter').onclick=()=>{state.cache.damageFrom=$('#v27DamageFrom').value;state.cache.damageTo=$('#v27DamageTo').value;renderDamageV27();};
    $$('[data-dmg-approve]').forEach(b=>b.onclick=async()=>{if(!confirm('اعتماد التالف وخصمه من المخزون؟'))return;await apiV27(`/api/damage-records/${b.dataset.dmgApprove}/status`,{method:'POST',body:{status:'approved',reason:'اعتماد التالف'}});toast('تم اعتماد التالف وخصم المخزون مرة واحدة');renderDamageV27();});
    $$('[data-dmg-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('سبب الرفض','');if(reason===null)return;await apiV27(`/api/damage-records/${b.dataset.dmgReject}/status`,{method:'POST',body:{status:'rejected',reason}});renderDamageV27();});
    $$('[data-dmg-submit]').forEach(b=>b.onclick=async()=>{await apiV27(`/api/damage-records/${b.dataset.dmgSubmit}/status`,{method:'POST',body:{status:'pending'}});renderDamageV27();});
  }

  // ---------------- الجرد ----------------
  async function openStocktake(id){
    const d=await apiV27(`/api/stocktakes/${id}`),s=d.session,items=d.items||[];state.cache.activeStocktake=d;
    $('#content').innerHTML=`<div class="toolbar"><div><button class="btn btn-outline" id="v27BackStocktakes">← جلسات الجرد</button> <button class="btn btn-primary" id="v27StockScan" ${s.status!=='draft'?'disabled':''}>▣ جرد بالكاميرا</button></div><div><b>${escapeHtml(s.stocktake_no)}</b> · ${statusText(s.status)}</div></div><div class="metrics">${metricHtml('عدد الأصناف',number(items.length))}${metricHtml('تم عدها',number(items.filter(x=>x.actual_qty!==null).length))}${metricHtml('فروق سالبة',number(items.filter(x=>Number(x.difference)<0).length))}${metricHtml('قيمة الفروق',money(items.reduce((a,x)=>a+Number(x.difference_value||0),0)))}</div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>الصنف</th><th>باركود</th><th>كمية النظام</th><th>الكمية الفعلية</th><th>الفرق</th><th>قيمة الفرق</th><th>ملاحظات</th></tr></thead><tbody>${items.map(x=>`<tr data-stock-row="${x.product_id}"><td><b>${escapeHtml(x.product_name)}</b><small>${escapeHtml(x.sku||'')}</small></td><td>${escapeHtml(x.barcode||'—')}</td><td>${number(x.system_qty)}</td><td>${s.status==='draft'?`<input class="v27-count-input" data-stock-count="${x.product_id}" type="number" min="0" step="0.001" value="${x.actual_qty===null?'':Number(x.actual_qty)}" placeholder="الفعلي">`:number(x.actual_qty)}</td><td data-stock-diff>${number(x.difference)}</td><td data-stock-value>${money(x.difference_value)}</td><td><input data-stock-note="${x.product_id}" value="${escapeHtml(x.notes||'')}" ${s.status!=='draft'?'disabled':''}></td></tr>`).join('')}</tbody></table></div>${s.status==='draft'?`<div class="v27-stocktake-actions"><button class="btn btn-primary" id="v27ApproveStocktake" ${can('stocktake.approve')?'':'disabled'}>اعتماد الجرد وإنشاء التسويات</button></div>`:''}</section>`;
    $('#v27BackStocktakes').onclick=renderStocktakesV27;
    async function applyCount(productId,actualQty=null,delta=null){const result=await apiV27(`/api/stocktakes/${id}/count`,{method:'POST',body:{product_id:productId,actual_qty:actualQty,delta,notes:$(`[data-stock-note="${productId}"]`)?.value||null}});const row=$(`[data-stock-row="${productId}"]`),item=result.item;if(row){$('[data-stock-count]',row).value=Number(item.actual_qty);$('[data-stock-diff]',row).textContent=number(item.difference);$('[data-stock-value]',row).textContent=money(item.difference_value);}return item;}
    $$('[data-stock-count]').forEach(input=>input.onchange=async()=>{try{await applyCount(input.dataset.stockCount,Number(input.value)||0,null);}catch(e){toast(e.message,'error');}});
    $('#v27StockScan')?.addEventListener('click',()=>window.WardatScanner?.open({onDetected:async code=>{const item=items.find(x=>String(x.barcode||'')===String(code));if(!item)throw new Error(`الباركود ${code} غير موجود في الجرد`);await applyCount(item.product_id,null,1);toast(`${item.product_name}: +1`);}}));
    $('#v27ApproveStocktake')?.addEventListener('click',async()=>{if(!confirm('سيتم تعديل المخزون حسب الكميات الفعلية. هل تعتمد الجرد؟'))return;try{await apiV27(`/api/stocktakes/${id}/approve`,{method:'POST',body:{reason:'اعتماد الجرد الفعلي'}});window.WardatScanner?.close();toast('تم اعتماد الجرد وإنشاء حركات التسوية');await openStocktake(id);}catch(e){toast(e.message,'error');}});
  }
  async function renderStocktakesV27(){
    const d=await apiV27('/api/stocktakes'),rows=d.items||[];
    $('#content').innerHTML=`<div class="toolbar"><button class="btn btn-primary" id="v27NewStocktake">بدء جلسة جرد</button><span class="kpi-pill">الجرد لا يغيّر المخزون قبل الاعتماد</span></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>الجلسة</th><th>التاريخ</th><th>الحالة</th><th>الأصناف</th><th>تم عدها</th><th>قيمة الفروق</th><th>إجراء</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${escapeHtml(x.stocktake_no)}</b></td><td>${dateOnly(x.stocktake_date)}</td><td>${statusText(x.status)}</td><td>${number(x.item_count)}</td><td>${number(x.counted_count)}</td><td>${money(x.variance_value)}</td><td><button class="mini-btn" data-open-stocktake="${x.id}">فتح</button></td></tr>`).join('')}</tbody></table></div></section>`;
    $('#v27NewStocktake').onclick=()=>openForm('بدء جلسة جرد',`<form class="form-grid single"><label>تاريخ الجرد<input type="date" name="stocktake_date" value="${isoDate(new Date())}" required></label><label>ملاحظات<textarea name="notes"></textarea></label><div class="demo-note">سيحفظ النظام كمية كل صنف الحالية كلقطة افتتاحية لهذه الجلسة.</div><button class="btn btn-primary">بدء الجرد</button></form>`,async b=>{b.idempotency_key=crypto.randomUUID();const r=await apiV27('/api/stocktakes',{method:'POST',body:b});toast('تم فتح جلسة الجرد');await openStocktake(r.item.id);});
    $$('[data-open-stocktake]').forEach(b=>b.onclick=()=>openStocktake(b.dataset.openStocktake));
  }


  // ---------------- المرتجعات ----------------
  async function salesReturnForm(){
    const data=await apiV27('/api/orders?page=1&page_size=100'),orders=(data.items||[]).filter(o=>o.status!=='cancelled');
    if(!orders.length)return toast('لا توجد فواتير مبيعات متاحة','error');
    openForm('مرتجع مبيعات',`<form class="form-grid" id="v27SalesReturn"><label class="span-2">الفاتورة الأصلية<select name="order_id" id="v27ReturnOrder" required><option value="">اختر الفاتورة</option>${orders.map(o=>`<option value="${o.id}">${escapeHtml(o.order_no)} — ${escapeHtml(o.customer_name||'عميل')} — ${money(o.total)}</option>`).join('')}</select></label><label>طريقة رد المبلغ<select name="refund_method"><option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option></select></label><label>ملاحظات<input name="notes"></label><div class="span-2" id="v27SalesReturnItems"><div class="demo-note">اختر الفاتورة لعرض أصنافها.</div></div><button class="btn btn-primary span-2">اعتماد مرتجع المبيعات</button></form>`,async b=>{b.idempotency_key=crypto.randomUUID();b.items=$$('[data-sret-item]','#v27SalesReturn').map(x=>({order_item_id:x.dataset.sretItem,qty:Number(x.value)||0})).filter(x=>x.qty>0);if(!b.items.length)throw new Error('أدخل كمية مرتجع لصنف واحد على الأقل');await apiV27('/api/sales-returns',{method:'POST',body:b});toast('تم المرتجع وإعادة الكمية وعكس VAT/التكلفة');await renderReturnsV27();});
    setTimeout(()=>{$('#v27ReturnOrder').onchange=async e=>{const d=await apiV27(`/api/orders/${e.target.value}/details`),box=$('#v27SalesReturnItems');box.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>الصنف</th><th>المباع</th><th>سعر الوحدة</th><th>كمية المرتجع</th></tr></thead><tbody>${(d.items||[]).map(x=>`<tr><td>${escapeHtml(x.description)}</td><td>${number(x.qty)}</td><td>${money(x.unit_price)}</td><td><input data-sret-item="${x.id}" type="number" min="0" max="${Number(x.qty)}" step="0.001" value="0"></td></tr>`).join('')}</tbody></table></div>`;};},0);
  }
  async function purchaseReturnForm(){
    const data=await apiV27('/api/purchase-orders'),orders=(data.items||[]).filter(o=>o.receiving_status==='received');
    if(!orders.length)return toast('لا توجد مشتريات مستلمة متاحة للمرتجع','error');
    openForm('مرتجع مشتريات',`<form class="form-grid" id="v27PurchaseReturn"><label class="span-2">فاتورة الشراء الأصلية<select name="purchase_order_id" id="v27ReturnPO" required><option value="">اختر الفاتورة</option>${orders.map(o=>`<option value="${o.id}">${escapeHtml(o.po_no)} — ${escapeHtml(o.supplier_name||'')} — ${money(o.total)}</option>`).join('')}</select></label><label class="span-2">ملاحظات<textarea name="notes"></textarea></label><div class="span-2" id="v27PurchaseReturnItems"><div class="demo-note">اختر فاتورة الشراء لعرض الأصناف المستلمة.</div></div><button class="btn btn-primary span-2">اعتماد مرتجع المشتريات</button></form>`,async b=>{b.idempotency_key=crypto.randomUUID();b.items=$$('[data-pret-item]','#v27PurchaseReturn').map(x=>({purchase_order_item_id:x.dataset.pretItem,qty:Number(x.value)||0})).filter(x=>x.qty>0);if(!b.items.length)throw new Error('أدخل كمية مرتجع لصنف واحد على الأقل');await apiV27('/api/purchase-returns',{method:'POST',body:b});toast('تم مرتجع الشراء وتحديث المخزون وحساب المورد وVAT');await renderReturnsV27();});
    setTimeout(()=>{$('#v27ReturnPO').onchange=async e=>{const d=await apiV27(`/api/purchase-orders/${e.target.value}/details`),box=$('#v27PurchaseReturnItems');box.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>الصنف</th><th>المستلم</th><th>التكلفة</th><th>كمية المرتجع</th></tr></thead><tbody>${(d.items||[]).map(x=>`<tr><td>${escapeHtml(x.description)}</td><td>${number(x.received_qty)}</td><td>${money(x.unit_price)}</td><td><input data-pret-item="${x.id}" type="number" min="0" max="${Number(x.received_qty)}" step="0.001" value="0"></td></tr>`).join('')}</tbody></table></div>`;};},0);
  }
  async function renderReturnsV27(){
    const [s,p]=await Promise.all([apiV27('/api/sales-returns'),apiV27('/api/purchase-returns')]);
    $('#content').innerHTML=`<div class="toolbar"><div><button class="btn btn-primary" id="v27NewSalesReturn">مرتجع مبيعات</button> <button class="btn btn-outline" id="v27NewPurchaseReturn">مرتجع مشتريات</button></div><span class="kpi-pill">كل مرتجع مرتبط بالمستند الأصلي</span></div><div class="grid-2"><section class="panel"><div class="panel-head"><h3>مرتجعات المبيعات</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>الرقم</th><th>قبل VAT</th><th>VAT</th><th>الإجمالي</th><th>طريقة الرد</th><th>التاريخ</th></tr></thead><tbody>${(s.items||[]).map(x=>`<tr><td>${escapeHtml(x.return_no)}</td><td>${money(x.subtotal)}</td><td>${money(x.vat)}</td><td><b>${money(x.total)}</b></td><td>${paymentLabel(x.refund_method)}</td><td>${dt(x.created_at)}</td></tr>`).join('')}</tbody></table></div></section><section class="panel"><div class="panel-head"><h3>مرتجعات المشتريات</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>الرقم</th><th>قبل VAT</th><th>VAT</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>${(p.items||[]).map(x=>`<tr><td>${escapeHtml(x.return_no)}</td><td>${money(x.subtotal)}</td><td>${money(x.vat)}</td><td><b>${money(x.total)}</b></td><td>${dt(x.created_at)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
    $('#v27NewSalesReturn').onclick=salesReturnForm;$('#v27NewPurchaseReturn').onclick=purchaseReturnForm;
  }

  // ---------------- VAT ----------------
  async function renderVatV27(){
    const now=new Date(),year=Number(state.cache.vatYear||now.getFullYear()),quarter=Number(state.cache.vatQuarter||Math.floor(now.getMonth()/3)+1),d=await apiV27(`/api/vat-report?year=${year}&quarter=${quarter}`);
    const rows=[{البند:'إجمالي المبيعات بدون الضريبة',القيمة:d.sales_without_vat},{البند:'ضريبة المبيعات',القيمة:d.output_vat},{البند:'إجمالي المشتريات بدون الضريبة',القيمة:d.purchases_without_vat},{البند:'ضريبة المشتريات القابلة للخصم',القيمة:d.input_vat},{البند:'صافي الضريبة المستحقة',القيمة:d.net_vat_due}];state.cache.vatRows=rows;
    $('#content').innerHTML=`<section class="panel"><div class="report-filters"><label>السنة<input id="v27VatYear" type="number" min="2020" max="2100" value="${year}"></label><label>الربع<select id="v27VatQuarter">${[1,2,3,4].map(q=>`<option value="${q}" ${q===quarter?'selected':''}>Q${q}</option>`).join('')}</select></label><button class="btn btn-primary" id="v27VatRun">عرض</button><button class="btn btn-outline" id="v27VatExport">تصدير Excel</button><button class="btn btn-outline" id="v27VatPrint">طباعة / PDF</button></div></section><div class="metrics">${metricHtml('المبيعات بدون VAT',money(d.sales_without_vat))}${metricHtml('VAT المبيعات',money(d.output_vat))}${metricHtml('المشتريات بدون VAT',money(d.purchases_without_vat))}${metricHtml('VAT المشتريات',money(d.input_vat))}${metricHtml('صافي المستحق',money(d.net_vat_due))}</div><section class="panel"><div class="panel-head"><h3>تقرير Q${quarter} — ${year}</h3><small>${dateOnly(d.from)} إلى ${dateOnly(d.to)} · النسبة ${(Number(d.vat_rate||0)*100).toFixed(2)}%</small></div><div class="table-wrap"><table class="data-table"><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.البند}</td><td><b>${money(x.القيمة)}</b></td></tr>`).join('')}</tbody></table></div></section>`;
    $('#v27VatRun').onclick=()=>{state.cache.vatYear=$('#v27VatYear').value;state.cache.vatQuarter=$('#v27VatQuarter').value;renderVatV27();};$('#v27VatExport').onclick=()=>{if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,`VAT Q${quarter}`);XLSX.writeFile(wb,`VAT-Q${quarter}-${year}.xlsx`);}else downloadCsv(rows,`VAT-Q${quarter}-${year}.csv`);};$('#v27VatPrint').onclick=()=>window.WardatDocuments.open('report',null,{document:{type:'report',title:`تقرير ضريبة القيمة المضافة Q${quarter} — ${year}`,header:{document_no:`VAT-${year}-Q${quarter}`,created_at:new Date().toISOString()},items:rows,generic:true,show_totals:false}});
  }


  // توحيد شاشة «نظام المحل» القديمة مع محاسبة V27
  const oldRenderShopTabV27=renderShopTab;
  renderShopTab=function(tab,d){
    if(!d?.v27_accounting)return oldRenderShopTabV27(tab,d);
    const area=$('#shopTabArea');if(!area)return oldRenderShopTabV27(tab,d);
    if(tab==='dashboard'){
      const m=d.dashboard||{};state.cache.shopCurrentRows=[{المؤشر:'المبيعات بدون VAT',القيمة:m.sales_total},{المؤشر:'تكلفة المباع',القيمة:m.cost_of_goods},{المؤشر:'مجمل الربح',القيمة:m.gross_profit},{المؤشر:'المصروفات',القيمة:m.expenses_total},{المؤشر:'التالف المعتمد',القيمة:m.damage_total},{المؤشر:'صافي الربح الحقيقي',القيمة:m.net_profit},{المؤشر:'قيمة المخزون',القيمة:m.inventory_value},{المؤشر:'VAT المستحق',القيمة:m.vat_due}];
      area.innerHTML=`<div class="metrics">${shopMetric('المبيعات بدون VAT',money(m.sales_total))}${shopMetric('تكلفة المباع',money(m.cost_of_goods))}${shopMetric('مجمل الربح',money(m.gross_profit))}${shopMetric('المصروفات',money(m.expenses_total))}${shopMetric('التالف المعتمد',money(m.damage_total))}${shopMetric('صافي الربح الحقيقي',money(m.net_profit))}${shopMetric('قيمة المخزون',money(m.inventory_value))}${shopMetric('VAT المستحق',money(m.vat_due))}</div><div class="v27-accounting-note"><b>المعادلة:</b> المبيعات بدون VAT − تكلفة البضاعة المباعة − المصروفات − التالف المعتمد. المشتريات لا تُخصم من الربح عند شرائها.</div>`;return;
    }
    if(tab==='daily'){
      const z=d.daily_summary||{},rows=d.daily_sales||[];state.cache.shopCurrentRows=rows;
      area.innerHTML=`<div class="metrics">${shopMetric('مبيعات بدون VAT',money(z.sales_total))}${shopMetric('تكلفة المباع',money(z.cogs_total))}${shopMetric('مجمل الربح',money(z.gross_profit))}${shopMetric('المصروفات',money(z.expenses_total))}${shopMetric('التالف',money(z.damage_total))}${shopMetric('الربح المحاسبي',money(z.accounting_profit))}${shopMetric('المدفوع للموردين',money(z.purchase_paid_total))}${shopMetric('الحركة النقدية',money(z.cash_flow))}</div><section class="panel"><div class="panel-head"><h3>المبيعات اليومية — ربح ومُتحصلات منفصلة</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>اليوم</th><th>التاريخ</th><th>شبكة</th><th>كاش</th><th>تحويل</th><th>آجل</th><th>مبيعات بدون VAT</th><th>تكلفة المباع</th><th>مصروفات</th><th>تالف</th><th>ربح محاسبي</th><th>مشتريات</th><th>مدفوع للموردين</th><th>مرتجعات نقدية</th><th>حركة نقدية</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHtml(x.day_name)}</td><td>${dateOnly(x.date)}</td><td>${money(x.network)}</td><td>${money(x.cash)}</td><td>${money(x.transfer)}</td><td>${money(x.credit)}</td><td>${money(x.sales_without_vat)}</td><td>${money(x.cogs)}</td><td>${money(x.expenses)}</td><td>${money(x.damage)}</td><td><b>${money(x.accounting_profit)}</b></td><td>${money(x.purchases)}</td><td>${money(x.purchase_paid)}</td><td>${money(x.refunds)}</td><td><b>${money(x.cash_flow)}</b></td></tr>`).join('')}</tbody></table></div></section><div class="v27-accounting-note">شراء المخزون يظهر في <b>الحركة النقدية</b> عند الدفع للمورد، ولا يُخفض الربح إلا عندما يُباع الصنف وتتحول تكلفته إلى تكلفة بضاعة مباعة.</div>`;return;
    }
    return oldRenderShopTabV27(tab,d);
  };


  // ---------------- المصروفات مع تصوير الإيصال ----------------
  shopExpenseForm=function(){
    openForm('إضافة مصروف أو نثرية',`<form class="form-grid">
      <label>التاريخ<input type="date" name="expense_date" value="${isoDate(new Date())}" required></label>
      <label>نوع المصروف<select name="category"><option>إيجار</option><option>رواتب</option><option>كهرباء</option><option>مياه</option><option>توصيل</option><option>نثريات</option><option>صيانة</option><option>تسويق</option><option>أخرى</option></select></label>
      <label class="span-2">البيان<input name="description" required></label>
      <label>طريقة الدفع<select name="payment_method"><option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option></select></label>
      <label>المبلغ<input type="number" min="0.01" step="0.01" name="amount" required></label>
      <label class="span-2">صورة الفاتورة/الإيصال<input id="v27ExpenseReceipt" type="file" accept="image/*" capture="environment"><small>يمكن التصوير مباشرة من الجوال أو اختيار صورة من الألبوم.</small></label>
      <label class="span-2">ملاحظات<textarea name="notes"></textarea></label>
      <button class="btn btn-primary span-2" type="submit">حفظ المصروف</button>
    </form>`,async b=>{
      const receipt=$('#v27ExpenseReceipt')?.files?.[0]||null;
      const result=await apiV27('/api/shop-system/expenses',{method:'POST',body:b});
      const expenseId=result?.item?.id||result?.id;
      if(receipt&&expenseId&&window.WardatBackend?.uploadExpenseReceipt){
        const compact=await compressImage(receipt);await window.WardatBackend.uploadExpenseReceipt(expenseId,compact);
      }
      toast(receipt?'تم تسجيل المصروف وإرفاق الإيصال':'تم تسجيل المصروف');await renderShopBooks({month:state.cache.shopMonth,tab:'expenses'});
    });
  };

  // ---------------- استيراد Excel الآمن ----------------
  const EXCEL_IMPORT_TYPES={
    products:{label:'الأصناف والرصيد الافتتاحي',required:['name_ar'],key:['sku','barcode'],aliases:{sku:['كود الصنف','الكود','sku'],barcode:['الباركود','باركود'],name_ar:['اسم الصنف','الصنف','الاسم'],category_name:['التصنيف','الفئة'],unit:['الوحدة'],min_stock:['حد الطلب','حد إعادة الطلب'],stock_qty:['الكمية الافتتاحية','الرصيد الافتتاحي','الكمية'],purchase_price:['تكلفة الشراء الافتتاحية','سعر الشراء','تكلفة الشراء'],sale_price:['سعر البيع الافتراضي','سعر البيع'],notes:['ملاحظات','الملاحظات']}},
    suppliers:{label:'الموردون',required:['name'],key:['supplier_no'],aliases:{supplier_no:['كود المورد','رقم المورد'],name:['اسم الشركة','اسم المورد','المورد'],account_opened_date:['تاريخ فتح الحساب'],opening_balance:['الرصيد الافتتاحي'],phone:['الجوال','رقم الجوال'],tax_no:['الرقم الضريبي'],notes:['ملاحظات','الملاحظات']}},
    supplier_invoices:{label:'فواتير الموردين التاريخية',required:['supplier_no','total'],key:['supplier_no','invoice_no'],aliases:{invoice_no:['رقم الفاتورة','فاتورة المورد'],invoice_date:['التاريخ','تاريخ الفاتورة'],supplier_no:['كود المورد'],supplier_name:['اسم المورد','اسم الشركة'],total:['قيمة الفاتورة','الإجمالي','اجمالي الفاتورة'],due_date:['تاريخ الاستحقاق'],paid_amount:['المسدد','المدفوع'],remaining:['المتبقي'],payment_status:['حالة السداد'],notes:['ملاحظات','الملاحظات']}},
    supplier_payments:{label:'دفعات الموردين',required:['supplier_no','amount'],key:['payment_no'],aliases:{payment_no:['رقم السداد','رقم الدفع'],paid_at:['التاريخ','تاريخ السداد'],supplier_no:['كود المورد'],supplier_name:['اسم المورد'],invoice_no:['رقم الفاتورة'],amount:['المبلغ المسدد','المبلغ','المسدد'],method:['طريقة السداد','طريقة الدفع'],transaction_ref:['مرجع العملية','المرجع'],notes:['ملاحظات','الملاحظات']}},
    bookings:{label:'الحجوزات',required:['customer_name','amount'],key:['booking_no'],aliases:{booking_no:['رقم الحجز'],booking_date:['تاريخ الحجز'],event_date:['تاريخ المناسبة','تاريخ التسليم'],customer_name:['اسم العميل','العميل'],phone:['رقم الجوال','الجوال'],details:['تفاصيل الحجز','التفاصيل'],amount:['المبلغ','قيمة الحجز'],paid_amount:['المبلغ المدفوع','المدفوع'],remaining:['المبلغ المتبقي','المتبقي'],payment_method:['طريقة الدفع'],notes:['ملاحظات','الملاحظات'],paid_flag:['تم السداد']}},
    custodies:{label:'العهد',required:['holder_name','custody_amount'],key:[],aliases:{holder_name:['الاسم','الموظف','صاحب العهدة'],custody_date:['التاريخ'],custody_amount:['العهدة','قيمة العهدة'],invoices_amount:['قيمة الفواتير','الفواتير'],remaining:['المتبقي'],notes:['ملاحظات','الملاحظات'],settlement_status:['حالة التصفية']}},
    deliveries:{label:'توصيل المندوبين',required:['driver_name'],key:[],aliases:{driver_name:['اسم المندوب','المندوب'],delivery_date:['التاريخ'],trips_count:['كم مشوار','عدد المشاوير','المشاوير'],amount:['المبلغ','المبلغ الإجمالي'],reference:['رقم الحجز','رقم الفاتورة'],notes:['ملاحظات','الملاحظات']}},
    employees:{label:'الموظفون والرواتب الأساسية',required:['name'],key:['employee_no'],aliases:{name:['العامل','اسم الموظف','الموظف','الاسم'],employee_no:['الرقم الوظيفي','كود الموظف'],hire_date:['متى بدأ','تاريخ البداية','تاريخ بدء العمل'],end_date:['متى انتهى','تاريخ الانتهاء'],salary:['الراتب الأساسي','الراتب'],job_title:['الوظيفة','المسمى الوظيفي'],notes:['ملاحظات','الملاحظات']}},
    expenses:{label:'المصروفات والنثريات',required:['amount'],key:[],aliases:{expense_date:['التاريخ'],category:['نوع المصروف','التصنيف'],description:['البيان','الوصف'],payment_method:['طريقة الدفع','طريقة السداد'],amount:['المبلغ','القيمة'],notes:['ملاحظات','الملاحظات']}},
    historical_sales:{label:'المبيعات اليومية التاريخية المجمعة',required:['sale_date'],key:['sale_date'],aliases:{day_name:['اليوم'],sale_date:['التاريخ'],network:['شبكة','مدى'],cash:['كاش','نقد'],bank_transfer:['تحويل','تحويل بنكي'],purchases:['مشتريات'],expenses:['نثريات','مصروفات'],net_cash:['صافي الحركة','المجموع','صافي']}}
  };
  const headerNorm=v=>String(v??'').trim().toLowerCase().replace(/[\s_\-–—:：.،,\/\\()]+/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
  const numericV=v=>{if(v===null||v===undefined||v==='')return 0;const n=Number(String(v).replace(/[,٬]/g,''));return Number.isFinite(n)?n:0;};
  const excelDateV=v=>{
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&v>20000&&v<90000&&window.XLSX?.SSF?.parse_date_code){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=String(v??'').trim();if(!s)return '';
    const m=s.match(/^(\d{1,4})[\-\/.](\d{1,2})[\-\/.](\d{1,4})$/);if(m){let a=+m[1],b=+m[2],c=+m[3];if(a>1900)return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;if(c>1900)return `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;}
    const d=new Date(s);return Number.isNaN(d.getTime())?'':isoDate(d);
  };
  const payMethodV=v=>{const n=headerNorm(v);if(!n)return 'cash';if(n.includes('شبكه')||n.includes('مدي')||n.includes('بطاق'))return 'mada';if(n.includes('تحويل')||n.includes('بنك'))return 'bank_transfer';if(n.includes('اجل')||n.includes('دين'))return 'credit';if(n.includes('اونلاين')||n.includes('الكترون'))return 'online';return 'cash';};
  function detectExcelHeader(rows,cfg){
    let best={i:-1,score:0,map:{}};const aliases={};Object.entries(cfg.aliases).forEach(([k,a])=>a.forEach(x=>aliases[headerNorm(x)]=k));
    rows.slice(0,30).forEach((r,i)=>{const map={};let score=0;(r||[]).forEach((x,j)=>{const k=aliases[headerNorm(x)];if(k&&!Object.values(map).includes(j)){map[k]=j;score++;}});if(score>best.score)best={i,score,map};});
    return best;
  }
  function mappedExcelRows(raw,cfg,sourceName){
    const h=detectExcelHeader(raw,cfg);if(h.i<0||h.score<Math.max(2,Math.min(3,Object.keys(cfg.aliases).length)))throw new Error('لم أتعرف على صف العناوين. تأكد من اختيار نوع الملف الصحيح.');
    const items=[];raw.slice(h.i+1).forEach((r,idx)=>{if(!r||!r.some(v=>String(v??'').trim()))return;const o={_source_row:h.i+idx+2,_source_name:sourceName};Object.entries(h.map).forEach(([k,j])=>o[k]=r[j]);if(Object.values(o).some(v=>String(v??'').trim()))items.push(o);});return {items,headerRow:h.i+1,mapping:h.map};
  }
  function normalizeImportRow(type,r){
    const x={...r};
    const dates=['account_opened_date','invoice_date','due_date','paid_at','booking_date','event_date','custody_date','delivery_date','hire_date','end_date','expense_date','sale_date'];dates.forEach(k=>{if(k in x)x[k]=excelDateV(x[k]);});
    ['opening_balance','min_stock','stock_qty','purchase_price','sale_price','total','paid_amount','remaining','amount','custody_amount','invoices_amount','trips_count','salary','network','cash','bank_transfer','purchases','expenses','net_cash'].forEach(k=>{if(k in x)x[k]=numericV(x[k]);});
    if(x.method!==undefined)x.method=payMethodV(x.method);if(x.payment_method!==undefined)x.payment_method=payMethodV(x.payment_method);
    if(type==='products'){x.average_cost=x.purchase_price;x.sku=String(x.sku??'').trim();x.barcode=String(x.barcode??'').trim();x.name_ar=String(x.name_ar??'').trim();x.unit=String(x.unit??'حبة').trim()||'حبة';}
    if(type==='suppliers'){x.supplier_no=String(x.supplier_no??'').trim();x.name=String(x.name??'').trim();}
    if(type==='bookings'){x.customer_name=String(x.customer_name??'').trim();x.phone=String(x.phone??'').trim()||'غير متوفر';x.amount=numericV(x.amount);x.paid_amount=Math.min(x.amount,numericV(x.paid_amount));}
    return x;
  }
  function importRowKey(type,r){const cfg=EXCEL_IMPORT_TYPES[type];const vals=(cfg.key||[]).map(k=>String(r[k]??'').trim()).filter(Boolean);return vals.length?`${type}:${vals.join('|')}`:'';}
  function validateImportRow(type,r){const cfg=EXCEL_IMPORT_TYPES[type],missing=(cfg.required||[]).filter(k=>r[k]===undefined||r[k]===null||String(r[k]).trim()===''||(k==='amount'&&numericV(r[k])<=0)||(k==='total'&&numericV(r[k])<=0));return missing.length?`حقول ناقصة: ${missing.join('، ')}`:'';}
  async function postImportRowV27(type,r,ctx){
    if(type==='products'){
      let category_id=null;if(r.category_name){const n=headerNorm(r.category_name);category_id=ctx.categories.find(c=>headerNorm(c.name_ar)===n)?.id||null;}
      return apiV27('/api/products',{method:'POST',body:{sku:r.sku||undefined,barcode:r.barcode||undefined,name_ar:r.name_ar,category_id,unit:r.unit||'حبة',min_stock:numericV(r.min_stock),stock_qty:numericV(r.stock_qty),purchase_price:numericV(r.purchase_price),average_cost:numericV(r.purchase_price),sale_price:numericV(r.sale_price),description:String(r.notes??'')}});
    }
    if(type==='suppliers')return apiV27('/api/suppliers',{method:'POST',body:{supplier_no:r.supplier_no||undefined,name:r.name,phone:String(r.phone??''),tax_no:String(r.tax_no??''),account_opened_date:r.account_opened_date||undefined,opening_balance:numericV(r.opening_balance),notes:String(r.notes??'')}});
    if(type==='supplier_invoices')return apiV27('/api/excel-import/supplier-invoice',{method:'POST',body:{invoice_no:String(r.invoice_no??''),invoice_date:r.invoice_date||undefined,supplier_no:String(r.supplier_no??''),total:numericV(r.total),due_date:r.due_date||undefined,paid_amount:ctx.useInvoicePaid?numericV(r.paid_amount):0,notes:String(r.notes??'')}});
    if(type==='supplier_payments')return apiV27('/api/excel-import/supplier-payment',{method:'POST',body:{payment_no:String(r.payment_no??''),paid_at:r.paid_at?`${r.paid_at}T12:00:00+03:00`:undefined,supplier_no:String(r.supplier_no??''),invoice_no:String(r.invoice_no??''),amount:numericV(r.amount),method:r.method||'cash',transaction_ref:String(r.transaction_ref??''),notes:String(r.notes??''),idempotency_key:`excel:${ctx.fileName}:${r._source_row}:${r.payment_no||''}`}});
    if(type==='bookings'){
      const day=r.event_date||r.booking_date||isoDate(new Date()),start=`${day}T12:00:00+03:00`,end=`${day}T13:00:00+03:00`;
      return apiV27('/api/bookings',{method:'POST',body:{customer_name:r.customer_name,phone:r.phone||'غير متوفر',event_type:'حجز مستورد من Excel',start_at:start,end_at:end,venue_name:'غير محدد',budget:r.amount,deposit:r.paid_amount,paid_amount:r.paid_amount,details:[r.details,r.notes].filter(Boolean).join(' — '),status:r.paid_amount>=r.amount?'paid':r.paid_amount>0?'confirmed':'pending',idempotency_key:`excel-booking:${ctx.fileName}:${r._source_row}`}});
    }
    if(type==='custodies')return apiV27('/api/shop-system/custodies',{method:'POST',body:{holder_name:String(r.holder_name??''),custody_date:r.custody_date||undefined,custody_amount:numericV(r.custody_amount),invoices_amount:numericV(r.invoices_amount),notes:String(r.notes??'')}});
    if(type==='deliveries')return apiV27('/api/shop-system/deliveries',{method:'POST',body:{driver_name:String(r.driver_name??''),delivery_date:r.delivery_date||undefined,trips_count:Math.max(0,Math.round(numericV(r.trips_count))),amount:numericV(r.amount),notes:[r.reference,r.notes].filter(Boolean).join(' — ')}});
    if(type==='employees')return apiV27('/api/employees',{method:'POST',body:{employee_no:String(r.employee_no??'')||undefined,name:String(r.name??''),job_title:String(r.job_title??''),role_code:'florist',salary:numericV(r.salary),hire_date:r.hire_date||undefined,end_date:r.end_date||undefined,is_active:!r.end_date}});
    if(type==='expenses')return apiV27('/api/shop-system/expenses',{method:'POST',body:{expense_date:r.expense_date||undefined,category:String(r.category??''),description:String(r.description??''),payment_method:r.payment_method||'cash',amount:numericV(r.amount),notes:String(r.notes??'')}});
    if(type==='historical_sales')return apiV27('/api/excel-import/historical-sales',{method:'POST',body:{sale_date:r.sale_date,day_name:String(r.day_name??''),network:numericV(r.network),cash:numericV(r.cash),bank_transfer:numericV(r.bank_transfer),purchases:numericV(r.purchases),expenses:numericV(r.expenses),net_cash:numericV(r.net_cash),source_name:ctx.fileName,source_row:r._source_row}});
    throw new Error('نوع الاستيراد غير مدعوم');
  }
  async function renderExcelImportV27(){
    if(!window.XLSX){$('#content').innerHTML='<div class="empty">مكتبة قراءة Excel غير متاحة. أعد تحميل الصفحة بعد التأكد من الاتصال.</div>';return;}
    const logs=await apiV27('/api/excel-import/logs').catch(()=>({items:[]}));
    $('#content').innerHTML=`<section class="panel"><div class="panel-head"><div><h3>استيراد بيانات Excel</h3><small>المعاينة إلزامية قبل الحفظ. المبيعات اليومية المجمعة تُسجل كتاريخ فقط ولا تحرك المخزون.</small></div></div>
      <div class="form-grid"><label>نوع البيانات<select id="v27ExcelType">${Object.entries(EXCEL_IMPORT_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></label><label>ملف Excel<input id="v27ExcelFile" type="file" accept=".xlsx,.xls,.xlsm"></label><label>ورقة العمل<select id="v27ExcelSheet" disabled><option>—</option></select></label><label id="v27InvoicePaidOption" class="check-label hidden"><input type="checkbox" id="v27UseInvoicePaid"> استخدام عمود «المسدد» داخل فاتورة المورد <small>اتركه غير محدد إذا ستستورد ورقة دفعات الموردين حتى لا تُحسب الدفعة مرتين.</small></label><div class="form-actions"><button class="btn btn-primary" id="v27ExcelPreview" disabled>معاينة البيانات</button></div></div>
      <div id="v27ExcelStats" class="v27-accounting-note">اختر الملف ونوع البيانات، ثم اعرض المعاينة.</div><div id="v27ExcelPreviewBox"></div></section>
      <section class="panel"><div class="panel-head"><h3>سجل الاستيراد</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>الرقم</th><th>الملف</th><th>النوع</th><th>الإجمالي</th><th>مقبول</th><th>مرفوض</th><th>التاريخ</th></tr></thead><tbody>${(logs.items||[]).map(x=>`<tr><td>${escapeHtml(x.import_no)}</td><td>${escapeHtml(x.source_name)}</td><td>${escapeHtml(EXCEL_IMPORT_TYPES[x.import_type]?.label||x.import_type)}</td><td>${number(x.total_rows)}</td><td>${number(x.accepted_rows)}</td><td>${number(x.rejected_rows)}</td><td>${x.created_at?new Date(x.created_at).toLocaleString('ar-SA'):'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">لا توجد عمليات استيراد بعد.</td></tr>'}</tbody></table></div></section>`;
    let workbook=null,fileName='',previewRows=[];
    const file=$('#v27ExcelFile'),sheet=$('#v27ExcelSheet'),previewBtn=$('#v27ExcelPreview'),typeEl=$('#v27ExcelType');
    const paidOption=$('#v27InvoicePaidOption');const syncPaidOption=()=>paidOption?.classList.toggle('hidden',typeEl.value!=='supplier_invoices');typeEl.onchange=syncPaidOption;syncPaidOption();
    file.onchange=async()=>{const f=file.files?.[0];if(!f)return;fileName=f.name;try{workbook=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});sheet.innerHTML=workbook.SheetNames.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');sheet.disabled=false;previewBtn.disabled=false;$('#v27ExcelStats').textContent=`تم فتح ${f.name} — ${workbook.SheetNames.length} ورقة.`;}catch(e){toast('تعذر قراءة ملف Excel: '+e.message,'error');}};
    previewBtn.onclick=async()=>{
      if(!workbook)return;const cfg=EXCEL_IMPORT_TYPES[typeEl.value],ws=workbook.Sheets[sheet.value],raw=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
      try{const mapped=mappedExcelRows(raw,cfg,fileName);const seen=new Set();previewRows=mapped.items.map(r=>{const row=normalizeImportRow(typeEl.value,r);let error=validateImportRow(typeEl.value,row);const key=importRowKey(typeEl.value,row);if(!error&&key){if(seen.has(key))error='مكرر داخل الملف';else seen.add(key);}return {...row,_error:error};});
        const ok=previewRows.filter(r=>!r._error).length,bad=previewRows.length-ok,cols=Object.keys(mapped.mapping);
        $('#v27ExcelStats').innerHTML=`صف العناوين: <b>${mapped.headerRow}</b> · السجلات: <b>${previewRows.length}</b> · المقبول مبدئيًا: <b>${ok}</b> · المرفوض/المكرر: <b>${bad}</b>`;
        $('#v27ExcelPreviewBox').innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>الحالة</th>${cols.slice(0,9).map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${previewRows.slice(0,25).map(r=>`<tr><td>${r._error?`<span class="status red">${escapeHtml(r._error)}</span>`:'<span class="status green">مقبول</span>'}</td>${cols.slice(0,9).map(c=>`<td>${escapeHtml(String(r[c]??''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="form-actions"><button class="btn btn-primary" id="v27ExcelImport" ${ok?'':'disabled'}>استيراد ${ok} سجل</button></div><div id="v27ExcelProgress"></div>`;
        $('#v27ExcelImport')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;const progress=$('#v27ExcelProgress');let accepted=0,rejected=0;const errors=[];let categories=[];if(typeEl.value==='products'){categories=(await apiV27('/api/categories').catch(()=>({items:[]}))).items||[];}
          const rows=previewRows.filter(r=>!r._error);for(let i=0;i<rows.length;i++){const r=rows[i];progress.textContent=`جاري الاستيراد ${i+1} من ${rows.length}...`;try{await postImportRowV27(typeEl.value,r,{fileName,categories,useInvoicePaid:Boolean($('#v27UseInvoicePaid')?.checked)});accepted++;}catch(err){rejected++;errors.push(`صف ${r._source_row}: ${err.message}`);}}
          await apiV27('/api/excel-import/log',{method:'POST',body:{source_name:fileName,import_type:typeEl.value,total_rows:previewRows.length,accepted_rows:accepted,rejected_rows:rejected+(previewRows.length-rows.length),status:'completed',summary:{sheet:sheet.value,preview_rejected:previewRows.length-rows.length,errors:errors.slice(0,50)}}}).catch(()=>{});
          progress.innerHTML=`<div class="v27-accounting-note"><b>اكتمل الاستيراد:</b> نجح ${accepted} · رفض ${rejected+(previewRows.length-rows.length)}.${errors.length?`<details><summary>أخطاء الخادم (${errors.length})</summary><pre>${escapeHtml(errors.join('\n'))}</pre></details>`:''}</div>`;toast(`تم استيراد ${accepted} سجل${rejected?' مع وجود أخطاء':''}`,rejected?'warning':'success');btn.disabled=false;
        });
      }catch(e){toast(e.message,'error');$('#v27ExcelPreviewBox').innerHTML='';}
    };
  }

  const oldRenderPage=renderPage;
  renderPage=async function(page,force=false){
    if(!['damage','stocktake','vat','returns','excel_import'].includes(page))return oldRenderPage(page,force);
    const meta=availablePages().find(p=>p.id===page);if(!meta||!can(meta.permission)){state.currentPage=null;renderNav();$('#pageTitle').textContent='غير مصرح';$('#content').innerHTML='<div class="empty">ليست لديك صلاحية فتح هذا القسم</div>';return;}
    state.currentPage=page;renderNav();$('#pageTitle').textContent=pageLabel(meta);$('#pageSubtitle').textContent=pageSub(page);$('#content').innerHTML='<div class="empty">جاري تحميل البيانات...</div>';
    try{if(page==='damage')await renderDamageV27();if(page==='stocktake')await renderStocktakesV27();if(page==='vat')await renderVatV27();if(page==='returns')await renderReturnsV27();if(page==='excel_import')await renderExcelImportV27();applyPagePermissions?.(page);enhanceCurrentPageTables?.(page);}catch(e){$('#content').innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;toast(e.message,'error');}
  };

  window.WardatV27={renderDamage:renderDamageV27,renderStocktakes:renderStocktakesV27,renderVat:renderVatV27,renderReturns:renderReturnsV27,renderExcelImport:renderExcelImportV27,openStocktake,printBarcode,compressImage,addBarcodeToPos};
})();
