"""
Parses search_pages.

Extracts usernames, number of followers, number of repositories,
language, locations.  Fills collections users with that data.
"""

import re
from datetime import datetime

from pymongo import Connection
from bs4 import BeautifulSoup


def parse_details(details_text):
    details_list = details_text.split('|')
    details = {}
    for d in map(lambda x: x.strip(), details_list):
        if 'follower' in d:
            details['num_followers'] = int(
                re.sub("\D", "", d).strip())
        elif 'repositories' in d:
            details['num_repositories'] = int(
                d.replace('repositories', '').strip())
        elif 'located in' in d:
            details['location'] = d.replace('located in', '').strip()
        else:
            details['language'] = d.strip()
    return details


def get_users_from_html(html):
    soup = BeautifulSoup(html)
    results = soup.find_all('div', {'class': 'result'})
    
    users_list = []

    for res in results:
        username = res.a.string.split(' / ')[-1]
        details_text = res.find('div', {'class': 'details'}).text
        details = parse_details(details_text)
        details['name'] = username
        details['_id'] = username
        print username
        users_list.append(details)

    print len(users_list)
    return users_list


connection = Connection()
db = connection.githubmap

users = db.users
search_pages = db.search_pages

num_users = 0
users_set = set()

for page in search_pages.find():
    print page.keys()
    print page['fetched_at']
    users_list = get_users_from_html(page['html'])
    num_users += len(users_list)
    names = [u['name'] for u in users_list]
    users_set.update(names)
    # some names are duplicates, so we save users, not insert
    for u in users_list:
        users.save(u)
    page['is_parsed'] = True
    page['parsed_at'] = datetime.now()
    search_pages.update({"url": page['url']}, page)

print len(users_set)
