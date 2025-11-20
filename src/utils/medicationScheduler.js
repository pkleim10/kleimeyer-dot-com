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
 * @returns {Object} Checklist data structure
 */
export function getChecklistData(medications, logs, startDate, endDate) {
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
  
  // Sort time slots: numbered first (#1, #2, etc.), then predefined options, then specific times
  const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => {
    const aIsNumber = a.startsWith('#')
    const bIsNumber = b.startsWith('#')
    
    if (aIsNumber && bIsNumber) {
      return parseInt(a.substring(1)) - parseInt(b.substring(1))
    }
    if (aIsNumber) return -1
    if (bIsNumber) return 1
    
    // Predefined options order: morning, evening, bedtime
    const predefinedOrder = { 'morning': 1, 'evening': 2, 'bedtime': 3 }
    const aPredefined = predefinedOrder[a]
    const bPredefined = predefinedOrder[b]
    
    if (aPredefined && bPredefined) {
      return aPredefined - bPredefined
    }
    if (aPredefined) return -1
    if (bPredefined) return 1
    
    // Compare times (HH:mm format) or other strings
    return a.localeCompare(b)
  })
  
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

