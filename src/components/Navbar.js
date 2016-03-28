import React from 'react';
import {Link} from 'react-router';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import LocationChangeListenerMixin from '../mixins/LocationChangeListenerMixin.js';

import {GITHUB_STAR_FRAME, DISCORD_INVITE, DISCORD_INVITE_BADGE} from '../Constants.js';

const navlinks = [
  {link: "/", name: "Home"},
  {link: "/docs/GettingStarted.md", name: "Getting Started"},
  {link: "/docs/Discordie", name: "Documentation", match: /^\/docs\/(?!.*\.md)/},
  {href: "https://github.com/qeled/discordie", name: "GitHub"},
];

const Navbar = React.createClass({
  mixins: [PureRenderMixin, LocationChangeListenerMixin],

  getInitialState() {
    return {location: {}};
  },
  onLocationChange(nextLocation) {
    this.setState({location: nextLocation});
  },

  render() {
    const {location} = this.state;
    const {hamburger = true} = this.props;

    const links = navlinks.map((element, key) => {
      let link = element.link ?
        <Link to={element.link}>{element.name}</Link> :
        <a href={element.href} target="_blank">{element.name}</a>;

      const isActive = element.match ?
        element.match.test(location.pathname) :
        location.pathname && location.pathname === element.link;

      const activeClass = isActive ? "uk-active" : "";

      return (<li class={activeClass} key={key}>{link}</li>);
    });


    const supStyle = {
      position: "relative",
      fontSize: "9px",
      marginLeft: "-83px",
      top: "10px",
      opacity: "0.5"
    };

    return (
      <nav class="tm-navbar uk-navbar uk-navbar-attached">
        <div class="uk-container uk-container-center">

          <Link class="uk-navbar-brand uk-hidden-small" to="/">
            Discordie
            <sub style={supStyle}>unofficial API wrapper</sub>
          </Link>

          <ul class="uk-navbar-nav uk-hidden-small">
            {links}
          </ul>

          <div class="uk-navbar-flip uk-hidden-small">
            <div class="tm-navbar-aux-button">
              <a href={DISCORD_INVITE} target="_blank" class="uk-margin">
                <img src={DISCORD_INVITE_BADGE}
                     alt="Join #node_discordie in [Discord API]"/>
              </a>
            </div>
            <div class="tm-navbar-aux-button">
              <iframe src={GITHUB_STAR_FRAME} frameBorder="0" scrolling="0" />
            </div>
          </div>

          { !hamburger ? "" :
              <a class="uk-navbar-toggle uk-visible-small"
                 data-uk-offcanvas="{target: '#doc-offcanvas'}"/> }

          <Link to="/" class="uk-navbar-brand uk-navbar-center uk-visible-small">
            Discordie
          </Link>

        </div>
      </nav>
    );
  }
});


export default Navbar;