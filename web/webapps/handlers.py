import json
from templating import LOOKUP
import sys
import os
import web

from subprocess import Popen, call, PIPE
from commands import getoutput
from cgi import parse_qs
import datetime
import StringIO
from gzip import GzipFile
import threading
import random
import shutil

import numpy as np
import time
import bisect
import re

ASP_dir = '/import/orpg/ASP_Prod/'
ICAO_check = ['K','P']
tmp_dir = '/tmp/dqd_symlinks'
redundantCheck = False

MonthToNumber = {
    'Jan':      1,
    'Feb':      2,
    'Mar':      3,
    'Apr':      4,
    'May':      5,
    'Jun':      6,
    'Jul':      7,
    'Aug':      8,
    'Sep':      9,
    'Oct':      10,
    'Nov':      11,
    'Dec':      12
}


##                          
# Utility fxn defs
##
def stripList(list1):
        return str(list1).replace('[','').replace(']','').replace('\'','').strip().strip('\\n')
def hasNumbers(inputString):
        return any(char.isdigit() for char in inputString)
def getPaths(month,year):
    return ['/'+str(year + (-1 if month - x <= 0 else 0)) + '/' + "%02d" % (((month - x + 11) % 12) + 1) + '/' for x in xrange(6)]
def getYears():
    years = os.listdir(ASP_dir + 'KABR')
    years.sort(reverse=True)
    return years
def stripNaN(val):
    return None if np.isnan(val) else val
##
# Pack data in a single-line Server-Sent Event (SSE) format
##

def sse_pack_single(d):
    buffer = ''
    for k in ['retry','id','data','event']:
        if k in d.keys():
            buffer += '%s: %s\n' % (k, d[k])
    return buffer + '\n'
##
# Packs data in a multi-line Server-Sent Event (SSE) format
##

def sse_pack(data,attr):
    buffer = 'retry: %s\n\n' % attr['retry']
    for d in xrange(4):
        if d in data.keys():
            buffer += 'id: %s\n' % str(attr['id'+str(d)])
            buffer += 'event: %s\n' % data[d]
            buffer += 'data: %s\n\n' % data['data'+str(d)]
    return buffer

##
# Packs server response in a compressed format 
##

def gzip_response(resp):
    web.webapi.header('Content-Encoding','gzip')
    zbuf = StringIO.StringIO()
    zfile = GzipFile(mode='wb',fileobj=zbuf,compresslevel=9)
    zfile.write(resp)
    zfile.close()
    data = zbuf.getvalue()
    web.webapi.header('Content-Length',str(len(data)))
    web.webapi.header('Vary','Accept-Encoding',unique=True)
    return data

def ICAO():
    ICAO_list_full = os.listdir(ASP_dir)
    ICAO_list = [i for i in ICAO_list_full if i[0] in ICAO_check]       
    ICAO_list.sort() 
    return ICAO_list

def parse_date_time(zdr_date_time_str):
    item_time_comps = zdr_date_time_str.replace('[', '').replace(']', '').replace(',', ' ').replace(':', ' ').split(' ')
    year = int(item_time_comps[2])

    if year < 50:
        year += 2000
    else:
        year += 1900

    month = MonthToNumber[item_time_comps[0]]
    day = int(item_time_comps[1])
    hour = int(item_time_comps[3])
    minute = int(item_time_comps[4])
    second = int(item_time_comps[5])

    return datetime.datetime(year, month, day, hour, minute, second)


def parse_zdr_stats(zdr_split):
    global redundantCheck
    if len(zdr_split) != 2:
        return None


    if '(Bragg)' in zdr_split[1]:
        if 'Unavailable' in zdr_split[1] or 'Last detection' in zdr_split[1]:
            return None
        if 'RDA' in zdr_split[1]:
            redundant = re.findall(r'RDA:(.*?)]',zdr_split[1])[0]
            take_from = zdr_split[1][zdr_split[1].index(']') + 2:].rstrip('\0')
        else:
            redundant = 0
            take_from = zdr_split[1][zdr_split[1].index(':') + 1:].rstrip('\0')
        stat_date_time = parse_date_time(zdr_split[0])
        (twelve_vol_bias, twelve_vol_count, cur_vol_bias, cur_vol_count, cur_vol_iqr, cur_vol_90, cur_vol_vcp) = take_from.split('/')

        if float(twelve_vol_bias) > -99:
            return {
                'type': 'bragg',
                'time': time.mktime(stat_date_time.timetuple()),
                'volumeBias':   {
                    'last12':       float(twelve_vol_bias),
                    'current':      float(cur_vol_bias)
                },
                'redundant':redundant
            }
        else:
            return None
    else:
        take_from = zdr_split[1][zdr_split[1].index(':') + 1:].rstrip('\0')
        (rain_raw, dry_snow_raw) = take_from.split('DS')

        stat_date_time = parse_date_time(zdr_split[0])

        #
        # still have csv info to split here
        rain_raw = rain_raw.split(',')

        #
        # now split the fields that are / delimited
        #

        (zdr_error_rain, first_zdr_refl_cat) = rain_raw[0].split('/')
        (last_zdr_refl_cat, total_num_rain_bins, first_std_dev) = rain_raw[5].split('/')
        (zdr_error_snow, total_num_snow_bins, stddev_snow) = dry_snow_raw.split('/')
        if float(zdr_error_rain) > -99:
            return {
                'time': time.mktime(stat_date_time.timetuple()),
                'rain': {
                    'zdrError':         float(zdr_error_rain)
                },
                'snow':    {
                    'zdrError':         float(zdr_error_snow)
                }
            }
        elif float(zdr_error_snow) > -99:
            return {
                'time': time.mktime(stat_date_time.timetuple()),
                'rain': {
                    'zdrError':         float(zdr_error_rain)
                },
                'snow':    {
                    'zdrError':         float(zdr_error_snow)
                }
            }
        else:
            return None


def dqdwalk(rand_dirname):
    zdr_stats_raw = []
    zdr_stats_split = []
    dump = Popen(['standalone_dsp -w -D ' + rand_dirname + ' -g "ZDR Stats" -t'],shell = True, stdout = PIPE, stderr = PIPE)
    print('--> retrieving output')
    out = dump.communicate()
    shutil.rmtree(rand_dirname)
    print('--> parsing ASP data')
    zdr_stats_raw = out[0].split('\n')
    raw_split = [parse_zdr_stats(zdr_stat.split('>>')) for zdr_stat in zdr_stats_raw]
    zdr_stats_split += [zdr_stat for zdr_stat in raw_split if zdr_stat is not None]

    print('--> Finished decoding, now computing (this may take a couple of minutes)')
    zdr_processed = zdr_stats_split
    zdr_processed = sorted((z for z in zdr_processed if z is not None), key = lambda x: x['time'])
    stats_found = len(zdr_processed)
    print('--> Found %s zdr stats' % stats_found)


    times = [datetime.date.fromtimestamp(z['time']) for z in zdr_processed]
    i = 0
    summary = []
    daily = []
    while i < len(zdr_processed):
        el = zdr_processed[i]
        now = times[i]
        day_7 = now + datetime.timedelta(days = 7)
        idx_7 = bisect.bisect(times[i:], day_7)
        idx_today = bisect.bisect(times[i:], now)
        els = zdr_processed[i:i + idx_7]
        day = zdr_processed[i:i+ idx_today]

        #
        # we'll catch IndexErrors, although it's POSSIBLE they are raised for 
        # something other than a 0-length array, it's not likely, so I'm willing
        # to assume the risk
        #

        try:
            median_rain = np.median([z['rain']['zdrError'] for z in els if 'rain' in z and z['rain']['zdrError'] > -99.0])
        except IndexError:
            median_rain = -99.0
        try:
            median_rain_daily = np.median([d['rain']['zdrError'] for d in day if 'rain' in d and d['rain']['zdrError'] > -99.0])
        except IndexError:
            median_rain_daily = -99.0
        try:
            median_snow = np.median([z['snow']['zdrError'] for z in els if 'snow' in z and z['snow']['zdrError'] > -99.0])
        except IndexError:
            median_snow = -99.0
        try:
            median_snow_daily = np.median([d['snow']['zdrError'] for d in day if 'snow' in d and d['snow']['zdrError'] > -99.0])
        except IndexError:
            median_snow_daily = -99.0
        try:
            median_bragg = np.median([z['volumeBias']['last12'] for z in els if 'type' in z and z['volumeBias']['last12'] > -99.0])
        except IndexError:
            median_bragg = -99.0
        try:
            median_bragg_daily = np.median([d['volumeBias']['last12'] for d in day if 'type' in d and d['volumeBias']['last12'] > -99.0])
        except IndexError:
            median_bragg_daily = -99.0
        redundant_list = [int(d['redundant']) for d in day if 'redundant' in d]
        if redundant_list:
            mode_redundant = int(np.argmax(np.bincount(np.array(redundant_list))))
        else:
            mode_redundant = 1

        summary.append({'time': time.mktime(now.timetuple()), 
			'medianRain': stripNaN(median_rain), 
			'medianSnow': stripNaN(median_snow), 
			'medianBragg': stripNaN(median_bragg),
			'modeRedundant':mode_redundant
	})
        daily.append({'time': time.mktime(now.timetuple()),
		      'medianRain': stripNaN(median_rain_daily),
		      'medianSnow': stripNaN(median_snow_daily),	
		      'medianBragg': stripNaN(median_bragg_daily),
                      'modeRedundant':mode_redundant
        })
        i += idx_today
    redundantCheck = [x['modeRedundant'] for x in summary]
    redundantBool = 1 in redundantCheck and 2 in redundantCheck 
    out_dict = {
		'redundant':redundantBool,
		'SummaryData':summary,
		'DailyData':daily,
		'statsFound':stats_found
    }
    	
    #out_string = 'var redundant = "%s";var SummaryData = %s;var DailyData = %s;' % (str(redundantCheck == []),summary,daily)
    return out_dict



##
# Renders dynamic DQD Dashboard
##
class IndexView(object):
    def GET(self):
	return LOOKUP.Index(**{'ICAO_list':ICAO(),'Years':getYears(),'M2N':MonthToNumber})

##
# Spawns subtasks
##

class Button(object):
    def GET(self):
	selected_button = web.input(id=None)
	if selected_button.id not in getoutput('ps -A'):
	    return Popen(selected_button.id).wait() # //TODO: using wait() can be dangerous, find another way to implement this 
##
# Serves a static file of the DQD Dashboard
##
class DQD(object):
    def GET(self):
        #redirect to static file
	raise web.seeother('/static/index.html')

##
# Serves up new ZDR Data
##

class DQDwalk(object):
    def GET(self):
	date = web.input(d=None)
	date_split = date.d.split('-')	
	dir_list = getPaths(int(date_split[0]),int(date_split[1]))
	final_list = []
	if date_split[2] in ICAO():
	    rand_dirname = "/tmp/dqd%03d/" % (random.random()*100)
	    os.mkdir(rand_dirname)
	    for d in dir_list:
	        subdir_list = os.listdir(ASP_dir + date_split[2] +  d)
		for s in subdir_list:
		    os.symlink(ASP_dir + date_split[2] + d + s, rand_dirname + s)
	    ret = dqdwalk(rand_dirname)
	else:	
	    ret = 'Invalid ICAO'
	return gzip_response(json.dumps(ret))
	

