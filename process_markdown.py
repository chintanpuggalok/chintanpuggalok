import os
import re
import requests
import yaml
import subprocess

# Change to the base of the repository
print("Changing directory to the base of the repository")
os.chdir(os.getenv('GITHUB_WORKSPACE', '.'))

# Find the latest article
print("Finding the latest article")
result = subprocess.run(
    ["git", "log", "-1", "--pretty=format:", "--name-only", "--", "content/blogs/**/*.md"],
    capture_output=True, text=True
)
latest_article = next((line for line in result.stdout.splitlines() if 'content/blogs/_index.md' not in line), None)
if not latest_article:
    print("No article found")
    exit(1)
print(f"Latest article found: {latest_article}")

# Copy the latest article to a temporary file
print(f"Copying {latest_article} to latest_article.md")
copy_result = subprocess.run(["cp", latest_article, "latest_article.md"])
if copy_result.returncode != 0:
    print(f"Failed to copy {latest_article} to latest_article.md")
    exit(1)

# Replace relative paths with GitHub raw content URLs
github_repository = os.getenv('GITHUB_REPOSITORY', 'default/repo')
github_ref_name = os.getenv('GITHUB_REF_NAME', 'main')
repo_url = f"https://raw.githubusercontent.com/{github_repository}/{github_ref_name}/"
latest_article_dir = os.path.dirname(latest_article)
print(f"Repository URL: {repo_url}")
print(f"Latest article directory: {latest_article_dir}")

# def replace_relative_paths(content, repo_url, latest_article_dir):
#     def replace(match):
#          return f"{match.group(1)}({repo_url}{latest_article_dir}/{match.group(2).lstrip('./')})"
#     return re.sub(r'(!\[.*?\]\()(\./.*?\))', replace, content)

print("Reading latest_article.md")
with open('latest_article.md', 'r') as file:
    content = file.read()

# Ensure content is read as a string
if not isinstance(content, str):
    print("Error: Content is not a string")
    exit(1)

print("Replacing relative paths")
# content = replace_relative_paths(content, repo_url, latest_article_dir)

# Remove metadata from the top of the markdown file


print("Writing updated content to latest_article.md")
with open('latest_article.md', 'w') as file:
    file.write(content)

# Extract metadata from the article
print("Extracting metadata from the article")
with open('latest_article.md', 'r') as file:
    lines = file.readlines()

title = description = tags = None
for line in lines:
    if line.startswith('title: '):
        title = line.replace('title: ', '').strip()
    elif line.startswith('description: '):
        description = line.replace('description: ', '').strip()
    elif line.startswith('tags: '):
        tags = [tag.strip() for tag in line.replace('tags: ', '').strip().split(',')]

print(f"Title: {title}")
print(f"Description: {description}")
print(f"Tags: {tags}")

# Set environment variables if they are not None
if title:
    os.environ['title'] = title
if description:
    os.environ['description'] = description
if tags:
    os.environ['tags'] = str(tags)

# Ensure all fields are properly set
if not title:
    print("Error: Title is missing")
    exit(1)
if not description:
    print("Error: Description is missing")
    description = ""
    
if not tags:
    tags = []

print("Removing metadata from the top of the markdown file")
metadata_pattern = re.compile(r'^---\n(.*?\n)*?---\n', re.DOTALL)
content = re.sub(metadata_pattern, '', content)

# Publish to dev.to
devto_api_key = os.getenv('DEVTO_API_KEY')
request_body = {
    "article": {
        "title": title,
        "description": description,
        "tags": tags,
        "published": True,
        "body_markdown": content
    }
}
print("Request body:")
print(request_body)

print("Publishing to dev.to")
response = requests.post(
    'https://dev.to/api/articles',
    headers={
        'Content-Type': 'application/json',
        'api-key': devto_api_key
    },
    json=request_body
)

if response.status_code == 201:
    article_id = response.json().get('id')
    print(f"Article published successfully with ID: {article_id}")
    
    # Add id to the metadata
    metadata = f"---\nid: {article_id}\ndate: {lines[0].replace('date: ', '').strip()}\ntitle: {title}\ntags: {', '.join(tags)}\n---\n"
    content = metadata + content
    
    with open('latest_article.md', 'w') as file:
        file.write(content)
    with open(latest_article, 'w') as file:
        file.write(content)
else:
    print(f"Failed to publish article to dev.to: {response.status_code} {response.text}")
    exit(1)