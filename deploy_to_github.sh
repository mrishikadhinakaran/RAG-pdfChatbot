#!/bin/bash

# Script to deploy the PDF Chatbot project to GitHub

echo "PDF Chatbot - GitHub Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

echo "Current Git status:"
git status

echo ""
echo "Committing any pending changes..."
git add .
git commit -m "Finalize PDF Chatbot application for GitHub deployment" || echo "No changes to commit"

echo ""
echo "Setting up Git branch..."
git branch -M main

echo ""
echo "Please enter your GitHub username:"
read github_username

echo ""
echo "Please enter your GitHub repository name (create it first at https://github.com/new):"
read repo_name

if [ -z "$github_username" ] || [ -z "$repo_name" ]; then
    echo "Error: Username and repository name are required"
    exit 1
fi

echo ""
echo "Adding remote origin..."
git remote add origin https://github.com/$github_username/$repo_name.git

echo ""
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "Deployment complete!"
echo "Your repository is now available at: https://github.com/$github_username/$repo_name"