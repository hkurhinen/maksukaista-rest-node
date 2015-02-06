// refactor: normalize response handlers

Paybyway.prototype.request = new XMLHttpRequest();
Paybyway.prototype.charge_request = new XMLHttpRequest();
Paybyway.prototype.complete_request = new XMLHttpRequest();
Paybyway.prototype.tokenUrl = "?action=get_token";
Paybyway.prototype.completeUrl = "?action=check";
Paybyway.prototype.brokerUriPrefix = 'https://www.paybyway.com/';

function Paybyway(r, webUri, brokerUri) 
{
	if(r)
		this.request = r;
	if(webUri)
		this.webUriPrefix = webUri;
	if(brokerUri)
		this.brokerUriPrefix = brokerUri;
}

Paybyway.instance = function() 
{
	if(!window.paybyway)
		window.paybyway = new Paybyway();
	
	return window.paybyway;
}

Paybyway.prototype.setTokenUrl = function(address) 
{
	this.tokenUrl = address;
}

Paybyway.prototype.setCheckUrl = function(address) 
{
	this.completeUrl = address;
}

Paybyway.prototype.getToken = function(amount, currency) 
{
	var amount = amount || "";
	var currency = currency || "";
	
	var uri = this.tokenUrl;
	var params = [];
	params.push("amount="+amount,"&currency="+currency);
	var data = params.join("");
	
	return this.tokenRequest(uri, data);
}

Paybyway.prototype.tokenRequest = function(uri, data)
{
	var r = this.request;
	if(r) {
		if(r.readyState !== 0 && r.readyState !== 4 )
			return false;

		r.open("POST", uri, true);
		r.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
		r.onreadystatechange = function() 
		{
			window.paybyway.handleTokenRequest();
		}
		r.send(data);
	}
	else 
		this.tokenReady("token");
	
	return true
}

Paybyway.prototype.handleTokenRequest = function() 
{
	var r = this.request;
	if(r) {
		if(r.readyState === 4)
		{
			if(r.status === 200)
				this.tokenReady(r.responseText);
			else if(r.status === 500)
				this.paymentFail(r.responseText)
			else
				this.tokenReady("");
		}
	}
}

Paybyway.prototype.tokenReady = function(token) 
{
	console.log("tokenReady = " + token);
}

Paybyway.prototype.charge = function(token, amount, currency, card, exp_month, exp_year, security_code) {
	if(!token || !amount || !currency || !card || !exp_month || !exp_year || !security_code || arguments.length !== 7)
		throw "invalid parameters";

	this.complete(token);

	var uri = this.brokerUriPrefix + "pbwapi/charge";
	var pbwClientVersionInfo = "0.0.0";
	var params = [];
	params.push(
		"token="+token,
		"&amount="+amount,
		"&currency="+currency,
		"&card="+card,
		"&exp_month="+exp_month,
		"&exp_year="+exp_year,
		"&security_code="+security_code,
		"&version="+encodeURIComponent(pbwClientVersionInfo));
	var data = params.join("");

	return this.paymentRequest(token, uri, data);
}

Paybyway.prototype.paymentRequest = function(token, uri, data) 
{
	var r = this.charge_request;
	if(r) 
	{
		try 
		{
			if(r.readyState !== 0 && r.readyState !== 4 )
				return false;
			r.open("POST", uri, true);
			r.setRequestHeader('content-type', 'application/x-www-form-urlencoded')
			r.send(data);
		}
		catch(e) 
		{
			if(XDomainRequest) 
			{
				r = new XDomainRequest();
				r.onprogress = r.ontimeout = r.onerror = r.onload = function () {};
				r.open("POST", uri, true);
				setTimeout(function(){
		        	r.send(data);
		   		}, 0);
			}
		}	
	}
	
	return true;
}

Paybyway.prototype.paymentOk = function() 
{
	console.log("paymentOk called");
}

Paybyway.prototype.paymentFail = function(token) 
{
	console.log("paymentFail called");
}

Paybyway.prototype.complete = function(token) 
{
	if(!token || arguments.length !== 1)
		throw "invalid parameters";
	
	var uri = this.completeUrl;
	var params = [];
	params.push("token="+token);
	var data = params.join("");

	return this.completeRequest(token, uri, data);
}

Paybyway.prototype.completeRequest = function(token, uri, data) 
{
	var r = this.complete_request;
	if(r) {
		if(r.readyState !== 0 && r.readyState !== 4 )
			return false

		r.onreadystatechange = function() {
			window.paybyway.handleCompleteRequest(token)
		}
		r.open("POST", uri, true);
		r.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
		r.send(data);
	}
	else
		this.handleCompleteRequest(token);

	return true;
}

Paybyway.prototype.handleCompleteRequest = function(token) 
{
	var r = this.complete_request;
	if(r) 
	{
		if(r.readyState===4) 
		{
			if(r.status === 200) 
			{
				var result = r.response;
				if(result && result.length > 0 && result == 000)
					this.paymentOk();
				else
					this.paymentFail();
			}
			else
				this.paymentFail();
		}
	}
	else
		this.paymentFail();
}

Paybyway.prototype.validateCardNumber = function(number) 
{
	var luhnArr = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];
	var counter = 0;
	var incNum;
	var odd = false;
	
	var temp = new String(number).replace(/[^\d]/g, "");		
	if (temp.length === 0)
		return false;
	
	for (var i = temp.length-1; i >= 0; --i) 
	{
		incNum = parseInt(temp.charAt(i), 10);
		counter += (odd = !odd)? incNum : luhnArr[incNum];
	}

	return (counter%10 === 0);
}

Paybyway.prototype.validateCVV = function (code) 
{
	if(typeof code === 'string' && code.length > 2 && code.length < 5)
		return true;

	return false;
}

Paybyway.prototype.convertToCents = function(number) 
{
	number = number.replace(",",".");
	var result = Math.round(100*number - 0.5);

	if(0>result)
		result = 0;

	return result;
}
