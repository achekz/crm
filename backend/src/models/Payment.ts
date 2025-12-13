import mongoose, { Schema } from 'mongoose';

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  method: 'bank_transfer' | 'check' | 'cash' | 'card';
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  notes?: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Please provide invoice ID']
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Please provide client ID']
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: 0
    },
    date: {
      type: Date,
      required: [true, 'Please provide payment date'],
      default: Date.now
    },
    method: {
      type: String,
      enum: ['bank_transfer', 'check', 'cash', 'card'],
      required: [true, 'Please provide payment method']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    reference: {
      type: String
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

// Hook to update invoice status when payment is created/updated
paymentSchema.post('save', async function(doc) {
  try {
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findById(doc.invoiceId);
    
    if (invoice && doc.status === 'completed') {
      // Get all payments for this invoice
      const Payment = mongoose.model('Payment');
      const payments = await Payment.find({ 
        invoiceId: doc.invoiceId, 
        status: 'completed' 
      });
      
      // Calculate total paid
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // If total paid equals or exceeds invoice total, mark as paid
      if (totalPaid >= invoice.total) {
        invoice.status = 'paid';
        await invoice.save();
      }
    }
  } catch (error) {
    console.error('Error updating invoice after payment:', error);
  }
});

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment; 