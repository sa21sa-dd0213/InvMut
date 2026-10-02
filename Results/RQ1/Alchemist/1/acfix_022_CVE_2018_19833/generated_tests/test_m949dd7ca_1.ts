import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m949dd7ca - freezeAccount without onlyOwner", function () {
  it("should revert when non-owner calls freezeAccount on original contract, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to call freezeAccount from a non-owner address
    // On the original contract with onlyOwner modifier, this should revert.
    // On the mutant without the modifier, it will succeed.
    await expect(
      instance.connect(addr1).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});