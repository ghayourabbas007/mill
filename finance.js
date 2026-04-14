/* MILLPRO — finance.js (stub) */
'use strict';
['cash-register','bank-accounts','expenses','fund-transfers','cheques','daily-balance','day-end','reports'].forEach(pg => {
  Pages[pg] = function() {
    $('#pageArea').html('<div class="card"><div class="empty"><i class="fa-solid fa-wrench"></i><h4>' + pg + ' — coming soon</h4><p>Full module will be added in the next delivery.</p></div></div>');
  };
});
