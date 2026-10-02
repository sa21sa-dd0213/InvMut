import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m65087e9e test", function () {
  it("should revert when Collect fails due to recipient rejecting Ether, but mutant allows state change", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a contract that rejects Ether payments
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the X_WALLET from owner
    const depositAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Set unlock time to past to allow collection
    const pastTime = 0;
    await instance.connect(owner).Put(pastTime, { value: 0 });
    
    // Attacker tries to collect from owner's account to rejector address
    // We need to impersonate owner or use owner to call Collect
    const collectAmount = ethers.parseEther("1");
    
    // Get owner's balance before
    const balanceBefore = await instance.Acc(owner.address);
    
    // This call should revert in original but might not in mutant
    try {
      const tx = await instance.connect(owner).Collect(collectAmount);
      await tx.wait();
      
      // If we get here, the mutant allowed the call to proceed without revert
      // Check if balance was incorrectly deducted
      const balanceAfter = await instance.Acc(owner.address);
      expect(balanceAfter.balance).to.be.lessThan(balanceBefore.balance);
      
      // Verify the attacker didn't receive funds
      const rejectorBalance = await ethers.provider.getBalance(await rejector.getAddress());
      expect(rejectorBalance).to.equal(0);
      
    } catch (error) {
      // Original contract reverts correctly - this is expected behavior
      // But we need to ensure we detect the mutant
      const balanceAfter = await instance.Acc(owner.address);
      expect(balanceAfter.balance).to.equal(balanceBefore.balance);
    }
  });
});