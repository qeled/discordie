import React from 'react';
import {Link} from 'react-router';
import PureRenderMixin from 'react-addons-pure-render-mixin';

const SidebarLink = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    const activeClass = this.props.active ? "uk-active" : "";
    const {to, name, memberOf} = this.props;
    return (
      <li class={activeClass}>
        <Link to={to || "/"}>
          <div class="doc-memberof">{memberOf}</div>
          {name}
        </Link>
      </li>
    );
  }
});

export default SidebarLink;