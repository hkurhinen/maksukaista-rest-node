Maksukaista Node Rest Library
=============================


See documentation at https://www.paybyway.com/docs/web_payments/


Installation
------------

    npm install maksukaista-rest

Example
-------

In the package you'll also find an example page and an example server from which you see the necessary functionality for handling the payment requests and how to use the library. The example server requires express-package which can be installed by npm

	npm install express

The example server is capable for serving the page with or without SSL. Although it is recommended to use HTTPS. To enable HTTPS you need specify the path for certificate files. You can change these in example/server/server.js file.
