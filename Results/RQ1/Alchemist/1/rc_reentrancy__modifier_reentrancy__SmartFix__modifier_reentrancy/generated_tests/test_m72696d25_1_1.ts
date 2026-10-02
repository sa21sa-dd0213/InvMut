import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m72696d25 test", function () {
  it("should revert when calling airDrop twice from the same address due to hasNoBalance modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    await instance.connect(addr1).airDrop();
    const balanceAfterFirst = await instance.tokenBalance(addr1.address);
    expect(balanceAfterFirst).to.equal(20);

    // Second call should revert because hasNoBalance modifier requires balance == 0
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});