import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import FunLoader from '@/fun/FunLoader';
import { Emoji, Rich } from '@/icons/Emoji';

export default function RoleBasedAccess({ children, allowedRoles = [], fallback = null }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <FunLoader label="Checking your badge…" className="py-8" />
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="text-center py-16 glass-effect-enhanced rounded-lg">
        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
          <Emoji e="🚫" size="2rem" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Access Restricted</h3>
        <p className="text-slate-400">You don't have permission to access this feature.</p>
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}