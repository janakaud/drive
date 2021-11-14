var APP = "script";
var SCOPE = "https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments";

var V1 = "https://script.googleapis.com/v1";
var BASE = `${V1}/projects`;
var url = BASE + "?fields=scriptId";

function create() {
	_alert("POST", url, {
		title: title.value,
		parentId: parent.value
	});
}

function _id() {
	return id.value.match(/[^/?]{20,}/);
}

function load() {
	ajax("GET", BASE + "/" + _id() + "/content", null, function(data) {
		code.value = JSON.stringify(data);
	});
}

function save() {
	var data = JSON.parse(code.value);
	_alert("PUT", `${BASE}/${_id()}/content?fields=scriptId`, {files: data.files.map(f => {
		var {name, type, source, functionSet} = f;
		return {name, type, source, functionSet};
	})});
}

function search() {
	_get(`${url}&title=${title.value || ""}`);
}

function listDeployments() {
	_get(`${BASE}/${_id()}/deployments`);
}

function listProcesses() {
	_get(`${V1}/processes:listScriptProcesses?scriptId=${_id()}`);
}

function _get(_url) {
	_alert("GET", _url, null);
}

function _alert(method, _url, _data) {
	ajax(method, _url, _data, function(data) {
		alert(JSON.stringify(data));
	});
}