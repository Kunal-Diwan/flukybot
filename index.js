<html>
<!-- The license of this page is MIT License -->
<head>
  <title>Flukybot</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.4;font-size:16px;color:#444;padding:0 10px}h1,h2,h3{font-family: sans-serif; line-height:1.2}</style>
</head>

<body>
  <h1>Run a Bot locally in your browser</h1>
  <p>This page will run a Telegram bot locally in your web browser. Just enter your bot token from <a href="https://telegram.me/botfather">BotFather</a> and press the Start button. Press the button again or reload the page to stop the bot.</p>
  <p>The source code of this bot is also <a href="https://github.com/Kunal-Diwan/flukybot">available on Github</a>.
  <br><br>
  <label for="token">Bot token</label><br>
  <input id="token" type="text" placeholder="Paste your bot token from @BotFather here" size=60 /><br><br>
  <button id="startStop" type="button" onclick="startBot()">Start</button>
  <p id="output"></p>
  <script>

var output = document.getElementById("output");
var startStop = document.getElementById("startStop");
var running = false;
var botUrl;
var xhr; // XMLHttpRequest

// Use token from the url query string if present
var query = window.location.search;
var token = query.replace("?token=", '');
document.getElementById("token").value = token;

function startBot() {
  var token = document.getElementById("token").value;
  botUrl = "https://api.telegram.org/bot" + token + "/";
  log("Bot started");
  startStop.innerText = "Stop";
  startStop.onclick = stopBot;
  running = true;
  getUpdates(); // Start long polling
}

function stopBot() {
  running = false;
  log("Bot stopped");
  xhr.abort();
  startStop.innerText = "Start";
  startStop.onclick = startBot;
}

var nextUpdateId = 0;

// Long polling of getUpdates
function getUpdates() {
  call("getUpdates", {
    offset: nextUpdateId,
    limit: 100,
    timeout: 30
  }, function(updates) {
    if (updates.length > 0) {
      for (var i=0; i<updates.length; ++i) {
        handleUpdate(updates[i]);
      }
      var lastUpdate = updates[updates.length-1];
      nextUpdateId = lastUpdate.update_id + 1;
    }
    if (running) {
      getUpdates();
    } else {
      log("Bot stopped");
    }
  }, function(errorCode, errorText) {
    log(errorText);
    stopBot();
  }, 35);
}

function handleUpdate(update) {
  if (update.message) {
    handleMessage(update.message);
  } else if (update.edited_message) {
    handleEditedMessage(update.edited_message);
  } else if (update.inline_query) {
    handleInlineQuery(update.inline_query);
  } else if (update.chosen_inline_result) {
    handleChosenInlineResult(update.chosen_inline_result);
  } else if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
  }
}

function handleMessage(message) {
  if (message.text) {
    log(message.from.id + ": " + message.text);
    if (message.text == "/help") {
      call("sendMessage", {
        chat_id: message.chat.id,
        text: "I'm a bot temporarily running locally in a browser. You can use the following commands:\n" +
              "/help - Show instructions\n" +
              "/keyboard - Show a simple keyboard\n" +
              "/hidekeyboard - Hide the keyboard\n" +
              "/inlinekeyboard - Show an inline keyboard"
      });
    } else if (message.text == "/keyboard") {
      call("sendMessage", {
        chat_id: message.chat.id,
        text: "Please select a command",
        reply_markup: {
          keyboard: [
            [{text: "Left"}, {text: "Right"}],
            [{text: "/hidekeyboard"}]
          ]
        }
      });
    } else if (message.text == "/hidekeyboard") {
      call("sendMessage", {
        chat_id: message.chat.id,
        text: "Keyboard removed",
        reply_markup: {
          hide_keyboard: true
        }
      });
    } else if (message.text == "/inlinekeyboard") {
      call("sendMessage", {
        chat_id: message.chat.id,
        text: "This message has an inline keyboard",
        reply_markup: {
          inline_keyboard: [
            [{text: "Google", url: "https://google.com"}],
            [{text: "Hide", callback_data: "HIDE"}]
          ]
        }
      });
    }
  } else {
    log(message.from.id + ": " + toJson(message));
  }
}

function handleEditedMessage(message) {
  if (message.text) {
    log(message.from.id + " (edit): " + message.text);
  } else {
    log(message.from.id + " (edit): " + toJson(message));
  }
}

function handleInlineQuery(inlineQuery) {
  log(toJson(inlineQuery));
  if (!inlineQuery.query) {
    return; // No query text yet
  }
  call("answerInlineQuery", {
    inline_query_id: inlineQuery.id,
    results: [
      {
        type: "article",
        id: "B",
        title: "Bold",
        input_message_content: {
          message_text: "<b>" + inlineQuery.query + "</b>",
          parse_mode: "HTML"
        },
        description: "*" + inlineQuery.query + "*"
      },
      {
        type: "article",
        id: "I",
        title: "Italic",
        input_message_content: {
          message_text: "<i>" + inlineQuery.query + "</i>",
          parse_mode: "HTML"
        },
        description: "_" + inlineQuery.query + "_"
      }
    ]
  });
}

function handleChosenInlineResult(inlineResult) {
  log(toJson(inlineResult));
}

function handleCallbackQuery(query) {
  log(toJson(query));
  if (query.data == "HIDE") {
    call("editMessageText", {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      text: "Keyboard hidden"
    });
  }
}

function call(method, params, onResponse, onError, timeout) {
  xhr = new XMLHttpRequest();
  xhr.open("POST", botUrl + method);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.responseText) {
        var response = JSON.parse(xhr.responseText);
        if (response.result) {
          if (onResponse) {
              onResponse(response.result);
          }
        } else if (onError) {
          onError(response.error_code, response.description);
        } else {
          log(method + ": " + response.description);
        }
      }
  }
  xhr.timeout = timeout ? timeout * 1000 : 15000;
  xhr.ontimeout = function() {
    if (onError) {
      onError(-1, "Timeout");
    } else {
      log(method + ": Timeout");
    }
   };
    xhr.send(JSON.stringify(params));
}

function log(message) {
  output.innerHTML = "<pre>" +new Date().toLocaleTimeString() + "\n" + message + "</pre>" + output.innerHTML;
}

function toJson(object) {
  return JSON.stringify(object, undefined, 2);
}
  </script>
</body>
</html>
