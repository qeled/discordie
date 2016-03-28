import React from 'react';
import SimpleMarkdown from 'simple-markdown';

import CodeBlock from '../components/docs/CodeBlock.js';

function createRules(defaultRules) {
  const linkRule = defaultRules.link;

  return {
    ...defaultRules,

    link: {
      ...linkRule,
      react(node, output, state) {
        return (
          <a key={state.key}
             href={SimpleMarkdown.sanitizeUrl(node.target)}
             title={node.title}
             target="_blank">
            {output(node.content, state)}
          </a>
        );
      }
    },

    codeBlockGFM: {
      order: SimpleMarkdown.defaultRules.codeBlock.order,
      match(source) {
        return /^```(([A-z0-9\-]+?)\n+)?\n*?([^]+?)```/.exec(source);
      },
      parse(capture) {
        return {
          lang: (capture[2] || '').trim(),
          content: (capture[3] || '').trim()
        };
      },
      react(node, output, state) {
        return (
          <CodeBlock key={state.key} lang={node.lang} content={node.content} />
        );
      }
    }
  };
}

function parserFor(rules) {
  const parser = SimpleMarkdown.parserFor(rules);
  const output = SimpleMarkdown.outputFor(SimpleMarkdown.ruleOutput(rules, "react"));
  return function(str, state = {}) {
    return output(parser(str + "\n\n", state));
  };
}

export default {
  defaultRules: SimpleMarkdown.defaultRules,
  createRules,
  parserFor,
  parse: parserFor(createRules(SimpleMarkdown.defaultRules))
};
