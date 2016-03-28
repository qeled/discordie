import React from 'react';
import ReactDOM from 'react-dom';
import {scroller} from 'react-scroll';

// original Element doesn't handle prop changes when mounted

const ScrollerElement = React.createClass({
  propTypes: {
    name: React.PropTypes.string.isRequired
  },

  componentDidMount: function() {
    var domNode = ReactDOM.findDOMNode(this);
    scroller.register(this.props.name, domNode);
  },
  componentDidUpdate() {
    this.componentDidMount();
  },

  componentWillUnmount: function() {
    scroller.unregister(this.props.name);
  },
  componentWillReceiveProps() {
    this.componentWillUnmount();
  },

  render: function() {
    return React.DOM.div(this.props, this.props.children);
  }
});

export default ScrollerElement;