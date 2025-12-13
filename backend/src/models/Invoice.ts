import mongoose, { Schema } from 'mongoose';

interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  _id: mongoose.Types.ObjectId;
  number: string;
  clientId: mongoose.Types.ObjectId;
  date: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: {
      type: String,
      required: [true, 'Please provide item description']
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide item quantity'],
      min: 0
    },
    unitPrice: {
      type: Number,
      required: [true, 'Please provide unit price'],
      min: 0
    },
    total: {
      type: Number,
      required: [true, 'Please provide item total']
    }
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    number: {
      type: String,
      required: [true, 'Please provide invoice number'],
      unique: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Please provide client ID']
    },
    date: {
      type: Date,
      required: [true, 'Please provide invoice date'],
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Please provide due date']
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    },
    items: {
      type: [invoiceItemSchema],
      required: [true, 'Please provide at least one item'],
      validate: {
        validator: function(items: IInvoiceItem[]) {
          return items.length > 0;
        },
        message: 'Invoice must have at least one item'
      }
    },
    subtotal: {
      type: Number,
      required: [true, 'Please provide subtotal']
    },
    taxRate: {
      type: Number,
      default: 0.19, // 19% TVA par défaut
      required: [true, 'Please provide tax rate']
    },
    tax: {
      type: Number,
      required: [true, 'Please provide tax amount']
    },
    total: {
      type: Number,
      required: [true, 'Please provide total amount']
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to automatically calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  
    // Calculate tax using the tax rate (default 19% if not provided)
    this.taxRate = this.taxRate || 0.19;
  this.tax = this.subtotal * this.taxRate;
  
  // Calculate total
  this.total = this.subtotal + this.tax;
  
  next();
});

const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);

export default Invoice; 