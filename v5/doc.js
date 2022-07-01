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
/*********************/
// https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
const themeContentAddedEvent = new Event("themeContentAdded");
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
		// TODO zkontrolovat - ne vzdy jde
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
	function parseMenu(config, menuObject, container = null, level = 0) {
	//	console.log(document.querySelector('#js-doc__menu-item-' + level));
	//	console.log(document.querySelector('#js-doc__menu-container-' + level));

		if (document.querySelector('.js-doc__menu-item-' + level) === null) {
			console.warn("No templates for menu item. Level: " + level);
			return [];
		}
		if (document.querySelector('.js-doc__menu-container-' + level) === null) {
			console.warn("No templates for menu container. Level: " + level);
			return [];
		}
		if (container === null) {
			container = document.querySelector('#js-doc__menu');
		}
		if (container === null) {
			console.warn("No menu placeholder");
			return [];
		}
		var files = [];
		var menuTemplate = getTemplateAsContainer(document, '.js-doc__menu-container-' + level);
		menuObject.childNodes.forEach(function(node) {
			var menuItemTemplate = getTemplateAsContainer(document, '.js-doc__menu-item-' + level);
			menuTemplate.append(...menuItemTemplate.children);
			switch(node.tagName) {
				case "SPAN":
					menuTemplate.querySelector('#js-doc__menu-item-title').innerText = node.innerText;
					break;
				case "A":
					menuTemplate.querySelector('#js-doc__menu-item-title').addEventListener("click", function(e) {
						e.preventDefault();
						config.selectedFile = node.innerText;
						onFileChange(config);
					});
					files.push(node.innerText);
					break;
				case "DIV":
					//console.log("submenu");
					files.push(...parseMenu(config, node, menuItemTemplate, level + 1));
					break;
				case undefined:
				default: break;
			}
		});
		container.append(...menuTemplate.children);
		return files;
	}
	/********** CHANGE  ************/
	function onFileChange(config) {
		if (config.selectedFile === null || !config.cache.hasOwnProperty(config.selectedFile)) {
			config.selectedFile = config.defaultFile;
		}
		// TODO highligh
		// TODO script
		// TODO set lang title? - main title + page title
		document.querySelector("#js-doc__body").innerHTML = config.cache[config.selectedFile].innerHTML;
	}
	function onOptionChange(config, newVal, data, selected) {
		if (data.hasOwnProperty(newVal)) {
			config[selected] = newVal;
			setBody(config);
		} else {
			// TODO show error
		}
	}
	/******* PRINTING ********/
	function printStatic(config) {
		var printSelect = function(name, data, selected) {
			var container = document.getElementById('js-doc__' + name + '-select');
			for(const[key, title] of Object.entries(data)) {
				container.insertAdjacentHTML(
					"beforeend",
					getTemplateAsContainer(document, '#js-doc__' + name + '-item').innerHTML
					.replace('{' + name + 'Id}', key)
					.replace('{' + name + 'Title}', title)
				);
				if (container.tagName !== 'SELECT') {
					container.lastElementChild.addEventListener("click", function() {
						onOptionChange(config, key, data, selected);
					});
				}
			}
			if (container.tagName === 'SELECT') {
				container.addEventListener("change", function(e) {
					onOptionChange(config, container.value, data, selected);
				});
			}
		}
		printSelect("version", config.versions, "selectedVersion");
		printSelect("language", config.langs, "selectedLang");
		return config;
	}
	/******************/
	function setBody(config) {
		load(rootPath + "/" + config.selectedLang + "/index.html")
		.then(function(menuObject) {
			return parseFileVersion(menuObject, config.selectedVersion);
		})
		.then(function(menuObject) {
			var promises = [];
			// TODO set lang title?
			parseMenu(config, menuObject).forEach(function(file) {
				promises.push(
					load(
						file.startsWith("http")
						? file
						: rootPath + "/" + config.selectedLang + "/" + file
					)
					.then(function(content) {
						return {
							file: file,
							content: parseFileVersion(content, config.selectedVersion)
						};
					})
				);
			});
			return Promise.all(promises);
		})
		.then(function(values) {
			if (values.length === 0) {
				throw new Error("No menu");
			}
			config.cache = {};
			values.forEach(function(loaded) {
				config.cache[loaded.file] = loaded.content;
			});
			config.defaultFile = values[0].file;
			return config;
		})
		.then(onFileChange)
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
		var themePath = "themes/";
		return load(themePath + theme).then(function(themeContent) {
			var themeHtml = stringToHtml(themeContent);
			var addELements = function(id) {
				var template = getTemplate(themeHtml, "#" + id);
				template.querySelectorAll("link").forEach(function(element) {
					var value = element.getAttribute("href");
					if (value !== null && !value.startsWith("http")) {
						element.setAttribute("href", themePath + value);
						return true;
					}
				});
				template.querySelectorAll("script").forEach(function(element) {
					var value = element.getAttribute("src");
					var script= document.createElement('script');
					if (value === null) {
						script.innerHTML = element.innerHTML;
					} else if (!value.startsWith("http")) {
						script.src= themePath + value;
					} else {
						script.src= value;
					}

					var parent = element.parentElement === null ? document[id] : element.parentElement;
					element.remove();
					parent.appendChild(script);
				});

				document[id].append(...template.children);
			};
			addELements("head");
			addELements("body");
			document.dispatchEvent(themeContentAddedEvent);
			return config;
		});
	})
	.then(printStatic)
	.then(setBody)
	.catch(catchError);
}