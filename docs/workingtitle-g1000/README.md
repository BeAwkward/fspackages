# Documentation for the Working Title G1000

This is a mod for the G1000 in the the new Microsoft Flight Simulator.  The stock instrument has a number of deficiencies, and this is an attempt to fix some of them.  Currently, the two main features are:

* adding software control of brightness, for those planes that lack dedicated avionics brightness knobs
* adding an accurate menu item for turning synthetic vision on and off

## Brightness control

The stock G1000 did not implement the real-world PFD configuration menu which allows changing the brightness of the display.  This meant that the planes that lacked a hardware avionics brightness knob did not have any ability to dim the displays, which makes night-time flying painful.  This mod fixes that.

We have added a new PFD configuration menu, accessed through the menu button, which is inspired by, but not a complete replica of, the real-world menu.  We left out the AUTO/MANUAL brightness switch because that makes no sense in the sim, and the UI isn't exactly right because it was created within the confines of the existing panel styles in the G1000, but it's close enough.

The original version of this mod broke control of brightness for those aircraft that *did* have dedicated knobs for it, but that has now been fixed.  The PFD logic will read from the sim's default variable for the avionics brightness knob and allow that to override the setting in the PFD.  

Unfortunately, we have not yet found a way to do this completely within the logic of the G1000 itself.  Planes that do not use the default index number for the avionics knob will need a small tweak to their `panel.xml` to tell the PFD which knob to listen to.  This mod includes pre-tweaked files for the default C172 and G36 G1000 setups.  If you need to modify your own plane, full details are in `AvionicsKnobIndex.md`.

## Synthetic Vision

G1000 units with synthetic vision are supposed to have a menu item that allows it to be turned off and configured.  This menu was not implemented in the default G1000.  With this mod, there is now a `SYN VIS` option inside the `PFD` menu on the PFD.  Pressing this will load a new menu page for synthetic vision.  Detailed configuration is not yet available, but the system can be turned on and off by pressing the `SYN TERR` button in this meny.

This also has the nice side effect of adding synthetic vision to planes that do not have it by default.  But you don't have to turn it on if you don't want to.  :)

## Credits

Thanks is due to:

* [dga711](https://github.com/dga711), whose [devkit](https://github.com/dga711/msfs-webui-devkit) mod made working on this practical
* the folks at the [A320 Neo project](https://github.com/wpine215/msfs-a320neo/) for a little help along the way