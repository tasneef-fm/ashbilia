'use strict';
(() => {
  const previousRenderShopTab = renderShopTab;
  const today = () => new Date().toISOString().slice(0,10);
  const n = v => Number(v||0) || 0;
  const norm = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const clean = v => String(v??'').trim();
  const rowVal = (row,name) => row.querySelector(`[name="${name}"]`)?.value ?? '';
  const setText = (row,key,value) => { const el=row.querySelector(`[data-calc="${key}"]`); if(el) el.textContent=value; };
  const setValue = (row,name,value) => { const el=row.querySelector(`[name="${name}"]`); if(el) el.value=value; };
  const getInput = (name,type='text',attrs='') => `<input class="excel-cell-input" type="${type}" name="${name}" ${attrs}>`;
  const getSelect = (name,options) => `<select class="excel-cell-input" name="${name}">${options}</select>`;
  const calc = (key,value='0.00') => `<span class="excel-formula-cell" data-calc="${key}">${value}</span>`;
  const saveCell = () => `<button type="button" class="excel-row-save" data-excel-save title="حفظ السطر">✓</button>`;
  const note = text => `<div class="excel-entry-help"><b>طريقة الإدخال مثل Excel:</b> ${text} · <span>Tab ينتقل للخلية التالية، وEnter في آخر خلية يحفظ السطر.</span></div>`;

  function autoSku(){
    const d=new Date();
    return `PRD-${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Date.now()).slice(-5)}${Math.floor(Math.random()*9)}`;
  }
  function autoBarcode(){ return `WAS${String(Date.now()).slice(-10)}${Math.floor(Math.random()*90+10)}`; }

  function bindExcelRow(row,{calculate,save}){
    if(!row)return;
    const fields=[...row.querySelectorAll('.excel-cell-input:not([disabled])')];
    const runCalc=()=>{try{calculate?.(row);}catch{}};
    fields.forEach((el,idx)=>{
      el.addEventListener('input',runCalc);
      el.addEventListener('change',runCalc);
      el.addEventListener('keydown',async e=>{
        if(e.key!=='Enter' || el.tagName==='TEXTAREA')return;
        e.preventDefault();
        if(idx<fields.length-1){fields[idx+1]?.focus();fields[idx+1]?.select?.();return;}
        await doSave();
      });
    });
    const btn=row.querySelector('[data-excel-save]');
    btn?.addEventListener('click',()=>doSave());
    async function doSave(){
      if(row.dataset.saving==='1')return;
      row.dataset.saving='1'; row.classList.add('saving'); if(btn)btn.disabled=true;
      try{runCalc();await save(row);}catch(err){toast(err?.message||'تعذر حفظ السطر','error');row.classList.add('excel-row-error');setTimeout(()=>row.classList.remove('excel-row-error'),1500);}finally{row.dataset.saving='0';row.classList.remove('saving');if(btn)btn.disabled=false;}
    }
    runCalc();
    setTimeout(()=>fields[0]?.focus(),20);
  }

  function inventoryView(d){
    const area=$('#shopTabArea'),s=d.inventory_summary||{},rows=d.inventory||[];
    state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('اكتب اسم المنتج والعدد وسعر الشراء وسعر البيع مباشرة في الصف الأول. الكود والباركود يولدان تلقائيًا إذا تركت الكود فارغًا.')}
    <div class="metrics">${shopMetric('إجمالي الأصناف',number(s.item_count))}${shopMetric('إجمالي القطع',number(s.pieces_total))}${shopMetric('إجمالي الشراء',money(s.purchase_total))}${shopMetric('إجمالي البيع المتوقع',money(s.sale_total))}${shopMetric('الربح المتوقع',money(s.expected_profit))}</div>
    <section class="panel"><div class="panel-head"><h3>الأصناف والمخزون — إدخال مباشر</h3><small>الخانات الرمادية محسوبة تلقائيًا</small></div>
    <div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>كود الصنف</th><th>اسم المنتج</th><th>العدد</th><th>سعر الشراء</th><th>سعر البيع</th><th>إجمالي الشراء</th><th>إجمالي البيع</th><th>الربح المتوقع</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29ProductEntry"><td>${getInput('sku','text','placeholder="تلقائي"')}</td><td>${getInput('name_ar','text','placeholder="اكتب اسم المنتج"')}</td><td>${getInput('qty','number','min="0" step="0.001" value="0"')}</td><td>${getInput('purchase','number','min="0" step="0.01" value="0"')}</td><td>${getInput('sale','number','min="0" step="0.01" value="0"')}</td><td>${calc('purchase_total')}</td><td>${calc('sale_total')}</td><td>${calc('profit')}</td><td>${getInput('notes','text','placeholder="اختياري"')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${escapeHtml(x.sku||'—')}</b></td><td><b>${escapeHtml(x.name_ar)}</b></td><td>${number(x.current_qty)}</td><td>${money(x.purchase_price)}</td><td>${money(x.sale_price)}</td><td>${money(x.purchase_total)}</td><td>${money(x.sale_total)}</td><td>${money(x.expected_profit)}</td><td>${escapeHtml(x.notes||'')}</td><td></td></tr>`).join('')}
    </tbody></table></div></section>`;
    bindExcelRow($('#v29ProductEntry'),{
      calculate:row=>{const q=n(rowVal(row,'qty')),p=n(rowVal(row,'purchase')),sale=n(rowVal(row,'sale'));setText(row,'purchase_total',money(q*p));setText(row,'sale_total',money(q*sale));setText(row,'profit',money(q*(sale-p)));},
      save:async row=>{
        const name=clean(rowVal(row,'name_ar'));if(!name)throw new Error('اكتب اسم المنتج');
        const qty=n(rowVal(row,'qty')),purchase=n(rowVal(row,'purchase')),sale=n(rowVal(row,'sale'));
        const sku=clean(rowVal(row,'sku'))||autoSku();
        await api('/api/products',{method:'POST',body:{sku,barcode:autoBarcode(),name_ar:name,unit:'قطعة',stock_qty:qty,purchase_price:purchase,average_cost:purchase,sale_price:sale,min_stock:0,is_active:true,description:clean(rowVal(row,'notes')),notes:clean(rowVal(row,'notes'))}});
        toast(`تم حفظ ${name} وإعطاؤه الكود ${sku}`);await renderShopBooks({month:state.cache.shopMonth,tab:'inventory'});
      }
    });
  }

  async function getPurchaseLookups(){
    if(state.cache.v29PurchaseLookups)return state.cache.v29PurchaseLookups;
    const [pd,sd]=await Promise.all([api('/api/products?active=1'),api('/api/suppliers')]);
    return state.cache.v29PurchaseLookups={products:pd.items||[],suppliers:sd.items||[]};
  }
  function purchaseView(d){
    const area=$('#shopTabArea'),s=d.purchase_summary||{},rows=d.purchases||[];
    state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('اكتب الفاتورة في صف واحد مثل Excel. اسم الصنف يظهر تلقائيًا عند كتابة كود الصنف، والإجمالي والمتبقي وحالة السداد تُحسب لحظيًا.')}
    <div class="metrics">${shopMetric('عدد الفواتير',number(s.invoice_count))}${shopMetric('الإجمالي',money(s.total))}${shopMetric('المسدد',money(s.paid))}${shopMetric('المتبقي',money(s.remaining))}</div>
    <section class="panel"><div class="panel-head"><h3>مشتريات المخزون</h3><small id="v29PurchaseLookupStatus">جاري تحميل الأصناف والموردين…</small></div><div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>التاريخ</th><th>رقم الفاتورة</th><th>اسم المورد</th><th>كود الصنف</th><th>اسم الصنف</th><th>الكمية</th><th>تكلفة الوحدة</th><th>إجمالي الشراء</th><th>المسدد</th><th>المتبقي</th><th>حالة السداد</th><th>طريقة السداد</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29PurchaseEntry"><td>${getInput('date','date',`value="${today()}"`)}</td><td>${getInput('invoice_no','text','placeholder="اختياري"')}</td><td>${getInput('supplier','text','list="v29Suppliers" placeholder="اكتب المورد"')}<datalist id="v29Suppliers"></datalist></td><td>${getInput('sku','text','list="v29Products" placeholder="الكود"')}<datalist id="v29Products"></datalist></td><td>${calc('product_name','—')}</td><td>${getInput('qty','number','min="0.001" step="0.001" value="1"')}</td><td>${getInput('cost','number','min="0" step="0.01" value="0"')}</td><td>${calc('total')}</td><td>${getInput('paid','number','min="0" step="0.01" value="0"')}</td><td>${calc('remaining')}</td><td>${calc('payment_status','غير مدفوع')}</td><td>${getSelect('method','<option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option>')}</td><td>${getInput('notes','text')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td>${dateOnly(x.invoice_date)}</td><td>${escapeHtml(x.po_no||'')}</td><td>${escapeHtml(x.supplier_name||'')}</td><td>${escapeHtml(x.sku||'')}</td><td>${escapeHtml(x.product_name||'')}</td><td>${number(x.qty)}</td><td>${money(x.unit_price)}</td><td>${money(x.invoice_total)}</td><td>${money(x.paid_amount)}</td><td>${money(x.remaining_amount)}</td><td>${shopStatus(x.payment_status==='paid'?'مدفوع':x.payment_status==='partial'?'جزئي':'غير مدفوع')}</td><td>—</td><td>${escapeHtml(x.notes||'')}</td><td></td></tr>`).join('')}
    </tbody></table></div></section>`;
    let lookup={products:[],suppliers:[]};
    const refreshDatalists=()=>{const pdl=$('#v29Products'),sdl=$('#v29Suppliers');if(pdl)pdl.innerHTML=lookup.products.map(p=>`<option value="${escapeHtml(p.sku||'')}">${escapeHtml(p.name_ar||'')}</option>`).join('');if(sdl)sdl.innerHTML=lookup.suppliers.map(s=>`<option value="${escapeHtml(s.name||'')}">${escapeHtml(s.supplier_no||'')}</option>`).join('');const st=$('#v29PurchaseLookupStatus');if(st)st.textContent=`${lookup.products.length} صنف · ${lookup.suppliers.length} مورد`;};
    getPurchaseLookups().then(x=>{lookup=x;refreshDatalists();$('#v29PurchaseEntry')?.dispatchEvent(new Event('input',{bubbles:true}));}).catch(e=>{const st=$('#v29PurchaseLookupStatus');if(st)st.textContent='تعذر تحميل القوائم';});
    bindExcelRow($('#v29PurchaseEntry'),{
      calculate:row=>{const sku=norm(rowVal(row,'sku')),p=lookup.products.find(x=>norm(x.sku)===sku||norm(x.barcode)===sku);setText(row,'product_name',p?.name_ar||'—');const total=n(rowVal(row,'qty'))*n(rowVal(row,'cost')),paid=n(rowVal(row,'paid')),rem=Math.max(0,total-paid);setText(row,'total',money(total));setText(row,'remaining',money(rem));setText(row,'payment_status',rem<=0.01&&total>0?'مدفوع':paid>0?'جزئي':'غير مدفوع');},
      save:async row=>{
        lookup=await getPurchaseLookups();
        const supplierName=clean(rowVal(row,'supplier'));if(!supplierName)throw new Error('اكتب اسم المورد');
        let supplier=lookup.suppliers.find(x=>norm(x.name)===norm(supplierName));
        if(!supplier){const created=await api('/api/suppliers',{method:'POST',body:{name:supplierName,opening_balance:0,rating:0,account_opened_date:rowVal(row,'date')}});supplier=created?.item;if(!supplier?.id)throw new Error('تعذر إنشاء المورد');lookup.suppliers.push(supplier);}
        const sku=clean(rowVal(row,'sku'));let product=lookup.products.find(x=>norm(x.sku)===norm(sku)||norm(x.barcode)===norm(sku));if(!product)throw new Error('كود الصنف غير موجود. أضف الصنف أولًا في ورقة الأصناف والمخزون');
        const qty=n(rowVal(row,'qty')),cost=n(rowVal(row,'cost')),paid=n(rowVal(row,'paid'));if(!(qty>0))throw new Error('أدخل الكمية');
        const result=await api('/api/purchase-orders',{method:'POST',body:{supplier_id:supplier.id,supplier_invoice_no:clean(rowVal(row,'invoice_no')),invoice_date:rowVal(row,'date'),expected_at:rowVal(row,'date'),price_input_mode:'exclusive',paid_amount:paid,payment_method:rowVal(row,'method')||'cash',notes:clean(rowVal(row,'notes')),idempotency_key:crypto.randomUUID(),items:[{product_id:product.id,description:product.name_ar,qty,unit_price:cost,price_input_mode:'exclusive'}]}});
        const poId=result?.item?.id;if(!poId)throw new Error('تعذر تحديد فاتورة الشراء بعد الحفظ');
        await api(`/api/purchase-orders/${poId}/receive`,{method:'POST'});
        if(result?.compatibility_mode&&paid>0)await api('/api/shop-system/purchase-payment',{method:'POST',body:{purchase_order_id:poId,amount:paid,method:rowVal(row,'method')||'cash',notes:'دفعة أولية من إدخال Excel'}});
        state.cache.v29PurchaseLookups=null;toast('تم حفظ الشراء وإضافة الكمية للمخزون');await renderShopBooks({month:state.cache.shopMonth,tab:'purchases'});
      }
    });
  }

  function expensesView(d){
    const area=$('#shopTabArea'),s=d.expense_summary||{},rows=d.expenses||[];state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('اكتب المصروف مباشرة في الصف الأول، مثل ورقة المصروفات في Excel.')}
    <div class="metrics">${shopMetric('عدد المصروفات',number(s.count))}${shopMetric('إجمالي المصروفات',money(s.total))}</div><section class="panel"><div class="panel-head"><h3>المصروفات والنثريات</h3></div><div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>التاريخ</th><th>نوع المصروف</th><th>البيان</th><th>طريقة الدفع</th><th>المبلغ</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29ExpenseEntry"><td>${getInput('date','date',`value="${today()}"`)}</td><td>${getSelect('category','<option>نثريات</option><option>إيجار</option><option>رواتب</option><option>كهرباء</option><option>مياه</option><option>توصيل</option><option>صيانة</option><option>تسويق</option><option>أخرى</option>')}</td><td>${getInput('description','text','placeholder="البيان"')}</td><td>${getSelect('method','<option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option>')}</td><td>${getInput('amount','number','min="0.01" step="0.01"')}</td><td>${getInput('notes')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td>${dateOnly(x.expense_date)}</td><td>${escapeHtml(x.category||'')}</td><td>${escapeHtml(x.description||'')}</td><td>${escapeHtml(shopPaymentLabel(x.payment_method))}</td><td>${money(x.amount)}</td><td>${escapeHtml(x.notes||'')}</td><td></td></tr>`).join('')}</tbody></table></div></section>`;
    bindExcelRow($('#v29ExpenseEntry'),{save:async row=>{const amount=n(rowVal(row,'amount'));if(!(amount>0))throw new Error('أدخل مبلغ المصروف');if(!clean(rowVal(row,'description')))throw new Error('اكتب البيان');await api('/api/shop-system/expenses',{method:'POST',body:{expense_date:rowVal(row,'date'),category:rowVal(row,'category'),description:clean(rowVal(row,'description')),payment_method:rowVal(row,'method'),amount,notes:clean(rowVal(row,'notes'))}});toast('تم حفظ المصروف');await renderShopBooks({month:state.cache.shopMonth,tab:'expenses'});}});
  }

  function custodyView(d){
    const area=$('#shopTabArea'),s=d.custody_summary||{},rows=d.custodies||[];state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('أدخل الاسم والتاريخ والعهدة وقيمة الفواتير في نفس الصف. المتبقي وحالة التصفية محسوبان تلقائيًا.')}
    <div class="metrics">${shopMetric('عدد العهد',number(s.count))}${shopMetric('تمت التصفية',number(s.settled_count))}${shopMetric('إجمالي العهد',money(s.custody_total))}${shopMetric('إجمالي الفواتير',money(s.invoices_total))}${shopMetric('إجمالي المتبقي',money(s.remaining_total))}</div><section class="panel"><div class="panel-head"><h3>كشف العهد</h3></div><div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>الاسم</th><th>التاريخ</th><th>العهدة</th><th>قيمة الفواتير</th><th>المتبقي</th><th>ملاحظات</th><th>حالة التصفية</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29CustodyEntry"><td>${getInput('name','text','placeholder="الاسم"')}</td><td>${getInput('date','date',`value="${today()}"`)}</td><td>${getInput('amount','number','min="0" step="0.01" value="0"')}</td><td>${getInput('invoices','number','min="0" step="0.01" value="0"')}</td><td>${calc('remaining')}</td><td>${getInput('notes')}</td><td>${calc('status','لم تتم')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${escapeHtml(x.holder_name)}</b><small>${escapeHtml(x.custody_no||'')}</small></td><td>${dateOnly(x.custody_date)}</td><td>${money(x.custody_amount)}</td><td>${money(x.invoices_amount)}</td><td>${money(x.remaining)}</td><td>${escapeHtml(x.notes||'')}</td><td>${shopStatus(x.settlement_status)}</td><td><button class="mini-btn" data-v29-custody-edit="${x.id}">تعديل</button></td></tr>`).join('')}</tbody></table></div></section>`;
    bindExcelRow($('#v29CustodyEntry'),{calculate:row=>{const r=n(rowVal(row,'amount'))-n(rowVal(row,'invoices'));setText(row,'remaining',money(r));setText(row,'status',Math.abs(r)<=.01?'تمت التصفية':r>0?'لم تتم':'الفواتير أعلى من العهدة');},save:async row=>{const name=clean(rowVal(row,'name'));if(!name)throw new Error('اكتب الاسم');await api('/api/shop-system/custodies',{method:'POST',body:{holder_name:name,custody_date:rowVal(row,'date'),custody_amount:n(rowVal(row,'amount')),invoices_amount:n(rowVal(row,'invoices')),notes:clean(rowVal(row,'notes'))}});toast('تم حفظ العهدة');await renderShopBooks({month:state.cache.shopMonth,tab:'custodies'});}});
    $$('[data-v29-custody-edit]').forEach(b=>b.onclick=()=>shopCustodyForm(rows.find(x=>x.id===b.dataset.v29CustodyEdit)));
  }

  function driversView(d){
    const area=$('#shopTabArea'),s=d.delivery_summary||{},rows=d.delivery_logs||[];state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('أدخل اسم المندوب والتاريخ وعدد المشاوير والمبلغ مباشرة في الصف الأول.')}
    <div class="metrics">${shopMetric('عدد السجلات',number(s.records_count))}${shopMetric('إجمالي المشاوير',number(s.trips_total))}${shopMetric('إجمالي المبالغ',money(s.amount_total))}</div><section class="panel"><div class="panel-head"><h3>كشف توصيل المندوبين</h3></div><div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>اسم المندوب</th><th>التاريخ</th><th>كم مشوار</th><th>المبلغ</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29DriverEntry"><td>${getInput('name','text','placeholder="اسم المندوب"')}</td><td>${getInput('date','date',`value="${today()}"`)}</td><td>${getInput('trips','number','min="0" step="1" value="0"')}</td><td>${getInput('amount','number','min="0" step="0.01" value="0"')}</td><td>${getInput('notes')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${escapeHtml(x.driver_name)}</b><small>${escapeHtml(x.delivery_log_no||'')}</small></td><td>${dateOnly(x.delivery_date)}</td><td>${number(x.trips_count)}</td><td>${money(x.amount)}</td><td>${escapeHtml(x.notes||'')}</td><td><button class="mini-btn" data-v29-driver-edit="${x.id}">تعديل</button></td></tr>`).join('')}</tbody></table></div></section>`;
    bindExcelRow($('#v29DriverEntry'),{save:async row=>{const name=clean(rowVal(row,'name'));if(!name)throw new Error('اكتب اسم المندوب');await api('/api/shop-system/deliveries',{method:'POST',body:{driver_name:name,delivery_date:rowVal(row,'date'),trips_count:n(rowVal(row,'trips')),amount:n(rowVal(row,'amount')),notes:clean(rowVal(row,'notes'))}});toast('تم حفظ سجل المندوب');await renderShopBooks({month:state.cache.shopMonth,tab:'drivers'});}});
    $$('[data-v29-driver-edit]').forEach(b=>b.onclick=()=>shopDriverLogForm(rows.find(x=>x.id===b.dataset.v29DriverEdit)));
  }

  function bookingView(d){
    const area=$('#shopTabArea'),s=d.booking_summary||{},rows=d.bookings||[];state.cache.shopCurrentRows=rows;
    area.innerHTML=`${note('أدخل الحجز في صف واحد. رقم الحجز والمتبقي وحالة السداد تُحسب تلقائيًا، والمدفوع يُسجل كدفعة للحجز.')}
    <div class="metrics">${shopMetric('عدد الحجوزات',number(s.count))}${shopMetric('المسددة',number(s.paid_count))}${shopMetric('إجمالي المبلغ',money(s.total))}${shopMetric('إجمالي المدفوع',money(s.paid))}${shopMetric('إجمالي المتبقي',money(s.remaining))}</div><section class="panel"><div class="panel-head"><h3>كشف الحجوزات</h3><small>للتفاصيل المتقدمة استخدم قسم الحجوزات</small></div><div class="table-wrap"><table class="data-table excel-entry-table"><thead><tr><th>رقم الحجز</th><th>تاريخ المناسبة</th><th>اسم العميل</th><th>الجوال</th><th>التفاصيل</th><th>قيمة الحجز</th><th>المدفوع</th><th>المتبقي</th><th>حالة السداد</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="excel-entry-row" id="v29BookingEntry"><td>${calc('booking_no','تلقائي')}</td><td>${getInput('date','date',`value="${today()}"`)}</td><td>${getInput('customer','text','placeholder="اسم العميل"')}</td><td>${getInput('phone','text','placeholder="05xxxxxxxx"')}</td><td>${getInput('details','text')}</td><td>${getInput('total','number','min="0" step="0.01" value="0"')}</td><td>${getInput('paid','number','min="0" step="0.01" value="0"')}</td><td>${calc('remaining')}</td><td>${calc('status','غير مدفوع')}</td><td>${getInput('notes')}</td><td>${saveCell()}</td></tr>
    ${rows.map(x=>`<tr><td>${escapeHtml(x.booking_no)}</td><td>${dateOnly(x.booking_date)}</td><td><b>${escapeHtml(x.customer_name)}</b></td><td>—</td><td>${escapeHtml(x.notes||'')}</td><td>${money(x.total_amount)}</td><td>${money(x.paid_amount)}</td><td>${money(x.remaining_amount)}</td><td>${shopStatus(x.paid_status==='نعم'?'مسدد':Number(x.paid_amount)>0?'جزئي':'غير مدفوع')}</td><td>${escapeHtml(x.notes||'')}</td><td>${Number(x.remaining_amount)>0?`<button class="mini-btn" data-booking-pay="${x.id}" data-remaining="${x.remaining_amount}" data-name="${escapeHtml(x.customer_name)}">دفعة</button>`:''}</td></tr>`).join('')}</tbody></table></div></section>`;
    bindExcelRow($('#v29BookingEntry'),{calculate:row=>{const total=n(rowVal(row,'total')),paid=n(rowVal(row,'paid')),remaining=Math.max(0,total-paid);setText(row,'remaining',money(remaining));setText(row,'status',total>0&&remaining<=.01?'مسدد':paid>0?'جزئي':'غير مدفوع');},save:async row=>{const customer=clean(rowVal(row,'customer')),phone=clean(rowVal(row,'phone')),date=rowVal(row,'date');if(!customer)throw new Error('اكتب اسم العميل');if(!phone)throw new Error('اكتب رقم الجوال');if(!date)throw new Error('اختر تاريخ المناسبة');const total=n(rowVal(row,'total')),paid=n(rowVal(row,'paid'));if(paid>total+0.01)throw new Error('المدفوع أكبر من قيمة الحجز');const details=[clean(rowVal(row,'details')),clean(rowVal(row,'notes'))].filter(Boolean).join(' | ');const created=await api('/api/bookings',{method:'POST',body:{customer_name:customer,phone,event_type:'مناسبة',start_at:`${date}T18:00:00+03:00`,end_at:`${date}T23:00:00+03:00`,city:'الرياض',budget:total,deposit:0,details,items:[],idempotency_key:crypto.randomUUID()}});const id=created?.booking?.id||created?.item?.id;if(paid>0&&id)await api('/api/shop-system/booking-payment',{method:'POST',body:{booking_id:id,amount:paid,method:'cash',notes:'دفعة أولية من إدخال Excel'}});toast('تم حفظ الحجز');await renderShopBooks({month:state.cache.shopMonth,tab:'bookings'});}});
    $$('[data-booking-pay]').forEach(b=>b.onclick=()=>shopBookingPaymentForm(b.dataset.bookingPay,b.dataset.name,Number(b.dataset.remaining)));
  }

  function dailyView(d){
    previousRenderShopTab('daily',d);
    const area=$('#shopTabArea');if(!area)return;
    area.insertAdjacentHTML('afterbegin',note('هذه الورقة ناتجة تلقائيًا من الكاشير والمشتريات والمصروفات، لذلك لا تحتاج إدخال يدوي حتى لا تتكرر الأرقام.'));
  }
  function payrollView(d){
    previousRenderShopTab('payroll',d);
    const area=$('#shopTabArea');if(!area)return;
    area.insertAdjacentHTML('afterbegin',note('أيام العمل والغياب وصافي الراتب تُسحب تلقائيًا من الموظفين والحضور، لذلك الخانات المحسوبة لا تُكتب يدويًا.'));
    $('#openPayroll')?.remove();
  }

  renderShopTab=function(tab,d){
    const handlers={inventory:inventoryView,purchases:purchaseView,expenses:expensesView,custodies:custodyView,drivers:driversView,bookings:bookingView,daily:dailyView,payroll:payrollView};
    if(handlers[tab])return handlers[tab](d);
    return previousRenderShopTab(tab,d);
  };

  const oldRenderShopBooks=renderShopBooks;
  renderShopBooks=async function(options={}){
    await oldRenderShopBooks(options);
    const head=$('.shop-system-head p');
    if(head)head.textContent='الإدخال الآن مثل Excel: اكتب مباشرة داخل خلايا الصف الأول؛ الخانات المحسوبة لا تحتاج كتابة.';
  };
})();
