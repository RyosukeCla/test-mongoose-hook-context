/**
 * script: https://github.com/Automattic/mongoose/issues/7292
 * middleware: https://mongoosejs.com/docs/middleware.html
 */

const assert = require("assert");
const mongoose = require("mongoose");
const httpContext = require("express-http-context");
mongoose.set("debug", true);
mongoose.Promise = global.Promise;
const superagent = require("superagent");
const express = require("express");
const { Schema } = mongoose;

run()
	.then(() => console.log("done"))
	.catch(error => console.error(error.stack));

async function run() {
	await mongoose.connect(`mongodb://localhost:27017/mongoose-test`);
	await mongoose.connection.dropDatabase();

	const app = express();

	app.use(httpContext.middleware);

  const userSchema = new Schema({ name: String });

  ['update', 'updateOne', 'remove', 'deleteOne', 'save', 'findOneAndUpdate', 'updateMany', 'delete', 'findOneAndRemove', 'findOneAndDelete', 'deleteMany'].forEach(method => {
    userSchema.pre(method, { document: true, query: false }, function() {
      console.log(`${method}: document: true`)
    });
    userSchema.pre(method, { document: false, query: true }, function() {
      console.log(`${method}: query: true`)
    });

    userSchema.pre(method, function() {
      console.log(`${method}: all: true`)
    });
  })

  const User = mongoose.model("User", userSchema);
  const insertMany = User.insertMany;
  User.insertMany = async function () {
    const result = await insertMany.call(User, ...arguments);
    console.log('insertmanyyy', result);
    return result;
  };
  await User.insertMany([{ name: 'hi' }]);
	process.exit(0);
}