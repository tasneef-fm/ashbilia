'use strict';
(() => {
  const today=()=>new Date().toISOString().slice(0,10);
  const num=v=>Number(v||0)||0;
  const clean=v=>String(v??'').trim();
  const h=v=>escapeHtml(String(v??''));
  const val=(row,name)=>row.querySelector(`[name="${name}"]`)?.value??'';
  const setCalc=(row,key,value)=>{const e=row.querySelector(`[data-calc="${key}"]`);if(e)e.textContent=value;};
  const input=(name,type='text',extra='')=>`<input class="booking-grid-input ${name==='customer_name'?'customer':''} ${name==='notes'?'notes':''}" type="${type}" name="${name}" ${extra}>`;
  const calc=(key,text='—')=>`<span class="booking-grid-calc" data-calc="${key}">${text}</span>`;
  const save=()=>`<button type="button" class="booking-grid-save" data-booking-row-save title="حفظ السطر">✓</button>`;
  let currentData=null;
  let searchText='';

  function bindRow(row){
    if(!row)return;
    const fields=[...row.querySelectorAll('.booking-grid-input:not([disabled])')];
    const run=()=>{
      const paid=num(val(row,'paid_amount')),remaining=num(val(row,'remaining_amount')),total=paid+remaining;
      setCalc(row,'total_amount',money(total));
      setCalc(row,'paid_status',remaining<=0.01&&total>0?'نعم':'لا');
    };
    fields.forEach((el,i)=>{
      el.addEventListener('input',run);el.addEventListener('change',run);
      el.addEventListener('keydown',async e=>{
        if(e.key!=='Enter'||el.tagName==='TEXTAREA')return;
        e.preventDefault();
        if(i<fields.length-1){fields[i+1]?.focus();fields[i+1]?.select?.();return;}
        await submit();
      });
    });
    row.querySelector('[data-booking-row-save]')?.addEventListener('click',submit);
    async function submit(){
      if(row.dataset.saving==='1')return;
      row.dataset.saving='1';row.classList.add('saving');const b=row.querySelector('[data-booking-row-save]');if(b)b.disabled=true;
      try{
        run();
        const name=clean(val(row,'customer_name')),date=val(row,'booking_date'),paid=num(val(row,'paid_amount')),remaining=num(val(row,'remaining_amount'));
        if(!name)throw new Error('اكتب اسم العميل');
        if(!date)throw new Error('اختر تاريخ الحجز');
        if(paid<0||remaining<0)throw new Error('المبالغ لا يمكن أن تكون سالبة');
        if(paid+remaining<=0)throw new Error('أدخل المبلغ المدفوع أو المتبقي');
        await api('/api/booking-excel/booking',{method:'POST',body:{booking_date:date,customer_name:name,paid_amount:paid,remaining_amount:remaining,notes:clean(val(row,'notes')),idempotency_key:crypto.randomUUID()}});
        toast('تم حفظ الحجز وتحديث الملخص');await refresh();
      }catch(err){toast(err?.message||'تعذر حفظ الحجز','error');row.classList.add('row-error');setTimeout(()=>row.classList.remove('row-error'),1200);}
      finally{row.dataset.saving='0';row.classList.remove('saving');if(b)b.disabled=false;}
    }
    run();setTimeout(()=>fields[0]?.focus(),40);
  }

  async function loadData(){
    try{return await api('/api/booking-excel');}
    catch(err){
      if(!/get_booking_excel_system_v32|schema cache|PGRST202|Could not find the function/i.test(String(err?.message||'')))throw err;
      const d=await api('/api/bookings?page=1&page_size=200&search=');
      const rows=(d.items||[]).map((x,i)=>({id:x.id,excel_no:i+1,booking_no:x.booking_no,booking_date_display:String(x.start_at||'').slice(0,10),booking_date:String(x.start_at||'').slice(0,10),customer_name:x.customer_name,total_amount:num(x.budget),paid_amount:num(x.paid_amount),remaining_amount:Math.max(0,num(x.budget)-num(x.paid_amount)),notes:x.details||'',paid_status:num(x.budget)>0&&num(x.budget)-num(x.paid_amount)<=.01?'نعم':'لا',has_difference:false}));
      return {rows,summary:{count:rows.length,paid_count:rows.filter(x=>x.paid_status==='نعم').length,total:rows.reduce((a,b)=>a+num(b.total_amount),0),paid:rows.reduce((a,b)=>a+num(b.paid_amount),0),remaining:rows.reduce((a,b)=>a+num(b.remaining_amount),0)},compatibility_mode:true};
    }
  }

  function statusPill(v){return `<span class="booking-paid-status ${v==='نعم'?'yes':'no'}">${h(v||'لا')}</span>`;}
  function displayDate(x){return h(x.booking_date_display||x.booking_date||'');}
  function filteredRows(){const rows=currentData?.rows||[];if(!searchText)return rows;const s=searchText.toLowerCase();return rows.filter(x=>`${x.excel_no||''} ${x.booking_no||''} ${x.customer_name||''} ${x.notes||''} ${x.booking_date_display||''}`.toLowerCase().includes(s));}

  function shell(){
    const s=currentData?.summary||{};
    const rows=filteredRows();state.cache.bookings=rows;state.cache.shopCurrentRows=rows;
    return `<div class="booking-excel-shell">
      <div class="booking-excel-title"><div><h2>كشف الحجوزات</h2><p>نفس ترتيب وطريقة عمل ملف Excel المرفق — الإدخال مباشرة داخل الخلايا والحساب تلقائي.</p></div><div class="booking-excel-actions"><input class="search" id="bookingExcelSearch" value="${h(searchText)}" placeholder="بحث برقم الحجز أو اسم العميل"><button class="btn btn-outline" id="bookingExcelRefresh">تحديث</button></div></div>
      ${currentData?.compatibility_mode?'<div class="booking-compat-warning">قاعدة البيانات لم تُركب عليها ترقية V32 بعد؛ العرض الحالي وضع توافق. شغّل ملف SQL المرفق لعرض بيانات Excel الأصلية وحفظها بنفس الآلية.</div>':''}
      <div class="booking-sheet-tabs"><div class="booking-sheet-tab">كشف الحجوزات</div></div>
      <div class="booking-sheet-note"><strong>آلية Excel:</strong> اكتب تاريخ الحجز واسم العميل ثم «المدفوع» و«المتبقي». <b>المبلغ = المدفوع + المتبقي</b> تلقائيًا، و«تم السداد» تصبح نعم عندما يكون المتبقي صفرًا. Tab ينتقل للخلية التالية وEnter في آخر خلية يحفظ السطر.</div>
      <div class="booking-summary-grid"><div class="booking-summary-card"><span>عدد الحجوزات الفعلية</span><strong>${number(s.count||0)}</strong></div><div class="booking-summary-card"><span>الحجوزات المسددة</span><strong>${number(s.paid_count||0)}</strong></div><div class="booking-summary-card"><span>إجمالي المبلغ</span><strong>${money(s.total||0)}</strong></div><div class="booking-summary-card"><span>إجمالي المدفوع</span><strong>${money(s.paid||0)}</strong></div><div class="booking-summary-card"><span>إجمالي المتبقي</span><strong>${money(s.remaining||0)}</strong></div></div>
      <section class="panel"><div class="table-wrap"><table class="data-table booking-excel-table"><thead><tr><th>رقم الحجز</th><th>تاريخ الحجز</th><th>اسم العميل</th><th>المبلغ</th><th>المبلغ المدفوع</th><th>المبلغ المتبقي</th><th>ملاحظات</th><th>تم السداد</th><th></th></tr></thead><tbody>
        <tr class="booking-entry-row" id="bookingEntryV32"><td>${calc('booking_no','تلقائي')}</td><td>${input('booking_date','date',`value="${today()}"`)}</td><td>${input('customer_name','text','placeholder="اسم العميل"')}</td><td>${calc('total_amount',money(0))}</td><td>${input('paid_amount','number','min="0" step="0.01" value="0"')}</td><td>${input('remaining_amount','number','min="0" step="0.01" value="0"')}</td><td>${input('notes','text','placeholder="اختياري"')}</td><td>${calc('paid_status','لا')}</td><td>${save()}</td></tr>
        ${rows.map(x=>`<tr><td><b>${h(x.excel_no??x.booking_no)}</b></td><td>${displayDate(x)}</td><td><b>${h(x.customer_name)}</b></td><td class="${x.has_difference?'booking-amount-mismatch':''}">${money(x.total_amount)}${x.has_difference?'<span class="mismatch-icon" title="القيمة الأصلية في Excel لا تساوي المدفوع + المتبقي">⚠</span>':''}</td><td>${money(x.paid_amount)}</td><td><b>${money(x.remaining_amount)}</b></td><td>${h(x.notes||'')}</td><td>${statusPill(x.paid_status)}</td><td>${num(x.remaining_amount)>0?`<button class="booking-row-action" data-booking-excel-pay="${x.id}" data-name="${h(x.customer_name)}" data-remaining="${num(x.remaining_amount)}">دفعة</button>`:''}</td></tr>`).join('')}
      </tbody></table></div></section>
    </div>`;
  }

  function bindActions(){
    bindRow($('#bookingEntryV32'));
    $('#bookingExcelRefresh')?.addEventListener('click',refresh);
    const search=$('#bookingExcelSearch');if(search)search.oninput=e=>{searchText=e.target.value.trim();render();};
    $$('[data-booking-excel-pay]').forEach(b=>b.onclick=()=>{
      const remaining=num(b.dataset.remaining),name=b.dataset.name;
      openForm(`دفعة حجز — ${name}`,`<form class="form-grid single"><div class="demo-note">المتبقي الحالي: <b>${money(remaining)}</b></div><label>المبلغ<input type="number" name="amount" min="0.01" max="${remaining}" step="0.01" required autofocus></label><label>طريقة السداد<select name="method"><option value="cash">كاش</option><option value="mada">شبكة</option><option value="bank_transfer">تحويل</option></select></label><label>ملاحظات<input name="notes"></label><button class="btn btn-primary" type="submit">تسجيل الدفعة</button></form>`,async d=>{const amount=num(d.amount);if(amount<=0)throw new Error('أدخل مبلغ الدفعة');await api('/api/booking-excel/payment',{method:'POST',body:{booking_id:b.dataset.bookingExcelPay,amount,method:d.method||'cash',notes:clean(d.notes),idempotency_key:crypto.randomUUID()}});toast('تم تسجيل الدفعة وتحديث المتبقي');await refresh();});
    });
  }
  function render(){$('#content').innerHTML=shell();bindActions();}
  async function refresh(){currentData=await loadData();render();}

  renderBookings=async function(){searchText='';await refresh();};
  try{const p=pages.find(x=>x.id==='bookings');if(p)p.label='الحجوزات';}catch{}
})();
