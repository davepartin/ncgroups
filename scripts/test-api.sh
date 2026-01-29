#!/bin/bash

# Get a person ID
PERSON_ID=$(curl -s http://localhost:3000/api/people | jq -r '.people[0].id')

echo "Testing person ID: $PERSON_ID"
echo ""

# Get current status
echo "Before update:"
curl -s http://localhost:3000/api/people/$PERSON_ID | jq '{firstName, lastName, membershipStatus}'
echo ""

# Update to Member
echo "Updating to Member..."
curl -s -X PUT http://localhost:3000/api/people/$PERSON_ID \
  -H "Content-Type: application/json" \
  -d '{"membershipStatus": "Member"}' | jq '{firstName, lastName, membershipStatus}'
echo ""

# Get status again
echo "After update:"
curl -s http://localhost:3000/api/people/$PERSON_ID | jq '{firstName, lastName, membershipStatus}'
