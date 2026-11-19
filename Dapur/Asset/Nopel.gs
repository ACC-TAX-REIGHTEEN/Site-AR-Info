function buildNopelPayload_(ss, userNopelPrefix, userNopelSales) {
  var nopelSheet = ss.getSheetByName('Nopel');
  if (!nopelSheet) {
    return {
      success: false,
      message: 'Sheet Nopel tidak ditemukan!',
      items: [],
      waktuPembaruan: '-'
    };
  }

  var prefixesNopel = String(userNopelPrefix || '')
    .split('|')
    .map(function(s) { return s.trim().toUpperCase(); })
    .filter(function(s) { return s !== ''; });

  var salesFilters = String(userNopelSales || '')
    .split('|')
    .map(function(s) { return s.trim().toUpperCase(); })
    .filter(function(s) { return s !== ''; });

  var nopelValues = nopelSheet.getDataRange().getValues();
  var filteredRows = [];
  var waktuPembaruan = '-';

  if (nopelValues.length > 1 && nopelValues[1].length > 7 && nopelValues[1][7]) {
    waktuPembaruan = formatWaktuPembaruan(nopelValues[1][7]);
  } else {
    try {
      var h2Value = nopelSheet.getRange('H2').getValue();
      if (h2Value) {
        waktuPembaruan = formatWaktuPembaruan(h2Value);
      }
    } catch (e) {}
  }

  if (nopelValues.length > 1) {
    var rawRows = nopelValues.slice(1);

    for (var r = 0; r < rawRows.length; r++) {
      var row = rawRows[r];
      var noPelanggan = String(row[0] || '').trim();
      if (!noPelanggan) continue;

      var salesName  = String(row[5] || '').trim();
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
    }
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

function getNopelData(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var confSheet = ss.getSheetByName('conf');

  if (!confSheet) {
    return {
      success: false,
      message: 'Sheet conf tidak ditemukan!'
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

  return buildNopelPayload_(ss, userNopelPrefix, userNopelSales);
}