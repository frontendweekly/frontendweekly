---
title: 'Blogroll'
layout: 'layouts/blogroll.njk'
---

Frontend Weekly は以下の{{ blogroll.items | length }}の素晴らしいコンテンツ達をベースに成り立っています。
この場を借りて、すべての書き手に感謝致します。

{% if blogroll.dateCreated %}
最終更新日: <time datetime="{{ blogroll.dateCreated | dateIsoFilter }}" class="dt-published">{{ blogroll.dateCreated | dateOrdinalSuffixFilter }}</time>
{% endif %}
