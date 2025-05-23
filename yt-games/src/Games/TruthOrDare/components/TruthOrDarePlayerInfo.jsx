import React from 'react';

function TruthOrDarePlayerInfo({ doer, commander, taskAssignmentMode }) {
  if (!doer) return null;

  return (
    <>
      <div className={`p-3 bg-gray-700 rounded-lg text-center shadow-md ${taskAssignmentMode === 'player_assigned' ? 'mb-2' : 'mb-4'}`}>
        <p className="text-lg text-gray-100">Doer: <span className="font-bold text-blue-300">{doer.name}</span></p>
      </div>
      {taskAssignmentMode === 'player_assigned' && commander && (
        <div className="p-3 bg-gray-700 rounded-lg text-center shadow-md mb-4">
          <p className="text-lg text-gray-100">Commander: <span className="font-bold text-blue-300">{commander.name}</span></p>
        </div>
      )}
    </>
  );
}

export default TruthOrDarePlayerInfo;