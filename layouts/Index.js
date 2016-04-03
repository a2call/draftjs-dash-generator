import React from 'react';
import Page from './Page';
import { groupBy, map } from 'lodash';

export default ({title, pages}) => {
	const pagesPerCategory = groupBy(pages, 'category');
	return (
		<Page title={title}>
			<div className='hero'>
				<div className='text'>
					<strong>Draft.js</strong>
				</div>
				<div className='minitext'>Documentation</div>
			</div>
			{map(pagesPerCategory, (pages, category) => 
				<section key={category}>
					<h2>{category}</h2>
					<ul>
						{map(pages, (page) => 
							<li key={page.id}><a href={page.id + '.html'}>{page.title}</a></li>
						)}
					</ul>
				</section>
			)}
		</Page>
	);
};
