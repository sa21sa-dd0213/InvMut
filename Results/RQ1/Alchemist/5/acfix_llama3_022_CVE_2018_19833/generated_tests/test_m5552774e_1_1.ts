import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test for onlyOwner modifier", function () {
  it("should revert when owner calls onlyOwner function if modifier uses != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // Therefore, when the owner calls an onlyOwner function, it should revert
    // The original contract would succeed, the mutant will fail (revert)
    await expect(
      instance.connect(owner).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});