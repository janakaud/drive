var busy = document.getElementById("busy");
var decoder = new TextDecoder();

var store = {};
var handler = {};
["ClientId", "ClientSecret", "User", "Scope",
"Token", "Expiry", "AuthCode"].forEach(function(key) {
	handler[key] = {
		get: function() {
			return localStorage[`${APP}_${key}`];
		},
		set: function(value) {
			localStorage[`${APP}_${key}`] = value;
		}
	};
});
handler.RefreshToken = {
	get: function() {
		return localStorage[`${APP}_RefreshToken_${store.User}`];
	},
	set: function(value) {
		localStorage[`${APP}_RefreshToken_${store.User}`] = value;
	}
};
Object.defineProperties(store, handler);

function expired() {
	return !store.Expiry || (Date.now() - store.Expiry >= 0) || store.User != user.value;
}

function reauth() {
	store.Expiry = 0;
	store.RefreshToken = "";
	authorize(function() {alert("authorized")});
}

function authorize(callback) {
	if (!expired()) {
		return callback();
	}
	this.callback = callback;
	store.Scope = SCOPE;
	store.User = user.value;
	window.open("oauth.html#state=" + APP);
}

function callWithAuth(callback) {
	if(expired()) {
		authorize(callback);
	} else {
		callback();
	}
}

function ajax(method, url, data, success, async, type, raw, binary) {
	callWithAuth(function() {
		xhr(method, url, data, success, async, type, raw, binary);
	});
}
	
function xhr(method, url, data, success, async = true, type, raw, binary) {
	if (busy) {
		busy.style.display = "inline";
	}

	var xhr = new XMLHttpRequest();
	xhr.open(method, url, async == true);
	if (binary) {
		xhr.responseType = "arraybuffer";
	}

	xhr.setRequestHeader("Authorization", "Bearer " + store.Token);
	xhr.onload = function() {
		if (this.status < 200 || this.status > 299) {
			return this.onerror(JSON.parse(binary ? decoder.decode(this.response) : this.responseText));
		}
		success(raw ? this :
			this.responseText.length == 0 ? null : JSON.parse(this.responseText));
		if (busy) busy.style.display = "none";
	};
	xhr.onerror = xhrErr;

	try {
		if (data) {
			if (type !== null) {	// ignore if null added specifically
				xhr.setRequestHeader("Content-Type", type || "application/json");
				xhr.send(type ? data : JSON.stringify(data));
			} else {
				xhr.send(data);
			}
		} else {
			xhr.send(null);
		}
	} catch (e) {
		xhrErr(e);
	}
}

function xhrErr(err) {
	alert(JSON.stringify(err, undefined, 2));
	if (busy) {
		busy.style.display = "none";
	}
}

window.onerror = function(e) {
	alert(JSON.stringify(e, null, 2));
}