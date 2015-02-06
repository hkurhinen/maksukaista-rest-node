// Express package is required for this example
var express = require('express');
var sys = require('sys');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');

var app = express();

// Define certificate file locations
var privateKeyPath = 'key.pem';
var certFilePath = 'cert.pem';

// Checking if we can establish https connection
if (fs.existsSync(privateKeyPath) && fs.existsSync(certFilePath)) {
	var privateKey = fs.readFileSync(privateKeyPath).toString();
	var certificate = fs.readFileSync(certFilePath).toString();
	var credentials = {key: privateKey, cert: certificate};
	var webProtocol = require('https');
	var server = webProtocol.createServer(credentials, app);
	sys.puts("SSL taken into use");
}
else {
	var webProtocol = require('http');
	var server = webProtocol.createServer(app);
	sys.puts("Cannot find cert files, SSL not in use");
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'POST');
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
};

var pbwModule = require("maksukaista-rest");
var paybyway = pbwModule.create();

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

// Set merchant id and private key
paybyway.setMerchantId(0);
paybyway.setPrivateKey('private key');

var orderCounter = 1;

var paymentHandler = function(request, response, next) {  	
	sys.puts("Server got a request: " + request.url);  

	var pieces = url.parse(request.url, true)
	
	try {
		if(request.url.match(/^.get_token/)) {
			sys.puts("got a token request.");

			// Create charge with customer details and two products
			paybyway.createCharge({
				amount: 100,
				order_number: 'test-order-' + (orderCounter++) + '-' + new Date().getTime(), // Order number shall be unique for every order
				currency: 'EUR',
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
			}, function(error, charge, token) {
				if(error) {
					sys.puts("Got error: " + error.message);
					response.status(500);
				}

				// Token is returned in successful response
				if(token) {
					sys.puts("got token = " + token + " for charge = " + charge.order_number);
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
				sys.puts('checking status for token = ' + stuff.token);
				paybyway.statusCheck(stuff.token, function(error, token, result) {
					if(error){
						sys.puts("Got error: " + error.message);
						response.status(500);
					}
					
					if(result === '000') {
						sys.puts("token = " + token + " payment completed successfully!");
					}
					else {
						sys.puts("token = " + token + " payment failed, result = " + result);
					}

					// Response echoed back to front-end
					response.end(result);
				});
			});
		}
		else {
			next();
		}
	}
	catch(error) {
		sys.puts("exception: " + error);
	}
};

app.use(allowCrossDomain);
app.use(paymentHandler);

// Serve the demo page folder
app.use(express.static(__dirname + '/../page'));
var port = 8000;
server.listen(port);

sys.puts("Server running at port " + port);
