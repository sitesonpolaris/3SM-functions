const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, FNAME, LNAME, PHONE, MMERGE5, MMERGE6, MMERGE7 } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const listId = process.env.MAILCHIMP_LIST_ID;
    const subscriberHash = require('crypto').createHash('md5').update(email.toLowerCase()).digest('hex');

    try {
      // Check if the email already exists in the Mailchimp list
      const existingMember = await mailchimp.lists.getListMember(listId, subscriberHash);

      if (existingMember) {
        // Update existing subscriber with new merge fields
        await mailchimp.lists.updateListMember(listId, subscriberHash, {
          merge_fields: { FNAME, LNAME, PHONE, MMERGE5, MMERGE6, MMERGE7 },
          status_if_new: 'subscribed'
        });

        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Subscriber updated successfully' }),
        };
      }
    } catch (error) {
      if (error.status === 404) {
        // Email not found, proceed with adding a new subscriber
        const response = await mailchimp.lists.addListMember(listId, {
          email_address: email,
          status: 'subscribed',
          merge_fields: { FNAME, LNAME, PHONE, MMERGE5, MMERGE6, MMERGE7 }
        });

        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'New subscriber added successfully' }),
        };
      }
    }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Unexpected error occurred' }),
    };
  } catch (error) {
    console.error('Mailchimp API Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to submit form. Please try again later.' }),
    };
  }
};
