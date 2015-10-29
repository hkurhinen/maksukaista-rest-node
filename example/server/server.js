// Express package is required for this example
var express = require('express');
var sys = require('sys');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');

var app = express();
var router = express.Router();

// Define certificate file locations
var privateKeyPath = '/root/certs/key.pem';
var certFilePath = '/root/certs/cert.pem';

// Checking if we can establish https connection
if (fs.existsSync(privateKeyPath) && fs.existsSync(certFilePath)) {
	var privateKey = fs.readFileSync(privateKeyPath).toString();
	var certificate = fs.readFileSync(certFilePath).toString();
	var credentials = {key: privateKey, cert: certificate};
	var webProtocol = require('https');
	var server = webProtocol.createServer(credentials, app);
	console.log("SSL taken into use");
}
else {
	var webProtocol = require('http');
	var server = webProtocol.createServer(app);
	console.log("Cannot find cert files, SSL not in use");
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'POST');
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
};

var paybyway = require("../../lib/PaybywayServer.js");

// Set private key and api key
paybyway.setPrivateKey('private key');
paybyway.setApiKey('api key');

var orderCounter = 1;

router.get('/', express.static(__dirname + '/../page'));

router.get('/create-charge/:type/:selected?', function(req, res) {
	var paymentType = req.params.type;
	var selected = typeof req.params.selected !== 'undefined' ? req.params.selected : null;

	console.log('Creating charge, type = ' + paymentType);

	var chargeObject = {
		amount: 100,
		order_number: 'test-order-' + (orderCounter++) + '-' + new Date().getTime(), // Order number shall be unique for every order
		currency: 'EUR',
		customer: { // Optional customer details

			// All fields are optional
			firstname: 'Test',
			lastname: 'Person',
			email: 'testperson@maksukaista.fi',
			address_street: 'Testaddress 1',
			address_city: 'Testlandia',
			address_zip: '12345'
		},
		products: [{ // Optional product fields

				// All fields required
				id: 'test-product-1',
				title: 'Test Product 1',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50, // Product prices must match with total amount
				type: 1
			},
			{
				id: 'test-product-2',
				title: 'Test Product 2',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50,
				type: 1
			}
		]
	};

	if(paymentType === 'e-payment') {
		var paymentMethod = {
			type: 'e-payment',
			return_url: req.protocol + '://' + req.get('host') + '/e-payment-return',
			notify_url: req.protocol + '://' + req.get('host') + '/e-payment-notify',
			lang: 'en'		
		}

		if(selected)
			paymentMethod.selected = [selected];
	}
	else {
		var paymentMethod = {
			type: 'card',
			register_card_token: 0	
		}
	}

	chargeObject.payment_method = paymentMethod;

	paybyway.createCharge(chargeObject, function(error, charge, result) {

		console.log('createCharge response: ', result);

		var token = "";
		if(error) {
			console.log("Error: " + error.message);
			res.status(500);
		}
		else {
			// Token is returned in successful response
			if(result.result == 0) {
				console.log("Got token = " + result.token + " for charge = " + charge.order_number);
				token = result.token;
			}
		}

		if(paymentType === 'e-payment') {
			if(token !== "")
				res.redirect(paybyway.apiUrl + 'token/' + token);
			else
				res.end('Something went wrong when creating a charge.');
		}
		else {
			res.end(token);
		}

	});
});

router.get('/check-payment-status/:token', function(req, res) {
	console.log('checking status for token = ' + req.params.token);

	paybyway.statusCheck(req.params.token, function(error, token, result) {
		var resultMsg = '';

		console.log('statusCheck response: ', result);

		if(error) {
			console.log("Got error: " + error.message);
			res.status(500);
		}
		else {
			if(result.result == 0) {
				console.log("token = " + token + " payment completed successfully!");
				resultMsg = '000';
			}
			else {
				console.log("token = " + token + " payment failed");
				resultMsg = '001';
			}
		}

		res.end(resultMsg);
	});
});

router.get('/e-payment-return', function(req, res) {
	console.log('E-payment return, params:', req.query);

	paybyway.checkReturn(req.query, function(error, result) {

		var message = '<html><body><p>';

		if(error)
		{
			console.log("Got error: " + error.message);
			message += error.message;
			res.status(500);
		}
		else
		{
			switch(result.RETURN_CODE)
			{
				case '0':
					message += 'Payment was successful for order number: ' + result.ORDER_NUMBER;
					break;
				case '4':
					message += 'Transaction status could not be updated after customer returned from the web page of a bank.';
					break;
				case '10':
					message += 'Maintence break';
					break;
				case '1':
					message += 'Payment failed!';
					break;
				default:
					message += 'Unknown return value';
			}
		}

		message += '</p><a href="/">Start again</a></body></html>';
		res.end(message);
	});
});

router.get('/e-payment-notify', function(req, res) {
	console.log('Got notify, params:', req.query);

	paybyway.checkReturn(req.query, function(error, result) {

		if(error)
			console.log("Got error: " + error.message);
		else
			console.log("Return code = " + result.RETURN_CODE + " for order number = " + result.ORDER_NUMBER);
	});

	res.end('');
});

app.use(allowCrossDomain);
app.use(router);
var port = 8000;
server.listen(port);

console.log("Server running at port " + port);
