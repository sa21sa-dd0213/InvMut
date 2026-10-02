import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test for mea73f135", function () {
  it("should revert when non-owner calls owned() function (detects removal of require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // addr1 is not the owner, calling owned() should revert in original contract
    await expect(
      instance.connect(addr1).owned()
    ).to.be.revertedWith("Only the current owner can change ownership");
  });
});