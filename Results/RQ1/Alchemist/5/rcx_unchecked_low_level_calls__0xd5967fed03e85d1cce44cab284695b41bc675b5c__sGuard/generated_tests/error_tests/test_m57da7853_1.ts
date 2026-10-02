import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original contract) and should pass without revert on mutant (kills mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array - original contract reverts due to require(_tos.length > 0)
    // Mutant removes the require, so it will not revert (kills mutant)
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});