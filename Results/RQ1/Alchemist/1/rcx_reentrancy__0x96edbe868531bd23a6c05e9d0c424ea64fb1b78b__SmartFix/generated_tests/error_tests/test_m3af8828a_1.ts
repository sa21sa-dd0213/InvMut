import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m3af8828a detection", function () {
  it("should kill mutant by sending positive ether to Put and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei to Put function - should succeed in original but revert in mutant
    const tx = await instance.Put(0, { value: ethers.parseEther("1") });
    await expect(tx).to.not.be.reverted;
  });
});