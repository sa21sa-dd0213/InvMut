import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant kill test", function () {
  it("should revert when _tos array is empty in original contract but pass in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const amount = ethers.parseEther("1");

    // This should revert in original contract (require _tos.length > 0)
    // In the mutant (require _tos.length >= 0), it will NOT revert
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, amount)
    ).to.be.reverted;
  });
});