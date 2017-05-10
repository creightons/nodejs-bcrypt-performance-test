var express = require('express');
var bcrypt = require('bcrypt');
var bcryptJS = require('bcryptjs');
var fs = require('fs');
var app = express();

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

app.listen(process.env.SERVER_PORT, () => {
    console.log('Live on port ' + process.env.SERVER_PORT + '...');
});
