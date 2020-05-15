const wm = require('../src/_data/webmentions');

describe('webmentions', () => {
  test('it should return expected field', async () => {
    // Act
    const mentions = await wm(); // ?
    // Assert
    expect(mentions[0]).toMatchSnapshot({
      author: {
        name: expect.any(String),
        photo: expect.any(String),
        type: expect.any(String),
        url: expect.any(String),
      },
      content: {
        text: expect.any(String),
      },
      'repost-of': expect.any(String),
      published: expect.anything(),
      type: expect.any(String),
      url: expect.any(String),
      'wm-id': expect.any(Number),
      'wm-private': expect.any(Boolean),
      'wm-property': expect.any(String),
      'wm-received': expect.anything(),
      'wm-source': expect.any(String),
      'wm-target': expect.any(String),
    });
  });
});
