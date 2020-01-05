exports.buildObject = function(msg) {
    var getAttachments = msg.attachments.array();
    var message = {};
    if (getAttachments.length) {
        message["attachments"] = [{
            filename: getAttachments[0].filename,
            url: getAttachments[0].url,
        }];
        message["content"] = msg.content;
    }
    if(!message.attachments && msg.embeds.length > 0) {
        var embed = msg.embeds[0];
        if (embed.type === "image") {
            message["attachments"] = [{
                filename: exports.makeId(12),
                url: embed.url,
            }];
        }
    }
    message["id"] = msg.id;
    return message;
}

exports.getFileType = function(fileName) {
    var str = "";
    // modify to accept additional file types
    var permittedFileTypes = {
        ".jpg": true,
        ".jpeg": true,
        ".gif": true,
        ".png": true,
    };
    for (let i = fileName.length - 1; i >= 0; i--) {
        if (fileName[i] === ".") break;
        str += fileName[i];
    }
    var reverseStr = ".";
    for (let i = str.length - 1; i >= 0; i--) {
        reverseStr += str[i];
    }
    reverseStr = reverseStr.toLowerCase();
    var hasMatch = permittedFileTypes[reverseStr];
    if (hasMatch) {
        return reverseStr;
    } else {
        return false;
    }
}

exports.makeId = function(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}