import React from 'react';
import Page from './Page';

export default ({name, content}) => {
	return (
		<Page title={name}>
			<div className='skinnyWrap'>
				<h1>{name}</h1>
				<div dangerouslySetInnerHTML={{__html: content}}>
				</div>
			</div>
		</Page>
	);
};


