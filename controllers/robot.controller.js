const { Security } = require("../models");
const { Robot } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

// function create security
module.exports.run = async function(req, res) {
  const CDP = require("chrome-remote-interface");

  CDP(client => {
    // Extract used DevTools domains.
    const { Page, Runtime } = client;

    // Enable events on domains we are interested in.
    Promise.all([Page.enable()]).then(() => {
      return Page.navigate({ url: "http://mainapi.berkreatifitas.com" });
    });

    // Evaluate outerHTML after page has loaded.
    Page.loadEventFired(() => {
      Runtime.evaluate({ expression: "document.body.outerHTML" }).then(
        result => {
          console.log(result.result.value);
          client.close();
        }
      );
    });
  }).on("error", err => {
    console.error("Cannot connect to browser:", err);
  });
};
