'use client';
import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

const RoutineTableGrid = ({ 
  selectedCourses = [], 
  onRemoveCourse = null, 
  displayToast = null,
  showRemoveButtons = true,
  className = "" 
}) => {
  const routineRef = useRef(null);
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, showLeft: false });
  
  const timeSlots = [
    '08:00 AM-09:20 AM',
    '09:30 AM-10:50 AM',
    '11:00 AM-12:20 PM',
    '12:30 PM-01:50 PM',
    '02:00 PM-03:20 PM',
    '03:30 PM-04:50 PM',
    '05:00 PM-06:20 PM'
  ];
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Parse time to minutes for comparison
  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
    return totalMinutes;
  };
  
  // Format time from 24h to 12h
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  // Get courses for a specific time slot and day
  const getCoursesForSlot = (day, timeSlot) => {
    const [slotStart, slotEnd] = timeSlot.split('-');
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);
    
    return selectedCourses.filter(course => {
      // Check class schedules
      const classMatch = course.sectionSchedule?.classSchedules?.some(schedule => {
        if (schedule.day !== day.toUpperCase()) return false;
        const scheduleStart = timeToMinutes(formatTime(schedule.startTime));
        const scheduleEnd = timeToMinutes(formatTime(schedule.endTime));
        return scheduleStart >= slotStartMin && scheduleStart < slotEndMin;
      });
      
      // Check lab schedules
      const labMatch = course.labSchedules?.some(schedule => {
        if (schedule.day !== day.toUpperCase()) return false;
        const scheduleStart = timeToMinutes(formatTime(schedule.startTime));
        const scheduleEnd = timeToMinutes(formatTime(schedule.endTime));
        return scheduleStart >= slotStartMin && scheduleStart < slotEndMin;
      });
      
      return classMatch || labMatch;
    });
  };
  
  // Check for time conflicts
  const hasConflict = (day, timeSlot) => {
    const courses = getCoursesForSlot(day, timeSlot);
    return courses.length > 1;
  };
  
  
  return (
    <div className={`w-full ${className}`}>
      <div ref={routineRef} className="bg-gray-900 p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-4 px-4 text-base font-medium text-gray-400 w-44">Time/Day</th>
              {days.map(day => (
                <th key={day} className="text-center py-4 px-3 text-base font-medium text-gray-400">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(timeSlot => (
              <tr key={timeSlot} className="border-b border-gray-800">
                <td className="py-4 px-4 text-base font-medium text-gray-400 whitespace-nowrap">
                  {timeSlot}
                </td>
                {days.map(day => {
                  const courses = getCoursesForSlot(day, timeSlot);
                  const conflict = hasConflict(day, timeSlot);
                  
                  return (
                    <td key={`${day}-${timeSlot}`} className="p-2 border-l border-gray-800 relative">
                      {courses.length > 0 && (
                        <div className={`min-h-[80px] ${conflict ? 'space-y-1' : ''}`}>
                          {courses.map(course => {
                            const isLab = course.labSchedules?.some(s => 
                              s.day === day.toUpperCase() && 
                              timeToMinutes(formatTime(s.startTime)) >= timeToMinutes(timeSlot.split('-')[0]) &&
                              timeToMinutes(formatTime(s.startTime)) < timeToMinutes(timeSlot.split('-')[1])
                            );
                            
                            return (
                              <div
                                key={course.sectionId}
                                className={`p-3 rounded text-sm ${
                                  conflict 
                                    ? 'bg-red-900/50 border border-red-600' 
                                    : isLab 
                                      ? 'bg-purple-900/50 border border-purple-600'
                                      : 'bg-blue-900/50 border border-blue-600'
                                } hover:opacity-80 transition-opacity ${onRemoveCourse ? 'cursor-pointer' : ''} group relative`}
                                onClick={() => onRemoveCourse?.(course)}
                                onMouseEnter={(e) => {
                                  setHoveredCourse(course);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const viewportWidth = window.innerWidth;
                                  const tooltipWidth = 384; // w-96 = 384px
                                  
                                  // Position tooltip on left if it would go outside viewport
                                  const shouldShowLeft = rect.right + tooltipWidth + 10 > viewportWidth;
                                  
                                  setTooltipPosition({ 
                                    x: shouldShowLeft ? rect.left - tooltipWidth - 10 : rect.right + 10, 
                                    y: rect.top,
                                    showLeft: shouldShowLeft
                                  });
                                }}
                                onMouseLeave={() => setHoveredCourse(null)}
                              >
                                <div className="font-semibold text-base">
                                  {course.courseCode}{isLab && 'L'}-{course.sectionName}-{course.roomName || course.roomNumber || 'TBA'}
                                </div>
                                {course.faculties && (
                                  <div className="text-gray-500 truncate text-sm mt-1">
                                    {course.faculties}
                                  </div>
                                )}
                                {showRemoveButtons && onRemoveCourse && (
                                  <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3 text-red-400" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Single global tooltip */}
        {hoveredCourse && (
          <div 
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl w-96 pointer-events-none"
            style={{ 
              left: `${Math.max(10, Math.min(tooltipPosition.x, window.innerWidth - 394))}px`, 
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-50%)'
            }}
          >
            <div className="space-y-2 text-sm">
              <div className="font-bold text-lg">{hoveredCourse.courseCode}-{hoveredCourse.sectionName}</div>
              <div><span className="text-gray-400">Credits:</span> {hoveredCourse.courseCredit}</div>
              <div><span className="text-gray-400">Faculty:</span> {hoveredCourse.faculties || 'TBA'}</div>
              <div><span className="text-gray-400">Type:</span> {hoveredCourse.sectionType}</div>
              <div><span className="text-gray-400">Capacity:</span> {hoveredCourse.capacity} (Filled: {hoveredCourse.consumedSeat})</div>
              <div><span className="text-gray-400">Prerequisites:</span> {hoveredCourse.prerequisiteCourses || 'None'}</div>
              <div><span className="text-gray-400">Room:</span> {hoveredCourse.roomName || 'TBA'}</div>
              {hoveredCourse.labCourseCode && (
                <div><span className="text-gray-400">Lab:</span> {hoveredCourse.labCourseCode} - {hoveredCourse.labRoomName}</div>
              )}
              <div><span className="text-gray-400">Mid Exam:</span> {hoveredCourse.sectionSchedule?.midExamDetail || 'TBA'}</div>
              <div><span className="text-gray-400">Final Exam:</span> {hoveredCourse.sectionSchedule?.finalExamDetail || 'TBA'}</div>
              <div><span className="text-gray-400">Class Period:</span> {hoveredCourse.sectionSchedule?.classStartDate} to {hoveredCourse.sectionSchedule?.classEndDate}</div>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-500">
          Made with ❤️ from https://oracle.eniamza.com
        </div>
      </div>
      
      {selectedCourses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No courses selected. Add courses from the list to see them in your routine.
        </div>
      )}
      
      {selectedCourses.length > 0 && (
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-900/50 border border-blue-600 rounded"></div>
            <span className="text-gray-400">Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-900/50 border border-purple-600 rounded"></div>
            <span className="text-gray-400">Lab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-900/50 border border-red-600 rounded"></div>
            <span className="text-gray-400">Conflict</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineTableGrid;
