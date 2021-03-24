import {
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    HStack,
    Stack,
    Text,
    Tooltip,
    useDisclosure,
    Wrap,
    WrapItem,
} from "@chakra-ui/react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useRouter } from "next/router";
import { useState } from "react";
import { useFirestore, useFirestoreCollectionData, useFirestoreDocData, useFunctions } from "reactfire";
import AddStudentModal from "~/components/AddStudentModal";
import AddTeamModal from "~/components/AddTeamModal";
import { useDialog } from "~/contexts/DialogProvider";
import EventProvider, { useEvent } from "~/contexts/EventProvider";
import OrgProvider, { useOrg } from "~/contexts/OrgProvider";
import { delay } from "~/helpers/utils";

const BlankCard = () => {
    return (
        <Flex
            m={2}
            p={4}
            borderWidth={1}
            flex={1}
            justifyContent="center"
            alignItems="center"
            borderStyle="dashed"
            borderRadius="md"
        >
            <Text as="h4" size="md" color="gray.500">
                Drag students here
            </Text>
        </Flex>
    );
};

const StudentCard = ({ id, fname, lname, email }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;

    return (
        <Box
            m={2}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor="white"
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
        >
            <Heading as="h4" size="md">
                {fname} {lname}
            </Heading>
            <Text>{email}</Text>
        </Box>
    );
};

const TeamCard = ({ id, name, students }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    const props = {
        backgroundColor: isOver ? "gray.100" : undefined,
    };
    return (
        <Stack
            maxWidth={600}
            spacing={0}
            flex={1}
            p={2}
            borderWidth={1}
            borderRadius="md"
            minHeight="xs"
            transition="background-color 0.1s"
            {...props}
        >
            <Heading p={2} as="h4" size="md">
                {name}
            </Heading>
            <Flex direction="column" flex={1} ref={setNodeRef}>
                {students.map(x => (
                    <StudentCard key={x.id} {...x} />
                ))}
                {students.length === 0 && <BlankCard />}
            </Flex>
        </Stack>
    );
};

const Teams = ({ title, maxTeams, teams, onAddTeam, studentsByTeam }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [formState, setFormState] = useState({ isLoading: false, error: null });

    const handleAddTeam = async values => {
        setFormState({ isLoading: true, error: null });
        await delay(300);
        try {
            await onAddTeam(values);
            setFormState({ isLoading: false, error: null });
            onClose();
        } catch (err) {
            setFormState({ isLoading: false, error: err });
        }
    };

    return (
        <>
            <Heading size="lg">{title ?? "Teams"}</Heading>
            <p>You may sign up for up to {maxTeams ?? 0} teams.</p>
            {teams.length > 0 && (
                <Stack direction="row" spacing={4}>
                    {teams.map(x => (
                        <TeamCard key={x.id} {...x} students={studentsByTeam[x.id] ?? []} />
                    ))}
                </Stack>
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
        </>
    );
};

const Students = ({ students, onAddStudent }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [formState, setFormState] = useState({ isLoading: false, error: null });

    const handleAddStudent = async values => {
        setFormState({ isLoading: true, error: null });
        await delay(300);
        try {
            await onAddStudent(values);
            setFormState({ isLoading: false, error: null });
            onClose();
        } catch (err) {
            setFormState({ isLoading: false, error: err });
        }
    };

    // Unassigned droppable
    const { isOver, setNodeRef } = useDroppable({ id: "unassigned" });
    const props = {
        backgroundColor: isOver ? "gray.100" : undefined,
    };

    return (
        <>
            <Heading size="lg">Unassigned Students</Heading>
            <p>
                Once you add a student to your team, they will receive an email invitation to create an account on our
                website. Upon creation of their account, students will be prompted to add their parent’s email address.
                Required waivers will be sent directly to parents. Please add students to your teams and have them input
                their parent information by Friday, April 9th. Students will not be permitted to compete if they do not
                have a completed waiver by competition day.
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
                {students.length === 0 && <BlankCard />}
            </Wrap>

            <Button colorScheme="blue" alignSelf="flex-start" onClick={onOpen}>
                Invite Student
            </Button>
            <AddStudentModal isOpen={isOpen} onClose={onClose} onSubmit={handleAddStudent} {...formState} />
        </>
    );
};

const TeamsContent = () => {
    const router = useRouter();

    // Functions
    const firestore = useFirestore();
    const functions = useFunctions();
    const createStudentAccount = functions.httpsCallable("createStudentAccount");

    // Data
    const { ref: orgRef, data: org } = useOrg();
    const { ref: eventRef, data: event } = useEvent();

    // Get students
    const eventOrgRef = eventRef.collection("orgs").doc(orgRef.id);
    const { data: eventOrg } = useFirestoreDocData(eventOrgRef);

    if ((eventOrg.stage ?? event.defaultStage) != "teams") {
        router.replace(`/coach/${orgRef.id}/${eventRef.id}`);
    }

    // Get teams
    const teamsRef = eventRef.collection("teams");
    const { data: teams } = useFirestoreCollectionData(teamsRef.where("org", "==", orgRef), { idField: "id" });

    const treeTeams = teams.filter(x => x.division == 0);
    const saplingTeams = teams.filter(x => x.division == 1);

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

    const handleAddTreeTeam = async ({ name }) => {
        await teamsRef.add({ name: name, org: orgRef, division: 0 });
    };

    const handleAddSaplingTeam = async ({ name }) => {
        await teamsRef.add({ name: name, org: orgRef, division: 1 });
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
            openDialog(
                "Student Invited",
                "Created a new student account. An email has been sent to the student containing login details."
            );
        }
    };

    const handleDragEnd = ({ active, over }) => {
        if (!over) return;
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
                <Stack spacing={4}>
                    <p>
                        Your organization has registered for {eventOrg.maxTeams} teams in the Tree division and{" "}
                        {eventOrg.maxTeamsSapling} teams in the Sapling division. You may now create teams and add
                        students to teams.
                    </p>
                    <p>
                        To confirm your organization’s participation, please register at this EventBrite:
                        <a href="https://tinyurl.com/smt-tickets">https://tinyurl.com/smt-tickets</a>. The cost for
                        participation at SMT is $10 per individual for both divisions. The payment deadline is Friday,
                        April 9th. You have currently paid for 0 individuals. Please allow up to one week for payment to
                        reflect on this dashboard.
                    </p>
                    <p>
                        For more information about SMT 2021, please visit our website:{" "}
                        <a href="http://sumo.stanford.edu/smt/">http://sumo.stanford.edu/smt/</a>. If you have any
                        questions, feel free to email the SMT team at stanford.math.tournament@gmail.com.
                    </p>
                </Stack>
                <Teams
                    title="Tree Division"
                    event={event}
                    teams={treeTeams}
                    maxTeams={eventOrg.maxTeams}
                    studentsByTeam={studentsByTeam}
                    onAddTeam={handleAddTreeTeam}
                />
                <Divider />
                <Teams
                    title="Sapling Division"
                    event={event}
                    teams={saplingTeams}
                    maxTeams={eventOrg.maxTeamsSapling}
                    studentsByTeam={studentsByTeam}
                    onAddTeam={handleAddSaplingTeam}
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
