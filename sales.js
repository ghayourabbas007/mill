/* ================================================================
   MILLPRO — sales.js (stub — full module coming next)
   Customers CRUD is here as it is needed right away.
   Sales | Cust Payments | Advances | Cust Ledger = coming next.
   ================================================================ */
'use strict';

// Sales pages placeholders
['sales','cust-payments','advances','cust-ledger'].forEach(pg => {
  Pages[pg] = function () {
    $('#pageArea').html(`
      <div class="card">
        <div class="empty">
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <h4>${pg.replace('-',' ')} — coming in next delivery</h4>
          <p>This module will be delivered after you test production.</p>
        </div>
      </div>`);
  };
});

// ================================================================
// CUSTOMERS  (needed now so dashboard receivables work)
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
    const bal    = ledger.length ? ledger[ledger.length-1].bal : (c.open_bal || 0);
    const advBal = DB.where('advances', a => a.cust_id === c.id && (a.status==='open'||a.status==='partial'))
                     .reduce((s, a) => s + (a.balance || 0), 0);
    rows += `<tr>
      <td>${c.id}</td>
      <td class="fw6">${esc(c.name)}</td>
      <td>${sbadge(c.type)}</td>
      <td>${esc(c.phone || '—')}</td>
      <td class="mono">${fmt(c.credit_limit)}</td>
      <td class="mono fw6 ${bal > 0 ? 'td' : bal < 0 ? 'ts' : ''}">${fmt(Math.abs(bal))} ${bal>0?'<small>(due)</small>':bal<0?'<small>(cr)</small>':''}</td>
      <td class="mono ${advBal > 0 ? 'ts' : 'tmut'}">${advBal > 0 ? fmt(advBal) : '—'}</td>
      <td>${c.is_active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Inactive</span>'}</td>
      <td><div class="tac">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages._custForm(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delRec('customers',${c.id},'customers')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  });
  if (!rows) rows = `<tr><td colspan="9" class="tc tmut" style="padding:28px">No customers yet.</td></tr>`;

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Customers</h2><p>Buyers, dealers and credit accounts</p></div>
      <div class="ph-right"><button class="btn btn-primary" onclick="Pages._custForm()"><i class="fa-solid fa-plus"></i> Add Customer</button></div>
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
