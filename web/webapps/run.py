import os
import sys

HERE = os.path.split(os.path.abspath(__file__))[0]     # looks awful, but gets the parent dir
PARENT = os.path.split(HERE)[0]
sys.path.append(PARENT+"/deps")
MODULE_CACHE_DIR = '/tmp/DQD/mako_modules'      

import web

from templating import Configure

Configure(
    [os.path.join(PARENT, 'templates')], 
    module_cache_dir = MODULE_CACHE_DIR
)

from handlers import *
SESSION_DIR = '/tmp/DQD'            
URLS = (
    '/','handlers.IndexView',           # you can list other handlers here
    '/button','handlers.Button',
    '/dqdwalk','handlers.DQDwalk'
)

if __name__ == '__main__':
    application = web.application(URLS, globals()).wsgifunc()

