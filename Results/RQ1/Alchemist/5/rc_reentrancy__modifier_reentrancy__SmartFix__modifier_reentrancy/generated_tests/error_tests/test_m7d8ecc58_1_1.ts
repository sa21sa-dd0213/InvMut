import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - reentrancy guard removal", function () {
  it("should detect removal of _nonReentrant modifier by allowing reentrant call", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Bank first (needed by supportsToken modifier)
    const Bank = await ethers.getContractFactory("Bank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancy.deploy();
    await modEntrancy.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousContract = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousContract.deploy(await modEntrancy.getAddress());
    await malicious.waitForDeployment();

    // Execute the attack
    await malicious.connect(attacker).attack();

    // Check that the attacker's token balance was increased multiple times
    const attackerBalance = await modEntrancy.tokenBalance(await malicious.getAddress());
    expect(attackerBalance).to.equal(40); // Should be 40 if reentrant call succeeded
  });
});

// Helper contract for reentrancy attack - deployed as a separate contract
contract MaliciousReentrancy {
    ModifierEntrancy public target;
    
    constructor(address _target) {
        target = ModifierEntrancy(_target);
    }
    
    function attack() external {
        // First call to airDrop will succeed, then reenter
        target.airDrop();
    }
    
    // This function is called by the supportsToken modifier to verify the token name
    function supportsToken() external pure returns (bytes32) {
        return keccak256(abi.encodePacked("Nu Token"));
    }
}