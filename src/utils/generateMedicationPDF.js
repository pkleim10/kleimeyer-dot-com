import jsPDF from 'jspdf'
import { sortTimesByDayBoundary } from './medicationScheduler'

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Helper function to determine medication status
function getMedicationStatus(medication) {
  // Check if discontinued
  if (medication.discontinued) {
    return 'Discontinued'
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Check start date
  if (medication.startDate) {
    const start = new Date(medication.startDate)
    start.setHours(0, 0, 0, 0)
    if (start > today) {
      return 'No' // Not started yet
    }
  }
  
  // Check end date
  if (medication.endDate) {
    const end = new Date(medication.endDate)
    end.setHours(0, 0, 0, 0)
    if (end < today) {
      return 'No' // Already ended
    }
  }
  
  return 'Yes' // Active (no start date or started, and no end date or not ended)
}

// Helper function to generate conversational summary
// Format: "AMOXYCILIN 50mg. Take 1 capsule 3 times per day for tooth infection"
function generateSummary(medication) {
  // Start with medication name (uppercase) and dosage (no comma) - e.g., "AMOXYCILIN 50mg"
  const nameUpper = medication.name.toUpperCase()
  let summary = medication.dosage 
    ? `${nameUpper} ${medication.dosage}`
    : nameUpper
  
  // FORMAT: Number to take and format type
  const numberToTake = parseFloat(medication.numberToTake) || 1
  const format = medication.format || 'pill'
  const formatLabel = format.toLowerCase()
  
  // Use "Apply" for patches, "Take" for everything else
  const actionVerb = format === 'patch' ? 'Apply' : 'Take'
  
  // Build the action part - FORMAT IS REQUIRED
  let takePart = `${actionVerb} `
  if (numberToTake === 1) {
    takePart += `1 ${formatLabel}`
  } else if (Math.abs(numberToTake % 1 - 0.5) < 0.01) {
    // Handle fractional values like 1.5, 2.5, etc.
    const wholePart = Math.floor(numberToTake)
    if (wholePart === 0) {
      takePart += `1/2 ${formatLabel}`
    } else {
      // Always use plural when total is not exactly 1.0 (e.g., 1.5, 2.5, etc.)
      takePart += `${wholePart} and 1/2 ${formatLabel}s`
    }
  } else {
    takePart += `${numberToTake} ${formatLabel}s`
  }
  
  // INTERVAL: Build interval text based on frequency pattern
  let intervalText = ''
  if (medication.frequencyType === 'as_needed') {
    intervalText = 'as needed'
  } else {
    // Build interval based on frequency pattern
    if (medication.frequencyPattern === 'every_day') {
      intervalText = 'every day'
    } else if (medication.frequencyPattern === 'every_x_days') {
      const days = medication.everyXDays || 1
      intervalText = `every ${days} day${days > 1 ? 's' : ''}`
    } else if (medication.frequencyPattern === 'specific_days') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const days = (medication.specificDays || []).map(d => dayNames[d])
      if (days.length > 0) {
        // Format days with proper grammar: "Sunday, Tuesday and Thursday" or "Sunday and Monday"
        if (days.length === 1) {
          intervalText = `every ${days[0]}`
        } else if (days.length === 2) {
          intervalText = `every ${days[0]} and ${days[1]}`
        } else {
          // Join all but last with commas, then "and" before last
          const lastDay = days.pop()
          intervalText = `every ${days.join(', ')} and ${lastDay}`
        }
      } else {
        intervalText = 'every day' // fallback
      }
    } else {
      // Fallback to every day if pattern is missing
      intervalText = 'every day'
    }
    
    // Add frequency information only if it adds meaningful context
    // For times_per_day > 1, add it before the interval
    if (medication.frequencyType === 'times_per_day') {
      const times = medication.timesPerDay || 1
      if (times > 1) {
        intervalText = `${times} times ${intervalText}`
      }
    } else if (medication.frequencyType === 'specific_times') {
      // For specific times, add time information after the interval
      const times = medication.specificTimes || []
      if (times.length > 0) {
        const timeStrings = times.map(time => {
          if (time === 'morning') return 'morning'
          if (time === 'evening') return 'evening'
          if (time === 'bedtime') return 'bedtime'
          if (time.match(/^\d{2}:\d{2}$/)) {
            const [h, m] = time.split(':')
            const hour = parseInt(h)
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const displayHour = hour % 12 || 12
            return `${displayHour}:${m} ${ampm}`
          }
          return time
        })
        if (times.length === 1) {
          // Single time: "every day in the morning" or "every day at 8:00 AM"
          const timeStr = timeStrings[0]
          if (timeStr.match(/^\d/)) {
            intervalText = `${intervalText} at ${timeStr}`
          } else {
            intervalText = `${intervalText} ${timeStr === 'morning' || timeStr === 'evening' ? 'in the ' : ''}${timeStr}`
          }
        } else {
          intervalText = `${intervalText} at ${timeStrings.join(', ')}`
        }
      }
    }
  }
  
  // WITH FOOD: Add "with food" if applicable
  if (medication.withFood) {
    takePart += ' with food'
  }
  
  // Combine take instruction with interval - BOTH ARE REQUIRED
  takePart += ` ${intervalText}`
  
  // Add take instruction to summary
  summary += `. ${takePart}`
  
  // INDICATION: Add indication if present - INDICATION IS OPTIONAL
  if (medication.indication && medication.indication.trim()) {
    summary += ` for ${medication.indication.trim()}`
  }
  
  // Add period after indication (or after frequency if no indication)
  summary += '.'
  
  // NOTES: Add notes if present - NOTES IS OPTIONAL
  // Add notes immediately following the description on the same line
  if (medication.notes && medication.notes.trim()) {
    summary += ` ${medication.notes.trim()}`
  }
  
  return summary
}

export function generateMedicationPDF(medications, groupName = null, group = null) {
  // Create PDF in landscape mode
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })
  
  // Set up fonts and colors
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const startY = margin
  let currentY = startY
  
  // Title - include group name if provided and not default
  pdf.setFontSize(18)
  pdf.setFont(undefined, 'bold')
  const title = groupName && groupName !== 'My Medications' 
    ? `Medication List - ${groupName}`
    : 'Medication List'
  pdf.text(title, margin, currentY)
  currentY += 10
  
  // Date generated
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, currentY)
  currentY += 8
  
  // Table headers
  pdf.setFontSize(11)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(0, 0, 0)
  
  const colWidths = {
    summary: (pageWidth - 2 * margin) * 0.5, // 50% for summary
    startDate: (pageWidth - 2 * margin) * 0.15, // 15% for start date
    endDate: (pageWidth - 2 * margin) * 0.15,   // 15% for end date
    active: (pageWidth - 2 * margin) * 0.2       // 20% for active
  }
  
  const colX = {
    summary: margin,
    startDate: margin + colWidths.summary,
    endDate: margin + colWidths.summary + colWidths.startDate,
    active: margin + colWidths.summary + colWidths.startDate + colWidths.endDate
  }
  
  // Draw header row background
  pdf.setFillColor(59, 130, 246) // indigo-500
  pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
  
  // Header text (white)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Summary', colX.summary + 2, currentY)
  pdf.text('Start Date', colX.startDate + 2, currentY)
  pdf.text('End Date', colX.endDate + 2, currentY)
  pdf.text('Active', colX.active + 2, currentY)
  
  currentY += 10
  
  // Draw header underline
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, currentY - 2, pageWidth - margin, currentY - 2)
  
  // Reset text color
  pdf.setTextColor(0, 0, 0)
  
  // Medication rows
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  
  // Sort medications by name (case-insensitive)
  const sortedMedications = [...medications].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
  
  sortedMedications.forEach((medication, index) => {
    // Check if we need a new page
    if (currentY > pageHeight - 20) {
      pdf.addPage()
      currentY = margin
      
      // Redraw header on new page
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.setFillColor(59, 130, 246)
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.text('Summary', colX.summary + 2, currentY)
      pdf.text('Start Date', colX.startDate + 2, currentY)
      pdf.text('End Date', colX.endDate + 2, currentY)
      pdf.text('Active', colX.active + 2, currentY)
      currentY += 10
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, currentY - 2, pageWidth - margin, currentY - 2)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
    }
    
    const summary = generateSummary(medication)
    const startDate = formatDate(medication.startDate) || ''
    const endDate = formatDate(medication.endDate) || ''
    const active = getMedicationStatus(medication)
    
    // Split summary text if too long
    const maxWidth = colWidths.summary - 4
    
    // Render the summary with name/dosage in BOLD and UPPERCASE, rest in normal font
    // All on the same line(s) - the summary may wrap to multiple lines
    const nameWithDosage = medication.dosage 
      ? `${medication.name.toUpperCase()} ${medication.dosage}`
      : medication.name.toUpperCase()
    
    // Find where name/dosage ends (after the period and space)
    const nameEndMarker = nameWithDosage + '. '
    const nameEndIndex = summary.indexOf(nameEndMarker)
    
    let totalLines = 0
    let rowHeight = 8
    
    if (nameEndIndex >= 0) {
      // Name and dosage part (BOLD, uppercase) - includes the period
      const namePart = summary.substring(0, nameEndIndex + nameWithDosage.length + 1) // Include the period
      const restPart = summary.substring(nameEndIndex + nameWithDosage.length + 2) // Skip ". "
      
      // Split both parts to handle wrapping
      const nameLines = pdf.splitTextToSize(namePart, maxWidth)
      const restLines = restPart ? pdf.splitTextToSize(restPart, maxWidth) : []
      
      // Calculate total lines needed
      totalLines = nameLines.length + restLines.length
      rowHeight = Math.max(8, totalLines * 5 + 2)
    } else {
      // Fallback: use full summary
      const summaryLines = pdf.splitTextToSize(summary, maxWidth)
      totalLines = summaryLines.length
      rowHeight = Math.max(8, totalLines * 5 + 2)
    }
    
    const rowStartY = currentY - 5
    
    // Alternating row background (white and light grey) - draw with correct height
    if (index % 2 === 1) {
      pdf.setFillColor(245, 245, 245) // light grey
      pdf.rect(margin, rowStartY, pageWidth - 2 * margin, rowHeight, 'F')
    } else {
      pdf.setFillColor(255, 255, 255) // white
      pdf.rect(margin, rowStartY, pageWidth - 2 * margin, rowHeight, 'F')
    }
    
    // Render the summary text - name/dosage in bold, rest in normal, all flowing continuously on same line
    if (nameEndIndex >= 0) {
      const namePart = summary.substring(0, nameEndIndex + nameWithDosage.length + 1) // "AMOXYCILIN 50mg."
      const restPart = summary.substring(nameEndIndex + nameWithDosage.length + 2) // "Take 1 capsule..."
      const splitPoint = nameEndIndex + nameWithDosage.length + 1 // Position after the period
      
      // Split the full summary to see how it wraps naturally
      const fullSummaryLines = pdf.splitTextToSize(summary, maxWidth)
      
      let currentLineY = currentY
      let summaryPos = 0
      
      for (let i = 0; i < fullSummaryLines.length; i++) {
        const line = fullSummaryLines[i]
        const lineStartPos = summaryPos
        const lineEndPos = summaryPos + line.length
        
        // Check if this line crosses the split point (contains both name and rest)
        if (lineStartPos < splitPoint && lineEndPos > splitPoint) {
          // This line contains both parts - render name part, then continue with rest on same line
          const namePartInLine = summary.substring(lineStartPos, splitPoint + 1) // Include the period: "AMOXYCILIN 50mg."
          const restPartInLine = summary.substring(splitPoint + 1, lineEndPos) // Start from space after period: " Take 1 capsule..."
          
          // Render name part (bold)
          pdf.setFont(undefined, 'bold')
          pdf.text(namePartInLine, colX.summary + 2, currentLineY)
          
          // Calculate X position where name ends - must use bold font for accurate width
          pdf.setFont(undefined, 'bold')
          const nameWidth = pdf.getTextWidth(namePartInLine)
          
          // Render rest part (normal) continuing on the same line
          // Don't trim - we want to preserve the exact text including any leading space
          if (restPartInLine) {
            pdf.setFont(undefined, 'normal')
            // Position right after the name part ends
            pdf.text(restPartInLine, colX.summary + 2 + nameWidth, currentLineY)
          }
        } else if (lineEndPos <= splitPoint) {
          // This line is entirely name part
          pdf.setFont(undefined, 'bold')
          pdf.text(line, colX.summary + 2, currentLineY)
        } else {
          // This line is entirely rest part
          pdf.setFont(undefined, 'normal')
          pdf.text(line, colX.summary + 2, currentLineY)
        }
        
        summaryPos = lineEndPos
        currentLineY += 5
      }
    } else {
      // Fallback: render entire summary in bold if we can't find the split point
      pdf.setFont(undefined, 'bold')
      const summaryLines = pdf.splitTextToSize(summary, maxWidth)
      pdf.text(summaryLines, colX.summary + 2, currentY)
    }
    
    // Start Date
    pdf.setFont(undefined, 'normal')
    pdf.text(startDate, colX.startDate + 2, currentY)
    
    // End Date
    pdf.text(endDate, colX.endDate + 2, currentY)
    
    // Active
    pdf.setFont(undefined, 'bold')
    if (active === 'Yes') {
      pdf.setTextColor(16, 185, 129) // green
    } else if (active === 'Discontinued') {
      pdf.setTextColor(156, 163, 175) // gray
    } else {
      pdf.setTextColor(239, 68, 68) // red
    }
    pdf.text(active, colX.active + 2, currentY)
    pdf.setTextColor(0, 0, 0) // Reset to black
    
    currentY += rowHeight
  })
  
  // Add new page for time-based listing
  pdf.addPage()
  currentY = margin
  
  // Title for time-based listing
  pdf.setFontSize(18)
  pdf.setFont(undefined, 'bold')
  const timeBasedTitle = groupName && groupName !== 'My Medications' 
    ? `Medication Schedule by Time - ${groupName}`
    : 'Medication Schedule by Time'
  pdf.text(timeBasedTitle, margin, currentY)
  currentY += 10
  
  // Date generated
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, currentY)
  currentY += 12
  
  // Group medications by time
  const timeGroups = {}
  
  // Filter out discontinued and inactive medications
  const activeMedications = sortedMedications.filter(med => {
    if (med.discontinued) return false
    
    const medToday = new Date()
    medToday.setHours(0, 0, 0, 0)
    
    if (med.startDate) {
      const start = new Date(med.startDate)
      start.setHours(0, 0, 0, 0)
      if (start > medToday) return false
    }
    
    if (med.endDate) {
      const end = new Date(med.endDate)
      end.setHours(0, 0, 0, 0)
      if (end < medToday) return false
    }
    
    // Only include medications with specific times (not times_per_day or as_needed)
    return med.frequencyType === 'specific_times' && med.specificTimes && med.specificTimes.length > 0
  })
  
  // Group medications by their specific times
  activeMedications.forEach(medication => {
    medication.specificTimes.forEach(time => {
      if (!timeGroups[time]) {
        timeGroups[time] = []
      }
      
      // Check if medication already added for this time (avoid duplicates)
      const exists = timeGroups[time].some(m => m.id === medication.id)
      if (!exists) {
        timeGroups[time].push({
          id: medication.id,
          name: medication.name,
          dosage: medication.dosage
        })
      }
    })
  })
  
  // Sort medications within each time group by name
  Object.keys(timeGroups).forEach(timeKey => {
    timeGroups[timeKey].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  })
  
  // Get day start/end times from group, or use defaults
  const dayStartTime = group?.dayStartTime ? group.dayStartTime.substring(0, 5) : '06:00'
  const dayEndTime = group?.dayEndTime ? group.dayEndTime.substring(0, 5) : '23:59'
  
  // Sort time slots using day boundary logic
  const timeKeys = Object.keys(timeGroups)
  const sortedTimeSlots = sortTimesByDayBoundary(timeKeys, dayStartTime, dayEndTime)
  
  // Format time for display
  const formatTimeForDisplay = (timeKey) => {
    if (timeKey.startsWith('#')) {
      // Numbered times - skip these as they're not meaningful without context
      return null
    }
    
    let timeLabel = ''
    
    if (timeKey.match(/^\d{2}:\d{2}$/)) {
      // Specific time format HH:MM - convert to 12-hour format (e.g., "12pm", "4pm")
      const [h, m] = timeKey.split(':')
      const hour = parseInt(h)
      const minutes = parseInt(m)
      const ampm = hour >= 12 ? 'pm' : 'am'
      const displayHour = hour % 12 || 12
      
      // Format: "12pm" or "4pm" (no minutes if :00, otherwise include minutes)
      if (minutes === 0) {
        timeLabel = `${displayHour}${ampm}`
      } else {
        timeLabel = `${displayHour}:${m}${ampm}`
      }
    } else {
      // Named times
      if (timeKey === 'morning') {
        timeLabel = 'In the morning'
      } else if (timeKey === 'evening') {
        timeLabel = 'In the evening'
      } else if (timeKey === 'bedtime') {
        timeLabel = 'At bedtime'
      } else {
        timeLabel = timeKey
      }
    }
    
    // Check for custom label from group
    const customLabel = group?.timeLabels?.[timeKey]
    if (customLabel) {
      return `${timeLabel} (${customLabel})`
    }
    
    return timeLabel
  }
  
  // Render time-based listing
  pdf.setFontSize(12)
  pdf.setFont(undefined, 'normal')
  pdf.setTextColor(0, 0, 0)
  
  sortedTimeSlots.forEach(timeKey => {
    const medications = timeGroups[timeKey]
    if (medications.length === 0) return
    
    const timeLabel = formatTimeForDisplay(timeKey)
    // Skip numbered times as they're not meaningful
    if (!timeLabel) return
    
    // Check if we need a new page
    if (currentY > pageHeight - 30) {
      pdf.addPage()
      currentY = margin
    }
    
    // Time header
    pdf.setFont(undefined, 'bold')
    pdf.setFontSize(11)
    pdf.text(`${timeLabel}:`, margin, currentY)
    currentY += 7
    
    // Medications for this time
    pdf.setFont(undefined, 'normal')
    pdf.setFontSize(10)
    medications.forEach(med => {
      // Check if we need a new page
      if (currentY > pageHeight - 15) {
        pdf.addPage()
        currentY = margin
        // Redraw time header if we're on a new page
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(11)
        pdf.text(`${timeLabel}:`, margin, currentY)
        currentY += 7
        pdf.setFont(undefined, 'normal')
        pdf.setFontSize(10)
      }
      
      const medText = med.dosage 
        ? `${med.name} ${med.dosage}`
        : med.name
      pdf.text(medText, margin + 5, currentY)
      currentY += 6
    })
    
    currentY += 3 // Extra space between time groups
  })
  
  // Save PDF
  const filename = `medication-list-${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(filename)
}


