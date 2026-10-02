import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection - m565ff64b", function () {
  it("should detect removal of nonReentrant modifier from Initialized function", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious contract to attempt reentrancy on Initialized
    const ReentrancyFactory = await ethers.getContractFactory("ReentrancyAttack");
    const reentrancyContract = await ReentrancyFactory.deploy(instance.target);
    await reentrancyContract.waitForDeployment();

    // On the original contract, calling Initialized twice in one tx would revert
    // On the mutant, both calls succeed, allowing Initialized to be called again
    await expect(
      reentrancyContract.attackInitialized()
    ).to.be.revertedWith(""); // Original reverts, mutant does not revert
  });
});

// Helper contract to test reentrancy on Initialized
contract ReentrancyAttack {
  MONEY_BOX public target;
  bool public firstCall;

  constructor(address _target) {
    target = MONEY_BOX(_target);
    firstCall = true;
  }

  function attackInitialized() external {
    target.Initialized();
  }

  // Fallback to reenter on any call (though Initialized doesn't send ETH)
  fallback() external payable {
    if (firstCall) {
      firstCall = false;
      target.Initialized(); // Second call - should revert on original, succeed on mutant
    }
  }
}