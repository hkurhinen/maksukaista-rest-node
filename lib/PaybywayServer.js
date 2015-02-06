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
}

Impl.prototype.privateKey = "";
Impl.prototype.merchanId = "";

Impl.prototype.setPrivateKey = function(privateKey) {
	this.privateKey = privateKey;
}

Impl.prototype.setMerchantId  = function(merchanId) {
	this.merchanId  = merchanId;
}

Impl.prototype.createCharge = function(charge, result) {

	if(this.privateKey === "" || this.merchanId === "")
		return result(new Error("Private key or merchant id not set"));

	if(!charge || !charge.amount || !charge.currency)
		return result(new Error("createCharge: Invalid parameters"));

	var postDataObject = {
		'version': 'w2',
		'merchant_id': this.merchanId,
		'order_number': charge.order_number,
		'amount': charge.amount,
		'currency': charge.currency,
		'authcode': encodeURIComponent(HmacSHA256(this.merchanId + '|' + charge.amount + '|' + charge.currency, this.privateKey).toString().toUpperCase())
	};

	if(charge.customer)
		postDataObject.customer = charge.customer;

	if(charge.products)
		postDataObject.products = charge.products;
	
	var postData = JSON.stringify(postDataObject);
	var protocol = http;

	if(this.authOptions.https) {
		protocol = https;

		this.authOptions.headers = {
			'content-type': 'application/x-www-form-urlencoded',
			'content-length': postData.length
		};
	}

	var r = protocol.request(this.authOptions, function(response) {
		var token = ""
		response.on('data', function(data) { token += data; })
		response.on('end', function() { 

			try {
				parsed = JSON.parse(token);
			}
			catch(error) {
				return result(error, charge);
			}

			if(parsed.result == 0) {
				return result(null, charge, parsed.token);
			}
			else if(parsed.incident_id) {
				return result(new Error('Payment failed, incident_id = ' + parsed.incident_id), charge); 
			}

			return result(new Error('Payment failed'), charge);
		})
	})

	r.write(postData);
	r.end();

	r.on('error', function(error) {
		result(error, charge)
	});
}

Impl.prototype.statusCheck = function(token, result) {
	
	if(this.privateKey === "" || this.merchanId === "")
		return result(new Error("Private key or merchant id not set"), token);

	if(!token)
		return result(new Error("statusCheck: token missing"), token);

	var postDataObject = {
		'version': encodeURIComponent('w2'),
		'merchant_id': encodeURIComponent(this.merchanId),
		'authcode': encodeURIComponent(HmacSHA256(this.merchanId + '|' + token, this.privateKey).toString().toUpperCase()),
		'token': encodeURIComponent(token)
	};
	
	var postData = JSON.stringify(postDataObject);
	var protocol = http;

	if(this.statusOptions.https) {
		protocol = https;
	}

	this.statusOptions.headers = {
		'content-type': 'application/x-www-form-urlencoded',
		'content-length': postData.length
	};

	var r = protocol.request(this.statusOptions, function(response) {
		var received = "";
		response.on('data', function(data) { received += data; });			
		response.on('end', function() {
			try {
				var returned = JSON.parse(received);
			} 
			catch(error) {
				return result(error, token);
			}
			if(returned.result) {
				result(null, token, String(returned.result));
			}
			else {
				result(new Error('Status check failed'), token);
			}
		});
	});

	r.write(postData);
	r.end();

	r.on('error', function(error) {
		result(error, token);
	});
}

module.exports.create = function() {
    return new Impl()
}
