import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should revert when calling setL1BlockValues from contract's own address in original, but pass in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // The original contract has DEPOSITOR_ACCOUNT = 0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001
    // The mutant has DEPOSITOR_ACCOUNT = address(this) which equals contractAddress

    // Try to call setL1BlockValues from the contract's own address (simulated via a contract call)
    // We'll create a simple attacker contract to call from the L1Block address
    const AttackerFactory = await ethers.getContractFactory("L1BlockAttacker");
    const attacker = await AttackerFactory.deploy(contractAddress);
    await attacker.waitForDeployment();

    const testNumber = 1;
    const testTimestamp = 1000;
    const testBasefee = ethers.parseEther("1");
    const testHash = ethers.hexlify(ethers.randomBytes(32));
    const testSequenceNumber = 0;
    const testBatcherHash = ethers.hexlify(ethers.randomBytes(32));
    const testL1FeeOverhead = 100;
    const testL1FeeScalar = 200;

    // The attacker contract will call setL1BlockValues from the L1Block contract's own address
    // This should revert in the original (mutant would pass)
    await expect(
      attacker.attack(
        testNumber,
        testTimestamp,
        testBasefee,
        testHash,
        testSequenceNumber,
        testBatcherHash,
        testL1FeeOverhead,
        testL1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});

// Helper contract to call from L1Block's address
contract L1BlockAttacker {
    address public target;

    constructor(address _target) {
        target = _target;
    }

    function attack(
        uint64 _number,
        uint64 _timestamp,
        uint256 _basefee,
        bytes32 _hash,
        uint64 _sequenceNumber,
        bytes32 _batcherHash,
        uint256 _l1FeeOverhead,
        uint256 _l1FeeScalar
    ) external {
        // Use delegatecall to make it appear as if L1Block is calling itself
        (bool success, ) = target.call(
            abi.encodeWithSignature(
                "setL1BlockValues(uint64,uint64,uint256,bytes32,uint64,bytes32,uint256,uint256)",
                _number,
                _timestamp,
                _basefee,
                _hash,
                _sequenceNumber,
                _batcherHash,
                _l1FeeOverhead,
                _l1FeeScalar
            )
        );
        require(success, "call failed");
    }
}