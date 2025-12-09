// GANTI DENGAN ID SPREADSHEET ANDA
const SPREADSHEET_ID = '1R52Z1T_FmDlaRG1oOr2FrSLT5eY_1BDw_gooHpxpk9M'; // Ganti dengan ID Spreadsheet Anda
const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
const PROKTOR_PASSWORD = "PROKTOR123"; // Ganti password utama proktor di sini

// --- ROUTING UTAMA ---
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'read') {
    return readData(e.parameter.sheetName);
  }
  if (action === 'getAdminUsers') {
    return getAdminUsers();
  }
  if (action === 'getSiswaBySekolah') {
    return getSiswaBySekolah(e.parameter.sheetName, e.parameter.namaSekolah);
  }
  // BARU: Aksi untuk mencari siswa berdasarkan NISN
  if (action === 'getSiswaByNisn') {
    return getSiswaByNisn(e.parameter.nisn);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Aksi GET tidak valid.' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let response;
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    switch (action) {
      // --- AKSI PROKTOR ---
      case 'proktorLogin': response = proktorLogin(requestData); break;
      case 'createAdminUser': response = createAdminUser(requestData); break;
      case 'updateAdminUser': response = updateAdminUser(requestData); break;
      case 'deleteAdminUser': response = deleteAdminUser(requestData); break;

      // --- AKSI ADMIN ---
      case 'adminLogin': response = adminLogin(requestData); break;
      case 'createSoal': response = createData(requestData.sheetName, requestData); break;
      case 'updateSoal': response = updateData(requestData.sheetName, requestData); break;
      case 'deleteSoal': response = deleteData(requestData.sheetName, requestData); break;
      case 'createSiswa': response = createSiswa(requestData); break;
      case 'updateSiswa': response = updateSiswa(requestData); break;
      case 'deleteSiswa': response = deleteSiswa(requestData); break;
      case 'batchCreateSiswa': response = batchCreateSiswa(requestData); break;

      // --- AKSI SISWA ---
      case 'login': response = checkLoginSiswa(requestData); break;
      case 'saveScore': response = saveScore(requestData); break;
      default: response = { success: false, message: 'Aksi POST tidak diketahui.' };
    }
  } catch (err) {
    response = { success: false, message: 'Error Server: ' + err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// --- FUNGSI PROKTOR ---
function proktorLogin(data) { if (data.password === PROKTOR_PASSWORD) return { success: true }; return { success: false, message: 'Password Proktor Salah.' };}
function getAdminUsers() { try { const proktorSheet = spreadsheet.getSheetByName("PROKTOR"); if (!proktorSheet) throw new Error("Sheet 'PROKTOR' tidak ditemukan."); const data = proktorSheet.getDataRange().getValues(); data.shift(); const result = data.map(row => ({ USERNAME: row[0], PASSWORD: row[1], NAMA_SEKOLAH: row[2], SHEET: row[3] })); return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON); } catch(err) { return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON); }}
function createAdminUser(data) { const sheet = spreadsheet.getSheetByName("PROKTOR"); sheet.appendRow([data.username, data.password, data.namaSekolah, data.sheet]); return { success: true, message: 'Admin berhasil dibuat.' };}
function updateAdminUser(data) { const sheet = spreadsheet.getSheetByName("PROKTOR"); sheet.getRange(parseInt(data.rowIndex), 1, 1, 4).setValues([[data.username, data.password, data.namaSekolah, data.sheet]]); return { success: true, message: 'Admin berhasil diperbarui.' };}
function deleteAdminUser(data) { const sheet = spreadsheet.getSheetByName("PROKTOR"); sheet.deleteRow(parseInt(data.rowIndex)); return { success: true, message: 'Admin berhasil dihapus.' };}

// --- FUNGSI ADMIN ---
function adminLogin(data) { const sheet = spreadsheet.getSheetByName("PROKTOR"); if (!sheet) return { success: false, message: "Sheet 'PROKTOR' tidak ditemukan." }; const users = sheet.getDataRange().getValues(); for (let i = 1; i < users.length; i++) { if (users[i][0] === data.username && users[i][1].toString() === data.password) { return { success: true, namaSekolah: users[i][2], sheet: users[i][3] }; } } return { success: false, message: 'Username atau Password Admin salah.' };}
function getSiswaBySekolah(sheetName, namaSekolah) { const siswaSheet = spreadsheet.getSheetByName(sheetName); if (!siswaSheet) { return ContentService.createTextOutput(JSON.stringify({ data: [], message: `Sheet ${sheetName} tidak ditemukan.` })).setMimeType(ContentService.MimeType.JSON); } const data = siswaSheet.getDataRange().getValues(); const headers = data.shift() || []; const result = data.filter(row => row[2] === namaSekolah).map(row => { let obj = {}; headers.forEach((h, i) => { const headerKey = h.toString().replace(/ /g, '_'); obj[headerKey] = row[i]; }); return obj; }); return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON);}
function createSiswa(data) { const sheet = spreadsheet.getSheetByName(data.sheetName); if (!sheet) return { success: false, message: `Sheet '${data.sheetName}' tidak ditemukan.` }; const values = sheet.getDataRange().getValues(); const isNisnExist = values.some(row => row[1] && row[1].toString() === data.nisn.toString()); if (isNisnExist) { return { success: false, message: `Siswa dengan NISN ${data.nisn} sudah ada. Harap gunakan mode edit.` }; } const tkaArray = data.tka || []; if (tkaArray.length === 0) { return { success: false, message: 'Pilih minimal satu hak akses TKA.' }; } tkaArray.forEach(tka => { sheet.appendRow([data.namaSiswa, data.nisn, data.sekolah, tka]); }); return { success: true, message: `Siswa ${data.namaSiswa} berhasil ditambahkan.` };}
function batchCreateSiswa(data) { const sheet = spreadsheet.getSheetByName(data.sheetName); if (!sheet) return { success: false, message: `Sheet '${data.sheetName}' tidak ditemukan.` }; const siswaData = data.siswa; if (!siswaData || !Array.isArray(siswaData) || siswaData.length === 0) { return { success: false, message: 'Tidak ada data siswa untuk diproses.' }; } const existingNisns = new Set(sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat().map(String)); const newRows = []; let skippedCount = 0; siswaData.forEach(siswa => { const nama = siswa.Nama_Siswa; const nisn = siswa.NISN ? String(siswa.NISN) : null; const tkaString = siswa.TKA || ''; if (!nama || !nisn) return; if (existingNisns.has(nisn)) { skippedCount++; return; } const tkaArray = tkaString.split(',').map(tka => tka.trim()).filter(Boolean); if (tkaArray.length > 0) { tkaArray.forEach(tka => { newRows.push([nama, nisn, data.sekolah, tka]); }); existingNisns.add(nisn); } }); if (newRows.length > 0) { sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows); } let message = `${newRows.length} baris data siswa berhasil ditambahkan.`; if (skippedCount > 0) { message += ` ${skippedCount} siswa dilewati karena NISN sudah terdaftar.`; } return { success: true, message: message };}
function updateSiswa(data) { const sheet = spreadsheet.getSheetByName(data.sheetName); if (!sheet) return { success: false, message: `Sheet '${data.sheetName}' tidak ditemukan.` }; const values = sheet.getDataRange().getValues(); const newTkas = data.tka || []; const existingTkas = []; const rowsToDelete = []; for (let i = 1; i < values.length; i++) { if (values[i][1] && values[i][1].toString() === data.nisn.toString()) { const currentTka = values[i][3]; existingTkas.push(currentTka); const rowIndex = i + 1; if (!newTkas.includes(currentTka)) rowsToDelete.push(rowIndex); } } if (existingTkas.length === 0 && rowsToDelete.length === 0) { return { success: false, message: 'Siswa dengan NISN tersebut tidak ditemukan untuk diperbarui.' }; } rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex)); const tkasToAdd = newTkas.filter(tka => !existingTkas.includes(tka)); tkasToAdd.forEach(tka => sheet.appendRow([data.namaSiswa, data.nisn, data.sekolah, tka])); const updatedValues = sheet.getDataRange().getValues(); for (let i = 1; i < updatedValues.length; i++) { if(updatedValues[i][1] && updatedValues[i][1].toString() === data.nisn.toString()) { sheet.getRange(i + 1, 1).setValue(data.namaSiswa); } } return { success: true, message: 'Data siswa berhasil diperbarui.' };}
function deleteSiswa(data) { const sheet = spreadsheet.getSheetByName(data.sheetName); if (!sheet) return { success: false, message: `Sheet '${data.sheetName}' tidak ditemukan.` }; const values = sheet.getDataRange().getValues(); let rowsToDelete = []; for (let i = 1; i < values.length; i++) { if (values[i][1] && values[i][1].toString() === data.nisn.toString()) rowsToDelete.push(i + 1); } if (rowsToDelete.length > 0) { rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex)); return { success: true, message: `Semua data untuk siswa dengan NISN ${data.nisn} telah dihapus.` }; } return { success: false, message: 'Siswa tidak ditemukan.' };}

// --- FUNGSI SISWA ---

// BARU: Fungsi untuk mencari data siswa berdasarkan NISN di semua sheet yang terdaftar
function getSiswaByNisn(nisn) {
  try {
    const proktorSheet = spreadsheet.getSheetByName("PROKTOR");
    if (!proktorSheet) throw new Error("Sheet 'PROKTOR' tidak ditemukan.");
    
    const proktorData = proktorSheet.getDataRange().getValues();
    const studentSheets = [...new Set(proktorData.slice(1).map(row => row[3]).filter(Boolean))];

    for (const sheetName of studentSheets) {
      const studentSheet = spreadsheet.getSheetByName(sheetName);
      if (!studentSheet) continue;

      const data = studentSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] && data[i][1].toString() === nisn.toString()) {
          const namaSiswa = data[i][0];
          const sekolah = data[i][2];
          
          const availableTkas = [];
          for (let j = 1; j < data.length; j++) {
              if (data[j][1] && data[j][1].toString() === nisn.toString()) {
                  if (data[j][3] && !availableTkas.includes(data[j][3])) {
                    availableTkas.push(data[j][3]);
                  }
              }
          }

          return ContentService.createTextOutput(JSON.stringify({ 
            success: true, 
            data: { 
              namaSiswa: namaSiswa, 
              sekolah: sekolah,
              nisn: nisn,
              tka: availableTkas,
              sheet: sheetName
            } 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Siswa dengan NISN tersebut tidak ditemukan.' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Error Server: ' + err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// DIPERBARUI: Logika login siswa
function checkLoginSiswa(data) {
  try {
    const sheet = spreadsheet.getSheetByName(data.sheetName);
    if (!sheet) throw new Error(`Sheet '${data.sheetName}' tidak ditemukan.`);

    const values = sheet.getDataRange().getValues();
    
    let studentExists = false;
    let tkaAccess = false;

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[1] && row[1].toString() === data.nisn.toString()) {
            studentExists = true;
            if (row[3] && row[3].toString() === data.tka.toString()) {
                tkaAccess = true;
                break;
            }
        }
    }
    
    if (studentExists && tkaAccess) {
      return { success: true };
    } else if (studentExists && !tkaAccess) {
      return { success: false, message: 'Login gagal. Anda tidak memiliki hak akses untuk TKA yang dipilih.' };
    } else {
      return { success: false, message: 'Login gagal. NISN tidak ditemukan.' };
    }
  } catch (err) {
    return { success: false, message: 'Error Server: ' + err.message };
  }
}

// DIPERBARUI: Logika penyimpanan skor
function saveScore(data) {
  try {
    const sheet = spreadsheet.getSheetByName(data.sheetName);
    if (!sheet) return { success: false, message: `Sheet '${data.sheetName}' tidak ditemukan.` };

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String); // Memastikan semua header adalah string
    let targetRowIndex = -1;

    // Cari baris yang sesuai dengan NISN dan TKA siswa
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] && values[i][1].toString() === data.nisn.toString() && values[i][3] && values[i][3].toString() === data.tka.toString()) {
        targetRowIndex = i + 1; // Index berbasis 1 untuk getRange
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Baris data siswa untuk TKA ini tidak ditemukan.' };
    }

    // Cari kolom untuk 'Skor_Akhir' dan perbarui nilainya
    const skorAkhirColIndex = headers.indexOf('Skor_Akhir');
    if (skorAkhirColIndex !== -1) {
      sheet.getRange(targetRowIndex, skorAkhirColIndex + 1).setValue(data.finalScore);
    }

    // Perbarui skor per butir soal
    data.scoresPerQuestion.forEach((score, index) => {
      const questionHeader = (index + 1).toString();
      const questionColIndex = headers.indexOf(questionHeader);
      if (questionColIndex !== -1) {
        sheet.getRange(targetRowIndex, questionColIndex + 1).setValue(score);
      }
    });

    return { success: true, message: 'Skor berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan skor: ' + err.message };
  }
}


// --- FUNGSI HELPER SOAL ---
function readData(sheetName) { try { const sheet = spreadsheet.getSheetByName(sheetName); if (!sheet || sheet.getLastRow() < 1) return ContentService.createTextOutput(JSON.stringify({ data: [] })).setMimeType(ContentService.MimeType.JSON); const data = sheet.getDataRange().getValues(); const headers = data.shift(); const result = data.map(row => { const obj = {}; headers.forEach((header, index) => { obj[header.replace(/ /g, '_')] = row[index]; }); return obj; }); return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON); } catch (err) { return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON); } }
function processRowData(data) { return [ data.typeSoal||'', data.pertanyaan||'', data.imageUrl||'', data.option1||'', data.answer1||'', data.option2||'', data.answer2||'', data.option3||'', data.answer3||'', data.option4||'', data.answer4||'', data.option5||'', data.answer5||'']; }
function createData(sheetName, data) { try { const sheet = spreadsheet.getSheetByName(sheetName); sheet.appendRow(processRowData(data)); return { success: true, message: 'Data berhasil ditambahkan.' }; } catch (err) { return { success: false, message: 'Gagal menambahkan data: ' + err.message }; } }
function updateData(sheetName, data) { try { const sheet = spreadsheet.getSheetByName(sheetName); const rowIndex = parseInt(data.rowIndex, 10); if (!rowIndex || rowIndex < 2) throw new Error('Index baris tidak valid.'); sheet.getRange(rowIndex, 2, 1, 14).setValues([processRowData(data)]); return { success: true, message: `Data baris ke-${rowIndex} berhasil diperbarui.` }; } catch (err) { return { success: false, message: 'Gagal memperbarui data: ' + err.message }; } }
function deleteData(sheetName, data) { try { const sheet = spreadsheet.getSheetByName(sheetName); const rowIndex = parseInt(data.rowIndex, 10); if (!rowIndex || rowIndex < 2) throw new Error('Index baris tidak valid.'); sheet.deleteRow(rowIndex); return { success: true, message: `Data baris ke-${rowIndex} berhasil dihapus.` }; } catch (err) { return { success: false, message: 'Gagal menghapus data: ' + err.message }; } }
