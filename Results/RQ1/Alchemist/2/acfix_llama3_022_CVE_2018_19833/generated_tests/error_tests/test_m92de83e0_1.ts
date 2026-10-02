import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - freezeAccount without onlyOwner", function () {
  it("should revert when non-owner tries to freeze account (kills mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with constructor arguments: initialSupply, name, symbol
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Attempt to call freezeAccount from a non-owner address
    // The original contract reverts due to onlyOwner modifier; mutant allows it
    await expect(
      instance.connect(addr1).freezeAccount(addr2.address, true)
    ).to.be.reverted;
  });
});