pragma circom 2.0.0;

template OwnershipProof() {
    signal input paperHash;        // private
    signal input userSecret;       // private
    signal input hashCommitment;   // public

    signal output out;

    out <== paperHash + userSecret;
    out === hashCommitment;
}

component main = OwnershipProof();