import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should kill mutant m2802ec0d by calling airDrop with zero balance and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify addr1 has zero balance initially
    const initialBalance = await instance.tokenBalance(addr1.address);
    expect(initialBalance).to.equal(0);

    // Call airDrop from addr1 - should succeed on original, revert on mutant
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;

    // Verify balance increased by 20
    const finalBalance = await instance.tokenBalance(addr1.address);
    expect(finalBalance).to.equal(20);
  });
});