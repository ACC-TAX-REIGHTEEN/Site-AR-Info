function getSummaryData(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  var piutangSheet = ss.getSheetByName('Piutang');
  
  if (!confSheet || !piutangSheet) {
    return { success: false, message: 'Sheet conf atau Piutang tidak ditemukan!' };
  }
  
  var confData = confSheet.getDataRange().getValues();
  var userFound = false;
  var userGrup1 = '', userGrup2 = '', userGrup3 = '', userGrup4 = '';
  var hasSummaryAccess = false;
  
  var cleanUsername = String(username || '').trim().toUpperCase();

  for (var i = 1; i < confData.length; i++) {
    var registeredUser = String(confData[i][0] || '').trim().toUpperCase();
    if (registeredUser === cleanUsername) {
      userFound = true;
      userGrup1 = String(confData[i][2] || '').trim();
      userGrup2 = String(confData[i][3] || '').trim();
      userGrup3 = String(confData[i][4] || '').trim();
      userGrup4 = String(confData[i][5] || '').trim();
      
      var ringkasanVal = String(confData[i][7] || '').trim().toUpperCase();
      hasSummaryAccess = (ringkasanVal === 'YA');
      break;
    }
  }
  
  if (!userFound || !hasSummaryAccess) {
    return {
      success: false,
      message: 'Akses Ditolak! Anda tidak memiliki izin untuk membuka fitur Ringkasan.'
    };
  }
  
  var prefixesGrup1 = userGrup1 ? userGrup1.split('|').map(function(s){ return s.trim(); }) : [];
  var keywordsGrup2 = userGrup2 ? userGrup2.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  var keywordsGrup3 = userGrup3 ? userGrup3.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  var keywordsGrup4 = userGrup4 ? userGrup4.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  
  var today = new Date();
  today.setHours(0,0,0,0);

  var piutangValues = piutangSheet.getDataRange().getValues();
  var rawRows = piutangValues.length > 1 ? piutangValues.slice(1) : [];
  
  var userRows = [];

  rawRows.forEach(function(row) {
    var noPelanggan = String(row[0] || '').trim();
    var namaPenjual = String(row[8] || '').trim().toUpperCase();
    var namaKontak  = String(row[9] || '').trim().toUpperCase();
    
    var matchGrup1 = (prefixesGrup1.length === 0);
    if (!matchGrup1) {
      for (var p = 0; p < prefixesGrup1.length; p++) {
        if (prefixesGrup1[p] && noPelanggan.indexOf(prefixesGrup1[p]) === 0) { matchGrup1 = true; break; }
      }
    }
    
    var matchGrup2 = (keywordsGrup2.length === 0);
    if (!matchGrup2) {
      for (var k = 0; k < keywordsGrup2.length; k++) {
        if (keywordsGrup2[k] && namaKontak.indexOf(keywordsGrup2[k]) !== -1) { matchGrup2 = true; break; }
      }
    }

    var matchGrup3 = (keywordsGrup3.length === 0);
    if (!matchGrup3) {
      for (var m = 0; m < keywordsGrup3.length; m++) {
        if (keywordsGrup3[m] && namaPenjual.indexOf(keywordsGrup3[m]) !== -1) { matchGrup3 = true; break; }
      }
    }

    var matchGrup4 = true;
    if (keywordsGrup4.length > 0) {
      for (var n = 0; n < keywordsGrup4.length; n++) {
        if (keywordsGrup4[n] && namaPenjual.indexOf(keywordsGrup4[n]) !== -1) { matchGrup4 = false; break; }
      }
    }
    
    if (matchGrup1 && matchGrup2 && matchGrup3 && matchGrup4) {
      var tglFakturRaw = row[2];
      var tglFakturDate = null;
      if (tglFakturRaw instanceof Date) {
        tglFakturDate = new Date(tglFakturRaw.getTime());
      } else if (typeof tglFakturRaw === 'string' && tglFakturRaw.trim() !== '') {
        tglFakturDate = new Date(tglFakturRaw);
      }
      
      var umurFakturDays = 0;
      if (tglFakturDate && !isNaN(tglFakturDate.getTime())) {
        tglFakturDate.setHours(0,0,0,0);
        var diffTime = today.getTime() - tglFakturDate.getTime();
        umurFakturDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      var rawUmurJt = String(row[6] || '');
      var parsedUmurJtNum = parseInt(rawUmurJt.replace(/[^0-9-]/g, '')) || 0;

      userRows.push({
        noPelanggan: noPelanggan,
        noFaktur: String(row[1] || ''),
        tglFaktur: formatDate(row[2]),
        jatuhTempo: formatDate(row[3]),
        nilaiFaktur: Number(row[4]) || 0,
        sisaPiutang: Number(row[5]) || 0,
        umurJtStr: rawUmurJt,
        umurJtNum: parsedUmurJtNum,
        umurFakturDays: umurFakturDays,
        namaPelanggan: String(row[7] || ''),
        namaPenjual: String(row[8] || ''),
        namaKontak: String(row[9] || ''),
        tanggalJt: String(row[10] || '')
      });
    }
  });

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

  var feature1List = userRows.slice();
  feature1List.sort(function(a, b) {
    if (b.umurJtNum !== a.umurJtNum) return b.umurJtNum - a.umurJtNum;
    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
  var feature1Summary = buildBucketSummary(userRows, function(item) { return item.umurJtNum; });

  var feature2List = userRows.slice();
  feature2List.sort(function(a, b) {
    if (b.umurFakturDays !== a.umurFakturDays) return b.umurFakturDays - a.umurFakturDays;
    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
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

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return val.getDate() + ' ' + months[val.getMonth()] + ' ' + val.getFullYear();
  }
  return String(val);
}