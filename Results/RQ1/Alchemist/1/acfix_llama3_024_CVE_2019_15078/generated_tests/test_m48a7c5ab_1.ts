import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - burn function", function () {
  it("should detect mutant m48a7c5ab: burn decreases totalDistributed (not increases)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state after deployment
    const initialTotalDistributed = await instance.totalDistributed();
    const burnAmount = ethers.parseEther("1000"); // 1000 tokens

    // Record balance of owner before burn
    const ownerBalanceBefore = await instance.balanceOf(owner.address);

    // Call burn function (onlyOwner)
    const tx = await instance.connect(owner).burn(burnAmount);
    await tx.wait();

    // Check totalDistributed decreased by burnAmount
    const expectedTotalDistributed = initialTotalDistributed - burnAmount;
    const actualTotalDistributed = await instance.totalDistributed();
    expect(actualTotalDistributed).to.equal(expectedTotalDistributed);

    // Verify owner balance also decreased
    const ownerBalanceAfter = await instance.balanceOf(owner.address);
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - burnAmount);
  });
});