# Vercel Deployment Guide

This guide will help you deploy your Next.js application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Supabase project with the necessary environment variables

## Deployment Steps

### 1. Connect Your Repository to Vercel

1. Log in to your Vercel account
2. Click on "Add New..." > "Project"
3. Import your Git repository
4. Select the repository containing your Next.js application

### 2. Configure Project Settings

1. **Framework Preset**: Vercel should automatically detect Next.js
2. **Build and Output Settings**: 
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 3. Environment Variables

Add the following environment variables in the Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Troubleshooting

If you encounter any issues during deployment:

1. Check the build logs for errors
2. Verify that all environment variables are correctly set
3. Make sure your Supabase project is properly configured and accessible
4. Check that your Next.js version is compatible with Vercel

## Continuous Deployment

Vercel automatically deploys your application when you push changes to your repository. You can configure deployment settings in the Vercel dashboard.

## Custom Domains

To add a custom domain to your Vercel deployment:

1. Go to your project settings in Vercel
2. Navigate to the "Domains" tab
3. Add your custom domain and follow the verification steps

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Supabase with Vercel Integration](https://vercel.com/integrations/supabase)
