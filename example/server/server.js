// Express package is required for this example
var express = require('express');
var sys = require('sys');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');

var app = express();

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

paybyway.authOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/auth_payment',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.statusOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/check_payment_status',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.captureOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/capture',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.cancelOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/cancel',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.chargeCardTokenOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/charge_card_token',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.getCardTokenOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/get_card_token',
	port: 443,
	method: 'POST',
	https: true
};

paybyway.deleteCardTokenOptions = { 
	host: 'www.paybyway.com',
	path: '/pbwapi/delete_card_token',
	port: 443,
	method: 'POST',
	https: true
};

// Set private key and api key
paybyway.setPrivateKey('private key');
paybyway.setApiKey('api key');

var orderCounter = 1;

var paymentHandler = function(request, response, next) {  	
	console.log("Server got a request: " + request.url);  

	var pieces = url.parse(request.url, true)
	
	try {
		if(request.url.match(/^.get_token/)) {
			console.log("got a token request.");

			// Create charge with customer details and two products
			paybyway.createCharge({
				amount: 100,
				order_number: 'test-order-' + (orderCounter++) + '-' + new Date().getTime(), // Order number shall be unique for every order
				currency: 'EUR',
				register_card_token: 0, // Boolean integer defining if a card specific token should be registered.
				customer: { // Optional customer details

					// All fields are optional
					firstname: 'Test',
					lastname: 'Person',
					email: 'koo@koo.com',
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
			}, function(error, charge, result) {

				console.log('createCharge response: ', result);

				var token = "";
				if(error) {
					console.log("Error: " + error.message);
					response.status(500);
				}
				else {
					// Token is returned in successful response
					if(result.result == 0) {
						console.log("got token = " + result.token + " for charge = " + charge.order_number);
						token = result.token;
					}
				}

				// Token echoed back to front-end
				response.end(token);
			});
		} 
		else if(request.url.match(/^.complete/)) {
			var received = "";

			request.on('data', function(data) { received += data; });
			request.on('end', function() {
				var stuff = querystring.parse(received);
				console.log('checking status for token = ' + stuff.token);
				paybyway.statusCheck(stuff.token, function(error, token, result) {
					var resultMsg = '';

					console.log('statusCheck response: ', result);

					if(error){
						console.log("Got error: " + error.message);
						response.status(500);
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

					// Response echoed back to front-end
					response.end(resultMsg);
				});
			});
		}
		else {
			next();
		}
	}
	catch(error) {
		console.log("exception: " + error);
	}
};

app.use(allowCrossDomain);
app.use(paymentHandler);

// Serve the demo page folder
app.use(express.static(__dirname + '/../page'));
var port = 8000;
server.listen(port);

console.log("Server running at port " + port);
