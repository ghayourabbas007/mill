/* ================================================================
   MILLPRO — sales.js
   Customers | Sale Orders | Customer Payments | Advances | Customer Ledger
   ================================================================ */
'use strict';

// ================================================================
// CUSTOMERS
// ================================================================
Pages.customers = function (page = 1) {
  const q    = ($('#cSrch').val() || '').toLowerCase();
  const tFlt = $('#cTypeFlt').val() || '';
  let data   = DB.all('customers');
  if (q)    data = data.filter(c => c.name.toLowerCase().includes(q) || (c.phone||'').includes(q));
  if (tFlt) data = data.filter(c => c.type === tFlt);
  const p = paginate(data, page);

  let rows = '';
  p.rows.forEach(c => {
    const ledger = DB.where('cust_ledger', r => r.cust_id === c.id);
    const bal    = ledger.length ? ledger[ledger.length - 1].bal : (c.open_bal || 0);
    const advBal = DB.where('advances', a => a.cust_id === c.id && (a.status === 'open' || a.status === 'partial'))
                     .reduce((s, a) => s + (a.balance || 0), 0);
    rows += `<tr>
      <td>${c.id}</td>
      <td class="fw6">${esc(c.name)}</td>
      <td>${sbadge(c.type)}</td>
      <td>${esc(c.phone || '—')}</td>
      <td class="mono">${fmt(c.credit_limit)}</td>
      <td class="mono fw6 ${bal > 0 ? 'td' : bal < 0 ? 'ts' : ''}">${fmt(Math.abs(bal))} ${bal > 0 ? '<small>(due)</small>' : bal < 0 ? '<small>(cr)</small>' : ''}</td>
      <td class="mono ${advBal > 0 ? 'ts' : 'tmut'}">${advBal > 0 ? fmt(advBal) : '—'}</td>
      <td>${c.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="Ledger"
          onclick="navigate('cust-ledger');setTimeout(()=>Pages._showCustLedger(${c.id}),200)">
          <i class="fa-solid fa-book"></i></button>
        <button class="btn btn-accent btn-sm btn-icon" title="Receive Payment"
          onclick="Pages._custPayForm(${c.id})">
          <i class="fa-solid fa-hand-holding-dollar"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._custForm(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('customers',${c.id},'customers')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No customers yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Customers</h2><p>Buyers, dealers and credit accounts</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._custForm()"><i class="fa-solid fa-plus"></i> Add Customer</button>
      </div>
    </div>
    <div class="card">
      <div class="fbar">
        <div class="sbox f1"><i class="fa-solid fa-search"></i>
          <input type="text" id="cSrch" placeholder="Search name, phone..." value="${esc(q)}" oninput="Pages.customers(1)">
        </div>
        <select id="cTypeFlt" style="width:155px" onchange="Pages.customers(1)">
          <option value="">All Types</option>
          <option value="wholesale" ${tFlt==='wholesale'?'selected':''}>Wholesale</option>
          <option value="retail"    ${tFlt==='retail'   ?'selected':''}>Retail</option>
          <option value="dealer"    ${tFlt==='dealer'   ?'selected':''}>Dealer</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Phone</th><th>Credit Limit</th><th>Outstanding</th><th>Advance Bal</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, 'Pages.customers')}
    </div>
  `);
};

Pages._custForm = function (id) {
  const c = id ? DB.find('customers', id) : {};
  Modal.open(id ? 'Edit Customer' : 'Add Customer', `
    <div class="fr">
      <div class="fg"><label class="lbl">Name <span class="req">*</span></label>
        <input type="text" id="cfN" value="${esc(c.name||'')}">
      </div>
      <div class="fg"><label class="lbl">Phone</label>
        <input type="text" id="cfP" value="${esc(c.phone||'')}">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Type <span class="req">*</span></label>
        <select id="cfT">
          <option value="">Select...</option>
          <option value="wholesale" ${c.type==='wholesale'?'selected':''}>Wholesale</option>
          <option value="retail"    ${c.type==='retail'   ?'selected':''}>Retail</option>
          <option value="dealer"    ${c.type==='dealer'   ?'selected':''}>Dealer</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Credit Limit (Rs.)</label>
        <input type="number" id="cfCr" value="${c.credit_limit||0}" min="0">
      </div>
    </div>
    <div class="fg"><label class="lbl">Address</label>
      <textarea id="cfA" rows="2">${esc(c.address||'')}</textarea>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Opening Balance</label>
        <input type="number" id="cfOB" value="${c.open_bal||0}">
      </div>
      <div class="fg"><label class="lbl">Status</label>
        <select id="cfAct">
          <option value="1" ${c.is_active!==false?'selected':''}>Active</option>
          <option value="0" ${c.is_active===false ?'selected':''}>Inactive</option>
        </select>
      </div>
    </div>`,
  () => {
    if (!validate([
      { id: 'cfN', label: 'Name', required: true },
      { id: 'cfT', label: 'Type', required: true }
    ])) return;
    const rec = {
      name: $('#cfN').val().trim(), phone: $('#cfP').val().trim(),
      address: $('#cfA').val().trim(), type: $('#cfT').val(),
      credit_limit: parseFloat($('#cfCr').val()) || 0,
      open_bal: parseFloat($('#cfOB').val()) || 0,
      is_active: $('#cfAct').val() === '1'
    };
    id ? DB.update('customers', id, rec) : DB.insert('customers', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Customer updated.' : 'Customer added.');
    Pages.customers(1);
  });
};

// ================================================================
// SALE ORDERS
// ================================================================
Pages.sales = function (page = 1) {
  const q      = ($('#soSrch').val()    || '').toLowerCase();
  const flt    = $('#soFlt').val()      || '';
  const dfrom  = $('#soFrom').val()     || '';
  const dto    = $('#soTo').val()       || '';

  let data = DB.all('sales').reverse();
  if (flt)   data = data.filter(s => s.pay_type === flt);
  if (q)     data = data.filter(s => gl('customers', s.cust_id, 'name').toLowerCase().includes(q));
  if (dfrom) data = data.filter(s => s.dt >= dfrom);
  if (dto)   data = data.filter(s => s.dt <= dto);

  const p       = paginate(data, page);
  const totAmt  = data.reduce((s, r) => s + (r.total   || 0), 0);
  const totDue  = data.reduce((s, r) => s + (r.balance || 0), 0);
  const totRecv = data.reduce((s, r) => s + (r.paid    || 0), 0);

  let rows = '';
  p.rows.forEach(s => {
    rows += `<tr>
      <td>${s.id}</td>
      <td>${fmtDate(s.dt)}</td>
      <td class="fw6">${gl('customers', s.cust_id, 'name')}</td>
      <td class="mono fw6">${fmt(s.total)}</td>
      <td class="mono">${s.adv_applied > 0 ? fmt(s.adv_applied) : '—'}</td>
      <td class="mono ts">${fmt(s.paid)}</td>
      <td class="mono ${s.balance > 0 ? 'td fw6' : ''}">${fmt(s.balance)}</td>
      <td>${sbadge(s.pay_type)}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="View" onclick="Pages._viewSale(${s.id})"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('sales',${s.id},'sales')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No sales yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Sale Orders</h2><p>Sales and delivery records</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._saleForm()"><i class="fa-solid fa-plus"></i> New Sale</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Total Billed</div><div class="sb-val">${fmt(totAmt)}</div><div class="sb-sub">${data.length} orders</div></div></div>
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Total Received</div><div class="sb-val">${fmt(totRecv)}</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <div class="sb"><div class="sb-lbl">Total Pending</div><div class="sb-val">${fmt(totDue)}</div><div class="sb-sub">${data.filter(s=>s.balance>0).length} unpaid</div></div></div>
      <div class="stat-card"><div class="si blue"><i class="fa-solid fa-piggy-bank"></i></div>
        <div class="sb"><div class="sb-lbl">Advance Applied</div><div class="sb-val">${fmt(data.reduce((s,r)=>s+(r.adv_applied||0),0))}</div></div></div>
    </div>

    <div class="card">
      <div class="fbar">
        <div class="sbox f1"><i class="fa-solid fa-search"></i>
          <input type="text" id="soSrch" placeholder="Customer name..." value="${esc(q)}" oninput="Pages.sales(1)">
        </div>
        <input type="date" id="soFrom" value="${dfrom}" style="width:145px" onchange="Pages.sales(1)" title="From date">
        <input type="date" id="soTo"   value="${dto}"   style="width:145px" onchange="Pages.sales(1)" title="To date">
        <select id="soFlt" style="width:175px" onchange="Pages.sales(1)">
          <option value="">All Payment Types</option>
          <option value="cash"             ${flt==='cash'            ?'selected':''}>Cash</option>
          <option value="credit"           ${flt==='credit'          ?'selected':''}>Credit</option>
          <option value="partial"          ${flt==='partial'         ?'selected':''}>Partial</option>
          <option value="advance_adjusted" ${flt==='advance_adjusted'?'selected':''}>Advance Adjusted</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Customer</th><th>Total</th><th>Adv Applied</th><th>Paid</th><th>Balance</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="3" class="tr fw6">Totals:</td>
          <td class="mono fw6">${fmt(totAmt)}</td>
          <td></td>
          <td class="mono fw6 ts">${fmt(totRecv)}</td>
          <td class="mono fw6 td">${fmt(totDue)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, 'Pages.sales')}
    </div>
  `);
};

// ── New Sale Order Form ──────────────────────────────────────────
Pages._saleForm = function () {
  const prods = DB.all('products').filter(p => p.is_active);
  const bags  = DB.all('bag_types').filter(b => b.is_active);
  if (!prods.length) { Toast.warning('No Products', 'Please add output products first.'); return; }
  if (!bags.length)  { Toast.warning('No Bag Types', 'Please add bag types first.'); return; }

  Modal.open('New Sale Order', `
    <div class="fr">
      <div class="fg"><label class="lbl">Customer <span class="req">*</span></label>
        <select id="sfCust" onchange="Pages._sfLoadAdvance()">
          ${selOpts('customers','id','name','',c=>c.is_active)}
        </select>
      </div>
      <div class="fg"><label class="lbl">Sale Date <span class="req">*</span></label>
        <input type="date" id="sfDt" value="${today()}">
      </div>
    </div>

    <div id="sfAdvBox" style="display:none">
      <div class="info-box">
        <i class="fa-solid fa-piggy-bank" style="color:var(--info)"></i>
        Advance available: <strong id="sfAdvAvail">Rs. 0</strong>
        <div class="fg mt8" style="margin-bottom:0">
          <label class="lbl">Apply Advance Amount</label>
          <input type="number" id="sfAdvApply" value="0" min="0" oninput="Pages._sfCalc()">
        </div>
      </div>
    </div>

    <hr class="divider">
    <div class="flex ac" style="justify-content:space-between;margin-bottom:10px">
      <div class="fw6" style="font-size:13px"><i class="fa-solid fa-list" style="color:var(--accent)"></i> Sale Line Items</div>
      <button class="add-row-btn" onclick="Pages._sfAddRow()"><i class="fa-solid fa-plus"></i> Add Row</button>
    </div>
    <table class="lit">
      <thead><tr>
        <th style="min-width:145px">Product</th>
        <th style="min-width:115px">Bag Type</th>
        <th>No. Bags</th>
        <th>Wt/Bag (kg)</th>
        <th>Total kg</th>
        <th>Rate/kg</th>
        <th>Line Total</th>
        <th style="width:28px"></th>
      </tr></thead>
      <tbody id="sfRows"></tbody>
    </table>

    <hr class="divider">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
      <div><label class="lbl">Sub Total</label>
        <input type="number" id="sfTotal" readonly style="background:var(--bg);font-weight:600">
      </div>
      <div><label class="lbl">Advance Applied</label>
        <input type="number" id="sfAdvApp" readonly style="background:var(--bg)">
      </div>
      <div><label class="lbl">Amount Paid Now</label>
        <input type="number" id="sfPaid" value="0" min="0" oninput="Pages._sfCalc()">
      </div>
      <div><label class="lbl">Balance Due</label>
        <input type="number" id="sfBal" readonly style="background:var(--bg);color:var(--danger);font-weight:600">
      </div>
    </div>

    <div class="fr">
      <div class="fg"><label class="lbl">Payment Type <span class="req">*</span></label>
        <select id="sfPayT" onchange="Pages._sfCalc()">
          <option value="cash">Cash (Full)</option>
          <option value="credit">Credit (Zero paid)</option>
          <option value="partial">Partial</option>
          <option value="advance_adjusted">Advance Adjusted</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Notes</label>
        <textarea id="sfNotes" rows="1" placeholder="Optional"></textarea>
      </div>
    </div>`,
  () => {
    if (!validate([
      { id: 'sfCust', label: 'Customer', required: true },
      { id: 'sfDt',   label: 'Date',     required: true }
    ])) return;

    const cid       = parseInt($('#sfCust').val());
    const total     = parseFloat($('#sfTotal').val())    || 0;
    const advApply  = parseFloat($('#sfAdvApply').val()) || 0;
    const paid      = parseFloat($('#sfPaid').val())     || 0;
    const balance   = Math.max(0, total - advApply - paid);

    if (total <= 0) { Toast.warning('Empty Order', 'Please add at least one line item with qty and rate.'); return; }

    // Collect line items
    const lineItems = [];
    let hasItems = false;
    $('#sfRows tr').each(function () {
      const pid    = parseInt($(this).find('.sfProd').val());
      const bid    = parseInt($(this).find('.sfBag').val());
      const bags   = parseFloat($(this).find('.sfBags').val())  || 0;
      const wtBag  = parseFloat($(this).find('.sfWtBag').val()) || 0;
      const totKg  = parseFloat($(this).find('.sfTotKg').val()) || 0;
      const rate   = parseFloat($(this).find('.sfRate').val())  || 0;
      const lt     = parseFloat($(this).find('.sfLt').val())    || 0;
      if (pid && bags > 0 && totKg > 0) { lineItems.push({ pid, bid, bags, wtBag, totKg, rate, lt }); hasItems = true; }
    });
    if (!hasItems) { Toast.warning('Empty Order', 'Please add at least one valid line item.'); return; }

    // Save sale
    const sale = DB.insert('sales', {
      cust_id: cid, dt: $('#sfDt').val(),
      total, adv_applied: advApply, paid, balance,
      pay_type: $('#sfPayT').val(), notes: $('#sfNotes').val().trim(),
      status: 'delivered'
    });

    // Save line items + inventory out
    lineItems.forEach(item => {
      DB.insert('sale_items', {
        sale_id: sale.id, prod_id: item.pid, bag_id: item.bid,
        bags: item.bags, wt_bag: item.wtBag, tot_kg: item.totKg,
        rate: item.rate, line_total: item.lt
      });
      DB.insert('inventory', {
        item_id: null, prod_id: item.pid, qty: -item.totKg,
        etype: 'sale_out', ref: `sale:${sale.id}`, ts: new Date().toISOString()
      });
    });

    // Customer ledger — sale debit
    const cl1 = DB.where('cust_ledger', r => r.cust_id === cid);
    const prevBal = cl1.length ? cl1[cl1.length - 1].bal : (DB.find('customers', cid)?.open_bal || 0);
    DB.insert('cust_ledger', {
      cust_id: cid, dt: sale.dt, desc: `Sale Invoice SO#${sale.id}`,
      etype: 'sale', dr: total, cr: 0, bal: prevBal + total,
      ref: `sale:${sale.id}`
    });

    // Apply advance
    if (advApply > 0) {
      const cl2 = DB.where('cust_ledger', r => r.cust_id === cid);
      const b2  = cl2[cl2.length - 1].bal;
      DB.insert('cust_ledger', {
        cust_id: cid, dt: sale.dt, desc: `Advance applied SO#${sale.id}`,
        etype: 'advance_adjusted', dr: 0, cr: advApply, bal: b2 - advApply,
        ref: `sale:${sale.id}`
      });
      // Deduct from open advances (oldest first)
      let rem = advApply;
      DB.where('advances', a => a.cust_id === cid && (a.status === 'open' || a.status === 'partial'))
        .sort((a, b) => a.id - b.id)
        .forEach(adv => {
          if (rem <= 0) return;
          const use    = Math.min(rem, adv.balance);
          const newBal = adv.balance - use;
          DB.insert('adv_adj', { adv_id: adv.id, sale_id: sale.id, amount: use, at: new Date().toISOString() });
          DB.update('advances', adv.id, {
            used: (adv.used || 0) + use, balance: newBal,
            status: newBal <= 0 ? 'fully_used' : 'partial'
          });
          rem -= use;
        });
    }

    // Cash received now
    if (paid > 0) {
      const cl3 = DB.where('cust_ledger', r => r.cust_id === cid);
      const b3  = cl3[cl3.length - 1].bal;
      const cp  = DB.insert('cust_pays', {
        cust_id: cid, sale_id: sale.id, dt: sale.dt, amount: paid,
        pay_type: 'against_sale', method_id: 1, bank_id: null, ref_no: '', notes: ''
      });
      DB.insert('cust_ledger', {
        cust_id: cid, dt: sale.dt, desc: `Cash received SO#${sale.id}`,
        etype: 'payment', dr: 0, cr: paid, bal: b3 - paid,
        ref: `cust_pay:${cp.id}`
      });
      const cb = getCash();
      DB.insert('cash_reg', {
        dt: sale.dt, desc: `Sale receipt: ${gl('customers', cid, 'name')} (SO#${sale.id})`,
        type: 'in', amount: paid, ref_type: 'sale', ref_id: sale.id, bal_after: cb + paid
      });
    }

    Modal.close();
    Toast.success('Saved', `Sale order SO#${sale.id} created.`);
    Pages.sales(1);
    $('#tbCash').text(fmtN(getCash()));
  }, { large: true });

  // Add first row
  setTimeout(() => Pages._sfAddRow(), 80);
};

// Add sale line item row
Pages._sfAddRow = function () {
  const prods = DB.all('products').filter(p => p.is_active);
  const bags  = DB.all('bag_types').filter(b => b.is_active);
  if (!prods.length || !bags.length) return;

  const prodOpts = prods.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const bagOpts  = bags.map(b  => `<option value="${b.id}" data-wt="${b.wt}">${esc(b.name)}</option>`).join('');
  const firstWt  = bags[0].wt;

  $('#sfRows').append(`<tr>
    <td><select class="sfProd">${prodOpts}</select></td>
    <td><select class="sfBag" onchange="Pages._sfBagChange(this)">${bagOpts}</select></td>
    <td><input type="number" class="sfBags"  value="1"         min="1"   step="1"   oninput="Pages._sfRowCalc(this)"></td>
    <td><input type="number" class="sfWtBag" value="${firstWt}" min="0"  step="0.5" oninput="Pages._sfRowCalc(this)"></td>
    <td><input type="number" class="sfTotKg" readonly style="background:var(--bg);width:70px"></td>
    <td><input type="number" class="sfRate"  value="0"         min="0"   step="1"   oninput="Pages._sfRowCalc(this)"></td>
    <td><input type="number" class="sfLt"    readonly style="background:var(--bg);width:90px;font-weight:600"></td>
    <td><button class="rm-line" onclick="$(this).closest('tr').remove();Pages._sfCalc()"><i class="fa-solid fa-xmark"></i></button></td>
  </tr>`);
  Pages._sfCalc();
};

// When bag type changes, auto-fill weight per bag
Pages._sfBagChange = function (el) {
  const row = $(el).closest('tr');
  const wt  = parseFloat($(el).find(':selected').data('wt')) || 0;
  row.find('.sfWtBag').val(wt);
  Pages._sfRowCalc(row.find('.sfBags')[0]);
};

// Recalculate one row
Pages._sfRowCalc = function (el) {
  const row   = $(el).closest('tr');
  const bags  = parseFloat(row.find('.sfBags').val())  || 0;
  const wtBag = parseFloat(row.find('.sfWtBag').val()) || 0;
  const rate  = parseFloat(row.find('.sfRate').val())  || 0;
  const totKg = bags * wtBag;
  row.find('.sfTotKg').val(totKg.toFixed(2));
  row.find('.sfLt').val((totKg * rate).toFixed(2));
  Pages._sfCalc();
};

// Recalculate all totals
Pages._sfCalc = function () {
  let total = 0;
  $('#sfRows .sfLt').each(function () { total += parseFloat($(this).val()) || 0; });
  $('#sfTotal').val(total.toFixed(2));

  const adv  = parseFloat($('#sfAdvApply').val()) || 0;
  const paid = parseFloat($('#sfPaid').val())     || 0;
  $('#sfAdvApp').val(adv.toFixed(2));
  $('#sfBal').val(Math.max(0, total - adv - paid).toFixed(2));

  const pt = $('#sfPayT').val();
  if (pt === 'cash') {
    $('#sfPaid').val(Math.max(0, total - adv).toFixed(2));
    $('#sfBal').val('0.00');
  } else if (pt === 'credit') {
    $('#sfPaid').val('0');
    $('#sfBal').val(Math.max(0, total - adv).toFixed(2));
  }
};

// Load advance for selected customer
Pages._sfLoadAdvance = function () {
  const cid  = parseInt($('#sfCust').val());
  const advs = DB.where('advances', a => a.cust_id === cid && (a.status === 'open' || a.status === 'partial'));
  const tot  = advs.reduce((s, a) => s + (a.balance || 0), 0);
  if (tot > 0) {
    $('#sfAdvBox').show();
    $('#sfAdvAvail').text(fmt(tot));
    $('#sfAdvApply').attr('max', tot.toFixed(2));
  } else {
    $('#sfAdvBox').hide();
    $('#sfAdvApply').val(0);
  }
};

// View sale detail
Pages._viewSale = function (id) {
  const s = DB.find('sales', id); if (!s) return;
  const items = DB.where('sale_items', i => i.sale_id === id);
  const itemRows = items.map(i => `<tr>
    <td>${gl('products',  i.prod_id, 'name')}</td>
    <td>${gl('bag_types', i.bag_id,  'name')}</td>
    <td class="mono">${i.bags}</td>
    <td class="mono">${i.wt_bag} kg</td>
    <td class="mono">${fmtN(i.tot_kg)} kg</td>
    <td class="mono">${fmtN(i.rate)}</td>
    <td class="mono fw6">${fmt(i.line_total)}</td>
  </tr>`).join('');

  Modal.open(`Sale Order #${id}`, `
    <div class="fr" style="margin-bottom:14px">
      <div><strong>Customer:</strong><br>${gl('customers', s.cust_id, 'name')}</div>
      <div><strong>Date:</strong><br>${fmtDate(s.dt)}</div>
      <div><strong>Payment Type:</strong><br>${sbadge(s.pay_type)}</div>
      <div><strong>Status:</strong><br>${sbadge(s.status)}</div>
    </div>
    <table class="dt" style="margin-bottom:14px">
      <thead><tr><th>Product</th><th>Bag</th><th>Bags</th><th>Wt/Bag</th><th>Total kg</th><th>Rate/kg</th><th>Total</th></tr></thead>
      <tbody>
        ${itemRows || '<tr><td colspan="7" class="tc tmut">No items.</td></tr>'}
        <tr style="border-top:2px solid var(--border)">
          <td colspan="6" class="tr fw6">Grand Total</td>
          <td class="mono fw6">${fmt(s.total)}</td>
        </tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
      <div style="background:var(--bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">TOTAL</div>
        <div class="mono fw6">${fmt(s.total)}</div>
      </div>
      <div style="background:var(--info-bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">ADV APPLIED</div>
        <div class="mono fw6">${fmt(s.adv_applied)}</div>
      </div>
      <div style="background:var(--success-bg);padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">PAID</div>
        <div class="mono fw6 ts">${fmt(s.paid)}</div>
      </div>
      <div style="background:${s.balance>0?'var(--danger-bg)':'var(--success-bg)'};padding:12px;border-radius:var(--r)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">BALANCE</div>
        <div class="mono fw6 ${s.balance > 0 ? 'td' : 'ts'}">${fmt(s.balance)}</div>
      </div>
    </div>
    ${s.notes ? `<div class="mt12"><strong>Notes:</strong> ${esc(s.notes)}</div>` : ''}`,
  false, { large: true });
};

// ================================================================
// CUSTOMER PAYMENTS
// ================================================================
Pages['cust-payments'] = function (page = 1) {
  const cFlt = parseInt($('#cpCFlt').val()) || 0;
  const tFlt = $('#cpTypeFlt').val() || '';
  let data   = DB.all('cust_pays').reverse();
  if (cFlt) data = data.filter(p => p.cust_id === cFlt);
  if (tFlt) data = data.filter(p => p.pay_type === tFlt);
  const p     = paginate(data, page);
  const total = p.rows.reduce((s, r) => s + (r.amount || 0), 0);

  let rows = '';
  p.rows.forEach(cp => {
    rows += `<tr>
      <td>${cp.id}</td>
      <td>${fmtDate(cp.dt)}</td>
      <td class="fw6">${gl('customers', cp.cust_id, 'name')}</td>
      <td>${cp.sale_id ? 'SO#' + cp.sale_id : '—'}</td>
      <td>${sbadge(cp.pay_type)}</td>
      <td class="mono fw6 ts">${fmt(cp.amount)}</td>
      <td>${gl('pay_methods', cp.method_id, 'name')}</td>
      <td>${esc(cp.ref_no || '—')}</td>
      <td><div class="tac">
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('cust_pays',${cp.id},'cust-payments')">
          <i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No customer payments yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Customer Payments</h2><p>Payments received from customers</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._custPayForm()"><i class="fa-solid fa-plus"></i> Receive Payment</button>
      </div>
    </div>
    <div class="card">
      <div class="fbar">
        <select id="cpCFlt" style="width:215px" onchange="Pages['cust-payments'](1)">
          <option value="">All Customers</option>
          ${DB.all('customers').map(c => `<option value="${c.id}" ${cFlt===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
        <select id="cpTypeFlt" style="width:175px" onchange="Pages['cust-payments'](1)">
          <option value="">All Types</option>
          <option value="against_sale"     ${tFlt==='against_sale'    ?'selected':''}>Against Sale</option>
          <option value="advance"          ${tFlt==='advance'         ?'selected':''}>Advance</option>
          <option value="general"          ${tFlt==='general'         ?'selected':''}>General</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Customer</th><th>Sale Order</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">Total Received:</td><td class="mono fw6">${fmt(total)}</td><td colspan="3"></td></tr></tfoot>
      </table></div>
      ${pagerHtml(p, "Pages['cust-payments']")}
    </div>
  `);
};

Pages._custPayForm = function (preCustId) {
  Modal.open('Receive Customer Payment', `
    <div class="fr">
      <div class="fg"><label class="lbl">Customer <span class="req">*</span></label>
        <select id="cpCust" onchange="Pages._cpLoadOpenSales()">
          ${selOpts('customers', 'id', 'name', preCustId, c => c.is_active)}
        </select>
      </div>
      <div class="fg"><label class="lbl">Date <span class="req">*</span></label>
        <input type="date" id="cpDt" value="${today()}">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Payment Type <span class="req">*</span></label>
        <select id="cpType">
          <option value="against_sale">Against Sale</option>
          <option value="advance">Advance (Booking)</option>
          <option value="general">General</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Against Sale Order</label>
        <select id="cpSO">
          <option value="">— Not applicable —</option>
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Amount <span class="req">*</span></label>
        <input type="number" id="cpAmt" min="1" placeholder="0.00">
      </div>
      <div class="fg"><label class="lbl">Payment Method <span class="req">*</span></label>
        <select id="cpMeth">${selOpts('pay_methods','id','name',1)}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Bank Account</label>
        <select id="cpBank">
          <option value="">N/A (Cash)</option>
          ${DB.all('banks').map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="lbl">Reference / Cheque No.</label>
        <input type="text" id="cpRef" placeholder="Optional">
      </div>
    </div>
    <div class="fg"><label class="lbl">Booking Note</label>
      <input type="text" id="cpNote" placeholder="e.g. Flour booking for next week (optional)">
    </div>`,
  () => {
    if (!validate([
      { id: 'cpCust', label: 'Customer', required: true },
      { id: 'cpDt',   label: 'Date',     required: true },
      { id: 'cpAmt',  label: 'Amount',   required: true, type: 'number', min: 1 }
    ])) return;

    const cid    = parseInt($('#cpCust').val());
    const amt    = parseFloat($('#cpAmt').val());
    const type   = $('#cpType').val();
    const soId   = $('#cpSO').val() ? parseInt($('#cpSO').val()) : null;
    const methId = parseInt($('#cpMeth').val());
    const bankId = $('#cpBank').val() ? parseInt($('#cpBank').val()) : null;

    const rec = DB.insert('cust_pays', {
      cust_id: cid, sale_id: soId, dt: $('#cpDt').val(), amount: amt,
      pay_type: type, method_id: methId, bank_id: bankId,
      ref_no: $('#cpRef').val().trim(), notes: $('#cpNote').val().trim()
    });

    // Update SO balance
    if (soId && type === 'against_sale') {
      const so = DB.find('sales', soId);
      if (so) DB.update('sales', soId, {
        paid: (so.paid || 0) + amt,
        balance: Math.max(0, (so.balance || 0) - amt)
      });
    }

    // Customer ledger
    const cl      = DB.where('cust_ledger', r => r.cust_id === cid);
    const prevBal = cl.length ? cl[cl.length - 1].bal : (DB.find('customers', cid)?.open_bal || 0);
    DB.insert('cust_ledger', {
      cust_id: cid, dt: $('#cpDt').val(),
      desc: type === 'advance'
        ? `Advance received — ${$('#cpNote').val().trim() || 'Booking'}`
        : type === 'against_sale'
          ? `Payment against SO#${soId}`
          : `General payment`,
      etype: type, dr: 0, cr: amt, bal: prevBal - amt,
      ref: `cust_pay:${rec.id}`
    });

    // If advance, create advance record
    if (type === 'advance') {
      DB.insert('advances', {
        cust_id: cid, pay_id: rec.id, dt: $('#cpDt').val(),
        total: amt, used: 0, balance: amt,
        note: $('#cpNote').val().trim(), status: 'open'
      });
    }

    // Cash register
    const meth = DB.find('pay_methods', methId);
    if (meth && meth.type === 'cash') {
      const cb = getCash();
      DB.insert('cash_reg', {
        dt: $('#cpDt').val(), desc: `Customer payment: ${gl('customers', cid, 'name')}`,
        type: 'in', amount: amt, ref_type: 'cust_pay', ref_id: rec.id, bal_after: cb + amt
      });
    }
    // Bank balance
    if (bankId) {
      const ba = DB.find('banks', bankId);
      if (ba) DB.update('banks', bankId, { curr_bal: (ba.curr_bal || ba.open_bal || 0) + amt });
    }

    Modal.close();
    Toast.success('Saved', 'Payment recorded successfully.');
    Pages['cust-payments'](1);
    $('#tbCash').text(fmtN(getCash()));
  });

  if (preCustId) setTimeout(Pages._cpLoadOpenSales, 120);
};

// Load open sale orders for payment form
Pages._cpLoadOpenSales = function () {
  const cid  = parseInt($('#cpCust').val());
  const sos  = DB.where('sales', s => s.cust_id === cid && s.balance > 0);
  $('#cpSO').html(
    '<option value="">— Not applicable —</option>' +
    sos.map(s => `<option value="${s.id}">SO#${s.id} — ${fmtDate(s.dt)} — Due: ${fmt(s.balance)}</option>`).join('')
  );
};

// ================================================================
// CUSTOMER ADVANCES
// ================================================================
Pages.advances = function (page = 1) {
  const cFlt = parseInt($('#advCFlt').val()) || 0;
  const sFlt = $('#advSFlt').val() || '';
  let data   = DB.all('advances').reverse();
  if (cFlt) data = data.filter(a => a.cust_id === cFlt);
  if (sFlt) data = data.filter(a => a.status  === sFlt);
  const p      = paginate(data, page);
  const totBal = data.filter(a => a.status === 'open' || a.status === 'partial').reduce((s, a) => s + (a.balance || 0), 0);

  let rows = '';
  p.rows.forEach(a => {
    const adjs = DB.where('adv_adj', r => r.adv_id === a.id);
    rows += `<tr>
      <td>${a.id}</td>
      <td>${fmtDate(a.dt)}</td>
      <td class="fw6">${gl('customers', a.cust_id, 'name')}</td>
      <td class="mono">${fmt(a.total)}</td>
      <td class="mono tmut">${fmt(a.used)}</td>
      <td class="mono fw6 ${a.balance > 0 ? 'ts' : 'tmut'}">${fmt(a.balance)}</td>
      <td style="max-width:150px;font-size:12px">${esc(a.note || '—')}</td>
      <td>${sbadge(a.status)}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" title="Adjustments" onclick="Pages._viewAdvHistory(${a.id})">
          <i class="fa-solid fa-timeline"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No advances recorded yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Customer Advances</h2><p>Advance payments and booking amounts</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._custPayForm()"><i class="fa-solid fa-plus"></i> Record Advance</button>
      </div>
    </div>
    <div class="card">
      <div class="fbar">
        <select id="advCFlt" style="width:215px" onchange="Pages.advances(1)">
          <option value="">All Customers</option>
          ${DB.all('customers').map(c => `<option value="${c.id}" ${cFlt===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
        <select id="advSFlt" style="width:155px" onchange="Pages.advances(1)">
          <option value="">All Status</option>
          <option value="open"       ${sFlt==='open'      ?'selected':''}>Open</option>
          <option value="partial"    ${sFlt==='partial'   ?'selected':''}>Partial</option>
          <option value="fully_used" ${sFlt==='fully_used'?'selected':''}>Fully Used</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Customer</th><th>Total</th><th>Used</th><th>Balance</th><th>Note</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="5">Total Available Balance:</td>
          <td class="mono fw6 ts">${fmt(totBal)}</td>
          <td colspan="3"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, 'Pages.advances')}
    </div>
  `);
};

// View advance adjustment history
Pages._viewAdvHistory = function (id) {
  const a = DB.find('advances', id); if (!a) return;
  const adjs = DB.where('adv_adj', r => r.adv_id === id);

  Modal.open(`Advance #${id} — Adjustment History`, `
    <div class="fr" style="margin-bottom:14px">
      <div><strong>Customer:</strong><br>${gl('customers', a.cust_id, 'name')}</div>
      <div><strong>Date:</strong><br>${fmtDate(a.dt)}</div>
      <div><strong>Total:</strong><br><span class="mono">${fmt(a.total)}</span></div>
      <div><strong>Remaining:</strong><br><span class="mono ts">${fmt(a.balance)}</span></div>
    </div>
    <div class="fw6 mb8" style="font-size:13px">Adjustment History</div>
    <ul class="hist-list">
      <li class="hist-item">
        <div class="hdot g"></div>
        <div class="hm"><strong>Advance Received</strong><span>${fmtDate(a.dt)}</span></div>
        <div class="hamt ts">+${fmt(a.total)}</div>
      </li>
      ${adjs.map(adj => `<li class="hist-item">
        <div class="hdot a"></div>
        <div class="hm"><strong>Applied to SO#${adj.sale_id}</strong><span>${fmtDate(adj.at)}</span></div>
        <div class="hamt td">−${fmt(adj.amount)}</div>
      </li>`).join('')}
      ${adjs.length === 0 ? `<li class="hist-item">
        <div class="hdot b"></div>
        <div class="hm"><strong>No adjustments yet</strong><span>Advance is open and available</span></div>
      </li>` : ''}
    </ul>
    <div style="background:var(--bg);border-radius:var(--r);padding:12px;margin-top:12px;text-align:center">
      <span style="font-size:11px;color:var(--text3)">CURRENT BALANCE</span><br>
      <span class="mono fw6 ts" style="font-size:18px">${fmt(a.balance)}</span>
    </div>`,
  false, { small: true });
};

// ================================================================
// CUSTOMER LEDGER
// ================================================================
Pages['cust-ledger'] = function () {
  const selId = $('#clSel').val() || '';
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Customer Ledger</h2><p>Complete account statement per customer</p></div></div>
    <div class="card" style="margin-bottom:16px">
      <div class="fg" style="margin-bottom:0">
        <label class="lbl">Select Customer</label>
        <select id="clSel" onchange="Pages._showCustLedger(this.value)">
          <option value="">— Choose Customer —</option>
          ${DB.all('customers').map(c => `<option value="${c.id}" ${selId==c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="clBody">
      <div class="card">
        <div class="empty">
          <i class="fa-solid fa-book"></i>
          <h4>Select a customer</h4>
          <p>Choose from the dropdown above to view their ledger.</p>
        </div>
      </div>
    </div>
  `);
  if (selId) Pages._showCustLedger(selId);
};

Pages._showCustLedger = function (cid) {
  cid = parseInt(cid); if (!cid) return;
  if ($('#clSel').length) $('#clSel').val(cid);

  const c       = DB.find('customers', cid); if (!c) return;
  const entries = DB.where('cust_ledger', r => r.cust_id === cid).sort((a, b) => a.id - b.id);
  const lastBal = entries.length ? entries[entries.length - 1].bal : (c.open_bal || 0);
  const advBal  = DB.where('advances', a => a.cust_id === cid && (a.status === 'open' || a.status === 'partial'))
                    .reduce((s, a) => s + (a.balance || 0), 0);

  const balLabel = lastBal > 0 ? 'Receivable' : lastBal < 0 ? 'Advance Held' : 'Settled';
  const balClass = lastBal > 0 ? 'recv' : '';

  const target = $('#clBody').length ? '#clBody' : '#pageArea';

  $(target).html(`
    <div class="bdc">
      <div class="ledger-hdr">
        <h3>${esc(c.name)} — Account Statement</h3>
        <div class="led-bal ${balClass}">${fmt(Math.abs(lastBal))} ${balLabel}</div>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit (Sale)</th><th>Credit (Payment)</th><th>Running Balance</th></tr></thead>
        <tbody>
          <tr style="background:var(--bg2)">
            <td>${fmtDate(c._c)}</td>
            <td>Opening Balance</td>
            <td><span class="badge b-neutral">Opening</span></td>
            <td>—</td>
            <td>—</td>
            <td class="mono fw6">${fmt(c.open_bal || 0)}</td>
          </tr>
          ${entries.map(e => `<tr>
            <td>${fmtDate(e.dt)}</td>
            <td>${esc(e.desc)}</td>
            <td>${sbadge(e.etype)}</td>
            <td class="mono td">${e.dr > 0 ? fmt(e.dr) : '—'}</td>
            <td class="mono ts">${e.cr > 0 ? fmt(e.cr) : '—'}</td>
            <td class="mono fw6 ${e.bal > 0 ? 'td' : e.bal < 0 ? 'ts' : ''}">${fmt(Math.abs(e.bal))} ${e.bal < 0 ? '<small>(cr)</small>' : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    ${advBal > 0 ? `
    <div class="info-box mt12">
      <i class="fa-solid fa-piggy-bank" style="color:var(--info)"></i>
      Available advance balance: <strong class="mono ts">${fmt(advBal)}</strong>
      — will be auto-applied on next sale.
    </div>` : ''}

    <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:12px">
      <button class="btn btn-accent" onclick="Pages._custPayForm(${cid})">
        <i class="fa-solid fa-hand-holding-dollar"></i> Receive Payment
      </button>
      <button class="btn btn-primary" onclick="Pages._saleForm()">
        <i class="fa-solid fa-file-invoice-dollar"></i> New Sale
      </button>
    </div>
  `);
};