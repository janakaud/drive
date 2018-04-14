var busy = document.getElementById("busy");

if (!localStorage.id || !localStorage.secret) {
	localStorage.id = prompt("Enter GApp client ID", localStorage.id);
	localStorage.secret = prompt("Enter GApp client secret", localStorage.secret);
}

function expired() {
	return !localStorage.expiry || (new Date().getTime() - localStorage.expiry >= 0);
}

function authorize(callback) {
	if(!expired() && window.authuser == user.value)
		return callback();
	this.callback = callback;
	window.authuser = user.value;
	window.open("https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/drive&client_id=" + localStorage.id + "&redirect_uri=http://127.0.0.1/drive/oauth.html&response_type=code&access_type=offline&authuser=" + (user.value || 0), "OAuthor", "width=500,height=500");
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
	xhr.setRequestHeader("Authorization", "Bearer " + localStorage.token);
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