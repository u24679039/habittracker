import { useState, useEffect } from 'react';

export default function App() {
  // Store the users and track if the data is still loading
  // (No TypeScript angle brackets needed here)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call the backend API
    fetch('http://localhost:3000/api/users')
      .then((response) => response.json())
      .then((data) => {
        setUsers(data);      // Save data to state
        setLoading(false);   // Turn off loading screen
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []); // Empty array means this runs exactly once when the component loads

  // What the user sees while waiting
  if (loading) return <div>Loading users...</div>;

  // What the user sees when data arrives
  return (
    <div>
      <h1>User List</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name ? user.name : 'Unknown User'} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}