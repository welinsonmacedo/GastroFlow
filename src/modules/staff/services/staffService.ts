import { supabase } from '../../../core/api/supabaseClient';
import { EventBus } from '../../../core/events/eventBus';
import { AppEvents } from '../../../core/events/eventTypes';

export const StaffService = {
  async clockIn(employeeId: string, tenantId: string) {
    const { error } = await supabase
      .from('timeclock')
      .insert({ employee_id: employeeId, tenant_id: tenantId, clock_in: new Date().toISOString() });
      
    if (error) throw new Error(error.message);
    EventBus.publish(AppEvents.EMPLOYEE_CLOCK_IN, { employeeId });
  },
  
  async clockOut(timeclockId: string, employeeId: string) {
    const { error } = await supabase
      .from('timeclock')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', timeclockId);
      
    if (error) throw new Error(error.message);
    EventBus.publish(AppEvents.EMPLOYEE_CLOCK_OUT, { employeeId });
  }
};
