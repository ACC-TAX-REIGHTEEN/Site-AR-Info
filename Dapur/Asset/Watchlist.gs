function getWatchlistData(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  var piutangSheet = ss.getSheetByName('Piutang');
  
  if (!confSheet || !piutangSheet) {
    return { success: false, message: 'Sheet conf atau Piutang tidak ditemukan!' };
  }
  
  var confData = confSheet.getDataRange().getValues();
  var userFound = false;
  var userGrup1 = '', userGrup2 = '', userGrup3 = '', userGrup4 = '', userHari = '';
  var hasWatchlistAccess = false;
  
  var cleanUsername = String(username || '').trim().toUpperCase();

  for (var i = 1; i < confData.length; i++) {
    var registeredUser = String(confData[i][0] || '').trim().toUpperCase();
    if (registeredUser === cleanUsername) {
      userFound = true;
      userGrup1 = String(confData[i][2] || '').trim();
      userGrup2 = String(confData[i][3] || '').trim();
      userGrup3 = String(confData[i][4] || '').trim();
      userGrup4 = String(confData[i][5] || '').trim();
      userHari  = String(confData[i][6] || '').trim();
      
      var watchlistVal = String(confData[i][8] || '').trim().toUpperCase();
      hasWatchlistAccess = (watchlistVal === 'YA');
      break;
    }
  }
  
  if (!userFound || !hasWatchlistAccess) {
    return {
      success: false,
      message: 'Akses Ditolak! Anda tidak memiliki izin untuk membuka fitur Watchlist.'
    };
  }
  
  var prefixesGrup1 = userGrup1 ? userGrup1.split('|').map(function(s){ return s.trim(); }) : [];
  var keywordsGrup2 = userGrup2 ? userGrup2.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  var keywordsGrup3 = userGrup3 ? userGrup3.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  var keywordsGrup4 = userGrup4 ? userGrup4.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  
  var isInv = userHari.toLowerCase() === 'inv';
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var piutangValues = piutangSheet.getDataRange().getValues();
  var rawRows = piutangValues.length > 1 ? piutangValues.slice(1) : [];
  
  var watchlistRows = [];
  var entityMap = {};
  var entityList = [];

  rawRows.forEach(function(row) {
    var noPelanggan = String(row[0] || '').trim();
    var namaPenjual = String(row[8] || '').trim().toUpperCase();
    var namaKontak  = String(row[9] || '').trim().toUpperCase();
    
    var matchGrup1 = (prefixesGrup1.length === 0);
    if (!matchGrup1) {
      for (var p = 0; p < prefixesGrup1.length; p++) {
        if (prefixesGrup1[p] && noPelanggan.indexOf(prefixesGrup1[p]) === 0) {
          matchGrup1 = true;
          break;
        }
      }
    }
    
    var matchGrup2 = (keywordsGrup2.length === 0);
    if (!matchGrup2) {
      for (var k = 0; k < keywordsGrup2.length; k++) {
        if (keywordsGrup2[k] && namaKontak.indexOf(keywordsGrup2[k]) !== -1) {
          matchGrup2 = true;
          break;
        }
      }
    }

    var matchGrup3 = (keywordsGrup3.length === 0);
    if (!matchGrup3) {
      for (var m = 0; m < keywordsGrup3.length; m++) {
        if (keywordsGrup3[m] && namaPenjual.indexOf(keywordsGrup3[m]) !== -1) {
          matchGrup3 = true;
          break;
        }
      }
    }

    var matchGrup4 = true;
    if (keywordsGrup4.length > 0) {
      for (var n = 0; n < keywordsGrup4.length; n++) {
        if (keywordsGrup4[n] && namaPenjual.indexOf(keywordsGrup4[n]) !== -1) {
          matchGrup4 = false;
          break;
        }
      }
    }
    
    if (matchGrup1 && matchGrup2 && matchGrup3 && matchGrup4) {
      var umurJtVal = String(row[6] || '');
      if (isInv) {
        var tglFakturRaw = row[2];
        var tglFakturDate = null;
        if (tglFakturRaw instanceof Date) {
          tglFakturDate = new Date(tglFakturRaw.getTime());
        } else if (typeof tglFakturRaw === 'string' && tglFakturRaw.trim() !== '') {
          tglFakturDate = new Date(tglFakturRaw);
        }
        
        if (tglFakturDate && !isNaN(tglFakturDate.getTime())) {
          tglFakturDate.setHours(0, 0, 0, 0);
          var diffTime = today.getTime() - tglFakturDate.getTime();
          var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          umurJtVal = diffDays + ' hari';
        }
      }

      var namaPelangganClean = String(row[7] || '');
      var namaPenjualClean   = String(row[8] || '');
      var namaKontakClean    = String(row[9] || '');

      var entityKey = noPelanggan + ' | ' + namaPelangganClean + ' | ' + namaKontakClean;
      if (!entityMap[entityKey]) {
        entityMap[entityKey] = true;
        entityList.push({
          noPelanggan: noPelanggan,
          namaPelanggan: namaPelangganClean,
          namaKontak: namaKontakClean,
          label: entityKey
        });
      }

      watchlistRows.push({
        noPelanggan: noPelanggan,
        noFaktur: String(row[1] || ''),
        tglFaktur: formatDateWatchlist(row[2]),
        jatuhTempo: formatDateWatchlist(row[3]),
        nilaiFaktur: Number(row[4]) || 0,
        sisaPiutang: Number(row[5]) || 0,
        umurJt: umurJtVal,
        namaPelanggan: namaPelangganClean,
        namaPenjual: namaPenjualClean,
        namaKontak: namaKontakClean,
        tanggalJt: String(row[10] || '')
      });
    }
  });

  entityList.sort(function(a, b) {
    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  watchlistRows.sort(function(a, b) {
    var cmpFaktur = String(a.noFaktur || '').localeCompare(String(b.noFaktur || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (cmpFaktur !== 0) return cmpFaktur;

    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  return {
    success: true,
    items: watchlistRows,
    entities: entityList
  };
}

function formatDateWatchlist(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return val.getDate() + ' ' + months[val.getMonth()] + ' ' + val.getFullYear();
  }
  return String(val);
}