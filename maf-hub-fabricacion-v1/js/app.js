(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.MAF_CONFIG || {};
  const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const employees = [
    { id:"jaime", name:"Jaime", skills:"Soldadura y armado" },
    { id:"xavier", name:"Xavier", skills:"Soldadura y armado" },
    { id:"omar", name:"Omar", skills:"Torno CNC y centro de maquinados" },
    { id:"david", name:"David", skills:"Fresadora y torno convencional" },
    { id:"marcos", name:"Marcos", skills:"Fresadora y torno convencional" },
    { id:"mario", name:"Mario", skills:"Diseño, corte láser e impresión 3D" },
    { id:"jesus", name:"Jesús", skills:"Eléctrico, detallado, pintura y neumática" },
    { id:"gabriel", name:"Gabriel", skills:"Eléctrico, detallado, pintura y neumática" }
  ];

  const demo = {
    projects:[{id:"p1",code:"PR-2026-001",name:"Nail Roller",client:"Demo",status:"active",due_date:"2026-10-01"}],
    assemblies:[
      {id:"a1",project_id:"p1",parent_id:null,code:"000",name:"Ensamble general"},
      {id:"a2",project_id:"p1",parent_id:"a1",code:"100",name:"Bastidor principal"},
      {id:"a3",project_id:"p1",parent_id:"a1",code:"200",name:"Sistema de rodillos"}
    ],
    parts:[
      {id:"pt1",project_id:"p1",assembly_id:"a2",part_number:"NR-101",name:"Placa lateral",quantity:2,material:"A36 1/4 in",due_date:"2026-08-20",status:"completed"},
      {id:"pt2",project_id:"p1",assembly_id:"a2",part_number:"NR-102",name:"Travesaño",quantity:4,material:"PTR 2 x 2",due_date:"2026-08-22",status:"in_progress"},
      {id:"pt3",project_id:"p1",assembly_id:"a3",part_number:"NR-201",name:"Eje motriz",quantity:2,material:"Acero 1045 Ø2 in",due_date:"2026-08-24",status:"blocked"}
    ],
    operations:[
      {id:"o1",part_id:"pt1",process:"Corte láser",employee_id:"mario",status:"completed"},
      {id:"o2",part_id:"pt1",process:"Soldadura",employee_id:"jaime",status:"completed"},
      {id:"o3",part_id:"pt2",process:"Soldadura",employee_id:"xavier",status:"in_progress"},
      {id:"o4",part_id:"pt3",process:"Torno CNC",employee_id:"omar",status:"blocked"}
    ],
    drawings:[{id:"d1",part_id:"pt1",file_name:"NR-101-R00.pdf",revision:"R00",web_view_link:"",is_current:true}],
    notes:[{id:"n1",part_id:"pt3",author_name:"Omar",body:"Falta confirmar tolerancia del alojamiento del rodamiento.",created_at:new Date().toISOString()}]
  };

  const state = { ...demo, selectedPartId:null, user:null };
  const esc = (v="") => String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const statusLabel = s => ({pending:"Pendiente",ready:"Lista para fabricar",in_progress:"En fabricación",review:"En revisión",completed:"Terminada",blocked:"Bloqueada"}[s] || s || "Pendiente");
  const employeeName = id => employees.find(e=>e.id===id)?.name || "Sin asignar";

  function renderEmployeeFilter(){
    $("employeeFilter").innerHTML = '<option value="">Todos los responsables</option>' + employees.map(e=>`<option value="${e.id}">${esc(e.name)} · ${esc(e.skills)}</option>`).join("");
  }

  function filteredParts(){
    const q=$("searchInput").value.trim().toLowerCase(), employee=$("employeeFilter").value, status=$("statusFilter").value;
    return state.parts.filter(p=>{
      const assigned=state.operations.some(o=>o.part_id===p.id && (!employee || o.employee_id===employee));
      const text=`${p.part_number} ${p.name} ${p.material}`.toLowerCase();
      return (!q||text.includes(q)) && (!employee||assigned) && (!status||p.status===status);
    });
  }

  function renderMetrics(){
    $("metricProjects").textContent=state.projects.filter(p=>p.status!=="completed").length;
    $("metricParts").textContent=state.parts.length;
    $("metricInProgress").textContent=state.parts.filter(p=>p.status==="in_progress").length;
    $("metricBlocked").textContent=state.parts.filter(p=>p.status==="blocked").length;
  }

  function renderTree(){
    const visible=new Set(filteredParts().map(p=>p.id));
    $("projectTree").innerHTML=state.projects.map(project=>{
      const assemblies=state.assemblies.filter(a=>a.project_id===project.id && a.parent_id);
      const groups=assemblies.map(a=>{
        const parts=state.parts.filter(p=>p.assembly_id===a.id && visible.has(p.id));
        if(!parts.length)return "";
        return `<div class="tree-assembly"><div class="assembly-title">${esc(a.code)} · ${esc(a.name)}</div>${parts.map(p=>`<div class="tree-part ${state.selectedPartId===p.id?"active":""}" data-part-id="${p.id}"><div><strong>${esc(p.part_number)} · ${esc(p.name)}</strong><small>${esc(p.material||"Material pendiente")}</small></div><span class="status-dot ${p.status}" title="${statusLabel(p.status)}"></span></div>`).join("")}</div>`;
      }).join("");
      return groups?`<article class="tree-project"><div class="tree-title"><span>${esc(project.code)} · ${esc(project.name)}</span><small>${state.parts.filter(p=>p.project_id===project.id&&p.status==="completed").length}/${state.parts.filter(p=>p.project_id===project.id).length}</small></div><div class="tree-group">${groups}</div></article>`:"";
    }).join("") || '<div class="empty-state">No hay piezas que coincidan con los filtros.</div>';
    document.querySelectorAll("[data-part-id]").forEach(el=>el.onclick=()=>selectPart(el.dataset.partId));
  }

  function selectPart(id){state.selectedPartId=id;renderTree();renderDetail()}

  function renderDetail(){
    const p=state.parts.find(x=>x.id===state.selectedPartId);
    $("detailEmpty").classList.toggle("hidden",Boolean(p));$("partDetail").classList.toggle("hidden",!p);if(!p)return;
    const project=state.projects.find(x=>x.id===p.project_id), assembly=state.assemblies.find(x=>x.id===p.assembly_id);
    $("detailPath").textContent=`${project?.code||""} / ${assembly?.name||""}`;
    $("detailPartTitle").textContent=`${p.part_number} · ${p.name}`;
    $("detailStatus").textContent=statusLabel(p.status);$("detailStatus").className=`status-pill ${p.status}`;
    $("detailPartNumber").value=p.part_number;$("detailQuantity").value=p.quantity||1;$("detailMaterial").value=p.material||"";$("detailDueDate").value=p.due_date||"";
    const drawing=state.drawings.find(d=>d.part_id===p.id&&d.is_current);
    $("drawingName").textContent=drawing?.file_name||"Sin plano ligado";$("drawingRevision").textContent=drawing?`Revisión vigente: ${drawing.revision}`:"";
    $("openDrawingButton").href=drawing?.web_view_link||"#";$("openDrawingButton").classList.toggle("disabled-link",!drawing?.web_view_link);
    const ops=state.operations.filter(o=>o.part_id===p.id);
    $("operationsList").innerHTML=ops.length?ops.map(o=>`<div class="operation-row"><div><strong>${esc(o.process)}</strong><small>${esc(employeeName(o.employee_id))}</small></div><select data-op-employee="${o.id}">${employees.map(e=>`<option value="${e.id}" ${e.id===o.employee_id?"selected":""}>${esc(e.name)}</option>`).join("")}</select><select data-op-status="${o.id}">${["pending","ready","in_progress","review","completed","blocked"].map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></div>`).join(""):'<div class="empty-state">Todavía no hay procesos registrados.</div>';
    document.querySelectorAll("[data-op-employee]").forEach(el=>el.onchange=()=>updateOperation(el.dataset.opEmployee,{employee_id:el.value}));
    document.querySelectorAll("[data-op-status]").forEach(el=>el.onchange=()=>updateOperation(el.dataset.opStatus,{status:el.value}));
    const notes=state.notes.filter(n=>n.part_id===p.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    $("notesList").innerHTML=notes.map(n=>`<div class="note-item"><p>${esc(n.body)}</p><small>${esc(n.author_name||"Usuario")} · ${new Date(n.created_at).toLocaleString("es-MX")}</small></div>`).join("");
  }

  async function updateOperation(id,changes){
    const op=state.operations.find(x=>x.id===id);if(!op)return;Object.assign(op,changes);
    if(sb){const{error}=await sb.from("manufacturing_operations").update(changes).eq("id",id);if(error)console.error(error)}
    renderDetail();
  }

  async function createProject(data){
    const project={id:crypto.randomUUID(),code:data.code,name:data.name,client:data.client,status:"active",due_date:data.due_date,drive_folder_id:data.drive_folder_id};
    if(sb){const{data:created,error}=await sb.from("projects").insert(project).select().single();if(error)throw error;state.projects.push(created)}else state.projects.push(project);
    renderMetrics();renderTree();
  }

  function bind(){
    renderEmployeeFilter();renderMetrics();renderTree();
    ["searchInput","employeeFilter","statusFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderTree));
    document.querySelectorAll(".nav-item[data-view]").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
      document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(`${btn.dataset.view}View`).classList.remove("hidden");
      $("pageTitle").textContent=btn.dataset.view==="manufacturing"?"Fabricación":btn.dataset.view==="checklist"?"Checklist diario":"Dashboard";
      if(btn.dataset.view==="checklist"&&cfg.CHECKLIST_URL)window.open(cfg.CHECKLIST_URL,"_blank","noopener");
    });
    $("newProjectButton").onclick=()=>$("projectDialog").showModal();
    $("projectForm").addEventListener("submit",async e=>{if(e.submitter?.value==="cancel")return;e.preventDefault();try{await createProject({code:$("projectCode").value.trim(),name:$("projectName").value.trim(),client:$("projectClient").value.trim(),due_date:$("projectDueDate").value,drive_folder_id:$("projectDriveFolder").value.trim()});$("projectDialog").close();e.target.reset()}catch(err){alert(err.message)}});
    $("noteForm").onsubmit=async e=>{e.preventDefault();const body=$("noteInput").value.trim();if(!body||!state.selectedPartId)return;const note={id:crypto.randomUUID(),part_id:state.selectedPartId,author_name:state.user?.email||"Usuario demo",body,created_at:new Date().toISOString()};if(sb){const{data,error}=await sb.from("part_notes").insert(note).select().single();if(error)return alert(error.message);state.notes.push(data)}else state.notes.push(note);$("noteInput").value="";renderDetail()};
    $("addOperationButton").onclick=()=>{if(!state.selectedPartId)return;const process=prompt("Nombre del proceso (ej. Torno CNC, Corte láser, Soldadura):");if(!process?.trim())return;state.operations.push({id:crypto.randomUUID(),part_id:state.selectedPartId,process:process.trim(),employee_id:"mario",status:"pending"});renderDetail()};
    $("linkDrawingButton").onclick=()=>{if(!state.selectedPartId)return;const file=prompt("Nombre del PDF:",`${state.parts.find(p=>p.id===state.selectedPartId).part_number}-R00.pdf`);if(!file)return;const link=prompt("Enlace de Google Drive (opcional por ahora):","")||"";state.drawings.forEach(d=>{if(d.part_id===state.selectedPartId)d.is_current=false});state.drawings.push({id:crypto.randomUUID(),part_id:state.selectedPartId,file_name:file,revision:(file.match(/R\d+/i)||["R00"])[0].toUpperCase(),web_view_link:link,is_current:true});renderDetail()};
    $("syncDrawingsButton").onclick=()=>alert("La estructura ya contempla sincronización por carpeta de Drive. El siguiente paso será desplegar la función segura que consulta los PDF por número de pieza.");
    ["detailQuantity","detailMaterial","detailDueDate"].forEach(id=>$(id).onchange=()=>{const p=state.parts.find(x=>x.id===state.selectedPartId);if(!p)return;p.quantity=Number($("detailQuantity").value)||1;p.material=$("detailMaterial").value;p.due_date=$("detailDueDate").value;renderTree()});
  }

  async function auth(){
    if(!sb||cfg.DEMO_MODE){$("appView").classList.remove("hidden");$("loginView").classList.add("hidden");bind();return}
    const{data:{session}}=await sb.auth.getSession();if(session){state.user=session.user;$("sessionName").textContent=session.user.email;$("logoutButton").classList.remove("hidden");bind()}else{$("appView").classList.add("hidden");$("loginView").classList.remove("hidden")}
    $("loginForm").onsubmit=async e=>{e.preventDefault();const{error}=await sb.auth.signInWithPassword({email:$("emailInput").value.trim(),password:$("passwordInput").value});$("loginMessage").textContent=error?error.message:"";if(!error)location.reload()};
    $("logoutButton").onclick=async()=>{await sb.auth.signOut();location.reload()};
  }
  auth();
})();
