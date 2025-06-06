
include "poseidon.circom";

template Ownership() {
    signal input paperId;
    signal input secret;
    signal output hash;

    signal inputArr[2];
    inputArr[0] <== paperId;
    inputArr[1] <== secret;

    component hasher = Poseidon(2);
    for (var i = 0; i < 2; i++) {
        hasher.inputs[i] <== inputArr[i];
    }

    hash <== hasher.out;
}

component main = Ownership();