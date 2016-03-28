import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Navbar from './Navbar.js';
import Sidebar from './sidebar/Sidebar.js';
import Footer from './Footer.js';

import SidebarGroup from './sidebar/SidebarGroup.js';
import SidebarLink from './sidebar/SidebarLink.js';

const DocsLayout = React.createClass({
  mixins: [PureRenderMixin],

  contextTypes: { params: React.PropTypes.object },

  render() {
    const {page} = this.context.params;

    return (
      <div>
        <div class="tm-middle">
          <div class="uk-container uk-container-center">
            <div class="uk-grid">

              <div class="tm-sidebar uk-width-medium-1-4 uk-hidden-small">
                <Sidebar location={this.props.location} page={page}/>
              </div>

              <div class="tm-main uk-width-medium-3-4">
                <article class="uk-article">
                  {this.props.children}
                </article>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }
});


export default DocsLayout;