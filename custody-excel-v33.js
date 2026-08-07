'use strict';
(() => {
  const num=v=>Number(v||0)||0;
  const clean=v=>String(v??'').trim();
  const h=v=>escapeHtml(String(v??''));
  const today=()=>new Date().toISOString().slice(0,10);
  let data=null;

  const statusOptions=v=>`<option value="لم تتم" ${v==='لم تتم'?'selected':''}>لم تتم</option><option value="تم التصفية" ${v==='تم التصفية'?'selected':''}>تم التصفية</option>`;
  const input=(name,type='text',value='',extra='')=>`<input class="custody-excel-input" name="${name}" type="${type}" value="${h(value)}" ${extra}>`;
  const select=(name,value='لم تتم')=>`<select class="custody-excel-input" name="${name}">${statusOptions(value)}</select>`;

  function rowHtml(x={},isNew=false){
    const remaining=num(x.custody_amount)-num(x.invoices_amount);
    return `<tr class="custody-excel-row ${isNew?'is-new':''}" data-custody-id="${h(x.id||'')}">
      <td>${input('holder_name','text',x.holder_name||'','placeholder="الاسم"')}</td>
      <td>${input('custody_date','date',x.custody_date||today())}</td>
      <td>${input('custody_amount','number',x.custody_amount??0,'min="0" step="0.01"')}</td>
      <td>${input('invoices_amount','number',x.invoices_amount??0,'min="0" step="0.01"')}</td>
      <td class="custody-remaining ${remaining<0?'negative':remaining>0?'positive':'zero'}"><span data-custody-remaining>${money(remaining)}</span></td>
      <td>${input('notes','text',x.notes||'','placeholder="ملاحظات"')}</td>
      <td>${select('settlement_status',x.settlement_status||'لم تتم')}</td>
      <td class="custody-actions"><button type="button" class="custody-save" title="حفظ">✓</button>${isNew?'':`<button type="button" class="custody-delete" title="حذف">×</button>`}</td>
    </tr>`;
  }

  async function load(){
    try{return await api('/api/custody-excel');}
    catch(err){
      if(!/get_custody_excel_system_v33|schema cache|PGRST202|Could not find the function/i.test(String(err?.message||'')))throw err;
      const month=state.cache.shopMonth||new Date().toISOString().slice(0,7);
      const d=await api(`/api/shop-system?month=${month}-01`);
      return {rows:d.custodies||[],summary:d.custody_summary||{},compatibility_mode:true};
    }
  }

  function shell(){
    const s=data?.summary||{},rows=data?.rows||[];
    state.cache.shopCurrentRows=rows.map(x=>({
      الاسم:x.holder_name,التاريخ:x.custody_date,العهدة:x.custody_amount,
      'قيمة الفواتير':x.invoices_amount,المتبقي:x.remaining,
      ملاحظات:x.notes,'حالة التصفية':x.settlement_status
    }));
    return `<div class="custody-excel-shell">
      ${data?.compatibility_mode?'<div class="custody-warning">قاعدة البيانات لم تُركب عليها ترقية V33 بعد؛ شغّل ملف SQL المرفق حتى تظهر جميع بيانات Excel وحالة التصفية اليدوية كما في الملف.</div>':''}
      <div class="custody-title"><div><h3>كشف العهد</h3><p>نفس طريقة ورقة Excel: الإدخال والتعديل مباشرة داخل الخلايا.</p></div></div>
      <div class="custody-note">المتبقي يُحسب تلقائيًا: <b>العهدة − قيمة الفواتير</b>. إذا كانت الفواتير أكبر من العهدة يظهر المتبقي بالسالب واللون الأحمر. <b>حالة التصفية اختيار يدوي</b> مثل ملف Excel.</div>
      <div class="custody-summary">
        <div><span>عدد العهد</span><strong>${number(s.count||0)}</strong></div>
        <div><span>تمت التصفية</span><strong>${number(s.settled_count||0)}</strong></div>
        <div><span>إجمالي العهد</span><strong>${money(s.custody_total||0)}</strong></div>
        <div><span>إجمالي المتبقي</span><strong>${money(s.remaining_total||0)}</strong></div>
      </div>
      <section class="panel"><div class="table-wrap"><table class="data-table custody-excel-table">
        <thead><tr><th>الاسم</th><th>التاريخ</th><th>العهدة</th><th>قيمة الفواتير</th><th>المتبقي</th><th>ملاحظات</th><th>حالة التصفية</th><th></th></tr></thead>
        <tbody>${rowHtml({},true)}${rows.map(x=>rowHtml(x,false)).join('')}</tbody>
      </table></div></section>
      <div class="custody-legend">دلالة المتبقي: موجب = توجد عهدة متبقية | صفر = تمت التسوية المالية | سالب = قيمة الفواتير أعلى من مبلغ العهدة. حالة التصفية تبقى حسب اختيارك اليدوي.</div>
    </div>`;
  }

  function updateRemaining(row){
    const r=num(row.querySelector('[name="custody_amount"]')?.value)-num(row.querySelector('[name="invoices_amount"]')?.value);
    const cell=row.querySelector('.custody-remaining');
    if(cell){cell.classList.toggle('negative',r<0);cell.classList.toggle('positive',r>0);cell.classList.toggle('zero',Math.abs(r)<=.001);}
    const span=row.querySelector('[data-custody-remaining]');if(span)span.textContent=money(r);
  }

  async function saveRow(row){
    if(row.dataset.saving==='1')return;
    row.dataset.saving='1';row.classList.add('saving');
    const btn=row.querySelector('.custody-save');if(btn)btn.disabled=true;
    try{
      const payload={
        holder_name:clean(row.querySelector('[name="holder_name"]')?.value),
        custody_date:row.querySelector('[name="custody_date"]')?.value,
        custody_amount:num(row.querySelector('[name="custody_amount"]')?.value),
        invoices_amount:num(row.querySelector('[name="invoices_amount"]')?.value),
        notes:clean(row.querySelector('[name="notes"]')?.value),
        settlement_status:row.querySelector('[name="settlement_status"]')?.value||'لم تتم'
      };
      if(!payload.holder_name)throw new Error('اكتب الاسم');
      if(!payload.custody_date)throw new Error('اختر التاريخ');
      if(payload.custody_amount<0||payload.invoices_amount<0)throw new Error('القيم لا يمكن أن تكون سالبة');
      await api('/api/custody-excel/row',{method:'POST',body:{id:row.dataset.custodyId||null,...payload}});
      toast(row.dataset.custodyId?'تم تحديث العهدة':'تم حفظ العهدة');
      await refresh();
    }catch(err){toast(err?.message||'تعذر حفظ العهدة','error');row.classList.add('row-error');setTimeout(()=>row.classList.remove('row-error'),1200);}
    finally{row.dataset.saving='0';row.classList.remove('saving');if(btn)btn.disabled=false;}
  }

  function bindRow(row){
    const fields=[...row.querySelectorAll('.custody-excel-input')];
    row.querySelectorAll('[name="custody_amount"],[name="invoices_amount"]').forEach(el=>{el.addEventListener('input',()=>updateRemaining(row));el.addEventListener('change',()=>updateRemaining(row));});
    fields.forEach((el,i)=>el.addEventListener('keydown',async e=>{
      if(e.key!=='Enter')return;e.preventDefault();
      if(i<fields.length-1){fields[i+1]?.focus();fields[i+1]?.select?.();return;}
      await saveRow(row);
    }));
    row.querySelector('.custody-save')?.addEventListener('click',()=>saveRow(row));
    row.querySelector('.custody-delete')?.addEventListener('click',async()=>{
      if(!confirm('حذف هذه العهدة؟'))return;
      const reason=prompt('سبب الحذف:','تصحيح كشف العهد')||'تصحيح كشف العهد';
      await api(`/api/shop-system/custodies/${row.dataset.custodyId}`,{method:'DELETE',body:{reason}});
      toast('تم حذف العهدة');await refresh();
    });
    updateRemaining(row);
  }

  function bind(){
    $$('.custody-excel-row').forEach(bindRow);
    setTimeout(()=>$('.custody-excel-row.is-new [name="holder_name"]')?.focus(),40);
  }
  function render(){const area=$('#shopTabArea');if(!area)return;area.innerHTML=shell();bind();}
  async function refresh(){data=await load();render();}

  const previousRenderShopTab=renderShopTab;
  renderShopTab=function(tab,d){
    if(tab!=='custodies')return previousRenderShopTab(tab,d);
    state.cache.shopTab='custodies';
    const area=$('#shopTabArea');if(area)area.innerHTML='<div class="custody-loading">جاري تحميل كشف العهد…</div>';
    refresh().catch(err=>{if(area)area.innerHTML=`<div class="empty-state"><h3>تعذر تحميل كشف العهد</h3><p>${h(err?.message||err)}</p></div>`;});
  };
})();
