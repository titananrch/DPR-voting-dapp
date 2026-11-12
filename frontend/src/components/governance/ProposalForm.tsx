import React, { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useCreateProposal } from '../../hooks/governance/mutations/useCreateProposal'
import { useGovernancePermissions } from '../../hooks/governance/useGovernancePermissions'
import { showToast, removeToast } from '../Toast'

export type RuleChangeTypeOption = {
  value: number
  label: string
  description: string
}

const RULE_CHANGE_TYPES: RuleChangeTypeOption[] = [
  { value: 0, label: 'Quorum', description: 'Change minimum participation threshold' },
  { value: 1, label: 'Voting Duration', description: 'Change voting period length' },
  { value: 2, label: 'Approval Threshold', description: 'Change vote approval requirement' },
  { value: 3, label: 'Min Proposal Delay', description: 'Change delay before voting starts' },
  { value: 4, label: 'Emergency Pause', description: 'Enable or disable emergency pause' },
  { value: 5, label: 'Election Authority', description: 'Change election authority address' },
  { value: 6, label: 'Recall Authority', description: 'Change recall authority address' },
]

interface ProposalFormProps {
  onSuccess?: () => void
}

export function ProposalForm({ onSuccess }: ProposalFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    changeType: 0,
    newValue: '',
  })
  const [error, setError] = useState<string | null>(null)

  const createProposal = useCreateProposal()
  const { canPropose, isLoading: permissionsLoading } = useGovernancePermissions()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'changeType' ? parseInt(value, 10) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    console.log('📝 Form submitted with data:', formData)

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }
    if (!formData.newValue.trim() && formData.changeType !== 4) {
      setError('Value is required')
      return
    }

    let loadingToastId: string | undefined

    try {
      const newValueNumber = formData.newValue ? parseInt(formData.newValue, 10) : 0

      console.log('✅ Validation passed, creating proposal...')

      loadingToastId = showToast({
        type: 'loading',
        title: 'Creating proposal...',
        message: 'Please confirm the transaction in your wallet',
        duration: 0
      })

      console.log('📤 Calling mutateAsync with:', {
        title: formData.title,
        description: formData.description,
        changeType: formData.changeType,
        newValue: newValueNumber,
      })

      await createProposal.mutateAsync({
        title: formData.title,
        description: formData.description,
        changeType: formData.changeType as number,
        newValue: newValueNumber,
      })

      console.log('✅ Proposal creation succeeded!')

      // Remove loading toast
      if (loadingToastId) {
        removeToast(loadingToastId)
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        changeType: 0,
        newValue: '',
      })
      setIsOpen(false)

      showToast({
        type: 'success',
        title: 'Proposal created successfully!',
        message: `Your "${formData.title}" proposal has been created and is in draft status.`,
        duration: 3000 // Reduced from 4000 to 3000
      })

      console.log('🔔 Success toast shown')

      onSuccess?.()
    } catch (err) {
      console.error('❌ Failed to create proposal:', err)
      
      // Remove loading toast
      if (loadingToastId) {
        removeToast(loadingToastId)
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal'
      setError(errorMessage)

      showToast({
        type: 'error',
        title: 'Failed to create proposal',
        message: errorMessage,
        duration: 5000
      })
    }
  }

  if (!canPropose && !permissionsLoading) {
    return null
  }

  return (
    <>
      {/* Open Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={!canPropose || permissionsLoading}
        className="px-4 py-2 bg-blue-700 hover:cursor-pointer text-sm rounded-lg hover:bg-blue-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        + Create Proposal
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="bg-[#0e0e0e] rounded-lg border border-white/5 max-w-2xl w-full mx-4">
            {/* Header */}
            <div className="border-b border-white/5 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Proposal</h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                }}
                className="px-2 rounded-md text-red-700 border border-white/5 hover:bg-red-700/10 hover:cursor-pointer bg-red-600/10 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-700/10 border border-white/5 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Proposal Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Increase Quorum to 60%"
                  className="w-full px-3 py-2 bg-[#131313] font-medium border border-white/5 rounded-lg focus:outline-none focus:bg-[#151515] hover:bg-[#11111a] transition-colors"
                  disabled={createProposal.isPending}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Explain the rationale and expected impact of this proposal..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#131313] border font-medium border-white/5 rounded-lg focus:outline-none focus:bg-[#151515] hover:bg-[#11111a] transition-colors"
                  disabled={createProposal.isPending}
                />
              </div>

              {/* Change Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Parameter to Change
                </label>
                <select
                  name="changeType"
                  value={formData.changeType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#131313] font-medium border border-white/5 rounded-lg focus:outline-none focus:bg-[#151515] hover:bg-[#11111a] transition-colors"
                  disabled={createProposal.isPending}
                >
                  {RULE_CHANGE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} — {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Value */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  New Value {formData.changeType === 4 ? '(0=disable, 1=enable)' : '(in basis points)'}
                </label>
                <input
                  type="number"
                  name="newValue"
                  value={formData.newValue}
                  onChange={handleChange}
                  placeholder={formData.changeType === 4 ? '0' : '5000'}
                  className="w-full px-3 py-2 bg-[#131313] font-medium border border-white/5 rounded-lg focus:outline-none focus:bg-[#151515] hover:bg-[#11111a] transition-colors"
                  disabled={createProposal.isPending}
                />
                {formData.changeType === 4 && (
                  <p className="text-xs text-gray-500 mt-1">
                    EmergencyPause: 0 = disable pause, 1 = enable pause
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setError(null)
                  }}
                  disabled={createProposal.isPending}
                  className="flex-1 px-4 py-2 border border-white/5 bg-[#232323] rounded-lg hover:bg-[#181818] hover:cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProposal.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600/40 rounded-lg hover:bg-blue-700/40 hover:cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createProposal.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createProposal.isPending ? 'Creating...' : 'Create Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
