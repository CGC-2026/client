import { FlatList, SafeAreaView, Text } from "react-native";

const activities = [
  { id: 1, name: "Activity 1" },
  { id: 2, name: "Activity 2" },
  { id: 3, name: "Activity 3" },
];

export default function ActivitiesScreen() {
  return (
    <SafeAreaView>
      {/* Create a list of activities, which will show us the activities that we have done */}
      <FlatList
        data={activities}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    </SafeAreaView>
  );
}
