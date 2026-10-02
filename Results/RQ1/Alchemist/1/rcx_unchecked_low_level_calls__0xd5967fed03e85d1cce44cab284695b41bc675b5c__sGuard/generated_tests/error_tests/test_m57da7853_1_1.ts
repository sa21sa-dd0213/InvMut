import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test - m57da7853", function () {
  it("should revert when _tos array is empty (original require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const v = ethers.parseEther("1");

    // On the original contract, this call would revert because require(_tos.length > 0) fails.
    // On the mutant (missing require), it will succeed without reverting.
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, v)
    ).to.be.reverted;
  });
});