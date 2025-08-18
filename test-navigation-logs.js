// Test script to check if navigation logs are being stored properly
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNavigationLogs() {
  try {
    console.log('Testing navigation log storage and retrieval...');
    
    // 1. Check if user_activity_logs table exists and has data
    const { data: logs, error: logsError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('action_type', 'view')
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      return;
    }
    
    console.log('Recent view activities:', logs);
    
    // 2. Check for navigation logs specifically
    const { data: navLogs, error: navError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('action_type', 'view')
      .contains('metadata', { page_name: 'User Activity Dashboard' })
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (navError) {
      console.error('Error fetching navigation logs:', navError);
      return;
    }
    
    console.log('Navigation logs for User Activity Dashboard:', navLogs);
    
    // 3. Check user_activity_summary view
    const { data: summary, error: summaryError } = await supabase
      .from('user_activity_summary')
      .select('*')
      .limit(5);
    
    if (summaryError) {
      console.error('Error fetching user activity summary:', summaryError);
      return;
    }
    
    console.log('User activity summary:', summary);
    
    // 4. Test manual log insertion
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const testLog = {
        user_id: user.user.id,
        action_type: 'view',
        entity_type: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          page_name: 'Test Navigation',
          user_action: 'navigated to page'
        }
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('user_activity_logs')
        .insert(testLog)
        .select();
      
      if (insertError) {
        console.error('Error inserting test log:', insertError);
      } else {
        console.log('Test log inserted successfully:', insertResult);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testNavigationLogs();