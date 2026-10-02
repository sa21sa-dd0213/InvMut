import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m8ead4462", function () {
  it("should detect removal of nonReentrant modifier by executing reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy malicious contract for reentrancy attack
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the malicious contract so it can receive rewards
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // First call getFirstWithdrawalBonus to set up reward and trigger withdrawReward
    // The malicious contract's receive function will call back into withdrawReward
    await expect(
      instance.connect(attacker).getFirstWithdrawalBonus(await malicious.getAddress())
    ).to.be.revertedWith("Address: call to non-contract");
  });
});

// Helper contract for reentrancy testing
contract ReentrancyAttacker {
  address public target;
  bool public attackDone;
  
  constructor(address _target) {
    target = _target;
  }
  
  receive() external payable {
    if (!attackDone) {
      attackDone = true;
      // Try to reenter withdrawReward
      (bool success, ) = target.call(
        abi.encodeWithSignature("withdrawReward(address)", address(this))
      );
      require(success);
    }
  }
}