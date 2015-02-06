var nock = require('nock');
var apiUrl = 'https://www.paybyway.com';

QUnit.module('without credentials', {
	setup: function() {
		this.api = require('../lib/PaybywayServer.js').create();
	}
});

test('create charge returns error if merchant id or private key not set', function() {
	this.api.createCharge({}, function(err, charge, token){
		equal(err.message, 'Private key or merchant id not set');
	});
});

test('check status returns error if merchant id or private key not set', function() {
	this.api.statusCheck('token', function(err, token, result){
		equal(err.message, 'Private key or merchant id not set');
		equal(token, 'token');
	});
});

QUnit.module('with credentials', {
	setup: function() {
		this.api = require('../lib/PaybywayServer.js').create();
		this.api.setPrivateKey('private_key');
		this.api.setMerchantId(1);
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
		amount: 123
	}, function(err, charge, token){
		start();
		ok(err, 'err should be defined');
		equal(charge.order_number, 'order2');
	});

	stop();
});

test('create charge fails if invalid json returned', function () {
	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, 'äää');

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
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
		amount: 123
	}, function(err, charge, token){
		start();
		ok(err, 'err should be defined');
	});

	stop();
});

test('create charge returns token', function () {

	var response = {
		result: 0,
		token: '123'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		amount: 123
	}, function(err, charge, token){
		start();
		equal(token, '123');
	});

	stop();
});


test('create charge returns token when customer and products set', function () {

	var response = {
		result: 0,
		token: '123'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
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
	}, function(err, charge, token){
		start();
		equal(token, '123');
		ok(charge.customer);
		ok(charge.products);
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

test('check status returns error if no reponse', function () {
	var response = {
	}

	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, response);

	this.api.statusCheck('token', function(err, token, result) {
		start();
		ok(err, 'err should be defined');
		equal(token, 'token');
	});

	stop();
});

test('check status returns result if successful', function () {
	var response = {
		result: '000'
	}

	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, response);

	this.api.statusCheck('t', function(err, token, result) {
		start();
		equal(result, '000');
		equal(token, 't');
	});

	stop();
});
