function getSummaryData(username) {
  var baseRes = getARData(username);
  if (!baseRes || !baseRes.success || !baseRes.hasSummaryAccess) {
    return {
      success: false,
      message: 'Akses Ditolak! Anda tidak memiliki izin untuk membuka fitur Ringkasan.'
    };
  }

  var userRows = baseRes.items || [];
  var penjualMap = {};
  userRows.forEach(function(item) {
    if (item.namaPenjual && item.namaPenjual.trim() !== '') {
      penjualMap[item.namaPenjual.trim()] = true;
    }
  });
  var penjualList = Object.keys(penjualMap).sort();

  function buildBucketSummary(items, getDaysFn) {
    var buckets = {
      '< 30 Hari': { label: '< 30 Hari', totalFaktur: 0, totalPiutang: 0 },
      '0-30 Hari': { label: '0 - 30 Hari', totalFaktur: 0, totalPiutang: 0 },
      '31-60 Hari': { label: '31 - 60 Hari', totalFaktur: 0, totalPiutang: 0 },
      '61-90 Hari': { label: '61 - 90 Hari', totalFaktur: 0, totalPiutang: 0 },
      '91-120 Hari': { label: '91 - 120 Hari', totalFaktur: 0, totalPiutang: 0 },
      '> 120 Hari': { label: '> 120 Hari', totalFaktur: 0, totalPiutang: 0 }
    };

    items.forEach(function(item) {
      var days = getDaysFn(item);
      if (days < 0) {
        buckets['< 30 Hari'].totalFaktur++;
        buckets['< 30 Hari'].totalPiutang += item.sisaPiutang;
      } else if (days >= 0 && days <= 30) {
        buckets['0-30 Hari'].totalFaktur++;
        buckets['0-30 Hari'].totalPiutang += item.sisaPiutang;
      } else if (days >= 31 && days <= 60) {
        buckets['31-60 Hari'].totalFaktur++;
        buckets['31-60 Hari'].totalPiutang += item.sisaPiutang;
      } else if (days >= 61 && days <= 90) {
        buckets['61-90 Hari'].totalFaktur++;
        buckets['61-90 Hari'].totalPiutang += item.sisaPiutang;
      } else if (days >= 91 && days <= 120) {
        buckets['91-120 Hari'].totalFaktur++;
        buckets['91-120 Hari'].totalPiutang += item.sisaPiutang;
      } else if (days > 120) {
        buckets['> 120 Hari'].totalFaktur++;
        buckets['> 120 Hari'].totalPiutang += item.sisaPiutang;
      }
    });

    var totalFaktur = 0;
    var totalPiutang = 0;
    Object.keys(buckets).forEach(function(k) {
      totalFaktur += buckets[k].totalFaktur;
      totalPiutang += buckets[k].totalPiutang;
    });

    return {
      buckets: buckets,
      totals: { totalFaktur: totalFaktur, totalPiutang: totalPiutang }
    };
  }

  var feature1List = userRows.slice().sort(function(a, b) {
    if (b.umurJtNum !== a.umurJtNum) return b.umurJtNum - a.umurJtNum;
    return a.namaPelanggan.toLowerCase().localeCompare(b.namaPelanggan.toLowerCase());
  });

  var feature2List = userRows.slice().sort(function(a, b) {
    if (b.umurFakturDays !== a.umurFakturDays) return b.umurFakturDays - a.umurFakturDays;
    return a.namaPelanggan.toLowerCase().localeCompare(b.namaPelanggan.toLowerCase());
  });

  var feature1Summary = buildBucketSummary(userRows, function(item) { return item.umurJtNum; });
  var feature2Summary = buildBucketSummary(userRows, function(item) { return item.umurFakturDays; });

  return {
    success: true,
    penjualList: penjualList,
    feature1: {
      items: feature1List,
      buckets: feature1Summary.buckets,
      totals: feature1Summary.totals
    },
    feature2: {
      items: feature2List,
      buckets: feature2Summary.buckets,
      totals: feature2Summary.totals
    }
  };
}