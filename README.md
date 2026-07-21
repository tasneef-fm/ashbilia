# وردة أشبيليا — نسخة GitHub Pages

هذه النسخة تعمل على **GitHub Pages** كواجهة ثابتة، وتستخدم **Supabase PostgreSQL** كقاعدة بيانات موحدة وآمنة للمبيعات، المخزون، الحجوزات، عروض الأسعار، الموظفين والتقارير.

## الملفات المهمة

- `index.html` واجهة المتجر والإدارة والموظفين.
- `app.js` منطق التطبيق.
- `supabase-api.js` الربط بين الواجهة وSupabase.
- `config.js` إعداد رابط Supabase والمفتاح العام.
- `supabase/schema.sql` إنشاء الجداول والعلاقات والصلاحيات والوظائف.
- `supabase/seed-demo.sql` بيانات تجريبية اختيارية.
- `.github/workflows/deploy-pages.yml` نشر تلقائي على GitHub Pages.

## التشغيل السريع

1. أنشئ مشروعًا جديدًا في Supabase.
2. نفّذ `supabase/schema.sql` كاملًا من SQL Editor.
3. أنشئ مستخدم الإدارة من Authentication > Users.
4. نفّذ:

```sql
update public.profiles
set role_code='admin', name='مدير وردة أشبيليا', is_active=true
where email='بريد_الإدارة';
```

5. أضف إلى أسرار مستودع GitHub:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. من Settings > Pages اختر **GitHub Actions**.
7. ارفع الملفات إلى فرع `main`، وسيتم النشر تلقائيًا.

> لا تستخدم مفتاح `service_role` داخل GitHub أو المتصفح. المطلوب هو المفتاح العام Anon/Publishable فقط.

التعليمات التفصيلية موجودة في [ابدأ-من-هنا.txt](./ابدأ-من-هنا.txt).
