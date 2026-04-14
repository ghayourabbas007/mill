/* ================================================================
   MILLPRO — inventory.js (stub — full module coming next)
   ================================================================ */
'use strict';

Pages.inventory = function (page = 1) {
  const items = DB.all('items').filter(i => i.is_active);
  const prods = DB.all('products').filter(p => p.is_active);

  const calcStock = (filterFn) => {
    const e = DB.all('inventory').filter(filterFn);
    const inQ  = e.filter(r => r.qty > 0).reduce((s, r) => s + (r.qty || 0), 0);
    const outQ = e.filter(r => r.qty < 0).reduce((s, r) => s + (r.qty || 0), 0);
    return { in: inQ, out: Math.abs(outQ), stock: inQ + outQ };
  };

  const rows1 = items.map(i => {
    const st = calcStock(r => r.item_id === i.id);
    return `<tr><td class="fw6">${esc(i.name)}</td><td>${esc(i.unit)}</td>
      <td class="mono ts">${fmtN(st.in)}</td>
      <td class="mono tw">${fmtN(st.out)}</td>
      <td class="mono fw6 ${st.stock < 0 ? 'td' : st.stock === 0 ? 'tmut' : 'ts'}">${fmtN(st.stock)}</td>
      <td>${st.stock < 0 ? '<span class="badge b-danger">Deficit</span>' : st.stock === 0 ? '<span class="badge b-neutral">Empty</span>' : '<span class="badge b-success">In Stock</span>'}</td>
    </tr>`;
  }).join('');

  const rows2 = prods.map(pr => {
    const st = calcStock(r => r.prod_id === pr.id);
    return `<tr><td class="fw6">${esc(pr.name)}</td><td>${sbadge(pr.category)}</td>
      <td class="mono ts">${fmtN(st.in)}</td>
      <td class="mono td">${fmtN(st.out)}</td>
      <td class="mono fw6 ${st.stock < 0 ? 'td' : st.stock === 0 ? 'tmut' : 'ts'}">${fmtN(st.stock)}</td>
      <td>${st.stock < 0 ? '<span class="badge b-danger">Deficit</span>' : st.stock === 0 ? '<span class="badge b-neutral">Empty</span>' : '<span class="badge b-success">In Stock</span>'}</td>
    </tr>`;
  }).join('');

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Inventory Report</h2><p>Current stock levels for all items and products</p></div>
      <div class="ph-right"><button class="btn btn-ghost" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-wheat-awn"></i> Raw Input Items</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Item</th><th>Unit</th><th>Total Purchased</th><th>Consumed</th><th>Current Stock</th><th>Status</th></tr></thead>
        <tbody>${rows1 || '<tr><td colspan="6" class="tc tmut" style="padding:20px">No items.</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-boxes-stacked"></i> Output Products</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Product</th><th>Category</th><th>Produced</th><th>Sold</th><th>Current Stock</th><th>Status</th></tr></thead>
        <tbody>${rows2 || '<tr><td colspan="6" class="tc tmut" style="padding:20px">No products.</td></tr>'}</tbody>
      </table></div>
    </div>
  `);
};

// Items master
Pages.items = function (page = 1) {
  const data = DB.all('items'); const p = paginate(data, page);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Input Items</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._itemForm()"><i class="fa-solid fa-plus"></i> Add Item</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Unit</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${p.rows.map(i => `<tr><td>${i.id}</td><td class="fw6">${esc(i.name)}</td><td>${esc(i.unit)}</td><td>${esc(i.description||'—')}</td>
    <td>${i.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._itemForm(${i.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('items',${i.id},'items')"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`).join('') || '<tr><td colspan="6" class="tc tmut" style="padding:24px">No items.</td></tr>'}
    </tbody></table></div></div>`);
};
Pages._itemForm = function (id) {
  const it = id ? DB.find('items', id) : {};
  Modal.open(id ? 'Edit Item' : 'Add Item', `
    <div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="itN" value="${esc(it.name||'')}"></div>
    <div class="fg"><label class="lbl">Unit</label><select id="itU"><option value="kg" ${it.unit==='kg'?'selected':''}>kg</option><option value="ton" ${it.unit==='ton'?'selected':''}>Ton</option></select></div></div>
    <div class="fg"><label class="lbl">Description</label><input type="text" id="itD" value="${esc(it.description||'')}"></div>`,
  () => {
    if (!validate([{ id: 'itN', label: 'Name', required: true }])) return;
    const rec = { name: $('#itN').val().trim(), unit: $('#itU').val(), description: $('#itD').val().trim(), is_active: true };
    id ? DB.update('items', id, rec) : DB.insert('items', rec);
    Modal.close(); Toast.success('Saved'); Pages.items(1);
  }, { small: true });
};
