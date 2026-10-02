import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - m9a0e2e0a", function () {
  it("should kill the mutant by exploiting removed require statement via reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Bank contract
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Deploy malicious reentrancy contract
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(
      await modifierEntrancy.getAddress()
    );
    await malicious.waitForDeployment();

    // Attacker calls airDrop through malicious contract which reenters
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted;

    // Verify the attacker's balance was not incremented multiple times
    const attackerBalance = await modifierEntrancy.tokenBalance(
      await malicious.getAddress()
    );
    // If mutant is killed, balance should be 20 (only one successful call)
    // If mutant survives, balance would be 40 or more due to reentrancy
    expect(attackerBalance).to.equal(20);
  });
});

// Helper contract to perform reentrancy attack
contract MaliciousReentrancy {
  ModifierEntrancy public target;
  bool public attackInProgress;

  constructor(address _target) {
    target = ModifierEntrancy(_target);
  }

  function attack() external {
    attackInProgress = true;
    target.airDrop();
  }

  function supportsToken() external pure returns (bytes32) {
    return keccak256(abi.encodePacked("Nu Token"));
  }

  receive() external payable {
    if (attackInProgress) {
      attackInProgress = false;
      // Reenter the airDrop function
      target.airDrop();
    }
  }
}