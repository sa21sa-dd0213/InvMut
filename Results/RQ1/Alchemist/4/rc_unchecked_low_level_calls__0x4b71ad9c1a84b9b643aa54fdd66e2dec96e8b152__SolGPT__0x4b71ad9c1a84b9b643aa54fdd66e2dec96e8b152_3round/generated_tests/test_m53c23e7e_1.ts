import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant that changes > to >=", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty array of addresses
    const emptyAddresses: string[] = [];

    // Call transfer with empty _tos array - should revert in original
    // Mutant would not revert because _tos.length >= 0 is always true
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});