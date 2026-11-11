(() => {
  "use strict";
  const DATA_URL = "../data/meteo_home.json";
  const CACHE_KEY = "meteo-home-last-json-v1";
  const MODEL_KEYS = ["ECMWF", "GFS", "AROME"];
  const MODEL_LABELS = {ECMWF:"ECMWF", GFS:"GFS", AROME:"AROME"};
  const $ = id => document.getElementById(id);
  let data = null, placeId = "hortaleza", activeView = "home";

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const valid = n => n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n));
  const fmt = (n, digits=0) => valid(n) ? Number(n).toLocaleString("es-ES",{minimumFractionDigits:digits,maximumFractionDigits:digits}) : "—";
  const round = n => valid(n) ? Math.round(Number(n)) : null;
  const dateKey = s => String(s || "").slice(0,10);
  const dateLabel = (s, options={weekday:"short",day:"numeric"}) => {
    if (!s) return "—";
    const d = new Date(s.length===10 ? s+"T12:00:00" : s);
    return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat("es-ES",options).format(d).replace(".","");
  };
  const timeLabel = s => s && s.length>=16 ? s.slice(11,16) : "—";
  const weather = code => {
    if (!valid(code)) return ["⛅","Tiempo variable"];
    const c=Number(code);
    if (c===0) return ["☀️","Despejado"];
    if ([1,2].includes(c)) return ["🌤️","Poco nuboso"];
    if (c===3) return ["☁️","Nuboso"];
    if ([45,48].includes(c)) return ["🌫️","Niebla"];
    if ([51,53,55,56,57].includes(c)) return ["🌦️","Llovizna"];
    if ([61,63,65,66,67,80,81,82].includes(c)) return ["🌧️","Lluvia"];
    if ([71,73,75,77,85,86].includes(c)) return ["🌨️","Nieve"];
    if ([95,96,99].includes(c)) return ["⛈️","Tormenta"];
    return ["⛅","Tiempo variable"];
  };
  const loc = () => data?.locations?.[placeId] || null;
  const dailyModels = l => l?.daily?.models || {};
  const hourlyModels = l => l?.hourly?.models || {};
  const dailyValue = (l, model, date) => {
    const all=dailyModels(l);
    const key=Object.keys(all).find(k=>k.toUpperCase().startsWith(model));
    return key ? all[key]?.[date] : null;
  };
  const hourlyValue = (l, model, time) => hourlyModels(l)?.[model]?.[time] ?? null;
  const datesFor = l => {
    const all = l?.daily?.dates || [];
    if (all.length) return all;
    const set=new Set(); Object.values(dailyModels(l)).forEach(m=>Object.keys(m||{}).forEach(k=>set.add(k)));
    return [...set].sort();
  };
  const timesFor = l => {
    const all=l?.hourly?.times || [];
    if(all.length) return all;
    const set=new Set(); Object.values(hourlyModels(l)).forEach(m=>Object.keys(m||{}).forEach(k=>set.add(k)));
    return [...set].sort();
  };
  const average = arr => {const v=arr.filter(valid).map(Number);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
  const firstDaily = (l, date, field) => {
    const vals=MODEL_KEYS.map(m=>dailyValue(l,m,date)?.[field]).filter(valid);
    return average(vals);
  };
  const showToast = msg => {const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);};
  const setConnection = state => {const e=$("connection");e.className="connection "+state;e.innerHTML=`<i></i>${state==="online"?"En línea":state==="offline"?"Sin conexión":"Conectando"}`;};

  async function loadData(manual=false) {
    setConnection("loading");
    try {
      const response=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:"no-store"});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const fresh=await response.json();
      if(!fresh || !fresh.locations) throw new Error("Formato de datos no reconocido");
      data=fresh;
      try { localStorage.setItem(CACHE_KEY,JSON.stringify(fresh)); } catch(e) {}
      setConnection("online");
      $("dataStatus").textContent="Previsión actualizada desde el archivo de Meteo.";
      if(manual) showToast("Previsión actualizada");
    } catch(err) {
      if(!data) {
        try { const saved=localStorage.getItem(CACHE_KEY); if(saved) data=JSON.parse(saved); } catch(e) {}
      }
      if(data) {
        setConnection("offline");
        $("dataStatus").textContent="Mostrando la última previsión guardada. Puede no estar actualizada.";
        if(manual) showToast("Sin conexión: se muestran los últimos datos guardados");
      } else {
        setConnection("offline");
        $("dataStatus").textContent="No se ha podido cargar el archivo de previsión.";
        if(manual) showToast("No se ha podido leer meteo_home.json");
      }
    }
    if(data) render();
  }

  
  function render() {
    document.querySelectorAll(".place-choice").forEach(b =>
      b.classList.toggle("active", b.dataset.place === placeId)
    );

    const l = loc();

    if (!l) {
      $("placeName").textContent = placeId === "oco" ? "Oco" : "Hortaleza";
      $("placeMeta").textContent = placeId === "oco" ? "Ávila" : "Madrid";
      $("dataStatus").textContent = "No hay datos para esta ubicación.";
      return;
    }

    $("placeName").textContent = l.name || (placeId === "oco" ? "Oco" : "Hortaleza");
    $("placeMeta").textContent = l.coordinates
      ? `${fmt(l.coordinates.latitude, 3)} · ${fmt(l.coordinates.longitude, 3)}`
      : (placeId === "oco" ? "Ávila" : "Madrid");

    const stamp = l.generated_at || data.generated_at;
    $("updatedAt").textContent = `Última actualización: ${stamp ? new Date(stamp).toLocaleString("es-ES", {dateStyle:"medium",timeStyle:"short"}) : "—"}`;

    renderHome(l);
    renderHours(l);
    renderDays(l);
    renderAlerts(l);
  }


  function renderHome(l) {
    const dates=datesFor(l), today=dateKey(l.generated_at || data.generated_at), date=dates.includes(today)?today:(dates[0]||today);
    const d=dailyValue(l,"ECMWF",date)||dailyValue(l,"GFS",date)||dailyValue(l,"AROME",date)||{};
    const [symbol,phrase]=weather(d.weather_code);
    $("todayLabel").textContent=dateLabel(date,{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
    $("weatherPhrase").textContent=phrase;
    $("heroTemp").textContent=`${fmt(d.tmax)}°`;
    $("heroRange").textContent=`Máx. ${fmt(d.tmax)}° · Mín. ${fmt(d.tmin)}°`;
    $("heroSymbol").textContent=symbol;
    $("heroRain").textContent=valid(d.rain_mm)?`${fmt(d.rain_mm,1)} mm`:"—";
    $("heroWind").textContent=valid(d.wind_gust)?`${fmt(d.wind_gust)} km/h`:"—";
    const aqi=l.air_quality?.[date]; $("heroAQI").textContent=valid(aqi)?fmt(aqi):"—";
    const times=timesFor(l).filter(t=>dateKey(t)===date).slice(0,12);
    $("homeHours").innerHTML=times.length?times.map(t=>{
      const vals=MODEL_KEYS.map(m=>hourlyValue(l,m,t)?.temperature).filter(valid);
      const temp=average(vals);
      const rain=average(MODEL_KEYS.map(m=>hourlyValue(l,m,t)?.precipitation));
      const code=MODEL_KEYS.map(m=>hourlyValue(l,m,t)?.weather_code).find(valid);
      const [ico]=weather(code);
      return `<div class="hour-chip"><div class="time">${timeLabel(t)}</div><div class="symbol">${ico}</div><b>${fmt(temp)}°</b><small>${valid(rain)&&Number(rain)>0?fmt(rain,1)+" mm":" "}</small></div>`;
    }).join(""):`<div class="empty">No hay detalle horario disponible para hoy.</div>`;
    const next=dates.filter(x=>x>=date).slice(0,4);
    $("homeDays").innerHTML=next.map(x=>dayRow(l,x,true)).join("") || `<div class="empty">No hay previsión diaria disponible.</div>`;
    const alerts=(l.alerts?.models||[]).length+(l.alerts?.aemet?.alerts||[]).length;
    $("homeNotice").innerHTML=alerts?`<div class="notice">⚑ Hay ${alerts} aviso(s) o señal(es) meteorológicas registradas. Puedes consultarlas en la sección Avisos.</div>`:"";
  }

  function dayRow(l,date,compact=false) {
    const e=dailyValue(l,"ECMWF",date),g=dailyValue(l,"GFS",date),a=dailyValue(l,"AROME",date);
    const vals=[e,g,a].filter(Boolean);
    const tmax=average(vals.map(x=>x.tmax)),tmin=average(vals.map(x=>x.tmin));
    const rain=average(vals.map(x=>x.rain_mm));
    const code=[e,g,a].map(x=>x?.weather_code).find(valid);
    const [ico]=weather(code);
    const rainText=valid(rain)?`${fmt(rain,1)} mm`:"—";
    return `<div class="day-row"><div class="day-date">${esc(dateLabel(date))}<small>${vals.length} modelo(s)</small></div><div class="day-symbol">${ico}</div><div class="day-temps">${fmt(tmax)}° <span>${fmt(tmin)}°</span></div><div class="day-rain">☂ ${rainText}</div></div>`;
  }

  function renderDays(l) {
    const dates=datesFor(l).slice(0,5);
    $("daysList").innerHTML=dates.length?dates.map(x=>dayRow(l,x)).join(""):`<div class="card empty">No hay previsión diaria disponible.</div>`;
  }

  function renderHours(l) {
    const times=timesFor(l).slice(0,48);
    $("hourChart").innerHTML=times.length?buildChart(l,times):`<div class="empty">No hay datos horarios disponibles.</div>`;
    const rows=times.filter((_,i)=>i%2===0);
    $("hourTable").innerHTML=rows.length?`<table class="hour-table"><thead><tr><th>Hora</th><th>Modelo</th><th>Temperatura</th><th>Lluvia</th><th>Nieve</th></tr></thead><tbody>${rows.map(t=>MODEL_KEYS.map(m=>{
      const v=hourlyValue(l,m,t)||{};
      return `<tr><td>${esc(dateLabel(t,{day:"numeric",month:"short"}))} ${timeLabel(t)}</td><td class="model-tag">${m}</td><td>${fmt(v.temperature,1)} °C</td><td>${fmt(v.rain,1)}</td><td>${fmt(v.snowfall,1)}</td></tr>`;
    }).join("")).join("")}</tbody></table>`:`<div class="empty">No hay detalle por modelo.</div>`;
    const probs=l.hourly?.probabilities||{};
    const probTimes=times.filter((_,i)=>i%4===0).slice(0,12);
    $("probability").innerHTML=probTimes.length?probTimes.map(t=>{
      const p=probs[t];
      return `<div class="prob-item"><small>${timeLabel(t)}</small><b>${valid(p)?fmt(p)+"%":"—"}</b></div>`;
    }).join(""):`<div class="empty">No hay probabilidades disponibles.</div>`;
  }

  function buildChart(l,times) {
    const W=760,H=230,L=38,R=34,T=18,B=32,innerW=W-L-R,innerH=H-T-B;
    const allTemps=MODEL_KEYS.flatMap(m=>times.map(t=>hourlyValue(l,m,t)?.temperature).filter(valid).map(Number));
    if(!allTemps.length) return `<div class="empty">No hay temperaturas horarias para dibujar el gráfico.</div>`;
    let min=Math.floor(Math.min(...allTemps)-2),max=Math.ceil(Math.max(...allTemps)+2); if(max===min)max=min+1;
    const maxRain=Math.max(1,...times.map(t=>Math.max(0,...MODEL_KEYS.map(m=>Number(hourlyValue(l,m,t)?.precipitation)||0))));
    const x=i=>L+(times.length<=1?0:i/(times.length-1)*innerW);
    const y=v=>T+(max-v)/(max-min)*innerH;
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de temperaturas y lluvia previstas">`;
    for(let j=0;j<=4;j++){const val=min+(max-min)*j/4,yy=y(val);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e8ece6" stroke-width="1"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="#84938c">${Math.round(val)}°</text>`;}
    times.forEach((t,i)=>{const rain=Math.max(0,...MODEL_KEYS.map(m=>Number(hourlyValue(l,m,t)?.precipitation)||0));if(rain>0){const bh=rain/maxRain*48;svg+=`<rect x="${x(i)-3}" y="${T+innerH-bh}" width="6" height="${bh}" rx="2" fill="#9cc6d0" opacity=".8"/>`;}});
    const colors={ECMWF:"#245d62",GFS:"#e2a94b",AROME:"#8a72b8"};
    MODEL_KEYS.forEach(m=>{let pts=[];times.forEach((t,i)=>{const v=hourlyValue(l,m,t)?.temperature;if(valid(v))pts.push(`${x(i)},${y(Number(v))}`);else if(pts.length){svg+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${colors[m]}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>`;pts=[];}});if(pts.length)svg+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${colors[m]}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>`;});
    const step=Math.max(1,Math.ceil(times.length/8));times.forEach((t,i)=>{if(i%step===0)svg+=`<text x="${x(i)}" y="${H-9}" text-anchor="middle" font-size="10" fill="#84938c">${timeLabel(t)}</text>`;});
    svg+=`<text x="${W-R+5}" y="${T+8}" font-size="9" fill="#84938c">mm/h</text></svg>`;
    return svg;
  }

  function renderAlerts(l) {
    const model=l.alerts?.models||[],official=l.alerts?.aemet?.alerts||[];
    const all=model.length+official.length;
    $("alertSummary").innerHTML=all?`<div class="notice">⚑ Se han encontrado ${all} aviso(s) o señal(es). Comprueba siempre la vigencia y la zona geográfica del aviso oficial.</div>`:`<div class="card"><span class="alert-level green">Sin avisos registrados</span><p class="muted">El archivo no contiene avisos para esta ubicación en esta actualización.</p></div>`;
    $("modelAlerts").innerHTML=model.length?model.map(a=>`<div class="alert-item"><span class="alert-level ${a.type==="viento"&&Number(a.severity)>=80?"red":""}">${esc(a.type||"Previsión")}</span><div>${esc(a.text||"Señal del modelo")}</div><div class="source-note">${esc(a.model||"Modelo meteorológico")}</div></div>`).join(""):`<div class="empty">No hay señales de los modelos.</div>`;
    $("aemetAlerts").innerHTML=official.length?official.map(a=>`<div class="alert-item"><span class="alert-level ${String(a.level).toLowerCase()==="rojo"?"red":""}">${esc(a.level||"Aviso")}</span><b>${esc(a.phenomenon||"Aviso meteorológico")}</b><div>${esc(a.zone||"Zona no especificada")}</div><div class="source-note">Vigencia: ${esc(a.effective?new Date(a.effective).toLocaleString("es-ES"):"—")} – ${esc(a.expires?new Date(a.expires).toLocaleString("es-ES"):"—")}</div></div>`).join(""):`<div class="empty">No hay avisos oficiales AEMET en el archivo.</div>`;
    const aq=l.air_quality||{},keys=Object.keys(aq).sort().slice(0,5);
    $("airQuality").innerHTML=keys.length?keys.map(k=>`<div class="air-day"><small>${esc(dateLabel(k,{weekday:"short",day:"numeric"}))}</small><b>${fmt(aq[k])}</b></div>`).join(""):`<div class="empty">No hay datos de calidad del aire.</div>`;
  }

  function navigate(view) {
    activeView=view;
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
  document.querySelectorAll(".place-choice").forEach(b=>b.addEventListener("click",()=>{placeId=b.dataset.place;render();}));
  $("refresh").addEventListener("click",()=>loadData(true));
  window.addEventListener("online",()=>loadData(false));
  if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  loadData(false);
})();
