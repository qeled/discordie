import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {scroller} from 'react-scroll';

import LocationChangeListenerMixin from '../mixins/LocationChangeListenerMixin.js';

import Docs from '../lib/Docs';
import Pages from '../data/pages.js';

import ClassDefinition from './docs/ClassDefinition.js';
import MarkdownPage from './MarkdownPage.js';
import RemoteMarkdownPage from './RemoteMarkdownPage.js';

const docs = Docs.groups.all;
const events = docs.filter(e => e.kind == "event");

const DocsContent = React.createClass({
  mixins: [LocationChangeListenerMixin],

  shouldComponentUpdate(nextProps) {
    return this.props.params.page !== nextProps.params.page;
  },

  scrollToElement(name) {
    // scrollTo(to, animate, duration, offset)
    try {
      scroller.scrollTo(name, true, 400, -20);
      return true;
    } catch (e) {
      console.warn(`DocsContent: Scroll element ${name} does not exist yet`);
    }
    return false;
  },

  componentDidMount() {
    this.componentDidUpdate();
  },
  componentWillUnmount() {
    window.scrollTo(0, 0);
  },
  componentDidUpdate(prevProps) {
    const thisAnchor = this.props.location.query.p;
    if (thisAnchor) {
      this.scrollToElement(thisAnchor);
    } else {
      window.scrollTo(0, 0);
    }
  },
  onLocationChange(nextLocation) {
    const nextAnchor = nextLocation.query.p;
    if (nextAnchor) {
      if (!this.scrollToElement(nextAnchor)) {
        window.scrollTo(0, 0);
      }
    }
  },

  render() {
    const {page} = this.props.params;

    if (/\.md$/.test(page)) {
      const remote = Pages.find(e => e.slug === page && e.remote);
      if (remote) {
        return (<RemoteMarkdownPage {...remote}/>)
      }
      return (<MarkdownPage filename={page}/>);
    }

    const src = docs.find(e => e.name == page);
    if (src) {
      return (<ClassDefinition src={src}/>);
    }

    if (page == "Events") {
      const content = events.map((c, i) =>
        <ClassDefinition src={c} key={i} smallHeader={true}/>
      );

      return <div>{content}</div>;
    }
  }
});

export default DocsContent;