const fetch = require("node-fetch");
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