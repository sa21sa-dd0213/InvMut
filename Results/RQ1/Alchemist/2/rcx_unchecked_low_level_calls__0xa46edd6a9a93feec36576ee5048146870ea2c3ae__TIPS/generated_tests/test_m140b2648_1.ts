import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant m140b2648)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare empty arrays for the test
    const emptyTos: string[] = [];
    const emptyV: bigint[] = [];

    // Call transfer with empty arrays - original reverts, mutant does not
    await expect(
      instance.transfer(owner.address, addr1.address, emptyTos, emptyV)
    ).to.be.reverted;
  });
});