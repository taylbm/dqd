###
### page.mako - this is a layout for pages
###

###
### see if we should include a full page layout
###

<%
layout = self.attr.layout_name
%>

% try:
    % if self.attr.inherit_layout is True:
        <%inherit file="layout.mako" />
    % endif
% except:
    ### just swallow this, we only care if it exists
% endtry
 

			

###
### content
###

<div data-role="page" id="${self.attr.page_id}" class="${self.attr.page_classes}">

${next.body()}

</div>


