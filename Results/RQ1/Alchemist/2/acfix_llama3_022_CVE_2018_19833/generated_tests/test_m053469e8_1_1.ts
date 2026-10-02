import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m053469e8 by reverting on a normal transfer that increases recipient balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so they have a non-zero balance
    await instance.transfer(addr1.address, 100);

    // Now perform a transfer from owner to addr1 (who already has 100 tokens)
    // This should succeed on original but revert on mutant due to <= check
    await expect(
      instance.transfer(addr1.address, 50)
    ).to.be.reverted;
  });
});