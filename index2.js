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

  const tests = ['update', 'updateOne', 'remove', 'deleteOne', 'save', 'findOneAndUpdate', 'update', 'updateMany', 'delete', 'findOneAndRemove', 'findOneAndDelete', 'deleteMany']

  console.log('create');
  const [user1] = await User.create([{ name: 'hi' }]);

  console.log('update');
  user1.name = 'hoooo';
  await user1.update();
  await User.update({ name: '' });

  console.log('update with q');
  await user1.update({ name: 'hey' });
  await User.update({ name: 'hey' }, { name: 'hi' });

  console.log('updateOne');
  user1.name = 'hoooo';
  await user1.updateOne();
  await User.updateOne({ name: '' });

  console.log('updateOne with q');
  await user1.updateOne({ name: 'hey' });
  await User.updateOne({ name: 'hey' }, { name: 'hi' });

	console.log("done");
	process.exit(0);
}