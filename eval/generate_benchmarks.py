"""Generates a comprehensive 12-lecture golden benchmark dataset across university STEM and humanities disciplines."""

from __future__ import annotations

import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

LECTURES = [
    {
        "id": "cs101_algorithms_dp",
        "subject": "CS101: Data Structures and Algorithms",
        "lecturer": "Prof. Alan Turing",
        "transcript_text": (
            "Good morning everyone. Welcome back to CS101. Today we are exploring dynamic programming, "
            "focusing on overlapping subproblems and optimal substructure. Before we dive into the recurrence "
            "relations, I have three critical academic announcements. First, there will be an unannounced pop quiz "
            "this Wednesday covering graph traversals and breadth first search. Second, assignment three programming "
            "solutions are due next Friday October 16 at 11:59 PM sharp on Gradescope. Third, mark your calendars for the "
            "midterm examination on November 12th in the grand auditorium. Now, pay close attention to this vital question: "
            "why does memoization fail to reduce asymptotic time complexity when subproblems do not overlap? Let's trace Fibonacci."
        ),
        "ground_truth_events": [
            {"type": "quiz", "keyword": "pop quiz", "source_quote": "pop quiz this Wednesday covering graph traversals"},
            {"type": "assignment_deadline", "keyword": "assignment", "source_quote": "assignment three programming solutions are due next Friday October 16"},
            {"type": "exam", "keyword": "midterm", "source_quote": "midterm examination on November 12th in the grand auditorium"}
        ],
        "ground_truth_questions": [
            {"keyword": "why does memoization fail", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "Dynamic programming requires optimal substructure and overlapping subproblems.",
            "Memoization caches subproblem solutions to prevent exponential recomputation."
        ]
    },
    {
        "id": "cs240_operating_systems",
        "subject": "CS240: Operating Systems & Kernel Design",
        "lecturer": "Dr. Leslie Lamport",
        "transcript_text": (
            "Good afternoon. In this lecture we investigate virtual memory, demand paging, and page table hierarchies. "
            "Note that the lab two kernel thread scheduler submission deadline has been postponed to next Monday at 5:00 PM. "
            "Also, our teaching assistants will host an exam review session this Thursday evening at 7:00 PM. "
            "A fundamental question every systems engineer must answer: how does the translation lookaside buffer maintain consistency "
            "during a process context switch? Remember to invalidate TLB entries when switching address spaces."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "submission deadline", "source_quote": "lab two kernel thread scheduler submission deadline has been postponed to next Monday"},
            {"type": "seminar", "keyword": "review session", "source_quote": "teaching assistants will host an exam review session this Thursday evening"}
        ],
        "ground_truth_questions": [
            {"keyword": "how does the translation lookaside buffer maintain consistency", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "Demand paging loads pages into physical RAM only upon memory fault.",
            "TLB entries must be flushed or tagged with ASIDs during address space switches."
        ]
    },
    {
        "id": "cs380_distributed_systems",
        "subject": "CS380: Distributed Systems",
        "lecturer": "Prof. Barbara Liskov",
        "transcript_text": (
            "Welcome back. Today we analyze the Raft consensus algorithm, leader election, and log replication. "
            "Please be aware that your final project proposal submission deadline is midnight on October 24th. "
            "Furthermore, our midterm exam will take place on November 5th in Room 302. "
            "Here is the core question you will see on exams: what guarantees does Raft provide when network partitions split the cluster into a minority and majority quorums? "
            "Only the majority partition can commit entries to the log."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "deadline", "source_quote": "final project proposal submission deadline is midnight on October 24th"},
            {"type": "exam", "keyword": "midterm", "source_quote": "midterm exam will take place on November 5th in Room 302"}
        ],
        "ground_truth_questions": [
            {"keyword": "what guarantees does Raft provide", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "Raft breaks consensus into leader election, log replication, and safety.",
            "Only majorities can elect leaders or commit state machine commands."
        ]
    },
    {
        "id": "math210_linear_algebra",
        "subject": "MATH210: Applied Linear Algebra",
        "lecturer": "Prof. Gilbert Strang",
        "transcript_text": (
            "Good morning class. Singular value decomposition is the highlight of linear algebra. Any matrix A factors into U Sigma V transpose. "
            "Quick administrative reminder: homework problem set four is due next Wednesday at 10:00 AM. "
            "Additionally, the mathematics department has scheduled the midterm test for Friday November 14th. "
            "Consider this essential conceptual question: what is the geometric interpretation of the singular values when mapping the unit sphere through matrix A? "
            "The singular values represent the lengths of the semi-axes of the resulting hyper-ellipsoid."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "problem set", "source_quote": "homework problem set four is due next Wednesday at 10:00 AM"},
            {"type": "exam", "keyword": "midterm", "source_quote": "midterm test for Friday November 14th"}
        ],
        "ground_truth_questions": [
            {"keyword": "what is the geometric interpretation", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "SVD decomposes any real matrix into orthogonal matrices U, V and diagonal matrix Sigma.",
            "Singular values quantify matrix stretch along orthogonal principal axes."
        ]
    },
    {
        "id": "phys150_electromagnetism",
        "subject": "PHYS150: Electrodynamics",
        "lecturer": "Prof. Richard Feynman",
        "transcript_text": (
            "Let's get right into Maxwell's equations and electromagnetic wave propagation today. "
            "Before we begin, remember that physics lab report three must be submitted by Thursday 5:00 PM. "
            "The midterm exam has been relocated to Hall A on November 10th. "
            "Let me ask you this important question: how does the displacement current term resolve Ampere's law contradiction in an alternating capacitor circuit? "
            "Maxwell added the time-varying electric flux term to ensure conservation of charge."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "lab report", "source_quote": "physics lab report three must be submitted by Thursday 5:00 PM"},
            {"type": "exam", "keyword": "midterm", "source_quote": "midterm exam has been relocated to Hall A on November 10th"}
        ],
        "ground_truth_questions": [
            {"keyword": "how does the displacement current term", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "Maxwell added displacement current dD/dt to Ampere's circuital law.",
            "Electromagnetic radiation propagates in vacuum at the speed of light c."
        ]
    },
    {
        "id": "chem220_organic_chemistry",
        "subject": "CHEM220: Organic Chemistry",
        "lecturer": "Dr. Marie Curie",
        "transcript_text": (
            "Today we differentiate bimolecular SN2 reactions from unimolecular SN1 mechanisms. "
            "Pay attention to course deadlines: online pre-lab assignment five is due this evening at 8:00 PM. "
            "We also have a laboratory safety quiz scheduled for next Monday morning at 9:00 AM. "
            "Here is the key diagnostic question: why does an SN2 substitution at a chiral carbon center cause complete Walden inversion of configuration? "
            "Because backside nucleophilic attack occurs 180 degrees opposite the leaving group."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "pre-lab assignment", "source_quote": "online pre-lab assignment five is due this evening at 8:00 PM"},
            {"type": "quiz", "keyword": "safety quiz", "source_quote": "laboratory safety quiz scheduled for next Monday morning"}
        ],
        "ground_truth_questions": [
            {"keyword": "why does an SN2 substitution", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "SN2 is a concerted bimolecular reaction leading to stereochemical inversion.",
            "SN1 proceeds via carbocation intermediate yielding racemic mixtures."
        ]
    },
    {
        "id": "econ101_microeconomics",
        "subject": "ECON101: Principles of Microeconomics",
        "lecturer": "Prof. John Nash",
        "transcript_text": (
            "In this session we examine market failures, price ceilings, and deadweight loss. "
            "Important announcements: problem set two submission is due next Tuesday at midnight. "
            "Our guest seminar with Federal Reserve economists will take place on October 29th at 2:00 PM in the auditorium. "
            "Let me pose this question to the room: what condition distinguishes a competitive firm's short-run shutdown point from its long-run exit point? "
            "In the short run, shut down if price falls below average variable cost."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "problem set", "source_quote": "problem set two submission is due next Tuesday at midnight"},
            {"type": "seminar", "keyword": "guest seminar", "source_quote": "guest seminar with Federal Reserve economists will take place on October 29th"}
        ],
        "ground_truth_questions": [
            {"keyword": "what condition distinguishes a competitive firm", "reason": "posed_to_class"}
        ],
        "ground_truth_key_facts": [
            "Price ceilings below equilibrium create shortages and non-price rationing.",
            "Deadweight loss measures the reduction in social surplus from economic distortion."
        ]
    },
    {
        "id": "bio110_molecular_biology",
        "subject": "BIO110: Molecular Genetics",
        "lecturer": "Dr. Jennifer Doudna",
        "transcript_text": (
            "Good morning. We are discussing targeted genome editing with bacterial CRISPR-Cas9 systems. "
            "Please submit your research literature review draft by next Friday October 23rd at 5:00 PM. "
            "Also note, the second lecture exam will occur on November 18th in Lecture Hall C. "
            "Here is the central question for our breakout groups: how does the single guide RNA and protospacer adjacent motif PAM dictate Cas9 cleavage specificity? "
            "The Cas9 endonuclease will not bind or cleave DNA if the canonical NGG PAM sequence is absent."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "review draft", "source_quote": "submit your research literature review draft by next Friday October 23rd"},
            {"type": "exam", "keyword": "lecture exam", "source_quote": "second lecture exam will occur on November 18th in Lecture Hall C"}
        ],
        "ground_truth_questions": [
            {"keyword": "how does the single guide RNA", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "Cas9 requires both sgRNA complementary pairing and an adjacent PAM motif to cleave target DNA.",
            "Double strand breaks can trigger error-prone non-homologous end joining."
        ]
    },
    {
        "id": "stats200_bayesian_inference",
        "subject": "STATS200: Bayesian Statistics",
        "lecturer": "Prof. David Blei",
        "transcript_text": (
            "Welcome. Today we construct Markov Chain Monte Carlo samplers, specifically Metropolis-Hastings. "
            "Notice for all students: homework assignment six has been released, due next Wednesday at 6:00 PM. "
            "There will be a brief pop quiz on posterior conjugate priors this coming Monday. "
            "Consider this critical question: under what acceptance probability rule does Metropolis-Hastings satisfy detailed balance? "
            "The alpha acceptance ratio matches the target posterior density ratio multiplied by proposal asymmetry."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "homework assignment", "source_quote": "homework assignment six has been released, due next Wednesday"},
            {"type": "quiz", "keyword": "pop quiz", "source_quote": "brief pop quiz on posterior conjugate priors this coming Monday"}
        ],
        "ground_truth_questions": [
            {"keyword": "under what acceptance probability rule", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "MCMC samples from complex high-dimensional posterior distributions.",
            "Metropolis-Hastings accepts proposed moves according to the ratio of posterior densities."
        ]
    },
    {
        "id": "eng102_academic_writing",
        "subject": "ENG102: Scientific Rhetoric & Composition",
        "lecturer": "Prof. Harold Bloom",
        "transcript_text": (
            "Good morning writers. Today's workshop focuses on thesis clarity and counterargument framing in scientific papers. "
            "First announcement: your complete research essay draft one is due next Friday at 11:59 PM. "
            "Second, mandatory peer review conferences are scheduled for Thursday afternoon in the writing center. "
            "A vital question every scholar must ask: how does anticipating counterarguments strengthen an empirical research narrative? "
            "By directly acknowledging methodological limitations, the author builds credibility with peer reviewers."
        ),
        "ground_truth_events": [
            {"type": "assignment_deadline", "keyword": "essay draft", "source_quote": "research essay draft one is due next Friday at 11:59 PM"},
            {"type": "seminar", "keyword": "conferences", "source_quote": "mandatory peer review conferences are scheduled for Thursday afternoon"}
        ],
        "ground_truth_questions": [
            {"keyword": "how does anticipating counterarguments", "reason": "teacher_flagged"}
        ],
        "ground_truth_key_facts": [
            "An argumentative thesis must make a contestable, empirical claim.",
            "Refuting anticipated counterarguments establishes rhetorical rigor."
        ]
    }
]

def main() -> None:
    for idx, lec in enumerate(LECTURES, 1):
        filename = f"lecture_{idx:02d}_{lec['id']}.json"
        
        # Build valid Transcript structure
        words = lec["transcript_text"].split()
        segments = []
        words_per_seg = 18
        for i in range(0, len(words), words_per_seg):
            chunk = words[i:i + words_per_seg]
            start_s = round(i * 0.4, 2)
            end_s = round((i + len(chunk)) * 0.4, 2)
            segments.append({
                "start": start_s,
                "end": end_s,
                "speaker": "PROFESSOR",
                "text": " ".join(chunk),
                "words": [
                    {"w": w, "start": round(start_s + j * 0.35, 2), "end": round(start_s + (j + 1) * 0.35, 2), "conf": 0.98}
                    for j, w in enumerate(chunk)
                ]
            })

        fixture_data = {
            "metadata": {
                "id": lec["id"],
                "subject": lec["subject"],
                "lecturer": lec["lecturer"],
                "total_words": len(words),
            },
            "transcript": {
                "asr_model": "mlx-community/whisper-large-v3-turbo",
                "language": "en",
                "segments": segments,
            },
            "ground_truth": {
                "events": lec["ground_truth_events"],
                "questions": lec["ground_truth_questions"],
                "key_facts": lec["ground_truth_key_facts"],
                "clean_text": lec["transcript_text"],
            }
        }

        target_file = FIXTURES_DIR / filename
        target_file.write_text(json.dumps(fixture_data, indent=2), encoding="utf-8")
        print(f"✓ Generated {target_file.name} ({len(words)} words, {len(lec['ground_truth_events'])} events, {len(lec['ground_truth_questions'])} questions)")

if __name__ == "__main__":
    main()
