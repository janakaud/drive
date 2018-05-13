var TOKEN_URL = "https://www.googleapis.com/oauth2/v4/token";
var REDIRECT = "&redirect_uri=http://127.0.0.1/drive/oauth.html";

var pos;

if (!store.ClientId) {
	store.ClientId = prompt("Enter GApp client ID");
	store.ClientSecret = prompt("Enter GApp client secret");
}

function finish(token, life) {
	store.Token = token;
	store.Expiry = new Date().getTime() + parseInt(life) * 1000;
	window.opener.callback();
	close();
}

if ((pos = location.hash.indexOf("access_token=")) != -1) {		// token flow (not used currently)
	var hash = location.hash;
	hash = hash.substring(pos + 13);
	finish(hash.substring(0, hash.indexOf("&")), hash.substring(hash.indexOf("expires_in=") + 11));

} else if ((pos = location.search.indexOf("code=")) != -1) {	// code received; get token
	var search = location.search;
	search = search.substring(pos + 5);
	var end = search.indexOf("&");
	var code = search.substring(0, end >= 0 ? end : search.length);
	xhr("POST", TOKEN_URL, "code=" + code + "&client_id=" + store.ClientId + "&client_secret=" + store.ClientSecret +
		"&grant_type=authorization_code" + REDIRECT, function(resp) {
		store.RefreshToken = resp.refresh_token;
		finish(resp.access_token, resp.expires_in);
	}, false, "application/x-www-form-urlencoded");

} else if (location.search == "" && location.hash == "") {
	if (store.RefreshToken) {	// refresh access using saved refresh token
		xhr("POST", TOKEN_URL, "refresh_token=" + store.RefreshToken + "&client_id=" +
			store.ClientId + "&client_secret=" + store.ClientSecret + "&grant_type=refresh_token", function(resp) {
			finish(resp.access_token, resp.expires_in);
		}, false, "application/x-www-form-urlencoded");
	} else {	// init auth
		location.href = "https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/drive&client_id=" +
		store.ClientId + REDIRECT + "&response_type=code&access_type=offline&authuser=" + (store.User || 0),
		"OAuthor", "width=500,height=500";
	}

} else {
	alert("Authorization failed");
	close();
}