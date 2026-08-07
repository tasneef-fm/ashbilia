'use strict';
(() => {
  const today=()=>new Date().toISOString().slice(0,10);
  const num=v=>Number(v||0)||0;
  const clean=v=>String(v??'').trim();
  const h=v=>escapeHtml(String(v??''));
  const val=(row,name)=>row.querySelector(`[name="${name}"]`)?.value??'';
  const setCalc=(row,key,value)=>{const e=row.querySelector(`[data-calc="${key}"]`);if(e)e.textContent=value;};
  const input=(name,type='text',extra='')=>`<input class="supplier-grid-input ${name.includes('code')||name.includes('_no')?'code':''} ${name==='notes'?'notes':''}" type="${type}" name="${name}" ${extra}>`;
  const calc=(key,text='—')=>`<span class="supplier-grid-calc" data-calc="${key}">${text}</span>`;
  const save=()=>`<button type="button" class="supplier-grid-save" data-supplier-row-save title="حفظ السطر">✓</button>`;
  const methodLabel=v=>({cash:'كاش',mada:'شبكة',network:'شبكة',bank_transfer:'تحويل',transfer:'تحويل'}[String(v||'').toLowerCase()]||v||'—');
  const methodValue=v=>({كاش:'cash',شبكة:'mada',تحويل:'bank_transfer'}[v]||v||'cash');
  const statusClass=s=>s==='مسدد'?'paid':s==='جزئي'?'partial':s==='دائن'?'credit':'due';
  const statusPill=s=>`<span class="supplier-status ${statusClass(s)}">${h(s||'—')}</span>`;
  let activeTab='suppliers';
  let currentData=null;

  function bindRow(row,{calculate,saveRow}){
    const fields=[...row.querySelectorAll('.supplier-grid-input:not([disabled])')];
    const run=()=>{try{calculate?.(row);}catch{}};
    fields.forEach((el,i)=>{
      el.addEventListener('input',run); el.addEventListener('change',run);
      el.addEventListener('keydown',async e=>{
        if(e.key!=='Enter'||el.tagName==='TEXTAREA')return;
        e.preventDefault();
        if(i<fields.length-1){fields[i+1]?.focus();fields[i+1]?.select?.();return;}
        await submit();
      });
    });
    row.querySelector('[data-supplier-row-save]')?.addEventListener('click',submit);
    async function submit(){
      if(row.dataset.saving==='1')return;
      row.dataset.saving='1';row.classList.add('saving');const b=row.querySelector('[data-supplier-row-save]');if(b)b.disabled=true;
      try{run();await saveRow(row);}catch(err){toast(err?.message||'تعذر حفظ السطر','error');row.classList.add('row-error');setTimeout(()=>row.classList.remove('row-error'),1200);}finally{row.dataset.saving='0';row.classList.remove('saving');if(b)b.disabled=false;}
    }
    run();setTimeout(()=>fields[0]?.focus(),40);
  }

  async function loadData(){
    try{return await api('/api/supplier-excel');}
    catch(err){
      if(!/get_supplier_excel_system_v30|schema cache|PGRST202|Could not find the function/i.test(String(err?.message||'')))throw err;
      const [s,p,pay]=await Promise.all([api('/api/suppliers'),api('/api/purchase-orders'),api('/api/supplier-payments').catch(()=>({items:[]}))]);
      const suppliers=s.items||[],invoices=p.items||[],payments=pay.items||[];
      const sm=new Map(suppliers.map(x=>[x.id,x]));const im=new Map(invoices.map(x=>[x.id,x]));
      const supRows=suppliers.map(x=>{const inv=invoices.filter(i=>i.supplier_id===x.id);const py=payments.filter(a=>a.supplier_id===x.id);const it=inv.reduce((a,b)=>a+num(b.total),0),pt=py.reduce((a,b)=>a+num(b.amount),0),bal=x.balance_due??(it-pt);return{supplier_no:x.supplier_no,name:x.name,account_opened_date:String(x.created_at||'').slice(0,10),opening_balance:Math.max(0,num(bal)-it+pt),invoice_total:it,paid_total:pt,balance_current:num(bal),account_status:num(bal)<=0?'مسدد':pt>0?'جزئي':'آجل',notes:x.notes||''};});
      const invRows=invoices.map(x=>({id:x.id,invoice_no:x.supplier_invoice_no||x.po_no,invoice_date:String(x.invoice_date||x.created_at||'').slice(0,10),supplier_no:sm.get(x.supplier_id)?.supplier_no||'',supplier_name:x.supplier_name||sm.get(x.supplier_id)?.name||'',total:num(x.total),due_date:x.due_date||x.expected_at||'',paid:num(x.paid_amount),remaining:x.remaining_amount==null?Math.max(0,num(x.total)-num(x.paid_amount)):num(x.remaining_amount),payment_status:x.payment_status==='paid'?'مسدد':x.payment_status==='partial'?'جزئي':'آجل',notes:x.notes||''}));
      const payRows=payments.map(x=>({payment_no:x.payment_no,paid_at:String(x.paid_at||'').slice(0,10),supplier_no:sm.get(x.supplier_id)?.supplier_no||'',supplier_name:sm.get(x.supplier_id)?.name||'',invoice_no:im.get(x.purchase_order_id)?.supplier_invoice_no||im.get(x.purchase_order_id)?.po_no||'',amount:num(x.amount),method:x.method,transaction_ref:x.transaction_ref||'',notes:x.notes||''}));
      const summary={supplier_count:supRows.length,opening_total:supRows.reduce((a,b)=>a+num(b.opening_balance),0),invoice_total:invRows.reduce((a,b)=>a+num(b.total),0),paid_total:payRows.reduce((a,b)=>a+num(b.amount),0),balance_total:supRows.reduce((a,b)=>a+num(b.balance_current),0),paid_accounts:supRows.filter(x=>x.account_status==='مسدد').length,partial_accounts:supRows.filter(x=>x.account_status==='جزئي').length,due_accounts:supRows.filter(x=>x.account_status==='آجل').length};
      return{suppliers:supRows,invoices:invRows,payments:payRows,summary,compatibility_mode:true};
    }
  }

  function shell(){
    return `<div class="supplier-excel-shell"><div class="supplier-excel-title"><div><h2>كشف حساب الموردين الذكي</h2><p>نفس تبويبات وطريقة إدخال ملف Excel: الموردين ← الفواتير ← الدفعات ← الملخص.</p></div><div class="supplier-actions"><button class="btn btn-outline" id="supplierExcelRefresh">تحديث</button></div></div><div class="supplier-sheet-tabs">${[['suppliers','الموردين'],['invoices','الفواتير'],['payments','الدفعات'],['summary','الملخص']].map(([id,label])=>`<button class="supplier-sheet-tab ${activeTab===id?'active':''}" data-supplier-tab="${id}">${label}</button>`).join('')}</div><div id="supplierSheetArea"></div></div>`;
  }

  function suppliersView(d){
    const rows=d.suppliers||[];
    return `${d.compatibility_mode?'<div class="supplier-compat-warning">الصفحة تعمل بوضع التوافق. شغّل ملف SQL الخاص بـ V30 ليظهر الرصيد الافتتاحي والربط المحاسبي الكامل بدقة.</div>':''}
    <div class="supplier-sheet-note"><strong>طريقة الإدخال:</strong> اكتب اسم المورد وتاريخ فتح الحساب والرصيد الافتتاحي في الصف الأصفر. كود المورد يولد تلقائيًا إذا تركته فارغًا، وباقي الأعمدة محسوبة.</div>
    <div class="table-wrap"><table class="data-table supplier-excel-table"><thead><tr><th>كود المورد</th><th>اسم الشركة</th><th>تاريخ فتح الحساب</th><th>الرصيد الافتتاحي</th><th>إجمالي الفواتير الآجلة</th><th>إجمالي المسدد</th><th>الرصيد الحالي</th><th>حالة الحساب</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="supplier-entry-row" id="supplierEntryV30"><td>${input('supplier_no','text','placeholder="تلقائي"')}</td><td>${input('name')}</td><td>${input('account_opened_date','date',`value="${today()}"`)}</td><td>${input('opening_balance','number','min="0" step="0.01" value="0"')}</td><td>${calc('invoice_total',money(0))}</td><td>${calc('paid_total',money(0))}</td><td>${calc('balance',money(0))}</td><td>${calc('status','آجل')}</td><td>${input('notes')}</td><td>${save()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${h(x.supplier_no)}</b></td><td>${h(x.name)}</td><td>${h(x.account_opened_date||'')}</td><td>${money(x.opening_balance)}</td><td>${money(x.invoice_total)}</td><td>${money(x.paid_total)}</td><td><b>${money(x.balance_current)}</b></td><td>${statusPill(x.account_status)}</td><td>${h(x.notes||'')}</td><td></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function invoicesView(d){
    const rows=d.invoices||[],opts=(d.suppliers||[]).map(s=>`<option value="${h(s.supplier_no)}">${h(s.name)}</option>`).join('');
    return `<div class="supplier-sheet-note"><strong>طريقة الإدخال:</strong> اكتب كود المورد وقيمة الفاتورة. اسم المورد والمسدد والمتبقي وحالة السداد تتحدث تلقائيًا من الدفعات.</div><datalist id="supplierCodesV30">${opts}</datalist>
    <div class="table-wrap"><table class="data-table supplier-excel-table"><thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>كود المورد</th><th>اسم المورد</th><th>قيمة الفاتورة</th><th>تاريخ الاستحقاق</th><th>المسدد</th><th>المتبقي</th><th>حالة السداد</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="supplier-entry-row" id="invoiceEntryV30"><td>${input('invoice_no','text','placeholder="تلقائي"')}</td><td>${input('invoice_date','date',`value="${today()}"`)}</td><td>${input('supplier_no','text','list="supplierCodesV30"')}</td><td>${calc('supplier_name','—')}</td><td>${input('total','number','min="0" step="0.01" value="0"')}</td><td>${input('due_date','date')}</td><td>${calc('paid',money(0))}</td><td>${calc('remaining',money(0))}</td><td>${calc('status','آجل')}</td><td>${input('notes')}</td><td>${save()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${h(x.invoice_no)}</b></td><td>${h(x.invoice_date||'')}</td><td>${h(x.supplier_no)}</td><td>${h(x.supplier_name)}</td><td>${money(x.total)}</td><td>${h(x.due_date||'')}</td><td>${money(x.paid)}</td><td><b>${money(x.remaining)}</b></td><td>${statusPill(x.payment_status)}</td><td>${h(x.notes||'')}</td><td></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function paymentsView(d){
    const rows=d.payments||[],opts=(d.suppliers||[]).map(s=>`<option value="${h(s.supplier_no)}">${h(s.name)}</option>`).join('');
    return `<div class="supplier-sheet-note"><strong>طريقة الإدخال:</strong> سجّل الدفعة مع كود المورد. رقم الفاتورة اختياري؛ إذا كتبته تخصم الدفعة من الفاتورة نفسها، وإذا تركته فارغًا تخصم من حساب المورد العام.</div><datalist id="supplierCodesPayV30">${opts}</datalist>
    <div class="table-wrap"><table class="data-table supplier-excel-table"><thead><tr><th>رقم السداد</th><th>التاريخ</th><th>كود المورد</th><th>اسم المورد</th><th>رقم الفاتورة</th><th>المبلغ المسدد</th><th>طريقة السداد</th><th>مرجع العملية</th><th>ملاحظات</th><th></th></tr></thead><tbody>
    <tr class="supplier-entry-row" id="paymentEntryV30"><td>${input('payment_no','text','placeholder="تلقائي"')}</td><td>${input('paid_at','date',`value="${today()}"`)}</td><td>${input('supplier_no','text','list="supplierCodesPayV30"')}</td><td>${calc('supplier_name','—')}</td><td>${input('invoice_no')}</td><td>${input('amount','number','min="0" step="0.01" value="0"')}</td><td><select class="supplier-grid-input" name="method"><option>كاش</option><option>شبكة</option><option>تحويل</option></select></td><td>${input('transaction_ref')}</td><td>${input('notes')}</td><td>${save()}</td></tr>
    ${rows.map(x=>`<tr><td><b>${h(x.payment_no)}</b></td><td>${h(x.paid_at||'')}</td><td>${h(x.supplier_no)}</td><td>${h(x.supplier_name)}</td><td>${h(x.invoice_no||'')}</td><td><b>${money(x.amount)}</b></td><td>${h(methodLabel(x.method))}</td><td>${h(x.transaction_ref||'')}</td><td>${h(x.notes||'')}</td><td></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function summaryView(d){const s=d.summary||{};return `<div class="supplier-sheet-note"><strong>الملخص يتحدث تلقائيًا</strong> من أوراق الموردين والفواتير والدفعات، ولا يحتاج إدخال يدوي.</div><div class="supplier-summary-grid"><div class="supplier-summary-card"><span>عدد الموردين</span><strong>${number(s.supplier_count)}</strong></div><div class="supplier-summary-card"><span>الرصيد الافتتاحي</span><strong>${money(s.opening_total)}</strong></div><div class="supplier-summary-card"><span>إجمالي الفواتير</span><strong>${money(s.invoice_total)}</strong></div><div class="supplier-summary-card"><span>إجمالي المسدد</span><strong>${money(s.paid_total)}</strong></div><div class="supplier-summary-card"><span>الرصيد المتبقي</span><strong>${money(s.balance_total)}</strong></div><div class="supplier-summary-card"><span>حسابات مسددة</span><strong>${number(s.paid_accounts)}</strong></div><div class="supplier-summary-card"><span>حسابات جزئية</span><strong>${number(s.partial_accounts)}</strong></div><div class="supplier-summary-card"><span>حسابات آجلة</span><strong>${number(s.due_accounts)}</strong></div></div><div class="supplier-workflow"><h3>طريقة العمل</h3><ol><li>اكتب اسم المورد وتاريخ فتح الحساب والرصيد الافتتاحي في تبويب الموردين.</li><li>سجّل كل فاتورة شراء في تبويب الفواتير مع كود المورد.</li><li>عند السداد سجّل الدفعة ورقم الفاتورة وطريقة السداد.</li><li>سيتحدث رصيد المورد وحالة الفاتورة والملخص تلقائيًا.</li></ol></div>`;}

  function supplierByCode(code){return (currentData?.suppliers||[]).find(x=>String(x.supplier_no).toLowerCase()===clean(code).toLowerCase());}
  function renderTab(){
    const area=$('#supplierSheetArea');if(!area)return;
    area.innerHTML=activeTab==='suppliers'?suppliersView(currentData):activeTab==='invoices'?invoicesView(currentData):activeTab==='payments'?paymentsView(currentData):summaryView(currentData);
    $$('[data-supplier-tab]').forEach(b=>b.classList.toggle('active',b.dataset.supplierTab===activeTab));
    if(activeTab==='suppliers'){
      bindRow($('#supplierEntryV30'),{calculate:r=>{const opening=num(val(r,'opening_balance'));setCalc(r,'invoice_total',money(0));setCalc(r,'paid_total',money(0));setCalc(r,'balance',money(opening));setCalc(r,'status',opening>0?'آجل':'مسدد');},saveRow:async r=>{const name=clean(val(r,'name'));if(!name)throw new Error('اكتب اسم المورد');await api('/api/supplier-excel/supplier',{method:'POST',body:{supplier_no:clean(val(r,'supplier_no')),name,account_opened_date:val(r,'account_opened_date')||today(),opening_balance:num(val(r,'opening_balance')),notes:clean(val(r,'notes'))}});toast('تم حفظ المورد');await refresh();}});
    }
    if(activeTab==='invoices'){
      bindRow($('#invoiceEntryV30'),{calculate:r=>{const s=supplierByCode(val(r,'supplier_no')),total=num(val(r,'total'));setCalc(r,'supplier_name',s?.name||'—');setCalc(r,'paid',money(0));setCalc(r,'remaining',money(total));setCalc(r,'status',total>0?'آجل':'—');},saveRow:async r=>{const code=clean(val(r,'supplier_no')),s=supplierByCode(code),total=num(val(r,'total'));if(!s)throw new Error('كود المورد غير موجود');if(total<=0)throw new Error('أدخل قيمة الفاتورة');await api('/api/supplier-excel/invoice',{method:'POST',body:{invoice_no:clean(val(r,'invoice_no')),invoice_date:val(r,'invoice_date')||today(),supplier_no:code,total,due_date:val(r,'due_date')||null,notes:clean(val(r,'notes'))}});toast('تم تسجيل فاتورة المورد');await refresh();}});
    }
    if(activeTab==='payments'){
      bindRow($('#paymentEntryV30'),{calculate:r=>{const s=supplierByCode(val(r,'supplier_no'));setCalc(r,'supplier_name',s?.name||'—');},saveRow:async r=>{const code=clean(val(r,'supplier_no')),s=supplierByCode(code),amount=num(val(r,'amount'));if(!s)throw new Error('كود المورد غير موجود');if(amount<=0)throw new Error('أدخل مبلغ السداد');await api('/api/supplier-excel/payment',{method:'POST',body:{payment_no:clean(val(r,'payment_no')),paid_at:val(r,'paid_at')||today(),supplier_no:code,invoice_no:clean(val(r,'invoice_no')),amount,method:methodValue(val(r,'method')),transaction_ref:clean(val(r,'transaction_ref')),notes:clean(val(r,'notes')),idempotency_key:crypto.randomUUID()}});toast('تم تسجيل الدفعة وتحديث رصيد المورد');await refresh();}});
    }
  }

  async function refresh(){currentData=await loadData();renderTab();}

  renderPurchases=async function(){
    activeTab=activeTab||'suppliers';
    $('#content').innerHTML=shell();
    $$('#content [data-supplier-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.supplierTab;renderTab();});
    $('#supplierExcelRefresh').onclick=refresh;
    await refresh();
  };

  // اسم الصفحة في الوضع المبسط.
  try{
    const p=pages.find(x=>x.id==='purchases');if(p)p.label='الموردين';
  }catch{}
})();
