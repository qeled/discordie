import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Markdown from '../lib/Markdown.js';

const pages = require.context("text!../data/pages", false, /\.md$/);

const MarkdownPage = React.createClass({
  mixins: [PureRenderMixin],

  render() {
    const {filename} = this.props;
    const file = pages("./" + filename);

    return (<div>{Markdown.parse(file)}</div>);
  }
});


export default MarkdownPage;