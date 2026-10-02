import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - missing require(callResult)", function () {
  it("should revert when external call fails and credit should remain unchanged", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious receiver contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Attacker deposits funds
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(attacker).deposit({ value: depositAmount });
    
    // Verify initial state
    expect(await instance.credit(attacker.address)).to.equal(depositAmount);
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Attacker calls withdrawAll through malicious contract that reverts
    await expect(
      malicious.connect(attacker).attack(instance.target)
    ).to.be.reverted;
    
    // Verify credit was NOT set to zero (mutant would set it to zero incorrectly)
    expect(await instance.credit(attacker.address)).to.equal(depositAmount);
    
    // Verify balance remained unchanged
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
    function attack(address daoAddress) external {
        (bool success, ) = daoAddress.call(abi.encodeWithSignature("withdrawAll()"));
        require(success, "Attack failed");
    }
    
    receive() external payable {
        revert("I refuse to accept ETH");
    }
}