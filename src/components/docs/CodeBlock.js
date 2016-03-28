import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import 'style!css!highlight.js/styles/github.css';
import hljs from 'highlight.js';

const CodeBlock = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    const {lang, content} = this.props;

    if (lang && hljs.getLanguage(lang)) {
      const code = hljs.highlight(lang, content);
      return (
        <pre>
          <code class={`hljs ${code.language}`}
                dangerouslySetInnerHTML={{__html: code.value}} />
        </pre>
      );
    }
    return <pre><code class="hljs">{content}</code></pre>;
  }
});

export default CodeBlock;