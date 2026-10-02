import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - m7d8ecc58", function () {
  it("should revert on reentrant call when _nonReentrant modifier is present", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Bank contract (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await modEntrancy.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with ETH to call airDrop
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // The malicious contract calls airDrop, which should revert on reentrant call
    // because the _nonReentrant modifier is missing in the mutant
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted;
  });
});

// Malicious contract to perform reentrancy attack
contract MaliciousReentrancy {
    ModifierEntrancy target;
    bool public attackInitiated;
    
    constructor(address _target) {
        target = ModifierEntrancy(_target);
    }
    
    function attack() external payable {
        attackInitiated = true;
        target.airDrop();
    }
    
    function supportsToken() external view returns (bytes32) {
        if (attackInitiated) {
            // Reenter during the supportsToken check
            target.airDrop();
        }
        return keccak256(abi.encodePacked("Nu Token"));
    }
}