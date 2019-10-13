const {
    buildUrl,
    getFileType,
    buildObject,
} = require("./utils");
const {
    downloadImage,
    downloadUrl,
    createJSON,
} = require("./file");
const fs = require("fs");

exports.onInit = async function() {
    console.log("Bot is running!");
    if (!fs.existsSync("./images")){
        fs.mkdirSync("./images");
    }
    var getMessages = (await bot.channels.get(process.env.DISCORD_CHANNEL).fetchMessages()).array();
    let hasDataJSON = fs.existsSync(`data.json`);
    if (hasDataJSON) {
        var dataJSON = require("./data.json");
        var discordID = dataJSON.discordID;
        if (discordID) {
            var urlArray = [];
            var message = {};
            var insertedArray = false;
            // attachment takes precedence over pasted urls
            for (let i = 0; i < getMessages.length; i++) {
                insertedArray = false;
                if (!getMessages[i].author.bot) {
                    if (getMessages[i].attachments) {
                        if (getMessages[i].id === discordID) {
                            break;
                        } else {
                            // get content 
                            var getUrl = getMessages[i].attachments.map((d) => d.url);
                            if (getUrl.length > 0) {
                                message = buildObject(getMessages[i]);
                                urlArray.push(message);
                                insertedArray = true;
                                message = {};
                            }
                        }
                    }
                    if (!insertedArray && getMessages[i].content === discordID) {
                        break;
                    } else if (!insertedArray) {
                        var url = buildUrl(getMessages[i].content);
                        if (url !== -1) {
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

exports.handleTwitter = async function(isUrl, getImage, message) {
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

exports.handlePost = async function(msg) {
    try {
        var fileName = "";
        var fileLink = "";
        var isUrl = false;
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
                bot.channels.get(process.env.DISCORD_CHANNEL).send("File type not permitted!");
                throw "File type not permitted";
            }
        } else {
            isUrl = true;
            fileName = await downloadUrl(msg.content);
            if (fileName) {
                fileLink = msg.content;
            } else {
                bot.channels.get(process.env.DISCORD_CHANNEL).send("File type not permitted!");
                throw "File type not permitted";
            }
        }
        var getImage = fs.readFileSync(`./images/${fileName}`);
        if (msg.content && msg.content.length > 0) {
            await exports.handleTwitter(isUrl, getImage, msg.content)
                  .catch(err => { throw err });
        } else {
            await exports.handleTwitter(isUrl, getImage)
                 .catch(err => { throw err });
        }
        await createJSON(msg.id);
    } catch (err) {
        console.log(err);
    }
}