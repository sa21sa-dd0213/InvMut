import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection test", function () {
  it("should detect mutant m83fd3300 by calling Put with _lockTime = 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Put with _lockTime = 0 and 1 ether value
    const tx = instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    
    // In original contract this succeeds (block.timestamp + 0 >= block.timestamp is true)
    // In mutant this reverts (block.timestamp * 0 = 0 >= block.timestamp is false)
    await expect(tx).to.not.be.reverted;
  });
});