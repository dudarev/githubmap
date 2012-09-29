"""
Fetches search results for Github users with keyword Ukraine.
Saves results in MongoDB database githubmap.

Based on
https://github.com/mjp/pycheckup/blob/master/fetch_repos.py
"""

from datetime import datetime
from time import sleep

import requests
from pymongo import Connection


connection = Connection()
db = connection.githubmap

search_pages = db.search_pages

search_url = 'https://github.com/search?q=Ukraine&repo=&langOverride=&start_value={page_num}&type=Users&language='

print 'Starting'

page_max = 99
page_num = 1

while page_num <= page_max:
    print 'getting page {page_num}'.format(page_num=page_num)
    url = search_url.format(page_num=page_num)
    print url
    if search_pages.find_one({'url': url}):
        print 'already downloaded'
    else:
        response = requests.get(url)
        page = {
            'url': url,
            'fetched_at': datetime.now(),
            'is_parsed': False,
            'html': response.text,
        }
        search_pages.insert(page)
        sleep(2)
    page_num += 1

print 'Done'
