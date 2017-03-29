module.exports = (express, app, formidable, fs, os, gm, knoxClient, mongoose, io) => {

    var Socket;

    io.on("connection", function(soc) {
        console.log("CONNECTED");
        Socket = soc;
    });

    var singleImage = new mongoose.Schema({
        fileName: String,
        votes: Number
    });

    var singleImageModel = mongoose.model('singleImage', singleImage);

    var router = express.Router();


    router.get('/', (req, res, next) => {
        res.render('index', {
            host: app.get('host')
        });
    });

    router.post('/upload', (req, res, next) => {
        // File upload

        function generateFilename(filename) {
            var ext_regex = /(?:\.([^.]+))?$/;
            var ext = ext_regex.exec(filename)[1];
            var date = new Date().getTime();
            var charBank = "abcdefghijklmnopqrstuvwxyz";
            var fstring = '';
            for (var i = 0; i < 15; i++) {
                fstring += charBank[parseInt(Math.random() * 26)];
            }
            return (fstring += date + '.' + ext);
        }

        var tmpFile, nfile, fname;
        var newForm = new formidable.IncomingForm();
        newForm.keepExtensions = true;
        newForm.parse(req, function(err, fields, files) {
            tmpFile = files.upload.path;
            fname = generateFilename(files.upload.name);
            nfile = os.tmpDir() + '/' + fname;
            res.writeHead(200, {
                'Content-type': 'text/plain'
            });
            res.end();
        });

        newForm.on('end', function() {
            fs.rename(tmpFile, nfile, function() {
                // Resize the image and upload this file into the S3 bucket
                gm(nfile).resize(500).write(nfile, function() {
                    // Upload to the S3 Bucket
                    fs.readFile(nfile, function(err, buf) {
                        var req = knoxClient.put(fname, {
                            'Content-Length': buf.length,
                            'Content-Type': 'image/jpeg'
                        })

                        req.on('response', function(res) {
                            if (res.statusCode == 200) {
                                // This means that the file is in the S3 Bucket !
                                var newImage = new singleImageModel({
                                    filename: fname,
                                    votes: 0
                                }).save();

                                Socket.emit('status', {
                                    'msg': 'Saved !!',
                                    'delay': 3000
                                });
                                Socket.emit('doUpdate', {});

                                // Delete the Local File
                                fs.unlink(nfile, function() {
                                    console.log('Local File Deleted !');
                                })

                            }
                        })

                        req.end(buf);
                    })
                })
            })
        })

    }); // post

    app.use('/', router);
}
