const {
    getFileType,
    buildObject,
} = require("./utils");
const {
    downloadImage,
    createJSON,
} = require("./file");
const fs = require("fs");
const path = require("path");

exports.onInit = async function () {
    console.log("Bot is running!");
    if (!fs.existsSync("./images")) {
        fs.mkdirSync("./images");
    }
    var getMessages = (await bot.channels.get(process.env.DISCORD_CHANNEL).fetchMessages()).array();
    let hasDataJSON = fs.existsSync(`data.json`);
    if (hasDataJSON) {
        // in case the bot "starts" again, force load updated data file
        var filename = path.resolve('./data.json');
        delete require.cache[filename];
        var dataJSON = require("./data.json");
        var discordID = dataJSON.discordID;
        if (discordID) {
            var urlArray = [];
            var message = {};
            // attachment takes precedence over pasted urls
            for (let i = 0; i < getMessages.length; i++) {
                if (!getMessages[i].author.bot) {
                    if (getMessages[i].id === discordID) break;
                    const hasAttachmentFile = !!getMessages[i].attachments.find((d) => d.filename);
                    if (hasAttachmentFile || getMessages[i].embeds.length > 0) {
                        var getUrl;
                        if (hasAttachmentFile) {
                            getUrl = getMessages[i].attachments.map((d) => d.url);
                        } else {
                            getUrl = getMessages[i].embeds[0].url;
                        }
                        if (getUrl.length > 0) {
                            message = buildObject(getMessages[i]);
                            urlArray.push(message);
                            message = {};
                        }
                    }
                } 
            }
            for (let i = urlArray.length - 1; i >= 0; i--) {
                await exports.handlePost(urlArray[i]);
            }
        }
    }
}

exports.handlePost = async function (msg) {
    try {
        var fileName = "";
        var fileLink = "";
        if (msg.attachments) {
            // check character limit
            var charLimit = msg.content ? msg.content.length > 280 : false;
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
                await createJSON(msg.id);
                bot.channels.get(process.env.DISCORD_CHANNEL).send("File type not permitted!");
                throw "File type not permitted";
            }
            var getImage = fs.readFileSync(`./images/${fileName}`);
            await exports.handleTwitter(getImage, msg.content)
                .catch(err => { throw err });
            await createJSON(msg.id);
        }
    } catch (err) {
        console.log(err);
    }
}

exports.handleTwitter = async function (getImage, message) {
    return new Promise((resolve, reject) => {
        client.post("media/upload", { media: getImage }, (error, media, response) => {
            if (!error) {
                var status = {
                    status: message,
                    media_ids: media.media_id_string,
                };
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