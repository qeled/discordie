import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Markdown from '../lib/Markdown.js';

const cache = {};

const RemoteMarkdownPage = React.createClass({
  mixins: [PureRenderMixin],

  getInitialState() {
    return {loading: true, status: 0, content: ""};
  },

  componentDidMount() {
    const {slug, remote} = this.props;

    if (cache[slug]) {
      return this.setState({
        loading: false,
        status: 200, content: cache[slug]
      });
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', remote, true);
    xhr.onload = e => {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 200) {
        cache[slug] = xhr.responseText;
      }
      this.setState({
        loading: false,
        status: xhr.status, content: xhr.responseText
      });
    };
    xhr.onerror = e => {
      this.setState({
        loading: false,
        status: xhr.statusText || xhr.status, content: ""
      });
    };
    xhr.send();
  },

  renderError() {
    return (
      <div class="uk-alert uk-alert-danger">
        <p>
          <strong>Error {this.state.status}: </strong>
          Could not retreive {this.props.remote}
        </p>
      </div>
    );
  },

  render() {
    let content = (
      <div class="doc-remote-loading-spinner">
        <div class="cube1"></div>
        <div class="cube2"></div>
      </div>
    );

    if (!this.state.loading) {
      if (this.state.status && this.state.status !== 200) {
        content = this.renderError();
      } else {
        content = Markdown.parse(this.state.content);
      }
    }

    return (<div>{content}</div>);
  }
});


export default RemoteMarkdownPage;