import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - reentrancy guard removal", function () {
  it("should revert on reentrant call when _nonReentrant modifier is present (original), but succeed when removed (mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the target contract (ModifierEntrancy) and the malicious Bank contract
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const target = await ModifierEntrancyFactory.deploy();
    await target.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await target.getAddress());
    await malicious.waitForDeployment();

    // The attacker calls the malicious contract which will attempt reentrancy
    // The original contract with _nonReentrant should revert the second call
    // The mutant without _nonReentrant would allow the second call to succeed

    // First ensure the attacker has no balance (to pass hasNoBalance modifier)
    // The malicious contract will call airDrop, and in supportsToken() callback, 
    // it will attempt to call airDrop again

    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted;
  });
});

// Malicious contract that reenters during supportsToken() callback
contract MaliciousReentrancy {
    ModifierEntrancy public target;
    bool public firstCall = true;

    constructor(address _target) {
        target = ModifierEntrancy(_target);
    }

    function attack() external {
        target.airDrop();
    }

    function supportsToken() external returns (bytes32) {
        if (firstCall) {
            firstCall = false;
            // Reenter the airDrop function
            target.airDrop();
        }
        return keccak256(abi.encodePacked("Nu Token"));
    }
}