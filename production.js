/* ================================================================
   MILLPRO — production.js
   Production Batches | Products | Shifts | Bag Types
   ================================================================ */
'use strict';

// ================================================================
// PRODUCTION BATCHES
// ================================================================
Pages.production = function (page = 1) {
  const shiftFlt = $('#pbShiftFlt').val() || '';
  const statFlt  = $('#pbStatFlt').val()  || '';
  const q        = ($('#pbSrch').val()    || '').toLowerCase();

  let data = DB.all('prod_batches').reverse();
  if (shiftFlt) data = data.filter(b => b.shift_id  === parseInt(shiftFlt));
  if (statFlt)  data = data.filter(b => b.status    === statFlt);
  if (q)        data = data.filter(b => gl('items', b.item_id, 'name').toLowerCase().includes(q) ||
                                        (b.notes || '').toLowerCase().includes(q));

  const p          = paginate(data, page);
  const totInputKg = data.reduce((s, b) => s + (b.input_kg || 0), 0);

  let rows = '';
  p.rows.forEach(b => {
    const outs     = DB.where('prod_outs', o => o.batch_id === b.id);
    const totOut   = outs.reduce((s, o) => s + (o.out_kg   || 0), 0);
    const totWaste = outs.reduce((s, o) => s + (o.waste_kg || 0), 0);
    const yieldPct = b.input_kg > 0 ? ((totOut / b.input_kg) * 100).toFixed(1) : '—';

    rows += `<tr>
      <td>${b.id}</td>
      <td>${fmtDate(b.dt)}</td>
      <td>${gl('shifts', b.shift_id, 'name')}</td>
      <td>${gl('items',  b.item_id,  'name')}</td>
      <td class="mono">${fmtN(b.input_kg)}</td>
      <td class="mono ts">${fmtN(totOut)}</td>
      <td class="mono td">${fmtN(totWaste)}</td>
      <td class="mono">${yieldPct}${yieldPct !== '—' ? '%' : ''}</td>
      <td>${sbadge(b.status)}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="View Details" onclick="Pages._viewBatch(${b.id})"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('prod_batches',${b.id},'production')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="10" class="tc tmut" style="padding:30px">No production batches yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Production Batches</h2><p>Daily milling and processing records</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._productionForm()"><i class="fa-solid fa-plus"></i> New Batch</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
      <div class="stat-card">
        <div class="si amber"><i class="fa-solid fa-industry"></i></div>
        <div class="sb"><div class="sb-lbl">Total Batches</div><div class="sb-val">${data.length}</div></div>
      </div>
      <div class="stat-card">
        <div class="si brown"><i class="fa-solid fa-wheat-awn"></i></div>
        <div class="sb"><div class="sb-lbl">Total Input (kg)</div><div class="sb-val">${fmtN(totInputKg)}</div></div>
      </div>
      <div class="stat-card">
        <div class="si green"><i class="fa-solid fa-boxes-stacked"></i></div>
        <div class="sb">
          <div class="sb-lbl">Total Output (kg)</div>
          <div class="sb-val">${fmtN(data.flatMap(b => DB.where('prod_outs', o => o.batch_id === b.id)).reduce((s,o)=>s+(o.out_kg||0),0))}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="si red"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="sb">
          <div class="sb-lbl">Total Wastage (kg)</div>
          <div class="sb-val">${fmtN(data.flatMap(b => DB.where('prod_outs', o => o.batch_id === b.id)).reduce((s,o)=>s+(o.waste_kg||0),0))}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="fbar">
        <div class="sbox f1"><i class="fa-solid fa-search"></i>
          <input type="text" id="pbSrch" placeholder="Search item, notes..." value="${esc(q)}" oninput="Pages.production(1)">
        </div>
        <select id="pbShiftFlt" style="width:155px" onchange="Pages.production(1)">
          <option value="">All Shifts</option>
          ${DB.all('shifts').map(s => `<option value="${s.id}" ${shiftFlt==s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
        </select>
        <select id="pbStatFlt" style="width:155px" onchange="Pages.production(1)">
          <option value="">All Status</option>
          <option value="completed"   ${statFlt==='completed'  ?'selected':''}>Completed</option>
          <option value="in_progress" ${statFlt==='in_progress'?'selected':''}>In Progress</option>
          <option value="cancelled"   ${statFlt==='cancelled'  ?'selected':''}>Cancelled</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr>
          <th>#</th><th>Date</th><th>Shift</th><th>Input Item</th>
          <th>Input (kg)</th><th>Output (kg)</th><th>Wastage (kg)</th>
          <th>Yield %</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="4" class="tr fw6">Totals:</td>
          <td class="mono fw6">${fmtN(totInputKg)} kg</td>
          <td class="mono fw6 ts">${fmtN(p.rows.flatMap(b=>DB.where('prod_outs',o=>o.batch_id===b.id)).reduce((s,o)=>s+(o.out_kg||0),0))} kg</td>
          <td class="mono fw6 td">${fmtN(p.rows.flatMap(b=>DB.where('prod_outs',o=>o.batch_id===b.id)).reduce((s,o)=>s+(o.waste_kg||0),0))} kg</td>
          <td colspan="3"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, 'Pages.production')}
    </div>
  `);
};

// ── New / Edit Production Batch ──────────────────────────────────
Pages._productionForm = function () {
  const prods = DB.all('products').filter(p => p.is_active);
  if (!prods.length) { Toast.warning('No Products', 'Please add output products first.'); return; }

  Modal.open('New Production Batch', `
    <div class="fr">
      <div class="fg"><label class="lbl">Production Date <span class="req">*</span></label>
        <input type="date" id="pbDt" value="${today()}">
      </div>
      <div class="fg"><label class="lbl">Shift <span class="req">*</span></label>
        <select id="pbShift">${selOpts('shifts','id','name','',s=>s.is_active)}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Input Item <span class="req">*</span></label>
        <select id="pbItem" onchange="Pages._pbCheckStock()">${selOpts('items','id','name','',i=>i.is_active)}</select>
      </div>
      <div class="fg"><label class="lbl">Input Quantity (kg) <span class="req">*</span></label>
        <input type="number" id="pbQty" min="1" placeholder="e.g. 500" oninput="Pages._pbCheckStock()">
      </div>
    </div>
    <div id="pbStockInfo"></div>

    <hr class="divider">
    <div class="flex ac" style="justify-content:space-between;margin-bottom:10px">
      <div class="fw6" style="font-size:13px"><i class="fa-solid fa-boxes-stacked" style="color:var(--accent)"></i> Output Products</div>
      <button class="add-row-btn" onclick="Pages._pbAddRow()"><i class="fa-solid fa-plus"></i> Add Row</button>
    </div>
    <table class="lit">
      <thead><tr>
        <th style="min-width:160px">Product</th>
        <th>Output (kg)</th>
        <th>Wastage (kg)</th>
        <th>Notes</th>
        <th style="width:30px"></th>
      </tr></thead>
      <tbody id="pbRows"></tbody>
      <tfoot>
        <tr>
          <td class="tr fw6">Total Output:</td>
          <td><input type="number" id="pbTotOut" readonly style="background:var(--bg);font-weight:600"></td>
          <td><input type="number" id="pbTotWaste" readonly style="background:var(--bg);color:var(--danger)"></td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <div class="fg mt12"><label class="lbl">Batch Notes</label>
      <textarea id="pbNotes" rows="2" placeholder="Optional notes about this batch..."></textarea>
    </div>`,
  () => {
    if (!validate([
      { id: 'pbDt',    label: 'Date',       required: true },
      { id: 'pbShift', label: 'Shift',      required: true },
      { id: 'pbItem',  label: 'Input Item', required: true },
      { id: 'pbQty',   label: 'Input Qty',  required: true, type: 'number', min: 1 }
    ])) return;

    const iid     = parseInt($('#pbItem').val());
    const inputKg = parseFloat($('#pbQty').val());

    // Collect output rows
    const outputRows = [];
    let hasOutput = false;
    $('#pbRows tr').each(function () {
      const pid    = parseInt($(this).find('.pbProd').val());
      const outKg  = parseFloat($(this).find('.pbOut').val())   || 0;
      const waste  = parseFloat($(this).find('.pbWaste').val()) || 0;
      const notes  = $(this).find('.pbRowNote').val() || '';
      if (pid && outKg > 0) { outputRows.push({ pid, outKg, waste, notes }); hasOutput = true; }
    });

    if (!hasOutput) { Toast.warning('No Output', 'Please add at least one output product with quantity > 0.'); return; }

    // Save batch
    const batch = DB.insert('prod_batches', {
      dt: $('#pbDt').val(), shift_id: parseInt($('#pbShift').val()),
      item_id: iid, input_kg: inputKg,
      notes: $('#pbNotes').val().trim(), status: 'completed'
    });

    // Inventory: consume input
    DB.insert('inventory', {
      item_id: iid, prod_id: null, qty: -inputKg,
      etype: 'prod_consumed', ref: `batch:${batch.id}`, ts: new Date().toISOString()
    });

    // Save outputs + inventory entries
    outputRows.forEach(row => {
      DB.insert('prod_outs', {
        batch_id: batch.id, prod_id: row.pid,
        out_kg: row.outKg, waste_kg: row.waste, notes: row.notes
      });
      DB.insert('inventory', {
        item_id: null, prod_id: row.pid, qty: row.outKg,
        etype: 'prod_out', ref: `batch:${batch.id}`, ts: new Date().toISOString()
      });
    });

    Modal.close();
    Toast.success('Saved', `Batch #${batch.id} recorded. ${outputRows.length} output product(s) added.`);
    Pages.production(1);
    $('#tbCash').text(fmtN(getCash()));
  }, { large: true });

  // Pre-populate 3 output rows
  setTimeout(() => {
    Pages._pbAddRow();
    Pages._pbAddRow();
    Pages._pbAddRow();
  }, 80);
};

// Add one output row
Pages._pbAddRow = function () {
  const prods = DB.all('products').filter(p => p.is_active);
  if (!prods.length) return;
  const opts = prods.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  $('#pbRows').append(`<tr>
    <td><select class="pbProd" onchange="Pages._pbSuggestYield(this)">${opts}</select></td>
    <td><input type="number" class="pbOut"   min="0" step="0.1" placeholder="0" oninput="Pages._pbCalcTotals()"></td>
    <td><input type="number" class="pbWaste" min="0" step="0.1" placeholder="0" oninput="Pages._pbCalcTotals()"></td>
    <td><input type="text"   class="pbRowNote" placeholder="Optional"></td>
    <td><button class="rm-line" onclick="$(this).closest('tr').remove();Pages._pbCalcTotals()"><i class="fa-solid fa-xmark"></i></button></td>
  </tr>`);
};

// Suggest yield when product selected
Pages._pbSuggestYield = function (el) {
  const row   = $(el).closest('tr');
  const pid   = parseInt($(el).val());
  const pr    = DB.find('products', pid);
  const inputKg = parseFloat($('#pbQty').val()) || 0;
  if (pr && pr.yield_pct && inputKg > 0) {
    const suggested = ((pr.yield_pct / 100) * inputKg).toFixed(1);
    row.find('.pbOut').val(suggested);
    Pages._pbCalcTotals();
  }
};

// Recalculate output totals
Pages._pbCalcTotals = function () {
  let totOut = 0, totWaste = 0;
  $('#pbRows tr').each(function () {
    totOut   += parseFloat($(this).find('.pbOut').val())   || 0;
    totWaste += parseFloat($(this).find('.pbWaste').val()) || 0;
  });
  $('#pbTotOut').val(totOut.toFixed(2));
  $('#pbTotWaste').val(totWaste.toFixed(2));
};

// Show available stock for selected input item
Pages._pbCheckStock = function () {
  const iid     = parseInt($('#pbItem').val());
  const inputKg = parseFloat($('#pbQty').val()) || 0;
  if (!iid) return;
  const stock = DB.where('inventory', r => r.item_id === iid).reduce((s, r) => s + (r.qty || 0), 0);
  let html = '';
  if (stock <= 0) {
    html = `<div class="warn-box"><i class="fa-solid fa-triangle-exclamation"></i> <strong>No stock available</strong> for this item. Current stock: <strong class="td">${fmtN(stock)} kg</strong></div>`;
  } else if (inputKg > stock) {
    html = `<div class="warn-box"><i class="fa-solid fa-triangle-exclamation"></i> Requested <strong>${fmtN(inputKg)} kg</strong> exceeds available stock of <strong>${fmtN(stock)} kg</strong>. This will create a deficit.</div>`;
  } else {
    html = `<div class="info-box"><i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Available stock: <strong class="ts">${fmtN(stock)} kg</strong>${inputKg > 0 ? ` — After this batch: <strong>${fmtN(stock - inputKg)} kg</strong>` : ''}</div>`;
  }
  $('#pbStockInfo').html(html);
};

// View batch details
Pages._viewBatch = function (id) {
  const b = DB.find('prod_batches', id); if (!b) return;
  const outs     = DB.where('prod_outs', o => o.batch_id === id);
  const totOut   = outs.reduce((s, o) => s + (o.out_kg   || 0), 0);
  const totWaste = outs.reduce((s, o) => s + (o.waste_kg || 0), 0);
  const yieldPct = b.input_kg > 0 ? ((totOut / b.input_kg) * 100).toFixed(2) : '—';

  const outRows = outs.map(o => `<tr>
    <td>${gl('products', o.prod_id, 'name')}</td>
    <td class="mono ts">${fmtN(o.out_kg)} kg</td>
    <td class="mono td">${fmtN(o.waste_kg)} kg</td>
    <td>${esc(o.notes || '—')}</td>
  </tr>`).join('');

  Modal.open(`Production Batch #${id}`, `
    <div class="fr" style="margin-bottom:14px">
      <div><strong>Date:</strong><br>${fmtDate(b.dt)}</div>
      <div><strong>Shift:</strong><br>${gl('shifts', b.shift_id, 'name')}</div>
      <div><strong>Input Item:</strong><br>${gl('items', b.item_id, 'name')}</div>
      <div><strong>Input Qty:</strong><br><span class="mono">${fmtN(b.input_kg)} kg</span></div>
    </div>

    <table class="dt" style="margin-bottom:14px">
      <thead><tr><th>Product</th><th>Output (kg)</th><th>Wastage (kg)</th><th>Notes</th></tr></thead>
      <tbody>
        ${outRows || '<tr><td colspan="4" class="tc tmut">No outputs recorded.</td></tr>'}
        <tr style="border-top:2px solid var(--border)">
          <td class="fw6">Total</td>
          <td class="mono fw6 ts">${fmtN(totOut)} kg</td>
          <td class="mono fw6 td">${fmtN(totWaste)} kg</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center">
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">INPUT</div>
        <div class="mono fw6">${fmtN(b.input_kg)} kg</div>
      </div>
      <div style="background:var(--success-bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">OUTPUT</div>
        <div class="mono fw6 ts">${fmtN(totOut)} kg</div>
      </div>
      <div style="background:var(--info-bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">YIELD</div>
        <div class="mono fw6">${yieldPct}${yieldPct !== '—' ? '%' : ''}</div>
      </div>
    </div>

    ${b.notes ? `<div class="mt12"><strong>Notes:</strong> ${esc(b.notes)}</div>` : ''}`,
  false, { large: true });
};

// ================================================================
// PRODUCTS
// ================================================================
Pages.products = function (page = 1) {
  const catFlt = $('#prodCatFlt').val() || '';
  let data     = DB.all('products');
  if (catFlt) data = data.filter(p => p.category === catFlt);
  const p = paginate(data, page);

  let rows = '';
  p.rows.forEach(pr => {
    // Current stock from inventory
    const stock = DB.where('inventory', r => r.prod_id === pr.id).reduce((s, r) => s + (r.qty || 0), 0);
    rows += `<tr>
      <td>${pr.id}</td>
      <td class="fw6">${esc(pr.name)}</td>
      <td>${sbadge(pr.category)}</td>
      <td>${esc(pr.unit)}</td>
      <td class="mono">${pr.yield_pct || 0}%</td>
      <td>${esc(pr.description || '—')}</td>
      <td class="mono fw6 ${stock < 0 ? 'td' : stock === 0 ? 'tmut' : 'ts'}">${fmtN(stock)} kg</td>
      <td>${pr.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._productForm(${pr.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('products',${pr.id},'products')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No products found.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Products</h2><p>Output products from milling process</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._productForm()"><i class="fa-solid fa-plus"></i> Add Product</button></div>
    </div>
    <div class="card">
      <div class="fbar">
        <select id="prodCatFlt" style="width:175px" onchange="Pages.products(1)">
          <option value="">All Categories</option>
          <option value="main"      ${catFlt==='main'      ?'selected':''}>Main Products</option>
          <option value="byproduct" ${catFlt==='byproduct' ?'selected':''}>Byproducts</option>
          <option value="waste"     ${catFlt==='waste'     ?'selected':''}>Waste</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Unit</th><th>Std Yield%</th><th>Description</th><th>Current Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, 'Pages.products')}
    </div>
  `);
};

Pages._productForm = function (id) {
  const pr = id ? DB.find('products', id) : {};
  Modal.open(id ? 'Edit Product' : 'Add Product', `
    <div class="fr">
      <div class="fg"><label class="lbl">Product Name <span class="req">*</span></label>
        <input type="text" id="prN" value="${esc(pr.name||'')}" placeholder="e.g. Flour (Maida)">
      </div>
      <div class="fg"><label class="lbl">Category <span class="req">*</span></label>
        <select id="prCat">
          <option value="">Select...</option>
          <option value="main"      ${pr.category==='main'      ?'selected':''}>Main Product</option>
          <option value="byproduct" ${pr.category==='byproduct' ?'selected':''}>Byproduct</option>
          <option value="waste"     ${pr.category==='waste'     ?'selected':''}>Waste</option>
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Unit</label>
        <select id="prU">
          <option value="kg"  ${pr.unit==='kg'  ?'selected':''}>Kilogram (kg)</option>
          <option value="ton" ${pr.unit==='ton' ?'selected':''}>Ton</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Standard Yield %</label>
        <input type="number" id="prY" value="${pr.yield_pct||0}" min="0" max="100" step="0.1"
               placeholder="e.g. 72 means 72% of input becomes this product">
      </div>
    </div>
    <div class="fg"><label class="lbl">Description</label>
      <input type="text" id="prD" value="${esc(pr.description||'')}" placeholder="Optional description">
    </div>
    <div class="fg"><label class="lbl">Status</label>
      <select id="prAct">
        <option value="1" ${pr.is_active!==false?'selected':''}>Active</option>
        <option value="0" ${pr.is_active===false ?'selected':''}>Inactive</option>
      </select>
    </div>`,
  () => {
    if (!validate([
      { id: 'prN',   label: 'Name',     required: true },
      { id: 'prCat', label: 'Category', required: true }
    ])) return;
    const rec = {
      name: $('#prN').val().trim(), category: $('#prCat').val(),
      unit: $('#prU').val(), yield_pct: parseFloat($('#prY').val()) || 0,
      description: $('#prD').val().trim(), is_active: $('#prAct').val() === '1'
    };
    id ? DB.update('products', id, rec) : DB.insert('products', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Product updated.' : 'Product added.');
    Pages.products(1);
  });
};

// ================================================================
// SHIFTS
// ================================================================
Pages.shifts = function (page = 1) {
  const data = DB.all('shifts');
  const p    = paginate(data, page);

  let rows = '';
  p.rows.forEach(s => {
    // Count batches for this shift
    const batchCount = DB.where('prod_batches', b => b.shift_id === s.id).length;
    rows += `<tr>
      <td>${s.id}</td>
      <td class="fw6">${esc(s.name)}</td>
      <td class="mono">${s.start_time || '—'}</td>
      <td class="mono">${s.end_time   || '—'}</td>
      <td>${esc(s.description || '—')}</td>
      <td>${batchCount > 0 ? `<span class="badge b-info">${batchCount} batches</span>` : '<span class="badge b-neutral">0 batches</span>'}</td>
      <td>${s.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._shiftForm(${s.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('shifts',${s.id},'shifts')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="8" class="tc tmut" style="padding:28px">No shifts defined yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Shifts</h2><p>Define production shift timings</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._shiftForm()"><i class="fa-solid fa-plus"></i> Add Shift</button></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Shift Name</th><th>Start Time</th><th>End Time</th><th>Description</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, 'Pages.shifts')}
    </div>
  `);
};

Pages._shiftForm = function (id) {
  const s = id ? DB.find('shifts', id) : {};
  Modal.open(id ? 'Edit Shift' : 'Add Shift', `
    <div class="fg"><label class="lbl">Shift Name <span class="req">*</span></label>
      <input type="text" id="shN" value="${esc(s.name||'')}" placeholder="e.g. Morning">
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Start Time</label><input type="time" id="shS" value="${s.start_time||''}"></div>
      <div class="fg"><label class="lbl">End Time</label><input type="time" id="shE" value="${s.end_time||''}"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Description</label>
        <input type="text" id="shD" value="${esc(s.description||'')}" placeholder="Optional">
      </div>
      <div class="fg"><label class="lbl">Status</label>
        <select id="shAct">
          <option value="1" ${s.is_active!==false?'selected':''}>Active</option>
          <option value="0" ${s.is_active===false ?'selected':''}>Inactive</option>
        </select>
      </div>
    </div>`,
  () => {
    if (!validate([{ id: 'shN', label: 'Shift Name', required: true }])) return;
    const rec = {
      name: $('#shN').val().trim(), start_time: $('#shS').val(),
      end_time: $('#shE').val(), description: $('#shD').val().trim(),
      is_active: $('#shAct').val() === '1'
    };
    id ? DB.update('shifts', id, rec) : DB.insert('shifts', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Shift updated.' : 'Shift added.');
    Pages.shifts(1);
  }, { small: true });
};

// ================================================================
// BAG TYPES  (needed for sales, defined here alongside other masters)
// ================================================================
Pages['bag-types'] = function (page = 1) {
  const data = DB.all('bag_types');
  const p    = paginate(data, page);

  let rows = '';
  p.rows.forEach(b => {
    rows += `<tr>
      <td>${b.id}</td>
      <td class="fw6">${esc(b.name)}</td>
      <td class="mono">${fmtN(b.wt)} kg</td>
      <td>${esc(b.description || '—')}</td>
      <td>${b.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._bagForm(${b.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('bag_types',${b.id},'bag-types')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="6" class="tc tmut" style="padding:28px">No bag types yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Bag Types</h2><p>Packaging sizes for products</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._bagForm()"><i class="fa-solid fa-plus"></i> Add Bag Type</button></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Name</th><th>Weight (kg)</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, "Pages['bag-types']")}
    </div>
  `);
};

Pages._bagForm = function (id) {
  const b = id ? DB.find('bag_types', id) : {};
  Modal.open(id ? 'Edit Bag Type' : 'Add Bag Type', `
    <div class="fr">
      <div class="fg"><label class="lbl">Bag Name <span class="req">*</span></label>
        <input type="text" id="btN" value="${esc(b.name||'')}" placeholder="e.g. 50 kg Bag">
      </div>
      <div class="fg"><label class="lbl">Weight (kg) <span class="req">*</span></label>
        <input type="number" id="btW" value="${b.wt||''}" min="0.5" step="0.5" placeholder="e.g. 50">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Description</label>
        <input type="text" id="btD" value="${esc(b.description||'')}" placeholder="Optional">
      </div>
      <div class="fg"><label class="lbl">Status</label>
        <select id="btAct">
          <option value="1" ${b.is_active!==false?'selected':''}>Active</option>
          <option value="0" ${b.is_active===false ?'selected':''}>Inactive</option>
        </select>
      </div>
    </div>`,
  () => {
    if (!validate([
      { id: 'btN', label: 'Name',   required: true },
      { id: 'btW', label: 'Weight', required: true, type: 'number', min: 0.5 }
    ])) return;
    const rec = {
      name: $('#btN').val().trim(), wt: parseFloat($('#btW').val()),
      description: $('#btD').val().trim(), is_active: $('#btAct').val() === '1'
    };
    id ? DB.update('bag_types', id, rec) : DB.insert('bag_types', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Bag type updated.' : 'Bag type added.');
    Pages['bag-types'](1);
  }, { small: true });
};

// Expose _productionForm so dashboard quick action can call it
Pages._productionForm; // already defined above
