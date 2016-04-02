import React from 'react';
import ReactDOMServer from 'react-dom/server';

const Anchor = ({name, type}) =>
	<a 
		name={`//apple_ref/cpp/${type}/${encodeURIComponent(name.replace(/^\w+\./, ''))}`} 
		className="dashAnchor"/>;

export function createRawAnchor(props) {
	return ReactDOMServer.renderToStaticMarkup(<Anchor {...props}/>);
}

export default Anchor;
