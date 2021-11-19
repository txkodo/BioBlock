# BioBlock
blockbenchで制作したモデル+アニメーションをリソースパック+データパックに変換するwebツール。

# 使用方法

## 基礎編

### モデルを用意する

- blockbenchで "**Bedrock Model**" を新規作成する
- モデル+テクスチャを作る
- blockbench右上のanimateタブに移動しアニメーションを作る
  - この際アニメーション名は a~z,0~9,_ のみを用いること
- モデルを.bbmodelとして保存
  - Ctrl+Sだとjsonとして保存されてしまうので、Ctrl+Alt+Sとすることでbbmodelとして保存できる

### モデルを変換する
- BioBlockのページに移動し保存した.bbmodelをアップロードする
  - 複数アップロード可
  - [BioBlock](https://txkodo.github.io/BioBlock/)
- モデルの素体にするアイテムidを入力する
  - 素体にしたアイテムはBioBlock専用になるので配布マップ等で使わないであろうアイテムを選択すること
- CustomModelDataの最初の値を入力する
  - 素体にするアイテムにすでに別のCustomModelDataが振られている場合に衝突を避けるための数値
  - よくわからなかったら0でOK
- ダウンロードボタンを押す
  - モデルの内容にもよるがそこそこ時間がかかる

### 動作確認
- ダウンロードされたBioBlock_Resourcepackを自分のリソースパックフォルダに移動する
- ダウンロードされたBioBlock_Datapackをワールドのデータパックフォルダに移動する
- マイクラを起動する
- `function bioblock:init`を実行する
- `function bioblock:api/{entity_name}/summon`を実行する
- 自分がモデルをまとったようになれば成功
- `function bioblock:api/{entity_name}/animation-{animation_name}`でモデルが動き出す
- `function bioblock:api/{entity_name}/kill`で解除できる
- `execute as`で実行者を変更することで自分以外のMobがモデルをまとうことができる

あとは他のコマンドと組み合わせてご自由に！

## 発展編

### sleep と awake
エンティティの動きを完全に止めコマンド負荷を軽減するための機能

```function bioblock:api/{entity_name}/summon```

```function bioblock:api/{entity_name}/sleep```

とすることでモデルはエンティティに追従せずその場に居続ける

`function bioblock:api/{entity_name}/awake`

とすることでモデルは再びエンティティに追従する

## kill と die
死亡パーティクルが出るかでないかの違いだけ

```function bioblock:api/{entity_name}/kill```

```function bioblock:api/{entity_name}/die```

## Loop Mode
blockbenchでアニメーションを作る際LoopModeを選択できる。

- Play Once : 一度実行して基本姿勢に戻る
- Hold On Last Frame : 実行後最後の状態をキープ
- Loop : 同じアニメーションをループ
  
歩行や攻撃などアニメーションによって使い分けるとよい

## コマンド埋め込み

アニメーションの任意のタイミングで指定したコマンドが実行できる

blockbenchのアニメーション編集画面の下にあるタイムラインの左上に**Animate Effects**の項目があり、それをクリックすることで
Particle / Sound / Instructions の項目がタイムライン上に現れる

Instructionsの＋ボタンを押すと左側にScript記入枠が出るので、そこに実行したいコマンドを記入できる

実行タイミングはタイムライン上で調整できる

### 連番コマンド
Script内に記入するコマンドを少し変えるとチックを跨いで連番でコマンドを実行できる

`[1..100]function test/%`

とすると`test/1`から`test/100`までのファンクションが1チックごとに順番に呼び出される

また、%を使わないことも可能だ

`[1..10]say hello`

とすると10チックのあいだhelloとしゃべるようになる

### 位置実行
口から炎を出したい、パンチ位置でエフェクトを出したいといった体のパーツの場所でコマンドを実行する機能

`[@bone4]particle flame`

とするとグループbone4の位置でパーティクルを出せる
コマンドの実行角度はグループのz軸のマイナス方向が前になる

連番コマンドと組み合わせる場合は`[1..100@bone4]...`とすればよい

## 音源埋め込み
アニメーションの任意のタイミングで指定した音を鳴らす

blockbenchのアニメーション編集画面の下にあるタイムラインの左上に**Animate Effects**の項目があり、それをクリックすることで
Particle / Sound / Instructions の項目がタイムライン上に現れる

Soundの＋ボタンを押すと左側に**Select Keyframe File**ボタンがでるのでそれを押して鳴らしたい音源を選択する

ただし、音源は.ogg/.mp3のいずれかであること

BioBlockで変換する際に音源選択画面がでるので、必要な音源を選択する