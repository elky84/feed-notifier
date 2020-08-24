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
        feeds = feeds.concat(feedJson["sources-rss"]);
    });

    pollFeed();
});

var latestDir = 'latest';
!fs.existsSync(latestDir) && fs.mkdirSync(latestDir);

function pollFeed() {
    var latest = {};
    try {
        const hook = config["hook"];
        _.forEach(feeds, function(source) {
            parser.parseURL(source.url, function(err, feed) {
                if (err) {
                    console.log(`${err}, url:${source.url}`);
                    return;
                }

                console.log(feed.title);

                let latestFile = `./${latestDir}/${feed.title}.json`;
                try {
                    latest = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
                }
                catch(err) {
                    console.log(`${latestFile} not found.`);
                }        

                var latestTime = latest['Time'];
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
                    try {
                        if( _.isNil(item.pubDate)) {
                            return false;
                        }
                        
                        var pubDate = moment(item.pubDate);
                        if(!latestTime.isBefore(pubDate)) {
                            return false;
                        }
    
                        if(moment().isBefore(pubDate)) {
                            return false;
                        }
    
                        if(nextLatestTime.isBefore(pubDate)) {
                            nextLatestTime = pubDate;
                        }
    
                        if(item.link.includes('https://') || item.link.includes('http://')) {
                            messages.push(`[${item.title}'] ${item.link} < ${pubDate.format('YYYY-MM-DD HH:mm')}>`);
                        }
                        else {
                            messages.push(`[${item.title}'] ${feed.link}${item.link} < ${pubDate.format('YYYY-MM-DD HH:mm')}>`);
                        }
                    }
                    catch(e) {
                        console.error(e);
                    }
                });

                latest['Time'] = nextLatestTime;
                
                if(messages.length <= 0) {
                    return;
                }

                message = {"text": messages.join("\n"), "username": feed.title, "icon_url": hook.icon_url, "channel": hook.channel}
                axios.post(hook.hook_url, message).then((result) => {
                    console.log(result);
                    
                    fs.writeFileSync(latestFile, JSON.stringify(latest));
                });
            });
        });
    }
    catch(e) {
        console.error(e);
    }
}

// 처음 한번은 바로 실행
pollFeed();

setInterval(pollFeed, 3 * 60 * 1000);
