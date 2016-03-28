import React from 'react';

import Docs from '../../lib/Docs.js';
import Markdown from '../../lib/Markdown.js';

import LinkedType from './LinkedType.js';

const ParameterTable = React.createClass({
  render() {
    const {content} = this.props;

    const list = content.params || content.properties;
    if (!list || !list.length)
      return <span></span>;

    let parameters = list.map((c, i) =>
      <tr key={i}>
        <td class="monospace">{c.name}</td>
        <td>
          <div class="monospace">
            <LinkedType content={c} />
          </div>
          {Markdown.parse(c.description || "", {inline: true})}
        </td>
      </tr>
    );

    return (
      <table class="doc-parameters" key={content.name}>
        <thead>
        <tr>
          <th>{content.kind == "event" ? "Properties" : "Parameters"}</th>
          <th></th>
        </tr>
        </thead>
        <tbody>
          {parameters}
        </tbody>
      </table>
    );
  }
});

export default ParameterTable;