from web.contrib.template import render_mako

LOOKUP = None

def Configure(template_dirs, module_cache_dir = '/tmp/'):
    globals()['LOOKUP'] = render_mako(
        directories = template_dirs, 
        module_directory = module_cache_dir,
        output_encoding = 'utf-8',
        filesystem_checks = True
    )
            
