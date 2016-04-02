import { forEach, isString } from 'lodash';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fsExtra from 'fs-extra';
import fs from 'fs';
import mustache from 'mustache';
import sqlite3 from 'sqlite3';
import path from 'path';
import tar from 'tar';
import fstream from 'fstream';
import zlib from 'zlib';
import strftime from 'strftime';

import Index from './layouts/Index';
import Feed from './layouts/Feed';

export function build({name, id, outputDir = path.join(__dirname, 'build'), version, icon, icon2x, style, feedBaseURL, author, documentation}) {
	const docsetDir = path.join(outputDir, name + '.docset');
	const feedDir = path.join(outputDir, 'feed');
	const userContributionDir = path.join(outputDir, 'user-contribution');

	// Version
	const timestamp = new Date();
	const docsetVersion = `${version || strftime('%F', timestamp)}/${strftime('%F_%H:%M:%S', timestamp)}`;

	fsExtra.removeSync(docsetDir);
	fsExtra.removeSync(feedDir);
	fsExtra.removeSync(userContributionDir);

	// Copy icon
	fsExtra.copySync(icon2x, docsetDir + '/icon.png');
	fsExtra.copySync(style, docsetDir + '/Contents/Resources/Documents/style.css');

	// Generate Info.plist
	fsExtra.outputFileSync(
		docsetDir + '/Contents/Info.plist',
		mustache.render(fs.readFileSync(path.join(__dirname, 'layouts/Info.plist.mustache'), 'utf-8'), {
			id: id,
			name: name,
			family: id
		}));

	// Create the database
	fsExtra.ensureDirSync(docsetDir + '/Contents/Resources');
	const db = new sqlite3.Database(docsetDir + '/Contents/Resources/docSet.dsidx');
	db.run(
		'CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT)',
		function () {
			const entries = documentation.entries;
			const pages = documentation.pages;

			// Generate pages
			forEach(pages, (page) => {
				fsExtra.outputFileSync(
					path.join(docsetDir, 'Contents/Resources/Documents/' + page.id + '.html'), 
					isString(page.html) ? page.html : ReactDOMServer.renderToStaticMarkup(page.html));
			});

			// Insert entries into database
			forEach(entries, (entry) => {
				db.run('INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?)', 
					entry.name, entry.type, entry.id + '.html#' + entry.anchor);
			});

			db.close();
		
			// Generate index.html
			fsExtra.outputFileSync(
				path.join(docsetDir, 'Contents/Resources/Documents/index.html'),
				ReactDOMServer.renderToStaticMarkup(
					<Index title={name} pages={pages} />
				)
			);
				
			// Render the feed
			const feed = path.join(feedDir, name + '.xml');
			fsExtra.outputFileSync(
				feed,
				mustache.render(fs.readFileSync('layouts/feed.xml.mustache', 'utf-8'), {
					version: docsetVersion,
					url: feedBaseURL + '/' + name + '.tgz'
				}));
			fsExtra.outputFileSync(
				path.join(feedDir, name + '.html'),
				ReactDOMServer.renderToStaticMarkup(
					<Feed 
						feed={'dash-feed://' + encodeURIComponent(feedBaseURL + '/' + name + '.xml')}
						name={name} />
				)
			);
			
			// Tar everything up into a tarball
			fstream.Reader({ path: docsetDir, type: 'Directory'})
				.pipe(tar.Pack({noProprietary: true}))
				.pipe(zlib.createGzip())
				.pipe(fs.createWriteStream(feedDir + '/' + name + '.tgz'));

			// Generate a Dash user contribution dir
			fsExtra.outputFileSync(
				userContributionDir + '/docset.json',
				mustache.render(fs.readFileSync('layouts/docset.json.mustache', 'utf-8'), {
					name: name,
					author: author.name,
					authorLink: author.url,
					version: docsetVersion
				}));
			fsExtra.copySync(icon2x, userContributionDir + '/icon@2x.png');
			fsExtra.copySync(icon, userContributionDir + '/icon.png');
			fstream.Reader({ path: docsetDir, type: 'Directory'})
				.pipe(tar.Pack({noProprietary: true}))
				.pipe(zlib.createGzip())
				.pipe(fs.createWriteStream(userContributionDir + '/' + name + '.tgz'));
		});
}
