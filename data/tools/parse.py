import json,re,sys

def names(text):
    # Open Food Facts escapes commas inside a name with a backslash.
    return [x.strip().replace('\\,', ',') for x in re.split(r'(?<!\\),', text) if x.strip()]

txt=open(sys.argv[1],encoding='utf-8').read()
blocks=re.split(r'\n\s*\n',txt)
out=[]
for b in blocks:
    lines=[l for l in b.split('\n') if l.strip() and not l.startswith('#')]
    en=[l for l in lines if l.startswith('en:')]
    if not en: continue
    d={'names_en':names(en[0][3:]),'names':{}, 'props':{}}
    for l in lines:
        m=re.match(r'^([a-z_]+):([a-z]{2}):\s*(.*)$',l)
        if m:
            d['props'][m.group(1)]=m.group(3).strip()
            continue
        m=re.match(r'^([a-z]{2}):\s*(.*)$',l)
        if m: d['names'][m.group(1)]=names(m.group(2))
        m2=re.match(r'^<\s*en:(.*)$',l)
        if m2: d.setdefault('parents',[]).append(m2.group(1).strip())
    if 'e_number' in d['props']: out.append(d)
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
print(len(out))
from collections import Counter
print(Counter((d['props'].get('vegan'),d['props'].get('vegetarian')) for d in out))
