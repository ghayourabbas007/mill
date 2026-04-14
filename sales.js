/* ================================================================
   MILLPRO — sales.js (stub)
   ================================================================ */
'use strict';
['sales','cust-payments','advances','cust-ledger','customers','bag-types'].forEach(pg => {
  Pages[pg] = function() {
    $('#pageArea').html(`<div class="card"><div class="empty"><i class="fa-solid fa-file-invoice-dollar"></i><h4>${pg} — coming soon</h4><p>Will be added in the next file.</p></div></div>`);
  };
});
Pages.customers = function(page=1){
  const data=DB.all('customers'); const p=paginate(data,page);
  let rows='';
  p.rows.forEach(c=>{
    const l=DB.where('cust_ledger',r=>r.cust_id===c.id);
    const bal=l.length?l[l.length-1].bal:(c.open_bal||0);
    rows+=`<tr><td>${c.id}</td><td class="fw6">${esc(c.name)}</td><td>${sbadge(c.type)}</td><td>${esc(c.phone||'—')}</td><td class="mono">${fmt(c.credit_limit)}</td><td class="mono ${bal>0?'td fw6':bal<0?'ts':''}">${fmt(Math.abs(bal))} ${bal>0?'<small>(due)</small>':bal<0?'<small>(cr)</small>':''}</td>
    <td>${c.is_active?'<span class="badge b-success">Active</span>':'<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._custForm(${c.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('customers',${c.id},'customers')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`;
  });
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Customers</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._custForm()"><i class="fa-solid fa-plus"></i> Add Customer</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Phone</th><th>Credit Limit</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="8" class="tc tmut" style="padding:24px">No customers.</td></tr>'}</tbody></table></div>${pagerHtml(p,'Pages.customers')}</div>`);
};
Pages._custForm = function(id){
  const c=id?DB.find('customers',id):{};
  Modal.open(id?'Edit Customer':'Add Customer',`
    <div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="cfN" value="${esc(c.name||'')}"></div><div class="fg"><label class="lbl">Phone</label><input type="text" id="cfP" value="${esc(c.phone||'')}"></div></div>
    <div class="fr"><div class="fg"><label class="lbl">Type <span class="req">*</span></label><select id="cfT"><option value="">Select...</option><option value="retail" ${c.type==='retail'?'selected':''}>Retail</option><option value="wholesale" ${c.type==='wholesale'?'selected':''}>Wholesale</option><option value="dealer" ${c.type==='dealer'?'selected':''}>Dealer</option></select></div><div class="fg"><label class="lbl">Credit Limit</label><input type="number" id="cfCr" value="${c.credit_limit||0}" min="0"></div></div>
    <div class="fg"><label class="lbl">Address</label><textarea id="cfA" rows="2">${esc(c.address||'')}</textarea></div>
    <div class="fr"><div class="fg"><label class="lbl">Opening Balance</label><input type="number" id="cfOB" value="${c.open_bal||0}"></div><div class="fg"><label class="lbl">Status</label><select id="cfAct"><option value="1" ${c.is_active!==false?'selected':''}>Active</option><option value="0" ${c.is_active===false?'selected':''}>Inactive</option></select></div></div>`,
  ()=>{
    if(!validate([{id:'cfN',label:'Name',required:true},{id:'cfT',label:'Type',required:true}]))return;
    const rec={name:$('#cfN').val().trim(),phone:$('#cfP').val().trim(),address:$('#cfA').val().trim(),type:$('#cfT').val(),credit_limit:parseFloat($('#cfCr').val())||0,open_bal:parseFloat($('#cfOB').val())||0,is_active:$('#cfAct').val()==='1'};
    id?DB.update('customers',id,rec):DB.insert('customers',rec);
    Modal.close();Toast.success('Saved');Pages.customers(1);
  });
};
Pages['bag-types']=function(page=1){
  const data=DB.all('bag_types');const p=paginate(data,page);
  $('#pageArea').html(`<div class="ph"><div class="ph-left"><h2>Bag Types</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._bagForm()"><i class="fa-solid fa-plus"></i> Add</button></div></div>
  <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Weight (kg)</th><th>Status</th><th>Actions</th></tr></thead>
  <tbody>${p.rows.map(b=>`<tr><td>${b.id}</td><td class="fw6">${esc(b.name)}</td><td class="mono">${fmtN(b.wt)} kg</td><td>${b.is_active?'<span class="badge b-success">Active</span>':'<span class="badge b-neutral">Inactive</span>'}</td><td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._bagForm(${b.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('bag_types',${b.id},'bag-types')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')||'<tr><td colspan="5" class="tc tmut" style="padding:24px">No bag types.</td></tr>'}
  </tbody></table></div></div>`);
};
Pages._bagForm=function(id){
  const b=id?DB.find('bag_types',id):{};
  Modal.open(id?'Edit Bag Type':'Add Bag Type',`<div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="btN" value="${esc(b.name||'')}" placeholder="e.g. 50 kg Bag"></div><div class="fg"><label class="lbl">Weight (kg) <span class="req">*</span></label><input type="number" id="btW" value="${b.wt||''}" min="0.5" step="0.5"></div></div>`,
  ()=>{
    if(!validate([{id:'btN',label:'Name',required:true},{id:'btW',label:'Weight',required:true,type:'number',min:0.5}]))return;
    const rec={name:$('#btN').val().trim(),wt:parseFloat($('#btW').val()),is_active:true};
    id?DB.update('bag_types',id,rec):DB.insert('bag_types',rec);
    Modal.close();Toast.success('Saved');Pages['bag-types'](1);
  },{small:true});
};
