"""Show source headers and all independently detected uncertain cells for review."""
import argparse,json,math,calendar
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from image_grid import grid
parser=argparse.ArgumentParser()
parser.add_argument('--prefix',required=True)
parser.add_argument('candidates',nargs='+')
args=parser.parse_args()
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
items=[json.loads(Path(p).read_text()) for p in args.candidates]
locations={l['id']:l['name'] for l in json.loads(Path('data/locations.json').read_text())}
header_columns=min(3,len(items))
canvas=Image.new('RGB',(800*header_columns,220*math.ceil(len(items)/header_columns)),'white')
draw=ImageDraw.Draw(canvas)
issues=[]
for i,item in enumerate(items):
 x=(i%header_columns)*800;y=(i//header_columns)*220
 draw.text((x+4,y+2),f"{i}: {item['locationId']} {locations[item['locationId']]} / {item['year']}-{item['month']} — {item['sourceChecksum'][:8]}",font=font,fill='black')
 source,cells=grid(item['sourceReference'],calendar.monthrange(item['year'],item['month'])[1])
 canvas.paste(source.crop((0,0,800,source.info['nurvaxt_header_bottom']+1)),(x,y+25))
 for issue in item['issues']:
  issues.append((i,item,issue,cells[issue['day']-1][issue['column']]))
canvas.save(args.prefix+'.headers.png')
issue_columns=max(1,min(3,len(issues)))
canvas=Image.new('RGB',(600*issue_columns,max(1,140*math.ceil(len(issues)/issue_columns))),'white');draw=ImageDraw.Draw(canvas)
for n,(i,item,issue,cell) in enumerate(issues):
 x=(n%issue_columns)*600;y=(n//issue_columns)*140
 draw.text((x+5,y+3),f"{n}: item {i} day {issue['day']} col {issue['column']} OCR {issue['ocr']} / glyph {issue['template']}",font=font,fill='black')
 cell=Image.fromarray(cell);canvas.paste(cell.resize((cell.width*5,cell.height*5)),(x+10,y+35))
canvas.save(args.prefix+'.issues.png')
Path(args.prefix+'.index.json').write_text(json.dumps({'candidates':args.candidates,'issues':[{**issue,'candidate':args.candidates[i]} for i,_,issue,_ in issues]},indent=2)+'\n')
print(len(items),'headers;',len(issues),'cells to review')
