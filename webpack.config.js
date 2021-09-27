const path = require('path');

module.exports = {
    mode: 'development', // "production" | "development" | "none"

    // ローカル開発用環境を立ち上げる
    // 実行時にブラウザが自動的に localhost を開く
    devServer: {
      static : "dist",
      open: true
    },

    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: './src/app.ts',

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },

    module: {
        rules: [{
            // 拡張子 .ts の場合
            test: /\.ts$/,
            // TypeScriptをコンパイルする
            use: 'ts-loader'    
        },
        {
          test: /\.(scss|sass|less|css)$/i,
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  outputStyle: 'expanded',
                },
              },
            },
          ]
        },
      ]
    },

    // import文で .tsファイルを解決するため
    resolve: {
        modules: [
            "node_modules", // node_modules内も対象とする
        ],
        extensions: [
            '.ts',
            '.js' // node_modulesのライブラリの読み込みに必要
        ]
    }
};