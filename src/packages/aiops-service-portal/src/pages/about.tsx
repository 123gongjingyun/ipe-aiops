import { Routes, Route } from 'react-router-dom';
import { AboutTabs } from '../../../shared/src/components/about/about-tabs';
import { CollaborationSection } from '../../../shared/src/components/about/collaboration-section';
import { GuideSection } from '../../../shared/src/components/about/guide-section';
import { AboutContent } from '../components/about-content';

export function About() {
  return (
    <AboutTabs>
      <Routes>
        <Route index element={<AboutContent />} />
        <Route path="collab" element={<CollaborationSection />} />
        <Route path="guide" element={<GuideSection />} />
      </Routes>
    </AboutTabs>
  );
}
