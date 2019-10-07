require("dotenv").config();
const Discord = require("discord.js");
const Twitter = require('twitter');
const fetch = require("node-fetch");
const bot = new Discord.Client();
const fs = require("fs");
const token = process.env.DISCORD_TOKEN;

var client = new Twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

async function downloadImage(url, path) {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", (err) => {
            reject(err);
        });
        fileStream.on("finish", function () {
            resolve();
        });
    });
}

async function createJSON(discordUrl) {
    var lastFile = {
        discordUrl
    };
    var generateJSON = JSON.stringify(lastFile);
    fs.writeFile("data.json", generateJSON, (err) => {
        if (err) throw err;
    });
}

function makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getFileType(fileName) {
    var str = "";
    // modify to accept additional file types
    var permittedFileTypes = [".jpg", ".jpeg", ".gif", ".png"];
    for (let i = fileName.length - 1; i >= 0; i--) {
        if (fileName[i] === ".") break;
        str += fileName[i];
    }
    var reverseStr = ".";
    for (let i = str.length - 1; i >= 0; i--) {
        reverseStr += str[i];
    }
    reverseStr = reverseStr.toLowerCase();
    var hasMatch = false;
    for (let i = 0; i < permittedFileTypes.length; i++) {
        if (reverseStr === permittedFileTypes[i]) {
            hasMatch = true;
            break;
        }
    }
    if (hasMatch) {
        return reverseStr;
    } else {
        return false;
    }
}

function buildUrl(message) {
    var getIndex = message.indexOf("http");
    if (getIndex === -1) {
        return getIndex;
    }
    var url = "";
    for (let i = getIndex; i < message.length; i++) {
        if (message[i] === " ") {
            break;
        }
        url += message[i];
    }
    return url;
}

async function downloadUrl(message, throwError) {
    var fileName = "";
    url = buildUrl(message);
    if (url === -1) {
        if (throwError) {
            bot.channels.get(process.env.DISCORD_CHANNEL).send("Need an image, doc.");
            throw "No Image Found";
        } else {
            return false;
        }
    }
    fileName = makeId(12);
    fileType = getFileType(url);
    if (fileType) {
        fileName += fileType;
        await downloadImage(url, `images/${fileName}`);
        return fileName;
    } else {
        return false;
    }
}

async function handlePost(msg) {
    try {
        var fileName = "";
        var fileLink = "";
        var isUrl = false;
        var hasErr = false;
        if (msg.attachments) {
            // check character limit
            var charLimit = msg.content.length < 280;
            if (charLimit) {
                bot.channels.get(process.env.DISCORD_CHANNEL).send("Too many characters!");
                throw "Too many characters";
            }
            fileName = msg.attachments[0].filename;
            fileLink = msg.attachments[0].url;
            var fileType = getFileType(fileLink);
            if (fileType) {
                await downloadImage(msg.attachments[0].url, `images/${fileName}`);
            } else {
                bot.channels.get(process.env.DISCORD_CHANNEL).send("File type not permitted!");
                throw "File type not permitted";
            }
        } else {
            isUrl = true;
            fileName = await downloadUrl(msg.content, true);
            if (fileName) {
                fileLink = msg.content;
            } else {
                throw "File type not permitted";
            }
        }
        var getImage = fs.readFileSync(`./images/${fileName}`);
        if (msg.content && msg.content.length > 0) {
            await handleTwitter(isUrl, getImage, msg.content)
                  .catch(err => hasErr = err);
        } else {
            await handleTwitter(isUrl, getImage)
                 .catch(err => hasErr = err);
        }
        if (hasErr) throw hasErr;
        await createJSON(fileLink);
    } catch (err) {
        console.log(err);
    }
}

async function handleTwitter(isUrl, getImage, message) {
  return new Promise((resolve, reject) => { 
        client.post("media/upload", { media: getImage }, (error, media, response) => {
            if (!error) {
                var status = {};
                if (isUrl) {
                    status = {
                        media_ids: media.media_id_string,
                    };
                } else {
                    status = {
                        status: message,
                        media_ids: media.media_id_string,
                    };
                }
                client.post("statuses/update", status, (error, tweet, response) => {
                    if (!error) {
                        console.log("twitted!");
                        bot.channels.get(process.env.DISCORD_CHANNEL).send("Giddy Up!");
                        resolve();
                    } else {
						bot.channels.get(process.env.DISCORD_CHANNEL).send("Something went wrong creating the tweet!");
                        reject(error);
                    }
                });
            } else {
                bot.channels.get(process.env.DISCORD_CHANNEL).send("Something went wrong uploading the image!");
                reject(error);
            }
        });
    });
}

function buildObject(msg) {
    var getAttachments = msg.attachments.array();
    var message = {};
    if (getAttachments.length) {
        message["attachments"] = [{
            filename: getAttachments[0].filename,
            url: getAttachments[0].url,
        }];
    }
    if (msg.content) {
        message["content"] = msg.content;
    }
    return message;
}

bot.on("ready", async () => {
    console.log("Bot is running!");
    if (!fs.existsSync("./images")){
        fs.mkdirSync("./images");
    }
    var getMessages = (await bot.channels.get(process.env.DISCORD_CHANNEL).fetchMessages()).array();
    let hasDataJSON = fs.existsSync(`data.json`);
    if (hasDataJSON) {
        var dataJSON = require("./data.json");
        var discordUrl = dataJSON.discordUrl;
        if (discordUrl) {
            var urlArray = [];
            var message = {};
            var insertedArray = false;
            // attachment takes precedence over pasted urls
            for (let i = 0; i < getMessages.length; i++) {
                insertedArray = false;
                if (!getMessages[i].author.bot) {
                    if (getMessages[i].attachments) {
                        var url = getMessages[i].attachments.find(val => val.url === discordUrl);
                        if (!!url) {
                            break;
                        } else {
                            // get content 
                            var getUrl = getMessages[i].attachments.map((d) => d.url);
                            if (getUrl.length > 0) {
                                var fileType = getFileType(getUrl[0]);
                                if (fileType) {
                                    var hasContent = buildUrl(getMessages[i].content);
                                    if (hasContent === -1 && getMessages[i].content.length > 0) {
                                        message["content"] = getMessages[i].content;
                                    }
                                    var getFileName = getMessages[i].attachments.map((d) => d.filename);
                                    message["attachments"] = [{
                                        filename: getFileName[0],
                                        url: getUrl[0],
                                    }];
                                    urlArray.push(message);
                                    insertedArray = true;
                                    message = {};
                                }
                            }
                        }
                    }
                    if (getMessages[i].content === discordUrl) {
                        break;
                    } else if (!insertedArray) {
                        var url = buildUrl(getMessages[i].content);
                        if (url !== -1) {
                            var fileType = getFileType(url);
                            if (fileType) {
                                message["content"] = getMessages[i].content;
                                urlArray.push(message);
                                message = {};
                            }
                        }
                    }
                }
            }
            for (let i = urlArray.length - 1; i >= 0; i--) {
                await handlePost(urlArray[i]);
            }
        }
    }
});

bot.on("message", async msg => {
    if (msg.channel.id === process.env.DISCORD_CHANNEL) {
        if (!msg.author.bot) {
            try {
                var message = buildObject(msg);
                await handlePost(message);
            } catch (err) {
                console.log("ERROR: ", err);
            }
        }
    }
});

bot.login(token);
