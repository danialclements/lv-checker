require('dotenv').config();
const puppeteer = require('puppeteer');
const $ = require('cheerio');
const PushBullet = require('pushbullet');
const pusher = new PushBullet(process.env.PUSHBULLET_TOKEN);
const checkMins = 5;
const appName = 'Louis Luitton Checker';

const lvIsInStock = (el) => {
	return el.text().indexOf('Currently out of stock online') === -1;
};

const products = [
	{
		title: 'POCHETTE ACCESSOIRES',
		url: 'https://en.louisvuitton.com/eng-nl/products/pochette-accessoires-monogram-005656',
		selector: '.notInStockMessage',
		inStock: lvIsInStock,
		hasNotified: false
	}
];

function notify(title, body) {
	return new Promise((resolve, reject) => {
		pusher.devices({}, (err, res) => {
			if (err) {
				return reject(err);
			}

			res.devices.forEach(device => {
				pusher.note(device.iden, title, body, (err, res) => {});
			});

			resolve();
		});
	});
}

const checkProducts = async products => {
	products.forEach(async product => {
		try {
			const browser = await puppeteer.launch();
			const page = await browser.newPage();
			await page.goto(product.url);
	
			const content = await page.content();
			const isTrue = product.inStock($(product.selector, content));
	
			if (isTrue && !product.hasNotified) {
				console.log(`${product.title} in stock, notifying Priscilla`);
				await notify(`${appName}: ${product.title} in Stock!`, `${product.title} is in stock.  Find out more at ${product.url}`);
				product.hasNotified = true;
			} else {
				console.log(`${product.title} not in stock, maybe next time`);
			}
		} catch (e) {
			console.log('There was an error', e);
		}
	});
}


const doCheck = async () => {
	console.log(`${new Date().toISOString()}: Checking Products`);
	checkProducts(products);
	setTimeout(doCheck, checkMins * 60000);
}

(async () => {
	notify(`Starting ${appName}`, `Starting ${appName} to check all your nice things`);
	doCheck();
})()

const onExit = async () => {
	console.log('App Exiting, ending notify message;')
	await notify(`${appName} Exited','The application has closed and will no longer be monitoring products.  Please contact your administrator to have the application restarted`);
}

process.on('exit', onExit);
process.on('SIGINT', onExit);
process.on('uncaughtException', onExit);