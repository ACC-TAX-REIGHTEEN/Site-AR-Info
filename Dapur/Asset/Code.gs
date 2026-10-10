function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Site AR - PT ABC ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function checkLogin(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  if (!confSheet) return { success: false, message: 'Sheet conf tidak ditemukan!' };
  
  var data = confSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var user = String(data[i][0] || '').trim();
    var pass = String(data[i][1] || '').trim();
    if (user === username && pass === password) {
      return { success: true, username: user };
    }
  }
  return { success: false, message: 'Pengguna atau Sandi salah!' };
}

function changePassword(username, oldPassword, newPassword) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  if (!confSheet) return { success: false, message: 'Sheet conf tidak ditemukan!' };
  
  var data = confSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var user = String(data[i][0] || '').trim();
    var pass = String(data[i][1] || '').trim();
    if (user === username && pass === oldPassword) {
      confSheet.getRange(i + 1, 2).setValue(newPassword);
      return { success: true, message: 'Sandi berhasil diperbarui!' };
    }
  }
  return { success: false, message: 'Sandi lama tidak cocok!' };
}

function getARData(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  var piutangSheet = ss.getSheetByName('Piutang');
  
  if (!confSheet || !piutangSheet) {
    return { success: false, message: 'Sheet conf atau Piutang tidak ditemukan!' };
  }
  
  var confData = confSheet.getDataRange().getValues();
  var userFound = false;
  var userGrup1 = '';
  var userGrup2 = '';
  var userGrup3 = '';
  var userHari = '';
  
  var cleanUsername = String(username || '').trim().toUpperCase();

  for (var i = 1; i < confData.length; i++) {
    var registeredUser = String(confData[i][0] || '').trim().toUpperCase();
    if (registeredUser === cleanUsername) {
      userFound = true;
      userGrup1 = String(confData[i][2] || '').trim();
      userGrup2 = String(confData[i][3] || '').trim();
      userGrup3 = String(confData[i][4] || '').trim();
      userHari  = String(confData[i][5] || '').trim();
      break;
    }
  }
  
  if (!userFound) {
    return {
      success: false,
      message: 'Akses Ditolak! Akun "' + username + '" tidak terdaftar atau telah dihapus dari sistem.'
    };
  }
  
  var prefixesGrup1 = userGrup1 ? userGrup1.split('|').map(function(s){ return s.trim(); }) : [];
  var keywordsGrup2 = userGrup2 ? userGrup2.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  var keywordsGrup3 = userGrup3 ? userGrup3.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  
  var primaryDepoCode = prefixesGrup1.length > 0 ? prefixesGrup1[0] : '';
  var isInv = userHari.toLowerCase() === 'inv';
  
  var today = new Date();
  today.setHours(0,0,0,0);

  var piutangValues = piutangSheet.getDataRange().getValues();
  var filteredRows = [];
  
  if (piutangValues.length > 1) {
    var rawRows = piutangValues.slice(1);
    
    rawRows.forEach(function(row) {
      var noPelanggan = String(row[0] || '').trim();
      var namaPenjual = String(row[8] || '').trim().toUpperCase();
      var namaKontak  = String(row[9] || '').trim().toUpperCase();
      
      var matchGrup1 = false;
      if (prefixesGrup1.length === 0) {
        matchGrup1 = true;
      } else {
        for (var p = 0; p < prefixesGrup1.length; p++) {
          var pfx = prefixesGrup1[p];
          if (pfx && noPelanggan.indexOf(pfx) === 0) {
            matchGrup1 = true;
            break;
          }
        }
      }
      
      var matchGrup2 = false;
      if (keywordsGrup2.length === 0) {
        matchGrup2 = true;
      } else {
        for (var k = 0; k < keywordsGrup2.length; k++) {
          var kw2 = keywordsGrup2[k];
          if (kw2 && namaKontak.indexOf(kw2) !== -1) {
            matchGrup2 = true;
            break;
          }
        }
      }

      var matchGrup3 = false;
      if (keywordsGrup3.length === 0) {
        matchGrup3 = true;
      } else {
        for (var m = 0; m < keywordsGrup3.length; m++) {
          var kw3 = keywordsGrup3[m];
          if (kw3 && namaPenjual.indexOf(kw3) !== -1) {
            matchGrup3 = true;
            break;
          }
        }
      }
      
      if (matchGrup1 && matchGrup2 && matchGrup3) {
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
            tglFakturDate.setHours(0,0,0,0);
            var diffTime = today.getTime() - tglFakturDate.getTime();
            var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            umurJtVal = diffDays + ' hari';
          }
        }

        filteredRows.push({
          noPelanggan: noPelanggan,
          noFaktur: String(row[1] || ''),
          tglFaktur: formatDate(row[2]),
          jatuhTempo: formatDate(row[3]),
          nilaiFaktur: Number(row[4]) || 0,
          sisaPiutang: Number(row[5]) || 0,
          umurJt: umurJtVal,
          namaPelanggan: String(row[7] || ''),
          namaPenjual: String(row[8] || ''),
          namaKontak: String(row[9] || ''),
          tanggalJt: String(row[10] || '')
        });
      }
    });
  }
  
  filteredRows.sort(function(a, b) {
    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    
    var fA = a.noFaktur.toLowerCase();
    var fB = b.noFaktur.toLowerCase();
    if (fA < fB) return -1;
    if (fA > fB) return 1;
    return 0;
  });
  
  var bankMap = {};
  for (var b = 1; b < confData.length; b++) {
    var depoCode = String(confData[b][6] || '').trim();
    var bankInfo = String(confData[b][7] || '').trim();
    if (depoCode && bankInfo) {
      if (!bankMap[depoCode]) bankMap[depoCode] = [];
      if (bankMap[depoCode].indexOf(bankInfo) === -1) {
        bankMap[depoCode].push(bankInfo);
      }
    }
  }
  
  var bankOptions = [];
  Object.keys(bankMap).forEach(function(depo) {
    var isMatched = false;
    if (prefixesGrup1.length === 0) {
      isMatched = true;
    } else {
      for (var g = 0; g < prefixesGrup1.length; g++) {
        var pref = prefixesGrup1[g];
        if (pref === depo || depo.indexOf(pref) !== -1 || pref.indexOf(depo) !== -1) {
          isMatched = true;
          break;
        }
      }
    }
    
    if (isMatched) {
      var isPrimary = (primaryDepoCode && (depo === primaryDepoCode || depo.indexOf(primaryDepoCode) !== -1 || primaryDepoCode.indexOf(depo) !== -1));
      var banks = bankMap[depo];
      bankOptions.push({
        depo: depo,
        banks: banks,
        isLocked: isPrimary
      });
    }
  });
  
  return {
    success: true,
    items: filteredRows,
    bankOptions: bankOptions,
    isInv: isInv
  };
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return val.getDate() + ' ' + months[val.getMonth()] + ' ' + val.getFullYear();
  }
  return String(val);
}