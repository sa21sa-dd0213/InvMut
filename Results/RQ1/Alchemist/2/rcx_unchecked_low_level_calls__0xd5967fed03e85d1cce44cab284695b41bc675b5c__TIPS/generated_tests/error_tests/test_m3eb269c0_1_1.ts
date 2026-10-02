import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with empty _tos array (mutant removal of require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare an empty array of addresses
    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // Call transfer with empty _tos - original would revert due to require(_tos.length > 0)
    // The mutant without this check would proceed and potentially revert differently or succeed
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});