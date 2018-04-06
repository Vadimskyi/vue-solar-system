var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('./pdftest.html', 'utf-8');

pdf.create(html).toFile('./index.pdf', function(err, res) {
    if(err){ console.error(err);}
    else console.log(res);
});