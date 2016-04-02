import React from 'react';

export default ({title, children}) => {
	return (
		<html>
			<head>
				<title>{title}</title>
				<link rel='stylesheet' type='text/css' href='style.css'/>
			</head>
			<body>
				{children}
			</body>
		</html>
	);
};



