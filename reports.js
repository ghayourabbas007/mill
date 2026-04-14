/* ================================================================
   MILLPRO — reports.js
   Reports | Inventory Report
   ================================================================ */
'use strict';

// ================================================================
// REPORTS — Main Financial + Operational Report
// ================================================================
Pages.reports = function () {
  const dfrom = $('#rFrom').val() || today().substring(0, 8) + '01';
  const dto   = $('#rTo').val()   || today();

  const purchases = DB.where('purchases',    p => p.dt >= dfrom && p.dt <= dto);
  const sales     = DB.where('sales',        s => s.dt >= dfrom && s.dt <= dto);
  const batches   = DB.where('prod_batches', b => b.dt >= dfrom && b.dt <= dto);
  const exps      = DB.where('expenses',     e => e.dt >= dfrom && e.dt <= dto);

  // Totals
  const totSale      = sales.reduce((s, r)     => s + (r.total        || 0), 0);
  const totSaleRecv  = sales.reduce((s, r)     => s + (r.paid         || 0), 0);
  const totSaleDue   = sales.reduce((s, r)     => s + (r.balance      || 0), 0);
  const totPurch     = purchases.reduce((s, r) => s + (r.total        || 0), 0);
  const totPurchPaid = purchases.reduce((s, r) => s + (r.paid         || 0), 0);
  const totPurchDue  = purchases.reduce((s, r) => s + (r.balance      || 0), 0);
  const totExp       = exps.reduce((s, e)      => s + (e.amount       || 0), 0);
  const totInputKg   = batches.reduce((s, b)   => s + (b.input_kg     || 0), 0);
  const allOuts      = batches.flatMap(b => DB.where('prod_outs', o => o.batch_id === b.id));
  const totOutputKg  = allOuts.reduce((s, o)   => s + (o.out_kg       || 0), 0);
  const totWasteKg   = allOuts.reduce((s, o)   => s + (o.waste_kg     || 0), 0);
  const estProfit    = totSaleRecv - totPurchPaid - totExp;

  // Product-wise sales
  const prodSales = {};
  DB.all('sale_items').forEach(i => {
    const s = DB.find('sales', i.sale_id);
    if (!s || s.dt < dfrom || s.dt > dto) return;
    const n = gl('products', i.prod_id, 'name');
    if (!prodSales[n]) prodSales[n] = { qty: 0, bags: 0, amt: 0 };
    prodSales[n].qty  += (i.tot_kg     || 0);
    prodSales[n].bags += (i.bags       || 0);
    prodSales[n].amt  += (i.line_total || 0);
  });

  // Vendor-wise purchases
  const vendPurch = {};
  purchases.forEach(p => {
    const n = gl('vendors', p.vendor_id, 'name');
    if (!vendPurch[n]) vendPurch[n] = { qty: 0, amt: 0, paid: 0, due: 0 };
    vendPurch[n].qty  += (p.wt_kg   || 0);
    vendPurch[n].amt  += (p.total   || 0);
    vendPurch[n].paid += (p.paid    || 0);
    vendPurch[n].due  += (p.balance || 0);
  });

  // Customer-wise sales
  const custSales = {};
  sales.forEach(s => {
    const n = gl('customers', s.cust_id, 'name');
    if (!custSales[n]) custSales[n] = { orders: 0, amt: 0, recv: 0, due: 0 };
    custSales[n].orders += 1;
    custSales[n].amt    += (s.total   || 0);
    custSales[n].recv   += (s.paid    || 0);
    custSales[n].due    += (s.balance || 0);
  });

  // Expense by category
  const catExp = {};
  exps.forEach(e => {
    const n = gl('exp_cats', e.cat_id, 'name');
    catExp[n] = (catExp[n] || 0) + (e.amount || 0);
  });

  // Daily trend data (last 30 days within range)
  const rangeDays = [];
  let d = new Date(dfrom);
  const endD = new Date(dto);
  while (d <= endD && rangeDays.length < 30) {
    rangeDays.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  const dailySales = rangeDays.map(day => sales.filter(s => s.dt === day).reduce((s, r) => s + (r.total || 0), 0));
  const dailyExp   = rangeDays.map(day => exps.filter(e => e.dt === day).reduce((s, r) => s + (r.amount || 0), 0));

  // Product output for chart
  const prodOutput = {};
  allOuts.forEach(o => {
    const n = gl('products', o.prod_id, 'name');
    prodOutput[n] = (prodOutput[n] || 0) + (o.out_kg || 0);
  });

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Reports</h2><p>Comprehensive financial and operational analysis</p></div>
      <div class="ph-right">
        <button class="btn btn-ghost btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report</button>
      </div>
    </div>

    <!-- FILTER -->
    <div class="rpt-filter">
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="fg" style="margin-bottom:0">
          <label class="lbl">From Date</label>
          <input type="date" id="rFrom" value="${dfrom}" onchange="Pages.reports()">
        </div>
        <div class="fg" style="margin-bottom:0">
          <label class="lbl">To Date</label>
          <input type="date" id="rTo" value="${dto}" onchange="Pages.reports()">
        </div>
        <button class="btn btn-primary" onclick="Pages.reports()"><i class="fa-solid fa-filter"></i> Apply</button>
        <button class="btn btn-ghost" onclick="Pages._rptSetRange('month')">This Month</button>
        <button class="btn btn-ghost" onclick="Pages._rptSetRange('week')">This Week</button>
        <button class="btn btn-ghost" onclick="Pages._rptSetRange('year')">This Year</button>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <div class="sb"><div class="sb-lbl">Total Sales</div><div class="sb-val">${fmt(totSale)}</div>
          <div class="sb-sub">Recv: ${fmt(totSaleRecv)} | Due: ${fmt(totSaleDue)}</div></div></div>
      <div class="stat-card"><div class="si brown"><i class="fa-solid fa-basket-shopping"></i></div>
        <div class="sb"><div class="sb-lbl">Total Purchases</div><div class="sb-val">${fmt(totPurch)}</div>
          <div class="sb-sub">Paid: ${fmt(totPurchPaid)} | Due: ${fmt(totPurchDue)}</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-receipt"></i></div>
        <div class="sb"><div class="sb-lbl">Total Expenses</div><div class="sb-val">${fmt(totExp)}</div>
          <div class="sb-sub">${exps.length} entries</div></div></div>
      <div class="stat-card">
        <div class="si ${estProfit >= 0 ? 'green' : 'red'}"><i class="fa-solid fa-chart-line"></i></div>
        <div class="sb"><div class="sb-lbl">Est. Net Profit</div>
          <div class="sb-val ${estProfit >= 0 ? 'ts' : 'td'}">${fmt(estProfit)}</div>
          <div class="sb-sub">Recv − Purch − Exp</div></div></div>
    </div>

    <!-- PRODUCTION KPIs -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-industry"></i></div>
        <div class="sb"><div class="sb-lbl">Production Batches</div><div class="sb-val">${batches.length}</div></div></div>
      <div class="stat-card"><div class="si brown"><i class="fa-solid fa-wheat-awn"></i></div>
        <div class="sb"><div class="sb-lbl">Total Input (kg)</div><div class="sb-val">${fmtN(totInputKg)}</div></div></div>
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-boxes-stacked"></i></div>
        <div class="sb"><div class="sb-lbl">Total Output (kg)</div><div class="sb-val">${fmtN(totOutputKg)}</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="sb"><div class="sb-lbl">Total Wastage (kg)</div><div class="sb-val">${fmtN(totWasteKg)}</div>
          <div class="sb-sub">Yield: ${totInputKg > 0 ? ((totOutputKg / totInputKg) * 100).toFixed(1) : 0}%</div></div></div>
    </div>

    <!-- CHARTS ROW 1 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-line"></i> Daily Sales Trend</div>
        <canvas id="rChartSales" height="200"></canvas>
      </div>
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-pie"></i> Product Output Distribution</div>
        <canvas id="rChartProd" height="200"></canvas>
      </div>
    </div>

    <!-- CHARTS ROW 2 -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-bar"></i> Product Sales (Amount)</div>
        <canvas id="rChartProdSales" height="200"></canvas>
      </div>
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-bar"></i> Expense by Category</div>
        <canvas id="rChartExp" height="200"></canvas>
      </div>
    </div>

    <!-- TABLES ROW -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">

      <!-- Product-wise Sales -->
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-boxes-stacked"></i> Product-wise Sales</div>
        <div class="table-wrap"><table class="dt">
          <thead><tr><th>Product</th><th>Bags</th><th>Qty (kg)</th><th>Amount</th></tr></thead>
          <tbody>
            ${Object.entries(prodSales).length
              ? Object.entries(prodSales).sort((a,b)=>b[1].amt-a[1].amt).map(([n,v]) =>
                `<tr><td class="fw6">${esc(n)}</td><td class="mono">${fmtN(v.bags)}</td><td class="mono">${fmtN(v.qty)}</td><td class="mono fw6">${fmt(v.amt)}</td></tr>`).join('')
              : '<tr><td colspan="4" class="tc tmut" style="padding:18px">No sales data.</td></tr>'}
          </tbody>
          <tfoot><tr>
            <td class="fw6">Total</td>
            <td class="mono">${fmtN(Object.values(prodSales).reduce((s,v)=>s+v.bags,0))}</td>
            <td class="mono">${fmtN(Object.values(prodSales).reduce((s,v)=>s+v.qty,0))} kg</td>
            <td class="mono fw6">${fmt(Object.values(prodSales).reduce((s,v)=>s+v.amt,0))}</td>
          </tr></tfoot>
        </table></div>
      </div>

      <!-- Expense Breakdown -->
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-receipt"></i> Expense by Category</div>
        <div class="table-wrap"><table class="dt">
          <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
          <tbody>
            ${Object.entries(catExp).length
              ? Object.entries(catExp).sort((a,b)=>b[1]-a[1]).map(([n,v]) =>
                `<tr><td class="fw6">${esc(n)}</td><td class="mono fw6 td">${fmt(v)}</td>
                 <td class="mono">${totExp > 0 ? ((v/totExp)*100).toFixed(1) : 0}%</td></tr>`).join('')
              : '<tr><td colspan="3" class="tc tmut" style="padding:18px">No expenses.</td></tr>'}
          </tbody>
          <tfoot><tr><td class="fw6">Total</td><td class="mono fw6 td">${fmt(totExp)}</td><td>100%</td></tr></tfoot>
        </table></div>
      </div>
    </div>

    <!-- Vendor-wise Purchases -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-truck-ramp-box"></i> Vendor-wise Purchases</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Vendor</th><th>Orders</th><th>Weight (kg)</th><th>Total Amount</th><th>Amount Paid</th><th>Balance Due</th></tr></thead>
        <tbody>
          ${Object.entries(vendPurch).length
            ? Object.entries(vendPurch).sort((a,b)=>b[1].amt-a[1].amt).map(([n,v]) =>
              `<tr><td class="fw6">${esc(n)}</td>
               <td class="mono">${purchases.filter(p=>gl('vendors',p.vendor_id,'name')===n).length}</td>
               <td class="mono">${fmtN(v.qty)} kg</td>
               <td class="mono fw6">${fmt(v.amt)}</td>
               <td class="mono ts">${fmt(v.paid)}</td>
               <td class="mono ${v.due>0?'td fw6':''}">${fmt(v.due)}</td></tr>`).join('')
            : '<tr><td colspan="6" class="tc tmut" style="padding:18px">No purchases.</td></tr>'}
        </tbody>
        <tfoot><tr>
          <td class="fw6">Total</td><td></td>
          <td class="mono">${fmtN(Object.values(vendPurch).reduce((s,v)=>s+v.qty,0))} kg</td>
          <td class="mono fw6">${fmt(Object.values(vendPurch).reduce((s,v)=>s+v.amt,0))}</td>
          <td class="mono ts">${fmt(Object.values(vendPurch).reduce((s,v)=>s+v.paid,0))}</td>
          <td class="mono fw6 td">${fmt(Object.values(vendPurch).reduce((s,v)=>s+v.due,0))}</td>
        </tr></tfoot>
      </table></div>
    </div>

    <!-- Customer-wise Sales -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-users"></i> Customer-wise Sales</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Customer</th><th>Orders</th><th>Total Amount</th><th>Received</th><th>Balance Due</th></tr></thead>
        <tbody>
          ${Object.entries(custSales).length
            ? Object.entries(custSales).sort((a,b)=>b[1].amt-a[1].amt).map(([n,v]) =>
              `<tr><td class="fw6">${esc(n)}</td>
               <td class="mono">${v.orders}</td>
               <td class="mono fw6">${fmt(v.amt)}</td>
               <td class="mono ts">${fmt(v.recv)}</td>
               <td class="mono ${v.due>0?'td fw6':''}">${fmt(v.due)}</td></tr>`).join('')
            : '<tr><td colspan="5" class="tc tmut" style="padding:18px">No sales.</td></tr>'}
        </tbody>
        <tfoot><tr>
          <td class="fw6">Total</td>
          <td class="mono">${Object.values(custSales).reduce((s,v)=>s+v.orders,0)}</td>
          <td class="mono fw6">${fmt(Object.values(custSales).reduce((s,v)=>s+v.amt,0))}</td>
          <td class="mono ts">${fmt(Object.values(custSales).reduce((s,v)=>s+v.recv,0))}</td>
          <td class="mono fw6 td">${fmt(Object.values(custSales).reduce((s,v)=>s+v.due,0))}</td>
        </tr></tfoot>
      </table></div>
    </div>

    <!-- P&L Summary -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-scale-balanced"></i> Profit & Loss Summary</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <table class="dt">
          <thead><tr><th colspan="2">Income</th></tr></thead>
          <tbody>
            <tr><td>Sales Received</td><td class="mono tr ts fw6">${fmt(totSaleRecv)}</td></tr>
            <tr><td>Sales Billed (Total)</td><td class="mono tr">${fmt(totSale)}</td></tr>
            <tr><td>Credit Sales (Unreceived)</td><td class="mono tr td">(${fmt(totSaleDue)})</td></tr>
          </tbody>
        </table>
        <table class="dt">
          <thead><tr><th colspan="2">Expenditure</th></tr></thead>
          <tbody>
            <tr><td>Purchases Paid</td><td class="mono tr td fw6">${fmt(totPurchPaid)}</td></tr>
            <tr><td>Total Expenses</td><td class="mono tr td fw6">${fmt(totExp)}</td></tr>
            <tr><td>Credit Purchases (Unpaid)</td><td class="mono tr tmut">${fmt(totPurchDue)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style="background:${estProfit>=0?'var(--success-bg)':'var(--danger-bg)'};border:1px solid ${estProfit>=0?'var(--success-b)':'var(--danger-b)'};border-radius:var(--r);padding:16px;margin-top:14px;text-align:center">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Estimated Net Profit</div>
        <div style="font-family:var(--fm);font-size:26px;font-weight:600;color:${estProfit>=0?'var(--success)':'var(--danger)'}">${fmt(estProfit)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">Sales Received − Purchases Paid − Expenses</div>
      </div>
    </div>
  `);

  // Draw charts after render
  setTimeout(() => {
    // Daily Sales Trend
    const c1 = document.getElementById('rChartSales');
    if (c1) new Chart(c1, {
      type: 'line',
      data: {
        labels: rangeDays.map(d => fmtDate(d)),
        datasets: [
          { label: 'Sales',    data: dailySales, borderColor: 'rgba(27,58,45,1)',   backgroundColor: 'rgba(27,58,45,0.08)',  tension: 0.4, fill: true, pointRadius: 3 },
          { label: 'Expenses', data: dailyExp,   borderColor: 'rgba(192,57,43,1)',  backgroundColor: 'rgba(192,57,43,0.08)', tension: 0.4, fill: true, pointRadius: 3 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });

    // Product Output Doughnut
    const c2 = document.getElementById('rChartProd');
    if (c2 && Object.keys(prodOutput).length) new Chart(c2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(prodOutput),
        datasets: [{ data: Object.values(prodOutput), backgroundColor: ['rgba(27,58,45,.85)','rgba(201,168,76,.85)','rgba(26,107,58,.85)','rgba(26,74,122,.85)','rgba(183,104,10,.85)','rgba(100,60,180,.85)'], borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    else if (c2) { c2.parentElement.innerHTML += '<div class="empty" style="padding:20px"><i class="fa-solid fa-chart-pie"></i><p>No production data</p></div>'; }

    // Product Sales Bar
    const c3 = document.getElementById('rChartProdSales');
    if (c3 && Object.keys(prodSales).length) new Chart(c3, {
      type: 'bar',
      data: {
        labels: Object.keys(prodSales),
        datasets: [{ label: 'Sales Amount (Rs.)', data: Object.values(prodSales).map(v => v.amt), backgroundColor: 'rgba(27,58,45,0.82)', borderRadius: 5 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // Expense by Category Bar
    const c4 = document.getElementById('rChartExp');
    if (c4 && Object.keys(catExp).length) new Chart(c4, {
      type: 'bar',
      data: {
        labels: Object.keys(catExp),
        datasets: [{ label: 'Expenses (Rs.)', data: Object.values(catExp), backgroundColor: 'rgba(192,57,43,0.82)', borderRadius: 5 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }, 150);
};

// Quick date range helpers
Pages._rptSetRange = function (range) {
  const now = new Date();
  let from, to = today();
  if (range === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    from = d.toISOString().split('T')[0];
  } else if (range === 'month') {
    from = today().substring(0, 8) + '01';
  } else if (range === 'year') {
    from = today().substring(0, 4) + '-01-01';
  }
  $('#rFrom').val(from);
  $('#rTo').val(to);
  Pages.reports();
};

// ================================================================
// INVENTORY REPORT
// ================================================================
Pages.inventory = function () {
  const items = DB.all('items').filter(i => i.is_active);
  const prods = DB.all('products').filter(p => p.is_active);

  // Calculate stock from inventory ledger
  const calcStock = (filterFn) => {
    const entries = DB.all('inventory').filter(filterFn);
    const inQ     = entries.filter(r => r.qty > 0).reduce((s, r) => s + (r.qty || 0), 0);
    const outQ    = entries.filter(r => r.qty < 0).reduce((s, r) => s + (r.qty || 0), 0);
    return { in: inQ, out: Math.abs(outQ), stock: inQ + outQ, entries };
  };

  // Build item rows with movement detail
  const itemRows = items.map(i => {
    const st = calcStock(r => r.item_id === i.id);
    return { id: i.id, name: i.name, unit: i.unit, type: 'input', ...st };
  });

  const prodRows = prods.map(pr => {
    const st = calcStock(r => r.prod_id === pr.id);
    return { id: pr.id, name: pr.name, category: pr.category, unit: pr.unit, type: 'product', ...st };
  });

  const totalInputStock  = itemRows.reduce((s, r) => s + r.stock, 0);
  const totalProdStock   = prodRows.reduce((s, r) => s + r.stock, 0);
  const lowStockItems    = [...itemRows, ...prodRows].filter(r => r.stock <= 0);

  $('#pageArea').html(`
    <div class="ph">
      <div class="ph-left"><h2>Inventory Report</h2><p>Current stock levels for all items and products</p></div>
      <div class="ph-right">
        <button class="btn btn-ghost btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
        <button class="btn btn-primary btn-sm" onclick="Pages._inventoryMovement()"><i class="fa-solid fa-timeline"></i> Full Movement</button>
      </div>
    </div>

    ${lowStockItems.length ? `
    <div class="warn-box">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>${lowStockItems.length} item(s) have zero or negative stock:</strong>
      ${lowStockItems.map(r => `<span class="badge b-danger" style="margin-left:5px">${esc(r.name)}: ${fmtN(r.stock)} kg</span>`).join('')}
    </div>` : ''}

    <!-- Summary Cards -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
      <div class="stat-card"><div class="si amber"><i class="fa-solid fa-wheat-awn"></i></div>
        <div class="sb"><div class="sb-lbl">Input Items</div><div class="sb-val">${items.length}</div>
          <div class="sb-sub">Total stock: ${fmtN(totalInputStock)} kg</div></div></div>
      <div class="stat-card"><div class="si green"><i class="fa-solid fa-boxes-stacked"></i></div>
        <div class="sb"><div class="sb-lbl">Output Products</div><div class="sb-val">${prods.length}</div>
          <div class="sb-sub">Total stock: ${fmtN(totalProdStock)} kg</div></div></div>
      <div class="stat-card"><div class="si blue"><i class="fa-solid fa-arrow-down-left"></i></div>
        <div class="sb"><div class="sb-lbl">Total Items Purchased</div>
          <div class="sb-val">${fmtN(itemRows.reduce((s,r)=>s+r.in,0))} kg</div></div></div>
      <div class="stat-card"><div class="si red"><i class="fa-solid fa-arrow-up-right"></i></div>
        <div class="sb"><div class="sb-lbl">Total Products Sold</div>
          <div class="sb-val">${fmtN(prodRows.reduce((s,r)=>s+r.out,0))} kg</div></div></div>
    </div>

    <!-- Input Items Table -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-wheat-awn"></i> Raw Input Items</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Item</th><th>Unit</th><th>Total Purchased</th><th>Consumed in Production</th><th>Current Stock</th><th>Status</th></tr></thead>
        <tbody>
          ${itemRows.map(r => `<tr>
            <td class="fw6">${esc(r.name)}</td>
            <td>${esc(r.unit)}</td>
            <td class="mono ts">${fmtN(r.in)} kg</td>
            <td class="mono tw">${fmtN(r.out)} kg</td>
            <td class="mono fw6 ${r.stock < 0 ? 'td' : r.stock === 0 ? 'tmut' : 'ts'}">${fmtN(r.stock)} kg</td>
            <td>${r.stock < 0
              ? '<span class="badge b-danger">Deficit</span>'
              : r.stock === 0
                ? '<span class="badge b-neutral">Empty</span>'
                : '<span class="badge b-success">In Stock</span>'}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="tc tmut" style="padding:20px">No input items.</td></tr>'}
        </tbody>
        <tfoot><tr>
          <td colspan="2" class="fw6">Total</td>
          <td class="mono ts">${fmtN(itemRows.reduce((s,r)=>s+r.in,0))} kg</td>
          <td class="mono tw">${fmtN(itemRows.reduce((s,r)=>s+r.out,0))} kg</td>
          <td class="mono fw6">${fmtN(totalInputStock)} kg</td>
          <td></td>
        </tr></tfoot>
      </table></div>
    </div>

    <!-- Output Products Table -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-boxes-stacked"></i> Output Products</div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>Product</th><th>Category</th><th>Total Produced</th><th>Total Sold</th><th>Current Stock</th><th>Status</th></tr></thead>
        <tbody>
          ${prodRows.map(r => `<tr>
            <td class="fw6">${esc(r.name)}</td>
            <td>${sbadge(r.category)}</td>
            <td class="mono ts">${fmtN(r.in)} kg</td>
            <td class="mono td">${fmtN(r.out)} kg</td>
            <td class="mono fw6 ${r.stock < 0 ? 'td' : r.stock === 0 ? 'tmut' : 'ts'}">${fmtN(r.stock)} kg</td>
            <td>${r.stock < 0
              ? '<span class="badge b-danger">Deficit</span>'
              : r.stock === 0
                ? '<span class="badge b-neutral">Empty</span>'
                : '<span class="badge b-success">In Stock</span>'}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="tc tmut" style="padding:20px">No output products.</td></tr>'}
        </tbody>
        <tfoot><tr>
          <td colspan="2" class="fw6">Total</td>
          <td class="mono ts">${fmtN(prodRows.reduce((s,r)=>s+r.in,0))} kg</td>
          <td class="mono td">${fmtN(prodRows.reduce((s,r)=>s+r.out,0))} kg</td>
          <td class="mono fw6">${fmtN(totalProdStock)} kg</td>
          <td></td>
        </tr></tfoot>
      </table></div>
    </div>

    <!-- Stock Flow Chart -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-bar"></i> Input Items — Stock Flow</div>
        <canvas id="iChartItems" height="200"></canvas>
      </div>
      <div class="chart-card">
        <div class="card-title"><i class="fa-solid fa-chart-bar"></i> Output Products — Produced vs Sold</div>
        <canvas id="iChartProds" height="200"></canvas>
      </div>
    </div>
  `);

  // Charts
  setTimeout(() => {
    const c1 = document.getElementById('iChartItems');
    if (c1 && itemRows.length) new Chart(c1, {
      type: 'bar',
      data: {
        labels: itemRows.map(r => r.name),
        datasets: [
          { label: 'Purchased', data: itemRows.map(r => r.in),    backgroundColor: 'rgba(26,107,58,0.8)',  borderRadius: 5 },
          { label: 'Consumed',  data: itemRows.map(r => r.out),   backgroundColor: 'rgba(183,104,10,0.8)', borderRadius: 5 },
          { label: 'In Stock',  data: itemRows.map(r => Math.max(0, r.stock)), backgroundColor: 'rgba(27,58,45,0.8)', borderRadius: 5 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });

    const c2 = document.getElementById('iChartProds');
    if (c2 && prodRows.length) new Chart(c2, {
      type: 'bar',
      data: {
        labels: prodRows.map(r => r.name),
        datasets: [
          { label: 'Produced', data: prodRows.map(r => r.in),  backgroundColor: 'rgba(26,107,58,0.8)',  borderRadius: 5 },
          { label: 'Sold',     data: prodRows.map(r => r.out), backgroundColor: 'rgba(192,57,43,0.8)',  borderRadius: 5 },
          { label: 'In Stock', data: prodRows.map(r => Math.max(0, r.stock)), backgroundColor: 'rgba(27,58,45,0.8)', borderRadius: 5 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
  }, 150);
};

// Full Inventory Movement modal
Pages._inventoryMovement = function () {
  const entries = DB.all('inventory').reverse().slice(0, 50);
  const rows = entries.map(e => {
    const itemName = e.item_id  ? gl('items',    e.item_id,  'name') : '—';
    const prodName = e.prod_id  ? gl('products', e.prod_id,  'name') : '—';
    return `<tr>
      <td>${fmtDate(e.ts ? e.ts.split('T')[0] : '—')}</td>
      <td>${esc(itemName !== '—' ? itemName : prodName)}</td>
      <td><span class="badge ${e.qty > 0 ? 'b-success' : 'b-danger'}">${esc(e.etype.replace(/_/g,' '))}</span></td>
      <td class="mono fw6 ${e.qty > 0 ? 'ts' : 'td'}">${e.qty > 0 ? '+' : ''}${fmtN(e.qty)} kg</td>
      <td style="font-size:12px;color:var(--text3)">${esc(e.ref || '—')}</td>
    </tr>`;
  }).join('');

  Modal.open('Inventory Movement (Last 50 Entries)', `
    <div class="table-wrap"><table class="dt">
      <thead><tr><th>Date</th><th>Item / Product</th><th>Type</th><th>Qty (kg)</th><th>Reference</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="tc tmut" style="padding:24px">No inventory movements.</td></tr>'}</tbody>
    </table></div>`,
  false, { large: true });
};
