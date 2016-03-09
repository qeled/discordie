# Discordie changelog

## 2016-03-09, Version 0.3.0

Notable changes:

  - Memory and CPU usage has been reduced greatly;
  - Implemented caching of member interfaces;
  - Messages are sorted on insertion using binary sort, sorting after fetching
    is removed;
  - `JSON.stringify` on interfaces returns a copy of raw model data instead
    of stringifying models recursively;
  - Interfaces can now be properly formatted (inspected) using `console.log`
    and `util.inspect`;

Fixes:

  - Fix voice state tracking on `READY` for clients in multiple servers;
  - Cache voice server address on connect and no longer attempt to resolve
    hostname during UDP packet send calls;
  - Fix `DirectMessageChannels.getOrOpen(recipient)` crashing on node 5.7.0;


## 2016-02-27, Version 0.2.1

Performance:

  - Improve performance of `<Collection>.get`;

Fixes:

  - Fix voice leave or disconnect crashing the library when called for voice
    connections on secondary gateways;
