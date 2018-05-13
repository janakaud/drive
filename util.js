var busy = document.getElementById("busy");

var PATH = "drive";
var store = {};
var handler = {};
["ClientId", "ClientSecret", "User", "Token", "Expiry", "AuthCode"].forEach(function(key) {
	handler[key] = {
		get: function() {
			return localStorage[PATH + key];
		},
		set: function(value) {
			localStorage[PATH + key] = value;
		}
	};
});
Object.defineProperties(store, handler);

function expired() {
	return !store.Expiry || (new Date().getTime() - store.Expiry >= 0);
}

function authorize(callback) {
	if(!expired() && store.User == user.value)
		return callback();
	this.callback = callback;
	store.User = user.value;
	window.open("oauth.html");
}

function callWithAuth(callback) {
	if(expired())
		authorize(callback);
	else
		callback();
}

function ajax(method, url, data, success, async, type, raw) {
	callWithAuth(function() {
		xhr(method, url, data, success, async, type, raw);
	});
}
	
function xhr(method, url, data, success, async, type, raw) {
	//alert(method + " " + url + " " + JSON.stringify(data));
	if (busy) busy.style.display = "inline";
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, async == true);
	xhr.setRequestHeader("Authorization", "Bearer " + store.Token);
	xhr.onload = function() {
		if (this.status < 200 || this.status > 299) {
			return this.onerror(JSON.parse(this.responseText));
		}
		success(this.responseText.length == 0 ? null : raw ? this : JSON.parse(this.responseText));
		if (busy) busy.style.display = "none";
	};
	xhr.onerror = function(msg) {
		alert(JSON.stringify(msg, undefined, 2));
		if (busy) busy.style.display = "none";
	};
	if (data) {
		xhr.setRequestHeader("Content-Type", type || "application/json");
		xhr.send(type ? data : JSON.stringify(data));
	} else {
		xhr.send(null);
	}
}

window.onerror = function(e) {
	alert(JSON.stringify(e, null, 2));
}