import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m0cb245d3 test", function () {
  it("should revert when Put is called with msg.value = 0 by a holder with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, have addr1 deposit some ETH to get a positive balance
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Now try to call Put with msg.value = 0 (should revert on mutant)
    await expect(
      instance.connect(addr1).Put(0, { value: 0 })
    ).to.be.reverted;
  });
});