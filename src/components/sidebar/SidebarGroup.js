import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

const SidebarGroup = React.createClass({
  mixins: [PureRenderMixin],
  render() {
    return <li class="uk-nav-header">{this.props.name}</li>;
  }
});

export default SidebarGroup;