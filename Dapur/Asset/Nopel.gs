function getNopelData(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');
  var nopelSheet = ss.getSheetByName('Nopel');

  if (!confSheet || !nopelSheet) {
    return {
      success: false,
      message: 'Sheet conf atau Nopel tidak ditemukan!'
    };
  }

  var confData = confSheet.getDataRange().getValues();
  var cleanUsername = String(username || '').trim().toUpperCase();
  var userFound = false;
  var userNopelPrefix = '';
  var userNopelSales = '';

  for (var i = 1; i < confData.length; i++) {
    var registeredUser = String(confData[i][0] || '').trim().toUpperCase();
    if (registeredUser === cleanUsername) {
      userFound = true;
      userNopelPrefix = String(confData[i][9] || '').trim();
      userNopelSales  = String(confData[i][10] || '').trim();
      break;
    }
  }

  if (!userFound || !userNopelPrefix) {
    return {
      success: false,
      message: 'Akses Ditolak! Anda tidak memiliki izin untuk membuka fitur Nopel.'
    };
  }

  var prefixesNopel = userNopelPrefix
    .split('|')
    .map(function(s) { return s.trim().toUpperCase(); })
    .filter(function(s) { return s !== ''; });

  var salesFilters = userNopelSales
    .split('|')
    .map(function(s) { return s.trim().toUpperCase(); })
    .filter(function(s) { return s !== ''; });

  var nopelValues = nopelSheet.getDataRange().getValues();
  var filteredRows = [];
  var waktuPembaruan = '-';

  if (nopelValues.length > 1) {
    if (nopelValues[1].length > 7 && nopelValues[1][7]) {
      waktuPembaruan = formatWaktuPembaruan(nopelValues[1][7]);
    }

    var rawRows = nopelValues.slice(1);

    rawRows.forEach(function(row) {
      var noPelanggan = String(row[0] || '').trim();
      var salesName   = String(row[5] || '').trim();
      if (!noPelanggan) return;

      var noPelUpper = noPelanggan.toUpperCase();
      var salesUpper = salesName.toUpperCase();

      var matchPrefix = false;
      for (var p = 0; p < prefixesNopel.length; p++) {
        var pfx = prefixesNopel[p];
        if (pfx && noPelUpper.indexOf(pfx) === 0) {
          matchPrefix = true;
          break;
        }
      }

      var matchSales = (salesFilters.length === 0);
      if (!matchSales) {
        for (var s = 0; s < salesFilters.length; s++) {
          var sf = salesFilters[s];
          if (sf && salesUpper.indexOf(sf) !== -1) {
            matchSales = true;
            break;
          }
        }
      }

      if (matchPrefix && matchSales) {
        filteredRows.push({
          noPelanggan: noPelanggan,
          namaPelanggan: String(row[1] || '').trim(),
          telepon: String(row[2] || '').trim(),
          namaKontak: String(row[3] || '').trim(),
          status: String(row[4] || '').trim(),
          sales: salesName
        });
      }
    });
  }

  filteredRows.sort(function(a, b) {
    var nameA = a.namaPelanggan.toLowerCase();
    var nameB = b.namaPelanggan.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    var noA = a.noPelanggan.toLowerCase();
    var noB = b.noPelanggan.toLowerCase();
    if (noA < noB) return -1;
    if (noA > noB) return 1;
    return 0;
  });

  return {
    success: true,
    items: filteredRows,
    waktuPembaruan: waktuPembaruan
  };
}