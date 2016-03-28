import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import ga from 'react-ga';

import SidebarGroup from './SidebarGroup.js';
import SidebarLink from './SidebarLink.js';
import SearchBar from './SearchBar.js';
import Docs from '../../lib/Docs';
import Pages from '../../data/pages.js';

const AllDocs = Docs.groups.all;
const Classes = Docs.groups.classes;
const Interfaces = Docs.groups.interfaces;
const Events = Docs.groups.events;

const Sidebar = React.createClass({
  mixins: [PureRenderMixin],

  getInitialState() {
    return {search: "", searchResults: []};
  },
  onSearchResults({search, searchResults}) {
    if (search) {
      const encodedSearch = encodeURIComponent(search);
      ga.pageview("/__search?_q=" + encodedSearch);
    }
    this.setState({search, searchResults});
  },

  renderSearch() {
    let key = 0;
    const results = this.state.searchResults;
    const renderedSearch = [];

    function renderSection(name, data, renderer) {
      if (!data.length) return;
      renderedSearch.push(<SidebarGroup name={name} key={key++}/>);
      Array.prototype.push.apply(renderedSearch, data.map(renderer));
    }

    renderSection(
      "methods", results.methods,
      c => this.renderProperty(c, key++)
    );
    renderSection(
      "properties", results.properties,
      c => this.renderProperty(c, key++)
    );

    for (const group of ["classes", "interfaces", "events"]) {
      if (!results[group].length) continue;
      renderSection(group, results[group], c => this.renderClass(c, key++));
    }

    if (!renderedSearch.length) {
      renderedSearch.push(<SidebarGroup name="No results" key={key++}/>);
    }

    return renderedSearch;
  },

  isActive(name) {
    return this.props.page == name || this.props.location.query.p == name;
  },
  renderClass(element, key) {
    return (
      <SidebarLink
        key={key}
        name={element.name}
        to={"/docs/" + element.name}
        active={this.isActive(element.name)}/>
    );
  },
  renderProperty(element, key) {
    return (
      <SidebarLink
        key={key}
        name={element.name}
        memberOf={element.memberof}
        to={{
          pathname: "/docs/" + element.memberof,
          query: {p: element.id}
        }}
        active={this.isActive(element.id)}/>
    );
  },
  renderPageLink(element, key) {
    if (element.remote) {
      return (
        <SidebarLink
          key={key}
          name={element.name}
          to={"/docs/" + element.slug}
          active={this.isActive(element.slug)}/>
      );
    }

    return (
      <SidebarLink
        key={key}
        name={element.name}
        to={"/docs/" + element.file}
        active={this.isActive(element.file)}/>
    );
  },

  render() {
    const {offcanvas} = this.props;

    const classes = (Classes || []).map(this.renderClass);
    const interfaces = (Interfaces || []).map(this.renderClass);
    //const events = (Events || []).map(this.renderClass);

    const pages = (Pages || []).map(this.renderPageLink);

    const renderClass = "tm-nav uk-nav" +
      (offcanvas ? " uk-nav-offcanvas" : "");

    let sidebarContent = "";
    if (this.state.search.length) {
      sidebarContent = (
        <ul class={renderClass}>
          {this.renderSearch()}
        </ul>
      );
    } else {
      sidebarContent = (
        <ul class={renderClass}>
          <SidebarGroup name="General"/>
          {pages}

          <SidebarGroup name="Events"/>
          <SidebarLink name="Events"
                       to="/docs/Events"
                       active={this.isActive("Events")}/>

          <SidebarGroup name="Classes"/>
          {classes}

          <SidebarGroup name="Interfaces"/>
          {interfaces}
        </ul>
      );
    }

    return (
      <div>
        <SearchBar onSearchResults={this.onSearchResults}/>
        {sidebarContent}
      </div>
    );
  }
});


export default Sidebar;