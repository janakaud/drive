var SCOPE = "https://www.googleapis.com/auth/drive"
var PATH = "drive";

var host = "https://www.googleapis.com";
var apiPath = "/drive/v3/files";
var base = host + apiPath;
var uploadUrl = host + "/upload" + apiPath + "?fields=id";
var listUrl = base + "?fields=files(id,name,mimeType,size)";
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
	spreadsheet: ["docs", "spreadsheets", "/htmlview", [
		["MS Excel", _.XLSX],
		["Open Office sheet", _.ODS],
		["PDF", _.PDF],
		["CSV (first sheet only)", _.CSV],
		["TSV (first sheet only)", _.TSV],
		["HTML (zipped)", _.ZIP]
	]],
	presentation: ["docs", "presentation", "/htmlpresent", [
		["MS PowerPoint", _.PPTX],
		["Open Office presentation", _.ODP],
		["PDF", _.PDF],
		["Plain text", _.TXT]
	]],
	document: ["docs", "document", "/mobilebasic", [
		["HTML", _.HTML],
		["HTML (zipped)", _.ZIP],
		["Plain text", _.TXT],
		["Rich text", _.RTF],
		["Open Office doc", _.ODT],
		["PDF", _.PDF],
		["MS Word document", _.DOCX],
		["EPUB", _.EPUB]
	]],
	folder: ["drive", "drive/folders", "", [
		["Zip", _.ZIP]
	]],
	script: ["script", "macros", "/edit", [
		["JSON", _.JSON]
	]],
	drawing: ["drawing", "drive", "/view", [
		["JPEG", _.JPEG],
		["PNG", _.PNG],
		["SVG", _.SVG],
		["PDF", _.PDF]
	]]
};
var SITE = 0, TYPE = 1, VIEW = 2, EXPORTS = 3;

var dirPath = [];

function listAll() {
	list(listUrl);
}

function search(query) {
	var q = query || input.value;
	if (!q.match(/\s(contains|=|<|>|in|and|or|not|has)\s/)) {
		q = "name contains '" + q + "'";
	}
	if (!query) {
		dirPath = [];
	}
	list(listUrl + "&q=" + q);
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
		parents: folder.value ? [folder.value] : undefined,
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
	ajax("GET", base + "/" + id + "?fields=trashed,modifiedTime,permissions(emailAddress,role),size", null, function(xhr) {
		alert(xhr.responseText);
	}, true, null, true);
}

function share(id) {
	var role = prompt("Role (reader writer commenter owner organizer)", "writer");
	if (!id || !role) {
		return;
	}

	var spec = {role: role};
	var target;
	if (target = prompt("Email")) {
		spec.type = "user";
		spec.emailAddress = target;
	} else if (target = prompt("Domain")) {
		spec.type = "domain";
		spec.domain = target;
	} else if (confirm("Make " + role + " role public?")) {
		spec.type = "anyone";
	}

	permit(id, spec, ["owner", "organizer", "writer"].indexOf(role) > -1 && confirm("Transfer ownership?") ?
		"?transferOwnership=true" : "");
}

function makePublic(id) {
	permit(id, {
		role: "reader",
		type: "anyone"
	});
}

function permit(id, spec, queryParams = "") {
	if (!id) return;
	ajax("POST", base + "/" + id + "/permissions" + queryParams, spec, function(xhr) {
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
	}, true, null, true, true);
}

function download(id) {
	if (!id) return;
	format = prompt("Format", "pdf");
	if (!format) return;
	window.open("https://docs.google.com/document/export?format=" + format + "&id=" + id);
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
			"Content-Type: " + (file.type || "text/plain") + "; charset=UTF-8",
			"", content, "--" + boundary + "--"].join("\r\n");
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
	return "<select><option>" + text + "</option>" + (opts || []).map(function(opt) {
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
			viewLink(f, meta),
			meta[TYPE] || f.id,
			driveLink(f, meta),
			btn("del", [f.id], "delete"),
			sel(meta[EXPORTS], "xport", [f.id, f.name], 3, "export"),
			btn("altMedia", [f.id, f.name], "alt-media"),
			btn("download", [f.id], "download"),
			btn("share", [f.id], "share"),
			btn("makePublic", [f.id], "public"),
			btn("details", [f.id], "details"),
			f.size,
		];
		trs.push("<td>" + tds.join("</td><td>") + "</td>");
	}
	files.innerHTML = "<tr>" + trs.join("</tr><tr>") + "</tr>";
	breadcrumb.innerHTML = dirPath.map(function(id) {
		return folderLink(id, id);
	}).join(" / ");
}

function ls(id) {
	dirPath.push(id);
	search("'" + id + "' in parents");
}

function isFolder(meta) {
	return meta[TYPE] == typeMap.folder[TYPE];
}

function viewLink(f, meta) {
	if (isFolder(meta)) {
		return folderLink(f.id, f.name);
	}
	return defaultLink(f, meta);
}

function folderLink(id, name) {
	return "<a onclick='ls(\"" + id + "\"); return false;' href=''>" + name + "</a>";
}

function defaultLink(f, meta) {
	return link("https://" + meta[SITE] + ".google.com/" + meta[TYPE] + "/d/" + f.id + meta[VIEW], f.name);
}

function driveLink(f, meta) {
	if (isFolder(meta)) {
		return defaultLink(f, meta);
	}
	return link("https://" + meta[SITE] + ".google.com/" + meta[TYPE] + "/d/" + f.id + "/edit", "edit");
}