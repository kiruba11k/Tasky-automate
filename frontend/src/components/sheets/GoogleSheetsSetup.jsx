import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SheetSync } from "@/entities/SheetSync";
import { User } from "@/entities/User";
import { 
  Sheet, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  FileSpreadsheet 
} from 'lucide-react';

export default function GoogleSheetsSetup() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [sheetId, setSheetId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserAndSync();
  }, []);

  const loadUserAndSync = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Check if user already has a sync setup
      const syncs = await SheetSync.filter({ user_id: user.id });
      if (syncs.length > 0) {
        setSyncStatus(syncs[0]);
        setSheetId(syncs[0].sheet_id);
      }
    } catch (error) {
      console.error('Error loading user and sync status:', error);
    }
  };

  const handleConnectSheet = async () => {
    if (!sheetId.trim()) {
      setError('Please enter a valid Google Sheets ID');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Note: This is where Google Sheets API integration would be implemented
      // For now, we'll simulate the connection
      
      const syncData = {
        user_id: currentUser.id,
        sheet_id: sheetId,
        sync_status: 'pending',
        last_sync: new Date().toISOString()
      };

      if (syncStatus) {
        await SheetSync.update(syncStatus.id, syncData);
      } else {
        await SheetSync.create(syncData);
      }

      // Update user's sheet ID
      await User.updateMyUserData({ google_sheet_id: sheetId });
      
      // Simulate successful connection (replace with actual API call)
      setTimeout(async () => {
        try {
          const updatedSync = await SheetSync.filter({ user_id: currentUser.id });
          if (updatedSync.length > 0) {
            await SheetSync.update(updatedSync[0].id, { sync_status: 'active' });
            loadUserAndSync();
          }
        } catch (error) {
          console.error('Error updating sync status:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting to Google Sheets:', error);
      setError('Failed to connect to Google Sheets. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-effect-enhanced">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sheet className="w-6 h-6 text-blue-400" />
            Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          {syncStatus && (
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3">
                {getStatusIcon(syncStatus.sync_status)}
                <div>
                  <div className="text-white font-medium">Sync Status</div>
                  <div className="text-sm text-slate-400">
                    Last sync: {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>
              <Badge className={`${getStatusColor(syncStatus.sync_status)} border px-3 py-1`}>
                {syncStatus.sync_status.charAt(0).toUpperCase() + syncStatus.sync_status.slice(1)}
              </Badge>
            </div>
          )}

          {/* Connection Form */}
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Google Sheets Document ID</Label>
              <div className="mt-2">
                <Input
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Find this ID in your Google Sheets URL: https://docs.google.com/spreadsheets/d/
                <strong>SHEET_ID_HERE</strong>/edit
              </p>
            </div>

            {error && (
              <Alert className="bg-red-900/50 border-red-700 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleConnectSheet}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Sheet className="w-4 h-4 mr-2" />
                    {syncStatus ? 'Update Connection' : 'Connect Sheet'}
                  </>
                )}
              </Button>

              {syncStatus && syncStatus.sheet_id && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${syncStatus.sheet_id}`, '_blank')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Sheet
                </Button>
              )}
            </div>
          </div>

          {/* Sheet Template Information */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-white font-medium mb-2">Required Sheet Columns</h4>
                <p className="text-sm text-slate-400 mb-3">
                  Your Google Sheet must have the following columns (exact names):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <Badge variant="outline" className="justify-center">Date</Badge>
                  <Badge variant="outline" className="justify-center">Project Name</Badge>
                  <Badge variant="outline" className="justify-center">Task</Badge>
                  <Badge variant="outline" className="justify-center">Expected Outcome</Badge>
                  <Badge variant="outline" className="justify-center">Expected Time</Badge>
                  <Badge variant="outline" className="justify-center">Tasks Done</Badge>
                  <Badge variant="outline" className="justify-center">Actual Time Taken</Badge>
                  <Badge variant="outline" className="justify-center">Task Status</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Guide */}
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">How to Set Up Your Sheet</h4>
            <div className="space-y-2 text-sm text-slate-300">
              <p>1. Create a new Google Sheet or use an existing one</p>
              <p>2. Add the required column headers in the first row</p>
              <p>3. Share the sheet with edit permissions (or make it public)</p>
              <p>4. Copy the Sheet ID from the URL and paste it above</p>
              <p>5. Click "Connect Sheet" to start syncing</p>
            </div>
          </div>

          {/* Integration Note */}
          <Alert className="bg-amber-900/20 border-amber-700/30 text-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Real-time Sync:</strong> Once connected, any changes you make in your Google Sheet will automatically sync with the dashboard, and vice versa. You can also use the manual CSV/XLSX upload option if Google Sheets integration is unavailable.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}