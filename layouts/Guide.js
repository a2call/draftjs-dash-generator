import React from 'react';
import Page from './Page';

export default ({title, content}) => {
	return (
		<Page title={title}>
			<h1>{title}</h1>
			<div dangerouslySetInnerHTML={{__html: content}}>
			</div>
		</Page>
	);
};

