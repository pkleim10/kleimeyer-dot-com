/**
 * Medication Schedule Generator
 * Generates scheduled doses for medications based on their frequency settings
 */

/**
 * Generate schedules for a medication within a date range
 * @param {Object} medication - Medication object with frequency settings
 * @param {Date|string} startDate - Start date for schedule generation
 * @param {Date|string} endDate - End date for schedule generation
 * @returns {Array} Array of schedule objects { date, scheduledTime, timeNumber }
 */
export function generateSchedules(medication, startDate, endDate) {
  const schedules = []
  
  // Parse dates - handle both Date objects and date strings
  const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate)
  const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  
  // Check if medication has date restrictions
  // Parse date strings as local dates (YYYY-MM-DD format)
  let medStartDate = null
  let medEndDate = null
  
  if (medication.startDate) {
    // If it's a date string in YYYY-MM-DD format, parse it as local date
    const dateStr = medication.startDate
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse as local date to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(Number)
      medStartDate = new Date(year, month - 1, day)
    } else {
      medStartDate = new Date(dateStr)
    }
    medStartDate.setHours(0, 0, 0, 0)
  }
  
  if (medication.endDate) {
    const dateStr = medication.endDate
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      medEndDate = new Date(year, month - 1, day)
    } else {
      medEndDate = new Date(dateStr)
    }
    medEndDate.setHours(23, 59, 59, 999)
  }
  
  // Adjust start date: use medication start date if it's later than checklist start
  // If medication has no start date, use checklist start date
  const effectiveStart = medStartDate && medStartDate > start ? medStartDate : start
  
  // Adjust end date: use medication end date if it's earlier than checklist end
  // If medication has no end date, use checklist end date
  const effectiveEnd = medEndDate && medEndDate < end ? medEndDate : end
  
  if (effectiveStart > effectiveEnd) {
    return schedules // No valid dates
  }
  
  // Generate dates based on frequency pattern
  const dates = generateDates(effectiveStart, effectiveEnd, medication)
  
  // For each date, generate time slots
  dates.forEach(date => {
    if (medication.frequencyType === 'as_needed') {
      // As-needed medications don't have scheduled times
      // They can be logged manually but don't appear in the schedule
      return
    }
    
    if (medication.frequencyType === 'times_per_day') {
      // Generate numbered time slots (#1, #2, #3, etc.)
      for (let i = 1; i <= medication.timesPerDay; i++) {
        schedules.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          scheduledTime: null,
          timeNumber: i
        })
      }
    } else if (medication.frequencyType === 'specific_times') {
      // Generate specific time slots
      medication.specificTimes.forEach(time => {
        schedules.push({
          date: date.toISOString().split('T')[0],
          scheduledTime: time, // HH:mm format
          timeNumber: null
        })
      })
    }
  })
  
  return schedules
}

/**
 * Generate array of dates based on frequency pattern
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} medication - Medication with frequency pattern settings
 * @returns {Array<Date>} Array of dates
 */
function generateDates(startDate, endDate, medication) {
  const dates = []
  const current = new Date(startDate)
  
  switch (medication.frequencyPattern) {
    case 'every_day':
      // Every day from start to end
      while (current <= endDate) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      break
      
    case 'every_x_days':
      // Every X days
      const interval = medication.everyXDays || 1
      while (current <= endDate) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + interval)
      }
      break
      
    case 'specific_days':
      // Specific days of week (0 = Sunday, 6 = Saturday)
      if (!medication.specificDays || medication.specificDays.length === 0) {
        break // No days specified
      }
      
      while (current <= endDate) {
        const dayOfWeek = current.getDay()
        if (medication.specificDays.includes(dayOfWeek)) {
          dates.push(new Date(current))
        }
        current.setDate(current.getDate() + 1)
      }
      break
      
    default:
      break
  }
  
  return dates
}

/**
 * Get checklist data structure for display
 * Groups schedules by date and collects all unique time slots
 * @param {Array} medications - Array of medication objects
 * @param {Array} logs - Array of medication log objects
 * @param {Date|string} startDate - Start date for checklist (7 days back)
 * @param {Date|string} endDate - End date for checklist (7 days forward)
 * @param {Object} group - Optional group object with dayStartTime and dayEndTime
 * @returns {Object} Checklist data structure
 */
export function getChecklistData(medications, logs, startDate, endDate, group = null) {
  // Generate all schedules for all medications
  const allSchedules = []
  
  medications.forEach(medication => {
    // Skip as-needed medications
    if (medication.frequencyType === 'as_needed') {
      return
    }
    
    const schedules = generateSchedules(medication, startDate, endDate)
    schedules.forEach(schedule => {
      allSchedules.push({
        ...schedule,
        medicationId: medication.id,
        medicationName: medication.name,
        dosage: medication.dosage,
        numberToTake: medication.numberToTake || 1,
        withFood: medication.withFood
      })
    })
  })
  
  // Group by date
  const schedulesByDate = {}
  allSchedules.forEach(schedule => {
    if (!schedulesByDate[schedule.date]) {
      schedulesByDate[schedule.date] = []
    }
    schedulesByDate[schedule.date].push(schedule)
  })
  
  // Collect all unique time slots
  const timeSlots = new Set()
  allSchedules.forEach(schedule => {
    if (schedule.scheduledTime) {
      timeSlots.add(schedule.scheduledTime)
    } else if (schedule.timeNumber !== null) {
      timeSlots.add(`#${schedule.timeNumber}`)
    }
  })
  
  // Get day start/end times from group, or use defaults
  const dayStartTime = group?.dayStartTime ? group.dayStartTime.substring(0, 5) : '06:00'
  const dayEndTime = group?.dayEndTime ? group.dayEndTime.substring(0, 5) : '23:59'
  
  // Sort time slots using day boundary logic
  const timeSlotsArray = Array.from(timeSlots)
  const sortedTimeSlots = sortTimesByDayBoundary(timeSlotsArray, dayStartTime, dayEndTime)
  
  // Match logs to schedules
  const logsByKey = {}
  logs.forEach(log => {
    const key = `${log.medicationId}-${log.scheduledDate}-${log.scheduledTime || log.timeNumber}`
    logsByKey[key] = log
  })
  
  // Build checklist structure
  const dates = Object.keys(schedulesByDate).sort()
  
  return {
    dates,
    timeSlots: sortedTimeSlots,
    schedulesByDate,
    logsByKey
  }
}

/**
 * Convert time string to minutes since midnight
 * @param {string} time - Time in HH:mm format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(time) {
  if (!time || !time.match(/^\d{2}:\d{2}/)) return 0
  const [hours, minutes] = time.substring(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Map named times to default hours for sorting
 * @param {string} namedTime - Named time (morning, evening, bedtime)
 * @returns {string} Time in HH:mm format
 */
function mapNamedTimeToHour(namedTime) {
  const mapping = {
    'morning': '08:00',
    'evening': '18:00',
    'bedtime': '22:00'
  }
  return mapping[namedTime] || '12:00'
}

/**
 * Sort times by day boundary (supports wraparound days)
 * @param {Array<string>} times - Array of time strings (HH:mm format or named times)
 * @param {string} dayStartTime - Day start time in HH:mm format (default: '06:00')
 * @param {string} dayEndTime - Day end time in HH:mm format (default: '23:59')
 * @returns {Array<string>} Sorted array of times
 */
export function sortTimesByDayBoundary(times, dayStartTime = '06:00', dayEndTime = '23:59') {
  const dayStartMinutes = timeToMinutes(dayStartTime)
  const dayEndMinutes = timeToMinutes(dayEndTime)
  
  // Separate times into categories
  const numberedTimes = []
  const specificTimes = []
  const namedTimes = []
  
  times.forEach(time => {
    if (time.startsWith('#')) {
      numberedTimes.push(time)
    } else if (time.match(/^\d{2}:\d{2}$/)) {
      specificTimes.push(time)
    } else if (['morning', 'evening', 'bedtime'].includes(time)) {
      namedTimes.push(time)
    } else {
      // Unknown format, treat as specific time
      specificTimes.push(time)
    }
  })
  
  // Sort numbered times
  numberedTimes.sort((a, b) => {
    return parseInt(a.substring(1)) - parseInt(b.substring(1))
  })
  
  // Sort specific times by day boundary
  specificTimes.sort((a, b) => {
    const aMinutes = timeToMinutes(a)
    const bMinutes = timeToMinutes(b)
    
    // Calculate "minutes since day start" accounting for wraparound
    const getSortValue = (minutes) => {
      if (minutes >= dayStartMinutes) {
        // Time is after day start, calculate normally
        return minutes - dayStartMinutes
      } else {
        // Time is before day start, treat as next day (wraparound)
        return (24 * 60) - dayStartMinutes + minutes
      }
    }
    
    return getSortValue(aMinutes) - getSortValue(bMinutes)
  })
  
  // Sort named times by their mapped hours
  namedTimes.sort((a, b) => {
    const aHour = mapNamedTimeToHour(a)
    const bHour = mapNamedTimeToHour(b)
    const aMinutes = timeToMinutes(aHour)
    const bMinutes = timeToMinutes(bHour)
    
    const getSortValue = (minutes) => {
      if (minutes >= dayStartMinutes) {
        return minutes - dayStartMinutes
      } else {
        return (24 * 60) - dayStartMinutes + minutes
      }
    }
    
    return getSortValue(aMinutes) - getSortValue(bMinutes)
  })
  
  // Combine: numbered first, then specific times, then named times
  return [...numberedTimes, ...specificTimes, ...namedTimes]
}

/**
 * Format time for display
 * @param {string} time - Time in HH:mm format or "#N" format
 * @returns {string} Formatted time string
 */
export function formatTimeSlot(time) {
  if (time.startsWith('#')) {
    return time // Already formatted as #1, #2, etc.
  }
  
  // Check if it's a predefined time option
  if (time === 'morning') {
    return 'Morning'
  } else if (time === 'evening') {
    return 'Evening'
  } else if (time === 'bedtime') {
    return 'Bedtime'
  }
  
  // Parse HH:mm and format as "8:00 AM"
  if (time.match(/^\d{2}:\d{2}$/)) {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    
    return `${displayHour}:${minutes} ${ampm}`
  }
  
  // Fallback: return as-is
  return time
}

