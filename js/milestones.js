const express = require("express");
const request = require("request-promise");
const moment = require("moment");
const numeral = require("numeral");
const Promise = require("bluebird");
const db = require("mongodb");
const server = require("../server");
const LastFM = require("../js/lastfm");

const router = express.Router();

router.post("/", (req, res) => {
  const name = req.body.user.trim();
  const step = isNaN(parseInt(req.body.step)) ? 10000 : parseInt(req.body.step);
  const showFirst = req.body.showFirst;
  const ref = req.body.ref;
  req.session.user = name;
  req.session.showFirst = showFirst;
  req.session.step = step;
  LastFM.getUserMilestones(name, step, showFirst, ref)
    .then(results => {
      console.log(results);
      res.render("milestones", {
        user: results.user,
        milestones: results.milestones,
        info: "info",
        title:
          `${name} ` + (req.body.ref ? "Suggested Milestone" : "Milestones"),
        session: req.session,
        ref: req.body.ref,
        moment: moment,
        numeral: numeral
      });
    })
    .catch(err => {
      showError(req, res, err.message, err);
    });
});

router.get("/", (req, res) => {
  const name = req.query.user;
  const step = req.query.step;
  if (name) {
    res.render("milestones_get", {
      name: name,
      step: step
    });
  } else res.redirect("/");
});

function showError(req, res, e, debug_e) {
  const options = req.body;
  if (!process.env.DEBUG) sendLog(options, IP, e, debug_e);
  req.session.error = e;
  res.redirect("/");
}

function sendLog(options, IP, error, debug_e) {
  let client = db.MongoClient;
  client
    .connect(
      process.env.MONGODB,
      {
        useNewUrlParser: true
      }
    )
    .then(client => {
      let db = client.db("lastmilestones");
      let collection = db.collection(
        process.env.DEBUG ? "requests" : "requests-release"
      );
      collection.insertOne({
        user: options.user,
        suggestedMilestone: options.ref,
        showFirst: options.showFirst,
        step: options.step,
        error: error,
        date: moment().toDate()
      });
    })
    .catch(err => {
      console.log(err);
    });
  const text = `🎉 <b>New Milestone Search</b> \n\n<b>Username:</b> ${
    options.user
  } \n<b>Step:</b> ${options.step}\n<b>Options: </b>${
    options.ref
      ? "suggested milestone"
      : options.showFirst
        ? "show first"
        : "none"
  }<b>\nPermalink:</b> http://lastmilestones.tk/milestones?user=${
    options.user
  }&step=${options.step}\n\n<b>${
    !error
      ? "No errors</b>"
      : "Error:</b>\n" + error + (debug_e ? debug_e.name + debug_e.message : "")
  }`;
  request({
    url: `https://api.telegram.org/bot${process.env.BOT_KEY}/sendMessage`,
    form: {
      chat_id: process.env.NEW_SEARCH_CHAT_ID,
      text: text,
      parse_mode: "HTML"
    },
    method: "POST"
  });
}
module.exports = router;
