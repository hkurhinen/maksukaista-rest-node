var nock = require('nock');
var apiUrl = 'https://www.paybyway.com';

QUnit.module('without credentials', {
	setup: function() {
		this.api = require('../lib/PaybywayServer.js');
	}
});

test('create charge returns error if merchant id or private key not set', function() {
	this.api.createCharge({}, function(err, charge, token){
		equal(err.message, 'Private key or api key not set');
	});
});

test('check status returns error if merchant id or private key not set', function() {
	this.api.statusCheck('token', function(err, token, result){
		equal(err.message, 'Private key or api key not set');
		equal(err.type, 2)
		equal(token, 'token');
	});
});

QUnit.module('with credentials', {
	setup: function() {
		this.api = require('../lib/PaybywayServer.js');
		this.api.setPrivateKey('private_key');
		this.api.setApiKey('asd-213');
	}
});

test('create charge returns fails if invalid parameters', function() {

	this.api.createCharge({}, function(err, charge, token){
		equal(err.message, 'createCharge: Invalid parameters');
	});
});

test('create charge should fail if incident id given', function() {

	var response = {
		result: 1,
		incident_id: 'abcd'
	};

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order2',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		start();
		equal(charge.order_number, 'order2');
		equal(result.result, 1);
		equal(result.incident_id, 'abcd');
	});

	stop();
});

test('create charge fails if invalid json returned', function () {
	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, 'äää');

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, token){
		start();
		ok(err, 'err should be defined');
		equal(charge.order_number, 'order3');
	});

	stop();
});

test('create charge fails if not successful response', function () {
	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, {result: 1});

	this.api.createCharge({
		order_number: 'order',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		start();
		equal(result.result, 1);
	});

	stop();
});

test('create charge returns token', function () {

	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		start();
		equal(result.result, 0);
		equal(result.token, '123');
	});

	stop();
});


test('create charge returns token when customer and products set', function () {

	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123,
		customer: {
			firstname: 'test',
			lastname: 'person',
			email: 'a@a.com',
			address_street: 'street',
			address_city: 'city',
			address_zip: '123',
		},
		products: [{
			id: '1',
			title: 'title',
			count: 1,
			tax: 0,
			price: 123,
			pretax_price: 123,
			type: 1
		}]
	}, function(err, charge, result){
		start();
		equal(result.token, '123');
		ok(charge.customer);
		ok(charge.products);
	});

	stop();
});

test('create charge with register card token', function () {
	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'cardtokenorder',
		currency: 'EUR',
		amount: 123,
		payment_method: {
			type: 'card',
			register_card_token: 1
		}
	}, function(err, charge, result) {
		start();
		ok(charge.payment_method.register_card_token);
	});

	stop();

});

test('charge card token', function () {
	var response = {
		result: 0,
		settled: 1
	}

	nock(apiUrl).post('/pbwapi/charge_card_token', {
		'version': 'w3',
		'api_key': 'asd-213',
		'order_number': '234asa',
		'amount': '123',
		'currency': 'EUR',
		'card_token': 'asd4005-123',
		'authcode': '3BB8C1FAFB17B53209DEB7D22E444D88672C7CC9D9B99BF4B96E6253511B4B01'
	}).reply(200, response);

	this.api.chargeCardToken({
		order_number: '234asa',
		currency: 'EUR',
		amount: '123',
		card_token: 'asd4005-123'
	}, function(err, charge, result) {
		start();
		equal(result.result, 0);
	});

	stop();
});

test('check status returns error if no token', function() {
	this.api.statusCheck('', function(err, token, result) {
		equal(err.message, 'statusCheck: token missing');
	});
});

test('check status fails if invalid json returned', function() {
	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, 'äää');

	this.api.statusCheck('token', function(err, token, result) {
		start();
		ok(err, 'err should be defined');
		equal(token, 'token');
	});

	stop();
});

test('check status returns result if successful', function () {
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, response);

	this.api.statusCheck('t', function(err, token, result) {
		start();
		equal(result.result, 0);
		equal(token, 't');
	});

	stop();
});

test('check capture returns error if no order number', function() {
	this.api.capture('', function(err, order_number, result) {
		equal(err.message, 'capture: order number missing');
	});
});

test('capture fails if not successful response', function() {
	var response = {
		result: 1
	}

	nock(apiUrl).post('/pbwapi/settle').reply(200, response);

	this.api.capture('123', function(err, order_number, result) {
		start();
		equal(order_number, '123');
		equal(result.result, 1);
	});

	stop();
});

test('capture returns result if successful response', function() {
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/settle').reply(200, response);

	this.api.capture('1234', function(err, order_number, result) {
		start();
		equal(order_number, '1234');
		equal(result.result, 0);
	});

	stop();
});

test('cancel fails if not successful response', function() {
	var response = {
		result: 1
	}

	nock(apiUrl).post('/pbwapi/cancel').reply(200, response);

	this.api.cancel('1234', function(err, order_number, result) {
		start();
		equal(result.result, 1);
		equal(order_number, '1234');
	});

	stop();
});

test('cancel returns result if successful response', function() {
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/cancel').reply(200, response);

	this.api.cancel('1234', function(err, order_number, result) {
		start();
		equal(order_number, '1234');
		equal(result.result, 0);
	});

	stop();
});

test('get card token', function () {
	var response = {
		result: 0,
		source: {
			object: "card",
			last4: "1111",
			brand: "Visa",
			exp_year: 2018,
			exp_month: 5,
			card_token: "card-123"
		}
	}

	nock(apiUrl).post('/pbwapi/get_card_token', {
		"version": "w3",
		"api_key": "asd-213",
		"card_token": "card-123",
		"authcode": "8F5C2A8768901DFC1621C7FD3D7E01A35F6117557F8AB181BD7D0DBC5B32CD8C"
	}).reply(200, response);

	this.api.getCardToken('card-123', function(err, card_token, result) {
		start();
		equal(card_token, 'card-123');
		equal(JSON.stringify(result), JSON.stringify(response));
	});

	stop();

});

test('delete card token', function() {
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/delete_card_token', {
		"version": "w3",
		"api_key": "asd-213",
		"card_token": "card-123",
		"authcode": "8F5C2A8768901DFC1621C7FD3D7E01A35F6117557F8AB181BD7D0DBC5B32CD8C"
	}).reply(200, response);

	this.api.deleteCardToken('card-123', function(err, card_token, result) {
		start();
		equal(card_token, 'card-123');
		equal(JSON.stringify(result), JSON.stringify(response));
	});

	stop();

});	


test('doRequest returns malformed response', function() {
	var response = {

	}

	nock('https://paybyway.test').post('/pbwapi/delete_card_token').reply(200, response);

	this.api.doRequest({}, {
		host: 'paybyway.test',
		path: '/pbwapi/delete_card_token',
		port: 443,
		method: 'POST',
		https: true
	}, function(err, params, result) {
		start();
		equal(err.message, 'Malformed response from Paybyway API');
	}, {});


	stop();
});

test('set api version', function() {
	equal(this.api.apiVersion, 'w3');
	this.api.setApiVersion('wm1');
	equal(this.api.apiVersion, 'wm1');
});

test('check return returns valid data', function() {

	var paramsOkSettled = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 1,
		AUTHCODE: '5FF25F1E945C0535327AA4B8150FAC9B4AB058ADFE4733AB353EA07D3EFDA791'
	};

	this.api.checkReturn(paramsOkSettled, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsOkSettled));
	});

	var paramsOk = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 0,
		AUTHCODE: '75B7798715EFCD0B80B5DDCA8068BB2871F519EB4A7E65DD8F847CED0353D2B8'
	};

	this.api.checkReturn(paramsOk, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsOk));
	});


	var paramsOkSettledContactID = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		CONTACT_ID: 123,
		SETTLED: 1,
		AUTHCODE: '56F6CD01E3F7861D814CFB90D88F8FB8C8A51C131BC330E0CD4080B3EB198073'
	};

	this.api.checkReturn(paramsOkSettledContactID, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsOkSettledContactID));
	});

	var paramsOkContactID = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		CONTACT_ID: 123,
		SETTLED: 0,
		AUTHCODE: 'A983119EA78EAC739BDB4F5221D1864152432247598BD62DD159A3FC7FA6F6EB'
	};

	this.api.checkReturn(paramsOkContactID, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsOkContactID));
	});

	var paramsFailed = {
		RETURN_CODE: 1,
		ORDER_NUMBER: '123',
		AUTHCODE: '017FBFAD84D38BBBE23AE5CE4E780B51806F3BAFDE666BE438508A138BF6A893'
	};

	this.api.checkReturn(paramsFailed, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsFailed));
	});

	var paramsFailedIncident = {
		RETURN_CODE: 1,
		ORDER_NUMBER: '123',
		AUTHCODE: 'B23D41A26CCB2BA706E1CE5D354A25BDE1FE69D8EBADAF6FA2D689E62938DE8A',
		INCIDENT_ID: 'incident'
	};

	this.api.checkReturn(paramsFailedIncident, function(error, result) {
		equal(error, null);
		equal(JSON.stringify(result), JSON.stringify(paramsFailedIncident));
	});

	var paramsInvalidMacCode = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 1,
		AUTHCODE: '5FF25F1E945C0535327AA4B8150FAC9B4AB058ADFE4733AB353EA07D3EFDA792'
	}

	this.api.checkReturn(paramsInvalidMacCode, function(error, result) {
		equal(error.type, 5);
		equal(JSON.stringify(result), JSON.stringify(paramsInvalidMacCode));
	});

});
