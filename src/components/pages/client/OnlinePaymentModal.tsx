import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Typography,
  Space,
  Spin,
  Alert,
  Radio,
  Result,
  Divider,
} from 'antd';
import { Invoice } from '../../../store/slices/invoicesSlice';
import * as onlinePaymentService from '../../../services/onlinePaymentService';

const { Title, Text } = Typography;
const { Group: RadioGroup } = Radio;

interface OnlinePaymentModalProps {
  visible: boolean;
  invoice: Invoice;
  onCancel: () => void;
  onSuccess: (paymentResult: any) => void;
}

const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  visible,
  invoice,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'checkout'>('checkout');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  
  // When opening the modal, reset states
  useEffect(() => {
    if (visible) {
      setLoading(false);
      setError(null);
      setPaymentStatus('pending');
    }
  }, [visible]);

  const handlePaymentMethodChange = (e: any) => {
    setPaymentMethod(e.target.value);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (paymentMethod === 'checkout') {
        // Use Stripe Checkout
        const successUrl = `${window.location.origin}/client/invoices/payment-success`;
        const cancelUrl = `${window.location.origin}/client/invoices`;
        
        const result = await onlinePaymentService.createCheckoutSession(
          invoice.id,
          successUrl,
          cancelUrl
        );
        
        // Redirect to Stripe Checkout
        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      } else {
        // This is just a placeholder for direct card payment using Elements
        setPaymentStatus('processing');
        // In a real implementation, you would:
        // 1. Create payment intent
        // 2. Load Stripe Elements
        // 3. Handle card input and submission
        
        // For now, just simulate success after a delay
        setTimeout(() => {
          setPaymentStatus('success');
          onSuccess({
            status: 'success',
            invoiceId: invoice.id,
            amount: invoice.total
          });
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentForm = () => {
    if (paymentStatus === 'processing') {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Processing your payment...</p>
        </div>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <Result
          status="success"
          title="Payment Successful!"
          subTitle={`Your payment of ${invoice.total.toLocaleString()} TND for invoice #${invoice.number} has been processed successfully.`}
        />
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <Result
          status="error"
          title="Payment Failed"
          subTitle="There was an issue processing your payment. Please try again."
        />
      );
    }

    return (
      <div>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Invoice Details</Title>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Invoice Number:</Text>
              <Text strong>{invoice.number}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Amount:</Text>
              <Text strong style={{ color: '#52c41a' }}>{invoice.total.toLocaleString()} TND</Text>
            </div>
          </div>

          <Divider />

          <div>
            <Title level={4}>Payment Method</Title>
            <RadioGroup 
              onChange={handlePaymentMethodChange} 
              value={paymentMethod}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="checkout">
                  <div>
                    <Text strong>Stripe Checkout</Text>
                    <br />
                    <Text type="secondary">You'll be redirected to a secure payment page</Text>
                  </div>
                </Radio>
                <Radio value="card" disabled>
                  <div>
                    <Text strong>Direct Card Payment</Text>
                    <br />
                    <Text type="secondary">Enter your card details directly (coming soon)</Text>
                  </div>
                </Radio>
              </Space>
            </RadioGroup>
          </div>

          {error && (
            <Alert 
              message="Payment Error" 
              description={error} 
              type="error" 
              showIcon 
              closable
              onClose={() => setError(null)}
            />
          )}
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title="Pay Invoice Online"
      open={visible}
      onCancel={onCancel}
      footer={
        paymentStatus === 'pending' ? [
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handlePayment}
          >
            Proceed to Payment
          </Button>,
        ] : [
          <Button 
            key="close" 
            type="primary" 
            onClick={onCancel}
          >
            Close
          </Button>,
        ]
      }
      maskClosable={false}
      width={500}
    >
      {renderPaymentForm()}
    </Modal>
  );
};

export default OnlinePaymentModal; 