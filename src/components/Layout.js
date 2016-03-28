import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Navbar from './Navbar.js';
import Sidebar from './sidebar/Sidebar.js';
import Footer from './Footer.js';

const Layout = React.createClass({
  mixins: [PureRenderMixin],

  childContextTypes: {
    params: React.PropTypes.object,
    location: React.PropTypes.object
  },
  getChildContext() {
    return {
      params: this.props.params,
      location: this.props.location
    };
  },

  render() {
    const {page} = this.props.params;

    return (
      <div>
        <Navbar/>

        {this.props.children}

        <div id="doc-offcanvas" class="uk-offcanvas">
          <div class="uk-offcanvas-bar">
            <Sidebar location={this.props.location} page={page}
                     offcanvas={true}/>
          </div>
        </div>

        <Footer />
      </div>
    );
  }
});


export default Layout;