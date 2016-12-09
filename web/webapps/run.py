import os
import sys

HERE = os.path.split(os.path.abspath(__file__))[0]     # looks awful, but gets the parent dir
PARENT = os.path.split(HERE)[0]
sys.path.append(PARENT+"/deps")
sys.path.append(PARENT+"/webapps")
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
    '/dqdwalk','handlers.DQDwalk',
    '/aspwalk','handlers.ASPwalk',
    '/feedback','handlers.Feedback'
)

application = web.application(URLS, globals())#.wsgifunc()
if __name__ == "__main__":
    application.run()
