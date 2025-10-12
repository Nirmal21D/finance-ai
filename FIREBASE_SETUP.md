# Firebase Setup Instructions

## Firestore Composite Indexes Required

Due to Firestore's compound query requirements, you need to create the following composite indexes in your Firebase console.

### Quick Setup (Recommended)

1. **Auto-create indexes by triggering errors:**
   - Run the app and navigate to different pages
   - When you see Firebase index errors in the console, click the provided links
   - This will automatically create the required indexes

2. **Manual setup via Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Firestore Database → Indexes → Composite

### Required Indexes

#### Transactions Collection
```
Collection: transactions
Fields:
- userId (Ascending)
- createdAt (Descending)
```

#### Goals Collection
```
Collection: goals
Fields:
- userId (Ascending) 
- createdAt (Descending)
```

```
Collection: goals
Fields:
- userId (Ascending)
- category (Ascending)
- createdAt (Descending)
```

```
Collection: goals
Fields:
- userId (Ascending)
- status (Ascending)
- deadline (Ascending)
```

### Using Firebase CLI (Advanced)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init firestore`
4. Deploy indexes: `firebase deploy --only firestore:indexes`

The `firestore.indexes.json` file in this project contains all required index definitions.

### Temporary Workaround

If you see Firestore index errors, the app includes temporary workarounds:
- Queries are modified to avoid compound sorting
- Client-side sorting is used instead
- Look for "TODO" comments in the code to re-enable optimized queries

### Error Links

When you encounter Firebase index errors, they provide direct links like:
```
https://console.firebase.google.com/v1/r/project/YOUR-PROJECT/firestore/indexes?create_composite=ENCODED_INDEX_CONFIG
```

Click these links to automatically create the required indexes.

## Security Rules

The app includes comprehensive Firestore security rules in `firestore.rules` that:
- Ensure user data isolation
- Require authentication for all operations
- Validate data structure and permissions

Deploy rules with: `firebase deploy --only firestore:rules`