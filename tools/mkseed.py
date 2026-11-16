import json,glob,os
S='/tmp/claude-0/-home-claude/be48f7cc-e2df-5659-af00-8242b37e0d19/scratchpad/db'
d=lambda f:json.load(open(f))
bn=lambda f:os.path.basename(f)[:-5]
out={'app':'life-dashboard','version':1,'exportedAt':'cloud-db-2026-11-11','cfg':d(S+'/config/main.json'),
 'days':{bn(f):d(f) for f in sorted(glob.glob(S+'/days/*.json'))},
 'entries':[{'id':bn(f),**d(f)} for f in sorted(glob.glob(S+'/entries/*.json'))],
 'todos':[{'id':bn(f),**d(f)} for f in sorted(glob.glob(S+'/todos/*.json'))],
 'academics':{bn(f):d(f) for f in sorted(glob.glob(S+'/academics/*.json'))},'photos':[]}
json.dump(out,open('/home/claude/tools/source-export.json','w'),indent=1)
print({k:(len(v) if hasattr(v,'__len__') else v) for k,v in out.items()})
