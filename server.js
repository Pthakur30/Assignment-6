const HTTP_PORT = process.env.PORT || 3000;
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const handlebars = require("express-handlebars");
const clientSessions = require("client-sessions");
var bcrypt = require("bcryptjs");
const app = express();
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const registration = mongoose.createConnection(
  "mongodb+srv://pratham30_:CHPLTtjE1fT7IaP2@assignment4a.t8t0fmt.mongodb.net/?retryWrites=true&w=majority"
);
const blog = mongoose.createConnection(
  "mongodb+srv://pratham30_:CHPLTtjE1fT7IaP2@assignment4a.t8t0fmt.mongodb.net/?retryWrites=true&w=majority"
);

app.use(express.static("img"));

const registration_schema = new Schema({
  fname: String,
  lname: String,
  email: String,
  username: {
    type: String,
    unique: true,
  },
  Address1: String,
  Address2: String,
  city: String,
  postal: String,
  country: String,
  password: {
    type: String,
    unique: true,
  },
});

const blog_schema = new Schema({
  title: String,
  date: String,
  content: String,
  image: String,
});

const customer = registration.model("registration", registration_schema);
const blogcon = blog.model("blog_db", blog_schema);

app.engine(".hbs", handlebars.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  clientSessions({
    cookieName: "session",
    secret: "assignment06",
    duration: 5 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);

// setup a 'route' to listen on the default url path
app.get("/", (req, res) => {
  blogcon
    .find()
    .exec()
    .then((data) => {
      let datalog = new Array();
      data.forEach((element) => {
        datalog.push({
          title: element.title,
          date: element.date,
          content: element.content,
          image: element.image,
        });
      });
      res.render("blog", { title: datalog, layout: false });
    });
});

app.get("/admin", ensureLogin, (req, res) => {
  res.render("Administrator", { layout: false });
});

function ensureLogin(req, res, next) {
  if (!req.session.admindata) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.post("/admin", (req, res) => {
  console.log(req.body.img);
  let articleData = new blogcon({
    title: req.body.title,
    date: req.body.date,
    content: req.body.content,
    image: req.body.img,
  }).save((e, data) => {
    if (e) {
      console.log(e);
    } else {
      console.log(data);
    }
  });
  res.redirect("/");
});

app.post("/article", function (req, res) {
  blogcon
    .findOne({ title: req.body.title })
    .exec()
    .then((data) => {
      res.render("read_more", {
        image: data.image,
        id: data._id,
        read: data.content,
        title: data.title,
        date: data.date,
        layout: false,
      });
    });
});

app.post("/update", ensureLogin, (req, res) => {
  blogcon
    .updateOne(
      {
        _id: req.body.ids,
      },
      {
        $set: {
          title: req.body.title,
          date: req.body.dat,
          content: req.body.content,
          image: req.body.img,
        },
      }
    )
    .exec();
  res.redirect("/");
});

app.get("/login", function (req, res) {
  res.sendFile(path.join(__dirname, "/login.html"));
});
app.post("/login", (req, res) => {
  var userdata = {
    user: req.body.username,
    pass: req.body.password,
    expression: /[~`!#@$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(
      req.body.username
    ),
  };

  if (userdata.user == "" || userdata.pass == "") {
    res.render("login", { data: userdata, layout: false });
    return;
  }

  if (userdata.expression) {
    res.render("login", { data: userdata, layout: false });
    return;
  }

  customer
    .findOne({ username: userdata.user }, [
      "fname",
      "lname",
      "username",
      "password",
    ])
    .exec()
    .then((data) => {
      bcrypt.compare(userdata.pass, data.password).then((result) => {
        // result === true
        console.log(result);
        if (result) {
          if (data.id == "638629d92da8e5147fa62b0d") {
            req.session.admindata = {
              username: userdata.user,
              password: userdata.pass,
            };
            console.log("Admin-session created");
            res.render("login_Dashboard", {
              fname: data.fname,
              lname: data.lname,
              username: data.username,
              layout: false,
            });
            return;
          } else {
            req.session.userdata = {
              username: userdata.user,
              password: userdata.pass,
            };
            res.render("loginuser_Dashboard", {
              fname: data.fname,
              lname: data.lname,
              username: data.username,
              layout: false,
            });
            return;
          }
        } else {
          res.render("login", {
            error: "Sorry, you entered the wrong username and/or password",
            layout: false,
          });
          return;
        }
      });
    });
});

app.get("/logout", function (req, res) {
  console.log("Logout");
  req.session.reset();
  res.redirect("/login");
});

app.get("/registration", function (req, res) {
  res.sendFile(path.join(__dirname, "/registration.html"));
});
app.post("/registration", (req, res) => {
  var userdata = {
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    phonenumber: req.body.phonenumber,
    city: req.body.city,
    phonetest: /^\d{10}$/.test(req.body.phonenumber),
    Address1: req.body.Address1,
    Address2: req.body.Address2,
    postalcode: req.body.postalcode,
    postaltest:
      /^[AaBbCcEeGgHiJjKkLlMmNnPpRrSsTtVvXxYy]\d[A-Za-z] \d[A-Za-z]\d$/.test(
        req.body.postalcode
      ),
    country: req.body.country,
    password: req.body.password,
    passwordtest: /^[0-9a-zA-Z]{6,12}$/.test(req.body.password),
    confirmpassword: req.body.confirmpassword,
  };

  var checkpass = () => {
    if (userdata.password == userdata.confirmpassword) {
      return true;
    }
    return false;
  };

  userdata.checkpassword = checkpass;

  if (
    userdata.fname == "" ||
    userdata.lname == "" ||
    userdata.email == "" ||
    userdata.phonenumber == "" ||
    userdata.Address1 == "" ||
    userdata.city == "" ||
    userdata.postalcode == "" ||
    userdata.country == "" ||
    userdata.password == "" ||
    userdata.confirmpassword == ""
  ) {
    res.render("registration", { data: userdata, layout: false });
    return;
  }

  if (!userdata.phonetest) {
    res.render("registration", { data: userdata, layout: false });
    return;
  }
  if (!userdata.postaltest) {
    res.render("registration", { data: userdata, layout: false });
    return;
  }
  if (!userdata.passwordtest) {
    res.render("registration", { data: userdata, layout: false });
    return;
  }
  if (!userdata.checkpassword) {
    res.render("registration", { data: userdata, layout: false });
    return;
  }

  var username = "";
  for (let index = 0; index < userdata.email.length; index++) {
    const element = userdata.email[index];
    if (element != "@") {
      username += element;
    }
    if (element == "@") {
      break;
    }
  }

  bcrypt.hash(userdata.password, 10).then((hash) => {
    let useaccount = new customer({
      fname: userdata.fname,
      lname: userdata.lname,
      email: userdata.email,
      username: username,
      Address1: userdata.Address1,
      Address2: userdata.Address2,
      city: userdata.city,
      postal: userdata.postalcode,
      country: userdata.country,
      password: hash,
    }).save((e, data) => {
      if (e) {
        console.log(e);
      } else {
        console.log(data);
      }
    });
    console.log(hash);
  });

  res.render("dashboard", { layout: false });
});

// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT);
