/* Local preference only; not permission for hotspot, tethering or data transfer.
 * Native device APIs & runtime OS permissions would be required for future Nearby.
 */
(()=>{
"use strict";
const checkbox=document.getElementById("nearbyFutureOpt");
const status=document.getElementById("nearbyFutureStatus");
if(!checkbox||!status)return;
const KEY="ezero_nearby_future_preference_v0_1";
try{checkbox.checked=localStorage.getItem(KEY)==="yes";}catch(_){}
checkbox.addEventListener("change",()=>{
 try{
   if(checkbox.checked)localStorage.setItem(KEY,"yes");
   else localStorage.removeItem(KEY);
 }catch(_){}
 status.textContent=({ur:checkbox.checked?
 "مستقبل کی Nearby ترجیح محفوظ ہے؛ اس وقت کسی فون یا نیٹ ورک کا ڈیٹا شیئر نہیں ہوگا۔":
 "Nearby کی مستقبل کی ترجیح بند ہے؛ کوئی خودکار نیٹ ورک شیئرنگ نہیں۔",
 en:checkbox.checked?
 "Future Nearby preference saved; no network or mobile data is currently shared.":
 "Future Nearby preference is off; no automatic network sharing.",
 ar:checkbox.checked?
 "حُفظ تفضيل Nearby المستقبلي؛ لا تُشارك الشبكة أو بيانات الهاتف الآن.":
 "تفضيل Nearby المستقبلي معطّل؛ لا توجد مشاركة تلقائية للبيانات."})[document.documentElement.lang] || "No automatic data sharing";
});
})();