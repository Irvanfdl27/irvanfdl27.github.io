const SPREADSHEET_ID = '1Z6VCgLbdoD86BDCxuetEF8yyRV56u2gVVEpuHs3NtdQ';
const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheetName;
  if (action === 'read') {
    return readData(sheetName);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Aksi tidak valid.' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let response;
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const sheetName = requestData.sheetName;

    switch (action) {
      case 'create':
        response = createData(sheetName, requestData);
        break;
      case 'update':
        response = updateData(sheetName, requestData);
        break;
      case 'delete':
        response = deleteData(sheetName, requestData);
        break;
      default:
        response = { success: false, message: 'Aksi tidak diketahui.' };
    }
  } catch (err) {
    response = { success: false, message: 'Error: ' + err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function readData(sheetName) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
    
    // Check if sheet is empty
    if (sheet.getLastRow() < 1) {
      return ContentService.createTextOutput(JSON.stringify({ data: [] })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const result = data.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Create a consistent key for JS (e.g., "TYPE SOAL" -> "TYPE_SOAL")
        const key = header.replace(/ /g, '_');
        obj[key] = row[index];
      });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processRowData(data) {
    // This helper function maps form data to the correct spreadsheet column order.
    // The keys in `data` (e.g., data.typeSoal) come from the `name` attribute of the form inputs in HTML.
    return [
      data.typeSoal || '', data.pertanyaan || '', data.imageUrl || '',
      data.option1 || '', data.answer1 || '', data.option2 || '', data.answer2 || '',
      data.option3 || '', data.answer3 || '', data.option4 || '', data.answer4 || '',
      data.option5 || '', data.answer5 || ''
    ];
}

function createData(sheetName, data) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const newRow = processRowData(data);
    sheet.appendRow(newRow);
    return { success: true, message: 'Data berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambahkan data: ' + err.message };
  }
}

function updateData(sheetName, data) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const rowIndex = parseInt(data.rowIndex, 10);
    if (!rowIndex || rowIndex < 2) throw new Error('Index baris tidak valid.');

    const newRowData = processRowData(data);
    sheet.getRange(rowIndex, 1, 1, newRowData.length).setValues([newRowData]);
    return { success: true, message: `Data baris ke-${rowIndex} berhasil diperbarui.` };
  } catch (err) {
    return { success: false, message: 'Gagal memperbarui data: ' + err.message };
  }
}

function deleteData(sheetName, data) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const rowIndex = parseInt(data.rowIndex, 10);
    if (!rowIndex || rowIndex < 2) throw new Error('Index baris tidak valid.');
    sheet.deleteRow(rowIndex);
    return { success: true, message: `Data baris ke-${rowIndex} berhasil dihapus.` };
  } catch (err) {
    return { success: false, message: 'Gagal menghapus data: ' + err.message };
  }
}