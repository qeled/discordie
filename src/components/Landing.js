import React from 'react';
import {Link} from 'react-router';
import CodeBlock from './docs/CodeBlock.js';

const example = `
var Discordie = require("discordie");
var client = new Discordie();

client.connect({ token: "" });

client.Dispatcher.on("GATEWAY_READY", e => {
  console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on("MESSAGE_CREATE", e => {
  if (e.message.content == "ping")
    e.message.channel.sendMessage("pong");
});
`.slice(1);

const Landing = React.createClass({
  render() {
    return (
      <div>
        <div class="tm-landing-section">
          <div class="uk-container uk-container-center uk-text-center">
            <div class="tm-brand-name tm-pad-bottom">
              Discordie
            </div>

            <div class="uk-text-large tm-pad-bottom">
              Predictable JavaScript abstractions for Discord API.
            </div>

            <div class="tm-installation tm-pad-bottom">
              <pre><code>npm install discordie</code></pre>
            </div>

            <Link to="/docs/GettingStarted.md"
                  class="tm-landing-button">Try it now</Link>
          </div>
        </div>

        <div class="tm-landing-section tm-landing-section-secondary">
          <div class="uk-container uk-container-center uk-text-center">
            <h1 class="uk-heading-large">Get Started</h1>

            <div class="tm-example">
              <CodeBlock lang="js" content={example} />
            </div>

            <a href="https://github.com/qeled/discordie/tree/master/examples"
               target="_blank"
               class="tm-landing-button">More Examples</a>

            <Link to="/docs/Discordie"
                  class="tm-landing-button">Proceed to documentation</Link>
          </div>
        </div>
      </div>
    );
  }
});


export default Landing;