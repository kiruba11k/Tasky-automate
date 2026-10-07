import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { DailyTask } from "@/entities/DailyTask";
import { FileUpload } from "@/entities/FileUpload";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const requiredColumns = [
  'Date',
  'Task', 
  'Expected Outcome',
  'Expected Time',
  'Tasks Done',
  'Actual Time Taken',
  'Task Status'
];

const columnMappings = {
  'Date': ['date', 'task_date', 'day'],
  'Task': ['task', 'task_description', 'description', 'work'],
  'Expected Outcome': ['expected_outcome', 'outcome', 'expected_result', 'goal'],
  'Expected Time': ['expected_time', 'estimated_time', 'time_estimate', 'hours'],
  'Tasks Done': ['tasks_done', 'completed_work', 'actual_work', 'work_done'],
  'Actual Time Taken': ['actual_time_taken', 'actual_time', 'time_taken', 'actual_hours'],
  'Task Status': ['task_status', 'status', 'state', 'progress']
};

export default function FileUploadDialog({ open, onOpenChange, project, team, onFileUploaded }) {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, uploaded, processing, completed, error
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (fileType === 'csv' || fileType === 'xlsx') {
        setFile(selectedFile);
        setUploadStatus('idle');
        setErrors([]);
      } else {
        setErrors(['Please select a CSV or XLSX file']);
      }
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setErrors([]);

    try {
      const result = await UploadFile({ file });
      setFileUrl(result.file_url);
      setUploadStatus('uploaded');
      
      // Extract data from uploaded file
      await extractData(result.file_url);
    } catch (error) {
      console.error('File upload error:', error);
      setErrors(['Failed to upload file. Please try again.']);
      setUploadStatus('error');
    }
  };

  const extractData = async (url) => {
    setUploadStatus('processing');

    try {
      // Define a flexible JSON schema for task data
      const jsonSchema = {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                task: { type: "string" },
                expected_outcome: { type: "string" },
                expected_time: { type: "number" },
                tasks_done: { type: "string" },
                actual_time_taken: { type: "number" },
                task_status: { type: "string" }
              }
            }
          },
          columns: {
            type: "array",
            items: { type: "string" }
          }
        }
      };

      const result = await ExtractDataFromUploadedFile({
        file_url: url,
        json_schema: jsonSchema
      });

      if (result.status === 'success' && result.output) {
        const data = result.output;
        
        if (data.columns) {
          setDetectedColumns(data.columns);
          // Auto-map columns
          const autoMapping = {};
          data.columns.forEach(col => {
            const normalizedCol = col.toLowerCase().trim();
            for (const [required, variations] of Object.entries(columnMappings)) {
              if (variations.some(v => normalizedCol.includes(v))) {
                autoMapping[required] = col;
                break;
              }
            }
          });
          setColumnMapping(autoMapping);
        }

        if (data.tasks) {
          setExtractedData(data.tasks);
        }
        
        setUploadStatus('completed');
      } else {
        setErrors([result.details || 'Failed to extract data from file']);
        setUploadStatus('error');
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      setErrors(['Failed to process file. Please check the format and try again.']);
      setUploadStatus('error');
    }
  };

  const handleColumnMapping = (requiredColumn, selectedColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [requiredColumn]: selectedColumn
    }));
  };

  const importTasks = async () => {
    setUploadStatus('processing');
    setErrors([]);

    try {
      let successCount = 0;
      const importErrors = [];

      // Save file upload record
      const fileUploadRecord = await FileUpload.create({
        filename: file.name,
        file_type: file.name.split('.').pop().toLowerCase(),
        file_url: fileUrl,
        team_id: team.id,
        project_id: project.id,
        status: 'processing',
        column_mapping: columnMapping
      });

      for (const row of extractedData) {
        try {
          // Map the row data using column mapping
          const mappedData = {};
          Object.entries(columnMapping).forEach(([required, selected]) => {
            if (selected && row[selected] !== undefined) {
              mappedData[required.toLowerCase().replace(/ /g, '_')] = row[selected];
            }
          });

          // Validate and create task
          const taskData = {
            date: mappedData.date,
            project_id: project.id,
            project_name: project.name,
            task: mappedData.task,
            expected_outcome: mappedData.expected_outcome,
            expected_time: parseFloat(mappedData.expected_time) || 1,
            tasks_done: mappedData.tasks_done || '',
            actual_time_taken: parseFloat(mappedData.actual_time_taken) || 0,
            task_status: mappedData.task_status || 'Pending',
            team_id: team.id,
            file_source: file.name.split('.').pop().toLowerCase() + '_upload',
            priority: 'Medium', // Default priority
            user_id: team.team_members?.[0] // Assign to first team member for now
          };

          // Validate required fields
          if (!taskData.date || !taskData.task || !taskData.expected_outcome) {
            importErrors.push(`Row ${successCount + 1}: Missing required fields`);
            continue;
          }

          await DailyTask.create(taskData);
          successCount++;
        } catch (error) {
          importErrors.push(`Row ${successCount + 1}: ${error.message}`);
        }
      }

      // Update file upload record
      await FileUpload.update(fileUploadRecord.id, {
        status: 'completed',
        records_imported: successCount,
        errors: importErrors
      });

      setImportedCount(successCount);
      
      if (importErrors.length > 0) {
        setErrors(importErrors.slice(0, 5)); // Show first 5 errors
      }

      if (successCount > 0) {
        setUploadStatus('completed');
        setTimeout(() => {
          onFileUploaded();
        }, 2000);
      } else {
        setUploadStatus('error');
      }

    } catch (error) {
      console.error('Import error:', error);
      setErrors(['Failed to import tasks. Please try again.']);
      setUploadStatus('error');
    }
  };

  const resetDialog = () => {
    setUploadStatus('idle');
    setFile(null);
    setFileUrl('');
    setExtractedData([]);
    setColumnMapping({});
    setDetectedColumns([]);
    setErrors([]);
    setImportedCount(0);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-400" />
            Import Tasks from File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* File Upload Section */}
          {uploadStatus === 'idle' && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Select File (CSV or XLSX)</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {file && (
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-slate-400 text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Required Columns:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {requiredColumns.map(col => (
                    <Badge key={col} variant="outline" className="justify-center">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              {file && (
                <Button 
                  onClick={uploadFile}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Upload and Process File
                </Button>
              )}
            </div>
          )}

          {/* Processing States */}
          {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-white text-lg">
                {uploadStatus === 'uploading' ? 'Uploading file...' : 'Processing data...'}
              </p>
            </div>
          )}

          {/* Column Mapping */}
          {uploadStatus === 'completed' && detectedColumns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-white text-lg font-semibold">Column Mapping</h3>
              <p className="text-slate-400">
                Map the columns from your file to the required fields:
              </p>
              
              <div className="grid gap-4">
                {requiredColumns.map(required => (
                  <div key={required} className="flex items-center gap-4">
                    <div className="w-32">
                      <Badge className="bg-purple-600/30 text-purple-200 border border-purple-500/50">
                        {required}
                      </Badge>
                    </div>
                    <select
                      value={columnMapping[required] || ''}
                      onChange={(e) => handleColumnMapping(required, e.target.value)}
                      className="flex-1 bg-slate-700 border-slate-600 text-white rounded px-3 py-2"
                    >
                      <option value="">Select column...</option>
                      {detectedColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={resetDialog}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Start Over
                </Button>
                <Button 
                  onClick={importTasks}
                  disabled={Object.keys(columnMapping).length < requiredColumns.length}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Import {extractedData.length} Tasks
                </Button>
              </div>
            </div>
          )}

          {/* Success */}
          {uploadStatus === 'completed' && importedCount > 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white text-lg">Successfully imported {importedCount} tasks!</p>
              <p className="text-slate-400">The dialog will close automatically.</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert className="bg-red-900/50 border-red-700 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Issues found:</strong>
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}