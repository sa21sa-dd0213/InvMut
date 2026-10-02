import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6c2fe6b test", function () {
  it("should revert on successful withdrawal due to mutant condition change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Add balance to addr1
    await instance.connect(addr1).addToBalance({ value: depositAmount });
    
    // Verify balance
    expect(await instance.getBalance(addr1.address)).to.equal(depositAmount);
    
    // Attempt withdrawal - should revert because mutant always reverts
    await expect(
      instance.connect(addr1).withdrawBalance()
    ).to.be.reverted;
  });
});