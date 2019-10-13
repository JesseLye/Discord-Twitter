require("dotenv").config();
const Discord = require("discord.js");
const Twitter = require('twitter');
const token = process.env.DISCORD_TOKEN;

global.bot = new Discord.Client();
global.client = new Twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

const {
    onInit,
    handlePost,
} = require("./api.js");

const {
    buildObject
} = require("./utils.js");

bot.on("ready", async () => {
  await onInit();
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