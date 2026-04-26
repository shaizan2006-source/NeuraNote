// Greedy max-munch word segmenter for PDF-extracted text with missing spaces.
// Uses a curated word list covering common English + academic + CS/math terms.

const WORDS = new Set([
  // Articles, prepositions, conjunctions, pronouns
  'a','about','above','across','after','again','against','all','also','although','am','among','an',
  'and','any','are','as','at','away','be','because','been','before','being','below','between',
  'both','but','by','can','cannot','could','did','do','does','doing','down','during','each',
  'either','else','even','ever','every','except','few','for','from','further','get','given',
  'go','got','had','has','have','having','he','her','here','him','his','how','however',
  'i','if','in','into','is','it','its','itself','just','let','like','may','me','more','most',
  'my','neither','never','no','nor','not','now','of','off','on','once','only','or','other',
  'our','out','over','own','rather','same','she','should','since','so','some','such','than',
  'that','the','their','them','then','there','these','they','this','those','though','through',
  'to','too','under','until','up','us','very','was','we','were','what','when','where','which',
  'while','who','whom','why','will','with','within','without','would','you','your',
  // Numbers
  'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
  'first','second','third','fourth','fifth','last','next','zero',
  // Common verbs
  'add','allow','appear','apply','ask','become','begin','bring','build','call','change','check',
  'choose','close','come','complete','consider','contain','continue','create','decide','define',
  'describe','design','determine','develop','discuss','divide','end','explain','extend','feel',
  'find','follow','form','found','give','grow','happen','help','hold','identify','implement',
  'include','indicate','know','learn','leave','make','mean','move','need','note','occur',
  'open','operate','perform','place','play','point','produce','provide','reach','read','refer',
  'remain','remove','represent','require','return','run','say','see','seem','select','send',
  'set','show','solve','start','state','store','study','take','tell','think','understand',
  'use','write',
  // Common adjectives/adverbs
  'available','back','based','basic','better','big','clear','close','common','complete',
  'correct','current','different','direct','early','easy','efficient','equal','example',
  'final','following','free','full','general','given','good','great','high','important',
  'large','less','linear','long','low','main','many','much','multiple','new','next',
  'often','original','possible','public','quite','real','right','similar','simple','simply',
  'single','small','specific','still','strong','such','sure','typical','used','using',
  'usually','various','well','whole','wide',
  // Academic/general
  'account','action','activity','address','age','approach','area','argument','aspect','block',
  'body','book','business','case','cause','choice','city','class','code','command','community',
  'component','concept','condition','control','course','data','day','detail','element',
  'error','event','factor','figure','file','flow','function','group','hand','head','idea',
  'information','input','instance','interface','item','key','kind','level','life','line',
  'link','list','logic','loop','map','message','method','model','module','name','network',
  'node','number','object','operation','operator','order','output','part','path','people',
  'phase','plan','point','power','problem','process','program','property','question','reason',
  'record','reference','relation','request','resource','response','result','role','rule',
  'scope','section','series','service','size','solution','space','stage','step','string',
  'structure','subject','system','table','term','theory','time','title','token','tool',
  'topic','tree','type','types','unit','value','variable','version','view','way','work','world',
  // CS/programming
  'algorithm','algorithms','api','application','applications','array','arrays','attribute',
  'binary','bit','bits','boolean','buffer','byte','bytes','cache','callback','character',
  'class','classes','client','compiler','complexity','compute','computer','computing',
  'constant','cpu','css','database','debug','declare','default','dependency','deploy',
  'enum','execute','execution','expression','false','flag','framework','function','functions',
  'git','graph','html','http','https','index','integer','javascript','json','language',
  'library','memory','method','methods','null','object','objects','operating','output',
  'package','parameter','parameters','parse','pointer','pointers','protocol','python',
  'query','queue','recursion','recursive','register','runtime','schema','server','services',
  'software','sort','sorting','sql','stack','statement','static','strings','struct','syntax',
  'thread','threads','true','typescript','url','user','users','values','variables','web',
  // Math
  'addition','algebra','angle','angles','area','arithmetic','axis','calculus','circle',
  'coefficient','cosine','decimal','denominator','derivative','differential','dimension',
  'division','equation','equations','expression','formula','fraction','geometry','graph',
  'greater','inequality','infinity','integral','intersection','inverse','logarithm',
  'matrix','maximum','minimum','modulo','multiple','multiplication','numerator',
  'parallel','perpendicular','plane','polynomial','prime','probability','proof',
  'proportion','quadratic','radius','ratio','root','scalar','sequence','sine','slope',
  'square','statistics','sum','tangent','theorem','triangle','vector','volume',
  // Physics/Chem
  'acceleration','atom','bond','charge','chemical','circuit','compound','current','density',
  'electric','electron','element','energy','field','force','frequency','gravity','heat',
  'ionic','kinetic','magnetic','mass','matter','molecule','momentum','neutron','nucleus',
  'orbit','particle','potential','pressure','proton','quantum','radiation','reaction',
  'resistance','speed','temperature','velocity','voltage','wave','weight',
]);

/**
 * Inserts spaces into text extracted from PDFs where spaces are missing.
 * Uses a greedy max-munch strategy: at each position, match the longest
 * known word, then advance. Unknown runs are kept intact until the next
 * known word boundary is detected.
 */
export function segmentText(text) {
  if (!text || typeof text !== 'string') return text;

  // Skip if already well-spaced (> 5% of chars are spaces)
  const spaceCount = (text.match(/ /g) || []).length;
  if (spaceCount / text.length > 0.05) return text;

  const lower = text.toLowerCase();
  const result = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Pass through existing whitespace
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      result.push(ch);
      i++;
      continue;
    }

    // Try longest known-word match first (max 20 chars)
    let matched = false;
    for (let len = Math.min(20, text.length - i); len >= 2; len--) {
      if (WORDS.has(lower.slice(i, i + len))) {
        result.push(text.slice(i, i + len));
        i += len;
        // Add space after word if not already at end or whitespace
        if (i < text.length && text[i] !== ' ' && text[i] !== '\n') {
          result.push(' ');
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Carry forward until the next position where a known word starts
      let j = i + 1;
      while (j < text.length && text[j] !== ' ' && text[j] !== '\n') {
        let nextKnown = false;
        for (let len = 2; len <= Math.min(20, text.length - j); len++) {
          if (WORDS.has(lower.slice(j, j + len))) {
            nextKnown = true;
            break;
          }
        }
        if (nextKnown) break;
        j++;
      }
      result.push(text.slice(i, j));
      if (j < text.length && text[j] !== ' ' && text[j] !== '\n') {
        result.push(' ');
      }
      i = j;
    }
  }

  return result
    .join('')
    .replace(/\s+/g, ' ')           // collapse double spaces
    .replace(/\s+([.!?:;,)}\]])/g, '$1') // remove space before punctuation
    .trim();
}
