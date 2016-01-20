var reply = require ('./../');

var options = {
    name: {
        message: "What's your name?",
    },
    home: {
        message: "Where do you live?",
        default: "Seattle"
    },
    year: {
        message: "What year are you?",
        options: ["Freshman", "Sophomore", "Junior", "Senior"]
    },
    if_freshman: {
        message: "How are you liking college?",
        depends_on: {
            year: "Freshman",
        }
    },
    major: {
        message: "What's your major?",
        default: "Informatics"
    }
}

reply.confirm ("Will you tell me a little more about yourself?", function(err, yes) {
    if (!err && yes) {
        console.log("Let's begin!");
    } else {
        console.log("Hope to talk more later!");
        return;
    }
    
    reply.get (options, function (err, answer) {
        if (err) return;
        console.log("Your information:");
        console.log(answer);
    });
});