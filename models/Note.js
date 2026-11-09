import mongoose from 'mongoose';

// The schema sets the rules for what a note looks like
const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Model Note -> collection "notes"
export const Note = mongoose.model('Note', noteSchema);