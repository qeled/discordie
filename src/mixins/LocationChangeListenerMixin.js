import React from 'react';

export default {
  contextTypes: { router: React.PropTypes.object },
  componentDidMount() {
    this.unlistenHistory = this.context.router.listen(this.onLocationChange);
  },
  componentWillUnmount() {
    if (this.unlistenHistory) {
      this.unlistenHistory();
    }
  }
};
