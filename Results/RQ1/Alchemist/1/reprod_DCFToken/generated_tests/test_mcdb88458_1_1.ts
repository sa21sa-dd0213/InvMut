import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - setCfg without onlyCaller modifier", function () {
  it("should revert when non-cfo calls setCfg on original, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with required constructor arguments
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address); // _liquidityReceiveAddress
    await instance.waitForDeployment();

    // Set the CFO address (only owner can do this)
    await instance.connect(owner).setCaller(addr1.address);

    // Try to call setCfg from a non-cfo address (addr2)
    // On original contract this should revert due to onlyCaller modifier
    // On mutant (without modifier) this should succeed
    await expect(
      instance.connect(addr2).setCfg(3)
    ).to.be.revertedWith("onlyCaller");
  });
});