var host = "https://www.googleapis.com";
var apiPath = "/drive/v3/files";
var base = host + apiPath;
var uploadUrl = host + "/upload" + apiPath + "?fields=id";
var listUrl = base + "?fields=files(id,name,mimeType)";
var createUrl = base + "?fields=id";

var _ = {
	XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ODS: "application/x-vnd.oasis.opendocument.spreadsheet",
	PDF: "application/pdf",
	CSV: "text/csv",
	TSV: "text/tab-separated-values",
	ZIP: "application/zip",
	PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	ODP: "application/vnd.oasis.opendocument.presentation",
	TXT: "text/plain",
	HTML: "text/html",
	RTF: "application/rtf",
	ODT: "application/vnd.oasis.opendocument.text",
	DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	EPUB: "application/epub+zip",
	JSON: "application/vnd.google-apps.script+json",
	JPEG: "image/jpeg",
	PNG: "image/png",
	SVG: "image/svg+xml"
};
var extMap = {};
Object.entries(_).forEach(function(e) {
	extMap[e[1]] = "." + e[0].toLowerCase();
});

var typeMap = {
	spreadsheet: ["docs", "spreadsheets", "htmlview", [
		["MS Excel", _.XLSX],
		["Open Office sheet", _.ODS],
		["PDF", _.PDF],
		["CSV (first sheet only)", _.CSV],
		["TSV (first sheet only)", _.TSV],
		["HTML (zipped)", _.ZIP]
	]],
	presentation: ["docs", "presentation", "htmlpresent", [
		["MS PowerPoint", _.PPTX],
		["Open Office presentation", _.ODP],
		["PDF", _.PDF],
		["Plain text", _.TXT]
	]],
	document: ["docs", "document", "mobilebasic", [
		["HTML", _.HTML],
		["HTML (zipped)", _.ZIP],
		["Plain text", _.TXT],
		["Rich text", _.RTF],
		["Open Office doc", _.ODT],
		["PDF", _.PDF],
		["MS Word document", _.DOCX],
		["EPUB", _.EPUB]
	]],
	folder: ["drive", "folders", "view", [
		["Zip", _.ZIP]
	]],
	script: ["script", "macros", "edit", [
		["JSON", _.JSON]
	]],
	drawing: ["drawing", "drive", "view", [
		["JPEG", _.JPEG],
		["PNG", _.PNG],
		["SVG", _.SVG],
		["PDF", _.PDF]
	]]
};
var SITE = 0, TYPE = 1, VIEW = 2, EXPORTS = 3;

function listAll() {
	list(listUrl);
}

function search() {
	var q = input.value;
	if (!q.match(/\s(contains|=|<|>|in|and|or|not|has)\s/)) {
		q = "fullText contains '" + q + "' or name contains '" + q + "'";
	}
	list(listUrl + "&q=" + q);
	return false;
}

function list(url) {
	ajax("GET", url + "&pageSize=" + limit.value, null, function(data) {
		display(data.files);
	});
}

function create(type) {
	var name = prompt("Enter filename");
	if (!name) return;
	var mimeType = "application/vnd.google-apps." + type;
	ajax("POST", createUrl, {
		mimeType: mimeType, 
		name: name
	}, function(data) {
		display([{
			id: data.id,
			name: name,
			mimeType: mimeType
		}]);
	});
}

function del(id) {
	if (!id) return;
	if (confirm("Are you sure you want to delete " + id + "?")) {
		ajax("DELETE", base + "/" + id, null, function(data) {
			alert("File " + id + " deleted");
		}, true);
	}
}

function details(id) {
	if (!id) return;
	ajax("GET", base + "/" + id, null, function(xhr) {
		alert(xhr.responseText);
	}, true, null, true);
}

function makePublic(id) {
	if (!id) return;
	ajax("POST", base + "/" + id + "/permissions", {
		role: "reader",
		type: "anyone",
		value: ""
	}, function(xhr) {
		alert(xhr.responseText);
	}, true, null, true);
}

function altMedia(id, name) {
	if (!id) return;
	getFile(base + "/" + id + "?alt=media", name);
}

function xport(id, name, mimeType) {
	if (!id) return;
	getFile(base + "/" + id + "/export?mimeType=" + encodeURIComponent(mimeType), suffixExt(name, mimeType));
}

function getFile(url, name) {
	ajax("GET", url, null, function(xhr) {
		a = document.createElement("a");
		document.body.appendChild(a);
		url = window.URL.createObjectURL(new Blob([xhr.response], {type: header(xhr, "Content-Type")}));
		a.href = url;
		a.target = "_newtab";
		a.download = name;
		a.click();
	}, true, null, true);
}

function download(id) {
	if (!id) return;
	window.open("https://drive.google.com/" + id + "/uc?export=download");
}

function uploadSimple() {
	upload("media", function(file, content) {
		return content;
	}, "*/*");
}

function uploadMultipart() {
	boundary = "Z";
	upload("multipart", function(file, content) {
		meta = '{"name":"' + file.name + '"';
		if (!isEmpty(folder.value)) {
			meta += ',"parents":["' + folder.value + '"]';
		}
		meta += '}';
		return ["--" + boundary, "Content-Type: application/json", "", meta, "", "--" + boundary,
			"Content-Type: " + file.type, "", content, "--" + boundary + "--"].join("\r\n");
	}, "multipart/related; boundary=" + boundary);
}

function upload(type, transform, contentType) {
	file = picker.files[0];
	if (!file) {
		alert("Please select a file for uploading");
		return;
	}
	var reader = new FileReader();
	reader.onload = function (e) {
		ajax("POST", uploadUrl + "&uploadType=" + type, transform(file, e.target.result), function(data) {
			display([{
				id: data.id,
				name: file.name,
				mimeType: file.type
			}]);
		}, false, contentType);
	};
	reader.readAsBinaryString(file);
}

function header(xhr, key) {
	return xhr.getResponseHeader(key) || xhr.getResponseHeader(key.toLowerCase());
}

function link(url, text) {
	return "<a target='_blank' href='" + url + "'>" + text + "</a>";
}

function btn(func, params, text) {
	return "<button onclick='" + func + '("' + params.join('","') + "\")'>" + text + "</button>";
}

function sel(opts, func, params, optParamPos, text) {
	var head = params.splice(0, optParamPos - 1);
	return "<select><option>" + text + "</option>" + opts.map(function(opt) {
		return "<option onclick='" + func + '("' + head.concat(opt[1]).concat(params).join('","') + "\")'>" + opt[0] + "</option>";
	}).join("") + "</select>";
}

function suffixExt(name, mimeType) {
	var ext = extMap[mimeType];
	return name.toLowerCase().endsWith(ext) ? name : (name + ext);
}

function isEmpty(str) {
	return !str || str.length == 0;
}

function display(list) {
	trs = [];
	for(var i in list) {
		f = list[i];
		meta = typeMap[f.mimeType.substring(f.mimeType.lastIndexOf(".") + 1)] || [];
		tds = [
			link("https://" + meta[SITE] + ".google.com/" + meta[TYPE] + "/d/" + f.id + "/" + meta[VIEW], f.name), 
			meta[TYPE] || f.id,
			link("https://" + meta[SITE] + ".google.com/" + meta[TYPE] + "/d/" + f.id + "/edit", "edit"),
			btn("del", [f.id], "delete"),
			sel(meta[EXPORTS], "xport", [f.id, f.name], 3, "export"),
			btn("altMedia", [f.id, f.name], "alt-media"),
			btn("download", [f.id], "download"),
			btn("makePublic", [f.id], "public"),
			btn("details", [f.id], "details"),
		];
		trs.push("<td>" + tds.join("</td><td>") + "</td>");
	}
	files.innerHTML = "<tr>" + trs.join("</tr><tr>") + "</tr>";
}
