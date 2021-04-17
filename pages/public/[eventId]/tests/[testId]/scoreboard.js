import {
    Box,
    Heading,
    HStack,
    SimpleGrid,
    Stack,
    Table,
    Tag,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { useFirestoreCollectionData } from "reactfire";
import EventProvider from "~/components/contexts/EventProvider";
import TestProvider, { useTest } from "~/components/contexts/TestProvider";
import { useTime } from "~/helpers/utils";

// prettier-ignore
const points = [8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 14, 14, 14, 14, 16, 16, 16, 16, 18, 18, 18, 18, 20, 20, 20, 20];

const TestContent = () => {
    const { ref: testRef, data: test } = useTest();
    const { data: graded } = useFirestoreCollectionData(testRef.collection("graded"), { idField: "id" });

    let displayGraded = graded
        .map(x => ({
            ...x,
            gutsSet: Math.min(x.gutsSet, 8),
            score: Object.entries(x)
                .filter(e => Object.keys(points).includes(e[0]))
                .filter(e => Number(e[0]) < test.numPerSet * Math.min(x.gutsSet, 8))
                .reduce((acc, [idx, val]) => acc + points[idx] * val, 0),
        }))
        .sort((a, b) => b.score - a.score);

    let timer;

    if (test.closeTime) {
        const endTime = dayjs(test.closeTime.toDate());
        const time = useTime();
        const timeRemaining = dayjs.duration(endTime.diff(time));
        const mins = timeRemaining.asMinutes();
        timer = mins < 0 ? "00:00:00" : timeRemaining.format("HH:mm:ss");
    } else {
        timer = "Starting Soon";
    }

    return (
        <Stack spacing={8}>
            <VStack spacing={4}>
                <Heading size="lg">{test.name}</Heading>
                <Heading size="2xl">{timer}</Heading>
            </VStack>
            <Table>
                <Thead>
                    <Tr>
                        <Th>Rank</Th>
                        <Th>Progress</Th>
                        <Th>Team</Th>
                        <Th>Organization</Th>
                        <Th>Score</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {displayGraded.map((x, idx) => (
                        <Tr key={x.id}>
                            <Td>{idx + 1}</Td>
                            <Td>
                                <SimpleGrid columns={3} spacing={0} width="24px" spacing="3px">
                                    {[...Array(9).keys()].map(idx => (
                                        <Box
                                            key={idx}
                                            backgroundColor={idx < x.gutsSet ? "blue.500" : "gray.300"}
                                            width="6px"
                                            height="6px"
                                        />
                                    ))}
                                </SimpleGrid>
                            </Td>
                            <Td>
                                <HStack>
                                    <Text>{x.name}</Text>
                                    <Tag size="sm">{x.number}</Tag>
                                </HStack>
                            </Td>
                            <Td>{x.orgName}</Td>
                            <Td>{x.score}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </Stack>
    );
};

const Test = () => (
    <EventProvider>
        <TestProvider>
            <TestContent />
        </TestProvider>
    </EventProvider>
);

export default Test;
