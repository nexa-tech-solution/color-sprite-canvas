-- Keep original page IDs so existing drawings still find their artwork.
insert into public.premium_pages(id,price) values
 ('christmas-gingerbread-house',35), ('christmas-sleigh',40),
 ('picture2',35), ('fantasy/frost-crown-princess',40),
 ('picture8',30), ('cute/ocean-friends',30), ('picture7',25), ('cute/sleepy-owl',25),
 ('picture10',35), ('play/dino-rainbow',30),
 ('fantasy/baby-dragon',35), ('play/birthday-party',25)
on conflict(id) do nothing;
