"use strict";
module.exports = {
  createArrayBuffer(source) {
    const view = new Uint8Array(new ArrayBuffer(source.length));
    for (let i = 0; i < view.length; i++)
      view[i] = source[i];
    return view.buffer;
  },
  createBuffer(source) {
    if (source instanceof Float32Array) {
      const buf = new Buffer(source.length * 4);
      for (let i = 0; i < source.length; i++) {
        buf.writeFloatLE(source[i], i * 4);
      }
      return buf;
    }

    const view = new Uint8Array(source);
    const buf = new Buffer(view.length);
    for (let i = 0; i < view.length; i++)
      buf[i] = view[i];
    return buf;
  },
  bindGatewayEventHandlers(source, event, map) {
    if (!event.type)
      throw new Error("Invalid event");

    if (!(event.type in map))
      return;

    for (let k in map) {
      if (typeof map[k] !== "function")
        throw new Error(`Invalid handler ${k} for event ${event.type}`);
      map[k] = map[k].bind(source);
    }

    if (map[event.type](event.data))
      event.handled = true;
  },
  privatify(target) {
    for (var k in target) {
      if (k[0] != "_")
        continue;
      Object.defineProperty(target, k, {enumerable: false});
    }
  },
  reorderObjects(array, target, position) {
    array = array.slice();
    array.sort((a, b) => (a.position > b.position));
    const from = Math.max(array.findIndex(c => (c.id == target.id)), 0);
    const to = Math.min(Math.max(position, 0), array.length - 1);

    if (from == to) return;

    const remove = (i) => array.splice(i, 1)[0];
    const insert = (i, v) => array.splice(i, 0, v);

    insert(to, remove(from));

    const updated = array.map((c, i) => ({id: c.valueOf(), position: i}));
    const changes = to > from ?
      updated.slice(from, to + 1) :
      updated.slice(to, from + 1);

    return changes;
  },
  imageToDataURL(buffer) {
    if (!buffer || !(buffer instanceof Buffer)) return null;

    const types = {
      0xFFD8FF: "image/jpg",
      0x89504E: "image/png"
    };

    const magic = buffer.readUIntBE(0, 3);
    const type = types[magic];
    if (!type) return null;

    return `data:${type};base64,` + buffer.toString("base64");
  }
};
