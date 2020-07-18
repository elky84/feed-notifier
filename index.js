var express = require('express');
var app = express();
var bodyParser  = require('body-parser');
var axios = require('axios')
var fs = require('fs');
var _ = require('lodash');
let Parser = require('rss-parser');
let parser = new Parser();
var moment = require('moment')

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
console.log("config: " + JSON.stringify(config));

var sourcesRss = JSON.parse(fs.readFileSync('./feed.json', 'utf8'));

function pollFeed() {
    try {
        const hook = config["hook"];
        var latestTime;
        
        try {
            var latest = fs.readFileSync('./latest.json', 'utf8');
            latestTime = latest['time']
        }
        catch(err) {
            latestTime = moment().subtract(1, 'day')
        }

        _.forEach(sourcesRss["sources-rss"], function(source) {
            // console.log(source);
    
            parser.parseURL(source.url, function(err, feed) {
                if (err) {
                    console.log(err);
                    return;
                }

                console.log(feed.title);

                var messages = []
                feed.items.forEach(item => {
                    // console.log(item.title + ':' + item.link)
                    if(latestTime > moment(item.pubDate)) {
                        return false;
                    }

                    messages.push('[' + item.title + '] ' + item.link + ' <' + moment(item.pubDate).format('YYYY-MM-DD HH:mm') + '>');
                });

                if(messages.length <= 0) {
                    return;
                }

                message = {"text": messages.join("\n"), "username": feed.title, "icon_url": hook.icon_url, "channel": hook.channel}
                axios.post(hook.hook_url, message).then((result) => {
                    console.log(result);
                });

            });
        });

        fs.writeFileSync('./latest.json', JSON.stringify({time: moment()}));
    }
    catch(e) {
        console.log(e);
    }

}

// 우선 한번 실행하고
pollFeed();

// interval단위 실행
setInterval(pollFeed, 3 * 60 * 1000);
