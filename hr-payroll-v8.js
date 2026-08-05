/* وردة أشبيليا V8: الحضور والإجازات والرواتب والفلاتر */
'use strict';

const HR_STATUS_LABELS={present:'حاضر',late:'متأخر',early_leave:'انصراف مبكر',absent:'غائب',leave:'إجازة',missing_checkout:'لم يسجل انصراف',pending_supervisor:'بانتظار المسؤول',pending_admin:'بانتظار الإدارة',approved:'معتمد',rejected:'مرفوض',cancelled:'ملغي',under_review:'تحت المراجعة',pending_approval:'بانتظار الاعتماد',ready_to_pay:'جاهز للصرف',partially_paid:'مصروف جزئيًا',paid:'تم الصرف',draft:'مسودة'};
const hrLabel=v=>HR_STATUS_LABELS[v]||v||'—';
const hrMonth=()=>new Date().toISOString().slice(0,7);
const hrToday=()=>new Date().toISOString().slice(0,10);
const hrQuery=(obj={})=>Object.entries(obj).filter(([,v])=>v!==''&&v!==null&&v!==undefined).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

function filterStorageKey(page){return `wardat:filters:${state.user?.id||'anon'}:${page}`;}
function getSavedFilters(page){try{return JSON.parse(localStorage.getItem(filterStorageKey(page))||'{}')}catch{return{}}}
function saveLocalFilters(page,filters){localStorage.setItem(filterStorageKey(page),JSON.stringify(filters));}
function smartFilterBar(page,fields,filters={},count=null){
 const controls=fields.map(f=>{const val=filters[f.key]??'';if(f.type==='select')return `<label>${f.label}<select data-smart-filter="${f.key}"><option value="">الكل</option>${(f.options||[]).map(o=>`<option value="${escapeHtml(o.value)}" ${String(val)===String(o.value)?'selected':''}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;return `<label>${f.label}<input data-smart-filter="${f.key}" type="${f.type||'text'}" value="${escapeHtml(val)}" ${f.placeholder?`placeholder="${escapeHtml(f.placeholder)}"`:''}></label>`;}).join('');
 return `<section class="panel smart-filter-panel"><div class="smart-filter-grid">${controls}<div class="smart-filter-actions"><button class="btn btn-primary" data-filter-apply="${page}">تطبيق</button><button class="btn btn-outline" data-filter-clear="${page}">مسح</button><button class="mini-btn" data-filter-save="${page}">حفظ الفلتر</button><button class="mini-btn" data-filter-share="${page}">نسخ رابط</button></div></div>${count!==null?`<small class="filter-result-count">عدد النتائج: ${number(count)}</small>`:''}</section>`;
}
function readSmartFilters(root=document){const x={};$$('[data-smart-filter]',root).forEach(el=>x[el.dataset.smartFilter]=el.value);return x;}
function bindSmartFilters(page,onApply){
 const root=$('.smart-filter-panel');if(!root)return;
 root.querySelector(`[data-filter-apply="${page}"]`)?.addEventListener('click',()=>{const f=readSmartFilters(root);saveLocalFilters(page,f);onApply(f);});
 root.querySelector(`[data-filter-clear="${page}"]`)?.addEventListener('click',()=>{localStorage.removeItem(filterStorageKey(page));history.replaceState(null,'',location.pathname);onApply({});});
 root.querySelector(`[data-filter-save="${page}"]`)?.addEventListener('click',async()=>{if(!guard('filters.save'))return;const name=prompt('اسم الفلتر المفضل:');if(!name)return;const filters=readSmartFilters(root);await api('/api/filter-presets',{method:'POST',body:{page_key:page,name,filters,is_default:false,is_shared:false}});toast('تم حفظ الفلتر');});
 root.querySelector(`[data-filter-share="${page}"]`)?.addEventListener('click',async()=>{const filters=readSmartFilters(root);const url=new URL(location.href);url.searchParams.set('page',page);url.searchParams.set('filters',btoa(unescape(encodeURIComponent(JSON.stringify(filters)))));await navigator.clipboard.writeText(url.toString());toast('تم نسخ رابط الفلاتر');});
}
function filtersFromUrl(page){try{const u=new URL(location.href);if(u.searchParams.get('page')!==page||!u.searchParams.get('filters'))return null;return JSON.parse(decodeURIComponent(escape(atob(u.searchParams.get('filters')))));}catch{return null}}
function getGeo(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('المتصفح لا يدعم تحديد الموقع'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e.code===1?'يجب السماح بالوصول إلى الموقع':'تعذر تحديد الموقع')), {enableHighAccuracy:true,timeout:15000,maximumAge:0});});}
function deviceFingerprint(){let v=localStorage.getItem('wardat:device-id');if(!v){v=crypto.randomUUID();localStorage.setItem('wardat:device-id',v)}return `${navigator.platform||''}|${navigator.userAgent.slice(0,100)}|${v}`;}

function attendanceQuickState(row={}){
 const status=String(row.status||'');
 if(row.attendance_id&&status==='absent')return'absent';
 if(status==='leave')return'leave';
 if(row.attendance_id&&['present','late','early_leave','missing_checkout'].includes(status))return'present';
 return'unmarked';
}
function attendanceQuickResult(stateKey){
 if(stateKey==='present')return'<span class="attendance-result present">حضور</span>';
 if(stateKey==='absent')return'<span class="attendance-result absent">غياب</span>';
 if(stateKey==='leave')return'<span class="attendance-result leave">إجازة</span>';
 return'<span class="attendance-result unmarked">لم يُحضّر</span>';
}
function attendanceQuickRows(rows=[],workDate=''){
 if(!rows.length)return'<tr><td colspan="6"><div class="empty">لا يوجد موظفون مطابقون</div></td></tr>';
 return rows.map(x=>{
  const stateKey=attendanceQuickState(x);
  return`<tr data-attendance-row data-employee-id="${x.employee_id}" data-state="${stateKey}">
   <td><b>${escapeHtml(x.employee_name)}</b><small>${escapeHtml(x.employee_no||'')}</small></td>
   <td>${escapeHtml(x.department||'—')}</td>
   <td>${escapeHtml(x.shift_name||'بدون وردية')}</td>
   <td>${escapeHtml(workDate)}</td>
   <td><div class="attendance-mark-group">
    <button type="button" class="attendance-mark-btn present ${stateKey==='present'?'active':''}" data-attendance-mark="present" title="حاضر">ح</button>
    <button type="button" class="attendance-mark-btn absent ${stateKey==='absent'?'active':''}" data-attendance-mark="absent" title="غياب">غ</button>
   </div></td>
   <td data-attendance-result>${attendanceQuickResult(stateKey)}</td>
  </tr>`;
 }).join('');
}
function refreshAttendanceQuickMetrics(){
 const rows=$$('[data-attendance-row]');
 const counts={present:0,absent:0,leave:0,unmarked:0};
 rows.forEach(row=>{const key=row.dataset.state||'unmarked';counts[key]=(counts[key]||0)+1;});
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=number(value);};
 set('#attendanceMetricTotal',rows.length);
 set('#attendanceMetricPresent',counts.present);
 set('#attendanceMetricAbsent',counts.absent);
 set('#attendanceMetricLeave',counts.leave);
 set('#attendanceMetricUnmarked',counts.unmarked);
 const rate=rows.length?counts.present/rows.length*100:0;
 const rateEl=$('#attendanceMetricRate');
 if(rateEl)rateEl.textContent=`${number(rate)}%`;
}
function applyAttendanceQuickRow(row,stateKey){
 row.dataset.state=stateKey;
 row.classList.remove('attendance-row-present','attendance-row-absent','attendance-row-unmarked','attendance-row-leave');
 row.classList.add(`attendance-row-${stateKey}`);
 $$('[data-attendance-mark]',row).forEach(btn=>{
  btn.classList.toggle('active',btn.dataset.attendanceMark===stateKey);
 });
 const result=$('[data-attendance-result]',row);
 if(result)result.innerHTML=attendanceQuickResult(stateKey);
 refreshAttendanceQuickMetrics();
}
function bindAttendanceQuickActions(workDate){
 $$('[data-attendance-row]').forEach(row=>{
  applyAttendanceQuickRow(row,row.dataset.state||'unmarked');
 });
 $$('[data-attendance-mark]').forEach(btn=>{
  btn.onclick=async()=>{
   const row=btn.closest('[data-attendance-row]');
   const status=btn.dataset.attendanceMark;
   const previous=row.dataset.state||'unmarked';
   if(previous===status)return;
   const employeeId=row.dataset.employeeId;
   const buttons=$$('[data-attendance-mark]',row);
   buttons.forEach(x=>x.disabled=true);
   try{
    await api('/api/attendance/quick',{
     method:'POST',
     body:{
      employee_id:employeeId,
      work_date:workDate,
      status
     }
    });
    applyAttendanceQuickRow(row,status);
    toast(status==='present'?'تم تسجيل الحضور':'تم تسجيل الغياب');
   }catch(error){
    applyAttendanceQuickRow(row,previous);
    toast(error.message,'error');
   }finally{
    buttons.forEach(x=>x.disabled=false);
   }
  };
 });
}

function attendanceMonthValue(dateValue=''){
 const d=String(dateValue||hrToday()).slice(0,7);
 return /^\d{4}-\d{2}$/.test(d)?d:hrToday().slice(0,7);
}
function monthlyAttendanceSymbol(status){
 if(status==='present')return'<span class="month-attendance-cell present" title="حضور">ح</span>';
 if(status==='absent')return'<span class="month-attendance-cell absent" title="غياب">غ</span>';
 if(status==='leave')return'<span class="month-attendance-cell leave" title="إجازة">إ</span>';
 if(status==='inactive')return'<span class="month-attendance-cell inactive" title="خارج مدة الخدمة">—</span>';
 return'<span class="month-attendance-cell unmarked" title="لم يتم التحضير">•</span>';
}
function monthlyAttendanceTable(data={}){
 const rows=data.rows||[];
 const days=Number(data.days_in_month||30);
 const dayHeaders=Array.from({length:days},(_,i)=>`<th class="month-day-head">${i+1}</th>`).join('');
 if(!rows.length){
  return`<div class="empty">لا توجد بيانات موظفين لهذا الشهر.</div>`;
 }
 return`<div class="monthly-attendance-scroll">
  <table class="data-table monthly-attendance-table">
   <thead>
    <tr>
     <th class="monthly-sticky-name">الموظف</th>
     ${dayHeaders}
     <th class="month-total-head present">ح</th>
     <th class="month-total-head absent">غ</th>
     <th class="month-total-head leave">إ</th>
     <th class="month-total-head unmarked">غير محضر</th>
    </tr>
   </thead>
   <tbody id="monthlyAttendanceRows">
    ${rows.map(row=>`<tr data-month-employee-row>
     <td class="monthly-sticky-name">
      <b>${escapeHtml(row.employee_name)}</b>
      <small>${escapeHtml(row.employee_no||'')} ${row.department?`· ${escapeHtml(row.department)}`:''}</small>
     </td>
     ${Array.from({length:days},(_,i)=>`<td>${monthlyAttendanceSymbol(row.days?.[String(i+1)]||'unmarked')}</td>`).join('')}
     <td><b class="month-total present">${number(row.present_count||0)}</b></td>
     <td><b class="month-total absent">${number(row.absent_count||0)}</b></td>
     <td><b class="month-total leave">${number(row.leave_count||0)}</b></td>
     <td><b class="month-total unmarked">${number(row.unmarked_count||0)}</b></td>
    </tr>`).join('')}
   </tbody>
  </table>
 </div>`;
}
async function loadMonthlyAttendance(monthValue,filters={}){
 const target=$('#monthlyAttendanceContainer');
 if(!target)return null;
 target.innerHTML='<div class="empty">جاري تحميل جدول الشهر...</div>';
 try{
  const data=await api(`/api/attendance/monthly?${hrQuery({
   month:`${monthValue}-01`,
   branch:filters.branch||'',
   department:filters.department||''
  })}`);
  target.innerHTML=monthlyAttendanceTable(data);
  state.cache.monthlyAttendance=data;
  return data;
 }catch(error){
  target.innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;
  throw error;
 }
}

async function renderAttendance(filters={}){
 const saved={...getSavedFilters('attendance'),...filtersFromUrl('attendance'),...filters};
 const workDate=saved.date||hrToday();
 const stateData=await api('/api/attendance/state');
 const admin=can('attendance.view')&&PORTAL_MODE==='admin';
 const dash=admin?await api(`/api/attendance/dashboard?${hrQuery({
  date:workDate,
  branch:saved.branch||'',
  department:saved.department||'',
  status:''
 })}`):null;
 const monthValue=attendanceMonthValue(saved.month||workDate);
 const rec=stateData.record||null,assignment=stateData.assignment||{};
 const clockCard=`<section class="panel attendance-clock">
  <div class="panel-head"><h3>تسجيل اليوم</h3><span class="status ${rec?.check_in_at?'green':'amber'}">${rec?.check_in_at?'تم تسجيل الحضور':'لم يسجل الحضور'}</span></div>
  <div class="clock-time" id="liveClock"></div>
  <div class="list">
   <div class="list-item"><span>الوردية</span><b>${escapeHtml(assignment.shift_name||'غير محددة')}</b></div>
   <div class="list-item"><span>الموقع</span><b>${escapeHtml(assignment.location_name||'غير محدد')}</b></div>
   <div class="list-item"><span>الحضور</span><b>${dt(rec?.check_in_at)}</b></div>
   <div class="list-item"><span>الانصراف</span><b>${dt(rec?.check_out_at)}</b></div>
  </div>
  <div class="clock-actions">
   ${!rec?.check_in_at?'<button class="btn btn-primary" data-clock="check_in">تسجيل الحضور</button>':''}
   ${rec?.check_in_at&&!rec?.check_out_at?'<button class="btn btn-danger" data-clock="check_out">تسجيل الانصراف</button><button class="btn btn-outline" data-clock="break_start">بداية الاستراحة</button><button class="btn btn-outline" data-clock="break_end">نهاية الاستراحة</button><button class="mini-btn" data-clock="temp_out">خروج مؤقت</button><button class="mini-btn" data-clock="temp_return">عودة</button>':''}
  </div>
  <small class="geo-note">يتم التحقق من الموقع الجغرافي عند التسجيل حسب إعداد الموقع.</small>
 </section>`;
 let adminHtml='';
 if(admin){
  const rows=dash.rows||[];
  const initial={
   present:rows.filter(x=>attendanceQuickState(x)==='present').length,
   absent:rows.filter(x=>attendanceQuickState(x)==='absent').length,
   leave:rows.filter(x=>attendanceQuickState(x)==='leave').length,
   unmarked:rows.filter(x=>attendanceQuickState(x)==='unmarked').length
  };
  const rate=rows.length?initial.present/rows.length*100:0;
  adminHtml=`${smartFilterBar('attendance',[
   {key:'date',label:'التاريخ',type:'date'},
   {key:'month',label:'شهر الجدول',type:'month'},
   {key:'branch',label:'الفرع'},
   {key:'department',label:'القسم'}
  ],saved,rows.length)}
  <div class="toolbar">
   <input class="search" id="attendanceEmployeeSearch" placeholder="ابحث باسم الموظف أو الكود">
   <div>
    ${can('attendance.manual')?'<button class="btn btn-primary" id="hrSetupBtn">إعداد المواقع والورديات</button> <button class="btn btn-outline" id="manualAttendanceBtn">تسجيل يدوي مفصل</button>':''}
   </div>
  </div>
  <div class="attendance-legend">
   <span><b class="attendance-legend-key present">ح</b> حاضر</span>
   <span><b class="attendance-legend-key absent">غ</b> غياب</span>
   <small>اختر التاريخ ثم اضغط ح أو غ أمام اسم العامل.</small>
  </div>
  <div class="metrics">
   <div class="metric"><span>إجمالي الموظفين</span><b id="attendanceMetricTotal">${number(rows.length)}</b></div>
   <div class="metric"><span>الحاضرون</span><b id="attendanceMetricPresent">${number(initial.present)}</b></div>
   <div class="metric"><span>الغائبون</span><b id="attendanceMetricAbsent">${number(initial.absent)}</b></div>
   <div class="metric"><span>إجازة</span><b id="attendanceMetricLeave">${number(initial.leave)}</b></div>
   <div class="metric"><span>لم يُحضّروا</span><b id="attendanceMetricUnmarked">${number(initial.unmarked)}</b></div>
   <div class="metric"><span>نسبة الحضور</span><b id="attendanceMetricRate">${number(rate)}%</b></div>
  </div>
  <section class="panel">
   <div class="panel-head">
    <div><h3>كشف التحضير اليومي</h3><small>${escapeHtml(workDate)} · ح = حاضر، غ = غياب</small></div>
    <button class="btn btn-outline" id="exportAttendance">تصدير النتائج</button>
   </div>
   <div class="table-wrap">
    <table class="data-table attendance-quick-table">
     <thead><tr><th>الموظف</th><th>القسم</th><th>الوردية</th><th>التاريخ</th><th>التحضير</th><th>النتيجة</th></tr></thead>
     <tbody id="attendanceQuickRows">${attendanceQuickRows(rows,workDate)}</tbody>
    </table>
   </div>
  </section>
  <section class="panel monthly-attendance-panel">
   <div class="panel-head">
    <div>
     <h3>جدول الحضور والغياب الشهري</h3>
     <small>${escapeHtml(monthValue)} · ح حضور، غ غياب، إ إجازة</small>
    </div>
    <button class="btn btn-outline" id="exportMonthlyAttendance">تصدير الشهر</button>
   </div>
   <div class="monthly-attendance-legend">
    <span>${monthlyAttendanceSymbol('present')} حضور</span>
    <span>${monthlyAttendanceSymbol('absent')} غياب</span>
    <span>${monthlyAttendanceSymbol('leave')} إجازة</span>
    <span>${monthlyAttendanceSymbol('unmarked')} لم يُحضّر</span>
   </div>
   <div id="monthlyAttendanceContainer"><div class="empty">جاري تحميل جدول الشهر...</div></div>
  </section>`;
 }
 $('#content').innerHTML=`<div class="attendance-layout">${clockCard}<div class="attendance-admin">${adminHtml}</div></div>`;
 const tick=()=>{
  const el=$('#liveClock');
  if(el)el.textContent=new Intl.DateTimeFormat('ar-SA',{
   timeStyle:'medium',
   dateStyle:'full',
   timeZone:'Asia/Riyadh'
  }).format(new Date());
 };
 tick();
 clearInterval(window.__wardatClock);
 window.__wardatClock=setInterval(tick,1000);
 $$('[data-clock]').forEach(b=>b.onclick=async()=>{
  b.disabled=true;
  try{
   const g=await getGeo();
   await api('/api/attendance/clock',{
    method:'POST',
    body:{
     action:b.dataset.clock,
     lat:g.lat,
     lng:g.lng,
     accuracy:g.accuracy,
     device:deviceFingerprint()
    }
   });
   toast('تم تسجيل العملية');
   await renderAttendance(saved);
  }catch(e){
   toast(e.message,'error');
  }finally{
   b.disabled=false;
  }
 });
 if(admin){
  bindSmartFilters('attendance',renderAttendance);
  bindAttendanceQuickActions(workDate);
  await loadMonthlyAttendance(monthValue,saved);
  $('#attendanceEmployeeSearch').oninput=e=>{
   const q=normalizeSmartText(e.target.value);
   $$('[data-attendance-row], [data-month-employee-row]').forEach(row=>{
    const text=normalizeSmartText(row.textContent);
    row.hidden=!!q&&!text.includes(q);
   });
  };
  $('#exportAttendance').onclick=()=>{
   if(!guard('attendance.export'))return;
   const exportRows=(dash.rows||[]).map(x=>({
    employee_no:x.employee_no||'',
    employee_name:x.employee_name,
    department:x.department||'',
    shift:x.shift_name||'',
    date:workDate,
    status:{
     present:'حضور',
     absent:'غياب',
     leave:'إجازة',
     unmarked:'لم يحضر'
    }[attendanceQuickState(x)]
   }));
   downloadCsv(exportRows,`attendance-${workDate}.csv`);
  };
  $('#exportMonthlyAttendance')?.addEventListener('click',()=>{
   if(!guard('attendance.export'))return;
   const data=state.cache.monthlyAttendance||{};
   const days=Number(data.days_in_month||0);
   const rows=(data.rows||[]).map(row=>{
    const out={
     employee_no:row.employee_no||'',
     employee_name:row.employee_name,
     department:row.department||''
    };
    for(let day=1;day<=days;day++){
     const status=row.days?.[String(day)]||'unmarked';
     out[`day_${day}`]={
      present:'ح',
      absent:'غ',
      leave:'إ',
      inactive:'—',
      unmarked:''
     }[status]??'';
    }
    out.present_count=row.present_count||0;
    out.absent_count=row.absent_count||0;
    out.leave_count=row.leave_count||0;
    out.unmarked_count=row.unmarked_count||0;
    return out;
   });
   downloadCsv(rows,`attendance-month-${monthValue}.csv`);
  });
  $('#hrSetupBtn')?.addEventListener('click',openHRSetup);
  $('#manualAttendanceBtn')?.addEventListener('click',openManualAttendance);
 }
}

async function renderLeaves(filters={}){
 const saved={...getSavedFilters('leaves'),...filters};const qs=hrQuery({status:saved.status||'',from:saved.from||'',to:saved.to||''});const d=await api(`/api/leaves?${qs}`);const types=await api('/api/leaves/types');
 $('#content').innerHTML=`${smartFilterBar('leaves',[{key:'from',label:'من',type:'date'},{key:'to',label:'إلى',type:'date'},{key:'status',label:'الحالة',type:'select',options:[{value:'pending_supervisor',label:'بانتظار المسؤول'},{value:'pending_admin',label:'بانتظار الإدارة'},{value:'approved',label:'معتمد'},{value:'rejected',label:'مرفوض'}]}],saved,d.items.length)}<div class="toolbar"><button class="btn btn-primary" id="newLeave">طلب جديد</button><button class="btn btn-outline" id="exportLeaves">تصدير النتائج</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>الموظف</th><th>النوع</th><th>الفترة</th><th>المدة</th><th>السبب</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${d.items.map(x=>`<tr><td>${escapeHtml(x.employee_name)}</td><td>${escapeHtml(x.leave_name)}</td><td>${dateOnly(x.start_at)} — ${dateOnly(x.end_at)}</td><td>${number(x.total_units)} ${x.leave_code==='permission'?'ساعة':'يوم'}</td><td>${escapeHtml(x.reason)}</td><td>${statusBadge(x.status)}</td><td>${can('leaves.approve')&&x.status==='pending_supervisor'?`<button class="mini-btn" data-leave-status="pending_admin" data-id="${x.id}">اعتماد المسؤول</button>`:''}${can('leaves.approve')&&x.status==='pending_admin'?`<button class="mini-btn" data-leave-status="approved" data-id="${x.id}">اعتماد الإدارة</button><button class="mini-btn" data-leave-status="rejected" data-id="${x.id}">رفض</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
 bindSmartFilters('leaves',renderLeaves);$('#exportLeaves').onclick=()=>downloadCsv(d.items,`leaves-${hrToday()}.csv`);$('#newLeave').onclick=()=>openForm('طلب إجازة أو مأذونية',`<form class="form-grid"><label>نوع الطلب<select name="leave_type_id" required>${types.items.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}</select></label><label>المدة<input name="total_units" type="number" min="0.5" step="0.5" value="1"></label><label>البداية<input name="start_at" type="datetime-local" required></label><label>النهاية<input name="end_at" type="datetime-local" required></label><label class="span-2">السبب<textarea name="reason" required></textarea></label><button class="btn btn-primary span-2" type="submit">إرسال الطلب</button></form>`,async b=>{await api('/api/leaves',{method:'POST',body:b});toast('تم إرسال الطلب');await renderLeaves(saved)});
 $$('[data-leave-status]').forEach(b=>b.onclick=async()=>{const notes=prompt('ملاحظات الاعتماد أو الرفض:')||'';await api(`/api/leaves/${b.dataset.id}`,{method:'PATCH',body:{status:b.dataset.leaveStatus,notes}});toast('تم تحديث الطلب');await renderLeaves(saved)});
}

async function renderPayroll(filters={}){
 if(PORTAL_MODE==='employee'&&!can('payroll.view')){const d=await api('/api/payroll/my-payslips');$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h3>قسائم رواتبي</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>القسيمة</th><th>الشهر</th><th>أيام العمل</th><th>الغياب</th><th>الإضافات</th><th>الاستقطاعات</th><th>الصافي</th><th>الصرف</th><th>المستند</th></tr></thead><tbody>${d.items.map(x=>`<tr><td>${escapeHtml(x.payslip_no)}</td><td>${dateOnly(x.month_start)}</td><td>${number(x.present_days)}</td><td>${number(x.absent_days)}</td><td>${money(x.earnings_total)}</td><td>${money(x.deductions_total)}</td><td><b>${money(x.net_salary)}</b></td><td>${statusBadge(x.payment_status)}</td><td><button class="mini-btn" data-payslip-print="${x.id}">طباعة / PDF</button></td></tr>`).join('')}</tbody></table></div></section>`;document.querySelectorAll('[data-payslip-print]').forEach(b=>b.onclick=()=>window.WardatDocuments.open('payslip',b.dataset.payslipPrint));return;}
 const saved={month:hrMonth(),...getSavedFilters('payroll'),...filters};const d=await api(`/api/payroll/runs?month=${saved.month}-01`);state.cache.payrollRuns=d.items;
 $('#content').innerHTML=`${smartFilterBar('payroll',[{key:'month',label:'شهر الرواتب',type:'month'},{key:'branch',label:'الفرع'},{key:'department',label:'القسم'},{key:'status',label:'الحالة'}],saved,d.items.length)}<div class="toolbar">${can('payroll.create')?'<button class="btn btn-primary" id="createPayroll">إنشاء واحتساب المسير تلقائيًا</button> <button class="btn btn-outline" id="salarySetupBtn">إعداد رواتب الموظفين</button>':''}<button class="btn btn-outline" id="exportPayrollRuns">تصدير القائمة</button></div><div class="metrics">${metricHtml('عدد المسيرات',d.items.length)}${metricHtml('إجمالي الصافي',can('payroll.view_financial')?money(d.items.reduce((s,x)=>s+Number(x.net_total||0),0)):'—')}${metricHtml('حضور ناقص',d.items.reduce((s,x)=>s+Number(x.incomplete_attendance_count||0),0))}${metricHtml('المعتمدة',d.items.filter(x=>x.status==='approved'||x.status==='paid').length)}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>المسير</th><th>الشهر</th><th>النطاق</th><th>الموظفون</th><th>صافي المسير</th><th>الحضور الناقص</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${d.items.map(x=>`<tr><td><b>${escapeHtml(x.payroll_no)}</b></td><td>${dateOnly(x.month_start)}</td><td>${escapeHtml([x.branch,x.department].filter(Boolean).join(' / ')||'الكل')}</td><td>${number(x.employee_count)}</td><td>${can('payroll.view_financial')?money(x.net_total):'محجوب'}</td><td>${number(x.incomplete_attendance_count)}</td><td>${statusBadge(x.status)}</td><td><button class="mini-btn" data-payroll-open="${x.id}">فتح</button>${can('payroll.recalculate')&&!['approved','paid'].includes(x.status)?`<button class="mini-btn" data-payroll-calc="${x.id}">تحديث الحساب</button>`:''}</td></tr>`).join('')}</tbody></table></div><div id="payrollDetails"></div>`;
 bindSmartFilters('payroll',renderPayroll);$('#exportPayrollRuns').onclick=()=>downloadCsv(d.items,`payroll-runs-${saved.month}.csv`);$('#salarySetupBtn')?.addEventListener('click',openSalarySetup);$('#createPayroll')?.addEventListener('click',async()=>{await api('/api/payroll/runs',{method:'POST',body:{month:saved.month+'-01',branch:saved.branch||'',department:saved.department||''}});toast('تم إنشاء المسير واحتسابه تلقائيًا');await renderPayroll(saved)});$$('[data-payroll-calc]').forEach(b=>b.onclick=async()=>{if(!confirm('سيتم إعادة احتساب جميع الموظفين في هذا المسير. متابعة؟'))return;await api(`/api/payroll/runs/${b.dataset.payrollCalc}/calculate`,{method:'POST'});toast('تم تحديث الحساب من الحضور والإجازات والمأذونيات والسلف والجزاءات');await renderPayroll(saved)});$$('[data-payroll-open]').forEach(b=>b.onclick=()=>openPayrollRun(b.dataset.payrollOpen));
}
async function openPayrollRun(id){
 const d=await api(`/api/payroll/runs/${id}`);
 const r=d.run||{};
 const totalPermissions=(d.items||[]).reduce((s,x)=>s+Number(x.permission_minutes||0),0);
 const totalAdvances=(d.items||[]).reduce((s,x)=>s+Number(x.advances_total||0),0);
 const totalPenalties=(d.items||[]).reduce((s,x)=>s+Number(x.penalties_total||0),0);
 const totalRewards=(d.items||[]).reduce((s,x)=>s+Number(x.rewards_total||0),0);
 $('#payrollDetails').innerHTML=`<section class="panel payroll-auto-panel" style="margin-top:18px">
  <div class="panel-head">
   <div>
    <h3>${escapeHtml(r.payroll_no)}</h3>
    <small>${dateOnly(r.month_start)} · ${hrLabel(r.status)} · احتساب تلقائي${r.last_calculated_at?` · آخر تحديث ${dt(r.last_calculated_at)}`:''}</small>
   </div>
   <div>
    ${can('payroll.approve')&&!['approved','paid'].includes(r.status)?`<button class="btn btn-primary" data-run-approve="${id}">اعتماد المسير</button>`:''}
    <button class="btn btn-outline" data-run-export="${id}">تصدير التفاصيل</button>
   </div>
  </div>
  <div class="payroll-source-note">
   مرتبط تلقائيًا بالحضور والغياب والإجازات والمأذونيات والأوفر تايم والمكافآت والسلف والجزاءات.
   الأيام غير المحضرة لا تُخصم حتى تسجل غيابًا.
  </div>
  <div class="metrics">
   ${metricHtml('دقائق المأذونيات',number(totalPermissions))}
   ${metricHtml('المكافآت',money(totalRewards))}
   ${metricHtml('أقساط السلف',money(totalAdvances))}
   ${metricHtml('الجزاءات',money(totalPenalties))}
   ${metricHtml('حضور ناقص',number(r.incomplete_attendance_count||0))}
  </div>
  <div class="table-wrap">
   <table class="data-table payroll-linked-table">
    <thead><tr>
     <th>الموظف</th>
     <th>حضور</th>
     <th>غياب</th>
     <th>إجازة مدفوعة</th>
     <th>بدون راتب</th>
     <th>مأذونية</th>
     <th>غير محضر</th>
     <th>التأخير المحتسب</th>
     <th>أوفر تايم</th>
     <th>الأساسي</th>
     <th>البدلات</th>
     <th>المكافآت</th>
     <th>السلف</th>
     <th>الجزاءات</th>
     <th>الاستقطاعات</th>
     <th>الصافي</th>
     <th>الصرف</th>
    </tr></thead>
    <tbody>${d.items.map(x=>`<tr>
     <td><b>${escapeHtml(x.employee_name)}</b><small>${escapeHtml(x.employee_no||'')}</small></td>
     <td><span class="status green">${number(x.present_days)}</span></td>
     <td><span class="status red">${number(x.absent_days)}</span></td>
     <td>${number(x.paid_leave_days)}</td>
     <td>${number(x.unpaid_leave_days)}</td>
     <td>${number(x.permission_minutes||0)} د<small>${number(x.permission_count||0)} طلب</small></td>
     <td>${Number(x.unmarked_days||0)>0?`<span class="status amber">${number(x.unmarked_days)}</span>`:'0'}</td>
     <td>${number(x.chargeable_late_minutes??(Number(x.late_minutes||0)+Number(x.early_minutes||0)))} د</td>
     <td>${number(Number(x.overtime_minutes||0)/60)} س</td>
     <td>${money(x.base_due)}</td>
     <td>${money(x.allowances_total)}</td>
     <td>${money(x.rewards_total)}</td>
     <td>${money(x.advances_total)}</td>
     <td>${money(x.penalties_total)}</td>
     <td>${money(x.deductions_total)}</td>
     <td><b>${money(x.net_salary)}</b></td>
     <td>${statusBadge(x.payment_status)}${can('payroll.pay')&&x.payment_status!=='paid'?`<button class="mini-btn" data-pay-item="${x.id}" data-remain="${Number(x.net_salary)-Number(x.paid_amount)}">صرف</button>`:''}</td>
    </tr>`).join('')}</tbody>
   </table>
  </div>
 </section>`;
 document.querySelector(`[data-run-export="${id}"]`).onclick=()=>downloadCsv(d.items,`payroll-${r.payroll_no}.csv`);
 document.querySelector(`[data-run-approve="${id}"]`)?.addEventListener('click',async()=>{
  const notes=prompt('ملاحظات الاعتماد:')||'';
  await api(`/api/payroll/runs/${id}/status`,{
   method:'POST',
   body:{status:'approved',notes}
  });
  toast('تم اعتماد المسير');
  await openPayrollRun(id);
 });
 $$('[data-pay-item]').forEach(b=>b.onclick=()=>openForm(
  'تسجيل صرف الراتب',
  `<form class="form-grid single">
   <label>المبلغ<input name="amount" type="number" step="0.01" value="${b.dataset.remain}" required></label>
   <label>طريقة الصرف<select name="method"><option value="bank_transfer">تحويل بنكي</option><option value="cash">نقدي</option></select></label>
   <label>رقم المرجع<input name="reference"></label>
   <button class="btn btn-primary" type="submit">تسجيل الصرف</button>
  </form>`,
  async x=>{
   await api(`/api/payroll/items/${b.dataset.payItem}/pay`,{
    method:'POST',
    body:x
   });
   toast('تم تسجيل الصرف');
   await openPayrollRun(id);
  }
 ));
}

async function renderCompensation(filters={}){const saved={month:hrMonth(),...getSavedFilters('compensation'),...filters};const [d,emps]=await Promise.all([api(`/api/compensation?month=${saved.month}-01`),api('/api/employees')]);$('#content').innerHTML=`${smartFilterBar('compensation',[{key:'month',label:'شهر التطبيق',type:'month'},{key:'type',label:'النوع',type:'select',options:[{value:'advance',label:'سلفة'},{value:'penalty',label:'جزاء'},{value:'reward',label:'مكافأة'},{value:'commission',label:'عمولة'}]},{key:'status',label:'الحالة'}],saved,d.items.length)}<div class="toolbar">${can('compensation.create')?'<button class="btn btn-primary" id="addCompensation">إضافة حركة مالية</button>':''}<button class="btn btn-outline" id="exportCompensation">تصدير</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>الموظف</th><th>النوع</th><th>القيمة</th><th>السبب</th><th>شهر التطبيق</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${d.items.filter(x=>(!saved.type||x.item_type===saved.type)&&(!saved.status||x.status===saved.status)).map(x=>`<tr><td>${escapeHtml(x.employee_name)}</td><td>${escapeHtml({advance:'سلفة',penalty:'جزاء',reward:'مكافأة',commission:'عمولة'}[x.item_type])}</td><td>${money(x.amount)}</td><td>${escapeHtml(x.reason)}</td><td>${dateOnly(x.apply_month)}</td><td>${statusBadge(x.status)}</td><td>${can('compensation.approve')&&x.status==='pending'?`<button class="mini-btn" data-comp-approve="${x.id}" data-type="${x.item_type}">اعتماد</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;bindSmartFilters('compensation',renderCompensation);$('#exportCompensation').onclick=()=>downloadCsv(d.items,`compensation-${saved.month}.csv`);$('#addCompensation')?.addEventListener('click',()=>openForm('إضافة سلفة أو جزاء أو مكافأة',`<form class="form-grid"><label>الموظف<select name="employee_id" required>${emps.items.map(e=>`<option value="${e.id}">${escapeHtml(e.name)} · ${escapeHtml(e.job_title||'')}</option>`).join('')}</select></label><label>النوع<select name="type"><option value="advance">سلفة</option><option value="penalty">جزاء</option><option value="reward">مكافأة</option><option value="commission">عمولة</option></select></label><label>القيمة<input name="amount" type="number" min="0.01" step="0.01" required></label><label>شهر التطبيق<input name="apply_month" type="month" value="${saved.month}" required></label><label>عدد الأقساط<input name="installment_count" type="number" min="1" value="1"></label><label class="span-2">السبب<textarea name="reason" required></textarea></label><button class="btn btn-primary span-2" type="submit">حفظ الحركة</button></form>`,async x=>{const type=x.type;delete x.type;x.apply_month=x.apply_month+'-01';await api('/api/compensation',{method:'POST',body:{type,payload:x}});toast('تمت إضافة الحركة');await renderCompensation(saved)}));$$('[data-comp-approve]').forEach(b=>b.onclick=async()=>{await api(`/api/compensation/${b.dataset.type}/${b.dataset.compApprove}/approve`,{method:'POST',body:{status:'approved',reason:'اعتماد الإدارة'}});toast('تم الاعتماد');await renderCompensation(saved)});}
async function openHRSetup(){
 const d=await api('/api/hr/setup');openForm('إعداد المواقع والورديات',`<form class="form-grid" id="hrSetupForm" data-no-draft="true"><h3 class="span-2">إضافة موقع عمل</h3><label>كود الموقع<input name="location_code" required placeholder="MAIN"></label><label>اسم الموقع<input name="location_name" required></label><label>الفرع<input name="branch"></label><label>المدينة<input name="city" value="الرياض"></label><label>خط العرض<input name="latitude" type="number" step="0.0000001"></label><label>خط الطول<input name="longitude" type="number" step="0.0000001"></label><label>نطاق السماح بالمتر<input name="radius_m" type="number" value="150"></label><label class="check-label"><input name="requires_geofence" type="checkbox" checked> التحقق من الموقع</label><button type="button" class="btn btn-outline span-2" id="saveLocation">حفظ الموقع</button><hr class="span-2"><h3 class="span-2">إضافة وردية</h3><label>كود الوردية<input name="shift_code" required placeholder="DAY"></label><label>اسم الوردية<input name="shift_name" required></label><label>البداية<input name="start_time" type="time" value="09:00"></label><label>النهاية<input name="end_time" type="time" value="18:00"></label><label>الاستراحة بالدقائق<input name="break_minutes" type="number" value="60"></label><label>السماح بالتأخير<input name="grace_minutes" type="number" value="10"></label><label>الدقائق المطلوبة<input name="required_minutes" type="number" value="480"></label><label>أيام العمل<input name="work_days" value="0,1,2,3,4" placeholder="0 الأحد ... 6 السبت"></label><label class="check-label"><input name="crosses_midnight" type="checkbox"> تنتهي في اليوم التالي</label><button type="button" class="btn btn-outline span-2" id="saveShift">حفظ الوردية</button><hr class="span-2"><h3 class="span-2">ربط موظف</h3><label>الموظف<select name="employee_id">${d.employees.map(e=>`<option value="${e.id}">${escapeHtml(e.name)} · ${escapeHtml(e.employee_no||'')}</option>`).join('')}</select></label><label>الوردية<select name="shift_id">${d.shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('')}</select></label><label>الموقع<select name="work_location_id"><option value="">بدون موقع</option>${d.locations.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('')}</select></label><label>ساري من<input name="effective_from" type="date" value="${hrToday()}"></label><button type="button" class="btn btn-primary span-2" id="saveAssignment">حفظ ربط الموظف</button></form>`,async()=>{});setTimeout(()=>{const f=$('#hrSetupForm');$('#saveLocation').onclick=async()=>{const b=formDataObj(f);await api('/api/hr/locations',{method:'POST',body:{code:b.location_code,name:b.location_name,branch:b.branch,city:b.city,latitude:b.latitude,longitude:b.longitude,radius_m:b.radius_m,requires_geofence:b.requires_geofence,is_active:true}});toast('تم حفظ الموقع');hide('formModal');await renderAttendance()};$('#saveShift').onclick=async()=>{const b=formDataObj(f);await api('/api/hr/shifts',{method:'POST',body:{code:b.shift_code,name:b.shift_name,start_time:b.start_time,end_time:b.end_time,break_minutes:b.break_minutes,grace_minutes:b.grace_minutes,required_minutes:b.required_minutes,work_days:String(b.work_days).split(',').map(Number),crosses_midnight:b.crosses_midnight,is_active:true}});toast('تم حفظ الوردية');hide('formModal');await renderAttendance()};$('#saveAssignment').onclick=async()=>{const b=formDataObj(f);if(!b.shift_id)throw new Error('أنشئ الوردية أولًا ثم افتح الإعدادات مجددًا');await api('/api/hr/assignments',{method:'POST',body:{employee_id:b.employee_id,shift_id:b.shift_id,work_location_id:b.work_location_id,effective_from:b.effective_from,is_primary:true}});toast('تم ربط الموظف');hide('formModal');await renderAttendance()};},0);
}
async function openManualAttendance(){const d=await api('/api/hr/setup');openForm('تسجيل حضور يدوي',`<form class="form-grid"><label>الموظف<select name="employee_id">${d.employees.map(e=>`<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</select></label><label>التاريخ<input name="work_date" type="date" value="${hrToday()}" required></label><label>الوردية<select name="shift_id"><option value="">حسب ربط الموظف</option>${d.shifts.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('')}</select></label><label>الموقع<select name="work_location_id"><option value="">غير محدد</option>${d.locations.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('')}</select></label><label>وقت الحضور<input name="check_in_at" type="datetime-local"></label><label>وقت الانصراف<input name="check_out_at" type="datetime-local"></label><label class="span-2">سبب التسجيل اليدوي<textarea name="reason" required></textarea></label><button class="btn btn-primary span-2" type="submit">حفظ واعتماد</button></form>`,async b=>{await api('/api/attendance/manual',{method:'POST',body:b});toast('تم حفظ التسجيل اليدوي');await renderAttendance()});}
async function openSalarySetup(){const d=await api('/api/hr/setup');openForm('إعداد راتب موظف',`<form class="form-grid"><label>الموظف<select name="employee_id">${d.employees.map(e=>`<option value="${e.id}">${escapeHtml(e.name)} · ${escapeHtml(e.employee_no||'')}</option>`).join('')}</select></label><label>طريقة الاحتساب<select name="calculation_method"><option value="monthly_30">شهري ثابت 30 يومًا</option><option value="monthly">شهري حسب أيام الشهر</option><option value="daily">يومي</option><option value="hourly">بالساعة</option><option value="shift">حسب الوردية</option><option value="task">حسب المهام</option></select></label><label>الراتب الأساسي<input name="base_salary" type="number" step="0.01" value="0"></label><label>بدل السكن<input name="housing_allowance" type="number" step="0.01" value="0"></label><label>بدل النقل<input name="transport_allowance" type="number" step="0.01" value="0"></label><label>بدل الطعام<input name="food_allowance" type="number" step="0.01" value="0"></label><label>بدل الاتصال<input name="communication_allowance" type="number" step="0.01" value="0"></label><label>بدلات أخرى<input name="other_allowances" type="number" step="0.01" value="0"></label><label>قيمة اليوم<input name="daily_rate" type="number" step="0.0001" value="0"></label><label>قيمة الساعة<input name="hourly_rate" type="number" step="0.0001" value="0"></label><label>ساعة الأوفر تايم<input name="overtime_hour_rate" type="number" step="0.0001" value="0"></label><label>نسبة العمولة<input name="sales_commission_rate" type="number" step="0.01" value="0"></label><label>التقريب<select name="rounding_rule"><option value="nearest_riyal">أقرب ريال</option><option value="up_riyal">للريال الأعلى</option><option value="none">بدون تقريب</option></select></label><label class="check-label"><input name="deduct_late" type="checkbox" checked> خصم التأخير والانصراف المبكر</label><label>ساري من<input name="effective_from" type="date" value="${hrToday()}"></label><button class="btn btn-primary span-2" type="submit">حفظ الملف المالي</button></form>`,async b=>{await api('/api/hr/salary-profile',{method:'POST',body:b});toast('تم حفظ ملف الراتب');await renderPayroll()});}

function normalizeSmartText(v=''){return String(v).toLowerCase().normalize('NFD').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();}
function enhanceSearchableSelects(root=document){
 $$('select',root).forEach((sel,idx)=>{if(sel.dataset.smartReady==='1'||sel.options.length<6)return;sel.dataset.smartReady='1';const box=document.createElement('div');box.className='searchable-select-box';const input=document.createElement('input');input.type='search';input.className='select-search';input.placeholder='ابحث بالاسم أو الكود...';sel.parentNode.insertBefore(box,sel);box.append(input,sel);const original=Array.from(sel.options).map(o=>({value:o.value,text:o.text,disabled:o.disabled,selected:o.selected}));input.addEventListener('input',()=>{const q=normalizeSmartText(input.value);const current=sel.value;sel.innerHTML='';original.filter(o=>!q||normalizeSmartText(o.text).includes(q)||normalizeSmartText(o.value).includes(q)).forEach(o=>{const op=new Option(o.text,o.value,o.value===current,o.value===current);op.disabled=o.disabled;sel.add(op)});if(!sel.options.length)sel.add(new Option('لا توجد نتائج',''));});
 });
}
function enhanceCurrentPageTables(page){
 if(!can('filters.use'))return;
 const tables=$$('.data-table');if(!tables.length)return;
 tables.forEach((table,tIndex)=>{
  const headers=$$('thead th',table);const prefKey=`wardat:table:${state.user?.id||'anon'}:${page}:${tIndex}`;let prefs={hidden:[],sort:null,dir:'asc'};try{prefs={...prefs,...JSON.parse(localStorage.getItem(prefKey)||'{}')}}catch{}
  const applyHidden=()=>{headers.forEach((th,i)=>{const hide=prefs.hidden.includes(i);th.style.display=hide?'none':'';$$('tbody tr',table).forEach(tr=>{if(tr.children[i])tr.children[i].style.display=hide?'none':''})})};applyHidden();
  headers.forEach((th,i)=>{th.classList.add('sortable-head');th.title='اضغط للفرز';th.onclick=()=>{const rows=$$('tbody tr',table);const dir=prefs.sort===i&&prefs.dir==='asc'?'desc':'asc';rows.sort((a,b)=>{const av=a.children[i]?.innerText.trim()||'',bv=b.children[i]?.innerText.trim()||'';const an=Number(av.replace(/[^0-9.-]/g,'')),bn=Number(bv.replace(/[^0-9.-]/g,''));const cmp=Number.isFinite(an)&&Number.isFinite(bn)?an-bn:av.localeCompare(bv,'ar');return dir==='asc'?cmp:-cmp});const body=$('tbody',table);rows.forEach(r=>body.appendChild(r));prefs.sort=i;prefs.dir=dir;localStorage.setItem(prefKey,JSON.stringify(prefs));};});
  if(tIndex===0&&!document.querySelector(`[data-table-tools="${page}"]`)){
   const tools=document.createElement('div');tools.className='table-tools';tools.dataset.tableTools=page;tools.innerHTML=`<button class="mini-btn" data-cols>إظهار/إخفاء الأعمدة</button><button class="mini-btn" data-table-export>تصدير النتائج الحالية</button><button class="mini-btn" data-table-print>طباعة</button>`;table.closest('.table-wrap')?.before(tools);
   tools.querySelector('[data-cols]').onclick=()=>openForm('إعداد أعمدة الجدول',`<form class="form-grid single" data-no-draft="true">${headers.map((h,i)=>`<label class="check-label"><input type="checkbox" name="col_${i}" ${prefs.hidden.includes(i)?'':'checked'}>${escapeHtml(h.innerText)}</label>`).join('')}<button class="btn btn-primary" type="submit">حفظ العرض</button></form>`,async(b)=>{prefs.hidden=headers.map((_,i)=>i).filter(i=>!b[`col_${i}`]);localStorage.setItem(prefKey,JSON.stringify(prefs));applyHidden();});
   tools.querySelector('[data-table-export]').onclick=()=>{if(!guard('filters.export'))return;const visible=headers.map((h,i)=>({i,name:h.innerText})).filter(x=>!prefs.hidden.includes(x.i));const rows=$$('tbody tr',table).map(tr=>Object.fromEntries(visible.map(x=>[x.name,tr.children[x.i]?.innerText.trim()||''])));downloadCsv(rows,`${page}-filtered-${hrToday()}.csv`)};
   tools.querySelector('[data-table-print]').onclick=()=>window.print();
  }
 });
 const controls=$$('input,select','.toolbar');const k=`wardat:page-controls:${state.user?.id||'anon'}:${page}`;let saved={};try{saved=JSON.parse(localStorage.getItem(k)||'{}')}catch{};controls.forEach(el=>{if(el.id&&saved[el.id]!==undefined&&!el.value)el.value=saved[el.id];el.addEventListener('change',()=>{const d={};controls.forEach(x=>{if(x.id)d[x.id]=x.value});localStorage.setItem(k,JSON.stringify(d))})});
}

