import json
import pickle
from math import sqrt
from pymongo import Connection

f = open('G.pkl', 'r')
G = pickle.load(f)
f.close()

f = open('pos.pkl', 'r')
pos = pickle.load(f)
f.close()

for u in G:
    print u

x_list = []
y_list = []

for u in pos:
    print u
    x_list.append(pos[u][0])
    y_list.append(pos[u][1])

xmin = -1
xmax = 1
ymin = -1
ymax = 1

dx = xmax - xmin
dy = ymax - ymin

x0_data = min(x_list)
dx_data = max(x_list) - min(x_list)
scale_x = dx / dx_data
y0_data = min(y_list)
dy_data = max(y_list) - min(y_list)
scale_y = dy / dy_data

connection = Connection()
db = connection.githubmap
users = db.users

user_list_raw = []

for u in pos:
    user_list_raw.append(users.find_one({'name': u}))

print len(user_list_raw)

user_list = []
num_followers_list = [u['num_followers'] for u in user_list_raw]
num_followers_min = 0
num_followers_max = max(num_followers_list)
r_point_min = 0.02
r_point_max = 0.25
dr_point = r_point_max - r_point_min

r_max = 0
r_min = 1

for u in user_list_raw:
    name = u['name']
    guid = name
    x = xmin + pos[name][0] * scale_x
    y = ymin + pos[name][1] * scale_y
    num_followers = u['num_followers']
    r = r_point_min + dr_point * sqrt(
        num_followers - num_followers_min) / sqrt(
            num_followers_max - num_followers_min)
    if r > r_max:
        r_max = r
    if r < r_min:
        r_min =r
    user_dict = {
        'name': name,
        'guid': guid,
        'x': x,
        'y': y,
        'r': r,
        'url': 'http://github.com/%s' % name}
    user_list.append(user_dict)

print user_list
print num_followers_list
print r_min
print r_max

R0 = 0.1
R1 = 0.25

user_list_000 = [u for u in user_list if u['r'] > R0]
print len(user_list_000)

f = open('base/0/0-0.json', 'w')
f.write(json.dumps(user_list_000))
f.close()

def is_point_inside_tile(user_dict, tile):
    """
    Tile is defined as a tuple (z, y, x).
    A point is inside of a tile if any point is inside.
    If center is inside - it is inside.
    If not - check if intersects.
    """
    x = user_dict['x']
    y = user_dict['y']

    Zt, Yt, Xt = tile
    dx_tile = (xmax - xmin) / 2**Zt
    dy_tile = (ymax - ymin) / 2**Zt

    xmin_tile = xmin + dx_tile * Xt
    ymin_tile = ymin + dy_tile * Yt
    xmax_tile = xmin + dx_tile * (Xt + 1)
    ymax_tile = ymin + dy_tile * (Yt + 1)

    if x >= xmin_tile and x < xmax_tile and y >= ymin_tile and y < ymax_tile:
        return True
    return False

z = 1
for x in range(2):
    for y in range(2):
        tile = (z, y, x)
        user_inside_tile_list = []
        for u in user_list:
            if is_point_inside_tile(u, tile) and u['r']<R1:
                user_inside_tile_list.append(u)
        f = open('base/%d/%d-%d.json' % (z, x, y), 'w')
        f.write(json.dumps(user_inside_tile_list))
        f.close()
        print 'inside of 1/%d-%d: %d' % (x, y, len(user_inside_tile_list))
