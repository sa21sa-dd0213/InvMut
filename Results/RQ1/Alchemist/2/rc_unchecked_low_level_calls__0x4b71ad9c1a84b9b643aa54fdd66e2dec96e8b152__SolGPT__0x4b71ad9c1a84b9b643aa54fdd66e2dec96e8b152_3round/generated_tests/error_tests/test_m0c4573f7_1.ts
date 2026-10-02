import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection test", function () {
  it("should revert when _tos array is empty (original behavior), mutant will not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has no constructor arguments based on the provided code
    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // Expect revert when calling transfer with empty _tos array
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});