import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setCaller without onlyOwner modifier", function () {
  it("should revert when non-owner tries to call setCaller on original contract but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const liquidityReceiveAddress = addr1.address; // Use a valid address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Attempt to call setCaller from a non-owner address (addr1)
    // The original contract has onlyOwner modifier, so it should revert
    // The mutant removes the modifier, so it would succeed (which is the vulnerability)
    await expect(
      instance.connect(addr1).setCaller(addr1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});