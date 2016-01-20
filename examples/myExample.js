var reply = require('./../');

var opts = {
  name: {
    message: "What's your name?",
  },
  home: {
    message: "Where do you live?",
    default: "Seattle"
  },
  major: {
      message: "What's your intended major?",
      default: "Informatics"
  }
}

reply.confirm ("Will you tell me a little more about yourself?", function(err, yes) {  
  if (!err && yes) {
    console.log("Let's begin!");
  } else {
    console.log("Go study more.");
  }
