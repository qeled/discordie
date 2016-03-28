import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, Redirect, RouteHandler, IndexRoute, NotFoundRoute, hashHistory} from 'react-router';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import './styles/index.scss';

import Layout from './components/Layout.js';
import Landing from './components/Landing.js';
import DocsLayout from './components/DocsLayout.js';
import DocsContent from './components/DocsContent.js';

import ga from 'react-ga';
ga.initialize("UA-75607394-1");
function onPageView() { ga.pageview(this.state.location.pathname); }

ReactDOM.render(
  <Router history={hashHistory} onUpdate={onPageView}>
    <Route component={Layout}>
      <Route path="/" component={Landing} />
      <Route path="/docs/" component={DocsLayout}>
        <Route path="/docs/:page" component={DocsContent} />
      </Route>
    </Route>
  </Router>,

  document.getElementById("app-mount")
);
