var CACHE_TTL_SECONDS = 10800;
var CACHE_CHUNK_SIZE = 75000;

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Site AR - PT PRIMA TUNGGAL MANDIRI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setChunkedCache_(cache, baseKey, dataObj, ttlSeconds) {
  try {
    clearChunkedCache_(cache, baseKey);
    var jsonStr = JSON.stringify(dataObj);
    var totalChunks = Math.ceil(jsonStr.length / CACHE_CHUNK_SIZE);
    var chunkMap = {};

    for (var i = 0; i < totalChunks; i++) {
      var start = i * CACHE_CHUNK_SIZE;
      chunkMap[baseKey + '_c_' + i] = jsonStr.substring(start, start + CACHE_CHUNK_SIZE);
    }
    chunkMap[baseKey + '_meta'] = JSON.stringify({
      count: totalChunks,
      savedAt: Date.now()
    });

    cache.putAll(chunkMap, ttlSeconds);
    return true;
  } catch (e) {
    return false;
  }
}

function getChunkedCache_(cache, baseKey) {
  try {
    var metaRaw = cache.get(baseKey + '_meta');
    if (!metaRaw) return null;

    var meta = JSON.parse(metaRaw);
    if (!meta || !meta.count) return null;

    var keys = [];
    for (var i = 0; i < meta.count; i++) {
      keys.push(baseKey + '_c_' + i);
    }

    var chunks = cache.getAll(keys);
    var parts = [];
    for (var j = 0; j < meta.count; j++) {
      var part = chunks[keys[j]];
      if (part === undefined || part === null) return null;
      parts.push(part);
    }

    return JSON.parse(parts.join(''));
  } catch (e) {
    return null;
  }
}

function clearChunkedCache_(cache, baseKey) {
  try {
    var metaRaw = cache.get(baseKey + '_meta');
    var keysToRemove = [baseKey + '_meta'];
    if (metaRaw) {
      var meta = JSON.parse(metaRaw);
      if (meta && meta.count) {
        for (var i = 0; i < meta.count; i++) {
          keysToRemove.push(baseKey + '_c_' + i);
        }
      }
    }
    cache.removeAll(keysToRemove);
  } catch (e) {
  }
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

function formatWaktuPembaruan(val) {
  if (!val) return '-';
  if (val instanceof Date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    var hh = ('0' + val.getHours()).slice(-2);
    var mm = ('0' + val.getMinutes()).slice(-2);
    return val.getDate() + ' ' + months[val.getMonth()] + ' ' + val.getFullYear() + ' - ' + hh + '.' + mm;
  }
  return String(val);
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return val.getDate() + ' ' + months[val.getMonth()] + ' ' + val.getFullYear();
  }
  return String(val);
}

function getARData(username, forceRefresh) {
  var cleanUsername = String(username || '').trim().toUpperCase();
  var isForce = Boolean(forceRefresh);

  var cache = CacheService.getScriptCache();
  var arCacheKey = 'PTM_AR_V1_' + cleanUsername;
  var nopelCacheKey = 'PTM_NOPEL_V1_' + cleanUsername;

  if (isForce) {
    clearChunkedCache_(cache, arCacheKey);
    clearChunkedCache_(cache, nopelCacheKey);
  }

  var cachedAR = isForce ? null : getChunkedCache_(cache, arCacheKey);
  if (cachedAR) {
    var cachedNopel = null;
    if (cachedAR.hasNopelAccess) {
      cachedNopel = getChunkedCache_(cache, nopelCacheKey);
      if (!cachedNopel && typeof buildNopelPayload_ === 'function') {
        var ssFallback = SpreadsheetApp.getActiveSpreadsheet();
        var nopelFresh = buildNopelPayload_(ssFallback, cachedAR._nopelPrefix || '', cachedAR._nopelSales || '');
        if (nopelFresh && nopelFresh.success) {
          cachedNopel = {
            items: nopelFresh.items || [],
            waktuPembaruan: nopelFresh.waktuPembaruan || '-'
          };
          setChunkedCache_(cache, nopelCacheKey, cachedNopel, CACHE_TTL_SECONDS);
        }
      }
    }

    var liveWatchlist = [];
    if (cachedAR.hasWatchlistAccess && typeof getUserWatchlistFromCloud === 'function') {
      liveWatchlist = getUserWatchlistFromCloud(cleanUsername);
    }

    return {
      success: true,
      fromServerCache: true,
      items: cachedAR.items || [],
      bankOptions: cachedAR.bankOptions || [],
      isInv: cachedAR.isInv || false,
      hasSummaryAccess: cachedAR.hasSummaryAccess || false,
      hasWatchlistAccess: cachedAR.hasWatchlistAccess || false,
      hasNopelAccess: cachedAR.hasNopelAccess || false,
      hasWatermark: cachedAR.hasWatermark || false,
      cloudWatchlist: liveWatchlist,
      waktuPembaruan: cachedAR.waktuPembaruan || '-',
      nopelItems: cachedNopel ? (cachedNopel.items || []) : [],
      nopelWaktuPembaruan: cachedNopel ? (cachedNopel.waktuPembaruan || '-') : '-'
    };
  }

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
  var userGrup4 = '';
  var userHari = '';
  var hasSummaryAccess = false;
  var hasWatchlistAccess = false;
  var hasNopelAccess = false;
  var userNopelPrefix = '';
  var userNopelSales = '';

  var hasWatermark = false;
  var watermarkColIdx = -1;

  if (confData.length > 0) {
    for (var col = 0; col < confData[0].length; col++) {
      var headerTitle = String(confData[0][col] || '').trim().toUpperCase();
      if (headerTitle === 'WATERMARK') {
        watermarkColIdx = col;
        break;
      }
    }
  }

  if (watermarkColIdx !== -1 && confData.length > 1) {
    var masterValue = String(confData[1][watermarkColIdx] || '').trim().toUpperCase();
    hasWatermark = (masterValue === 'YA');
  }

  for (var i = 1; i < confData.length; i++) {
    var registeredUser = String(confData[i][0] || '').trim().toUpperCase();
    if (registeredUser === cleanUsername) {
      userFound = true;
      userGrup1 = String(confData[i][2] || '').trim();
      userGrup2 = String(confData[i][3] || '').trim();
      userGrup3 = String(confData[i][4] || '').trim();
      userGrup4 = String(confData[i][5] || '').trim();
      userHari  = String(confData[i][6] || '').trim();
      
      var ringkasanVal = String(confData[i][7] || '').trim().toUpperCase();
      hasSummaryAccess = (ringkasanVal === 'YA');

      var watchlistVal = String(confData[i][8] || '').trim().toUpperCase();
      hasWatchlistAccess = (watchlistVal === 'YA');

      userNopelPrefix = String(confData[i][9] || '').trim();
      userNopelSales  = String(confData[i][10] || '').trim();
      hasNopelAccess  = (userNopelPrefix !== '');
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
  var keywordsGrup4 = userGrup4 ? userGrup4.split('|').map(function(s){ return s.trim().toUpperCase(); }) : [];
  
  var primaryDepoCode = prefixesGrup1.length > 0 ? prefixesGrup1[0] : '';
  var isInv = userHari.toLowerCase() === 'inv';
  
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var piutangValues = piutangSheet.getDataRange().getValues();
  var filteredRows = [];
  var waktuPembaruan = '-';
  
  if (piutangValues.length > 1) {
    if (piutangValues[1].length > 11) {
      waktuPembaruan = formatWaktuPembaruan(piutangValues[1][11]);
    }

    var rawRows = piutangValues.slice(1);
    
    rawRows.forEach(function(row) {
      var noPelanggan = String(row[0] || '').trim();
      var namaPenjual = String(row[8] || '').trim().toUpperCase();
      var namaKontak  = String(row[9] || '').trim().toUpperCase();
      
      var matchGrup1 = (prefixesGrup1.length === 0);
      if (!matchGrup1) {
        for (var p = 0; p < prefixesGrup1.length; p++) {
          var pfx = prefixesGrup1[p];
          if (pfx && noPelanggan.indexOf(pfx) === 0) {
            matchGrup1 = true;
            break;
          }
        }
      }
      
      var matchGrup2 = (keywordsGrup2.length === 0);
      if (!matchGrup2) {
        for (var k = 0; k < keywordsGrup2.length; k++) {
          var kw2 = keywordsGrup2[k];
          if (kw2 && namaKontak.indexOf(kw2) !== -1) {
            matchGrup2 = true;
            break;
          }
        }
      }

      var matchGrup3 = (keywordsGrup3.length === 0);
      if (!matchGrup3) {
        for (var m = 0; m < keywordsGrup3.length; m++) {
          var kw3 = keywordsGrup3[m];
          if (kw3 && namaPenjual.indexOf(kw3) !== -1) {
            matchGrup3 = true;
            break;
          }
        }
      }

      var matchGrup4 = true;
      if (keywordsGrup4.length > 0) {
        for (var n = 0; n < keywordsGrup4.length; n++) {
          var kw4 = keywordsGrup4[n];
          if (kw4 && namaPenjual.indexOf(kw4) !== -1) {
            matchGrup4 = false;
            break;
          }
        }
      }
      
      if (matchGrup1 && matchGrup2 && matchGrup3 && matchGrup4) {
        var rawUmurJt = String(row[6] || '');
        var parsedUmurJtNum = parseInt(rawUmurJt.replace(/[^0-9-]/g, '')) || 0;

        var tglFakturRaw = row[2];
        var tglFakturDate = null;
        if (tglFakturRaw instanceof Date) {
          tglFakturDate = new Date(tglFakturRaw.getTime());
        } else if (typeof tglFakturRaw === 'string' && tglFakturRaw.trim() !== '') {
          tglFakturDate = new Date(tglFakturRaw);
        }
        
        var umurFakturDays = 0;
        var hasValidTglFaktur = false;
        if (tglFakturDate && !isNaN(tglFakturDate.getTime())) {
          tglFakturDate.setHours(0, 0, 0, 0);
          var diffTime = today.getTime() - tglFakturDate.getTime();
          umurFakturDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          hasValidTglFaktur = true;
        }

        var umurJtDisplay = rawUmurJt;
        if (isInv && hasValidTglFaktur) {
          umurJtDisplay = umurFakturDays + ' hari';
        }

        filteredRows.push({
          noPelanggan: noPelanggan,
          noFaktur: String(row[1] || ''),
          tglFaktur: formatDate(row[2]),
          jatuhTempo: formatDate(row[3]),
          nilaiFaktur: Number(row[4]) || 0,
          sisaPiutang: Number(row[5]) || 0,
          umurJt: umurJtDisplay,
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
    var depoCode = String(confData[b][14] || '').trim();
    var bankInfo = String(confData[b][15] || '').trim();
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
        if (pref && (pref === depo || depo.indexOf(pref) !== -1 || pref.indexOf(depo) !== -1)) {
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

  var cloudWatchlist = [];
  if (hasWatchlistAccess && typeof getUserWatchlistFromCloud === 'function') {
    cloudWatchlist = getUserWatchlistFromCloud(cleanUsername);
  }

  var nopelItems = [];
  var nopelWaktuPembaruan = '-';
  if (hasNopelAccess && typeof buildNopelPayload_ === 'function') {
    var nopelRes = buildNopelPayload_(ss, userNopelPrefix, userNopelSales);
    if (nopelRes && nopelRes.success) {
      nopelItems = nopelRes.items || [];
      nopelWaktuPembaruan = nopelRes.waktuPembaruan || '-';
    }
  }

  var arToCache = {
    items: filteredRows,
    bankOptions: bankOptions,
    isInv: isInv,
    hasSummaryAccess: hasSummaryAccess,
    hasWatchlistAccess: hasWatchlistAccess,
    hasNopelAccess: hasNopelAccess,
    hasWatermark: hasWatermark,
    waktuPembaruan: waktuPembaruan,
    _nopelPrefix: userNopelPrefix,
    _nopelSales: userNopelSales
  };
  setChunkedCache_(cache, arCacheKey, arToCache, CACHE_TTL_SECONDS);

  if (hasNopelAccess) {
    setChunkedCache_(cache, nopelCacheKey, {
      items: nopelItems,
      waktuPembaruan: nopelWaktuPembaruan
    }, CACHE_TTL_SECONDS);
  }
  
  return {
    success: true,
    fromServerCache: false,
    items: filteredRows,
    bankOptions: bankOptions,
    isInv: isInv,
    hasSummaryAccess: hasSummaryAccess,
    hasWatchlistAccess: hasWatchlistAccess,
    hasNopelAccess: hasNopelAccess,
    hasWatermark: hasWatermark,
    cloudWatchlist: cloudWatchlist,
    waktuPembaruan: waktuPembaruan,
    nopelItems: nopelItems,
    nopelWaktuPembaruan: nopelWaktuPembaruan
  };
}