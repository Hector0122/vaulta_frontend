import React, { Suspense } from 'react'
import { ActivityIndicator, View } from 'react-native'
import type { CalendarProps } from 'react-native-calendars'

const CalendarComponent = React.lazy(() =>
  import('react-native-calendars').then(m => ({ default: m.Calendar })),
)

export default function LazyCalendar(props: CalendarProps) {
  return (
    <Suspense
      fallback={
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" />
        </View>
      }
    >
      <CalendarComponent {...props} />
    </Suspense>
  )
}
