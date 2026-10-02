import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m043c2148 detection", function () {
  it("should detect the mutant by calling deposit with zero balance and verifying revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance initially, calling deposit with any positive amount
    // should succeed on original but fail on mutant due to assertion change
    const depositAmount = ethers.parseEther("1");
    
    // This call should revert on the mutant because 0 * msg.value > 0 is false
    await expect(
      instance.connect(addr1).deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});