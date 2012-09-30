"""
Generates 25 points in square (-1, -1, 1, 1) with Rmax = 1.
Save to 0/0-0.json all points that have R > 0.5
Save to 1/x-y.json all points that have R < 0.75 inside of squares.
A point is inside of a square if any of its points is inside.
"""

from random import random
import json

N = 25 

xmin = -1
xmax = 1
ymin = -1
ymax = 1

dx = xmax - xmin
dy = ymax - ymin

Rmax = 0.5
R0 = 0.3
R1 = 0.4

user_list = []

for i in range(N):
    x = xmin + dx * random()
    y = ymin + dy * random()
    r = Rmax * random()
    name = 'user%d' % i
    guid = name
    user_dict = {
        "name": name,
        "guid": guid,
        "x": x,
        "y": y,
        "r": r}
    user_list.append(user_dict)
    print json.dumps(user_dict)

user_list_000 = [u for u in user_list if u['r'] > R0]
print user_list_000
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
