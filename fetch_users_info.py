"""
Fetches users info.

His info.
Whom follows. This and below are paginated if needed.

Not done yet:
Followers.
His repos.
Starred repos.
"""

import json
from datetime import datetime
from math import ceil

import requests
from pymongo import Connection


connection = Connection()
db = connection.githubmap
users = db.users
users_pages = db.users_pages

print 'Downloading info'

info_url = 'https://api.github.com/users/{name}'

for u in users.find():
    print u['name']
    url = info_url.format(name=u['name'])
    if users_pages.find_one({'url': url}):
        print 'already downloaded'
    else:
        response = requests.get(url)
        page = {
            'url': url,
            'fetched_at': datetime.now(),
            'is_parsed': False,
            'json': response.text,
        }
        # update num_following
        u['num_following'] = json.loads(response.text).get('following', 0)
        users.save(u)
        print u
        users_pages.insert(page)

print 'Downloading users whom is following'

following_url = 'https://api.github.com/users/{name}/following?page={page}&per_page={per_page}'
per_page = 100

for u in users.find():
    print u['name']
    num_following = u.get('num_following', 0)
    num_pages = int(ceil(float(num_following) / per_page))
    print 'num_following: ', num_following
    print 'num_pages: ', num_pages
    if num_following:
        for p in range(1, num_pages + 1):
            url = following_url.format(
                name=u['name'], page=p, per_page=per_page)
            if users_pages.find_one({'url': url}):
                print 'already downloaded'
            else:
                response = requests.get(url)
                page = {
                    'url': url,
                    'fetched_at': datetime.now(),
                    'is_parsed': False,
                    'json': response.text,
                }
                users_pages.insert(page)
