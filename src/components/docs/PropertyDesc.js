import React from 'react';
import {Link} from 'react-router';
import ScrollerElement from '../ScrollerElement.js';

import Markdown from '../../lib/Markdown.js';
import CodeBlock from './CodeBlock.js';
import Docs from '../../lib/Docs.js';

import LinkedType from './LinkedType.js';
import ParameterTable from './ParameterTable.js';

import {REPO_ROOT} from '../../Constants.js';
function repoLink(meta) {
  return REPO_ROOT + meta.path + "/" + meta.filename + "#L" + meta.lineno;
}

const PropertyDesc = React.createClass({
  contextTypes: { location: React.PropTypes.object },

  createPermalink(c) {
    const location = this.context.location;
    let params = {
      pathname: location.pathname,
      query: {p: c.id}
    };
    return params;
  },
  render() {
    const {name, list} = this.props;

    const title =
      list.length ?
        <h2><strong>{name}</strong></h2> :
        "";

    const definitions = list.map((c, i) => {
      let functionParams = Docs.formatFunctionParams(c);
      let returns = (c.returns || [])[0];

      let description = c.description;

      let examples = (c.examples || []).map((example, i) => {
        return <CodeBlock key={i} lang="js" content={example} />;
      });

      return (
        <ScrollerElement name={c.id} key={i}>
          <h4 class="monospace doc-prop-name">
            <span class="doc-icon-links">
              <a href={repoLink(c.meta)} _target="blank">
                <i class="doc-icon icon-source"/>
              </a>
              <Link to={this.createPermalink(c)} _target="blank">
                <i class="doc-icon icon-link"/>
              </Link>
            </span>

            { !c.readonly ? "" :
              <span class="badge badge-getter">getter</span> }

            { /*c.kind != "function" ? "" :
              <span class="badge badge-method">method</span>*/ }

            <strong>
              .{c.name + functionParams}
            </strong>
          </h4>

          <div class="doc-definition">
            <ParameterTable content={c} />

            {description ?
              Markdown.parse(description) :
              <div class="paragraph doc-no-description">No description.</div>}

            <div class="paragraph">
              <strong>Returns: </strong>
              <span class="monospace">
                {returns ? <LinkedType content={returns}/> : "void"}
              </span>
            </div>

            <div>{examples.length ? <strong>Example:</strong> : ""}</div>
            {examples}
          </div>

          <br/>
        </ScrollerElement>
      );
    });

    return (
      <div>
        {title}
        {definitions}
        {list.length ? <br/> : ""}
      </div>
    );
  }
});

export default PropertyDesc;