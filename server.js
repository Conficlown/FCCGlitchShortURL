'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

try{
  mongoose.connect(process.env.MONGO_URI);
} catch (e) {
  console.log(e);
}

var Schema = mongoose.Schema;
var UrlShortListSchema = Schema({
  original_url: {type:String, required:true, unique:true},
  short_url: {type:Number, required:true, unique:true}
})

var UrlShortList = mongoose.model('UlrlShortList', UrlShortListSchema);


var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

app.use(bodyParser.urlencoded({extended: 'false'}));
app.use(bodyParser.json());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get('/api/is-mongoose-ok', function(req, res) {
  if (mongoose) {
    res.json({isMongooseOk: !!mongoose.connection.readyState})
  } else {
    res.json({isMongooseOk: false})
  }
});

app.get('/api/initiate', function(req, res) {
  var initalList = new UrlShortList({original_url: "www.google.com", short_url: 1});
  initalList.save((err, doc)=>{
    if(err) {console.log(err);}
    res.json(doc);
  });
});

app.post("/api/shorturl/new", (req, res)=>{
  var url = req.body.url.toLowerCase();
  if(req.body.url){
    if( url.search(/^https?:\/\//)>-1 ){
      // url = url.split('/')[2];
      url = url.slice(url.indexOf('//')+2);
    }
    console.log(url);
    dns.lookup(url.split('/')[0],  (err, address, family) => {
      if(err) {
        res.json({"error":"invalid URL"});
      }else{
        console.log('address: %j family: IPv%s', address, family);
        UrlShortList.findOne({original_url: url}, (err, doc)=>{
          if(err){return console.log(err)};
          // console.log("doc", doc);
          if(doc){
            res.json({original_url: doc.original_url, short_url: doc.short_url});
          }else{
            console.log("doesn't exist");
            UrlShortList.find().sort({short_url : -1}).limit(1).exec((err, doc)=>{
              if(doc.length===0){
                var shortList = new UrlShortList({original_url: url, short_url: 1});
                shortList.save( (err, doc)=>{
                  if(err) {return console.log(err)};
                  console.log('no entry in DB, insert a new one');
                  res.json({original_url: doc.original_url, short_url: doc.short_url});
                });
              }else{
                var shortList = new UrlShortList({original_url: url, short_url: doc[0].short_url+1});
                shortList.save( (err, doc)=>{
                  if(err) {return console.log(err)};
                  console.log('add new one with increment');
                  res.json({original_url: doc.original_url, short_url: doc.short_url});
                });
              }
            });
          }
        });
      }
    });
  }else{
    res.json({error: "Empty url!"});
  }
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});