import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - mutant m8c67aec1 (authorizeUpgrade onlyOwner modifier removed)", function () {
  it("should revert when non-owner tries to upgrade contract via upgradeToAndCall", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor takes no arguments as it's upgradeable)
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155Factory.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Deploy a new implementation contract for upgrade testing
    const NewImplementationFactory = await ethers.getContractFactory("PhiNFT1155");
    const newImplementation = await NewImplementationFactory.deploy();
    await newImplementation.waitForDeployment();
    
    // Attempt to upgrade from a non-owner account
    // The original contract would revert because of onlyOwner modifier
    // The mutant would allow this to succeed, so we expect a revert to detect the mutant
    await expect(
      phiNFT1155.connect(addr1).upgradeToAndCall(
        await newImplementation.getAddress(),
        "0x"
      )
    ).to.be.reverted;
  });
});