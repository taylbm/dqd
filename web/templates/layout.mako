###
## layout.mako - this is the main layout for the hci, it's designed to be inherited
###



###
### body
###

<!doctype html>
<html lang="en">

    <head>
        <title>${self.attr.page_title}</title>
 	<link rel="shortcut icon" href="static/dqd.ico" type="image/x-icon" /> 
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <%include file="jquery.mako" args="all=True" />
        <%block name="extra_header_markup"/>

    </head>

    <body>	
        ${next.body()}
    </body>

</html>

