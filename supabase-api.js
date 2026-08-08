'use strict';

/**
 * طبقة توافق تجعل واجهة وردة أشبيليا تعمل على GitHub Pages،
 * بينما تُحفظ البيانات فعليًا في Supabase/PostgreSQL.
 */
window.WardatBackend = (() => {
  const cfg = window.WARDAT_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(String(cfg.supabaseUrl || ''))
    && String(cfg.supabaseAnonKey || '').length > 30
    && !String(cfg.supabaseAnonKey).includes('ضع_');

  let client = null;
  let currentAccess = null;
  if (configured && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'wardat-ashbilya-auth'
      },
      global: { headers: { 'x-application-name': 'wardat-ashbilya-github-pages' } }
    });
  }

  function setupError() {
    const e = new Error('لم يتم ربط التطبيق بقاعدة Supabase. افتح ملف config.js وأدخل رابط المشروع وAnon Key، ثم نفّذ ملف supabase/schema.sql داخل SQL Editor.');
    e.status = 503;
    return e;
  }
  function ensureClient() {
    if (!client) throw setupError();
    return client;
  }
  function unwrap(result, fallback = 'تعذر تنفيذ العملية') {
    if (result?.error) {
      const msg = result.error.message || result.error.details || fallback;
      const e = new Error(translateError(msg));
      e.code = result.error.code;
      throw e;
    }
    return result?.data;
  }
  function translateError(message) {
    const m = String(message || '');
    if (/Invalid login credentials/i.test(m)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (/Email not confirmed/i.test(m)) return 'البريد الإلكتروني غير مؤكد داخل Supabase';
    if (/JWT|session|not authenticated|يلزم تسجيل الدخول/i.test(m)) return 'يلزم تسجيل الدخول';
    if (/duplicate key|unique constraint/i.test(m)) return 'السجل موجود مسبقًا أو الرقم مستخدم';
    if (/invalid input syntax for type numeric/i.test(m)) return 'توجد قيمة رقمية غير صحيحة أو حقل رقمي فارغ';
    if (/warehouse_id.*not-null|null value in column.*warehouse_id/i.test(m)) return 'تعذر تحديد المستودع الرئيسي. شغّل ملف إصلاح المستودع V12 ثم أعد المحاولة';
    if (/row-level security|permission denied/i.test(m)) return 'ليست لديك صلاحية لتنفيذ هذه العملية';
    return m.replace(/^Error:\s*/i, '') || 'تعذر تنفيذ العملية';
  }
  function bodyOf(options) {
    if (!options?.body) return {};
    if (typeof options.body === 'string') {
      try { return JSON.parse(options.body); } catch { return {}; }
    }
    return options.body;
  }
  async function profileFor(user) {
    if (!user) return null;
    const access = await rpc('get_current_user_access');
    if (!access?.user || access.user.is_active === false) return null;
    currentAccess = access.user;
    return currentAccess;
  }
  function canLocal(permissionKey) {
    if (!currentAccess || currentAccess.is_active === false) return false;
    return (currentAccess.permissions || []).includes(permissionKey);
  }
  function requireLocal(permissionKey) {
    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    if (keys.some(canLocal)) return;
    const e = new Error('ليست لديك صلاحية لتنفيذ هذه العملية'); e.status = 403; throw e;
  }
  async function rpc(name, args = {}) {
    const c = ensureClient();
    return unwrap(await c.rpc(name, args));
  }
  async function rows(table, select = '*', configure = q => q) {
    const c = ensureClient();
    return unwrap(await configure(c.from(table).select(select)));
  }
  function productImagePath(value='', storagePath='') {
    let raw=String(storagePath||value||'').trim();
    if(!raw)return'';
    const marker='/storage/v1/object/public/product-images/';
    if(raw.includes(marker))raw=raw.split(marker)[1].split('?')[0];
    if(/^https?:\/\//i.test(raw))return'';
    return decodeURIComponent(raw).replace(/^product-images\//,'').replace(/^\/+/, '');
  }
  function productImageUrl(value='',storagePath=''){
    const raw=String(value||'').trim(),path=productImagePath(value,storagePath);
    if(path){
      try{return ensureClient().storage.from('product-images').getPublicUrl(path)?.data?.publicUrl||raw;}
      catch{return raw;}
    }
    return raw;
  }
  function flattenProducts(items = []) {
    return items.map(p => ({
      ...p,
      category_name: p.category_name || p.product_categories?.name_ar || null,
      image_url: productImageUrl(p.image_record_url||p.image_url,p.image_storage_path),
      available_qty: Number(p.available_qty ?? (Number(p.stock_qty || 0) - Number(p.reserved_qty || 0)))
    }));
  }
  function pageArgs(u,defaultSize=40){const page=Math.max(1,Number(u.searchParams.get('page')||1)),pageSize=Math.max(10,Math.min(100,Number(u.searchParams.get('page_size')||defaultSize))),from=(page-1)*pageSize;return{page,pageSize,from,to:from+pageSize-1};}
  function safeSearch(value=''){return String(value).trim().replace(/[,()%*]/g,' ').slice(0,100);}
  function pagedResult(data,count,page,pageSize){return{items:data||[],total:Number(count||0),page,page_size:pageSize,pages:Math.max(1,Math.ceil(Number(count||0)/pageSize))};}


  function validateProductImageFile(file) {
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!(file instanceof File)) throw new Error('ملف الصورة غير صالح');
    if (!allowed.includes(file.type)) throw new Error('الصيغ المسموحة: JPG وPNG وWebP فقط');
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5MB');
  }
  function safeImageExtension(file) {
    const map = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    return map[file.type] || 'jpg';
  }
  async function uploadProductImage(productId, file, options = {}) {
    requireLocal(['products.manage_images','products.create','products.edit']);
    validateProductImageFile(file);
    const c = ensureClient();
    const extension = safeImageExtension(file);
    const path = `${productId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploadResult = await c.storage.from('product-images').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false
    });
    unwrap(uploadResult, 'تعذر رفع صورة المنتج');
    const publicUrl = c.storage.from('product-images').getPublicUrl(path)?.data?.publicUrl;
    if (!publicUrl) {
      await c.storage.from('product-images').remove([path]).catch(()=>{});
      throw new Error('تعذر إنشاء رابط عام للصورة');
    }
    try {
      return await rpc('register_product_image', {
        p_product_id: productId,
        p_url: publicUrl,
        p_storage_path: path,
        p_alt_text: options.altText || file.name || '',
        p_is_primary: Boolean(options.isPrimary)
      });
    } catch (error) {
      await c.storage.from('product-images').remove([path]).catch(()=>{});
      throw error;
    }
  }
  async function uploadExpenseReceipt(expenseId, file) {
    requireLocal('reports.view_financial');
    validateProductImageFile(file);
    const c = ensureClient();
    const extension = safeImageExtension(file);
    const path = `${expenseId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploadResult = await c.storage.from('expense-receipts').upload(path, file, {
      cacheControl: '31536000', contentType: file.type, upsert: false
    });
    unwrap(uploadResult, 'تعذر رفع إيصال المصروف');
    const publicUrl = c.storage.from('expense-receipts').getPublicUrl(path)?.data?.publicUrl;
    if (!publicUrl) {
      await c.storage.from('expense-receipts').remove([path]).catch(()=>{});
      throw new Error('تعذر إنشاء رابط الإيصال');
    }
    try {
      return await rpc('set_expense_receipt_v27', { p_expense_id: expenseId, p_url: publicUrl, p_storage_path: path });
    } catch (error) {
      await c.storage.from('expense-receipts').remove([path]).catch(()=>{});
      throw error;
    }
  }
  async function deleteProductImage(imageId) {
    requireLocal(['products.manage_images','products.edit']);
    const result = await rpc('remove_product_image', { p_image_id: imageId });
    if (result?.storage_path) {
      const removeResult = await ensureClient().storage.from('product-images').remove([result.storage_path]);
      if (removeResult?.error) console.warn('تعذر حذف الملف من Storage:', removeResult.error.message);
    }
    return result;
  }
  async function setPrimaryProductImage(imageId) {
    requireLocal(['products.manage_images','products.edit']);
    return await rpc('set_primary_product_image', { p_image_id: imageId });
  }
  async function reorderProductImages(productId, imageIds) {
    requireLocal(['products.manage_images','products.edit']);
    return await rpc('reorder_product_images', {
      p_product_id: productId,
      p_image_ids: imageIds
    });
  }

  async function request(rawUrl, options = {}) {
    ensureClient();
    const u = new URL(rawUrl, window.location.origin);
    const p = u.pathname;
    const method = String(options.method || 'GET').toUpperCase();
    const body = bodyOf(options);
    const c = client;

    // المصادقة
    if (p === '/api/auth/login' && method === 'POST') {
      const loginId = String(body.email || '').trim().toLowerCase();
      const loginEmail = loginId.includes('@') ? loginId : `${loginId}@cashier.wardat.app`;
      const data = unwrap(await c.auth.signInWithPassword({ email: loginEmail, password: String(body.password || '') }));
      const user = await profileFor(data.user);
      if (!user) {
        await c.auth.signOut();
        throw new Error('الحساب غير مفعل أو لم تُحدد صلاحياته في جدول profiles');
      }
      return { user };
    }
    if (p === '/api/auth/logout' && method === 'POST') {
      unwrap(await c.auth.signOut());currentAccess=null;
      return { ok: true };
    }
    if (p === '/api/auth/change-password' && method === 'POST') {
      const password = String(body.password || '');
      if (password.length < 10) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف');
      unwrap(await c.auth.updateUser({ password }));
      return { ok: true };
    }
    if (p === '/api/auth/me' && method === 'GET') {
      const session = unwrap(await c.auth.getSession())?.session;
      return { user: session?.user ? await profileFor(session.user) : null };
    }
    if (p === '/api/auth/permissions' && method === 'GET') {
      const access = await rpc('get_current_user_access'); currentAccess = access?.user || null; return access;
    }
    if (p === '/api/auth/permissions-version' && method === 'GET') return await rpc('get_my_permissions_version');

    if (p === '/api/settings/financial' && method === 'GET') return await rpc('get_financial_settings');

    // المتجر العام
    if (p === '/api/public/bootstrap' && method === 'GET') {
      const [categories, products, services, reviews] = await Promise.all([
        rows('product_categories', 'id,name_ar,name_en,slug,sort_order', q => q.eq('is_active', true).order('sort_order').order('name_ar')),
        rows('v_public_products', '*', q => q.eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(100)),
        rows('services', '*', q => q.eq('is_active', true).order('base_price')),
        rows('v_public_reviews', '*', q => q.order('created_at', { ascending: false }).limit(8))
      ]);
      return {
        business: { name_ar: 'وردة أشبيليا', name_en: 'WARDAT ASHBILYA', currency: 'SAR' },
        categories,
        products: flattenProducts(products),
        services,
        reviews
      };
    }
    if (p === '/api/public/orders' && method === 'POST') return await rpc('create_public_order', { p_payload: body });
    if (p === '/api/public/bookings' && method === 'POST') return await rpc('create_public_booking', { p_payload: body });


    if (p === '/api/system/client-error' && method === 'POST') {
      try { await rpc('log_client_error', { p_message: String(body.message || ''), p_context: String(body.context || ''), p_stack: String(body.stack || '') }); } catch {}
      return { ok: true };
    }

    // تحقق مركزي في خدمة البيانات. تبقى RLS وRPC هي الحماية النهائية.
    if (!options.skipPermissionCheck) {
      const routeRules = [
        [/^\/api\/dashboard$/, 'dashboard.view'],
        [/^\/api\/categories$/, method==='GET'?'categories.view':'categories.create'],
        [/^\/api\/products\/generate-barcodes$/, 'products.edit'],
        [/^\/api\/products\/[^/]+\/images(?:\/[^/]+)?$/, method==='GET'?'products.view':'products.manage_images'],
        [/^\/api\/products(?:\/[^/]+)?$/, method==='GET'?'products.view':method==='POST'?'products.create':'products.edit'],
        [/^\/api\/inventory$/, 'inventory.view'], [/^\/api\/inventory\/adjust$/, ['inventory.adjust','inventory.issue','inventory.receive']],
        [/^\/api\/damage-records$/, method==='GET'?'damage.view':'damage.create'], [/^\/api\/damage-records\/[^/]+\/status$/, 'damage.approve'],
        [/^\/api\/stocktakes$/, method==='GET'?'stocktake.view':'stocktake.create'], [/^\/api\/stocktakes\/[^/]+$/, 'stocktake.view'], [/^\/api\/stocktakes\/[^/]+\/count$/, 'stocktake.create'], [/^\/api\/stocktakes\/[^/]+\/approve$/, 'stocktake.approve'],
        [/^\/api\/vat-report$/, 'vat.view'], [/^\/api\/excel-import(?:\/[^/]+)?$/, 'excel.import'], [/^\/api\/store-dashboard$/, 'dashboard.view'], [/^\/api\/supplier-payments$/, method==='GET'?'suppliers.view':'suppliers.pay'], [/^\/api\/sales-returns$/, method==='GET'?'orders.view':'orders.return'], [/^\/api\/purchase-returns$/, method==='GET'?'purchases.view':'purchases.create'],
        [/^\/api\/products\/barcode\/[^/]+$/, 'products.view'],
        [/^\/api\/customers$/, method==='GET'?'customers.view':'customers.create'],
        [/^\/api\/orders$/, method==='GET'?'orders.view':'pos.create_sale'], [/^\/api\/orders\/[^/]+\/details$/, 'orders.view'], [/^\/api\/orders\/[^/]+$/, body.status==='cancelled'?'orders.cancel':body.status==='returned'?'orders.return':'orders.edit'],
        [/^\/api\/bookings\/product-options$/, ['bookings.create','bookings.edit','bookings.view']], [/^\/api\/bookings\/[^/]+\/details$/, 'bookings.view'], [/^\/api\/bookings$/, method==='GET'?'bookings.view':'bookings.create'], [/^\/api\/bookings\/[^/]+$/, method==='GET'?'bookings.view':method==='PUT'?'bookings.edit':body.status==='confirmed'?'bookings.approve':body.status==='cancelled'?'bookings.cancel':'bookings.edit'],
        [/^\/api\/quotations$/, method==='GET'?'quotations.view':'quotations.create'], [/^\/api\/quotations\/[^/]+\/approve$/, 'quotations.approve'],
        [/^\/api\/work-orders$/, method==='GET'?'workorders.view':'workorders.create'], [/^\/api\/work-orders\/[^/]+$/, ['workorders.edit','workorders.assign','workorders.update_status','workorders.upload_files','workorders.complete']],
        [/^\/api\/employees$/, ['employees.view','workorders.assign']],
        [/^\/api\/supplier-excel$/, 'suppliers.view'], [/^\/api\/supplier-excel\/supplier$/, 'suppliers.create'], [/^\/api\/supplier-excel\/invoice$/, 'purchases.create'], [/^\/api\/supplier-excel\/payment$/, 'suppliers.pay'],
        [/^\/api\/custody-excel$/, 'reports.view_financial'], [/^\/api\/custody-excel\/row$/, 'reports.view_financial'],
        [/^\/api\/suppliers$/, method==='GET'?'suppliers.view':'suppliers.create'],
        [/^\/api\/purchase-orders$/, method==='GET'?'purchases.view':'purchases.create'], [/^\/api\/purchase-orders\/[^/]+\/details$/, 'purchases.view'], [/^\/api\/purchase-orders\/[^/]+\/receive$/, 'purchases.receive'],
        [/^\/api\/smart\/suggestions$/, 'smart.view'], [/^\/api\/reports$/, 'reports.view'],
        [/^\/api\/notifications$/, 'notifications.view'], [/^\/api\/notifications\/read$/, 'notifications.resolve'],
        [/^\/api\/audit$/, 'audit.view'], [/^\/api\/attendance\/state$/, 'attendance.view'], [/^\/api\/attendance\/clock$/, 'attendance.clock'], [/^\/api\/attendance\/dashboard$/, 'attendance.view'], [/^\/api\/attendance\/month$/, 'attendance.view'], [/^\/api\/leaves\/types$/, 'leaves.view'], [/^\/api\/leaves$/, method==='GET'?'leaves.view':'leaves.create'], [/^\/api\/leaves\/[^/]+$/, 'leaves.approve'], [/^\/api\/payroll\/my-payslips$/, 'payroll.view_self'], [/^\/api\/payroll\/runs$/, method==='GET'?'payroll.view':'payroll.create'], [/^\/api\/payroll\/runs\/[^/]+$/, 'payroll.view'], [/^\/api\/payroll\/runs\/[^/]+\/calculate$/, 'payroll.recalculate'], [/^\/api\/payroll\/runs\/[^/]+\/status$/, 'payroll.approve'], [/^\/api\/payroll\/items\/[^/]+\/pay$/, 'payroll.pay'], [/^\/api\/compensation$/, method==='GET'?'compensation.view':'compensation.create'], [/^\/api\/compensation\/[^/]+\/[^/]+\/approve$/, 'compensation.approve'], [/^\/api\/filter-presets$/, method==='GET'?'filters.use':'filters.save'], [/^\/api\/data-quality$/, 'data_quality.view'], [/^\/api\/data-quality\/action$/, 'data_quality.resolve'], [/^\/api\/settings\/financial$/, method==='GET'?'settings.view':'settings.manage'], [/^\/api\/settings\/clear-demo$/, 'settings.clear_demo'], [/^\/api\/documents\//, 'documents.view'], [/^\/api\/records\//, method==='GET'?'audit.view':'records.soft_delete'],
        [/^\/api\/access\/users(?:\/[^/]+)?$/, method==='GET'?'users.view':method==='POST'?'users.create':method==='PATCH'?['users.edit','users.disable']:'users.manage_permissions'],
        [/^\/api\/access\/roles$/, 'roles.view'], [/^\/api\/access\//, 'users.manage_permissions']
      ];
      const rule = routeRules.find(([rx]) => rx.test(p));
      if (rule) requireLocal(rule[1]);
    }

    // لوحة الإدارة
    if (p === '/api/dashboard' && method === 'GET') return await rpc('get_dashboard');
    if (p === '/api/shop-system' && method === 'GET') {
      // V28 Excel Mode deliberately uses the Excel workflow RPC as the primary source.
      // This keeps the screen working even when the optional V27 migration has not been
      // installed in Supabase (the previous build stopped here with PGRST202).
      const month=u.searchParams.get('month')||new Date().toISOString().slice(0,10);
      const base=await rpc('get_shop_excel_system_v25',{p_month:month});
      // V47: correct the daily-sales sheet. The older V25 query counted booking
      // payments as sales and historical supplier invoices as purchases.
      // Keep V25 for the rest of the Excel-mode sections, but replace only the
      // daily sheet with the corrected POS-only calculation when V47 is installed.
      try{
        const daily=await rpc('get_daily_sales_excel_v47',{p_month:month});
        return {...base,...daily,excel_mode:true,v27_accounting:false,daily_sales_v47:true};
      }catch(err){
        const msg=String(err?.message||err||'');
        if(/get_daily_sales_excel_v47|PGRST202|schema cache|does not exist/i.test(msg)){
          return {...base,excel_mode:true,v27_accounting:false,daily_sales_v47:false};
        }
        throw err;
      }
    }
    if (p === '/api/custody-excel' && method === 'GET')
      return await rpc('get_custody_excel_system_v33');
    if (p === '/api/custody-excel/row' && method === 'POST')
      return await rpc('upsert_cash_custody_excel_v33',{p_id:body.id||null,p_payload:body});

    if (p === '/api/shop-system/custodies' && method === 'POST')
      return await rpc('upsert_cash_custody_v25',{p_id:null,p_payload:body});
    const shopCustodyMatch=p.match(/^\/api\/shop-system\/custodies\/([^/]+)$/);
    if(shopCustodyMatch&&method==='PUT')
      return await rpc('upsert_cash_custody_v25',{p_id:shopCustodyMatch[1],p_payload:body});
    if(shopCustodyMatch&&method==='DELETE')
      return await rpc('delete_cash_custody_v25',{p_id:shopCustodyMatch[1],p_reason:body.reason||''});
    if (p === '/api/shop-system/deliveries' && method === 'POST')
      return await rpc('upsert_driver_delivery_log_v25',{p_id:null,p_payload:body});
    const shopDeliveryMatch=p.match(/^\/api\/shop-system\/deliveries\/([^/]+)$/);
    if(shopDeliveryMatch&&method==='PUT')
      return await rpc('upsert_driver_delivery_log_v25',{p_id:shopDeliveryMatch[1],p_payload:body});
    if(shopDeliveryMatch&&method==='DELETE')
      return await rpc('delete_driver_delivery_log_v25',{p_id:shopDeliveryMatch[1],p_reason:body.reason||''});
    if (p === '/api/shop-system/booking-payment' && method === 'POST')
      return await rpc('register_booking_payment_v25',{
        p_booking_id:body.booking_id,p_amount:Number(body.amount),
        p_method:body.method||'cash',p_notes:body.notes||null
      });
    if (p === '/api/shop-system/purchase-payment' && method === 'POST') {
      try {
        return await rpc('record_supplier_payment_v27',{
          p_purchase_order_id:body.purchase_order_id,p_amount:Number(body.amount),p_method:body.method||'cash',
          p_transaction_ref:body.transaction_ref||null,p_notes:body.notes||null,p_idempotency_key:body.idempotency_key||crypto.randomUUID()
        });
      } catch (error) {
        if (!/record_supplier_payment_v27|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||''))) throw error;
        const result=await rpc('record_purchase_payment_v25',{p_purchase_order_id:body.purchase_order_id,p_amount:Number(body.amount),p_notes:body.notes||null});
        return {...result,compatibility_mode:true};
      }
    }
    if (p === '/api/shop-system/expenses' && method === 'POST')
      return await rpc('create_expense_v25',{p_payload:body});

    // التصنيفات والمنتجات
    if (p === '/api/categories' && method === 'GET') {
      return { items: await rows('product_categories', '*', q => q.order('sort_order').order('name_ar')) };
    }
    if (p === '/api/categories' && method === 'POST') return await rpc('create_category', { p_payload: body });
    if (p === '/api/products' && method === 'GET') {
      const activeOnly = u.searchParams.get('active') === '1',search=safeSearch(u.searchParams.get('search')||''),{page,pageSize,from,to}=pageArgs(u,activeOnly?100:40);
      let q = c.from('v_products').select('*',{count:'exact'}).order('created_at', { ascending: false }).range(from,to);
      if (activeOnly) q = q.eq('is_active', true);
      const categoryId=u.searchParams.get('category_id');if(categoryId)q=q.eq('category_id',categoryId);
      if (search) q=q.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
      const result=await q;const data=unwrap(result);return {...pagedResult(flattenProducts(data),result.count,page,pageSize)};
    }
    if (p === '/api/products' && method === 'POST') return await rpc('upsert_product_v21', { p_id: null, p_payload: body });
    if (p === '/api/products/generate-barcodes' && method === 'POST') return await rpc('generate_missing_product_barcodes_v27_r1', { p_limit: Number(body.limit)||1000 });
    const barcodeProductMatch = p.match(/^\/api\/products\/barcode\/([^/]+)$/);
    if (barcodeProductMatch && method === 'GET') {
      const code=decodeURIComponent(barcodeProductMatch[1]);
      const data=unwrap(await c.from('v_products').select('*').eq('barcode',code).eq('is_active',true).limit(1));
      return {item:flattenProducts(data||[])[0]||null};
    }
    const productImagesMatch = p.match(/^\/api\/products\/([^/]+)\/images$/);
    if (productImagesMatch && method === 'GET') {
      const imageItems=await rpc('list_product_images',{p_product_id:productImagesMatch[1]});return {items:(imageItems||[]).map(i=>({...i,url:productImageUrl(i.url,i.storage_path)}))};
    }
    const productPrimaryImageMatch = p.match(/^\/api\/products\/[^/]+\/images\/([^/]+)\/primary$/);
    if (productPrimaryImageMatch && method === 'POST') {
      return await setPrimaryProductImage(productPrimaryImageMatch[1]);
    }
    const productImageDeleteMatch = p.match(/^\/api\/products\/[^/]+\/images\/([^/]+)$/);
    if (productImageDeleteMatch && method === 'DELETE') {
      return await deleteProductImage(productImageDeleteMatch[1]);
    }
    if (productImagesMatch && method === 'PATCH') {
      return await reorderProductImages(productImagesMatch[1], body.image_ids || []);
    }


    const productMatch = p.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && method === 'PUT') return await rpc('upsert_product_v21', { p_id: productMatch[1], p_payload: body });

    // المخزون
    if (p === '/api/inventory' && method === 'GET') {
      const [items,movements,summary]=await Promise.all([
        rows('v_inventory','*',q=>q.order('name_ar')),
        rows('v_inventory_movements','*',q=>q.order('created_at',{ascending:false}).limit(100)),
        rpc('get_inventory_summary')
      ]);
      return {items,movements,summary};
    }
    if (p === '/api/inventory/adjust' && method === 'POST') return await rpc('adjust_inventory', { p_payload: body });

    // التالف والجرد V27
    if (p === '/api/damage-records' && method === 'GET') return await rpc('get_damage_records_v27',{p_from:u.searchParams.get('from')||null,p_to:u.searchParams.get('to')||null});
    if (p === '/api/damage-records' && method === 'POST') return await rpc('create_damage_record_v27',{p_payload:body});
    const damageStatusMatch=p.match(/^\/api\/damage-records\/([^/]+)\/status$/);
    if(damageStatusMatch&&method==='POST')return await rpc('set_damage_status_v27',{p_id:damageStatusMatch[1],p_status:body.status,p_reason:body.reason||null});
    if (p === '/api/stocktakes' && method === 'GET') return await rpc('get_stocktakes_v27');
    if (p === '/api/stocktakes' && method === 'POST') return await rpc('create_stocktake_v27',{p_payload:body});
    const stocktakeCountMatch=p.match(/^\/api\/stocktakes\/([^/]+)\/count$/);
    if(stocktakeCountMatch&&method==='POST')return await rpc('set_stocktake_count_v27',{p_id:stocktakeCountMatch[1],p_product_id:body.product_id,p_actual_qty:body.actual_qty??null,p_delta:body.delta??null,p_notes:body.notes||null});
    const stocktakeApproveMatch=p.match(/^\/api\/stocktakes\/([^/]+)\/approve$/);
    if(stocktakeApproveMatch&&method==='POST')return await rpc('approve_stocktake_v27',{p_id:stocktakeApproveMatch[1],p_reason:body.reason||null});
    const stocktakeMatch=p.match(/^\/api\/stocktakes\/([^/]+)$/);
    if(stocktakeMatch&&method==='GET')return await rpc('get_stocktake_details_v27',{p_id:stocktakeMatch[1]});

    // العملاء
    if (p === '/api/customers' && method === 'GET') {const search=safeSearch(u.searchParams.get('search')||''),{page,pageSize,from,to}=pageArgs(u);let q=c.from('v_customers').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(from,to);if(search)q=q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,customer_no.ilike.%${search}%`);const result=await q;return pagedResult(unwrap(result),result.count,page,pageSize);}
    if (p === '/api/customers' && method === 'POST') return await rpc('create_customer', { p_payload: body });

    // الطلبات ونقطة البيع
    if (p === '/api/orders' && method === 'GET') {const search=safeSearch(u.searchParams.get('search')||''),{page,pageSize,from,to}=pageArgs(u);let q=c.from('v_orders').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(from,to);if(search)q=q.or(`order_no.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);const result=await q;return pagedResult(unwrap(result),result.count,page,pageSize);}
    if (p === '/api/orders' && method === 'POST') {
      const isMissingRpc=(error,name)=>new RegExp(`${name}|schema cache|PGRST202|Could not find the function|does not exist`,'i').test(String(error?.message||''));
      try { return await rpc('create_pos_order_v45', { p_payload: body }); }
      catch (e45) {
        if (!isMissingRpc(e45,'create_pos_order_v45')) throw e45;
        try { return await rpc('create_pos_order_v34', { p_payload: body }); }
        catch (e34) {
          if (!isMissingRpc(e34,'create_pos_order_v34')) throw e34;
          try { return await rpc('create_pos_order_v27', { p_payload: body }); }
          catch (e27) {
            if (!isMissingRpc(e27,'create_pos_order_v27')) throw e27;
            // توافق أخير مع قواعد البيانات الأقدم: يسمح بإتمام البيع بدل توقف الكاشير بالكامل.
            // بعد تركيب SQL V45 سيعود الدفع المختلط واسم الكاشير للعمل من الخادم.
            const pays=Array.isArray(body?.payments)?body.payments.filter(x=>Number(x?.amount||0)>0):[];
            const totalPaid=pays.reduce((sum,x)=>sum+Number(x.amount||0),0);
            const firstMethod=pays[0]?.method||body?.payment_method||'cash';
            return await rpc('create_pos_order_v21',{p_payload:{...body,paid_amount:totalPaid||Number(body?.paid_amount||0),payment_method:firstMethod}});
          }
        }
      }
    }
    const orderDetailsV27Match=p.match(/^\/api\/orders\/([^/]+)\/details$/);
    if(orderDetailsV27Match&&method==='GET'){
      const item=unwrap(await c.from('v_orders').select('*').eq('id',orderDetailsV27Match[1]).single());
      const items=unwrap(await c.from('order_items').select('id,order_id,product_id,description,qty,unit_price,cost,discount,total,tax_amount,total_including_tax').eq('order_id',orderDetailsV27Match[1]).order('id'));
      return {item,items};
    }
    const orderMatch = p.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && method === 'PATCH') {
      if (body.status === 'returned') throw new Error('استخدم شاشة المرتجعات لإنشاء مرتجع مبيعات مرتبط بالفاتورة؛ تم إيقاف الإرجاع القديم لمنع تكرار حركة المخزون.');
      return await rpc('update_order_status', { p_order_id: orderMatch[1], p_status: body.status, p_reason: body.reason || '' });
    }

    // الحجوزات
    if (p === '/api/bookings' && method === 'GET') {const search=safeSearch(u.searchParams.get('search')||''),{page,pageSize,from,to}=pageArgs(u);let q=c.from('v_bookings').select('*',{count:'exact'}).order('start_at',{ascending:false}).range(from,to);if(search)q=q.or(`booking_no.ilike.%${search}%,customer_name.ilike.%${search}%,event_type.ilike.%${search}%,phone.ilike.%${search}%`);const result=await q;return pagedResult(unwrap(result),result.count,page,pageSize);}
    if (p === '/api/bookings' && method === 'POST') return await rpc('create_staff_booking', { p_payload: body });
    if (p === '/api/bookings/product-options' && method === 'GET') return { items: await rpc('list_booking_product_options') };
    const bookingDetailsMatch = p.match(/^\/api\/bookings\/([^/]+)\/details$/);
    if (bookingDetailsMatch && method === 'GET') return await rpc('get_booking_details', { p_booking_id: bookingDetailsMatch[1] });
    const bookingMatch = p.match(/^\/api\/bookings\/([^/]+)$/);
    if (bookingMatch && method === 'PUT') return await rpc('update_booking_full', { p_booking_id: bookingMatch[1], p_payload: body });
    if (bookingMatch && method === 'PATCH') return await rpc('update_booking_record', {
      p_booking_id: bookingMatch[1],
      p_status: body.status,
      p_paid_amount: Number(body.paid_amount || 0),
      p_reason: body.reason || ''
    });

    // عروض الأسعار
    if (p === '/api/quotations' && method === 'GET') return { items: await rows('v_quotations', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/quotations' && method === 'POST') return await rpc('create_quotation', { p_payload: body });
    const approveMatch = p.match(/^\/api\/quotations\/([^/]+)\/approve$/);
    if (approveMatch && method === 'POST') return await rpc('approve_quotation', { p_quotation_id: approveMatch[1] });

    // أوامر العمل والموظفون
    if (p === '/api/work-orders' && method === 'GET') return { items: await rows('v_work_orders', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/work-orders' && method === 'POST') return await rpc('create_work_order', { p_payload: body });
    const workOrderMatch = p.match(/^\/api\/work-orders\/([^/]+)$/);
    if (workOrderMatch && method === 'PATCH') return await rpc('update_work_order', { p_work_order_id: workOrderMatch[1], p_payload: body });
    if (p === '/api/employees' && method === 'GET') {
      const includeInactive=u.searchParams.get('include_inactive')==='1';
      return {items:await rows('v_employees','*',q=>{
        if(!includeInactive)q=q.eq('is_active',true);
        return q.order('name');
      })};
    }
    if (p === '/api/employees' && method === 'POST')
      return await rpc('upsert_employee_v20',{p_employee_id:null,p_payload:body});
    const employeeMatch=p.match(/^\/api\/employees\/([^/]+)$/);
    if(employeeMatch&&method==='PUT')
      return await rpc('upsert_employee_v20',{p_employee_id:employeeMatch[1],p_payload:body});
    const employeeStatusMatch=p.match(/^\/api\/employees\/([^/]+)\/status$/);
    if(employeeStatusMatch&&method==='PATCH')
      return await rpc('set_employee_active_v20',{
        p_employee_id:employeeStatusMatch[1],
        p_is_active:!!body.is_active,
        p_reason:body.reason||''
      });
    const employeeCashierMatch=p.match(/^\/api\/employees\/([^/]+)\/cashier-access$/);
    if(employeeCashierMatch&&method==='POST')
      return await rpc('set_employee_cashier_access_v34',{p_employee_id:employeeCashierMatch[1]});

    if (p === '/api/access/employee-users' && method === 'GET') {
      requireLocal('users.create');
      return { items: await rpc('list_employee_cashier_accounts_v35') };
    }
    const employeePasswordResetMatch=p.match(/^\/api\/access\/employee-users\/([^/]+)\/reset-password$/);
    if(employeePasswordResetMatch&&method==='POST'){
      requireLocal('users.create');
      const password=String(body.password||'');
      if(password.length<10)throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف');
      return await rpc('reset_employee_cashier_password_v44',{
        p_employee_id:employeePasswordResetMatch[1],
        p_password:password,
        p_reason:String(body.reason||'إعادة تعيين كلمة مرور موظف من شاشة بيانات الدخول V44')
      });
    }
    const employeeUserMatch=p.match(/^\/api\/access\/employee-users\/([^/]+)$/);
    if(employeeUserMatch&&method==='POST'){
      requireLocal('users.create');
      const employeeId=employeeUserMatch[1];
      const username=String(body.username||'').trim().toLowerCase();
      const password=String(body.password||'');
      if(password.length<10)throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف');
      // V37: الخادم يضمن اسم مستخدم فريدًا تلقائيًا حتى لو كان المقترح مكررًا.
      const created=await rpc('create_employee_cashier_user_v37',{
        p_employee_id:employeeId,
        p_username:username||null,
        p_password:password,
        p_reason:String(body.reason||'إنشاء حساب كاشير للموظف V37 - اسم متسلسل فريد')
      });
      return created;
    }

    // الموردون والمشتريات
    if (p === '/api/suppliers' && method === 'GET') return { items: await rows('v_suppliers', '*', q => q.order('name')) };
    if (p === '/api/suppliers' && method === 'POST') {
      try { return await rpc('create_supplier_v27', { p_payload: body }); }
      catch (error) {
        if (!/create_supplier_v27|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||''))) throw error;
        const result=await rpc('create_supplier', { p_payload: body });
        return {...result,compatibility_mode:true};
      }
    }
    if (p === '/api/purchase-orders' && method === 'GET') return { items: await rows('v_purchase_orders', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/purchase-orders' && method === 'POST') {
      try { return await rpc('create_purchase_order_v27', { p_payload: body }); }
      catch (error) {
        if (!/create_purchase_order_v27|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||''))) throw error;
        const result=await rpc('create_purchase_order', { p_payload: body });
        return {...result,compatibility_mode:true};
      }
    }
    const purchaseDetailsMatch = p.match(/^\/api\/purchase-orders\/([^/]+)\/details$/);
    if (purchaseDetailsMatch && method === 'GET') {
      const po=unwrap(await c.from('v_purchase_orders').select('*').eq('id',purchaseDetailsMatch[1]).single());
      const items=unwrap(await c.from('purchase_order_items').select('id,purchase_order_id,product_id,description,qty,received_qty,unit_price,total,tax_amount,total_including_tax').eq('purchase_order_id',purchaseDetailsMatch[1]).order('id'));
      return {item:po,items};
    }
    const receiveMatch = p.match(/^\/api\/purchase-orders\/([^/]+)\/receive$/);
    if (receiveMatch && method === 'POST') return await rpc('receive_purchase_order', { p_purchase_order_id: receiveMatch[1] });
    if (p === '/api/sales-returns' && method === 'GET') return {items:await rows('sales_returns','*',q=>q.order('created_at',{ascending:false}).limit(200))};
    if (p === '/api/sales-returns' && method === 'POST') return await rpc('create_sales_return_v27',{p_payload:body});
    if (p === '/api/purchase-returns' && method === 'GET') return {items:await rows('purchase_returns','*',q=>q.order('created_at',{ascending:false}).limit(200))};
    if (p === '/api/purchase-returns' && method === 'POST') return await rpc('create_purchase_return_v27',{p_payload:body});

    // الحضور والإجازات والرواتب والفلاتر V8
    if (p === '/api/hr/setup' && method === 'GET') return await rpc('get_hr_setup');
    if (p === '/api/hr/locations' && method === 'POST') return await rpc('save_work_location',{p_payload:body});
    if (p === '/api/hr/shifts' && method === 'POST') return await rpc('save_work_shift',{p_payload:body});
    if (p === '/api/hr/assignments' && method === 'POST') return await rpc('save_shift_assignment',{p_payload:body});
    if (p === '/api/hr/salary-profile' && method === 'POST') return await rpc('save_salary_profile',{p_payload:body});
    if (p === '/api/attendance/manual' && method === 'POST') return await rpc('save_manual_attendance',{p_payload:body});
    if (p === '/api/attendance/quick' && method === 'POST')
      return await rpc('quick_mark_attendance_v22',{
        p_employee_id:body.employee_id,
        p_work_date:body.work_date,
        p_status:body.status
      });
    if (p === '/api/attendance/monthly' && method === 'GET')
      return await rpc('get_monthly_attendance_grid_v23',{
        p_month:u.searchParams.get('month')||null,
        p_branch:u.searchParams.get('branch')||null,
        p_department:u.searchParams.get('department')||null
      });
    if (p === '/api/attendance/state' && method === 'GET') return await rpc('get_my_attendance_state');
    if (p === '/api/attendance/clock' && method === 'POST') return await rpc('attendance_clock',{p_action:body.action,p_lat:body.lat??null,p_lng:body.lng??null,p_accuracy:body.accuracy??null,p_device:body.device||null,p_photo:body.photo||null,p_qr_token:body.qr_token||null});
    if (p === '/api/attendance/dashboard' && method === 'GET') return await rpc('get_attendance_dashboard',{p_date:u.searchParams.get('date')||null,p_branch:u.searchParams.get('branch')||null,p_department:u.searchParams.get('department')||null,p_status:u.searchParams.get('status')||null});
    if (p === '/api/attendance/month' && method === 'GET') return await rpc('get_attendance_month',{p_employee_id:u.searchParams.get('employee_id')||null,p_month:u.searchParams.get('month')||new Date().toISOString().slice(0,10)});
    if (p === '/api/leaves/types' && method === 'GET') return {items:await rows('leave_types','*',q=>q.eq('is_active',true).order('name'))};
    if (p === '/api/leaves' && method === 'GET') return await rpc('get_leave_requests',{p_status:u.searchParams.get('status')||null,p_from:u.searchParams.get('from')||null,p_to:u.searchParams.get('to')||null,p_employee_id:u.searchParams.get('employee_id')||null});
    if (p === '/api/leaves' && method === 'POST') return await rpc('create_leave_request',{p_payload:body});
    const leaveMatch=p.match(/^\/api\/leaves\/([^/]+)$/);if(leaveMatch&&method==='PATCH')return await rpc('update_leave_status',{p_leave_id:leaveMatch[1],p_status:body.status,p_notes:body.notes||''});
    if (p === '/api/payroll/my-payslips' && method === 'GET') return await rpc('get_my_payslips');
    if (p === '/api/payroll/runs' && method === 'GET') return await rpc('get_payroll_runs',{p_month:u.searchParams.get('month')||null});
    if (p === '/api/payroll/runs' && method === 'POST') return await rpc('create_payroll_run',{p_month:body.month,p_branch:body.branch||null,p_department:body.department||null});
    const runMatch=p.match(/^\/api\/payroll\/runs\/([^/]+)$/);if(runMatch&&method==='GET')return await rpc('get_payroll_run_details',{p_run_id:runMatch[1]});
    const calcMatch=p.match(/^\/api\/payroll\/runs\/([^/]+)\/calculate$/);if(calcMatch&&method==='POST')return await rpc('calculate_payroll_run',{p_run_id:calcMatch[1]});
    const statusRunMatch=p.match(/^\/api\/payroll\/runs\/([^/]+)\/status$/);if(statusRunMatch&&method==='POST')return await rpc('update_payroll_run_status',{p_run_id:statusRunMatch[1],p_status:body.status,p_notes:body.notes||''});
    const payItemMatch=p.match(/^\/api\/payroll\/items\/([^/]+)\/pay$/);if(payItemMatch&&method==='POST')return await rpc('pay_payroll_item',{p_item_id:payItemMatch[1],p_amount:Number(body.amount),p_method:body.method,p_reference:body.reference||null});
    if (p === '/api/compensation' && method === 'GET') return await rpc('get_employee_compensation',{p_month:u.searchParams.get('month')||null,p_employee_id:u.searchParams.get('employee_id')||null});
    if (p === '/api/compensation' && method === 'POST') return await rpc('create_employee_compensation',{p_type:body.type,p_payload:body.payload});
    const compMatch=p.match(/^\/api\/compensation\/([^/]+)\/([^/]+)\/approve$/);if(compMatch&&method==='POST')return await rpc('approve_employee_compensation',{p_type:compMatch[1],p_id:compMatch[2],p_status:body.status,p_reason:body.reason||''});
    if (p === '/api/filter-presets' && method === 'GET') return await rpc('get_filter_presets',{p_page_key:u.searchParams.get('page_key')||''});
    if (p === '/api/filter-presets' && method === 'POST') return await rpc('save_filter_preset',{p_page_key:body.page_key,p_name:body.name,p_filters:body.filters||{},p_is_default:!!body.is_default,p_is_shared:!!body.is_shared});

    // جودة البيانات ومسارات الحالات
    if (p === '/api/workflows/transitions' && method === 'GET') return await rpc('get_allowed_status_transitions',{p_entity_type:u.searchParams.get('entity'),p_current_status:u.searchParams.get('status')});
    if (p === '/api/data-quality' && method === 'GET') return await rpc('get_data_quality_report',{p_limit:200});
    if (p === '/api/data-quality/action' && method === 'POST') return await rpc('resolve_data_quality_issue',{p_issue_code:body.issue_code,p_entity_id:String(body.entity_id),p_action:body.action,p_reason:body.reason});

    // الذكاء والتقارير
    if (p === '/api/store-dashboard' && method === 'GET') {
      const from=u.searchParams.get('from')||new Date().toISOString().slice(0,10),to=u.searchParams.get('to')||from;
      try {
        return await rpc('get_store_dashboard_v27',{p_from:from,p_to:to});
      } catch (error) {
        // Compatibility fallback for databases that are still on the Excel workflow (V25/V26).
        if (!/get_store_dashboard_v27|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||''))) throw error;
        const base=await rpc('get_shop_excel_system_v25',{p_month:`${String(from).slice(0,7)}-01`});
        const m=base?.dashboard||{};
        return {
          sales_total:Number(m.sales_total||0),cost_of_goods:Number(m.cost_of_goods||0),gross_profit:Number(m.gross_profit||0),
          expenses_total:Number(m.expenses_total||0),damage_total:0,net_profit:Number(m.net_profit||0),
          opening_inventory_value:Number(m.inventory_value||0),inventory_value:Number(m.inventory_value||0),inventory_change:0,
          purchases_added_value:Number(base?.purchase_summary?.total||0),purchases_total:Number(base?.purchase_summary?.total||0),supplier_due:Number(base?.purchase_summary?.remaining||0),
          bookings_due:Number(base?.booking_summary?.remaining||0),custodies_due:Number(base?.custody_summary?.remaining_total||0),courier_total:Number(base?.delivery_summary?.amount_total||0),payroll_total:Number(base?.payroll_summary?.net_total||0),
          output_vat:0,input_vat:0,vat_due:0,daily_sales:(base?.daily_sales||[]).map(x=>({day:x.date,sales:Number(x.sales_total??x.net_total??0),cogs:0,expenses:Number(x.expenses||0),damage:0,purchases:Number(x.purchases||0),profit:Number(x.net_total||0)})),
          payment_breakdown:base?.payment_breakdown||[],top_products:[],low_products:[],low_stock:Number(m.low_stock||0),out_of_stock:Number(m.out_of_stock||0),product_count:Number(base?.inventory_summary?.count||0),losing_products:Number(m.loss_products||0),compatibility_mode:true
        };
      }
    }
    if (p === '/api/vat-report' && method === 'GET') return await rpc('get_vat_report_v27',{p_year:Number(u.searchParams.get('year')),p_quarter:Number(u.searchParams.get('quarter'))});
    if (p === '/api/excel-import/logs' && method === 'GET') return {items:await rows('excel_import_runs','*',q=>q.order('created_at',{ascending:false}).limit(100))};
    if (p === '/api/excel-import/log' && method === 'POST') return await rpc('log_excel_import_v27',{p_payload:body});
    if (p === '/api/excel-import/historical-sales' && method === 'POST') return await rpc('import_historical_sales_v27',{p_payload:body});
    if (p === '/api/excel-import/supplier-invoice' && method === 'POST') return await rpc('import_supplier_invoice_v27',{p_payload:body});
    if (p === '/api/excel-import/supplier-payment' && method === 'POST') return await rpc('import_supplier_payment_v27',{p_payload:body});
    if (p === '/api/supplier-payments' && method === 'GET') return {items:await rows('supplier_payments','*',q=>q.order('paid_at',{ascending:false}).limit(250))};
    if (p === '/api/supplier-payments' && method === 'POST') return await rpc('record_supplier_payment_v27',{p_purchase_order_id:body.purchase_order_id,p_amount:Number(body.amount),p_method:body.method||'cash',p_transaction_ref:body.transaction_ref||null,p_notes:body.notes||null,p_idempotency_key:body.idempotency_key||crypto.randomUUID()});
    // V30 — كشف حساب الموردين بنفس تبويبات Excel
    if (p === '/api/supplier-excel' && method === 'GET') return await rpc('get_supplier_excel_system_v30');
    if (p === '/api/supplier-excel/supplier' && method === 'POST') {
      try{return await rpc('create_supplier_excel_v30',{p_payload:body});}
      catch(error){if(!/create_supplier_excel_v30|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||'')))throw error;try{return await rpc('create_supplier_v27',{p_payload:body});}catch{return await rpc('create_supplier',{p_payload:body});}}
    }
    if (p === '/api/supplier-excel/invoice' && method === 'POST') {
      try{return await rpc('create_supplier_invoice_excel_v30',{p_payload:body});}
      catch(error){if(!/create_supplier_invoice_excel_v30|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||'')))throw error;return await rpc('import_supplier_invoice_v27',{p_payload:body});}
    }
    if (p === '/api/supplier-excel/payment' && method === 'POST') {
      try{return await rpc('create_supplier_payment_excel_v30',{p_payload:body});}
      catch(error){if(!/create_supplier_payment_excel_v30|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||'')))throw error;return await rpc('import_supplier_payment_v27',{p_payload:body});}
    }

    // V32 — كشف الحجوزات بنفس ملف Excel المرجعي
    if (p === '/api/booking-excel' && method === 'GET') return await rpc('get_booking_excel_system_v32');
    if (p === '/api/booking-excel/booking' && method === 'POST') return await rpc('create_booking_excel_v32',{p_payload:body});
    if (p === '/api/booking-excel/payment' && method === 'POST') return await rpc('record_booking_payment_excel_v32',{p_payload:body});

    if (p === '/api/smart/suggestions' && method === 'GET') return await rpc('get_smart_suggestions');
    if (p === '/api/reports' && method === 'GET') return await rpc('get_report', {
      p_type: u.searchParams.get('type') || 'sales',
      p_from: u.searchParams.get('from') || '1900-01-01',
      p_to: u.searchParams.get('to') || '2999-12-31'
    });

    // الإشعارات والسجل والإعدادات
    if (p === '/api/notifications' && method === 'GET') return { items: await rows('notifications', '*', q => q.order('created_at', { ascending: false }).limit(100)) };
    if (p === '/api/notifications/read' && method === 'POST') {
      let q = c.from('notifications').update({ status: 'read' }).eq('status', 'unread');
      if (body.id) q = q.eq('id', body.id);
      unwrap(await q);
      return { ok: true };
    }
    if (p === '/api/audit' && method === 'GET') return { items: await rows('v_audit_logs', '*', q => q.order('created_at', { ascending: false }).limit(250)) };
    if (p === '/api/settings/clear-demo' && method === 'POST') return await rpc('clear_demo_data');


    if (p === '/api/settings/financial' && method === 'POST') return await rpc('save_financial_settings',{p_payload:body});
    const documentMatch=p.match(/^\/api\/documents\/([^/]+)\/([^/]+)$/);if(documentMatch&&method==='GET'){
      try{return await rpc('get_print_document_v34',{p_type:documentMatch[1],p_id:documentMatch[2]});}
      catch(error){if(!/get_print_document_v34|schema cache|PGRST202|Could not find the function/i.test(String(error?.message||'')))throw error;return await rpc('get_print_document',{p_type:documentMatch[1],p_id:documentMatch[2]});}
    }
    const deleteMatch=p.match(/^\/api\/records\/([^/]+)\/([^/]+)\/soft-delete$/);if(deleteMatch&&method==='POST')return await rpc('soft_delete_record',{p_entity:deleteMatch[1],p_id:deleteMatch[2],p_reason:body.reason||''});
    const restoreMatch=p.match(/^\/api\/records\/([^/]+)\/([^/]+)\/restore$/);if(restoreMatch&&method==='POST')return await rpc('restore_record',{p_entity:restoreMatch[1],p_id:restoreMatch[2],p_reason:body.reason||''});
    const auditMatch=p.match(/^\/api\/records\/([^/]+)\/([^/]+)\/audit$/);if(auditMatch&&method==='GET')return {items:await rows('v_audit_logs','*',q=>q.eq('entity_id',auditMatch[2]).order('created_at',{ascending:false}).limit(100))};

    // إدارة المستخدمين والصلاحيات
    if (p === '/api/access/users' && method === 'POST') {
      requireLocal('users.create');

      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();
      if (!email || !name) throw new Error('الاسم والبريد الإلكتروني إلزاميان');
      if (password.length < 10) throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف');

      const creationToken = crypto.randomUUID();
      const tempClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `wardat-create-user-${crypto.randomUUID()}`
        },
        global: { headers: { 'x-application-name': 'wardat-create-staff-user' } }
      });

      const signResult = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone: String(body.phone || '').trim(),
            staff_creation_token: creationToken
          }
        }
      });

      if (signResult.error) throw new Error(translateError(signResult.error.message));
      const createdUser = signResult.data?.user;
      if (!createdUser?.id) throw new Error('تعذر إنشاء حساب المستخدم داخل Supabase');
      if (Array.isArray(createdUser.identities) && createdUser.identities.length === 0) {
        throw new Error('البريد الإلكتروني مستخدم في حساب موجود مسبقًا');
      }

      try {
        const finalized = await rpc('finalize_staff_user', {
          p_target_user: createdUser.id,
          p_creation_token: creationToken,
          p_name: name,
          p_phone: String(body.phone || '').trim(),
          p_role_code: String(body.role_code || ''),
          p_job_title: String(body.job_title || '').trim() || null,
          p_access_scope: String(body.access_scope || 'assigned'),
          p_is_active: body.is_active !== false,
          p_create_employee: body.create_employee !== false,
          p_reason: String(body.reason || '').trim()
        });
        try { await tempClient.auth.signOut({ scope: 'local' }); } catch {}
        return finalized;
      } catch (error) {
        try { await tempClient.auth.signOut({ scope: 'local' }); } catch {}
        throw new Error(`${error.message}. تم إنشاء حساب مصادقة أولي كعميل؛ راجع المستخدمين قبل إعادة المحاولة.`);
      }
    }
    if (p === '/api/access/users' && method === 'GET') return { items: await rpc('list_access_users') };
    if (p === '/api/access/roles' && method === 'GET') return { items: await rpc('list_access_roles') };
    const accessUser = p.match(/^\/api\/access\/users\/([^/]+)$/);
    if (accessUser && method === 'PATCH') return await rpc('set_user_access', { p_target_user: accessUser[1], p_role_code: body.role_code, p_is_active: Boolean(body.is_active), p_access_scope: body.access_scope || 'all', p_reason: body.reason || '' });
    const permissionUser = p.match(/^\/api\/access\/permissions\/([^/]+)$/);
    if (permissionUser && method === 'GET') return await rpc('get_user_permission_matrix', { p_target_user: permissionUser[1] });
    if (permissionUser && method === 'POST') return await rpc('save_user_permissions', { p_target_user: permissionUser[1], p_changes: body.changes || [], p_reason: body.reason || '' });
    const grantAll = p.match(/^\/api\/access\/grant-all\/([^/]+)$/);
    if (grantAll && method === 'POST') return await rpc('grant_all_user_permissions', { p_target_user: grantAll[1], p_reason: body.reason || '' });
    const revokeAll = p.match(/^\/api\/access\/revoke-all\/([^/]+)$/);
    if (revokeAll && method === 'POST') return await rpc('revoke_all_user_permissions', { p_target_user: revokeAll[1], p_reason: body.reason || '' });
    const copyPermissions = p.match(/^\/api\/access\/copy\/([^/]+)$/);
    if (copyPermissions && method === 'POST') return await rpc('copy_user_permissions', { p_source_user: body.source_user_id, p_target_user: copyPermissions[1], p_reason: body.reason || '' });
    const roleTemplate = p.match(/^\/api\/access\/role-template\/([^/]+)$/);
    if (roleTemplate && method === 'POST') return await rpc('apply_role_template', { p_target_user: roleTemplate[1], p_role_code: body.role_code, p_reason: body.reason || '' });
    const diagnostics = p.match(/^\/api\/access\/diagnostics\/([^/]+)$/);
    if (diagnostics && method === 'GET') return await rpc('permission_diagnostics', { p_target_user: diagnostics[1] });

    throw new Error('المسار غير مدعوم في نسخة GitHub Pages');
  }

  async function logClientError(message,context,stack){if(!client||!currentAccess)return;try{await request('/api/system/client-error',{method:'POST',body:{message,context,stack},skipPermissionCheck:true});}catch{}}
  return {
    request,
    logClientError,
    uploadProductImage,
    uploadExpenseReceipt,
    deleteProductImage,
    setPrimaryProductImage,
    reorderProductImages,
    productImageUrl,
    isConfigured: () => configured,
    client: () => client
  };
})();
