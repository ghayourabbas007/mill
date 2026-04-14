/* ================================================================
   MILLPRO — production.js (stub — full module coming next)
   ================================================================ */
'use strict';
Pages.production = function () {
  $('#pageArea').html('<div class="card"><div class="empty"><i class="fa-solid fa-industry"></i><h4>Production module coming soon</h4><p>Will be added in the next file.</p></div></div>');
};
Pages.products = function () {
  const data = DB.all('products'); const p = paginate(data, 1);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Products</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._productForm()"><i class="fa-solid fa-plus"></i> Add</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Category</th><th>Unit</th><th>Yield %</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${p.rows.map(pr => `<tr><td>${pr.id}</td><td class="fw6">${esc(pr.name)}</td><td>${sbadge(pr.category)}</td><td>${esc(pr.unit)}</td><td class="mono">${pr.yield_pct||0}%</td>
    <td>${pr.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._productForm(${pr.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('products',${pr.id},'products')"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`).join('') || '<tr><td colspan="7" class="tc tmut" style="padding:24px">No products.</td></tr>'}
    </tbody></table></div></div>`);
};
Pages._productForm = function (id) {
  const pr = id ? DB.find('products', id) : {};
  Modal.open(id ? 'Edit Product' : 'Add Product', `
    <div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="prN" value="${esc(pr.name||'')}"></div>
    <div class="fg"><label class="lbl">Category <span class="req">*</span></label><select id="prCat"><option value="">Select...</option><option value="main" ${pr.category==='main'?'selected':''}>Main</option><option value="byproduct" ${pr.category==='byproduct'?'selected':''}>Byproduct</option><option value="waste" ${pr.category==='waste'?'selected':''}>Waste</option></select></div></div>
    <div class="fr"><div class="fg"><label class="lbl">Unit</label><select id="prU"><option value="kg" ${pr.unit==='kg'?'selected':''}>kg</option><option value="ton" ${pr.unit==='ton'?'selected':''}>Ton</option></select></div>
    <div class="fg"><label class="lbl">Yield %</label><input type="number" id="prY" value="${pr.yield_pct||0}" min="0" max="100"></div></div>`,
  () => {
    if (!validate([{id:'prN',label:'Name',required:true},{id:'prCat',label:'Category',required:true}])) return;
    const rec = { name:$('#prN').val().trim(), category:$('#prCat').val(), unit:$('#prU').val(), yield_pct:parseFloat($('#prY').val())||0, is_active:true };
    id ? DB.update('products', id, rec) : DB.insert('products', rec);
    Modal.close(); Toast.success('Saved'); Pages.products();
  });
};
Pages.shifts = function () {
  const data = DB.all('shifts'); const p = paginate(data, 1);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Shifts</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._shiftForm()"><i class="fa-solid fa-plus"></i> Add</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${p.rows.map(s => `<tr><td>${s.id}</td><td class="fw6">${esc(s.name)}</td><td>${s.start_time||'—'}</td><td>${s.end_time||'—'}</td>
    <td>${s.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._shiftForm(${s.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('shifts',${s.id},'shifts')"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`).join('') || '<tr><td colspan="6" class="tc tmut" style="padding:24px">No shifts.</td></tr>'}
    </tbody></table></div></div>`);
};
Pages._shiftForm = function (id) {
  const s = id ? DB.find('shifts', id) : {};
  Modal.open(id ? 'Edit Shift' : 'Add Shift', `
    <div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="shN" value="${esc(s.name||'')}"></div>
    <div class="fr"><div class="fg"><label class="lbl">Start Time</label><input type="time" id="shS" value="${s.start_time||''}"></div>
    <div class="fg"><label class="lbl">End Time</label><input type="time" id="shE" value="${s.end_time||''}"></div></div>`,
  () => {
    if (!validate([{id:'shN',label:'Name',required:true}])) return;
    const rec = { name:$('#shN').val().trim(), start_time:$('#shS').val(), end_time:$('#shE').val(), is_active:true };
    id ? DB.update('shifts', id, rec) : DB.insert('shifts', rec);
    Modal.close(); Toast.success('Saved'); Pages.shifts();
  }, { small: true });
};
