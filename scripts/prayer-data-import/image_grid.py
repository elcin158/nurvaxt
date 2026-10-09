"""Extract published plain JPEG table cells; reject unknown geometry.

This script creates OCR candidates and independently classifies glyphs using a
visually audited source atlas. It never creates or promotes review sidecars.
"""
import argparse
import calendar
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def groups(indices):
    return np.split(indices, np.flatnonzero(np.diff(indices) > 1) + 1)


def grid(path, days):
    image = Image.open(path).convert('RGB')
    if image.width != 800 or not 650 <= image.height <= 800:
        raise ValueError(f'Unknown source geometry {image.size}: {path}')
    pixels = np.array(image)
    dark = pixels.max(axis=2) < 128
    body = dark[120:]
    boundaries = [int(np.mean(g).round()) for g in groups(np.flatnonzero(body.sum(axis=0) > body.shape[0] * .88))]
    if len(boundaries) != 13 or min(np.diff(boundaries)) < 60:
        raise ValueError(f'Unexpected columns: {boundaries}')
    line_pixels=np.flatnonzero((pixels.min(axis=2)<128).sum(axis=1)>760)
    line_groups=np.split(line_pixels,np.flatnonzero(np.diff(line_pixels)>3)+1)
    ys=[int(np.mean(g).round()) for g in line_groups[-(days+1):]]
    horizontal=ys[1:]
    if len(ys)!=days+1 or not 100 <= ys[0] <= 180 or min(np.diff(ys))<18 or max(np.diff(ys))>22:
        raise ValueError(f'Unexpected rows: {horizontal}')
    cells = []
    for row in range(days):
        cells.append([pixels[ys[row]+3:ys[row+1]-2, boundaries[c]+3:boundaries[c+1]-3] for c in [0,*range(3,12)]])
    image.info['nurvaxt_header_bottom']=ys[0]
    return image, cells


def glyphs(cell, count=5):
    gray = np.array(Image.fromarray(cell).convert('L'))
    widths = [8,8,4,8,8] if count==5 else [8]*count
    start = (gray.shape[1]-sum(widths))/2
    result = []
    for width in widths:
        left=int(round(start))
        right=int(round(start+width))
        cut=gray[:,left:right]
        ink=cut < 160
        xs=np.flatnonzero(ink.any(axis=0))
        ys=np.flatnonzero(ink.any(axis=1))
        if not len(xs) or not len(ys):
            raise ValueError('Empty glyph in source cell')
        cut=cut[ys[0]:ys[-1]+1,xs[0]:xs[-1]+1]
        vector=1-np.array(Image.fromarray(cut).resize((12,20),Image.Resampling.BILINEAR),dtype=float).flatten()/255
        result.append(vector)
        start+=width
    return result


def make_atlas(review_path, target):
    review = json.loads(Path(review_path).read_text())
    source = Path(review['sourceReference'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == review['sourceChecksum']
    _, cells = grid(source,len(review['rows']))
    labels, vectors = [], []
    for row, original in zip(cells,review['rows']):
        texts = [str(int(original['date'][-2:])),*original['values']]
        for cell,text in zip(row,texts):
            extracted = glyphs(cell,len(text))
            if len(extracted) != len(text):
                raise ValueError(f'Glyph segmentation disagreement in atlas: {text}')
            labels.extend(text)
            vectors.extend(extracted)
    atlas = {'sourceReference':review['sourceReference'],'sourceChecksum':review['sourceChecksum'],
             'reviewReference':str(review_path),'reviewChecksum':hashlib.sha256(Path(review_path).read_bytes()).hexdigest(),
             'labels':labels,'vectors':[v.round(6).tolist() for v in vectors]}
    Path(target).write_text(json.dumps(atlas,separators=(',',':'))+'\n')


def extract(source, year, month, target, atlas_path):
    days = calendar.monthrange(year,month)[1]
    image,cells = grid(source,days)
    # Remove grid lines by extracting each actual cell, then space them for OCR.
    tile=Image.new('RGB',(2400,80*days),'white')
    for row_index,row in enumerate(cells):
        for column,cell in enumerate(row):
            part=Image.fromarray(cell)
            part=part.resize((part.width*3,part.height*3),Image.Resampling.LANCZOS)
            tile.paste(part,(column*240+20,row_index*80+12))
    tile.save(target+'.png',dpi=(300,300))
    image.crop((0,0,800,image.info['nurvaxt_header_bottom']+1)).save(target+'.header.png')
    atlas=json.loads(Path(atlas_path).read_text())
    templates=np.array(atlas['vectors'])
    classes=np.array(atlas['labels'])
    decoded=[]
    for row_index,row in enumerate(cells):
        fields=[]
        for column,cell in enumerate(row):
            values=[]
            for vector in glyphs(cell,5 if column else len(str(row_index+1))):
                distances=np.mean(np.abs(templates-vector),axis=1)
                ranked=sorted((float(distances[classes==label].min()),label) for label in set(classes))
                best,label=ranked[0]
                margin=ranked[1][0]-best
                values.append({'value':label,'distance':round(best,6),'margin':round(margin,6)})
            fields.append({'text':''.join(v['value'] for v in values),'glyphs':values})
        decoded.append(fields)
    Path(target+'.glyphs.json').write_text(json.dumps({'sourceChecksum':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
        'atlasChecksum':hashlib.sha256(Path(atlas_path).read_bytes()).hexdigest(),'rows':decoded},indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['atlas','extract'])
    parser.add_argument('--review')
    parser.add_argument('--source')
    parser.add_argument('--year',type=int,default=2026)
    parser.add_argument('--month',type=int)
    parser.add_argument('--target',required=True)
    parser.add_argument('--atlas',default='data/review/evidence/plain-table-atlas.json')
    args=parser.parse_args()
    if args.command=='atlas':make_atlas(args.review,args.target)
    else:extract(args.source,args.year,args.month,args.target,args.atlas)
