"use client"

import React from "react"
import { Plus, Edit, Trash2, RefreshCw, Share2, Download, Eye, FileSignature, Star, Archive, MoreHorizontal, Clock } from "lucide-react"

interface ActivityRowProps {
  activity: {
    id: string
    entity_type: string
    entity_id: string
    action: string
    created_at: string
    metadata?: { title?: string }
  }
  getIcon: (action: string) => React.ElementType
  getColor: (action: string) => string
}

const ICON_CACHE: Record<string, React.ElementType> = {}

function getCachedIcon(action: string, getIcon: (action: string) => React.ElementType): React.ElementType {
  if (!ICON_CACHE[action]) {
    ICON_CACHE[action] = getIcon(action)
  }
  return ICON_CACHE[action]
}

export const ActivityRow = React.memo(function ActivityRow({ activity, getIcon, getColor }: ActivityRowProps) {
  const Icon = getCachedIcon(activity.action, getIcon)
  const colorClass = getColor(activity.action)

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.entity_type}: {activity.metadata?.title || activity.entity_id}</p>
        <p className="text-xs text-muted-foreground">
          {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} ·
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(activity.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  )
})

ActivityRow.displayName = "ActivityRow"
