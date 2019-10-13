const fetch = require("node-fetch");
const {
    buildUrl,
    makeId,
    getFileType,
} = require("./utils");
const fs = require("fs");

exports.createJSON = async function(discordID) {
    var lastFile = {
        discordID
    };
    var generateJSON = JSON.stringify(lastFile);
    fs.writeFile("data.json", generateJSON, (err) => {
        if (err) throw err;
    });
}

exports.downloadImage = async function(url, path) {
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

exports.downloadUrl = async function(message) {
    var fileName = "";
    url = buildUrl(message);
    if (url === -1) {
        bot.channels.get(process.env.DISCORD_CHANNEL).send("Need an image, doc.");
        throw "No Image Found";
    }
    fileName = makeId(12);
    fileType = getFileType(url);
    if (fileType) {
        fileName += fileType;
        await exports.downloadImage(url, `images/${fileName}`);
        return fileName;
    } else {
        return false;
    }
}