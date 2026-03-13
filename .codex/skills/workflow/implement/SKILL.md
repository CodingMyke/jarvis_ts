---
name: implement
description: Workflow to follow to write/modify code in order to implement project changes (implement feature, resolve bug ecc..)
---

# Implement Workflow 

## Steps to implement
1. Analyze the plan
2. Start implementing the tasks in order and following all the steps for single task specified below 
3. After implement all tasks run all project tests
4. If some test fails, fix it
5. If all the tests pass, perform a code review and check potential code problems in parallel using sub-agent
6. If some problems are founded, fix those who are simple and/or critical, and then run all tests again that should pass
7. At the end give a coincise and comprehensive summary of what you have done, all the problems founded, resolved, still present

## Steps to implement single task
1. When possible, write one or more tests to verify the expected output of task implementation and it/them should fail
2. Implement the task
3. Check for errors or linting problems and fix them
4. Run the tests previously created and should pass
5. If some test fails, fix the problems

## Rules
- always use "testing" skill to write a test
- always use "code-style" skill to implement code
- always spawn a "verifier" agent to check for potential problems
- always spawn a "code-reviewer" agent to perform a code review

## NB
Always tell the user that you are going to follow this workflow
