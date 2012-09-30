import networkx as nx
import matplotlib.pyplot as plt
from pymongo import Connection
import pickle


connection = Connection()
db = connection.githubmap
users = db.users

G = nx.DiGraph()

print 'Creating set of users'
users_set = set()
for u in users.find():
    users_set.add(u['name'])

print 'Creating graph'
for u in users.find():
    print u['name']
    for uf in u.get('following_list', ''):
        if uf in users_set:
            G.add_edge(u['name'], uf)

print 'Removing without connections'
for u in users_set:
    if max(G.in_degree(u), G.out_degree(u)) < 1:
        G.remove_node(u)
print len(G)

for u in users_set:
    if max(G.in_degree(u), G.out_degree(u)) < 2:
        G.remove_node(u)
print len(G)

print 'Applying positioning algorithm'
pos = nx.random_layout(G)
pos = nx.spring_layout(G, iterations=100, pos=pos)

print 'Plotting'
nx.draw_networkx_nodes(G, pos, alpha=0.3)
nx.draw_networkx_edges(G, pos, alpha=0.3, node_size=0, width=1, edge_color='k')

f = open('G.pkl', 'wb')
pickle.dump(G, f)
f.close()

f = open('pos.pkl', 'wb')
pickle.dump(pos, f)
f.close()

plt.axis('off')
plt.savefig('graph.png', dpi=72)
