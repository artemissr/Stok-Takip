module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      function forceStockPlusToSubcategory({ types: t }) {
        return {
          name: 'force-stock-plus-to-subcategory',
          visitor: {
            ConditionalExpression(path) {
              const { test, consequent, alternate } = path.node;
              if (
                t.isBinaryExpression(test, { operator: '!==' }) &&
                t.isIdentifier(test.left, { name: 'mainCategory' }) &&
                t.isStringLiteral(test.right, { value: 'Tümü' }) &&
                t.isCallExpression(consequent) &&
                t.isCallExpression(alternate) &&
                t.isIdentifier(consequent.callee, { name: 'onOpen' }) &&
                t.isIdentifier(alternate.callee, { name: 'onOpen' }) &&
                t.isStringLiteral(alternate.arguments[0], { value: 'ingredient' })
              ) {
                path.replaceWith(consequent);
              }
            },
          },
        };
      },
    ],
  };
};
