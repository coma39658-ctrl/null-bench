# Null Bench — Public Quick Start | اردو · English · العربية

**E-ZERO · Public Research Guide · 14 November 2026**

**Run Null Bench:** https://coma39658-ctrl.github.io/null-bench/#try

Null Bench compares a graph's observed clustering/transitivity with a degree-preserving randomized network baseline. It is an **exploratory statistical research tool**, not a causal proof, medical diagnosis, vehicle fault diagnosis or industrial safety certification.

---

## اردو — شروع کرنے کا طریقہ

**کس کے لیے؟** طلبہ، اساتذہ، نیٹ ورک سائنس، کمپیوٹر سائنس، سماجی تحقیق، حیاتیاتی نیٹ ورکس، ٹرانسپورٹ اور انجینئرنگ کے محققین۔

1. [Null Bench کھولیں](https://coma39658-ctrl.github.io/null-bench/#try)۔ **Demo network** سے `Modular network` یا `Random network` منتخب کریں۔ اپنی مجاز معلومات کے لیے `Custom edge list` منتخب کریں۔
2. **Generate Demo Network** دبائیں، یا **Edge list** میں ہر لائن پر ایک کنکشن لکھیں، مثلاً `a,b` یا `a b`۔ نجی رابطے، شناختیں یا حساس ڈیٹا شامل نہ کریں۔
3. **Null samples** منتخب کریں (20 سے 2000، ابتدائی قدر 200) اور **Swap attempts / sample** (10 سے 5000، ابتدائی قدر 300) طے کریں۔
4. **Run Null-Model Test** دبائیں۔ یہ سادہ گراف کے لیے degree-preserving edge rewiring کے مقابلے میں observed clustering کا جائزہ لیتا ہے۔
5. **Nodes / edges، Observed clustering، Null mean ± SD، 95% null interval** اور **z-score** پڑھیں۔ نتیجہ منتخب null model، sample count اور graph assumptions کے تناظر میں سمجھیں۔
6. اپنی تحقیق میں graph source، edge list، منتخب سیٹنگز، تاریخ، browser اور محدودیت لکھیں۔ اس عوامی صفحے میں **random seed درج کرنے کا الگ کنٹرول نہیں**؛ اس لیے بالکل ایک جیسے random نتائج کی ضمانت نہ دیں۔

**حدود:** null interval سے باہر آنا کسی مخصوص random baseline کے مقابلے میں غیر معمولی ساخت ظاہر کر سکتا ہے؛ اس سے وجہ، حقیقی مرض، گاڑی کی خرابی یا فزیکل حقیقت ثابت نہیں ہوتی۔ اہم نتیجے کو آزادانہ تصدیق کی ضرورت ہوتی ہے۔

## English — Quick start

**For:** students, educators, network science, computer science, social science, biological networks, transport and engineering researchers.

1. Open the [public #try tool](https://coma39658-ctrl.github.io/null-bench/#try). In **Demo network**, choose **Modular network** or **Random network**, or choose **Custom edge list** for authorized data.
2. Press **Generate Demo Network**, or enter one edge per line in **Edge list**, such as `a,b` or `a b`. Do not include private contacts, identifying information or sensitive datasets.
3. Set **Null samples** (20–2000; default 200) and **Swap attempts / sample** (10–5000; default 300).
4. Press **Run Null-Model Test**. The test compares observed clustering/transitivity with degree-preserving random rewiring under the tool's assumptions.
5. Review **Nodes / edges**, **Observed clustering**, **Null mean ± SD**, the **95% null interval**, and **z-score**. Interpret differences only relative to the tested baseline.
6. Record the graph source, input edges, parameters, date, browser and limitations. The current public UI **does not expose a random-seed field**; exact repeatability of random outputs is not guaranteed.

**Boundary:** This is exploratory statistical evidence. It does not establish causality, a physical law, a medical diagnosis, vehicle faults or industrial safety.

## العربية — طريقة الاستخدام

**لمن؟** الطلاب، الأساتذة، الباحثون في علوم الشبكات والحاسوب والمجتمع والشبكات الحيوية والنقل والهندسة.

1. افتح [أداة Null Bench العامة](https://coma39658-ctrl.github.io/null-bench/#try). اختر من **Demo network** شبكة `Modular network` أو `Random network`، أو `Custom edge list` لإدخال شبكة مصرّح بها.
2. اضغط **Generate Demo Network** أو أدخل كل رابط في سطر واحد ضمن **Edge list**، مثل `a,b` أو `a b`. لا تدخل أسماء الأشخاص أو جهات الاتصال الخاصة أو البيانات الحساسة.
3. حدد **Null samples** بين 20 و2000 (الافتراضي 200)، و**Swap attempts / sample** بين 10 و5000 (الافتراضي 300).
4. اضغط **Run Null-Model Test**. تقارن الأداة التجمع المرصود بشبكات عشوائية تعيد ترتيب الروابط مع الحفاظ على درجات العقد.
5. اقرأ **Nodes / edges** و**Observed clustering** و**Null mean ± SD** و**95% null interval** و**z-score**؛ النتائج مرتبطة بالنموذج المرجعي المفترض.
6. وثّق مصدر الرسم البياني، والروابط، والإعدادات، والتاريخ، والمتصفح، والقيود. **لا توجد خانة عامة ظاهرة لتحديد البذرة العشوائية**، لذلك لا تَعِدَ بتكرار النتائج العشوائية حرفياً.

**حدود الاستنتاج:** الاختلاف الإحصائي الاستكشافي لا يثبت السببية أو القوانين الفيزيائية أو التشخيص الطبي أو أعطال السيارات، ويحتاج إلى تحقق مستقل.

---

## Research examples | تحقیقی مثالیں | أمثلة بحثية

- **Social science / سماجی تحقیق / العلوم الاجتماعية:** Compare clustering or triangular structure in an authorized network against a degree-preserving null model.
- **Biological networks / حیاتیاتی نیٹ ورکس / الشبكات الحيوية:** Investigate structure in permitted interaction networks; any biological interpretation needs external validation.
- **Transport / نقل و حمل / النقل:** Explore an authorized transport or logistics graph, **not** certify a physical route's safety.
- **Cybersecurity / سائبر سیکیورٹی / الأمن السيبراني:** Study graph topology, **not** issue an intrusion-detection verdict.

## Privacy, operation, and evidence

- The described graph computation runs **locally in the browser**. The public home page currently loads **Google Analytics 4** and sends page/event metadata; this guide does **not** add tracking and cannot promise zero analytics.
- Avoid confidential, regulated, personally identifiable or non-consensual datasets. This public demonstration is not a secure repository for private data.
- Report **PASS / FAIL / PARTIAL / UNKNOWN** precisely; a mathematical property, a browser-computed result, and independently validated real-world evidence are different.
- Only the `#try` browser feature is covered here. This guide does not authorize ECU writes, external AI use, automated scraping, sensor access or physical diagnostic claims.
- Help and source: https://github.com/coma39658-ctrl/null-bench. This documentation does **not** change the existing call engine, OBD Dashboard, Qwen adapter, site analytics configuration or deployed website.

**Publishing scope:** This is public repository documentation for the *existing* Null Bench browser test. Deployment and live availability of the GitHub Pages site are separate operational checks.
