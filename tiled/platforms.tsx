<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.4" tiledversion="2021.01.13" name="platforms" tilewidth="224" tileheight="64" tilecount="5" columns="1" objectalignment="topleft">
 <tile id="0">
  <properties>
   <property name="destmapid" value="0"/>
   <property name="destx" value="0"/>
   <property name="desty" value="0"/>
   <property name="hidden" type="bool" value="false"/>
   <property name="objtype" value="teleport"/>
  </properties>
  <image width="32" height="16" source="platforms/teleport.png"/>
 </tile>
 <tile id="1">
  <properties>
   <property name="objtype" value="ghostblock"/>
   <property name="time_delay" value="1"/>
   <property name="time_invisible" value="40"/>
   <property name="time_visible" value="40"/>
  </properties>
  <image width="16" height="16" source="platforms/ghostblock.png"/>
 </tile>
 <tile id="2">
  <properties>
   <property name="automatic_loading_zone" type="bool" value="true"/>
   <property name="fakesteel" type="bool" value="false"/>
   <property name="loadingzone_abs_bottom" type="int" value="510"/>
   <property name="loadingzone_abs_left" type="int" value="0"/>
   <property name="loadingzone_abs_right" type="int" value="510"/>
   <property name="loadingzone_abs_top" type="int" value="0"/>
   <property name="loadingzone_rel_bottom" type="int" value="14"/>
   <property name="loadingzone_rel_left" type="int" value="-20"/>
   <property name="loadingzone_rel_right" type="int" value="20"/>
   <property name="loadingzone_rel_top" type="int" value="-14"/>
   <property name="loadingzone_use_relative" type="bool" value="true"/>
   <property name="objtype" value="platform"/>
   <property name="script_offset" value="PlatformScript_3602"/>
   <property name="touch_activated" type="bool" value="false"/>
  </properties>
  <image width="48" height="16" source="platforms/normal.png"/>
 </tile>
 <tile id="3">
  <properties>
   <property name="automatic_loading_zone" type="bool" value="true"/>
   <property name="fakesteel" type="bool" value="false"/>
   <property name="loadingzone_abs_bottom" type="int" value="510"/>
   <property name="loadingzone_abs_left" type="int" value="0"/>
   <property name="loadingzone_abs_right" type="int" value="510"/>
   <property name="loadingzone_abs_top" type="int" value="0"/>
   <property name="loadingzone_rel_bottom" type="int" value="14"/>
   <property name="loadingzone_rel_left" type="int" value="-20"/>
   <property name="loadingzone_rel_right" type="int" value="20"/>
   <property name="loadingzone_rel_top" type="int" value="-14"/>
   <property name="loadingzone_use_relative" type="bool" value="true"/>
   <property name="objtype" value="platform"/>
  </properties>
  <image width="48" height="16" source="platforms/soft.png"/>
 </tile>
 <tile id="4">
  <properties>
   <property name="automatic_loading_zone" type="bool" value="true"/>
   <property name="fakesteel" type="bool" value="false"/>
   <property name="loadingzone_abs_bottom" type="int" value="510"/>
   <property name="loadingzone_abs_left" type="int" value="0"/>
   <property name="loadingzone_abs_right" type="int" value="510"/>
   <property name="loadingzone_abs_top" type="int" value="0"/>
   <property name="loadingzone_rel_bottom" type="int" value="14"/>
   <property name="loadingzone_rel_left" type="int" value="-20"/>
   <property name="loadingzone_rel_right" type="int" value="20"/>
   <property name="loadingzone_rel_top" type="int" value="-14"/>
   <property name="loadingzone_use_relative" type="bool" value="true"/>
   <property name="objtype" value="platform"/>
  </properties>
  <image width="48" height="16" source="platforms/trap_down.png"/>
 </tile>
 <tile id="5">
  <properties>
   <property name="automatic_loading_zone" type="bool" value="true"/>
   <property name="fakesteel" type="bool" value="false"/>
   <property name="loadingzone_abs_bottom" type="int" value="510"/>
   <property name="loadingzone_abs_left" type="int" value="0"/>
   <property name="loadingzone_abs_right" type="int" value="510"/>
   <property name="loadingzone_abs_top" type="int" value="0"/>
   <property name="loadingzone_rel_bottom" type="int" value="14"/>
   <property name="loadingzone_rel_left" type="int" value="-20"/>
   <property name="loadingzone_rel_right" type="int" value="20"/>
   <property name="loadingzone_rel_top" type="int" value="-14"/>
   <property name="loadingzone_use_relative" type="bool" value="true"/>
   <property name="objtype" value="platform"/>
  </properties>
  <image width="48" height="16" source="platforms/trap_up.png"/>
 </tile>
 <tile id="6">
  <properties>
   <property name="automatic_loading_zone" type="bool" value="true"/>
   <property name="fakesteel" type="bool" value="false"/>
   <property name="loadingzone_abs_bottom" type="int" value="510"/>
   <property name="loadingzone_abs_left" type="int" value="0"/>
   <property name="loadingzone_abs_right" type="int" value="510"/>
   <property name="loadingzone_abs_top" type="int" value="0"/>
   <property name="loadingzone_rel_bottom" type="int" value="14"/>
   <property name="loadingzone_rel_left" type="int" value="-20"/>
   <property name="loadingzone_rel_right" type="int" value="20"/>
   <property name="loadingzone_rel_top" type="int" value="-14"/>
   <property name="loadingzone_use_relative" type="bool" value="true"/>
   <property name="objtype" value="platform"/>
  </properties>
  <image width="224" height="64" source="platforms/chain.png"/>
 </tile>
</tileset>
