/* VERSION 4.0.2 */
var Doc = {
	languages: {},
	versions: {},
	lang: null,
	version: null,
	file: null,
	setFile: function(file) {
		Doc.file = file;
		Doc.onPageChangeAsync();
	},
	setVersion: function(version) {
		Doc.version = version;
		Doc.onSettingsChangeAsync();
	},
	setLang: function(lang) {
		Doc.lang = lang;
		Doc.onSettingsChangeAsync();
	},
	location: "",
	path: "",
	document: window.parent.document,
	getPath: function() {
		return Doc.path + "/" + Doc.lang + "/"; // + Doc.version + "/";
	},
	init: function() {
		document.getElementById("date").innerText = new Date().getFullYear();
        Doc.fillMeta();

		Doc.location =  window.parent.location;
		Doc.path =  Doc.location.href.substring(0, Doc.location.href.lastIndexOf('/'));

		var configPath = Doc.path + "/config.json";

		Doc.load(configPath, function(response) {
			config = JSON.parse(response);
			Doc.fillSocial(config);
        	// set doc attributes
	        Doc.versions = config.versions;
	        Doc.languages = config.langs;
			var params = new URLSearchParams(Doc.location.search);
        	Doc.lang = params.get("lang") === null ? Object.keys(Doc.languages)[0] : params.get("lang");
        	Doc.version = params.get("version") === null ? Object.keys(Doc.versions)[0] : params.get("version");
        	Doc.file = params.get("file"); // === null ? null : params.get("file")
        	// fill static content
        	document.getElementById("doc-app-name").innerText = config.name;
	        Doc.fillList(config.langs, "doc-language", "lang", function(newLang) {
	        	Doc.setLang(newLang);
	        }); 
	        Doc.fillList(Object.keys(config.versions).reduce((acc,curr)=>(acc[curr]=curr,acc),{}), "doc-version", "version", function(newVer){
	        	Doc.setVersion(newVer);
	        });
	        // load first page
	        Doc.onSettingsChange();
		}, Doc.onLoadFailure());
	},
	onSettingsChangeAsync: function() {
		setTimeout(Doc.onSettingsChange, 10);
	},
	onSettingsChange: function() {
		document.getElementById("doc-current-version").innerText = Doc.version;
		document.getElementById("doc-current-language").innerText = Doc.languages[Doc.lang];

		Doc.setListItemActive("doc-version", Doc.version);
		Doc.setListItemActive("doc-language", Doc.lang);

		Doc.removeMeta("docsearch:language");
		Doc.removeMeta("docsearch:version");
		Doc.addMeta("meta", {
			"name": "docsearch:language",
			"content": Doc.lang,
		});
		Doc.addMeta("meta", {
			"name": "docsearch:version",
			"content": Doc.versions[Doc.version]
		});
		// TODO og:locale - maybe??
		Doc.load(Doc.getPath() + "index.html", function(response) {
			var wrapper = document.createElement("div");
			wrapper.innerHTML = response;
			Doc.prepareHtml(wrapper, ".menu");
			var menuItems = wrapper.querySelectorAll('.menu');
			Doc.fillMainMenu(menuItems);
			if (Doc.file === null) {
				Doc.file = wrapper.querySelector(".menu .main.link").innerText;
			}
			Doc.onPageChange();
		}, Doc.onLoadFailure());
	},
	onPageChangeAsync: function() {
		setTimeout(Doc.onPageChange, 10);
	},
	onPageChange: function() {
	    var url = "";
	 //   Doc.removeMeta("og:url");
	//    Doc.removeMeta("twitter:url");
	    if (Doc.file.startsWith('http')) {
	        url = Doc.file;
	    } else {
	        url = Doc.getPath() + Doc.file;
			/*Doc.addMeta("meta", {
				"property": "og:url",
				"content": Doc.path + "?file=" + Doc.file
			});
			Doc.addMeta("meta", {
				"property": "twitter:url",
				"content": Doc.path + "?file=" + Doc.file
			});*/
	    }
		Doc.load(url, function(fileContent) {
			// TODO check file for version?
			var content = document.getElementById('doc-content');
			content.innerHTML = fileContent
				.replace(":Tag'", ":" + Doc.versions[Doc.version] + "'")
				.replace("<h1>", '<h1 class="bd-title">')
				.replace('<p class="introduction">', '<p class="bd-lead">');
			Doc.prepareHtml(content, ".diff");
			window.parent.history.pushState(
				{"html":window.location.href},"", 
				"?version=" + Doc.version + "&lang=" + Doc.lang + "&file=" + Doc.file + location.hash);
	        Doc.fillMinorMenu(content);
	        hljs.highlightAll();
	        window.scrollTo(0, 0);
		}, Doc.onLoadFailure());
	},

	/* load something */
	load: function(url, onSuccess, onFailure = null) {
	    var xhr = new XMLHttpRequest();
	    xhr.open("get", url, true);
	    // xhr.setRequestHeader('Cache-Control', 'no-cache');
	    xhr.onload = function() {
	        onSuccess(xhr.response);
	    };
	    if (onFailure === null) {
	    	onFailure = function() {};
	    }
		xhr.onerror = function() {
			onFailure(xhr);
		};
		try {
			xhr.send();
		} catch (exception) {
			onFailure(exception);
		}
	},
	onLoadFailure: function() {
		return function(xhr) {
			console.log("error", xhr); // TODO display error
		};
	},
	/* fill dropdown list */
	fillList: function(options, listId, urlName, callback) {
	    var list = document.getElementById(listId);
	    if (list === null) {
	        console.error("Missing select #" + listId);
	        return;
	    }
	    for (const[key, name] of Object.entries(options)) {
			var link = document.createElement("a");
			link.setAttribute("id", Doc.normalizeId(key));
			link.setAttribute("class", "dropdown-item");
			link.setAttribute("href", "?" + urlName + "=" + key);
			link.innerText = name;
			link.onclick = function() {
				callback(key);
				return false;
			};
	        var li = document.createElement("li");
	        li.appendChild(link);
	        list.appendChild(li);
	    }
	},
	setListItemActive: function(listId, itemId) {
		var list = document.getElementById(listId);
		list.querySelectorAll('li').forEach(function(li) {
			var a = li.querySelector("a");
			a.classList.remove("current");
			a.removeAttribute("aria-current");
		});
		var item = list.querySelector("#" + Doc.normalizeId(itemId));
		item.classList.add("current");
		item.setAttribute("aria-current", "true");
	},
	normalizeId: function(id) {
		return id.replace(".", "_");
	},
	/* left menu */
	fillMainMenu: function(menuItems) {
		var menu = document.getElementById("doc-main-menu");
		menu.innerHTML = "";
		menuItems.forEach(function(item, index) {
			var li = document.createElement("li");
			li.classList.add("mb-1");
			menu.appendChild(li);

			var title = item.querySelector('.title').innerText;
			if (item.querySelector('.main.link') === null) {
				var button = document.createElement("button");
				button.setAttribute("class", "btn d-inline-flex align-items-center rounded collapsed");
				button.innerText = title;
				li.appendChild(button);
				var collapseId = "collapse_" + index;
				button.setAttribute("data-bs-toggle", "collapse");
				button.setAttribute("data-bs-target", "#" + collapseId);

				var div = document.createElement("div");
				div.classList.add("class", "collapse");
				div.setAttribute("id", collapseId);
				li.appendChild(div);

				var ul = document.createElement("ul");
				ul.setAttribute("class", "list-unstyled fw-normal pb-1 small");
				div.appendChild(ul);
				Doc.prepareHtml(item, '.submenu');
				Doc.fillMainSubMenu(ul, item.querySelectorAll(".submenu"));

				var expanded = div.querySelector("li a.active") !== null;
				button.setAttribute("aria-expanded", expanded);
				if (expanded) {
					div.classList.add("show");
				}

			} else {
				var a = Doc.createMainMenuLink(item);
				a.classList.add("doc-menu-notCollapsed");
				li.appendChild(a);
			}
		});
	},
	fillMainSubMenu: function(submenu, items) {
		items.forEach(function(item) {
			var li = document.createElement("li");
			submenu.appendChild(li);
			li.appendChild(Doc.createMainMenuLink(item));
		});
	},
	createMainMenuLink: function(item) {
		var a = document.createElement("a");
		var title = item.querySelector('.title').innerText;
		var link = item.querySelector('.link').innerText;
		a.setAttribute("href", link);
		a.setAttribute("class", "d-inline-flex align-items-center rounded");
		if (Doc.file === link) {
			Doc.setFileLinkActive(a);
		}
		a.innerText = title;
		a.onclick = function() {
			Doc.setFileLinkActive(a);
			Doc.setFile(link);
			return false;
		};
		return a;
	},
	setFileLinkActive: function(a) {
		document.querySelectorAll("#doc-main-menu a.active, #doc-main-menu a[aria-current]").forEach(function(link) {
			link.classList.remove("active");
			link.removeAttribute("aria-current");
		});
		a.classList.add("active");
		a.setAttribute("aria-current", "page");
	},
	/* minor menu */
	fillMinorMenu: function(content) {
	    var containers = [];
	    var lastLevel = -1;
	    var getLastContainer = function() {
	    	return containers[containers.length-1];
	    };
	    var popContainer = function() {
	        var container = containers.pop();
	        var last = getLastContainer();
	        if (last === undefined) {
	        	document.getElementById("doc-minor-menu").appendChild(container);
	        	last = pushContainer();
	        } else {
	        	last.appendChild(container);
	        }
	        return last;
	    };
	    var pushContainer = function() {
	    	var container = document.createElement("ul");
			containers.push(container);
			return container;
	    };
	    var getContainer = function(level) {
	    	if (lastLevel < level) {
				return pushContainer();
			}
			if (lastLevel > level) {
	            return popContainer();
	        }
	        return getLastContainer();
	    };
	    document.getElementById("doc-minor-menu-headline").innerText = "";
		document.getElementById("doc-minor-menu").innerHTML = "";
		content.querySelectorAll("h1,h2,h3,h4").forEach(function(headline, index) {
			var level = parseInt(headline.tagName.substring(1,2));
			if (level === 1) {
				document.getElementById("doc-minor-menu-headline").innerText = headline.innerText + ":";
				return;
			}
	        var id = headline.tagName + "-" + index;
	        headline.setAttribute("id", id);

			var container = getContainer(level);
        	lastLevel = level;
			var li = document.createElement("li");
			container.appendChild(li);

			var a = document.createElement("a");
			a.setAttribute("href", "#" + id);
			a.innerText = headline.innerText;
			li.appendChild(a);
		});
		content.querySelectorAll("a").forEach(function(a) {
			a.onclick = function() {
				if (a.getAttribute("href").startsWith("http")) {
					window.parent.location = a.getAttribute("href");
					return false;
				}
				if (a.getAttribute("href").startsWith("?file")) {
					Doc.setFile(a.getAttribute("href").substring(6));
					return false;
				}
				return true;
			};
		});

	    while(containers.length > 0) {
	        if (containers.length === 1) {
	            document.getElementById("doc-minor-menu").appendChild(containers.pop());
	        } else {
	            popContainer();
	        }
	    }
	},
	/* preparation */
	prepareHtml: function(content, selector) {
		var versions = {};
		Object.keys(Doc.versions).sort().forEach(function(ver, index) {
			versions[ver] = index;
		});
		var currentVersionIndex = versions[Doc.version];
		content.querySelectorAll(selector).forEach(function(el) {
			var from = el.getAttribute("from");
			var to = el.getAttribute("to");
			if (from !== null && versions.hasOwnProperty(from)) {
				if (currentVersionIndex < versions[from]) {
					el.remove();
					return;
				}
			}
			if (to !== null && versions.hasOwnProperty(to)) {
				if (currentVersionIndex > versions[to]) {
					el.remove();
					return;
				}
			}
		});
	},
	/* owner ship*/
	fillSocial: function(config) {
		Doc.addMeta("title", {}, config.name);
		/*Doc.addMeta("meta", {
			"property": "og:title",
			"content": config.name
		});
		Doc.addMeta("meta", {
			"property": "og:type",
			"content": "website"
		});
		Doc.addMeta("meta", {
			"property": "twitter:title",
			"content": config.name
		});
		Doc.addMeta("meta", {
			"property": "twitter:card",
			"content": "summary"
		});*/
		if (!config.hasOwnProperty("social")) {
			return;
		}
		var social = config.social;
		var setProperty = function(propertyName, elementId, change = null) {
			if (change === null) {
				change = function(a){return a;};
			}
			if (social.hasOwnProperty(propertyName)) {
				document.getElementById(elementId).innerText = change(social[propertyName]);
			}
		};
		var setLink = function(propertyName, elementId) {
			if (social.hasOwnProperty(propertyName)) {
				var image = document.getElementById(elementId);
				image.removeAttribute("style");
				image.querySelector("a").setAttribute("href", social[propertyName]);
			}
		};
		setProperty("author", "doc-owner");
		setProperty("from", "doc-from", function(a){ return a + " - ";});
		setLink("github", "doc-github"); //  https://github.com/...
		setLink("collective", "doc-collective"); // https://opencollective.com/...

		if (social.hasOwnProperty("author")) {
			Doc.addMeta("meta", {
				"name": "author",
				"content": social.author
			});
		}
		if (social.hasOwnProperty("description")) {
			Doc.addMeta("meta", {
				"name": "description",
				"content": social.description
			});
		/*	Doc.addMeta("meta", {
				"property": "og:description",
				"content": social.description
			});
			Doc.addMeta("meta", {
				"property": "twitter:description",
				"content": social.description
			});*/
		}
		if (social.hasOwnProperty("icon")) {
			Doc.addMeta("link", {
				"rel": "icon",
				"href": social.icon
			});
		/*	Doc.addMeta("meta", {
				"property": "twitter:image",
				"content": social.icon
			});
			Doc.addMeta("meta", {
				"property": "og:image",
				"content": social.icon
			});
			Doc.addMeta("meta", {
				"property": "og:image.type",
				"content": "image/png"
			});
			/*Doc.addMeta("meta", {
				"property": "og:image:width",
				"content": ""
			});
			Doc.addMeta("meta", {
				"property": "og:image:height",
				"content": social.icon
			});*/
		}
	},
	fillMeta: function() {
		Doc.addMeta("meta", {"charset": "utf-8"});
		Doc.addMeta("meta", {
			"name": "viewport",
			"content": "width=device-width, initial-scale=1"
		});
	},
	addMeta: function(tag, data, inner = null) {
		var meta = document.createElement(tag);
		for (const[name, value] of Object.entries(data)) {
			meta.setAttribute(name, value);
		}
		if (inner !== null) {
			meta.innerText = inner;
		}
		Doc.document.head.appendChild(meta);
	},
	removeMeta: function(name, tag = "meta") {
		var meta = Doc.document.head.querySelector("meta[name='" + name + "']");
		if (meta !== null) {
			meta.remove();
		}
	}
};
Doc.init();