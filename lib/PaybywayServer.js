var querystring = require('querystring');
var http = require('http');
var https = require('https');
var HmacSHA256 = require('crypto-js/hmac-sha256');

function Impl() 
{
	this.authOptions = { 
		host: 'www.paybyway.com',
		path: '/pbwapi/auth_payment',
		port: 443,
		method: 'POST',
		https: true
	};

	this.statusOptions = { 
		host: 'www.paybyway.com',
		path: '/pbwapi/check_payment_status',
		port: 443,
		method: 'POST',
		https: true
	};

	this.captureOptions = {
		host: 'www.paybyway.com',
		path: '/pbwapi/settle',
		port: 443,
		method: 'POST',
		https: true
	};

	this.cancelOptions = {
		host: 'www.paybyway.com',
		path: '/pbwapi/cancel',
		port: 443,
		method: 'POST',
		https: true
	};

	this.chargeCardTokenOptions = { 
		host: 'www.paybyway.com',
		path: '/pbwapi/charge_card_token',
		port: 443,
		method: 'POST',
		https: true
	};

	this.getCardTokenOptions = { 
		host: 'www.paybyway.com',
		path: '/pbwapi/get_card_token',
		port: 443,
		method: 'POST',
		https: true
	};

	this.deleteCardTokenOptions = { 
		host: 'www.paybyway.com',
		path: '/pbwapi/delete_card_token',
		port: 443,
		method: 'POST',
		https: true
	};
}

Impl.prototype.apiVersion = "w2.1";
Impl.prototype.privateKey = "";
Impl.prototype.apiKey = "";

Impl.prototype.setApiVersion = function(apiVersion) {
	this.apiVersion = apiVersion;
}

Impl.prototype.setPrivateKey = function(privateKey) {
	this.privateKey = privateKey;
}

Impl.prototype.setApiKey  = function(apiKey) {
	this.apiKey  = apiKey;
}

Impl.prototype.doRequest = function(postDataObject, options, callBack, callbackParam) {
	var protocol, postData = JSON.stringify(postDataObject);

	if(options.https) {
		protocol = https;
	}

	options.headers = {
		'content-type': 'application/x-www-form-urlencoded',
		'content-length': postData.length
	};

	var r = protocol.request(options, function(response) {
		var received = "", parsed;
		response.on('data', function(data) { received += data; });			
		response.on('end', function() {

			try {
				parsed = JSON.parse(received);
			} 
			catch(error) {
				return callBack(error, callbackParam);
			}

			if(parsed && parsed.hasOwnProperty('result')) {
				return callBack(null, callbackParam, parsed);
			}

			return callBack(new Error("Malformed response from Paybyway API"), callbackParam);
		});
	});

	r.write(postData);
	r.end();

	r.on('error', function(error) {
		callBack(error, callbackParam);
	});
}

Impl.prototype.createCharge = function(charge, result) {

	if(this.privateKey === "" || this.apiKey === "")
		return result(new Error("Private key or api key not set"));

	if(!charge || !charge.amount || !charge.currency)
		return result(new Error("createCharge: Invalid parameters"));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.amount + '|' + charge.currency, this.privateKey).toString().toUpperCase())
	};

	if(charge.customer)
		postDataObject.customer = charge.customer;

	if(charge.products)
		postDataObject.products = charge.products;

	if(charge.register_card_token && charge.register_card_token == 1)
		postDataObject.register_card_token = 1;

	return this.doRequest(postDataObject, this.authOptions, result, charge)
}

Impl.prototype.chargeCardToken = function(charge, result) {
	if(this.privateKey === "" || this.apiKey === "")
		return result(new Error("Private key or api key not set"));

	if(!charge || !charge.amount || !charge.currency || !charge.card_token)
		return result(new Error("createCharge: Invalid parameters"));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'card_token': encodeURIComponent(charge.card_token),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.amount + '|' + charge.currency + '|' + charge.card_token, this.privateKey).toString().toUpperCase())
	};

	if(charge.customer)
		postDataObject.customer = charge.customer;

	if(charge.products)
		postDataObject.products = charge.products;

	return this.doRequest(postDataObject, this.chargeCardTokenOptions, result, charge);
}

Impl.prototype.statusCheck = function(token, result) {
	
	if(this.privateKey === "" || this.apiKey === "")
		return result(new Error("Private key or api key not set"), token);

	if(!token)
		return result(new Error("statusCheck: token missing"), token);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + token, this.privateKey).toString().toUpperCase()),
		'token': encodeURIComponent(token)
	};


	return this.doRequest(postDataObject, this.statusOptions, result, token)
}

Impl.prototype.capture = function(orderNumber, result) {
	if(!orderNumber)
		return result(new Error("capture: order number missing"), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.captureOptions, result, orderNumber)
}

Impl.prototype.cancel = function(orderNumber, result) {
	if(!orderNumber)
		return result(new Error("Cancel: order number missing"), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.cancelOptions, result, orderNumber)
}

Impl.prototype.getCardToken = function(cardToken, result) {
	if(!cardToken)
		return result(new Error("getCardToken: card token missing"), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.getCardTokenOptions, result, cardToken)
}

Impl.prototype.deleteCardToken = function(cardToken, result) {
	if(!cardToken)
		return result(new Error("getCardToken: card token missing"), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.deleteCardTokenOptions, result, cardToken)
}

module.exports = new Impl();
