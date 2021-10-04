import {
    Box,
    Button,
    Divider,
    Editable,
    EditableInput,
    Flex,
    Heading,
    HStack,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
    useDisclosure,
    Wrap,
    WrapItem,
} from "@chakra-ui/react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useFirestore, useFirestoreCollectionData, useFunctions } from "reactfire";
import AddStudentModal from "~/components/AddStudentModal";
import AddTeamModal from "~/components/AddTeamModal";
import BlankCard from "~/components/BlankCard";
import Card from "~/components/Card";
import { useDialog } from "~/components/contexts/DialogProvider";
import EventProvider, { useEvent } from "~/components/contexts/EventProvider";
import OrgProvider, { useOrg } from "~/components/contexts/OrgProvider";
import StyledEditablePreview from "~/components/StyledEditablePreview";
import { useFormState } from "~/helpers/utils";

const StudentCard = ({ id, fname, lname, email, waiverSigned }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;

    return (
        <Card as={Stack} spacing={2} m={2} p={4} ref={setNodeRef} style={style}>
            <Box {...listeners} {...attributes}>
                <Heading as="h4" size="md">
                    {fname} {lname}
                </Heading>
                <Text>{email}</Text>
                <Text color={waiverSigned ? "gray.500" : "red.500"}>Waiver {!waiverSigned && "Not "} Signed</Text>
            </Box>
        </Card>
    );
};

const TeamCard = ({ id, name, number, students, onUpdate }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    const props = {
        backgroundColor: isOver ? "gray.100" : undefined,
    };
    return (
        <Card as={Stack} spacing={0} flex={1} p={2} minHeight="xs" transition="background-color 0.1s" {...props}>
            <HStack p={2}>
                {number && <Text color="gray.500">{number}</Text>}
                <Heading as="h4" size="md" position="relative" flex="1">
                    <Editable defaultValue={name} onSubmit={name => onUpdate({ name })}>
                        <StyledEditablePreview />
                        <EditableInput />
                    </Editable>
                </Heading>
            </HStack>
            <Flex direction="column" flex={1} ref={setNodeRef}>
                {students.map(x => (
                    <StudentCard key={x.id} {...x} />
                ))}
                {students.length === 0 && <BlankCard>Drag students here</BlankCard>}
            </Flex>
        </Card>
    );
};

const Teams = ({ title, maxTeams, teams, onAddTeam, onUpdateTeam, studentsByTeam }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [formState, wrapAction] = useFormState();

    const handleAddTeam = wrapAction(async values => {
        await onAddTeam(values);
        onClose();
    });

    return (
        <Stack spacing={4}>
            <Heading size="lg">{title ?? "Teams"}</Heading>
            <p>You may sign up for up to {maxTeams ?? 0} teams.</p>
            {teams.length > 0 && (
                <SimpleGrid columns={3} spacing={4}>
                    {teams.map(x => (
                        <TeamCard
                            key={x.id}
                            onUpdate={update => onUpdateTeam(x.id, update)}
                            {...x}
                            students={studentsByTeam[x.id] ?? []}
                        />
                    ))}
                </SimpleGrid>
            )}
            {teams.length < (maxTeams ?? 0) ? (
                <Button colorScheme="blue" alignSelf="flex-start" onClick={onOpen}>
                    Add Team
                </Button>
            ) : (
                <Tooltip label="You cannot add more teams.">
                    <Box alignSelf="flex-start">
                        <Button colorScheme="blue" disabled>
                            Add Team
                        </Button>
                    </Box>
                </Tooltip>
            )}
            <AddTeamModal isOpen={isOpen} onClose={onClose} onSubmit={handleAddTeam} {...formState} />
        </Stack>
    );
};

const Students = ({ students, onAddStudent }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [formState, wrapAction] = useFormState();

    const handleAddStudent = wrapAction(async values => {
        await onAddStudent(values);
        onClose();
    });

    // Unassigned droppable
    const { isOver, setNodeRef } = useDroppable({ id: "unassigned" });
    const props = {
        backgroundColor: isOver ? "gray.100" : undefined,
    };

    return (
        <Stack spacing={4}>
            <Heading size="lg">Unassigned Students</Heading>
            <p>
                Once you add a student to your team, they will receive an email invitation to create an account on our
                website. If a student already has an account from a previous tournament (such as the Stanford Math
                Tournament), they will receive an email letting them know to reuse that same account.
            </p>
            <Wrap
                spacing={0}
                style={{ marginLeft: "-0.5rem", marginRight: "-0.5rem" }}
                transition="background-color 0.1s"
                borderRadius={4}
                ref={setNodeRef}
                {...props}
            >
                {students.map(x => (
                    <WrapItem key={x.id}>
                        <StudentCard {...x} width={300} />
                    </WrapItem>
                ))}
                {students.length === 0 && <BlankCard>Drag students here</BlankCard>}
            </Wrap>

            <Button colorScheme="blue" alignSelf="flex-start" onClick={onOpen}>
                Invite Student
            </Button>
            <AddStudentModal isOpen={isOpen} onClose={onClose} onSubmit={handleAddStudent} {...formState} />
        </Stack>
    );
};

const TeamsContent = () => {
    // Functions
    const firestore = useFirestore();
    const functions = useFunctions();
    const createStudentAccount = functions.httpsCallable("createStudentAccount");

    // Data
    const { ref: orgRef, data: org } = useOrg();
    const { ref: eventRef, data: event } = useEvent();

    // Get students
    const eventOrgRef = eventRef.collection("orgs").doc(orgRef.id);

    // Get teams
    const teamsRef = eventRef.collection("teams");
    const { data: teams } = useFirestoreCollectionData(teamsRef.where("org", "==", orgRef), { idField: "id" });

    // Get students
    const studentsRef = eventRef.collection("students");
    const { data: students } = useFirestoreCollectionData(studentsRef.where("org", "==", orgRef), { idField: "id" });

    // Collapse into dict
    const studentsByTeam = {};
    for (const student of students) {
        const key = student.team?.id ?? null;
        if (!studentsByTeam.hasOwnProperty(key)) studentsByTeam[key] = [];
        studentsByTeam[key].push(student);
    }

    // Dialog
    const [openDialog] = useDialog();

    const handleAddTeam = async ({ name }) => {
        await eventOrgRef.set({}, { merge: true });
        await teamsRef.add({ name: name, org: orgRef });
    };

    const handleUpdateTeam = async (id, update) => {
        await teamsRef.doc(id).update(update);
    };

    const handleAddStudent = async values => {
        const { data } = await createStudentAccount(values);
        const { existed, uid, fname, lname, email } = data;

        const studentRef = studentsRef.doc(uid);
        const snap = await studentRef.get();
        if (snap.exists) throw new Error("This student is already associated with an organization.");

        await studentRef.set({
            fname,
            lname,
            email,
            user: firestore.collection("users").doc(uid),
            org: orgRef,
        });

        if (!existed) {
            openDialog({
                type: "alert",
                title: "Student Invited",
                description:
                    "Created a new student account. An email has been sent to the student containing login details.",
            });
        }
    };

    const handleDragEnd = ({ active, over }) => {
        if (!over) return;
        if (
            over.id !== "unassigned" &&
            event.studentsPerTeam &&
            (studentsByTeam[over.id]?.length ?? 0) + 1 > event.studentsPerTeam
        ) {
            return;
        }
        studentsRef.doc(active.id).update({
            team: over.id === "unassigned" ? null : teamsRef.doc(over.id),
        });
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <Stack spacing={6} flex={1}>
                <HStack alignItems="flex-end" spacing={6}>
                    <Heading size="2xl">{event.name}</Heading>
                    <Heading size="lg">{org.name}</Heading>
                </HStack>
                <Divider />
                <Teams
                    title="Teams"
                    event={event}
                    teams={teams}
                    maxTeams={event.maxTeams}
                    studentsByTeam={studentsByTeam}
                    onAddTeam={handleAddTeam}
                    onUpdateTeam={handleUpdateTeam}
                />
                <Divider />
                <Students students={studentsByTeam[null] ?? []} onAddStudent={handleAddStudent} />
            </Stack>
        </DndContext>
    );
};

const TeamsPage = () => (
    <OrgProvider>
        <EventProvider>
            <TeamsContent />
        </EventProvider>
    </OrgProvider>
);

export default TeamsPage;
