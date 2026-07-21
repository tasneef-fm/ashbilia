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
    const c = ensureClient();
    const data = unwrap(await c.from('profiles')
      .select('id,name,email,phone,employee_id,role_code,is_active,roles(name_ar)')
      .eq('id', user.id).maybeSingle());
    if (!data || data.is_active === false) return null;
    return {
      id: data.id,
      name: data.name || user.user_metadata?.name || user.email,
      email: data.email || user.email,
      phone: data.phone || user.phone || '',
      employee_id: data.employee_id || null,
      role_code: data.role_code || 'customer',
      role_name: data.roles?.name_ar || data.role_code || 'مستخدم'
    };
  }
  async function rpc(name, args = {}) {
    const c = ensureClient();
    return unwrap(await c.rpc(name, args));
  }
  async function rows(table, select = '*', configure = q => q) {
    const c = ensureClient();
    return unwrap(await configure(c.from(table).select(select)));
  }
  function flattenProducts(items = []) {
    return items.map(p => ({
      ...p,
      category_name: p.category_name || p.product_categories?.name_ar || null,
      available_qty: Number(p.available_qty ?? (Number(p.stock_qty || 0) - Number(p.reserved_qty || 0)))
    }));
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
      const data = unwrap(await c.auth.signInWithPassword({ email: String(body.email || '').trim(), password: String(body.password || '') }));
      const user = await profileFor(data.user);
      if (!user) {
        await c.auth.signOut();
        throw new Error('الحساب غير مفعل أو لم تُحدد صلاحياته في جدول profiles');
      }
      return { user };
    }
    if (p === '/api/auth/logout' && method === 'POST') {
      unwrap(await c.auth.signOut());
      return { ok: true };
    }
    if (p === '/api/auth/me' && method === 'GET') {
      const session = unwrap(await c.auth.getSession())?.session;
      return { user: session?.user ? await profileFor(session.user) : null };
    }

    // المتجر العام
    if (p === '/api/public/bootstrap' && method === 'GET') {
      const [categories, products, services, reviews] = await Promise.all([
        rows('product_categories', 'id,name_ar,name_en,slug,sort_order', q => q.eq('is_active', true).order('sort_order').order('name_ar')),
        rows('v_products', '*', q => q.eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(100)),
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

    // لوحة الإدارة
    if (p === '/api/dashboard' && method === 'GET') return await rpc('get_dashboard');

    // التصنيفات والمنتجات
    if (p === '/api/categories' && method === 'GET') {
      return { items: await rows('product_categories', '*', q => q.order('sort_order').order('name_ar')) };
    }
    if (p === '/api/categories' && method === 'POST') {
      const item = unwrap(await c.from('product_categories').insert({
        name_ar: body.name_ar,
        name_en: body.name_en || null,
        slug: body.slug || `cat-${crypto.randomUUID().slice(0, 8)}`,
        is_active: true
      }).select().single());
      return { item };
    }
    if (p === '/api/products' && method === 'GET') {
      const activeOnly = u.searchParams.get('active') === '1';
      let q = c.from('v_products').select('*').order('created_at', { ascending: false });
      if (activeOnly) q = q.eq('is_active', true);
      return { items: flattenProducts(unwrap(await q)) };
    }
    if (p === '/api/products' && method === 'POST') return await rpc('upsert_product', { p_id: null, p_payload: body });
    const productMatch = p.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && method === 'PUT') return await rpc('upsert_product', { p_id: productMatch[1], p_payload: body });

    // المخزون
    if (p === '/api/inventory' && method === 'GET') {
      const [items, movements] = await Promise.all([
        rows('v_inventory', '*', q => q.order('name_ar')),
        rows('v_inventory_movements', '*', q => q.order('created_at', { ascending: false }).limit(100))
      ]);
      return { items, movements };
    }
    if (p === '/api/inventory/adjust' && method === 'POST') return await rpc('adjust_inventory', { p_payload: body });

    // العملاء
    if (p === '/api/customers' && method === 'GET') return { items: await rows('v_customers', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/customers' && method === 'POST') return await rpc('create_customer', { p_payload: body });

    // الطلبات ونقطة البيع
    if (p === '/api/orders' && method === 'GET') return { items: await rows('v_orders', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/orders' && method === 'POST') return await rpc('create_pos_order', { p_payload: body });
    const orderMatch = p.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && method === 'PATCH') return await rpc('update_order_status', { p_order_id: orderMatch[1], p_status: body.status, p_reason: body.reason || '' });

    // الحجوزات
    if (p === '/api/bookings' && method === 'GET') return { items: await rows('bookings', '*', q => q.order('start_at', { ascending: false })) };
    if (p === '/api/bookings' && method === 'POST') return await rpc('create_staff_booking', { p_payload: body });
    const bookingMatch = p.match(/^\/api\/bookings\/([^/]+)$/);
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
    if (p === '/api/employees' && method === 'GET') return { items: await rows('employees', '*', q => q.eq('is_active', true).order('name')) };

    // الموردون والمشتريات
    if (p === '/api/suppliers' && method === 'GET') return { items: await rows('suppliers', '*', q => q.order('name')) };
    if (p === '/api/suppliers' && method === 'POST') {
      const item = unwrap(await c.from('suppliers').insert({
        supplier_no: await rpc('next_document_no', { p_prefix: 'SUP' }),
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        tax_no: body.tax_no || null,
        address: body.address || null,
        material_types: body.material_types || null,
        rating: Number(body.rating || 0)
      }).select().single());
      return { item };
    }
    if (p === '/api/purchase-orders' && method === 'GET') return { items: await rows('v_purchase_orders', '*', q => q.order('created_at', { ascending: false })) };
    if (p === '/api/purchase-orders' && method === 'POST') return await rpc('create_purchase_order', { p_payload: body });
    const receiveMatch = p.match(/^\/api\/purchase-orders\/([^/]+)\/receive$/);
    if (receiveMatch && method === 'POST') return await rpc('receive_purchase_order', { p_purchase_order_id: receiveMatch[1] });

    // الذكاء والتقارير
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

    throw new Error('المسار غير مدعوم في نسخة GitHub Pages');
  }

  return { request, isConfigured: () => configured, client: () => client };
})();
