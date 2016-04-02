import React from 'react';

export default ({feed, name}) => {
	return (
		<html>
			<head>
				<meta httpEquiv='refresh' content={`0; url=${feed}`}/>
			</head>
			<body>
				Installing {name} docset ...
			</body>
		</html>
	);
};

