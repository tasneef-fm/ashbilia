'use strict';
(() => {
  let stream=null, detector=null, raf=0, zxingReader=null, active=false, cameras=[],cameraIndex=0,lastCode='',lastAt=0,onDetected=null;
  const $q=(s,r=document)=>r.querySelector(s);
  function beep(){
    try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.035;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.08);}
    catch{}
    try{navigator.vibrate?.(60);}catch{}
  }
  function shell(){
    let el=$q('#barcodeScannerV27');
    if(el)return el;
    el=document.createElement('div');el.id='barcodeScannerV27';el.className='scanner-v27 hidden';
    el.innerHTML=`<div class="scanner-v27-head"><b>مسح الباركود</b><div><button type="button" data-scan-flash>فلاش</button><button type="button" data-scan-switch>تبديل</button><button type="button" data-scan-close>إغلاق</button></div></div>
      <div class="scanner-v27-video-wrap"><video playsinline muted autoplay></video><div class="scanner-v27-frame"></div><div class="scanner-v27-status">وجّه الكاميرا نحو الباركود</div></div>
      <form class="scanner-v27-manual"><input inputmode="numeric" autocomplete="off" placeholder="أو اكتب الباركود يدويًا"><button>إضافة</button></form>`;
    document.body.appendChild(el);
    $q('[data-scan-close]',el).onclick=close;
    $q('[data-scan-switch]',el).onclick=()=>switchCamera();
    $q('[data-scan-flash]',el).onclick=()=>toggleTorch();
    $q('.scanner-v27-manual',el).onsubmit=e=>{e.preventDefault();const i=$q('input',e.currentTarget),code=i.value.trim();if(code){emit(code);i.value='';}};
    return el;
  }
  function status(msg){const el=$q('.scanner-v27-status',shell());if(el)el.textContent=msg;}
  async function emit(code){
    code=String(code||'').trim();if(!code)return;
    const now=Date.now();if(code===lastCode&&now-lastAt<1400)return;lastCode=code;lastAt=now;beep();status(`تمت القراءة: ${code}`);
    try{await onDetected?.(code);}catch(e){status(e.message||'تعذر إضافة الباركود');}
  }
  async function enumerate(){
    try{const all=await navigator.mediaDevices.enumerateDevices();cameras=all.filter(x=>x.kind==='videoinput');}catch{cameras=[];}
  }
  async function startNative(video,deviceId=null){
    const constraints={audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}};
    stream=await navigator.mediaDevices.getUserMedia(constraints);video.srcObject=stream;await video.play();await enumerate();
    detector=new BarcodeDetector({formats:['code_128','ean_13','ean_8','upc_a','upc_e','qr_code','code_39','itf','codabar']});
    const loop=async()=>{if(!active)return;try{const codes=await detector.detect(video);if(codes?.[0]?.rawValue)await emit(codes[0].rawValue);}catch{}raf=requestAnimationFrame(loop);};loop();
  }
  async function startZXing(video,deviceId=null){
    if(!window.ZXing?.BrowserMultiFormatReader)throw new Error('مكتبة قراءة الباركود الاحتياطية غير متاحة');
    await enumerate();zxingReader=new window.ZXing.BrowserMultiFormatReader();
    const chosen=deviceId||cameras.find(x=>/back|rear|environment/i.test(x.label))?.deviceId||cameras.at(-1)?.deviceId;
    zxingReader.decodeFromVideoDevice(chosen,video,(result)=>{if(result?.getText)emit(result.getText());});
  }
  async function start(deviceId=null){
    stopMedia();const el=shell(),video=$q('video',el);status('جاري تشغيل الكاميرا...');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('المتصفح لا يدعم استخدام الكاميرا');
    try{
      if('BarcodeDetector' in window){await startNative(video,deviceId);status('الكاميرا جاهزة للمسح المتواصل');return;}
      await startZXing(video,deviceId);status('الكاميرا جاهزة للمسح المتواصل');
    }catch(err){
      try{await startZXing(video,deviceId);status('تم تشغيل قارئ الباركود الاحتياطي');}
      catch{status('تعذر تشغيل الكاميرا — استخدم الإدخال اليدوي');throw err;}
    }
  }
  function stopMedia(){
    cancelAnimationFrame(raf);raf=0;detector=null;
    try{zxingReader?.reset?.();}catch{}zxingReader=null;
    try{stream?.getTracks()?.forEach(t=>t.stop());}catch{}stream=null;
    const video=$q('#barcodeScannerV27 video');if(video)video.srcObject=null;
  }
  async function switchCamera(){
    await enumerate();if(cameras.length<2){status('لا توجد كاميرا أخرى متاحة');return;}
    cameraIndex=(cameraIndex+1)%cameras.length;try{await start(cameras[cameraIndex].deviceId);}catch(e){status(e.message);}
  }
  async function toggleTorch(){
    const track=stream?.getVideoTracks?.()[0];if(!track){status('الفلاش غير متاح');return;}
    const caps=track.getCapabilities?.()||{};if(!caps.torch){status('هذا الجهاز لا يدعم تشغيل الفلاش من المتصفح');return;}
    const current=Boolean(track.getSettings?.().torch);try{await track.applyConstraints({advanced:[{torch:!current}]});status(!current?'تم تشغيل الفلاش':'تم إيقاف الفلاش');}catch{status('تعذر تغيير حالة الفلاش');}
  }
  async function open(options={}){
    onDetected=options.onDetected||null;lastCode='';lastAt=0;active=true;const el=shell();el.classList.remove('hidden');document.body.classList.add('scanner-open');
    try{await start(options.deviceId||null);}catch{}
  }
  function close(){active=false;stopMedia();shell().classList.add('hidden');document.body.classList.remove('scanner-open');onDetected=null;}
  window.WardatScanner={open,close,get active(){return active;}};
})();
