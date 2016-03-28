import docs from '../data/docs.json';

const deepcopy = e => JSON.parse(JSON.stringify(e));

function generateDocsTree() {
  const ents = docs.filter(e => e.kind == "class" || e.kind == "interface");
  ents.forEach(c => c.children = docs.filter(e => e.memberof == c.name));
  ents.forEach(c => attachModels(docs, c));

  const events = docs.filter(e => e.kind == "event");

  const classes = ents.filter(e => e.kind == "class");
  const interfaces = ents.filter(e => e.kind == "interface");

  return {classes, interfaces, events, all: docs};
}

function findInheritedModelMembers(docs, c) {
  const ret = [];

  const inherited = (c.augments || []).pop();
  if (!inherited) return ret;

  const type = docs.find(e => e.name == inherited);
  if (!type || !type.customTags) return ret;

  const tag = type.customTags.find(t => t.tag == "model");
  if (!tag || !tag.value) return ret;

  const model = tag.value;
  [].push.apply(ret, docs.filter(e => e.memberof == model).map(deepcopy));
  return findInheritedModelMembers(docs, type).concat(ret);
}

function attachModels(docs, c) {
  if (!c.customTags) return;
  const tags = c.customTags || [];
  const tag = tags.find(t => t.tag == "model") || {};
  if (!tag || !tag.value) return;

  const model = tag.value;
  const members = docs.filter(e => e.memberof == model).map(deepcopy);
  const inherited = findInheritedModelMembers(docs, c);
  for (const member of inherited) {
    if (members.find(e => e.name == member.name)) continue;
    members.push(member);
  }

  members.forEach(m => {
    m.inherits = m.id;
    m.inherited = true;

    m.id = m.longname = `${c.name}#${m.name}`;
    m.memberof = c.name;
    m.scope = "instance";
    m.kind = "discordproperty";

    const valueOverride = c.children.find(d => d.id == m.id);
    if (!valueOverride) return;
    m.returnInherits = m.returns;
    m.returnInherited = true;
    m.returns = valueOverride.returns;
  });

  c.children = (c.children || []).concat(members);
}

class Docs {
  constructor() {
    this.groups = generateDocsTree();
  }
  formatFunctionParams(d) {
    let params = "";
    if (d.kind == "function") {
      const list = (d.params || []).map(p => {
        return p.optional ? `[${p.name}]` : p.name;
      });
      params += "(" + list.join(", ") + ")";
    }
    return params;
  }
}

export default new Docs();