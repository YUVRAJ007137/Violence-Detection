import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';

interface VideoResultProps {
  analysis: {
    id: string;
    video_url: string;
    status: string;
    results: {
      violence_detected: boolean;
      confidence: number;
      timestamp: string;
      details?: {
        type?: string;
        severity?: number;
        location?: string;
      };
      frames?: {
        timestamp: number;
        confidence: number;
      }[];
    };
    created_at: string;
  };
  onClose: () => void;
}

export function VideoResult({ analysis, onClose }: VideoResultProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Video Analysis Results</h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{analysis.status}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Upload Date</p>
                <p className="font-medium">
                  {format(new Date(analysis.created_at), 'PPp')}
                </p>
              </div>
            </div>

            {analysis.results && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {analysis.results.violence_detected ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      <h4 className="font-medium">Detection Results</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      analysis.results.violence_detected 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {analysis.results.violence_detected ? 'Violence Detected' : 'No Violence'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Confidence Score</p>
                      <div className="mt-1 relative pt-1">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div
                            style={{ width: `${analysis.results.confidence * 100}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                              analysis.results.violence_detected 
                                ? 'bg-red-500' 
                                : 'bg-green-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-medium mt-1">
                          {(analysis.results.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {analysis.results.details && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {analysis.results.details.type && (
                          <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <p className="font-medium capitalize">{analysis.results.details.type}</p>
                          </div>
                        )}
                        {analysis.results.details.severity && (
                          <div>
                            <p className="text-sm text-gray-500">Severity</p>
                            <p className="font-medium">{analysis.results.details.severity}/10</p>
                          </div>
                        )}
                        {analysis.results.details.location && (
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium">{analysis.results.details.location}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {analysis.results.frames && analysis.results.frames.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart2 className="w-4 h-4 text-gray-500" />
                          <p className="text-sm font-medium">Frame Analysis</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {analysis.results.frames.map((frame, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 text-sm">{frame.timestamp}s</td>
                                  <td className="px-3 py-2 text-sm">{(frame.confidence * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Video Source</p>
                  <a 
                    href={analysis.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <span>View Original Video</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}