import React from 'react';
import { Users, Award, TrendingUp, Clock } from 'lucide-react';
import { StatData } from '../types';

interface StatsSectionProps {
  statsData: StatData[];
  isVisible: boolean;
  animatedStats: { [key: string]: number };
}

const StatsSection: React.FC<StatsSectionProps> = ({ statsData, isVisible, animatedStats }) => {
  const getStatIcon = (key: string) => {
    switch (key) {
      case 'clients': return <Users size={32} />;
      case 'experience': return <Award size={32} />;
      case 'satisfaction': return <TrendingUp size={32} />;
      case 'support': return <Clock size={32} />;
      default: return <Users size={32} />;
    }
  };

  return (
    <section id="stats" className={`stats-section ${isVisible ? 'animate-in' : ''}`}>
      <div className="stats-background"></div>
      <div className="stats-pattern"></div>
      <div className="container">
        <div className="stats-content">
          <div className="stats-title">
            <span>Nos</span>
            <span>Résultats</span>
            <span>Chiffrés</span>
          </div>
          
          <div className="stats-grid">
            {statsData.map((stat, index) => (
              <div 
                key={stat.key} 
                className="stat-item"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="stat-icon">
                  {getStatIcon(stat.key)}
                </div>
                <div className="stat-number">
                  {animatedStats[stat.key] || 0}{stat.suffix}
                </div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-description">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;