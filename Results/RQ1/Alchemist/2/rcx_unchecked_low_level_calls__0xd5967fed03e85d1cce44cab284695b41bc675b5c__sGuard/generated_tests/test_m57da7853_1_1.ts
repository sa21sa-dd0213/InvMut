import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m57da7853 test", function () {
  it("should revert when _tos array is empty in original but pass in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const v = ethers.parseEther("1");

    // The mutant removes require(_tos.length > 0), so calling with empty array will not revert
    // On original contract this would revert; we expect no revert on mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, v)
    ).to.not.be.reverted;
  });
});