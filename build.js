import path from 'path';
import glob from 'glob';
import { map, toLower, includes, findIndex, omit, endsWith, trim, startsWith, kebabCase } from 'lodash';
import metaMarked from 'meta-marked';
import fs from 'fs';

import Guide from './layouts/Guide';
import Component from './layouts/Component';
import Class from './layouts/Class';
import React from 'react';
import { createRawAnchor } from './Anchor';
import * as DashBuilder from './DashBuilder';

const packageInfo = require('./package.json');
const version = require('./vendor/draft-js/package.json').version;

const modules = [
	'Modifier',
	'RichUtils',
	'AtomicBlockUtils',
	'KeyBindingUtil',
	'Entity'
];
const ignoreEntries = [
	'Data Conversion'
];
const enums = [
	'EditorChangeType'
];

// Sort by chain
function sort(pages) {
	const sortedPages = [];
	let previousPage;
	while (sortedPages.length !== pages.length) {
		const i = findIndex(pages, {next: previousPage});
		if (i < 0) { throw Error("Unable to find page with next " + previousPage); }
		const page = pages[i];
		sortedPages.unshift(omit(page, 'next'));
		previousPage = page.id;
	}
	return sortedPages;
}

function fixLinks(html) {
	return html
		.replace(/\/draft-js\/docs\//g, '')
		.replace(/id="([^"]+)-+"/g, "id=\"$1\"");
}

DashBuilder.build({
	name: "Draft.js",
	id: "draftjs",
	version: version,
	icon: path.join(__dirname, 'icon.png'),
	icon2x: path.join(__dirname, 'icon@2x.png'),
	style: path.join(__dirname, 'vendor/draft-js/website/src/draft-js/css/draft.css'),
	feedBaseURL: "https://el-tramo.be/dash",
	author: packageInfo.author,
	documentation: (function () {
		const entries = [];
		const pages = sort(map(glob.sync('vendor/draft-js/docs/*.md'), (fileName) => {
			const markdown = fs.readFileSync(fileName, 'utf-8');
			const marked = metaMarked(markdown);
			const content = fixLinks(marked.html);
			let html;
			if (marked.meta.category === "API Reference") {
				if (endsWith(marked.meta.title, 'Component')) {
					const name = trim(marked.meta.title.replace('Component', ''));
					let contentWithAnchors = content;

					// Detect properties
					const propsRegExp = /^#### (.*)/gm;
					let match;
					while ((match = propsRegExp.exec(markdown)) !== null) {
						const property = match[1];
						if (startsWith(property, "ARIA")) { continue; }
						contentWithAnchors = contentWithAnchors.replace(
							new RegExp(`(<h4 id="${toLower(property)}")`, 'g'),
							createRawAnchor({name: property, type: 'Property'}) + "$1");
						entries.push({
							name: name + '.' + property,
							id: marked.meta.id,
							type: 'Property',
							anchor: toLower(property) 
						});
					}

					html = <Component name={name} content={contentWithAnchors}/>;
					entries.push({
						name: name,
						id: marked.meta.id,
						type: 'Component',
						anchor: ''
					});
				}
				else if (includes(enums, marked.meta.title)) {
					const name = marked.meta.title;
					let contentWithAnchors = content;

					// Detect methods & propertise
					const sectionRegExp = /^#### `(.*)`/gm;
					let match;
					while ((match = sectionRegExp.exec(markdown)) !== null) {
						const enumValue = match[1];
						const anchor = `-${toLower(enumValue)}`;
						contentWithAnchors = contentWithAnchors.replace(
							new RegExp(`(<h4 id="${anchor}")`, 'g'),
							createRawAnchor({name: enumValue, type: "Value"}) + "$1");
						entries.push({
							name: `${name}.${enumValue}`,
							id: marked.meta.id,
							type: "Value",
							anchor: anchor
						});
					}

					html = <Class name={name} content={contentWithAnchors}/>;
					entries.push({
						name: name,
						id: marked.meta.id,
						type: 'Enum',
						anchor: ''
					});
				}
				else {
					const name = marked.meta.title;
					let contentWithAnchors = content;

					// Detect methods & propertise
					const sectionRegExp = /^### (.*)/gm;
					let match;
					while ((match = sectionRegExp.exec(markdown)) !== null) {
						const property = match[1];
						if (property === "Keys and Offsets" || property.indexOf('Start/End') >= 0 || property.indexOf('Representing') >= 0) {
							continue;
						}
						let propertyName = property;
						let type = 'Property';
						if (includes(property, '(') || includes(content, property + '(')) {
							type = 'Method';
							propertyName = propertyName.replace(/\(.*/, '');
						}
						if (name === "Data Conversion") {
							type = 'Function';
						}
						const anchor = toLower(propertyName);
						contentWithAnchors = contentWithAnchors.replace(
							new RegExp(`(<h3 id="${anchor}")`, 'g'),
							createRawAnchor({name: propertyName, type}) + "$1");
						entries.push({
							name: name === "Data Conversion" ? propertyName : `${name}.${propertyName}`,
							id: marked.meta.id,
							type,
							anchor: anchor
						});
					}

					html = <Class name={name} content={contentWithAnchors}/>;
					if (!includes(ignoreEntries, name)) {
						entries.push({
							name: name,
							id: marked.meta.id,
							type: includes(modules, name) ? 'Module' : 'Class',
							anchor: ''
						});
					}
				}
			}
			else {
				const name = `${marked.meta.category}: ${marked.meta.title}`;
				let contentWithAnchors = content;

				// Detect sections
				const sectionRegExp = /^## (.*)/gm;
				let match;
				while ((match = sectionRegExp.exec(markdown)) !== null) {
					const section = match[1];
					contentWithAnchors = contentWithAnchors.replace(
						new RegExp(`(<h2 id="${kebabCase(section)}")`, 'g'),
						createRawAnchor({name: section, type: 'Section'}) + "$1");
				}

				html = <Guide title={name} content={contentWithAnchors} />;
				entries.push({
					name: name,
					id: marked.meta.id,
					type: 'Guide',
					anchor: ''
				});
			}
			return {
				id: marked.meta.id,
				title: marked.meta.title,
				html,
				category: marked.meta.category, // For grouping in index
				next: marked.meta.next // For sorting later
			};
		}));
		return { pages, entries };
	})()
});
