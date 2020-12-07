/**
 * script: https://github.com/Automattic/mongoose/issues/7292
 * middleware: https://mongoosejs.com/docs/middleware.html
 */

const assert = require("assert");
const mongoose = require("mongoose");
const httpContext = require("express-http-context");
mongoose.set("debug", true);

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

  userSchema.pre("save", function() {
    console.log('pre save', httpContext.get("test"));
    console.log('this.modelName', this.modelName, this.baseModelName, this.model.modelName)
  });
  userSchema.post("save", function(doc) {
		console.log('post save', httpContext.get("test"), doc);
  });

  userSchema.pre("insertMany", function() {
		console.log('pre insertMany');
  });

  userSchema.post("insertMany", function() {
		console.log('post insertMany');
  });

	userSchema.pre("updateOne", function(next) {
    console.log('queries', this.getFilter(), this.getQuery(), this.getUpdate());
    console.log('pre updateOne', httpContext.get("test"));
    this.__context = httpContext.get("test");
		next();
  });
  
  userSchema.post("updateOne", function(doc) {
		console.log('post updateOne', httpContext.get("test"), this.__context);
    console.log(doc);
  });

  userSchema.post("updateMany", function(docs) {
		console.log('post updateMany', httpContext.get("test"), this.__context);
    console.log(docs);
  });
  
  userSchema.pre("findOneAndUpdate", function() {
    console.log(this.model.modelName);
    console.log('queries', this.getFilter(), this.getQuery(), this.getUpdate());
		console.log('pre updateOne', httpContext.get("test"));
  });

  userSchema.post("deleteMany", function(docs) {
		console.log('pre deleteMany', docs);
  });

  userSchema.post("deleteOne", function(docs) {
		console.log('pre remove', this instanceof mongoose.Query);
  });

  const User = mongoose.model("User", userSchema);
  
  const [user1] = await User.create([{ name: 'hi' }]);

	app.get("/1", async (req, res) => {
		httpContext.set("test", "42");
		const user = await User.updateOne({ _id: user1._id.toString() }, { $set: { name: 'hey' } }).exec();
		res.json({ ok: 1 });
  });

  app.get("/1.1", async (req, res) => {
		httpContext.set("test", "41");
		const user = await User.updateOne({ _id: user1._id.toString() }, { $set: { name: 'hey' } }).exec();
		res.json({ ok: 1 });
  });

  app.get("/1.2", async (req, res) => {
		httpContext.set("test", "44");
    const user = await User.findOne({ _id: user1._id.toString() });
    await user.updateOne({ $set: { name: 'hooo' }}).exec();
		res.json({ ok: 1 });
  });
  
  app.get("/2", async (req, res) => {
		httpContext.set("test", "43");
		const user = await User.findOneAndUpdate({ _id: user1._id.toString() }, { $set: { name: 'hey' } });
		res.json({ ok: 1 });
  });
  
  app.get("/3", async (req, res) => {
		httpContext.set("test", "44");
    await User.updateMany({}, { $set: { name: 'aiueo' } }).exec();
		res.json({ ok: 1 });
  });

  app.get("/4", async (req, res) => {
		httpContext.set("test", "44");
    await User.deleteMany({}).exec();
		res.json({ ok: 1 });
  });

  app.get("/5", async (req, res) => {
		httpContext.set("test", "44");
    await User.deleteOne({ name: 'hoge' }).exec();
		res.json({ ok: 1 });
  });

	await app.listen(3003);

  // await superagent.get("http://localhost:3003/1");
  // await superagent.get("http://localhost:3003/1.1");
  // await superagent.get("http://localhost:3003/1.2");
  await superagent.get("http://localhost:3003/2");
  // await superagent.get("http://localhost:3003/3");
  // await superagent.get("http://localhost:3003/4");
  // await superagent.get("http://localhost:3003/5");

	console.log("done");
	process.exit(0);
}