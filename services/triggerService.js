const config = require("../utils/config");
const log = require("../utils/logger");
const axios = require("axios");

//getting path object from config file

var logger;

const trigger = (context, config, data) => {
  logger = log.init();
  let uri = context.response_uri;

  let api = config.callback;
  let delay = config.delay;
  // http://localhost:5500/${api}
  console.log(`${data.context.bap_uri}/${api}`);

  try {
    logger.info("Inside trigger service");
    setTimeout(() => {
      axios
        .post(`${data.context.bap_uri}/${api}`, data
        // , {
          // headers: {
          //   Authorization: "Signature keyId=\"staging-operator.paytm.com/preprod/OndcMetro/on_callback|bdd29740-ae17-11ee-8fae-6f3015b50ccd|ed25519\",algorithm=\"ed25519\",created=\"1705934034\",expires=\"1705934064\",headers=\"(created) (expires) digest\",signature=\"b4Efn0ZRV5hpb0qJDG6YpdaqtFIDno8EIQn+8Z0G90VzXOBEaVDlrLIKvjV95t1wSa43HqMiaemzuo9uIvt3AA==\""//the token is a variable which holds the token
          // }
        // }
        )
        .then((response) => {
          console.log("response " + JSON.stringify(data));
          logger.info(
            `Triggered ${api} response at ${response}${api}`
          );
        })
        .catch(function (error) {
          console.log("err " + error);
          logger.error(error);
        });
    }, delay);
  } catch (error) {
    logger.error(`!!Error while triggering the response,`, error);
  }
};

module.exports = { trigger };
