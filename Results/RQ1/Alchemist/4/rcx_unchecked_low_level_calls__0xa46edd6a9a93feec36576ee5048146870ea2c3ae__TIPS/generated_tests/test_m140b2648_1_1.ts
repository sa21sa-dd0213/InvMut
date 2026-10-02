import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m140b2648", function () {
  it("should revert when _tos array is empty (kills mutant that removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // This should revert on the original contract due to require(_tos.length > 0)
    // The mutant removed this check, so the call would not revert - thus killing the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});