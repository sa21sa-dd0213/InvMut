import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mca082f80 - router address zero", function () {
  it("should revert on deployment because router is address(0) and cannot create pair", async function () {
    const [owner] = await ethers.getSigners();
    const liquidityReceiveAddress = owner.address;
    const Factory = await ethers.getContractFactory("DCF");
    
    await expect(
      Factory.deploy(liquidityReceiveAddress)
    ).to.be.reverted;
  });
});