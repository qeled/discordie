import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import ParameterTable from './ParameterTable.js';
import PropertyList from './PropertyList.js';
import PropertyDesc from './PropertyDesc.js';
import Markdown from '../../lib/Markdown.js';
import CodeBlock from './CodeBlock.js';

const ClassDefinition = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    const {smallHeader, src} = this.props;

    const capitalizedKind =
      src.kind.charAt(0).toUpperCase() + src.kind.slice(1);

    const children = src.children || [];
    const discordProperties = children.filter(c => c.kind == "discordproperty");
    const properties = children.filter(c => c.kind == "member");
    const methods = children.filter(c => c.kind == "function");

    const hasChildren =
      discordProperties.length ||
      properties.length ||
      methods.length;

    const title = `${capitalizedKind}: ${src.name}`;

    let examples = (src.examples || []).map((example, i) => {
      return <CodeBlock key={i} lang="js" content={example} />;
    });

    const rendered = (
      <div>
        {smallHeader ? <h3>{title}</h3> : <h1>{title}</h1>}

        <ParameterTable content={src} />

        {src.description ? Markdown.parse(src.description) : ""}

        <PropertyList name="Discord Properties" list={discordProperties}
                      linkable={false} />
        <PropertyList name="Properties" list={properties}/>
        <PropertyList name="Methods" list={methods}/>
        {hasChildren ? <hr/> : ""}

        <PropertyDesc name="Properties" list={properties}/>
        <PropertyDesc name="Methods" list={methods}/>

        {examples}
        <hr/>
      </div>
    );

    return rendered;
  }
});

export default ClassDefinition;