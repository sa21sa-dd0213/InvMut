import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - mbe979835", function () {
  it("should detect removal of hasNoBalance modifier by calling airDrop twice from same address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to airDrop should succeed (balance is 0)
    const tx1 = await instance.connect(addr1).airDrop();
    await tx1.wait();
    const balanceAfterFirst = await instance.tokenBalance(addr1.address);
    expect(balanceAfterFirst).to.equal(20);

    // Second call: original contract would revert due to hasNoBalance modifier
    // Mutant will allow the call (removed modifier)
    // Test expects revert - will pass on original, fail (kill) on mutant
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});