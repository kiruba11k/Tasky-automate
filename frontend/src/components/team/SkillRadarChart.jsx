import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function SkillRadarChart({ skills, memberName }) {
  const skillData = [
    {
      subject: 'Content',
      value: skills?.content_creation || 0,
      fullMark: 10,
    },
    {
      subject: 'Social Media',
      value: skills?.social_media || 0,
      fullMark: 10,
    },
    {
      subject: 'SEO',
      value: skills?.seo || 0,
      fullMark: 10,
    },
    {
      subject: 'PPC',
      value: skills?.ppc_advertising || 0,
      fullMark: 10,
    },
    {
      subject: 'Design',
      value: skills?.design || 0,
      fullMark: 10,
    },
    {
      subject: 'Copy',
      value: skills?.copywriting || 0,
      fullMark: 10,
    },
    {
      subject: 'Analytics',
      value: skills?.analytics || 0,
      fullMark: 10,
    },
    {
      subject: 'Strategy',
      value: skills?.strategy || 0,
      fullMark: 10,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
        <defs>
          <linearGradient id="skillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
        <PolarGrid stroke="#475569" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <Radar 
          name={memberName || "Skills"} 
          dataKey="value" 
          stroke="#3b82f6" 
          fill="url(#skillGradient)" 
          fillOpacity={0.6} 
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(30, 41, 59, 0.85)', // bg-slate-800 with opacity
            borderColor: '#475569', // border-slate-600
            borderRadius: '0.5rem', // rounded-lg
            color: '#f8fafc', // text-slate-50
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
          labelStyle={{ fontWeight: 'bold', color: '#cbd5e1' }} // text-slate-300
          itemStyle={{ color: '#3b82f6' }} // text-blue-400
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}