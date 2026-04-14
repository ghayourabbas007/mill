/* ================================================================
   MILLPRO — core.js
   DB Engine | Utils | Toast | Modal | Confirm | Validation
   Seed Data | Router | Dashboard
   ================================================================ */
'use strict';

// ================================================================
// DATABASE ENGINE  (localStorage, prefix: mp_)
// ================================================================
const DB = {
  NS: 'mp_',
  _g(k) { try { return JSON.parse(localStorage.getItem(this.NS + k) || '[]'); } catch { return []; } },
  _s(k, v) { localStorage.setItem(this.NS + k, JSON.stringify(v)); },
  all(k)       { return this._g(k); },
  find(k, id)  { return this._g(k).find(r => r.id === parseInt(id)) || null; },
  where(k, fn) { return this._g(k).filter(fn); },
  nextId(k)    { const d = this._g(k); return d.length ? Math.max(...d.map(r => r.id || 0)) + 1 : 1; },
  insert(k, rec) {
    const d = this._g(k);
    rec.id = this.nextId(k);
    rec._c = new Date().toISOString();
    d.push(rec);
    this._s(k, d);
    return rec;
  },
  update(k, id, data) {
    const d = this._g(k);
    const i = d.findIndex(r => r.id === parseInt(id));
    if (i > -1) { d[i] = { ...d[i], ...data, _u: new Date().toISOString() }; this._s(k, d); return d[i]; }
    return null;
  },
  delete(k, id)   { this._s(k, this._g(k).filter(r => r.id !== parseInt(id))); },
  getSetting(key) { const r = this.where('settings', s => s.k === key); return r.length ? r[0].v : ''; },
  setSetting(key, val) {
    const r = this.where('settings', s => s.k === key);
    if (r.length) this.update('settings', r[0].id, { v: val });
    else this.insert('settings', { k: key, v: val });
  }
};

// ================================================================
// UTILITY HELPERS
// ================================================================
const fmt   = n => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtN  = n => parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const esc   = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function getCash() {
  const e = DB.all('cash_reg');
  return e.length ? (e[e.length - 1].bal_after || 0) : parseFloat(DB.getSetting('open_cash') || 0);
}

function gl(table, id, field) {
  if (!id) return '—';
  const r = DB.find(table, parseInt(id));
  return r ? esc(r[field] || r.name || '—') : '—';
}

function selOpts(table, valF, lblF, selId, filter) {
  let rows = DB.all(table);
  if (filter) rows = rows.filter(filter);
  return '<option value="">— Select —</option>' +
    rows.map(r => `<option value="${r[valF]}" ${parseInt(r[valF]) === parseInt(selId) ? 'selected' : ''}>${esc(r[lblF])}</option>`).join('');
}

function paginate(data, page, pp = 15) {
  const total = data.length, pages = Math.max(1, Math.ceil(total / pp)), start = (page - 1) * pp;
  return { rows: data.slice(start, start + pp), total, pages, page, start, pp };
}

function pagerHtml(p, cb) {
  if (p.total <= p.pp) return '';
  let b = `<button class="pb" ${p.page===1?'disabled':''} onclick="${cb}(${p.page-1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = Math.max(1, p.page - 2); i <= Math.min(p.pages, p.page + 2); i++)
    b += `<button class="pb ${i===p.page?'act':''}" onclick="${cb}(${i})">${i}</button>`;
  b += `<button class="pb" ${p.page===p.pages?'disabled':''} onclick="${cb}(${p.page+1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  return `<div class="pager"><div class="pager-info">Showing ${p.start+1}–${Math.min(p.start+p.rows.length,p.total)} of ${p.total}</div><div class="pager-btns">${b}</div></div>`;
}

function sbadge(s) {
  const m = {
    received:'b-success',completed:'b-success',delivered:'b-success',paid:'b-success',cleared:'b-success',active:'b-success',open:'b-info',confirmed:'b-info',
    pending:'b-warning',in_progress:'b-warning',partial:'b-warning',draft:'b-neutral',
    cancelled:'b-danger',bounced:'b-danger',unpaid:'b-danger',fully_used:'b-neutral',refunded:'b-neutral',
    credit:'b-warning',cash:'b-success',advance_adjusted:'b-info',against_sale:'b-success',advance:'b-info',general:'b-neutral',
    retail:'b-info',wholesale:'b-success',dealer:'b-warning',operational:'b-success',admin:'b-info',
    main:'b-success',byproduct:'b-info',waste:'b-warning'
  };
  return `<span class="badge ${m[s] || 'b-neutral'}">${(s||'').replace(/_/g,' ')}</span>`;
}

// ================================================================
// TOAST
// ================================================================
const Toast = {
  show(type, title, msg = '', dur = 3500) {
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
    const id = 't' + Date.now();
    $('#toastWrap').prepend(`
      <div class="toast ${type}" id="${id}">
        <i class="fa-solid ${icons[type]||icons.info} toast-icon"></i>
        <div class="toast-body">
          <div class="toast-title">${esc(title)}</div>
          ${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ''}
        </div>
        <button class="toast-x" onclick="Toast.dismiss('${id}')"><i class="fa-solid fa-xmark"></i></button>
      </div>`);
    setTimeout(() => Toast.dismiss(id), dur);
  },
  dismiss(id) { const el = $('#' + id); el.addClass('hiding'); setTimeout(() => el.remove(), 250); },
  success(t, m) { this.show('success', t, m); },
  error(t, m)   { this.show('error', t, m); },
  warning(t, m) { this.show('warning', t, m); },
  info(t, m)    { this.show('info', t, m); }
};

// ================================================================
// MODAL
// ================================================================
const Modal = {
  _cb: null,
  open(title, body, cb, opts = {}) {
    $('#modalTitle').text(title);
    $('#modalBody').html(body);
    $('#modalBox').removeClass('lg sm').toggleClass('lg', !!opts.large).toggleClass('sm', !!opts.small);
    cb === false ? $('#modalSaveBtn').hide() : $('#modalSaveBtn').show().text(opts.saveText || 'Save');
    this._cb = cb;
    $('#modalOverlay').addClass('on');
    setTimeout(() => $('#modalBody input,#modalBody select,#modalBody textarea').first().focus(), 120);
  },
  close() { $('#modalOverlay').removeClass('on'); this._cb = null; },
  save()  { if (this._cb) this._cb(); }
};

// ================================================================
// CONFIRM DIALOG
// ================================================================
const Confirm = {
  _cb: null,
  show(msg, cb) {
    $('#confirmMsg').text(msg || 'Delete this record?');
    this._cb = cb;
    $('#confirmOverlay').addClass('on');
  },
  ok()     { if (this._cb) this._cb(); $('#confirmOverlay').removeClass('on'); },
  cancel() { $('#confirmOverlay').removeClass('on'); }
};

// ================================================================
// VALIDATION
// ================================================================
function validate(fields) {
  let ok = true;
  fields.forEach(({ id, label, required, min, type }) => {
    const el = $('#' + id);
    el.removeClass('inv');
    el.next('.inv-msg').remove();
    const val = (el.val() || '').trim();
    if (required && !val) {
      el.addClass('inv'); el.after(`<div class="inv-msg">${label} is required.</div>`); ok = false;
    } else if (type === 'number' && val && isNaN(parseFloat(val))) {
      el.addClass('inv'); el.after(`<div class="inv-msg">${label} must be a number.</div>`); ok = false;
    } else if (min !== undefined && parseFloat(val) < min) {
      el.addClass('inv'); el.after(`<div class="inv-msg">${label} must be ≥ ${min}.</div>`); ok = false;
    }
  });
  return ok;
}

// Reusable delete helper
function delRec(table, id, refreshPage) {
  Confirm.show('Delete this record? This cannot be undone.', () => {
    DB.delete(table, id);
    Toast.success('Deleted', 'Record removed.');
    if (refreshPage) navigate(refreshPage);
  });
}

// ================================================================
// SEED DEMO DATA
// ================================================================
function seedIfEmpty() {
  if (DB.all('seeded').length) return;

  // Payment Methods
  [['Cash','cash'],['Bank Transfer','bank'],['Cheque','cheque']].forEach(([n,t]) =>
    DB.insert('pay_methods', { name: n, type: t, is_active: true }));

  // Expense Categories
  [['Labour','operational'],['Electricity','operational'],['Fuel','operational'],
   ['Repair','operational'],['Transport','operational'],['Miscellaneous','admin']]
    .forEach(([n,t]) => DB.insert('exp_cats', { name: n, type: t, is_active: true }));

  // Shifts
  [['Morning','06:00','14:00'],['Afternoon','14:00','22:00'],['Night','22:00','06:00']]
    .forEach(([n,s,e]) => DB.insert('shifts', { name: n, start_time: s, end_time: e, is_active: true }));

  // Input Items
  DB.insert('items', { name: 'Wheat', unit: 'kg', description: 'Raw wheat grain', is_active: true });
  DB.insert('items', { name: 'Corn',  unit: 'kg', description: 'Raw corn grain',  is_active: true });

  // Output Products
  DB.insert('products', { name: 'Flour (Maida)',   category: 'main',      unit: 'kg', yield_pct: 72, is_active: true });
  DB.insert('products', { name: 'Soji (Semolina)', category: 'main',      unit: 'kg', yield_pct: 10, is_active: true });
  DB.insert('products', { name: 'Bran (Chokar)',   category: 'byproduct', unit: 'kg', yield_pct: 15, is_active: true });
  DB.insert('products', { name: 'Fine Bran',       category: 'byproduct', unit: 'kg', yield_pct:  3, is_active: true });

  // Bag Types
  DB.insert('bag_types', { name: '50 kg Bag', wt: 50, is_active: true });
  DB.insert('bag_types', { name: '25 kg Bag', wt: 25, is_active: true });
  DB.insert('bag_types', { name: '10 kg Bag', wt: 10, is_active: true });

  // Bank Account
  DB.insert('banks', { title: 'Main Operations Account', bank: 'HBL', acc_no: '0001234567890', branch: 'Main Branch', open_bal: 500000, curr_bal: 500000, is_active: true });

  // Vendors
  DB.insert('vendors', { name: 'Al-Barkat Wheat Traders', contact: 'M. Iqbal',     phone: '03001234567', address: 'Grain Market, Lahore',       open_bal: 0,     credit_limit: 500000, is_active: true });
  DB.insert('vendors', { name: 'Green Valley Farms',      contact: 'T. Mehmood',   phone: '03217654321', address: 'Bypass Road, Faisalabad',     open_bal: 50000, credit_limit: 300000, is_active: true });

  // Customers
  DB.insert('customers', { name: 'City Flour Depot',    phone: '03331112233', address: 'Main Bazar, Lahore',   type: 'wholesale', open_bal: 0,     credit_limit: 200000, is_active: true });
  DB.insert('customers', { name: 'Raza Bakery',         phone: '03451234567', address: 'Model Town, Lahore',  type: 'retail',    open_bal: 25000, credit_limit: 50000,  is_active: true });
  DB.insert('customers', { name: 'Punjab Atta Center',  phone: '03001119988', address: 'Anarkali, Lahore',    type: 'dealer',    open_bal: 0,     credit_limit: 100000, is_active: true });

  // Settings
  [['mill_name','Al-Rehman Flour Mill'],['mill_address','Industrial Area, Lahore'],
   ['open_cash','150000'],['tax_no','NTN-1234567'],['fy_start','2024-07-01']]
    .forEach(([k, v]) => DB.insert('settings', { k, v }));

  // ── Opening Cash ────────────────────────────────────────────────
  DB.insert('cash_reg', { dt: today(), desc: 'Opening Cash Balance', type: 'in', amount: 150000, ref_type: 'opening', ref_id: null, bal_after: 150000 });

  // ── Sample Purchase ─────────────────────────────────────────────
  const po1 = DB.insert('purchases', {
    vendor_id: 1, item_id: 1, dt: today(), wt_kg: 1000, rate: 65,
    total: 65000, pay_type: 'partial', paid: 40000, balance: 25000,
    vehicle: 'LHR-1234', notes: 'Sample purchase', status: 'received'
  });
  DB.insert('vendor_ledger', { vendor_id: 1, dt: today(), desc: `Purchase PO#${po1.id}: 1000 kg @ Rs.65`, etype: 'purchase', dr: 0, cr: 65000, bal: 65000, ref: `purchase:${po1.id}` });
  DB.insert('vendor_pays',   { vendor_id: 1, po_id: po1.id, dt: today(), amount: 40000, method_id: 1, bank_id: null, ref_no: '', notes: 'Partial payment' });
  DB.insert('vendor_ledger', { vendor_id: 1, dt: today(), desc: `Payment against PO#${po1.id}`, etype: 'payment', dr: 40000, cr: 0, bal: 25000, ref: 'vendor_pay:1' });
  DB.insert('inventory',     { item_id: 1, prod_id: null, qty: 1000, etype: 'purchase_in', ref: `purchase:${po1.id}`, ts: new Date().toISOString() });
  const cb0 = getCash();
  DB.insert('cash_reg', { dt: today(), desc: `Vendor payment (PO#${po1.id})`, type: 'out', amount: 40000, ref_type: 'purchase', ref_id: po1.id, bal_after: cb0 - 40000 });

  // ── Sample Production Batch ─────────────────────────────────────
  const bat = DB.insert('prod_batches', { dt: today(), shift_id: 1, item_id: 1, input_kg: 500, notes: 'Morning batch', status: 'completed' });
  [[1,360,0],[2,50,0],[3,75,5],[4,15,0]].forEach(([pid, qty, waste]) => {
    DB.insert('prod_outs',  { batch_id: bat.id, prod_id: pid, out_kg: qty, waste_kg: waste, notes: '' });
    DB.insert('inventory',  { item_id: null, prod_id: pid, qty: qty, etype: 'prod_out', ref: `batch:${bat.id}`, ts: new Date().toISOString() });
  });
  DB.insert('inventory', { item_id: 1, prod_id: null, qty: -500, etype: 'prod_consumed', ref: `batch:${bat.id}`, ts: new Date().toISOString() });

  // ── Customer Advance ────────────────────────────────────────────
  const advPay = DB.insert('cust_pays', { cust_id: 2, sale_id: null, dt: today(), amount: 20000, pay_type: 'advance', method_id: 1, bank_id: null, ref_no: '', notes: 'Booking' });
  DB.insert('advances', { cust_id: 2, pay_id: advPay.id, dt: today(), total: 20000, used: 0, balance: 20000, note: 'Flour booking', status: 'open' });
  DB.insert('cust_ledger', { cust_id: 2, dt: today(), desc: 'Advance received', etype: 'advance', dr: 0, cr: 20000, bal: -20000, ref: `cust_pay:${advPay.id}` });
  const cb1 = getCash();
  DB.insert('cash_reg', { dt: today(), desc: 'Advance: Raza Bakery', type: 'in', amount: 20000, ref_type: 'cust_pay', ref_id: advPay.id, bal_after: cb1 + 20000 });

  // ── Sample Sale ─────────────────────────────────────────────────
  const sale = DB.insert('sales', { cust_id: 1, dt: today(), total: 36000, adv_applied: 0, paid: 36000, balance: 0, pay_type: 'cash', notes: '', status: 'delivered' });
  DB.insert('sale_items', { sale_id: sale.id, prod_id: 1, bag_id: 1, bags: 10, wt_bag: 50, tot_kg: 500, rate: 72, line_total: 36000 });
  DB.insert('inventory',  { item_id: null, prod_id: 1, qty: -500, etype: 'sale_out', ref: `sale:${sale.id}`, ts: new Date().toISOString() });
  DB.insert('cust_ledger', { cust_id: 1, dt: today(), desc: `Sale SO#${sale.id}`, etype: 'sale', dr: 36000, cr: 0, bal: 36000, ref: `sale:${sale.id}` });
  const spay = DB.insert('cust_pays', { cust_id: 1, sale_id: sale.id, dt: today(), amount: 36000, pay_type: 'against_sale', method_id: 1, bank_id: null, ref_no: '', notes: '' });
  DB.insert('cust_ledger', { cust_id: 1, dt: today(), desc: `Cash received SO#${sale.id}`, etype: 'payment', dr: 0, cr: 36000, bal: 0, ref: `cust_pay:${spay.id}` });
  const cb2 = getCash();
  DB.insert('cash_reg', { dt: today(), desc: 'Sale receipt: City Flour Depot', type: 'in', amount: 36000, ref_type: 'sale', ref_id: sale.id, bal_after: cb2 + 36000 });

  // ── Sample Expense ───────────────────────────────────────────────
  const exp1 = DB.insert('expenses', { dt: today(), cat_id: 1, amount: 8000, method_id: 1, bank_id: null, desc: 'Daily labour wages', ref_no: '' });
  const cb3 = getCash();
  DB.insert('cash_reg', { dt: today(), desc: 'Expense: Labour wages', type: 'out', amount: 8000, ref_type: 'expense', ref_id: exp1.id, bal_after: cb3 - 8000 });

  DB.insert('seeded', { done: true, at: new Date().toISOString() });
}

// ================================================================
// ROUTER
// ================================================================
const Pages = {}; // Each module registers its pages here
let curPage = 'dashboard';

const PAGE_META = {
  dashboard:       { icon: 'fa-gauge-high',         title: 'Dashboard' },
  vendors:         { icon: 'fa-truck-ramp-box',      title: 'Vendors' },
  purchases:       { icon: 'fa-basket-shopping',     title: 'Purchase Orders' },
  'vendor-payments':{ icon: 'fa-money-bill-transfer', title: 'Vendor Payments' },
  'vendor-ledger': { icon: 'fa-book-open',           title: 'Vendor Ledger' },
  inventory:       { icon: 'fa-warehouse',           title: 'Inventory' },
  items:           { icon: 'fa-wheat-awn',           title: 'Input Items' },
  production:      { icon: 'fa-industry',            title: 'Production Batches' },
  products:        { icon: 'fa-boxes-stacked',       title: 'Products' },
  shifts:          { icon: 'fa-clock-rotate-left',   title: 'Shifts' },
  customers:       { icon: 'fa-users',               title: 'Customers' },
  'bag-types':     { icon: 'fa-bag-shopping',        title: 'Bag Types' },
  sales:           { icon: 'fa-file-invoice-dollar', title: 'Sale Orders' },
  'cust-payments': { icon: 'fa-hand-holding-dollar', title: 'Customer Payments' },
  advances:        { icon: 'fa-piggy-bank',          title: 'Customer Advances' },
  'cust-ledger':   { icon: 'fa-book',                title: 'Customer Ledger' },
  'cash-register': { icon: 'fa-cash-register',       title: 'Cash Register' },
  'bank-accounts': { icon: 'fa-building-columns',    title: 'Bank Accounts' },
  expenses:        { icon: 'fa-receipt',             title: 'Expenses' },
  'fund-transfers':{ icon: 'fa-right-left',          title: 'Fund Transfers' },
  cheques:         { icon: 'fa-money-check-dollar',  title: 'Cheques' },
  'daily-balance': { icon: 'fa-calendar-day',        title: 'Daily Balance' },
  'day-end':       { icon: 'fa-moon',                title: 'Day End Summary' },
  reports:         { icon: 'fa-chart-line',          title: 'Reports' },
  'exp-categories':{ icon: 'fa-tags',                title: 'Expense Categories' },
  'pay-methods':   { icon: 'fa-credit-card',         title: 'Payment Methods' },
  settings:        { icon: 'fa-gear',                title: 'Settings' }
};

function navigate(page) {
  curPage = page;
  $('.nav-item').removeClass('active');
  $(`.nav-item[data-page="${page}"]`).addClass('active');
  const m = PAGE_META[page] || { icon: 'fa-circle', title: page };
  $('#bcTitle').text(m.title);
  $('#bcIcon').attr('class', 'fa-solid ' + m.icon + ' bc-icon');
  $('#pageArea').empty();
  const fn = Pages[page];
  if (fn) fn(1);
  else $('#pageArea').html(`<div class="card"><div class="empty"><i class="fa-solid fa-wrench"></i><h4>Module Not Loaded</h4><p>Script for this page is not included yet.</p></div></div>`);
  $('#tbCash').text(fmtN(getCash()));
  if ($(window).width() < 900) $('.sidebar').removeClass('mob');
}

// ================================================================
// DASHBOARD
// ================================================================
Pages.dashboard = function () {
  const sales     = DB.all('sales');
  const purchases = DB.all('purchases');
  const batches   = DB.all('prod_batches');
  const exps      = DB.all('expenses');
  const cash      = getCash();
  const bankBal   = DB.all('banks').reduce((s, b) => s + (b.curr_bal || b.open_bal || 0), 0);
  const totSale   = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totPurch  = purchases.reduce((s, r) => s + (r.total || 0), 0);
  const totExp    = exps.reduce((s, r) => s + (r.amount || 0), 0);
  const totPay    = DB.all('vendors').reduce((s, v) => {
    const l = DB.where('vendor_ledger', r => r.vendor_id === v.id);
    return s + (l.length ? l[l.length - 1].bal : (v.open_bal || 0));
  }, 0);
  const totRecv   = DB.all('customers').reduce((s, c) => {
    const l = DB.where('cust_ledger', r => r.cust_id === c.id);
    return s + (l.length ? l[l.length - 1].bal : (c.open_bal || 0));
  }, 0);
  const totAdv    = DB.where('advances', a => a.status === 'open' || a.status === 'partial').reduce((s, a) => s + (a.balance || 0), 0);
  const pendPO    = purchases.filter(p => p.balance > 0).length;
  const pendSO    = sales.filter(s => s.balance > 0).length;

  // Chart data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
  }).reverse();
  const pm = {}; DB.all('prod_outs').forEach(o => { const pr = DB.find('products', o.prod_id); const n = pr ? pr.name : 'Other'; pm[n] = (pm[n] || 0) + (o.out_kg || 0); });

  // Inventory snapshot
  const invItems = DB.all('items').filter(i => i.is_active).map(i => {
    const stock = DB.where('inventory', r => r.item_id === i.id).reduce((s, r) => s + (r.qty || 0), 0);
    return { name: i.name, stock };
  });
  const invProds = DB.all('products').filter(p => p.is_active).map(pr => {
    const stock = DB.where('inventory', r => r.prod_id === pr.id).reduce((s, r) => s + (r.qty || 0), 0);
    return { name: pr.name, stock };
  });

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left">
        <h2>${esc(DB.getSetting('mill_name') || 'Flour Mill')}</h2>
        <p>Dashboard — ${fmtDate(today())}</p>
      </div>
      <div class="ph-right">
        <button class="btn btn-ghost btn-sm" onclick="navigate('reports')"><i class="fa-solid fa-chart-line"></i> Reports</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('day-end')"><i class="fa-solid fa-moon"></i> Day End</button>
      </div>
    </div>

    <div class="qa-grid">
      <div class="qa" onclick="navigate('purchases');setTimeout(()=>Pages._purchaseForm&&Pages._purchaseForm(),300)"><i class="fa-solid fa-basket-shopping"></i><span>New Purchase</span></div>
      <div class="qa" onclick="navigate('production');setTimeout(()=>Pages._productionForm&&Pages._productionForm(),300)"><i class="fa-solid fa-industry"></i><span>New Batch</span></div>
      <div class="qa" onclick="navigate('sales');setTimeout(()=>Pages._saleForm&&Pages._saleForm(),300)"><i class="fa-solid fa-file-invoice-dollar"></i><span>New Sale</span></div>
      <div class="qa" onclick="navigate('expenses');setTimeout(()=>Pages._expenseForm&&Pages._expenseForm(),300)"><i class="fa-solid fa-receipt"></i><span>Add Expense</span></div>
      <div class="qa" onclick="navigate('cust-payments');setTimeout(()=>Pages._custPayForm&&Pages._custPayForm(),300)"><i class="fa-solid fa-hand-holding-dollar"></i><span>Receive Payment</span></div>
      <div class="qa" onclick="navigate('vendor-payments');setTimeout(()=>Pages._vendorPayForm&&Pages._vendorPayForm(),300)"><i class="fa-solid fa-money-bill-transfer"></i><span>Pay Vendor</span></div>
      <div class="qa" onclick="navigate('fund-transfers');setTimeout(()=>Pages._transferForm&&Pages._transferForm(),300)"><i class="fa-solid fa-right-left"></i><span>Fund Transfer</span></div>
      <div class="qa" onclick="navigate('inventory')"><i class="fa-solid fa-warehouse"></i><span>View Stock</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-hand-holding-dollar"></i></div><div class="sb"><div class="sb-lbl">Cash in Hand</div><div class="sb-val">${fmt(cash)}</div></div></div>
      <div class="stat-card"><div class="si blue"><i class="fa-solid fa-building-columns"></i></div><div class="sb"><div class="sb-lbl">Bank Balance</div><div class="sb-val">${fmt(bankBal)}</div></div></div>
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-file-invoice-dollar"></i></div><div class="sb"><div class="sb-lbl">Total Sales</div><div class="sb-val">${fmt(totSale)}</div><div class="sb-sub">${sales.length} orders · ${pendSO} pending</div></div></div>
      <div class="stat-card"><div class="si brown"><i class="fa-solid fa-basket-shopping"></i></div><div class="sb"><div class="sb-lbl">Total Purchases</div><div class="sb-val">${fmt(totPurch)}</div><div class="sb-sub">${purchases.length} orders · ${pendPO} unpaid</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-arrow-trend-up"></i></div><div class="sb"><div class="sb-lbl">Vendor Payable</div><div class="sb-val">${fmt(totPay)}</div></div></div>
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-arrow-trend-down"></i></div><div class="sb"><div class="sb-lbl">Customer Receivable</div><div class="sb-val">${fmt(totRecv)}</div></div></div>
      <div class="stat-card"><div class="si blue"><i class="fa-solid fa-piggy-bank"></i></div><div class="sb"><div class="sb-lbl">Advances Held</div><div class="sb-val">${fmt(totAdv)}</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-receipt"></i></div><div class="sb"><div class="sb-lbl">Total Expenses</div><div class="sb-val">${fmt(totExp)}</div></div></div>
    </div>

    <div class="chart-grid">
      <div class="chart-card"><div class="card-title"><i class="fa-solid fa-chart-bar"></i> Sales vs Purchases — Last 7 Days</div><canvas id="cSP" height="200"></canvas></div>
      <div class="chart-card"><div class="card-title"><i class="fa-solid fa-chart-pie"></i> Product Output Distribution</div><canvas id="cProd" height="200"></canvas></div>
    </div>

    <div class="recent-grid">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-warehouse"></i> Current Stock</div>
        <div class="table-wrap"><table class="dt"><thead><tr><th>Item / Product</th><th>Type</th><th>Stock (kg)</th></tr></thead><tbody>
          ${invItems.map(i => `<tr><td class="fw6">${esc(i.name)}</td><td><span class="badge b-success">Input</span></td><td class="mono ${i.stock < 0 ? 'td' : ''}">${fmtN(i.stock)} kg</td></tr>`).join('')}
          ${invProds.map(p => `<tr><td>${esc(p.name)}</td><td><span class="badge b-info">Product</span></td><td class="mono ${p.stock < 0 ? 'td' : ''}">${fmtN(p.stock)} kg</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-industry"></i> Recent Production</div>
        <div class="table-wrap"><table class="dt"><thead><tr><th>Date</th><th>Shift</th><th>Input kg</th><th>Status</th></tr></thead><tbody>
          ${[...batches].reverse().slice(0, 6).map(b => `<tr><td>${fmtDate(b.dt)}</td><td>${gl('shifts', b.shift_id, 'name')}</td><td class="mono">${fmtN(b.input_kg)}</td><td>${sbadge(b.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="tc tmut" style="padding:18px">No batches yet.</td></tr>'}
        </tbody></table></div>
      </div>
    </div>
  `);

  // Charts
  setTimeout(() => {
    const sData = last7.map(d => sales.filter(s => s.dt === d).reduce((s, r) => s + (r.total || 0), 0));
    const pData = last7.map(d => purchases.filter(p => p.dt === d).reduce((s, r) => s + (r.total || 0), 0));
    const c1 = document.getElementById('cSP');
    if (c1) new Chart(c1, {
      type: 'bar',
      data: { labels: last7.map(d => fmtDate(d)), datasets: [
        { label: 'Sales',     data: sData, backgroundColor: 'rgba(27,58,45,0.82)',  borderRadius: 5 },
        { label: 'Purchases', data: pData, backgroundColor: 'rgba(201,168,76,0.82)', borderRadius: 5 }
      ]},
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
    const c2 = document.getElementById('cProd');
    if (c2 && Object.keys(pm).length) new Chart(c2, {
      type: 'doughnut',
      data: { labels: Object.keys(pm), datasets: [{ data: Object.values(pm), backgroundColor: ['rgba(27,58,45,.85)','rgba(201,168,76,.85)','rgba(26,107,58,.85)','rgba(26,74,122,.85)','rgba(183,104,10,.85)'], borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }, 150);
};

// Settings page (simple, included here)
Pages.settings = function () {
  const sm = {}; DB.all('settings').forEach(s => sm[s.k] = s.v);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Settings</h2><p>Mill configuration</p></div></div>
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-building"></i> Mill Information</div>
      <div class="fr"><div class="fg"><label class="lbl">Mill Name</label><input type="text" id="stName" value="${esc(sm.mill_name||'')}"></div>
      <div class="fg"><label class="lbl">Tax / NTN No</label><input type="text" id="stTax" value="${esc(sm.tax_no||'')}"></div></div>
      <div class="fg"><label class="lbl">Address</label><textarea id="stAddr" rows="2">${esc(sm.mill_address||'')}</textarea></div>
      <div class="fr"><div class="fg"><label class="lbl">Opening Cash Balance</label><input type="number" id="stCash" value="${sm.open_cash||0}"></div>
      <div class="fg"><label class="lbl">Fiscal Year Start</label><input type="date" id="stFY" value="${sm.fy_start||''}"></div></div>
      <button class="btn btn-primary" onclick="Pages._saveSettings()"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
    </div>
    <div class="card" style="border-color:var(--danger-b)">
      <div class="card-title" style="color:var(--danger)"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">This will delete ALL data permanently. Cannot be undone.</p>
      <button class="btn btn-danger" onclick="Pages._resetAll()"><i class="fa-solid fa-trash-can"></i> Reset All Data</button>
    </div>
  `);
};

Pages._saveSettings = function () {
  DB.setSetting('mill_name',    $('#stName').val().trim());
  DB.setSetting('mill_address', $('#stAddr').val().trim());
  DB.setSetting('tax_no',       $('#stTax').val().trim());
  DB.setSetting('open_cash',    $('#stCash').val());
  DB.setSetting('fy_start',     $('#stFY').val());
  Toast.success('Saved', 'Settings updated successfully.');
};

Pages._resetAll = function () {
  Confirm.show('This will DELETE ALL data permanently. Are you absolutely sure?', () => {
    const keys = ['vendors','customers','items','products','bag_types','shifts','exp_cats','pay_methods',
      'banks','cheques','settings','purchases','vendor_pays','vendor_ledger','prod_batches','prod_outs',
      'sales','sale_items','cust_pays','advances','adv_adj','cust_ledger','cash_reg','fund_transfers',
      'expenses','inventory','daily_cash_bal','day_end_sum','seeded'];
    keys.forEach(k => localStorage.removeItem(DB.NS + k));
    Toast.success('Reset', 'All data cleared. Reloading...');
    setTimeout(() => location.reload(), 1400);
  });
};

// Expense Categories + Payment Methods (simple masters, included in core)
Pages['exp-categories'] = function (page = 1) {
  const data = DB.all('exp_cats'); const p = paginate(data, page);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Expense Categories</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._expCatForm()"><i class="fa-solid fa-plus"></i> Add</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${p.rows.map(c => `<tr><td>${c.id}</td><td class="fw6">${esc(c.name)}</td><td>${sbadge(c.type)}</td>
    <td>${c.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._expCatForm(${c.id})"><i class="fa-solid fa-pen"></i></button>
    <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('exp_cats',${c.id},'exp-categories')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('') ||
    '<tr><td colspan="5" class="tc tmut" style="padding:24px">No categories.</td></tr>'}
    </tbody></table></div></div>`);
};

Pages._expCatForm = function (id) {
  const c = id ? DB.find('exp_cats', id) : {};
  Modal.open(id ? 'Edit Category' : 'Add Category', `
    <div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="ecN" value="${esc(c.name||'')}"></div>
    <div class="fg"><label class="lbl">Type</label><select id="ecT">
      <option value="operational" ${c.type==='operational'?'selected':''}>Operational</option>
      <option value="admin" ${c.type==='admin'?'selected':''}>Admin</option>
      <option value="finance" ${c.type==='finance'?'selected':''}>Finance</option>
    </select></div></div>`,
  () => {
    if (!validate([{ id: 'ecN', label: 'Name', required: true }])) return;
    const rec = { name: $('#ecN').val().trim(), type: $('#ecT').val(), is_active: true };
    id ? DB.update('exp_cats', id, rec) : DB.insert('exp_cats', rec);
    Modal.close(); Toast.success('Saved'); Pages['exp-categories'](1);
  }, { small: true });
};

Pages['pay-methods'] = function (page = 1) {
  const data = DB.all('pay_methods'); const p = paginate(data, page);
  $('#pageArea').html(`
    <div class="ph"><div class="ph-left"><h2>Payment Methods</h2></div><div class="ph-right"><button class="btn btn-primary" onclick="Pages._payMethodForm()"><i class="fa-solid fa-plus"></i> Add</button></div></div>
    <div class="card"><div class="table-wrap"><table class="dt"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${p.rows.map(m => `<tr><td>${m.id}</td><td class="fw6">${esc(m.name)}</td><td>${sbadge(m.type)}</td>
    <td>${m.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
    <td><div class="tac"><button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._payMethodForm(${m.id})"><i class="fa-solid fa-pen"></i></button>
    <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('pay_methods',${m.id},'pay-methods')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('') ||
    '<tr><td colspan="5" class="tc tmut" style="padding:24px">No methods.</td></tr>'}
    </tbody></table></div></div>`);
};

Pages._payMethodForm = function (id) {
  const m = id ? DB.find('pay_methods', id) : {};
  Modal.open(id ? 'Edit Method' : 'Add Method', `
    <div class="fr"><div class="fg"><label class="lbl">Name <span class="req">*</span></label><input type="text" id="pmN" value="${esc(m.name||'')}"></div>
    <div class="fg"><label class="lbl">Type</label><select id="pmT">
      <option value="cash" ${m.type==='cash'?'selected':''}>Cash</option>
      <option value="bank" ${m.type==='bank'?'selected':''}>Bank Transfer</option>
      <option value="cheque" ${m.type==='cheque'?'selected':''}>Cheque</option>
    </select></div></div>`,
  () => {
    if (!validate([{ id: 'pmN', label: 'Name', required: true }])) return;
    const rec = { name: $('#pmN').val().trim(), type: $('#pmT').val(), is_active: true };
    id ? DB.update('pay_methods', id, rec) : DB.insert('pay_methods', rec);
    Modal.close(); Toast.success('Saved'); Pages['pay-methods'](1);
  }, { small: true });
};

// ================================================================
// INIT — jQuery Document Ready
// ================================================================
$(document).ready(function () {
  seedIfEmpty();
  $('#tbDate').text(fmtDate(today()));

  // Navigation
  $(document).on('click', '.nav-item', function (e) {
    e.preventDefault();
    navigate($(this).data('page'));
  });

  // Sidebar toggle
  $('#sidebarToggle').on('click', function () {
    if ($(window).width() < 900) {
      $('.sidebar').toggleClass('mob');
    } else {
      $('.sidebar').toggleClass('collapsed');
      $('#mainWrap').toggleClass('expanded');
    }
  });

  // Modal buttons
  $('#modalCloseBtn, #modalCancelBtn').on('click', () => Modal.close());
  $('#modalSaveBtn').on('click', () => Modal.save());
  $('#modalOverlay').on('click', function (e) { if (e.target === this) Modal.close(); });

  // Confirm buttons
  $('#confirmOkBtn').on('click', () => Confirm.ok());
  $('#confirmCancelBtn').on('click', () => Confirm.cancel());
  $('#confirmOverlay').on('click', function (e) { if (e.target === this) Confirm.cancel(); });

  // ESC key
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') { Modal.close(); Confirm.cancel(); }
  });

  // Boot
  navigate('dashboard');
});
