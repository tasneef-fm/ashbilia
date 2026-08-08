
'use strict';
(() => {
  const tr=v=>window.WardatI18n?.t?.(v)||v;
  const locale=()=>window.WardatI18n?.locale?.()||'ar-SA';
  const lang=()=>window.WardatI18n?.getLanguage?.()||'ar';
  const direction=()=>window.WardatI18n?.dir?.()||'rtl';
  const labels={order:'فاتورة مبيعات',invoice:'فاتورة ضريبية',quotation:'عرض سعر',booking:'تأكيد حجز',contract:'عقد تجهيز مناسبة',work_order:'أمر عمل',purchase_order:'أمر شراء',payslip:'قسيمة راتب',payroll_run:'مسير رواتب',customer:'كشف حساب عميل',supplier:'كشف حساب مورد',product:'بطاقة منتج',inventory:'تقرير مخزون',report:'تقرير',receipt:'سند قبض',payment_voucher:'سند صرف',delivery:'تقرير توصيل',attendance:'تقرير الحضور والانصراف',gift_card:'بطاقة هدية',bouquet_card:'بطاقة باقة ورد'};
  const absoluteLogo=()=>new URL('assets/logo.png',window.location.href).href;let business={name_ar:'وردة أشبيليا',name_en:'WARDAT ASHBILYA',phone:'',email:'',address:'',tax_no:'',commercial_register:'',whatsapp:'',logo:absoluteLogo()};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>window.WardatFinancial?.format(v)||`${Number(v||0).toFixed(2)} ر.س`;
  const date=v=>v?new Intl.DateTimeFormat(locale(),{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(v)):'—';
  async function loadSettings(){try{const s=await window.WardatBackend?.request('/api/settings/financial',{skipPermissionCheck:true});business={...business,name_ar:s.business_name_ar||business.name_ar,name_en:s.business_name_en||business.name_en,phone:s.business_phone||'',email:s.business_email||'',address:s.business_address||'',tax_no:s.business_tax_no||'',commercial_register:s.commercial_register||'',whatsapp:s.whatsapp||'',logo:absoluteLogo()};}catch{}return {...business};}
  function standardRows(items=[]){if(!items.length)return `<tr><td colspan="8">${tr('لا توجد بنود')}</td></tr>`;return items.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.description||x.name||x.name_ar||tr('بند'))}</td><td>${Number(x.qty||1).toFixed(2)}</td><td>${money(x.unit_price_before_tax??x.unit_price??x.price??0)}</td><td>${money(x.discount||0)}</td><td>${money(x.before_tax??x.total??0)}</td><td>${money(x.tax_amount??x.tax??0)}</td><td>${money(x.total_including_tax??x.total??0)}</td></tr>`).join('');}
  function num(v,digits=2){return new Intl.NumberFormat(locale(),{minimumFractionDigits:0,maximumFractionDigits:digits}).format(Number(v||0));}
  function inventorySummary(s={}){
    const cards=[
      ['إجمالي الأصناف',num(s.item_count,0)],
      ['إجمالي القطع',num(s.total_pieces,2)],
      ['إجمالي قيمة الشراء',s.purchase_total==null?'غير مصرح':money(s.purchase_total)],
      ['إجمالي قيمة البيع',s.sale_total==null?'غير مصرح':money(s.sale_total)],
      ['الربح المتوقع',s.expected_profit==null?'غير مصرح':money(s.expected_profit)],
      ['المحجوز',num(s.reserved_pieces,2)],
      ['المتاح',num(s.available_pieces,2)],
      ['منخفضة الكمية',num(s.low_stock_count,0)]
    ];
    return `<section class="inventory-summary">${cards.map(([k,v],i)=>`<div class="${i===4?'profit-card':''}"><span>${esc(tr(k))}</span><b>${esc(v)}</b></div>`).join('')}</section>`;
  }
  function inventoryTable(items=[]){
    if(!items.length)return `<div class="no-data">${tr('لا توجد أصناف مطابقة')}</div>`;
    return `<table class="inventory-table"><thead><tr><th>#</th><th>${tr('كود المنتج')}</th><th>${tr('الصنف')}</th><th>${tr('الحالي')}</th><th>${tr('المحجوز')}</th><th>${tr('المتاح')}</th><th>${tr('سعر الشراء')}</th><th>${tr('قيمة الشراء')}</th><th>${tr('سعر البيع')}</th><th>${tr('قيمة البيع')}</th><th>${tr('الموقع')}</th><th>${tr('الحالة')}</th></tr></thead><tbody>${items.map(x=>`<tr><td>${num(x.index,0)}</td><td class="code">${esc(x.sku)}</td><td class="product-name">${esc(x.name_ar)}</td><td>${num(x.current_qty)}</td><td>${num(x.reserved_qty)}</td><td>${num(x.available_qty)}</td><td>${money(x.purchase_price)}</td><td>${money(x.purchase_value)}</td><td>${money(x.sale_price)}</td><td>${money(x.sale_value)}</td><td>${esc(x.location_code)}</td><td><span class="stock-status ${x.status==='منخفض'?'low':'good'}">${esc(tr(x.status))}</span></td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">${tr('الإجمالي')}</th><th>${num(items.reduce((s,x)=>s+Number(x.current_qty||0),0))}</th><th>${num(items.reduce((s,x)=>s+Number(x.reserved_qty||0),0))}</th><th>${num(items.reduce((s,x)=>s+Number(x.available_qty||0),0))}</th><th>—</th><th>${money(items.reduce((s,x)=>s+Number(x.purchase_value||0),0))}</th><th>—</th><th>${money(items.reduce((s,x)=>s+Number(x.sale_value||0),0))}</th><th colspan="2"></th></tr></tfoot></table>`;
  }
  function genericTable(items=[]){if(!items.length)return '';const cols=Object.keys(items[0]).filter(k=>typeof items[0][k]!=='object').slice(0,10);return `<table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${items.map(r=>`<tr>${cols.map(c=>`<td>${typeof r[c]==='number'&&/amount|total|price|cost|profit|vat|discount|salary/.test(c)?money(r[c]):esc(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  function totals(t={}){return `<div class="doc-totals"><div><span>${tr('الإجمالي قبل الخصم')}</span><b>${money(t.gross_total??t.subtotalGross??t.subtotal??0)}</b></div><div><span>${tr('الخصومات')}</span><b>${money(t.discount_total??t.totalDiscount??t.discount??0)}</b></div><div><span>${tr('الإجمالي قبل الضريبة')}</span><b>${money(t.taxable_base??t.beforeTax??t.subtotal??0)}</b></div><div><span>${tr('الضريبة')}</span><b>${money(t.tax_total??t.tax??t.vat??0)}</b></div><div class="grand"><span>${tr('الإجمالي شامل الضريبة')}</span><b>${money(t.grand_total??t.total??0)}</b></div><div><span>${tr('المدفوع')}</span><b>${money(t.paid_amount??t.paid??0)}</b></div><div><span>${tr('المتبقي')}</span><b>${money(t.remaining??Math.max(0,Number(t.total||0)-Number(t.paid_amount||0)))}</b></div></div>`;}
  function printCss(size='A4',economy=false,orientation='portrait'){
    const d=direction(),align=d==='rtl'?'right':'left',opposite=d==='rtl'?'left':'right';
    const width=size==='A5'?'148mm':size==='80mm'?'80mm':size==='58mm'?'58mm':orientation==='landscape'?'297mm':'210mm';
    const pageSize=size.includes('mm')?(size==='80mm'?'80mm auto':'58mm auto'):`${size} ${orientation}`;
    return `@page{size:${pageSize};margin:${size.includes('mm')?'3mm':'9mm'}}
    *{box-sizing:border-box}
    body{margin:0;background:#ece9e4;font-family:Tahoma,Arial,sans-serif;color:#33271f;direction:${d};-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-toolbar{position:sticky;top:0;z-index:4;padding:10px;background:#2e261f;text-align:center}
    .print-toolbar button{margin:3px;padding:9px 14px;border:0;border-radius:8px;background:#d5aa5b;font-weight:700;cursor:pointer}
    .document{width:${width};min-height:180mm;margin:12px auto;background:#fff;padding:${size.includes('mm')?'4mm':'10mm'};position:relative;box-shadow:0 8px 30px #0002}
    .doc-header{display:grid;grid-template-columns:78px 1fr auto;gap:14px;align-items:center;border-bottom:3px solid #d5aa5b;padding-bottom:10px}
    .doc-header img{width:74px;height:74px;object-fit:contain}
    .doc-header h1{margin:0;font-size:23px}.doc-header h2{margin:3px 0;font-size:11px;color:#9b752e;letter-spacing:.5px}.doc-header p{margin:4px 0;font-size:10px}
    .doc-title{text-align:${opposite};min-width:180px}.doc-title strong{display:block;font-size:21px}.doc-title span{font-family:monospace;font-size:10px;color:#6f6258}
    .identity-line,.doc-meta{display:flex;gap:12px;flex-wrap:wrap;padding:8px 0;font-size:10px}.identity-line{align-items:center;border-bottom:1px solid #eadcc9}
    .doc-meta{display:grid;grid-template-columns:repeat(4,1fr)}.doc-meta div{border:1px solid #eadcc9;border-radius:8px;padding:7px;background:#fffaf1}.doc-meta span{display:block;color:#75685e;font-size:9px}.doc-meta b{display:block;margin-top:3px}
    table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9.2px}thead{display:table-header-group}tfoot{display:table-row-group}
    th{background:${economy?'#eee':'#e6c477'};color:#2e261f;font-weight:800}th,td{border:1px solid #d9cec4;padding:6px;text-align:${align};vertical-align:middle}tr{page-break-inside:avoid}
    tbody tr:nth-child(even){background:#fffaf3}.code{font-family:monospace;direction:ltr;text-align:center}.product-name{font-weight:700;min-width:110px}
    .inventory-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.inventory-summary>div{border:1px solid #dfd0bd;border-radius:9px;padding:8px;background:#fffaf1}.inventory-summary span{display:block;font-size:9px;color:#74675e;margin-bottom:4px}.inventory-summary b{font-size:14px}.inventory-summary .profit-card{background:#f5e6bf;border-color:#d5aa5b}
    .inventory-table tfoot th{background:#f5e6bf;font-size:9px}.stock-status{display:inline-block;border-radius:999px;padding:3px 7px;font-size:8px;font-weight:800}.stock-status.good{background:#e7f4eb;color:#257341}.stock-status.low{background:#fbe8e8;color:#a23b3b}
    .no-data{text-align:center;padding:30px;border:1px dashed #d9cec4;border-radius:10px}
    .doc-totals{margin-${opposite}:auto;width:min(100%,90mm);display:grid;gap:4px}.doc-totals div{display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding:5px}.doc-totals .grand{font-size:14px;background:${economy?'#eee':'#f5e6bf'};border:2px solid #d5aa5b}
    .notes{margin-top:10px;border:1px solid #ddd;padding:8px;border-radius:8px;font-size:9px}.notes p{margin:5px 0}
    .signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:22px}.signatures div{text-align:center;border-top:1px solid #777;padding-top:6px;font-size:9px}
    .qr{width:60px;height:60px;margin-${opposite}:auto}.qr:empty{display:none}
    footer{margin-top:15px;border-top:1px solid #d5aa5b;padding-top:7px;display:flex;justify-content:space-between;font-size:8px}
    .watermarked:before{content:attr(data-watermark);position:fixed;inset:40% 0 auto;transform:rotate(-30deg);font-size:80px;color:#0001;text-align:center;font-weight:900}
    @media print{body{background:#fff}.no-print{display:none!important}.document{margin:0;box-shadow:none;width:auto;padding:0}.page-counter:after{content:"${tr('صفحة')} " counter(page)}}`;
  }
  function html(doc={},opts={}){
    const h=doc.header||doc.record||{},t=doc.totals||h,title=tr(opts.title||doc.title||labels[doc.type]||labels[opts.type]||'مستند');
    const number=h.document_no||h.invoice_no||h.order_no||h.quotation_no||h.booking_no||h.po_no||h.work_order_no||h.payslip_no||h.payroll_no||'—';
    const status=h.status||'',customer=h.customer_name||h.employee_name||h.supplier_name||h.name||'',phone=h.phone||h.customer_phone||'',watermark=opts.watermark||(['draft','cancelled'].includes(status)?status:'');
    const isInventory=(doc.type||opts.type)==='inventory';
    const orientation=opts.orientation||(isInventory?'landscape':'portrait');
    const meta=isInventory
      ?[['رقم التقرير',number],['تاريخ الإصدار',date(h.created_at||new Date())],['المستودع',h.location||'المستودع الرئيسي'],['نطاق التقرير',h.filter_text||'جميع الأصناف']]
      :[['رقم المستند',number],['تاريخ الإصدار',date(h.issued_at||h.created_at||new Date())],customer?['العميل/المستفيد',customer]:null,phone?['الجوال',phone]:null,h.event_date?['تاريخ المناسبة',String(h.event_date)]:null,(h.venue||h.venue_name||h.location)?['الموقع',h.venue||h.venue_name||h.location]:null,status?['الحالة',status]:null].filter(Boolean);
    const table=isInventory
      ?`${inventorySummary(doc.summary||{})}${inventoryTable(doc.items||[])}`
      :doc.generic?genericTable(doc.items):doc.items?`<table><thead><tr><th>#</th><th>${tr('البيان')}</th><th>${tr('الكمية')}</th><th>${tr('سعر الوحدة')}</th><th>${tr('الخصم')}</th><th>${tr('قبل الضريبة')}</th><th>${tr('الضريبة')}</th><th>${tr('الإجمالي')}</th></tr></thead><tbody>${standardRows(doc.items)}</tbody></table>`:'';
    const signatures=isInventory?['مسؤول المخزون','اعتماد الإدارة','الختم']:['توقيع العميل','اعتماد الإدارة','الختم'];
    const showQr=!isInventory;
    return `<!doctype html><html lang="${lang()}" dir="${direction()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)} ${esc(number)}</title><style>${printCss(opts.size||'A4',opts.economy,orientation)}</style></head><body>
    <div class="print-toolbar no-print"><button onclick="window.print()">${tr('طباعة')}</button><button id="pdfBtn">${tr('تنزيل PDF')}</button><button id="shareBtn">${tr('إرسال/مشاركة')}</button><button onclick="window.close()">${tr('إغلاق')}</button></div>
    <main id="document" class="document ${watermark?'watermarked':''}" data-watermark="${esc(watermark)}">
      <header class="doc-header"><img src="${esc(business.logo)}" alt="${esc(tr('شعار وردة أشبيليا'))}"><div><h1>${esc(lang()==='en'?(business.name_en||business.name_ar):business.name_ar)}</h1><h2>${esc(lang()==='en'?business.name_ar:business.name_en)}</h2><p>${esc([business.phone,business.email,business.address].filter(Boolean).join(' · '))}</p></div><div class="doc-title"><strong>${esc(title)}</strong><span>${esc(number)}</span></div></header>
      <section class="identity-line">${business.tax_no?`<span>${tr('الرقم الضريبي:')} ${esc(business.tax_no)}</span>`:''}${business.commercial_register?`<span>${tr('السجل التجاري:')} ${esc(business.commercial_register)}</span>`:''}<span>${tr('الكاشير:')} ${esc(h.cashier_name||window.opener?.document?.querySelector('#userName')?.textContent||tr('النظام'))}</span>${showQr?'<div id="qr" class="qr"></div>':''}</section>
      <section class="doc-meta">${meta.map(([k,v])=>`<div><span>${esc(tr(k))}</span><b>${esc(v)}</b></div>`).join('')}</section>
      ${table}
      ${doc.show_totals===false?'':totals(t)}
      ${h.notes||doc.notes?`<section class="notes"><b>${tr('ملاحظات')}:</b><p>${esc(h.notes||doc.notes)}</p></section>`:''}
      <section class="signatures">${signatures.map(x=>`<div>${esc(tr(x))}</div>`).join('')}</section>
      <footer><span>${tr(isInventory?'تقرير مخزون وردة أشبيليا':'شكرًا لاختياركم وردة أشبيليا')}</span><span class="page-counter"></span><span>${date(new Date())}</span></footer>
    </main>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
    ${showQr?'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>':''}
    <script>
      const filename=${JSON.stringify(`${title}-${number}.pdf`)};
      ${showQr?"new QRCode(document.getElementById('qr'),{text:window.opener?.location?.href||'',width:58,height:58});":""}
      document.getElementById('pdfBtn').onclick=async()=>{
        const el=document.getElementById('document');
        await html2pdf().set({margin:4,filename,html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:${JSON.stringify('a4')},orientation:${JSON.stringify('LANDSCAPE_PLACEHOLDER')}},pagebreak:{mode:['css','legacy']}}).from(el).save();
      };
      document.getElementById('shareBtn').onclick=async()=>{
        const text=${JSON.stringify(`${title} ${number} — ${business.name_ar}`)};
        if(navigator.share){try{await navigator.share({title:text,text});return}catch(e){}}
        window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
      };
      ${opts.autoPdf?"setTimeout(()=>document.getElementById('pdfBtn').click(),800);":""}
    <\/script></body></html>`.replace('"LANDSCAPE_PLACEHOLDER"',JSON.stringify(orientation));
  }
  async function fetch(type,id){return await window.WardatBackend.request(`/api/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);}
  async function open(type,id,opts={}){await loadSettings();const doc=id?await fetch(type,id):opts.document;doc.type=doc.type||type;const w=window.open('','_blank');if(!w)throw new Error('اسمح بالنوافذ المنبثقة لعرض المستند');w.document.open();w.document.write(html(doc,opts));w.document.close();return w;}
  async function whatsapp(type,id){await loadSettings();const doc=await fetch(type,id),h=doc.header||{},number=h.order_no||h.quotation_no||h.booking_no||h.po_no||h.work_order_no||h.payslip_no||'',text=`${tr(labels[type]||'مستند')} ${number} ${lang()==='en'?'from':'من'} ${lang()==='en'?(business.name_en||business.name_ar):business.name_ar} — ${tr('الإجمالي')} ${money((doc.totals||h).total||0)}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank');}
  window.WardatDocuments={open,fetch,whatsapp,html,loadSettings,labels};
})();
