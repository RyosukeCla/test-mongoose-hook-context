import { Schema } from 'mongoose';
import { changeHookPlugin } from './change-hook';
type User = {
  name: string
}
const userSchema = new Schema({ name: String });
userSchema.plugin(changeHookPlugin<User>({
  modelName: 'User',
  filterProps: ['name'],
  onChange({ mode, context, docs }) {
    console.log(mode, context, docs);
  }
}));