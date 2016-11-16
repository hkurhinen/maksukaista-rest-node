var querystring = require('querystring');
var http = require('http');
var https = require('https');
var request = require('request');
var util = require('util');
var HmacSHA256 = require('crypto-js/hmac-sha256');

function Impl() {
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

/*
	Error types:
	1: Malformed response from Paybyway API
	2: Private key or api key not set
	3: Invalid parameters
	4: Protocol error
	5: Mac check failed
*/

function paybywayError(message, type) {
	this.message = message;
	this.type = type;
}

Impl.prototype.apiUrl = "https://www.paybyway.com/pbwapi/";
Impl.prototype.apiVersion = "w3";
Impl.prototype.privateKey = "";
Impl.prototype.apiKey = "";

Impl.prototype.setApiVersion = function (apiVersion) {
	this.apiVersion = apiVersion;
}

Impl.prototype.setPrivateKey = function (privateKey) {
	this.privateKey = privateKey;
}

Impl.prototype.setApiKey = function (apiKey) {
	this.apiKey = apiKey;
}

Impl.prototype.doRequest = function (postDataObject, options, callBack, callbackParam) {
	var protocol = 'http';
	var postData = JSON.stringify(postDataObject);

	if (options.https) {
		protocol = 'https';
	}

	request({
    url: util.format('%s://%s%s', protocol, options.host, options.path),
    method: options.method,
    body: postData
	}, function (error, response, body) {
    if (error) {
			callBack(error, callbackParam);
    } else {
			try {
				var parsed = JSON.parse(body);
			} catch (error) {
				return callBack(error, callbackParam);
			}

			if (parsed && parsed.hasOwnProperty('result')) {
				return callBack(null, callbackParam, parsed);
			}

			return callBack(new paybywayError("Malformed response from Paybyway API", 1), callbackParam);
    }
	});
}

Impl.prototype.createCharge = function (charge, result) {

	if (this.privateKey === "" || this.apiKey === "")
		return result(new paybywayError("Private key or api key not set", 2));

	if (!charge || !charge.amount || !charge.currency || !charge.order_number || !charge.payment_method)
		return result(new paybywayError("createCharge: Invalid parameters", 3));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'payment_method': charge.payment_method,
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number, this.privateKey).toString().toUpperCase())
	};

	if (charge.customer)
		postDataObject.customer = charge.customer;

	if (charge.products)
		postDataObject.products = charge.products;

	return this.doRequest(postDataObject, this.authOptions, result, charge)
}

Impl.prototype.chargeCardToken = function (charge, result) {
	if (this.privateKey === "" || this.apiKey === "")
		return result(new paybywayError("Private key or api key not set", 1));

	if (!charge || !charge.amount || !charge.currency || !charge.card_token)
		return result(new paybywayError("createCharge: Invalid parameters", 3));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'card_token': encodeURIComponent(charge.card_token),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number + '|' + charge.card_token, this.privateKey).toString().toUpperCase())
	};

	if (charge.customer)
		postDataObject.customer = charge.customer;

	if (charge.products)
		postDataObject.products = charge.products;

	return this.doRequest(postDataObject, this.chargeCardTokenOptions, result, charge);
}

Impl.prototype.statusCheck = function (token, result) {

	if (this.privateKey === "" || this.apiKey === "")
		return result(new paybywayError("Private key or api key not set", 2), token);

	if (!token)
		return result(new paybywayError("statusCheck: token missing", 3), token);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + token, this.privateKey).toString().toUpperCase()),
		'token': encodeURIComponent(token)
	};


	return this.doRequest(postDataObject, this.statusOptions, result, token)
}

Impl.prototype.capture = function (orderNumber, result) {
	if (!orderNumber)
		return result(new paybywayError("capture: order number missing", 3), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.captureOptions, result, orderNumber)
}

Impl.prototype.cancel = function (orderNumber, result) {
	if (!orderNumber)
		return result(new paybywayError("Cancel: order number missing", 3), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.cancelOptions, result, orderNumber)
}

Impl.prototype.getCardToken = function (cardToken, result) {
	if (!cardToken)
		return result(new paybywayError("getCardToken: card token missing", 3), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.getCardTokenOptions, result, cardToken)
}

Impl.prototype.deleteCardToken = function (cardToken, result) {
	if (!cardToken)
		return result(new paybywayError("getCardToken: card token missing", 3), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.deleteCardTokenOptions, result, cardToken)
}

Impl.prototype.checkReturn = function (params, result) {

	if (params.hasOwnProperty('RETURN_CODE')
		&& params.hasOwnProperty('AUTHCODE')
		&& params.hasOwnProperty('ORDER_NUMBER')) {

		var macInput = params.RETURN_CODE + '|' + params.ORDER_NUMBER;

		if (params.hasOwnProperty('SETTLED'))
			macInput += '|' + params.SETTLED;
		if (params.hasOwnProperty('CONTACT_ID'))
			macInput += '|' + params.CONTACT_ID;
		if (params.hasOwnProperty('INCIDENT_ID'))
			macInput += '|' + params.INCIDENT_ID;

		var calculatedMac = HmacSHA256(macInput, this.privateKey).toString().toUpperCase();

		if (calculatedMac === params.AUTHCODE)
			return result(null, params);

		return result(new paybywayError('checkReturn: MAC check failed', 5), params);
	}

	return result(new paybywayError('checkReturn: Invalid parameters', 3), params);
}

module.exports = new Impl();
