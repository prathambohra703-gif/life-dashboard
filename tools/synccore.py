#!/usr/bin/env python3
"""Copies the shared pure-logic files into the cloud function, so the app and the function never drift apart.
app/reminders-core.js -> RemCore and app/cal-core.js -> CalCore, between the BEGIN/END markers in app/cloud/3-remind-function.ts.
Usage: python3 tools/synccore.py        (--check: exit 1 if the function is out of date, change nothing)"""
import os,re,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FN=os.path.join(ROOT,'app','cloud','3-remind-function.ts')
def body(src):
    s=open(os.path.join(ROOT,'app',src),encoding='utf8').read()
    m=re.search(r"\(function\(g\)\{\n'use strict';\n(.*)\ng\.(\w+)=(\{[^}]*\});\n\}\)\(",s,re.S)
    assert m,f'{src}: expected (function(g){{ ... g.Name={{...}}; }})( wrapper'
    return f'const {m[2]} = (() => {{\n{m[1]}\nreturn {m[3]};\n}})();\n'
def main():
    s=open(FN,encoding='utf8').read();new=s
    for src in ('reminders-core.js','cal-core.js'):
        a,b=f'// BEGIN {src}\n',f'// END {src}\n'
        i,j=new.index(a)+len(a),new.index(b)
        new=new[:i]+body(src)+new[j:]
    if '--check' in sys.argv:
        print('up to date' if new==s else 'OUT OF DATE: run python3 tools/synccore.py');return 0 if new==s else 1
    if new!=s: open(FN,'w',encoding='utf8').write(new)
    print('synced' if new!=s else 'already up to date');return 0
sys.exit(main())
