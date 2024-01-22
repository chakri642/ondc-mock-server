const { getPublicKey, dynamicReponse } = require("../utils/utils");
const { signNack, invalidNack } = require("../utils/acknowledgement");
const log = require("../utils/logger");
const config = require("../utils/config");
const { validateRequest, verifyHeader } = require("./validation");
const fs = require('fs').promises;
const path = require('path');
const filePath = path.resolve(__dirname, "../store_ids.json");


async function readFileAsync(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    // console.log('Read file successfully:', data);
    return data;
  } catch (err) {
    console.error('Failed to read file:', err);
    // Handle the error or throw it based on your application's needs
    return null;
  }
}

async function writeFileAsync(filePath, data) {
  try {
    await fs.writeFile(filePath, data, 'utf8');
    console.log('File written successfully');
  } catch (err) {
    console.error('Failed to write file:', err);
    // Handle the error or throw it based on your application's needs
  }
}

var paths;
var props;
var security;
var logger;
var server;
const matchText = 'form/'

let fulfillment_ids = [];

const onRequest = async (req, res) => {
  let data =  await readFileAsync(filePath)
  data = JSON.parse(data);
  console.log("onRequest " + req.params['0'] + '\n' + res);

  if (paths == undefined) {
    logger = log.init();
    props = config.getConfig();
    security = props.security;
    server = props.server;
    paths = props.path;
  }
  
  console.log(`version ${JSON.stringify(req.body.context.version)}`);

  console.log(`core_version ${JSON.stringify(req.body)}`);

  try {
    if (req.body.context.version == "2.0.1" || req.body.context.version == "2.0.0") {
      req.body.context.domain = "ONDC:TRV11";
      const file = `./v2/${req.body.context.domain}/v2.yaml`;
      console.log("file xyz" + file);
      await config.loadConfig(file);
      logger = log.init();
      props = config.getConfig();
      security = props.security;
      server = props.server;
      paths = props.path;
    }
    else if (req.body.context.core_version == "0.9.3" || req.body.context.core_version == "0.9.4") {
      const file = `./v1/${req.body.context.domain}/v1.yaml`;
      await config.loadConfig(file);
      logger = log.init();
      props = config.getConfig();
      security = props.security;
      server = props.server;
      paths = props.path;
    }
    const isFormFound = req.params['0']?.match(matchText);
    let api = req.params['0']
    if (isFormFound) {
      api = req.params['0'].replace(/\//g, '_');
    }

    logger.info(`Received ${req.url} api request`);
    if (security.verify_sign) {
      if (!await verifyHeader(req, security)) {
        // Handle the case when signature is not verified
        res.status(400).json(signNack);
        logger.error("Authorization header not verified");
        return; // Make sure to return to exit the function
      }
    }

    // validations
    if (api == "on_search") {
      if (req.body.context.version == "2.0.1") {
        for(let i = 0; i < req.body.message.catalog.fulfillments.length; i++) {
          data.fulfillment_ids.push(req.body.message.catalog.fulfillments[i].id);
        }
      }
      else if  (req.body.context.core_version == "0.9.3" || req.body.context.core_version == "0.9.4") {
        for(let i = 0; i < req.body.message.catalog.providers.length; i++){
          for(let j = 0; j < req.body.message.catalog.providers[i].fulfillments.length; j++){
            data.fulfillment_ids.push(req.body.message.catalog.providers[i].fulfillments[j].id);
          }
        }
      }
    }

    if (api == "select") {
      let fulfillment_id = "";
      if (req.body.context.version == "2.0.1") {
        console.log("select fulfillment_id" + JSON.stringify(req.body.message.order.items[0].id));
        fulfillment_id = JSON.stringify(req.body.message.order.items[0].id);
      }
      else if (req.body.context.core_version == "0.9.3" || req.body.context.core_version == "0.9.4") {
        console.log("select fulfillment_id" + JSON.stringify(req.body.message.order.fulfillment.id));
        fulfillment_id = JSON.stringify(req.body.message.order.fulfillment.id);
      }

      if (!JSON.stringify(data.fulfillment_ids).includes(fulfillment_id)) {
        console.log("invalid fulfillment_id " + fulfillment_id);
        console.log("invalid fulfillment_ids " + data.fulfillment_ids);
        return res.json({ invalidNack });
      }
    }

    let jsonData = JSON.stringify(data, null, 2);

    //getting the callback url from config file
    let callbackConfig;
    let context;
    if (paths[api]) {
      // TODO add senario selection
      context = {
        req_body: req.body,
        apiConfig: paths[api],
      };
      callbackConfig = dynamicReponse(context)
    } else {
      logger.error("Invalid Request");
      return res.json(invalidNack);
    }
    
    logger.info(`Validating ${api} request`);

    await validateRequest(context, callbackConfig, res, security, server, isFormFound);
    if (api == "on_search") {
      await writeFileAsync(filePath, jsonData)
        .then(() => {
          console.log("completed")
        })
        .catch((error) => {
          console.error("Error writing file:", error);
        });
    }
    else if(api == "on_update"){
      data.fulfillment_ids = [];
      jsonData = JSON.stringify(data, null, 2);
      await writeFileAsync(filePath, jsonData)
        .then(() => {
          console.log("completed")
        })
        .catch((error) => {
          console.error("Error writing file:", error);
        });
    }

  } catch (error) {
    logger.error("ERROR!!", error);
    console.trace(error);
    return res.json({ invalidNack });
  }
};

module.exports = { onRequest };
