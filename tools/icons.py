import asyncio
from playwright.async_api import async_playwright
SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#b9cab6" stroke-linecap="round"><circle cx="24" cy="24" r="21.5" stroke-width="1.4"/><path d="M15.5 27.5a8.5 8.5 0 0 1 17 0" stroke-width="1.5"/><path d="M7 27.5h34" stroke-width="1.5"/><path d="M16.5 33h15" stroke-width="1.1" opacity=".7"/><path d="M20.5 38h7" stroke-width="1.1" opacity=".45"/></svg>'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for name,size,pad,bg in (('icon-192',192,.18,'#0b0c0c'),('icon-512',512,.18,'#0b0c0c'),('apple-touch-icon',180,.2,'#0b0c0c'),('icon-maskable-512',512,.27,'#0b0c0c'),('badge',96,.08,'transparent')):
            pg=await b.new_page(viewport={'width':size,'height':size})
            svg=SVG if name!='badge' else SVG.replace('#b9cab6','#ffffff')
            await pg.set_content(f'<body style="margin:0;background:{bg};display:grid;place-items:center;height:100vh"><div style="width:{int(size*(1-2*pad))}px">{svg}</div></body>')
            await pg.screenshot(path=f'./app/icons/{name}.png',omit_background=(bg=='transparent'))
            await pg.close()
        await b.close()
asyncio.run(main())
