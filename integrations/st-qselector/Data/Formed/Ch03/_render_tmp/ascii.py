from PIL import Image, ImageChops, ImageFilter
import glob, sys

def dump(path, cols=110):
    im = Image.open(path).convert('L')
    bg = Image.new('L', im.size, 255)
    bbox = ImageChops.difference(im, bg).getbbox()
    if bbox:
        l,t,r,b = bbox; pad=4
        im = im.crop((max(0,l-pad),max(0,t-pad),min(im.width,r+pad),min(im.height,b+pad)))
    im = im.filter(ImageFilter.MinFilter(3))
    w,h = im.size
    rows = max(1, int(h/w*cols/2.1))
    im = im.resize((cols, rows), Image.LANCZOS)
    px = im.load()
    lines=[]
    for y in range(rows):
        lines.append(''.join('#' if px[x,y]<120 else ('.' if px[x,y]<205 else ' ') for x in range(cols)))
    return '\n'.join(lines)

files = sys.argv[1:]
if not files:
    files = sorted(glob.glob('*.png'))
for f in files:
    print('\n===== '+f+' =====')
    print(dump(f))
