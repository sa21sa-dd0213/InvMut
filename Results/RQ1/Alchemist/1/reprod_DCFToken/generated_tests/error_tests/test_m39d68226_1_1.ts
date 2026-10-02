import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m39d68226 - setCaller sets cfo to address(0)", function () {
  it("should kill the mutant by proving setCaller always sets cfo to zero address", async function () {
    const [owner, cfoAddress] = await ethers.getSigners();

    // Deploy DCF with a valid liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(owner.address);
    await instance.waitForDeployment();

    // First, set a valid cfo address using setCaller (onlyOwner function)
    await instance.connect(owner).setCaller(cfoAddress.address);

    // Now try to call distributeToken() which requires onlyCaller modifier
    // The onlyCaller modifier checks: require(_msgSender() == cfo, "onlyCaller")
    // In the mutant, cfo is always set to address(0), so calling from cfoAddress should revert
    await expect(
      instance.connect(cfoAddress).distributeToken()
    ).to.be.revertedWith("onlyCaller");
  });
});