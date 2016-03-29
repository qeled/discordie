import React from 'react';
import {Link} from 'react-router';

import {JS} from '../../Constants.js';
import Docs from '../../lib/Docs.js';

import Markdown from '../../lib/Markdown.js';

const EXTERNAL_TYPES = {};
function addExternal(docRoot, type, docPath) {
  EXTERNAL_TYPES[type] = docRoot + docPath;
  EXTERNAL_TYPES[type.toLowerCase()] = docRoot + docPath;
}
JS.StandardObjects.forEach(type => addExternal(JS.MDN_PATH, type, type));
Object.keys(JS.NodeObjects).forEach(type =>
  addExternal(JS.NODE_DOCS_PATH, type, JS.NodeObjects[type])
);

const LOCAL_TYPES = {};
const local = Docs.groups.all.filter(e => /interface|class|event/.test(e.kind));
for (const {name} of local) {
  LOCAL_TYPES[name] = "/docs/" + name;
}

const TYPE_RENDERER = Markdown.parserFor({
  types: {
    order: 1,
    match(source) {
      return /^([\w\d]+)/.exec(source);
    },
    parse(capture) {
      return {content: (capture[0] || '').trim()};
    },
    react(node, output, state) {
      const external = EXTERNAL_TYPES[node.content];
      const local = LOCAL_TYPES[node.content];
      if (external) {
        return (
          <a href={external}
             target="_blank"
             key={state.key}>
            {node.content}
          </a>
        );
      }
      if (local) {
        return (<Link to={local} key={state.key}>{node.content}</Link>);
      }
      return node.content;
    }
  },
  symbols: {
    order: 2,
    match(source) {
      return (/[\.\<\>,\s\|\*\(\)]+/).exec(source);
    },
    parse(capture) {
      return {content: (capture[0] || '').replace(/\.\</g, "<")};
    },
    react: Markdown.defaultRules.text.react
  }
});

const LinkedType = React.createClass({
  render() {
    const {content} = this.props;

    let rendered = "";

    if (content) {
      if (content.name) {
        rendered = content.name;
      }
      if (content.type) {
        const types = content.type.names.join(" | ");
        rendered = TYPE_RENDERER(types, {inline: true});
      }
    }

    return <span><strong>{rendered}</strong></span>;
  }
});

export default LinkedType;