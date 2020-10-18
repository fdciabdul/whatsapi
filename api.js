const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const axios = require('axios');
const shelljs = require('shelljs');

const config = require('./config.json');
const { Client } = require('whatsapp-web.js');
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
process.title = "whatsapp-node-api";
global.client = new Client({ puppeteer: { headless: config.headless , args:['--no-sandbox','--disable-setuid-sandbox','--unhandled-rejections=strict'] }, session: sessionCfg});
global.authed = false;
const app = express();


const port = process.env.PORT || config.port;
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

client.on('qr', qr => {
    fs.writeFileSync('./components/last.qr',qr);
});


client.on('authenticated', (session) => {
    console.log("auth !");
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
        if (err) {
            console.error(err);
        }
        authed=true;
    });
    try{
        fs.unlinkSync('./components/last.qr')
    }catch(err){}
});

client.on('auth_failure', () => {
    console.log("auth Failed !")
    sessionCfg = ""
    process.exit()
});

client.on('ready', () => {
    console.log('whatsapp is ready!');
});

client.on('message', msg => {
    if(config.webhook.enabled){
        axios.post(config.webhook.path, {msg : msg})
    }
})
client.initialize();

const chatRoute = require('./routes/chatting');
const groupRoute = require('./routes/group');
const authRoute = require('./routes/auth');
const contactRoute = require('./routes/contact');

app.use(function(req,res,next){
    console.log(req.method + ' : ' + req.path);
    if(req.headers['authorization'] == 'OOxGzWwTcDYlxfppdda5X_3ijij6uR0vssdf4nXmwLfWkjkk1cto'){
        next();
    }
    else{
        // console.info(req.headers)
        res.status(403).send("api error");
    }
    
});
app.use('/chat',chatRoute);
app.use('/group',groupRoute);
app.use('/auth',authRoute);
app.use('/contact',contactRoute);

app.listen(port, () => {
    console.log("Server Running Live on Port : " + port);
});