import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should kill mutant m1534d83e by calling transfer with non-empty array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: non-empty arrays
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];

    // The original contract should succeed, mutant should revert (require(_tos.length < 0) always false)
    const tx = instance.transfer(owner.address, addr2.address, tos, values);
    await expect(tx).to.not.be.reverted;
  });
});