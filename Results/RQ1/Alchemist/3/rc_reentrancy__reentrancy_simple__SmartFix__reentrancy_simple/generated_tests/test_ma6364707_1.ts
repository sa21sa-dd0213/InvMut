import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Reentrance mutant ma6364707 test", function () {
  it("should revert when withdrawBalance fails due to recipient contract reverting", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();
    
    // Deploy a malicious contract that always reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousRejecter");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Fund the malicious contract with some ETH via the Reentrance contract
    const depositAmount = ethers.parseEther("1.0");
    await reentrance.connect(attacker).addToBalance({ value: depositAmount });
    
    // Now the malicious contract has a balance in Reentrance
    // Have the malicious contract call withdrawBalance
    // The malicious contract's fallback will revert, causing the call to fail
    await expect(
      malicious.connect(attacker).attack(await reentrance.getAddress())
    ).to.be.reverted;
    
    // Verify that the balance was NOT zeroed out (original behavior reverts everything)
    const balanceAfter = await reentrance.getBalance(await malicious.getAddress());
    expect(balanceAfter).to.equal(depositAmount);
  });
});

// Helper contract that reverts on receive to simulate a failed call
contract MaliciousRejecter {
  function attack(address reentranceAddr) external {
    (bool success, ) = reentranceAddr.call(
      abi.encodeWithSignature("withdrawBalance()")
    );
    require(success, "withdraw failed");
  }
  
  receive() external payable {
    revert("rejecting payment");
  }
}