import { assertEquals } from "@std/assert";
import { add } from "react-native-asset";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});
