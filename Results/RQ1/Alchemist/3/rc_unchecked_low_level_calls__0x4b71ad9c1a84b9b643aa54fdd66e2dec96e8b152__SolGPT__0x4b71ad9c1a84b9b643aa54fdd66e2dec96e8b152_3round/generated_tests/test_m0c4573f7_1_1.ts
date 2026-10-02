import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with empty _tos array (kill mutant m0c4573f7)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty array of addresses
    const emptyAddresses: string[] = [];

    // This call should revert in the original contract due to require(_tos.length > 0)
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});