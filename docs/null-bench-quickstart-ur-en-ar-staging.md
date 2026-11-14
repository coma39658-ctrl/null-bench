# Null Bench — three-language beginner guide (STAGING ONLY)

Official entry: https://coma39658-ctrl.github.io/null-bench/#try

**Status:** Draft educational copy; NOT verified as deployed. This document does not change the app, its analytics, or the public page.

## اردو — شروع کرنے کا طریقہ

**یہ کس کے لیے ہے؟** یونیورسٹی طلبہ، اساتذہ، نیٹ ورک سائنس محققین، کمپیوٹر سائنس، سماجی تحقیق، حیاتیاتی نیٹ ورکس، ٹرانسپورٹ اور انجینئرنگ کے محققین۔

1. اپنا سوال لکھیں: کیا اصل نیٹ ورک میں کوئی ساختی پیٹرن غیر معمولی ہے؟
2. مجاز اور غیر حساس **nodes اور edges** تیار کریں؛ نجی رابطے یا شناختیں اپ لوڈ نہ کریں۔
3. سرکاری #try صفحہ کھولیں؛ صرف وہی controls استعمال کریں جو واقعی دستیاب ہوں۔
4. اگر degree-preserving null model دستیاب ہو تو مناسب graph assumptions چیک کرکے منتخب کریں۔ یہ ہر node کی degree برقرار رکھتا ہے۔
5. اگر runner دستیاب ہو تو متعدد randomized samples سے observed statistic کا تقابل کریں؛ settings اور random seed درج کریں۔
6. observed value، null distribution، uncertainty اور دستیاب significance measures کو احتیاط سے سمجھیں۔
7. data source، constraints، sample count، limitations اور reproducibility لکھیں۔

**حد:** exploratory statistical evidence causation، medical diagnosis یا vehicle fault ثابت نہیں کرتا۔

## English — Quick start

**For:** students, educators, network-science researchers, computer scientists, social scientists, biological-network researchers, transport analysts and engineers.

1. Define a structural research question about an observed graph.
2. Prepare authorized, non-sensitive node and edge data; do not upload private contacts or identifiers.
3. Open the official #try link and inspect which controls actually exist.
4. If supported, select a degree-preserving null model only after checking graph assumptions and constraints.
5. If a runner is available, compare the observed metric with multiple randomized samples; record parameters and random seed.
6. Examine the null distribution, uncertainty, and any supported significance statistics.
7. Report the data source, constraints, sample count, limitations and reproducibility steps.

**Boundary:** An exploratory statistical result does not prove causation, medical diagnosis or physical vehicle faults.

## العربية — دليل البداية

**لمن؟** الطلاب والأساتذة وباحثو علوم الشبكات وعلوم الحاسوب والعلوم الاجتماعية والشبكات الحيوية والنقل والهندسة.

1. حدد سؤالاً بحثياً عن بنية الشبكة المرصودة.
2. جهّز بيانات العقد والروابط المصرح بها وغير الحساسة، دون بيانات شخصية.
3. افتح رابط #try الرسمي وتحقق من الأدوات المتاحة فعلياً.
4. إذا كان النموذج الصفري المحافظ على درجات العقد متاحاً، فتأكد من ملاءمة افتراضاته.
5. إذا كانت أداة التشغيل متاحة، قارن الإحصائية المرصودة بعينات عشوائية متعددة وسجّل الإعدادات والبذرة العشوائية.
6. افحص التوزيع المرجعي وعدم اليقين ومقاييس الدلالة المتاحة.
7. وثّق مصدر البيانات والقيود وعدد العينات وحدود الاستنتاج وإعادة الإنتاج.

**تنبيه:** النتيجة الإحصائية الاستكشافية لا تثبت السببية أو التشخيص الطبي أو أعطال المركبات.

## Suggested domain examples (research only)

- Social science: compare observed community/triangle statistics with an appropriate null distribution.
- Biology: compare interaction-network motifs; biological interpretation needs independent validation.
- Cybersecurity: study network topology; not an intrusion-detection verdict.
- Logistics: compare structural patterns in authorized route networks; not a safety certification.

## Release checklist (must be verified, not presumed)

- [ ] Confirm actual #try controls and correct terminology against current deployed SHA.
- [ ] Keep changes confined to Null Bench; no Secure App, AI Studio, OBD or dashboard edits.
- [ ] Check language fallback, RTL/LTR, keyboard access, screen readers, mobile layout and WebKit.
- [ ] Audit existing GA4 load and privacy notice/consent before any public change; **do not add tracking**.
- [ ] Run all relevant CI and regressions against exact proposed SHA.
- [ ] Verify GitHub Pages published SHA, assets, CSP, Origin and external public smoke.
- [ ] Record rollback ref and approvals; release only when every applicable gate passes.

**Evidence note:** This is documentation-only staging; no tests, publication or physical validation are claimed by this file.
