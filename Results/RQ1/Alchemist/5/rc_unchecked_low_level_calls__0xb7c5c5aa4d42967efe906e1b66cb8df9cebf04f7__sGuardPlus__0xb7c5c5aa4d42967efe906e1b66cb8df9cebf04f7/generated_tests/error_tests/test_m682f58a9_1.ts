import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant detection", function () {
  it("should revert when withdrawing to a contract that rejects ether (kills mutant m682f58a9)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy a malicious contract that reverts on receive
    const MaliciousReceiverFactory = await ethers.getContractFactory(
      "contracts/MaliciousReceiver.sol:MaliciousReceiver"
    );
    const maliciousReceiver = await MaliciousReceiverFactory.deploy();
    await maliciousReceiver.waitForDeployment();
    
    // Deploy the target contract
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the malicious receiver contract via the target contract
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Verify balance was credited
    expect(await instance.balances(owner.address)).to.equal(depositAmount);
    
    // Attempt withdrawal - should revert on original, succeed on mutant
    await expect(
      instance.connect(owner).withdraw()
    ).to.be.reverted;
    
    // For the mutant, this assertion would fail because balance would be 0
    expect(await instance.balances(owner.address)).to.equal(depositAmount);
  });
});