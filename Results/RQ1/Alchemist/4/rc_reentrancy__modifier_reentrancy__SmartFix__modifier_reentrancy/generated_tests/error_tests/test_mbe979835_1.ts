import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - mbe979835", function () {
  it("should revert when user with non-zero balance calls airDrop (hasNoBalance modifier missing)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to airDrop - should succeed (balance is 0)
    const tx1 = await instance.connect(addr1).airDrop();
    await tx1.wait();

    // Check balance is now 20
    const balanceAfterFirst = await instance.tokenBalance(addr1.address);
    expect(balanceAfterFirst).to.equal(20);

    // Second call to airDrop - should revert on original due to hasNoBalance modifier
    // On mutant, it will succeed (killing the mutant)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});