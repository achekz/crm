import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

import RouteGuard from './components/routing/RouteGuard';
import { store } from './store';
import AppRouter from './components/routing/AppRouter';
import { theme } from './theme/antd-theme';

import './App.css';

dayjs.locale('fr');

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme} locale={frFR}>
        <Router>
          <RouteGuard>
            <div className="app">
              <AppRouter />
            </div>
          </RouteGuard>
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App;