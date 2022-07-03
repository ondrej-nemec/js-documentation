/* VERSION 5.0.0 */
// TODO download
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
const scriptLoadedEvent = new Event("scriptLoaded");

const thirdPartiesLibs = {
	"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/github-dark-dimmed.min.css": null, // TODO will be good if not null
	"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js": null, // TODO will be good if not null
	"https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.0/html2pdf.bundle.min.js": null // TODO will be good if not null
};

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
		var template = getTemplate(container, selector);
		if (template === null) {
			return null;
		}
		var wrapper = document.createElement("div");
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
			if (from !== null && selectedVersion < from) {
				element.remove();
				return;
			}
			if (to !== null && selectedVersion > to) {
				element.remove();
				return;
			}
		});
		return wrapper;
	}
	function parseSubMenu(headlines) {
		var parent = document.querySelector('#js-doc__submenu');
		if (parent === null) {
			console.warn("No submenu placeholder");
			return;
		}
		parent.innerHTML = "";

		var getContainerTemplate = function (level) {
			return getTemplateAsContainer(document, '.js-doc__submenu-container-' + (level-1));
		}
		var getItemTemplate = function(level) {
			return getTemplateAsContainer(document, '.js-doc__submenu-item-' + (level-1));
		};

		var containers = [];
		var lastLevel = 0;
	    var getLastContainer = function() {
	    	return containers[containers.length-1];
	    };
	    var popContainer = function(level) {
	        var container = containers.pop();
	        var last = getLastContainer();
	        if (last === undefined) {
	        	parent.append(...container.children);
	        	last = pushContainer(level);
	        } else {
	        	last.querySelector('#js-doc__submenu-container').append(...container.children);
	        }
	        return last;
	    };
	    var pushContainer = function(level) {
	    	var container = getContainerTemplate(level);
			containers.push(container);
			return container;
	    };
	    var getContainer = function(level) {
	    	if (lastLevel < level) {
				return pushContainer(level);
			}
			if (lastLevel > level) {
	            return popContainer(level);
	        }
	        return getLastContainer();
	    };

		headlines.forEach(function(headline, index) {
			var level = parseInt(headline.tagName.substring(1,2));

			var container = getContainer(level);
			if (container === null) {
				containers.pop(); // remove last null element
				return; // level not supported
			}
			var itemElement = getItemTemplate(level);
			if (itemElement === null) {
				return; // level not supported
			}

			var id = headline.getAttribute("id");
			if (id === null) {
				id = headline.tagName + "-" + index;
	       		headline.setAttribute("id", id);
			}

        	lastLevel = level;
			// always <a>
			var itemLink = itemElement.querySelector("a#js-doc__submenu-item");
			itemLink.innerText = headline.innerText;
			itemLink.setAttribute("href", "#" + id);

			container.querySelector('#js-doc__submenu-container').append(...itemElement.children);
		});
	    while(containers.length > 0) {
	        if (containers.length === 1) {
	           parent.append(...containers.pop().children);
	        } else {
	            popContainer(0); // here no matter level
	        }
	    }
	    
	}
	function parseMenu(config, menuObject, container = null, level = 0) {
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
			container.innerHTML = "";
		}
		if (container === null) {
			console.warn("No menu placeholder");
			return [];
		}

		var files = [];
		var menuTemplate = getTemplateAsContainer(document, '.js-doc__menu-container-' + level);
		var menuContainer = menuTemplate.querySelector("#js-doc__menu-container");

		for (let item of menuObject.children) { // div holding list of divs
			var menuItemTemplate = getTemplateAsContainer(document, '.js-doc__menu-item-' + level);
			for (let node of item.children) {
				switch(node.tagName) {
					case "SPAN":
						menuItemTemplate.querySelector('#js-doc__menu-item-title').innerText = node.innerText;
						break;
					case "A":
						menuItemTemplate.querySelector('#js-doc__menu-item-link').addEventListener("click", function(e) {
							e.preventDefault();
							config.selectedFile = node.innerText;
							onFileChange(config);
						});
						files.push(node.innerText);
						break;
					case "DIV":
						files.push(...parseMenu(config, node, menuItemTemplate.querySelector('#js-doc__menu-item-link'), level + 1));
						break;
					case undefined:
					default: break;
				}
			}
			menuContainer.append(...menuItemTemplate.children);
		}
		container.append(...menuTemplate.children);
		return files;
	}
	function loadResources(rootPath, container, rootElement) {
		var setSimplyLink = function (element, attribute) {
			container.querySelectorAll(element).forEach(function(element) {
				var value = element.getAttribute(attribute);
				if (value !== null && !value.startsWith("http")) {
					element.setAttribute(attribute, rootPath + value);
				}
			});
		};
		setSimplyLink("link", "href");
		setSimplyLink("img", "src");
		
		container.querySelectorAll("script").forEach(function(element) {
			var value = element.getAttribute("src");
			var script= document.createElement('script');
			if (value === null) {
				script.innerHTML = element.innerHTML;
			} else if (!value.startsWith("http")) {
				script.src= rootPath + value;
			} else {
				script.src= value;
			}
			var parent = element.parentElement === null ? rootElement : element.parentElement;
			element.remove();
			parent.appendChild(script);
		});
	}
	/***** META *******/
	function addMeta(data) {
		var meta = document.createElement("meta");
		for (const[name, value] of Object.entries(data)) {
			meta.setAttribute(name, value);
		}
		document.head.appendChild(meta);
	}
	function updateMeta(name, content) {
		var meta = document.head.querySelector("meta[name='" + name + "']");
		if (meta === null) {
			addMeta({
				name: name,
				content: content
			});
		} else {
			meta.setAttribute("content", content);
		}
	}
	function setSocial(selector, value) {
		var container = document.querySelector(selector);
		if (container !== null) {
			container.innerText = value;
		}
	}
	function setTitle(title, append = false) {
		var tag = document.head.querySelector("title");
		if (tag === null) {
			tag = document.createElement("title");
			document.head.appendChild(tag);
		}
		tag.innerText = append ? tag.innerText + " | " + title : title;
	}
	function setUrl(config) {
		window.parent.history.pushState(
			{"html":window.location.href},
			"", 
			"?version=" + config.selectedVersion + "&lang=" + config.selectedLang + "&file=" + config.selectedFile + location.hash
		);
	}
	function setIcon(icon) {
		var tag = document.head.querySelector("link[rel=icon]");
		if (tag === null) {
			tag = document.createElement("link");
			tag.setAttribute("rel", "icon");
			tag.setAttribute("href", icon);
			document.head.appendChild(tag);
		}
	}
	/****** SEARCH **********/
	function searchPhrase(config, phrase) {
		var searchItem = getTemplateAsContainer(document, '#js-doc__search-item'); // document.querySelector('#js-doc__search-item');
		if (searchItem === null) {
			console.warn("No search template");
			return;
		}
		document.querySelector("#js-doc__body").innerHTML = "";;
		for (const[file, content] of Object.entries(config.cache)) {
			var text = content.innerText.toUpperCase();
			var seachingFor = phrase.toUpperCase();

			var res = "";
			var indexOccurence = text.indexOf(seachingFor, 0);
			while(indexOccurence >= 0) {
				if (res !== "") {
					res += "<i>...</i>";
				}
				res += content.innerText.substring(Math.max(0, indexOccurence-20), indexOccurence);
				res += "<b>" + content.innerText.substring(indexOccurence, indexOccurence + phrase.length) + "</b>";
				res += content.innerText.substring(indexOccurence + phrase.length, Math.min(indexOccurence + phrase.length + 20), phrase.length);

				indexOccurence = text.indexOf(seachingFor, indexOccurence + 1);
			}
			if (res !== "") {
				var template = searchItem.cloneNode(true);
				var h1 = content.querySelector("h1");
				template.querySelector("#js-doc__search-item-title").innerText = h1 === null ? "" : h1.innerText;
				template.querySelector("#js-doc__search-item-title").addEventListener("click", function() {
					config.selectedFile = file;
					onFileChange(config);
				});
				template.querySelector("#js-doc__search-item-example").innerHTML = res;
				document.querySelector("#js-doc__body").append(...template.children);
			}
		}
	}
	/********** CHANGE  ************/
	function onFileChange(config) {
		if (config.selectedFile === null || !config.cache.hasOwnProperty(config.selectedFile)) {
			config.selectedFile = config.defaultFile;
		}
		setUrl(config);
		// TODO set current - active - config
		/*
		.replace(":Tag'", ":" + Doc.versions[Doc.version] + "'")
				.replace("<h1>", '<h1 class="bd-title">')
				.replace('<p class="introduction">', '<p class="bd-lead">');
		*/
		var body = config.cache[config.selectedFile];

		var h1 = body.querySelector("h1");
		if (h1 !== null) {
			setTitle(h1.innerText, true);
		}
		parseSubMenu(body.querySelectorAll("h1,h2,h3,h4,h5"));
		body.querySelectorAll("a").forEach(function(a) {
			a.onclick = function() {
				if (a.getAttribute("href").startsWith("http")) {
					window.parent.location = a.getAttribute("href");
					return false;
				}
				if (a.getAttribute("href").startsWith("?file")) {
					config.selectedFile = a.getAttribute("href").substring(6);
					onFileChange(config);
					return false;
				}
				return true;
			};
		});
		loadResources(config.filesPath, body, body);
		
		if (typeof hljs === 'undefined') {
			document.addEventListener("scriptLoaded", function(e) {
				hljs.highlightAll(); // TODO check if loaded is HLJS ?
			});
		} else {
			hljs.highlightAll();
		}
		document.querySelector("#js-doc__body").innerHTML = "";
		document.querySelector("#js-doc__body").append(...body.cloneNode(true).children);

		document.querySelector("#js-doc__body").querySelectorAll('.js-doc__pdf-page').forEach(function(button) {
			button.addEventListener('click', function() {
				pageDownload(config, config.selectedFile);
			});
		});
		window.scrollTo(0, 0);
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
					.replace('{' + name + 'Title}', (typeof title === "object" ? title.title : title))
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
		setSocial('#js-doc__selected-version', config.versions[config.selectedVersion]);
		setSocial('#js-doc__selected-language', config.getLanguageTitle());
		updateMeta("docsearch:language", config.getLanguageTitle());
		updateMeta("docsearch:version", config.selectedVersion);

		document.body.setAttribute("dir", config.getLanguageDirection());
		setUrl(config);

		config.filesPath = rootPath + "/" + config.selectedLang + "/";
		load(config.filesPath + "index.html")
		.then(function(menuObject) {
			return parseFileVersion(menuObject, config.selectedVersion);
		})
		.then(function(menuObject) {
			var promises = [];
			var title = menuObject.querySelector("title");
			if (title !== null) {
				setTitle(title.innerText);
			}
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
	function pageDownload(config, file) {
		var body = config.cache[file];

		var title = body.querySelector("h1").innerText;
		var titleElement = document.createElement("h1");
		titleElement.innerText = title;

		var titlePage = document.createElement("div");
		titlePage.appendChild(titleElement);
		titlePage.style['text-align'] = "center";

	//	parseSubMenu(body.querySelectorAll("h1,h2,h3,h4,h5"));
		/*body.querySelectorAll("a").forEach(function(a) {
			a.onclick = function() {
				if (a.getAttribute("href").startsWith("http")) {
					window.parent.location = a.getAttribute("href");
					return false;
				}
				if (a.getAttribute("href").startsWith("?file")) {
					config.selectedFile = a.getAttribute("href").substring(6);
					onFileChange(config);
					return false;
				}
				return true;
			};
		});*/
		loadResources(config.filesPath, body, body);
		hljs.highlightAll();

		var separator = document.createElement("div");
		separator.setAttribute("class", "html2pdf__page-break");

		var data = document.createElement("div");
		data.appendChild(titlePage);
		data.appendChild(separator);

		var bodyCopy = body.cloneNode(true);
		bodyCopy.querySelectorAll('.js-doc__download-exclude').forEach(function(el) {
			el.remove();
		});
		data.append(...bodyCopy.children);

		html2pdf().set({
	      margin: 10,
	      filename: title + ".pdf",
	      image: { type: "jpeg", quality: 1 },
	      html2canvas: {
	      	scale: 2,
			dpi: 300,
			letterRendering: true,
			useCORS: true
	      },
	      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
	    }).from(data).save();
	}
	/******************/
	load(rootPath + "/config.json")
	.then(function (response) {
		var config = JSON.parse(response);
		var params = new URLSearchParams(window.location.search);
		config.selectedLang = getFromUrl(params, "lang", config.langs);
		config.selectedVersion = getFromUrl(params, "version", config.versions);
		config.getLanguageTitle = function() {
			var selected = config.langs[config.selectedLang];
			if (typeof selected === "object") {
				return selected["title"];
			}
			return selected;
		};
		config.getLanguageDirection = function() {
			var selected = config.langs[config.selectedLang];
			if (typeof selected === "object") {
				return selected["direction"];
			}
			return "ltr";
		};
		config.selectedFile = params.get("file");
		return config;
	})
	.then(function(config) {
		var optionalSet = [];
		if (config.hasOwnProperty("name")) {
			addMeta({
				"property": "og:title",
				"content": config.name
			});
			addMeta({
				"property": "twitter:title",
				"content": config.name
			});
			setTitle(config.name);
			document.addEventListener("themeContentAdded", function() {
				setSocial("#js-doc__app-name", config.name);
			});
		}
		if (config.hasOwnProperty("description")) {
			addMeta({
				"name": "description",
				"content": config.description
			});
			addMeta({
				"property": "twitter:description",
				"content": config.description
			});
		}
		if (config.hasOwnProperty("author")) {
			addMeta({
				"property": "author",
				"content": config.author
			});
			document.addEventListener("themeContentAdded", function() {
				setSocial("#js-doc__app-author", config.author);
			});
		}
		if (config.hasOwnProperty("from")) {
			document.addEventListener("themeContentAdded", function() {
				setSocial("#js-doc__app-from", config.from);
			});
		}
		if (config.hasOwnProperty("icon")) {
			//addMeta(); // not requred - icon is enought
			setIcon(config.icon);
		}
		addMeta({"charset": "utf-8"});
		document.addEventListener("themeContentAdded", function() {
			setSocial("#js-doc__app-now", new Date().getFullYear());
		});
		
		for (const[link, integrity] of Object.entries(thirdPartiesLibs)) {
			if (link.endsWith(".css")) {
				var css = document.createElement("link");
				css.setAttribute("rel", "stylesheet");
				css.setAttribute("href", link);
				css.setAttribute("crossorigin", "anonymous");
				document.head.appendChild(css);
			} else if (link.endsWith(".js")) {
				var script = document.createElement("script");
				script.setAttribute("src", link);
				script.setAttribute("crossorigin", "anonymous");
			    script.onload = function() {
					document.dispatchEvent(scriptLoadedEvent, {link: link});
			    };
				if (integrity !== null) {
					script.setAttribute("integrity", integrity);
				}
				document.head.appendChild(script);
			}
		}

		if (theme === null) {
			document.dispatchEvent(themeContentAddedEvent);
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
				loadResources(themePath, template, document[id]);
				document[id].append(...template.children);
			};
			addELements("head");
			addELements("body");
			document.dispatchEvent(themeContentAddedEvent);
			return config;
		});
	})
	.then(function(config) {
		var search = document.querySelector('#js-doc__search-input');
		search.addEventListener("change", function(e) {
			searchPhrase(config, search.value);
		});
		return config;
	})
	.then(printStatic)
	.then(setBody)
	.catch(catchError);
}