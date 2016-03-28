import React from 'react';
import {Link} from 'react-router';

const LINK_JSDOCP = <a href="https://github.com/jsdoc2md/jsdoc-parse">jsdoc-parse</a>;
const LINK_REACT = <a href="https://facebook.github.io/react/">React.js</a>;
const LINK_UIKIT = <a href="http://getuikit.com/">UIkit</a>;

const footerlinks = [
  {link: "/", name: "Home"},
  {href: "https://github.com/qeled/discordie", name: "GitHub"},
];

const Footer = React.createClass({
  render() {
    const links = footerlinks.map((element, key) => {
      const link = element.link ?
        <Link to={element.link}>{element.name}</Link> :
        <a href={element.href} target="_blank">{element.name}</a>;

      return (<li key={key}>{link}</li>);
    });

    return (
      <footer>
        <div class="uk-container uk-container-center uk-text-center">
          <div class="tm-footer-title">Discordie</div>

          <ul class="uk-subnav uk-subnav-line uk-flex-center">
            {links}
          </ul>

          <br/>
          <div>
            Documentation made with {LINK_JSDOCP}, {LINK_REACT} and {LINK_UIKIT}.
          </div>
        </div>
      </footer>
    );
  }
});


export default Footer;