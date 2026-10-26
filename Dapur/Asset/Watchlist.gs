function getWatchlistCloudKey(username) {
  return 'WL_CLOUD_' + String(username || '').trim().toUpperCase();
}

function getUserWatchlistFromCloud(username) {
  try {
    var cleanUser = String(username || '').trim().toUpperCase();
    if (!cleanUser) return [];
    var props = PropertiesService.getScriptProperties();
    var baseKey = getWatchlistCloudKey(cleanUser);
    var raw = props.getProperty(baseKey);
    if (!raw) return [];

    var parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === 'object' && parsed.chunkCount > 0) {
      var combinedStr = '';
      for (var c = 0; c < parsed.chunkCount; c++) {
        var part = props.getProperty(baseKey + '_CHUNK_' + c);
        if (part) combinedStr += part;
      }
      if (!combinedStr) return [];
      var fullList = JSON.parse(combinedStr);
      return Array.isArray(fullList) ? fullList : [];
    }

    return [];
  } catch (e) {
    return [];
  }
}

function saveUserWatchlistToCloud(username, entitiesArray) {
  try {
    var cleanUser = String(username || '').trim().toUpperCase();
    if (!cleanUser) return { success: false, message: 'Pengguna tidak valid.' };

    var safeArray = Array.isArray(entitiesArray)
      ? entitiesArray.map(function(item) { return String(item); })
      : [];

    var props = PropertiesService.getScriptProperties();
    var baseKey = getWatchlistCloudKey(cleanUser);

    var oldRaw = props.getProperty(baseKey);
    if (oldRaw) {
      try {
        var oldParsed = JSON.parse(oldRaw);
        if (oldParsed && typeof oldParsed === 'object' && oldParsed.chunkCount > 0) {
          for (var k = 0; k < oldParsed.chunkCount; k++) {
            props.deleteProperty(baseKey + '_CHUNK_' + k);
          }
        }
      } catch (ignoreErr) {}
    }

    var jsonStr = JSON.stringify(safeArray);
    var maxChunkSize = 8000;

    if (jsonStr.length <= maxChunkSize) {
      props.setProperty(baseKey, jsonStr);
    } else {
      var chunks = [];
      for (var i = 0; i < jsonStr.length; i += maxChunkSize) {
        chunks.push(jsonStr.substring(i, i + maxChunkSize));
      }
      var payloadProps = {};
      payloadProps[baseKey] = JSON.stringify({ chunkCount: chunks.length });
      for (var j = 0; j < chunks.length; j++) {
        payloadProps[baseKey + '_CHUNK_' + j] = chunks[j];
      }
      props.setProperties(payloadProps, false);
    }

    return {
      success: true,
      count: safeArray.length,
      syncedAt: new Date().toISOString()
    };
  } catch (e) {
    return {
      success: false,
      message: 'Gagal menyimpan ke Cloud: ' + e.message
    };
  }
}

function getWatchlistData(username) {
  var baseRes = getARData(username);
  if (!baseRes || !baseRes.success || !baseRes.hasWatchlistAccess) {
    return {
      success: false,
      message: 'Akses Ditolak! Anda tidak memiliki izin untuk membuka fitur Watchlist.'
    };
  }

  var watchlistRows = (baseRes.items || []).slice();
  var entityMap = {};
  var entityList = [];

  watchlistRows.forEach(function(item) {
    var entityKey = item.noPelanggan + ' | ' + item.namaPelanggan + ' | ' + item.namaKontak;
    if (!entityMap[entityKey]) {
      entityMap[entityKey] = true;
      entityList.push({
        noPelanggan: item.noPelanggan,
        namaPelanggan: item.namaPelanggan,
        namaKontak: item.namaKontak,
        label: entityKey
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
    entities: entityList,
    cloudWatchlist: baseRes.cloudWatchlist || []
  };
}