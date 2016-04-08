import glob from 'glob';
import { isEmpty, map, forEach, startsWith, find, indexOf } from 'lodash';
import jsdom from 'jsdom';
import fs from 'fs';
import { Promise } from 'es6-promise';
import path from 'path';
import chalk from 'chalk';
import sqlite3 from 'sqlite3';

function isIgnored(file, ignore) {
	return file.match(ignore);
}

function checkInternalLink(link, dir, source, pages, ignore, errors, warnings) {
	const [file, anchor] = link.split("#");
	const targetFile = path.resolve(dir, file);
	const targetPage = find(pages, { file: targetFile });
	if (!targetPage && !isIgnored(link, ignore)) {
		errors.push({file: source, message: "Missing page: " + link});
	}
	if (anchor) {
		if (indexOf(targetPage.ids, anchor) < 0 && !isIgnored(link, ignore)) {
			errors.push({file: source, message: "Missing anchor: " + link});
		}
	}
}

function check(docset, { ignore } = {}) {
	// /Contents/Resources/docSet.dsidx'
	return Promise.all(
		map(glob.sync(docset + '/Contents/Resources/Documents/**/*.html'), (fileName) => {
			return new Promise((resolve, reject) => {
				jsdom.env({
					html: fs.readFileSync(fileName, 'utf-8'),
					done: (errors, window) => {
						if (errors) { reject(errors); return; }
						resolve({
							file: path.resolve(fileName),
							links: [
								...map(window.document.querySelectorAll('a[href]'), a => 
									a.attributes.href.value),
								...map(window.document.querySelectorAll('img[src]'), "src")
							],
							ids: map(window.document.querySelectorAll('*[id]'), "id")
						});
					}
				});
			});
		}))
		.then(pages => {
			const errors = [];
			const warnings = [];
			forEach(pages, page => {
				const pageFilePath = path.relative(docset, page.file);
				forEach(page.links, link => {
					if (startsWith(link, "#")) {
						// Anchor
						if (indexOf(page.ids, link.substr(1)) < 0 && !isIgnored(link, ignore)) {
							errors.push({file: pageFilePath, message: "Missing anchor: " + link});
						}
					}
					else if (startsWith(link, "http") && !isIgnored(link, ignore)) {
						warnings.push({file: pageFilePath, message: "External link: " + link});
					}
					else {
						checkInternalLink(link, path.dirname(page.file), pageFilePath, pages, ignore, errors, warnings);
					}
				});
			});
			
			return new Promise((resolve, reject) => {
				const db = new sqlite3.Database(docset + '/Contents/Resources/docSet.dsidx');
				db.all('SELECT path FROM searchIndex', (err, rows) => {
					if (err) { reject(err); return; }
					forEach(rows, row => {
						checkInternalLink(row.path, path.resolve(docset + '/Contents/Resources/Documents'), 'docSet.dsidx', pages, ignore, errors, warnings);
					});
					resolve({ errors, warnings });
				});
			});
		});
}

check('./build/Draft.js.docset', { ignore: /advanced-undo-redo/ })
	.then(({errors, warnings}) => {
		forEach(warnings, warning => {
			console.log(chalk.yellow('Warning: ') + path.basename(warning.file) + ": " + warning.message);
		});
		forEach(errors, error => {
			console.log(chalk.red('Error: ') + path.basename(error.file) + ": " + error.message);
		});
		if (!isEmpty(errors)) {
			process.exit(1);
		}
	})
	.catch(console.log);
