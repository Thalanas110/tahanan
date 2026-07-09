import { supabase } from './supabase';
import { jsPDF } from 'jspdf';

export async function exportUserData() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    throw new Error('Not authenticated');
  }

  const userId = sessionData.session.user.id;
  const data: any = {
    user_id: userId,
    export_date: new Date().toISOString(),
  };

  // Fetch Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  data.profile = profile;

  // Fetch Couple Memberships & Couples
  const { data: coupleMembers } = await supabase.from('couple_members').select('*').eq('user_id', userId);
  data.coupleMembers = coupleMembers;
  
  if (coupleMembers && coupleMembers.length > 0) {
    const coupleIds = coupleMembers.map(cm => cm.couple_id);
    const { data: couples } = await supabase.from('couples').select('*').in('id', coupleIds);
    data.couples = couples;
  }

  // Fetch Daily Checkins
  const { data: checkins } = await supabase.from('daily_checkins').select('*').eq('user_id', userId);
  data.checkins = checkins;

  // Fetch Calendar Events
  const { data: events } = await supabase.from('calendar_events').select('*').eq('created_by', userId);
  data.calendar_events = events;

  // Fetch Love Notes
  const { data: loveNotes } = await supabase.from('love_notes').select('*').eq('created_by', userId);
  data.love_notes = loveNotes;

  // Fetch Health Notes
  const { data: healthNotes } = await supabase.from('health_notes').select('*').eq('user_id', userId);
  data.health_notes = healthNotes;

  // Fetch Tasks
  const { data: tasks } = await supabase.from('tasks').select('*').eq('created_by', userId);
  data.tasks = tasks;

  return data;
}

export function downloadAsJSON(data: any, filename = 'tahanan_data_export.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAsPDF(data: any, filename = 'tahanan_data_export.pdf') {
  const doc = new jsPDF();
  
  const addSection = (title: string, content: any, yPos: number) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text(title, 10, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    const contentStr = JSON.stringify(content, null, 2);
    const lines = doc.splitTextToSize(contentStr, 180);
    
    for (let i = 0; i < lines.length; i++) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(lines[i], 10, yPos);
      yPos += 5;
    }
    return yPos + 10;
  };

  let currentY = 20;
  doc.setFontSize(18);
  doc.text('Tahanan Data Export', 10, currentY);
  currentY += 15;
  
  currentY = addSection('Profile Information', data.profile, currentY);
  currentY = addSection('Couples', data.couples, currentY);
  currentY = addSection('Daily Checkins', data.checkins, currentY);
  currentY = addSection('Love Notes', data.love_notes, currentY);
  currentY = addSection('Health Notes', data.health_notes, currentY);
  currentY = addSection('Tasks', data.tasks, currentY);
  
  doc.save(filename);
}
