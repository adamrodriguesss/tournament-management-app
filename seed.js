import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hjwvtydqqjexmzcpasfr.supabase.co', 
  'sb_publishable_18kaO-QTKNEmWMCip1x0mA_diglDNGF'
);

const usersToCreate = [
  { email: 'mock_alice@college.edu', full_name: 'Alice Smith', department: 'MCA' },
  { email: 'mock_bob@college.edu', full_name: 'Bob Jones', department: 'MCA' },
  { email: 'mock_charlie@college.edu', full_name: 'Charlie Brown', department: 'MCA' },
  { email: 'mock_david@college.edu', full_name: 'David Lee', department: 'MSC DATA SCIENCE' },
  { email: 'mock_eve@college.edu', full_name: 'Eve Davis', department: 'MSC DATA SCIENCE' },
  { email: 'mock_frank@college.edu', full_name: 'Frank Miller', department: 'MSC AI' },
  { email: 'mock_grace@college.edu', full_name: 'Grace Taylor', department: 'MSC AI' },
  { email: 'mock_heidi@college.edu', full_name: 'Heidi White', department: 'MSC AI' }
];

async function seed() {
  console.log("Starting user seed via true API to avoid schema errors...");
  const userIds = [];

  for (const u of usersToCreate) {
    const { data: auth, error } = await supabase.auth.signUp({
      email: u.email,
      password: 'password123',
      options: {
        data: {
          full_name: u.full_name,
          department: u.department
        }
      }
    });

    if (error) {
      console.error(`❌ Error creating ${u.email}:`, error.message);
    } else {
      console.log(`✅ Created ${u.email}`);
      userIds.push(auth.user.id);
    }
  }

  // After signing up all users, the last one is currently logged in.
  // We can use that session to create the tourney, teams, and events.
  if (userIds.length === 0) {
    console.error("No users were created, aborting tournament creation.");
    return;
  }

  console.log("\nCreating mock tournament...");
  const { data: tourney, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      name: 'Spring Fest 2026',
      description: 'Annual Cultural and Sports Fest (API Seeded)',
      status: 'registration_open',
      created_by: userIds[0] // Alice is admin
    })
    .select()
    .single();

  if (tErr) return console.error("Error creating tournament:", tErr.message);

  console.log("✅ Tournament created:", tourney.name);

  // Teams
  console.log("\nCreating mock teams...");
  const teams = [
    { name: 'MCA Mavericks', department: 'MCA', registration_token: 'MCA123', status: 'confirmed', created_by: userIds[0] },
    { name: 'Data Dynamos', department: 'MSC DATA SCIENCE', registration_token: 'MDS123', status: 'confirmed', created_by: userIds[3] },
    { name: 'AI Avengers', department: 'MSC AI', registration_token: 'MAI123', status: 'confirmed', created_by: userIds[5] }
  ];

  const { data: createdTeams, error: tmErr } = await supabase.from('teams').insert(
    teams.map(t => ({ ...t, tournament_id: tourney.id }))
  ).select();

  if (tmErr) return console.error("Error creating teams:", tmErr.message);
  console.log(`✅ Created ${createdTeams.length} teams.`);

  // Participants
  console.log("\nAdding participants to teams...");
  const participants = [
    { user_id: userIds[0], team_id: createdTeams[0].id, role_in_team: 'captain', status: 'confirmed' },
    { user_id: userIds[1], team_id: createdTeams[0].id, role_in_team: 'member', status: 'confirmed' },
    { user_id: userIds[2], team_id: createdTeams[0].id, role_in_team: 'member', status: 'pending' },
    
    { user_id: userIds[3], team_id: createdTeams[1].id, role_in_team: 'captain', status: 'confirmed' },
    { user_id: userIds[4], team_id: createdTeams[1].id, role_in_team: 'member', status: 'confirmed' },
    
    { user_id: userIds[5], team_id: createdTeams[2].id, role_in_team: 'captain', status: 'confirmed' },
    { user_id: userIds[6], team_id: createdTeams[2].id, role_in_team: 'member', status: 'confirmed' },
    { user_id: userIds[7], team_id: createdTeams[2].id, role_in_team: 'member', status: 'confirmed' }
  ];

  const { error: pErr } = await supabase.from('participants').insert(
    participants.map(p => ({ ...p, tournament_id: tourney.id }))
  );

  if (pErr) console.error("Error adding participants:", pErr.message);
  else console.log("✅ Added participants.");

  // Events
  console.log("\nCreating mock events...");
  const events = [
    { name: '5v5 Football', type: 'team', format: 'bracket', status: 'upcoming', points_first: 20, points_second: 10, points_third: 5, max_participants_per_team: 5, created_by: userIds[0] },
    { name: 'Solo Dance', type: 'individual', format: 'judged', status: 'upcoming', points_first: 15, points_second: 10, points_third: 5, created_by: userIds[0] }
  ];

  const { error: eErr } = await supabase.from('events').insert(
    events.map(e => ({ ...e, tournament_id: tourney.id }))
  );

  if (eErr) console.error("Error creating events:", eErr.message);
  else console.log("✅ Added events.\n\n🎉 SEED COMPLETE! You can now log in as mock_alice@college.edu using 'password123'!");
}

seed();
