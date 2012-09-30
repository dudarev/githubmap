"""
Parses search_pages.

Extracts usernames, number of followers, number of repositories,
language, locations.  Fills collections users with that data.
"""

import re
import json
from math import ceil
from datetime import datetime

from pymongo import Connection
from bs4 import BeautifulSoup

connection = Connection()
db = connection.githubmap

users = db.users
users_pages = db.users_pages

per_page = 100
following_url = 'https://api.github.com/users/{name}/following?page={page}&per_page={per_page}'

for u in users.find():
    print u['name']
    num_following = u.get('num_following', 0)
    num_pages = int(ceil(float(num_following) / per_page))
    print 'num_following: %d' % num_following
    print 'num_pages: %d' % num_pages
    if num_following:
        following_list = []
        for p in range(1, num_pages + 1):
            url = following_url.format(
                name=u['name'], page=p, per_page=per_page)
            data = users_pages.find_one({'url': url})
            for uf in json.loads(data['json']):
                following_list.append(uf['login'])
        print following_list
        u['following_list'] = following_list
        users.save(u)

    print
