
'use strict';
(() => {
  const api44=(u,o)=>api(u,o);
  const bilingualName=p=>`${escapeHtml(p?.name_ar||'—')}${p?.name_en?`<small dir="ltr">${escapeHtml(p.name_en)}</small>`:'<small class="missing-en" dir="ltr">English name not set</small>'}`;
  const productEnglish=p=>String(p?.name_en||'').trim();

  async function loadAllActiveProductsV44(){
    const all=[];let page=1,pages=1;
    do{const d=await api44(`/api/products?active=1&page=${page}&page_size=100`);all.push(...(d.items||[]));pages=Number(d.pages||1);page++;}while(page<=pages);
    return all;
  }

  function barcodeSvgV44(product){
    if(!product?.barcode||!window.JsBarcode)return '';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    try{JsBarcode(svg,product.barcode,{format:/^\\d{13}$/.test(String(product.barcode))?'EAN13':'CODE128',displayValue:true,fontSize:12,height:42,margin:4});return svg.outerHTML;}catch{return '';}
  }
  function barcodeLabelV44(p){
    const en=productEnglish(p)||p.name_ar||'—';
    return `<div class="label"><b class="ar">${escapeHtml(p.name_ar||'—')}</b><b class="en" dir="ltr">${escapeHtml(en)}</b><small>${escapeHtml(p.sku||'')}</small><span>${money(p.sale_price)}</span>${barcodeSvgV44(p)}</div>`;
  }
  function printBarcodeSelectionsV44(selections){
    const labels=[];
    selections.forEach(({product,copies})=>{for(let i=0;i<copies;i++)labels.push(barcodeLabelV44(product));});
    if(!labels.length)return toast('حدد منتجًا واحدًا على الأقل للطباعة','error');
    const w=window.open('','_blank');if(!w)return toast('اسمح بالنوافذ المنبثقة للطباعة','error');
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملصقات الباركود</title><style>@page{margin:5mm}.sheet{display:flex;flex-wrap:wrap;gap:2mm}.label{width:48mm;min-height:33mm;border:1px dashed #bbb;padding:2.4mm;box-sizing:border-box;text-align:center;font-family:Arial}.label b,.label span,.label small{display:block}.label .ar{font-size:12px}.label .en{font-size:10px;margin-top:1px}.label small{font-size:9px;color:#555}.label span{font-size:10px;font-weight:700}.label svg{max-width:100%;height:15mm}</style></head><body><div class="sheet">${labels.join('')}</div><script>onload=()=>print()<\\/script></body></html>`);w.document.close();
  }
  async function openBarcodePrintManagerV44(){
    if(!guard('products.print'))return;
    const [products,catsResult]=await Promise.all([loadAllActiveProductsV44(),api44('/api/categories')]);
    const categories=catsResult.items||[];
    const printable=products.filter(p=>p.barcode);
    if(!printable.length)return toast('لا توجد باركودات للطباعة','error');
    openForm('طباعة الباركودات حسب التصنيف',`
      <div class="span-2 v44-barcode-toolbar">
        <label>اختيار التصنيف<select id="v44BarcodeCategory"><option value="">كل التصنيفات / All Categories</option>${categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name_ar||'')} / ${escapeHtml(c.name_en||'')}</option>`).join('')}</select></label>
        <button type="button" class="btn btn-outline" id="v44SelectAllBarcodes">تحديد الكل</button>
        <button type="button" class="btn btn-outline" id="v44ClearAllBarcodes">إلغاء التحديد</button>
      </div>
      <div class="span-2 demo-note">اختر التصنيف، ثم حدد المنتجات المطلوبة واكتب <b>عدد النسخ لكل منتج</b> بشكل مستقل.</div>
      <div class="span-2 table-wrap" style="max-height:470px"><table class="data-table v44-barcode-table"><thead><tr><th>✓</th><th>المنتج عربي / English</th><th>الكود</th><th>الباركود</th><th>عدد النسخ</th></tr></thead><tbody id="v44BarcodeRows"></tbody></table></div>
      <div class="span-2 toolbar"><button type="button" class="btn btn-primary" id="v44PrintSelectedBarcodes">طباعة المحدد</button><span class="kpi-pill" id="v44BarcodeCount"></span></div>`,()=>{});
    setTimeout(()=>{
      const cat=$('#v44BarcodeCategory'),body=$('#v44BarcodeRows'),count=$('#v44BarcodeCount');
      const render=()=>{
        const list=printable.filter(p=>!cat.value||String(p.category_id)===String(cat.value));
        body.innerHTML=list.map(p=>`<tr data-v44-product="${p.id}"><td><input type="checkbox" data-v44-pick checked></td><td class="v44-bilingual-name"><b>${escapeHtml(p.name_ar||'—')}</b>${p.name_en?`<small dir="ltr">${escapeHtml(p.name_en)}</small>`:'<small class="missing-en">English name not set</small>'}</td><td>${escapeHtml(p.sku||'')}</td><td dir="ltr">${escapeHtml(p.barcode||'')}</td><td><input type="number" data-v44-copies min="0" max="100" step="1" value="1"></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">لا توجد منتجات بهذا التصنيف</div></td></tr>';
        count.textContent=`${list.length} منتج`;
      };
      cat.onchange=render;render();
      $('#v44SelectAllBarcodes').onclick=()=>$$('[data-v44-pick]',body).forEach(x=>x.checked=true);
      $('#v44ClearAllBarcodes').onclick=()=>$$('[data-v44-pick]',body).forEach(x=>x.checked=false);
      $('#v44PrintSelectedBarcodes').onclick=()=>{
        const selections=[];$$('tr[data-v44-product]',body).forEach(row=>{if(!$('[data-v44-pick]',row)?.checked)return;const p=printable.find(x=>String(x.id)===row.dataset.v44Product),copies=Math.max(0,Math.min(100,Number($('[data-v44-copies]',row)?.value)||0));if(p&&copies>0)selections.push({product:p,copies});});
        printBarcodeSelectionsV44(selections);
      };
    },0);
  }
  function printSingleBarcodeV44(product){
    if(!product?.barcode)return toast('أضف باركود للصنف أولًا','error');
    const count=Math.max(1,Math.min(100,Number(prompt('عدد النسخ لهذا المنتج','1'))||1));
    printBarcodeSelectionsV44([{product,copies:count}]);
  }

  // Product form: English name is mandatory for future products.
  const previousProductFormV44=productForm;
  productForm=function(p=null){
    previousProductFormV44(p);
    setTimeout(()=>{const form=$('#productFinanceForm');if(!form)return;let en=$('[name="name_en"]',form);if(!en){const ar=$('[name="name_ar"]',form)?.closest('label');if(ar){ar.insertAdjacentHTML('afterend',`<label>اسم المنتج بالإنجليزي<input name="name_en" dir="ltr" value="${escapeHtml(p?.name_en||'')}" required placeholder="English product name"></label>`);en=$('[name="name_en"]',form);}}if(en)en.required=true;},10);
  };

  const previousRenderProductRowsV44=renderProductRows;
  renderProductRows=function(items){
    previousRenderProductRowsV44(items);
    setTimeout(()=>items.forEach(p=>{
      const edit=$(`[data-record-edit="product"][data-id="${p.id}"]`),row=edit?.closest('tr');if(!row)return;
      const nameCell=row.children?.[0];if(nameCell){const box=nameCell.querySelector('div>div');if(box)box.innerHTML=`<b>${escapeHtml(p.name_ar||'—')}</b>${p.name_en?`<small class="product-name-en" dir="ltr">${escapeHtml(p.name_en)}</small>`:'<small class="product-name-en" dir="ltr">English name not set</small>'}<small>${escapeHtml(p.unit||'قطعة')}${isServiceProduct(p)?' · سعر يدوي':''}</small>`;}
      const pb=row.querySelector(`[data-v27-barcode-print="${p.id}"]`);if(pb)pb.onclick=()=>printSingleBarcodeV44(p);
    }),0);
  };
  const previousRenderProductsV44=renderProducts;
  renderProducts=async function(options={}){
    await previousRenderProductsV44(options);
    const print=$('#v27PrintBarcodes');if(print){print.textContent='طباعة الباركودات حسب التصنيف';print.onclick=openBarcodePrintManagerV44;}
  };

  // POS: always show Arabic + English names.
  posProductCards=function(items){return (items||[]).map(p=>{const service=isServiceProduct(p);return `<article class="pos-card ${service?'service-pos-card':''}"><img ${productImageAttrs(p.image_url,p.image_storage_path,p.name_ar)}><div><h4>${escapeHtml(p.name_ar||'—')}</h4>${p.name_en?`<div class="product-name-en" dir="ltr">${escapeHtml(p.name_en)}</div>`:''}<small>${service?'خدمة · بدون خصم مخزون':`${number(p.available_qty)} ${escapeHtml(p.unit)}`}</small><div class="product-foot"><b>${service?'اكتب السعر عند البيع':money(p.sale_price)}</b><button class="add-btn" data-pos-add="${p.id}" ${!service&&Number(p.available_qty)<=0?'disabled':''}>+</button></div></div></article>`;}).join('');};
  const previousRenderPosCartV44=renderPosCart;
  renderPosCart=function(){
    const result=previousRenderPosCartV44();
    setTimeout(()=>$$('.v27-cart-line').forEach((row,idx)=>{const line=state.posCart[idx],p=state.cache.products?.find(x=>String(x.id)===String(line?.product_id));if(!p?.name_en)return;const name=row.querySelector('.v27-cart-name b');if(name&&!row.querySelector('.v44-cart-en'))name.insertAdjacentHTML('afterend',`<small class="v44-cart-en product-name-en" dir="ltr">${escapeHtml(p.name_en)}</small>`);}),0);
    return result;
  };
  const previousRenderPOSV44=renderPOS;
  renderPOS=async function(){await previousRenderPOSV44();const products=state.cache.products||[];const search=$('#posSearch');if(search)search.oninput=e=>$('#posProducts').innerHTML=posProductCards(products.filter(p=>`${p.name_ar||''} ${p.name_en||''} ${p.sku||''} ${p.barcode||''}`.toLowerCase().includes(e.target.value.toLowerCase())));};

  // Employee credentials management. Existing passwords cannot be retrieved; reset creates a visible temporary password.
  async function accountRowsV44(){const d=await api44('/api/access/employee-users');return d.items||[];}
  async function resetPasswordV44(account,password=null){
    const pwd=password||generateEmployeeTempPassword();
    const r=await api44(`/api/access/employee-users/${account.employee_id}/reset-password`,{method:'POST',body:{password:pwd,reason:'إعادة تعيين من شاشة بيانات دخول الموظفين V44'}});
    return {...account,username:r?.username||account.username,password:pwd};
  }
  function showCredentialResultV44(row,title='بيانات الدخول الجديدة'){
    $('#formModalContent').innerHTML=`<h2>${escapeHtml(title)}</h2><div class="v44-credentials-note">تم تعيين كلمة مرور مؤقتة جديدة. <b>احفظها الآن</b>؛ لن يستطيع النظام إظهارها مرة أخرى بعد إغلاق هذه الشاشة.</div><div class="metrics">${metricHtml('الموظف',escapeHtml(row.name||''))}${metricHtml('اسم المستخدم',`<span class="v44-login-user">${escapeHtml(row.username||'')}</span>`)}</div><div class="v44-password-result">${escapeHtml(row.password||'')}</div><div class="toolbar"><button class="btn btn-primary" id="v44CopyLogin">نسخ اليوزر وكلمة المرور</button><button class="btn btn-outline" id="v44PrintOneLogin">طباعة</button><button class="btn btn-outline" data-close="formModal">إغلاق</button></div>`;
    $('#v44CopyLogin').onclick=async()=>{await navigator.clipboard?.writeText(`Username: ${row.username}\
Password: ${row.password}`);toast('تم نسخ بيانات الدخول');};
    $('#v44PrintOneLogin').onclick=()=>printEmployeeCredentials([row]);
  }
  async function openOneEmployeeLoginV44(employeeId){
    if(!guard('users.create'))return;const all=await accountRowsV44();const a=all.find(x=>String(x.employee_id)===String(employeeId));if(!a)return toast('الموظف غير موجود','error');
    if(!a.has_user_account)return openBulkEmployeeUsers();
    openForm(`بيانات دخول — ${a.name}`,`<div class="span-2 metrics">${metricHtml('الموظف',escapeHtml(a.name||''))}${metricHtml('اسم المستخدم',`<span class="v44-login-user">${escapeHtml(a.username||'—')}</span>`)}</div><div class="span-2 v44-credentials-note"><b>كلمة المرور الحالية لا يمكن عرضها</b> لأن Supabase يخزنها مشفرة. إذا نسي الموظف كلمة المرور، عيّن كلمة مرور مؤقتة جديدة وستظهر لك فورًا.</div><label class="span-2">كلمة مرور مؤقتة جديدة<input id="v44NewEmployeePassword" dir="ltr" value="${escapeHtml(generateEmployeeTempPassword())}" minlength="10"></label><div class="span-2"><button type="button" class="btn btn-primary" id="v44ResetEmployeePassword">إعادة تعيين كلمة المرور وإظهارها</button></div>`,()=>{});
    setTimeout(()=>$('#v44ResetEmployeePassword').onclick=async()=>{const pwd=$('#v44NewEmployeePassword').value;if(String(pwd).length<10)return toast('كلمة المرور يجب ألا تقل عن 10 أحرف','error');if(!confirm(`سيتم تغيير كلمة مرور ${a.name}. كلمة المرور القديمة ستتوقف عن العمل. متابعة؟`))return;const r=await resetPasswordV44(a,pwd);showCredentialResultV44(r);},0);
  }
  async function openEmployeeLoginManagerV44(){
    if(!guard('users.create'))return;const all=(await accountRowsV44()).filter(x=>x.is_active!==false);const linked=all.filter(x=>x.has_user_account);
    openForm('بيانات دخول الموظفين',`<div class="span-2 v44-credentials-note">يمكن إظهار <b>اسم المستخدم</b> دائمًا. كلمات المرور القديمة لا يمكن استرجاعها؛ لإظهار كلمة مرور يجب إعادة تعيينها إلى كلمة مؤقتة جديدة.</div><div class="span-2 table-wrap" style="max-height:470px"><table class="data-table"><thead><tr><th>الموظف</th><th>الكود</th><th>اسم المستخدم</th><th>الحساب</th><th>إجراء</th></tr></thead><tbody>${all.map(a=>`<tr><td>${escapeHtml(a.name||'')}</td><td>${escapeHtml(a.employee_no||'')}</td><td class="v44-login-user">${escapeHtml(a.username||'—')}</td><td>${a.has_user_account?'<span class="status green">جاهز</span>':'<span class="status amber">بدون حساب</span>'}</td><td>${a.has_user_account?`<button type="button" class="mini-btn" data-v44-reset-one="${a.employee_id}">كلمة مرور جديدة</button>`:'<span>أنشئ الحساب أولًا</span>'}</td></tr>`).join('')}</tbody></table></div><div class="span-2 toolbar"><button type="button" class="btn btn-primary" id="v44ResetAllPasswords" ${linked.length?'':'disabled'}>إنشاء كلمات مرور جديدة لكل الحسابات وعرض الكشف</button><button type="button" class="btn btn-outline" id="v44CreateMissingUsers">إنشاء الحسابات الناقصة</button></div>`,()=>{});
    setTimeout(()=>{
      $$('[data-v44-reset-one]').forEach(b=>b.onclick=()=>openOneEmployeeLoginV44(b.dataset.v44ResetOne));
      $('#v44CreateMissingUsers').onclick=openBulkEmployeeUsers;
      $('#v44ResetAllPasswords').onclick=async()=>{
        if(!confirm(`سيتم تغيير كلمات المرور لـ ${linked.length} موظف وإنشاء كشف جديد. كلمات المرور القديمة ستتوقف عن العمل. متابعة؟`))return;
        const btn=$('#v44ResetAllPasswords');btn.disabled=true;const success=[],failed=[];
        for(let i=0;i<linked.length;i++){btn.textContent=`جاري التحديث ${i+1} / ${linked.length}`;try{success.push(await resetPasswordV44(linked[i]));}catch(e){failed.push({...linked[i],error:e.message});}}
        const failedHtml=failed.length?`<div class="status red">تعذر تحديث ${failed.length}: ${failed.map(x=>escapeHtml(x.name)).join('، ')}</div>`:'';
        $('#formModalContent').innerHTML=`<h2>كشف اليوزرات وكلمات المرور الجديدة</h2><div class="v44-credentials-note">احفظ هذا الكشف الآن. كلمات المرور المعروضة مؤقتة ولن يمكن استرجاعها من النظام بعد إغلاق النافذة.</div>${failedHtml}<div class="table-wrap"><table class="data-table"><thead><tr><th>الموظف</th><th>اسم المستخدم</th><th>كلمة المرور المؤقتة</th></tr></thead><tbody>${success.map(r=>`<tr><td>${escapeHtml(r.name||'')}</td><td class="v44-login-user">${escapeHtml(r.username||'')}</td><td class="v44-login-user">${escapeHtml(r.password||'')}</td></tr>`).join('')}</tbody></table></div><div class="toolbar"><button class="btn btn-primary" id="v44DownloadCredentials">تنزيل الكشف</button><button class="btn btn-outline" id="v44PrintCredentials">طباعة</button><button class="btn btn-outline" data-close="formModal">إغلاق</button></div>`;
        $('#v44DownloadCredentials').onclick=()=>downloadEmployeeCredentials(success);$('#v44PrintCredentials').onclick=()=>printEmployeeCredentials(success);
      };
    },0);
  }

  function enhanceEmployeeRowsV44(accounts){
    const map=new Map((accounts||[]).map(a=>[String(a.employee_id),a]));
    (state.cache.employees||[]).forEach(e=>{
      const anchor=$(`[data-employee-edit="${e.id}"]`)||$(`[data-employee-status="${e.id}"]`);const row=anchor?.closest('tr');if(!row)return;const a=map.get(String(e.id));const accountCell=row.children?.[6];
      if(accountCell)accountCell.innerHTML=a?.has_user_account?`<span class="status green">مرتبط</span><small class="v44-login-user">${escapeHtml(a.username||'')}</small>`:'<span class="status amber">بدون حساب</span>';
      const actions=row.querySelector('.table-actions');if(actions&&!actions.querySelector('[data-v44-login]'))actions.insertAdjacentHTML('afterbegin',`<button class="mini-btn" data-v44-login="${e.id}">${a?.has_user_account?'بيانات الدخول':'إنشاء حساب'}</button>`);
    });
    $$('[data-v44-login]').forEach(b=>b.onclick=()=>{const a=map.get(String(b.dataset.v44Login));a?.has_user_account?openOneEmployeeLoginV44(b.dataset.v44Login):openBulkEmployeeUsers();});
  }
  const previousRenderEmployeesV44=renderEmployees;
  renderEmployees=async function(){
    let accounts=[];if(can('users.create')){try{accounts=await accountRowsV44();state.cache.v44EmployeeAccounts=accounts;}catch{}}
    await previousRenderEmployeesV44();
    const toolbar=$('#content .toolbar');if(toolbar&&can('users.create')&&!$('#v44EmployeeCredentials')){const b=document.createElement('button');b.id='v44EmployeeCredentials';b.className='btn btn-outline';b.textContent='بيانات دخول الموظفين';b.onclick=openEmployeeLoginManagerV44;toolbar.appendChild(b);}
    enhanceEmployeeRowsV44(accounts);
    $('#employeeSearch')?.addEventListener('input',()=>setTimeout(()=>enhanceEmployeeRowsV44(state.cache.v44EmployeeAccounts||accounts),0));
  };

  window.WardatV44={openBarcodePrintManager:openBarcodePrintManagerV44,openEmployeeLoginManager:openEmployeeLoginManagerV44};
})();
