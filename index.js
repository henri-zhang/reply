/*
* This module is a "simple way of getting user input in Node.js". It utilizes "readline" from the Node library.
*/
var rl, readline = require('readline');

var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}
/*
* @param {string} message - prompt displayed to user
* @param {function} callback - function to be called after
* @public
* @description asks user to confirm a message, input should lead to two options
*/
var confirm = exports.confirm = function(message, callback) {

  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  }

  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

/*
* @param {object} options - list of choices to select from and questions
* @param {function} callback - function to be called after user inputs
* @returns {error} requests user to pass in valid options object
* @public
* @description asks users questions in options and collects feedback
*/
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))
  
  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options);

  var done = function() {
    close_prompt();
    callback(null, answers);
  }

  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }
  /*
  * @param {string} key - description of question
  * @param {string} partial_answers - collected answers until call
  * @returns {string} default answer or the question again
  * @description if user does not provide input for questions, defaults will be used
  */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default; 
    else
      return options[key];
  }
  
  /*
  * @param {string} reply - user input
  * @returns {boolean | null} 
  * if reply is different than expected, guess_type will try to determine if it can be used as input
  */
  var guess_type = function(reply) {

    if (reply.trim() == '') // empty string
      return;
    else if (reply.match(/^(true|y(es)?)$/)) // accepts true, yes and y as confirmation answers
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }
  
  /* 
  * @param {string} key - description of question
  * @param {string} answer - user input
  * @returns {boolean}
  * @description tests if answer is allowable by option set 
  */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  }
  
  /*
  * @param {string} key - description of question
  * @description outputs error message if user does not adhere to valid options
  */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  }
  
  /*
  * @param {string} key - description of question
  * @description outputs prompt for set of questions in option
  */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  }

  // taken from commander lib
  /*
  * @param {string} prompt - message displayed to user
  * @param {function} callback - function to be called after prompt
  * @returns {function} 
  * @description listens for certain keypresses and responds accordingly
  */
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*';

    var keypress_callback = function(c, key) {

      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }

      if (key && key.ctrl && key.name == 'c')
        close_prompt();

      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\r\033[2K' + prompt + masked);
      } else {
        stdout.write(mask);
        buf += c;
      }

    };

    stdin.on('keypress', keypress_callback);
  }
  
  /*
  * @param {number} index - number of current question
  * @param {string} curr_key - description of current question
  * @param {string} fallback - default answer
  * @param {string} reply - user input
  * @description once reply is received, determines if it is acceptable in order to move onto next question
  */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    var return_answer = (typeof answer != 'undefined') ? answer : fallback; // not initialized until answer is, is answer if answer is not undefined, otherwise is fallback

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }
  
  /*
  * @param {object} conds - set of conditions necessary to meet
  * @returns {boolean}
  * @description ensures conditions are met in answers
  */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }

    return true;
  }

  /*
  * @param {number} index - number of current 
  * @param {string} prev_key - description of previous question
  * @param {string} answer - user input
  * @description accepts user input in relation to question and stops when there are no more questions
  */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined); // move onto next question if conditions not met
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] "; // shows default answer

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout);
  next_question(0);

  rl.on('close', function() {  //listen for "closes"
    close_prompt(); // just in case

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

}
