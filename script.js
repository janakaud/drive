var SCOPE = "https://www.googleapis.com/auth/script.projects";
var PATH = "script";

var url = "https://script.googleapis.com/v1/projects?fields=scriptId";

function create() {
	ajax("POST", url, {
		title: title.value,
		parentId: parent.value
	}, function(data) {
		alert(JSON.stringify(data));
	});
}

function search() {
	ajax("GET", url + "&title=" + (title.value || ""), null, function(data) {
		alert(JSON.stringify(data));
	});
}