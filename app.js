'use strict';

const express = require('express');
const path = require('path');
const config = require('./config/config.js');
const knox = require('knox');
const fs = require('fs');
const os = require('os');
const formidable = require('formidable');
const gm = require('gm');
const mongoose = require('mongoose').connect(config.dbURL);

var app = express();

console.log("CONFIG");
console.log(config);

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('hogan-express'));
app.set('view engine');

app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000);
app.set('host', config.host);

var knoxClient = knox.createClient({
    key: config.S3AccessKey,
    secret: config.S3Secret,
    bucket: config.S3Bucket
});


var server = require('http').Server(app);
var io = require('socket.io')(server);

require('./routes/routes.js')(express, app, formidable, fs, os, gm, knoxClient, mongoose, io);

server.listen(app.get('port'), () => {

    console.log("PhotoGroid running on ", app.get('port'));

})
