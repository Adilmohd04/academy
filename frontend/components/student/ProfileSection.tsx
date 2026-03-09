'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

interface ProfileSectionProps {
    user: any
    initialProfile: any
}

export default function ProfileSection({ user, initialProfile }: ProfileSectionProps) {
    const { getToken } = useAuth()
    const [profile, setProfile] = useState(initialProfile)
    const [isEditing, setIsEditing] = useState(false)
    const [editedPhone, setEditedPhone] = useState('')
    const [editedBio, setEditedBio] = useState('')
    const [saving, setSaving] = useState(false)

    const handleEdit = () => {
        setEditedPhone(profile?.phone || '')
        setEditedBio(profile?.bio || '')
        setIsEditing(true)
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const token = await getToken()

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        phone_number: editedPhone,
                        bio: editedBio,
                    }),
                }
            )

            if (!response.ok) throw new Error('Failed to update')

            const updated = await response.json()
            setProfile(updated)
            setIsEditing(false)
        } catch (err) {
            console.error('Error updating profile:', err)
            alert('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-lg opacity-50"></div>
                    <div className="relative w-32 h-32 bg-white rounded-full p-1 shadow-xl">
                        <img
                            src={user.imageUrl}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                </div>
                <h2 className="mt-6 text-3xl font-bold text-gray-900">
                    {profile?.full_name || user.firstName}
                </h2>
                <p className="text-indigo-600 font-medium">Student Account</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                    {!isEditing && (
                        <button
                            onClick={handleEdit}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">
                                {profile?.full_name || user.firstName}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">
                                {profile?.email || user.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editedPhone}
                                    onChange={(e) => setEditedPhone(e.target.value)}
                                    className="w-full p-4 bg-white rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                    placeholder="Enter phone number"
                                />
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">
                                    {profile?.phone || 'Not set'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                        {isEditing ? (
                            <textarea
                                value={editedBio}
                                onChange={(e) => setEditedBio(e.target.value)}
                                rows={4}
                                className="w-full p-4 bg-white rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-0 transition-all outline-none resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium min-h-[100px]">
                                {profile?.bio || 'No bio added yet.'}
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="flex-1 py-3 px-6 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
