#!/usr/bin/env python3
"""Imagery pipeline: app/img/src/*.jpg -> app/img/<scene>-{1600,800}.webp + <scene>-thumb.jpg
Usage: python3 tools/img.py            build (idempotent)
       python3 tools/img.py --check    build, then Playwright screenshots/perf/pause checks
Scenes: coast=Today gym=Train table=Fuel arch=Money study=Study ridge=Career+Progress
(ridge is a horizon crop of coast.jpg that excludes the standing figure)."""
import sys, os, io, shutil, json, time
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / 'app' / 'img'
SRC = IMG / 'src'
SCENES = {'coast': 'coast.jpg', 'gym': 'gym.jpg', 'table': 'table.jpg', 'arch': 'arch.jpg', 'study': 'study.jpg', 'ridge': 'coast.jpg'}
RIDGE_BOX = (1500, 300, 2752, 1000)  # sky gradient + sea, no figure (figure ~x1300-1420)
BUDGET = {1600: 150 * 1024, 800: 60 * 1024}
DARKEN, SAT = 0.90, 0.90


def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    nw, nh = round(im.width * s), round(im.height * s)
    im = im.resize((nw, nh), Image.LANCZOS)
    l, t = (nw - w) // 2, (nh - h) // 2
    return im.crop((l, t, l + w, t + h))


def grade(im):
    im = ImageEnhance.Color(im).enhance(SAT)
    # darken mids/shadows a little, leave highlights (lamp, horizon band) intact
    lut = [round(255 * ((i / 255) ** 1.0) * (DARKEN + (1 - DARKEN) * (i / 255) ** 2)) for i in range(256)]
    return im.point(lut * 3)


def encode(im, budget):
    for q in range(86, 20, -2):
        b = io.BytesIO()
        im.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= budget:
            return b.getvalue(), q
    return b.getvalue(), q


def build():
    rows = []
    for name, fn in SCENES.items():
        im = Image.open(SRC / fn).convert('RGB')
        if name == 'ridge':
            im = im.crop(RIDGE_BOX)
        for w in (1600, 800):
            h = w * 9 // 16
            data, q = encode(grade(cover(im, w, h)), BUDGET[w])
            p = IMG / f'{name}-{w}.webp'
            if not p.exists() or p.read_bytes() != data:
                p.write_bytes(data)
            rows.append((p.name, len(data), q))
        t = grade(cover(im, 32, 18))
        p = IMG / f'{name}-thumb.jpg'
        b = io.BytesIO(); t.save(b, 'JPEG', quality=70, optimize=True)
        if not p.exists() or p.read_bytes() != b.getvalue():
            p.write_bytes(b.getvalue())
        rows.append((p.name, len(b.getvalue()), 70))
    print(f'{"file":22}{"bytes":>9}{"KB":>8}{"q":>5}')
    for n, s, q in rows:
        print(f'{n:22}{s:>9}{s/1024:>8.1f}{q:>5}')
    bad = [n for n, s, q in rows if (n.endswith('-1600.webp') and s > BUDGET[1600]) or (n.endswith('-800.webp') and s > BUDGET[800])]
    if bad:
        print('OVER BUDGET:', bad); sys.exit(1)


# ------------------------------------------------------------------ check
VIEWS = [('Today', 'today'), ('Train', 'train'), ('Fuel', 'fuel'), ('Money', 'money'), ('Study', 'study'), ('Career', 'progress')]


def check():
    from playwright.sync_api import sync_playwright
    scratch = Path(os.environ.get('IMG_SCRATCH', '/tmp/claude-0/-home-user/8a912fcc-9986-53ff-ac39-7f02d28d5e9f/scratchpad/wallcheck'))
    app = scratch / 'app'
    if scratch.exists():
        shutil.rmtree(scratch)
    scratch.mkdir(parents=True)
    shutil.copytree(ROOT / 'app', app, ignore=shutil.ignore_patterns('src'))
    idx = app / 'index.html'
    html = idx.read_text()
    if 'ui/wall.js' not in html:
        html = html.replace('<script src="extra.js"></script>', '<script src="extra.js"></script><script src="ui/wall.js"></script>')
        if 'ui/wall.js' not in html:
            i = html.find('extra.js')
            j = html.find('</script>', i) + 9
            html = html[:j] + '<script src="ui/wall.js"></script>' + html[j:]
        idx.write_text(html)
    import http.server, threading, functools
    H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(app))
    H.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_port}/index.html'
    report = {}
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for reduced in (False, True):
            for w, h in ((390, 844), (1366, 800)):
                ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 500 else 1,
                                     reduced_motion='reduce' if reduced else 'no-preference')
                pg = ctx.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto(url); pg.wait_for_timeout(1500)
                pg.evaluate("LOOK.motion='mix';LOOK.strength=2;lookApply()")
                for label, v in VIEWS:
                    pg.evaluate(f"state.view='{v}';render&&render();wallApply()")
                    pg.wait_for_timeout(1200)
                    pg.screenshot(path=str(scratch / f'{label}-{w}-{"reduced" if reduced else "mix"}.png'))
                report[f'errors {w} {"reduced" if reduced else "mix"}'] = errs
                if reduced:
                    pg.evaluate("state.view='today';render&&render();wallApply()"); pg.wait_for_timeout(800)
                    a = pg.evaluate("document.getElementById('wall').toDataURL()"); pg.wait_for_timeout(3000)
                    b = pg.evaluate("document.getElementById('wall').toDataURL()")
                    report[f'reduced still {w}'] = (a == b, 'raf=' + str(pg.evaluate('WALL.raf')))
                ctx.close()
        # perf at 390x844, 4x CPU throttle, Today live
        ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(1500)
        pg.evaluate("LOOK.motion='mix';state.view='today';render&&render();wallApply()"); pg.wait_for_timeout(1500)
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        pg.evaluate("""()=>{window.__dyn=[];const S=WALL.scene;if(S&&S.dyn){const o=S.dyn;S.dyn=function(){const t=performance.now();const r=o.apply(this,arguments);window.__dyn.push(performance.now()-t);return r}}
          window.__frames=0;const c=()=>{window.__frames++;requestAnimationFrame(c)};requestAnimationFrame(c)}""")
        cdp.send('Performance.enable')
        m0 = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        pg.wait_for_timeout(6000)
        m1 = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        d = pg.evaluate('window.__dyn'); fr = pg.evaluate('window.__frames')
        wall = m1['Timestamp'] - m0['Timestamp']
        js = (m1['ScriptDuration'] - m0['ScriptDuration']) / wall
        task = (m1['TaskDuration'] - m0['TaskDuration']) / wall
        report['perf 4x throttle'] = {'dyn_calls': len(d), 'dyn_avg_ms': round(sum(d) / max(1, len(d)), 2), 'dyn_max_ms': round(max(d or [0]), 2),
                                       'script_fraction': round(js, 3), 'main_thread_task_fraction': round(task, 3), 'raf_fps': round(fr / wall, 1)}
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        # hidden pause: emulate via visibility
        pg.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_timeout(300)
        pg.evaluate("window.__frames=0;window.__w=0;const o=WALL.scene.dyn;")
        a = pg.evaluate('WALL.raf'); pg.wait_for_timeout(1500)
        report['hidden pause'] = {'WALL.raf': a}
        pg.evaluate("Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_timeout(300)
        report['visible again raf'] = pg.evaluate('WALL.raf')
        ctx.close(); br.close()
    srv.shutdown()
    print(json.dumps(report, indent=1, default=str))
    print('screenshots in', scratch)


if __name__ == '__main__':
    build()
    if '--check' in sys.argv:
        check()
