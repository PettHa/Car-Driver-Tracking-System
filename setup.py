#!/usr/bin/env python3
"""
Setup script for Bilsjåfør Registrering project
Creates the directory structure and empty files for the Node.js + React application
"""

import os
import shutil
import json

def create_directory(path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Created directory: {path}")

def create_file(path, content=""):
    """Create file with optional content"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created file: {path}")

def main():
    # Project root directory (where this script is located)
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Backend files
    create_file(os.path.join(root_dir, 'server.js'))
    create_file(os.path.join(root_dir, 'package.json'))
    
    # Create client directory
    client_dir = os.path.join(root_dir, 'client')
    create_directory(client_dir)
    
    # Client public directory
    public_dir = os.path.join(client_dir, 'public')
    create_directory(public_dir)
    create_file(os.path.join(public_dir, 'index.html'))
    create_file(os.path.join(public_dir, 'favicon.ico'), "")
    create_file(os.path.join(public_dir, 'manifest.json'), json.dumps({
        "short_name": "Bilsjåfør",
        "name": "Bilsjåfør Registrering",
        "icons": [],
        "start_url": ".",
        "display": "standalone",
        "theme_color": "#000000",
        "background_color": "#ffffff"
    }, indent=2))
    
    # Client source directory
    src_dir = os.path.join(client_dir, 'src')
    create_directory(src_dir)
    
    # Main app files
    create_file(os.path.join(src_dir, 'index.js'))
    create_file(os.path.join(src_dir, 'App.js'))
    
    # Create styles directory
    styles_dir = os.path.join(src_dir, 'styles')
    create_directory(styles_dir)
    create_file(os.path.join(styles_dir, 'App.css'))
    
    # Create pages directory
    pages_dir = os.path.join(src_dir, 'pages')
    create_directory(pages_dir)
    create_file(os.path.join(pages_dir, 'EditPage.js'))
    create_file(os.path.join(pages_dir, 'ViewPage.js'))
    create_file(os.path.join(pages_dir, 'AdminPage.js'))
    
    # Create components directory
    components_dir = os.path.join(src_dir, 'components')
    create_directory(components_dir)
    create_file(os.path.join(components_dir, 'CarRow.js'))
    create_file(os.path.join(components_dir, 'ViewCarRow.js'))
    create_file(os.path.join(components_dir, 'AdminCarRow.js'))
    create_file(os.path.join(components_dir, 'KeyboardShortcuts.js'))
    create_file(os.path.join(components_dir, 'RefreshIndicator.js'))
    
    # Create popups directory
    popups_dir = os.path.join(components_dir, 'popups')
    create_directory(popups_dir)
    create_file(os.path.join(popups_dir, 'MaintenancePopup.js'))
    create_file(os.path.join(popups_dir, 'EndAllTripsPopup.js'))
    create_file(os.path.join(popups_dir, 'ShortcutsPopup.js'))
    
    # Create client package.json
    create_file(os.path.join(client_dir, 'package.json'))
    
    # Create README.md
    create_file(os.path.join(root_dir, 'README.md'))
    
    print("\nProject structure created successfully!")
    print("\nNext steps:")
    print("1. Copy the content for each file from the provided artifacts")
    print("2. Install backend dependencies: npm install")
    print("3. Install frontend dependencies: cd client && npm install")
    print("4. Start the development server: npm run dev-full")

if __name__ == "__main__":
    main()