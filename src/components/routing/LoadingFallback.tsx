import React from 'react';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = "Chargement en cours..." 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="text-center">
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 48, color: '#0d9488' }} spin />}
          size="large"
        />
        <div className="mt-6">
          <Text className="text-lg text-gray-600 font-medium">
            {message}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoadingFallback;