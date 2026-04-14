/* ================================================================
   MILLPRO — finance.js
   Cash Register | Bank Accounts | Expenses | Fund Transfers
   Cheques | Daily Balance | Day End Summary
   ================================================================ */
'use strict';

// ================================================================
// CASH REGISTER
// ================================================================
Pages['cash-register'] = function (page = 1) {
  const flt   = $('#crFlt').val()  || '';
  const dfrom = $('#crFrom').val() || '';
  const dto   = $('#crTo').val()   || '';

  let data = DB.all('cash_reg').reverse();
  if (flt)   data = data.filter(r => r.type === flt);
  if (dfrom) data = data.filter(r => r.dt >= dfrom);
  if (dto)   data = data.filter(r => r.dt <= dto);

  const p      = paginate(data, page);
  const totIn  = data.filter(r => r.type === 'in').reduce((s, r)  => s + (r.amount || 0), 0);
  const totOut = data.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount || 0), 0);
  const curBal = getCash();

  let rows = '';
  p.rows.forEach(r => {
    rows += `<tr>
      <td>${r.id}</td>
      <td>${fmtDate(r.dt)}</td>
      <td>${esc(r.desc)}</td>
      <td class="mono ts">${r.type === 'in'  ? fmt(r.amount) : '—'}</td>
      <td class="mono td">${r.type === 'out' ? fmt(r.amount) : '—'}</td>
      <td class="mono fw6">${fmt(r.bal_after)}</td>
      <td><span class="badge ${r.ref_type === 'opening' ? 'b-neutral' : r.type === 'in' ? 'b-success' : 'b-danger'}">${esc(r.ref_type || 'manual')}</span></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="7" class="tc tmut" style="padding:28px">No cash register entries.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Cash Register</h2><p>Running cash in hand ledger</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._cashEntryForm()"><i class="fa-solid fa-plus"></i> Manual Entry</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
      <div class="stat-card">
        <div class="si green"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Cash in Hand</div><div class="sb-val">${fmt(curBal)}</div><div class="sb-sub">Current balance</div></div>
      </div>
      <div class="stat-card">
        <div class="si green"><i class="fa-solid fa-arrow-down-left"></i></div>
        <div class="sb"><div class="sb-lbl">Total In (Filtered)</div><div class="sb-val">${fmt(totIn)}</div></div>
      </div>
      <div class="stat-card">
        <div class="si red"><i class="fa-solid fa-arrow-up-right"></i></div>
        <div class="sb"><div class="sb-lbl">Total Out (Filtered)</div><div class="sb-val">${fmt(totOut)}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="fbar">
        <input type="date" id="crFrom" value="${dfrom}" style="width:145px" onchange="Pages['cash-register'](1)" title="From date">
        <input type="date" id="crTo"   value="${dto}"   style="width:145px" onchange="Pages['cash-register'](1)" title="To date">
        <select id="crFlt" style="width:145px" onchange="Pages['cash-register'](1)">
          <option value="">All Entries</option>
          <option value="in"  ${flt==='in' ?'selected':''}>Cash In Only</option>
          <option value="out" ${flt==='out'?'selected':''}>Cash Out Only</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Cash In</th><th>Cash Out</th><th>Balance After</th><th>Source</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="3" class="tr fw6">Totals:</td>
          <td class="mono fw6 ts">${fmt(totIn)}</td>
          <td class="mono fw6 td">${fmt(totOut)}</td>
          <td class="mono fw6">${fmt(curBal)}</td>
          <td></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, "Pages['cash-register']")}
    </div>
  `);
};

Pages._cashEntryForm = function () {
  Modal.open('Manual Cash Entry', `
    <div class="fr">
      <div class="fg"><label class="lbl">Date <span class="req">*</span></label>
        <input type="date" id="ceD" value="${today()}">
      </div>
      <div class="fg"><label class="lbl">Entry Type <span class="req">*</span></label>
        <select id="ceT">
          <option value="in">Cash In</option>
          <option value="out">Cash Out</option>
        </select>
      </div>
    </div>
    <div class="fg"><label class="lbl">Amount <span class="req">*</span></label>
      <input type="number" id="ceA" min="1" placeholder="0.00">
    </div>
    <div class="fg"><label class="lbl">Description <span class="req">*</span></label>
      <input type="text" id="ceDesc" placeholder="Reason for this entry">
    </div>`,
  () => {
    if (!validate([
      { id: 'ceD',    label: 'Date',        required: true },
      { id: 'ceA',    label: 'Amount',      required: true, type: 'number', min: 1 },
      { id: 'ceDesc', label: 'Description', required: true }
    ])) return;

    const type = $('#ceT').val();
    const amt  = parseFloat($('#ceA').val());
    const cb   = getCash();
    DB.insert('cash_reg', {
      dt: $('#ceD').val(), desc: $('#ceDesc').val().trim(),
      type, amount: amt, ref_type: 'manual', ref_id: null,
      bal_after: type === 'in' ? cb + amt : cb - amt
    });
    Modal.close();
    Toast.success('Saved', 'Cash entry recorded.');
    Pages['cash-register'](1);
    $('#tbCash').text(fmtN(getCash()));
  }, { small: true });
};

// ================================================================
// BANK ACCOUNTS
// ================================================================
Pages['bank-accounts'] = function (page = 1) {
  const data = DB.all('banks');
  const p    = paginate(data, page);
  const totBal = data.reduce((s, b) => s + (b.curr_bal || b.open_bal || 0), 0);

  let rows = '';
  p.rows.forEach(b => {
    rows += `<tr>
      <td>${b.id}</td>
      <td class="fw6">${esc(b.title)}</td>
      <td>${esc(b.bank   || '—')}</td>
      <td class="mono">${esc(b.acc_no || '—')}</td>
      <td>${esc(b.branch || '—')}</td>
      <td class="mono">${fmt(b.open_bal)}</td>
      <td class="mono fw6 ts">${fmt(b.curr_bal || b.open_bal)}</td>
      <td>${b.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._bankForm(${b.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('banks',${b.id},'bank-accounts')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No bank accounts yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Bank Accounts</h2><p>Manage mill bank accounts</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._bankForm()"><i class="fa-solid fa-plus"></i> Add Account</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Account Title</th><th>Bank</th><th>Account No.</th><th>Branch</th><th>Opening Bal</th><th>Current Bal</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="6">Total Bank Balance:</td>
          <td class="mono fw6 ts">${fmt(totBal)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, "Pages['bank-accounts']")}
    </div>
  `);
};

Pages._bankForm = function (id) {
  const b = id ? DB.find('banks', id) : {};
  Modal.open(id ? 'Edit Bank Account' : 'Add Bank Account', `
    <div class="fr">
      <div class="fg"><label class="lbl">Account Title <span class="req">*</span></label>
        <input type="text" id="bfT" value="${esc(b.title||'')}" placeholder="e.g. Main Operations Account">
      </div>
      <div class="fg"><label class="lbl">Bank Name</label>
        <input type="text" id="bfB" value="${esc(b.bank||'')}" placeholder="e.g. HBL, Meezan, UBL">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Account Number</label>
        <input type="text" id="bfAN" value="${esc(b.acc_no||'')}">
      </div>
      <div class="fg"><label class="lbl">Branch</label>
        <input type="text" id="bfBr" value="${esc(b.branch||'')}">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Opening Balance</label>
        <input type="number" id="bfOB" value="${b.open_bal||0}" min="0">
      </div>
      <div class="fg"><label class="lbl">Current Balance</label>
        <input type="number" id="bfCB" value="${b.curr_bal||b.open_bal||0}">
      </div>
    </div>
    <div class="fg"><label class="lbl">Status</label>
      <select id="bfAct">
        <option value="1" ${b.is_active!==false?'selected':''}>Active</option>
        <option value="0" ${b.is_active===false ?'selected':''}>Inactive</option>
      </select>
    </div>`,
  () => {
    if (!validate([{ id: 'bfT', label: 'Account Title', required: true }])) return;
    const rec = {
      title: $('#bfT').val().trim(), bank: $('#bfB').val().trim(),
      acc_no: $('#bfAN').val().trim(), branch: $('#bfBr').val().trim(),
      open_bal: parseFloat($('#bfOB').val()) || 0,
      curr_bal: parseFloat($('#bfCB').val()) || 0,
      is_active: $('#bfAct').val() === '1'
    };
    id ? DB.update('banks', id, rec) : DB.insert('banks', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Account updated.' : 'Account added.');
    Pages['bank-accounts'](1);
  });
};

// ================================================================
// EXPENSES
// ================================================================
Pages.expenses = function (page = 1) {
  const catFlt = parseInt($('#expCat').val()) || 0;
  const dfrom  = $('#expFrom').val() || '';
  const dto    = $('#expTo').val()   || '';

  let data = DB.all('expenses').reverse();
  if (catFlt) data = data.filter(e => e.cat_id === catFlt);
  if (dfrom)  data = data.filter(e => e.dt >= dfrom);
  if (dto)    data = data.filter(e => e.dt <= dto);

  const p     = paginate(data, page);
  const total = data.reduce((s, r) => s + (r.amount || 0), 0);

  // Category totals
  const catTotals = {};
  data.forEach(e => {
    const n = gl('exp_cats', e.cat_id, 'name');
    catTotals[n] = (catTotals[n] || 0) + (e.amount || 0);
  });

  let rows = '';
  p.rows.forEach(e => {
    rows += `<tr>
      <td>${e.id}</td>
      <td>${fmtDate(e.dt)}</td>
      <td>${gl('exp_cats', e.cat_id, 'name')}</td>
      <td class="mono fw6 td">${fmt(e.amount)}</td>
      <td>${gl('pay_methods', e.method_id, 'name')}</td>
      <td>${esc(e.desc   || '—')}</td>
      <td>${esc(e.ref_no || '—')}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._expenseForm(${e.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('expenses',${e.id},'expenses')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="8" class="tc tmut" style="padding:28px">No expenses yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Expenses</h2><p>Mill operational and admin expenses</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._expenseForm()"><i class="fa-solid fa-plus"></i> Add Expense</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-title"><i class="fa-solid fa-chart-pie"></i> Expense Summary</div>
      <div class="rpt-sum">
        ${Object.entries(catTotals).map(([n, v]) => `
          <div class="rsi"><div class="rv td">${fmt(v)}</div><div class="rl">${esc(n)}</div></div>`).join('') ||
          '<div class="rsi"><div class="rv tmut">Rs. 0</div><div class="rl">No expenses</div></div>'}
        <div class="rsi" style="background:var(--danger-bg)">
          <div class="rv td fw6">${fmt(total)}</div>
          <div class="rl">Total</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="fbar">
        <input type="date" id="expFrom" value="${dfrom}" style="width:145px" onchange="Pages.expenses(1)">
        <input type="date" id="expTo"   value="${dto}"   style="width:145px" onchange="Pages.expenses(1)">
        <select id="expCat" style="width:195px" onchange="Pages.expenses(1)">
          <option value="">All Categories</option>
          ${DB.all('exp_cats').map(c => `<option value="${c.id}" ${catFlt===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>Category</th><th>Amount</th><th>Method</th><th>Description</th><th>Reference</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="3">Total Expenses:</td>
          <td class="mono fw6 td">${fmt(total)}</td>
          <td colspan="4"></td>
        </tr></tfoot>
      </table></div>
      ${pagerHtml(p, 'Pages.expenses')}
    </div>
  `);
};

Pages._expenseForm = function (id) {
  const e = id ? DB.find('expenses', id) : {};
  Modal.open(id ? 'Edit Expense' : 'Add Expense', `
    <div class="fr">
      <div class="fg"><label class="lbl">Date <span class="req">*</span></label>
        <input type="date" id="efD" value="${e.dt || today()}">
      </div>
      <div class="fg"><label class="lbl">Category <span class="req">*</span></label>
        <select id="efCat">${selOpts('exp_cats','id','name',e.cat_id,c=>c.is_active)}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Amount <span class="req">*</span></label>
        <input type="number" id="efA" value="${e.amount||''}" min="1" placeholder="0.00">
      </div>
      <div class="fg"><label class="lbl">Payment Method <span class="req">*</span></label>
        <select id="efMeth">${selOpts('pay_methods','id','name',e.method_id||1)}</select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Bank Account</label>
        <select id="efBank">
          <option value="">N/A (Cash)</option>
          ${DB.all('banks').map(b => `<option value="${b.id}" ${parseInt(e.bank_id)===b.id?'selected':''}>${esc(b.title)}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="lbl">Reference No.</label>
        <input type="text" id="efRef" value="${esc(e.ref_no||'')}" placeholder="Optional">
      </div>
    </div>
    <div class="fg"><label class="lbl">Description</label>
      <textarea id="efDesc" rows="2" placeholder="Details about this expense">${esc(e.desc||'')}</textarea>
    </div>`,
  () => {
    if (!validate([
      { id: 'efD',   label: 'Date',     required: true },
      { id: 'efCat', label: 'Category', required: true },
      { id: 'efA',   label: 'Amount',   required: true, type: 'number', min: 1 }
    ])) return;

    const amt    = parseFloat($('#efA').val());
    const methId = parseInt($('#efMeth').val());
    const bankId = $('#efBank').val() ? parseInt($('#efBank').val()) : null;

    const rec = {
      dt: $('#efD').val(), cat_id: parseInt($('#efCat').val()),
      amount: amt, method_id: methId, bank_id: bankId,
      desc: $('#efDesc').val().trim(), ref_no: $('#efRef').val().trim()
    };

    if (id) {
      DB.update('expenses', id, rec);
      Toast.success('Updated', 'Expense updated.');
    } else {
      const saved = DB.insert('expenses', rec);
      // Auto cash register entry
      const meth = DB.find('pay_methods', methId);
      if (meth && meth.type === 'cash') {
        const cb = getCash();
        DB.insert('cash_reg', {
          dt: rec.dt, desc: `Expense: ${gl('exp_cats', rec.cat_id, 'name')} — ${rec.desc || 'N/A'}`,
          type: 'out', amount: amt, ref_type: 'expense', ref_id: saved.id,
          bal_after: cb - amt
        });
      }
      // Bank deduction
      if (bankId) {
        const ba = DB.find('banks', bankId);
        if (ba) DB.update('banks', bankId, { curr_bal: (ba.curr_bal || ba.open_bal || 0) - amt });
      }
      Toast.success('Saved', 'Expense recorded.');
    }
    Modal.close();
    Pages.expenses(1);
    $('#tbCash').text(fmtN(getCash()));
  });
};

// ================================================================
// FUND TRANSFERS
// ================================================================
Pages['fund-transfers'] = function (page = 1) {
  const data = DB.all('fund_transfers').reverse();
  const p    = paginate(data, page);
  const total = data.reduce((s, r) => s + (r.amount || 0), 0);

  let rows = '';
  p.rows.forEach(t => {
    const fromLabel = t.from_type === 'cash' ? 'Cash in Hand' : gl('banks', t.from_bank_id, 'title');
    const toLabel   = t.to_type   === 'cash' ? 'Cash in Hand' : gl('banks', t.to_bank_id,   'title');
    rows += `<tr>
      <td>${t.id}</td>
      <td>${fmtDate(t.dt)}</td>
      <td>${esc(fromLabel)}</td>
      <td><i class="fa-solid fa-arrow-right" style="color:var(--accent)"></i></td>
      <td>${esc(toLabel)}</td>
      <td class="mono fw6">${fmt(t.amount)}</td>
      <td>${esc(t.notes || '—')}</td>
      <td><div class="tac">
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('fund_transfers',${t.id},'fund-transfers')">
          <i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="8" class="tc tmut" style="padding:28px">No fund transfers yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Fund Transfers</h2><p>Transfer money between cash and bank accounts</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._transferForm()"><i class="fa-solid fa-plus"></i> New Transfer</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Date</th><th>From</th><th></th><th>To</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">Total Transferred:</td><td class="mono fw6">${fmt(total)}</td><td colspan="2"></td></tr></tfoot>
      </table></div>
      ${pagerHtml(p, "Pages['fund-transfers']")}
    </div>
  `);
};

Pages._transferForm = function () {
  const banks = DB.all('banks').filter(b => b.is_active);
  const bankOpts = banks.map(b => `<option value="bank_${b.id}">${esc(b.title)}</option>`).join('');

  Modal.open('New Fund Transfer', `
    <div class="fr">
      <div class="fg"><label class="lbl">Date <span class="req">*</span></label>
        <input type="date" id="tfD" value="${today()}">
      </div>
      <div class="fg"><label class="lbl">Amount <span class="req">*</span></label>
        <input type="number" id="tfA" min="1" placeholder="0.00">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">From <span class="req">*</span></label>
        <select id="tfFrom">
          <option value="cash">Cash in Hand (${fmt(getCash())})</option>
          ${bankOpts}
        </select>
      </div>
      <div class="fg"><label class="lbl">To <span class="req">*</span></label>
        <select id="tfTo">
          <option value="cash">Cash in Hand</option>
          ${bankOpts}
        </select>
      </div>
    </div>
    <div class="fg"><label class="lbl">Notes</label>
      <textarea id="tfNotes" rows="2" placeholder="Optional reason for this transfer"></textarea>
    </div>`,
  () => {
    if (!validate([
      { id: 'tfD', label: 'Date',   required: true },
      { id: 'tfA', label: 'Amount', required: true, type: 'number', min: 1 }
    ])) return;

    const fromVal = $('#tfFrom').val();
    const toVal   = $('#tfTo').val();
    if (fromVal === toVal) { Toast.error('Invalid', 'From and To cannot be the same.'); return; }

    const amt       = parseFloat($('#tfA').val());
    const fromType  = fromVal === 'cash' ? 'cash' : 'bank';
    const toType    = toVal   === 'cash' ? 'cash' : 'bank';
    const fromBankId = fromType === 'bank' ? parseInt(fromVal.split('_')[1]) : null;
    const toBankId   = toType   === 'bank' ? parseInt(toVal.split('_')[1])   : null;

    const rec = DB.insert('fund_transfers', {
      dt: $('#tfD').val(), from_type: fromType, from_bank_id: fromBankId,
      to_type: toType, to_bank_id: toBankId, amount: amt,
      notes: $('#tfNotes').val().trim()
    });

    // Cash out
    if (fromType === 'cash') {
      const cb = getCash();
      DB.insert('cash_reg', {
        dt: rec.dt, desc: `Transfer to bank: ${toBankId ? gl('banks', toBankId, 'title') : 'N/A'}`,
        type: 'out', amount: amt, ref_type: 'transfer', ref_id: rec.id, bal_after: cb - amt
      });
    }
    // Cash in
    if (toType === 'cash') {
      const cb = getCash();
      DB.insert('cash_reg', {
        dt: rec.dt, desc: `Transfer from bank: ${fromBankId ? gl('banks', fromBankId, 'title') : 'N/A'}`,
        type: 'in', amount: amt, ref_type: 'transfer', ref_id: rec.id, bal_after: cb + amt
      });
    }
    // Bank debit
    if (fromBankId) {
      const ba = DB.find('banks', fromBankId);
      if (ba) DB.update('banks', fromBankId, { curr_bal: (ba.curr_bal || ba.open_bal || 0) - amt });
    }
    // Bank credit
    if (toBankId) {
      const ba = DB.find('banks', toBankId);
      if (ba) DB.update('banks', toBankId, { curr_bal: (ba.curr_bal || ba.open_bal || 0) + amt });
    }

    Modal.close();
    Toast.success('Saved', 'Fund transfer recorded.');
    Pages['fund-transfers'](1);
    $('#tbCash').text(fmtN(getCash()));
  });
};

// ================================================================
// CHEQUES
// ================================================================
Pages.cheques = function (page = 1) {
  const sFlt = $('#chqSFlt').val() || '';
  const dFlt = $('#chqDFlt').val() || '';
  let data   = DB.all('cheques').reverse();
  if (sFlt) data = data.filter(c => c.status    === sFlt);
  if (dFlt) data = data.filter(c => c.direction === dFlt);
  const p = paginate(data, page);

  const totPending = DB.where('cheques', c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const totCleared = DB.where('cheques', c => c.status === 'cleared').reduce((s, c) => s + (c.amount || 0), 0);

  let rows = '';
  p.rows.forEach(c => {
    rows += `<tr>
      <td>${c.id}</td>
      <td class="mono fw6">${esc(c.cheque_no)}</td>
      <td>${fmtDate(c.cheque_dt)}</td>
      <td>${esc(c.party_name || '—')}</td>
      <td>${sbadge(c.direction)}</td>
      <td class="mono fw6">${fmt(c.amount)}</td>
      <td>${esc(c.bank_name || '—')}</td>
      <td>${sbadge(c.status)}</td>
      <td><div class="tac">
        ${c.status === 'pending' ? `
          <button class="btn btn-success btn-sm btn-icon" title="Mark Cleared" onclick="Pages._chequeAction(${c.id},'cleared')">
            <i class="fa-solid fa-check"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" title="Mark Bounced" onclick="Pages._chequeAction(${c.id},'bounced')">
            <i class="fa-solid fa-ban"></i></button>` : ''}
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._chequeForm(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('cheques',${c.id},'cheques')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No cheques recorded yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Cheques</h2><p>Received and issued cheque tracking</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._chequeForm()"><i class="fa-solid fa-plus"></i> Add Cheque</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
      <div class="stat-card">
        <div class="si amber"><i class="fa-solid fa-clock"></i></div>
        <div class="sb"><div class="sb-lbl">Pending Amount</div><div class="sb-val">${fmt(totPending)}</div>
          <div class="sb-sub">${DB.where('cheques',c=>c.status==='pending').length} cheques</div></div>
      </div>
      <div class="stat-card">
        <div class="si green"><i class="fa-solid fa-circle-check"></i></div>
        <div class="sb"><div class="sb-lbl">Cleared Amount</div><div class="sb-val">${fmt(totCleared)}</div></div>
      </div>
      <div class="stat-card">
        <div class="si red"><i class="fa-solid fa-ban"></i></div>
        <div class="sb"><div class="sb-lbl">Bounced</div><div class="sb-val">${fmt(DB.where('cheques',c=>c.status==='bounced').reduce((s,c)=>s+(c.amount||0),0))}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="fbar">
        <select id="chqSFlt" style="width:155px" onchange="Pages.cheques(1)">
          <option value="">All Status</option>
          <option value="pending" ${sFlt==='pending'?'selected':''}>Pending</option>
          <option value="cleared" ${sFlt==='cleared'?'selected':''}>Cleared</option>
          <option value="bounced" ${sFlt==='bounced'?'selected':''}>Bounced</option>
          <option value="cancelled" ${sFlt==='cancelled'?'selected':''}>Cancelled</option>
        </select>
        <select id="chqDFlt" style="width:155px" onchange="Pages.cheques(1)">
          <option value="">All Directions</option>
          <option value="received" ${dFlt==='received'?'selected':''}>Received</option>
          <option value="issued"   ${dFlt==='issued'  ?'selected':''}>Issued</option>
        </select>
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>#</th><th>Cheque No.</th><th>Date</th><th>Party</th><th>Direction</th><th>Amount</th><th>Bank</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${pagerHtml(p, 'Pages.cheques')}
    </div>
  `);
};

Pages._chequeForm = function (id) {
  const c = id ? DB.find('cheques', id) : {};
  Modal.open(id ? 'Edit Cheque' : 'Add Cheque', `
    <div class="fr">
      <div class="fg"><label class="lbl">Cheque No. <span class="req">*</span></label>
        <input type="text" id="chN" value="${esc(c.cheque_no||'')}" placeholder="e.g. 001234">
      </div>
      <div class="fg"><label class="lbl">Cheque Date <span class="req">*</span></label>
        <input type="date" id="chD" value="${c.cheque_dt||today()}">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Direction <span class="req">*</span></label>
        <select id="chDir">
          <option value="received" ${(c.direction||'received')==='received'?'selected':''}>Received (from party)</option>
          <option value="issued"   ${c.direction==='issued'               ?'selected':''}>Issued (to party)</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Amount <span class="req">*</span></label>
        <input type="number" id="chA" value="${c.amount||''}" min="1" placeholder="0.00">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Party Name</label>
        <input type="text" id="chParty" value="${esc(c.party_name||'')}" placeholder="Customer or vendor name">
      </div>
      <div class="fg"><label class="lbl">Bank Name</label>
        <input type="text" id="chBank" value="${esc(c.bank_name||'')}" placeholder="e.g. HBL, Meezan">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Status</label>
        <select id="chStat">
          <option value="pending"   ${(c.status||'pending')==='pending'  ?'selected':''}>Pending</option>
          <option value="cleared"   ${c.status==='cleared'               ?'selected':''}>Cleared</option>
          <option value="bounced"   ${c.status==='bounced'               ?'selected':''}>Bounced</option>
          <option value="cancelled" ${c.status==='cancelled'             ?'selected':''}>Cancelled</option>
        </select>
      </div>
      <div class="fg"><label class="lbl">Notes</label>
        <input type="text" id="chNotes" value="${esc(c.notes||'')}" placeholder="Optional">
      </div>
    </div>`,
  () => {
    if (!validate([
      { id: 'chN', label: 'Cheque No.', required: true },
      { id: 'chD', label: 'Date',       required: true },
      { id: 'chA', label: 'Amount',     required: true, type: 'number', min: 1 }
    ])) return;
    const rec = {
      cheque_no: $('#chN').val().trim(), cheque_dt: $('#chD').val(),
      direction: $('#chDir').val(), amount: parseFloat($('#chA').val()),
      party_name: $('#chParty').val().trim(), bank_name: $('#chBank').val().trim(),
      status: $('#chStat').val(), notes: $('#chNotes').val().trim()
    };
    id ? DB.update('cheques', id, rec) : DB.insert('cheques', rec);
    Modal.close();
    Toast.success('Saved', id ? 'Cheque updated.' : 'Cheque recorded.');
    Pages.cheques(1);
  });
};

Pages._chequeAction = function (id, status) {
  DB.update('cheques', id, { status, clearance_dt: status === 'cleared' ? today() : null });
  Toast.success('Updated', `Cheque marked as ${status}.`);
  Pages.cheques(1);
};

// ================================================================
// DAILY BALANCE
// ================================================================
Pages['daily-balance'] = function (page = 1) {
  const month = $('#dbMonth').val() || today().substring(0, 7);
  let data    = DB.all('daily_cash_bal')
    .filter(r => r.dt && r.dt.startsWith(month))
    .sort((a, b) => b.dt.localeCompare(a.dt));
  const p = paginate(data, page, 10);

  // Get last recorded closing balance for carry-forward suggestion
  const allBals  = DB.all('daily_cash_bal').sort((a, b) => b.dt.localeCompare(a.dt));
  const lastBal  = allBals.length ? allBals[0].closing : getCash();

  const cards = p.rows.map(d => `
    <div class="bdc">
      <div class="bdc-hdr">
        <h3>${fmtDate(d.dt)}</h3>
        <div style="color:rgba(255,255,255,.65);font-size:12px">
          <i class="fa-solid fa-calendar-check"></i> Recorded
        </div>
      </div>
      <div class="bdc-row">
        <div class="bdc-cell">
          <div class="bdc-lbl">Opening Balance</div>
          <div class="bdc-val">${fmt(d.opening)}</div>
        </div>
        <div class="bdc-cell">
          <div class="bdc-lbl">Cash In</div>
          <div class="bdc-val pos">+ ${fmt(d.cash_in)}</div>
        </div>
        <div class="bdc-cell">
          <div class="bdc-lbl">Cash Out</div>
          <div class="bdc-val neg">- ${fmt(d.cash_out)}</div>
        </div>
        <div class="bdc-cell">
          <div class="bdc-lbl">Closing Balance</div>
          <div class="bdc-val ${d.closing >= d.opening ? 'pos' : 'neg'}">${fmt(d.closing)}</div>
        </div>
      </div>
      ${d.notes ? `<div style="padding:8px 16px;font-size:12px;color:var(--text3);border-top:1px solid var(--border)"><i class="fa-regular fa-note-sticky"></i> ${esc(d.notes)}</div>` : ''}
    </div>`).join('');

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Daily Balance</h2><p>Day-wise cash carry-forward records</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._openDayForm()"><i class="fa-solid fa-plus"></i> Record Day</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="fbar" style="margin-bottom:0">
        <label class="lbl" style="margin-bottom:0;white-space:nowrap">Filter Month:</label>
        <input type="month" id="dbMonth" value="${month}" style="width:175px" onchange="Pages['daily-balance'](1)">
      </div>
    </div>

    ${cards || `<div class="card"><div class="empty"><i class="fa-solid fa-calendar-day"></i><h4>No daily balances for this month</h4><p>Click "Record Day" to add one.</p></div></div>`}

    ${pagerHtml(p, "Pages['daily-balance']")}
  `);
};

Pages._openDayForm = function () {
  // Auto-calculate from today's cash register
  const cr      = DB.where('cash_reg', r => r.dt === today());
  const cashIn  = cr.filter(r => r.type === 'in').reduce((s, r)  => s + (r.amount || 0), 0);
  const cashOut = cr.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount || 0), 0);
  const closing = getCash();
  const opening = closing - cashIn + cashOut;

  // Check if today already exists
  const existing = DB.where('daily_cash_bal', r => r.dt === today());

  Modal.open('Record Daily Balance', `
    <div class="fg"><label class="lbl">Date <span class="req">*</span></label>
      <input type="date" id="dbd" value="${today()}">
    </div>
    <div class="info-box">
      <i class="fa-solid fa-circle-info" style="color:var(--info)"></i>
      Auto-calculated from today's cash register:
      <strong>In: ${fmt(cashIn)}</strong> |
      <strong>Out: ${fmt(cashOut)}</strong> |
      <strong>Cash Now: ${fmt(closing)}</strong>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Opening Balance</label>
        <input type="number" id="dbOpen" value="${opening.toFixed(2)}" oninput="Pages._dbCalc()">
      </div>
      <div class="fg"><label class="lbl">Cash In</label>
        <input type="number" id="dbIn" value="${cashIn.toFixed(2)}" oninput="Pages._dbCalc()">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="lbl">Cash Out</label>
        <input type="number" id="dbOut" value="${cashOut.toFixed(2)}" oninput="Pages._dbCalc()">
      </div>
      <div class="fg"><label class="lbl">Closing Balance</label>
        <input type="number" id="dbClose" value="${closing.toFixed(2)}" readonly style="background:var(--bg);font-weight:600">
      </div>
    </div>
    <div class="fg"><label class="lbl">Notes</label>
      <textarea id="dbNotes" rows="2" placeholder="Optional notes for this day">${existing.length ? esc(existing[0].notes||'') : ''}</textarea>
    </div>
    ${existing.length ? '<div class="warn-box"><i class="fa-solid fa-triangle-exclamation"></i> A record for today already exists. Saving will update it.</div>' : ''}`,
  () => {
    if (!validate([{ id: 'dbd', label: 'Date', required: true }])) return;
    const rec = {
      dt:      $('#dbd').val(),
      opening: parseFloat($('#dbOpen').val())  || 0,
      cash_in: parseFloat($('#dbIn').val())    || 0,
      cash_out:parseFloat($('#dbOut').val())   || 0,
      closing: parseFloat($('#dbClose').val()) || 0,
      notes:   $('#dbNotes').val().trim()
    };
    const ex = DB.where('daily_cash_bal', r => r.dt === rec.dt);
    if (ex.length) DB.update('daily_cash_bal', ex[0].id, rec);
    else DB.insert('daily_cash_bal', rec);
    Modal.close();
    Toast.success('Saved', 'Daily balance recorded.');
    Pages['daily-balance'](1);
  });
};

Pages._dbCalc = function () {
  const o  = parseFloat($('#dbOpen').val()) || 0;
  const ci = parseFloat($('#dbIn').val())   || 0;
  const co = parseFloat($('#dbOut').val())  || 0;
  $('#dbClose').val((o + ci - co).toFixed(2));
};

// ================================================================
// DAY END SUMMARY
// ================================================================
Pages['day-end'] = function () {
  const d          = today();
  const purchases  = DB.where('purchases',    p => p.dt === d);
  const sales      = DB.where('sales',        s => s.dt === d);
  const batches    = DB.where('prod_batches', b => b.dt === d);
  const exps       = DB.where('expenses',     e => e.dt === d);
  const cr         = DB.where('cash_reg',     r => r.dt === d);

  const cashIn   = cr.filter(r => r.type === 'in').reduce((s, r)  => s + (r.amount || 0), 0);
  const cashOut  = cr.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount || 0), 0);
  const cash     = getCash();
  const bankBal  = DB.all('banks').reduce((s, b) => s + (b.curr_bal || b.open_bal || 0), 0);

  const allOuts   = batches.flatMap(b => DB.where('prod_outs', o => o.batch_id === b.id));
  const totInput  = batches.reduce((s, b)  => s + (b.input_kg  || 0), 0);
  const totOutput = allOuts.reduce((s, o)  => s + (o.out_kg    || 0), 0);
  const totWaste  = allOuts.reduce((s, o)  => s + (o.waste_kg  || 0), 0);

  const totSale       = sales.reduce((s, r)     => s + (r.total   || 0), 0);
  const totSaleRecv   = sales.reduce((s, r)     => s + (r.paid    || 0), 0);
  const totSaleDue    = sales.reduce((s, r)     => s + (r.balance || 0), 0);
  const totPurch      = purchases.reduce((s, r) => s + (r.total   || 0), 0);
  const totPurchPaid  = purchases.reduce((s, r) => s + (r.paid    || 0), 0);
  const totPurchDue   = purchases.reduce((s, r) => s + (r.balance || 0), 0);
  const totExp        = exps.reduce((s, e)      => s + (e.amount  || 0), 0);

  const totalPayable  = DB.all('vendors').reduce((s, v) => {
    const l = DB.where('vendor_ledger', r => r.vendor_id === v.id);
    return s + (l.length ? l[l.length - 1].bal : (v.open_bal || 0));
  }, 0);
  const totalRecv     = DB.all('customers').reduce((s, c) => {
    const l = DB.where('cust_ledger', r => r.cust_id === c.id);
    return s + (l.length ? l[l.length - 1].bal : (c.open_bal || 0));
  }, 0);
  const totalAdv      = DB.where('advances', a => a.status === 'open' || a.status === 'partial')
                          .reduce((s, a) => s + (a.balance || 0), 0);

  const existing = DB.where('day_end_sum', r => r.dt === d);

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Day End Summary</h2><p>${fmtDate(d)} — Auto-calculated from today's transactions</p></div>
      <div class="ph-right">
        <button class="btn btn-primary" onclick="Pages._saveDayEnd()">
          <i class="fa-solid fa-floppy-disk"></i> Save Summary
        </button>
      </div>
    </div>

    ${existing.length ? `<div class="info-box"><i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Day end for <strong>${fmtDate(d)}</strong> already saved. Click "Save Summary" to update.</div>` : ''}

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Cash in Hand</div><div class="sb-val">${fmt(cash)}</div>
          <div class="sb-sub">In: ${fmt(cashIn)} | Out: ${fmt(cashOut)}</div></div></div>
      <div class="stat-card"><div class="si blue"><i class="fa-solid fa-building-columns"></i></div>
        <div class="sb"><div class="sb-lbl">Bank Balance</div><div class="sb-val">${fmt(bankBal)}</div></div></div>
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Today's Sales</div><div class="sb-val">${fmt(totSale)}</div>
          <div class="sb-sub">${sales.length} orders</div></div></div>
      <div class="stat-card"><div class="si brown"><i class="fa-solid fa-basket-shopping"></i></div>
        <div class="sb"><div class="sb-lbl">Today's Purchases</div><div class="sb-val">${fmt(totPurch)}</div>
          <div class="sb-sub">${purchases.length} orders</div></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-bottom:18px">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-basket-shopping"></i> Purchase Summary</div>
        <table class="dt"><tbody>
          <tr><td>Total Purchased</td><td class="mono tr">${fmt(totPurch)}</td></tr>
          <tr><td>Paid Today</td><td class="mono tr ts">${fmt(totPurchPaid)}</td></tr>
          <tr><td>Credit (Unpaid)</td><td class="mono tr td">${fmt(totPurchDue)}</td></tr>
          <tr style="border-top:2px solid var(--border)">
            <td class="fw6">Total Vendor Payable</td>
            <td class="mono tr fw6 td">${fmt(totalPayable)}</td>
          </tr>
        </tbody></table>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-industry"></i> Production Summary</div>
        <table class="dt"><tbody>
          <tr><td>Batches Run</td><td class="mono tr">${batches.length}</td></tr>
          <tr><td>Input Wheat</td><td class="mono tr">${fmtN(totInput)} kg</td></tr>
          <tr><td>Total Output</td><td class="mono tr ts">${fmtN(totOutput)} kg</td></tr>
          <tr><td>Wastage</td><td class="mono tr td">${fmtN(totWaste)} kg</td></tr>
          <tr style="border-top:2px solid var(--border)">
            <td class="fw6">Yield Efficiency</td>
            <td class="mono tr fw6">${totInput > 0 ? ((totOutput / totInput) * 100).toFixed(1) : 0}%</td>
          </tr>
        </tbody></table>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-file-invoice-dollar"></i> Sales Summary</div>
        <table class="dt"><tbody>
          <tr><td>Total Billed</td><td class="mono tr">${fmt(totSale)}</td></tr>
          <tr><td>Received Today</td><td class="mono tr ts">${fmt(totSaleRecv)}</td></tr>
          <tr><td>Credit (Unpaid)</td><td class="mono tr td">${fmt(totSaleDue)}</td></tr>
          <tr style="border-top:2px solid var(--border)">
            <td class="fw6">Total Receivable</td>
            <td class="mono tr fw6 ts">${fmt(totalRecv)}</td>
          </tr>
        </tbody></table>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-scale-balanced"></i> Financial Position</div>
      <div class="rpt-sum">
        <div class="rsi"><div class="rv">${fmt(cash)}</div><div class="rl">Cash in Hand</div></div>
        <div class="rsi"><div class="rv">${fmt(bankBal)}</div><div class="rl">Bank Balance</div></div>
        <div class="rsi"><div class="rv td">${fmt(totalPayable)}</div><div class="rl">Vendor Payable</div></div>
        <div class="rsi"><div class="rv ts">${fmt(totalRecv)}</div><div class="rl">Cust Receivable</div></div>
        <div class="rsi"><div class="rv">${fmt(totalAdv)}</div><div class="rl">Advances Held</div></div>
        <div class="rsi"><div class="rv td">${fmt(totExp)}</div><div class="rl">Expenses Today</div></div>
        <div class="rsi" style="background:${totSaleRecv - totPurchPaid - totExp >= 0 ? 'var(--success-bg)':'var(--danger-bg)'}">
          <div class="rv ${totSaleRecv - totPurchPaid - totExp >= 0 ? 'ts' : 'td'} fw6">
            ${fmt(totSaleRecv - totPurchPaid - totExp)}
          </div>
          <div class="rl">Est. Net Profit</div>
        </div>
      </div>
    </div>
  `);
};

Pages._saveDayEnd = function () {
  const d         = today();
  const purchases = DB.where('purchases',    p => p.dt === d);
  const sales     = DB.where('sales',        s => s.dt === d);
  const batches   = DB.where('prod_batches', b => b.dt === d);
  const exps      = DB.where('expenses',     e => e.dt === d);
  const cr        = DB.where('cash_reg',     r => r.dt === d);

  const cashIn  = cr.filter(r => r.type === 'in').reduce((s, r)  => s + (r.amount || 0), 0);
  const cashOut = cr.filter(r => r.type === 'out').reduce((s, r) => s + (r.amount || 0), 0);
  const closing = getCash();
  const bankBal = DB.all('banks').reduce((s, b) => s + (b.curr_bal || b.open_bal || 0), 0);
  const allOuts = batches.flatMap(b => DB.where('prod_outs', o => o.batch_id === b.id));

  const totalPayable = DB.all('vendors').reduce((s, v) => {
    const l = DB.where('vendor_ledger', r => r.vendor_id === v.id);
    return s + (l.length ? l[l.length - 1].bal : (v.open_bal || 0));
  }, 0);
  const totalRecv = DB.all('customers').reduce((s, c) => {
    const l = DB.where('cust_ledger', r => r.cust_id === c.id);
    return s + (l.length ? l[l.length - 1].bal : (c.open_bal || 0));
  }, 0);

  const rec = {
    dt: d,
    cash_opening:     closing - cashIn + cashOut,
    cash_in:          cashIn,
    cash_out:         cashOut,
    cash_closing:     closing,
    bank_closing:     bankBal,
    total_vendor_payable:  totalPayable,
    total_cust_recv:       totalRecv,
    total_purchased:  purchases.reduce((s, r) => s + (r.total   || 0), 0),
    total_purch_paid: purchases.reduce((s, r) => s + (r.paid    || 0), 0),
    total_sold:       sales.reduce((s, r)     => s + (r.total   || 0), 0),
    total_received:   sales.reduce((s, r)     => s + (r.paid    || 0), 0),
    total_input_kg:   batches.reduce((s, b)   => s + (b.input_kg|| 0), 0),
    total_output_kg:  allOuts.reduce((s, o)   => s + (o.out_kg  || 0), 0),
    total_wastage_kg: allOuts.reduce((s, o)   => s + (o.waste_kg|| 0), 0),
    total_expenses:   exps.reduce((s, e)      => s + (e.amount  || 0), 0),
    batch_count:      batches.length,
    sale_count:       sales.length,
    purchase_count:   purchases.length
  };

  // Save day end summary
  const ex = DB.where('day_end_sum', r => r.dt === d);
  if (ex.length) DB.update('day_end_sum', ex[0].id, rec);
  else DB.insert('day_end_sum', rec);

  // Also save/update daily cash balance
  const db_rec = { dt: d, opening: rec.cash_opening, cash_in: cashIn, cash_out: cashOut, closing, notes: 'Saved from Day End' };
  const ex2 = DB.where('daily_cash_bal', r => r.dt === d);
  if (ex2.length) DB.update('daily_cash_bal', ex2[0].id, db_rec);
  else DB.insert('daily_cash_bal', db_rec);

  Toast.success('Saved', 'Day end summary saved successfully!');
  Pages['day-end']();
};
