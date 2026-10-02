import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mae4a5384 test", function () {
  it("should revert when non-owner tries to withdraw", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for MultiplicatorX3)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Fund the contract with some ETH so there's something to withdraw
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: contractAddress,
      value: fundAmount
    });
    
    // Verify contract has balance
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    expect(balanceBefore).to.equal(fundAmount);
    
    // Attacker tries to withdraw - should revert in original, pass in mutant
    await expect(
      instance.connect(attacker).withdraw()
    ).to.be.reverted;
    
    // Verify contract balance unchanged (only if revert occurred)
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(fundAmount);
  });
});