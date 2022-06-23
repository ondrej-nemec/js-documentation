# JS Documentation

JS framework for displaying documentation using Github pages. It supports pages layout, multilanguage and different versions.

JS Documentation is using following libraries:

  * (https://getbootstrap.com/docs/5.1/getting-started/introduction/)[Bootstrap 5.1]
  * (https://highlightjs.org/)[Highlight 11.3]

## Include and configure

For including, you need two files in root of documentation folder: `index.html` and `config.json`.

### index.html

```html
<html>
<head>
</head>
<body>
  <iframe src="https://ondrej-nemec.github.io/js-documentation/index.html" width="100%" height="100%" style="border: none" id="frame"></iframe>
</body>
</html>
```

#### config.json

`config.json` contains base configuration. Requred information are app name, languages and versions.

  * `name`: name of application. Also appears in title tag
  * `langs`: languages in object
  * `versions`: versions in object
  * `social`: data for metadata
    * `author`: author name
    * `icon`: path to icon
    * `description`: page description
    * `from`: value is displayed in footer

**Example:**

```json
{
	"name": "JS Documentation example",
	"langs": {
		"en": "English",
		"cs": "Čeština"
	},
	"versions": {
		"v1.0": "v1.0.0",
		"v1.1": "v1.1.100",
		"v2.0": "v2.0.4"
	},
	"social": {
		"author": "My name",
		"from": "This year",
		"icon": "favicon.ico",
		"description": "Page documenation description"
	}
}
```

## Pages

Pages are simple HTML files without tags: HTML, head, body.

### Languages

Each language needs to have own subfolder. The subfolder name must be one of keys in `config.json`->`langs`.

### Versions

One file can contains data for more versions. Text common for all versions has no special marks. Every text specific for some version(s) must be in html element (usually div) with class `diff`. Also the element must has at least one of this attribures: `from` and `to`.

Versions in `from` and `to` attribute correspond keys in `config.json`->`versions`.

#### From

The element will be displayed if selected version is at least value of this attribute. Missing `from` means no lower bounder.

#### To

The element will be displayed if selected version is maximal value of this attribute. Missing `to` means no upper bounder.

#### Example

Element appears only if selected version is v1.1 or upper.
```html
<div class="diff" from="v1.1"></div>
```

Element appers onfy if selected version is v1.1 or lower.
```html
<div class="diff" to="v1.1"></div>
```

Element appers onfy if selected version is v1.1.
```html
<div class="diff" from="v1.1" to="v1.1"></div>
```

Element appers onfy if selected version between v1.1 and v2.0 (inclusive).
```html
<div class="diff" from="v1.1" to="v2.0"></div>
```

## Replacement

  * `:Tag` will be replaced with value of selected version (`config.json`->`versions`[selected-version])
  * `p` element with class `introduction` will be displayed in different way