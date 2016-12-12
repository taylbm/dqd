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
from email.MIMEText import MIMEText
from email.MIMEMultipart import MIMEMultipart
import smtplib


sender = 'dqd@lnxrpg5'
recipient = 'Lindsey.M.Richardson@noaa.gov'

HERE = os.path.split(os.path.abspath(__file__))[0]
PARENT = os.path.split(HERE)[0]
ROOT = os.path.split(PARENT)[0]
os.environ["PATH"] += os.pathsep + os.path.join(os.path.split(PARENT)[0],"bin") # sets path for apache

config_file = os.path.join(PARENT,'dqd.cfg') 

f = open(config_file, 'r')

try:
    config = json.load(f)
finally:
    f.close()

ASP_dir = config["ASP_dir"]
ICAO_list_full = os.listdir(ASP_dir)
ICAO_list = [ i for i in ICAO_list_full if i[0] in config["ICAO_allowable"] ]
ICAO_list.sort()

def stripList(list1):
    return str(list1).replace('[', '').replace(']', '').replace("'", '').strip().strip('\\n')

def hasNumbers(inputString):
    return any((char.isdigit() for char in inputString))

def getPaths(month, year):
    return [ '/' + str(year + (-1 if month - x <= 0 else 0)) + '/' + '%02d' % ((month - x + 11) % 12 + 1) + '/' for x in xrange(7) ]

def getYears():
    years = os.listdir(ASP_dir + 'KABR')
    years.sort(reverse=True)
    return years

def stripNaN(val):
    if np.isnan(val):
        return None
    return val

def getFileNames(date):
    date_split = date.d.split('_')
    ICAO = date_split[0]
    start_date = date_split[1]
    end_date = date_split[2]
    start_date_split = start_date.split('-')
    end_date_split = end_date.split('-')
    start_year = start_date_split[0]
    start_month = int(start_date_split[1])
    start_day = int(start_date_split[2])
    end_year = end_date_split[0]
    end_month = int(end_date_split[1])
    end_day = int(end_date_split[2])
    start_month_list = os.listdir( os.path.join(ASP_dir, ICAO, start_year, '%02d' % start_month) )
    if start_month != end_month:
	end_month_list = os.listdir(os.path.join(ASP_dir, ICAO, end_year, '%02d' % end_month))
        start_month_fnames = [ fn for fn in start_month_list if start_day <= int(fn.split('_')[2]) ]
	start_month_first = [ fn for fn in start_month_list if start_day - 1 == int(fn.split('_')[2])  and int(fn.split('_')[3]) == 22 ]
        end_month_fnames = [ fn for fn in os.listdir(os.path.join(ASP_dir, ICAO, end_year, '%02d' % end_month)) if end_day >= int(fn.split('_')[2]) ]
        end_month_fnames.sort()
	fnames = start_month_first + start_month_fnames + end_month_fnames
    else:
	month_first = [fn for fn in start_month_list if start_day - 1 == int(fn.split('_')[2]) and int(fn.split('_')[3]) == 22]
        month_list = [ fn for fn in start_month_list if end_day >= int(fn.split('_')[2]) >= start_day ]
	fnames = month_list + month_first
    fnames.sort()
    return fnames

def sse_pack_single(d):
    buffer = ''
    for k in ['retry',
    'id',
     'data',
     'event']:
        if k in d.keys():
            buffer += '%s: %s\n' % (k, d[k])

    return buffer + '\n'

def sse_pack(data, attr):
    buffer = 'retry: %s\n\n' % attr['retry']
    for d in xrange(4):
        if d in data.keys():
            buffer += 'id: %s\n' % str(attr[('id' + str(d))])
            buffer += 'event: %s\n' % data[d]
            buffer += 'data: %s\n\n' % data[('data' + str(d))]

    return buffer

def gzip_response(resp):
    web.webapi.header('Content-Encoding', 'gzip')
    zbuf = StringIO.StringIO()
    zfile = GzipFile(mode='wb', fileobj=zbuf, compresslevel=9)
    zfile.write(resp)
    zfile.close()
    data = zbuf.getvalue()
    web.webapi.header('Content-Length', str(len(data)))
    web.webapi.header('Vary', 'Accept-Encoding', unique=True)
    return data

def parse_date_time(zdr_date_time_str):
    item_time_comps = zdr_date_time_str.replace('[', '').replace(']', '').replace(',', ' ').replace(':', ' ').split(' ')
    year = int(item_time_comps[2])
    if year < 50:
        year += 2000
    else:
        year += 1900
    month = config["MonthToNumber"][item_time_comps[0]]
    day = int(item_time_comps[1])
    hour = int(item_time_comps[3])
    minute = int(item_time_comps[4])
    second = int(item_time_comps[5])
    return datetime.datetime(year, month, day, hour, minute, second)

def parse_zdr_stats(zdr_split):
    if len(zdr_split) != 2:
        return None
    if 'RDA' in zdr_split[1]:
        redundant = re.findall('RDA:(.*?)]', zdr_split[1])[0]
        take_from = zdr_split[1][(zdr_split[1].index(']') + 2):].rstrip('\0')
    else:
        take_from = zdr_split[1][(zdr_split[1].index(':') + 1):].rstrip('\0')
        redundant = 1
    stat_date_time = parse_date_time(zdr_split[0])

    if '(Bragg)' in zdr_split[1]:
        if 'Unavailable' in zdr_split[1] or 'Last detection' in zdr_split[1]:
            return {'redundant':redundant,'time':time.mktime(stat_date_time.timetuple())}
        else:
            stat_date_time = parse_date_time(zdr_split[0])
            (twelve_vol_bias, twelve_vol_count, cur_vol_bias, cur_vol_count, cur_vol_iqr, cur_vol_90, cur_vol_vcp,) = take_from.split('/')
            if float(twelve_vol_bias) > -99:
                return {
		         'type': 'bragg',
                         'time': time.mktime(stat_date_time.timetuple()),
                 	 'volumeBias': {
				'last12': float(twelve_vol_bias),
                                'current': float(cur_vol_bias)
			 },
                 	 'redundant': redundant
		}
	    else: 
                return None
    else:
        #take_from = zdr_split[1][(zdr_split[1].index(':') + 1):].rstrip('\0')
        (rain_raw, dry_snow_raw,) = take_from.split('DS')
        rain_raw = rain_raw.split(',')
        (zdr_error_rain, first_zdr_refl_cat,) = rain_raw[0].split('/')
        (last_zdr_refl_cat, total_num_rain_bins, first_std_dev,) = rain_raw[5].split('/')
        (zdr_error_snow, total_num_snow_bins, stddev_snow,) = dry_snow_raw.split('/')
        if float(zdr_error_rain) > -99:
            return {'time': time.mktime(stat_date_time.timetuple()),
             'rain': {'zdrError': float(zdr_error_rain)},
             'snow': {'zdrError': float(zdr_error_snow)}}
        else:
            if float(zdr_error_snow) > -99:
                return {'time': time.mktime(stat_date_time.timetuple()),
                 'rain': {'zdrError': float(zdr_error_rain)},
                 'snow': {'zdrError': float(zdr_error_snow)}}
            return None

def dqdwalk(rand_dirname):
    zdr_stats_raw = []
    zdr_stats_split = []
    dump = Popen([ROOT + '/bin/standalone_dsp -w -D ' + rand_dirname + ' -g "ZDR Stats"'], shell=True, stdout=PIPE, stderr=PIPE)
    print '--> retrieving output'
    out = dump.communicate()
    shutil.rmtree(rand_dirname)
    print '--> parsing ASP data'
    zdr_stats_raw = out[0].split('\n')
    raw_split = [ parse_zdr_stats(zdr_stat.split('>>')) for zdr_stat in zdr_stats_raw ]
    zdr_stats_split += [ zdr_stat for zdr_stat in raw_split if zdr_stat is not None ]
    print '--> Finished decoding, now computing (this may take a couple of minutes)'
    zdr_processed = zdr_stats_split
    zdr_processed = sorted((z for z in zdr_processed if z is not None), key=lambda x: x['time'])
    stats_found = len(zdr_processed)
    print '--> Found %s zdr stats' % stats_found
    times = [ datetime.date.fromtimestamp(z['time']) for z in zdr_processed ]
    i = 0
    summary = []
    daily = []
    while i < len(zdr_processed):	
        el = zdr_processed[i]
        now = times[i]
        day_7 = now + datetime.timedelta(days=7)
        idx_7 = bisect.bisect(times[i:], day_7)
        idx_today = bisect.bisect(times[i:], now)
        els = zdr_processed[i:(i + idx_7)]
        day = zdr_processed[i:(i + idx_today)]
        try:
            rain = [z['rain']['zdrError'] for z in els if 'rain' in z and z['rain']['zdrError'] > -99.0]
            median_rain = float(np.round(np.median(rain),decimals=2)) if rain else np.nan
        except IndexError:
            median_rain = -99.0
        try:
            rain_daily = [d['rain']['zdrError'] for d in day if 'rain' in d and d['rain']['zdrError'] > -99.0]
            median_rain_daily = float(np.round(np.median(rain_daily),decimals=2)) if rain_daily else np.nan
        except IndexError:
            median_rain_daily = -99.0
        try:
            snow = [z['snow']['zdrError'] for z in els if 'snow' in z and z['snow']['zdrError'] > -99.0]
            median_snow = float(np.round(np.median(snow),decimals=2)) if snow else np.nan
        except IndexError:
            median_snow = -99.0
        try:
            snow_daily = [d['snow']['zdrError'] for d in day if 'snow' in d and d['snow']['zdrError'] > -99.0]
            median_snow_daily = float(np.round(np.median(snow_daily),decimals=2)) if snow_daily else np.nan
        except IndexError:
            median_snow_daily = -99.0
        try:
            bragg = [z['volumeBias']['last12'] for z in els if 'type' in z and z['volumeBias']['last12'] > -99.0]
            median_bragg = float(np.round(np.median(bragg),decimals=2)) if bragg else np.nan
        except IndexError:
            median_bragg = -99.0
        try:
            bragg_daily = [d['volumeBias']['last12'] for d in day if 'type' in d and d['volumeBias']['last12'] > -99.0]
            median_bragg_daily = float(np.round(np.median(bragg_daily),decimals=2)) if bragg_daily else np.nan
        except IndexError:
            median_bragg_daily = -99.0        
	redundant_daily = [int(d['redundant']) for d in day if 'redundant' in d]
	redundant_summary = [int(z['redundant']) for z in els if 'redundant' in z]
	daily_mode = int(np.argmax(np.bincount(np.array(redundant_daily)))) if redundant_daily else 1
        summary_mode = int(np.argmax(np.bincount(np.array(redundant_summary)))) if redundant_summary else 1
	
	summary.append({'time': time.mktime(now.timetuple()),
         'medianRain': stripNaN(median_rain),
         'medianSnow': stripNaN(median_snow),
         'medianBragg': stripNaN(median_bragg),
	 'redundantMode':summary_mode
        })
        daily.append({'time': time.mktime(now.timetuple()),
         'medianRain': stripNaN(median_rain_daily),
         'medianSnow': stripNaN(median_snow_daily),
         'medianBragg': stripNaN(median_bragg_daily),
	 'redundantMode':daily_mode
        })
        i += idx_today
    redundant = [r['redundantMode'] for r in summary]
    redundantBool = 2 in redundant
    out_dict = {
		'redundantBool': redundantBool,
     		'SummaryData': summary,
     		'DailyData': daily,
     		'statsFound': stats_found
    }
    
    return out_dict

class IndexView(object):
    def GET(self):
        script_name = web.ctx.env.get("SCRIPT_NAME")
        url_prefix = script_name if script_name == '' else script_name + '/' 
        return LOOKUP.Index(**{'ICAO_list': ICAO_list,
         'Years': getYears(),
         'M2N': config["MonthToNumber"],
         'Prefix': url_prefix})


class Button(object):
    def GET(self):
        selected_button = web.input(id=None)
        if selected_button.id not in getoutput('ps -A'):
            return Popen(selected_button.id).wait()

class ASPwalk(object):
    def GET(self):
        date = web.input(d=None)
        fnames = getFileNames(date)
        rand_dirname = config["tmp_dir"] + 'asp%03d/' % (random.random() * 100)
        os.mkdir(rand_dirname)
        for f in fnames:
            attr = f.split('.')
            date = attr[1].split('_')
            os.symlink(os.path.join(ASP_dir, attr[0], date[0], date[1], f), rand_dirname + f)

        dump = Popen([ROOT + '/bin/standalone_dsp -w -D '+ rand_dirname + ' -c'], shell=True, stdout=PIPE, stderr=PIPE)
        print '--> retrieving ASP output'
        out = dump.communicate()
        shutil.rmtree(rand_dirname)
        messages = out[0].split('\n')
        messages = filter(None, messages)
        split_messages = [ [config["Msg_types"][int(m.split(',')[0]) - 1], ','.join(m.split(',')[1:])] for m in messages ]
        return json.dumps(split_messages)


class DQDwalk(object):
    def GET(self):
        date = web.input(d=None)
        date_split = date.d.split('-')
        print date_split
        dir_list = getPaths(int(date_split[0]), int(date_split[1]))
        final_list = []
        if date_split[2] in ICAO_list:
            rand_dirname = config["tmp_dir"] + 'dqd%03d/' % (random.random() * 100)
            os.mkdir(rand_dirname)
            for d in dir_list:
                subdir_list = os.listdir(ASP_dir + date_split[2] + d)
                for s in subdir_list:
                    os.symlink(ASP_dir + date_split[2] + d + s, rand_dirname + s)
            ret = dqdwalk(rand_dirname)
        else:
            ret = 'Invalid ICAO'
        return json.dumps(ret)
class Feedback(object):
    def GET(self):
	user_submission = web.input(error=None,email=None,comments=None)
	if user_submission.error:
	    text = MIMEText("Here is your feedback as received: \n Error Type: %s \n Email: %s \n Comments: %s \n Expect a follow-up in a day or two. \n Cheers, Brandon" % (user_submission.error,user_submission.email,user_submission.comments)) 
	    recipients = [recipient] 
	    text['Subject'] = 'DQD Feedback'
	    text['From'] = sender
	    s = smtplib.SMTP('localhost')
	    try: 
		if user_submission.email:
		    recipients.append(user_submission.email)
		text['To'] = ", ".join(recipients)
		s.sendmail(sender,recipients,text.as_string())
		return json.dumps('Thank You. Your response has been received.')      
	    except:
		return json.dumps('Message Send Failure') 
	else:
	    return json.dumps('Empty/Invalid Response')

