/* VERSION 5.0.0 */

// https://codepad.co/snippet/document-ready-with-promise
(function() {
  'use strict';
  document.onreadystatechange = function () {
    if ( document.readyState === "interactive" ) {
    }
  }
}());

//With Promise
HTMLDocument.prototype.ready = function () {
	return new Promise(function(resolve, reject) {
		if (document.readyState === 'complete') {
			resolve(document);
		} else {
			document.addEventListener('DOMContentLoaded', function() {
				resolve(document);
			});
		}
	});
}
/************************/
function jdDocumentation(theme = null) {
	var cache = {};
	var rootPath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
	/******************/
	function load(url, method = "get") {
		return new Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.onload = function () {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(xhr.response);
				} else {
					reject({
						status: xhr.status,
						statusText: xhr.statusText
					});
				}
			};
			xhr.onerror = function () {
				reject({
					status: xhr.status,
					statusText: xhr.statusText
				});
			};
			xhr.send();
		});
	}
	function getTemplate(container, selector) {
		var template = container.querySelector(selector);
		if (template === null) {
			return null;
		}
		return template.content.cloneNode(true);
	}
	function stringToHtml(content) {
		var wrapper = document.createElement("div");
		wrapper.innerHTML = content;
		return wrapper;
	}
	function getTemplateAsContainer(container, selector) {
		var wrapper = document.createElement("div");
		var template = getTemplate(container, selector);
		if (template === null) {
			return null;
		}
		wrapper.append(...template.children);
		return wrapper;
	}
	function catchError(err) {
		// TODO
		console.error('Augh, there was an error!', err);
		return null;
	}
	/****** URL *******/
	function getFromUrl(urlParams, key, availables) {
		var param = urlParams.get(key);
		return param === null || !availables.hasOwnProperty(param) ? Object.keys(availables)[0] : param;
	}
	/******** PARSE ******/
	function parseFileVersion(content, selectedVersion) {
		var wrapper = stringToHtml(content);
		wrapper.querySelectorAll(".diff").forEach(function(element) {
			var from = element.getAttribute("from");
			var to = element.getAttribute("to");
			if (selectedVersion < from) {
				element.remove();
				return;
			}
			if (selectedVersion > to) {
				element.remove();
				return;
			}
		});
		return wrapper;
	}
	function parseMenu(menuObject, level = 0) {
		menuObject.childNodes.forEach(function(node) {
			switch(node.tagName) {
				case "SPAN": console.log("title:" + node.innerText);break;
				case "A": console.log("link:" + node.innerText);break;
				case "DIV": console.log("submenu");parseMenu(node, level + 1); break;
				case undefined:
				default: break;
			}
		});
	}
	/******* PRINTING ********/
	function printStatic(config) {
		var printSelect = function(name, data) {
			var container = document.getElementById('js-doc__' + name + '-select');
			for(const[key, title] of Object.entries(data)) {
				container.insertAdjacentHTML(
					"beforeend",
					getTemplateAsContainer(document, '#js-doc__' + name + '-item').innerHTML
					.replace('{' + name + 'Id}', key)
					.replace('{' + name + 'Title}', title)
				);
			}
		}
		printSelect("version", config.versions);
		printSelect("language", config.langs);
		return config;
	}
	/******************/
	function setBody(config) {
		load(rootPath + "/" + config.selectedLang + "/index.html")
		.then(function(menuObject) {
			return parseFileVersion(menuObject, config.selectedVersion);
		})
		.then(function(menuObject) {
			parseMenu(menuObject);
			/*menuObject.querySelectorAll("div").forEach(function(element) {
				console.log(element.tagName, element.nodeType);
			});*/
			// return file - selected (pokud je dostupny v jayzce), jinak prvni
			// nebo by se daly nacist vsechny soubory a obsah nekam uklidit - hledani? - problem s verzi
		})
		.catch(catchError);
	}
	/******************/
	load(rootPath + "/config.json")
	.then(function (response) {
		var config = JSON.parse(response);
		var params = new URLSearchParams(window.location.search);
		config.selectedLang = getFromUrl(params, "lang", config.langs);
		config.selectedVersion = getFromUrl(params, "version", config.versions);
		config.selectedFile = params.get("file");
		return config;
	})
	.then(function(config) {
		// TODO meta data
		if (theme === null) {
			return document.ready().then(function(doc) {
				return config;
			});
		}
		// TODO correct path
		return load("themes/" + theme).then(function(themeContent) {
			var themeHtml = stringToHtml(themeContent);
			var setLink = function(element, attribute, run = false) {
				var value = element.getAttribute(attribute);
				if (value !== null) {
					if (!value.startsWith("http")) {
						element.setAttribute(attribute, "themes/" + value); // TODO correct path
					}
					return true;
				} else if (run) {
					eval(element.innerHTML);
				}
				return false;
			}
			var addELements = function(id) {
				getTemplate(themeHtml, "#" + id).querySelectorAll("*").forEach(function(element){
					switch (element.tagName) {
						case "SCRIPT":
							if (setLink(element, "src", true)) {
								var script= document.createElement('script');
							    script.src= element.getAttribute("src");
							    document[id].appendChild(script);
							};
							break;
						case "LINK":
							setLink(element, "href");
							break;
					}
					document[id].appendChild(element);
				});
			};
			addELements("head");
			addELements("body");
			return config;
		});
	})
	.then(printStatic)
	.then(setBody)
	.catch(catchError);
}