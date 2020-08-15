var axios = require('axios')
var fs = require('fs');
var _ = require('lodash');
let Parser = require('rss-parser');
let parser = new Parser();
var moment = require('moment')

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
console.log("config: " + JSON.stringify(config));

var feeds = []
var dirPath = 'feeds'
fs.readdir(dirPath, function (err, files) {
    //listing all files using forEach
    files.forEach(function (file) {
        console.log(file); 

        var content = fs.readFileSync(`${dirPath}/${file}`, 'utf8');
        var feedJson = JSON.parse(content);
        feeds.concat(feedJson["sources-rss"]);
    });

    pollFeed();
});


function pollFeed() {
    var latest = {};
    try {
        const hook = config["hook"];
        try {
            latest = JSON.parse(fs.readFileSync('./latest.json', 'utf8'));
        }
        catch(err) {
            console.log(err);
        }

        var promises = []
        _.forEach(feeds, function(source) {
            promises.push(parser.parseURL(source.url, function(err, feed) {
                if (err) {
                    console.log(err);
                    return;
                }

                console.log(feed.title);

                var latestTime = latest[feed.title];
                if( latestTime == undefined) {
                    latestTime = moment().subtract(1, 'week');
                }
                else {
                    latestTime = moment(latestTime);
                }

                var nextLatestTime = latestTime;

                var messages = []
                feed.items.forEach(item => {
                    // console.log(item.title + ':' + item.link)
                    var pubDate = moment(item.pubDate);
                    if(!latestTime.isBefore(pubDate)) {
                        return false;
                    }

                    if(pubDate.isBefore(moment())) {
                        return false;
                    }

                    if(nextLatestTime.isBefore(pubDate)) {
                        nextLatestTime = pubDate;
                    }

                    if(item.link.includes('https://')) {
                        messages.push(`[${item.title}'] ${item.link} < ${pubDate.format('YYYY-MM-DD HH:mm')}>`);
                    }
                    else {
                        messages.push(`[${item.title}'] ${feed.link}${item.link} < ${pubDate.format('YYYY-MM-DD HH:mm')}>`);
                    }
                });


                latest[feed.title] = nextLatestTime;
                
                if(messages.length <= 0) {
                    return;
                }

                message = {"text": messages.join("\n"), "username": feed.title, "icon_url": hook.icon_url, "channel": hook.channel}
                axios.post(hook.hook_url, message).then((result) => {
                    console.log(result);
                });
            }));
        });

        Promise.all(promises).then((values) => {
            fs.writeFileSync('./latest.json', JSON.stringify(latest));
            setTimeout(pollFeed, 3 * 60 * 1000);
        });
    }
    catch(e) {
        console.log(e);
        setTimeout(pollFeed, 3 * 60 * 1000);
    }
}