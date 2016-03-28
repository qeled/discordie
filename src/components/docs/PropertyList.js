import React from 'react';
import {Link} from 'react-router';

import Docs from '../../lib/Docs.js';

import LinkedType from './LinkedType.js';

const PropertyList = React.createClass({
  contextTypes: { location: React.PropTypes.object },
  createAnchorLink(c) {
    return {
      pathname: this.context.location.pathname,
      query: {p: c.id}
    };
  },

  render() {
    const {name, list, linkable=true} = this.props;

    const title =
      list.length ?
        <h4><strong>{name}</strong></h4> :
        "";

    const toc = list.map((c, i) => {
      let functionParams = Docs.formatFunctionParams(c);
      let returns = (c.returns || [])[0];

      const signature = "." + c.name + functionParams;

      return (
        <li key={i} class="toc">
          {!linkable ? signature :
            <Link to={this.createAnchorLink(c)}>{signature}</Link> }

          {returns ? " => " : ""}

          <span class="monospace">
            <LinkedType content={returns}/>
          </span>
        </li>
      );
    });

    return (
      <div>
        {title}
        <ul>{toc}</ul>
        {list.length ? <br/> : ""}
      </div>
    );
  }
});

export default PropertyList;