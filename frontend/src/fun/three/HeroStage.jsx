import React from 'react';
import Stage from './Stage';
import { BarsScene, BuildScene, CratesScene, GearsScene, LinkScene, MagicScene, PhotoScene, TrainScene, WorkbenchScene, Z } from './scenes';

/** The 3D scene for a page's hero banner. */
export default function HeroStage({ page, data, calm, onFlash }) {
  let scene = null;
  switch (page) {
    case 'DailyTasks': scene = <WorkbenchScene pending={data.pending} calm={calm} />; break;
    case 'WeeklyTasks': scene = <TrainScene calm={calm} friday={data.friday} />; break;
    case 'Analytics': scene = <BarsScene planned={data.planned} done={data.done} calm={calm} />; break;
    case 'Management': scene = <GearsScene activity={data.activity} health={data.health} calm={calm} />; break;
    case 'ProjectManagement': scene = <BuildScene progress={data.progress} calm={calm} />; break;
    case 'Tasks': scene = <CratesScene todo={data.todo} doing={data.doing} done={data.done} calm={calm} />; break;
    case 'Team': scene = <PhotoScene members={data.members} calm={calm} onFlash={onFlash} />; break;
    case 'AIAllocation': scene = <MagicScene calm={calm} />; break;
    case 'SheetsSetup': scene = <LinkScene calm={calm} />; break;
    default: return null;
  }
  return <Stage ortho zoom={Z} calm={calm} style={{ position: 'absolute', inset: 0 }}>{scene}</Stage>;
}
