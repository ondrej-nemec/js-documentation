console.log("JS script loaded");
try {
	document.getElementById("file-script").style['background-color'] = "green";
} catch (e) {
	console.error("file", e);
}