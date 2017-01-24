var express = require('express');
var google = require('googleapis');
var refresh = require('passport-oauth2-refresh');
var sheets = google.sheets('v4');
var router = express.Router();

//get all cells in spreadsheet
router.get('/spreadsheet', function(req, res){
  var params = req.query;

  var sheetId = params['sheet_id'];
  var accessToken = params['access_token'];
  getSheet(accessToken, sheetId, function(err, resp){
    if(err){
      res.redirect('/#error');
    }else{
      res.json(resp);
    }
  });
});

//create new entry in spreadsheet
router.post('/spreadsheet', function(req, res){
  var sheetId = req.body.params.sheet_id;
  var accessToken = req.body.params.access_token;
  var indices = req.body.params.indices;

  var job = req.body.params.job.job;
  var task = req.body.params.job.task;
  var hours = req.body.params.hours;
  var date = new Date().toLocaleDateString();

  writeSheet(accessToken, sheetId, indices, info = {date: date, job: job, task: task, hours: hours}, function(err, resp){
    if(err){
      res.json({result: 'error', data: err});
    }else{
      res.json({result: 'success', data: info});
    }
  });

});

//obtain new access token if old is expired
router.get('/refreshtoken', function(req, res){
  refresh.requestNewAccessToken('google', req.refreshToken, function(err, accessToken, refreshToken) {
    if(err){
      res.send(err);
    }else{
      res.send(accessToken);
    }
  });
});

function writeSheet(auth, id, indices, data, callback){
  var requests = [];
  var row = indices.lastEntryCell.row-1, col = indices.lastEntryCell.col;

  //move all footing down by one
  requests.push({
    cutPaste: {
      source: {
        sheetId: 0,
        startRowIndex: (row+1),
        //TODO possibly make this dynamic
        endRowIndex: 100,
        startColumnIndex: 0,
        endColumnIndex:10
      },
      destination: {
        sheetId: 0,
        rowIndex: (row+2),
        columnIndex: 0
      },
      pasteType: 'PASTE_NORMAL'
    }
  });

  //write entry
  requests.push({
    updateCells: {
      start: {
        sheetId: 0,
        rowIndex: row,
        columnIndex: col
      },
      rows: [{
        values: [{
          userEnteredValue: {stringValue: data.date},
          userEnteredFormat: {horizontalAlignment: 'RIGHT'}
        },
        {
          userEnteredValue: {stringValue: data.job},
        },
        {
          userEnteredValue: {stringValue: data.task}
        },
        {
          userEnteredValue: {numberValue: data.hours}
        }]
      }],
      fields: 'userEnteredValue,userEnteredFormat(horizontalAlignment)'
    }
  });

  var batchUpdateRequest = {requests: requests}

  var options = {
    access_token: auth,
    spreadsheetId: id,
    resource: batchUpdateRequest
  }

  sheets.spreadsheets.batchUpdate(options, function(err, res){
    callback(err, res);
  })
}

//use api to retrieve sheet data from cells A1 to J500 - arbitrary numbers, should be good enough
function getSheet(auth, id, callback) {
  sheets.spreadsheets.values.get({
    access_token: auth,
    spreadsheetId: id,
    range: 'Sheet1!A1:J500'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      callback(err,null);
      return;
    }
    callback(null,response);
  });
}

module.exports = router;
