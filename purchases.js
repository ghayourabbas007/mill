/* ================================================================
   MILLPRO — purchases.js
   Vendors | Purchase Orders | Vendor Payments | Vendor Ledger
   ================================================================ */
'use strict';

// ================================================================
// VENDORS
// ================================================================
Pages.vendors = function (page = 1) {
  const q = ($('#vSrch').val() || '').toLowerCase();
  let data = DB.all('vendors');
  if (q) data = data.filter(v => v.name.toLowerCase().includes(q) || (v.phone || '').includes(q));
  const p = paginate(data, page);

  let rows = '';
  p.rows.forEach(v => {
    const ledger = DB.where('vendor_ledger', r => r.vendor_id === v.id);
    const due = ledger.length ? ledger[ledger.length - 1].bal : (v.open_bal || 0);
    rows += `<tr>
      <td>${v.id}</td>
      <td class="fw6">${esc(v.name)}</td>
      <td>${esc(v.contact || '—')}</td>
      <td>${esc(v.phone || '—')}</td>
      <td class="mono">${fmt(v.credit_limit)}</td>
      <td class="mono fw6 ${due > 0 ? 'td' : ''}">${fmt(due)}</td>
      <td>${v.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="Ledger" onclick="Pages._showVendorLedger(${v.id});navigate('vendor-ledger')"><i class="fa-solid fa-book-open"></i></button>
        <button class="btn btn-accent btn-sm btn-icon" title="Pay" onclick="Pages._vendorPayForm(${v.id})"><i class="fa-solid fa-money-bill-transfer"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._vendorForm(${v.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('vendors',${v.id},'vendors')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="8" class="tc tmut" style="padding:28px">No vendors yet. <a href="#" onclick="Pages._vendorForm()">Add one</a>.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Vendors</h2><p>Wheat and grain suppliers</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._vendorForm()"><i class="fa-solid fa-plus"></i> Add Vendor</button></div>
    </div>
    <div class="card">
      <div class="fbar">
        <div class="sbox f1"><i class="fa-solid fa-search"></i><input type="text" id="vSrch" placeholder="Search name, phone, contact..." value="${esc(q)}" oninput="Pages.vendors(1)"></div>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Name</th><th>Contact Person</th><th>Phone</th><th>Credit Limit</th><th>Current Due</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, 'Pages.vendors')}
    </div>
  `);
};

Pages._vendorForm = function (id) {
  const v = id ? DB.find('vendors', id) : {};
  Modal.open(id ? 'Edit Vendor' : 'Add Vendor', `
    <div class="fr">
      <div class="fg"><label class="lbl">Vendor Name <span class="req">*</span></label><input type="text" id="vfN" value="${esc(v.name||'')}"></div>
      <div class="fg"><label class="lbl">Contact Person</label><input type="text" id="vfC" value="${esc(v.contact||'')}"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Phone</label><input type="text" id="vfP" value="${esc(v.phone||'')}"></div>
      <div class="fg"><label class="lbl">Credit Limit (Rs.)</label><input type="number" id="vfCr" value="${v.credit_limit||0}" min="0"></div>
    </div>
    <div class="fg"><label class="lbl">Address</label><textarea id="vfA" rows="2">${esc(v.address||'')}</textarea></div>
    <div class="fr">
      <div class="fg"><label class="lbl">Opening Balance (Payable)</label><input type="number" id="vfOB" value="${v.open_bal||0}"></div>
      <div class="fg"><label class="lbl">Status</label><select id="vfAct">
        <option value="1" ${v.is_active!==false?'selected':''}>Active</option>
        <option value="0" ${v.is_active===false?'selected':''}>Inactive</option>
      </select></div>
    </div>`,
  () => {
    if (!validate([{ id: 'vfN', label: 'Name', required: true }])) return;
    const rec = {
      name: $('#vfN').val().trim(), contact: $('#vfC').val().trim(),
      phone: $('#vfP').val().trim(), address: $('#vfA').val().trim(),
      credit_limit: parseFloat($('#vfCr').val()) || 0,
      open_bal: parseFloat($('#vfOB').val()) || 0,
      is_active: $('#vfAct').val() === '1'
    };
    id ? DB.update('vendors', id, rec) : DB.insert('vendors', rec);
    Modal.close(); Toast.success('Saved', id ? 'Vendor updated.' : 'Vendor added.');
    Pages.vendors(1);
  });
};

// ================================================================
// PURCHASES
// ================================================================
Pages.purchases = function (page = 1) {
  const flt = $('#poFlt').val() || '';
  const q   = ($('#poSrch').val() || '').toLowerCase();
  let data  = DB.all('purchases').reverse();
  if (flt) data = data.filter(p => p.pay_type === flt || p.status === flt);
  if (q)   data = data.filter(p => gl('vendors', p.vendor_id, 'name').toLowerCase().includes(q) || (p.vehicle||'').toLowerCase().includes(q));
  const p   = paginate(data, page);
  const totAmt = data.reduce((s, r) => s + (r.total   || 0), 0);
  const totDue = data.reduce((s, r) => s + (r.balance || 0), 0);

  let rows = '';
  p.rows.forEach(po => {
    rows += `<tr>
      <td>${po.id}</td>
      <td>${fmtDate(po.dt)}</td>
      <td class="fw6">${gl('vendors', po.vendor_id, 'name')}</td>
      <td>${gl('items', po.item_id, 'name')}</td>
      <td class="mono">${fmtN(po.wt_kg)}</td>
      <td class="mono">${fmtN(po.rate)}</td>
      <td class="mono fw6">${fmt(po.total)}</td>
      <td class="mono ts">${fmt(po.paid)}</td>
      <td class="mono ${po.balance > 0 ? 'td fw6' : ''}">${fmt(po.balance)}</td>
      <td>${sbadge(po.pay_type)}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Pages._viewPO(${po.id})"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="Pages._purchaseForm(${po.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('purchases',${po.id},'purchases')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="11" class="tc tmut" style="padding:28px">No purchases yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Purchase Orders</h2><p>Daily wheat and grain procurement</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._purchaseForm()"><i class="fa-solid fa-plus"></i> New Purchase</button></div>
    </div>
    <div class="card">
      <div class="fbar">
        <div class="sbox f1"><i class="fa-solid fa-search"></i><input type="text" id="poSrch" placeholder="Vendor name, vehicle no..." value="${esc(q)}" oninput="Pages.purchases(1)"></div>
        <select id="poFlt" style="width:160px" onchange="Pages.purchases(1)">
          <option value="">All Status</option>
          <option value="cash"    ${flt==='cash'   ?'selected':''}>Cash</option>
          <option value="credit"  ${flt==='credit' ?'selected':''}>Credit</option>
          <option value="partial" ${flt==='partial'?'selected':''}>Partial</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Vendor</th><th>Item</th><th>Weight (kg)</th><th>Rate/kg</th><th>Total</th><th>Paid</th><th>Balance</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="6" class="tr fw6">Totals:</td>
          <td class="mono fw6">${fmt(totAmt)}</td>
          <td></td>
          <td class="mono fw6 td">${fmt(totDue)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, 'Pages.purchases')}
    </div>
  `);
};

Pages._purchaseForm = function (id) {
  const po = id ? DB.find('purchases', id) : {};
  Modal.open(id ? 'Edit Purchase Order' : 'New Purchase Order', `
    <div class="fr">
      <div class="fg"><label class="lbl">Vendor <span class="req">*</span></label><select id="pfV">${selOpts('vendors','id','name',po.vendor_id,v=>v.is_active)}</select></div>
      <div class="fg"><label class="lbl">Input Item <span class="req">*</span></label><select id="pfI">${selOpts('items','id','name',po.item_id,i=>i.is_active)}</select></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Purchase Date <span class="req">*</span></label><input type="date" id="pfDt" value="${po.dt||today()}"></div>
      <div class="fg"><label class="lbl">Vehicle No.</label><input type="text" id="pfVeh" value="${esc(po.vehicle||'')}"></div>
    </div>
    <div class="fr3">
      <div class="fg"><label class="lbl">Weight (kg) <span class="req">*</span></label><input type="number" id="pfWt" value="${po.wt_kg||''}" min="1" oninput="Pages._pfCalc()"></div>
      <div class="fg"><label class="lbl">Rate / kg <span class="req">*</span></label><input type="number" id="pfRate" value="${po.rate||''}" min="0" step="0.01" oninput="Pages._pfCalc()"></div>
      <div class="fg"><label class="lbl">Total Amount</label><input type="number" id="pfTotal" value="${po.total||0}" readonly style="background:var(--bg)"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Payment Type <span class="req">*</span></label><select id="pfPayT" onchange="Pages._pfCalc()">
        <option value="cash"    ${(po.pay_type||'cash')==='cash'   ?'selected':''}>Cash (Full)</option>
        <option value="credit"  ${po.pay_type==='credit'           ?'selected':''}>Credit (Zero Paid)</option>
        <option value="partial" ${po.pay_type==='partial'          ?'selected':''}>Partial</option>
      </select></div>
      <div class="fg"><label class="lbl">Amount Paid</label><input type="number" id="pfPaid" value="${po.paid||0}" min="0" oninput="Pages._pfCalc()"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Balance Due</label><input type="number" id="pfBal" value="${po.balance||0}" readonly style="background:var(--bg)"></div>
      <div class="fg"><label class="lbl">Status</label><select id="pfStat">
        <option value="received"  ${(po.status||'received')==='received' ?'selected':''}>Received</option>
        <option value="pending"   ${po.status==='pending'                ?'selected':''}>Pending</option>
        <option value="cancelled" ${po.status==='cancelled'              ?'selected':''}>Cancelled</option>
      </select></div>
    </div>
    <div class="fg"><label class="lbl">Notes</label><textarea id="pfNotes" rows="2">${esc(po.notes||'')}</textarea></div>`,
  () => {
    if (!validate([
      { id: 'pfV',    label: 'Vendor',  required: true },
      { id: 'pfI',    label: 'Item',    required: true },
      { id: 'pfDt',   label: 'Date',    required: true },
      { id: 'pfWt',   label: 'Weight',  required: true, type: 'number', min: 1 },
      { id: 'pfRate', label: 'Rate',    required: true, type: 'number', min: 0 }
    ])) return;

    const total = parseFloat($('#pfTotal').val()) || 0;
    const paid  = parseFloat($('#pfPaid').val())  || 0;
    const vid   = parseInt($('#pfV').val());
    const iid   = parseInt($('#pfI').val());
    const rec = {
      vendor_id: vid, item_id: iid, dt: $('#pfDt').val(),
      wt_kg: parseFloat($('#pfWt').val()), rate: parseFloat($('#pfRate').val()),
      total, pay_type: $('#pfPayT').val(), paid,
      balance: Math.max(0, total - paid),
      vehicle: $('#pfVeh').val().trim(), notes: $('#pfNotes').val().trim(),
      status: $('#pfStat').val()
    };

    let saved;
    if (id) {
      saved = DB.update('purchases', id, rec);
      Toast.success('Updated', 'Purchase order updated.');
    } else {
      saved = DB.insert('purchases', rec);
      // Inventory entry
      DB.insert('inventory', { item_id: iid, prod_id: null, qty: rec.wt_kg, etype: 'purchase_in', ref: `purchase:${saved.id}`, ts: new Date().toISOString() });
      // Vendor ledger – credit (amount owed TO vendor)
      const vl      = DB.where('vendor_ledger', r => r.vendor_id === vid);
      const prevBal  = vl.length ? vl[vl.length - 1].bal : (DB.find('vendors', vid)?.open_bal || 0);
      DB.insert('vendor_ledger', { vendor_id: vid, dt: rec.dt, desc: `Purchase PO#${saved.id}: ${fmtN(rec.wt_kg)} kg @ Rs.${fmtN(rec.rate)}/kg`, etype: 'purchase', dr: 0, cr: total, bal: prevBal + total, ref: `purchase:${saved.id}` });
      // Payment against purchase
      if (paid > 0) {
        const vl2 = DB.where('vendor_ledger', r => r.vendor_id === vid);
        DB.insert('vendor_ledger', { vendor_id: vid, dt: rec.dt, desc: `Payment PO#${saved.id}`, etype: 'payment', dr: paid, cr: 0, bal: vl2[vl2.length - 1].bal - paid, ref: `purchase:${saved.id}` });
        DB.insert('vendor_pays',   { vendor_id: vid, po_id: saved.id, dt: rec.dt, amount: paid, method_id: 1, bank_id: null, ref_no: '', notes: '' });
        // Cash out (only if not credit)
        if (rec.pay_type !== 'credit') {
          const cb = getCash();
          DB.insert('cash_reg', { dt: rec.dt, desc: `Vendor payment (PO#${saved.id})`, type: 'out', amount: paid, ref_type: 'purchase', ref_id: saved.id, bal_after: cb - paid });
        }
      }
      Toast.success('Created', 'Purchase order recorded.');
    }
    Modal.close();
    Pages.purchases(1);
  }, { large: true });
};

// Auto-calculate totals in purchase form
Pages._pfCalc = function () {
  const w = parseFloat($('#pfWt').val())   || 0;
  const r = parseFloat($('#pfRate').val()) || 0;
  const total = w * r;
  $('#pfTotal').val(total.toFixed(2));
  const pt = $('#pfPayT').val();
  if (pt === 'cash')   $('#pfPaid').val(total.toFixed(2));
  else if (pt === 'credit') $('#pfPaid').val('0');
  const paid = parseFloat($('#pfPaid').val()) || 0;
  $('#pfBal').val(Math.max(0, total - paid).toFixed(2));
};
window.pfCalc = Pages._pfCalc; // accessible from oninput HTML

Pages._viewPO = function (id) {
  const po = DB.find('purchases', id); if (!po) return;
  Modal.open(`Purchase Order #${id}`, `
    <div class="fr" style="margin-bottom:14px">
      <div><strong>Vendor:</strong><br>${gl('vendors', po.vendor_id, 'name')}</div>
      <div><strong>Date:</strong><br>${fmtDate(po.dt)}</div>
      <div><strong>Item:</strong><br>${gl('items', po.item_id, 'name')}</div>
      <div><strong>Vehicle:</strong><br>${esc(po.vehicle||'—')}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center">
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">WEIGHT</div><div class="mono fw6">${fmtN(po.wt_kg)} kg</div></div>
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">RATE / KG</div><div class="mono fw6">${fmtN(po.rate)}</div></div>
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TOTAL</div><div class="mono fw6">${fmt(po.total)}</div></div>
      <div style="background:var(--success-bg);padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PAID</div><div class="mono fw6 ts">${fmt(po.paid)}</div></div>
      <div style="background:${po.balance>0?'var(--danger-bg)':'var(--success-bg)'};padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">BALANCE</div><div class="mono fw6 ${po.balance>0?'td':'ts'}">${fmt(po.balance)}</div></div>
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TYPE</div><div>${sbadge(po.pay_type)}</div></div>
    </div>
    ${po.notes ? `<div class="mt12"><strong>Notes:</strong> ${esc(po.notes)}</div>` : ''}`,
  false);
};

// ================================================================
// VENDOR PAYMENTS
// ================================================================
Pages['vendor-payments'] = function (page = 1) {
  const vFlt = parseInt($('#vpVFlt').val()) || 0;
  let data   = DB.all('vendor_pays').reverse();
  if (vFlt) data = data.filter(p => p.vendor_id === vFlt);
  const p    = paginate(data, page);
  const total = p.rows.reduce((s, r) => s + (r.amount || 0), 0);

  let rows = '';
  p.rows.forEach(vp => {
    rows += `<tr>
      <td>${vp.id}</td>
      <td>${fmtDate(vp.dt)}</td>
      <td class="fw6">${gl('vendors', vp.vendor_id, 'name')}</td>
      <td>${vp.po_id ? 'PO#' + vp.po_id : 'General'}</td>
      <td class="mono fw6 td">${fmt(vp.amount)}</td>
      <td>${gl('pay_methods', vp.method_id, 'name')}</td>
      <td>${esc(vp.ref_no || '—')}</td>
      <td>${esc(vp.notes || '—')}</td>
      <td><div class="tac"><button class="btn btn-danger btn-sm btn-icon" onclick="delRec('vendor_pays',${vp.id},'vendor-payments')"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No vendor payments yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Vendor Payments</h2><p>Payments made to suppliers</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._vendorPayForm()"><i class="fa-solid fa-plus"></i> Record Payment</button></div>
    </div>
    <div class="card">
      <div class="fbar">
        <select id="vpVFlt" style="width:220px" onchange="Pages['vendor-payments'](1)">
          <option value="">All Vendors</option>
          ${DB.all('vendors').map(v => `<option value="${v.id}" ${vFlt===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Vendor</th><th>Against PO</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="4">Total Paid:</td><td class="mono fw6">${fmt(total)}</td><td colspan="4"></td></tr></tfoot>
      </table></div>
      ${pagerHtml(p, "Pages['vendor-payments']")}
    </div>
  `);
};

Pages._vendorPayForm = function (preVendorId) {
  const pendingPOs = DB.all('purchases').filter(p => p.balance > 0);

  Modal.open('Record Vendor Payment', `
    <div class="fr">
      <div class="fg"><label class="lbl">Vendor <span class="req">*</span></label>
        <select id="vpVend" onchange="Pages._vpLoadPOs()">
          ${selOpts('vendors', 'id', 'name', preVendorId)}
        </select>
      </div>
      <div class="fg"><label class="lbl">Payment Date <span class="req">*</span></label><input type="date" id="vpDt" value="${today()}"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Against Purchase Order</label>
        <select id="vpPO">
          <option value="">General Payment</option>
          ${pendingPOs.map(po => `<option value="${po.id}">PO#${po.id} — ${gl('vendors',po.vendor_id,'name')} — Due: ${fmt(po.balance)}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="lbl">Amount <span class="req">*</span></label><input type="number" id="vpAmt" min="1" placeholder="0.00"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Payment Method <span class="req">*</span></label><select id="vpMeth">${selOpts('pay_methods','id','name',1)}</select></div>
      <div class="fg"><label class="lbl">Bank Account</label>
        <select id="vpBank">
          <option value="">N/A (Cash)</option>
          ${DB.all('banks').map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Cheque / Reference No.</label><input type="text" id="vpRef" placeholder="Optional"></div>
      <div class="fg"><label class="lbl">Notes</label><input type="text" id="vpNotes" placeholder="Optional"></div>
    </div>`,
  () => {
    if (!validate([
      { id: 'vpVend', label: 'Vendor', required: true },
      { id: 'vpDt',   label: 'Date',   required: true },
      { id: 'vpAmt',  label: 'Amount', required: true, type: 'number', min: 1 }
    ])) return;

    const vid    = parseInt($('#vpVend').val());
    const amt    = parseFloat($('#vpAmt').val());
    const poId   = $('#vpPO').val() ? parseInt($('#vpPO').val()) : null;
    const methId = parseInt($('#vpMeth').val());

    const rec = DB.insert('vendor_pays', {
      vendor_id: vid, po_id: poId, dt: $('#vpDt').val(), amount: amt,
      method_id: methId, bank_id: $('#vpBank').val() ? parseInt($('#vpBank').val()) : null,
      ref_no: $('#vpRef').val().trim(), notes: $('#vpNotes').val().trim()
    });

    // Update PO balance
    if (poId) {
      const po = DB.find('purchases', poId);
      if (po) DB.update('purchases', poId, { paid: (po.paid || 0) + amt, balance: Math.max(0, (po.balance || 0) - amt) });
    }

    // Vendor ledger — debit (reducing what we owe)
    const vl       = DB.where('vendor_ledger', r => r.vendor_id === vid);
    const prevBal  = vl.length ? vl[vl.length - 1].bal : 0;
    DB.insert('vendor_ledger', {
      vendor_id: vid, dt: $('#vpDt').val(),
      desc: `Payment — Ref: ${$('#vpRef').val() || 'N/A'}`,
      etype: 'payment', dr: amt, cr: 0, bal: Math.max(0, prevBal - amt),
      ref: `vendor_pay:${rec.id}`
    });

    // Cash register — only if cash payment
    const meth = DB.find('pay_methods', methId);
    if (meth && meth.type === 'cash') {
      const cb = getCash();
      DB.insert('cash_reg', { dt: $('#vpDt').val(), desc: `Vendor payment: ${gl('vendors', vid, 'name')}`, type: 'out', amount: amt, ref_type: 'vendor_pay', ref_id: rec.id, bal_after: cb - amt });
    }
    // Bank balance deduction
    const bankId = $('#vpBank').val() ? parseInt($('#vpBank').val()) : null;
    if (bankId) {
      const ba = DB.find('banks', bankId);
      if (ba) DB.update('banks', bankId, { curr_bal: (ba.curr_bal || ba.open_bal || 0) - amt });
    }

    Modal.close();
    Toast.success('Saved', 'Payment recorded.');
    Pages['vendor-payments'](1);
    $('#tbCash').text(fmtN(getCash()));
  });

  if (preVendorId) setTimeout(Pages._vpLoadPOs, 120);
};

// Reload POs when vendor changes in payment form
Pages._vpLoadPOs = function () {
  const vid  = parseInt($('#vpVend').val());
  const pos  = DB.where('purchases', p => p.vendor_id === vid && p.balance > 0);
  $('#vpPO').html('<option value="">General Payment</option>' +
    pos.map(po => `<option value="${po.id}">PO#${po.id} — ${fmtDate(po.dt)} — Due: ${fmt(po.balance)}</option>`).join(''));
};

// ================================================================
// VENDOR LEDGER
// ================================================================
Pages['vendor-ledger'] = function () {
  const selId = $('#vlSel').val() || '';
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Vendor Ledger</h2><p>Complete account statement per vendor</p></div></div>
    <div class="card" style="margin-bottom:16px">
      <div class="fg" style="margin-bottom:0">
        <label class="lbl">Select Vendor</label>
        <select id="vlSel" onchange="Pages._showVendorLedger(this.value)">
          <option value="">— Choose Vendor —</option>
          ${DB.all('vendors').map(v => `<option value="${v.id}" ${selId==v.id?'selected':''}>${esc(v.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="vlBody">
      <div class="card"><div class="empty"><i class="fa-solid fa-book-open"></i><h4>Select a vendor</h4><p>Choose from the dropdown above.</p></div></div>
    </div>
  `);
  if (selId) Pages._showVendorLedger(selId);
};

Pages._showVendorLedger = function (vid) {
  vid = parseInt(vid); if (!vid) return;
  // Update select if navigated here directly
  if ($('#vlSel').length) $('#vlSel').val(vid);

  const v = DB.find('vendors', vid); if (!v) return;
  const entries  = DB.where('vendor_ledger', r => r.vendor_id === vid).sort((a, b) => a.id - b.id);
  const lastBal  = entries.length ? entries[entries.length - 1].bal : (v.open_bal || 0);
  const balClass = lastBal > 0 ? 'payable' : '';
  const balLabel = lastBal > 0 ? 'Payable' : 'Settled';

  const target = $('#vlBody').length ? '#vlBody' : '#pageArea';

  $(target).html(`
    <div class="bdc">
      <div class="ledger-hdr">
        <h3>${esc(v.name)} — Account Statement</h3>
        <div class="led-bal ${balClass}">${fmt(Math.abs(lastBal))} ${balLabel}</div>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit (We Paid)</th><th>Credit (We Owe)</th><th>Running Balance</th></tr></thead>
        <tbody>
          <tr style="background:var(--bg2)">
            <td>${fmtDate(v._c)}</td><td>Opening Balance</td><td><span class="badge b-neutral">Opening</span></td>
            <td>—</td><td>—</td><td class="mono fw6">${fmt(v.open_bal || 0)}</td>
          </tr>
          ${entries.map(e => `<tr>
            <td>${fmtDate(e.dt)}</td>
            <td>${esc(e.desc)}</td>
            <td>${sbadge(e.etype)}</td>
            <td class="mono ts">${e.dr > 0 ? fmt(e.dr) : '—'}</td>
            <td class="mono td">${e.cr > 0 ? fmt(e.cr) : '—'}</td>
            <td class="mono fw6 ${e.bal > 0 ? 'td' : ''}">${fmt(e.bal)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:12px">
      <button class="btn btn-accent" onclick="Pages._vendorPayForm(${vid})">
        <i class="fa-solid fa-money-bill-transfer"></i> Record Payment
      </button>
      <button class="btn btn-primary" onclick="Pages._purchaseForm()">
        <i class="fa-solid fa-plus"></i> New Purchase
      </button>
    </div>
  `);
};
