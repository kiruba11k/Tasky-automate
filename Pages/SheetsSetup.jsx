
import React from 'react';
import GoogleSheetsSetup from '../components/sheets/GoogleSheetsSetup';

export default function SheetsSetup() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Google Sheets Integration</h1>
          <p className="text-slate-400">
            Connect your personal Google Sheet to sync tasks in real-time with the dashboard.
          </p>
        </div>
        
        <GoogleSheetsSetup />
      </div>
    </div>
  );
}
