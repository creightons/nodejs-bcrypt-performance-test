var express = require('express');
var bcrypt = require('bcrypt');
var bcryptJS = require('bcryptjs');
var fs = require('fs');
var app = express();
var cluster = require('cluster');
var os = require('os');

var runAsCluster;

if (process.env.RUN_AS_CLUSTER === undefined) {
    runAsCluster = true;
}
else {
    runAsCluster = process.env.RUN_AS_CLUSTER;
}

function main() {
    var rounds = 10;
    function getEncrypter(bcryptModule) {
        return function (text) {
            return new Promise((resolve, reject) => {
                    bcryptModule.genSalt(rounds, (err, salt) => {
                        if (err) { return reject(err); }
                        return resolve(salt);
                    });
                })
                .then(salt => {
                    return new Promise((resolve, reject) => {
                        bcrypt.hash(text, salt, (err, hash) => {
                            if(err) { return reject(err); }
                            return resolve(hash);
                        })
                    });
                });
        }
    }

    function getSyncEncrypter(bcryptModule) {
        return function(text) {
            var salt = bcryptModule.genSaltSync(rounds);
            var hash = bcryptModule.hashSync(text, salt);
            return Promise.resolve(hash);
        }
    }

    var encryptKelektiv;
    var encryptJS;

    if (true) {
        encryptKelektiv = getSyncEncrypter(bcrypt);
        encryptJS = getSyncEncrypter(bcryptJS);
    }
    else {
        encryptKelektiv = getEncrypter(bcrypt);
        encryptJS = getEncrypter(bcryptJS);
    }

    app.set('view engine', 'pug');
    app.set('views', 'views');

    app.use((req, res, next) => {
        var method = req.method,
            url = req.url;
        console.log(`${method} ${url}`);
        next();
    });

    app.get('/', (req, res) => { res.status(200).render('index'); });

    app.get('/encrypt/:text', (req, res) => {
        var text = req.params.text || 'test';

        //encryptKelektiv(text)
        encryptJS(text)
            .then(hash => {
                res.status(200).send(hash);
            }).catch(err => {
                console.log("Error: ", err.stack);
                return res.status(500).send();
            });
    });

    app.get('/file', (req, res) => {
        return new Promise((resolve, reject) => {
                fs.readFile('./text.txt', (err, dataBuffer) => {
                    if(err) { return reject(err); }
                    var string = dataBuffer.toString('utf8');
                    return resolve(string);
                });
            }).then(file => {
                res.status(200).send(file);
            }).catch(err => {
                console.log("Error: ", err.stack);
                return res.status(500).send();
            });
    });

    var port = process.env.SERVER_PORT || 3000;
    app.listen(port, () => {
        console.log(`Live on port ${port}...`);
    });
}

if (runAsCluster && cluster.isMaster) {
    var numWorkers = require('os').cpus().length;

    console.log(`Master cluster setting up ${numWorkers} workers...`);

    for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', worker => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${wokrer.process.pid} died with code:${code} and signal: ${signal}`);
        console.log('Starting a new worker');
        cluster.fork();
    });
}
else {
    main();
}