const open = require('open');
const notifier = require('node-notifier');

let Parser = require('rss-parser');
let parser = new Parser();

// String
//notifier.notify('Message');

(async () => {

	let feed = await parser.parseURL('https://elky84.github.io/feed.xml');
	console.log(feed.title);

	feed.items.forEach(item => {
		//console.log(item.title + ':' + item.link)
		notifier.notify({
			title: item.title,
			message: item.link,
			sound: true,
			wait: true
		}, function (err, response) {
			if (err != null && err != "") {
				console.log(err)
			} else {
				console.log(item.title + ':' + item.link)
				open(item.link);
			}
		});
	});

})();