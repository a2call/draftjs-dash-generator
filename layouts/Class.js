import React from 'react';
import Page from './Page';

export default ({name, content}) => {
	return (
		<Page title={name}>
			<h1>{name}</h1>
			<div dangerouslySetInnerHTML={{__html: content}}>
			</div>
		</Page>
	);
};



