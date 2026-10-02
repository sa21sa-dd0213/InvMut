import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant md47f1219 test", function () {
  it("should revert when user with non-zero balance calls addToBalance with zero value (mutant changes + to *)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for Reentrance)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give addr1 a non-zero balance by sending ETH via addToBalance
    const fundAmount = ethers.parseEther("1.0");
    const tx1 = await instance.connect(addr1).addToBalance({ value: fundAmount });
    await tx1.wait();

    // Verify addr1 has balance
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(fundAmount);

    // Now call addToBalance with zero value - should succeed on original but revert on mutant
    const zeroValue = ethers.parseEther("0.0");
    await expect(
      instance.connect(addr1).addToBalance({ value: zeroValue })
    ).to.be.reverted;
  });
});