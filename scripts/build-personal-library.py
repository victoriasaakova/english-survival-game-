"""Build a private, source-attributed library from the user's three Markdown files.
No network access. Output must stay out of public GitHub: public/personal-library.json
is ignored by the source repo. Publish only with the existing owner-private Site.
"""
import argparse,hashlib,json,re,pathlib
p=argparse.ArgumentParser();p.add_argument('--master',required=True);p.add_argument('--board',required=True);p.add_argument('--update',required=True);p.add_argument('--output',required=True);a=p.parse_args()
paths={key:pathlib.Path(getattr(a,key)) for key in ('master','board','update')};texts={key:path.read_text() for key,path in paths.items()}
def clean(s):return re.sub(r'[*`★]','',s).strip()
def uid(prefix,s):return prefix+hashlib.sha256(s.encode()).hexdigest()[:20]
lessons=[];vocab=[];exercises=[];seen={}
for key in ('master','board'):
 text=texts[key];source=paths[key].name;lessonid='source:'+key+':2026-11';topic='Материалы предыдущих уроков' if key=='master' else 'Рефрейминг';title='Master Vocabulary & Lesson Review · 8 ноября' if key=='master' else 'Inner Critic Board · 18 ноября'
 heading='';active=False;grammar=False;qs=[]
 for line in text.splitlines():
  if line.startswith('## '):
   active=(key=='master' and bool(re.match(r'## [345]\.',line))) or (key=='board' and line.startswith('## 6.'))
   grammar=(key=='master' and line.startswith('## 6.')) or (key=='board' and line.startswith('## 7.'))
  if line.startswith('### '):heading=line[4:].strip()
  if not line.startswith('|'):continue
  cells=[c.strip() for c in line.strip().strip('|').split('|')]
  if len(cells)!=3 or all(re.fullmatch(r'[-: ]+',c) for c in cells):continue
  if grammar and not cells[0].lower().startswith(('original','ошибка','исход')) and any(c in cells[0] for c in '*“'):
   original,answer,why=map(clean,cells)
   qs.append({'id':uid('q:',original),'kind':'grammar','prompt':'Исправьте формулировку, сохранив смысл: '+original,'answer':answer,'explanation':why})
  if not active or cells[0].lower().strip('* ') in ('expression','выражение'):continue
  expression,meaning,example=map(clean,cells);norm=expression.casefold().strip()
  if not expression:continue
  if norm in seen:
   old=seen[norm];old['priority']=old['priority'] or '★' in line
   if source not in old['source']:old['source']+='; '+source
   continue
  w={'id':uid('import-word:',norm),'lessonId':lessonid,'topic':heading or topic,'expression':expression,'meaning':meaning,'example':example,'source':source,'priority':'★' in line,'retrieval':'catalogue'}
  seen[norm]=w;vocab.append(w)
 for i in range(0,len(qs),5):exercises.append({'id':uid('import-practice:',key+str(i)),'lessonId':lessonid,'title':title+' · Grammar '+str(i//5+1),'questions':qs[i:i+5],'answers':{},'submitted':False})
 # Translation and writing remain NEW tasks, never marked completed.
 words=[w for w in vocab if w['lessonId']==lessonid][:5]
 exercises.append({'id':'import-translation:'+key,'lessonId':lessonid,'title':title+' · Перевод в новом контексте','questions':[{'id':uid('translation:',w['id']),'kind':'translation','prompt':'Передайте по-английски «'+w['meaning']+'» и примените выражение в новом предложении.'} for w in words],'answers':{},'submitted':False})
 exercises.append({'id':'import-writing:'+key,'lessonId':lessonid,'title':title+' · Письменная практика','questions':[{'id':'writing:'+key,'kind':'writing','prompt':('Write a 120–180 word product decision story. Separate your own contribution, hypotheses and proven outcomes.' if key=='master' else 'Write an original comeback to Captain Tomorrow and three distinct plot twists: realistic, empowering and quietly bold. Use 3–5 expressions from the lesson. Do not copy model lines.')}],'answers':{},'submitted':False})
for item in vocab:
 item['lessonId']=''
for item in exercises:
 item['topic']='Рефрейминг' if 'board' in item['lessonId'] else 'Работа и личные темы'
 item['lessonId']=''
 item['title']=item['title'].split(' · ',2)[-1].replace('Grammar ', 'Грамматика · ')
revision='personal-notes-2026-11-18-v1'
out={'revision':revision,'lessons':lessons,'vocabulary':vocab,'exercises':exercises,'sources':[{'name':paths[k].name,'date':'2026-11-08' if k=='master' else '2026-11-18' if k=='board' else '2026-11-17','description':'Импортированный источник, не доказательство активного владения'} for k in paths]}
path=pathlib.Path(a.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'lessons':len(lessons),'expressions':len(vocab),'practice_sets':len(exercises),'grammar_questions':sum(1 for e in exercises for q in e['questions'] if q['kind']=='grammar')},ensure_ascii=False))
