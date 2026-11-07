"""
Gera os quadros do vídeo abstrato do topo da página inicial (cores da paleta ArcanaKin em movimento, loop
perfeito de 12 s a 24 fps). Uso:

    python3 hero-video.py /tmp/frames
    ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "scale=1280:720:flags=lanczos,gblur=sigma=1.2,format=yuv420p" \
      -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -an public/home/hero.webm
    ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "scale=1280:720:flags=lanczos,gblur=sigma=1.2,format=yuv420p" \
      -c:v libx264 -preset slow -crf 26 -movflags +faststart -an public/home/hero.mp4
    ffmpeg -i /tmp/frames/f0000.png -vf "scale=1280:720,gblur=sigma=1.2" public/home/hero-poster.webp
"""
import numpy as np, sys, os
from PIL import Image
W,H=640,360; FPS=24; T=12.0; N=int(FPS*T)
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
only=int(sys.argv[2]) if len(sys.argv)>2 else None
y,x=np.mgrid[0:H,0:W].astype(np.float32)
x=(x-W/2)/H; y=(y-H/2)/H
hexc=lambda h: np.array([int(h[i:i+2],16)/255 for i in (1,3,5)],np.float32)
# Paleta ArcanaKin (packages/tokens): Dourado, Mana, Éter, violeta claro, Arcano (clareado) e verde-água claro
cols=[hexc('#f6b944'),hexc('#14b8a6'),hexc('#7c3aed'),hexc('#a78bfa'),hexc('#5b21b6'),hexc('#4cd0be')]
bg=hexc('#0b0716')  # Noite
rng=np.random.default_rng(7)
blobs=[]
for i in range(11):
    c=cols[i%len(cols)]
    blobs.append(dict(c=c,ax=rng.uniform(.25,.75),ay=rng.uniform(.15,.4),kx=rng.integers(1,3),ky=rng.integers(1,3),
        px=rng.uniform(0,2*np.pi),py=rng.uniform(0,2*np.pi),r=rng.uniform(.10,.24),cx=rng.uniform(-.5,.5),cy=rng.uniform(-.2,.2),
        a=rng.uniform(.5,.9)))
frames=range(N) if only is None else [only]
r=np.sqrt(x*x+y*y); th=np.arctan2(y,x)
for f in frames:
    t=f/N; w=2*np.pi*t
    acc=np.zeros((H,W,3),np.float32)
    for b in blobs:
        bx=b['cx']+b['ax']*np.cos(b['kx']*w+b['px'])
        by=b['cy']+b['ay']*np.sin(b['ky']*w+b['py'])
        d2=(x-bx)**2+(y-by)**2
        g=np.exp(-d2/(b['r']**2))*b['a']
        acc+=g[...,None]*b['c']
    # anéis finos que giram (estrutura geométrica)
    for k,(r0,sp,ci) in enumerate([(.30,1,2),(.46,-1,1),(.62,1,4)]):
        ring=np.exp(-((r-r0-0.015*np.sin(5*th+sp*w))**2)/0.00012)
        mod=0.5+0.5*np.cos(5*(th-sp*w)+k)
        acc+=(ring*mod*0.35)[...,None]*cols[ci]
    # faixas de luz suaves
    band=np.exp(-((y+0.25*np.sin(2.2*x+w)+0.05*np.sin(5*x-2*w))**2)/0.004)*0.25
    acc+=band[...,None]*hexc('#ffde9b')  # dourado claro
    img=1-np.exp(-acc*1.05)
    vign=np.clip(1.15-0.55*r,0,1)[...,None]
    img=bg+(1-bg)*img*vign
    Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8)).save(f'{out}/f{f:04d}.png')
