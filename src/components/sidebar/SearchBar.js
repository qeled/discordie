import React from 'react';

import Docs from '../../lib/Docs';

const AllDocs = Docs.groups.all;
const Classes = Docs.groups.classes;
const Interfaces = Docs.groups.interfaces;
const Events = Docs.groups.events;

function filterDocs(result, filter) {
  AllDocs.forEach(e => {
    [].push.apply(result, (e.children || []).filter(filter));
  });
}

const SearchBar = React.createClass({
  propTypes: { onSearchResults: React.PropTypes.func },

  _updateSearchState(newState) {
    this.setState(newState);
    if (typeof this.props.onSearchResults !== "function") return;
    this.props.onSearchResults(newState);
  },

  getInitialState() {
    return {search: "", searchResults: {}};
  },
  clearSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.refs["searchInput"].value = "";
    this._updateSearchState(this.getInitialState());
  },
  onSearch(e) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    const searchString = e.target.value;
    this.searchTimeout = setTimeout(() => {
      this.searchTimeout = null;
      if (this.state.search != searchString) {
        this._updateSearchState(this.performSearch(searchString));
      }
    }, 300);
    // 300ms timeout for user input
  },
  performSearch(search) {
    const re = new RegExp(search, "i");

    const results = {};

    filterDocs(results.methods = [],
      m => m.kind === "function" && re.test(m.name)
    );
    filterDocs(results.properties = [],
      m => m.kind !== "function" && re.test(m.name)
    );

    results.classes = Classes.filter(e => re.test(e.name));
    results.interfaces = Interfaces.filter(e => re.test(e.name));
    results.events = Events.filter(e => re.test(e.name));

    return {search, searchResults: results};
  },

  render() {
    return (
      <form class="tm-search uk-form">
        <input type="text" placeholder="Search"
               ref="searchInput"
               onChange={this.onSearchChange}
               onKeyUp={this.onSearch} />
        { !this.state.search.length ?
            <div class="icon icon-search"></div> :
            <a onClick={this.clearSearch}><div class="icon icon-x"></div></a> }
      </form>
    );
  }
});


export default SearchBar;